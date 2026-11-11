// Jednotky uvnitř čipů (L4): místo obecné buňky má každý blok čipu vlastní obvod podle veřejné dokumentace výrobce
// a teprve jeho bloky vedou na simulované buňky L5 (SRAM, dekodér, CAM, arbitr, sčítačka, MAC, parita, DRAM …) →
// CMOS → tranzistor podle procesu předka → atomy → kvarky. Co veřejně doložené není, má v popisku „neověřeno“.
//
// Zdroje: Intel „The Compute Architecture of Intel Processor Graphics Gen9“ (2015); Intel 64 and IA-32 Optimization
// Reference Manual 248966 (Skylake client: ring, LLC, IMC); Intel 8th/9th Gen Core datasheet vol. 1 (337344: PEG, DMI,
// display, RAPL, SVID); PCI Express Base Specification 3.0 (vrstvy, 128b/130b, LTSSM).
import { blk, w } from './pcDeepSubcircuits.js';

export const UNIT_SUBCIRCUITS = {};
// level 4 = jednotka čipu; 4.5 = podjednotka uvnitř jednotky L4 (např. Tensor Core v SM) – dvojklik musí jít vždy hlouběji
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

// ================================================================ čipset B360 (Intel 300 Series PCH, datasheet 337347)
def('pch_xhci', {
  name: 'Řadič USB xHCI (B360) — USB 3.1 i USB 2.0',
  subtitle: 'Intel 300 Series PCH datasheet 337347: jediný řadič xHCI obsluhuje všechny porty (USB 2.0 i 3.1 Gen1/Gen2). Ovladač mu dává práci přes kruhové fronty v paměti (příkazový kruh, přenosové kruhy pro každý endpoint, kruh událostí), řadič je sám čte a zapisuje DMA. USB 2.0 část: 480/12/1,5 Mb/s, NRZI s vkládáním bitů; USB 3.1: 5/10 Gb/s, kódování 8b/10b (Gen1) a 128b/132b (Gen2) – linky Gen1/Gen2 sdílí s HSIO.',
  components: [
    blk('mmio', 'REGISTRY xHCI (MMIO)', 50, 50, [], ['DOORBELL'], 'CAPABILITY, OPERATIONAL, RUNTIME', 210, 80),
    blk('cmd', 'PŘÍKAZOVÝ KRUH', 50, 170, ['DOORBELL'], ['TRB'], 'ADRESACE ZAŘÍZENÍ, ENDPOINTY', 210, 70),
    blk('xfer', 'PŘENOSOVÉ KRUHY (DMA)', 320, 50, ['TRB'], ['DATA'], 'BULK / INTERRUPT / ISOCH / CONTROL', 220, 80),
    blk('evt', 'KRUH UDÁLOSTÍ + PŘERUŠENÍ', 320, 170, [], [], 'MSI DO CPU', 220, 70),
    blk('sch', 'PLÁNOVAČ (MIKRORÁMCE 125 µs)', 320, 280, [], [], 'PERIODICKÉ PŘENOSY NAPŘED', 220, 70),
    blk('u2', 'USB 2.0: SIE + PHY', 600, 50, ['DATA'], [], 'NRZI, VKLÁDÁNÍ BITŮ, CRC5 / CRC16', 230, 80),
    blk('u3', 'USB 3.1: LINKOVÁ + FYZICKÁ VRSTVA', 600, 170, ['DATA'], [], '8b/10b · 128b/132b, CRC32', 230, 80),
    blk('ports', 'ROOT HUB + PORTY', 600, 290, [], [], 'DETEKCE PŘIPOJENÍ, OVERCURRENT', 230, 70),
  ],
  wires: [w('mmio.DOORBELL', 'cmd.DOORBELL'), w('cmd.TRB', 'xfer.TRB'), w('xfer.DATA', 'u2.DATA'), w('xfer.DATA', 'u3.DATA')],
  drills: { mmio: 'cell_sram', cmd: 'cell_decoder', xfer: 'cell_sram', evt: 'cell_arbiter', sch: 'cell_arbiter', u2: 'cell_parity', u3: 'cell_parity', ports: 'cell_lt' },
});

def('pch_ahci', {
  name: 'Řadič SATA AHCI (B360) — 6 portů 6 Gb/s',
  subtitle: 'Intel 300 Series PCH datasheet 337347 + specifikace AHCI 1.3: každý port má v paměti seznam až 32 příkazů (NCQ), řadič posílá rámce FIS (Register, DMA Setup, Data) přes linkovou vrstvu SATA (primitiva, CRC32, scrambler) a fyzickou vrstvu 6 Gb/s s kódováním 8b/10b. Na desce: 6 portů + M.2_1 v režimu SATA (pak vypne SATA6G_2). V mém PC zapojené disky nejsou, 970 EVO Plus jde přes NVMe.',
  components: [
    blk('hba', 'REGISTRY HBA (ABAR)', 50, 50, [], ['PŘÍKAZY'], 'GLOBÁLNÍ + PRO KAŽDÝ PORT', 210, 70),
    blk('cl', 'SEZNAM PŘÍKAZŮ (32 SLOTŮ NCQ)', 50, 160, ['PŘÍKAZY'], ['FIS'], 'PRDT = TABULKA DMA', 210, 80),
    blk('dma', 'DMA ENGINE', 320, 50, [], [], 'DATA MEZI DISKEM A RAM', 200, 70),
    blk('tl', 'TRANSPORTNÍ VRSTVA (FIS)', 320, 160, ['FIS'], ['RÁMCE'], 'REGISTER / DMA SETUP / DATA', 200, 80),
    blk('ll', 'LINKOVÁ VRSTVA', 580, 50, ['RÁMCE'], ['SYMBOLY'], 'PRIMITIVA, CRC32, SCRAMBLER', 220, 70),
    blk('phy', 'FYZICKÁ VRSTVA 6 Gb/s', 580, 160, ['SYMBOLY'], [], '8b/10b, OOB SIGNALIZACE', 220, 70),
  ],
  wires: [w('hba.PŘÍKAZY', 'cl.PŘÍKAZY'), w('cl.FIS', 'tl.FIS'), w('tl.RÁMCE', 'll.RÁMCE'), w('ll.SYMBOLY', 'phy.SYMBOLY')],
  drills: { hba: 'cell_sram', cl: 'cell_sram', dma: 'FULL_ADDER', tl: 'cell_decoder', ll: 'cell_parity', phy: 'MUX' },
});

