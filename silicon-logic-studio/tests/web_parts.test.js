// Web „Silicon Studio · Hardware“: registr součástek a data rešerše.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTS, FIDELITY, KINDS, partById, overallOf, projectsOf } from '../src/web/parts.js';
import { RESEARCH, STAGES } from '../src/web/research/index.js';
import { PROJECTS } from '../src/engine/projects.js';
import { HIERARCHICAL_SUBCIRCUITS as H } from '../src/engine/hierarchicalSubcircuits.js';

test('every part has a known kind, fidelity for model and schema, and valid links', () => {
  const ids = new Set();
  for (const p of PARTS) {
    assert.ok(!ids.has(p.id), `duplicitní id ${p.id}`); ids.add(p.id);
    assert.ok(KINDS.includes(p.kind), `${p.id}: kategorie ${p.kind}`);
    for (const [lv, note] of [p.model, p.schema]) assert.ok(FIDELITY[lv] && note, `${p.id}: přesnost`);
    assert.ok(FIDELITY[overallOf(p)]);
    if (p.in) assert.ok(partById(p.in), `${p.id}: rodič ${p.in}`);
    if (p.bom) assert.ok(p.item, `${p.id}: položka kusovníku ${p.bom}`);
    if (p.drill) assert.ok(H[p.drill], `${p.id}: podobvod ${p.drill}`);
    if (p.root) assert.ok(PROJECTS.some((pr) => pr.id === p.root), `${p.id}: projekt ${p.root}`);
    for (const pr of projectsOf(p)) assert.ok(PROJECTS.some((x) => x.id === pr), `${p.id}: projekt ${pr}`);
  }
});

test('every BOM item of every project has its own part page', () => {
  const boms = new Set(PARTS.map((p) => p.bom).filter(Boolean));
  for (const pr of PROJECTS) for (const it of pr.bom) assert.ok(boms.has(it.id), `${pr.id}: ${it.id} nemá stránku`);
});

test('research: every item has a source URL and fact level, supply tree points forward', () => {
  for (const [id, r] of Object.entries(RESEARCH)) {
    assert.ok(partById(id), `rešerše k neznámému dílu ${id}`);
    for (const s of ['supply', 'companies', 'timeline', 'bottlenecks', 'history']) {
      for (const x of r[s]) {
        assert.match(x.src, /^https?:\/\//, `${id}.${s}: zdroj`);
        assert.doesNotMatch(x.src, /google\.[a-z.]+\/search|bing\.com\/search/, `${id}.${s}: URL vyhledávače`);
        assert.ok(['doc', 'estimate'].includes(x.fact), `${id}.${s}: fact`);
      }
    }
    const nodes = new Map(r.supply.map((n) => [n.id, n]));
    assert.equal(nodes.size, r.supply.length, `${id}: duplicitní uzel`);
    for (const n of r.supply) {
      assert.ok(n.stage >= 0 && n.stage < STAGES.length, `${id}.${n.id}: fáze`);
      for (const t of n.to ?? []) assert.ok(nodes.get(t)?.stage > n.stage, `${id}.${n.id} → ${t}`);
      if (n.place) assert.ok(Math.abs(n.place.lat) <= 90 && Math.abs(n.place.lon) <= 180 && /^[A-Z]{2}$/.test(n.place.country), `${id}.${n.id}: místo`);
    }
    if (r.market) for (const s of r.market.shares) assert.ok(s.pct >= 0 && s.pct <= 100, `${id}: podíl`);
  }
});

test('web sections: every page maps to a section, related links exist', async () => {
  const { SECTIONS, sectionById, sectionOf } = await import('../src/web/sections.js');
  for (const s of SECTIONS) for (const r of s.related) assert.ok(sectionById(r), `${s.id} → ${r}`);
  assert.equal(sectionOf(['d', 'i7_9700', 'anatomy3d']).id, 'anatomy3d');
  assert.equal(sectionOf(['d', 'i7_9700', 'schema']).id, 'lab');
  assert.equal(sectionOf(['d', 'i7_9700']).id, 'catalog');
  assert.equal(sectionOf(['p', 'mypc']).id, 'projects');
  assert.equal(sectionOf([]).id, 'catalog');
  assert.equal(sectionOf(['map']).id, 'map');
});
test('catalog tree: every block and library item has a page, tree reaches every block', async () => {
  const { treeRoots, ALL_BLOCKS, LIBRARY, anyById } = await import('../src/web/catalogTree.js');
  const ids = new Set();
  for (const p of [...PARTS, ...ALL_BLOCKS, ...LIBRARY]) {
    assert.ok(!ids.has(p.id), `duplicitní id ${p.id}`); ids.add(p.id);
    assert.equal(anyById(p.id)?.id, p.id);
    for (const [lv, note] of [p.model, p.schema]) assert.ok(FIDELITY[lv] && note, `${p.id}: přesnost`);
  }
  const seen = new Set();
  // bez deduplikace: tranzistor podle procesu (NMOS_intel14 …) vznikne jen pod čipem s tím procesem (~300 tis. uzlů, < 1 s)
  const walk = (n, d) => { if (n.part?.block) seen.add(n.part.block); if (d < 16) for (const c of n.children()) walk(c, d + 1); };
  for (const r of treeRoots()) walk(r, 0);
  for (const b of ALL_BLOCKS) assert.ok(seen.has(b.block), `blok ${b.block} není ve stromu`);
});
test('fab: processes reference existing machines and materials, every machine has a 3D model and a page', async () => {
  const { MACHINES, MATERIALS, PROCESSES, ROUTES, processesOf, fabById } = await import('../src/web/fab/index.js');
  const { MACHINE_MODELS, buildMachine } = await import('../src/web/fab/machineModels.js');
  const { anyById } = await import('../src/web/catalogTree.js');
  for (const [k, pr] of Object.entries(PROCESSES)) for (const s of pr.steps) {
    for (const id of s.machines ?? []) assert.ok(fabById(id)?.kind === 'Stroj', `${k}: stroj ${id}`);
    for (const id of s.materials ?? []) assert.ok(fabById(id)?.kind === 'Materiál a dodavatel', `${k}: materiál ${id}`);
    assert.match(s.src, /^https?:\/\//, `${k}: zdroj kroku`);
  }
  for (const m of MACHINES) { assert.ok(MACHINE_MODELS[m.id], `3D model ${m.id}`); assert.ok(buildMachine(m.id).length > 1); assert.equal(anyById(m.id)?.id, m.id); }
  for (const m of [...MACHINES, ...MATERIALS]) for (const c of m.makers ?? m.suppliers) for (const p of c.plants ?? []) assert.ok(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180, `${m.id}: ${p.name}`);
  assert.ok(ROUTES.length > 0);
  assert.deepEqual(processesOf(PARTS.find((p) => p.id === 'i7_9700')), ['wafer', 'intel14', 'pkg_flipchip']);
});