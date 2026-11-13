// Rešerše – viz index.js (schéma dat). AI PC: Dell T5810 + 2× Tesla P100 (+ Quadro K620).
const C = '2026-11-13';

// Zdroje (všechny otevřené nebo viděné ve výsledcích hledání při rešerši).
const S = {
  // suroviny a materiály
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-silicon.pdf',
  usgsSn: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tin.pdf',
  usgsTa: 'https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-tantalum.pdf',
  usgsCo: 'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-cobalt.pdf',
  usgsChile: 'https://www.usgs.gov/centers/national-minerals-information-center/chile',
  escondida: 'https://www.mining-technology.com/projects/escondida/',
  wacker: 'https://www.wacker.com/cms/en-at/press-and-media/press/press-releases/2025/press-releases-detail-2025-257922.html',
  shinEtsu: 'https://evertiq.com/news/19406',
  // Intel
  xeonArk: 'https://www.intel.com/content/www/us/en/products/sku/82765/intel-xeon-processor-e51650-v3-15m-cache-3-50-ghz/specifications.html',
  xeonOrder: 'https://www.intel.com/content/www/us/en/products/sku/82765/intel-xeon-processor-e51650-v3-15m-cache-3-50-ghz/ordering.html',
  xeonPcn: 'https://cdrdv2-public.intel.com/809095/PCN115659-00.pdf',
  grantley: 'https://www.semiaccurate.com/2014/09/08/intel-launches-grantley/',
  hswDie: 'https://pcper.com/2014/09/intel-xeon-e5-2600-v3-processor-overview-haswell-ep-up-to-18-cores/',
  intel22: 'https://www.cleanroomtechnology.com/intel-to-build-22nm-fabrication-plant-in-oregon-57457',
  intelSites: 'https://wikiwand.com/en/articles/List_of_Intel_manufacturing_sites',
  intelMy: 'https://www.techgoondu.com/2023/09/07/an-inside-look-at-intels-malaysia-chip-assembly-and-test-operations/',
  c612Ark: 'https://www.intel.com/content/www/us/en/products/sku/81759/intel-c612-chipset/specifications.html',
  c612Brief: 'https://www.intel.it/content/dam/www/public/us/en/documents/platform-briefs/xeon-e5-2600-v3-c612-chipset-brief.pdf',
  srvCpu2018: 'https://iconnect007.com/article/114048/x86-server-cpus-remain-market-mainstream-7nm-platform-may-help-amd-to-increase-market-share/114051/ein',
  // Dell
  dellAvail: 'https://amp.hothardware.com/news/dell-dishes-up-next-generation-precision-tower-and-rack-workstations',
  dellReg: 'https://www.theregister.com/2014/08/13/dell_adds_new_intel_chippery_to_monster_precision_workstation_line/',
  dellCgw: 'https://www.cgw.com/Press-Center/News/2014/Dell-ships-new-Precision-workstation-line.aspx',
  dellManual: 'https://www.dell.com/support/manuals/en-us/precision-t5810-workstation/precision_t5810_om_pub/technical-specifications',
  dellPsuKb: 'https://dell.com/support/kbdoc/en-us/000140822/dell-precision-5810-power-supply-six-pin-information',
  dellSuppliers: 'https://www.delltechnologies.com/asset/en-rs/solutions/business-solutions/briefs-summaries/dell-public-supplier-list.pdf',
  dellXiamen: 'https://cdrinfo.com/d7/content/dell-formally-opens-new-factory-xiamen',
  dellFamily: 'https://pcserverandparts.com/news/dell-precision-tower-workstations-explained-2026/',
  wsShare: 'https://www2.reseller.co.nz/article/566456/hp-ahead-desktop-workstations-battle-market-share/',
  psuCross: 'https://www.disctech.com/Dell-KTMT8-F685EF-01-DEL-D-0685ADU00-301-685W-Power-Supply-for-Precision-T5810-T7810-T7910-Workstati',
  psuUsed: 'https://www.itcreations.com/product/72556',
  // Samsung DRAM / HBM
  m393Arrow: 'https://www.arrow.com/en/products/m393a1g40eb1-crc/samsung-electronics',
  m393Guide: 'https://image.semiconductor.samsung.com/resources/product-guide/DDR4_Product_guide_May.18.pdf',
  k4aDs: 'https://dtsheet.com/doc/1754502/download',
  ddr4Mass: 'https://news.samsung.com/global/samsung-now-mass-producing-industrys-most-advanced-ddr4-using-20-nanometer-class-process-technology',
  hwaseong: 'https://cdrinfo.com/d7/content/samsung-build-biggest-chip-plant-south-korea',
  pyeongtaek: 'https://news.samsung.com/global/samsung-electronics-begins-mass-production-at-new-semiconductor-plant-in-pyeongtaek-south-korea',
  cheonanMod: 'https://trendforce.com/news/2026/09/16/news-samsung-reportedly-shifts-cheonan-capacity-to-hbm-packaging-outsource-conventional-memory-modules',
  cheonanTsv: 'https://www.asiae.co.kr/en/article/2023090113260743023',
  dram2016: 'https://www.trendforce.com/presscenter/news/20170214-9652.html',
  dramShort: 'https://www.trendforce.com/presscenter/news/20180110-9941.html',
  dramShort17: 'https://www.trendforce.com/presscenter/news/20170615-9777.html',
  hbm2Mass: 'https://phys.org/news/2016-01-samsung-mass-world-fastest-dram.html',
  hbm2_8g: 'https://news.samsung.com/global/samsung-increases-production-of-industrys-fastest-dram-8gb-hbm2-to-address-rapidly-growing-market-demand',
  hbmPaths: 'https://www.koreajoongangdaily.com/business/how-hbm-split-the-paths-of-samsung-amd-and-sk-hynix/11975341',
  // RCD
  rambusRcd: 'https://www.rambus.com/memory-interface-chips/ddr4-dimm-chipset/ddr4-register-clock-driver',
  idtLrdimm: 'https://www.businesswire.com/multimedia/home/20130128006545/en/',
  idtRcdPc: 'https://pc.watch.impress.co.jp/docs/news/586036.html',
  renesasRcd: 'https://www.renesas.com/en/products/4rcd0124k/part-details/4rcd0124kc0atg',
  equal: 'https://equalocean.com/analysis/2020081514536-intel-backed-memory-interface-maker-montage-left-out-right-track',
  // NVIDIA P100 / GP100
  p100Gtc: 'https://www.techpowerup.com/221481/nvidia-unveils-the-tesla-p100-hpc-board-based-on-pascal-architecture',
  p100Pcie: 'https://www.tweaktown.com/articles/7752/nvidias-new-tesla-p100-arrives-pcie-12-16gb-hbm2-variants/index.html',
  p100Q4: 'https://hothardware.com/news/nvidia-announces-tesla-p100-pci-express-card-shipping-q4',
  p100Pb: 'https://images.nvidia.com/content/tesla/pdf/NV-tesla-p100-pcie-PB-08248-001-v01.pdf',
  p100Ds: 'https://nvidia.com/content/dam/en-zz/Solutions/Data-Center/tesla-p100/pdf/nvidia-tesla-p100-PCIe-datasheet.pdf',
  p100News: 'https://nvidianews.nvidia.com/news/nvidia-tesla-p100-supercharges-hpc-applications-by-more-than-30x',
  p100Cowos: 'https://techgage.com/?p=37889',
  p100Pcper: 'https://pcper.com/2016/06/nvidia-announces-pcie-versions-of-tesla-p100/',
  p100Oem: 'https://wccftech.com/nvidia-tesla-p100-gp100-june-2016/',
  p100Yole: 'https://www.yolegroup.com/product/report/nvidia-tesla-p100-graphics-processing-unit-gpu-with-hbm2',
  pcgh: 'https://www.pcgameshardware.de/Pascal-Codename-265448/Specials/GP100-Top-Chip-Zusammenfassung-1191426/',
  pascalWiki: 'https://en.wikipedia.org/wiki/Pascal_(microarchitecture)',
  ciscoEol: 'https://www.cisco.com/c/en/us/products/collateral/servers-unified-computing/ucs-c-series-rack-servers/eos-eol-notice-c51-741579.html',
  gcpEol: 'https://docs.cloud.google.com/compute/docs/eol/p100-eos?hl=en',
  cuda13: 'https://docs.nvidia.com/cuda/archive/13.2.1/cuda-features-archive/index.html',
  cuda13Toms: 'https://www.tomshardware.com/pc-components/gpus/nvidia-to-drop-cuda-support-for-maxwell-pascal-and-volta-gpus-with-the-next-major-toolkit-release',
  nvTop500: 'https://www.roic.ai/quote/NVDA/transcripts/2016-year/4-quarter',
  fab14: 'https://design-reuse.com/news/30854/tsmc-breaks-ground-for-finfet-fab.html',
  cowosSites: 'https://www.trendforce.com/news/2024/06/12/news-tsmc-accelerates-cowos-advanced-packaging-capacity-construction-beginning-equipment-procurement-in-its-chiayi-plant/',
  crypto: 'https://www.techspot.com/article/1562-build-a-pc-bad-idea-gpu-pricing/',
  // chlazení
  shroudReach: 'https://m.reach.dog/shop/chillgpu/products/nvidia-tesla-blower-fan-kit-for-m40-k80-p40-p100-v100s',
  shroudTindie: 'https://www.tindie.com/products/stkn_sats/nvidia-tesla-gpu-cooling-fan-shroud',
  shroudPrintables: 'https://printables.com/model/449287',
  hackaday: 'https://hackaday.com/2021/11/06/3d-printed-fan-mount-keeps-server-gpu-cool-in-desktop-case',
  bfbDs: 'https://manualmachine.com/datasheet/bfb1012sh/23052320-datasheet-delta-electronics',
  bfbSeries: 'https://t-way.ru/upload/2020/10/7/Series-BFB.pdf',
  deltaWiki: 'https://en.wikipedia.org/wiki/Delta_Electronics',
  k620Dell: 'https://www.dell.com/en-us/work/shop/nvidia-quadro-k620-graphics-card-quadro-k620-2-gb-ddr3-pcie-20-x16-low-profile-dvi-displayport/apd/a7899926/graphic-video-card',
  xeonDm: 'https://directmacro.com/media/download_pdf/CM8064401548111-brochure-datasheet.pdf',
  pnyP100: 'https://manualmachine.com/pny/nvtp10016/8213998-user-manual',
  deltaStory: 'https://delta50.deltaww.com/en/story',
  deltaFans: 'https://landing.deltaww.com/en-US/products/0301/ALL/',
  deltaThai: 'https://www.deltathailand.com/en/pdf/ir/annual-report-2025.pdf',
  // Quadro K620 / GM107
  k620Ds: 'https://nvidia.cn/content/dam/en-zz/Solutions/design-visualization/documents/75509_DS_NV_Quadro_K620_US_NV_HR.pdf',
  k620Tpu: 'https://techpowerup.com/gpudb/2600/quadro-k620',
  k620Pny: 'https://www.pny.com/File%20Library/Support/PNY%20Products/Resource%20Center/NVIDIA%20-%20Quadro%20Graphics%20Cards/Portuguese/Product%20Brochure/NVIDIA-QUADRO-K620-POR.pdf',
  jprWs2014: 'https://www.jonpeddie.com/news/workstation-market-breaks-out-to-record-setting-quarter-in-q214-2/',
  gm107Toms: 'https://www.tomshardware.com/reviews/geforce-gtx-750-ti-review,3750.html',
  gm107Bit: 'https://bit-tech.net/reviews/tech/graphics/nvidia-geforce-gtx-750-ti-review/2/',
  gm107Wp: 'https://Techpowerup.com/gpu-specs/docs/nvidia-gtx-750-ti.pdf',
  fab15: 'https://pr.tsmc.com/english/news/1629',
};

