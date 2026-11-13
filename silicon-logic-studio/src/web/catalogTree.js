// Strom katalogu: projekt → díl → díl na něm → blok uvnitř čipu (podobvody až k atomům), knihovna Studia, alternativy.
// Bloky a položky knihovny nejsou v registru ručně – vznikají z podobvodů (hierarchicalSubcircuits) a z knihovny enginu.
import { PROJECTS } from '../engine/projects.js';
import { HIERARCHICAL_SUBCIRCUITS as H, findSubcircuit } from '../engine/hierarchicalSubcircuits.js';
import { PRIMITIVE_PINS } from '../engine/logicEngine.js';
import { PRESET_CIRCUITS } from '../engine/aiCopilot.js';
import { PARTS, partById, childrenOf, projectsOf } from './parts.js';
import { MACHINES, MATERIALS, fabById } from './fab/index.js';

// ── bloky uvnitř čipů ────────────────────────────────────────────────────────────────────────────────────
// Přesnost bloků je pravidlo, ne ruční údaj: vyšší úrovně jsou model podle veřejných popisů, nízké úrovně
// (hradla, CMOS, mřížky, atomy) jsou učebnicová fyzika, procesy podle publikací výrobců.
function blockFidelity(sub) {
  const text = `${sub.name} ${sub.subtitle ?? ''}`;
  const unsure = /odhad|neověř|princip|ilustrativ|typ nezjišt/i.test(text) || sub.process === 'unknown';
  if (sub.level >= 9) return { model: ['doc', 'Atomy a částice podle tabulkových hodnot (poloměry, slupky, složení jádra).'], schema: ['doc', 'Fyzika podle učebnic; není co simulovat logicky.'] };
  if (sub.level >= 7) return {
    model: unsure ? ['estimate', 'Rozměry ilustrativní – proces výrobce nezveřejnil.'] : ['partial', 'Rozměry a vrstvy podle publikace procesu (IEDM / výrobce); detaily zjednodušené.'],
    schema: ['doc', 'Tranzistor jako spínač (NMOS / PMOS) podle učebnice.'],
  };
  if (sub.level >= 5) return { model: ['estimate', 'Rozmístění buněk a tranzistorů je model, ne layout skutečného čipu.'], schema: ['doc', 'Učebnicové zapojení hradel / CMOS (obecné, ne layout konkrétního čipu).'] };
  return {
    model: ['estimate', 'Rozmístění bloků (floorplan) je model, ne skutečný layout čipu.'],
    schema: unsure ? ['estimate', 'Bloky z odhadu nebo principu – výrobce vnitřek nezveřejnil.'] : ['partial', 'Blokové schéma podle veřejných popisů výrobce; vnitřní zapojení je zjednodušený model.'],
  };
}

const blockCache = new Map();
export function blockPart(key) {
  key = H[key]?.key ?? key; // aliasy (NV1_CORE → nv1_die …)
  const sub = H[key];
  if (!sub) return null;
  if (!blockCache.has(key)) {
    const f = blockFidelity(sub);
    blockCache.set(key, { id: `b.${key}`, block: key, name: sub.name, subtitle: sub.subtitle, kind: 'Blok v čipu', maker: sub.process ? `proces ${sub.process}` : '', drill: key, level: sub.level, model: f.model, schema: f.schema });
  }
  return blockCache.get(key);
}

// Bloky, do kterých vede dvojklik ze součástek podobvodu `key` (stack = předci, aby šlo jen hlouběji a bez cyklu).
export function blockChildren(key, stack) {
  const sub = H[key];
  if (!sub) return [];
  const st = [...stack, { key, level: sub.level }];
  const out = new Map();
  for (const c of sub.components) {
    const s = findSubcircuit(c, st);
    if (s && !out.has(s.key)) out.set(s.key, s.key);
  }
  return [...out.keys()];
}

// Kde se blok používá (opačný směr): klíče podobvodů, jejichž součástka do něj vede.
let usedIn = null;
export function usedInOf(key) {
  if (!usedIn) {
    usedIn = new Map();
    for (const k of Object.keys(H)) for (const ch of blockChildren(k, [])) usedIn.set(ch, [...(usedIn.get(ch) ?? []), k]);
  }
  return [...new Set(usedIn.get(key) ?? [])];
}

// ── knihovna Studia (součástky enginu a ukázkové obvody z galerie) ──────────────────────────────────────
const PROJECT_PRESETS = new Set(['nvidia_nv1', 'ai_pc_power', 'my_pc']);
const one = (type) => ({ components: [{ id: 'u1', type, label: H[type]?.name ?? type, x: 200, y: 160, sx: 200, sy: 160, inputs: {}, outputs: {} }], wires: [] });
export const LIBRARY = [
  ...Object.keys(PRIMITIVE_PINS).map((type) => ({
    id: `lib.${type}`, name: H[type]?.name ?? type.replace(/_/g, ' '), kind: 'Knihovna Studia', maker: 'součástka enginu', libType: type,
    circuit: one(type), model: ['estimate', 'Obecné pouzdro – není to konkrétní výrobek.'], schema: ['doc', 'Logická funkce podle definice (obecný model, ne konkrétní čip).'],
  })),
  ...Object.entries(PRESET_CIRCUITS).filter(([k]) => !PROJECT_PRESETS.has(k)).map(([k, c]) => ({
    id: `lib.preset.${k}`, name: c.name, kind: 'Ukázkový obvod', maker: 'galerie Studia', circuit: c,
    model: ['estimate', 'Obecná pouzdra na obecné desce.'], schema: ['doc', 'Učebnicové zapojení, simulované hradlo po hradle.'],
  })),
];