def('pch_hda', {
  name: 'Řadič HD Audio (B360) — linka ke kodeku ALC887',
  subtitle: 'Intel High Definition Audio Specification 1.0a: řadič posílá kodeku příkazy přes kruh CORB a odpovědi čte z RIRB, zvukové proudy přenáší DMA podle seznamu bufferů (BDL). Linka HDA: hodiny BCLK 24 MHz, rámec 20,83 µs (48 kHz), výstup SDO, vstupy SDI, synchronizace SYNC. Kodek ALC887 je na desce zvlášť.',
  components: [
    blk('corb', 'CORB (PŘÍKAZY KODEKU)', 50, 50, [], ['VERBY'], 'KRUH V PAMĚTI', 200, 70),
    blk('rirb', 'RIRB (ODPOVĚDI)', 50, 150, [], [], 'KRUH V PAMĚTI', 200, 70),
    blk('dma', 'DMA PROUDŮ (BDL)', 320, 50, [], ['VZORKY'], 'VÝSTUPNÍ A VSTUPNÍ PROUDY', 200, 70),
    blk('link', 'LINKA HDA: BCLK 24 MHz · SDO · SDI · SYNC', 580, 50, ['VERBY', 'VZORKY'], [], 'RÁMEC 48 kHz', 250, 80),
    blk('wall', 'ČÍTAČ RÁMCŮ (WALL CLOCK)', 320, 150, [], [], 'SYNCHRONIZACE PROUDŮ', 200, 70),
  ],
  wires: [w('corb.VERBY', 'link.VERBY'), w('dma.VZORKY', 'link.VZORKY')],
  drills: { corb: 'cell_sram', rirb: 'cell_sram', dma: 'FULL_ADDER', link: 'MUX', wall: 'FULL_ADDER' },
});

def('pch_spi', {
  name: 'SPI + eSPI/LPC (B360) — BIOS flash a Super I/O',
  subtitle: 'Intel datasheet 337347: řadič SPI čte flash s BIOSem; flash je rozdělená deskriptorem na oblasti (Descriptor, CSME, BIOS, případně GbE) s právy čtení/zápisu. Soft straps v deskriptoru nastavují i Flex I/O. Rozhraní eSPI nebo LPC vede k Super I/O NCT6796D – které z nich ASUS použil, neověřeno.',
  components: [
    blk('desc', 'DESKRIPTOR FLASH', 50, 50, [], ['OBLASTI'], 'DESCRIPTOR · CSME · BIOS · SOFT STRAPS', 230, 80),
    blk('ctl', 'ŘADIČ SPI (ČTENÍ / ZÁPIS / MAZÁNÍ)', 330, 50, ['OBLASTI'], ['SPI'], 'OCHRANA OBLASTÍ', 240, 80),
    blk('pins', 'SPI: CLK · CS# · MOSI · MISO', 620, 50, ['SPI'], [], 'FLASH 128 Mb NA DESCE', 220, 70),
    blk('espi', 'eSPI / LPC → SUPER I/O', 330, 180, [], [], 'NCT6796D (OVĚŘENO)', 240, 70),
  ],
  wires: [w('desc.OBLASTI', 'ctl.OBLASTI'), w('ctl.SPI', 'pins.SPI')],
  drills: { desc: 'cell_eeprom', ctl: 'cell_decoder', pins: 'MUX', espi: 'MUX' },
});

def('pch_smbus', {
  name: 'SMBus řadič (B360) — čtení SPD pamětí',
  subtitle: 'Intel datasheet 337347 + SMBus 2.0: dvouvodičová sběrnice (SMBCLK, SMBDATA, otevřený kolektor s pull-upy), 100 kHz. BIOS přes ni čte SPD EEPROM všech 4 modulů (adresy 0x50–0x53) a podle nich nastaví časování 2666 CL16. Stejnou sběrnici čte i LibreHardwareMonitor.',
  components: [
    blk('host', 'HOST ŘADIČ (REGISTRY)', 50, 50, [], ['TRANSAKCE'], 'BYTE / WORD / BLOCK READ', 210, 70),
    blk('fsm', 'STAVOVÝ AUTOMAT: START · ADRESA · ACK · DATA · STOP', 320, 50, ['TRANSAKCE'], ['SCL/SDA'], 'MASTER', 270, 80),
    blk('pins', 'SMBCLK + SMBDATA (OTEVŘENÝ KOLEKTOR)', 650, 50, ['SCL/SDA'], [], 'PULL-UPY NA DESCE', 220, 80),
    blk('spd', 'SPD 0x50 · 0x51 · 0x52 · 0x53', 650, 170, [], [], '4 MODULY HYPERX FURY', 220, 70),
  ],
  wires: [w('host.TRANSAKCE', 'fsm.TRANSAKCE'), w('fsm.SCL/SDA', 'pins.SCL/SDA')],
  drills: { host: 'cell_sram', fsm: 'cell_decoder', pins: 'AND', spd: 'cell_eeprom' },
});

