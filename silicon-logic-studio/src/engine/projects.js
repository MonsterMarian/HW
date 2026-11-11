// Projekty, které aplikace založí po každém spuštění. Otevře se první z nich.
import { NV1_BOARD } from './presets/nv1Board.js';
import { PC_POWER } from './presets/pcPower.js';
import { MY_PC_SYSTEM } from './presets/myPcSystem.js';
import { MY_PC_P100_SYSTEM } from './presets/myPcP100System.js';
import { NV1_BOM, P100_PC_BOM, MY_PC_BOM, MY_PC_P100_BOM } from './economic/catalog.js';

export const PROJECTS = [
  {
    id: 'nv1',
    tab: 'NV1 KARTA',
    title: 'Diamond Edge 3D 2120 · NV1 (1995)',
    subtitle: 'NVIDIA NV1 / STG2000X, 2 MB DRAM (1 MB + 1 MB v paticích), PCI 2.0',
    circuit: NV1_BOARD, // simulovaný obvod: všechny pohledy
    bom: NV1_BOM,
    views: ['schematic', 'hardware', 'physics', 'economic', 'anatomy'],
    defaultView: 'hardware',
  },
  {
    id: 'p100pc',
    tab: 'AI PC 2× P100',
    title: 'AI PC · Dell T5810 + 2× Tesla P100',
    subtitle: 'Sestava z videa Junk GPU Lab: 32 GB HBM2 pro Qwen 27B v llama.cpp',
    circuit: PC_POWER, // schéma napájení (simulované); PCB ani křemík zatím ne
    bom: P100_PC_BOM,
    views: ['schematic', 'physics', 'economic', 'anatomy'],
    defaultView: 'economic',
    source: { label: 'Video: Qwen 27B at 67 tok/s on Two $78 Tesla P100s', url: 'https://www.youtube.com/watch?v=JvLUoJYUjDM' },
  },
  {
    id: 'mypc',
    tab: 'MŮJ PC',
    title: 'Můj PC · i7-9700 + RTX 3060 Ti',
    subtitle: 'ASUS PRIME B360-PLUS, 32 GB DDR4, Samsung 970 EVO Plus – zjištěno diagnostikou Windows 10. 11. 2026',
    circuit: MY_PC_SYSTEM, // schéma celého PC (simulované), dvojklik = vnitřek dílů až k atomům
    bom: MY_PC_BOM,
    views: ['schematic', 'hardware', 'physics', 'economic', 'anatomy'],
    defaultView: 'economic',
  },
  {
    id: 'mypc_p100',
    tab: 'MŮJ PC + 2× P100',
    title: 'Můj PC + 2× Tesla P100 (návrh)',
    subtitle: 'B360-PLUS: P100 v PCIEX16_1 (x16) + PCIEX16_2 (x4), obraz z iGPU, druhý zdroj přes Add2PSU – 32 GB HBM2',
    circuit: MY_PC_P100_SYSTEM, // simulované schéma, dvojklik = vnitřek dílů z mého PC i z AI PC
    bom: MY_PC_P100_BOM,
    views: ['schematic', 'hardware', 'physics', 'economic', 'anatomy'],
    defaultView: 'schematic',
  },
];

export const projectById = (id) => PROJECTS.find((p) => p.id === id) || PROJECTS[0];
