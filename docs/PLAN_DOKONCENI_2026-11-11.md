# Plán dokončení a kontext práce z 11. 11. 2026

> **Stav 11. 11. 2026 17:20 – kapitola 3 je HOTOVÁ.** Přestavba paměťové sběrnice karty je v kódu podle návrhu 3.1,
> všechny body 3.3 jsou udělané (deska, rozměry, záslepka, 3D, hierarchie, kusovník a nabídky, ANATOMY, testy,
> diagnostika, README, změřená rychlost). Skript `docs/rozpracovano/rebuild_nv1.mjs` byl použit a smazán.
> Proti návrhu se změnilo: testovací video režim má htotal 64 a hss 44 (přední zatemnění musí být delší než zpoždění
> DAC) a rozmístění součástek je nově odměřené z fotografie karty (ne polohy navržené v 3.3 bod 1). Rychlost: 317 kroků
> na µs, snímek 640×480 za ~42 s (dřív ~19 s); zrychlení slučováním hran hodin uživatel odmítl, věrnost má přednost. Kapitoly 4 (fakta a zdroje) a 5 (zbytky) platí dál;
> co na kartě ještě chybí, je v `AgentMEMORY.md` v sekci „Karta NV1 podle datasheetu“.

Stav k 11. 11. 2026 13:03. Větev `main`, poslední commit s kódem `09f3319`, 274/274 testů, lint čistý, build prošel.
Práce byla zastavena uprostřed přestavby paměťové sběrnice karty NV1 (kapitola 3). V repu není nic rozbitého:
rozpracovaná přestavba existuje jen jako skript v `docs/rozpracovano/rebuild_nv1.mjs`, do kódu se nepustila.

## 1. Co uživatel zadal

1. „Pokračuj podle plánu (`PLAN_PROJEKTU.md`), pak udělej review všech projektů a komponent a oprav, co není přesné."
2. „Pořeš, co jsi vypsal v *Co se nepovedlo a co zůstává*, konflikt vyřeš (AgentMEMORY klidně přepiš) a hoď to do mainu."
3. „Zastav to, napiš plán toho, co dodělat, a kontext konverzace do .md a pushni to."

## 2. Co je hotové (vše na `main`)

| Commit | Co |
|---|---|
| `76f3327` | Bloky z plánu §4.3–4.4: násobička, barrel shifter, FPU half, MMIO dekodér, IRQ a DMA řadič, režimy monitoru + H/V-Sync, formáty sondy, `Tab`, krok o celý takt. Pryč falešná animace „NV1 60 FPS". |
| `8dbad3b` | Smazán nepoužívaný inspektor součástek (3 soubory, ~1800 řádků). Vrátí ho `git revert 8dbad3b`. |
| `16122ef` | Review knihovny: chyby jádra (MUX/DEMUX, ROM/RAM, registr, odpojený drát), přiřazení reálných součástek, assembler, skutečná „verifikace". |
| `201787d` | Review AI PC (Seasonic, ventilátor, sloty, redukce, Add2PSU). |
| `fbaa21a` | Karta NV1: takt kodeku z RAMDACu (jeden krystal), refresh 776 MCLK, PCI 2.0, popisy. |
| `58fd8a9` | Sloučení s `8f1587a` (MŮJ PC, L1–L11) – konflikty v `aiCopilot.js`, `models.js`, `AgentMEMORY.md`. |
| `8af1a57` | Vnitřní schémata nových bloků až na tranzistory, ukázka „DMA → VRAM + přerušení" v galerii, kmitající obvod končí v `X`, DEMUX do hloubky, sběrnicové hodnoty šestnáctkově. |
| `100a437` | Review hlubokých úrovní L7–L11 (13 nálezů). |
| `e7f26bf` | NV1 jako dvoufunkční PCI zařízení podle přílohy A datasheetu. |
| `edd2fb6` | Kodek přes `AUR#`/`AUW#` v režimu PIO, bez DRQ/DACK. |
| `09f3319` | Review projektu MŮJ PC (12 nálezů). |

Review dělalo šest nezávislých kontrol se zdroji (knihovna, AI PC, karta NV1, MŮJ PC, hluboké úrovně, ověření karty
druhým zdrojem). Opravy jsem psal sám, kontroly jen hlásily.

## 3. Rozpracováno: paměťová sběrnice karty NV1 podle datasheetu

