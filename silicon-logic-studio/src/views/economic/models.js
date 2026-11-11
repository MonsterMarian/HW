// 3D modely dílů "jak z obchodu" pro ECONOMIC view. Vše v MILIMETRECH, y = 0 je stůl,
// počátek = střed půdorysu. Parametrické modely berou rozměry z kusovníku (item.dims).
// Karty leží na stole bokem nahoru (plošný spoj dole), délka karty = osa X, výška karty = osa Z,
// záslepka je na -X, hranový konektor na +Z.
//
// Zdroje rozměrů a detailů (rešerše 10. 11. 2026):
//  Dell T5810  – Owner's Manual (tabulka Physical, obr. 1 Front and Back View); polohy na čele odměřené z obrázku
//  Tesla P100  – NVIDIA PB-08248-001 (EPS 8 pin na "East edge", nápis TESLA u záslepky, lišty se 4 šrouby)
//  RDIMM       – Samsung M393A1G40EB1 datasheet (PCB 1,4 mm, 9 + 9 čipů, RCD uprostřed, klíč 64,6 mm)
//  K620        – NVIDIA datasheet 75509 (68,9 × 160 mm), 870 EVO – Samsung datasheet (100 × 69,85 × 6,8 mm); Xeon IHS – Intel TMSDG 330786
//  P12         – arctic.de (5 lopatek, kabel 400 mm, PST), 030-0571-000 – NVIDIA PB-08248 obr. 4 (vodiče 70 ± 20 mm), Mini-Fit Jr – RS 39-01-2080
// Odhady (bez výkresu): rozmístění čela Dellu ±5 mm, MX-6 stříkačka. Kontakty PCIe podle CEM 3.0.
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
function rotor(g, r, blades, y, x = 0, z = 0, mat = M.black(), hub = 0.38, tilt = 0.45) {
  add(g, new THREE.CylinderGeometry(r * hub, r * hub, 2, 32), mat, x, y, z);
  const blade = new THREE.BoxGeometry(r * (1 - hub) * 0.95, 1, r * 0.34);
  blade.translate(r * hub + (r * (1 - hub) * 0.95) / 2, 0, 0);
  const mats = [];
  for (let i = 0; i < blades; i++) {
    const m = mat4(x, y - 0.4, z, (i / blades) * Math.PI * 2);
    m.multiply(new THREE.Matrix4().makeRotationX(tilt));
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
  for (let i = 0; i < 7; i++) add(g, new THREE.BoxGeometry(110, 15, 0.8), M.steel(), XB(88), Y(228 + i * 20.32), bz); // rozteč slotů PCI/PCIe 0,8"
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
  vDecal(g, nv, 56, 14, 0, (yS + T) / 2, sz0 - 0.05, Math.PI).rotation.z = Math.PI; // čitelné po instalaci do toweru (chladičem dolů)
  // "East edge": otevřený konec žebrování + EPS 8 pin mířící podélně ven
  const fin = new THREE.BoxGeometry(0.8, T - yS - 4, 1.0);
  const fins = [];
  for (let z = sz0 + 26; z < sz1 - 3; z += 2.4) fins.push(mat4(L / 2 + 0.2, yS + (T - yS) / 2, z));
  add(g, new THREE.BoxGeometry(0.3, T - yS - 3, sd - 28), M.hole(), L / 2 + 0.05, yS + (T - yS) / 2, sc + 12);
  g.add(instanced(fin, M.shroud(), fins));
  miniFit(g, 18, 9.6, 19.6, L / 2 + 6, sz0 + 12, M.black(), 0);
  g.children[g.children.length - 1].position.y += 3.1;
  g.children[g.children.length - 2].position.y += 3.1;
  // PCIe x16: B1 45,65 mm od zadní hrany desky (CEM 3.0: datum X 57,15 mm, B1 11,50 mm před ním), klíč po B11
  edgeFingers(g, -L / 2 + 45.65, 82, 1, H / 2 - 4, 7.5, 3.15, 11);
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
  const Tb = T - 1.6; // oběžné kolo v sání drží celkovou výšku 33 mm
  rslab(g, L, Tb, D, 4, M.black(), 0, 0, 0);
  add(g, new THREE.CylinderGeometry(30, 30, 0.5, 48), M.hole(), 6, Tb + 0.1, 6);
  rotor(g, 28, 30, Tb + 0.9, 6, 6, std(0x3a3c40, { roughness: 0.6 }), 0.45, 0.06);
  decal(g, label([{ text: 'DELTA', font: 'bold 70px Arial', color: '#bfc3c8' }, { text: 'BFB1012VH 12V', font: '600 34px Arial', color: '#8d9197' }], 256, 256), 22, 22, 6, Tb + 1.95, 6);
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
  rotor(g, 23, 9, T - 1.4, 8, -4, std(0x3a3c40), 0.42, 0.08);
  decal(g, label([{ text: 'NVIDIA', font: 'bold 60px Arial', color: '#8fb33a' }, { text: 'QUADRO K620', font: 'bold 70px Arial', color: '#c9cdd2' }], 1024, 256), 40, 10, -46, T - 2.85, -4);
  edgeFingers(g, -L / 2 + 45.65, 82, 1, H / 2 - 4, 7.5, 1.65, 11);
  bracket(g, -L / 2 - 0.5, -H / 2 - 5, 79.2, 18.4, [
    (gg, x) => { slab(gg, 9, 12, 39, M.white(), x + 4.5, 2, -H / 2 + 26); slab(gg, 0.4, 8, 31, M.hole(), x - 0.5, 4, -H / 2 + 26); }, // DVI-I
    (gg, x) => { slab(gg, 9, 5.4, 16, M.steel(), x + 4.5, 5.6, -H / 2 + 58); slab(gg, 0.4, 3.8, 13.5, M.hole(), x - 0.5, 6.4, -H / 2 + 58); }, // DisplayPort
  ]);
  return g;
}

/** Xeon FCLGA2011-3 (Small): substrát 52,5 × 45 mm, plocha IHS 40,5 × 36,74 mm, výška ≈ 5,08 mm (Intel TMSDG 330786). */
function cpu([L, W, H], { marking, ihs = [40.5, 36.74], sub = 1.3 }) {
  const g = new THREE.Group();
  slab(g, L, sub, W, std(0x2f5a3b, { roughness: 0.5 }), 0, 0, 0);
  rslab(g, ihs[0], H - sub, ihs[1], 1.5, M.silver(), 0, sub, 0); // plocha IHS (Xeon: 40,5 × 36,74 mm, Intel TMSDG 330786, Small)
  decal(g, label(marking.map((t, i) => ({ text: t, font: `${i === 1 ? 'bold 64' : '600 42'}px Arial`, color: '#3a3d42' })), 512, 384), ihs[0] * 0.84, ihs[1] * 0.68, 0, H, 0);
  const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(4, 0); tri.lineTo(0, 4); tri.closePath();
  add(g, new THREE.ShapeGeometry(tri).rotateX(-Math.PI / 2), M.gold(), -L / 2 + 1, 1.32, W / 2 - 1);
  return g;
}

/** Deska modulu DDR4 DIMM (133,35 × 31,25 mm) s klíčem, výřezy pro západky a 2 × 144 kontakty; hrana kontaktů = +Z. */
function dimmPcb(g, L, W, pcbT, pcbY, x0z = 0) {
  const s = new THREE.Shape();
  const x0 = -L / 2, x1 = L / 2, zt = -W / 2 + x0z, zb = W / 2 + x0z, key = x0 + 64.6, latchZ = zb - 17.6;
  s.moveTo(x0, zt); s.lineTo(x1, zt); s.lineTo(x1, latchZ - 1.3); s.lineTo(x1 - 2.1, latchZ - 1.3); s.lineTo(x1 - 2.1, latchZ + 1.3); s.lineTo(x1, latchZ + 1.3);
  s.lineTo(x1, zb); s.lineTo(key + 0.75, zb); s.lineTo(key + 0.75, zb - 3.85); s.lineTo(key - 0.75, zb - 3.85); s.lineTo(key - 0.75, zb);
  s.lineTo(x0, zb); s.lineTo(x0, latchZ + 1.3); s.lineTo(x0 + 2.1, latchZ + 1.3); s.lineTo(x0 + 2.1, latchZ - 1.3); s.lineTo(x0, latchZ - 1.3); s.closePath();
  const pcb = new THREE.ExtrudeGeometry(s, { depth: pcbT, bevelEnabled: false });
  pcb.rotateX(Math.PI / 2);
  add(g, pcb, M.pcbGreen(), 0, pcbY + pcbT, 0);
  const left = Math.floor((64.6 - 0.75 - 3.35) / 0.85);
  for (const y of [pcbY + pcbT + 0.03, pcbY - 0.03]) {
    edgeFingers(g, x0 + 3.35, left, 0.85, zb - 2, 3.5, y);
    edgeFingers(g, key + 1.2, 144 - left, 0.85, zb - 2, 3.5, y);
  }
}

/** DDR4 RDIMM 1Rx4: PCB 133,35 × 31,25 × 1,4 mm, 9 + 9 čipů 78FBGA, RCD uprostřed, klíč 64,6 mm. */
function rdimm([L, W, T]) {
  const g = new THREE.Group();
  const pcbT = 1.4, pcbY = (T - pcbT) / 2;
  const x0 = -L / 2;
  dimmPcb(g, L, W, pcbT, pcbY);
  const chip = new THREE.BoxGeometry(7.5, 1.2, 11);
  const z = -3.5, top = pcbY + pcbT + 0.6, bot = pcbY - 0.6;
  const front = [0, 1, 2, 3, 4].map((i) => x0 + 8 + i * 12.4).concat([0, 1, 2, 3].map((i) => x0 + 86 + i * 12.4));
  const back = [0, 1, 2, 3].map((i) => x0 + 8 + i * 12.4).concat([0, 1, 2, 3, 4].map((i) => x0 + 74 + i * 12.4));
  g.add(instanced(chip, M.chip(), front.map((x) => mat4(x, top, z))), instanced(chip, M.chip(), back.map((x) => mat4(x, bot, z))));
  slab(g, 9, 1.0, 9, M.chip(), x0 + 72.5, pcbY + pcbT, z); // registrový budič (RCD)
  decal(g, label([{ text: '8GB 1Rx4 PC4-2400T-RC1', font: 'bold 44px Arial', color: '#222' }, { text: 'ECC REGISTERED', font: '600 34px Arial', color: '#444' }], 512, 128, { bg: '#ecebe6' }), 34, 8.5, x0 + 105, pcbY + pcbT + 1.21, z);
  return g;
}

/** 2,5" SATA SSD (Samsung 870 EVO): černé pouzdro, štítek, konektor SATA data 7 pin + napájení 15 pin na kratší hraně. */
function ssd25([L, W, H]) {
  const g = new THREE.Group();
  rslab(g, L, H, W, 1.2, std(0x1a1b1e, { metalness: 0.4, roughness: 0.45 }), 0, 0, 0);
  decal(g, label([{ text: 'SAMSUNG', font: 'bold 64px Arial', color: '#e8e8e8' }, { text: 'SSD 870 EVO', font: '600 50px Arial', color: '#c9cdd2' }, { text: '1TB · SATA III', font: '600 34px Arial', color: '#8d9197' }], 512, 320, { bg: '#2a2c30' }), L * 0.62, W * 0.62, -L * 0.08, H, 0);
  // konektory na hraně +X (pohled zepředu: data 7 pin vlevo, napájení 15 pin vpravo); otvory pro šrouby po stranách
  slab(g, 0.6, 3.2, 10.5, M.hole(), L / 2 + 0.05, 1.8, -W / 2 + 14);
  slab(g, 0.6, 3.2, 22.5, M.hole(), L / 2 + 0.05, 1.8, W / 2 - 22);
  for (const x of [-L / 2 + 14, L / 2 - 24]) for (const sz of [-1, 1]) add(g, new THREE.CylinderGeometry(1.5, 1.5, 0.4, 12).rotateX(Math.PI / 2), M.hole(), x, H / 2, sz * (W / 2 + 0.05));
  return g;
}

/** ATX zdroj 150 × 86 × 140 mm (Seasonic Core GX-650 ATX 3 a podobné): ventilátor 120 mm nahoře, plně modulární. */
function psu([W, D, H], { marking = ['SEASONIC', 'CORE GX-650  80+ GOLD'], modular = true } = {}) {
  const g = new THREE.Group();
  const Hb = H - 3.5; // mřížka ventilátoru drží celkovou výšku 86 mm
  rslab(g, W, Hb, D, 2, M.black(), 0, 0, 0);
  add(g, new THREE.CylinderGeometry(58, 58, 0.6, 64), M.hole(), 0, Hb + 0.1, 0);
  rotor(g, 56, 7, Hb + 0.9, 0, 0, std(0x34363a), 0.38, 0.08);
  const wire = std(0x2a2b2e, { metalness: 0.7, roughness: 0.4 });
  for (const r of [16, 28, 40, 52, 58]) add(g, new THREE.TorusGeometry(r, 0.9, 6, 64).rotateX(Math.PI / 2), wire, 0, Hb + 2.6, 0); // drátěná mřížka nad ventilátorem
  for (const a of [0, Math.PI / 2]) { const b = add(g, new THREE.BoxGeometry(116, 1.6, 2), wire, 0, Hb + 2.6, 0); b.rotation.y = a; }
  decal(g, label([{ text: marking[0], font: 'bold 54px Arial', color: '#d5d8dc' }, { text: marking[1], font: '600 32px Arial', color: '#c8a85a' }], 512, 128), 34, 8.5, 0, Hb + 1.95, 0);
  // záda: voština, IEC C14, vypínač, tlačítko Hybrid
  vDecal(g, hexMesh(560, 320, 16), W - 52, H - 14, 18, H / 2, -D / 2 - 0.1, Math.PI);
  add(g, new THREE.BoxGeometry(28, 22, 4), M.plastic(), -W / 2 + 26, H / 2 + 8, -D / 2 - 2);
  add(g, new THREE.BoxGeometry(20, 10, 0.4), M.hole(), -W / 2 + 26, H / 2 + 8, -D / 2 - 4.1);
  add(g, new THREE.BoxGeometry(13, 8, 4), M.black(), -W / 2 + 26, H / 2 - 14, -D / 2 - 2);
  add(g, new THREE.CylinderGeometry(3, 3, 3, 16).rotateX(Math.PI / 2), M.silver(), -W / 2 + 26, 10, -D / 2 - 1.5);
  if (!modular) { // pevné ploché kabely svazkem z čela (24 pin, EPS, 2× PCIe, SATA, Molex)
    add(g, new THREE.CylinderGeometry(9, 9, 6, 20).rotateX(Math.PI / 2), M.black(), -W / 2 + 40, H / 2, D / 2 + 3);
    for (let i = 0; i < 6; i++) cable(g, [[-W / 2 + 34 + i * 2.5, D / 2 + 4], [-W / 2 + 30 + i * 14, D / 2 + 60], [-W / 2 + 10 + i * 26, D / 2 + 140 + (i % 2) * 30]], 2.6, M.black(), 4 + i * 1.2);
    return g;
  }
  // čelo: modulární zásuvky – rozložení je odhad (Core GX-650 má 24 pin, 2× CPU, 1 kabel se 2× PCIe 6+2, 12V-2x6, SATA/Molex)
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

/** Redukce 2× PCIe 8 pin (zásuvka) → EPS 8 pin (zástrčka), NVIDIA 030-0571-000, vodiče 70 ± 20 mm (PB-08248 obr. 4). */
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

/** ModDIY TD404: deska 63 × 32 mm, potenciometr s knoflíkem (výška 20,3 mm), 4× konektor ventilátoru, SATA přívod. */
function pwmController([L, W, H]) {
  const g = new THREE.Group();
  slab(g, L, 1.6, W, M.pcbBlack(), 0, 0, 0);
  slab(g, 10, 6.5, 11, std(0x2457a8), -L / 2 + 10, 1.6, 0); // potenciometr
  add(g, new THREE.CylinderGeometry(7, 7.4, H - 8.1, 28), M.black(), -L / 2 + 10, 8.1 + (H - 8.1) / 2, 0);
  add(g, new THREE.BoxGeometry(1.2, 0.3, 5), M.white(), -L / 2 + 10, H + 0.1, -3.5); // ryska knoflíku
  // 4 konektory ventilátoru (KF2510 4 pin, rozteč 2,54) ve dvou řadách podél dlouhých hran
  for (const [x, z] of [[2, -W / 2 + 3.2], [18, -W / 2 + 3.2], [2, W / 2 - 3.2], [18, W / 2 - 3.2]]) {
    slab(g, 10.2, 6, 4.9, M.white(), x, 1.6, z);
    for (let k = 0; k < 4; k++) slab(g, 0.64, 1, 0.64, M.gold(), x - 3.8 + k * 2.54, 7.6, z);
  }
  slab(g, 4, 1.6, 2.4, std(0x3fa65a, { emissive: 0x1a5a2a }), L / 2 - 4, 1.6, 0); // LED
  // přívod SATA: kabel a konektor 15 pin
  cable(g, [[L / 2, 0], [L / 2 + 25, 4], [L / 2 + 45, 18]], 2.2);
  slab(g, 8, 6, 22, M.black(), L / 2 + 49, 0, 22);
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
function fan120([S, , T], { marking = ['ARCTIC', 'P12 PWM PST'], blades = 5 } = {}) {
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
  rotor(g, h - 6, blades, T / 2, 0, 0, std(0x1b1c1f, { roughness: 0.5 }));
  decal(g, label([{ text: marking[0], font: 'bold 56px Arial', color: '#d9dbde' }, { text: marking[1], font: '600 40px Arial', color: '#9a9ea3' }], 256, 256, { bg: '#16171a' }), 30, 30, 0, T - 2, 0);
  cable(g, [[h - 4, h - 12], [h + 30, h + 6], [h + 40, h - 60], [h + 18, -h + 10]], 1.3);
  slab(g, 13, 6.2, 10.3, M.black(), h + 16, 0, -h + 2);
  return g;
}

// ---------------------------------------------------------------- můj PC (díly zjištěné diagnostikou)
/** M.2 2280 NVMe SSD: deska 80,15 × 22,15 mm, klíč M u kontaktů (+X), půlkruhový výřez pro šroub (-X), štítek přes čipy. */
function m2ssd([L, W, T], { marking = [] } = {}) {
  const g = new THREE.Group();
  const pcbT = 0.8, x0 = -L / 2, x1 = L / 2, keyZ = 6.125; // klíč M (piny 59–66): střed výřezu 6,125 mm od osy karty
  const s = new THREE.Shape();
  s.moveTo(x0, -W / 2); s.lineTo(x1, -W / 2); s.lineTo(x1, keyZ - 0.6); s.lineTo(x1 - 4.2, keyZ - 0.6); s.lineTo(x1 - 4.2, keyZ + 0.6); s.lineTo(x1, keyZ + 0.6);
  s.lineTo(x1, W / 2); s.lineTo(x0, W / 2); s.lineTo(x0, 1.75); s.absarc(x0, 0, 1.75, Math.PI / 2, -Math.PI / 2, true); s.closePath();
  const pcb = new THREE.ExtrudeGeometry(s, { depth: pcbT, bevelEnabled: false });
  pcb.rotateX(Math.PI / 2);
  add(g, pcb, M.pcbBlack(), 0, pcbT, 0);
  // čipy pod štítkem: řadič, DRAM, NAND (výška do T)
  slab(g, 15, T - pcbT - 0.12, 15, M.chip(), x1 - 22, pcbT, 0);
  slab(g, 10, T - pcbT - 0.32, 12, M.chip(), x1 - 38, pcbT, 0);
  slab(g, 16, T - pcbT - 0.12, 18, M.chip(), x0 + 32, pcbT, 0);
  // měděný štítek Samsungu přes celou osazenou plochu
  const lbl = canvasTex(1024, 288, (c, w, h) => {
    c.fillStyle = '#1a1a1c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e9e9e9'; c.font = 'bold 74px Arial'; c.textBaseline = 'middle'; c.fillText(marking[0] || '', 40, h * 0.3);
    c.font = '600 54px Arial'; c.fillStyle = '#c9cdd2'; c.fillText(marking[1] || '', 40, h * 0.62);
    c.font = '600 34px Arial'; c.fillStyle = '#8d9197'; c.fillText(marking[2] || '', 40, h * 0.86);
  });
  slab(g, 66, 0.12, W - 1, std(0x1a1a1c, { map: lbl, roughness: 0.5 }), x0 + 37, T - 0.12, 0).material = [M.black(), M.black(), std(0xffffff, { map: lbl, roughness: 0.5 }), M.black(), M.black(), M.black()];
  const pads = Math.floor((W - 2) / 0.5);
  const geo = new THREE.BoxGeometry(3.8, 0.04, 0.3);
  const m = [];
  for (let i = 0; i < pads; i++) { const z = -W / 2 + 1 + i * 0.5; if (Math.abs(z - keyZ) > 0.9) m.push(mat4(x1 - 2.1, pcbT + 0.02, z)); }
  g.add(instanced(geo, M.gold(), m));
  return g;
}

/** DDR4 UDIMM s chladičem (HyperX Fury): modul leží jako RDIMM, kontakty k +Z, chladič na obou stranách. */
function udimm([L, W, T], { marking = ['HyperX', 'FURY'], pcbH = 31.25, color = 0x141518 } = {}) {
  const g = new THREE.Group();
  const pcbT = 1.27, pcbY = (T - pcbT) / 2, zOff = (W - pcbH) / 2; // chladič přesahuje desku nahoru (-Z)
  dimmPcb(g, L, pcbH, pcbT, pcbY, zOff);
  const plateT = (T - pcbT) / 2 - 0.9;
  const zt = -W / 2, zb = W / 2 - 8.5; // spodek chladiče nad kontakty
  // horní hrana s asymetrickými „zuby“ (Fury): profil v rovině XZ, vytlačený do tloušťky plechu
  const s = new THREE.Shape();
  const x0 = -L / 2 + 1, x1 = L / 2 - 1;
  s.moveTo(x0, zb); s.lineTo(x1, zb); s.lineTo(x1, zt + 3);
  for (let i = 0; i < 9; i++) { const xa = x1 - 8 - i * 13.2; s.lineTo(xa + 4, zt + 3); s.lineTo(xa, zt); s.lineTo(xa - 6, zt); s.lineTo(xa - 8, zt + 3); }
  s.lineTo(x0, zt + 3); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: plateT, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  const mat = std(color, { metalness: 0.55, roughness: 0.42 });
  add(g, geo.clone(), mat, 0, pcbY + pcbT + 0.9 + plateT, 0);
  add(g, geo, mat, 0, pcbY - 0.9, 0);
  decal(g, label([{ text: marking[0], font: 'bold 80px Arial', color: '#e9e9e9' }, { text: marking[1], font: 'bold 64px Arial', color: '#e9e9e9' }], 512, 220), 34, 14, -L / 2 + 28, pcbY + pcbT + 0.9 + plateT, -2);
  if (marking[2]) decal(g, label([{ text: marking[2], font: '600 30px Arial', color: '#9a9ea3' }], 512, 64), 50, 6, 26, pcbY + pcbT + 0.9 + plateT, 6);
  return g;
}

/** Boxový chladič Intel: černý kryt ventilátoru, hliníková radiální žebra, 4 plastové nožičky (rozteč 75 mm), kabel 4 pin. */
function boxCooler([D, , H], { core = 'copper' } = {}) {
  const g = new THREE.Group();
  const finH = H - 18; // žebra pod ventilátorem
  add(g, new THREE.CylinderGeometry(15, 15, 2.4, 32), core === 'copper' ? std(0xc77a3a, { metalness: 0.9, roughness: 0.3 }) : M.silver(), 0, 1.2, 0);
  add(g, new THREE.CylinderGeometry(14, 14, finH, 32), core === 'copper' ? std(0xc77a3a, { metalness: 0.9, roughness: 0.3 }) : M.silver(), 0, finH / 2, 0);
  const fin = new THREE.BoxGeometry(D / 2 - 16, finH - 2, 0.6);
  fin.translate((D / 2 - 16) / 2 + 14, 0, 0);
  const fins = [];
  for (let i = 0; i < 50; i++) { const m = mat4(0, finH / 2 + 1, 0, (i / 50) * Math.PI * 2); m.multiply(new THREE.Matrix4().makeRotationY(0.35)); fins.push(m); }
  g.add(instanced(fin, M.silver(), fins));
  // kryt ventilátoru: čtverec se zkosenými rohy a kruhovým otvorem
  const s = new THREE.Shape();
  const h = D / 2, c = 14;
  s.moveTo(-h + c, -h); s.lineTo(h - c, -h); s.lineTo(h, -h + c); s.lineTo(h, h - c); s.lineTo(h - c, h); s.lineTo(-h + c, h); s.lineTo(-h, h - c); s.lineTo(-h, -h + c); s.closePath();
  s.holes.push(new THREE.Path().absarc(0, 0, h - 5, 0, Math.PI * 2, true));
  const shroud = new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: false, curveSegments: 40 });
  shroud.rotateX(-Math.PI / 2);
  add(g, shroud, M.black(), 0, finH, 0);
  rotor(g, h - 7, 7, finH + 9, 0, 0, std(0x1b1c1f, { roughness: 0.5 }), 0.4, 0.4);
  decal(g, canvasTex(256, 256, (cx, w) => {
    cx.fillStyle = '#e9e9e9'; cx.beginPath(); cx.arc(w / 2, w / 2, w / 2 - 4, 0, 7); cx.fill();
    cx.fillStyle = '#0068b5'; cx.font = 'bold 72px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('intel', w / 2, w / 2);
  }), 30, 30, 0, finH + 10.2, 0);
  // nožičky: černé tělo + bílý zámek nahoře, rozteč 75 × 75 mm
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    add(g, new THREE.CylinderGeometry(3.2, 3.2, finH + 6, 16), M.black(), x * 37.5, (finH + 6) / 2 - 4, z * 37.5);
    add(g, new THREE.CylinderGeometry(3.4, 3.4, 4, 16), M.white(), x * 37.5, finH + 4, z * 37.5);
  }
  cable(g, [[h - 8, -h + 20], [h + 20, -h + 10], [h + 40, -h - 10]], 1.3);
  slab(g, 10, 6, 5, M.white(), h + 44, 0, -h - 14);
  return g;
}

