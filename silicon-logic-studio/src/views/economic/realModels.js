// Skutečné CAD modely výrobců (převedené ze STEP do GLB mimo aplikaci, vložené do balíčku) místo ručně modelovaných dílů.
// Zatím jediný volně dostupný oficiální model dílu z kusovníků: Arctic P12 Pro (support.arctic.de, „3D Model Reference“;
// rám 120 × 120 × 25 mm shodný s P12 PWM PST, lopatky se liší). Ostatní výrobci CAD modely celých dílů nezveřejňují.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import arcticP12 from '../../assets/models/arctic_p12_pro.glb?inline';

const SOURCES = { arctic_p12_pro: arcticP12 };
// STEP od Arcticu nenese barvy (vše bílé) – skutečný P12 je z černého plastu
const TINT = { arctic_p12_pro: 0x1b1c1f };
const cache = new Map();

function load(name) {
  if (!cache.has(name)) {
    const b64 = SOURCES[name].split(',')[1];
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    cache.set(name, new GLTFLoader().parseAsync(bytes.buffer, ''));
  }
  return cache.get(name);
}

/** Nahradí ruční model ve skupině g skutečným (stejný půdorys: nejtenčí osa CAD modelu → svislá, spodek na y = 0). */
export async function swapIn(g, item) {
  const gltf = await load(item.model.real);
  const m = gltf.scene.clone(true);
  const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
  const thin = ['x', 'y', 'z'].reduce((a, k) => (size[k] < size[a] ? k : a), 'x');
  if (thin === 'z') m.rotation.x = -Math.PI / 2;
  if (thin === 'x') m.rotation.z = Math.PI / 2;
  const wrap = new THREE.Group().add(m);
  wrap.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(wrap);
  m.position.sub(new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2));
  wrap.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = o.material.clone();
    o.material.side = THREE.DoubleSide;
    if (TINT[item.model.real] !== undefined) o.material.color.setHex(TINT[item.model.real]);
  });
  for (const ch of [...g.children]) g.remove(ch);
  g.add(wrap);
  g.userData.real = item.model.real;
}
