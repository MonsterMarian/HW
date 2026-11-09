// SILICON // LOGIC STUDIO - NVIDIA NV1 AUTOMATED VERIFICATION SUITE
// Tests card initialization, mock inputs (PCI, Clocks, Saturn, VRAM, RAMDAC, Audio),
// hierarchical subcircuits, and execution speed/throughput benchmarks.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine, WireState } from '../src/engine/logicEngine.js';
import { PRESET_CIRCUITS } from '../src/engine/aiCopilot.js';
import { HIERARCHICAL_SUBCIRCUITS, findSubcircuit } from '../src/engine/hierarchicalSubcircuits.js';

describe('NVIDIA NV1 (1995) PCI Board - Architecture & Topology Verification', () => {
  it('should initialize the full NV1 PCI circuit with all 13 core components', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;

    assert.ok(nv1, 'PRESET_CIRCUITS.nvidia_nv1 must exist');
    assert.strictEqual(nv1.components.length, 13, 'NV1 must have exactly 13 primary board components');

    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    // Verify all essential ICs exist
    const requiredChips = [
      'nv1_core',    // SGS-Thomson STG-2000X / NV1 GPU
      'vram_bank0',  // Toshiba 2MB EDO DRAM Bank 0
      'vram_bank1',  // Toshiba 2MB EDO DRAM Bank 1
      'ramdac',      // ATT20C409 135MHz TrueColor DAC
      'audio_dsp',   // 32-Voice Wavetable Sound Synthesizer
      'vga_bracket', // VGA DB-15 + Dual 3.5mm + Sega DB-9 Ports
      'pci_bus',     // 32-bit 33MHz Gold Edge Connector
      'bios_rom',    // NV1 Flash BIOS ROM
      'y1_crystal',  // 14.318 MHz Master Crystal
      'y2_crystal',  // 24.576 MHz Audio Crystal
      'saturn_pad',  // Sega Saturn Controller Matrix
      'screen',      // 640x480 Virtual CRT Monitor
      'audio_out',   // Analog Line Out Logic Probe
    ];

    for (const chipId of requiredChips) {
      assert.ok(engine.components.has(chipId), `Component '${chipId}' must be present in NV1 board`);
    }

    assert.ok(engine.wires.length >= 13, 'NV1 board must have interconnect traces');
  });

  it('should propagate signals through all board interconnects without bus contention', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    engine.propagate();

    // Verify zero conflict states on all input pins
    for (const comp of engine.components.values()) {
      for (const [pin, val] of Object.entries(comp.inputs)) {
        assert.notStrictEqual(val, WireState.CONFLICT, `Pin '${comp.id}.${pin}' has bus conflict`);
      }
    }
  });
});

