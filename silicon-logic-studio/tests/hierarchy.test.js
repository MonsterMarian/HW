// Drill-down hierarchy: every level is a circuit the engine really simulates, and it does what the hardware does.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine, WireState } from '../src/engine/logicEngine.js';
import { HIERARCHICAL_SUBCIRCUITS as H, findSubcircuit, TERMINAL_TYPES } from '../src/engine/hierarchicalSubcircuits.js';
import { PRESET_CIRCUITS } from '../src/engine/aiCopilot.js';
import { componentDims } from '../src/engine/boardLayout.js';

const X = WireState.CONFLICT;
const Zv = WireState.HIGH_Z;
const canonical = [...new Set(Object.values(H))];

const load = (key) => {
  const e = new LogicEngine();
  e.loadCircuit(H[key]);
  return e;
};
const set = (e, vals) => {
  for (const [id, v] of Object.entries(vals)) e.components.get(id).outputs.out = v;
  e.propagate();
};
const pv = (e, id) => e.components.get(id).inputs.in; // value seen by a probe
const tick = (e) => { e.step(); e.step(); }; // one full period of the (only) clock: rising, then falling edge
const clk = (e, id, level) => { e.components.get(id).manualState = level; e.propagate(); };

describe('subcircuit data', () => {
  for (const sub of canonical) {
    it(`${sub.key}: valid netlist, readable layout, settles`, () => {
      assert.ok(Number.isInteger(sub.level) && sub.level >= 2 && sub.level <= 11, 'level');
      assert.ok(sub.name && sub.subtitle, 'name/subtitle');
      const e = load(sub.key);
      for (const wire of sub.wires) {
        for (const end of [wire.from, wire.to]) {
          const comp = e.components.get(end.id);
          assert.ok(comp, `missing part ${end.id}`);
          assert.ok(end.pin in comp.inputs || end.pin in comp.outputs, `${end.id} has no pin ${end.pin}`);
        }
      }
      const rects = sub.components.map((cmp) => ({ id: cmp.id, ...componentDims(cmp, 'schematic'), x: cmp.x, y: cmp.y }));
      for (const r of rects) assert.ok(r.x >= 40 && r.y >= 40 && r.x + r.w <= 960 && r.y + r.h <= 540, `${r.id} outside the sheet`);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const apart = a.x + a.w + 4 <= b.x || b.x + b.w + 4 <= a.x || a.y + a.h + 4 <= b.y || b.y + b.h + 4 <= a.y;
          assert.ok(apart, `${a.id} overlaps ${b.id}`);
        }
      }
      assert.equal(new Set(sub.components.map((cmp) => cmp.id)).size, sub.components.length, 'duplicate ids');
      e.run(60);
      assert.equal(e.oscillating, false);
    });
  }
});

