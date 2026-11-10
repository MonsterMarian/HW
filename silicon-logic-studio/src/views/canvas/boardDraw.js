// Kreslení skutečných součástek (DEVICES): pouzdra na DPS podle meta.pkg ve skutečné velikosti,
// karta Diamond Edge 3D, zařízení mimo kartu a jejich živý stav; ve schématu boxy s piny.
import { DEVICES } from '../../engine/devices/index.js';
import { NV1_CARD, nv1CardOutline, PX_PER_MM } from '../../engine/boardLayout.js';
import { THEME, fmtHz, fitText, signalStyle } from './theme.js';
import { SCH, deviceMeta, pinLabel, refOf, blockTitle } from './geometry.js';
import { B360_LAYOUT } from '../../engine/economic/catalog.js';
import { MB, at } from '../../engine/myPcLayout.js';

const mm = (v) => v * PX_PER_MM;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Potisk pouzder: výrobce + typ (zkráceně)
const MARKING = {
  NV1_CORE: ['SGS-THOMSON', 'STG2000X', 'NVIDIA NV1'],
  RAMDAC_STG1764: ['SGS-THOMSON', 'STG1764X'],
  DRAM_256K16: ['SEC', 'KM416C256'],
  EPROM_27C256: ['27C256', 'VIDEO BIOS'],
  AD1845: ['ANALOG DEVICES', 'AD1845JP'],
};

