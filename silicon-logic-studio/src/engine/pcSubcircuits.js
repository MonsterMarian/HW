// Úroveň 2 projektu AI PC: co je uvnitř dílů ze schématu napájení (dvojklik).
// Podle veřejných podkladů: výkres NVIDIA 030-0571-000 (PB-08248 obr. 4), Intel ATX 3.0 DG, Intel 4-Wire PWM Fan spec,
// patent Add2PSU US8878390, NVIDIA PB-08248 + Pascal whitepaper, Dell T5810 Owner's Manual + datasheet.
// Co veřejně doložené není, má v popisku "neověřeno".
const Z = 'Z';
const c = (id, type, label, x, y, extra = {}) => ({ id, type, label, x, y, inputs: {}, outputs: {}, ...extra });
const pins = (names) => Object.fromEntries(names.map((n) => [n, Z]));
// popisný blok z veřejného blokového schématu (PC_BLOCK): w/h = skutečná velikost ve schématu
const blk = (id, label, x, y, ins, outs, note, w = 190, h = 90, extra = {}) => c(id, 'PC_BLOCK', label, x, y, { inputs: pins(ins), outputs: pins(outs), note, w, h, ...extra });
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
  subtitle: 'Výkres NVIDIA PB-08248 obr. 4. P2/P3 = PCIe ze zdroje, P1 = EPS do karty. +12 V z pinů 1–3 jde na EPS 5–8; zem 5–8 a Sense na EPS 1–4. Pozor: PCIe kabel přímo do EPS = +12 V na zem karty. Kabel 6 pin (Dell) obsadí pozice 1–3 a 5–7 – odvozeno, PB-08248 tab. 8 2× 6 pin povoluje.',
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
  subtitle: 'Patent US8878390 + recenze LegitReviews: na desce je jediné relé Golden GB-1C12L, spouštění 4pin Molexem z prvního zdroje, 24pin do druhého. Že kontakt spíná pin 16 PS_ON# na COM, je odvozené z ATX specifikace.',
  components: [
    c('v12', 'INPUT', 'Molex pin 1 +12 V (zdroj 1)', 50, 60, { outputs: { out: 0 } }),
    c('g1', 'GND', 'Molex pin 2 GND (zdroj 1)', 60, 240),
    c('k1', 'RELAY', 'K1 Golden GB-1C12L', 330, 50),
    c('g2', 'GND', 'COM zdroje 2', 360, 390),
    c('j1', 'CONN_ATX24', 'J1 ATX 24 pin (zdroj 2)', 640, 140),
    c('pr', 'PROBE', 'PS_ON# (0 = zdroj 2 běží)', 680, 400),
  ],
  wires: [
    w('v12.out', 'k1.A1 cívka +'), w('g1.out', 'k1.A2 cívka −'),
    w('g2.out', 'k1.COM'), w('g2.out', 'j1.15 COM'),
    w('k1.NO', 'j1.16 PS_ON#'), w('j1.16 PS_ON#', 'pr.in'),
  ],
});

