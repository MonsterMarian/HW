// Hlubší úrovně AI PC (L3–L5): GP100, Xeon (Haswell-EP), RDIMM / DDR4, M.2 redukce a SSD.
// Zdroje: NVIDIA Pascal whitepaper WP-08019 (obr. 7 a 8) + PB-08248; Intel ARK E5-1650 v3, Optimization
// Reference Manual 356477 (Haswell), Hot Chips 25; Samsung RDIMM M393A1G40EB1 datasheet, Samsung K4A4G165WE
// a Micron 4Gb DDR4 (obr. 2); PCIe pinout (Wikipedia/PCI-SIG CEM), M.2 Key M (congatec AN43); Kingston NV3
// datasheet, Phison E27T (AnandTech, Phison CES 2024). Neověřené údaje mají v popisku "neověřeno".
// Bloky (PC_BLOCK) jsou popisné; "příklad" = skutečný simulovaný prvek, kterým vede cesta dál až k atomům.
const Z = 'Z';
const c = (id, type, label, x, y, extra = {}) => ({ id, type, label, x, y, inputs: {}, outputs: {}, ...extra });
const pins = (names) => Object.fromEntries(names.map((n) => [n, Z]));
const blk = (id, label, x, y, ins, outs, note, w = 190, h = 90, extra = {}) => c(id, 'PC_BLOCK', label, x, y, { inputs: pins(ins), outputs: pins(outs), note, w, h, ...extra });
const inp = (id, label, x, y) => c(id, 'INPUT', label, x, y, { outputs: { out: 0 } });
const probe = (id, label, x, y) => c(id, 'PROBE', label, x, y, { inputs: { in: Z } });
const w = (from, to) => {
  const [fi, ...fp] = from.split('.');
  const [ti, ...tp] = to.split('.');
  return { from: { id: fi, pin: fp.join('.') }, to: { id: ti, pin: tp.join('.') } };
};

// Piny konektorů redukce (jméno pinu = čísla pinů + signál). Používá je i definice zařízení v pcBuild.js.
const EDGE = {
  PET0: 'B14/B15 PET0', PER0: 'A16/A17 PER0', PET1: 'B19/B20 PET1', PER1: 'A21/A22 PER1',
  PET2: 'B23/B24 PET2', PER2: 'A25/A26 PER2', PET3: 'B27/B28 PET3', PER3: 'A29/A30 PER3',
  REFCLK: 'A13/A14 REFCLK', PERST: 'A11 PERST#', CLKREQ: 'B12 CLKREQ#', V33: 'A9,A10,B8 +3,3V', V12: 'B1-B3 +12V', GND: 'GND',
};
const M2 = {
  PET0: '49/47 PET0', PER0: '43/41 PER0', PET1: '37/35 PET1', PER1: '31/29 PER1',
  PET2: '25/23 PET2', PER2: '19/17 PER2', PET3: '13/11 PET3', PER3: '7/5 PER3',
  REFCLK: '55/53 REFCLK', PERST: '50 PERST#', CLKREQ: '52 CLKREQ#', V33: '2,4,12,14… +3,3V', GND: 'GND',
};
export const CONN_PINS = { EDGE, M2 };

export const PC_DEEP_SUBCIRCUITS = {};
const def = (key, level, sub) => { PC_DEEP_SUBCIRCUITS[key] = { key, level, ...sub }; };

// Příklad sčítačky: 3 vstupy → FULL_ADDER → součet a přenos (dvojklikem dál na hradla, CMOS, tranzistor, atomy)
const adderExample = (label, x, y) => ({
  components: [
    inp('ex_a', 'A', x, y), inp('ex_b', 'B', x, y + 70), inp('ex_c', 'PŘENOS VSTUP', x + 100, y),
    c('ex_fa', 'FULL_ADDER', label, x + 220, y),
    probe('ex_s', 'SOUČET', x + 340, y), probe('ex_co', 'PŘENOS', x + 340, y + 64),
  ],
  wires: [w('ex_a.out', 'ex_fa.a'), w('ex_b.out', 'ex_fa.b'), w('ex_c.out', 'ex_fa.cin'), w('ex_fa.s', 'ex_s.in'), w('ex_fa.cout', 'ex_co.in')],
});

