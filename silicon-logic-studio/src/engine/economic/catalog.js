// Kusovníky (BOM) projektů pro ECONOMIC view: díly tak, jak přijdou z obchodu.
// Ceny se NEodhadují: počítají se ze skutečných nabídek v offers.js (dohledáno 10. 11. 2026).
// dims = rozměr výrobku v mm [délka, šířka, výška]; 3D model (views/economic/models.js) z nich staví 1:1.
// dimsSrc = odkud rozměr je ('ověřeno: …' / 'odhad: …').
import { OFFERS } from './offers.js';

// ---------------------------------------------------------------- projekt 2: AI PC z videa
const P100_PC_ITEMS = [
  {
    id: 'dell_t5810', name: 'Dell Precision Tower 5810', part: 'Pracovní stanice: deska Intel C612 (LGA 2011-v3), zdroj 685 W, chladič CPU',
    qty: 1, dims: [471, 172.6, 414], dimsSrc: 'ověřeno: Dell Owner\'s Manual (bez nožiček, s nimi 416,9 mm)', model: { kind: 'tower' },
    note: 'BIOS umí jen 16GB okno pro paměti PCIe karet, proto je potřeba přeflashovat VBIOS P100 (nvflash).',
  },
  {
    id: 'cpu', name: 'Intel Xeon E5-1650 v3', part: '6 jader / 12 vláken, 3,5 GHz, LGA 2011-3, 40× PCIe 3.0, bez iGPU',
    qty: 1, dims: [52.5, 45, 4.8], dimsSrc: 'ověřeno: pouzdro 52,5 × 45 mm; IHS a výška odhad', model: { kind: 'cpu', marking: ['INTEL® XEON®', 'E5-1650 v3', 'SR20J 3.50GHZ'] },
    note: 'Nemá integrovanou grafiku, obraz proto dává Quadro K620.',
  },
  {
    id: 'ram', name: 'DDR4 ECC Registered 8 GB', part: 'RDIMM 1Rx4 2133/2400 MHz, 288 pinů; 4 kusy = 32 GB v quad-channel',
    qty: 4, dims: [133.35, 31.25, 4.2], dimsSrc: 'ověřeno: Samsung M393A1G40EB1 datasheet', model: { kind: 'rdimm' },
    note: 'Dell T5810 bere jen ECC Registered paměti, běžné desktopové DDR4 v něm nefungují.',
  },
  {
    id: 'p100', name: 'NVIDIA Tesla P100 16 GB PCIe', part: 'GP100 Pascal, 16 GB HBM2 732 GB/s, pasivní, bez video výstupů (PCIe, ne SXM2!)',
    qty: 2, dims: [267, 111.15, 37], dimsSrc: 'ověřeno: NVIDIA PB-08248 + PNY product brief, dual slot', model: { kind: 'tesla' },
    note: 'Do Dellu se samotná karta vejde: délka 267 z max. 312 mm, výška 111,15 z max. 111,3 mm. Napájí se 8pinovým EPS (CPU) konektorem na čele karty, ne PCIe! V sestavě omezené na 150 W (nvidia-smi -pl 150).',
  },
  {
    id: 'shroud', name: 'Adaptér chlazení (shroud) pro P100', part: 'Plastový kryt pro radiální ventilátor 97 × 33 mm, šrouby a klíč',
    qty: 2, dims: [91, 111, 38], dimsSrc: 'ověřeno: 91,2 mm délka (Newegg kit), průřez podle karty', model: { kind: 'shroudAdapter' },
    note: 'Karta s adaptérem a ventilátorem měří ~350–406 mm. Dell T5810 bere karty jen do 312 mm (plná délka PCIe), za tím je držák karet a šachty disků, takže se do zavřené skříně NEVEJDE. Jen s otevřeným bokem, nebo kartu přes riser mimo skříň.',
  },
  {
    id: 'blower', name: 'Radiální ventilátor 9733 (Delta BFB1012VH)', part: '97 × 94 × 33 mm, 12 V, 4 pin – ke každému adaptéru jeden',
    qty: 2, dims: [97, 94, 33], dimsSrc: 'ověřeno: 97 × 94 × 33 mm (Newegg, Sensdar)', model: { kind: 'blower' },
    note: 'Bere 1,8 A při 12 V. Zapoj do regulátoru TD404, ne do desky.',
  },
  {
    id: 'k620', name: 'NVIDIA Quadro K620 2 GB', part: 'Low profile, single slot, DVI-I + DisplayPort, 45 W bez přídavného napájení',
    qty: 1, dims: [160, 68.9, 18], dimsSrc: 'ověřeno: NVIDIA datasheet 75509 (68,9 × 160 mm)', model: { kind: 'k620' },
    note: 'Jen na obraz pro BIOS a plochu. Do Dellu nasaď full height záslepku (PNY ji přikládá). Do T5810 jen do slotu 1 (x16 mechanicky, x8, half-length) – jediného volného, protože P100 ve slotech 2 a 4 zakryjí sloty 3 a 5 (pořadí slotů ověřeno z manuálu Dell). Tentýž slot potřebuje i druhá karta, obě najednou nejdou.',
  },
  {
    id: 'ssd', name: 'Kingston NV3 1 TB NVMe M.2 2280', part: 'SNV3S/1000G, jednostranný, bez DRAM (v Dellu poběží na PCIe 3.0 x4)',
    qty: 1, dims: [80, 22, 2.3], dimsSrc: 'ověřeno: Tom\'s Hardware (22 × 80 × 2,3 mm)', model: { kind: 'm2ssd' },
  },
  {
    id: 'm2_adapter', name: 'Redukce PCIe x4 → M.2 NVMe (Axagon PCEM2-N)', part: 'Slot M-key pro 2230–2280, full height i low profile záslepka',
    qty: 1, dims: [105, 49, 8], dimsSrc: 'ověřeno: AXAGON 105 × 49 × 8 mm (výrobce; zda s bracketem neuvádí)', model: { kind: 'm2adapter' },
    note: 'Deska T5810 nemá slot M.2, NVMe disk se proto zapojuje přes tuto kartu. Do T5810 jen do slotu 1 (x16 mechanicky, x8, half-length) – jediného volného, protože P100 ve slotech 2 a 4 zakryjí sloty 3 a 5 (pořadí slotů ověřeno z manuálu Dell). Tentýž slot potřebuje i druhá karta, obě najednou nejdou.',
  },
  {
    id: 'psu2', name: 'Druhý zdroj Seasonic Core GX-650', part: '650 W 80+ Gold, plně modulární, 150 × 86 × 140 mm (nástupce Focus GX-650)',
    qty: 1, dims: [150, 140, 86], dimsSrc: 'ověřeno: ATX 150 × 86 × 140 mm (Seasonic Focus GX)', model: { kind: 'psu' },
    note: 'Jako ve videu napájí obě P100 mimo zdroj Dellu. Sám se nezapne, potřebuje Add2PSU.',
  },
  {
    id: 'add2psu', name: 'Add2PSU modul', part: 'Sepne druhý zdroj současně s PC (24pinová zásuvka, vstup Molex/SATA, relé)',
    qty: 1, dims: [70, 30, 17], dimsSrc: 'ověřeno: ~70 × 30 mm (prodejci ±1 cm), výška odhad', model: { kind: 'add2psu' },
  },
  {
    id: 'eps_cable', name: 'Redukce 2× PCIe 8 pin → EPS 8 pin', part: 'NVIDIA 030-0571-000, ze dvou PCIe kabelů zdroje udělá 1× EPS pro P100',
    qty: 2, dims: [140, 50, 15.1], dimsSrc: 'ověřeno: kabel 10 cm (gekko), Mini-Fit Jr 18 × 15,1 × 19,6 mm', model: { kind: 'epsCable' },
    note: 'KRITICKÉ: PCIe a EPS mají +12 V a zem prohozené. Kabel PCIe zapojený přímo do P100 zkratuje zdroj nebo kartu.',
  },
  {
    id: 'pwm_ctrl', name: 'PWM regulátor s knoflíkem napájený ze SATA (ModDIY TD404)', part: '4 porty 4 pin PWM, napájení SATA 12 V, max. 60 W, knoflík 0–100 %',
    qty: 1, dims: [63, 32, 20.3], dimsSrc: 'ověřeno: ModDIY 63 × 32 × 20,3 mm (s knoflíkem)', model: { kind: 'pwmController' },
    note: 'Ventilátory NEZAPOJUJ do desky Dellu: konektory ventilátorů na desce T5810 jsou proprietární (jiné zapojení pinů) a dva BFB1012VH berou 2 × 1,8 A = 3,6 A, což jeden konektor na desce nesnese. Regulátor se napájí SATA kabelem z druhého zdroje a utáhne 2× 9733 + 2× P12 (~3,8 A z 5 A).',
  },
  {
    id: 'paste', name: 'Teplovodivá pasta Arctic MX-6 4 g', part: 'Na přepastování obou GP100 (původní pasta z roku 2016 je vyschlá)',
    qty: 1, dims: [92, 15, 15], dimsSrc: 'odhad: stříkačka (krabička 103 × 62 × 32 mm ověřena)', model: { kind: 'syringe' },
  },
  {
    id: 'case_fan', name: 'Ventilátor Arctic P12 PWM PST 120 mm', part: 'Přední a zadní skříňový, odvod ~300 W tepla ze skříně',
    qty: 2, dims: [120, 120, 25], dimsSrc: 'ověřeno: arctic.de (5 lopatek, kabel 400 mm)', model: { kind: 'fan120' },
  },
];

