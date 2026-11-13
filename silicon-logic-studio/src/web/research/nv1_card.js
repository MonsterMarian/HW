// Rešerše – viz index.js (schéma dat). Karta Diamond Edge 3D 2120 (NVIDIA NV1 / SGS-Thomson STG2000X), 1995.
const C = '2026-11-13';

// Zdroje (všechny otevřené nebo viděné ve výsledcích vyhledávání při rešerši).
const S = {
  wikiNv1: 'https://en.wikipedia.org/wiki/NV1',
  vgam: 'https://www.vgamuseum.info/index.php/cpu/item/542-diamond-edge-3d-2120xl-nvidia-nv1',
  dosdays: 'https://dosdays.co.uk/topics/Manufacturers/diamond/diamond_edge_3d.php',
  v3d: 'https://vintage3d.org/nv1.php',
  stPress: 'https://discmaster.textfiles.com/file/34265/stdatalib.iso/stonline/news/496xp.htm?html=true',
  ieeeNv1: 'https://www.computer.org/publications/tech-news/chasing-pixels/nvidias-quadratic-processor-the-nv1/',
  wikiNvidia: 'https://en.wikipedia.org/wiki/Nvidia',
  wikiSt: 'https://en.wikipedia.org/wiki/STMicroelectronics',
  stKirkop: 'https://www.st.com/content/st_com/en/about/manufacturing-at-st/our-facilities/kirkop-st-site.html',
  wikiDiamond: 'https://en.wikipedia.org/wiki/Diamond_Multimedia',
  s3Filing: 'https://capedge.com/filing/s3-content/0000891618-00-001867/1',
  wikiHynix: 'https://en.wikipedia.org/wiki/SK_Hynix',
  seoul1995: 'https://www.seoul.co.kr/news/1995/09/11/19950911017001',
  regDram1999: 'https://www.theregister.com/1999/12/08/idc_names_hyundai_top_dram/',
  dram1996: 'https://www.docsity.com/pt/docs/memory-1997-sec02/4871939/',
  pcPrices1996: 'https://www.spokesman.com/stories/1996/jun/25/personal-computer-prices-are-plummeting-and-costs/',
  sumitomoCase: 'https://shippai.org/fkd/en/cfen/CC1200024.html',
  sumitomoUpi: 'https://www.upi.com/Archives/1993/11/30/Computer-chip-group-resin-shortage-averted/3437754635600/',
  usgsSi: 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-silicon.pdf',
  usgsCu: 'https://data.usgs.gov/datacatalog/data/USGS:65b7d77ed34e36a39045b4b2',
  usgsAu: 'https://data.usgs.gov/datacatalog/data/USGS:65b7d7b2d34e36a39045b4c8',
  usgsSn: 'https://data.usgs.gov/datacatalog/data/USGS:65b7d8c7d34e36a39045b536',
  sprucePine: 'https://en.wikipedia.org/wiki/Spruce_Pine,_North_Carolina',
  adProduct: 'https://www.analog.com/en/products/ad1845.html',
  adDatasheet: 'https://sunsite.icm.edu.pl/Linux/alsa/manuals/ad/ad1845.pdf',
  wikiAdi: 'https://en.wikipedia.org/wiki/Analog_Devices',
  stg1764: 'https://datasheets360.com/part/detail/stg1764x-17/3696798650642392625/',
  ramdacTxt: 'https://pdos.csail.mit.edu/6.828/2014/readings/hardware/vgadoc/RAMDAC.TXT',
  wikiEprom: 'https://en.wikipedia.org/wiki/EPROM',
  wikiXtal: 'https://en.wikipedia.org/wiki/Crystal_oscillator',
  piDatasheet: 'https://mouser.com/datasheet/2/115/pericom_pi5c3245-1164968.pdf',
  piDiodes: 'https://diodes.com/part/view/PI5C3245',
  piSec: 'https://www.sec.gov/Archives/edgar/data/29002/000156459015011118/diod-ex991_6.htm',
  vogonsSgp: 'https://www.vogons.org/viewtopic.php?p=1420560',
  wikiVga: 'https://en.wikipedia.org/wiki/VGA_connector',
  vga2015: 'https://www.engadget.com/2010/12/09/major-tech-manufacturers-to-drop-vga-by-2015-apple-wonders-what/',
  wikiGameport: 'https://en.wikipedia.org/wiki/Game_port',
  wikiJack: 'https://en.wikipedia.org/wiki/Phone_connector_(audio)',
  wikiPci: 'https://en.wikipedia.org/wiki/Peripheral_Component_Interconnect',
  tiLm2941: 'https://www.ti.com/product/LM2941',
  nscLm2941: 'https://manualmachine.com/nsc/lm2941cs/4232282-datasheet',
  tiNsc: 'https://www.sec.gov/Archives/edgar/data/0000097476/000009747611000041/d8k09232011.htm',
  tiNscPress: 'https://investor.ti.com/node/23621',
  lm2941Nrnd: 'https://www.radiolocman.com/datasheet/data.html?di=230123',
  mchp93c46: 'https://www.alldatasheet.com/datasheet-pdf/pdf/99310/MICROCHIP/93C46B.html',
  fsc93c46: 'https://manualmachine.com/fairchildsemiconductor/nm93c46alm8/4178585-datasheet/',
  st93c46: 'https://www.digikey.com/en/products/detail/stmicroelectronics/M93C46-RMN3TP-K/4729235',
  on93c46: 'https://www.microchipusa.com/product/onsemi/memory-2/NM93C46EN',
  wikiCrt: 'https://en.wikipedia.org/wiki/Cathode-ray_tube',
  wikiSaturn: 'https://en.wikipedia.org/wiki/Sega_Saturn',
};

