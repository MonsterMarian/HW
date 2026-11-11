// One-off surgery on src/engine/devices/nv1Card.js: memory bus, pixel path, ROM, DAC and game port per the STG2000 datasheet.
import fs from 'node:fs';
const file = process.argv[2];
let t = fs.readFileSync(file, 'utf8');
const crlf = t.includes('\r\n');
t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error(`expected exactly one match for: ${a.slice(0, 80)}`); t = t.replace(a, () => b); };
const region = (from, to, b) => {
  const s = t.indexOf(from); const e = t.indexOf(to, s + 1);
  if (s < 0 || e < 0) throw new Error(`region not found: ${from.slice(0, 60)} .. ${to.slice(0, 60)}`);
  t = t.slice(0, s) + b + t.slice(e);
};

// ---- header comment
rep(`// cycles (RAS#/CAS#/WE#/OE#, multiplexed address), a 15-bit pixel bus into the RAMDAC, analog RGB + TTL sync
// into the VGA connector, a byte-wide strobed bus into the AD1845 codec and the Saturn pad select/data lines.`,
`// cycles on the 32-bit MD bus with two interleaved banks (RAS#/CAS#/WE#/OE#, multiplexed address), pixel loads from
// the DRAM straight into the 64-bit port of the Palette-DAC (LOADCLK), the BIOS ROM and the DAC registers on the same
// MD bus (ROMCS#, DACCS#), analog RGB + TTL sync into the VGA connector, a byte-wide strobed bus into the AD1845
// codec and the Saturn pad lines behind the DAC and the SEGA interface chip.`);

// ---- state
rep(`    mem: { st: 'idle', rasActive: false, row: -1, openFor: 0, sinceRefresh: 0, req: null },
    readReq: null, // PCI read of the frame buffer waiting for the DRAM controller
    vid: { h: 0, v: 0, frame: 0, fifo: [], owed: 0, fetchY: 0, fetchX: 0, underflows: 0 },`,
`    mem: newMem(),
    readReq: null, // PCI read of the frame buffer waiting for the DRAM controller
    busq: [], // pending accesses to the Palette-DAC registers
    vid: { h: 0, v: 0, frame: 0, loaded: 0, consumed: 0, c1: 0, c2: 0, underflows: 0 },`);
rep(`    rom: { st: 'idle', i: 0, wait: 0, bytes: [] },
    sat: { sel: 0, cnt: 0, state: 0xFFFF },`,
`    rom: { req: null, i: 0, bytes: [] },
    sat: { sel: 0, cnt: 0, state: 0xFFFF, busy: false, inited: false },`);
rep(`const SINE = Array.from(`, `const newMem = () => ({ st: 'idle', wait: 0, rasLow: false, row: -1, lowFor: 0, highFor: 99, casHigh: 99, sinceRefresh: 0, refreshDue: 0, req: null, fresh: false, cleanup: false, tick: 0 });

const SINE = Array.from(`);

// ---- reset
rep(`  out.ras_n = 1; out.cas0_n = 3; out.cas1_n = 3; out.cas2_n = 3; out.cas3_n = 3; out.we_n = 1; out.oe_n = 1;
  out.md0 = Z; out.md1 = Z; out.md2 = Z; out.md3 = Z;
  out.hsync = 1; out.vsync = 1; out.blank_n = 0; out.pix = 0;
  out.rom_ce_n = 1; out.rom_oe_n = 1;`,
`  out.ras_n = 1; out.cas02_lo_n = 3; out.cas02_hi_n = 3; out.cas13_lo_n = 3; out.cas13_hi_n = 3;
  out.we03_n = 1; out.we12_n = 1; out.oe0_n = 1; out.oe1_n = 1; out.en64 = 0;
  out.md_lo = Z; out.md_hi = Z;
  out.hsync = 1; out.vsync = 1; out.blank_n = 0; out.loadclk = 0; out.daccs_n = 1;
  out.romcs_n = 1;`);
rep(`  s.mem = { st: 'idle', rasActive: false, row: -1, openFor: 0, sinceRefresh: 0, req: null };
  s.vid.fifo = []; s.vid.owed = 0;`,
`  s.mem = newMem();
  s.busq = []; s.rom = { req: null, i: 0, bytes: [] }; s.sat.busy = false; s.sat.inited = false;
  s.vid.loaded = 0; s.vid.consumed = 0; s.vid.c1 = 0; s.vid.c2 = 0;`);
