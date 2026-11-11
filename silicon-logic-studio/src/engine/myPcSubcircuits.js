// Projekt MŮJ PC – co je uvnitř dílů ze schématu L1 (dvojklik), L2 až L4; příklady (sčítačka, klopný obvod, hradla
// matice kláves) vedou dál na existující úrovně hradel → CMOS → tranzistor → atomy.
// Zdroje: NVIDIA Ampere GA102 whitepaper V1 (GA104 v App. A), ASUS techspec, TechPowerUp (GA104-202, Micron GDDR6X
// u karet se stejnou pamětí), Intel ARK / datasheet 300 Series PCH, ASUS manuál E13832, Samsung datasheety, Kingston datasheet.
// Co veřejně doložené není, má v popisku „neověřeno“ / „odhad“.
import { c, blk, inp, probe, w, adderExample } from './pcDeepSubcircuits.js';

export const MY_PC_SUBCIRCUITS = {};
const def = (key, level, sub) => { MY_PC_SUBCIRCUITS[key] = { key, level, ...sub }; };

const vdd = (id, label, x, y) => c(id, 'VDD', label, x, y);
const gnd = (id, label, x, y) => c(id, 'GND', label, x, y);
const nmos = (id, label, x, y) => c(id, 'NMOS', label, x, y);

// ================================================================ obecné buňky (skutečně simulované), na které vedou bloky PC
// L5 jsou jen ze základních hradel a tranzistorů (dál CMOS → tranzistor → atomy), L4 smí mít D_FF / MUX.

def('cell_buck', 5, {
  name: 'Spínaný měnič — jedna fáze (horní + dolní MOSFET)',
  subtitle: 'Princip VRM procesoru a grafiky, DC-DC ve zdroji, PFC i budiče motoru ventilátoru: PWM z řadiče střídavě sepne horní MOSFET (+12 V na uzel SW) a přes budič dolní MOSFET (uzel na zem). Tlumivka a kondenzátory pak udělají ze střídy stejnosměrné napětí: výstup ≈ střída × 12 V. Simulátor je binární: symbol VDD tu znamená vstup +12 V (logická 1). Mrtvá doba a zpětná vazba se nesimulují.',
  components: [
    inp('pwm', 'PWM Z ŘADIČE', 50, 200),
    vdd('vin', '+12 V', 330, 50),
    nmos('hs', 'HORNÍ MOSFET', 460, 110),
    c('inv', 'NOT', 'BUDIČ DOLNÍHO', 250, 330),
    nmos('ls', 'DOLNÍ MOSFET', 460, 320),
    gnd('gnd', 'GND', 330, 460),
    probe('sw', 'UZEL SW', 620, 230),
    blk('lc', 'TLUMIVKA + KONDENZÁTORY', 740, 205, ['SW'], [], 'VÝSTUP ≈ STŘÍDA × 12 V', 200, 90),
  ],
  wires: [
    w('vin.out', 'hs.d'), w('pwm.out', 'hs.g'), w('hs.s', 'sw.in'), w('hs.s', 'lc.SW'),
    w('pwm.out', 'inv.in'), w('inv.out', 'ls.g'), w('gnd.out', 'ls.s'), w('ls.d', 'sw.in'),
  ],
});

def('cell_lt', 5, {
  name: 'Komparátor A < B (2 bity)',
  subtitle: 'PWM: čítač běží 0 → 3 a výstup je 1, dokud je čítač menší než nastavená střída (ventilátory, podsvícení, LED). Stejný obvod porovnává napětí s mezí v ochranách zdroje (OVP/OCP), teplotu v PCU nebo souřadnice v RT jádře. A < B = (¬A1 ∧ B1) ∨ (A1 ≡ B1 ∧ ¬A0 ∧ B0).',
  components: [
    inp('a1', 'A1 (ČÍTAČ)', 50, 50), inp('a0', 'A0 (ČÍTAČ)', 50, 130), inp('b1', 'B1 (STŘÍDA)', 50, 210), inp('b0', 'B0 (STŘÍDA)', 50, 290),
    c('na1', 'NOT', '¬A1', 200, 60), c('na0', 'NOT', '¬A0', 200, 140), c('x1', 'XOR', 'A1 ⊕ B1', 200, 220),
    c('hi', 'AND', '¬A1 ∧ B1', 330, 60), c('lo', 'AND', '¬A0 ∧ B0', 330, 140), c('eq', 'NOT', 'A1 ≡ B1', 330, 225),
    c('eqlo', 'AND', 'SHODA A NIŽŠÍ BIT', 470, 180), c('or', 'OR', 'A < B', 600, 120),
    probe('out', 'VÝSTUP (PWM)', 740, 125),
  ],
  wires: [
    w('a1.out', 'na1.in'), w('a0.out', 'na0.in'), w('a1.out', 'x1.a'), w('b1.out', 'x1.b'),
    w('na1.out', 'hi.a'), w('b1.out', 'hi.b'), w('na0.out', 'lo.a'), w('b0.out', 'lo.b'), w('x1.out', 'eq.in'),
    w('eq.out', 'eqlo.a'), w('lo.out', 'eqlo.b'), w('hi.out', 'or.a'), w('eqlo.out', 'or.b'), w('or.out', 'out.in'),
  ],
});

def('cell_sram', 5, {
  name: 'SRAM bit — model buňky cache / registru',
  subtitle: 'Cache L1/L2/L3, registry a fronty jsou ze statických buněk: dva zpětnovazebně zapojené invertory drží bit, wordline ho otevře pro zápis. Binární simulátor nezná sílu tranzistorů, proto je 6T buňka modelovaná jako D latch ze 4 NAND: při WL = 1 se Q přepíše na DATA, při WL = 0 drží.',
  components: [
    inp('d', 'DATA (BITLINE)', 50, 80), inp('wl', 'WORDLINE', 50, 240),
    c('nd', 'NOT', '¬DATA', 180, 330),
    c('n1', 'NAND', 'ZÁPIS 1', 230, 80), c('n2', 'NAND', 'ZÁPIS 0', 310, 300),
    c('n3', 'NAND', 'Q', 460, 100), c('n4', 'NAND', 'Q#', 460, 280),
    probe('q', 'ULOŽENÝ BIT', 610, 105),
  ],
  wires: [
    w('d.out', 'n1.a'), w('wl.out', 'n1.b'), w('d.out', 'nd.in'), w('nd.out', 'n2.a'), w('wl.out', 'n2.b'),
    w('n1.out', 'n3.a'), w('n4.out', 'n3.b'), w('n2.out', 'n4.a'), w('n3.out', 'n4.b'), w('n3.out', 'q.in'),
  ],
});

def('cell_decoder', 5, {
  name: 'Dekodér 2 → 4',
  subtitle: 'Výřez dekodérů adres a instrukcí: ze dvou bitů vybere právě jeden ze čtyř výstupů (řádek paměti, banku, sloupec, druh instrukce, položku tabulky SFU). Skutečné dekodéry mají víc bitů, princip je stejný.',
  components: [
    inp('a1', 'A1', 50, 120), inp('a0', 'A0', 50, 300),
    c('n1', 'NOT', '¬A1', 190, 60), c('n0', 'NOT', '¬A0', 190, 400),
    ...[0, 1, 2, 3].map((i) => c(`y${i}`, 'AND', `VÝSTUP ${i}`, 360, 50 + i * 110)),
    ...[0, 1, 2, 3].map((i) => probe(`p${i}`, `VÝBĚR ${i}`, 510, 53 + i * 110)),
  ],
  wires: [
    w('a1.out', 'n1.in'), w('a0.out', 'n0.in'),
    w('n1.out', 'y0.a'), w('n0.out', 'y0.b'), w('n1.out', 'y1.a'), w('a0.out', 'y1.b'),
    w('a1.out', 'y2.a'), w('n0.out', 'y2.b'), w('a1.out', 'y3.a'), w('a0.out', 'y3.b'),
    ...[0, 1, 2, 3].map((i) => w(`y${i}.out`, `p${i}.in`)),
  ],
});

def('cell_match', 5, {
  name: 'Porovnání tagu (2 bity)',
  subtitle: 'Cache hledá data podle tagu adresy, scheduler probouzí instrukce podle čísla registru, řadič paměti zjistí otevřenou stránku: vždy porovnání bit po bitu (XOR) a NOR všech rozdílů = shoda. Výřez 2 bitů.',
  components: [
    inp('t1', 'TAG 1 (ULOŽENÝ)', 50, 50), inp('k1', 'KLÍČ 1', 50, 130), inp('t0', 'TAG 0 (ULOŽENÝ)', 50, 230), inp('k0', 'KLÍČ 0', 50, 310),
    c('x1', 'XOR', 'ROZDÍL 1', 220, 90), c('x0', 'XOR', 'ROZDÍL 0', 220, 270), c('nor', 'NOR', 'ŽÁDNÝ ROZDÍL', 380, 180),
    probe('hit', 'SHODA (HIT)', 530, 183),
  ],
  wires: [w('t1.out', 'x1.a'), w('k1.out', 'x1.b'), w('t0.out', 'x0.a'), w('k0.out', 'x0.b'), w('x1.out', 'nor.a'), w('x0.out', 'nor.b'), w('nor.out', 'hit.in')],
});

def('cell_arbiter', 5, {
  name: 'Arbitr s pevnou prioritou (2 žadatelé)',
  subtitle: 'Kdo dostane sdílený prostředek (port, sběrnici, warp na výpočetní jednotky): žadatel 0 má přednost, žadatel 1 dostane přístup, jen když 0 nežádá. Skutečné schedulery střídají priority (round-robin), princip je stejný.',
  components: [
    inp('r0', 'ŽÁDOST 0', 50, 80), inp('r1', 'ŽÁDOST 1', 50, 260),
    c('n0', 'NOT', '¬ŽÁDOST 0', 200, 180), c('g1', 'AND', 'PŘIDĚLENÍ 1', 340, 250), c('g0', 'OR', 'PŘIDĚLENÍ 0', 340, 70),
    probe('p0', 'PŘIDĚLENO 0', 490, 75), probe('p1', 'PŘIDĚLENO 1', 490, 255),
  ],
  wires: [w('r0.out', 'g0.a'), w('r0.out', 'g0.b'), w('r0.out', 'n0.in'), w('n0.out', 'g1.a'), w('r1.out', 'g1.b'), w('g0.out', 'p0.in'), w('g1.out', 'p1.in')],
});

