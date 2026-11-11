// Tranzistory skutečných výrobních procesů (L7) a jejich atomy (L8). Vybírá je findSubcircuit podle `process` nejbližšího
// předka (cfl_die / b360_pch → intel14, ga104_die → samsung8n, cell_buck → power, cell_tft → tft, jinde v mém PC unknown).
// Zdroje: Natarajan et al., IEDM 2014 (Intel 14 nm); Intel 14++ CPP 84 nm (SemiWiki, Motley Fool); Chipworks/TechInsights
// k Broadwellu (gate stack); Samsung 8LPP – VLSI 2018 (WikiChip, jen výpisy); patent US7696599 (rozměry trench MOSFETu, ten má na dně zákopu izolační zátku) a Silvaco (trench MOSFET se
// stínicí elektrodou); HfO₂ / TiN – Materials Project, Wikipedie; Si – CODATA. Co zdroj nemá, je v popisku „neověřeno“.
const c = (id, type, label, x, y, extra = {}) => ({ id, type, label, x, y, inputs: {}, outputs: {}, ...extra });
const layer = (id, label, x, y, drill) => c(id, 'LAYER', label, x, y, drill ? { drill } : {});
const atom = (id, label, x, y, drill) => c(id, 'ATOM', label, x, y, drill ? { drill } : {});

export const PROCESS_SUBCIRCUITS = {};
const def = (key, level, sub) => { PROCESS_SUBCIRCUITS[key] = { key, level, ...sub }; };

const COLS = [[660, 60], [660, 172], [660, 284], [660, 396], [810, 116], [810, 228], [810, 340]];
/** L7: simulovaný tranzistor (hradlo → kanál → drain) + popsané vrstvy procesu. */
function fet(key, { type, name, subtitle, scene, geom, lattice, layers }) {
  const p = type === 'PMOS';
  def(key, 7, {
    name, subtitle, scene, geom,
    components: [
      c('gate', 'INPUT', 'HRADLO (G)', 60, 172, { outputs: { out: p ? 1 : 0 } }),
      c('src', p ? 'VDD' : 'GND', p ? 'SOURCE = VDD' : 'SOURCE = GND', 210, 351),
      c('m1', type, `${type} (${geom.short})`, 360, 206, { drill: lattice }),
      c('drain', 'PROBE', 'DRAIN (vede / Z)', 510, 206),
      ...layers.map(([label, drill], i) => layer(`l${i}`, label, ...COLS[i], drill)),
    ],
    wires: [
      { from: { id: 'gate', pin: 'out' }, to: { id: 'm1', pin: 'g' } },
      { from: { id: 'src', pin: 'out' }, to: { id: 'm1', pin: 's' } },
      { from: { id: 'm1', pin: 'd' }, to: { id: 'drain', pin: 'in' } },
    ],
  });
}

