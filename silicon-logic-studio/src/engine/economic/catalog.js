// Kusovníky (BOM) projektů pro ECONOMIC view: díly tak, jak přijdou z obchodu.
// Ceny jsou v Kč za kus jako rozpětí [min, max]. `src` říká, odkud cena je:
//   'doc'   = z dokumentu PCYoutubeborce.md (projekt AI PC),
//   'odhad' = odhad z bazarů a eBay, stav 11/2026.
// Rozměry `dims` jsou v mm [délka, šířka, výška] a 3D model (views/economic/models.js) je dělá 1:1.
// Odkazy vedou na vyhledávání v obchodech, ne na konkrétní inzeráty, aby nezastaraly.

const q = (s) => encodeURIComponent(s);
export const SHOPS = {
  heureka: (s) => ({ shop: 'Heureka.cz', url: `https://www.heureka.cz/?h%5Bfraze%5D=${q(s)}` }),
  alza: (s) => ({ shop: 'Alza.cz', url: `https://www.alza.cz/search.htm?exps=${q(s)}` }),
  bazos: (s) => ({ shop: 'Bazoš.cz', url: `https://pc.bazos.cz/search.php?hledat=${q(s)}` }),
  ebay: (s) => ({ shop: 'eBay.de', url: `https://www.ebay.de/sch/i.html?_nkw=${q(s)}` }),
  ali: (s) => ({ shop: 'AliExpress', url: `https://www.aliexpress.com/w/wholesale-${s.trim().replace(/\s+/g, '-')}.html` }),
  mouser: (s) => ({ shop: 'Mouser', url: `https://www.mouser.com/c/?q=${q(s)}` }),
};
const links = (pairs) => pairs.map(([shop, s]) => SHOPS[shop](s));