def('cell_mac', 5, {
  name: 'Násobení a přičtení — 1 bit (MAC)',
  subtitle: 'Jádro tensor core, FMA i texturovacího filtru: dílčí součin A·B (AND) se přičte ke střádači (poloviční sčítačka XOR + AND). Skutečná jednotka skládá stovky takových buněk do matic.',
  components: [
    inp('a', 'A', 50, 60), inp('b', 'B', 50, 150), inp('acc', 'STŘÁDAČ', 50, 290),
    c('pp', 'AND', 'DÍLČÍ SOUČIN A·B', 200, 90), c('s', 'XOR', 'SOUČET', 350, 200), c('co', 'AND', 'PŘENOS', 350, 310),
    probe('ps', 'NOVÝ STŘÁDAČ', 500, 205), probe('pc', 'PŘENOS', 500, 315),
  ],
  wires: [w('a.out', 'pp.a'), w('b.out', 'pp.b'), w('pp.out', 's.a'), w('acc.out', 's.b'), w('pp.out', 'co.a'), w('acc.out', 'co.b'), w('s.out', 'ps.in'), w('co.out', 'pc.in')],
});

def('cell_parity', 5, {
  name: 'Parita / ECC — strom XOR',
  subtitle: 'Řadič SSD i paměti počítají kontrolní bity jako XOR skupin datových bitů (LDPC a BCH jsou rozsáhlé sítě takových rovnic). Výřez: parita 4 bitů.',
  components: [
    inp('d0', 'D0', 50, 50), inp('d1', 'D1', 50, 130), inp('d2', 'D2', 50, 230), inp('d3', 'D3', 50, 310),
    c('x01', 'XOR', 'D0 ⊕ D1', 220, 90), c('x23', 'XOR', 'D2 ⊕ D3', 220, 270), c('x', 'XOR', 'PARITA', 380, 180),
    probe('p', 'KONTROLNÍ BIT', 530, 185),
  ],
  wires: [w('d0.out', 'x01.a'), w('d1.out', 'x01.b'), w('d2.out', 'x23.a'), w('d3.out', 'x23.b'), w('x01.out', 'x.a'), w('x23.out', 'x.b'), w('x.out', 'p.in')],
});

def('cell_tft', 5, {
  name: 'Pixel LCD — tranzistor TFT',
  subtitle: 'Každý subpixel panelu (1920 × 1080 × 3) má tenkovrstvý tranzistor: řádek (gate line) ho otevře a sloupec (data line) nabije kondenzátor s kapalnými krystaly; po zavření náboj drží do dalšího snímku (60 Hz). Spínačový model NMOS náboj drží také.',
  components: [
    inp('gl', 'ŘÁDEK (GATE LINE)', 50, 80), inp('dl', 'SLOUPEC (DATA LINE)', 50, 260),
    nmos('tft', 'TFT', 260, 160),
    probe('px', 'NÁBOJ PIXELU', 420, 175),
    blk('lc', 'KAPALNÉ KRYSTALY VA + Cs', 560, 150, ['PIXEL'], [], 'NAPĚTÍ NATOČÍ MOLEKULY', 240, 90),
  ],
  wires: [w('gl.out', 'tft.g'), w('dl.out', 'tft.s'), w('tft.d', 'px.in'), w('tft.d', 'lc.PIXEL')],
});

def('cell_aps', 5, {
  name: 'Pixel obrazového senzoru (3T)',
  subtitle: 'Optický senzor myši fotí podložku tisíckrát za sekundu malou maticí pixelů. Pixel: RESET nabije uzel, světlo ho přes fotodiodu vybije, sledovač napětí a výběr řádku pošlou stav do sloupce (zde binárně: světlo = 0).',
  components: [
    vdd('vdd', 'VDD', 50, 50), inp('rst', 'RESET', 50, 130), nmos('m_rst', 'RESET', 200, 60),
    inp('light', 'SVĚTLO (FOTODIODA)', 50, 260), nmos('m_pd', 'FOTODIODA', 200, 250), gnd('gnd', 'GND', 200, 400),
    vdd('vdd2', 'VDD', 380, 50), nmos('m_sf', 'SLEDOVAČ', 380, 150), probe('fd', 'NÁBOJ UZLU', 380, 260),
    inp('sel', 'VÝBĚR ŘÁDKU', 380, 340), nmos('m_sel', 'VÝBĚR', 560, 200), probe('col', 'SLOUPEC → ADC', 720, 215),
  ],
  wires: [
    w('vdd.out', 'm_rst.s'), w('rst.out', 'm_rst.g'), w('m_rst.d', 'm_sf.g'), w('m_pd.d', 'm_sf.g'), w('m_rst.d', 'fd.in'),
    w('light.out', 'm_pd.g'), w('gnd.out', 'm_pd.s'),
    w('vdd2.out', 'm_sf.s'), w('m_sf.d', 'm_sel.s'), w('sel.out', 'm_sel.g'), w('m_sel.d', 'col.in'),
  ],
});

def('cell_quad', 5, {
  name: 'Kvadraturní enkodér kolečka',
  subtitle: 'Kolečko myši má dva kontakty A a B posunuté o čtvrt periody; podle toho, který se sepne dřív, MCU pozná směr. XOR obou signálů mění stav při každém kroku.',
  components: [inp('a', 'KONTAKT A', 50, 80), inp('b', 'KONTAKT B', 50, 220), c('x', 'XOR', 'A ⊕ B', 220, 150), c('na', 'NOT', 'ČEKÁ NA HRANU A', 220, 300), probe('step', 'KROK', 380, 155), probe('pa', 'A NEAKTIVNÍ', 380, 300)],
  wires: [w('a.out', 'x.a'), w('b.out', 'x.b'), w('x.out', 'step.in'), w('a.out', 'na.in'), w('na.out', 'pa.in')],
});

def('cell_nand', 5, {
  name: 'Řetězec NAND flash — čtení buňky',
  subtitle: 'V-NAND (Samsung 970 EVO Plus, 870 EVO): buňky jsou tranzistory zapojené do série mezi bitline a source line, výběr přes SSL a GSL. Při čtení dostanou nečtené wordliny napětí Vpass (vedou vždy), čtená buňka vede jen, když je smazaná (bez náboje v zachycovací vrstvě SiN). Bitline se pak vybije: 0 = proud teče = buňka smazaná. Výřez 3 buněk z ~92–128 vrstev; TLC (3 bity na buňku) se tu zjednodušuje na 1 bit.',
  components: [
    inp('ssl', 'SSL (VÝBĚR ŘETĚZCE)', 40, 40),
    ...[2, 1, 0].flatMap((i, k) => [inp(`wl${i}`, `WL${i} (1 = Vpass)`, 40, 102 + k * 124), inp(`prog${i}`, `BUŇKA ${i} NAPROGRAMOVÁNA`, 40, 164 + k * 124)]),
    inp('gsl', 'GSL (VÝBĚR ZDROJE)', 40, 474),
    ...[2, 1, 0].flatMap((i, k) => [c(`np${i}`, 'NOT', `SMAZANÁ ${i}`, 170, 170 + k * 124), c(`or${i}`, 'OR', `VEDE ${i}`, 290, 130 + k * 124)]),
    nmos('m_ssl', 'SSL', 470, 50), nmos('m2', 'BUŇKA 2', 470, 140), nmos('m1', 'BUŇKA 1', 470, 230), nmos('m0', 'BUŇKA 0', 470, 320), nmos('m_gsl', 'GSL', 470, 410),
    gnd('sl', 'SOURCE LINE', 480, 495),
    probe('bl', 'BITLINE (0 = PROUD TEČE)', 620, 60),
  ],
  wires: [
    w('ssl.out', 'm_ssl.g'), w('gsl.out', 'm_gsl.g'),
    ...[0, 1, 2].flatMap((i) => [w(`prog${i}.out`, `np${i}.in`), w(`wl${i}.out`, `or${i}.a`), w(`np${i}.out`, `or${i}.b`), w(`or${i}.out`, `m${i}.g`)]),
    w('sl.out', 'm_gsl.s'), w('m_gsl.d', 'm0.s'), w('m0.d', 'm1.s'), w('m1.d', 'm2.s'), w('m2.d', 'm_ssl.s'), w('m_ssl.d', 'bl.in'),
  ],
});

def('cell_eeprom', 5, {
  name: 'Buňka EEPROM s plovoucím hradlem — čtení',
  subtitle: 'SPD čip paměťového modulu (JEDEC, I²C) ukládá parametry v EEPROM: tranzistor s plovoucím hradlem pod řídicím hradlem. Elektrony na plovoucím hradle zvýší prahové napětí – při čtení pak tranzistor nevede. Vede tedy jen buňka bez náboje (ve schématu: řídicí hradlo AND ne-nabitá). Typ čipu SPD a jeho proces neověřeny.',
  components: [
    inp('cg', 'ŘÍDICÍ HRADLO (ČTENÍ)', 50, 80), inp('fg', 'NÁBOJ NA PLOVOUCÍM HRADLE', 50, 240),
    c('nfg', 'NOT', 'BEZ NÁBOJE', 200, 246), c('on', 'AND', 'VEDE', 330, 160),
    nmos('cell', 'BUŇKA', 480, 150), gnd('gnd', 'GND', 490, 300), probe('bl', 'BITLINE (0 = BIT 1)', 640, 160),
  ],
  wires: [w('fg.out', 'nfg.in'), w('cg.out', 'on.a'), w('nfg.out', 'on.b'), w('on.out', 'cell.g'), w('gnd.out', 'cell.s'), w('cell.d', 'bl.in')],
});

def('cell_toggle', 4, {
  name: 'T klopný obvod — dělička hodin 2 : 1',
  subtitle: 'D klopný obvod s inverzním výstupem zpět na vstup D překlopí při každé náběžné hraně: výstup má poloviční kmitočet. Takto se dělí hodiny (ICC, DLL, PLL), stejný obvod přepíná zapnuto/vypnuto po stisku tlačítka.',
  components: [inp('clk', 'HODINY', 50, 160), c('ff', 'D_FF', 'T KLOPNÝ OBVOD', 220, 150), probe('q', 'VÝSTUP ÷ 2', 400, 160)],
  wires: [w('clk.out', 'ff.clk'), w('ff.nq', 'ff.d'), w('ff.q', 'q.in')],
});

