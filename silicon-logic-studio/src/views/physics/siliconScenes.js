// LEVELS 2-8: from the decapped die down to the atomic lattice. Every scene is generated from the
// components of the current subcircuit (engine), so what you see is exactly what you can drill into.
import * as THREE from 'three';
import { componentDims } from '../../engine/boardLayout';
import {
  MAT, std, textTexture, instanced, mat4, metalRoute, manhattan, fitLayout, mergeGeos,
  cylinderMatrix, isActive,
} from './common.js';
import * as P from './packages.js';

// ---------------------------------------------------------------------------
// Procedural die-photo textures for functional blocks
// ---------------------------------------------------------------------------
const BLOCK_CLASS = {
  NV1_CORE: 'logic', REGISTER_8BIT: 'logic', REGISTER_16BIT: 'logic', REGISTER_32BIT: 'logic', PCI_BUS: 'io',
  VRAM_BANK: 'memory', RAM: 'memory', ROM: 'memory', RAMDAC: 'analog', AUDIO_DSP: 'dsp', CLOCK: 'analog',
  SATURN_PAD: 'io', VIRTUAL_SCREEN: 'analog', MUX: 'logic', D_FF: 'logic',
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function dieTexture(kind, seed, tint) {
  const N = 256;
  const cvs = document.createElement('canvas');
  cvs.width = N; cvs.height = N;
  const c = cvs.getContext('2d');
  const r = rng(seed);
  const base = { logic: '#4d5a70', memory: '#5a5a4c', analog: '#6a5a6a', dsp: '#4c6a62', io: '#5f6875' }[kind] || '#555c6a';
  c.fillStyle = base;
  c.fillRect(0, 0, N, N);
  if (kind === 'memory') {
    // regular bit-cell array with row decoder strip
    c.fillStyle = 'rgba(255,230,170,0.18)';
    c.fillRect(0, 0, 22, N);
    for (let y = 0; y < N; y += 4) for (let x = 26; x < N; x += 4) {
      c.fillStyle = (x + y) % 8 ? 'rgba(220,210,180,0.35)' : 'rgba(40,40,30,0.5)';
      c.fillRect(x, y, 3, 2);
    }
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 26; x < N; x += 64) c.fillRect(x, 0, 2, N);
  } else if (kind === 'analog') {
    for (let i = 0; i < 14; i++) {
      const w = 12 + r() * 60, h = 12 + r() * 60;
      c.fillStyle = `rgba(${180 + r() * 60},${150 + r() * 60},${170 + r() * 70},0.35)`;
      c.fillRect(r() * (N - w), r() * (N - h), w, h);
    }
    c.strokeStyle = 'rgba(240,220,170,0.45)';
    c.lineWidth = 2;
    for (let s = 0; s < 3; s++) { // serpentine resistors
      c.beginPath();
      const x0 = r() * N * 0.6, y0 = r() * N * 0.6;
      for (let k = 0; k < 10; k++) { c.lineTo(x0 + k * 6, y0); c.lineTo(x0 + k * 6, y0 + 40); c.lineTo(x0 + k * 6 + 3, y0 + 40); c.lineTo(x0 + k * 6 + 3, y0); }
      c.stroke();
    }
  } else {
    // standard-cell rows: alternating power rails with random cells, metal-2 verticals on top
    for (let y = 0; y < N; y += 16) {
      c.fillStyle = 'rgba(210,220,235,0.35)';
      c.fillRect(0, y, N, 2);
      let x = 0;
      while (x < N) {
        const w = 3 + Math.floor(r() * 12);
        c.fillStyle = `rgba(${120 + r() * 100},${120 + r() * 90},${130 + r() * 100},${0.25 + r() * 0.3})`;
        c.fillRect(x, y + 3, w - 1, 11);
        x += w;
      }
    }
    c.fillStyle = 'rgba(190,205,230,0.22)';
    for (let i = 0; i < 40; i++) c.fillRect(Math.floor(r() * N), 0, 1 + (r() > 0.8 ? 1 : 0), N);
    if (kind === 'dsp') { c.fillStyle = 'rgba(230,220,160,0.22)'; c.fillRect(N * 0.55, N * 0.1, N * 0.4, N * 0.35); }
    if (kind === 'io') { c.strokeStyle = 'rgba(240,230,190,0.5)'; c.lineWidth = 3; c.strokeRect(6, 6, N - 12, N - 12); }
  }
  if (tint) { c.fillStyle = tint; c.fillRect(0, 0, N, N); }
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------------------------------------------------------------------------
// Shared interconnect: orthogonal metal routes between pins, glowing with the signal
// ---------------------------------------------------------------------------
function addRoutes(ctx, pinPos, { y, width, height, color = 0x8fa2bf, via = true }) {
  for (const wire of ctx.engine.wires) {
    const a = pinPos(wire.from.id, wire.from.pin, true);
    const b = pinPos(wire.to.id, wire.to.pin, false);
    if (!a || !b) continue;
    const mat = std(color, { metalness: 0.85, roughness: 0.3, emissive: 0x00f0ff, emissiveIntensity: 0 });
    const route = metalRoute(manhattan(a, b), width, height, y, mat);
    if (!route) continue;
    ctx.group.add(route);
    ctx.addSignal(mat, wire.from.id, wire.from.pin);
    if (via) {
      for (const p of [a, b]) {
        const v = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.45, width * 0.45, y - (p.y ?? 0) + height, 10), MAT.aluminium());
        v.position.set(p.x, ((p.y ?? 0) + y + height) / 2, p.z);
        ctx.group.add(v);
      }
    }
  }
}

