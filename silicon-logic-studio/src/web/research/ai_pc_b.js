// Rešerše – viz index.js (schéma dat). Díly AI PC (úložiště, zdroj, kabeláž, chlazení) a SSD z Mého PC.
const C = '2026-11-13';

// Zdroje použité víckrát (všechny otevřené nebo viděné ve výsledcích vyhledávání 2026-11-13).
const U = {
  ds870: 'https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf',
  tpu870: 'https://techpowerup.com/ssd-specs/samsung-870-evo-1-tb.d3',
  tpu870b: 'https://techpowerup.com/ssd-specs/samsung-870-evo-1-tb.d1903',
  at870: 'https://www.anandtech.com/show/16433',
  kg870: 'https://www.kitguru.net/components/ssd-drives/simon-crisp/samsung-ssd-870-evo-1tb-review/2',
  news870: 'https://news.samsung.com/us/storage-memory-sata-ssd-870-evo',
  yole870: 'https://www.yolegroup.com/industry-news/samsung-introduces-870-evo-sata-ssds-128l-tlc-with-an-updated-controller/',
  at870qvo: 'https://www.anandtech.com/show/15887',
  tpuQvo8: 'https://techpowerup.com/ssd-specs/samsung-870-qvo-8-tb.d19',
  v6: 'https://www.techspot.com/news/81312-samsung-launches-sixth-generation-v-nand-performance-efficiency.html',
  p1: 'https://news.samsung.com/global/samsung-electronics-begins-mass-production-at-new-semiconductor-plant-in-pyeongtaek-south-korea',
  p2: 'https://news.samsung.com/global/samsung-announces-new-nand-flash-facility-to-address-future-data-center-and-mobile-demands',
  xian2014: 'https://news.samsung.com/global/samsung-announces-operation-of-its-memory-facility-in-xian-china',
  xianLock: 'https://www.cnbc.com/2021/12/30/samsung-micron-warn-chinas-xi-an-lockdown-could-affect-chip-supply.html',
  xianTF: 'https://trendforce.com/presscenter/news/20211224-11068.html',
  kioxia: 'https://www.bloomberg.com/news/articles/2022-02-09/western-digital-kioxia-say-contamination-hurt-chip-production',
  nand26: 'https://www.trendforce.com/presscenter/news/20260331-12995.html',
  share: 'https://www.storagenewsletter.com/2024/10/03/in-2q24-samsung-maintained-leadership-in-nand-flash-market/',
  foundry: 'https://semiconductor.samsung.com/foundry/manufacturing/manufacturing-sites',
  sess: 'https://technode.com/2024/11/22/samsung-invests-15-2-million-to-expand-semiconductor-packaging-at-suzhou-plant/',
  sibelco: 'https://sibelco.com/materials/high-purity-quartz',
  helene: 'https://www.news4jax.com/tech/2024/10/10/north-carolina-maker-of-high-purity-quartz-back-operating-post-helene/',
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf',
  usgsCu: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf',
  usgsSn: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tin.pdf',
  usgsW: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tungsten.pdf',
  usgsC: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-graphite.pdf',
  ds970: 'https://static.chipdip.ru/lib/072/DOC045072454.pdf',
  ds970r2: 'https://www.farnell.com/datasheets/3179262.pdf',
  news970: 'https://news.samsung.com/us/samsung-electronics-sets-new-performance-levels-consumer-nvme-ssds-970-evo-plus',
  tpu970_500: 'https://techpowerup.com/ssd-specs/samsung-970-evo-plus-500-gb.d991',
  tpu970_1t: 'https://techpowerup.com/ssd-specs/samsung-970-evo-plus-1-tb.d61',
  elpis: 'https://techpowerup.com/286008',
  swap: 'https://www.tomshardware.com/uk/news/samsung-is-swapping-ssd-parts-too',
  at970: 'https://www.anandtech.com/show/12670',
  at980: 'https://www.anandtech.com/show/16087',
  v5: 'https://news.samsung.com/us/samsung-fifth-generation-v-nand-mass-production',
  v5bw: 'https://www.businesswire.com/news/home/20180709005883/en/4413494/Samsung-Electronics-Brings-Wave-High-Performance-Storage-Mass',
  ti92: 'https://techinsights.com/node/29158',
  fms19: 'https://old.flashmemorysummit.com/Proceedings2019/08-07-Wednesday/20190807_FTEC-202-1_Choe.pdf',
  gxSeries: 'https://guru3d.com/story/seasonic-unveils-core-gx-atx3-gold-modular-power-supplies-from-650w-to-850w',
  gx650n3d: 'https://www.noticias3d.com/articulo/3844/p2/seasonic-core-gx-atx-3-2024-650w-review-apuesta-economica-ultimos-estandares.html',
  gx750cyb: 'https://www.cybenetics.com/evaluations/psus/2753/',
  gxTsukumo: 'https://shop.tsukumo.co.jp/goods/4711173878452/',
  seaWiki: 'https://en.wikipedia.org/wiki/Sea_Sonic',
  seaIR: 'https://investor.seasonic.com/en/about/',
  seaContact: 'https://www.seasonic.com/contact',
  seaTariff: 'https://www.tomshardware.com/news/seasonic-psus-prices-increase-msrp,38018.html',
  a2pReview: 'https://www.legitreviews.com/add2psu-daisy-chain-power-supply-adapter-review_1698',
  a2pPatent: 'https://patents.google.com/patent/US8878390',
  pb08248: 'https://images.nvidia.com/content/tesla/pdf/NV-tesla-p100-pcie-PB-08248-001-v01.pdf',
  td404: 'https://www.moddiy.com/products/6699/12V-4-Pin-PC-Chassis-PWM-Fan-Hub-Speed-Controller-Powered-by-SATA.html',
  moddiyAbout: 'https://www.moddiy.com/pages/About-Us.html',
  mx6: 'https://arctic.de/en/MX-6',
  mx6tpu: 'https://techpowerup.com/299840/arctic-unveils-the-mx-6-high-performance-thermal-compound',
  mx6leak: 'https://www.tomshardware.com/news/arctic-mx-6-thermal-grease-set-to-launch',
  mx6toms: 'https://www.tomshardware.com/news/artic-mx6-thermal-paste',
  mx6vortez: 'https://www.vortez.net/news_story/arctic_releases_new_mx_6_thermal_paste.html',
  p12: 'https://arctic.de/it/P12-PWM-PST/ACFAN00120A',
  p12launch: 'https://www.techpowerup.com/248815/arctic-releases-p-fan-series-high-static-pressure-with-six-fan-models',
  arcticLoc: 'https://arctic.de/en/about-arctic/locations',
};

