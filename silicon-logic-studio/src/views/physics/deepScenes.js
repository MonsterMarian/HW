// DIE 3D pro tranzistory skutečných procesů (L7: FinFET, výkonový trench MOSFET, TFT / planární princip), vrstvy atomů (L8)
// a částice pod atomem (L9 atom, L10 jádro, L11 proton / neutron). Rozměry a složení se berou z dat podobvodu
// (engine/processSubcircuits.js, engine/particleSubcircuits.js), scéna je jen kreslí.
import * as THREE from 'three';
import { std, textTexture, instanced, mat4, cylinderMatrix } from './common.js';
import { transistorOn } from './siliconScenes.js';
import { HIERARCHICAL_SUBCIRCUITS as H } from '../../engine/hierarchicalSubcircuits.js';

const AMBER = 0xffa909;
const subOf = (ctx) => H[ctx.entry.key] || {};
const box = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function caption(text, width, color = '#a9a6a0') {
  const tex = textTexture([{ text, font: 'bold 60px "JetBrains Mono", "Courier New", monospace', color }], { w: 1024, h: 128, bg: null });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
}
function scaleBar(group, x, y, z, length, label, size) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xe9e6df, toneMapped: false });
  group.add(new THREE.Mesh(box(x, x + length, y - size * 0.03, y + size * 0.03, z, z + size * 0.03), mat));
  for (const dx of [0, length]) group.add(new THREE.Mesh(box(x + dx - size * 0.03, x + dx + size * 0.03, y - size * 0.15, y + size * 0.15, z, z + size * 0.03), mat));
  const t = caption(label, size * 3.2, '#e9e6df');
  t.position.set(x + length / 2, y + size * 0.42, z);
  group.add(t);
}

/** Přiřadí součástky podobvodu k objektům scény podle regulárních výrazů id/popisku; zbytek jako malé značky. */
function attachAll(ctx, rules, fallbackAt) {
  const comps = [...ctx.engine.components.values()];
  const used = new Set();
  for (const [re, obj, label] of rules) {
    const comp = comps.find((c) => !used.has(c) && (re.test(c.id) || re.test(c.label || '')));
    if (comp && obj) { used.add(comp); ctx.addComp(comp, obj, { label }); } else if (obj) ctx.group.add(obj);
  }
  let i = 0;
  for (const comp of comps) {
    if (used.has(comp) || comp.type === 'INPUT' || comp.type === 'PROBE' || comp.type === 'GND' || comp.type === 'VDD') continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(fallbackAt.r, 16, 12), std(0xe9e6df, { roughness: 0.4 }));
    m.position.set(fallbackAt.x, fallbackAt.y - i++ * fallbackAt.r * 4, fallbackAt.z);
    ctx.addComp(comp, m, { label: m.position.clone().add(new THREE.Vector3(fallbackAt.r * 2, 0, 0)) });
  }
}
const channelOn = (ctx) => {
  const t = [...ctx.engine.components.values()].find((c) => c.type === 'NMOS' || c.type === 'PMOS');
  return () => (t ? transistorOn(t, ctx.engine) : false);
};

