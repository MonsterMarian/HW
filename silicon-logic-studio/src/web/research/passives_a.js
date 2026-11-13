// Rešerše – viz index.js (schéma dat). Pasivní a drobné součástky z extra/passives_a.js
// (Edge 3D 2120, PRIME B360-PLUS, Dual RTX 3060 Ti, HyperX Fury, 970 EVO Plus, Vero L5).
// Řetězce dodávek jsou obecné pro typ dílu ('estimate'); 'doc' jen tam, kde zdroj mluví přímo o díle / desce.
const C = '2026-11-13';
const E = 'estimate';
const D = 'doc';
const W = (p) => `https://en.wikipedia.org/wiki/${p}`;

// Zdroje (všechny otevřené nebo viděné ve výsledcích vyhledávání při rešerši).
const S = {
  photo: 'https://www.vgamuseum.info/images/palcal/diamond/588_diamond_edge_3d_2120_top_hq.jpg',
  vgam: 'https://www.vgamuseum.info/index.php/cpu/item/542-diamond-edge-3d-2120xl-nvidia-nv1',
  manual: 'https://dlcdnets.asus.com/pub/ASUS/mb/LGA1151/PRIME_B360-PLUS/G13832_PRIME_B360-PLUS_UM_WEB.PDF',
  gpuTs: 'https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx3060ti-o8gd6x/techspec/',
  gpuHk: 'https://www.asus.com/hk/motherboards-components/graphics-cards/dual/dual-rtx3060ti-o8g/',
  gpuNews: 'https://www.funkykit.com/news/asus-unveils-tuf-gaming-and-dual-geforce-rtx-3060-ti-with-gddr6x-memory/',
  tpuStrix: 'https://techpowerup.com/review/asus-geforce-rtx-3060-ti-strix-oc/3.html',
  tpu4060: 'https://techpowerup.com/review/asus-geforce-rtx-4060-ti-dual-oc/single-page.html',
  kingston: 'https://www.kingston.com/dataSheets/HX426C16FB2K2_16.pdf',
  samsung: 'https://image-us.samsung.com/SamsungUS/samsungbusiness/pdfs/SSD-970EVOPLUSDSHT-JUN19T-Final-6-27-19.pdf',
  cdr: 'https://cdrlabs.com/reviews/samsung-970-evo-plus-250gb-m2-nvme-pcie-solid-state-drive/box-contents-and-physical-features.html',
  endorfy: 'https://endorfy.com/en/product/vero-l5-bronze-600w/',
  arvuti: 'https://arvutitark.ee/arvutikomponendid/toiteplokid-psu/psu-endorfy-vero-l5-bronze-600-w-1248487',
  mlcc2018: 'https://iconnect007.com/article/113012/electronic-components-market-update/113015/ein',
  drmos: 'https://www.allaboutcircuits.com/news/what-is-drmos-ic-powering-next-gen-processors/',
  lf353: 'https://www.ti.com/product/LF353',
  lf347: 'https://www.ti.com/product/LF347',
  cer: W('Ceramic_capacitor'),
  tant: W('Tantalum_capacitor'),
  coltan: W('Coltan'),
  elyt: W('Aluminum_electrolytic_capacitor'),
  plague: W('Capacitor_plague'),
  poly: W('Polymer_capacitor'),
  ferrite: W('Ferrite_(magnet)'),
  bead: W('Ferrite_bead'),
  res: W('Resistor'),
  xtal: W('Crystal_oscillator'),
  cell: W('Button_cell'),
  li: W('Lithium'),
  lga: W('LGA_1151'),
  atx: W('ATX'),
  pcie: W('PCI_Express'),
  dimm: W('DIMM'),
  sata: W('Serial_ATA'),
  m2: W('M.2'),
  hs: W('Heat_sink'),
  fan: W('Computer_fan'),
  vrm: W('Voltage_regulator_module'),
  bauxite: W('Bauxite'),
  si: W('Silicon'),
  flash: W('Flash_memory'),
};

