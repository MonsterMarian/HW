// Jediný seznam sekcí webu (jako v robotí aplikaci): oblasti nahoře, jejich stránky, popis, ovládání, soubor a „Souvisí“.
// `href(sel)` dostane id vybrané součástky (zůstává, když přejdeš třeba z Anatomie do Stromu dodávek).
const CONTROLS_3D = ['Levé tlačítko: otáčení', 'Pravé / Shift: posun', 'Kolečko: zoom ke kurzoru', 'Dvojklik: dovnitř dílu', 'WASD: let, Q/E: dolů/nahoru, Shift: rychleji',
  'Šipky: otáčení, +/−: zoom, F: celý díl', 'Esc / Backspace: o úroveň výš', 'Klik na díl: detail', 'Posuvník Složený → Rozložený'];

export const GROUPS = [
  {
    id: 'part', num: '01', name: 'Součástka', question: 'Jak je jedna součástka postavená?',
    items: [
      { id: 'catalog', name: 'Katalog', short: 'Všechny součástky', href: () => '#/', what: 'Strom všech součástek: sestavy → díly → čipy → bloky uvnitř až k atomům, knihovna Studia a alternativy.', how: ['Šipka / dvojklik: rozbalit', 'Klik: náhled vpravo', 'Hledání: díly, bloky i knihovna', 'Štítky: filtr přesnosti'], code: 'web/WebApp.jsx (Catalog)', related: ['anatomy3d', 'compare', 'map'] },
      { id: 'anatomy3d', name: 'Anatomie ve 3D', short: 'Model po dílech', href: (s) => `#/d/${s}/anatomy3d`, what: '3D model jedné součástky. Vlevo její systémy, uprostřed model, dole rozložení na díly. Dvojklik vede dovnitř až k atomům.', how: CONTROLS_3D, code: 'web/Anatomy3D.jsx', related: ['supply', 'lab', 'map'] },
      { id: 'supply', name: 'Strom dodávek', short: 'Z čeho je, až k dolům', href: (s) => `#/d/${s}/supply`, what: 'Z čeho se součástka skládá až k dolům. Sloupce zleva: těžba → rafinace → materiál → výroba → pouzdření → výrobce → díl.', how: ['Najeď na uzel: zvýrazní cestu', 'Klik na uzel: detail a zdroj'], code: 'web/ResearchViews.jsx (SupplyTree)', related: ['anatomy3d', 'map', 'bottlenecks'] },
    ],
  },
  {
    id: 'parts', num: '02', name: 'Díly', question: 'Co je uvnitř a jak se díly liší?',
    items: [
      { id: 'compare', name: 'Porovnání dílů', short: 'Až 3 vedle sebe', href: () => '#/compare', what: 'Až tři součástky vedle sebe: přesnost modelu, rozměry, projekty, firmy a místa výroby.', how: ['Nahoře vyber díly', 'Z katalogu: zaškrtni „porovnat“'], code: 'web/WebApp.jsx (Compare)', related: ['catalog', 'lab'] },
      { id: 'lab', name: 'Laboratoř', short: 'Schéma, které běží', href: (s) => `#/d/${s}/schema`, what: 'Schéma vybrané součástky jako živá simulace: RUN / STEP, dvojklik na blok = o úroveň hlouběji.', how: ['RUN / STEP: simulace', 'Dvojklik na blok: dovnitř', 'Klik na paměť: editor obsahu', 'Kolečko: zoom, táhni: posun'], code: 'web/Explorer.jsx', related: ['anatomy3d', 'compare'] },
    ],
  },
  {
    id: 'market', num: '03', name: 'Trh', question: 'Kdo je dělá, za kolik a kdy?',
    items: [
      { id: 'projects', name: 'Sestavy', short: 'Moje 4 projekty', href: () => '#/projects', what: 'Karty mých sestav: cena, počet dílů a přesnost; každá má SCHEMATIC, PCB, ANATOMIE 3D, ECONOMIC a ANATOMY.', how: ['Klik na kartu: sestava', 'Nahoře v sestavě: pohledy'], code: 'web/WebApp.jsx (Projects)', related: ['market', 'companies'] },
      { id: 'market', name: 'Podíl na trhu', short: 'Kdo dodává nejvíc', href: () => '#/market', what: 'Podíly výrobců v kategoriích mých dílů (jen se zdrojem).', how: ['Klik na díl: jeho stránka'], code: 'web/ResearchViews.jsx (Market)', related: ['companies', 'projects'] },
      { id: 'companies', name: 'Firmy', short: 'Výrobci a dodavatelé', href: () => '#/companies', what: 'Všechny firmy z řetězců dodávek mých dílů.', how: ['Hledání: firma, obor, země', 'Klik na díl: jeho stránka'], code: 'web/ResearchViews.jsx (Companies)', related: ['timeline', 'map'] },
      { id: 'timeline', name: 'Časová osa', short: 'Uvedení a konce výroby', href: () => '#/timeline', what: 'Uvedení, konce výroby a akvizice kolem mých dílů.', how: ['Klik na díl: jeho stránka'], code: 'web/ResearchViews.jsx (Timeline)', related: ['companies', 'market'] },
    ],
  },
  {
    id: 'sources', num: '04', name: 'Suroviny', question: 'Odkud díly pocházejí a co hrozí?',
    items: [
      { id: 'map', name: 'Mapa světa', short: 'Doly a továrny', href: () => '#/map', what: 'Doly, rafinerie, fabriky a montáže všech dílů; pod mapou tabulka míst se zdroji.', how: ['Najeď na bod: detail', 'Klik na bod: zdroj'], code: 'web/WorldMap.jsx', related: ['supply', 'bottlenecks', 'companies'] },
      { id: 'bottlenecks', name: 'Úzká hrdla', short: 'Co brzdí výrobu', href: () => '#/bottlenecks', what: 'Co brzdí nebo brzdilo výrobu a dostupnost mých dílů.', how: ['Klik na položku: vysvětlení a zdroj'], code: 'web/ResearchViews.jsx (Notes)', related: ['history', 'map', 'supply'] },
      { id: 'history', name: 'Historie výpadků', short: 'Minulé výpadky', href: () => '#/history', what: 'Minulé výpadky dodávek a události, které se mých dílů týkaly.', how: ['Klik na případ: detail a zdroj'], code: 'web/ResearchViews.jsx (Notes)', related: ['bottlenecks', 'map'] },
    ],
  },
  {
    id: 'fab', num: '05', name: 'Výroba', question: 'Na čem a z čeho se díly vyrábějí?',
    items: [
      { id: 'processes', name: 'Výrobní postupy', short: 'Kroky od waferu', href: () => '#/fab/processes', what: 'Výrobní postupy čipů a desek: kroky, stroje, materiály a továrny (Intel 14 nm, TSMC 16 nm, Samsung 8N, DRAM, 3D NAND, pouzdření, DPS, osazení).', how: ['Klik na postup: rozbalí kroky', 'Klik na stroj / materiál: jeho stránka'], code: 'web/FabViews.jsx (ProcessList)', related: ['machines', 'materials', 'routes'] },
      { id: 'machines', name: 'Stroje', short: 'Co je potřeba, 3D', href: () => '#/fab/machines', what: 'Výrobní stroje (litografie, depozice, leptání, test, pouzdření, osazování) s výrobci, závody a 3D modelem.', how: ['Klik na stroj: Anatomie ve 3D', 'Ve 3D: posuvník rozloží stroj na moduly'], code: 'web/fab/machineModels.js', related: ['processes', 'materials', 'map'] },
      { id: 'materials', name: 'Materiály a dodavatelé', short: 'Kde je koupit', href: () => '#/fab/materials', what: 'Materiály na výrobu (wafery, rezisty, plyny, chemie, terče, substráty, pájky): kdo je dodává, kde se vyrábějí a kde je koupit.', how: ['Klik na materiál: dodavatelé, mapa, kde koupit'], code: 'web/fab/materials.js', related: ['processes', 'machines', 'routes'] },
      { id: 'routes', name: 'Vlastní čip', short: 'Jak si ho nechat vyrobit', href: () => '#/fab/routes', what: 'Cesty, jak si jednotlivec může nechat vyrobit vlastní čip (sdílené wafery MPW, open-source PDK) a co jde doma.', how: ['Klik na odkaz: stránka služby'], code: 'web/FabViews.jsx (Routes)', related: ['processes', 'materials'] },
    ],
  },
];
export const SECTIONS = GROUPS.flatMap((g) => g.items.map((s) => ({ ...s, group: g })));
export const sectionById = (id) => SECTIONS.find((s) => s.id === id);
const PART_TAB = { vyroba: 'processes', anatomy3d: 'anatomy3d', supply: 'supply', schema: 'lab', pcb: 'lab', map: 'map', companies: 'companies', timeline: 'timeline', bottlenecks: 'bottlenecks', history: 'history', market: 'market' };
// Sekce podle adresy (seg = části hashe). Stránka dílu bez vlastní sekce patří do oblasti 01.
export function sectionOf(seg) {
  if (seg[0] === 'd' && /^mat_/.test(seg[1] ?? '')) return sectionById('materials');
  if (seg[0] === 'd' && /^m_/.test(seg[1] ?? '')) return sectionById('machines');
  if (seg[0] === 'd') return sectionById(PART_TAB[seg[2]] ?? 'catalog');
  if (seg[0] === 'fab') return sectionById(seg[1] ?? 'processes') ?? sectionById('processes');
  if (seg[0] === 'p') return sectionById('projects');
  return sectionById(seg[0] ?? 'catalog') ?? sectionById('catalog');
}

// shortcut: kontrola dat při načtení; překlep v `related` hned spadne v konzoli.
for (const s of SECTIONS) for (const r of s.related) console.assert(sectionById(r), `sections.js: neznámé related "${r}" u "${s.id}"`);