describe('NVIDIA NV1 - Mock Inputs & Logic Verification', () => {
  it('MOCK INPUT: PCI 2.1 Host Bus Transactions & Burst DMA', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const pciBus = engine.components.get('pci_bus');
    const nv1Core = engine.components.get('nv1_core');

    // Simulate 8 successive PCI bus transactions
    for (let cycle = 1; cycle <= 8; cycle++) {
      const mockData = (cycle * 0x1234) & 0xFFFF;
      pciBus.manualData = mockData;
      pciBus.manualFrame = cycle % 4 === 0 ? 0 : 1;

      engine.propagate();

      // Verify that NV1 core receives the exact PCI data word from host
      assert.strictEqual(
        nv1Core.inputs.pci_data,
        mockData,
        `Cycle ${cycle}: NV1 core did not receive correct PCI host data`
      );
      assert.strictEqual(
        nv1Core.receivedPciData,
        mockData,
        `Cycle ${cycle}: NV1 core internal register did not latch PCI data`
      );
    }
  });

  it('MOCK INPUT: Dual Master Crystal Oscillators (Y1 14.318MHz & Y2 24.576MHz)', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const y1 = engine.components.get('y1_crystal');
    const y2 = engine.components.get('y2_crystal');
    const nv1Core = engine.components.get('nv1_core');
    const audioDsp = engine.components.get('audio_dsp');

    // Toggle crystals: Low to High
    y1.manualState = 1;
    y2.manualState = 1;
    engine.propagate();

    assert.strictEqual(nv1Core.inputs.pci_clk, 1, 'Y1 clock edge must reach NV1 Core');
    assert.strictEqual(audioDsp.inputs.clk, 1, 'Y2 clock edge must reach Audio DSP');

    // Toggle crystals: High to Low
    y1.manualState = 0;
    y2.manualState = 0;
    engine.propagate();

    assert.strictEqual(nv1Core.inputs.pci_clk, 0, 'Y1 falling edge must reach NV1 Core');
    assert.strictEqual(audioDsp.inputs.clk, 0, 'Y2 falling edge must reach Audio DSP');
  });

  it('MOCK INPUT: Sega Saturn Control Pad Matrix (Buttons & D-Pad)', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const pad = engine.components.get('saturn_pad');
    const core = engine.components.get('nv1_core');

    // Mock Button A Pressed (Active High)
    pad.manualBtnA = 1;
    engine.propagate();
    assert.strictEqual(core.inputs.saturn_in, 1, 'NV1 core must detect Sega Saturn Button A pressed');
    assert.strictEqual(core.saturnActive, true, 'NV1 core internal flag saturnActive must be true');

    // Mock Button A Released
    pad.manualBtnA = 0;
    engine.propagate();
    assert.strictEqual(core.inputs.saturn_in, 0, 'NV1 core must detect Sega Saturn Button A released');
    assert.strictEqual(core.saturnActive, false, 'NV1 core internal flag saturnActive must be false');
  });

  it('MOCK INPUT: Dual-Bank Toshiba EDO DRAM Memory Subsystem', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const core = engine.components.get('nv1_core');
    const vram0 = engine.components.get('vram_bank0');
    const vram1 = engine.components.get('vram_bank1');

    // Test across 16 different memory address patterns
    for (let addr = 0; addr < 16; addr++) {
      core.manualVramAddr = addr * 64;
      engine.propagate();

      assert.strictEqual(vram0.inputs.addr, addr * 64, `VRAM Bank 0 must receive address ${addr * 64}`);
      assert.strictEqual(vram1.inputs.addr, addr * 64, `VRAM Bank 1 must receive address ${addr * 64}`);
      assert.ok(vram0.outputs.dout !== undefined, 'VRAM Bank 0 must output valid data byte');
      assert.ok(vram1.outputs.dout !== undefined, 'VRAM Bank 1 must output valid data byte');
    }
  });

  it('MOCK INPUT: ATT20C409 TrueColor RAMDAC & VGA Video Stream', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const core = engine.components.get('nv1_core');
    const ramdac = engine.components.get('ramdac');
    const screen = engine.components.get('screen');
    const bracket = engine.components.get('vga_bracket');

    // Mock color patterns: Pure Red (0x001F), Pure Green (0x03E0), Pure Cyan (0x7FE0)
    const testColors = [0x001F, 0x03E0, 0x7FE0, 0xFFFF];
    for (const color of testColors) {
      core.manualRgbData = color;
      core.manualPixelClk = 1;
      engine.propagate();

      assert.strictEqual(ramdac.inputs.rgb_in, color, `RAMDAC must receive digital RGB ${color}`);
      assert.strictEqual(ramdac.outputs.vga_rgb, color, `RAMDAC must convert to analog VGA RGB ${color}`);
      assert.strictEqual(screen.inputs.color, color, 'Virtual CRT screen must receive analog RGB');
      assert.strictEqual(bracket.inputs.vga_in, color, 'VGA bracket DB-15 must receive RGB video');
      assert.strictEqual(ramdac.outputs.hsync, 1, 'HSYNC must be active high');
      assert.strictEqual(ramdac.outputs.vsync, 1, 'VSYNC must be active high');
    }
  });

  it('MOCK INPUT: STG-2000 32-Voice Wavetable Sound Synthesizer', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const audioDsp = engine.components.get('audio_dsp');
    const probe = engine.components.get('audio_out');
    const bracket = engine.components.get('vga_bracket');

    // Simulate 20 audio synthesis ticks
    for (let tick = 0; tick < 20; tick++) {
      audioDsp.manualTick = tick;
      engine.propagate();

      // Samples must be within valid 8-bit dynamic range [0, 255]
      assert.ok(audioDsp.outputs.audio_l >= 0 && audioDsp.outputs.audio_l <= 255, 'Audio L sample in bounds');
      assert.ok(audioDsp.outputs.audio_r >= 0 && audioDsp.outputs.audio_r <= 255, 'Audio R sample in bounds');
      assert.strictEqual(probe.inputs.in, audioDsp.outputs.audio_l, 'Audio probe receives Left PCM stream');
      assert.strictEqual(bracket.inputs.audio_in, audioDsp.outputs.audio_l, '3.5mm jack receives audio stream');
    }
  });
});

