// Jednotky uvnitř čipů (L4): místo obecné buňky má každý blok čipu vlastní obvod podle veřejné dokumentace výrobce
// a teprve jeho bloky vedou na simulované buňky L5 (SRAM, dekodér, CAM, arbitr, sčítačka, MAC, parita, DRAM …) →
// CMOS → tranzistor podle procesu předka → atomy → kvarky. Co veřejně doložené není, má v popisku „neověřeno“.
//
// Zdroje: Intel „The Compute Architecture of Intel Processor Graphics Gen9“ (2015); Intel 64 and IA-32 Optimization
// Reference Manual 248966 (Skylake client: ring, LLC, IMC); Intel 8th/9th Gen Core datasheet vol. 1 (337344: PEG, DMI,
// display, RAPL, SVID); PCI Express Base Specification 3.0 (vrstvy, 128b/130b, LTSSM).
import { blk, w } from './pcDeepSubcircuits.js';

export const UNIT_SUBCIRCUITS = {};
const def = (key, sub) => { UNIT_SUBCIRCUITS[key] = { key, level: 4, ...sub }; };

// ================================================================ PCIe 3.0 řadič (obecně: PEG, DMI 3.0, porty PCH, hostitel GPU)
def('pcie3_ctrl', {
  name: 'Řadič PCI Express 3.0 — vrstvy protokolu',
  subtitle: 'PCI Express Base Spec 3.0: transakční vrstva (TLP pakety, kredity řízení toku), linková vrstva (pořadové číslo, LCRC, ACK/NAK, buffer pro opakování), fyzická vrstva (kódování 128b/130b, scrambler, LTSSM trénuje linku, 8 GT/s na pruh). DMI 3.0 je elektricky shodná linka x4. U GPU Ampere je verze 4.0 (16 GT/s), v desce B360 ale jede jako 3.0.',
  components: [
    blk('tl', 'TRANSAKČNÍ VRSTVA', 50, 50, [], ['TLP'], 'HLAVIČKY ČTENÍ / ZÁPISU / ZPRÁV', 210, 80),
    blk('fc', 'KREDITY ŘÍZENÍ TOKU', 50, 170, [], [], 'POSTED / NON-POSTED / COMPLETION', 210, 70),
    blk('ord', 'PRAVIDLA POŘADÍ + FRONTY', 50, 280, [], [], 'ZÁPIS NESMÍ PŘEDBĚHNOUT ZÁPIS', 210, 70),
    blk('dll', 'LINKOVÁ VRSTVA', 320, 50, ['TLP'], ['DLLP'], 'POŘADOVÉ ČÍSLO + LCRC 32 BIT', 210, 80),
    blk('replay', 'BUFFER PRO OPAKOVÁNÍ', 320, 170, [], [], 'ACK / NAK, ODESLANÉ BEZ POTVRZENÍ', 210, 70),
    blk('enc', 'KÓDOVÁNÍ 128b/130b + SCRAMBLER', 590, 50, ['DLLP'], ['SYMBOLY'], 'LFSR x²³ + x²¹ + x¹⁶ + x⁸ + x⁵ + x² + 1', 240, 80),
    blk('ltssm', 'LTSSM (TRÉNINK LINKY)', 590, 170, [], [], 'DETECT → POLLING → CONFIG → L0', 240, 70),
    blk('lanes', 'PRUHY TX/RX (SERDES)', 590, 280, ['SYMBOLY'], [], '8 GT/s, DIFERENCIÁLNÍ PÁRY', 240, 80),
  ],
  wires: [w('tl.TLP', 'dll.TLP'), w('dll.DLLP', 'enc.DLLP'), w('enc.SYMBOLY', 'lanes.SYMBOLY')],
  drills: { tl: 'cell_decoder', fc: 'FULL_ADDER', ord: 'cell_sram', dll: 'cell_parity', replay: 'cell_sram', enc: 'cell_parity', ltssm: 'cell_decoder', lanes: 'MUX' },
});