// Opakující se uzly surovin a materiálu (fakticky obecné pro daný typ dílu → estimate).
const nSi = (to) => ({ id: 'm_si', stage: 0, name: 'Křemen a kovový křemík (Čína ~80 % světové produkce křemíkových materiálů)', to, src: S.usgsSi, fact: 'estimate' });
const nPoly = (to) => ({ id: 'r_poly', stage: 1, name: 'Polykrystalický křemík polovodičové čistoty (např. Wacker Burghausen)', place: { name: 'Burghausen', country: 'DE', lat: 48.17, lon: 12.83 }, to, src: S.wacker, fact: 'estimate' });
const nWafer = (to) => ({ id: 'w_si', stage: 2, name: '300mm křemíkové wafery (např. Shin-Etsu Handotai, závod Shirakawa)', place: { name: 'Nishigo, Fukušima', country: 'JP', lat: 37.14, lon: 140.16 }, to, src: S.shinEtsu, fact: 'estimate' });
const nCu = (to, name = 'Měď (Chile je největší producent; důl Escondida)') => ({ id: 'm_cu', stage: 0, name, place: { name: 'Escondida, Antofagasta', country: 'CL', lat: -24.27, lon: -69.07 }, to, src: S.escondida, fact: 'estimate' });
const nSn = (to) => ({ id: 'm_sn', stage: 0, name: 'Cín pro pájky (Indonésie, Bangka)', place: { name: 'Bangka', country: 'ID', lat: -2.1, lon: 106.1 }, to, src: S.usgsSn, fact: 'estimate' });
const nTa = (to) => ({ id: 'm_ta', stage: 0, name: 'Tantal pro kondenzátory (DR Kongo / Rwanda)', place: { name: 'Severní Kivu', country: 'CD', lat: -1.55, lon: 28.88 }, to, src: S.usgsTa, fact: 'estimate' });
const nCo = (to) => ({ id: 'm_co', stage: 0, name: 'Kobalt (DR Kongo ~73 % světové těžby; Kolwezi)', place: { name: 'Kolwezi', country: 'CD', lat: -10.71, lon: 25.47 }, to, src: S.usgsCo, fact: 'estimate' });