// ================================================================ L7 FinFET (nm)
export function buildFinfetScene(ctx) {
  const { group } = ctx;
  // scéna v jednotkách 10 nm (kamera má omezenou vzdálenost), popisky a měřítko zůstávají v nm
  const g0 = subOf(ctx).geom;
  const g = Object.fromEntries(Object.entries(g0).map(([k, v]) => [k, typeof v === 'number' && k !== 'fins' ? v / 10 : v]));
  const p = g.pmos;
  const nF = g.fins || 2, L = 2 * g.cpp + g.lg; // délka výřezu: source – hradlo – drain
  const zs = [...Array(nF)].map((_, i) => (i - (nF - 1) / 2) * g.finPitch);
  const W = nF * g.finPitch + g.finPitch;
  const mats = {
    si: std(0x8d939b, { roughness: 0.45, metalness: 0.2 }), sti: std(0xeae6dd, { transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.1 }),
    hk: std(0x6a8cb0, { transparent: true, opacity: 0.55, roughness: 0.3 }), gate: std(0x7d8590, { metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false }),
    spacer: std(0xc9c4b8, { transparent: true, opacity: 0.6, roughness: 0.4 }), epi: std(p ? 0x9a8466 : 0x8a919b, { roughness: 0.45, metalness: 0.2 }),
    contact: std(0xb0a58a, { metalness: 0.9, roughness: 0.3, transparent: true, opacity: 0.4, depthWrite: false }), chan: std(AMBER, { emissive: AMBER, emissiveIntensity: 0, transparent: true, opacity: 0.0, depthWrite: false }),
  };
  const sub = new THREE.Mesh(box(-L / 2, L / 2, -g.finH - 2, -g.finH, -W / 2, W / 2), mats.si);
  const stiM = new THREE.Mesh(box(-L / 2, L / 2, -g.finH, 0, -W / 2, W / 2), mats.sti); // izolace STI mezi žebry, nad ní kanálová část žebra
  const fins = new THREE.Group();
  for (const z of zs) {
    fins.add(new THREE.Mesh(box(-L / 2, L / 2, -g.finH, g.finH, z - g.finW / 2, z + g.finW / 2), mats.si)); // žebro: pod STI zapuštěná pata + kanál nad ním
  }
  const chan = new THREE.Group();
  for (const z of zs) chan.add(new THREE.Mesh(box(-g.lg / 2, g.lg / 2, 0, g.finH, z - g.finW / 2 - 0.03, z + g.finW / 2 + 0.03), mats.chan));
  // high-k + IL kolem žeber pod hradlem, kovové hradlo nad nimi
  const t = g.il + g.hk;
  const hk = new THREE.Group();
  for (const z of zs) hk.add(new THREE.Mesh(box(-g.lg / 2, g.lg / 2, 0, g.finH + t, z - g.finW / 2 - t, z + g.finW / 2 + t), mats.hk));
  const gate = new THREE.Mesh(box(-g.lg / 2, g.lg / 2, 0, g.finH + g.gateH, -W / 2, W / 2), mats.gate);
  const spacers = new THREE.Group();
  for (const s of [-1, 1]) spacers.add(new THREE.Mesh(box(s * g.lg / 2, s * (g.lg / 2 + g.spacer), 0, g.finH + g.gateH, -W / 2, W / 2), mats.spacer));
  // epitaxní S/D (kosočtverečný průřez) a kontakty
  const epi = new THREE.Group(), contacts = new THREE.Group();
  for (const s of [-1, 1]) {
    const x0 = s * (g.lg / 2 + g.spacer), x1 = s * (L / 2);
    for (const z of zs) {
      const shape = new THREE.Shape([new THREE.Vector2(z - g.finW / 2 - 0.3, 0), new THREE.Vector2(z, -0.3), new THREE.Vector2(z + g.finW / 2 + 0.3, 0), new THREE.Vector2(z + g.finW / 2 + 0.5, g.finH * 0.7), new THREE.Vector2(z, g.finH + 0.6), new THREE.Vector2(z - g.finW / 2 - 0.5, g.finH * 0.7)]);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.abs(x1 - x0), bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      geo.translate(Math.min(x0, x1), 0, 0);
      epi.add(new THREE.Mesh(geo, mats.epi));
    }
    const cx = (x0 + x1) / 2;
    contacts.add(new THREE.Mesh(box(cx - g.cpp * 0.18, cx + g.cpp * 0.18, g.finH + 0.6, g.finH + g.gateH + 0.8, -W / 2 + 0.4, W / 2 - 0.4), mats.contact));
  }
  group.add(sub);
  const on = channelOn(ctx);
  ctx.onFrame(() => { const v = on(); for (const m of chan.children) { m.material.opacity = v ? 0.75 : 0; m.material.emissiveIntensity = v ? 1.4 : 0; } });
  const fets = new THREE.Group().add(fins, chan);
  const top = g.finH + g.gateH + 1.2;
  attachAll(ctx, [
    [/^m1$|nmos|pmos|tranzistor/i, fets, new THREE.Vector3(0, top + 0.6, W / 2)],
    [/žebr|fin/i, stiM, new THREE.Vector3(-L / 2, 0, W / 2)],
    [/high-k|hfo|hkmg|dielektr|izolant hradla/i, hk, new THREE.Vector3(-g.lg / 2, g.finH + 0.4, -W / 2 - 0.4)],
    [/hradlo|gate|kov/i, gate, new THREE.Vector3(0, g.finH + g.gateH + 0.4, -W / 2)],
    [/spacer/i, spacers, new THREE.Vector3(g.lg / 2 + g.spacer, g.finH + g.gateH, W / 2)],
    [/s\/d|epi|sige/i, epi, new THREE.Vector3(L / 2 - 0.6, g.finH + 0.8, W / 2)],
    [/kontakt|cu|metal/i, contacts, new THREE.Vector3(-L / 2 + 0.8, top, 0)],
  ], { x: -L / 2 - 1.2, y: top, z: 0, r: 0.2 });
  for (const o of [hk, gate, spacers, epi, contacts, stiM]) if (!o.parent) group.add(o);
  const cap = caption(`${g.title} · rozměry v nm (${g.src})`, L * 1.1);
  cap.position.set(0, top + 1.8, -W / 2);
  group.add(cap);
  scaleBar(group, -L / 2, -g.finH - 2.4, W / 2, 1, '10 nm', 0.6);
  const d = Math.max(L, W) * 2.3;
  return { camera: [d * 0.5, d * 0.55, d * 0.8], target: [0, g.finH / 2, 0], floorY: -g.finH - 2.6 };
}

