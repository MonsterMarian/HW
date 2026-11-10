// 3D modely dílů "jak z obchodu" pro ECONOMIC view. Vše v MILIMETRECH, y = 0 je stůl,
// počátek = střed půdorysu. Parametrické modely berou rozměry z kusovníku (item.dims).
// Karty leží na stole bokem nahoru (plošný spoj dole), délka karty = osa X, výška karty = osa Z,
// záslepka je na -X, hranový konektor na +Z.
//
// Zdroje rozměrů a detailů (rešerše 10. 11. 2026):
//  Dell T5810  – Owner's Manual (tabulka Physical, obr. 1 Front and Back View); polohy na čele odměřené z obrázku
//  Tesla P100  – NVIDIA PB-08248-001 (EPS 8 pin na "East edge", nápis TESLA u záslepky, lišty se 4 šrouby)
//  RDIMM       – Samsung M393A1G40EB1 datasheet (PCB 1,4 mm, 9 + 9 čipů, RCD uprostřed, klíč 64,6 mm)
//  K620        – NVIDIA datasheet 75509 (68,9 × 160 mm), NV3 – Tom's Hardware (22 × 80 × 2,3 mm, jednostranný)
//  P12         – arctic.de (5 lopatek, kabel 400 mm, PST), 030-0571-000 – gekko (10 cm), Mini-Fit Jr – RS 39-01-2080
// Odhady (bez výkresu): rozmístění čela Dellu ±5 mm, IHS Xeonu, poloha kontaktů PCIe od záslepky, MX-6 stříkačka.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { std, textTexture, instanced, mat4 } from '../physics/common.js';
import * as P from '../physics/packages.js';
import { buildRealPart } from '../physics/boardScene.js';

// ---------------------------------------------------------------- materiály a pomocníci
const M = {
  black: () => std(0x16171a, { roughness: 0.55 }),
  plastic: () => std(0x1d1e21, { roughness: 0.7 }),
  satin: () => std(0x2b2d31, { metalness: 0.6, roughness: 0.38 }),
  shroud: () => std(0x9a9fa6, { metalness: 0.8, roughness: 0.34 }),
  rail: () => std(0x6f747b, { metalness: 0.8, roughness: 0.3 }),
  handle: () => std(0xb5b9be, { metalness: 0.2, roughness: 0.45 }),
  silver: () => std(0xc3c8ce, { metalness: 0.9, roughness: 0.3 }),
  steel: () => std(0xb9bfc6, { metalness: 0.9, roughness: 0.32 }),
  gold: () => std(0xe0b44c, { metalness: 1, roughness: 0.22 }),
  pcbGreen: () => std(0x14532d, { roughness: 0.45 }),
  pcbBlack: () => std(0x101113, { roughness: 0.45 }),
  hole: () => std(0x050505, { roughness: 1 }),
  chip: () => std(0x151618, { roughness: 0.6 }),
  white: () => std(0xe9e7e1, { roughness: 0.6 }),
  blue: () => std(0x1f5fbf, { roughness: 0.5 }),
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
/** Obtisk na svislé ploše čelem k +Z (rotY otočí normálu). */
function vDecal(g, tex, w, h, x, y, z, rotY = 0, opts = {}) {
  const m = add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, ...opts }), x, y, z);
  m.rotation.y = rotY;
  return m;
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

/** Mřížka šestiúhelníkových otvorů (čelo Dellu, voština zdroje), px = velikost buňky v texelech. */
const hexMesh = (w, h, cell = 14, bg = '#17181b', hole = '#040405') => canvasTex(w, h, (c) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.fillStyle = hole;
  const r = cell * 0.42, dx = cell, dy = cell * 0.866;
  for (let row = 0, y = r; y < h; row++, y += dy) {
    for (let x = (row % 2) * dx / 2 + r; x < w; x += dx) {
      c.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; c.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
      c.fill();
    }
  }
});

/** Pozlacené kontakty hranového konektoru: n kontaktů s roztečí pitch od x0 podél X, na hraně z. */
function edgeFingers(g, x0, n, pitch, z, depth, y, keyAfter = -1, keyGap = pitch * 2) {
  const geo = new THREE.BoxGeometry(pitch * 0.7, 0.05, depth);
  const mats = [];
  for (let i = 0; i < n; i++) mats.push(mat4(x0 + i * pitch + (keyAfter >= 0 && i >= keyAfter ? keyGap : 0), y, z));
  g.add(instanced(geo, M.gold(), mats));
}