/** Myš: protáhlý trup (horní polovina elipsoidu), dvě tlačítka, kolečko, kabel; délka X, výška Y, šířka Z. */
function mouse([L, W, H], { color = 0x18191c, rgb = 0xde3b3d } = {}) {
  const g = new THREE.Group();
  const body = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const m = add(g, body, std(color, { roughness: 0.6 }), 0, 0, 0);
  m.scale.set(L / 2, H, W / 2);
  add(g, new THREE.BoxGeometry(L * 0.38, 0.5, 0.8), M.hole(), L * 0.2, H * 0.88, 0); // dělicí čára tlačítek
  const wheel = add(g, new THREE.CylinderGeometry(4, 4, 6, 24).rotateX(Math.PI / 2), std(0x2b2d31, { roughness: 0.9 }), L * 0.28, H * 0.86, 0);
  wheel.material.emissive = new THREE.Color(rgb); wheel.material.emissiveIntensity = 0.25;
  slab(g, L * 0.3, 0.6, 1.2, std(rgb, { emissive: rgb, emissiveIntensity: 0.8 }), -L * 0.15, 0.1, W / 2 - 0.6).rotation.y = 0.04; // RGB proužek po boku
  for (const z of [-1, 1]) slab(g, 10, 2, 4, std(0x2b2d31), L * 0.05, H * 0.45, z * (W / 2 - 1.2)).visible = z > 0; // boční tlačítka (levá strana)
  cable(g, [[L / 2, 0], [L / 2 + 40, 6], [L / 2 + 90, -10], [L / 2 + 140, 0]], 1.6);
  slab(g, 30, 8, 14, std(0x2b2d31), L / 2 + 160, 0, 0); // USB-A
  return g;
}