// ================================================================ Intel UHD Graphics 630 (Gen9.5 GT2)
def('gen9_gt2', {
  name: 'Intel UHD Graphics 630 — Gen9.5 GT2 (1 slice, 24 EU)',
  subtitle: 'Intel Gen9 whitepaper: „unslice“ (příkazový streamer, globální dispečer vláken, geometrická pipeline, média) + 1 slice se 3 subslicemi po 8 EU = 24 EU. EU: 7 vláken, každé 128 registrů × 32 B (4 KB), 2 jednotky SIMD-4 FPU (jedna umí i sin/cos/log). Subslice: cache instrukcí, lokální dispečer, sampler, datový port. Slice: L3 768 KB (část jako sdílená lokální paměť), pixelový back-end. GT je s jádry spojená přes kruhovou sběrnici a sdílí LLC.',
  components: [
    blk('cs', 'PŘÍKAZOVÝ STREAMER', 50, 50, [], ['PŘÍKAZY'], 'ČTE DÁVKY Z PAMĚTI', 200, 70),
    blk('gtd', 'GLOBÁLNÍ DISPEČER VLÁKEN', 50, 140, ['PŘÍKAZY'], ['VLÁKNA'], 'ROZDĚLUJE PRÁCI SUBSLICÍM', 200, 70),
    blk('geo', 'GEOMETRIE: VS · HS · TESELÁTOR · DS · GS', 50, 230, ['PŘÍKAZY'], ['TROJÚHELNÍKY'], 'FIXNÍ FUNKCE + SHADERY NA EU', 200, 90),
    blk('raster', 'CLIP · SETUP · RASTERIZÉR', 50, 340, ['TROJÚHELNÍKY'], ['PIXELY'], 'HI-Z TEST', 200, 70),
    blk('media', 'MÉDIA: MFX + VEBOX', 50, 430, [], [], 'HEVC / VP9 DEKÓDOVÁNÍ (FIXNÍ FUNKCE)', 200, 70),
    ...[0, 1, 2].map((i) => blk(`ss${i}`, `SUBSLICE ${i}: 8 EU`, 320 + i * 190, 50, ['VLÁKNA'], ['DATA'], '7 VLÁKEN × 4 KB GRF NA EU', 175, 90)),
    blk('eu', 'EU: 2× SIMD-4 FPU', 320, 170, [], [], 'FMA FP32, INT; FPU0 + SIN/COS/LOG', 175, 70),
    blk('grf', 'REGISTRY GRF 28 KB / EU', 510, 170, [], [], '7 × 128 × 32 B', 175, 70),
    blk('sampler', 'SAMPLER + CACHE TEXTUR', 700, 170, [], [], 'FILTRACE, L1/L2 SAMPLERU', 175, 70),
    blk('icache', 'CACHE INSTRUKCÍ + LOKÁLNÍ DISPEČER', 320, 270, [], [], 'V KAŽDÉ SUBSLICI', 175, 70),
    blk('l3', 'L3 GT 768 KB + SLM', 510, 270, ['DATA'], ['GTI'], 'SDÍLENÁ LOKÁLNÍ PAMĚŤ 64 KB / SUBSLICE', 175, 70),
    blk('pbe', 'PIXEL BACK-END: BARVA + Z', 700, 270, ['PIXELY'], [], 'BLENDING, KOMPRESE', 175, 70),
    blk('gti', 'GTI → KRUHOVÁ SBĚRNICE', 510, 380, ['GTI'], [], 'SDÍLÍ LLC S JÁDRY', 175, 70),
  ],
  wires: [
    w('cs.PŘÍKAZY', 'gtd.PŘÍKAZY'), w('cs.PŘÍKAZY', 'geo.PŘÍKAZY'), w('geo.TROJÚHELNÍKY', 'raster.TROJÚHELNÍKY'), w('raster.PIXELY', 'pbe.PIXELY'),
    ...[0, 1, 2].flatMap((i) => [w('gtd.VLÁKNA', `ss${i}.VLÁKNA`), w(`ss${i}.DATA`, 'l3.DATA')]), w('l3.GTI', 'gti.GTI'),
  ],
  drills: { cs: 'cell_decoder', gtd: 'cell_arbiter', geo: 'cell_mac', raster: 'cell_lt', media: 'cell_mac', ss0: 'cell_mac', ss1: 'cell_mac', ss2: 'cell_mac', eu: 'FULL_ADDER', grf: 'cell_sram', sampler: 'cell_mac', icache: 'cell_sram', l3: 'cell_sram', pbe: 'cell_lt', gti: 'cell_arbiter' },
});