// ---------------------------------------------------------------- Intel 14 nm++ (i7-9700, B360)
const INTEL = { title: 'Intel 14 nm++ FinFET', short: '14 nm FinFET', fins: 2, finPitch: 42, finW: 8, finH: 42, cpp: 84, lg: 20, il: 0.6, hk: 1.0, gateH: 50, spacer: 8, src: 'IEDM 2014; výška hradla a spacer ilustrativní' };
for (const type of ['NMOS', 'PMOS']) {
  const p = type === 'PMOS';
  fet(`${type}_intel14`, {
    type, scene: 'finfet', lattice: 'hkmg_lattice', geom: { ...INTEL, pmos: p },
    name: `${type} – Intel 14 nm++ FinFET (i7-9700, B360)`,
    subtitle: `IEDM 2014: 2. generace FinFET (tri-gate), žebra rozteč 42 nm, šířka 8 nm, výška 42 nm, Lg ≈ 20 nm, kovy M0/M1/M2 56/70/52 nm, 13 vrstev Cu s low-k a 2 vrstvami air gap, W kontakty, HKMG 4. generace. 14++ (Coffee Lake): CPP 84 nm (14 nm: 70 nm), o ~24 % vyšší proud. Chipworks (Broadwell): high-k na bázi Hf ~1 nm, ${p ? 'PMOS kov TiN' : 'NMOS kov TiAl/TiAlN + TiN'}. Tloušťka IL SiOx a Lg u 14++ neověřeny. Hradlo obepíná žebro ze 3 stran.`,
    layers: [
      ['ŽEBRA Si: ROZTEČ 42, ŠÍŘKA 8, VÝŠKA 42 nm'],
      ['HRADLO: Lg ≈ 20 nm, CPP 84 nm (14++)'],
      ['HIGH-k Hf ~1 nm + IL SiOx (neověřeno)', 'hkmg_lattice'],
      [p ? 'KOVOVÉ HRADLO: TiN, VÝPLŇ W' : 'KOVOVÉ HRADLO: TiAl/TiAlN + TiN, VÝPLŇ W'],
      [p ? 'S/D: EPITAXE SiGe (TLAK)' : 'S/D: EPITAXE (Si:P – neověřeno)'],
      ['KONTAKTY W · 13× Cu + low-k + AIR GAP'],
      ['STI – OXID MEZI ŽEBRY'],
    ],
  });
}

// ---------------------------------------------------------------- Samsung 8N / 8LPP (GA104)
const SAMSUNG = { title: 'Samsung 8N (8LPP) FinFET', short: '8 nm FinFET', fins: 2, finPitch: 42, finW: 7, finH: 46, cpp: 64, lg: 18, il: 0.6, hk: 1.2, gateH: 45, spacer: 7, src: 'VLSI 2018; výška a šířka žeber, Lg a vrstvy hradla neověřeny – ilustrativní' };
for (const type of ['NMOS', 'PMOS']) {
  fet(`${type}_samsung8n`, {
    type, scene: 'finfet', lattice: 'hkmg_lattice', geom: { ...SAMSUNG, pmos: type === 'PMOS' },
    name: `${type} – Samsung 8N (8LPP) FinFET (GA104)`,
    subtitle: 'VLSI 2018 (Samsung): 8LPP = rozšíření 10LPP bez EUV, rozteč žeber 42 nm, CPP 64 nm (10LPP 68), M1/Mx 44 nm, single diffusion break, UHD knihovna 61,2 MTr/mm². GA104 reálně 17,4 mld. / 392 mm² ≈ 44 MTr/mm². „8N“ je varianta pro NVIDIA. Hradlo HKMG gate-last na bázi Hf – výška a šířka žeber, Lg a tloušťky vrstev neověřeny (zdroje za paywallem).',
    layers: [
      ['ŽEBRA: ROZTEČ 42 nm (VÝŠKA NEOVĚŘENA)'],
      ['CPP 64 nm · M1 44 nm · BEZ EUV'],
      ['HKMG GATE-LAST, Hf (NEOVĚŘENO)', 'hkmg_lattice'],
      ['SINGLE DIFFUSION BREAK'],
      ['GA104 ≈ 44 MTr/mm² (17,4 mld. / 392 mm²)'],
      ['S/D EPITAXE (DETAIL NEOVĚŘEN)'],
    ],
  });
}