const P = {
  sprucePine: { name: 'Spruce Pine (Severní Karolína)', country: 'US', lat: 35.915, lon: -82.065 },
  chileCu: { name: 'Chile (největší těžař mědi)', country: 'CL', lat: -24.27, lon: -69.07 },
  chinaW: { name: 'Čína (provincie Ťiang-si)', country: 'CN', lat: 25.83, lon: 114.93 },
  chinaSi: { name: 'Čína (hutě křemíku)', country: 'CN', lat: 26.65, lon: 106.63 },
  chinaSn: { name: 'Čína (Jün-nan, Ke-ťiou)', country: 'CN', lat: 23.36, lon: 103.15 },
  chinaC: { name: 'Čína (grafit, Chej-lung-ťiang)', country: 'CN', lat: 45.75, lon: 126.65 },
  pyeongtaek: { name: 'Samsung Pyeongtaek', country: 'KR', lat: 37.02, lon: 127.05 },
  xian: { name: 'Samsung Si-an (Xian)', country: 'CN', lat: 34.18, lon: 108.83 },
  hwaseong: { name: 'Samsung Hwaseong', country: 'KR', lat: 37.21, lon: 127.06 },
  giheung: { name: 'Samsung Giheung (S1)', country: 'KR', lat: 37.23, lon: 127.07 },
  austin: { name: 'Samsung Austin (S2)', country: 'US', lat: 30.39, lon: -97.63 },
  onyang: { name: 'Samsung Onyang (Asan)', country: 'KR', lat: 36.78, lon: 127.03 },
  suzhou: { name: 'Samsung Suzhou (SESS)', country: 'CN', lat: 31.32, lon: 120.72 },
  suwon: { name: 'Samsung Electronics, Suwon (sídlo)', country: 'KR', lat: 37.26, lon: 127.03 },
  dongguan: { name: 'Sea Sonic Dongguan (Shijie)', country: 'CN', lat: 23.11, lon: 113.81 },
  taipei: { name: 'Sea Sonic, Tchaj-pej (Neihu)', country: 'TW', lat: 25.08, lon: 121.58 },
  santaClara: { name: 'NVIDIA, Santa Clara', country: 'US', lat: 37.37, lon: -121.96 },
  hongKong: { name: 'Hongkong', country: 'HK', lat: 22.30, lon: 114.17 },
  shenzhen: { name: 'Šen-čen', country: 'CN', lat: 22.54, lon: 114.06 },
};

// Společné uzly pro Samsung NAND a řadiče (vždy obecný řetězec = estimate, kromě míst výslovně doložených).
const quartz = (to) => ({ id: 'quartz', stage: 0, name: 'Vysoce čistý křemen pro kelímky (Czochralski)', place: P.sprucePine, to, src: U.sibelco, fact: 'estimate' });
const siMetal = (to) => ({ id: 'si', stage: 1, name: 'Křemík (hutnický → polykrystalický)', place: P.chinaSi, to, src: U.usgsSi, fact: 'estimate' });
const wafer = (to) => ({ id: 'wafer', stage: 2, name: 'Křemíkové desky 300 mm (monokrystal)', to, src: U.sibelco, fact: 'estimate' });
const tungsten = (to) => ({ id: 'w', stage: 0, name: 'Wolfram (Čína ~84 % světové těžby)', place: P.chinaW, to, src: U.usgsW, fact: 'estimate' });
const copper = (to) => ({ id: 'cu', stage: 0, name: 'Měď (Chile největší těžař)', place: P.chileCu, to, src: U.usgsCu, fact: 'estimate' });
const tin = (to) => ({ id: 'sn', stage: 0, name: 'Cín do pájek (Čína, Indonésie, Barma)', place: P.chinaSn, to, src: U.usgsSn, fact: 'estimate' });

