// SILICON // LOGIC STUDIO - HIERARCHICAL DRILL-DOWN
//
// Every level is a real circuit that the engine (logicEngine.js) simulates, built the way the hardware is built:
//   L1  board (presets/nv1Board.js: Diamond Edge 3D 2120)
//   L2  inside a chip: floorplan of functional blocks (DIE_BLOCK = passive, descriptive; wires = on-chip buses)
//   L3  RTL of one block (registers, adders, comparators, muxes, ROM/RAM) - simulated, does what the block does
//   L4  a register / adder / comparator / memory made of flip-flops, full adders and gates
//   L5  flip-flop, full adder, mux, XOR... made of NAND/NOR/NOT gates
//   L6  CMOS gates made of PMOS/NMOS switches (switch-level simulation, no gates)
//   L7  one MOSFET in a circuit + passive LAYER parts describing the 0.5 µm process cross-section
//   L8  atoms of the gate oxide and of the silicon crystal (passive ATOM parts) - terminal
//
// Facts we are not sure about are marked "model" / "předpoklad" in the subtitle.

const Z = 'Z';
const GX = 150; // grid used for the schematic layout (world px)
const GY = 112;

const cx = (id, type, label, x, y, extra = {}) => ({ id, type, label, x, y, inputs: {}, outputs: {}, ...extra });
const c = (id, type, label, col, row, extra) => cx(id, type, label, Math.round(60 + col * GX), Math.round(60 + row * GY), extra);
const inp = (id, label, col, row, v = 0) => c(id, 'INPUT', label, col, row, { outputs: { out: v } });
const k = (id, label, col, row, v) => c(id, 'CONSTANT', label, col, row, { outputs: { out: v } });
// starts at Z: the engine never pushes Z onto a net that was Z already, so an undriven node would show a stale 0
const probe = (id, label, col, row) => c(id, 'PROBE', label, col, row, { inputs: { in: Z } });
const clock = (id, label, col, row, freqHz) => c(id, 'CLOCK', label, col, row, { outputs: { out: 0 }, ...(freqHz ? { freqHz } : {}) });
const pins = (names) => Object.fromEntries(names.map((n) => [n, Z]));
const blk = (id, label, x, y, ins, outs, drill) => cx(id, 'DIE_BLOCK', label, x, y, { inputs: pins(ins), outputs: pins(outs), drill });
const w = (from, to) => {
  const [fi, fp] = from.split('.');
  const [ti, tp] = to.split('.');
  return { from: { id: fi, pin: fp }, to: { id: ti, pin: tp } };
};
const fan = (from, ...tos) => tos.map((t) => w(from, t));
const BITS = [0, 1, 2, 3, 4, 5, 6, 7];

export const HIERARCHICAL_SUBCIRCUITS = {};
const H = HIERARCHICAL_SUBCIRCUITS;
const def = (key, sub) => { H[key] = { key, ...sub }; };

// =====================================================================================================
// LEVEL 2 - inside the chips on the board
// =====================================================================================================

// NV1 floorplan. Pads sit on the die edge facing the parts they talk to on the card (RAMDAC left, DRAM top/right,
// PCI edge and BIOS at the bottom); positions are our floorplan model, not a die photo.
def('nv1_die', {
  level: 2,
  name: 'NVIDIA NV1 / SGS-Thomson STG2000X — die',
  subtitle: '0,5 µm CMOS, ~1 mil. tranzistorů, 90 mm², PCI, 64bit paměť. Rozmístění bloků = model floorplanu (die-shot neověřen). Bloky jsou popisné, simuluje se jejich RTL o úroveň níž.',
  components: [
    // pad ring
    blk('pad_video', 'PADY: VIDEO → STG1764X', 60, 160, [], ['P[14:0]', 'SYNC'], 'io_pad'),
    blk('pad_audio_game', 'PADY: AD1845 + SATURN', 60, 325, [], ['CODEC', 'TH/TR D'], 'io_pad'),
    blk('pad_mem_addr', 'PADY: MA RAS# CAS# WE#', 640, 60, ['MA/RAS/CAS'], [], 'io_pad'),
    blk('pad_mem_data', 'PADY: MD[63:0]', 790, 215, ['MD[63:0]'], [], 'io_pad'),
    blk('pad_pci', 'PADY: PCI AD[31:0]', 340, 510, [], ['AD[31:0]', 'PCI CTL'], 'io_pad'),
    blk('pad_rom', 'PADY: BIOS EPROM', 640, 510, ['ROM A/D'], [], 'io_pad'),
    // core
    blk('crtc', 'CRTC + SCAN-OUT FIFO', 190, 160, ['VGA', 'reg', 'fetch'], ['P[14:0]', 'SYNC'], 'crtc'),
    blk('vga', 'VGA KOMPAT. JÁDRO', 340, 160, [], ['časování'], 'vga_serializer'),
    blk('gfx2d', '2D AKCELERÁTOR', 490, 160, ['příkaz'], ['pixely'], 'blit_engine'),
    blk('memctl', 'ŘADIČ DRAM 64 BIT', 640, 160, ['2D', '3D', 'scan-out'], ['MA/RAS/CAS', 'MD[63:0]', 'scan'], 'mem_ctrl'),
    blk('audio', 'AUDIO 32 HLASŮ + KODEK IF', 190, 270, ['reg'], ['CODEC'], 'audio_voice'),
    blk('cmd_fifo', 'PŘÍKAZOVÝ FIFO', 340, 270, ['vstup', 'DMA'], ['příkazy'], 'cmd_fifo'),
    blk('qtm', '3D KVADRATICKÝ RENDERER', 490, 270, ['příkaz'], ['pixely'], 'qtm_forward_diff'),
    blk('dma', 'DMA (PCI BUS MASTER)', 640, 270, [], ['master', 'data'], 'dma_engine'),
    blk('gameport', 'GAME PORT (SATURN)', 190, 380, ['reg'], ['TH/TR D'], 'game_port_scan'),
    blk('pci_if', 'PCI TARGET + CONFIG', 340, 380, ['AD[31:0]', 'PCI CTL', 'master'], ['zápisy', 'MMIO', 'ROM'], 'pci_target'),
    blk('regs', 'REGISTRY (MMIO)', 490, 380, ['sběrnice'], ['řízení'], 'mmio_regs'),
    blk('rom_if', 'ROZHRANÍ BIOS ROM', 640, 380, ['požadavek'], ['ROM A/D'], 'rom_if'),
  ],
  wires: [
    w('pad_pci.AD[31:0]', 'pci_if.AD[31:0]'),
    w('pad_pci.PCI CTL', 'pci_if.PCI CTL'),
    w('dma.master', 'pci_if.master'),
    w('pci_if.zápisy', 'cmd_fifo.vstup'),
    w('dma.data', 'cmd_fifo.DMA'),
    w('pci_if.MMIO', 'regs.sběrnice'),
    w('pci_if.ROM', 'rom_if.požadavek'),
    w('rom_if.ROM A/D', 'pad_rom.ROM A/D'),
    ...fan('cmd_fifo.příkazy', 'gfx2d.příkaz', 'qtm.příkaz'),
    w('gfx2d.pixely', 'memctl.2D'),
    w('qtm.pixely', 'memctl.3D'),
    w('memctl.scan', 'crtc.fetch'),
    w('memctl.MA/RAS/CAS', 'pad_mem_addr.MA/RAS/CAS'),
    w('memctl.MD[63:0]', 'pad_mem_data.MD[63:0]'),
    w('vga.časování', 'crtc.VGA'),
    w('crtc.P[14:0]', 'pad_video.P[14:0]'),
    w('crtc.SYNC', 'pad_video.SYNC'),
    ...fan('regs.řízení', 'crtc.reg', 'audio.reg', 'gameport.reg'),
    w('audio.CODEC', 'pad_audio_game.CODEC'),
    w('gameport.TH/TR D', 'pad_audio_game.TH/TR D'),
  ],
});

def('stg1764_inside', {
  level: 2,
  name: 'SGS-Thomson STG1764X — RAMDAC + 2× PLL',
  subtitle: 'PQFP-128. Vstupní latch pixelů, paleta 256×3×8 (u RGB555 obejitá), 3× 8bit DAC, PLL pro VCLK a MCLK z krystalu 14,31818 MHz. Rozmístění = model.',
  components: [
    blk('pad_pix', 'PADY: P[14:0] BLANK#', 60, 160, [], ['P[14:0]'], 'io_pad'),
    blk('xtal_osc', 'OSCILÁTOR KRYSTALU Y1', 60, 380, [], ['REF'], 'NOT'),
    blk('pix_latch', 'VSTUPNÍ LATCH PIXELŮ', 210, 160, ['P[14:0]', 'VCLK'], ['index'], 'ramdac_datapath'),
    blk('palette', 'PALETA 256×3×8', 370, 100, ['index'], ['RGB 3×8'], 'ramdac_datapath'),
    blk('bypass', 'PŘÍMÉ RGB555 (BYPASS)', 370, 230, ['index'], ['RGB 3×8'], 'ramdac_datapath'),
    blk('dac_r', '8BIT DAC R', 540, 60, ['kód'], ['I_out'], 'ramdac_datapath'),
    blk('dac_g', '8BIT DAC G', 540, 170, ['kód'], ['I_out'], 'ramdac_datapath'),
    blk('dac_b', '8BIT DAC B', 540, 280, ['kód'], ['I_out'], 'ramdac_datapath'),
    blk('pll_v', 'PLL VCLK 25,17 MHz', 210, 380, ['REF'], ['VCLK'], 'pll_dividers'),
    blk('pll_m', 'PLL MCLK 50,1 MHz', 370, 380, ['REF'], ['MCLK'], 'pll_dividers'),
  ],
  wires: [
    w('pad_pix.P[14:0]', 'pix_latch.P[14:0]'),
    ...fan('pix_latch.index', 'palette.index', 'bypass.index'),
    ...fan('palette.RGB 3×8', 'dac_r.kód', 'dac_g.kód', 'dac_b.kód'),
    w('bypass.RGB 3×8', 'dac_r.kód'),
    ...fan('xtal_osc.REF', 'pll_v.REF', 'pll_m.REF'),
    w('pll_v.VCLK', 'pix_latch.VCLK'),
  ],
});

def('dram_inside', {
  level: 2,
  name: 'SEC KM416C256 — 256K×16 FPM DRAM',
  subtitle: '4 Mbit = 512 řádků × 512 sloupců × 16 bitů, multiplexovaná adresa A[8:0] přes RAS#/CAS#. Čítač CBR refreshe zde nekreslen. Rozmístění = model.',
  components: [
    blk('pad_ctl', 'PADY: A[8:0] RAS# CAS#', 60, 160, [], ['A[8:0]'], 'io_pad'),
    blk('row_dec', 'ŘÁDKOVÝ DEKODÉR 9→512', 220, 90, ['RA[8:0]'], ['WL'], 'row_decoder'),
    blk('col_dec', 'SLOUPCOVÝ DEKODÉR 9→512', 220, 250, ['CA[8:0]'], ['CSL'], 'row_decoder'),
    blk('array', 'POLE 1T1C 512×512×16', 390, 90, ['WL'], ['BL'], 'dram_cell_array'),
    blk('sense', 'SENSE AMP (512×16)', 390, 250, ['BL'], ['data'], 'dram_cell_array'),
    blk('io_buf', 'I/O BUFFERY DQ[15:0]', 560, 250, ['data', 'CSL'], ['DQ[15:0]'], 'io_pad'),
  ],
  wires: [
    ...fan('pad_ctl.A[8:0]', 'row_dec.RA[8:0]', 'col_dec.CA[8:0]'),
    w('row_dec.WL', 'array.WL'),
    w('array.BL', 'sense.BL'),
    w('sense.data', 'io_buf.data'),
    w('col_dec.CSL', 'io_buf.CSL'),
  ],
});

def('ad1845_inside', {
  level: 2,
  name: 'Analog Devices AD1845 — SoundPort kodek',
  subtitle: '16bitový stereo kodek s ΣΔ převodníky, paralelní sběrnice s DRQ/DACK#. Analogový mixer a filtry nejsou simulovatelné (vynechány). Rozmístění = model.',
  components: [
    blk('pad_bus', 'PADY: D[7:0] WR# DACK#', 60, 140, [], ['D[7:0]'], 'io_pad'),
    blk('regs', 'INDEXOVANÉ REGISTRY', 220, 140, ['D[7:0]', 'ADC'], ['vzorky'], 'mmio_regs'),
    blk('dac', 'ΣΔ DAC L/R', 390, 80, ['vzorky'], ['LOUT/ROUT'], 'sigma_delta'),
    blk('adc', 'ΣΔ ADC L/R', 390, 220, ['LINE/MIC'], ['vzorky'], 'sigma_delta'),
  ],
  wires: [
    w('pad_bus.D[7:0]', 'regs.D[7:0]'),
    w('regs.vzorky', 'dac.vzorky'),
    w('adc.vzorky', 'regs.ADC'),
  ],
});

