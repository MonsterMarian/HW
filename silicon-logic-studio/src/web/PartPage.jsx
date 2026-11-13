// Stránka jedné součástky: přesnost modelu, naše pohledy (3D + ceny, schéma, PCB, křemík, anatomie) a rešerše.
import React, { lazy, Suspense, useMemo } from 'react';
import { PROJECTS, projectById } from '../engine/projects.js';
import { HIERARCHICAL_SUBCIRCUITS as H } from '../engine/hierarchicalSubcircuits.js';
import { fmtRange } from '../engine/economic/catalog.js';
import { FIDELITY, childrenOf, overallOf, pathOf, projectsOf, modelRoot, partById } from './parts.js';
import { Explorer } from './Explorer.jsx';
import { SupplyTree, MapView, Companies, Timeline, Notes, Market } from './ResearchViews.jsx';
import { researchOf } from './research/index.js';
import { usedInOf, blockPart, blockChildren } from './catalogTree.js';
import { processesOf } from './fab/index.js';
import { buildMachine } from './fab/machineModels.js';
import { FabOverview, PartFab } from './FabViews.jsx';

const EconomicView = lazy(() => import('../views/EconomicView').then((m) => ({ default: m.EconomicView })));
const AnatomyView = lazy(() => import('../views/AnatomyView').then((m) => ({ default: m.AnatomyView })));

export const Badge = ({ level, small }) => (
  <span className="web-tag" style={{ color: FIDELITY[level].color, borderColor: FIDELITY[level].color }} title={FIDELITY[level].label}>
    {small ? FIDELITY[level].short : FIDELITY[level].label}
  </span>
);

// Sestava, ve které je díl vidět (ANATOMY): vlastní projekt, nebo první projekt, jehož kusovník díl má.
const assemblyOf = (p) => (p.root ? projectById(p.root) : p.bom && PROJECTS.find((pr) => pr.bom.some((it) => it.id === p.bom)));

// Rešerše (dodávky, mapa, firmy…) mají jen fyzické díly z registru, ne bloky uvnitř čipů ani knihovna.
const isFab = (p) => p.kind === 'Stroj' || p.kind === 'Materiál a dodavatel';
const researchable = (p) => !p.block && !p.circuit && !isFab(p);
const TABS = [
  { id: 'prehled', name: 'Přehled', has: () => true },
  { id: 'anatomy3d', name: 'Anatomie ve 3D', has: (p) => !!(p.item || p.drill || p.root || p.circuit) || p.kind === 'Stroj' },
  { id: 'schema', name: 'Schéma · laboratoř', has: (p) => !!(p.drill || p.root || p.circuit) },
  { id: 'pcb', name: 'PCB', has: (p) => !!p.root && projectById(p.root).views.includes('hardware') },
  { id: 'model', name: 'Ceny a rozměry', has: (p) => !!p.item },
  { id: 'anatomy', name: 'Sestava (výkres)', has: (p) => !!assemblyOf(p) },
  { id: 'vyroba', name: 'Výroba', has: (p) => processesOf(p).length > 0 },
  { id: 'supply', name: 'Strom dodávek', has: researchable },
  { id: 'map', name: 'Mapa světa', has: researchable },
  { id: 'companies', name: 'Firmy', has: researchable },
  { id: 'timeline', name: 'Časová osa', has: researchable },
  { id: 'bottlenecks', name: 'Úzká hrdla', has: researchable },
  { id: 'history', name: 'Historie výpadků', has: researchable },
  { id: 'market', name: 'Podíl na trhu', has: researchable },
];
const VIEW_OF = { schema: 'schematic', pcb: 'hardware' };
// Schéma / 3D začíná: projekt (L1), vlastní obvod (knihovna), nebo podobvod čipu.
const circuitProps = (p) => {
  if (p.root) { const pr = projectById(p.root); return { circuit: pr.circuit, title: pr.title, subtitle: pr.subtitle }; }
  if (p.circuit) return { circuit: p.circuit, title: p.name, subtitle: p.kind };
  const sub = H[p.drill];
  return { circuit: sub, title: sub.name, subtitle: sub.subtitle, level: sub.level, rootKey: sub.key };
};