const NVIDIA_HQ = { name: 'Santa Clara', country: 'US', lat: 37.37, lon: -121.96 };
const INTEL_HQ = { name: 'Santa Clara', country: 'US', lat: 37.39, lon: -121.96 };
const DELL_HQ = { name: 'Round Rock, Texas', country: 'US', lat: 30.49, lon: -97.67 };
const SAMSUNG_HQ = { name: 'Suwon', country: 'KR', lat: 37.26, lon: 127.05 };
const HWASEONG = { name: 'Hwaseong', country: 'KR', lat: 37.22, lon: 127.06 };
const FAB14 = { name: 'TSMC Fab 14, Tainan (STSP)', country: 'TW', lat: 23.11, lon: 120.27 };
const FAB15 = { name: 'TSMC Fab 15, Taichung (CTSP)', country: 'TW', lat: 24.21, lon: 120.62 };

const tCuda13 = { date: '2025', text: 'CUDA Toolkit 13.0 odstranil podporu architektur Maxwell, Pascal a Volta; pro tyto GPU zůstává jen řada CUDA 12.x.', src: S.cuda13, fact: 'doc' };
const dram2016 = { category: 'DRAM (podíl na tržbách)', year: 2016, shares: [{ name: 'Samsung', pct: 47.5 }, { name: 'SK hynix', pct: 26.7 }, { name: 'Micron', pct: 19.4 }, { name: 'Ostatní (dopočet)', pct: 6.4 }], src: S.dram2016, fact: 'doc' };
const hDram = { year: 2017, title: 'Nedostatek serverové DRAM 2017–18', text: 'Kontraktní ceny serverových modulů vzrostly v 1Q17 asi o 40 %; DDR4 32GB RDIMM stál v lednu 2018 kolem 300 USD.', src: S.dramShort, fact: 'estimate' };

