// Stránka jedné součástky: přesnost modelu, naše pohledy (3D + ceny, schéma, PCB, křemík, anatomie) a rešerše.
import React, { lazy, Suspense, useMemo } from 'react';
import { PROJECTS, projectById } from '../engine/projects.js';
import { HIERARCHICAL_SUBCIRCUITS as H } from '../engine/hierarchicalSubcircuits.js';
import { fmtRange } from '../engine/economic/catalog.js';
import { FIDELITY, childrenOf, overallOf, pathOf, projectsOf, modelRoot } from './parts.js';
import { Explorer } from './Explorer.jsx';
import { SupplyTree, MapView, Companies, Timeline, Notes, Market } from './ResearchViews.jsx';
import { researchOf } from './research/index.js';

const EconomicView = lazy(() => import('../views/EconomicView').then((m) => ({ default: m.EconomicView })));
const AnatomyView = lazy(() => import('../views/AnatomyView').then((m) => ({ default: m.AnatomyView })));

export const Badge = ({ level, small }) => (
  <span className="web-tag" style={{ color: FIDELITY[level].color, borderColor: FIDELITY[level].color }} title={FIDELITY[level].label}>
    {small ? FIDELITY[level].short : FIDELITY[level].label}
  </span>
);

// Sestava, ve které je díl vidět (ANATOMY): vlastní projekt, nebo první projekt, jehož kusovník díl má.
const assemblyOf = (p) => (p.root ? projectById(p.root) : p.bom && PROJECTS.find((pr) => pr.bom.some((it) => it.id === p.bom)));

const TABS = [
  { id: 'prehled', name: 'Přehled', has: () => true },
  { id: 'anatomy3d', name: 'Anatomie ve 3D', has: (p) => !!(p.item || p.drill || p.root) },
  { id: 'schema', name: 'Schéma · laboratoř', has: (p) => !!(p.drill || p.root) },
  { id: 'pcb', name: 'PCB', has: (p) => !!p.root && projectById(p.root).views.includes('hardware') },
  { id: 'model', name: 'Ceny a rozměry', has: (p) => !!p.item },
  { id: 'anatomy', name: 'Sestava (výkres)', has: (p) => !!assemblyOf(p) },
  { id: 'supply', name: 'Strom dodávek', has: () => true },
  { id: 'map', name: 'Mapa světa', has: () => true },
  { id: 'companies', name: 'Firmy', has: () => true },
  { id: 'timeline', name: 'Časová osa', has: () => true },
  { id: 'bottlenecks', name: 'Úzká hrdla', has: () => true },
  { id: 'history', name: 'Historie výpadků', has: () => true },
  { id: 'market', name: 'Podíl na trhu', has: () => true },
];
const VIEW_OF = { schema: 'schematic', pcb: 'hardware' };

// 3D: celý projekt (L1), nebo 3D model dílu z kusovníku a dvojklikem jeho podobvod, nebo rovnou podobvod čipu.
function Anatomy({ p }) {
  const props = useMemo(() => {
    const sub = p.drill && H[p.drill];
    if (p.root) { const pr = projectById(p.root); return { circuit: pr.circuit, title: pr.title, subtitle: pr.subtitle }; }
    if (p.item) return { circuit: modelRoot(p.name, p.drill), title: p.name, subtitle: p.kind, level: sub ? sub.level - 1 : 1, rootKey: '__model', model: p.item };
    return { circuit: sub, title: sub.name, subtitle: sub.subtitle, level: sub.level, rootKey: sub.key };
  }, [p]);
  return <Explorer key={p.id + '3d'} view="physics" partId={p.id} {...props} onOpenPart={(id) => window.location.assign(`#/d/${id}/anatomy3d`)} />;
}

