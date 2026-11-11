// Skutečné CAD modely (převedené mimo aplikaci) místo ručně modelovaných dílů. Soubory se načítají jako assety
// (URL), ne jako base64 v JS balíku.
// - Arctic P12 Pro: oficiální STEP (support.arctic.de, „3D Model Reference“) → GLB; rám 120 × 120 × 25 mm shodný s P12 PWM PST.
// - 2,5" SATA disk 7 mm: FreeCAD Parts Library (Computing/Storage/HDD) – obecné pouzdro 2,5", roztažené na rozměry dílu.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import arcticP12 from '../../assets/models/arctic_p12_pro.glb?url';
import ssd25 from '../../assets/models/freecad_ssd25_7mm.stl?url';

// fit: obecný model se roztáhne na item.dims [délka, šířka, výška]; tint: barva (STEP/STL barvy nenesou)
const SOURCES = {
  arctic_p12_pro: { url: arcticP12, tint: 0x1b1c1f }, // skutečný P12 je z černého plastu
  ssd25_7mm: { url: ssd25, tint: 0x232427, fit: true, stl: true }, // 870 EVO: černé pouzdro
};
const cache = new Map();

function load(name) {
  if (!cache.has(name)) {
    const src = SOURCES[name];
    cache.set(name, src.stl
      ? new STLLoader().loadAsync(src.url).then((geo) => { geo.computeVertexNormals(); return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.2 })); })
      : new GLTFLoader().loadAsync(src.url).then((gltf) => gltf.scene));
  }
  return cache.get(name);
}

const sizeOf = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); };

/** Nahradí ruční model ve skupině g skutečným (stejný půdorys: nejtenčí osa CAD modelu → svislá, spodek na y = 0). */
export async function swapIn(g, item) {
  const src = SOURCES[item.model.real];
  const m = (await load(item.model.real)).clone(true);
  const size = sizeOf(m);
  const thin = ['x', 'y', 'z'].reduce((a, k) => (size[k] < size[a] ? k : a), 'x');
  if (thin === 'z') m.rotation.x = -Math.PI / 2;
  if (thin === 'x') m.rotation.z = Math.PI / 2;
  const wrap = new THREE.Group().add(m);
  if (src.fit) {
    const [L, W, H] = item.dims;
    let s = sizeOf(wrap);
    if ((s.x >= s.z) !== (L >= W)) { wrap.rotation.y = Math.PI / 2; s = sizeOf(wrap); } // delší strana podle rozměrů dílu
    wrap.scale.set(...(wrap.rotation.y ? [W / s.z, H / s.y, L / s.x] : [L / s.x, H / s.y, W / s.z])); // scale je v lokálních osách (před otočením)
  }
  const outer = new THREE.Group().add(wrap);
  const b = new THREE.Box3().setFromObject((outer.updateMatrixWorld(true), outer));
  wrap.position.sub(new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2));
  outer.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = o.material.clone();
    o.material.side = THREE.DoubleSide;
    if (src.tint !== undefined) o.material.color.setHex(src.tint);
  });
  // obecný model (fit) nemá potisk: štítky ručního modelu (roviny) zůstanou, rozměry sedí
  for (const ch of [...g.children]) if (!(src.fit && ch.geometry?.type === 'PlaneGeometry')) g.remove(ch);
  g.add(outer);
  g.userData.real = item.model.real;
}
