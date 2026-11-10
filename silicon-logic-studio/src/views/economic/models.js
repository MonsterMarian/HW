// 3D modely dílů "jak z obchodu" pro ECONOMIC view. Vše v MILIMETRECH, y = 0 je stůl,
// počátek = střed půdorysu. Parametrické modely berou rozměry přímo z kusovníku (item.dims),
// takže velikost ve 3D odpovídá skutečnému výrobku. Karty leží na stole plošným spojem dolů,
// délka karty je osa X, výška karty (od záslepky ke konektoru) osa Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { std, textTexture, instanced, mat4 } from '../physics/common.js';
import * as P from '../physics/packages.js';
import { buildRealPart } from '../physics/boardScene.js';

// ---------------------------------------------------------------- materiály a pomocníci
const M = {
  black: () => std(0x17181b, { roughness: 0.55 }),
  plastic: () => std(0x1d1e21, { roughness: 0.7 }),
  satin: () => std(0x2b2d31, { metalness: 0.6, roughness: 0.38 }),
  silver: () => std(0xc3c8ce, { metalness: 0.9, roughness: 0.3 }),
  steel: () => std(0xb9bfc6, { metalness: 0.9, roughness: 0.32 }),
  gold: () => std(0xe0b44c, { metalness: 1, roughness: 0.22 }),
  pcbGreen: () => std(0x14532d, { roughness: 0.45 }),
  pcbBlack: () => std(0x101113, { roughness: 0.45 }),
  hole: () => std(0x050505, { roughness: 1 }),
  chip: () => std(0x151618, { roughness: 0.6 }),
  white: () => std(0xe9e7e1, { roughness: 0.6 }),
};

function add(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** Kvádr se spodkem ve výšce y0. */
const slab = (g, w, h, d, mat, x = 0, y0 = 0, z = 0) => add(g, new THREE.BoxGeometry(w, h, d), mat, x, y0 + h / 2, z);
const rslab = (g, w, h, d, r, mat, x = 0, y0 = 0, z = 0) => add(g, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat, x, y0 + h / 2, z);

/** Obtisk (textura) na vodorovné ploše ve výšce y; w podél X, d podél Z. */
function decal(g, tex, w, d, x, y, z, opts = {}) {
  const m = add(g, new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, ...opts }), x, y + 0.02, z);
  m.rotation.x = -Math.PI / 2;
  return m;
}
/** Obtisk na svislé ploše čelem k +Z. */
function frontDecal(g, tex, w, h, x, y, z, opts = {}) {
  return add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, ...opts }), x, y, z + 0.02);
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const label = (lines, w, h, opts) => textTexture(lines, { w, h, bg: null, ...opts });

/** Perforovaná mřížka (čelo skříně, větrací otvory). */
const perforation = (cols, rows, bg = '#141518', dot = '#050506') => canvasTex(cols * 8, rows * 8, (c, w, h) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.fillStyle = dot;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { c.beginPath(); c.arc(x * 8 + 4 + (y % 2) * 2, y * 8 + 4, 2.4, 0, 7); c.fill(); }
});

/** Pozlacené kontakty hranového konektoru: n kontaktů s roztečí pitch od x0 podél X, na hraně z. */
function edgeFingers(g, x0, n, pitch, z, depth, y, keyAfter = -1) {
  const geo = new THREE.BoxGeometry(pitch * 0.7, 0.05, depth);
  const mats = [];
  for (let i = 0; i < n; i++) {
    const gap = keyAfter >= 0 && i >= keyAfter ? pitch * 2 : 0;
    mats.push(mat4(x0 + i * pitch + gap, y, z));
  }
  g.add(instanced(geo, M.gold(), mats));
}

/** Záslepka karty (ocelový plech) ležící karty: rovina YZ v x, délka podél Z od z0, výška slotu h. */
function bracket(g, x, z0, len, h, ports = []) {
  slab(g, 0.86, h, len, M.steel(), x, 0, z0 + len / 2);
  slab(g, 11, h, 0.86, M.steel(), x - 5.5, 0, z0); // ohnuté ouško se šroubem
  for (const p of ports) p(g, x);
}

