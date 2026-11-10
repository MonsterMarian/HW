// 3D PCB trace router: traces go around packages in 0/45/90 degree segments.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../src/views/physics/pcbRouter.js';

const angleOk = (a, b) => {
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  return dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6;
};

describe('pcb router', () => {
  it('routes around a keep-out block with only 0/45/90 degree inner segments', () => {
    const r = createRouter({ x0: 0, y0: 0, w: 300, h: 200, cell: 4 });
    const chip = { x: 120, y: 40, w: 60, h: 120 };
    r.block(chip, 2);
    const path = r.route({ x: 60, y: 100, dir: [1, 0] }, { x: 240, y: 100, dir: [-1, 0] });
    assert.ok(path && path.length >= 3);
    for (let k = 1; k < path.length - 2; k++) assert.ok(angleOk(path[k], path[k + 1]), `segment ${k} not 0/45/90°`);
    // no point of the polyline (sampled) lies inside the chip
    for (let k = 0; k < path.length - 1; k++) {
      for (let s = 0; s <= 20; s++) {
        const x = path[k].x + ((path[k + 1].x - path[k].x) * s) / 20, y = path[k].y + ((path[k + 1].y - path[k].y) * s) / 20;
        assert.ok(!(x > chip.x && x < chip.x + chip.w && y > chip.y && y < chip.y + chip.h), `(${x},${y}) inside chip`);
      }
    }
  });

  it('returns null when the target is walled off', () => {
    const r = createRouter({ x0: 0, y0: 0, w: 100, h: 100, cell: 5, inside: (x) => x < 50 || x > 60 });
    assert.equal(r.route({ x: 10, y: 50, dir: [1, 0] }, { x: 90, y: 50, dir: [-1, 0] }), null);
  });
});
