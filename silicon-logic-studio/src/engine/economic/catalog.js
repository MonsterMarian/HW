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
    note: 'BIOS umí jen 16GB okno pro paměti PCIe karet, proto je potřeba přeflashovat VBIOS P100 (nvflash). Zdroj Dellu má přes PSU extended card 2× PCIe 6 pin – ty napájí první P100 (jako ve videu); u kusu z bazaru ověř, že kabely 6 pin má (Dell KB 000140822).',
  },
  {
    id: 'cpu', name: 'Intel Xeon E5-1650 v3', part: '6 jader / 12 vláken, 3,5 GHz, LGA 2011-3, 40× PCIe 3.0, bez iGPU',
    qty: 1, dims: [52.5, 45, 5.08], dimsSrc: 'ověřeno: Intel TMSDG 330786 (Small: substrát 52,5 × 45 mm, plocha IHS 40,5 × 36,74 mm, výška ≈ 5,08 mm)', model: { kind: 'cpu', marking: ['INTEL® XEON®', 'E5-1650 v3', 'SR20J 3.50GHZ'] },
    note: 'Nemá integrovanou grafiku, obraz proto dává Quadro K620.',
  },
  {
    id: 'ram', name: 'DDR4 ECC Registered 8 GB', part: 'RDIMM 1Rx4 2133/2400 MHz, 288 pinů; 4 kusy = 32 GB v quad-channel',
    qty: 4, dims: [133.35, 31.25, 4.2], dimsSrc: 'ověřeno: Samsung M393A1G40EB1 datasheet', model: { kind: 'rdimm' },
    note: 'Dell T5810 bere jen ECC Registered paměti, běžné desktopové DDR4 v něm nefungují.',
  },
  {
    id: 'p100', name: 'NVIDIA Tesla P100 16 GB PCIe', part: 'GP100 Pascal, 16 GB HBM2 732 GB/s, pasivní, bez video výstupů (PCIe, ne SXM2!)',
    qty: 2, dims: [267, 111.15, 37], dimsSrc: 'ověřeno: NVIDIA PB-08248 obr. 2 (266,7 × 111,15 mm, dual slot); tloušťka 37 mm je odhad', model: { kind: 'tesla' },
    note: 'Do Dellu se samotná karta vejde: délka 266,7 z max. 312 mm, výška 111,15 mm (plná výška PCIe). Váží 1177 g, chce průtok aspoň 12 CFM (26 CFM při 45 °C na vstupu), GPU zpomaluje při 82 °C a vypíná při 85 °C (PB-08248). Napájí se 8pinovým EPS (CPU) konektorem na čele karty, ne PCIe! V sestavě omezené na 150 W (nvidia-smi -pl 150).',
  },
  {
    id: 'shroud', name: 'Adaptér chlazení (shroud) pro P100', part: 'Plastový kryt pro radiální ventilátor 97 × 33 mm, šrouby a klíč',
    qty: 2, dims: [91, 111, 38], dimsSrc: 'ověřeno: 91,2 mm délka (Newegg kit), průřez podle karty', model: { kind: 'shroudAdapter' },
    note: 'Karta s adaptérem a ventilátorem měří ~350–406 mm. Dell T5810 bere karty jen do 312 mm (plná délka PCIe), za tím je držák karet a šachty disků, takže se do zavřené skříně NEVEJDE. Jen s otevřeným bokem, nebo kartu přes riser mimo skříň.',
  },
  {
    id: 'blower', name: 'Radiální ventilátor 9733 (Delta BFB1012VH)', part: '97 × 94 × 33 mm, 12 V, 4 pin – ke každému adaptéru jeden',
    qty: 2, dims: [97, 94, 33], dimsSrc: 'ověřeno: 97 × 94 × 33 mm (Newegg, Sensdar)', model: { kind: 'blower' },
    note: 'Bere 1,5 A při 12 V (datasheet Delta: 18 W, 4500 ot/min, 38 CFM; na štítku 1,80 A). Zapoj do regulátoru TD404, ne do desky. Verze bez přípony má jen 2 vodiče – kup PWM variantu se 4 piny.',
  },
  {
    id: 'k620', name: 'NVIDIA Quadro K620 2 GB', part: 'Low profile, single slot, DVI-I + DisplayPort, 45 W bez přídavného napájení',
    qty: 1, dims: [160, 68.9, 18], dimsSrc: 'ověřeno: NVIDIA datasheet 75509 (68,9 × 160 mm)', model: { kind: 'k620' },
    note: 'Jen na obraz pro BIOS a plochu. Do Dellu nasaď full height záslepku (PNY ji přikládá). Do T5810 jen do slotu 1 (x16 mechanicky, x8, half-length) – jediného volného, protože P100 ve slotech 2 a 4 zakryjí sloty 3 a 5 (pořadí slotů ověřeno z manuálu Dell). Tentýž slot potřebuje i druhá karta, obě najednou nejdou.',
  },
  {
    id: 'ssd', name: 'Samsung 870 EVO 1 TB (2,5" SATA)', part: 'MZ-77E1T0B: SATA 6 Gb/s, řadič Samsung MKX, 1 GB LPDDR4, V-NAND TLC, 560/530 MB/s',
    qty: 1, dims: [100, 69.85, 6.8], dimsSrc: 'ověřeno: Samsung 870 EVO datasheet Rev 1.1', model: { kind: 'ssd25' },
    note: 'Místo NVMe s redukcí: v T5810 pro redukci nezbývá slot (jediný volný slot 1 má K620) a ve videu NVMe není. Do 3,5" rámečku Dellu se 2,5" disk šroubuje přímo (manuál Dell), na desce je 6× SATA 6 Gb/s. Model 22 GB se načte asi za 40 s.',
  },
  {
    id: 'psu2', name: 'Druhý zdroj Seasonic Core GX-650', part: '650 W 80+ Gold, plně modulární, 150 × 86 × 140 mm (řada Core GX ATX 3, 2024)',
    qty: 1, dims: [150, 140, 86], dimsSrc: 'ověřeno: 150 × 86 × 140 mm (Geizhals, Mironet)', model: { kind: 'psu' },
    note: 'Jako ve videu napájí jen druhou P100 (první jede ze zdroje Dellu přes jeho 2× 6 pin). Sám se nezapne, potřebuje Add2PSU. Má jen jeden PCIe kabel se dvěma konektory 6+2 (a 12V-2x6): oba jdou do redukce, což při limitu 150 W stačí; +12 V 54 A.',
  },
  {
    id: 'add2psu', name: 'Add2PSU modul', part: 'Sepne druhý zdroj současně s PC (24pinová zásuvka, vstup Molex/SATA, relé)',
    qty: 1, dims: [70, 30, 17], dimsSrc: 'ověřeno: ~70 × 30 mm (prodejci ±1 cm), výška odhad', model: { kind: 'add2psu' },
    note: 'Originál má vstup 4pin Molex. Zdroj Dellu má jen SATA napájení, takže je potřeba redukce SATA → Molex, nebo verze modulu se SATA vstupem.',
  },
  {
    id: 'eps_cable', name: 'Redukce 2× PCIe 8 pin → EPS 8 pin', part: 'NVIDIA 030-0571-000, ze dvou PCIe kabelů zdroje udělá 1× EPS pro P100',
    qty: 2, dims: [140, 50, 15.1], dimsSrc: 'ověřeno: vodiče 70 ± 20 mm (NVIDIA PB-08248 obr. 4), Mini-Fit Jr 18 × 15,1 × 19,6 mm; celek 120–140 mm', model: { kind: 'epsCable' },
    note: 'KRITICKÉ: PCIe a EPS mají +12 V a zem prohozené. Kabel PCIe zapojený přímo do P100 zkratuje zdroj nebo kartu. Redukce bere i 2× 6 pin (NVIDIA PB-08248 tab. 8, kabely 6 pin mají podle NVIDIA unést 120 W) – tak se připojí první karta k Dellu.',
  },
  {
    id: 'pwm_ctrl', name: 'PWM regulátor s knoflíkem napájený ze SATA (ModDIY TD404)', part: '4 porty 4 pin PWM, napájení SATA 12 V, max. 60 W, knoflík 0–100 %',
    qty: 1, dims: [63, 32, 20.3], dimsSrc: 'ověřeno: ModDIY 63 × 32 × 20,3 mm (s knoflíkem)', model: { kind: 'pwmController' },
    note: 'Ventilátory NEZAPOJUJ do desky Dellu: deska T5810 má 3× 4pin pro systémové ventilátory a nestandardní 5pin pro CPU/HDD (manuál Dell, tab. 30), zapojení pinů Dell neuvádí, a dva BFB1012VH berou 2 × 1,5 A = 3,0 A (podle štítků 3,6 A), což jeden konektor na desce nesnese. Regulátor se napájí SATA kabelem z druhého zdroje a utáhne 2× 9733 + 2× P12 (~3,2 A typicky, 3,8 A podle štítků, z 5 A).',
  },
  {
    id: 'paste', name: 'Teplovodivá pasta Arctic MX-6 4 g', part: 'Na přepastování obou GP100 (původní pasta z roku 2016 je vyschlá)',
    qty: 1, dims: [92, 15, 15], dimsSrc: 'odhad: stříkačka (krabička 103 × 62 × 32 mm ověřena)', model: { kind: 'syringe' },
  },
  {
    id: 'case_fan', name: 'Ventilátor Arctic P12 PWM PST 120 mm', part: 'Přední a zadní skříňový, odvod ~300 W tepla ze skříně',
    qty: 2, dims: [120, 120, 25], dimsSrc: 'ověřeno: arctic.de (5 lopatek, kabel 400 mm); 3D = oficiální CAD model Arctic P12 Pro (rám shodný, lopatky jiné)', model: { kind: 'fan120', real: 'arctic_p12_pro' },
  },
];

