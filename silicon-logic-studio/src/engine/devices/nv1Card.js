// Behavioural models of the parts on the Diamond Edge 3D 2120 (NVIDIA NV1 / SGS-Thomson STG2000X) and of
// the devices plugged into it. The models talk to each other only through pins and nets, using the real
// interfaces: PCI 2.1 bus cycles (FRAME#/IRDY#/TRDY#/DEVSEL#, multiplexed AD[31:0]), fast-page-mode DRAM
// cycles (RAS#/CAS#/WE#/OE#, multiplexed address), a 15-bit pixel bus into the RAMDAC, analog RGB + TTL sync
// into the VGA connector, a byte-wide strobed bus into the AD1845 codec and the Saturn pad select/data lines.
//
// What is a model and not a copy of the real chip (see AgentMEMORY.md / report):
//  - NV1 register map and the CRTC/audio registers are a simplified map of our own (the real NV1 used an
//    object/FIFO based interface that is not publicly documented). PCI IDs, bus protocols, VGA timing,
//    DRAM organisation and the RGB555 pixel format follow the real hardware.
//  - NV1's quadratic-surface 3D engine is not simulated; the host CPU draws the test image itself.

const Z = 'Z';
const X = 'X';
const num = (v) => typeof v === 'number';

// Edge of an input pin since the last evaluation of this part: 'r' | 'f' | null
function edge(comp, pin) {
  const p = (comp._p = comp._p || {});
  const prev = p[pin];
  const cur = comp.inputs[pin];
  p[pin] = cur;
  if (prev === 0 && cur === 1) return 'r';
  if (prev === 1 && cur === 0) return 'f';
  return null;
}
// Edge of one of the part's own clock sources (delivered by the engine)
const ownRising = (comp, name) => !!comp._edges?.some((e) => e.name === name && e.level === 1);