/** Radiální/axiální ventilátor: rotor s lopatkami v rovině XZ, střed (x, y, z). */
function rotor(g, r, blades, y, x = 0, z = 0, mat = M.black()) {
  add(g, new THREE.CylinderGeometry(r * 0.38, r * 0.38, 2, 32), mat, x, y, z);
  const blade = new THREE.BoxGeometry(r * 0.62, 1, r * 0.34);
  blade.translate(r * 0.62, 0, 0);
  const mats = [];
  for (let i = 0; i < blades; i++) {
    const m = mat4(x, y - 0.4, z, (i / blades) * Math.PI * 2);
    m.multiply(new THREE.Matrix4().makeRotationX(0.45));
    mats.push(m);
  }
  g.add(instanced(blade, mat, mats));
}

// ---------------------------------------------------------------- PC díly
/** Dell Precision T5810: dims [hloubka, šířka, výška]; čelo směřuje k +Z. */
function tower([D, W, H]) {
  const g = new THREE.Group();
  const hh = 24, bh = H - hh; // integrovaná madla nahoře vpředu a vzadu
  rslab(g, W, bh - 8, D, 4, M.black(), 0, 8, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) slab(g, 22, 8, 40, M.plastic(), sx * (W / 2 - 16), 0, sz * (D / 2 - 30)); // nožičky
  for (const sz of [-1, 1]) {
    const z = sz * (D / 2 - 18);
    rslab(g, W - 6, hh, 36, 6, M.black(), 0, bh - 4, z);
    slab(g, W - 40, hh - 8, 22, M.hole(), 0, bh - 4, z - sz * 2); // otvor pro prsty
  }
  // čelo: perforovaný panel, logo, šachta 5,25", USB, vypínač
  const fz = D / 2;
  slab(g, W - 10, bh - 80, 4, std(0xffffff, { map: perforation(60, 120), roughness: 0.6 }), 0, 30, fz);
  slab(g, 148, 42, 3, M.satin(), 0, bh - 70, fz);
  const logo = label([{ text: 'DELL', font: 'bold 120px Arial, sans-serif', color: '#c9cdd2' }], 512, 256);
  add(g, new THREE.TorusGeometry(15, 1.4, 12, 48), M.silver(), 0, bh * 0.52, fz + 4.2);
  frontDecal(g, logo, 26, 13, 0, bh * 0.52, fz + 4.2);
  for (let i = 0; i < 4; i++) slab(g, 12.5, 5, 2, M.hole(), -W / 2 + 26 + i * 18, bh - 108, fz + 1.2);
  add(g, new THREE.CylinderGeometry(6, 6, 3, 24).rotateX(Math.PI / 2), M.silver(), W / 2 - 24, bh - 104, fz + 1.5);
  const side = label([{ text: 'PRECISION', font: '600 70px Arial, sans-serif', color: '#8d9197' }, { text: 'TOWER 5810', font: '600 46px Arial, sans-serif', color: '#6f7379' }], 512, 256);
  frontDecal(g, side, 60, 30, 0, 60, fz + 2);
  return g;
}

/** Tesla P100 PCIe: dims [délka, výška karty, tloušťka]; pasivní, bez video výstupů. */
function tesla([L, H, T]) {
  const g = new THREE.Group();
  const shroudD = H - 9; // hranový konektor zůstává volný
  slab(g, L, 1.5, H, M.black(), 0, 0, 0); // zadní plech
  slab(g, L, 1.6, H, M.pcbGreen(), 0, 1.5, 0);
  rslab(g, L - 2, T - 3.1, shroudD, 2, M.satin(), 0.5, 3.1, -4.5);
  // horní deska s nápisem, žebra chladiče na výdechu
  const tex = label([{ text: 'NVIDIA', font: 'bold 64px Arial, sans-serif', color: '#7a7d82' }, { text: 'TESLA P100', font: 'bold 120px Arial, sans-serif', color: '#d7dade' }], 1024, 384);
  slab(g, L * 0.55, 0.6, shroudD * 0.62, M.silver(), 10, T - 0.6, -4.5);
  decal(g, tex, L * 0.5, shroudD * 0.5, 10, T, -4.5);
  const fin = new THREE.BoxGeometry(0.8, T - 6, 1.2);
  const fins = [];
  for (let i = 0; i < 44; i++) fins.push(mat4(L / 2 + 0.1, 3.1 + (T - 6) / 2 + 1, -4.5 - shroudD / 2 + 3 + i * ((shroudD - 6) / 43)));
  g.add(instanced(fin, M.hole(), fins));
  // napájení 8 pin EPS na konci karty
  slab(g, 13, 9.6, 21.2, M.black(), L / 2 - 8, 3.1, H / 2 - 30);
  // PCIe x16: 82 kontaktů, 1 mm rozteč, klíč po 11. kontaktu; začíná ~42 mm od záslepky
  edgeFingers(g, -L / 2 + 42, 82, 1, H / 2 - 4, 7.5, 3.15, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 6, 120, 2 * 20.32, [(gg, x) => {
    const slot = new THREE.BoxGeometry(0.4, 4, 9);
    const m = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) m.push(mat4(x - 0.5, 8 + r * 5.2, -H / 2 + 6 + c * 11));
    gg.add(instanced(slot, M.hole(), m));
  }]);
  return g;
}