// ================================================================ NVIDIA GP100
def('gp100_die', 3, {
  name: 'NVIDIA GP100 — čip (die)',
  subtitle: 'Pascal whitepaper obr. 7: 6 GPC × 5 TPC × 2 SM = 60 SM (P100 PCIe má aktivních 56, které vypnuté – neověřeno), L2 4 MB, 8× řadič 512 bit → 4 stacky HBM2, 15,3 mld. tranzistorů, 610 mm², 16 nm FinFET.',
  components: [
    blk('host', 'PCIe 3.0 HOST INTERFACE', 50, 50, [], ['ÚLOHY'], 'x16 Gen3', 200, 80),
    blk('gt', 'GIGATHREAD ENGINE', 300, 50, ['ÚLOHY'], ['GPC'], 'ROZDĚLUJE BLOKY VLÁKEN', 200, 80),
    blk('hub', 'HSHUB + 4× NVLINK', 300, 170, [], [], 'NA PCIe KARTĚ NEVYVEDENO', 200, 70),
    ...[0, 1, 2, 3, 4, 5].map((i) => blk(`gpc${i}`, `GPC ${i} · 10 SM`, 560 + (i % 3) * 130, 50 + Math.floor(i / 3) * 95, ['GPC'], ['L2'], 'DVOJKLIK → SM', 120, 75, { drill: 'gp100_sm' })),
    blk('l2', 'L2 CACHE 4096 KB (8 × 512 KB)', 560, 250, ['L2'], ['MC'], 'SDÍLENÁ VŠEMI SM', 380, 70),
    ...[0, 1, 2, 3].map((i) => blk(`mc${i}`, `2× ŘADIČ 512 BIT`, 50 + i * 230, 380, ['MC'], ['HBM2'], `→ HBM2 STACK ${i} (4 GB, 1024 BIT)`, 210, 80)),
  ],
  wires: [
    w('host.ÚLOHY', 'gt.ÚLOHY'),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => [w('gt.GPC', `gpc${i}.GPC`), w(`gpc${i}.L2`, 'l2.L2')]),
    ...[0, 1, 2, 3].map((i) => w('l2.MC', `mc${i}.MC`)),
  ],
});

def('gp100_sm', 4, {
  name: 'GP100 — Streaming Multiprocessor (SM)',
  subtitle: 'Whitepaper obr. 8: 2 procesní bloky, každý buffer instrukcí + warp scheduler + 2 dispatch, registry 32 768 × 32 bit, 32 FP32, 16 FP64, 8 LD/ST, 8 SFU; SM má 64 KB sdílené paměti a 4 texturovací jednotky. Dole příklad: 1 bit sčítačky a 1 bit registru.',
  components: [
    blk('ic', 'INSTRUKČNÍ CACHE', 50, 50, [], ['INSTR'], 'SPOLEČNÁ PRO OBA BLOKY', 200, 70),
    blk('pb0', 'BLOK 0: BUFFER, WARP SCHEDULER, 2× DISPATCH', 50, 140, ['INSTR'], ['WARP'], '2 INSTRUKCE WARPU ZA TAKT', 260, 90),
    blk('pb1', 'BLOK 1: BUFFER, WARP SCHEDULER, 2× DISPATCH', 50, 250, ['INSTR'], ['WARP'], '2 INSTRUKCE WARPU ZA TAKT', 260, 90),
    blk('rf', 'REGISTRY 32 768 × 32 BIT', 350, 50, ['WARP'], ['OPERANDY'], '128 KB NA BLOK, 256 KB NA SM', 230, 80),
    blk('fp32', '32× FP32 JÁDRO', 350, 150, ['OPERANDY'], ['VÝSLEDEK'], 'NA BLOK (64 NA SM)', 170, 70),
    blk('fp64', '16× FP64 JEDNOTKA', 540, 150, ['OPERANDY'], ['VÝSLEDEK'], 'NA BLOK (32 NA SM)', 170, 70),
    blk('ldst', '8× LD/ST', 350, 240, ['OPERANDY'], ['PAMĚŤ'], 'NA BLOK', 170, 70),
    blk('sfu', '8× SFU', 540, 240, ['OPERANDY'], ['VÝSLEDEK'], 'SIN, COS, 1/X …', 170, 70),
    blk('smem', 'SDÍLENÁ PAMĚŤ 64 KB', 740, 50, ['PAMĚŤ'], [], 'VYHRAZENÁ', 200, 70),
    blk('tex', 'TEXTURE / L1 + 4× TEX', 740, 140, ['PAMĚŤ'], [], 'VELIKOST L1 NEOVĚŘENA', 200, 70),
    ...adderExample('PŘÍKLAD: 1 BIT SČÍTAČKY FP32', 40, 390).components,
    inp('ex_d', 'D', 560, 390), inp('ex_clk', 'HODINY', 560, 460),
    c('ex_ff', 'D_FF', 'PŘÍKLAD: 1 BIT REGISTRU', 680, 400),
    probe('ex_q', 'Q', 820, 410),
  ],
  wires: [
    w('ic.INSTR', 'pb0.INSTR'), w('ic.INSTR', 'pb1.INSTR'), w('pb0.WARP', 'rf.WARP'), w('pb1.WARP', 'rf.WARP'),
    ...['fp32', 'fp64', 'ldst', 'sfu'].map((k) => w('rf.OPERANDY', `${k}.OPERANDY`)),
    w('ldst.PAMĚŤ', 'smem.PAMĚŤ'), w('ldst.PAMĚŤ', 'tex.PAMĚŤ'),
    ...adderExample('', 40, 390).wires,
    w('ex_d.out', 'ex_ff.d'), w('ex_clk.out', 'ex_ff.clk'), w('ex_ff.q', 'ex_q.in'),
  ],
});

