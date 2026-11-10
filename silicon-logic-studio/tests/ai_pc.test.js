import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PC_POWER } from '../src/engine/presets/pcPower.js';
import { HIERARCHICAL_SUBCIRCUITS as H, findSubcircuit } from '../src/engine/hierarchicalSubcircuits.js';

// pasivní díly (měď, kondenzátory, trafo, cívky, panel, mechanika) jsou konec cesty
const PASSIVE = new Set(['emi', 'br', 'bulk', 'cap', 'pot', 'qpi', 'fan', 'term', 'pwr']);

function crawl() {
  const stacks = new Map();
  const missing = [];
  const visit = (circuit, stack) => {
    for (const comp of circuit.components) {
      const sub = findSubcircuit(comp, stack);
      if (!sub) {
        if (comp.type === 'PC_BLOCK' && !PASSIVE.has(comp.id)) missing.push(`${stack.at(-1).key}/${comp.id}`);
        continue;
      }
      const proc = [...stack].reverse().map((e) => H[e.key]?.process).find(Boolean) || '';
      if (stacks.has(`${sub.key}|${proc}`)) continue;
      const st = [...stack, { key: sub.key, level: sub.level }];
      stacks.set(`${sub.key}|${proc}`, st);
      visit(sub, st);
    }
  };
  visit(PC_POWER, [{ key: 'root', level: 1 }]);
  return { stacks, missing };
}

test('AI PC až dolů: každý funkční blok vede dál, pasivní díly končí', () => {
  const { missing } = crawl();
  assert.deepEqual(missing, []);
});

test('AI PC: z každého obvodu vede cesta až na kvarky', () => {
  const { stacks } = crawl();
  const toQuarks = (stack, seen = new Set()) => {
    const key = stack.at(-1).key;
    if (H[key].level === 11) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return H[key].components.some((cmp) => { const sub = findSubcircuit(cmp, stack); return sub && toQuarks([...stack, { key: sub.key, level: sub.level }], seen); });
  };
  assert.deepEqual([...stacks.entries()].filter(([, st]) => !toQuarks(st)).map(([k]) => k), []);
});

test('AI PC: tranzistory podle procesu – GP100 TSMC 16 nm, Xeon Intel 22 nm, GM107 TSMC 28 nm, DRAM, V-NAND', () => {
  const { stacks } = crawl();
  const keys = new Set([...stacks.values()].map((st) => st.at(-1).key));
  for (const k of ['NMOS_tsmc16', 'PMOS_tsmc16', 'NMOS_intel22', 'PMOS_intel22', 'NMOS_tsmc28', 'NMOS_dram', 'NMOS_vnand', 'NMOS_power']) assert.ok(keys.has(k), k);
});