def('cell_pwrbtn', 4, {
  name: 'Logika tlačítka POWER (PCH + Super I/O)',
  subtitle: 'Běží z +5VSB i ve vypnutém PC. Každý stisk tlačítka (náběžná hrana) přepne stav; když je +5VSB v pořádku a stav „zapnuto“, jde PS_ON# na nulu a zdroj naběhne. Na skutečné desce drží stav PCH B360: přijme PWRBTN#, uvolní SLP_S3# a teprve ten přes Super I/O stáhne PS_ON#. Navíc má 4s vypnutí a ACPI stavy S3–S5; schéma to spojuje do jednoho klopného obvodu.',
  components: [
    inp('btn', 'TLAČÍTKO (HRANA)', 50, 80), inp('sb', '+5VSB V POŘÁDKU', 50, 300),
    c('ff', 'D_FF', 'STAV ZAPNUTO', 220, 70), c('and', 'AND', 'POVOLENÍ', 380, 200), c('inv', 'NOT', 'AKTIVNÍ V NULE', 520, 205),
    probe('on', 'ZAPNUTO', 380, 75), probe('pson', 'PS_ON#', 650, 205),
  ],
  wires: [w('btn.out', 'ff.clk'), w('ff.nq', 'ff.d'), w('ff.q', 'on.in'), w('ff.q', 'and.a'), w('sb.out', 'and.b'), w('and.out', 'inv.in'), w('inv.out', 'pson.in')],
});

def('cell_serdes', 4, {
  name: 'Sériová linka (SerDes) — vysílač 4 : 1',
  subtitle: 'PCIe, DMI, USB, SATA, HDMI (TMDS), GDDR6X, DQ pamětí DDR4 (prefetch 8n) i kanály NAND posílají data rychle po málo vodičích: paralelní slovo se načte (LOAD = 1) a každou hranou hodin se vysune o bit dál na diferenciální pár TX+ / TX−. Kódování 8b/10b a 128b/130b, PLL, ekvalizace a PAM4 se nesimulují.',
  components: [
    ...[0, 1, 2, 3].map((i) => inp(`d${i}`, `DATA ${i}`, 40, 50 + i * 70)),
    inp('load', 'LOAD', 40, 340), inp('clk', 'HODINY LINKY', 40, 420),
    ...[0, 1, 2, 3].map((i) => c(`mx${i}`, 'MUX', `NAČTI / POSUŇ ${i}`, 200, 50 + i * 100)),
    ...[0, 1, 2, 3].map((i) => c(`ff${i}`, 'D_FF', `BIT ${i}`, 340, 50 + i * 100)),
    gnd('z', 'KONEC (0)', 200, 470),
    probe('txp', 'TX+', 500, 160), c('inv', 'NOT', 'TX− = ¬TX+', 500, 60), probe('txn', 'TX−', 620, 57),
    blk('pair', 'DIFERENCIÁLNÍ PÁR', 660, 250, ['TX'], [], 'KÓDOVÁNÍ A PLL SE NESIMULUJÍ', 260, 90),
  ],
  wires: [
    ...[0, 1, 2, 3].flatMap((i) => [w(`d${i}.out`, `mx${i}.b`), w('load.out', `mx${i}.sel`), w(`mx${i}.out`, `ff${i}.d`), w('clk.out', `ff${i}.clk`)]),
    w('ff1.q', 'mx0.a'), w('ff2.q', 'mx1.a'), w('ff3.q', 'mx2.a'), w('z.out', 'mx3.a'),
    w('ff0.q', 'txp.in'), w('ff0.q', 'inv.in'), w('inv.out', 'txn.in'), w('ff0.q', 'pair.TX'),
  ],
});

/** Příklad 1 bitu registru: D + hodiny → D_FF → Q (dvojklik vede na hradla a tranzistory). */
const regExample = (label, x, y) => ({
  components: [inp('ex_d', 'D', x, y), inp('ex_clk', 'HODINY', x, y + 70), c('ex_ff', 'D_FF', label, x + 120, y + 10), probe('ex_q', 'Q', x + 260, y + 20)],
  wires: [w('ex_d.out', 'ex_ff.d'), w('ex_clk.out', 'ex_ff.clk'), w('ex_ff.q', 'ex_q.in')],
});

// ================================================================ deska ASUS PRIME B360-PLUS
def('mypc_board', 2, {
  name: 'ASUS PRIME B360-PLUS — bloky desky',
  subtitle: 'ASUS manuál E13832: PCIEX16_1 x16 z CPU (B360 dovolí jen 1×16), PCIEX16_2 (x2/x4, sdílí s PCIEX1_1/2) a PCIEX1 z PCH, M.2_1 (PCIe x2 / SATA – pak vypne SATA6G_2), M.2_2 (PCIe x4, Optane; je v něm 970 EVO Plus), RTL8111H, ALC887-VD2, ASM1083 → 2× PCI, 6× SATA, USB 2× 3.1 Gen2 + 4× Gen1 + 6× 2.0, iGPU výstupy HDMI 1.4b / DVI-D / D-Sub. VRM „DIGI+ 6 Phase“ – rozdělení a součástky neověřeny; Super I/O Nuvoton NCT6796D (ověřeno 11. 11. 2026 LibreHardwareMonitorem: chip ID 0xD423, rev. 0x23).',
  components: [
    blk('atx', 'ATX 24 PIN + EPS 8 PIN', 50, 50, [], ['+5VSB', '+12V/+5V/+3,3V', 'EPS +12V'], 'ZE ZDROJE', 170, 90),
    blk('panel', 'PANEL: POWER, RESET, LED', 50, 160, [], ['PWRBTN'], 'HLAVIČKA F_PANEL', 170, 70),
    blk('sio', 'SUPER I/O NCT6796D', 50, 250, ['+5VSB', 'PWRBTN', 'TEPLOTA'], ['PS_ON#', 'FAN PWM'], 'DVOJKLIK → ČIP (OVĚŘENO)', 170, 100),
    blk('fan', 'CPU_FAN · CHA_FAN1 · CHA_FAN2', 50, 370, ['FAN PWM'], [], 'CPU_FAN 1 A · CHA PWM/DC', 170, 80),
    blk('vrm', 'DIGI+ VRM · 6 FÁZÍ', 270, 50, ['EPS +12V'], ['VCORE', 'VCCGT'], 'VCORE 1,20 V · VCCIO 1,048 V (ZMĚŘENO) · FÁZE NEOVĚŘENY', 190, 100),
    blk('cpu', 'LGA1151 · i7-9700', 510, 50, ['VCORE', 'VCCGT', 'DDR4 A', 'DDR4 B'], ['PEG x16', 'DMI 3.0 x4', 'DISPLEJ'], 'DVOJKLIK → ČIP', 200, 150, { drill: 'cfl_die' }),
    blk('dimma', 'DIMM_A1 + A2 · 2× 8 GB', 760, 50, [], ['DDR4 A'], 'KANÁL A', 190, 70),
    blk('dimmb', 'DIMM_B1 + B2 · 2× 8 GB', 760, 135, [], ['DDR4 B'], 'KANÁL B', 190, 70),
    blk('x16', 'PCIEX16_1 → RTX 3060 Ti', 760, 220, ['PEG x16'], [], 'PCIe 3.0 x16 Z CPU', 190, 70),
    blk('disp', 'DVI-D · D-SUB · HDMI 1.4b', 510, 220, ['DISPLEJ'], [], 'iGPU – NEPOUŽITO', 200, 60),
    blk('pch', 'INTEL B360 (PCH)', 270, 300, ['DMI 3.0 x4'], ['M.2_2 x4', 'SLOTY', 'LAN', 'PCI', 'SATA', 'USB', 'HDA', 'SPI'], 'DVOJKLIK → ČIPSET', 200, 230, { drill: 'b360_pch' }),
    blk('lan', 'RTL8111H · 1 Gb/s', 510, 300, ['LAN'], [], 'PCIe x1', 200, 50),
    blk('pci', 'ASM1083 → PCI1, PCI2', 510, 355, ['PCI'], [], 'MOST PCIe → PCI', 200, 50),
    blk('sata', '6× SATA 6 Gb/s · M.2_1', 510, 410, ['SATA'], [], 'M.2_1 SATA VYPNE SATA6G_2', 200, 50),
    blk('usb', 'USB (ZADNÍ + HLAVIČKY)', 510, 465, ['USB'], [], '2× GEN2 · 4× GEN1 · 6× 2.0', 200, 60),
    blk('m2', 'M.2_2 · x4 → 970 EVO PLUS', 760, 300, ['M.2_2 x4'], [], 'PCIe 3.0 x4 Z PCH', 190, 60),
    blk('slots', 'PCIEX16_2 · PCIEX1_1/2', 760, 365, ['SLOTY'], [], 'Z PCH, PRÁZDNÉ', 190, 60),
    blk('audio', 'ALC887-VD2 · 8 KANÁLŮ', 760, 430, ['HDA'], [], 'HD AUDIO Z PCH', 190, 50),
    blk('bios', 'BIOS SPI 128 Mb', 760, 485, ['SPI'], [], 'UEFI AMI · VERZE 3101', 190, 50),
  ],
  wires: [
    w('atx.+5VSB', 'sio.+5VSB'), w('panel.PWRBTN', 'sio.PWRBTN'), w('sio.FAN PWM', 'fan.FAN PWM'), w('atx.EPS +12V', 'vrm.EPS +12V'),
    w('vrm.VCORE', 'cpu.VCORE'), w('vrm.VCCGT', 'cpu.VCCGT'), w('dimma.DDR4 A', 'cpu.DDR4 A'), w('dimmb.DDR4 B', 'cpu.DDR4 B'),
    w('cpu.PEG x16', 'x16.PEG x16'), w('cpu.DISPLEJ', 'disp.DISPLEJ'), w('cpu.DMI 3.0 x4', 'pch.DMI 3.0 x4'),
    w('pch.M.2_2 x4', 'm2.M.2_2 x4'), w('pch.SLOTY', 'slots.SLOTY'), w('pch.LAN', 'lan.LAN'), w('pch.PCI', 'pci.PCI'),
    w('pch.SATA', 'sata.SATA'), w('pch.USB', 'usb.USB'), w('pch.HDA', 'audio.HDA'), w('pch.SPI', 'bios.SPI'),
  ],
});

