// Diamond Edge 3D (NV1) board: the card is checked the way real hardware is - by what comes out of its
// connectors when a host drives the PCI bus, not by peeking at hand-set values.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine, WireState } from '../src/engine/logicEngine.js';
import { DEVICES } from '../src/engine/devices/index.js';
import { NV1_BOARD } from '../src/engine/presets/nv1Board.js';
import { PRESET_CIRCUITS } from '../src/engine/aiCopilot.js';
import { testPixel, PCI_IDS } from '../src/engine/devices/nv1Card.js';

// Small video mode so a whole frame takes ~61 us of simulated time (htotal 64, vtotal 24 at 25.2 MHz). The front porch
// (12 pixels) has to be longer than the pipeline of the Palette-DAC (8 pixels), as it is in real modes (640x480: 16).
const TINY = { htotal: 64, hdisp: 32, hss: 44, hse: 52, vtotal: 24, vdisp: 16, vss: 18, vse: 20 };
const VCLK = (12.096e6 * 100) / 48; // dot clock of the Palette-DAC: 12.096 MHz x 100 / (12 x 4) = 25.2 MHz
const TINY_MONITOR_MODE = { name: 'TEST 32×16', hHz: VCLK / 64, vHz: VCLK / 64 / 24, w: 32, h: 16, pclk: VCLK, hBack: 64 - 44, vBack: 24 - 18 };

function board({ tiny = true, edit } = {}) {
  const def = JSON.parse(JSON.stringify(NV1_BOARD));
  if (edit) edit(def);
  const e = new LogicEngine();
  e.loadCircuit(def);
  if (tiny) {
    e.components.get('host').driverMode = TINY;
    if (e.components.get('monitor')) e.components.get('monitor').modes = [TINY_MONITOR_MODE];
  }
  return e;
}

function runUntil(e, cond, maxNs) {
  const end = e.simTime + maxNs;
  while (e.simTime < end) {
    e.step();
    if (cond()) return true;
  }
  return false;
}

describe('NV1 board netlist', () => {
  it('is the preset loaded by the app', () => {
    assert.equal(PRESET_CIRCUITS.nvidia_nv1, NV1_BOARD);
  });

  it('contains the real parts of a Diamond Edge 3D 2120', () => {
    const types = NV1_BOARD.components.map((c) => c.type);
    for (const t of ['NV1_CORE', 'RAMDAC_STG1764', 'AD1845', 'EPROM_27C256', 'PCI_EDGE', 'VGA_DB15', 'GAME_PORT', 'BUS_SWITCH_32', 'SEGA_ASIC']) assert.ok(types.includes(t), t);
    assert.equal(types.filter((t) => t === 'SEGA_HEADER').length, 2, 'J5 PORT A, J6 PORT B');
    assert.equal(NV1_BOARD.components.find((c) => c.type === 'CRYSTAL').freqHz, 12.096e6, 'Y1 is marked 12.096 MHz');
    assert.equal(types.filter((t) => t === 'DRAM_256K16').length, 4, '2 MB = 4x 256Kx16 (2 soldered + 2 socketed)');
    assert.equal(types.filter((t) => t === 'AUDIO_JACK').length, 3, 'line in, line out, mic');
    assert.equal(types.filter((t) => t === 'CRYSTAL').length, 1, 'one crystal: the codec is clocked by ACLK from the RAMDAC');
    assert.ok(NV1_BOARD.wires.some((w) => w.from.id === 'ramdac' && w.from.pin === 'aclk' && w.to.id === 'codec'));
    assert.match(DEVICES.NV1_CORE.meta.part, /STG2000X/);
    assert.match(DEVICES.RAMDAC_STG1764.meta.part, /STG1764X/);
  });

  it('every wire ends on a pin that exists on its part', () => {
    const e = board();
    for (const w of e.wires) {
      for (const end of [w.from, w.to]) {
        const c = e.components.get(end.id);
        assert.ok(c, `missing part ${end.id}`);
        assert.ok(end.pin in c.inputs || end.pin in c.outputs, `${end.id} has no pin ${end.pin}`);
      }
    }
  });

  it('runs without any short circuit or floating clock on the card', () => {
    const e = board();
    const t = e._ensureTopology();
    const shorts = new Set();
    for (let i = 0; i < 60000; i++) {
      e.step();
      if (i % 50 === 0) for (const n of t.nets) if (n.value === WireState.CONFLICT) shorts.add(n.pins.map((p) => `${p.comp.id}.${p.pin}`).join(' / '));
    }
    assert.deepEqual([...shorts], []);
    assert.equal(e.oscillating, false);
  });
});

