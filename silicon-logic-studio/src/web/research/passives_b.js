// Rešerše – viz index.js (schéma dat). Pasivní a drobné součástky, dávka B (položky v ../extra/passives_b.js).
// Řetězce dodávek jsou obecné pro typ dílu (fact 'estimate'); 'doc' jen tam, kde zdroj mluví přímo o díle na téhle desce.
const C = '2026-11-13';

// Zdroje (otevřené nebo viděné ve výsledcích hledání 2026-11-13).
const U = {
  dell: 'https://pcserverandparts.com/content/Spec%20Sheets/Workstations/Dell/Dell%20Precision%205810/Dell%20Precision%20T5810%20Workstation%20Owner%27s%20Manual.pdf',
  dellXiamen: 'https://cdrinfo.com/d7/content/dell-formally-opens-new-factory-xiamen',
  hswDie: 'https://pcper.com/2014/09/intel-xeon-e5-2600-v3-processor-overview-haswell-ep-up-to-18-cores/',
  rtcNote: 'https://www.intel.cn/content/dam/www/public/us/en/documents/application-notes/ich-family-real-time-clock-accuracy-considerations-note.pdf',
  cr2032: 'https://energy.panasonic.com/dam/master/pdf/en/datasheet/lithium/CR2032_Datasheet_EN.pdf',
  p100: 'https://images.nvidia.com/content/tesla/pdf/NV-tesla-p100-pcie-PB-08248-001-v01.pdf',
  p100Ds: 'https://nvidia.com/content/dam/en-zz/Solutions/Data-Center/tesla-p100/pdf/nvidia-tesla-p100-PCIe-datasheet.pdf',
  k620: 'https://nvidia.cn/content/dam/en-zz/Solutions/design-visualization/documents/75509_DS_NV_Quadro_K620_US_NV_HR.pdf',
  k620vga: 'https://vgamuseum.info/index.php/f-naq/item/1206-nvidia-quadro-k620',
  gm107Tpu: 'https://www.techpowerup.com/review/palit-gtx-750-ti-kalmx/4.html',
  cat34: 'https://www.onsemi.com/pdf/datasheet/cat34ts04-d.pdf',
  tse2004: 'https://renesas.com/en/document/dst/tse2004gb2b0-datasheet',
  ds870: 'https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf',
  news870: 'https://news.samsung.com/us/storage-memory-sata-ssd-870-evo',
  kg870: 'https://www.kitguru.net/components/ssd-drives/simon-crisp/samsung-ssd-870-evo-1tb-review/2',
  at870: 'https://www.anandtech.com/show/16480',
  fake870: 'https://www.tweaktown.com/news/112624/fake-2tb-samsung-870-evo-ssds-are-floating-around-that-are-actually-120gb/index.html',
  gx750: 'https://www.cybenetics.com/evaluations/psus/2753/',
  gx650: 'https://www.noticias3d.com/articulo/3844/p2/seasonic-core-gx-atx-3-2024-650w-review-apuesta-economica-ultimos-estandares.html',
  gxSeries: 'https://guru3d.com/story/seasonic-unveils-core-gx-atx3-gold-modular-power-supplies-from-650w-to-850w',
  gxLdlc: 'https://ldlc.com/en/product/PB00657442.html',
  seaContact: 'https://www.seasonic.com/contact',
  hongHua: 'https://www.cybenetics.com/evaluations/fans/111/ch/',
  a2p: 'https://www.legitreviews.com/add2psu-daisy-chain-power-supply-adapter-review_1698',
  a2pPatent: 'https://patents.google.com/patent/US8878390',
  td404: 'https://www.moddiy.com/products/6699/12V-4-Pin-PC-Chassis-PWM-Fan-Hub-Speed-Controller-Powered-by-SATA.html',
  moddiyAbout: 'https://www.moddiy.com/pages/About-Us.html',
  // obecné k typům dílů
  murataMat: 'https://corporate.murata.com/technology/technology-platform/materials-technology/inorganic-materials',
  mlccIeee: 'https://ieeemilestones.ethw.org/w/images/9/9a/Proposal_of_MLCC%27.pdf',
  mlccShare: 'https://passive-components.eu/chinas-mlcc-makers-reach-10-market-share/?amp=1',
  usgsBa: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-barite.pdf',
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf',
  usgsSn: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tin.pdf',
  usgsTa: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tantalum.pdf',
  escondida: 'https://www.mining-technology.com/projects/escondida/',
  alIai: 'https://www.mysteel.net/news/5074920-iai-global-primary-al-output-reaches-73-million-t-in-2024-up-3-yoy',
  alChina: 'https://www-web.itiger.com/news/2529368739',
  kaimei: 'https://stockanalysis.com/quote/tpe/2375/company',
  spcap: 'https://industrial.panasonic.com/kr/products/pt/sp-cap',
  panaGpu: 'https://na.industrial.panasonic.com/whats-new/there-no-relation-between-panasonic-polymer-capacitors-and-graphics-card-failures',
  tdkFerrite: 'https://datasheets.globalspec.com/ds/TDK/ferrite-cores/5c9db132-a4c4-4770-8e43-5b0357732bb6',
  powerShare: 'https://www.all-about-industries.com/breakthrough-for-chinese-manufacturers-in-the-global-power-semiconductor-market-a-3df686f4dcf71215e29a2d0769120e6c/',
  sicShare: 'https://evertiq.com/news/55022',
  connTop: 'https://connectorsupplier.com/the-top-10-connector-companies-in-2023-regional-leaders/',
  connLead: 'https://connectorsupplier.com/top-10-in-world-sales-selecting-a-connector-vendor/',
  xtalMkt: 'https://gminsights.com/industry-analysis/crystal-oscillator-market/market-share',
  sibelco: 'https://sibelco.com/materials/high-purity-quartz',
  relays: 'https://resources.made-in-china.com/article/industry-view/FmLENVqCbxIP/China-Becomes-The-Key-Production-Base-of-Relays-in-The-World',
  deltaFans: 'https://landing.deltaww.com/en-US/products/0301/ALL/',
};

