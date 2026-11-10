// DIE 3D, úroveň 1 projektu AI PC: stejná sestava jako ANATOMY 3D (Dell T5810 v řezu, 2× P100 s adaptéry a ventilátory 9733,
// druhý zdroj, Add2PSU, redukce, regulátor TD404 – modely z ECONOMIC na polohách z anatomy/figures.js), napojená na
// součástky schématu napájení (presets/pcPower.js): dvojklik = vnitřek, kabely svítí podle sítě, ukazatele podle stavu.
// Jednotky scény: mm (kamera a světla se přizpůsobí, viewQuality.js).
import * as THREE from 'three';
import { std } from './common.js';
import { buildAnatomyScene } from '../anatomy/scene3d.js';
import { projectById } from '../../engine/projects.js';
import { button, indicator } from './myPcScene.js';

// součástka schématu L1 → díly sestavy (part.key z figures.pcParts)
const PARTS = {
  dell: /^(floor|rear|tray|board|psu685|cooler|retention|bays|cpu|ram\d|k620|ssd)$/,
  gpu1: /^(p100_0|shroud_0)$/, gpu2: /^(p100_1|shroud_1)$/, fan1: /^blower_0$/, fan2: /^blower_1$/,
  psu2: /^psu2$/, add2psu: /^add2psu$/, eps1: /^eps0$/, eps2: /^eps1$/, hub: /^pwm$/,
};

export function buildAiPcScene(ctx) {
  const { engine, group } = ctx;
  const { root, parts, clash } = buildAnatomyScene(projectById('p100pc'));
  if (clash) root.remove(clash); // kolize krytu s držákem ukazuje ANATOMY
  group.add(root);
  const objs = new Map();
  const used = new Set();
  for (const comp of engine.components.values()) {
    const re = PARTS[comp.id];
    if (!re) continue;
    const g = new THREE.Group();
    for (const p of parts.filter((q) => re.test(q.key))) { g.add(p.group); used.add(p); }
    const b = new THREE.Box3().setFromObject(g);
    ctx.addComp(comp, g, { label: new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 15, (b.min.z + b.max.z) / 2) });
    objs.set(comp.id, g);
  }
  // spínač a ukazatele před skříní
  const probes = [...engine.components.values()].filter((c) => c.type === 'PROBE');
  for (const comp of engine.components.values()) {
    if (comp.type === 'INPUT') ctx.addComp(comp, button(ctx, comp, 1, [-90, -560]), { label: new THREE.Vector3(-90, 40, -560) });
    if (comp.type === 'PROBE') {
      const obj = indicator(ctx, comp, probes.indexOf(comp), 1, [0, -560]);
      ctx.addComp(comp, obj, { label: obj.position.clone().add(new THREE.Vector3(0, 55, 0)) });
    }
  }
  // kabely mezi díly (ne k ukazatelům)
  const anchor = (id) => {
    const o = objs.get(id);
    if (!o) return null;
    const b = new THREE.Box3().setFromObject(o);
    return new THREE.Vector3((b.min.x + b.max.x) / 2, Math.min(b.max.y, b.min.y + 60), (b.min.z + b.max.z) / 2);
  };
  for (const wire of engine.wires) {
    const pa = anchor(wire.from.id), pb = anchor(wire.to.id);
    if (!pa || !pb || pa.distanceTo(pb) < 1) continue;
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y = Math.max(pa.y, pb.y) + pa.distanceTo(pb) * 0.12 + 20;
    const power = /\+12V|GND|COM|PS_ON/.test(`${wire.from.pin} ${wire.to.pin}`);
    const mat = std(0x1e1f23, { roughness: 0.5, emissive: 0x4a5566, emissiveIntensity: 0.3 });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([pa, mid, pb]), 40, power ? 3 : 1.8, 8), mat));
    ctx.addTrace(mat, wire);
  }
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), std(0x0c0c0e, { roughness: 0.92 }));
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -1;
  desk.receiveShadow = true;
  desk.userData.desk = true;
  group.add(desk);
  // pohled zepředu přes otevřený bok (+X), skříň v ose
  return { camera: [700, 450, -900], target: [90, 200, -260], floorY: -1 };
}
