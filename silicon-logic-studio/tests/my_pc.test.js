import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine } from '../src/engine/logicEngine.js';
import { MY_PC_SYSTEM } from '../src/engine/presets/myPcSystem.js';
import { HIERARCHICAL_SUBCIRCUITS as H, findSubcircuit } from '../src/engine/hierarchicalSubcircuits.js';
import { PROJECTS } from '../src/engine/projects.js';

const boot = (circuit = MY_PC_SYSTEM) => { const e = new LogicEngine(); e.loadCircuit(circuit); return e; };
const press = (e, on = 1) => { e.components.get('pwr_btn').outputs.out = on; e.propagate(); };
const pr = (e, id) => e.components.get(id).inputs.in;
const without = (pred) => { const c = structuredClone(MY_PC_SYSTEM); c.wires = c.wires.filter((x) => !pred(x)); return c; };

test('můj PC vypnutý: jen +5VSB, PS_ON# drží pull-up, nic neběží', () => {
  const e = boot();
  assert.equal(e.pinValue('psu', '16 PS_ON#'), 1);
  assert.equal(e.pinValue('mb', '9 +5VSB'), 5);
  for (const id of ['st_cpu', 'st_gpu', 'obraz', 'st_ssd', 'rpm_cpu', 'st_kb']) assert.equal(pr(e, id), 0, id);
});

test('tlačítko → PS_ON# 0 → zdroj, VRM, POST, grafika, monitor, SSD, USB a ventilátory', () => {
  const e = boot();
  press(e);
  assert.equal(e.pinValue('psu', '16 PS_ON#'), 0);
  assert.equal(e.pinValue('cpu', 'VCORE'), 1.2);
  assert.equal(e.pinValue('gpu', '8PIN-2 1-3 +12V'), 12);
  for (const id of ['st_cpu', 'st_gpu', 'obraz', 'st_ssd', 'st_kb', 'st_mouse', 'st_mic']) assert.equal(pr(e, id), 1, id);
  assert.equal(e.components.get('cpu').channels, 2, 'dual channel');
  assert.equal(pr(e, 'rpm_cpu'), 1200, '40 % z 2500 ot/min, ale ne pod minimem 1200');
  assert.equal(pr(e, 'rpm_case'), 700);
  press(e, 0);
  assert.equal(pr(e, 'obraz'), 0);
});

test('bez druhého 8 pinu grafika nenaběhne a monitor je bez signálu, PC jinak běží', () => {
  const e = boot(without((x) => x.to.id === 'gpu' && x.to.pin.startsWith('8PIN-2')));
  press(e);
  assert.equal(pr(e, 'st_cpu'), 1);
  assert.equal(pr(e, 'st_gpu'), 0);
  assert.equal(pr(e, 'obraz'), 0);
});

test('bez pamětí neprojde POST: žádné PCIe ani DMI, SSD a USB nejedou', () => {
  const e = boot(without((x) => x.from.pin === 'DQ 64 BIT'));
  press(e);
  assert.equal(pr(e, 'st_cpu'), 0);
  assert.equal(pr(e, 'st_gpu'), 0);
  assert.equal(pr(e, 'st_ssd'), 0);
  assert.equal(pr(e, 'st_kb'), 0);
});

test('jeden kanál: moduly jen v kanálu A → single channel, POST projde', () => {
  const e = boot(without((x) => x.from.pin === 'DQ 64 BIT' && x.from.id.startsWith('b')));
  press(e);
  assert.equal(pr(e, 'st_cpu'), 1);
  assert.equal(e.components.get('cpu').channels, 1);
});

test('8 pin zapojený obráceně (+12 V na zem karty) = zkrat X', () => {
  const bad = without((x) => x.to.id === 'gpu' && x.to.pin.startsWith('8PIN-1'));
  bad.wires.push({ from: { id: 'psu', pin: 'PCIe1 1-3 +12V' }, to: { id: 'gpu', pin: '8PIN-1 4-8 GND' } });
  const e = boot(bad);
  press(e);
  assert.equal(pr(e, 'st_gpu'), 'X');
});