// ================================================================ Intel Xeon E5-1650 v3 (Haswell-EP)
def('xeon_die', 3, {
  name: 'Intel Xeon E5-1650 v3 — čip',
  subtitle: 'ARK: 6 jader / 12 vláken, 3,5/3,8 GHz, L3 15 MB (6 × 2,5 MB), 4 kanály DDR4-2133 68 GB/s, 40 linek PCIe 3.0, QPI 0, 140 W, 22 nm. Porty PCIe x8 + 2× x16 + DMI2 x4. Že jde o 8jádrový LCC die s jedním kruhem, je neověřené.',
  components: [
    ...[0, 1, 2, 3, 4, 5].map((i) => blk(`core${i}`, `JÁDRO ${i} + L3 2,5 MB`, 50 + (i % 3) * 170, 50 + Math.floor(i / 3) * 95, ['RING'], [], 'DVOJKLIK → JÁDRO', 155, 75, { drill: 'haswell_core' })),
    blk('ring', 'KRUHOVÁ SBĚRNICE (RING)', 50, 260, [], ['RING'], 'POČET KRUHŮ NEOVĚŘEN', 480, 60),
    blk('imc', 'IMC · 4× DDR4-2133', 600, 50, ['RING'], ['DDR4'], '68 GB/s, ECC', 200, 80),
    blk('pcie', 'PCIe 3.0 · 40 LINEK', 600, 160, ['RING'], ['PORT1 x8', 'PORT2 x16', 'PORT3 x16'], 'SLOT 1 / SLOT 2 / SLOT 4', 200, 100),
    blk('dmi', 'DMI2 x4 → C612', 600, 300, ['RING'], ['DMI'], 'ŠÍŘKA x4 NEOVĚŘENA', 200, 70),
    blk('qpi', 'QPI: 0 LINEK (ŘADA 1600)', 50, 380, [], [], 'JEDNOPROCESOROVÝ', 230, 60),
    blk('pcu', 'PCU + FIVR', 320, 380, [], [], 'NEOVĚŘENO', 200, 60),
  ],
  wires: [
    ...[0, 1, 2, 3, 4, 5].map((i) => w('ring.RING', `core${i}.RING`)),
    w('ring.RING', 'imc.RING'), w('ring.RING', 'pcie.RING'), w('ring.RING', 'dmi.RING'),
  ],
});