/** Matice pro instance otočené kolem osy X (otvory v záslepce). */
const rotXMatrix = (x, y, z, a) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a), new THREE.Vector3(1, 1, 1));

/** Záslepka ležící karty: plech v rovině YZ v x, délka podél Z od z0, výška slotu h, ouško se šroubem. */
function bracket(g, x, z0, len, h, ports = []) {
  slab(g, 0.86, h, len, M.steel(), x, 0, z0 + len / 2);
  slab(g, 11, h, 0.86, M.steel(), x - 5.5, 0, z0);
  for (const p of ports) p(g, x);
}

/** Rotor s lopatkami v rovině XZ, střed (x, y, z). */
function rotor(g, r, blades, y, x = 0, z = 0, mat = M.black(), hub = 0.38) {
  add(g, new THREE.CylinderGeometry(r * hub, r * hub, 2, 32), mat, x, y, z);
  const blade = new THREE.BoxGeometry(r * (1 - hub) * 0.95, 1, r * 0.34);
  blade.translate(r * hub + (r * (1 - hub) * 0.95) / 2, 0, 0);
  const mats = [];
  for (let i = 0; i < blades; i++) {
    const m = mat4(x, y - 0.4, z, (i / blades) * Math.PI * 2);
    m.multiply(new THREE.Matrix4().makeRotationX(0.45));
    mats.push(m);
  }
  g.add(instanced(blade, mat, mats));
}

/** Kabel položený na stole: body [x, z], poloměr r. */
function cable(g, pts, r, mat = M.black(), y = r) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
  add(g, new THREE.TubeGeometry(curve, Math.max(16, pts.length * 12), r, 8), mat);
}

/** Konektor Mini-Fit Jr ležící na stole: šířka w (Z), tloušťka t (Y) + západka, délka d (X). */
function miniFit(g, w, t, d, x, z, mat = M.black(), latch = 15.1 - 9.6) {
  slab(g, d, t, w, mat, x, 0, z);
  slab(g, 6, latch, 4, mat, x, t, z);
}

// ---------------------------------------------------------------- PC díly
/** Dell Precision T5810: dims [hloubka 471, šířka 172,6, výška 414 bez nožiček]; čelo k +Z. */
function tower([D, W, H]) {
  const g = new THREE.Group();
  const foot = 2.9, top = H + foot; // manuál: 414 mm bez nožiček, 416,9 mm s nimi
  const recess = 34, hz = 50; // zapuštěný vršek mezi madly, hloubka madla (odhad z fotek)
  const fz = D / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) slab(g, 24, foot, 40, M.plastic(), sx * (W / 2 - 18), 0, sz * (D / 2 - 40));
  rslab(g, W, H - recess, D, 3, M.black(), 0, foot, 0);
  slab(g, W, recess, 18, M.black(), 0, top - recess, fz - 9); // horní pás čela
  slab(g, W, recess, 10, M.black(), 0, top - recess, -fz + 5);
  // integrovaná madla: otevřené smyčky přes celou šířku, světle šedý plast, prostor pro prsty 25 mm
  for (const zc of [fz - 18 - hz / 2, -fz + 10 + hz / 2]) {
    for (const sx of [-1, 1]) slab(g, 8, recess, hz, M.handle(), sx * (W / 2 - 4), top - recess, zc);
    slab(g, W, 9, hz, M.handle(), 0, top - 9, zc);
  }
  // ---- čelo podle obr. 1 manuálu, souřadnice od levého horního rohu čela (xf doprava, yf dolů)
  const X = (xf) => -W / 2 + xf, Y = (yf) => top - yf;
  const fbox = (w, h, d, mat, xf, yf) => add(g, new THREE.BoxGeometry(w, h, d), mat, X(xf), Y(yf), fz + d / 2);
  const round = (r, mat, xf, yf, d = 1) => add(g, new THREE.CylinderGeometry(r, r, d, 24).rotateX(Math.PI / 2), mat, X(xf), Y(yf), fz + d / 2);
  fbox(30, 18, 1.6, M.silver(), 22, 12); // vypínač s LED
  fbox(6, 1.2, 0.4, std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 22, 12);
  fbox(3, 2, 0.6, std(0xffffff, { emissive: 0xffd9a0, emissiveIntensity: 0.3 }), 15, 30); // LED disku
  for (const xf of [55, 80]) { round(4, M.satin(), xf, 10); round(1.8, M.hole(), xf, 10, 1.2); } // mikrofon, sluchátka
  [12, 27, 42, 57].forEach((xf, i) => { // 1× USB 3.0 (modrý jazýček) + 3× USB 2.0, na výšku
    fbox(5.2, 13, 0.4, M.hole(), xf, 50);
    fbox(1.6, 11, 0.6, i === 0 ? M.blue() : M.white(), xf - 0.8, 50);
  });
  const bay = std(0x3a3d42, { metalness: 0.3, roughness: 0.5 });
  fbox(46.5, 149.5, 0.5, M.hole(), 27, 139); // spára kolem krytu šachty
  fbox(45, 148, 1.0, bay, 27, 139); // pozice 5,25" (na výšku)
  fbox(8, 3, 1.6, M.silver(), 27, 205);
  fbox(14.5, 131.5, 0.5, M.hole(), 56, 135);
  fbox(13, 130, 1.0, bay, 56, 135); // slim mechanika
  fbox(4, 6, 1.6, M.silver(), 56, 194);
  const mesh = fbox(102, 376, 0.6, std(0xffffff, { map: hexMesh(408, 1504, 16), roughness: 0.6 }), 114, 218);
  mesh.material = [M.black(), M.black(), M.black(), M.black(), mesh.material, M.black()];
  add(g, new THREE.TorusGeometry(12.5, 1.3, 12, 48), M.silver(), X(114), Y(207), fz + 1.6);
  vDecal(g, label([{ text: 'DELL', font: 'bold 120px Arial, sans-serif', color: '#c9cdd2' }], 512, 256), 20, 10, X(114), Y(207), fz + 0.7);
  // ---- záda: I/O sloupec, 7 záslepek slotů, zdroj s IEC a modrou páčkou (pohled zezadu: vlevo = +X)
  const bz = -fz - 0.3, XB = (xb) => W / 2 - xb;
  add(g, new THREE.BoxGeometry(45, 135, 0.6), M.satin(), XB(37), Y(108), bz);
  for (let i = 0; i < 7; i++) add(g, new THREE.BoxGeometry(110, 15, 0.8), M.steel(), XB(88), Y(228 + i * 21.5), bz);
  add(g, new THREE.BoxGeometry(150, 34, 0.6), M.satin(), 0, Y(397), bz);
  add(g, new THREE.BoxGeometry(24, 16, 3), M.plastic(), XB(140), Y(397), bz - 1.5);
  add(g, new THREE.BoxGeometry(14, 22, 3), M.blue(), XB(40), Y(397), bz - 1.5);
  return g;
}

