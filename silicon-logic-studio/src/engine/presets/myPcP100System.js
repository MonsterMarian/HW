// MŮJ PC + 2× TESLA P100 – kopie mého PC (MY_PC_SYSTEM), do kterého jsou přesazené obě karty z AI PC.
// Návrh zapojení:
// - RTX 3060 Ti ven: dvě dvouslotové P100 zaberou oba sloty x16 a zdroj 600 W by tři karty neutáhl.
// - P100 #1 v PCIEX16_1 (PCIe 3.0 x16 z CPU), P100 #2 v PCIEX16_2 (mechanicky x16, elektricky x4 z PCH, sdílí DMI 3.0 x4 s SSD).
//   Rozestup slotů 60,8 mm (v 182,8 → 243,6) = 3 pozice, dvouslotová karta (37 mm) se vejde a zakryje PCIEX1_2 a PCI1.
// - Obraz: P100 nemá video výstup → monitor na HDMI desky z iGPU UHD 630 (i7-9700 ji má; v BIOSu Primary Display = iGPU).
// - Napájení: P100 bere EPS 8 pin. Karta #1 z PCIe 6+2 kabelů vlastního zdroje přes redukci W1 (PCIe kabely uvolnila
//   RTX 3060 Ti). Karta #2 z druhého zdroje Seasonic GX-650 přes W2; ten zapíná Add2PSU ze SATA prvního zdroje.
//   Odhad příkonu zdroje 1: i7-9700 65 W + deska/RAM/SSD/ventilátory ~60 W + P100 250 W (limit 150 W jako v AI PC) ≈ 375 W z 600 W.
// - Chlazení: pasivní P100 potřebují shroud + radiální 9733; ventilátory z regulátoru TD404 na SATA druhého zdroje (2 × 1,8 A
//   na hlavičky desky nepatří).
import { MY_PC_SYSTEM } from './myPcSystem.js';
import { at } from '../myPcLayout.js';

// pohled PCB: karty ve slotech 1 : 1 (u od zadního plechu, v od horní hrany), ostatní mimo desku pod ní (ne v měřítku)
const HW = {
  p100a: at(0, 182.8 - 3), p100b: at(0, 243.6 - 3),
  add2psu: { x: 420, y: 1360 }, psu2: { x: 600, y: 1360 }, eps1: { x: 870, y: 1360 }, eps2: { x: 1050, y: 1360 },
  hub: { x: 1230, y: 1360 }, bl1: { x: 1420, y: 1360 }, bl2: { x: 1420, y: 1470 },
  st_p100a: { x: 1660, y: 868 }, st_p100b: { x: 1660, y: 960 }, rpm_bl1: { x: 1660, y: 1052 }, rpm_bl2: { x: 1660, y: 1144 },
};
const c = (id, type, label, sx, sy, extra = {}) => ({ id, type, label, sx, sy, ...HW[id], inputs: {}, outputs: {}, ...(HW[id] && !/^p100/.test(id) ? { offBoard: true } : {}), ...extra });
const w = (from, to) => {
  const [fi, ...fp] = from.split('.');
  const [ti, ...tp] = to.split('.');
  return { from: { id: fi, pin: fp.join('.') }, to: { id: ti, pin: tp.join('.') } };
};

const DROP = new Set(['gpu', 'st_gpu']); // RTX 3060 Ti a její ukazatel
const keep = MY_PC_SYSTEM.components.filter((comp) => !DROP.has(comp.id)).map((comp) => structuredClone(comp)); // i s polohami PCB
const PROBES = [['st_p100a', 'STAV P100 #1'], ['st_p100b', 'STAV P100 #2'], ['rpm_bl1', 'OT/MIN 9733 #1'], ['rpm_bl2', 'OT/MIN 9733 #2']];