// ---------------------------------------------------------------- projekt 2: AI PC z videa
export const P100_PC_BOM = [
  {
    id: 'dell_t5810', name: 'Dell Precision Tower 5810', part: 'Barebone: deska Intel C612 (LGA 2011-v3), zdroj 685 W, chladič CPU',
    qty: 1, price: [2500, 4500], src: 'odhad', dims: [471, 172.6, 414], model: { kind: 'tower' },
    note: 'Rozměry podle technického listu Dell (414 × 172,6 × 471 mm). BIOS umí jen 16GB okno pro paměti PCIe karet, proto je potřeba přeflashovat VBIOS P100 (nvflash).',
    links: links([['bazos', 'Dell T5810'], ['ebay', 'Dell Precision T5810 barebone'], ['heureka', 'Dell Precision T5810']]),
  },
  {
    id: 'cpu', name: 'Intel Xeon E5-1650 v3', part: '6 jader / 12 vláken, 3,5 GHz, LGA 2011-3, 40× PCIe 3.0, bez iGPU',
    qty: 1, price: [250, 600], src: 'doc', dims: [52.5, 45, 4.6], model: { kind: 'cpu', marking: ['INTEL® XEON®', 'E5-1650 v3', 'SR20J 3.50GHZ'] },
    note: 'Pouzdro FCLGA2011-3 je 52,5 × 45 mm. Integrovanou grafiku nemá, obraz proto dává Quadro K620.',
    links: links([['bazos', 'Xeon E5-1650 v3'], ['ebay', 'Xeon E5-1650 v3'], ['ali', 'Xeon E5-1650 v3']]),
  },
  {
    id: 'ram', name: 'DDR4 ECC Registered 8 GB', part: 'RDIMM 2133/2400 MHz, 288 pinů; 4 kusy = 32 GB v quad-channel',
    qty: 4, price: [700, 2500], src: 'odhad', dims: [133.35, 31.25, 3.9], model: { kind: 'rdimm' },
    note: 'Dell T5810 bere jen ECC Registered paměti, běžné desktopové DDR4 v něm nefungují. Cena paměti v roce 2026 hodně kolísá (repasované kusy kolem 100 €, bazar levněji).',
    links: links([['bazos', 'DDR4 ECC REG 8GB'], ['ebay', 'DDR4 8GB ECC RDIMM 2400'], ['heureka', 'DDR4 8GB ECC Registered']]),
  },
  {
    id: 'p100', name: 'NVIDIA Tesla P100 16 GB PCIe', part: 'GP100 Pascal, 16 GB HBM2 732 GB/s, 699-2H400-0201, pasivní, bez video výstupů',
    qty: 2, price: [3250, 3750], src: 'doc', dims: [267, 111.15, 37], model: { kind: 'tesla' },
    note: 'Full height, dual slot, 267 × 111 mm. Napájí se 8pinovým EPS (CPU) konektorem, ne PCIe! V sestavě omezené na 150 W (nvidia-smi -pl 150).',
    links: links([['ebay', 'Tesla P100 16GB PCIe'], ['bazos', 'Tesla P100'], ['ali', 'Tesla P100 16GB']]),
  },
  {
    id: 'shroud', name: 'Chladicí adaptér + ventilátor 9733', part: 'Plastový adaptér na P100/P40 a radiální ventilátor 97 × 33 mm, 12 V, 4-pin PWM',
    qty: 2, price: [430, 600], src: 'doc', dims: [182, 111, 37], model: { kind: 'blowerKit' },
    note: 'Prodlouží kartu o 8–9 cm dozadu, karta s ním měří asi 35 cm. Karty nemají vlastní větrák, bez něj se v zátěži uvaří.',
    links: links([['ali', 'Tesla P100 cooling fan shroud 9733'], ['ebay', 'Tesla P100 P40 fan shroud 9733']]),
  },
  {
    id: 'k620', name: 'NVIDIA Quadro K620 2 GB', part: 'Low profile, single slot, DVI-I + DisplayPort, bez přídavného napájení',
    qty: 1, price: [200, 300], src: 'doc', dims: [160, 69, 18], model: { kind: 'k620' },
    note: 'Jen na obraz pro BIOS a plochu, protože Xeon ani P100 video výstup nemají. Na kartu nasaď full height záslepku, slot v Dellu je na plnou výšku.',
    links: links([['bazos', 'Quadro K620'], ['ebay', 'Quadro K620'], ['heureka', 'Quadro K620']]),
  },
  {
    id: 'ssd', name: 'SSD 1 TB NVMe M.2 2280', part: 'Např. Kingston NV3 1 TB (v Dellu poběží na PCIe 3.0 x4)',
    qty: 1, price: [3500, 4500], src: 'odhad', dims: [80, 22, 2.4], model: { kind: 'm2ssd' },
    note: 'Model 27B v Q6 má přes 20 GB, rychlé SSD ho do VRAM nahraje za pár sekund.',
    links: links([['alza', 'Kingston NV3 1TB'], ['heureka', 'SSD 1TB NVMe M.2 2280']]),
  },
  {
    id: 'm2_adapter', name: 'Redukce PCIe x4 → M.2 NVMe', part: 'Karta s M-key slotem a full height záslepkou',
    qty: 1, price: [150, 200], src: 'doc', dims: [120, 68, 12], model: { kind: 'm2adapter' },
    note: 'Deska T5810 nemá slot M.2, NVMe disk se proto zapojuje přes tuto kartu.',
    links: links([['alza', 'redukce PCIe M.2 NVMe'], ['ali', 'PCIe x4 M.2 NVMe adapter'], ['heureka', 'PCIe x4 M.2 NVMe adaptér']]),
  },
  {
    id: 'psu2', name: 'Druhý ATX zdroj 650 W 80+ Gold', part: 'Např. Seasonic Focus GX-650, 150 × 86 × 140 mm, 4× PCIe 6+2 pin',
    qty: 1, price: [1000, 2500], src: 'odhad', dims: [150, 140, 86], model: { kind: 'psu' },
    note: 'Jako ve videu napájí obě P100 mimo zdroj Dellu. Sám se nezapne, potřebuje Add2PSU.',
    links: links([['alza', 'Seasonic Focus GX-650'], ['heureka', 'zdroj 650W 80+ Gold modulární'], ['bazos', 'zdroj 650W gold']]),
  },
  {
    id: 'add2psu', name: 'Add2PSU modul', part: 'Sepne druhý zdroj současně s PC (vstup SATA/Molex, výstup 24 pin)',
    qty: 1, price: [100, 150], src: 'doc', dims: [57, 29, 14], model: { kind: 'add2psu' },
    links: links([['ali', 'Add2PSU'], ['ebay', 'Add2PSU dual PSU adapter'], ['heureka', 'Add2PSU']]),
  },
  {
    id: 'eps_cable', name: 'Napájecí redukce 2× PCIe 8 pin → EPS 8 pin', part: 'NVIDIA 030-0571-000, ze dvou PCIe kabelů zdroje udělá 1× EPS pro P100',
    qty: 2, price: [150, 250], src: 'doc', dims: [230, 60, 10], model: { kind: 'epsCable' },
    note: 'KRITICKÉ: PCIe a EPS mají +12 V a zem prohozené. Kabel PCIe zapojený přímo do P100 zkratuje zdroj nebo kartu.',
    links: links([['ebay', '030-0571-000'], ['ali', 'dual PCIe 8pin to EPS 8pin Tesla'], ['heureka', 'redukce 2x PCIe 8pin na EPS 8pin']]),
  },
  {
    id: 'fan_split', name: 'Rozbočovač PWM ventilátorů 1 → 2', part: 'Např. Noctua NA-SYC1, 4 pin',
    qty: 1, price: [80, 150], src: 'doc', dims: [150, 40, 8], model: { kind: 'fanSplitter' },
    links: links([['alza', 'Noctua NA-SYC1'], ['heureka', 'rozbočovač ventilátoru 4pin PWM']]),
  },
  {
    id: 'pwm_ctrl', name: 'Ruční PWM regulátor otáček', part: 'Destička s otočným potenciometrem, 12 V, 4 pin',
    qty: 1, price: [100, 150], src: 'doc', dims: [50, 32, 24], model: { kind: 'pwmController' },
    note: 'Deska řídí ventilátory podle teploty CPU, ne podle P100. Regulátor nebo fancontrol podle nvidia-smi to řeší.',
    links: links([['ali', 'PWM fan speed controller 4pin knob'], ['heureka', 'regulátor otáček ventilátoru PWM']]),
  },
  {
    id: 'paste', name: 'Teplovodivá pasta Arctic MX-6 4 g', part: 'Na přepastování obou GP100 (původní pasta z roku 2016 je vyschlá)',
    qty: 1, price: [150, 200], src: 'doc', dims: [92, 18, 18], model: { kind: 'syringe' },
    links: links([['alza', 'Arctic MX-6 4g'], ['heureka', 'Arctic MX-6 4g']]),
  },
  {
    id: 'case_fan', name: 'Ventilátor Arctic P12 PWM PST 120 mm', part: 'Přední a zadní skříňový, odvod ~300 W tepla ze skříně',
    qty: 2, price: [150, 220], src: 'odhad', dims: [120, 120, 25], model: { kind: 'fan120' },
    links: links([['alza', 'Arctic P12 PWM PST'], ['heureka', 'Arctic P12 PWM PST']]),
  },
];

