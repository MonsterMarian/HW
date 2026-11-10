// DIE 3D, úroveň 1 projektu MŮJ PC: deska ASUS PRIME B360-PLUS ležící na stole a na ní díly ze schématu L1 na místech
// podle manuálu (myPcLayout.js / B360_LAYOUT) – stejné 3D modely v mm jako ECONOMIC (views/economic/models.js).
// Kolem desky zdroj, monitor, periferie, ventilátory, tlačítko POWER a ukazatele. Kabely a cesty svítí podle hodnoty sítě.
// Souřadnice: osa X = v (od horní hrany desky), osa Z = 110,5 − u (zadní I/O na +Z), Y nahoru; stejné měřítko jako karta NV1.
import * as THREE from 'three';
import { buildModel } from '../economic/models.js';
import { MY_PC_BOM } from '../../engine/economic/catalog.js';
import { PX_PER_MM } from '../../engine/boardLayout.js';
import { BOARD_SCALE } from './boardScene.js';
import { std, ribbonGeometry } from './common.js';
import { MB_W, MB_H, ON_BOARD, HW_PINS, mbPinUV } from '../../engine/myPcLayout.js';

const MM = PX_PER_MM * BOARD_SCALE; // 3D jednotek na mm
const X = (v) => (v - MB_H / 2) * MM;
const Z = (u) => (MB_W / 2 - u) * MM;
const PCB = 1.6; // mm

const ITEM = { mb: 'my_mobo', cpu: 'my_cpu', fan_cpu: 'my_cooler', gpu: 'my_gpu', ssd: 'my_ssd', psu: 'my_psu', mon: 'my_monitor', kb: 'my_keyboard', mouse: 'my_mouse', mic: 'my_mic' };
const FAN_CASE = { id: 'fan_case', dims: [120, 120, 25], model: { kind: 'fan120', marking: ['ENDORFY', 'STRATUS 120'], blades: 7 } };

/** 3D model položky kusovníku v jednotkách scény (zabalený, ať jde otáčet kolem středu). */
function model(item, rot = null) {
  const m = buildModel(item);
  m.scale.setScalar(MM);
  const g = new THREE.Group().add(m);
  if (rot) rot(g);
  g.updateMatrixWorld(true);
  return g;
}
/** Posune objekt tak, aby jeho obálka měla daný střed (cx, cz) / okraj a spodek y0. */
function align(obj, { cx, cz, x0, z1, y0 }) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  if (cx !== undefined) obj.position.x += cx - (b.min.x + b.max.x) / 2;
  if (x0 !== undefined) obj.position.x += x0 - b.min.x;
  if (cz !== undefined) obj.position.z += cz - (b.min.z + b.max.z) / 2;
  if (z1 !== undefined) obj.position.z += z1 - b.max.z;
  if (y0 !== undefined) obj.position.y += y0 - b.min.y;
  obj.updateMatrixWorld(true);
  return obj;
}

// zařízení mimo desku: střed na stole (mm ve světě: x podél X, z podél Z), otočení kolem svislé osy
const DESK = {
  mon: [0, 380, Math.PI], kb: [0, -340, Math.PI], mouse: [300, -340, Math.PI], mic: [-330, -300, 0],
  psu: [-330, -20, 0], fan_case: [340, 0, 0],
};

