// LEVELS 2-8: from the decapped package down to the atoms. Every scene is generated from the components of the
// current subcircuit (engine); every 3D object that stands for a component carries it in userData (hover / drill).
// Units follow the real hardware: L2 in mm, L6 + L7 in µm, L8 in Å. L3-5 (standard cells) keep the schematic
// placement, so there the layer heights are exaggerated. Amber is used only for signals / conducting channels.
import * as THREE from 'three';
import { componentDims } from '../../engine/boardLayout';
import { MAT, std, textTexture, instanced, mat4, mergeGeos, cylinderMatrix } from './common.js';
import * as P from './packages.js';

const AMBER = 0xffa909;
const OFF_WHITE = '#E9E6DF';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Process materials: neutral tones as seen on a die photo / SEM cross-section
const PM = {
  psub: () => std(0x2a2c31, { roughness: 0.75 }),
  nwell: () => std(0x3a342c, { roughness: 0.75 }),
  nplus: () => std(0x8a919b, { roughness: 0.5, metalness: 0.2 }),
  nminus: () => std(0x5f656d, { roughness: 0.55, metalness: 0.15 }),
  pplus: () => std(0x9a8466, { roughness: 0.5, metalness: 0.2 }),
  pminus: () => std(0x6e624f, { roughness: 0.55, metalness: 0.15 }),
  poly: () => std(0x7a5240, { roughness: 0.42, metalness: 0.3 }),
  oxide: (opacity = 0.35) => std(0xeae6dd, { transparent: true, opacity, roughness: 0.06, metalness: 0, depthWrite: false }),
  al: () => std(0x9da1a7, { metalness: 0.88, roughness: 0.38 }),
  tungsten: () => std(0x8a8d93, { metalness: 0.9, roughness: 0.35 }),
};
// metal / poly whose emissive follows a net (PhysicsView sets colour + intensity from signalStyle)
const netMat = (color = 0x6f7278, opts = {}) => std(color, { metalness: 0.8, roughness: 0.32, emissive: 0x000000, emissiveIntensity: 0, ...opts });
// invisible, pickable hit area for structures too thin to click (10 nm oxide, inversion layer)
const proxyMat = () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const glowMat = () => std(AMBER, { emissive: AMBER, emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false });

const boxGeo = (x0, x1, y0, y1, z0, z1) =>
  new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const meshOf = (geos, mat) => (geos.length ? new THREE.Mesh(geos.length === 1 ? geos[0] : mergeGeos(geos), mat) : null);

/** Flat bar between two XZ points (lead-frame finger, metal line). */
function barGeo(a, b, width, thick, y) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const g = new THREE.BoxGeometry(len + width, thick, width);
  g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
  g.translate((a.x + b.x) / 2, y + thick / 2, (a.z + b.z) / 2);
  return g;
}

function textPlane(text, width, { color = OFF_WHITE, flat = false, font = 'bold 60px "JetBrains Mono", "Courier New", monospace' } = {}) {
  const tex = textTexture([{ text, font, color }], { w: 1024, h: 128, bg: null });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  if (flat) m.rotation.x = -Math.PI / 2;
  return m;
}

/** Ruler with end ticks and a caption, facing +z. */
function scaleBar(group, { x, y, z, length, label, size }) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xe9e6df, toneMapped: false });
  const th = size * 0.05;
  const geos = [boxGeo(x, x + length, y - th / 2, y + th / 2, z - th / 2, z + th / 2)];
  for (const dx of [0, length]) geos.push(boxGeo(x + dx - th / 2, x + dx + th / 2, y - size * 0.15, y + size * 0.15, z - th / 2, z + th / 2));
  group.add(meshOf(geos, mat));
  const txt = textPlane(label, size * 3.2);
  txt.position.set(x + length / 2, y + size * 0.42, z);
  group.add(txt);
}

const ExtrudeOpts = (depth) => ({ depth, bevelEnabled: false, curveSegments: 6 });
function shapeOf(pts) {
  const s = new THREE.Shape();
  pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
  return s;
}
/** Profile drawn in (x, y), extruded along z from z0 to z1. */
const extrudeAlongZ = (pts, z0, z1) => new THREE.ExtrudeGeometry(shapeOf(pts), ExtrudeOpts(z1 - z0)).translate(0, 0, z0);
/** Profile drawn in (z, y), extruded along x from x0 to x1. */
function extrudeAlongX(pts, x0, x1) {
  const g = new THREE.ExtrudeGeometry(shapeOf(pts), ExtrudeOpts(x1 - x0));
  g.rotateY(-Math.PI / 2);
  g.translate(x1, 0, 0);
  return g;
}

// ---------------------------------------------------------------------------
// ROOT ALT VIEW: NV1 PQFP-208 package close-up
// ---------------------------------------------------------------------------
export function buildChipCloseUp(ctx) {
  const comp = ctx.engine.components.get('nv1_core');
  const chip = P.qfp({
    w: 16, d: 16, pinsPerSide: 52, bodyH: 1.4, leadLen: 1.1, cornerColor: 0x0b0c0f,
    marking: textTexture([{ text: 'SGS-THOMSON', font: 'bold 40px monospace', color: '#aebdd0' }, { text: 'STG2000X', font: 'bold 84px monospace', color: '#ffffff' }, { text: 'NVIDIA NV1', font: 'bold 56px monospace', color: '#FFA909' }, { text: 'A22BF9548  MALTA', font: '32px monospace', color: '#8899ad' }, { text: '208-PIN PLASTIC QUAD FLAT PACK', font: '26px monospace', color: '#6d7e93' }], { dot: true }),
  });
  chip.position.y = 0.4;
  if (comp) ctx.addComp(comp, chip, { label: new THREE.Vector3(0, 3, -7) });
  else ctx.group.add(chip);
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 26), MAT.pcb());
  pcb.position.y = 0.2;
  pcb.receiveShadow = true;
  ctx.group.add(pcb);
  const pad = new THREE.BoxGeometry(0.16, 0.02, 1.0);
  const mats = [];
  const pitch = (13.8 * 0.9) / 52;
  for (let i = 0; i < 52; i++) {
    const o = (i - 25.5) * pitch;
    mats.push(mat4(o, 0.41, 7.75), mat4(o, 0.41, -7.75), mat4(7.75, 0.41, o, Math.PI / 2), mat4(-7.75, 0.41, o, Math.PI / 2));
  }
  ctx.group.add(instanced(pad, MAT.copper(), mats));
  return { camera: [14, 16, 20], target: [0, 1, 0], floorY: -0.01 };
}

// ===========================================================================
// LEVEL 2: decapped package, die with pad ring, bond wires and the floorplan blocks (units: mm)
// ===========================================================================

// Sides in order top (-z), right (+x), bottom (+z), left (-x); n = outward normal, t = direction along the side
const SIDES = [
  { n: [0, -1], t: [1, 0] },
  { n: [1, 0], t: [0, 1] },
  { n: [0, 1], t: [-1, 0] },
  { n: [-1, 0], t: [0, -1] },
];

// body [w, d, h] and die [w, d] in mm, pins per side (top, right, bottom, left), lead pitch in mm
const PACKAGES = {
  nv1_die: { pkg: 'PQFP-208', mark: 'STG2000X · DIE 9,5 × 9,5 mm', body: [28, 28, 3.4], die: [9.5, 9.5], pins: [52, 52, 52, 52], pitch: 0.5, lead: 'gull' },
  stg1764_inside: { pkg: 'PQFP-128', mark: 'STG1764X · DIE ≈ 4,6 × 5,2 mm (odhad)', body: [14, 20, 2.7], die: [4.6, 5.2], pins: [26, 38, 26, 38], pitch: 0.5, lead: 'gull' },
  dram_inside: { pkg: 'SOJ-40', mark: 'KM416C256 · DIE ≈ 4,8 × 11,6 mm (odhad)', body: [10.16, 26.03, 3.5], die: [4.8, 11.6], pins: [0, 20, 0, 20], pitch: 1.27, lead: 'j' },
  ad1845_inside: { pkg: 'PLCC-68', mark: 'AD1845 · DIE ≈ 5,4 × 5,4 mm (odhad)', body: [24.2, 24.2, 4.4], die: [5.4, 5.4], pins: [17, 17, 17, 17], pitch: 1.27, lead: 'j' },
  eprom_inside: { pkg: 'CERDIP-28 s okénkem', mark: '27C256 · DIE ≈ 4,4 × 5,2 mm (odhad)', body: [37, 15.2, 4.2], die: [4.4, 5.2], pins: [14, 0, 14, 0], pitch: 2.54, lead: 'dip', ceramic: true },
};

function blockKind(c) {
  const s = `${c.label || ''} ${c.drill || ''}`;
  if (/SENSE/i.test(s)) return 'sense';
  if (/POLE|cell_array|eprom_array/i.test(s)) return 'array';
  if (/DEKODÉR|decoder/i.test(s)) return 'decoder';
  if (/ΣΔ|sigma/i.test(s)) return 'sigma';
  if (/DAC/.test(s)) return 'dac';
  if (/PLL|OSCIL/i.test(s)) return 'analog';
  if (/FIFO|PALETA/i.test(s)) return /\+/.test(s) ? 'logicmem' : 'memory';
  if (/BUFFER|I\/O/i.test(s)) return 'io';
  return 'logic';
}
const KIND_WEIGHT = { array: 3 };

/** Slicing floorplan: blocks grouped into columns by schematic x, stacked by y; widths/heights by weight. */
function floorplan(blocks, x0, x1, z0, z1, gutter) {
  const cols = [];
  for (const b of [...blocks].sort((p, q) => p.x - q.x)) {
    const col = cols.find((c) => Math.abs(c.x - b.x) < 40);
    if (col) col.items.push(b);
    else cols.push({ x: b.x, items: [b] });
  }
  const wt = (b) => KIND_WEIGHT[blockKind(b)] || 1;
  const colW = cols.map((c) => Math.max(...c.items.map(wt)));
  const sumW = colW.reduce((a, v) => a + v, 0);
  const out = new Map();
  let cx = x0;
  cols.forEach((col, i) => {
    const cw = ((x1 - x0) * colW[i]) / sumW;
    const items = col.items.sort((p, q) => p.y - q.y);
    const sumH = items.reduce((a, b) => a + wt(b), 0);
    let cz = z0;
    for (const b of items) {
      const ch = ((z1 - z0) * wt(b)) / sumH;
      out.set(b.id, { x0: cx + gutter / 2, x1: cx + cw - gutter / 2, z0: cz + gutter / 2, z1: cz + ch - gutter / 2 });
      cz += ch;
    }
    cx += cw;
  });
  return out;
}

// ---- procedural "die photo" textures (optical microscope look: Al bright, poly brownish, Si dark) ----------
const AL = (a) => `rgba(206,209,214,${a})`;
const POLY = (a) => `rgba(122,82,64,${a})`;

function paintLogic(c, W, H, r) {
  const rowH = 10;
  for (let y = 0; y < H; y += rowH) {
    let x = 3;
    while (x < W - 3) {
      const w = Math.min(4 + Math.floor(r() * 16), W - 3 - x);
      const g = 40 + Math.floor(r() * 52);
      c.fillStyle = `rgb(${g + 5},${g + 2},${g - 3})`;
      c.fillRect(x, y + 2, Math.max(1, w - 1), rowH - 4);
      c.fillStyle = POLY(0.55);
      for (let k = x + 1.5; k < x + w - 1; k += 2.5) c.fillRect(k, y + 2, 0.9, rowH - 4);
      x += w;
    }
    c.fillStyle = AL(0.5);
    c.fillRect(0, y, W, 1.6);
  }
  c.fillStyle = AL(0.1);
  for (let i = 0; i < W / 8; i++) c.fillRect(Math.floor(r() * W), 0, 1, H);
  c.fillStyle = AL(0.3); // M3 power straps
  for (let y = 14; y < H; y += 46) c.fillRect(0, y, W, 3);
}