/** USB kondenzátorový mikrofon na trojnožce (typ TC-777): tělo Ø47 mm se síťkou, držák, tři nohy; dims [rozpětí, rozpětí, výška]. */
function usbMic([S, , H]) {
  const g = new THREE.Group();
  const bodyL = 150, r = 23.5, hub = H - bodyL * 0.8 - 30; // kloub trojnožky
  for (let i = 0; i < 3; i++) { // nohy z kloubu k zemi
    const a = (i / 3) * Math.PI * 2, end = new THREE.Vector3(Math.cos(a) * (S / 2 - 6), 3, Math.sin(a) * (S / 2 - 6));
    const top = new THREE.Vector3(0, hub, 0), mid = top.clone().add(end).multiplyScalar(0.5);
    const leg = add(g, new THREE.CylinderGeometry(3, 4, top.distanceTo(end), 12), M.black(), mid.x, mid.y, mid.z);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(top).normalize());
    add(g, new THREE.SphereGeometry(5, 12, 8), std(0x0f1012, { roughness: 0.9 }), end.x, 4, end.z);
  }
  add(g, new THREE.CylinderGeometry(6, 6, 30, 16), M.black(), 0, hub + 15, 0); // krk s kloubem
  const body = new THREE.Group();
  body.position.set(0, hub + 30, 0);
  body.rotation.z = 0.25; // mírně nakloněný
  g.add(body);
  add(body, new THREE.CylinderGeometry(r, r * 0.85, bodyL * 0.6, 40), std(0x18191c, { metalness: 0.6, roughness: 0.35 }), 0, bodyL * 0.3, 0);
  add(body, new THREE.CylinderGeometry(r + 0.5, r + 0.5, bodyL * 0.38, 40, 1, true), std(0x2b2d31, { map: hexMesh(256, 256, 10, '#2b2d31', '#070708'), metalness: 0.7, roughness: 0.4 }), 0, bodyL * 0.79, 0); // síťka kapsle
  add(body, new THREE.SphereGeometry(r + 0.5, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x2b2d31, { metalness: 0.7, roughness: 0.4 }), 0, bodyL * 0.98, 0);
  add(body, new THREE.TorusGeometry(r + 1, 1.2, 8, 40).rotateX(Math.PI / 2), M.silver(), 0, bodyL * 0.6, 0);
  cable(g, [[0, 0], [60, 40], [140, 30], [200, 60]], 1.8);
  slab(g, 30, 8, 14, std(0x2b2d31), 220, 0, 60); // USB-A
  return g;
}