// ---------------------------------------------------------------- AI PC: Intel 22 nm (Xeon E5-1650 v3)
const INTEL22 = { title: 'Intel 22 nm tri-gate', short: '22 nm tri-gate', fins: 2, finPitch: 60, finW: 8, finH: 34, cpp: 90, lg: 30, il: 0.8, hk: 1.2, gateH: 45, spacer: 8, src: 'Auth et al., VLSI 2012; vrstvy hradla ilustrativní' };
for (const type of ['NMOS', 'PMOS']) {
  fet(`${type}_intel22`, {
    type, scene: 'finfet', lattice: 'hkmg_lattice', geom: { ...INTEL22, pmos: type === 'PMOS' },
    name: `${type} – Intel 22 nm tri-gate (Xeon E5-1650 v3, Haswell-EP)`,
    subtitle: 'Auth et al., VLSI 2012: první FinFET (tri-gate) v sériové výrobě, plně vyčerpaný kanál. Rozteč žeber 60 nm, výška 34 nm, šířka 8 nm, CPP 90 nm, Lg 30 nm (HP), 3. generace HKMG gate-last, 5. generace strain, 9 vrstev Cu + W M0 (M1 90, M2/M3 80 nm). Čísla z výňatků paperu; materiály kovového hradla neověřeny. Die Haswell-EP LCC 354 mm², 2,6 mld. tranzistorů.',
    layers: [
      ['ŽEBRA Si: ROZTEČ 60, VÝŠKA 34, ŠÍŘKA 8 nm'],
      ['HRADLO: Lg ≈ 30 nm, CPP 90 nm'],
      ['HKMG 3. GEN, GATE-LAST (MATERIÁLY NEOVĚŘENY)', 'hkmg_lattice'],
      ['9× Cu + W M0 · M1 90 nm'],
      [type === 'PMOS' ? 'S/D: EPITAXE SiGe (5. GEN. STRAIN)' : 'S/D: EPITAXE (5. GEN. STRAIN)'],
      ['SRAM HD 0,092 µm²'],
    ],
  });
}

// ---------------------------------------------------------------- AI PC: TSMC 16FF+ (GP100)
const TSMC16 = { title: 'TSMC 16FF+ FinFET', short: '16 nm FinFET', fins: 2, finPitch: 48, finW: 8, finH: 37, cpp: 90, lg: 30, il: 0.8, hk: 1.2, gateH: 45, spacer: 8, src: 'Chipworks IEDM 2014; výška žeber ~37 nm podle tabulky na Wikipedii; Lg a vrstvy hradla neověřeny – ilustrativní' };
for (const type of ['NMOS', 'PMOS']) {
  fet(`${type}_tsmc16`, {
    type, scene: 'finfet', lattice: 'hkmg_lattice', geom: { ...TSMC16, pmos: type === 'PMOS' },
    name: `${type} – TSMC 16FF+ FinFET (GP100, Tesla P100)`,
    subtitle: 'Chipworks (IEDM 2014): rozteč žeber 48 nm, CPP 90 nm, M1 64 nm (pravděpodobně SADP), ostatní kovy 80/90 nm, HKMG gate-last s dvojím oxidem, dvojí epitaxní zvýšené S/D, W lokální propojení, low-k. GP100: 610 mm², 15,3 mld. tranzistorů. Výška žeber, Lg a SRAM buňka neověřeny.',
    layers: [
      ['ŽEBRA: ROZTEČ 48 nm, VÝŠKA ~37 nm'],
      ['CPP 90 nm · M1 64 nm'],
      ['HKMG GATE-LAST, DVOJÍ OXID', 'hkmg_lattice'],
      ['DVOJÍ EPITAXNÍ ZVÝŠENÉ S/D'],
      ['W LOKÁLNÍ PROPOJENÍ · low-k'],
    ],
  });
}

// ---------------------------------------------------------------- AI PC: TSMC 28 nm HP planární HKMG (GM107, Quadro K620)
for (const type of ['NMOS', 'PMOS']) {
  fet(`${type}_tsmc28`, {
    type, scene: 'planar', lattice: 'hkmg_lattice', geom: { title: 'TSMC 28 nm HP – planární HKMG (tvar ilustrativní)', short: '28 nm planar HKMG' },
    name: `${type} – TSMC 28 nm HP planární HKMG (GM107, Quadro K620)`,
    subtitle: 'TechInsights (28 HP, Radeon HD 7970): planární tranzistor, HKMG gate-last (náhrada poly): high-k na bázi HfO₂ na ~1,2 nm SiO₂, PMOS kov TiN, NMOS TiAlN, PMOS S/D z eSiGe, CPP ~117–120 nm, 12 vrstev kovu, SRAM 0,16 µm². GM107: 148 mm², 1,87 mld. tranzistorů. Zda 28HP nebo 28HPM, neověřeno.',
    layers: [
      ['CPP ≈ 117–120 nm, 12 VRSTEV KOVU'],
      ['HfO₂ NA ~1,2 nm SiO₂', 'hkmg_lattice'],
      [type === 'PMOS' ? 'KOV TiN, S/D eSiGe' : 'KOV TiAlN'],
      ['PLANÁRNÍ – KANÁL JEN POD HRADLEM'],
    ],
  });
}