function paintSram(c, x0, y0, w, h) {
  c.fillStyle = '#26272a';
  c.fillRect(x0, y0, w, h);
  const dec = w * 0.12, sa = h * 0.12;
  for (let y = y0 + 1; y < y0 + h - sa; y += 3) {
    c.fillStyle = (y / 3) % 2 < 1 ? '#57534c' : '#4a4741';
    c.fillRect(x0 + 1, y, dec - 2, 2);
  }
  for (let y = y0 + 1; y < y0 + h - sa; y += 3) {
    for (let x = x0 + dec; x < x0 + w - 1; x += 3) {
      c.fillStyle = Math.floor((x + y) / 3) % 2 ? '#5a5650' : '#47443f';
      c.fillRect(x, y, 2.4, 2.2);
    }
  }
  c.fillStyle = AL(0.35);
  for (let x = x0 + dec; x < x0 + w; x += 6) c.fillRect(x, y0, 1, h - sa);
  for (let x = x0 + dec; x < x0 + w - 3; x += 6) {
    c.fillStyle = '#6a655c';
    c.fillRect(x, y0 + h - sa + 2, 4, sa - 4);
  }
  c.strokeStyle = AL(0.55);
  c.lineWidth = 2;
  c.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
}

// DRAM / EPROM array: sub-arrays (mats) separated by sense-amp strips and row-decoder strips
function paintCellArray(c, W, H) {
  const nx = W >= H ? 8 : 4, ny = H > W ? 8 : 4;
  const dec = 7, sa = 6;
  const mw = (W - dec * (nx + 1)) / nx, mh = (H - sa * (ny + 1)) / ny;
  for (let i = 0; i <= nx; i++) {
    const x = i * (mw + dec);
    c.fillStyle = '#5c5850';
    c.fillRect(x + 1, 0, dec - 2, H);
    c.fillStyle = 'rgba(25,25,25,0.5)';
    for (let y = 0; y < H; y += 3) c.fillRect(x + 1, y, dec - 2, 1);
  }
  for (let j = 0; j <= ny; j++) {
    const y = j * (mh + sa);
    c.fillStyle = '#857e72';
    c.fillRect(0, y + 1, W, sa - 2);
    c.fillStyle = 'rgba(25,25,25,0.5)';
    for (let x = 0; x < W; x += 3) c.fillRect(x, y + 1, 1, sa - 2);
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x = dec + i * (mw + dec), y = sa + j * (mh + sa);
      c.fillStyle = '#3a3835';
      c.fillRect(x, y, mw, mh);
      c.fillStyle = 'rgba(12,12,12,0.6)';
      for (let yy = y; yy < y + mh; yy += 2) c.fillRect(x, yy, mw, 0.7);
      c.fillStyle = AL(0.22);
      for (let xx = x; xx < x + mw; xx += 2) c.fillRect(xx, y, 0.6, mh);
    }
  }
}

function paintSense(c, W, H) {
  for (let x = 0; x < W; x += 6) {
    c.fillStyle = '#4e4b45';
    c.fillRect(x + 1, 4, 4, H - 8);
    c.fillStyle = POLY(0.6);
    for (let y = 6; y < H - 6; y += 7) c.fillRect(x, y, 6, 1.2);
  }
  c.fillStyle = AL(0.4);
  for (let y = 0; y < H; y += H / 6) c.fillRect(0, y, W, 2);
}

function paintDecoder(c, W, H) {
  const bus = W * 0.25;
  c.fillStyle = AL(0.45);
  for (let x = 4; x < bus; x += 6) c.fillRect(x, 0, 2, H);
  for (let y = 0, j = 0; y < H; y += 4, j++) {
    const len = (W - bus - 4) * (0.55 + (0.4 * ((j * 7) % 5)) / 5);
    c.fillStyle = j % 2 ? '#56524b' : '#4a4741';
    c.fillRect(bus + 2, y + 0.5, len, 3);
    c.fillStyle = AL(0.7);
    c.fillRect(4 + (j % 4) * 6, y + 1, 3, 2);
  }
}

function paintAnalog(c, W, H, r) {
  for (let i = 0; i < 5; i++) {
    const w = W * (0.2 + r() * 0.2), h = H * (0.2 + r() * 0.2), x = r() * (W - w), y = r() * (H - h);
    c.fillStyle = '#3a3936';
    c.fillRect(x, y, w, h);
    c.strokeStyle = AL(0.55);
    c.lineWidth = 2;
    c.strokeRect(x + 2, y + 2, w - 4, h - 4); // guard ring
    if (i % 2) {
      c.fillStyle = POLY(0.75);
      for (let k = x + 6; k < x + w - 6; k += 5) c.fillRect(k, y + 6, 2, h - 12); // wide transistor fingers
    } else {
      c.fillStyle = '#6a665e';
      c.fillRect(x + 6, y + 6, w - 12, h - 12); // poly-poly capacitor
      c.fillStyle = AL(0.3);
      c.fillRect(x + 10, y + 10, w - 20, h - 20);
    }
  }
  c.strokeStyle = POLY(0.85);
  c.lineWidth = 2;
  const sx = r() * W * 0.5, sy = r() * H * 0.5;
  c.beginPath();
  for (let k = 0; k < 12; k++) { c.lineTo(sx + k * 6, sy); c.lineTo(sx + k * 6, sy + H * 0.3); c.lineTo(sx + k * 6 + 3, sy + H * 0.3); c.lineTo(sx + k * 6 + 3, sy); }
  c.stroke(); // serpentine poly resistor
  c.fillStyle = AL(0.45);
  c.fillRect(0, H * 0.5, W, 4);
  c.fillRect(W * 0.5, 0, 4, H);
}

// current-steering DAC: 16 × 16 matrix of unit current cells + decoder logic
function paintDac(c, W, H, r) {
  const mW = W * 0.72, n = 16, cw = (mW - 8) / n, ch = (H - 8) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = 4 + i * cw, y = 4 + j * ch;
      c.fillStyle = '#4a4741';
      c.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      c.fillStyle = POLY(0.7);
      c.fillRect(x + cw * 0.3, y + 2, cw * 0.12, ch - 4);
      c.fillRect(x + cw * 0.58, y + 2, cw * 0.12, ch - 4);
    }
  }
  c.fillStyle = AL(0.35);
  for (let j = 0; j <= n; j++) c.fillRect(4, 4 + j * ch - 1, mW - 8, 1.5);
  c.save();
  c.translate(mW, 0);
  paintLogic(c, W - mW, H, r);
  c.restore();
}

function paintIo(c, W, H) {
  for (let g = 0; g < 3; g++) {
    const x0 = 6 + (g * W) / 3, w = W / 3 - 12;
    c.strokeStyle = AL(0.55);
    c.lineWidth = 3;
    c.strokeRect(x0, 6, w, H - 12);
    c.fillStyle = g % 2 ? '#5a5249' : '#4b5058';
    c.fillRect(x0 + 6, 12, w - 12, H - 24);
    c.fillStyle = POLY(0.85);
    for (let k = x0 + 10; k < x0 + w - 10; k += 6) c.fillRect(k, 10, 2, H - 20);
    c.fillStyle = AL(0.4);
    for (let k = x0 + 13; k < x0 + w - 10; k += 6) c.fillRect(k, 14, 2, H - 28);
  }
}