// Místa (souřadnice přibližné, na úroveň oblasti / města).
const P = {
  kivu: { name: 'Kivu, DR Kongo (coltan)', country: 'CD', lat: -1.68, lon: 29.22 },
  rwanda: { name: 'Rwanda (coltan)', country: 'RW', lat: -1.94, lon: 29.87 },
  greenbushes: { name: 'Greenbushes, Západní Austrálie (lithium)', country: 'AU', lat: -33.85, lon: 116.06 },
  atacama: { name: 'Salar de Atacama (lithium)', country: 'CL', lat: -23.5, lon: -68.25 },
  guinea: { name: 'Guinea (největší těžba bauxitu)', country: 'GN', lat: 10.94, lon: -14.29 },
  chinaSi: { name: 'Čína (asi 2/3 světového křemíku)', country: 'CN', lat: 35.0, lon: 103.0 },
  minas: { name: 'Minas Gerais (přírodní křemen)', country: 'BR', lat: -18.5, lon: -44.0 },
  murata: { name: 'Murata, Nagaokakyo', country: 'JP', lat: 34.926, lon: 135.696 },
  tdk: { name: 'TDK, Tokio', country: 'JP', lat: 35.68, lon: 139.77 },
  asus: { name: 'ASUS, Tchaj-pej (Beitou)', country: 'TW', lat: 25.13, lon: 121.5 },
  kingston: { name: 'Kingston, Fountain Valley', country: 'US', lat: 33.7, lon: -117.95 },
};

const n = (id, stage, name, to, src, fact, place) => ({ id, stage, name, ...(place ? { place } : {}), ...(to.length ? { to } : {}), src, fact });
const co = (name, role, country, src, fact = E) => ({ name, role, country, src, fact });
const tl = (date, text, src, fact = E) => ({ date, text, src, fact });
const bn = (title, text, src, fact = E) => ({ title, text, src, fact });
const hi = (year, title, text, src, fact = E) => ({ year, title, text, src, fact });

// Firmy
const K = {
  murata: co('Murata Manufacturing', 'výrobce MLCC', 'JP', S.mlcc2018),
  yageo: co('Yageo', 'výrobce MLCC a dalších pasivních dílů', 'TW', S.mlcc2018),
  tdk: co('TDK', 'MLCC a ferity (firma založena 1935 kvůli feritu)', 'JP', S.ferrite),
  kemet: co('KEMET', 'tantalové a polymerové kondenzátory', 'US', S.tant),
  avx: co('AVX', 'tantalové kondenzátory', 'US', S.tant),
  vishay: co('Vishay', 'tantalové kondenzátory', 'US', S.tant),
  panasonic: co('Panasonic', 'polymerové kondenzátory SP-Cap a OS-CON (od Sanyo)', 'JP', S.poly),
  rubycon: co('Rubycon', 'hliníkové elektrolyty, vodní elektrolyty s nízkým ESR', 'JP', S.elyt),
  cde: co('Cornell-Dubilier', 'první velkovýroba elektrolytů (1931)', 'US', S.elyt),
  teapo: co('Teapo Electronic', 'kondenzátory ve zdroji Vero L5 (podle Endorfy)', 'TW', S.endorfy, D),
  molex: co('Molex', 'konektory Mini-Fit Jr. (ATX 24 pin, EPS, PCIe 8 pin)', 'US', S.atx),
  lotes: co('Lotes', 'výrobce patic LGA1151', 'TW', S.lga),
  pcisig: co('PCI-SIG', 'správce norem PCI Express a M.2', 'US', S.pcie),
  aos: co('Alpha and Omega Semiconductor', 'DrMOS AOZ53xx (i AOZ5311NQI na Dual 4060 Ti)', 'US', S.drmos),
  infineon: co('Infineon Technologies', 'výkonové stupně DrMOS', 'DE', S.drmos),
  ti: co('Texas Instruments', 'DrMOS 95481R na Strix 3060 Ti', 'US', S.tpuStrix),
  mps: co('Monolithic Power Systems', 'řadič VRM MP2888A na Strix 3060 Ti', 'US', S.tpuStrix),
  upi: co('uPI Semiconductor', 'řadič uP9512R na ASUS Dual 4060 Ti', 'TW', S.tpu4060),
  intel: co('Intel', 'specifikace DrMOS 1.0 (2004)', 'US', S.drmos),
  asus: co('ASUS', 'návrh a osazení desky PRIME B360-PLUS', 'TW', S.manual, D),
  asusGpu: co('ASUS', 'návrh karty Dual RTX 3060 Ti, pájení Auto-Extreme', 'TW', S.gpuHk, D),
  diamond: co('Diamond Multimedia', 'výrobce karty Edge 3D', 'US', S.vgam, D),
  kingston: co('Kingston Technology', 'výrobce modulu HyperX Fury', 'US', S.kingston, D),
  samsung: co('Samsung Electronics', 'výrobce SSD 970 EVO Plus', 'KR', S.samsung, D),
  endorfy: co('Endorfy', 'značka zdroje Vero L5', 'PL', S.endorfy, D),
  toshiba: co('Toshiba', 'vynález flash paměti (Masuoka, 1980)', 'JP', S.flash),
  tiOp: co('Texas Instruments', 'výrobce LF353 / LF347 (stále aktivní)', 'US', S.lf353, D),
};

