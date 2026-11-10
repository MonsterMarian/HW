// MŮJ PC (i7-9700 + RTX 3060 Ti) – schéma L1 jako skutečný obvod: zapnutí tlačítkem, zdroj, napájení desky, CPU, paměti,
// grafika, SSD, ventilátory, monitor a USB periferie. Dvojklik na díl = jeho vnitřek (L2 a hlouběji).
// Konektory jsou po skupinách pinů (ATX 24 pin, EPS 8 pin, PCIe 8 pin podle norem – viz devices/pcBuild.js PIN_SOURCES).
import { HW_POS } from '../myPcLayout.js';
const c = (id, type, label, sx, sy, extra = {}) => ({ id, type, label, x: sx, y: sy, sx, sy, inputs: {}, outputs: {}, ...extra });
const w = (from, to) => {
  const [fi, ...fp] = from.split('.');
  const [ti, ...tp] = to.split('.');
  return { from: { id: fi, pin: fp.join('.') }, to: { id: ti, pin: tp.join('.') } };
};

const DIMMS = [['a1', 'A', 'DIMM_A1'], ['a2', 'A', 'DIMM_A2'], ['b1', 'B', 'DIMM_B1'], ['b2', 'B', 'DIMM_B2']];
const USB = [['kb', 'K1 ASUS ROG Strix Flare', 'mypc_keyboard'], ['mouse', 'M3 USB myš (30FA:1440)', 'mypc_mouse'], ['mic', 'MIC1 USB mikrofon (0D8C:0134)', 'mypc_mic']];
const PROBES = [['st_cpu', 'STAV CPU (POST)'], ['st_gpu', 'STAV GPU'], ['obraz', 'OBRAZ MONITORU'], ['st_ssd', 'STAV SSD'], ['rpm_cpu', 'OT/MIN CPU'], ['rpm_case', 'OT/MIN SKŘÍŇ'], ['st_kb', 'KLÁVESNICE'], ['st_mouse', 'MYŠ'], ['st_mic', 'MIKROFON']];