// ---------------------------------------------------------------- ModDIY TD404: SATA → 4× ventilátor
def('pwm_hub_inside', {
  name: 'ModDIY TD404 (deska FAN-K02) — PWM rozbočovač s knoflíkem',
  subtitle: 'Foto desky ModDIY: U1 SOIC-8, D1/D2, potenciometr, C1–C4, U2 (SOT-89, nejspíš regulátor), LED, 4× ventilátor. Zapojení odpovídá astabilnímu 555 se střídou přes 2 diody – typ U1 a kmitočet neověřené. Vstup PWM z desky nemá.',
  components: [
    c('sata', 'CONN_SATA', 'J1 SATA napájení (zdroj 2)', 50, 60),
    blk('u2', 'U2 REGULÁTOR (SOT-89)', 50, 280, ['12V', 'GND'], ['VCC'], 'NAPÁJENÍ U1 – TYP NEOVĚŘEN', 190, 90),
    blk('u1', 'U1 SOIC-8 · ASTABILNÍ 555 (ODHAD)', 320, 200, ['VCC', 'GND', 'R1/R2 + POT + D1/D2'], ['OUT'], 'STŘÍDA = NABÍJENÍ/VYBÍJENÍ PŘES D1, D2', 220, 110),
    blk('pot', 'POTENCIOMETR (KNOFLÍK) + D1, D2', 320, 380, [], ['R1/R2 + POT + D1/D2'], 'DĚLÍ ODPOR MEZI NABÍJENÍ A VYBÍJENÍ', 220, 90),
    ...[0, 1, 2, 3].map((i) => c(`f${i + 1}`, 'CONN_FAN4', `FAN${i + 1} ventilátor ${i + 1}`, 660, 40 + i * 124)),
  ],
  wires: [
    w('sata.13-15 +12V', 'u2.12V'), w('sata.4-6,10,12 GND', 'u2.GND'), w('u2.VCC', 'u1.VCC'), w('sata.4-6,10,12 GND', 'u1.GND'),
    w('pot.R1/R2 + POT + D1/D2', 'u1.R1/R2 + POT + D1/D2'),
    ...[1, 2, 3, 4].flatMap((i) => [w('sata.13-15 +12V', `f${i}.2 +12V`), w('sata.4-6,10,12 GND', `f${i}.1 GND`), w('u1.OUT', `f${i}.4 PWM`)]),
  ],
});

// ---------------------------------------------------------------- ATX zdroj: obecná topologie
const SIB = 'DÍL PODLE SOUROZENCE GX-750 ATX3 (CYBENETICS)';
def('atx_psu_inside', {
  name: 'Seasonic Core GX-650 ATX 3 — bloky zdroje',
  subtitle: 'Ověřeno pro GX-650 ATX 3 (noticias3d): APFC, full-bridge LLC, synchronní usměrnění + DC-DC na dceřiné desce, bulk 330 µF/400 V, ochrany OVP 13,4 V. Konkrétní díly v úrovni 3 jsou podle sourozence Core GX-750 ATX3 (Cybenetics).',
  components: [
    blk('emi', 'AC VSTUP + EMI FILTR + INRUSH', 50, 50, ['230 V AC'], ['AC'], 'IEC C14, NTC + RELÉ', 190, 90),
    blk('pfc', 'MŮSTEK + AKTIVNÍ PFC', 290, 50, ['AC'], ['~380 V DC'], 'DVOJKLIK → SOUČÁSTKY', 190, 90, { drill: 'psu_primary' }),
    blk('main', 'FULL-BRIDGE LLC + TRANSFORMÁTOR', 530, 50, ['~380 V DC', 'ŘÍZENÍ'], ['12 V AC'], 'DVOJKLIK → SOUČÁSTKY', 200, 90, { drill: 'psu_primary' }),
    blk('sr', 'SYNCHRONNÍ USMĚRNĚNÍ +12 V', 770, 50, ['12 V AC'], ['+12V'], 'DVOJKLIK → SOUČÁSTKY', 170, 90, { drill: 'psu_secondary' }),
    blk('dcdc', 'DC-DC 12 → 5 V / 3,3 V', 770, 200, ['+12V'], ['+5V', '+3,3V'], 'DCEŘINÁ DESKA', 170, 100, { drill: 'psu_secondary' }),
    blk('sb', 'POHOTOVOSTNÍ ZDROJ +5VSB', 290, 230, ['~380 V DC'], ['+5VSB'], 'DVOJKLIK → SOUČÁSTKY', 190, 90, { drill: 'psu_standby' }),
    blk('sup', 'SUPERVIZOR (PS_ON#, PWR_OK, OCHRANY)', 530, 230, ['PS_ON#', '+5VSB'], ['ŘÍZENÍ', 'PWR_OK'], 'OVP 13,4 / 5,74 / 3,76 V', 200, 100, { drill: 'psu_secondary' }),
    blk('mod', 'MODULÁRNÍ PANEL', 530, 400, ['+12V', '+5V', '+3,3V', 'PWR_OK'], ['24 PIN', '2× CPU 8 PIN', '4× PCIe 8 PIN', 'SATA/MOLEX'], '24 PIN, CPU, PCIe, SATA, MOLEX', 220, 130),
  ],
  wires: [
    w('emi.AC', 'pfc.AC'), w('pfc.~380 V DC', 'main.~380 V DC'), w('pfc.~380 V DC', 'sb.~380 V DC'),
    w('main.12 V AC', 'sr.12 V AC'), w('sr.+12V', 'dcdc.+12V'), w('sr.+12V', 'mod.+12V'),
    w('dcdc.+5V', 'mod.+5V'), w('dcdc.+3,3V', 'mod.+3,3V'),
    w('sb.+5VSB', 'sup.+5VSB'), w('sup.ŘÍZENÍ', 'main.ŘÍZENÍ'), w('sup.PWR_OK', 'mod.PWR_OK'),
  ],
});