// ================================================================ L7 výkonový trench MOSFET (µm)
export function buildTrenchScene(ctx) {
  const { group } = ctx;
  const g = subOf(ctx).geom; // pitch, trenchW, trenchD, ox, bodyD, srcD, drift, len (µm)
  const n = 3, Wx = n * g.pitch, D = g.len;
  const yTop = 0, yBody = -g.bodyD, yDrift = -g.trenchD - g.drift;
  const m = {
    nplus: std(0x8a919b, { roughness: 0.5, metalness: 0.2 }), drift: std(0x5f656d, { roughness: 0.55 }), body: std(0x9a8466, { roughness: 0.5 }),
    ox: std(0xeae6dd, { transparent: true, opacity: 0.45, depthWrite: false }), poly: std(0x7a5240, { roughness: 0.4, metalness: 0.3 }),
    al: std(0x9da1a7, { metalness: 0.88, roughness: 0.38 }), chan: std(AMBER, { emissive: AMBER, emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false }),
  };
  const sub = new THREE.Mesh(box(-Wx / 2, Wx / 2, yDrift - 3, yDrift, 0, D), m.nplus);
  const drift = new THREE.Mesh(box(-Wx / 2, Wx / 2, yDrift, yBody, 0, D), m.drift);
  const body = new THREE.Mesh(box(-Wx / 2, Wx / 2, yBody, -g.srcD, 0, D), m.body);
  const src = new THREE.Mesh(box(-Wx / 2, Wx / 2, -g.srcD, yTop, 0, D), m.nplus);
  const ox = new THREE.Group(), gates = new THREE.Group(), shields = new THREE.Group(), chan = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = -Wx / 2 + (i + 0.5) * g.pitch;
    ox.add(new THREE.Mesh(box(x - g.trenchW / 2, x + g.trenchW / 2, -g.trenchD, yTop + 0.05, 0, D), m.ox));
    gates.add(new THREE.Mesh(box(x - g.trenchW / 2 + g.ox, x + g.trenchW / 2 - g.ox, yBody - 0.15, -0.05, 0, D), m.poly));
    shields.add(new THREE.Mesh(box(x - g.trenchW / 2 + g.ox * 3, x + g.trenchW / 2 - g.ox * 3, -g.trenchD + 0.2, yBody - 0.35, 0, D), m.poly));
    for (const s of [-1, 1]) chan.add(new THREE.Mesh(box(x + s * g.trenchW / 2, x + s * (g.trenchW / 2 + 0.03), yBody, -g.srcD, 0, D), m.chan));
  }
  const srcMetal = new THREE.Mesh(box(-Wx / 2, Wx / 2, 0.1, 1.1, 0, D), m.al);
  const drainMetal = new THREE.Mesh(box(-Wx / 2, Wx / 2, yDrift - 4, yDrift - 3, 0, D), m.al);
  group.add(sub, src);
  const on = channelOn(ctx);
  ctx.onFrame(() => { const v = on(); for (const c of chan.children) { c.material.opacity = v ? 0.85 : 0; c.material.emissiveIntensity = v ? 1.5 : 0; } });
  attachAll(ctx, [
    [/^m1$|nmos/i, new THREE.Group().add(chan, gates), new THREE.Vector3(0, 2, D)],
    [/oxid/i, ox, new THREE.Vector3(-Wx / 2, -g.trenchD / 2, D)],
    [/stín|shield/i, shields, new THREE.Vector3(Wx / 2, -g.trenchD + 0.5, D)],
    [/drift/i, drift, new THREE.Vector3(Wx / 2 + 0.5, (yDrift + yBody) / 2, D)],
    [/body|p-/i, body, new THREE.Vector3(Wx / 2 + 0.5, (yBody - g.srcD) / 2, D)],
    [/source|zdroj/i, srcMetal, new THREE.Vector3(0, 2, 0)],
    [/drain|substrát/i, drainMetal, new THREE.Vector3(0, yDrift - 4.5, D)],
  ], { x: -Wx / 2 - 2, y: 2, z: D / 2, r: 0.25 });
  for (const o of [ox, gates, shields, drift, body, srcMetal, drainMetal]) if (!o.parent) group.add(o);
  const cap = caption(`${g.title} · rozměry v µm (typické, ${g.src})`, Wx * 1.4);
  cap.position.set(0, 3, 0);
  group.add(cap);
  scaleBar(group, -Wx / 2, yDrift - 6, D, 1, '1 µm', 0.8);
  const d = Math.max(Wx, -yDrift) * 1.6;
  return { camera: [d * 0.45, d * 0.25, d * 1.1], target: [0, yDrift / 2, D / 2], floorY: yDrift - 7 };
}

