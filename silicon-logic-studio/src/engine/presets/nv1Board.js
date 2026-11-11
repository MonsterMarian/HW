// Diamond Edge 3D 2120 upgraded to 2 MB (NVIDIA NV1 / SGS-Thomson STG2000X, 1995) as a netlist of real parts.
// The 2120 shipped with 1 MB (2 soldered 256Kx16 chips, U19/U20) and 2 empty SOJ sockets (U23/U24).
// Positions are 2D world px at 3.7 px/mm (shared by the PCB view and the 3D board, see boardLayout.js), measured on
// the photo of the card (vgamuseum.info, 588_diamond_edge_3d_2120_top_hq.jpg; +-1.5 mm). The three jacks sit
// 2-3 mm higher than on the card, whose corner under the bracket reaches lower than the model outline.
// sx/sy = position in the schematic view (laid out by signal flow: host -> J1 -> U1 -> memory / video / audio / pad).
// Wiring follows the STG2000 datasheet (Sep 1996): 32-bit MD bus with two interleaved DRAM banks, the second bank
// behind a bus switch (EN64), pixels loaded from both banks straight into the 64-bit port of the Palette-DAC,
// BIOS ROM and DAC registers on the same MD bus, Saturn pads through the game port of the DAC and the nvSGP chip.
// Reference designators without a source (not readable on the photo): U1, U2, U7.

const c = (id, type, label, x, y, extra = {}, [sx, sy] = []) => ({ id, type, label, x, y, sx, sy, inputs: {}, outputs: {}, ...extra });
const w = (fromId, fromPin, toId, toPin) => ({ from: { id: fromId, pin: fromPin }, to: { id: toId, pin: toPin } });

// bank 0 (soldered) sits on MD, bank 1 (socketed) on SDB behind the bus switch; lo = bits 15:0, hi = bits 31:16
const DRAMS = [
  { k: 0, ref: 'U19', bus: 'MD[15:0]', x: 491, y: 148, bank: '02', half: 'lo', we: 'we03_n', oe: 'oe0_n' },
  { k: 1, ref: 'U20', bus: 'MD[31:16]', x: 608, y: 148, bank: '02', half: 'hi', we: 'we03_n', oe: 'oe0_n' },
  { k: 2, ref: 'U23', bus: 'SDB[15:0]', x: 523, y: 53, bank: '13', half: 'lo', we: 'we12_n', oe: 'oe1_n' },
  { k: 3, ref: 'U24', bus: 'SDB[31:16]', x: 645, y: 53, bank: '13', half: 'hi', we: 'we12_n', oe: 'oe1_n' },
];

