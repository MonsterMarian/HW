// Rešerše – viz index.js (schéma dat). Díly uživatelova PC (i7-9700, PRIME B360-PLUS, HyperX Fury).
const C = '2026-11-13';
const P = (name, country, lat, lon) => ({ name, country, lat, lon });

// Zdroje použité u více dílů.
const S = {
  ark9700: 'https://www.intel.com/content/www/us/en/products/sku/191792/intel-core-i79700-processor-12m-cache-up-to-4-70-ghz/specifications.html',
  arkB360: 'https://www.intel.com/content/www/us/en/products/sku/133332/intel-b360-chipset/specifications.html',
  intelSites: 'https://en.wikipedia.org/wiki/List_of_Intel_manufacturing_sites',
  swan: 'https://www.theregister.com/2018/09/28/intel_chip_shortage/',
  conflict: 'https://amp.cbc.ca/news/science/intel-says-processors-now-free-of-conflict-minerals-1.2486836',
  coffee: 'https://en.wikipedia.org/wiki/Coffee_Lake',
  wikichip9: 'https://fuse.wikichip.org/?p=1711',
  pcn9: 'https://www.pcworld.com/article/3600461/intel-sounds-the-death-knell-for-its-9th-gen-core-chips.html',
  b365: 'https://www.tomshardware.com/news/intel-b365-chipset-specs,38235.html',
  b365g3d: 'https://www.guru3d.com/story/intel-b365-new-chipset-is-similar-to-z170-at-22nm-manufacturing/',
  mercury: 'https://techpowerup.com/263612/amd-desktop-processor-market-share-now-at-18-3-mercury-research',
  shortage: 'https://en.wikipedia.org/wiki/Global_chip_shortage',
  spruce: 'https://en.wikipedia.org/wiki/Spruce_Pine,_North_Carolina',
  wacker: 'https://en.wikipedia.org/wiki/Wacker_Chemie',
  shinetsu: 'https://en.wikipedia.org/wiki/Shin-Etsu_Chemical',
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf',
  escondida: 'https://en.wikipedia.org/wiki/Escondida',
  bangka: 'https://en.wikipedia.org/wiki/Bangka_Island',
  coltan: 'https://en.wikipedia.org/wiki/Coltan',
  bauxite: 'https://www.usgs.gov/centers/national-minerals-information-center/bauxite-and-alumina',
  mbdb: 'https://motherboarddb.com/motherboards/1141/Prime%20B360-Plus',
  asusCpu: 'https://www.asus.com/de/supportonly/prime%20b360-plus/helpdesk_cpu/',
  asusWiki: 'https://en.wikipedia.com/wiki/ASUS',
  asusSuzhou: 'https://www.digitimes.com/news/a2000111615090.html',
  pegatron: 'https://en.wikipedia.org/wiki/Pegatron',
  mbShip: 'https://www.dvhardware.net/article70339.html',
  ecat: 'https://e-catalog.com/cmp/18854/b360-pro4-vs-prime-b360-plus/',
  kitguruVrm: 'https://www.kitguru.net/components/motherboard/ryan-martin/asus-rog-strix-z390-e-gaming-motherboard-review/',
  nuvWiki: 'https://en.wikipedia.org/wiki/Nuvoton',
  nuvFoundry: 'https://tmall.nuvoton.com/foundry-service/about-us',
  nuvEsg: 'https://esg.nuvoton.com/uploads/files/shares/Resources/Downloads/2024_ESG_Report/2024_NuvoTon_ESG_report_EN_CH1.pdf',
  nct: 'https://direct.nuvoton.com/en/nct6796d-e',
  nctLcsc: 'https://www.lcsc.com/product-detail/Interface-Specialized_Nuvoton-Tech-NCT6796D-E_C3215467.html',
  nctKernel: 'https://docs.kernel.org/6.9/hwmon/nct6775.html',
  nctCoreboot: 'https://forge.a-lec.org/GNUBoot/coreboot-kgpe-d16/src/commit/3d4fbf763f09924b219b3bbf70c2a8a6532c4c80/util/superiotool/nuvoton.c',
  winbondSpin: 'https://www.ciol.com/winbond-spin-nuvoton-logic-ic',
  realtekWiki: 'https://en.wikipedia.org/wiki/Realtek',
  realtekFoundry: 'https://www.digitimes.com/news/a20220105PD211.html',
  realtekShort: 'https://techpowerup.com/280935/realtek-also-experiences-chip-shortage-could-reflect-badly-on-pc-market',
  umc: 'https://www.umc.com/en/About/about_overview',
  rtlDs: 'https://static.chipdip.ru/lib/607/DOC041607720.pdf',
  rtlLcsc: 'https://www.lcsc.com/product-detail/C2761340.html',
  alcDs: 'https://elparts.mekweb.eu/ds/ALC887.pdf',
  alcCafe: 'https://www.datasheetcafe.com/alc887-datasheet-audio-codec-realtek/',
  asmWiki: 'https://en.wikipedia.org/wiki/ASMedia_Technology',
  asmDs: 'https://ftp.mirrorservice.org/sites/www.bitsavers.org/components/asmedia/Asmedia_ASM1083_PCI-E_to_PCI_Bridge_2008.pdf',
  asmBug: 'https://bugzilla.kernel.org/show_bug.cgi?id=208667',
  asmOsmo: 'https://projects.osmocom.org/projects/retronetworking/wiki/PCIe-%3EPCI_bridges',
  winbondWiki: 'https://en.wikipedia.org/wiki/Winbond',
  macronixWiki: 'https://en.wikipedia.org/wiki/Macronix',
  nor: 'https://semiconductor-digest.com/?p=19449',
  coolGalaxus: 'https://www.galaxus.it/en/s1/product/intel-e97379-003-4870-mm-cpu-coolers-34506075',
  coolAxiom: 'https://axiomgaming.net/product/intel-e97379-003/',
  coolMedics: 'https://cpumedics.com/intel-e97379-003-cpu-heatsink-fan-cooler-for-intel-sockets-lga1150-lga1151-lga1155-lga1156',
  furyDs: 'https://www.kingston.com/datasheets/HX426C16FB3_8.pdf',
  furyLaunch: 'https://www.techpowerup.com/210341/hyperx-releases-fury-ddr4-memory-adds-high-capacity-predator-ddr4-kits',
  furyBrand: 'https://www.kingston.com/en/company/press/article/63152',
  hpHyperx: 'https://press.hp.com/us/en/press-releases/2021/hp-inc-completes-acquisition-of-hyperx.html',
  kingWiki: 'https://en.wikipedia.org/wiki/Kingston_Technology',
  kingHsinchu: 'https://techgage.com/print/taking_a_tour_of_kingstons_hsinchu_factory',
  kingShanghai: 'https://hardwaresecrets.com/kingston-factory-tour-in-shanghai-china/',
  modules2019: 'https://www.trendforce.com/presscenter/news/20200826-10457.html',
  furyRgbChips: 'https://nikktech.com/main/articles/pc-hardware/memory-kits/10963-hyperx-fury-rgb-64gb-ddr4-2666mhz-cl15-quad-channel-kit-review',
  dram1q19: 'https://www.trendforce.com/presscenter/news/20190528-10140.html',
  ddr4Wiki: 'https://en.wikipedia.org/wiki/DDR4_SDRAM',
  micronTw: 'https://taipeitimes.com/News/biz/archives/2023/11/07/2003808781',
  hynixWiki: 'https://en.wikipedia.org/wiki/SK_Hynix',
  spdMicrochip: 'https://ir.microchip.com/news-events/press-releases/detail/707/microchip-unveils-4kb-serial-presence-detect-eeprom-for-ddr4-sdram-modules',
  spdOnsemi: 'https://www.onsemi.com/products/standard-products/eeprom/n34c04',
  spdAblic: 'https://ablic.com/en/semicon/products/memory/dimm-serial-eeprom-spd/intro',
  spdLinux: 'https://gbmc.googlesource.com/linux/+/refs/heads/master/drivers/misc/eeprom/ee1004.c',
  gpuAsus: 'https://asus.com/sg/News/pfltyt0nabp3o4sj',
  p100Tpu: 'https://techpowerup.com/gpu-specs/tesla-p100-pcie-16-gb.c2888',
  p100Ds: 'https://images.nvidia.com/content/tesla/pdf/NV-tesla-p100-pcie-PB-08248-001-v01.pdf',
  p100Fab: 'https://sysrqmts.com/gpus/nvidia/tesla/p100-pcie-16-gb',
};