const R = (supply, companies, timeline, bottlenecks, history = [], market = null) =>
  ({ checked: C, supply, companies: companies.slice(0, 5), timeline: timeline.slice(0, 3), bottlenecks: bottlenecks.slice(0, 2), history: history.slice(0, 2), market });

// ── Šablony podle typu dílu (o.maker = jméno uzlu fáze 5, o.co = firmy navíc na začátek, o.tl = časová osa navíc) ──
const MLCC = (o = {}) => R([
  n('ore', 0, 'Baryt, titanová ruda a nikl (elektrody)', ['bt', 'paste'], S.cer, E),
  n('bt', 2, 'Prášek titaničitanu barnatého BaTiO3 (třída 2)', ['stack'], S.cer, E),
  n('paste', 2, 'Niklová pasta elektrod', ['stack'], S.cer, E),
  n('stack', 3, 'Lití keramických fólií, tisk elektrod, vrstvení a výpal', ['term'], S.cer, E, P.murata),
  n('term', 4, 'Koncovky Cu / Ni / Sn, páska na cívce', ['maker'], S.cer, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen (Murata, TDK, Yageo, KEMET…)', [], S.cer, E),
], [...(o.co ?? []), K.murata, K.tdk, K.yageo, K.kemet], [
  ...(o.tl ?? []),
  tl('1961', 'V USA uveden první vícevrstvý keramický kondenzátor (MLCC).', S.cer),
  tl('1993', 'TDK nahradil palladiové elektrody niklem – levná masová výroba.', S.cer),
  tl('2018-10', 'Výrobci MLCC na přídělovém systému, Murata ohlásil zdražení.', S.mlcc2018),
], [
  bn('Nedostatek MLCC 2018', 'Panasonic uváděl 99 týdnů dodání chybějících čipových kondenzátorů, KEMET přes 52 týdnů.', S.mlcc2018),
  bn('Palladium', 'Drahé palladium v elektrodách vedlo k přechodu na nikl a měď (cena Pd vrcholila 2000–2001).', S.cer),
], [hi(1980, 'Nástup SMD', 'MLCC v 80. letech táhly přechod z montáže do děr na povrchovou montáž.', S.cer)]);

const TANT = (o = {}) => R([
  n('kivu', 0, 'Coltan – DR Kongo', ['ref'], S.coltan, E, P.kivu),
  n('rw', 0, 'Coltan – Rwanda', ['ref'], S.coltan, E, P.rwanda),
  n('ref', 1, 'Rafinace na tantalový prášek (zrna 2–10 µm)', ['anode'], S.tant, E),
  n('anode', 3, 'Lisování a slinování anody, oxid Ta2O5, katoda MnO2', ['pkg'], S.tant, E),
  n('pkg', 4, 'Kapkový epoxidový obal nebo SMD pouzdro', ['maker'], S.tant, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen (KEMET, AVX, Vishay…)', [], S.tant, E),
], [...(o.co ?? []), K.kemet, K.avx, K.vishay], [
  ...(o.tl ?? []),
  tl('1952', 'Bell Labs: oxid manganičitý jako pevný elektrolyt.', S.tant),
  tl('2000', 'Cenový skok tantalu 2000–2001 urychlil niobové náhrady.', S.tant),
], [
  bn('Konfliktní minerál', 'Coltan z východu DR Konga financoval ozbrojené skupiny; Dodd-Frank (2010) zavedl povinné hlášení dodavatelů.', S.coltan),
  bn('Cena', 'Tantalové kondenzátory jsou výrazně dražší než hliníkové; cenové šoky 1980 a 2000 omezily jejich použití.', S.tant),
], [hi(1954, 'Komerční tantalový kondenzátor', 'Za vynálezce se považuje Preston Robinson ze Sprague Electric.', S.tant)],
{ category: 'Těžba tantalu podle zemí', year: 2013, shares: [{ name: 'Rwanda', pct: 25.4 }, { name: 'Brazílie', pct: 23.7 }, { name: 'DR Kongo', pct: 18.6 }, { name: 'Ostatní', pct: 32.3 }], src: S.coltan, fact: E });

const ELYT = (o = {}) => R([
  n('bx', 0, 'Bauxit', ['al'], S.bauxite, E, P.guinea),
  n('al', 1, 'Hliník čistoty 99,99 % (anodová fólie)', ['foil'], S.elyt, E),
  n('foil', 2, 'Leptaná Al fólie, papírový separátor, elektrolyt', ['wind'], S.elyt, E),
  n('wind', 3, 'Formování oxidu Al2O3, navinutí, impregnace', ['can'], S.elyt, E),
  n('can', 4, 'Hliníková plechovka, pryžová zátka (u SMD podložka)', ['maker'], S.elyt, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], o.makerSrc ?? S.elyt, o.makerFact ?? E),
], [...(o.co ?? []), K.rubycon, K.panasonic, K.cde], [
  ...(o.tl ?? []),
  tl('1925', 'Samuel Ruben patentoval suchý elektrolytický kondenzátor.', S.elyt),
  tl('2000', 'Kondenzátorový mor 2000–2005: vadný elektrolyt v deskách a zdrojích.', S.plague),
], [
  bn('Kondenzátorový mor', 'Špatně okopírovaný elektrolyt (údajně ukradený Rubyconu) vedl k nafouklým kondenzátorům; Dell to 2005 stálo asi 420 mil. USD.', S.plague),
  bn('Vysychání', 'Kapalný elektrolyt stárne s teplotou, proto výrobci uvádějí třídu 105 °C.', S.elyt),
], [hi(1931, 'Velkovýroba', 'Cornell-Dubilier zahájil v Plainfieldu velkovýrobu elektrolytů.', S.elyt)]);

const POLY = (o = {}) => R([
  n('bx', 0, 'Bauxit', ['al'], S.bauxite, E, P.guinea),
  n('al', 1, 'Hliník (leptaná anodová fólie)', ['mat'], S.poly, E),
  n('mono', 2, 'Monomer EDOT / pyrrol', ['mat'], S.poly, E),
  n('mat', 3, 'Polymerace PEDOT / PPy v pórech, grafit + stříbro', ['pkg'], S.poly, E),
  n('pkg', 4, 'Plechovka nebo lisované SMD pouzdro', ['maker'], S.poly, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], o.makerSrc ?? S.poly, o.makerFact ?? E),
], [...(o.co ?? []), K.panasonic, K.kemet], [
  ...(o.tl ?? []),
  tl('1983', 'Sanyo OS-CON – první Al kondenzátor s pevným organickým elektrolytem.', S.poly),
  tl('1991', 'Panasonic uvedl polymerové SP-Cap.', S.poly),
  tl('2001', 'KEMET uvedl Al kondenzátory s PEDOT.', S.poly),
], [
  bn('Pájení bez olova', 'Starší polypyrrol nesnášel teploty bezolovnatého pájení; PEDOT vydrží asi 280 °C.', S.poly),
], [hi(1995, 'OS-CON v PC', 'Kolem 1995 byl OS-CON preferovaný blokovací kondenzátor PC s Pentiem.', S.poly)]);