// ================================================================ Super I/O Nuvoton NCT6796D (ověřeno: chip ID 0xD423, rev. 0x23)
def('nct6796d', 3, {
  name: 'Nuvoton NCT6796D — Super I/O desky',
  subtitle: 'Ověřeno 11. 11. 2026 (chip ID 0xD423, rev. 0x23). Řada NCT679x: LPC k PCH, ACPI zapnutí (PSIN# → PSOUT#, podle SLP_S3# PS_ON#), HW monitor, SmartFan, PS/2, UART, GPIO. Změřeno: +3,3 V 3,344 · 3VSB 3,376 · VTT 1,048 · Vcore 1,20 V. Pouzdro neověřeno.',
  components: [
    blk('lpc', 'LPC / eSPI ROZHRANÍ', 50, 50, [], ['REGISTRY'], 'K PCH B360 · KTERÉ, NEOVĚŘENO', 190, 70),
    blk('acpi', 'ACPI: PSIN# → PSOUT#, PS_ON#', 50, 160, ['+5VSB', 'TLAČÍTKO', 'SLP_S3#'], ['PS_ON#', 'PWRBTN#'], 'BĚŽÍ Z POHOTOVOSTNÍHO NAPÁJENÍ', 230, 110),
    blk('hwm', 'HW MONITOR · ADC NAPĚTÍ', 340, 50, ['REGISTRY', 'NAPĚTÍ'], ['ALARM'], '3,344 / 3,376 / 1,048 / 1,20 V (ZMĚŘENO)', 250, 90),
    blk('temp', 'TEPLOTNÍ VSTUPY (DIODY)', 340, 170, ['REGISTRY'], ['TEPLOTA'], 'CPUTIN, SYSTIN', 250, 70),
    blk('fanctl', 'SMARTFAN · PWM / DC VÝSTUPY', 640, 50, ['REGISTRY', 'TEPLOTA'], ['CPU_FAN PWM', 'CHA_FAN PWM'], 'KŘIVKA Q-FAN Z BIOSU', 250, 90),
    blk('tach', 'TACHO VSTUPY VENTILÁTORŮ', 640, 170, [], ['OT/MIN'], '2 PULZY NA OTÁČKU', 250, 70),
    blk('kbc', 'PS/2 KLÁVESNICE + MYŠ (KBC)', 340, 280, ['REGISTRY'], [], 'KOMBINOVANÝ PORT VZADU', 250, 70),
    blk('uart', 'UART → HLAVIČKA COM', 640, 280, ['REGISTRY'], [], 'RS-232 PŘES PŘEVODNÍK NA DESCE', 250, 70),
    blk('gpio', 'GPIO + WATCHDOG', 50, 310, ['REGISTRY'], [], 'ŘÍZENÍ LED, STRAPY', 230, 70),
  ],
  wires: [
    w('lpc.REGISTRY', 'hwm.REGISTRY'), w('lpc.REGISTRY', 'temp.REGISTRY'), w('lpc.REGISTRY', 'fanctl.REGISTRY'),
    w('lpc.REGISTRY', 'kbc.REGISTRY'), w('lpc.REGISTRY', 'uart.REGISTRY'), w('lpc.REGISTRY', 'gpio.REGISTRY'),
    w('temp.TEPLOTA', 'fanctl.TEPLOTA'),
  ],
});

def('b360_pch', 3, {
  name: 'Intel B360 — čipset (PCH)',
  subtitle: 'Intel 300 Series PCH datasheet 337347 + ARK: DMI 3.0 x4 (8 GT/s), 24 aktivních HSIO linek (z 30) sdílených mezi až 12× PCIe 3.0, 6× SATA 6 Gb/s a USB 3.1 (max. 4× Gen2 / 6× Gen1), 12× USB 2.0, HDA, SPI, eSPI/LPC, SMBus, MAC GbE a Wi-Fi (CNVi), CSME 12, 6 W, 14 nm (tisk). Na které linky ASUS přivedl M.2, sloty a LAN, je neověřené.',
  components: [
    blk('dmi', 'DMI 3.0 x4 · 8 GT/s', 50, 50, [], ['SBĚRNICE'], 'Z i7-9700', 200, 70),
    blk('hsio', 'HSIO (FLEX I/O)', 330, 50, ['SBĚRNICE'], ['PCIe', 'SATA', 'USB 3.1'], 'SDÍLENÉ LINKY', 220, 110),
    blk('pcie', 'PCIe 3.0 · AŽ 12 LINEK', 640, 50, ['PCIe'], [], 'M.2_2, LAN, SLOTY, ASM1083', 260, 70),
    blk('sata', 'SATA 6 Gb/s · AHCI', 640, 140, ['SATA'], [], '6 PORTŮ', 260, 60),
    blk('usb3', 'xHCI USB 3.1 GEN 2 / GEN 1', 640, 215, ['USB 3.1'], [], 'MAX. 4× GEN2 / 6× GEN1', 260, 60),
    blk('usb2', 'USB 2.0 · 12 PORTŮ', 640, 290, ['SBĚRNICE'], [], 'KLÁVESNICE, MYŠ, MIKROFON', 260, 60),
    blk('hda', 'HD AUDIO → ALC887', 330, 200, ['SBĚRNICE'], [], '', 220, 60),
    blk('spi', 'SPI → BIOS · eSPI/LPC → SUPER I/O', 330, 280, ['SBĚRNICE'], [], '', 220, 70),
    blk('smb', 'SMBus → SPD PAMĚTÍ', 50, 160, ['SBĚRNICE'], [], 'ČTENÍ KHX2666C16/8G', 200, 70),
    blk('me', 'CSME (MANAGEMENT ENGINE)', 50, 260, ['SBĚRNICE'], [], 'CSME 12, BEZ AMT', 200, 70),
    blk('cnvi', 'CNVi (MAC Wi-Fi)', 50, 360, [], [], 'NA DESCE NEVYUŽITO', 200, 60),
    blk('clk', 'HODINY (ICC) · RTC', 330, 380, [], [], 'BATERIE CR2032', 220, 60),
  ],
  wires: [
    w('dmi.SBĚRNICE', 'hsio.SBĚRNICE'), w('hsio.PCIe', 'pcie.PCIe'), w('hsio.SATA', 'sata.SATA'), w('hsio.USB 3.1', 'usb3.USB 3.1'),
    ...['usb2', 'hda', 'spi', 'smb', 'me'].map((k) => w('dmi.SBĚRNICE', `${k}.SBĚRNICE`)),
  ],
});

// ================================================================ procesor Intel Core i7-9700
def('cfl_die', 3, {
  name: 'Intel Core i7-9700 — čip (Coffee Lake-S 8+2)',
  subtitle: 'Intel ARK: 8 jader / 8 vláken, 3,0 / 4,7 GHz, L3 12 MB, 2 kanály DDR4-2666 (41,6 GB/s), PCIe 3.0 x16 (na B360 jen 1×16), DMI 3.0 x4, UHD 630 (Gen 9.5 GT2, 3 × 8 EU), 65 W, 14 nm. Die 8+2 ~180 mm² (TechPowerUp); na každé jádro plátek L3 2 MB, u i7-9700 povoleno 1,5 MB (12 MB / 8 – neověřeno). Počet tranzistorů Intel nezveřejnil.',
  components: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => blk(`core${i}`, `JÁDRO ${i} + L3 1,5 MB`, 50 + (i % 4) * 150, 50 + Math.floor(i / 4) * 95, ['RING'], [], 'DVOJKLIK → JÁDRO', 140, 85, { drill: 'cfl_core' })),
    blk('ring', 'KRUHOVÁ SBĚRNICE (RING)', 50, 250, [], ['RING'], 'JÁDRA ↔ L3 ↔ GPU ↔ SA', 590, 50),
    blk('gt', 'UHD 630 · GEN 9.5 GT2', 50, 320, ['RING'], [], '24 EU · NEPOUŽITÁ', 260, 80),
    blk('pcu', 'PCU + ŘÍZENÍ NAPÁJENÍ', 350, 320, ['RING'], [], 'TURBO 4,7 GHz · 65 W', 260, 80),
    blk('sa', 'SYSTEM AGENT', 680, 50, ['RING'], ['IMC', 'PEG', 'DMI', 'DISP'], '', 260, 90),
    blk('imc', 'IMC · 2× DDR4-2666', 680, 160, ['IMC'], [], '2 × 64 BIT · 41,6 GB/s', 260, 60),
    blk('peg', 'PEG PCIe 3.0 x16', 680, 235, ['PEG'], [], '→ RTX 3060 Ti', 260, 60),
    blk('dmi', 'DMI 3.0 x4 → B360', 680, 310, ['DMI'], [], '8 GT/s', 260, 60),
    blk('disp', 'DISPLAY ENGINE', 680, 385, ['DISP'], [], 'DVI / HDMI / D-SUB NA DESCE', 260, 60),
  ],
  wires: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => w('ring.RING', `core${i}.RING`)),
    w('ring.RING', 'gt.RING'), w('ring.RING', 'pcu.RING'), w('ring.RING', 'sa.RING'),
    w('sa.IMC', 'imc.IMC'), w('sa.PEG', 'peg.PEG'), w('sa.DMI', 'dmi.DMI'), w('sa.DISP', 'disp.DISP'),
  ],
});

const adderCore = adderExample('PŘÍKLAD: 1 BIT SČÍTAČKY ALU', 40, 400);
def('cfl_core', 4, {
  name: 'Jádro Coffee Lake (Skylake) — mikroarchitektura',
  subtitle: 'Intel Optimization Manual 248966 kap. 2.2 (Skylake): L1I/L1D 32 KB 8-way, L2 256 KB, µop cache 1536 (6 µop/takt), legacy dekodéry 5 µop/takt, IDQ 64, 8 portů (tab. 2-2). Z IDF15 / Chips and Cheese: ROB 224, scheduler 97 (58 + 39), registry 180 INT + 168 vektor, load/store buffer 72/56. Dole příklad: 1 bit sčítačky ALU.',
  components: [
    blk('fe', 'FRONT-END: L1I 32 KB + DEKODÉRY', 50, 50, [], ['µOP'], 'µOP CACHE 1536 · IDQ 64', 230, 80),
    blk('ooo', 'ROB 224 · SCHEDULER 97', 320, 50, ['µOP'], ['P0', 'P1', 'P5', 'P6', 'P2/P3', 'P4', 'P7'], 'AŽ 8 µOP ZA TAKT', 200, 150),
    blk('prf', 'REGISTRY 180 INT + 168 VEKTOR', 320, 240, [], [], 'FYZICKÝ REGISTROVÝ SOUBOR', 200, 70),
    blk('p0', 'P0 · ALU, FMA, DIV, SKOK', 560, 40, ['P0'], [], '', 190, 58),
    blk('p1', 'P1 · ALU, FMA, MUL, LEA', 560, 102, ['P1'], [], '', 190, 58),
    blk('p5', 'P5 · ALU, SHUFFLE, LEA', 560, 164, ['P5'], [], '', 190, 58),
    blk('p6', 'P6 · ALU, SHIFT, SKOK', 560, 226, ['P6'], [], '', 190, 58),
    blk('p23', 'P2/P3 · LOAD + ADRESA', 560, 288, ['P2/P3'], ['L1D'], '', 190, 58),
    blk('p4', 'P4 · STORE DATA', 560, 350, ['P4'], ['L1D'], '', 190, 58),
    blk('p7', 'P7 · STORE ADRESA', 560, 412, ['P7'], ['L1D'], '', 190, 58),
    blk('l1d', 'L1D 32 KB · L2 256 KB', 790, 290, ['L1D'], [], 'LB 72 · SB 56', 150, 90),
    ...adderCore.components,
  ],
  wires: [
    w('fe.µOP', 'ooo.µOP'),
    w('ooo.P0', 'p0.P0'), w('ooo.P1', 'p1.P1'), w('ooo.P5', 'p5.P5'), w('ooo.P6', 'p6.P6'),
    w('ooo.P2/P3', 'p23.P2/P3'), w('ooo.P4', 'p4.P4'), w('ooo.P7', 'p7.P7'),
    w('p23.L1D', 'l1d.L1D'), w('p4.L1D', 'l1d.L1D'), w('p7.L1D', 'l1d.L1D'),
    ...adderCore.wires,
  ],
});