def('haswell_core', 4, {
  name: 'Jádro Haswell — mikroarchitektura',
  subtitle: 'Intel Optimization Manual + Hot Chips 25: L1I 32 KB, 4 dekodéry, µop cache 1536, IDQ/LSD 56, ROB 192, scheduler 60, registry 168 INT + 168 FP, 8 portů, L1D 32 KB, L2 256 KB. Dole příklad: 1 bit sčítačky ALU.',
  components: [
    blk('fe', 'FRONT-END: L1I 32 KB + 4 DEKODÉRY', 50, 50, [], ['µOP'], 'µOP CACHE 1536, LSD 56', 230, 80),
    blk('ooo', 'ROB 192 · SCHEDULER 60', 320, 50, ['µOP'], ['P0', 'P1', 'P5', 'P6', 'P2/P3', 'P4', 'P7'], 'AŽ 8 µOP ZA TAKT', 200, 150),
    blk('prf', 'REGISTRY 168 INT + 168 FP', 320, 240, [], [], 'FYZICKÝ REGISTROVÝ SOUBOR', 200, 70),
    blk('p0', 'P0 · ALU, FMA, DIV, SKOK', 560, 40, ['P0'], [], '', 190, 58),
    blk('p1', 'P1 · ALU, FMA, FP ADD', 560, 102, ['P1'], [], '', 190, 58),
    blk('p5', 'P5 · ALU, SHUFFLE, LEA', 560, 164, ['P5'], [], '', 190, 58),
    blk('p6', 'P6 · ALU, SHIFT, SKOK', 560, 226, ['P6'], [], '', 190, 58),
    blk('p23', 'P2/P3 · LOAD + ADRESA', 560, 288, ['P2/P3'], ['L1D'], '', 190, 58),
    blk('p4', 'P4 · STORE DATA', 560, 350, ['P4'], ['L1D'], '', 190, 58),
    blk('p7', 'P7 · STORE ADRESA', 560, 412, ['P7'], ['L1D'], '', 190, 58),
    blk('l1d', 'L1D 32 KB · L2 256 KB', 790, 290, ['L1D'], [], '2× LOAD + 1× STORE 256 BIT', 150, 90),
    ...adderExample('PŘÍKLAD: 1 BIT SČÍTAČKY ALU', 40, 390).components,
  ],
  wires: [
    w('fe.µOP', 'ooo.µOP'),
    w('ooo.P0', 'p0.P0'), w('ooo.P1', 'p1.P1'), w('ooo.P5', 'p5.P5'), w('ooo.P6', 'p6.P6'),
    w('ooo.P2/P3', 'p23.P2/P3'), w('ooo.P4', 'p4.P4'), w('ooo.P7', 'p7.P7'),
    w('p23.L1D', 'l1d.L1D'), w('p4.L1D', 'l1d.L1D'), w('p7.L1D', 'l1d.L1D'),
    ...adderExample('', 40, 390).wires,
  ],
});

// ================================================================ DDR4 RDIMM 8 GB 1Rx4
def('rdimm_module', 3, {
  name: 'DDR4 RDIMM 8 GB 1Rx4 (Samsung M393A1G40EB1)',
  subtitle: 'Datasheet Samsung: 18× K4A4G045WE (16 data + 2 ECC), adresy a řízení přes registr RCD (strana A → D1–D10, B → D11–D18), DQ jdou přímo přes 15 Ω, ZQ 240 Ω. SPD s teplotním čidlem na I²C. Typ RCD (SPD uvádí IDT) a SPD IC neověřené.',
  components: [
    blk('edge', 'HRANA 288 PINŮ', 50, 180, [], ['CA/ŘÍZENÍ', 'CK', 'DQ + CB', 'I²C'], 'DDR4 RDIMM', 180, 110),
    blk('rcd', 'RCD (REGISTR + PLL)', 320, 60, ['CA/ŘÍZENÍ', 'CK'], ['QA → D1–D10', 'QB → D11–D18'], 'VÝROBCE IDT, TYP NEOVĚŘEN', 230, 90),
    blk('da', 'D1–D10 · 10× K4A4G045WE', 650, 60, ['QA → D1–D10', 'DQ'], [], 'DVOJKLIK → ČIP DDR4', 240, 90, { drill: 'ddr4_chip' }),
    blk('db', 'D11–D18 · 8× K4A4G045WE', 650, 200, ['QB → D11–D18', 'DQ'], [], 'DVOJKLIK → ČIP DDR4', 240, 90, { drill: 'ddr4_chip' }),
    blk('spd', 'SPD EEPROM + TEPLOTNÍ ČIDLO', 320, 330, ['I²C'], [], 'TYP IC NEOVĚŘEN', 230, 80),
  ],
  wires: [
    w('edge.CA/ŘÍZENÍ', 'rcd.CA/ŘÍZENÍ'), w('edge.CK', 'rcd.CK'),
    w('rcd.QA → D1–D10', 'da.QA → D1–D10'), w('rcd.QB → D11–D18', 'db.QB → D11–D18'),
    w('edge.DQ + CB', 'da.DQ'), w('edge.DQ + CB', 'db.DQ'), w('edge.I²C', 'spd.I²C'),
  ],
});