/** Tesla P100 PCIe: dims [délka 267, výška 111,15, tloušťka]; pasivní, bez výstupů, kryt bokem nahoru. */
function tesla([L, H, T]) {
  const g = new THREE.Group();
  const yS = 3.1, sz0 = -H / 2, sz1 = H / 2 - 9; // kryt nepřekrývá hranový konektor
  const sd = sz1 - sz0, sc = (sz0 + sz1) / 2;
  slab(g, L, 1.5, H - 9, std(0x3a3d42, { metalness: 0.7, roughness: 0.4 }), 0, 0, sc); // zadní plech
  slab(g, L, 1.6, H, M.pcbGreen(), 0, 1.5, 0);
  slab(g, L, T - yS, sd, M.shroud(), 0, yS, sc);
  // bok krytu: dvě vystouplé lišty se zkosenými konci, 4 šrouby, plochý panel uprostřed
  const railShape = (len, w) => { const s = new THREE.Shape(); s.moveTo(-len / 2, -w / 2); s.lineTo(len / 2, -w / 2); s.lineTo(len / 2 - w * 0.6, w / 2); s.lineTo(-len / 2 + w * 0.6, w / 2); s.closePath(); return s; };
  for (const [zc, flip] of [[sz0 + 8, 1], [sz1 - 8, -1]]) {
    const geo = new THREE.ExtrudeGeometry(railShape(L - 24, 14), { depth: 2.4, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const rail = add(g, geo, M.rail(), 0, T, zc);
    rail.scale.z = flip;
    for (const xs of [-1, 1]) add(g, new THREE.CylinderGeometry(2.6, 2.6, 0.8, 16), M.black(), xs * (L / 2 - 40), T + 2.6, zc);
  }
  slab(g, L - 90, 0.5, sd - 44, std(0xb0b5bb, { metalness: 0.75, roughness: 0.3 }), 12, T, sc);
  const tesla = add(g, new THREE.PlaneGeometry(64, 14), new THREE.MeshStandardMaterial({ map: label([{ text: 'TESLA', font: 'bold 150px Arial, sans-serif', color: '#2a2c30' }], 1024, 220), transparent: true }), -L / 2 + 22, T + 0.55, sc);
  tesla.rotation.set(-Math.PI / 2, 0, Math.PI / 2); // čte se svisle, u záslepky
  // horní hrana: logo NVIDIA uprostřed délky
  const nv = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#76b900'; c.beginPath(); c.ellipse(70, h / 2, 46, 30, 0, 0, 7); c.fill();
    c.fillStyle = '#e9eaec'; c.font = 'bold 74px Arial'; c.textBaseline = 'middle'; c.fillText('NVIDIA', 140, h / 2 + 4);
  });
  vDecal(g, nv, 56, 14, 0, (yS + T) / 2, sz0 - 0.05, Math.PI);
  // "East edge": otevřený konec žebrování + EPS 8 pin mířící podélně ven
  const fin = new THREE.BoxGeometry(0.8, T - yS - 4, 1.0);
  const fins = [];
  for (let z = sz0 + 26; z < sz1 - 3; z += 2.4) fins.push(mat4(L / 2 + 0.2, yS + (T - yS) / 2, z));
  add(g, new THREE.BoxGeometry(0.3, T - yS - 3, sd - 28), M.hole(), L / 2 + 0.05, yS + (T - yS) / 2, sc + 12);
  g.add(instanced(fin, M.shroud(), fins));
  miniFit(g, 18, 9.6, 19.6, L / 2 + 6, sz0 + 12, M.black(), 0);
  g.children[g.children.length - 1].position.y += 3.1;
  g.children[g.children.length - 2].position.y += 3.1;
  // PCIe x16 (shortcut: 1. kontakt ~42 mm od záslepky je odhad, specifikaci CEM jsme neověřili)
  edgeFingers(g, -L / 2 + 42, 82, 1, H / 2 - 4, 7.5, 3.15, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 6, 120, 2 * 20.32, [(gg, x) => {
    const hole = new THREE.BoxGeometry(0.4, 3.2, 3.2);
    const m = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 22; c++) m.push(rotXMatrix(x - 0.5, 6 + r * 4.6, -H / 2 + 4 + c * 4.6 + (r % 2) * 2.3, Math.PI / 4));
    gg.add(instanced(hole, M.hole(), m));
  }]);
  return g;
}

