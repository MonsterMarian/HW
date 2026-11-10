// Společná kvalita 3D pohledů (DIE 3D, ECONOMIC, ANATOMY): ambient occlusion (GTAO), měkké stíny, světla a kamera
// podle velikosti scény (scény jsou v m, mm, µm, nm, Å i fm) a obrysy hran, aby byly vrstvy a bloky čitelné.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Render přes kompozitor: scéna → GTAO → tone mapping. Vrací { composer, gtao, setSize, render, setRadius }. */
export function createComposer(renderer, scene, camera, w, h) {
  renderer.shadowMap.type = THREE.PCFShadowMap; // v three 0.187 měkčí přes shadow.radius (PCFSoft byl odstraněn)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, w, h);
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  return {
    composer, gtao,
    setSize(width, height) { composer.setSize(width, height); },
    render() { composer.render(); },
    /** Poloměr stínění v jednotkách scény (poměr k velikosti scény R). */
    setRadius(R) {
      gtao.updateGtaoMaterial({ radius: R * 0.06, distanceExponent: 1, thickness: R * 0.03, scale: 1, samples: 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    },
  };
}

/** Obálka viditelných těles bez stolu (userData.desk) a bez popisků. */
export function contentBounds(root) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.visible || o.userData.desk || !(o.isMesh || o.isInstancedMesh)) return;
    if (o.material?.isMeshBasicMaterial && o.geometry?.type === 'PlaneGeometry') return; // popisky v 3D
    box.expandByObject(o, false);
  });
  return box;
}

const SMOOTH = /Sphere|Tube|Torus|Capsule|Lathe|Cylinder|Circle|Ring/;
/** Tenké obrysy hran u hranatých těles (bloky, vrstvy, desky); kulatá tělesa a popisky bez obrysu. */
export function addEdges(root) {
  const dark = new THREE.LineBasicMaterial({ color: 0x0a0b0d, transparent: true, opacity: 0.5 });
  const light = new THREE.LineBasicMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.45 });
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); });
  for (const m of meshes) {
    const geo = m.geometry, mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!geo?.attributes?.position || geo.attributes.position.count > 3000 || SMOOTH.test(geo.type)) continue;
    if (!mat || mat.isMeshBasicMaterial || mat.colorWrite === false || (mat.transparent && mat.opacity < 0.15) || geo.type === 'PlaneGeometry') continue;
    const lum = mat.color ? mat.color.r * 0.3 + mat.color.g * 0.59 + mat.color.b * 0.11 : 0.5;
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lum < 0.22 ? light : dark);
    lines.raycast = () => {}; // obrys se nevybírá myší
    lines.userData.edge = true;
    m.add(lines);
  }
}

/**
 * Světla, stíny, mlha, mřížka a kamera podle velikosti scény.
 * camera / target z builderu určují směr pohledu, vzdálenost se dopočítá, aby byla vidět celá scéna.
 */
export function fitView({ scene, camera, controls, key, rim, warm, grid, box, cameraPos, target, aspect }) {
  if (box.isEmpty()) return 10;
  const c = box.getCenter(new THREE.Vector3());
  const R = Math.max(1e-3, box.getSize(new THREE.Vector3()).length() / 2);
  const t = new THREE.Vector3(...target);
  const dir = new THREE.Vector3(...cameraPos).sub(t);
  if (dir.lengthSq() < 1e-9) dir.set(0.5, 0.6, 0.9);
  dir.normalize();
  // nejbližší vzdálenost, ze které jsou všechny rohy obálky v záběru (s okrajem pro panely a popisky)
  camera.aspect = aspect;
  camera.near = Math.max(R * 0.002, 1e-4);
  camera.far = R * 60;
  camera.updateProjectionMatrix();
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  const fits = (d) => {
    camera.position.copy(t).addScaledVector(dir, d);
    camera.lookAt(t);
    camera.updateMatrixWorld();
    return corners.every((p) => { const q = p.clone().project(camera); return q.z < 1 && Math.abs(q.x) < 0.82 && Math.abs(q.y) < 0.78; });
  };
  let dist = R * 0.3;
  for (let i = 0; i < 80 && !fits(dist); i++) dist *= 1.07;
  camera.position.copy(t).addScaledVector(dir, dist);
  controls.target.copy(t);
  controls.minDistance = R * 0.08;
  controls.maxDistance = R * 8;
  controls.update();
  // klíčové světlo shora zepředu, stíny přesně na scénu
  key.position.copy(c).add(new THREE.Vector3(R * 0.8, R * 1.8, R * 1.2));
  key.target.position.copy(c);
  key.target.updateMatrixWorld();
  Object.assign(key.shadow.camera, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3, near: R * 0.1, far: R * 5 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = R * 0.002;
  key.shadow.radius = 4;
  rim?.position.copy(c).add(new THREE.Vector3(-R * 1.5, R * 1.0, -R * 1.3));
  warm?.position.copy(c).add(new THREE.Vector3(R * 1.4, R * 0.4, -R * 1.0));
  if (scene.fog) scene.fog.density = 0.12 / R;
  if (grid) { grid.scale.setScalar((R * 3) / 100); grid.position.x = c.x; grid.position.z = c.z; }
  return R;
}