// ---------------------------------------------------------------- projekt 3: můj PC (diagnostika Windows 10. 11. 2026)
// Co software nevidí (skříň, zdroj, chladič, typ myši/mikrofonu), je ODHAD – seznam k opravě je v MujPC_odhady.md.
// Layout desky: ASUS manuál E13832 str. 1-1 (měřeno z vektorového výkresu, ±2 mm), [v od horní hrany, u od zadní hrany I/O].
export const B360_LAYOUT = {
  holes: [[6.35, 33.02], [6.35, 165.1], [163.83, 10.16], [163.83, 165.1], [288.29, 10.16], [288.29, 165.1]], // otvory ATX F, J, C, H, A, G (palcový rastr)
  socket: [86, 108],
  dimm: { v: 82.7, len: 141.2, u: [164.2, 174, 183, 192.8] }, // od CPU: B1, B2, A1, A2
  slots: [
    { kind: 'x1', v: 162.7, u0: 42, len: 27 }, // PCIEX1_1
    { kind: 'x16', v: 183.02, u0: 42, len: 89, safe: true }, // PCIEX16_1 – grafika (rozteč slotů 20,32 mm)
    { kind: 'x1', v: 203.34, u0: 42, len: 27 }, // PCIEX1_2
    { kind: 'x16', v: 243.98, u0: 42, len: 89 }, // PCIEX16_2 (x4)
    { kind: 'pci', v: 264.3, u0: 39, len: 80 }, // PCI1 (most ASM1083)
    { kind: 'pci', v: 284.6, u0: 39, len: 80 }, // PCI2
  ],
  m2: [{ v: 164, u: 153, screw: 74 }, { v: 225, u: 124, screw: 46 }], // M.2_1 (x2), M.2_2 (x4 – je v něm SSD)
  heatsinks: [{ v: 212, u: 178, w: 40, d: 40, h: 9 }, { v: 82, u: 70, w: 64, d: 16, h: 24 }], // PCH B360; VRM = odhad tvaru
  atx24: [112, 214.8], eps8: [17.5, 38],
  sata: [[252, 215], [268, 215], [284, 193], [284, 211], [297, 193], [297, 211]],
  battery: [261, 136],
  io: [['ps2', 2, 17, 33], ['dvi', 26, 57, 30], ['usb3', 63, 78, 15], ['hdmi', 83, 99, 12], ['usb31', 105, 121, 15], ['lan', 122, 141, 31], ['audio', 144, 157, 34]],
  chips: [{ v: 175, u: 22, s: 6 }, { v: 280, u: 22, s: 7 }, { v: 254, u: 14, s: 10 }, { v: 220, u: 20, s: 12 }, { v: 260, u: 179, s: 5 }], // RTL8111H, ALC887, ASM1083, Super I/O, BIOS
};

