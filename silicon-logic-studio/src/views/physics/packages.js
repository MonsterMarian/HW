// Board-level component package models. Every builder returns a Group centred on the origin
// whose bottom sits at y = 0 (the PCB top surface).
// The generic builders (qfp, dip, switches, LEDs …) work in board units; the real-part builders
// further down work in MILLIMETRES (the board scene scales them by its mm → unit factor).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MAT, std, textTexture, markedBox, instanced, mat4, mergeGeos } from './common.js';

/** Gull-wing lead (QFP): shoulder out of the body, bend down, flat foot. Points along +X. */
function gullWingGeometry(len, width, bodyMidY, t = 0.05) {
  const a = new THREE.BoxGeometry(len * 0.38, t, width); a.translate(len * 0.19, bodyMidY, 0);
  const drop = bodyMidY - t;
  const b = new THREE.BoxGeometry(t, drop, width); b.translate(len * 0.38, bodyMidY - drop / 2, 0);
  const c = new THREE.BoxGeometry(len * 0.62, t, width); c.translate(len * 0.38 + len * 0.31, t / 2, 0);
  return [a, b, c];
}

/** Quad flat pack, square or rectangular, leads on all four sides. */
export function qfp({ w, d, pinsPerSide, marking, bodyH = 0.85, leadLen = 0.55, cornerColor }) {
  const g = new THREE.Group();
  const bw = w - 2 * leadLen, bd = d - 2 * leadLen;
  const body = markedBox(bw, bodyH, bd, marking);
  body.position.y = bodyH / 2 + 0.06;
  body.castShadow = true;
  g.add(body);
  if (cornerColor) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.035, bw * 0.035, 0.02, 20), std(cornerColor));
    dot.position.set(-bw / 2 + bw * 0.08, bodyH + 0.07, -bd / 2 + bd * 0.08);
    g.add(dot);
  }
  const pitchX = (bw * 0.9) / pinsPerSide, pitchZ = (bd * 0.9) / pinsPerSide;
  const leadGeo = mergeGeos(gullWingGeometry(leadLen, Math.min(pitchX, pitchZ) * 0.5, bodyH / 2 + 0.06));
  const mats = [];
  for (let i = 0; i < pinsPerSide; i++) {
    const ox = (i - (pinsPerSide - 1) / 2) * pitchX;
    const oz = (i - (pinsPerSide - 1) / 2) * pitchZ;
    mats.push(mat4(bw / 2, 0, oz, 0));
    mats.push(mat4(-bw / 2, 0, oz, Math.PI));
    mats.push(mat4(ox, 0, bd / 2, -Math.PI / 2));
    mats.push(mat4(ox, 0, -bd / 2, Math.PI / 2));
  }
  g.add(instanced(leadGeo, MAT.tin(), mats));
  return g;
}

/** Dual in-line package with through-hole legs and pin-1 notch. */
export function dip({ w, d, pins = 14, marking, bodyH = 0.9 }) {
  const g = new THREE.Group();
  const perSide = pins / 2;
  const pitch = 0.635; // 2.54 mm
  const bw = Math.min(w * 0.96, perSide * pitch + 0.4);
  const bd = Math.min(d * 0.6, perSide > 14 ? 3.8 : 1.6);
  const body = markedBox(bw, bodyH, bd, marking);
  body.position.y = bodyH / 2 + 0.15;
  body.castShadow = true;
  g.add(body);
  const notch = new THREE.Mesh(new THREE.CylinderGeometry(bd * 0.14, bd * 0.14, 0.02, 20, 1, false, 0, Math.PI), std(0x08090b));
  notch.rotation.y = -Math.PI / 2;
  notch.position.set(-bw / 2, bodyH + 0.16, 0);
  g.add(notch);
  const leg = new THREE.BoxGeometry(0.12, 0.5, 0.06);
  const shoulder = new THREE.BoxGeometry(0.16, 0.06, 0.22);
  shoulder.translate(0, 0.22, 0.08);
  const legGeo = mergeGeos([leg.clone().translate(0, 0.0, 0.18), shoulder]);
  const mats = [];
  for (let i = 0; i < perSide; i++) {
    const o = (i - (perSide - 1) / 2) * pitch;
    mats.push(mat4(o, 0.1, bd / 2, 0), mat4(o, 0.1, -bd / 2, Math.PI));
  }
  g.add(instanced(legGeo, MAT.tin(), mats));
  return g;
}

