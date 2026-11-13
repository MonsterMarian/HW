// Rešerše – viz index.js (schéma dat). Alternativy z dokumentů (extra/alternatives.js): díly, které v sestavách nejsou.
// Obecné uzly surovin (křemík, měď, cín, wafery) jsou 'estimate' a sdílejí zdroje s ostatními soubory rešerše.
const CHECKED = '2026-11-13';

const S = {
  // suroviny a materiály
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf',
  usgsSn: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tin.pdf',
  usgsIn: 'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-indium.pdf',
  wacker: 'https://www.wacker.com/cms/en-at/press-and-media/press/press-releases/2025/press-releases-detail-2025-257922.html',
  shinEtsu: 'https://evertiq.com/news/19406',
  escondida: 'https://www.mining-technology.com/projects/escondida/',
  chipShort: 'https://en.wikipedia.org/wiki/Global_chip_shortage',
  // Intel
  intelSites: 'https://en.wikipedia.org/wiki/List_of_Intel_manufacturing_sites',
  intel22: 'https://www.cleanroomtechnology.com/intel-to-build-22nm-fabrication-plant-in-oregon-57457',
  intelMy: 'https://www.techgoondu.com/2023/09/07/an-inside-look-at-intels-malaysia-chip-assembly-and-test-operations/',
  intelShort: 'https://www.theregister.com/2018/09/28/intel_chip_shortage/',
  grantley: 'https://www.semiaccurate.com/2014/09/08/intel-launches-grantley/',
  ark1620: 'https://www.intel.com/content/www/us/en/products/sku/82763/intel-xeon-processor-e51620-v3-10m-cache-3-50-ghz/specifications.html',
  tpu1620: 'https://techpowerup.com/cpu-specs/xeon-e5-1620-v3.c2660',
  tc1620: 'https://technical.city/en/cpu/Xeon-E5-1620-v3',
  ark2680: 'https://www.intel.com/content/www/us/en/products/sku/91754/intel-xeon-processor-e52680-v4-35m-cache-2-40-ghz/specifications.html',
  hpcBdw: 'https://www.hpcwire.com/aiwire/2016/03/31/xeon-broadwell-launch-intels-advanced-scale-framework-coming-focus/',
  atBdw: 'https://www.anandtech.com/show/10158',
  ark12400: 'https://www.intel.com/content/www/us/en/products/sku/134586/specifications.html',
  atAdl: 'https://www.anandtech.com/show/17162',
  swecAdl: 'https://www.sweclockers.com/artikel/33496',
  arkB660: 'https://www.intel.com/content/www/us/en/products/sku/218832/intel-b660-chipset/specifications.html',
  tomsB660: 'https://www.tomshardware.com/news/intel-h670-b660-h610-motherboard-roundup',
  arkZ690: 'https://www.intel.com/content/www/us/en/products/sku/218833/intel-z690-chipset/specifications.html',
  tomsZ690: 'https://www.tomshardware.com/features/intel-z690-motherboard-and-chipset-overview',
  g3dZ690: 'https://www.guru3d.com/news-story/intel-z690-chipset-diagram-shows-pcie-5-x16ddr4-or-ddr5-memoryand-dmi-4-x8.html',
  pchZ690: 'https://pchardware.org/chipsets/intel-z690/',
  // AMD a ASMedia
  toms5600g: 'https://www.tomshardware.com/reviews/amd-ryzen-5-5600g-review',
  toms5700g: 'https://www.tomshardware.com/reviews/amd-ryzen-7-5700g-review',
  g3dApu: 'https://www.guru3d.com/news-story/amd-announces-ryzen-7-5700g-and-ryzen-5-5600g-to-launch-for-retail-market-on-august-5th.html',
  tfamdIr: 'https://ir.amd.com/news-events/press-releases/detail/684/amd-and-nantong-fujitsu-microelectronics-co-ltd-close-on',
  tfamdMida: 'https://www.mida.gov.my/media-release/tf-amd-expands-its-presence-in-malaysia-with-new-manufacturing-site/',
  amdShare: 'https://techpowerup.com/263612/amd-desktop-processor-market-share-now-at-18-3-mercury-research',
  fab15: 'https://pr.tsmc.com/english/news/1629',
  atB550: 'https://www.anandtech.com/show/15850',
  tpuB550sale: 'https://techpowerup.com/268590/amd-b550-chipset-motherboards-start-selling',
  tpuB550: 'https://techpowerup.com/266710/amd-b550-chipset-detailed-its-ready-for-zen-3-older-am4-motherboards-not-compatible?cp=2',
  nbcB550: 'https://www.notebookcheck.net/ASMedia-to-produce-AMD-B550-and-A520-chipsets-based-on-PCIe-3-0-PCIe-4-0-only-in-2020.424009.0.html',
  asmediaWiki: 'https://en.wikipedia.org/wiki/ASMedia_Technology',
  atX570: 'https://www.anandtech.com/show/14406',
  nbcX570: 'https://www.notebookcheck.net/A-round-up-of-all-the-AMD-X570-news-from-Computex-connectivity-power-draw-overclocking-backward-compatibility-and-more.422266.0.html',
  ocX570: 'https://overclockers.ru/hardnews/show/97707/chipset-amd-x570-i-12-nm-kristall-processorov-matisse-porodnilis',
  tpuIod: 'https://techpowerup.com/256511/amd-ryzen-3000-matisse-i-o-controller-die-12nm-not-14nm?cp=2',
  // NVIDIA a grafické karty
  tpuNvs: 'https://techpowerup.com/gpudb/1451/nvs-310',
  askNvs: 'https://askgeek.io/en/gpus/NVIDIA/NVS-310',
  pnyNvs: 'https://www.productindetail.com/pg/nvidia-nvs-310-by-pny',
  tpuGt710: 'https://techpowerup.com/gpu-specs/geforce-gt-710.c3027',
  tpuGt710oem: 'https://techpowerup.com/gpu-specs/geforce-gt-710-oem.c2711',
  nbcGt710: 'https://www.notebookcheck.net/NVIDIA-GeForce-GT-710-GPU-Benchmarks-and-Specs.508416.0.html',
  tomsCmp: 'https://www.tomshardware.com/news/volta-goes-mining-nvidia-gv100-cmp-100hx-mining-card',
  tcCmp: 'https://technical.city/en/gpu/CMP-100HX-210',
  lttCmp: 'https://www.lttlabs.com/articles/2026/09/12/cmp-170hx-cmpunlocker',
  cowos: 'https://www.trendforce.com/news/2024/06/12/news-tsmc-accelerates-cowos-advanced-packaging-capacity-construction-beginning-equipment-procurement-in-its-chiayi-plant/',
  cheonanTsv: 'https://www.asiae.co.kr/en/article/2023090113260743023',
  p40Pb: 'https://images.nvidia.com/content/pdf/tesla/Tesla-P40-Product-Brief.pdf',
  p40Ds: 'https://www.Nvidia.com/content/dam/en-zz/Solutions/design-visualization/solutions/resources/documents1/nvidia-p40-datasheet.pdf',
  atP40: 'https://www.anandtech.com/show/10675',
  nvP40: 'https://nvidianews.nvidia.com/news/new-nvidia-pascal-gpus-accelerate-deep-learning-inference',
  microwayP40: 'https://www.microway.com/hpc-tech-tips/nvidia-tesla-p40-gpu-accelerator-pascal-gp102-up-close/',
  cuda13: 'https://docs.nvidia.com/cuda/archive/13.2.1/cuda-features-archive/index.html',
  fab14: 'https://design-reuse.com/news/30854/tsmc-breaks-ground-for-finfet-fab.html',
  crypto: 'https://www.techspot.com/article/1562-build-a-pc-bad-idea-gpu-pricing/',
  pcg3060: 'https://www.pcgamer.com/nvidia-geforce-rtx-3060-12gb-review-benchmarks-zotac-twin-edge/',
  g3d3060: 'https://www.guru3d.com/news-story/nvidia-announces-geforce-rtx-3060.html',
  wcc3060: 'https://wccftech.com/nvidia-ga106-400-ampere-gpu-geforce-rtx-3060-graphics-card-pictured/',
  ked: 'https://www.kedglobal.com/newsView/ked202012170015',
  nvLhr: 'https://blogs.nvidia.com/blog/lhr',
  wikiGddr6: 'https://en.wikipedia.org/wiki/GDDR6_SDRAM',
  jpr: 'https://www.techspot.com/news/109313-nvidia-hits-94-gpu-market-share-overall-shipments.html',
  asusOffshore: 'https://www.tomshardware.com/tech-industry/asus-says-90-percent-of-pc-and-motherboard-production-has-been-offshored-from-china-to-blunt-tariffs-manufacturing-moved-to-thailand-vietnam-and-indonesia',
  // pracovní stanice
  dellGen: 'https://pcserverandparts.com/news/dell-precision-tower-workstations-explained-2026/',
  dellReg: 'https://www.theregister.com/2014/08/13/dell_adds_new_intel_chippery_to_monster_precision_workstation_line/',
  dell1300: 'https://www.dell.com/community/Precision-Fixed-Workstations/T7810-with-1300W-power-supply/td-p/7761075',
  dell825: 'https://pcserverandparts.com/dell-825w-power-supply-for-precision-t7810-ft7t6/',
  dellXiamen: 'https://cdrinfo.com/d7/content/dell-formally-opens-new-factory-xiamen',
  pcmag5820: 'https://webcf.waybackmachine.org/web/20220520153509/https://www.pcmag.com/reviews/dell-precision-5820-2019',
  wsShare: 'https://www2.reseller.co.nz/article/566456/hp-ahead-desktop-workstations-battle-market-share/',
  hpGen: 'https://pcserverandparts.com/news/hp-z-workstation-generations-2026/',
  z440qs: 'https://manualmachine.com/hp/z440/24305858-quickspecs',
  z440psu: 'https://www.cpumedics.com/hp-758467-001-700w-power-supply-for-hp-workstation-z440',
  z640psu: 'https://pcserverandparts.com/hpe-925w-power-supply-for-hpe-z640-d12-925p1a',
  z840qs: 'https://pcserverandparts.com/content/Spec%20Sheets/Workstations/HP/HP%20Z840/HP%20Z840%20Workstation%20QuickSpecs.pdf',
  z840delta: 'https://www.itcreations.com/product/63988',
  // zdroje
  toms850x: 'https://www.tomshardware.com/reviews/corsair-rm850x-2021-power-supply-review',
  kg850x: 'https://www.kitguru.net/components/power-supplies/aris-bitziopoulos/corsair-rm850x-2018-psu-review/all/1',
  tomsShift: 'https://www.tomshardware.com/pc-components/power-supplies/corsair-rm850x-shift-850w-atx-31-power-supply-review',
  corsairWiki: 'https://en.wikipedia.org/wiki/Corsair_Gaming',
  cwtStock: 'https://stockanalysis.com/quote/tpex/3078/company',
  cwtTpu: 'https://techpowerup.com/news-tags/CWT',
  seaFocus: 'https://seasonic.com/atx3-focus-gx',
  tpuFocus: 'https://techpowerup.com/review/seasonic-focus-gx-atx-3-0-850-w/7.html',
  wepcFocus: 'https://wepc.com/reviews/seasonic-focus-gx-850-psu-review',
  ocFocus31: 'https://overclockers.co.uk/seasonic-focus-gx-850-atx-3.1-850w-80-gold-modular-power-supply-pow-ssc-03148.html',
  seaWiki: 'https://en.wikipedia.org/wiki/Sea_Sonic',
  seaInv: 'https://investor.seasonic.com/en/about/',
  // chlazení a kabely
  chillgpu: 'https://m.reach.dog/shop/chillgpu/products/nvidia-tesla-blower-fan-kit-for-m40-k80-p40-p100-v100s',
  chillEbay: 'https://www.ebay.com.sg/itm/155566672167',
  hackaday: 'https://hackaday.com/2021/11/06/3d-printed-fan-mount-keeps-server-gpu-cool-in-desktop-case',
  printables: 'https://printables.com/model/449287',
  arcticPst: 'https://arctic.de/PST-Cable-Rev.2',
  scanPst: 'https://www.scan.co.uk/products/arctic-4-pin-pwm-fan-splitter-cable-4-fan-connectors-synchronous-control-70cm-black',
  arcticLoc: 'https://arctic.de/en/about-arctic/locations',
  arcticPfan: 'https://www.techpowerup.com/248815/arctic-releases-p-fan-series-high-static-pressure-with-six-fan-models',
  noctuaSyc: 'https://noctua.at/en/na-syc1/specification',
  noctuaChromax: 'https://noctua.at/en/na-syc1-chromax-black/specification',
  quietpcSyc: 'https://quietpc.com/na-syc1',
  // monitor a mikrofony
  displaydb: 'https://www.displaydb.com/monitor/asus-va249na',
  devicebeast: 'https://devicebeast.com/display/asus-va249na-238',
  asusMon: 'https://asus.com/displays-desktops/monitors/eye-care/va249he/techspec',
  asusAbout: 'https://press.asus.com/aboutus',
  auoAr: 'https://auo.com/upload/media/ir/2021_Annual_Report_EN.pdf',
  kgTc777: 'https://www.kitguru.net/?p=485795',
  stTc777: 'https://streamtechreviews.com/blog/tonor-tc777',
  neweggTc310: 'https://www.newegg.com/tonor-tc310/p/0UK-076J-002A8',
  neweggBizTc310: 'https://www.neweggbusiness.com/tonor-tc310/p/9B-0UK-076J-001V5',
  tonorPr: 'https://www.24-7pressrelease.com/press-release/493105/introducing-the-tonor-orca-001-a-usb-condenser-noise-canceling-microphone-for-starters-and-professionals',
  cmediaWiki: 'https://en.wikipedia.org/wiki/C-Media',
  cm108: 'https://mikrocontroller.net/attachment/192639/CM108_DataSheet_v1.6.pdf',
  netbsd: 'https://mail-index.netbsd.org/tech-kern/2005/11/18/0012.html',
  aunaManual: 'https://manuals.online/auna/microphone/mic-900-series/user-manual/19pny',
  mictests: 'https://mictests.com/reviews/21992',
  hifiwiki: 'https://hifi-wiki.com/index.php/Auna',
  chaltecTm: 'https://trademarkdir.com/owner/chal-tec-gmbh',
  // DRAM
  hynixDs: 'https://static6.arrow.com/aropdfconversion/5de33bf7186e85d94601e7ad03de9aed44ce020c/h5an8g6nafr-vkc.pdf',
  hynixPart: 'https://absunshine.com/en/parts/H5AN8G8NAFR-TFC-SK-HYNIX-4986140',
  hynixWiki: 'https://en.wikipedia.org/wiki/SK_Hynix',
  dramShort: 'https://www.trendforce.com/presscenter/news/20180110-9941.html',
  kingstonDs: 'https://www.kingston.com/datasheets/HX426C16FB3_8.pdf',
  micronDs: 'https://classes.engineering.wustl.edu/cse362/images/0/0c/8Gb_DDR4_SDRAM.pdf',
  micronAuto: 'https://www.mouser.com/datasheet/2/671/8gb_auto_ddr4_dram-3179142.pdf',
  micronDk: 'https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/8734/MT40A1G8SA-062E.pdf',
  micronTw: 'https://www.taipeitimes.com/News/biz/archives/2023/11/07/2003808781',
};