export const NV1_BOARD = {
  name: 'Diamond Edge 3D 2120 (2 MB) — NVIDIA NV1 (1995)',
  prompt: 'Diamond Edge 3D: NV1 / STG2000X, STG1764X RAMDAC, 2 MB DRAM, AD1845, Sega Saturn game port, VGA',
  components: [
    // on the card
    c('nv1_core', 'NV1_CORE', 'U1 NV1 / STG2000X', 423, 237, {}, [580, 40]),
    c('ramdac', 'RAMDAC_STG1764', 'U2 STG1764X', 259, 73, {}, [960, 250]),
    c('y1_crystal', 'CRYSTAL', 'Y1 12.096 MHz', 211, 50, { freqHz: 12.096e6 }, [650, 600]),
    ...DRAMS.map((d) => c(`dram${d.k}`, 'DRAM_256K16', `${d.ref} 256K×16 ${d.bus}`, d.x, d.y, {}, [960, -430 + d.k * 140])),
    c('bus_switch', 'BUS_SWITCH_32', 'U25–U28 PI5C3245Q', 549, 113, {}, [1200, -290]),
    c('bios_rom', 'EPROM_27C256', 'U12 VIDEO BIOS 27C256', 621, 199, {}, [960, 140]),
    c('codec', 'AD1845', 'U7 AD1845JP', 310, 247, {}, [960, 470]),
    c('sega_asic', 'SEGA_ASIC', 'U34 nvSGP', 415, 115, {}, [960, 700]),
    c('j5_sega_a', 'SEGA_HEADER', 'J5 PORT A', 386, 57, {}, [1260, 750]),
    c('j6_sega_b', 'SEGA_HEADER', 'J6 PORT B', 448, 57, {}, [1260, 840]),
    c('j1_pci', 'PCI_EDGE', 'J1 PCI 32-BIT 5V', 275, 386, {}, [290, 140]),
    // on the bracket edge of the card (body on the PCB, mating face through the bracket), from the top:
    // modular jack, DE-15, three 3.5 mm jacks (their order mic / line in / line out has a single source)
    c('j3_game', 'GAME_PORT', 'P1 GAME', 121, 79, {}, [1260, 930]),
    c('j2_vga', 'VGA_DB15', 'P2 VGA', 121, 143, {}, [1260, 260]),
    c('j6_mic', 'AUDIO_JACK', 'MIC', 121, 270, {}, [1260, 650]),
    c('j4_line_in', 'AUDIO_JACK', 'LINE IN', 121, 310, {}, [1260, 470]),
    c('j5_line_out', 'AUDIO_JACK', 'LINE OUT', 121, 350, {}, [1260, 560]),
    // outside the card: the bracket faces out of the PC case, so the cabled devices sit on its far side
    c('host', 'PCI_HOST', 'HOST PC (PENTIUM / 430FX)', 300, 480, {}, [0, 140]),
    c('monitor', 'VGA_MONITOR', 'VGA MONITOR', -560, -40, {}, [1500, 170]),
    c('speakers', 'AUDIO_SPEAKERS', 'SPEAKERS', -520, 290, {}, [1500, 520]),
    // the pad plugs into the separate "EDGE 3D SEGA" bracket, a ribbon cable brings it to header J5
    c('saturn_pad', 'SATURN_PAD', 'SEGA SATURN PAD', 330, -110, {}, [1500, 750]),
  ],
  wires: [
    // host <-> card edge (motherboard slot)
    ...['clk', 'rst_n', 'ad', 'cbe_n', 'frame_n', 'irdy_n', 'idsel'].map((p) => w('host', p, 'j1_pci', p)),
    ...['trdy_n', 'devsel_n', 'inta_n'].map((p) => w('j1_pci', p, 'host', p)),
    // card edge -> NV1 (copper on the card)
    w('j1_pci', 'B16 CLK', 'nv1_core', 'pci_clk'),
    w('j1_pci', 'A15 RST#', 'nv1_core', 'rst_n'),
    w('j1_pci', 'AD[31:0]', 'nv1_core', 'ad'),
    w('j1_pci', 'C/BE#[3:0]', 'nv1_core', 'cbe_n'),
    w('j1_pci', 'A34 FRAME#', 'nv1_core', 'frame_n'),
    w('j1_pci', 'B35 IRDY#', 'nv1_core', 'irdy_n'),
    w('nv1_core', 'trdy_n', 'j1_pci', 'A36 TRDY#'),
    w('nv1_core', 'devsel_n', 'j1_pci', 'B37 DEVSEL#'),
    w('j1_pci', 'A26 IDSEL', 'nv1_core', 'idsel'),
    w('nv1_core', 'inta_n', 'j1_pci', 'A6 INTA#'),
    // clocks: the only crystal -> three PLLs in the Palette-DAC -> memory clock x2, VCLK (dot clock / 4) and codec clock
    w('y1_crystal', 'xtal', 'ramdac', 'xtal'),
    w('ramdac', 'vclk', 'nv1_core', 'vclk'),
    w('ramdac', 'mclkx2', 'nv1_core', 'mclkx2'),
    // DRAM: one RAS#, per bank an address bus, four CAS# (two per chip), WE# and OE#
    ...DRAMS.flatMap((d) => [
      w('nv1_core', `ma${d.bank}`, `dram${d.k}`, 'a'),
      w('nv1_core', 'ras_n', `dram${d.k}`, 'ras_n'),
      w('nv1_core', d.we, `dram${d.k}`, 'we_n'),
      w('nv1_core', d.oe, `dram${d.k}`, 'oe_n'),
      w('nv1_core', `cas${d.bank}_${d.half}_n`, `dram${d.k}`, 'cas_n'),
    ]),
    // MD bus: NV1, bank 0, pixel port P[31:0] of the DAC, BIOS ROM, near side of the bus switch
    w('nv1_core', 'md_lo', 'dram0', 'dq'),
    w('nv1_core', 'md_hi', 'dram1', 'dq'),
    w('nv1_core', 'md_lo', 'ramdac', 'p_lo0'),
    w('nv1_core', 'md_hi', 'ramdac', 'p_hi0'),
    w('nv1_core', 'md_lo', 'bus_switch', 'a_lo'),
    w('nv1_core', 'md_hi', 'bus_switch', 'a_hi'),
    w('nv1_core', 'en64', 'bus_switch', 'en64'),
    // SDB bus behind the switch: bank 1 and pixel port P[63:32] of the DAC
    w('bus_switch', 'b_lo', 'dram2', 'dq'),
    w('bus_switch', 'b_hi', 'dram3', 'dq'),
    w('bus_switch', 'b_lo', 'ramdac', 'p_lo1'),
    w('bus_switch', 'b_hi', 'ramdac', 'p_hi1'),
    // video BIOS on the MD bus: address MD[30:16], data MD[7:0], one chip select
    w('nv1_core', 'md_hi', 'bios_rom', 'a'),
    w('bios_rom', 'd', 'nv1_core', 'md_lo'),
    w('nv1_core', 'romcs_n', 'bios_rom', 'ce_n'),
    w('nv1_core', 'romcs_n', 'bios_rom', 'oe_n'),
    // Palette-DAC control, analog RGB -> VGA connector, syncs straight from NV1
    w('nv1_core', 'loadclk', 'ramdac', 'loadclk'),
    w('nv1_core', 'blank_n', 'ramdac', 'blank_n'),
    w('nv1_core', 'daccs_n', 'ramdac', 'daccs_n'),
    w('ramdac', 'r', 'j2_vga', 'r'),
    w('ramdac', 'g', 'j2_vga', 'g'),
    w('ramdac', 'b', 'j2_vga', 'b'),
    w('nv1_core', 'hsync', 'j2_vga', 'hsync'),
    w('nv1_core', 'vsync', 'j2_vga', 'vsync'),
    // VGA cable -> monitor
    w('j2_vga', '1 RED', 'monitor', 'r'),
    w('j2_vga', '2 GREEN', 'monitor', 'g'),
    w('j2_vga', '3 BLUE', 'monitor', 'b'),
    w('j2_vga', '13 HSYNC', 'monitor', 'hsync'),
    w('j2_vga', '14 VSYNC', 'monitor', 'vsync'),
    // audio: NV1 synth -> AD1845 -> jacks
    w('ramdac', 'aclk', 'codec', 'xtal'),
    w('nv1_core', 'aud_d', 'codec', 'd'),
    w('nv1_core', 'aud_a', 'codec', 'a'),
    w('nv1_core', 'aud_wr_n', 'codec', 'wr_n'),
    w('nv1_core', 'aud_rd_n', 'codec', 'rd_n'),
    w('nv1_core', 'aud_pd_n', 'codec', 'pd_n'),
    w('codec', 'lout', 'j5_line_out', 'l'),
    w('codec', 'rout', 'j5_line_out', 'r'),
    w('j4_line_in', 'l', 'codec', 'lin_l'),
    w('j4_line_in', 'r', 'codec', 'lin_r'),
    w('j6_mic', 'l', 'codec', 'mic'),
    w('j5_line_out', 'TIP L', 'speakers', 'l'),
    w('j5_line_out', 'RING R', 'speakers', 'r'),
    // Saturn pads: game port of the DAC -> nvSGP -> headers PORT A / PORT B -> ribbon cable -> pad
    w('ramdac', 'gp_sel', 'sega_asic', 'sel'),
    w('sega_asic', 'd', 'ramdac', 'gp_d'),
    w('sega_asic', 'A TH/TR', 'j5_sega_a', 'sel'),
    w('j5_sega_a', 'd', 'sega_asic', 'A D[3:0]'),
    w('sega_asic', 'B TH/TR', 'j6_sega_b', 'sel'),
    w('j6_sega_b', 'd', 'sega_asic', 'B D[3:0]'),
    w('j5_sega_a', 'TH/TR', 'saturn_pad', 'sel'),
    w('saturn_pad', 'd', 'j5_sega_a', 'D[3:0]'),
  ],
};