function schematicPinFactory(engine, L, yOf) {
  return (id, pin, isOutput) => {
    const comp = engine.components.get(id);
    if (!comp) return null;
    const { w, h } = componentDims(comp, 'schematic');
    const pins = Object.keys((isOutput ? comp.outputs : comp.inputs) || {});
    const idx = Math.max(0, pins.indexOf(pin));
    const py = comp.y + (h / (pins.length + 1)) * (idx + 1);
    return { x: L.x(isOutput ? comp.x + w : comp.x), z: L.z(py), y: yOf(comp) };
  };
}

// ---------------------------------------------------------------------------
// ROOT ALT VIEW: NV1 PQFP-208 package close-up
// ---------------------------------------------------------------------------
export function buildChipCloseUp(ctx) {
  const comp = ctx.engine.components.get('nv1_core');
  const chip = P.qfp({
    w: 16, d: 16, pinsPerSide: 52, bodyH: 1.4, leadLen: 1.1, cornerColor: 0x0b0c0f,
    marking: textTexture([{ text: 'SGS-THOMSON', font: 'bold 40px monospace', color: '#aebdd0' }, { text: 'STG2000X', font: 'bold 84px monospace', color: '#ffffff' }, { text: 'NVIDIA NV1', font: 'bold 56px monospace', color: '#36e6ff' }, { text: 'A22BF9548  MALTA', font: '32px monospace', color: '#8899ad' }, { text: '208-PIN PLASTIC QUAD FLAT PACK', font: '26px monospace', color: '#6d7e93' }], { dot: true }),
  });
  chip.position.y = 0.4;
  if (comp) ctx.addComp(comp, chip, { label: new THREE.Vector3(0, 3, -7) });
  else ctx.group.add(chip);
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 26), MAT.pcb());
  pcb.position.y = 0.2;
  pcb.receiveShadow = true;
  ctx.group.add(pcb);
  // copper landing pads under every lead
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

// ---------------------------------------------------------------------------
// LEVEL 2: decapped package, die with functional blocks, pad ring and bond wires
// ---------------------------------------------------------------------------
export function buildDieScene(ctx) {
  const { engine, group } = ctx;
  const PKG = 30, CAV = 20, DIE = 13, DIE_T = 0.35, FLOOR = 0.6;

  // Package body with open cavity (4 walls + floor)
  const epoxy = MAT.epoxy();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(PKG, FLOOR, PKG), epoxy);
  floor.position.y = FLOOR / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const wallH = 1.6, wallW = (PKG - CAV) / 2;
  for (const [x, z, w, d] of [[0, -(CAV + wallW) / 2, PKG, wallW], [0, (CAV + wallW) / 2, PKG, wallW], [-(CAV + wallW) / 2, 0, wallW, CAV], [(CAV + wallW) / 2, 0, wallW, CAV]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), epoxy);
    wall.position.set(x, FLOOR + wallH / 2, z);
    wall.castShadow = true;
    group.add(wall);
  }
  // Outer gull-wing leads of the package
  const leadGeo = new THREE.BoxGeometry(1.4, 0.08, 0.14);
  const outer = [];
  const PINS = 52;
  for (let i = 0; i < PINS; i++) {
    const o = (i - (PINS - 1) / 2) * ((PKG * 0.9) / PINS);
    outer.push(mat4(PKG / 2 + 0.7, 0.5, o), mat4(-PKG / 2 - 0.7, 0.5, o), mat4(o, 0.5, PKG / 2 + 0.7, Math.PI / 2), mat4(o, 0.5, -PKG / 2 - 0.7, Math.PI / 2));
  }
  group.add(instanced(leadGeo, MAT.tin(), outer));

  // Lead-frame fingers inside the cavity (bond targets)
  const fingerGeo = new THREE.BoxGeometry(2.2, 0.06, 0.16);
  const fingers = [];
  const fingerTips = [];
  const ringIn = DIE / 2 + 2.2;
  for (let i = 0; i < PINS; i++) {
    const t = (i - (PINS - 1) / 2) / PINS;
    const o = t * CAV * 0.86;
    for (const [sx, sz, rot] of [[1, 0, 0], [-1, 0, Math.PI], [0, 1, -Math.PI / 2], [0, -1, Math.PI / 2]]) {
      const x = sx ? sx * (ringIn + 1.1) : o, z = sz ? sz * (ringIn + 1.1) : o;
      fingers.push(mat4(x, FLOOR + 0.03, z, rot));
      fingerTips.push(new THREE.Vector3(sx ? sx * ringIn : o, FLOOR + 0.06, sz ? sz * ringIn : o));
    }
  }
  group.add(instanced(fingerGeo, MAT.gold(), fingers));

  // Die-attach paddle + die
  const paddle = new THREE.Mesh(new THREE.BoxGeometry(DIE + 1, 0.12, DIE + 1), MAT.aluminium());
  paddle.position.y = FLOOR + 0.06;
  group.add(paddle);
  const dieY = FLOOR + 0.12;
  const die = new THREE.Mesh(new THREE.BoxGeometry(DIE, DIE_T, DIE), std(0x323a48, { map: dieTexture('logic', 7), metalness: 0.6, roughness: 0.32 }));
  die.position.y = dieY + DIE_T / 2;
  die.castShadow = true;
  group.add(die);
  const dieTop = dieY + DIE_T;

  // Bond pads on the die edge and gold bond wires to the fingers (merged into one mesh)
  const padGeo = new THREE.BoxGeometry(0.2, 0.02, 0.2);
  const pads = [];
  const wireGeos = [];
  let k = 0;
  for (let i = 0; i < PINS; i++) {
    const t = (i - (PINS - 1) / 2) / PINS;
    const o = t * (DIE - 1.2);
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p = new THREE.Vector3(sx ? sx * (DIE / 2 - 0.25) : o, dieTop + 0.01, sz ? sz * (DIE / 2 - 0.25) : o);
      pads.push(mat4(p.x, p.y, p.z));
      const tip = fingerTips[k++];
      const out = new THREE.Vector3(sx, 0, sz);
      const curve = new THREE.CubicBezierCurve3(
        p, p.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(out, 0.2),
        tip.clone().add(new THREE.Vector3(0, 0.7, 0)).addScaledVector(out, -0.5), tip
      );
      wireGeos.push(new THREE.TubeGeometry(curve, 10, 0.022, 4, false));
    }
  }
  group.add(instanced(padGeo, MAT.aluminium(), pads));
  group.add(new THREE.Mesh(mergeGeos(wireGeos), MAT.gold()));

  // Functional blocks laid out exactly like the subcircuit schematic, scaled onto the die core
  const comps = [...engine.components.values()];
  const rects = comps.map((c) => ({ ...componentDims(c, 'schematic'), x: c.x, y: c.y }));
  const L = fitLayout(rects, DIE - 2.0, DIE - 2.0);
  const blockTop = (c) => dieTop + (c.type === 'PROBE' || c.type === 'INPUT' ? 0.04 : 0.12);
  for (const comp of comps) {
    const { w, h } = componentDims(comp, 'schematic');
    const bw = w * L.s * 0.92, bd = h * L.s * 0.92;
    let mesh;
    if (comp.type === 'PROBE' || comp.type === 'INPUT') {
      // test / probe pads
      mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.min(bw, 0.9), 0.04, Math.min(bd, 0.9)), std(0xd6dee8, { metalness: 0.9, roughness: 0.25, emissive: 0x00f0ff, emissiveIntensity: 0 }));
      const pinName = comp.type === 'PROBE' ? 'in' : 'out';
      ctx.onFrame(() => {
        const v = comp.type === 'PROBE' ? comp.inputs[pinName] : comp.outputs[pinName];
        mesh.material.emissiveIntensity = isActive(v) ? 0.9 : 0;
      });
    } else {
      const kind = BLOCK_CLASS[comp.type] || 'logic';
      mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.12, bd), std(0x8a93a5, { map: dieTexture(kind, hashStr(comp.id)), metalness: 0.55, roughness: 0.32, emissive: 0x00f0ff, emissiveIntensity: 0 }));
      ctx.onFrame(() => { mesh.material.emissiveIntensity = Object.values(comp.outputs).some(isActive) ? 0.05 : 0; });
    }
    mesh.position.set(L.x(comp.x + w / 2), blockTop(comp) - mesh.geometry.parameters.height / 2, L.z(comp.y + h / 2));
    ctx.addComp(comp, mesh, { label: new THREE.Vector3(mesh.position.x, dieTop + 0.9, mesh.position.z) });
  }
  // Top-metal buses between the blocks
  addRoutes(ctx, schematicPinFactory(engine, L, blockTop), { y: dieTop + 0.22, width: 0.08, height: 0.03, color: 0xc9d3e0 });

  return { camera: [0, 19, 21], target: [0, 1, 0], floorY: -0.01 };
}