// ================================================================ L7 planární MOSFET (princip) nebo TFT panelu
export function buildPlanarScene(ctx) {
  const { group } = ctx;
  const g = subOf(ctx).geom;
  const L = 10, D = 4; // ilustrativní jednotky
  const m = {
    glass: std(0xcfe3e8, { transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }), si: std(0x8d939b, { roughness: 0.45 }),
    ins: std(0xeae6dd, { transparent: true, opacity: 0.45, depthWrite: false }), metal: std(0x9da1a7, { metalness: 0.88, roughness: 0.38 }),
    asi: std(0x6e624f, { roughness: 0.6 }), ito: std(0xbfe6d8, { transparent: true, opacity: 0.5, depthWrite: false }),
    nplus: std(0x8a919b, { roughness: 0.5, metalness: 0.2 }), chan: std(AMBER, { emissive: AMBER, emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false }),
  };
  const parts = {};
  if (g.tft) { // spodní hradlo na skle: hradlo, SiNx, a-Si:H, n+ a-Si, S/D kov, ITO
    group.add(new THREE.Mesh(box(-L / 2 - 2, L / 2 + 4, -1.5, 0, 0, D), m.glass));
    parts.gate = new THREE.Mesh(box(-2, 2, 0, 0.3, 0, D), m.metal);
    parts.ins = new THREE.Mesh(box(-L / 2, L / 2, 0.3, 0.8, 0, D), m.ins);
    parts.chan = new THREE.Mesh(box(-3, 3, 0.8, 1.1, 0, D), m.asi);
    parts.glow = new THREE.Mesh(box(-2, 2, 0.8, 0.86, 0, D), m.chan);
    parts.sd = new THREE.Group().add(new THREE.Mesh(box(-3, -1, 1.1, 1.5, 0, D), m.metal), new THREE.Mesh(box(1, 3, 1.1, 1.5, 0, D), m.metal));
    parts.ito = new THREE.Mesh(box(3, L / 2 + 3, 0.8, 0.9, 0, D), m.ito);
  } else if (g.recess) { // BCAT: wordline zapuštěná v drážce, kanál kolem dna drážky, nad source kondenzátor
    group.add(new THREE.Mesh(box(-L / 2, L / 2, -5, 0, 0, D), m.si));
    parts.sd = new THREE.Group().add(new THREE.Mesh(box(-L / 2 + 1, -1.3, -0.8, 0.02, 0, D), m.nplus), new THREE.Mesh(box(1.3, L / 2 - 1, -0.8, 0.02, 0, D), m.nplus));
    parts.ins = new THREE.Mesh(box(-1.25, 1.25, -3.1, 0.02, 0, D), m.ins);
    parts.gate = new THREE.Mesh(box(-1.05, 1.05, -2.9, -1.2, 0, D), m.metal);
    parts.glow = new THREE.Mesh(box(-1.35, 1.35, -3.3, -3.1, 0, D), m.chan);
    parts.cap = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6, 24), m.metal);
    parts.cap.position.set(-L / 2 + 2.4, 3, D / 2);
  } else { // obecný planární MOSFET: substrát, izolace, hradlo na tenkém dielektriku, S/D
    group.add(new THREE.Mesh(box(-L / 2, L / 2, -4, 0, 0, D), m.si));
    parts.sd = new THREE.Group().add(new THREE.Mesh(box(-L / 2 + 1, -1.2, -1, 0.02, 0, D), m.nplus), new THREE.Mesh(box(1.2, L / 2 - 1, -1, 0.02, 0, D), m.nplus));
    parts.ins = new THREE.Mesh(box(-1.3, 1.3, 0, 0.15, 0, D), m.ins);
    parts.gate = new THREE.Mesh(box(-1.2, 1.2, 0.15, 1.4, 0, D), m.metal);
    parts.glow = new THREE.Mesh(box(-1.2, 1.2, -0.08, 0.0, 0, D), m.chan);
  }
  const on = channelOn(ctx);
  ctx.onFrame(() => { const v = on(); parts.glow.material.opacity = v ? 0.85 : 0; parts.glow.material.emissiveIntensity = v ? 1.4 : 0; });
  attachAll(ctx, [
    [/^m1$|nmos|pmos|tft/i, new THREE.Group().add(parts.glow, ...(parts.chan ? [parts.chan] : [])), new THREE.Vector3(0, 2.2, D)],
    [/hradlo|gate/i, parts.gate, new THREE.Vector3(0, g.tft ? -0.4 : 1.8, 0)],
    [/izolant|dielektr|sinx|oxid/i, parts.ins, new THREE.Vector3(-L / 2, 1, D)],
    [/s\/d|source|drain|kontakt/i, parts.sd, new THREE.Vector3(L / 2 - 2, 1.8, D)],
    [/ito|elektrod/i, parts.ito || null, new THREE.Vector3(L / 2 + 1, 1.4, D)],
    [/kondenzátor/i, parts.cap || null, new THREE.Vector3(-L / 2 + 2.4, 6.5, D / 2)],
  ], { x: -L / 2 - 2, y: 3, z: D / 2, r: 0.3 });
  for (const o of Object.values(parts)) if (o && !o.parent) group.add(o);
  const cap = caption(g.title, L * 1.2);
  cap.position.set(0, 3.5, 0);
  group.add(cap);
  return { camera: [6, 7, 15], target: [0, 0.5, D / 2], floorY: g.tft ? -1.6 : -4.1 };
}