describe('drill-down tree', () => {
  const isTerminal = (comp) => TERMINAL_TYPES.has(comp.type) && !comp.drill;

  function crawl(root) {
    const reached = new Map(); // key -> level
    const deadEnds = [];
    const visit = (circuit, stack) => {
      const level = stack[stack.length - 1].level;
      for (const comp of circuit.components) {
        const sub = findSubcircuit(comp, stack);
        if (!sub) {
          if (level <= 6 && !isTerminal(comp)) deadEnds.push(`L${level} ${stack[stack.length - 1].key}/${comp.id} (${comp.type})`);
          continue;
        }
        assert.ok(sub.level > level, `${comp.id}: level must grow (${level} -> ${sub.level})`);
        // tentýž obvod pod jiným výrobním procesem (Intel 14 nm / Samsung 8N …) vede na jiné tranzistory – projít znovu
        const proc = [...stack].reverse().map((e) => H[e.key]?.process).find(Boolean) || '';
        if (reached.has(`${sub.key}|${proc}`)) continue;
        reached.set(`${sub.key}|${proc}`, sub.level);
        reached.set(sub.key, sub.level);
        visit(sub, [...stack, { key: sub.key, level: sub.level }]);
      }
    };
    visit(root, [{ key: 'root', level: 1 }]);
    return { reached, deadEnds };
  }

  it('no dead end above the transistor level, from any preset', () => {
    const dead = Object.values(PRESET_CIRCUITS).flatMap((p) => crawl(p).deadEnds);
    assert.deepEqual(dead, []);
  });

  it('every subcircuit is reachable from the presets', () => {
    const all = new Set();
    for (const p of Object.values(PRESET_CIRCUITS)) for (const k of crawl(p).reached.keys()) all.add(k);
    assert.deepEqual(canonical.map((s) => s.key).filter((k) => !all.has(k)), []);
  });

  it('board → NV1 → CRTC → register → mux → NAND → NMOS → gate oxide → atoms', () => {
    const path = [];
    let circuit = PRESET_CIRCUITS.nvidia_nv1;
    let stack = [{ key: 'root', level: 1 }];
    for (const id of ['nv1_core', 'crtc', 'hcnt', 'mux0', 'n_a', 'nmos_1', 'gate_oxide']) {
      const comp = circuit.components.find((cmp) => cmp.id === id);
      assert.ok(comp, `${id} in ${stack[stack.length - 1].key}`);
      const sub = findSubcircuit(comp, stack);
      assert.ok(sub, `${id} leads somewhere`);
      path.push(`L${sub.level} ${sub.key}`);
      circuit = sub;
      stack = [...stack, { key: sub.key, level: sub.level }];
    }
    assert.deepEqual(path, ['L2 nv1_die', 'L3 crtc', 'L4 REGISTER_8BIT', 'L5 MUX', 'L6 NAND', 'L7 nmos_transistor', 'L8 sio2_lattice']);
    // pod atomy: atom Si → jádro ²⁸Si → proton → kvarky (elementární, konec)
    for (const [id, key] of [['si_atom', 'atom_si'], ['nucleus', 'nucleus_si'], ['protons', 'proton']]) {
      const sub = findSubcircuit(circuit.components.find((cmp) => cmp.id === id), stack);
      assert.equal(sub?.key, key, id);
      circuit = sub;
      stack = [...stack, { key: sub.key, level: sub.level }];
    }
    assert.equal(stack.at(-1).level, 11);
    assert.ok(circuit.components.every((cmp) => findSubcircuit(cmp, stack) === null), 'kvarky jsou elementární');
  });

  it('explicit drill wins, ancestors and shallower levels are never returned', () => {
    const blk = H.nv1_die.components.find((cmp) => cmp.id === 'crtc');
    assert.equal(findSubcircuit(blk, [{ key: 'root', level: 1 }, { key: 'nv1_die', level: 2 }]).key, 'crtc');
    const and = { id: 'g', type: 'AND' };
    assert.equal(findSubcircuit(and, [{ key: 'root', level: 1 }]).key, 'AND');
    assert.equal(findSubcircuit(and, [{ key: 'FULL_ADDER', level: 5 }]).key, 'AND_cmos', 'a gate inside a level-5 cell goes to its transistors');
    assert.equal(findSubcircuit(and, [{ key: 'AND', level: 5 }, { key: 'AND_cmos', level: 6 }]), null);
  });
});

