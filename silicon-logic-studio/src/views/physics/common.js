// Shared helpers for the 3D physics scenes: materials, canvas textures, geometry utilities.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Portfolio palette: amber = logic 1, muted slate = 0, grey = floating (Z), red = short / unknown (X)
export const WIRE_COLORS = { LOW: 0x4a5566, HIGH: 0xffa909, Z: 0x8a8a86, CONFLICT: 0xde3b3d };

export function signalHex(v) {
  if (v === 'Z') return WIRE_COLORS.Z;
  if (v === 'X') return WIRE_COLORS.CONFLICT;
  if (typeof v === 'number' && v !== 0) return WIRE_COLORS.HIGH;
  return WIRE_COLORS.LOW;
}

// Logic high for 1-bit nets, any bit set for buses; 'Z' / 'X' / undefined are not active
export const isActive = (v) => typeof v === 'number' && v !== 0;

function popcount(v) {
  v >>>= 0;
  let n = 0;
  while (v) { v &= v - 1; n++; }
  return n;
}

/**
 * Emissive colour + intensity of a copper trace for a net value.
 * width = bus width in bits; analogMax = full-scale volts for analog nets (null = digital).
 */
export function signalStyle(v, width = 1, analogMax = null) {
  if (v === undefined) return { hex: WIRE_COLORS.LOW, intensity: 0 };
  if (v === 'Z') return { hex: WIRE_COLORS.Z, intensity: 0.22 };
  if (v === 'X') return { hex: WIRE_COLORS.CONFLICT, intensity: 1.0 };
  if (analogMax) return { hex: WIRE_COLORS.HIGH, intensity: 0.12 + 1.0 * Math.min(1, Math.abs(Number(v) || 0) / analogMax) };
  if (v === 0) return { hex: WIRE_COLORS.LOW, intensity: 0.3 };
  if (width <= 1) return { hex: WIRE_COLORS.HIGH, intensity: 1.1 };
  return { hex: WIRE_COLORS.HIGH, intensity: 0.3 + (0.8 * popcount(v)) / Math.min(32, width) };
}

export function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...opts });
}

export const MAT = {
  epoxy: () => std(0x15171c, { roughness: 0.7 }),
  tin: () => std(0xd6dde6, { metalness: 0.95, roughness: 0.22 }),
  gold: () => std(0xf2c14e, { metalness: 1.0, roughness: 0.18 }),
  copper: () => std(0xc77a3a, { metalness: 0.9, roughness: 0.3 }),
  aluminium: () => std(0xb8c4d2, { metalness: 0.9, roughness: 0.28 }),
  steel: () => std(0xd5dbe2, { metalness: 0.92, roughness: 0.3 }),
  pcb: () => std(0x0b4a26, { roughness: 0.42, metalness: 0.05 }),
  silicon: () => std(0x3a4150, { metalness: 0.55, roughness: 0.35 }),
};

/** Canvas texture with centered multi-line text, e.g. chip top markings. */
export function textTexture(lines, { w = 512, h = 512, bg = '#16181d', fg = '#d9dee6', font = 'bold 44px "JetBrains Mono", "Courier New", monospace', lineGap = 1.25, border = null, dot = false } = {}) {
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // subtle mould texture
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < (w * h) / 300; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20); }
  if (dot) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(w * 0.1, h * 0.14, Math.min(w, h) * 0.05, 0, Math.PI * 2); ctx.fill(); }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const items = lines.map((l) => (typeof l === 'string' ? { text: l } : l));
  const sizes = items.map((it) => parseInt((it.font || font).match(/(\d+)px/)?.[1] || '40', 10));
  const total = sizes.reduce((a, s) => a + s * lineGap, 0);
  let y = h / 2 - total / 2;
  items.forEach((it, i) => {
    y += (sizes[i] * lineGap) / 2;
    ctx.font = it.font || font;
    ctx.fillStyle = it.color || fg;
    ctx.fillText(it.text, w / 2, y, w * 0.92);
    y += (sizes[i] * lineGap) / 2;
  });
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Box whose top face carries a texture (index 2 = +Y face of BoxGeometry). */
export function markedBox(w, h, d, topTexture, sideMat) {
  const side = sideMat || MAT.epoxy();
  const top = std(0xffffff, { map: topTexture, roughness: 0.6 });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side]);
}