// ================================================================ L7 V-NAND: svislý kanál a vrstvy wordline (ilustrativní rozměry)
export function buildVnandScene(ctx) {
  const { group } = ctx;
  const g = subOf(ctx).geom;
  const N = 6, pitch = 1.0, wl = 0.45; // 6 vrstev výřezu
  const m = {
    wl: std(0x8a8d93, { metalness: 0.9, roughness: 0.35 }), ox: std(0xeae6dd, { transparent: true, opacity: 0.28, depthWrite: false }),
    ono: std(0x6a8cb0, { transparent: true, opacity: 0.55 }), chan: std(0x8d939b, { roughness: 0.45 }), core: std(0xeae6dd, { roughness: 0.3 }),
    glow: std(AMBER, { emissive: AMBER, emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false }), bl: std(0xb0a58a, { metalness: 0.9, roughness: 0.3 }),
  };
  const wls = new THREE.Group(), ox = new THREE.Group();
  for (let i = 0; i < N; i++) {
    const y = i * pitch;
    const plate = new THREE.Shape([new THREE.Vector2(-3, -3), new THREE.Vector2(3, -3), new THREE.Vector2(3, 3), new THREE.Vector2(-3, 3)]);
    plate.holes.push(new THREE.Path().absarc(0, 0, 0.9, 0, Math.PI * 2, true));
    const geo = new THREE.ExtrudeGeometry(plate, { depth: wl, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    const p = new THREE.Mesh(geo, m.wl);
    p.position.y = y;
    wls.add(p);
    ox.add(new THREE.Mesh(box(-3, 3, y + wl, y + pitch, -3, 3), m.ox));
  }
  const H = N * pitch;
  const ono = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, H, 32, 1, true), m.ono);
  ono.position.y = H / 2;
  const chan = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, H + 0.6, 32, 1, true), m.chan);
  chan.position.y = H / 2;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, H + 0.6, 24), m.core);
  core.position.y = H / 2;
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, H, 32, 1, true), m.glow);
  glow.position.y = H / 2;
  const bl = new THREE.Mesh(box(-0.4, 0.4, H + 0.3, H + 0.7, -3, 3), m.bl);
  group.add(ox, core);
  const on = channelOn(ctx);
  ctx.onFrame(() => { const v = on(); m.glow.opacity = v ? 0.7 : 0; m.glow.emissiveIntensity = v ? 1.3 : 0; });
  attachAll(ctx, [
    [/^m1$|nmos/i, new THREE.Group().add(glow), new THREE.Vector3(0, H + 1.4, 0)],
    [/kanál|poly-si/i, chan, new THREE.Vector3(1.2, H + 0.9, 0)],
    [/zachycovací|sin/i, ono, new THREE.Vector3(-1.4, H * 0.6, 1)],
    [/wordline|stohu/i, wls, new THREE.Vector3(3.2, H * 0.4, 3)],
    [/bitline/i, bl, new THREE.Vector3(0, H + 1, 3)],
  ], { x: -4.5, y: H, z: 0, r: 0.15 });
  for (const o of [chan, ono, wls, bl]) if (!o.parent) group.add(o);
  const cap = caption(g.title, 9);
  cap.position.set(0, H + 2.4, -3);
  group.add(cap);
  return { camera: [8, H + 3, 10], target: [0, H / 2, 0], floorY: -0.5 };
}