// ---------------------------------------------------------------- DRAM: přístupový tranzistor BCAT
fet('NMOS_dram', {
  type: 'NMOS', scene: 'planar', lattice: 'sio2_gate_lattice', geom: { title: 'BCAT – zapuštěné hradlo buňky DRAM (tvar ilustrativní)', short: 'BCAT', recess: true },
  name: 'Přístupový tranzistor DRAM – BCAT (zapuštěná wordline)',
  subtitle: 'Moderní DRAM (DDR4, GDDR6X, HBM2, LPDDR4) má v každé buňce jeden tranzistor a jeden kondenzátor. Tranzistor je BCAT (buried channel array transistor): wordline je zapuštěná do drážky v křemíku, kanál obtéká dno drážky, takže je delší a méně uniká. Nad ním stojí kondenzátor (válec, u generací 1x nm a menších i sloupek) vysoký ~1,5–2 µm s poměrem stran aspoň 40:1 (Applied Materials; starší údaj 20–30: obecný patent). TechInsights to potvrzuje pro Samsung 1y/1a a Winbond 20 nm; pro konkrétní čipy v tvém PC neověřeno.',
  layers: [
    ['WORDLINE ZAPUŠTĚNÁ V DRÁŽCE'],
    ['OXID HRADLA SiO₂', 'sio2_gate_lattice'],
    ['KONDENZÁTOR: VÁLEC / SLOUPEK, POMĚR STRAN ≥ 40:1'],
    ['BITLINE KONTAKT'],
    ['20 nm 8 Gb: BUŇKA ≈ 0,0033 µm² (DOPOČET)'],
  ],
});

// ---------------------------------------------------------------- V-NAND: buňka se zachyceným nábojem
fet('NMOS_vnand', {
  type: 'NMOS', scene: 'vnand', lattice: 'ono_lattice', geom: { title: 'V-NAND – svislý kanál, slova kolem (výřez 6 z 92–128 aktivních vrstev)', short: 'V-NAND charge trap' },
  name: 'Buňka Samsung V-NAND – charge trap, hradlo kolem kanálu',
  subtitle: 'V-NAND (970 EVO Plus: V5 92 aktivních vrstev; 870 EVO: V6 128 aktivních, 136 hradel na řetězec – TechInsights): svislý kanál z poly-Si (trubka s oxidovým jádrem) prochází otvorem ve stohu, každá vrstva wolframové wordline ho obepíná (gate-all-around, TCAT). Mezi kanálem a wordline je tunelový oxid, zachycovací SiN (náboj zůstane v nevodivé vrstvě) a blokovací oxid. TLC = 8 úrovní náboje = 3 bity. Tloušťky vrstev a průměr otvoru neověřeny.',
  layers: [
    ['KANÁL poly-Si (TRUBKA, OXIDOVÉ JÁDRO)', 'ono_lattice'],
    ['TUNELOVÝ OXID SiO₂', 'ono_lattice'],
    ['ZACHYCOVACÍ VRSTVA SiN', 'ono_lattice'],
    ['BLOKOVACÍ OXID SiO₂ + Al₂O₃ (HIGH-k), BARIÉRA TiN'],
    ['WORDLINE W – VRSTVY STOHU'],
    ['V5 92 / V6 128 AKTIVNÍCH VRSTEV'],
  ],
});