export const MY_PC_SYSTEM = {
  name: 'Můj PC — i7-9700 + RTX 3060 Ti (celé PC)',
  prompt: 'Schéma celého PC: zdroj, ASUS PRIME B360-PLUS, i7-9700, 4× HyperX Fury, RTX 3060 Ti, 970 EVO Plus, ventilátory, monitor, USB periferie',
  components: [
    c('pwr_btn', 'INPUT', 'TLAČÍTKO POWER (PANEL)', 40, 40, { outputs: { out: 0 } }),
    c('psu', 'MYPC_PSU', 'PS1 Endorfy Vero L5 600 W (odhad)', 40, 170, { drill: 'mypc_psu' }),
    c('mb', 'MYPC_BOARD', 'MB1 ASUS PRIME B360-PLUS', 380, 40, { drill: 'mypc_board' }),
    c('cpu', 'MYPC_CPU', 'U1 Intel Core i7-9700', 760, 40, { drill: 'cfl_die' }),
    ...DIMMS.map(([id, , slot], i) => c(id, 'MYPC_DIMM', `${slot} HyperX Fury 8 GB`, 760, 230 + i * 80, { drill: 'fury_module' })),
    c('gpu', 'MYPC_GPU', 'G1 ASUS Dual RTX 3060 Ti (PCIEX16_1)', 1100, 40, { drill: 'mypc_gpu_board' }),
    c('ssd', 'MYPC_SSD', 'SSD1 970 EVO Plus 500 GB (M.2_2)', 1100, 250, { drill: 'evo_plus_ssd' }),
    c('fan_cpu', 'MYPC_FAN', 'M1 chladič Intel E97379 (CPU_FAN)', 1100, 360, { drill: 'pwm_fan_inside', maxRpm: 2500, minRpm: 1200 }), // prodejci: 1200–2500 ot/min
    c('fan_case', 'MYPC_FAN', 'M2 4× Stratus 120 (CHA_FAN1, odhad)', 1100, 470, { drill: 'pwm_fan_inside', maxRpm: 1400, minRpm: 200 }),
    c('mon', 'MYPC_MONITOR', 'MON1 ASUS VA249HE', 1450, 40, { drill: 'va249_inside' }),
    ...USB.map(([id, label, drill], i) => c(id, 'MYPC_USB_DEV', label, 1450, 140 + i * 90, { drill })),
    ...PROBES.map(([id, label], i) => c(id, 'PROBE', label, 1760, 40 + i * 66)),
  ],
  wires: [
    // tlačítko → Super I/O desky → PS_ON# zdroje
    w('pwr_btn.out', 'mb.PANEL PWRBTN'), w('mb.16 PS_ON#', 'psu.16 PS_ON#'),
    // ATX 24 pin + EPS 8 pin
    ...['24P +12V', '24P +5V', '24P +3,3V', '24P COM', '9 +5VSB', '8 PWR_OK'].map((p) => w(`psu.${p}`, `mb.${p}`)),
    w('psu.EPS 5-8 +12V', 'mb.EPS +12V'), w('psu.EPS 1-4 GND', 'mb.EPS GND'),
    // 2× PCIe 8 pin do grafiky
    w('psu.PCIe1 1-3 +12V', 'gpu.8PIN-1 1-3 +12V'), w('psu.PCIe1 4-8 GND', 'gpu.8PIN-1 4-8 GND'),
    w('psu.PCIe2 1-3 +12V', 'gpu.8PIN-2 1-3 +12V'), w('psu.PCIe2 4-8 GND', 'gpu.8PIN-2 4-8 GND'),
    // VRM desky → CPU, paměti
    w('mb.VCORE', 'cpu.VCORE'), w('mb.VCCSA/VCCIO', 'cpu.VCCSA/VCCIO'), w('mb.PLTRST#', 'cpu.PLTRST#'),
    ...DIMMS.flatMap(([id, ch]) => [w(`mb.VDDQ ${ch}`, `${id}.VDDQ 1,2V`), w(`cpu.DDR4 ${ch} CMD`, `${id}.CMD/ADR`), w(`${id}.DQ 64 BIT`, `cpu.DQ ${id.toUpperCase()}`)]),
    // CPU ↔ PCH, CPU → grafika, PCH → SSD
    w('cpu.DMI 3.0 x4', 'mb.DMI 3.0 x4'), w('cpu.PCIe 3.0 x16', 'gpu.PCIe x16'),
    w('mb.SLOT +12V', 'gpu.SLOT +12V'), w('mb.SLOT +3,3V', 'gpu.SLOT +3,3V'), w('mb.SLOT GND', 'gpu.SLOT GND'),
    w('mb.M.2_2 PCIe x4', 'ssd.PCIe x4'), w('mb.M.2_2 +3,3V', 'ssd.+3,3V'),
    // ventilátory
    w('mb.CPU_FAN +12V', 'fan_cpu.2 +12V'), w('mb.CPU_FAN GND', 'fan_cpu.1 GND'), w('mb.CPU_FAN PWM', 'fan_cpu.4 PWM'),
    w('mb.CHA_FAN +12V', 'fan_case.2 +12V'), w('mb.CHA_FAN GND', 'fan_case.1 GND'), w('mb.CHA_FAN PWM', 'fan_case.4 PWM'),
    // monitor a USB
    w('gpu.HDMI', 'mon.HDMI'),
    ...USB.flatMap(([id]) => [w('mb.USB +5V', `${id}.VBUS +5V`), w('mb.USB DATA', `${id}.D+/D−`)]),
    // ukazatele
    w('cpu.STAV', 'st_cpu.in'), w('gpu.STAV', 'st_gpu.in'), w('mon.OBRAZ', 'obraz.in'), w('ssd.STAV', 'st_ssd.in'),
    w('fan_cpu.3 OT/MIN', 'rpm_cpu.in'), w('fan_case.3 OT/MIN', 'rpm_case.in'),
    w('kb.STAV', 'st_kb.in'), w('mouse.STAV', 'st_mouse.in'), w('mic.STAV', 'st_mic.in'),
  ],
};

// pohled PCB: x/y = poloha na desce B360-PLUS 1 : 1 (sx/sy zůstává pro schéma); spínač a ukazatele jsou mimo desku
for (const comp of MY_PC_SYSTEM.components) {
  Object.assign(comp, HW_POS[comp.id]);
  if (comp.type === 'INPUT' || comp.type === 'PROBE') comp.offBoard = true;
}