rep(`    if (off === REG.CRTC_CTRL && !wasOn && (c.ctrl & 1)) Object.assign(s.vid, { h: 0, v: c.vdisp, fetchX: 0, fetchY: 0, fifo: [], owed: 0 });`,
`    if (off === REG.CRTC_CTRL && !wasOn && (c.ctrl & 1)) Object.assign(s.vid, { h: 0, v: c.vdisp, loaded: 0, consumed: 0, c1: 0, c2: 0 });`);

// ---- PCI side: frame buffer writes / reads address one 32-bit word in one bank
rep(`    const off = c.off & 0x1FFFFC;
    const word = off >> 3;
    const half = (off >> 2) & 1;
    const lanes = [Z, Z, Z, Z];
    const cas = [3, 3, 3, 3];
    lanes[half * 2] = ad & 0xFFFF;
    lanes[half * 2 + 1] = (ad >>> 16) & 0xFFFF;
    cas[half * 2] = be & 3; // C/BE#[1:0] -> LCAS#/UCAS# of the low chip
    cas[half * 2 + 1] = (be >> 2) & 3;
    s.wfifo.push({ word, lanes, cas });`,
`    // 2-to-1 interleave: consecutive 32-bit words alternate between the banks; C/BE#[3:0] become the four CAS# of the bank
    const w32 = (c.off & 0x1FFFFC) >> 2;
    s.wfifo.push({ kind: 'write', bank: w32 & 1, cell: w32 >> 1, data: ad >>> 0, cas: be & 0xF });`);
rep(`      // a 64-bit DRAM read, the controller picks the half we need
      c.pending = { word: (c.off & 0x1FFFF8) >> 3, half: (c.off >> 2) & 1, done: false, value: 0 };`,
`      const w32 = (c.off & 0x1FFFFC) >> 2;
      c.pending = { kind: 'read', bank: w32 & 1, cell: w32 >> 1, done: false, value: 0 };`);
rep(`    if (!c.pending) { c.pending = { addr: c.off, done: false, value: 0 }; s.rom.st = 'start'; s.rom.req = c.pending; }`,
`    if (!c.pending) { c.pending = { addr: c.off, done: false, value: 0 }; s.rom = { req: c.pending, i: 0, bytes: [] }; }`);

// ---- remove the old EPROM bus
region(`// EPROM bus, 4 byte reads per dword`, `// Wavetable synth -> audio codec`, '');