const P = {
  chinaBa: { name: 'Čína (těžba barytu, oblast přibližně)', country: 'CN', lat: 26.6, lon: 106.7 },
  chinaSi: { name: 'Čína (hutě křemíku)', country: 'CN', lat: 26.65, lon: 106.63 },
  chinaAl: { name: 'Čína (hutě hliníku, Šan-tung přibližně)', country: 'CN', lat: 36.6, lon: 117.0 },
  chinaSn: { name: 'Čína (Jün-nan, cín)', country: 'CN', lat: 23.36, lon: 103.15 },
  drc: { name: 'DR Kongo, východ (coltan, přibližně)', country: 'CD', lat: -2.5, lon: 28.8 },
  escondida: { name: 'Escondida, Antofagasta (měď)', country: 'CL', lat: -24.27, lon: -69.07 },
  sprucePine: { name: 'Spruce Pine (vysoce čistý křemen)', country: 'US', lat: 35.915, lon: -82.065 },
  murata: { name: 'Murata, Nagaokakjó (sídlo)', country: 'JP', lat: 34.93, lon: 135.70 },
  tdk: { name: 'TDK, Tokio (sídlo)', country: 'JP', lat: 35.68, lon: 139.77 },
  panasonic: { name: 'Panasonic, Kadoma (sídlo)', country: 'JP', lat: 34.74, lon: 135.59 },
  kaimei: { name: 'Kaimei (Teapo), Sin-pej Xizhi', country: 'TW', lat: 25.07, lon: 121.66 },
  infineon: { name: 'Infineon, Villach (výroba výkonových prvků)', country: 'AT', lat: 46.61, lon: 13.85 },
  xiamen: { name: 'Si-men (Xiamen)', country: 'CN', lat: 24.48, lon: 118.09 },
  shenzhen: { name: 'Šen-čen', country: 'CN', lat: 22.54, lon: 114.06 },
  dongguan: { name: 'Sea Sonic Dongguan (Shijie)', country: 'CN', lat: 23.11, lon: 113.81 },
  taipei: { name: 'Sea Sonic, Tchaj-pej', country: 'TW', lat: 25.08, lon: 121.58 },
  roundRock: { name: 'Dell, Round Rock (sídlo)', country: 'US', lat: 30.51, lon: -97.68 },
  santaClara: { name: 'NVIDIA, Santa Clara', country: 'US', lat: 37.37, lon: -121.96 },
  suwon: { name: 'Samsung Electronics, Suwon', country: 'KR', lat: 37.26, lon: 127.03 },
  hongKong: { name: 'Hongkong', country: 'HK', lat: 22.30, lon: 114.17 },
};

// Stavební kameny: 2 uzly (surovina → komponenta), komponenta vede do 'asm'. Všechno obecné → estimate.
const E = 'estimate';
const n = (id, stage, name, place, to, src, fact = E) => ({ id, stage, name, ...(place ? { place } : {}), ...(to ? { to } : {}), src, fact });
const mlcc = () => [
  n('ba', 0, 'Baryt – zdroj barya pro BaTiO3', P.chinaBa, ['mlcc'], U.usgsBa),
  n('mlcc', 3, 'MLCC: dielektrikum BaTiO3 + niklové elektrody (např. Murata)', P.murata, ['asm'], U.murataMat),
];
const elko = (name = 'Hliníkové elektrolytické kondenzátory (leptaná Al fólie)') => [
  n('al', 1, 'Primární hliník (Čína ~60 % světa)', P.chinaAl, ['elko'], U.alChina),
  n('elko', 3, name, P.kaimei, ['asm'], U.kaimei),
];
const poly = () => [
  n('ta', 0, 'Tantal (coltan) pro polymer-tantalové typy', P.drc, ['poly'], U.usgsTa),
  n('poly', 3, 'Polymerové kondenzátory s nízkým ESR (typ POSCAP / SP-Cap)', P.panasonic, ['asm'], U.spcap),
];
const mag = (name = 'Tlumivky: feritové jádro Mn-Zn + měděné vinutí') => [
  n('cu', 0, 'Měď pro vinutí', P.escondida, ['mag'], U.escondida),
  n('mag', 3, name, P.tdk, ['asm'], U.tdkFerrite),
];
const mos = (name = 'Výkonové MOSFETy (křemíkové wafery, pouzdření)') => [
  n('si', 1, 'Křemík polovodičové čistoty', P.chinaSi, ['mos'], U.usgsSi),
  n('mos', 3, name, P.infineon, ['asm'], U.powerShare),
];
const con = (name = 'Kontakty z měděné slitiny (pocínované / zlacené) v plastovém těle') => [
  n('cu', 0, 'Měď pro kontakty', P.escondida, ['con'], U.escondida),
  n('con', 3, name, null, ['asm'], U.connLead),
];
const hs = (name = 'Hliníkové žebrování (protlačování, lisování)') => [
  n('al', 1, 'Primární hliník (Čína ~60 % světa)', P.chinaAl, ['hs'], U.alChina),
  n('hs', 3, name, null, ['asm'], U.alIai),
];
const xtal = () => [
  n('q', 0, 'Křemen (vysoce čistý, pro syntetické krystaly)', P.sprucePine, ['xt'], U.sibelco),
  n('xt', 3, 'Křemenné rezonátory (Epson, NDK, TXC, KDS…)', null, ['asm'], U.xtalMkt),
];
const chip = (name, src) => [
  n('si', 1, 'Křemík polovodičové čistoty', P.chinaSi, ['ic'], U.usgsSi),
  n('ic', 3, name, null, ['asm'], src),
];
const asm = (name, src, place = null, fact = E) => n('asm', 4, name, place, ['fin'], src, fact);
const fin = (name, src, place = null, fact = 'doc') => n('fin', 5, name, place, null, src, fact);