/** Klávesnice full-size (ANSI 104 kláves, rozteč 19,05 mm) s mediálními klávesami a kolečkem hlasitosti; délka X, hloubka Z. */
const KB_ROWS = [
  // [x, y, w, h, popisek] v jednotkách klávesy (u), y = řada (0 = F řada)
  [[0, 0, 1, 1, 'Esc'], ...[...Array(12)].map((_, i) => [2 + i + Math.floor(i / 4) * 0.5, 0, 1, 1, `F${i + 1}`]), [15.25, 0, 1, 1, 'PrtSc'], [16.25, 0, 1, 1, 'ScrLk'], [17.25, 0, 1, 1, 'Pause']],
  [...'`1234567890-='.split('').map((k, i) => [i, 1.5, 1, 1, k]), [13, 1.5, 2, 1, 'Backspace'], [15.25, 1.5, 1, 1, 'Ins'], [16.25, 1.5, 1, 1, 'Home'], [17.25, 1.5, 1, 1, 'PgUp'], [18.5, 1.5, 1, 1, 'Num'], [19.5, 1.5, 1, 1, '/'], [20.5, 1.5, 1, 1, '*'], [21.5, 1.5, 1, 1, '-']],
  [[0, 2.5, 1.5, 1, 'Tab'], ...'QWERTYUIOP[]'.split('').map((k, i) => [1.5 + i, 2.5, 1, 1, k]), [13.5, 2.5, 1.5, 1, '\\'], [15.25, 2.5, 1, 1, 'Del'], [16.25, 2.5, 1, 1, 'End'], [17.25, 2.5, 1, 1, 'PgDn'], [18.5, 2.5, 1, 1, '7'], [19.5, 2.5, 1, 1, '8'], [20.5, 2.5, 1, 1, '9'], [21.5, 2.5, 1, 2, '+']],
  [[0, 3.5, 1.75, 1, 'Caps'], ...'ASDFGHJKL;\''.split('').map((k, i) => [1.75 + i, 3.5, 1, 1, k]), [12.75, 3.5, 2.25, 1, 'Enter'], [18.5, 3.5, 1, 1, '4'], [19.5, 3.5, 1, 1, '5'], [20.5, 3.5, 1, 1, '6']],
  [[0, 4.5, 2.25, 1, 'Shift'], ...'ZXCVBNM,./'.split('').map((k, i) => [2.25 + i, 4.5, 1, 1, k]), [12.25, 4.5, 2.75, 1, 'Shift'], [16.25, 4.5, 1, 1, '↑'], [18.5, 4.5, 1, 1, '1'], [19.5, 4.5, 1, 1, '2'], [20.5, 4.5, 1, 1, '3'], [21.5, 4.5, 1, 2, 'Ent']],
  [[0, 5.5, 1.25, 1, 'Ctrl'], [1.25, 5.5, 1.25, 1, 'Win'], [2.5, 5.5, 1.25, 1, 'Alt'], [3.75, 5.5, 6.25, 1, ''], [10, 5.5, 1.25, 1, 'Alt'], [11.25, 5.5, 1.25, 1, 'Fn'], [12.5, 5.5, 1.25, 1, 'Menu'], [13.75, 5.5, 1.25, 1, 'Ctrl'], [15.25, 5.5, 1, 1, '←'], [16.25, 5.5, 1, 1, '↓'], [17.25, 5.5, 1, 1, '→'], [18.5, 5.5, 2, 1, '0'], [20.5, 5.5, 1, 1, '.']],
].flat();
export const KB_KEY_COUNT = KB_ROWS.length;