def('ddr4_chip', 4, {
  name: 'DDR4 4 Gb x4 (K4A4G045WE) — vnitřek čipu',
  subtitle: '4 bank groups × 4 banky, 65 536 řádků × 1 024 sloupců × 4 bit, stránka 512 B, prefetch 8n, 1,2 V / VPP 2,5 V (Samsung K4A4G165WE, Micron obr. 2). Bloky podle funkčního diagramu Micronu.',
  components: [
    blk('cmd', 'ŘÍZENÍ + DEKODÉR PŘÍKAZŮ', 50, 50, [], ['PŘÍKAZ'], 'ACT, RAS, CAS, WE, CS, CKE, PAR', 210, 80),
    blk('mr', 'MODE REGISTRY', 50, 170, ['PŘÍKAZ'], [], '', 210, 60),
    blk('ref', 'ČÍTAČ REFRESHE', 50, 260, ['PŘÍKAZ'], ['ŘÁDEK'], '', 210, 70),
    blk('rmux', 'ROW ADDRESS MUX', 300, 50, ['PŘÍKAZ', 'ŘÁDEK'], ['RA[15:0]'], '', 190, 80),
    blk('rdec', 'ŘÁDKOVÝ DEKODÉR 16 → 65 536', 300, 160, ['RA[15:0]'], ['WL'], '', 190, 80),
    blk('bg', 'BG / BA ŘÍZENÍ', 300, 270, ['PŘÍKAZ'], ['BANKA'], '', 190, 70),
    blk('cdec', 'SLOUPCOVÝ DEKODÉR 10 → 1024', 300, 370, ['PŘÍKAZ'], ['CSL'], '', 190, 80),
    blk('arr', '4 BANK GROUPS × 4 BANKY', 530, 50, ['WL', 'BANKA', 'CSL'], ['BL'], 'DVOJKLIK → BUŇKY 1T1C', 210, 100, { drill: 'ddr4_cells' }),
    blk('sa', 'SENSE AMPLIFIERY', 530, 180, ['BL'], ['DATA'], '', 210, 70),
    blk('iog', 'I/O GATING + READ FIFO', 530, 280, ['DATA'], ['DQ'], '', 210, 70),
    blk('io', 'DQ[3:0] + DQS · 8n', 780, 280, ['DQ'], [], 'BL8 / BC4', 160, 80),
    blk('dll', 'DLL · ODT · ZQ · VrefDQ', 780, 50, [], [], 'ZQ 240 Ω', 160, 90),
  ],
  wires: [
    w('cmd.PŘÍKAZ', 'mr.PŘÍKAZ'), w('cmd.PŘÍKAZ', 'ref.PŘÍKAZ'), w('cmd.PŘÍKAZ', 'rmux.PŘÍKAZ'), w('ref.ŘÁDEK', 'rmux.ŘÁDEK'),
    w('cmd.PŘÍKAZ', 'bg.PŘÍKAZ'), w('cmd.PŘÍKAZ', 'cdec.PŘÍKAZ'),
    w('rmux.RA[15:0]', 'rdec.RA[15:0]'), w('rdec.WL', 'arr.WL'), w('bg.BANKA', 'arr.BANKA'), w('cdec.CSL', 'arr.CSL'),
    w('arr.BL', 'sa.BL'), w('sa.DATA', 'iog.DATA'), w('iog.DQ', 'io.DQ'),
  ],
});