/** Sada chlazení P100: adaptér (plast) + radiální ventilátor 9733, dims [délka, výška, tloušťka]. */
function blowerKit([L, H, T]) {
  const g = new THREE.Group();
  const fanL = 97, fanD = 94, fanT = 33, adL = L - fanL;
  // adaptér: lichoběžník od průřezu karty (H) k výdechu ventilátoru (~40 mm)
  const s = new THREE.Shape();
  s.moveTo(0, -H / 2); s.lineTo(adL, -fanD / 2 + 4); s.lineTo(adL, -fanD / 2 + 44); s.lineTo(0, H / 2); s.closePath();
  const ad = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
  ad.rotateX(Math.PI / 2);
  add(g, ad, M.plastic(), -L / 2, T, 0);
  // ventilátor
  const fx = -L / 2 + adL + fanL / 2;
  rslab(g, fanL, fanT, fanD, 4, M.black(), fx, 0, 0);
  add(g, new THREE.CylinderGeometry(32, 32, 0.5, 48), M.hole(), fx + 6, fanT + 0.1, 6);
  rotor(g, 30, 30, fanT - 2, fx + 6, 6, std(0x26272a, { roughness: 0.6 }));
  const tex = label([{ text: '9733', font: 'bold 80px Arial', color: '#bfc3c8' }, { text: 'DC 12V 4-PIN PWM', font: '600 34px Arial', color: '#8d9197' }], 256, 256);
  decal(g, tex, 18, 18, fx + 6, fanT - 1.4, 6);
  // kabel s 4pinovým konektorem
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(fx + fanL / 2 - 4, 6, fanD / 2 - 10), new THREE.Vector3(fx + fanL / 2 + 25, 3, fanD / 2 - 30), new THREE.Vector3(fx + fanL / 2 + 10, 3, fanD / 2 - 70)]);
  add(g, new THREE.TubeGeometry(cable, 20, 1.6, 6), M.black());
  slab(g, 10, 6.2, 13, M.white(), fx + fanL / 2 + 10, 0, fanD / 2 - 76);
  return g;
}

/** Quadro K620: dims [délka, výška, tloušťka]; low profile, DVI-I + DisplayPort. */
function k620([L, H, T]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, H, M.pcbBlack(), 0, 0, 0);
  rslab(g, 118, T - 4, H - 14, 2, M.plastic(), 12, 1.6, -4);
  add(g, new THREE.CylinderGeometry(23, 23, 0.6, 40), M.hole(), 20, T - 2.2, -4);
  rotor(g, 21, 9, T - 3, 20, -4, std(0x2c2d30));
  const tex = label([{ text: 'NVIDIA', font: 'bold 60px Arial', color: '#8fb33a' }, { text: 'QUADRO K620', font: 'bold 70px Arial', color: '#c9cdd2' }], 1024, 256);
  decal(g, tex, 48, 12, -24, T - 2.4, -4);
  edgeFingers(g, -L / 2 + 42, 82, 1, H / 2 - 4, 7.5, 1.65, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 5, 79.2, 18.4, [
    (gg, x) => { slab(gg, 9, 12, 39, M.white(), x - 5, 3, -H / 2 + 26); slab(gg, 0.4, 7, 30, M.hole(), x - 9.6, 5.5, -H / 2 + 26); }, // DVI-I
    (gg, x) => { slab(gg, 8, 5.4, 16, M.steel(), x - 4.5, 6, -H / 2 + 58); slab(gg, 0.4, 3.6, 13, M.hole(), x - 8.6, 6.9, -H / 2 + 58); }, // DisplayPort
  ]);
  return g;
}