// Opakované firmy, úzká hrdla a trhy.
const coMurata = { name: 'Murata Manufacturing', role: 'Největší výrobce MLCC (BaTiO3, Ni elektrody)', country: 'JP', src: U.mlccShare, fact: E };
const coSemco = { name: 'Samsung Electro-Mechanics', role: 'Druhý největší výrobce MLCC (24 % v 1. pol. 2024)', country: 'KR', src: U.mlccShare, fact: E };
const coPana = { name: 'Panasonic Industry', role: 'Polymerové kondenzátory POSCAP / SP-Cap pro napájení GPU a CPU', country: 'JP', src: U.spcap, fact: E };
const coTdk = { name: 'TDK', role: 'Feritová jádra Mn-Zn a Ni-Zn pro tlumivky a transformátory', country: 'JP', src: U.tdkFerrite, fact: E };
const coInf = { name: 'Infineon', role: 'Největší výrobce výkonových polovodičů (17,7 % v 2023 podle Omdia)', country: 'DE', src: U.powerShare, fact: E };
const coTe = { name: 'TE Connectivity', role: 'Největší výrobce konektorů (15,8 % světové poptávky)', country: 'CH', src: U.connLead, fact: E };
const coAmph = { name: 'Amphenol', role: 'Druhý největší výrobce konektorů (10,1 %)', country: 'US', src: U.connLead, fact: E };
const coMolex = { name: 'Molex', role: 'Třetí největší výrobce konektorů (8,0 %)', country: 'US', src: U.connLead, fact: E };
const coKaimei = { name: 'Kaimei Electronic (dříve Teapo)', role: 'Hliníkové elektrolytické a polymerové kondenzátory', country: 'TW', src: U.kaimei, fact: E };
const coDell = { name: 'Dell Technologies', role: 'Výrobce T5810; návrh desky a výběr dílů', country: 'US', src: U.dell, fact: 'doc' };
const coNv = { name: 'NVIDIA', role: 'Návrh karty a specifikace dílů na desce', country: 'US', src: U.p100, fact: 'doc' };
const coSea = { name: 'Sea Sonic Electronics', role: 'Výrobce zdroje, osazení v Dongguanu', country: 'TW', src: U.gx750, fact: 'doc' };

const bnMlccAi = { title: 'MLCC pro AI servery', text: 'Murata drží ~45 % a Samsung ~40 % MLCC pro AI servery; poptávka po serverech přetahuje kapacitu z běžných desek.', src: U.mlccShare, fact: E };
const bnAl = { title: 'Hliník soustředěný v Číně', text: 'Čína vyrábí kolem 60 % primárního hliníku (2024 celkem 72,76 Mt podle IAI); fólie i chladiče závisí na jejích hutích.', src: U.alChina, fact: E };
const bnCu = { title: 'Měď z několika dolů', text: 'Velkou část mědi dává Chile s dolem Escondida; výpadky dolů hýbou cenou vinutí i kontaktů.', src: U.escondida, fact: E };
const bnTa = { title: 'Tantal z konfliktních oblastí', text: 'Coltan se těží hlavně ve střední Africe (DR Kongo, Rwanda); dodávky tantalu jsou citlivé na konflikty.', src: U.usgsTa, fact: E };
const bnPower = { title: 'Nástup čínských výrobců', text: 'Čínští výrobci výkonových polovodičů rychle získávají podíl; Infineon vede s 17,7 % (Omdia 2023).', src: U.powerShare, fact: E };
const bnConn = { title: 'Koncentrace výrobců konektorů', text: 'Deset největších výrobců mělo v roce 2023 52,6 % světového trhu konektorů (Bishop & Associates).', src: U.connTop, fact: E };
const bnPolyGpu = { title: 'Spor o kondenzátory pod GPU', text: 'Panasonic veřejně odmítl, že by samotné polymerové kondenzátory byly hlavní příčinou pádů grafických karet.', src: U.panaGpu, fact: E };
const bnXtal = { title: 'Japonská koncentrace krystalů', text: 'Pět největších výrobců krystalů a oscilátorů drží přes 40 % trhu, většina z Japonska a Tchaj-wanu.', src: U.xtalMkt, fact: E };

const mkMlcc = {
  category: 'MLCC – podíl na trhu (Murata přes 40 %, SEMCO 1. pol. 2024, čínští výrobci 2. pol. 2024)', year: 2024,
  shares: [{ name: 'Murata', pct: 40 }, { name: 'Samsung Electro-Mechanics', pct: 24 }, { name: 'Čínští výrobci', pct: 10 }, { name: 'Ostatní (TDK, Yageo, Taiyo Yuden…; dopočet)', pct: 26 }],
  src: U.mlccShare, fact: E,
};
const mkConn = {
  category: 'Konektory – podíl 10 největších výrobců na světovém trhu, 2023 (Bishop & Associates)', year: 2023,
  shares: [{ name: 'Top 10 výrobců', pct: 52.6 }, { name: 'Ostatní', pct: 47.4 }], src: U.connTop, fact: E,
};
const mkPower = {
  category: 'Výkonové polovodiče (diskrétní + moduly) – Infineon, 2023 (Omdia)', year: 2023,
  shares: [{ name: 'Infineon', pct: 17.7 }, { name: 'Ostatní', pct: 82.3 }], src: U.powerShare, fact: E,
};
const mkSic = {
  category: 'SiC výkonové prvky – podíl na tržbách 2022 (TrendForce)', year: 2022,
  shares: [{ name: 'STMicroelectronics', pct: 36.5 }, { name: 'Infineon', pct: 17.9 }, { name: 'Wolfspeed', pct: 16.3 }, { name: 'onsemi', pct: 11.6 }, { name: 'ROHM', pct: 8.1 }, { name: 'Ostatní', pct: 9.6 }],
  src: U.sicShare, fact: E,
};
const mkAl = {
  category: 'Primární hliník – výroba 2024 (IAI, podíl Číny zaokrouhleně)', year: 2024,
  shares: [{ name: 'Čína', pct: 60 }, { name: 'Ostatní', pct: 40 }], src: U.alChina, fact: E,
};
const hMlccNi = { year: 1974, title: 'Niklové elektrody MLCC', text: 'Murata začala vyvíjet elektrody z obecných kovů; nikl později nahradil drahé palladium a zlevnil MLCC.', src: U.mlccIeee, fact: E };