const FERRITE = (o = {}) => R([
  n('fe', 0, 'Železná ruda (oxid železa)', ['powder'], S.ferrite, E),
  n('mz', 0, 'Mangan a zinek, nebo nikl a zinek', ['powder'], S.ferrite, E),
  n('powder', 2, 'Feritový prášek MnZn / NiZn', ['core'], S.ferrite, E),
  n('core', 3, 'Lisování a slinování jádra', ['wind'], S.ferrite, E, P.tdk),
  n('wind', 4, 'Navinutí měděného drátu, pouzdro', ['maker'], S.ferrite, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], S.ferrite, E),
], [...(o.co ?? []), K.tdk], [
  ...(o.tl ?? []),
  tl('1930', 'Kato a Takei (Tokyo Institute of Technology) syntetizovali první ferity.', S.ferrite),
  tl('1935', 'Založen TDK pro výrobu feritu.', S.ferrite),
], [
  bn('Malé', 'Ferity jsou hlavně z oxidu železa, a proto levné; omezuje spíš volba materiálu pro danou frekvenci (MnZn do ~5 MHz, NiZn výš).', S.ferrite),
]);

const RES = (o = {}) => R([
  n('ru', 0, 'Ruthenium a další kovy pro odporovou vrstvu', ['paste'], S.res, E),
  n('paste', 2, 'Pasta RuO2 / bismut-ruthenát se sklem', ['print'], S.res, E),
  n('print', 3, 'Sítotisk na keramiku, výpal ~850 °C, laserové dostavení', ['term'], S.res, E),
  n('term', 4, 'Koncovky, páska na cívce (u sítí pouzdro SIP / SMD)', ['maker'], S.res, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen (Yageo…)', [], S.res, E),
], [...(o.co ?? []), K.yageo], [
  ...(o.tl ?? []),
  tl('1970', 'Tlustovrstvé rezistory se v 70. letech prosadily; dnes je takových většina SMD.', S.res),
], [
  bn('Nedostatek 2018', 'Při nedostatku pasivních dílů 2018 zdražovali i výrobci rezistorů a MLCC (Yageo, TDK, AVX, KEMET).', S.mlcc2018),
]);

const XTAL = (o = {}) => R([
  n('q', 0, 'Přírodní křemen (dříve hlavně z Brazílie)', ['synth'], S.xtal, E, P.minas),
  n('synth', 2, 'Syntetický křemen z hydrotermálních autoklávů', ['blank'], S.xtal, E),
  n('blank', 3, o.cut ?? 'Řezání výbrusu AT, napaření elektrod', ['pkg'], S.xtal, E),
  n('pkg', 4, 'Hermetické SMD pouzdro', ['maker'], S.xtal, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], S.xtal, E),
], o.co ?? [K.asus], [
  tl('1921', 'Walter Cady postavil první krystalový oscilátor.', S.xtal),
  tl('1950', 'Bell Labs zvládly průmyslový hydrotermální růst křemene.', S.xtal),
], [
  bn('Žádné', 'Krystaly se vyrábějí ve velkém (kolem 2 miliard ročně už v roce 2003).', S.xtal),
], [hi(1928, 'Křemenné hodiny', 'Warren Marrison (Bell Labs) postavil první křemenné hodiny.', S.xtal)]);

