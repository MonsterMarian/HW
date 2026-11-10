import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS } from '../src/engine/projects.js';
import { anatomyFigure } from '../src/views/anatomy/figures.js';

const [nv1, pc] = PROJECTS;

test('ANATOMY: oba projekty mají výkres bez NaN, i rozložený', () => {
  for (const p of PROJECTS) {
    assert.ok(p.views.includes('anatomy'), p.id);
    for (const explode of [0, 0.5, 1]) {
      const { svg } = anatomyFigure(p, { explode });
      assert.match(svg, /^<svg[^>]+viewBox="0 0 1000 680"/);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
    }
  }
});

test('ANATOMY: každý díl PC má očíslovaný popisek podle kusovníku', () => {
  const { items, offFigure } = anatomyFigure(pc);
  assert.deepEqual(items.map((i) => i.n), pc.bom.map((_, i) => i + 1));
  assert.deepEqual(offFigure, []);
});

test('ANATOMY: karta NV1 – mimo výkres jen periferie, čipy z PCB', () => {
  const { items, offFigure, svg } = anatomyFigure(nv1);
  assert.deepEqual(offFigure, ['crt', 'speakers', 'pad']);
  assert.equal(items.length, nv1.bom.length - 3);
  assert.ok(svg.includes('data-part="pcb"'));
});

test('ANATOMY: kolize P100 s krytem nad limit 312 mm se ukáže jen ve složeném stavu', () => {
  assert.match(anatomyFigure(pc, { explode: 0 }).svg, /312 mm \(plná délka PCIe\)/);
  assert.doesNotMatch(anatomyFigure(pc, { explode: 1 }).svg, /plná délka PCIe/);
});

test('ANATOMY: zvýrazněný díl je jantarový (lit)', () => {
  const { svg } = anatomyFigure(pc, { focus: 'pwm_ctrl' });
  assert.match(svg, /data-part="pwm_ctrl" class="an-focus"/);
});
