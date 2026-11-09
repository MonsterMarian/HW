// SILICON // LOGIC STUDIO - HIGH-PERFORMANCE SIMULATION ENGINE
// Supports bit-accurate logic (0, 1, High-Z), multi-bit buses, sequential elements,
// Dual-Port VRAM virtual screen, subcircuit flattening, and contention detection.

export const WireState = {
  LOW: 0,
  HIGH: 1,
  HIGH_Z: 2,
  CONFLICT: 3,
};

export class LogicEngine {
  constructor() {
    this.components = new Map(); // id -> component
    this.wires = []; // array of { from: { id, pin }, to: { id, pin } }
    this.clockState = 0;
    this.clockFrequency = 10; // Hz
    this.isRunning = false;
    this.clockTimer = null;
    this.waveformHistory = new Map(); // wireId -> array of history values
    this.maxWaveformPoints = 120;
    this.tickCount = 0;
    this.listeners = new Set();
    this.thermalMap = new Map(); // componentId -> switching frequency / heat
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  addComponent(component) {
    if (!component.id) {
      component.id = 'comp_' + Math.random().toString(36).substring(2, 9);
    }
    this.components.set(component.id, component);
    this.thermalMap.set(component.id, 25.0); // 25°C ambient
    this.notify();
    return component;
  }

  removeComponent(id) {
    this.components.delete(id);
    this.wires = this.wires.filter(
      (w) => w.from.id !== id && w.to.id !== id
    );
    this.thermalMap.delete(id);
    this.notify();
  }

  addWire(fromId, fromPin, toId, toPin) {
    // Avoid duplicates
    const exists = this.wires.some(
      (w) =>
        w.from.id === fromId &&
        w.from.pin === fromPin &&
        w.to.id === toId &&
        w.to.pin === toPin
    );
    if (!exists) {
      this.wires.push({
        id: `wire_${fromId}_${fromPin}_${toId}_${toPin}`,
        from: { id: fromId, pin: fromPin },
        to: { id: toId, pin: toPin },
      });
      this.notify();
    }
  }

  removeWire(wireId) {
    this.wires = this.wires.filter((w) => w.id !== wireId);
    this.notify();
  }

  // Step clock and propagate
  stepClock() {
    this.clockState = this.clockState === 0 ? 1 : 0;
    this.tickCount++;

    // Update all clock generators
    for (const comp of this.components.values()) {
      if (comp.type === 'CLOCK') {
        comp.outputs.out = this.clockState;
      }
    }

    this.propagate();
    this.recordWaveforms();
    this.updateThermalModel();
    this.notify();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const interval = Math.max(10, Math.floor(1000 / (this.clockFrequency * 2)));
    this.clockTimer = setInterval(() => {
      this.stepClock();
    }, interval);
    this.notify();
  }

  stop() {
    this.isRunning = false;
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    this.notify();
  }

  setFrequency(hz) {
    this.clockFrequency = Math.max(1, Math.min(10000, hz));
    if (this.isRunning) {
      this.stop();
      this.start();
    } else {
      this.notify();
    }
  }

  // Main evaluation pass with contention resolution
  propagate(maxPasses = 16) {
    let changed = true;
    let passes = 0;

    while (changed && passes < maxPasses) {
      changed = false;
      passes++;

      // 1. Gather all driver values for each component input pin
      const pinDrivers = new Map(); // key: "toId:toPin" -> array of values

      // Explicit wires
      for (const wire of this.wires) {
        const fromComp = this.components.get(wire.from.id);
        if (!fromComp) continue;

        const val = fromComp.outputs[wire.from.pin];
        const key = `${wire.to.id}:${wire.to.pin}`;
        if (!pinDrivers.has(key)) pinDrivers.set(key, []);
        pinDrivers.get(key).push(val !== undefined ? val : WireState.HIGH_Z);
      }

      // Tunnels (wireless net labels)
      const tunnelOutputs = new Map(); // tunnelName -> value
      for (const comp of this.components.values()) {
        if (comp.type === 'TUNNEL_OUT' && comp.tunnelName) {
          tunnelOutputs.set(comp.tunnelName, comp.inputs.in);
        }
      }
      for (const comp of this.components.values()) {
        if (comp.type === 'TUNNEL_IN' && comp.tunnelName) {
          const val = tunnelOutputs.get(comp.tunnelName);
          comp.outputs.out = val !== undefined ? val : WireState.HIGH_Z;
        }
      }

      // 2. Resolve bus / pin values (handling High-Z and contention)
      for (const [key, drivers] of pinDrivers.entries()) {
        const [toId, toPin] = key.split(':');
        const toComp = this.components.get(toId);
        if (!toComp) continue;

        let resolvedVal = WireState.HIGH_Z;
        const activeDrivers = drivers.filter(
          (d) => d !== WireState.HIGH_Z && d !== undefined
        );

        if (activeDrivers.length === 0) {
          resolvedVal = WireState.HIGH_Z;
        } else if (activeDrivers.length === 1) {
          resolvedVal = activeDrivers[0];
        } else {
          // Check for contention (multiple drivers driving different values)
          const first = activeDrivers[0];
          const hasConflict = activeDrivers.some((d) => d !== first);
          resolvedVal = hasConflict ? WireState.CONFLICT : first;
        }

        if (toComp.inputs[toPin] !== resolvedVal) {
          toComp.inputs[toPin] = resolvedVal;
          changed = true;
        }
      }

      // 3. Evaluate each component's logic function
      for (const comp of this.components.values()) {
        const oldOutputs = JSON.stringify(comp.outputs);
        this.evaluateComponent(comp);
        if (JSON.stringify(comp.outputs) !== oldOutputs) {
          changed = true;
          // Increment switching count for thermal heatmap
          const heat = this.thermalMap.get(comp.id) || 25.0;
          this.thermalMap.set(comp.id, Math.min(105.0, heat + 0.15));
        }
      }
    }
  }

  evaluateComponent(comp) {
    const inp = comp.inputs;
    const out = comp.outputs;

    switch (comp.type) {
      case 'INPUT':
      case 'CONSTANT':
        // Output is user-controlled or fixed
        break;

      case 'CLOCK':
        out.out = this.clockState;
        break;

      case 'NOT':
        out.out = inp.in === 1 ? 0 : inp.in === 0 ? 1 : WireState.HIGH_Z;
        break;

      case 'AND':
        out.out = (inp.a === 1 && inp.b === 1) ? 1 : (inp.a === 0 || inp.b === 0) ? 0 : WireState.HIGH_Z;
        break;

      case 'OR':
        out.out = (inp.a === 1 || inp.b === 1) ? 1 : (inp.a === 0 && inp.b === 0) ? 0 : WireState.HIGH_Z;
        break;

      case 'XOR':
        if (inp.a === WireState.HIGH_Z || inp.b === WireState.HIGH_Z) {
          out.out = WireState.HIGH_Z;
        } else {
          out.out = (inp.a ^ inp.b) & 1;
        }
        break;

      case 'NAND':
        out.out = (inp.a === 1 && inp.b === 1) ? 0 : (inp.a === 0 || inp.b === 0) ? 1 : WireState.HIGH_Z;
        break;

      case 'NOR':
        out.out = (inp.a === 1 || inp.b === 1) ? 0 : (inp.a === 0 && inp.b === 0) ? 1 : WireState.HIGH_Z;
        break;

      case 'TRI_STATE_BUFFER':
        // If enable is 1, pass data through, else High-Z
        if (inp.enable === 1) {
          out.out = inp.in;
        } else {
          out.out = WireState.HIGH_Z;
        }
        break;

      case 'MUX':
        // 2-to-1 Multiplexer (supports numbers/buses)
        if (inp.sel === 0) {
          out.out = inp.a;
        } else if (inp.sel === 1) {
          out.out = inp.b;
        } else {
          out.out = WireState.HIGH_Z;
        }
        break;

      case 'DEMUX':
        // 1-to-2 Demultiplexer
        if (inp.sel === 0) {
          out.out0 = inp.in;
          out.out1 = 0;
        } else if (inp.sel === 1) {
          out.out0 = 0;
          out.out1 = inp.in;
        } else {
          out.out0 = WireState.HIGH_Z;
          out.out1 = WireState.HIGH_Z;
        }
        break;

      case 'D_FF': {
        // Edge-triggered D Flip-Flop
        const prevClk = comp.prevClk || 0;
        const currentClk = inp.clk || 0;
        const isRisingEdge = prevClk === 0 && currentClk === 1;
        comp.prevClk = currentClk;

        if (isRisingEdge) {
          comp.state = (inp.d === 1 || inp.d === 0) ? inp.d : 0;
        }
        out.q = comp.state ?? 0;
        out.nq = out.q === 1 ? 0 : 1;
        break;
      }

      case 'REGISTER_8BIT':
      case 'REGISTER_16BIT':
      case 'REGISTER_32BIT': {
        const bits = comp.type === 'REGISTER_8BIT' ? 8 : comp.type === 'REGISTER_16BIT' ? 16 : 32;
        const mask = bits === 32 ? 0xFFFFFFFF : (1 << bits) - 1;
        const prevClk = comp.prevClk || 0;
        const currentClk = inp.clk || 0;
        const isRisingEdge = prevClk === 0 && currentClk === 1;
        comp.prevClk = currentClk;

        if (inp.clr === 1) {
          comp.state = 0;
        } else if (isRisingEdge && (inp.we === 1 || inp.we === undefined)) {
          comp.state = (Number(inp.d) || 0) & mask;
        }
        out.q = comp.state ?? 0;
        break;
      }

      case 'BUS_SPLITTER': {
        // Splits 8-bit bus into 8 output lines
        const val = Number(inp.bus || 0);
        for (let b = 0; b < 8; b++) {
          out[`b${b}`] = (val >> b) & 1;
        }
        break;
      }

      case 'BUS_MERGER': {
        // Merges 8 lines into an 8-bit bus
        let busVal = 0;
        for (let b = 0; b < 8; b++) {
          const bit = inp[`b${b}`] === 1 ? 1 : 0;
          busVal |= (bit << b);
        }
        out.bus = busVal;
        break;
      }

      case 'RAM': {
        // High-performance flat array RAM
        if (!comp.memory) {
          comp.memory = new Uint8Array(256); // 256 bytes default
        }
        const addr = (Number(inp.addr) || 0) & 0xFF;
        const prevClk = comp.prevClk || 0;
        const currentClk = inp.clk || 0;
        const isRising = prevClk === 0 && currentClk === 1;
        comp.prevClk = currentClk;

        if (isRising && inp.we === 1) {
          comp.memory[addr] = (Number(inp.din) || 0) & 0xFF;
        }
        out.dout = comp.memory[addr];
        break;
      }

      case 'ROM': {
        // Program ROM memory
        if (!comp.memory) {
          comp.memory = new Uint8Array(256);
        }
        const addr = (Number(inp.addr) || 0) & 0xFF;
        out.dout = comp.memory[addr];
        break;
      }

      case 'VIRTUAL_SCREEN': {
        // Dual-port VRAM 64x64 monitor
        if (!comp.vram) {
          comp.vram = new Uint8Array(64 * 64); // 64x64 pixel buffer
        }
        const prevClk = comp.prevClk || 0;
        const currentClk = inp.clk || 0;
        const isRising = prevClk === 0 && currentClk === 1;
        comp.prevClk = currentClk;

        if (isRising && inp.we === 1) {
          const x = (Number(inp.x) || 0) & 63;
          const y = (Number(inp.y) || 0) & 63;
          const color = (Number(inp.color) || 0) & 0xFF;
          comp.vram[y * 64 + x] = color;
        }
        break;
      }

      case 'PROBE':
        // Passes input to output, stores value for visual bubble
        out.val = inp.in;
        break;

      case 'SEVEN_SEGMENT':
        out.val = inp.in;
        break;

      case 'CUSTOM_CHIP':
        // Evaluate compiled subcircuit function or netlist
        if (typeof comp.evalFn === 'function') {
          comp.evalFn(inp, out);
        }
        break;

      default:
        break;
    }
  }

  // Waveform logic analyzer history
  recordWaveforms() {
    for (const [id, comp] of this.components.entries()) {
      for (const [pin, val] of Object.entries(comp.outputs)) {
        const key = `${id}.${pin}`;
        if (!this.waveformHistory.has(key)) {
          this.waveformHistory.set(key, []);
        }
        const hist = this.waveformHistory.get(key);
        hist.push(val === WireState.HIGH_Z ? 0.5 : val);
        if (hist.length > this.maxWaveformPoints) {
          hist.shift();
        }
      }
    }
  }

  // Cool down thermal model towards ambient
  updateThermalModel() {
    for (const [id, temp] of this.thermalMap.entries()) {
      if (temp > 25.0) {
        this.thermalMap.set(id, Math.max(25.0, temp - 0.05));
      }
    }
  }

  // Package a selection into a custom chip
  packageSubcircuit(name, compIds) {
    const subComps = new Map();
    for (const id of compIds) {
      if (this.components.has(id)) {
        subComps.set(id, this.components.get(id));
      }
    }

    // Determine inputs and outputs crossing boundaries
    const inputPins = [];
    const outputPins = [];

    // Create a subcircuit definition
    const chipDef = {
      name,
      components: Array.from(subComps.values()),
      wires: this.wires.filter(
        (w) => subComps.has(w.from.id) && subComps.has(w.to.id)
      ),
    };

    return chipDef;
  }

  // Clear all components and wires
  clear() {
    this.stop();
    this.components.clear();
    this.wires = [];
    this.thermalMap.clear();
    this.waveformHistory.clear();
    this.tickCount = 0;
    this.clockState = 0;
    this.notify();
  }

  // Export full state to plain JS object
  exportState(name = 'Silicon Circuit') {
    const serializedComponents = [];
    for (const comp of this.components.values()) {
      const copy = {
        id: comp.id,
        type: comp.type,
        label: comp.label,
        x: comp.x,
        y: comp.y,
        inputs: { ...comp.inputs },
        outputs: { ...comp.outputs },
      };
      if (comp.memory) copy.memory = Array.from(comp.memory);
      if (comp.vram) copy.vram = Array.from(comp.vram);
      serializedComponents.push(copy);
    }

    return {
      version: 2,
      name,
      createdAt: new Date().toISOString(),
      components: serializedComponents,
      wires: this.wires.map((w) => ({
        from: { id: w.from.id, pin: w.from.pin },
        to: { id: w.to.id, pin: w.to.pin },
      })),
    };
  }

  // Import state from object
  importState(state) {
    if (!state || !Array.isArray(state.components)) return false;
    this.clear();

    for (const comp of state.components) {
      const newComp = { ...comp };
      if (Array.isArray(comp.memory)) {
        newComp.memory = new Uint8Array(comp.memory);
      }
      if (Array.isArray(comp.vram)) {
        newComp.vram = new Uint8Array(comp.vram);
      }
      this.addComponent(newComp);
    }

    if (Array.isArray(state.wires)) {
      for (const w of state.wires) {
        if (w.from && w.to) {
          this.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
        }
      }
    }

    this.propagate();
    this.notify();
    return true;
  }
}