/** Slide switch for INPUT components; returns { group, lever } so the lever can follow the state. */
export function slideSwitch({ w, d }) {
  const g = new THREE.Group();
  const bw = Math.min(w * 0.6, 2.4), bd = Math.min(d * 0.5, 1.4);
  const body = new THREE.Mesh(new RoundedBoxGeometry(bw, 0.6, bd, 2, 0.08), std(0x2050c8, { roughness: 0.4 }));
  body.position.y = 0.3;
  body.castShadow = true;
  g.add(body);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.7, 0.02, bd * 0.4), std(0x050608));
  slot.position.y = 0.61;
  g.add(slot);
  const lever = new THREE.Mesh(new RoundedBoxGeometry(bw * 0.25, 0.35, bd * 0.36, 2, 0.04), std(0xf0f2f5, { roughness: 0.35 }));
  lever.position.y = 0.75;
  g.add(lever);
  return { group: g, lever, travel: bw * 0.22 };
}

/** LED in a small housing; returns { group, lens } so the lens can glow with the signal. */
export function ledIndicator({ w, d, color = 0xffa909 }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(Math.min(w * 0.7, 2.6), 0.35, Math.min(d * 0.6, 1.8), 2, 0.06), std(0x0d1016));
  base.position.y = 0.18;
  g.add(base);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(color, { emissive: color, emissiveIntensity: 0.1, transparent: true, opacity: 0.85, roughness: 0.15 }));
  lens.position.y = 0.35;
  g.add(lens);
  return { group: g, lens };
}

/** 7-segment LED display; returns { group, segments[7] }. */
export function sevenSegment({ w, d }) {
  const g = new THREE.Group();
  const bw = Math.min(w * 0.7, 3.2), bd = Math.min(d * 0.75, 4.4);
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.8, bd), std(0x0b0b0d, { roughness: 0.85 }));
  body.position.y = 0.4;
  body.castShadow = true;
  g.add(body);
  const sl = bd * 0.33, st = bd * 0.06;
  const layout = [
    [0, -sl, true], [sl / 2, -sl / 2, false], [sl / 2, sl / 2, false], [0, sl, true], [-sl / 2, sl / 2, false], [-sl / 2, -sl / 2, false], [0, 0, true],
  ];
  const segments = layout.map(([x, z, horiz]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? sl * 0.8 : st, 0.03, horiz ? st : sl * 0.8), std(0x3a0710, { emissive: 0xff1144, emissiveIntensity: 0 }));
    m.position.set(x, 0.815, z);
    g.add(m);
    return m;
  });
  return { group: g, segments };
}

/** CRT monitor standing on the desk; returns { group, screenTexture, canvas }. */
export function crtMonitor({ w, d }) {
  const g = new THREE.Group();
  const sw = w * 0.9, sh = sw * 0.78, depth = Math.max(d * 0.6, sw * 0.8);
  const caseMat = std(0xd8d2c4, { roughness: 0.6 });
  const front = new THREE.Mesh(new RoundedBoxGeometry(sw, sh, 0.9, 3, 0.25), caseMat);
  front.position.set(0, sh / 2 + 1.0, 0);
  front.castShadow = true;
  g.add(front);
  const back = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.7, sh * 0.72, depth * 0.7), caseMat);
  back.position.set(0, sh / 2 + 1.0, -depth * 0.4);
  back.castShadow = true;
  g.add(back);
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 192;
  const screenTexture = new THREE.CanvasTexture(canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.8, sh * 0.76), new THREE.MeshBasicMaterial({ map: screenTexture }));
  screen.position.set(0, sh / 2 + 1.05, 0.46);
  g.add(screen);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 1.0, 20), caseMat);
  neck.position.y = 0.5;
  g.add(neck);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(sw * 0.3, sw * 0.32, 0.18, 32), caseMat);
  foot.position.y = 0.09;
  g.add(foot);
  return { group: g, screenTexture, canvas };
}