def('csme12', {
  name: 'CSME 12 — Converged Security and Management Engine',
  subtitle: 'Intel (veřejné prezentace a výzkum Positive Technologies): od ME 11 malé x86 jádro (Minute IA, odvozené z Quarku) s vlastní ROM, SRAM a kryptografickým blokem (AES, SHA, RSA), firmware leží v oblasti CSME ve SPI flash. Běží i ve vypnutém PC z pohotovostního napájení. Na B360 bez vzdálené správy AMT; poskytuje fTPM (PTT) a Boot Guard. Vnitřní zapojení Intel nezveřejňuje.',
  components: [
    blk('core', 'JÁDRO MINUTE IA (x86)', 50, 50, [], ['SBĚRNICE'], 'ODVOZENÉ Z QUARKU', 210, 80),
    blk('rom', 'ROM (ZAVADĚČ)', 320, 50, ['SBĚRNICE'], [], 'OVĚŘUJE PODPIS FIRMWARU', 190, 70),
    blk('sram', 'SRAM CSME', 320, 150, ['SBĚRNICE'], [], 'VELIKOST NEZVEŘEJNĚNA', 190, 70),
    blk('crypto', 'KRYPTO: AES · SHA · RSA', 570, 50, ['SBĚRNICE'], [], 'fTPM (PTT), BOOT GUARD', 220, 80),
    blk('dma', 'DMA DO HLAVNÍ PAMĚTI', 570, 170, ['SBĚRNICE'], [], 'PŘES PCH', 220, 70),
    blk('fuses', 'POJISTKY (KLÍČE, KONFIGURACE)', 50, 170, [], [], 'JEDNORÁZOVĚ ZAPSANÉ', 210, 70),
  ],
  wires: [w('core.SBĚRNICE', 'rom.SBĚRNICE'), w('core.SBĚRNICE', 'sram.SBĚRNICE'), w('core.SBĚRNICE', 'crypto.SBĚRNICE'), w('core.SBĚRNICE', 'dma.SBĚRNICE')],
  drills: { core: 'FULL_ADDER', rom: 'cell_decoder', sram: 'cell_sram', crypto: 'XOR', dma: 'FULL_ADDER', fuses: 'cell_eeprom' },
});

def('pch_hsio', {
  name: 'Flex I/O (HSIO) — sdílené vysokorychlostní linky B360',
  subtitle: 'Intel datasheet 337347: 24 aktivních linek HSIO, každá je buď PCIe 3.0, SATA 6 Gb/s, nebo USB 3.1 – volí se pevně soft strapy v deskriptoru flash podle toho, co výrobce desky na linku zapojil. Která linka jde u PRIME B360-PLUS kam, je neověřené (ASUS to nezveřejňuje).',
  components: [
    blk('straps', 'SOFT STRAPY Z DESKRIPTORU', 50, 50, [], ['VOLBA'], 'NASTAVENO VÝROBCEM DESKY', 220, 70),
    ...[0, 1, 2, 3].map((i) => blk(`ln${i}`, `LINKA ${i * 6}–${i * 6 + 5}: PCIe / SATA / USB 3`, 330, 50 + i * 85, ['VOLBA'], [], 'MULTIPLEXOR', 240, 70)),
    blk('phy', 'SDÍLENÁ FYZICKÁ VRSTVA', 640, 50, [], [], 'SERDES S PLL, EKVALIZACE', 220, 70),
  ],
  wires: [0, 1, 2, 3].map((i) => w('straps.VOLBA', `ln${i}.VOLBA`)),
  drills: { straps: 'cell_eeprom', ln0: 'MUX', ln1: 'MUX', ln2: 'MUX', ln3: 'MUX', phy: 'D_FF' },
});

def('pch_icc', {
  name: 'ICC — integrovaný generátor hodin (B360)',
  subtitle: 'Intel datasheet 337347: z krystalu na desce (kmitočet neověřen) dělá PLL referenční hodiny 100 MHz pro procesor (BCLK), PCIe sloty a M.2 a další interní takty. Hodiny reálného času RTC běží z baterie CR2032 (32,768 kHz).',
  components: [
    blk('xtal', 'OSCILÁTOR KRYSTALU', 50, 50, [], ['REF'], 'KRYSTAL NA DESCE', 200, 70),
    blk('pll', 'PLL + DĚLIČKY', 320, 50, ['REF'], ['100 MHz'], 'FÁZOVÝ ZÁVĚS', 200, 70),
    blk('out', 'VÝSTUPY 100 MHz (DIFERENCIÁLNÍ)', 580, 50, ['100 MHz'], [], 'BCLK, PCIe, M.2', 230, 70),
    blk('rtc', 'RTC 32,768 kHz + CMOS', 320, 170, [], [], 'BATERIE CR2032', 200, 70),
  ],
  wires: [w('xtal.REF', 'pll.REF'), w('pll.100 MHz', 'out.100 MHz')],
  drills: { xtal: 'NOT', pll: 'D_FF', out: 'MUX', rtc: 'FULL_ADDER' },
});