// ================================================================ grafika ASUS Dual RTX 3060 Ti GDDR6X
def('mypc_gpu_board', 2, {
  name: 'ASUS Dual RTX 3060 Ti OC GDDR6X — bloky karty',
  subtitle: 'ASUS techspec + TechPowerUp: GA104-202, 8 GB GDDR6X 19 Gb/s na 256 bit = 608 GB/s, 2× 8 pin + slot, HDMI 2.1 + 3× DP 1.4a. GDDR6X ověřena 11. 11. 2026 (karta hlásí teplotu Memory Junction, kterou mají jen GDDR6X; nvidia-smi: 8192 MiB, limit 225 W, VBIOS 94.04.94.00.85). Výrobce čipů (Micron MT61K256M32JE-19?) a VRM (~8–10 fází, uP9512R) neověřeny – teardown této karty neexistuje.',
  components: [
    blk('p8a', '8 PIN #1 · 150 W', 50, 50, [], ['+12V'], 'ZE ZDROJE (PCIe1)', 170, 70),
    blk('p8b', '8 PIN #2 · 150 W', 50, 130, [], ['+12V'], 'ZE ZDROJE (PCIe2)', 170, 70),
    blk('edge', 'PCIe 4.0 x16 HRANA', 50, 220, [], ['+12V SLOT', '+3,3V', 'PCIe x16'], 'V B360 BĚŽÍ JAKO 3.0 x16 · SLOT ≤ 75 W', 190, 110),
    blk('vrm', 'GPU VRM ~8–10 FÁZÍ', 290, 50, ['+12V A', '+12V B', '+12V SLOT'], ['NVVDD'], 'uP9512R + DrMOS – NEOVĚŘENO', 200, 100),
    blk('mvdd', 'MVDD 2 FÁZE', 290, 175, ['+12V'], ['MVDD'], 'NAPÁJENÍ GDDR6X – NEOVĚŘENO', 200, 80),
    blk('gpu', 'GA104-202 · 38 z 48 SM', 540, 50, ['NVVDD', 'PCIe x16'], ['MC0–3', 'MC4–7', 'DISPLEJ'], 'DVOJKLIK → ČIP', 200, 140, { drill: 'ga104_die' }),
    blk('m0', '4× GDDR6X 8 Gb x32', 790, 50, ['4 × 32 BIT', 'MVDD'], [], 'GDDR6X OVĚŘENO · VÝROBCE NE', 160, 100),
    blk('m1', '4× GDDR6X 8 Gb x32', 790, 170, ['4 × 32 BIT', 'MVDD'], [], 'PAM4, 19 Gb/s NA PIN', 160, 100),
    blk('out', 'HDMI 2.1 + 3× DP 1.4a', 540, 260, ['DISPLEJ'], [], 'HDMI → MONITOR VA249HE', 200, 80),
    blk('fan', 'CHLADIČ: 2× AXIAL-TECH', 290, 300, [], [], '0 dB REŽIM POD 50 °C', 200, 80),
  ],
  wires: [
    w('p8a.+12V', 'vrm.+12V A'), w('p8b.+12V', 'vrm.+12V B'), w('edge.+12V SLOT', 'vrm.+12V SLOT'), w('edge.+12V SLOT', 'mvdd.+12V'),
    w('vrm.NVVDD', 'gpu.NVVDD'), w('edge.PCIe x16', 'gpu.PCIe x16'),
    w('gpu.MC0–3', 'm0.4 × 32 BIT'), w('gpu.MC4–7', 'm1.4 × 32 BIT'), w('mvdd.MVDD', 'm0.MVDD'), w('mvdd.MVDD', 'm1.MVDD'),
    w('gpu.DISPLEJ', 'out.DISPLEJ'),
  ],
});

def('ga104_die', 3, {
  name: 'NVIDIA GA104 — čip (die)',
  subtitle: 'Whitepaper GA102 App. A: plný GA104 = 48 SM, 6 GPC (u 3070 23 TPC), L2 4 MB, 8× 32bit řadič, PCIe 4.0, NVENC 7. gen / NVDEC 5. gen, 17,4 mld. tranzistorů, 392,5 mm², Samsung 8N. 3060 Ti má 38 SM a 80 ROP → nejspíš 5 aktivních GPC (odvozeno).',
  components: [
    blk('host', 'PCIe 4.0 x16 HOST', 50, 50, [], ['ÚLOHY'], 'V B360: 3.0 x16', 180, 70),
    blk('gt', 'GIGATHREAD ENGINE', 50, 140, ['ÚLOHY'], ['GPC'], 'ROZDĚLUJE BLOKY VLÁKEN', 180, 70),
    ...[0, 1, 2, 3, 4, 5].map((i) => blk(`gpc${i}`, `GPC ${i} · 4 TPC / 8 SM`, 270 + (i % 3) * 150, 50 + Math.floor(i / 3) * 100, ['GPC'], ['L2'], i === 5 ? 'U 3060 Ti NEJSPÍŠ VYPNUTÉ' : 'DVOJKLIK → SM', 140, 85, { drill: 'ampere_sm' })),
    blk('media', 'NVENC 7. GEN · NVDEC 5. GEN', 740, 50, [], [], 'AV1 DEKÓDOVÁNÍ', 200, 70),
    blk('disp', 'DISPLAY ENGINE', 740, 140, [], ['HDMI/DP'], 'HDMI 2.1, DP 1.4a, DSC 1.2a', 200, 70),
    blk('l2', 'L2 CACHE 4 MB (8 × 512 KB)', 270, 260, ['L2'], ['MC'], 'SDÍLENÁ VŠEMI SM', 440, 60),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => blk(`mc${i}`, `MC ${i} · 32 BIT`, 50 + i * 112, 370, ['MC'], ['GDDR6X'], '1 ČIP', 106, 80)),
  ],
  wires: [
    w('host.ÚLOHY', 'gt.ÚLOHY'),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => [w('gt.GPC', `gpc${i}.GPC`), w(`gpc${i}.L2`, 'l2.L2')]),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => w('l2.MC', `mc${i}.MC`)),
  ],
});

const adderSm = adderExample('PŘÍKLAD: 1 BIT SČÍTAČKY FP32', 40, 400);
const regSm = regExample('PŘÍKLAD: 1 BIT REGISTRU', 560, 400);
def('ampere_sm', 4, {
  name: 'Ampere GA10x — Streaming Multiprocessor (SM)',
  subtitle: 'Whitepaper GA102 str. 10–13: 4 bloky, každý L0 I-cache, warp scheduler, dispatch, registry 16 384 × 32 bit, 16 FP32 + 16 FP32/INT32, 1 Tensor Core 3. gen, 4 LD/ST, 1 SFU (počet LD/ST a SFU jen z diagramu). Na SM: 128 KB L1/sdílená, 4 texturovací jednotky, 1 RT Core 2. gen, 2 FP64.',
  components: [
    blk('ic', 'L1 INSTRUKČNÍ CACHE', 50, 50, [], ['INSTR'], 'SPOLEČNÁ PRO 4 BLOKY (DIAGRAM)', 230, 60),
    ...[0, 1, 2, 3].map((i) => blk(`pb${i}`, `BLOK ${i} · WARP SCHEDULER`, 50, 125 + i * 66, ['INSTR'], ['WARP'], 'L0 I-CACHE + DISPATCH 32 VLÁKEN/TAKT', 230, 58)),
    blk('rf', 'REGISTRY 4 × 16 384 × 32 BIT', 320, 50, ['WARP'], ['OPERANDY'], '256 KB NA SM', 210, 70),
    blk('fp32', '4 × 16 FP32', 320, 140, ['OPERANDY'], [], 'DATAPATH A', 200, 58),
    blk('fpint', '4 × 16 FP32 / INT32', 320, 206, ['OPERANDY'], [], 'DATAPATH B', 200, 58),
    blk('tc', '4× TENSOR CORE 3. GEN', 320, 272, ['OPERANDY'], [], 'SPARSITY 2:4', 200, 58),
    blk('ldst', '4 × 4 LD/ST', 560, 140, ['OPERANDY'], ['PAMĚŤ'], '', 180, 58),
    blk('sfu', '4 × 1 SFU', 560, 206, ['OPERANDY'], [], 'SIN, COS, 1/X …', 180, 58),
    blk('rt', 'RT CORE 2. GEN', 560, 272, [], [], 'PRŮSEČÍK PAPRSEK × TROJÚHELNÍK', 180, 58),
    blk('l1', 'L1 / SDÍLENÁ 128 KB', 780, 140, ['PAMĚŤ'], [], '128/0 AŽ 28/100 KB', 170, 70),
    blk('tex', '4× TEXTURE UNIT', 780, 230, ['PAMĚŤ'], [], '', 170, 60),
    ...adderSm.components, ...regSm.components,
  ],
  wires: [
    ...[0, 1, 2, 3].flatMap((i) => [w('ic.INSTR', `pb${i}.INSTR`), w(`pb${i}.WARP`, 'rf.WARP')]),
    ...['fp32', 'fpint', 'tc', 'ldst', 'sfu'].map((k) => w('rf.OPERANDY', `${k}.OPERANDY`)),
    w('ldst.PAMĚŤ', 'l1.PAMĚŤ'), w('ldst.PAMĚŤ', 'tex.PAMĚŤ'),
    ...adderSm.wires, ...regSm.wires,
  ],
});

