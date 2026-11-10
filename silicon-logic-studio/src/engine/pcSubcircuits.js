// Úroveň 2 projektu AI PC: co je uvnitř dílů ze schématu napájení (dvojklik).
// Podle veřejných podkladů: výkres NVIDIA 030-0571-000 (PB-08248 obr. 4), Intel ATX 3.0 DG, Intel 4-Wire PWM Fan spec,
// patent Add2PSU US8878390, NVIDIA PB-08248 + Pascal whitepaper, Dell T5810 Owner's Manual + datasheet.
// Co veřejně doložené není, má v popisku "neověřeno".
const Z = 'Z';
const c = (id, type, label, x, y, extra = {}) => ({ id, type, label, x, y, inputs: {}, outputs: {}, ...extra });
const pins = (names) => Object.fromEntries(names.map((n) => [n, Z]));
// popisný blok z veřejného blokového schématu (PC_BLOCK): w/h = skutečná velikost ve schématu
const blk = (id, label, x, y, ins, outs, note, w = 190, h = 90) => c(id, 'PC_BLOCK', label, x, y, { inputs: pins(ins), outputs: pins(outs), note, w, h });
const w = (from, to) => {
  const [fi, ...fp] = from.split('.');
  const [ti, ...tp] = to.split('.');
  return { from: { id: fi, pin: fp.join('.') }, to: { id: ti, pin: tp.join('.') } };
};

export const PC_SUBCIRCUITS = {};
const def = (key, sub) => { PC_SUBCIRCUITS[key] = { key, level: 2, ...sub }; };

// ---------------------------------------------------------------- redukce NVIDIA 030-0571-000, pin po pinu
def('eps_adapter_wiring', {
  name: 'NVIDIA 030-0571-000 — 2× PCIe 8 pin → EPS 8 pin',
  subtitle: 'Výkres NVIDIA PB-08248 obr. 4. P2/P3 = PCIe ze zdroje, P1 = EPS do karty. +12 V z pinů 1–3 jde na EPS 5–8; zem 5–8 a Sense na EPS 1–4. Pozor: PCIe kabel přímo do EPS = +12 V na zem karty.',
  components: [
    c('p2', 'CONN_PCIE8', 'P2 PCIe 8 pin (kabel zdroje 1)', 60, 50),
    c('p3', 'CONN_PCIE8', 'P3 PCIe 8 pin (kabel zdroje 2)', 60, 330),
    c('p1', 'CONN_EPS8', 'P1 EPS12V 8 pin (do P100)', 660, 190),
  ],
  wires: [
    w('p2.5 GND', 'p1.1 GND'), w('p2.6 SENSE0', 'p1.1 GND'),
    w('p2.7 GND', 'p1.2 GND'), w('p2.8 GND', 'p1.2 GND'), w('p2.4 SENSE1', 'p1.2 GND'),
    w('p3.5 GND', 'p1.3 GND'), w('p3.6 SENSE0', 'p1.3 GND'),
    w('p3.7 GND', 'p1.4 GND'), w('p3.8 GND', 'p1.4 GND'), w('p3.4 SENSE1', 'p1.4 GND'),
    w('p2.1 +12V', 'p1.5 +12V'), w('p2.2 +12V', 'p1.5 +12V'), w('p2.3 +12V', 'p1.6 +12V'),
    w('p3.1 +12V', 'p1.7 +12V'), w('p3.2 +12V', 'p1.7 +12V'), w('p3.3 +12V', 'p1.8 +12V'),
  ],
});

// ---------------------------------------------------------------- Add2PSU: relé spíná PS_ON# druhého zdroje
def('add2psu_inside', {
  name: 'Add2PSU — synchronní zapnutí druhého zdroje',
  subtitle: 'Patent US8878390: 12 V z prvního zdroje (Molex/SATA) na cívku relé; kontakt spojí PS_ON# (pin 16) druhého zdroje s COM (15). Relé GB-1C12L podle recenze, dioda neověřena.',
  components: [
    c('v12', 'INPUT', 'SATA/Molex +12 V (zdroj 1)', 50, 60, { outputs: { out: 0 } }),
    c('g1', 'GND', 'GND zdroje 1', 60, 220),
    c('k1', 'RELAY', 'K1 relé 12 V', 330, 50),
    c('d1', 'DIODE', 'D1 nulová dioda', 330, 230),
    c('g2', 'GND', 'COM zdroje 2', 360, 390),
    c('j1', 'CONN_ATX24', 'J1 ATX 24 pin (zdroj 2)', 640, 140),
    c('pr', 'PROBE', 'PS_ON# (0 = zdroj 2 běží)', 680, 400),
  ],
  wires: [
    w('v12.out', 'k1.A1 cívka +'), w('g1.out', 'k1.A2 cívka −'),
    w('d1.K', 'k1.A1 cívka +'), w('d1.A', 'k1.A2 cívka −'),
    w('g2.out', 'k1.COM'), w('g2.out', 'j1.15 COM'),
    w('k1.NO', 'j1.16 PS_ON#'), w('j1.16 PS_ON#', 'pr.in'),
  ],
});