// ================================================================ čipy na desce B360-PLUS
def('rtl8111h', {
  name: 'Realtek RTL8111H — síťový řadič 1 Gb/s',
  subtitle: 'Realtek: řadič Gigabit Ethernet s integrovanou fyzickou vrstvou, k PCH přes PCIe x1. MAC přenáší rámce DMA podle kruhů deskriptorů a počítá kontrolní součet FCS (CRC32) a kontrolní součty IP/TCP/UDP. PHY 1000BASE-T: 4 páry kroucené dvojlinky, kódování PAM-5 na 125 MBd, potlačení ozvěny a přeslechů v DSP, automatické křížení MDI/MDI-X. Vnitřní zapojení nezveřejněno.',
  components: [
    blk('pcie', 'PCIe x1 ROZHRANÍ', 50, 50, [], ['DMA'], 'K PCH', 190, 70),
    blk('rings', 'KRUHY DESKRIPTORŮ TX / RX', 50, 160, ['DMA'], ['RÁMCE'], 'V HLAVNÍ PAMĚTI', 190, 70),
    blk('mac', 'MAC: RÁMCE + FCS (CRC32)', 300, 50, ['RÁMCE'], ['GMII'], 'KONTROLNÍ SOUČTY IP/TCP', 220, 80),
    blk('fifo', 'FIFO TX / RX', 300, 170, [], [], 'VYROVNÁNÍ RYCHLOSTÍ', 220, 70),
    blk('pcs', 'PCS: KÓDOVÁNÍ PAM-5', 580, 50, ['GMII'], ['SYMBOLY'], '4 PÁRY × 125 MBd', 220, 70),
    blk('dsp', 'DSP: POTLAČENÍ OZVĚNY + PŘESLECHŮ', 580, 150, ['SYMBOLY'], [], 'ADAPTIVNÍ FILTRY', 220, 80),
    blk('afe', 'ANALOG: DAC / ADC + MDI-X', 580, 260, [], [], 'KONEKTOR RJ-45', 220, 70),
  ],
  wires: [w('pcie.DMA', 'rings.DMA'), w('rings.RÁMCE', 'mac.RÁMCE'), w('mac.GMII', 'pcs.GMII'), w('pcs.SYMBOLY', 'dsp.SYMBOLY')],
  drills: { pcie: 'MUX', rings: 'cell_sram', mac: 'cell_parity', fifo: 'cell_sram', pcs: 'cell_decoder', dsp: 'cell_mac', afe: 'cell_lt' },
});

def('alc887', {
  name: 'Realtek ALC887-VD2 — zvukový kodek HD Audio',
  subtitle: 'Realtek datasheet ALC887: kodek HD Audio, 8 kanálů výstupu (7.1) přes DAC, 2 stereo ADC pro mikrofon/linku, mixéry, zesilovač sluchátek, detekce zasunutého jacku. K PCH přes linku HDA (BCLK 24 MHz). Rozlišení a odstup signálu podle datasheetu – přesná čísla neověřena.',
  components: [
    blk('link', 'ROZHRANÍ HDA (SDO / SDI)', 50, 50, [], ['VZORKY'], 'Z PCH B360', 200, 70),
    blk('widgets', 'WIDGETY: VERBY → NASTAVENÍ', 50, 160, [], [], 'PROPOJENÍ UZLŮ KODEKU', 200, 70),
    blk('dac', 'DAC 7.1 (SIGMA-DELTA)', 320, 50, ['VZORKY'], ['ANALOG'], '4 STEREO PÁRY', 200, 70),
    blk('adc', 'ADC STEREO × 2', 320, 160, [], ['VZORKY'], 'MIKROFON, LINKA', 200, 70),
    blk('mix', 'MIXÉRY + HLASITOST', 580, 50, ['ANALOG'], ['VÝSTUP'], '', 200, 70),
    blk('hp', 'ZESILOVAČ SLUCHÁTEK', 580, 160, ['VÝSTUP'], [], 'JACKY VZADU A NA ČELE', 200, 70),
    blk('jack', 'DETEKCE JACKU', 580, 270, [], [], 'ODPOROVÁ SÍŤ', 200, 70),
  ],
  wires: [w('link.VZORKY', 'dac.VZORKY'), w('dac.ANALOG', 'mix.ANALOG'), w('mix.VÝSTUP', 'hp.VÝSTUP')],
  drills: { link: 'MUX', widgets: 'cell_decoder', dac: 'cell_mac', adc: 'cell_lt', mix: 'cell_mac', hp: 'cell_buck', jack: 'cell_lt' },
});