def('eprom_inside', {
  level: 2,
  name: '27C256 — video BIOS EPROM 32K×8',
  subtitle: 'UV EPROM: buňka = tranzistor s plovoucím hradlem; vymazaná čte 1, naprogramovaná 0. Rozmístění = model.',
  components: [
    blk('pad_addr', 'PADY: A[14:0] CE# OE#', 60, 140, [], ['A[14:0]'], 'io_pad'),
    blk('x_dec', 'X DEKODÉR (ŘÁDKY)', 220, 80, ['A'], ['WL'], 'row_decoder'),
    blk('y_dec', 'Y DEKODÉR / MUX', 220, 220, ['A'], ['výběr'], 'row_decoder'),
    blk('array', 'POLE 256 Kbit (PLOV. HRADLA)', 390, 80, ['WL'], ['BL'], 'eprom_array'),
    blk('sense', 'SENSE AMP ×8', 390, 220, ['BL', 'výběr'], ['data'], 'eprom_array'),
    blk('out_buf', 'VÝSTUPNÍ BUFFERY D[7:0]', 560, 220, ['data'], ['D[7:0]'], 'io_pad'),
  ],
  wires: [
    ...fan('pad_addr.A[14:0]', 'x_dec.A', 'y_dec.A'),
    w('x_dec.WL', 'array.WL'),
    w('array.BL', 'sense.BL'),
    w('y_dec.výběr', 'sense.výběr'),
    w('sense.data', 'out_buf.data'),
  ],
});

// =====================================================================================================
// LEVEL 3 - RTL of the blocks (simulated)
// =====================================================================================================

// Horizontal timing of VGA 640x480@60 in character clocks (8 px): total 100, sync 82..93 (656..751 px).
// HSYNC is a set/reset flop driven by equality comparators, as in a 6845/VGA CRTC.
def('crtc', {
  level: 3,
  name: 'CRTC — horizontální čítač + HSYNC',
  subtitle: '640×480@60 ve znacích (8 px): HTOTAL 100, HSYNC 82–93 (656–751 px), HSYNC# aktivní v 0. Svislý čítač (525 řádků) a scan-out FIFO tu nejsou nakresleny.',
  components: [
    clock('cclk', 'ZNAKOVÝ TAKT 3,147 MHz', 0, 0, 25.175e6 / 8),
    k('k1', '+1', 0, 1, 1),
    k('k0', '0', 0, 2, 0),
    k('k_htot', 'HTOTAL−1 = 99', 0, 3, 99),
    c('hcnt', 'REGISTER_8BIT', 'H ČÍTAČ', 1, 0),
    c('hinc', 'ADDER_8BIT', 'H + 1', 2, 0),
    c('htot_cmp', 'COMPARATOR_8BIT', 'H == HTOTAL−1', 2, 1),
    c('hwrap', 'MUX', 'NULOVÁNÍ', 3, 0),
    probe('hcnt_probe', 'H', 4, 0),
    k('k_hss', 'HSS−1 = 81', 1, 2, 81),
    k('k_hse', 'HSE−1 = 93', 1, 3, 93),
    c('hss_cmp', 'COMPARATOR_8BIT', 'H == HSS−1', 2, 2),
    c('hse_cmp', 'COMPARATOR_8BIT', 'H == HSE−1', 2, 3),
    c('hs_or', 'OR', 'SET', 3, 2),
    c('hse_n', 'NOT', 'RESET#', 3, 3),
    c('hs_and', 'AND', 'D', 4, 2.5),
    c('hsync_ff', 'D_FF', 'HSYNC FF', 5, 2.5),
    probe('hsync_n', 'HSYNC#', 5, 1.5),
  ],
  wires: [
    ...fan('cclk.out', 'hcnt.clk', 'hsync_ff.clk'),
    ...fan('hcnt.q', 'hinc.a', 'htot_cmp.a', 'hss_cmp.a', 'hse_cmp.a', 'hcnt_probe.in'),
    w('k1.out', 'hinc.b'),
    w('k_htot.out', 'htot_cmp.b'),
    w('hinc.sum', 'hwrap.a'),
    w('k0.out', 'hwrap.b'),
    w('htot_cmp.eq', 'hwrap.sel'),
    w('hwrap.out', 'hcnt.d'),
    w('k_hss.out', 'hss_cmp.b'),
    w('k_hse.out', 'hse_cmp.b'),
    w('hsync_ff.q', 'hs_or.a'),
    w('hss_cmp.eq', 'hs_or.b'),
    w('hse_cmp.eq', 'hse_n.in'),
    w('hs_or.out', 'hs_and.a'),
    w('hse_n.out', 'hs_and.b'),
    w('hs_and.out', 'hsync_ff.d'),
    w('hsync_ff.nq', 'hsync_n.in'),
  ],
});

// f(n) = 3n² + 2n + 5 by forward differencing: x += dx, dx += 2A. Only adders, no multiplier - the NV1 idea.
def('qtm_forward_diff', {
  level: 3,
  name: '3D QTM — dopředné diference (kvadratika)',
  subtitle: 'x(n) = 3n² + 2n + 5: x += Δ, Δ += 2A (jen sčítačky). NV1 počítá kvadratické plochy (u,v) z 9 kontrolních bodů; zde 1 osa a 8 bitů – model šířky.',
  components: [
    clock('clk', 'TAKT JÁDRA 75 MHz', 0, 0, 75e6),
    inp('load', 'LOAD (start křivky)', 0, 1, 0),
    k('k_c', 'C = 5', 0, 2, 5),
    k('k_dx0', 'Δ₀ = A+B = 5', 0, 3, 5),
    c('x_mux', 'MUX', 'LOAD x', 1, 0),
    c('x_reg', 'REGISTER_8BIT', 'x', 2, 0, { state: 5, outputs: { q: 5 } }),
    c('x_add', 'ADDER_8BIT', 'x + Δ', 3, 0),
    probe('x_probe', 'x(n)', 4, 0),
    c('dx_mux', 'MUX', 'LOAD Δ', 1, 2),
    c('dx_reg', 'REGISTER_8BIT', 'Δ', 2, 2, { state: 5, outputs: { q: 5 } }),
    c('dx_add', 'ADDER_8BIT', 'Δ + 2A', 3, 2),
    k('k_ddx', 'Δ² = 2A = 6', 3, 3.2, 6),
    probe('dx_probe', 'Δ(n)', 4, 2),
  ],
  wires: [
    ...fan('clk.out', 'x_reg.clk', 'dx_reg.clk'),
    ...fan('load.out', 'x_mux.sel', 'dx_mux.sel'),
    w('x_add.sum', 'x_mux.a'),
    w('k_c.out', 'x_mux.b'),
    w('x_mux.out', 'x_reg.d'),
    ...fan('x_reg.q', 'x_add.a', 'x_probe.in'),
    ...fan('dx_reg.q', 'x_add.b', 'dx_add.a', 'dx_probe.in'),
    w('k_ddx.out', 'dx_add.b'),
    w('dx_add.sum', 'dx_mux.a'),
    w('k_dx0.out', 'dx_mux.b'),
    w('dx_mux.out', 'dx_reg.d'),
  ],
});

const SINE = Array.from({ length: 256 }, (_, i) => Math.round(128 + 127 * Math.sin((2 * Math.PI * i) / 256)));

def('audio_voice', {
  level: 3,
  name: 'AUDIO — 1 hlas wavetable syntézy',
  subtitle: 'Fázový akumulátor (fáze += přírůstek) adresuje tabulku sinu, 48 kHz. NV1 má 32 hlasů po 16 bitech; zde 1 hlas, 8bitová fáze (skutečně širší, index = horní bity) – model.',
  components: [
    clock('fs_clk', 'VZORKOVACÍ TAKT 48 kHz', 0, 0, 48000),
    inp('inc', 'FÁZOVÝ PŘÍRŮSTEK (ladění)', 0, 1, 16),
    c('phase', 'REGISTER_8BIT', 'FÁZE', 1, 0),
    c('phase_add', 'ADDER_8BIT', 'FÁZE + PŘÍRŮSTEK', 2, 0),
    c('wave_rom', 'ROM', 'TABULKA SINU 256×8', 3, 0, { memory: SINE }),
    probe('sample', 'VZOREK → KODEK', 4, 0.2),
    probe('phase_probe', 'FÁZE', 2, 1.3),
  ],
  wires: [
    w('fs_clk.out', 'phase.clk'),
    ...fan('phase.q', 'phase_add.a', 'wave_rom.addr', 'phase_probe.in'),
    w('inc.out', 'phase_add.b'),
    w('phase_add.sum', 'phase.d'),
    w('wave_rom.dout', 'sample.in'),
  ],
});

// PCI address phase: AD[31:24] == BAR0 & memory command & FRAME# low -> DEVSEL# on the next clock edge
def('pci_target', {
  level: 3,
  name: 'PCI TARGET — dekódování adresy → DEVSEL#',
  subtitle: 'Adresní fáze: AD[31:24] == BAR0 (E0h), C/BE# = 0110/0111 (paměť čtení/zápis), FRAME# = 0 → DEVSEL# = 0 další hranou CLK. Držení DEVSEL# po datové fáze zde nekresleno.',
  components: [
    clock('pci_clk', 'PCI CLK 33 MHz', 0, 0, 33.333e6),
    inp('ad_hi', 'AD[31:24]', 0, 1, 0xE0),
    inp('cbe', 'C/BE#[3:0] = PŘÍKAZ', 0, 2, 6),
    inp('frame_n', 'FRAME#', 0, 3, 1),
    k('bar0', 'BAR0[31:24] = E0h', 1, 1, 0xE0),
    k('k_mr', 'MEM READ 0110', 1, 2, 6),
    k('k_mw', 'MEM WRITE 0111', 1, 3, 7),
    c('bar_cmp', 'COMPARATOR_8BIT', 'ADRESA == BAR0', 2, 1),
    c('cmd_rd', 'COMPARATOR_8BIT', 'PŘÍKAZ == ČTENÍ', 2, 2),
    c('cmd_wr', 'COMPARATOR_8BIT', 'PŘÍKAZ == ZÁPIS', 2, 3),
    c('frame_inv', 'NOT', 'FRAME', 3, 1),
    c('cmd_or', 'OR', 'PAMĚŤOVÝ PŘÍKAZ', 3, 2.5),
    c('hit_and', 'AND', 'ZÁSAH', 4, 1.5),
    c('hit_frame', 'AND', 'ZÁSAH & FRAME', 4, 2.7),
    c('devsel_ff', 'D_FF', 'DEVSEL FF', 5, 1.5),
    probe('devsel_n', 'DEVSEL#', 5, 2.8),
  ],
  wires: [
    w('pci_clk.out', 'devsel_ff.clk'),
    w('ad_hi.out', 'bar_cmp.a'),
    w('bar0.out', 'bar_cmp.b'),
    ...fan('cbe.out', 'cmd_rd.a', 'cmd_wr.a'),
    w('k_mr.out', 'cmd_rd.b'),
    w('k_mw.out', 'cmd_wr.b'),
    w('cmd_rd.eq', 'cmd_or.a'),
    w('cmd_wr.eq', 'cmd_or.b'),
    w('frame_n.out', 'frame_inv.in'),
    w('bar_cmp.eq', 'hit_and.a'),
    w('cmd_or.out', 'hit_and.b'),
    w('hit_and.out', 'hit_frame.a'),
    w('frame_inv.out', 'hit_frame.b'),
    w('hit_frame.out', 'devsel_ff.d'),
    w('devsel_ff.nq', 'devsel_n.in'),
  ],
});