/** Adaptér chlazení (shroud) pro P100/P40: dims [délka 91, šířka u karty 111, výška 38]. */
function shroudAdapter([L, H, T]) {
  const g = new THREE.Group();
  const s = new THREE.Shape(); // od průřezu karty k výdechu ventilátoru 9733 (~40 mm)
  s.moveTo(0, -H / 2); s.lineTo(L, -H / 2 + 8); s.lineTo(L, -H / 2 + 52); s.lineTo(0, H / 2); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  add(g, geo, M.plastic(), -L / 2, T, 0);
  add(g, new THREE.BoxGeometry(0.3, T - 6, H - 8), M.hole(), -L / 2 - 0.05, T / 2, 0);
  for (const z of [-H / 2 + 10, H / 2 - 10]) add(g, new THREE.CylinderGeometry(3.2, 3.2, 4, 6), M.steel(), -L / 2 + 8, T + 2, z);
  return g;
}

/** Radiální ventilátor 9733: dims [97, 94, 33], výdech na boku -X. */
function blower([L, D, T]) {
  const g = new THREE.Group();
  rslab(g, L, T, D, 4, M.black(), 0, 0, 0);
  add(g, new THREE.CylinderGeometry(30, 30, 0.5, 48), M.hole(), 6, T + 0.1, 6);
  rotor(g, 28, 30, T - 2, 6, 6, std(0x26272a, { roughness: 0.6 }), 0.45);
  decal(g, label([{ text: 'DELTA', font: 'bold 70px Arial', color: '#bfc3c8' }, { text: 'BFB1012VH 12V', font: '600 34px Arial', color: '#8d9197' }], 256, 256), 22, 22, 6, T - 1.4, 6);
  add(g, new THREE.BoxGeometry(0.3, T - 6, 50), M.hole(), -L / 2 - 0.05, T / 2, -D / 2 + 30);
  cable(g, [[L / 2 - 4, D / 2 - 10], [L / 2 + 25, D / 2 - 30], [L / 2 + 12, D / 2 - 70]], 1.6);
  slab(g, 13, 6.2, 10.3, M.white(), L / 2 + 12, 0, D / 2 - 78);
  return g;
}