// Místa (souřadnice přibližné, na úroveň areálu / města).
const P = {
  kirkop: { name: 'ST Kirkop (montáž a test), Malta', country: 'MT', lat: 35.841, lon: 14.486 },
  sprucePine: { name: 'Spruce Pine, Severní Karolína (vysoce čistý křemen)', country: 'US', lat: 35.911, lon: -82.073 },
  icheon: { name: 'Icheon, Gyeonggi (areál Hyundai Electronics, dnes SK hynix)', country: 'KR', lat: 37.24, lon: 127.49 },
  generalTrias: { name: 'Analog Devices, General Trias (test)', country: 'PH', lat: 14.33, lon: 120.91 },
  southPortland: { name: 'National Semiconductor, South Portland, Maine', country: 'US', lat: 43.63, lon: -70.3 },
  greenock: { name: 'National Semiconductor, Greenock', country: 'GB', lat: 55.93, lon: -4.77 },
  melaka: { name: 'National Semiconductor, Melaka', country: 'MY', lat: 2.25, lon: 102.25 },
};

const n = (id, stage, name, to, src, fact, place) => ({ id, stage, name, ...(place ? { place } : {}), ...(to.length ? { to } : {}), src, fact });

// Obecná surovinová část čipu (křemík, zlatý drát, Cu rámeček, epoxid) – vše odhad pro typ dílu.
const chipRaw = (wafer, pkg) => [
  n('si_mine', 0, 'Těžba křemene / výroba křemíku (dnes >70 % Čína)', ['si_poly'], S.usgsSi, 'estimate'),
  n('si_poly', 1, 'Rafinace na polykrystalický křemík', [wafer], S.usgsSi, 'estimate'),
  n('au', 0, 'Těžba zlata (vodivé dráty)', [pkg], S.usgsAu, 'estimate'),
  n('cu', 0, 'Těžba mědi (vývodový rámeček)', [pkg], S.usgsCu, 'estimate'),
  n('epoxy', 2, 'Epoxidová pouzdřicí hmota', [pkg], S.sumitomoCase, 'estimate'),
];

// Obecný konektor – měď, cín/zlato na kontaktech, plastové tělo.
const connRaw = (to) => [
  n('cu', 0, 'Těžba mědi (kontakty z mosazi / fosforbronzu)', ['metal'], S.usgsCu, 'estimate'),
  n('sn', 0, 'Těžba cínu (pokovení, pájení)', ['metal'], S.usgsSn, 'estimate'),
  n('metal', 2, 'Lisované a pokovené kontakty', [to], S.usgsCu, 'estimate'),
];

const sumitomo = { year: 1993, title: 'Požár Sumitomo Chemical (epoxid)', text: 'Výbuch 4. 7. 1993 v závodě Niihama zastavil linku epoxidu pro pouzdření čipů; závod dodával asi 50–60 % světové epoxy-kresolové pryskyřice.', src: S.sumitomoUpi, fact: 'estimate' };
const dramCrash = { year: 1996, title: 'Propad cen DRAM 1996', text: 'Ceny 4Mbit DRAM se od 1. čtvrtletí 1996 propadaly celý rok; trh DRAM v roce 1996 klesl o 38 %.', src: S.dram1996, fact: 'estimate' };
const diamondTl = { date: '1999-09', text: 'Diamond Multimedia se sloučil s firmou S3.', src: S.s3Filing, fact: 'doc' };
const diamondCo = { name: 'Diamond Multimedia', role: 'výrobce karty Edge 3D', country: 'US', src: S.wikiDiamond, fact: 'doc' };
const stTl = { date: '1998', text: 'SGS-Thomson se přejmenoval na STMicroelectronics.', src: S.wikiSt, fact: 'doc' };
const bazar = (src) => ({ title: 'Jen z druhé ruky', text: 'Díl se už nevyrábí; dostupný jen z bazarů a sbírek.', src, fact: 'estimate' });

