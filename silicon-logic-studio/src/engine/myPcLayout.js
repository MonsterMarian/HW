// MŮJ PC – rozložení pro pohled PCB (2D) a DIE 3D: deska ASUS PRIME B360-PLUS 1 : 1 podle manuálu E13832
// (B360_LAYOUT v catalog.js, souřadnice [v od horní hrany, u od zadní hrany I/O] v mm). Ve 2D jde u doprava (x) a v dolů (y),
// takže deska vypadá jako na fotce z manuálu: zadní I/O vlevo, patice nahoře, sloty dole.
import { PX_PER_MM as PX } from './boardLayout.js';

export const MB_W = 221, MB_H = 305; // mm
export const MB = { x: 420, y: 40, w: MB_W * PX, h: MB_H * PX }; // 2D px
export const at = (u, v) => ({ x: MB.x + u * PX, y: MB.y + v * PX });

// Kde na desce leží součástky (mm): obdélník [u0, v0, šířka podél u, výška podél v]
const DIMM_U = { b1: 164.2, b2: 174, a1: 183, a2: 192.8 }; // od CPU: B1, B2, A1, A2 (manuál)
export const ON_BOARD = {
  cpu: [108 - 18.75, 86 - 18.75, 37.5, 37.5], // LGA1151, střed patice (108, 86)
  ...Object.fromEntries(Object.entries(DIMM_U).map(([id, u]) => [id, [u - 3.5, 82.7 - 66.7, 7, 133.35]])),
  gpu: [0, 180, 230, 42], // PCIEX16_1 (v 182,8): karta 230 mm od zadního plechu, chladič 42 mm k dolní hraně desky
  ssd: [44, 214, 80.15, 22.15], // M.2_2: konektor u 124, šroub 2280 u 46 – z poloviny pod grafikou
};

/** Poloha (x, y v 2D px) každé součástky schématu L1 v pohledu PCB. Zařízení mimo desku stojí kolem ní (ne v měřítku). */
export const HW_POS = {
  mb: at(0, 0),
  ...Object.fromEntries(Object.entries(ON_BOARD).map(([id, [u, v]]) => [id, at(u, v)])),
  // vlevo od zadního I/O: USB periferie a monitor (HDMI z grafiky)
  kb: { x: 60, y: 40 }, mouse: { x: 60, y: 150 }, mic: { x: 60, y: 260 }, mon: { x: 40, y: 700 },
  // vpravo u 24 pinu a 8 pinů grafiky: zdroj, skříňové ventilátory; nad deskou ventilátor chladiče
  fan_case: { x: 1320, y: 60 }, psu: { x: 1320, y: 380 }, fan_cpu: { x: 700, y: -150 },
  pwr_btn: { x: 1010, y: 1230 },
};
const PROBE_IDS = ['st_cpu', 'st_gpu', 'obraz', 'st_ssd', 'rpm_cpu', 'rpm_case', 'st_kb', 'st_mouse', 'st_mic'];
PROBE_IDS.forEach((id, i) => { HW_POS[id] = { x: 1660, y: 40 + i * 92 }; });