// ================================================================ monitor ASUS VA249HE
def('va249_inside', 2, {
  name: 'ASUS VA249HE — bloky monitoru',
  subtitle: 'Varianta HE ověřena 11. 11. 2026: Windows hlásí připojení přes HDMI a VA249NA HDMI nemá. ASUS techspec: VA 23,8" 1920 × 1080, rozteč 0,2745 mm, 3000 : 1, HDMI + VGA, WLED bez blikání, vestavěný zdroj. Typ scaleru, LED driveru a desky zdroje je NEZJIŠTĚNÝ (teardown neexistuje); panel AUO M238HVN01.0 s LVDS je jen odhad pcmonitors.info.',
  components: [
    blk('hdmi', 'HDMI VSTUP (TMDS)', 50, 50, [], ['TMDS'], 'Z RTX 3060 Ti', 200, 70),
    blk('vga', 'VGA VSTUP (ANALOG RGB)', 50, 140, [], ['RGB'], 'NEPOUŽITÝ', 200, 70),
    blk('edid', 'EDID EEPROM (AUS24C1)', 50, 230, [], ['DDC'], 'VÝROBA 2020, TÝDEN 29', 200, 70),
    blk('psu', 'AC 100–240 V → INTERNÍ ZDROJ', 50, 330, [], ['+12V', '+5V'], 'TOPOLOGIE NEZJIŠTĚNA', 200, 90),
    blk('scaler', 'SCALER (TYP NEZJIŠTĚN)', 330, 50, ['TMDS', 'RGB', 'DDC', '+5V', 'TLAČÍTKA'], ['LVDS', 'PWM JAS'], 'PŘEPOČET + OSD', 220, 150),
    blk('osd', 'TLAČÍTKA OSD (5×)', 330, 260, [], ['TLAČÍTKA'], 'DOLE VPRAVO', 220, 70),
    blk('panel', 'T-CON + PANEL VA 1920 × 1080', 640, 50, ['LVDS'], [], 'AUO M238HVN01.0? (ODHAD)', 280, 110),
    blk('led', 'LED DRIVER (BOOST) + WLED', 640, 230, ['PWM JAS', '+12V'], [], 'FLICKER-FREE (DC STMÍVÁNÍ?)', 280, 90),
  ],
  wires: [
    w('hdmi.TMDS', 'scaler.TMDS'), w('vga.RGB', 'scaler.RGB'), w('edid.DDC', 'scaler.DDC'), w('psu.+5V', 'scaler.+5V'), w('osd.TLAČÍTKA', 'scaler.TLAČÍTKA'),
    w('scaler.LVDS', 'panel.LVDS'), w('scaler.PWM JAS', 'led.PWM JAS'), w('psu.+12V', 'led.+12V'),
  ],
});

// ================================================================ ventilátor 4 pin (chladič Intel, Stratus)
def('pwm_fan_inside', 2, {
  name: 'Ventilátor 4 pin PWM — vnitřek',
  subtitle: 'Intel 4-Wire PWM Fan Specification: 1 GND, 2 +12 V, 3 tacho (2 pulzy na otáčku, otevřený kolektor), 4 PWM 25 kHz s pull-upem ve ventilátoru. Uvnitř jednofázový BLDC: řadič s Hallovou sondou přepíná dvě cívky. E97379-003: 12 V, 1200–2500 ot/min, výrobce Delta / Foxconn / Nidec podle štítku (Intel); Stratus 120: 200–1400 ot/min. Typ řadiče neověřen.',
  components: [
    c('conn', 'CONN_FAN4', 'J1 4 PIN (CPU_FAN / CHA_FAN1)', 50, 60),
    blk('drv', 'ŘADIČ BLDC 1 FÁZE', 330, 60, ['+12V', 'GND', 'PWM', 'HALL'], ['CÍVKA A', 'CÍVKA B', 'TACHO'], 'TYP NEOVĚŘEN', 240, 130),
    blk('stator', 'STATOR (CÍVKY) + ROTOR S MAGNETEM', 650, 60, ['CÍVKA A', 'CÍVKA B'], ['HALL'], 'HALL SNÍMÁ POLOHU MAGNETU', 270, 100),
    blk('note', 'OTÁČKY = STŘÍDA PWM', 330, 260, [], [], 'BEZ PWM SIGNÁLU NAPLNO', 240, 70),
  ],
  wires: [
    w('conn.2 +12V', 'drv.+12V'), w('conn.1 GND', 'drv.GND'), w('conn.4 PWM', 'drv.PWM'), w('drv.TACHO', 'conn.3 SENSE'),
    w('drv.CÍVKA A', 'stator.CÍVKA A'), w('drv.CÍVKA B', 'stator.CÍVKA B'), w('stator.HALL', 'drv.HALL'),
  ],
});

// ================================================================ klávesnice ASUS ROG Strix Flare
def('mypc_keyboard', 2, {
  name: 'ASUS ROG Strix Flare — klávesnice',
  subtitle: 'Cherry MX RGB, 104/105 kláves v matici řádky × sloupce, podsvícení každé klávesy, USB 2.0 1000 Hz, průchozí USB na hlavní desce. MCU NXP LPC11U37F (Cortex-M0, 128 KB flash) podle teardownu TechPowerUp (jen výpis vyhledávače); LED drivery a velikost matice neověřeny. Dole simulovaný kousek matice: MCU budí sloupec, stisknutý spínač ho propojí s řádkem.',
  components: [
    blk('usb', 'USB 2.0 (KABEL 1)', 50, 50, [], ['D+/D−', '+5V'], 'HID KLÁVESNICE, 1000 Hz', 190, 80),
    blk('mcu', 'MCU NXP LPC11U37F', 300, 50, ['D+/D−', '+5V', 'ŘÁDKY'], ['SLOUPCE', 'LED DATA'], 'CORTEX-M0 · SKENUJE MATICI', 210, 110),
    blk('mx', 'MATICE CHERRY MX RGB', 560, 50, ['SLOUPCE'], ['ŘÁDKY'], 'DIODY PROTI GHOSTINGU (OBVYKLÉ)', 200, 80),
    blk('led', 'RGB LED DRIVERY (PER-KEY)', 560, 150, ['LED DATA'], [], 'AURA SYNC', 200, 70),
    blk('hub', 'USB PRŮCHOZÍ (KABEL 2)', 800, 50, [], [], 'SAMOSTATNÝ KABEL', 150, 80),
    inp('col0', 'SLOUPEC 0 (MCU)', 40, 300), inp('sw_a', 'KLÁVESA A', 150, 350),
    inp('col1', 'SLOUPEC 1 (MCU)', 40, 420), inp('sw_s', 'KLÁVESA S', 150, 470),
    c('k_a', 'AND', 'SPÍNAČ A', 280, 320), c('k_s', 'AND', 'SPÍNAČ S', 280, 440),
    c('row0', 'OR', 'ŘÁDEK 0', 410, 380),
    probe('in_row0', 'MCU ČTE ŘÁDEK 0', 530, 383),
  ],
  wires: [
    w('usb.D+/D−', 'mcu.D+/D−'), w('usb.+5V', 'mcu.+5V'), w('mcu.SLOUPCE', 'mx.SLOUPCE'), w('mx.ŘÁDKY', 'mcu.ŘÁDKY'), w('mcu.LED DATA', 'led.LED DATA'),
    w('col0.out', 'k_a.a'), w('sw_a.out', 'k_a.b'), w('col1.out', 'k_s.a'), w('sw_s.out', 'k_s.b'),
    w('k_a.out', 'row0.a'), w('k_s.out', 'row0.b'), w('row0.out', 'in_row0.in'),
  ],
});

// ================================================================ myš (OEM 30FA:1440)
const mouseReg = regExample('VZORKOVÁNÍ TLAČÍTKA (MCU)', 40, 330);
def('mypc_mouse', 2, {
  name: 'USB herní myš (OEM „INSTANT“ 30FA:1440)',
  subtitle: 'Bezejmenný OEM prodávaný pod mnoha značkami; v USB je kompozitní zařízení (myš + klávesnice pro makra). Typ MCU a optického senzoru je neověřený. Dole: MCU vzorkuje tlačítko s hodinami (D klopný obvod) – základ odstranění zákmitů.',
  components: [
    blk('usb', 'USB (D+/D−, 5 V)', 50, 50, [], ['D+/D−', '+5V'], 'HID MYŠ + KLÁVESNICE', 180, 80),
    blk('mcu', 'MCU (TYP NEOVĚŘEN)', 290, 50, ['D+/D−', '+5V', 'POHYB', 'TLAČÍTKA', 'KOLEČKO'], ['RGB'], 'HLÁSÍ POHYB PC', 220, 140),
    blk('sensor', 'OPTICKÝ SENZOR + LED', 580, 50, [], ['POHYB'], 'TYP NEOVĚŘEN', 200, 70),
    blk('btn', 'TLAČÍTKA (MIKROSPÍNAČE)', 580, 140, [], ['TLAČÍTKA'], 'L, P, KOLEČKO, BOČNÍ', 200, 70),
    blk('wheel', 'ENKODÉR KOLEČKA', 580, 230, [], ['KOLEČKO'], 'KVADRATURNÍ A/B', 200, 70),
    blk('rgb', 'RGB LED', 290, 230, ['RGB'], [], '', 220, 60),
    ...mouseReg.components,
  ],
  wires: [
    w('usb.D+/D−', 'mcu.D+/D−'), w('usb.+5V', 'mcu.+5V'), w('sensor.POHYB', 'mcu.POHYB'), w('btn.TLAČÍTKA', 'mcu.TLAČÍTKA'), w('wheel.KOLEČKO', 'mcu.KOLEČKO'), w('mcu.RGB', 'rgb.RGB'),
    ...mouseReg.wires,
  ],
});