/** Generic gamepad (desk accessory connected by cable). */
export function gamepad() {
  const g = new THREE.Group();
  const shell = std(0x2a2d33, { roughness: 0.55 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.7, 2.4, 4, 0.35), shell);
  body.position.y = 0.35;
  body.castShadow = true;
  g.add(body);
  for (const sx of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16), shell);
    grip.scale.set(1, 0.32, 1);
    grip.position.set(sx * 2.2, 0.32, 0.25);
    g.add(grip);
  }
  const dpadMat = std(0x111215);
  for (const [w2, d2] of [[1.1, 0.34], [0.34, 1.1]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.14, d2), dpadMat);
    arm.position.set(-1.9, 0.77, 0.1);
    g.add(arm);
  }
  const colors = [0xd84a4a, 0xe6b03a, 0x3fa65a, 0x8890a0, 0x8890a0, 0x8890a0];
  colors.forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), std(c, { roughness: 0.3 }));
    b.position.set(1.3 + (i % 3) * 0.5, 0.78, i < 3 ? 0.35 : -0.25);
    g.add(b);
  });
  return g;
}

// ============================================================================
// Real parts of the Diamond Edge 3D - all dimensions in MILLIMETRES (datasheet outlines).
// Origin: centre of the footprint, y = 0 on the PCB top surface.
// ============================================================================
const PLASTIC = () => std(0x161719, { roughness: 0.62 });
const LEAD = () => std(0xc4c9cf, { metalness: 0.9, roughness: 0.3 }); // tin-plated copper alloy leads
const SOLDER = () => std(0xaeb3b8, { metalness: 0.85, roughness: 0.38 });
const HOLE = () => std(0x050505, { roughness: 1 });

function polyShape(pts) {
  const s = new THREE.Shape();
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);
  clean.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

/** Shape extruded towards -X, shape (x, y) = world (z, y). Used for parts facing out of the bracket. */
function extrudeOut(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geo.rotateY(-Math.PI / 2);
  return geo;
}

/** Moulded IC body with chamfered corners (c1 = pin-1 corner); top face carries the marking (uv set by the caller). */
function icBody(bw, bd, h, marking, { c = 0, c1 = c } = {}) {
  // shape y = -world z, so the pin-1 corner (world -x, -z) is shape (-bw/2, +bd/2)
  const x0 = -bw / 2, x1 = bw / 2, y0 = -bd / 2, y1 = bd / 2;
  const shape = polyShape([[x0 + c1, y1], [x1 - c, y1], [x1, y1 - c], [x1, y0 + c], [x1 - c, y0], [x0 + c, y0], [x0, y0 + c], [x0, y1 - c1]]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, [std(0xffffff, { map: marking, roughness: 0.58 }), PLASTIC()]);
  mesh.castShadow = true;
  return mesh;
}