// FPM read cycle: Johnson counter (q0,q1) 00 -> 10 -> 11 -> 01: RAS# low in 10/11, CAS# low in 11, column on MA from 11
def('mem_ctrl', {
  level: 3,
  name: 'ŘADIČ DRAM — multiplex adresy + sekvencer RAS#/CAS#',
  subtitle: 'Čtecí cyklus FPM: řádek na MA → RAS# ↓ → sloupec na MA → CAS# ↓ → prechrage. Čítač ze 2 D-FF (Johnson). Refresh CBR a page-mode burst zde nekresleny; časování tRCD/tASC zjednodušeno.',
  components: [
    clock('mclk', 'MCLK 50 MHz', 0, 0, 50e6),
    inp('row_addr', 'ŘÁDEK RA', 0, 1, 0x12),
    inp('col_addr', 'SLOUPEC CA', 0, 2, 0x34),
    c('s0', 'D_FF', 'STAV q0', 1, 0),
    c('s1', 'D_FF', 'STAV q1', 1, 1.2),
    c('ras_inv', 'NOT', 'RAS#', 2, 0),
    c('cas_nand', 'NAND', 'CAS#', 2, 1),
    c('addr_mux', 'MUX', 'ŘÁDEK / SLOUPEC', 2, 2.2),
    probe('ras_n', 'RAS#', 3, 0),
    probe('cas_n', 'CAS#', 3, 1),
    probe('ma', 'MA', 3, 2.2),
  ],
  wires: [
    ...fan('mclk.out', 's0.clk', 's1.clk'),
    w('s1.nq', 's0.d'),
    ...fan('s0.q', 's1.d', 'ras_inv.in', 'cas_nand.a'),
    ...fan('s1.q', 'cas_nand.b', 'addr_mux.sel'),
    w('row_addr.out', 'addr_mux.a'),
    w('col_addr.out', 'addr_mux.b'),
    w('ras_inv.out', 'ras_n.in'),
    w('cas_nand.out', 'cas_n.in'),
    w('addr_mux.out', 'ma.in'),
  ],
});

// Saturn pad scan as in devices/nv1Card.js: sel = (TR<<1)|TH counts 0..3, the pad answers a 4-bit group
def('game_port_scan', {
  level: 3,
  name: 'GAME PORT — skenování Saturn padu (TH/TR)',
  subtitle: '2bitový čítač (TH = bit 0, TR = bit 1) vybírá skupinu tlačítek, pad odpoví na D[3:0], NV1 ji zachytí do registru (adresa = skupina). Pad = 3 multiplexery (model). Stisk = 0.',
  components: [
    clock('scan_clk', 'TAKT SKENOVÁNÍ', 0, 0),
    inp('g0', 'SK. 0: Z Y X R', 0, 1, 0xF),
    inp('g1', 'SK. 1: B C A START (A=0)', 0, 1.65, 0xB),
    inp('g2', 'SK. 2: ↑ ↓ ← →', 0, 2.3, 0xF),
    inp('g3', 'SK. 3: – – – L', 0, 2.95, 0xF),
    c('th_ff', 'D_FF', 'TH (bit 0)', 1, 0),
    c('tr_ff', 'D_FF', 'TR (bit 1)', 1, 0.9),
    c('tr_xor', 'XOR', 'PŘENOS', 2, 0.9),
    c('mux_a', 'MUX', 'PAD: TH sk. 0/1', 2, 2),
    c('mux_b', 'MUX', 'PAD: TH sk. 2/3', 2, 3),
    c('mux_out', 'MUX', 'PAD: TR', 3, 2.5),
    c('sel_merge', 'BUS_MERGER', 'TH/TR → číslo', 3, 0.5),
    c('cap_ram', 'RAM', 'ZÁCHYTNÝ REGISTR 4×4 bit', 4, 1.5, { inputs: { we: 1 } }),
    probe('sel_probe', 'TH/TR', 5, 0.5),
    probe('pad_d', 'PAD D[3:0]', 4, 3),
    probe('cap_probe', 'ZACHYCENO', 5, 1.8),
  ],
  wires: [
    ...fan('scan_clk.out', 'th_ff.clk', 'tr_ff.clk', 'cap_ram.clk'),
    w('th_ff.nq', 'th_ff.d'),
    ...fan('th_ff.q', 'tr_xor.b', 'mux_a.sel', 'mux_b.sel', 'sel_merge.b0'),
    ...fan('tr_ff.q', 'tr_xor.a', 'mux_out.sel', 'sel_merge.b1'),
    w('tr_xor.out', 'tr_ff.d'),
    w('g0.out', 'mux_a.a'),
    w('g1.out', 'mux_a.b'),
    w('g2.out', 'mux_b.a'),
    w('g3.out', 'mux_b.b'),
    w('mux_a.out', 'mux_out.a'),
    w('mux_b.out', 'mux_out.b'),
    ...fan('mux_out.out', 'cap_ram.din', 'pad_d.in'),
    ...fan('sel_merge.bus', 'cap_ram.addr', 'sel_probe.in'),
    w('cap_ram.dout', 'cap_probe.in'),
  ],
});

const BIOS_HEAD = [0x55, 0xAA, 0x40]; // option ROM signature + size in 512 B blocks (64 = 32 KB)

def('rom_if', {
  level: 3,
  name: 'ROZHRANÍ BIOS ROM — čtení EPROM',
  subtitle: 'Čítač adresy → EPROM → záchytný registr dat. Začátek obrazu 55h AAh + velikost (40h = 32 KB); zbytek obsahu je model, výřez 256 B; 1 bajt / takt (skutečně několik taktů na přístup).',
  components: [
    clock('rom_clk', 'TAKT ČTENÍ (model)', 0, 0, 4e6),
    k('k1', '+1', 0, 1, 1),
    c('rom_addr', 'REGISTER_8BIT', 'ČÍTAČ ADRESY', 1, 0),
    c('addr_inc', 'ADDER_8BIT', 'ADRESA + 1', 2, 0),
    probe('addr_probe', 'ROM A', 3, 0),
    c('eprom', 'ROM', '27C256 (výřez)', 1, 2, { memory: BIOS_HEAD }),
    c('data_latch', 'REGISTER_8BIT', 'LATCH DAT', 2, 2),
    probe('data_probe', 'ROM D', 3, 2),
  ],
  wires: [
    ...fan('rom_clk.out', 'rom_addr.clk', 'data_latch.clk'),
    ...fan('rom_addr.q', 'addr_inc.a', 'eprom.addr', 'addr_probe.in'),
    w('k1.out', 'addr_inc.b'),
    w('addr_inc.sum', 'rom_addr.d'),
    w('eprom.dout', 'data_latch.d'),
    w('data_latch.q', 'data_probe.in'),
  ],
});

def('mmio_regs', {
  level: 3,
  name: 'REGISTRY — dekodér adresy + zápis',
  subtitle: 'Zápis přes sběrnici: adresa == offset registru A zároveň WR → registr převezme data hranou. Mapa registrů NV1 není veřejně zdokumentovaná – offset je model.',
  components: [
    clock('clk', 'TAKT SBĚRNICE', 0, 0),
    inp('addr', 'ADRESA (offset)', 0, 1, 0x20),
    inp('wr', 'WR (zápis)', 0, 2, 0),
    inp('wdata', 'DATA', 0, 3, 0x5A),
    k('k_reg', 'OFFSET REGISTRU 20h', 1, 1, 0x20),
    c('dec', 'COMPARATOR_8BIT', 'DEKODÉR ADRESY', 2, 1),
    c('we_and', 'AND', 'ZÁPIS SEM', 3, 1.5),
    c('reg', 'REGISTER_8BIT', 'ŘÍDICÍ REGISTR', 4, 1.5),
    probe('reg_q', 'OBSAH', 5, 1.8),
  ],
  wires: [
    w('clk.out', 'reg.clk'),
    w('addr.out', 'dec.a'),
    w('k_reg.out', 'dec.b'),
    w('dec.eq', 'we_and.a'),
    w('wr.out', 'we_and.b'),
    w('we_and.out', 'reg.we'),
    w('wdata.out', 'reg.d'),
    w('reg.q', 'reg_q.in'),
  ],
});

def('dma_engine', {
  level: 3,
  name: 'DMA — PCI bus master (adresa + délka)',
  subtitle: 'START načte deskriptor (adresa, délka v dvojslovech); každým taktem adresa += 4, délka −= 1, dokud délka ≠ 0 (REQ). Arbitráž REQ#/GNT# a datová cesta nekresleny; 8bit adresa – model.',
  components: [
    clock('clk', 'PCI CLK 33 MHz', 0, 0, 33.333e6),
    inp('load', 'START', 0, 1, 0),
    k('k_start', 'ADRESA ZDROJE 40h', 0, 2, 0x40),
    k('k_len', 'DÉLKA = 4', 0, 3, 4),
    c('addr_mux', 'MUX', 'LOAD ADR', 1, 0),
    c('addr_reg', 'REGISTER_8BIT', 'ADRESA', 2, 0),
    c('addr_add', 'ADDER_8BIT', 'ADRESA + 4', 3, 0),
    k('k4', '+4 B', 3, 1, 4),
    probe('addr_probe', 'ADRESA', 4, 0),
    c('len_mux', 'MUX', 'LOAD DÉLKA', 1, 2),
    c('len_reg', 'REGISTER_8BIT', 'DÉLKA', 2, 2),
    c('len_add', 'ADDER_8BIT', 'DÉLKA − 1', 3, 2),
    k('kff', '−1 (FFh)', 3, 3.1, 0xFF),
    k('k0', '0', 2, 3.3, 0),
    c('done_cmp', 'COMPARATOR_8BIT', 'DÉLKA == 0', 4, 2),
    c('we_or', 'OR', 'ZÁPIS REG.', 4, 1),
    c('busy', 'NOT', 'BĚŽÍ', 5, 2.2),
    probe('req', 'REQ (bus master)', 5, 1),
    probe('len_probe', 'ZBÝVÁ', 5, 3),
  ],
  wires: [
    ...fan('clk.out', 'addr_reg.clk', 'len_reg.clk'),
    ...fan('load.out', 'addr_mux.sel', 'len_mux.sel', 'we_or.a'),
    w('addr_add.sum', 'addr_mux.a'),
    w('k_start.out', 'addr_mux.b'),
    w('addr_mux.out', 'addr_reg.d'),
    ...fan('addr_reg.q', 'addr_add.a', 'addr_probe.in'),
    w('k4.out', 'addr_add.b'),
    ...fan('we_or.out', 'addr_reg.we', 'len_reg.we'),
    w('len_add.sum', 'len_mux.a'),
    w('k_len.out', 'len_mux.b'),
    w('len_mux.out', 'len_reg.d'),
    ...fan('len_reg.q', 'len_add.a', 'done_cmp.a', 'len_probe.in'),
    w('kff.out', 'len_add.b'),
    w('k0.out', 'done_cmp.b'),
    w('done_cmp.eq', 'busy.in'),
    ...fan('busy.out', 'we_or.b', 'req.in'),
  ],
});

def('cmd_fifo', {
  level: 3,
  name: 'PŘÍKAZOVÝ FIFO — RAM + ukazatele',
  subtitle: 'Zápisy z PCI se řadí do RAM na ukazatel zápisu, čtou se z ukazatele čtení; EMPTY = ukazatele se rovnají. Hloubka 256 a šířka 8 bitů jsou model (skutečná hloubka NV1 neznámá).',
  components: [
    clock('clk', 'TAKT JÁDRA', 0, 0),
    inp('din', 'DATA Z PCI', 0, 1, 0x11),
    inp('push', 'PUSH (zápis)', 0, 2, 0),
    inp('pop', 'POP (čtení)', 0, 3, 0),
    c('wptr', 'REGISTER_8BIT', 'UKAZATEL ZÁPISU', 1, 0),
    c('winc', 'ADDER_8BIT', 'WPTR + 1', 2, 0),
    k('k1', '+1', 2, 1, 1),
    c('rptr', 'REGISTER_8BIT', 'UKAZATEL ČTENÍ', 1, 2),
    c('rinc', 'ADDER_8BIT', 'RPTR + 1', 2, 2),
    c('addr_mux', 'MUX', 'ADRESA RAM', 3, 1),
    c('fifo_ram', 'RAM', 'FIFO RAM 256×8', 4, 1),
    probe('dout', 'HLAVA FIFO', 5, 1.2),
    c('empty_cmp', 'COMPARATOR_8BIT', 'WPTR == RPTR', 3, 2.6),
    probe('empty', 'EMPTY', 4, 2.8),
  ],
  wires: [
    ...fan('clk.out', 'wptr.clk', 'rptr.clk', 'fifo_ram.clk'),
    ...fan('push.out', 'wptr.we', 'addr_mux.sel', 'fifo_ram.we'),
    w('pop.out', 'rptr.we'),
    ...fan('wptr.q', 'winc.a', 'addr_mux.b', 'empty_cmp.a'),
    ...fan('rptr.q', 'rinc.a', 'addr_mux.a', 'empty_cmp.b'),
    ...fan('k1.out', 'winc.b', 'rinc.b'),
    w('winc.sum', 'wptr.d'),
    w('rinc.sum', 'rptr.d'),
    w('addr_mux.out', 'fifo_ram.addr'),
    w('din.out', 'fifo_ram.din'),
    w('fifo_ram.dout', 'dout.in'),
    w('empty_cmp.eq', 'empty.in'),
  ],
});

