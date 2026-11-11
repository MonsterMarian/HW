// AI PC až dolů: každý funkční blok schémat Dellu T5810, P100, K620, RDIMM, SSD a zdrojů vede dvojklikem na simulovaný obvod
// o úroveň hlouběji (buňky cell_* z myPcSubcircuits.js nebo obecné obvody), výrobní procesy čipů (tranzistory L7) a druhy
// 3D scén. Bez dvojkliku zůstávají jen pasivní díly (konektory, kondenzátory, trafo, cívky, mechanika).
import { blk, w } from './pcDeepSubcircuits.js';

const SER = 'cell_serdes';
const DRILLS = {
  pwm_hub_inside: { u2: 'cell_lt', u1: 'cell_lt' }, // lineární regulátor (zesilovač odchylky) a 555 (komparátory) – typy neověřeny
  atx_psu_inside: { pfc: 'cell_buck', main: 'cell_buck', sr: 'cell_buck', dcdc: 'cell_buck', sb: 'cell_buck', sup: 'cell_lt' },
  psu_primary: { pfcL: 'cell_buck', pfcC: 'cell_lt', fb: 'cell_buck', llcC: 'cell_lt' },
  psu_secondary: { sr: 'cell_buck', dcdc: 'cell_buck', sup: 'cell_lt', fan: 'cell_lt' },
  psu_standby: { ctl: 'cell_lt', rect: 'cell_buck' },
  p100_board: { edge: 'pcie3_ctrl', vrm: 'vrm_multiphase', hbm0: 'hbm2_stack', hbm1: 'hbm2_stack', hbm2: 'hbm2_stack', hbm3: 'hbm2_stack' },
  t5810_platform: { pch: 'c612_pch', s2: 'pcie3_ctrl', s4: 'pcie3_ctrl', s3: 'pcie2_ctrl', s5: 'pcie2_ctrl', s6: SER, io: SER },
  gp100_die: { host: 'pcie3_ctrl', gt: 'cell_arbiter', hub: 'nvlink_hub', l2: 'nv_l2', mc0: 'hbm2_ctrl', mc1: 'hbm2_ctrl', mc2: 'hbm2_ctrl', mc3: 'hbm2_ctrl' },
  gp100_sm: { ic: 'cell_sram', pb0: 'cell_arbiter', pb1: 'cell_arbiter', rf: 'cell_sram', fp32: 'FULL_ADDER', fp64: 'FULL_ADDER', ldst: 'FULL_ADDER', sfu: 'cell_decoder', smem: 'cell_sram', tex: 'cell_mac' },
  xeon_die: { ring: 'hswep_ring', imc: 'xeon_imc', pcie: 'pcie3_ctrl', dmi: 'pcie2_ctrl', pcu: 'hsw_pcu' },
  haswell_core: { fe: 'x86_frontend', ooo: 'x86_ooo', prf: 'cell_sram', p0: 'FULL_ADDER', p1: 'FULL_ADDER', p5: 'MUX', p6: 'MUX', p23: 'FULL_ADDER', p4: 'cell_sram', p7: 'FULL_ADDER', l1d: 'x86_memsub' },
  rdimm_module: { rcd: 'ddr4_rcd', spd: 'cell_eeprom' },
  ddr4_chip: { cmd: 'cell_decoder', mr: 'cell_sram', ref: 'FULL_ADDER', rmux: 'MUX', rdec: 'cell_decoder', bg: 'cell_decoder', cdec: 'cell_decoder', sa: 'NOT', iog: 'cell_sram', io: 'D_FF', dll: 'D_FF' },
  sata_ssd: { sata: SER, ctl: 'samsung_mkx', dram: 'ddr4_cells', nand: 'cell_nand', pwr: 'cell_buck' },
  k620_board: { edge: 'pcie2_ctrl', gpu: 'gm107_die', mem: 'ddr4_cells', out: SER, vrm: 'cell_buck', fan: 'cell_lt' },
};