export function buildMyPcScene(ctx) {
  const { engine, group } = ctx;
  const bom = new Map([...MY_PC_BOM.map((it) => [it.id, it]), ['fan_case', FAN_CASE]]);
  const objs = new Map();
  const add = (comp, obj) => {
    const b = new THREE.Box3().setFromObject(obj);
    ctx.addComp(comp, obj, { label: new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 3 * MM, (b.min.z + b.max.z) / 2) });
    objs.set(comp.id, obj);
  };

  for (const comp of engine.components.values()) {
    const id = comp.id;
    const item = bom.get(ITEM[id] || (comp.type === 'MYPC_DIMM' ? 'my_ram' : id));
    let obj = null;
    if (id === 'mb') obj = model(item); // deska: PCB od y = 0
    else if (id === 'cpu') obj = align(model(item), { cx: X(86), cz: Z(108), y0: (PCB + 3) * MM });
    else if (id === 'fan_cpu') obj = align(model(item), { cx: X(86), cz: Z(108), y0: (PCB + 3 + 4.4 - 4) * MM }); // nožičky 4 mm pod základnou
    else if (comp.type === 'MYPC_DIMM') {
      const [u0, , du] = ON_BOARD[id];
      obj = align(model(item, (g) => { g.rotation.x = Math.PI / 2; }), { cx: X(82.7), cz: Z(u0 + du / 2), y0: (PCB + 2) * MM }); // kontakty dolů do slotu
    } else if (id === 'gpu') {
      // karta stojí ve slotu PCIEX16_1: kontakty dolů, záslepka u zadního plechu (+Z), chladič k dolní hraně desky (+X)
      obj = align(model(item, (g) => g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)))),
        { x0: X(182.8 - 3), z1: Z(-6), y0: (PCB + 3) * MM });
    } else if (id === 'ssd') obj = align(model(item, (g) => { g.rotation.y = Math.PI / 2; }), { cx: X(225), cz: Z(84), y0: (PCB + 2.5) * MM });
    else if (DESK[id] && item) {
      const [x, z, ry] = DESK[id];
      obj = align(model(item, (g) => { g.rotation.y = ry; }), { cx: x * MM, cz: z * MM, y0: 0 });
    } else if (comp.type === 'INPUT') obj = button(ctx, comp);
    else if (comp.type === 'PROBE') obj = indicator(ctx, comp, [...engine.components.values()].filter((c) => c.type === 'PROBE').indexOf(comp));
    if (obj) add(comp, obj);
  }

  // spoje: na desce měděné cesty po PCB, k zařízením mimo desku kabely
  const anchor = (comp, pin) => {
    if (comp.id === 'mb') { const [u, v] = mbPinUV(pin) || [MB_W / 2, MB_H / 2]; return { p: new THREE.Vector3(X(v), (PCB + 0.05) * MM, Z(u)), board: true }; }
    const rect = ON_BOARD[comp.id];
    const hp = HW_PINS[comp.type]?.[pin];
    if (rect && hp && !(comp.id === 'gpu' && /8PIN|HDMI/.test(pin))) {
      const [u0, v0, du, dv] = rect;
      return { p: new THREE.Vector3(X(v0 + hp[1] * dv), (PCB + 0.05) * MM, Z(u0 + hp[0] * du)), board: true };
    }
    const b = new THREE.Box3().setFromObject(objs.get(comp.id) || new THREE.Object3D());
    if (b.isEmpty()) return { p: new THREE.Vector3(), board: false };
    if (comp.id === 'gpu') return { p: new THREE.Vector3(/HDMI/.test(pin) ? b.min.x + 10 * MM : b.min.x + 5 * MM, /HDMI/.test(pin) ? 20 * MM : b.max.y, /HDMI/.test(pin) ? b.max.z : b.min.z + 40 * MM), board: false };
    return { p: new THREE.Vector3((b.min.x + b.max.x) / 2, Math.min(b.max.y, 30 * MM), (b.min.z + b.max.z) / 2), board: false };
  };
  for (const wire of engine.wires) {
    const a = engine.components.get(wire.from.id), b = engine.components.get(wire.to.id);
    if (!a || !b || b.type === 'PROBE') continue; // ukazatele svítí samy, vodiče k nim by scénu zahltily
    const pa = anchor(a, wire.from.pin), pb = anchor(b, wire.to.pin);
    const mat = std(0x1e1f23, { roughness: 0.5, emissive: 0x4a5566, emissiveIntensity: 0.3 });
    let mesh;
    if (pa.board && pb.board) {
      // cesta po desce: pravoúhle (nejdřív podél X, pak Z), 0,4 mm široká
      const pts = [{ x: pa.p.x, z: pa.p.z }, { x: pb.p.x, z: pa.p.z }, { x: pb.p.x, z: pb.p.z }];
      mesh = new THREE.Mesh(ribbonGeometry(pts, 0.8 * MM, (PCB + 0.08) * MM), mat);
    } else {
      // kabel obloukem nad stolem
      const mid = pa.p.clone().add(pb.p).multiplyScalar(0.5);
      mid.y = Math.max(pa.p.y, pb.p.y) + pa.p.distanceTo(pb.p) * 0.08 + 6 * MM;
      const curve = new THREE.CatmullRomCurve3([pa.p, mid, pb.p]);
      const power = /\+12V|\+5V|GND|COM|PCIe1|PCIe2|8PIN/.test(`${wire.from.pin} ${wire.to.pin}`);
      mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, (power ? 1.6 : 1.0) * MM, 8), mat);
    }
    group.add(mesh);
    ctx.addTrace(mat, wire);
  }

  // stůl a kamera: od přední hrany desky (24 pin, DIMM), monitor vzadu
  const box = new THREE.Box3().setFromObject(group);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x0c0c0e, { roughness: 0.92 }));
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.3 * MM;
  desk.receiveShadow = true;
  desk.userData.desk = true; // stůl se nepočítá do záběru kamery
  group.add(desk);
  const c = box.getCenter(new THREE.Vector3());
  return { camera: [c.x + 25, 75, -100], target: [c.x, 6, 6], floorY: desk.position.y };
}

/** Tlačítko POWER na stole (klik přepne); s = jednotek na mm, at = poloha [x, z] v mm. */
export function button(ctx, comp, s = MM, at = [250, -200]) {
  const MM = s;
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(40 * MM, 12 * MM, 40 * MM), std(0x16171a, { roughness: 0.6 }));
  base.position.y = 6 * MM;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(11 * MM, 11 * MM, 5 * MM, 32), std(0xc3c8ce, { metalness: 0.8, roughness: 0.3, emissive: 0x4a5566, emissiveIntensity: 0.3 }));
  cap.position.y = 14.5 * MM;
  g.add(base, cap);
  ctx.addSignal(cap.material, comp.id, 'out');
  g.position.set(at[0] * MM, 0, at[1] * MM);
  return g;
}

/** Ukazatel (sonda): sloupek s kontrolkou, svítí podle hodnoty; i = pořadí v řadě od at [x, z] (mm). */
export function indicator(ctx, comp, i, s = MM, at = [-260, -190]) {
  const MM = s;
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(3 * MM, 4 * MM, 30 * MM, 16), std(0x1d1e21, { roughness: 0.6 }));
  post.position.y = 15 * MM;
  const led = new THREE.Mesh(new THREE.SphereGeometry(7 * MM, 24, 16), std(0x2a2c30, { roughness: 0.3, emissive: 0x4a5566, emissiveIntensity: 0.3 }));
  led.position.y = 36 * MM;
  g.add(post, led);
  ctx.addSignal(led.material, comp.id, 'in');
  g.position.set((at[0] + i * 55) * MM, 0, at[1] * MM);
  return g;
}
