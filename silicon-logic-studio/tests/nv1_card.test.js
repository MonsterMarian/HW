// Diamond Edge 3D (NV1) board: the card is checked the way real hardware is - by what comes out of its
// connectors when a host drives the PCI bus, not by peeking at hand-set values.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine, WireState } from '../src/engine/logicEngine.js';
import { DEVICES } from '../src/engine/devices/index.js';
import { NV1_BOARD } from '../src/engine/presets/nv1Board.js';
import { PRESET_CIRCUITS } from '../src/engine/aiCopilot.js';
import { testPixel, PCI_IDS } from '../src/engine/devices/nv1Card.js';

// Small video mode so a whole frame takes ~46 us of simulated time (htotal 48, vtotal 24 at 25.17 MHz)
const TINY = { htotal: 48, hdisp: 32, hss: 36, hse: 40, vtotal: 24, vdisp: 16, vss: 18, vse: 20 };
const VCLK = (14.31818e6 * 116) / 66;
const TINY_MONITOR_MODE = { name: 'TEST 32×16', hHz: VCLK / 48, vHz: VCLK / 48 / 24, w: 32, h: 16, pclk: VCLK, hBack: 48 - 36, vBack: 24 - 18 };

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
    for (const t of ['NV1_CORE', 'RAMDAC_STG1764', 'AD1845', 'EPROM_27C256', 'PCI_EDGE', 'VGA_DB15', 'GAME_PORT']) assert.ok(types.includes(t), t);
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
  it('PCI enumeration: config space answers 104A:0008, class 03 00 00, BIOS ROM starts with 55 AA', () => {
    const e = board();
    const host = e.components.get('host');
    assert.ok(runUntil(e, () => host.status.romSignature !== undefined, 200_000), host.log.join('\n'));
    assert.equal(host.status.configId, ((PCI_IDS.device << 16) | PCI_IDS.vendor) >>> 0);
    assert.ok(host.log.some((l) => l.includes('class 0x030000')));
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
    assert.equal(e.components.get('nv1_core')._s.vid.underflows, 0, 'scan-out FIFO must never run dry');
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
});

describe('NV1 board faults behave like real hardware', () => {
  it('card not in the slot: config read ends in a master abort (FFFFFFFF)', () => {
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
    const e = board({ edit: (d) => { d.wires.push({ from: { id: 'nv1_core', pin: 'md0' }, to: { id: 'dram1', pin: 'dq' } }); } });
    const t = e._ensureTopology();
    const md0 = t.nets[e.netIndexOf('nv1_core', 'md0')];
    let conflict = false;
    runUntil(e, () => (conflict = conflict || md0.value === WireState.CONFLICT), 300_000);
    assert.ok(conflict);
  });
});