const nandMarket = {
  category: 'NAND flash – podíl na tržbách výrobců, 2. čtvrtletí 2024 (TrendForce)', year: 2024,
  shares: [
    { name: 'Samsung', pct: 36.9 }, { name: 'SK Group (SK hynix + Solidigm)', pct: 22.1 }, { name: 'Kioxia', pct: 13.8 },
    { name: 'Micron', pct: 11.8 }, { name: 'Western Digital', pct: 10.5 }, { name: 'Ostatní (dopočet do 100 %)', pct: 4.9 },
  ],
  src: U.share, fact: 'doc',
};

const bnXian = { title: 'Lockdown Si-anu (prosinec 2021)', text: 'Samsung 29. 12. 2021 dočasně upravil provoz NAND linek v Si-anu; podle TrendForce dělají 42,5 % jeho kapacity NAND a 15,3 % světové.', src: U.xianLock, fact: 'estimate' };
const bnKioxia = { title: 'Kontaminace v továrnách Kioxia/WD (2022)', text: 'Koncem ledna 2022 znečištěné materiály zastavily 3D NAND v Yokkaichi a Kitakami; WD odhadl ztrátu 6,5 EB, ceny NAND šly nahoru.', src: U.kioxia, fact: 'estimate' };
const bnNand26 = { title: 'Nedostatek NAND kvůli AI (2026)', text: 'TrendForce čekal ve 2Q26 růst smluvních cen NAND o 70–75 % mezičtvrtletně; výrobci omezují klientská SSD ve prospěch serverových.', src: U.nand26, fact: 'estimate' };
const bnQuartz = { title: 'Křemen ze Spruce Pine (hurikán Helene 2024)', text: 'Sibelco a Quartz Corp v Spruce Pine před hurikánem Helene zastavily provoz; odtud pochází většina křemene pro kelímky na tažení Si.', src: U.helene, fact: 'estimate' };