/** Quadro K620: dims [délka 160, výška 68,9, tloušťka]; low profile, DVI-I + DisplayPort. */
function k620([L, H, T]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, H, M.pcbBlack(), 0, 0, 0);
  rslab(g, L - 22, T - 4.5, H - 16, 2, M.plastic(), 5, 1.6, -4);
  add(g, new THREE.CylinderGeometry(25, 25, 0.6, 40), M.hole(), 8, T - 2.6, -4);
  rotor(g, 23, 9, T - 3.4, 8, -4, std(0x2c2d30), 0.42);
  decal(g, label([{ text: 'NVIDIA', font: 'bold 60px Arial', color: '#8fb33a' }, { text: 'QUADRO K620', font: 'bold 70px Arial', color: '#c9cdd2' }], 1024, 256), 40, 10, -46, T - 2.85, -4);
  edgeFingers(g, -L / 2 + 42, 82, 1, H / 2 - 4, 7.5, 1.65, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 5, 79.2, 18.4, [
    (gg, x) => { slab(gg, 9, 12, 39, M.white(), x + 4.5, 2, -H / 2 + 26); slab(gg, 0.4, 8, 31, M.hole(), x - 0.5, 4, -H / 2 + 26); }, // DVI-I
    (gg, x) => { slab(gg, 9, 5.4, 16, M.steel(), x + 4.5, 5.6, -H / 2 + 58); slab(gg, 0.4, 3.8, 13.5, M.hole(), x - 0.5, 6.4, -H / 2 + 58); }, // DisplayPort
  ]);
  return g;
}

/** Xeon FCLGA2011-3: substrát 52,5 × 45 mm, IHS (odhad 41 × 37 mm). */
function cpu([L, W, H], { marking }) {
  const g = new THREE.Group();
  slab(g, L, 1.3, W, std(0x2f5a3b, { roughness: 0.5 }), 0, 0, 0);
  rslab(g, 41, H - 1.3, 37, 1.5, M.silver(), 0, 1.3, 0);
  decal(g, label(marking.map((t, i) => ({ text: t, font: `${i === 1 ? 'bold 64' : '600 42'}px Arial`, color: '#3a3d42' })), 512, 384), 34, 25, 0, H, 0);
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(4, 0); tri.lineTo(0, 4); tri.closePath();
  add(g, new THREE.ShapeGeometry(tri).rotateX(-Math.PI / 2), M.gold(), -L / 2 + 1, 1.32, W / 2 - 1);
  return g;
}

/** DDR4 RDIMM 1Rx4: PCB 133,35 × 31,25 × 1,4 mm, 9 + 9 čipů 78FBGA, RCD uprostřed, klíč 64,6 mm. */
function rdimm([L, W, T]) {
  const g = new THREE.Group();
  const pcbT = 1.4, pcbY = (T - pcbT) / 2;
  // obrys desky s klíčem (hrana kontaktů = +Z) a bočními výřezy pro západky
  const s = new THREE.Shape();
  const x0 = -L / 2, x1 = L / 2, zt = -W / 2, zb = W / 2, key = x0 + 64.6, latchZ = zb - 17.6;
  s.moveTo(x0, zt); s.lineTo(x1, zt); s.lineTo(x1, latchZ - 1.3); s.lineTo(x1 - 2.1, latchZ - 1.3); s.lineTo(x1 - 2.1, latchZ + 1.3); s.lineTo(x1, latchZ + 1.3);
  s.lineTo(x1, zb); s.lineTo(key + 0.75, zb); s.lineTo(key + 0.75, zb - 3.85); s.lineTo(key - 0.75, zb - 3.85); s.lineTo(key - 0.75, zb);
  s.lineTo(x0, zb); s.lineTo(x0, latchZ + 1.3); s.lineTo(x0 + 2.1, latchZ + 1.3); s.lineTo(x0 + 2.1, latchZ - 1.3); s.lineTo(x0, latchZ - 1.3); s.closePath();
  const pcb = new THREE.ExtrudeGeometry(s, { depth: pcbT, bevelEnabled: false });
  pcb.rotateX(Math.PI / 2);
  add(g, pcb, M.pcbGreen(), 0, pcbY + pcbT, 0);
  const chip = new THREE.BoxGeometry(7.5, 1.2, 11);
  const z = -3.5, top = pcbY + pcbT + 0.6, bot = pcbY - 0.6;
  const front = [0, 1, 2, 3, 4].map((i) => x0 + 8 + i * 12.4).concat([0, 1, 2, 3].map((i) => x0 + 86 + i * 12.4));
  const back = [0, 1, 2, 3].map((i) => x0 + 8 + i * 12.4).concat([0, 1, 2, 3, 4].map((i) => x0 + 74 + i * 12.4));
  g.add(instanced(chip, M.chip(), front.map((x) => mat4(x, top, z))), instanced(chip, M.chip(), back.map((x) => mat4(x, bot, z))));
  slab(g, 9, 1.0, 9, M.chip(), x0 + 72.5, pcbY + pcbT, z); // registrový budič (RCD)
  decal(g, label([{ text: '8GB 1Rx4 PC4-2400T-RE1', font: 'bold 44px Arial', color: '#222' }, { text: 'ECC REGISTERED', font: '600 34px Arial', color: '#444' }], 512, 128, { bg: '#ecebe6' }), 34, 8.5, x0 + 105, pcbY + pcbT + 1.21, z);
  // 144 kontaktů na každé straně, rozteč 0,85 mm, rozpětí 126,65 mm, mezera v místě klíče
  const left = Math.floor((64.6 - 0.75 - 3.35) / 0.85);
  edgeFingers(g, x0 + 3.35, left, 0.85, zb - 2, 3.5, pcbY + pcbT + 0.03);
  edgeFingers(g, key + 1.2, 144 - left, 0.85, zb - 2, 3.5, pcbY + pcbT + 0.03);
  return g;
}