// ---- memory controller, video
region(`// Saturn pad scan: step TH/TR`, `// ---------------------------------------------------------------------------------------------------------
const DRAM_WORDS`, `// ---------------------------------------------------------------------------------------------------------
// Memory bus controller (STG2000 datasheet ch. 5), clocked by MCLKx2: one tick = half a period T of the internal
// memory clock (10 ns). Everything on the MD bus goes through here: both DRAM banks, the BIOS ROM, the registers of
// the Palette-DAC (and through them the game port) and the pixel loads into the DAC.
//   bank 0: MD[31:0],  MA02, CAS02[3:0]#, WE03#, OE0#        bank 1: SDB[31:0], MA13, CAS13[3:0]#, WE12#, OE1#
//   SDB is the far side of the bus switch: EN64 = 0 joins it to MD, EN64 = 1 separates the banks so that each
//   drives its own half of the 64-bit pixel port of the STG1764.
// Timing in ticks, from tables 3, 5, 6, 7 and 10: tRAH = T (2), tRCD = 2T (4), tCAS = T (2), tCP = T (2),
// tPC = 2T (4), tRP = 2.5T (5), tRAS >= 3.5T (7), late write with WE# 0.5T (1); CAS-before-RAS refresh every
// 776 T with tCSR = tCHR = T; ROMCS# 13T wide; DACCS# 3T wide with the address 1.5T before it.
const MT = { REFRESH: 776 * 2, TRP: 5, TRAS: 7, TCP: 2, PAGE_IDLE: 800, DAC_FIFO: 32, GAMEPORT: 192 };
const DAC_REG = { GP_SELECT: 0xE, GP_DATA: 0xF }; // register numbers of the game port inside the DAC are our own (not published)
const SCAN = { kind: 'scan', cell: 0 };
const REFRESH = { kind: 'refresh' };
const ROMBYTE = { kind: 'rom' };

function nv1Mem(comp, s) {
  const out = comp.outputs;
  const inp = comp.inputs;
  const m = s.mem;
  const v = s.vid;
  const c = s.crtc;
  m.sinceRefresh++;
  if (m.rasLow) m.lowFor++; else m.highFor++;
  m.casHigh++;
  // game port: every ~2 us select the next button group in the DAC and read its four data lines back
  const g = s.sat;
  if (++g.cnt >= MT.GAMEPORT && !g.busy) {
    g.cnt = 0; g.busy = true;
    s.busq.push({ kind: 'dac', rs: DAC_REG.GP_SELECT, write: true, data: g.sel }, { kind: 'dac', rs: DAC_REG.GP_DATA, write: false, data: 0 });
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
      if (m.sinceRefresh >= MT.REFRESH) req = REFRESH;
      else if ((c.ctrl & 1) && v.loaded < total && v.loaded - v.consumed < MT.DAC_FIFO) {
        const perLine = c.hdisp >> 2;
        const y = Math.floor(v.loaded / perLine);
        SCAN.cell = (c.fbStart + y * c.pitch + (v.loaded - y * perLine) * 8) >> 3;
        req = SCAN;
      } else if (s.busq.length) req = s.busq.shift();
      else if (s.rom.req && !s.rom.req.done) req = ROMBYTE;
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
      m.sinceRefresh = 0; m.req = null; m.st = 'idle';
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
      if (req.rs === DAC_REG.GP_DATA && !req.write) {
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
// BLANK# is sampled by the DAC on the next rising VCLK, which then takes one word from its pixel store.
function nv1Video(comp, s) {
  const out = comp.outputs;
  const c = s.crtc;
  const v = s.vid;
  if (!(c.ctrl & 1)) {
    out.hsync = c.ctrl & 2 ? 1 : 0; out.vsync = c.ctrl & 4 ? 1 : 0; out.blank_n = 0;
    return;
  }
  const visible = v.h < c.hdisp && v.v < c.vdisp;
  out.blank_n = visible ? 1 : 0;
  if (visible) {
    if (v.loaded - v.consumed <= 0) v.underflows++; // the DAC has nothing to show for this word
    v.consumed++;
  }
  const hs = v.h >= c.hss && v.h < c.hse;
  const vs = v.v >= c.vss && v.v < c.vse;
  out.hsync = c.ctrl & 2 ? (hs ? 0 : 1) : hs ? 1 : 0;
  out.vsync = c.ctrl & 4 ? (vs ? 0 : 1) : vs ? 1 : 0;
  v.h += 4;
  if (v.h >= c.htotal) {
    v.h = 0;
    v.v++;
    if (v.v === c.vdisp) { v.loaded = 0; v.consumed = 0; } // vertical blanking: start loading the next frame
    if (v.v >= c.vtotal) { v.v = 0; v.frame++; }
  }
}

`);

// ---- NV1 pins
rep(`        mclk: 0, vclk: 0, md0: Z, md1: Z, md2: Z, md3: Z,
        rom_d: Z, aud_d: Z, sat_d: 0xF,`,
`        mclkx2: 0, vclk: 0, md_lo: Z, md_hi: Z,
        aud_d: Z,`);
rep(`        ma: 0, ras_n: 1, cas0_n: 3, cas1_n: 3, cas2_n: 3, cas3_n: 3, we_n: 1, oe_n: 1, md0: Z, md1: Z, md2: Z, md3: Z,
        pix: 0, blank_n: 0, hsync: 1, vsync: 1,
        rom_a: 0, rom_ce_n: 1, rom_oe_n: 1,`,
`        ma02: 0, ma13: 0, ras_n: 1, cas02_lo_n: 3, cas02_hi_n: 3, cas13_lo_n: 3, cas13_hi_n: 3,
        we03_n: 1, we12_n: 1, oe0_n: 1, oe1_n: 1, en64: 0, md_lo: Z, md_hi: Z,
        loadclk: 0, blank_n: 0, daccs_n: 1, hsync: 1, vsync: 1,
        romcs_n: 1,`);
rep(`        sat_sel: 0,
      },`, `      },`);
