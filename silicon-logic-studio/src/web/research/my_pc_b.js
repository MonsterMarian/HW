// Rešerše – viz index.js (schéma dat). Díly uživatelova PC: grafická karta, skříň, zdroj, periferie.
const CHECKED = '2026-11-13';

// Zdroje použité u více dílů.
const S = {
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf',
  usgsSn: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tin.pdf',
  usgsTa: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tantalum.pdf',
  usgsAu: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-gold.pdf',
  usgsRee: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-rare-earths.pdf',
  usgsAll: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025.pdf',
  usgsIn: 'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-indium.pdf',
  wafers: 'https://gep.com/mind/blog/outlook-for-the-global-semiconductor-silicon-wafer-industry',
  abf: 'https://fortune.com/2021/09/16/chip-shortage-supplier-component-abf-substrate-shares/',
  ked: 'https://www.kedglobal.com/newsView/ked202012170015',
  wikiAmpere: 'https://en.wikipedia.org/wiki/Ampere_(microarchitecture)',
  wikiRtx30: 'https://en.wikipedia.org/wiki/GeForce_RTX_30_series',
  wikiGddr6: 'https://en.wikipedia.org/wiki/GDDR6_SDRAM',
  nvNews: 'https://nvidianews.nvidia.com/news/nvidia-debuts-geforce-rtx-3060-family-for-the-holidays',
  nvLhr: 'https://blogs.nvidia.com/blog/lhr',
  g3dG6x: 'https://www.guru3d.com/news-story/nvidia-geforce-rtx-3060-ti-with-gddr6x-will-replace-the-gddr6-standard-model.html',
  asusCard: 'https://www.asus.com/us/motherboards-components/graphics-cards/dual/dual-rtx3060ti-8gd6x/techspec/',
  asusAbout: 'https://press.asus.com/aboutus',
  asusOffshore: 'https://www.tomshardware.com/tech-industry/asus-says-90-percent-of-pc-and-motherboard-production-has-been-offshored-from-china-to-blunt-tariffs-manufacturing-moved-to-thailand-vietnam-and-indonesia',
  micronG6x: 'https://techpowerup.com/271656/micron-announces-gddr6x-memory-powering-the-worlds-fastest-graphics-cards',
  micronTw: 'https://www.taipeitimes.com/News/biz/archives/2023/11/07/2003808781',
  upiIpo: 'https://www.taipeitimes.com/News/biz/archives/2022/01/14/2003771317',
  chipsCheese: 'https://old.chipsandcheese.com/2021/06/22/nvidias-ampere-process-technology-sunk-by-samsung/',
  jpr: 'https://www.techspot.com/news/109313-nvidia-hits-94-gpu-market-share-overall-shipments.html',
  endorfyCase: 'https://endorfy.com/en/product/signum-300-air/',
  endorfyFan: 'https://endorfy.com/en/product/stratus-120-pwm/',
  endorfyPsu: 'https://endorfy.com/en/product/vero-l5-bronze-600w/',
  endorfyBrand: 'https://www.eteknix.com/spc-gear-silentiumpc-rebrand-under-endorfy-name/',
  endorfyInterview: 'https://www.hwcooling.net/en/interview-why-endorfy-had-to-kill-silentiumpc/',
  asusMon: 'https://asus.com/displays-desktops/monitors/eye-care/va249he/techspec',
  pcmon: 'https://pcmonitors.info/asus/asus-va249he-eye-care-monitor-with-full-hd-va-panel/',
  auoAr: 'https://auo.com/upload/media/ir/2021_Annual_Report_EN.pdf',
  omdia: 'https://omdia.tech.informa.com/om029624/high-industry-penetration-of-the-top-three-tv-soc-vendors-and-leading-new-tv-product-features-expected-in-2023',
  tpuFlare: 'https://techpowerup.com/review/asus-rog-strix-flare/4.html',
  cherry: 'https://www.cherry.de/en-us/company',
  telcontarMx: 'https://telcontar.net/KBK/Cherry/MX',
  nxpDs: 'https://www.nxp.com/docs/en/data-sheet/LPC11U3X.pdf',
  nxpErrata: 'https://www.nxp.com/docs/en/errata/ES_LPC11U3X.pdf',
  nxpCbs: 'https://www.cbs.nl/-/media/_pdf/2022/46/cbs-worldcafevii_semiconductorsnxp.pdf',
  openrgb: 'https://gitlab.com/CalcProgrammer1/OpenRGB/-/issues/3551',
  deskthority: 'https://deskthority.net/viewtopic.php?p=509837',
  cmediaWiki: 'https://en.wikipedia.org/wiki/C-Media',
  cm108: 'https://mikrocontroller.net/attachment/192639/CM108_DataSheet_v1.6.pdf',
};

