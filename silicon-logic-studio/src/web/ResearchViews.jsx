// Stránky z rešerše: strom dodávek, mapa, firmy, časová osa, úzká hrdla, historie, trh – pro jeden díl i souhrnně.
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { partById } from './parts.js';
import { RESEARCH, STAGES, researchOf } from './research/index.js';

const WorldMap = lazy(() => import('./WorldMap.jsx'));

export const Fact = ({ fact }) => (
  <span className="web-tag" style={{ color: fact === 'doc' ? '#5fbf7f' : '#e0a640' }} title={fact === 'doc' ? 'Zdroj mluví přímo o tomhle dílu' : 'Obecný údaj pro tento typ dílu, pro díl samotný nedoložený'}>
    {fact === 'doc' ? 'DOLOŽENO' : 'OBECNĚ'}
  </span>
);
const Src = ({ src }) => (
  <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-(--accent-amber) hover:underline" title={src}>
    <ExternalLink size={10} /> zdroj
  </a>
);
const PartLink = ({ id }) => <a href={`#/d/${id}`} className="text-[11px] text-(--accent-amber) hover:underline">{partById(id)?.name ?? id}</a>;
const Empty = () => <p className="text-(--text-muted) text-sm">K tomuhle dílu zatím rešerše nic nenašla (nebo ještě neproběhla). Nic se nedoplňuje odhadem.</p>;

// Všechny položky jedné sekce přes všechny díly, s odkazem na díl.
const all = (section) => Object.entries(RESEARCH).flatMap(([part, r]) => (r[section] ?? []).map((x) => ({ ...x, part })));

// ── Strom dodávek ──────────────────────────────────────────────────────────────────────────────────────
const COL_W = 190, NODE_H = 46, GAP = 10;
export function SupplyTree({ part }) {
  const nodes = useMemo(() => researchOf(part.id)?.supply ?? [], [part.id]);
  const [hover, setHover] = useState(null);
  const [pick, setPick] = useState(null);
  const layout = useMemo(() => {
    const pos = new Map();
    const cols = STAGES.map((_, s) => nodes.filter((n) => n.stage === s));
    cols.forEach((col, s) => col.forEach((n, i) => pos.set(n.id, { x: s * COL_W, y: i * (NODE_H + GAP) })));
    const h = Math.max(1, ...cols.map((c) => c.length)) * (NODE_H + GAP);
    pos.set('self', { x: STAGES.length * COL_W, y: h / 2 - NODE_H / 2 });
    const edges = nodes.flatMap((n) => (n.stage === 5 || !n.to?.length ? (n.stage === 5 ? ['self'] : []) : n.to).map((t) => [n.id, t]));
    return { pos, h, edges };
  }, [nodes]);
  if (!nodes.length) return <Empty />;
  // zvýrazněná cesta: všechno, co do uzlu vede, a všechno, kam z něj vede
  const lit = new Set();
  if (hover) {
    const walk = (id, dir) => { if (lit.has(id + dir)) return; lit.add(id + dir); lit.add(id); for (const [a, b] of layout.edges) if (dir > 0 ? a === id : b === id) walk(dir > 0 ? b : a, dir); };
    walk(hover, 1); walk(hover, -1);
  }
  const W = (STAGES.length + 1) * COL_W;
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="flex text-[10px] meta mb-1" style={{ width: W }}>
          {[...STAGES, 'Díl'].map((s) => <div key={s} style={{ width: COL_W }}>{s}</div>)}
        </div>
        <div className="relative" style={{ width: W, height: layout.h }}>
          <svg className="absolute inset-0" width={W} height={layout.h}>
            {layout.edges.map(([a, b]) => {
              const p = layout.pos.get(a), q = layout.pos.get(b);
              if (!p || !q) return null;
              const x1 = p.x + COL_W - 22, y1 = p.y + NODE_H / 2, x2 = q.x, y2 = q.y + NODE_H / 2;
              const on = hover && lit.has(a) && lit.has(b);
              return <path key={a + b} d={`M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`} fill="none" stroke={on ? 'var(--accent-amber)' : 'var(--line)'} strokeWidth={on ? 2 : 1.2} />;
            })}
          </svg>
          {nodes.map((n) => {
            const p = layout.pos.get(n.id);
            return (
              <button key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => setPick(n)}
                className="absolute text-left px-2 py-1 border bg-(--bg-card) text-[11px] leading-tight overflow-hidden"
                style={{ left: p.x, top: p.y, width: COL_W - 22, height: NODE_H, borderColor: hover && lit.has(n.id) ? 'var(--accent-amber)' : 'var(--line)', opacity: hover && !lit.has(n.id) ? 0.35 : 1 }}>
                <div className="font-semibold truncate">{n.name}</div>
                <div className="text-(--text-muted) truncate">{n.place ? `${n.place.name}, ${n.place.country}` : n.fact === 'doc' ? 'doloženo' : 'obecně'}</div>
              </button>
            );
          })}
          <div className="absolute px-2 py-1 border border-(--accent-amber) bg-(--bg-card-light) text-[11px] font-semibold"
            style={{ left: layout.pos.get('self').x, top: layout.pos.get('self').y, width: COL_W - 22, height: NODE_H }}>{part.name}</div>
        </div>
      </div>
      {pick && (
        <div className="mt-3 p-3 border border-(--line) bg-(--bg-card) text-sm">
          <div className="meta">{STAGES[pick.stage]}</div>
          <div className="font-semibold">{pick.name} <Fact fact={pick.fact} /></div>
          {pick.place && <div className="text-(--text-muted)">{pick.place.name}, {pick.place.country} ({pick.place.lat.toFixed(2)}, {pick.place.lon.toFixed(2)})</div>}
          <Src src={pick.src} />
        </div>
      )}
      <p className="mt-2 text-[11px] text-(--text-muted)">Najeď na uzel: zvýrazní cestu. Klik: detail a zdroj.</p>
    </div>
  );
}