// 3D: celý projekt (L1), nebo 3D model dílu z kusovníku a dvojklikem jeho podobvod, nebo rovnou podobvod čipu.
function Anatomy({ p }) {
  const props = useMemo(() => {
    if (p.kind === 'Stroj') return { circuit: modelRoot(p.name), title: p.name, subtitle: p.example ?? p.cat, level: 1, rootKey: '__model', build: () => buildMachine(p.id) };
    const sub = p.drill && H[p.drill];
    if (p.item && !p.root) return { circuit: modelRoot(p.name, p.drill), title: p.name, subtitle: p.kind, level: sub ? sub.level - 1 : 1, rootKey: '__model', model: p.item };
    return circuitProps(p);
  }, [p]);
  return <Explorer key={p.id + '3d'} view="physics" partId={p.id} {...props} onOpenPart={(id) => window.location.assign(`#/d/${id}/anatomy3d`)} />;
}

function BlockLinks({ p }) {
  const used = usedInOf(p.block).map(blockPart), inner = blockChildren(p.block, []).map(blockPart);
  return (
    <section className="web-card md:col-span-2">
      {p.subtitle && <p className="text-sm mb-2">{p.subtitle}</p>}
      {used.length > 0 && <><h3 className="meta mb-1">Používá se v</h3><div className="flex flex-wrap gap-2 mb-3">{used.map((b) => <a key={b.id} href={`#/d/${b.id}`} className="web-chip">{b.name}</a>)}</div></>}
      {inner.length > 0 && <><h3 className="meta mb-1">Obsahuje (dvojklikem ve 3D nebo ve schématu)</h3><div className="flex flex-wrap gap-2">{inner.map((b) => <a key={b.id} href={`#/d/${b.id}`} className="web-chip">{b.name} <Badge level={overallOf(b)} small /></a>)}</div></>}
    </section>
  );
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
          {p.maker && <tr><td>{p.block ? 'Proces' : 'Výrobce'}</td><td>{p.maker}</td></tr>}
          {p.item && <tr><td>Popis</td><td>{p.item.part}</td></tr>}
          {p.item && <tr><td>Kusů v sestavě</td><td>{p.item.qty}</td></tr>}
          {p.item?.dims && <tr><td>Rozměry</td><td>{p.item.dims.join(' × ')} mm</td></tr>}
          {p.item && <tr><td>Cena (nabídky)</td><td>{fmtRange(p.item.price)} · {p.item.offers.length} nabídek</td></tr>}
          {p.drill && H[p.drill] && <tr><td>Vnitřek</td><td>{H[p.drill].name} (úroveň {H[p.drill].level})</td></tr>}
          {projectsOf(p).length > 0 && <tr><td>Projekty</td><td>{projectsOf(p).map((id) => <a key={id} href={`#/p/${id}`} className="mr-2 text-(--accent-amber) hover:underline">{projectById(id).tab}</a>)}</td></tr>}
          {researchable(p) && <tr><td>Rešerše</td><td>{r ? `ověřeno ${r.checked}` : 'zatím ne'}</td></tr>}
        </tbody></table>
        {p.item?.note && <p className="text-sm text-(--text-muted) mt-2">{p.item.note}</p>}
        {p.note && <p className="text-sm mt-2">{p.note}</p>}
        {p.qty && <p className="text-sm mt-1"><b>Počet:</b> {p.qty}</p>}
        {p.alt && <p className="text-sm mt-1"><b>Proč je tu:</b> {p.alt}{p.altOf && partById(p.altOf) && <> (místo <a className="text-(--accent-amber) hover:underline" href={`#/d/${p.altOf}`}>{partById(p.altOf).name}</a>)</>}</p>}
        {p.sources?.length > 0 && <div className="text-xs mt-2 flex flex-col gap-0.5"><b>Zdroje</b>{p.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" className="text-(--accent-amber) hover:underline truncate">{s}</a>)}</div>}
      </section>
      {p.block && <BlockLinks p={p} />}
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
          {cur.id === 'prehled' && (isFab(p) ? <FabOverview p={p} /> : <Overview p={p} />)}
          {cur.id === 'vyroba' && <PartFab p={p} />}
          {cur.id === 'anatomy3d' && <Anatomy p={p} />}
          {cur.id === 'model' && <EconomicView key={p.id} project={{ id: p.id, title: p.name, bom: [p.item] }} />}
          {VIEW_OF[cur.id] && (
            <Explorer key={p.id} view={VIEW_OF[cur.id]} {...circuitProps(p)} />
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