// ---------------------------------------------------------------- projekt 1: karta Diamond Edge 3D (díly)
// model.kind 'chip' staví stejné pouzdro jako PCB pohled (buildRealPart), typ = model zařízení v engine/devices.
const NV1_ITEMS = [
  { id: 'nv1', name: 'NVIDIA NV1 / SGS-Thomson STG2000X', part: 'Grafický čip karty, PQFP-208 (28 × 28 mm)', qty: 1, dims: [30.6, 30.6, 3.65], dimsSrc: 'ověřeno: JEDEC PQFP-208', model: { kind: 'chip', type: 'NV1_CORE' } },
  { id: 'ramdac', name: 'SGS-Thomson STG1764X', part: 'RAMDAC + PLL, PQFP-128 (14 × 20 mm)', qty: 1, dims: [17.2, 23.2, 2.95], dimsSrc: 'ověřeno: JEDEC PQFP-128', model: { kind: 'chip', type: 'RAMDAC_STG1764' } },
  { id: 'dram', name: 'Samsung KM416C256', part: '256K × 16 FPM DRAM, SOJ-40; 4 kusy = 2 MB na 64bitové sběrnici', qty: 4, dims: [26.03, 11.2, 3.6], dimsSrc: 'ověřeno: SOJ-40 400 mil', model: { kind: 'chip', type: 'DRAM_256K16' } },
  { id: 'codec', name: 'Analog Devices AD1845JP', part: 'SoundPort stereo kodek 16 bit / 48 kHz, PLCC-68', qty: 1, dims: [25.2, 25.2, 4.45], dimsSrc: 'ověřeno: PLCC-68 24,2 mm', model: { kind: 'chip', type: 'AD1845' } },
  { id: 'eprom', name: 'EPROM 27C256 (32K × 8)', part: 'Video BIOS karty, DIP-28 600 mil', qty: 1, dims: [36.8, 15.24, 4.4], dimsSrc: 'ověřeno: DIP-28 600 mil', model: { kind: 'chip', type: 'EPROM_27C256' } },
  { id: 'xtal_14', name: 'Krystal 14,31818 MHz', part: 'HC-49/U, reference pro PLL v RAMDACu', qty: 1, dims: [11.05, 4.65, 13.46], dimsSrc: 'ověřeno: HC-49/U', model: { kind: 'chip', type: 'CRYSTAL', freqHz: 14.31818e6 } },
  { id: 'xtal_24', name: 'Krystal 24,576 MHz', part: 'HC-49/U, takt kodeku AD1845 (48 kHz × 512)', qty: 1, dims: [11.05, 4.65, 13.46], dimsSrc: 'ověřeno: HC-49/U', model: { kind: 'chip', type: 'CRYSTAL', freqHz: 24.576e6 } },
  { id: 'de15', name: 'Konektor DE-15 (VGA) zásuvka', part: 'Do plošného spoje, úhlový, se šroubky 4-40', qty: 1, dims: [16.7, 30.8, 12.5], dimsSrc: 'ověřeno: DE-15 R/A', model: { kind: 'connector', build: 'de15' } },
  { id: 'rj45', name: 'Konektor RJ-45 (game port)', part: 'Zásuvka do plošného spoje, 8 kontaktů', qty: 1, dims: [17, 15.9, 13.5], dimsSrc: 'ověřeno: RJ-45 R/A', model: { kind: 'connector', build: 'rj45' } },
  { id: 'jack', name: 'Konektor jack 3,5 mm stereo', part: 'Line in, line out a mikrofon', qty: 3, dims: [13, 6, 6], dimsSrc: 'odhad: typický jack do DPS', model: { kind: 'connector', build: 'jack35' } },
  { id: 'crt', name: 'VGA CRT monitor', part: 'Analogový VGA monitor, 640 × 480 @ 60 Hz (model 14palcový)', qty: 1, dims: [360, 380, 328], dimsSrc: 'odhad: typický 14" CRT', model: { kind: 'crt' } },
  { id: 'speakers', name: 'Aktivní reproduktory 2.0', part: 'Vstup line in 3,5 mm', qty: 1, dims: [260, 130, 143], dimsSrc: 'odhad', model: { kind: 'speakers' } },
  { id: 'pad', name: 'Sega Saturn ovladač', part: 'Originální pad, na kartu přes Diamond game port adaptér', qty: 1, dims: [157, 70, 30], dimsSrc: 'odhad: obecný model padu', model: { kind: 'gamepad' } },
];