const BATT = (o = {}) => R([
  n('li1', 0, 'Lithium – Austrálie', ['anode'], S.li, E, P.greenbushes),
  n('li2', 0, 'Lithium – Chile', ['anode'], S.li, E, P.atacama),
  n('anode', 2, 'Lithiová fólie (anoda)', ['cell'], S.cell, E),
  n('mno2', 2, 'Oxid manganičitý MnO2 (katoda)', ['cell'], S.cell, E),
  n('cell', 4, 'Sestavení článku s organickým elektrolytem do pouzdra 20 × 3,2 mm', ['maker'], S.cell, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], S.cell, E),
], [...(o.co ?? [])], [], [
  bn('Lithium pro baterie', 'Baterie spotřebují přes tři čtvrtiny lithia; knoflíkový článek je ale zanedbatelný odběr.', S.li),
]);

const CONN = (o = {}) => R([
  n('cu', 0, 'Měď (slitiny pro kontakty)', ['strip'], o.src ?? S.atx, E),
  n('au', 0, 'Zlato / cín pro pokovení', ['plate'], o.src ?? S.atx, E),
  n('strip', 2, 'Pásy slitiny Cu, plast (LCP / PBT / nylon)', ['plate'], o.src ?? S.atx, E),
  n('plate', 3, 'Lisování kontaktů, galvanické pokovení, vstřikování těla', ['asm'], o.src ?? S.atx, E),
  n('asm', 4, 'Osazení kontaktů do těla, zalisování / pájení na DPS', ['maker'], o.src ?? S.atx, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], o.makerSrc ?? o.src ?? S.atx, o.makerFact ?? E),
], [...(o.co ?? [])], [...(o.tl ?? [])], [
  ...(o.bn ?? []),
  bn('Malé', 'Konektory určuje norma a vyrábí je mnoho firem; riziko je spíš kvalita kontaktů a pokovení.', o.src ?? S.atx),
], o.hi ?? []);

const EDGE = (o = {}) => R([
  n('cu', 0, 'Měď (fólie DPS)', ['lam'], o.src, E),
  n('au', 0, 'Zlato (pokovení kontaktů)', ['pcb'], o.src, E),
  n('lam', 2, 'Laminát FR-4 s měděnou fólií', ['pcb'], o.src, E),
  n('pcb', 3, 'Výroba DPS, zlacení kontaktní hrany', ['maker'], o.src, E),
  n('maker', 5, o.maker, [], o.makerSrc, D, o.place),
], [...o.co], [...(o.tl ?? [])], [
  bn('Opotřebení', 'Zlacení kontaktů snese omezený počet zasunutí; norma určuje tvar a klíč.', o.src),
]);

const HS = (o = {}) => R([
  n('bx', 0, 'Bauxit', ['al'], S.bauxite, E, P.guinea),
  ...(o.cu ? [n('cu', 0, 'Měď (heatpipe, základna)', ['shape'], S.hs, E)] : []),
  n('al', 1, 'Hliník (elektrolýza z oxidu hlinitého)', ['alloy'], S.hs, E),
  n('alloy', 2, 'Slitiny 6060 / 6061 / 6063 nebo plech', ['shape'], S.hs, E),
  n('shape', 3, o.process ?? 'Protlačování, odlévání nebo frézování lamel', ['maker'], S.hs, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], o.makerSrc ?? S.hs, o.makerFact ?? E),
], [...(o.co ?? [])], [], [
  bn('Měď vs. hliník', 'Měď vede teplo asi dvakrát lépe, ale je těžší a dražší; proto většinou hliník a měď jen v heatpipe / základně.', S.hs),
]);