// ---------------------------------------------------------------------------
// LEVELS 3-5: standard-cell layout (gates, flip-flops, registers, memory macros)
// ---------------------------------------------------------------------------
const TRANSISTORS = { NOT: 2, NAND: 4, NOR: 4, AND: 6, OR: 6, XOR: 12, MUX: 12, TRI_STATE_BUFFER: 6, D_FF: 24 };
const LAYER = {
  nwell: () => std(0x51613a, { roughness: 0.8, transparent: true, opacity: 0.55 }),
  pdiff: () => std(0xc9a25a, { roughness: 0.6 }),
  ndiff: () => std(0x3da35a, { roughness: 0.6 }),
  poly: () => std(0xc8333a, { roughness: 0.5, emissive: 0x400000, emissiveIntensity: 0.3 }),
  metal1: () => std(0x8fa7c9, { metalness: 0.85, roughness: 0.3 }),
  contact: () => std(0x1a1a1a, { roughness: 0.9 }),
};

/** One standard cell: N-well on top half, P/N diffusion strips, vertical poly fingers, contacts. */
function standardCell(w, d, fingers, mats) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), std(0x2a2f3a, { roughness: 0.85 }));
  base.position.y = 0.03;
  g.add(base);
  const nw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d * 0.48), mats.nwell);
  nw.position.set(0, 0.07, -d * 0.26);
  g.add(nw);
  for (const [zc, m] of [[-d * 0.25, mats.pdiff], [d * 0.25, mats.ndiff]]) {
    const diff = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.05, d * 0.22), m);
    diff.position.set(0, 0.1, zc);
    g.add(diff);
  }
  const n = Math.max(1, Math.min(fingers, 14));
  const pitch = (w * 0.84) / n;
  const pgeo = [], cgeo = [];
  for (let i = 0; i < n; i++) {
    const x = -w * 0.42 + pitch * (i + 0.5);
    const pg = new THREE.BoxGeometry(Math.min(pitch * 0.32, 0.18), 0.06, d * 0.82);
    pg.translate(x, 0.15, 0);
    pgeo.push(pg);
    for (const zc of [-d * 0.25, d * 0.25]) {
      const cg = new THREE.BoxGeometry(0.07, 0.03, 0.07);
      cg.translate(x + pitch / 2, 0.14, zc);
      cgeo.push(cg);
    }
  }
  g.add(new THREE.Mesh(mergeGeos(pgeo), mats.poly));
  g.add(new THREE.Mesh(mergeGeos(cgeo), mats.contact));
  // local metal-1 power straps
  for (const zc of [-d * 0.46, d * 0.46]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d * 0.06), mats.metal1);
    rail.position.set(0, 0.12, zc);
    g.add(rail);
  }
  return g;
}