// Přibližné polohy (sídla a závody; u odhadů je to v názvu).
const P = {
  cnSi: { name: 'Čína (největší producent křemíku, oblast přibližně)', country: 'CN', lat: 35.86, lon: 104.2 },
  clCu: { name: 'Escondida, Antofagasta', country: 'CL', lat: -24.27, lon: -69.07 },
  idSn: { name: 'Bangka', country: 'ID', lat: -2.1, lon: 106.1 },
  cnIn: { name: 'Čína (největší rafinace india, oblast přibližně)', country: 'CN', lat: 35.86, lon: 104.2 },
  dePoly: { name: 'Burghausen', country: 'DE', lat: 48.17, lon: 12.83 },
  jpWafer: { name: 'Nishigo, Fukušima', country: 'JP', lat: 37.14, lon: 140.16 },
  intelOr: { name: 'Intel, Hillsboro, Oregon (fab, odhad)', country: 'US', lat: 45.54, lon: -122.96 },
  intelPg: { name: 'Intel, Penang (pouzdření a test, odhad)', country: 'MY', lat: 5.35, lon: 100.3 },
  intelHq: { name: 'Intel, Santa Clara (sídlo)', country: 'US', lat: 37.39, lon: -121.96 },
  amdHq: { name: 'AMD, Santa Clara (sídlo)', country: 'US', lat: 37.38, lon: -121.97 },
  tfamd: { name: 'TF-AMD, Bayan Lepas, Penang', country: 'MY', lat: 5.3, lon: 100.27 },
  tsmc15: { name: 'TSMC Fab 15, Taichung (odhad)', country: 'TW', lat: 24.21, lon: 120.62 },
  tsmc14: { name: 'TSMC Fab 14, Tainan (odhad)', country: 'TW', lat: 23.11, lon: 120.27 },
  gf8: { name: 'GlobalFoundries Fab 8, Malta, New York (odhad)', country: 'US', lat: 42.97, lon: -73.76 },
  asmedia: { name: 'ASMedia, Nová Tchaj-pej (sídlo, přibližně)', country: 'TW', lat: 24.99, lon: 121.54 },
  samsungHw: { name: 'Samsung, kampus Hwaseong', country: 'KR', lat: 37.22, lon: 127.07 },
  samsungCa: { name: 'Samsung, Cheonan (pouzdření HBM, odhad)', country: 'KR', lat: 36.81, lon: 127.15 },
  nvidiaHq: { name: 'NVIDIA, Santa Clara (sídlo)', country: 'US', lat: 37.37, lon: -121.96 },
  dellHq: { name: 'Dell, Round Rock, Texas (sídlo)', country: 'US', lat: 30.49, lon: -97.67 },
  dellXm: { name: 'Dell, Xiamen (montáž, odhad)', country: 'CN', lat: 24.48, lon: 118.09 },
  hpHq: { name: 'HP, Palo Alto (sídlo)', country: 'US', lat: 37.41, lon: -122.15 },
  deltaHq: { name: 'Delta Electronics, Tchaj-pej (sídlo, přibližně)', country: 'TW', lat: 25.08, lon: 121.57 },
  cwtHq: { name: 'CWT, Taoyuan (sídlo)', country: 'TW', lat: 24.99, lon: 121.3 },
  cwtGz: { name: 'CWT, Kanton (výroba)', country: 'CN', lat: 23.13, lon: 113.26 },
  corsairHq: { name: 'Corsair, Milpitas (sídlo)', country: 'US', lat: 37.43, lon: -121.91 },
  seasonicHq: { name: 'Seasonic, Tchaj-pej (sídlo, přibližně)', country: 'TW', lat: 25.08, lon: 121.57 },
  arcticHq: { name: 'Arctic, Braunschweig (sídlo, přibližně)', country: 'DE', lat: 52.27, lon: 10.52 },
  noctuaHq: { name: 'Noctua, Vídeň (sídlo, přibližně)', country: 'AT', lat: 48.21, lon: 16.37 },
  asusHq: { name: 'ASUS, Taipei Beitou (sídlo)', country: 'TW', lat: 25.12, lon: 121.47 },
  auoHq: { name: 'AUO, Hsinchu Science Park (odhad dodavatele panelu)', country: 'TW', lat: 24.78, lon: 121.01 },
  cmedia: { name: 'C-Media, Tchaj-pej (sídlo)', country: 'TW', lat: 25.05, lon: 121.55 },
  chaltec: { name: 'Chal-Tec, Berlín (sídlo značky auna)', country: 'DE', lat: 52.51, lon: 13.41 },
  hynixIc: { name: 'SK hynix, Icheon (odhad fabu)', country: 'KR', lat: 37.2, lon: 127.48 },
  micronTc: { name: 'Micron Taiwan, Taichung (odhad fabu)', country: 'TW', lat: 24.3, lon: 120.72 },
  micronHq: { name: 'Micron, Boise (sídlo)', country: 'US', lat: 43.53, lon: -116.15 },
};