// ================================================================ Coffee Lake: kruhová sběrnice + LLC
def('cfl_ring', {
  name: 'Kruhová sběrnice + LLC (Coffee Lake 8 jader)',
  subtitle: 'Optimization Manual (Skylake client): obousměrný kruh, na každé zastávce jádro + plátek LLC, dál grafika a System Agent. Plátek LLC 2 MB, 16 cest, inkluzivní (u i7-9700 dostupných 12 MB = 1,5 MB na jádro – neověřeno, jak Intel plátky zkracuje). Agent cache (CBo) adresu hashuje na plátek a drží bity „které jádro má řádek“, takže nemusí obesílat všechna jádra. Data 32 B za takt v každém směru.',
  components: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => blk(`stop${i}`, `ZASTÁVKA ${i}: JÁDRO + LLC`, 50 + (i % 4) * 210, 50 + Math.floor(i / 4) * 200, ['KRUH'], ['KRUH'], 'PLÁTEK 2 MB / 16 CEST', 190, 80)),
    blk('cbo', 'AGENT CACHE (CBo)', 50, 140, [], [], 'HASH ADRESY → PLÁTEK', 190, 50),
    blk('tags', 'TAGY + BITY JADER', 260, 140, [], [], 'INKLUZIVNÍ LLC', 190, 50),
    blk('lru', 'NÁHRADA ŘÁDKŮ', 470, 140, [], [], 'POLITIKA NEZVEŘEJNĚNA', 190, 50),
    blk('data', 'DATA LLC (SRAM)', 680, 140, [], [], '64 B ŘÁDEK', 190, 50),
    blk('gt', 'ZASTÁVKA GRAFIKY', 50, 350, ['KRUH'], [], 'UHD 630', 190, 70),
    blk('sa', 'ZASTÁVKA SYSTEM AGENT', 260, 350, ['KRUH'], [], 'PAMĚŤ, PCIe, DMI, DISPLEJ', 190, 70),
    blk('arb', 'ARBITRÁŽ KRUHU', 470, 350, [], [], 'PŘEDNOST PROVOZU NA KRUHU', 190, 70),
  ],
  wires: [
    ...[0, 1, 2, 4, 5, 6].map((i) => w(`stop${i}.KRUH`, `stop${i + 1}.KRUH`)), w('stop3.KRUH', 'stop7.KRUH'), w('stop0.KRUH', 'gt.KRUH'), w('stop4.KRUH', 'sa.KRUH'),
  ],
  drills: { ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((i) => [`stop${i}`, 'D_FF'])), cbo: 'XOR', tags: 'cell_match', lru: 'cell_lt', data: 'cell_sram', gt: 'D_FF', sa: 'D_FF', arb: 'cell_arbiter' },
});

// ================================================================ Coffee Lake: řadič paměti
def('cfl_imc', {
  name: 'Řadič paměti (IMC) — 2 kanály DDR4-2666',
  subtitle: 'Intel datasheet 337344: 2 kanály po 64 bitech, až 2 moduly na kanál (v mém PC 4 × 8 GB = dual channel), DDR4 do 2666 MT/s (41,6 GB/s). Dekodér adres prokládá kanály, banky a ranky; plánovač na kanál řadí příkazy (ACT, RD, WR, PRE) podle časování tRCD/tCL/tRP a otevřených řádků; obnova (REF) každých 7,8 µs; fyzická vrstva DDR PHY s kalibrací (write leveling, read training).',
  components: [
    blk('dec', 'DEKODÉR ADRES', 50, 50, [], ['KANÁL'], 'KANÁL · RANK · BANKA · ŘÁDEK · SLOUPEC', 220, 80),
    ...['A', 'B'].map((ch, i) => blk(`q${i}`, `FRONTA PŘÍKAZŮ KANÁL ${ch}`, 330, 50 + i * 200, ['KANÁL'], ['PŘÍKAZ'], 'ČTENÍ / ZÁPISY', 210, 70)),
    ...['A', 'B'].map((ch, i) => blk(`sch${i}`, `PLÁNOVAČ ${ch}`, 330, 135 + i * 200, [], [], 'OTEVŘENÉ ŘÁDKY PŘEDNOST', 210, 55)),
    blk('timers', 'ČASOVAČE tRCD / tCL / tRP / tRAS', 600, 50, [], [], '2666 CL16-18-18 (SPD MODULŮ)', 240, 70),
    blk('ref', 'OBNOVA (REFRESH)', 600, 140, [], [], 'REF KAŽDÝCH 7,8 µs', 240, 60),
    blk('phy', 'DDR4 PHY 2 × 64 BIT', 600, 230, ['PŘÍKAZ'], [], 'DQ / DQS, KALIBRACE ZQ', 240, 80),
    blk('train', 'TRÉNINK PAMĚTÍ', 600, 340, [], [], 'WRITE LEVELING, READ TRAINING (PŘI POST)', 240, 70),
  ],
  wires: [w('dec.KANÁL', 'q0.KANÁL'), w('dec.KANÁL', 'q1.KANÁL'), w('q0.PŘÍKAZ', 'phy.PŘÍKAZ'), w('q1.PŘÍKAZ', 'phy.PŘÍKAZ')],
  drills: { dec: 'cell_decoder', q0: 'cell_sram', q1: 'cell_sram', sch0: 'cell_arbiter', sch1: 'cell_arbiter', timers: 'cell_lt', ref: 'FULL_ADDER', phy: 'MUX', train: 'cell_lt' },
});