// ---------------------------------------------------------------- ModDIY TD404: SATA → 4× ventilátor
def('pwm_hub_inside', {
  name: 'ModDIY TD404 — PWM rozbočovač s knoflíkem',
  subtitle: 'Vstup SATA 12 V, 4× ventilátor 4 pin, max. 60 W (ModDIY). +12 V přímo na pin 2, PWM 25 kHz na pin 4 podle knoflíku. Čip generátoru, vedení 12 V a tacho jsou neověřené.',
  components: [
    c('sata', 'CONN_SATA', 'J1 SATA napájení (zdroj 2)', 50, 60),
    blk('gen', 'GENERÁTOR PWM 25 kHz + KNOFLÍK', 320, 210, ['12V', 'GND'], ['PWM'], 'OBVOD NEOVĚŘEN (555 NEBO MCU)', 200, 100),
    ...[0, 1, 2, 3].map((i) => c(`f${i + 1}`, 'CONN_FAN4', `J${i + 2} ventilátor ${i + 1}`, 660, 40 + i * 124)),
  ],
  wires: [
    w('sata.13-15 +12V', 'gen.12V'), w('sata.4-6,10,12 GND', 'gen.GND'),
    ...[1, 2, 3, 4].flatMap((i) => [w('sata.13-15 +12V', `f${i}.2 +12V`), w('sata.4-6,10,12 GND', `f${i}.1 GND`), w('gen.PWM', `f${i}.4 PWM`)]),
  ],
});

// ---------------------------------------------------------------- ATX zdroj: obecná topologie
def('atx_psu_inside', {
  name: 'ATX zdroj 650 W 80+ Gold — bloky',
  subtitle: 'Obecná topologie moderního zdroje s DC-DC (Seasonic schéma Core GX-650 nezveřejňuje – rozdělení bloků neověřeno). PS_ON# a PWR_OK podle Intel ATX 3.0 DG.',
  components: [
    blk('emi', 'AC VSTUP + EMI FILTR', 50, 50, ['230 V AC'], ['AC'], 'IEC C14, POJISTKA'),
    blk('pfc', 'USMĚRŇOVAČ + AKTIVNÍ PFC', 290, 50, ['AC'], ['~380 V DC'], 'BULK KONDENZÁTOR'),
    blk('main', 'HLAVNÍ MĚNIČ + TRANSFORMÁTOR', 530, 50, ['~380 V DC', 'ŘÍZENÍ'], ['12 V'], 'TOPOLOGIE NEOVĚŘENA'),
    blk('sr', 'SYNCHRONNÍ USMĚRNĚNÍ +12 V', 770, 50, ['12 V'], ['+12V'], 'MOSFETY NA SEKUNDÁRU', 170, 90),
    blk('dcdc', 'DC-DC 12 → 5 V / 3,3 V', 770, 200, ['+12V'], ['+5V', '+3,3V'], 'DVA BUCK MĚNIČE', 170, 100),
    blk('sb', 'POHOTOVOSTNÍ ZDROJ +5VSB', 290, 230, ['~380 V DC'], ['+5VSB'], 'BĚŽÍ I VE VYPNUTÉM STAVU'),
    blk('sup', 'SUPERVIZOR (PS_ON#, PWR_OK, OCHRANY)', 530, 230, ['PS_ON#', '+5VSB'], ['ŘÍZENÍ', 'PWR_OK'], 'PS_ON# = 0 → ZAPNOUT', 200, 100),
    blk('mod', 'MODULÁRNÍ PANEL', 530, 400, ['+12V', '+5V', '+3,3V', 'PWR_OK'], ['24 PIN', '2× CPU 8 PIN', '4× PCIe 8 PIN', 'SATA/MOLEX'], '24 PIN, CPU, PCIe, SATA, MOLEX', 220, 130),
  ],
  wires: [
    w('emi.AC', 'pfc.AC'), w('pfc.~380 V DC', 'main.~380 V DC'), w('pfc.~380 V DC', 'sb.~380 V DC'),
    w('main.12 V', 'sr.12 V'), w('sr.+12V', 'dcdc.+12V'), w('sr.+12V', 'mod.+12V'),
    w('dcdc.+5V', 'mod.+5V'), w('dcdc.+3,3V', 'mod.+3,3V'),
    w('sb.+5VSB', 'sup.+5VSB'), w('sup.ŘÍZENÍ', 'main.ŘÍZENÍ'), w('sup.PWR_OK', 'mod.PWR_OK'),
  ],
});

