// Behavioural models of the parts on the Diamond Edge 3D 2120 (NVIDIA NV1 / SGS-Thomson STG2000X) and of
// the devices plugged into it. The models talk to each other only through pins and nets, using the real
// interfaces: PCI 2.0 bus cycles (FRAME#/IRDY#/TRDY#/DEVSEL#, multiplexed AD[31:0]), fast-page-mode DRAM
// cycles on the 32-bit MD bus with two interleaved banks (RAS#/CAS#/WE#/OE#, multiplexed address), pixel loads from
// the DRAM straight into the 64-bit port of the Palette-DAC (LOADCLK), the BIOS ROM and the DAC registers on the same
// MD bus (ROMCS#, DACCS#), analog RGB + TTL sync into the VGA connector, a byte-wide strobed bus into the AD1845
// codec and the Saturn pad lines behind the DAC and the SEGA interface chip.
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
// STG2000 datasheet, appendix A: one chip, two PCI functions. Device ID = chip number 1 in bits 15:3 + function number.
//   function 0 = VGA emulation (104A:0008, class 0x030000, no BARs), function 1 = NV (104A:0009, class 0x048000,
//   one prefetchable 32 MB memory BAR, bus master). Functions 2-7 do not answer.
export const PCI_IDS = { vendor: 0x104A, device: 0x0008, deviceNv: 0x0009 };
export const BAR0_BASE = 0xE0000000; // 32 MB block of the NV function; inside it (our own map): 0x000000-0x1FFFFF frame buffer, 0x800000+ registers
export const ROM_BASE = 0xC0000000; // expansion ROM on a 4 MB boundary, the 32 KB video BIOS sits at its bottom
const FN = (fn, reg) => (fn << 8) | reg; // type 0 configuration address: AD[10:8] function, AD[7:2] register
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
  log(`F0 CFG 00h = ${hex(id)} (vendor ${hex(id & 0xFFFF, 4)}, device ${hex(id >>> 16, 4)})`);
  const cls = yield { cmd: CMD.CFG_READ, addr: 0x08 };
  log(`F0 CFG 08h = ${hex(cls)} (class ${hex(cls >>> 8, 6)} = VGA display controller)`);
  st.headerType = ((yield { cmd: CMD.CFG_READ, addr: 0x0C }) >>> 16) & 0xFF;
  // multi-function device: the BIOS looks at all 8 functions; the ones that are not there end in a master abort
  st.functions = [0];
  for (let fn = 1; fn < (st.headerType & 0x80 ? 8 : 1); fn++) {
    const fid = yield { cmd: CMD.CFG_READ, addr: FN(fn, 0x00), probe: true };
    if (fid !== 0xFFFFFFFF && num(fid)) { st.functions.push(fn); if (fn === 1) st.nvId = fid; }
  }
  log(`header ${hex(st.headerType, 2)}: functions ${st.functions.join(', ')}`);
  const cls1 = yield { cmd: CMD.CFG_READ, addr: FN(1, 0x08) };
  log(`F1 CFG 00h = ${hex(st.nvId)}, 08h = ${hex(cls1)} (class ${hex(cls1 >>> 8, 6)} = multimedia, NV function)`);
  // size the base address registers the way a BIOS does: write all ones, read back the hardwired zeros
  yield { cmd: CMD.CFG_WRITE, addr: 0x10, data: [0xFFFFFFFF] };
  st.vgaBar0 = yield { cmd: CMD.CFG_READ, addr: 0x10 };
  yield { cmd: CMD.CFG_WRITE, addr: FN(1, 0x10), data: [0xFFFFFFFF] };
  const probe = yield { cmd: CMD.CFG_READ, addr: FN(1, 0x10) };
  st.bar0Size = (~(probe & 0xFFFFFFF0) + 1) >>> 0;
  log(`F1 BAR0 probe = ${hex(probe)} -> ${st.bar0Size >>> 20} MB, prefetchable`);
  yield { cmd: CMD.CFG_WRITE, addr: FN(1, 0x10), data: [BAR0_BASE] };
  yield { cmd: CMD.CFG_WRITE, addr: FN(1, 0x30), data: [ROM_BASE | 1] };
  yield { cmd: CMD.CFG_WRITE, addr: FN(1, 0x3C), data: [0x0B] }; // interrupt line: IRQ11
  yield { cmd: CMD.CFG_WRITE, addr: 0x04, data: [0x0003] }; // VGA function: I/O + memory space
  yield { cmd: CMD.CFG_WRITE, addr: FN(1, 0x04), data: [0x0006] }; // NV function: memory space + bus master
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
          if (!c.probe) comp.status.aborts++; // an empty function during enumeration is expected
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
  // configuration space of both functions (STG2000 datasheet appendix A); cfg[fn][register >> 2]
  const vga = new Uint32Array(64);
  vga[0] = (PCI_IDS.device << 16) | PCI_IDS.vendor;
  vga[1] = 0x02000000; // status: DEVSEL# medium
  vga[2] = 0x03000001; // class 03 00 00 (VGA compatible), revision 01 = Rev B
  vga[3] = 0x00800000; // header type 0x80: multi-function device
  vga[15] = 0x000001FF; // INTA#, interrupt line 0xFF = not connected
  const nv = new Uint32Array(64);
  nv[0] = (PCI_IDS.deviceNv << 16) | PCI_IDS.vendor;
  nv[1] = 0x00000000; // status: DEVSEL# fast
  nv[2] = 0x04800001; // class 04 80 00 (multimedia), revision 01
  nv[3] = 0x00800000;
  nv[4] = 0x00000008; // BAR0: memory, 32 bit, prefetchable
  nv[15] = 0x010301FF; // MAX_LAT 1, MIN_GNT 3, INTA#, interrupt line 0xFF
  const cfg = [vga, nv];
  comp._s = {
    cfg,
    crtc: { htotal: 800, hdisp: 640, hss: 656, hse: 752, vtotal: 525, vdisp: 480, vss: 490, vse: 492, ctrl: 0, fbStart: 0, pitch: 1280 },
    voices: Array.from({ length: 32 }, () => ({ inc: 0, phase: 0, vol: 0, wave: 0, pan: 0x80 })),
    audioCtrl: 0,
    pci: { st: 'idle', prevFrame: 1, cur: null },
    wfifo: [], // pending frame-buffer writes { word, lanes:[4], cas:[4] }
    mem: newMem(),
    readReq: null, // PCI read of the frame buffer waiting for the DRAM controller
    busq: [], // pending accesses to the Palette-DAC registers
    vid: { h: 0, v: 0, frame: 0, loaded: 0, consumed: 0, c1: 0, c2: 0, sync: false, underflows: 0 },
    aud: { ph: 'idle', wait: 0, q: [], cur: null, inited: false },
    rom: { req: null, i: 0, bytes: [] },
    sat: { sel: 0, cnt: 0, state: 0xFFFF, busy: false, inited: false },
  };
  return comp._s;
}

