// Board-level component package models. Every builder returns a Group centred on the origin
// whose bottom sits at y = 0 (the PCB top surface). Units: 1 unit ≈ 4 mm (board scale).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MAT, std, textTexture, markedBox, instanced, mat4, mergeGeos } from './common.js';

/** Gull-wing lead (QFP): shoulder out of the body, bend down, flat foot. Points along +X. */
function gullWingGeometry(len, width, bodyMidY) {
  const t = 0.05;
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

/** PLCC: square body with J-leads tucked under the body on 4 sides. */
export function plcc({ w, pinsPerSide, marking, bodyH = 0.9 }) {
  const g = new THREE.Group();
  const bw = w * 0.86;
  const body = markedBox(bw, bodyH, bw, marking);
  body.position.y = bodyH / 2 + 0.08;
  body.castShadow = true;
  g.add(body);
  // chamfered pin-1 corner
  const notch = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.12, bodyH * 0.6, bw * 0.12), std(0x0c0d10));
  notch.rotation.y = Math.PI / 4;
  notch.position.set(-bw / 2, bodyH * 0.7, -bw / 2);
  g.add(notch);
  const pitch = (bw * 0.82) / pinsPerSide;
  const lead = new THREE.BoxGeometry(0.1, bodyH * 0.55, pitch * 0.5);
  lead.translate(0.05, bodyH * 0.3, 0);
  const mats = [];
  for (let i = 0; i < pinsPerSide; i++) {
    const o = (i - (pinsPerSide - 1) / 2) * pitch;
    mats.push(mat4(bw / 2, 0, o, 0), mat4(-bw / 2, 0, o, Math.PI), mat4(o, 0, bw / 2, -Math.PI / 2), mat4(o, 0, -bw / 2, Math.PI / 2));
  }
  g.add(instanced(lead, MAT.tin(), mats));
  return g;
}

/** SOJ / TSOP-II memory: long body, leads on the two long sides. */
export function soj({ w, d, pinsPerSide, marking, bodyH = 0.75 }) {
  const g = new THREE.Group();
  const bw = w * 0.94, bd = d * 0.62;
  const body = markedBox(bw, bodyH, bd, marking);
  body.position.y = bodyH / 2 + 0.06;
  body.castShadow = true;
  g.add(body);
  const pitch = (bw * 0.9) / pinsPerSide;
  const leadLen = (d - bd) / 2;
  const leadGeo = mergeGeos(gullWingGeometry(leadLen, pitch * 0.45, bodyH / 2 + 0.06));
  const mats = [];
  for (let i = 0; i < pinsPerSide; i++) {
    const o = (i - (pinsPerSide - 1) / 2) * pitch;
    mats.push(mat4(o, 0, bd / 2, -Math.PI / 2), mat4(o, 0, -bd / 2, Math.PI / 2));
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

/** HC-49/S crystal: oval metal can on a plastic plinth with frequency marking. */
export function crystal({ w, d, freq }) {
  const g = new THREE.Group();
  const cw = Math.min(w * 0.82, 4.6), cd = Math.min(d * 0.5, 1.6);
  const shape = new THREE.Shape();
  const r = cd / 2;
  shape.absarc(-cw / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2);
  shape.absarc(cw / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
  const can = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 20 }), MAT.steel());
  can.rotation.x = -Math.PI / 2;
  can.position.y = 0.12;
  can.castShadow = true;
  g.add(can);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(cw * 1.05, 0.12, cd * 1.25), std(0x111111));
  plinth.position.y = 0.06;
  g.add(plinth);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(cw * 0.8, cd * 0.7),
    new THREE.MeshStandardMaterial({ map: textTexture([`${freq}`, { text: 'MHz  FOX', font: 'bold 34px monospace' }], { w: 512, h: 160, bg: null, fg: '#30343a', font: 'bold 70px monospace' }), transparent: true, metalness: 0.4, roughness: 0.5 })
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = 1.08;
  g.add(label);
  return g;
}

/** Box header (2×N pins in a black shroud) - used for the gamepad / jumper connectors. */
export function boxHeader({ w, cols = 5, rows = 2, label }) {
  const g = new THREE.Group();
  const pitch = 0.635;
  const sw = cols * pitch + 0.5, sd = rows * pitch + 0.5;
  const shroud = new THREE.Group();
  const wallMat = std(0x16181c, { roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.15, sd), wallMat);
  base.position.y = 0.075;
  shroud.add(base);
  for (const [x, z, ww, dd] of [[0, -sd / 2, sw, 0.12], [0, sd / 2, sw, 0.12], [-sw / 2, 0, 0.12, sd], [sw / 2, 0, 0.12, sd]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, 1.6, dd), wallMat);
    wall.position.set(x, 0.8, z);
    wall.castShadow = true;
    shroud.add(wall);
  }
  g.add(shroud);
  const pin = new THREE.BoxGeometry(0.16, 1.4, 0.16);
  pin.translate(0, 0.7, 0);
  const mats = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) mats.push(mat4((c - (cols - 1) / 2) * pitch, 0, (r - (rows - 1) / 2) * pitch));
  g.add(instanced(pin, MAT.gold(), mats));
  if (label) {
    const silk = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([label], { w: 512, h: 64, bg: null, fg: '#e8eef5', font: 'bold 40px monospace' }), transparent: true }));
    silk.rotation.x = -Math.PI / 2;
    silk.position.set(0, 0.01, sd / 2 + 0.6);
    g.add(silk);
  }
  return g;
}

/** D-subminiature connector shell (trapezoid), facing -X. */
export function dsub({ shells = 15, color = 0x1e5bd8 }) {
  const g = new THREE.Group();
  const width = shells > 9 ? 2.6 : 2.0;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0.45); shape.lineTo(width / 2, 0.45); shape.lineTo(width / 2 - 0.18, -0.45); shape.lineTo(-width / 2 + 0.18, -0.45); shape.closePath();
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }), MAT.steel());
  shell.rotation.y = -Math.PI / 2; // extrude towards -X
  g.add(shell);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, width + 0.9), std(color, { roughness: 0.5 }));
  body.position.x = 0.7;
  body.castShadow = true;
  g.add(body);
  const flange = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.25, width + 1.4), MAT.steel());
  flange.position.x = 0.03;
  g.add(flange);
  return g;
}

/** 3.5 mm audio jack (cylindrical barrel + body), facing -X. */
export function audioJack(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), std(0x111214));
  body.position.x = 0.7;
  g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 20), std(color));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = -0.15;
  g.add(barrel);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 16), std(0x020202));
  hole.rotation.z = Math.PI / 2;
  hole.position.x = -0.16;
  g.add(hole);
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
export function ledIndicator({ w, d, color = 0x00f0ff }) {
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