function keyboard([L, D, H], { marking = 'ROG', rest = null, accent = 0xde3b3d } = {}) {
  const g = new THREE.Group();
  const u = 19.05, cap = 7.5, plateY = H - cap - 2; // klávesy vystupují nad horní plech
  const caseD = rest ? D - rest : D;
  const z0 = -D / 2; // zadní hrana
  // tělo: klín (vzadu vyšší) z vytlačeného profilu v rovině YZ
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(caseD, 0); s.lineTo(caseD, plateY - 6); s.lineTo(caseD - 6, plateY); s.lineTo(4, plateY + 3); s.lineTo(0, plateY - 2); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 2 });
  body.rotateY(-Math.PI / 2); // tvar (z, y) → vytlačení podél -X
  add(g, body, std(0x1a1b1e, { metalness: 0.5, roughness: 0.45 }), L / 2, 0, z0);
  const kx0 = -L / 2 + (L - 22.5 * u) / 2, kz0 = z0 + 26; // levý zadní roh pole kláves
  const capGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
  const caps = KB_ROWS.map(([x, y, w, h]) => mat4(kx0 + (x + w / 2) * u, plateY + 1 + cap / 2, kz0 + (y + h / 2) * u, 0, w * u - 2.2, cap, h * u - 2.2));
  g.add(instanced(capGeo, std(0x141518, { roughness: 0.55 }), caps));
  // popisky kláves jedním obtiskem nad celým polem (podsvícení RGB)
  const cols = 22.5, rows = 6.5, PX = 48;
  const tex = canvasTex(cols * PX, rows * PX, (c) => {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const [x, y, w, h, t] of KB_ROWS) {
      c.fillStyle = `hsl(${(x / cols) * 300},90%,62%)`;
      c.font = `600 ${t.length > 2 ? 11 : 17}px Arial`;
      c.fillText(t, (x + w / 2) * PX, (y + 0.32 + (h - 1) / 2) * PX, w * PX - 6);
    }
  });
  decal(g, tex, cols * u, rows * u, kx0 + (cols * u) / 2, plateY + 1 + cap, kz0 + (rows * u) / 2, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6 });
  // podsvícení pod klávesami
  slab(g, cols * u, 0.4, rows * u, std(accent, { emissive: accent, emissiveIntensity: 0.35 }), kx0 + (cols * u) / 2, plateY + 0.2, kz0 + (rows * u) / 2);
  // vlevo nahoře mediální klávesy + široký váleček hlasitosti, vpravo nahoře průsvitný odznak ROG (vyměnitelný)
  for (let i = 0; i < 6; i++) slab(g, 9, 4, 6, std(0x2b2d31), -L / 2 + 16 + i * 12, plateY, z0 + 12);
  add(g, new THREE.CylinderGeometry(6, 6, 36, 32).rotateZ(Math.PI / 2), std(0x2b2d31, { metalness: 0.6, roughness: 0.3 }), -L / 2 + 110, plateY + 2, z0 + 12);
  add(g, new THREE.BoxGeometry(30, 3, 14), new THREE.MeshPhysicalMaterial({ map: label([{ text: marking, font: 'bold 64px Arial', color: '#ffffff' }], 256, 128), transparent: true, emissive: accent, emissiveIntensity: 0.3, transmission: 0.3, roughness: 0.2 }), L / 2 - 30, plateY + 1.5, z0 + 12);
  for (const sx of [-1, 1]) slab(g, 2, 3, caseD - 20, std(accent, { emissive: accent, emissiveIntensity: 0.9 }), sx * (L / 2 + 0.6), 1, z0 + caseD / 2); // podsvícení po bocích
  cable(g, [[0, z0 + 2], [10, z0 - 40], [-30, z0 - 90], [-80, z0 - 110]], 2.4);
  slab(g, 32, 8, 14, std(0x2b2d31), -100, 0, z0 - 116);
  if (rest) { // odnímatelná opěrka zápěstí
    rslab(g, L - 4, plateY - 4, rest - 4, 4, std(0x18191c, { roughness: 0.85 }), 0, 0, D / 2 - rest / 2);
  }
  return g;
}