// ================================================================ periferie: USB zařízení a MCU klávesnice
def('usb_fs_device', {
  name: 'USB 2.0 rozhraní zařízení (full speed 12 Mb/s)',
  subtitle: 'USB 2.0 Specification: klávesnice, myš i mikrofon jsou zařízení full speed. Diferenciální pár D+/D−, kódování NRZI s vložením nuly po 6 jedničkách, paket = SYNC + PID + data + CRC5/CRC16 + EOP. SIE skládá pakety a odpovídá ACK/NAK, endpoint 0 slouží k výčtu (deskriptory), HID data jdou přerušovacím endpointem dotazovaným každou 1 ms (1000 Hz).',
  components: [
    blk('phy', 'TRANSCEIVER D+ / D−', 50, 50, [], ['BITY'], 'PULL-UP 1,5 kΩ NA D+ = FULL SPEED', 220, 80),
    blk('nrzi', 'NRZI + VKLÁDÁNÍ BITŮ', 320, 50, ['BITY'], ['PAKETY'], 'SYNC, EOP', 200, 70),
    blk('sie', 'SIE: PID · CRC5 / CRC16 · ACK / NAK', 580, 50, ['PAKETY'], ['ENDPOINTY'], '', 240, 80),
    blk('ep0', 'ENDPOINT 0: DESKRIPTORY', 320, 170, ['ENDPOINTY'], [], 'VÝČET PŘI PŘIPOJENÍ', 200, 70),
    blk('ep1', 'ENDPOINT 1 IN: HID / AUDIO', 580, 170, ['ENDPOINTY'], [], 'DOTAZ KAŽDOU 1 ms', 240, 70),
  ],
  wires: [w('phy.BITY', 'nrzi.BITY'), w('nrzi.PAKETY', 'sie.PAKETY'), w('sie.ENDPOINTY', 'ep0.ENDPOINTY'), w('sie.ENDPOINTY', 'ep1.ENDPOINTY')],
  drills: { phy: 'cell_lt', nrzi: 'XOR', sie: 'cell_parity', ep0: 'cell_sram', ep1: 'cell_sram' },
});

def('cortex_m0', {
  name: 'ARM Cortex-M0 — jádro MCU klávesnice (NXP LPC11U37F)',
  subtitle: 'ARM Cortex-M0 Technical Reference Manual: architektura ARMv6-M, instrukce Thumb, 3stupňová pipeline (fetch, decode, execute), 16 registrů r0–r15 po 32 bitech, NVIC až 32 přerušení, sběrnice AHB-Lite. LPC11U37F: 128 KB flash, USB device na čipu. Že je v klávesnici právě tento MCU, je jen z výpisu vyhledávače (TechPowerUp).',
  components: [
    blk('fetch', 'FETCH (32 BIT, 2 INSTRUKCE)', 50, 50, [], ['INSTR'], 'Z FLASH PŘES AHB-LITE', 210, 70),
    blk('dec', 'DECODE THUMB', 320, 50, ['INSTR'], ['ŘÍZENÍ'], '16bitové instrukce', 190, 70),
    blk('rf', 'REGISTRY r0–r15', 320, 160, ['ŘÍZENÍ'], ['OPERANDY'], 'SP, LR, PC', 190, 70),
    blk('alu', 'ALU 32 BIT + POSUVNÍK', 570, 50, ['OPERANDY'], [], 'SČÍTÁNÍ, LOGIKA', 200, 70),
    blk('mul', 'NÁSOBIČKA 32 × 32', 570, 160, ['OPERANDY'], [], 'VARIANTA PODLE VÝROBCE', 200, 70),
    blk('nvic', 'NVIC (PŘERUŠENÍ)', 50, 160, [], [], 'USB, ČASOVAČE, GPIO', 210, 70),
    blk('mem', 'FLASH 128 KB + SRAM', 50, 270, [], [], 'PROGRAM SKENOVÁNÍ MATICE', 210, 70),
  ],
  wires: [w('fetch.INSTR', 'dec.INSTR'), w('dec.ŘÍZENÍ', 'rf.ŘÍZENÍ'), w('rf.OPERANDY', 'alu.OPERANDY'), w('rf.OPERANDY', 'mul.OPERANDY')],
  drills: { fetch: 'D_FF', dec: 'cell_decoder', rf: 'cell_sram', alu: 'FULL_ADDER', mul: 'cell_mac', nvic: 'cell_arbiter', mem: 'cell_eeprom' },
});

// ================================================================ grafické čipy NVIDIA (GA104 v RTX 3060 Ti, GP100 v Tesla P100)
// Zdroje: NVIDIA Ampere GA102 GPU Architecture whitepaper V2 (GA104 v příloze), Pascal GP100 whitepaper WP-08019,
// Micron GDDR6X technický brief (PAM4, MTA), JEDEC JESD235 (HBM / HBM2), SK hynix HBM2 4-Hi.
def('nv_l2', {
  name: 'L2 cache GPU — plátky u řadičů paměti',
  subtitle: 'Whitepapery GA102 / GP100: L2 je rozdělená na plátky, každý patří k jednomu řadiči paměti, a sdílí ji všechny SM přes crossbar. GA104: 4 MB (8 × 512 KB), GP100: 4 MB. L2 dělá i atomické operace a kompresi barev; řádek 128 B v sektorech po 32 B.',
  components: [
    blk('xbar', 'CROSSBAR Z GPC', 50, 50, [], ['POŽADAVKY'], 'KAŽDÝ SM K KAŽDÉMU PLÁTKU', 210, 80),
    blk('hash', 'HASH ADRESY → PLÁTEK', 50, 170, [], [], 'ROZLOŽENÍ ZÁTĚŽE', 210, 70),
    ...[0, 1, 2, 3].map((i) => blk(`sl${i}`, `PLÁTEK ${i * 2}–${i * 2 + 1}`, 330 + (i % 2) * 230, 50 + Math.floor(i / 2) * 120, ['POŽADAVKY'], ['ŘADIČ'], 'TAGY + DATA 128 B ŘÁDEK', 210, 90)),
    blk('atom', 'ATOMICKÉ OPERACE', 330, 290, [], [], 'ADD, CAS, MIN/MAX V L2', 210, 70),
    blk('comp', 'KOMPRESE BAREV / DAT', 560, 290, [], [], 'BEZZTRÁTOVÁ', 210, 70),
  ],
  wires: [0, 1, 2, 3].map((i) => w('xbar.POŽADAVKY', `sl${i}.POŽADAVKY`)),
  drills: { xbar: 'cell_arbiter', hash: 'XOR', sl0: 'cell_sram', sl1: 'cell_sram', sl2: 'cell_sram', sl3: 'cell_sram', atom: 'FULL_ADDER', comp: 'cell_decoder' },
});

