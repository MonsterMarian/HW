// AI PC (Dell T5810 + 2× Tesla P100, sestava z videa Junk GPU Lab) – schéma napájení jako skutečný obvod.
// Vypínač Dellu → vestavěný zdroj → SATA 12 V → Add2PSU (relé) → PS_ON# druhého zdroje → 4 PCIe kabely →
// 2× redukce 030-0571-000 → EPS12V obou P100; druhý zdroj napájí přes SATA regulátor TD404 dva ventilátory 9733.
// Konektory po skupinách pinů (L1); pin po pinu je redukce rozkreslená o úroveň níž (dvojklik).
const c = (id, type, label, sx, sy, extra = {}) => ({ id, type, label, x: sx, y: sy, sx, sy, inputs: {}, outputs: {}, ...extra });
const w = (fromId, fromPin, toId, toPin) => ({ from: { id: fromId, pin: fromPin }, to: { id: toId, pin: toPin } });

export const PC_POWER = {
  name: 'AI PC — napájení: Dell T5810 + 2× Tesla P100',
  prompt: 'Napájecí cesta AI PC: Dell T5810, Add2PSU, druhý ATX zdroj, redukce 030-0571-000, 2× Tesla P100, regulátor TD404, 2× ventilátor 9733',
  components: [
    c('pwr_btn', 'INPUT', 'VYPÍNAČ DELLU', 40, 70, { outputs: { out: 0 } }),
    c('dell', 'DELL_T5810', 'PC1 Dell Precision T5810', 190, 40, { drill: 't5810_platform' }),
    c('add2psu', 'ADD2PSU', 'A1 Add2PSU', 520, 40, { drill: 'add2psu_inside' }),
    c('psu2', 'ATX_PSU', 'PS2 Seasonic Core GX-650 ATX 3', 520, 220, { drill: 'atx_psu_inside' }),
    c('eps1', 'EPS_ADAPTER', 'W1 030-0571-000', 860, 150, { drill: 'eps_adapter_wiring' }),
    c('eps2', 'EPS_ADAPTER', 'W2 030-0571-000', 860, 330, { drill: 'eps_adapter_wiring' }),
    c('gpu1', 'TESLA_P100', 'G1 Tesla P100 (slot 2)', 1180, 120, { drill: 'p100_board' }),
    c('gpu2', 'TESLA_P100', 'G2 Tesla P100 (slot 4)', 1180, 320, { drill: 'p100_board' }),
    c('hub', 'PWM_HUB', 'U1 TD404 regulátor', 860, 520, { knob: 70, drill: 'pwm_hub_inside' }),
    c('fan1', 'BLOWER_9733', 'M1 9733 (karta G1)', 1180, 520),
    c('fan2', 'BLOWER_9733', 'M2 9733 (karta G2)', 1180, 680),
    c('st1', 'PROBE', 'STAV G1', 1480, 160),
    c('st2', 'PROBE', 'STAV G2', 1480, 360),
    c('rpm1', 'PROBE', 'OT/MIN M1', 1480, 560),
    c('rpm2', 'PROBE', 'OT/MIN M2', 1480, 720),
  ],
  wires: [
    w('pwr_btn', 'out', 'dell', 'POWER'),
    // první zdroj (Dell) → Add2PSU → PS_ON# druhého zdroje
    w('dell', 'SATA13 +12V', 'add2psu', 'SATA +12V'),
    w('dell', 'SATA4 GND', 'add2psu', 'SATA GND'),
    w('add2psu', '16 PS_ON#', 'psu2', '16 PS_ON#'),
    w('psu2', '15 COM', 'add2psu', '15 COM'),
    // 4 PCIe kabely → 2 redukce → EPS12V karet
    w('psu2', 'A1-3 +12V', 'eps1', 'P1 1-3 +12V'), w('psu2', 'A4-8 GND', 'eps1', 'P1 4-8 GND'),
    w('psu2', 'B1-3 +12V', 'eps1', 'P2 1-3 +12V'), w('psu2', 'B4-8 GND', 'eps1', 'P2 4-8 GND'),
    w('psu2', 'C1-3 +12V', 'eps2', 'P1 1-3 +12V'), w('psu2', 'C4-8 GND', 'eps2', 'P1 4-8 GND'),
    w('psu2', 'D1-3 +12V', 'eps2', 'P2 1-3 +12V'), w('psu2', 'D4-8 GND', 'eps2', 'P2 4-8 GND'),
    w('eps1', 'EPS5-8 +12V', 'gpu1', 'EPS5-8 +12V'), w('eps1', 'EPS1-4 GND', 'gpu1', 'EPS1-4 GND'),
    w('eps2', 'EPS5-8 +12V', 'gpu2', 'EPS5-8 +12V'), w('eps2', 'EPS1-4 GND', 'gpu2', 'EPS1-4 GND'),
    // sloty PCIe x16 z CPU a zem slotu (deska Dellu)
    w('dell', 'SLOT2 PCIe x16', 'gpu1', 'PCIe x16'), w('dell', 'SLOT4 PCIe x16', 'gpu2', 'PCIe x16'),
    w('dell', 'SLOT GND', 'gpu1', 'SLOT GND'), w('dell', 'SLOT GND', 'gpu2', 'SLOT GND'),
    // ventilátory z druhého zdroje přes SATA regulátor (ne z proprietárních konektorů desky Dellu)
    w('psu2', 'SATA13 +12V', 'hub', 'SATA13 +12V'), w('psu2', 'SATA4 GND', 'hub', 'SATA4 GND'),
    w('hub', 'F1-2 +12V', 'fan1', '2 +12V'), w('hub', 'F1-1 GND', 'fan1', '1 GND'), w('hub', 'F1-4 PWM', 'fan1', '4 PWM'),
    w('hub', 'F2-2 +12V', 'fan2', '2 +12V'), w('hub', 'F2-1 GND', 'fan2', '1 GND'), w('hub', 'F2-4 PWM', 'fan2', '4 PWM'),
    // ukazatele
    w('gpu1', 'STAV', 'st1', 'in'), w('gpu2', 'STAV', 'st2', 'in'),
    w('fan1', '3 OT/MIN', 'rpm1', 'in'), w('fan2', '3 OT/MIN', 'rpm2', 'in'),
  ],
};