function pin1Dimple(x, y, z, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), std(0x0a0a0b, { roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

/** PQFP: moulded body, gull-wing leads on 4 sides (nx along X on the +-Z edges, nz along Z), solder pads. */
export function pqfp({ bw, bd, h, standoff = 0.25, nx, nz, pitch = 0.5, lead, leadW = 0.22, marking }) {
  const g = new THREE.Group();
  const body = icBody(bw, bd, h, marking, { c: 0.8 });
  body.position.y = standoff;
  g.add(body);
  g.add(pin1Dimple(-bw / 2 + 2.2, standoff + h + 0.01, -bd / 2 + 2.2, 0.75));
  const leadGeo = mergeGeos(gullWingGeometry(lead, leadW, standoff + h * 0.45, 0.15));
  const padGeo = new THREE.BoxGeometry(lead * 0.62, 0.04, leadW * 1.3).translate(lead * 0.69, 0.02, 0);
  const mats = [];
  for (let i = 0; i < nz; i++) { const o = (i - (nz - 1) / 2) * pitch; mats.push(mat4(bw / 2, 0, o, 0), mat4(-bw / 2, 0, -o, Math.PI)); }
  for (let i = 0; i < nx; i++) { const o = (i - (nx - 1) / 2) * pitch; mats.push(mat4(o, 0, bd / 2, -Math.PI / 2), mat4(o, 0, -bd / 2, Math.PI / 2)); }
  g.add(instanced(leadGeo, LEAD(), mats));
  g.add(instanced(padGeo, SOLDER(), mats));
  return g;
}

function jLeadGeometry(out, width, yMid, t = 0.2) {
  const a = new THREE.BoxGeometry(out, t, width).translate(out / 2, yMid, 0);
  const b = new THREE.BoxGeometry(t, yMid - 0.1, width).translate(out - t / 2, (yMid + 0.1) / 2, 0);
  const c = new THREE.BoxGeometry(out + 0.4, t, width).translate((out - 0.4) / 2, 0.1 + t / 2, 0);
  return mergeGeos([a, b, c]);
}

/** SOJ / PLCC: body on a standoff, J-leads bent down and back under the body. */
export function jLeaded({ bw, bd, h, standoff = 0.8, nx = 0, nz = 0, pitch = 1.27, out = 0.55, leadW = 0.43, marking, c = 0, c1 = c, dimple = true }) {
  const g = new THREE.Group();
  const body = icBody(bw, bd, h, marking, { c, c1 });
  body.position.y = standoff;
  g.add(body);
  if (dimple) g.add(pin1Dimple(nx ? 0 : -bw / 2 + 1.6, standoff + h + 0.01, -bd / 2 + 1.6, 0.6));
  const leadGeo = jLeadGeometry(out, leadW, standoff + h * 0.4);
  const padGeo = new THREE.BoxGeometry(1.9, 0.04, leadW * 1.5).translate(out - 0.45, 0.02, 0);
  const mats = [];
  for (let i = 0; i < nz; i++) { const o = (i - (nz - 1) / 2) * pitch; mats.push(mat4(bw / 2, 0, o, 0), mat4(-bw / 2, 0, -o, Math.PI)); }
  for (let i = 0; i < nx; i++) { const o = (i - (nx - 1) / 2) * pitch; mats.push(mat4(o, 0, bd / 2, -Math.PI / 2), mat4(o, 0, -bd / 2, Math.PI / 2)); }
  g.add(instanced(leadGeo, LEAD(), mats));
  g.add(instanced(padGeo, SOLDER(), mats));
  return g;
}

/** Plastic DIP lying along X: leads on the +-Z sides, 2.54 mm pitch, row spacing `row`, through-hole. */
export function dipMm({ pins = 28, bw, bd, h = 3.8, standoff = 0.6, row = 15.24, pitch = 2.54, marking }) {
  const g = new THREE.Group();
  const body = icBody(bw, bd, h, marking);
  body.position.y = standoff;
  g.add(body);
  const notch = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 20, 1, false, 0, Math.PI), std(0x08090a));
  notch.position.set(-bw / 2, standoff + h + 0.01, 0);
  g.add(notch);
  const yS = standoff + 1.0, reach = row / 2 - bd / 2;
  const legGeo = mergeGeos([
    new THREE.BoxGeometry(1.5, 0.25, reach).translate(0, yS, reach / 2),
    new THREE.BoxGeometry(1.5, yS - 0.7, 0.25).translate(0, (yS + 0.7) / 2, reach),
    new THREE.BoxGeometry(0.5, 1.3, 0.25).translate(0, 0.05, reach),
  ]);
  const ring = new THREE.CylinderGeometry(0.85, 0.85, 0.06, 16).translate(0, 0.03, reach);
  const per = pins / 2, mats = [];
  for (let i = 0; i < per; i++) { const o = (i - (per - 1) / 2) * pitch; mats.push(mat4(o, 0, bd / 2, 0), mat4(o, 0, -bd / 2, Math.PI)); }
  g.add(instanced(legGeo, LEAD(), mats));
  g.add(instanced(ring, SOLDER(), mats));
  return g;
}