export const hex = (v, n = 8) => (num(v) ? '0x' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0') : String(v));

// ---------------------------------------------------------------------------------------------------------
// Address map used by the host driver and decoded by NV1 (BAR values are what the BIOS/OS would assign)
export const PCI_IDS = { vendor: 0x104A, device: 0x0008 }; // SGS-Thomson, STG 2000X (pci.ids)
export const BAR0_BASE = 0xE0000000; // 16 MB: 0x000000-0x1FFFFF frame buffer (2 MB DRAM), 0x800000+ registers
export const ROM_BASE = 0xC0000000; // 32 KB expansion ROM (video BIOS EPROM)
export const REG = {
  HTOTAL: 0x800000, HDISP: 0x800004, HSYNC_START: 0x800008, HSYNC_END: 0x80000C,
  VTOTAL: 0x800010, VDISP: 0x800014, VSYNC_START: 0x800018, VSYNC_END: 0x80001C,
  CRTC_CTRL: 0x800020, FB_START: 0x800024, PITCH: 0x800028,
  GAMEPORT: 0x800030, STATUS: 0x800034,
  AUDIO_CTRL: 0x800040, VOICE_BASE: 0x800100, // 32 voices x 16 bytes: +0 phase increment, +4 volume, +8 waveform, +C pan
};
// VESA 640x480 @ 60 Hz (25.175 MHz pixel clock, negative syncs)
export const MODE_640x480 = {
  htotal: 800, hdisp: 640, hss: 656, hse: 752, vtotal: 525, vdisp: 480, vss: 490, vse: 492, pclk: 25.175e6,
};

const CMD = { MEM_READ: 0x6, MEM_WRITE: 0x7, CFG_READ: 0xA, CFG_WRITE: 0xB };

// ---------------------------------------------------------------------------------------------------------
// HOST PC: Pentium + i430FX PCI chipset, running the display driver as a sequence of real PCI transactions.
function* hostDriver(comp) {
  const log = (s) => { comp.log.push(s); if (comp.log.length > 40) comp.log.shift(); };
  const st = comp.status;
  st.phase = 'PCI config';
  const id = yield { cmd: CMD.CFG_READ, addr: 0x00 };
  st.configId = id;
  if (id === 0xFFFFFFFF || !num(id)) {
    log('CFG 00h: master abort - no device in the slot');
    st.phase = 'no card';
    return;
  }
  log(`CFG 00h = ${hex(id)} (vendor ${hex(id & 0xFFFF, 4)}, device ${hex(id >>> 16, 4)})`);
  const cls = yield { cmd: CMD.CFG_READ, addr: 0x08 };
  log(`CFG 08h = ${hex(cls)} (class ${hex(cls >>> 8, 6)} = VGA display controller)`);
  yield { cmd: CMD.CFG_WRITE, addr: 0x10, data: [BAR0_BASE] };
  yield { cmd: CMD.CFG_WRITE, addr: 0x30, data: [ROM_BASE | 1] };
  yield { cmd: CMD.CFG_WRITE, addr: 0x04, data: [0x0006] }; // memory space + bus master
  log(`BAR0 = ${hex(BAR0_BASE)}, ROM = ${hex(ROM_BASE)}`);

  st.phase = 'BIOS ROM';
  const rom0 = yield { cmd: CMD.MEM_READ, addr: ROM_BASE };
  st.romSignature = rom0 & 0xFFFF;
  log(`ROM[0] = ${hex(rom0)} -> signature ${hex(rom0 & 0xFFFF, 4)} ${(rom0 & 0xFFFF) === 0xAA55 ? 'OK' : 'BAD'}`);

  st.phase = 'audio setup';
  const chord = [261.63, 329.63, 392.0]; // C major
  for (let v = 0; v < chord.length; v++) {
    const inc = Math.round((chord[v] * 2 ** 32) / 48000) >>> 0;
    yield { cmd: CMD.MEM_WRITE, addr: BAR0_BASE + REG.VOICE_BASE + v * 16, data: [inc, 150, 0, v === 1 ? 0 : v === 0 ? 0x40 : 0xC0] };
  }
  yield { cmd: CMD.MEM_WRITE, addr: BAR0_BASE + REG.AUDIO_CTRL, data: [1] };
  log('audio: 3 voices on (C-E-G)');

  // mode: VESA 640x480 by default; tests may plug in a smaller timing (comp.driverMode)
  const m = comp.driverMode || MODE_640x480;
  const W = m.hdisp;
  const H = m.vdisp;
  const pitch = W * 2;
  st.phase = `CRTC ${W}x${H}`;
  yield {
    cmd: CMD.MEM_WRITE,
    addr: BAR0_BASE + REG.HTOTAL,
    data: [m.htotal, m.hdisp, m.hss, m.hse, m.vtotal, m.vdisp, m.vss, m.vse, 0b111, 0, pitch],
  };
  log(`CRTC: ${W}x${H}, RGB555, pitch ${pitch} B, negative syncs`);

  st.phase = 'drawing';
  for (let y = 0; y < H; y++) {
    for (let x0 = 0; x0 < W; x0 += 32) {
      const data = [];
      for (let x = x0; x < Math.min(W, x0 + 32); x += 2) data.push((testPixel(x, y, W, H) | (testPixel(x + 1, y, W, H) << 16)) >>> 0);
      yield { cmd: CMD.MEM_WRITE, addr: BAR0_BASE + y * pitch + x0 * 2, data };
    }
    st.progress = (y + 1) / H;
    if (y % 32 === 31) st.pad = (yield { cmd: CMD.MEM_READ, addr: BAR0_BASE + REG.GAMEPORT }) & 0xFFFF;
  }
  const back = yield { cmd: CMD.MEM_READ, addr: BAR0_BASE + Math.floor(H / 2) * pitch + 2 * 2 };
  st.readBack = back;
  log(`frame buffer written, read-back (2,${Math.floor(H / 2)}) = ${hex(back)}`);

  st.phase = 'running';
  for (;;) {
    st.pad = (yield { cmd: CMD.MEM_READ, addr: BAR0_BASE + REG.GAMEPORT }) & 0xFFFF;
    st.nv1Status = yield { cmd: CMD.MEM_READ, addr: BAR0_BASE + REG.STATUS };
    yield { idle: 33000 }; // ~1 ms
  }
}

export const rgb555 = (r, g, b) => ((r & 31) << 10) | ((g & 31) << 5) | (b & 31);
// Test image drawn by the host: 1 px white frame, 8 colour bars, grey ramp, a checker block
export function testPixel(x, y, W = 640, H = 480) {
  if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return rgb555(31, 31, 31);
  if (y < Math.floor((H * 5) / 8)) {
    const bars = [[31, 31, 31], [31, 31, 0], [0, 31, 31], [0, 31, 0], [31, 0, 31], [31, 0, 0], [0, 0, 31], [0, 0, 0]];
    const [r, g, b] = bars[Math.min(7, Math.floor((x * 8) / W))];
    return rgb555(r, g, b);
  }
  if (y < Math.floor((H * 4) / 5)) {
    const v = Math.floor((x * 32) / W);
    return rgb555(v, v, v);
  }
  if (x >= W * 0.375 && x < W * 0.625) return ((x >> 4) + (y >> 4)) & 1 ? rgb555(31, 20, 0) : rgb555(2, 2, 6);
  return rgb555(4, 6, 12);
}

function hostRising(comp) {
  const h = comp._h;
  const inp = comp.inputs;
  const out = comp.outputs;
  const finish = (result) => {
    const prog = comp._prog;
    h.cur = null;
    h.st = 'turn';
    h.next = prog.next(result);
    comp.status.transactions++;
  };
  switch (h.st) {
    case 'reset':
      out.rst_n = 0;
      out.frame_n = Z; out.irdy_n = Z; out.ad = Z; out.cbe_n = Z; out.idsel = 0;
      if (++h.cnt >= 8) { out.rst_n = 1; h.st = 'idle'; h.idle = 4; comp._prog = hostDriver(comp); h.next = comp._prog.next(); }
      break;
    case 'idle': {
      if (h.idle > 0) { h.idle--; break; }
      if (!h.next || h.next.done) break;
      const op = h.next.value;
      if (op.idle) { h.idle = op.idle; h.next = comp._prog.next(); break; }
      h.cur = { ...op, data: op.data || [0], result: [] };
      h.i = 0; h.cnt = 0; h.wait = 0;
      out.frame_n = 0;
      out.ad = op.addr >>> 0;
      out.cbe_n = op.cmd;
      out.idsel = op.cmd === CMD.CFG_READ || op.cmd === CMD.CFG_WRITE ? 1 : 0;
      out.irdy_n = 1;
      h.st = 'addr';
      break;
    }
    case 'addr': {
      const c = h.cur;
      const write = c.cmd === CMD.MEM_WRITE || c.cmd === CMD.CFG_WRITE;
      out.idsel = 0;
      out.irdy_n = 0;
      out.cbe_n = 0; // all four byte lanes
      out.ad = write ? c.data[0] >>> 0 : Z; // read: turnaround cycle, the target will drive AD
      if (c.data.length === 1) out.frame_n = 1; // FRAME# deasserted for the last data phase
      h.st = 'data';
      break;
    }
    case 'data': {
      const c = h.cur;
      const write = c.cmd === CMD.MEM_WRITE || c.cmd === CMD.CFG_WRITE;
      if (inp.devsel_n !== 0) {
        if (++h.cnt > 5) { // nobody claimed the cycle: master abort
          out.frame_n = 1; out.irdy_n = 1; out.ad = Z; out.cbe_n = Z;
          comp.status.aborts++;
          finish(0xFFFFFFFF);
        }
        break;
      }
      if (inp.trdy_n !== 0) { if (++h.wait > 4000) { comp.status.aborts++; out.irdy_n = 1; out.frame_n = 1; finish(X); } break; }
      if (!write) c.result.push(num(inp.ad) ? inp.ad >>> 0 : X);
      h.i++;
      if (h.i >= c.data.length) {
        out.irdy_n = 1; out.ad = Z; out.cbe_n = Z;
        finish(write ? 0 : c.result[0]);
      } else {
        if (write) out.ad = c.data[h.i] >>> 0;
        if (h.i === c.data.length - 1) out.frame_n = 1;
      }
      break;
    }
    case 'turn': // release the sustained tri-state lines (pull-ups hold them high)
      out.frame_n = Z; out.irdy_n = Z;
      h.st = 'idle'; h.idle = 1;
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------------------------------------
// NV1: PCI target, register file, write FIFO, DRAM controller, CRTC/scan-out, wavetable audio, game port
function nv1State(comp) {
  if (comp._s) return comp._s;
  const cfg = new Uint32Array(64);
  cfg[0] = (PCI_IDS.device << 16) | PCI_IDS.vendor;
  cfg[1] = 0x02000000; // status: DEVSEL# medium timing
  cfg[2] = 0x03000001; // class 03 00 00 (VGA compatible), revision 01
  cfg[15] = 0x00000100; // interrupt pin INTA#
  comp._s = {
    cfg,
    crtc: { htotal: 800, hdisp: 640, hss: 656, hse: 752, vtotal: 525, vdisp: 480, vss: 490, vse: 492, ctrl: 0, fbStart: 0, pitch: 1280 },
    voices: Array.from({ length: 32 }, () => ({ inc: 0, phase: 0, vol: 0, wave: 0, pan: 0x80 })),
    audioCtrl: 0,
    pci: { st: 'idle', prevFrame: 1, cur: null },
    wfifo: [], // pending frame-buffer writes { word, lanes:[4], cas:[4] }
    mem: { st: 'idle', rasActive: false, row: -1, openFor: 0, sinceRefresh: 0, req: null },
    readReq: null, // PCI read of the frame buffer waiting for the DRAM controller
    vid: { h: 0, v: 0, frame: 0, fifo: [], owed: 0, fetchY: 0, fetchX: 0, underflows: 0 },
    aud: { st: 'idle', bytes: null, i: 0 },
    rom: { st: 'idle', i: 0, wait: 0, bytes: [] },
    sat: { sel: 0, cnt: 0, state: 0xFFFF },
  };
  return comp._s;
}

const SINE = Array.from({ length: 256 }, (_, i) => Math.round(Math.sin((i / 256) * Math.PI * 2) * 32767));
function wave(kind, phase) {
  const i = phase >>> 24;
  if (kind === 1) return i < 128 ? 24000 : -24000; // square
  if (kind === 2) return (i - 128) * 200; // saw
  return SINE[i];
}

function nv1Reset(comp, s) {
  const out = comp.outputs;
  out.ad = Z; out.trdy_n = Z; out.devsel_n = Z; out.inta_n = Z;
  out.ras_n = 1; out.cas0_n = 3; out.cas1_n = 3; out.cas2_n = 3; out.cas3_n = 3; out.we_n = 1; out.oe_n = 1;
  out.md0 = Z; out.md1 = Z; out.md2 = Z; out.md3 = Z;
  out.hsync = 1; out.vsync = 1; out.blank_n = 0; out.pix = 0;
  out.rom_ce_n = 1; out.rom_oe_n = 1;
  out.aud_d = Z; out.aud_wr_n = 1; out.aud_dack_n = 1;
  s.cfg[1] &= 0xFFFF0000; s.cfg[4] = 0; s.cfg[12] = 0;
  s.crtc.ctrl = 0; s.audioCtrl = 0;
  s.pci = { st: 'idle', prevFrame: 1, cur: null };
  s.wfifo = []; s.readReq = null;
  s.mem = { st: 'idle', rasActive: false, row: -1, openFor: 0, sinceRefresh: 0, req: null };
  s.vid.fifo = []; s.vid.owed = 0;
}

function regRead(s, off) {
  const c = s.crtc;
  switch (off) {
    case REG.HTOTAL: return c.htotal; case REG.HDISP: return c.hdisp; case REG.HSYNC_START: return c.hss; case REG.HSYNC_END: return c.hse;
    case REG.VTOTAL: return c.vtotal; case REG.VDISP: return c.vdisp; case REG.VSYNC_START: return c.vss; case REG.VSYNC_END: return c.vse;
    case REG.CRTC_CTRL: return c.ctrl; case REG.FB_START: return c.fbStart; case REG.PITCH: return c.pitch;
    case REG.GAMEPORT: return s.sat.state;
    case REG.STATUS: return ((s.vid.v >= c.vdisp ? 1 : 0) | ((s.vid.frame & 0xFFFF) << 16)) >>> 0;
    case REG.AUDIO_CTRL: return s.audioCtrl;
    default: return 0;
  }
}

function regWrite(s, off, v) {
  const c = s.crtc;
  const map = {
    [REG.HTOTAL]: 'htotal', [REG.HDISP]: 'hdisp', [REG.HSYNC_START]: 'hss', [REG.HSYNC_END]: 'hse',
    [REG.VTOTAL]: 'vtotal', [REG.VDISP]: 'vdisp', [REG.VSYNC_START]: 'vss', [REG.VSYNC_END]: 'vse',
    [REG.CRTC_CTRL]: 'ctrl', [REG.FB_START]: 'fbStart', [REG.PITCH]: 'pitch',
  };
  if (map[off]) {
    const wasOn = c.ctrl & 1;
    c[map[off]] = v >>> 0;
    // enabling the CRTC starts it at the beginning of vertical blanking, so the FIFO prefetches line 0
    if (off === REG.CRTC_CTRL && !wasOn && (c.ctrl & 1)) Object.assign(s.vid, { h: 0, v: c.vdisp, fetchX: 0, fetchY: 0, fifo: [], owed: 0 });
    return;
  }
  if (off === REG.AUDIO_CTRL) { s.audioCtrl = v & 1; return; }
  if (off >= REG.VOICE_BASE && off < REG.VOICE_BASE + 32 * 16) {
    const voice = s.voices[(off - REG.VOICE_BASE) >> 4];
    const field = ['inc', 'vol', 'wave', 'pan'][((off - REG.VOICE_BASE) >> 2) & 3];
    voice[field] = v >>> 0;
  }
}

function cfgWrite(s, reg, v, be) {
  const mask = (be & 1 ? 0 : 0xFF) | (be & 2 ? 0 : 0xFF00) | (be & 4 ? 0 : 0xFF0000) | (be & 8 ? 0 : 0xFF000000);
  const writable = { 1: 0x00000006, 4: 0xFF000000, 12: 0xFFFF8001, 15: 0x000000FF }[reg];
  if (!writable) return;
  const m = (mask & writable) >>> 0;
  s.cfg[reg] = ((s.cfg[reg] & ~m) | (v & m)) >>> 0;
}

// PCI target state machine, PCI clock domain
function nv1Pci(comp, s) {
  const inp = comp.inputs;
  const out = comp.outputs;
  const p = s.pci;
  const memOn = (s.cfg[1] & 2) !== 0;
  const bar0 = s.cfg[4] >>> 0;
  const romOn = (s.cfg[12] & 1) !== 0;
  const romBase = (s.cfg[12] & 0xFFFF8000) >>> 0;

  if (p.st === 'idle') {
    if (inp.frame_n === 0 && p.prevFrame !== 0 && num(inp.cbe_n) && num(inp.ad)) {
      const cmd = inp.cbe_n;
      const ad = inp.ad >>> 0;
      let hit = null;
      if ((cmd === CMD.CFG_READ || cmd === CMD.CFG_WRITE) && inp.idsel === 1 && (ad & 3) === 0) hit = { kind: 'cfg', off: ad & 0xFC };
      else if ((cmd === CMD.MEM_READ || cmd === CMD.MEM_WRITE || cmd === 0xC || cmd === 0xE || cmd === 0xF) && memOn && bar0 && ((ad & 0xFF000000) >>> 0) === bar0) {
        hit = { kind: (ad & 0xFFFFFF) < 0x800000 ? 'fb' : 'reg', off: ad & 0xFFFFFF };
      } else if (cmd === CMD.MEM_READ && memOn && romOn && ((ad & 0xFFFF8000) >>> 0) === romBase) hit = { kind: 'rom', off: ad & 0x7FFC };
      if (hit) {
        p.cur = { ...hit, write: (cmd & 1) === 1, pending: null };
        p.st = 'data';
        out.devsel_n = 0; // medium decode: DEVSEL# in the 2nd clock
        out.trdy_n = 1;
        out.ad = Z;
      }
    }
  } else if (p.st === 'data') {
    const c = p.cur;
    if (out.trdy_n === 0 && inp.irdy_n === 0) {
      // a data phase completed on this edge
      if (c.write) nv1Write(s, c, inp.ad, inp.cbe_n);
      c.off += 4;
      c.pending = null;
      if (inp.frame_n === 1) {
        out.trdy_n = 1; out.devsel_n = 1; out.ad = Z;
        p.st = 'release';
        p.prevFrame = inp.frame_n;
        return;
      }
    }
    if (c.write) {
      out.ad = Z;
      out.trdy_n = c.kind === 'fb' && s.wfifo.length >= 32 ? 1 : 0; // FIFO full -> wait states
    } else {
      const v = nv1Read(comp, s, c);
      if (v === null) { out.trdy_n = 1; } else { out.ad = v >>> 0; out.trdy_n = 0; }
    }
  } else if (p.st === 'release') {
    out.trdy_n = Z; out.devsel_n = Z; out.ad = Z;
    p.st = 'idle';
  }
  p.prevFrame = inp.frame_n;
}

function nv1Write(s, c, ad, be) {
  if (!num(ad)) return;
  be = num(be) ? be : 0;
  if (c.kind === 'cfg') cfgWrite(s, c.off >> 2, ad >>> 0, be);
  else if (c.kind === 'reg') regWrite(s, c.off, ad >>> 0);
  else if (c.kind === 'fb') {
    const off = c.off & 0x1FFFFC;
    const word = off >> 3;
    const half = (off >> 2) & 1;
    const lanes = [Z, Z, Z, Z];
    const cas = [3, 3, 3, 3];
    lanes[half * 2] = ad & 0xFFFF;
    lanes[half * 2 + 1] = (ad >>> 16) & 0xFFFF;
    cas[half * 2] = be & 3; // C/BE#[1:0] -> LCAS#/UCAS# of the low chip
    cas[half * 2 + 1] = (be >> 2) & 3;
    s.wfifo.push({ word, lanes, cas });
  }
}

// Returns the dword for a read data phase, or null while the data is not there yet (wait state)
function nv1Read(comp, s, c) {
  if (c.kind === 'cfg') return s.cfg[(c.off >> 2) & 63];
  if (c.kind === 'reg') return regRead(s, c.off);
  if (c.kind === 'fb') {
    if (c.pending && c.pending.done) return c.pending.value;
    if (!c.pending) {
      // a 64-bit DRAM read, the controller picks the half we need
      c.pending = { word: (c.off & 0x1FFFF8) >> 3, half: (c.off >> 2) & 1, done: false, value: 0 };
      s.readReq = c.pending;
    }
    return null;
  }
  if (c.kind === 'rom') {
    if (c.pending && c.pending.done) return c.pending.value;
    if (!c.pending) { c.pending = { addr: c.off, done: false, value: 0 }; s.rom.st = 'start'; s.rom.req = c.pending; }
    return null;
  }
  return 0xFFFFFFFF;
}

// EPROM bus, 4 byte reads per dword, each with the EPROM access time (~150 ns = 5 PCI clocks)
function nv1Rom(comp, s) {
  const r = s.rom;
  const out = comp.outputs;
  if (r.st === 'idle') return;
  if (r.st === 'start') { r.i = 0; r.bytes = []; r.st = 'addr'; }
  if (r.st === 'addr') {
    out.rom_a = (r.req.addr + r.i) & 0x7FFF; out.rom_ce_n = 0; out.rom_oe_n = 0;
    r.wait = 5; r.st = 'wait';
    return;
  }
  if (r.st === 'wait') {
    if (--r.wait > 0) return;
    r.bytes.push(num(comp.inputs.rom_d) ? comp.inputs.rom_d & 0xFF : 0xFF);
    if (++r.i < 4) { r.st = 'addr'; out.rom_a = (r.req.addr + r.i) & 0x7FFF; r.wait = 5; r.st = 'wait'; return; }
    out.rom_ce_n = 1; out.rom_oe_n = 1;
    r.req.value = (r.bytes[0] | (r.bytes[1] << 8) | (r.bytes[2] << 16) | (r.bytes[3] << 24)) >>> 0;
    r.req.done = true;
    r.st = 'idle';
  }
}

// Wavetable synth -> AD1845 byte bus (handshake DRQ / DACK# / WR#), PCI clock domain
function nv1Audio(comp, s) {
  const a = s.aud;
  const out = comp.outputs;
  const drq = comp.inputs.aud_drq === 1;
  if (a.st === 'idle') {
    if (!drq) return;
    let l = 0;
    let r = 0;
    if (s.audioCtrl & 1) {
      for (const v of s.voices) {
        if (!v.vol || !v.inc) continue;
        const smp = (wave(v.wave, v.phase) * Math.min(255, v.vol)) / 255 / 4;
        const pan = v.pan & 0xFF;
        l += (smp * (255 - pan)) / 255;
        r += (smp * pan) / 255;
        v.phase = (v.phase + v.inc) >>> 0;
      }
    }
    const clamp = (x) => Math.max(-32768, Math.min(32767, Math.round(x))) & 0xFFFF;
    l = clamp(l); r = clamp(r);
    a.bytes = [l & 0xFF, l >> 8, r & 0xFF, r >> 8];
    a.i = 0;
    a.st = 'byte';
  }
  if (a.st === 'byte') {
    out.aud_dack_n = 0; out.aud_a = a.i; out.aud_d = a.bytes[a.i]; out.aud_wr_n = 0;
    a.st = 'strobe';
  } else if (a.st === 'strobe') {
    out.aud_wr_n = 1; // rising WR# latches the byte in the codec
    a.i++;
    a.st = a.i < 4 ? 'byte' : 'done';
  } else if (a.st === 'done') {
    out.aud_dack_n = 1; out.aud_d = Z;
    if (!drq) a.st = 'idle';
  }
}

// Saturn pad scan: step TH/TR through the 4 select states, read the 4 data lines of each
function nv1GamePort(comp, s) {
  const g = s.sat;
  if (++g.cnt < 64) return;
  g.cnt = 0;
  const d = num(comp.inputs.sat_d) ? comp.inputs.sat_d & 0xF : 0xF;
  g.state = ((g.state & ~(0xF << (g.sel * 4))) | (d << (g.sel * 4))) & 0xFFFF;
  g.sel = (g.sel + 1) & 3;
  comp.outputs.sat_sel = g.sel;
}

// DRAM controller, memory clock domain. 64-bit bus = 4 x 16-bit chips, fast page mode.
function nv1Mem(comp, s) {
  const out = comp.outputs;
  const m = s.mem;
  const inp = comp.inputs;
  const v = s.vid;
  const c = s.crtc;
  m.sinceRefresh++;
  if (m.rasActive) m.openFor++;
  const setCas = (cas) => { out.cas0_n = cas[0]; out.cas1_n = cas[1]; out.cas2_n = cas[2]; out.cas3_n = cas[3]; };
  const releaseMd = () => { out.md0 = Z; out.md1 = Z; out.md2 = Z; out.md3 = Z; };

  switch (m.st) {
    case 'idle': {
      let req = null;
      const wordsPerLine = (c.hdisp * 2) >> 3;
      if (m.sinceRefresh > 780) req = { kind: 'refresh' }; // 15.6 us at 50 MHz
      else if ((c.ctrl & 1) && v.fifo.length < 96 && v.fetchY < c.vdisp) {
        req = { kind: 'scan', word: ((c.fbStart + v.fetchY * c.pitch) >> 3) + v.fetchX };
        if (++v.fetchX >= wordsPerLine) { v.fetchX = 0; v.fetchY++; }
      } else if (s.readReq && !s.readReq.done && !s.wfifo.length) {
        // PCI ordering: a read must not pass posted writes, so the write FIFO drains first
        req = { kind: 'read', word: s.readReq.word, target: s.readReq };
      }
      else if (s.wfifo.length) req = { kind: 'write', ...s.wfifo.shift() };
      if (!req) {
        if (m.rasActive && m.openFor > 400) { out.ras_n = 1; m.rasActive = false; m.st = 'pre'; }
        return;
      }
      m.req = req;
      if (req.kind === 'refresh') {
        if (m.rasActive) { out.ras_n = 1; m.rasActive = false; m.st = 'pre'; return; }
        setCas([0, 0, 0, 0]); // CAS-before-RAS refresh
        m.st = 'cbr1';
        return;
      }
      const row = (req.word >> 9) & 0x1FF;
      if (m.rasActive && m.row === row) { startCas(comp, m); return; }
      if (m.rasActive) { out.ras_n = 1; m.rasActive = false; m.st = 'pre'; return; }
      out.ma = row; out.ras_n = 0; m.rasActive = true; m.row = row; m.openFor = 0;
      m.st = 'rcd';
      return;
    }
    case 'pre': // RAS precharge
      m.st = 'pre2';
      return;
    case 'pre2':
      m.st = m.req ? 'reopen' : 'idle';
      if (m.st === 'reopen') {
        if (m.req.kind === 'refresh') { setCas([0, 0, 0, 0]); m.st = 'cbr1'; return; }
        const row = (m.req.word >> 9) & 0x1FF;
        out.ma = row; out.ras_n = 0; m.rasActive = true; m.row = row; m.openFor = 0;
        m.st = 'rcd';
      }
      return;
    case 'rcd':
      startCas(comp, m);
      return;
    case 'cas': {
      const req = m.req;
      if (req.kind !== 'write') {
        const words = [inp.md0, inp.md1, inp.md2, inp.md3].map((w) => (num(w) ? w & 0xFFFF : 0));
        if (req.kind === 'scan') {
          for (const px of words) {
            if (v.owed > 0) v.owed--;
            else v.fifo.push(px);
          }
        } else if (req.kind === 'read') {
          const h = req.target.half;
          req.target.value = (words[h * 2] | (words[h * 2 + 1] << 16)) >>> 0;
          req.target.done = true;
        }
      }
      setCas([3, 3, 3, 3]); out.we_n = 1; out.oe_n = 1; releaseMd();
      m.req = null;
      m.st = 'idle';
      return;
    }
    case 'cbr1':
      out.ras_n = 0;
      m.st = 'cbr2';
      return;
    case 'cbr2':
      out.ras_n = 1; setCas([3, 3, 3, 3]);
      m.sinceRefresh = 0;
      m.req = null;
      m.st = 'pre';
      return;
    default:
      m.st = 'idle';
  }
}

function startCas(comp, m) {
  const out = comp.outputs;
  const req = m.req;
  out.ma = req.word & 0x1FF;
  if (req.kind === 'write') {
    out.we_n = 0; out.oe_n = 1;
    out.md0 = req.lanes[0]; out.md1 = req.lanes[1]; out.md2 = req.lanes[2]; out.md3 = req.lanes[3];
    out.cas0_n = req.cas[0]; out.cas1_n = req.cas[1]; out.cas2_n = req.cas[2]; out.cas3_n = req.cas[3];
  } else {
    out.we_n = 1; out.oe_n = 0;
    out.cas0_n = 0; out.cas1_n = 0; out.cas2_n = 0; out.cas3_n = 0;
  }
  m.st = 'cas';
}

// CRTC + scan-out, pixel clock domain
function nv1Video(comp, s) {
  const out = comp.outputs;
  const c = s.crtc;
  const v = s.vid;
  if (!(c.ctrl & 1)) {
    out.hsync = c.ctrl & 2 ? 1 : 0; out.vsync = c.ctrl & 4 ? 1 : 0; out.blank_n = 0; out.pix = 0;
    return;
  }
  const visible = v.h < c.hdisp && v.v < c.vdisp;
  out.blank_n = visible ? 1 : 0;
  if (visible) {
    if (v.fifo.length) out.pix = v.fifo.shift();
    else { out.pix = 0; v.underflows++; v.owed++; }
  } else out.pix = 0;
  const hs = v.h >= c.hss && v.h < c.hse;
  const vs = v.v >= c.vss && v.v < c.vse;
  out.hsync = c.ctrl & 2 ? (hs ? 0 : 1) : hs ? 1 : 0;
  out.vsync = c.ctrl & 4 ? (vs ? 0 : 1) : vs ? 1 : 0;
  if (++v.h >= c.htotal) {
    v.h = 0;
    v.v++;
    if (v.v === c.vdisp) { v.fetchY = 0; v.fetchX = 0; v.fifo.length = 0; v.owed = 0; } // vblank: restart fetch
    if (v.v >= c.vtotal) { v.v = 0; v.frame++; }
  }
}

// ---------------------------------------------------------------------------------------------------------
const DRAM_WORDS = 256 * 1024;

export const NV1_DEVICES = {
  PCI_HOST: {
    meta: { ref: 'HOST', part: 'Pentium 133 + Intel 430FX', pkg: 'PC', offBoard: true, desc: 'Hostitelský počítač: ovladač posílá skutečné PCI transakce (config, paměť, ROM).' },
    pins: {
      inputs: { ad: Z, trdy_n: 1, devsel_n: 1, stop_n: 1, inta_n: 1 },
      outputs: { clk: 0, rst_n: 0, ad: Z, cbe_n: Z, frame_n: Z, irdy_n: Z, idsel: 0 },
    },
    widths: { ad: 32, cbe_n: 4 },
    pulls: { frame_n: 1, irdy_n: 1, trdy_n: 1, devsel_n: 1, stop_n: 1, inta_n: 1 },
    netNames: { clk: 'PCI CLK 33 MHz', rst_n: 'RST#', ad: 'AD[31:0]', cbe_n: 'C/BE#[3:0]', frame_n: 'FRAME#', irdy_n: 'IRDY#', trdy_n: 'TRDY#', devsel_n: 'DEVSEL#', idsel: 'IDSEL', inta_n: 'INTA#', stop_n: 'STOP#' },
    init(comp) {
      comp.log = [];
      comp.status = { phase: 'reset', transactions: 0, aborts: 0, progress: 0, pad: 0xFFFF };
      comp._h = { st: 'reset', cnt: 0 };
    },
    clocks: () => [{ pin: 'clk', hz: 33_333_333 }],
    risingOnlyClocks: true,
    eval(comp) {
      if (!comp._h) NV1_DEVICES.PCI_HOST.init(comp);
      if (ownRising(comp, 'clk')) hostRising(comp);
    },
  },

  PCI_EDGE: {
    meta: { ref: 'J1', part: 'PCI 2.1 32-bit 5 V card edge', pkg: 'EDGE-120', desc: 'Pozlacené kontakty karty. Jen vodiče: spojují sloty základní desky s NV1.' },
    passive: true,
    pins: {
      inputs: { clk: Z, rst_n: Z, ad: Z, cbe_n: Z, frame_n: Z, irdy_n: Z, trdy_n: Z, devsel_n: Z, idsel: Z, inta_n: Z },
      outputs: { 'B16 CLK': Z, 'A15 RST#': Z, 'AD[31:0]': Z, 'C/BE#[3:0]': Z, 'A34 FRAME#': Z, 'B35 IRDY#': Z, 'A36 TRDY#': Z, 'B37 DEVSEL#': Z, 'A26 IDSEL': Z, 'A6 INTA#': Z },
    },
    joins: [['clk', 'B16 CLK'], ['rst_n', 'A15 RST#'], ['ad', 'AD[31:0]'], ['cbe_n', 'C/BE#[3:0]'], ['frame_n', 'A34 FRAME#'], ['irdy_n', 'B35 IRDY#'], ['trdy_n', 'A36 TRDY#'], ['devsel_n', 'B37 DEVSEL#'], ['idsel', 'A26 IDSEL'], ['inta_n', 'A6 INTA#']],
    widths: { ad: 32, 'AD[31:0]': 32, cbe_n: 4, 'C/BE#[3:0]': 4 },
    eval() {},
  },

  NV1_CORE: {
    meta: { ref: 'U1', part: 'NVIDIA NV1 / SGS-Thomson STG2000X', pkg: 'PQFP-208', desc: '0,5 µm CMOS, ~1 mil. tranzistorů, 90 mm². PCI, 2D/3D grafika, 32hlasá syntéza, game port.' },
    pins: {
      inputs: {
        pci_clk: 0, rst_n: 0, ad: Z, cbe_n: Z, frame_n: 1, irdy_n: 1, idsel: 0,
        mclk: 0, vclk: 0, md0: Z, md1: Z, md2: Z, md3: Z,
        rom_d: Z, aud_drq: 0, sat_d: 0xF,
      },
      outputs: {
        ad: Z, trdy_n: Z, devsel_n: Z, inta_n: Z,
        ma: 0, ras_n: 1, cas0_n: 3, cas1_n: 3, cas2_n: 3, cas3_n: 3, we_n: 1, oe_n: 1, md0: Z, md1: Z, md2: Z, md3: Z,
        pix: 0, blank_n: 0, hsync: 1, vsync: 1,
        rom_a: 0, rom_ce_n: 1, rom_oe_n: 1,
        aud_d: Z, aud_a: 0, aud_wr_n: 1, aud_dack_n: 1,
        sat_sel: 0,
      },
    },
    widths: { ad: 32, cbe_n: 4, ma: 9, cas0_n: 2, cas1_n: 2, cas2_n: 2, cas3_n: 2, md0: 16, md1: 16, md2: 16, md3: 16, pix: 15, rom_a: 15, rom_d: 8, aud_d: 8, aud_a: 2, sat_sel: 2, sat_d: 4 },
    edgeInputs: { pci_clk: 'r', mclk: 'r', vclk: 'r' },
    netNames: { ma: 'MA[8:0]', ras_n: 'RAS#', we_n: 'WE#', oe_n: 'OE#', md0: 'MD[15:0]', md1: 'MD[31:16]', md2: 'MD[47:32]', md3: 'MD[63:48]', cas0_n: 'CAS#[1:0]', cas1_n: 'CAS#[3:2]', cas2_n: 'CAS#[5:4]', cas3_n: 'CAS#[7:6]', pix: 'P[14:0] RGB555', blank_n: 'BLANK#', hsync: 'HSYNC', vsync: 'VSYNC', rom_a: 'ROM A[14:0]', rom_d: 'ROM D[7:0]', aud_d: 'CODEC D[7:0]', aud_wr_n: 'CODEC WR#', aud_dack_n: 'DACK#', sat_sel: 'TH/TR', sat_d: 'PAD D[3:0]' },
    init(comp) { delete comp._s; },
    eval(comp) {
      const s = nv1State(comp);
      const pe = edge(comp, 'pci_clk');
      const me = edge(comp, 'mclk');
      const ve = edge(comp, 'vclk');
      if (comp.inputs.rst_n !== 1) { nv1Reset(comp, s); return; }
      if (pe === 'r') {
        nv1Pci(comp, s);
        nv1Rom(comp, s);
        nv1Audio(comp, s);
        nv1GamePort(comp, s);
      }
      if (me === 'r') nv1Mem(comp, s);
      if (ve === 'r') nv1Video(comp, s);
    },
  },

  DRAM_256K16: {
    meta: { ref: 'U3', part: 'SEC KM416C256 (256K×16 FPM DRAM, 50 ns)', pkg: 'SOJ-40', desc: '4 Mbit, 512 řádků × 512 sloupců × 16 bitů. Adresa multiplexovaná přes RAS#/CAS#.' },
    pins: { inputs: { a: 0, ras_n: 1, cas_n: 3, we_n: 1, oe_n: 1, dq: Z }, outputs: { dq: Z } },
    widths: { a: 9, cas_n: 2, dq: 16 },
    init(comp) { comp.mem = null; },
    eval(comp) {
      const d = (comp._d = comp._d || { row: 0, reading: false, readAddr: 0, refreshes: 0, writes: 0, reads: 0 });
      if (!comp.mem) comp.mem = new Uint16Array(DRAM_WORDS);
      const inp = comp.inputs;
      const p = (comp._p = comp._p || {});
      const ras = inp.ras_n === 0 ? 0 : 1;
      const cas = num(inp.cas_n) ? inp.cas_n & 3 : 3;
      const prevRas = p.ras ?? 1;
      const prevCas = p.cas ?? 3;
      p.ras = ras; p.cas = cas;
      if (prevRas === 1 && ras === 0) {
        if (prevCas !== 3) d.refreshes++; // CAS before RAS: refresh cycle
        else d.row = num(inp.a) ? inp.a & 0x1FF : 0;
      }
      const falling = prevCas & ~cas & 3; // lanes whose CAS# just went low
      if (ras === 0 && falling && prevRas === 0) {
        const addr = (d.row << 9) | (num(inp.a) ? inp.a & 0x1FF : 0);
        if (inp.we_n === 0) {
          if (num(inp.dq)) {
            let w = comp.mem[addr];
            if (falling & 1) w = (w & 0xFF00) | (inp.dq & 0x00FF);
            if (falling & 2) w = (w & 0x00FF) | (inp.dq & 0xFF00);
            comp.mem[addr] = w;
            d.writes++;
          }
          d.reading = false;
        } else {
          d.reading = true;
          d.readAddr = addr;
          d.reads++;
        }
      }
      if (cas === 3) d.reading = false;
      comp.outputs.dq = ras === 0 && d.reading && inp.oe_n === 0 && inp.we_n !== 0 ? comp.mem[d.readAddr] : Z;
    },
  },

  RAMDAC_STG1764: {
    meta: { ref: 'U2', part: 'SGS-Thomson STG1764X (RAMDAC + PLL)', pkg: 'PQFP-128', desc: 'Převádí 15bitové pixely na analogové RGB 0–0,7 V. PLL z krystalu 14,31818 MHz dělá takt pixelů a paměti.' },
    pins: { inputs: { xtal: Z, pix: 0, blank_n: 0 }, outputs: { vclk: 0, mclk: 0, r: 0, g: 0, b: 0 } },
    widths: { pix: 15 },
    netNames: { vclk: 'VCLK 25.17 MHz', mclk: 'MCLK 50.1 MHz', r: 'RED (analog)', g: 'GREEN (analog)', b: 'BLUE (analog)' },
    // PLL: f = fref * M / (N * 2^P)
    risingOnlyClocks: true,
    pll: { vclk: { m: 116, n: 33, p: 1 }, mclk: { m: 7, n: 2, p: 0 } },
    clocks(comp) {
      const f = comp.inputs.xtal;
      if (!num(f) || Math.abs(f - 14.31818e6) > 0.2e6) return [];
      const { vclk, mclk } = NV1_DEVICES.RAMDAC_STG1764.pll;
      return [
        { pin: 'vclk', hz: (f * vclk.m) / (vclk.n * 2 ** vclk.p) },
        { pin: 'mclk', hz: (f * mclk.m) / (mclk.n * 2 ** mclk.p) },
      ];
    },
    eval(comp, eng) {
      const locked = num(comp.inputs.xtal);
      if (comp._locked !== locked) { comp._locked = locked; eng.clocksChanged(); }
      if (!ownRising(comp, 'vclk')) return;
      const px = num(comp.inputs.pix) ? comp.inputs.pix : 0;
      const on = comp.inputs.blank_n === 1;
      const lvl = (c5) => (on ? Math.round((c5 / 31) * 700) / 1000 : 0); // volts, 0.7 V full scale into 75 ohm
      comp.outputs.r = lvl((px >> 10) & 31);
      comp.outputs.g = lvl((px >> 5) & 31);
      comp.outputs.b = lvl(px & 31);
    },
  },

  CRYSTAL: {
    meta: { ref: 'Y1', part: 'Quartz crystal', pkg: 'HC-49/U', desc: 'Referenční frekvence pro PLL / kodek.' },
    pins: { inputs: {}, outputs: { xtal: 0 } },
    eval(comp) { comp.outputs.xtal = comp.freqHz || 14.31818e6; },
  },

  AD1845: {
    meta: { ref: 'U7', part: 'Analog Devices AD1845JP SoundPort codec', pkg: 'PLCC-68', desc: '16bitový stereo kodek 48 kHz. NV1 do něj posílá vzorky ze syntézy po 8bitové sběrnici.' },
    pins: {
      inputs: { xtal: Z, d: Z, a: 0, wr_n: 1, dack_n: 1, lin_l: Z, lin_r: Z, mic: Z },
      outputs: { drq: 0, lout: 0, rout: 0 },
    },
    widths: { d: 8, a: 2 },
    risingOnlyClocks: true,
    netNames: { drq: 'DRQ', lout: 'LINE OUT L (analog)', rout: 'LINE OUT R (analog)' },
    clocks(comp) {
      const f = comp.inputs.xtal;
      return num(f) && Math.abs(f - 24.576e6) < 0.3e6 ? [{ name: 'fs', hz: f / 512 }] : [];
    },
    eval(comp, eng) {
      const c = (comp._c = comp._c || { bytes: [0, 0, 0, 0], i: 0, next: [0, 0], samples: 0 });
      const locked = num(comp.inputs.xtal);
      if (comp._locked !== locked) { comp._locked = locked; eng.clocksChanged(); }
      if (edge(comp, 'wr_n') === 'r' && comp.inputs.dack_n === 0 && num(comp.inputs.d)) {
        c.bytes[c.i & 3] = comp.inputs.d & 0xFF;
        if (++c.i >= 4) {
          const s16 = (lo, hi) => { const v = lo | (hi << 8); return v >= 0x8000 ? v - 0x10000 : v; };
          c.next = [s16(c.bytes[0], c.bytes[1]), s16(c.bytes[2], c.bytes[3])];
          comp.outputs.drq = 0;
        }
      }
      if (ownRising(comp, 'fs')) {
        // DAC: output the sample received during the last period (1 V peak line level), request the next one
        comp.outputs.lout = Math.round((c.next[0] / 32768) * 1000) / 1000;
        comp.outputs.rout = Math.round((c.next[1] / 32768) * 1000) / 1000;
        c.samples++;
        c.i = 0;
        comp.outputs.drq = 1;
      }
    },
  },

  EPROM_27C256: {
    meta: { ref: 'U8', part: 'Video BIOS EPROM 27C256 (32K×8)', pkg: 'DIP-28', desc: 'Rozšiřující ROM karty: začíná podpisem 55h AAh, součet všech bajtů = 0.' },
    pins: { inputs: { a: 0, ce_n: 1, oe_n: 1 }, outputs: { d: Z } },
    widths: { a: 15, d: 8 },
    init(comp) {
      const rom = new Uint8Array(32768).fill(0xFF);
      rom[0] = 0x55; rom[1] = 0xAA; rom[2] = 32768 / 512; // signature + size in 512 B blocks
      rom[3] = 0xEB; rom[4] = 0x4B; // JMP short to the init code (model)
      const text = 'IBM VGA Compatible BIOS. NV1 / STG2000X (simulation model)';
      for (let i = 0; i < text.length; i++) rom[0x1E + i] = text.charCodeAt(i);
      let sum = 0;
      for (let i = 0; i < rom.length - 1; i++) sum = (sum + rom[i]) & 0xFF;
      rom[rom.length - 1] = (256 - sum) & 0xFF;
      comp.rom = rom;
    },
    eval(comp) {
      if (!comp.rom) NV1_DEVICES.EPROM_27C256.init(comp);
      const i = comp.inputs;
      comp.outputs.d = i.ce_n === 0 && i.oe_n === 0 && num(i.a) ? comp.rom[i.a & 0x7FFF] : Z;
    },
  },

  VGA_DB15: {
    meta: { ref: 'J2', part: 'DE-15 (VGA) female', pkg: 'DSUB-15HD', desc: 'Piny 1–3 analogové R/G/B, 13 HSYNC, 14 VSYNC.' },
    passive: true,
    pins: {
      inputs: { r: Z, g: Z, b: Z, hsync: Z, vsync: Z },
      outputs: { '1 RED': Z, '2 GREEN': Z, '3 BLUE': Z, '13 HSYNC': Z, '14 VSYNC': Z },
    },
    joins: [['r', '1 RED'], ['g', '2 GREEN'], ['b', '3 BLUE'], ['hsync', '13 HSYNC'], ['vsync', '14 VSYNC']],
    eval() {},
  },

  GAME_PORT: {
    meta: { ref: 'J3', part: 'Game port (RJ-45, Diamond proprietary)', pkg: 'RJ45', desc: 'Kabel k bracketu se dvěma porty Sega Saturn.' },
    passive: true,
    pins: { inputs: { sel: Z, d: Z }, outputs: { 'TH/TR': Z, 'D[3:0]': Z } },
    joins: [['sel', 'TH/TR'], ['d', 'D[3:0]']],
    widths: { sel: 2, 'TH/TR': 2, d: 4, 'D[3:0]': 4 },
    eval() {},
  },

  AUDIO_JACK: {
    meta: { ref: 'J5', part: '3.5 mm stereo jack', pkg: 'JACK35', desc: 'Hrot = levý kanál, kroužek = pravý kanál.' },
    passive: true,
    pins: { inputs: { l: Z, r: Z }, outputs: { 'TIP L': Z, 'RING R': Z } },
    joins: [['l', 'TIP L'], ['r', 'RING R']],
    eval() {},
  },

  SATURN_PAD: {
    meta: { ref: 'PAD', part: 'Sega Saturn control pad', pkg: 'PAD', offBoard: true, desc: '13 tlačítek, 4 datové linky, výběr skupiny přes TH/TR. Stisk = 0.' },
    pins: { inputs: { sel: 0 }, outputs: { d: 0xF } },
    widths: { sel: 2, d: 4 },
    // select (TH = bit 0, TR = bit 1) -> buttons on D0..D3
    groups: [['z', 'y', 'x', 'r'], ['b', 'c', 'a', 'start'], ['up', 'down', 'left', 'right'], [null, null, null, 'l']],
    init(comp) { comp.buttons = comp.buttons || {}; },
    eval(comp) {
      const sel = num(comp.inputs.sel) ? comp.inputs.sel & 3 : 0;
      const group = NV1_DEVICES.SATURN_PAD.groups[sel];
      let d = 0;
      group.forEach((b, i) => { if (!(b && comp.buttons?.[b])) d |= 1 << i; });
      comp.outputs.d = d;
    },
  },

  VGA_MONITOR: {
    meta: { ref: 'CRT', part: '14" VGA CRT monitor', pkg: 'CRT', offBoard: true, desc: 'Analogový monitor: obraz skládá jen z napětí R/G/B a z časování HSYNC/VSYNC.' },
    pins: { inputs: { r: Z, g: Z, b: Z, hsync: Z, vsync: Z }, outputs: {} },
    // timing table the monitor uses to recognise a mode from the measured sync frequencies
    modes: [{ name: '640×480 @ 60 Hz', hHz: 31469, vHz: 59.94, w: 640, h: 480, pclk: 25.175e6, hBack: 96 + 48, vBack: 2 + 33 }],
    hpos: -1, // factory H-position: compensates the 1-pixel RAMDAC pipeline
    init(comp) { comp.status = 'NO SIGNAL'; comp.frames = 0; },
    eval(comp, eng) {
      const m = (comp._m = comp._m || { tHs: 0, tVs: 0, hPeriod: 0, vPeriod: 0, mode: null, lines: 0, x: 0, color: [0, 0, 0] });
      if (!comp.image) comp.image = new Uint8ClampedArray(640 * 480 * 4);
      const t = eng.simTime;
      const inp = comp.inputs;
      const he = edge(comp, 'hsync');
      const ve = edge(comp, 'vsync');
      const dev = NV1_DEVICES.VGA_MONITOR;
      const T = m.mode ? 1e9 / m.mode.pclk : 40;
      const xOf = (time) => Math.round((time - m.tHs) / T - (m.mode ? m.mode.hBack : 0) + dev.hpos);
      const span = (x1) => {
        if (!m.mode) return;
        const y = m.lines - m.mode.vBack;
        if (y < 0 || y >= 480) return;
        const a = Math.max(0, m.x);
        const b = Math.min(640, x1);
        const [r, g, bl] = m.color;
        for (let x = a; x < b; x++) {
          const o = (y * 640 + x) * 4;
          comp.image[o] = r; comp.image[o + 1] = g; comp.image[o + 2] = bl; comp.image[o + 3] = 255;
        }
      };
      const volt = (v) => (num(v) ? Math.max(0, Math.min(255, Math.round((v / 0.7) * 255))) : 0);
      const color = [volt(inp.r), volt(inp.g), volt(inp.b)];
      if (color[0] !== m.color[0] || color[1] !== m.color[1] || color[2] !== m.color[2]) {
        const x = xOf(t);
        span(x);
        m.x = x;
        m.color = color;
      }
      if (he === 'f') {
        span(640);
        if (m.tHs) m.hPeriod = t - m.tHs;
        m.tHs = t;
        m.lines++;
        m.x = -9999;
      }
      if (ve === 'f') {
        if (m.tVs) m.vPeriod = t - m.tVs;
        m.tVs = t;
        m.lines = 0;
        const hHz = m.hPeriod ? 1e9 / m.hPeriod : 0;
        const vHz = m.vPeriod ? 1e9 / m.vPeriod : 0;
        m.mode = (comp.modes || dev.modes).find((md) => Math.abs(hHz - md.hHz) / md.hHz < 0.02 && (!vHz || Math.abs(vHz - md.vHz) / md.vHz < 0.03)) || null;
        comp.status = m.mode ? `${m.mode.name} (${(hHz / 1000).toFixed(2)} kHz / ${vHz ? vHz.toFixed(2) : '—'} Hz)` : hHz ? 'OUT OF RANGE' : 'NO SIGNAL';
        if (m.mode && m.vPeriod) comp.frames++;
      }
    },
  },

  AUDIO_SPEAKERS: {
    meta: { ref: 'SPK', part: 'Active speakers (line in)', pkg: 'SPEAKER', offBoard: true, desc: 'Zobrazí průběh napětí na linkovém výstupu.' },
    pins: { inputs: { l: Z, r: Z }, outputs: {} },
    eval(comp) {
      const sc = (comp.scope = comp.scope || []);
      const l = num(comp.inputs.l) ? comp.inputs.l : 0;
      const r = num(comp.inputs.r) ? comp.inputs.r : 0;
      sc.push([l, r]);
      if (sc.length > 256) sc.shift();
      comp.peak = Math.max(Math.abs(l), Math.abs(r), (comp.peak || 0) * 0.995);
      comp.maxAbs = Math.max(comp.maxAbs || 0, Math.abs(l), Math.abs(r));
    },
  },
};