// ---------------------------------------------------------------- výkonový trench MOSFET (VRM, DC-DC, PFC)
fet('NMOS_power', {
  type: 'NMOS', scene: 'trench', lattice: 'sio2_gate_lattice',
  geom: { title: 'Trench MOSFET se stínicí elektrodou', short: 'trench, výkonový', pitch: 0.5, trenchW: 0.25, trenchD: 1.2, ox: 0.04, bodyD: 0.5, srcD: 0.15, drift: 1.5, len: 1.5, src: 'rozměry z příkladu 25 V patentu US7696599 (ten má na dně zákopu izolační zátku; stínicí elektroda podle Silvaco)' },
  name: 'Výkonový trench MOSFET (DrMOS ve VRM a DC-DC)',
  subtitle: 'VRM desky a karty: DrMOS = budič + horní a dolní MOSFET v jednom pouzdře (např. onsemi FDMF6821C 6 × 6 mm, 50 A). MOSFETy jsou svislé: hradlo v zákopu, pod ním stínicí elektroda spojená se source (nižší Qgd), proud teče z povrchu dolů do substrátu. Patent US7696599 udává pro ≤ 30 V rozteč buněk 0,2–0,7 µm (příklad s průrazem 25 V: 0,5 µm, zákop 1,2 × 0,25 µm), Rds(on) diskrétních 25V typů ~0,5–3 mΩ. Konkrétní typ MOSFETů na tvé desce a kartě i tloušťka oxidu neověřeny.',
  layers: [
    ['ZÁKOP 0,25 × 1,2 µm, ROZTEČ 0,5 µm (PŘÍKLAD)'],
    ['OXID HRADLA SiO₂ (TLOUŠŤKA NEOVĚŘENA)', 'sio2_gate_lattice'],
    ['STÍNICÍ ELEKTRODA (SHIELD) = SOURCE'],
    ['P-BODY: KANÁL PODÉL STĚNY ZÁKOPU'],
    ['N− DRIFT: NESE NAPĚTÍ'],
    ['SOURCE: N+ NAHOŘE + KOV'],
    ['DRAIN: N+ SUBSTRÁT DOLE'],
  ],
});

// ---------------------------------------------------------------- čipy, jejichž proces výrobce neuvádí
for (const type of ['NMOS', 'PMOS']) {
  fet(`${type}_unknown`, {
    type, scene: 'planar', lattice: 'sio2_gate_lattice', geom: { title: 'MOSFET – princip (proces neuveden, rozměry ilustrativní)', short: 'proces neuveden' },
    name: `${type} – princip (výrobce proces nezveřejnil)`,
    subtitle: 'U tohoto čipu (síťový řadič, zvukový kodek, řadič SSD, DRAM, mikrokontroléry periferií, scaler monitoru…) výrobce výrobní proces ani rozměry tranzistorů nezveřejnil. Zobrazen je jen princip MOSFETu: napětí na hradle přes tenké dielektrikum vytvoří vodivý kanál mezi source a drain. Rozměry a materiály jsou ilustrativní, ne skutečné.',
    layers: [
      ['HRADLO (MATERIÁL NEZNÁMÝ)'],
      ['DIELEKTRIKUM HRADLA (NEZNÁMÉ)', 'sio2_gate_lattice'],
      ['SOURCE / DRAIN'],
      ['PROCES NEZVEŘEJNĚN – ILUSTRATIVNÍ'],
    ],
  });
}