/** Monitor na stojanu: panel W × H (s rámečkem), tloušťka t, krk a podstavec; obrazovka čelem k +Z. */
function monitor([W, H, D], { t = 50, panelH = 327, base = [220, 165], round = false, marking = 'ASUS', screen = [527, 296.5] } = {}) {
  const g = new THREE.Group();
  const y0 = H - panelH; // spodní hrana panelu nad stolem
  const zP = D / 2 - t / 2 - 40; // panel vpředu nad podstavcem
  // podstavec
  if (round) add(g, new THREE.CylinderGeometry(base[0] / 2, base[0] / 2 + 2, 10, 64), std(0x16171a, { roughness: 0.5 }), 0, 5, 0).scale.z = base[1] / base[0];
  else rslab(g, base[0], 10, base[1], 4, std(0x16171a, { roughness: 0.5 }), 0, 0, 0);
  // krk: sklopený nosník od podstavce k zadní straně panelu
  const neck = add(g, new THREE.BoxGeometry(46, y0 + 90, 14), std(0x1d1e21, { roughness: 0.5 }), 0, (y0 + 90) / 2 + 6, zP - t / 2 - 12);
  neck.rotation.x = -0.08;
  // tělo panelu: čelní deska + vyboulená záda
  rslab(g, W, panelH, 14, 2, M.black(), 0, y0, zP + t / 2 - 7);
  rslab(g, W * 0.7, panelH * 0.6, t - 14, 10, M.plastic(), 0, y0 + panelH * 0.2, zP - 7);
  // obrazovka (matný panel s jemným odleskem)
  const scr = canvasTex(512, 288, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#0d1016'); gr.addColorStop(0.55, '#07080b'); gr.addColorStop(1, '#0b0d12');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  vDecal(g, scr, screen[0], screen[1], 0, y0 + panelH - 8 - screen[1] / 2, zP + t / 2 + 0.05, 0, { roughness: 0.25, metalness: 0.2 });
  vDecal(g, label([{ text: marking, font: 'bold 70px Arial', color: '#c9cdd2' }], 256, 96), 24, 9, 0, y0 + (panelH - 8 - screen[1]) / 2, zP + t / 2 + 0.06);
  slab(g, 2, 2, 0.6, std(0x3fa0ff, { emissive: 0x3fa0ff, emissiveIntensity: 0.8 }), W / 2 - 30, y0 + 4, zP + t / 2); // LED
  for (let i = 0; i < 5; i++) slab(g, 4, 3, 4, std(0x2b2d31), W / 2 - 50 - i * 12, y0 - 2, zP + t / 2 - 6); // tlačítka dole
  return g;
}

/** Grafická karta (ASUS Dual): dims [délka chladiče, výška, tloušťka]; leží chladičem nahoru, záslepka -X, kontakty +Z. */
function gpu([L, H, T], m) {
  const { fans = 2, fanD = 90, blades = 13, pcbL = L - 20, marking = ['ASUS', 'DUAL', 'GEFORCE RTX 3060 Ti'], power = ['8pin'], outputs = ['hdmi', 'dp', 'dp', 'dp'], slots = 2, shroudColor = 0x2c2f33, accent = 0xd8dbe0 } = m;
  const g = new THREE.Group();
  const bpT = 1.6, pcbY = bpT + 0.6, top = pcbY + 1.6; // zadní plech (backplate) dole, deska nad ním
  slab(g, pcbL, bpT, H - 12, std(0x2a2c30, { metalness: 0.75, roughness: 0.35 }), -L / 2 + pcbL / 2, 0, -6);
  slab(g, pcbL, 1.6, H - 4, M.pcbBlack(), -L / 2 + pcbL / 2, pcbY, -2);
  // žebrování chladiče (viditelné z boků a skrz ventilátory)
  const finTop = T - 4;
  slab(g, L - 6, finTop - top - 4, H - 18, M.silver(), 2, top + 4, -4).material = std(0x8f949a, { metalness: 0.85, roughness: 0.35 });
  const finGeo = new THREE.BoxGeometry(0.4, finTop - top - 4, H - 16);
  const fins = [];
  for (let x = -L / 2 + 6; x < L / 2 - 4; x += 2) fins.push(mat4(x, top + 4 + (finTop - top - 4) / 2, -4));
  g.add(instanced(finGeo, M.silver(), fins));
  for (const z of [-H / 2 + 12, -H / 2 + 22]) { // heatpipy vyčnívající nad horní hranou
    const pipe = add(g, new THREE.CylinderGeometry(3, 3, L - 40, 16).rotateZ(Math.PI / 2), std(0xc77a3a, { metalness: 0.9, roughness: 0.3 }), 4, top + 8, z);
    pipe.scale.y = 1;
  }
  // kryt ventilátorů: deska s kruhovými otvory + boční lemy
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -H / 2); s.lineTo(L / 2, -H / 2); s.lineTo(L / 2, H / 2 - 8); s.lineTo(-L / 2, H / 2 - 8); s.closePath();
  const pitch = (L - 30) / fans;
  const fanX = [...Array(fans)].map((_, i) => -L / 2 + 22 + pitch * (i + 0.5));
  for (const x of fanX) s.holes.push(new THREE.Path().absarc(x, -4, fanD / 2 + 1, 0, Math.PI * 2, true));
  const cover = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false, curveSegments: 48 });
  cover.rotateX(Math.PI / 2);
  add(g, cover, std(shroudColor, { metalness: 0.3, roughness: 0.5 }), 0, T, 0);
  for (const z of [-H / 2 + 1.5, H / 2 - 9.5]) slab(g, L, 6, 3, std(shroudColor, { metalness: 0.3, roughness: 0.5 }), 0, T - 6, z);
  // akcenty na krytu (světlé linky mezi ventilátory)
  for (let i = 0; i < fans - 1; i++) slab(g, 3, 0.3, H - 30, std(accent, { metalness: 0.6, roughness: 0.3 }), (fanX[i] + fanX[i + 1]) / 2, T, -4);
  for (const x of fanX) {
    rotor(g, fanD / 2 - 2, blades, T - 4, x, -4, std(0x15161a, { roughness: 0.55 }), 0.3, 0.35);
    add(g, new THREE.TorusGeometry(fanD / 2 - 1, 0.8, 8, 64).rotateX(Math.PI / 2), std(0x15161a), x, T - 3.2, -4); // Axial-tech prstenec
    decal(g, label([{ text: marking[0], font: 'bold 70px Arial', color: '#c9cdd2' }], 128, 128, { bg: '#0f1012' }), fanD * 0.27, fanD * 0.27, x, T - 2.95, -4);
  }
  // nápisy na horní hraně (-Z): model a GEFORCE RTX
  vDecal(g, label([{ text: `${marking[1]}  ·  ${marking[2]}`, font: 'bold 64px Arial', color: '#c9cdd2' }], 1024, 96), 120, 11, 10, T / 2 + 2, -H / 2 - 0.1, Math.PI);
  // napájení na horní hraně u konce karty
  power.forEach((p, i) => { slab(g, 21, 9.6, 8, M.black(), L / 2 - 50 - i * 26, top, -H / 2 + 4); slab(g, 18, 0.4, 6.5, M.hole(), L / 2 - 50 - i * 26, top + 9.6, -H / 2 + 4); });
  // PCIe x16: B1 45,65 mm od zadní hrany desky (CEM 3.0)
  edgeFingers(g, -L / 2 + 45.65, 82, 1, H / 2 - 4, 7.5, pcbY + 1.65, 11);
  // záslepka: HDMI + 3× DP podél Z, větrací otvory nad nimi
  const bh = slots * 20.32;
  bracket(g, -L / 2 - 0.5, -H / 2 - 6, 120, bh, [(gg, x) => {
    outputs.forEach((o, i) => {
      const z = -H / 2 + 14 + i * 21;
      if (o === 'hdmi') { slab(gg, 9, 6, 15, M.steel(), x + 4.5, 4, z); slab(gg, 0.4, 4.5, 14, M.hole(), x - 0.5, 4.6, z); }
      else { slab(gg, 9, 5.4, 16, M.steel(), x + 4.5, 4, z); slab(gg, 0.4, 3.8, 13.5, M.hole(), x - 0.5, 4.8, z); }
    });
    const hole = new THREE.BoxGeometry(0.4, 4, 10);
    const mm = [];
    for (let r = 0; r < Math.floor((bh - 16) / 6); r++) for (let c = 0; c < 4; c++) mm.push(mat4(x - 0.5, 14 + r * 6, -H / 2 + 14 + c * 21));
    gg.add(instanced(hole, M.hole(), mm));
  }]);
  return g;
}