export default {
  edge3d: {
    checked: C,
    supply: [
      n('nv1', 4, 'Čip STG2000 (NV1), pouzdřený na Maltě', ['diamond'], S.vgam, 'doc', P.kirkop),
      n('ramdac', 4, 'RAMDAC SGS-Thomson STG1764X (135 MHz)', ['diamond'], S.v3d, 'estimate'),
      n('dram', 4, 'DRAM 1–2 MB (Hyundai HY514260B na fotce)', ['diamond'], S.wikiHynix, 'estimate', P.icheon),
      n('codec', 4, 'Zvukový kodek Analog Devices AD1845', ['diamond'], S.dosdays, 'doc'),
      n('cu', 0, 'Těžba mědi (spoje DPS, konektory)', ['pcb'], S.usgsCu, 'estimate'),
      n('au', 0, 'Těžba zlata (zlacené kontakty PCI)', ['pcb'], S.usgsAu, 'estimate'),
      n('pcb', 3, 'Deska plošných spojů', ['diamond'], S.usgsCu, 'estimate'),
      n('diamond', 5, 'Diamond Multimedia (Edge 3D 2120 XL, 1 MB)', [], S.dosdays, 'doc'),
    ],
    companies: [
      diamondCo,
      { name: 'NVIDIA', role: 'návrh čipu NV1', country: 'US', src: S.ieeeNv1, fact: 'doc' },
      { name: 'SGS-Thomson Microelectronics', role: 'výroba a prodej čipu STG2000', country: 'CH', src: S.stPress, fact: 'doc' },
      { name: 'Analog Devices', role: 'zvukový kodek AD1845', country: 'US', src: S.dosdays, fact: 'doc' },
      { name: 'Sega', role: 'hry a ovladače Saturn pro kartu', country: 'JP', src: S.dosdays, fact: 'doc' },
    ],
    timeline: [
      { date: '1995-05-22', text: 'NVIDIA a SGS-Thomson ohlásily NV1 a STG2000; cílová cena karty kolem 200 USD.', src: S.stPress, fact: 'doc' },
      { date: '1995-11', text: 'Diamond Edge 3D v prodeji jako první spotřebitelský texturovací akcelerátor; od 249 USD (1 MB).', src: S.v3d, fact: 'doc' },
      { date: '1996-04', text: 'Ovladače pro Windows 95 verze 4.02.101.', src: S.dosdays, fact: 'doc' },
      { date: '1996', text: 'Diamond odepsal 5 mil. USD neprodaných zásob Edge 3D.', src: S.wikiNv1, fact: 'doc' },
      { date: '1996-09', text: 'Poslední ovladače 2.21 (4.03.00.0110); DirectX ovladače karta nikdy nedostala.', src: S.dosdays, fact: 'doc' },
      diamondTl,
      { date: '2003', text: 'Značku a majetek Diamond koupila firma Best Data.', src: S.wikiDiamond, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Cena a slabý prodej', text: 'Optimisticky naplánovaná sériová výroba narazila na slabý prodej; hlavním problémem byla cena.', src: S.v3d, fact: 'doc' },
      { title: 'Kvadratické plochy vs. DirectX', text: 'Direct3D podporoval jen trojúhelníky, takže kvadratický engine NV1 ztratil podporu her.', src: S.wikiNvidia, fact: 'doc' },
      bazar(S.vgam),
    ],
    history: [sumitomo, dramCrash],
    market: null,
  },

  nv1: {
    checked: C,
    supply: [
      ...chipRaw('wafer', 'pkg'),
      n('quartz', 0, 'Vysoce čistý křemen na kelímky pro tažení krystalů', ['si_poly'], S.sprucePine, 'estimate', P.sprucePine),
      n('wafer', 3, 'Wafer SGS-Thomson, 0,5 µm, ~1 mil. tranzistorů, die 90 mm²', ['pkg'], S.v3d, 'doc'),
      n('pkg', 4, 'Pouzdření a test (potisk Malta)', ['st', 'nvidia'], S.vgam, 'doc', P.kirkop),
      n('st', 5, 'SGS-Thomson (STG2000, verze s DRAM)', [], S.stPress, 'doc'),
      n('nvidia', 5, 'NVIDIA (návrh, verze NV1 s VRAM)', [], S.stPress, 'doc'),
    ],
    companies: [
      { name: 'NVIDIA', role: 'návrh čipu (Priem, Rosenthal, Malachowsky)', country: 'US', src: S.ieeeNv1, fact: 'doc' },
      { name: 'SGS-Thomson Microelectronics', role: 'výroba za právo prodávat čip (STG2000)', country: 'CH', src: S.ieeeNv1, fact: 'doc' },
      diamondCo,
      { name: 'Sega of America', role: 'licence na porty her ze Saturnu', country: 'US', src: S.ieeeNv1, fact: 'doc' },
    ],
    timeline: [
      { date: '1993-04-05', text: 'Založena NVIDIA (Huang, Malachowsky, Priem).', src: S.wikiNvidia, fact: 'doc' },
      { date: '1994', text: 'NV1 ohlášen v létě 1994 jako jednočipový multimediální akcelerátor.', src: S.ieeeNv1, fact: 'doc' },
      { date: '1995-05-22', text: 'Oficiální uvedení NV1 a STG2000.', src: S.stPress, fact: 'doc' },
      { date: '1995-11', text: 'Karty s čipem v obchodech (Diamond Edge 3D).', src: S.wikiNv1, fact: 'doc' },
      { date: '1996', text: 'NVIDIA ukončila prodej NV1 v 1. čtvrtletí 1996.', src: S.wikiNv1, fact: 'doc' },
      { date: '1997-08', text: 'Nástupce RIVA 128; NVIDIA měla peníze asi na měsíc výplat.', src: S.wikiNvidia, fact: 'doc' },
      stTl,
    ],
    bottlenecks: [
      { title: 'Konec výroby 1996', text: 'Čip se přestal prodávat po necelém roce; dnes jen bazar a sbírky.', src: S.wikiNv1, fact: 'doc' },
      { title: 'Kapacita fabů', text: 'Tisková zpráva zmiňuje odvětví omezené výrobní kapacitou; proto partnerství s výrobcem SGS-Thomson.', src: S.stPress, fact: 'doc' },
    ],
    history: [
      { year: 1996, title: 'Ztráta zakázky Sega (NV2)', text: 'Sega odstoupila od NV2 pro Dreamcast; ztráta a investice do NV2 firmu málem položily.', src: S.ieeeNv1, fact: 'doc' },
      sumitomo,
    ],
    market: null,
  },

  stg1764: {
    checked: C,
    supply: [
      ...chipRaw('wafer', 'pkg'),
      n('wafer', 3, 'Wafer SGS-Thomson (fab neuveden)', ['pkg'], S.stg1764, 'estimate'),
      n('pkg', 4, 'Pouzdro PQFP-128', ['st'], S.stg1764, 'doc'),
      n('st', 5, 'SGS-Thomson (STG1764X-17)', [], S.stg1764, 'doc'),
    ],
    companies: [
      { name: 'SGS-Thomson Microelectronics', role: 'výrobce RAMDAC řady STG17xx', country: 'CH', src: S.ramdacTxt, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '1987', text: 'Fúzí SGS Microelettronica a Thomson Semiconducteurs vzniká SGS-Thomson.', src: S.wikiSt, fact: 'doc' },
      { date: '1995', text: 'Verze STG2000 se dodávala s externím DAC 135 MHz (NV1 s VRAM 170 MHz).', src: S.v3d, fact: 'doc' },
      stTl,
    ],
    bottlenecks: [
      { title: 'Ukončeno', text: 'STG1764X-17 je v katalozích vedený jako ukončený (discontinued).', src: S.stg1764, fact: 'doc' },
      { title: 'Chybí veřejný datasheet', text: 'Volně dohledatelné jsou jen popisy starších STG1700/1702/1703.', src: S.ramdacTxt, fact: 'estimate' },
    ],
    history: [sumitomo],
    market: null,
  },

  dram_256k16: {
    checked: C,
    supply: [
      ...chipRaw('wafer', 'pkg'),
      n('quartz', 0, 'Vysoce čistý křemen na kelímky', ['si_poly'], S.sprucePine, 'estimate', P.sprucePine),
      n('wafer', 3, 'Wafer DRAM Hyundai Electronics', ['pkg'], S.wikiHynix, 'estimate', P.icheon),
      n('pkg', 4, 'Pouzdření SOJ-40', ['hyundai'], S.wikiHynix, 'estimate'),
      n('hyundai', 5, 'Hyundai Electronics (HY514260B)', [], S.wikiHynix, 'doc'),
    ],
    companies: [
      { name: 'Hyundai Electronics', role: 'výrobce DRAM', country: 'KR', src: S.wikiHynix, fact: 'doc' },
      { name: 'Sumitomo Chemical', role: 'epoxid pro pouzdření (typický dodavatel)', country: 'JP', src: S.sumitomoUpi, fact: 'estimate' },
      diamondCo,
    ],
    timeline: [
      { date: '1983', text: 'Chung Ju-yung zakládá Hyundai Electronics.', src: S.wikiHynix, fact: 'doc' },
      { date: '1992', text: 'Hyundai je devátým největším výrobcem DRAM na světě.', src: S.wikiHynix, fact: 'doc' },
      { date: '1995-09', text: 'Hyundai vyrábí asi 1,5 mil. kusů 16M DRAM měsíčně (Samsung 4,5 mil.).', src: S.seoul1995, fact: 'doc' },
      { date: '1998', text: 'Hyundai Electronics kupuje LG Semicon za 2,1 mld. USD.', src: S.wikiHynix, fact: 'doc' },
      { date: '2001', text: 'Přejmenování na Hynix Semiconductor.', src: S.wikiHynix, fact: 'doc' },
      { date: '2012-02', text: 'Hynix kupuje SK Group; vzniká SK hynix.', src: S.wikiHynix, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Zastaralý typ', text: 'FPM DRAM 4 Mbit se dávno nevyrábí; náhrada jen ze sbírek nebo bazaru.', src: S.dram1996, fact: 'estimate' },
      { title: 'Cyklus cen DRAM', text: 'Výrobci přecenili poptávku po PC a vyrobili příliš čipů; DRAM zlevnila za rok až o 48 %.', src: S.pcPrices1996, fact: 'estimate' },
    ],
    history: [sumitomo, dramCrash],
    market: { category: 'DRAM (tržby, odhad IDC)', year: 1999, shares: [{ name: 'Hyundai', pct: 23.5 }, { name: 'Micron', pct: 17.6 }, { name: 'Samsung', pct: 16.8 }], src: S.regDram1999, fact: 'doc' },
  },

  ad1845: {
    checked: C,
    supply: [
      ...chipRaw('wafer', 'pkg'),
      n('wafer', 3, 'Wafer Analog Devices (fab v USA nebo Irsku)', ['pkg'], S.wikiAdi, 'estimate'),
      n('pkg', 4, 'Pouzdro PLCC-68 (JP), test', ['adi'], S.adDatasheet, 'doc'),
      n('test', 4, 'Testovací závod ADI (dnešní)', ['adi'], S.wikiAdi, 'estimate', P.generalTrias),
      n('adi', 5, 'Analog Devices (AD1845JP)', [], S.adDatasheet, 'doc'),
    ],
    companies: [
      { name: 'Analog Devices', role: 'výrobce kodeku', country: 'US', src: S.adProduct, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '1965', text: 'Ray Stata a Matthew Lorber zakládají Analog Devices.', src: S.wikiAdi, fact: 'doc' },
      { date: '1995', text: 'AD1845 osazen na Diamond Edge 3D (vstupy a výstupy zvuku karty).', src: S.dosdays, fact: 'doc' },
      { date: '2016-07', text: 'ADI ohlašuje koupi Linear Technology.', src: S.wikiAdi, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Obsolete', text: 'Analog Devices vede AD1845 jako zastaralý; distributoři mají jen zbytkové zásoby.', src: S.adProduct, fact: 'doc' },
    ],
    history: [sumitomo],
    market: null,
  },

  eprom_27c256: {
    checked: C,
    supply: [
      n('si', 0, 'Křemík', ['wafer'], S.usgsSi, 'estimate'),
      n('wafer', 3, 'Wafer CMOS EPROM (floating gate)', ['pkg'], S.wikiEprom, 'estimate'),
      n('pkg', 4, 'Pouzdro s okénkem (UV) nebo plastové OTP', ['maker'], S.wikiEprom, 'estimate'),
      n('maker', 5, 'Výrobce neznámý (27C256 vyrábělo více firem)', [], S.wikiEprom, 'estimate'),
    ],
    companies: [
      { name: 'Intel', role: 'vynálezce EPROM (Dov Frohman, 1971)', country: 'US', src: S.wikiEprom, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '1971', text: 'Dov Frohman (Intel) vynalezl EPROM.', src: S.wikiEprom, fact: 'doc' },
      { date: '1983', text: '27C256: 256 kbit (32 KiB), 8bit výstup.', src: S.wikiEprom, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Nahrazeno flash', text: 'UV EPROM vytlačily EEPROM a flash; nové kusy jsou vzácné.', src: S.wikiEprom, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  xtal_12096: {
    checked: C,
    supply: [
      n('quartz', 0, 'Přírodní křemen (za 2. sv. války téměř výhradně z Brazílie)', ['synth'], S.wikiXtal, 'estimate'),
      n('synth', 2, 'Syntetický křemen z hydrotermálních autoklávů', ['blank'], S.wikiXtal, 'estimate'),
      n('blank', 3, 'Řezání výbrusu, napaření elektrod', ['pkg'], S.wikiXtal, 'estimate'),
      n('pkg', 4, 'Hermetické pouzdro HC-49', ['maker'], S.wikiXtal, 'estimate'),
      n('maker', 5, 'Výrobce neznámý (potisk Z12.096M)', [], S.wikiXtal, 'estimate'),
    ],
    companies: [diamondCo],
    timeline: [
      { date: '1921', text: 'Walter Cady postavil první krystalový oscilátor.', src: S.wikiXtal, fact: 'estimate' },
      { date: '1950', text: 'Bell Labs zvládly hydrotermální růst syntetického křemene.', src: S.wikiXtal, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Žádné', text: 'Krystaly v HC-49 se vyrábějí dál; přesná hodnota 12,096 MHz je méně běžná.', src: S.wikiXtal, fact: 'estimate' },
    ],
    history: [],
    market: null,
  },

  pi5c3245: {
    checked: C,
    supply: [
      n('si', 0, 'Křemík', ['wafer'], S.usgsSi, 'estimate'),
      n('wafer', 3, 'Wafer CMOS (foundry neuvedena)', ['pkg'], S.piDatasheet, 'estimate'),
      n('pkg', 4, 'Pouzdro QSOP-20 (přípona Q)', ['pericom'], S.piDatasheet, 'doc'),
      n('pericom', 5, 'Pericom Semiconductor', [], S.piDatasheet, 'doc'),
    ],
    companies: [
      { name: 'Pericom Semiconductor', role: 'výrobce 8bit sběrnicového spínače', country: 'US', src: S.piDatasheet, fact: 'doc' },
      { name: 'Diodes Incorporated', role: 'nástupce (koupil Pericom)', country: 'US', src: S.piSec, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '2015-11-24', text: 'Diodes Inc. dokončil koupi Pericomu za asi 413 mil. USD.', src: S.piSec, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Rušení pouzder', text: 'Diodes upozorňuje, že datasheet nemusí odrážet ukončení některých pouzder; dostupnost je nutné ověřit.', src: S.piDiodes, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  nvsgp: {
    checked: C,
    supply: [
      n('si', 0, 'Křemík', ['wafer'], S.usgsSi, 'estimate'),
      n('wafer', 3, 'Wafer (výrobce neznámý)', ['pkg'], S.vogonsSgp, 'estimate'),
      n('pkg', 4, 'Pouzdření (varianty značení i67015 / i67113)', ['nvidia'], S.vogonsSgp, 'doc'),
      n('nvidia', 5, 'NVIDIA (značka nvSGP)', [], S.vogonsSgp, 'doc'),
    ],
    companies: [
      { name: 'NVIDIA', role: 'značka čipu', country: 'US', src: S.vogonsSgp, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '1993-04-05', text: 'Založena NVIDIA.', src: S.wikiNvidia, fact: 'doc' },
      { date: '1995-11', text: 'Čip na kartách Edge 3D.', src: S.vogonsSgp, fact: 'estimate' },
    ],
    bottlenecks: [
      { title: 'Nezdokumentovaný', text: 'K čipu není veřejný datasheet; funkce (zvuk / herní port) není doložená.', src: S.vogonsSgp, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  hdr2x5: {
    checked: C,
    supply: [...connRaw('maker'), n('maker', 5, 'Obecný výrobce kolíkových lišt 2,54 mm', [], S.usgsCu, 'estimate')],
    companies: [diamondCo],
    timeline: [],
    bottlenecks: [{ title: 'Žádné', text: 'Běžný levný díl, stále se vyrábí.', src: S.usgsCu, fact: 'estimate' }],
    history: [],
    market: null,
  },

  de15: {
    checked: C,
    supply: [...connRaw('maker'), n('maker', 5, 'Obecný výrobce konektorů D-sub', [], S.wikiVga, 'estimate')],
    companies: [
      { name: 'IBM', role: 'zavedl konektor VGA (PS/2)', country: 'US', src: S.wikiVga, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '1987', text: 'IBM zavádí DE-15 s grafikou VGA v počítačích PS/2.', src: S.wikiVga, fact: 'doc' },
      { date: '2010-12-08', text: 'Intel, AMD a výrobci PC ohlašují konec analogového VGA do roku 2015.', src: S.vga2015, fact: 'doc' },
    ],
    bottlenecks: [{ title: 'Ústup', text: 'Nové počítače VGA většinou nemají; konektor je ale stále běžně k dostání.', src: S.wikiVga, fact: 'estimate' }],
    history: [],
    market: null,
  },

  gameport_10p: {
    checked: C,
    supply: [...connRaw('maker'), n('maker', 5, 'Obecný výrobce modulárních zásuvek', [], S.dosdays, 'estimate')],
    companies: [
      diamondCo,
      { name: 'Sega', role: 'ovladače Saturn připojené přes port', country: 'JP', src: S.dosdays, fact: 'doc' },
    ],
    timeline: [
      { date: '1981', text: 'IBM zavádí herní port PC (Game Control Adapter).', src: S.wikiGameport, fact: 'estimate' },
      { date: '1995', text: 'Edge 3D má vlastní herní port typu RJ45 místo standardního DA-15.', src: S.dosdays, fact: 'doc' },
    ],
    bottlenecks: [{ title: 'Proprietární zapojení', text: 'Konektor je běžný, ale kabel a zapojení byly jen pro tuto kartu.', src: S.dosdays, fact: 'estimate' }],
    history: [],
    market: null,
  },

  jack35: {
    checked: C,
    supply: [...connRaw('maker'), n('maker', 5, 'Obecný výrobce zásuvek 3,5 mm', [], S.wikiJack, 'estimate')],
    companies: [diamondCo],
    timeline: [
      { date: '1950', text: 'Velikost 3,5 mm vznikla pro sluchátka tranzistorových rádií (50. léta).', src: S.wikiJack, fact: 'estimate' },
      { date: '1999', text: 'PC System Design Guide zavádí barvy: růžová mikrofon, modrá line in, zelená line out.', src: S.wikiJack, fact: 'estimate' },
    ],
    bottlenecks: [{ title: 'Žádné', text: 'Běžný díl, stále se vyrábí.', src: S.wikiJack, fact: 'estimate' }],
    history: [],
    market: null,
  },

  pci_edge: {
    checked: C,
    supply: [
      n('cu', 0, 'Těžba mědi (měděná fólie DPS)', ['pcb'], S.usgsCu, 'estimate'),
      n('au', 0, 'Těžba zlata (zlacení kontaktů)', ['pcb'], S.usgsAu, 'estimate'),
      n('pcb', 3, 'Kontakty vyleptané a zlacené přímo na DPS karty', ['diamond'], S.wikiPci, 'estimate'),
      n('diamond', 5, 'Součást desky Diamond Edge 3D', [], S.dosdays, 'estimate'),
    ],
    companies: [
      { name: 'Intel', role: 'autor sběrnice PCI', country: 'US', src: S.wikiPci, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '1992-06-22', text: 'PCI 1.0 (Intel).', src: S.wikiPci, fact: 'doc' },
      { date: '1993', text: 'PCI 2.0 přidává specifikaci konektoru a přídavných karet.', src: S.wikiPci, fact: 'doc' },
      { date: '1995', text: 'PCI 2.1; 5V karty mají klíč na pozicích 50 a 51.', src: S.wikiPci, fact: 'doc' },
      { date: '2002', text: 'PCI 2.3 ruší karty jen pro 5 V.', src: S.wikiPci, fact: 'doc' },
      { date: '2004', text: 'PCI 3.0 ruší 5V slot na základní desce.', src: S.wikiPci, fact: 'doc' },
    ],
    bottlenecks: [{ title: 'Chybí 5V sloty', text: 'Moderní desky PCI nemají a 5V sloty zmizely; karta potřebuje dobovou desku.', src: S.wikiPci, fact: 'doc' }],
    history: [],
    market: null,
  },

  lm2941: {
    checked: C,
    supply: [
      ...chipRaw('wafer', 'pkg'),
      n('wafer', 3, 'Wafer bipolárního regulátoru (fab National, např. South Portland)', ['pkg'], S.tiNscPress, 'estimate', P.southPortland),
      n('wafer2', 3, 'Fab National Semiconductor Greenock', ['pkg'], S.tiNscPress, 'estimate', P.greenock),
      n('pkg', 4, 'Pouzdro TO-220 (LM2941CT), montáž v Asii', ['nsc'], S.nscLm2941, 'estimate', P.melaka),
      n('nsc', 5, 'National Semiconductor (LM2941CT)', [], S.nscLm2941, 'doc'),
    ],
    companies: [
      { name: 'National Semiconductor', role: 'původní výrobce', country: 'US', src: S.nscLm2941, fact: 'doc' },
      { name: 'Texas Instruments', role: 'dnešní výrobce (koupil National)', country: 'US', src: S.tiLm2941, fact: 'doc' },
      diamondCo,
    ],
    timeline: [
      { date: '2011-09-23', text: 'Texas Instruments dokončil koupi National Semiconductor.', src: S.tiNsc, fact: 'doc' },
      { date: '2015-01-12', text: 'TI vydává revizi I datasheetu LM2941x.', src: S.tiLm2941, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Stále vyráběn', text: 'TI vede LM2941 jako aktivní; některé varianty TO-220 jsou v katalozích NRND.', src: S.lm2941Nrnd, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  eeprom_93c46: {
    checked: C,
    supply: [
      n('si', 0, 'Křemík', ['wafer'], S.usgsSi, 'estimate'),
      n('wafer', 3, 'Wafer CMOS EEPROM 1 kbit (64 × 16)', ['pkg'], S.fsc93c46, 'estimate'),
      n('pkg', 4, 'Pouzdro DIP-8 / SO-8', ['maker'], S.mchp93c46, 'estimate'),
      n('maker', 5, 'Výrobce na kartě neznámý', [], S.mchp93c46, 'estimate'),
    ],
    companies: [
      { name: 'National Semiconductor', role: 'majitel ochranné známky Microwire', country: 'US', src: S.mchp93c46, fact: 'doc' },
      { name: 'Microchip Technology', role: 'výrobce 93C46B', country: 'US', src: S.mchp93c46, fact: 'doc' },
      { name: 'Fairchild Semiconductor', role: 'výrobce NM93C46A', country: 'US', src: S.fsc93c46, fact: 'doc' },
      { name: 'STMicroelectronics', role: 'výrobce M93C46', country: 'CH', src: S.st93c46, fact: 'doc' },
      { name: 'onsemi', role: 'výrobce NM93C46', country: 'US', src: S.on93c46, fact: 'doc' },
    ],
    timeline: [
      { date: '2000-02', text: 'Revize datasheetu Fairchild NM93C46A (1024 bit, 64 × 16, Microwire).', src: S.fsc93c46, fact: 'doc' },
    ],
    bottlenecks: [
      { title: 'Žádné', text: 'Typ 93C46 dodává dál více výrobců (Microchip, ST, onsemi).', src: S.st93c46, fact: 'doc' },
    ],
    history: [],
    market: null,
  },

  crt_monitor: {
    checked: C,
    supply: [
      n('glass', 2, 'Olovnaté sklo kuželu a hrdla (21–40 % PbO)', ['tube'], S.wikiCrt, 'estimate'),
      n('cu', 0, 'Těžba mědi (vychylovací cívky)', ['tube'], S.usgsCu, 'estimate'),
      n('tube', 3, 'Obrazovka (CRT)', ['mon'], S.wikiCrt, 'estimate'),
      n('mon', 5, 'Obecný výrobce monitoru', [], S.wikiCrt, 'estimate'),
    ],
    companies: [
      { name: 'Samsung SDI', role: 'výrobce obrazovek (do 2012)', country: 'KR', src: S.wikiCrt, fact: 'estimate' },
      { name: 'Nippon Electric Glass', role: 'sklo pro CRT', country: 'JP', src: S.wikiCrt, fact: 'estimate' },
      { name: 'Corning', role: 'sklo pro CRT', country: 'US', src: S.wikiCrt, fact: 'estimate' },
    ],
    timeline: [
      { date: '2000', text: 'Vrchol prodeje CRT monitorů: 90 milionů kusů.', src: S.wikiCrt, fact: 'estimate' },
      { date: '2003', text: 'LCD monitory předstihly CRT v prodejích (2003–2004).', src: S.wikiCrt, fact: 'estimate' },
      { date: '2012', text: 'Samsung SDI končí výrobu CRT.', src: S.wikiCrt, fact: 'estimate' },
      { date: '2015', text: 'Videocon, poslední velký výrobce CRT, končí.', src: S.wikiCrt, fact: 'estimate' },
    ],
    bottlenecks: [bazar(S.wikiCrt)],
    history: [],
    market: null,
  },

  speakers: {
    checked: C,
    supply: [
      n('cu', 0, 'Těžba mědi (cívky, kabely)', ['spk'], S.usgsCu, 'estimate'),
      n('spk', 3, 'Měniče, zesilovač a ozvučnice', ['maker'], S.usgsCu, 'estimate'),
      n('maker', 5, 'Obecný výrobce reproduktorů', [], S.wikiJack, 'estimate'),
    ],
    companies: [],
    timeline: [
      { date: '1999', text: 'Line out na PC označen zelenou barvou (PC System Design Guide).', src: S.wikiJack, fact: 'estimate' },
    ],
    bottlenecks: [],
    history: [],
    market: null,
  },

  saturn_pad: {
    checked: C,
    supply: [
      n('cu', 0, 'Těžba mědi (kabel, DPS)', ['pcb'], S.usgsCu, 'estimate'),
      n('pcb', 3, 'DPS s tlačítky a plastové tělo', ['sega'], S.wikiSaturn, 'estimate'),
      n('sega', 5, 'Sega', [], S.wikiSaturn, 'doc'),
    ],
    companies: [
      { name: 'Sega', role: 'výrobce konzole a ovladače', country: 'JP', src: S.wikiSaturn, fact: 'doc' },
      { name: 'Diamond Multimedia', role: 'k Edge 3D přibalila dva ovladače Saturn', country: 'US', src: S.dosdays, fact: 'doc' },
    ],
    timeline: [
      { date: '1994-11-22', text: 'Sega Saturn vychází v Japonsku.', src: S.wikiSaturn, fact: 'doc' },
      { date: '1995-05-11', text: 'Saturn v Severní Americe (předčasné uvedení).', src: S.wikiSaturn, fact: 'doc' },
      { date: '1995-07-08', text: 'Saturn v Evropě.', src: S.wikiSaturn, fact: 'doc' },
      { date: '1998-03', text: 'Konec Saturnu v Severní Americe (Evropa 1998, Japonsko 2000).', src: S.wikiSaturn, fact: 'doc' },
    ],
    bottlenecks: [bazar(S.wikiSaturn)],
    history: [],
    market: null,
  },
};