// Přibližné polohy (oblast, ne konkrétní důl, pokud není uvedeno jinak).
const P = {
  cnSi: { name: 'Čína (největší producent křemíku, oblast přibližně)', country: 'CN', lat: 35.86, lon: 104.2 },
  clCu: { name: 'Chile, region Antofagasta (hlavní těžba mědi, přibližně)', country: 'CL', lat: -24.3, lon: -69.1 },
  idSn: { name: 'Indonésie, Bangka (těžba cínu, přibližně)', country: 'ID', lat: -2.1, lon: 106.1 },
  cdTa: { name: 'DR Kongo, východ (těžba coltanu, přibližně)', country: 'CD', lat: -2.5, lon: 28.8 },
  cnRee: { name: 'Bayan Obo, Vnitřní Mongolsko (vzácné zeminy)', country: 'CN', lat: 41.78, lon: 109.97 },
  cnIn: { name: 'Čína (největší rafinace india, oblast přibližně)', country: 'CN', lat: 35.86, lon: 104.2 },
  auFe: { name: 'Pilbara, Austrálie (železná ruda, přibližně)', country: 'AU', lat: -22.5, lon: 118.5 },
  samsungHw: { name: 'Samsung, kampus Hwaseong', country: 'KR', lat: 37.22, lon: 127.07 },
  micronHiro: { name: 'Micron Memory Japan, Hiroshima', country: 'JP', lat: 34.45, lon: 132.79 },
  micronTc: { name: 'Micron Taiwan, Taichung', country: 'TW', lat: 24.3, lon: 120.72 },
  micronHq: { name: 'Micron, Boise (sídlo)', country: 'US', lat: 43.53, lon: -116.15 },
  nvidiaHq: { name: 'NVIDIA, Santa Clara (sídlo)', country: 'US', lat: 37.37, lon: -121.96 },
  asusHq: { name: 'ASUS, Taipei Beitou (sídlo)', country: 'TW', lat: 25.12, lon: 121.47 },
  upiHq: { name: 'uPI Semiconductor, Zhubei (Hsinchu)', country: 'TW', lat: 24.83, lon: 121.01 },
  auoHq: { name: 'AUO, Hsinchu Science Park (sídlo)', country: 'TW', lat: 24.78, lon: 121.01 },
  cherryAu: { name: 'Cherry, Auerbach in der Oberpfalz', country: 'DE', lat: 49.69, lon: 11.63 },
  ssmc: { name: 'SSMC, Singapur (odhad fabu)', country: 'SG', lat: 1.375, lon: 103.955 },
  nxpHq: { name: 'NXP, Eindhoven (sídlo)', country: 'NL', lat: 51.41, lon: 5.46 },
  wuxi: { name: 'Wuxi, Ťiang-su (sídlo dodavatele dle VID, přibližně)', country: 'CN', lat: 31.49, lon: 120.31 },
  cmedia: { name: 'C-Media, Taipei (sídlo)', country: 'TW', lat: 25.05, lon: 121.55 },
};

// Uzel dodávek; uzly fáze 5 dostanou to = undefined a klíč `to` se vynechá.
const n = (id, stage, name, to, src, fact, place) => ({ id, stage, name, ...(place ? { place } : {}), ...(to ? { to } : {}), src, fact });

