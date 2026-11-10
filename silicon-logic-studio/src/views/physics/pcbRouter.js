// Grid maze router for the 3D PCB: copper traces run in 0°/45°/90° segments around the package
// footprints, like a real routed board. Works in 2D world px (same space as boardLayout.js).
// Pure JS (no three.js) so it can be unit-tested.

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const TURN_COST = [0, 0.7, 4, Infinity, Infinity]; // straight, 45°, 90°, sharper = not allowed
const FOREIGN_COST = 2.5; // stepping on copper of another net: crossing is allowed (vias on the real board), running along it is not cheap
const SHARED_COST = -0.4; // same net: following existing copper is a bit cheaper (bus branches merge)

class Heap {
  constructor() { this.f = []; this.s = []; }
  get size() { return this.f.length; }
  push(f, s) {
    const F = this.f, S = this.s;
    let i = F.length;
    F.push(f); S.push(s);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (F[p] <= f) break;
      F[i] = F[p]; S[i] = S[p]; i = p;
    }
    F[i] = f; S[i] = s;
  }
  pop() {
    const F = this.f, S = this.s;
    const top = S[0];
    const lf = F.pop(), ls = S.pop();
    if (F.length) {
      let i = 0;
      const n = F.length;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && F[c + 1] < F[c]) c++;
        if (F[c] >= lf) break;
        F[i] = F[c]; S[i] = S[c]; i = c;
      }
      F[i] = lf; S[i] = ls;
    }
    return top;
  }
}

/**
 * @param {{x0:number,y0:number,w:number,h:number,cell?:number,inside?:(x:number,y:number)=>boolean,erode?:number}} area
 * erode = keep this many cells free of copper along the edge of the `inside` area
 */
export function createRouter({ x0, y0, w, h, cell = 3, inside = () => true, erode = 0 }) {
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const N = gw * gh;
  const blocked = new Uint8Array(N);
  const owner = new Int32Array(N); // net id + 1 of the copper on this cell, 0 = free
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    if (!inside(x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell)) blocked[j * gw + i] = 1;
  }
  for (let pass = 0; pass < erode; pass++) {
    const prev = blocked.slice();
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      if (i === 0 || j === 0 || i === gw - 1 || j === gh - 1 || prev[j * gw + i - 1] || prev[j * gw + i + 1] || prev[(j - 1) * gw + i] || prev[(j + 1) * gw + i]) blocked[j * gw + i] = 1;
    }
  }
  const g = new Float32Array(N * 8);
  const came = new Int32Array(N * 8);
  const stamp = new Int32Array(N * 8);
  const closed = new Int32Array(N * 8);
  let gen = 0;

  const ci = (x) => Math.max(0, Math.min(gw - 1, Math.floor((x - x0) / cell)));
  const cj = (y) => Math.max(0, Math.min(gh - 1, Math.floor((y - y0) / cell)));
  const centre = (idx) => ({ x: x0 + ((idx % gw) + 0.5) * cell, y: y0 + (Math.floor(idx / gw) + 0.5) * cell });
  const dirIndex = (d) => {
    const k = DIRS.findIndex(([dx, dy]) => dx === Math.sign(d[0]) && dy === Math.sign(d[1]));
    return k < 0 ? 0 : k;
  };

  /** Mark a rectangle {x,y,w,h} (px) as a keep-out area. */
  function block(r, margin = 0) {
    for (let j = cj(r.y - margin); j <= cj(r.y + r.h + margin); j++) for (let i = ci(r.x - margin); i <= ci(r.x + r.w + margin); i++) blocked[j * gw + i] = 1;
  }

  const isBlocked = (x, y) => blocked[cj(y) * gw + ci(x)] === 1;

  /** Route from a to b (points {x,y,dir:[dx,dy]} just outside the packages). Returns px polyline or null. */
  function route(a, b, net = 0) {
    gen++;
    const s = cj(a.y) * gw + ci(a.x);
    const t = cj(b.y) * gw + ci(b.x);
    const tx = t % gw, ty = Math.floor(t / gw);
    const keepS = blocked[s], keepT = blocked[t];
    blocked[s] = 0; blocked[t] = 0;
    const heap = new Heap();
    const d0 = dirIndex(a.dir || [1, 0]);
    // weighted A* (×2.2): a bit longer paths than optimal, but an order of magnitude fewer expansions
    const h = (idx) => {
      const dx = Math.abs((idx % gw) - tx), dy = Math.abs(Math.floor(idx / gw) - ty);
      return 2.2 * (Math.max(dx, dy) + 0.4142 * Math.min(dx, dy));
    };
    const st0 = s * 8 + d0;
    g[st0] = 0; stamp[st0] = gen; came[st0] = -1;
    heap.push(h(s), st0);
    let found = -1, expanded = 0;
    while (heap.size && expanded < 60000) {
      const st = heap.pop();
      if (closed[st] === gen) continue; // stale heap entry
      closed[st] = gen;
      const idx = st >> 3, d = st & 7;
      if (idx === t) { found = st; break; }
      expanded++;
      const gc = g[st];
      const x = idx % gw, y = (idx - x) / gw;
      for (let nd = 0; nd < 8; nd++) {
        const diff = Math.abs(nd - d), turn = TURN_COST[Math.min(diff, 8 - diff)];
        if (turn === Infinity) continue;
        const [dx, dy] = DIRS[nd];
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const n = ny * gw + nx;
        if (blocked[n]) continue;
        if (dx && dy && (blocked[y * gw + nx] || blocked[ny * gw + x])) continue; // no corner cutting
        const o = owner[n];
        const step = (dx && dy ? 1.4142 : 1) * (1 + (o === 0 ? 0 : o === net + 1 ? SHARED_COST : FOREIGN_COST)) + turn;
        const ns = n * 8 + nd;
        if (closed[ns] === gen) continue;
        const ng = gc + step;
        if (stamp[ns] === gen && g[ns] <= ng) continue;
        stamp[ns] = gen; g[ns] = ng; came[ns] = st;
        heap.push(ng + h(n), ns);
      }
    }
    blocked[s] = keepS; blocked[t] = keepT;
    if (found < 0) return null;
    // walk back, keep only the corners
    const cells = [];
    for (let st = found; st !== -1; st = came[st]) cells.push(st >> 3);
    cells.reverse();
    const pts = [{ x: a.x, y: a.y }];
    for (let k = 1; k < cells.length - 1; k++) {
      const p = cells[k - 1], c = cells[k], q = cells[k + 1];
      if (c - p !== q - c) pts.push(centre(c));
    }
    pts.push({ x: b.x, y: b.y });
    return pts;
  }

  /** Reserve the copper of a routed trace (half width in px) for net `net`. */
  function commit(points, net = 0, halfWidth = cell / 2) {
    const r = Math.max(0, Math.ceil(halfWidth / cell));
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cell * 0.5)));
      for (let s = 0; s <= steps; s++) {
        const x = ci(a.x + ((b.x - a.x) * s) / steps), y = cj(a.y + ((b.y - a.y) * s) / steps);
        for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) {
          if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
          const n = j * gw + i;
          if (owner[n] === 0) owner[n] = net + 1;
        }
      }
    }
  }

  return { block, route, commit, isBlocked, cell };
}