/**
 * ATX midi tower: dims [hloubka, šířka, výška], čelo k +Z, okno (sklo) na levém boku (-X), deska na pravé stěně.
 * opts: fans = { front, rear, top } (počet 120mm ventilátorů, které jsou ve skříni od výroby), shroudH = výška krytu zdroje,
 * mesh = síťované čelo, marking = logo na čele.
 */
function atxCase([D, W, H], { fans = { front: 0, rear: 1 }, shroudH = 90, mesh = true, glass = true, marking = '', feet = 8 } = {}) {
  const g = new THREE.Group();
  const t = 1.2, y0 = feet, h = H - feet, steel = std(0x111214, { metalness: 0.45, roughness: 0.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) slab(g, 30, feet, 40, M.plastic(), sx * (W / 2 - 22), 0, sz * (D / 2 - 40));
  slab(g, W, t, D, steel, 0, y0, 0); // dno
  slab(g, W, t, D, steel, 0, H - t, 0); // strop
  slab(g, t, h, D, steel, W / 2 - t / 2, y0, 0); // pravý bok
  slab(g, W - 24, h - 2, t, steel, 4, y0, D / 2 - 30); // nosná přepážka čela
  // čelo: plast + síťka, nahoře I/O (vypínač, 2× USB 3.0, audio)
  const front = slab(g, W, h, 20, M.black(), 0, y0, D / 2 - 10);
  if (mesh) front.material = [M.black(), M.black(), M.black(), M.black(), std(0xffffff, { map: hexMesh(256, 1024, 12, '#1a1b1e', '#050506'), roughness: 0.7 }), M.black()];
  if (marking) vDecal(g, label([{ text: marking, font: 'bold 64px Arial', color: '#c9cdd2' }], 512, 96), 50, 9, 0, y0 + 30, D / 2 + 0.1);
  add(g, new THREE.CylinderGeometry(6, 6, 2, 24), M.silver(), 0, H + 1, D / 2 - 30);
  for (const x of [-30, -18]) slab(g, 4.5, 1, 12, M.blue(), x, H, D / 2 - 30);
  for (const x of [20, 30]) add(g, new THREE.CylinderGeometry(2.5, 2.5, 1, 16), M.hole(), x, H + 0.1, D / 2 - 30);
  // záda: I/O záslepka desky, ventilátor, 7 slotů, otvor pro zdroj dole
  const rz = -D / 2 + t / 2;
  slab(g, W, h, t, steel, 0, y0, rz);
  // deska je na pravé stěně (+X): záslepka I/O 44,45 × 158,75 mm u ní, karty míří k oknu (-X)
  const ioX = W / 2 - t - 30;
  slab(g, 44.45, 158.75, 0.4, M.hole(), ioX, H - 35 - 158.75, rz - 0.7);
  for (let i = 0; i < 7; i++) slab(g, 100, 15, 0.8, M.steel(), ioX - 30, y0 + shroudH + 12 + i * 20.32, rz - 0.9);
  slab(g, 150, 86, 0.4, M.hole(), 0, y0 + 2, rz - 0.7);
  // kryt zdroje
  slab(g, W - t - 2, t, D - 60, steel, -1, y0 + shroudH, -30 + 0);
  slab(g, t, shroudH, D - 60, steel, -W / 2 + t / 2 + 2, y0, -30);
  // ventilátory od výroby (stejný model jako fan120, natočený)
  const addFan = (x, y, z, rot) => {
    const f = fan120([120, 120, 25], { marking: ['', ''], blades: 7 });
    f.rotation.copy(rot);
    f.position.set(x, y, z);
    g.add(f);
  };
  for (let i = 0; i < (fans.front || 0); i++) addFan(4, H - 85 - i * 125, D / 2 - 32, new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < (fans.rear || 0); i++) addFan(ioX - 22 - 66, H - 35 - 66, -D / 2 + t, new THREE.Euler(Math.PI / 2, 0, 0));
  // tvrzené sklo na levém boku (průhledné, tónované)
  if (glass) {
    slab(g, 4, h - 4, D - 8, new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, depthWrite: false }), -W / 2 + 2, y0 + 2, -2);
  } else slab(g, t, h, D, steel, -W / 2 + t / 2, y0, 0);
  return g;
}

/**
 * Základní deska ATX ležící součástkami nahoru: dims [305, 221, výška] (PRIME B360-PLUS; plné ATX má 244). Osa X = od horní hrany desky (v),
 * osa Z = od zadní hrany s I/O (u). Polohy v mm v layoutu jsou [v, u] středů (zdroj v katalogu).
 */
