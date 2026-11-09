// SILICON // LOGIC STUDIO - HIERARCHICAL DRILL-DOWN SUBCIRCUITS
// Deep multi-level schematic inspection from complete boards down to individual silicon atoms.

export const HIERARCHICAL_SUBCIRCUITS = {
  // =========================================================================
  // LEVEL 2: INSIDE NVIDIA NV1 / SGS-THOMSON STG-2000X PROCESSOR
  // =========================================================================
  nv1_core: {
    name: 'STG2000X / NVIDIA NV1 SILICON DIE MICRO-ARCHITECTURE',
    subtitle: '0.5µm 3-Metal CMOS Monolithic Silicon Die (1,000,000 Transistors)',
    components: [
      { id: 'pci_dma', type: 'PCI_BUS', label: 'PCI 2.1 HOST DMA & FIFO (33M)', x: 70, y: 150, inputs: { clk: 1 }, outputs: { pci_data: 0x12D2, pci_frame: 0 } },
      { id: 'qtm_3d', type: 'NV1_CORE', label: '3D QUADRATIC ENGINE (QTM)', x: 330, y: 70, inputs: { pci_clk: 1, pci_data: 1, saturn_in: 0 }, outputs: { vram_addr: 0x1000, vram_data: 0x80, pixel_clk: 1, rgb_data: 0x1F, audio_sample: 128, status: 1 } },
      { id: 'bitblt_2d', type: 'REGISTER_8BIT', label: '2D GUI & BitBLT ACCELERATOR', x: 330, y: 260, inputs: { d: 0xFF, clk: 1, we: 1 }, outputs: { q: 0xAA } },
      { id: 'vram_ctrl', type: 'VRAM_BANK', label: '64-BIT MEMORY ARBITER (60M)', x: 620, y: 90, inputs: { addr: 0x1000, din: 0x80, we: 1 }, outputs: { dout: 0x48 } },
      { id: 'ramdac_core', type: 'RAMDAC', label: '135MHz TrueColor RAMDAC CORE', x: 620, y: 250, inputs: { pixel_clk: 1, rgb_in: 0x1F }, outputs: { vga_rgb: 0xFF, hsync: 1, vsync: 1 } },
      { id: 'pll_clk', type: 'CLOCK', label: '60MHz CORE PLL MULTIPLIER', x: 70, y: 320, inputs: {}, outputs: { out: 1 } },
      { id: 'audio_core', type: 'AUDIO_DSP', label: '32-VOICE AUDIO SYNTHESIZER', x: 260, y: 400, inputs: { clk: 1, synth_en: 1 }, outputs: { audio_l: 140, audio_r: 120 } },
      { id: 'saturn_io', type: 'SATURN_PAD', label: 'SEGA SATURN CONTROLLER MATRIX', x: 550, y: 400, inputs: {}, outputs: { dpad: 1, btn_a: 1, btn_b: 0 } },
      { id: 'probe_qtm', type: 'PROBE', label: 'QTM 3D STATUS', x: 860, y: 90, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_rgb', type: 'PROBE', label: 'ANALOG RGB STREAM', x: 860, y: 250, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'screen_mini', type: 'VIRTUAL_SCREEN', label: 'QTM RASTER MONITOR', x: 860, y: 380, inputs: { x: 0, y: 0, color: 0x1F, we: 1, clk: 1 }, outputs: {} },
    ],
    wires: [
      { from: { id: 'pci_dma', pin: 'pci_data' }, to: { id: 'qtm_3d', pin: 'pci_data' } },
      { from: { id: 'pci_dma', pin: 'pci_data' }, to: { id: 'bitblt_2d', pin: 'd' } },
      { from: { id: 'pll_clk', pin: 'out' }, to: { id: 'qtm_3d', pin: 'pci_clk' } },
      { from: { id: 'pll_clk', pin: 'out' }, to: { id: 'vram_ctrl', pin: 'din' } },
      { from: { id: 'qtm_3d', pin: 'vram_addr' }, to: { id: 'vram_ctrl', pin: 'addr' } },
      { from: { id: 'qtm_3d', pin: 'pixel_clk' }, to: { id: 'ramdac_core', pin: 'pixel_clk' } },
      { from: { id: 'qtm_3d', pin: 'rgb_data' }, to: { id: 'ramdac_core', pin: 'rgb_in' } },
      { from: { id: 'qtm_3d', pin: 'status' }, to: { id: 'probe_qtm', pin: 'in' } },
      { from: { id: 'ramdac_core', pin: 'vga_rgb' }, to: { id: 'probe_rgb', pin: 'in' } },
      { from: { id: 'ramdac_core', pin: 'vga_rgb' }, to: { id: 'screen_mini', pin: 'color' } },
      { from: { id: 'pll_clk', pin: 'out' }, to: { id: 'screen_mini', pin: 'clk' } },
    ]
  },

  // =========================================================================
  // LEVEL 3: INSIDE 3D QUADRATIC ENGINE (QTM) / ARITHMETIC PIPELINE
  // =========================================================================
  qtm_3d: {
    name: '3D QUADRATIC FORWARD-DIFFERENCING PIPELINE',
    subtitle: 'Evaluation of X(u,v) = A u² + B uv + C v² + D u + E v + F (Curved Surfaces)',
    components: [
      { id: 'in_u', type: 'INPUT', label: 'PARAM U [15:0]', x: 60, y: 110, inputs: {}, outputs: { out: 1 } },
      { id: 'in_v', type: 'INPUT', label: 'PARAM V [15:0]', x: 60, y: 240, inputs: {}, outputs: { out: 1 } },
      { id: 'fwd_diff_u', type: 'REGISTER_8BIT', label: 'Δ²U ACCUMULATOR', x: 260, y: 100, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'fwd_diff_v', type: 'REGISTER_8BIT', label: 'Δ²V ACCUMULATOR', x: 260, y: 230, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'adder_pipe', type: 'AND', label: '4-BIT PIPELINE ADDER', x: 480, y: 110, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'z_buf_cmp', type: 'XOR', label: 'Z-BUFFER COMPARATOR', x: 480, y: 240, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'tex_sampler', type: 'MUX', label: 'BILINEAR TEX FILTER', x: 680, y: 160, inputs: { a: 1, b: 1, sel: 0 }, outputs: { out: 1 } },
      { id: 'out_frag', type: 'PROBE', label: 'PIXEL FRAGMENT', x: 880, y: 160, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'out_z', type: 'PROBE', label: 'Z-DEPTH TEST', x: 880, y: 260, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'in_u', pin: 'out' }, to: { id: 'fwd_diff_u', pin: 'd' } },
      { from: { id: 'in_v', pin: 'out' }, to: { id: 'fwd_diff_v', pin: 'd' } },
      { from: { id: 'fwd_diff_u', pin: 'q' }, to: { id: 'adder_pipe', pin: 'a' } },
      { from: { id: 'fwd_diff_v', pin: 'q' }, to: { id: 'adder_pipe', pin: 'b' } },
      { from: { id: 'fwd_diff_u', pin: 'q' }, to: { id: 'z_buf_cmp', pin: 'a' } },
      { from: { id: 'adder_pipe', pin: 'out' }, to: { id: 'tex_sampler', pin: 'a' } },
      { from: { id: 'z_buf_cmp', pin: 'out' }, to: { id: 'tex_sampler', pin: 'sel' } },
      { from: { id: 'tex_sampler', pin: 'out' }, to: { id: 'out_frag', pin: 'in' } },
      { from: { id: 'z_buf_cmp', pin: 'out' }, to: { id: 'out_z', pin: 'in' } },
    ]
  },

  // =========================================================================
  // LEVEL 4: INSIDE FULL ADDER (OR ARITHMETIC UNIT)
  // =========================================================================
  adder_pipe: {
    name: '1-BIT FULL ADDER GATE-LEVEL SCHEMATIC',
    subtitle: 'Sum = A ⊕ B ⊕ Cin  |  Cout = (A · B) + (Cin · (A ⊕ B))',
    components: [
      { id: 'fa_a', type: 'INPUT', label: 'OPERAND A', x: 60, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'fa_b', type: 'INPUT', label: 'OPERAND B', x: 60, y: 210, inputs: {}, outputs: { out: 1 } },
      { id: 'fa_cin', type: 'INPUT', label: 'CARRY IN (Cin)', x: 60, y: 320, inputs: {}, outputs: { out: 0 } },
      { id: 'fa_xor1', type: 'XOR', label: 'XOR GATE 1 (A ⊕ B)', x: 260, y: 110, inputs: { a: 1, b: 1 }, outputs: { out: 0 } },
      { id: 'fa_xor2', type: 'XOR', label: 'XOR GATE 2 (SUM)', x: 480, y: 120, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa_and1', type: 'AND', label: 'AND GATE 1 (A · B)', x: 260, y: 220, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'fa_and2', type: 'AND', label: 'AND GATE 2 (Cin · P)', x: 480, y: 240, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa_or', type: 'OR', label: 'OR GATE (CARRY OUT)', x: 680, y: 230, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'probe_sum', type: 'PROBE', label: 'SUM OUTPUT', x: 860, y: 120, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'probe_cout', type: 'PROBE', label: 'CARRY OUT', x: 860, y: 230, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'fa_a', pin: 'out' }, to: { id: 'fa_xor1', pin: 'a' } },
      { from: { id: 'fa_b', pin: 'out' }, to: { id: 'fa_xor1', pin: 'b' } },
      { from: { id: 'fa_a', pin: 'out' }, to: { id: 'fa_and1', pin: 'a' } },
      { from: { id: 'fa_b', pin: 'out' }, to: { id: 'fa_and1', pin: 'b' } },
      { from: { id: 'fa_xor1', pin: 'out' }, to: { id: 'fa_xor2', pin: 'a' } },
      { from: { id: 'fa_cin', pin: 'out' }, to: { id: 'fa_xor2', pin: 'b' } },
      { from: { id: 'fa_xor1', pin: 'out' }, to: { id: 'fa_and2', pin: 'a' } },
      { from: { id: 'fa_cin', pin: 'out' }, to: { id: 'fa_and2', pin: 'b' } },
      { from: { id: 'fa_and1', pin: 'out' }, to: { id: 'fa_or', pin: 'a' } },
      { from: { id: 'fa_and2', pin: 'out' }, to: { id: 'fa_or', pin: 'b' } },
      { from: { id: 'fa_xor2', pin: 'out' }, to: { id: 'probe_sum', pin: 'in' } },
      { from: { id: 'fa_or', pin: 'out' }, to: { id: 'probe_cout', pin: 'in' } },
    ]
  },

  // =========================================================================
  // LEVEL 5: INSIDE XOR GATE (4-NAND LOGIC GATE SCHEMATIC)
  // =========================================================================
  fa_xor1: {
    name: 'XOR GATE INTERNAL 4-NAND EQUIVALENT SCHEMATIC',
    subtitle: 'A ⊕ B = NAND( NAND(A, NAND(A,B)), NAND(B, NAND(A,B)) )',
    components: [
      { id: 'xor_in_a', type: 'INPUT', label: 'INPUT A', x: 60, y: 110, inputs: {}, outputs: { out: 1 } },
      { id: 'xor_in_b', type: 'INPUT', label: 'INPUT B', x: 60, y: 250, inputs: {}, outputs: { out: 0 } },
      { id: 'nand_center', type: 'NAND', label: 'NAND 1 (COMMON)', x: 260, y: 180, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'nand_top', type: 'NAND', label: 'NAND 2 (UPPER)', x: 470, y: 100, inputs: { a: 1, b: 1 }, outputs: { out: 0 } },
      { id: 'nand_bot', type: 'NAND', label: 'NAND 3 (LOWER)', x: 470, y: 260, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'nand_out', type: 'NAND', label: 'NAND 4 (FINAL)', x: 680, y: 180, inputs: { a: 0, b: 1 }, outputs: { out: 1 } },
      { id: 'probe_xor', type: 'PROBE', label: 'XOR OUTPUT Y', x: 860, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'xor_in_a', pin: 'out' }, to: { id: 'nand_center', pin: 'a' } },
      { from: { id: 'xor_in_b', pin: 'out' }, to: { id: 'nand_center', pin: 'b' } },
      { from: { id: 'xor_in_a', pin: 'out' }, to: { id: 'nand_top', pin: 'a' } },
      { from: { id: 'nand_center', pin: 'out' }, to: { id: 'nand_top', pin: 'b' } },
      { from: { id: 'nand_center', pin: 'out' }, to: { id: 'nand_bot', pin: 'a' } },
      { from: { id: 'xor_in_b', pin: 'out' }, to: { id: 'nand_bot', pin: 'b' } },
      { from: { id: 'nand_top', pin: 'out' }, to: { id: 'nand_out', pin: 'a' } },
      { from: { id: 'nand_bot', pin: 'out' }, to: { id: 'nand_out', pin: 'b' } },
      { from: { id: 'nand_out', pin: 'out' }, to: { id: 'probe_xor', pin: 'in' } },
    ]
  },

  // =========================================================================
  // LEVEL 6: INSIDE A LOGIC GATE -> CMOS SILICON TRANSISTOR LEVEL
  // =========================================================================
  nand_center: {
    name: 'CMOS TRANZISTOROVÉ SCHÉMA (SILICON MOSFET LEVEL)',
    subtitle: 'NAND Gate: 2× PMOS (Parallel Pull-Up) + 2× NMOS (Series Pull-Down)',
    components: [
      { id: 'in_cmos_a', type: 'INPUT', label: 'GATE INPUT A', x: 60, y: 140, inputs: {}, outputs: { out: 1 } },
      { id: 'in_cmos_b', type: 'INPUT', label: 'GATE INPUT B', x: 60, y: 300, inputs: {}, outputs: { out: 1 } },
      { id: 'pmos_1', type: 'NOT', label: 'PMOS 1 (PULL-UP)', x: 300, y: 90, inputs: { in: 1 }, outputs: { out: 0 } },
      { id: 'pmos_2', type: 'NOT', label: 'PMOS 2 (PULL-UP)', x: 460, y: 90, inputs: { in: 1 }, outputs: { out: 0 } },
      { id: 'nmos_1', type: 'AND', label: 'NMOS 1 (PULL-DOWN)', x: 380, y: 240, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'nmos_2', type: 'AND', label: 'NMOS 2 (PULL-DOWN)', x: 380, y: 360, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'out_node', type: 'PROBE', label: 'DRAIN NODE (OUTPUT Y)', x: 740, y: 200, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'in_cmos_a', pin: 'out' }, to: { id: 'pmos_1', pin: 'in' } },
      { from: { id: 'in_cmos_b', pin: 'out' }, to: { id: 'pmos_2', pin: 'in' } },
      { from: { id: 'in_cmos_a', pin: 'out' }, to: { id: 'nmos_1', pin: 'a' } },
      { from: { id: 'in_cmos_b', pin: 'out' }, to: { id: 'nmos_2', pin: 'a' } },
      { from: { id: 'nmos_1', pin: 'out' }, to: { id: 'nmos_2', pin: 'b' } },
      { from: { id: 'pmos_1', pin: 'out' }, to: { id: 'out_node', pin: 'in' } },
    ]
  },

  // =========================================================================
  // LEVEL 7: PHYSICAL SILICON DIE MOSFET TRANSISTOR CROSS-SECTION
  // =========================================================================
  pmos_1: {
    name: 'CMOS P-CHANNEL MOSFET (SILICON CROSS-SECTION & BANDGAP)',
    subtitle: 'Source (P+) | Polysilicon Gate (3.5nm SiO2) | Drain (P+) | N-Well Substrate',
    components: [
      { id: 'gate_voltage', type: 'INPUT', label: 'V_GATE (0V=ON, 5V=OFF)', x: 60, y: 100, inputs: {}, outputs: { out: 0 } },
      { id: 'source_vdd', type: 'INPUT', label: 'V_SOURCE (VDD +5.0V)', x: 60, y: 220, inputs: {}, outputs: { out: 1 } },
      { id: 'bulk_nwell', type: 'INPUT', label: 'V_BULK (N-WELL BIAS)', x: 60, y: 340, inputs: {}, outputs: { out: 1 } },
      { id: 'sio2_dielectric', type: 'NOT', label: 'GATE OXIDE (3.5nm SiO2)', x: 300, y: 100, inputs: { in: 0 }, outputs: { out: 1 } },
      { id: 'hole_channel', type: 'AND', label: 'P-INVERSION CHANNEL (HOLES)', x: 500, y: 160, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'drain_current', type: 'PROBE', label: 'I_DS DRAIN CURRENT', x: 740, y: 160, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'trans_sat', type: 'PROBE', label: 'SATURATION MODE (Vds > Vgs-Vth)', x: 740, y: 280, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'gate_voltage', pin: 'out' }, to: { id: 'sio2_dielectric', pin: 'in' } },
      { from: { id: 'sio2_dielectric', pin: 'out' }, to: { id: 'hole_channel', pin: 'a' } },
      { from: { id: 'source_vdd', pin: 'out' }, to: { id: 'hole_channel', pin: 'b' } },
      { from: { id: 'hole_channel', pin: 'out' }, to: { id: 'drain_current', pin: 'in' } },
      { from: { id: 'hole_channel', pin: 'out' }, to: { id: 'trans_sat', pin: 'in' } },
    ]
  },

  nmos_1: {
    name: 'CMOS N-CHANNEL MOSFET (SILICON CROSS-SECTION & BANDGAP)',
    subtitle: 'Source (N+) | Polysilicon Gate (3.5nm SiO2) | Drain (N+) | P-Substrate (GND)',
    components: [
      { id: 'gate_voltage_n', type: 'INPUT', label: 'V_GATE (5V=ON, 0V=OFF)', x: 60, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'source_gnd', type: 'INPUT', label: 'V_SOURCE (GND 0.0V)', x: 60, y: 220, inputs: {}, outputs: { out: 0 } },
      { id: 'sub_bias', type: 'INPUT', label: 'V_SUB (P-SUBSTRATE)', x: 60, y: 340, inputs: {}, outputs: { out: 0 } },
      { id: 'electron_channel', type: 'AND', label: 'N-INVERSION CHANNEL (ELECTRONS)', x: 340, y: 160, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'drain_current_n', type: 'PROBE', label: 'I_DS DRAIN CURRENT (mA)', x: 660, y: 160, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'channel_pinch', type: 'PROBE', label: 'PINCH-OFF REGION', x: 660, y: 280, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'gate_voltage_n', pin: 'out' }, to: { id: 'electron_channel', pin: 'a' } },
      { from: { id: 'gate_voltage_n', pin: 'out' }, to: { id: 'electron_channel', pin: 'b' } },
      { from: { id: 'electron_channel', pin: 'out' }, to: { id: 'drain_current_n', pin: 'in' } },
      { from: { id: 'electron_channel', pin: 'out' }, to: { id: 'channel_pinch', pin: 'in' } },
    ]
  },

  // =========================================================================
  // LEVEL 8: ATOMIC SILICON LATTICE & DIELECTRIC QUANTUM INTERFACE
  // =========================================================================
  sio2_dielectric: {
    name: 'SILICON DIOXIDE (SiO2) DIELECTRIC & ATOMIC CRYSTAL LATTICE',
    subtitle: 'Si-O Tetrahedral Bond Length 1.62 Å | Energy Bandgap 8.9 eV | 3.5nm Gate Thickness',
    components: [
      { id: 'si_atom', type: 'INPUT', label: 'SILICON ATOM (14 Si: [Ne] 3s² 3p²)', x: 70, y: 110, inputs: {}, outputs: { out: 1 } },
      { id: 'o_atom', type: 'INPUT', label: 'OXYGEN ATOM (8 O: [He] 2s² 2p⁴)', x: 70, y: 240, inputs: {}, outputs: { out: 1 } },
      { id: 'covalent_sp3', type: 'AND', label: 'COVALENT SP3 TETRAHEDRON', x: 340, y: 180, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'bandgap_barrier', type: 'PROBE', label: 'POTENTIAL BARRIER (8.9 eV)', x: 640, y: 120, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'tunnel_current', type: 'PROBE', label: 'QUANTUM TUNNELING LEAKAGE', x: 640, y: 240, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'si_atom', pin: 'out' }, to: { id: 'covalent_sp3', pin: 'a' } },
      { from: { id: 'o_atom', pin: 'out' }, to: { id: 'covalent_sp3', pin: 'b' } },
      { from: { id: 'covalent_sp3', pin: 'out' }, to: { id: 'bandgap_barrier', pin: 'in' } },
    ]
  },

  // =========================================================================
  // STANDARD LOGIC GATES & CHIPS (INTERACTIVE SUB-CIRCUITS)
  // =========================================================================
  AND: {
    name: 'SN74LS08 QUAD 2-INPUT AND GATE (INTERNAL SCHEMATIC)',
    subtitle: '2-Input NAND Stage + Inverter Buffer (6 Transistors)',
    components: [
      { id: 'and_a', type: 'INPUT', label: 'INPUT A', x: 80, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'and_b', type: 'INPUT', label: 'INPUT B', x: 80, y: 240, inputs: {}, outputs: { out: 1 } },
      { id: 'stage_nand', type: 'NAND', label: 'STAGE 1: 2-IN NAND', x: 320, y: 180, inputs: { a: 1, b: 1 }, outputs: { out: 0 } },
      { id: 'stage_not', type: 'NOT', label: 'STAGE 2: INVERTER (NOT)', x: 540, y: 180, inputs: { in: 0 }, outputs: { out: 1 } },
      { id: 'and_out', type: 'PROBE', label: 'OUTPUT Y = A · B', x: 760, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'and_a', pin: 'out' }, to: { id: 'stage_nand', pin: 'a' } },
      { from: { id: 'and_b', pin: 'out' }, to: { id: 'stage_nand', pin: 'b' } },
      { from: { id: 'stage_nand', pin: 'out' }, to: { id: 'stage_not', pin: 'in' } },
      { from: { id: 'stage_not', pin: 'out' }, to: { id: 'and_out', pin: 'in' } },
    ]
  },

  OR: {
    name: 'SN74LS32 QUAD 2-INPUT OR GATE (INTERNAL SCHEMATIC)',
    subtitle: '2-Input NOR Stage + Inverter Buffer (6 Transistors)',
    components: [
      { id: 'or_a', type: 'INPUT', label: 'INPUT A', x: 80, y: 120, inputs: {}, outputs: { out: 0 } },
      { id: 'or_b', type: 'INPUT', label: 'INPUT B', x: 80, y: 240, inputs: {}, outputs: { out: 1 } },
      { id: 'stage_nor', type: 'NOR', label: 'STAGE 1: 2-IN NOR', x: 320, y: 180, inputs: { a: 0, b: 1 }, outputs: { out: 0 } },
      { id: 'stage_not', type: 'NOT', label: 'STAGE 2: INVERTER (NOT)', x: 540, y: 180, inputs: { in: 0 }, outputs: { out: 1 } },
      { id: 'or_out', type: 'PROBE', label: 'OUTPUT Y = A + B', x: 760, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'or_a', pin: 'out' }, to: { id: 'stage_nor', pin: 'a' } },
      { from: { id: 'or_b', pin: 'out' }, to: { id: 'stage_nor', pin: 'b' } },
      { from: { id: 'stage_nor', pin: 'out' }, to: { id: 'stage_not', pin: 'in' } },
      { from: { id: 'stage_not', pin: 'out' }, to: { id: 'or_out', pin: 'in' } },
    ]
  },

  XOR: {
    name: 'SN74LS86 QUAD 2-INPUT XOR GATE (4-NAND MATRIX)',
    subtitle: 'A ⊕ B = (A + B) · (A · B)̄ (12 Transistors)',
    components: [
      { id: 'xor_a', type: 'INPUT', label: 'INPUT A', x: 80, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'xor_b', type: 'INPUT', label: 'INPUT B', x: 80, y: 260, inputs: {}, outputs: { out: 0 } },
      { id: 'nand1', type: 'NAND', label: 'NAND 1 (COMMON)', x: 280, y: 190, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'nand2', type: 'NAND', label: 'NAND 2 (UPPER)', x: 470, y: 110, inputs: { a: 1, b: 1 }, outputs: { out: 0 } },
      { id: 'nand3', type: 'NAND', label: 'NAND 3 (LOWER)', x: 470, y: 270, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'nand4', type: 'NAND', label: 'NAND 4 (OUTPUT)', x: 680, y: 190, inputs: { a: 0, b: 1 }, outputs: { out: 1 } },
      { id: 'xor_out', type: 'PROBE', label: 'OUTPUT Y = A ⊕ B', x: 860, y: 190, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'xor_a', pin: 'out' }, to: { id: 'nand1', pin: 'a' } },
      { from: { id: 'xor_b', pin: 'out' }, to: { id: 'nand1', pin: 'b' } },
      { from: { id: 'xor_a', pin: 'out' }, to: { id: 'nand2', pin: 'a' } },
      { from: { id: 'nand1', pin: 'out' }, to: { id: 'nand2', pin: 'b' } },
      { from: { id: 'nand1', pin: 'out' }, to: { id: 'nand3', pin: 'a' } },
      { from: { id: 'xor_b', pin: 'out' }, to: { id: 'nand3', pin: 'b' } },
      { from: { id: 'nand2', pin: 'out' }, to: { id: 'nand4', pin: 'a' } },
      { from: { id: 'nand3', pin: 'out' }, to: { id: 'nand4', pin: 'b' } },
      { from: { id: 'nand4', pin: 'out' }, to: { id: 'xor_out', pin: 'in' } },
    ]
  },

  NOT: {
    name: 'SN74LS04 HEX INVERTER (CMOS COMPLEMENTARY PAIR)',
    subtitle: '1× PMOS Pull-Up + 1× NMOS Pull-Down (2 Transistors)',
    components: [
      { id: 'not_in', type: 'INPUT', label: 'INPUT A', x: 100, y: 180, inputs: {}, outputs: { out: 1 } },
      { id: 'pmos_inv', type: 'NOT', label: 'PMOS PULL-UP (VDD)', x: 360, y: 110, inputs: { in: 1 }, outputs: { out: 0 } },
      { id: 'nmos_inv', type: 'NOT', label: 'NMOS PULL-DOWN (GND)', x: 360, y: 250, inputs: { in: 1 }, outputs: { out: 0 } },
      { id: 'not_out', type: 'PROBE', label: 'OUTPUT Y = NOT(A)', x: 680, y: 180, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'not_in', pin: 'out' }, to: { id: 'pmos_inv', pin: 'in' } },
      { from: { id: 'not_in', pin: 'out' }, to: { id: 'nmos_inv', pin: 'in' } },
      { from: { id: 'pmos_inv', pin: 'out' }, to: { id: 'not_out', pin: 'in' } },
    ]
  },

  NAND: {
    name: 'SN74LS00 QUAD 2-INPUT NAND GATE',
    subtitle: '2× PMOS Parallel + 2× NMOS Series (4 Transistors)',
    components: [
      { id: 'nand_a', type: 'INPUT', label: 'INPUT A', x: 80, y: 130, inputs: {}, outputs: { out: 1 } },
      { id: 'nand_b', type: 'INPUT', label: 'INPUT B', x: 80, y: 250, inputs: {}, outputs: { out: 1 } },
      { id: 'and_core', type: 'AND', label: 'AND STAGE', x: 320, y: 190, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'inv_bubble', type: 'NOT', label: 'INVERSION BUBBLE', x: 520, y: 190, inputs: { in: 1 }, outputs: { out: 0 } },
      { id: 'nand_out', type: 'PROBE', label: 'OUTPUT Y = (A·B)̄', x: 740, y: 190, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'nand_a', pin: 'out' }, to: { id: 'and_core', pin: 'a' } },
      { from: { id: 'nand_b', pin: 'out' }, to: { id: 'and_core', pin: 'b' } },
      { from: { id: 'and_core', pin: 'out' }, to: { id: 'inv_bubble', pin: 'in' } },
      { from: { id: 'inv_bubble', pin: 'out' }, to: { id: 'nand_out', pin: 'in' } },
    ]
  },

  NOR: {
    name: 'SN74LS02 QUAD 2-INPUT NOR GATE',
    subtitle: '2× PMOS Series + 2× NMOS Parallel (4 Transistors)',
    components: [
      { id: 'nor_a', type: 'INPUT', label: 'INPUT A', x: 80, y: 130, inputs: {}, outputs: { out: 0 } },
      { id: 'nor_b', type: 'INPUT', label: 'INPUT B', x: 80, y: 250, inputs: {}, outputs: { out: 0 } },
      { id: 'or_core', type: 'OR', label: 'OR STAGE', x: 320, y: 190, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'inv_bubble', type: 'NOT', label: 'INVERSION BUBBLE', x: 520, y: 190, inputs: { in: 0 }, outputs: { out: 1 } },
      { id: 'nor_out', type: 'PROBE', label: 'OUTPUT Y = (A+B)̄', x: 740, y: 190, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'nor_a', pin: 'out' }, to: { id: 'or_core', pin: 'a' } },
      { from: { id: 'nor_b', pin: 'out' }, to: { id: 'or_core', pin: 'b' } },
      { from: { id: 'or_core', pin: 'out' }, to: { id: 'inv_bubble', pin: 'in' } },
      { from: { id: 'inv_bubble', pin: 'out' }, to: { id: 'nor_out', pin: 'in' } },
    ]
  },

  D_FF: {
    name: 'SN74LS74AN DUAL D-TYPE POSITIVE-EDGE FLIP-FLOP',
    subtitle: 'Master-Slave Cross-Coupled NAND Latch Matrix (6 Gates / 24 Transistors)',
    components: [
      { id: 'dff_d', type: 'INPUT', label: 'DATA INPUT (D)', x: 70, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'dff_clk', type: 'CLOCK', label: 'CLOCK PULSE (CLK)', x: 70, y: 260, inputs: {}, outputs: { out: 1 } },
      { id: 'gate_n1', type: 'NAND', label: 'MASTER LATCH 1', x: 300, y: 120, inputs: { a: 1, b: 1 }, outputs: { out: 0 } },
      { id: 'gate_n2', type: 'NAND', label: 'MASTER LATCH 2', x: 300, y: 260, inputs: { a: 0, b: 1 }, outputs: { out: 1 } },
      { id: 'gate_s1', type: 'NAND', label: 'SLAVE LATCH Q', x: 550, y: 120, inputs: { a: 0, b: 1 }, outputs: { out: 1 } },
      { id: 'gate_s2', type: 'NAND', label: 'SLAVE LATCH Q̄', x: 550, y: 260, inputs: { a: 1, b: 0 }, outputs: { out: 0 } },
      { id: 'probe_q', type: 'PROBE', label: 'Q OUTPUT', x: 780, y: 120, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_nq', type: 'PROBE', label: 'Q̄ OUTPUT', x: 780, y: 260, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'dff_d', pin: 'out' }, to: { id: 'gate_n1', pin: 'a' } },
      { from: { id: 'dff_clk', pin: 'out' }, to: { id: 'gate_n1', pin: 'b' } },
      { from: { id: 'dff_clk', pin: 'out' }, to: { id: 'gate_n2', pin: 'a' } },
      { from: { id: 'gate_n1', pin: 'out' }, to: { id: 'gate_s1', pin: 'a' } },
      { from: { id: 'gate_n2', pin: 'out' }, to: { id: 'gate_s2', pin: 'b' } },
      { from: { id: 'gate_s1', pin: 'out' }, to: { id: 'gate_s2', pin: 'a' } },
      { from: { id: 'gate_s2', pin: 'out' }, to: { id: 'gate_s1', pin: 'b' } },
      { from: { id: 'gate_s1', pin: 'out' }, to: { id: 'probe_q', pin: 'in' } },
      { from: { id: 'gate_s2', pin: 'out' }, to: { id: 'probe_nq', pin: 'in' } },
    ]
  },

  REGISTER_8BIT: {
    name: 'SN74LS374 OCTAL D-TYPE FLIP-FLOP REGISTER SCHEMATIC',
    subtitle: '8× High-Speed Edge-Triggered D-FF Cells + Tristate 3-State Output Bus Drivers',
    components: [
      { id: 'reg_clk', type: 'CLOCK', label: 'COMMON CLOCK (CLK)', x: 60, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'reg_oe', type: 'INPUT', label: 'OUTPUT ENABLE (OE#)', x: 60, y: 260, inputs: {}, outputs: { out: 0 } },
      { id: 'ff_bit0', type: 'D_FF', label: 'BIT 0 D-FF CELL', x: 280, y: 80, inputs: { d: 1, clk: 1 }, outputs: { q: 1, nq: 0 } },
      { id: 'ff_bit1', type: 'D_FF', label: 'BIT 1 D-FF CELL', x: 280, y: 200, inputs: { d: 0, clk: 1 }, outputs: { q: 0, nq: 1 } },
      { id: 'ff_bit2', type: 'D_FF', label: 'BIT 2 D-FF CELL', x: 280, y: 320, inputs: { d: 1, clk: 1 }, outputs: { q: 1, nq: 0 } },
      { id: 'bus_drv0', type: 'TRI_STATE', label: 'TRI-STATE DRV 0', x: 540, y: 80, inputs: { in: 1, en: 1 }, outputs: { out: 1 } },
      { id: 'bus_drv1', type: 'TRI_STATE', label: 'TRI-STATE DRV 1', x: 540, y: 200, inputs: { in: 0, en: 1 }, outputs: { out: 0 } },
      { id: 'probe_byte', type: 'PROBE', label: 'DATA BUS [7:0]', x: 760, y: 140, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'reg_clk', pin: 'out' }, to: { id: 'ff_bit0', pin: 'clk' } },
      { from: { id: 'reg_clk', pin: 'out' }, to: { id: 'ff_bit1', pin: 'clk' } },
      { from: { id: 'reg_clk', pin: 'out' }, to: { id: 'ff_bit2', pin: 'clk' } },
      { from: { id: 'ff_bit0', pin: 'q' }, to: { id: 'bus_drv0', pin: 'in' } },
      { from: { id: 'ff_bit1', pin: 'q' }, to: { id: 'bus_drv1', pin: 'in' } },
      { from: { id: 'bus_drv0', pin: 'out' }, to: { id: 'probe_byte', pin: 'in' } },
    ]
  },

  MUX: {
    name: 'SN74LS157 QUAD 2-TO-1 DATA SELECTOR / MULTIPLEXER',
    subtitle: 'Y = (A · S̄) + (B · S) (AND-OR-INVERT Logic Matrix)',
    components: [
      { id: 'mux_a', type: 'INPUT', label: 'INPUT A (CH 0)', x: 80, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'mux_b', type: 'INPUT', label: 'INPUT B (CH 1)', x: 80, y: 220, inputs: {}, outputs: { out: 0 } },
      { id: 'mux_sel', type: 'INPUT', label: 'SELECT (SEL)', x: 80, y: 340, inputs: {}, outputs: { out: 0 } },
      { id: 'inv_sel', type: 'NOT', label: 'SEL INVERTER', x: 260, y: 340, inputs: { in: 0 }, outputs: { out: 1 } },
      { id: 'and_ch0', type: 'AND', label: 'CH 0 GATE (A · S̄)', x: 440, y: 120, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'and_ch1', type: 'AND', label: 'CH 1 GATE (B · S)', x: 440, y: 240, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'or_mux', type: 'OR', label: 'FINAL OR COMBINER', x: 660, y: 180, inputs: { a: 1, b: 0 }, outputs: { out: 1 } },
      { id: 'probe_mux', type: 'PROBE', label: 'OUTPUT Y', x: 860, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'mux_a', pin: 'out' }, to: { id: 'and_ch0', pin: 'a' } },
      { from: { id: 'inv_sel', pin: 'out' }, to: { id: 'and_ch0', pin: 'b' } },
      { from: { id: 'mux_b', pin: 'out' }, to: { id: 'and_ch1', pin: 'a' } },
      { from: { id: 'mux_sel', pin: 'out' }, to: { id: 'and_ch1', pin: 'b' } },
      { from: { id: 'mux_sel', pin: 'out' }, to: { id: 'inv_sel', pin: 'in' } },
      { from: { id: 'and_ch0', pin: 'out' }, to: { id: 'or_mux', pin: 'a' } },
      { from: { id: 'and_ch1', pin: 'out' }, to: { id: 'or_mux', pin: 'b' } },
      { from: { id: 'or_mux', pin: 'out' }, to: { id: 'probe_mux', pin: 'in' } },
    ]
  },

  SEVEN_SEGMENT: {
    name: 'MAN-72A / TIL311 7-SEGMENT LED DISPLAY SCHEMATIC',
    subtitle: 'BCD-to-7Segment Decoder Matrix + 7× Constant Current Drivers + GaAsP LEDs',
    components: [
      { id: 'in_bit0', type: 'INPUT', label: 'BIT 0 (LSB - 1)', x: 60, y: 80, inputs: {}, outputs: { out: 1 } },
      { id: 'in_bit1', type: 'INPUT', label: 'BIT 1 (2)', x: 60, y: 160, inputs: {}, outputs: { out: 1 } },
      { id: 'in_bit2', type: 'INPUT', label: 'BIT 2 (4)', x: 60, y: 240, inputs: {}, outputs: { out: 0 } },
      { id: 'in_bit3', type: 'INPUT', label: 'BIT 3 (MSB - 8)', x: 60, y: 320, inputs: {}, outputs: { out: 0 } },
      { id: 'seg_and1', type: 'AND', label: 'ROM DECODER ROW A', x: 300, y: 100, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'seg_and2', type: 'AND', label: 'ROM DECODER ROW B', x: 300, y: 200, inputs: { a: 1, b: 0 }, outputs: { out: 0 } },
      { id: 'seg_and3', type: 'AND', label: 'ROM DECODER ROW C', x: 300, y: 300, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'probe_seg_a', type: 'PROBE', label: 'SEGMENT A (TOP)', x: 540, y: 100, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_seg_b', type: 'PROBE', label: 'SEGMENT B (RIGHT)', x: 540, y: 200, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_seg_c', type: 'PROBE', label: 'SEGMENT C (MID)', x: 540, y: 300, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'led_display', type: 'SEVEN_SEGMENT', label: 'FINAL LED DISPLAY', x: 740, y: 160, inputs: { b0: 1, b1: 1, b2: 0, b3: 0 }, outputs: { val: 3 } },
    ],
    wires: [
      { from: { id: 'in_bit0', pin: 'out' }, to: { id: 'seg_and1', pin: 'a' } },
      { from: { id: 'in_bit1', pin: 'out' }, to: { id: 'seg_and1', pin: 'b' } },
      { from: { id: 'in_bit0', pin: 'out' }, to: { id: 'led_display', pin: 'b0' } },
      { from: { id: 'in_bit1', pin: 'out' }, to: { id: 'led_display', pin: 'b1' } },
      { from: { id: 'in_bit2', pin: 'out' }, to: { id: 'led_display', pin: 'b2' } },
      { from: { id: 'in_bit3', pin: 'out' }, to: { id: 'led_display', pin: 'b3' } },
      { from: { id: 'seg_and1', pin: 'out' }, to: { id: 'probe_seg_a', pin: 'in' } },
    ]
  },

  VRAM_BANK: {
    name: 'TOSHIBA TC51V16160FT 16Mb EDO DRAM INTERNAL MATRIX',
    subtitle: '1024 Rows × 1024 Columns × 16-Bit Capacitor Matrix + Sense Amplifiers',
    components: [
      { id: 'vram_ras', type: 'INPUT', label: 'RAS# (ROW STROBE)', x: 60, y: 120, inputs: {}, outputs: { out: 0 } },
      { id: 'vram_cas', type: 'INPUT', label: 'CAS# (COL STROBE)', x: 60, y: 240, inputs: {}, outputs: { out: 0 } },
      { id: 'row_dec', type: 'REGISTER_8BIT', label: 'ROW DECODER (1024L)', x: 280, y: 100, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'col_dec', type: 'REGISTER_8BIT', label: 'COL DECODER (1024L)', x: 280, y: 220, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'dram_mat', type: 'RAM', label: '16Mb CAPACITOR ARRAY', x: 500, y: 140, inputs: { addr: 1, din: 0x55, we: 0, clk: 1 }, outputs: { dout: 0x55 } },
      { id: 'sense_amp', type: 'PROBE', label: 'SENSE AMP & EDO LATCH', x: 740, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'vram_ras', pin: 'out' }, to: { id: 'row_dec', pin: 'clk' } },
      { from: { id: 'vram_cas', pin: 'out' }, to: { id: 'col_dec', pin: 'clk' } },
      { from: { id: 'row_dec', pin: 'q' }, to: { id: 'dram_mat', pin: 'addr' } },
      { from: { id: 'dram_mat', pin: 'dout' }, to: { id: 'sense_amp', pin: 'in' } },
    ]
  },

  RAMDAC: {
    name: 'ATT20C409 / NV1 135MHz TrueColor VIDEO DAC ARCHITECTURE',
    subtitle: '256×18 Color LUT + Triple 8-Bit DACs (Red, Green, Blue) with 75Ω Drivers',
    components: [
      { id: 'pix_clock', type: 'CLOCK', label: 'PIXEL CLOCK (135MHz)', x: 60, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'pix_data', type: 'INPUT', label: 'DIGITAL RGB [23:0]', x: 60, y: 240, inputs: {}, outputs: { out: 1 } },
      { id: 'clut_sram', type: 'RAM', label: '256x18 CLUT PALETTE', x: 280, y: 180, inputs: { addr: 1, din: 0x1F, we: 0, clk: 1 }, outputs: { dout: 0x1F } },
      { id: 'dac_r', type: 'PROBE', label: 'RED DAC (0-0.7V)', x: 560, y: 100, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'dac_g', type: 'PROBE', label: 'GREEN DAC (0-0.7V)', x: 560, y: 200, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'dac_b', type: 'PROBE', label: 'BLUE DAC (0-0.7V)', x: 560, y: 300, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'vga_screen', type: 'VIRTUAL_SCREEN', label: 'VGA 640x480 MONITOR', x: 780, y: 160, inputs: { x: 0, y: 0, color: 0x1F, we: 1, clk: 1 }, outputs: {} },
    ],
    wires: [
      { from: { id: 'pix_clock', pin: 'out' }, to: { id: 'clut_sram', pin: 'clk' } },
      { from: { id: 'pix_data', pin: 'out' }, to: { id: 'clut_sram', pin: 'din' } },
      { from: { id: 'clut_sram', pin: 'dout' }, to: { id: 'dac_r', pin: 'in' } },
      { from: { id: 'clut_sram', pin: 'dout' }, to: { id: 'dac_g', pin: 'in' } },
      { from: { id: 'clut_sram', pin: 'dout' }, to: { id: 'dac_b', pin: 'in' } },
      { from: { id: 'clut_sram', pin: 'dout' }, to: { id: 'vga_screen', pin: 'color' } },
      { from: { id: 'pix_clock', pin: 'out' }, to: { id: 'vga_screen', pin: 'clk' } },
    ]
  },

  AUDIO_DSP: {
    name: 'STG-2000 32-VOICE WAVETABLE SYNTHESIZER SCHEMATIC',
    subtitle: '32 Polyphonic Voices + Wavetable Interpolator + 16-Bit Stereo Audio DAC',
    components: [
      { id: 'dsp_clk', type: 'CLOCK', label: 'AUDIO CLOCK (24.576M)', x: 60, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'midi_data', type: 'INPUT', label: 'MIDI IN (NOTE ON)', x: 60, y: 240, inputs: {}, outputs: { out: 1 } },
      { id: 'voice_osc', type: 'REGISTER_8BIT', label: '32-VOICE NCO OSCILLATORS', x: 280, y: 180, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'wave_rom', type: 'ROM', label: 'INSTRUMENT SAMPLE ROM', x: 500, y: 180, inputs: { addr: 1 }, outputs: { dout: 0x80 } },
      { id: 'probe_audio_l', type: 'PROBE', label: 'STEREO LEFT (16-BIT)', x: 740, y: 120, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_audio_r', type: 'PROBE', label: 'STEREO RIGHT (16-BIT)', x: 740, y: 240, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'dsp_clk', pin: 'out' }, to: { id: 'voice_osc', pin: 'clk' } },
      { from: { id: 'midi_data', pin: 'out' }, to: { id: 'voice_osc', pin: 'd' } },
      { from: { id: 'voice_osc', pin: 'q' }, to: { id: 'wave_rom', pin: 'addr' } },
      { from: { id: 'wave_rom', pin: 'dout' }, to: { id: 'probe_audio_l', pin: 'in' } },
      { from: { id: 'wave_rom', pin: 'dout' }, to: { id: 'probe_audio_r', pin: 'in' } },
    ]
  },

  PCI_BUS: {
    name: '32-BIT 33MHz PCI 2.1 BUS INTERFACE SCHEMATIC',
    subtitle: 'Multiplexed Address/Data Bus (AD[31:0]) + Frame/IRDY/TRDY Handshake Protocol',
    components: [
      { id: 'pci_clk_in', type: 'CLOCK', label: 'PCI 33MHz CLK', x: 60, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'pci_frame_in', type: 'INPUT', label: 'FRAME# CYCLE ACTIVE', x: 60, y: 220, inputs: {}, outputs: { out: 0 } },
      { id: 'pci_ad_bus', type: 'INPUT', label: 'AD[31:0] MULTIPLEXED', x: 60, y: 340, inputs: {}, outputs: { out: 1 } },
      { id: 'dma_arb', type: 'REGISTER_8BIT', label: 'BURST DMA FIFO (64-BYTE)', x: 320, y: 160, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'pci_trdy', type: 'NOT', label: 'DEVSEL# & TRDY# GENERATOR', x: 320, y: 300, inputs: { in: 0 }, outputs: { out: 1 } },
      { id: 'probe_burst', type: 'PROBE', label: 'BURST TRANSFER RATE (132MB/s)', x: 680, y: 160, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_status', type: 'PROBE', label: 'PCI TARGET READY', x: 680, y: 300, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'pci_clk_in', pin: 'out' }, to: { id: 'dma_arb', pin: 'clk' } },
      { from: { id: 'pci_ad_bus', pin: 'out' }, to: { id: 'dma_arb', pin: 'd' } },
      { from: { id: 'pci_frame_in', pin: 'out' }, to: { id: 'pci_trdy', pin: 'in' } },
      { from: { id: 'dma_arb', pin: 'q' }, to: { id: 'probe_burst', pin: 'in' } },
      { from: { id: 'pci_trdy', pin: 'out' }, to: { id: 'probe_status', pin: 'in' } },
    ]
  },

  VGA_BRACKET: {
    name: 'ANALOG VGA DB-15 & SEGA SATURN MULTI-IO SCHEMATIC',
    subtitle: 'RGB Video 75Ω Termination Filters + Dual 3.5mm Stereo Audio + Sega DB-9 Ports',
    components: [
      { id: 'vga_rgb_in', type: 'INPUT', label: 'ANALOG RGB (0.7V p-p)', x: 60, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'vga_sync_in', type: 'INPUT', label: 'TTL HSYNC / VSYNC', x: 60, y: 220, inputs: {}, outputs: { out: 1 } },
      { id: 'saturn_clock', type: 'CLOCK', label: 'SATURN CONTROLLER CLK', x: 60, y: 340, inputs: {}, outputs: { out: 1 } },
      { id: 'rc_filter', type: 'AND', label: '75Ω LOW-PASS LC FILTER', x: 320, y: 100, inputs: { a: 1, b: 1 }, outputs: { out: 1 } },
      { id: 'sync_driver', type: 'NOT', label: '74LS244 SYNC DRIVER', x: 320, y: 220, inputs: { in: 1 }, outputs: { out: 0 } },
      { id: 'saturn_shift', type: 'REGISTER_8BIT', label: 'SATURN 9-PIN SHIFT REG', x: 320, y: 340, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'probe_vga_out', type: 'PROBE', label: 'VGA CONNECTOR PIN 1-3', x: 680, y: 100, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_saturn_out', type: 'PROBE', label: 'SATURN GAMEPAD JOY_DATA', x: 680, y: 340, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'vga_rgb_in', pin: 'out' }, to: { id: 'rc_filter', pin: 'a' } },
      { from: { id: 'vga_rgb_in', pin: 'out' }, to: { id: 'rc_filter', pin: 'b' } },
      { from: { id: 'vga_sync_in', pin: 'out' }, to: { id: 'sync_driver', pin: 'in' } },
      { from: { id: 'saturn_clock', pin: 'out' }, to: { id: 'saturn_shift', pin: 'clk' } },
      { from: { id: 'rc_filter', pin: 'out' }, to: { id: 'probe_vga_out', pin: 'in' } },
      { from: { id: 'saturn_shift', pin: 'q' }, to: { id: 'probe_saturn_out', pin: 'in' } },
    ]
  },

  SATURN_PAD: {
    name: 'SEGA SATURN CONTROL PAD MATRIX ENCODER',
    subtitle: 'SMPC Controller Multiplexer (Select 0: Up/Down/L/R | Select 1: A/B/C/X/Y/Z)',
    components: [
      { id: 'pad_clk', type: 'CLOCK', label: 'SCAN STROBE', x: 60, y: 110, inputs: {}, outputs: { out: 1 } },
      { id: 'btn_up', type: 'INPUT', label: 'DPAD UP', x: 60, y: 210, inputs: {}, outputs: { out: 1 } },
      { id: 'btn_a_sw', type: 'INPUT', label: 'BUTTON A', x: 60, y: 310, inputs: {}, outputs: { out: 1 } },
      { id: 'pad_mux', type: 'MUX', label: '74HC157 4-CH MUX', x: 300, y: 180, inputs: { a: 1, b: 1, sel: 0 }, outputs: { out: 1 } },
      { id: 'probe_smpc', type: 'PROBE', label: 'SMPC DATA STREAM', x: 580, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'btn_up', pin: 'out' }, to: { id: 'pad_mux', pin: 'a' } },
      { from: { id: 'btn_a_sw', pin: 'out' }, to: { id: 'pad_mux', pin: 'b' } },
      { from: { id: 'pad_clk', pin: 'out' }, to: { id: 'pad_mux', pin: 'sel' } },
      { from: { id: 'pad_mux', pin: 'out' }, to: { id: 'probe_smpc', pin: 'in' } },
    ]
  },

  VIRTUAL_SCREEN: {
    name: 'CRT RASTER MONITOR & DEFLECTION MATRIX',
    subtitle: 'Dual-Port Video Memory + Horizontal/Vertical Sweep DACs + RGB Shadow Mask Triads',
    components: [
      { id: 'crt_clk', type: 'CLOCK', label: 'PIXEL CLOCK (25MHz)', x: 60, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'crt_rgb', type: 'INPUT', label: 'VIDEO DATA [7:0]', x: 60, y: 240, inputs: {}, outputs: { out: 0x1F } },
      { id: 'h_sweep', type: 'REGISTER_8BIT', label: 'H-SYNC RAMP COUNTER', x: 280, y: 100, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'v_sweep', type: 'REGISTER_8BIT', label: 'V-SYNC RAMP COUNTER', x: 280, y: 230, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'shadow_mask', type: 'PROBE', label: 'RGB PHOSPHOR EMISSION', x: 560, y: 170, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'crt_clk', pin: 'out' }, to: { id: 'h_sweep', pin: 'clk' } },
      { from: { id: 'crt_clk', pin: 'out' }, to: { id: 'v_sweep', pin: 'clk' } },
      { from: { id: 'crt_rgb', pin: 'out' }, to: { id: 'shadow_mask', pin: 'in' } },
    ]
  },

  RAM: {
    name: 'HM62256B 32K×8 HIGH-SPEED STATIC RAM ARRAY',
    subtitle: 'Row Decoder (8-to-256) + 6-Transistor (6T) SRAM Memory Cells + Sense Amplifiers',
    components: [
      { id: 'ram_addr', type: 'INPUT', label: 'ADDR [14:0]', x: 60, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'ram_din', type: 'INPUT', label: 'DATA IN [7:0]', x: 60, y: 220, inputs: {}, outputs: { out: 0xAA } },
      { id: 'ram_we', type: 'INPUT', label: 'WRITE ENABLE (WE#)', x: 60, y: 340, inputs: {}, outputs: { out: 0 } },
      { id: 'addr_dec', type: 'REGISTER_8BIT', label: 'ROW/COL WORDLINE DECODER', x: 300, y: 140, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'cell_6t', type: 'D_FF', label: '6T SRAM CELL MATRIX', x: 520, y: 140, inputs: { d: 1, clk: 1 }, outputs: { q: 1, nq: 0 } },
      { id: 'probe_ram_out', type: 'PROBE', label: 'DATA OUT [7:0]', x: 760, y: 140, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'ram_addr', pin: 'out' }, to: { id: 'addr_dec', pin: 'd' } },
      { from: { id: 'addr_dec', pin: 'q' }, to: { id: 'cell_6t', pin: 'clk' } },
      { from: { id: 'ram_din', pin: 'out' }, to: { id: 'cell_6t', pin: 'd' } },
      { from: { id: 'cell_6t', pin: 'q' }, to: { id: 'probe_ram_out', pin: 'in' } },
    ]
  },

  ROM: {
    name: 'AT28C64B 64K PARALLEL EEPROM SCHEMATIC',
    subtitle: 'Non-Volatile Floating-Gate Tunnel-Oxide (FLOTOX) Storage Array + High-Voltage Charge Pump',
    components: [
      { id: 'rom_addr_in', type: 'INPUT', label: 'ADDR [12:0]', x: 60, y: 120, inputs: {}, outputs: { out: 1 } },
      { id: 'rom_oe_in', type: 'INPUT', label: 'OUTPUT ENABLE (OE#)', x: 60, y: 260, inputs: {}, outputs: { out: 0 } },
      { id: 'rom_dec', type: 'REGISTER_8BIT', label: 'EEPROM ROW DECODER', x: 300, y: 140, inputs: { d: 1, clk: 1, we: 1 }, outputs: { q: 1 } },
      { id: 'probe_flotox', type: 'PROBE', label: 'FLOTOX TUNNEL OXIDE CELL', x: 560, y: 140, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'probe_rom_dout', type: 'PROBE', label: 'DATA OUTPUT (BYTE)', x: 780, y: 140, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'rom_addr_in', pin: 'out' }, to: { id: 'rom_dec', pin: 'd' } },
      { from: { id: 'rom_dec', pin: 'q' }, to: { id: 'probe_flotox', pin: 'in' } },
      { from: { id: 'probe_flotox', pin: 'val' }, to: { id: 'probe_rom_dout', pin: 'in' } },
    ]
  },
};

