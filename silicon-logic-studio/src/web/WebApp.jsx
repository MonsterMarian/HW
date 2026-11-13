// Web „Silicon Studio · Hardware“: katalog všech součástek, stránka každé z nich, projekty a souhrnné stránky z rešerše.
// Adresy (hash, funguje i na statickém hostingu): #/ katalog, #/d/<díl>/<záložka>, #/p/<projekt>/<pohled>,
// #/compare?ids=a,b,c, #/market, #/companies, #/timeline, #/map, #/bottlenecks, #/history.
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { PROJECTS, projectById } from '../engine/projects.js';
import { FIDELITY, KINDS, PARTS, overallOf, partById, projectsOf } from './parts.js';
import { PartPage, Badge } from './PartPage.jsx';
import { Explorer } from './Explorer.jsx';
import { MapView, Companies, Timeline, Notes, Market } from './ResearchViews.jsx';
import { RESEARCH } from './research/index.js';

const EconomicView = lazy(() => import('../views/EconomicView').then((m) => ({ default: m.EconomicView })));
const AnatomyView = lazy(() => import('../views/AnatomyView').then((m) => ({ default: m.AnatomyView })));

const GROUPS = [
  { num: '01', name: 'Součástky', items: [['Katalog', '#/'], ['Porovnání', '#/compare']] },
  { num: '02', name: 'Projekty', items: PROJECTS.map((p) => [p.tab, `#/p/${p.id}`]) },
  { num: '03', name: 'Trh', items: [['Podíl na trhu', '#/market'], ['Firmy', '#/companies'], ['Časová osa', '#/timeline']] },
  { num: '04', name: 'Suroviny', items: [['Mapa světa', '#/map'], ['Úzká hrdla', '#/bottlenecks'], ['Historie výpadků', '#/history']] },
];

function useRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const [path, q = ''] = hash.replace(/^#/, '').split('?');
  return { seg: path.split('/').filter(Boolean), q: new URLSearchParams(q), hash: hash || '#/' };
}

function Header({ hash }) {
  const on = (h) => (h === '#/' ? hash === '#/' || hash === '#' : hash.startsWith(h));
  return (
    <header className="border-b border-(--line) px-6 py-3 flex flex-wrap items-end gap-x-8 gap-y-2 bg-(--bg-dark) sticky top-0 z-50">
      <a href="#/" className="font-semibold tracking-wide">SILICON STUDIO <span className="serif-accent text-(--accent-amber)">hardware</span></a>
      {GROUPS.map((g) => (
        <div key={g.num}>
          <div className="meta text-[10px]">{g.num} {g.name}</div>
          <div className="flex flex-wrap gap-1">{g.items.map(([n, h]) => <a key={h} href={h} className={`web-tab ${on(h) ? 'is-on' : ''}`}>{n}</a>)}</div>
        </div>
      ))}
    </header>
  );
}

