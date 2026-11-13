// Web „Silicon Studio · Hardware“: katalog všech součástek, stránka každé z nich, projekty a souhrnné stránky z rešerše.
// Adresy (hash, funguje i na statickém hostingu): #/ katalog, #/d/<díl>/<záložka>, #/p/<projekt>/<pohled>,
// #/compare?ids=a,b,c, #/market, #/companies, #/timeline, #/map, #/bottlenecks, #/history.
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { PROJECTS, projectById } from '../engine/projects.js';
import { FIDELITY, PARTS, overallOf, partById, projectsOf } from './parts.js';
import { PartPage, Badge } from './PartPage.jsx';
import { Explorer } from './Explorer.jsx';
import { MapView, Companies, Timeline, Notes, Market } from './ResearchViews.jsx';
import { RESEARCH } from './research/index.js';
import { CatalogTree } from './CatalogTree.jsx';
import { anyById } from './catalogTree.js';
import { GROUPS, sectionById, sectionOf } from './sections.js';
import { bomTotal, fmtKc } from '../engine/economic/catalog.js';

const EconomicView = lazy(() => import('../views/EconomicView').then((m) => ({ default: m.EconomicView })));
const AnatomyView = lazy(() => import('../views/AnatomyView').then((m) => ({ default: m.AnatomyView })));

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

const PROJECT_VIEWS = [['schematic', 'SCHEMATIC'], ['hardware', 'PCB'], ['physics', 'ANATOMIE 3D'], ['economic', 'ECONOMIC'], ['anatomy', 'ANATOMY']];
function ProjectPage({ pr, view }) {
  const views = PROJECT_VIEWS.filter(([v]) => pr.views.includes(v));
  const cur = views.find(([v]) => v === view)?.[0] ?? pr.defaultView;
  const parts = PARTS.filter((p) => projectsOf(p).includes(pr.id));
  return (
    <div className="flex flex-col rb-fill">
      <div className="px-6 pt-3">
        <h1 className="text-xl font-semibold">{pr.title}</h1>
        <p className="text-sm text-(--text-muted)">{pr.subtitle} · {parts.length} součástek <a href="#/" className="text-(--accent-amber)">v katalogu</a></p>
        <nav className="flex gap-1 mt-3 border-b border-(--line)">{views.map(([v, n]) => <a key={v} href={`#/p/${pr.id}/${v}`} className={`web-tab ${v === cur ? 'is-on' : ''}`}>{n}</a>)}</nav>
      </div>
      <div className="flex-1 min-h-[480px] relative">
        <Suspense fallback={<div className="p-4 meta">NAČÍTÁM…</div>}>
          {cur === 'economic' ? <EconomicView key={pr.id} project={pr} />
            : cur === 'anatomy' ? <AnatomyView key={pr.id} project={pr} />
              : <Explorer key={pr.id} view={cur} circuit={pr.circuit} title={pr.title} subtitle={pr.subtitle} partId={PARTS.find((p) => p.root === pr.id)?.id} onOpenPart={(id) => window.location.assign(`#/d/${id}/anatomy3d`)} />}
        </Suspense>
      </div>
    </div>
  );
}

const Page = ({ title, note, children }) => (
  <div className="p-6"><h1 className="text-2xl font-semibold mb-1">{title}</h1><p className="text-sm text-(--text-muted) mb-4 max-w-3xl">{note}</p>{children}</div>
);

// ── Robotí rozvržení: oblasti nahoře, stránky oblasti + Souvisí, dole lišta Kde jsem, Mapa aplikace ───────────
function Header({ sec, sel }) {
  const g = sec.group;
  return (
    <header className="rb-head">
      <div className="rb-top">
        <a href="#/" className="rb-logo">SILICON STUDIO <span className="rb-badge">HW · WEB</span></a>
        <nav className="rb-groups">
          {GROUPS.map((x) => <a key={x.id} href={x.items[0].href(sel)} className={x.id === g.id ? 'is-on' : ''}><small>{x.num}</small> {x.name.toUpperCase()}</a>)}
        </nav>
      </div>
      <div className="rb-sub">
        <div className="rb-q"><b>{g.num}</b> {g.question.toUpperCase()}</div>
        <div className="rb-pages">
          {g.items.map((s) => <a key={s.id} href={s.href(sel)} className={s.id === sec.id ? 'is-on' : ''}><b>{s.name}</b><small>{s.short}</small></a>)}
        </div>
        <div className="rb-rel"><small>SOUVISÍ</small>{sec.related.map((r) => { const s = sectionById(r); return <a key={r} href={s.href(sel)}>{s.name} →</a>; })}</div>
      </div>
    </header>
  );
}

function Footer({ sec, where, how, onMap }) {
  return (
    <footer className="rb-foot">
      <div className="rb-where"><span className="rb-crumb">{sec.group.num} {sec.group.name.toUpperCase()} › {where.toUpperCase()}</span> <span>{sec.what}</span></div>
      <div className="rb-ctl"><small>OVLÁDÁNÍ</small>{(how ?? sec.how).map((h) => <span key={h}>{h}</span>)}</div>
      <button className="rb-mapbtn" onClick={onMap}>MAPA APLIKACE</button>
    </footer>
  );
}