// ── Mapa ───────────────────────────────────────────────────────────────────────────────────────────────
const pointsOf = (ids) => ids.flatMap((id) => (researchOf(id)?.supply ?? []).filter((n) => n.place).map((n) => ({
  stage: n.stage, name: n.name, place: n.place.name, country: n.place.country, lat: n.place.lat, lon: n.place.lon, part: partById(id)?.name, partId: id, src: n.src, fact: n.fact,
})));
export function MapView({ ids }) {
  const pts = pointsOf(ids);
  const [pick, setPick] = useState(null);
  if (!pts.length) return <Empty />;
  return (
    <div>
      <Suspense fallback={<div className="meta">NAČÍTÁM MAPU…</div>}><WorldMap points={pts} onPick={setPick} /></Suspense>
      {pick && <div className="mt-2 p-2 border border-(--line) text-sm"><b>{pick.name}</b> · {pick.place} ({pick.country}) · {STAGES[pick.stage]} <Fact fact={pick.fact} /> <PartLink id={pick.partId} /> <Src src={pick.src} /></div>}
      <table className="web-table mt-3">
        <thead><tr><th>Místo</th><th>Země</th><th>Fáze</th><th>Co</th>{ids.length > 1 && <th>Díl</th>}<th /></tr></thead>
        <tbody>{pts.map((p, i) => <tr key={i}><td>{p.place}</td><td>{p.country}</td><td>{STAGES[p.stage]}</td><td>{p.name} <Fact fact={p.fact} /></td>{ids.length > 1 && <td><PartLink id={p.partId} /></td>}<td><Src src={p.src} /></td></tr>)}</tbody>
      </table>
    </div>
  );
}