// ---------------------------------------------------------------- TFT panelu LCD
fet('NMOS_tft', {
  type: 'NMOS', scene: 'planar', lattice: 'asi_sinx_lattice', geom: { title: 'a-Si:H TFT panelu LCD (spodní hradlo na skle)', short: 'a-Si TFT', tft: true },
  name: 'TFT pixelu – amorfní křemík na skle',
  subtitle: 'Většina monitorových LCD panelů má tenkovrstvé tranzistory z hydrogenovaného amorfního křemíku (a-Si:H) se spodním hradlem: kov hradla na skle, izolant SiNₓ, kanál a-Si:H, kontakty n+ a-Si a kov S/D, průhledná elektroda pixelu ITO. Pohyblivost elektronů ~0,5–1 cm²/Vs (typické). Že má panel VA249HE právě a-Si TFT (ne IGZO), je neověřené.',
  layers: [
    ['HRADLO: KOV NA SKLE'],
    ['IZOLANT SiNₓ', 'asi_sinx_lattice'],
    ['KANÁL a-Si:H', 'asi_sinx_lattice'],
    ['S/D: KOV + n+ a-Si'],
    ['ITO – ELEKTRODA PIXELU'],
    ['a-Si TYPICKÉ, U VA249HE NEOVĚŘENO'],
  ],
});

// ---------------------------------------------------------------- L8 atomy vrstev
const SI_INFO = 'Si: a = 5,431 Å, Si–Si 2,352 Å (CODATA)';
def('hkmg_lattice', 8, {
  name: 'Atomy hradla HKMG: Si / SiOx / HfO₂ / TiN',
  subtitle: 'Kanál Si (u FinFET bok žebra, u planárního 28 nm povrch; krystal), tenká mezivrstva SiOx (u TSMC 28HP ~1,2 nm podle TechInsights), high-k HfO₂ (v hradle amorfní; ε ≈ 20–25, Eg 5,3–5,7 eV, Hf–O 2,05–2,23 Å, Hf 6–7 sousedů O) a kovové hradlo TiN (NaCl, a = 4,241 Å). High-k je proto, aby šlo dostat elektrické pole do kanálu bez tunelování přes příliš tenký SiO₂. Tloušťky vrstev u 14 nm/8N kromě ~1 nm high-k neověřeny.',
  scene: 'lattice',
  stack: [{ name: 'Si kanál – krystal (výřez)', kind: 'si', thick: 10.9 }, { name: 'IL SiOx (neověřeno)', kind: 'sio2', thick: 6 }, { name: 'HfO₂ amorfní ~1 nm', kind: 'hfo2', thick: 10 }, { name: 'TiN a = 4,241 Å (výřez)', kind: 'tin', thick: 8.5 }],
  components: [
    atom('el_si', 'Si – ŽEBRO A MEZIVRSTVA', 60, 60, 'atom_si'), atom('el_o', 'O – V SiOx A HfO₂', 60, 200, 'atom_o'), atom('el_hf', 'Hf – HIGH-k HfO₂', 60, 340, 'atom_hf'),
    atom('el_ti', 'Ti – KOVOVÉ HRADLO TiN', 360, 60, 'atom_ti'), atom('el_n', 'N – KOVOVÉ HRADLO TiN', 360, 200, 'atom_n'),
    atom('i_hf', 'HfO₂: ε ≈ 20–25, Hf–O 2,05–2,23 Å', 660, 60), atom('i_tin', 'TiN: NaCl, a = 4,241 Å', 660, 200), atom('i_si', SI_INFO, 660, 340),
  ],
  wires: [],
});
def('sio2_gate_lattice', 8, {
  name: 'Atomy: křemík a oxid hradla SiO₂',
  subtitle: 'Krystal Si a amorfní SiO₂ (tetraedry SiO₄, Si–O 1,61 Å). Pro výkonové MOSFETy a čipy s neuvedeným procesem – tloušťka oxidu konkrétního tranzistoru neověřena.',
  scene: 'lattice',
  stack: [{ name: 'Si (krystal)', kind: 'si', thick: 10.9 }, { name: 'SiO₂ amorfní (výřez)', kind: 'sio2', thick: 12 }],
  components: [atom('el_si', 'Si – KRYSTAL A OXID', 60, 120, 'atom_si'), atom('el_o', 'O – OXID', 60, 300, 'atom_o'), atom('i_si', SI_INFO, 400, 120), atom('i_o', 'SiO₂: Si–O 1,61 Å, Eg ≈ 9 eV', 400, 300)],
  wires: [],
});
def('cu_lattice', 8, {
  name: 'Měď – krystal vodičů, kontaktů a vinutí',
  subtitle: 'Konektory, kabely, cesty plošného spoje, vinutí cívek, trafa a relé vedou proud mědí: kubická plošně centrovaná mřížka, a = 3,615 Å (Cu–Cu 2,556 Å). Každý atom dá do „elektronového plynu“ jeden elektron 4s – proto měď vede (rezistivita 1,68 µΩ·cm při 20 °C). Kontakty bývají pozlacené, vinutí lakované – tady jen samotná měď.',
  scene: 'lattice',
  stack: [{ name: 'Cu (FCC, a = 3,615 Å)', kind: 'cu', thick: 14.5 }],
  components: [atom('el_cu', 'Cu – ATOMY MŘÍŽKY', 60, 120, 'atom_cu'), atom('i_cu', 'ρ = 1,68 µΩ·cm · 1 VOLNÝ e⁻ NA ATOM', 400, 120), atom('i_fcc', 'FCC: a = 3,615 Å, Cu–Cu 2,556 Å', 400, 300)],
  wires: [],
});