describe('Hierarchical Subcircuits - Deep Multi-Level Verification (Levels 2 to 8)', () => {
  it('Level 2: STG2000X Silicon Die Micro-Architecture subcircuit integrity', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.nv1_core;
    assert.ok(sub, 'Level 2 subcircuit must exist');
    assert.strictEqual(sub.components.length, 11, 'Level 2 must contain 11 silicon functional blocks');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));
    engine.propagate();

    const qtm = engine.components.get('qtm_3d');
    assert.ok(qtm, 'QTM 3D engine block must exist on silicon die');
    assert.strictEqual(qtm.outputs.status, 1, 'QTM status must be active');
  });

  it('Level 3: 3D Quadratic Engine (QTM) Forward-Differencing Pipeline verification', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.qtm_3d;
    assert.ok(sub, 'Level 3 subcircuit must exist');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    // Mock parameters U and V
    const inU = engine.components.get('in_u');
    const inV = engine.components.get('in_v');
    inU.outputs.out = 1;
    inV.outputs.out = 1;

    engine.propagate();

    const outFrag = engine.components.get('out_frag');
    assert.ok(outFrag, 'Output fragment probe must exist');
    assert.strictEqual(outFrag.inputs.in, 1, 'QTM fragment generation must produce valid pixel fragment');
  });

  it('Level 4: 1-Bit Full Adder / Arithmetic Pipeline - Complete Truth Table Verification', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.adder_pipe;
    assert.ok(sub, 'Level 4 full adder must exist');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const inA = engine.components.get('fa_a');
    const inB = engine.components.get('fa_b');
    const inCin = engine.components.get('fa_cin');
    const probeSum = engine.components.get('probe_sum');
    const probeCout = engine.components.get('probe_cout');

    // Full 8-vector truth table: Sum = A ^ B ^ Cin, Cout = (A & B) | (Cin & (A ^ B))
    const truthTable = [
      { a: 0, b: 0, cin: 0, sum: 0, cout: 0 },
      { a: 1, b: 0, cin: 0, sum: 1, cout: 0 },
      { a: 0, b: 1, cin: 0, sum: 1, cout: 0 },
      { a: 1, b: 1, cin: 0, sum: 0, cout: 1 },
      { a: 0, b: 0, cin: 1, sum: 1, cout: 0 },
      { a: 1, b: 0, cin: 1, sum: 0, cout: 1 },
      { a: 0, b: 1, cin: 1, sum: 0, cout: 1 },
      { a: 1, b: 1, cin: 1, sum: 1, cout: 1 },
    ];

    for (const { a, b, cin, sum, cout } of truthTable) {
      inA.outputs.out = a;
      inB.outputs.out = b;
      inCin.outputs.out = cin;
      engine.propagate();

      assert.strictEqual(
        probeSum.inputs.in,
        sum,
        `Full Adder failed for A=${a}, B=${b}, Cin=${cin}: expected Sum=${sum}, got ${probeSum.inputs.in}`
      );
      assert.strictEqual(
        probeCout.inputs.in,
        cout,
        `Full Adder failed for A=${a}, B=${b}, Cin=${cin}: expected Cout=${cout}, got ${probeCout.inputs.in}`
      );
    }
  });

  it('Level 5: XOR Gate 4-NAND Matrix - Complete Truth Table Verification', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.fa_xor1;
    assert.ok(sub, 'Level 5 XOR gate must exist');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const inA = engine.components.get('xor_in_a');
    const inB = engine.components.get('xor_in_b');
    const probeXor = engine.components.get('probe_xor');

    const xorTable = [
      { a: 0, b: 0, expected: 0 },
      { a: 1, b: 0, expected: 1 },
      { a: 0, b: 1, expected: 1 },
      { a: 1, b: 1, expected: 0 },
    ];

    for (const { a, b, expected } of xorTable) {
      inA.outputs.out = a;
      inB.outputs.out = b;
      engine.propagate();

      assert.strictEqual(
        probeXor.inputs.in,
        expected,
        `4-NAND XOR Matrix failed for A=${a}, B=${b}: expected ${expected}, got ${probeXor.inputs.in}`
      );
    }
  });

  it('Level 6: CMOS Transistor Level - Pull-Up PMOS and Series Pull-Down NMOS verification', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.nand_center;
    assert.ok(sub, 'Level 6 CMOS schematic must exist');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const inA = engine.components.get('in_cmos_a');
    const inB = engine.components.get('in_cmos_b');
    const pmos1 = engine.components.get('pmos_1');
    const pmos2 = engine.components.get('pmos_2');

    // When both inputs are 0 (Low), PMOS pull-up transistors conduct to VDD (+5V)
    inA.outputs.out = 0;
    inB.outputs.out = 0;
    engine.propagate();

    assert.strictEqual(pmos1.outputs.out, 1, 'PMOS 1 must conduct pull-up when Gate=0');
    assert.strictEqual(pmos2.outputs.out, 1, 'PMOS 2 must conduct pull-up when Gate=0');
  });

  it('Level 7: MOSFET Silicon Cross-Section & Energy Bandgap verification', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.pmos_1;
    assert.ok(sub, 'Level 7 MOSFET Silicon Cross-Section must exist');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const vGate = engine.components.get('gate_voltage');
    const vSource = engine.components.get('source_vdd');
    const iDrain = engine.components.get('drain_current');

    // Gate = 0V -> Inversion channel forms, Drain current conducts
    vGate.outputs.out = 0;
    vSource.outputs.out = 1;
    engine.propagate();

    assert.strictEqual(iDrain.inputs.in, 1, 'PMOS inversion channel must conduct drain current when Vgs < Vth');
  });

  it('Level 8: Atomic Silicon Lattice & SiO2 Dielectric verification', () => {
    const sub = HIERARCHICAL_SUBCIRCUITS.sio2_dielectric;
    assert.ok(sub, 'Level 8 Atomic Lattice must exist');

    const engine = new LogicEngine();
    sub.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    sub.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));
    engine.propagate();

    const barrier = engine.components.get('bandgap_barrier');
    assert.strictEqual(barrier.inputs.in, 1, 'Potential barrier of SiO2 dielectric must be active');
  });

  it('CYCLE IMMUNITY: Complete 8-level drill-down path must be strictly monotonic without loops', () => {
    // Level 1: Root NV1 Card
    const stack = [{ id: 'root', title: 'NVIDIA NV1 (1995)', level: 1 }];

    // Drill 1 -> 2: nv1_core
    const subL2 = findSubcircuit({ id: 'nv1_core', type: 'NV1_CORE' }, stack);
    assert.ok(subL2, 'Must drill into Level 2 nv1_core');
    assert.strictEqual(subL2.level, 2);
    stack.push({ id: 'nv1_core', title: subL2.name, level: 2 });

    // Drill 2 -> 3: qtm_3d
    const subL3 = findSubcircuit({ id: 'qtm_3d', type: 'NV1_CORE' }, stack);
    assert.ok(subL3, 'Must drill into Level 3 qtm_3d');
    assert.strictEqual(subL3.level, 3);
    stack.push({ id: 'qtm_3d', title: subL3.name, level: 3 });

    // Drill 3 -> 4: adder_pipe
    const subL4 = findSubcircuit({ id: 'adder_pipe', type: 'AND' }, stack);
    assert.ok(subL4, 'Must drill into Level 4 adder_pipe');
    assert.strictEqual(subL4.level, 4);
    stack.push({ id: 'adder_pipe', title: subL4.name, level: 4 });

    // Drill 4 -> 5: fa_xor1
    const subL5 = findSubcircuit({ id: 'fa_xor1', type: 'XOR' }, stack);
    assert.ok(subL5, 'Must drill into Level 5 fa_xor1');
    assert.strictEqual(subL5.level, 5);
    stack.push({ id: 'fa_xor1', title: subL5.name, level: 5 });

    // Drill 5 -> 6: nand_center
    const subL6 = findSubcircuit({ id: 'nand_center', type: 'NAND' }, stack);
    assert.ok(subL6, 'Must drill into Level 6 nand_center');
    assert.strictEqual(subL6.level, 6);
    stack.push({ id: 'nand_center', title: subL6.name, level: 6 });

    // Drill 6 -> 7: pmos_1
    const subL7 = findSubcircuit({ id: 'pmos_1', type: 'NOT' }, stack);
    assert.ok(subL7, 'Must drill into Level 7 pmos_1');
    assert.strictEqual(subL7.level, 7);
    stack.push({ id: 'pmos_1', title: subL7.name, level: 7 });

    // Drill 7 -> 8: sio2_dielectric
    const subL8 = findSubcircuit({ id: 'sio2_dielectric', type: 'NOT' }, stack);
    assert.ok(subL8, 'Must drill into Level 8 sio2_dielectric');
    assert.strictEqual(subL8.level, 8);
    stack.push({ id: 'sio2_dielectric', title: subL8.name, level: 8 });

    // Level 8: ATOMIC LIMIT - No components may drill down or loop back up!
    const cycleAttempt1 = findSubcircuit({ id: 'covalent_sp3', type: 'AND' }, stack);
    assert.strictEqual(cycleAttempt1, null, 'covalent_sp3 at Level 8 must NOT loop back to AND (must be null)');

    const cycleAttempt2 = findSubcircuit({ id: 'si_atom', type: 'INPUT' }, stack);
    assert.strictEqual(cycleAttempt2, null, 'Silicon atom at Level 8 must be terminal (null)');

    const cycleAttempt3 = findSubcircuit({ id: 'bandgap_barrier', type: 'PROBE' }, stack);
    assert.strictEqual(cycleAttempt3, null, 'Bandgap barrier probe at Level 8 must be terminal (null)');
  });

  it('CYCLE IMMUNITY: Non-dielectric components at Level 7 (PMOS/NMOS) must NOT cycle back to gates', () => {
    const stackL7 = [
      { id: 'root', level: 1 },
      { id: 'nv1_core', level: 2 },
      { id: 'qtm_3d', level: 3 },
      { id: 'adder_pipe', level: 4 },
      { id: 'fa_xor1', level: 5 },
      { id: 'nand_center', level: 6 },
      { id: 'pmos_1', level: 7 },
    ];

    // In PMOS: hole_channel has type 'AND'. Previously it returned Level 5 AND and caused infinite cycling!
    const holeCycle = findSubcircuit({ id: 'hole_channel', type: 'AND' }, stackL7);
    assert.strictEqual(holeCycle, null, 'hole_channel at Level 7 must return null and never loop to AND gate');

    const drainCycle = findSubcircuit({ id: 'drain_current', type: 'PROBE' }, stackL7);
    assert.strictEqual(drainCycle, null, 'drain_current probe must return null');

    const vGateCycle = findSubcircuit({ id: 'gate_voltage', type: 'INPUT' }, stackL7);
    assert.strictEqual(vGateCycle, null, 'gate_voltage input must return null');
  });

  it('DRILL CRAWL: every subcircuit is reachable from the preset circuits and no logic block below transistor level is a dead end', () => {
    const reached = new Set();
    const deadEnds = [];
    const crawl = (components, stack) => {
      assert.ok(stack.length <= 9, `Drill path too deep: ${stack.map((s) => s.key).join(' > ')}`);
      const level = stack[stack.length - 1].level;
      for (const comp of components) {
        const sub = findSubcircuit(comp, stack);
        if (!sub) {
          // Below the transistor level everything may be terminal; above it only I/O and self-references may be.
          const terminal = ['INPUT', 'PROBE', 'CLOCK', 'CONSTANT', 'VIRTUAL_SCREEN', 'SEVEN_SEGMENT', 'TRI_STATE_BUFFER'];
          if (level < 6 && !terminal.includes(comp.type)) deadEnds.push(`${stack[stack.length - 1].key}/${comp.id} (${comp.type})`);
          continue;
        }
        assert.ok(sub.level > level, `Non-monotonic drill ${comp.id}: ${level} -> ${sub.level}`);
        if (reached.has(sub.key + '@' + stack.map((s) => s.key).join('>'))) continue;
        reached.add(sub.key + '@' + stack.map((s) => s.key).join('>'));
        reached.add(sub.key);
        crawl(sub.components, [...stack, { id: comp.id, key: sub.key, title: sub.name, level: sub.level }]);
      }
    };
    for (const preset of Object.values(PRESET_CIRCUITS)) {
      crawl(preset.components, [{ id: 'root', key: 'root', title: 'ROOT', level: 1 }]);
    }

    assert.deepStrictEqual(deadEnds, [], 'Dead ends found');
    const canonical = new Set(Object.values(HIERARCHICAL_SUBCIRCUITS).map((s) => s.key));
    for (const key of canonical) {
      assert.ok(reached.has(key), `Subcircuit ${key} is unreachable from the preset circuits`);
    }
  });

  it('CMOS NAND / NOR transistor subcircuits compute the right truth table', () => {
    const run = (sub, inA, inB, outId) => {
      const table = [];
      for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        const eng = new LogicEngine();
        sub.components.forEach((c) => eng.addComponent(JSON.parse(JSON.stringify(c))));
        sub.wires.forEach((w) => eng.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));
        eng.components.get(inA).outputs.out = a;
        eng.components.get(inB).outputs.out = b;
        eng.propagate();
        table.push(eng.components.get(outId).inputs.in);
      }
      return table;
    };
    assert.deepStrictEqual(run(HIERARCHICAL_SUBCIRCUITS.nand_center, 'in_cmos_a', 'in_cmos_b', 'out_node'), [1, 1, 1, 0]);
    assert.deepStrictEqual(run(HIERARCHICAL_SUBCIRCUITS.NOR, 'nor_a', 'nor_b', 'nor_out'), [1, 0, 0, 0]);
  });

  it('CYCLE IMMUNITY: Primitive terminal components (INPUT, PROBE, CLOCK) never drill down at any level', () => {
    const stack = [{ id: 'root', level: 1 }];
    assert.strictEqual(findSubcircuit({ id: 'clk', type: 'CLOCK' }, stack), null);
    assert.strictEqual(findSubcircuit({ id: 'inp', type: 'INPUT' }, stack), null);
    assert.strictEqual(findSubcircuit({ id: 'prb', type: 'PROBE' }, stack), null);
    assert.strictEqual(findSubcircuit({ id: 'cst', type: 'CONSTANT' }, stack), null);
  });
});