describe('NV1 board in operation', () => {
  it('PCI enumeration: two functions (VGA 104A:0008 class 03 00 00, NV 104A:0009 class 04 80 00), 32 MB BAR, BIOS ROM 55 AA', () => {
    const e = board();
    const host = e.components.get('host');
    assert.ok(runUntil(e, () => host.status.romSignature !== undefined, 200_000), host.log.join('\n'));
    assert.equal(host.status.configId, ((PCI_IDS.device << 16) | PCI_IDS.vendor) >>> 0);
    assert.ok(host.log.some((l) => l.includes('class 0x030000')));
    // STG2000 datasheet, appendix A: multi-function header, function 1 = NV, functions 2-7 do not answer
    assert.equal(host.status.headerType, 0x80);
    assert.equal(host.status.nvId, 0x0009104A);
    assert.ok(host.log.some((l) => l.includes('class 0x048000')));
    assert.deepEqual(host.status.functions, [0, 1]);
    assert.equal(host.status.bar0Size, 32 * 1024 * 1024);
    assert.equal(host.status.vgaBar0, 0, 'the VGA function has no base address registers');
    assert.equal(host.status.romSignature, 0xAA55);
    const rom = e.components.get('bios_rom').rom;
    assert.equal(rom.reduce((a, b) => (a + b) & 0xFF, 0), 0, 'option ROM checksum must be 0');
    assert.equal(host.status.aborts, 0);
  });

  it('frame buffer written over PCI ends up in the four DRAM chips (16 bits each of every 64-bit word)', () => {
    const e = board();
    const host = e.components.get('host');
    assert.ok(runUntil(e, () => host.status.readBack !== undefined, 2_000_000), `phase ${host.status.phase}`);
    const drams = [0, 1, 2, 3].map((k) => e.components.get(`dram${k}`));
    for (let y = 0; y < TINY.vdisp; y++) {
      for (let x = 0; x < TINY.hdisp; x++) {
        const byte = y * TINY.hdisp * 2 + x * 2;
        const word = byte >> 3;
        const chip = (byte >> 1) & 3;
        assert.equal(drams[chip].mem[word], testPixel(x, y, TINY.hdisp, TINY.vdisp), `pixel ${x},${y}`);
      }
    }
    // read-back through PCI -> NV1 -> DRAM -> NV1 -> PCI
    const y = Math.floor(TINY.vdisp / 2);
    assert.equal(host.status.readBack, (testPixel(2, y, 32, 16) | (testPixel(3, y, 32, 16) << 16)) >>> 0);
    // refresh: a CAS-before-RAS cycle at least every 15.6 us (512 rows in 8 ms)
    const r0 = drams[0]._d.refreshes;
    runUntil(e, () => false, 100_000);
    const perUs = (drams[0]._d.refreshes - r0) / 100;
    assert.ok(perUs >= 1 / 15.6 - 0.01, `refresh rate ${perUs.toFixed(3)} per us`);
    // ...and no faster than every 776 periods of the memory clock: NV1 counts every MCLKx2 edge exactly once
    assert.ok(perUs <= 1 / 15.5 + 0.011, `refresh rate ${perUs.toFixed(3)} per us`);
    assert.ok(drams.every((d) => d._d.refreshes === drams[0]._d.refreshes), 'all chips refreshed together');
  });

  it('monitor rebuilds the picture only from the analog RGB voltages and the sync timing', () => {
    const e = board();
    const host = e.components.get('host');
    const mon = e.components.get('monitor');
    assert.ok(runUntil(e, () => host.status.readBack !== undefined, 2_000_000));
    const f0 = mon.frames;
    assert.ok(runUntil(e, () => mon.frames >= f0 + 3, 1_000_000), mon.status);
    assert.match(mon.status, /TEST/);
    let bad = 0;
    for (let y = 0; y < TINY.vdisp; y++) {
      for (let x = 0; x < TINY.hdisp; x++) {
        const px = testPixel(x, y, TINY.hdisp, TINY.vdisp);
        const o = (y * 640 + x) * 4;
        const exp = [(px >> 10) & 31, (px >> 5) & 31, px & 31].map((c5) => Math.round((Math.round((c5 / 31) * 700) / 1000 / 0.7) * 255));
        for (let k = 0; k < 3; k++) if (Math.abs(mon.image[o + k] - exp[k]) > 1) bad++;
      }
    }
    assert.equal(bad, 0, 'monitor picture differs from the frame buffer');
    assert.equal(e.components.get('nv1_core')._s.vid.underflows, 0, 'the pixel store of the DAC must never run dry');
    const dac = e.components.get('ramdac')._c;
    assert.deepEqual([dac.underflows, dac.overflows], [0, 0], 'the 128-bit pixel store holds at most two loads');
    assert.ok(dac.resets >= 3, 'BLANK# 0-1-0 empties the pixel store once per frame');
  });

  it('codec interface: 8-bit data, 2 address bits, AUR#/AUW# strobes, no DRQ/DACK (STG2000 datasheet ch. 6)', () => {
    const pinsOf = (id) => NV1_BOARD.wires.filter((w) => w.from.id === id || w.to.id === id).map((w) => (w.from.id === id ? w.from.pin : w.to.pin));
    assert.deepEqual(pinsOf('codec').filter((p) => /drq|dack/i.test(p)), []);
    for (const p of ['d', 'a', 'wr_n', 'rd_n', 'pd_n', 'xtal']) assert.ok(pinsOf('codec').includes(p), p);
    const e = board();
    const codec = e.components.get('codec');
    assert.ok(runUntil(e, () => codec._c?.samples > 3, 5_000_000));
    // NV1 programmed the codec through its index registers: 48 kHz 16 bit stereo, playback enabled in PIO mode
    assert.equal(codec._c.reg[8], 0x5C);
    assert.equal(codec._c.reg[9], 0x41);
    assert.equal(codec._c.underruns, 0);
  });

  it('audio: wavetable voices reach the line-out jack as an analog signal at 48 kHz', () => {
    const e = board();
    const codec = e.components.get('codec');
    const spk = e.components.get('speakers');
    assert.ok(runUntil(e, () => codec._c?.samples > 120, 5_000_000));
    assert.ok(spk.maxAbs > 0.15, `line out peak ${spk.maxAbs} V`);
    const lvls = new Set(spk.scope.map((s) => s[0]));
    assert.ok(lvls.size > 20, 'line out must be a changing waveform');
  });

  it('Saturn pad: a pressed button is seen by the driver through TH/TR scanning and a PCI register read', () => {
    const e = board();
    const host = e.components.get('host');
    e.components.get('saturn_pad').buttons.a = true;
    assert.ok(runUntil(e, () => host.status.phase === 'running' && host.status.pad !== 0xFFFF, 3_000_000), `pad ${host.status.pad}`);
    // A is D2 in the TH=1/TR=0 group (bits 4..7) -> bit 6 low
    assert.equal(host.status.pad & (1 << 6), 0);
    assert.equal(host.status.pad | (1 << 6), 0xFFFF, 'no other button pressed');
  });
  it('every edge of the 100 MHz memory clock is visible when stepping: the net toggles exactly every half period', () => {
    const e = board();
    const half = 1e9 / ((12.096e6 * 91) / 11) / 2;
    runUntil(e, () => e.pinValue('nv1_core', 'mclkx2') === 1, 10_000);
    let prev = 1; let last = e.simTime; let toggles = 0; let wrong = 0;
    for (let i = 0; i < 3000; i++) {
      e.step();
      const v = e.pinValue('nv1_core', 'mclkx2');
      if (v === prev) continue;
      if (Math.abs(e.simTime - last - half) > 1e-6) wrong++;
      prev = v; last = e.simTime; toggles++;
    }
    assert.ok(toggles > 1500, `toggles ${toggles}`);
    assert.equal(wrong, 0, 'a falling edge must not be merged with the next rising one');
  });

  it('memory bus: EN64 splits the banks only for pixel loads, DRAM timing keeps table 3 of the STG2000 datasheet', () => {
    const e = board();
    const host = e.components.get('host');
    const pin = (p) => e.pinValue('nv1_core', p);
    const sdb = () => e.pinValue('bus_switch', 'b_lo');
    let split = 0; let joinedDiffers = 0; let loads = 0; let loadsJoined = 0;
    let prevLoad = 0; let prevRas = 1; let tRas = 0; let minHigh = Infinity; let minLow = Infinity;
    runUntil(e, () => {
      const [en64, md, load, ras] = [pin('en64'), pin('md_lo'), pin('loadclk'), pin('ras_n')];
      if (en64 === 1 && typeof md === 'number' && typeof sdb() === 'number' && md !== sdb()) split++;
      if (en64 === 0 && md !== sdb()) joinedDiffers++;
      if (load === 1 && prevLoad === 0) { loads++; if (en64 !== 1) loadsJoined++; }
      prevLoad = load;
      if (ras !== prevRas) {
        if (tRas) { if (ras === 0) minHigh = Math.min(minHigh, e.simTime - tRas); else minLow = Math.min(minLow, e.simTime - tRas); }
        tRas = e.simTime; prevRas = ras;
      }
      return host.status.phase === 'running' && loads > 400;
    }, 3_000_000);
    assert.ok(loads > 400, `pixel loads ${loads}`);
    assert.equal(loadsJoined, 0, 'every LOADCLK edge comes with EN64 = 1');
    assert.ok(split > 100, 'during a load the two banks drive different halves of the 64-bit pixel port');
    assert.equal(joinedDiffers, 0, 'with EN64 = 0 the switch makes MD and SDB one bus');
    // T = 2 periods of MCLKx2 (100.07 MHz): tRP = 2.5T - 2 ns, RAS# low at least 3.5T - 2 ns
    const T = 2e9 / ((12.096e6 * 91) / 11);
    assert.ok(minHigh >= 2.5 * T - 2 - 0.01, `RAS# precharge ${minHigh.toFixed(1)} ns`);
    assert.ok(minLow >= 3.5 * T - 2 - 0.01, `RAS# low ${minLow.toFixed(1)} ns`);
  });

  it('game port: the pad is read through port A of the Palette-DAC (indexed register 0x300) and the nvSGP chip', () => {
    const e = board();
    const host = e.components.get('host');
    e.components.get('saturn_pad').buttons.start = true;
    assert.ok(runUntil(e, () => host.status.phase === 'running' && host.status.pad !== 0xFFFF, 3_000_000));
    assert.equal(host.status.pad, 0xFFFF & ~(1 << 7), 'START is D3 of the second group');
    const dac = e.components.get('ramdac')._c;
    assert.equal(dac.dir, 0x9F, 'GP[6:5] programmed as outputs (select), GP[3:0] as inputs');
    assert.equal(e.pinValue('sega_asic', 'A TH/TR'), e.pinValue('ramdac', 'gp_sel'));
  });
});