function memoryMacro(w, d, mats) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), std(0x2c2a24, { roughness: 0.8 }));
  base.position.y = 0.04;
  g.add(base);
  const dec = new THREE.Mesh(new THREE.BoxGeometry(w * 0.14, 0.1, d * 0.92), mats.pdiff);
  dec.position.set(-w * 0.42, 0.1, 0);
  g.add(dec);
  const sense = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.1, d * 0.1), mats.ndiff);
  sense.position.set(w * 0.08, 0.1, d * 0.43);
  g.add(sense);
  const cols = 24, rows = 14;
  const cw = (w * 0.8) / cols, cd = (d * 0.78) / rows;
  const cell = new THREE.BoxGeometry(cw * 0.7, 0.05, cd * 0.6);
  const m = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) m.push(mat4(-w * 0.32 + cw * (i + 0.5), 0.11, -d * 0.39 + cd * (j + 0.5)));
  g.add(instanced(cell, std(0xd8cfa8, { metalness: 0.5, roughness: 0.4 }), m));
  return g;
}

function ioPad(size, isInput) {
  const g = new THREE.Group();
  const stack = new THREE.Mesh(new THREE.BoxGeometry(size, 0.1, size), std(0x3a4252));
  stack.position.y = 0.05;
  g.add(stack);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(size * 0.78, 0.06, size * 0.78), std(isInput ? 0xcfd8e4 : 0xe3cf98, { metalness: 0.9, roughness: 0.25, emissive: 0x00f0ff, emissiveIntensity: 0 }));
  pad.position.y = 0.13;
  g.add(pad);
  return { group: g, pad };
}

export function buildCellScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const rects = comps.map((c) => ({ ...componentDims(c, 'schematic'), x: c.x, y: c.y }));
  const L = fitLayout(rects, 30, 16);
  const mats = Object.fromEntries(Object.entries(LAYER).map(([k, f]) => [k, f()]));

  // Silicon substrate with standard-cell power rails
  const W = L.width + 4, D = L.depth + 4;
  const sub = new THREE.Mesh(new THREE.BoxGeometry(W, 1.2, D), MAT.silicon());
  sub.position.y = -0.6;
  sub.receiveShadow = true;
  group.add(sub);
  const railGeos = [];
  for (let z = -D / 2 + 0.8; z < D / 2; z += 1.6) {
    const r = new THREE.BoxGeometry(W - 0.4, 0.03, 0.12);
    r.translate(0, 0.015, z);
    railGeos.push(r);
  }
  group.add(new THREE.Mesh(mergeGeos(railGeos), std(0x5d6b82, { metalness: 0.8, roughness: 0.4 })));

  const heightOf = (c) => (c.type === 'INPUT' || c.type === 'PROBE' || c.type === 'CLOCK' ? 0.2 : 0.2);
  for (const comp of comps) {
    const { w, h } = componentDims(comp, 'schematic');
    const cw = w * L.s * 0.9, cd = h * L.s * 0.9;
    let obj;
    if (comp.type === 'INPUT' || comp.type === 'CLOCK' || comp.type === 'PROBE' || comp.type === 'CONSTANT') {
      const isIn = comp.type !== 'PROBE';
      const io = ioPad(Math.min(cw, cd, 1.6), isIn);
      obj = io.group;
      ctx.onFrame(() => {
        const v = isIn ? comp.outputs.out : comp.inputs.in;
        io.pad.material.emissiveIntensity = isActive(v) ? 1.0 : 0;
      });
    } else if (['RAM', 'ROM', 'VRAM_BANK'].includes(comp.type)) {
      obj = memoryMacro(cw, cd, mats);
    } else if (comp.type.startsWith('REGISTER')) {
      obj = new THREE.Group();
      for (let b = 0; b < 8; b++) {
        const cell = standardCell(cw / 8 * 0.94, cd, 6, mats);
        cell.position.x = -cw / 2 + (cw / 8) * (b + 0.5);
        obj.add(cell);
      }
    } else {
      const tcount = TRANSISTORS[comp.type] || 16;
      obj = standardCell(cw, cd, Math.ceil(tcount / 2), mats);
    }
    obj.position.set(L.x(comp.x + w / 2), 0, L.z(comp.y + h / 2));
    ctx.addComp(comp, obj, { label: new THREE.Vector3(obj.position.x, 0.9, obj.position.z - cd / 2 - 0.1) });
  }
  addRoutes(ctx, schematicPinFactory(engine, L, heightOf), { y: 0.55, width: 0.1, height: 0.05, color: 0x7f98c2 });
  return { camera: [0, 17, 19], target: [0, 0, 0.5], floorY: -1.2 };
}