rep(`    widths: { ad: 32, cbe_n: 4, ma: 9, cas0_n: 2, cas1_n: 2, cas2_n: 2, cas3_n: 2, md0: 16, md1: 16, md2: 16, md3: 16, pix: 15, rom_a: 15, rom_d: 8, aud_d: 8, aud_a: 2, sat_sel: 2, sat_d: 4 },
    edgeInputs: { pci_clk: 'r', mclk: 'r', vclk: 'r' },`,
`    widths: { ad: 32, cbe_n: 4, ma02: 9, ma13: 9, cas02_lo_n: 2, cas02_hi_n: 2, cas13_lo_n: 2, cas13_hi_n: 2, md_lo: 16, md_hi: 16, aud_d: 8, aud_a: 2 },
    edgeInputs: { pci_clk: 'r', mclkx2: 'r', vclk: 'r' },`);
{
  const s = t.indexOf(`    netNames: { ma: 'MA[8:0]', ras_n: 'RAS#'`); const e = t.indexOf('\n', s);
  if (s < 0) throw new Error('NV1 netNames not found');
  t = t.slice(0, s) + `    netNames: { ma02: 'MA02[8:0]', ma13: 'MA13[8:0]', ras_n: 'RAS#', we03_n: 'WE03#', we12_n: 'WE12#', oe0_n: 'OE0#', oe1_n: 'OE1#', en64: 'EN64', md_lo: 'MD[15:0]', md_hi: 'MD[31:16]', cas02_lo_n: 'CAS02[1:0]#', cas02_hi_n: 'CAS02[3:2]#', cas13_lo_n: 'CAS13[1:0]#', cas13_hi_n: 'CAS13[3:2]#', loadclk: 'LOADCLK', daccs_n: 'DACCS#', romcs_n: 'ROMCS#', blank_n: 'BLANK#', hsync: 'HSYNC', vsync: 'VSYNC', aud_d: 'AUD[7:0]', aud_a: 'AUA[1:0]', aud_wr_n: 'AUW#', aud_rd_n: 'AUR#', aud_pd_n: 'AUPD#' },` + t.slice(e);
}
rep(`      const me = edge(comp, 'mclk');`, `      const me = edge(comp, 'mclkx2');`);
rep(`      if (pe === 'r') {
        nv1Pci(comp, s);
        nv1Rom(comp, s);
        nv1GamePort(comp, s);
      }
      if (me === 'r') { nv1Mem(comp, s); nv1Audio(comp, s); }`,
`      if (pe === 'r') nv1Pci(comp, s);
      if (me === 'r') {
        nv1Mem(comp, s);
        if ((s.mem.tick ^= 1)) nv1Audio(comp, s); // the audio timing is in whole periods of the memory clock
      }`);
rep(`desc: '0,5 µm CMOS, 3 vrstvy kovu, 3,3 V (datasheet STG2000).`, `desc: '0,5 µm CMOS, 3 vrstvy kovu, 3,3 V (datasheet STG2000). Paměť, BIOS ROM i registry Palette-DAC sdílejí 32bitovou sběrnici MD; pixely jdou z paměti rovnou do DAC.`);

// ---- DRAM: late write (WE# falls while CAS# is low)
rep(`      const prevRas = p.ras ?? 1;
      const prevCas = p.cas ?? 3;
      p.ras = ras; p.cas = cas;`,
`      const we = inp.we_n === 0 ? 0 : 1;
      const prevRas = p.ras ?? 1;
      const prevCas = p.cas ?? 3;
      const prevWe = p.we ?? 1;
      p.ras = ras; p.cas = cas; p.we = we;`);
rep(`      if (cas === 3) d.reading = false;`,
`      else if (ras === 0 && prevWe === 1 && we === 0 && cas !== 3) {
        // late write: WE# falls while CAS# is already low; the byte lanes are the CAS# lines that are low
        if (num(inp.dq)) {
          let w = comp.mem[d.readAddr];
          if (!(cas & 1)) w = (w & 0xFF00) | (inp.dq & 0x00FF);
          if (!(cas & 2)) w = (w & 0x00FF) | (inp.dq & 0xFF00);
          comp.mem[d.readAddr] = w;
          d.writes++;
        }
        d.reading = false;
      }
      if (cas === 3) d.reading = false;`);