describe('NV1 board faults behave like real hardware', () => {  it('card not in the slot: config read ends in a master abort (FFFFFFFF)', () => {
    const e = board({ edit: (d) => { d.wires = d.wires.filter((w) => !(w.from.id === 'host' || w.to.id === 'host')); } });
    const host = e.components.get('host');
    runUntil(e, () => host.status.phase === 'no card', 100_000);
    assert.equal(host.status.configId, 0xFFFFFFFF);
    assert.equal(host.status.phase, 'no card');
  });

  it('crystal Y1 missing: the RAMDAC PLL has no reference, no pixel clock, monitor sees no signal', () => {
    const e = board({ edit: (d) => { d.wires = d.wires.filter((w) => w.from.id !== 'y1_crystal'); } });
    runUntil(e, () => false, 300_000);
    const mon = e.components.get('monitor');
    assert.equal(mon.status, 'NO SIGNAL');
    assert.equal(e.components.get('dram0')._d?.writes || 0, 0, 'no memory clock -> nothing reaches the DRAM');
  });

  it('two DRAM chips wired to the same data slice: reads produce a bus conflict', () => {
    const e = board({ edit: (d) => { d.wires.push({ from: { id: 'nv1_core', pin: 'md_lo' }, to: { id: 'dram1', pin: 'dq' } }); } });
    const t = e._ensureTopology();
    const md0 = t.nets[e.netIndexOf('nv1_core', 'md_lo')];
    let conflict = false;
    runUntil(e, () => (conflict = conflict || md0.value === WireState.CONFLICT), 300_000);
    assert.ok(conflict);
  });

  it('bus switch missing: NV1 cannot reach the socketed bank, half of the frame buffer never arrives', () => {
    const e = board({ edit: (d) => { d.wires = d.wires.filter((w) => !(w.from.id === 'nv1_core' && w.to.id === 'bus_switch')); } });
    const host = e.components.get('host');
    runUntil(e, () => host.status.readBack !== undefined, 2_000_000);
    assert.ok(e.components.get('dram0')._d.writes > 0);
    assert.equal(e.components.get('dram2')._d.writes, 0);
    assert.equal(e.components.get('dram3')._d.writes, 0);
  });

  it('nvSGP missing: the game port of the DAC reads only its pull-ups, no button is seen', () => {
    const e = board({ edit: (d) => { d.wires = d.wires.filter((w) => w.from.id !== 'sega_asic' && w.to.id !== 'sega_asic'); } });
    const host = e.components.get('host');
    e.components.get('saturn_pad').buttons.a = true;
    runUntil(e, () => false, 600_000);
    assert.equal(host.status.phase, 'running');
    assert.equal(host.status.pad, 0xFFFF);
  });
});