def('psu_primary', {
  level: 3,
  name: 'Zdroj — primár: APFC a full-bridge LLC',
  subtitle: 'Bulk 330 µF/400 V a full-bridge LLC ověřeny pro GX-650 ATX 3; ostatní díly podle sourozence Core GX-750 ATX3 (Cybenetics 2753). 230 V AC → ~380 V DC → rezonanční měnič → transformátor.',
  components: [
    blk('br', 'MŮSTEK GBU1508S', 50, 60, ['AC'], ['DC+'], SIB, 170, 80),
    blk('pfcL', 'APFC: TLUMIVKA + 2× CRJS190N65GCF + SiC DIODA G4S06508DT', 50, 200, ['DC+', 'PWM PFC'], ['~380 V'], SIB, 230, 110),
    blk('pfcC', 'ŘADIČ APFC CHAMPION CM6500UNX', 50, 380, [], ['PWM PFC'], SIB, 230, 80),
    blk('bulk', 'BULK TEAPO LG 330 µF / 400 V', 360, 60, ['~380 V'], ['~380 V DC'], 'OVĚŘENO PRO GX-650 ATX 3', 200, 90),
    blk('fb', 'FULL-BRIDGE: 4× HUAJING CS13N50AOR', 360, 230, ['~380 V DC', 'GATE'], ['LLC'], SIB, 220, 100),
    blk('llcC', 'ŘADIČ LLC CHAMPION CU6901VPA', 360, 400, [], ['GATE'], SIB, 220, 80),
    blk('tank', 'REZONANČNÍ OBVOD Lr + Cr + HLAVNÍ TRANSFORMÁTOR', 680, 230, ['LLC'], ['12 V AC'], 'HODNOTY Lr/Cr NEVEŘEJNÉ', 230, 110),
  ],
  wires: [
    w('br.DC+', 'pfcL.DC+'), w('pfcC.PWM PFC', 'pfcL.PWM PFC'), w('pfcL.~380 V', 'bulk.~380 V'),
    w('bulk.~380 V DC', 'fb.~380 V DC'), w('llcC.GATE', 'fb.GATE'), w('fb.LLC', 'tank.LLC'),
  ],
});