function blockTexture(kind, seed, aspect) {
  const W = 512, H = Math.round(Math.max(128, Math.min(1024, W / Math.max(0.25, aspect))));
  const cvs = document.createElement('canvas');
  cvs.width = W;
  cvs.height = H;
  const c = cvs.getContext('2d');
  const r = rng(seed);
  c.fillStyle = '#242528';
  c.fillRect(0, 0, W, H);
  const painters = {
    logic: paintLogic,
    logicmem: (cc, w, h, rr) => { paintLogic(cc, w, h, rr); paintSram(cc, w * 0.56, h * 0.08, w * 0.4, h * 0.42); },
    memory: (cc, w, h) => paintSram(cc, 4, 4, w - 8, h - 8),
    array: paintCellArray,
    sense: paintSense,
    decoder: paintDecoder,
    analog: paintAnalog,
    dac: paintDac,
    sigma: (cc, w, h, rr) => { paintAnalog(cc, w / 2, h, rr); cc.save(); cc.translate(w / 2, 0); paintLogic(cc, w / 2, h, rr); cc.restore(); },
    io: paintIo,
  };
  (painters[kind] || paintLogic)(c, W, H, r);
  c.strokeStyle = AL(0.6);
  c.lineWidth = 4;
  c.strokeRect(2, 2, W - 4, H - 4); // block power ring
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function dieBaseTexture(DW, DD, ring, seed) {
  const W = 1024, H = Math.round((1024 * DD) / DW), k = W / DW;
  const cvs = document.createElement('canvas');
  cvs.width = W;
  cvs.height = H;
  const c = cvs.getContext('2d');
  c.fillStyle = '#3b3c40'; // scribe lane
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#1f2023';
  c.fillRect(0.06 * k, 0.06 * k, W - 0.12 * k, H - 0.12 * k);
  c.strokeStyle = AL(0.75); // seal ring
  c.lineWidth = Math.max(2, 0.03 * k);
  c.strokeRect(0.09 * k, 0.09 * k, W - 0.18 * k, H - 0.18 * k);
  // I/O cells between the bond pads and the core
  const a = 0.22 * k, b = (ring - 0.07) * k;
  const r = rng(seed);
  for (const [x0, y0, x1, y1, horiz] of [[a, a, W - a, b, true], [a, H - b, W - a, H - a, true], [a, a, b, H - a, false], [W - b, a, W - a, H - a, false]]) {
    const len = horiz ? x1 - x0 : y1 - y0, step = 0.18 * k;
    for (let s = 0; s < len; s += step) {
      c.fillStyle = r() > 0.5 ? '#3d3b37' : '#46433d';
      if (horiz) c.fillRect(x0 + s + 1, y0, step - 2, y1 - y0);
      else c.fillRect(x0, y0 + s + 1, x1 - x0, step - 2);
    }
  }
  c.strokeStyle = AL(0.8); // VDD / GND core rings
  c.lineWidth = Math.max(2, 0.035 * k);
  for (const inset of [ring - 0.05, ring - 0.11]) c.strokeRect(inset * k, inset * k, W - 2 * inset * k, H - 2 * inset * k);
  c.save(); // routing channels between the blocks: faint standard cells
  c.globalAlpha = 0.5;
  c.translate(ring * k, ring * k);
  paintLogic(c, W - 2 * ring * k, H - 2 * ring * k, r);
  c.restore();
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** One lead built along +x from the body edge (x = 0), instanced around the body. */
function leadGeometry(style, width, bodyMid, y0) {
  const t = 0.15;
  const parts = style === 'dip'
    ? [boxGeo(0, 0.7, y0 + 0.2, y0 + 0.2 + t, -width, width), boxGeo(0.55, 0.55 + t, -3.2, y0 + 0.35, -width / 2, width / 2)]
    : style === 'j'
      ? [boxGeo(0, 0.55, bodyMid - t / 2, bodyMid + t / 2, -width / 2, width / 2), boxGeo(0.5, 0.5 + t, 0.05, bodyMid, -width / 2, width / 2), boxGeo(0.05, 0.6, 0, t, -width / 2, width / 2)]
      : [boxGeo(0, 0.55, bodyMid - t / 2, bodyMid + t / 2, -width / 2, width / 2), boxGeo(0.5, 0.5 + t, 0.05, bodyMid, -width / 2, width / 2), boxGeo(0.5, 1.2, 0, t, -width / 2, width / 2)];
  return mergeGeos(parts);
}

export function buildDieScene(ctx) {
  const { engine, group, entry } = ctx;
  const pk = PACKAGES[entry?.key] || PACKAGES.nv1_die;
  const [BW, BD, BH] = pk.body;
  const [DW, DD] = pk.die;
  const y0 = pk.lead === 'dip' ? 0.9 : 0.25;
  const floorY = y0 + BH * 0.42;
  const PADDLE_T = 0.15, DIE_T = 0.45, FINGER_T = 0.12;
  const dieTop = floorY + PADDLE_T + DIE_T;
  const margin = Math.min(3.0, Math.min(BW - DW, BD - DD) / 2 - 1.2);
  const CW = DW + 2 * margin, CD = DD + 2 * margin;
  const half = (nx, w, d) => (nx ? w / 2 : d / 2);

  // ---- package body with the decap cavity ----
  const bodyMat = pk.ceramic ? std(0x262523, { roughness: 0.8 }) : MAT.epoxy();
  const body = [boxGeo(-BW / 2, BW / 2, y0, floorY, -BD / 2, BD / 2)];
  const top = y0 + BH;
  body.push(boxGeo(-BW / 2, BW / 2, floorY, top, -BD / 2, -CD / 2), boxGeo(-BW / 2, BW / 2, floorY, top, CD / 2, BD / 2));
  body.push(boxGeo(-BW / 2, -CW / 2, floorY, top, -CD / 2, CD / 2), boxGeo(CW / 2, BW / 2, floorY, top, -CD / 2, CD / 2));
  const bodyMesh = meshOf(body, bodyMat);
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);
  if (pk.ceramic) { // UV-erasable EPROM: quartz window over the cavity
    const win = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.3, CD), std(0xdfe6ea, { transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, depthWrite: false }));
    win.position.y = top - 0.15;
    group.add(win);
  }
  const wallD = (BD - CD) / 2;
  const mark = textPlane(`${pk.pkg} · ${pk.mark}`, Math.min(BW * 0.9, wallD * 8 * 0.85), { flat: true, color: '#8f8b84' });
  mark.position.set(0, top + 0.01, CD / 2 + wallD / 2);
  group.add(mark);

  // ---- outer leads ----
  const leadW = Math.min(0.45, pk.pitch * 0.44);
  const leadGeo = leadGeometry(pk.lead, leadW, y0 + BH / 2, y0);
  const leadMats = [];
  SIDES.forEach((sd, i) => {
    const n = pk.pins[i];
    for (let k = 0; k < n; k++) {
      const o = (k - (n - 1) / 2) * pk.pitch;
      const x = sd.n[0] * (BW / 2) + sd.t[0] * o, z = sd.n[1] * (BD / 2) + sd.t[1] * o;
      leadMats.push(mat4(x, 0, z, Math.atan2(-sd.n[1], sd.n[0])));
    }
  });
  group.add(instanced(leadGeo, std(0xaeb3b9, { metalness: 0.9, roughness: 0.35 }), leadMats));

  // ---- lead-frame fingers, die paddle, die, bond pads, bond wires ----
  const gap = Math.min(1.0, margin * 0.35);
  const fingers = [], padSpots = []; // padSpots[side] = [{ p, tip }]
  SIDES.forEach((sd, i) => {
    const n = pk.pins[i];
    padSpots[i] = [];
    if (!n) return;
    const along = (w, d) => (sd.t[0] ? w / 2 : d / 2);
    const pinSpan = Math.max(1e-6, ((n - 1) / 2) * pk.pitch);
    const cavHalfN = half(sd.n[0], CW, CD), dieHalfN = half(sd.n[0], DW, DD);
    const cavSpan = along(CW, CD) - 0.45, tipSpan = along(DW, DD) - 0.1 + gap * 0.5, padSpan = along(DW, DD) - 0.42;
    const tipW = Math.min(0.16, n > 1 ? (0.55 * 2 * tipSpan) / (n - 1) : 0.16);
    const padS = Math.min(0.1, n > 1 ? (0.55 * 2 * padSpan) / (n - 1) : 0.1);
    for (let k = 0; k < n; k++) {
      const f = n > 1 ? ((k - (n - 1) / 2) * pk.pitch) / pinSpan : 0;
      const pt = (hn, o) => ({ x: sd.n[0] * hn + sd.t[0] * o, z: sd.n[1] * hn + sd.t[1] * o });
      const start = pt(cavHalfN + 0.4, f * cavSpan), tip = pt(dieHalfN + gap, f * tipSpan);
      fingers.push(barGeo(start, tip, tipW, FINGER_T, floorY));
      padSpots[i].push({ p: pt(dieHalfN - 0.14, f * padSpan), tip, size: padS, n: sd.n });
    }
  });
  const fingerMesh = meshOf(fingers, std(0x9a9da1, { metalness: 0.85, roughness: 0.38 }));
  if (fingerMesh) group.add(fingerMesh);
  const paddle = new THREE.Mesh(new THREE.BoxGeometry(DW + 0.5, PADDLE_T, DD + 0.5), std(0xc9ccd0, { metalness: 0.9, roughness: 0.3 }));
  paddle.position.y = floorY + PADDLE_T / 2;
  group.add(paddle);
  const RING = 0.42; // pad ring + I/O cells + power rings (mm)
  const sideMat = std(0x2f3338, { metalness: 0.4, roughness: 0.42 });
  const topMat = std(0x8c8c8c, { map: dieBaseTexture(DW, DD, RING, hashStr(entry?.key || 'die')), metalness: 0.1, roughness: 0.72 });
  const die = new THREE.Mesh(new THREE.BoxGeometry(DW, DIE_T, DD), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  die.position.y = floorY + PADDLE_T + DIE_T / 2;
  die.castShadow = true;
  die.receiveShadow = true;
  group.add(die);

  const wires = [];
  for (const spots of padSpots) {
    for (const s of spots) {
      const p0 = new THREE.Vector3(s.p.x, dieTop + 0.01, s.p.z);
      const p3 = new THREE.Vector3(s.tip.x - s.n[0] * 0.15, floorY + FINGER_T, s.tip.z - s.n[1] * 0.15);
      const out = new THREE.Vector3(s.n[0], 0, s.n[1]);
      const curve = new THREE.CubicBezierCurve3(p0, p0.clone().add(new THREE.Vector3(0, 0.45, 0)).addScaledVector(out, 0.05), p3.clone().add(new THREE.Vector3(0, 0.35, 0)).addScaledVector(out, -0.2), p3);
      wires.push(new THREE.TubeGeometry(curve, 12, 0.0125, 4, false)); // Au wire 25 µm
    }
  }
  if (wires.length) group.add(new THREE.Mesh(mergeGeos(wires), MAT.gold()));

  // ---- pad-ring segments (pad_* components) and core blocks ----
  const comps = [...engine.components.values()];
  const padComps = comps.filter((c) => /^pad_/.test(c.id));
  const blocks = comps.filter((c) => !/^pad_/.test(c.id));
  const all = comps.map((c) => ({ c, ...componentDims(c, 'schematic') }));
  const bx0 = Math.min(...all.map((a) => a.c.x)), bx1 = Math.max(...all.map((a) => a.c.x + a.w));
  const by0 = Math.min(...all.map((a) => a.c.y)), by1 = Math.max(...all.map((a) => a.c.y + a.h));
  const sideComps = SIDES.map(() => []);
  for (const c of padComps) {
    const { w, h } = componentDims(c, 'schematic');
    const u = (c.x + w / 2 - (bx0 + bx1) / 2) / Math.max(1, (bx1 - bx0) / 2);
    const v = (c.y + h / 2 - (by0 + by1) / 2) / Math.max(1, (by1 - by0) / 2);
    let best = -1, bs = -Infinity;
    SIDES.forEach((sd, i) => { const sc = sd.n[0] * u + sd.n[1] * v; if (pk.pins[i] && sc > bs) { bs = sc; best = i; } });
    if (best >= 0) sideComps[best].push({ c, a: SIDES[best].t[0] * u + SIDES[best].t[1] * v });
  }
  const usedPad = new Set();
  const padAnchor = new Map();
  sideComps.forEach((list, i) => {
    const spots = padSpots[i];
    list.sort((p, q) => p.a - q.a).forEach(({ c }, j) => {
      const slot = spots.length / list.length;
      const k0 = Math.floor(slot * j + slot * 0.15), k1 = Math.max(k0 + 1, Math.ceil(slot * (j + 1) - slot * 0.15));
      const mine = spots.slice(k0, k1);
      if (!mine.length) return;
      const mat = netMat(0xd8dadd);
      const firstPin = Object.keys(c.outputs || {})[0] || Object.keys(c.inputs || {})[0];
      if (firstPin) ctx.addSignal(mat, c.id, firstPin);
      const g = new THREE.Group();
      const pads = mine.map((s) => boxGeo(s.p.x - s.size / 2, s.p.x + s.size / 2, dieTop, dieTop + 0.012, s.p.z - s.size / 2, s.p.z + s.size / 2));
      g.add(meshOf(pads, mat));
      mine.forEach((s, k) => usedPad.add(`${i}:${k0 + k}`));
      // the I/O cells of this segment (drivers / receivers) sit just inside the pads
      const a = mine[0].p, b = mine[mine.length - 1].p, nn = mine[0].n;
      const inner = (p, d) => ({ x: p.x - nn[0] * d, z: p.z - nn[1] * d });
      const strip = barGeo(inner(a, 0.2), inner(b, 0.2), 0.16, 0.004, dieTop);
      g.add(new THREE.Mesh(strip, std(0x5b5650, { metalness: 0.4, roughness: 0.5 })));
      const mid = inner({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, 0.3);
      padAnchor.set(c.id, mid);
      ctx.addComp(c, g, { label: new THREE.Vector3(mid.x - nn[0] * 0.4, dieTop + 0.35, mid.z - nn[1] * 0.4) });
    });
  });
  const otherPads = [];
  padSpots.forEach((spots, i) => spots.forEach((s, k) => { if (!usedPad.has(`${i}:${k}`)) otherPads.push(boxGeo(s.p.x - s.size / 2, s.p.x + s.size / 2, dieTop, dieTop + 0.012, s.p.z - s.size / 2, s.p.z + s.size / 2)); }));
  const op = meshOf(otherPads, PM.al());
  if (op) group.add(op);

  const rects = floorplan(blocks, -DW / 2 + RING, DW / 2 - RING, -DD / 2 + RING, DD / 2 - RING, Math.min(DW, DD) * 0.012);
  for (const c of blocks) {
    const r = rects.get(c.id);
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const kind = blockKind(c);
    const tint = { memory: 0x84888f, array: 0x84888f, sense: 0x888a8d, decoder: 0x888a8d, analog: 0x948a7f, dac: 0x948a7f, sigma: 0x948a7f, io: 0x8d8981 }[kind] || 0x8c8c8c;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, d), std(tint, { map: blockTexture(kind, hashStr(c.id), w / d), metalness: 0.1, roughness: 0.72 }));
    plate.position.set((r.x0 + r.x1) / 2, dieTop + 0.003, (r.z0 + r.z1) / 2);
    ctx.addComp(c, plate, { label: new THREE.Vector3(plate.position.x, dieTop + 0.3, plate.position.z) });
  }

  // ---- top-metal buses between the blocks (glow with the net) ----
  const pinPos = (id, pin, isOut) => {
    if (padAnchor.has(id)) return padAnchor.get(id);
    const r = rects.get(id), comp = engine.components.get(id);
    if (!r || !comp) return null;
    const pins = Object.keys((isOut ? comp.outputs : comp.inputs) || {});
    const f = (Math.max(0, pins.indexOf(pin)) + 1) / (pins.length + 1);
    return { x: isOut ? r.x1 : r.x0, z: r.z0 + (r.z1 - r.z0) * f };
  };
  for (const wire of engine.wires) {
    const a = pinPos(wire.from.id, wire.from.pin, true), b = pinPos(wire.to.id, wire.to.pin, false);
    if (!a || !b) continue;
    const mx = (a.x + b.x) / 2;
    const segs = [[a, { x: mx, z: a.z }], [{ x: mx, z: a.z }, { x: mx, z: b.z }], [{ x: mx, z: b.z }, b]].filter(([p, q]) => Math.hypot(q.x - p.x, q.z - p.z) > 1e-3);
    if (!segs.length) continue;
    const mat = netMat(0xa3a6ab);
    group.add(meshOf(segs.map(([p, q]) => barGeo(p, q, Math.min(DW, DD) * 0.004, 0.008, dieTop + 0.006)), mat));
    ctx.addTrace(mat, wire);
  }

  const bar = BW > 20 ? 5 : 2;
  scaleBar(group, { x: -bar / 2, y: 0.15, z: BD / 2 + (pk.lead === 'dip' ? 1.2 : 2.0), length: bar, label: `${bar} mm`, size: 0.9 });
  const k = Math.max(CW, CD) * 1.15 + 3;
  return { camera: [0, dieTop + k * 0.82, k * 0.72], target: [0, dieTop, 0.4], floorY: pk.lead === 'dip' ? -3.25 : -0.01 };
}

// ===========================================================================
// LEVELS 3-5: standard-cell rows (placement = schematic positions snapped to cell rows)
// ===========================================================================
const PORT_TYPES = new Set(['INPUT', 'CLOCK', 'PROBE', 'OUTPUT']);
const SLICE_TYPES = new Set(['REGISTER_8BIT', 'REGISTER_16BIT', 'REGISTER_32BIT', 'ADDER_8BIT', 'COMPARATOR_8BIT', 'FULL_ADDER']);
const MEM_TYPES = new Set(['RAM', 'ROM', 'VRAM_BANK']);
// layer heights in scene units (exaggerated: the cell rows are drawn at schematic scale)
const LY = { diff: 0.012, polyB: 0.018, polyT: 0.045, m1B: 0.085, m1T: 0.115, m2B: 0.19, m2T: 0.22, m3B: 0.29, m3T: 0.33 };