// Uzel dodávek; uzly fáze 5 dostanou to = undefined a klíč `to` se vynechá.
const n = (id, stage, name, to, src, fact, place) => ({ id, stage, name, ...(place ? { place } : {}), ...(to ? { to } : {}), src, fact });
const cu = (to) => n('cu', 0, 'Měď pro vodiče, DPS a substráty', to, S.escondida, 'estimate', P.clCu);
const sn = (to) => n('sn', 0, 'Cín pro bezolovnaté pájky', to, S.usgsSn, 'estimate', P.idSn);
const mat = (to) => [
  n('si', 0, 'Křemen a hutní křemík', ['poly'], S.usgsSi, 'estimate', P.cnSi),
  n('poly', 1, 'Polykrystalický křemík polovodičové čistoty (např. Wacker)', ['wafer'], S.wacker, 'estimate', P.dePoly),
  n('wafer', 2, 'Křemíkové wafery 300 mm (např. Shin-Etsu)', to, S.shinEtsu, 'estimate', P.jpWafer),
];
// Řetězec čipu: suroviny → fab → pouzdření → výrobce. Argumenty [název, zdroj, fakt, místo].
const chip = (fab, pack, maker) => [
  ...mat(['fab']),
  n('fab', 3, ...insert(fab, ['pack'])),
  n('pack', 4, ...insert(pack, ['maker'])),
  n('maker', 5, ...insert(maker, undefined)),
  cu(['pack']), sn(['pack']),
];
// Řetězec karty: suroviny → GPU a paměti → osazení → výrobce.
const card = (gpu, mem, asm, maker) => [
  ...mat(['gpu', 'mem']),
  n('gpu', 3, ...insert(gpu, ['asm'])),
  n('mem', 3, ...insert(mem, ['asm'])),
  n('asm', 4, ...insert(asm, ['maker'])),
  n('maker', 5, ...insert(maker, undefined)),
  cu(['asm']),
];
// Řetězec pracovní stanice: CPU od Intelu + zdroj → montáž → výrobce.
const station = (cpu, psu, asm, maker) => [
  n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
  n('wafer', 2, 'Křemíkové wafery 300 mm', ['cpu'], S.shinEtsu, 'estimate', P.jpWafer),
  n('cpu', 3, ...insert(cpu, ['cpuPack'])),
  n('cpuPack', 4, 'Pouzdření a test procesorů Xeon (Intel Penang, odhad)', ['maker'], S.intelMy, 'estimate', P.intelPg),
  n('psu', 3, ...insert(psu, ['asm'])),
  n('asm', 4, ...insert(asm, ['maker'])),
  n('maker', 5, ...insert(maker, undefined)),
  cu(['asm']),
];
// Řetězec zdroje: měď a křemík → magnetika, polovodiče, kondenzátory → montáž → značka.
const psu = (asm, maker, partsSrc) => [
  n('cu', 0, 'Měď pro vinutí transformátorů a tlumivek', ['mag'], S.escondida, 'estimate', P.clCu),
  n('si', 0, 'Křemík pro výkonové MOSFETy a diody', ['mos'], S.usgsSi, 'estimate', P.cnSi),
  n('mag', 3, 'Transformátory a tlumivky (dodavatel neověřen)', ['asm'], partsSrc, 'estimate'),
  n('mos', 3, 'Výkonové MOSFETy, usměrňovače a řadiče (dodavatelé neověřeni)', ['asm'], partsSrc, 'estimate'),
  n('cap', 3, 'Elektrolytické kondenzátory (dodavatel neověřen)', ['asm'], partsSrc, 'estimate'),
  n('asm', 4, ...insert(asm, ['maker'])),
  n('maker', 5, ...insert(maker, undefined)),
];
// Řetězec kabelu: měď a plast → lisování → balení → značka.
const cable = (asm, maker) => [
  cu(['wire']),
  n('wire', 2, 'Měděné lanko AWG s izolací PVC', ['crimp'], S.escondida, 'estimate'),
  n('housing', 2, 'Plastová pouzdra konektorů 4pin', ['crimp'], asm[1], 'estimate'),
  n('crimp', 3, 'Lisování kontaktů a sestavení kabelu (výrobce neověřen)', ['asm'], asm[1], 'estimate'),
  n('asm', 4, ...insert(asm, ['maker'])),
  n('maker', 5, ...insert(maker, undefined)),
];
// Řetězec USB mikrofonu: kodek C-Media + kapsle → montáž → značka.
const mic = (capsule, asm, maker) => [
  n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
  n('wafer', 2, 'Křemíkové wafery pro kodek', ['codec'], S.shinEtsu, 'estimate', P.jpWafer),
  n('codec', 3, 'USB audio kodek C-Media (USB ID 0D8C; přesný typ neověřen, rodina CM108?)', ['asm'], S.cm108, 'estimate', P.cmedia),
  n('capsule', 3, ...insert(capsule, ['asm'])),
  cu(['asm']),
  n('asm', 4, ...insert(asm, ['maker'])),
  n('maker', 5, ...insert(maker, undefined)),
];
// [název, zdroj, fakt, místo] → argumenty pro n() s doplněným `to`.
function insert([name, src, fact, place], to) { return [name, to, src, fact, place]; }

const tCuda13 = (who) => ({ date: '2025', text: `CUDA Toolkit 13.0 odstranil podporu architektur Maxwell, Pascal a Volta; ${who} zůstává jen CUDA 12.x.`, src: S.cuda13, fact: 'estimate' });
const bWin11 = { title: 'Bez Windows 11', text: 'Seznam podporovaných procesorů pro Windows 11 nemá žádný Xeon E5; zbývá Linux nebo Windows 10 s placenými aktualizacemi.', src: S.hpGen, fact: 'doc' };
const mGpu = { category: 'Diskrétní grafické karty (AIB), podíl dodávek ve 2. čtvrtletí 2025 (JPR)', year: 2025, shares: [{ name: 'NVIDIA', pct: 94 }, { name: 'AMD', pct: 6 }, { name: 'Intel', pct: 0 }], src: S.jpr, fact: 'doc' };
const mCpu = { category: 'Desktopové procesory x86, podíl (Mercury Research, 4Q 2019)', year: 2019, shares: [{ name: 'Intel (dopočet)', pct: 81.7 }, { name: 'AMD', pct: 18.3 }], src: S.amdShare, fact: 'doc' };
const mWs = { category: 'Desktopové pracovní stanice (dodávky, 4Q 2014)', year: 2014, shares: [{ name: 'HP', pct: 44.6 }, { name: 'Dell', pct: 35.8 }, { name: 'Ostatní (dopočet)', pct: 19.6 }], src: S.wsShare, fact: 'doc' };