const FAN = (o = {}) => R([
  n('oil', 0, 'Ropa (plasty)', ['plast'], S.fan, E),
  n('cu', 0, 'Měď a magnetický materiál', ['motor'], S.fan, E),
  n('plast', 2, 'Plast pro lopatky a rám', ['asm'], S.fan, E),
  n('motor', 3, 'Vinutý stator, rotor s magnetem, ložisko', ['asm'], S.fan, E),
  n('asm', 4, 'Montáž rotoru, rámu a kabelu', ['maker'], S.fan, E),
  n('maker', 5, o.maker, [], o.makerSrc, o.makerFact ?? D),
], [...o.co], [tl('2005', 'Intel vydal specifikaci 4vodičových PWM ventilátorů.', S.fan)], [
  bn('Ložiska', 'Kluzná ložiska se opotřebí při vysoké teplotě; FDB a kuličková vydrží déle, ale jsou dražší.', S.fan),
]);

const SEMI = (o = {}) => R([
  n('q', 0, 'Křemen', ['si'], S.si, E, P.chinaSi),
  n('si', 1, 'Křemík polovodičové čistoty (Siemens, Czochralski)', ['wafer'], S.si, E),
  n('wafer', 3, o.wafer ?? 'Wafer výkonových MOSFETů', ['pkg'], o.src ?? S.drmos, E),
  n('pkg', 4, o.pkg ?? 'Pouzdro QFN (DrMOS 5 × 5 mm)', ['maker'], o.src ?? S.drmos, E),
  n('maker', 5, o.maker ?? 'Výrobce neověřen', [], o.makerSrc ?? o.src ?? S.drmos, o.makerFact ?? E),
], [...(o.co ?? [])], [...(o.tl ?? [])], o.bn ?? [
  bn('Hustota výkonu', 'Požadavky na DrMOS vzrostly z pod 25 A na přes 50 A a plocha klesla z 64 na asi 25 mm².', S.drmos),
], o.hi ?? []);

const DRMOS_TL = [tl('2004', 'Intel vydal specifikaci DrMOS 1.0 (budič + dva MOSFETy v jednom pouzdře).', S.drmos)];
const CONN_B360 = { src: S.manual, maker: 'ASUS (osazení), výrobce konektoru neověřen', makerSrc: S.manual, makerFact: D };
const ATX_TL = [tl('1995-07', 'Intel představil ATX 1.0.', S.atx), tl('2003-02', 'ATX12V 2.0 rozšířil hlavní konektor na 24 pinů.', S.atx)];
const PCIE_TL = [tl('2003', 'Vznik PCI Express (PCI-SIG).', S.pcie), tl('2010', 'PCI Express 3.0.', S.pcie)];

