// Stránky výroby: stroje, materiály a dodavatelé, výrobní postupy dílů a cesty k vlastnímu čipu.
import React, { lazy, Suspense } from 'react';
import { ExternalLink } from 'lucide-react';
import { MACHINES, MATERIALS, PROCESSES, ROUTES, fabById, processesOf, usageOf } from './fab/index.js';
import { Fact } from './ResearchViews.jsx';

const WorldMap = lazy(() => import('./WorldMap.jsx'));
const A = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-(--accent-amber) hover:underline text-xs"><ExternalLink size={10} />{children}</a>;
const Chip = ({ id }) => { const f = fabById(id); return f ? <a href={`#/d/${id}`} className="web-chip">{f.name}</a> : <span className="web-chip opacity-60">{id}</span>; };
const Sources = ({ list }) => (list?.length ? <div className="flex flex-col gap-0.5 mt-2"><b className="text-xs">Zdroje</b>{list.map((s) => <A key={s} href={s}>{s}</A>)}</div> : null);

// body na mapu: závody výrobců strojů (5), dodavatelů materiálů (2), továrny procesu (3)
const plantsOf = (list, stage, part) => list.flatMap((c) => (c.plants ?? []).filter((x) => x.lat != null).map((x) => ({ stage, name: c.name, place: x.name, country: x.country, lat: x.lat, lon: x.lon, part })));
const PlacesMap = ({ points }) => (points.length
  ? <Suspense fallback={<div className="meta">NAČÍTÁM MAPU…</div>}><WorldMap points={points} /></Suspense>
  : <p className="text-sm text-(--text-muted)">Místa výroby se nepodařilo doložit.</p>);

function Usage({ id }) {
  const u = usageOf(id);
  if (!u.length) return <p className="text-sm text-(--text-muted)">V žádném zmapovaném výrobním postupu.</p>;
  return <ul className="text-sm flex flex-col gap-1">{u.map(({ key, process, step }, i) => <li key={i}><a href={`#/fab/processes#${key}`} className="text-(--accent-amber) hover:underline">{process.name}</a> – {step.name}</li>)}</ul>;
}

export function FabOverview({ p }) {
  const companies = p.makers ?? p.suppliers ?? [];
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <section className="web-card">
        <h3 className="meta mb-2">{p.kind === 'Stroj' ? 'Co stroj dělá' : 'K čemu je'}</h3>
        <p className="text-sm">{p.what} <Fact fact={p.fact} /></p>
        {p.example && <p className="text-sm mt-2"><b>Příklad:</b> {p.example}</p>}
        {p.specs?.length > 0 && <table className="web-table mt-2"><tbody>{p.specs.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>}
        {p.price && <p className="text-sm mt-2"><b>Cena:</b> {p.price}</p>}
        {p.size && <p className="text-sm mt-1"><b>Rozměr:</b> {p.size.join(' × ')} m (přibližně)</p>}
        <Sources list={p.sources} />
      </section>
      <section className="web-card">
        <h3 className="meta mb-2">{p.kind === 'Stroj' ? 'Kdo ho vyrábí a kde' : 'Dodavatelé a kde vyrábějí'}</h3>
        <table className="web-table"><tbody>{companies.map((c) => (
          <tr key={c.name}><td className="font-semibold">{c.name}</td><td>{c.country}</td><td>{c.share ?? ''}</td><td className="text-xs text-(--text-muted)">{(c.plants ?? []).map((x) => x.name).join(' · ')}</td></tr>
        ))}</tbody></table>
        {p.buy?.length > 0 && (
          <>
            <h3 className="meta mt-4 mb-1">Kde koupit</h3>
            <ul className="text-sm flex flex-col gap-1.5">{p.buy.map((b) => <li key={b.url}><A href={b.url}>{b.label}</A> <span className="text-(--text-muted) text-xs">– {b.note}</span></li>)}</ul>
          </>
        )}
        <h3 className="meta mt-4 mb-1">Použití ve výrobě</h3>
        <Usage id={p.id} />
      </section>
      <section className="web-card md:col-span-2"><h3 className="meta mb-2">Mapa závodů</h3><div className="max-w-4xl"><PlacesMap points={plantsOf(companies, p.kind === 'Stroj' ? 5 : 2)} /></div></section>
    </div>
  );
}

