// Stránky výroby: stroje, materiály a dodavatelé, výrobní postupy dílů a cesty k vlastnímu čipu.
import React, { lazy, Suspense } from 'react';
import { ExternalLink } from 'lucide-react';
import { MACHINES, MATERIALS, PROCESSES, ROUTES, fabById, processesOf, usageOf, DISTRIBUTORS, PART_BUY, MACHINE_BUY, SERVICES, GPU_BUILD, CARDS, machinesOf, searchUrl } from './fab/index.js';
import { Fact } from './ResearchViews.jsx';
import { partById, childrenOf } from './parts.js';
import { researchOf } from './research/index.js';

const WorldMap = lazy(() => import('./WorldMap.jsx'));
const A = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-(--accent-amber) hover:underline text-xs"><ExternalLink size={10} />{children}</a>;
const Chip = ({ id }) => { const f = fabById(id); return f ? <a href={`#/d/${id}`} className="web-chip">{f.name}</a> : <span className="web-chip opacity-60">{id}</span>; };
const Sources = ({ list }) => (list?.length ? <div className="flex flex-col gap-0.5 mt-2"><b className="text-xs">Zdroje</b>{list.map((s) => <A key={s} href={s}>{s}</A>)}</div> : null);

// body na mapu, vrstvy FAB_LAYERS: 0 výrobce stroje, 1 dodavatel materiálu, 2 továrna procesu
const plantsOf = (list, stage, part) => list.flatMap((c) => (c.plants ?? []).filter((x) => x.lat != null).map((x) => ({ stage, name: c.name, place: x.name, country: x.country, lat: x.lat, lon: x.lon, part })));
export const PlacesMap = ({ points }) => (points.length
  ? <Suspense fallback={<div className="meta">NAČÍTÁM MAPU…</div>}><WorldMap points={points} legend="fab" /></Suspense>
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
        {MACHINE_BUY[p.id]?.length > 0 && <><h3 className="meta mt-4 mb-1">Kde stroj pořídit</h3><MachineBuy id={p.id} /></>}
        <h3 className="meta mt-4 mb-1">Použití ve výrobě</h3>
        <Usage id={p.id} />
      </section>
      <section className="web-card md:col-span-2"><h3 className="meta mb-2">Mapa závodů</h3><div className="max-w-4xl"><PlacesMap points={plantsOf(companies, p.kind === 'Stroj' ? 0 : 1)} /></div></section>
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
  const fabs = keys.flatMap((k) => (PROCESSES[k].fabs ?? []).filter((f) => f.lat != null).map((f) => ({ stage: 2, name: PROCESSES[k].name, place: f.name, country: f.country, lat: f.lat, lon: f.lon })));
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

// ── kde koupit díl / pořídit stroj ──────────────────────────────────────────────────────────────────────
const money = (o) => (o.price == null ? '' : typeof o.price === 'number' ? `${o.price.toLocaleString('cs')} ${o.currency ?? ''}` : o.price);
export function PartBuy({ id, compact }) {
  const b = PART_BUY[id];
  const q = b?.query ?? partById(id)?.name;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {b?.note && <span className={compact ? 'text-xs text-(--text-muted)' : ''}>{b.note}</span>}
      {(b?.offers ?? []).map((o, i) => (
        <span key={i}><A href={o.url}>{o.shop}</A> <span className="text-xs">{o.label}</span> {money(o) && <b className="text-xs">{money(o)}</b>} <span className="text-xs text-(--text-muted)">{o.tier}</span> <Fact fact={o.fact} /></span>
      ))}
      {q && <span className="flex flex-wrap gap-x-2 text-xs"><span className="text-(--text-muted)">Hledat „{q}“:</span>{DISTRIBUTORS.filter((d) => d.search).map((d) => <A key={d.id} href={searchUrl(d, q)}>{d.name}</A>)}</span>}
    </div>
  );
}
export function MachineBuy({ id }) {
  return (
    <ul className="text-sm flex flex-col gap-1">
      {(MACHINE_BUY[id] ?? []).map((o, i) => (
        <li key={i}><span className="web-chip">{o.tier}</span> <A href={o.url ?? o.src}>{o.label}</A> {o.price && <b className="text-xs">{o.price}</b>} <Fact fact={o.fact} />{o.note && <div className="text-xs text-(--text-muted)">{o.note}</div>}</li>
      ))}
    </ul>
  );
}