// ---------------------------------------------------------------------------
// LEVEL 6: CMOS transistor layout (PMOS in N-well, NMOS in P-substrate)
// ---------------------------------------------------------------------------
const isPmos = (c) => /pmos/i.test(c.id);
const isNmos = (c) => /nmos/i.test(c.id);
function gateValue(c) {
  const i = c.inputs || {};
  return i.in ?? i.a;
}
export function transistorOn(c) {
  const g = gateValue(c);
  return isPmos(c) ? g === 0 : g === 1;
}

function transistorModel(w, d, pmos, mats) {
  const g = new THREE.Group();
  const active = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.12, d * 0.5), pmos ? mats.pdiff : mats.ndiff);
  active.position.y = 0.06;
  g.add(active);
  const channel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, 0.02, d * 0.5), std(0x00f0ff, { emissive: 0x00f0ff, emissiveIntensity: 0, transparent: true, opacity: 0.0 }));
  channel.position.y = 0.13;
  g.add(channel);
  const poly = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, 0.14, d * 0.86), mats.poly);
  poly.position.y = 0.21;
  g.add(poly);
  const polyHead = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 0.14, w * 0.22), mats.poly);
  polyHead.position.set(0, 0.21, -d * 0.43);
  g.add(polyHead);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const ct = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), mats.contact);
      ct.position.set(sx * w * 0.27, 0.2, sz * d * 0.1);
      g.add(ct);
    }
    const strap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, 0.06, d * 0.7), mats.metal1);
    strap.position.set(sx * w * 0.27, 0.32, (pmos ? -1 : 1) * d * 0.1);
    g.add(strap);
  }
  return { group: g, channel };
}

export function buildCmosScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const rects = comps.map((c) => ({ ...componentDims(c, 'schematic'), x: c.x, y: c.y }));
  const L = fitLayout(rects, 26, 14);
  const mats = Object.fromEntries(Object.entries(LAYER).map(([k, f]) => [k, f()]));
  const W = L.width + 5, D = L.depth + 5;

  const sub = new THREE.Mesh(new THREE.BoxGeometry(W, 1.5, D), std(0x4d3f63, { roughness: 0.7 })); // P-substrate
  sub.position.y = -0.75;
  sub.receiveShadow = true;
  group.add(sub);

  // N-well under the PMOS row
  const pm = comps.filter(isPmos);
  if (pm.length) {
    let z0 = Infinity, z1 = -Infinity, x0 = Infinity, x1 = -Infinity;
    for (const c of pm) {
      const { w, h } = componentDims(c, 'schematic');
      x0 = Math.min(x0, L.x(c.x)); x1 = Math.max(x1, L.x(c.x + w)); z0 = Math.min(z0, L.z(c.y)); z1 = Math.max(z1, L.z(c.y + h));
    }
    const well = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 2, 0.06, z1 - z0 + 2), std(0x2f5b7d, { roughness: 0.6 }));
    well.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2);
    group.add(well);
  }
  // VDD / GND metal-1 rails
  for (const [z, label] of [[-D / 2 + 0.8, 'VDD'], [D / 2 - 0.8, 'GND']]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.1, 0.6), mats.metal1);
    rail.position.set(0, 0.05, z);
    group.add(rail);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: textTexture([label], { w: 256, h: 64, bg: null, fg: '#e7eef8', font: 'bold 44px monospace' }), transparent: true }));
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(-W / 2 + 2, 0.12, z);
    group.add(tag);
  }

  for (const comp of comps) {
    const { w, h } = componentDims(comp, 'schematic');
    const cw = w * L.s * 0.85, cd = h * L.s * 0.85;
    let obj;
    if (isPmos(comp) || isNmos(comp)) {
      const t = transistorModel(cw, cd, isPmos(comp), mats);
      obj = t.group;
      ctx.onFrame(() => {
        const on = transistorOn(comp);
        t.channel.material.opacity = on ? 0.9 : 0;
        t.channel.material.emissiveIntensity = on ? 1.4 : 0;
      });
    } else if (comp.type === 'INPUT' || comp.type === 'PROBE' || comp.type === 'CLOCK') {
      const isIn = comp.type !== 'PROBE';
      const io = ioPad(Math.min(cw, cd, 1.4), isIn);
      if (isIn) io.pad.material.color.setHex(0xc8333a); // poly input contact
      obj = io.group;
      ctx.onFrame(() => { io.pad.material.emissiveIntensity = isActive(isIn ? comp.outputs.out : comp.inputs.in) ? 0.9 : 0; });
    } else {
      // shared drain / output node: metal-1 plate with contacts
      obj = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.7, 0.08, cd * 0.7), mats.metal1);
      plate.position.y = 0.28;
      obj.add(plate);
    }
    obj.position.set(L.x(comp.x + w / 2), 0.02, L.z(comp.y + h / 2));
    ctx.addComp(comp, obj, { label: new THREE.Vector3(obj.position.x, 1.0, obj.position.z - cd / 2) });
  }
  addRoutes(ctx, schematicPinFactory(engine, L, () => 0.3), { y: 0.5, width: 0.12, height: 0.06, color: 0x8fa7c9 });
  return { camera: [0, 15, 17], target: [0, 0, 0.5], floorY: -1.5 };
}

