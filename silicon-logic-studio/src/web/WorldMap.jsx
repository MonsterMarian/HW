// Mapa světa (rovnoběžková projekce) s doly, rafineriemi a továrnami z rešerše. Hranice zemí: Natural Earth 110m (world-atlas).
import React, { useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { STAGES } from './research/index.js';

const W = 1000, H = 500;
const px = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
const STAGE_COLORS = ['#b07a4a', '#c9a24a', '#8fb05a', '#4fa3c7', '#9a7fd1', '#e0a640'];

// Kruh (ring) na SVG cestu; úsek přes datovou hranici 180° se přeruší, aby nevznikl pruh přes celou mapu.
const ringPath = (ring) => ring.map(([lon, lat], i) => `${i && Math.abs(lon - ring[i - 1][0]) < 180 ? 'L' : 'M'}${px(lon, lat).map((v) => v.toFixed(1)).join(',')}`).join('') + 'Z';

export default function WorldMap({ points, onPick }) {
  const land = useMemo(() => feature(world, world.objects.countries).features.map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polys.flatMap((p) => p.map(ringPath)).join('');
  }), []);
  const [hover, setHover] = useState(null);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-(--bg-card) border border-(--line)">
        {land.map((d, i) => <path key={i} d={d} fill="oklch(18% 0.01 255)" stroke="oklch(30% 0.01 255)" strokeWidth="0.5" />)}
        {points.map((pt, i) => {
          const [x, y] = px(pt.lon, pt.lat);
          return <circle key={i} cx={x} cy={y} r={hover === i ? 7 : 4.5} fill={STAGE_COLORS[pt.stage] ?? '#ccc'} fillOpacity="0.85" stroke="#000" strokeWidth="0.8"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick?.(pt)} style={{ cursor: 'pointer' }} />;
        })}
      </svg>
      {hover != null && (
        <div className="absolute top-2 left-2 max-w-sm p-2 bg-(--bg-dark) border border-(--accent-amber) text-xs pointer-events-none">
          <div className="meta">{STAGES[points[hover].stage]}</div>
          <div className="font-semibold">{points[hover].name}</div>
          <div className="text-(--text-muted)">{points[hover].place} ({points[hover].country})</div>
          {points[hover].part && <div className="text-(--accent-amber)">{points[hover].part}</div>}
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
        {STAGES.map((s, i) => <span key={s} className="flex items-center gap-1"><span style={{ background: STAGE_COLORS[i] }} className="inline-block w-2.5 h-2.5" />{s}</span>)}
      </div>
    </div>
  );
}
