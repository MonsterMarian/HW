import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine } from '../src/engine/logicEngine.js';
import { PC_POWER } from '../src/engine/presets/pcPower.js';
import { HIERARCHICAL_SUBCIRCUITS as H } from '../src/engine/hierarchicalSubcircuits.js';

const boot = (circuit = PC_POWER) => { const e = new LogicEngine(); e.loadCircuit(circuit); return e; };
const press = (e, on = 1) => { e.components.get('pwr_btn').outputs.out = on; e.propagate(); };
const probe = (e, id) => e.components.get(id).inputs.in;

test('vypnuto: PS_ON# druhého zdroje drží pull-up v 1, karty bez napájení, ventilátory stojí', () => {
  const e = boot();
  assert.equal(e.pinValue('psu2', '16 PS_ON#'), 1);
  for (const id of ['st1', 'st2', 'rpm1', 'rpm2']) assert.equal(probe(e, id), 0, id);
});

test('zapnutí Dellu: Add2PSU stáhne PS_ON# na COM, obě P100 napájené, ventilátory podle knoflíku', () => {
  const e = boot();
  press(e);
  assert.equal(e.pinValue('psu2', '16 PS_ON#'), 0);
  assert.equal(e.pinValue('gpu1', 'EPS5-8 +12V'), 12);
  assert.equal(e.pinValue('gpu1', 'EPS1-4 GND'), 0);
  assert.equal(probe(e, 'st1'), 1);
  assert.equal(probe(e, 'st2'), 1);
  assert.equal(probe(e, 'rpm1'), Math.round(4500 * 0.7));
  e.components.get('hub').knob = 100;
  e.propagate();
  assert.equal(probe(e, 'rpm2'), 4500);
  press(e, 0);
  assert.equal(probe(e, 'st1'), 0);
});

test('PCIe kabel napřímo do EPS zdířky P100 = zkrat +12 V na zem karty (přes zem slotu)', () => {
  // kabel A druhého zdroje: piny 1–3 (+12 V) dosednou na EPS pozice 1–3 (GND), zem 4–8 na EPS 5–8 (+12 V)
  const bad = structuredClone(PC_POWER);
  bad.wires = bad.wires.filter((w) => !(w.to.id === 'gpu2' && w.to.pin.startsWith('EPS')));
  bad.wires.push(
    { from: { id: 'psu2', pin: 'A1-3 +12V' }, to: { id: 'gpu2', pin: 'EPS1-4 GND' } },
    { from: { id: 'psu2', pin: 'A4-8 GND' }, to: { id: 'gpu2', pin: 'EPS5-8 +12V' } },
  );
  const e = boot(bad);
  press(e);
  assert.equal(e.pinValue('gpu2', 'EPS1-4 GND'), 'X');
  assert.equal(probe(e, 'st2'), 'X');
  // zem desky je společná pro oba sloty: zkrat stáhne celou zem systému (skutečný zdroj vypne nadproudová ochrana)
  assert.equal(probe(e, 'st1'), 'X');
});

test('ventilátory z desky Dellu nejdou: bez regulátoru (bez +12 V) stojí', () => {
  const noHub = structuredClone(PC_POWER);
  noHub.wires = noHub.wires.filter((w) => w.from.id !== 'hub');
  const e = boot(noHub);
  press(e);
  assert.equal(probe(e, 'rpm1'), 0);
});

test('L2 Add2PSU: 12 V na cívce relé → kontakt spojí PS_ON# s COM', () => {
  const e = boot(H.add2psu_inside);
  assert.equal(probe(e, 'pr'), 1, 'otevřený kontakt: pull-up zdroje 2');
  e.components.get('v12').outputs.out = 1;
  e.propagate();
  assert.equal(probe(e, 'pr'), 0);
});

test('L2 redukce 030-0571-000 odpovídá výkresu NVIDIA pin po pinu', () => {
  const e = boot(H.eps_adapter_wiring);
  const same = (a, b) => e.netIndexOf(...a.split('.')) === e.netIndexOf(...b.split('.'));
  const map = {
    '1 GND': ['p2.5 GND', 'p2.6 SENSE0'], '2 GND': ['p2.7 GND', 'p2.8 GND', 'p2.4 SENSE1'],
    '3 GND': ['p3.5 GND', 'p3.6 SENSE0'], '4 GND': ['p3.7 GND', 'p3.8 GND', 'p3.4 SENSE1'],
    '5 +12V': ['p2.1 +12V', 'p2.2 +12V'], '6 +12V': ['p2.3 +12V'], '7 +12V': ['p3.1 +12V', 'p3.2 +12V'], '8 +12V': ['p3.3 +12V'],
  };
  for (const [eps, srcs] of Object.entries(map)) for (const s of srcs) assert.ok(same(`p1.${eps}`, s), `${s} → EPS ${eps}`);
  assert.ok(!same('p1.5 +12V', 'p1.1 GND'), '+12 V a zem jsou oddělené');
});

test('jako ve videu: G1 z Dellu (2× 6 pin), G2 jen z druhého zdroje – bez Add2PSU jede jen G1', () => {
  const noSync = structuredClone(PC_POWER);
  noSync.wires = noSync.wires.filter((w) => w.from.id !== 'add2psu' && w.to.id !== 'add2psu');
  const e = boot(noSync);
  press(e);
  assert.equal(probe(e, 'st1'), 1, 'G1 napájí zdroj Dellu');
  assert.equal(probe(e, 'st2'), 0, 'druhý zdroj se bez Add2PSU nezapne');
  assert.equal(probe(e, 'rpm1'), 0, 'ventilátory visí na druhém zdroji');
});