// ================================================================ L8 vrstvy atomů (Å)
const EL = {
  Cu: [0xc77a3a, 0.55], Si: [0x9aa0a8, 0.5], O: [0xe9e6df, 0.34], Hf: [0x6a8cb0, 0.62], Ti: [0xb0b4ba, 0.55], N: [0x5b7fd6, 0.32], H: [0xf6f6f6, 0.2],
};
export function buildLatticeScene(ctx) {
  const { group } = ctx;
  const stack = subOf(ctx).stack; // [{ name, kind, thick (Å) }] zdola nahoru
  const W = 16, D = 11;
  const atoms = []; // { el, p }
  const bonds = [];
  const r = rng(77);
  let y = 0;
  const layerLabels = [];
  for (const layer of stack) {
    const y0 = y, y1 = y + layer.thick;
    if (layer.kind === 'si') { // diamantová mřížka (001)
      const A = 5.431, fcc = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
      const pts = [];
      for (let i = -2; i < 2; i++) for (let j = 0; j < Math.round(layer.thick / A); j++) for (let k = -1; k < 1; k++) for (const off of [0, 0.25]) for (const [bx, by, bz] of fcc) {
        pts.push(new THREE.Vector3((i + bx + off) * A, y0 + (j + by + off) * A, (k + bz + off) * A));
      }
      for (const p of pts) atoms.push({ el: 'Si', p });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - 2.352) < 0.05) bonds.push([pts[i], pts[j]]);
    } else if (layer.kind === 'cu') { // FCC měď: a = 3,615 Å, nejbližší soused 2,556 Å
      const a = 3.615, pts = [];
      for (let i = -3; i < 3; i++) for (let j = 0; j < Math.round(layer.thick / a); j++) for (let k = -2; k < 2; k++) for (const [bx, by, bz] of [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]) {
        pts.push(new THREE.Vector3((i + bx) * a, y0 + (j + by) * a, (k + bz) * a));
      }
      for (const p of pts) atoms.push({ el: 'Cu', p });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - 2.556) < 0.05) bonds.push([pts[i], pts[j]]);
    } else if (layer.kind === 'tin') { // NaCl: a = 4,24 Å
      const a = 4.24;
      for (let i = -2; i < 2; i++) for (let j = 0; j < Math.max(1, Math.round(layer.thick / a)); j++) for (let k = -1; k < 2; k++) for (const [bx, by, bz] of [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]) {
        const p = new THREE.Vector3((i + bx) * a, y0 + (j + by) * a + 1, (k + bz) * a);
        atoms.push({ el: 'Ti', p });
        const q = p.clone().add(new THREE.Vector3(a / 2, 0, 0));
        atoms.push({ el: 'N', p: q });
        bonds.push([p, q]);
      }
    } else { // amorfní vrstva: náhodná síť kationtů, aniont (O, N) jako můstek mezi blízkými kationty, délka vazby z literatury
      // [kation, aniont, vzdálenost kation–kation, vazba kation–aniont, max. sousedů kationtu]
      const [cat, an, dcc, bond, cn] = { sio2: ['Si', 'O', 3.06, 1.61, 4], hfo2: ['Hf', 'O', 3.5, 2.1, 7], sinx: ['Si', 'N', 3.0, 1.74, 4], asi: ['Si', 'H', 2.35, 1.48, 4] }[layer.kind];
      const cats = [];
      for (let t = 0; t < 4000; t++) {
        const p = new THREE.Vector3((r() - 0.5) * W * 2, y0 + 0.6 + r() * Math.max(0.1, layer.thick - 1.2), (r() - 0.5) * D * 2);
        if (cats.every((q) => q.p.distanceTo(p) > dcc * 0.88)) cats.push({ p, n: 0 });
      }
      for (const c of cats) atoms.push({ el: cat, p: c.p });
      for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
        const a = cats[i], b = cats[j], d = a.p.distanceTo(b.p);
        if (d > dcc * 1.25 || a.n >= cn || b.n >= cn) continue;
        a.n++; b.n++;
        if (layer.kind === 'asi') { bonds.push([a.p, b.p]); continue; } // a-Si: přímá vazba Si–Si
        const mid = a.p.clone().add(b.p).multiplyScalar(0.5);
        const axis = b.p.clone().sub(a.p).normalize();
        const perp = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).cross(axis).normalize();
        const o = mid.addScaledVector(perp, Math.sqrt(Math.max(0, bond * bond - (d / 2) ** 2)));
        atoms.push({ el: an, p: o });
        bonds.push([a.p, o], [o, b.p]);
      }
      if (layer.kind === 'asi') for (const c of cats) if (c.n < 4 && r() < 0.35) { // vodík na volné vazbě
        const h = c.p.clone().addScaledVector(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), bond);
        atoms.push({ el: 'H', p: h });
        bonds.push([c.p, h]);
      }
    }
    layerLabels.push({ text: `${layer.name} · ${String(layer.thick / 10).replace('.', ',')} nm`, y: (y0 + y1) / 2 });
    y = y1;
  }
  const sphere = new THREE.SphereGeometry(1, 16, 12), stick = new THREE.CylinderGeometry(1, 1, 1, 8);
  const byEl = {};
  for (const [el, [color, rad]] of Object.entries(EL)) {
    const pts = atoms.filter((a) => a.el === el && Math.abs(a.p.x) < W && Math.abs(a.p.z) < D);
    if (pts.length) byEl[el] = instanced(sphere, std(color, { roughness: 0.35, metalness: el === 'Hf' || el === 'Ti' ? 0.5 : 0.2 }), pts.map(({ p }) => mat4(p.x, p.y, p.z, 0, rad, rad, rad)));
  }
  group.add(instanced(stick, std(0x6d7178, { roughness: 0.4 }), bonds.filter(([p, q]) => Math.abs(p.x) < W && Math.abs(q.x) < W && Math.abs(p.z) < D && Math.abs(q.z) < D).map(([p, q]) => cylinderMatrix(p, q, 0.08))));
  for (const l of layerLabels) { const t = caption(l.text, 12); t.position.set(W + 7, l.y, 0); group.add(t); }
  const meanY = (el) => { const ys = atoms.filter((a) => a.el === el).map((a) => a.p.y); return ys.reduce((s, v) => s + v, 0) / ys.length; };
  attachAll(ctx, Object.entries(byEl).map(([el, obj]) => [new RegExp(`^el_${el.toLowerCase()}$`), obj, new THREE.Vector3(-W - 2, meanY(el), D)]), { x: W + 3, y: y + 4, z: -D, r: 0.5 });
  scaleBar(group, -W, -2.5, D, 5.431, 'a(Si) = 5,431 Å', 2.4);
  return { camera: [24, y * 0.8 + 8, 60], target: [5, y / 2, 0], floorY: -4 };
}