const newMem = () => ({ st: 'idle', wait: 0, rasLow: false, row: -1, lowFor: 0, highFor: 99, casHigh: 99, sinceRefresh: 0, refreshDue: 0, req: null, fresh: false, cleanup: false, tick: 0 });

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
  out.ras_n = 1; out.cas02_lo_n = 3; out.cas02_hi_n = 3; out.cas13_lo_n = 3; out.cas13_hi_n = 3;
  out.we03_n = 1; out.we12_n = 1; out.oe0_n = 1; out.oe1_n = 1; out.en64 = 0;
  out.md_lo = Z; out.md_hi = Z;
  out.hsync = 1; out.vsync = 1; out.blank_n = 0; out.loadclk = 0; out.daccs_n = 1;
  out.romcs_n = 1;
  out.aud_d = Z; out.aud_wr_n = 1; out.aud_rd_n = 1; out.aud_pd_n = 1;
  s.aud = { ph: 'idle', wait: 0, q: [], cur: null, inited: false };
  for (const f of s.cfg) { f[1] &= 0xFFFF0000; f[12] = 0; f[15] |= 0xFF; }
  s.cfg[1][3] = 0x00800000; s.cfg[1][4] = 0x00000008;
  s.crtc.ctrl = 0; s.audioCtrl = 0;
  s.pci = { st: 'idle', prevFrame: 1, cur: null };
  s.wfifo = []; s.readReq = null;
  s.mem = newMem();
  s.busq = []; s.rom = { req: null, i: 0, bytes: [] }; s.sat.busy = false; s.sat.inited = false;
  s.vid.loaded = 0; s.vid.consumed = 0; s.vid.c1 = 0; s.vid.c2 = 0; s.vid.sync = false;
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
    if (off === REG.CRTC_CTRL && !wasOn && (c.ctrl & 1)) Object.assign(s.vid, { h: 0, v: c.vdisp, loaded: 0, consumed: 0, c1: 0, c2: 0, sync: false });
    return;
  }
  if (off === REG.AUDIO_CTRL) { s.audioCtrl = v & 1; return; }
  if (off >= REG.VOICE_BASE && off < REG.VOICE_BASE + 32 * 16) {
    const voice = s.voices[(off - REG.VOICE_BASE) >> 4];
    const field = ['inc', 'vol', 'wave', 'pan'][((off - REG.VOICE_BASE) >> 2) & 3];
    voice[field] = v >>> 0;
  }
}

// Writable bits per function (everything else is hardwired): VGA = I/O space, memory space, palette snoop;
// NV = I/O (reference only), memory, bus master, MWI, bits 7:5, SERR enable; latency timer; BAR0 on a 32 MB boundary.
// The expansion ROM register (4 MB boundary) is aliased between both functions.
const CFG_WRITABLE = [
  { 1: 0x00000023, 12: 0xFFC00001, 15: 0x000000FF },
  { 1: 0x000001F7, 3: 0x0000F800, 4: 0xFE000000, 12: 0xFFC00001, 15: 0x000000FF },
];
function cfgWrite(s, fn, reg, v, be) {
  const mask = (be & 1 ? 0 : 0xFF) | (be & 2 ? 0 : 0xFF00) | (be & 4 ? 0 : 0xFF0000) | (be & 8 ? 0 : 0xFF000000);
  const writable = CFG_WRITABLE[fn][reg];
  if (!writable) return;
  const m = (mask & writable) >>> 0;
  s.cfg[fn][reg] = ((s.cfg[fn][reg] & ~m) | (v & m)) >>> 0;
  if (reg === 12) s.cfg[1 - fn][12] = s.cfg[fn][12];
}