/** Xeon v pouzdře FCLGA2011-3: dims [52,5, 45, výška]. */
function cpu([L, W, H], { marking }) {
  const g = new THREE.Group();
  slab(g, L, 1.5, W, std(0x2f5a3b, { roughness: 0.5 }), 0, 0, 0);
  rslab(g, 41.5, H - 1.5, 36, 1.5, M.silver(), 0, 1.5, 0);
  decal(g, label(marking.map((t, i) => ({ text: t, font: `${i === 1 ? 'bold 64' : '600 42'}px Arial`, color: '#3a3d42' })), 512, 384), 34, 25, 0, H, 0);
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(4, 0); tri.lineTo(0, 4); tri.closePath();
  add(g, new THREE.ShapeGeometry(tri).rotateX(-Math.PI / 2), M.gold(), -L / 2 + 1, 1.52, W / 2 - 1);
  return g;
}

/** DDR4 RDIMM ECC: dims [133,35, 31,25, tloušťka], čipy po obou stranách, kontakty na hraně +Z. */
function rdimm([L, W]) {
  const g = new THREE.Group();
  const pcbY = 1.2, pcbT = 1.27;
  slab(g, L, pcbT, W, M.pcbGreen(), 0, pcbY, 0);
  const chip = new THREE.BoxGeometry(7.5, 1.2, 11);
  const top = [], bot = [];
  for (let i = 0; i < 9; i++) {
    const x = -L / 2 + 9 + i * 13.2 + (i >= 5 ? 6 : 0);
    top.push(mat4(x, pcbY + pcbT + 0.6, -3.5));
    bot.push(mat4(x, 0.6, -3.5));
  }
  g.add(instanced(chip, M.chip(), top), instanced(chip, M.chip(), bot));
  slab(g, 10, 1.2, 6, M.chip(), -L / 2 + 75, pcbY + pcbT, 6); // registr
  decal(g, label([{ text: '8GB 1Rx4 PC4-2400T-RE1', font: 'bold 44px Arial', color: '#222' }, { text: 'ECC REGISTERED', font: '600 34px Arial', color: '#444' }], 512, 128, { bg: '#ecebe6' }), 30, 7.5, -L / 2 + 30, pcbY + pcbT + 1.25, -3.5);
  edgeFingers(g, -L / 2 + 3.2, 72, 0.85, W / 2 - 2, 3.5, pcbY + pcbT + 0.03, 36);
  edgeFingers(g, -L / 2 + 3.2 + 72 * 0.85 + 1.7, 72, 0.85, W / 2 - 2, 3.5, pcbY + pcbT + 0.03);
  return g;
}

/** NVMe M.2 2280: dims [80, 22, výška]. */
function m2ssd([L, W, H]) {
  const g = new THREE.Group();
  slab(g, L, 0.8, W, M.pcbBlack(), 0, 0, 0);
  slab(g, 8.5, 1.1, 8.5, M.chip(), L / 2 - 15, 0.8, 0);
  slab(g, 14, 1.4, 18, M.chip(), -2, 0.8, 0);
  slab(g, 14, 1.4, 18, M.chip(), -20, 0.8, 0);
  decal(g, label([{ text: 'KINGSTON', font: 'bold 54px Arial', color: '#e8e8e8' }, { text: 'NV3 1TB  NVMe', font: '600 40px Arial', color: '#bbb' }], 512, 160, { bg: '#1c1d22' }), 56, 17, -8, H - 0.1, 0);
  const pins = new THREE.BoxGeometry(3.5, 0.05, 0.35);
  const m = [];
  for (let i = 0; i < 29; i++) { const z = -W / 2 + 2 + i * 0.5 + (i > 23 ? 2 : 0); if (z < W / 2 - 1) m.push(mat4(L / 2 - 1.8, 0.82, z)); }
  g.add(instanced(pins, M.gold(), m));
  add(g, new THREE.CircleGeometry(1.75, 20, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), M.hole(), -L / 2, 0.83, 0);
  return g;
}