describe('level 6-7: transistors alone compute the gates', () => {
  const table2 = (key, a, b, out, fn) => {
    const e = load(key);
    for (const [x, y] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      set(e, { [a]: x, [b]: y });
      assert.equal(pv(e, out), fn(x, y), `${key}(${x},${y})`);
    }
    assert.ok(e.components.size && [...e.components.values()].every((cmp) => !['AND', 'OR', 'NAND', 'NOR', 'NOT', 'XOR'].includes(cmp.type)), 'no gates inside');
  };
  it('NAND', () => table2('NAND', 'in_cmos_a', 'in_cmos_b', 'out_node', (a, b) => 1 - (a & b)));
  it('NOR', () => table2('NOR', 'nor_a', 'nor_b', 'nor_out', (a, b) => 1 - (a | b)));
  it('XOR (12T)', () => table2('XOR_cmos', 'in_a', 'in_b', 'xor_out', (a, b) => a ^ b));
  it('AND (6T)', () => table2('AND_cmos', 'in_a', 'in_b', 'gate_out', (a, b) => a & b));
  it('OR (6T)', () => table2('OR_cmos', 'in_a', 'in_b', 'gate_out', (a, b) => a | b));

  it('NOT', () => {
    const e = load('NOT');
    set(e, { not_in: 0 });
    assert.equal(pv(e, 'not_out'), 1);
    set(e, { not_in: 1 });
    assert.equal(pv(e, 'not_out'), 0);
  });

  it('tri-state buffer: drives A when enabled, floats (Z) when never driven, keeps charge after release', () => {
    // the preset loads with EN = 1 (node already driven), so start from a disabled copy
    const f = new LogicEngine();
    const def = JSON.parse(JSON.stringify(H.TRI_STATE_BUFFER));
    def.components.find((cmp) => cmp.id === 'ts_en').outputs.out = 0;
    f.loadCircuit(def);
    assert.equal(pv(f, 'ts_out'), Zv);
    set(f, { ts_en: 1, ts_in: 1 });
    assert.equal(pv(f, 'ts_out'), 1);
    set(f, { ts_in: 0 });
    assert.equal(pv(f, 'ts_out'), 0);
    set(f, { ts_en: 0, ts_in: 1 });
    assert.equal(pv(f, 'ts_out'), 0, 'disabled: output node keeps its charge');
    set(f, { ts_in: 0 });
    set(f, { ts_in: 1 });
    assert.equal(pv(f, 'ts_out'), 0, 'input changes while disabled do not reach (or share charge with) the output');
  });

  it('single NMOS / PMOS: conducts, then the drain floats and keeps its charge', () => {
    const n = load('nmos_transistor');
    assert.equal(pv(n, 'drain_current'), Zv, 'gate 0: never driven, floating');
    set(n, { gate_voltage: 1 });
    assert.equal(pv(n, 'drain_current'), 0);
    assert.equal(n.components.get('nmos_m1').conducting, true);
    set(n, { gate_voltage: 0 });
    assert.equal(n.components.get('nmos_m1').conducting, false);
    assert.equal(pv(n, 'drain_current'), 0, 'isolated drain keeps its charge');
    const p = load('pmos_transistor');
    assert.equal(pv(p, 'drain_current'), Zv);
    set(p, { gate_voltage: 0 });
    assert.equal(pv(p, 'drain_current'), 1);
  });
});

describe('level 5: gate-level cells', () => {
  const table = (key, ins, out, fn) => {
    const e = load(key);
    const n = ins.length;
    for (let v = 0; v < 1 << n; v++) {
      const bits = ins.map((_, i) => (v >> i) & 1);
      set(e, Object.fromEntries(ins.map((id, i) => [id, bits[i]])));
      assert.equal(pv(e, out), fn(...bits), `${key}(${bits})`);
    }
  };
  it('XOR from 4 NAND', () => table('XOR', ['xor_a', 'xor_b'], 'xor_out', (a, b) => a ^ b));
  it('XNOR from 4 NOR', () => table('XNOR', ['xn_a', 'xn_b'], 'xnor_out', (a, b) => 1 - (a ^ b)));
  it('AND = NAND + NOT', () => table('AND', ['and_a', 'and_b'], 'and_out', (a, b) => a & b));
  it('OR = NOR + NOT', () => table('OR', ['or_a', 'or_b'], 'or_out', (a, b) => a | b));
  it('MUX from NAND', () => table('MUX', ['mux_a', 'mux_b', 'mux_sel'], 'mux_out', (a, b, s) => (s ? b : a)));
  it('full adder', () => {
    table('FULL_ADDER', ['fa_a', 'fa_b', 'fa_cin'], 'probe_sum', (a, b, c) => a ^ b ^ c);
    table('FULL_ADDER', ['fa_a', 'fa_b', 'fa_cin'], 'probe_cout', (a, b, c) => (a + b + c) >> 1);
  });

  it('D flip-flop from NAND gates: Q takes D only on the rising clock edge', () => {
    const e = load('D_FF');
    const q = () => [pv(e, 'q'), pv(e, 'qn')];
    assert.deepEqual(q(), [0, 1]);
    set(e, { d_in: 1 });
    assert.deepEqual(q(), [0, 1], 'D changes while CLK = 0: no effect');
    clk(e, 'clk', 1);
    assert.deepEqual(q(), [1, 0], 'rising edge');
    set(e, { d_in: 0 });
    assert.deepEqual(q(), [1, 0], 'D changes while CLK = 1: no effect');
    clk(e, 'clk', 0);
    assert.deepEqual(q(), [1, 0], 'falling edge: no effect');
    clk(e, 'clk', 1);
    assert.deepEqual(q(), [0, 1]);
    assert.equal(e.oscillating, false);
    // and with the free-running clock source
    set(e, { d_in: 1 });
    e.components.get('clk').manualState = undefined;
    e.propagate();
    for (let i = 0; i < 4; i++) e.step();
    assert.deepEqual(q(), [1, 0]);
    assert.equal(e.oscillating, false);
  });
});