def('gddr6x_ctrl', {
  name: 'Řadič paměti GDDR6X — 32 bit (1 čip)',
  subtitle: 'GA102 whitepaper + Micron GDDR6X: každý řadič obsluhuje jeden čip x32 jako 2 nezávislé kanály po 16 bitech. Signalizace PAM4 (2 bity na symbol, 19 Gb/s na pin u RTX 3060 Ti GDDR6X), kódování MTA omezuje plné přechody mezi úrovněmi, EDC hlídá přenos kontrolním CRC a chybný přenos se opakuje. Plánovač řadí příkazy podle otevřených řádků jako u DDR.',
  components: [
    blk('q', 'FRONTA POŽADAVKŮ Z L2', 50, 50, [], ['PŘÍKAZ'], 'ČTENÍ / ZÁPISY', 210, 70),
    blk('sch', 'PLÁNOVAČ + ČASOVAČE', 50, 150, ['PŘÍKAZ'], ['CA'], '16 BANK, 4 SKUPINY', 210, 70),
    blk('mta', 'KÓDOVÁNÍ MTA', 320, 50, [], ['SYMBOLY'], 'BEZ SKOKU 0 ↔ 3', 200, 70),
    blk('edc', 'EDC: CRC + OPAKOVÁNÍ', 320, 150, [], [], 'CHYBA PŘENOSU → ZNOVU', 200, 70),
    blk('pam4', 'PAM4 PHY 2 × 16 BIT', 580, 50, ['SYMBOLY', 'CA'], [], '4 ÚROVNĚ NAPĚTÍ, 19 Gb/s', 220, 80),
    blk('train', 'TRÉNINK LINKY', 580, 170, [], [], 'ÚROVNĚ PAM4, ČASOVÁNÍ', 220, 70),
  ],
  wires: [w('q.PŘÍKAZ', 'sch.PŘÍKAZ'), w('mta.SYMBOLY', 'pam4.SYMBOLY'), w('sch.CA', 'pam4.CA')],
  drills: { q: 'cell_sram', sch: 'cell_arbiter', mta: 'cell_decoder', edc: 'cell_parity', pam4: 'cell_lt', train: 'cell_lt' },
});

def('gddr6x_chip', {
  name: 'Čip GDDR6X 8 Gb x32 (Micron)',
  subtitle: 'Micron GDDR6X: 8 Gb, rozhraní x32 jako 2 kanály po 16 bitech, každý kanál 16 bank ve 4 skupinách, I/O PAM4. Na RTX 3060 Ti GDDR6X 8 čipů = 8 GB, 256 bit. Výrobce čipů na mé kartě neověřen (GDDR6X ale dělá jen Micron).',
  components: [
    ...['A', 'B'].map((ch, i) => blk(`ch${i}`, `KANÁL ${ch} · 16 BIT`, 50 + i * 300, 50, [], ['PŘÍKAZ'], 'ROZHRANÍ CA + DQ', 250, 70)),
    ...['A', 'B'].map((ch, i) => blk(`dec${i}`, `DEKODÉRY ŘÁDKŮ / SLOUPCŮ ${ch}`, 50 + i * 300, 160, ['PŘÍKAZ'], ['WL'], '', 250, 70)),
    ...['A', 'B'].map((ch, i) => blk(`arr${i}`, `16 BANK ${ch} (4 SKUPINY)`, 50 + i * 300, 270, ['WL'], [], 'BUŇKY 1T1C', 250, 80)),
    blk('io', 'I/O PAM4 + EDC', 650, 50, [], [], 'ZPĚTNÝ KANÁL CRC', 220, 70),
    blk('pump', 'NÁBOJOVÉ PUMPY + REFRESH', 650, 160, [], [], '', 220, 70),
  ],
  wires: [0, 1].flatMap((i) => [w(`ch${i}.PŘÍKAZ`, `dec${i}.PŘÍKAZ`), w(`dec${i}.WL`, `arr${i}.WL`)]),
  drills: { ch0: 'cell_decoder', ch1: 'cell_decoder', dec0: 'cell_decoder', dec1: 'cell_decoder', arr0: 'ddr4_cells', arr1: 'ddr4_cells', io: 'cell_lt', pump: 'cell_buck' },
});

def('ampere_nvenc', {
  name: 'NVENC 7. gen + NVDEC 5. gen (Ampere)',
  subtitle: 'GA102 whitepaper: kodér NVENC 7. generace (H.264, HEVC) a dekodér NVDEC 5. generace (navíc AV1). Pevná logika video kodeku: odhad pohybu, transformace (DCT), kvantizace, entropické kódování (CABAC) a smyčkové filtry – vnitřní zapojení NVIDIA nezveřejňuje, bloky odpovídají stavbě normy HEVC.',
  components: [
    blk('me', 'ODHAD POHYBU', 50, 50, [], ['ROZDÍL'], 'HLEDÁ BLOK V MINULÉM SNÍMKU', 220, 80),
    blk('tq', 'TRANSFORMACE + KVANTIZACE', 330, 50, ['ROZDÍL'], ['KOEFICIENTY'], 'DCT', 220, 80),
    blk('cabac', 'ENTROPICKÉ KÓDOVÁNÍ CABAC', 610, 50, ['KOEFICIENTY'], [], 'BITOVÝ TOK H.264 / HEVC', 220, 80),
    blk('lf', 'SMYČKOVÉ FILTRY (DEBLOCK, SAO)', 330, 170, [], [], 'REKONSTRUKCE REFERENCE', 220, 70),
    blk('dec', 'NVDEC: H.264 · HEVC · VP9 · AV1', 50, 170, [], [], 'DEKÓDOVÁNÍ', 220, 70),
  ],
  wires: [w('me.ROZDÍL', 'tq.ROZDÍL'), w('tq.KOEFICIENTY', 'cabac.KOEFICIENTY')],
  drills: { me: 'cell_lt', tq: 'cell_mac', cabac: 'cell_decoder', lf: 'cell_lt', dec: 'cell_mac' },
});