export default {
  evo870: {
    checked: C,
    supply: [
      quartz(['wafer']),
      tungsten(['nand']),
      siMetal(['wafer']),
      wafer(['nand', 'ctl', 'dram']),
      { id: 'nand', stage: 3, name: 'V-NAND V6 TLC (128 vrstev), Pyeongtaek / Si-an', place: P.pyeongtaek, to: ['pkg'], src: U.at870, fact: 'estimate' },
      { id: 'ctl', stage: 3, name: 'Řadič MKX (S4LR059), 14 nm Samsung Foundry', place: P.giheung, to: ['pkg'], src: U.tpu870, fact: 'estimate' },
      { id: 'dram', stage: 3, name: 'Cache 1 GB LPDDR4 (1 TB model)', place: P.hwaseong, to: ['pkg'], src: U.ds870, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdření a test čipů (Onyang/Cheonan)', place: P.onyang, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'samsung', stage: 5, name: 'Samsung Electronics – 870 EVO 1 TB (MZ-77E1T0)', place: P.suwon, src: U.ds870, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'Výrobce SSD, řadiče MKX, V-NAND i LPDDR4', country: 'KR', src: U.ds870, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba řadiče (TechPowerUp uvádí 14 nm FinFET Samsung)', country: 'KR', src: U.tpu870, fact: 'doc' },
      { name: 'Sibelco', role: 'Vysoce čistý křemen pro kelímky na tažení křemíku (obecně pro odvětví)', country: 'BE', src: U.sibelco, fact: 'estimate' },
    ],
    timeline: [
      { date: '2020', text: 'Řadič MKX debutuje v 870 QVO (nahradil MJX).', src: U.at870qvo, fact: 'doc' },
      { date: '2021-01', text: 'Samsung uvádí 870 EVO: SATA 6 Gb/s, 6. generace V-NAND (128 vrstev) a řadič MKX.', src: U.news870, fact: 'doc' },
      { date: '2021-01', text: 'Při uvedení 250 GB až 1 TB, 2 a 4 TB měly přijít v únoru.', src: U.yole870, fact: 'doc' },
      { date: '2023-05', text: 'Datasheet rev. 1.1: 1 TB = 1 GB LPDDR4, 600 TBW, záruka 5 let, MTBF 1,5 mil. h.', src: U.ds870, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Tiché hardwarové varianty', text: 'TechPowerUp vede pro 1 TB variantu s V-NAND V6 (128 vrstev) i V6 Prime (133 vrstev); výkon se může lišit.', src: U.tpu870b, fact: 'doc' },
      bnXian,
      bnNand26,
    ],
    history: [
      { year: 2021, title: 'Jeden čip NAND na celý 1 TB', text: 'KitGuru po rozebrání našel jen tři hlavní čipy: řadič S4LR059, 1 GB LPDDR4 a jediné pouzdro NAND K90VGY8.', src: U.kg870, fact: 'doc' },
    ],
    market: nandMarket,
  },

  mkx: {
    checked: C,
    supply: [
      quartz(['wafer']),
      siMetal(['wafer']),
      copper(['fab']),
      wafer(['fab', 'fab2']),
      { id: 'fab', stage: 3, name: 'Wafer 14 nm FinFET – Giheung (S1, uzly 350–8 nm)', place: P.giheung, to: ['pkg'], src: U.foundry, fact: 'estimate' },
      { id: 'fab2', stage: 3, name: 'Alternativně Austin (S2, uzly 65–14 nm)', place: P.austin, to: ['pkg'], src: U.foundry, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdření a test (Onyang/Cheonan)', place: P.onyang, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'samsung', stage: 5, name: 'Samsung Electronics – řadič MKX (Metis, S4LR059)', place: P.suwon, src: U.kg870, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics (System LSI / Memory)', role: 'Návrh řadiče MKX pro SATA SSD', country: 'KR', src: U.kg870, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba čipu; TechPowerUp uvádí 14 nm Samsung FinFET', country: 'KR', src: U.tpu870, fact: 'doc' },
      { name: 'Arm', role: 'Jádra Cortex-R4 (podle TechPowerUp u 870 QVO 8 TB)', country: 'GB', src: U.tpuQvo8, fact: 'doc' },
    ],
    timeline: [
      { date: '2020', text: 'MKX poprvé v 870 QVO; nahradil řadič MJX z 860 QVO.', src: U.at870qvo, fact: 'doc' },
      { date: '2021-01', text: 'Stejný MKX dostává 870 EVO.', src: U.yole870, fact: 'doc' },
      { date: '2021', text: 'Teardown 870 EVO 1 TB: 8kanálový MKX s označením S4LR059.', src: U.kg870, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Výroba jen u Samsung Foundry', text: 'Řadič vyrábí jen vlastní foundry Samsungu na 14 nm; náhradní výrobce neexistuje (obecná vlastnost vlastních řadičů).', src: U.tpu870, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  nand_k90vgy8: {
    checked: C,
    supply: [
      quartz(['wafer']),
      tungsten(['fabP', 'fabX']),
      siMetal(['wafer']),
      wafer(['fabP', 'fabX']),
      { id: 'fabP', stage: 3, name: 'V-NAND V6 – Pyeongtaek (P1 od 2017, P2 NAND od 2H 2021)', place: P.pyeongtaek, to: ['pkg', 'pkgS'], src: U.p2, fact: 'estimate' },
      { id: 'fabX', stage: 3, name: 'V-NAND – Si-an (od 2014, 3D V-NAND)', place: P.xian, to: ['pkg', 'pkgS'], src: U.xian2014, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdření více die do K90VGY8 (Onyang/Cheonan)', place: P.onyang, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'pkgS', stage: 4, name: 'Pouzdření a test – Suzhou (jediná zámořská základna)', place: P.suzhou, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'samsung', stage: 5, name: 'Samsung Electronics – pouzdro K90VGY8 (V-NAND TLC)', place: P.suwon, src: U.kg870, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'Návrh a výroba V-NAND V6', country: 'KR', src: U.v6, fact: 'doc' },
      { name: 'Samsung China Semiconductor (Si-an)', role: 'Továrna na NAND (provoz od 2014)', country: 'CN', src: U.xian2014, fact: 'doc' },
    ],
    timeline: [
      { date: '2019-08', text: 'Samsung spouští sériovou výrobu 6. generace V-NAND (1xx vrstev, jednovrstvý stack; uváděno 136).', src: U.v6, fact: 'doc' },
      { date: '2020-06', text: 'Samsung ohlašuje NAND linku v Pyeongtaek Line 2, sériová výroba plánována na 2H 2021.', src: U.p2, fact: 'doc' },
      { date: '2021-01', text: '870 EVO používá 512Gb 128vrstvou TLC; Samsung oficiálně uvádí jen 1xx vrstev.', src: U.at870, fact: 'doc' },
    ],
    bottlenecks: [bnXian, bnKioxia, bnNand26],
    history: [
      { year: 2021, title: 'Počet vrstev neoficiální', text: 'KitGuru i Samsung uvádějí jen "1xx vrstev"; 128 vrstev odvozuje AnandTech, TechPowerUp zná i variantu 133 vrstev.', src: U.kg870, fact: 'doc' },
    ],
    market: nandMarket,
  },

  gx650: {
    checked: C,
    supply: [
      copper(['mag']),
      tin(['asm']),
      { id: 'caps', stage: 3, name: 'Kondenzátory Teapo (bulk LG 400 V 330 µF, sekundár TX)', to: ['asm'], src: U.gx650n3d, fact: 'doc' },
      { id: 'ctl', stage: 3, name: 'Řadiče Champion CM6500UNX (PFC) a CU6901VPA (LLC), supervizor Weltrend WT7527RA', to: ['asm'], src: U.gx750cyb, fact: 'estimate' },
      { id: 'fan', stage: 3, name: 'Ventilátor Hong Hua 120 mm, FDB', to: ['asm'], src: U.gx650n3d, fact: 'doc' },
      { id: 'mag', stage: 3, name: 'Hlavní transformátor a LLC tlumivka (měděné vinutí)', to: ['asm'], src: U.gx650n3d, fact: 'estimate' },
      { id: 'asm', stage: 4, name: 'Osazení a burn-in ve vlastní továrně Seasonic', place: P.dongguan, to: ['seasonic'], src: U.seaContact, fact: 'estimate' },
      { id: 'seasonic', stage: 5, name: 'Sea Sonic Electronics – CORE GX-650 ATX 3 (SRP-CGX651-A5A32SF)', place: P.taipei, src: U.gxSeries, fact: 'doc' },
    ],
    companies: [
      { name: 'Sea Sonic Electronics', role: 'Výrobce zdroje (vlastní OEM, Cybenetics u GX-750 uvádí výrobce Seasonic)', country: 'TW', src: U.gx750cyb, fact: 'doc' },
      { name: 'Teapo Electronic', role: 'Elektrolytické kondenzátory (bulk i sekundár)', country: 'TW', src: U.gx650n3d, fact: 'doc' },
      { name: 'Champion Microelectronic', role: 'PFC a LLC řadiče (doloženo u sourozence GX-750)', country: 'TW', src: U.gx750cyb, fact: 'estimate' },
      { name: 'Weltrend Semiconductor', role: 'Supervizor OVP/UVP/OCP/SCP/PG (doloženo u GX-750)', country: 'TW', src: U.gx750cyb, fact: 'estimate' },
    ],
    timeline: [
      { date: '2024-09-20', text: 'Seasonic ohlašuje řadu CORE GX ATX 3 (650–850 W): ATX 3.1, PCIe 5.1, 80 PLUS Gold, full-bridge LLC, 7 let záruky.', src: U.gxSeries, fact: 'doc' },
      { date: '2024-12', text: 'Japonský prodejce vede začátek prodeje CORE GX-650 ATX3 v prosinci 2024.', src: U.gxTsukumo, fact: 'doc' },
      { date: '2024-12', text: 'Recenze noticias3d s rozborem: bulk Teapo 330 µF, ventilátor Hong Hua, DC-DC deska OptiSink.', src: U.gx650n3d, fact: 'doc' },
      { date: '2025-03-06', text: 'Cybenetics vydává zprávu sourozence GX-750 ATX3 (účinnost 89,2 % při 115 V).', src: U.gx750cyb, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Výroba v Číně a cla USA', text: 'Seasonic zdražil zdroje vyrobené v Číně pro trh USA kvůli clům; výroba je soustředěna v Dongguanu.', src: U.seaTariff, fact: 'doc' },
      { title: 'Chybí test přesně GX-650', text: 'Seasonic u 650W modelu uvádí hodnocení Cybenetics jako TBA; komponenty řadičů jsou doložené jen u GX-750.', src: U.gx750cyb, fact: 'estimate' },
    ],
    history: [
      { year: 1975, title: 'Založení Sea Sonic', text: 'Firma vznikla v září 1975 v Tchaj-peji jako výrobce měřicí techniky, PC zdroje dělá od 1981.', src: U.seaWiki, fact: 'doc' },
      { year: 1997, title: 'Továrna v Dongguanu', text: 'Podle investorských stránek Seasonic založil továrnu v Dongguanu v roce 1997 (Wikipedia uvádí plný provoz 1994).', src: U.seaIR, fact: 'doc' },
      { year: 2005, title: 'První 80 PLUS', text: 'Seasonic byl první výrobce zdrojů s certifikací 80 PLUS.', src: U.seaWiki, fact: 'doc' },
    ],
    market: null,
  },

  add2psu: {
    checked: C,
    supply: [
      copper(['relay']),
      { id: 'relay', stage: 3, name: 'Relé Golden GB-1C12L (Shenzhen Golden Electrical Appliances)', place: P.shenzhen, to: ['asm'], src: U.a2pReview, fact: 'doc' },
      { id: 'asm', stage: 4, name: 'Osazení desky s ATX 24 pin a Molex (výrobce klonu neznámý)', to: ['brand'], src: U.a2pReview, fact: 'estimate' },
      { id: 'brand', stage: 5, name: 'Add2PSU (návrh David Lorentzen; kupovaný kus je neznačkový klon)', src: U.a2pPatent, fact: 'estimate' },
    ],
    companies: [
      { name: 'David Lee Lorentzen', role: 'Vynálezce Add2PSU, patent US8878390', country: 'US', src: U.a2pPatent, fact: 'doc' },
      { name: 'Shenzhen Golden Electrical Appliances', role: 'Relé GB-1C12L v původní desce', country: 'CN', src: U.a2pReview, fact: 'doc' },
    ],
    timeline: [
      { date: '2011-04-22', text: 'Podána patentová přihláška: adaptér, kde relé buzené prvním zdrojem zapne druhý zdroj přes ATX konektor.', src: U.a2pPatent, fact: 'doc' },
      { date: '2011-09-05', text: 'Recenze LegitReviews: jedno relé, konektory ATX 24 pin a Molex, cena 19,95 USD.', src: U.a2pReview, fact: 'doc' },
      { date: '2014-11-04', text: 'Patent US8878390 udělen.', src: U.a2pPatent, fact: 'doc' },
      { date: '2018-11-04', text: 'Patent vypršel pro nezaplacení poplatků – otevřená cesta pro klony.', src: U.a2pPatent, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Neznačkové klony', text: 'Kupované moduly jsou kopie bez výrobce a datasheetu; použité relé a kvalitu nelze ověřit.', src: U.a2pPatent, fact: 'estimate' },
    ],
    history: [
      { year: 2011, title: 'Před Add2PSU', text: 'Dříve se zdroje spojovaly kabelem Lian Li Dual Power Supply Adapter; Add2PSU ho nahradil malou deskou.', src: U.a2pReview, fact: 'doc' },
    ],
    market: null,
  },

  nv_030_0571: {
    checked: C,
    supply: [
      copper(['wire']),
      tin(['wire']),
      { id: 'wire', stage: 3, name: 'Vodiče a krimpované kontakty 8 pin (CPU/EPS a PCIe)', to: ['asm'], src: U.pb08248, fact: 'estimate' },
      { id: 'asm', stage: 4, name: 'Kompletace kabelu (dodavatel NVIDIA neuveden)', to: ['nvidia'], src: U.pb08248, fact: 'estimate' },
      { id: 'nvidia', stage: 5, name: 'NVIDIA – redukce NVPN 030-0571-000', place: P.santaClara, src: U.pb08248, fact: 'doc' },
    ],
    companies: [
      { name: 'NVIDIA', role: 'Specifikace a číslo dílu redukce pro Tesla P100 PCIe', country: 'US', src: U.pb08248, fact: 'doc' },
    ],
    timeline: [
      { date: '2016-10-03', text: 'Product brief PB-08248 v01: Tesla P100 PCIe má jeden 8pin CPU konektor, redukce NVPN 030-0571-000 (obr. 4).', src: U.pb08248, fact: 'doc' },
      { date: '2016-10-03', text: 'Tab. 8 povoluje 2× PCIe 8 pin, 2× PCIe 6 pin nebo 8+6 pin; 6pin kabel musí unést 120 W.', src: U.pb08248, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Záměna CPU a PCIe 8 pin', text: 'Karta má CPU (EPS) 8 pin, ne PCIe 8 pin; bez redukce nebo s chybným kabelem hrozí zkrat či nefunkčnost.', src: U.pb08248, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  td404: {
    checked: C,
    supply: [
      copper(['asm']),
      { id: 'si', stage: 1, name: 'Křemík pro řídicí IO (odhad 555) a regulátor', place: P.chinaSi, to: ['asm'], src: U.usgsSi, fact: 'estimate' },
      { id: 'asm', stage: 4, name: 'Osazení desky FAN-K02 s knoflíkem, SATA vstup', to: ['moddiy'], src: U.td404, fact: 'estimate' },
      { id: 'moddiy', stage: 5, name: 'MODDIY – TD404 (4× PWM, 60 W)', place: P.hongKong, src: U.td404, fact: 'doc' },
    ],
    companies: [
      { name: 'MODDIY', role: 'Prodejce a značka regulátoru; firma z Hongkongu', country: 'HK', src: U.moddiyAbout, fact: 'doc' },
    ],
    timeline: [
      { date: '2026-11', text: 'MODDIY nabízí TD404 za 9,99 USD (běžně 14,99): 4 porty 4pin PWM, 60 W, napájení SATA, 63 × 32 × 20,3 mm.', src: U.td404, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Jen 4pin PWM ventilátory', text: 'Výrobce uvádí, že 3pin a 2pin ventilátory nejsou podporovány; celkový limit 60 W.', src: U.td404, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  mx6: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík pro silikonový nosič (Čína ~85 % hutnického Si)', place: P.chinaSi, to: ['silicone'], src: U.usgsSi, fact: 'estimate' },
      { id: 'c', stage: 0, name: 'Uhlíkové plnivo (grafit, Čína hlavní těžař)', place: P.chinaC, to: ['mix'], src: U.usgsC, fact: 'estimate' },
      { id: 'silicone', stage: 2, name: 'Silikonový gel jako nosič', to: ['mix'], src: U.mx6, fact: 'doc' },
      { id: 'mix', stage: 4, name: 'Míchání a plnění stříkaček (výroba v Číně pod QC ARCTIC Šen-čen)', place: P.shenzhen, to: ['arctic'], src: U.arcticLoc, fact: 'estimate' },
      { id: 'arctic', stage: 5, name: 'ARCTIC – MX-6 4 g', place: P.hongKong, src: U.mx6, fact: 'doc' },
    ],
    companies: [
      { name: 'ARCTIC', role: 'Značka; vývoj v Hongkongu, kontrola výroby v Šen-čenu, sklady v Německu a USA', country: 'DE', src: U.arcticLoc, fact: 'doc' },
    ],
    timeline: [
      { date: '2022-09', text: 'Uniká MX-6 jako náhrada MX-5, která šla do EOL.', src: U.mx6leak, fact: 'doc' },
      { date: '2022-11-03', text: 'ARCTIC uvádí MX-6: o 20 % lepší než MX-4, 2/4/8 g, od 12,99 USD.', src: U.mx6tpu, fact: 'doc' },
      { date: '2022-11', text: 'Receptura vychází z MX-4, ne z MX-5 (ARCTIC v roce 2022 svolával vadné šarže MX-5).', src: U.mx6vortez, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Neuvedená tepelná vodivost', text: 'ARCTIC W/mK nezveřejňuje; známé jsou jen viskozita 45 000 P, hustota 2,6 g/cm³, -50 až 150 °C.', src: U.mx6, fact: 'doc' },
      { title: 'Revize receptury bez data', text: 'ARCTIC uvádí revize MX-6: Rev. 2 → 3 výrazně zlepšila výkon, Rev. 3 → 4 jen upravila konzistenci; z balení revizi nepoznáš.', src: U.mx6, fact: 'doc' },
    ],
    history: [
      { year: 2022, title: 'Konec MX-5', text: 'MX-6 nahradila MX-5, kterou ARCTIC v roce 2022 svolával kvůli vadným šaržím.', src: U.mx6vortez, fact: 'doc' },
    ],
    market: null,
  },

  arctic_p12: {
    checked: C,
    supply: [
      copper(['motor']),
      { id: 'si', stage: 1, name: 'Křemík pro budicí PWM IO motoru', place: P.chinaSi, to: ['motor'], src: U.usgsSi, fact: 'estimate' },
      { id: 'motor', stage: 3, name: 'Sinusově magnetizovaný motor, ložisko FDB (slitina/mazivo vyvinuté v Německu)', to: ['asm'], src: U.p12, fact: 'doc' },
      { id: 'asm', stage: 4, name: 'Montáž v Číně pod dohledem QC ARCTIC Šen-čen', place: P.shenzhen, to: ['arctic'], src: U.arcticLoc, fact: 'estimate' },
      { id: 'arctic', stage: 5, name: 'ARCTIC – P12 PWM PST (ACFAN00120A)', place: P.hongKong, src: U.p12, fact: 'doc' },
    ],
    companies: [
      { name: 'ARCTIC', role: 'Návrh v Hongkongu, QC a dohled nad výrobou v Šen-čenu', country: 'DE', src: U.arcticLoc, fact: 'doc' },
    ],
    timeline: [
      { date: '2018-10-23', text: 'ARCTIC uvádí řadu P (vysoký statický tlak), šest modelů 120 a 140 mm.', src: U.p12launch, fact: 'doc' },
      { date: '2026-11', text: 'Parametry: 200–1800 ot/min, 0 ot/min pod 5 % PWM, 56,3 cfm, 2,2 mm H2O, 0,1 A, záruka 6 let.', src: U.p12, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Výroba jen v Číně', text: 'ARCTIC nemá vlastní továrny mimo Čínu; výrobu řídí kancelář QC v Šen-čenu.', src: U.arcticLoc, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  evo970plus: {
    checked: C,
    supply: [
      quartz(['wafer']),
      tungsten(['nand']),
      siMetal(['wafer']),
      wafer(['nand', 'ctl', 'dram']),
      { id: 'nand', stage: 3, name: 'V-NAND V5 TLC (9x vrstev), Pyeongtaek / Si-an', place: P.pyeongtaek, to: ['pkg'], src: U.news970, fact: 'estimate' },
      { id: 'ctl', stage: 3, name: 'Řadič Phoenix (S4LR020), 14 nm Samsung', place: P.giheung, to: ['pkg'], src: U.tpu970_1t, fact: 'estimate' },
      { id: 'dram', stage: 3, name: 'Cache 512 MB LPDDR4 (500 GB model)', place: P.hwaseong, to: ['pkg'], src: U.ds970, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdření a test čipů (Onyang/Cheonan)', place: P.onyang, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'samsung', stage: 5, name: 'Samsung Electronics – 970 EVO Plus 500 GB (MZ-V7S500)', place: P.suwon, src: U.ds970, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'Výrobce SSD, řadiče, V-NAND i LPDDR4', country: 'KR', src: U.news970, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba řadiče Phoenix (14 nm podle TechPowerUp)', country: 'KR', src: U.tpu970_1t, fact: 'doc' },
      { name: 'TechInsights', role: 'Rozbor die 92vrstvé V-NAND vyjmuté z 970 EVO Plus 1 TB', country: 'CA', src: U.ti92, fact: 'doc' },
    ],
    timeline: [
      { date: '2019-01-22', text: 'Samsung uvádí 970 EVO Plus: 5. generace V-NAND (9x vrstev), řadič Phoenix, od 89,99 USD.', src: U.news970, fact: 'doc' },
      { date: '2019-03', text: 'Datasheet rev. 2.0 přidává model 2 TB.', src: U.ds970r2, fact: 'doc' },
      { date: '2021-06', text: 'Datasheet rev. 3.0: z tabulky zmizel název řadiče (jen "Samsung in-house Controller").', src: U.ds970, fact: 'doc' },
      { date: '2021-08', text: '1TB model tiše přechází z Phoenix (S4LR020) na Elpis (S4LV003) a 6. generaci V-NAND.', src: U.elpis, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Tichá záměna dílů', text: 'Samsung změnil řadič a NAND kvůli nedostatku dílů; krabice už řadič neuvádí, rozliší ho jen kód modelu a firmware.', src: U.swap, fact: 'doc' },
      { title: 'Varianta 500 GB s Elpis', text: 'TechPowerUp eviduje i 500 GB variantu Elpis + V6 (128 vrstev); původní revize s Phoenix a V5 se už nemusí prodávat.', src: U.tpu970_500, fact: 'doc' },
      bnXian,
      bnNand26,
    ],
    history: [],
    market: nandMarket,
  },

  phoenix: {
    checked: C,
    supply: [
      quartz(['wafer']),
      siMetal(['wafer']),
      copper(['fab']),
      wafer(['fab', 'fab2']),
      { id: 'fab', stage: 3, name: 'Wafer 14 nm – Giheung (S1, uzly 350–8 nm)', place: P.giheung, to: ['pkg'], src: U.foundry, fact: 'estimate' },
      { id: 'fab2', stage: 3, name: 'Alternativně Austin (S2, uzly 65–14 nm)', place: P.austin, to: ['pkg'], src: U.foundry, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Flip-chip pouzdro, test (Onyang/Cheonan)', place: P.onyang, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'samsung', stage: 5, name: 'Samsung Electronics – řadič Phoenix (S4LR020)', place: P.suwon, src: U.tpu970_1t, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'Návrh řadiče NVMe Phoenix (970 EVO/PRO/EVO Plus, PM981a)', country: 'KR', src: U.at970, fact: 'doc' },
      { name: 'Arm', role: 'Pět jader Cortex-R7 (podle TechPowerUp)', country: 'GB', src: U.tpu970_1t, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba na 14 nm', country: 'KR', src: U.tpu970_1t, fact: 'doc' },
    ],
    timeline: [
      { date: '2018', text: 'Phoenix debutuje v 970 EVO: 5 jader ARM (jedno pro hostitele), 8 kanálů NAND.', src: U.at970, fact: 'doc' },
      { date: '2019-01', text: 'Phoenix zůstává v 970 EVO Plus s 9xvrstvou V-NAND.', src: U.news970, fact: 'doc' },
      { date: '2020', text: 'Nástupce Elpis (S4LV003) v 980 PRO: 8 nm a 128 IO front místo 32.', src: U.at980, fact: 'doc' },
      { date: '2021-08', text: '970 EVO Plus 1 TB přechází z Phoenix na Elpis.', src: U.elpis, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Konec výroby Phoenix', text: 'Samsung nahrazuje Phoenix Elpisem i ve starší řadě; nové kusy 970 EVO Plus už Phoenix mít nemusí.', src: U.swap, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  vnand_v5: {
    checked: C,
    supply: [
      quartz(['wafer']),
      tungsten(['fabP', 'fabX']),
      siMetal(['wafer']),
      wafer(['fabP', 'fabX']),
      { id: 'fabP', stage: 3, name: 'V-NAND – Pyeongtaek Line 1 (sériově od 7/2017)', place: P.pyeongtaek, to: ['pkg', 'pkgS'], src: U.p1, fact: 'estimate' },
      { id: 'fabX', stage: 3, name: 'V-NAND – Si-an (od 2014)', place: P.xian, to: ['pkg', 'pkgS'], src: U.xian2014, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdro K9DUGY8J5B s die K9AFGD8J0B (Onyang/Cheonan)', place: P.onyang, to: ['samsung'], src: U.ti92, fact: 'estimate' },
      { id: 'pkgS', stage: 4, name: 'Pouzdření a test – Suzhou', place: P.suzhou, to: ['samsung'], src: U.sess, fact: 'estimate' },
      { id: 'samsung', stage: 5, name: 'Samsung Electronics – V-NAND V5 TLC 256 Gb', place: P.suwon, src: U.v5, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'Návrh a výroba 5. generace V-NAND', country: 'KR', src: U.v5, fact: 'doc' },
      { name: 'TechInsights', role: 'Floorplan die K9AFGD8J0B z 970 EVO Plus 1 TB', country: 'CA', src: U.ti92, fact: 'doc' },
    ],
    timeline: [
      { date: '2018-07', text: 'Samsung zahajuje sériovou výrobu 256Gb V-NAND 5. generace: přes 90 vrstev, Toggle DDR 4.0 1,4 Gb/s, 1,2 V.', src: U.v5bw, fact: 'doc' },
      { date: '2019-01', text: 'V-NAND V5 nasazena v 970 EVO Plus (9x vrstev místo 64 v 970 EVO).', src: U.news970, fact: 'doc' },
      { date: '2019-08', text: 'TechInsights na FMS 2019: Samsung 92L je jednovrstvý stack (single deck) se 100 hradly.', src: U.fms19, fact: 'doc' },
      { date: '2019-08', text: 'Nástupce V6 (1xx vrstev) přichází 13 měsíců po V5.', src: U.v6, fact: 'doc' },
    ],
    bottlenecks: [bnXian, bnQuartz],
    history: [
      { year: 2018, title: 'Atomová depozice', text: 'Samsung uvedl o 30 % vyšší produktivitu výroby díky procesu ALD.', src: U.v5bw, fact: 'doc' },
    ],
    market: nandMarket,
  },
};