def('ono_lattice', 8, {
  name: 'Atomy buňky V-NAND: poly-Si / SiO₂ / SiN / SiO₂',
  subtitle: 'Kanál z polykrystalického Si, tunelový oxid, zachycovací Si₃N₄ (elektrony uvíznou v pastech dusíkové vrstvy a nevodivostí se nerozutečou) a blokovací oxid (SiO₂ + Al₂O₃). Tloušťky pro Samsung V5/V6 nejsou veřejné; publikovaný příklad stohu: tunelový oxid ~4,5 nm, nitrid ~5,5 nm, blokovací oxid ~7 nm. Výřez je kreslený tenčí, než je skutečnost.',
  scene: 'lattice',
  stack: [{ name: 'poly-Si kanál (výřez)', kind: 'si', thick: 10.9 }, { name: 'tunelový SiO₂ (výřez; reálně ~4–5 nm)', kind: 'sio2', thick: 8 }, { name: 'zachycovací SiN (výřez; ~5–6 nm)', kind: 'sinx', thick: 10 }, { name: 'blokovací oxid (výřez; ~7 nm)', kind: 'sio2', thick: 8 }],
  components: [atom('el_si', 'Si – KANÁL A OXIDY', 60, 60, 'atom_si'), atom('el_o', 'O – OXIDY', 60, 200, 'atom_o'), atom('el_n', 'N – ZACHYCOVACÍ SiN', 60, 340, 'atom_n'), atom('i_trap', 'PASTI V SiN DRŽÍ ELEKTRONY ROKY', 400, 200)],
  wires: [],
});

def('asi_sinx_lattice', 8, {
  name: 'Atomy TFT: a-Si:H a SiNₓ',
  subtitle: 'Amorfní křemík bez dlouhého uspořádání; vodík (typicky ~10 at. %) zakončuje volné vazby Si. Izolant hradla SiNₓ (Si–N ~1,74 Å). Hodnoty typické pro a-Si TFT, pro panel VA249HE neověřeny.',
  scene: 'lattice',
  stack: [{ name: 'SiNₓ izolant (výřez)', kind: 'sinx', thick: 12 }, { name: 'a-Si:H kanál (výřez)', kind: 'asi', thick: 12 }],
  components: [atom('el_si', 'Si – a-Si:H A SiNₓ', 60, 60, 'atom_si'), atom('el_n', 'N – SiNₓ', 60, 200, 'atom_n'), atom('el_h', 'H – PASIVACE VAZEB', 60, 340, 'atom_h'), atom('i_asi', 'a-Si:H: BEZ KRYSTALU, Eg ≈ 1,7 eV', 400, 200)],
  wires: [],
});