def('nv_display', {
  name: 'Display engine GPU (Ampere) — HDMI 2.1 + DP 1.4a',
  subtitle: 'GA102 whitepaper: až 4 obrazové výstupy (heads), HDMI 2.1 (FRL až 48 Gb/s) a DisplayPort 1.4a s kompresí DSC 1.2a. Každý head čte framebuffer, skládá roviny, má vlastní časovač a PLL. V mém PC jede HDMI do monitoru VA249HE (1920 × 1080 @ 60 Hz).',
  components: [
    blk('heads', '4 HEADY: ČTENÍ FRAMEBUFFERU', 50, 50, [], ['PIXELY'], 'ROVINY, KURZOR', 220, 80),
    blk('csc', 'BARVY + ŠKÁLOVÁNÍ', 320, 50, ['PIXELY'], ['RGB'], 'GAMMA, LUT', 200, 70),
    blk('dsc', 'KOMPRESE DSC 1.2a', 320, 160, [], [], 'PRO VYSOKÁ ROZLIŠENÍ', 200, 70),
    blk('hdmi', 'HDMI 2.1: TMDS / FRL', 580, 50, ['RGB'], [], 'NA MÉM PC → VA249HE', 220, 70),
    blk('dp', '3× DISPLAYPORT 1.4a', 580, 160, [], [], 'NEPOUŽITÉ', 220, 70),
    blk('pll', 'PLL HEADŮ', 50, 170, [], [], 'PIXELOVÉ HODINY', 220, 70),
  ],
  wires: [w('heads.PIXELY', 'csc.PIXELY'), w('csc.RGB', 'hdmi.RGB')],
  drills: { heads: 'cell_sram', csc: 'cell_mac', dsc: 'cell_decoder', hdmi: 'MUX', dp: 'MUX', pll: 'D_FF' },
});

def('ampere_tensor', {
  level: 4.5,
  name: 'Tensor Core 3. generace (Ampere SM)',
  subtitle: 'GA102 whitepaper: každý ze 4 bloků SM má 1 Tensor Core, který v jednom kroku spočítá maticové D = A × B + C (FP16, BF16, TF32, INT8, INT4) s akumulací ve vyšší přesnosti. Řídká akcelerace 2:4: ze 4 vah jsou 2 nulové, jednotka je přeskočí. Vnitřní uspořádání násobiček NVIDIA nezveřejňuje.',
  components: [
    blk('a', 'MATICE A (FRAGMENT)', 50, 50, [], ['A'], 'Z REGISTRŮ WARPU', 200, 70),
    blk('b', 'MATICE B (FRAGMENT)', 50, 150, [], ['B'], 'SPARSITY: INDEXY 2:4', 200, 70),
    blk('mul', 'POLE NÁSOBIČEK', 320, 50, ['A', 'B'], ['SOUČINY'], 'FP16 / BF16 / TF32 / INT8', 220, 90),
    blk('acc', 'SČÍTACÍ STROM + AKUMULACE C', 590, 50, ['SOUČINY'], [], 'FP32 / INT32', 230, 90),
    blk('sel', 'VÝBĚR NENULOVÝCH VAH', 320, 180, [], [], 'ŘÍDKÁ MATICE 2:4', 220, 70),
  ],
  wires: [w('a.A', 'mul.A'), w('b.B', 'mul.B'), w('mul.SOUČINY', 'acc.SOUČINY')],
  drills: { a: 'cell_sram', b: 'cell_sram', mul: 'cell_mac', acc: 'FULL_ADDER', sel: 'MUX' },
});

def('rt_core2', {
  level: 4.5,
  name: 'RT Core 2. generace (Ampere SM)',
  subtitle: 'GA102 whitepaper: jednotka sledování paprsků v každém SM prochází hierarchii obálek BVH (test paprsek × kvádr) a hledá průsečík paprsku s trojúhelníkem; oproti Turingu 2× rychlejší test trojúhelníků a interpolace pohybu pro rozmazání. Shader dostane zpět nejbližší zásah.',
  components: [
    blk('ray', 'PAPRSEK: POČÁTEK + SMĚR', 50, 50, [], ['PAPRSEK'], 'ZE SHADERU', 210, 70),
    blk('bvh', 'PRŮCHOD BVH (ZÁSOBNÍK)', 330, 50, ['PAPRSEK'], ['UZEL'], 'STROM OBÁLEK SCÉNY', 220, 80),
    blk('box', 'TEST PAPRSEK × KVÁDR', 330, 170, ['UZEL'], [], 'SLAB TEST', 220, 70),
    blk('tri', 'TEST PAPRSEK × TROJÚHELNÍK', 610, 50, ['UZEL'], ['ZÁSAH'], 'NEJBLIŽŠÍ PRŮSEČÍK', 220, 80),
    blk('mb', 'INTERPOLACE POHYBU', 610, 170, [], [], 'MOTION BLUR', 220, 70),
  ],
  wires: [w('ray.PAPRSEK', 'bvh.PAPRSEK'), w('bvh.UZEL', 'box.UZEL'), w('bvh.UZEL', 'tri.UZEL')],
  drills: { ray: 'cell_sram', bvh: 'cell_sram', box: 'cell_lt', tri: 'cell_mac', mb: 'cell_mac' },
});