function Overview({ p }) {
  const kids = childrenOf(p.id);
  const r = researchOf(p.id);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <section className="web-card">
        <h3 className="meta mb-2">Jak přesný je model</h3>
        {[['3D model a rozměry', p.model], ['Schéma a chování', p.schema]].map(([n, [lv, note]]) => (
          <div key={n} className="mb-3"><div className="text-sm font-semibold mb-1">{n} <Badge level={lv} /></div><p className="text-sm text-(--text-muted)">{note}</p></div>
        ))}
        <p className="text-[11px] text-(--text-muted)">Celkově: <Badge level={overallOf(p)} small /> (horší z obou).</p>
      </section>
      <section className="web-card">
        <h3 className="meta mb-2">Údaje</h3>
        <table className="web-table"><tbody>
          <tr><td>Kategorie</td><td>{p.kind}</td></tr>
          <tr><td>Výrobce</td><td>{p.maker}</td></tr>
          {p.item && <tr><td>Popis</td><td>{p.item.part}</td></tr>}
          {p.item && <tr><td>Kusů v sestavě</td><td>{p.item.qty}</td></tr>}
          {p.item?.dims && <tr><td>Rozměry</td><td>{p.item.dims.join(' × ')} mm</td></tr>}
          {p.item && <tr><td>Cena (nabídky)</td><td>{fmtRange(p.item.price)} · {p.item.offers.length} nabídek</td></tr>}
          {p.drill && H[p.drill] && <tr><td>Vnitřek</td><td>{H[p.drill].name} (úroveň {H[p.drill].level})</td></tr>}
          <tr><td>Projekty</td><td>{projectsOf(p).map((id) => <a key={id} href={`#/p/${id}`} className="mr-2 text-(--accent-amber) hover:underline">{projectById(id).tab}</a>)}</td></tr>
          <tr><td>Rešerše</td><td>{r ? `ověřeno ${r.checked}` : 'zatím ne'}</td></tr>
        </tbody></table>
        {p.item?.note && <p className="text-sm text-(--text-muted) mt-2">{p.item.note}</p>}
      </section>
      {kids.length > 0 && (
        <section className="web-card md:col-span-2">
          <h3 className="meta mb-2">Součástky na tomhle dílu ({kids.length})</h3>
          <div className="flex flex-wrap gap-2">{kids.map((k) => <a key={k.id} href={`#/d/${k.id}`} className="web-chip">{k.name} <Badge level={overallOf(k)} small /></a>)}</div>
        </section>
      )}
    </div>
  );
}

export function PartPage({ p, tab }) {
  const tabs = TABS.filter((t) => t.has(p));
  const cur = tabs.find((t) => t.id === tab) ?? tabs[0];
  const asm = assemblyOf(p);
  const sub = p.drill && H[p.drill];
  const full = ['model', 'schema', 'pcb', 'anatomy3d', 'anatomy'].includes(cur.id);
  return (
    <div className="flex flex-col rb-fill">
      <div className="px-6 pt-3">
        <div className="text-[11px] text-(--text-muted) mb-1">
          <a href="#/" className="hover:underline">Katalog</a>{pathOf(p).map((x) => <span key={x.id}> / <a href={`#/d/${x.id}`} className="hover:underline">{x.name}</a></span>)}
        </div>
        <h1 className="text-xl font-semibold">{p.name} <Badge level={overallOf(p)} /></h1>
        <p className="text-sm text-(--text-muted)">{p.kind} · {p.maker}</p>
        <nav className="flex flex-wrap gap-1 mt-3 border-b border-(--line)">
          {tabs.map((t) => <a key={t.id} href={`#/d/${p.id}/${t.id}`} className={`web-tab ${t.id === cur.id ? 'is-on' : ''}`}>{t.name}</a>)}
        </nav>
      </div>
      <div className={full ? 'flex-1 min-h-[480px] relative' : 'p-6'}>
        <Suspense fallback={<div className="p-4 meta">NAČÍTÁM…</div>}>
          {cur.id === 'prehled' && <Overview p={p} />}
          {cur.id === 'anatomy3d' && <Anatomy p={p} />}
          {cur.id === 'model' && <EconomicView key={p.id} project={{ id: p.id, title: p.name, bom: [p.item] }} />}
          {VIEW_OF[cur.id] && (
            <Explorer key={p.id} view={VIEW_OF[cur.id]}
              {...(p.root
                ? { circuit: projectById(p.root).circuit, title: projectById(p.root).title, subtitle: projectById(p.root).subtitle }
                : { circuit: sub, title: sub.name, subtitle: sub.subtitle, level: sub.level, rootKey: sub.key })} />
          )}
          {cur.id === 'anatomy' && (
            <div className="h-full flex flex-col">
              {!p.root && <div className="px-6 py-1 text-xs text-(--text-muted)">Díl je v sestavě „{asm.title}“ pod číslem {asm.bom.findIndex((it) => it.id === p.bom) + 1}.</div>}
              <div className="flex-1 relative"><AnatomyView key={asm.id} project={asm} /></div>
            </div>
          )}
          {cur.id === 'supply' && <SupplyTree part={p} />}
          {cur.id === 'map' && <MapView ids={[p.id]} />}
          {cur.id === 'companies' && <Companies part={p} />}
          {cur.id === 'timeline' && <Timeline part={p} />}
          {cur.id === 'bottlenecks' && <Notes part={p} section="bottlenecks" />}
          {cur.id === 'history' && <Notes part={p} section="history" />}
          {cur.id === 'market' && <Market part={p} />}
        </Suspense>
      </div>
    </div>
  );
}