// ================================================================ zdroj Endorfy Vero L5 Bronze 600 W (odhad modelu)
def('mypc_psu', 2, {
  name: 'Endorfy Vero L5 Bronze 600 W — bloky zdroje',
  subtitle: 'Prodejci/tisk: 80+ Bronze, nemodulární, +12 V jedna větev 49 A (588 W), 3,3 V max. 97 W, aktivní PFC, DC-DC pro 5/3,3 V, kondenzátory Teapo 105 °C, ventilátor Stratus 120 FDB, ochrany OVP/UVP/OCP/SCP/OPP/SIP. Výrobce platformy, topologie hlavního měniče a typy IC NEOVĚŘENY (teardown ani Cybenetics neexistuje). Dole simulovaná logika zapnutí.',
  components: [
    blk('ac', 'AC VSTUP + EMI FILTR', 50, 50, [], ['AC'], '200–240 V, 5 A', 190, 70),
    blk('pfc', 'MŮSTEK + AKTIVNÍ PFC', 290, 50, ['AC'], ['~380 V DC'], 'ŘADIČ NEOVĚŘEN', 190, 80),
    blk('bulk', 'BULK KONDENZÁTOR', 530, 50, ['~380 V DC'], ['DC'], 'TEAPO 105 °C · HODNOTA NEOVĚŘENA', 190, 70),
    blk('main', 'HLAVNÍ MĚNIČ + TRAFO', 530, 150, ['DC', 'ŘÍZENÍ'], ['12 V AC'], 'TOPOLOGIE NEOVĚŘENA', 190, 90),
    blk('r12', 'USMĚRNĚNÍ +12 V · 49 A', 770, 50, ['12 V AC'], ['+12V'], 'JEDNA VĚTEV 588 W', 170, 80),
    blk('dcdc', 'DC-DC 12 → 5 / 3,3 V', 770, 150, ['+12V'], ['+5V', '+3,3V'], '3,3 V MAX. 97 W', 170, 80),
    blk('sb', 'POHOTOVOSTNÍ +5VSB', 290, 160, ['~380 V DC'], ['+5VSB'], 'BĚŽÍ I VE VYPNUTÉM PC', 190, 70),
    blk('sup', 'SUPERVIZOR + OCHRANY', 290, 260, ['+5VSB', 'PS_ON#'], ['ŘÍZENÍ', 'PWR_OK'], 'OVP UVP OCP SCP OPP SIP', 210, 90),
    blk('fan', 'VENTILÁTOR STRATUS 120 FDB', 530, 270, [], [], 'OTÁČKY PODLE ZÁTĚŽE', 190, 70),
    blk('cab', 'KABELY (PEVNÉ)', 770, 250, ['+12V', '+5V', '+3,3V', 'PWR_OK'], [], '24P · EPS 4+4 · 2× PCIe 6+2 · 5× SATA · MOLEX', 170, 110),
    inp('ps_on', 'PS_ON# Z DESKY', 40, 400), inp('ac_ok', 'AC V POŘÁDKU', 40, 470),
    c('inv', 'NOT', 'AKTIVNÍ V NULE', 180, 406),
    c('start', 'AND', 'SPUSŤ MĚNIČ', 300, 435),
    probe('run', 'ZDROJ BĚŽÍ', 430, 438),
  ],
  wires: [
    w('ac.AC', 'pfc.AC'), w('pfc.~380 V DC', 'bulk.~380 V DC'), w('pfc.~380 V DC', 'sb.~380 V DC'), w('bulk.DC', 'main.DC'),
    w('main.12 V AC', 'r12.12 V AC'), w('r12.+12V', 'dcdc.+12V'), w('r12.+12V', 'cab.+12V'), w('dcdc.+5V', 'cab.+5V'), w('dcdc.+3,3V', 'cab.+3,3V'),
    w('sb.+5VSB', 'sup.+5VSB'), w('sup.ŘÍZENÍ', 'main.ŘÍZENÍ'), w('sup.PWR_OK', 'cab.PWR_OK'),
    w('ps_on.out', 'inv.in'), w('inv.out', 'start.a'), w('ac_ok.out', 'start.b'), w('start.out', 'run.in'),
  ],
});

// ================================================================ SSD Samsung 970 EVO Plus 500 GB
def('evo_plus_ssd', 2, {
  name: 'Samsung 970 EVO Plus 500 GB — vnitřek SSD',
  subtitle: 'AnandTech, PCPer, FPSReview: řadič Phoenix (S4LR020; kusy od roku 2021 mají pod stejným označením řadič Elpis S4LV003 – pozná se podle firmwaru: 2B2QEXM7 = Phoenix), 512 MB LPDDR4, V-NAND 5. gen 92 vrstev TLC, čipy 256 Gb (16 × 256 Gb = 500 GB), jednostranná deska, NVMe 1.3, PCIe 3.0 x4, 3500/3200 MB/s, TurboWrite 4 + 18 GB, 3,3 V průměr 5,8 W. Počet pouzder NAND, typ DRAM a PMIC neověřeny.',
  components: [
    blk('m2', 'M.2 M-KLÍČ · PCIe 3.0 x4', 50, 50, [], ['PCIe x4', '+3,3V'], 'SLOT M.2_2 Z PCH', 200, 80),
    blk('pwr', 'NAPÁJENÍ 3,3 V', 50, 190, ['+3,3V'], [], 'PMIC NEOVĚŘEN · 5,8 W', 200, 80),
    blk('ctl', 'ŘADIČ SAMSUNG PHOENIX', 320, 50, ['PCIe x4'], ['DRAM', 'NAND'], 'S4LR020 · DVOJKLIK → ŘADIČ', 240, 110, { drill: 'phoenix_ctl' }),
    blk('dram', 'LPDDR4 512 MB', 640, 50, ['DRAM'], [], 'MAPOVACÍ TABULKA FTL', 200, 70),
    blk('nand', 'V-NAND V5 TLC · 16 × 256 Gb', 640, 150, ['NAND'], [], '92 VRSTEV · POUZDRA NEOVĚŘENA', 260, 90),
    blk('tw', 'TURBOWRITE 4 + 18 GB', 320, 210, [], [], 'SLC CACHE · POTOM 900 MB/s', 240, 70),
    blk('therm', 'TEPLOTNÍ ČIDLO', 640, 280, [], [], 'PROVOZ 0–70 °C · KRITICKÁ MEZ ~85 °C', 260, 70),
  ],
  wires: [w('m2.PCIe x4', 'ctl.PCIe x4'), w('m2.+3,3V', 'pwr.+3,3V'), w('ctl.DRAM', 'dram.DRAM'), w('ctl.NAND', 'nand.NAND')],
});

const phoenixReg = regExample('PŘÍKLAD: 1 BIT FRONTY PŘÍKAZŮ', 40, 400);
def('phoenix_ctl', 3, {
  name: 'Samsung Phoenix (S4LR020) — řadič NVMe',
  subtitle: 'AnandTech/PCPer: 5 jader (jedno vyhrazené pro hostitele), 8 kanálů NAND, poniklované pouzdro; podle TechPowerUp ARM Cortex-R (jen výpis vyhledávače). Šifrování AES-256 / TCG Opal 2.0. Vnitřní bloky ECC a FTL podle obecné stavby řadičů – neověřeno.',
  components: [
    blk('host', 'PCIe 3.0 x4 PHY + NVMe 1.3', 50, 50, [], ['PŘÍKAZY'], '3500 / 3200 MB/s', 220, 80),
    blk('cores', '5 JADER (1 PRO HOSTA)', 330, 50, ['PŘÍKAZY'], ['FTL'], 'ARM CORTEX-R (VÝPIS)', 240, 90),
    blk('ftl', 'FTL + WEAR LEVELING + GC', 330, 170, ['FTL'], ['ADRESY'], 'NEOVĚŘENO', 240, 70),
    blk('ecc', 'ECC + AES-256', 330, 270, ['ADRESY'], ['DATA'], 'TYP ECC NEOVĚŘEN', 240, 70),
    blk('dramc', 'ŘADIČ LPDDR4', 630, 50, ['FTL'], [], '512 MB', 200, 70),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => blk(`ch${i}`, `KANÁL ${i}`, 420 + (i % 4) * 135, 360 + Math.floor(i / 4) * 85, ['DATA'], [], 'NAND', 128, 75)),
    ...phoenixReg.components,
  ],
  wires: [
    w('host.PŘÍKAZY', 'cores.PŘÍKAZY'), w('cores.FTL', 'ftl.FTL'), w('cores.FTL', 'dramc.FTL'), w('ftl.ADRESY', 'ecc.ADRESY'),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => w('ecc.DATA', `ch${i}.DATA`)),
    ...phoenixReg.wires,
  ],
});

// ================================================================ RAM Kingston HyperX Fury 8 GB DDR4-2666
def('fury_module', 2, {
  name: 'Kingston HyperX Fury 8 GB DDR4-2666 — modul',
  subtitle: 'Kingston datasheet HX426C16FB2/8 (= FB3/8): 1G × 64, 1Rx8, 8 čipů 1G × 8 (8 Gb) na jedné straně ve 2 skupinách po 4, 16 bank ve 4 skupinách, JEDEC i XMP 2666 CL16-18-18 při 1,2 V, VPP 2,5 V, SPD EEPROM na I²C, adresy fly-by. Výrobce čipů DRAM neověřen (Kingston míchá SK hynix / Micron).',
  components: [
    blk('edge', 'HRANA 288 PINŮ (UDIMM)', 50, 180, [], ['CA/ŘÍZENÍ', 'CK', 'DQ 0–31', 'DQ 32–63', 'I²C'], 'BEZ REGISTRU', 190, 130),
    blk('d14', 'D1–D4 · 4× DDR4 8 Gb x8', 330, 50, ['CA (FLY-BY)', 'DQ 0–31'], [], 'DVOJKLIK → ČIP DDR4', 240, 90, { drill: 'ddr4_8g_x8' }),
    blk('d58', 'D5–D8 · 4× DDR4 8 Gb x8', 330, 170, ['CA (FLY-BY)', 'DQ 32–63'], [], 'DVOJKLIK → ČIP DDR4', 240, 90, { drill: 'ddr4_8g_x8' }),
    blk('term', 'TERMINACE VTT', 650, 110, ['CA (FLY-BY)'], [], 'NA KONCI FLY-BY', 200, 80),
    blk('spd', 'SPD EEPROM (JEDEC + XMP 2.0)', 330, 330, ['I²C'], [], '2666 CL16-18-18 · 1,2 V', 240, 80),
    blk('pwr', 'VDD 1,2 V · VPP 2,5 V', 650, 330, [], [], 'Z DESKY', 200, 80),
  ],
  wires: [
    w('edge.CA/ŘÍZENÍ', 'd14.CA (FLY-BY)'), w('edge.CA/ŘÍZENÍ', 'd58.CA (FLY-BY)'), w('edge.CA/ŘÍZENÍ', 'term.CA (FLY-BY)'),
    w('edge.DQ 0–31', 'd14.DQ 0–31'), w('edge.DQ 32–63', 'd58.DQ 32–63'), w('edge.I²C', 'spd.I²C'),
  ],
});

