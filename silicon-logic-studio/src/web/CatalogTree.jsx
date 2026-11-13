// Katalog jako strom podle sestav: vlevo projekty → díly → čipy → bloky uvnitř, vpravo náhled vybrané položky.
import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { FIDELITY, PARTS, overallOf, pathOf } from './parts.js';
import { treeRoots, ALL_BLOCKS, LIBRARY, usedInOf, blockPart, blockChildren } from './catalogTree.js';
import { RESEARCH } from './research/index.js';
import { Badge } from './PartPage.jsx';

const EVERYTHING = () => [...PARTS, ...ALL_BLOCKS, ...LIBRARY];
const kindLabel = (p) => (p.block ? `blok · L${String(p.level).replace('.', ',')}` : p.alt ? 'alternativa' : p.kind);

function Row({ node, depth, open, toggle, sel, setSel }) {
  const isOpen = open.has(node.id);
  const kids = useMemo(() => node.children(), [node]); // levné: jen viditelné řádky, jedna úroveň
  const p = node.part;
  const canOpen = kids.length > 0;
  return (
    <>
      <div className={`ct-row ${sel === node.id ? 'is-sel' : ''}`} style={{ paddingLeft: 8 + depth * 16 }} onClick={() => setSel(node.id, p)} onDoubleClick={() => toggle(node.id)}>
        <button className="ct-arrow" onClick={(e) => { e.stopPropagation(); toggle(node.id); }} aria-label={isOpen ? 'Sbalit' : 'Rozbalit'} style={{ visibility: canOpen ? 'visible' : 'hidden' }}>
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <span className={`ct-name ${p ? '' : 'ct-group'}`}>{p && !node.project ? p.name : node.label}</span>
        {p && <span className="ct-kind">{node.project ? 'sestava' : kindLabel(p)}</span>}
        {p && <Badge level={overallOf(p)} small />}
      </div>
      {isOpen && kids.map((k) => <Row key={k.id} node={k} depth={depth + 1} open={open} toggle={toggle} sel={sel} setSel={setSel} />)}
    </>
  );
}

function Preview({ p }) {
  if (!p) return <div className="ct-preview text-(--text-muted) text-sm">Vyber položku ve stromu. Šipka nebo dvojklik ji rozbalí, klik ukáže náhled.</div>;
  const kids = p.block ? blockChildren(p.block, []).map(blockPart) : [];
  const used = p.block ? usedInOf(p.block).map(blockPart) : [];
  const href = (tab) => `#/d/${p.id}${tab ? `/${tab}` : ''}`;
  const has3d = p.item || p.drill || p.root || p.circuit;
  return (
    <div className="ct-preview">
      <div className="text-[11px] text-(--text-muted)">{p.block ? `Blok uvnitř čipu · úroveň ${String(p.level).replace('.', ',')}` : p.in ? pathOf(p).slice(0, -1).map((x) => x.name).join(' / ') : kindLabel(p)}</div>
      <h2 className="text-xl font-semibold leading-tight mt-1">{p.name}</h2>
      <div className="mt-1"><Badge level={overallOf(p)} /></div>
      {(p.item?.part || p.subtitle || p.note) && <p className="text-sm text-(--text-muted) mt-2">{p.item?.part ?? p.subtitle ?? p.note}</p>}
      {p.alt && <p className="text-sm mt-2"><b>Proč je tu:</b> {p.alt}</p>}
      {p.qty && <p className="text-sm mt-1"><b>Počet:</b> {p.qty}</p>}
      <div className="flex flex-col gap-2 mt-3 text-sm">
        {[['3D model', p.model], ['Schéma', p.schema]].map(([n, [lv, note]]) => (
          <div key={n}><b>{n}</b> <Badge level={lv} small /><div className="text-(--text-muted) text-xs">{note}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <a className="web-btn" href={href('')}>Otevřít stránku</a>
        {has3d && <a className="web-btn" href={href('anatomy3d')}>Anatomie ve 3D</a>}
        {(p.drill || p.root || p.circuit) && <a className="web-btn" href={href('schema')}>Schéma</a>}
        {RESEARCH[p.id] && <a className="web-btn" href={href('supply')}>Strom dodávek</a>}
      </div>
      {used.length > 0 && <div className="mt-4"><div className="meta mb-1">Používá se v</div><div className="flex flex-wrap gap-1">{used.map((b) => <a key={b.id} href={`#/d/${b.id}`} className="web-chip">{b.name}</a>)}</div></div>}
      {kids.length > 0 && <div className="mt-3"><div className="meta mb-1">Obsahuje ({kids.length})</div><div className="flex flex-wrap gap-1">{kids.map((b) => <a key={b.id} href={`#/d/${b.id}`} className="web-chip">{b.name}</a>)}</div></div>}
    </div>
  );
}

export function CatalogTree() {
  const roots = useMemo(() => treeRoots(), []);
  const [open, setOpen] = useState(() => new Set(['mypc']));
  const [sel, setSelId] = useState(null);
  const [selPart, setSelPart] = useState(null);
  const [q, setQ] = useState('');
  const [fid, setFid] = useState('');
  const toggle = (id) => setOpen((o) => { const n = new Set(o); if (!n.delete(id)) n.add(id); return n; });
  const setSel = (id, p) => { setSelId(id); setSelPart(p ?? null); };
  const all = useMemo(() => EVERYTHING(), []);
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s && !fid) return null;
    return all.filter((p) => (!s || `${p.name} ${p.maker ?? ''} ${p.kind} ${p.subtitle ?? ''}`.toLowerCase().includes(s)) && (!fid || overallOf(p) === fid)).slice(0, 300);
  }, [q, fid, all]);
  const counts = { parts: PARTS.filter((p) => !p.alt).length, alts: PARTS.filter((p) => p.alt).length, blocks: ALL_BLOCKS.length, lib: LIBRARY.length };
  return (
    <div className="ct rb-fill">
      <div className="ct-head">
        <div>
          <h1 className="text-2xl font-semibold">Všechny součástky</h1>
          <p className="text-sm text-(--text-muted)">{counts.parts} fyzických dílů ve 4 sestavách · {counts.blocks} bloků uvnitř čipů (až k atomům) · {counts.lib} položek knihovny Studia{counts.alts ? ` · ${counts.alts} alternativ` : ''}. U každé je štítek, jestli je model podle dokumentace, částečně, nebo odhad.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="ct-search"><Search size={14} /><input placeholder="Hledat ve všem (díly, bloky, knihovna)…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          {Object.entries(FIDELITY).map(([k]) => <button key={k} className={`ct-fid ${fid === k ? 'is-on' : ''}`} onClick={() => setFid(fid === k ? '' : k)}><Badge level={k} small /></button>)}
        </div>
      </div>
      <div className="ct-body">
        <div className="ct-tree">
          {found ? (
            <>
              <div className="ct-empty">{found.length >= 300 ? 'Prvních 300 výsledků' : `${found.length} výsledků`}</div>
              {found.map((p) => (
                <div key={p.id} className={`ct-row ${sel === p.id ? 'is-sel' : ''}`} style={{ paddingLeft: 12 }} onClick={() => setSel(p.id, p)}>
                  <span className="ct-name">{p.name}</span><span className="ct-kind">{kindLabel(p)}</span><Badge level={overallOf(p)} small />
                </div>
              ))}
            </>
          ) : roots.map((r) => <Row key={r.id} node={r} depth={0} open={open} toggle={toggle} sel={sel} setSel={setSel} />)}
        </div>
        <Preview p={selPart} />
      </div>
    </div>
  );
}