// ================================================================ Coffee Lake: řízení napájení (PCU)
def('cfl_pcu', {
  name: 'PCU — řízení napájení a teploty (Coffee Lake)',
  subtitle: 'Intel datasheet 337344: mikrořadič s firmwarem řídí P-stavy (Speed Shift / HWP), turbo do 4,7 GHz, limity RAPL (PL1 = TDP 65 W, PL2 krátkodobě), C-stavy jader a balíku, digitální teplotní čidla v každém jádře (TjMax 100 °C), PROCHOT#. Napětí si od VRM desky říká přes sběrnici SVID (Coffee Lake nemá integrovaný FIVR). Změřeno na mém PC: Vcore 1,19–1,21 V.',
  components: [
    blk('fw', 'MIKROŘADIČ PCU + FIRMWARE', 50, 50, [], ['ROZHODNUTÍ'], 'ALGORITMUS NEZVEŘEJNĚN', 230, 80),
    blk('dts', 'TEPLOTNÍ ČIDLA (DTS) × 8 + GT', 50, 170, [], ['TEPLOTA'], 'TjMax 100 °C', 230, 70),
    blk('rapl', 'RAPL: PL1 65 W · PL2', 50, 280, [], ['LIMIT'], 'KLOUZAVÝ PRŮMĚR PŘÍKONU', 230, 70),
    blk('pstate', 'P-STAVY + TURBO', 340, 50, ['ROZHODNUTÍ', 'TEPLOTA', 'LIMIT'], ['KMITOČET', 'VID'], 'NÁSOBIČ × 100 MHz, MAX 4,7 GHz', 230, 100),
    blk('cstate', 'C-STAVY JADER A BALÍKU', 340, 190, [], [], 'VYPÍNÁNÍ HODIN A NAPÁJENÍ', 230, 70),
    blk('pll', 'PLL JADER, KRUHU, GT', 630, 50, ['KMITOČET'], [], '100 MHz BCLK × NÁSOBIČ', 210, 70),
    blk('svid', 'SVID → VRM DESKY', 630, 160, ['VID'], [], 'VCORE ~1,20 V (ZMĚŘENO)', 210, 70),
    blk('prochot', 'PROCHOT# + THERMTRIP#', 630, 260, [], [], 'NOUZOVÉ ŠKRCENÍ / VYPNUTÍ', 210, 70),
  ],
  wires: [w('fw.ROZHODNUTÍ', 'pstate.ROZHODNUTÍ'), w('dts.TEPLOTA', 'pstate.TEPLOTA'), w('rapl.LIMIT', 'pstate.LIMIT'), w('pstate.KMITOČET', 'pll.KMITOČET'), w('pstate.VID', 'svid.VID')],
  drills: { fw: 'FULL_ADDER', dts: 'cell_lt', rapl: 'cell_mac', pstate: 'cell_lt', cstate: 'cell_decoder', pll: 'D_FF', svid: 'MUX', prochot: 'cell_lt' },
});

