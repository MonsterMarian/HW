// Mapa světa (rovnoběžková projekce) s doly, továrnami, obchody… Hranice zemí: Natural Earth 110m (world-atlas).
// Kolečko = přiblížení k kurzoru, tažení = posun, dvojklik = zpět na celý svět.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { STAGES } from './research/index.js';

const W = 1000, H = 500;
const px = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
const STAGE_COLORS = ['#b07a4a', '#c9a24a', '#8fb05a', '#4fa3c7', '#9a7fd1', '#e0a640'];
// vrstvy výroby a nákupu (legend="fab"): index = pt.stage
const FAB_LAYERS = ['Výrobce stroje', 'Dodavatel materiálu', 'Továrna (proces)', 'Distributor součástek', 'Prodejce stroje', 'Služba (DPS, osazení)', 'Výroba dílu'];
const FAB_COLORS = ['#4fa3c7', '#8fb05a', '#9a7fd1', '#e0a640', '#e06a5a', '#d17fb8', '#c9a24a'];

// Kruh (ring) na SVG cestu; úsek přes datovou hranici 180° se přeruší, aby nevznikl pruh přes celou mapu.
const ringPath = (ring) => ring.map(([lon, lat], i) => `${i && Math.abs(lon - ring[i - 1][0]) < 180 ? 'L' : 'M'}${px(lon, lat).map((v) => v.toFixed(1)).join(',')}`).join('') + 'Z';
const FULL = { x: 0, y: 0, w: W };

export default function WorldMap({ points, onPick, legend }) {
  const [labels, colors] = legend === 'fab' ? [FAB_LAYERS, FAB_COLORS] : [STAGES, STAGE_COLORS];
  const land = useMemo(() => feature(world, world.objects.countries).features.map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polys.flatMap((p) => p.map(ringPath)).join('');
  }), []);
  const [hover, setHover] = useState(null);
  const [off, setOff] = useState(() => new Set());
  const [vb, setVb] = useState(FULL);
  const svg = useRef(null), drag = useRef(null);
  const k = W / vb.w; // přiblížení: body a čáry držet stejně velké na obrazovce
  const toMap = (e) => { const r = svg.current.getBoundingClientRect(); return [vb.x + ((e.clientX - r.left) / r.width) * vb.w, vb.y + ((e.clientY - r.top) / r.height) * vb.w / 2]; };
  const clamp = (v) => ({ w: v.w, x: Math.min(Math.max(v.x, 0), W - v.w), y: Math.min(Math.max(v.y, 0), H - v.w / 2) });
  // kolečko jako neplynulý (non-passive) posluchač, aby se nerolovala stránka
  useEffect(() => {
    const el = svg.current;
    const onWheel = (e) => {
      e.preventDefault();
      const [mx, my] = toMap(e);
      const w = Math.min(W, Math.max(W / 24, vb.w * (e.deltaY > 0 ? 1.25 : 0.8)));
      setVb(clamp({ w, x: mx - ((mx - vb.x) * w) / vb.w, y: my - ((my - vb.y) * w) / vb.w }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
  const shown = points.map((pt, i) => [pt, i]).filter(([pt]) => !off.has(pt.stage));
  const used = [...new Set(points.map((p) => p.stage))].sort((a, b) => a - b);
  return (
    <div className="relative">
      <svg ref={svg} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.w / 2}`} className="w-full h-auto bg-(--bg-card) border border-(--line) select-none touch-none"
        style={{ cursor: 'grab' }}
        onDoubleClick={() => setVb(FULL)}
        onPointerDown={(e) => { drag.current = { sx: e.clientX, sy: e.clientY, vb }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; const s = d.vb.w / svg.current.getBoundingClientRect().width; setVb(clamp({ ...d.vb, x: d.vb.x - (e.clientX - d.sx) * s, y: d.vb.y - (e.clientY - d.sy) * s })); }}
        onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
        {land.map((d, i) => <path key={i} d={d} fill="oklch(18% 0.01 255)" stroke="oklch(30% 0.01 255)" strokeWidth={0.5 / k} />)}
        {shown.map(([pt, i]) => {
          const [x, y] = px(pt.lon, pt.lat);
          return <circle key={i} cx={x} cy={y} r={(hover === i ? 7 : 4.5) / Math.sqrt(k)} fill={colors[pt.stage] ?? '#ccc'} fillOpacity="0.85" stroke="#000" strokeWidth={0.8 / k}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick?.(pt)} style={{ cursor: 'pointer' }} />;
        })}
      </svg>
      {hover != null && points[hover] && (
        <div className="absolute top-2 left-2 max-w-sm p-2 bg-(--bg-dark) border border-(--accent-amber) text-xs pointer-events-none">
          <div className="meta">{labels[points[hover].stage]}</div>
          <div className="font-semibold">{points[hover].name}</div>
          <div className="text-(--text-muted)">{points[hover].place} ({points[hover].country})</div>
          {points[hover].part && <div className="text-(--accent-amber)">{points[hover].part}</div>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
        {used.map((s) => (
          <button key={s} type="button" aria-pressed={!off.has(s)} className={`flex items-center gap-1 ${off.has(s) ? 'opacity-40 line-through' : ''}`}
            onClick={() => setOff((o) => { const n = new Set(o); if (!n.delete(s)) n.add(s); return n; })}>
            <span style={{ background: colors[s] }} className="inline-block w-2.5 h-2.5" />{labels[s]} ({points.filter((p) => p.stage === s).length})
          </button>
        ))}
        <span className="ml-auto text-(--text-muted)">kolečko přiblíží · tažení posune · dvojklik celý svět · klik na vrstvu ji skryje</span>
      </div>
    </div>
  );
}