/** Flat ribbon (trace / metal line) in the XZ plane following a polyline, at height y. */
export function ribbonGeometry(points, width, y, thickness = 0) {
  const pos = [];
  const idx = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const nx = -dz * width / 2, nz = dx * width / 2;
    pos.push(p.x + nx, y + thickness, p.z + nz, p.x - nx, y + thickness, p.z - nz);
    if (i < n - 1) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function cubicPoints(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      z: u * u * u * p0.z + 3 * u * u * t * p1.z + 3 * u * t * t * p2.z + t * t * t * p3.z,
    });
  }
  return out;
}

/** Orthogonal (Manhattan) route between two XZ points, like the 2D schematic wires. */
export function manhattan(a, b) {
  const midX = a.x + (b.x - a.x) / 2;
  return [a, { x: midX, z: a.z }, { x: midX, z: b.z }, b];
}

/** Thin raised strip along an orthogonal polyline made of boxes (metal interconnect). */
export function metalRoute(points, width, height, y, material) {
  const geos = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-4) continue;
    const g = new THREE.BoxGeometry(len + width, height, width);
    g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
    g.translate((a.x + b.x) / 2, y + height / 2, (a.z + b.z) / 2);
    geos.push(g);
  }
  if (!geos.length) return null;
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return new THREE.Mesh(merged, material);
}

export function mergeGeos(geos) {
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

export function mergeInto(geos, material) {
  return new THREE.Mesh(mergeGeos(geos), material);
}

/** Instanced copies of one geometry at given matrices. */
export function instanced(geometry, material, matrices) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
export function mat4(x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1) {
  _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  _s.set(sx, sy, sz);
  return _m.clone().compose(new THREE.Vector3(x, y, z), _q, _s);
}

/** Cylinder between two points (bond, via, cable segment). */
export function cylinderBetween(a, b, r, material, radial = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radial), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function cylinderMatrix(a, b, r) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return new THREE.Matrix4().compose(a.clone().addScaledVector(dir, 0.5), q, new THREE.Vector3(r, len, r));
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m[k]) m[k].dispose();
      m.dispose();
    }
  });
}

/** Fit a set of 2D rectangles {x,y,w,h} into a target width/depth; returns mapping functions. */
export function fitLayout(rects, targetW, targetD) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
  }
  if (!rects.length) { minX = minY = 0; maxX = maxY = 1; }
  const s = Math.min(targetW / Math.max(1, maxX - minX), targetD / Math.max(1, maxY - minY));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return {
    s,
    x: (px) => (px - cx) * s,
    z: (py) => (py - cy) * s,
    width: (maxX - minX) * s,
    depth: (maxY - minY) * s,
  };
}

// Hide CSS2D labels that would overlap a more important / nearer one (screen-space greedy placement)
const _lp = new THREE.Vector3();
export function declutterLabels(labels, camera, container) {
  const W = container.clientWidth, H = container.clientHeight;
  const items = labels.map((l) => {
    l.obj.getWorldPosition(_lp);
    const d = _lp.distanceTo(camera.position);
    _lp.project(camera);
    return { l, d, x: ((_lp.x + 1) / 2) * W, y: ((1 - _lp.y) / 2) * H, front: _lp.z < 1 };
  }).sort((a, b) => (b.l.obj.userData.priority || 0) - (a.l.obj.userData.priority || 0) || a.d - b.d);
  const placed = [];
  for (const it of items) {
    const w = it.l.el.offsetWidth, h = it.l.el.offsetHeight;
    const r = { x0: it.x - w / 2 - 3, x1: it.x + w / 2 + 3, y0: it.y - h - 2, y1: it.y + 2 }; // label is lifted by translateY(-50%)
    const free = it.front && !placed.some((p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0);
    it.l.el.style.visibility = free ? 'visible' : 'hidden';
    if (free) placed.push(r);
  }
}