def('psu_secondary', {
  level: 3,
  name: 'Zdroj — sekundár: SR 12 V, DC-DC, supervizor',
  subtitle: 'GX-650 ATX 3 (noticias3d): Teapo TX 3× 3300 µF + 2200 µF/16 V, OVP 13,4 / 5,74 / 3,76 V, ventilátor Hong Hua FDB. SR FETy, DC-DC, supervizor a MCU ventilátoru podle sourozence GX-750 ATX3.',
  components: [
    blk('sr', 'SR 12 V: 4× MOSFET 33208B', 50, 60, ['12 V AC'], ['+12V'], SIB, 210, 90),
    blk('cap', 'FILTR TEAPO TX 3× 3300 µF + 2200 µF / 16 V', 50, 220, ['+12V'], ['+12V OUT'], 'OVĚŘENO PRO GX-650 ATX 3', 230, 90),
    blk('dcdc', 'DC-DC: UPI uP3861P + 6× UBIQ QN3106M6N', 360, 60, ['+12V OUT'], ['+5V', '+3,3V'], SIB, 230, 100),
    blk('sup', 'SUPERVIZOR WELTREND WT7527RA', 360, 240, ['+12V OUT', '+5V', '+3,3V'], ['PWR_OK', 'OCHRANY'], 'OVP 13,4 / 5,74 / 3,76 V (GX-650)', 230, 110),
    blk('fan', 'VENTILÁTOR HONG HUA 120 mm FDB + MCU NUVOTON M031FB0AE', 680, 60, ['+12V OUT'], [], 'VENTILÁTOR OVĚŘEN, MCU PODLE GX-750', 240, 100),
    blk('out', 'MODULÁRNÍ PANEL', 680, 240, ['+12V OUT', '+5V', '+3,3V', 'PWR_OK'], [], '24 PIN, CPU, PCIe, SATA, MOLEX', 220, 110),
  ],
  wires: [
    w('sr.+12V', 'cap.+12V'), w('cap.+12V OUT', 'dcdc.+12V OUT'), w('cap.+12V OUT', 'sup.+12V OUT'), w('cap.+12V OUT', 'fan.+12V OUT'),
    w('dcdc.+5V', 'sup.+5V'), w('dcdc.+3,3V', 'sup.+3,3V'), w('cap.+12V OUT', 'out.+12V OUT'), w('dcdc.+5V', 'out.+5V'), w('dcdc.+3,3V', 'out.+3,3V'), w('sup.PWR_OK', 'out.PWR_OK'),
  ],
});

def('psu_standby', {
  level: 3,
  name: 'Zdroj — pohotovostní +5VSB',
  subtitle: 'Běží i ve vypnutém stavu a napájí supervizor (PS_ON#). Řadič a usměrňovač podle sourozence GX-750 ATX3 (Cybenetics); topologie (flyback) neověřena.',
  components: [
    blk('ctl', 'ŘADIČ EXCELLIANCE EM8569C', 50, 120, ['~380 V DC'], ['SPÍNÁNÍ'], SIB, 220, 90),
    blk('tr', 'TRANSFORMÁTOR 5VSB (FLYBACK – NEOVĚŘENO)', 360, 120, ['SPÍNÁNÍ'], ['5 V AC'], 'TOPOLOGIE NEOVĚŘENA', 230, 90),
    blk('rect', 'USMĚRŇOVAČ DONGKE DK5V45R10S', 680, 120, ['5 V AC'], ['+5VSB'], SIB, 220, 90),
  ],
  wires: [w('ctl.SPÍNÁNÍ', 'tr.SPÍNÁNÍ'), w('tr.5 V AC', 'rect.5 V AC')],
});