def('blit_engine', {
  level: 3,
  name: '2D AKCELERÁTOR — výplň / kopie řádku',
  subtitle: 'Čítač x od 0 do šířky, adresa = začátek + 2·x (RGB555 = 2 B/pixel), data = barva výplně nebo zdrojový pixel (ROP). NV1 měl objektové 2D rozhraní – tento řez je model.',
  components: [
    clock('clk', 'TAKT JÁDRA', 0, 0),
    inp('start', 'START', 0, 1, 0),
    inp('mode', 'ROP: 0 VÝPLŇ / 1 KOPIE', 0, 2, 0),
    inp('src', 'ZDROJOVÝ PIXEL', 0, 3, 0x03E0),
    c('x_mux', 'MUX', 'START → x = 0', 1, 0),
    k('k0', '0', 1, 1, 0),
    c('x_reg', 'REGISTER_8BIT', 'x', 2, 0, { state: 8, outputs: { q: 8 } }),
    c('x_add', 'ADDER_8BIT', 'x + 1', 3, 0),
    k('k1', '+1', 3, 1, 1),
    c('w_cmp', 'COMPARATOR_8BIT', 'x == ŠÍŘKA', 4, 0),
    k('k_w', 'ŠÍŘKA = 8 px', 4, 1, 8),
    c('busy', 'NOT', 'BĚŽÍ', 5, 0),
    c('we_or', 'OR', 'ZÁPIS x', 5, 1),
    c('x2', 'ADDER_8BIT', '2·x', 2, 2),
    k('k_base', 'ZAČÁTEK 80h', 2, 3.2, 0x80),
    c('addr_add', 'ADDER_8BIT', 'ADRESA', 3, 2.5),
    probe('addr_probe', 'ADRESA', 4, 2.5),
    k('k_fill', 'BARVA 7C00h', 1, 2.2, 0x7C00),
    c('pix_mux', 'MUX', 'ROP', 1, 3.3),
    probe('we_probe', 'ZÁPIS DO PAMĚTI', 5, 2),
    probe('data_probe', 'DATA PIXELU', 5, 3),
  ],
  wires: [
    w('clk.out', 'x_reg.clk'),
    ...fan('start.out', 'x_mux.sel', 'we_or.a'),
    w('x_add.sum', 'x_mux.a'),
    w('k0.out', 'x_mux.b'),
    w('x_mux.out', 'x_reg.d'),
    ...fan('x_reg.q', 'x_add.a', 'w_cmp.a', 'x2.a', 'x2.b'),
    w('k1.out', 'x_add.b'),
    w('k_w.out', 'w_cmp.b'),
    w('w_cmp.eq', 'busy.in'),
    ...fan('busy.out', 'we_or.b', 'we_probe.in'),
    w('we_or.out', 'x_reg.we'),
    w('k_base.out', 'addr_add.a'),
    w('x2.sum', 'addr_add.b'),
    w('addr_add.sum', 'addr_probe.in'),
    w('mode.out', 'pix_mux.sel'),
    w('k_fill.out', 'pix_mux.a'),
    w('src.out', 'pix_mux.b'),
    w('pix_mux.out', 'data_probe.in'),
  ],
});

// Every 8 dots the serializer loads a font byte, then shifts it left (q + q); the pixel is bit 7
def('vga_serializer', {
  level: 3,
  name: 'VGA JÁDRO — serializér bitů fontu',
  subtitle: 'Textový režim: každých 8 bodů se načte bajt fontu a vysouvá se MSB první (posun = q + q). Znakový generátor, atributy a paleta VGA nekresleny – model.',
  components: [
    clock('dclk', 'DOT CLOCK 25,175 MHz', 0, 0, 25.175e6),
    inp('font', 'BAJT FONTU', 0, 1, 0x3C),
    k('k1', '+1', 0, 2, 1),
    k('k0', '0', 0, 3, 0),
    c('cnt', 'REGISTER_8BIT', 'ČÍTAČ BODU 0–7', 1, 0),
    k('k7', '7', 1, 1, 7),
    c('cnt_inc', 'ADDER_8BIT', '+1', 2, 0),
    c('cnt_cmp', 'COMPARATOR_8BIT', 'BOD == 7', 2, 1),
    c('cnt_mux', 'MUX', 'NULOVÁNÍ', 3, 0),
    c('sh_mux', 'MUX', 'NAČTI / POSUŇ', 2, 2.3),
    c('sh_reg', 'REGISTER_8BIT', 'POSUVNÝ REGISTR', 3, 2),
    c('sh_add', 'ADDER_8BIT', 'q + q = POSUN', 4, 2),
    c('split', 'BUS_SPLITTER', 'BIT 7', 4, 0.5),
    probe('pixel', 'BOD (pixel)', 5, 0.5),
  ],
  wires: [
    ...fan('dclk.out', 'cnt.clk', 'sh_reg.clk'),
    ...fan('cnt.q', 'cnt_inc.a', 'cnt_cmp.a'),
    w('k1.out', 'cnt_inc.b'),
    w('k7.out', 'cnt_cmp.b'),
    w('cnt_inc.sum', 'cnt_mux.a'),
    w('k0.out', 'cnt_mux.b'),
    ...fan('cnt_cmp.eq', 'cnt_mux.sel', 'sh_mux.sel'),
    w('cnt_mux.out', 'cnt.d'),
    w('sh_add.sum', 'sh_mux.a'),
    w('font.out', 'sh_mux.b'),
    w('sh_mux.out', 'sh_reg.d'),
    ...fan('sh_reg.q', 'sh_add.a', 'sh_add.b', 'split.bus'),
    w('split.b7', 'pixel.in'),
  ],
});

def('io_pad', {
  level: 3,
  name: 'I/O PAD — obousměrný vývod',
  subtitle: 'Výstupní budič s třetím stavem (OE) a vstupní přijímač na stejném pinu. Bez OE pin plave (Z); dva budiče s různou hodnotou = zkrat (X). Ochranné diody a ESD nejsou simulovatelné.',
  components: [
    inp('core_out', 'DATA Z JÁDRA', 0, 0, 1),
    inp('oe', 'OE (výstup povolen)', 0, 1, 1),
    inp('ext_data', 'PROTISTRANA: DATA', 0, 2.2, 0),
    inp('ext_oe', 'PROTISTRANA: OE', 0, 3.2, 0),
    c('out_drv', 'TRI_STATE_BUFFER', 'VÝSTUPNÍ BUDIČ', 1, 0.5),
    c('ext_drv', 'TRI_STATE_BUFFER', 'BUDIČ DRUHÉHO ČIPU', 1, 2.7),
    probe('pad', 'PIN / PAD', 2, 1.6),
    c('rx1', 'NOT', 'PŘIJÍMAČ', 3, 1.6),
    c('rx2', 'NOT', 'PŘIJÍMAČ', 4, 1.6),
    probe('core_in', 'DO JÁDRA', 5, 1.6),
  ],
  wires: [
    w('core_out.out', 'out_drv.in'),
    w('oe.out', 'out_drv.enable'),
    w('ext_data.out', 'ext_drv.in'),
    w('ext_oe.out', 'ext_drv.enable'),
    w('out_drv.out', 'pad.in'),
    w('ext_drv.out', 'pad.in'),
    w('out_drv.out', 'rx1.in'),
    w('rx1.out', 'rx2.in'),
    w('rx2.out', 'core_in.in'),
  ],
});

def('row_decoder', {
  level: 3,
  name: 'DEKODÉR ADRESY — výřez 2 → 4',
  subtitle: 'Řádkový/sloupcový dekodér: z adresních bitů aktivuje právě jednu word line. Výřez 2 bitů ze 9 (DRAM 9→512) resp. z adresy EPROM.',
  components: [
    inp('a0', 'A0', 0, 0.5, 0),
    inp('a1', 'A1', 0, 2.5, 0),
    c('n0', 'NOT', 'A0#', 1, 0.5),
    c('n1', 'NOT', 'A1#', 1, 2.5),
    ...[0, 1, 2, 3].map((i) => c(`wl${i}_and`, 'AND', `WL${i}`, 2, i)),
    ...[0, 1, 2, 3].map((i) => probe(`wl${i}`, `WORD LINE ${i}`, 3, i)),
  ],
  wires: [
    w('a0.out', 'n0.in'),
    w('a1.out', 'n1.in'),
    ...fan('n1.out', 'wl0_and.a', 'wl1_and.a'),
    ...fan('a1.out', 'wl2_and.a', 'wl3_and.a'),
    ...fan('n0.out', 'wl0_and.b', 'wl2_and.b'),
    ...fan('a0.out', 'wl1_and.b', 'wl3_and.b'),
    ...[0, 1, 2, 3].map((i) => w(`wl${i}_and.out`, `wl${i}.in`)),
  ],
});

// Two 1T1C cells on one bit line. The cell node keeps its charge when the access transistor is off.
// Sense amp (simplified, binary simulator): BL precharged to 1, the cell shares charge with it - a 1 keeps BL at 1,
// a 0 leaves it at an undefined level (X) which does not open the sense transistor; the footed dynamic stage
// therefore reads the bit, and the write-back driver restores the cell (the read is destructive, as in real DRAM).
def('dram_cell_array', {
  level: 3,
  name: 'DRAM — 1T1C buňky, bit line, sense amp',
  subtitle: 'Buňka = přístupový NMOS + kondenzátor (uzel drží náboj). Čtení: předpětí BL → otevření WL → sense → zpětný zápis. Skutečný SA je diferenciální na VDD/2; tento binární simulátor ho zjednodušuje (model).',
  components: [
    inp('pre', 'PRECHARGE BL', 0, 0, 0),
    inp('wl0', 'WORD LINE 0', 0, 0.55, 0),
    inp('wl1', 'WORD LINE 1', 0, 1.1, 0),
    inp('se', 'SENSE ENABLE', 0, 1.65, 0),
    inp('drv', 'BUDIČ BL (zápis)', 0, 2.2, 0),
    inp('wr', 'ZDROJ: 1 DIN / 0 ZPĚT', 0, 2.75, 0),
    inp('din', 'DATA IN', 0, 3.3, 0),
    c('vdd', 'VDD', 'VDD', 1, 0),
    c('pre_drv', 'TRI_STATE_BUFFER', 'PŘEDPĚTÍ BL', 1, 0.6),
    c('wr_mux', 'MUX', 'DIN / ZPĚTNÝ ZÁPIS', 1, 1.5),
    c('wr_drv', 'TRI_STATE_BUFFER', 'ZÁPISOVÝ BUDIČ', 1, 2.4),
    c('pre_inv', 'NOT', 'PRE#', 1, 3.3),
    probe('bl', 'BIT LINE', 2, 0),
    c('acc0_nmos', 'NMOS', 'PŘÍSTUP. NMOS 0', 2, 1),
    c('acc1_nmos', 'NMOS', 'PŘÍSTUP. NMOS 1', 2, 2.2),
    probe('cell0', 'C0 (náboj buňky)', 3, 1.1),
    probe('cell1', 'C1 (náboj buňky)', 3, 2.3),
    c('sa_pre_pmos', 'PMOS', 'SA PŘEDNABITÍ', 4, 0),
    c('sa_nmos', 'NMOS', 'SA VSTUP (BL)', 4, 1.2),
    c('sa_en_nmos', 'NMOS', 'SA ENABLE', 4, 2.4),
    c('gnd', 'GND', 'GND', 4, 3.4),
    c('sa_inv', 'NOT', 'SA VÝSTUP', 5, 1.2),
    probe('dout', 'DATA OUT', 5, 2),
  ],
  wires: [
    ...fan('vdd.out', 'pre_drv.in', 'sa_pre_pmos.s'),
    ...fan('pre.out', 'pre_drv.enable', 'pre_inv.in'),
    w('pre_inv.out', 'sa_pre_pmos.g'),
    w('pre_drv.out', 'bl.in'),
    w('wr_drv.out', 'bl.in'),
    w('acc0_nmos.d', 'bl.in'),
    w('acc1_nmos.d', 'bl.in'),
    w('sa_nmos.g', 'bl.in'),
    w('wl0.out', 'acc0_nmos.g'),
    w('wl1.out', 'acc1_nmos.g'),
    w('acc0_nmos.s', 'cell0.in'),
    w('acc1_nmos.s', 'cell1.in'),
    w('sa_pre_pmos.d', 'sa_inv.in'),
    w('sa_nmos.d', 'sa_inv.in'),
    w('sa_nmos.s', 'sa_en_nmos.d'),
    w('se.out', 'sa_en_nmos.g'),
    w('gnd.out', 'sa_en_nmos.s'),
    ...fan('sa_inv.out', 'dout.in', 'wr_mux.a'),
    w('din.out', 'wr_mux.b'),
    w('wr.out', 'wr_mux.sel'),
    w('wr_mux.out', 'wr_drv.in'),
    w('drv.out', 'wr_drv.enable'),
  ],
});

