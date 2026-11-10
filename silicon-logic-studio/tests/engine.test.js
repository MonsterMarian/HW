// Engine semantics: wires form nets, tri-state buses, shorts, switch-level transistors, stored charge, clocks.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine, WireState } from '../src/engine/logicEngine.js';

const part = (id, type, extra = {}) => ({ id, type, x: 0, y: 0, inputs: {}, outputs: {}, ...extra });
const build = (parts, wires) => {
  const e = new LogicEngine();
  parts.forEach((p) => e.addComponent(p));
  wires.forEach(([a, ap, b, bp]) => e.addWire(a, ap, b, bp));
  e.propagate();
  return e;
};

describe('nets', () => {
  it('wires that touch the same pin form one net (input-to-input wires carry the signal too)', () => {
    const e = build(
      [part('in', 'INPUT', { outputs: { out: 1 } }), part('g1', 'NOT'), part('g2', 'NOT')],
      [['in', 'out', 'g1', 'in'], ['g1', 'in', 'g2', 'in']] // second wire runs pin-to-pin, like a PCB trace
    );
    assert.equal(e.components.get('g2').inputs.in, 1);
    assert.equal(e.components.get('g2').outputs.out, 0);
  });

  it('two outputs on one net with different values are a short circuit (X)', () => {
    const e = build(
      [part('a', 'INPUT', { outputs: { out: 1 } }), part('b', 'INPUT', { outputs: { out: 0 } }), part('p', 'PROBE')],
      [['a', 'out', 'p', 'in'], ['b', 'out', 'p', 'in']]
    );
    assert.equal(e.components.get('p').inputs.in, WireState.CONFLICT);
  });

  it('tri-state bus: only the enabled buffer drives, nobody enabled = floating', () => {
    const e = build(
      [
        part('d0', 'INPUT', { outputs: { out: 1 } }), part('d1', 'INPUT', { outputs: { out: 0 } }),
        part('en0', 'INPUT', { outputs: { out: 1 } }), part('en1', 'INPUT', { outputs: { out: 0 } }),
        part('t0', 'TRI_STATE_BUFFER'), part('t1', 'TRI_STATE_BUFFER'), part('bus', 'PROBE'),
      ],
      [['d0', 'out', 't0', 'in'], ['en0', 'out', 't0', 'enable'], ['d1', 'out', 't1', 'in'], ['en1', 'out', 't1', 'enable'],
        ['t0', 'out', 'bus', 'in'], ['t1', 'out', 'bus', 'in']]
    );
    const bus = e.components.get('bus');
    assert.equal(bus.inputs.in, 1);
    e.components.get('en0').outputs.out = 0;
    e.propagate();
    assert.equal(bus.inputs.in, WireState.HIGH_Z);
    e.components.get('en1').outputs.out = 1;
    e.propagate();
    assert.equal(bus.inputs.in, 0);
    e.components.get('en0').outputs.out = 1; // both drive, different values
    e.propagate();
    assert.equal(bus.inputs.in, WireState.CONFLICT);
  });

  it('net labels (tunnels) join nets without a drawn wire', () => {
    const e = build(
      [part('a', 'INPUT', { outputs: { out: 1 } }), part('to', 'TUNNEL_OUT', { tunnelName: 'CLK' }), part('ti', 'TUNNEL_IN', { tunnelName: 'CLK' }), part('p', 'PROBE')],
      [['a', 'out', 'to', 'in'], ['ti', 'out', 'p', 'in']]
    );
    assert.equal(e.components.get('p').inputs.in, 1);
  });

  it('bus values are numbers, so the value 2 or 3 on a bus is not mistaken for Z/X', () => {
    const e = build([part('k', 'CONSTANT', { outputs: { out: 2 } }), part('r', 'REGISTER_8BIT'), part('c', 'CLOCK', { manualState: 0 })],
      [['k', 'out', 'r', 'd'], ['c', 'out', 'r', 'clk']]);
    e.components.get('c').manualState = 1;
    e.propagate();
    assert.equal(e.components.get('r').outputs.q, 2);
  });
});