rep(`    meta: { ref: 'U3', part: 'SEC KM416C256 (256K×16 FPM DRAM, 50 ns)', pkg: 'SOJ-40', desc: '4 Mbit, 512 řádků × 512 sloupců × 16 bitů. Adresa multiplexovaná přes RAS#/CAS#.' },`,
`    meta: { ref: 'U3', part: '256K×16 FPM DRAM, 50 ns (např. SEC KM416C256)', pkg: 'SOJ-40', desc: '4 Mbit, 512 řádků × 512 sloupců × 16 bitů. Adresa multiplexovaná přes RAS#/CAS#, dva CAS# (horní a dolní bajt). Dva čipy tvoří banku 256K×32 = 1 MB; druhá banka sedí v paticích (upgrade na 2 MB).' },`);

// ---- Palette-DAC
region(`  RAMDAC_STG1764: {`, `  CRYSTAL: {`, `  RAMDAC_STG1764: {
    meta: { ref: 'U2', part: 'SGS-Thomson STG1764X-13 (Palette-DAC 135 MHz + 3× PLL)', pkg: 'PQFP-128', desc: '64bitový pixelový port: P[31:0] visí na sběrnici MD, P[63:32] na SDB za sběrnicovým spínačem. Náběžná hrana LOADCLK uloží 4 pixely RGB555 z obou bank, DAC je bodovým taktem posílá ven jako RGB 0–0,7 V. Tři PLL z jednoho krystalu: MCLKx2 pro NV1, bodový takt (VCLK = bodový takt / 4) a ACLK pro kodek. Registry se čtou a zapisují po MD[15:8] s DACCS#; přes ně jde i game port. Co datasheet STG1764 není veřejný: frekvence krystalu, dělicí poměry, hloubka zásobníku pixelů a čísla registrů jsou model.' },
    pins: {
      inputs: { xtal: Z, p_lo0: Z, p_hi0: Z, p_lo1: Z, p_hi1: Z, loadclk: 0, blank_n: 0, daccs_n: 1, gp_d: 0xF },
      outputs: { vclk: 0, mclkx2: 0, aclk: Z, r: 0, g: 0, b: 0, p_lo0: Z, gp_sel: 0 },
    },
    widths: { p_lo0: 16, p_hi0: 16, p_lo1: 16, p_hi1: 16, gp_d: 4, gp_sel: 2 },
    netNames: { vclk: 'VCLK 6.29 MHz', mclkx2: 'MCLKx2 100.2 MHz', aclk: 'ACLK 24.576 MHz', r: 'RED (analog)', g: 'GREEN (analog)', b: 'BLUE (analog)', gp_sel: 'GP SELECT[1:0]', gp_d: 'GP DATA[3:0]' },
    // PLL: f = fref * M / (N * 2^P). dot = pixel clock of the DAC, mclkx2 = twice the internal memory clock of NV1
    risingOnlyClocks: true,
    pll: { vclk: { m: 116, n: 33, p: 1 }, mclk: { m: 7, n: 2, p: 0 } },
    clocks(comp) {
      const f = comp.inputs.xtal;
      if (!num(f) || Math.abs(f - 14.31818e6) > 0.2e6) return [];
      const { vclk, mclk } = NV1_DEVICES.RAMDAC_STG1764.pll;
      return [
        { name: 'dot', hz: (f * vclk.m) / (vclk.n * 2 ** vclk.p) },
        { pin: 'mclkx2', hz: (2 * f * mclk.m) / (mclk.n * 2 ** mclk.p) },
      ];
    },
    eval(comp, eng) {
      const c = (comp._c = comp._c || { fifo: [], word: [0, 0, 0, 0], k: 3, active: false, rs: 0, read: 0, driving: false, underflows: 0 });
      const i = comp.inputs;
      const o = comp.outputs;
      const locked = num(i.xtal);
      if (comp._locked !== locked) { comp._locked = locked; eng.clocksChanged(); }
      // audio PLL: clock for the codec (STG2000 datasheet fig. 30: ACLK -> XTAL1IN of the codec, the codec has no crystal)
      o.aclk = locked ? 24.576e6 : Z;
      // pixel port: the rising edge of LOADCLK stores what the two DRAM banks drive on MD and SDB (4 pixels of 16 bits)
      if (edge(comp, 'loadclk') === 'r') {
        const px = (v) => (num(v) ? v & 0x7FFF : 0);
        c.fifo.push(px(i.p_lo0), px(i.p_hi0), px(i.p_lo1), px(i.p_hi1));
      }
      // register port on MD[15:8]: DACCS# falling latches the register number and the direction
      const de = edge(comp, 'daccs_n');
      if (de === 'f') {
        const bus = num(i.p_lo0) ? i.p_lo0 : 0;
        c.rs = (bus >> 8) & 0xF; c.read = (bus >> 15) & 1; c.driving = false;
      }
      if (i.daccs_n === 0 && c.read && !c.driving && i.p_lo0 === Z) { // the controller released the bus: answer
        c.driving = true;
        o.p_lo0 = (c.rs === 0xF ? (num(i.gp_d) ? i.gp_d & 0xF : 0xF) : 0) << 8;
      }
      if (de === 'r') {
        if (!c.read && num(i.p_lo0) && c.rs === 0xE) o.gp_sel = (i.p_lo0 >> 8) & 3; // game port: select the button group
        o.p_lo0 = Z; c.driving = false;
      }
      if (!ownRising(comp, 'dot')) return;
      c.k = (c.k + 1) & 3;
      if (c.k === 0) {
        // VCLK rises with the first pixel of a word: sample BLANK# and take the next word from the pixel store
        o.vclk = 1;
        c.active = i.blank_n === 1;
        if (c.active) {
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
    meta: { ref: 'U9', part: 'Sběrnicový spínač 32 bit (silicon switch)', pkg: 'TSSOP-48', desc: 'Spojuje sběrnici MD banky 0 se sběrnicí SDB banky 1. EN64 = 0: spojeno, NV1 dosáhne na obě banky. EN64 = 1: rozpojeno, každá banka budí svou polovinu 64bitového portu Palette-DAC. Typ obvodu na kartě není ověřen (model: průchozí spínač bez zpoždění).' },
    pins: { inputs: { a_lo: Z, a_hi: Z, b_lo: Z, b_hi: Z, en64: 0 }, outputs: { a_lo: Z, a_hi: Z, b_lo: Z, b_hi: Z } },
    widths: { a_lo: 16, a_hi: 16, b_lo: 16, b_hi: 16 },
    netNames: { b_lo: 'SDB[15:0]', b_hi: 'SDB[31:16]' },
    eval(comp) {
      const i = comp.inputs;
      const o = comp.outputs;
      // per slice: 0 = nobody drives through, 1 = side A drives B, 2 = side B drives A, 3 = just released (wait for the net)
      const st = (comp._sw = comp._sw || { lo: 0, hi: 0 });
      for (const k of ['lo', 'hi']) {
        const a = \`a_\${k}\`;
        const b = \`b_\${k}\`;
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

`);