function atxBoard([L, W], { layout: Lo, marking = 'PRIME B360-PLUS' }) {
  const g = new THREE.Group();
  const X = (v) => -L / 2 + v, Z = (u) => W / 2 - u, pcbT = 1.6; // u k -Z: shora pak deska není zrcadlově (I/O vlevo, horní hrana nahoře po otočení)
  const silk = canvasTex(1220, 884, (c, w, h) => { // 4 px/mm
    c.fillStyle = '#121316'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(230,232,236,0.55)'; c.lineWidth = 3; // bílé linky řady PRIME
    for (const [a, b] of [[[0.05, 0.9], [0.32, 0.62]], [[0.32, 0.62], [0.32, 0.12]], [[0.6, 0.98], [0.82, 0.76]], [[0.82, 0.76], [0.98, 0.76]], [[0.6, 0.35], [0.72, 0.22]]]) {
      c.beginPath(); c.moveTo(a[0] * w, a[1] * h); c.lineTo(b[0] * w, b[1] * h); c.stroke();
    }
    // nápisy podle manuálu: textura má x = v / L, y = (W − u) / W; text běží podél +u (na textuře nahoru)
    const at = (v, u, text, font) => { c.save(); c.translate((v / L) * w, ((W - u) / W) * h); c.rotate(-Math.PI / 2); c.fillStyle = 'rgba(236,238,240,0.9)'; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 0); c.restore(); };
    at(174, 92, marking, 'bold 34px Arial');
    at(145, 143, 'ASUS', 'italic bold 30px Arial');
  });
  const pcb = slab(g, L, pcbT, W, M.pcbBlack(), 0, 0, 0);
  pcb.material = [M.pcbBlack(), M.pcbBlack(), std(0xffffff, { map: silk, roughness: 0.5 }), M.pcbBlack(), M.pcbBlack(), M.pcbBlack()];
  const y = pcbT;
  // montážní otvory (pocínované kroužky)
  for (const [v, u] of Lo.holes) add(g, new THREE.CylinderGeometry(3.6, 3.6, 0.1, 20), M.silver(), X(v), y + 0.05, Z(u));
  // patice LGA1151: tělo, zatěžovací rámeček s okénkem, páčka, 4 otvory chladiče 75 × 75 mm
  const [sv, su] = Lo.socket;
  slab(g, 47.5, 3, 47.5, std(0x2b2b2e), X(sv), y, Z(su));
  const frame = new THREE.Shape();
  frame.moveTo(-23, -23); frame.lineTo(23, -23); frame.lineTo(23, 23); frame.lineTo(-23, 23); frame.closePath();
  frame.holes.push(new THREE.Path().moveTo(-17, -17).lineTo(17, -17).lineTo(17, 17).lineTo(-17, 17).lineTo(-17, -17));
  const fg = new THREE.ExtrudeGeometry(frame, { depth: 1.2, bevelEnabled: false });
  fg.rotateX(-Math.PI / 2);
  add(g, fg, M.steel(), X(sv), y + 3, Z(su));
  add(g, new THREE.CylinderGeometry(0.9, 0.9, 52, 10).rotateZ(Math.PI / 2), M.steel(), X(sv), y + 4.5, Z(su + 25)); // páčka na straně k DIMM
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(g, new THREE.CylinderGeometry(2.6, 2.6, 0.12, 16), M.silver(), X(sv) + dx * 37.5, y + 0.06, Z(su) + dz * 37.5);
  // DIMM sloty (podél X)
  const dl = Lo.dimm.len;
  for (const [i, u] of Lo.dimm.u.entries()) {
    const col = i % 2 ? 0x1c1d20 : 0x8a8f96;
    slab(g, dl, 9, 6.5, std(col, { roughness: 0.6 }), X(Lo.dimm.v), y, Z(u));
    slab(g, dl - 6, 0.2, 1.8, M.hole(), X(Lo.dimm.v), y + 9, Z(u));
    for (const s of [-1, 1]) slab(g, 6, 13, 7, std(col, { roughness: 0.6 }), X(Lo.dimm.v) + s * (dl / 2 + 1), y, Z(u));
  }
  // rozšiřující sloty (podél Z od zadní hrany)
  const COL = { x16: 0x8a8f96, x1: 0x1c1d20, pci: 0xe9e7e1 };
  for (const s of Lo.slots) {
    const { len, u0 } = s, col = COL[s.kind];
    slab(g, 7.5, 11, len, std(col, { roughness: 0.6 }), X(s.v), y, Z(u0 + len / 2));
    slab(g, 1.8, 0.2, len - 4, M.hole(), X(s.v), y + 11, Z(u0 + len / 2));
    if (s.safe) slab(g, 8.3, 9.5, len + 1, M.steel(), X(s.v), y + 0.5, Z(u0 + len / 2)); // kovová výztuha SafeSlot
    if (s.kind !== 'pci') slab(g, 8, 13, 6, std(col), X(s.v), y, Z(u0 + len + 3)); // západka
  }
  // M.2 sloty (konektor + rozteč 80 mm k šroubku)
  for (const m of Lo.m2) {
    slab(g, 22, 4.2, 6, M.black(), X(m.v), y, Z(m.u));
    add(g, new THREE.CylinderGeometry(2.5, 2.5, 3, 12), M.silver(), X(m.v), y + 1.5, Z(m.screw));
  }
  // chladiče: čipset, VRM
  for (const h of Lo.heatsinks) {
    rslab(g, h.w, h.h, h.d, 1.5, std(0x9aa0a7, { metalness: 0.85, roughness: 0.32 }), X(h.v), y, Z(h.u));
    slab(g, h.w * 0.7, 0.3, 2.4, std(0xe9e7e1, { metalness: 0.5 }), X(h.v), y + h.h, Z(h.u));
  }
  // napájecí konektory, SATA, baterie
  slab(g, 52, 10, 10, std(0x1c1d20), X(Lo.atx24[0]), y, Z(Lo.atx24[1])); // 24 pin (podél X)
  slab(g, 10, 10, 18, std(0x1c1d20), X(Lo.eps8[0]), y, Z(Lo.eps8[1])); // 8 pin EPS
  for (const [v, u] of Lo.sata) slab(g, 8, 7, 11, std(0x1c1d20), X(v), y, Z(u));
  add(g, new THREE.CylinderGeometry(10, 10, 3.2, 32), M.silver(), X(Lo.battery[0]), y + 1.6, Z(Lo.battery[1]));
  // zadní I/O (podél X na hraně u = 0): [druh, v od, v do, výška]; barevné vložky podle konektoru
  const INSERT = { usb3: 0x1f5fbf, usb31: 0x19b5b0, ps2: 0x7a4fb0, audio: 0x7fc4e8 };
  for (const [kind, v0, v1, hh] of Lo.io) {
    const w = v1 - v0;
    slab(g, w, hh, 18, M.steel(), X((v0 + v1) / 2), y, Z(9));
    slab(g, w - 2, hh - 3, 0.4, INSERT[kind] ? std(INSERT[kind]) : M.hole(), X((v0 + v1) / 2), y + 1.5, Z(-0.25));
  }
  // čipy na desce: zvukový kodek, síťový řadič, PCI most, Super I/O
  for (const c of Lo.chips) slab(g, c.s, 1, c.s, M.chip(), X(c.v), y, Z(c.u));
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

const BUILDERS = { tower, tesla, shroudAdapter, blower, k620, cpu, rdimm, ssd25, psu, add2psu, epsCable, pwmController, syringe, fan120, chip, connector, crt, speakers, gamepad, m2ssd, udimm, boxCooler, mouse, usbMic, keyboard, monitor, gpu, atxCase, atxBoard };
export const MODEL_KINDS = Object.keys(BUILDERS);

/** Model jednoho kusu položky kusovníku (mm). */
export function buildModel(item) {
  const g = BUILDERS[item.model.kind](item.dims, item.model);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // skutečný CAD model výrobce, pokud existuje (načte se asynchronně, do té doby je vidět ruční model; v node testech ne)
  if (item.model.real && typeof document !== 'undefined') import('./realModels.js').then((m) => m.swapIn(g, item));
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
