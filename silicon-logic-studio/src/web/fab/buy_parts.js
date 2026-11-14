// Kde koupit díly grafických karet a distributoři součástek. Rešerše 2026-11-14.
// fact: 'doc' = stránka načtena a údaj na ní viděn; 'estimate' = z výpisu vyhledávače nebo obecné znalosti.
// searchOk: true = šablona vyhledávání ověřena načtením výsledků; false = adresa je známá, ale web blokuje roboty.
// Ceny TME jsou bez DPH (cena za 1 ks, není-li uvedeno jinak). Souřadnice jsou na úrovni města (odhad).
export const CHECKED = '2026-11-14';

export const DISTRIBUTORS = [
  { id: 'tme', name: 'TME', what: 'Polský distributor součástek s českým e-shopem, doprava do ČR obvykle druhý den', url: 'https://www.tme.eu/cz/', search: 'https://www.tme.eu/cz/katalog/?search={q}', searchOk: true, place: { name: 'Łódź – logistické centrum', country: 'PL', lat: 51.76, lon: 19.46 }, src: 'https://www.tme.eu/en/about-us/', fact: 'estimate' },
  { id: 'gme', name: 'GM electronic', what: 'Český prodejce součástek s kamennými prodejnami (Praha, Brno, Ostrava)', url: 'https://www.gme.cz/', search: null, searchOk: false, place: { name: 'Dobrovíz u Prahy – sklad', country: 'CZ', lat: 50.11, lon: 14.22 }, src: 'https://www.firmy.cz/pobocky/178871-gme-cz', fact: 'estimate' },
  { id: 'mouser', name: 'Mouser Electronics', what: 'Americký katalogový distributor, velké skladové zásoby, doprava do ČR za 2–4 dny', url: 'https://cz.mouser.com/', search: 'https://cz.mouser.com/c/?q={q}', searchOk: false, place: { name: 'Mansfield, Texas – sklad', country: 'US', lat: 32.56, lon: -97.14 }, fact: 'estimate' },
  { id: 'digikey', name: 'DigiKey', what: 'Americký katalogový distributor, přehledně ukazuje stav výroby a náhrady', url: 'https://www.digikey.cz/', search: 'https://www.digikey.cz/en/products/result?keywords={q}', searchOk: true, place: { name: 'Thief River Falls, Minnesota – sklad', country: 'US', lat: 48.12, lon: -96.18 }, fact: 'estimate' },
  { id: 'farnell', name: 'Farnell', what: 'Britský distributor, pro EU expeduje ze skladu v Lutychu', url: 'https://cz.farnell.com/', search: 'https://cz.farnell.com/search?st={q}', searchOk: false, place: { name: 'Lutych (Grâce-Hollogne) – evropský sklad', country: 'BE', lat: 50.64, lon: 5.45 }, src: 'https://www.farnell.com/preparation-for-brexit/', fact: 'estimate' },
  { id: 'rs', name: 'RS Components', what: 'Britský distributor, pro střední Evropu expeduje z Bad Hersfeldu', url: 'https://cz.rs-online.com/', search: 'https://cz.rs-online.com/web/c/?searchTerm={q}', searchOk: false, place: { name: 'Bad Hersfeld – distribuční centrum', country: 'DE', lat: 50.87, lon: 9.71 }, src: 'https://de.rs-online.com/web/content/m/beschaffung/bad-hersfeld-dc', fact: 'estimate' },
  { id: 'arrow', name: 'Arrow Electronics', what: 'Velkodistributor čipů, evropské centrum ve Venlo', url: 'https://www.arrow.com/', search: 'https://www.arrow.com/en/products/search?q={q}', searchOk: false, place: { name: 'Venlo – hlavní evropské distribuční centrum', country: 'NL', lat: 51.37, lon: 6.17 }, src: 'https://www.arrow.com/company/es/overview/facilities', fact: 'estimate' },
  { id: 'lcsc', name: 'LCSC', what: 'Čínský distributor (sesterský k JLCPCB), levné pasivní součástky', url: 'https://www.lcsc.com/', search: 'https://www.lcsc.com/search?q={q}', searchOk: false, place: { name: 'Šen-čen', country: 'CN', lat: 22.54, lon: 114.06 }, fact: 'estimate' },
  { id: 'rochester', name: 'Rochester Electronics', what: 'Autorizovaný prodejce ukončených čipů (zbytky výroby od výrobců)', url: 'https://www.rocelec.com/', search: null, searchOk: false, place: { name: 'Newburyport, Massachusetts', country: 'US', lat: 42.81, lon: -70.88 }, src: 'https://wikipedia.com/wiki/Rochester_Electronics', fact: 'estimate' },
  { id: 'utsource', name: 'Utsource', what: 'Hongkongský prodejce starých i nových čipů v malém množství; recenze hlásí i padělky', url: 'https://www.utsource.net/', search: null, searchOk: false, place: { name: 'Hongkong', country: 'HK', lat: 22.32, lon: 114.17 }, src: 'https://automa.net/de/unternehmen/utsourcenet', fact: 'estimate' },
  { id: 'aliexpress', name: 'AliExpress', what: 'Tržiště; GPU čipy z oprav (vypájené, překuličkované), napájecí obvody a ventilátory k grafikám', url: 'https://www.aliexpress.com/', search: 'https://www.aliexpress.com/w/wholesale-{q}.html', searchOk: true, place: { name: 'Šen-čen – většina prodejců čipů', country: 'CN', lat: 22.55, lon: 114.09 }, fact: 'estimate' },
  { id: 'ebay', name: 'eBay', what: 'Aukce; staré karty (NV1, Edge 3D) a vytažené čipy', url: 'https://www.ebay.de/', search: 'https://www.ebay.de/sch/i.html?_nkw={q}', searchOk: false, place: { name: 'San Jose – sídlo tržiště (prodejci po celém světě)', country: 'US', lat: 37.33, lon: -121.89 }, fact: 'estimate' },
  { id: 'bazos', name: 'Bazoš', what: 'Český inzertní web; použité karty jako dárci čipů, chladičů a konektorů', url: 'https://pc.bazos.cz/', search: 'https://pc.bazos.cz/inzeraty/{q}/', space: '-', searchOk: true, place: { name: 'Česko – inzerenti po celé ČR', country: 'CZ', lat: 49.8, lon: 15.5 }, fact: 'estimate' },
];
// Bazoš: {q} musí být slovo s pomlčkami místo mezer (např. 'quadro-k620').