// 2x2 NOR array: an erased cell conducts when its word line rises and discharges the precharged bit line;
// a programmed cell (electrons on the floating gate, Vt above the 5 V read voltage) never conducts.
def('eprom_array', {
  level: 3,
  name: 'EPROM — pole buněk s plovoucím hradlem 2×2',
  subtitle: 'BL se přednabije PMOS, WL otevře řádek: vymazaná buňka BL vybije → čte 1; naprogramovaná (náboj na plovoucím hradle, Vt > 5 V) nevede → čte 0. Model: hradlo naprogramované buňky = trvale 0.',
  components: [
    inp('pre_n', 'PRECHARGE# (0 = nabíjet)', 0, 0, 0),
    inp('wl0', 'WORD LINE 0', 0, 1, 0),
    inp('wl1', 'WORD LINE 1', 0, 2, 0),
    k('k_prog', 'NABITÉ PLOV. HRADLO', 0, 3, 0),
    c('vdd', 'VDD', 'VDD', 1, 0),
    c('pc0_pmos', 'PMOS', 'PŘEDNABITÍ BL0', 2, 0),
    c('pc1_pmos', 'PMOS', 'PŘEDNABITÍ BL1', 4, 0),
    c('c00_nmos', 'NMOS', 'W0 B0 VYMAZANÁ', 2, 1.3),
    c('c10_nmos', 'NMOS', 'W1 B0 NAPROGRAM.', 2, 2.5),
    c('c01_nmos', 'NMOS', 'W0 B1 NAPROGRAM.', 4, 1.3),
    c('c11_nmos', 'NMOS', 'W1 B1 VYMAZANÁ', 4, 2.5),
    c('gnd', 'GND', 'GND', 3, 3.4),
    c('sa0', 'NOT', 'SENSE B0', 3, 0.5),
    c('sa1', 'NOT', 'SENSE B1', 5, 0.5),
    probe('d0', 'D0', 3, 1.3),
    probe('d1', 'D1', 5, 1.3),
  ],
  wires: [
    ...fan('vdd.out', 'pc0_pmos.s', 'pc1_pmos.s'),
    ...fan('pre_n.out', 'pc0_pmos.g', 'pc1_pmos.g'),
    w('pc0_pmos.d', 'sa0.in'),
    w('c00_nmos.d', 'sa0.in'),
    w('c10_nmos.d', 'sa0.in'),
    w('pc1_pmos.d', 'sa1.in'),
    w('c01_nmos.d', 'sa1.in'),
    w('c11_nmos.d', 'sa1.in'),
    w('wl0.out', 'c00_nmos.g'),
    w('wl1.out', 'c11_nmos.g'),
    ...fan('k_prog.out', 'c10_nmos.g', 'c01_nmos.g'),
    ...fan('gnd.out', 'c00_nmos.s', 'c10_nmos.s', 'c01_nmos.s', 'c11_nmos.s'),
    w('sa0.out', 'd0.in'),
    w('sa1.out', 'd1.in'),
  ],
});

const PALETTE_R = Array.from({ length: 256 }, (_, i) => 255 - i); // red channel of a sample palette (model)
const EXPAND_5_8 = Array.from({ length: 256 }, (_, i) => (i < 32 ? (i << 3) | (i >> 2) : 0)); // bit replication

def('ramdac_datapath', {
  level: 3,
  name: 'RAMDAC — datová cesta kanálu R',
  subtitle: 'Latch pixelu (VCLK) → paleta (8bpp) nebo přímé RGB555 (5→8 bitů opakováním bitů) → latch DAC. Jeden kanál ze tří; analogový proudový DAC se nesimuluje, sonda ukazuje jeho vstupní kód.',
  components: [
    clock('vclk', 'VCLK 25,17 MHz', 0, 0, 25.175e6),
    inp('pix_in', 'PIXEL (R5 nebo index)', 0, 1, 31),
    inp('mode', 'REŽIM: 0 PALETA / 1 RGB555', 0, 2.5, 1),
    c('pix_latch', 'REGISTER_8BIT', 'VSTUPNÍ LATCH', 1, 0.5),
    c('palette', 'RAM', 'PALETA R 256×8', 2, 0, { memory: PALETTE_R }),
    c('expand', 'ROM', 'ROZŠÍŘENÍ 5→8 BIT', 2, 1.6, { memory: EXPAND_5_8 }),
    c('mode_mux', 'MUX', 'BYPASS PALETY', 3, 1),
    c('dac_latch', 'REGISTER_8BIT', 'LATCH DAC R', 4, 0.8),
    probe('dac_probe', 'KÓD DAC R', 5, 1),
  ],
  wires: [
    ...fan('vclk.out', 'pix_latch.clk', 'dac_latch.clk'),
    w('pix_in.out', 'pix_latch.d'),
    ...fan('pix_latch.q', 'palette.addr', 'expand.addr'),
    w('palette.dout', 'mode_mux.a'),
    w('expand.dout', 'mode_mux.b'),
    w('mode.out', 'mode_mux.sel'),
    w('mode_mux.out', 'dac_latch.d'),
    w('dac_latch.q', 'dac_probe.in'),
  ],
});

// f_vco = f_ref * M / N, VCLK = f_vco / 2^P with M=116, N=33, P=1 (values of the simulator's STG1764 model)
const XTAL = 14.31818e6;
def('pll_dividers', {
  level: 3,
  name: 'PLL — děliče N, M a P (VCLK)',
  subtitle: 'Fázový detektor porovnává f_ref/N s f_VCO/M; zamčeno = obě značky chodí stejně rychle. VCO je tu ideální zdroj na zamčené frekvenci (analogová smyčka nesimulována). M/N/P = 116/33/1 z modelu nv1Card.js.',
  components: [
    clock('xtal', 'REFERENCE 14,31818 MHz', 0, 0, XTAL),
    k('k1', '+1', 0, 1, 1),
    clock('vco', 'VCO 50,33 MHz (ideální)', 0, 2, (XTAL * 116) / 33),
    k('k0', '0', 0, 3, 0),
    c('ref_cnt', 'REGISTER_8BIT', 'DĚLIČ ÷N', 1, 0),
    c('ref_inc', 'ADDER_8BIT', '+1', 2, 0),
    k('k_n', 'N−1 = 32', 1, 1, 32),
    c('ref_cmp', 'COMPARATOR_8BIT', '== N−1', 2, 1),
    c('ref_mux', 'MUX', 'NULOVÁNÍ', 3, 0),
    c('fb_cnt', 'REGISTER_8BIT', 'DĚLIČ ÷M', 1, 2),
    c('fb_inc', 'ADDER_8BIT', '+1', 2, 2),
    k('k_m', 'M−1 = 115', 1, 3, 115),
    c('fb_cmp', 'COMPARATOR_8BIT', '== M−1', 2, 3),
    c('fb_mux', 'MUX', 'NULOVÁNÍ', 3, 2),
    probe('ref_tick', 'f_ref / N', 4, 1),
    probe('fb_tick', 'f_VCO / M', 4, 1.6),
    c('post_ff', 'D_FF', 'DĚLIČ ÷2 (P=1)', 4, 2.5),
    probe('vclk_out', 'VCLK 25,17 MHz', 5, 2.5),
  ],
  wires: [
    w('xtal.out', 'ref_cnt.clk'),
    ...fan('vco.out', 'fb_cnt.clk', 'post_ff.clk'),
    ...fan('ref_cnt.q', 'ref_inc.a', 'ref_cmp.a'),
    ...fan('fb_cnt.q', 'fb_inc.a', 'fb_cmp.a'),
    ...fan('k1.out', 'ref_inc.b', 'fb_inc.b'),
    ...fan('k0.out', 'ref_mux.b', 'fb_mux.b'),
    w('k_n.out', 'ref_cmp.b'),
    w('k_m.out', 'fb_cmp.b'),
    w('ref_inc.sum', 'ref_mux.a'),
    w('fb_inc.sum', 'fb_mux.a'),
    ...fan('ref_cmp.eq', 'ref_mux.sel', 'ref_tick.in'),
    ...fan('fb_cmp.eq', 'fb_mux.sel', 'fb_tick.in'),
    w('ref_mux.out', 'ref_cnt.d'),
    w('fb_mux.out', 'fb_cnt.d'),
    w('post_ff.nq', 'post_ff.d'),
    w('post_ff.q', 'vclk_out.in'),
  ],
});

def('sigma_delta', {
  level: 3,
  name: 'ΣΔ MODULÁTOR — 1. řádu',
  subtitle: 'Akumulátor += vzorek, přenos = výstupní bit: hustota jedniček = vzorek / 256. AD1845 používá ΣΔ převodníky vyššího řádu s decimací/interpolací; 1. řád a takt 3,072 MHz jsou model. Analogový filtr nesimulován.',
  components: [
    clock('mod_clk', 'TAKT MODULÁTORU 3,072 MHz', 0, 0, 3.072e6),
    inp('sample', 'VZOREK (8 bit)', 0, 1, 192),
    c('acc', 'REGISTER_8BIT', 'INTEGRÁTOR', 1, 0),
    c('add', 'ADDER_8BIT', 'INTEGRÁTOR + VZOREK', 2, 0),
    c('bit_ff', 'D_FF', 'VÝSTUPNÍ BIT', 3, 0.3),
    probe('bit_probe', '1BIT PROUD', 4, 0.4),
    probe('acc_probe', 'INTEGRÁTOR', 2, 1.3),
  ],
  wires: [
    ...fan('mod_clk.out', 'acc.clk', 'bit_ff.clk'),
    ...fan('acc.q', 'add.a', 'acc_probe.in'),
    w('sample.out', 'add.b'),
    w('add.sum', 'acc.d'),
    w('add.cout', 'bit_ff.d'),
    w('bit_ff.q', 'bit_probe.in'),
  ],
});

// =====================================================================================================
// LEVEL 4 - registers, adders, comparators and memories from flip-flops, full adders and gates
// =====================================================================================================

def('REGISTER_8BIT', {
  level: 4,
  name: '8bitový registr — 8× D-FF',
  subtitle: 'Společný CLK; WE přes MUX zpětnou vazbu (WE = 0 → D-FF dostává svůj vlastní Q). 16/32bitové registry jsou stejné, jen širší.',
  components: [
    cx('clk', 'CLOCK', 'CLK (společný)', 60, 60, { outputs: { out: 0 } }),
    cx('d_in', 'INPUT', 'D[7:0]', 60, 200, { outputs: { out: 0xA5 } }),
    cx('we', 'INPUT', 'WE', 60, 330, { outputs: { out: 1 } }),
    cx('split', 'BUS_SPLITTER', 'D → 8 vodičů', 200, 200),
    ...BITS.flatMap((i) => {
      const x = i < 4 ? 330 : 560;
      const y = 60 + (i % 4) * 112;
      return [cx(`mux${i}`, 'MUX', `WE MUX ${i}`, x, y), cx(`ff${i}`, 'D_FF', `D-FF ${i}`, x + 100, y)];
    }),
    cx('merge', 'BUS_MERGER', '8 vodičů → Q', 780, 200),
    cx('q', 'PROBE', 'Q[7:0]', 780, 330),
  ],
  wires: [
    w('d_in.out', 'split.bus'),
    ...BITS.flatMap((i) => [
      w(`split.b${i}`, `mux${i}.b`),
      w(`ff${i}.q`, `mux${i}.a`),
      w('we.out', `mux${i}.sel`),
      w(`mux${i}.out`, `ff${i}.d`),
      w('clk.out', `ff${i}.clk`),
      w(`ff${i}.q`, `merge.b${i}`),
    ]),
    w('merge.bus', 'q.in'),
  ],
});