describe('switch-level CMOS', () => {
  const inverter = () => build(
    [part('vdd', 'VDD'), part('gnd', 'GND'), part('a', 'INPUT', { outputs: { out: 0 } }), part('p', 'PMOS'), part('n', 'NMOS'), part('y', 'PROBE')],
    [['vdd', 'out', 'p', 's'], ['gnd', 'out', 'n', 's'], ['a', 'out', 'p', 'g'], ['a', 'out', 'n', 'g'], ['p', 'd', 'y', 'in'], ['n', 'd', 'y', 'in']]
  );

  it('PMOS + NMOS inverter computes NOT from the transistors alone', () => {
    const e = inverter();
    assert.equal(e.components.get('y').inputs.in, 1);
    e.components.get('a').outputs.out = 1;
    e.propagate();
    assert.equal(e.components.get('y').inputs.in, 0);
    assert.equal(e.components.get('n').conducting, true);
    assert.equal(e.components.get('p').conducting, false);
  });

  it('a floating gate makes neither transistor conduct and the output keeps its charge', () => {
    const e = inverter();
    e.components.get('a').outputs.out = WireState.HIGH_Z;
    e.propagate();
    assert.equal(e.components.get('y').inputs.in, 1); // stored charge from before
  });

  it('1T1C DRAM cell: write through the access transistor, the capacitor keeps the bit after the word line closes', () => {
    const e = build(
      [part('wl', 'INPUT', { outputs: { out: 1 } }), part('bl', 'TRI_STATE_BUFFER'), part('d', 'INPUT', { outputs: { out: 1 } }),
        part('we', 'INPUT', { outputs: { out: 1 } }), part('acc', 'NMOS'), part('cap', 'PROBE')],
      [['wl', 'out', 'acc', 'g'], ['d', 'out', 'bl', 'in'], ['we', 'out', 'bl', 'enable'], ['bl', 'out', 'acc', 'd'], ['acc', 's', 'cap', 'in']]
    );
    const cap = e.components.get('cap');
    assert.equal(cap.inputs.in, 1);
    e.components.get('wl').outputs.out = 0; // close the cell
    e.components.get('d').outputs.out = 0; // bit line changes
    e.propagate();
    assert.equal(cap.inputs.in, 1, 'cell must keep its charge');
    e.components.get('we').outputs.out = 0; // release the bit line first (it keeps its own charge, 0)...
    e.propagate();
    e.components.get('wl').outputs.out = 1; // ...then open the cell: the charges meet
    e.propagate();
    assert.equal(cap.inputs.in, WireState.CONFLICT, 'bit line (0) and cell (1) share charge -> unknown without a sense amplifier');
  });
});

describe('clocks', () => {
  it('two clock sources run independently in simulated time', () => {
    const e = build([part('fast', 'CLOCK', { freqHz: 3e6 }), part('slow', 'CLOCK', { freqHz: 1e6 })], []);
    let fast = 0;
    let slow = 0;
    let pf = 0;
    let ps = 0;
    while (e.simTime < 10_000) {
      e.step();
      const f = e.components.get('fast').outputs.out;
      const s = e.components.get('slow').outputs.out;
      if (pf === 0 && f === 1) fast++;
      if (ps === 0 && s === 1) slow++;
      pf = f; ps = s;
    }
    assert.equal(fast, 30);
    assert.equal(slow, 10);
  });

  it('D flip-flops sample on the rising edge with pre-edge data (shift register works)', () => {
    const e = build(
      [part('d', 'INPUT', { outputs: { out: 1 } }), part('clk', 'CLOCK', { freqHz: 1e6 }), part('f1', 'D_FF'), part('f2', 'D_FF')],
      [['d', 'out', 'f1', 'd'], ['f1', 'q', 'f2', 'd'], ['clk', 'out', 'f1', 'clk'], ['clk', 'out', 'f2', 'clk']]
    );
    e.step(); // rising
    assert.equal(e.components.get('f1').outputs.q, 1);
    assert.equal(e.components.get('f2').outputs.q, 0, 'f2 must take the old value of f1');
    e.step(); e.step();
    assert.equal(e.components.get('f2').outputs.q, 1);
  });
});