export default {
  // ── Procesory ───────────────────────────────────────────────────────────────────────────────────────
  alt_e5_1620v3: {
    checked: CHECKED,
    supply: chip(
      ['Intel 22 nm (Haswell-EP), fab v Oregonu (odhad)', S.intel22, 'estimate', P.intelOr],
      ['Pouzdření LGA 2011-3 a test (Intel Penang, odhad)', S.intelMy, 'estimate', P.intelPg],
      ['Intel Xeon E5-1620 v3', S.ark1620, 'doc', P.intelHq]),
    companies: [
      { name: 'Intel', role: 'Návrh a výroba procesoru (22 nm Haswell-EP)', country: 'US', src: S.ark1620, fact: 'doc' },
      { name: 'Dell', role: 'Pracovní stanice T5810, do které procesor pasuje', country: 'US', src: S.dellGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-09-08', text: 'Intel uvedl platformu Grantley (Xeon E5 v3, Haswell-EP).', src: S.grantley, fact: 'estimate' },
      { date: '2014-09', text: 'Vydán Xeon E5-1620 v3: 4 jádra, 3,5 GHz, 140 W.', src: S.tc1620, fact: 'doc' },
    ],
    bottlenecks: [
      bWin11,
      { title: 'Jen bazar', text: 'Procesor se už nevyrábí; dostupné jsou jen použité kusy, multiplikátor je zamčený.', src: S.tpu1620, fact: 'estimate' },
    ],
    history: [],
    market: mWs,
  },

  alt_e5_2680v4: {
    checked: CHECKED,
    supply: chip(
      ['Intel 14 nm (Broadwell-EP, die až 24 jader), fab odhad', S.intelSites, 'estimate', P.intelOr],
      ['Pouzdření LGA 2011-3 a test (Intel Penang, odhad)', S.intelMy, 'estimate', P.intelPg],
      ['Intel Xeon E5-2680 v4', S.ark2680, 'doc', P.intelHq]),
    companies: [
      { name: 'Intel', role: 'Návrh a výroba procesoru (14 nm Broadwell-EP)', country: 'US', src: S.ark2680, fact: 'doc' },
      { name: 'Dell', role: 'T5810 podporuje vybrané E5-2600 v3/v4', country: 'US', src: S.dellGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2016-03-31', text: 'Intel uvedl Xeon E5-2600 v4 (Broadwell-EP, 14 nm, až 22 jader, DDR4-2400).', src: S.hpcBdw, fact: 'estimate' },
      { date: '2016-03-31', text: 'AnandTech: die má 24 jader, aktivních až 22.', src: S.atBdw, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Nedostatek 14 nm u Intelu', text: 'V roce 2018 Intelu chyběla kapacita 14 nm a přednost dostávaly serverové čipy.', src: S.intelShort, fact: 'estimate' },
      bWin11,
    ],
    history: [],
    market: null,
  },

  alt_r5_5600g: {
    checked: CHECKED,
    supply: chip(
      ['TSMC 7 nm (APU Cezanne), fab odhad', S.fab15, 'estimate', P.tsmc15],
      ['Pouzdření a test AMD (TF-AMD Penang, odhad)', S.tfamdIr, 'estimate', P.tfamd],
      ['AMD Ryzen 5 5600G', S.toms5600g, 'doc', P.amdHq]),
    companies: [
      { name: 'AMD', role: 'Návrh APU Cezanne (Zen 3 + Vega 7)', country: 'US', src: S.toms5600g, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba 7 nm (konkrétní fab neověřen)', country: 'TW', src: S.toms5600g, fact: 'estimate' },
      { name: 'TF-AMD Microelectronics', role: 'Pouzdření a test procesorů AMD v Penangu (85 % Tongfu, 15 % AMD)', country: 'MY', src: S.tfamdIr, fact: 'estimate' },
    ],
    timeline: [
      { date: '2021-06-01', text: 'AMD na Computexu oznámilo prodej 5600G v obchodech za 259 USD.', src: S.g3dApu, fact: 'doc' },
      { date: '2021-08-05', text: 'Začátek prodeje 5600G a 5700G v obchodech (předtím jen v hotových PC).', src: S.g3dApu, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Globální nedostatek čipů', text: 'V letech 2020–2022 byla kapacita foundry vyprodaná; APU šly nejdřív jen výrobcům PC.', src: S.chipShort, fact: 'estimate' },
    ],
    history: [],
    market: mCpu,
  },

  alt_r7_5700g: {
    checked: CHECKED,
    supply: chip(
      ['TSMC 7 nm (APU Cezanne), fab odhad', S.fab15, 'estimate', P.tsmc15],
      ['Pouzdření a test AMD (TF-AMD Penang, odhad)', S.tfamdIr, 'estimate', P.tfamd],
      ['AMD Ryzen 7 5700G', S.toms5700g, 'doc', P.amdHq]),
    companies: [
      { name: 'AMD', role: 'Návrh APU Cezanne (Zen 3 + Vega 8)', country: 'US', src: S.toms5700g, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba 7 nm (konkrétní fab neověřen)', country: 'TW', src: S.toms5700g, fact: 'estimate' },
      { name: 'TF-AMD Microelectronics', role: 'Pouzdření a test; v roce 2022 rozšíření o závod Batu Kawan', country: 'MY', src: S.tfamdMida, fact: 'estimate' },
    ],
    timeline: [
      { date: '2021-06-01', text: 'Oznámen prodej 5700G v obchodech za 359 USD.', src: S.g3dApu, fact: 'doc' },
      { date: '2021-08-05', text: 'Začátek prodeje v obchodech.', src: S.g3dApu, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Globální nedostatek čipů', text: 'V letech 2020–2022 byla kapacita foundry vyprodaná.', src: S.chipShort, fact: 'estimate' },
    ],
    history: [],
    market: mCpu,
  },

  alt_i5_12400: {
    checked: CHECKED,
    supply: chip(
      ['Intel 7 (Alder Lake), fab odhad', S.intelSites, 'estimate', P.intelOr],
      ['Pouzdření LGA 1700 a test (Intel Penang, odhad)', S.intelMy, 'estimate', P.intelPg],
      ['Intel Core i5-12400', S.ark12400, 'doc', P.intelHq]),
    companies: [
      { name: 'Intel', role: 'Návrh a výroba procesoru i čipsetu', country: 'US', src: S.ark12400, fact: 'doc' },
      { name: 'Výrobci desek (ASUS, Gigabyte, MSI, ASRock…)', role: 'Desky B660 / H670 / H610 pro LGA 1700', country: 'TW', src: S.tomsB660, fact: 'doc' },
    ],
    timeline: [
      { date: '2022-01-04', text: 'Intel na CES 2022 uvedl 22 desktopových Alder Lake bez K, mezi nimi i5-12400.', src: S.atAdl, fact: 'doc' },
      { date: '2022-01', text: 'Procesory a desky H670/B660/H610 se objevily v obchodech.', src: S.swecAdl, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Globální nedostatek čipů', text: 'Uvedení spadlo do období nedostatku čipů 2020–2022.', src: S.chipShort, fact: 'estimate' },
    ],
    history: [],
    market: mCpu,
  },

  // ── Čipsety ─────────────────────────────────────────────────────────────────────────────────────────
  alt_amd_b550: {
    checked: CHECKED,
    supply: chip(
      ['Čip čipsetu navržený ASMedia (foundry neověřena)', S.nbcB550, 'estimate', P.asmedia],
      ['Pouzdření (OSAT neověřen)', S.atB550, 'estimate'],
      ['AMD B550', S.atB550, 'doc', P.amdHq]),
    companies: [
      { name: 'AMD', role: 'Čipset pro AM4, specifikace a prodej', country: 'US', src: S.atB550, fact: 'doc' },
      { name: 'ASMedia', role: 'Návrh čipu (AMD výrobce nepotvrdilo)', country: 'TW', src: S.tpuB550, fact: 'estimate' },
    ],
    timeline: [
      { date: '2020-05-07', text: 'AMD představilo B550: PCIe 4.0 z procesoru, linky čipsetu PCIe 3.0.', src: S.tpuB550, fact: 'doc' },
      { date: '2020-06-16', text: 'Začátek prodeje desek B550.', src: S.tpuB550sale, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'PCIe 4.0 jen z procesoru', text: 'Čipset sám umí jen PCIe 3.0; druhá karta ve slotu čipsetu dostane x4 Gen 3.', src: S.atB550, fact: 'doc' },
    ],
    history: [
      { year: 2020, title: 'Návrat k ASMedia', text: 'Po X570 z vlastní dílny AMD svěřilo levnější B550 opět ASMedia.', src: S.atB550, fact: 'estimate' },
    ],
    market: null,
  },

  alt_amd_x570: {
    checked: CHECKED,
    supply: chip(
      ['GlobalFoundries 14 nm (čip příbuzný I/O die Matisse), fab odhad', S.ocX570, 'estimate', P.gf8],
      ['Pouzdření (OSAT neověřen)', S.atX570, 'estimate'],
      ['AMD X570', S.atX570, 'doc', P.amdHq]),
    companies: [
      { name: 'AMD', role: 'Vlastní návrh čipsetu (licencované IP od ASMedia)', country: 'US', src: S.atX570, fact: 'doc' },
      { name: 'ASMedia', role: 'Licence IP (USB, SATA)', country: 'TW', src: S.atX570, fact: 'doc' },
      { name: 'GlobalFoundries', role: 'Výroba 14 nm (podle zpráv z Computexu 2019)', country: 'US', src: S.ocX570, fact: 'estimate' },
    ],
    timeline: [
      { date: '2019-05', text: 'AMD na Computexu ukázalo X570, první spotřebitelský čipset s PCIe 4.0.', src: S.atX570, fact: 'doc' },
      { date: '2019-06-12', text: 'Upřesnění: I/O die Ryzenu 3000 je 12 nm, čipset X570 14 nm.', src: S.tpuIod, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Příkon a hluk', text: 'Spotřebitelský X570 bere 11 W (X470 asi 6 W), většina desek proto potřebuje ventilátor.', src: S.nbcX570, fact: 'doc' },
    ],
    history: [
      { year: 2019, title: 'První PCIe 4.0 pro desktop', text: 'X570 přinesl PCIe 4.0 do běžných desek spolu s Ryzeny 3000.', src: S.atX570, fact: 'doc' },
    ],
    market: null,
  },

  alt_intel_b660: {
    checked: CHECKED,
    supply: chip(
      ['Výroba čipsetu u Intelu (proces a fab neověřeny)', S.intelSites, 'estimate', P.intelOr],
      ['Pouzdření a test (Intel, odhad)', S.intelMy, 'estimate', P.intelPg],
      ['Intel B660', S.arkB660, 'doc', P.intelHq]),
    companies: [
      { name: 'Intel', role: 'Návrh a výroba čipsetu', country: 'US', src: S.arkB660, fact: 'doc' },
      { name: 'Gigabyte', role: 'Příklad desky: B660 GAMING X', country: 'TW', src: 'https://www.gigabyte.com/Motherboard/B660-GAMING-X-rev-10/sp', fact: 'doc' },
    ],
    timeline: [
      { date: '2022-01-04', text: 'Uveden s procesory Alder Lake bez K; doporučená cena 31 USD.', src: S.tomsB660, fact: 'doc' },
      { date: '2022-01', text: 'Desky B660 v prodeji.', src: S.swecAdl, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Málo linek', text: 'Jen 14 linek PCIe a DMI x4; druhá karta poběží přes čipset s x4.', src: S.arkB660, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  alt_intel_z690: {
    checked: CHECKED,
    supply: chip(
      ['Výroba čipsetu u Intelu (proces a fab neověřeny)', S.intelSites, 'estimate', P.intelOr],
      ['Pouzdření a test (Intel, odhad)', S.intelMy, 'estimate', P.intelPg],
      ['Intel Z690', S.arkZ690, 'doc', P.intelHq]),
    companies: [
      { name: 'Intel', role: 'Návrh a výroba čipsetu', country: 'US', src: S.arkZ690, fact: 'doc' },
      { name: 'Gigabyte', role: 'Příklad desky: Z690 AORUS XTREME', country: 'TW', src: 'https://www.gigabyte.com/Motherboard/Z690-AORUS-XTREME-rev-10/sp', fact: 'doc' },
    ],
    timeline: [
      { date: '2021-10', text: 'Uveden s procesory Alder Lake K; cena čipsetu 57 USD, 6 W.', src: S.pchZ690, fact: 'estimate' },
      { date: '2021-11', text: 'Diagram: PCIe 5.0 x16 z procesoru, DMI 4.0 x8, DDR4 i DDR5.', src: S.g3dZ690, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'PCIe 5.0 jen z procesoru', text: 'Čipset sám má PCIe 3.0/4.0; dělení x8/x8 pro dvě karty závisí na desce.', src: S.tomsZ690, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  // ── Grafické karty ──────────────────────────────────────────────────────────────────────────────────
  alt_nvs310: {
    checked: CHECKED,
    supply: card(
      ['GPU GF119 na TSMC 40 nm (fab neověřen)', S.tpuNvs, 'estimate'],
      ['Paměti DDR3 512 MB (výrobce neověřen)', S.tpuNvs, 'estimate'],
      ['Osazení karty (PNY a další partneři; závod neověřen)', S.pnyNvs, 'estimate'],
      ['NVIDIA NVS 310', S.tpuNvs, 'doc', P.nvidiaHq]),
    companies: [
      { name: 'NVIDIA', role: 'Návrh GPU a karty', country: 'US', src: S.tpuNvs, fact: 'doc' },
      { name: 'PNY', role: 'Prodej profesionálních karet NVIDIA (verze NVS 310 by PNY)', country: 'US', src: S.pnyNvs, fact: 'doc' },
    ],
    timeline: [
      { date: '2012-06-26', text: 'Uvedení NVS 310 (GF119, 40 nm).', src: S.tpuNvs, fact: 'doc' },
      { date: '2012-06', text: 'Cena při uvedení 159 USD.', src: S.askNvs, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Stará architektura', text: 'Fermi už nové ovladače nepodporují; na obraz BIOSu a plochy to stačí.', src: S.tpuNvs, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_gt710: {
    checked: CHECKED,
    supply: card(
      ['GPU GK208 na TSMC 28 nm (fab odhad)', S.fab15, 'estimate', P.tsmc15],
      ['Paměti DDR3 (512 MB–2 GB, výrobce neověřen)', S.tpuGt710, 'estimate'],
      ['Osazení karet u partnerů NVIDIA (závody neověřeny)', S.tpuGt710, 'estimate'],
      ['NVIDIA GeForce GT 710', S.tpuGt710, 'doc', P.nvidiaHq]),
    companies: [
      { name: 'NVIDIA', role: 'Návrh GPU GK208', country: 'US', src: S.tpuGt710, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba 28 nm', country: 'TW', src: S.tpuGt710, fact: 'estimate' },
    ],
    timeline: [
      { date: '2014-03-27', text: 'Uvedení GT 710 (GK208, 28 nm, 19 W).', src: S.tpuGt710, fact: 'doc' },
      { date: '2015-04-09', text: 'OEM verze s čipem GK208B.', src: S.tpuGt710oem, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Výkon', text: 'Jen 14,4 GB/s a 192 jader; vhodná výhradně na obraz.', src: S.nbcGt710, fact: 'doc' },
    ],
    history: [],
    market: mGpu,
  },

  alt_cmp100_210: {
    checked: CHECKED,
    supply: card(
      ['GPU GV100 (Volta) na TSMC 12 nm, fab odhad', S.tcCmp, 'estimate', P.tsmc14],
      ['HBM2 16 GB (Samsung, odhad), na interposeru CoWoS', S.cheonanTsv, 'estimate', P.samsungCa],
      ['Pouzdření CoWoS a osazení karty (neověřeno)', S.cowos, 'estimate'],
      ['NVIDIA CMP 100-210 (CMP 100HX)', S.tomsCmp, 'doc', P.nvidiaHq]),
    companies: [
      { name: 'NVIDIA', role: 'Těžařská karta s čipem GV100', country: 'US', src: S.tomsCmp, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba GV100 (12 nm) a pouzdření CoWoS', country: 'TW', src: S.tcCmp, fact: 'estimate' },
      { name: 'Samsung', role: 'Pravděpodobný dodavatel HBM2', country: 'KR', src: S.cheonanTsv, fact: 'estimate' },
    ],
    timeline: [
      { date: '2021', text: 'Tom\'s Hardware: NVIDIA nasadila GV100 v těžařské kartě CMP 100HX.', src: S.tomsCmp, fact: 'doc' },
      tCuda13('pro Voltu'),
      { date: '2026-09-12', text: 'LTT Labs: příbuzná CMP 170HX je z výroby omezená, při LLM bere jen 90–150 W.', src: S.lttCmp, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Omezená sběrnice PCIe', text: 'Těžařské CMP mají osekané PCIe; zdroje se u 100HX rozcházejí (x1 až x16).', src: S.tcCmp, fact: 'estimate' },
      { title: 'Kapacita CoWoS', text: 'Pouzdření GPU s HBM (CoWoS) je dlouhodobě úzké hrdlo TSMC.', src: S.cowos, fact: 'estimate' },
    ],
    history: [
      { year: 2021, title: 'Karty pro těžaře', text: 'Řada CMP měla odvést těžaře od herních karet; dnes jde levně z bazaru.', src: S.tomsCmp, fact: 'estimate' },
    ],
    market: mGpu,
  },

  alt_tesla_p40: {
    checked: CHECKED,
    supply: card(
      ['GPU GP102 na TSMC 16 nm (fab odhad)', S.fab14, 'estimate', P.tsmc14],
      ['GDDR5 24 GB, 384 bit (výrobce neověřen)', S.atP40, 'estimate'],
      ['Osazení karty (závod neověřen)', S.microwayP40, 'estimate'],
      ['NVIDIA Tesla P40', S.p40Pb, 'doc', P.nvidiaHq]),
    companies: [
      { name: 'NVIDIA', role: 'Návrh GP102 a karty Tesla P40', country: 'US', src: S.p40Ds, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba Pascal 16 nm', country: 'TW', src: S.nvP40, fact: 'estimate' },
      { name: 'Microway', role: 'Integrátor, rozbor karty P40', country: 'US', src: S.microwayP40, fact: 'doc' },
    ],
    timeline: [
      { date: '2016-09-13', text: 'Oznámena na GTC China spolu s P4 (inference INT8, 47 TOPS).', src: S.nvP40, fact: 'doc' },
      { date: '2016-10', text: 'Dostupnost u OEM a partnerů.', src: S.nvP40, fact: 'doc' },
      tCuda13('pro Pascal'),
    ],
    bottlenecks: [
      { title: 'Pomalejší paměť', text: 'GDDR5 dává 346 GB/s, méně než polovinu HBM2 v P100; generování textu je pomalejší.', src: S.atP40, fact: 'doc' },
      { title: 'Pasivní chlazení', text: 'Karta počítá s průtokem vzduchu serveru; v PC potřebuje kryt s ventilátorem jako P100.', src: S.p40Pb, fact: 'doc' },
    ],
    history: [
      { year: 2016, title: 'Inference a TensorRT', text: 'S P40 a P4 přišel TensorRT (dříve GIE) pro nasazení neuronových sítí.', src: S.nvP40, fact: 'doc' },
    ],
    market: mGpu,
  },

  alt_rtx3060_12g: {
    checked: CHECKED,
    supply: card(
      ['GPU GA106 na Samsung 8 nm (8N)', S.ked, 'estimate', P.samsungHw],
      ['GDDR6 12 GB, 16 Gb/s (Samsung / Micron / SK hynix, neověřeno)', S.wikiGddr6, 'estimate'],
      ['Osazení karet u partnerů (Zotac, MSI, ASUS…; závody neověřeny)', S.asusOffshore, 'estimate'],
      ['NVIDIA GeForce RTX 3060 12 GB', S.g3d3060, 'doc', P.nvidiaHq]),
    companies: [
      { name: 'NVIDIA', role: 'Návrh GA106, bez Founders Edition', country: 'US', src: S.pcg3060, fact: 'doc' },
      { name: 'Samsung Foundry', role: 'Výroba GPU Ampere 8 nm', country: 'KR', src: S.ked, fact: 'estimate' },
      { name: 'Zotac', role: 'Partnerská karta Twin Edge (recenze PC Gamer)', country: 'HK', src: S.pcg3060, fact: 'doc' },
    ],
    timeline: [
      { date: '2021-01-12', text: 'Oznámena po CES 2021, cena 329 USD.', src: S.g3d3060, fact: 'doc' },
      { date: '2021-02-25', text: 'Začátek prodeje partnerských karet.', src: S.pcg3060, fact: 'estimate' },
      { date: '2021-05-18', text: 'NVIDIA rozšířila omezení hashrate (LHR) na další karty RTX 30.', src: S.nvLhr, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Nedostatek GPU 2021', text: 'Karty RTX 30 byly nedostatkové kvůli těžařům a nedostatku čipů.', src: S.chipShort, fact: 'estimate' },
      { title: 'Málo VRAM pro velké modely', text: 'Dvě karty mají 24 GB a 360 GB/s na kartu; model 27B jen ve Q4.', src: S.pcg3060, fact: 'estimate' },
    ],
    history: [],
    market: mGpu,
  },

  // ── Pracovní stanice ────────────────────────────────────────────────────────────────────────────────
  alt_t7810: {
    checked: CHECKED,
    supply: station(
      ['Procesory Xeon E5-2600 v3/v4 (Intel 22/14 nm, fab odhad)', S.intel22, 'estimate', P.intelOr],
      ['Zdroj 825 W 80 PLUS Gold (Dell FT7T6 / H825EF-02; OEM výrobce neověřen)', S.dell825, 'estimate'],
      ['Montáž pracovní stanice (Dell Xiamen, odhad)', S.dellXiamen, 'estimate', P.dellXm],
      ['Dell Precision T7810', S.dellGen, 'doc', P.dellHq]),
    companies: [
      { name: 'Dell', role: 'Výrobce stanice, validované zdroje 685/825/1300 W', country: 'US', src: S.dell1300, fact: 'doc' },
      { name: 'Intel', role: 'Procesory Xeon E5-2600 v3/v4 a čipset C612', country: 'US', src: S.dellGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-08-12', text: 'Dell ohlásil Precision Tower 5810 a 7810.', src: S.dellGen, fact: 'doc' },
      { date: '2014-08', text: 'The Register: nové stanice Precision s Xeony Haswell-EP.', src: S.dellReg, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Zdroj 1300 W není výměna', text: '1300W zdroj potřebuje jinou rozvodnou desku a kabeláž; bez ní dá jen tolik co 825 W.', src: S.dell1300, fact: 'doc' },
      bWin11,
    ],
    history: [],
    market: mWs,
  },

  alt_t5820: {
    checked: CHECKED,
    supply: station(
      ['Procesory Xeon W-2100/W-2200 nebo Core X (Intel 14 nm, fab odhad)', S.intelSites, 'estimate', P.intelOr],
      ['Zdroj 950 W 80 PLUS Gold (Dell V7594; OEM výrobce neověřen)', S.dellGen, 'estimate'],
      ['Montáž pracovní stanice (Dell Xiamen, odhad)', S.dellXiamen, 'estimate', P.dellXm],
      ['Dell Precision T5820', S.dellGen, 'doc', P.dellHq]),
    companies: [
      { name: 'Dell', role: 'Výrobce stanice, zdroj 425 nebo 950 W', country: 'US', src: S.dellGen, fact: 'doc' },
      { name: 'Intel', role: 'Xeon W / Core X a čipset C422 / X299', country: 'US', src: S.dellGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2017-08-01', text: 'Dell ohlásil Precision 5820 Tower.', src: S.dellGen, fact: 'doc' },
      { date: '2017-10-03', text: 'Otevřeny objednávky.', src: S.dellGen, fact: 'doc' },
      { date: '2019', text: 'PCMag: 950W zdroj je nutný pro plně osazené sestavy.', src: S.pcmag5820, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Zdroj podle konfigurace', text: 'Se 425W zdrojem nemá rozpočet pro výkonné karty; dvě karty po 300 W jen s 950 W.', src: S.dellGen, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  alt_hp_z440: {
    checked: CHECKED,
    supply: station(
      ['Procesory Xeon E5-1600 v3/v4 (Intel 22/14 nm, fab odhad)', S.intel22, 'estimate', P.intelOr],
      ['Zdroj 700 W 90 % (HP 758467-001; OEM neověřen)', S.z440psu, 'estimate'],
      ['Montáž stanice (závod HP neověřen)', S.hpGen, 'estimate'],
      ['HP Z440', S.hpGen, 'doc', P.hpHq]),
    companies: [
      { name: 'HP', role: 'Výrobce stanice, zdroj 525 nebo 700 W', country: 'US', src: S.hpGen, fact: 'doc' },
      { name: 'Intel', role: 'Xeon E5-1600 v3/v4 a čipset C612', country: 'US', src: S.hpGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-09-09', text: 'HP ohlásilo Z440 za 1299 USD.', src: S.hpGen, fact: 'doc' },
      { date: '2019-07-08', text: 'Poslední verze QuickSpecs Z440.', src: S.hpGen, fact: 'doc' },
      { date: '2024-01-23', text: 'Poslední kritický BIOS 02.62 (opravy CVE 2022–2023).', src: S.hpGen, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Slabý zdroj pro dvě GPU', text: 'S 700W zdrojem je pro grafiku 335 W celkem a 225 W v hlavním slotu.', src: S.hpGen, fact: 'doc' },
      bWin11,
    ],
    history: [],
    market: mWs,
  },

  alt_hp_z640: {
    checked: CHECKED,
    supply: station(
      ['Procesory Xeon E5-1600/2600 v3/v4 (Intel, fab odhad)', S.intel22, 'estimate', P.intelOr],
      ['Zdroj 925 W 90 % (D12-925P1A; OEM neověřen)', S.z640psu, 'estimate'],
      ['Montáž stanice (závod HP neověřen)', S.hpGen, 'estimate'],
      ['HP Z640', S.hpGen, 'doc', P.hpHq]),
    companies: [
      { name: 'HP', role: 'Výrobce stanice, jen zdroj 925 W', country: 'US', src: S.hpGen, fact: 'doc' },
      { name: 'Intel', role: 'Xeon E5 v3/v4 a čipset C612', country: 'US', src: S.hpGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-08-21', text: 'První verze QuickSpecs řady Z440/Z640/Z840.', src: S.hpGen, fact: 'doc' },
      { date: '2014-09-09', text: 'HP ohlásilo Z640 za 1759 USD.', src: S.hpGen, fact: 'doc' },
      { date: '2024-01-23', text: 'Poslední kritický BIOS 02.62.', src: S.hpGen, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Rozpočet grafiky', text: 'Zdroj 925 W dává grafice 375 W celkem; dvě P100 jen přiškrcené na 150 W.', src: S.hpGen, fact: 'doc' },
      bWin11,
    ],
    history: [],
    market: mWs,
  },

  alt_hp_z840: {
    checked: CHECKED,
    supply: station(
      ['Procesory Xeon E5-2600 v3/v4 (Intel, fab odhad)', S.intel22, 'estimate', P.intelOr],
      ['Zdroj 1125 W 90 % Delta DPS-1125AB', S.z840delta, 'doc', P.deltaHq],
      ['Montáž stanice (závod HP neověřen)', S.hpGen, 'estimate'],
      ['HP Z840', S.z840qs, 'doc', P.hpHq]),
    companies: [
      { name: 'HP', role: 'Výrobce stanice, zdroj 850 nebo 1125 W', country: 'US', src: S.z840qs, fact: 'doc' },
      { name: 'Delta Electronics', role: 'Výrobce zdroje 1125 W (DPS-1125AB)', country: 'TW', src: S.z840delta, fact: 'doc' },
      { name: 'Intel', role: 'Xeon E5-2600 v3/v4 a čipset C612', country: 'US', src: S.hpGen, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-09-09', text: 'HP ohlásilo Z840 za 2399 USD.', src: S.hpGen, fact: 'doc' },
      { date: '2017-06-05', text: 'Poslední verze QuickSpecs Z840.', src: S.hpGen, fact: 'doc' },
      { date: '2024-01-23', text: 'Poslední kritický BIOS 02.62.', src: S.hpGen, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Plný výkon jen na 230 V', text: 'Zdroj 1125 W dá 1450 W jen při vstupu nad 200 V; některé Xeony ho vyžadují.', src: S.z840qs, fact: 'doc' },
      bWin11,
    ],
    history: [],
    market: mWs,
  },

  // ── Zdroje ──────────────────────────────────────────────────────────────────────────────────────────
  alt_rm850x: {
    checked: CHECKED,
    supply: psu(
      ['Montáž zdroje u CWT (Channel Well Technology), závody v Číně', S.cwtStock, 'estimate', P.cwtGz],
      ['Corsair RM850x', S.toms850x, 'doc', P.corsairHq], S.toms850x),
    companies: [
      { name: 'Corsair', role: 'Značka a specifikace zdroje', country: 'US', src: S.corsairWiki, fact: 'doc' },
      { name: 'Channel Well Technology (CWT)', role: 'OEM výrobce, platforma vyvinutá s Corsairem', country: 'TW', src: S.kg850x, fact: 'doc' },
    ],
    timeline: [
      { date: '2018', text: 'Revize RM850x (2018): 850 W, 80 PLUS Gold, 10 let záruky.', src: S.kg850x, fact: 'doc' },
      { date: '2021', text: 'Revize RM850x (2021): 80 PLUS Gold, Cybenetics ETA-A.', src: S.toms850x, fact: 'doc' },
      { date: '2024', text: 'RM850x Shift (ATX 3.1), opět od CWT.', src: S.tomsShift, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Výroba v Číně', text: 'Výrobní dceřiné firmy CWT jsou v pevninské Číně; cla a logistika se promítají do ceny.', src: S.cwtStock, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_focus_gx850: {
    checked: CHECKED,
    supply: psu(
      ['Montáž zdroje v závodech Seasonic (umístění neověřeno)', S.seaInv, 'estimate'],
      ['Seasonic Focus GX-850', S.seaFocus, 'doc', P.seasonicHq], S.tpuFocus),
    companies: [
      { name: 'Seasonic', role: 'Vývoj i výroba zdroje (vlastní OEM)', country: 'TW', src: S.seaWiki, fact: 'doc' },
      { name: 'Overclockers UK', role: 'Prodejce verze GX-850 ATX 3.1', country: 'GB', src: S.ocFocus31, fact: 'doc' },
    ],
    timeline: [
      { date: '2023', text: 'Řada Focus GX ATX 3.0 s kabelem 12V-2x6 (rok uvedení odhad).', src: S.seaFocus, fact: 'estimate' },
      { date: '2024', text: 'Verze Focus GX-850 V4 (ATX 3.1) v prodeji (rok odhad).', src: S.ocFocus31, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Záměna revizí', text: 'V prodeji jsou V3, V4 / ATX 3.1 i starší verze bez 12VHPWR; je třeba hlídat revizi.', src: S.wepcFocus, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  // ── Chlazení a kabely ───────────────────────────────────────────────────────────────────────────────
  alt_ornatetech_kit: {
    checked: CHECKED,
    supply: [
      n('resin', 2, 'Plast pro 3D tisk nebo vstřikování (PLA/ABS, odhad)', ['print'], S.printables, 'estimate'),
      n('print', 3, 'Výroba krytu (u podobných sad 3D tisk)', ['asm'], S.chillgpu, 'estimate'),
      n('screws', 3, 'Šroubky a montážní díly', ['asm'], S.chillgpu, 'estimate'),
      n('asm', 4, 'Balení sady (ventilátor 9733 se kupuje zvlášť)', ['maker'], S.chillEbay, 'estimate'),
      n('maker', 5, 'OrnateTech Blower Fan Adapter Kit (výrobce nedohledán)', undefined, S.chillgpu, 'estimate'),
    ],
    companies: [
      { name: 'OrnateTech', role: 'Prodejce sady podle dokumentu (eBay); nedohledán', country: 'US', src: S.chillgpu, fact: 'estimate' },
      { name: 'ChillGPU', role: 'Srovnatelné sady pro M40, K80, P40, P100, V100', country: 'US', src: S.chillgpu, fact: 'doc' },
    ],
    timeline: [
      { date: '2021-11-06', text: 'Hackaday: 3D tištěný kryt s ventilátorem chladí serverovou GPU v PC.', src: S.hackaday, fact: 'estimate' },
      { date: '2026-11', text: 'Podobné sady se prodávají na eBay a reach.dog; OrnateTech nedohledán.', src: S.chillEbay, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Slabé uchycení', text: 'Kupci podobných krytů hlásí slabou přírubu a jen 3 šroubky na straně P100.', src: S.chillgpu, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_arctic_pst_cable: {
    checked: CHECKED,
    supply: cable(
      ['Balení a distribuce (výroba v Asii, neověřeno)', S.scanPst, 'estimate'],
      ['Arctic PST Cable Rev.2', S.arcticPst, 'doc', P.arcticHq]),
    companies: [
      { name: 'Arctic', role: 'Značka; kabel PST je součást systému ventilátorů P', country: 'DE', src: S.arcticLoc, fact: 'estimate' },
      { name: 'Scan Computers', role: 'Prodejce (ACCBL00007A, 70 cm, 4 ventilátory)', country: 'GB', src: S.scanPst, fact: 'doc' },
    ],
    timeline: [
      { date: '2018', text: 'Arctic uvedl řadu ventilátorů P s rozbočením PST.', src: S.arcticPfan, fact: 'estimate' },
      { date: '2026-11', text: 'Rev.2: 1× 4pin → 4× 4pin, otáčky jen z prvního ventilátoru, 700 mm.', src: S.arcticPst, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Proud konektoru desky', text: 'Všechny ventilátory jdou z jednoho konektoru desky; ten obvykle unese 9,6–12 W.', src: S.noctuaSyc, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_noctua_syc1: {
    checked: CHECKED,
    supply: cable(
      ['Balení a distribuce (výroba neověřena)', S.quietpcSyc, 'estimate'],
      ['Noctua NA-SYC1', S.noctuaSyc, 'doc', P.noctuaHq]),
    companies: [
      { name: 'Noctua', role: 'Značka; 2× NA-YC1, 115 mm, 6 let záruka', country: 'AT', src: S.noctuaSyc, fact: 'doc' },
      { name: 'QuietPC', role: 'Prodejce sady 2 kabelů', country: 'GB', src: S.quietpcSyc, fact: 'doc' },
    ],
    timeline: [
      { date: '2026-11', text: 'Specifikace: 2× Y-kabel 4pin PWM, 115 mm, PWM jen u 4pin ventilátorů.', src: S.noctuaSyc, fact: 'doc' },
      { date: '2026-11', text: 'Prodávají se i barevné verze chromax.', src: S.noctuaChromax, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Proud konektoru desky', text: 'Noctua upozorňuje, že součet ventilátorů nesmí překročit limit konektoru (obvykle 9,6–12 W).', src: S.noctuaSyc, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  // ── Kandidáti na odhadnuté díly mého PC ─────────────────────────────────────────────────────────────
  alt_va249na: {
    checked: CHECKED,
    supply: [
      n('in', 0, 'Indium pro průhledné elektrody ITO', ['panel'], S.usgsIn, 'estimate', P.cnIn),
      n('si', 0, 'Křemen a hutní křemík', ['wafer'], S.usgsSi, 'estimate', P.cnSi),
      n('wafer', 2, 'Křemíkové wafery pro scaler', ['scaler'], S.shinEtsu, 'estimate', P.jpWafer),
      n('panel', 3, 'Panel VA 1920 × 1080 (výrobce neověřen; AUO jen odhad podle VA249HE)', ['asm'], S.auoAr, 'estimate', P.auoHq),
      n('scaler', 3, 'Scaler s vstupy DVI a VGA (typ neověřen)', ['asm'], S.displaydb, 'estimate'),
      n('asm', 4, 'Montáž monitoru (závod neověřen)', ['maker'], S.devicebeast, 'estimate'),
      n('maker', 5, 'ASUS VA249NA', undefined, S.displaydb, 'doc', P.asusHq),
    ],
    companies: [
      { name: 'ASUS', role: 'Značka monitoru', country: 'TW', src: S.asusAbout, fact: 'doc' },
      { name: 'AUO', role: 'Možný dodavatel panelu (neověřeno)', country: 'TW', src: S.auoAr, fact: 'estimate' },
    ],
    timeline: [
      { date: '2026-11', text: 'DisplayDB: VA, 1920 × 1080, vstupy DVI-D a D-sub, bez HDMI.', src: S.displaydb, fact: 'doc' },
      { date: '2026-11-11', text: 'Můj monitor jde přes HDMI, takže je to VA249HE (HDMI + VGA), ne VA249NA.', src: S.asusMon, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Chybí HDMI', text: 'Bez HDMI by RTX 3060 Ti potřebovala redukci DP → DVI.', src: S.displaydb, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_tonor_tc777: {
    checked: CHECKED,
    supply: mic(
      ['Kondenzátorová kapsle, kardioida (dodavatel neověřen)', S.kgTc777, 'estimate'],
      ['Montáž v Číně (odhad)', S.kgTc777, 'estimate'],
      ['TONOR TC-777', S.kgTc777, 'doc']),
    companies: [
      { name: 'TONOR', role: 'Značka mikrofonu', country: 'CN', src: S.kgTc777, fact: 'estimate' },
      { name: 'C-Media Electronics', role: 'USB audio kodeky, vlastní USB VID 0D8C', country: 'TW', src: S.cmediaWiki, fact: 'doc' },
    ],
    timeline: [
      { date: '1991', text: 'Založení C-Media v Tchaj-peji.', src: S.cmediaWiki, fact: 'doc' },
      { date: '2005-11-18', text: 'NetBSD: VID 0D8C patří C-Media.', src: S.netbsd, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Stejné USB ID u mnoha značek', text: 'Kodek C-Media používají desítky levných mikrofonů; USB ID značku neurčí.', src: S.cmediaWiki, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_tonor_tc310: {
    checked: CHECKED,
    supply: mic(
      ['Kondenzátorová kapsle, kardioida (dodavatel neověřen)', S.neweggTc310, 'estimate'],
      ['Montáž v Číně (odhad)', S.neweggBizTc310, 'estimate'],
      ['TONOR TC310', S.neweggTc310, 'doc']),
    companies: [
      { name: 'TONOR', role: 'Značka mikrofonu (kontakt v USA, Rancho Cucamonga)', country: 'US', src: S.tonorPr, fact: 'estimate' },
      { name: 'C-Media Electronics', role: 'USB audio kodeky, vlastní USB VID 0D8C', country: 'TW', src: S.cmediaWiki, fact: 'doc' },
    ],
    timeline: [
      { date: '1991', text: 'Založení C-Media v Tchaj-peji.', src: S.cmediaWiki, fact: 'doc' },
      { date: '2026-11', text: 'V prodeji TC310 a novější TC310+ (RGB, odstup signál/šum 78 dB).', src: S.neweggBizTc310, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Záměna verzí', text: 'Prodejci míchají TC310 a TC310+; parametry se liší.', src: S.neweggTc310, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_auna_cm900: {
    checked: CHECKED,
    supply: mic(
      ['Elektretová kapsle 16 mm', S.aunaManual, 'doc'],
      ['Výroba v Asii (vývoj v Berlíně)', S.hifiwiki, 'estimate'],
      ['auna MIC-900', S.aunaManual, 'doc', P.chaltec]),
    companies: [
      { name: 'Chal-Tec', role: 'Majitel značky auna (Berlín)', country: 'DE', src: S.chaltecTm, fact: 'doc' },
      { name: 'C-Media Electronics', role: 'USB audio kodeky, vlastní USB VID 0D8C', country: 'TW', src: S.cmediaWiki, fact: 'estimate' },
    ],
    timeline: [
      { date: '2007', text: 'Založení značky auna v Berlíně; výroba je v Asii.', src: S.hifiwiki, fact: 'doc' },
      { date: '2026-11', text: 'Manuál MIC-900: 30 Hz–18 kHz, citlivost -32 dB, USB 2.0.', src: S.aunaManual, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Mnoho variant', text: 'MIC-900, MIC-900B a Pro MIC-900 se mohou lišit; čip uvnitř neověřen.', src: S.mictests, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_hynix_ddr4_8g: {
    checked: CHECKED,
    supply: chip(
      ['Výroba DRAM SK hynix (fab neověřen)', S.hynixWiki, 'estimate', P.hynixIc],
      ['Pouzdření FBGA-78 (neověřeno)', S.hynixDs, 'estimate'],
      ['SK hynix H5AN8G8NAFR (DDR4 8 Gb ×8)', S.hynixDs, 'doc']),
    companies: [
      { name: 'SK hynix', role: 'Výrobce čipu DDR4', country: 'KR', src: S.hynixWiki, fact: 'doc' },
      { name: 'Kingston (HyperX)', role: 'Výrobce modulu Fury, na kterém by čip byl', country: 'US', src: S.kingstonDs, fact: 'estimate' },
    ],
    timeline: [
      { date: '2017-07', text: 'Datasheet rev. 1.2 rodiny H5AN8G (DDR4-1600 až 2666).', src: S.hynixDs, fact: 'doc' },
      { date: '2026-11', text: 'Varianta H5AN8G8NAFR-TFC: 1G × 8, FBGA-78, 1,2 V, 2133 Mb/s.', src: S.hynixPart, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Cykly trhu DRAM', text: 'Ceny DRAM kolísají s nedostatkem a přebytky; výrobci modulů mění dodavatele čipů.', src: S.dramShort, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  alt_micron_ddr4_8g: {
    checked: CHECKED,
    supply: chip(
      ['Výroba DRAM Micron (fab neověřen)', S.micronTw, 'estimate', P.micronTc],
      ['Pouzdření FBGA-78 (neověřeno)', S.micronDs, 'estimate'],
      ['Micron MT40A1G8 (DDR4 8 Gb ×8)', S.micronDs, 'doc', P.micronHq]),
    companies: [
      { name: 'Micron', role: 'Výrobce čipu DDR4', country: 'US', src: S.micronDs, fact: 'doc' },
      { name: 'Kingston (HyperX)', role: 'Výrobce modulu Fury, na kterém by čip byl', country: 'US', src: S.kingstonDs, fact: 'estimate' },
    ],
    timeline: [
      { date: '2017-09', text: 'Datasheet 8Gb DDR4 x4/x8/x16 (rev. L, 9/17).', src: S.micronDs, fact: 'estimate' },
      { date: '2026-11', text: 'Varianta -062E: DDR4-3200, 1G × 8.', src: S.micronDk, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Cykly trhu DRAM', text: 'Ceny DRAM kolísají s nedostatkem a přebytky; výrobci modulů mění dodavatele čipů.', src: S.dramShort, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },
};