/** Redukce PCIe x4 → M.2: dims [délka PCB, výška PCB, tloušťka]; s full height záslepkou. */
function m2adapter([L, H]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, H, M.pcbGreen(), 0, 0, 0);
  slab(g, 8, 5.6, 22, M.black(), L / 2 - 12, 1.6, -6); // slot M.2 (M-key)
  add(g, new THREE.CylinderGeometry(2.5, 2.5, 4, 6), M.silver(), L / 2 - 12 - 80, 3.6, -6); // distanční sloupek pro délku 2280
  edgeFingers(g, -L / 2 + 42, 32, 1, H / 2 - 4, 7.5, 1.65, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 6, 120, 18.4);
  slab(g, 6, 2, 3, std(0x3fa65a, { emissive: 0x1a5a2a }), 0, 1.6, -H / 2 + 10); // LED aktivity
  return g;
}

/** ATX zdroj: dims [šířka 150, hloubka 140, výška 86]; ventilátor nahoře. */
function psu([W, D, H]) {
  const g = new THREE.Group();
  rslab(g, W, H, D, 2, M.black(), 0, 0, 0);
  add(g, new THREE.CylinderGeometry(58, 58, 0.6, 64), M.hole(), 0, H + 0.1, 0);
  rotor(g, 56, 7, H - 3, 0, 0, std(0x232427));
  const wire = std(0x2a2b2e, { metalness: 0.7, roughness: 0.4 });
  for (const r of [16, 28, 40, 52, 58]) add(g, new THREE.TorusGeometry(r, 0.9, 6, 64).rotateX(Math.PI / 2), wire, 0, H + 0.6, 0);
  for (const a of [0, Math.PI / 2]) { const b = add(g, new THREE.BoxGeometry(116, 1.6, 2), wire, 0, H + 0.6, 0); b.rotation.y = a; }
  decal(g, label([{ text: 'SEASONIC', font: 'bold 54px Arial', color: '#d5d8dc' }, { text: 'FOCUS GX-650  80+ GOLD', font: '600 32px Arial', color: '#c8a85a' }], 512, 128), 34, 8.5, 0, H + 0.7, 0);
  // zadní čelo: voština, zásuvka IEC C14, vypínač
  frontDecal(g, perforation(70, 40, '#141518'), W - 50, H - 12, 18, H / 2, -D / 2 - 0.1).rotation.y = Math.PI;
  slab(g, 28, 22, 4, M.plastic(), -W / 2 + 26, H / 2 - 11, -D / 2 - 2);
  slab(g, 20, 10, 2, M.hole(), -W / 2 + 26, H / 2 - 5, -D / 2 - 4.2);
  // přední čelo: modulární zásuvky
  for (let i = 0; i < 6; i++) slab(g, 18, 9, 2, M.hole(), -W / 2 + 18 + i * 22, 20 + (i % 2) * 14, D / 2 + 0.2);
  return g;
}

/** Add2PSU: dims [57, 29, výška]. */
function add2psu([L, W, H]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, W, M.pcbBlack(), 0, 0, 0);
  slab(g, 51.6, H - 1.6, 10.2, M.black(), 0, 1.6, W / 2 - 6.5); // 24pinová zásuvka
  const hole = new THREE.BoxGeometry(3.4, 0.2, 3.4);
  const m = [];
  for (let i = 0; i < 12; i++) for (let r = 0; r < 2; r++) m.push(mat4(-23.1 + i * 4.2, H + 0.05, W / 2 - 6.5 - 2.1 + r * 4.2));
  g.add(instanced(hole, M.hole(), m));
  slab(g, 12.5, 5.5, 8, M.black(), -16, 1.6, -W / 2 + 6); // vstup SATA
  slab(g, 3, 1.5, 2, std(0xde3b3d, { emissive: 0x5a1010 }), 18, 1.6, -W / 2 + 6);
  decal(g, label([{ text: 'ADD2PSU', font: 'bold 60px Arial', color: '#e6e6e6' }], 256, 96), 16, 6, 6, 1.62, -W / 2 + 6);
  return g;
}