/** NVMe M.2 2280 jednostranný: řadič u konektoru, 2× NAND, černá nálepka. */
function m2ssd([L, W, H]) {
  const g = new THREE.Group();
  slab(g, L, 0.8, W, M.pcbBlack(), 0, 0, 0);
  slab(g, 12, 1.2, 12, M.chip(), L / 2 - 16, 0.8, 0);
  slab(g, 12, 1.4, 18, M.chip(), -4, 0.8, 0);
  slab(g, 12, 1.4, 18, M.chip(), -20, 0.8, 0);
  decal(g, label([{ text: 'KINGSTON', font: 'bold 54px Arial', color: '#e8e8e8' }, { text: 'NV3 1TB  NVMe', font: '600 40px Arial', color: '#bbb' }], 512, 160, { bg: '#1c1d22' }), 62, 19, -6, H - 0.1, 0);
  const pins = new THREE.BoxGeometry(3.5, 0.05, 0.35);
  const m = [];
  for (let i = 0; i < 29; i++) { const z = -W / 2 + 2 + i * 0.5 + (i > 23 ? 2 : 0); if (z < W / 2 - 1) m.push(mat4(L / 2 - 1.8, 0.82, z)); }
  g.add(instanced(pins, M.gold(), m));
  add(g, new THREE.CircleGeometry(1.75, 20, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), M.hole(), -L / 2, 0.83, 0);
  return g;
}

/** Redukce PCIe x4 → M.2 (Axagon PCEM2-N): PCB, slot M-key, sloupek pro 2280, full height záslepka. */
function m2adapter([L, H]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, H, M.pcbBlack(), 0, 0, 0);
  slab(g, 8, 5.6, 22, M.black(), L / 2 - 12, 1.6, -6);
  add(g, new THREE.CylinderGeometry(2.5, 2.5, 4, 6), M.silver(), L / 2 - 12 - 80, 3.6, -6);
  edgeFingers(g, -L / 2 + 42, 32, 1, H / 2 - 4, 7.5, 1.65, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 6, 120.02, 18.42);
  slab(g, 3, 1, 2, std(0x3fa65a, { emissive: 0x1a5a2a }), 0, 1.6, -H / 2 + 10);
  decal(g, label([{ text: 'AXAGON', font: 'bold 60px Arial', color: '#d8d8d8' }], 256, 80), 20, 6, -10, 1.62, H / 2 - 18);
  return g;
}