// ── uzly stromu ──────────────────────────────────────────────────────────────────────────────────────────
// Uzel: { id, label, part?, children(): Uzel[] }. Děti se počítají až při rozbalení (bloků jsou stovky).
const blockNode = (k, stack, path) => { const key = H[k].key; return {
  id: `${path}/b.${key}`, part: blockPart(key),
  children: () => { const st = [...stack, { key, level: H[key].level }]; return blockChildren(key, stack).map((c) => blockNode(c, st, `${path}/b.${key}`)); },
}; };
function partNode(p, path) {
  const id = `${path}/${p.id}`;
  return {
    id, part: p,
    children: () => {
      const kids = childrenOf(p.id).map((c) => partNode(c, id));
      if (!p.drill || p.root) return kids;
      const covered = new Set(childrenOf(p.id).map((c) => c.drill).filter(Boolean));
      const st = [{ key: '__part', level: Math.max(1, H[p.drill].level - 1) }];
      return [...kids, blockNode(p.drill, st, id)].filter((n) => !n.part.block || !covered.has(n.part.block));
    },
  };
}
// Díl je v projektu nahoře, když nemá rodiče v tomtéž projektu (rodič „Sestava“ = projekt sám).
const topLevel = (prId) => PARTS.filter((p) => projectsOf(p).includes(prId) && !(p.root && p.kind === 'Sestava') && (() => {
  const par = p.in && partById(p.in);
  return !par || !projectsOf(par).includes(prId) || (par.root && par.kind === 'Sestava');
})());

export function treeRoots() {
  const alts = PARTS.filter((p) => p.alt);
  const roots = PROJECTS.map((pr) => ({
    id: pr.id, label: pr.title, project: pr, part: PARTS.find((p) => p.root === pr.id && p.kind === 'Sestava') ?? null,
    children: () => topLevel(pr.id).map((p) => partNode(p, pr.id)),
  }));
  const lib = LIBRARY.filter((l) => l.kind === 'Knihovna Studia'), demos = LIBRARY.filter((l) => l.kind === 'Ukázkový obvod');
  roots.push({ id: 'lib', label: `Knihovna Studia (${LIBRARY.length})`, children: () => [
    { id: 'lib/parts', label: `Součástky enginu (${lib.length})`, children: () => lib.map((l) => ({ id: `lib/${l.id}`, part: l, children: () => (H[l.libType] ? [blockNode(l.libType, [{ key: '__lib', level: 0 }], `lib/${l.id}`)] : []) })) },
    { id: 'lib/demos', label: `Ukázkové obvody (${demos.length})`, children: () => demos.map((l) => ({ id: `lib/${l.id}`, part: l, children: () => [] })) },
  ] });
  // materiály (mřížky L8) a prvky (atomy L9) přímo, bez proklikávání čipem
  const mats = ALL_BLOCKS.filter((b) => b.level === 8), atoms = ALL_BLOCKS.filter((b) => b.level === 9);
  roots.push({ id: 'mat', label: `Materiály a prvky (${mats.length + atoms.length})`, children: () => [
    { id: 'mat/l8', label: `Materiály – atomové mřížky (${mats.length})`, children: () => mats.map((b) => blockNode(b.block, [{ key: '__mat', level: 7 }], 'mat/l8')) },
    { id: 'mat/l9', label: `Prvky – atomy (${atoms.length})`, children: () => atoms.map((b) => blockNode(b.block, [{ key: '__mat', level: 8 }], 'mat/l9')) },
  ] });
  // výroba: stroje a materiály podle kategorií
  const cats = (list, pre) => [...new Set(list.map((x) => x.cat))].map((c) => ({ id: `${pre}/${c}`, label: `${c} (${list.filter((x) => x.cat === c).length})`, children: () => list.filter((x) => x.cat === c).map((x) => ({ id: `${pre}/${x.id}`, part: x, children: () => [] })) }));
  roots.push({ id: 'fab', label: `Výroba: stroje (${MACHINES.length}) a materiály (${MATERIALS.length})`, children: () => [
    { id: 'fab/m', label: `Stroje (${MACHINES.length})`, children: () => cats(MACHINES, 'fab/m') },
    { id: 'fab/mat', label: `Materiály a dodavatelé (${MATERIALS.length})`, children: () => cats(MATERIALS, 'fab/mat') },
  ] });
  if (alts.length) roots.push({ id: 'alt', label: `Alternativy a kandidáti (${alts.length})`, children: () => alts.map((p) => ({ id: `alt/${p.id}`, part: p, children: () => [] })) });
  return roots;
}

// Všechno, co má stránku (pro hledání a odkazy): díly, bloky, knihovna.
export const ALL_BLOCKS = Object.keys(H).filter((k) => H[k].key === k).map(blockPart);
export const anyById = (id) => (id.startsWith('b.') ? blockPart(id.slice(2)) : id.startsWith('lib.') ? LIBRARY.find((l) => l.id === id) : partById(id) ?? fabById(id)) ?? null;
