// SILICON // LOGIC STUDIO - SIMULATION ENGINE
//
// Model of real wiring, not of an abstract schematic:
//  - A wire is copper. Every pin touched by connected wires (and every pin with the same net label,
//    and both sides of a connector contact) forms ONE net. A net has one value for all its pins.
//  - Pins may be bidirectional (a name present in both `inputs` and `outputs`). A driver that does not
//    drive outputs 'Z'. Several drivers with different values on one net = short circuit ('X').
//  - Undriven nets float ('Z'), or take the value of a pull-up/down resistor declared by a device.
//  - NMOS/PMOS are switches between nets (switch-level simulation): a conducting channel merges two nets,
//    VDD/GND drive them. An isolated node keeps its last value (stored charge, as in a real DRAM cell).
//  - Several independent clock sources (crystal/PLL outputs) run in simulated time; the engine always
//    advances to the next clock edge of any source (event-driven, multi clock domain).

import { DEVICES } from './devices/index.js';

export const WireState = {
  LOW: 0,
  HIGH: 1,
  HIGH_Z: 'Z', // floating / not driven
  CONFLICT: 'X', // two drivers fight (short circuit) or unknown
};

const Z = WireState.HIGH_Z;
const X = WireState.CONFLICT;

// Default pins of the primitive parts (devices bring their own in devices/*.js)
export const PRIMITIVE_PINS = {
  INPUT: { inputs: {}, outputs: { out: 0 } },
  CONSTANT: { inputs: {}, outputs: { out: 0 } },
  CLOCK: { inputs: {}, outputs: { out: 0 } },
  VDD: { inputs: {}, outputs: { out: 1 } },
  GND: { inputs: {}, outputs: { out: 0 } },
  NOT: { inputs: { in: 0 }, outputs: { out: 1 } },
  AND: { inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
  OR: { inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
  XOR: { inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
  NAND: { inputs: { a: 0, b: 0 }, outputs: { out: 1 } },
  NOR: { inputs: { a: 0, b: 0 }, outputs: { out: 1 } },
  XNOR: { inputs: { a: 0, b: 0 }, outputs: { out: 1 } },
  TRI_STATE_BUFFER: { inputs: { in: 0, enable: 0 }, outputs: { out: Z } },
  MUX: { inputs: { a: 0, b: 0, sel: 0 }, outputs: { out: 0 } },
  DEMUX: { inputs: { in: 0, sel: 0 }, outputs: { out0: 0, out1: 0 } },
  D_FF: { inputs: { d: 0, clk: 0 }, outputs: { q: 0, nq: 1 } },
  REGISTER_8BIT: { inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
  REGISTER_16BIT: { inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
  REGISTER_32BIT: { inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
  ADDER_8BIT: { inputs: { a: 0, b: 0, cin: 0 }, outputs: { sum: 0, cout: 0 } },
  FULL_ADDER: { inputs: { a: 0, b: 0, cin: 0 }, outputs: { s: 0, cout: 0 } },
  // architecture block / physical layer / atom: drawn and drillable, no logic of their own (passive pins)
  DIE_BLOCK: { inputs: {}, outputs: {} },
  LAYER: { inputs: {}, outputs: {} },
  ATOM: { inputs: {}, outputs: {} },
  COMPARATOR_8BIT: { inputs: { a: 0, b: 0 }, outputs: { eq: 1, lt: 0 } },
  BUS_SPLITTER: { inputs: { bus: 0 }, outputs: { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, b7: 0 } },
  BUS_MERGER: { inputs: { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, b7: 0 }, outputs: { bus: 0 } },
  RAM: { inputs: { addr: 0, din: 0, we: 0, clk: 0 }, outputs: { dout: 0 } },
  ROM: { inputs: { addr: 0 }, outputs: { dout: 0 } },
  VIRTUAL_SCREEN: { inputs: { x: 0, y: 0, color: 0, we: 0, clk: 0 }, outputs: {} },
  PROBE: { inputs: { in: 0 }, outputs: {} },
  SEVEN_SEGMENT: { inputs: { b0: 0, b1: 0, b2: 0, b3: 0 }, outputs: {} },
  NMOS: { inputs: { g: 0, s: Z, d: Z }, outputs: {} },
  PMOS: { inputs: { g: 0, s: Z, d: Z }, outputs: {} },
  TUNNEL_IN: { inputs: {}, outputs: { out: Z } },
  TUNNEL_OUT: { inputs: { in: Z }, outputs: {} },
};

// Bus widths of primitive pins (everything else is 1 bit)
const PRIMITIVE_WIDTHS = {
  REGISTER_8BIT: { d: 8, q: 8 }, REGISTER_16BIT: { d: 16, q: 16 }, REGISTER_32BIT: { d: 32, q: 32 },
  ADDER_8BIT: { a: 8, b: 8, sum: 8 }, COMPARATOR_8BIT: { a: 8, b: 8 },
  BUS_SPLITTER: { bus: 8 }, BUS_MERGER: { bus: 8 },
  RAM: { addr: 8, din: 8, dout: 8 }, ROM: { addr: 8, dout: 8 },
  VIRTUAL_SCREEN: { x: 6, y: 6, color: 8 },
};

const SWITCH_TYPES = new Set(['NMOS', 'PMOS']);
// Pins of these parts never drive a net; they only carry it (labels, connectors, transistor terminals)
const PASSIVE_TYPES = new Set(['TUNNEL_IN', 'TUNNEL_OUT', 'DIE_BLOCK', 'LAYER', 'ATOM']);
const isPassive = (comp) => PASSIVE_TYPES.has(comp.type) || !!DEVICES[comp.type]?.passive;

export function pinWidth(comp, pin) {
  const dev = DEVICES[comp.type];
  return (dev?.widths?.[pin]) || PRIMITIVE_WIDTHS[comp.type]?.[pin] || 1;
}

/** Fill in default pins for a component (used for new parts and old saved circuits). */
export function ensurePins(comp) {
  const def = DEVICES[comp.type]?.pins || PRIMITIVE_PINS[comp.type];
  comp.inputs = comp.inputs || {};
  comp.outputs = comp.outputs || {};
  // probes and displays only show a value; an old saved `val` output would drive a net
  if (comp.type === 'PROBE' || comp.type === 'SEVEN_SEGMENT') delete comp.outputs.val;
  if (!def) return comp;
  for (const [k, v] of Object.entries(def.inputs || {})) if (!(k in comp.inputs)) comp.inputs[k] = v;
  for (const [k, v] of Object.entries(def.outputs || {})) if (!(k in comp.outputs)) comp.outputs[k] = v;
  return comp;
}

function resolveDrivers(values, pull) {
  let v = Z;
  for (const d of values) {
    if (d === undefined || d === Z) continue;
    if (d === X) return X;
    if (v === Z) v = d;
    else if (v !== d) return X;
  }
  return v === Z && pull !== undefined ? pull : v;
}

// Small "set" of dirty items without allocation: an array plus a mark (hot path of the simulation)
let dirtyEpoch = 1;
class NetList {
  constructor(n) { this.a = []; this.m = new Uint8Array(n); }
  add(i) { if (!this.m[i]) { this.m[i] = 1; this.a.push(i); } }
  get size() { return this.a.length; }
  clear() { for (const i of this.a) this.m[i] = 0; this.a.length = 0; }
}
class CompList {
  constructor() { this.a = []; this.id = dirtyEpoch++; }
  add(c) { if (c._dm !== this.id) { c._dm = this.id; this.a.push(c); } }
  get size() { return this.a.length; }
  clear() { this.a.length = 0; this.id = dirtyEpoch++; }
}

const isLogicValue = (v) => typeof v === 'number';

export class LogicEngine {
  constructor() {
    this.components = new Map(); // id -> component
    this.wires = []; // { id, from: { id, pin }, to: { id, pin } }  (direction only matters for drawing)
    this.clockFrequency = 10; // UI speed: clock edges per second / 2 (Infinity = as fast as possible)
    this.isRunning = false;
    this.simTime = 0; // simulated time in nanoseconds
    this.tickCount = 0; // processed clock events
    this.waveformHistory = new Map();
    this.maxWaveformPoints = 120;
    this.listeners = new Set();
    this.thermalMap = new Map(); // componentId -> °C (rises with switching activity)
    this.oscillating = false; // set when the circuit does not settle (ring oscillator, combinational loop)
    this.clockState = 0;
    this._topo = null;
    this._clocks = null;
    this._timer = null;
  }

  // ---------------------------------------------------------------- listeners
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this);
  }

  // ---------------------------------------------------------------- editing
  addComponent(component) {
    if (!component.id) component.id = 'comp_' + Math.random().toString(36).substring(2, 9);
    ensurePins(component);
    DEVICES[component.type]?.init?.(component);
    this.components.set(component.id, component);
    this.thermalMap.set(component.id, 25.0);
    this.invalidate();
    this.notify();
    return component;
  }

  removeComponent(id) {
    this.components.delete(id);
    this.wires = this.wires.filter((w) => w.from.id !== id && w.to.id !== id);
    this.thermalMap.delete(id);
    this.invalidate();
    this.notify();
  }

  addWire(fromId, fromPin, toId, toPin) {
    const exists = this.wires.some(
      (w) => (w.from.id === fromId && w.from.pin === fromPin && w.to.id === toId && w.to.pin === toPin)
        || (w.from.id === toId && w.from.pin === toPin && w.to.id === fromId && w.to.pin === fromPin)
    );
    if (exists) return;
    this.wires.push({
      id: `wire_${fromId}_${fromPin}_${toId}_${toPin}`,
      from: { id: fromId, pin: fromPin },
      to: { id: toId, pin: toPin },
    });
    this.invalidate();
    this.notify();
  }

  removeWire(wireId) {
    this.wires = this.wires.filter((w) => w.id !== wireId);
    this.invalidate();
    this.notify();
  }

  /** Topology changed (parts, wires, net labels): nets and clock sources are rebuilt lazily. */
  invalidate() {
    this._topo = null;
    this.clocksChanged();
  }

  // ---------------------------------------------------------------- nets
  _ensureTopology() {
    if (this._topo) return this._topo;
    const parent = new Map();
    const add = (k) => { if (!parent.has(k)) parent.set(k, k); };
    const find = (k) => {
      let r = k;
      while (parent.get(r) !== r) r = parent.get(r);
      while (parent.get(k) !== r) { const n = parent.get(k); parent.set(k, r); k = n; }
      return r;
    };
    const union = (a, b) => { add(a); add(b); const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    const key = (id, pin) => `${id}:${pin}`;

    for (const comp of this.components.values()) {
      for (const pin of Object.keys(comp.inputs)) add(key(comp.id, pin));
      for (const pin of Object.keys(comp.outputs)) add(key(comp.id, pin));
      if ((comp.type === 'TUNNEL_IN' || comp.type === 'TUNNEL_OUT') && comp.tunnelName) {
        const pin = comp.type === 'TUNNEL_IN' ? 'out' : 'in';
        union(key(comp.id, pin), `label:${comp.tunnelName}`);
      }
      for (const [a, b] of DEVICES[comp.type]?.joins || []) union(key(comp.id, a), key(comp.id, b));
    }
    for (const w of this.wires) {
      if (!this.components.has(w.from.id) || !this.components.has(w.to.id)) continue;
      union(key(w.from.id, w.from.pin), key(w.to.id, w.to.pin));
    }

    const netOfRoot = new Map();
    const nets = [];
    const pinNet = new Map();
    const netFor = (k) => {
      const r = find(k);
      let idx = netOfRoot.get(r);
      if (idx === undefined) {
        idx = nets.length;
        netOfRoot.set(r, idx);
        nets.push({ idx, drivers: [], readers: [], value: Z, pull: undefined, width: 1, label: null, pins: [] });
      }
      return idx;
    };

    const switches = [];
    for (const comp of this.components.values()) {
      const passive = isPassive(comp);
      const dev = DEVICES[comp.type];
      const pins = new Set([...Object.keys(comp.inputs), ...Object.keys(comp.outputs)]);
      for (const pin of pins) {
        const k = key(comp.id, pin);
        const idx = netFor(k);
        pinNet.set(k, idx);
        const net = nets[idx];
        const isIn = pin in comp.inputs;
        const isOut = pin in comp.outputs;
        net.pins.push({ comp, pin });
        net.width = Math.max(net.width, pinWidth(comp, pin));
        if (isOut && !passive && !SWITCH_TYPES.has(comp.type)) net.drivers.push({ comp, pin });
        // risingOnly: the part reacts to this input only on 0->1, so a falling edge just updates its memory
        if (isIn || (isOut && passive)) net.readers.push({ comp, pin, isIn, isOut: isOut && passive, risingOnly: dev?.edgeInputs?.[pin] === 'r' });
        const pull = dev?.pulls?.[pin];
        if (pull !== undefined) net.pull = pull;
        if (comp.tunnelName && (comp.type === 'TUNNEL_IN' || comp.type === 'TUNNEL_OUT')) net.label = comp.tunnelName;
        if (!net.label && dev?.netNames?.[pin]) net.label = dev.netNames[pin];
      }
      if (SWITCH_TYPES.has(comp.type)) {
        switches.push({
          comp,
          g: pinNet.get(key(comp.id, 'g')),
          s: pinNet.get(key(comp.id, 's')),
          d: pinNet.get(key(comp.id, 'd')),
        });
      }
    }

    const wireNet = new Map();
    for (const w of this.wires) {
      const idx = pinNet.get(key(w.from.id, w.from.pin));
      if (idx !== undefined) wireNet.set(w.id, idx);
    }

    // Keep stored charge / values of nets whose pins survived a topology change
    if (this._lastNetValues) {
      for (const net of nets) {
        for (const p of net.pins) {
          const old = this._lastNetValues.get(key(p.comp.id, p.pin));
          if (old !== undefined) { net.value = old; break; }
        }
      }
    }

    this._topo = { nets, pinNet, wireNet, switches };
    this._dirtyNets = new NetList(nets.length);
    for (const n of nets) this._dirtyNets.add(n.idx);
    this._dirtyComps = new CompList();
    this._spareComps = new CompList();
    for (const c of this.components.values()) this._dirtyComps.add(c);
    return this._topo;
  }

  /** Index of the net a pin belongs to (or -1). */
  netIndexOf(compId, pin) {
    const t = this._ensureTopology();
    const idx = t.pinNet.get(`${compId}:${pin}`);
    return idx === undefined ? -1 : idx;
  }

  /** Current value of the net a pin is on. */
  pinValue(compId, pin) {
    const idx = this.netIndexOf(compId, pin);
    return idx < 0 ? undefined : this._topo.nets[idx].value;
  }

  /** Value carried by a drawn wire (= value of its net). */
  wireValue(wire) {
    const t = this._ensureTopology();
    const idx = t.wireNet.get(wire.id);
    return idx === undefined ? undefined : t.nets[idx].value;
  }

  /** Bus width of a drawn wire in bits. */
  wireWidth(wire) {
    const t = this._ensureTopology();
    const idx = t.wireNet.get(wire.id);
    return idx === undefined ? 1 : t.nets[idx].width;
  }

  /** Net label for a wire (e.g. "AD[31:0]") if a device names it. */
  wireLabel(wire) {
    const t = this._ensureTopology();
    const idx = t.wireNet.get(wire.id);
    return idx === undefined ? null : t.nets[idx].label;
  }

  // ---------------------------------------------------------------- simulation core
  /** Full re-evaluation: call after changing component state from outside (UI, tests). */
  propagate() {
    const t = this._ensureTopology();
    for (const n of t.nets) this._dirtyNets.add(n.idx);
    for (const c of this.components.values()) this._dirtyComps.add(c);
    this._settle();
  }

  _settle(maxIter = 400) {
    let iter = 0;
    this.oscillating = false;
    while (this._dirtyNets.size || this._dirtyComps.size) {
      if (++iter > maxIter) {
        this.oscillating = true;
        this._dirtyNets.clear();
        this._dirtyComps.clear();
        break;
      }
      const t = this._ensureTopology();
      // 1. resolve nets first, so every part evaluated in this round sees the same (pre-edge) values
      if (this._dirtyNets.size) {
        if (t.switches.length) this._resolveSwitchLevel(t);
        else { const a = this._dirtyNets.a; for (let i = 0; i < a.length; i++) this._resolveNet(t.nets[a[i]]); }
        this._dirtyNets.clear();
      }
      // 2. evaluate parts whose inputs changed
      if (!this._dirtyComps.size) break;
      const batch = this._dirtyComps;
      this._dirtyComps = this._spareComps;
      const list = batch.a;
      for (let i = 0; i < list.length; i++) this._evaluate(list[i], t);
      batch.clear();
      this._spareComps = batch;
      if (!this._topo) this._ensureTopology(); // a part grew new pins
    }
    this._lastNetValues = null;
  }

  _applyNetValue(net, value) {
    if (net.value === value) return;
    net.value = value;
    for (const r of net.readers) {
      if (r.isIn) r.comp.inputs[r.pin] = value;
      if (r.isOut) r.comp.outputs[r.pin] = value;
      if (r.risingOnly && value !== 1) { (r.comp._p = r.comp._p || {})[r.pin] = value; continue; }
      this._dirtyComps.add(r.comp);
    }
  }

  _resolveNet(net) {
    let v = Z;
    const ds = net.drivers;
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i].comp.outputs[ds[i].pin];
      if (d === undefined || d === Z) continue;
      if (d === X || (v !== Z && v !== d)) { v = X; break; }
      v = d;
    }
    if (v === Z && net.pull !== undefined) v = net.pull;
    this._applyNetValue(net, v);
  }

  // Switch-level: merge nets joined by conducting transistors, then resolve each group.
  _resolveSwitchLevel(t) {
    for (let guard = 0; guard < 64; guard++) {
      const parent = t.nets.map((n) => n.idx);
      const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (const sw of t.switches) {
        const g = t.nets[sw.g]?.value;
        const on = sw.comp.type === 'NMOS' ? g === 1 : g === 0;
        sw.comp.conducting = on;
        if (on && sw.s !== undefined && sw.d !== undefined) {
          const a = find(sw.s); const b = find(sw.d);
          if (a !== b) parent[a] = b;
        }
      }
      const groups = new Map();
      for (const n of t.nets) {
        const r = find(n.idx);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(n);
      }
      let gateChanged = false;
      for (const members of groups.values()) {
        const vals = [];
        let pull;
        for (const n of members) {
          for (const d of n.drivers) vals.push(d.comp.outputs[d.pin]);
          if (n.pull !== undefined) pull = n.pull;
        }
        let v = resolveDrivers(vals, pull);
        if (v === Z) {
          // no path to a driver: the node keeps its charge (charge sharing between different values -> X)
          const stored = members.map((n) => n.value).filter((x) => x !== Z);
          v = stored.length === 0 ? Z : stored.every((x) => x === stored[0]) ? stored[0] : X;
        }
        for (const n of members) {
          if (n.value !== v) {
            if (t.switches.some((sw) => sw.g === n.idx)) gateChanged = true;
            this._applyNetValue(n, v);
          }
        }
      }
      if (!gateChanged) return;
    }
    this.oscillating = true;
  }

  _evaluate(comp, t) {
    // output pins of this part and their nets, cached per topology
    let outs = comp._outNets;
    if (!outs || comp._outTopo !== t) {
      outs = comp._outNets = Object.keys(comp.outputs).map((k) => [k, t.pinNet.get(`${comp.id}:${k}`)]);
      comp._outTopo = t;
      comp._outPrev = new Array(outs.length);
      comp._passive = isPassive(comp);
    }
    const prev = comp._outPrev;
    const o = comp.outputs;
    for (let i = 0; i < outs.length; i++) prev[i] = o[outs[i][0]];
    const dev = DEVICES[comp.type];
    if (dev) dev.eval(comp, this);
    else this._evaluatePrimitive(comp);
    if (comp._edges) comp._edges.length = 0;
    let changed = false;
    for (let i = 0; i < outs.length; i++) {
      if (o[outs[i][0]] === prev[i]) continue;
      if (!comp._passive && outs[i][1] !== undefined) this._dirtyNets.add(outs[i][1]);
      changed = true;
    }
    if (changed) comp._activity = (comp._activity || 0) + 1;
    // (all pins are declared up front by ensurePins, so evaluation never creates new nets)
  }

  _snapshotNetValues(t) {
    const m = new Map();
    for (const n of t.nets) for (const p of n.pins) m.set(`${p.comp.id}:${p.pin}`, n.value);
    return m;
  }

  // ---------------------------------------------------------------- clocks
  /** All clock sources: CLOCK parts and device clock outputs (crystals, PLLs, sample timers). */
  _clockSources() {
    if (this._clocks) return this._clocks;
    const list = [];
    const uiHz = Number.isFinite(this.clockFrequency) ? this.clockFrequency : 1;
    for (const comp of this.components.values()) {
      if (comp.type === 'CLOCK') {
        list.push({ comp, pin: 'out', hz: comp.freqHz || uiHz, level: comp.outputs.out === 1 ? 1 : 0 });
      } else {
        const dev = DEVICES[comp.type];
        for (const c of dev?.clocks?.(comp, this) || []) list.push({ comp, pin: c.pin || null, name: c.name || c.pin, hz: c.hz, level: 0 });
      }
    }
    for (const s of list) {
      s.half = 1e9 / s.hz / 2; // ns
      s.riseEvt = { name: s.name || s.pin, level: 1 };
      s.fallEvt = { name: s.name || s.pin, level: 0 };
      const prev = this._clockPhase?.get(`${s.comp.id}:${s.name || s.pin}`);
      s.next = prev ?? this.simTime + s.half;
      if (prev !== undefined) s.level = this._clockLevel.get(`${s.comp.id}:${s.name || s.pin}`) ?? s.level;
    }
    this._clocks = list;
    return list;
  }

  /** Devices call this when their clock outputs start/stop (PLL locked, crystal connected...). */
  clocksChanged() {
    if (!this._clocks) return;
    this._clockPhase = new Map(this._clocks.map((s) => [`${s.comp.id}:${s.name || s.pin}`, s.next]));
    this._clockLevel = new Map(this._clocks.map((s) => [`${s.comp.id}:${s.name || s.pin}`, s.level]));
    this._clocks = null;
  }

  /** Advance to the next clock edge of any clock source and let the circuit settle. */
  step() {
    const t = this._ensureTopology();
    const sources = this._clockSources();
    this.tickCount++;
    if (!sources.length) { this._settle(); return; }
    let tNext = Infinity;
    for (const s of sources) if (s.next < tNext) tNext = s.next;
    this.simTime = tNext;
    for (const s of sources) {
      if (s.next > tNext + 1e-6) continue;
      s.level ^= 1;
      s.next += s.half;
      const comp = s.comp;
      if (comp.type === 'CLOCK') {
        comp._level = s.level;
      } else if (s.pin) {
        comp.outputs[s.pin] = s.level;
        if (s.netIdx === undefined || s.topo !== t) {
          s.netIdx = t.pinNet.get(`${comp.id}:${s.pin}`);
          s.topo = t;
          // fast falling edge: only this source drives the clock net and every reader reacts to rising edges only
          const net = s.netIdx === undefined ? null : t.nets[s.netIdx];
          s.fastFall = !!net && !!DEVICES[comp.type]?.risingOnlyClocks && net.drivers.length === 1
            && net.pull === undefined && net.readers.every((r) => r.risingOnly || isPassive(r.comp));
        }
        if (!s.level && s.fastFall) {
          // the net goes low, nobody evaluates: update values and edge memories in place
          const net = t.nets[s.netIdx];
          net.value = 0;
          for (const r of net.readers) {
            if (r.isIn) r.comp.inputs[r.pin] = 0;
            if (r.isOut) r.comp.outputs[r.pin] = 0;
            if (r.risingOnly) (r.comp._p = r.comp._p || {})[r.pin] = 0;
          }
          continue;
        }
        if (s.netIdx !== undefined) this._dirtyNets.add(s.netIdx);
      }
      if (!s.level && DEVICES[comp.type]?.risingOnlyClocks) continue; // nothing to do on its own falling edge
      (comp._edges = comp._edges || []).push(s.level ? s.riseEvt : s.fallEvt);
      this._dirtyComps.add(comp);
    }
    this._settle();
  }

  /** One UI step: one clock edge (kept name for the toolbar STEP button). */
  stepClock() {
    this.step();
    this.clockState ^= 1;
    this.recordWaveforms();
    this.updateThermalModel();
    this.notify();
  }

  /** Run `n` clock edges without notifying listeners (fast batch). */
  run(n) {
    for (let i = 0; i < n; i++) this.step();
  }

  /** Run until simulated time advances by `ns` nanoseconds. */
  runFor(ns) {
    const end = this.simTime + ns;
    let guard = 0;
    while (this.simTime < end && guard++ < 50_000_000) {
      const before = this.simTime;
      this.step();
      if (this.simTime === before && !this._clockSources().length) break;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    let last = performance.now();
    let budget = 0;
    const FRAME = 33;
    this._timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(250, now - last) / 1000;
      last = now;
      const t0 = performance.now();
      if (!Number.isFinite(this.clockFrequency)) {
        // as fast as possible: ~20 ms of compute per UI frame
        let n = 0;
        while (performance.now() - t0 < 20) { this.run(200); n += 200; }
      } else {
        budget += this.clockFrequency * 2 * dt; // two edges per clock period
        let n = Math.floor(budget);
        budget -= n;
        while (n-- > 0 && performance.now() - t0 < 20) this.step();
        budget = Math.min(budget, 1);
      }
      this.clockState ^= 1;
      this.recordWaveforms();
      this.updateThermalModel();
      this.notify();
    }, FRAME);
    this.notify();
  }

  stop() {
    this.isRunning = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.notify();
  }

  /** UI speed. Number = clock periods of a 1-clock circuit per second; Infinity = full speed. */
  setFrequency(hz) {
    this.clockFrequency = Number.isFinite(hz) ? Math.max(1, Math.min(1e6, hz)) : Infinity;
    // CLOCK parts without their own frequency follow the UI speed
    this.clocksChanged();
    if (this.isRunning) { this.stop(); this.start(); } else this.notify();
  }

  // ---------------------------------------------------------------- primitives
  _rising(comp, pin) {
    comp._prev = comp._prev || {};
    const prev = comp._prev[pin];
    const cur = comp.inputs[pin];
    comp._prev[pin] = cur;
    return prev === 0 && cur === 1;
  }

  _evaluatePrimitive(comp) {
    const inp = comp.inputs;
    const out = comp.outputs;
    const bit = (v) => (v === 0 || v === 1 ? v : null);
    switch (comp.type) {
      case 'INPUT':
      case 'CONSTANT':
      case 'VDD':
      case 'GND':
        break;
      case 'CLOCK':
        out.out = comp.manualState !== undefined ? comp.manualState : (comp._level ?? out.out ?? 0);
        break;
      case 'NOT': {
        const a = bit(inp.in);
        out.out = a === null ? X : 1 - a;
        break;
      }
      case 'AND':
      case 'NAND': {
        const a = bit(inp.a); const b = bit(inp.b);
        let v = a === 0 || b === 0 ? 0 : a === 1 && b === 1 ? 1 : X;
        if (comp.type === 'NAND' && v !== X) v = 1 - v;
        out.out = v;
        break;
      }
      case 'OR':
      case 'NOR': {
        const a = bit(inp.a); const b = bit(inp.b);
        let v = a === 1 || b === 1 ? 1 : a === 0 && b === 0 ? 0 : X;
        if (comp.type === 'NOR' && v !== X) v = 1 - v;
        out.out = v;
        break;
      }
      case 'XOR':
      case 'XNOR': {
        const a = bit(inp.a); const b = bit(inp.b);
        let v = a === null || b === null ? X : a ^ b;
        if (comp.type === 'XNOR' && v !== X) v = 1 - v;
        out.out = v;
        break;
      }
      case 'TRI_STATE_BUFFER':
        out.out = inp.enable === 1 ? (isLogicValue(inp.in) ? inp.in : X) : inp.enable === 0 ? Z : X;
        break;
      case 'MUX':
        out.out = inp.sel === 0 ? inp.a : inp.sel === 1 ? inp.b : X;
        break;
      case 'DEMUX':
        if (inp.sel === 0) { out.out0 = inp.in; out.out1 = 0; } else if (inp.sel === 1) { out.out0 = 0; out.out1 = inp.in; } else { out.out0 = X; out.out1 = X; }
        break;
      case 'D_FF': {
        if (this._rising(comp, 'clk')) comp.state = isLogicValue(inp.d) ? inp.d & 1 : X;
        out.q = comp.state ?? 0;
        out.nq = out.q === X ? X : 1 - out.q;
        break;
      }
      case 'REGISTER_8BIT':
      case 'REGISTER_16BIT':
      case 'REGISTER_32BIT': {
        const bits = comp.type === 'REGISTER_8BIT' ? 8 : comp.type === 'REGISTER_16BIT' ? 16 : 32;
        const edge = this._rising(comp, 'clk');
        if (inp.clr === 1) comp.state = 0;
        else if (edge && inp.we !== 0) comp.state = isLogicValue(inp.d) ? (bits === 32 ? inp.d >>> 0 : inp.d & ((1 << bits) - 1)) : X;
        out.q = comp.state ?? 0;
        break;
      }
      case 'ADDER_8BIT': {
        if (!isLogicValue(inp.a) || !isLogicValue(inp.b) || !isLogicValue(inp.cin)) { out.sum = X; out.cout = X; break; }
        const s = (inp.a & 0xFF) + (inp.b & 0xFF) + (inp.cin & 1);
        out.sum = s & 0xFF;
        out.cout = s >> 8;
        break;
      }
      case 'FULL_ADDER': {
        const a = bit(inp.a); const b = bit(inp.b); const c = bit(inp.cin);
        if (a === null || b === null || c === null) { out.s = X; out.cout = X; break; }
        out.s = a ^ b ^ c;
        out.cout = (a & b) | (c & (a ^ b));
        break;
      }
      case 'COMPARATOR_8BIT':
        if (!isLogicValue(inp.a) || !isLogicValue(inp.b)) { out.eq = X; out.lt = X; break; }
        out.eq = (inp.a & 0xFF) === (inp.b & 0xFF) ? 1 : 0;
        out.lt = (inp.a & 0xFF) < (inp.b & 0xFF) ? 1 : 0;
        break;
      case 'BUS_SPLITTER': {
        const v = inp.bus;
        for (let b = 0; b < 8; b++) out[`b${b}`] = isLogicValue(v) ? (v >> b) & 1 : X;
        break;
      }
      case 'BUS_MERGER': {
        let v = 0;
        for (let b = 0; b < 8; b++) {
          const x = inp[`b${b}`];
          if (!isLogicValue(x)) { v = X; break; }
          v |= (x & 1) << b;
        }
        out.bus = v;
        break;
      }
      case 'RAM': {
        if (!comp.memory) comp.memory = new Uint8Array(256);
        const addr = isLogicValue(inp.addr) ? inp.addr & 0xFF : 0;
        if (this._rising(comp, 'clk') && inp.we === 1 && isLogicValue(inp.din)) comp.memory[addr] = inp.din & 0xFF;
        out.dout = comp.memory[addr];
        break;
      }
      case 'ROM': {
        if (!comp.memory) comp.memory = new Uint8Array(256);
        out.dout = isLogicValue(inp.addr) ? comp.memory[inp.addr & 0xFF] : X;
        break;
      }
      case 'VIRTUAL_SCREEN': {
        if (!comp.vram) comp.vram = new Uint8Array(64 * 64);
        if (this._rising(comp, 'clk') && inp.we === 1 && isLogicValue(inp.x) && isLogicValue(inp.y) && isLogicValue(inp.color)) {
          comp.vram[(inp.y & 63) * 64 + (inp.x & 63)] = inp.color & 0xFF;
        }
        break;
      }
      case 'PROBE':
        comp.value = inp.in;
        break;
      case 'SEVEN_SEGMENT': {
        const bits = [inp.b0, inp.b1, inp.b2, inp.b3];
        comp.value = bits.every(isLogicValue) ? bits.reduce((acc, b, i) => acc | ((b & 1) << i), 0) : X;
        break;
      }
      case 'CUSTOM_CHIP':
        if (typeof comp.evalFn === 'function') comp.evalFn(inp, out);
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- instruments
  recordWaveforms() {
    for (const [id, comp] of this.components.entries()) {
      for (const [pin, val] of Object.entries(comp.outputs)) {
        const key = `${id}.${pin}`;
        if (!this.waveformHistory.has(key)) this.waveformHistory.set(key, []);
        const hist = this.waveformHistory.get(key);
        hist.push(val === Z ? 0.5 : val === X ? 0.5 : val);
        if (hist.length > this.maxWaveformPoints) hist.shift();
      }
    }
  }

  // Switching activity heats the part, ambient cooling pulls it back to 25 °C
  updateThermalModel() {
    for (const comp of this.components.values()) {
      const temp = this.thermalMap.get(comp.id) ?? 25;
      const activity = comp._activity || 0;
      comp._activity = 0;
      const target = 25 + Math.min(70, Math.log2(1 + activity) * 4);
      this.thermalMap.set(comp.id, temp + (target - temp) * 0.05);
    }
  }

  // Package a selection into a reusable chip definition
  packageSubcircuit(name, compIds) {
    const ids = new Set(compIds.filter((id) => this.components.has(id)));
    const crossing = this.wires.filter((w) => ids.has(w.from.id) !== ids.has(w.to.id));
    return {
      name,
      components: [...ids].map((id) => this.components.get(id)),
      wires: this.wires.filter((w) => ids.has(w.from.id) && ids.has(w.to.id)),
      inputs: crossing.filter((w) => ids.has(w.to.id)).map((w) => w.to),
      outputs: crossing.filter((w) => ids.has(w.from.id)).map((w) => w.from),
    };
  }

  // ---------------------------------------------------------------- load / save
  clear() {
    this.stop();
    this.components.clear();
    this.wires = [];
    this.thermalMap.clear();
    this.waveformHistory.clear();
    this.tickCount = 0;
    this.simTime = 0;
    this.clockState = 0;
    this._clockPhase = null;
    this._clockLevel = null;
    this.invalidate();
    this.notify();
  }

  // Replace the whole circuit with deep copies of a { components, wires } definition
  loadCircuit(circuit) {
    this.clear();
    for (const c of circuit.components || []) {
      const copy = JSON.parse(JSON.stringify(c));
      this.addComponent(copy);
    }
    for (const w of circuit.wires || []) this.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
    this.propagate();
    this.notify();
  }

  exportState(name = 'Silicon Circuit') {
    const serializedComponents = [];
    for (const comp of this.components.values()) {
      const copy = {};
      for (const [k, v] of Object.entries(comp)) {
        if (typeof v === 'function' || k.startsWith('_')) continue;
        if (ArrayBuffer.isView(v)) continue; // big device memories are rebuilt from defaults
        copy[k] = v;
      }
      copy.inputs = { ...comp.inputs };
      copy.outputs = { ...comp.outputs };
      if (comp.memory && comp.memory.length <= 65536) copy.memory = Array.from(comp.memory);
      if (comp.vram) copy.vram = Array.from(comp.vram);
      serializedComponents.push(copy);
    }
    return {
      version: 3,
      name,
      createdAt: new Date().toISOString(),
      components: serializedComponents,
      wires: this.wires.map((w) => ({ from: { ...w.from }, to: { ...w.to } })),
    };
  }

  importState(state) {
    if (!state || !Array.isArray(state.components)) return false;
    this.clear();
    for (const comp of state.components) {
      const newComp = JSON.parse(JSON.stringify(comp));
      // circuits saved by engine v1/v2 used 2/3 for Z/X
      for (const side of ['inputs', 'outputs']) {
        for (const [k, v] of Object.entries(newComp[side] || {})) {
          if (state.version !== 3 && v === 2) newComp[side][k] = Z;
          if (state.version !== 3 && v === 3) newComp[side][k] = X;
        }
      }
      if (Array.isArray(comp.memory)) newComp.memory = new Uint8Array(comp.memory);
      if (Array.isArray(comp.vram)) newComp.vram = new Uint8Array(comp.vram);
      this.addComponent(newComp);
    }
    for (const w of state.wires || []) if (w.from && w.to) this.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
    this.propagate();
    this.notify();
    return true;
  }
}