export default {
  // ── Edge 3D 2120 ──
  pas_e3d_elyt: ELYT({ maker: 'Výrobce neznámý (SMD elektrolyty na fotce)', makerSrc: S.photo, makerFact: D, co: [K.diamond] }),
  pas_e3d_tant: TANT({ maker: 'Výrobce neznámý (žluté kapky na fotce)', co: [K.diamond] }),
  pas_e3d_mlcc: MLCC({ co: [K.diamond] }),
  pas_e3d_res: RES({ co: [K.diamond] }),
  pas_e3d_rnet: RES({ maker: 'Výrobce neznámý (RP6–RP12 na fotce)', co: [K.diamond] }),
  pas_e3d_ferrite: FERRITE({ co: [K.diamond] }),
  pas_e3d_sojsock: CONN({ src: S.photo, maker: 'Výrobce patice neznámý (U23, U24 na fotce)', makerFact: D, co: [K.diamond] }),
  pas_e3d_opamp: SEMI({ src: S.lf353, wafer: 'Wafer bipolární technologie s JFET vstupy', pkg: 'Pouzdro SOIC-8 (LF353) / SOIC-14 (LF347)', maker: 'LF353 / LF347 (výrobce kusu na kartě nečitelný)', makerSrc: S.photo, makerFact: D,
    co: [K.tiOp, K.diamond], bn: [bn('Žádné', 'Oba typy TI stále vyrábí; k LF347 nabízí novější náhrady TL074H / TL084H.', S.lf347, D)] }),
  pas_e3d_cdin: CONN({ src: S.photo, maker: 'Výrobce lišty neznámý (J4 na fotce)', makerFact: D, co: [K.diamond] }),

  // ── PRIME B360-PLUS ──
  pas_b360_lga: CONN({ ...CONN_B360, co: [K.lotes, K.asus], tl: [tl('2015-09-01', 'Uvedena patice LGA1151 (1151 kontaktů, ZIF).', S.lga)] }),
  pas_b360_dimm: CONN({ ...CONN_B360, co: [K.asus] }),
  pas_b360_pcie: CONN({ ...CONN_B360, co: [K.pcisig, K.asus], tl: PCIE_TL }),
  pas_b360_pci: CONN({ ...CONN_B360, co: [K.asus] }),
  pas_b360_m2: CONN({ ...CONN_B360, co: [K.pcisig, K.asus], tl: [tl('2013-11-01', 'Uveden formát M.2 (dříve NGFF).', S.m2)] }),
  pas_b360_atx24: CONN({ ...CONN_B360, co: [K.molex, K.asus], tl: ATX_TL }),
  pas_b360_eps: CONN({ ...CONN_B360, co: [K.molex, K.asus], tl: [tl('2003', '8pin +12 V pochází ze specifikace EPS12V skupiny SSI.', S.atx)] }),
  pas_b360_sata: CONN({ ...CONN_B360, co: [K.asus], tl: [tl('2003-01', 'SATA revize 1.0.', S.sata), tl('2009-05-27', 'SATA 3.0 (6 Gb/s).', S.sata)] }),
  pas_b360_usbhdr: CONN({ ...CONN_B360, co: [K.asus] }),
  pas_b360_fanhdr: CONN({ ...CONN_B360, co: [K.asus], tl: [tl('2005', 'Intel specifikace 4vodičových PWM ventilátorů.', S.fan)] }),
  pas_b360_hdr: CONN({ ...CONN_B360, co: [K.asus] }),
  pas_b360_io: CONN({ ...CONN_B360, co: [K.asus] }),
  pas_b360_bat: BATT({ co: [K.asus] }),
  pas_b360_x24: XTAL({ co: [K.asus] }),
  pas_b360_x32k: XTAL({ cut: 'Ladičková vidlička 32,768 kHz (řez XY)', co: [K.asus] }),
  pas_b360_hs: HS({ maker: 'ASUS (chladiče PCH a MOS podle manuálu)', makerSrc: S.manual, makerFact: D, co: [K.asus] }),
  pas_b360_choke: FERRITE({ co: [K.asus] }),
  pas_b360_mos: SEMI({ co: [K.aos, K.infineon, K.intel, K.asus], tl: DRMOS_TL }),
  pas_b360_poly: POLY({ co: [K.asus] }),
  pas_b360_audiocap: ELYT({ maker: 'Japonský výrobce (podle manuálu), konkrétní neověřen', makerSrc: S.manual, makerFact: D, co: [K.asus] }),
  pas_b360_mlcc: MLCC({ co: [K.asus] }),
  pas_b360_res: RES({ co: [K.asus] }),

  // ── Dual RTX 3060 Ti ──
  pas_3060_8pin: CONN({ src: S.gpuTs, maker: 'ASUS (osazení), výrobce konektoru neověřen', makerFact: D, co: [K.molex, K.asusGpu], tl: ATX_TL }),
  pas_3060_out: CONN({ src: S.gpuTs, maker: 'ASUS (osazení), výrobce konektorů neověřen', makerFact: D, co: [K.asusGpu] }),
  pas_3060_fan: FAN({ maker: 'ASUS (Axial-tech, 2 kusy)', makerSrc: S.gpuHk, co: [K.asusGpu] }),
  pas_3060_cooler: HS({ cu: true, process: 'Lamely, měděné heatpipe, lisovaný Al backplate', maker: 'ASUS (chladič a hliníkový backplate)', makerSrc: S.gpuNews, makerFact: D, co: [K.asusGpu] }),
  pas_3060_pads: R([
    n('si', 0, 'Křemík (silikonové polymery)', ['mat'], S.si, E, P.chinaSi),
    n('mat', 2, 'Silikonový elastomer s keramickým plnivem', ['cut'], S.hs, E),
    n('cut', 3, 'Lití desek, řezání na rozměr', ['maker'], S.hs, E),
    n('maker', 5, 'Výrobce neověřen (montáž ASUS)', [], S.gpuHk, E),
  ], [K.asusGpu], [], [bn('Stárnutí', 'Pady vyplňují mezery, kde by byl vzduch; časem tvrdnou a chlazení pamětí se zhorší.', S.hs)]),
  pas_3060_drmos: SEMI({ co: [K.ti, K.aos, K.upi, K.mps, K.asusGpu], tl: DRMOS_TL }),
  pas_3060_choke: FERRITE({ co: [K.asusGpu] }),
  pas_3060_poly: POLY({ co: [K.asusGpu] }),
  pas_3060_mlcc: MLCC({ co: [K.asusGpu] }),
  pas_3060_res: RES({ co: [K.asusGpu] }),
  pas_3060_xtal: XTAL({ co: [K.asusGpu] }),
  pas_3060_vbios: SEMI({ src: S.flash, wafer: 'Wafer NOR flash', pkg: 'Malé pouzdro (typicky SOIC-8 / WSON)', maker: 'Výrobce neověřen', co: [K.toshiba, K.asusGpu],
    tl: [tl('1984', 'Fujio Masuoka (Toshiba) představil NOR flash.', S.flash), tl('1988', 'Intel uvedl první komerční NOR flash.', S.flash)],
    bn: [bn('Malé', 'NOR flash na firmware vyrábí řada firem; čip je levný a malý.', S.flash)] }),

  // ── HyperX Fury ──
  pas_fury_hs: HS({ process: 'Lisování a lakování plechu', maker: 'Kingston (heat spreader HyperX Fury)', makerSrc: S.kingston, makerFact: D, co: [K.kingston] }),
  pas_fury_edge: EDGE({ src: S.dimm, maker: 'Kingston (modul 288 pinů)', makerSrc: S.kingston, place: P.kingston, co: [K.kingston] }),
  pas_fury_mlcc: MLCC({ co: [K.kingston] }),
  pas_fury_res: RES({ co: [K.kingston] }),

  // ── 970 EVO Plus ──
  pas_evo_label: R([
    n('cu', 0, 'Měď', ['film'], S.samsung, E),
    n('film', 2, 'Tenká měděná fólie ve štítku', ['lab'], S.samsung, D),
    n('lab', 4, 'Laminace štítku, nalepení na SSD', ['maker'], S.samsung, E),
    n('maker', 5, 'Samsung (štítek s měděnou vrstvou)', [], S.samsung, D),
  ], [K.samsung], [], [bn('Malé', 'Štítek jen rozvádí teplo po desce; při dlouhém zápisu SSD stejně škrtí výkon (Dynamic Thermal Guard).', S.samsung, D)]),
  pas_evo_edge: EDGE({ src: S.m2, maker: 'Samsung (M.2 2280)', makerSrc: S.samsung, co: [K.samsung, K.pcisig], tl: [tl('2013-11-01', 'Uveden formát M.2.', S.m2)] }),
  pas_evo_pmic: SEMI({ src: S.vrm, wafer: 'Wafer analogového / výkonového čipu', pkg: 'Malé pouzdro BGA / QFN', maker: 'Výrobce PMIC neověřen', co: [K.samsung],
    bn: [bn('Neověřeno', 'Typ PMIC na 970 EVO Plus není veřejně popsán; recenze uvádějí jen řadič, DRAM a NAND.', S.cdr)] }),
  pas_evo_ind: FERRITE({ co: [K.samsung] }),
  pas_evo_mlcc: MLCC({ co: [K.samsung] }),

  // ── Vero L5 ──
  pas_vero_bulk: ELYT({ maker: 'Teapo (podle Endorfy)', makerSrc: S.endorfy, makerFact: D, co: [K.teapo, K.endorfy] }),
  pas_vero_outcap: POLY({ maker: 'Teapo (podle Endorfy)', makerSrc: S.endorfy, makerFact: D, co: [K.teapo, K.endorfy] }),
  pas_vero_emi: FERRITE({ co: [K.endorfy] }),
  pas_vero_magn: FERRITE({ co: [K.endorfy] }),
  pas_vero_semi: SEMI({ src: S.vrm, wafer: 'Wafer výkonových MOSFETů a diod', pkg: 'Pouzdra TO-220 / TO-247 na chladiči', co: [K.endorfy], bn: [bn('Neověřeno', 'Platforma zdroje a typy polovodičů nejsou veřejně popsány (teardown neexistuje).', S.endorfy)] }),
  pas_vero_hs: HS({ co: [K.endorfy] }),
  pas_vero_fan: FAN({ maker: 'Endorfy Stratus 120 (FDB)', makerSrc: S.endorfy, co: [K.endorfy] }),
  pas_vero_cab: CONN({ src: S.arvuti, maker: 'Endorfy (pevná kabeláž)', makerSrc: S.arvuti, makerFact: D, co: [K.molex, K.endorfy], tl: ATX_TL }),
};