const median = (v) => (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2);

/** Doplní ceny z nabídek: price = [nejlevnější, nejdražší] Kč/ks, median; alt nabídky (např. celá karta) se nepočítají. */
export function withOffers(items, offers = OFFERS) {
  return items.map((it) => {
    const src = offers[it.id] || { offers: [], note: '' };
    const all = [...src.offers].sort((a, b) => a.priceCzk - b.priceCzk);
    const p = all.filter((o) => !o.alt).map((o) => o.priceCzk);
    return { ...it, offers: all, offerNote: src.note, price: p.length ? [p[0], p[p.length - 1]] : null, median: p.length ? median(p) : null };
  });
}

export const P100_PC_BOM = withOffers(P100_PC_ITEMS);
export const NV1_BOM = withOffers(NV1_ITEMS);

/** Součet kusovníku v Kč: nejlevnější varianta, medián nabídek, maximum; missing = položky bez nabídky. */
export function bomTotal(bom) {
  const t = { min: 0, median: 0, max: 0, missing: [] };
  for (const it of bom) {
    if (!it.price) { t.missing.push(it.name); continue; }
    t.min += it.qty * it.price[0];
    t.median += it.qty * it.median;
    t.max += it.qty * it.price[1];
  }
  return t;
}

export const fmtKc = (v) => `${Math.round(v).toLocaleString('cs-CZ')} Kč`;
export const fmtRange = (r) => (!r ? 'nedostupné' : r[0] === r[1] ? fmtKc(r[0]) : `${Math.round(r[0]).toLocaleString('cs-CZ')}–${fmtKc(r[1])}`);