def('ADDER_8BIT', {
  level: 4,
  name: '8bitová sčítačka — ripple carry',
  subtitle: '8× úplná sčítačka, přenos postupuje z bitu 0 do bitu 7 (zpoždění roste s šířkou).',
  components: [
    cx('a_in', 'INPUT', 'A[7:0]', 60, 100, { outputs: { out: 0x5A } }),
    cx('b_in', 'INPUT', 'B[7:0]', 60, 300, { outputs: { out: 0x3C } }),
    cx('cin', 'INPUT', 'Cin', 60, 430, { outputs: { out: 0 } }),
    cx('split_a', 'BUS_SPLITTER', 'A → bity', 200, 100),
    cx('split_b', 'BUS_SPLITTER', 'B → bity', 200, 300),
    ...BITS.map((i) => cx(`fa${i}`, 'FULL_ADDER', `FA ${i}`, i < 4 ? 340 : 500, 60 + (i % 4) * 112)),
    cx('merge', 'BUS_MERGER', 'bity → SUM', 660, 200),
    cx('sum', 'PROBE', 'SUM[7:0]', 800, 200),
    cx('cout', 'PROBE', 'Cout', 800, 330),
  ],
  wires: [
    w('a_in.out', 'split_a.bus'),
    w('b_in.out', 'split_b.bus'),
    w('cin.out', 'fa0.cin'),
    ...BITS.flatMap((i) => [
      w(`split_a.b${i}`, `fa${i}.a`),
      w(`split_b.b${i}`, `fa${i}.b`),
      w(`fa${i}.s`, `merge.b${i}`),
      i < 7 ? w(`fa${i}.cout`, `fa${i + 1}.cin`) : w('fa7.cout', 'cout.in'),
    ]),
    w('merge.bus', 'sum.in'),
  ],
});

def('COMPARATOR_8BIT', {
  level: 4,
  name: '8bitový komparátor rovnosti',
  subtitle: 'EQ = AND všech XNOR(Aᵢ, Bᵢ), strom AND hradel. (Výstup LT je zde nerozkreslen – obvody na úrovni 3 používají jen EQ.)',
  components: [
    cx('a_in', 'INPUT', 'A[7:0]', 60, 100, { outputs: { out: 0x5A } }),
    cx('b_in', 'INPUT', 'B[7:0]', 60, 300, { outputs: { out: 0x5A } }),
    cx('split_a', 'BUS_SPLITTER', 'A → bity', 200, 100),
    cx('split_b', 'BUS_SPLITTER', 'B → bity', 200, 300),
    ...BITS.map((i) => cx(`xnor${i}`, 'XNOR', `A${i} ≡ B${i}`, i < 4 ? 330 : 450, 60 + (i % 4) * 112)),
    ...[0, 1, 2, 3].map((j) => cx(`and1_${j}`, 'AND', `≡ ${2 * j},${2 * j + 1}`, 590, 60 + j * 112)),
    cx('and2_0', 'AND', '≡ 0–3', 710, 116),
    cx('and2_1', 'AND', '≡ 4–7', 710, 340),
    cx('and3', 'AND', 'EQ', 820, 228),
    cx('eq', 'PROBE', 'A == B', 820, 360),
  ],
  wires: [
    w('a_in.out', 'split_a.bus'),
    w('b_in.out', 'split_b.bus'),
    ...BITS.flatMap((i) => [w(`split_a.b${i}`, `xnor${i}.a`), w(`split_b.b${i}`, `xnor${i}.b`)]),
    ...[0, 1, 2, 3].flatMap((j) => [w(`xnor${2 * j}.out`, `and1_${j}.a`), w(`xnor${2 * j + 1}.out`, `and1_${j}.b`)]),
    w('and1_0.out', 'and2_0.a'), w('and1_1.out', 'and2_0.b'),
    w('and1_2.out', 'and2_1.a'), w('and1_3.out', 'and2_1.b'),
    w('and2_0.out', 'and3.a'), w('and2_1.out', 'and3.b'),
    w('and3.out', 'eq.in'),
  ],
});

// Words 5, 3, 12, 10: each bit line ORs the word lines of the words that have a 1 there
def('ROM', {
  level: 4,
  name: 'ROM — dekodér + pole (4 slova × 4 bity)',
  subtitle: 'Dekodér adresy aktivuje word line, bit line je OR word line slov s jedničkou (v křemíku NOR matice tranzistorů; zde hradla). Obsah 05h 03h 0Ch 0Ah. Výřez – skutečná ROM má 256+ slov.',
  components: [
    cx('a0', 'INPUT', 'A0', 60, 100, { outputs: { out: 0 } }),
    cx('a1', 'INPUT', 'A1', 60, 300, { outputs: { out: 0 } }),
    cx('n0', 'NOT', 'A0#', 200, 170),
    cx('n1', 'NOT', 'A1#', 200, 370),
    ...[0, 1, 2, 3].map((i) => cx(`wl${i}`, 'AND', `WORD LINE ${i}`, 330, 60 + i * 112)),
    ...[0, 1, 2, 3].map((j) => cx(`bl${j}`, 'OR', `BIT LINE ${j}`, 480, 60 + j * 112)),
    cx('merge', 'BUS_MERGER', 'bity → D', 640, 200),
    cx('dout', 'PROBE', 'D[3:0]', 780, 200),
  ],
  wires: [
    w('a0.out', 'n0.in'), w('a1.out', 'n1.in'),
    ...fan('n1.out', 'wl0.a', 'wl1.a'), ...fan('a1.out', 'wl2.a', 'wl3.a'),
    ...fan('n0.out', 'wl0.b', 'wl2.b'), ...fan('a0.out', 'wl1.b', 'wl3.b'),
    w('wl0.out', 'bl0.a'), w('wl1.out', 'bl0.b'),
    w('wl1.out', 'bl1.a'), w('wl3.out', 'bl1.b'),
    w('wl0.out', 'bl2.a'), w('wl2.out', 'bl2.b'),
    w('wl2.out', 'bl3.a'), w('wl3.out', 'bl3.b'),
    ...[0, 1, 2, 3].map((j) => w(`bl${j}.out`, `merge.b${j}`)),
    w('merge.bus', 'dout.in'),
  ],
});

def('RAM', {
  level: 4,
  name: 'RAM — 2 slova × 1 bit',
  subtitle: 'Dekodér zápisu (WE & adresa) řídí MUX zpětnou vazbu buňky, čtení přes MUX podle adresy. Buňka = D-FF (model; statická RAM v křemíku má 6T buňku). Výřez.',
  components: [
    c('a0', 'INPUT', 'ADRESA A0', 0, 0, { outputs: { out: 0 } }),
    c('din', 'INPUT', 'DATA IN', 0, 1, { outputs: { out: 1 } }),
    c('we', 'INPUT', 'WE', 0, 2, { outputs: { out: 0 } }),
    clock('clk', 'CLK', 0, 3),
    cx('n_a0', 'NOT', 'A0#', 210, 80),
    cx('we0', 'AND', 'ZÁPIS SLOVO 0', 210, 200),
    cx('we1', 'AND', 'ZÁPIS SLOVO 1', 210, 320),
    cx('mux0', 'MUX', 'BUŇKA 0 WE', 360, 150),
    cx('mux1', 'MUX', 'BUŇKA 1 WE', 360, 330),
    cx('cell0', 'D_FF', 'BUŇKA 0', 500, 150),
    cx('cell1', 'D_FF', 'BUŇKA 1', 500, 330),
    cx('rd_mux', 'MUX', 'ČTENÍ', 650, 240),
    cx('dout', 'PROBE', 'DATA OUT', 790, 250),
  ],
  wires: [
    ...fan('a0.out', 'n_a0.in', 'we1.b', 'rd_mux.sel'),
    ...fan('we.out', 'we0.a', 'we1.a'),
    w('n_a0.out', 'we0.b'),
    w('we0.out', 'mux0.sel'), w('we1.out', 'mux1.sel'),
    ...fan('din.out', 'mux0.b', 'mux1.b'),
    ...fan('cell0.q', 'mux0.a', 'rd_mux.a'),
    ...fan('cell1.q', 'mux1.a', 'rd_mux.b'),
    w('mux0.out', 'cell0.d'), w('mux1.out', 'cell1.d'),
    ...fan('clk.out', 'cell0.clk', 'cell1.clk'),
    w('rd_mux.out', 'dout.in'),
  ],
});

// =====================================================================================================
// LEVEL 5 - gate-level cells
// =====================================================================================================

def('FULL_ADDER', {
  level: 5,
  name: 'Úplná sčítačka — hradla',
  subtitle: 'S = A ⊕ B ⊕ Cin, Cout = A·B + Cin·(A ⊕ B): 2× XOR, 2× AND, 1× OR.',
  components: [
    cx('fa_a', 'INPUT', 'A', 60, 100, { outputs: { out: 1 } }),
    cx('fa_b', 'INPUT', 'B', 60, 210, { outputs: { out: 1 } }),
    cx('fa_cin', 'INPUT', 'Cin', 60, 320, { outputs: { out: 0 } }),
    cx('fa_xor1', 'XOR', 'A ⊕ B', 260, 110),
    cx('fa_xor2', 'XOR', 'SUMA', 480, 120),
    cx('fa_and1', 'AND', 'A · B', 260, 220),
    cx('fa_and2', 'AND', 'Cin · (A ⊕ B)', 480, 240),
    cx('fa_or', 'OR', 'PŘENOS', 660, 230),
    cx('probe_sum', 'PROBE', 'S', 820, 120),
    cx('probe_cout', 'PROBE', 'Cout', 820, 230),
  ],
  wires: [
    ...fan('fa_a.out', 'fa_xor1.a', 'fa_and1.a'),
    ...fan('fa_b.out', 'fa_xor1.b', 'fa_and1.b'),
    ...fan('fa_xor1.out', 'fa_xor2.a', 'fa_and2.a'),
    ...fan('fa_cin.out', 'fa_xor2.b', 'fa_and2.b'),
    w('fa_and1.out', 'fa_or.a'),
    w('fa_and2.out', 'fa_or.b'),
    w('fa_xor2.out', 'probe_sum.in'),
    w('fa_or.out', 'probe_cout.in'),
  ],
});

// Two NAND D-latches (master open while CLK = 0, slave while CLK = 1) = positive-edge flip-flop.
// The initial outputs are a consistent state (CLK = 0, D = 0, Q = 0), so the cross-coupled pairs start settled.
def('D_FF', {
  level: 5,
  name: 'D klopný obvod — master–slave z NAND',
  subtitle: 'Dvě D-západky z NAND: master průchozí při CLK = 0, slave při CLK = 1 → Q převezme D na náběžné hraně. (74LS74 používá jiné zapojení se 6 NAND, funkce stejná.)',
  components: [
    c('d_in', 'INPUT', 'D', 0, 0.3, { outputs: { out: 0 } }),
    clock('clk', 'CLK', 0, 2.6),
    c('clk_inv', 'NOT', 'CLK#', 1, 2.6, { outputs: { out: 1 } }),
    c('m_s', 'NAND', 'MASTER S#', 1, 0.3, { outputs: { out: 1 } }),
    c('m_r', 'NAND', 'MASTER R#', 1, 1.3, { outputs: { out: 0 } }),
    c('m_q', 'NAND', 'MASTER Q', 2, 0.3, { outputs: { out: 0 } }),
    c('m_qn', 'NAND', 'MASTER Q#', 2, 1.3, { outputs: { out: 1 } }),
    c('s_s', 'NAND', 'SLAVE S#', 3, 0.3, { outputs: { out: 1 } }),
    c('s_r', 'NAND', 'SLAVE R#', 3, 1.3, { outputs: { out: 1 } }),
    c('q_g', 'NAND', 'Q', 4, 0.3, { outputs: { out: 0 } }),
    c('qn_g', 'NAND', 'Q#', 4, 1.3, { outputs: { out: 1 } }),
    probe('q', 'Q', 5, 0.4),
    probe('qn', 'Q#', 5, 1.4),
  ],
  wires: [
    w('clk.out', 'clk_inv.in'),
    w('d_in.out', 'm_s.a'),
    ...fan('clk_inv.out', 'm_s.b', 'm_r.b'),
    ...fan('m_s.out', 'm_r.a', 'm_q.a'),
    w('m_r.out', 'm_qn.a'),
    w('m_qn.out', 'm_q.b'),
    ...fan('m_q.out', 'm_qn.b', 's_s.a'),
    ...fan('clk.out', 's_s.b', 's_r.b'),
    ...fan('s_s.out', 's_r.a', 'q_g.a'),
    w('s_r.out', 'qn_g.a'),
    w('qn_g.out', 'q_g.b'),
    ...fan('q_g.out', 'qn_g.b', 'q.in'),
    w('qn_g.out', 'qn.in'),
  ],
});