/** Geometry of one standard cell in a row: P diffusion in the n-well (VDD side), N diffusion on the GND side. */
function stdCellGeo(out, x0, x1, zt, H, vddTop, r, pitch) {
  const zP = zt + (vddTop ? 0.3 : 0.7) * H, zN = zt + (vddTop ? 0.72 : 0.28) * H;
  const hP = 0.26 * H, hN = 0.17 * H;
  const zVdd = vddTop ? zt : zt + H, zGnd = vddTop ? zt + H : zt;
  const n = Math.max(1, Math.round((x1 - x0) / pitch) - 1);
  const step = (x1 - x0) / (n + 1);
  const fx = (i) => x0 + step * (i + 1);
  const pw = step * 0.24, cs = step * 0.2;
  const zLo = Math.min(zP - hP / 2, zN - hN / 2) - 0.05 * H, zHi = Math.max(zP + hP / 2, zN + hN / 2) + 0.05 * H;
  const zMid = (zP + zN) / 2;
  const contacts = []; // x of contacted S/D regions
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const end = i === n - 1 || r() < 0.25;
    if (!end) {
      if (r() < 0.7) contacts.push(fx(i) + step / 2); // shared, contacted region (else: series stack)
      continue;
    }
    const a = fx(seg) - step * 0.42, b = fx(i) + step * 0.42;
    out.pdiff.push(boxGeo(a, b, 0, LY.diff, zP - hP / 2, zP + hP / 2));
    out.ndiff.push(boxGeo(a, b, 0, LY.diff, zN - hN / 2, zN + hN / 2));
    contacts.push(fx(seg) - step * 0.27, fx(i) + step * 0.27);
    seg = i + 1;
  }
  for (let i = 0; i < n; i++) {
    const x = fx(i);
    out.poly.push(boxGeo(x - pw / 2, x + pw / 2, LY.polyB, LY.polyT, zLo, zHi));
    if (r() < 0.55) { // input pin: poly contact landing pad
      out.poly.push(boxGeo(x - pw, x + pw, LY.polyB, LY.polyT, zMid - pw, zMid + pw));
      out.contact.push(boxGeo(x - cs / 2, x + cs / 2, LY.polyT, LY.m1B, zMid - cs / 2, zMid + cs / 2));
      out.m1.push(boxGeo(x - cs, x + cs, LY.m1B, LY.m1T, zMid - cs, zMid + cs));
    }
  }
  contacts.forEach((x, j) => {
    for (const z of [zP, zN]) out.contact.push(boxGeo(x - cs / 2, x + cs / 2, LY.diff, LY.m1B, z - cs / 2, z + cs / 2));
    if (j % 2 === 0) { // supply: P to VDD rail, N to GND rail
      out.m1.push(boxGeo(x - cs * 0.7, x + cs * 0.7, LY.m1B, LY.m1T, Math.min(zP, zVdd), Math.max(zP, zVdd)));
      out.m1.push(boxGeo(x - cs * 0.7, x + cs * 0.7, LY.m1B, LY.m1T, Math.min(zN, zGnd), Math.max(zN, zGnd)));
    } else { // output node: M1 strap joining the PMOS and NMOS drains
      out.m1out.push(boxGeo(x - cs * 0.7, x + cs * 0.7, LY.m1B, LY.m1T, Math.min(zP, zN), Math.max(zP, zN)));
    }
  });
}

function memoryMacroGeo(out, rect, H) {
  const { x0, x1, z0, z1 } = rect;
  const w = x1 - x0, d = z1 - z0;
  out.base.push(boxGeo(x0, x1, 0, 0.006, z0, z1));
  const dec = x0 + w * 0.16, sa = z1 - d * 0.14;
  const rows = Math.max(4, Math.min(16, Math.round((sa - z0) / (H * 0.22))));
  const cols = Math.max(4, Math.min(28, Math.round((x1 - dec) / (H * 0.2))));
  const rh = (sa - z0) / rows, cw = (x1 - dec) / cols;
  for (let j = 0; j < rows; j++) {
    const z = z0 + rh * (j + 0.5);
    out.poly.push(boxGeo(dec, x1 - cw * 0.2, LY.polyB, LY.polyT, z - rh * 0.12, z + rh * 0.12)); // word line
    out.ndiff.push(boxGeo(x0 + w * 0.02, dec - w * 0.02, 0, LY.diff, z - rh * 0.3, z + rh * 0.3)); // row decoder
    for (let i = 0; i < cols; i++) {
      const x = dec + cw * (i + 0.5);
      out.ndiff.push(boxGeo(x - cw * 0.28, x + cw * 0.28, 0, LY.diff, z - rh * 0.36, z + rh * 0.36)); // bit cell
    }
  }
  for (let i = 0; i < cols; i++) {
    const x = dec + cw * (i + 0.5);
    out.m1.push(boxGeo(x - cw * 0.1, x + cw * 0.1, LY.m1B, LY.m1T, z0, sa)); // bit line
    out.pdiff.push(boxGeo(x - cw * 0.35, x + cw * 0.35, 0, LY.diff, sa + d * 0.02, z1 - d * 0.02)); // sense amp
    out.m1out.push(boxGeo(x - cw * 0.1, x + cw * 0.1, LY.m1B, LY.m1T, sa, z1 - d * 0.02));
  }
}

const sigPin = (c) => (c.type === 'PROBE' ? 'in' : Object.keys(c.outputs || {})[0]);

export function buildCellScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  if (!comps.length) return { camera: [0, 20, 18], target: [0, 0, 0], floorY: -0.6 };
  const dims = new Map(comps.map((c) => [c.id, componentDims(c, 'schematic')]));
  const L = (() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of comps) { const d = dims.get(c.id); minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + d.w); maxY = Math.max(maxY, c.y + d.h); }
    const s = Math.min(30 / Math.max(1, maxX - minX), 17 / Math.max(1, maxY - minY));
    return { s, minX, minY, maxX, maxY, x: (px) => (px - (minX + maxX) / 2) * s, z: (py) => (py - (minY + maxY) / 2) * s };
  })();
  const ROW_PX = 40, H = ROW_PX * L.s, PITCH = H * 0.17;
  const y0 = L.minY - 8;
  const nRows = Math.ceil((L.maxY + 8 - y0) / ROW_PX);
  const rowTop = (r) => L.z(y0 + r * ROW_PX);
  const X0 = L.x(L.minX) - 1.2, X1 = L.x(L.maxX) + 0.8, Z0 = rowTop(0), Z1 = rowTop(nRows);

  // ---- substrate, n-wells, shared VDD / GND rails of the mirrored rows ----
  const sub = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0 + 1.6, 0.5, Z1 - Z0 + 1.6), PM.psub());
  sub.position.set((X0 + X1) / 2, -0.25, (Z0 + Z1) / 2);
  sub.receiveShadow = true;
  group.add(sub);
  const wells = [], vdd = [], gnd = [];
  for (let r = 0; r < nRows; r++) {
    const zt = rowTop(r);
    wells.push(r % 2 === 0 ? boxGeo(X0, X1, 0, 0.004, zt, zt + H / 2) : boxGeo(X0, X1, 0, 0.004, zt + H / 2, zt + H));
  }
  for (let b = 0; b <= nRows; b++) (b % 2 === 0 ? vdd : gnd).push(boxGeo(X0, X1, LY.m1B, LY.m1T, rowTop(b) - H * 0.05, rowTop(b) + H * 0.05));
  group.add(meshOf(wells, PM.nwell()));
  group.add(meshOf(vdd, PM.al()));
  group.add(meshOf(gnd, PM.al()));
  for (let b = 0; b <= Math.min(nRows, 3); b++) {
    const t = textPlane(b % 2 === 0 ? 'VDD' : 'GND', H * 1.6, { flat: true, color: '#a9a6a0' });
    t.position.set(X0 - 0.5, LY.m1T, rowTop(b));
    group.add(t);
  }

  // ---- place every component ----
  const shared = { pdiff: PM.pplus(), ndiff: PM.nplus(), poly: PM.poly(), contact: PM.tungsten(), m1: PM.al(), base: std(0x232427, { roughness: 0.8 }) };
  const placed = new Map();
  for (const c of comps) {
    const { w, h } = dims.get(c.id);
    const x0 = L.x(c.x), x1 = L.x(c.x + w);
    if (PORT_TYPES.has(c.type)) { placed.set(c.id, { x0, x1, z0: L.z(c.y), z1: L.z(c.y + h), port: true }); continue; }
    const k = MEM_TYPES.has(c.type) || SLICE_TYPES.has(c.type) ? Math.max(2, Math.round(h / ROW_PX)) : 1;
    const rc = Math.floor((c.y + h / 2 - y0) / ROW_PX);
    const r0 = Math.max(0, Math.min(nRows - k, rc - Math.floor(k / 2)));
    placed.set(c.id, { x0, x1, z0: rowTop(r0), z1: rowTop(r0 + k), r0, k });
  }

  for (const c of comps) {
    const rect = placed.get(c.id);
    const cx = (rect.x0 + rect.x1) / 2, cz = (rect.z0 + rect.z1) / 2;
    const obj = new THREE.Group();
    const pin = sigPin(c);
    const outMat = netMat();
    if (pin) ctx.addSignal(outMat, c.id, pin);
    if (PORT_TYPES.has(c.type)) {
      const s = Math.min(rect.x1 - rect.x0, rect.z1 - rect.z0, 1.2) * 0.55;
      obj.add(meshOf([boxGeo(cx - s / 2, cx + s / 2, LY.m3B, LY.m3T, cz - s / 2, cz + s / 2), boxGeo(cx - s * 0.12, cx + s * 0.12, 0, LY.m3B, cz - s * 0.12, cz + s * 0.12)], outMat));
    } else if (c.type === 'BUS_SPLITTER' || c.type === 'BUS_MERGER') {
      const lines = [];
      for (let i = 0; i < 8; i++) {
        const z = rect.z0 + ((rect.z1 - rect.z0) * (i + 0.5)) / 8;
        lines.push(boxGeo(rect.x0, rect.x1, LY.m2B, LY.m2T, z - H * 0.03, z + H * 0.03));
        lines.push(boxGeo(rect.x1 - H * 0.06, rect.x1, LY.m1T, LY.m2B, z - H * 0.03, z + H * 0.03));
      }
      obj.add(meshOf(lines, outMat));
    } else if (c.type === 'VDD' || c.type === 'GND') {
      const zr = rowTop(rect.r0 + (((rect.r0 % 2 === 0) === (c.type === 'VDD')) ? 0 : 1));
      obj.add(meshOf([boxGeo(rect.x0, rect.x1, LY.m1B, LY.m1T + 0.01, zr - H * 0.12, zr + H * 0.12)], outMat));
    } else if (c.type === 'NMOS' || c.type === 'PMOS') {
      const vddTop = rect.r0 % 2 === 0, zt = rect.z0;
      const isP = c.type === 'PMOS';
      const zc = zt + (isP === vddTop ? 0.3 : 0.72) * H, hh = (isP ? 0.26 : 0.17) * H;
      const xa = rect.x0 + (rect.x1 - rect.x0) * 0.2, xb = rect.x1 - (rect.x1 - rect.x0) * 0.2, pw = (xb - xa) * 0.14;
      obj.add(meshOf([boxGeo(xa, xb, 0, LY.diff, zc - hh / 2, zc + hh / 2)], isP ? shared.pdiff : shared.ndiff));
      obj.add(meshOf([boxGeo(cx - pw / 2, cx + pw / 2, LY.polyB, LY.polyT, zc - hh * 0.8, zc + hh * 0.8)], shared.poly));
      obj.add(meshOf([xa + pw, xb - pw].map((x) => boxGeo(x - pw / 2, x + pw / 2, LY.diff, LY.m1T, zc - pw / 2, zc + pw / 2)), shared.contact));
      const ch = glowMat();
      obj.add(meshOf([boxGeo(cx - pw * 0.9, cx + pw * 0.9, LY.diff, LY.diff + 0.004, zc - hh / 2, zc + hh / 2)], ch));
      ctx.onFrame(() => { const on = !!c.conducting; ch.opacity = on ? 0.9 : 0; ch.emissiveIntensity = on ? 1.6 : 0; });
    } else {
      const out = { pdiff: [], ndiff: [], poly: [], contact: [], m1: [], m1out: [], base: [] };
      const r = rng(hashStr(c.id));
      if (MEM_TYPES.has(c.type)) memoryMacroGeo(out, rect, H);
      else for (let rr = rect.r0; rr < rect.r0 + rect.k; rr++) stdCellGeo(out, rect.x0 + 0.02, rect.x1 - 0.02, rowTop(rr), H, rr % 2 === 0, r, PITCH);
      for (const [key, mat] of Object.entries(shared)) { const m = meshOf(out[key], mat); if (m) obj.add(m); }
      const mo = meshOf(out.m1out, outMat);
      if (mo) obj.add(mo);
    }
    // the cell is sparse (gaps between poly lines): an invisible box over its footprint makes it clickable
    obj.add(new THREE.Mesh(boxGeo(rect.x0, rect.x1, 0, rect.port ? LY.m3T : LY.m1T, rect.z0, rect.z1), proxyMat()));
    ctx.addComp(c, obj, { label: new THREE.Vector3(cx, 0.55, rect.port ? cz - 0.5 : rect.z0 + 0.1) });
  }

  // ---- interconnect: M2 horizontal, M3 vertical, W/Al vias (glow with the net) ----
  const pinPos = (id, p, isOut) => {
    const rect = placed.get(id), comp = engine.components.get(id);
    if (!rect || !comp) return null;
    if (rect.port) return { x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2 };
    const pins = Object.keys((isOut ? comp.outputs : comp.inputs) || {});
    const f = (Math.max(0, pins.indexOf(p)) + 1) / (pins.length + 1);
    return { x: isOut ? rect.x1 - 0.05 : rect.x0 + 0.05, z: rect.z0 + (rect.z1 - rect.z0) * f };
  };
  const RW = Math.max(0.05, H * 0.06);
  for (const wire of engine.wires) {
    const a = pinPos(wire.from.id, wire.from.pin, true), b = pinPos(wire.to.id, wire.to.pin, false);
    if (!a || !b) continue;
    const mx = (a.x + b.x) / 2;
    const m2 = [], m3 = [], vias = [];
    if (Math.abs(mx - a.x) > 1e-3) m2.push(barGeo(a, { x: mx, z: a.z }, RW, LY.m2T - LY.m2B, LY.m2B));
    if (Math.abs(b.x - mx) > 1e-3) m2.push(barGeo({ x: mx, z: b.z }, b, RW, LY.m2T - LY.m2B, LY.m2B));
    if (Math.abs(b.z - a.z) > 1e-3) {
      m3.push(barGeo({ x: mx, z: a.z }, { x: mx, z: b.z }, RW, LY.m3T - LY.m3B, LY.m3B));
      for (const z of [a.z, b.z]) vias.push(boxGeo(mx - RW * 0.4, mx + RW * 0.4, LY.m2T, LY.m3B, z - RW * 0.4, z + RW * 0.4));
    }
    for (const p of [a, b]) vias.push(boxGeo(p.x - RW * 0.4, p.x + RW * 0.4, LY.m1T, LY.m2B, p.z - RW * 0.4, p.z + RW * 0.4));
    const mat = netMat();
    group.add(meshOf([...m2, ...m3, ...vias], mat));
    ctx.addTrace(mat, wire);
  }
  const S = Math.max((X1 - X0) * 0.85, (Z1 - Z0) * 1.3) + 4;
  return { camera: [0, S * 0.8, S * 0.72], target: [0, 0, (Z0 + Z1) / 2 + 0.6], floorY: -0.55 };
}