const MY_PC_ITEMS = [
  {
    id: 'my_mobo', name: 'ASUS PRIME B360-PLUS', part: 'ATX deska, Intel B360, LGA1151, 4× DDR4, 2× M.2, PCIe x16 + x4, 2× x1, 2× PCI (ASM1083), RTL8111H, ALC887',
    qty: 1, dims: [305, 221, 36], dimsSrc: 'ověřeno: ASUS manuál E13832 (305 × 221 mm, polohy prvků z výkresu ±2 mm); výška I/O odhad', model: { kind: 'atxBoard', layout: B360_LAYOUT },
    note: 'Zjištěno z WMI: Rev 1.xx, BIOS 3101 (10. 9. 2021). Grafika je v PCIEX16_1 (linka x16), SSD v M.2_2 (linka x4 – M.2_1 umí jen x2).',
  },
  {
    id: 'my_cpu', name: 'Intel Core i7-9700', part: '8 jader / 8 vláken, 3,0 / 4,7 GHz, 12 MB L3, 65 W, UHD 630, sSpec SRG13 (stepping R0)',
    qty: 1, dims: [37.5, 37.5, 4.4], dimsSrc: 'ověřeno: Intel ARK (pouzdro 37,5 × 37,5 mm); výška a plocha IHS odhad', model: { kind: 'cpu', marking: ['INTEL® CORE™', 'i7-9700', 'SRG13 3.00GHZ'], ihs: [33.5, 33.5], sub: 1.15 },
    note: 'CPUID 906ED = jediný sSpec SRG13. Má integrovanou grafiku UHD 630 (monitor ale jede z RTX).',
  },
  {
    id: 'my_cooler', name: 'Boxový chladič Intel E97379-003', part: 'Hliníkový radiální chladič s 90mm ventilátorem 4 pin PWM, push-pin úchyty 75 × 75 mm (dodáván k i7-9700 BOX)',
    qty: 1, dims: [95, 95, 48.7], dimsSrc: 'odhad: výška 48,7 mm (Galaxus), průměr ~95 mm; model chladiče je ODHAD', model: { kind: 'boxCooler', core: 'alu' },
    note: 'ODHAD – chladič software nezjistí. Pokud máš věžový chladič, oprav v MujPC_odhady.md.',
  },
  {
    id: 'my_ram', name: 'Kingston HyperX Fury 8 GB DDR4-2666 CL16', part: 'KHX2666C16/8G (pravděpodobně HX426C16FB2/8, černý chladič), 1Rx8, 1,2 V; 4 kusy = 32 GB dual channel',
    qty: 4, dims: [133.35, 34.04, 7.08], dimsSrc: 'ověřeno: Kingston datasheet HX426C16FB2K2/16', model: { kind: 'udimm', marking: ['HyperX', 'FURY', 'HX426C16FB2/8 · 8GB DDR4-2666 CL16'] },
    note: 'SPD kód je stejný pro černou, bílou i červenou verzi (FB/FW/FR) – barva chladiče je odhad.',
  },
  {
    id: 'my_gpu', name: 'ASUS Dual GeForce RTX 3060 Ti OC 8 GB GDDR6X', part: 'DUAL-RTX3060TI-O8GD6X: GA104, 8 GB GDDR6X 19 Gb/s, boost 1 710 MHz, 200 W (NVIDIA), 2× 8 pin, HDMI 2.1 + 3× DP 1.4a',
    qty: 1, dims: [230, 120, 42], dimsSrc: 'ověřeno: asus.com techspec (230 × 120 × 42 mm, 2 sloty)', model: { kind: 'gpu', fans: 2, fanD: 88, power: ['8pin', '8pin'], shroudColor: 0x1b1c1f, accent: 0x8a8f96, marking: ['ASUS', 'DUAL', 'GEFORCE RTX 3060 Ti'] },
    note: 'Subsystém 1043:88AE + VBIOS 94.04.94.00.85 přesně odpovídají verzi OC (TechPowerUp VGA BIOS 254310). Běží v PCIe 3.0 x16. Pořadí výstupů na záslepce a poloha 8 pinů jsou odhad.',
  },
  {
    id: 'my_ssd', name: 'Samsung 970 EVO Plus 500 GB', part: 'MZ-V7S500BW: NVMe M.2 2280, PCIe 3.0 x4, řadič Phoenix (novější kusy Elpis – neověřeno), 512 MB LPDDR4, V-NAND TLC',
    qty: 1, dims: [80.15, 22.15, 2.38], dimsSrc: 'ověřeno: Samsung datasheet', model: { kind: 'm2ssd', marking: ['SAMSUNG', '970 EVO Plus', 'NVMe M.2 · 500GB · MZ-V7S500'] },
  },
  {
    id: 'my_case', name: 'Skříň Endorfy Signum 300 Air (ODHAD)', part: 'ATX midi tower, síťované čelo, tvrzené sklo vlevo, 4× Stratus 120 PWM (3 vpředu, 1 vzadu)',
    qty: 1, dims: [413, 216, 447], dimsSrc: 'odhad: model skříně odhadnut; rozměry Endorfy datasheet (H 447 × Š 216 × H 413 mm), kryt zdroje neověřen', model: { kind: 'atxCase', fans: { front: 3, rear: 1 }, shroudH: 95, marking: 'ENDORFY' },
    note: 'ODHAD – skříň software nevidí. Vejde se do ní karta do 325 mm a chladič do 161 mm.',
  },
  {
    id: 'my_psu', name: 'Zdroj Endorfy Vero L5 Bronze 600 W (ODHAD)', part: 'ATX, 80+ Bronze, nemodulární, 120mm ventilátor, 1× EPS 4+4, 2× PCIe 6+2, 5× SATA',
    qty: 1, dims: [150, 140, 87], dimsSrc: 'odhad: model zdroje odhadnut; rozměry Datart (150 × 140 × 87 mm)', model: { kind: 'psu', marking: ['ENDORFY', 'VERO L5 600W 80+ BRONZE'], modular: false },
    note: 'ODHAD – zdroj software nevidí. Karta potřebuje 2× 8 pin (ASUS doporučuje 750W zdroj; 600 W na i7-9700 + 3060 Ti v praxi stačí).',
  },
  {
    id: 'my_monitor', name: 'ASUS VA249HE 23,8"', part: 'VA panel 1920 × 1080 @ 60 Hz, HDMI + VGA, stojan s náklonem (EDID AUS24C1, vyroben 2020)',
    qty: 1, dims: [552.4, 396.9, 205], dimsSrc: 'ověřeno: asus.com techspec (se stojanem), hlava 552,4 × 334,2 × 56,6 mm (lcd-compare); rámeček a podstavec odhad', model: { kind: 'monitor', t: 56.6, panelH: 334.2, base: [205, 175], round: true, screen: [527, 296.5] },
    note: 'EDID říká jen „VA249“ – stejný kód má i VA249NA (DVI místo HDMI), který vypadá stejně.',
  },
  {
    id: 'my_keyboard', name: 'ASUS ROG Strix Flare', part: 'Mechanická klávesnice Cherry MX RGB (barva spínačů neznámá), full size, mediální klávesy, váleček hlasitosti, odznak ROG',
    qty: 1, dims: [454, 230, 31], dimsSrc: 'ověřeno: 454 × 155 × 31 mm bez opěrky (Comfor, Mironet); opěrka ~75 mm odhad', model: { kind: 'keyboard', rest: 75, marking: 'ROG' },
  },
  {
    id: 'my_mouse', name: 'USB herní myš (OEM 30FA:1440)', part: 'Drátová RGB herní myš, čínský OEM „INSTANT“ prodávaný pod různými značkami',
    qty: 1, dims: [122, 68, 36], dimsSrc: 'odhad: typická myš stejného OEM (Anko 122 × 68 × 36 mm)', model: { kind: 'mouse' },
    note: 'Značku a model najdeš na štítku na spodku myši.',
  },
  {
    id: 'my_mic', name: 'USB mikrofon (C-Media 0D8C:0134)', part: 'USB kondenzátorový mikrofon na trojnožce typu TONOR TC-777 (Windows ho vidí jen jako mikrofon)',
    qty: 1, dims: [150, 150, 260], dimsSrc: 'odhad: typický stolní USB mikrofon na trojnožce', model: { kind: 'usbMic' },
  },
];