// ================================================================ L9 atom: jádro + elektronový obal (není v měřítku)
export function buildAtomModelScene(ctx) {
  const { group } = ctx;
  const a = subOf(ctx).atom;
  const shells = a.shells;
  const R = (i) => 3 + i * 2.6;
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24), std(AMBER, { emissive: AMBER, emissiveIntensity: 0.6 }));
  const shellObjs = shells.map((n, i) => {
    const sg = new THREE.Group();
    const last = i === shells.length - 1;
    sg.add(new THREE.Mesh(new THREE.SphereGeometry(R(i), 40, 24), std(last ? 0xffd27a : 0x8fa3c0, { transparent: true, opacity: last ? 0.1 : 0.06, depthWrite: false, side: THREE.DoubleSide })));
    const e = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 12, 8), std(last ? AMBER : 0xdfe6f0, { emissive: last ? AMBER : 0x8fa3c0, emissiveIntensity: last ? 1.2 : 0.5 }), n);
    sg.add(e);
    sg.userData.e = e;
    sg.userData.n = n;
    return sg;
  });
  const _m = new THREE.Matrix4();
  ctx.onFrame((time) => {
    const t = time / 1000;
    shellObjs.forEach((sg, i) => {
      const { e, n } = sg.userData;
      for (let k = 0; k < n; k++) { // rovnoměrně po kouli (Fibonacci), pomalá rotace
        const yk = 1 - (2 * (k + 0.5)) / n, rk = Math.sqrt(1 - yk * yk), ph = k * 2.39996 + t * (0.6 / (i + 1));
        e.setMatrixAt(k, _m.makeTranslation(R(i) * rk * Math.cos(ph), R(i) * yk, R(i) * rk * Math.sin(ph)));
      }
      e.instanceMatrix.needsUpdate = true;
    });
  });
  const outer = R(shells.length - 1);
  attachAll(ctx, [
    [/nucleus/, nucleus, new THREE.Vector3(0, 1.6, 0)],
    ...shellObjs.map((sg, i) => [new RegExp(`^shell_${'KLMNOP'[i]}$`), sg, new THREE.Vector3(R(i) * 0.71, R(i) * 0.71, 0)]),
  ], { x: outer + 4, y: outer, z: 0, r: 0.4 });
  const cap = caption(`${a.sym}: ${a.Z} e⁻ · jádro zvětšené ~10 000× (ve skutečnosti ~100 000× menší než atom)`, outer * 2.6);
  cap.position.set(0, outer + 2.5, 0);
  group.add(cap);
  return { camera: [outer * 1.4, outer * 1.1, outer * 2.6], target: [0, 0, 0], floorY: -outer - 2 };
}