function stadium(w, d) {
  const s = new THREE.Shape();
  const r = d / 2;
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2);
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
  return s;
}

/** HC-49/U quartz crystal standing upright: 11.05 x 4.65 x 13.46 mm nickel-plated can with base rim. */
export function hc49u({ lines }) {
  const g = new THREE.Group();
  const W = 11.05, D = 4.65, H = 13.46;
  const metal = std(0xc9ccd0, { metalness: 0.95, roughness: 0.22 });
  const can = new THREE.ExtrudeGeometry(stadium(W - 0.5, D - 0.5), { depth: H - 1.2, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 3, curveSegments: 20 });
  can.rotateX(-Math.PI / 2);
  const canMesh = new THREE.Mesh(can, metal);
  canMesh.position.y = 0.95;
  canMesh.castShadow = true;
  g.add(canMesh);
  const rim = new THREE.ExtrudeGeometry(stadium(W + 0.3, D + 0.3), { depth: 0.7, bevelEnabled: false, curveSegments: 20 });
  rim.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(rim, metal));
  const tex = textTexture(lines, { w: 512, h: 256, bg: null, fg: '#26292d', font: 'bold 74px "JetBrains Mono", monospace' });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.74, 5.2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
  label.position.set(0, H * 0.56, D / 2 + 0.03);
  g.add(label);
  return g;
}

// ---------------------------------------------------------------- bracket connectors
// Origin at the PCB edge / inside face of the bracket (x = 0); bodies go +X over the PCB, the mating
// side goes out through the bracket towards -X. PLATE = bracket sheet thickness.
export const PLATE = 0.86;

/** DE-15 (VGA) female, right angle: plastic body, steel D-sleeve through the bracket, 4-40 hex posts. */
export function de15() {
  const g = new THREE.Group();
  const yc = 6.3;
  const steel = std(0xb9bfc6, { metalness: 0.9, roughness: 0.32 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(9.4, 12.5, 30.8), std(0x1c2f5e, { roughness: 0.55 }));
  body.position.set(0.6 + 4.7, 6.25, 0);
  g.add(body);
  const flange = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12.5, 30.8), steel);
  flange.position.set(0.3, 6.25, 0);
  g.add(flange);
  // D-sleeve (trapezoid, 10 degree sides) and the insert with 3 rows of contacts
  const trap = (top, bot, hh) => [[-top / 2, yc + hh / 2], [top / 2, yc + hh / 2], [bot / 2, yc - hh / 2], [-bot / 2, yc - hh / 2]];
  const outer = polyShape(trap(16.9, 14.0, 8.0));
  outer.holes.push(new THREE.Path(trap(15.5, 12.6, 6.6).map(([x, y]) => new THREE.Vector2(x, y))));
  g.add(new THREE.Mesh(extrudeOut(outer, PLATE + 6.0), steel));
  g.add(new THREE.Mesh(extrudeOut(polyShape(trap(15.5, 12.6, 6.6)), PLATE + 5.0), std(0x121315, { roughness: 0.8 })));
  const holeGeo = new THREE.CircleGeometry(0.42, 10).rotateY(-Math.PI / 2);
  const mats = [];
  // DE-15 contact rows: 5 / 5 / 5 on 2.29 mm pitch, middle row offset by half a pitch
  [[2.0, 0], [0, -1.14], [-2.0, 0]].forEach(([dy, dz]) => {
    for (let i = 0; i < 5; i++) mats.push(mat4(-(PLATE + 5.0) - 0.01, yc + dy, (i - 2) * 2.29 + dz));
  });
  g.add(instanced(holeGeo, HOLE(), mats));
  for (const z of [-12.5, 12.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 4.8, 6).rotateZ(Math.PI / 2), steel);
    post.position.set(-PLATE - 2.4, yc, z);
    g.add(post);
    const tap = new THREE.Mesh(new THREE.CircleGeometry(1.1, 12).rotateY(-Math.PI / 2), HOLE());
    tap.position.set(-PLATE - 4.81, yc, z);
    g.add(tap);
  }
  g.userData.hole = { kind: 'd', top: 17.4, bot: 14.5, h: 8.5, yc, screws: [-12.5, 12.5] };
  return g;
}