describe('level 4: registers, adders, comparators, memories', () => {
  it('8-bit register from 8 D flip-flops captures a byte on the edge, holds it with WE = 0', () => {
    const e = load('REGISTER_8BIT');
    assert.equal(pv(e, 'q'), 0);
    tick(e);
    assert.equal(pv(e, 'q'), 0xA5);
    set(e, { we: 0, d_in: 0x3C });
    tick(e);
    assert.equal(pv(e, 'q'), 0xA5);
    set(e, { we: 1 });
    tick(e);
    assert.equal(pv(e, 'q'), 0x3C);
  });

  it('ripple-carry adder from 8 full adders', () => {
    const e = load('ADDER_8BIT');
    for (const [a, b, c] of [[0, 0, 0], [1, 1, 0], [0x5A, 0x3C, 0], [200, 100, 0], [255, 1, 0], [255, 255, 1], [0x0F, 0xF0, 1]]) {
      set(e, { a_in: a, b_in: b, cin: c });
      assert.equal(pv(e, 'sum'), (a + b + c) & 0xFF, `${a}+${b}+${c}`);
      assert.equal(pv(e, 'cout'), (a + b + c) >> 8);
    }
  });

  it('equality comparator from XNOR + AND tree', () => {
    const e = load('COMPARATOR_8BIT');
    for (const [a, b] of [[0x5A, 0x5A], [0x5A, 0x5B], [0, 0], [0x80, 0], [255, 255], [0x12, 0x21]]) {
      set(e, { a_in: a, b_in: b });
      assert.equal(pv(e, 'eq'), a === b ? 1 : 0, `${a}==${b}`);
    }
  });

  it('ROM: decoder + OR array returns 05 03 0C 0A', () => {
    const e = load('ROM');
    [5, 3, 12, 10].forEach((v, addr) => {
      set(e, { a0: addr & 1, a1: addr >> 1 });
      assert.equal(pv(e, 'dout'), v);
    });
  });

  it('RAM 2x1: writes the addressed cell only', () => {
    const e = load('RAM');
    set(e, { a0: 0, din: 1, we: 1 });
    tick(e);
    set(e, { a0: 1, din: 0 });
    tick(e);
    set(e, { we: 0, din: 1, a0: 0 });
    tick(e);
    assert.equal(pv(e, 'dout'), 1);
    set(e, { a0: 1 });
    assert.equal(pv(e, 'dout'), 0);
  });
});

