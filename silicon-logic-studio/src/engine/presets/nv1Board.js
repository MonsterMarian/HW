// Diamond Edge 3D 2120 upgraded to 2 MB (NVIDIA NV1 / SGS-Thomson STG2000X, 1995) as a netlist of real parts.
// The 2120 shipped with 1 MB (2 soldered 256Kx16 chips) and 2 empty SOJ sockets; with all 4 chips it equals the 2200.
// Positions are 2D world px at 3.7 px/mm (shared by the PCB view and the 3D board, see boardLayout.js).
// sx/sy = position in the schematic view (laid out by signal flow: host -> J1 -> U1 -> memory / video / audio / pad).
// Part list: NV1 (STG2000X), STG1764X RAMDAC, 2 MB 50 ns SEC DRAM, AD1845 codec, video BIOS EPROM,
// VGA DE-15, 3.5 mm jacks, proprietary RJ-45 game port (sources: vgamuseum.ru, thandor.net, dosdays.co.uk,
// vintage3d.org; STG2000 datasheet Sep 1996). Known simplifications against the datasheet are listed in README
// ("Co je model"): the real chip has a 32-bit MD bus with two interleaved banks, loads pixels into the DAC from MD,
// reads the ROM over MD, reaches the game port through the DAC and is a two-function PCI device.

const c = (id, type, label, x, y, extra = {}, [sx, sy] = []) => ({ id, type, label, x, y, sx, sy, inputs: {}, outputs: {}, ...extra });
const w = (fromId, fromPin, toId, toPin) => ({ from: { id: fromId, pin: fromPin }, to: { id: toId, pin: toPin } });

const DRAMS = [0, 1, 2, 3];

export const NV1_BOARD = {
  name: 'Diamond Edge 3D 2120 (2 MB) — NVIDIA NV1 (1995)',
  prompt: 'Diamond Edge 3D: NV1 / STG2000X, STG1764X RAMDAC, 2 MB DRAM, AD1845, Sega Saturn game port, VGA',
  components: [
    // on the card
    c('nv1_core', 'NV1_CORE', 'U1 NV1 / STG2000X', 382, 140, {}, [580, 40]),
    c('ramdac', 'RAMDAC_STG1764', 'U2 STG1764X', 208, 52, {}, [960, 260]),
    c('y1_crystal', 'CRYSTAL', 'Y1 14.31818 MHz', 300, 64, { freqHz: 14.31818e6 }, [650, 600]),
    ...DRAMS.map((k) => c(`dram${k}`, 'DRAM_256K16', `U${3 + k} KM416C256 MD[${16 * k + 15}:${16 * k}]`, 560 + k * 50, 40, {}, [960, -430 + k * 140])),
    c('bios_rom', 'EPROM_27C256', 'U8 VIDEO BIOS 27C256', 560, 196, {}, [960, 140]),
    c('codec', 'AD1845', 'U7 AD1845JP', 196, 236, {}, [960, 420]),
    c('j1_pci', 'PCI_EDGE', 'J1 PCI 32-BIT 5V', 275, 386, {}, [290, 140]),
    // on the bracket edge of the card (body on the PCB, mating face through the bracket)
    c('j2_vga', 'VGA_DB15', 'J2 VGA', 121, 38, {}, [1260, 260]),
    c('j3_game', 'GAME_PORT', 'J3 GAME', 121, 168, {}, [960, 640]),
    c('j4_line_in', 'AUDIO_JACK', 'J4 LINE IN', 121, 246, {}, [1260, 420]),
    c('j5_line_out', 'AUDIO_JACK', 'J5 LINE OUT', 121, 294, {}, [1260, 510]),
    c('j6_mic', 'AUDIO_JACK', 'J6 MIC', 121, 342, {}, [1260, 600]),
    // outside the card: the bracket faces out of the PC case, so the cabled devices sit on its far side
    c('host', 'PCI_HOST', 'HOST PC (PENTIUM / 430FX)', 300, 480, {}, [0, 140]),
    c('monitor', 'VGA_MONITOR', 'VGA MONITOR', -560, -40, {}, [1500, 170]),
    c('speakers', 'AUDIO_SPEAKERS', 'SPEAKERS', -520, 290, {}, [1500, 470]),
    c('saturn_pad', 'SATURN_PAD', 'SEGA SATURN PAD', -230, 250, {}, [1260, 700]),
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
    // clocks: the only crystal -> three PLLs in the RAMDAC -> pixel, memory and codec clocks
    w('y1_crystal', 'xtal', 'ramdac', 'xtal'),
    w('ramdac', 'vclk', 'nv1_core', 'vclk'),
    w('ramdac', 'mclk', 'nv1_core', 'mclk'),
    // DRAM bus (model: one 64-bit bus; real chip: 32-bit MD with two banks): shared address/RAS#/WE#/OE#, one 16-bit slice and CAS# pair per chip
    ...DRAMS.flatMap((k) => [
      w('nv1_core', 'ma', `dram${k}`, 'a'),
      w('nv1_core', 'ras_n', `dram${k}`, 'ras_n'),
      w('nv1_core', 'we_n', `dram${k}`, 'we_n'),
      w('nv1_core', 'oe_n', `dram${k}`, 'oe_n'),
      w('nv1_core', `cas${k}_n`, `dram${k}`, 'cas_n'),
      w('nv1_core', `md${k}`, `dram${k}`, 'dq'),
    ]),
    // video BIOS
    w('nv1_core', 'rom_a', 'bios_rom', 'a'),
    w('nv1_core', 'rom_ce_n', 'bios_rom', 'ce_n'),
    w('nv1_core', 'rom_oe_n', 'bios_rom', 'oe_n'),
    w('bios_rom', 'd', 'nv1_core', 'rom_d'),
    // pixels -> RAMDAC -> VGA connector, syncs straight from NV1
    w('nv1_core', 'pix', 'ramdac', 'pix'),
    w('nv1_core', 'blank_n', 'ramdac', 'blank_n'),
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
    w('nv1_core', 'aud_dack_n', 'codec', 'dack_n'),
    w('codec', 'drq', 'nv1_core', 'aud_drq'),
    w('codec', 'lout', 'j5_line_out', 'l'),
    w('codec', 'rout', 'j5_line_out', 'r'),
    w('j4_line_in', 'l', 'codec', 'lin_l'),
    w('j4_line_in', 'r', 'codec', 'lin_r'),
    w('j6_mic', 'l', 'codec', 'mic'),
    w('j5_line_out', 'TIP L', 'speakers', 'l'),
    w('j5_line_out', 'RING R', 'speakers', 'r'),
    // Saturn pad: NV1 selects a button group (TH/TR), the pad answers on D[3:0]
    w('nv1_core', 'sat_sel', 'j3_game', 'sel'),
    w('j3_game', 'd', 'nv1_core', 'sat_d'),
    w('j3_game', 'TH/TR', 'saturn_pad', 'sel'),
    w('saturn_pad', 'd', 'j3_game', 'D[3:0]'),
  ],
};