def('ddr4_8g_x8', 3, {
  name: 'DDR4 8 Gb x8 — vnitřek čipu',
  subtitle: 'Micron MT40A1G8 (stejná organizace jako čipy Fury): 4 bank groups × 4 banky, 65 536 řádků (A[15:0]) × 1 024 sloupců (A[9:0]) × 8 bit, stránka 1 KB, prefetch 8n, 1,2 V / VPP 2,5 V. Bloky podle funkčního diagramu Micronu.',
  components: [
    blk('cmd', 'ŘÍZENÍ + DEKODÉR PŘÍKAZŮ', 50, 50, [], ['PŘÍKAZ'], 'ACT, RAS, CAS, WE, CS, CKE', 210, 80),
    blk('mr', 'MODE REGISTRY', 50, 170, ['PŘÍKAZ'], [], 'CL16, CWL, ODT', 210, 60),
    blk('ref', 'ČÍTAČ REFRESHE', 50, 260, ['PŘÍKAZ'], ['ŘÁDEK'], 'tRFC 350 ns', 210, 70),
    blk('rmux', 'ROW ADDRESS MUX', 300, 50, ['PŘÍKAZ', 'ŘÁDEK'], ['RA[15:0]'], '', 190, 80),
    blk('rdec', 'ŘÁDKOVÝ DEKODÉR 16 → 65 536', 300, 160, ['RA[15:0]'], ['WL'], '', 190, 80),
    blk('bg', 'BG[1:0] / BA[1:0]', 300, 270, ['PŘÍKAZ'], ['BANKA'], '16 BANK', 190, 70),
    blk('cdec', 'SLOUPCOVÝ DEKODÉR 10 → 1024', 300, 370, ['PŘÍKAZ'], ['CSL'], '', 190, 80),
    blk('arr', '4 BANK GROUPS × 4 BANKY', 530, 50, ['WL', 'BANKA', 'CSL'], ['BL'], 'DVOJKLIK → BUŇKY 1T1C', 210, 100, { drill: 'ddr4_cells' }),
    blk('sa', 'SENSE AMPLIFIERY', 530, 180, ['BL'], ['DATA'], 'STRÁNKA 1 KB', 210, 70),
    blk('iog', 'I/O GATING + READ FIFO', 530, 280, ['DATA'], ['DQ'], '', 210, 70),
    blk('io', 'DQ[7:0] + DQS · 8n', 780, 280, ['DQ'], [], 'BL8 / BC4', 160, 80),
    blk('dll', 'DLL · ODT · ZQ', 780, 50, [], [], 'ZQ 240 Ω', 160, 90),
  ],
  wires: [
    w('cmd.PŘÍKAZ', 'mr.PŘÍKAZ'), w('cmd.PŘÍKAZ', 'ref.PŘÍKAZ'), w('cmd.PŘÍKAZ', 'rmux.PŘÍKAZ'), w('ref.ŘÁDEK', 'rmux.ŘÁDEK'),
    w('cmd.PŘÍKAZ', 'bg.PŘÍKAZ'), w('cmd.PŘÍKAZ', 'cdec.PŘÍKAZ'),
    w('rmux.RA[15:0]', 'rdec.RA[15:0]'), w('rdec.WL', 'arr.WL'), w('bg.BANKA', 'arr.BANKA'), w('cdec.CSL', 'arr.CSL'),
    w('arr.BL', 'sa.BL'), w('sa.DATA', 'iog.DATA'), w('iog.DQ', 'io.DQ'),
  ],
});

// ================================================================ USB mikrofon (C-Media 0D8C:0134)
def('mypc_mic', 2, {
  name: 'USB mikrofon (C-Media 0D8C:0134)',
  subtitle: 'Windows ho vidí jen jako záznamové zařízení. linux-hardware.org vede 0D8C:0134 jako „TONOR TC310 USB MIC“ (USB Audio Class 1); TONOR mikrofony: kondenzátorové, kardioida, 16 bit / 44,1–48 kHz. Uvnitř kapsle → předzesilovač → kodek C-Media (ADC + USB). Typ čipu C-Media a kapsle neověřeny.',
  components: [
    blk('cap', 'KONDENZÁTOROVÁ KAPSLE', 50, 60, ['NAPÁJENÍ'], ['SIGNÁL'], 'ELEKTRETOVÁ (OBVYKLÉ)', 200, 80),
    blk('pre', 'PŘEDZESILOVAČ', 300, 60, ['SIGNÁL'], ['LINKA'], '', 180, 80),
    blk('codec', 'C-MEDIA USB AUDIO KODEK', 530, 60, ['LINKA', '+5V'], ['D+/D−', 'NAPÁJENÍ'], 'ADC, USB AUDIO CLASS', 220, 110),
    blk('usb', 'USB (D+/D−, 5 V)', 800, 60, ['D+/D−'], ['+5V'], 'DO PC', 150, 80),
  ],
  wires: [
    w('cap.SIGNÁL', 'pre.SIGNÁL'), w('pre.LINKA', 'codec.LINKA'), w('codec.D+/D−', 'usb.D+/D−'), w('usb.+5V', 'codec.+5V'), w('codec.NAPÁJENÍ', 'cap.NAPÁJENÍ'),
  ],
});

// ================================================================ dvojklik na každý funkční blok → simulovaný obvod o úroveň hlouběji
// (cell_* výše nebo existující obvody z karty NV1 se stejným principem). Bez dvojkliku zůstávají jen pasivní díly
// (konektory, kabely, cívky, kondenzátory, mechanické spínače) – ty jsou už jen měď a plast.
const SERDES = 'cell_serdes';
const DRILLS = {
  nct6796d: { lpc: SERDES, acpi: 'cell_pwrbtn', hwm: 'cell_lt', temp: 'cell_lt', fanctl: 'cell_lt', tach: 'cell_toggle', kbc: SERDES, uart: SERDES, gpio: 'REGISTER_8BIT' },
  mypc_board: { sio: 'nct6796d', fan: 'cell_lt', vrm: 'cell_buck', dimma: 'ddr4_8g_x8', dimmb: 'ddr4_8g_x8', x16: 'pcie3_ctrl', disp: 'gen9_display', lan: 'rtl8111h', pci: 'pci_target', sata: 'pch_ahci', usb: 'pch_xhci', m2: 'phoenix_ctl', slots: 'pcie3_ctrl', audio: 'alc887', bios: 'cell_eeprom' },
  b360_pch: { dmi: 'pcie3_ctrl', hsio: 'pch_hsio', pcie: 'pcie3_ctrl', sata: 'pch_ahci', usb3: 'pch_xhci', usb2: 'pch_xhci', hda: 'pch_hda', spi: 'pch_spi', smb: 'pch_smbus', me: 'csme12', cnvi: SERDES, clk: 'pch_icc' },
  cfl_die: { ring: 'cfl_ring', gt: 'gen9_gt2', pcu: 'cfl_pcu', sa: 'cfl_sa', imc: 'cfl_imc', peg: 'pcie3_ctrl', dmi: 'pcie3_ctrl', disp: 'gen9_display' },
  cfl_core: { fe: 'x86_frontend', ooo: 'x86_ooo', prf: 'cell_sram', p0: 'FULL_ADDER', p1: 'FULL_ADDER', p5: 'MUX', p6: 'MUX', p23: 'FULL_ADDER', p4: 'cell_sram', p7: 'FULL_ADDER', l1d: 'x86_memsub' },
  mypc_gpu_board: { edge: 'pcie3_ctrl', vrm: 'cell_buck', mvdd: 'cell_buck', m0: 'gddr6x_chip', m1: 'gddr6x_chip', out: 'nv_display', fan: 'cell_lt' },
  ga104_die: { host: 'pcie3_ctrl', gt: 'cell_arbiter', media: 'ampere_nvenc', disp: 'nv_display', l2: 'nv_l2', ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((i) => [`mc${i}`, 'gddr6x_ctrl'])) },
  ampere_sm: { ic: 'cell_sram', pb0: 'cell_arbiter', pb1: 'cell_arbiter', pb2: 'cell_arbiter', pb3: 'cell_arbiter', rf: 'cell_sram', fp32: 'FULL_ADDER', fpint: 'FULL_ADDER', tc: 'ampere_tensor', ldst: 'FULL_ADDER', sfu: 'cell_decoder', rt: 'rt_core2', l1: 'cell_sram', tex: 'cell_mac' },
  va249_inside: { hdmi: SERDES, vga: 'sigma_delta', edid: 'cell_eeprom', psu: 'cell_buck', scaler: 'crtc', panel: 'cell_tft', led: 'cell_lt' },
  pwm_fan_inside: { drv: 'cell_buck', note: 'cell_lt' },
  mypc_keyboard: { usb: 'usb_fs_device', mcu: 'cortex_m0', mx: 'cell_decoder', led: 'cell_lt' },
  mypc_mouse: { usb: 'usb_fs_device', mcu: 'ADDER_8BIT', sensor: 'cell_aps', wheel: 'cell_quad', rgb: 'cell_lt' },
  mypc_psu: { pfc: 'cell_buck', main: 'cell_buck', r12: 'cell_buck', dcdc: 'cell_buck', sb: 'cell_buck', sup: 'cell_lt', fan: 'cell_lt' },
  evo_plus_ssd: { pwr: 'cell_buck', dram: 'ddr4_cells', nand: 'cell_nand', tw: 'cell_nand', therm: 'cell_lt' },
  phoenix_ctl: { host: SERDES, cores: 'ADDER_8BIT', ftl: 'RAM', ecc: 'cell_parity', dramc: 'COMPARATOR_8BIT', ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((i) => [`ch${i}`, SERDES])) },
  fury_module: { spd: 'cell_eeprom' },
  ddr4_8g_x8: { cmd: 'cell_decoder', mr: 'REGISTER_8BIT', ref: 'ADDER_8BIT', rmux: 'MUX', rdec: 'cell_decoder', bg: 'cell_decoder', cdec: 'cell_decoder', sa: 'NOT', iog: 'REGISTER_8BIT', io: SERDES, dll: 'D_FF' },
  mypc_mic: { cap: 'nmos_transistor', pre: 'NOT', codec: 'sigma_delta', usb: 'usb_fs_device' },
};
for (const [key, map] of Object.entries(DRILLS)) {
  for (const comp of MY_PC_SUBCIRCUITS[key].components) if (map[comp.id]) comp.drill = map[comp.id];
}

// DIE 3D: vnitřek zařízení (L2) je deska plošných spojů s bloky, čipy (L3) jsou otevřené pouzdro s die
for (const sub of Object.values(MY_PC_SUBCIRCUITS)) if (sub.level === 2) sub.scene = 'board';
for (const key of ['b360_pch', 'cfl_die', 'ga104_die', 'phoenix_ctl', 'ddr4_8g_x8']) MY_PC_SUBCIRCUITS[key].scene = 'flipdie'; // moderní pouzdra BGA/LGA
MY_PC_SUBCIRCUITS.nct6796d.scene = 'die'; // Super I/O: plastové QFP s drátky (pouzdro v siliconScenes PACKAGES)

// výrobní proces (vybírá tranzistor L7 a atomy L8): známé čipy podle výrobce, jinde proces neuveden
for (const sub of Object.values(MY_PC_SUBCIRCUITS)) if (sub.level === 2) sub.process = 'unknown';
Object.assign(MY_PC_SUBCIRCUITS.cfl_die, { process: 'intel14' });
Object.assign(MY_PC_SUBCIRCUITS.b360_pch, { process: 'intel14' });
Object.assign(MY_PC_SUBCIRCUITS.ga104_die, { process: 'samsung8n' });
Object.assign(MY_PC_SUBCIRCUITS.cell_buck, { process: 'power' }); // VRM / DC-DC: diskrétní výkonové MOSFETy
Object.assign(MY_PC_SUBCIRCUITS.cell_tft, { process: 'tft' }); // panel LCD: tenkovrstvé tranzistory
Object.assign(MY_PC_SUBCIRCUITS.cell_nand, { process: 'vnand' }); // buňky V-NAND se zachyceným nábojem