/** GM107 (Quadro K620) – čip podle datasheetu 75509 a recenzí Maxwellu; SMM a cache vedou na buňky L5. */
const gm107 = {
  key: 'gm107_die', level: 4,
  name: 'NVIDIA GM107 — čip (Quadro K620)',
  subtitle: 'Maxwell, TSMC 28 nm, 1,87 mld. tranzistorů, 148 mm². Plný čip: 1 GPC s 5 SMM (po 128 CUDA jádrech ve 4 blocích), L2 2 MB, 2 řadiče 64 bit. K620 má aktivní 3 SMM (384 / 128 – dopočet), DDR3 128 bit. Bloky vedou na ukázkové buňky se stejnou funkcí – skutečné zapojení NVIDIA nezveřejňuje.',
  components: [
    blk('host', 'PCIe 2.0 x16 HOST', 50, 50, [], ['ÚLOHY'], 'PŘIJÍMÁ A ROZDĚLUJE ÚLOHY', 190, 70, { drill: 'cell_arbiter' }),
    blk('gpc', 'GPC + RASTER ENGINE', 50, 150, ['ÚLOHY'], ['SMM'], 'ROZDĚLUJE PRÁCI', 190, 70, { drill: 'cell_arbiter' }),
    ...[0, 1, 2, 3, 4].map((i) => blk(`smm${i}`, `SMM ${i} · 128 CUDA`, 300 + (i % 3) * 150, 50 + Math.floor(i / 3) * 100, ['SMM'], ['L2'], i < 3 ? 'AKTIVNÍ (DOPOČET)' : 'U K620 VYPNUTÝ', 140, 85, { drill: 'FULL_ADDER' })),
    blk('l2', 'L2 CACHE 2 MB', 300, 260, ['L2'], ['MC'], 'SDÍLENÁ', 440, 60, { drill: 'cell_sram' }),
    blk('mc0', 'ŘADIČ 64 BIT', 300, 350, ['MC'], [], 'DDR3', 210, 70, { drill: 'cell_match' }),
    blk('mc1', 'ŘADIČ 64 BIT', 530, 350, ['MC'], [], 'DDR3', 210, 70, { drill: 'cell_match' }),
    blk('disp', 'DISPLAY: DVI-I + DP 1.2', 50, 260, [], [], 'AŽ 4 DISPLEJE (MST)', 190, 70, { drill: 'cell_decoder' }),
    blk('nvenc', 'NVENC / NVDEC', 50, 360, [], [], 'VIDEO', 190, 70, { drill: 'cell_mac' }),
  ],
  wires: [w('host.ÚLOHY', 'gpc.ÚLOHY'), ...[0, 1, 2, 3, 4].flatMap((i) => [w('gpc.SMM', `smm${i}.SMM`), w(`smm${i}.L2`, 'l2.L2')]), w('l2.MC', 'mc0.MC'), w('l2.MC', 'mc1.MC')],
};

export function applyAiPcDepth(H) {
  H.gm107_die = gm107;
  for (const [key, map] of Object.entries(DRILLS)) for (const comp of H[key].components) if (map[comp.id] && !comp.drill) comp.drill = map[comp.id]; // existující dvojklik (např. zdroj → primár) má přednost
  // druhy 3D scén: desky zařízení jako deska plošných spojů, čipy jako pouzdro + die
  for (const key of ['t5810_platform', 'p100_board', 'atx_psu_inside', 'add2psu_inside', 'pwm_hub_inside', 'eps_adapter_wiring', 'k620_board', 'rdimm_module', 'sata_ssd', 'psu_primary', 'psu_secondary', 'psu_standby']) H[key].scene = 'board';
  for (const key of ['gp100_die', 'xeon_die', 'gm107_die', 'ddr4_chip']) H[key].scene = 'flipdie';
  // výrobní procesy (tranzistory L7): známé čipy podle výrobce, jinde neuvedeno
  for (const key of ['t5810_platform', 'p100_board', 'atx_psu_inside', 'add2psu_inside', 'pwm_hub_inside', 'k620_board', 'rdimm_module', 'sata_ssd', 'psu_primary', 'psu_secondary', 'psu_standby']) H[key].process = 'unknown';
  Object.assign(H.gp100_die, { process: 'tsmc16' });
  Object.assign(H.xeon_die, { process: 'intel22' });
  Object.assign(H.gm107_die, { process: 'tsmc28' });
  Object.assign(H.ddr4_cells, { process: 'dram' });
}