test('každý díl L1 se dá rozkliknout a cesta vede až k atomům', () => {
  for (const comp of MY_PC_SYSTEM.components.filter((x) => x.type.startsWith('MYPC_'))) {
    assert.ok(findSubcircuit(comp, [{ key: 'root', level: 1 }]), `${comp.id} nemá vnitřek`);
  }
  // CPU → čip → jádro → sčítačka → … → atomy
  let circuit = MY_PC_SYSTEM, stack = [{ key: 'root', level: 1 }];
  const path = [];
  for (const id of ['cpu', 'core0', 'ex_fa']) {
    const sub = findSubcircuit(circuit.components.find((x) => x.id === id), stack);
    path.push(sub.key);
    circuit = sub;
    stack = [...stack, { key: sub.key, level: sub.level }];
  }
  assert.deepEqual(path, ['cfl_die', 'cfl_core', 'FULL_ADDER']);
  assert.equal(PROJECTS[2].circuit, MY_PC_SYSTEM);
});

test('Super I/O NCT6796D (ověřeno): deska → čip → logika tlačítka POWER', () => {
  const board = H.mypc_board;
  const stack = [{ key: 'root', level: 1 }, { key: 'mypc_board', level: 2 }];
  const sio = findSubcircuit(board.components.find((x) => x.id === 'sio'), stack);
  assert.equal(sio.key, 'nct6796d');
  assert.match(sio.subtitle, /0xD423/);
  const acpi = findSubcircuit(sio.components.find((x) => x.id === 'acpi'), [...stack, { key: 'nct6796d', level: 3 }]);
  assert.equal(acpi.key, 'cell_pwrbtn');
});

test('až úplně dolů: každý funkční blok mého PC vede přes simulovaný obvod k atomům', () => {
  // pasivní díly (měď, plast, cívky, kondenzátory, mechanika) jsou konec cesty
  const PASSIVE = new Set(['atx', 'panel', 'p8a', 'p8b', 'osd', 'stator', 'hub', 'btn', 'ac', 'bulk', 'cab', 'm2', 'edge', 'term', 'pwr', 'lc', 'pair']);
  const reached = new Map();
  const missing = [];
  const visit = (circuit, stack) => {
    for (const comp of circuit.components) {
      const sub = findSubcircuit(comp, stack);
      if (!sub) {
        if (comp.type === 'PC_BLOCK' && !PASSIVE.has(comp.id)) missing.push(`${stack.at(-1).key}/${comp.id}`);
        continue;
      }
      if (reached.has(sub.key)) continue;
      reached.set(sub.key, sub);
      visit(sub, [...stack, { key: sub.key, level: sub.level }]);
    }
  };
  visit(MY_PC_SYSTEM, [{ key: 'root', level: 1 }]);
  assert.deepEqual(missing, []);
  // z každého dosaženého obvodu vede cesta až na atomy (L8)
  // z ka�d�ho dosa�en�ho obvodu vede cesta a� na kvarky (L11); proces se d�d� od p�edk�, proto se nese cel� z�sobn�k
  const toQuarks = (stack, seen = new Set()) => {
    const key = stack.at(-1).key;
    if (H[key].level === 11) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return H[key].components.some((cmp) => { const sub = findSubcircuit(cmp, stack); return sub && toQuarks([...stack, { key: sub.key, level: sub.level }], seen); });
  };
  const stackTo = new Map();
  const walk = (circuit, stack) => {
    for (const comp of circuit.components) {
      const sub = findSubcircuit(comp, stack);
      if (!sub || stackTo.has(sub.key)) continue;
      const st = [...stack, { key: sub.key, level: sub.level }];
      stackTo.set(sub.key, st);
      walk(sub, st);
    }
  };
  walk(MY_PC_SYSTEM, [{ key: 'root', level: 1 }]);
  const dead = [...stackTo.entries()].filter(([, st]) => !toQuarks(st)).map(([k]) => k);
  assert.deepEqual(dead, []);
  assert.ok(reached.size >= 40, `dosažených obvodů: ${reached.size}`);
});