// Aliases for subcircuits
HIERARCHICAL_SUBCIRCUITS.pmos_2 = HIERARCHICAL_SUBCIRCUITS.pmos_1;
HIERARCHICAL_SUBCIRCUITS.nmos_2 = HIERARCHICAL_SUBCIRCUITS.nmos_1;
HIERARCHICAL_SUBCIRCUITS.pmos_inv = HIERARCHICAL_SUBCIRCUITS.pmos_1;
HIERARCHICAL_SUBCIRCUITS.nmos_inv = HIERARCHICAL_SUBCIRCUITS.nmos_1;
HIERARCHICAL_SUBCIRCUITS.vram_bank0 = HIERARCHICAL_SUBCIRCUITS.VRAM_BANK;
HIERARCHICAL_SUBCIRCUITS.vram_bank1 = HIERARCHICAL_SUBCIRCUITS.VRAM_BANK;
HIERARCHICAL_SUBCIRCUITS.vram_ctrl = HIERARCHICAL_SUBCIRCUITS.VRAM_BANK;
HIERARCHICAL_SUBCIRCUITS.ramdac = HIERARCHICAL_SUBCIRCUITS.RAMDAC;
HIERARCHICAL_SUBCIRCUITS.ramdac_core = HIERARCHICAL_SUBCIRCUITS.RAMDAC;
HIERARCHICAL_SUBCIRCUITS.audio_dsp = HIERARCHICAL_SUBCIRCUITS.AUDIO_DSP;
HIERARCHICAL_SUBCIRCUITS.audio_core = HIERARCHICAL_SUBCIRCUITS.AUDIO_DSP;
HIERARCHICAL_SUBCIRCUITS.pci_bus = HIERARCHICAL_SUBCIRCUITS.PCI_BUS;
HIERARCHICAL_SUBCIRCUITS.pci_dma = HIERARCHICAL_SUBCIRCUITS.PCI_BUS;
HIERARCHICAL_SUBCIRCUITS.vga_bracket = HIERARCHICAL_SUBCIRCUITS.VGA_BRACKET;
HIERARCHICAL_SUBCIRCUITS.saturn_pad = HIERARCHICAL_SUBCIRCUITS.SATURN_PAD;
HIERARCHICAL_SUBCIRCUITS.saturn_io = HIERARCHICAL_SUBCIRCUITS.SATURN_PAD;
HIERARCHICAL_SUBCIRCUITS.fa_xor2 = HIERARCHICAL_SUBCIRCUITS.fa_xor1;
HIERARCHICAL_SUBCIRCUITS.z_buf_cmp = HIERARCHICAL_SUBCIRCUITS.fa_xor1;
HIERARCHICAL_SUBCIRCUITS.nand_top = HIERARCHICAL_SUBCIRCUITS.nand_center;
HIERARCHICAL_SUBCIRCUITS.nand_bot = HIERARCHICAL_SUBCIRCUITS.nand_center;
HIERARCHICAL_SUBCIRCUITS.nand_out = HIERARCHICAL_SUBCIRCUITS.nand_center;
HIERARCHICAL_SUBCIRCUITS.nand1 = HIERARCHICAL_SUBCIRCUITS.nand_center;
HIERARCHICAL_SUBCIRCUITS.nand2 = HIERARCHICAL_SUBCIRCUITS.nand_center;
HIERARCHICAL_SUBCIRCUITS.nand3 = HIERARCHICAL_SUBCIRCUITS.nand_center;
HIERARCHICAL_SUBCIRCUITS.nand4 = HIERARCHICAL_SUBCIRCUITS.nand_center;