// PCI target state machine, PCI clock domain
function nv1Pci(comp, s) {
  const inp = comp.inputs;
  const out = comp.outputs;
  const p = s.pci;
  const memOn = (s.cfg[1][1] & 2) !== 0; // MEMORY_SPACE of the NV function
  const bar0 = (s.cfg[1][4] & 0xFE000000) >>> 0;
  const romOn = (s.cfg[1][12] & 1) !== 0 && ((s.cfg[0][1] | s.cfg[1][1]) & 2) !== 0; // ROM_DECODE and MEMORY_SPACE
  const romBase = (s.cfg[1][12] & 0xFFC00000) >>> 0;

  if (p.st === 'idle') {
    if (inp.frame_n === 0 && p.prevFrame !== 0 && num(inp.cbe_n) && num(inp.ad)) {
      const cmd = inp.cbe_n;
      const ad = inp.ad >>> 0;
      let hit = null;
      if ((cmd === CMD.CFG_READ || cmd === CMD.CFG_WRITE) && inp.idsel === 1 && (ad & 3) === 0) {
        const fn = (ad >> 8) & 7;
        if (fn < 2) hit = { kind: 'cfg', fn, off: ad & 0xFC }; // functions 2-7: no DEVSEL#
      } else if ((cmd === CMD.MEM_READ || cmd === CMD.MEM_WRITE || cmd === 0xC || cmd === 0xE || cmd === 0xF) && memOn && bar0 && ((ad & 0xFE000000) >>> 0) === bar0) {
        hit = { kind: (ad & 0x1FFFFFF) < 0x800000 ? 'fb' : 'reg', off: ad & 0x1FFFFFF };
      } else if (cmd === CMD.MEM_READ && romOn && romBase && ((ad & 0xFFC00000) >>> 0) === romBase) hit = { kind: 'rom', off: ad & 0x7FFC };
      if (hit) {
        p.cur = { ...hit, write: (cmd & 1) === 1, pending: null };
        p.st = 'data';
        out.devsel_n = 0; // fast decode: DEVSEL# is driven in the clock after the address phase
        out.trdy_n = 1;
        out.ad = Z;
      }
    }
  } else if (p.st === 'data') {
    const c = p.cur;
    if (inp.frame_n !== 0 && inp.irdy_n !== 0) {
      // the bus is idle: the master gave up waiting. Drop the transaction and what it was waiting for, so that a late
      // answer cannot be taken for the data of the next one
      if (s.readReq === c.pending) s.readReq = null;
      if (s.rom.req === c.pending) s.rom.req = null;
      out.trdy_n = 1; out.devsel_n = 1; out.ad = Z;
      p.st = 'release';
      p.prevFrame = inp.frame_n;
      return;
    }
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
  if (c.kind === 'cfg') cfgWrite(s, c.fn, c.off >> 2, ad >>> 0, be);
  else if (c.kind === 'reg') regWrite(s, c.off, ad >>> 0);
  else if (c.kind === 'fb') {
    // 2-to-1 interleave: consecutive 32-bit words alternate between the banks; C/BE#[3:0] become the four CAS# of the bank
    const w32 = (c.off & 0x1FFFFC) >> 2;
    s.wfifo.push({ kind: 'write', bank: w32 & 1, cell: w32 >> 1, data: ad >>> 0, cas: be & 0xF });
  }
}

// Returns the dword for a read data phase, or null while the data is not there yet (wait state)
function nv1Read(comp, s, c) {
  if (c.kind === 'cfg') return s.cfg[c.fn][(c.off >> 2) & 63];
  if (c.kind === 'reg') return regRead(s, c.off);
  if (c.kind === 'fb') {
    if (c.pending && c.pending.done) return c.pending.value;
    if (!c.pending) {
      const w32 = (c.off & 0x1FFFFC) >> 2;
      c.pending = { kind: 'read', bank: w32 & 1, cell: w32 >> 1, done: false, value: 0 };
      s.readReq = c.pending;
    }
    return null;
  }
  if (c.kind === 'rom') {
    if (c.pending && c.pending.done) return c.pending.value;
    if (!c.pending) { c.pending = { addr: c.off, done: false, value: 0 }; s.rom = { req: c.pending, i: 0, bytes: [] }; }
    return null;
  }
  return 0xFFFFFFFF;
}

// Wavetable synth -> audio codec (STG2000 datasheet ch. 6, fig. 30): an 8-bit data bus AUD[7:0], two address bits
// AUA[1:0] and independent strobes AUR# / AUW#. The codec's interrupt and DMA (DRQ/DACK) are NOT used, so the codec
// runs in PIO mode: NV1 polls the status register and, when PRDY says the sample register is free, writes 4 bytes.
// Timing in periods of the memory clock (tables 12 and 13): address 4 T before the strobe, strobe 13 T wide,
// write data held 7 T, 15 T between read strobes. How often the real chip polls is not documented (POLL = model).
const AU = { SETUP: 4, STROBE: 13, HOLD: 7, GAP: 15, POLL: 128 };
const CODEC = { INDEX: 0, DATA: 1, STATUS: 2, PIO: 3, PRDY: 0x02 };
function mixVoices(s) {
  let l = 0;
  let r = 0;
  for (const v of s.voices) {
    if (!v.vol || !v.inc) continue;
    const smp = (wave(v.wave, v.phase) * Math.min(255, v.vol)) / 255 / 4;
    const pan = v.pan & 0xFF;
    l += (smp * (255 - pan)) / 255;
    r += (smp * pan) / 255;
    v.phase = (v.phase + v.inc) >>> 0;
  }
  const clamp = (x) => Math.max(-32768, Math.min(32767, Math.round(x))) & 0xFFFF;
  l = clamp(l); r = clamp(r);
  return [l & 0xFF, l >> 8, r & 0xFF, r >> 8]; // 16 bit little endian, left then right
}
function nv1Audio(comp, s) {
  const a = s.aud;
  const out = comp.outputs;
  if (a.wait > 0) { a.wait--; return; }
  if (a.ph === 'idle') {
    if (!a.q.length) {
      if (!(s.audioCtrl & 1)) { a.inited = false; return; }
      if (!a.inited) {
        // AD1848-compatible setup with MCE set: I8 = 0x5C (48 kHz from XTAL1, stereo, 16 bit linear), I9 = 0x41 (PEN + PPIO)
        a.inited = true;
        a.q.push({ a: CODEC.INDEX, d: 0x48 }, { a: CODEC.DATA, d: 0x5C }, { a: CODEC.INDEX, d: 0x49 }, { a: CODEC.DATA, d: 0x41 }, { a: CODEC.INDEX, d: 0x09 });
      } else a.q.push({ a: CODEC.STATUS, rd: true });
    }
    a.cur = a.q.shift();
    out.aud_a = a.cur.a;
    out.aud_d = a.cur.rd ? Z : a.cur.d;
    a.ph = 'setup'; a.wait = AU.SETUP - 1;
  } else if (a.ph === 'setup') {
    if (a.cur.rd) out.aud_rd_n = 0; else out.aud_wr_n = 0;
    a.ph = 'strobe'; a.wait = AU.STROBE - 1;
  } else if (a.ph === 'strobe') {
    if (a.cur.rd) {
      const status = num(comp.inputs.aud_d) ? comp.inputs.aud_d : 0; // sampled at the rising edge of AUR#
      out.aud_rd_n = 1;
      const ready = (status & CODEC.PRDY) !== 0;
      if (ready) for (const d of mixVoices(s)) a.q.push({ a: CODEC.PIO, d });
      a.ph = 'idle'; a.wait = (ready ? AU.GAP : AU.POLL) - 1;
    } else {
      out.aud_wr_n = 1; // the rising edge of AUW# latches the byte in the codec
      a.ph = 'hold'; a.wait = AU.HOLD - 1;
    }
  } else {
    out.aud_d = Z;
    a.ph = 'idle';
  }
}

// ---------------------------------------------------------------------------------------------------------
// Memory bus controller (STG2000 datasheet ch. 5), clocked by MCLKx2: one tick = half a period T of the internal
// memory clock (10 ns). Everything on the MD bus goes through here: both DRAM banks, the BIOS ROM, the registers of
// the Palette-DAC (and through them the game port) and the pixel loads into the DAC.
//   bank 0: MD[31:0],  MA02, CAS02[3:0]#, WE03#, OE0#        bank 1: SDB[31:0], MA13, CAS13[3:0]#, WE12#, OE1#
//   SDB is the far side of the bus switch: EN64 = 0 joins it to MD, EN64 = 1 separates the banks so that each
//   drives its own half of the 64-bit pixel port of the STG1764.
// Timing in ticks, from tables 3, 5, 6, 7 and 10: tRAH = T (2), tRCD = 2T (4), tCAS = T (2), tCP = T (2),
// tPC = 2T (4), tRP = 2.5T (5), tRAS >= 3.5T (7), late write with WE# 0.5T (1); CAS-before-RAS refresh every
// 776 T with tCSR = tCHR = T; ROMCS# 13T wide; DACCS# 3T wide with the address 1.5T before it.
// Order of service: pixel loads -> refresh -> DAC registers -> ROM -> PCI read -> PCI write. The pixel store of the DAC
// holds only 128 bits (two loads), so a load goes first whenever there is room and everything else runs only while the
// store is full; the longest other cycle + a load with a row change (27 ticks) fits into the 31.7 ticks that two words last.
const MT = { REFRESH: 776 * 2, TRP: 5, TRAS: 7, TCP: 2, PAGE_IDLE: 800, DAC_FIFO: 2, GAMEPORT: 192 };
// Palette-DAC registers (envytools pdac): direct 4 / 5 = index low / high, 6 = data at the index, which then steps by one.
// Index 0x300 = Saturn port A data, 0x301 = its mode (1 = input); bits: 3:0 DATA[3:0], 4 SENSE, 5 SELECT[1], 6 SELECT[0].
// That the number of a direct register equals the RS[3:0] code on MD[11:8] is an assumption from the MMIO offsets
// (envytools: INDEX_LOW 0x10, INDEX_HIGH 0x14, DATA 0x18), and so is SELECT[0] = TH, SELECT[1] = TR of the pad.
// On the real card the pads are plain GPIO that the driver scans through these registers; here NV1 scans by itself.
const padSelect = (sel) => ((sel & 1) << 6) | ((sel & 2) << 4); // TH -> bit 6, TR -> bit 5
const DAC_REG = { INDEX_LO: 4, INDEX_HI: 5, DATA: 6 };
const dacOp = (rs, data, pad = false) => ({ kind: 'dac', rs, write: data !== null, data: data ?? 0, pad });
const REFRESH = { kind: 'refresh' };
const ROMBYTE = { kind: 'rom' };

function nv1Mem(comp, s) {
  const out = comp.outputs;
  const inp = comp.inputs;
  const m = s.mem;
  const v = s.vid;
  const c = s.crtc;
  if (++m.sinceRefresh >= MT.REFRESH) { m.sinceRefresh = 0; m.refreshDue++; } // the timer only asks; the cycle runs when the bus is free
  if (m.rasLow) m.lowFor++; else m.highFor++;
  m.casHigh++;
  // game port: every ~2 us select the next button group through port A of the DAC and read its four data lines back
  const g = s.sat;
  if (++g.cnt >= MT.GAMEPORT && !g.busy) {
    g.cnt = 0; g.busy = true;
    if (!g.inited) { g.inited = true; s.busq.push(dacOp(DAC_REG.INDEX_HI, 0x03), dacOp(DAC_REG.INDEX_LO, 0x01), dacOp(DAC_REG.DATA, 0x1F)); } // SELECT[1:0] out, DATA and SENSE in
    s.busq.push(dacOp(DAC_REG.INDEX_LO, 0x00), dacOp(DAC_REG.DATA, padSelect(g.sel)), dacOp(DAC_REG.INDEX_LO, 0x00), dacOp(DAC_REG.DATA, null, true));
  }
  if (m.wait > 0) { m.wait--; return; }
  const closeRow = () => { out.ras_n = 1; m.rasLow = false; m.highFor = 0; m.row = -1; };
  const setCas = (bank, lanes) => {
    if (bank !== 1) { out.cas02_lo_n = lanes & 3; out.cas02_hi_n = (lanes >> 2) & 3; }
    if (bank !== 0) { out.cas13_lo_n = lanes & 3; out.cas13_hi_n = (lanes >> 2) & 3; }
  };

  switch (m.st) {
    case 'idle': {
      if (m.cleanup) { out.md_lo = Z; out.md_hi = Z; out.loadclk = 0; m.cleanup = false; }
      let req = null;
      const total = (c.hdisp * c.vdisp) >> 2; // 64-bit words (4 pixels of 16 bits) per frame
      const video = (c.ctrl & 1) !== 0;
      if (video && v.sync && v.loaded < total && v.loaded - v.consumed < MT.DAC_FIFO) {
        const perLine = c.hdisp >> 2;
        const y = Math.floor(v.loaded / perLine);
        req = { kind: 'scan', cell: (c.fbStart + y * c.pitch + (v.loaded - y * perLine) * 8) >> 3 };
      } else if (m.refreshDue > 0) req = REFRESH;
      else if (s.busq.length) req = s.busq.shift();
      // a ROM byte holds the bus for 300 ns, longer than the pixel store lasts: only with the picture off or in vertical
      // blanking, and there only while at least half a line is left before the picture starts again
      else if (s.rom.req && !s.rom.req.done && (!video || (v.v >= c.vdisp && (c.vtotal - v.v) * c.htotal - v.h >= c.htotal / 2))) req = ROMBYTE;
      // PCI ordering: a read must not pass posted writes, so the write FIFO drains first
      else if (s.readReq && !s.readReq.done && !s.wfifo.length) req = s.readReq;
      else if (s.wfifo.length) req = s.wfifo.shift();
      if (!req) {
        if (m.rasLow && m.lowFor > MT.PAGE_IDLE) closeRow();
        return;
      }
      m.req = req;
    }
    // eslint-disable-next-line no-fallthrough
    case 'go': {
      const req = m.req;
      m.st = 'go';
      if (req.kind === 'rom') {
        // ROM read cycle: address on MD[30:16], R/W# = 1 on MD[31], data comes back on MD[7:0]
        out.md_hi = 0x8000 | ((s.rom.req.addr + s.rom.i) & 0x7FFF); out.md_lo = Z; out.en64 = 0;
        m.st = 'rom1'; m.wait = 1; // tBAS = T
        return;
      }
      if (req.kind === 'dac') {
        // Palette-DAC register cycle on MD[15:8]: DACCS# falling latches RS[3:0] (MD[11:8]) and read/write (MD[15])
        out.md_lo = ((req.write ? 0 : 1) << 15) | (req.rs << 8); out.en64 = 0;
        m.st = 'dac1'; m.wait = 2; // tAVSL = 1.5 T
        return;
      }
      if (req.kind === 'refresh') {
        if (m.rasLow) { if (m.lowFor >= MT.TRAS) closeRow(); return; }
        if (m.highFor < MT.TRP) return;
        setCas(2, 0); // CAS# before RAS#, both banks
        m.st = 'cbr1'; m.wait = 1; // tCSR = T
        return;
      }
      const row = (req.cell >> 9) & 0x1FF;
      if (m.rasLow && m.row !== row) { if (m.lowFor >= MT.TRAS) closeRow(); return; }
      if (!m.rasLow) {
        if (m.highFor < MT.TRP) return;
        out.ma02 = row; out.ma13 = row; out.ras_n = 0;
        m.rasLow = true; m.lowFor = 0; m.row = row; m.fresh = true;
        m.st = 'col'; m.wait = 1; // tRAH = T
        return;
      }
      m.fresh = false; // page hit: the row is already open
    }
    // eslint-disable-next-line no-fallthrough
    case 'col': {
      const req = m.req;
      const col = req.cell & 0x1FF;
      out.ma02 = col; out.ma13 = col;
      out.en64 = req.kind === 'scan' ? 1 : 0; // pixel load: open the bus switch, each bank feeds its half of the DAC port
      m.st = 'cas'; m.wait = m.fresh ? 1 : 0; // tRCD = 2T after RAS#, column set-up before CAS#
      return;
    }
    case 'cas': {
      if (m.casHigh < MT.TCP) return;
      const req = m.req;
      if (req.kind === 'scan') { setCas(2, 0); out.oe0_n = 0; out.oe1_n = 0; }
      else if (req.kind === 'read') { setCas(req.bank, 0); if (req.bank) out.oe1_n = 0; else out.oe0_n = 0; }
      else { out.md_lo = req.data & 0xFFFF; out.md_hi = req.data >>> 16; setCas(req.bank, req.cas); }
      m.st = req.kind === 'write' ? 'we' : 'sample'; m.wait = req.kind === 'write' ? 0 : 1;
      return;
    }
    case 'we': // late write: WE# falls half a period after CAS#
      if (m.req.bank) out.we12_n = 0; else out.we03_n = 0;
      m.st = 'weEnd';
      return;
    case 'weEnd':
      out.we03_n = 1; out.we12_n = 1; setCas(2, 0xF);
      m.casHigh = 0; m.cleanup = true; m.req = null; m.st = 'idle';
      return;
    case 'sample': { // tCAS = T after CAS# fell: data valid (tCAC = T)
      const req = m.req;
      if (req.kind === 'scan') { out.loadclk = 1; v.loaded++; } // the DAC latches MD and SDB on the rising edge
      else {
        const lo = num(inp.md_lo) ? inp.md_lo & 0xFFFF : 0;
        const hi = num(inp.md_hi) ? inp.md_hi & 0xFFFF : 0;
        req.value = (lo | (hi << 16)) >>> 0;
        req.done = true;
      }
      setCas(2, 0xF); out.oe0_n = 1; out.oe1_n = 1;
      m.casHigh = 0; m.cleanup = true; m.req = null; m.st = 'idle';
      return;
    }
    case 'cbr1':
      out.ras_n = 0; m.rasLow = true; m.lowFor = 0;
      m.st = 'cbr2'; m.wait = 1; // tCHR = T
      return;
    case 'cbr2':
      setCas(2, 0xF); m.casHigh = 0;
      m.st = 'cbr3'; m.wait = 4; // RAS# low for 3.5 T in total
      return;
    case 'cbr3':
      closeRow();
      m.refreshDue--; m.req = null; m.st = 'idle';
      return;
    case 'rom1':
      out.romcs_n = 0;
      m.st = 'rom2'; m.wait = 25; // tBRCS = 13 T
      return;
    case 'rom2':
      s.rom.bytes.push(num(inp.md_lo) ? inp.md_lo & 0xFF : 0xFF); // sampled at the rising edge of ROMCS#
      out.romcs_n = 1;
      m.st = 'rom3';
      return;
    case 'rom3': {
      out.md_hi = Z;
      const r = s.rom;
      if (++r.i >= 4) {
        r.req.value = (r.bytes[0] | (r.bytes[1] << 8) | (r.bytes[2] << 16) | (r.bytes[3] << 24)) >>> 0;
        r.req.done = true;
      }
      m.req = null; m.st = 'idle'; m.wait = 1; // tBRCA = T before the next chip select
      return;
    }
    case 'dac1':
      out.daccs_n = 0;
      m.st = 'dac2';
      return;
    case 'dac2': // address phase over: write data on MD[15:8], or release the bus so the DAC can answer
      out.md_lo = m.req.write ? (m.req.data & 0xFF) << 8 : Z;
      m.st = 'dac3'; m.wait = 4; // DACCS# low for 3 T
      return;
    case 'dac3':
      if (!m.req.write) m.req.data = num(inp.md_lo) ? (inp.md_lo >> 8) & 0xFF : 0xFF;
      out.daccs_n = 1;
      m.st = 'dac4';
      return;
    case 'dac4': {
      out.md_lo = Z;
      const req = m.req;
      if (req.pad) {
        // Saturn pad: four data lines of the selected button group -> 16 bit state, then step to the next group
        const g2 = s.sat;
        g2.state = ((g2.state & ~(0xF << (g2.sel * 4))) | ((req.data & 0xF) << (g2.sel * 4))) & 0xFFFF;
        g2.sel = (g2.sel + 1) & 3;
        g2.busy = false;
      }
      m.req = null; m.st = 'idle'; m.wait = 5; // tDP = 3 T between DAC cycles
      return;
    }
    default:
      m.st = 'idle';
  }
}

// CRTC, clocked by VCLK. The Palette-DAC divides its dot clock by 4 for the 64-bit pixel port at 16 bits per pixel,
// so one VCLK period is one 64-bit word = 4 pixels; the horizontal registers stay in pixels (multiples of 4).
// The DAC samples BLANK# on the next rising VCLK and takes the word from its pixel store one VCLK after that (it has
// to tell a line from the reset pulse), so NV1 counts the words taken two VCLK late (c1, c2).
// At the start of vertical blanking NV1 sends 0-1-0 on BLANK#: the DAC empties its pixel store (STG1732/64 datasheet),
// and once that has happened (two VCLK later) loading of the next frame starts.
function nv1Video(comp, s) {
  const out = comp.outputs;
  const c = s.crtc;
  const v = s.vid;
  if (!(c.ctrl & 1)) {
    out.hsync = c.ctrl & 2 ? 1 : 0; out.vsync = c.ctrl & 4 ? 1 : 0; out.blank_n = 0;
    return;
  }
  const visible = v.h < c.hdisp && v.v < c.vdisp;
  const vblankStart = v.v === c.vdisp;
  out.blank_n = visible || (vblankStart && v.h === 0) ? 1 : 0;
  if (vblankStart && v.h === 8) { v.loaded = 0; v.consumed = 0; v.sync = true; }
  if (v.c2) {
    if (v.loaded - v.consumed <= 0) v.underflows++; // the DAC has nothing to show for this word
    v.consumed++;
  }
  v.c2 = v.c1; v.c1 = visible ? 1 : 0;
  const hs = v.h >= c.hss && v.h < c.hse;
  const vs = v.v >= c.vss && v.v < c.vse;
  out.hsync = c.ctrl & 2 ? (hs ? 0 : 1) : hs ? 1 : 0;
  out.vsync = c.ctrl & 4 ? (vs ? 0 : 1) : vs ? 1 : 0;
  v.h += 4;
  if (v.h >= c.htotal) {
    v.h = 0;
    v.v++;
    if (v.v === c.vdisp) v.sync = false; // vertical blanking: nothing is loaded until the DAC has emptied its store
    if (v.v >= c.vtotal) { v.v = 0; v.frame++; }
  }
}

// One access to a register of the Palette-DAC (c.rs = direct register latched by DACCS#); returns the byte read.
function dacRegister(c, gp, write, data) {
  if (c.rs === DAC_REG.INDEX_LO) { if (write) c.index = (c.index & 0xFF00) | data; return c.index & 0xFF; }
  if (c.rs === DAC_REG.INDEX_HI) { if (write) c.index = (c.index & 0xFF) | (data << 8); return c.index >> 8; }
  if (c.rs !== DAC_REG.DATA) return 0xFF;
  const idx = c.index;
  c.index = (c.index + 1) & 0xFFFF;
  if (idx === 0x300) { // Saturn port A: outputs read back the latch, inputs the pins (the model wires only DATA[3:0])
    if (write) c.port = data & 0x7F;
    return (c.port & ~c.dir & 0x7F) | (((num(gp) ? gp & 0xF : 0xF) | 0x70) & c.dir);
  }
  if (idx === 0x301) { if (write) c.dir = data & 0x7F; return c.dir; }
  return idx === 0 ? 0x44 : idx === 1 ? 0x64 : 0; // company and device ID
}

const SWITCH_SLICES = [['lo', 'a_lo', 'b_lo'], ['hi', 'a_hi', 'b_hi']];

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
    meta: { ref: 'J1', part: 'PCI 2.0 32-bit 5 V card edge', pkg: 'EDGE-120', desc: 'Pozlacené kontakty karty. Jen vodiče: spojují sloty základní desky s NV1.' },
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
    meta: { ref: 'U1', part: 'NVIDIA NV1 / SGS-Thomson STG2000X', pkg: 'PQFP-208', desc: '0,5 µm CMOS, 3 vrstvy kovu, 3,3 V (datasheet STG2000). Paměť, BIOS ROM i registry Palette-DAC sdílejí 32bitovou sběrnici MD; pixely jdou z paměti rovnou do DAC. Počet tranzistorů datasheet neuvádí (Wikipedie ~1 mil. a 90 mm², J. Peddie ~250 tis.). PCI 2.0, 2D/3D grafika, 32hlasá syntéza, game port.' },
    pins: {
      inputs: {
        pci_clk: 0, rst_n: 0, ad: Z, cbe_n: Z, frame_n: 1, irdy_n: 1, idsel: 0,
        mclkx2: 0, vclk: 0, md_lo: Z, md_hi: Z,
        aud_d: Z,
      },
      outputs: {
        ad: Z, trdy_n: Z, devsel_n: Z, inta_n: Z,
        ma02: 0, ma13: 0, ras_n: 1, cas02_lo_n: 3, cas02_hi_n: 3, cas13_lo_n: 3, cas13_hi_n: 3,
        we03_n: 1, we12_n: 1, oe0_n: 1, oe1_n: 1, en64: 0, md_lo: Z, md_hi: Z,
        loadclk: 0, blank_n: 0, daccs_n: 1, hsync: 1, vsync: 1,
        romcs_n: 1,
        aud_d: Z, aud_a: 0, aud_wr_n: 1, aud_rd_n: 1, aud_pd_n: 1,
      },
    },
    widths: { ad: 32, cbe_n: 4, ma02: 9, ma13: 9, cas02_lo_n: 2, cas02_hi_n: 2, cas13_lo_n: 2, cas13_hi_n: 2, md_lo: 16, md_hi: 16, aud_d: 8, aud_a: 2 },
    edgeInputs: { pci_clk: 'r', mclkx2: 'r', vclk: 'r' },
    netNames: { ma02: 'MA02[8:0]', ma13: 'MA13[8:0]', ras_n: 'RAS#', we03_n: 'WE03#', we12_n: 'WE12#', oe0_n: 'OE0#', oe1_n: 'OE1#', en64: 'EN64', md_lo: 'MD[15:0]', md_hi: 'MD[31:16]', cas02_lo_n: 'CAS02[1:0]#', cas02_hi_n: 'CAS02[3:2]#', cas13_lo_n: 'CAS13[1:0]#', cas13_hi_n: 'CAS13[3:2]#', loadclk: 'LOADCLK', daccs_n: 'DACCS#', romcs_n: 'ROMCS#', blank_n: 'BLANK#', hsync: 'HSYNC', vsync: 'VSYNC', aud_d: 'AUD[7:0]', aud_a: 'AUA[1:0]', aud_wr_n: 'AUW#', aud_rd_n: 'AUR#', aud_pd_n: 'AUPD#' },
    init(comp) { delete comp._s; },
    eval(comp) {
      const s = nv1State(comp);
      const pe = edge(comp, 'pci_clk');
      const me = edge(comp, 'mclkx2');
      const ve = edge(comp, 'vclk');
      if (comp.inputs.rst_n !== 1) { nv1Reset(comp, s); return; }
      if (pe === 'r') nv1Pci(comp, s);
      if (me === 'r') {
        nv1Mem(comp, s);
        if ((s.mem.tick ^= 1)) nv1Audio(comp, s); // the audio timing is in whole periods of the memory clock
      }
      if (ve === 'r') nv1Video(comp, s);
    },
  },

  DRAM_256K16: {
    meta: { ref: 'U3', part: '256K×16 FPM DRAM, 50 ns (např. SEC KM416C256)', pkg: 'SOJ-40', desc: '4 Mbit, 512 řádků × 512 sloupců × 16 bitů. Adresa multiplexovaná přes RAS#/CAS#, dva CAS# (horní a dolní bajt). Dva čipy tvoří banku 256K×32 = 1 MB; druhá banka sedí v paticích (upgrade na 2 MB).' },
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
      const we = inp.we_n === 0 ? 0 : 1;
      const prevRas = p.ras ?? 1;
      const prevCas = p.cas ?? 3;
      const prevWe = p.we ?? 1;
      p.ras = ras; p.cas = cas; p.we = we;
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
      else if (ras === 0 && prevWe === 1 && we === 0 && cas !== 3) {
        // late write: WE# falls while CAS# is already low; the byte lanes are the CAS# lines that are low
        if (num(inp.dq)) {
          let w = comp.mem[d.readAddr];
          if (!(cas & 1)) w = (w & 0xFF00) | (inp.dq & 0x00FF);
          if (!(cas & 2)) w = (w & 0x00FF) | (inp.dq & 0xFF00);
          comp.mem[d.readAddr] = w;
          d.writes++;
        }
        d.reads--; // the CAS# edge of this cycle was counted as a read
        d.reading = false;
      }
      if (cas === 3) d.reading = false;
      comp.outputs.dq = ras === 0 && d.reading && inp.oe_n === 0 && inp.we_n !== 0 ? comp.mem[d.readAddr] : Z;
    },
  },

  RAMDAC_STG1764: {
    meta: { ref: 'U2', part: 'SGS-Thomson STG1764X-13 (Palette-DAC 135 MHz + 3× PLL)', pkg: 'PQFP-128', desc: '64bitový pixelový port: P[31:0] visí na sběrnici MD, P[63:32] na SDB za sběrnicovým spínačem. Náběžná hrana LOADCLK uloží 4 pixely RGB555 z obou bank do FIFO, DAC je bodovým taktem posílá ven jako RGB 0–0,7 V; sekvence 0-1-0 na BLANK# ukazatele FIFO vynuluje. Skutečné FIFO má slova po 128 bitech, zápis se zpožděním 2 LOADCLK a hloubku datasheet neuvádí; model drží jen jedno takové slovo (dvě načtení) a zapisuje hned. Tři PLL z krystalu 12,096 MHz (f = 12,096 × N / (M × P)): MCLKx2 pro NV1, bodový takt (VCLK = bodový takt / 4) a ACLK pro kodek. Registry se čtou a zapisují po MD[15:8] s DACCS#; přes port GP jde i game port. Model má zpoždění 2 VCLK místo skutečných 3 VCLK + 15 bodů + 7 ns, VCLK pevně jako čtvrtinu bodového taktu (skutečný dělič 1–16 podle režimu) a nemá paletu (jen RGB555 s obejitím LUT).' },
    pins: {
      inputs: { xtal: Z, p_lo0: Z, p_hi0: Z, p_lo1: Z, p_hi1: Z, loadclk: 0, blank_n: 0, daccs_n: 1, gp_d: 0xF },
      outputs: { vclk: 0, mclkx2: 0, aclk: Z, r: 0, g: 0, b: 0, p_lo0: Z, gp_sel: Z },
    },
    widths: { p_lo0: 16, p_hi0: 16, p_lo1: 16, p_hi1: 16, gp_d: 4, gp_sel: 2 },
    netNames: { vclk: 'VCLK 6.3 MHz', mclkx2: 'MCLKx2 100.07 MHz', aclk: 'ACLK 24.57 MHz', r: 'RED (analog)', g: 'GREEN (analog)', b: 'BLUE (analog)', gp_sel: 'SATURN SELECT[1:0]', gp_d: 'SATURN DATA[3:0]' },
    // PLL: f = fref * N / (M * P) (STG1732/64 datasheet; XFree86 nv1 driver: reference 12.096 MHz).
    // dot = pixel clock of the DAC, mclkx2 = twice the internal memory clock of NV1, aclk = clock of the codec
    risingOnlyClocks: true,
    xtalHz: 12.096e6,
    pll: { dot: { m: 12, n: 100, p: 4 }, mclkx2: { m: 11, n: 91, p: 1 }, aclk: { m: 8, n: 65, p: 4 } },
    pllHz: (f, { m, n, p }) => (f * n) / (m * p),
    clocks(comp) {
      const f = comp.inputs.xtal;
      const { pll, pllHz, xtalHz } = NV1_DEVICES.RAMDAC_STG1764;
      if (!num(f) || Math.abs(f - xtalHz) > 0.2e6) return [];
      return [{ name: 'dot', hz: pllHz(f, pll.dot) }, { pin: 'mclkx2', hz: pllHz(f, pll.mclkx2) }];
    },
    eval(comp, eng) {
      const c = (comp._c = comp._c || { fifo: [], word: [0, 0, 0, 0], k: 3, b0: 0, b1: 0, b2: 0, active: false, rs: 0, read: 0, driving: false, turnOn: 0, index: 0, dir: 0x7F, port: 0, underflows: 0, overflows: 0, resets: 0 });
      const i = comp.inputs;
      const o = comp.outputs;
      const dev = NV1_DEVICES.RAMDAC_STG1764;
      const locked = num(i.xtal);
      if (comp._locked !== locked) { comp._locked = locked; eng.clocksChanged(); }
      // audio PLL: clock for the codec (STG2000 datasheet fig. 30: ACLK -> XTAL1IN of the codec, the codec has no crystal)
      o.aclk = locked ? dev.pllHz(i.xtal, dev.pll.aclk) : Z;
      // pixel port: the rising edge of LOADCLK stores what the two DRAM banks drive on MD and SDB (4 pixels of 16 bits);
      // the store holds 128 bits = two loads
      if (edge(comp, 'loadclk') === 'r') {
        const px = (v) => (num(v) ? v & 0x7FFF : 0);
        if (c.fifo.length >= 8) c.overflows++;
        else c.fifo.push(px(i.p_lo0), px(i.p_hi0), px(i.p_lo1), px(i.p_hi1));
      }
      // register port on MD[15:8]: DACCS# falling latches the register number and the direction
      const de = edge(comp, 'daccs_n');
      if (de === 'f') {
        const bus = num(i.p_lo0) ? i.p_lo0 : 0;
        c.rs = (bus >> 8) & 0xF; c.read = (bus >> 15) & 1; c.driving = false; c.turnOn = 0;
      }
      // read: the outputs turn on two MCLK edges (20 ns) after DACCS# fell; NV1 has left the bus 10 ns earlier (tSLAZ).
      // Done by time and not by looking for a floating bus: a real bus keeps its charge and never reads as floating.
      if (ownRising(comp, 'mclkx2') && i.daccs_n === 0 && c.read && !c.driving && ++c.turnOn >= 2) {
        c.driving = true;
        o.p_lo0 = dacRegister(c, i.gp_d, false, 0) << 8;
      }
      if (de === 'r') {
        if (!c.read && num(i.p_lo0)) dacRegister(c, i.gp_d, true, (i.p_lo0 >> 8) & 0xFF);
        o.p_lo0 = Z; c.driving = false;
      }
      o.gp_sel = c.dir & 0x60 ? Z : ((c.port >> 6) & 1) | ((c.port >> 4) & 2); // SELECT[0] = TH, SELECT[1] = TR, once set as outputs
      if (!ownRising(comp, 'dot')) return;
      c.k = (c.k + 1) & 3;
      if (c.k === 0) {
        // VCLK rises with the first pixel of a word: sample BLANK#. The word for a sample is taken one VCLK later,
        // when the next sample tells a line (1-1) from the reset pulse (0-1-0), which empties the pixel store.
        o.vclk = 1;
        c.b2 = c.b1; c.b1 = c.b0; c.b0 = i.blank_n === 1 ? 1 : 0;
        c.active = false;
        if (c.b1 && !c.b0 && !c.b2) { c.fifo.length = 0; c.resets++; }
        else if (c.b1) {
          c.active = true;
          if (c.fifo.length >= 4) c.word = c.fifo.splice(0, 4);
          else { c.word = [0, 0, 0, 0]; c.underflows++; }
        }
      } else if (c.k === 2) o.vclk = 0;
      const px = c.active ? c.word[c.k] : 0;
      const lvl = (c5) => Math.round((c5 / 31) * 700) / 1000; // volts, 0.7 V full scale into 75 ohm
      o.r = lvl((px >> 10) & 31);
      o.g = lvl((px >> 5) & 31);
      o.b = lvl(px & 31);
    },
  },

  // Bus transceivers between the two 32-bit halves of the pixel port ("silicon switch" in the datasheet, fig. 13/15).
  BUS_SWITCH_32: {
    meta: { ref: 'U25', part: '4× Pericom PI5C3245Q (sběrnicový spínač 8 bit, U25–U28)', pkg: 'QSOP-20', desc: 'Čtyři osmibitové spínače spojují sběrnici MD banky 0 se sběrnicí SDB banky 1 („silicon switch“ v datasheetu STG2000). EN64 = 0: spojeno, NV1 dosáhne na obě banky. EN64 = 1: rozpojeno, každá banka budí svou polovinu 64bitového portu Palette-DAC. Model: jedna součástka za všechny čtyři, průchod bez zpoždění a bez odporu.' },
    pins: { inputs: { a_lo: Z, a_hi: Z, b_lo: Z, b_hi: Z, en64: 0 }, outputs: { a_lo: Z, a_hi: Z, b_lo: Z, b_hi: Z } },
    widths: { a_lo: 16, a_hi: 16, b_lo: 16, b_hi: 16 },
    netNames: { b_lo: 'SDB[15:0]', b_hi: 'SDB[31:16]' },
    eval(comp) {
      const i = comp.inputs;
      const o = comp.outputs;
      // per slice: 0 = nobody drives through, 1 = side A drives B, 2 = side B drives A, 3 = just released (wait for the net)
      const st = (comp._sw = comp._sw || { lo: 0, hi: 0 });
      for (const [k, a, b] of SWITCH_SLICES) {
        if (i.en64 !== 0) { o[a] = Z; o[b] = Z; st[k] = 0; continue; }
        if (st[k] === 3) st[k] = 0;
        else if (st[k] === 1) { if (i[a] === Z) { o[b] = Z; st[k] = 3; } else o[b] = i[a]; }
        else if (st[k] === 2) { if (i[b] === Z) { o[a] = Z; st[k] = 3; } else o[a] = i[b]; }
        if (st[k] === 0) {
          if (i[a] !== Z) { st[k] = 1; o[b] = i[a]; } else if (i[b] !== Z) { st[k] = 2; o[a] = i[b]; }
        }
      }
    },
  },

  CRYSTAL: {
    meta: { ref: 'Y1', part: 'Quartz crystal', pkg: 'HC-49/U', desc: 'Referenční frekvence pro tři PLL v RAMDACu. Na kartě je jediný krystal.' },
    pins: { inputs: {}, outputs: { xtal: 0 } },
    eval(comp) { comp.outputs.xtal = comp.freqHz || 12.096e6; },
  },

  AD1845: {
    meta: { ref: 'U6', part: 'Analog Devices AD1845JP SoundPort codec', pkg: 'PLCC-68', desc: '16bitový stereo kodek 48 kHz, registry kompatibilní s AD1848. Čtyři adresy: 0 index, 1 data registru, 2 stav, 3 data vzorku (PIO). NV1 ho ovládá jen strobe AUR#/AUW# po 8bitové sběrnici; DRQ/DACK ani přerušení kodeku karta nepoužívá. Takt bere z audio PLL RAMDACu (ACLK), vlastní krystal nemá.' },
    pins: {
      inputs: { xtal: Z, d: Z, a: 0, wr_n: 1, rd_n: 1, pd_n: 1, lin_l: Z, lin_r: Z, mic: Z },
      outputs: { d: Z, lout: 0, rout: 0 },
    },
    widths: { d: 8, a: 2 },
    risingOnlyClocks: true,
    netNames: { lout: 'LINE OUT L (analog)', rout: 'LINE OUT R (analog)' },
    // I8 selects the sample rate: with the 24.576 MHz clock on XTAL1 (CSL = 0) the divider is 512 for 48 kHz
    fsDivider: { 0: 3072, 1: 1536, 2: 896, 3: 768, 6: 512, 7: 2560 },
    clocks(comp) {
      const f = comp.inputs.xtal;
      const reg = comp._c?.reg;
      if (!num(f) || Math.abs(f - 24.576e6) > 0.3e6 || !reg || !(reg[9] & 1) || (reg[8] & 1)) return []; // no clock, playback off or XTAL2 selected
      const div = NV1_DEVICES.AD1845.fsDivider[(reg[8] >> 1) & 7];
      return div ? [{ name: 'fs', hz: f / div }] : [];
    },
    eval(comp, eng) {
      const c = (comp._c = comp._c || { index: 0x40, reg: new Uint8Array(32), bytes: [], next: null, samples: 0, underruns: 0 });
      const inp = comp.inputs;
      const locked = num(inp.xtal);
      if (comp._locked !== locked) { comp._locked = locked; eng.clocksChanged(); }
      const a = num(inp.a) ? inp.a & 3 : 0;
      if (edge(comp, 'wr_n') === 'r' && num(inp.d)) {
        const d = inp.d & 0xFF;
        if (a === 0) c.index = d & 0x7F; // bit 6 = MCE, bits 4:0 = register index
        else if (a === 1) { c.reg[c.index & 0x1F] = d; eng.clocksChanged(); }
        else if (a === 3 && (c.reg[9] & 0x40) && !c.next) { // PIO playback data, low byte first, left then right
          c.bytes.push(d);
          if (c.bytes.length === 4) {
            const s16 = (lo, hi) => { const v = lo | (hi << 8); return v >= 0x8000 ? v - 0x10000 : v; };
            c.next = [s16(c.bytes[0], c.bytes[1]), s16(c.bytes[2], c.bytes[3])];
            c.bytes = [];
          }
        }
      }
      if (ownRising(comp, 'fs')) {
        // DAC: play the sample waiting in the PIO register (1 V peak line level) and free the register
        if (c.next) {
          comp.outputs.lout = Math.round((c.next[0] / 32768) * 1000) / 1000;
          comp.outputs.rout = Math.round((c.next[1] / 32768) * 1000) / 1000;
          c.next = null;
          c.samples++;
        } else c.underruns++;
      }
      if (inp.rd_n === 0) {
        // status: PRDY = sample register free, PL/R = left sample expected, PU/L = upper byte expected
        const prdy = (c.reg[9] & 0x41) === 0x41 && !c.next ? 1 : 0;
        const status = (prdy << 1) | ((c.bytes.length < 2 ? 1 : 0) << 2) | ((c.bytes.length & 1) << 3);
        comp.outputs.d = [c.index, c.reg[c.index & 0x1F], status, 0][a];
      } else comp.outputs.d = Z;
      if (inp.pd_n === 0) { comp.outputs.lout = 0; comp.outputs.rout = 0; }
    },
  },

  EPROM_27C256: {
    meta: { ref: 'U8', part: 'Video BIOS EPROM 27C256 (32K×8)', pkg: 'DIP-28', desc: 'Rozšiřující ROM karty: začíná podpisem 55h AAh, součet všech bajtů = 0.' },
    // on the card: A[14:0] = MD[30:16] (MD[31] is R/W#), D[7:0] = MD[7:0], CE# and OE# = ROMCS#
    pins: { inputs: { a: 0, ce_n: 1, oe_n: 1 }, outputs: { d: Z } },
    widths: { a: 16, d: 8 },
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

  // SEGA interface chip between the Palette-DAC and the two pad headers (datasheet: "SEGA interface ASIC", on the card nVSGP).
  SEGA_ASIC: {
    meta: { ref: 'U34', part: 'nVSGP – čip rozhraní SEGA', pkg: 'PLCC-44', desc: 'Odděluje game port Palette-DAC od dvou konektorů pro ovladače Sega Saturn (PORT A, PORT B). Vnitřní funkce není zveřejněná; model ho bere jako průchozí budič: výběr skupiny tlačítek ven, čtyři datové linky portu A dovnitř.' },
    pins: { inputs: { sel: 0, 'A D[3:0]': 0xF, 'B D[3:0]': 0xF }, outputs: { d: 0xF, 'A TH/TR': 0, 'B TH/TR': 0 } },
    widths: { sel: 2, d: 4, 'A D[3:0]': 4, 'B D[3:0]': 4, 'A TH/TR': 2, 'B TH/TR': 2 },
    eval(comp) {
      const i = comp.inputs;
      const sel = num(i.sel) ? i.sel & 3 : 0;
      comp.outputs['A TH/TR'] = sel;
      comp.outputs['B TH/TR'] = sel;
      comp.outputs.d = num(i['A D[3:0]']) ? i['A D[3:0]'] & 0xF : 0xF;
    },
  },

  SEGA_HEADER: {
    meta: { ref: 'J5', part: 'Header 2×5, 2,54 mm (port Sega Saturn)', pkg: 'HDR-2x5', desc: 'Kolíková lišta na horní hraně karty (PORT A / PORT B). Desetižilový plochý kabel vede na zvláštní záslepku se zásuvkami pro ovladače Saturn.' },
    passive: true,
    pins: { inputs: { sel: Z, d: Z }, outputs: { 'TH/TR': Z, 'D[3:0]': Z } },
    joins: [['sel', 'TH/TR'], ['d', 'D[3:0]']],
    widths: { sel: 2, 'TH/TR': 2, d: 4, 'D[3:0]': 4 },
    eval() {},
  },

  GAME_PORT: {
    meta: { ref: 'P1', part: 'Game port (modulární zásuvka 10P10C)', pkg: 'RJ50', desc: 'Zásuvka pro PC joystick na záslepce karty (přes kabel-rozbočku na DA-15). Pinout se nenašel, v simulaci do ní nic zapojeno není; ovladače Saturn jdou přes headery PORT A / PORT B.' },
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
    // hTotal = pixels per whole line: the beam sweeps evenly, so a pixel is 1 / hTotal of the measured line period
    // (the monitor does not know the dot clock of the card: 25.2 MHz here, 25.175 MHz in the VESA table)
    modes: [{ name: '640×480 @ 60 Hz', hHz: 31469, vHz: 59.94, w: 640, h: 480, hTotal: 800, hBack: 96 + 48, vBack: 2 + 33 }],
    hpos: -8, // factory H-position: compensates the pipeline of the Palette-DAC model (2 VCLK = 8 pixels; the real one has 3 VCLK + 15 dots)
    init(comp) { comp.status = 'NO SIGNAL'; comp.frames = 0; },
    eval(comp, eng) {
      const m = (comp._m = comp._m || { tHs: 0, tVs: 0, hPeriod: 0, vPeriod: 0, mode: null, lines: 0, x: 0, color: [0, 0, 0] });
      if (!comp.image) comp.image = new Uint8ClampedArray(640 * 480 * 4);
      const t = eng.simTime;
      const inp = comp.inputs;
      const he = edge(comp, 'hsync');
      const ve = edge(comp, 'vsync');
      const dev = NV1_DEVICES.VGA_MONITOR;
      const T = m.mode && m.hPeriod ? m.hPeriod / m.mode.hTotal : 40;
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