function AppMap({ sel, onClose }) {
  return (
    <div className="rb-modal" onClick={onClose}>
      <div className="rb-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3"><h2 className="text-xl font-semibold">Mapa aplikace</h2><button onClick={onClose} className="web-btn">ZAVŘÍT (Esc)</button></div>
        <div className="grid md:grid-cols-2 gap-4">
          {GROUPS.map((g) => (
            <section key={g.id} className="web-card">
              <div className="meta mb-1">{g.num} {g.name} · {g.question}</div>
              {g.items.map((s) => (
                <a key={s.id} href={s.href(sel)} onClick={onClose} className="block py-1.5 border-b border-(--line) hover:text-(--accent-amber)">
                  <b>{s.name}</b> <span className="text-(--text-muted) text-xs">– {s.what}</span>
                  <div className="text-[10px] font-mono text-(--text-muted)">src/{s.code}</div>
                </a>
              ))}
            </section>
          ))}
        </div>
        <p className="text-xs text-(--text-muted) mt-3">Na každé stránce dílu jsou navíc záložky Přehled, Ceny a rozměry, Sestava (výkres), Mapa, Firmy, Časová osa, Úzká hrdla, Historie a Podíl na trhu. Klávesa ? otevře tuhle mapu.</p>
      </div>
    </div>
  );
}

function Projects() {
  return (
    <Page title="Moje sestavy" note="Čtyři projekty. Každý má SCHEMATIC, PCB, ANATOMII 3D, ECONOMIC a ANATOMY; součástky mají vlastní stránky.">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {PROJECTS.map((pr) => {
          const parts = PARTS.filter((p) => projectsOf(p).includes(pr.id));
          const n = Object.fromEntries(Object.keys(FIDELITY).map((k) => [k, parts.filter((p) => overallOf(p) === k).length]));
          return (
            <a key={pr.id} href={`#/p/${pr.id}`} className="web-card hover:border-(--accent-amber) flex flex-col gap-1">
              <b>{pr.title}</b>
              <span className="text-xs text-(--text-muted)">{pr.subtitle}</span>
              <span className="text-sm">Cena: <b className="text-(--accent-amber)">{fmtKc(bomTotal(pr.bom).min ?? 0)}</b> · {pr.bom.length} položek · {parts.length} součástek</span>
              <span className="flex gap-2 flex-wrap text-xs">{Object.entries(n).filter(([, v]) => v).map(([k, v]) => <span key={k}><Badge level={k} small /> {v}</span>)}</span>
            </a>
          );
        })}
      </div>
    </Page>
  );
}

export default function WebApp() {
  const { seg, q } = useRoute();
  const allIds = useMemo(() => PARTS.map((p) => p.id), []);
  const page = seg.slice(0, 2).join('/');
  const [sel, setSel] = useState('my_pc'); // vybraná součástka zůstává při přechodu mezi sekcemi
  const [map, setMap] = useState(false);
  const curPart = seg[0] === 'd' && anyById(seg[1] ?? '') ? seg[1] : null;
  if (curPart && curPart !== sel) setSel(curPart); // odvozený stav (vzor React: nastavení při renderu)
  useEffect(() => { document.getElementById('web-main')?.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    const k = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === '?') setMap((v) => !v);
      if (e.key === 'Escape') setMap(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const sec = sectionOf(seg);
  let body, where = sec.name;
  if (curPart) { body = <PartPage key={seg[1]} p={anyById(seg[1])} tab={seg[2]} />; where = `${anyById(seg[1]).name} · ${sec.id === 'catalog' ? 'stránka dílu' : sec.name}`; }
  else if (seg[0] === 'p' && PROJECTS.some((p) => p.id === seg[1])) { body = <ProjectPage key={seg[1]} pr={projectById(seg[1])} view={seg[2]} />; where = projectById(seg[1]).tab; }
  else if (seg[0] === 'projects') body = <Projects />;
  else if (seg[0] === 'compare') body = <Compare ids={(q.get('ids') ?? '').split(',')} />;
  else if (seg[0] === 'market') body = <Page title="Podíl na trhu" note="Podíly výrobců v kategoriích mých dílů, jen se zdrojem. Položky „Ostatní“ jsou dopočet do 100 %."><Market /></Page>;
  else if (seg[0] === 'companies') body = <Page title="Firmy" note="Všechny firmy z řetězců dodávek mých dílů, od těžby po výrobce."><Companies /></Page>;
  else if (seg[0] === 'timeline') body = <Page title="Časová osa" note="Uvedení, konce výroby a akvizice kolem všech mých dílů."><Timeline /></Page>;
  else if (seg[0] === 'map') body = <Page title="Mapa světa" note="Doly, rafinerie, fabriky a montáže všech mých dílů. Body označené OBECNĚ jsou typické lokality, ne doložené pro konkrétní díl."><MapView ids={allIds} /></Page>;
  else if (seg[0] === 'bottlenecks') body = <Page title="Úzká hrdla" note="Co brzdí nebo brzdilo výrobu a dostupnost mých dílů."><Notes section="bottlenecks" /></Page>;
  else if (seg[0] === 'history') body = <Page title="Historie výpadků" note="Minulé výpadky dodávek a události, které se mých dílů týkaly."><Notes section="history" /></Page>;
  else body = <CatalogTree />;
  return (
    <div className="rb-app">
      <Header sec={sec} sel={sel} />
      <main id="web-main" className="rb-main">{body}</main>
      <Footer sec={sec} where={where} how={seg[0] === 'p' && seg[2] === 'physics' ? sectionById('anatomy3d').how : null} onMap={() => setMap(true)} />
      {map && <AppMap sel={sel} onClose={() => setMap(false)} />}
    </div>
  );
}