function Catalog() {
  const [q, setQ] = useState('');
  const [proj, setProj] = useState('');
  const [kind, setKind] = useState('');
  const [fid, setFid] = useState('');
  const [cmp, setCmp] = useState([]);
  const shown = PARTS.filter((p) => (!q || `${p.name} ${p.maker} ${p.kind}`.toLowerCase().includes(q.toLowerCase()))
    && (!proj || projectsOf(p).includes(proj)) && (!kind || p.kind === kind) && (!fid || overallOf(p) === fid));
  const counts = Object.keys(FIDELITY).map((k) => [k, PARTS.filter((p) => overallOf(p) === k).length]);
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-1">Všechny součástky mého hardwaru</h1>
      <p className="text-(--text-muted) max-w-3xl mb-3">
        {PARTS.length} fyzických součástek ze 4 projektů, i ty nejmenší (krystal, EEPROM, konektor). Každá má vlastní stránku: 3D model a ceny,
        schéma až k atomům, strom dodávek, mapu, firmy, časovou osu, úzká hrdla a historii. Štítek říká, jestli je model udělaný
        <b> přesně podle dokumentace</b>, <b>částečně</b>, nebo <b>odhadem</b>. Rešerše hotová u {Object.keys(RESEARCH).length} dílů.
      </p>
      <div className="flex flex-wrap gap-3 mb-4 text-xs">{counts.map(([k, n]) => <button key={k} onClick={() => setFid(fid === k ? '' : k)}><Badge level={k} small /> {n}</button>)}</div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className="web-input" placeholder="Hledat díl, výrobce…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="web-input" value={proj} onChange={(e) => setProj(e.target.value)}><option value="">Všechny projekty</option>{PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.tab}</option>)}</select>
        <select className="web-input" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Všechny kategorie</option>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <select className="web-input" value={fid} onChange={(e) => setFid(e.target.value)}><option value="">Jakákoli přesnost</option>{Object.entries(FIDELITY).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>
        {cmp.length > 0 && <a className="web-btn" href={`#/compare?ids=${cmp.join(',')}`}>Porovnat ({cmp.length})</a>}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {shown.map((p) => (
          <div key={p.id} className="web-card flex flex-col gap-1">
            <a href={`#/d/${p.id}`} className="font-semibold hover:text-(--accent-amber)">{p.name}</a>
            <div className="text-[11px] text-(--text-muted)">{p.kind} · {p.maker}{p.in ? ` · na: ${partById(p.in).name}` : ''}</div>
            <div className="flex flex-wrap gap-1 items-center mt-1"><Badge level={overallOf(p)} /></div>
            <div className="text-[11px] text-(--text-muted)">3D: {FIDELITY[p.model[0]].short} · schéma: {FIDELITY[p.schema[0]].short}{RESEARCH[p.id] ? ' · rešerše ✓' : ''}</div>
            <label className="text-[11px] mt-auto pt-1 flex items-center gap-1 text-(--text-muted)">
              <input type="checkbox" checked={cmp.includes(p.id)} disabled={!cmp.includes(p.id) && cmp.length >= 3}
                onChange={(e) => setCmp(e.target.checked ? [...cmp, p.id] : cmp.filter((x) => x !== p.id))} /> porovnat
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function Compare({ ids }) {
  const sel = ids.map(partById).filter(Boolean).slice(0, 3);
  const set = (i, id) => { const n = sel.map((p) => p.id); n[i] = id; window.location.assign(`#/compare?ids=${n.filter(Boolean).join(',')}`); };
  const rows = [
    ['Kategorie', (p) => p.kind], ['Výrobce', (p) => p.maker], ['Celková přesnost', (p) => <Badge level={overallOf(p)} />],
    ['3D model', (p) => <><Badge level={p.model[0]} small /> <div className="text-(--text-muted)">{p.model[1]}</div></>],
    ['Schéma', (p) => <><Badge level={p.schema[0]} small /> <div className="text-(--text-muted)">{p.schema[1]}</div></>],
    ['Popis', (p) => p.item?.part ?? '–'], ['Rozměry', (p) => (p.item?.dims ? `${p.item.dims.join(' × ')} mm` : '–')],
    ['Projekty', (p) => projectsOf(p).map((id) => projectById(id).tab).join(', ')],
    ['Firmy v řetězci', (p) => RESEARCH[p.id]?.companies.length ?? '–'], ['Místa na mapě', (p) => RESEARCH[p.id]?.supply.filter((n) => n.place).length ?? '–'],
  ];
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-3">Porovnání součástek (max. 3)</h1>
      <table className="web-table">
        <thead><tr><th />{[0, 1, 2].map((i) => (
          <th key={i}><select className="web-input" value={sel[i]?.id ?? ''} onChange={(e) => set(i, e.target.value)}>
            <option value="">– vyber díl –</option>{PARTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></th>))}</tr></thead>
        <tbody>{rows.map(([n, f]) => <tr key={n}><td className="meta">{n}</td>{[0, 1, 2].map((i) => <td key={i}>{sel[i] ? f(sel[i]) : ''}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const PROJECT_VIEWS = [['schematic', 'SCHEMATIC'], ['hardware', 'PCB'], ['physics', 'DIE 3D'], ['economic', 'ECONOMIC'], ['anatomy', 'ANATOMY']];
function ProjectPage({ pr, view }) {
  const views = PROJECT_VIEWS.filter(([v]) => pr.views.includes(v));
  const cur = views.find(([v]) => v === view)?.[0] ?? pr.defaultView;
  const parts = PARTS.filter((p) => projectsOf(p).includes(pr.id));
  return (
    <div className="flex flex-col">
      <div className="px-6 pt-4">
        <h1 className="text-2xl font-semibold">{pr.title}</h1>
        <p className="text-sm text-(--text-muted)">{pr.subtitle} · {parts.length} součástek <a href="#/" className="text-(--accent-amber)">v katalogu</a></p>
        <nav className="flex gap-1 mt-3 border-b border-(--line)">{views.map(([v, n]) => <a key={v} href={`#/p/${pr.id}/${v}`} className={`web-tab ${v === cur ? 'is-on' : ''}`}>{n}</a>)}</nav>
      </div>
      <div className="h-[calc(100vh-170px)] min-h-[520px] relative">
        <Suspense fallback={<div className="p-4 meta">NAČÍTÁM…</div>}>
          {cur === 'economic' ? <EconomicView key={pr.id} project={pr} />
            : cur === 'anatomy' ? <AnatomyView key={pr.id} project={pr} />
              : <Explorer key={pr.id} view={cur} circuit={pr.circuit} title={pr.title} subtitle={pr.subtitle} />}
        </Suspense>
      </div>
    </div>
  );
}

const Page = ({ title, note, children }) => (
  <div className="p-6"><h1 className="text-2xl font-semibold mb-1">{title}</h1><p className="text-sm text-(--text-muted) mb-4 max-w-3xl">{note}</p>{children}</div>
);

export default function WebApp() {
  const { seg, q, hash } = useRoute();
  const allIds = useMemo(() => PARTS.map((p) => p.id), []);
  const page = seg.slice(0, 2).join('/');
  useEffect(() => { document.getElementById('web-scroll')?.scrollTo(0, 0); }, [page]);
  let body;
  if (seg[0] === 'd' && partById(seg[1])) body = <PartPage key={seg[1]} p={partById(seg[1])} tab={seg[2]} />;
  else if (seg[0] === 'p' && PROJECTS.some((p) => p.id === seg[1])) body = <ProjectPage key={seg[1]} pr={projectById(seg[1])} view={seg[2]} />;
  else if (seg[0] === 'compare') body = <Compare ids={(q.get('ids') ?? '').split(',')} />;
  else if (seg[0] === 'market') body = <Page title="Podíl na trhu" note="Podíly výrobců v kategoriích mých dílů, jen se zdrojem. Položky „Ostatní“ jsou dopočet do 100 %."><Market /></Page>;
  else if (seg[0] === 'companies') body = <Page title="Firmy" note="Všechny firmy z řetězců dodávek mých dílů, od těžby po výrobce."><Companies /></Page>;
  else if (seg[0] === 'timeline') body = <Page title="Časová osa" note="Uvedení, konce výroby a akvizice kolem všech mých dílů."><Timeline /></Page>;
  else if (seg[0] === 'map') body = <Page title="Mapa světa" note="Doly, rafinerie, fabriky a montáže všech mých dílů. Body označené OBECNĚ jsou typické lokality, ne doložené pro konkrétní díl."><MapView ids={allIds} /></Page>;
  else if (seg[0] === 'bottlenecks') body = <Page title="Úzká hrdla" note="Co brzdí nebo brzdilo výrobu a dostupnost mých dílů."><Notes section="bottlenecks" /></Page>;
  else if (seg[0] === 'history') body = <Page title="Historie výpadků" note="Minulé výpadky dodávek a události, které se mých dílů týkaly."><Notes section="history" /></Page>;
  else body = <Catalog />;
  return (
    <div id="web-scroll" className="h-screen overflow-auto bg-(--bg-dark) text-(--text-light)">
      <Header hash={hash} />
      {body}
    </div>
  );
}