// Malý konstruktor položky.
const R = (supply, companies, bottlenecks, extra = {}) => ({ checked: C, supply, companies, timeline: extra.timeline ?? [], bottlenecks, history: extra.history ?? [], market: extra.market ?? null });

const dellFin = (what) => fin(`Dell – Precision T5810: ${what}`, U.dell, P.roundRock);
const dellAsm = asm('Osazení desky a montáž stanice (Dell, mj. továrna Si-men)', U.dellXiamen, P.xiamen);
const tDell = { date: '2014', text: 'Precision Tower 5810 s paticí LGA 2011-3 a čipsetem C612 (generace Haswell-EP).', src: U.hswDie, fact: E };

export default {
  // ── Dell T5810 ──────────────────────────────────────────────────────────────────────────────────
  pas_t5810_socket: R([...con('Patice LGA: pružinové kontakty, zlacení, rámeček s pákou'), dellAsm, dellFin('patice LGA 2011-3')],
    [coDell, { name: 'Intel', role: 'Specifikace patice LGA 2011-3 pro Xeon E5 v3', country: 'US', src: U.hswDie, fact: E }],
    [{ title: 'Ohnuté kontakty', text: 'Manuál varuje, že poškození pinů při vyjímání CPU může poškodit procesor i desku.', src: U.dell, fact: 'doc' }],
    { timeline: [tDell] }),
  pas_t5810_dimm: R([...con('Sloty DIMM 288 pin (kontakty a západky)'), dellAsm, dellFin('8 slotů DIMM')],
    [coDell, coTe, coAmph], [{ title: 'Pořadí osazení', text: 'Manuál vyžaduje osazovat od prvního slotu; různé rychlosti modulů běží na nejpomalejší.', src: U.dell, fact: 'doc' }, bnConn],
    { market: mkConn }),
  pas_t5810_pcie: R([...con('Sloty PCIe x16 / x1 a PCI (164, 124 kontaktů)'), dellAsm, dellFin('6 rozšiřujících slotů')],
    [coDell, coTe, coAmph], [{ title: 'Jen dva sloty Gen3 x16', text: 'Plnou šíři PCIe 3.0 x16 mají jen sloty 2 a 4; dvě P100 tak obsadí oba.', src: U.dell, fact: 'doc' }],
    { timeline: [tDell], market: mkConn }),
  pas_t5810_sata: R([...con('Konektory SATA 7 pin'), dellAsm, dellFin('6× SATA')],
    [coDell, coMolex], [bnConn], { market: mkConn }),
  pas_t5810_pwr: R([...con('Napájecí konektory 24 pin a 10 pin (proprietární Dell)'), dellAsm, dellFin('napájecí konektory desky')],
    [coDell, coMolex], [{ title: 'Proprietární zapojení', text: 'Deska bere napájení 24 + 10 pin ze zdroje Dell; běžný ATX zdroj bez redukce nepasuje.', src: U.dell, fact: E }]),
  pas_t5810_hdr: R([...con('Lišty a konektory pro panel, USB, audio a ventilátory'), dellAsm, dellFin('vnitřní konektory')],
    [coDell, coMolex], [bnConn], { market: mkConn }),
  pas_t5810_rear: R([...con('Konektory RJ-45, DE-9, PS/2, USB a 3,5 mm jack'), dellAsm, dellFin('zadní I/O')],
    [coDell, coTe, coAmph], [bnConn], { market: mkConn }),
  pas_t5810_cr2032: R([
    n('li', 2, 'Lithium (anoda) a MnO2 (katoda)', null, ['cell'], U.cr2032),
    n('cell', 3, 'Článek CR2032 3 V, 225 mAh (např. Panasonic)', P.panasonic, ['asm'], U.cr2032),
    dellAsm, dellFin('baterie CR2032 v držáku')],
    [coDell, { name: 'Panasonic Energy', role: 'Typický výrobce článků CR2032 (Li/MnO2, 225 mAh)', country: 'JP', src: U.cr2032, fact: E }],
    [{ title: 'Vybitá baterie', text: 'Při chybě manuál radí reset CMOS vyjmutím knoflíkové baterie; vybitá baterie smaže nastavení BIOSu.', src: U.dell, fact: 'doc' }]),
  pas_t5810_hs: R([...hs('Chladič CPU (žebra, základna) a ventilátor'), asm('Montáž chladiče s ventilátorem (OEM pro Dell, neověřeno)', U.dell), dellFin('chladič CPU')],
    [coDell, { name: 'Delta Electronics', role: 'Typický dodavatel ventilátorů pro OEM stanice (neověřeno)', country: 'TW', src: U.deltaFans, fact: E }],
    [bnAl], { market: mkAl }),
  pas_t5810_fans: R([
    n('cu', 0, 'Měď pro vinutí motorků', P.escondida, ['fan'], U.escondida),
    n('fan', 3, 'Ventilátory s BLDC motorem (výrobce neověřen)', null, ['asm'], U.deltaFans),
    dellAsm, dellFin('sestava systémových ventilátorů')],
    [coDell, { name: 'Delta Electronics', role: 'Velký výrobce DC ventilátorů (dodavatel T5810 neověřen)', country: 'TW', src: U.deltaFans, fact: E }],
    [bnCu]),
  pas_t5810_vrm: R([...mos(), ...mag(), dellAsm, dellFin('VRM procesoru')],
    [coDell, coInf, coTdk], [bnPower, bnCu], { market: mkPower }),
  pas_t5810_caps: R([...mlcc(), ...poly(), dellAsm, dellFin('kondenzátory desky')],
    [coDell, coMurata, coSemco, coPana], [bnMlccAi, bnTa], { history: [hMlccNi], market: mkMlcc }),
  pas_t5810_xtal: R([...xtal(), dellAsm, dellFin('krystaly desky')],
    [coDell, { name: 'Intel', role: 'PCH s RTC vyžaduje krystal 32,768 kHz na RTCX1/RTCX2', country: 'US', src: U.rtcNote, fact: E }],
    [bnXtal, { title: 'Přesnost RTC', text: 'Intel uvádí, že přesnost hodin závisí na krystalu a zátěžových kondenzátorech kolem něj.', src: U.rtcNote, fact: E }]),

  // ── Tesla P100 ──────────────────────────────────────────────────────────────────────────────────
  pas_p100_hs: R([...hs('Pasivní chladič (žebra, základna s montážními otvory pro extender)'), asm('Montáž chladiče na kartu (OEM neuveden)', U.p100), fin('NVIDIA – Tesla P100 PCIe, pasivní chladič', U.p100, P.santaClara)],
    [coNv], [{ title: 'Nutný průtok vzduchu', text: 'Karta potřebuje vzduch hnaný skříní (minimální průtok v tabulce PB-08248); v běžné skříni se přehřeje.', src: U.p100, fact: 'doc' }, bnAl],
    { timeline: [{ date: '2016-10', text: 'Product brief PB-08248 v01 popisuje obousměrný pasivní chladič a dva extendery.', src: U.p100, fact: 'doc' }] }),
  pas_p100_eps: R([...con('Konektor CPU 8 pin (EPS 12 V)'), asm('Osazení desky karty (EMS neuvedeno)', U.p100), fin('NVIDIA – konektor napájení P100', U.p100, P.santaClara)],
    [coNv, coMolex], [{ title: 'Záměna CPU a PCIe 8 pin', text: 'Karta má CPU (EPS) 8 pin; přímé připojení PCIe 8 pin nejde, nutná redukce 030-0571-000.', src: U.p100, fact: 'doc' }],
    { timeline: [{ date: '2016-10', text: 'PB-08248: jeden 8pinový CPU konektor na východní hraně, 12 V ± 8 %.', src: U.p100, fact: 'doc' }] }),
  pas_p100_edge: R([...con('Zlacené kontakty hrany desky plošných spojů'), asm('Výroba DPS a osazení karty (neuvedeno)', U.p100), fin('NVIDIA – hrana PCIe 3.0 x16 P100', U.p100, P.santaClara)],
    [coNv], [{ title: 'Napájení i ze slotu', text: 'Část příkonu jde přes hranu (12 V a 3,3 V); slot musí unést svůj podíl z 250 W.', src: U.p100, fact: 'doc' }]),
  pas_p100_vbios: R([...chip('Sériová EEPROM / flash 4 Mbit (výrobce neověřen)', U.p100), asm('Osazení desky karty', U.p100), fin('NVIDIA – VBIOS P100 (UEFI)', U.p100, P.santaClara)],
    [coNv], [{ title: 'Neznámý čip', text: 'PB-08248 uvádí jen EEPROM 4 Mbit s podporou UEFI; výrobce ani pouzdro čipu NVIDIA neuvádí.', src: U.p100, fact: 'doc' }]),
  pas_p100_vrm: R([...mos('Power stage / MOSFETy vícefázového VRM'), ...mag('Tlumivky VRM (feritové jádro + měď)'), asm('Osazení desky karty', U.p100), fin('NVIDIA – VRM Tesla P100 (250 W)', U.p100, P.santaClara)],
    [coNv, coInf, coTdk], [bnPower, { title: 'Neveřejné rozložení', text: 'NVIDIA uvádí jen příkon 250 W a napájecí vstupy; počet fází není veřejný.', src: U.p100Ds, fact: E }],
    { market: mkPower }),
  pas_p100_caps: R([...mlcc(), ...poly(), asm('Osazení desky karty', U.p100), fin('NVIDIA – kondenzátory P100', U.p100, P.santaClara)],
    [coNv, coMurata, coSemco, coPana], [bnPolyGpu, bnMlccAi], { history: [hMlccNi], market: mkMlcc }),

  // ── Quadro K620 ────────────────────────────────────────────────────────────────────────────────
  pas_k620_fan: R([...hs('Chladič s ventilátorem (fansink), jednoslotový'), asm('Montáž chladiče (OEM neuveden)', U.k620), fin('NVIDIA / PNY – Quadro K620, aktivní chladič', U.k620, P.santaClara)],
    [{ name: 'NVIDIA', role: 'Návrh karty (Ultra-Quiet Active Fansink)', country: 'US', src: U.k620, fact: 'doc' }, { name: 'PNY', role: 'Prodejce referenční karty', country: 'US', src: U.k620vga, fact: 'doc' }],
    [{ title: 'Paměti bez chlazení', text: 'U GTX 750 Ti se stejným GM107 chladič nechladí paměťové čipy; u K620 neověřeno.', src: U.gm107Tpu, fact: E }, bnAl]),
  pas_k620_out: R([...con('Konektory DVI-I a DisplayPort'), asm('Osazení desky karty', U.k620), fin('NVIDIA – výstupy K620', U.k620, P.santaClara)],
    [{ name: 'NVIDIA', role: 'Specifikace výstupů DVI-I DL + DP 1.2', country: 'US', src: U.k620, fact: 'doc' }, coAmph],
    [{ title: 'Low-profile záslepka', text: 'Pro nízké skříně se mění záslepka; výstupy přes dodaný adaptér podle datasheetu.', src: U.k620, fact: 'doc' }], { market: mkConn }),
  pas_k620_edge: R([...con('Zlacené kontakty hrany desky plošných spojů'), asm('Výroba DPS a osazení karty', U.k620), fin('NVIDIA – hrana PCIe 2.0 x16 K620', U.k620, P.santaClara)],
    [{ name: 'NVIDIA', role: 'Karta napájená jen ze slotu (45 W)', country: 'US', src: U.k620vga, fact: 'doc' }],
    [{ title: 'Limit slotu', text: 'Bez přídavného konektoru je karta omezena napájením slotu; spotřeba 45 W.', src: U.k620vga, fact: 'doc' }]),
  pas_k620_vrm: R([...mos(), ...mag(), asm('Osazení desky karty', U.k620), fin('NVIDIA – VRM K620', U.k620, P.santaClara)],
    [{ name: 'NVIDIA', role: 'Návrh karty', country: 'US', src: U.k620, fact: 'doc' }, coInf, coTdk], [bnPower], { market: mkPower }),
  pas_k620_caps: R([...mlcc(), ...poly(), asm('Osazení desky karty', U.k620), fin('NVIDIA – kondenzátory K620', U.k620, P.santaClara)],
    [coMurata, coSemco, coPana], [bnMlccAi], { history: [hMlccNi], market: mkMlcc }),

  // ── RDIMM M393 ─────────────────────────────────────────────────────────────────────────────────
  pas_m393_spdts: R([...chip('SPD 4 kb + teplotní čidlo (JEDEC TSE2004av), pouzdro TDFN 2 × 3 mm', U.cat34), asm('Osazení modulu (Samsung)', U.cat34), fin('Samsung – SPD/TS na M393A1G40EB1', U.cat34, P.suwon, E)],
    [{ name: 'onsemi', role: 'CAT34TS04 / N34TS04 – SPD + TS pro DDR4 DIMM', country: 'US', src: U.cat34, fact: E }, { name: 'Renesas (dříve IDT)', role: 'TSE2004GB2B0 – SPD + TS, JEDEC JC42.4', country: 'JP', src: U.tse2004, fact: E }],
    [{ title: 'Ochrana zápisu SPD', text: 'Bloky SPD jde softwarově zamknout; poškozené SPD znemožní start modulu.', src: U.cat34, fact: E }],
    { timeline: [{ date: '2013-10', text: 'Datasheet CAT34TS04 rev. 6: 4 kb SPD + teploměr podle JEDEC TSE2004av pro DDR4.', src: U.cat34, fact: E }] }),
  pas_m393_edge: R([...con('Zlacená kontaktní hrana DPS modulu 288 pin'), asm('Výroba DPS a osazení modulu (Samsung)', U.dell), fin('Samsung – hrana RDIMM DDR4', U.dell, P.suwon, E)],
    [{ name: 'Samsung Electronics', role: 'Výrobce modulu M393A1G40EB1', country: 'KR', src: U.dell, fact: E }],
    [{ title: 'Opatrné vkládání', text: 'Manuál Dell varuje, že naklonění modulu při vkládání nebo vyjímání může DIMM poškodit.', src: U.dell, fact: 'doc' }]),
  pas_m393_caps: R([...mlcc(), asm('Osazení modulu (Samsung)', U.murataMat), fin('Samsung – pasivy RDIMM', U.murataMat, P.suwon, E)],
    [coMurata, coSemco], [bnMlccAi], { history: [hMlccNi], market: mkMlcc }),

  // ── Samsung 870 EVO ────────────────────────────────────────────────────────────────────────────
  pas_evo_sata: R([...con('Konektor SATA (data + napájení)'), asm('Osazení desky SSD (Samsung)', U.ds870), fin('Samsung – 870 EVO, konektor SATA', U.ds870, P.suwon)],
    [{ name: 'Samsung Electronics', role: 'Výrobce disku (SATA 6 Gb/s)', country: 'KR', src: U.ds870, fact: 'doc' }],
    [{ title: 'Strop SATA', text: 'Rozhraní SATA 6 Gb/s omezuje 870 EVO na ~560 MB/s bez ohledu na NAND.', src: U.ds870, fact: E }],
    { timeline: [{ date: '2021-01', text: 'Samsung uvádí 870 EVO s rozhraním SATA.', src: U.news870, fact: 'doc' }] }),
  pas_evo_case: R([...hs('Kovové pouzdro 2,5" a šrouby pentalobe'), asm('Kompletace disku (Samsung)', U.kg870), fin('Samsung – pouzdro 870 EVO', U.kg870, P.suwon)],
    [{ name: 'Samsung Electronics', role: 'Výrobce disku a pouzdra', country: 'KR', src: U.kg870, fact: 'doc' }],
    [{ title: 'Šrouby pod štítkem', text: 'Dva ze tří šroubů jsou pod štítkem; jeho stržení ruší záruku.', src: U.kg870, fact: 'doc' }, { title: 'Padělky', text: 'Objevily se falešné 870 EVO s řadičem RayMX a 120 GB uvnitř; pohled dovnitř je kontrola pravosti.', src: U.fake870, fact: E }]),
  pas_evo_pwr: R([...mlcc(), ...mag('Malé tlumivky měničů'), asm('Osazení desky SSD (Samsung)', U.at870), fin('Samsung – napájení 870 EVO', U.at870, P.suwon, E)],
    [{ name: 'Samsung Electronics', role: 'Výrobce disku', country: 'KR', src: U.ds870, fact: 'doc' }, coMurata, coSemco],
    [{ title: 'Neznámé typy', text: 'Recenze zmiňují jen hrstku drobných dílů regulace na zadní straně; typy neověřeny.', src: U.at870, fact: E }], { market: mkMlcc }),

  // ── Seasonic GX-650 ────────────────────────────────────────────────────────────────────────────
  pas_gx_emi: R([...mlcc(), ...mag('Odrušovací tlumivky (common mode)'), asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – EMI filtr GX-650', U.gx650, P.taipei)],
    [coSea, coTdk], [{ title: 'Díly jen u sourozence', text: 'Počty X/Y kondenzátorů a tlumivek jsou doložené u GX-750; GX-650 je nemá zveřejněné.', src: U.gx750, fact: 'doc' }]),
  pas_gx_inrush: R([
    n('mn', 2, 'Oxidy kovů pro NTC termistor (keramika)', null, ['ntc'], U.gx750),
    n('ntc', 3, 'NTC MF72-5D20L (5 Ω) a relé', null, ['asm'], U.gx750),
    asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – inrush GX-650', U.gx650, P.taipei)],
    [coSea], [{ title: 'Termistor u GX-650', text: 'Rozbor GX-650 potvrzuje termistor a varistor na vstupu; relé je doložené jen u GX-750.', src: U.gx650, fact: 'doc' }]),
  pas_gx_bridge: R([...chip('Můstek GBU1508S (800 V, 15 A)', U.gx750), asm('Osazení na chladič, Seasonic', U.seaContact, P.dongguan), fin('Seasonic – usměrňovač GX-650', U.gx750, P.taipei, E)],
    [coSea], [{ title: 'Ztráty v můstku', text: 'Můstek je jeden z hlavních zdrojů tepla na primáru; chlazený hliníkovým žebrem.', src: U.gx750, fact: E }]),
  pas_gx_pfc: R([...mos('MOSFETy CRJS190N65GCF (CRMicro) a SiC dioda G4S06508DT'), asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – APFC GX-650', U.gx750, P.taipei, E)],
    [coSea, { name: 'China Resources Microelectronics (CRMicro)', role: 'APFC MOSFETy u GX-750', country: 'CN', src: U.gx750, fact: 'doc' }, { name: 'Global Power Technology', role: 'SiC boost dioda u GX-750', country: 'CN', src: U.gx750, fact: 'doc' }],
    [bnPower], { market: mkSic }),
  pas_gx_bulk: R([...elko('Teapo LG 400 V 330 µF, 105 °C'), asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – bulk kondenzátor GX-650', U.gx650, P.taipei)],
    [coSea, coKaimei], [{ title: 'Životnost elektrolytu', text: 'Bulk Teapo LG je u GX-750 dimenzován na 2000 h při 105 °C; teplota určuje stárnutí.', src: U.gx750, fact: E }, bnAl],
    { timeline: [{ date: '2024-12', text: 'Rozbor noticias3d: hlavní kondenzátor Teapo LG 400 V 330 µF.', src: U.gx650, fact: 'doc' }], market: mkAl }),
  pas_gx_llc: R([...mos('MOSFETy CS13N50AOR (500 V, Haujing)'), asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – full-bridge LLC GX-650', U.gxSeries, P.taipei)],
    [coSea, { name: 'Haujing Microelectronics', role: 'Spínače LLC u GX-750', country: 'CN', src: U.gx750, fact: 'doc' }],
    [bnPower], { timeline: [{ date: '2024-09-20', text: 'Seasonic ohlašuje CORE GX ATX 3 s full-bridge LLC a DC-DC.', src: U.gxSeries, fact: 'doc' }], market: mkPower }),
  pas_gx_mag: R([...mag('Transformátor a LLC tlumivka (ferit + měď)'), asm('Navíjení a osazení, Seasonic Dongguan', U.seaContact, P.dongguan), fin('Seasonic – magnetika GX-650', U.gx650, P.taipei)],
    [coSea, coTdk], [bnCu]),
  pas_gx_sr: R([...mos('MOSFETy synchronního usměrnění +12 V'), asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – usměrnění +12 V GX-650', U.gx750, P.taipei, E)],
    [coSea], [bnPower], { market: mkPower }),
  pas_gx_dcdc: R([...mos('MOSFETy UBIQ QN3106M6N (30 V)'), ...mag('Tlumivky DC-DC'), asm('Osazení dceřiné desky, Seasonic', U.seaContact, P.dongguan), fin('Seasonic – DC-DC GX-650', U.gx650, P.taipei)],
    [coSea, { name: 'UBIQ Semiconductor', role: 'MOSFETy DC-DC u GX-750', country: 'TW', src: U.gx750, fact: 'doc' }, { name: 'uPI Semiconductor', role: 'Řadič DC-DC uP3861P u GX-750', country: 'TW', src: U.gx750, fact: 'doc' }],
    [bnPower]),
  pas_gx_caps: R([...elko('Teapo TX/SC elektrolyty 16 V'), ...poly(), asm('Osazení v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – sekundární kondenzátory GX-650', U.gx650, P.taipei)],
    [coSea, coKaimei], [{ title: 'Jen elektrolyty Teapo', text: 'Sekundár používá tchajwanské Teapo místo japonských kondenzátorů; levnější řada.', src: U.gx650, fact: E }, bnTa]),
  pas_gx_hs: R([...hs('Hliníková žebra primáru a deska OptiSink'), asm('Montáž v továrně Seasonic', U.seaContact, P.dongguan), fin('Seasonic – chladiče GX-650', U.gx650, P.taipei)],
    [coSea], [bnAl], { market: mkAl }),
  pas_gx_fan: R([
    n('cu', 0, 'Měď pro vinutí motoru', P.escondida, ['fan'], U.escondida),
    n('fan', 3, 'Ventilátor Hong Hua 120 mm (u GX-750 HA1225H12F-Z)', null, ['asm'], U.gx750),
    asm('Montáž do zdroje, Seasonic', U.seaContact, P.dongguan), fin('Seasonic – ventilátor GX-650', U.gx650, P.taipei)],
    [coSea, { name: 'Hong Hua', role: 'Výrobce ventilátorů zdrojů (test Cybenetics)', country: 'TW', src: U.hongHua, fact: E }],
    [{ title: 'Typ ložiska', text: 'Seasonic uvádí HDB, rozbor noticias3d FDB; ložisko určuje životnost ventilátoru.', src: U.gxSeries, fact: 'doc' }]),
  pas_gx_mod: R([...con('Modulární konektory a kabely (ATX, EPS, PCIe, 12V-2x6, SATA, Molex)'), asm('Výroba kabelových svazků (dodavatel neuveden)', U.gxLdlc), fin('Seasonic – kabeláž GX-650', U.gxLdlc, P.taipei)],
    [coSea, coMolex], [{ title: '12V-2x6 místo 12VHPWR', text: 'Kabel 12V-2x6 je bezpečnější revize konektoru pro grafiky (kratší signální piny).', src: U.gx650, fact: 'doc' }, bnConn],
    { market: mkConn }),

  // ── Add2PSU ───────────────────────────────────────────────────────────────────────────────────
  pas_a2p_relay: R([
    n('cu', 0, 'Měď pro cívku a kontakty', P.escondida, ['rel'], U.escondida),
    n('rel', 3, 'Relé GB-1C12L (Shenzhen Golden Electrical Appliances)', P.shenzhen, ['asm'], U.a2p, 'doc'),
    asm('Osazení desky (výrobce klonu neznámý)', U.a2pPatent), fin('Add2PSU – relé', U.a2p, null, E)],
    [{ name: 'Shenzhen Golden Electrical Appliances', role: 'Relé GB-1C12L v původní desce', country: 'CN', src: U.a2p, fact: 'doc' }, { name: 'Hongfa', role: 'Velký čínský výrobce relé (pro srovnání odvětví)', country: 'CN', src: U.relays, fact: E }],
    [{ title: 'Klony bez dokumentace', text: 'Kupované moduly jsou klony; jaké relé obsahují, nelze bez rozebrání ověřit.', src: U.a2pPatent, fact: E }],
    { timeline: [{ date: '2011-09-05', text: 'LegitReviews: deska s jediným relé Golden GB-1C12L.', src: U.a2p, fact: 'doc' }] }),
  pas_a2p_atx: R([...con('Zásuvka ATX 24 pin'), asm('Osazení desky (výrobce klonu neznámý)', U.a2pPatent), fin('Add2PSU – zásuvka ATX', U.a2p, null, E)],
    [{ name: 'David Lee Lorentzen', role: 'Vynálezce Add2PSU (patent US8878390)', country: 'US', src: U.a2pPatent, fact: 'doc' }, coMolex],
    [{ title: 'Jen pin PS_ON#', text: 'Zásuvka slouží jen k zapnutí druhého zdroje; výkon do ní neteče.', src: U.a2pPatent, fact: E }]),
  pas_a2p_in: R([...con('Konektor Molex 4 pin / SATA napájení'), asm('Osazení desky (výrobce klonu neznámý)', U.a2pPatent), fin('Add2PSU – vstup z prvního zdroje', U.a2p, null, E)],
    [coMolex], [{ title: 'Dell bez Molexu', text: 'T5810 nemá Molex; vstup se řeší redukcí SATA → Molex nebo klonem se SATA.', src: U.a2p, fact: E }]),

  // ── ModDIY TD404 ──────────────────────────────────────────────────────────────────────────────
  pas_td404_pot: R([
    n('c', 2, 'Uhlíková odporová dráha a jezdec', null, ['pot'], U.td404),
    n('pot', 3, 'Potenciometr s hřídelí pro knoflík (výrobce neznámý)', null, ['asm'], U.td404),
    asm('Osazení desky FAN-K02', U.td404), fin('MODDIY – TD404, knoflík', U.td404, P.hongKong)],
    [{ name: 'MODDIY', role: 'Značka regulátoru, Hongkong', country: 'HK', src: U.moddiyAbout, fact: 'doc' }],
    [{ title: 'Opotřebení dráhy', text: 'Uhlíkové potenciometry časem šumí a skáčou; plynulost regulace pak trpí.', src: U.td404, fact: E }]),
  pas_td404_sata: R([...con('Konektor SATA napájení'), asm('Osazení desky FAN-K02', U.td404), fin('MODDIY – TD404, vstup SATA', U.td404, P.hongKong)],
    [{ name: 'MODDIY', role: 'Značka regulátoru, Hongkong', country: 'HK', src: U.moddiyAbout, fact: 'doc' }],
    [{ title: 'Limit 60 W', text: 'Výrobce uvádí maximální výstup 60 W pro celý hub.', src: U.td404, fact: 'doc' }]),
  pas_td404_fan: R([...con('Konektory 4pin PWM a prodlužovací kabely'), asm('Osazení desky FAN-K02', U.td404), fin('MODDIY – TD404, výstupy', U.td404, P.hongKong)],
    [{ name: 'MODDIY', role: 'Značka regulátoru, Hongkong', country: 'HK', src: U.moddiyAbout, fact: 'doc' }],
    [{ title: 'Jen 4pin PWM', text: 'Výrobce uvádí, že 3pin a 2pin ventilátory nejsou podporovány.', src: U.td404, fact: 'doc' }]),
  pas_td404_small: R([...mlcc(), ...chip('Diody, LED a regulátor SOT-89', U.td404), asm('Osazení desky FAN-K02', U.td404), fin('MODDIY – TD404, drobné díly', U.td404, P.hongKong)],
    [{ name: 'MODDIY', role: 'Značka regulátoru, Hongkong', country: 'HK', src: U.moddiyAbout, fact: 'doc' }, coMurata],
    [{ title: 'Neznámé typy', text: 'Hodnoty a výrobci drobných dílů nejsou uvedené; deska je znát jen z fotky prodejce.', src: U.td404, fact: E }]),
};