export default {
  ai_pc: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f_intel', 'f_tsmc', 'f_sam']),
      nCu(['a_dell', 'a_cowos']),
      { id: 'f_intel', stage: 3, name: 'Intel 22 nm (Xeon E5-1650 v3) – fab D1X / Fab 32', place: { name: 'Hillsboro (D1X)', country: 'US', lat: 45.55, lon: -122.91 }, to: ['a_dell'], src: S.intel22, fact: 'estimate' },
      { id: 'f_tsmc', stage: 3, name: 'TSMC 16FF+ (GP100)', place: FAB14, to: ['a_cowos'], src: S.pcgh, fact: 'estimate' },
      { id: 'f_sam', stage: 3, name: 'Samsung DRAM: HBM2 pro P100, DDR4 pro RDIMM', place: HWASEONG, to: ['a_cowos', 'a_dell'], src: S.pcgh, fact: 'estimate' },
      { id: 'a_cowos', stage: 4, name: 'TSMC CoWoS: GP100 + 4× HBM2 na interposeru', to: ['v_nvidia'], src: S.p100Cowos, fact: 'doc' },
      { id: 'a_dell', stage: 4, name: 'Montáž Dell Precision (Xiamen / Penang podle seznamu dodavatelů Dell)', place: { name: 'Xiamen', country: 'CN', lat: 24.51, lon: 118.17 }, to: ['v_dell'], src: S.dellSuppliers, fact: 'estimate' },
      { id: 'v_nvidia', stage: 5, name: 'NVIDIA – Tesla P100 16 GB PCIe (2×), Quadro K620', place: NVIDIA_HQ, src: S.p100Pb, fact: 'doc' },
      { id: 'v_dell', stage: 5, name: 'Dell – Precision Tower 5810', place: DELL_HQ, src: S.dellAvail, fact: 'doc' },
    ],
    companies: [
      { name: 'Dell', role: 'Výrobce pracovní stanice T5810 (skříň, deska, zdroj)', country: 'US', src: S.dellAvail, fact: 'doc' },
      { name: 'NVIDIA', role: 'Návrh GP100 a karet Tesla P100 a Quadro K620', country: 'US', src: S.p100Pb, fact: 'doc' },
      { name: 'Intel', role: 'CPU Xeon E5-1650 v3 a čipset C612', country: 'US', src: S.xeonArk, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba GP100 (16FF+) a pouzdření CoWoS', country: 'TW', src: S.pcgh, fact: 'doc' },
      { name: 'Samsung', role: 'HBM2 pro P100 a paměťové moduly DDR4', country: 'KR', src: S.pcgh, fact: 'doc' },
      { name: 'Delta Electronics', role: 'Radiální ventilátory BFB1012VH na P100', country: 'TW', src: S.bfbDs, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-09-09', text: 'Dell Precision Tower 5810 v celosvětovém prodeji.', src: S.dellAvail, fact: 'doc' },
      { date: '2016-06-20', text: 'NVIDIA ohlásila Tesla P100 ve verzi PCIe (12 a 16 GB HBM2).', src: S.p100Pcie, fact: 'doc' },
      { date: '2019-05-02', text: 'Cisco: poslední den objednávky P100 ve svých serverech, náhradou V100.', src: S.ciscoEol, fact: 'doc' },
      tCuda13,
      { date: '2026-09-15', text: 'Google Cloud ukončil instance s P100 (doporučuje T4 nebo L4).', src: S.gcpEol, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Jen použité kusy', text: 'T5810 i P100 se dnes prodávají jen jako repasované nebo bazarové kusy; nové se nevyrábějí.', src: S.psuUsed, fact: 'estimate' },
      { title: 'Konec softwarové podpory', text: 'Nové verze CUDA (13.x) už Pascal (P100) ani Maxwell (K620) neumí cílit; zůstává CUDA 12.x.', src: S.cuda13, fact: 'doc' },
      { title: 'Pasivní chlazení P100', text: 'Pasivní serverové karty potřebují v desktopu adaptér s ventilátorem, jinak se přehřívají.', src: S.hackaday, fact: 'estimate' },
    ],
    history: [
      { year: 2016, title: 'Omezená dostupnost P100', text: 'První P100 šly do DGX-1, HPC a cloudu; širší dostupnost u OEM až začátkem 2017, tisk to spojoval s HBM2.', src: S.p100Oem, fact: 'doc' },
      hDram,
    ],
    market: null,
  },

  t5810: {
    checked: C,
    supply: [
      nCu(['p_pcb']),
      nSn(['p_pcb']),
      { id: 'p_pcb', stage: 3, name: 'Základní deska a DPS (dodavatel Dellu neveřejný)', to: ['a_xm', 'a_pg'], src: S.dellSuppliers, fact: 'estimate' },
      { id: 'c_c612', stage: 3, name: 'Čipset Intel C612 (32 nm)', to: ['a_xm', 'a_pg'], src: S.c612Ark, fact: 'doc' },
      { id: 'c_psu', stage: 3, name: 'Zdroj 685 W 80 PLUS Gold (OEM výrobce neověřen)', to: ['a_xm', 'a_pg'], src: S.psuCross, fact: 'estimate' },
      { id: 'a_xm', stage: 4, name: 'Dell Xiamen (Precision Desktops)', place: { name: 'Xiamen', country: 'CN', lat: 24.51, lon: 118.17 }, to: ['v_dell'], src: S.dellSuppliers, fact: 'estimate' },
      { id: 'a_pg', stage: 4, name: 'Dell Penang (Precision Desktops)', place: { name: 'Penang', country: 'MY', lat: 5.36, lon: 100.46 }, to: ['v_dell'], src: S.dellSuppliers, fact: 'estimate' },
      { id: 'v_dell', stage: 5, name: 'Dell – Precision Tower 5810', place: DELL_HQ, src: S.dellReg, fact: 'doc' },
    ],
    companies: [
      { name: 'Dell', role: 'Výrobce a značka pracovní stanice', country: 'US', src: S.dellReg, fact: 'doc' },
      { name: 'Intel', role: 'Platforma Grantley: Xeon E5-1600/2600 v3 a čipset C612', country: 'US', src: S.c612Brief, fact: 'doc' },
      { name: 'Dell (závod Xiamen)', role: 'Montáž, v roce 2006 otevřen i pro pracovní stanice Precision', country: 'CN', src: S.dellXiamen, fact: 'estimate' },
    ],
    timeline: [
      { date: '2014-08-13', text: 'Dell představil Precision Tower 5810, 7810 a 7910 s Xeon E5 v3 a DDR4 (SIGGRAPH).', src: S.dellReg, fact: 'doc' },
      { date: '2014-09-09', text: 'Celosvětová dostupnost; uváděná cena od 1 612 USD.', src: S.dellAvail, fact: 'doc' },
      { date: '2017-08', text: 'Nástupce Precision 5820 Tower (Xeon W, čipset C422).', src: S.dellFamily, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Jen repasované kusy', text: 'Stanice se nevyrábí; díly (zdroje 685 W, desky) se shánějí z repasu a bazarů.', src: S.psuUsed, fact: 'estimate' },
      { title: 'Napájení GPU', text: 'Zdroj 685 W má omezený počet 6pin PCIe konektorů, což limituje počet výkonných karet.', src: S.dellPsuKb, fact: 'estimate' },
    ],
    history: [hDram],
    market: { category: 'Desktopové pracovní stanice (dodávky, 4Q 2014)', year: 2014, shares: [{ name: 'HP', pct: 44.6 }, { name: 'Dell', pct: 35.8 }, { name: 'Ostatní (dopočet)', pct: 19.6 }], src: S.wsShare, fact: 'doc' },
  },

  xeon_e5_1650v3: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f_d1x', 'f_32', 'f_28']),
      nCu(['f_d1x', 'f_32', 'f_28'], 'Měď pro propoje na čipu (Chile, Escondida)'),
      nSn(['a_pg', 'a_km']),
      { id: 'f_d1x', stage: 3, name: 'Intel D1X Hillsboro (vývoj a náběh 22 nm)', place: { name: 'Hillsboro, Oregon', country: 'US', lat: 45.55, lon: -122.91 }, to: ['a_pg', 'a_km'], src: S.intel22, fact: 'estimate' },
      { id: 'f_32', stage: 3, name: 'Intel Fab 32 Chandler (22 nm)', place: { name: 'Chandler, Arizona', country: 'US', lat: 33.27, lon: -111.89 }, to: ['a_pg', 'a_km'], src: S.intel22, fact: 'estimate' },
      { id: 'f_28', stage: 3, name: 'Intel Fab 28 Kirjat Gat (22 nm)', place: { name: 'Kirjat Gat', country: 'IL', lat: 31.62, lon: 34.77 }, to: ['a_pg', 'a_km'], src: S.intel22, fact: 'estimate' },
      { id: 'a_pg', stage: 4, name: 'Intel Penang – pouzdření a testy', place: { name: 'Penang', country: 'MY', lat: 5.35, lon: 100.3 }, to: ['v_intel'], src: S.intelMy, fact: 'estimate' },
      { id: 'a_km', stage: 4, name: 'Intel Kulim – pouzdření a testy', place: { name: 'Kulim', country: 'MY', lat: 5.41, lon: 100.56 }, to: ['v_intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'v_intel', stage: 5, name: 'Intel – Xeon E5-1650 v3 (Haswell-EP, 6 jader, 22 nm)', place: INTEL_HQ, src: S.xeonArk, fact: 'doc' },
    ],
    companies: [
      { name: 'Intel', role: 'Návrh, výroba wafer 22 nm, pouzdření a test', country: 'US', src: S.xeonArk, fact: 'doc' },
      { name: 'Wacker Chemie', role: 'Polykrystalický křemík polovodičové čistoty (typický dodavatel)', country: 'DE', src: S.wacker, fact: 'estimate' },
      { name: 'Shin-Etsu Handotai', role: '300mm wafery (typický dodavatel)', country: 'JP', src: S.shinEtsu, fact: 'estimate' },
      { name: 'Dell', role: 'OEM odběratel (Precision T5810)', country: 'US', src: S.dellReg, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-09-08', text: 'Intel uvedl platformu Grantley: Xeon E5-2600/1600 v3 (Haswell-EP) s DDR4.', src: S.grantley, fact: 'doc' },
      { date: '2014-09', text: 'E5-1650 v3 uveden ve 3Q 2014 (6 jader, 3,5/3,8 GHz, 15 MB L3, 140 W).', src: S.xeonDm, fact: 'doc' },
      { date: '2014', text: 'Die Haswell-EP pro 4–8 jader: asi 2,6 mld. tranzistorů, 354 mm², 22 nm.', src: S.hswDie, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Ukončená výroba', text: 'Intel vede E5-1650 v3 jako Retired/discontinued (PCN 115659-00); dostupné jen použité kusy.', src: S.xeonOrder, fact: 'doc' },
    ],
    history: [],
    market: { category: 'Serverové CPU (dodávky)', year: 2018, shares: [{ name: 'Intel', pct: 98 }, { name: 'AMD', pct: 2 }], src: S.srvCpu2018, fact: 'doc' },
  },

  c612: {
    checked: C,
    supply: [
      nWafer(['f_intel']),
      { id: 'f_intel', stage: 3, name: 'Intel 32 nm (fab neověřen)', to: ['a_intel'], src: S.c612Ark, fact: 'doc' },
      { id: 'a_intel', stage: 4, name: 'Intel pouzdření a test (Penang / Kulim / Chengdu)', place: { name: 'Kulim', country: 'MY', lat: 5.41, lon: 100.56 }, to: ['v_intel'], src: S.intelSites, fact: 'estimate' },
      { id: 'v_intel', stage: 5, name: 'Intel – C612 (Wellsburg)', place: INTEL_HQ, src: S.c612Ark, fact: 'doc' },
    ],
    companies: [
      { name: 'Intel', role: 'Návrh, výroba 32 nm a pouzdření PCH', country: 'US', src: S.c612Ark, fact: 'doc' },
      { name: 'Dell', role: 'Použití na desce Precision T5810', country: 'US', src: S.dellReg, fact: 'estimate' },
    ],
    timeline: [
      { date: '2014', text: 'C612 uveden s Xeon E5-2600/1600 v3 pro patici LGA 2011-3 (32 nm, TDP 7 W).', src: S.c612Ark, fact: 'doc' },
      { date: '2014-09-08', text: 'Start platformy Grantley (Xeon E5 v3 + C612).', src: S.grantley, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Vázán na desku', text: 'PCH je připájený na desce Dellu; náhrada jen výměnou celé základní desky z repasu.', src: S.dellManual, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  dell_psu685: {
    checked: C,
    supply: [
      nCu(['c_parts'], 'Měď pro transformátory a vinutí (Chile, Escondida)'),
      { id: 'c_parts', stage: 3, name: 'Výkonové součástky: MOSFET, kondenzátory, magnetika (dodavatelé neověřeni)', to: ['a_oem'], src: S.psuCross, fact: 'estimate' },
      { id: 'a_oem', stage: 4, name: 'OEM výrobce zdroje (zaměnitelná čísla F685EF-01, H685EF-00, DPS-685AB; výrobce neověřen)', to: ['v_dell'], src: S.psuCross, fact: 'estimate' },
      { id: 'v_dell', stage: 5, name: 'Dell – zdroj 685 W pro Precision T5810', place: DELL_HQ, src: S.dellPsuKb, fact: 'doc' },
    ],
    companies: [
      { name: 'Dell', role: 'Specifikace a značka zdroje (volby 425 / 685 / 825 W)', country: 'US', src: S.dellPsuKb, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-09', text: 'Zdroj 685 W jako jedna ze tří voleb napájení T5810 při uvedení stanice.', src: S.dellPsuKb, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Jen repas', text: 'Nové zdroje se neprodávají; repasované kusy stojí zhruba 30–250 USD podle prodejce.', src: S.psuUsed, fact: 'estimate' },
      { title: 'Rozdílné šasi', text: 'Zdroj 685 W nemusí pasovat do šasi pro 425 W; je třeba ověřit variantu šasi.', src: S.dellPsuKb, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  rdimm_m393: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f_hw']),
      nSn(['a_mod']),
      { id: 'f_hw', stage: 3, name: 'Samsung DRAM fab (Hwaseong) – čipy K4A4G045WE', place: HWASEONG, to: ['a_mod'], src: S.hwaseong, fact: 'estimate' },
      { id: 'c_rcd', stage: 3, name: 'Registr RCD (IDT nebo Montage, na modulu neověřeno)', to: ['a_mod'], src: S.equal, fact: 'estimate' },
      { id: 'a_mod', stage: 4, name: 'Samsung osazení modulů (Cheonan)', place: { name: 'Cheonan', country: 'KR', lat: 36.83, lon: 127.17 }, to: ['v_sam'], src: S.cheonanMod, fact: 'estimate' },
      { id: 'v_sam', stage: 5, name: 'Samsung – M393A1G40EB1 (8 GB DDR4 RDIMM, 1Rx4)', place: SAMSUNG_HQ, src: S.m393Arrow, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'DRAM čipy i modul', country: 'KR', src: S.m393Arrow, fact: 'doc' },
      { name: 'IDT (dnes Renesas)', role: 'Možný dodavatel RCD (~51 % trhu 2018)', country: 'US', src: S.equal, fact: 'estimate' },
      { name: 'Montage Technology', role: 'Možný dodavatel RCD (~46 % trhu 2018)', country: 'CN', src: S.equal, fact: 'estimate' },
    ],
    timeline: [
      { date: '2013-08-30', text: 'Samsung zahájil masovou výrobu 4Gb DDR4 ve třídě 20 nm pro servery.', src: S.ddr4Mass, fact: 'estimate' },
      { date: '2018', text: 'Produktový průvodce Samsung (květen 2018) vede M393A1G40EB1 jako EOL od 2Q18.', src: S.m393Guide, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Ukončený typ', text: 'Modul je u distributorů veden jako obsolete; kupuje se repas.', src: S.m393Arrow, fact: 'doc' },
    ],
    history: [hDram],
    market: dram2016,
  },

  ddr4_k4a4g045: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f_hw']),
      nCu(['a_pkg'], 'Měď (propoje, substrát FBGA; Chile)'),
      { id: 'f_hw', stage: 3, name: 'Samsung DRAM fab Hwaseong (4Gb E-die)', place: HWASEONG, to: ['a_pkg'], src: S.hwaseong, fact: 'estimate' },
      { id: 'a_pkg', stage: 4, name: 'Samsung back-end Onyang (pouzdro FBGA 78 kuliček)', place: { name: 'Onyang, Asan', country: 'KR', lat: 36.78, lon: 127.03 }, to: ['v_sam'], src: S.cheonanMod, fact: 'estimate' },
      { id: 'v_sam', stage: 5, name: 'Samsung – K4A4G045WE (DDR4 4 Gb ×4)', place: SAMSUNG_HQ, src: S.k4aDs, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung Electronics', role: 'Návrh, výroba a pouzdření DRAM', country: 'KR', src: S.k4aDs, fact: 'doc' },
      { name: 'Shin-Etsu Handotai', role: 'Wafery (typický dodavatel)', country: 'JP', src: S.shinEtsu, fact: 'estimate' },
    ],
    timeline: [
      { date: '2013-08-30', text: 'Samsung: masová výroba 4Gb DDR4 ve třídě 20 nm (2 667 Mb/s, o 30 % nižší spotřeba než DDR3).', src: S.ddr4Mass, fact: 'estimate' },
      { date: '2016-04', text: 'Datasheet K4A4G045WE revize 1.2.', src: S.k4aDs, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Koncentrace výroby', text: 'Tři výrobci drželi v roce 2016 přes 93 % trhu DRAM, Samsung téměř polovinu.', src: S.dram2016, fact: 'doc' },
    ],
    history: [hDram],
    market: dram2016,
  },

  ddr4_rcd: {
    checked: C,
    supply: [
      nWafer(['f_fdry']),
      { id: 'f_fdry', stage: 3, name: 'Výroba wafer u slévárny (neověřeno)', to: ['a_osat'], src: S.equal, fact: 'estimate' },
      { id: 'a_osat', stage: 4, name: 'Pouzdření a test (neověřeno)', to: ['v_idt', 'v_montage', 'v_rambus'], src: S.equal, fact: 'estimate' },
      { id: 'v_idt', stage: 5, name: 'IDT 4RCD0124 (dnes Renesas)', place: { name: 'San Jose', country: 'US', lat: 37.25, lon: -121.78 }, src: S.renesasRcd, fact: 'estimate' },
      { id: 'v_montage', stage: 5, name: 'Montage Technology', place: { name: 'Šanghaj', country: 'CN', lat: 31.2, lon: 121.6 }, src: S.equal, fact: 'estimate' },
      { id: 'v_rambus', stage: 5, name: 'Rambus (RCD převzatý od Inphi)', place: { name: 'San Jose', country: 'US', lat: 37.34, lon: -121.89 }, src: S.rambusRcd, fact: 'estimate' },
    ],
    companies: [
      { name: 'IDT / Renesas', role: 'RCD 4RCD0124; ~51 % trhu paměťových rozhraní 2018', country: 'US', src: S.equal, fact: 'doc' },
      { name: 'Montage Technology', role: '~46 % trhu paměťových rozhraní 2018', country: 'CN', src: S.equal, fact: 'doc' },
      { name: 'Rambus', role: '~3 % trhu; DDR4 RCD převzatý od Inphi', country: 'US', src: S.rambusRcd, fact: 'doc' },
    ],
    timeline: [
      { date: '2012-09', text: 'IDT ohlásil registr DDR4 4RCD0124.', src: S.idtRcdPc, fact: 'estimate' },
      { date: '2013-01-28', text: 'IDT: kompletní čipset DDR4 LRDIMM, RCD 4RCD0124 už dostupný.', src: S.idtLrdimm, fact: 'estimate' },
      { date: '2019', text: 'IDT převzala Renesas.', src: S.equal, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Duopol', text: 'Trh RCD/DB ovládají prakticky dva dodavatelé (IDT a Montage).', src: S.equal, fact: 'doc' },
    ],
    history: [],
    market: { category: 'Čipy paměťového rozhraní (RCD/DB)', year: 2018, shares: [{ name: 'IDT', pct: 51 }, { name: 'Montage', pct: 46 }, { name: 'Rambus', pct: 3 }], src: S.equal, fact: 'doc' },
  },

  tesla_p100: {
    checked: C,
    supply: [
      nCu(['c_board']),
      nTa(['c_board']),
      { id: 'f_gp100', stage: 3, name: 'GP100 na TSMC 16FF+ (fab odhad)', place: FAB14, to: ['a_cowos'], src: S.pcgh, fact: 'estimate' },
      { id: 'f_hbm', stage: 3, name: 'HBM2 od Samsungu (4 stacky, 16 GB; fab odhad)', place: HWASEONG, to: ['a_cowos'], src: S.pcgh, fact: 'estimate' },
      { id: 'c_board', stage: 3, name: 'DPS, VRM a kondenzátory karty (dodavatelé neveřejní)', to: ['a_board'], src: S.p100Pb, fact: 'estimate' },
      { id: 'a_cowos', stage: 4, name: 'TSMC CoWoS – GPU a HBM2 na křemíkovém interposeru (pak osazení na kartu)', to: ['v_nv'], src: S.p100Cowos, fact: 'doc' },
      { id: 'a_board', stage: 4, name: 'Osazení karty (smluvní výrobce neověřen)', to: ['v_nv'], src: S.p100Pb, fact: 'estimate' },
      { id: 'v_nv', stage: 5, name: 'NVIDIA – Tesla P100 16 GB PCIe (250 W, pasivní)', place: NVIDIA_HQ, src: S.p100Ds, fact: 'doc' },
    ],
    companies: [
      { name: 'NVIDIA', role: 'Návrh GPU a karty', country: 'US', src: S.p100Pb, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba GP100 16FF+ a CoWoS', country: 'TW', src: S.pcgh, fact: 'doc' },
      { name: 'Samsung', role: 'HBM2 paměť', country: 'KR', src: S.pcgh, fact: 'doc' },
      { name: 'PNY', role: 'Distribuce karet Tesla P100 (TCSP100M-16GB-PB)', country: 'US', src: S.pnyP100, fact: 'estimate' },
      { name: 'Cisco', role: 'OEM (servery UCS s P100)', country: 'US', src: S.ciscoEol, fact: 'doc' },
    ],
    timeline: [
      { date: '2016-04-05', text: 'Představení Tesla P100 (GP100, Pascal) na GTC.', src: S.p100Gtc, fact: 'doc' },
      { date: '2016-06-20', text: 'Ohlášena verze PCIe: 16 GB (720 GB/s) a 12 GB (540 GB/s), 250 W.', src: S.p100Pcie, fact: 'doc' },
      { date: '2016-10', text: 'Produktový brief PB-08248-001 v01 pro kartu PCIe.', src: S.p100Pb, fact: 'doc' },
      { date: '2016', text: 'Dodávky verze PCIe ve 4Q 2016.', src: S.p100Q4, fact: 'doc' },
      { date: '2018-11-01', text: 'Cisco ohlásilo konec prodeje P100, náhradou V100.', src: S.ciscoEol, fact: 'doc' },
      { date: '2024-04-30', text: 'Cisco: poslední den podpory P100.', src: S.ciscoEol, fact: 'doc' },
      tCuda13,
      { date: '2026-09-15', text: 'Konec P100 v Google Cloud.', src: S.gcpEol, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'HBM2 v roce 2016', text: 'Tisk spojoval pozdní a omezené dodávky P100 a nižší počet stacků u 12GB verze s nabídkou HBM2.', src: S.p100Pcper, fact: 'estimate' },
      { title: 'Jen bazar', text: 'Karta se nevyrábí a cloud ji vyřazuje; dostupné jsou jen použité kusy.', src: S.gcpEol, fact: 'estimate' },
    ],
    history: [
      { year: 2016, title: 'Přednostní dodávky', text: 'Nejdřív DGX-1, HPC a cloud; OEM servery až v 1Q 2017.', src: S.p100Oem, fact: 'doc' },
      { year: 2017, title: 'Kryptoboom', text: 'Od června 2017 rostly ceny herních GPU kvůli těžbě Etherea; datacentrové P100 se to týkalo jen nepřímo.', src: S.crypto, fact: 'estimate' },
    ],
    market: { category: 'Superpočítače TOP500 s akcelerátory (podíl s NVIDIA)', year: 2016, shares: [{ name: 'NVIDIA', pct: 67 }, { name: 'Ostatní', pct: 33 }], src: S.nvTop500, fact: 'doc' },
  },

  gp100: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f14']),
      nCu(['f14'], 'Měď pro propoje na čipu (Chile)'),
      nCo(['f14']),
      { id: 'f14', stage: 3, name: 'TSMC 16FF+ (GigaFab 14, Tainan)', place: FAB14, to: ['a_cowos'], src: S.fab14, fact: 'estimate' },
      { id: 'a_cowos', stage: 4, name: 'TSMC CoWoS (interposer + 4× HBM2)', to: ['v_nv'], src: S.p100Cowos, fact: 'doc' },
      { id: 'v_nv', stage: 5, name: 'NVIDIA – GP100 (610 mm², 15,3 mld. tranzistorů)', place: NVIDIA_HQ, src: S.pcgh, fact: 'doc' },
    ],
    companies: [
      { name: 'NVIDIA', role: 'Návrh čipu (Pascal)', country: 'US', src: S.pascalWiki, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba 16FF+ a CoWoS', country: 'TW', src: S.pcgh, fact: 'doc' },
      { name: 'Samsung', role: 'HBM2 vedle čipu na interposeru', country: 'KR', src: S.pcgh, fact: 'doc' },
    ],
    timeline: [
      { date: '2012-11', text: 'TSMC zahájila stavbu fáze 6 Fab 14 pro 16nm FinFET.', src: S.fab14, fact: 'estimate' },
      { date: '2016-04-05', text: 'GP100 představen v Tesla P100: 610 mm², 15,3 mld. tranzistorů, TSMC 16FF+.', src: S.pcgh, fact: 'doc' },
      tCuda13,
    ],
    bottlenecks: [
      { title: 'Velký čip a CoWoS', text: 'Čip 610 mm² na interposeru s HBM2 znamenal nízkou výtěžnost a složité pouzdření; přesná čísla nezveřejněna.', src: S.p100Cowos, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  hbm2_stack: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f_dram']),
      { id: 'f_dram', stage: 3, name: 'Samsung 20nm DRAM: 4 jádrové čipy 8 Gb + buffer die', place: HWASEONG, to: ['a_tsv'], src: S.hbm2Mass, fact: 'doc' },
      { id: 'a_tsv', stage: 4, name: 'Vrstvení přes TSV a mikrobumpy (Samsung, Cheonan)', place: { name: 'Cheonan', country: 'KR', lat: 36.83, lon: 127.17 }, to: ['v_sam'], src: S.cheonanTsv, fact: 'estimate' },
      { id: 'v_sam', stage: 5, name: 'Samsung – HBM2 4 GB (4-Hi)', place: SAMSUNG_HQ, src: S.hbm2Mass, fact: 'doc' },
    ],
    companies: [
      { name: 'Samsung', role: 'Výroba HBM2 pro Tesla P100', country: 'KR', src: S.pcgh, fact: 'doc' },
      { name: 'SK hynix', role: 'Konkurent; s HBM2 v roce 2017 zaostával', country: 'KR', src: S.hbmPaths, fact: 'doc' },
      { name: 'TSMC', role: 'Osazení stacků na interposer (CoWoS)', country: 'TW', src: S.p100Cowos, fact: 'doc' },
    ],
    timeline: [
      { date: '2016-01-19', text: 'Samsung zahájil masovou výrobu 4GB HBM2 (256 GB/s, 20 nm, ECC).', src: S.hbm2Mass, fact: 'doc' },
      { date: '2016-04', text: 'Tesla P100 používá 16 GB HBM2 od Samsungu.', src: S.pcgh, fact: 'doc' },
      { date: '2017-07', text: 'Samsung navýšil výrobu 8GB HBM2 kvůli poptávce.', src: S.hbm2_8g, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'TSV a výtěžnost', text: 'Vrstvení přes TSV bylo v letech 2016–17 úzkým hrdlem nabídky HBM2.', src: S.p100Pcper, fact: 'estimate' },
      { title: 'Jeden dodavatel', text: 'V roce 2016 vyráběl HBM2 ve velkém jen Samsung; SK hynix neprošel testy hlavních zákazníků.', src: S.hbmPaths, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  shroud: {
    checked: C,
    supply: [
      { id: 'r_plast', stage: 2, name: 'Plast pro 3D tisk nebo vstřikování (materiál neověřen)', to: ['a_print'], src: S.hackaday, fact: 'estimate' },
      { id: 'a_print', stage: 4, name: '3D tisk adaptéru pro radiální ventilátor 97 mm', to: ['v_seller'], src: S.shroudReach, fact: 'estimate' },
      { id: 'v_seller', stage: 5, name: 'Neznačkový prodejce (e-shopy, Tindie, Printables)', src: S.shroudTindie, fact: 'estimate' },
    ],
    companies: [
      { name: 'Malí prodejci adaptérů', role: 'Kity pro M40/K80/P40/P100/V100s s ventilátorem 97 mm', country: 'US', src: S.shroudReach, fact: 'estimate' },
    ],
    timeline: [
      { date: '2021-11-06', text: 'Hackaday popisuje 3D tištěné držáky ventilátoru pro serverové GPU v desktopu.', src: S.hackaday, fact: 'estimate' },
      { date: '2023', text: 'Volně dostupné modely adaptérů pro P40/P100 (např. pro 120mm blower).', src: S.shroudPrintables, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Žádný oficiální díl', text: 'NVIDIA k pasivním kartám aktivní chlazení nedodává; adaptéry jsou neoficiální.', src: S.hackaday, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  bfb1012vh: {
    checked: C,
    supply: [
      nCu(['c_motor'], 'Měď pro vinutí motoru (Chile)'),
      { id: 'r_plast', stage: 2, name: 'Plast oběžného kola a rámu (UL 94V-0)', to: ['a_dg', 'a_wj', 'a_th'], src: S.bfbDs, fact: 'doc' },
      { id: 'c_motor', stage: 3, name: 'Motor BLDC s kuličkovými ložisky', to: ['a_dg', 'a_wj', 'a_th'], src: S.bfbDs, fact: 'doc' },
      { id: 'a_dg', stage: 4, name: 'Delta Dongguan (Shijie)', place: { name: 'Dongguan', country: 'CN', lat: 23.1, lon: 113.81 }, to: ['v_delta'], src: S.deltaStory, fact: 'estimate' },
      { id: 'a_wj', stage: 4, name: 'Delta Wujiang', place: { name: 'Wujiang, Suzhou', country: 'CN', lat: 31.16, lon: 120.64 }, to: ['v_delta'], src: S.deltaWiki, fact: 'estimate' },
      { id: 'a_th', stage: 4, name: 'Delta Electronics (Thailand), Bangpoo', place: { name: 'Samut Prakan', country: 'TH', lat: 13.52, lon: 100.66 }, to: ['v_delta'], src: S.deltaThai, fact: 'estimate' },
      { id: 'v_delta', stage: 5, name: 'Delta Electronics – BFB1012VH (12 V, 1,5 A, 4 500 ot/min)', place: { name: 'Tchaj-pej', country: 'TW', lat: 25.08, lon: 121.57 }, src: S.bfbDs, fact: 'doc' },
    ],
    companies: [
      { name: 'Delta Electronics', role: 'Výrobce ventilátorů řady BFB', country: 'TW', src: S.bfbDs, fact: 'doc' },
      { name: 'Delta Electronics (Thailand)', role: 'Dceřiná firma, výroba mj. ventilátorů (Wellgrow, Bangpoo)', country: 'TH', src: S.deltaThai, fact: 'estimate' },
    ],
    timeline: [
      { date: '1971', text: 'Založení Delta Electronics v Sin-čuangu (Tchaj-pej); firma je známá DC ventilátory.', src: S.deltaWiki, fact: 'doc' },
      { date: '1991', text: 'Delta zahájila velkou výrobu v čínském Dongguanu.', src: S.deltaStory, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Varianty přípon', text: 'PWM a tacho mají jen některé varianty (-AF00 apod.); u kusu je nutné ověřit příponu.', src: S.bfbSeries, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  k620: {
    checked: C,
    supply: [
      nCu(['c_board']),
      { id: 'f_gm107', stage: 3, name: 'GM107 na TSMC 28 nm', place: FAB15, to: ['a_board'], src: S.k620Tpu, fact: 'estimate' },
      { id: 'c_ddr3', stage: 3, name: 'DDR3 2 GB, 128 bit (výrobce čipů neověřen)', to: ['a_board'], src: S.k620Ds, fact: 'estimate' },
      { id: 'c_board', stage: 3, name: 'DPS a napájení karty (45 W, bez přídavného konektoru)', to: ['a_board'], src: S.k620Pny, fact: 'estimate' },
      { id: 'a_board', stage: 4, name: 'Osazení karty (smluvní výrobce neověřen)', to: ['v_nv'], src: S.k620Ds, fact: 'estimate' },
      { id: 'v_nv', stage: 5, name: 'NVIDIA – Quadro K620 2 GB', place: NVIDIA_HQ, src: S.k620Ds, fact: 'doc' },
    ],
    companies: [
      { name: 'NVIDIA', role: 'Návrh GPU a referenční karty', country: 'US', src: S.k620Ds, fact: 'doc' },
      { name: 'PNY', role: 'Distribuce karet Quadro', country: 'US', src: S.k620Pny, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba GM107 (28 nm)', country: 'TW', src: S.gm107Wp, fact: 'estimate' },
      { name: 'Dell', role: 'Prodej K620 jako příslušenství a OEM karty do stanic', country: 'US', src: S.k620Dell, fact: 'doc' },
    ],
    timeline: [
      { date: '2014-07-22', text: 'Uvedení Quadro K620 (GM107, 384 CUDA jader, 2 GB DDR3).', src: S.k620Tpu, fact: 'doc' },
      { date: '2016-03', text: 'Aktuální datasheet NVIDIA 75509.', src: S.k620Ds, fact: 'doc' },
      tCuda13,
    ],
    bottlenecks: [
      { title: 'Jen bazar', text: 'Karta se už neprodává nově; dostupné jsou použité kusy.', src: S.k620Tpu, fact: 'estimate' },
    ],
    history: [],
    market: { category: 'Profesionální GPU do pracovních stanic (2Q 2014, kusy)', year: 2014, shares: [{ name: 'NVIDIA Quadro', pct: 74 }, { name: 'AMD FirePro', pct: 25 }, { name: 'Ostatní (dopočet)', pct: 1 }], src: S.jprWs2014, fact: 'doc' },
  },

  gm107: {
    checked: C,
    supply: [
      nSi(['r_poly']),
      nPoly(['w_si']),
      nWafer(['f15']),
      nCu(['f15'], 'Měď pro propoje na čipu (Chile)'),
      { id: 'f15', stage: 3, name: 'TSMC 28 nm (GigaFab 15, Taichung)', place: FAB15, to: ['a_osat'], src: S.fab15, fact: 'estimate' },
      { id: 'a_osat', stage: 4, name: 'Flip-chip pouzdření (dodavatel neověřen)', to: ['v_nv'], src: S.gm107Toms, fact: 'estimate' },
      { id: 'v_nv', stage: 5, name: 'NVIDIA – GM107 (148 mm², 1,87 mld. tranzistorů)', place: NVIDIA_HQ, src: S.gm107Toms, fact: 'doc' },
    ],
    companies: [
      { name: 'NVIDIA', role: 'Návrh prvního čipu Maxwell', country: 'US', src: S.gm107Toms, fact: 'doc' },
      { name: 'TSMC', role: 'Výroba 28 nm', country: 'TW', src: S.gm107Wp, fact: 'estimate' },
    ],
    timeline: [
      { date: '2014-02-18', text: 'GM107 debutuje v GTX 750 Ti jako první čip Maxwell (28 nm).', src: S.gm107Bit, fact: 'doc' },
      { date: '2014-07-22', text: 'Quadro K620 s GM107 (varianta GM107-850-A2).', src: S.k620Tpu, fact: 'doc' },
      tCuda13,
    ],
    bottlenecks: [
      { title: 'Stejný proces 28 nm', text: 'Maxwell zůstal na 28 nm, protože menší uzel ještě nebyl k dispozici; zisk šel jen z architektury.', src: S.gm107Toms, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },
};
