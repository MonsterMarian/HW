// Modely dílů projektu MŮJ PC (i7-9700 + RTX 3060 Ti) pro schéma L1. Sítě nesou napětí ve voltech, logická 1 = linka
// běží (PCIe/DMI/DDR4/USB natrénované), 'Z' = bez napájení. Postup zapnutí podle Intel ATX12V DG: +5VSB je stále,
// tlačítko → deska stáhne PS_ON# na COM → zdroj naběhne a pošle PWR_OK → VRM desky → PLTRST# uvolní CPU → POST.
import { nameNets, PC_DEVICES } from './pcBuild.js';
import { HW_PINS } from '../myPcLayout.js';

const Z = 'Z';
const num = (v) => typeof v === 'number';
const at = (v, volts) => num(v) && Math.abs(v - volts) < 0.01;
const VCORE = 1.2; // napětí jader i7-9700 ~1,19–1,21 V (změřeno 11. 11. 2026 LibreHardwareMonitorem při běžné zátěži; mění se s P-stavy)

export const MY_PC_DEVICES = {
  // Endorfy Vero L5 Bronze 600 W (ODHAD modelu): +5VSB pořád, ostatní větve až po PS_ON# = 0
  MYPC_PSU: {
    meta: { ref: 'PS1', part: 'Endorfy Vero L5 Bronze 600 W (odhad)', pkg: 'ATX', offBoard: true, desc: 'PS_ON# (pin 16) má pull-up na +5VSB; deska ho stáhne na COM a zdroj naběhne. PWR_OK (pin 8) až po ustálení větví. 1× EPS 4+4, 2× PCIe 6+2.' },
    pins: {
      inputs: { '16 PS_ON#': Z },
      outputs: {
        '24P +12V': Z, '24P +5V': Z, '24P +3,3V': Z, '24P COM': 0, '9 +5VSB': 5, '8 PWR_OK': 0,
        'EPS 5-8 +12V': Z, 'EPS 1-4 GND': 0,
        'PCIe1 1-3 +12V': Z, 'PCIe1 4-8 GND': 0, 'PCIe2 1-3 +12V': Z, 'PCIe2 4-8 GND': 0,
        'SATA13 +12V': Z, 'SATA4 GND': 0,
      },
    },
    pulls: { '16 PS_ON#': 1 },
    eval(comp) {
      const on = comp.inputs['16 PS_ON#'] === 0;
      const o = comp.outputs;
      o['24P +12V'] = o['EPS 5-8 +12V'] = o['PCIe1 1-3 +12V'] = o['PCIe2 1-3 +12V'] = o['SATA13 +12V'] = on ? 12 : Z;
      o['24P +5V'] = on ? 5 : Z;
      o['24P +3,3V'] = on ? 3.3 : Z;
      o['9 +5VSB'] = 5;
      o['8 PWR_OK'] = on ? 1 : 0;
    },
  },

  // ASUS PRIME B360-PLUS: tlačítko, VRM (VCORE, VCCSA/IO), VDDQ pro DIMM, sloty, PCH B360 (M.2, USB), hlavičky ventilátorů
  MYPC_BOARD: {
    meta: { ref: 'MB1', part: 'ASUS PRIME B360-PLUS', pkg: 'ATX', desc: 'Tlačítko přijme PCH (běží z pohotovostní větve +5VSB), uvolní SLP_S3# a Super I/O stáhne PS_ON#; model to má jako jeden krok desky. Po PWR_OK + EPS 12 V naběhne VRM CPU a VDDQ pamětí, PCH uvolní PLTRST# a tím CPU. PCH B360 je přes DMI 3.0 x4 na CPU a dává M.2_2 (x4) a USB.' },
    pins: {
      inputs: {
        'PANEL PWRBTN': 0, '24P +12V': Z, '24P +5V': Z, '24P +3,3V': Z, '24P COM': Z, '9 +5VSB': Z, '8 PWR_OK': Z,
        'EPS +12V': Z, 'EPS GND': Z, 'DMI 3.0 x4': Z,
      },
      outputs: {
        '16 PS_ON#': Z, 'VCORE': Z, 'VCCSA/VCCIO': Z, 'PLTRST#': 0, 'VDDQ A': Z, 'VDDQ B': Z,
        'SLOT +12V': Z, 'SLOT +3,3V': Z, 'SLOT GND': 0, 'M.2_2 PCIe x4': Z, 'M.2_2 +3,3V': Z,
        'CPU_FAN +12V': Z, 'CPU_FAN GND': 0, 'CPU_FAN PWM': Z, 'CHA_FAN +12V': Z, 'CHA_FAN GND': 0, 'CHA_FAN PWM': Z,
        'USB +5V': Z, 'USB DATA': Z,
        'PCIEX16_2 PCIe x4': Z, 'HDMI (iGPU)': Z, // druhý slot x16 (elektricky x4 z PCH) a výstup UHD 630 na zadním panelu
      },
    },
    // VccSA je 1,05 V; VccIO má u Coffee Lake S vlastní regulátor a typ. 0,95 V (Intel 337344, tab. 7-5 a 7-6) – tady jedna větev
    netNames: { 'VCORE': '+1,2V VCORE', 'VCCSA/VCCIO': '+1,05V VCCSA (VCCIO 0,95 V)', 'VDDQ A': '+1,2V VDDQ', 'VDDQ B': '+1,2V VDDQ' },
    eval(comp) {
      const i = comp.inputs, o = comp.outputs;
      const sb = at(i['9 +5VSB'], 5);
      o['16 PS_ON#'] = sb && i['PANEL PWRBTN'] === 1 ? 0 : Z; // otevřený kolektor: buď COM, nebo nic
      const pg = i['8 PWR_OK'] === 1 && at(i['24P +12V'], 12) && at(i['24P +5V'], 5) && at(i['24P +3,3V'], 3.3) && i['24P COM'] === 0
        && at(i['EPS +12V'], 12) && i['EPS GND'] === 0;
      o['VCORE'] = pg ? VCORE : Z;
      o['VCCSA/VCCIO'] = pg ? 1.05 : Z; // Super I/O změřilo VTT/VCCIO 1,048 V (11. 11. 2026)
      o['VDDQ A'] = o['VDDQ B'] = pg ? 1.2 : Z;
      o['PLTRST#'] = pg ? 1 : 0;
      o['SLOT +12V'] = pg ? 12 : Z;
      o['SLOT +3,3V'] = o['M.2_2 +3,3V'] = pg ? 3.3 : Z;
      const pch = pg && i['DMI 3.0 x4'] === 1; // model: datové linky PCH (M.2, USB) až po natrénování DMI. Skutečný PCH běží už z pohotovostní větve: přijme PWRBTN#, uvolní SLP_S3# (→ PS_ON#) a po PWR_OK PLTRST#
      o['M.2_2 PCIe x4'] = o['PCIEX16_2 PCIe x4'] = pch ? 1 : Z;
      o['HDMI (iGPU)'] = pch ? 1 : Z; // iGPU je v CPU: obraz až po POST (DMI natrénované = CPU prošel POST)
      o['USB +5V'] = pg ? 5 : Z;
      o['USB DATA'] = pch ? 1 : Z;
      o['CPU_FAN +12V'] = o['CHA_FAN +12V'] = pg ? 12 : Z;
      o['CPU_FAN PWM'] = pg ? (num(comp.cpuFan) ? comp.cpuFan : 40) : Z; // výchozí křivka Q-Fan v klidu (odhad)
      o['CHA_FAN PWM'] = pg ? (num(comp.chaFan) ? comp.chaFan : 50) : Z;
    },
  },

  // Intel Core i7-9700: bez napájení a PLTRST# stojí, bez paměti neprojde POST (pípání), pak natrénuje PCIe a DMI
  MYPC_CPU: {
    meta: { ref: 'U1', part: 'Intel Core i7-9700 (SRG13, LGA1151)', pkg: 'LGA1151', desc: '8 jader / 8 vláken, 65 W. 2 kanály DDR4-2666, PCIe 3.0 x16 pro grafiku, DMI 3.0 x4 do PCH. Bez modulu RAM neprojde POST.' },
    pins: {
      inputs: { 'VCORE': Z, 'VCCSA/VCCIO': Z, 'PLTRST#': Z, 'DQ A1': Z, 'DQ A2': Z, 'DQ B1': Z, 'DQ B2': Z },
      outputs: { 'DDR4 A CMD': Z, 'DDR4 B CMD': Z, 'PCIe 3.0 x16': Z, 'DMI 3.0 x4': Z, 'STAV': 0 },
    },
    netNames: { 'VCORE': '+1,2V VCORE', 'VCCSA/VCCIO': '+1,05V VCCSA (VCCIO 0,95 V)' },
    eval(comp) {
      const i = comp.inputs, o = comp.outputs;
      const powered = at(i['VCORE'], VCORE) && at(i['VCCSA/VCCIO'], 1.05) && i['PLTRST#'] === 1;
      o['DDR4 A CMD'] = o['DDR4 B CMD'] = powered ? 1 : Z;
      const mem = ['DQ A1', 'DQ A2', 'DQ B1', 'DQ B2'].some((p) => i[p] === 1);
      const post = powered && mem;
      o['DMI 3.0 x4'] = post ? 1 : Z;
      o['PCIe 3.0 x16'] = post ? 1 : Z;
      o['STAV'] = post ? 1 : 0;
      comp.channels = ['A', 'B'].filter((ch) => i[`DQ ${ch}1`] === 1 || i[`DQ ${ch}2`] === 1).length; // 2 = dual channel
    },
  },

  // HyperX Fury 8 GB DDR4-2666: odpoví na příkazy, když má VDDQ 1,2 V
  MYPC_DIMM: {
    meta: { ref: 'DIMM', part: 'Kingston HyperX Fury 8 GB DDR4-2666 CL16 (KHX2666C16/8G)', pkg: 'UDIMM', desc: '1Rx8, 8 čipů 8 Gb, 1,2 V. Bez registru – adresy jdou z CPU přímo na čipy.' },
    pins: { inputs: { 'VDDQ 1,2V': Z, 'CMD/ADR': Z }, outputs: { 'DQ 64 BIT': Z } },
    netNames: { 'VDDQ 1,2V': '+1,2V VDDQ' },
    eval(comp) {
      comp.outputs['DQ 64 BIT'] = at(comp.inputs['VDDQ 1,2V'], 1.2) && comp.inputs['CMD/ADR'] === 1 ? 1 : Z;
    },
  },

  // ASUS Dual RTX 3060 Ti GDDR6X: napájení 2× 8 pin + slot; zem karty je jedna měď
  MYPC_GPU: {
    meta: { ref: 'G1', part: 'ASUS Dual GeForce RTX 3060 Ti OC 8 GB GDDR6X', pkg: 'PCIe x16', desc: '200 W podle NVIDIA (ASUS příkon neuvádí); konektory dovolí 2× 150 W + 75 W ze slotu. Piny 4 a 6 konektoru jsou SENSE (v zástrčce zdroje spojené se zemí) – podle nich karta pozná 8 pin. Bez kteréhokoli 8 pinu karta nenaběhne. Výstupy HDMI 2.1 + 3× DP 1.4a.' },
    pins: {
      inputs: {
        'PCIe x16': Z, 'SLOT +12V': Z, 'SLOT +3,3V': Z, 'SLOT GND': Z,
        '8PIN-1 1-3 +12V': Z, '8PIN-1 4-8 GND': Z, '8PIN-2 1-3 +12V': Z, '8PIN-2 4-8 GND': Z,
      },
      outputs: { 'HDMI': Z, 'STAV': 0 },
    },
    joins: [['SLOT GND', '8PIN-1 4-8 GND'], ['SLOT GND', '8PIN-2 4-8 GND']],
    eval(comp) {
      const i = comp.inputs;
      const vals = ['SLOT +12V', '8PIN-1 1-3 +12V', '8PIN-2 1-3 +12V', 'SLOT GND'].map((p) => i[p]);
      if (vals.includes('X')) { comp.outputs.STAV = 'X'; comp.outputs.HDMI = Z; return; }
      const ok = at(i['SLOT +12V'], 12) && at(i['SLOT +3,3V'], 3.3) && i['SLOT GND'] === 0 && at(i['8PIN-1 1-3 +12V'], 12) && at(i['8PIN-2 1-3 +12V'], 12);
      const run = ok && i['PCIe x16'] === 1;
      comp.outputs.STAV = run ? 1 : 0;
      comp.outputs.HDMI = run ? 1 : Z;
    },
  },

  // Samsung 970 EVO Plus v M.2_2: 3,3 V + PCIe x4 z PCH
  MYPC_SSD: {
    meta: { ref: 'SSD1', part: 'Samsung 970 EVO Plus 500 GB (M.2_2)', pkg: 'M.2 2280', desc: 'Napájení jen 3,3 V ze slotu M.2 (průměr 5,8 W, špička 9 W). PCIe 3.0 x4 z PCH B360, NVMe 1.3.' },
    pins: { inputs: { 'PCIe x4': Z, '+3,3V': Z }, outputs: { 'STAV': 0 } },
    eval(comp) {
      comp.outputs.STAV = at(comp.inputs['+3,3V'], 3.3) && comp.inputs['PCIe x4'] === 1 ? 1 : 0;
    },
  },

  // Ventilátor 4 pin (boxový Intel / skříňové Stratus): otáčky podle PWM, tacho
  MYPC_FAN: {
    meta: { ref: 'M', part: 'Ventilátor 4 pin PWM', pkg: 'FAN', offBoard: true, desc: '1 GND, 2 +12 V, 3 tacho (2 pulzy/ot.), 4 PWM 25 kHz. Bez PWM signálu běží naplno.' },
    pins: { inputs: { '1 GND': Z, '2 +12V': Z, '4 PWM': Z }, outputs: { '3 OT/MIN': 0 } },
    eval(comp) {
      const on = at(comp.inputs['2 +12V'], 12) && comp.inputs['1 GND'] === 0;
      const duty = num(comp.inputs['4 PWM']) ? comp.inputs['4 PWM'] : 100;
      const max = comp.maxRpm || 2500, min = comp.minRpm || 0;
      comp.outputs['3 OT/MIN'] = on ? Math.round(Math.max(min, max * duty / 100)) : 0;
    },
  },

  // Monitor ASUS VA249HE: vlastní zdroj ze zásuvky, obraz jen když na HDMI běží signál
  MYPC_MONITOR: {
    meta: { ref: 'MON1', part: 'ASUS VA249HE 23,8" (EDID AUS24C1)', pkg: 'MONITOR', offBoard: true, desc: 'VA 1920 × 1080 @ 60 Hz, vstupy HDMI + VGA, vestavěný zdroj 100–240 V. Bez signálu ukáže „No Signal“ a usne.' },
    pins: { inputs: { 'HDMI': Z }, outputs: { 'OBRAZ': 0 } },
    eval(comp) { comp.outputs.OBRAZ = comp.inputs.HDMI === 1 ? 1 : 0; },
  },

  // USB periferie (klávesnice, myš, mikrofon): napájení VBUS 5 V + enumerace přes D+/D−
  MYPC_USB_DEV: {
    meta: { ref: 'USB', part: 'USB zařízení (HID / audio)', pkg: 'USB', offBoard: true, desc: 'VBUS 5 V (max. 500 mA na port USB 2.0), data D+/D− z PCH. Po připojení se zařízení ohlásí (enumerace) a Windows načte ovladač.' },
    pins: { inputs: { 'VBUS +5V': Z, 'D+/D−': Z }, outputs: { 'STAV': 0 } },
    eval(comp) { comp.outputs.STAV = at(comp.inputs['VBUS +5V'], 5) && comp.inputs['D+/D−'] === 1 ? 1 : 0; },
  },
};

nameNets(MY_PC_DEVICES);
// pohled PCB: vývody na skutečných místech (konektory desky, patice, slot, M.2)
for (const [type, pins] of Object.entries(HW_PINS)) (MY_PC_DEVICES[type] || PC_DEVICES[type]).hwPins = pins; // TESLA_P100 z AI PC v projektu MŮJ PC + 2× P100