describe('level 3: block RTL does what the block does', () => {
  it('CRTC: counter wraps at HTOTAL = 100 chars, HSYNC# low exactly for chars 82..93', () => {
    const e = load('crtc');
    let prev = 0;
    let pulses = 0;
    for (let i = 0; i < 260; i++) {
      tick(e);
      const h = pv(e, 'hcnt_probe');
      assert.ok(h === (prev + 1) % 100, `count ${prev} -> ${h}`);
      prev = h;
      assert.equal(pv(e, 'hsync_n'), h >= 82 && h < 94 ? 0 : 1, `HSYNC# at char ${h}`);
      if (h === 82) pulses++;
    }
    assert.equal(pulses, 2);
  });

  it('3D forward differencing produces 3n² + 2n + 5 with adders only', () => {
    const e = load('qtm_forward_diff');
    const xs = [pv(e, 'x_probe')];
    for (let n = 1; n <= 8; n++) { tick(e); xs.push(pv(e, 'x_probe')); }
    assert.deepEqual(xs, [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => 3 * n * n + 2 * n + 5));
    set(e, { load: 1 });
    tick(e);
    set(e, { load: 0 });
    assert.equal(pv(e, 'x_probe'), 5, 'LOAD restarts the curve');
  });

  it('audio voice: phase accumulator walks through the sine table', () => {
    const e = load('audio_voice');
    const table = H.audio_voice.components.find((cmp) => cmp.id === 'wave_rom').memory;
    for (let n = 1; n <= 20; n++) {
      tick(e);
      assert.equal(pv(e, 'sample'), table[(16 * n) & 255]);
    }
    assert.equal(table[0], 128);
    assert.equal(table[64], 255);
    assert.equal(table[192], 1);
  });

  it('PCI target: DEVSEL# asserted after an address phase hitting BAR0 with a memory command', () => {
    const e = load('pci_target');
    tick(e);
    assert.equal(pv(e, 'devsel_n'), 1, 'idle bus');
    set(e, { frame_n: 0 });
    tick(e);
    assert.equal(pv(e, 'devsel_n'), 0, 'memory read to BAR0');
    set(e, { cbe: 0xA }); // config read: not ours here
    tick(e);
    assert.equal(pv(e, 'devsel_n'), 1);
    set(e, { cbe: 7, ad_hi: 0x12 }); // memory write elsewhere
    tick(e);
    assert.equal(pv(e, 'devsel_n'), 1);
    set(e, { ad_hi: 0xE0 });
    tick(e);
    assert.equal(pv(e, 'devsel_n'), 0, 'memory write to BAR0');
  });

  it('memory controller: row on MA, RAS# low, column on MA, CAS# low, precharge', () => {
    const e = load('mem_ctrl');
    const seq = [];
    for (let i = 0; i < 8; i++) { tick(e); seq.push([pv(e, 'ras_n'), pv(e, 'cas_n'), pv(e, 'ma')]); }
    const cycle = [[0, 1, 0x12], [0, 0, 0x34], [1, 1, 0x34], [1, 1, 0x12]];
    assert.deepEqual(seq, [...cycle, ...cycle]);
  });

  it('game port: TH/TR scans the 4 pad groups, pressed A is captured as 0 in group 1', () => {
    const e = load('game_port_scan');
    const sels = [];
    for (let i = 0; i < 4; i++) { tick(e); sels.push(pv(e, 'sel_probe')); }
    assert.deepEqual(sels, [1, 2, 3, 0]);
    assert.deepEqual([...e.components.get('cap_ram').memory.slice(0, 4)], [0xF, 0xB, 0xF, 0xF]);
  });

  it('BIOS ROM interface reads 55 AA 40', () => {
    const e = load('rom_if');
    const bytes = [];
    for (let i = 0; i < 3; i++) { tick(e); bytes.push(pv(e, 'data_probe')); }
    assert.deepEqual(bytes, [0x55, 0xAA, 0x40]);
  });

  it('registers: a write lands only at the decoded address', () => {
    const e = load('mmio_regs');
    tick(e);
    assert.equal(pv(e, 'reg_q'), 0, 'no WR');
    set(e, { wr: 1 });
    tick(e);
    assert.equal(pv(e, 'reg_q'), 0x5A);
    set(e, { addr: 0x24, wdata: 0x11 });
    tick(e);
    assert.equal(pv(e, 'reg_q'), 0x5A);
  });

  it('DMA: loads a descriptor, moves 4 dwords (+4 B each), then drops REQ', () => {
    const e = load('dma_engine');
    tick(e);
    assert.equal(pv(e, 'req'), 0);
    set(e, { load: 1 });
    tick(e);
    set(e, { load: 0 });
    assert.deepEqual([pv(e, 'addr_probe'), pv(e, 'len_probe'), pv(e, 'req')], [0x40, 4, 1]);
    for (let i = 0; i < 6; i++) tick(e);
    assert.deepEqual([pv(e, 'addr_probe'), pv(e, 'len_probe'), pv(e, 'req')], [0x50, 0, 0]);
  });

  it('command FIFO: first in, first out, EMPTY when the pointers meet', () => {
    const e = load('cmd_fifo');
    assert.equal(pv(e, 'empty'), 1);
    for (const v of [0x11, 0x22, 0x33]) { set(e, { push: 1, din: v }); tick(e); }
    set(e, { push: 0 });
    assert.equal(pv(e, 'empty'), 0);
    const out = [];
    set(e, { pop: 1 });
    for (let i = 0; i < 3; i++) { out.push(pv(e, 'dout')); tick(e); }
    assert.deepEqual(out, [0x11, 0x22, 0x33]);
    assert.equal(pv(e, 'empty'), 1);
  });

  it('2D engine: fills a row of 8 pixels at 80h, 82h ... 8Eh, then stops', () => {
    const e = load('blit_engine');
    tick(e);
    assert.equal(pv(e, 'we_probe'), 0, 'idle');
    set(e, { start: 1 });
    tick(e);
    set(e, { start: 0 });
    const writes = [];
    for (let i = 0; i < 12; i++) {
      if (pv(e, 'we_probe') === 1) writes.push([pv(e, 'addr_probe'), pv(e, 'data_probe')]);
      tick(e);
    }
    assert.deepEqual(writes, [0, 1, 2, 3, 4, 5, 6, 7].map((x) => [0x80 + 2 * x, 0x7C00]));
    set(e, { mode: 1 });
    assert.equal(pv(e, 'data_probe'), 0x03E0, 'copy ROP passes the source pixel');
  });

  it('VGA serializer: shifts the font byte out MSB first, 8 dots per character', () => {
    const e = load('vga_serializer');
    for (let i = 0; i < 8; i++) tick(e); // first load
    const dots = [];
    for (let i = 0; i < 16; i++) { dots.push(pv(e, 'pixel')); tick(e); }
    const glyph = [0, 0, 1, 1, 1, 1, 0, 0]; // 0x3C
    assert.deepEqual(dots, [...glyph, ...glyph]);
  });

  it('I/O pad: drives, floats, receives, and shorts like a real pin', () => {
    const e = load('io_pad');
    assert.deepEqual([pv(e, 'pad'), pv(e, 'core_in')], [1, 1]);
    set(e, { oe: 0 });
    assert.equal(pv(e, 'pad'), Zv);
    set(e, { ext_oe: 1, ext_data: 0 });
    assert.deepEqual([pv(e, 'pad'), pv(e, 'core_in')], [0, 0]);
    set(e, { oe: 1 });
    assert.equal(pv(e, 'pad'), X, 'two drivers fight');
  });

  it('row decoder: exactly one word line per address', () => {
    const e = load('row_decoder');
    for (let a = 0; a < 4; a++) {
      set(e, { a0: a & 1, a1: a >> 1 });
      assert.deepEqual([0, 1, 2, 3].map((i) => pv(e, `wl${i}`)), [0, 1, 2, 3].map((i) => (i === a ? 1 : 0)));
    }
  });

  it('DRAM: 1T1C cells (transistors + stored charge) write, hold and are read back through the sense amp', () => {
    const e = load('dram_cell_array');
    const write = (wl, v) => {
      set(e, { drv: 1, wr: 1, din: v, [wl]: 1 });
      set(e, { [wl]: 0 }); // close the cell first...
      set(e, { drv: 0 }); // ...then release the bit line
    };
    const read = (wl) => {
      set(e, { pre: 1 });
      set(e, { pre: 0 });
      set(e, { [wl]: 1 });
      set(e, { se: 1 });
      const v = pv(e, 'dout');
      set(e, { wr: 0, drv: 1 }); // write back (the read was destructive)
      set(e, { [wl]: 0 });
      set(e, { drv: 0, se: 0 });
      return v;
    };
    write('wl0', 1);
    write('wl1', 0);
    assert.deepEqual([pv(e, 'cell0'), pv(e, 'cell1')], [1, 0]);
    // the bit line toggles while the cells are closed: they keep their charge
    set(e, { drv: 1, wr: 1, din: 0 });
    set(e, { din: 1 });
    set(e, { drv: 0 });
    assert.deepEqual([pv(e, 'cell0'), pv(e, 'cell1')], [1, 0], 'cells hold');
    assert.equal(read('wl0'), 1);
    assert.equal(read('wl1'), 0);
    assert.deepEqual([pv(e, 'cell0'), pv(e, 'cell1')], [1, 0], 'restored after the destructive read');
    assert.equal(read('wl1'), 0, 'second read after write-back');
    assert.equal(read('wl0'), 1);
  });

  it('EPROM array: erased cells read 1, programmed cells read 0', () => {
    const e = load('eprom_array');
    const read = (wl) => {
      set(e, { pre_n: 0 });
      set(e, { pre_n: 1 });
      set(e, { [wl]: 1 });
      const v = pv(e, 'd0') | (pv(e, 'd1') << 1);
      set(e, { [wl]: 0 });
      return v;
    };
    assert.equal(read('wl0'), 0b01);
    assert.equal(read('wl1'), 0b10);
  });

  it('RAMDAC datapath: RGB555 bypass expands 5 -> 8 bits, palette mode looks up the index', () => {
    const e = load('ramdac_datapath');
    tick(e); tick(e);
    assert.equal(pv(e, 'dac_probe'), 255);
    set(e, { pix_in: 16 });
    tick(e); tick(e);
    assert.equal(pv(e, 'dac_probe'), 132);
    set(e, { mode: 0, pix_in: 10 });
    tick(e); tick(e);
    assert.equal(pv(e, 'dac_probe'), 245);
  });

  it('PLL dividers: f_ref/M and f_VCO/N tick at the same rate (locked), dot clock = VCO/4', () => {
    const e = load('pll_dividers');
    const count = { ref: 0, fb: 0, vco: 0, vclk: 0 };
    const last = { ref: 0, fb: 0, vco: 0, vclk: 0 };
    const val = { ref: () => pv(e, 'ref_tick'), fb: () => pv(e, 'fb_tick'), vco: () => e.components.get('vco').outputs.out, vclk: () => pv(e, 'vclk_out') };
    while (e.simTime < 100_000) {
      e.step();
      for (const key of Object.keys(count)) {
        const v = val[key]();
        if (last[key] === 0 && v === 1) count[key]++;
        last[key] = v;
      }
    }
    assert.ok(count.ref > 30, `ref ticks ${count.ref}`);
    assert.ok(Math.abs(count.ref - count.fb) <= 1, `ref ${count.ref} vs fb ${count.fb}`);
    assert.ok(Math.abs(count.vco / 4 - count.vclk) <= 1, `vco ${count.vco} vs vclk ${count.vclk}`);
  });

  it('sigma-delta: density of ones equals sample / 256', () => {
    const e = load('sigma_delta');
    let ones = 0;
    tick(e);
    for (let i = 0; i < 256; i++) { tick(e); ones += pv(e, 'bit_probe'); }
    assert.equal(ones, 192);
  });
});

describe('presets', () => {
  it('GPU demo draws: the X/Y counters fill the screen line by line', () => {
    const e = new LogicEngine();
    e.loadCircuit(PRESET_CIRCUITS.gpu_rasterizer_demo);
    for (let i = 0; i < 64 * 3; i++) tick(e);
    const vram = e.components.get('screen').vram;
    assert.equal(vram.filter((v) => v !== 0).length, 64 * 3);
    assert.equal(vram[2 * 64 + 63], 0x1F);
    assert.equal(e.components.get('reg_y').outputs.q, 3);
  });

  it('mini PC: the program counter counts', () => {
    const e = new LogicEngine();
    e.loadCircuit(PRESET_CIRCUITS.mini_pc);
    tick(e); tick(e);
    assert.equal(e.components.get('pc').outputs.q, 2);
  });
});
