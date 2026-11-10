// Měděné cesty na kartě pro 2D pohled DPS: stejný bludišťový router (0°/45°/90°, kolem pouzder) jako 3D deska,
// takže 2D a 3D vedou spoje stejně. Výsledek se přepočítá jen při změně spojů nebo poloh součástek.
import { createRouter } from '../physics/pcbRouter.js';
import { NV1_CARD, nv1CardOutline } from '../../engine/boardLayout.js';
import { isOffBoard } from './geometry.js';

const cache = new WeakMap();
const DIR = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] };

function insidePolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Cesty všech spojů na kartě: Map(wire.id -> body cesty), nebo null u spoje, který router nenašel.
 * `pinOf(comp, pin, isOutput)` = poloha pinu ({x, y, side}) z geometrie plátna.
 */
/** Karta NV1: obrys s jazýčkem PCI, kontakty konektoru nejsou místo pro cesty. */
export function nv1Board() {
  const card = NV1_CARD;
  const outline = nv1CardOutline();
  const bottom = card.y + card.h - 1;
  return { id: 'nv1', x: card.x, y: card.y, w: card.w, h: card.h, inside: (x, y) => y < bottom && insidePolygon(outline, x, y), skip: (c) => c.type === 'PCI_EDGE' };
}

export function pcbRoutes(engine, layout, pinOf, board = nv1Board()) {
  const comps = [...engine.components.values()];
  const key = `${board.id}|${engine.wires.length}|${comps.map((c) => `${c.id}:${c.x},${c.y}`).join(';')}`;
  const hit = cache.get(engine);
  if (hit && hit.key === key && hit.wires === engine.wires) return hit.routes;

  const cell = 3.7; // mřížka 1 mm
  const router = createRouter({ x0: board.x, y0: board.y, w: board.w, h: board.h, cell, inside: board.inside, erode: 2 });
  for (const c of comps) {
    if (isOffBoard(c) || board.skip(c)) continue;
    const g = layout(c);
    router.block({ x: g.x, y: g.y, w: g.w, h: g.h }, 0.5);
  }

  const jobs = [];
  for (const wire of engine.wires) {
    const a = engine.components.get(wire.from.id);
    const b = engine.components.get(wire.to.id);
    if (!a || !b || isOffBoard(a) || isOffBoard(b)) continue;
    const pa = pinOf(a, wire.from.pin, true);
    const pb = pinOf(b, wire.to.pin, false);
    jobs.push({ wire, pa, pb, width: engine.wireWidth(wire), net: engine.netIndexOf(wire.from.id, wire.from.pin), len: Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) });
  }
  jobs.sort((p, q) => p.len - q.len); // krátké spoje první, dlouhé je obejdou

  const routes = new Map();
  const stub = 0.5 + cell * 1.2;
  for (const job of jobs) {
    const { pa, pb } = job;
    const da = DIR[pa.side] || [1, 0];
    const db = DIR[pb.side] || [-1, 0];
    const a = { x: pa.x + da[0] * stub, y: pa.y + da[1] * stub, dir: da };
    const b = { x: pb.x + db[0] * stub, y: pb.y + db[1] * stub, dir: db.map((v) => -v) };
    const path = router.route(a, b, job.net);
    if (!path) { routes.set(job.wire.id, null); continue; }
    const pts = [{ x: pa.x, y: pa.y }, ...path, { x: pb.x, y: pb.y }];
    router.commit(pts, job.net, (job.width > 1 ? 2 : 1) * cell * 0.5 + cell * 0.5);
    routes.set(job.wire.id, pts);
  }
  cache.set(engine, { key, wires: engine.wires, routes });
  return routes;
}