// ================================================================ L10 jádro: protony a neutrony (fm)
export function buildNucleusScene(ctx) {
  const { group } = ctx;
  const { Z, N, A } = subOf(ctx).nucleus;
  const rN = 0.84, R = 1.2 * Math.cbrt(A);
  // husté uspořádání: body FCC mřížky seřazené od středu, prvních A
  const pts = [];
  const a = rN * 2 * Math.SQRT2 * 0.98;
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) for (let k = -6; k <= 6; k++) for (const [bx, by, bz] of [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]) pts.push(new THREE.Vector3((i + bx) * a, (j + by) * a, (k + bz) * a));
  pts.sort((p, q) => p.length() - q.length());
  const use = pts.slice(0, A);
  const r = rng(A * 31 + Z);
  const order = use.map((p) => ({ p, k: r() })).sort((x, y) => x.k - y.k);
  const sphere = new THREE.SphereGeometry(rN, 24, 16);
  const protons = instanced(sphere, std(AMBER, { emissive: AMBER, emissiveIntensity: 0.35, roughness: 0.4 }), order.slice(0, Z).map(({ p }) => mat4(p.x, p.y, p.z)));
  const neutrons = instanced(sphere, std(0x8a8f96, { roughness: 0.45 }), order.slice(Z).map(({ p }) => mat4(p.x, p.y, p.z)));
  const hull = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24), std(0xe9e6df, { transparent: true, opacity: 0.05, depthWrite: false }));
  group.add(hull);
  attachAll(ctx, [
    [/^protons$/, protons, new THREE.Vector3(-R, R + 1, 0)],
    [/^neutrons$/, neutrons, new THREE.Vector3(R, R + 1, 0)],
  ], { x: R + 4, y: R, z: 0, r: 0.3 });
  const cap = caption(`${A}${subOf(ctx).nucleus.sym}: ${Z} p (jantar) + ${N} n (šedé) · R ≈ ${R.toFixed(2).replace('.', ',')} fm`, Math.max(10, R * 4));
  cap.position.set(0, R + 3.5, 0);
  group.add(cap);
  scaleBar(group, -R, -R - 1.5, 0, 1, '1 fm', 0.8);
  return { camera: [R * 1.6 + 3, R * 1.2 + 2, R * 3 + 6], target: [0, 0, 0], floorY: -R - 3 };
}

// ================================================================ L11 nukleon: tři kvarky v gluonovém poli (fm)
export function buildNucleonScene(ctx) {
  const { group } = ctx;
  const q = subOf(ctx).quarks;
  const COL = [0xde3b3d, 0x3fa65a, 0x2f6fd6]; // barevný náboj (konvence, ne skutečná barva)
  const pos = [0, 1, 2].map((i) => new THREE.Vector3(0.38 * Math.cos((i * 2 * Math.PI) / 3), 0.38 * Math.sin((i * 2 * Math.PI) / 3), 0));
  const quarks = pos.map((p, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), std(COL[i], { emissive: COL[i], emissiveIntensity: 0.9 }));
    m.position.copy(p);
    return m;
  });
  const gluons = new THREE.Group();
  const tubeMat = std(0xffd27a, { emissive: AMBER, emissiveIntensity: 0.7, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 3; i++) {
    const a = pos[i], b = pos[(i + 1) % 3];
    const pts = [...Array(24)].map((_, k) => {
      const t = k / 23, p = a.clone().lerp(b, t);
      return p.add(new THREE.Vector3(0, 0, Math.sin(t * Math.PI * 6) * 0.04));
    });
    gluons.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.012, 6), tubeMat));
  }
  ctx.onFrame((time) => { gluons.rotation.z = Math.sin(time / 900) * 0.08; quarks.forEach((m, i) => m.position.copy(pos[i]).multiplyScalar(1 + 0.06 * Math.sin(time / 300 + i * 2))); });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.84, 40, 24), std(0xe9e6df, { transparent: true, opacity: 0.05, depthWrite: false })));
  attachAll(ctx, [
    ...quarks.map((m, i) => [new RegExp(`^q${i}$`), m, pos[i].clone().multiplyScalar(1.5).add(new THREE.Vector3(0, 0.15, 0))]),
    [/gluons/, gluons, new THREE.Vector3(0, -0.55, 0)],
  ], { x: 1.3, y: 0.6, z: 0, r: 0.05 });
  const cap = caption(`${q.join(' ').toUpperCase()} · poloměr ~0,84 fm · barvy = barevný náboj (konvence)`, 2.6);
  cap.position.set(0, 1.05, 0);
  group.add(cap);
  return { camera: [0.6, 0.5, 2.6], target: [0, 0, 0], floorY: -1 };
}