Dnešní model má jednu 64bitovou sběrnici, pixely po `P[14:0]`, vlastní piny pro ROM a game port přímo z NV1.
Skutečný čip to má jinak (datasheet STG2000, září 1996; datasheet STG1732/64, červen 1995).

### 3.1 Návrh (rozhodnuto, stačí implementovat)

**Piny NV1** (`NV1_CORE` v `src/engine/devices/nv1Card.js`):
- vstupy: `mclkx2` (100 MHz, místo `mclk`), `vclk`, `md_lo`, `md_hi` (obousměrné);
- výstupy: `ma02`, `ma13`, `ras_n`, `cas02_lo_n`, `cas02_hi_n`, `cas13_lo_n`, `cas13_hi_n` (po 2 bitech),
  `we03_n`, `we12_n`, `oe0_n`, `oe1_n`, `en64`, `md_lo`, `md_hi`, `loadclk`, `blank_n`, `daccs_n`, `romcs_n`, `hsync`, `vsync`;
- zrušit: `ma`, `cas0_n`–`cas3_n`, `we_n`, `oe_n`, `md0`–`md3`, `pix`, `rom_a`, `rom_d`, `rom_ce_n`, `rom_oe_n`, `sat_sel`, `sat_d`.

Sběrnice se v enginu dělí na 16bitové řezy (`md_lo` = MD[15:0], `md_hi` = MD[31:16]), protože síť má jednu hodnotu.