// ---------------------------------------------------------------- projekt 1: karta Diamond Edge 3D (díly)
// model.kind 'chip' staví stejné pouzdro jako PCB pohled (buildRealPart), typ = model zařízení v engine/devices.
export const NV1_BOM = [
  {
    id: 'nv1', name: 'NVIDIA NV1 / SGS-Thomson STG2000X', part: 'Grafický čip karty, PQFP-208 (28 × 28 mm)',
    qty: 1, price: [500, 1500], src: 'odhad', dims: [30.6, 30.6, 3.65], model: { kind: 'chip', type: 'NV1_CORE' },
    note: 'Samostatně se neprodává, jen z vrakových karet z let 1995–96. Celá karta Diamond Edge 3D se na eBay prodává jako sběratelský kus.',
    links: links([['ebay', 'STG2000X'], ['ebay', 'Diamond Edge 3D 2120']]),
  },
  {
    id: 'ramdac', name: 'SGS-Thomson STG1764X', part: 'RAMDAC + PLL, PQFP-128 (14 × 20 mm)',
    qty: 1, price: [150, 500], src: 'odhad', dims: [17.2, 23.2, 2.95], model: { kind: 'chip', type: 'RAMDAC_STG1764' },
    links: links([['ebay', 'STG1764'], ['ali', 'STG1764X']]),
  },
  {
    id: 'dram', name: 'Samsung KM416C256 50 ns', part: '256K × 16 FPM DRAM, SOJ-40; 4 kusy = 2 MB na 64bitové sběrnici',
    qty: 4, price: [30, 100], src: 'odhad', dims: [26.03, 11.2, 3.6], model: { kind: 'chip', type: 'DRAM_256K16' },
    links: links([['ali', 'KM416C256'], ['ebay', 'KM416C256']]),
  },
  {
    id: 'codec', name: 'Analog Devices AD1845JP', part: 'SoundPort stereo kodek 16 bit / 48 kHz, PLCC-68',
    qty: 1, price: [150, 400], src: 'odhad', dims: [25.2, 25.2, 4.45], model: { kind: 'chip', type: 'AD1845' },
    links: links([['ebay', 'AD1845JP'], ['ali', 'AD1845JP']]),
  },
  {
    id: 'eprom', name: 'EPROM 27C256 (32K × 8)', part: 'Video BIOS karty, DIP-28 600 mil',
    qty: 1, price: [40, 120], src: 'odhad', dims: [36.8, 15.24, 4.4], model: { kind: 'chip', type: 'EPROM_27C256' },
    links: links([['mouser', '27C256'], ['ali', '27C256 EPROM DIP28']]),
  },
  {
    id: 'xtal_14', name: 'Krystal 14,31818 MHz', part: 'HC-49/U, reference pro PLL v RAMDACu',
    qty: 1, price: [10, 25], src: 'odhad', dims: [11.05, 4.65, 13.46], model: { kind: 'chip', type: 'CRYSTAL', freqHz: 14.31818e6 },
    links: links([['mouser', '14.31818MHz HC-49/U'], ['heureka', 'krystal 14.31818 MHz']]),
  },
  {
    id: 'xtal_24', name: 'Krystal 24,576 MHz', part: 'HC-49/U, takt kodeku AD1845 (48 kHz × 512)',
    qty: 1, price: [10, 25], src: 'odhad', dims: [11.05, 4.65, 13.46], model: { kind: 'chip', type: 'CRYSTAL', freqHz: 24.576e6 },
    links: links([['mouser', '24.576MHz HC-49/U'], ['heureka', 'krystal 24.576 MHz']]),
  },
  {
    id: 'de15', name: 'Konektor DE-15 (VGA) zásuvka', part: 'Do plošného spoje, úhlový, se šroubky 4-40',
    qty: 1, price: [20, 60], src: 'odhad', dims: [16.7, 30.8, 12.5], model: { kind: 'connector', build: 'de15' },
    links: links([['mouser', 'DE-15 female right angle PCB'], ['heureka', 'konektor VGA zásuvka do DPS']]),
  },
  {
    id: 'rj45', name: 'Konektor RJ-45 (game port)', part: 'Zásuvka do plošného spoje, 8 kontaktů',
    qty: 1, price: [15, 40], src: 'odhad', dims: [17, 15.9, 13.5], model: { kind: 'connector', build: 'rj45' },
    links: links([['mouser', 'RJ45 jack PCB right angle'], ['heureka', 'RJ45 zásuvka do DPS']]),
  },
  {
    id: 'jack', name: 'Konektor jack 3,5 mm stereo', part: 'Line in, line out a mikrofon',
    qty: 3, price: [10, 30], src: 'odhad', dims: [13, 6, 6], model: { kind: 'connector', build: 'jack35' },
    links: links([['mouser', '3.5mm stereo jack PCB'], ['heureka', 'jack 3.5 mm zásuvka do DPS']]),
  },
  {
    id: 'crt', name: '14" VGA CRT monitor', part: 'Analogový VGA monitor, 640 × 480 @ 60 Hz',
    qty: 1, price: [500, 1500], src: 'odhad', dims: [360, 380, 360], model: { kind: 'crt' },
    links: links([['bazos', 'CRT monitor 14'], ['ebay', 'CRT VGA monitor 14']]),
  },
  {
    id: 'speakers', name: 'Aktivní reproduktory (pár)', part: 'Vstup line in 3,5 mm',
    qty: 1, price: [200, 500], src: 'odhad', dims: [260, 130, 143], model: { kind: 'speakers' },
    links: links([['heureka', 'PC reproduktory 2.0'], ['bazos', 'repro k PC']]),
  },
  {
    id: 'pad', name: 'Sega Saturn ovladač', part: 'Originální pad, na kartu přes Diamond game port adaptér',
    qty: 1, price: [500, 900], src: 'odhad', dims: [157, 70, 30], model: { kind: 'gamepad' },
    links: links([['bazos', 'Sega Saturn ovladač'], ['ebay', 'Sega Saturn controller']]),
  },
];

/** Součet kusovníku v Kč: { min, max }. */
export function bomTotal(bom) {
  return bom.reduce((t, it) => ({ min: t.min + it.qty * it.price[0], max: t.max + it.qty * it.price[1] }), { min: 0, max: 0 });
}

export const fmtKc = (v) => `${Math.round(v).toLocaleString('cs-CZ')} Kč`;
export const fmtRange = ([a, b]) => (a === b ? fmtKc(a) : `${Math.round(a).toLocaleString('cs-CZ')}–${fmtKc(b)}`);