// ---------------------------------------------------------------- deska Tesla P100 PCIe
def('p100_board', {
  name: 'NVIDIA Tesla P100 PCIe 16 GB — bloky desky',
  subtitle: 'NVIDIA PB-08248 + Pascal whitepaper: GP100 (16 nm, 15,3 mld. tranzistorů, 610 mm², 56 SM / 3584 jader) a 4× HBM2 na interposeru CoWoS, 4096 bit, 732 GB/s. Napájení 250 W. Rozdělení VRM není veřejné.',
  components: [
    blk('eps', 'EPS12V 8 PIN', 50, 50, [], ['+12V 240 W'], '240 W / 20 A', 170, 80),
    blk('edge', 'PCIe 3.0 x16 HRANA', 50, 300, [], ['+12V 66 W', '+3,3V 10 W', 'PCIe x16'], 'SLOT: 12 V 5,5 A, 3,3 V 3 A', 190, 110),
    blk('vrm', 'NAPÁJECÍ VRM', 300, 140, ['+12V 240 W', '+12V 66 W', '+3,3V 10 W'], ['VDD GPU', 'VDD HBM2'], 'ROZDĚLENÍ NEVEŘEJNÉ', 170, 110),
    blk('gpu', 'GP100 (56 SM, 3584 JADER)', 540, 200, ['VDD GPU', 'PCIe x16'], ['HBM0', 'HBM1', 'HBM2', 'HBM3'], 'BASE 1189 / BOOST 1328 MHz', 190, 130),
    ...[0, 1, 2, 3].map((i) => blk(`hbm${i}`, `HBM2 STACK ${i} · 4 GB`, 790, 40 + i * 120, ['2× 512 BIT', 'VDD'], [], '1024 BIT, CoWoS', 150, 90)),
  ],
  wires: [
    w('eps.+12V 240 W', 'vrm.+12V 240 W'), w('edge.+12V 66 W', 'vrm.+12V 66 W'), w('edge.+3,3V 10 W', 'vrm.+3,3V 10 W'),
    w('vrm.VDD GPU', 'gpu.VDD GPU'), w('edge.PCIe x16', 'gpu.PCIe x16'),
    ...[0, 1, 2, 3].flatMap((i) => [w(`gpu.HBM${i}`, `hbm${i}.2× 512 BIT`), w('vrm.VDD HBM2', `hbm${i}.VDD`)]),
  ],
});

// ---------------------------------------------------------------- platforma Dell T5810
def('t5810_platform', {
  name: 'Dell Precision T5810 — platforma (CPU, C612, sloty)',
  subtitle: 'Owner\'s Manual + datasheet: Xeon E5-1650 v3 má 40 linek PCIe 3.0 (sloty 1, 2, 4), C612 dává PCIe 2.0 (sloty 3, 5) a DMI 2.0. P100 patří do slotů 2 a 4. Původ linek odvozen (8 + 16 + 16 = 40), pořadí slotů neověřeno.',
  components: [
    blk('cpu', 'XEON E5-1650 v3 (LGA 2011-3)', 330, 40, ['DDR4'], ['PCIe 3.0 x8', 'PCIe 3.0 x16 A', 'PCIe 3.0 x16 B', 'DMI 2.0'], '6 JADER, 40× PCIe 3.0', 200, 130),
    blk('mem', 'DDR4 ECC RDIMM · 4 KANÁLY', 50, 50, [], ['DDR4'], '8 DIMM, AŽ 256 GB', 190, 80),
    blk('pch', 'INTEL C612 (PCH)', 330, 330, ['DMI 2.0'], ['PCIe 2.0 x1', 'PCIe 2.0 x4', 'PCI', 'SATA/USB'], 'DMI 2.0 5 GT/s, PCIe 2.0 MAX 8 LINEK', 200, 130),
    blk('s1', 'SLOT 1 · x16 MECH, x8 Gen3', 640, 40, ['PCIe 3.0 x8'], [], 'Z CPU', 180, 70),
    blk('s2', 'SLOT 2 · x16 Gen3 → P100 G1', 640, 120, ['PCIe 3.0 x16 A'], [], 'Z CPU', 180, 70),
    blk('s4', 'SLOT 4 · x16 Gen3 → P100 G2', 640, 200, ['PCIe 3.0 x16 B'], [], 'Z CPU', 180, 70),
    blk('s3', 'SLOT 3 · x1 Gen2', 640, 300, ['PCIe 2.0 x1'], [], 'Z PCH', 180, 60),
    blk('s5', 'SLOT 5 · x16 MECH, x4 Gen2', 640, 370, ['PCIe 2.0 x4'], [], 'Z PCH', 180, 60),
    blk('s6', 'SLOT 6 · PCI 32 BIT', 640, 440, ['PCI'], [], 'MOST NEOVĚŘEN', 180, 60),
    blk('io', 'SATA · USB · LAN · BIOS', 50, 380, ['SATA/USB'], [], 'Z PCH', 190, 80),
  ],
  wires: [
    w('mem.DDR4', 'cpu.DDR4'),
    w('cpu.PCIe 3.0 x8', 's1.PCIe 3.0 x8'), w('cpu.PCIe 3.0 x16 A', 's2.PCIe 3.0 x16 A'), w('cpu.PCIe 3.0 x16 B', 's4.PCIe 3.0 x16 B'),
    w('cpu.DMI 2.0', 'pch.DMI 2.0'),
    w('pch.PCIe 2.0 x1', 's3.PCIe 2.0 x1'), w('pch.PCIe 2.0 x4', 's5.PCIe 2.0 x4'), w('pch.PCI', 's6.PCI'), w('pch.SATA/USB', 'io.SATA/USB'),
  ],
});