const ali = (id) => `https://www.aliexpress.com/item/${id}.html`;

export const PART_BUY = {
  // ── Diamond Edge 3D 2120 (1995) ──
  nv1: { note: 'Nevyrábí se od 1996 a jako samostatný čip se neprodává. Jediný zdroj jsou celé staré karty (Diamond Edge 3D) na sběratelských aukcích, kde ukončené nabídky Edge 3D stály zhruba 800–1 050 USD (odhad z výpisu eBay).', query: 'Diamond Edge 3D NV1', offers: [] },
  stg1764: { note: 'Paletový DAC od SGS-Thomson, ukončený. Distributoři ho nevedou, brokeři ho nabízejí jen na poptávku. V praxi pochází z vyřazených karet.', query: 'STG1764X', offers: [
    { shop: 'Precision Logic', label: 'STG1764X-13B, cena na poptávku', url: 'https://precisionlogicinc.net/parts/stg%201764x-13b', tier: 'použitý', fact: 'estimate' },
  ] },
  dram_256k16: { note: 'FPM DRAM 256K×16 (Hyundai HY514260B) se nevyrábí. Zbytky zásob mají brokeři a prodejci na eBay. Funguje i jiný FPM 256K×16 SOJ-40 se stejnou rychlostí.', query: 'HY514260BJC-60', offers: [
    { shop: 'Bristol Electronics (přes Findchips)', label: 'HY514260BJC-60, 378 ks skladem, cena neuvedena', url: 'https://www.findchips.com/search/HY514260B', tier: 'nový', fact: 'doc' },
    { shop: 'eBay.de', label: '2 ks HY514260BJC-60, SOJ-40', url: 'https://www.ebay.de/itm/406032184298', tier: 'použitý', fact: 'estimate' },
  ] },
  ad1845: { note: 'Ukončený, ale Rochester Electronics má velkou zásobu originálů. Na AliExpressu jsou levné kusy, u kterých nelze ověřit původ.', query: 'AD1845JP', offers: [
    { shop: 'Rochester Electronics (přes Findchips)', label: 'AD1845JP, 8 311 ks, 10,30–12,88 USD', url: 'https://www.findchips.com/search/AD1845JP', price: 10.3, currency: 'USD', tier: 'nový', fact: 'doc' },
    { shop: 'LCSC', label: 'AD1845JP PLCC-68 (C4990519)', url: 'https://lcsc.com/product-detail/Audio-Interface-ICs_Analog-Devices-AD1845JP_C4990519.html', tier: 'nový', fact: 'doc' },
    { shop: 'AliExpress', label: 'AD1845JP, prodejce uvádí „new“', url: ali('1005008340484094'), price: 39.69, currency: 'CZK', tier: 'použitý', fact: 'doc' },
  ] },
  eprom_27c256: { note: 'Stále se vyrábí jako OTP verze AT27C256R od Microchipu: dá se naprogramovat jen jednou, nemá okénko pro mazání UV. Mazatelné verze s okénkem jsou jen z vyřazených kusů.', query: 'AT27C256R', offers: [
    { shop: 'TME', label: 'AT27C256R-70PU, DIP28, 134 ks', url: 'https://www.tme.eu/cz/details/at27c256r-70pu/pameti-eprom-integrovane-obvody/microchip-technology/', price: 55.39, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  xtal_12096: { note: 'Neobvyklá frekvence, běžné sklady ji nevedou (TME nic nenašlo). Hledejte u výrobců krystalů na zakázku nebo ho vypájejte ze staré karty.', query: 'krystal 12.096 MHz HC-49', offers: [] },
  pi5c3245: { note: 'Pericom převzal Diodes Inc. Autorizovaní distributoři ho nemají skladem (DigiKey: nedostupný), brokeři ano.', query: 'PI5C3245Q', offers: [
    { shop: 'Bristol Electronics (přes Findchips)', label: 'PI5C3245Q, 47 ks, 1,86–3,00 USD', url: 'https://www.findchips.com/search/PI5C3245Q', price: 1.86, currency: 'USD', tier: 'nový', fact: 'doc' },
    { shop: 'AliExpress', label: '5 ks PI5C3245QE QSOP-20', url: ali('1005013331871905'), price: 134.82, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  nvsgp: { note: 'Zákaznický čip NVIDIA jen pro karty NV1. Nikdy se neprodával samostatně a neexistuje náhrada. Jediný zdroj je dárcovská karta Edge 3D.', query: 'NVIDIA nvSGP', offers: [] },
  hdr2x5: { note: 'Běžný díl, vyrábí se.', query: 'kolíková lišta 2x5 2,54 mm', offers: [
    { shop: 'TME', label: 'Connfly DS1013-10SSIB1 (ZL231-10PG), lišta 2×5 s krytem', url: 'https://www.tme.eu/cz/details/zl231-10pg/konektory-idc/connfly/ds1013-10ssib1-b-0/', tier: 'nový', fact: 'doc' },
  ] },
  de15: { note: 'Běžný díl (VGA, HD15 zásuvka do DPS, úhlová), vyrábí se.', query: 'HD15 zásuvka DPS úhlová', offers: [] },
  gameport_10p: { note: 'Modulární zásuvka 10P10C (RJ50), vyrábí se.', query: '10P10C', offers: [
    { shop: 'TME', label: 'NINIGI RJ50G, 10P10C, THT úhlová, 1 000 ks', url: 'https://www.tme.eu/cz/details/rj50g/konektory-rj/ninigi/', price: 56.5, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  jack35: { note: 'Běžný díl, vyrábí se.', query: 'jack 3,5 mm stereo zásuvka do DPS', offers: [] },
  lm2941: { note: 'Varianta LM2941CT je ukončená. Přímou náhradou je LM2941CT/NOPB (bezolovnatá), která se vyrábí.', query: 'LM2941CT/NOPB', offers: [
    { shop: 'TME', label: 'LM2941CT/NOPB, TO220-5, v době rešerše 0 ks skladem', url: 'https://www.tme.eu/cz/details/lm2941ct_nopb/stabilizatory-napeti-regulovane-ldo/texas-instruments/', price: 37.84, currency: 'CZK', tier: 'nový', fact: 'doc' },
    { shop: 'DigiKey', label: 'LM2941CT/NOPB, 3 072 ks (náhrada za ukončený LM2941CT)', url: 'https://www.digikey.com/en/products/detail/texas-instruments/LM2941CT/3695171', price: 2.04, currency: 'USD', tier: 'nový', fact: 'doc' },
  ] },
  eeprom_93c46: { note: 'Stále se vyrábí (Microchip, ST). Pozor na organizaci 8/16 bitů (varianty A/B).', query: '93C46', offers: [
    { shop: 'TME', label: '93C46B-I/P, DIP8, min. 3 ks, 833 ks skladem', url: 'https://www.tme.eu/cz/details/93c46b-i_p/pameti-eeprom-seriove/microchip-technology/', price: 10.82, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  pas_e3d_elyt: { note: 'Běžné, vyrábí se. Hodnoty odečtěte z desky.', query: 'SMD elektrolytický kondenzátor hliníkový' },
  pas_e3d_tant: { note: 'Běžné, vyrábí se.', query: 'tantalový kondenzátor SMD' },
  pas_e3d_mlcc: { note: 'Běžné, vyrábí se. Nejlevněji v balení po 100 ks.', query: 'MLCC 0805 100nF' },
  pas_e3d_res: { note: 'Běžné, vyrábí se.', query: 'rezistor SMD 0805' },
  pas_e3d_rnet: { note: 'Běžné, vyrábí se.', query: 'rezistorová síť SMD' },
  pas_e3d_ferrite: { note: 'Běžné, vyrábí se.', query: 'feritová perla SMD 0805' },
  pas_e3d_sojsock: { note: 'Patice SOJ-40 jsou vzácné a TME je nevede. Hledejte u brokerů nebo na dárcovské kartě.', query: 'SOJ-40 socket' },
  pas_e3d_opamp: { note: 'LF353 i LF347 se stále vyrábějí.', query: 'LF353', offers: [
    { shop: 'TME', label: 'LF353N/NOPB, DIP8, 735 ks', url: 'https://www.tme.eu/cz/details/lf353n_nopb/operacni-zesilovace-tht/texas-instruments/', price: 28.08, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  pas_e3d_cdin: { note: 'Čtyřpinový CD audio konektor (rozteč 2 mm), běžný na starých zvukovkách. Vyrábí se.', query: 'CD audio konektor 4pin 2mm DPS' },

  // ── Tesla P100 ──
  gp100: { note: 'NVIDIA prodávala GP100 jen jako hotové moduly a karty, ne veřejnosti. Čip s HBM2 na interposeru nejde rozumně přepájet, takže reálnou cestou je koupit celou použitou Tesla P100. Na bazarech v USA stojí zhruba 80–150 USD.', query: 'Tesla P100 16GB', src: 'https://www.amcompute.com/appraisals/tesla-p100-pcie-16gb', offers: [] },
  hbm2_stack: { note: 'Paměti HBM2 jsou na interposeru spolu s GP100 a samostatně se nekupují ani neosazují. Přijdou s celou kartou nebo s čipem.', query: 'Tesla P100' },
  pas_p100_hs: { note: 'Pasivní chladič je specifický pro P100 a dá se získat jen z vyřazených karet. Karta potřebuje silný průtok vzduchu ze serverové skříně.', query: 'Tesla P100 heatsink' },
  pas_p100_eps: { note: 'EPS 8pin je Mini-Fit Jr. 2×4. Standardní klíčování odpovídá EPS12V (PCIe 8pin má jiné), ověřte výkres.', query: 'Mini-Fit Jr 2x4 39-30-1080', offers: [
    { shop: 'TME', label: 'Molex 39-30-1080, 2×4, úhlový, 917 ks', url: 'https://www.tme.eu/cz/details/mx-39-30-1080/signalove-konektory-raster-4-20mm/molex/39-30-1080/', price: 51.02, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  pas_p100_vbios: { note: 'Běžná SPI flash 4 Mbit v SOIC-8, vyrábí se. Obsah (VBIOS) se musí zkopírovat z funkční karty.', query: 'SPI flash 4Mbit SOIC-8' },
  pas_p100_vrm: { note: 'Tlumivky a výkonové stupně se vyrábějí, ale přesné typy NVIDIA nezveřejňuje. Odečtěte značení z desky.', query: 'power stage DrMOS' },
  pas_p100_caps: { note: 'Běžné, vyrábí se.', query: 'polymerový kondenzátor SMD' },

  // ── Quadro K620 ──
  gm107: { note: 'NVIDIA čipy veřejnosti neprodává. GM107 seženete jen z oprav (vypájený, překuličkovaný) nebo s celou použitou kartou. Varianta značení (např. GM107-850-A2) musí sedět s kartou.', query: 'GM107-850-A2', offers: [
    { shop: 'AliExpress', label: 'GM107-220/300/400/850/875-A2, prodejce uvádí „new“', url: ali('1005012763147439'), price: 668.19, currency: 'CZK', tier: 'repas', fact: 'doc' },
    { shop: 'Bazoš', label: 'celá NVIDIA Quadro K620, Praha 6', url: 'https://www.bazos.cz/inzerat/224877518/nvidia-quadro-k620.php', price: 400, currency: 'CZK', tier: 'použitý', fact: 'doc' },
  ] },
  pas_k620_fan: { note: 'Náhradní ventilátor (prodává se jako MGT5012XB-W10) nabízejí čínští prodejci. Levnější bývá celá použitá karta.', query: 'MGT5012XB-W10', offers: [
    { shop: 'Bazoš', label: 'celá Quadro K620 jako dárce chladiče, Brno', url: 'https://www.bazos.cz/inzerat/225795952/nvidia-quadro-k620.php', price: 600, currency: 'CZK', tier: 'použitý', fact: 'doc' },
  ] },
  pas_k620_out: { note: 'Konektory DVI-I a DisplayPort do DPS se vyrábějí (Molex, Amphenol, Foxconn).', query: 'DVI-I zásuvka DPS; DisplayPort zásuvka DPS' },
  pas_k620_vrm: { note: 'Běžné součástky, typy odečtěte z desky.', query: 'MOSFET dual SO-8 tlumivka SMD' },
  pas_k620_caps: { note: 'Běžné, vyrábí se.', query: 'MLCC 0402 polymerový kondenzátor' },

  // ── ASUS Dual RTX 3060 Ti ──
  ga104: { note: 'NVIDIA prodává GPU jen výrobcům karet (board partneři). Veřejně je GA104 k mání jen z opravárenského trhu: vypájené a překuličkované kusy, často označené „new“ nebo „tested“.', query: 'GA104-202-A1', offers: [
    { shop: 'AliExpress', label: 'GA104-200/202/302…-A1 BGA, „100% tested good“', url: ali('1005010288886743'), price: 3605.19, currency: 'CZK', tier: 'z vyřazených karet', fact: 'doc' },
    { shop: 'AliExpress', label: 'GA104-202-A1 aj., prodejce uvádí „100% new“', url: ali('1005012127388540'), price: 4065.09, currency: 'CZK', tier: 'repas', fact: 'doc' },
    { shop: 'Bazoš', label: 'celá ASUS DUAL RTX 3060 Ti 8G, České Budějovice', url: 'https://www.bazos.cz/inzerat/226130486/asus-dual-geforce-rtx-3060-ti-8g.php', price: 8000, currency: 'CZK', tier: 'použitý', fact: 'doc' },
  ] },
  gddr6x: { note: 'Micron prodává GDDR6X hlavně výrobcům karet. Kusy se objevují u brokerů a na eBay (označení D8BGW = MT61K256M32JE-19G:T, 8 Gb).', query: 'MT61K256M32JE-19G:T', offers: [
    { shop: 'Brokeři (přes Findchips)', label: 'MT61K256M32JE-19G:T, tisíce ks, cena na poptávku', url: 'https://www.findchips.com/search/MT61K256M32JE-19', tier: 'nový', fact: 'doc' },
    { shop: 'eBay.de', label: '1 ks Micron D8BGW MT61K256M32JE-19G:T, cca 35 EUR', url: 'https://www.ebay.de/itm/115929279991', price: 35, currency: 'EUR', tier: 'nový', fact: 'estimate' },
  ] },
  up9512r: { note: 'Vyrábí se, ale prodává se hlavně přes čínské prodejce pro opravy grafik. Evropští distributoři ho běžně nevedou.', query: 'uP9512R', offers: [
    { shop: 'AliExpress', label: 'uP9512RQGJ QFN, 1–5 ks', url: ali('1005007847438222'), price: 69.5, currency: 'CZK', tier: 'nový', fact: 'doc' },
    { shop: 'AliExpress', label: 'uP9512RQGJ QFN40, 1–10 ks', url: ali('1005012155945899'), price: 103.85, currency: 'CZK', tier: 'nový', fact: 'doc' },
  ] },
  pas_3060_8pin: { note: 'PCIe 8pin je Mini-Fit Jr. 2×4 s klíčováním PCIe (jiným než EPS). Vyrábí se.', query: 'PCIe 8pin konektor DPS Mini-Fit Jr' },
  pas_3060_out: { note: 'Zásuvky HDMI a DisplayPort do DPS se vyrábějí.', query: 'HDMI zásuvka DPS; DisplayPort zásuvka DPS' },
  pas_3060_fan: { note: 'Náhradní ventilátory 95 mm (T129215SU/BU, 7pin) prodávají specializované obchody a AliExpress. Pro Dual se kupuje sada 2 ks.', query: 'T129215SU ASUS Dual 3060 Ti', offers: [
    { shop: 'Bazoš', label: 'nový kryt s ventilátory pro ASUS DUAL RTX 3060 Ti O8G V2, Praha 4', url: 'https://www.bazos.cz/inzerat/224962599/asus-rtx-2060-evo-novy-front-plate-s-ventilatory.php', price: 499, currency: 'CZK', tier: 'nový', fact: 'doc' },
    { shop: 'GPU Fan Replacement', label: 'sada ventilátorů ASUS Dual RTX 3060 Ti / 3070', url: 'https://www.gpufanreplacement.com/a/s/products/asus-rtx-3060-ti-3070-fan-replacement', tier: 'nový', fact: 'estimate' },
  ] },
  pas_3060_cooler: { note: 'Chladič ASUS samostatně neprodává, dá se získat jen z vyřazené karty stejného modelu.', query: 'ASUS Dual RTX 3060 Ti chladič' },
  pas_3060_pads: { note: 'Běžně k dostání v CZ (Gelid, Thermal Grizzly, Arctic). Tloušťku změřte na původních padech.', query: 'teplovodivá podložka 1 mm', offers: [
    { shop: 'Alza', label: 'Gelid GP-Extreme 80×40×1 mm, 12 W/mK', url: 'https://www.alza.cz/gelid-gp-extreme-thermal-pad-1mm-d5593797.htm', price: 199, currency: 'CZK', tier: 'nový', fact: 'estimate' },
  ] },
  pas_3060_drmos: { note: 'DrMOS se vyrábí (ON Semi, Alpha & Omega, Vishay). Přesný typ odečtěte z desky. Bývá u velkých distributorů i na AliExpressu.', query: 'DrMOS 50A QFN' },
  pas_3060_choke: { note: 'Běžné výkonové tlumivky, vyrábí se. Shodná indukčnost a proud.', query: 'výkonová tlumivka SMD 0.22uH' },
  pas_3060_poly: { note: 'Běžné, vyrábí se.', query: 'polymerový kondenzátor SMD 470uF' },
  pas_3060_mlcc: { note: 'Běžné, vyrábí se.', query: 'MLCC 0402 1uF' },
  pas_3060_res: { note: 'Běžné, vyrábí se.', query: 'rezistor SMD 0402' },
  pas_3060_xtal: { note: 'Běžný SMD krystal (u NVIDIA obvykle 27 MHz), vyrábí se.', query: 'krystal 27 MHz SMD 3225' },
  pas_3060_vbios: { note: 'Běžná SPI flash v SOIC-8, vyrábí se. VBIOS je potřeba zkopírovat z funkční karty.', query: 'SPI flash SOIC-8 W25Q' },
};
