import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS } from '../src/engine/projects.js';
import { bomTotal, withOffers } from '../src/engine/economic/catalog.js';
import { OFFERS, RATES } from '../src/engine/economic/offers.js';
import { DEVICES } from '../src/engine/devices/index.js';
import { packRows } from '../src/views/economic/layout.js';
import { MODEL_KINDS } from '../src/views/economic/models.js';

test('můj PC: díly z diagnostiky, odhady označené, 4× 8 GB RAM', () => {
  const bom = PROJECTS[2].bom;
  const it = (id) => bom.find((i) => i.id === id);
  assert.equal(it('my_ram').qty, 4);
  assert.deepEqual(it('my_mobo').dims.slice(0, 2), [305, 221]);
  assert.deepEqual(it('my_gpu').dims, [230, 120, 42]);
  for (const id of ['my_case', 'my_psu', 'my_cooler']) assert.match(it(id).dimsSrc, /^odhad/, id);
  assert.ok(bom.every((i) => i.price), 'každý díl má aspoň jednu nabídku');
});

test('po spuštění: 1. projekt karta NV1, 2. AI PC s P100, 3. můj PC', () => {
  assert.deepEqual(PROJECTS.map((p) => p.id), ['nv1', 'p100pc', 'mypc']);
  assert.ok(PROJECTS[0].circuit.components.some((c) => c.type === 'NV1_CORE'));
  assert.ok(PROJECTS.every((p) => p.views.includes('economic') && p.views.includes(p.defaultView)));
});

test('kusovníky: každá položka má rozměry se zdrojem, model a ceny jen ze skutečných nabídek', () => {
  for (const p of PROJECTS) {
    const ids = new Set();
    for (const it of p.bom) {
      assert.ok(!ids.has(it.id), `duplicitní id ${it.id}`);
      ids.add(it.id);
      assert.ok(it.id in OFFERS, `${it.id}: chybí rešerše nabídek`);
      assert.ok(Number.isInteger(it.qty) && it.qty > 0, it.id);
      assert.ok(it.dims.length === 3 && it.dims.every((d) => d > 0), `${it.id}: rozměry`);
      assert.match(it.dimsSrc, /^(ověřeno|odhad)/, `${it.id}: zdroj rozměru`);
      assert.ok(MODEL_KINDS.includes(it.model.kind), `${it.id}: model ${it.model.kind}`);
      if (it.model.kind === 'chip') assert.ok(DEVICES[it.model.type], `${it.id}: typ ${it.model.type}`);
      const real = it.offers.filter((o) => !o.alt);
      if (real.length) assert.deepEqual(it.price, [Math.min(...real.map((o) => o.priceCzk)), Math.max(...real.map((o) => o.priceCzk))]);
      else assert.equal(it.price, null);
    }
  }
});

test('nabídky: konkrétní https URL (ne vyhledávání), cena, měna s kurzem, způsob ověření', () => {
  for (const [id, { offers, note }] of Object.entries(OFFERS)) {
    assert.ok(note, `${id}: poznámka`);
    for (const o of offers) {
      assert.match(o.url, /^https:\/\/[^\s]+$/, `${id}: ${o.url}`);
      assert.doesNotMatch(o.url, /search|wholesale|[?&](q|h%5Bfraze%5D|_nkw|hledat|exps)=/i, `${id}: vyhledávací URL ${o.url}`);
      assert.ok(o.shop && o.title && o.condition, `${id}: popis nabídky`);
      assert.ok(['fetched', 'snippet'].includes(o.verified), `${id}: ${o.verified}`);
      assert.ok(o.currency === 'CZK' || RATES[o.currency], `${id}: kurz ${o.currency}`);
      assert.ok(o.priceCzk > 0, `${id}: cena`);
    }
  }
});

test('AI PC odpovídá dokumentu: 2× P100 s chlazením a EPS redukcí, 4× RDIMM, Dell T5810', () => {
  const bom = PROJECTS[1].bom;
  const qty = (id) => bom.find((i) => i.id === id)?.qty;
  for (const [id, n] of [['p100', 2], ['shroud', 2], ['blower', 2], ['eps_cable', 2], ['ram', 4], ['dell_t5810', 1]]) assert.equal(qty(id), n, id);
  assert.deepEqual(bom.find((i) => i.id === 'dell_t5810').dims, [471, 172.6, 414]);
  assert.equal(bom.find((i) => i.id === 'p100').dims[0], 267);
  assert.ok(bom.every((i) => i.price), 'každý díl PC jde dnes koupit');
});

test('bomTotal: nejlevnější, medián a díly bez nabídky', () => {
  const offers = {
    a: { note: 'x', offers: [{ priceCzk: 10 }, { priceCzk: 30 }, { priceCzk: 20 }] },
    b: { note: 'y', offers: [{ priceCzk: 5, alt: true }] },
  };
  const bom = withOffers([{ id: 'a', name: 'A', qty: 2 }, { id: 'b', name: 'B', qty: 1 }], offers);
  assert.deepEqual(bom[0].price, [10, 30]);
  assert.equal(bom[0].median, 20);
  assert.equal(bom[1].price, null);
  assert.deepEqual(bomTotal(bom), { min: 20, median: 40, max: 60, missing: ['B'] });
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