const HSINCHU = P('Hsinchu Science Park', 'TW', 24.78, 121.01);

export default {
  my_pc: {
    checked: C,
    supply: [
      { id: 'cpu', stage: 3, name: 'Intel Core i7-9700 (14 nm, Coffee Lake)', to: ['build'], src: S.ark9700, fact: 'doc' },
      { id: 'mb', stage: 3, name: 'ASUS PRIME B360-PLUS (Intel B360)', to: ['build'], src: S.mbdb, fact: 'doc' },
      { id: 'ram', stage: 3, name: 'Kingston HyperX Fury 8 GB DDR4-2666 (1Rx8)', to: ['build'], src: S.furyDs, fact: 'doc' },
      { id: 'gpu', stage: 3, name: 'ASUS Dual GeForce RTX 3060 Ti (GA104, Samsung 8 nm)', to: ['build'], src: S.gpuAsus, fact: 'doc' },
      { id: 'cool', stage: 3, name: 'Boxový chladič Intel E97379-003 (typ odhadnut)', to: ['build'], src: S.coolGalaxus, fact: 'estimate' },
      { id: 'build', stage: 4, name: 'Montáž sestavy (CPU podporovaný deskou podle seznamu ASUS)', to: ['pc'], src: S.asusCpu, fact: 'estimate' },
      { id: 'pc', stage: 5, name: 'Vlastní sestava uživatele', src: S.asusCpu, fact: 'estimate' },
    ],
    companies: [
      { name: 'Intel', role: 'CPU a čipset B360', country: 'US', src: S.ark9700, fact: 'doc' },
      { name: 'ASUS', role: 'základní deska a grafická karta', country: 'TW', src: S.asusWiki, fact: 'doc' },
      { name: 'Kingston Technology', role: 'paměťový modul HyperX Fury', country: 'US', src: S.kingWiki, fact: 'doc' },
      { name: 'NVIDIA', role: 'GPU GA104 (výroba Samsung 8 nm)', country: 'US', src: S.gpuAsus, fact: 'doc' },
      { name: 'Realtek', role: 'síťový čip RTL8111H a audio kodek ALC887 na desce', country: 'TW', src: S.mbdb, fact: 'doc' },
    ],
    timeline: [
      { date: '2015-03', text: 'HyperX uvádí řadu FURY DDR4 (2133–2666 MT/s).', src: S.furyLaunch, fact: 'doc' },
      { date: '2018', text: 'Uvedení desky ASUS PRIME B360-PLUS.', src: S.mbdb, fact: 'doc' },
      { date: '2019', text: 'Uvedení Core i7-9700 (Q2 2019).', src: S.ark9700, fact: 'doc' },
      { date: '2020-12', text: 'ASUS ohlašuje karty Dual GeForce RTX 3060 Ti.', src: S.gpuAsus, fact: 'doc' },
      { date: '2021-06', text: 'Kingston prodal HyperX firmě HP; paměti dál prodává jako Kingston FURY.', src: S.hpHyperx, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nedostatek 14 nm kapacity Intelu', text: 'V roce 2018 Intel přiznal nedostatek 14 nm čipů a přednostně vyráběl Core a Xeon.', src: S.swan, fact: 'doc' },
      { title: 'Čipová krize 2020–2023', text: 'Pandemie, sucho na Tchaj-wanu a růst poptávky po PC omezily dodávky čipů.', src: S.shortage, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  my_pc_p100: {
    checked: C,
    supply: [
      { id: 'base', stage: 3, name: 'Sestava i7-9700 + PRIME B360-PLUS', to: ['build'], src: S.mbdb, fact: 'doc' },
      { id: 'p100', stage: 3, name: '2× NVIDIA Tesla P100 PCIe 16 GB (GP100, TSMC 16 nm)', to: ['build'], src: S.p100Ds, fact: 'doc' },
      { id: 'build', stage: 4, name: 'Montáž karet do slotů PCIEX16_1 (x16) a PCIEX16_2 (x4)', to: ['pc'], src: S.mbdb, fact: 'estimate' },
      { id: 'pc', stage: 5, name: 'Návrh sestavy uživatele', src: S.mbdb, fact: 'estimate' },
    ],
    companies: [
      { name: 'NVIDIA', role: 'akcelerátor Tesla P100', country: 'US', src: S.p100Ds, fact: 'doc' },
      { name: 'TSMC', role: 'výroba GPU GP100 (16 nm)', country: 'TW', src: S.p100Fab, fact: 'doc' },
    ],
    timeline: [
      { date: '2016-06-20', text: 'Uvedení Tesla P100 PCIe 16 GB (GP100, 16 nm, HBM2).', src: S.p100Tpu, fact: 'doc' },
      { date: '2016', text: 'NVIDIA ohlašuje PCIe verzi P100 s dodávkami ve 4. čtvrtletí 2016.', src: 'https://hothardware.com/news/nvidia-announces-tesla-p100-pci-express-card-shipping-q4', fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Druhý slot jen x4', text: 'Druhý slot PCIe x16 na PRIME B360-PLUS běží jen v režimu x4, což omezí propustnost druhé P100.', src: S.mbdb, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  b360_plus: {
    checked: C,
    supply: [
      { id: 'cu', stage: 0, name: 'Měď (spoje DPS) – např. důl Escondida', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['asm'], src: S.escondida, fact: 'estimate' },
      { id: 'sn', stage: 0, name: 'Cín (pájka) – např. ostrov Bangka', place: P('Bangka', 'ID', -2.25, 106.0), to: ['asm'], src: S.bangka, fact: 'estimate' },
      { id: 'pch', stage: 3, name: 'Intel B360 PCH', to: ['asm'], src: S.arkB360, fact: 'doc' },
      { id: 'nct', stage: 3, name: 'Nuvoton NCT6796D (Super I/O)', place: HSINCHU, to: ['asm'], src: S.nct, fact: 'doc' },
      { id: 'rtl', stage: 3, name: 'Realtek RTL8111H (LAN 1 Gb/s)', place: HSINCHU, to: ['asm'], src: S.mbdb, fact: 'doc' },
      { id: 'alc', stage: 3, name: 'Realtek ALC887 (HD Audio 7.1)', place: HSINCHU, to: ['asm'], src: S.mbdb, fact: 'doc' },
      { id: 'asm1083', stage: 3, name: 'ASMedia ASM1083 (most PCIe → PCI pro 2 sloty PCI)', to: ['asm'], src: S.asmDs, fact: 'doc' },
      { id: 'asm', stage: 4, name: 'Osazení a montáž desky – ASUS Suzhou nebo ODM (nedoloženo)', place: P('Suzhou', 'CN', 31.30, 120.62), to: ['asus'], src: S.asusSuzhou, fact: 'estimate' },
      { id: 'asus', stage: 5, name: 'ASUS (ASUSTeK Computer)', place: P('Peitou, Tchaj-pej', 'TW', 25.12, 121.47), src: S.asusWiki, fact: 'doc' },
    ],
    companies: [
      { name: 'ASUS', role: 'návrh a značka desky', country: 'TW', src: S.asusWiki, fact: 'doc' },
      { name: 'Intel', role: 'čipset B360 a podporované CPU', country: 'US', src: S.arkB360, fact: 'doc' },
      { name: 'Realtek', role: 'LAN RTL8111H, audio ALC887', country: 'TW', src: S.mbdb, fact: 'doc' },
      { name: 'Nuvoton', role: 'Super I/O NCT6796D', country: 'TW', src: S.nuvWiki, fact: 'doc' },
      { name: 'ASMedia', role: 'most PCIe → PCI (dceřiná firma ASUS)', country: 'TW', src: S.asmWiki, fact: 'doc' },
      { name: 'Pegatron', role: 'bývalý výrobce desek ASUS (odštěpen 2008–2010); pro tuto desku nedoloženo', country: 'TW', src: S.pegatron, fact: 'estimate' },
    ],
    timeline: [
      { date: '2018', text: 'Uvedení desky (Intel B360, LGA1151, ATX).', src: S.mbdb, fact: 'doc' },
      { date: '2018', text: 'Čipset B360 uveden v Q2 2018.', src: S.arkB360, fact: 'doc' },
      { date: '2018-12', text: 'Intel přidává B365 vyráběný na 22 nm, aby uvolnil 14 nm kapacitu.', src: S.b365g3d, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Čipsety Intel 2018–2019', text: 'Nedostatek 14 nm kapacity vedl Intel k přesunu části čipsetů zpět na 22 nm (B365, H310C).', src: S.b365, fact: 'doc' },
      { title: 'Nedostatek čipů Realtek', text: 'Realtek od 2. pol. 2020 nestíhal poptávku po LAN a audio čipech, které jsou na většině desek.', src: S.realtekShort, fact: 'doc' },
    ],
    history: [
      { year: 2008, title: 'Odštěpení Pegatronu', text: 'ASUS v lednu 2008 vyčlenil výrobu desek pro OEM do Pegatronu, formálně odštěpeného v červnu 2010.', src: S.pegatron, fact: 'doc' },
    ],
    market: { category: 'Značkové základní desky (dodávky kusů)', year: 2018, shares: [
      { name: 'ASUS', pct: 36 }, { name: 'Gigabyte', pct: 25 }, { name: 'MSI', pct: 15 }, { name: 'ASRock', pct: 10 }, { name: 'Ostatní', pct: 14 },
    ], src: S.mbShip, fact: 'doc' },
  },

  b360_pch: {
    checked: C,
    supply: [
      { id: 'q', stage: 0, name: 'Vysoce čistý křemen', place: P('Spruce Pine', 'US', 35.91, -82.07), to: ['poly'], src: S.spruce, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (propoje, substrát)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['fab24', 'fab32'], src: S.escondida, fact: 'estimate' },
      { id: 'ttg', stage: 1, name: 'Kovy 3TG (Ta, Sn, W, Au) z auditovaných hutí', to: ['at_cd', 'at_vn'], src: S.conflict, fact: 'doc' },
      { id: 'poly', stage: 1, name: 'Elektronický polykrystalický křemík (např. Wacker)', place: P('Burghausen', 'DE', 48.17, 12.83), to: ['wafer'], src: S.wacker, fact: 'estimate' },
      { id: 'wafer', stage: 2, name: '300mm křemíkové wafery (např. Shin-Etsu)', place: P('Tokio (sídlo)', 'JP', 35.68, 139.76), to: ['fab24', 'fab32'], src: S.shinetsu, fact: 'estimate' },
      { id: 'fab24', stage: 3, name: 'Intel Fab 24 (14 nm)', place: P('Leixlip', 'IE', 53.37, -6.52), to: ['at_cd', 'at_vn'], src: S.intelSites, fact: 'estimate' },
      { id: 'fab32', stage: 3, name: 'Intel Fab 32 (14 nm)', place: P('Chandler, Arizona', 'US', 33.27, -111.88), to: ['at_cd', 'at_vn'], src: S.intelSites, fact: 'estimate' },
      { id: 'at_cd', stage: 4, name: 'Intel montáž a test CD1/CD6', place: P('Čcheng-tu', 'CN', 30.73, 103.97), to: ['intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'at_vn', stage: 4, name: 'Intel montáž a test VNAT', place: P('Ho Či Minovo Město', 'VN', 10.85, 106.80), to: ['intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'intel', stage: 5, name: 'Intel', place: P('Santa Clara', 'US', 37.39, -121.96), src: S.arkB360, fact: 'doc' },
    ],
    companies: [
      { name: 'Intel', role: 'návrh i výroba čipsetu (vlastní fab)', country: 'US', src: S.arkB360, fact: 'doc' },
      { name: 'Wacker Chemie', role: 'elektronický polykrystalický křemík (typický dodavatel)', country: 'DE', src: S.wacker, fact: 'estimate' },
      { name: 'Shin-Etsu Chemical', role: 'křemíkové wafery – největší podíl na trhu', country: 'JP', src: S.shinetsu, fact: 'estimate' },
    ],
    timeline: [
      { date: '2018', text: 'Uvedení B360 (Q2 2018), TDP 6 W; dnes ukončený.', src: S.arkB360, fact: 'doc' },
      { date: '2018-12', text: 'Intel uvádí B365 na 22 nm jako náhradu B360 kvůli uvolnění 14 nm linek.', src: S.b365, fact: 'doc' },
    ],
    bottlenecks: [
      { title: '14 nm kapacita 2018–2019', text: 'Intel dával přednost velkým čipům Core a Xeon; čipsety se přesouvaly na 22 nm.', src: S.swan, fact: 'doc' },
    ],
    history: [
      { year: 2014, title: 'Procesory bez konfliktních minerálů', text: 'Intel na CES 2014 oznámil, že kovy 3TG v jeho čipech a pouzdrech pocházejí z ověřených hutí.', src: S.conflict, fact: 'doc' },
    ],
    market: null,
  },

  nct6796d: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík (Čína ~80 % světové produkce)', to: ['fab'], src: S.usgsSi, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (vývodový rámeček)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['pkg'], src: S.escondida, fact: 'estimate' },
      { id: 'fab', stage: 3, name: 'Nuvoton 6palcový fab (bývalý Winbond FAB2) – pro tento čip nedoloženo', place: HSINCHU, to: ['pkg'], src: S.nuvFoundry, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdro LQFP-128 (subdodavatel neznámý)', to: ['nuv'], src: S.nctLcsc, fact: 'doc' },
      { id: 'nuv', stage: 5, name: 'Nuvoton Technology', place: HSINCHU, src: S.nuvEsg, fact: 'doc' },
    ],
    companies: [
      { name: 'Nuvoton Technology', role: 'návrh a výrobce Super I/O', country: 'TW', src: S.nuvWiki, fact: 'doc' },
      { name: 'Winbond Electronics', role: 'mateřská firma, z níž byl Nuvoton vyčleněn', country: 'TW', src: S.winbondWiki, fact: 'doc' },
      { name: 'ASUS', role: 'odběratel (PRIME B360-PLUS)', country: 'TW', src: S.asusWiki, fact: 'estimate' },
    ],
    timeline: [
      { date: '2008-07', text: 'Winbond vyčleňuje logické IC do nové firmy Nuvoton.', src: S.winbondSpin, fact: 'doc' },
      { date: '2010-09', text: 'Nuvoton vstupuje na tchajwanskou burzu.', src: S.nuvWiki, fact: 'doc' },
      { date: '2020-09', text: 'Nuvoton kupuje polovodičovou divizi Panasonicu za 250 mil. USD.', src: S.nuvWiki, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Datasheet jen na vyžádání', text: 'Dokumentace Linuxu uvádí datasheet NCT6796D jako dostupný od Nuvotonu na vyžádání; coreboot cituje veřejnou verzi 0.6.', src: S.nctKernel, fact: 'doc' },
    ],
    history: [
      { year: 2018, title: 'Podpora v open source', text: 'Ovladač nct6775 v Linuxu a nástroj superiotool v corebootu umějí NCT6796D číst (teploty, otáčky, napětí).', src: S.nctCoreboot, fact: 'doc' },
    ],
    market: null,
  },

  rtl8111h: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík (Čína ~80 % světové produkce)', to: ['umc', 'tsmc'], src: S.usgsSi, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (rámeček, propoje)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['pkg'], src: S.escondida, fact: 'estimate' },
      { id: 'umc', stage: 3, name: 'UMC (slévárna Realteku) – pro tento čip nedoloženo', place: P('Hsinchu Science Park (UMC)', 'TW', 24.78, 121.02), to: ['pkg'], src: S.realtekFoundry, fact: 'estimate' },
      { id: 'tsmc', stage: 3, name: 'TSMC (slévárna Realteku) – pro tento čip nedoloženo', place: P('Hsinchu (TSMC)', 'TW', 24.77, 121.01), to: ['pkg'], src: S.realtekFoundry, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdro QFN-32 4×4 mm (subdodavatel neznámý)', to: ['rtk'], src: S.rtlLcsc, fact: 'doc' },
      { id: 'rtk', stage: 5, name: 'Realtek Semiconductor (fabless)', place: HSINCHU, src: S.realtekWiki, fact: 'doc' },
    ],
    companies: [
      { name: 'Realtek Semiconductor', role: 'návrh čipu (fabless)', country: 'TW', src: S.realtekWiki, fact: 'doc' },
      { name: 'UMC', role: 'slévárna s dlouhodobou smlouvou s Realtekem', country: 'TW', src: S.umc, fact: 'estimate' },
      { name: 'TSMC', role: 'slévárna s dlouhodobou smlouvou s Realtekem', country: 'TW', src: S.realtekFoundry, fact: 'estimate' },
    ],
    timeline: [
      { date: '2014-08', text: 'Datasheet RTL8111H/RTL8111HS rev. 1.2 – Gigabit Ethernet pro PCIe x1.', src: S.rtlDs, fact: 'doc' },
      { date: '2018', text: 'Použit na desce ASUS PRIME B360-PLUS.', src: S.mbdb, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nedostatek čipů Realtek 2020–2022', text: 'Realtek od 2. pol. 2020 nestíhal poptávku; jeho LAN a audio čipy jsou podle zpráv v 70 % notebooků.', src: S.realtekShort, fact: 'doc' },
    ],
    history: [
      { year: 2013, title: 'Levný standard OEM', text: 'Řada RTL8111 se stala oblíbenou volbou výrobců desek díky nízké ceně a základní výbavě.', src: S.realtekWiki, fact: 'doc' },
    ],
    market: null,
  },

  alc887: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík (Čína ~80 % světové produkce)', to: ['umc', 'tsmc'], src: S.usgsSi, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (rámeček)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['pkg'], src: S.escondida, fact: 'estimate' },
      { id: 'umc', stage: 3, name: 'UMC – pro tento čip nedoloženo', place: P('Hsinchu Science Park (UMC)', 'TW', 24.78, 121.02), to: ['pkg'], src: S.realtekFoundry, fact: 'estimate' },
      { id: 'tsmc', stage: 3, name: 'TSMC – pro tento čip nedoloženo', place: P('Hsinchu (TSMC)', 'TW', 24.77, 121.01), to: ['pkg'], src: S.realtekFoundry, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdro LQFP-48 (subdodavatel neznámý)', to: ['rtk'], src: S.alcCafe, fact: 'doc' },
      { id: 'rtk', stage: 5, name: 'Realtek Semiconductor (fabless)', place: HSINCHU, src: S.realtekWiki, fact: 'doc' },
    ],
    companies: [
      { name: 'Realtek Semiconductor', role: 'návrh kodeku (fabless)', country: 'TW', src: S.realtekWiki, fact: 'doc' },
      { name: 'UMC / TSMC', role: 'slévárny Realteku (pro ALC887 nedoloženo)', country: 'TW', src: S.realtekFoundry, fact: 'estimate' },
    ],
    timeline: [
      { date: '2008-07-24', text: 'Datasheet ALC887 rev. 1.0 – 7.1kanálový HD Audio kodek se dvěma SPDIF výstupy.', src: S.alcDs, fact: 'doc' },
      { date: '2018', text: 'Použit na desce ASUS PRIME B360-PLUS (verze VD2).', src: S.mbdb, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nedostatek čipů Realtek 2020–2022', text: 'Audio a LAN čipy Realteku byly během čipové krize nedostatkové.', src: S.realtekShort, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  asm1083: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík (Čína ~80 % světové produkce)', to: ['fab'], src: S.usgsSi, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (rámeček)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['pkg'], src: S.escondida, fact: 'estimate' },
      { id: 'fab', stage: 3, name: 'Externí slévárna (ASMedia je fabless; konkrétní nedoložena)', to: ['pkg'], src: S.asmWiki, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdro LQFP-128', to: ['asmedia'], src: S.asmDs, fact: 'doc' },
      { id: 'asmedia', stage: 5, name: 'ASMedia Technology', place: P('Nová Tchaj-pej', 'TW', 25.01, 121.46), src: S.asmWiki, fact: 'doc' },
    ],
    companies: [
      { name: 'ASMedia Technology', role: 'návrh čipu (fabless)', country: 'TW', src: S.asmWiki, fact: 'doc' },
      { name: 'ASUS', role: 'mateřská firma ASMedia a odběratel', country: 'TW', src: S.asmWiki, fact: 'doc' },
    ],
    timeline: [
      { date: '2004', text: 'Založení ASMedia jako dceřiné firmy ASUS.', src: S.asmWiki, fact: 'doc' },
      { date: '2008', text: 'Datasheet ASM1083: most PCIe x1 → 32bitové PCI 33 MHz, bez podpory ASPM.', src: S.asmDs, fact: 'doc' },
      { date: '2020-07', text: 'Linux zavádí quirk, který vypíná ASPM na ASM1083/1085 kvůli chybám AER.', src: S.asmBug, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Problémy s přerušeními', text: 'Některé revize ASM1083/1085 mají potíže s obsluhou přerušení a s ASPM.', src: S.asmOsmo, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  bios_spi: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík (Čína ~80 % světové produkce)', to: ['wb', 'mx'], src: S.usgsSi, fact: 'estimate' },
      { id: 'wb', stage: 3, name: 'Winbond – vlastní fab (kandidát, nedoloženo)', place: P('Tchaj-čung', 'TW', 24.21, 120.62), to: ['maker'], src: S.winbondWiki, fact: 'estimate' },
      { id: 'mx', stage: 3, name: 'Macronix – vlastní fab (kandidát, nedoloženo)', place: HSINCHU, to: ['maker'], src: S.macronixWiki, fact: 'estimate' },
      { id: 'maker', stage: 5, name: 'Výrobce SPI NOR flash 128 Mb (neověřen)', src: S.nor, fact: 'estimate' },
    ],
    companies: [
      { name: 'Winbond', role: 'největší dodavatel NOR flash (2021)', country: 'TW', src: S.nor, fact: 'estimate' },
      { name: 'Macronix', role: 'druhý největší dodavatel NOR flash (2021)', country: 'TW', src: S.nor, fact: 'estimate' },
      { name: 'GigaDevice', role: 'třetí největší dodavatel NOR flash (2021)', country: 'CN', src: S.nor, fact: 'estimate' },
    ],
    timeline: [
      { date: '2018', text: 'Deska PRIME B360-PLUS s BIOSem na SPI flash uvedena na trh.', src: S.mbdb, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Koncentrace trhu NOR', text: 'Tři firmy měly v roce 2021 91 % tržeb NOR flash.', src: S.nor, fact: 'estimate' },
    ],
    history: [],
    market: { category: 'NOR flash (tržby; GigaDevice dopočteno do 91 %)', year: 2021, shares: [
      { name: 'Winbond', pct: 35 }, { name: 'Macronix', pct: 33 }, { name: 'GigaDevice', pct: 23 }, { name: 'Ostatní', pct: 9 },
    ], src: S.nor, fact: 'estimate' },
  },

  b360_vrm: {
    checked: C,
    supply: [
      { id: 'cu', stage: 0, name: 'Měď (vinutí tlumivek, DPS)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['ind'], src: S.escondida, fact: 'estimate' },
      { id: 'ta', stage: 0, name: 'Tantal / koltan (kondenzátory) – hlavně Rwanda a DR Kongo', to: ['cap'], src: S.coltan, fact: 'estimate' },
      { id: 'si', stage: 0, name: 'Křemík (MOSFETy, řadič)', to: ['mos', 'ctrl'], src: S.usgsSi, fact: 'estimate' },
      { id: 'ind', stage: 3, name: 'Tlumivky (výrobce neověřen)', to: ['asm'], src: S.kitguruVrm, fact: 'estimate' },
      { id: 'cap', stage: 3, name: 'Kondenzátory (výrobce neověřen)', to: ['asm'], src: S.coltan, fact: 'estimate' },
      { id: 'mos', stage: 3, name: 'MOSFETy / drivery (výrobce neověřen)', to: ['asm'], src: S.kitguruVrm, fact: 'estimate' },
      { id: 'ctrl', stage: 3, name: 'PWM řadič DIGI+ (typ neověřen; ASUS jinde používá ASP1400)', to: ['asm'], src: S.kitguruVrm, fact: 'estimate' },
      { id: 'asm', stage: 4, name: 'Osazení na desku (ASUS Suzhou nebo ODM, nedoloženo)', place: P('Suzhou', 'CN', 31.30, 120.62), to: ['asus'], src: S.asusSuzhou, fact: 'estimate' },
      { id: 'asus', stage: 5, name: 'ASUS (návrh VRM)', place: P('Peitou, Tchaj-pej', 'TW', 25.12, 121.47), src: S.asusWiki, fact: 'doc' },
    ],
    companies: [
      { name: 'ASUS', role: 'návrh napájení DIGI+ VRM', country: 'TW', src: S.asusWiki, fact: 'doc' },
      { name: 'Infineon (International Rectifier)', role: 'možný původ řadiče ASP1400 u jiných desek ASUS; pro B360-PLUS neověřeno', country: 'DE', src: S.kitguruVrm, fact: 'estimate' },
    ],
    timeline: [
      { date: '2018', text: 'Deska uvedena; katalog uvádí 6 napájecích fází.', src: S.ecat, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Tantal z konfliktních oblastí', text: 'Tantalové kondenzátory závisí na koltanu, těženém hlavně ve Rwandě a DR Kongu.', src: S.coltan, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  i7_9700: {
    checked: C,
    supply: [
      { id: 'q', stage: 0, name: 'Vysoce čistý křemen', place: P('Spruce Pine', 'US', 35.91, -82.07), to: ['poly'], src: S.spruce, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (propoje, substrát)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['fab24', 'fab28', 'fab32'], src: S.escondida, fact: 'estimate' },
      { id: 'ttg', stage: 1, name: 'Kovy 3TG (Ta, Sn, W, Au) z auditovaných hutí', to: ['at_pg', 'at_km', 'at_vn'], src: S.conflict, fact: 'doc' },
      { id: 'poly', stage: 1, name: 'Elektronický polykrystalický křemík (např. Wacker)', place: P('Burghausen', 'DE', 48.17, 12.83), to: ['wafer'], src: S.wacker, fact: 'estimate' },
      { id: 'wafer', stage: 2, name: '300mm křemíkové wafery (např. Shin-Etsu)', place: P('Tokio (sídlo)', 'JP', 35.68, 139.76), to: ['fab24', 'fab28', 'fab32'], src: S.shinetsu, fact: 'estimate' },
      { id: 'fab24', stage: 3, name: 'Intel Fab 24 (14 nm)', place: P('Leixlip', 'IE', 53.37, -6.52), to: ['at_pg', 'at_km', 'at_vn'], src: S.intelSites, fact: 'estimate' },
      { id: 'fab28', stage: 3, name: 'Intel Fab 28 (14 nm)', place: P('Kirjat Gat', 'IL', 31.60, 34.77), to: ['at_pg', 'at_km', 'at_vn'], src: S.intelSites, fact: 'estimate' },
      { id: 'fab32', stage: 3, name: 'Intel Fab 32 (14 nm)', place: P('Chandler, Arizona', 'US', 33.27, -111.88), to: ['at_pg', 'at_km', 'at_vn'], src: S.intelSites, fact: 'estimate' },
      { id: 'at_pg', stage: 4, name: 'Intel montáž a test PG8', place: P('Penang', 'MY', 5.30, 100.27), to: ['intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'at_km', stage: 4, name: 'Intel Kulim (příprava die, montáž a test)', place: P('Kulim', 'MY', 5.42, 100.59), to: ['intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'at_vn', stage: 4, name: 'Intel montáž a test VNAT', place: P('Ho Či Minovo Město', 'VN', 10.85, 106.80), to: ['intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'intel', stage: 5, name: 'Intel', place: P('Santa Clara', 'US', 37.39, -121.96), src: S.ark9700, fact: 'doc' },
    ],
    companies: [
      { name: 'Intel', role: 'návrh i výroba (14 nm, vlastní fab a montáž)', country: 'US', src: S.ark9700, fact: 'doc' },
      { name: 'Wacker Chemie', role: 'elektronický polykrystalický křemík (typický dodavatel)', country: 'DE', src: S.wacker, fact: 'estimate' },
      { name: 'Shin-Etsu Chemical', role: 'křemíkové wafery (největší podíl na trhu)', country: 'JP', src: S.shinetsu, fact: 'estimate' },
      { name: 'AMD', role: 'konkurent na trhu desktopových CPU', country: 'US', src: S.mercury, fact: 'doc' },
    ],
    timeline: [
      { date: '2018', text: 'První CPU 9. generace (Coffee Lake Refresh) vycházejí ve 4. čtvrtletí 2018.', src: S.coffee, fact: 'doc' },
      { date: '2019', text: 'Uvedení i7-9700 (Q2 2019): 8 jader / 8 vláken, 3,0–4,7 GHz, 65 W, 14 nm.', src: S.ark9700, fact: 'doc' },
      { date: '2020-12', text: 'Intel vydává PCN o ukončení CPU 9. generace.', src: S.pcn9, fact: 'estimate' },
      { date: '2021-06-25', text: 'Poslední objednávky CPU 9. generace (pro i7-9700 podle PCN nepotvrzeno).', src: S.pcn9, fact: 'estimate' },
      { date: '2021-12-24', text: 'Poslední dodávky CPU 9. generace.', src: S.pcn9, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Nedostatek 14 nm 2018–2019', text: 'Zpoždění 10 nm nechalo veškerou poptávku na 14 nm; Intel přidal 1 mld. USD do 14 nm fabů v Oregonu, Arizoně, Irsku a Izraeli.', src: S.swan, fact: 'doc' },
    ],
    history: [
      { year: 2014, title: 'Procesory bez konfliktních minerálů', text: 'Intel na CES 2014 oznámil, že kovy 3TG v jeho mikroprocesorech pocházejí z ověřených hutí.', src: S.conflict, fact: 'doc' },
      { year: 2018, title: 'Osm jader na 14 nm', text: 'Osmijádrový die Coffee Lake Refresh má asi 174 mm², méně než čtyřjádrový Haswell na 22 nm.', src: S.wikichip9, fact: 'doc' },
    ],
    market: { category: 'Desktopová CPU x86 (kusy, Q4)', year: 2019, shares: [
      { name: 'Intel', pct: 81.7 }, { name: 'AMD', pct: 18.3 },
    ], src: S.mercury, fact: 'doc' },
  },

  intel_box_cooler: {
    checked: C,
    supply: [
      { id: 'al', stage: 0, name: 'Bauxit → hliník (žebra chladiče)', to: ['sink'], src: S.bauxite, fact: 'estimate' },
      { id: 'cu', stage: 0, name: 'Měď (jádro – zdroje se rozcházejí)', place: P('Escondida, Atacama', 'CL', -24.27, -69.07), to: ['sink'], src: S.escondida, fact: 'estimate' },
      { id: 'sink', stage: 3, name: 'Hliníkový chladič s měděnou vložkou (podle prodejce)', to: ['asm'], src: S.coolAxiom, fact: 'doc' },
      { id: 'fan', stage: 3, name: 'Ventilátor 92 mm, 4-pin PWM, 12 V', to: ['asm'], src: S.coolGalaxus, fact: 'doc' },
      { id: 'asm', stage: 4, name: 'Montáž a nanesení teplovodivé pasty (dodavatel neznámý)', to: ['intel'], src: S.coolMedics, fact: 'estimate' },
      { id: 'intel', stage: 5, name: 'Intel (E97379-003)', src: S.coolMedics, fact: 'doc' },
    ],
    companies: [
      { name: 'Intel', role: 'značka a specifikace chladiče', country: 'US', src: S.coolMedics, fact: 'doc' },
      { name: 'BHP', role: 'hlavní vlastník dolu Escondida (příklad zdroje mědi)', country: 'AU', src: S.escondida, fact: 'estimate' },
    ],
    timeline: [
      { date: '2009', text: 'Řada E97379 pasuje na patice LGA1156, 1155, 1150 i 1151 (první LGA1156 v roce 2009).', src: S.coolMedics, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Rozporné údaje', text: 'Prodejci se neshodují, zda má E97379-003 měděné jádro a jaký má ventilátor.', src: S.coolGalaxus, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  fury_8g: {
    checked: C,
    supply: [
      { id: 'sn', stage: 0, name: 'Cín (pájka) – např. ostrov Bangka', place: P('Bangka', 'ID', -2.25, 106.0), to: ['smt_tw', 'smt_cn'], src: S.bangka, fact: 'estimate' },
      { id: 'dram', stage: 3, name: '8× čip DDR4 8 Gb ×8 FBGA (výrobce neověřen)', to: ['smt_tw', 'smt_cn'], src: S.furyDs, fact: 'doc' },
      { id: 'spd', stage: 3, name: 'SPD EEPROM EE1004 (výrobce neověřen)', to: ['smt_tw', 'smt_cn'], src: S.spdMicrochip, fact: 'estimate' },
      { id: 'smt_tw', stage: 4, name: 'Kingston SMT linky Hsinchu', place: P('Hsinchu', 'TW', 24.80, 121.00), to: ['kingston'], src: S.kingHsinchu, fact: 'estimate' },
      { id: 'smt_cn', stage: 4, name: 'Kingston SMT linky Šanghaj', place: P('Šanghaj', 'CN', 31.23, 121.47), to: ['kingston'], src: S.kingShanghai, fact: 'estimate' },
      { id: 'kingston', stage: 5, name: 'Kingston Technology', place: P('Fountain Valley, Kalifornie', 'US', 33.70, -117.95), src: S.kingWiki, fact: 'doc' },
    ],
    companies: [
      { name: 'Kingston Technology', role: 'výrobce modulu (HyperX, dnes Kingston FURY)', country: 'US', src: S.kingWiki, fact: 'doc' },
      { name: 'HP Inc.', role: 'koupil značku HyperX (jen periferie)', country: 'US', src: S.hpHyperx, fact: 'doc' },
      { name: 'Micron / SK hynix', role: 'pravděpodobní dodavatelé čipů řady Fury (doloženo u příbuzné sady)', country: 'US', src: S.furyRgbChips, fact: 'estimate' },
    ],
    timeline: [
      { date: '2015-03-03', text: 'HyperX uvádí FURY DDR4 v rychlostech 2133, 2400 a 2666 MT/s.', src: S.furyLaunch, fact: 'doc' },
      { date: '2021-06-01', text: 'HP dokončuje koupi HyperX od Kingstonu za 425 mil. USD.', src: S.hpHyperx, fact: 'doc' },
      { date: '2021-06', text: 'Kingston přejmenovává paměti HyperX na Kingston FURY.', src: S.furyBrand, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Závislost na třech výrobcích DRAM', text: 'Samsung, SK hynix a Micron měly v 1Q19 přes 95 % tržeb DRAM; Kingston čipy nakupuje.', src: S.dram1q19, fact: 'estimate' },
    ],
    history: [
      { year: 2002, title: 'Vznik řady HyperX', text: 'Kingston v roce 2002 uvedl výkonné paměťové moduly HyperX.', src: S.kingWiki, fact: 'doc' },
    ],
    market: { category: 'Výrobci DRAM modulů (tržby)', year: 2019, shares: [
      { name: 'Kingston', pct: 80 }, { name: 'Ostatní', pct: 20 },
    ], src: S.modules2019, fact: 'doc' },
  },

  ddr4_8g_x8: {
    checked: C,
    supply: [
      { id: 'q', stage: 0, name: 'Vysoce čistý křemen', place: P('Spruce Pine', 'US', 35.91, -82.07), to: ['poly'], src: S.spruce, fact: 'estimate' },
      { id: 'poly', stage: 1, name: 'Elektronický polykrystalický křemík (např. Wacker)', place: P('Burghausen', 'DE', 48.17, 12.83), to: ['wafer'], src: S.wacker, fact: 'estimate' },
      { id: 'wafer', stage: 2, name: '300mm wafery (např. Shin-Etsu)', place: P('Tokio (sídlo)', 'JP', 35.68, 139.76), to: ['mu_tw', 'hx_kr', 'hx_cn'], src: S.shinetsu, fact: 'estimate' },
      { id: 'mu_tw', stage: 3, name: 'Micron Tchaj-čung (DRAM)', place: P('Tchaj-čung', 'TW', 24.21, 120.61), to: ['pkg'], src: S.micronTw, fact: 'estimate' },
      { id: 'hx_kr', stage: 3, name: 'SK hynix Ičchon', place: P('Ičchon', 'KR', 37.20, 127.48), to: ['pkg'], src: S.hynixWiki, fact: 'estimate' },
      { id: 'hx_cn', stage: 3, name: 'SK hynix Wu-si', place: P('Wu-si', 'CN', 31.49, 120.31), to: ['pkg'], src: S.hynixWiki, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Pouzdro FBGA (1G × 8)', to: ['maker'], src: S.furyDs, fact: 'doc' },
      { id: 'maker', stage: 5, name: 'Výrobce DRAM (neověřen; u příbuzné sady Fury Micron)', src: S.furyRgbChips, fact: 'estimate' },
    ],
    companies: [
      { name: 'Micron Technology', role: 'kandidát – čipy v příbuzné sadě HyperX Fury RGB', country: 'US', src: S.furyRgbChips, fact: 'estimate' },
      { name: 'SK hynix', role: 'kandidát – zmiňován u rychlejších sad Fury', country: 'KR', src: S.furyRgbChips, fact: 'estimate' },
      { name: 'Samsung', role: 'největší výrobce DRAM (1Q19)', country: 'KR', src: S.dram1q19, fact: 'estimate' },
    ],
    timeline: [
      { date: '2012-09', text: 'JEDEC vydává konečnou specifikaci DDR4.', src: S.ddr4Wiki, fact: 'estimate' },
      { date: '2014', text: 'DDR4 na trhu: servery v Q2, běžné moduly s Haswell-E v Q3 2014.', src: S.ddr4Wiki, fact: 'estimate' },
      { date: '2020-07', text: 'JEDEC uvádí nástupce DDR5.', src: S.ddr4Wiki, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Oligopol DRAM', text: 'V 1Q19 měli Samsung 42,7 %, SK hynix 29,9 % a Micron asi 23 % tržeb DRAM.', src: S.dram1q19, fact: 'estimate' },
    ],
    history: [],
    market: { category: 'DRAM (tržby, 1Q19)', year: 2019, shares: [
      { name: 'Samsung', pct: 42.7 }, { name: 'SK hynix', pct: 29.9 }, { name: 'Micron', pct: 23 }, { name: 'Ostatní', pct: 4.4 },
    ], src: S.dram1q19, fact: 'estimate' },
  },

  spd_ee1004: {
    checked: C,
    supply: [
      { id: 'si', stage: 0, name: 'Křemík (Čína ~80 % světové produkce)', to: ['fab'], src: S.usgsSi, fact: 'estimate' },
      { id: 'fab', stage: 3, name: 'CMOS EEPROM die (výrobce neznámý)', to: ['pkg'], src: S.spdAblic, fact: 'estimate' },
      { id: 'pkg', stage: 4, name: 'Malé 8vývodové pouzdro (SOIC/TDFN/UDFN/TSSOP)', to: ['maker'], src: S.spdMicrochip, fact: 'estimate' },
      { id: 'maker', stage: 5, name: 'Výrobce SPD EEPROM (neověřen)', src: S.spdOnsemi, fact: 'estimate' },
    ],
    companies: [
      { name: 'Microchip Technology', role: 'SPD EEPROM 34AA04 (EE1004-v)', country: 'US', src: S.spdMicrochip, fact: 'estimate' },
      { name: 'onsemi', role: 'SPD EEPROM N34C04 pro DDR4', country: 'US', src: S.spdOnsemi, fact: 'estimate' },
      { name: 'ABLIC', role: 'SPD EEPROM pro DDR2/3/4', country: 'JP', src: S.spdAblic, fact: 'estimate' },
    ],
    timeline: [
      { date: '2014-04-14', text: 'Microchip uvádí 34AA04 – 4 Kb SPD EEPROM podle JEDEC EE1004-v (2 banky po 256 B).', src: S.spdMicrochip, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Čipová krize 2020–2023', text: 'Nedostatek kapacit sléváren postihl i drobné čipy; konkrétní dopad na SPD EEPROM nedoložen.', src: S.shortage, fact: 'estimate' },
    ],
    history: [
      { year: 2014, title: 'SPD pro DDR4', text: 'DDR4 zdvojnásobila SPD na 4 Kb rozdělené do dvou 256B bank, přepínaných příkazem po I2C/SMBus.', src: S.spdLinux, fact: 'estimate' },
    ],
    market: null,
  },
};