**Zapojení desky** (`src/engine/presets/nv1Board.js`):
- banka 0: `dram0` na MD[15:0] s `cas02_lo_n`, `dram1` na MD[31:16] s `cas02_hi_n`; oba `ma02`, `we03_n`, `oe0_n`;
- banka 1: `dram2` na SDB[15:0] s `cas13_lo_n`, `dram3` na SDB[31:16] s `cas13_hi_n`; oba `ma13`, `we12_n`, `oe1_n`;
- sběrnicový spínač (`BUS_SWITCH_32`, na kartě 4× Pericom PI5C3245Q, U25–U28) mezi MD a SDB, řídí ho `en64`;
- Palette-DAC: `p_lo0`/`p_hi0` na MD, `p_lo1`/`p_hi1` na SDB, `loadclk`, `blank_n`, `daccs_n`;
- BIOS ROM: `a` na MD[31:16] (adresa MD[30:16], MD[31] = R/W#), `d` na MD[15:0] (spodní bajt), `ce_n` i `oe_n` na `romcs_n`;
- game port: `ramdac.gp_sel` → `SEGA_ASIC` → header `SEGA_HEADER` (J5 PORT A) → pad; modulární zásuvka zůstane nezapojená.

**Mapování adres:** bajtová adresa framebufferu → 32bitové slovo `w = adr >> 2` → banka `w & 1`, buňka `w >> 1`
(řádek = buňka >> 9, sloupec = buňka & 511). Je to stejné mapování jako dnes (`chip = (bajt >> 1) & 3`, `slovo = bajt >> 3`),
takže test „frame buffer ends up in the four DRAM chips" má projít beze změny.

**Řadič paměti** běží na `mclkx2`, jeden tik = půl periody T (10 ns). Časy z tabulek 3, 5, 6, 7, 10:

| Cyklus | Průběh v tikách |
|---|---|
| otevření řádku | RAS# dolů, +2 sloupec (tRAH = T), +4 CAS# (tRCD = 2T) |
| čtení (FPM) | CAS# dole 2 tiky (tCAS = T), pak vzorek; mezi CAS# aspoň 2 tiky (tCP = T) → stránkový cyklus 4 tiky |
| zápis (late write) | CAS# dolů s daty, +1 WE# dolů, +2 WE# i CAS# nahoru, +3 uvolnit MD |
| zavření | RAS# dole aspoň 7 tiků (tRAS = 3,5T), před dalším otevřením 5 tiků (tRP = 2,5T) |
| refresh CBR | CAS# obou bank dolů, +2 RAS# dolů, +2 CAS# nahoru, RAS# dole celkem 7 tiků |
| pixely do DAC | `en64 = 1`, CAS# obou bank, `oe0_n`/`oe1_n` dolů, po 2 tikách náběžná hrana `loadclk` |
| ROM bajt | adresa na MD[31:16], +2 `romcs_n` dolů, 26 tiků (13T), vzorek MD[7:0] na náběžné hraně |
| registr DAC | adresa na MD[15:8], +3 `daccs_n` dolů, +1 data nebo uvolnit sběrnici, dole 6 tiků (3T) |

Model DRAM (`DRAM_256K16`) potřebuje pozdní zápis: sestupná hrana WE# při CAS# dole zapíše bajty, jejichž CAS# je dole.

**Pořadí požadavků:** pixely → refresh → registry DAC → ROM → čtení → zápis.
- Zásobník pixelů v DAC má jen 128 bitů, tedy dvě 64bitová slova. Pixely se proto načítají za běhu obrazu, vždy když je místo.
- Časovač refreshe jen žádá (každých 1552 tiků přičte jedničku do `refreshDue`); refresh proběhne, až je zásobník plný.
- ROM (300 ns na bajt) smí jen při vypnutém CRTC nebo ve vertikálním zatemnění, jinak zásobník vyschne.

**Video:** `vclk` = bodový takt / 4 (jedno slovo = 4 pixely RGB555). Čítače CRTC zůstávají v pixelech a přičítají po 4;
`hdisp`, `hss`, `hse`, `htotal` musí být násobky 4 (640×480 i testovací režim 32×16 to splňují).
- Na začátku vertikálního zatemnění pošle NV1 na `BLANK#` sekvenci 0-1-0; DAC podle ní vynuluje zásobník.
- DAC vzorkuje `BLANK#` na náběžné hraně `vclk` a slovo odebere o jeden `vclk` později, aby poznal nulovací pulz.
  NV1 proto počítá odebraná slova se zpožděním dvou `vclk` (posuvný registr `c1`, `c2`).
- Monitor: `hpos = -8` (místo −1). Skutečné zpoždění DAC je 3 VCLK + 15 bodů; model ho vynechává a píše to v popisu.

**Palette-DAC (`RAMDAC_STG1764`):**
- krystal 12,096 MHz; `f = 12,096 × N / (M × P)`: MCLKx2 M=11, N=91, P=1 → 100,067 MHz; bodový takt M=12, N=100, P=4 → 25,2 MHz;
  ACLK M=8, N=65, P=4 → 24,57 MHz;
- `vclk` si DAC odvozuje sám z bodového taktu (čítač `k` 0–3), ne jako samostatný zdroj hodin;
- registry: přímé 4 / 5 / 6 = index nízký / vysoký / data s autoinkrementem; index 0x300 = Saturn port A
  (bity 3:0 data dovnitř, bity 6:5 výběr ven), 0x301 = směr (1 = vstup); 0x000 = 0x44, 0x001 = 0x64.
  Že číslo přímého registru odpovídá kódu RS[3:0], je domněnka z offsetů MMIO.

**Sběrnicový spínač:** zařízení se dvěma obousměrnými stranami na řez; stavy 0 nikdo, 1 A→B, 2 B→A, 3 právě uvolněno.
Stav 3 je nutný: po uvolnění ještě jeden průchod vidí na síti vlastní starou hodnotu a spínač by se zasekl jako držák sběrnice.
Switch-level simulaci enginu (`NMOS`) nepoužívat, zpomalila by celou kartu.

### 3.2 Stav skriptu `docs/rozpracovano/rebuild_nv1.mjs`

Skript dělá chirurgii nad `nv1Card.js` (spouští se `node docs/rozpracovano/rebuild_nv1.mjs silicon-logic-studio/src/engine/devices/nv1Card.js`).
Je napsaný podle první verze návrhu a **ještě neodpovídá kapitole 3.1** v těchto bodech:

- `MT.DAC_FIFO` je 32, má být 2; chybí čítač `refreshDue` a nové pořadí požadavků;
- ROM není omezená na vertikální zatemnění;
- `nv1Video` nemá nulovací pulz 0-1-0 ani posuvný registr `c1`/`c2` (stav už je připraven);
- DAC má starý krystal 14,31818 MHz a staré poměry PLL, jednoduché registry game portu 0xE/0xF místo indexových,
  neomezený zásobník a žádné rozpoznání nulovací sekvence;
- popisy: spínač jako „TSSOP-48" místo 4× PI5C3245Q, zásuvka jako RJ-45 místo 10P10C, `hpos` −4 místo −8.

Skript se před dokončením nespouštěl. Při úpravách pozor na české uvozovky v řetězcích PowerShellu (viz kapitola 7).

### 3.3 Co po skriptu ještě chybí

1. `nv1Board.js`: nové zapojení podle 3.1, krystal `Y1 12.096 MHz`, nové součástky a jejich polohy
   (návrh: spínač (505, 150), SEGA ASIC (300, 245), header J5 (400, 24), J6 (460, 24); ve schématu spínač [1200, −290],
   SEGA [960, 620], J5 [1260, 700], pad [1500, 700], zásuvka [1260, 790]).
2. `boardLayout.js`: rozměry nových typů, RAMDAC 31,2 × 31,2 mm (tělo 28 × 28, rozteč 0,8 mm, 32 vývodů na stranu),
   jazýček PCI 79,14 mm a zářez 1,85 mm, výchozí frekvence krystalu. Po zvětšení RAMDACu posunout krystal a zkontrolovat překryvy.
3. Pořadí na záslepce shora: modulární zásuvka P1, DE-15 P2, pak tři jacky (mic, line in, line out – jen jeden zdroj).
4. `boardScene.js`: `pqfp` pro RAMDAC 28 × 28; nové typy spadnou do obecného pouzdra, pokud nedostanou vlastní model.
5. `hierarchicalSubcircuits.js`: pady v `nv1_die` a `ramdac` na skutečná jména signálů; L3 schéma PLL na 12,096 MHz a nové poměry;
   `BUS_SWITCH_32` → alias na `nmos_transistor`; `SEGA_ASIC` a `SEGA_HEADER` do `TERMINAL_TYPES`.
6. `catalog.js` + `offers.js`: krystal 12,096 MHz (nové nabídky se skutečnými URL), 4× PI5C3245Q, nvSGP, 2× header, RAMDAC 28 × 28.
7. `figures.js` (ANATOMY): mapy `ID` a `HEIGHT` pro nové typy.
8. Testy `tests/nv1_card.test.js`: `VCLK = 12.096e6 * 100 / 48` (25,2 MHz), test konfliktu sběrnice používá pin `md0` → `md_lo`,
   nové testy pro spínač (EN64), nulování zásobníku a game port přes DAC. `tests/hierarchy.test.js` hlídá, že každá součástka
   v předvolbě vede až na tranzistory a že list nemá překryvy.
9. Diagnostika (`Nv1DiagnosticModal.jsx`), README (kapitola „Co je model") a `AgentMEMORY.md`.
10. Změřit rychlost: NV1 se bude vyhodnocovat na 100 MHz místo 50, video naopak na 6,3 MHz místo 25.

## 4. Ověřená fakta, která ještě nejsou v kódu

- **Krystal:** „Z12.096M" na čtyřech různých kartách; datasheet STG1732/64 s. 1 a ovladač XFree86 (`VPLL_INPUT_FREQ 12096.0`).
- **STG1764X:** 128 vývodů PQFP, tělo 28,00 × 28,00 mm, přes vývody 31,20 mm, rozteč 0,80 mm, výška max. 4,07 mm.
- **Zásobník pixelů:** 128 bitů; `LOADEN#`; nulování sekvencí 0-1-0 na `BLANK#`; pipeline 3 VCLK + 15 bodů + 7 ns při 16/32 bpp.
- **Game port DAC:** `GP[7:0]`, 8 kanálů, každý analogový nebo digitální. Modulární zásuvka je 10P10C a slouží PC joysticku (ne MIDI).
- **Sega:** headery J5 PORT A a J6 PORT B, dva ploché kabely na zvláštní záslepku „EDGE 3D SEGA".
- **Jazýček PCI** (specifikace 2.1): 79,14 mm; 85 mm je pouzdro konektoru na desce. Střed zářezu je datum, B01 je 62,87 mm od něj.
- **Potisk desky:** DRAM U19, U20 (připájené), U23, U24 (patice); BIOS U12; nvSGP U34; spínače U25–U28; krystal Y1.
- **Konfigurace po resetu:** MD[7:0] se zachytí na hraně RST#; karta s DRAM na PCI má `xxx0_0111b`.
- **Na kartě navíc:** sériová EEPROM 93C46 (Microwire `EECS`/`EESD`/`EESCLK`, hodiny 50 T), stabilizátor 3,3 V, 2× dvojitý OZ, vstupy CD audio.
- **Pinout PQFP-208:** textový výtah datasheetu má jména pinů v pořadí 53→104, 208→157, 156→105, 1→52. Správný je jen z obrázku na s. 4.

Zdroje:
- datasheet STG2000: <https://geforcewww.vgamuseum.info/images/doc/st/stg2000_sep96.pdf>
- datasheet STG1732/64: <https://datasheet.datasheetarchive.com/originals/library/Datasheets-A1/DSAUTAZ0016425.pdf>
- XFree86 3.3.6 (`nv1driver.c`, `nv1ref.h`): <https://ftp.icm.edu.pl/pub/X11/XFree86/3.3.6/source/X336src-1.tgz>
- registry DAC: <https://envytools.readthedocs.io/en/latest/hw/display/nv1/pdac.html>
- PCI 2.1: <https://ftp.mirrorservice.org/sites/www.bitsavers.org/pdf/pciSIG/PCI_Local_Bus_Specification_2.1_199506.pdf>
- fotky karet: <https://thandor.net/object/634>, <https://www.vgamuseum.info/images/palcal/diamond/588_diamond_edge_3d_2120_top_hq.jpg>

Texty datasheetů jsem do repa nedával (nejsou naše), stačí je znovu stáhnout a vytáhnout přes `pypdf`.

## 5. Další zbytky

**Z review, neopraveno:**
- MŮJ PC: popis pořadí zapnutí v `devices/myPc.js` (desc u desky) a v `cell_pwrbtn` je opravený jen v komentáři; rozměry hlavy monitoru
  bez stojanu se ve zdrojích rozcházejí; řadič SSD (Phoenix nebo Elpis) se pozná až podle firmwaru na tom počítači.
- Hluboké úrovně: planární TSMC 28 nm sdílí mřížku hradla s FinFETy (jen přejmenováno); tloušťky ONO pro Samsung V5/V6 nejsou veřejné.
- AI PC: tloušťka P100 37 mm, štítek RDIMM, šířka DMI2 a počet vrstev NAND zůstávají neověřené.
- Karta: pořadí jacků má jeden zdroj; pinout zásuvky 10P10C a headerů J5/J6 se nenašel.

**Ceny:** nabídky v `offers.js` jsou z 10. 11. 2026, neaktualizoval jsem je.

**Z `PLAN_PROJEKTU.md` záměrně neděláno** (rozhodnutí, ne opomenutí):
- bitové chyby z přehřátí – náhodné chyby by rozbily přesný model karty; teplota v enginu není fyzikální veličina;
- RC zpoždění hran – engine je bez zpoždění, chtělo by to jiné jádro;
- WebGPU, JIT, Monaco, Tauri – stack zůstává React + Electron;
- skutečný AI copilot – potřebuje API klíč a rozhodnutí uživatele; dnešní panel vybírá předvolbu podle klíčových slov.

## 6. Jak pokračovat

1. Přečíst `AgentMEMORY.md` a tento dokument.
2. Dopsat skript podle 3.2, nebo změny z 3.1 udělat ručně; pak body 3.3 po jednom, po každém `npm test`.
3. Vizuální kontrola bez okna: `npx vite --port 5287 --strictPort` a `tools/shot.cjs` (návod v `AgentMEMORY.md`).
4. Po každé ucelené části commit a push na `main`.

## 7. Pasti z této práce

- Nástroj Bash tu startuje 30–120 s; používat PowerShell.
- PowerShell bere české uvozovky „ " jako oddělovače řetězce → chyba parseru a nespustí se nic. Texty s nimi dávat do
  jednoduchých here-stringů (`@'…'@`) nebo soubor upravit nástrojem Edit.
- Pole jedné dvojice v PowerShellu se rozbalí: psát `@(,@(a, b))`.
- Skripty přepisující soubory musí zachovat CRLF (`Toolbar.jsx`, `boardLayout.js`, `LogicCanvas.jsx` jsou CRLF).
- Test hierarchie vyžaduje, aby každá součástka v každé předvolbě galerie měla vnitřní schéma až na tranzistory.
- Tento počítač není „MŮJ PC" z projektu 3 (má disk WD SN730), takže se na něm nedá ověřit firmware SSD ani jiné díly.
