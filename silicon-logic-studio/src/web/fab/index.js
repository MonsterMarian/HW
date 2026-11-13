// Výroba: stroje, materiály s dodavateli, výrobní postupy a cesty k vlastnímu čipu. Data z rešerše (machines.js,
// materials.js, processes.js); tady jen stránky, vazby na díly a hledání použití.
import { HIERARCHICAL_SUBCIRCUITS as H } from '../../engine/hierarchicalSubcircuits.js';
import MACHINES_RAW from './machines.js';
import MATERIALS_RAW, { ROUTES } from './materials.js';
import PROCESSES from './processes.js';

export { PROCESSES, ROUTES };

export const MACHINES = MACHINES_RAW.map((m) => ({
  ...m, kind: 'Stroj', maker: m.example ?? m.makers.map((x) => x.name).join(', '),
  model: ['estimate', 'Zjednodušený 3D model z modulů podle fotek a rozměrů výrobce; vnitřek je schematický.'],
  schema: ['none', 'Stroj nemá schéma v simulaci.'],
}));
export const MATERIALS = MATERIALS_RAW.map((m) => ({
  ...m, kind: 'Materiál a dodavatel', maker: m.suppliers.map((x) => x.name).slice(0, 3).join(', '),
  model: ['none', 'Materiál nemá 3D model.'], schema: ['none', 'Materiál nemá schéma.'],
}));
export const fabById = (id) => MACHINES.find((m) => m.id === id) ?? MATERIALS.find((m) => m.id === id) ?? null;

// Které postupy vyrábějí díl: čipy podle procesu výrobce, desky a moduly = DPS + osazení.
const CHIP = {
  nv1: ['st05', 'pkg_wirebond'], stg1764: ['st05', 'pkg_wirebond'], dram_256k16: ['dram', 'pkg_wirebond'], eprom_27c256: ['pkg_wirebond'], ad1845: ['pkg_wirebond'],
  pi5c3245: ['pkg_wirebond'], nvsgp: ['pkg_wirebond'], eeprom_93c46: ['pkg_wirebond'], lm2941: ['power', 'pkg_wirebond'],
  xeon_e5_1650v3: ['intel22', 'pkg_flipchip'], i7_9700: ['intel14', 'pkg_flipchip'], b360_pch: ['intel14', 'pkg_flipchip'], c612: ['pkg_flipchip'],
  gp100: ['tsmc16', 'pkg_cowos'], hbm2_stack: ['dram', 'pkg_cowos'], gm107: ['tsmc28', 'pkg_flipchip'], ga104: ['samsung8n', 'pkg_flipchip'],
  gddr6x: ['dram'], ddr4_k4a4g045: ['dram'], ddr4_8g_x8: ['dram'], nand_k90vgy8: ['vnand'], vnand_v5: ['vnand'], b360_vrm: ['power'], up9512r: ['power'],
};
const BOARD_KINDS = new Set(['Deska a karta', 'Paměť', 'Úložiště', 'Napájení', 'Periferie']);
const PROC_ALIAS = { intel14: 'intel14', intel22: 'intel22', tsmc16: 'tsmc16', tsmc28: 'tsmc28', samsung8n: 'samsung8n', dram: 'dram', power: 'power' };
export function processesOf(p) {
  let keys = [];
  if (CHIP[p.id]) keys = ['wafer', ...CHIP[p.id]];
  else if (p.block) { const pr = PROC_ALIAS[H[p.block]?.process]; if (pr) keys = ['wafer', pr]; }
  else if (p.kind === 'Čip') keys = ['wafer', 'pkg_flipchip'];
  else if (BOARD_KINDS.has(p.kind) && !p.alt) keys = ['pcb', 'smt'];
  return keys.filter((k) => PROCESSES[k]);
}

// Kde se stroj / materiál používá: [{ key, process, step }]
export function usageOf(id) {
  const out = [];
  for (const [key, pr] of Object.entries(PROCESSES)) for (const s of pr.steps) if (s.machines?.includes(id) || s.materials?.includes(id)) out.push({ key, process: pr, step: s });
  return out;
}