// ── Postav si kartu ─────────────────────────────────────────────────────────────────────────────────────
const descendants = (id) => childrenOf(id).flatMap((c) => [c, ...descendants(c.id)]);
const pt = (stage, name, place, part) => (place?.lat != null ? { stage, name, place: place.name, country: place.country, lat: place.lat, lon: place.lon, part } : null);
export function BuildCard({ id }) {
  const card = partById(CARDS.includes(id) ? id : CARDS[CARDS.length - 1]);
  const parts = descendants(card.id).filter((p) => !/edge$/.test(p.id));
  const chipKeys = [...new Set(parts.flatMap((p) => (p.kind === 'Čip' || p.kind === 'Paměť' ? processesOf(p) : [])))].filter((k) => k !== 'pcb' && k !== 'smt');
  const boardM = machinesOf(['pcb', 'smt']);
  const chipM = machinesOf(chipKeys).filter((m) => !boardM.includes(m));
  const points = [
    ...DISTRIBUTORS.map((d) => pt(3, d.name, d.place, 'distributor součástek')),
    ...SERVICES.map((s) => pt(5, s.name, s.place, s.what)),
    ...boardM.flatMap((m) => (MACHINE_BUY[m] ?? []).map((o) => pt(4, o.label, o.place, fabById(m)?.name))),
    ...boardM.flatMap((m) => (fabById(m)?.makers ?? []).flatMap((c) => (c.plants ?? []).map((x) => pt(0, c.name, x, fabById(m).name)))),
    ...parts.flatMap((p) => (researchOf(p.id)?.supply ?? []).filter((n) => n.stage >= 3).map((n) => pt(6, n.name, n.place, p.name))),
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">{CARDS.map((c) => <a key={c} href={`#/fab/build/${c}`} className={`web-chip ${c === card.id ? 'border-(--accent-amber) text-(--accent-amber)' : ''}`}>{partById(c).name}</a>)}</div>
      <section className="web-card">
        <h2 className="meta mb-2">Co je potřeba na grafickou kartu</h2>
        <ol className="flex flex-col gap-2 text-sm">{GPU_BUILD.map((g, i) => <li key={i}><b>{i + 1}. {g.title}</b> <Fact fact={g.fact} /> <A href={g.src}>zdroj</A><div className="text-(--text-muted)">{g.text}</div></li>)}</ol>
      </section>
      <section className="web-card">
        <h2 className="meta mb-2">Mapa: kde se díly vyrábějí, kde je koupit a kde vzít stroje</h2>
        <div className="max-w-5xl"><PlacesMap points={points} /></div>
      </section>
      <section className="web-card overflow-x-auto">
        <h2 className="meta mb-2">Kusovník {card.name} a kde co koupit ({parts.length} položek)</h2>
        <table className="web-table"><thead><tr><th>Díl</th><th>Počet</th><th>Kde koupit</th></tr></thead>
          <tbody>{parts.map((p) => <tr key={p.id}><td className="min-w-48"><a href={`#/d/${p.id}`} className="text-(--accent-amber) hover:underline">{p.name}</a><div className="text-xs text-(--text-muted)">{p.kind}</div></td><td className="text-xs max-w-40">{p.qty ?? '1'}</td><td><PartBuy id={p.id} compact /></td></tr>)}</tbody>
        </table>
      </section>
      <section className="web-card">
        <h2 className="meta mb-2">Stroje na desku: výroba DPS a osazení</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {boardM.map((m) => <div key={m} className="border border-(--line) p-2"><a href={`#/d/${m}/anatomy3d`} className="font-semibold text-(--accent-amber) hover:underline">{fabById(m)?.name ?? m}</a> <span className="text-xs text-(--text-muted)">3D model →</span><MachineBuy id={m} /></div>)}
        </div>
      </section>
      <section className="web-card">
        <h2 className="meta mb-2">Nebo bez strojů: služby, které desku vyrobí a osadí</h2>
        <table className="web-table"><tbody>{SERVICES.map((s) => <tr key={s.id}><td className="font-semibold"><A href={s.url}>{s.name}</A> <Fact fact={s.fact} /></td><td>{s.place?.name} ({s.place?.country})</td><td className="text-xs">{s.what}</td><td className="text-xs">{s.price ?? ''}</td></tr>)}</tbody></table>
      </section>
      {chipM.length > 0 && (
        <details className="web-card">
          <summary className="cursor-pointer meta">Stroje na samotné čipy karty ({chipM.length}) – fabrika, ne dílna</summary>
          <p className="text-sm text-(--text-muted) mt-1">Postupy: {chipKeys.map((k) => PROCESSES[k].name).join(' · ')}</p>
          <div className="flex flex-wrap gap-1 mt-2">{chipM.map((m) => <Chip key={m} id={m} />)}</div>
        </details>
      )}
    </div>
  );
}