/**
 * Finds the corresponding internal subcircuit schematic for any component.
 */
export function findSubcircuit(comp) {
  if (!comp) return null;

  // 1. Direct ID match
  if (HIERARCHICAL_SUBCIRCUITS[comp.id]) {
    return HIERARCHICAL_SUBCIRCUITS[comp.id];
  }

  // 2. Direct Type match
  if (HIERARCHICAL_SUBCIRCUITS[comp.type]) {
    return HIERARCHICAL_SUBCIRCUITS[comp.type];
  }

  // 3. Normalized string matching
  const idLower = (comp.id || '').toLowerCase();
  const typeUpper = (comp.type || '').toUpperCase();

  if (idLower.includes('nv1') || typeUpper.includes('NV1')) {
    return HIERARCHICAL_SUBCIRCUITS.nv1_core;
  }
  if (idLower.includes('qtm')) {
    return HIERARCHICAL_SUBCIRCUITS.qtm_3d;
  }
  if (idLower.includes('adder') || idLower.includes('add')) {
    return HIERARCHICAL_SUBCIRCUITS.adder_pipe;
  }
  if (idLower.includes('xor') || typeUpper.includes('XOR')) {
    return HIERARCHICAL_SUBCIRCUITS.fa_xor1;
  }
  if (idLower.includes('nand') || typeUpper.includes('NAND')) {
    return HIERARCHICAL_SUBCIRCUITS.nand_center;
  }
  if (idLower.includes('pmos')) {
    return HIERARCHICAL_SUBCIRCUITS.pmos_1;
  }
  if (idLower.includes('nmos')) {
    return HIERARCHICAL_SUBCIRCUITS.nmos_1;
  }
  if (idLower.includes('sio2') || idLower.includes('oxide')) {
    return HIERARCHICAL_SUBCIRCUITS.sio2_dielectric;
  }
  if (typeUpper.includes('AND')) {
    return HIERARCHICAL_SUBCIRCUITS.AND;
  }
  if (typeUpper.includes('NOR')) {
    return HIERARCHICAL_SUBCIRCUITS.NOR;
  }
  if (typeUpper.includes('OR')) {
    return HIERARCHICAL_SUBCIRCUITS.OR;
  }
  if (typeUpper.includes('NOT')) {
    return HIERARCHICAL_SUBCIRCUITS.NOT;
  }
  if (typeUpper.includes('VRAM') || typeUpper.includes('DRAM')) {
    return HIERARCHICAL_SUBCIRCUITS.VRAM_BANK;
  }
  if (typeUpper.includes('RAMDAC')) {
    return HIERARCHICAL_SUBCIRCUITS.RAMDAC;
  }
  if (typeUpper.includes('AUDIO') || typeUpper.includes('DSP')) {
    return HIERARCHICAL_SUBCIRCUITS.AUDIO_DSP;
  }
  if (typeUpper.includes('PCI')) {
    return HIERARCHICAL_SUBCIRCUITS.PCI_BUS;
  }
  if (typeUpper.includes('VGA') || typeUpper.includes('BRACKET')) {
    return HIERARCHICAL_SUBCIRCUITS.VGA_BRACKET;
  }
  if (typeUpper.includes('SATURN') || typeUpper.includes('PAD')) {
    return HIERARCHICAL_SUBCIRCUITS.SATURN_PAD;
  }
  if (typeUpper.includes('SCREEN')) {
    return HIERARCHICAL_SUBCIRCUITS.VIRTUAL_SCREEN;
  }
  if (typeUpper.includes('D_FF') || typeUpper.includes('FLIP')) {
    return HIERARCHICAL_SUBCIRCUITS.D_FF;
  }
  if (typeUpper.includes('REGISTER') || typeUpper.includes('REG')) {
    return HIERARCHICAL_SUBCIRCUITS.REGISTER_8BIT;
  }
  if (typeUpper.includes('MUX')) {
    return HIERARCHICAL_SUBCIRCUITS.MUX;
  }
  if (typeUpper.includes('SEVEN_SEGMENT') || typeUpper.includes('SEG')) {
    return HIERARCHICAL_SUBCIRCUITS.SEVEN_SEGMENT;
  }
  if (typeUpper.includes('RAM')) {
    return HIERARCHICAL_SUBCIRCUITS.RAM;
  }
  if (typeUpper.includes('ROM')) {
    return HIERARCHICAL_SUBCIRCUITS.ROM;
  }

  return null;
}