// ================================================================ Coffee Lake: System Agent
def('cfl_sa', {
  name: 'System Agent (uncore) — směrování paměti a I/O',
  subtitle: 'Intel datasheet 337344: System Agent spojuje kruh s řadičem paměti, PEG (PCIe x16), DMI do PCH a display enginem. Obsahuje dekodér adres (paměť vs. MMIO vs. PCI konfigurace), IOMMU VT-d pro DMA zařízení, arbitr požadavků a koherenci I/O (snoop do LLC). Vnitřní propojení nezveřejněno.',
  components: [
    blk('ring', 'ROZHRANÍ KRUHU', 50, 50, [], ['POŽADAVKY'], 'Z JADER A GT', 200, 70),
    blk('dec', 'DEKODÉR ADRES', 320, 50, ['POŽADAVKY'], ['CÍL'], 'DRAM / MMIO / CONFIG', 210, 70),
    blk('arb', 'ARBITR POŽADAVKŮ', 320, 160, ['CÍL'], [], 'JÁDRA, GT, DMA', 210, 70),
    blk('vtd', 'IOMMU VT-d', 600, 50, [], [], 'PŘEKLAD ADRES DMA ZAŘÍZENÍ', 210, 70),
    blk('coh', 'KOHERENCE I/O', 600, 160, [], [], 'SNOOP DO LLC PŘI DMA', 210, 70),
    blk('cfg', 'PCI KONFIGURACE (BUS 0)', 50, 160, [], [], 'REGISTRY ZAŘÍZENÍ 0:0.0', 200, 70),
  ],
  wires: [w('ring.POŽADAVKY', 'dec.POŽADAVKY'), w('dec.CÍL', 'arb.CÍL')],
  drills: { ring: 'D_FF', dec: 'cell_decoder', arb: 'cell_arbiter', vtd: 'cell_match', coh: 'cell_match', cfg: 'cell_sram' },
});

// ================================================================ Gen9 display engine
def('gen9_display', {
  name: 'Display engine (Gen9) — pipe, roviny, porty DDI',
  subtitle: 'Intel datasheet 337344 + PRM Gen9: 3 nezávislé pipe (A, B, C), v každé roviny (primární, sprite, kurzor) s blendingem a škálováním, časovač (HTOTAL/VTOTAL, sync), porty DDI (HDMI 1.4b, DP 1.2, DVI) s vlastními PLL. Na B360-PLUS vyvedené HDMI, DVI-D a D-Sub (D-Sub přes převodník na desce – neověřeno). V projektu MŮJ PC + 2× P100 jede obraz právě odsud.',
  components: [
    blk('planes', 'ROVINY: PRIMÁRNÍ · SPRITE · KURZOR', 50, 50, [], ['PIXELY'], 'ČTOU FRAMEBUFFER Z PAMĚTI', 230, 80),
    blk('blend', 'BLENDING + ŠKÁLOVAČ', 330, 50, ['PIXELY'], ['RGB'], 'ALFA, BARVY', 200, 80),
    blk('timing', 'ČASOVAČ PIPE (HTOTAL / VTOTAL)', 330, 170, [], ['SYNC'], '1920 × 1080 @ 60 Hz NA MONITORU', 200, 80),
    blk('ddi', 'PORT DDI: TMDS (HDMI)', 600, 50, ['RGB', 'SYNC'], [], '8b/10b, 3 DATOVÉ PÁRY + HODINY', 220, 80),
    blk('pll', 'PLL PORTU (DPLL)', 600, 170, [], [], 'PIXELOVÉ HODINY 148,5 MHz', 220, 70),
    blk('pipes', '3 PIPE A / B / C', 50, 170, [], [], 'AŽ 3 MONITORY', 230, 70),
  ],
  wires: [w('planes.PIXELY', 'blend.PIXELY'), w('blend.RGB', 'ddi.RGB'), w('timing.SYNC', 'ddi.SYNC')],
  drills: { planes: 'cell_sram', blend: 'cell_mac', timing: 'cell_lt', ddi: 'MUX', pll: 'D_FF', pipes: 'cell_decoder' },
});

// dvojkliky bloků jednotek → buňky L5
for (const sub of Object.values(UNIT_SUBCIRCUITS)) {
  for (const comp of sub.components) if (sub.drills?.[comp.id]) comp.drill = sub.drills[comp.id];
  delete sub.drills;
}