def('hbm2_ctrl', {
  name: 'Řadič HBM2 (GP100) — 2 × 512 bit k jednomu stacku',
  subtitle: 'Pascal whitepaper: GP100 má 8 řadičů po 512 bitech, po dvou na každý stack HBM2 (4 × 1024 bit = 4096 bit, 732 GB/s ≈ 1,4 Gb/s na pin). Stack má 8 nezávislých kanálů po 128 bitech; propoj vede křemíkovým interposerem CoWoS, ne deskou. Paměť umí ECC bez ztráty kapacity.',
  components: [
    blk('q', 'FRONTY Z L2', 50, 50, [], ['PŘÍKAZ'], '', 200, 70),
    blk('sch', 'PLÁNOVAČ 8 KANÁLŮ', 50, 150, ['PŘÍKAZ'], ['CA'], 'BANKY, OTEVŘENÉ ŘÁDKY', 200, 70),
    blk('ecc', 'ECC (SECDED)', 320, 50, [], [], 'OPRAVÍ 1 BIT, ODHALÍ 2', 200, 70),
    blk('phy', 'PHY 1024 BIT PŘES INTERPOSER', 580, 50, ['CA'], [], 'MIKROBUMPY, KRÁTKÉ SPOJE', 230, 80),
    blk('ref', 'OBNOVA + TEPLOTA STACKU', 320, 150, [], [], '', 200, 70),
  ],
  wires: [w('q.PŘÍKAZ', 'sch.PŘÍKAZ'), w('sch.CA', 'phy.CA')],
  drills: { q: 'cell_sram', sch: 'cell_arbiter', ecc: 'cell_parity', phy: 'MUX', ref: 'cell_lt' },
});

def('hbm2_stack', {
  name: 'Stack HBM2 4 GB (4-Hi) na interposeru P100',
  subtitle: 'JEDEC JESD235 + SK hynix: 4 paměťové čipy 8 Gb nad sebou na bázovém logickém čipu, propojené tisíci TSV (průchody křemíkem). Rozhraní 1024 bit = 8 kanálů po 128 bitech (každý jde rozdělit na 2 pseudokanály po 64 bitech), každý paměťový čip nese 2 kanály. Rozměr stacku 7,75 × 11,87 mm.',
  components: [
    blk('base', 'BÁZOVÝ LOGICKÝ ČIP', 50, 50, [], ['TSV'], 'PHY, TEST, OPRAVY', 220, 80),
    blk('tsv', 'TSV PROPOJE (TISÍCE)', 50, 170, ['TSV'], ['KANÁLY'], 'SKRZ KŘEMÍK', 220, 70),
    ...[0, 1, 2, 3].map((i) => blk(`die${i}`, `ČIP DRAM ${i}: 2 KANÁLY × 128 BIT`, 330 + (i % 2) * 260, 50 + Math.floor(i / 2) * 120, ['KANÁLY'], [], '8 Gb, BANKY 1T1C', 240, 90)),
    blk('therm', 'TEPLOTNÍ ČIDLO STACKU', 330, 290, [], [], 'ŘÍDÍ OBNOVU', 240, 70),
  ],
  wires: [w('base.TSV', 'tsv.TSV'), ...[0, 1, 2, 3].map((i) => w('tsv.KANÁLY', `die${i}.KANÁLY`))],
  drills: { base: 'cell_decoder', tsv: 'cell_buck', die0: 'ddr4_cells', die1: 'ddr4_cells', die2: 'ddr4_cells', die3: 'ddr4_cells', therm: 'cell_lt' },
});

def('nvlink_hub', {
  name: 'HSHUB + NVLink 1.0 (GP100)',
  subtitle: 'Pascal whitepaper: 4 linky NVLink, každá 20 GB/s v každém směru (celkem 160 GB/s obousměrně), pro spojení GPU-GPU nebo GPU-CPU (POWER8). Na kartě P100 PCIe NVLink vyveden NENÍ – data mezi mými dvěma P100 jdou přes PCIe a CPU.',
  components: [
    blk('hub', 'HSHUB (PŘEPÍNAČ)', 50, 50, [], ['LINKY'], 'MEZI L2 A LINKAMI', 200, 80),
    ...[0, 1, 2, 3].map((i) => blk(`l${i}`, `NVLINK ${i} · 20 GB/s`, 320 + (i % 2) * 230, 50 + Math.floor(i / 2) * 110, ['LINKY'], [], 'NA PCIe KARTĚ NEVYVEDENO', 210, 80)),
  ],
  wires: [0, 1, 2, 3].map((i) => w('hub.LINKY', `l${i}.LINKY`)),
  drills: { hub: 'cell_arbiter', l0: 'cell_parity', l1: 'cell_parity', l2: 'cell_parity', l3: 'cell_parity' },
});

// dvojkliky bloků jednotek → buňky L5
for (const sub of Object.values(UNIT_SUBCIRCUITS)) {
  for (const comp of sub.components) if (sub.drills?.[comp.id]) comp.drill = sub.drills[comp.id];
  delete sub.drills;
}