// ── Seznamy ────────────────────────────────────────────────────────────────────────────────────────────
export function Companies({ part }) {
  const list = part ? (researchOf(part.id)?.companies ?? []).map((c) => ({ ...c, parts: [part.id] })) : (() => {
    const by = new Map();
    for (const c of all('companies')) {
      const k = c.name.toLowerCase();
      const e = by.get(k) ?? { ...c, roles: new Set(), parts: [] };
      e.roles.add(c.role); if (!e.parts.includes(c.part)) e.parts.push(c.part); if (c.fact === 'doc') e.fact = 'doc';
      by.set(k, e);
    }
    return [...by.values()].map((e) => ({ ...e, role: [...e.roles].join(' · ') })).sort((a, b) => b.parts.length - a.parts.length || a.name.localeCompare(b.name));
  })();
  const [q, setQ] = useState('');
  if (!list.length) return <Empty />;
  const shown = list.filter((c) => !q || `${c.name} ${c.role} ${c.country}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      {!part && <input className="web-input mb-2" placeholder="Hledat firmu, obor, zemi…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <table className="web-table">
        <thead><tr><th>Firma</th><th>Role</th><th>Země</th>{!part && <th>Díly</th>}<th /></tr></thead>
        <tbody>{shown.map((c) => (
          <tr key={c.name + c.role}><td className="font-semibold">{c.name} <Fact fact={c.fact} /></td><td>{c.role}</td><td>{c.country}</td>
            {!part && <td>{c.parts.map((id) => <div key={id}><PartLink id={id} /></div>)}</td>}<td><Src src={c.src} /></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Timeline({ part }) {
  const list = (part ? (researchOf(part.id)?.timeline ?? []).map((t) => ({ ...t, part: part.id })) : all('timeline')).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!list.length) return <Empty />;
  return (
    <ol className="border-l border-(--line) ml-2">
      {list.map((t, i) => (
        <li key={i} className="pl-4 pb-3 relative">
          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-(--accent-amber)" />
          <div className="meta">{t.date}</div>
          <div className="text-sm">{t.text} <Fact fact={t.fact} /> <Src src={t.src} /></div>
          {!part && <PartLink id={t.part} />}
        </li>
      ))}
    </ol>
  );
}

export function Notes({ part, section }) {
  const list = part ? (researchOf(part.id)?.[section] ?? []).map((x) => ({ ...x, part: part.id })) : all(section);
  if (!list.length) return <Empty />;
  if (section === 'history') list.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  return (
    <div className="flex flex-col gap-2">
      {list.map((b, i) => (
        <details key={i} className="border border-(--line) bg-(--bg-card) p-3" open={!!part}>
          <summary className="cursor-pointer font-semibold text-sm">{b.year ? `${b.year} · ` : ''}{b.title} <Fact fact={b.fact} /></summary>
          <p className="text-sm mt-1 text-(--text-light)">{b.text}</p>
          <div className="flex gap-3 mt-1"><Src src={b.src} />{!part && <PartLink id={b.part} />}</div>
        </details>
      ))}
    </div>
  );
}

export function Market({ part }) {
  const list = part ? [researchOf(part.id)?.market].filter(Boolean).map((m) => ({ ...m, parts: [part.id] })) : (() => {
    const by = new Map();
    for (const [id, r] of Object.entries(RESEARCH)) {
      if (!r.market) continue;
      const k = `${r.market.category}|${r.market.year}`;
      const e = by.get(k) ?? { ...r.market, parts: [] };
      e.parts.push(id); by.set(k, e);
    }
    return [...by.values()];
  })();
  if (!list.length) return <p className="text-(--text-muted) text-sm">Podíl na trhu pro kategorii tohoto dílu se se zdrojem nepodařilo dohledat.</p>;
  return (
    <div className="flex flex-col gap-4">
      {list.map((m) => (
        <div key={m.category + m.year} className="border border-(--line) bg-(--bg-card) p-3">
          <div className="font-semibold text-sm">{m.category} · {m.year} <Fact fact={m.fact} /> <Src src={m.src} /></div>
          <div className="mt-2 flex flex-col gap-1">
            {[...m.shares].sort((a, b) => b.pct - a.pct).map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="w-36 truncate">{s.name}</span>
                <span className="h-3 bg-(--accent-amber)" style={{ width: `${Math.max(1, s.pct) * 3}px` }} />
                <span className="font-mono">{s.pct} %</span>
              </div>
            ))}
          </div>
          {!part && <div className="mt-2 flex gap-3 flex-wrap">{m.parts.map((id) => <PartLink key={id} id={id} />)}</div>}
        </div>
      ))}
    </div>
  );
}

