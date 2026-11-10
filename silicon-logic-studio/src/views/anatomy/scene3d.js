// ANATOMY 3D – stavba scény: stejná sestava jako 2D výkres (figures.js), ale z přesných 3D modelů dílů z ECONOMIC
// (models.js) natočených do skutečné polohy ve skříni. Otáčení myší, rozložení posuvníkem, čísla dílů.
import * as THREE from 'three';
import { std } from '../physics/common.js';
import { buildModel } from '../economic/models.js';
import { ASSEMBLIES, nv1Parts } from './figures.js';

// osy sestavy (x od desky, y dopředu, z nahoru) → three.js (Y nahoru): X = x, Y = z, Z = -y
const AXIS = { x: [1, 0, 0], y: [0, 0, -1], z: [0, 1, 0] };
const axisVec = (s) => new THREE.Vector3(...AXIS[s.replace('-', '')]).multiplyScalar(s.startsWith('-') ? -1 : 1);
const toThree = ([x, y, z]) => new THREE.Vector3(x, z, -y);

/** Natočí model podle orient a posune ho do krabice sestavy b = [x, y, z, w, d, h] (zarovnání k desce, podlaze a zadní stěně). */
function place(obj, orient, b) {
  const [a, c, e] = orient.map(axisVec);
  obj.applyMatrix4(new THREE.Matrix4().makeBasis(a, c, e));
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.add(new THREE.Vector3(b[0] - box.min.x, b[2] - box.min.y, -b[1] - box.max.z));
}

const CHASSIS_MAT = {
  floor: () => std(0x2a2c30, { metalness: 0.6, roughness: 0.45 }),
  rear: () => std(0x2a2c30, { metalness: 0.6, roughness: 0.45 }),
  tray: () => std(0x24262a, { metalness: 0.6, roughness: 0.45 }),
  board: () => std(0x14532d, { roughness: 0.45 }),
  psu685: () => std(0x9aa0a7, { metalness: 0.85, roughness: 0.35 }),
  cooler: () => std(0x1a1b1e, { roughness: 0.6 }),
  retention: () => std(0x111214, { roughness: 0.7 }),
  bays: () => std(0x6b7078, { metalness: 0.7, roughness: 0.4 }),
};

function boxMesh([x, y, z, w, d, h], mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.copy(toThree([x + w / 2, y + d / 2, z + h / 2]));
  return m;
}

/** Sestaví scénu: { root, parts: [{ id, group, base, explode }], clash } */
export function buildAnatomyScene(project) {
  const isPc = project.id in ASSEMBLIES;
  const model = isPc ? ASSEMBLIES[project.id]() : nv1Parts(project.circuit);
  const bom = new Map(project.bom.map((it) => [it.id, it]));
  const root = new THREE.Group();
  const parts = [];
  for (const p of model.parts) {
    const g = new THREE.Group();
    const item = bom.get(p.id);
    if (p.box) g.add(boxMesh(p.b, (CHASSIS_MAT[p.key] || CHASSIS_MAT.tray)())); // skříň = jednoduché desky
    else if (item) {
      const m = buildModel(p.freqHz ? { ...item, model: { ...item.model, freqHz: p.freqHz } } : item);
      place(m, p.orient || ['x', 'z', '-y'], p.b);
      g.add(m);
    }
    g.userData.partId = p.id;
    root.add(g);
    parts.push({ id: p.id, key: p.key, group: g, explode: toThree(p.explode) });
  }
  let clash = null;
  if (isPc) {
    // sundaný bok a víko: čárkované hrany skříně
    const { W, D, H } = model.shell;
    const pts = [[W, 0, 0], [W, D, 0], [W, D, 0], [0, D, 0], [W, 0, H], [W, D, H], [W, D, H], [0, D, H], [0, D, H], [0, 0, H], [0, 0, H], [W, 0, H], [W, 0, 0], [W, 0, H], [W, D, 0], [W, D, H], [0, D, 0], [0, D, H]].map(toThree);
    const edges = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x7a7d82, dashSize: 8, gapSize: 6 }));
    edges.computeLineDistances();
    root.add(edges);
  }
  if (model.clash) {
    // limit plné délky PCIe a přesah krytu + ventilátoru za něj (jen ve složeném stavu)
    clash = new THREE.Group();
    const red = new THREE.MeshBasicMaterial({ color: 0xde3b3d, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    clash.add(boxMesh([12, model.clash.y0, 40, 158, 0.6, 160], red));
    for (const p of model.parts.filter((q) => q.id === 'blower' || q.id === 'shroud')) {
      const [x0, y0, z0, w, d, h] = p.b;
      if (y0 + d > model.clash.y0) clash.add(boxMesh([x0, Math.max(y0, model.clash.y0), z0, w, y0 + d - Math.max(y0, model.clash.y0), h], new THREE.MeshBasicMaterial({ color: 0xde3b3d, transparent: true, opacity: 0.28, depthWrite: false })));
    }
    root.add(clash);
  }
  if (!isPc) {
    // deska karty NV1 z obrysu PCB pohledu
    const shape = new THREE.Shape(model.card.map(([x, y]) => new THREE.Vector2(x, -y))); // po otočení: -y tvaru → Z = -y sestavy
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false });
    geo.rotateX(Math.PI / 2); // tvar (x, y) → podlaha, vytlačení nahoru
    const pcb = new THREE.Mesh(geo, std(0x14532d, { roughness: 0.45 }));
    pcb.position.y = 1.6;
    root.add(pcb);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, parts, clash, camera: model.camera || [0.75, 0.55, 0.75] };
}