test('buňky: měnič, SerDes, SRAM a tlačítko POWER počítají jako hardware', () => {
  const run = (key) => { const e = boot(H[key]); return { e, set: (id, v) => { e.components.get(id).outputs.out = v; e.propagate(); } }; };
  const buck = run('cell_buck');
  buck.set('pwm', 1); assert.equal(pr(buck.e, 'sw'), 1, 'horní MOSFET: +12 V na SW');
  buck.set('pwm', 0); assert.equal(pr(buck.e, 'sw'), 0, 'dolní MOSFET: SW na zem');
  const sram = run('cell_sram');
  sram.set('d', 1); sram.set('wl', 1); sram.set('wl', 0); sram.set('d', 0);
  assert.equal(pr(sram.e, 'q'), 1, 'po zavření wordline drží bit');
  const ser = run('cell_serdes');
  [1, 0, 1, 1].forEach((v, i) => ser.set(`d${i}`, v));
  ser.set('load', 1); ser.set('clk', 1); ser.set('clk', 0); ser.set('load', 0);
  const bits = [];
  for (let i = 0; i < 4; i++) { bits.push(pr(ser.e, 'txp')); ser.set('clk', 1); ser.set('clk', 0); }
  assert.deepEqual(bits, [1, 0, 1, 1], 'slovo vyjde bit po bitu');
  const lt = run('cell_lt');
  lt.set('b1', 1); lt.set('a0', 1);
  assert.equal(pr(lt.e, 'out'), 1, '1 < 2');
  lt.set('a1', 1);
  assert.equal(pr(lt.e, 'out'), 0, '3 < 2 neplatí');
  const btn = run('cell_pwrbtn');
  btn.set('sb', 1); btn.set('btn', 1); btn.set('btn', 0);
  assert.equal(pr(btn.e, 'pson'), 0, 'po stisku PS_ON# = 0');
  btn.set('btn', 1); btn.set('btn', 0);
  assert.equal(pr(btn.e, 'pson'), 1, 'druhý stisk vypne');
});

test('PCB: díly leží na desce B360-PLUS na místech z manuálu, vývody uvnitř, router vede měď', async () => {
  const { MB, HW_PINS, myPcBoard } = await import('../src/engine/myPcLayout.js');
  const { componentDims } = await import('../src/engine/boardLayout.js');
  const { makeLayout } = await import('../src/views/canvas/geometry.js');
  const { pcbRoutes } = await import('../src/views/canvas/pcbRoutes.js');
  const e = boot();
  const on = [...e.components.values()].filter((c) => ['MYPC_CPU', 'MYPC_DIMM', 'MYPC_GPU', 'MYPC_SSD'].includes(c.type));
  assert.equal(on.length, 7);
  const rect = (c) => ({ ...componentDims(c, 'hardware'), x: c.x, y: c.y });
  for (const c of on) {
    const r = rect(c);
    assert.ok(r.x >= MB.x - 0.01 && r.y >= MB.y - 0.01 && r.y + r.h <= MB.y + MB.h + 0.01, `${c.id} mimo desku`);
    assert.ok(c.id === 'gpu' || r.x + r.w <= MB.x + MB.w + 0.01, `${c.id} přesahuje`); // jen grafika (230 mm) přečnívá desku 221 mm
  }
  for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
    const a = rect(on[i]), b = rect(on[j]);
    const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
    if (new Set([on[i].id, on[j].id]).has('ssd') && new Set([on[i].id, on[j].id]).has('gpu')) assert.ok(!apart, 'grafika zakrývá M.2_2 (manuál)');
    else assert.ok(apart, `${on[i].id} × ${on[j].id}`);
  }
  for (const [type, pins] of Object.entries(HW_PINS)) for (const [pin, [fx, fy]] of Object.entries(pins)) assert.ok(fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1, `${type}.${pin}`);
  const layout = makeLayout(e, 'hardware');
  const routes = pcbRoutes(e, (c) => layout.geom(c), (c, pin) => layout.geom(c).pins.get(pin), myPcBoard());
  const vals = [...routes.values()];
  assert.ok(vals.length >= 20, `cest na desce: ${vals.length}`);
  assert.ok(vals.filter(Boolean).length / vals.length >= 0.8, `router našel ${vals.filter(Boolean).length} z ${vals.length}`);
});