function marking(comp) {
  if (MARKING[comp.type]) return MARKING[comp.type];
  const part = deviceMeta(comp)?.part || comp.label || comp.type;
  return part.split(/\s*[/(]\s*/)[0].split(' ').slice(0, 2);
}

/** Krátký živý údaj součástky (krystal, PLL, refresh, vzorky…), nebo null. */
export function liveInfo(comp) {
  switch (comp.type) {
    case 'CRYSTAL':
      return [fmtHz(comp.freqHz || comp.outputs.xtal)];
    case 'RAMDAC_STG1764': {
      const f = comp.inputs.xtal;
      if (!isNum(f)) return ['PLL BEZ REFERENCE'];
      const { vclk, mclk } = DEVICES.RAMDAC_STG1764.pll;
      return [`VCLK ${fmtHz((f * vclk.m) / (vclk.n * 2 ** vclk.p))}`, `MCLK ${fmtHz((f * mclk.m) / (mclk.n * 2 ** mclk.p))}`];
    }
    case 'DRAM_256K16':
      return [`REFRESH ${comp._d?.refreshes ?? 0}`];
    case 'AD1845':
      return [`${comp._c?.samples ?? 0} VZORKŮ`];
    default:
      return null;
  }
}

// ------------------------------------------------------------------ karta
/** Obrys karty, nepájivá maska, bracket a sítotisk karty. */
export function drawCard(ctx) {
  const { x, y, w, h, tab } = NV1_CARD;
  ctx.save();
  // bracket (plech na zadní straně počítače)
  const bx = 26;
  const bw = 88;
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  g.addColorStop(0, '#5A5E64');
  g.addColorStop(0.5, '#A4A8AD');
  g.addColorStop(1, '#6C7076');
  ctx.fillStyle = g;
  ctx.fillRect(bx, y - 16, bw, h + 30);
  ctx.fillRect(bx, y - 16, bw + 18, 10); // ohnutý límec se šroubem
  ctx.fillStyle = '#2A2C30';
  ctx.beginPath();
  ctx.arc(bx + bw + 8, y - 11, 3, 0, Math.PI * 2);
  ctx.fill();

  // deska
  const pts = nv1CardOutline();
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fillStyle = THEME.mask;
  ctx.fill();
  ctx.strokeStyle = THEME.maskEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  // sítotisk karty
  ctx.fillStyle = THEME.silk;
  ctx.font = `800 13px ${THEME.sans}`;
  ctx.fillText('DIAMOND EDGE 3D 2120', x + w - 172, y + h - 54);
  ctx.font = `700 8px ${THEME.mono}`;
  ctx.fillStyle = 'rgba(232, 230, 223, 0.7)';
  ctx.fillText('NVIDIA NV1 · PCI 2.1 · 2 MB DRAM', x + w - 172, y + h - 40);

  // klíč 5 V konektoru (výřez ve zlatých kontaktech)
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(tab.x + tab.key.at, y + h, tab.key.w, tab.h + 1);
  ctx.restore();
}

// ------------------------------------------------------------------ deska ASUS PRIME B360-PLUS (projekt MŮJ PC)
const B360_CHIPS = ['RTL8111H', 'ALC887', 'ASM1083', 'SUPER I/O', 'BIOS'];

/** Deska B360-PLUS 1 : 1 podle manuálu (B360_LAYOUT): maska, otvory, patice, DIMM, sloty, M.2, chladiče, konektory, I/O. */
export function drawMyPcBoard(ctx) {
  const L = B360_LAYOUT;
  const P = (u, v) => at(u, v);
  const rect = (u, v, du, dv, fill, stroke = null) => {
    const p = P(u, v);
    ctx.fillStyle = fill;
    ctx.fillRect(p.x, p.y, mm(du), mm(dv));
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(p.x + 0.5, p.y + 0.5, mm(du) - 1, mm(dv) - 1); }
  };
  const label = (text, u, v, size = 7, color = THEME.silk, align = 'left') => {
    const p = P(u, v);
    ctx.font = `700 ${size}px ${THEME.mono}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, p.x, p.y);
    ctx.textAlign = 'left';
  };
  ctx.save();
  // deska: černá maska řady Prime
  ctx.fillStyle = '#121417';
  ctx.fillRect(MB.x, MB.y, MB.w, MB.h);
  ctx.strokeStyle = THEME.maskEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(MB.x, MB.y, MB.w, MB.h);
  // montážní otvory ATX
  for (const [v, u] of L.holes) {
    const p = P(u, v);
    ctx.fillStyle = '#B9BBBE';
    ctx.beginPath(); ctx.arc(p.x, p.y, mm(3.6), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#020302';
    ctx.beginPath(); ctx.arc(p.x, p.y, mm(1.6), 0, Math.PI * 2); ctx.fill();
  }
  // chladiče (VRM, PCH) – stříbrné hliníkové bloky
  for (const h of L.heatsinks) rect(h.u - h.d / 2, h.v - h.w / 2, h.d, h.w, '#8F959C', '#5C6168');
  label('DIGI+ VRM', 70, 40, 7);
  label('INTEL B360', 178, 236, 7, THEME.silk, 'center');
  // patice LGA1151: tělo + zatěžovací rámeček + otvory chladiče 75 × 75 mm
  const [sv, su] = L.socket;
  rect(su - 23.75, sv - 23.75, 47.5, 47.5, '#2B2B2E');
  ctx.strokeStyle = '#C9CDD2';
  ctx.lineWidth = mm(1.2);
  const fr = P(su - 23, sv - 23);
  ctx.strokeRect(fr.x, fr.y, mm(46), mm(46));
  for (const [du, dv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = P(su + du * 37.5, sv + dv * 37.5);
    ctx.strokeStyle = '#B9BBBE'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, mm(2.6), 0, Math.PI * 2); ctx.stroke();
  }
  label('LGA1151', su, sv - 25, 8, THEME.silk, 'center');
  // DIMM sloty (svisle), od CPU: B1, B2, A1, A2
  ['DIMM_B1', 'DIMM_B2', 'DIMM_A1', 'DIMM_A2'].forEach((name, i) => {
    const u = L.dimm.u[i];
    rect(u - 3.25, L.dimm.v - L.dimm.len / 2, 6.5, L.dimm.len, i % 2 ? '#1C1D20' : '#7E848B', '#3A3D42');
    const p = P(u + 1.2, L.dimm.v + L.dimm.len / 2 + 3);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 2);
    ctx.font = `700 6px ${THEME.mono}`; ctx.fillStyle = THEME.silk; ctx.fillText(name, 0, 0); ctx.restore();
  });
  // rozšiřující sloty
  const SLOT = { x16: ['#7E848B', 'PCIEX16'], x1: ['#1C1D20', 'PCIEX1'], pci: ['#E9E7E1', 'PCI'] };
  const n = { x16: 0, x1: 0, pci: 0 };
  for (const s of L.slots) {
    const [fill, name] = SLOT[s.kind];
    rect(s.u0, s.v - 3.75, s.len, 7.5, fill, '#3A3D42');
    label(`${name}_${++n[s.kind]}`, s.u0 + s.len + 3, s.v + 1.5, 7);
  }
  // M.2: konektor, šroubek 2280 a obrys modulu
  L.m2.forEach((m, i) => {
    const o = P(m.screw - 2, m.v - 11);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(232,230,223,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(o.x, o.y, mm(m.u - m.screw + 2), mm(22)); ctx.setLineDash([]);
    rect(m.u - 3, m.v - 11, 6, 22, '#1A1B1E', '#4A4D52');
    const sc = P(m.screw, m.v);
    ctx.fillStyle = '#C9CDD2'; ctx.beginPath(); ctx.arc(sc.x, sc.y, mm(2.5), 0, Math.PI * 2); ctx.fill();
    label(`M.2_${i + 1}`, m.screw + 4, m.v - 12.5, 7);
  });
  // napájecí konektory, SATA, baterie
  rect(L.atx24[1] - 5, L.atx24[0] - 26, 10, 52, '#1C1D20', '#4A4D52');
  label('EATXPWR', L.atx24[1] - 7, L.atx24[0] + 30, 7, THEME.silk, 'right');
  rect(L.eps8[1] - 9, L.eps8[0] - 5, 18, 10, '#1C1D20', '#4A4D52');
  label('EATX12V', L.eps8[1], L.eps8[0] + 10, 7, THEME.silk, 'center');
  for (const [v, u] of L.sata) rect(u - 5.5, v - 4, 11, 8, '#1C1D20', '#4A4D52');
  label('SATA6G', 200, 278, 6);
  const bt = P(L.battery[1], L.battery[0]);
  ctx.fillStyle = '#B9BBBE'; ctx.beginPath(); ctx.arc(bt.x, bt.y, mm(10), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#26282D'; ctx.font = `700 7px ${THEME.mono}`; ctx.textAlign = 'center'; ctx.fillText('CR2032', bt.x, bt.y + 3); ctx.textAlign = 'left';
  // zadní I/O (u 0–18) a čipy na desce
  const IO = { ps2: '#7A4FB0', usb3: '#1F5FBF', usb31: '#19B5B0', audio: '#7FC4E8', lan: '#9EA2A7', dvi: '#E9E7E1', hdmi: '#3A3D42' };
  for (const [kind, v0, v1] of L.io) rect(0, v0, 18, v1 - v0, IO[kind] || '#9EA2A7', '#5C6066');
  L.chips.forEach((ch, i) => {
    rect(ch.u - ch.s / 2, ch.v - ch.s / 2, ch.s, ch.s, THEME.epoxy, 'rgba(255,255,255,0.15)');
    label(B360_CHIPS[i], ch.u, ch.v + ch.s / 2 + 3.5, 6, THEME.silk, 'center');
  });
  // potisk
  label('PRIME B360-PLUS', 90, 174, 15, 'rgba(236,238,240,0.85)', 'center');
  label('ASUS', 143, 147, 13, 'rgba(236,238,240,0.85)', 'center');
  ctx.restore();
}

// ------------------------------------------------------------------ pomocné kreslení
function textFit(ctx, lines, cx, top, maxW, maxH, size, color, weight = 700, font = THEME.mono) {
  let s = size;
  ctx.font = `${weight} ${s}px ${font}`;
  while (s > 5 && Math.max(...lines.map((l) => ctx.measureText(l).width)) > maxW) {
    s -= 0.5;
    ctx.font = `${weight} ${s}px ${font}`;
  }
  const lh = s * 1.3;
  const n = Math.max(0, Math.min(lines.length, Math.floor(maxH / lh)));
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) ctx.fillText(lines[i], cx, top + lh * (i + 0.8));
  ctx.textAlign = 'left';
  return top + lh * n;
}

function body(ctx, x, y, w, h, selected, fill = THEME.epoxy) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? THEME.high : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = selected ? 1.5 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function leads(ctx, x, y, len, count, pitch, horizontal, color = '#B9BBBE') {
  ctx.fillStyle = color;
  const span = (count - 1) * pitch;
  for (let i = 0; i < count; i++) {
    const o = -span / 2 + i * pitch;
    if (horizontal) ctx.fillRect(x + o - pitch * 0.22, y, Math.max(0.6, pitch * 0.44), len);
    else ctx.fillRect(x, y + o - pitch * 0.22, len, Math.max(0.6, pitch * 0.44));
  }
}

function markingInBody(ctx, comp, bx, by, bw, bh) {
  const lines = [...marking(comp), ...(liveInfo(comp) || [])];
  const vertical = bh > bw * 1.6;
  ctx.save();
  if (vertical) {
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(-Math.PI / 2);
    textFit(ctx, lines, 0, -bw / 2 + 3, bh - 8, bw - 4, 7, THEME.label);
  } else {
    textFit(ctx, lines, bx + bw / 2, by + 4, bw - 8, bh - 6, 8, THEME.label);
  }
  ctx.restore();
}

function silkRef(ctx, text, x, y) {
  ctx.fillStyle = THEME.silk;
  ctx.font = `700 8px ${THEME.mono}`;
  ctx.fillText(text, x, y);
}

// ------------------------------------------------------------------ DPS: jedna součástka
/** Pouzdro / zařízení na DPS podle meta.pkg. `g` = geometrie z makeLayout. */
export function drawPcbPart(ctx, comp, g, engine, { selected = false } = {}) {
  const meta = deviceMeta(comp) || {};
  const { x, y, w, h } = g;
  const pkg = meta.pkg;
  ctx.save();
  switch (pkg) {
    case 'PQFP-208':
    case 'PQFP-128':
    case 'PLCC-68': {
      const total = parseInt(pkg.split('-')[1], 10);
      const plcc = pkg === 'PLCC-68';
      const lead = mm(plcc ? 0.6 : 1.3);
      const bx = x + lead;
      const by = y + lead;
      const bw = w - 2 * lead;
      const bh = h - 2 * lead;
      // PQFP-128: 14×20 mm -> 32 + 32 vývodů na krátkých, 32 na dlouhých stranách (zjednodušeně rovnoměrně)
      const perSide = Math.round(total / 4);
      const pitch = mm(plcc ? 1.27 : 0.5);
      const pitchX = Math.min(pitch, (bw - 4) / perSide);
      const pitchY = Math.min(pitch, (bh - 4) / perSide);
      leads(ctx, x + w / 2, y, lead + 1, perSide, pitchX, true);
      leads(ctx, x + w / 2, y + h - lead - 1, lead + 1, perSide, pitchX, true);
      leads(ctx, x, y + h / 2, lead + 1, perSide, pitchY, false);
      leads(ctx, x + w - lead - 1, y + h / 2, lead + 1, perSide, pitchY, false);
      body(ctx, bx, by, bw, bh, selected);
      if (plcc) {
        // sražený roh pinu 1
        ctx.fillStyle = THEME.mask;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 7, by);
        ctx.lineTo(bx, by + 7);
        ctx.fill();
      }
      ctx.fillStyle = '#2A2C31';
      ctx.beginPath();
      ctx.arc(bx + 6, by + (plcc ? 12 : 6), 2.2, 0, Math.PI * 2);
      ctx.fill();
      markingInBody(ctx, comp, bx + 4, by + 6, bw - 8, bh - 10);
      silkRef(ctx, refOf(comp), x, y - 4);
      break;
    }
    case 'SOJ-40': {
      const lead = mm(0.6);
      const bx = x + lead;
      const bw = w - 2 * lead;
      leads(ctx, x, y + h / 2, lead + 1, 20, mm(1.27), false);
      leads(ctx, x + w - lead - 1, y + h / 2, lead + 1, 20, mm(1.27), false);
      body(ctx, bx, y, bw, h, selected);
      markingInBody(ctx, comp, bx + 2, y + 6, bw - 4, h - 10);
      silkRef(ctx, refOf(comp), x + 2, y - 4);
      break;
    }
    case 'DIP-28': {
      const lead = mm(1.6);
      const by = y + lead;
      const bh = h - 2 * lead;
      leads(ctx, x + w / 2, y, lead + 1, 14, mm(2.54), true);
      leads(ctx, x + w / 2, y + h - lead - 1, lead + 1, 14, mm(2.54), true);
      body(ctx, x, by, w, bh, selected);
      ctx.fillStyle = '#26282D';
      ctx.beginPath();
      ctx.arc(x, by + bh / 2, 4, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      // okénko EPROM (pod nálepkou)
      ctx.fillStyle = '#D9D4C3';
      ctx.fillRect(x + w * 0.3, by + 3, w * 0.4, bh - 6);
      ctx.fillStyle = '#26282D';
      ctx.font = `700 7px ${THEME.mono}`;
      textFit(ctx, marking(comp), x + w / 2, by + 3, w * 0.4 - 4, bh - 6, 7, '#26282D');
      silkRef(ctx, refOf(comp), x, y - 4);
      break;
    }
    case 'HC-49/U': {
      const can = ctx.createLinearGradient(0, y, 0, y + h);
      can.addColorStop(0, '#E6E8EA');
      can.addColorStop(0.5, '#A9ADB2');
      can.addColorStop(1, '#7E8288');
      ctx.fillStyle = can;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h / 2);
      ctx.fill();
      if (selected) { ctx.strokeStyle = THEME.high; ctx.lineWidth = 1.5; ctx.stroke(); }
      textFit(ctx, [fmtHz(comp.freqHz || comp.outputs.xtal).replace(' MHz', '')], x + w / 2, y + 2, w - 8, h - 3, 7, '#26282D');
      silkRef(ctx, refOf(comp), x, y - 4);
      ctx.fillStyle = 'rgba(232, 230, 223, 0.75)';
      ctx.font = `700 7px ${THEME.mono}`;
      ctx.fillText('MHz', x + w + 3, y + h - 4);
      break;
    }
    case 'EDGE-120': {
      // pozlacené kontakty, rozteč 1,27 mm; výřez klíče kreslí drawCard
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y, w, h);
      const pitch = mm(1.27);
      ctx.fillStyle = THEME.gold;
      for (let fx = x + 2; fx < x + w - 2; fx += pitch) ctx.fillRect(fx, y + 3, pitch * 0.62, h - 3);
      if (selected) { ctx.strokeStyle = THEME.high; ctx.strokeRect(x, y, w, h); }
      silkRef(ctx, refOf(comp), x + w + 4, y + 10);
      break;
    }
    case 'DSUB-15HD': {
      ctx.fillStyle = '#9EA2A7';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = selected ? THEME.high : '#5C6066';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      // lichoběžníkový límec se 3 řadami po 5 dutinkách
      const sx = x + w * 0.25;
      const sw = w * 0.5;
      ctx.fillStyle = '#1A1B1E';
      ctx.beginPath();
      ctx.moveTo(sx, y + h * 0.18);
      ctx.lineTo(sx + sw, y + h * 0.22);
      ctx.lineTo(sx + sw, y + h * 0.78);
      ctx.lineTo(sx, y + h * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8D9095';
      for (let col = 0; col < 3; col++) for (let r = 0; r < 5; r++) ctx.fillRect(sx + sw * (0.22 + col * 0.28), y + h * (0.27 + r * 0.115), 2, 2);
      ctx.fillStyle = '#C9CCD0';
      [0.08, 0.92].forEach((t) => { ctx.beginPath(); ctx.arc(x + w / 2, y + h * t, 2.5, 0, Math.PI * 2); ctx.fill(); });
      bracketCaption(ctx, comp, x, y + h - 12, w);
      break;
    }
    case 'RJ45': {
      ctx.fillStyle = '#B9BCC0';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#121316';
      ctx.fillRect(x + w * 0.2, y + h * 0.18, w * 0.6, h * 0.62);
      ctx.fillRect(x + w * 0.38, y + h * 0.8, w * 0.24, h * 0.1);
      if (selected) { ctx.strokeStyle = THEME.high; ctx.strokeRect(x, y, w, h); }
      bracketCaption(ctx, comp, x, y + h, w);
      break;
    }
    case 'JACK35': {
      ctx.fillStyle = '#1B1C20';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = selected ? THEME.high : '#3A3C42';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = '#8D9095';
      ctx.beginPath();
      ctx.arc(x + w * 0.35, y + h / 2, Math.min(w, h) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050506';
      ctx.beginPath();
      ctx.arc(x + w * 0.35, y + h / 2, Math.min(w, h) * 0.17, 0, Math.PI * 2);
      ctx.fill();
      bracketCaption(ctx, comp, x, y + h, w);
      break;
    }
    case 'LGA1151': { // CPU v patici: zelený substrát, stříbrný rozvaděč tepla s potiskem
      ctx.fillStyle = '#2F5A3B';
      ctx.fillRect(x, y, w, h);
      const i = mm(2);
      ctx.fillStyle = '#C3C8CE';
      ctx.fillRect(x + i, y + i, w - 2 * i, h - 2 * i);
      if (selected) { ctx.strokeStyle = THEME.high; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); }
      textFit(ctx, ['INTEL® CORE™', 'i7-9700', 'SRG13 3.00GHZ'], x + w / 2, y + h * 0.25, w - 12, h * 0.6, 9, '#3A3D42');
      silkRef(ctx, refOf(comp), x, y - 4);
      break;
    }
    case 'UDIMM': { // modul shora: černý chladič HyperX Fury
      ctx.fillStyle = '#141518';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = selected ? THEME.high : '#3A3D42';
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-Math.PI / 2);
      textFit(ctx, ['HyperX FURY 8GB'], 0, -w / 2 + 2, h - 10, w - 4, 7, '#E9E9E9');
      ctx.restore();
      break;
    }
    case 'PCIe x16': { // grafika ve slotu: shora je vidět horní hrana karty, záslepka vlevo
      ctx.fillStyle = '#1B1C1F';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#2A2C30';
      ctx.fillRect(x, y, w, mm(4)); // zadní plech (backplate) nad slotem
      ctx.fillStyle = '#B9BFC6';
      ctx.fillRect(x - mm(1), y - mm(4), mm(1.5), h + mm(8)); // záslepka
      for (let fx = x + mm(8); fx < x + w - mm(4); fx += mm(2)) { ctx.fillStyle = '#5C6168'; ctx.fillRect(fx, y + mm(6), 1, h - mm(10)); } // žebrování
      for (let k = 0; k < 2; k++) { ctx.fillStyle = '#0B0C0E'; ctx.fillRect(x + w - mm(52) + k * mm(26), y + mm(2), mm(21), mm(8)); } // 2× 8 pin
      if (selected) { ctx.strokeStyle = THEME.high; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); }
      textFit(ctx, ['ASUS DUAL · GEFORCE RTX 3060 Ti'], x + w / 2 - mm(20), y + h * 0.35, w * 0.6, h * 0.5, 10, '#C9CDD2');
      silkRef(ctx, refOf(comp), x + mm(3), y + h + 10);
      break;
    }
    case 'M.2 2280': { // SSD v M.2_2: černá deska se štítkem Samsung
      ctx.fillStyle = '#16171A';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#26282D';
      ctx.fillRect(x + mm(4), y + mm(1), w - mm(10), h - mm(2));
      ctx.fillStyle = THEME.gold;
      ctx.fillRect(x + w - mm(4), y + mm(1), mm(3.8), h - mm(2));
      if (selected) { ctx.strokeStyle = THEME.high; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); }
      textFit(ctx, ['SAMSUNG 970 EVO Plus', 'NVMe M.2 · 500GB'], x + w / 2 - mm(2), y + mm(3), w - mm(14), h - mm(4), 8, '#E9E9E9');
      break;
    }
    case 'PC':
    case 'CRT':
    case 'SPEAKER':
    case 'PAD':
      drawEquipment(ctx, comp, g, engine, selected, 'hardware');
      break;
    default: {
      body(ctx, x, y, w, h, selected);
      markingInBody(ctx, comp, x + 4, y + 4, w - 8, h - 8);
      silkRef(ctx, refOf(comp), x, y - 4);
    }
  }
  ctx.restore();
}

function bracketCaption(ctx, comp, x, y, w) {
  const name = (comp.label || refOf(comp)).replace(/\s+/g, ' ');
  ctx.font = `700 7px ${THEME.mono}`;
  ctx.fillStyle = '#1A1B1E';
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, name, w + 16), x + w / 2, y + 9);
  ctx.textAlign = 'left';
}

// ------------------------------------------------------------------ zařízení mimo kartu
/** Obdélník vnitřní plochy pro živý stav (stejný pro kreslení i klikání). */
export function liveRect(comp, g, mode) {
  const { x, y, w, h } = g;
  if (mode === 'schematic') {
    const col = (list) => (list && list.length ? Math.max(...list.map((p) => pinLabel(comp, p.pin).length)) * SCH.charW + 12 : 8);
    const l = col(g.sides?.L);
    const r = col(g.sides?.R);
    const head = g.header ?? SCH.header;
    return { x: x + l, y: y + head, w: w - l - r, h: h - head - 8 };
  }
  switch (comp.type) {
    case 'VGA_MONITOR': return { x: x + 16, y: y + 14, w: w - 32, h: h - 52 };
    case 'PCI_HOST': return { x: x + 10, y: y + 22, w: w - 20, h: h - 28 };
    default: return { x: x + 8, y: y + 20, w: w - 16, h: h - 26 };
  }
}

function drawEquipment(ctx, comp, g, engine, selected, mode) {
  const { x, y, w, h } = g;
  ctx.fillStyle = comp.type === 'VGA_MONITOR' ? '#2B2C30' : '#17181C';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? THEME.high : '#3A3C42';
  ctx.lineWidth = selected ? 1.5 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = THEME.label;
  ctx.font = `700 9px ${THEME.mono}`;
  if (comp.type !== 'VGA_MONITOR') ctx.fillText(fitText(ctx, (comp.label || comp.type).toUpperCase(), w - 16), x + 8, y + 13);
  drawLive(ctx, comp, liveRect(comp, g, mode));
}

// ------------------------------------------------------------------ živý stav
const imgCache = new WeakMap();

function monitorBitmap(comp) {
  if (!comp.image || typeof document === 'undefined') return null;
  let c = imgCache.get(comp);
  const now = performance.now();
  if (!c) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    c = { canvas, ctx: canvas.getContext('2d'), data: null, t: 0 };
    c.data = c.ctx.createImageData(640, 480);
    imgCache.set(comp, c);
  }
  if (now - c.t > 120) {
    c.data.data.set(comp.image);
    c.ctx.putImageData(c.data, 0, 0);
    c.t = now;
  }
  return c.canvas;
}

/** Rozložení tlačítek ovladače Sega Saturn v obdélníku r. */
export function padButtons(r) {
  const s = Math.min(r.w / 10, r.h / 6.5);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h * 0.56;
  const dx = cx - s * 3.1;
  const fx = cx + s * 2.6;
  const btn = (name, bx, by, bw, bh, round = true, text = name.toUpperCase()) => ({ name, x: bx - bw / 2, y: by - bh / 2, w: bw, h: bh, round, text });
  return [
    btn('up', dx, cy - s, s, s, false, '▲'),
    btn('down', dx, cy + s, s, s, false, '▼'),
    btn('left', dx - s, cy, s, s, false, '◀'),
    btn('right', dx + s, cy, s, s, false, '▶'),
    btn('x', fx - s * 0.9, cy - s * 0.9, s, s),
    btn('y', fx + s * 0.3, cy - s * 1.15, s, s),
    btn('z', fx + s * 1.5, cy - s * 1.4, s, s),
    btn('a', fx - s * 0.9, cy + s * 0.5, s, s),
    btn('b', fx + s * 0.3, cy + s * 0.25, s, s),
    btn('c', fx + s * 1.5, cy, s, s),
    btn('start', cx, cy + s * 1.4, s * 1.6, s * 0.6, false, 'START'),
    btn('l', r.x + r.w * 0.2, r.y + s * 0.45, s * 2.6, s * 0.7, false, 'L'),
    btn('r', r.x + r.w * 0.8, r.y + s * 0.45, s * 2.6, s * 0.7, false, 'R'),
  ];
}

export function drawLive(ctx, comp, r) {
  if (r.w < 20 || r.h < 16) return;
  ctx.save();
  switch (comp.type) {
    case 'VGA_MONITOR': {
      const statusH = 14;
      const aw = Math.min(r.w, ((r.h - statusH) * 4) / 3);
      const ah = (aw * 3) / 4;
      const sx = r.x + (r.w - aw) / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(sx, r.y, aw, ah);
      const bmp = monitorBitmap(comp);
      if (bmp && comp.status !== 'NO SIGNAL') {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(bmp, sx, r.y, aw, ah);
      } else {
        ctx.fillStyle = THEME.muted;
        ctx.font = `700 9px ${THEME.mono}`;
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', sx + aw / 2, r.y + ah / 2);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = comp.status === 'NO SIGNAL' || comp.status === 'OUT OF RANGE' ? THEME.muted : THEME.high;
      ctx.font = `700 8px ${THEME.mono}`;
      ctx.fillText(fitText(ctx, `${comp.status || 'NO SIGNAL'} · ${comp.frames || 0} SNÍMKŮ`, r.w), r.x, r.y + ah + 11);
      break;
    }
    case 'AUDIO_SPEAKERS': {
      const sc = comp.scope || [];
      const midY = r.y + (r.h - 12) / 2;
      const amp = (r.h - 16) / 2;
      ctx.fillStyle = '#060708';
      ctx.fillRect(r.x, r.y, r.w, r.h - 12);
      ctx.strokeStyle = 'rgba(113,117,121,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, midY);
      ctx.lineTo(r.x + r.w, midY);
      ctx.stroke();
      [[0, THEME.high], [1, 'rgba(237, 235, 231, 0.55)']].forEach(([ch, color]) => {
        if (sc.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        sc.forEach((s, i) => {
          const px = r.x + (i / (sc.length - 1)) * r.w;
          const py = midY - Math.max(-1, Math.min(1, s[ch])) * amp;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        });
        ctx.stroke();
      });
      ctx.fillStyle = THEME.label;
      ctx.font = `700 8px ${THEME.mono}`;
      ctx.fillText(fitText(ctx, `L/R ±1 V · ŠPIČKA ${(comp.peak || 0).toFixed(2)} V`, r.w), r.x, r.y + r.h - 2);
      break;
    }
    case 'PCI_HOST': {
      const st = comp.status || {};
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillStyle = THEME.high;
      ctx.fillText(fitText(ctx, `FÁZE: ${String(st.phase || '—').toUpperCase()}`, r.w), r.x, r.y + 9);
      ctx.fillStyle = '#2A2C31';
      ctx.fillRect(r.x, r.y + 14, r.w, 4);
      ctx.fillStyle = THEME.high;
      ctx.fillRect(r.x, r.y + 14, r.w * Math.max(0, Math.min(1, st.progress || 0)), 4);
      const lines = Math.max(0, Math.floor((r.h - 24) / 10));
      const log = (comp.log || []).slice(-lines);
      ctx.font = `600 8px ${THEME.mono}`;
      ctx.fillStyle = THEME.label;
      log.forEach((l, i) => ctx.fillText(fitText(ctx, l, r.w), r.x, r.y + 30 + i * 10));
      break;
    }
    case 'SATURN_PAD': {
      const s = Math.min(r.w / 10, r.h / 6.5);
      ctx.fillStyle = '#2C2D33';
      ctx.beginPath();
      ctx.roundRect(r.x + r.w / 2 - s * 4.8, r.y + s * 0.9, s * 9.6, r.h - s * 1.2, s * 2);
      ctx.fill();
      for (const b of padButtons(r)) {
        const on = !!comp.buttons?.[b.name];
        ctx.fillStyle = on ? THEME.high : '#4A4C54';
        ctx.beginPath();
        if (b.round) ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
        else ctx.rect(b.x, b.y, b.w, b.h);
        ctx.fill();
        ctx.fillStyle = on ? THEME.bg : THEME.text;
        ctx.font = `700 ${Math.max(5, b.h * 0.55)}px ${THEME.mono}`;
        ctx.textAlign = 'center';
        ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h * 0.72);
        ctx.textAlign = 'left';
      }
      break;
    }
    default: {
      const info = liveInfo(comp);
      if (info) {
        ctx.fillStyle = THEME.high;
        ctx.font = `700 8px ${THEME.mono}`;
        info.forEach((l, i) => ctx.fillText(fitText(ctx, l, r.w), r.x, r.y + 10 + i * 11));
      }
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ schéma
export function drawSchematicDevice(ctx, comp, g, engine, { selected = false } = {}) {
  const { x, y, w, h } = g;
  const meta = deviceMeta(comp);
  ctx.save();
  ctx.fillStyle = selected ? `rgba(${THEME.highRgb}, 0.06)` : THEME.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? THEME.high : THEME.stroke;
  ctx.lineWidth = selected ? 2 : 1.2;
  ctx.strokeRect(x, y, w, h);
  const head = g.header ?? SCH.header;
  ctx.beginPath();
  ctx.moveTo(x, y + head - 6);
  ctx.lineTo(x + w, y + head - 6);
  ctx.strokeStyle = 'rgba(138, 142, 147, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // název (funkční blok čipu se zalomí na víc řádků), pod ním typ / pouzdro
  const title = meta ? [fitText(ctx, (comp.label || comp.type).toUpperCase(), w - 12)] : blockTitle(comp).lines;
  ctx.fillStyle = selected ? THEME.high : THEME.text;
  ctx.font = `700 10px ${THEME.mono}`;
  title.forEach((l, i) => ctx.fillText(fitText(ctx, l, w - 12), x + 6, y + 12 + i * 12));
  ctx.fillStyle = THEME.muted;
  ctx.font = `700 7.5px ${THEME.mono}`;
  const sub = !meta ? (comp.type === 'DIE_BLOCK' ? (comp.drill ? 'BLOK · DVOJKLIK ↓' : 'FUNKČNÍ BLOK') : comp.type === 'PC_BLOCK' ? (comp.note || 'BLOK Z VEŘEJNÉHO BLOKOVÉHO SCHÉMATU') : comp.type) : `${meta.part} · ${meta.pkg || ''}`;
  ctx.fillText(fitText(ctx, typeof comp.knob === 'number' ? `KNOFLÍK ${comp.knob} % · KLIK = +10 %` : sub, w - 12), x + 6, y + 11 + title.length * 12);

  // piny
  ctx.font = `700 ${SCH.font}px ${THEME.mono}`;
  for (const [pin, p] of g.pins) {
    const st = signalStyle(engine.pinValue(comp.id, pin), 1, engine.pinLabel?.(comp.id, pin));
    const on = st.state === 'high' || st.state === 'analog' || st.state === 'clock';
    ctx.fillStyle = on ? st.color : st.state === 'x' ? THEME.conflict : THEME.bg;
    ctx.strokeStyle = on ? st.color : THEME.stroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = on ? THEME.high : THEME.label;
    const label = pinLabel(comp, pin);
    if (p.side === 'L') ctx.fillText(label, p.x + 6, p.y + 3);
    else {
      ctx.textAlign = 'right';
      ctx.fillText(label, p.x - 6, p.y + 3);
      ctx.textAlign = 'left';
    }
  }

  drawLive(ctx, comp, liveRect(comp, g, 'schematic'));
  ctx.restore();
}
