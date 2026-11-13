// Rešerše ke každé součástce: strom dodávek, mapa, firmy, časová osa, úzká hrdla, historie, trh.
// Každý soubor exportuje { [partId]: Research }. Každá položka MÁ `src` (URL zdroje) a `fact`:
//   'doc'      = zdroj to říká přímo o tomhle dílu / čipu,
//   'estimate' = obecný údaj pro tento typ dílu (např. typický řetězec výroby DRAM), pro díl samotný nedoložený.
//
// Research = {
//   checked: 'YYYY-MM-DD',
//   supply: [{ id, stage, name, place?: { name, country: 'ISO-2', lat, lon }, to: [id…], src, fact }],
//           stage: 0 Těžba, 1 Rafinace, 2 Materiál, 3 Výroba (wafer / komponenta), 4 Pouzdření a montáž, 5 Výrobce dílu.
//           `to` míří do vyšší fáze; uzly fáze 5 vedou na díl samotný (bez `to`).
//   companies: [{ name, role, country, src, fact }],
//   timeline: [{ date: 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD', text, src, fact }],
//   bottlenecks: [{ title, text, src, fact }],
//   history: [{ year, title, text, src, fact }],
//   market: { category, year, shares: [{ name, pct }], src, fact } | null,
// }
import nv1Card from './nv1_card.js';
import aiPcA from './ai_pc_a.js';
import aiPcB from './ai_pc_b.js';
import myPcA from './my_pc_a.js';
import myPcB from './my_pc_b.js';
import alternatives from './alternatives.js';
import passivesA from './passives_a.js';
import passivesB from './passives_b.js';

export const STAGES = ['Těžba', 'Rafinace', 'Materiál', 'Výroba', 'Pouzdření a montáž', 'Výrobce dílu'];
export const RESEARCH = { ...nv1Card, ...aiPcA, ...aiPcB, ...myPcA, ...myPcB, ...alternatives, ...passivesA, ...passivesB };
export const researchOf = (id) => RESEARCH[id] ?? null;