test('tranzistory podle skutečného procesu: i7 → Intel 14 nm FinFET, GA104 → Samsung 8N, VRM → trench, NV1 zůstává 0,5 µm', () => {
  const lvl = (key) => (key === 'root' ? 1 : H[key].level);
  const down = (path) => {
    let circuit = MY_PC_SYSTEM, stack = [{ key: 'root', level: 1 }];
    for (const id of path) {
      const sub = findSubcircuit(circuit.components.find((x) => x.id === id), stack);
      assert.ok(sub, `${id} v ${stack.at(-1).key}`);
      circuit = sub;
      stack = [...stack, { key: sub.key, level: sub.level }];
    }
    return stack;
  };
  // CPU → jádro → sčítačka → XOR → CMOS XOR → NMOS = Intel 14 nm
  const cpu = down(['cpu', 'core0', 'ex_fa', 'fa_xor1']);
  const n = H[cpu.at(-1).key].components.find((x) => x.type === 'NMOS');
  assert.equal(findSubcircuit(n, cpu).key, 'NMOS_intel14');
  // GA104 → SM → registr (D_FF) → NAND → PMOS = Samsung 8N
  const gpu = down(['gpu', 'gpu', 'gpc0', 'ex_ff', 'm_s']);
  const p = H[gpu.at(-1).key].components.find((x) => x.type === 'PMOS');
  assert.equal(findSubcircuit(p, gpu).key, 'PMOS_samsung8n');
  assert.deepEqual(down(['mb', 'vrm', 'hs']).slice(-2).map((e) => e.key), ['cell_buck', 'NMOS_power']);
  assert.deepEqual(down(['mb', 'vrm', 'hs', 'm1', 'el_si', 'nucleus', 'neutrons']).slice(-4).map((e) => e.key), ['sio2_gate_lattice', 'atom_si', 'nucleus_si', 'neutron']);
  assert.equal(findSubcircuit({ id: 'x', type: 'NMOS' }, [{ key: 'root', level: 1 }, { key: 'NAND', level: lvl('NAND') }]).key, 'nmos_transistor', 'NV1 0,5 µm');
});

test('L2 klávesnice: stisk klávesy A na buzeném sloupci se objeví na řádku', () => {
  const e = boot(H.mypc_keyboard);
  const set = (id, v) => { e.components.get(id).outputs.out = v; e.propagate(); };
  assert.equal(pr(e, 'in_row0'), 0);
  set('sw_a', 1);
  assert.equal(pr(e, 'in_row0'), 0, 'sloupec 0 není buzený');
  set('col0', 1);
  assert.equal(pr(e, 'in_row0'), 1);
});

test('L2 zdroj: měnič se spustí jen při PS_ON# = 0 a AC v pořádku', () => {
  const e = boot(H.mypc_psu);
  const set = (id, v) => { e.components.get(id).outputs.out = v; e.propagate(); };
  set('ps_on', 1); set('ac_ok', 1);
  assert.equal(pr(e, 'run'), 0);
  set('ps_on', 0);
  assert.equal(pr(e, 'run'), 1);
});
