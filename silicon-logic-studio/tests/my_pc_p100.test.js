import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine } from '../src/engine/logicEngine.js';
import { MY_PC_P100_SYSTEM } from '../src/engine/presets/myPcP100System.js';
import { HIERARCHICAL_SUBCIRCUITS as H, findSubcircuit } from '../src/engine/hierarchicalSubcircuits.js';
import { PROJECTS } from '../src/engine/projects.js';
import { MY_PC_P100_BOM } from '../src/engine/economic/catalog.js';

const boot = (circuit = MY_PC_P100_SYSTEM) => { const e = new LogicEngine(); e.loadCircuit(circuit); return e; };
const press = (e, on = 1) => { e.components.get('pwr_btn').outputs.out = on; e.propagate(); };
const pr = (e, id) => e.components.get(id).inputs.in;
const without = (pred) => { const c = structuredClone(MY_PC_P100_SYSTEM); c.wires = c.wires.filter((x) => !pred(x)); return c; };

test('MŮJ PC + 2× P100: vypnuto nic neběží, druhý zdroj stojí', () => {
  const e = boot();
  for (const id of ['st_cpu', 'st_p100a', 'st_p100b', 'obraz', 'rpm_bl1']) assert.equal(pr(e, id), 0, id);
  assert.equal(e.pinValue('psu2', '16 PS_ON#'), 1);
});

test('MŮJ PC + 2× P100: tlačítko → Add2PSU spne zdroj 2, obě P100 běží, obraz z iGPU, 9733 se točí', () => {
  const e = boot();
  press(e);
  assert.equal(e.pinValue('psu2', '16 PS_ON#'), 0);
  for (const id of ['st_cpu', 'st_p100a', 'st_p100b', 'obraz', 'st_ssd', 'st_kb']) assert.equal(pr(e, id), 1, id);
  assert.equal(pr(e, 'rpm_bl1'), 3150, '70 % z 4500 ot/min');
  assert.ok(!e.components.has('gpu'), 'RTX 3060 Ti je venku');
  press(e, 0);
  assert.equal(pr(e, 'st_p100b'), 0);
});

test('MŮJ PC + 2× P100: bez Add2PSU druhá karta stojí, první jede', () => {
  const e = boot(without((x) => x.to.id === 'add2psu'));
  press(e);
  assert.equal(pr(e, 'st_p100a'), 1);
  assert.equal(pr(e, 'st_p100b'), 0);
  assert.equal(pr(e, 'rpm_bl1'), 0);
});

test('MŮJ PC + 2× P100: PCIe kabel přímo do EPS karty = zkrat X', () => {
  const bad = without((x) => x.to.id === 'p100a' && x.to.pin.startsWith('EPS'));
  bad.wires.push({ from: { id: 'psu', pin: 'PCIe1 1-3 +12V' }, to: { id: 'p100a', pin: 'EPS1-4 GND' } });
  const e = boot(bad);
  press(e);
  assert.equal(pr(e, 'st_p100a'), 'X');
});

test('MŮJ PC + 2× P100: z každého dílu vede dvojklik až na kvarky', () => {
  const PASSIVE = new Set(['atx', 'panel', 'p8a', 'p8b', 'osd', 'stator', 'hub', 'btn', 'ac', 'bulk', 'cab', 'm2', 'edge', 'term', 'pwr', 'lc', 'pair', 'emi', 'br', 'cap', 'pot', 'qpi', 'fan']);
  const stackTo = new Map(), missing = [];
  const walk = (circuit, stack) => {
    for (const comp of circuit.components) {
      const sub = findSubcircuit(comp, stack);
      if (!sub) { if (comp.type === 'PC_BLOCK' && !PASSIVE.has(comp.id)) missing.push(`${stack.at(-1).key}/${comp.id}`); continue; }
      if (stackTo.has(sub.key)) continue;
      const st = [...stack, { key: sub.key, level: sub.level }];
      stackTo.set(sub.key, st);
      walk(sub, st);
    }
  };
  walk(MY_PC_P100_SYSTEM, [{ key: 'root', level: 1 }]);
  assert.deepEqual(missing, []);
  const toQuarks = (stack, seen = new Set()) => {
    const key = stack.at(-1).key;
    if (H[key].level === 11) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return H[key].components.some((cmp) => { const sub = findSubcircuit(cmp, stack); return sub && toQuarks([...stack, { key: sub.key, level: sub.level }], seen); });
  };
  assert.deepEqual([...stackTo.entries()].filter(([, st]) => !toQuarks(st)).map(([k]) => k), []);
  for (const k of ['cfl_die', 'gp100_die', 'p100_board', 'add2psu_inside']) assert.ok(stackTo.has(k), k);
});

test('MŮJ PC + 2× P100 PCB: karty ve slotech PCIEX16_1 a PCIEX16_2 se nepřekrývají, router vede měď', async () => {
  const { MB, myPcBoard } = await import('../src/engine/myPcLayout.js');
  const { componentDims } = await import('../src/engine/boardLayout.js');
  const { makeLayout } = await import('../src/views/canvas/geometry.js');
  const { pcbRoutes } = await import('../src/views/canvas/pcbRoutes.js');
  const e = boot();
  const rect = (id) => { const c = e.components.get(id); return { ...componentDims(c, 'hardware'), x: c.x, y: c.y }; };
  const a = rect('p100a'), b = rect('p100b');
  for (const r of [a, b]) assert.ok(r.x >= MB.x - 0.01 && r.y >= MB.y && r.y + r.h <= MB.y + MB.h, 'karta nad deskou');
  assert.ok(a.y + a.h <= b.y, 'P100 #1 nad P100 #2 bez překryvu');
  const layout = makeLayout(e, 'hardware');
  const routes = pcbRoutes(e, (c) => layout.geom(c), (c, pin) => layout.geom(c).pins.get(pin), myPcBoard());
  const vals = [...routes.values()];
  assert.ok(vals.filter(Boolean).length / vals.length >= 0.8, `router našel ${vals.filter(Boolean).length} z ${vals.length}`);
});

test('MŮJ PC + 2× P100: projekt a kusovník – bez RTX 3060 Ti, s P100 z AI PC', () => {
  assert.equal(PROJECTS.find((p) => p.id === 'mypc_p100').circuit, MY_PC_P100_SYSTEM);
  const ids = MY_PC_P100_BOM.map((it) => it.id);
  assert.ok(!ids.includes('my_gpu'));
  for (const id of ['my_mobo', 'my_cpu', 'p100', 'eps_cable', 'psu2', 'add2psu']) assert.ok(ids.includes(id), id);
  assert.equal(MY_PC_P100_BOM.find((it) => it.id === 'p100').qty, 2);
});