export const MY_PC_P100_SYSTEM = {
  name: 'Můj PC + 2× Tesla P100 (návrh)',
  prompt: 'Můj PC bez RTX 3060 Ti, se dvěma Tesla P100 z AI PC: PCIEX16_1 x16 + PCIEX16_2 x4, obraz z iGPU, druhý zdroj přes Add2PSU',
  components: [
    ...keep.map((comp) => (comp.id === 'mon' ? { ...comp, label: 'MON1 ASUS VA249HE (HDMI desky, iGPU)' } : comp)),
    c('eps1', 'EPS_ADAPTER', 'W1 030-0571-000 (zdroj 1)', 1100, 590, { drill: 'eps_adapter_wiring' }),
    c('p100a', 'TESLA_P100', 'G1 Tesla P100 (PCIEX16_1, x16 z CPU)', 1100, 40, { drill: 'p100_board' }),
    c('p100b', 'TESLA_P100', 'G2 Tesla P100 (PCIEX16_2, x4 z PCH)', 1100, 140, { drill: 'p100_board' }),
    c('add2psu', 'ADD2PSU', 'A1 Add2PSU', 40, 420, { drill: 'add2psu_inside' }),
    c('psu2', 'ATX_PSU', 'PS2 Seasonic Core GX-650', 40, 560, { drill: 'atx_psu_inside' }),
    c('eps2', 'EPS_ADAPTER', 'W2 030-0571-000 (zdroj 2)', 380, 600, { drill: 'eps_adapter_wiring' }),
    c('hub', 'PWM_HUB', 'U2 TD404 regulátor', 380, 760, { knob: 70, drill: 'pwm_hub_inside' }),
    c('bl1', 'BLOWER_9733', 'M3 9733 (shroud G1)', 760, 640),
    c('bl2', 'BLOWER_9733', 'M4 9733 (shroud G2)', 760, 780),
    ...PROBES.map(([id, label], i) => c(id, 'PROBE', label, 1760, 640 + i * 66)),
  ],
  wires: [
    ...MY_PC_SYSTEM.wires.filter((wr) => !DROP.has(wr.from.id) && !DROP.has(wr.to.id)),
    // obraz z iGPU
    w('mb.HDMI (iGPU)', 'mon.HDMI'),
    // P100 #1: PCIe 6+2 kabely zdroje 1 → redukce → EPS 8 pin karty; linky x16 z CPU
    w('psu.PCIe1 1-3 +12V', 'eps1.P1 1-3 +12V'), w('psu.PCIe1 4-8 GND', 'eps1.P1 4-8 GND'),
    w('psu.PCIe2 1-3 +12V', 'eps1.P2 1-3 +12V'), w('psu.PCIe2 4-8 GND', 'eps1.P2 4-8 GND'),
    w('eps1.EPS5-8 +12V', 'p100a.EPS5-8 +12V'), w('eps1.EPS1-4 GND', 'p100a.EPS1-4 GND'),
    w('cpu.PCIe 3.0 x16', 'p100a.PCIe x16'), w('mb.SLOT GND', 'p100a.SLOT GND'),
    // P100 #2: druhý zdroj, zapnutý přes Add2PSU ze SATA zdroje 1; linky x4 z PCH
    w('psu.SATA13 +12V', 'add2psu.SATA +12V'), w('psu.SATA4 GND', 'add2psu.SATA GND'),
    w('add2psu.16 PS_ON#', 'psu2.16 PS_ON#'), w('psu2.15 COM', 'add2psu.15 COM'),
    w('psu2.A1-3 +12V', 'eps2.P1 1-3 +12V'), w('psu2.A4-8 GND', 'eps2.P1 4-8 GND'),
    w('psu2.B1-3 +12V', 'eps2.P2 1-3 +12V'), w('psu2.B4-8 GND', 'eps2.P2 4-8 GND'),
    w('eps2.EPS5-8 +12V', 'p100b.EPS5-8 +12V'), w('eps2.EPS1-4 GND', 'p100b.EPS1-4 GND'),
    w('mb.PCIEX16_2 PCIe x4', 'p100b.PCIe x16'), w('mb.SLOT GND', 'p100b.SLOT GND'),
    // chlazení: TD404 ze SATA zdroje 2 → 2× 9733
    w('psu2.SATA13 +12V', 'hub.SATA13 +12V'), w('psu2.SATA4 GND', 'hub.SATA4 GND'),
    w('hub.F1-2 +12V', 'bl1.2 +12V'), w('hub.F1-1 GND', 'bl1.1 GND'), w('hub.F1-4 PWM', 'bl1.4 PWM'),
    w('hub.F2-2 +12V', 'bl2.2 +12V'), w('hub.F2-1 GND', 'bl2.1 GND'), w('hub.F2-4 PWM', 'bl2.4 PWM'),
    // ukazatele
    w('p100a.STAV', 'st_p100a.in'), w('p100b.STAV', 'st_p100b.in'), w('bl1.3 OT/MIN', 'rpm_bl1.in'), w('bl2.3 OT/MIN', 'rpm_bl2.in'),
  ],
};