// ================================================================ M.2 redukce (slot 1) a SSD
def('m2_adapter_wiring', 3, {
  name: 'Redukce PCIe x4 → M.2 Key M (Axagon PCEM2-N)',
  subtitle: 'Pasivní mapování linek 1:1 podle jmen (obě strany pojmenované z pohledu zařízení): PCIe pinout (A/B strana) a M.2 Key M (congatec AN43). Zda má Axagon měnič 12 → 3,3 V a zda vede CLKREQ#, je neověřené. V T5810 jen do slotu 1.',
  components: [
    c('edge', 'CONN_PCIE_X4', 'J1 PCIe x4 hrana (slot)', 50, 50),
    c('m2', 'CONN_M2_M', 'J2 M.2 Key M (SSD)', 660, 50),
    blk('ssd', 'KINGSTON NV3 1 TB (M.2 2280)', 360, 380, [], [], 'DVOJKLIK → SSD', 230, 80, { drill: 'nv3_ssd' }),
  ],
  wires: [
    ...[0, 1, 2, 3].flatMap((n) => [w(`edge.${EDGE[`PET${n}`]}`, `m2.${M2[`PET${n}`]}`), w(`edge.${EDGE[`PER${n}`]}`, `m2.${M2[`PER${n}`]}`)]),
    w(`edge.${EDGE.REFCLK}`, `m2.${M2.REFCLK}`), w(`edge.${EDGE.PERST}`, `m2.${M2.PERST}`), w(`edge.${EDGE.CLKREQ}`, `m2.${M2.CLKREQ}`),
    w(`edge.${EDGE.V33}`, `m2.${M2.V33}`), w(`edge.${EDGE.GND}`, `m2.${M2.GND}`),
  ],
});

def('nv3_ssd', 4, {
  name: 'Kingston NV3 1 TB (SNV3S/1000G) — bloky',
  subtitle: 'Kingston datasheet: M.2 2280 jednostranný, PCIe 4.0 x4 NVMe (v Dellu poběží jako Gen3). Řadič se mění podle šarže: Phison E27T (Cortex-R5, LDPC, 4 kanály / 16 CE, bez DRAM s HMB) nebo SM2268XT2. NAND 3D TLC/QLC, počet pouzder neověřen.',
  components: [
    blk('edge', 'M.2 KEY M · PCIe 4.0 x4', 50, 60, [], ['PCIe'], 'V T5810 GEN3 x4', 210, 80),
    blk('ctl', 'ŘADIČ PHISON E27T / SM2268XT2', 320, 60, ['PCIe'], ['KANÁLY 0–3'], 'E27T: CORTEX-R5, LDPC, 16 CE', 260, 100),
    blk('nand', 'NAND 3D (TLC / QLC PODLE ŠARŽE)', 650, 60, ['KANÁLY 0–3'], [], 'POČET POUZDER NEOVĚŘEN', 260, 90),
    blk('hmb', 'BEZ DRAM: HMB V RAM POČÍTAČE', 320, 230, [], [], 'HOST MEMORY BUFFER', 260, 70),
    blk('pwr', 'NAPÁJENÍ 3,3 V → ŘADIČ A NAND', 50, 230, [], [], 'REGULÁTORY NEOVĚŘENY', 230, 70),
  ],
  wires: [w('edge.PCIe', 'ctl.PCIe'), w('ctl.KANÁLY 0–3', 'nand.KANÁLY 0–3')],
});



/** Odvozené listy: buňky DDR4 = simulované pole 1T1C z NV1 (dram_cell_array) o úroveň hlouběji, bez MUXu. */
export function derivePcSubcircuits(H) {
  const src = H.dram_cell_array;
  if (!src) return {};
  const components = src.components.filter((cp) => cp.id !== 'wr_mux' && cp.id !== 'wr').map((cp) => ({ ...cp }));
  const wires = src.wires
    .filter((wr) => ![wr.from.id, wr.to.id].some((id) => id === 'wr_mux' || id === 'wr'))
    .concat([w('din.out', 'wr_drv.in')]);
  return {
    ddr4_cells: {
      key: 'ddr4_cells', level: 5,
      name: 'DDR4 — buňky 1T1C, bit line, sense amp',
      subtitle: 'Stejný princip jako u DRAM karty NV1: buňka = přístupový NMOS + kondenzátor, čtení přes předpětí bit line a sense amp. Tento binární simulátor zjednodušuje diferenciální SA na VDD/2 (model); zápis jde přímo z DATA IN.',
      components, wires,
    },
  };
}