// ---------------------------------------------------------------- deska Tesla P100 PCIe
def('p100_board', {
  name: 'NVIDIA Tesla P100 PCIe 16 GB — bloky desky',
  subtitle: 'NVIDIA PB-08248 + Pascal whitepaper: GP100 (16 nm, 15,3 mld. tranzistorů, 610 mm², 56 SM / 3584 jader) a 4× HBM2 na interposeru CoWoS, 4096 bit, 732 GB/s. Napájení 250 W. Rozdělení VRM není veřejné.',
  components: [
    blk('eps', 'EPS12V 8 PIN', 50, 50, [], ['+12V 240 W'], '240 W / 20 A', 170, 80),
    blk('edge', 'PCIe 3.0 x16 HRANA', 50, 300, [], ['+12V 66 W', '+3,3V 10 W', 'PCIe x16'], 'SLOT: 12 V 5,5 A, 3,3 V 3 A', 190, 110),
    blk('vrm', 'NAPÁJECÍ VRM', 300, 140, ['+12V 240 W', '+12V 66 W', '+3,3V 10 W'], ['VDD GPU', 'VDD HBM2'], 'ROZDĚLENÍ NEVEŘEJNÉ', 170, 110),
    blk('gpu', 'GP100 (56 SM, 3584 JADER)', 540, 200, ['VDD GPU', 'PCIe x16'], ['HBM0', 'HBM1', 'HBM2', 'HBM3'], 'DVOJKLIK → ČIP', 190, 130, { drill: 'gp100_die' }),
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
  subtitle: 'Dell Owner Manual (obr. System Board Components, ověřeno): sloty shora 1–6, slot 1 x8 half-length, 2 a 4 x16 Gen3 z CPU, 3 a 5 z C612, 6 PCI. P100 ve slotech 2 a 4 zakryjí 3 a 5 – zbývá jen slot 1 – má ho K620; SSD je 2,5" SATA v šachtě (6× SATA 6 Gb/s z C612). Původ linek odvozen (8 + 16 + 16 = 40).',
  components: [
    blk('cpu', 'XEON E5-1650 v3 (LGA 2011-3)', 330, 40, ['DDR4'], ['PCIe 3.0 x8', 'PCIe 3.0 x16 A', 'PCIe 3.0 x16 B', 'DMI 2.0'], 'DVOJKLIK → ČIP', 200, 130, { drill: 'xeon_die' }),
    blk('mem', 'DDR4 ECC RDIMM · 4 KANÁLY', 50, 50, [], ['DDR4'], 'DVOJKLIK → MODUL 8 GB', 190, 80, { drill: 'rdimm_module' }),
    blk('pch', 'INTEL C612 (PCH)', 330, 330, ['DMI 2.0'], ['PCIe 2.0 x1', 'PCIe 2.0 x4', 'PCI', 'SATA/USB'], 'DMI 2.0 5 GT/s, PCIe 2.0 MAX 8 LINEK', 200, 130),
    blk('s1', 'SLOT 1 · x8 → QUADRO K620', 640, 40, ['PCIe 3.0 x8'], [], 'HALF-LENGTH · DVOJKLIK → K620', 180, 70, { drill: 'k620_board' }),
    blk('s2', 'SLOT 2 · x16 Gen3 → P100 G1', 640, 120, ['PCIe 3.0 x16 A'], [], 'Z CPU', 180, 70),
    blk('s4', 'SLOT 4 · x16 Gen3 → P100 G2', 640, 200, ['PCIe 3.0 x16 B'], [], 'Z CPU', 180, 70),
    blk('s3', 'SLOT 3 · x1 Gen2', 640, 300, ['PCIe 2.0 x1'], [], 'ZAKRYTÝ CHLADIČEM P100', 180, 60),
    blk('s5', 'SLOT 5 · x16 MECH, x4 Gen2', 640, 370, ['PCIe 2.0 x4'], [], 'ZAKRYTÝ CHLADIČEM P100', 180, 60),
    blk('s6', 'SLOT 6 · PCI 32 BIT', 640, 440, ['PCI'], [], 'MOST NEOVĚŘEN', 180, 60),
    blk('ssd', 'SATA SSD 870 EVO (HDD0)', 50, 200, ['SATA'], [], 'DVOJKLIK → SSD', 190, 80, { drill: 'sata_ssd' }),
    blk('io', 'USB · LAN · BIOS', 50, 380, ['SATA/USB'], [], 'Z PCH', 190, 80),
  ],
  wires: [
    w('mem.DDR4', 'cpu.DDR4'),
    w('cpu.PCIe 3.0 x8', 's1.PCIe 3.0 x8'), w('cpu.PCIe 3.0 x16 A', 's2.PCIe 3.0 x16 A'), w('cpu.PCIe 3.0 x16 B', 's4.PCIe 3.0 x16 B'),
    w('cpu.DMI 2.0', 'pch.DMI 2.0'),
    w('pch.PCIe 2.0 x1', 's3.PCIe 2.0 x1'), w('pch.PCIe 2.0 x4', 's5.PCIe 2.0 x4'), w('pch.PCI', 's6.PCI'), w('pch.SATA/USB', 'io.SATA/USB'), w('pch.SATA/USB', 'ssd.SATA'),
  ],
});