/** RJ-45 jack (the Edge 3D game port), front flush with the bracket. */
export function rj45() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(17, 13.5, 15.9), std(0x151618, { roughness: 0.7 }));
  body.position.set(8.5, 6.75, 0);
  g.add(body);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(6, 7.4, 11.7), HOLE());
  mouth.position.set(3 - 0.01, 7.4, 0);
  g.add(mouth);
  const latch = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 6.2), HOLE());
  latch.position.set(3 - 0.02, 3.2, 0);
  g.add(latch);
  // gold contact springs visible in the mouth
  const spring = new THREE.BoxGeometry(4, 0.3, 0.35).translate(2.5, 10.6, 0);
  const mats = [];
  for (let i = 0; i < 8; i++) mats.push(mat4(0, 0, (i - 3.5) * 1.02));
  g.add(instanced(spring, std(0xd9b45a, { metalness: 1, roughness: 0.25 }), mats));
  g.userData.hole = { kind: 'rect', w: 12.6, h: 11.2, yc: 6.6 };
  return g;
}

/** 3.5 mm stereo jack: body on the PCB, collar through the bracket. */
export function jack35() {
  const g = new THREE.Group();
  const yc = 3.0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), std(0x141517, { roughness: 0.7 }));
  body.position.set(5, 3, 0);
  g.add(body);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, PLATE + 2.2, 24).rotateZ(Math.PI / 2), std(0x1a1b1e, { roughness: 0.5 }));
  collar.position.set(-(PLATE + 2.2) / 2, yc, 0);
  g.add(collar);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.75, 20).rotateY(-Math.PI / 2), HOLE());
  hole.position.set(-PLATE - 2.21, yc, 0);
  g.add(hole);
  g.userData.hole = { kind: 'circle', r: 3.0, yc };
  return g;
}

// Mated cable plugs (outside the bracket), front at x = 0 facing +X. userData.exit = cable start (local mm).
export function vgaPlug() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(15, 15.5, 32, 3, 2), std(0x2a2c30, { roughness: 0.55 }));
  shell.position.x = -7.5;
  g.add(shell);
  for (const z of [-12.5, 12.5]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4, 16).rotateZ(Math.PI / 2), std(0x34363b));
    knob.position.set(-16, 0, z);
    g.add(knob);
  }
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 5.5, 9, 16).rotateZ(Math.PI / 2), std(0x2a2c30));
  boot.position.x = -19.5;
  g.add(boot);
  g.userData.exit = new THREE.Vector3(-24, 0, 0);
  return g;
}

export function jackPlug() {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 15, 20).rotateZ(Math.PI / 2), std(0x222326, { roughness: 0.5 }));
  grip.position.x = -7.5;
  g.add(grip);
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.0, 8, 16).rotateZ(Math.PI / 2), std(0x222326));
  relief.position.x = -19;
  g.add(relief);
  g.userData.exit = new THREE.Vector3(-23, 0, 0);
  return g;
}