// ---------------------------------------------------------------------------
// LEVEL 7: MOSFET cross-section
// ---------------------------------------------------------------------------
export function buildMosfetScene(ctx) {
  const { engine, group, entry } = ctx;
  const comps = [...engine.components.values()];
  const nChannel = /nmos/i.test(entry.key || entry.id || '') || comps.some((c) => /electron|gnd/i.test(c.id));
  const find = (re) => comps.find((c) => re.test(c.id));
  const cGate = find(/gate_voltage/), cSrc = find(/source/), cBulk = find(/bulk|sub_bias/);
  const cOx = find(/sio2|oxide|dielectric/), cCh = find(/channel/), cDrain = find(/drain_current/), cDep = find(/sat|pinch/);

  const LEN = 24, WID = 10, DEPTH = 6;
  const diffColor = nChannel ? 0x3fbf6f : 0xe0a040;
  const bodyColor = nChannel ? 0x6b4f8f : 0x2f5b8f; // P-substrate vs N-well
  const glass = (c, o) => std(c, { transparent: true, opacity: o, roughness: 0.1, metalness: 0.0, depthWrite: false });

  // Bulk (with deeper P-substrate below an N-well for PMOS)
  const bulk = new THREE.Mesh(new THREE.BoxGeometry(LEN, DEPTH, WID), std(bodyColor, { roughness: 0.7 }));
  bulk.position.y = -DEPTH / 2;
  bulk.receiveShadow = true;
  group.add(bulk);
  if (!nChannel) {
    const psub = new THREE.Mesh(new THREE.BoxGeometry(LEN, 2.5, WID), std(0x6b4f8f, { roughness: 0.7 }));
    psub.position.y = -DEPTH - 1.25;
    group.add(psub);
  }
  // Shallow trench isolation
  for (const sx of [-1, 1]) {
    const sti = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, WID + 0.02), glass(0xbfe4ff, 0.55));
    sti.position.set(sx * (LEN / 2 - 3.6), -0.79, 0);
    group.add(sti);
  }
  // Source / drain diffusions with LDD tips + silicide
  const sdX = 5.6;
  for (const sx of [-1, 1]) {
    const sd = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, WID - 0.4), std(diffColor, { roughness: 0.5 }));
    sd.position.set(sx * sdX, -0.49, 0);
    group.add(sd);
    const ldd = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, WID - 0.4), std(diffColor, { roughness: 0.5, transparent: true, opacity: 0.8 }));
    ldd.position.set(sx * 3.2, -0.19, 0); // lightly-doped drain extension under the spacer
    group.add(ldd);
    const sil = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, WID - 0.8), std(0x9aa0a8, { metalness: 0.8, roughness: 0.3 }));
    sil.position.set(sx * sdX, 0.05, 0);
    group.add(sil);
  }
  // Body tap beyond the left trench
  const tap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, WID - 0.4), std(nChannel ? 0xe0a040 : 0x3fbf6f, { roughness: 0.5 }));
  tap.position.set(-LEN / 2 + 1.3, -0.39, 0);
  group.add(tap);

  // Inversion channel (glows when the transistor conducts)
  const chMat = std(0x00f0ff, { emissive: 0x00f0ff, emissiveIntensity: 0, transparent: true, opacity: 0.15 });
  const channel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, WID - 0.6), chMat);
  channel.position.set(0, -0.07, 0);
  // Depletion region around the drain junction
  const depMat = glass(0xfff1a8, 0.16);
  const depletion = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.8, WID - 0.2), depMat);
  depletion.position.set(sdX, -0.75, 0);

  // Gate stack: oxide, poly, silicide, nitride spacers
  const oxide = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, WID - 0.6), std(0xd8fff4, { emissive: 0x00ffcc, emissiveIntensity: 0.35, transparent: true, opacity: 0.85, roughness: 0.1 }));
  oxide.position.set(0, 0.08, 0);
  const poly = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, WID - 0.6), std(0x8b2e2e, { roughness: 0.55 }));
  poly.position.set(0, 1.06, 0);
  group.add(poly);
  const gsil = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, WID - 0.6), std(0x9aa0a8, { metalness: 0.8, roughness: 0.3 }));
  gsil.position.set(0, 2.02, 0);
  group.add(gsil);
  for (const sx of [-1, 1]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, WID - 0.6), std(0xd9cf9c, { roughness: 0.6 }));
    sp.position.set(sx * 2.6, 0.95, 0);
    group.add(sp);
  }
  // Inter-layer dielectric (glass) with tungsten plugs and aluminium metal-1
  const ild = new THREE.Mesh(new THREE.BoxGeometry(LEN, 4.4, WID), glass(0x9fc8ff, 0.08));
  ild.position.y = 2.2;
  group.add(ild);
  const terminals = {};
  const plugMat = std(0x7d848c, { metalness: 0.9, roughness: 0.35 });
  for (const [key, x, top] of [['S', -sdX, 0.1], ['D', sdX, 0.1], ['G', 0, 2.08], ['B', -LEN / 2 + 1.3, 0.0]]) {
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.4 - top, 16), plugMat);
    plug.position.set(x, (4.4 + top) / 2, key === 'G' ? -WID / 2 + 1.4 : 0);
    group.add(plug);
    const metal = new THREE.Mesh(new THREE.BoxGeometry(key === 'G' ? 1.6 : 2.2, 0.5, WID * 0.8), MAT.aluminium());
    metal.position.set(x, 4.65, plug.position.z + (key === 'G' ? WID * 0.3 : 0));
    terminals[key] = metal;
  }

  // Map engine components onto the physical parts (so hover/drill/labels refer to real circuit nodes)
  const attach = (comp, mesh, labelPos) => {
    if (comp) ctx.addComp(comp, mesh, { label: labelPos });
    else group.add(mesh);
  };
  attach(cOx, oxide, new THREE.Vector3(0, 0.6, WID / 2 + 0.6));
  attach(cCh, channel, new THREE.Vector3(0, -1.6, WID / 2 + 0.8));
  attach(cDep, depletion, new THREE.Vector3(sdX, -2.4, WID / 2 + 0.6));
  attach(cGate, terminals.G, new THREE.Vector3(0, 5.6, 0));
  attach(cSrc, terminals.S, new THREE.Vector3(-sdX, 5.6, 0));
  attach(cDrain, terminals.D, new THREE.Vector3(sdX, 5.6, 0));
  attach(cBulk, terminals.B, new THREE.Vector3(-LEN / 2 + 1.3, 5.6, 0));
  for (const comp of comps) {
    if ([cGate, cSrc, cBulk, cOx, cCh, cDrain, cDep].includes(comp)) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), std(0x00f0ff, { emissive: 0x00f0ff, emissiveIntensity: 0.4 }));
    m.position.set(LEN / 2 - 2, 5, 0);
    attach(comp, m, new THREE.Vector3(LEN / 2 - 2, 5.8, 0));
  }

  // Charge carriers: drift source → drain only while the channel conducts
  const conducting = () => (cCh ? cCh.outputs.out === 1 : cGate ? (nChannel ? cGate.outputs.out === 1 : cGate.outputs.out === 0) : true);
  const carrierMat = std(nChannel ? 0x4aa8ff : 0xff5577, { emissive: nChannel ? 0x2a7dff : 0xff2255, emissiveIntensity: 1.2 });
  const carriers = [];
  const cg = new THREE.SphereGeometry(0.14, 10, 8);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(cg, carrierMat);
    m.userData = { phase: Math.random(), z: (Math.random() - 0.5) * (WID - 1.5), speed: 0.35 + Math.random() * 0.3, sd: Math.random() < 0.5 ? -1 : 1 };
    group.add(m);
    carriers.push(m);
  }
  let last = 0;
  ctx.onFrame((time) => {
    const dt = Math.min(0.05, (time - (last || time)) / 1000);
    last = time;
    const on = conducting();
    chMat.emissiveIntensity = on ? 1.5 : 0;
    chMat.opacity = on ? 0.85 : 0.12;
    depMat.opacity = on ? 0.28 : 0.12;
    for (const m of carriers) {
      const u = m.userData;
      if (on) {
        u.phase = (u.phase + dt * u.speed * 0.25) % 1;
        m.position.set(-sdX - 1.2 + u.phase * (2 * sdX + 2.4), -0.12 - Math.abs(Math.sin(u.phase * 9)) * 0.06, u.z);
      } else {
        // thermal jiggle inside the source/drain wells
        u.phase += dt;
        m.position.set(u.sd * sdX + Math.sin(u.phase * 3 + u.z) * 1.4, -0.5 + Math.cos(u.phase * 2.3 + u.z) * 0.3, u.z);
      }
    }
  });

  return { camera: [6, 10, 22], target: [0, 0.5, 0], floorY: -DEPTH - 3 };
}