// ===========================================================================
// LEVEL 6: CMOS cell layout derived from the transistor netlist (units: µm, 0.5 µm design rules approx.)
// ===========================================================================
export function transistorOn(c, engine) {
  if (typeof c.conducting === 'boolean') return c.conducting;
  const g = engine?.pinValue(c.id, 'g') ?? c.inputs?.g;
  return c.type === 'PMOS' ? g === 0 : g === 1;
}

export function buildCmosScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const net = (id, pin) => { const n = engine.netIndexOf(id, pin); return n < 0 ? `u:${id}:${pin}` : n; };
  const members = new Map();
  for (const c of comps) {
    for (const p of new Set([...Object.keys(c.inputs || {}), ...Object.keys(c.outputs || {})])) {
      const n = net(c.id, p);
      if (!members.has(n)) members.set(n, []);
      members.get(n).push({ c, pin: p });
    }
  }
  const vddC = comps.find((c) => c.type === 'VDD'), gndC = comps.find((c) => c.type === 'GND');
  const VDDN = vddC ? net(vddC.id, 'out') : 'vdd', GNDN = gndC ? net(gndC.id, 'out') : 'gnd';
  const trans = comps.filter((c) => c.type === 'PMOS' || c.type === 'NMOS').map((c) => ({ c, g: net(c.id, 'g'), s: net(c.id, 's'), d: net(c.id, 'd') }));

  // ---- poly columns: PMOS + NMOS sharing a gate net stand on one vertical poly line ----
  const byGate = new Map();
  for (const t of trans) {
    if (!byGate.has(t.g)) byGate.set(t.g, { P: [], N: [] });
    byGate.get(t.g)[t.c.type === 'PMOS' ? 'P' : 'N'].push(t);
  }
  let cols = [];
  for (const [g, { P, N }] of byGate) {
    const order = (a, b) => a.c.x - b.c.x || a.c.y - b.c.y;
    P.sort(order); N.sort(order);
    for (let i = 0; i < Math.max(P.length, N.length); i++) {
      const p = P[i] || null, n = N[i] || null;
      cols.push({ g, p, n, sx: ((p || n).c.x + (n || p).c.x) / 2 });
    }
  }
  // greedy order that maximises shared diffusion (fewer breaks = smaller cell, as a layout engineer would do)
  const terms = (t) => (t ? [t.s, t.d] : []);
  const shares = (a, b) => ['p', 'n'].reduce((k, row) => k + (a[row] && b[row] && terms(a[row]).some((x) => terms(b[row]).includes(x)) ? 1 : 0), 0);
  cols.sort((a, b) => a.sx - b.sx);
  const ordered = cols.length ? [cols.shift()] : [];
  while (cols.length) {
    const last = ordered[ordered.length - 1];
    let best = 0, bs = -1;
    cols.forEach((c, i) => { const s = shares(last, c); if (s > bs) { bs = s; best = i; } });
    ordered.push(cols.splice(best, 1)[0]);
  }
  cols = ordered;
  for (const row of ['p', 'n']) {
    let prevRight = null;
    cols.forEach((col, i) => {
      const t = col[row];
      if (!t) { prevRight = null; return; }
      let left = t.s, right = t.d;
      if (prevRight !== null && (t.s === prevRight || t.d === prevRight)) { left = prevRight; right = left === t.s ? t.d : t.s; }
      else {
        const nx = cols[i + 1]?.[row];
        if (nx && terms(nx).includes(t.s) && !terms(nx).includes(t.d)) { left = t.d; right = t.s; }
      }
      t.left = left; t.right = right; prevRight = right;
    });
  }
  const gapType = (a, b) => {
    if (!a || !b) return 'none';
    if (a.right !== b.left) return 'break';
    return (members.get(a.right)?.length || 0) > 2 ? 'contact' : 'series';
  };
  const GAP = { none: 2.1, break: 2.8, contact: 2.1, series: 1.3 };
  const LG = 0.5, END = 1.4, CS = 0.6, WP = 4.0, WN = 2.0;
  const xs = [0];
  for (let i = 0; i < cols.length - 1; i++) {
    const g = Math.max(GAP[gapType(cols[i].p, cols[i + 1].p)], GAP[gapType(cols[i].n, cols[i + 1].n)]);
    xs.push(xs[i] + LG + g);
  }
  const shift = cols.length ? (xs[xs.length - 1] + LG) / 2 : 0;
  for (let i = 0; i < xs.length; i++) xs[i] -= shift;

  // ---- S/D regions (contacted) per row ----
  const regions = []; // { row, x, net }
  const segs = []; // { row, x0, x1 }
  for (const row of ['p', 'n']) {
    let start = null;
    cols.forEach((col, i) => {
      const t = col[row];
      if (!t) return;
      if (start === null) { start = i; regions.push({ row, x: xs[i] - END / 2, net: t.left }); }
      const nt = cols[i + 1]?.[row];
      const gt = gapType(t, nt);
      if (gt === 'contact') regions.push({ row, x: xs[i] + LG + (xs[i + 1] - xs[i] - LG) / 2, net: t.right });
      if (gt !== 'contact' && gt !== 'series') {
        regions.push({ row, x: xs[i] + LG + END / 2, net: t.right });
        segs.push({ row, x0: xs[start] - END, x1: xs[i] + LG + END });
        start = null;
      }
    });
  }
  // ---- nets that need a horizontal M2 track in the middle of the cell ----
  const pts = new Map(); // net -> [{x, kind}]
  const addPt = (n, p) => { if (!pts.has(n)) pts.set(n, []); pts.get(n).push(p); };
  for (const r of regions) if (r.net !== VDDN && r.net !== GNDN) addPt(r.net, { x: r.x, kind: r.row });
  cols.forEach((col, i) => addPt(col.g, { x: xs[i] + LG / 2, kind: 'g', col }));
  const trackNets = [...pts.entries()].filter(([, l]) => new Set(l.map((p) => p.x.toFixed(2))).size > 1).map(([n]) => n);
  const MID = Math.max(4, trackNets.length * 1.6 + 1.2);
  const zP = -MID / 2 - WP / 2, zN = MID / 2 + WN / 2;
  const zV = -MID / 2 - WP - 2.2, zG = MID / 2 + WN + 2.2;
  const trackZ = new Map(trackNets.map((n, k) => [n, -MID / 2 + 1.0 + k * 1.6]));
  const rowZ = (row) => (row === 'p' ? zP : zN);
  const rowW = (row) => (row === 'p' ? WP : WN);

  // heights (µm): diffusion surface 0, poly 0.05-0.4, W contacts to 0.9, M1 0.9-1.5, via1, M2 2.3-2.9
  const H = { diff: 0.03, polyB: 0.04, polyT: 0.4, m1B: 0.9, m1T: 1.5, m2B: 2.3, m2T: 2.9 };
  const xMin = (xs[0] ?? 0) - END - 3.2, xMax = (xs[xs.length - 1] ?? 0) + LG + END + 1.5;
  const nMats = new Map();
  const matFor = (n, poly = false) => {
    const key = n === VDDN || n === GNDN ? 'rail' : `${poly ? 'p' : 'm'}:${n}`;
    if (!nMats.has(key) && key === 'rail') nMats.set(key, PM.al()); // supply rails are not signals: no glow
    if (!nMats.has(key)) {
      if (poly) { nMats.set(key, PM.poly()); return nMats.get(key); } // poly stays poly: amber on it = conducting channel only
      const m = netMat();
      const mem = members.get(n)?.[0];
      if (mem) ctx.addSignal(m, mem.c.id, mem.pin);
      nMats.set(key, m);
    }
    return nMats.get(key);
  };

  // substrate, n-well, rails with well / substrate taps
  const sub = new THREE.Mesh(new THREE.BoxGeometry(xMax - xMin + 2, 1.2, zG - zV + 6), PM.psub());
  sub.position.set((xMin + xMax) / 2, -0.6, (zV + zG) / 2);
  sub.receiveShadow = true;
  group.add(sub);
  group.add(meshOf([boxGeo(xMin + 0.3, xMax - 0.3, 0, 0.01, zV - 1.6, -MID / 2 + 1.4)], PM.nwell()));
  const rail = (comp, z, n, tapMat) => {
    const g = new THREE.Group();
    const m = matFor(n);
    g.add(meshOf([boxGeo(xMin, xMax, H.m1B, H.m1T, z - 0.9, z + 0.9)], m));
    const tx = xMin + 1.2; // tap: heavily doped contact to the well / substrate under the rail
    g.add(meshOf([boxGeo(tx - 0.8, tx + 0.8, 0, H.diff, z - 0.8, z + 0.8)], tapMat));
    g.add(meshOf([boxGeo(tx - CS / 2, tx + CS / 2, H.diff, H.m1B, z - CS / 2, z + CS / 2)], PM.tungsten()));
    if (comp) ctx.addComp(comp, g, { label: new THREE.Vector3(xMin + 2.5, H.m1T + 0.6, z) });
    else group.add(g);
  };
  rail(vddC, zV, VDDN, PM.nplus());
  rail(gndC, zG, GNDN, PM.pplus());

  // diffusion
  const diffP = [], diffN = [];
  for (const s of segs) (s.row === 'p' ? diffP : diffN).push(boxGeo(s.x0, s.x1, 0, H.diff, rowZ(s.row) - rowW(s.row) / 2, rowZ(s.row) + rowW(s.row) / 2));
  const dp = meshOf(diffP, PM.pplus()); if (dp) group.add(dp);
  const dn = meshOf(diffN, PM.nplus()); if (dn) group.add(dn);

  // contacts + M1 on every region
  const W_ = PM.tungsten();
  const contacts = [];
  for (const r of regions) {
    const z0 = rowZ(r.row), w = rowW(r.row);
    const nC = Math.max(1, Math.floor(w / 1.4));
    for (let k = 0; k < nC; k++) {
      const z = z0 - w / 2 + (w * (k + 0.5)) / nC;
      contacts.push(boxGeo(r.x - CS / 2, r.x + CS / 2, H.diff, H.m1B, z - CS / 2, z + CS / 2));
    }
    const m = matFor(r.net);
    const geos = [boxGeo(r.x - 0.5, r.x + 0.5, H.m1B, H.m1T, z0 - w / 2 + 0.2, z0 + w / 2 - 0.2)];
    if (r.net === VDDN) geos.push(boxGeo(r.x - 0.5, r.x + 0.5, H.m1B, H.m1T, zV, z0));
    else if (r.net === GNDN) geos.push(boxGeo(r.x - 0.5, r.x + 0.5, H.m1B, H.m1T, z0, zG));
    else if (trackZ.has(r.net)) {
      const tz = trackZ.get(r.net);
      geos.push(boxGeo(r.x - 0.4, r.x + 0.4, H.m1B, H.m1T, Math.min(z0, tz), Math.max(z0, tz)));
      geos.push(boxGeo(r.x - 0.3, r.x + 0.3, H.m1T, H.m2B, tz - 0.3, tz + 0.3)); // via1
    }
    group.add(meshOf(geos, m));
  }
  // nets whose points all lie on one x (e.g. inverter output): one vertical M1 bar P <-> N
  for (const [n, l] of pts) {
    if (trackZ.has(n)) continue;
    const rows = l.filter((p) => p.kind !== 'g');
    if (rows.length > 1) group.add(meshOf([boxGeo(rows[0].x - 0.4, rows[0].x + 0.4, H.m1B, H.m1T, zP, zN)], matFor(n)));
  }
  group.add(meshOf(contacts, W_));
  // M2 tracks
  for (const [n, tz] of trackZ) {
    const l = pts.get(n);
    const a = Math.min(...l.map((p) => p.x)) - 0.4, b = Math.max(...l.map((p) => p.x)) + 0.4;
    group.add(meshOf([boxGeo(a, b, H.m2B, H.m2T, tz - 0.45, tz + 0.45)], matFor(n)));
  }

  // transistors (pickable): poly finger + inversion channel that lights up while the device conducts
  cols.forEach((col, i) => {
    const x = xs[i];
    const polyM = matFor(col.g, true);
    const contactZ = trackZ.has(col.g) ? trackZ.get(col.g) : 0;
    const zs = [contactZ];
    for (const row of ['p', 'n']) if (col[row]) zs.push(rowZ(row) - rowW(row) / 2 - 0.6, rowZ(row) + rowW(row) / 2 + 0.6);
    const zLo = Math.min(...zs), zHi = Math.max(...zs);
    group.add(meshOf([boxGeo(x, x + LG, H.polyB, H.polyT, zLo, zHi)], polyM)); // poly line between the devices
    // poly contact (input of the gate)
    group.add(meshOf([boxGeo(x - 0.35, x + LG + 0.35, H.polyB, H.polyT, contactZ - 0.6, contactZ + 0.6)], polyM));
    group.add(meshOf([boxGeo(x + LG / 2 - CS / 2, x + LG / 2 + CS / 2, H.polyT, H.m1B, contactZ - CS / 2, contactZ + CS / 2)], W_));
    const pc = [boxGeo(x - 0.25, x + LG + 0.25, H.m1B, H.m1T, contactZ - 0.5, contactZ + 0.5)];
    if (trackZ.has(col.g)) pc.push(boxGeo(x - 0.05, x + LG + 0.05, H.m1T, H.m2B, contactZ - 0.3, contactZ + 0.3));
    group.add(meshOf(pc, matFor(col.g)));
    for (const row of ['p', 'n']) {
      const t = col[row];
      if (!t) continue;
      const z0 = rowZ(row), w = rowW(row);
      const g = new THREE.Group();
      g.add(meshOf([boxGeo(x, x + LG, H.polyB, H.polyT + 0.01, z0 - w / 2 - 0.6, z0 + w / 2 + 0.6)], polyM));
      const ch = glowMat();
      // the inversion layer lies under the poly; drawn as a glowing sleeve around the gate so it stays visible
      g.add(meshOf([boxGeo(x - 0.22, x + LG + 0.22, H.diff, H.polyT + 0.05, z0 - w / 2, z0 + w / 2)], ch));
      ctx.onFrame(() => { const on = transistorOn(t.c, engine); ch.opacity = on ? 0.6 : 0; ch.emissiveIntensity = on ? 1.6 : 0; });
      ctx.addComp(t.c, g, { label: new THREE.Vector3(x + LG / 2, 2.2, row === 'p' ? z0 - w / 2 - 1 : z0 + w / 2 + 1) });
    }
  });

  // pins: INPUT on its gate net, PROBE on the output node (M2 pin squares)
  const placedPins = new Set();
  for (const c of comps) {
    if (!PORT_TYPES.has(c.type) && c.type !== 'CONSTANT') continue;
    const n = net(c.id, c.type === 'PROBE' ? 'in' : 'out');
    const l = pts.get(n);
    let x, z;
    if (l && trackZ.has(n)) { z = trackZ.get(n); x = c.type === 'PROBE' ? Math.max(...l.map((p) => p.x)) + 1.4 : Math.min(...l.map((p) => p.x)) - 1.4; }
    else if (l) { x = l[0].x; z = l[0].kind === 'g' ? 0 : (zP + zN) / 2; }
    else { x = xMax + 1 + placedPins.size * 1.6; z = 0; }
    const key = `${x.toFixed(1)}:${z.toFixed(1)}`;
    if (placedPins.has(key)) z += 1.6;
    placedPins.add(key);
    const g = new THREE.Group();
    const geos = [boxGeo(x - 0.7, x + 0.7, H.m2B, H.m2T + 0.02, z - 0.7, z + 0.7)];
    if (l && trackZ.has(n)) geos.push(boxGeo(Math.min(x, ...l.map((p) => p.x)), Math.max(x, ...l.map((p) => p.x)), H.m2B, H.m2T, z - 0.45, z + 0.45));
    else geos.push(boxGeo(x - 0.3, x + 0.3, H.m1T, H.m2B, z - 0.3, z + 0.3), boxGeo(x - 0.5, x + 0.5, H.m1B, H.m1T, z - 0.5, z + 0.5));
    g.add(meshOf(geos, matFor(n)));
    ctx.addComp(c, g, { label: new THREE.Vector3(x, H.m2T + 1.2, z) });
  }
  // any other part (should not occur on this level): a labelled marker beside the cell, never stacked
  let extra = 0;
  for (const c of comps) {
    if (PORT_TYPES.has(c.type) || ['CONSTANT', 'VDD', 'GND', 'PMOS', 'NMOS'].includes(c.type)) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1), PM.al());
    m.position.set(xMax + 2, 0.2, zV + 2 + extra++ * 2);
    ctx.addComp(c, m, { label: m.position.clone().add(new THREE.Vector3(0, 1, 0)) });
  }

  scaleBar(group, { x: xMin, y: 0.1, z: zG + 2.6, length: 5, label: '5 µm', size: 2.2 });
  const span = Math.max(xMax - xMin, zG - zV);
  return { camera: [span * 0.12, span * 1.05 + 5, span * 0.95 + 7], target: [0, 0, (zV + zG) / 2 + 1], floorY: -1.25 };
}

