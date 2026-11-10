import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS } from '../src/engine/projects.js';
import { bomTotal } from '../src/engine/economic/catalog.js';
import { DEVICES } from '../src/engine/devices/index.js';
import { packRows } from '../src/views/economic/layout.js';
import { MODEL_KINDS } from '../src/views/economic/models.js';

test('po spuštění: 1. projekt karta NV1, 2. projekt AI PC s P100', () => {
  assert.deepEqual(PROJECTS.map((p) => p.id), ['nv1', 'p100pc']);
  assert.ok(PROJECTS[0].circuit.components.some((c) => c.type === 'NV1_CORE'));
  assert.ok(PROJECTS.every((p) => p.views.includes('economic') && p.views.includes(p.defaultView)));
});

test('kusovníky: každá položka má cenu, rozměry, model a odkaz na obchod', () => {
  for (const p of PROJECTS) {
    const ids = new Set();
    for (const it of p.bom) {
      assert.ok(!ids.has(it.id), `duplicitní id ${it.id}`);
      ids.add(it.id);
      assert.ok(Number.isInteger(it.qty) && it.qty > 0, it.id);
      assert.ok(it.price[0] > 0 && it.price[0] <= it.price[1], `${it.id}: cena`);
      assert.ok(['doc', 'odhad'].includes(it.src), it.id);
      assert.ok(it.dims.length === 3 && it.dims.every((d) => d > 0), `${it.id}: rozměry`);
      assert.ok(MODEL_KINDS.includes(it.model.kind), `${it.id}: model ${it.model.kind}`);
      if (it.model.kind === 'chip') assert.ok(DEVICES[it.model.type], `${it.id}: typ ${it.model.type}`);
      assert.ok(it.links.length > 0 && it.links.every((l) => /^https:\/\/[^ ]+$/.test(l.url)), `${it.id}: odkazy`);
    }
  }
});

test('AI PC odpovídá dokumentu: 2× P100, 2× EPS redukce, 4× RDIMM, Dell T5810', () => {
  const bom = PROJECTS[1].bom;
  const qty = (id) => bom.find((i) => i.id === id)?.qty;
  assert.equal(qty('p100'), 2);
  assert.equal(qty('shroud'), 2);
  assert.equal(qty('eps_cable'), 2);
  assert.equal(qty('ram'), 4);
  assert.equal(qty('dell_t5810'), 1);
  assert.deepEqual(bom.find((i) => i.id === 'dell_t5810').dims, [471, 172.6, 414]);
  assert.equal(bom.find((i) => i.id === 'p100').dims[0], 267);
});

test('bomTotal sčítá qty × cena', () => {
  assert.deepEqual(bomTotal([{ qty: 2, price: [10, 20] }, { qty: 1, price: [5, 5] }]), { min: 25, max: 45 });
});

test('packRows: díly se nepřekrývají a respektují šířku', () => {
  const sizes = [{ w: 172, d: 471 }, { w: 300, d: 40 }, { w: 10, d: 10 }, { w: 600, d: 120 }, { w: 50, d: 300 }];
  const { positions, width, depth } = packRows(sizes, { gap: 20, maxW: 700 });
  const rects = positions.map((p, i) => ({ x0: p.x, z0: p.z, x1: p.x + sizes[i].w, z1: p.z + sizes[i].d }));
  for (let i = 0; i < rects.length; i++) {
    assert.ok(rects[i].x1 <= Math.max(700, width) + 1e-9);
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0, `překryv ${i}/${j}`);
    }
  }
  assert.ok(depth >= 471);
});