/** ATX zdroj 150 × 86 × 140 mm (Seasonic Core/Focus GX-650): ventilátor 120 mm nahoře, plně modulární. */
function psu([W, D, H]) {
  const g = new THREE.Group();
  rslab(g, W, H, D, 2, M.black(), 0, 0, 0);
  add(g, new THREE.CylinderGeometry(58, 58, 0.6, 64), M.hole(), 0, H + 0.1, 0);
  rotor(g, 56, 7, H - 3, 0, 0, std(0x232427));
  const wire = std(0x2a2b2e, { metalness: 0.7, roughness: 0.4 });
  for (const r of [16, 28, 40, 52, 58]) add(g, new THREE.TorusGeometry(r, 0.9, 6, 64).rotateX(Math.PI / 2), wire, 0, H + 0.6, 0);
  for (const a of [0, Math.PI / 2]) { const b = add(g, new THREE.BoxGeometry(116, 1.6, 2), wire, 0, H + 0.6, 0); b.rotation.y = a; }
  decal(g, label([{ text: 'SEASONIC', font: 'bold 54px Arial', color: '#d5d8dc' }, { text: 'CORE GX-650  80+ GOLD', font: '600 32px Arial', color: '#c8a85a' }], 512, 128), 34, 8.5, 0, H + 0.7, 0);
  // záda: voština, IEC C14, vypínač, tlačítko Hybrid
  vDecal(g, hexMesh(560, 320, 16), W - 52, H - 14, 18, H / 2, -D / 2 - 0.1, Math.PI);
  add(g, new THREE.BoxGeometry(28, 22, 4), M.plastic(), -W / 2 + 26, H / 2 + 8, -D / 2 - 2);
  add(g, new THREE.BoxGeometry(20, 10, 0.4), M.hole(), -W / 2 + 26, H / 2 + 8, -D / 2 - 4.1);
  add(g, new THREE.BoxGeometry(13, 8, 4), M.black(), -W / 2 + 26, H / 2 - 14, -D / 2 - 2);
  add(g, new THREE.CylinderGeometry(3, 3, 3, 16).rotateX(Math.PI / 2), M.silver(), -W / 2 + 26, 10, -D / 2 - 1.5);
  // čelo: modulární zásuvky (24 pin, 2× CPU, 4× PCIe, 4× periferie)
  slab(g, 32, 12, 2, M.hole(), -W / 2 + 24, 12, D / 2 + 0.2);
  for (let i = 0; i < 6; i++) slab(g, 18, 9, 2, M.hole(), -W / 2 + 54 + (i % 3) * 22, 14 + Math.floor(i / 3) * 16, D / 2 + 0.2);
  for (let i = 0; i < 4; i++) slab(g, 9, 9, 2, M.hole(), W / 2 - 12 - i * 12, 56, D / 2 + 0.2); // periferie (SATA/Molex)
  return g;
}

/** Add2PSU: PCB ~70 × 30 mm, 24pinová zásuvka pro druhý zdroj, vstup Molex, relé, LED. */
function add2psu([L, W, H]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, W, M.pcbBlack(), 0, 0, 0);
  slab(g, 51.6, 10, 10.2, M.black(), -L / 2 + 28, 1.6, W / 2 - 6.5);
  const hole = new THREE.BoxGeometry(3.4, 0.2, 3.4);
  const m = [];
  for (let i = 0; i < 12; i++) for (let r = 0; r < 2; r++) m.push(mat4(-L / 2 + 28 - 23.1 + i * 4.2, 11.65, W / 2 - 6.5 - 2.1 + r * 4.2));
  g.add(instanced(hole, M.hole(), m));
  slab(g, 19, H - 1.6, 15.5, M.blue(), L / 2 - 12, 1.6, -W / 2 + 9); // relé
  slab(g, 21, 7, 6, M.white(), -L / 2 + 16, 1.6, -W / 2 + 5); // vstup Molex
  slab(g, 3, 1.5, 2, std(0xde3b3d, { emissive: 0x5a1010 }), 6, 1.6, -W / 2 + 4);
  return g;
}

/** Redukce 2× PCIe 8 pin (zásuvka) → EPS 8 pin (zástrčka), NVIDIA 030-0571-000, kabel ~10 cm. */
function epsCable([L, W]) {
  const g = new THREE.Group();
  const xa = -L / 2 + 9.8, xb = L / 2 - 9.8;
  for (const sz of [-1, 1]) {
    miniFit(g, 18, 9.6, 19.6, xa, sz * W * 0.3);
    for (const k of [-1, 1]) cable(g, [[xa + 9, sz * W * 0.3 + k * 4], [xa + 40, sz * W * 0.24 + k * 4], [xb - 30, sz * 5 + k * 2], [xb - 9, sz * 5 + k * 2]], 1.9);
  }
  miniFit(g, 18, 9.6, 19.6, xb, 0, std(0x232326));
  decal(g, label([{ text: 'CPU', font: 'bold 70px Arial', color: '#e0b44c' }], 128, 64), 8, 4, xb, 9.62, 0);
  return g;
}