// ===========================================================================
// LEVEL 7: cross-section of one 0.5 µm MOSFET (units: µm, true scale incl. the 10 nm gate oxide)
// ===========================================================================
export function buildMosfetScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const tr = comps.find((c) => c.type === 'NMOS' || c.type === 'PMOS');
  const nCh = tr ? tr.type === 'NMOS' : !/pmos/i.test(ctx.entry?.key || '');
  const pick = (re) => comps.find((c) => re.test(c.id));
  const cGate = comps.find((c) => c.type === 'INPUT') || pick(/gate_voltage/);
  const cSrc = comps.find((c) => c.type === 'VDD' || c.type === 'GND');
  const cDrain = comps.find((c) => c.type === 'PROBE');
  const L = {
    ox: pick(/oxide/), poly: pick(/poly/), ldd: pick(/ldd|spacer/), sd: pick(/^sd_|diffusion/), bulk: pick(/bulk|well|psub/),
    locos: pick(/locos|isolation/), metal: pick(/metal/),
  };

  const XA = 1.75, XL = 3.6, ZF = 1.3, ZA = -1.1, ZB = -3.0; // active |x| < XA, z in [ZA, ZF]; field beyond
  const LOX_T = 0.28, LOX_B = -0.22; // 0.5 µm LOCOS: ~56 % above, ~44 % below the original Si surface
  const f = (u) => 0.5 * (1 + Math.tanh(u / 0.13)); // bird's-beak profile, u = distance into the field
  const surf = (x) => LOX_B * f(Math.abs(x) - XA);
  const SUBD = nCh ? 1.6 : 2.6, WELL = 2.0, TOX = 0.01, POLY_T = 0.35, LG = 0.5, SPW = 0.16, XJ = 0.25, XLDD = 0.09;
  const ILD = 1.15, M1 = [1.15, 1.75], M2 = [2.55, 3.15], M3 = [3.95, 4.85];

  // ---- bulk: Si recessed under the LOCOS (+ p-substrate below an n-well for PMOS) ----
  const bottom = nCh ? -SUBD : -WELL;
  const subPts = [[-XL, bottom], [XL, bottom]];
  for (let k = 0; k <= 120; k++) { const x = XL - (2 * XL * k) / 120; subPts.push([x, surf(x)]); }
  const subZPts = [[ZB, bottom], [ZA + 0.35, bottom]];
  for (let k = 0; k <= 40; k++) { const z = ZA + 0.35 - ((ZA + 0.35 - ZB) * k) / 40; subZPts.push([z, LOX_B * f(ZA - z)]); }
  const bulkMat = nCh ? PM.psub() : PM.nwell();
  const bulkG = new THREE.Group();
  bulkG.add(new THREE.Mesh(extrudeAlongZ(subPts, ZA + 0.35, ZF), bulkMat));
  bulkG.add(new THREE.Mesh(extrudeAlongX(subZPts, -XL, XL), bulkMat));
  if (!nCh) {
    const ps = new THREE.Mesh(boxGeo(-XL, XL, -SUBD, -WELL, ZB, ZF), PM.psub());
    group.add(ps);
    const t = textPlane('p-substrát', 1.6, { color: '#a9a6a0' });
    t.position.set(-XL + 1.0, -WELL - 0.3, ZF + 0.02);
    group.add(t);
  }

  // ---- LOCOS field oxide with bird's beaks ----
  const locosG = new THREE.Group();
  const oxMat = PM.oxide(0.6);
  for (const sg of [1, -1]) {
    const pts = [];
    const n = 50, u0 = -0.4, u1 = XL - XA;
    for (let k = 0; k <= n; k++) { const u = u0 + ((u1 - u0) * k) / n; pts.push([sg * (XA + u), LOX_T * f(u)]); }
    for (let k = n; k >= 0; k--) { const u = u0 + ((u1 - u0) * k) / n; pts.push([sg * (XA + u), LOX_B * f(u)]); }
    locosG.add(new THREE.Mesh(extrudeAlongZ(pts, ZB, ZF + 0.002), oxMat));
  }
  {
    const pts = [];
    const n = 40, u0 = -0.4, u1 = ZA - ZB;
    for (let k = 0; k <= n; k++) { const u = u0 + ((u1 - u0) * k) / n; pts.push([ZA - u, LOX_T * f(u)]); }
    for (let k = n; k >= 0; k--) { const u = u0 + ((u1 - u0) * k) / n; pts.push([ZA - u, LOX_B * f(u)]); }
    locosG.add(new THREE.Mesh(extrudeAlongX(pts, -XA - 0.25, XA + 0.25), oxMat));
  }

  // ---- source / drain (N+ or P+) with rounded junctions, LDD extensions under the spacers ----
  const sdMat = nCh ? PM.nplus() : PM.pplus(), lddMat = nCh ? PM.nminus() : PM.pminus();
  const junction = (xi, xo, depth, R, follow) => {
    const pts = [];
    for (let k = 0; k <= 16; k++) { const x = xi + ((xo - xi) * k) / 16; pts.push([x, (follow ? surf(x) : 0) + 0.004]); }
    pts.push([xo, (follow ? surf(xo) : 0) - depth]);
    for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 - (Math.PI / 2) * (k / 8); pts.push([xi + R + R * Math.cos(a), -depth + R + R * Math.sin(a)]); }
    return pts;
  };
  const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
  const sdPts = junction(LG / 2 + SPW - 0.07, XA - 0.05, XJ, 0.17, true);
  const lddPts = junction(LG / 2 - 0.05, LG / 2 + SPW + 0.05, XLDD, 0.06, false);
  const sdG = new THREE.Group();
  for (const p of [sdPts, mirror(sdPts)]) sdG.add(new THREE.Mesh(extrudeAlongZ(p, ZA, ZF + 0.004), sdMat));
  const lddG = new THREE.Group();
  for (const p of [lddPts, mirror(lddPts)]) lddG.add(new THREE.Mesh(extrudeAlongZ(p, ZA + 0.05, ZF + 0.006), lddMat));

  // ---- gate stack: 10 nm oxide, poly N+ (climbs onto the LOCOS behind the active area), oxide spacers ----
  const oxG = new THREE.Group();
  oxG.add(new THREE.Mesh(boxGeo(-LG / 2, LG / 2, 0, TOX, ZA + 0.05, ZF + 0.01), std(0xf4f1ea, { emissive: 0xf4f1ea, emissiveIntensity: 0.55, roughness: 0.1 })));
  oxG.add(new THREE.Mesh(boxGeo(-0.6, 0.6, -0.035, 0.045, ZF, ZF + 0.3), proxyMat()));
  const polyPts = [];
  const zp0 = ZF + 0.01, zp1 = ZB + 0.4;
  for (let k = 0; k <= 40; k++) { const z = zp0 + ((zp1 - zp0) * k) / 40; polyPts.push([z, TOX + LOX_T * f(ZA - z) + POLY_T]); }
  for (let k = 40; k >= 0; k--) { const z = zp0 + ((zp1 - zp0) * k) / 40; polyPts.push([z, TOX + LOX_T * f(ZA - z)]); }
  const gateM = PM.poly();
  const polyG = new THREE.Group();
  polyG.add(new THREE.Mesh(extrudeAlongX(polyPts, -LG / 2, LG / 2), gateM));
  const spPts = [[LG / 2, TOX]];
  for (let k = 0; k <= 10; k++) { const a = (Math.PI / 2) * (k / 10); spPts.push([LG / 2 + SPW * Math.cos(a), TOX + POLY_T * Math.sin(a)]); }
  const spMat = PM.oxide(0.8);
  for (const p of [spPts, mirror(spPts)]) lddG.add(new THREE.Mesh(extrudeAlongZ(p, ZA + 0.3, ZF + 0.006), spMat));

  // ---- inversion channel + carriers (animated from the transistor state) ----
  const chMat = glowMat();
  const chG = new THREE.Group();
  chG.add(new THREE.Mesh(boxGeo(-LG / 2 + 0.03, LG / 2 - 0.03, -0.016, 0, ZA + 0.1, ZF + 0.008), chMat));
  chG.add(new THREE.Mesh(boxGeo(-0.32, 0.32, -0.13, -0.035, ZF, ZF + 0.3), proxyMat()));
  const NC = 80;
  const carrierMat = nCh ? std(AMBER, { emissive: AMBER, emissiveIntensity: 1.4 }) : std(0xf2efe8, { emissive: 0xf2efe8, emissiveIntensity: 0.9 });
  const carriers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 10, 8), carrierMat, NC);
  const cr = rng(7);
  const cState = Array.from({ length: NC }, () => ({ ph: cr(), z: ZA + 0.2 + cr() * (ZF - ZA - 0.25), sp: 0.6 + cr() * 0.6, sd: cr() < 0.5 ? -1 : 1, dx: cr(), dy: cr() }));
  group.add(carriers);
  const conducting = () => (tr ? transistorOn(tr, engine) : false);
  let last = 0;
  const _m = new THREE.Matrix4();
  ctx.onFrame((time) => {
    const dt = Math.min(0.05, (time - (last || time)) / 1000);
    last = time;
    const on = conducting();
    chMat.opacity = on ? 0.95 : 0;
    chMat.emissiveIntensity = on ? 1.8 : 0;
    cState.forEach((s, i) => {
      let x, y;
      if (on) { // drift source -> drain inside the ~10 nm inversion layer
        s.ph = (s.ph + dt * s.sp * 0.35) % 1;
        x = (nCh ? -1 : 1) * (1.2 - 2.4 * s.ph);
        y = Math.abs(x) < LG / 2 + 0.1 ? -0.008 : -0.03 - 0.12 * Math.min(1, (Math.abs(x) - LG / 2) * 1.5);
      } else { // majority carriers jiggle inside the source / drain only
        s.ph += dt;
        x = s.sd * (0.55 + s.dx * 1.0 + Math.sin(s.ph * 2.3 + s.z * 5) * 0.08);
        y = -0.03 - s.dy * 0.17 + Math.cos(s.ph * 1.7 + s.z) * 0.02;
      }
      carriers.setMatrixAt(i, _m.makeTranslation(x, y, s.z));
    });
    carriers.instanceMatrix.needsUpdate = true;
  });

  // ---- dielectrics (not pickable: they would hide everything behind them) ----
  for (const [y0, y1, o] of [[0.0, ILD, 0.06], [M1[1], M2[0], 0.05], [M2[1], M3[0], 0.05]]) {
    group.add(new THREE.Mesh(boxGeo(-XL, XL, y0, y1, ZB, ZF), PM.oxide(o)));
  }

  // ---- W contacts, 3× Al, vias ----
  const W_ = PM.tungsten(), Al = PM.al();
  const gateMat = netMat(), srcMat = netMat(), drainMat = netMat();
  if (cGate) ctx.addSignal(gateMat, cGate.id, 'out');
  if (cSrc) ctx.addSignal(srcMat, cSrc.id, 'out');
  if (cDrain) ctx.addSignal(drainMat, cDrain.id, 'in');
  const polyFieldTop = TOX + LOX_T + POLY_T;
  const gateG = new THREE.Group();
  gateG.add(new THREE.Mesh(boxGeo(-0.3, 0.3, polyFieldTop - 0.02, ILD, ZB + 0.6, ZB + 1.2), W_));
  gateG.add(new THREE.Mesh(boxGeo(-XL, 0.45, M1[0], M1[1], ZB + 0.4, ZB + 1.4), gateMat));
  const srcG = new THREE.Group();
  srcG.add(new THREE.Mesh(boxGeo(-1.4, -0.8, 0, ILD, ZF - 0.6, ZF + 0.004), W_));
  srcG.add(new THREE.Mesh(boxGeo(-1.55, -0.65, M1[0], M1[1], ZB + 1.7, ZF + 0.004), srcMat));
  const drainG = new THREE.Group();
  drainG.add(new THREE.Mesh(boxGeo(0.8, 1.4, 0, ILD, ZF - 0.6, ZF + 0.004), W_));
  drainG.add(new THREE.Mesh(boxGeo(0.65, 1.55, M1[0], M1[1], ZB + 1.7, ZF + 0.004), drainMat));
  drainG.add(new THREE.Mesh(boxGeo(0.8, 1.4, M1[1], M2[0], ZF - 0.6, ZF + 0.004), drainMat)); // via1
  drainG.add(new THREE.Mesh(boxGeo(0.65, XL, M2[0], M2[1], ZF - 0.8, ZF + 0.004), drainMat)); // M2
  drainG.add(new THREE.Mesh(boxGeo(2.7, 3.3, M2[1], M3[0], ZF - 0.6, ZF + 0.004), drainMat)); // via2
  drainG.add(new THREE.Mesh(boxGeo(2.4, 3.5, M3[0], M3[1], ZB, ZF + 0.004), drainMat)); // M3
  const metalG = new THREE.Group(); // other wiring of the cell crossing this section
  metalG.add(new THREE.Mesh(boxGeo(-2.9, -2.1, M2[0], M2[1], ZB, ZF + 0.004), Al));
  metalG.add(new THREE.Mesh(boxGeo(-3.4, -1.4, M3[0], M3[1], ZB, ZF + 0.004), Al));

  // ---- components -> physical parts ----
  const front = (x, y) => new THREE.Vector3(x, y, ZF + 0.2);
  const attach = (comp, obj, label) => { if (comp) ctx.addComp(comp, obj, { label }); else group.add(obj); };
  attach(L.bulk, bulkG, front(-2.6, nCh ? -1.6 : -1.2));
  attach(L.locos, locosG, front(-2.9, 0.55));
  attach(L.sd, sdG, front(1.2, -0.55));
  attach(L.ldd, lddG, front(-0.95, 0.75));
  attach(L.poly, polyG, front(0, 0.85));
  attach(L.ox, oxG, front(0.9, 0.12));
  attach(tr, chG, front(0, -0.45));
  attach(cGate, gateG, new THREE.Vector3(-2.4, M1[1] + 0.4, ZB + 0.9));
  attach(cSrc, srcG, front(-1.1, M1[1] + 0.35));
  attach(cDrain, drainG, front(1.8, M2[1] + 0.35));
  attach(L.metal, metalG, front(-2.4, M3[1] + 0.35));
  const known = new Set([tr, cGate, cSrc, cDrain, ...Object.values(L)].filter(Boolean));
  let extra = 0;
  for (const c of comps) {
    if (known.has(c)) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), PM.al());
    m.position.set(XL + 0.8, 4 - extra++ * 0.8, 0);
    ctx.addComp(c, m, { label: m.position.clone().add(new THREE.Vector3(0, 0.3, 0)) });
  }

  // ---- captions + scale ----
  for (const [text, y] of [['ILD (BPSG)', 0.75], ['M1 Al', M1[0] + 0.3], ['IMD', M1[1] + 0.4], ['M2 Al', M2[0] + 0.3], ['IMD', M2[1] + 0.4], ['M3 Al', M3[0] + 0.45]]) {
    const t = textPlane(text, 2.4, { color: '#a9a6a0' });
    t.position.set(XL + 1.25, y, ZF);
    group.add(t);
  }
  const lead = new THREE.Mesh(boxGeo(-0.006, 0.006, -0.62, 0, ZF + 0.012, ZF + 0.024), new THREE.MeshBasicMaterial({ color: 0xe9e6df }));
  group.add(lead);
  const tox = textPlane('t_ox = 10 nm (1:1)', 2.4);
  tox.position.set(-0.9, -0.78, ZF + 0.02);
  group.add(tox);
  scaleBar(group, { x: XL - 1.4, y: -SUBD - 0.35, z: ZF + 0.05, length: 1, label: '1 µm', size: 0.75 });
  return { camera: [2.6, 4.4, 15.6], target: [0.3, 2.0 - (SUBD - 1.6) / 2, 0], floorY: -SUBD - 0.6 };
}