/** Konektor Mini-Fit (PCIe / EPS / ventilátor) jako kvádr se zámkem. */
function plug(g, w, h, d, x, z, mat = M.black()) {
  slab(g, d, h, w, mat, x, 0, z);
  slab(g, 4, 1.6, 3.5, mat, x, h, z);
}

/** Kabel položený na stole: body [x, z], poloměr r. */
function cable(g, pts, r, mat = M.black(), y = r) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
  add(g, new THREE.TubeGeometry(curve, Math.max(16, pts.length * 12), r, 8), mat);
}

/** Redukce 2× PCIe 8 pin (zásuvka) → EPS 8 pin (zástrčka), NVIDIA 030-0571-000. */
function epsCable([L, W]) {
  const g = new THREE.Group();
  const xa = -L / 2 + 7, xb = L / 2 - 7;
  for (const sz of [-1, 1]) {
    plug(g, 21.2, 9.6, 13, xa, sz * W * 0.33);
    cable(g, [[xa + 6, sz * W * 0.33], [xa + 50, sz * W * 0.3], [0, sz * 4], [xb - 40, 0], [xb - 6, 0]], 3.4);
  }
  plug(g, 21.2, 9.6, 13, xb, 0, std(0x232326));
  decal(g, label([{ text: 'EPS', font: 'bold 70px Arial', color: '#e0b44c' }], 128, 64), 8, 4, xb, 9.62, 0);
  return g;
}

/** Rozbočovač PWM 1 → 2 (4 pin). */
function fanSplitter([L, W]) {
  const g = new THREE.Group();
  const xa = -L / 2 + 6.5, xb = L / 2 - 6.5;
  plug(g, 10.3, 6.2, 13, xa, 0);
  for (const sz of [-1, 1]) {
    plug(g, 10.3, 6.2, 13, xb, sz * W * 0.32);
    cable(g, [[xa + 6, 0], [-10, sz * 3], [xb - 30, sz * W * 0.3], [xb - 6, sz * W * 0.32]], 1.4);
  }
  return g;
}

/** Ruční PWM regulátor otáček: destička s potenciometrem. */
function pwmController([L, W, H]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, W, M.pcbGreen(), 0, 0, 0);
  slab(g, 10, 7, 10, std(0x2457a8), -8, 1.6, 0);
  add(g, new THREE.CylinderGeometry(7.5, 8, H - 8.6 - 1.6, 28), M.black(), -8, 8.6 + (H - 10.2) / 2 + 1.6, 0);
  for (const z of [-W / 2 + 5, W / 2 - 5]) {
    slab(g, 10.2, 6, 3, M.black(), 14, 1.6, z);
    for (let i = 0; i < 4; i++) slab(g, 0.64, 6, 0.64, M.gold(), 10.4 + i * 2.54, 7.6, z);
  }
  return g;
}

/** Stříkačka Arctic MX-6 4 g ležící podél X. */
function syringe([, D]) {
  const g = new THREE.Group();
  const r = 7.2, y = D / 2;
  const along = (geo) => geo.rotateZ(Math.PI / 2);
  add(g, along(new THREE.CylinderGeometry(r, r, 66, 32)), std(0xd8dade, { roughness: 0.35, transparent: true, opacity: 0.92 }), -2, y, 0);
  const tex = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f6fd1'; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = '#1b1c1f'; c.font = 'bold 80px Arial'; c.textAlign = 'center'; c.fillText('ARCTIC', w / 2, h * 0.38);
    c.fillStyle = '#fff'; c.font = 'bold 60px Arial'; c.fillText('MX-6  4 g', w / 2, h * 0.86);
  });
  add(g, along(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 40, 32, 1, true)), std(0xffffff, { map: tex, side: THREE.DoubleSide }), -2, y, 0);
  add(g, along(new THREE.CylinderGeometry(D / 2, D / 2, 2, 32)), M.white(), -36, y, 0); // příruba
  add(g, along(new THREE.CylinderGeometry(4, 4, 8, 16)), M.white(), -41, y, 0); // píst
  add(g, along(new THREE.CylinderGeometry(2.2, r, 8, 24)), std(0xd8dade, { roughness: 0.35 }), 35, y, 0);
  add(g, along(new THREE.CylinderGeometry(3, 3, 7, 16)), std(0x1f6fd1), 42, y, 0); // víčko
  return g;
}

