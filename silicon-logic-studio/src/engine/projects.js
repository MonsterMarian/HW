// Projekty, které aplikace založí po každém spuštění. Otevře se první z nich.
import { NV1_BOARD } from './presets/nv1Board.js';
import { PC_POWER } from './presets/pcPower.js';
import { NV1_BOM, P100_PC_BOM } from './economic/catalog.js';

export const PROJECTS = [
  {
    id: 'nv1',
    tab: 'NV1 KARTA',
    title: 'Diamond Edge 3D 2120 · NV1 (1995)',
    subtitle: 'NVIDIA NV1 / STG2000X, 2 MB DRAM, PCI',
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
    views: ['schematic', 'economic', 'anatomy'],
    defaultView: 'economic',
    source: { label: 'Video: Qwen 27B at 67 tok/s on Two $78 Tesla P100s', url: 'https://www.youtube.com/watch?v=JvLUoJYUjDM' },
  },
];

export const projectById = (id) => PROJECTS.find((p) => p.id === id) || PROJECTS[0];