export function rjPlug() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.BoxGeometry(12, 7.2, 11.4), std(0xcfd3d6, { roughness: 0.25, transparent: true, opacity: 0.85 }));
  head.position.x = -3;
  g.add(head);
  const boot = new THREE.Mesh(new RoundedBoxGeometry(10, 8.5, 12.5, 2, 1.5), std(0x2b2d31));
  boot.position.x = -13;
  g.add(boot);
  g.userData.exit = new THREE.Vector3(-18, 0, 0);
  return g;
}

/** 14" CRT shrunk to its 2D footprint (w x d mm). Screen faces +Z. */
export function crt({ w, d }) {
  const g = new THREE.Group();
  const beige = std(0xcfc7b3, { roughness: 0.62 });
  const H = w * 0.84, footH = w * 0.07, bezelD = w * 0.13;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.27, w * 0.3, footH * 0.45, 40), beige);
  foot.position.y = footH * 0.22;
  g.add(foot);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, footH, w * 0.3), beige);
  neck.position.y = footH * 0.5;
  g.add(neck);
  const yc = footH + H / 2;
  const front = new THREE.Mesh(new RoundedBoxGeometry(w, H, bezelD, 4, w * 0.03), beige);
  front.position.set(0, yc, d / 2 - bezelD / 2);
  front.castShadow = true;
  g.add(front);
  const backLen = d - bezelD;
  const back = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.36, w * 0.62, backLen, 4, 1).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), beige);
  back.scale.set(1, 0.92, 1);
  back.position.set(0, yc, d / 2 - bezelD - backLen / 2);
  back.castShadow = true;
  g.add(back);
  const sw = w * 0.8, sh = sw * 0.75, sy = yc + H * 0.03;
  const glass = new THREE.Mesh(new RoundedBoxGeometry(sw * 1.05, sh * 1.06, 1, 2, 0.4), std(0x0d0f0e, { roughness: 0.15, metalness: 0.2 }));
  glass.position.set(0, sy, d / 2 - 0.3);
  g.add(glass);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: 0x050605, toneMapped: false }));
  screen.position.set(0, sy, d / 2 + 0.25);
  g.add(screen);
  const osd = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
  osd.position.set(0, sy, d / 2 + 0.3);
  g.add(osd);
  const led = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.4), std(0x222222, { emissive: 0x000000 }));
  led.position.set(w * 0.4, footH + H * 0.07, d / 2 + 0.05);
  g.add(led);
  const button = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 0.6), std(0xb9b19d));
  button.position.set(w * 0.32, footH + H * 0.07, d / 2 + 0.05);
  g.add(button);
  return { group: g, screen, osd, led, cableIn: new THREE.Vector3(0, footH + H * 0.25, -d / 2 + backLen * 0.25) };
}

/** Pair of small active speakers within the footprint (w x d mm), cones facing +Z. */
export function speakers({ w, d }) {
  const g = new THREE.Group();
  const cw = w * 0.34, ch = w * 0.55, cd = d * 0.85;
  const cab = std(0x1b1c1f, { roughness: 0.7 });
  for (const sx of [-1, 1]) {
    const box = new THREE.Mesh(new RoundedBoxGeometry(cw, ch, cd, 3, 1.2), cab);
    box.position.set(sx * (w / 2 - cw / 2), ch / 2, 0);
    box.castShadow = true;
    g.add(box);
    for (const [r, y] of [[cw * 0.36, ch * 0.36], [cw * 0.16, ch * 0.78]]) {
      const cone = new THREE.Mesh(new THREE.CircleGeometry(r, 32), std(0x0c0c0d, { roughness: 0.9 }));
      cone.position.set(sx * (w / 2 - cw / 2), y, cd / 2 + 0.05);
      g.add(cone);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.12, 32), std(0x3a3b3f, { metalness: 0.5, roughness: 0.4 }));
      ring.position.set(sx * (w / 2 - cw / 2), y, cd / 2 + 0.07);
      g.add(ring);
    }
  }
  return { group: g, cableIn: new THREE.Vector3(-(w / 2 - cw / 2), ch * 0.3, -cd / 2) };
}