/** Axiální ventilátor 120 mm ležící naplocho (Arctic P12). */
function fan120([S, , T]) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const h = S / 2, c = 7;
  s.moveTo(-h + c, -h); s.lineTo(h - c, -h); s.quadraticCurveTo(h, -h, h, -h + c); s.lineTo(h, h - c); s.quadraticCurveTo(h, h, h - c, h);
  s.lineTo(-h + c, h); s.quadraticCurveTo(-h, h, -h, h - c); s.lineTo(-h, -h + c); s.quadraticCurveTo(-h, -h, -h + c, -h);
  s.holes.push(new THREE.Path().absarc(0, 0, h - 3, 0, Math.PI * 2, true));
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) s.holes.push(new THREE.Path().absarc(x * 52.5, z * 52.5, 2.2, 0, Math.PI * 2, true));
  const frame = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 32 });
  frame.rotateX(-Math.PI / 2);
  add(g, frame, M.black());
  for (const a of [Math.PI / 4, -Math.PI / 4]) { const b = add(g, new THREE.BoxGeometry(S - 10, 3, 3), M.black(), 0, 1.5, 0); b.rotation.y = a; } // vzpěry motoru
  add(g, new THREE.CylinderGeometry(20, 20, T - 4, 40), M.black(), 0, T / 2, 0);
  rotor(g, h - 6, 5, T / 2, 0, 0, std(0x1b1c1f, { roughness: 0.5 }));
  decal(g, label([{ text: 'ARCTIC', font: 'bold 56px Arial', color: '#d9dbde' }, { text: 'P12 PWM PST', font: '600 40px Arial', color: '#9a9ea3' }], 256, 256, { bg: '#16171a' }), 30, 30, 0, T - 2, 0);
  cable(g, [[h - 4, h - 12], [h + 18, h - 4], [h + 22, h - 40]], 1.3);
  return g;
}

// ---------------------------------------------------------------- díly karty NV1 a periferie
function chip(dims, { type, freqHz }) {
  return buildRealPart({ type, id: type, label: type, freqHz }) || new THREE.Group();
}
function connector(dims, { build }) {
  return P[build]();
}
function crt([W, D]) {
  const m = P.crt({ w: W, d: D });
  m.osd.visible = false; // vypnutý monitor: OSD vrstva bez textury by svítila bíle
  return m.group;
}
function speakers([W, D]) {
  return P.speakers({ w: W, d: D }).group;
}
function gamepad([W, D, H]) {
  const pad = P.gamepad(); // obecný model v jednotkách: šířka 6,9, hloubka 2,7, výška 0,85
  pad.scale.set(W / 6.9, H / 0.85, D / 2.7);
  return new THREE.Group().add(pad);
}

const BUILDERS = { tower, tesla, blowerKit, k620, cpu, rdimm, m2ssd, m2adapter, psu, add2psu, epsCable, fanSplitter, pwmController, syringe, fan120, chip, connector, crt, speakers, gamepad };
export const MODEL_KINDS = Object.keys(BUILDERS);

/** Model jednoho kusu položky kusovníku (mm). */
export function buildModel(item) {
  const g = BUILDERS[item.model.kind](item.dims, item.model);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Ocelové pravítko 300 mm s milimetrovou stupnicí – měřítko scény. */
export function ruler() {
  const g = new THREE.Group();
  const L = 320, W = 28;
  const tex = canvasTex(3200, 280, (c, w, h) => {
    c.fillStyle = '#c7ccd2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b1c1f'; c.font = 'bold 54px Arial'; c.textAlign = 'center';
    for (let mm = 0; mm <= 300; mm++) {
      const x = (10 + mm) * 10, len = mm % 10 === 0 ? 110 : mm % 5 === 0 ? 75 : 45;
      c.fillRect(x - 2, 0, 4, len);
      if (mm % 10 === 0) c.fillText(String(mm / 10), x, 175);
    }
    c.font = '600 40px Arial'; c.textAlign = 'left'; c.fillText('cm', 40, 250);
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(L, 0.8, W), [M.steel(), M.steel(), std(0xffffff, { map: tex, metalness: 0.6, roughness: 0.35 }), M.steel(), M.steel(), M.steel()]);
  mesh.position.y = 0.4;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}