/** Noctua NA-SYC1: 4pinový PWM Y-kabel, 115 mm. */
function fanSplitter([L, W]) {
  const g = new THREE.Group();
  const xa = -L / 2 + 6.5, xb = L / 2 - 6.5;
  slab(g, 13, 6.2, 10.3, M.black(), xa, 0, 0);
  for (const sz of [-1, 1]) {
    slab(g, 13, 6.2, 10.3, M.black(), xb, 0, sz * W * 0.32);
    cable(g, [[xa + 6, 0], [-10, sz * 3], [xb - 30, sz * W * 0.3], [xb - 6, sz * W * 0.32]], 1.4);
  }
  return g;
}

/** Ruční PWM regulátor: destička s potenciometrem a knoflíkem, 2× 4pinový konektor. */
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

/** Stříkačka Arctic MX-6 4 g ležící podél X (odhad ~92 × Ø15 mm). */
function syringe([, D]) {
  const g = new THREE.Group();
  const r = D / 2 - 0.4, y = D / 2;
  const along = (geo) => geo.rotateZ(Math.PI / 2);
  add(g, along(new THREE.CylinderGeometry(r, r, 66, 32)), std(0xd8dade, { roughness: 0.35, transparent: true, opacity: 0.92 }), -2, y, 0);
  const tex = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f6fd1'; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = '#1b1c1f'; c.font = 'bold 80px Arial'; c.textAlign = 'center'; c.fillText('ARCTIC', w / 2, h * 0.38);
    c.fillStyle = '#fff'; c.font = 'bold 60px Arial'; c.fillText('MX-6  4 g', w / 2, h * 0.86);
  });
  add(g, along(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 40, 32, 1, true)), std(0xffffff, { map: tex, side: THREE.DoubleSide }), -2, y, 0);
  add(g, along(new THREE.CylinderGeometry(D / 2, D / 2, 2, 32)), M.white(), -36, y, 0);
  add(g, along(new THREE.CylinderGeometry(4, 4, 8, 16)), M.white(), -41, y, 0);
  add(g, along(new THREE.CylinderGeometry(2.2, r, 8, 24)), std(0xd8dade, { roughness: 0.35 }), 35, y, 0);
  add(g, along(new THREE.CylinderGeometry(3, 3, 7, 16)), std(0x1f6fd1), 42, y, 0);
  return g;
}

/** Arctic P12 PWM PST: rám 120 × 120 × 25, 5 lopatek, 4 vzpěry, otvory Ø4,3 s roztečí 105 mm, kabel s PST zásuvkou. */
function fan120([S, , T]) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const h = S / 2, c = 7;
  s.moveTo(-h + c, -h); s.lineTo(h - c, -h); s.quadraticCurveTo(h, -h, h, -h + c); s.lineTo(h, h - c); s.quadraticCurveTo(h, h, h - c, h);
  s.lineTo(-h + c, h); s.quadraticCurveTo(-h, h, -h, h - c); s.lineTo(-h, -h + c); s.quadraticCurveTo(-h, -h, -h + c, -h);
  s.holes.push(new THREE.Path().absarc(0, 0, h - 3, 0, Math.PI * 2, true));
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) s.holes.push(new THREE.Path().absarc(x * 52.5, z * 52.5, 2.15, 0, Math.PI * 2, true));
  const frame = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 32 });
  frame.rotateX(-Math.PI / 2);
  add(g, frame, M.black());
  for (const a of [Math.PI / 4, -Math.PI / 4]) { const b = add(g, new THREE.BoxGeometry(S - 10, 3, 3), M.black(), 0, 1.5, 0); b.rotation.y = a; }
  add(g, new THREE.CylinderGeometry(20, 20, T - 4, 40), M.black(), 0, T / 2, 0);
  rotor(g, h - 6, 5, T / 2, 0, 0, std(0x1b1c1f, { roughness: 0.5 }));
  decal(g, label([{ text: 'ARCTIC', font: 'bold 56px Arial', color: '#d9dbde' }, { text: 'P12 PWM PST', font: '600 40px Arial', color: '#9a9ea3' }], 256, 256, { bg: '#16171a' }), 30, 30, 0, T - 2, 0);
  cable(g, [[h - 4, h - 12], [h + 30, h + 6], [h + 40, h - 60], [h + 18, -h + 10]], 1.3);
  slab(g, 13, 6.2, 10.3, M.black(), h + 16, 0, -h + 2);
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

const BUILDERS = { tower, tesla, shroudAdapter, blower, k620, cpu, rdimm, m2ssd, m2adapter, psu, add2psu, epsCable, fanSplitter, pwmController, syringe, fan120, chip, connector, crt, speakers, gamepad };
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
  const tex = canvasTex(3200, 280, (c) => {
    c.fillStyle = '#c7ccd2'; c.fillRect(0, 0, 3200, 280);
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