def('XOR', {
  level: 5,
  name: 'XOR — 4× NAND',
  subtitle: 'A ⊕ B = NAND(NAND(A, N), NAND(B, N)), N = NAND(A, B).',
  components: [
    cx('xor_a', 'INPUT', 'A', 80, 120, { outputs: { out: 1 } }),
    cx('xor_b', 'INPUT', 'B', 80, 260, { outputs: { out: 0 } }),
    cx('nand1', 'NAND', 'N = NAND(A,B)', 280, 190),
    cx('nand2', 'NAND', 'NAND(A,N)', 470, 110),
    cx('nand3', 'NAND', 'NAND(B,N)', 470, 270),
    cx('nand4', 'NAND', 'VÝSTUP', 660, 190),
    cx('xor_out', 'PROBE', 'A ⊕ B', 820, 193),
  ],
  wires: [
    ...fan('xor_a.out', 'nand1.a', 'nand2.a'),
    ...fan('xor_b.out', 'nand1.b', 'nand3.b'),
    ...fan('nand1.out', 'nand2.b', 'nand3.a'),
    w('nand2.out', 'nand4.a'),
    w('nand3.out', 'nand4.b'),
    w('nand4.out', 'xor_out.in'),
  ],
});

def('XNOR', {
  level: 5,
  name: 'XNOR — 4× NOR',
  subtitle: 'Duál XOR ze 4 NAND: A ≡ B = NOR(NOR(A, N), NOR(B, N)), N = NOR(A, B).',
  components: [
    cx('xn_a', 'INPUT', 'A', 80, 120, { outputs: { out: 1 } }),
    cx('xn_b', 'INPUT', 'B', 80, 260, { outputs: { out: 1 } }),
    cx('nor1', 'NOR', 'N = NOR(A,B)', 280, 190),
    cx('nor2', 'NOR', 'NOR(A,N)', 470, 110),
    cx('nor3', 'NOR', 'NOR(B,N)', 470, 270),
    cx('nor4', 'NOR', 'VÝSTUP', 660, 190),
    cx('xnor_out', 'PROBE', 'A ≡ B', 820, 193),
  ],
  wires: [
    ...fan('xn_a.out', 'nor1.a', 'nor2.a'),
    ...fan('xn_b.out', 'nor1.b', 'nor3.b'),
    ...fan('nor1.out', 'nor2.b', 'nor3.a'),
    w('nor2.out', 'nor4.a'),
    w('nor3.out', 'nor4.b'),
    w('nor4.out', 'xnor_out.in'),
  ],
});

def('AND', {
  level: 5,
  name: 'AND — NAND + invertor',
  subtitle: 'V CMOS je přirozené hradlo NAND (4 tranzistory); AND = NAND + invertor (6 tranzistorů).',
  components: [
    cx('and_a', 'INPUT', 'A', 80, 120, { outputs: { out: 1 } }),
    cx('and_b', 'INPUT', 'B', 80, 240, { outputs: { out: 1 } }),
    cx('stage_nand', 'NAND', 'NAND', 320, 180),
    cx('stage_not', 'NOT', 'INVERTOR', 520, 186),
    cx('and_out', 'PROBE', 'A · B', 720, 183),
  ],
  wires: [
    w('and_a.out', 'stage_nand.a'),
    w('and_b.out', 'stage_nand.b'),
    w('stage_nand.out', 'stage_not.in'),
    w('stage_not.out', 'and_out.in'),
  ],
});

def('OR', {
  level: 5,
  name: 'OR — NOR + invertor',
  subtitle: 'OR = NOR (4 tranzistory) + invertor (2 tranzistory).',
  components: [
    cx('or_a', 'INPUT', 'A', 80, 120, { outputs: { out: 0 } }),
    cx('or_b', 'INPUT', 'B', 80, 240, { outputs: { out: 1 } }),
    cx('stage_nor', 'NOR', 'NOR', 320, 180),
    cx('stage_not', 'NOT', 'INVERTOR', 520, 186),
    cx('or_out', 'PROBE', 'A + B', 720, 183),
  ],
  wires: [
    w('or_a.out', 'stage_nor.a'),
    w('or_b.out', 'stage_nor.b'),
    w('stage_nor.out', 'stage_not.in'),
    w('stage_not.out', 'or_out.in'),
  ],
});

def('MUX', {
  level: 5,
  name: 'MUX 2:1 — 3× NAND + invertor',
  subtitle: 'Y = NAND(NAND(A, S#), NAND(B, S)): S = 0 → A, S = 1 → B.',
  components: [
    c('mux_a', 'INPUT', 'A (S = 0)', 0, 0, { outputs: { out: 1 } }),
    c('mux_b', 'INPUT', 'B (S = 1)', 0, 1.5, { outputs: { out: 0 } }),
    c('mux_sel', 'INPUT', 'S', 0, 3, { outputs: { out: 0 } }),
    c('s_inv', 'NOT', 'S#', 1, 3),
    c('n_a', 'NAND', 'A · S#', 2, 0.5),
    c('n_b', 'NAND', 'B · S', 2, 2),
    c('n_y', 'NAND', 'VÝSTUP', 3, 1.2),
    probe('mux_out', 'Y', 4, 1.25),
  ],
  wires: [
    ...fan('mux_sel.out', 's_inv.in', 'n_b.b'),
    w('mux_a.out', 'n_a.a'),
    w('s_inv.out', 'n_a.b'),
    w('mux_b.out', 'n_b.a'),
    w('n_a.out', 'n_y.a'),
    w('n_b.out', 'n_y.b'),
    w('n_y.out', 'mux_out.in'),
  ],
});

// =====================================================================================================
// LEVEL 6 - CMOS gates from PMOS/NMOS switches (no gates)
// =====================================================================================================

def('NAND', {
  level: 6,
  name: 'CMOS NAND — 4 tranzistory',
  subtitle: '2× PMOS paralelně k VDD, 2× NMOS v sérii ke GND. Výstup 0 jen když vedou oba NMOS (A = B = 1).',
  components: [
    c('in_cmos_a', 'INPUT', 'A', 0, 1, { outputs: { out: 1 } }),
    c('in_cmos_b', 'INPUT', 'B', 0, 2.5, { outputs: { out: 1 } }),
    c('vdd', 'VDD', 'VDD', 2, 0),
    c('pmos_1', 'PMOS', 'PMOS A', 2, 0.8),
    c('pmos_2', 'PMOS', 'PMOS B', 3, 0.8),
    c('nmos_1', 'NMOS', 'NMOS A', 3, 2),
    c('nmos_2', 'NMOS', 'NMOS B', 3, 3),
    c('gnd', 'GND', 'GND', 4, 3.3),
    probe('out_node', 'Y = NAND(A,B)', 4, 1.6),
  ],
  wires: [
    ...fan('vdd.out', 'pmos_1.s', 'pmos_2.s'),
    ...fan('in_cmos_a.out', 'pmos_1.g', 'nmos_1.g'),
    ...fan('in_cmos_b.out', 'pmos_2.g', 'nmos_2.g'),
    w('pmos_1.d', 'out_node.in'),
    w('pmos_2.d', 'out_node.in'),
    w('nmos_1.d', 'out_node.in'),
    w('nmos_1.s', 'nmos_2.d'),
    w('gnd.out', 'nmos_2.s'),
  ],
});

def('NOR', {
  level: 6,
  name: 'CMOS NOR — 4 tranzistory',
  subtitle: '2× PMOS v sérii k VDD, 2× NMOS paralelně ke GND. Výstup 1 jen když vedou oba PMOS (A = B = 0).',
  components: [
    c('nor_a', 'INPUT', 'A', 0, 1, { outputs: { out: 0 } }),
    c('nor_b', 'INPUT', 'B', 0, 2.5, { outputs: { out: 0 } }),
    c('vdd', 'VDD', 'VDD', 2, 0),
    c('pmos_a', 'PMOS', 'PMOS A', 2, 0.8),
    c('pmos_b', 'PMOS', 'PMOS B', 2, 2),
    c('nmos_a', 'NMOS', 'NMOS A', 3, 3),
    c('nmos_b', 'NMOS', 'NMOS B', 4, 3),
    c('gnd', 'GND', 'GND', 5, 3.3),
    probe('nor_out', 'Y = NOR(A,B)', 4, 1.6),
  ],
  wires: [
    w('vdd.out', 'pmos_a.s'),
    ...fan('nor_a.out', 'pmos_a.g', 'nmos_a.g'),
    ...fan('nor_b.out', 'pmos_b.g', 'nmos_b.g'),
    w('pmos_a.d', 'pmos_b.s'),
    w('pmos_b.d', 'nor_out.in'),
    w('nmos_a.d', 'nor_out.in'),
    w('nmos_b.d', 'nor_out.in'),
    ...fan('gnd.out', 'nmos_a.s', 'nmos_b.s'),
  ],
});

def('NOT', {
  level: 6,
  name: 'CMOS invertor — 2 tranzistory',
  subtitle: 'PMOS k VDD + NMOS ke GND, společné hradlo i drain. Vždy vede právě jeden.',
  components: [
    c('not_in', 'INPUT', 'A', 0, 1.5, { outputs: { out: 1 } }),
    c('vdd', 'VDD', 'VDD', 1, 0.3),
    c('pmos_inv', 'PMOS', 'PMOS', 2, 0.8),
    c('nmos_inv', 'NMOS', 'NMOS', 2, 2.4),
    c('gnd', 'GND', 'GND', 1, 3.3),
    probe('not_out', 'Y = NOT A', 3, 1.6),
  ],
  wires: [
    w('vdd.out', 'pmos_inv.s'),
    w('gnd.out', 'nmos_inv.s'),
    ...fan('not_in.out', 'pmos_inv.g', 'nmos_inv.g'),
    w('pmos_inv.d', 'not_out.in'),
    w('nmos_inv.d', 'not_out.in'),
  ],
});

// Clocked inverter stack VDD-PMOS A#-PMOS EN#-out-NMOS EN-NMOS A#-GND fed by an inverted input -> non-inverting
// buffer. The enable transistors sit next to the output, so a disabled output never shares charge with the stack.
def('TRI_STATE_BUFFER', {
  level: 6,
  name: 'CMOS budič se třetím stavem — 8 tranzistorů',
  subtitle: 'Stoh 4 tranzistorů (A# / EN# / EN / A#) + invertor EN + invertor dat (aby budič neinvertoval). EN = 0: tranzistory u výstupu nevedou → výstup plave (drží náboj).',
  components: [
    c('ts_in', 'INPUT', 'A', 0, 0.5, { outputs: { out: 1 } }),
    c('ts_en', 'INPUT', 'EN', 0, 2.5, { outputs: { out: 1 } }),
    c('vdd', 'VDD', 'VDD', 1, 0),
    c('pmos_ia', 'PMOS', 'INV A: PMOS', 1, 0.6),
    c('nmos_ia', 'NMOS', 'INV A: NMOS', 1, 1.8),
    c('gnd', 'GND', 'GND', 1, 3.3),
    c('pmos_ie', 'PMOS', 'INV EN: PMOS', 2, 0.6),
    c('nmos_ie', 'NMOS', 'INV EN: NMOS', 2, 1.8),
    c('pmos_d', 'PMOS', 'PMOS A#', 3, 0),
    c('pmos_en', 'PMOS', 'PMOS EN#', 3, 1),
    c('nmos_en', 'NMOS', 'NMOS EN', 3, 2),
    c('nmos_d', 'NMOS', 'NMOS A#', 3, 3),
    probe('ts_out', 'Y (0 / 1 / Z)', 4, 1.5),
  ],
  wires: [
    ...fan('vdd.out', 'pmos_ia.s', 'pmos_ie.s', 'pmos_d.s'),
    ...fan('gnd.out', 'nmos_ia.s', 'nmos_ie.s', 'nmos_d.s'),
    ...fan('ts_in.out', 'pmos_ia.g', 'nmos_ia.g'),
    w('pmos_ia.d', 'nmos_ia.d'),
    ...fan('ts_en.out', 'pmos_ie.g', 'nmos_ie.g', 'nmos_en.g'),
    w('pmos_ie.d', 'nmos_ie.d'),
    w('pmos_ie.d', 'pmos_en.g'),
    ...fan('pmos_ia.d', 'pmos_d.g', 'nmos_d.g'),
    w('pmos_d.d', 'pmos_en.s'),
    w('pmos_en.d', 'ts_out.in'),
    w('nmos_en.d', 'ts_out.in'),
    w('nmos_en.s', 'nmos_d.d'),
  ],
});