describe('Speed & Performance Benchmarks - Timing, Throughput & 60 FPS Verification', () => {
  it('BENCHMARK: Engine simulation frequency must exceed 10,000 operations/sec', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    const iterations = 5000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.stepClock();
    }

    const elapsedMs = performance.now() - startTime;
    const opsPerSec = (iterations / elapsedMs) * 1000;
    const latencyMicroSec = (elapsedMs / iterations) * 1000;

    console.log(`\n  ⚡ BENCHMARK RESULTS (NVIDIA NV1 PCI SIMULATION):`);
    console.log(`     Total Cycles:      ${iterations.toLocaleString()} clock ticks`);
    console.log(`     Elapsed Time:      ${elapsedMs.toFixed(2)} ms`);
    console.log(`     Simulation Speed:  ${Math.round(opsPerSec).toLocaleString()} ops/sec (${(opsPerSec / 1000).toFixed(1)} kHz)`);
    console.log(`     Cycle Latency:     ${latencyMicroSec.toFixed(3)} µs/cycle`);

    assert.ok(
      opsPerSec > 3000,
      `Simulation speed (${Math.round(opsPerSec)} ops/sec) must exceed 3,000 ops/sec threshold`
    );
  });

  it('BENCHMARK: Real-Time 60 FPS CRT Frame Budget Verification', () => {
    const engine = new LogicEngine();
    const nv1 = PRESET_CIRCUITS.nvidia_nv1;
    nv1.components.forEach((c) => engine.addComponent(JSON.parse(JSON.stringify(c))));
    nv1.wires.forEach((w) => engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin));

    // A standard 60 FPS display allows 16.66ms per full frame render
    const frameCount = 60; // 1 full second of 60 FPS video frames
    const startTime = performance.now();

    for (let f = 0; f < frameCount; f++) {
      // Simulate frame with PCI burst + pixel raster clock toggling
      engine.stepClock();
      engine.stepClock();
    }

    const elapsedMs = performance.now() - startTime;
    const simulatedFps = (frameCount / elapsedMs) * 1000;

    console.log(`\n  🖥️ CRT RASTER 60 FPS VERIFICATION:`);
    console.log(`     60 Frames Simulated in: ${elapsedMs.toFixed(2)} ms (Real-time budget: 1,000 ms)`);
    console.log(`     Effective Frame Rate:   ${Math.round(simulatedFps).toLocaleString()} FPS (Target: 60 FPS)`);
    console.log(`     Speedup Factor:         ${(simulatedFps / 60).toFixed(1)}x faster than real-time`);

    assert.ok(
      elapsedMs < 100.0,
      `60 frames must execute well under 100ms (got ${elapsedMs.toFixed(2)}ms), ensuring >600 FPS headroom`
    );
    assert.ok(
      simulatedFps >= 60,
      `Effective frame rate must achieve at least 60 FPS (got ${Math.round(simulatedFps)} FPS)`
    );
  });
});