// ---------------------------------------------------------------------------
// LEVEL 8: crystalline Si substrate under an amorphous SiO2 gate dielectric
// ---------------------------------------------------------------------------
export function buildAtomScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const a = 2.6; // lattice constant (scaled 5.43 Å)
  const siMat = std(0x46b4ff, { metalness: 0.3, roughness: 0.25, emissive: 0x0a3a66, emissiveIntensity: 0.4 });
  const siOxMat = std(0x9fd6ff, { metalness: 0.2, roughness: 0.3 });
  const oMat = std(0xff3a5c, { metalness: 0.1, roughness: 0.3, emissive: 0x551020, emissiveIntensity: 0.4 });
  const bondMat = std(0xdfe8f2, { metalness: 0.6, roughness: 0.3 });

  // Diamond-cubic silicon: FCC lattice + basis (0,0,0),(¼,¼,¼)
  const nx = 4, ny = 2, nz = 3;
  const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0], [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
  const si = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    for (const [bx, by, bz] of basis) si.push(new THREE.Vector3((i + bx - nx / 2) * a, (j + by - ny) * a, (k + bz - nz / 2) * a));
  }
  const bondLen = (a * Math.sqrt(3)) / 4;
  const bonds = [];
  for (let i = 0; i < si.length; i++) for (let j = i + 1; j < si.length; j++) {
    if (Math.abs(si[i].distanceTo(si[j]) - bondLen) < 0.05) bonds.push([si[i], si[j]]);
  }
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  group.add(instanced(sphere, siMat, si.map((p) => mat4(p.x, p.y, p.z, 0, 0.32, 0.32, 0.32))));
  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8);
  group.add(instanced(unitCyl, bondMat, bonds.map(([p, q]) => cylinderMatrix(p, q, 0.07))));

  // Amorphous SiO2: jittered Si network with bridging oxygens (continuous random network)
  const r = rng(1234);
  const oxSi = [];
  const spacing = 2.0;
  const topY = 0.3;
  for (let x = -nx * a / 2 + 0.6; x < nx * a / 2; x += spacing) for (let z = -nz * a / 2 + 0.6; z < nz * a / 2; z += spacing) for (let y = 0; y < 3; y++) {
    oxSi.push(new THREE.Vector3(x + (r() - 0.5) * 0.7, topY + 0.9 + y * 1.7 + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.7));
  }
  const oxygens = [];
  const oxBonds = [];
  for (let i = 0; i < oxSi.length; i++) for (let j = i + 1; j < oxSi.length; j++) {
    const d = oxSi[i].distanceTo(oxSi[j]);
    if (d < spacing * 1.25) {
      const mid = oxSi[i].clone().add(oxSi[j]).multiplyScalar(0.5).add(new THREE.Vector3((r() - 0.5) * 0.4, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4));
      oxygens.push(mid);
      oxBonds.push([oxSi[i], mid], [mid, oxSi[j]]);
    }
  }
  // interface bonds Si(substrate top) – O
  const topSi = si.filter((p) => p.y > -0.7);
  for (const p of topSi) {
    const o = p.clone().add(new THREE.Vector3((r() - 0.5) * 0.5, 0.9, (r() - 0.5) * 0.5));
    oxygens.push(o);
    oxBonds.push([p, o]);
    const near = oxSi.reduce((best, q) => (q.distanceTo(o) < best.distanceTo(o) ? q : best), oxSi[0]);
    if (near && near.distanceTo(o) < 2.2) oxBonds.push([o, near]);
  }
  group.add(instanced(sphere, siOxMat, oxSi.map((p) => mat4(p.x, p.y, p.z, 0, 0.3, 0.3, 0.3))));
  group.add(instanced(sphere, oMat, oxygens.map((p) => mat4(p.x, p.y, p.z, 0, 0.22, 0.22, 0.22))));
  group.add(instanced(unitCyl, bondMat, oxBonds.map(([p, q]) => cylinderMatrix(p, q, 0.05))));

  // Engine components → highlighted physical entities
  const find = (re) => comps.find((c) => re.test(c.id));
  const hi = (pos, radius, color, comp) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), std(color, { emissive: color, emissiveIntensity: 0.8, roughness: 0.2 }));
    m.position.copy(pos);
    if (comp) ctx.addComp(comp, m, { label: pos.clone().add(new THREE.Vector3(0, radius + 0.7, 0)) });
    else group.add(m);
    return m;
  };
  const siPick = topSi[Math.floor(topSi.length / 2)] || new THREE.Vector3();
  const siAtom = hi(siPick, 0.48, 0x46b4ff, find(/si_atom/));
  const oPick = oxygens[Math.floor(oxygens.length / 3)] || new THREE.Vector3(0, 2, 0);
  hi(oPick, 0.36, 0xff3a5c, find(/o_atom/));
  const sp3 = find(/covalent|bond/);
  if (sp3) {
    // sp3 tetrahedron around a silicon atom in the oxide
    const c0 = oxSi[Math.floor(oxSi.length / 2)];
    const dirs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(1.1));
    const tet = new THREE.Group();
    const tm = std(0xffe066, { emissive: 0xffc400, emissiveIntensity: 0.9 });
    for (const d of dirs) {
      const geo = new THREE.CylinderGeometry(0.07, 0.07, 1, 8);
      const m = new THREE.Mesh(geo, tm);
      m.applyMatrix4(cylinderMatrix(c0, c0.clone().add(d), 1));
      m.scale.set(1, 1, 1);
      tet.add(m);
    }
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), tm);
    core.position.copy(c0);
    tet.add(core);
    ctx.addComp(sp3, tet, { label: c0.clone().add(new THREE.Vector3(0, 1.6, 0)) });
  }
  const barrierComp = find(/barrier|bandgap/);
  const W = nx * a, Dd = nz * a;
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(W, 5.6, Dd), std(0xffb000, { transparent: true, opacity: 0.07, emissive: 0xff9900, emissiveIntensity: 0.3, depthWrite: false }));
  barrier.position.y = topY + 3.0;
  if (barrierComp) ctx.addComp(barrierComp, barrier, { label: new THREE.Vector3(W / 2 + 0.5, topY + 5.6, 0) });
  else group.add(barrier);

  // Quantum tunnelling electrons crossing the oxide (only while the tunnelling probe sees current)
  const tunnelComp = find(/tunnel/);
  const eMat = std(0x7fd8ff, { emissive: 0x3fc8ff, emissiveIntensity: 1.5 });
  const electrons = [];
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eMat);
    m.userData = { t: Math.random(), x: (Math.random() - 0.5) * W * 0.8, z: (Math.random() - 0.5) * Dd * 0.8 };
    group.add(m);
    electrons.push(m);
  }
  // electron cloud orbiting the highlighted Si atom
  const cloud = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eMat);
    m.userData = { a: Math.random() * Math.PI * 2, b: Math.random() * Math.PI, s: 0.8 + Math.random() * 1.2 };
    group.add(m);
    cloud.push(m);
  }
  if (tunnelComp) {
    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 24), eMat);
    marker.rotation.x = Math.PI / 2;
    marker.position.set(-W / 2 - 1, topY + 3, 0);
    ctx.addComp(tunnelComp, marker, { label: marker.position.clone().add(new THREE.Vector3(0, 1, 0)) });
  }
  ctx.onFrame((time) => {
    const t = time / 1000;
    const tunnelling = !tunnelComp || isActive(tunnelComp.inputs.in) || isActive(engine.components.get(barrierComp?.id)?.inputs?.in);
    for (const m of electrons) {
      const u = m.userData;
      u.t = (u.t + 0.004) % 1;
      m.visible = tunnelling;
      m.position.set(u.x, -1.5 + u.t * 7, u.z);
    }
    for (const m of cloud) {
      const u = m.userData;
      u.a += 0.03 * u.s;
      m.position.set(siAtom.position.x + Math.cos(u.a) * Math.sin(u.b + t) * 0.85, siAtom.position.y + Math.cos(u.b + t * 0.7) * 0.85, siAtom.position.z + Math.sin(u.a) * Math.sin(u.b + t) * 0.85);
    }
  });

  return { camera: [9, 9, 15], target: [0, 0.5, 0], floorY: -ny * a - 1 };
}