// ---- EPROM on the MD bus
rep(`    pins: { inputs: { a: 0, ce_n: 1, oe_n: 1 }, outputs: { d: Z } },
    widths: { a: 15, d: 8 },`,
`    // on the card: A[14:0] = MD[30:16] (MD[31] is R/W#), D[7:0] = MD[7:0], CE# and OE# = ROMCS#
    pins: { inputs: { a: 0, ce_n: 1, oe_n: 1 }, outputs: { d: Z } },
    widths: { a: 16, d: 8 },`);

// ---- game port parts
rep(`  GAME_PORT: {
    meta: { ref: 'J3', part: 'Game port (modulární zásuvka)', pkg: 'RJ45', desc: 'Model: jedna cesta k Saturn padu. Na skutečné kartě je zásuvka PC joystick/MIDI port a Saturn pady jdou přes headery 2×5 (J5 PORT A, J6 PORT B), plochý kabel na zvláštní Sega bracket a čip SEGA rozhraní za Palette-DAC.' },`,
`  // SEGA interface chip between the Palette-DAC and the two pad headers (datasheet: "SEGA interface ASIC", on the card nVSGP).
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
    meta: { ref: 'P2', part: 'Game/MIDI port (modulární zásuvka)', pkg: 'RJ45', desc: 'PC joystick a MIDI port na záslepce karty (zdroje se liší, zda RJ-45 nebo RJ-50). V simulaci do něj nic zapojeno není; ovladače Saturn jdou přes headery PORT A / PORT B.' },`);

// ---- monitor: horizontal position compensates the pipeline of the DAC (one word = 4 pixels)
rep(`    hpos: -1, // factory H-position: compensates the 1-pixel RAMDAC pipeline`, `    hpos: -4, // factory H-position: compensates the pipeline of the Palette-DAC (BLANK# is sampled one VCLK = 4 pixels later)`);

if (crlf) t = t.replace(/\n/g, '\r\n');
fs.writeFileSync(file, t);
console.log('ok');