// Vývody na desce (u, v mm, strana výstupu cesty) – konektory a místa podle manuálu
const MB_PIN_UV = {
  'PANEL PWRBTN': [168, 301, 'B'],
  '16 PS_ON#': [217, 88, 'R'], '24P +12V': [217, 94, 'R'], '24P +5V': [217, 100, 'R'], '24P +3,3V': [217, 106, 'R'],
  '24P COM': [217, 112, 'R'], '9 +5VSB': [217, 118, 'R'], '8 PWR_OK': [217, 124, 'R'],
  'EPS +12V': [34, 14, 'T'], 'EPS GND': [42, 14, 'T'],
  'VCORE': [70, 76, 'R'], 'VCCSA/VCCIO': [70, 90, 'R'], // DIGI+ VRM vlevo od patice
  'PLTRST#': [160, 212, 'L'], 'DMI 3.0 x4': [178, 196, 'T'], // čipset B360
  'VDDQ A': [188, 158, 'B'], 'VDDQ B': [169, 158, 'B'], // pod konci slotů DIMM (poloha regulátoru odhad)
  'SLOT +12V': [96, 175, 'T'], 'SLOT +3,3V': [104, 175, 'T'], 'SLOT GND': [112, 175, 'T'],
  'M.2_2 PCIe x4': [132, 229, 'L'], 'M.2_2 +3,3V': [132, 234, 'L'],
  'CPU_FAN +12V': [100, 3, 'T'], 'CPU_FAN GND': [104, 3, 'T'], 'CPU_FAN PWM': [108, 3, 'T'],
  'CHA_FAN +12V': [219, 48, 'R'], 'CHA_FAN GND': [219, 52, 'R'], 'CHA_FAN PWM': [219, 56, 'R'],
  'USB +5V': [2, 8, 'L'], 'USB DATA': [2, 14, 'L'], // KBMS_USB910 na zadním panelu
};
const frac = (uv) => Object.fromEntries(Object.entries(uv).map(([pin, [u, v, side]]) => [pin, [u / MB_W, v / MB_H, side]]));

/** Vývody v pohledu PCB jako zlomky obdélníku součástky [fx, fy, strana] (devices/myPc.js → hwPins). */
export const HW_PINS = {
  MYPC_BOARD: frac(MB_PIN_UV),
  MYPC_CPU: {
    'VCORE': [0, 0.3, 'L'], 'VCCSA/VCCIO': [0, 0.7, 'L'], 'PLTRST#': [0.85, 1, 'B'], 'DMI 3.0 x4': [0.7, 1, 'B'], 'PCIe 3.0 x16': [0.3, 1, 'B'],
    'DDR4 A CMD': [1, 0.15, 'R'], 'DDR4 B CMD': [1, 0.3, 'R'], 'DQ A1': [1, 0.45, 'R'], 'DQ A2': [1, 0.6, 'R'], 'DQ B1': [1, 0.75, 'R'], 'DQ B2': [1, 0.9, 'R'],
    'STAV': [0.5, 0, 'T'],
  },
  MYPC_DIMM: { 'CMD/ADR': [0, 0.55, 'L'], 'DQ 64 BIT': [0, 0.7, 'L'], 'VDDQ 1,2V': [0.5, 1, 'B'] },
  MYPC_GPU: {
    'SLOT +12V': [0.2, 0, 'T'], 'SLOT +3,3V': [0.24, 0, 'T'], 'SLOT GND': [0.28, 0, 'T'], 'PCIe x16': [0.4, 0, 'T'],
    '8PIN-1 1-3 +12V': [1, 0.2, 'R'], '8PIN-1 4-8 GND': [1, 0.4, 'R'], '8PIN-2 1-3 +12V': [1, 0.6, 'R'], '8PIN-2 4-8 GND': [1, 0.8, 'R'],
    'HDMI': [0, 0.5, 'L'], 'STAV': [0.6, 1, 'B'],
  },
  MYPC_SSD: { 'PCIe x4': [1, 0.7, 'R'], '+3,3V': [1, 0.9, 'R'], 'STAV': [0.5, 1, 'B'] },
};

/** Deska pro router měděných cest (pcbRoutes): obdélník desky, deska sama není překážka. */
export const myPcBoard = () => ({
  id: 'mypc', ...MB,
  inside: (x, y) => x >= MB.x && x <= MB.x + MB.w && y >= MB.y && y <= MB.y + MB.h,
  skip: (c) => c.type === 'MYPC_BOARD',
});

/** Druh desky v pohledu PCB podle součástek obvodu. */
export const boardKindOf = (comps) => (comps.some((c) => c.type === 'NV1_CORE') ? 'nv1' : comps.some((c) => c.type === 'MYPC_BOARD') ? 'mypc' : null);

/** Bod vývodu desky v mm (u, v) – pro 3D scénu. */
export const mbPinUV = (pin) => MB_PIN_UV[pin];