def('XOR_cmos', {
  level: 6,
  name: 'CMOS XOR — 12 tranzistorů',
  subtitle: 'Komplementární statický XOR: invertory A#, B#; pull-up (A·B#)+(A#·B) z PMOS, pull-down (A·B)+(A#·B#) z NMOS.',
  components: [
    c('in_a', 'INPUT', 'A', 0, 1, { outputs: { out: 1 } }),
    c('in_b', 'INPUT', 'B', 0, 2.4, { outputs: { out: 0 } }),
    c('vdd', 'VDD', 'VDD', 1, 0),
    c('gnd', 'GND', 'GND', 1, 3.4),
    c('pmos_ia', 'PMOS', 'INV A: PMOS', 1, 0.8),
    c('nmos_ia', 'NMOS', 'INV A: NMOS', 1, 2.2),
    c('pmos_ib', 'PMOS', 'INV B: PMOS', 2, 0.8),
    c('nmos_ib', 'NMOS', 'INV B: NMOS', 2, 2.2),
    c('pmos_u1', 'PMOS', 'PU: A#', 3, 0),
    c('pmos_u2', 'PMOS', 'PU: B', 3, 1),
    c('pmos_u3', 'PMOS', 'PU: A', 4, 0),
    c('pmos_u4', 'PMOS', 'PU: B#', 4, 1),
    c('nmos_d1', 'NMOS', 'PD: A', 3, 2),
    c('nmos_d2', 'NMOS', 'PD: B', 3, 3),
    c('nmos_d3', 'NMOS', 'PD: A#', 4, 2),
    c('nmos_d4', 'NMOS', 'PD: B#', 4, 3),
    probe('xor_out', 'Y = A ⊕ B', 5, 1.6),
  ],
  wires: [
    ...fan('vdd.out', 'pmos_ia.s', 'pmos_ib.s', 'pmos_u1.s', 'pmos_u3.s'),
    ...fan('gnd.out', 'nmos_ia.s', 'nmos_ib.s', 'nmos_d2.s', 'nmos_d4.s'),
    ...fan('in_a.out', 'pmos_ia.g', 'nmos_ia.g', 'pmos_u3.g', 'nmos_d1.g'),
    ...fan('in_b.out', 'pmos_ib.g', 'nmos_ib.g', 'pmos_u2.g', 'nmos_d2.g'),
    w('pmos_ia.d', 'nmos_ia.d'),
    w('pmos_ib.d', 'nmos_ib.d'),
    ...fan('pmos_ia.d', 'pmos_u1.g', 'nmos_d3.g'),
    ...fan('pmos_ib.d', 'pmos_u4.g', 'nmos_d4.g'),
    w('pmos_u1.d', 'pmos_u2.s'),
    w('pmos_u3.d', 'pmos_u4.s'),
    w('nmos_d1.s', 'nmos_d2.d'),
    w('nmos_d3.s', 'nmos_d4.d'),
    ...['pmos_u2.d', 'pmos_u4.d', 'nmos_d1.d', 'nmos_d3.d'].map((p) => w(p, 'xor_out.in')),
  ],
});

const cmosAndOr = (isAnd) => ({
  level: 6,
  name: isAnd ? 'CMOS AND — 6 tranzistorů' : 'CMOS OR — 6 tranzistorů',
  subtitle: isAnd ? 'NAND (2× PMOS paralelně, 2× NMOS sériově) + invertor.' : 'NOR (2× PMOS sériově, 2× NMOS paralelně) + invertor.',
  components: [
    c('in_a', 'INPUT', 'A', 0, 1, { outputs: { out: 1 } }),
    c('in_b', 'INPUT', 'B', 0, 2.4, { outputs: { out: isAnd ? 1 : 0 } }),
    c('vdd', 'VDD', 'VDD', 1, 0),
    c('pmos_1', 'PMOS', 'PMOS A', 1, 0.8),
    c('pmos_2', 'PMOS', 'PMOS B', 2, 0.8),
    c('nmos_1', 'NMOS', 'NMOS A', 2, 2),
    c('nmos_2', 'NMOS', 'NMOS B', isAnd ? 2 : 3, isAnd ? 3 : 2),
    c('pmos_inv', 'PMOS', 'INV: PMOS', 4, 0.8),
    c('nmos_inv', 'NMOS', 'INV: NMOS', 4, 2),
    c('gnd', 'GND', 'GND', 4, 3.3),
    probe('gate_out', isAnd ? 'Y = A · B' : 'Y = A + B', 5, 1.4),
  ],
  wires: [
    ...fan('in_a.out', 'pmos_1.g', 'nmos_1.g'),
    ...fan('in_b.out', 'pmos_2.g', 'nmos_2.g'),
    ...fan('vdd.out', 'pmos_1.s', 'pmos_inv.s', ...(isAnd ? ['pmos_2.s'] : [])),
    ...(isAnd
      ? [w('pmos_2.d', 'pmos_1.d'), w('nmos_1.d', 'pmos_1.d'), w('nmos_1.s', 'nmos_2.d'), ...fan('gnd.out', 'nmos_2.s', 'nmos_inv.s')]
      : [w('pmos_1.d', 'pmos_2.s'), w('nmos_1.d', 'pmos_2.d'), w('nmos_2.d', 'pmos_2.d'), ...fan('gnd.out', 'nmos_1.s', 'nmos_2.s', 'nmos_inv.s')]),
    ...fan(isAnd ? 'pmos_1.d' : 'pmos_2.d', 'pmos_inv.g', 'nmos_inv.g'),
    w('pmos_inv.d', 'gate_out.in'),
    w('nmos_inv.d', 'gate_out.in'),
  ],
});
def('AND_cmos', cmosAndOr(true));
def('OR_cmos', cmosAndOr(false));

// =====================================================================================================
// LEVEL 7 - one MOSFET in a circuit + the 0.5 µm process cross-section (LAYER parts are descriptive)
// =====================================================================================================

const mosfet = (n) => ({
  level: 7,
  name: n ? 'NMOS tranzistor — 0,5 µm CMOS' : 'PMOS tranzistor — 0,5 µm CMOS',
  subtitle: n
    ? 'Hradlo 1 → kanál elektronů spojí drain se source (GND). Hradlo 0 → drain plave (Z), po vypnutí drží náboj. Vrstvy procesu jsou popisné, údaje přibližné.'
    : 'Hradlo 0 → kanál děr spojí drain se source (VDD). Hradlo 1 → drain plave (Z), po vypnutí drží náboj. Vrstvy procesu jsou popisné, údaje přibližné.',
  components: [
    c('gate_voltage', 'INPUT', 'HRADLO (G)', 0, 1, { outputs: { out: n ? 0 : 1 } }),
    c(n ? 'source_gnd' : 'source_vdd', n ? 'GND' : 'VDD', n ? 'SOURCE = GND' : 'SOURCE = VDD', 1, 2.6),
    c(n ? 'nmos_m1' : 'pmos_m1', n ? 'NMOS' : 'PMOS', n ? 'NMOS (W/L model)' : 'PMOS (W/L model)', 2, 1.3, { drill: 'sio2_lattice' }),
    probe('drain_current', 'DRAIN (vede / Z)', 3, 1.3),
    c('gate_oxide', 'LAYER', 'HRADLOVÝ OXID SiO₂ ≈ 10 nm', 4, 0, { drill: 'sio2_lattice' }),
    c('poly_gate', 'LAYER', 'HRADLO: POLY-Si N+, L ≈ 0,5 µm', 4, 1),
    c('ldd_spacers', 'LAYER', 'LDD + OXIDOVÉ SPACERY', 4, 2),
    c('sd_diffusion', 'LAYER', n ? 'S/D: DIFUZE N+' : 'S/D: DIFUZE P+', 4, 3),
    c(n ? 'bulk_psub' : 'bulk_nwell', 'LAYER', n ? 'BULK: P-SUBSTRÁT (→ GND)' : 'BULK: N-WELL (→ VDD)', 5, 0.5),
    c('locos_isolation', 'LAYER', 'LOCOS – POLNÍ OXID', 5, 1.5),
    c('metal_stack', 'LAYER', '3× Al + W KONTAKTY (model)', 5, 2.5),
  ],
  wires: [
    w('gate_voltage.out', `${n ? 'nmos' : 'pmos'}_m1.g`),
    w(`${n ? 'source_gnd' : 'source_vdd'}.out`, `${n ? 'nmos' : 'pmos'}_m1.s`),
    w(`${n ? 'nmos' : 'pmos'}_m1.d`, 'drain_current.in'),
  ],
});
def('nmos_transistor', mosfet(true));
def('pmos_transistor', mosfet(false));

// =====================================================================================================
// LEVEL 8 - atoms (terminal)
// =====================================================================================================

def('sio2_lattice', {
  level: 8,
  name: 'Rozhraní Si / SiO₂ — atomy',
  subtitle: 'Krystal Si: diamantová mřížka a = 5,431 Å, vazba Si–Si 2,35 Å. Amorfní SiO₂: tetraedry SiO₄, Si–O 1,61 Å. Při ~10 nm oxidu (≈ 20 mřížkových konstant Si) je přímé tunelování zanedbatelné.',
  components: [
    c('si_atom', 'ATOM', 'Si – KRYSTAL, a = 5,431 Å, Si–Si 2,35 Å', 0, 1),
    c('o_atom', 'ATOM', 'O – MŮSTKOVÝ KYSLÍK V SiO₂', 2, 0),
    c('si_o_bond', 'ATOM', 'TETRAEDR SiO₄: Si–O 1,61 Å, Si–O–Si ≈ 144°', 2, 2),
    c('interface_barrier', 'ATOM', 'BARIÉRA Si/SiO₂ ≈ 3,1 eV; Eg SiO₂ ≈ 9 eV, Si 1,12 eV', 4, 1),
    c('tunnel_leak', 'ATOM', 'TUNELOVÁNÍ: ZANEDBATELNÉ (oxid ~10 nm)', 4, 2.5),
  ],
  wires: [],
});

// ---- aliases -----------------------------------------------------------------------------------------
H.NV1_CORE = H.nv1_die;
H.RAMDAC_STG1764 = H.stg1764_inside;
H.DRAM_256K16 = H.dram_inside;
H.AD1845 = H.ad1845_inside;
H.EPROM_27C256 = H.eprom_inside;
H.REGISTER_16BIT = H.REGISTER_8BIT; // same structure, wider
H.REGISTER_32BIT = H.REGISTER_8BIT;
H.NMOS = H.nmos_transistor;
H.PMOS = H.pmos_transistor;
H.nand_center = H.NAND; // used by components/Nv1DiagnosticModal.jsx
H.adder_pipe = H.FULL_ADDER; // used by components/Nv1DiagnosticModal.jsx

// Parts with nothing (simulable) inside: I/O, sources, wiring, connectors, off-board equipment, layers, atoms
export const TERMINAL_TYPES = new Set([
  'INPUT', 'OUTPUT', 'PROBE', 'CONSTANT', 'CLOCK', 'VDD', 'GND', 'LAYER', 'ATOM', 'TUNNEL_IN', 'TUNNEL_OUT',
  'BUS_SPLITTER', 'BUS_MERGER', 'VIRTUAL_SCREEN', 'SEVEN_SEGMENT',
  'CRYSTAL', 'PCI_EDGE', 'VGA_DB15', 'GAME_PORT', 'AUDIO_JACK', 'PCI_HOST', 'VGA_MONITOR', 'AUDIO_SPEAKERS', 'SATURN_PAD',
]);

/** Level of the deepest (current) hierarchy entry. */
export function currentLevelOf(stack) {
  if (!Array.isArray(stack) || stack.length === 0) return 1;
  const top = stack[stack.length - 1];
  return top.level || stack.length;
}

/**
 * Finds the internal subcircuit for a component.
 * Lookup order: explicit `drill` key → component id → component type → `<type>_cmos` (transistor level of a gate
 * that already sits on the gate level). A candidate is accepted only if it is strictly deeper than the current
 * level and is not an ancestor on the stack, so drilling is monotonic and can never cycle.
 *
 * @param {object} comp - Component being clicked
 * @param {Array} currentStack - Active hierarchy stack ({ id, key?, title, level })
 * @returns {object|null} Next subcircuit, or null if terminal
 */
export function findSubcircuit(comp, currentStack = null) {
  if (!comp) return null;
  const currentLevel = currentLevelOf(currentStack);
  if (currentLevel >= 8) return null; // atoms: physical limit

  const ancestors = new Set((currentStack || []).map((e) => e.key).filter(Boolean));
  const keys = [comp.drill];
  if (!TERMINAL_TYPES.has(comp.type)) keys.push(comp.id, comp.type, `${comp.type}_cmos`);

  for (const key of keys) {
    const sub = key && Object.hasOwn(H, key) ? H[key] : null;
    if (!sub || sub.level <= currentLevel || ancestors.has(sub.key)) continue;
    return sub;
  }
  return null;
}