// ===========================================================================
// LEVEL 8: Si(001) crystal under amorphous SiO2 (units: Å)
// ===========================================================================
function bandDiagramTexture() {
  const W = 512, H = 640;
  const cvs = document.createElement('canvas');
  cvs.width = W;
  cvs.height = H;
  const c = cvs.getContext('2d');
  c.fillStyle = 'rgba(1,1,2,0.88)';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(113,117,121,0.6)';
  c.lineWidth = 2;
  c.strokeRect(1, 1, W - 2, H - 2);
  c.font = 'bold 26px "JetBrains Mono", monospace';
  c.fillStyle = OFF_WHITE;
  c.fillText('PÁSOVÝ DIAGRAM  Si | SiO₂', 20, 40);
  const ev = 42; // px per eV
  const ecSi = 300, evSi = ecSi + 1.12 * ev, ecOx = ecSi - 3.1 * ev, evOx = ecOx + 9 * ev, xi = 220;
  c.strokeStyle = OFF_WHITE;
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(30, ecSi); c.lineTo(xi, ecSi); c.lineTo(xi, ecOx); c.lineTo(W - 30, ecOx); c.stroke();
  c.beginPath(); c.moveTo(30, evSi); c.lineTo(xi, evSi); c.lineTo(xi, evOx); c.lineTo(W - 30, evOx); c.stroke();
  c.setLineDash([6, 6]);
  c.strokeStyle = 'rgba(233,230,223,0.5)';
  c.beginPath(); c.moveTo(xi, 60); c.lineTo(xi, H - 40); c.stroke();
  c.setLineDash([]);
  c.font = 'bold 21px "JetBrains Mono", monospace';
  c.fillStyle = OFF_WHITE;
  c.fillText('E_C', 34, ecSi - 10);
  c.fillText('E_V', 34, evSi + 24);
  c.fillText('Si: Eg 1,12 eV', 34, evSi + 56);
  c.fillText('SiO₂: Eg ≈ 9 eV', xi + 20, evOx - 14);
  c.fillText('ΔE_C ≈ 3,1 eV', xi + 20, (ecSi + ecOx) / 2 + 6);
  c.strokeStyle = '#FFA909';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(xi + 12, ecSi); c.lineTo(xi + 12, ecOx); c.stroke();
  c.fillStyle = '#FFA909';
  for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(96 + i * 24, ecSi - 10, 6, 0, Math.PI * 2); c.fill(); }
  c.fillText('e⁻ se odrazí', 30, ecSi - 40);
  c.fillStyle = 'rgba(173,170,167,0.9)';
  c.fillText('krystal Si', 40, H - 52);
  c.fillText('amorfní SiO₂', xi + 30, H - 52);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildAtomScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const pick = (re) => comps.find((c) => re.test(c.id));
  const A = 5.431, BOND = (A * Math.sqrt(3)) / 4; // Si–Si 2.352 Å
  const SIO = 1.61, AC = (4 * 3.06) / Math.sqrt(3); // cristobalite-like Si–Si 3.06 Å -> Si–O–Si ≈ 144°
  const nx = 4, ny = 2, nz = 3;
  const W = nx * A, D = nz * A;
  const fcc = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];

  // ---- diamond-cubic Si: FCC lattice + basis (0,0,0), (¼,¼,¼); (001) surface on top ----
  const si = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    for (const [sub, off] of [[0, 0], [1, 0.25]]) {
      for (const [bx, by, bz] of fcc) si.push({ p: new THREE.Vector3((i + bx + off - nx / 2) * A, (j + by + off - ny) * A, (k + bz + off - nz / 2) * A), sub });
    }
  }
  const topY = Math.max(...si.map((a) => a.p.y));
  for (const a of si) a.p.y -= topY;
  const siBonds = [];
  for (let i = 0; i < si.length; i++) for (let j = i + 1; j < si.length; j++) {
    if (Math.abs(si[i].p.distanceTo(si[j].p) - BOND) < 0.05) siBonds.push([si[i].p, si[j].p]);
  }

  // ---- amorphous SiO2: continuous random network from a distorted cristobalite network ----
  const r = rng(1234);
  const gauss = () => (r() + r() + r() - 1.5) * 0.45;
  const rot = new THREE.Matrix4().makeRotationY(0.41);
  const ox = [];
  const OX_Y0 = 2.3, OX_Y1 = 12.5;
  for (let i = -3; i <= 3; i++) for (let j = 0; j <= 2; j++) for (let k = -3; k <= 3; k++) {
    for (const off of [0, 0.25]) for (const [bx, by, bz] of fcc) {
      const p = new THREE.Vector3((i + bx + off) * AC, OX_Y0 + (j + by + off) * AC, (k + bz + off) * AC);
      p.applyMatrix4(rot);
      if (Math.abs(p.x) < W / 2 && Math.abs(p.z) < D / 2 && p.y >= OX_Y0 && p.y < OX_Y1) ox.push({ ideal: p.clone(), p, n: 0 });
    }
  }
  const ideal = (a, b) => Math.abs(a.ideal.distanceTo(b.ideal) - 3.06) < 0.06;
  for (const a of ox) a.p.add(new THREE.Vector3(gauss(), gauss(), gauss()));
  const oxygens = [], oxBonds = [];
  const bridge = (p, q) => {
    const d = p.distanceTo(q);
    const mid = p.clone().add(q).multiplyScalar(0.5);
    const axis = q.clone().sub(p).normalize();
    const perp = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).cross(axis).normalize();
    const o = mid.addScaledVector(perp, Math.sqrt(Math.max(0, SIO * SIO - (d / 2) ** 2)));
    oxygens.push(o);
    oxBonds.push([p, o], [o, q]);
    return o;
  };
  const oxPairs = [];
  for (let i = 0; i < ox.length; i++) for (let j = i + 1; j < ox.length; j++) {
    if (ideal(ox[i], ox[j])) { bridge(ox[i].p, ox[j].p); ox[i].n++; ox[j].n++; oxPairs.push([i, j]); }
  }
  // ---- interface: the two upward bonds of every top Si end on an O that bridges to the oxide (or dangle) ----
  const UP = [[[1, 1, 1], [-1, 1, -1]], [[1, 1, -1], [-1, 1, 1]]];
  const ifBonds = [], ifO = [];
  for (const a of si.filter((s) => s.p.y > -0.1)) {
    for (const dir of UP[a.sub]) {
      const o = a.p.clone().addScaledVector(new THREE.Vector3(...dir).normalize(), SIO);
      let best = null, bd = Infinity;
      for (const b of ox) { const d = b.p.distanceTo(o); if (d < bd && b.n < 4) { bd = d; best = b; } }
      if (best && bd < 2.1) { ifO.push(o); ifBonds.push([a.p, o], [o, best.p]); best.n++; }
    }
  }

  // ---- render (ball & stick, scaled radii) ----
  const sphere = new THREE.SphereGeometry(1, 20, 14), stick = new THREE.CylinderGeometry(1, 1, 1, 8);
  const siMat = std(0x9aa0a8, { metalness: 0.55, roughness: 0.3 }), oMat = std(0xe9e6df, { roughness: 0.35 });
  const bondMat = std(0x6d7178, { metalness: 0.4, roughness: 0.4 });
  const crystal = new THREE.Group();
  crystal.add(instanced(sphere, siMat, si.map(({ p }) => mat4(p.x, p.y, p.z, 0, 0.5, 0.5, 0.5))));
  crystal.add(instanced(stick, bondMat, siBonds.map(([p, q]) => cylinderMatrix(p, q, 0.11))));
  const oxSi = instanced(sphere, std(0x8a8f96, { metalness: 0.5, roughness: 0.32 }), ox.map(({ p }) => mat4(p.x, p.y, p.z, 0, 0.46, 0.46, 0.46)));
  group.add(oxSi);
  group.add(instanced(stick, bondMat, [...oxBonds, ...ifBonds].map(([p, q]) => cylinderMatrix(p, q, 0.085))));
  const oAtoms = instanced(sphere, oMat, [...oxygens, ...ifO].map((p) => mat4(p.x, p.y, p.z, 0, 0.34, 0.34, 0.34)));

  // one complete SiO4 tetrahedron (Si with 4 bridging O) near the centre of the oxide
  const tetraG = new THREE.Group();
  const four = ox.map((a, i) => ({ a, i, os: oxBonds.filter(([p, q]) => p === a.p || q === a.p).map(([p, q]) => (p === a.p ? q : p)) }))
    .filter((t) => t.os.length === 4)
    .sort((t, u) => t.a.p.distanceTo(new THREE.Vector3(0, 6, 0)) - u.a.p.distanceTo(new THREE.Vector3(0, 6, 0)))[0];
  if (four) {
    const [a, b, cc, d] = four.os;
    const geo = new THREE.BufferGeometry().setFromPoints([a, b, cc, a, cc, d, a, d, b, b, d, cc]);
    geo.computeVertexNormals();
    tetraG.add(new THREE.Mesh(geo, std(AMBER, { transparent: true, opacity: 0.38, emissive: AMBER, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
    tetraG.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: AMBER })));
  }

  // interface outline (not pickable)
  const yI = 0.93;
  const frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => new THREE.Vector3((x * W) / 2 + x * 0.6, yI, (z * D) / 2 + z * 0.6))), new THREE.LineBasicMaterial({ color: 0xe9e6df, transparent: true, opacity: 0.5 }));
  group.add(frame);

  // band diagram of the interface barrier
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(11, 13.75), new THREE.MeshBasicMaterial({ map: bandDiagramTexture(), transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  panel.position.set(W / 2 + 7.5, 1.5, -1);
  panel.rotation.y = -0.35;

  // electrons in Si bouncing off the barrier (no tunnelling through 10 nm of oxide)
  const tunnelG = new THREE.Group();
  const NE = 8;
  const eMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 12, 10), std(AMBER, { emissive: AMBER, emissiveIntensity: 1.3 }), NE);
  tunnelG.add(eMesh);
  const ex = -W / 2 - 2.2;
  tunnelG.add(new THREE.Mesh(boxGeo(ex - 1.2, ex + 1.2, -8, 1.2, -D / 2, D / 2), proxyMat()));
  const _m = new THREE.Matrix4();
  ctx.onFrame((time) => {
    const t = time / 1000;
    for (let i = 0; i < NE; i++) {
      const ph = (t * 0.35 + i / NE) % 1;
      const y = -8 + 8.6 * (1 - Math.abs(1 - 2 * ph)); // up to the interface and back
      eMesh.setMatrixAt(i, _m.makeTranslation(ex + Math.sin(i * 2.1) * 0.8, y, -D / 2 + ((i + 0.5) * D) / NE));
    }
    eMesh.instanceMatrix.needsUpdate = true;
  });

  // ---- components -> physical entities ----
  const attach = (comp, obj, label) => { if (comp) ctx.addComp(comp, obj, { label }); else group.add(obj); };
  attach(pick(/si_atom/), crystal, new THREE.Vector3(-W / 2 - 1, -5, D / 2 + 1));
  attach(pick(/o_atom/), oAtoms, new THREE.Vector3(W / 4, OX_Y1 + 1.2, D / 2));
  attach(pick(/si_o|bond|tetra/), tetraG, four ? four.a.p.clone().add(new THREE.Vector3(0, 3.2, 0)) : new THREE.Vector3(0, 8, 0));
  attach(pick(/barrier|band/), panel, new THREE.Vector3(W / 2 + 7.5, 8.6, -1));
  attach(pick(/tunnel/), tunnelG, new THREE.Vector3(ex, -9.2, D / 2));
  const used = new Set([/si_atom/, /o_atom/, /si_o|bond|tetra/, /barrier|band/, /tunnel/].map(pick).filter(Boolean));
  let extra = 0;
  for (const c of comps) {
    if (used.has(c)) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), oMat);
    m.position.set(-W / 2 - 6, 10 - extra++ * 2.5, 0);
    ctx.addComp(c, m, { label: m.position.clone().add(new THREE.Vector3(0, 1, 0)) });
  }

  const cap = textPlane('SiO₂ amorfní — výřez ≈ 1 nm z 10 nm oxidu', 13, { color: '#a9a6a0' });
  cap.position.set(0, OX_Y1 + 2.6, -D / 2);
  group.add(cap);
  const cap2 = textPlane('krystal Si (001)', 7, { color: '#a9a6a0' });
  cap2.position.set(W / 4, -ny * A - 1.4, D / 2 + 0.5);
  group.add(cap2);
  scaleBar(group, { x: -W / 2, y: -ny * A - 1.4, z: D / 2 + 0.5, length: A, label: 'a = 5,431 Å', size: 2.6 });
  return { camera: [12, 13, 52], target: [4, 3.2, 0], floorY: -ny * A - 3 };
}