function ProcessCard({ k, open = true }) {
  const pr = PROCESSES[k];
  return (
    <details id={k} className="web-card" open={open}>
      <summary className="cursor-pointer"><b>{pr.name}</b> <span className="text-xs text-(--text-muted)">{pr.year ?? ''}</span></summary>
      <p className="text-sm text-(--text-muted) mt-1">{pr.what}</p>
      {pr.fabs?.length > 0 && <p className="text-sm mt-2"><b>Továrny:</b> {pr.fabs.map((f, i) => <span key={i}>{i ? ' · ' : ''}{f.name} ({f.country}) <Fact fact={f.fact} /></span>)}</p>}
      <ol className="mt-3 flex flex-col gap-2">
        {pr.steps.map((s, i) => (
          <li key={i} className="border-l-2 border-(--line) pl-3">
            <div className="text-sm"><b>{i + 1}. {s.name}</b> <Fact fact={s.fact} /> <A href={s.src}>zdroj</A></div>
            <div className="text-xs text-(--text-muted)">{s.what}</div>
            <div className="flex flex-wrap gap-1 mt-1">{(s.machines ?? []).map((id) => <Chip key={id} id={id} />)}{(s.materials ?? []).map((id) => <Chip key={id} id={id} />)}</div>
          </li>
        ))}
      </ol>
    </details>
  );
}

// záložka Výroba na stránce dílu
export function PartFab({ p }) {
  const keys = processesOf(p);
  if (!keys.length) return <p className="text-sm text-(--text-muted)">Výrobní postup pro tenhle díl není zmapovaný.</p>;
  const fabs = keys.flatMap((k) => (PROCESSES[k].fabs ?? []).filter((f) => f.lat != null).map((f) => ({ stage: 3, name: PROCESSES[k].name, place: f.name, country: f.country, lat: f.lat, lon: f.lon })));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-(--text-muted) max-w-3xl">Kroky výroby od waferu po hotový díl. Klik na stroj otevře jeho 3D model a výrobce, klik na materiál jeho dodavatele a kde koupit. <a href="#/fab/routes" className="text-(--accent-amber) hover:underline">Jak si nechat vyrobit vlastní čip →</a></p>
      <div className="max-w-4xl"><PlacesMap points={fabs} /></div>
      {keys.map((k) => <ProcessCard key={k} k={k} />)}
    </div>
  );
}

const byCat = (list) => Object.entries(list.reduce((a, x) => ({ ...a, [x.cat]: [...(a[x.cat] ?? []), x] }), {}));
export function FabList({ kind }) {
  const list = kind === 'machines' ? MACHINES : MATERIALS;
  return (
    <div className="flex flex-col gap-5">
      {byCat(list).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="meta mb-2">{cat} ({items.length})</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {items.map((m) => (
              <a key={m.id} href={`#/d/${m.id}${kind === 'machines' ? '/anatomy3d' : ''}`} className="web-card hover:border-(--accent-amber) flex flex-col gap-1">
                <b>{m.name}</b>
                <span className="text-xs text-(--text-muted)">{m.what}</span>
                <span className="text-xs mt-auto pt-1">{(m.makers ?? m.suppliers).map((c) => c.name).join(', ')}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export const ProcessList = () => <div className="flex flex-col gap-3">{Object.keys(PROCESSES).map((k) => <ProcessCard key={k} k={k} open={false} />)}</div>;

export function Routes() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
      {ROUTES.map((r) => (
        <div key={r.id} className="web-card flex flex-col gap-1">
          <b>{r.name} <Fact fact={r.fact} /></b>
          <span className="text-sm">{r.what}</span>
          {r.process && <span className="text-xs"><b>Proces:</b> {r.process}</span>}
          {r.cost && <span className="text-xs"><b>Cena:</b> {r.cost}</span>}
          {r.url && <A href={r.url}>{r.url}</A>}
          <Sources list={r.sources} />
        </div>
      ))}
    </div>
  );
}