export default {
  rtx3060ti: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemen a hutní křemík pro wafery GPU a DRAM', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('cu', 0, 'Měď pro vodiče DPS a substrátů', ['pcb'], S.usgsAll, 'estimate', P.clCu),
      n('sn', 0, 'Cín pro bezolovnatou pájku', ['smt'], S.usgsSn, 'estimate', P.idSn),
      n('ta', 0, 'Tantal (coltan) pro polymerové kondenzátory', ['smt'], S.usgsTa, 'estimate', P.cdTa),
      n('wafer', 2, 'Křemíkové wafery 300 mm (trh ovládá několik firem, hlavně Shin-Etsu a SUMCO)', ['ga104fab', 'dram'], S.wafers, 'estimate'),
      n('abf', 2, 'Izolační film ABF (Ajinomoto) pro pouzdrový substrát', ['subst'], S.abf, 'estimate'),
      n('ga104fab', 3, 'Wafery GA104, Samsung 8 nm (8N); pouzdření čipu u OSAT neověřeno', ['smt'], S.ked, 'doc', P.samsungHw),
      n('dram', 3, 'Paměti GDDR6X 8 Gb, Micron (konkrétní fab neověřen)', ['smt'], S.micronTw, 'estimate', P.micronTc),
      n('subst', 3, 'Pouzdrový substrát ABF (Unimicron, Ibiden, Nan Ya, Kinsus – kdo dodává pro GA104, neověřeno)', ['smt'], S.abf, 'estimate'),
      n('pcb', 3, 'Deska plošných spojů karty (výrobce neověřen)', ['smt'], S.asusCard, 'estimate'),
      n('smt', 4, 'Osazení DPS a montáž karty pro ASUS (závod neověřen; ASUS přesouvá výrobu z Číny do JV Asie)', ['asus'], S.asusOffshore, 'estimate'),
      n('asus', 5, 'ASUS Dual GeForce RTX 3060 Ti 8GB GDDR6X', undefined, S.asusCard, 'doc', P.asusHq),
    ],
    companies: [
      { name: 'NVIDIA', role: 'Návrh GPU GA104 a referenční specifikace RTX 3060 Ti', country: 'US', src: S.nvNews, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba GPU Ampere procesem 8 nm, údajně v Hwaseongu', country: 'KR', src: S.ked, fact: 'doc' },
      { name: 'Micron', role: 'Jediný výrobce pamětí GDDR6X', country: 'US', src: S.wikiGddr6, fact: 'doc' },
      { name: 'ASUS', role: 'Návrh a prodej karty Dual RTX 3060 Ti GDDR6X', country: 'TW', src: S.asusCard, fact: 'doc' },
      { name: 'uPI Semiconductor', role: 'Pravděpodobný dodavatel řadiče VRM (na této kartě neověřeno; ASUS je hlavní akcionář)', country: 'TW', src: S.upiIpo, fact: 'estimate' },
    ],
    timeline: [
      { date: '2020-09-01', text: 'NVIDIA představila řadu GeForce RTX 30 (Ampere).', src: S.wikiAmpere, fact: 'doc' },
      { date: '2020-12-01', text: 'Oznámena RTX 3060 Ti za 399 USD, rychlejší než RTX 2080 Super.', src: S.nvNews, fact: 'doc' },
      { date: '2020-12-02', text: 'Začátek prodeje RTX 3060 Ti s 8 GB GDDR6 14 Gb/s.', src: S.wikiRtx30, fact: 'doc' },
      { date: '2021-05-18', text: 'NVIDIA ohlásila verze LHR (omezený hashrate) mimo jiné pro RTX 3060 Ti.', src: S.nvLhr, fact: 'doc' },
      { date: '2022-10-27', text: 'Varianta RTX 3060 Ti GDDR6X: GA104-202, 19 Gb/s, 608 GB/s, TGP 200 W.', src: S.g3dG6x, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nedostatek GPU 2020–2022', text: 'Karty RTX 30 byly od uvedení až do roku 2022 nedostatkové; přispěli těžaři kryptoměn i nedostatek GDDR6.', src: S.wikiRtx30, fact: 'doc' },
      { title: 'Kryptoměnový boom a LHR', text: 'NVIDIA v květnu 2021 začala vyrábět RTX 3060 Ti s omezeným hashrate pro Ethereum, aby karty zůstaly hráčům.', src: S.nvLhr, fact: 'doc' },
      { title: 'Substráty ABF', text: 'Kapacita substrátů ABF nestačila poptávce; Unimicron měl v roce 2021 většinu kapacity rozdělenou do roku 2025.', src: S.abf, fact: 'estimate' },
    ],
    history: [
      { year: 2022, title: 'Přechod na GDDR6X', text: 'NVIDIA v říjnu 2022 potvrdila verze s GDDR6X jako další možnost pro partnery; paměť se zrychlila ze 14 na 19 Gb/s.', src: S.g3dG6x, fact: 'doc' },
    ],
    market: {
      category: 'Diskrétní grafické karty (AIB), podíl dodávek ve 2. čtvrtletí 2025 (JPR)',
      year: 2025,
      shares: [{ name: 'NVIDIA', pct: 94 }, { name: 'AMD', pct: 6 }, { name: 'Intel', pct: 0 }],
      src: S.jpr,
      fact: 'doc',
    },
  },

  ga104: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('cu', 0, 'Měď pro propoje na čipu a v substrátu', ['fab', 'subst'], S.usgsAll, 'estimate', P.clCu),
      n('sn', 0, 'Cín pro pájecí kuličky (bumpy)', ['pkg'], S.usgsSn, 'estimate', P.idSn),
      n('wafer', 2, 'Křemíkové wafery 300 mm (Shin-Etsu, SUMCO a další)', ['fab'], S.wafers, 'estimate'),
      n('abf', 2, 'Film ABF (Ajinomoto)', ['subst'], S.abf, 'estimate'),
      n('fab', 3, 'Výroba waferů GA104 procesem Samsung 8N (392 mm², 17,4 mld. tranzistorů)', ['pkg'], S.ked, 'doc', P.samsungHw),
      n('subst', 3, 'Substrát ABF pro flip-chip pouzdro (dodavatel neověřen)', ['pkg'], S.abf, 'estimate'),
      n('pkg', 4, 'Pouzdření a test GA104 (OSAT neověřen)', ['nvidia'], S.wikiAmpere, 'estimate'),
      n('nvidia', 5, 'NVIDIA GA104 (fabless návrh)', undefined, S.wikiAmpere, 'doc', P.nvidiaHq),
    ],
    companies: [
      { name: 'NVIDIA', role: 'Návrh čipu GA104 (architektura Ampere)', country: 'US', src: S.wikiAmpere, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba procesem 8N, podle KED v závodě Hwaseong', country: 'KR', src: S.ked, fact: 'doc' },
      { name: 'Ajinomoto', role: 'Výrobce izolačního filmu ABF pro substráty (obecně)', country: 'JP', src: S.abf, fact: 'estimate' },
      { name: 'Unimicron / Ibiden / Nan Ya PCB', role: 'Výrobci substrátů ABF (obecně, pro GA104 neověřeno)', country: 'TW', src: S.abf, fact: 'estimate' },
    ],
    timeline: [
      { date: '2020-05-14', text: 'NVIDIA ohlásila architekturu Ampere.', src: S.wikiAmpere, fact: 'doc' },
      { date: '2020-09-01', text: 'GeForce RTX 30 ohlášeny; spotřebitelské GPU Ampere vyrábí Samsung procesem 8N.', src: S.wikiAmpere, fact: 'doc' },
      { date: '2020-12-17', text: 'Korejský tisk: Samsung získal druhou zakázku NVIDIA na herní čipy 8 nm, výroba v Hwaseongu.', src: S.ked, fact: 'doc' },
      { date: '2021-05', text: 'Revize GA104-202 s vylepšeným omezovačem těžby (LHR).', src: S.wikiRtx30, fact: 'doc' },
      { date: '2022-10-27', text: 'GA104-202 v RTX 3060 Ti s pamětí GDDR6X.', src: S.g3dG6x, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Substráty ABF', text: 'Nedostatek substrátů ABF v letech 2020–2021 brzdil dodávky velkých čipů včetně GPU.', src: S.abf, fact: 'estimate' },
      { title: 'Jediná továrna', text: 'Všechny GPU RTX 30 vyráběl jen Samsung 8N, takže kapacita jedné foundry omezovala celou řadu.', src: S.wikiRtx30, fact: 'estimate' },
    ],
    history: [
      { year: 2020, title: 'Samsung místo TSMC', text: 'Chips and Cheese soudí, že NVIDIA zvolila Samsung 8 nm hlavně kvůli nižší ceně čipu, za cenu horší energetické účinnosti.', src: S.chipsCheese, fact: 'doc' },
    ],
    market: null,
  },

  gddr6x: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('cu', 0, 'Měď pro propoje', ['fabH', 'fabT'], S.usgsAll, 'estimate', P.clCu),
      n('wafer', 2, 'Křemíkové wafery 300 mm', ['fabH', 'fabT'], S.wafers, 'estimate'),
      n('fabH', 3, 'DRAM fab Micron Hiroshima (zda vyrábí GDDR6X, neověřeno)', ['at'], S.micronTw, 'estimate', P.micronHiro),
      n('fabT', 3, 'DRAM fab Micron A3 Taichung (zda vyrábí GDDR6X, neověřeno)', ['at'], S.micronTw, 'estimate', P.micronTc),
      n('at', 4, 'Pouzdření a test Micron v Taichungu (sondy, 3D pouzdření, test)', ['micron'], S.micronTw, 'estimate', P.micronTc),
      n('micron', 5, 'Micron GDDR6X 8 Gb (PAM4)', undefined, S.micronG6x, 'doc', P.micronHq),
    ],
    companies: [
      { name: 'Micron', role: 'Vyvinul a jako jediný vyrábí GDDR6X', country: 'US', src: S.wikiGddr6, fact: 'doc' },
      { name: 'NVIDIA', role: 'Jediný partner při uvedení GDDR6X (RTX 3080/3090)', country: 'US', src: S.wikiGddr6, fact: 'doc' },
      { name: 'Samsung', role: 'Konkurenční výrobce GDDR6 (ne GDDR6X)', country: 'KR', src: S.wikiGddr6, fact: 'estimate' },
      { name: 'SK hynix', role: 'Konkurenční výrobce GDDR6 (ne GDDR6X)', country: 'KR', src: S.wikiGddr6, fact: 'estimate' },
    ],
    timeline: [
      { date: '2018-06', text: 'Micron zahájil sériovou výrobu GDDR6 8 Gb (předchůdce GDDR6X).', src: S.wikiGddr6, fact: 'estimate' },
      { date: '2020-09-01', text: 'Micron ohlásil GDDR6X: 8 Gb, 19–21 Gb/s, první PAM4 v sériové paměti; debut v RTX 3080 a 3090.', src: S.micronG6x, fact: 'doc' },
      { date: '2022-04', text: 'Micron zahájil výrobu 16 Gb GDDR6X pro RTX 3090 Ti.', src: 'https://www.eejournal.com/industry_news/micron-gddr6x-increases-bandwidth-and-capacity/', fact: 'doc' },
      { date: '2022-10-27', text: 'GDDR6X 19 Gb/s nasazena v RTX 3060 Ti.', src: S.g3dG6x, fact: 'doc' },
      { date: '2024-06-04', text: 'Micron vzorkuje GDDR7 a uvádí přes pět let sériové výroby GDDR6X.', src: 'https://www.globenewswire.com/news-release/2024/06/04/2893502/14450/en/micron-samples-next-gen-graphics-memory-for-gaming-and-ai.html', fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Jediný dodavatel', text: 'GDDR6X vyrábí jen Micron a JEDEC ji nestandardizoval, takže karty s ní nemají náhradního dodavatele.', src: S.wikiGddr6, fact: 'doc' },
      { title: 'Nedostatek GDDR6 2020–2021', text: 'Globální nedostatek grafických pamětí patřil mezi příčiny nedostatku karet RTX 30.', src: S.wikiRtx30, fact: 'estimate' },
    ],
    history: [
      { year: 2020, title: 'PAM4 v paměti', text: 'GDDR6X přenáší dva bity na symbol (čtyři úrovně) místo jednoho; Micron uvádí přes 45 patentů.', src: S.micronG6x, fact: 'doc' },
    ],
    market: null,
  },

  up9512r: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('cu', 0, 'Měď pro vývodový rámeček pouzdra', ['pkg'], S.usgsAll, 'estimate', P.clCu),
      n('wafer', 2, 'Křemíkové wafery', ['fab'], S.wafers, 'estimate'),
      n('fab', 3, 'Výroba čipu ve smluvní foundry (neověřeno; UMC a PSMC jsou akcionáři uPI)', ['pkg'], S.upiIpo, 'estimate'),
      n('pkg', 4, 'Pouzdro VQFN 5×5 mm, 40 vývodů', ['upi'], 'https://www.datasheetcafe.com/up9512r-datasheet-pwm-controller/', 'estimate'),
      n('upi', 5, 'uPI uP9512R (návrh, fabless)', undefined, S.upiIpo, 'doc', P.upiHq),
    ],
    companies: [
      { name: 'uPI Semiconductor', role: 'Návrh řadičů napájení; založena 2005, sídlo Zhubei', country: 'TW', src: S.upiIpo, fact: 'doc' },
      { name: 'ASUS', role: 'Hlavní akcionář uPI (33,8 % k 9/2021)', country: 'TW', src: S.upiIpo, fact: 'doc' },
      { name: 'UMC', role: 'Akcionář uPI (8,54 %)', country: 'TW', src: S.upiIpo, fact: 'doc' },
      { name: 'Powerchip (PSMC)', role: 'Akcionář uPI (2,42 %)', country: 'TW', src: S.upiIpo, fact: 'doc' },
    ],
    timeline: [
      { date: '2005', text: 'Založení uPI Semiconductor.', src: S.upiIpo, fact: 'doc' },
      { date: '2019', text: 'uP9512R řídí 8 fází GPU na MSI RTX 2070 Super Gaming X.', src: 'https://www.techpowerup.com/review/msi-geforce-rtx-2070-super-gaming-x/4.html', fact: 'doc' },
      { date: '2022-01-13', text: 'uPI vstoupila na tchajwanskou burzu (TWSE 6719); tržby 2021 rekordních 5,95 mld. NT$.', src: S.upiIpo, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nedostatek čipů 2021–2022', text: 'Předseda uPI při vstupu na burzu očekával zmírnění nedostatku čipů až ve 2. pololetí 2022.', src: S.upiIpo, fact: 'doc' },
    ],
    history: [
      { year: 2020, title: 'Řadiče na kartách ASUS RTX 3060 Ti', text: 'Na ASUS RTX 3060 Ti STRIX OC řídí jádro MP2888A a paměť uP9512Q; řadič na kartě Dual uživatele je neověřený.', src: 'https://techpowerup.com/review/asus-geforce-rtx-3060-ti-strix-oc/3.html', fact: 'estimate' },
    ],
    market: null,
  },

  signum300: {
    checked: CHECKED,
    supply: [
      n('fe', 0, 'Železná ruda pro ocelový plech (obecně; typ skříně u uživatele jen odhad)', ['steel'], S.usgsAll, 'estimate', P.auFe),
      n('sand', 0, 'Křemičitý písek pro tvrzené sklo bočnice', ['glass'], S.usgsAll, 'estimate'),
      n('steel', 2, 'Ocelový plech skříně', ['asm'], S.endorfyCase, 'estimate'),
      n('glass', 2, 'Tvrzené sklo bočnice', ['asm'], S.endorfyCase, 'estimate'),
      n('fans', 3, 'Čtyři předinstalované ventilátory Stratus 120 PWM', ['asm'], S.endorfyCase, 'doc'),
      n('asm', 4, 'Výroba a montáž v Asii (Endorfy uvádí návrh v Polsku, místo výroby neuvádí)', ['endorfy'], S.endorfyInterview, 'estimate'),
      n('endorfy', 5, 'Endorfy Signum 300 Air (odhad typu skříně)', undefined, S.endorfyCase, 'doc'),
    ],
    companies: [
      { name: 'Endorfy (Cooling)', role: 'Polská značka, návrh a prodej skříně', country: 'PL', src: S.endorfyInterview, fact: 'doc' },
    ],
    timeline: [
      { date: '2022', text: 'Značka Endorfy nahradila SilentiumPC a SPC Gear.', src: S.endorfyBrand, fact: 'doc' },
      { date: '2022-11-17', text: 'Rozhovor: produkty jsou navrženy v Polsku, výrobní objemy elektroniky ale zajišťuje Asie.', src: S.endorfyInterview, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Výroba mimo Evropu', text: 'Endorfy uvádí, že Evropa nedokáže konkurovat asijským výrobním objemům; dodávky závisí na asijských výrobcích. U uživatele je typ skříně jen odhad.', src: S.endorfyInterview, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  stratus120: {
    checked: CHECKED,
    supply: [
      n('ree', 0, 'Vzácné zeminy pro magnet rotoru (obecně, NdFeB)', ['motor'], S.usgsRee, 'estimate', P.cnRee),
      n('cu', 0, 'Měď pro vinutí statoru', ['motor'], S.usgsAll, 'estimate', P.clCu),
      n('motor', 3, 'Motor s ložiskem FDB (MTBF 80 000 h podle výrobce)', ['asm'], S.endorfyFan, 'doc'),
      n('ic', 3, 'Řídicí obvod motoru a Hallův senzor (typ neověřen)', ['asm'], S.endorfyFan, 'estimate'),
      n('asm', 4, 'Montáž ventilátoru v Asii (místo neuvedeno)', ['endorfy'], S.endorfyInterview, 'estimate'),
      n('endorfy', 5, 'Endorfy Stratus 120 PWM (počet ve skříni je odhad)', undefined, S.endorfyFan, 'doc'),
    ],
    companies: [
      { name: 'Endorfy (Cooling)', role: 'Návrh a prodej ventilátoru, 200–1400 ot./min, PWM', country: 'PL', src: S.endorfyFan, fact: 'doc' },
    ],
    timeline: [
      { date: '2022', text: 'Ventilátory Stratus převzaty pod značku Endorfy po zániku SilentiumPC.', src: S.endorfyBrand, fact: 'estimate' },
      { date: '2022-11-17', text: 'Endorfy potvrzuje návrh v Polsku a výrobu v Asii.', src: S.endorfyInterview, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Magnety ze vzácných zemin', text: 'Těžbě a zpracování vzácných zemin dominuje Čína, na níž závisí magnety malých motorů.', src: S.usgsRee, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  vero_l5: {
    checked: CHECKED,
    supply: [
      n('cu', 0, 'Měď pro transformátor a tlumivky', ['mag'], S.usgsAll, 'estimate', P.clCu),
      n('sn', 0, 'Cín pro pájku', ['asm'], S.usgsSn, 'estimate', P.idSn),
      n('mag', 3, 'Transformátor a tlumivky (výrobce neověřen)', ['asm'], S.endorfyPsu, 'estimate'),
      n('cap', 3, 'Kondenzátory pro 105 °C', ['asm'], S.endorfyPsu, 'doc'),
      n('semi', 3, 'Výkonové polovodiče a řadiče PFC/PWM (typ neověřen)', ['asm'], S.endorfyPsu, 'estimate'),
      n('fan', 3, 'Ventilátor Stratus 120 mm s ložiskem FDB', ['asm'], S.endorfyPsu, 'doc'),
      n('asm', 4, 'Montáž u OEM výrobce (neuveden; typ zdroje u uživatele je odhad)', ['endorfy'], S.endorfyInterview, 'estimate'),
      n('endorfy', 5, 'Endorfy Vero L5 Bronze 600 W', undefined, S.endorfyPsu, 'doc'),
    ],
    companies: [
      { name: 'Endorfy (Cooling)', role: 'Návrh a prodej zdroje 80 PLUS Bronze, 87×140×150 mm', country: 'PL', src: S.endorfyPsu, fact: 'doc' },
    ],
    timeline: [
      { date: '2022', text: 'Vznik značky Endorfy, pod kterou vyšla řada zdrojů Vero.', src: S.endorfyBrand, fact: 'estimate' },
      { date: '2022-11-17', text: 'Endorfy uvádí návrh v Polsku a výrobu v Asii.', src: S.endorfyInterview, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Neznámý OEM', text: 'Výrobce platformy zdroje není veřejně uveden; typ zdroje u uživatele je navíc jen odhad podle štítku.', src: S.endorfyPsu, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  va249he: {
    checked: CHECKED,
    supply: [
      n('zn', 0, 'Zinková ruda (indium je vedlejší produkt)', ['in'], S.usgsIn, 'estimate'),
      n('in', 1, 'Rafinace india pro ITO elektrody panelu', ['panel'], S.usgsIn, 'estimate', P.cnIn),
      n('cu', 0, 'Měď pro desky a kabely', ['boards'], S.usgsAll, 'estimate', P.clCu),
      n('panel', 3, 'Panel VA 23,8" 1080p, pravděpodobně AUO M238HVN01.0', ['asm'], S.pcmon, 'estimate', P.auoHq),
      n('boards', 3, 'Deska scaleru a napájecí deska (typ neověřen)', ['asm'], S.asusMon, 'estimate'),
      n('asm', 4, 'Montáž monitoru (OEM výrobce neověřen)', ['asus'], S.asusMon, 'estimate'),
      n('asus', 5, 'ASUS VA249HE', undefined, S.asusMon, 'doc', P.asusHq),
    ],
    companies: [
      { name: 'ASUS', role: 'Značka a prodej monitoru', country: 'TW', src: S.asusAbout, fact: 'doc' },
      { name: 'AUO', role: 'Pravděpodobný výrobce panelu (podle PC Monitors, neověřeno)', country: 'TW', src: S.pcmon, fact: 'estimate' },
    ],
    timeline: [
      { date: '2017-12-07', text: 'PC Monitors hlásí dostupnost VA249HE: VA 1920×1080, 60 Hz, kontrast 3000:1, HDMI a VGA.', src: S.pcmon, fact: 'doc' },
      { date: '2017-12', text: 'PC Monitors uvádí jako pravděpodobný panel AUO M238HVN01.0 AMVA+.', src: S.pcmon, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Indium pro ITO', text: 'Rafinaci india vede Čína (760 t v roce 2024) před Koreou (180 t).', src: S.usgsIn, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  va249_scaler: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('wafer', 2, 'Křemíkové wafery', ['fab'], S.wafers, 'estimate'),
      n('fab', 3, 'Výroba čipu ve smluvní foundry (typ scaleru neznámý)', ['pkg'], S.omdia, 'estimate'),
      n('pkg', 4, 'Pouzdření (typicky QFP/QFN, neověřeno)', ['vendor'], 'https://wmsc.lcsc.com/wmsc/upload/file/pdf/v2/lcsc/2302131600_Realtek-Semicon-RTD2556QR-VL-CG_C5358192.pdf', 'estimate'),
      n('vendor', 5, 'Výrobce scaleru (neznámý; trhu vládnou Realtek, MediaTek, Novatek)', undefined, S.omdia, 'estimate'),
    ],
    companies: [
      { name: 'Realtek', role: 'Monitorové řadiče, např. RTD2556 (VGA, DP 1.2, HDMI 1.4)', country: 'TW', src: 'https://wmsc.lcsc.com/wmsc/upload/file/pdf/v2/lcsc/2302131600_Realtek-Semicon-RTD2556QR-VL-CG_C5358192.pdf', fact: 'estimate' },
      { name: 'MediaTek (MStar)', role: 'Čipy pro LCD; v roce 2012 převzala MStar', country: 'TW', src: 'https://www.mediatek.com/press-room/mediatek-inc-and-mstar-semiconductor-inc-announce-merger-agreement', fact: 'estimate' },
      { name: 'Novatek', role: 'Čipy pro displeje a TV', country: 'TW', src: S.omdia, fact: 'estimate' },
      { name: 'Parade Technologies', role: 'Monitorové řadiče s DisplayPort a HDMI', country: 'TW', src: 'https://www.paradetech.com/?p=4348', fact: 'estimate' },
    ],
    timeline: [
      { date: '2012-06-22', text: 'MediaTek vyhlásila nabídku na převzetí MStar, největšího dodavatele čipů pro LCD TV.', src: 'https://www.mediatek.com/press-room/mediatek-inc-announces-tender-offer-for-mstar-semiconductor-inc', fact: 'estimate' },
      { date: '2012-08', text: 'MediaTek získala 48 % MStar a dohodla plné sloučení.', src: 'https://www.taipeitimes.com/News/biz/archives/2012/08/15/2003540298', fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Koncentrace dodavatelů', text: 'Tři tchajwanské firmy (MediaTek, Novatek, Realtek) mají podle Omdia přes 70 % trhu čipů pro TV; u monitorů je situace podobná, čísla nemáme.', src: S.omdia, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  va249_panel: {
    checked: CHECKED,
    supply: [
      n('zn', 0, 'Zinková ruda (zdroj india)', ['in'], S.usgsIn, 'estimate'),
      n('in', 1, 'Rafinace india', ['ito'], S.usgsIn, 'estimate', P.cnIn),
      n('ito', 2, 'Terče ITO pro průhledné elektrody', ['cell'], S.usgsIn, 'estimate'),
      n('cell', 3, 'TFT pole a buňka VA (AUO, konkrétní fab neověřen; panel je odhad)', ['lcm'], S.auoAr, 'estimate', P.auoHq),
      n('lcm', 4, 'Montáž modulu LCM s podsvícením WLED (závod neověřen)', ['auo'], S.auoAr, 'estimate'),
      n('auo', 5, 'AUO M238HVN01.0 (odhad)', undefined, S.pcmon, 'estimate', P.auoHq),
    ],
    companies: [
      { name: 'AUO (AU Optronics)', role: 'Pravděpodobný výrobce panelu; sídlo a fabriky v Hsinchu, Taichungu a dalších místech Tchaj-wanu', country: 'TW', src: S.auoAr, fact: 'estimate' },
    ],
    timeline: [
      { date: '2017-12-07', text: 'PC Monitors uvádí, že VA249HE má nejspíš panel AUO M238HVN01.0 AMVA+ (8 bit bez FRC, 3000:1).', src: S.pcmon, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Indium', text: 'Rafinace india pro ITO je soustředěná v Číně (760 t z cca 1 100 t světové výroby v roce 2024).', src: S.usgsIn, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  strix_flare: {
    checked: CHECKED,
    supply: [
      n('cu', 0, 'Měď pro DPS a kabel', ['pcb'], S.usgsAll, 'estimate', P.clCu),
      n('sn', 0, 'Cín pro pájku', ['asm'], S.usgsSn, 'estimate', P.idSn),
      n('pcb', 3, 'DPS klávesnice a dceřiné desky', ['asm'], S.tpuFlare, 'doc'),
      n('mcu', 3, 'MCU NXP LPC11U37F (Cortex-M0, USB)', ['asm'], S.tpuFlare, 'doc'),
      n('sw', 3, 'Spínače Cherry MX RGB (Auerbach; barva u uživatele neznámá)', ['asm'], S.telcontarMx, 'estimate', P.cherryAu),
      n('asm', 4, 'Montáž klávesnice (OEM neověřen)', ['asus'], S.tpuFlare, 'estimate'),
      n('asus', 5, 'ASUS ROG Strix Flare', undefined, S.tpuFlare, 'doc', P.asusHq),
    ],
    companies: [
      { name: 'ASUS (ROG)', role: 'Návrh a prodej klávesnice', country: 'TW', src: S.tpuFlare, fact: 'doc' },
      { name: 'Cherry', role: 'Výrobce spínačů MX RGB; sídlo a továrna v Auerbachu', country: 'DE', src: S.cherry, fact: 'doc' },
      { name: 'NXP', role: 'Mikrokontrolér LPC11U37F', country: 'NL', src: S.tpuFlare, fact: 'doc' },
    ],
    timeline: [
      { date: '1983', text: 'Cherry uvedla spínač MX.', src: S.cherry, fact: 'estimate' },
      { date: '2018-01-09', text: 'ASUS představil ROG Strix Flare na CES 2018.', src: 'https://at-web1.www.anandtech.com/show/12277/asus-at-ces-2018-rog-strix-flare-keyboard-and-the-rog-spotlight-lights-up-vegas', fact: 'doc' },
      { date: '2018', text: 'Doporučená cena 179 USD, spínače Cherry MX RGB, podsvícení Aura Sync.', src: 'https://eteknix.com/asus-announces-rog-strix-flare-keyboard', fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Spínače z jedné továrny', text: 'Po ukončení výroby MX u Hirose (2014) se spínače MX vyráběly jen v Německu.', src: S.telcontarMx, fact: 'estimate' },
    ],
    history: [
      { year: 2019, title: 'Nová továrna Cherry', text: 'Cherry otevřela v Auerbachu nové sídlo a továrnu s větší kapacitou.', src: S.cherry, fact: 'estimate' },
    ],
    market: null,
  },

  lpc11u37: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('au', 0, 'Zlato pro bondovací drátky (obecně)', ['at'], S.usgsAu, 'estimate'),
      n('cu', 0, 'Měď pro vývodový rámeček', ['at'], S.usgsAll, 'estimate', P.clCu),
      n('wafer', 2, 'Křemíkové wafery 200 mm', ['fab'], S.wafers, 'estimate'),
      n('fab', 3, 'Výroba waferů (fab NXP neověřen; SSMC je společný podnik NXP a TSMC)', ['at'], 'https://bits-chips.com/article/when-the-cathedrals-bells-finally-fall-silent-just-move-on/', 'estimate', P.ssmc),
      n('at', 4, 'Pouzdření a test NXP v Asii (Tianjin, Kaohsiung, Bangkok, Kuala Lumpur; který závod, neověřeno)', ['nxp'], S.nxpCbs, 'estimate'),
      n('nxp', 5, 'NXP LPC11U37F', undefined, S.nxpDs, 'doc', P.nxpHq),
    ],
    companies: [
      { name: 'NXP Semiconductors', role: 'Výrobce MCU řady LPC11U3x', country: 'NL', src: S.nxpDs, fact: 'doc' },
      { name: 'Arm', role: 'Licence jádra Cortex-M0', country: 'GB', src: S.nxpDs, fact: 'doc' },
      { name: 'ASUS', role: 'Použití v klávesnici ROG Strix Flare', country: 'TW', src: S.tpuFlare, fact: 'doc' },
    ],
    timeline: [
      { date: '2018-01', text: 'LPC11U37F řídí klávesnici ROG Strix Flare (128 kB flash, 12 kB SRAM, 4 kB EEPROM).', src: S.tpuFlare, fact: 'doc' },
      { date: '2018-03-07', text: 'Errata LPC11U3x rev. 3.2 (týká se i LPC11U37FBD64).', src: S.nxpErrata, fact: 'doc' },
      { date: '2020-03-27', text: 'Datasheet LPC11U3x rev. 2.4: Cortex-M0 do 50 MHz, USB 2.0 full-speed device.', src: S.nxpDs, fact: 'doc' },
      { date: '2021-10', text: 'Distributoři hlásí MCU NXP řady LPC na alokaci, dodací lhůty NXP přes 52 týdnů.', src: 'https://info.fusionww.com/resources/the-greensheet-2021-october?hs_amp=true', fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nedostatek MCU 2021', text: 'Dodací lhůty MCU NXP přesáhly 52 týdnů a řada LPC byla na alokaci.', src: 'https://info.fusionww.com/resources/the-greensheet-2021-october?hs_amp=true', fact: 'doc' },
    ],
    history: [
      { year: 2006, title: 'NXP z Philips', text: 'NXP vznikla oddělením polovodičové divize Philips.', src: 'https://wikipedia.com/wiki/NXP', fact: 'estimate' },
    ],
    market: null,
  },

  usb_mouse: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemík pro čipy myši', ['ic'], S.usgsSi, 'estimate', P.cnSi),
      n('cu', 0, 'Měď pro kabel a DPS', ['ic'], S.usgsAll, 'estimate', P.clCu),
      n('ic', 3, 'MCU a optický senzor (typ neověřen; obecná USB HID myš)', ['asm'], 'https://www.epsglobal.com/products/semiconductors/sensing-and-haptics/optical-navigation', 'estimate'),
      n('asm', 4, 'Montáž v Číně (odhad)', ['oem'], S.deskthority, 'estimate'),
      n('oem', 5, 'Dodavatel s VID 30FA (Wuxi Instant Microelectronics podle hlášení uživatelů)', undefined, S.deskthority, 'estimate', P.wuxi),
    ],
    companies: [
      { name: 'Wuxi Instant Microelectronics', role: 'Firma, pod kterou se hlásí USB VID 30FA (podle uživatelů, neověřeno v registru USB-IF)', country: 'CN', src: S.deskthority, fact: 'estimate' },
      { name: 'Anko (Kmart Australia)', role: 'Prodává myš se stejným ID 30FA:1440 a dodavatelem INSTANT', country: 'AU', src: S.openrgb, fact: 'doc' },
      { name: 'PixArt', role: 'Běžný výrobce optických senzorů myší (pro tuto myš neověřeno)', country: 'TW', src: 'https://www.epsglobal.com/products/semiconductors/sensing-and-haptics/optical-navigation', fact: 'estimate' },
    ],
    timeline: [],
    bottlenecks: [
      { title: 'Bez dokumentace', text: 'U no-name myši nejsou veřejné údaje o čipech ani výrobci; typ součástek je jen odhad.', src: S.openrgb, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  usb_mic: {
    checked: CHECKED,
    supply: [
      n('si', 0, 'Křemík pro kodek', ['codec'], S.usgsSi, 'estimate', P.cnSi),
      n('cu', 0, 'Měď pro kabel a DPS', ['asm'], S.usgsAll, 'estimate', P.clCu),
      n('codec', 3, 'USB audio kodek C-Media (PID 0134, přesný typ neověřen; rodina CM108?)', ['asm'], S.cm108, 'estimate', P.cmedia),
      n('capsule', 3, 'Kondenzátorová kapsle s kardioidní charakteristikou (typ neověřen)', ['asm'], 'https://www.kitguru.net/?p=485795', 'estimate'),
      n('asm', 4, 'Montáž mikrofonu (výrobce neznámý)', ['oem'], 'https://www.kitguru.net/?p=485795', 'estimate'),
      n('oem', 5, 'USB mikrofon typu TONOR TC-777 (značka neověřena)', undefined, 'https://www.kitguru.net/?p=485795', 'estimate'),
    ],
    companies: [
      { name: 'C-Media Electronics', role: 'Výrobce USB audio kodeků; vlastní USB VID 0D8C', country: 'TW', src: S.cmediaWiki, fact: 'doc' },
      { name: 'TONOR', role: 'Prodejce mikrofonu TC-777, kterému typ odpovídá (neověřeno)', country: 'CN', src: 'https://www.kitguru.net/?p=485795', fact: 'estimate' },
    ],
    timeline: [
      { date: '1991', text: 'Založení C-Media v Tchaj-peji.', src: S.cmediaWiki, fact: 'doc' },
      { date: '2005-11-18', text: 'Správci NetBSD opravili tabulku USB: VID 0D8C patří C-Media.', src: 'https://mail-index.netbsd.org/tech-kern/2005/11/18/0012.html', fact: 'doc' },
    ],
    bottlenecks: [],
    history: [],
    market: null,
  },
};
