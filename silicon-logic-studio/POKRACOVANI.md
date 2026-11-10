# Pokračování práce

Aktuální stav, jak spustit, co je model a co ověřený fakt, a další kroky jsou v `../AgentMEMORY.md`.

Stručně (2026-11-10):
- Jádro simuluje skutečné vodivé sítě (tri-state, zkraty, tranzistory jako spínače, víc hodinových domén).
- Preset NV1 je skutečná karta Diamond Edge 3D 2120: host PC → PCI → NV1 → DRAM / RAMDAC → VGA monitor,
  NV1 → AD1845 → reproduktory, Saturn pad přes game port. Ověřeno testy přes konektory (`tests/nv1_card.test.js`).
- Proklik L1 deska → L2 bloky čipu → L3 RTL → L4 registry/sčítačky → L5 hradla → L6 CMOS tranzistory →
  L7 průřez tranzistoru → L8 atomy.

Spuštění: `npm install`, `npm test`, `npm run build`, `npm run desktop` (Electron).