// ---------------------------------------------------------------- projekt 1: karta Diamond Edge 3D (díly)
// model.kind 'chip' staví stejné pouzdro jako PCB pohled (buildRealPart), typ = model zařízení v engine/devices.
const NV1_ITEMS = [
  { id: 'nv1', name: 'NVIDIA NV1 / SGS-Thomson STG2000X', part: 'Grafický čip karty, PQFP-208 (28 × 28 mm)', qty: 1, dims: [30.6, 30.6, 3.65], dimsSrc: 'ověřeno: JEDEC PQFP-208', model: { kind: 'chip', type: 'NV1_CORE' } },
  { id: 'ramdac', name: 'SGS-Thomson STG1764X', part: 'Palette-DAC 135 MHz + 3× PLL (STG1764X-13), PQFP', qty: 1, dims: [17.2, 23.2, 2.95], dimsSrc: 'odhad: 14 × 20 mm je předpoklad; na fotografii karty (vgamuseum) je čip čtvercový, asi 28 × 28 mm', model: { kind: 'chip', type: 'RAMDAC_STG1764' } },
  { id: 'dram', name: 'DRAM 256K × 16 (např. Samsung KM416C256-5)', part: 'FPM DRAM 50 ns, SOJ-40; 2 připájené + 2 v paticích = 2 MB (dvě banky po 1 MB na 32bitové sběrnici MD)', qty: 4, dims: [26.03, 11.2, 3.6], dimsSrc: 'ověřeno: SOJ-40 400 mil', model: { kind: 'chip', type: 'DRAM_256K16' } },
  { id: 'codec', name: 'Analog Devices AD1845JP', part: 'SoundPort stereo kodek 16 bit / 48 kHz, PLCC-68', qty: 1, dims: [25.2, 25.2, 4.45], dimsSrc: 'ověřeno: PLCC-68 24,2 mm', model: { kind: 'chip', type: 'AD1845' } },
  { id: 'eprom', name: 'EPROM 27C256 (32K × 8)', part: 'Video BIOS karty, DIP-28 600 mil', qty: 1, dims: [36.8, 15.24, 4.4], dimsSrc: 'ověřeno: DIP-28 600 mil', model: { kind: 'chip', type: 'EPROM_27C256' } },
  { id: 'xtal_14', name: 'Krystal 14,31818 MHz', part: 'HC-49/U, jediný krystal karty: reference pro 3 PLL v RAMDACu (frekvence je předpoklad, na fotografii karty čteme 12,096 MHz)', qty: 1, dims: [11.05, 4.65, 13.46], dimsSrc: 'ověřeno: HC-49/U', model: { kind: 'chip', type: 'CRYSTAL', freqHz: 14.31818e6 } },
  { id: 'de15', name: 'Konektor DE-15 (VGA) zásuvka', part: 'Do plošného spoje, úhlový, se šroubky 4-40', qty: 1, dims: [16.7, 30.8, 12.5], dimsSrc: 'ověřeno: DE-15 R/A', model: { kind: 'connector', build: 'de15' } },
  { id: 'rj45', name: 'Modulární zásuvka (game/MIDI port)', part: 'Zásuvka do plošného spoje; zdroje se liší, zda RJ-45 (8) nebo RJ-50 (10 kontaktů)', qty: 1, dims: [17, 15.9, 13.5], dimsSrc: 'ověřeno: RJ-45 R/A', model: { kind: 'connector', build: 'rj45' } },
  { id: 'jack', name: 'Konektor jack 3,5 mm stereo', part: 'Line in, line out a mikrofon', qty: 3, dims: [13, 6, 6], dimsSrc: 'odhad: typický jack do DPS', model: { kind: 'connector', build: 'jack35' } },
  { id: 'crt', name: 'VGA CRT monitor', part: 'Analogový VGA monitor, 640 × 480 @ 60 Hz (model 14palcový)', qty: 1, dims: [360, 380, 328], dimsSrc: 'odhad: typický 14" CRT', model: { kind: 'crt' } },
  { id: 'speakers', name: 'Aktivní reproduktory 2.0', part: 'Vstup line in 3,5 mm', qty: 1, dims: [260, 130, 143], dimsSrc: 'odhad', model: { kind: 'speakers' } },
  { id: 'pad', name: 'Sega Saturn ovladač', part: 'Originální pad; na skutečné kartě přes headery J5/J6 a zvláštní Sega bracket (model: přes game port)', qty: 1, dims: [157, 70, 30], dimsSrc: 'odhad: obecný model padu', model: { kind: 'gamepad' } },
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
export const MY_PC_BOM = withOffers(MY_PC_ITEMS);

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
