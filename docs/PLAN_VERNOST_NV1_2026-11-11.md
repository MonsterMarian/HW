# Plán na další session: karta NV1 věrně podle zdrojů

Sepsáno 11. 11. 2026 v 18:59. Větev `main`, poslední commit s kódem `2563f93`, 284/284 testů, lint čistý, build prošel,
diagnostika v aplikaci 7/7. V repu není nic rozbitého ani rozpracovaného.

## 1. Proč tenhle plán

Uživatel 11. 11. řekl: **„je jedno, jak dlouho to bude trvat, hlavní je, aby to opravdu a správně simulovalo realitu.“**
Platí to pro simulační jádro i modely součástek. Zrychlení, která mění cokoli pozorovatelného, se nedělají.

Přestavba karty podle `docs/PLAN_DOKONCENI_2026-11-11.md` (kapitola 3) je hotová. Když jsem pak poprvé přečetl oba
datasheety celé a k nim envytools, ukázalo se, že návrh v pixelové cestě stál na špatném čtení a že model používá
vlastní mapu registrů, i když skutečná je zčásti známá. Tenhle plán říká, co s tím.

## 2. Zdroje a jak se k nim dostat

| Zdroj | Odkaz |
|---|---|
| Datasheet STG2000 (září 1996, 81 stran) | <https://geforcewww.vgamuseum.info/images/doc/st/stg2000_sep96.pdf> |
| Datasheet STG1732/64 (červen 1995, 24 stran) | <https://datasheet.datasheetarchive.com/originals/library/Datasheets-A1/DSAUTAZ0016425.pdf> |
| envytools: DAC | <https://envytools.readthedocs.io/en/latest/hw/display/nv1/pdac.html> |
| envytools: zobrazení a VRAM | <https://envytools.readthedocs.io/en/latest/hw/display/nv1/pfb.html> |
| XFree86 3.3.6, ovladač `nv1driver.c`, `nv1ref.h` | <https://ftp.icm.edu.pl/pub/X11/XFree86/3.3.6/source/X336src-1.tgz> |
| Fotka karty | <https://www.vgamuseum.info/images/palcal/diamond/588_diamond_edge_3d_2120_top_hq.jpg> |

Text z PDF: stáhnout do scratchpadu a pustit `python -I` s `pypdf` (na stroji je), po stránkách do `.txt`. Extrakce
tabulek je rozházená (hodnoty a názvy parametrů jsou na různých řádcích), čísla stránek sedí.
Stránky envytools jdou stáhnout přes `Invoke-WebRequest -UseBasicParsing` a zbavit značek; obě jsou z velké části „Todo“.
**XFree86 ovladač jsem nečetl** – je to první krok příští session (kapitola 5, krok 0).

## 3. Co zdroje říkají (ověřeno čtením 11. 11.)

### 3.1 Palette-DAC STG1764 (datasheet STG1732/64)

- **s. 1:** „Deep pixel input FIFO“, FIFO „may be burst filled directly from a DRAM bus“. Tři 10bitové DAC. Jeden krystal
  12,096 MHz. Pixelový port 16 / 32 / 64 bitů.
- **s. 5:** náběžná hrana `LOADCLK` vzorkuje `P[63:0]` i `LOADEN#`; při `LOADEN# = 1` se data ignorují. `BLANK#` se vzorkuje
  na náběžné hraně `VCLK`. `SELECT#` (na kartě `DACCS#`) sestupnou hranou zachytí adresu z `AD[3:0]` a `AD[7]` (0 = zápis,
  1 = čtení). `AD[7:0]` = `MD[15:8]`.
- **s. 6:** `VCLK` = kmitočet bodů dělený 1, 2, 4, 8 nebo 16 „podle zvoleného režimu“. `MCLK` jde na `MCLKx2` čipu STG2000.
- **s. 7:** přímé registry: 0 adresa palety pro zápis, 1 data barvy, 2 maska pixelu (po resetu 0xFF), 3 adresa palety pro
  čtení, 4–7 v tomhle datasheetu „reserved“. Zmiňuje „extended register space“ (např. VBLANK Control Register).
- **s. 8:** `SELECT#` puls min. 50 ns, zotavení 30 ns; čtení: adresa do Z do 10 ns, výstup zapnut za 10 ns, data platná do 40 ns.
- **s. 9–10:** 16bitový režim: bit 15 = PixMix (jen když je PixMix zapnutý; jinak vždy obejití LUT a LUT je vypnutá).
  5 bitů barvy → 10 bitů DAC opakováním (`4321043210`). U 64bitového portu se `P[63:32]` zobrazí po `P[31:0]`.
- **s. 11:** `LOADCLK` perioda min. 20 ns, nízká 6 ns, vysoká 5 ns, předstih dat 3 ns, přesah 1 ns.
- **s. 12, FIFO:** slovo jádra má **128 bitů** (2 načtení po 64 b, 4 po 32 b, 8 po 16 b). Zápis je zpožděný: po posledním
  úplném slově je potřeba ještě **2 cykly `LOADCLK` navíc** (64bitový port; 32bitový 3, 16bitový 5), jinak se poslední slovo
  nezapíše. Čtení řídí `BLANK#` a probíhá po **32bitových slovech**: délka řádku musí být násobek 2 pixelů při 16 bpp
  a VCLK 1:1, při děleném VCLK se násobí dělicím poměrem. Hloubka FIFO v datasheetu **není**.
- **s. 12, VBLANK:** sekvence 0-1-0 na `BLANK#` na třech po sobě jdoucích náběžných hranách `VCLK` vynuluje ukazatele FIFO
  a polohu kurzoru. Předstih i přesah 2 ns.
- **s. 14–15, game port:** 8 kanálů, každý analogový (potenciometr do 150 kΩ, kondenzátor 4,7 nF na GPCAP±) nebo digitální
  (spínač na zem). „Real Mode Game Port“ mapuje STG2000 na I/O 0x201.
- **s. 16, DAC:** Vref 1,235 V, RSET 147 Ω, proud bílá–černá 16,74 / **17,62** / 18,50 mA. Do dvojitě zakončených 75 Ω
  (37,5 Ω) to je 0,628 / **0,661** / 0,694 V. Model má plný rozsah 0,7 V.
- **s. 17:** VCO 64–135 MHz, výstup VCLK max. 50 MHz, MCLK 100 MHz, ACLK 25 MHz, zavěšení PLL 500 µs.
- **s. 18, zpoždění:** 16 / 32 bpp: **3 × VCLK + 15 × bodový takt + 7 ns**; 4 / 8 bpp: 3 × VCLK + 16 × bodový takt + 7 ns.
  Měří se od náběžné hrany `VCLK`, na které byl `BLANK#` vzorkován jako 1, po příslušná data na výstupu DAC.

### 3.2 STG2000 (datasheet)

- **s. 6:** `EN64` = 1 odpojí budiče mezi dvěma 32bitovými stranami 64bitového portu STG1764. `MCLKx2` je dvojnásobek
  vnitřního taktu paměti. `EECS` (pull-down 50 kΩ), `EESD`, `EESCLK` pro EEPROM 93C46A.
- **s. 7:** `LOADCLK` řídí vzorkování `LOADEN#` a pixelů v DAC (výstup `LOADEN#` čip nemá). `VCLK` je vstup z DAC.
  `HSYNC` a `VSYNC` jdou z čipu rovnou na monitor, bez budičů.
- **s. 19:** podporované cykly: náhodné čtení (i s EDO), náhodný zápis, čtení fast page, čtení hyper page s EDO,
  stránkový zápis (late write), stránkový zápis s maskou po bitech, refresh CAS-before-RAS. Refresh každých 776 MCLK.
  **Rychlosti plnění DAC:** EDO paměť 64 b do STG1764 až 400 MB/s (hyper page, platí pro 1 MB a pro 2 i 4 MB se STG1764);
  obyčejná paměť: 1 MB 100 MB/s, prokládaně 200 MB/s (2 MB se STG1732, 4 MB se STG1764).
- **s. 22, obr. 15:** zapojení 1–4 MB se STG1764: banka 0 na `MD`, banka 1 na `SDB` za „silicon switch“, `P[31:0]` na `MD`,
  `P[63:32]` na `SDB`. Sedí s modelem.
- **s. 24, tab. 3 (čtení FPM):** tRC 6T−5, tRAS 3,5T−2, tRP 2,5T−2, tCRP 3T−10, tCSH 3T−5, tRCD 2T−5, tRSH 1,5T−2, tCP T−5,
  tCAS T−2, tRAH T−5, tCAH T−5, tCAC T, tAA 2T−5, tRAC 3T−2, tPC 2T−2, tOEA T−7, tOEZ 7 ns (T = perioda MCLK).
- **s. 25–27, tab. 4 (hyper page do STG1764):** tHPC T−2, tHCAS 0,5T−2, tCP 0,5T−2, tRSH T−2, tAA T−2, tACP 1,5T−5,
  tDHC 2 ns; `LOADCLK` vysoká i nízká min. 6 ns, perioda min. 18 ns, náběžná hrana 0 ns od aktivního CAS#.
- **s. 28–29, tab. 5 a 6:** pozdní zápis: tWP 0,5T, tCWL 0,5T+2, tRWL 0,5T+2, tDS 0,5T−2, tDH 0,5T+2. Refresh: tRAS 3,5T−2,
  tRP 2,5T−2, tRSH 4T−5, tCSR T−5, tCHR T−5.
- **s. 30–31, ROM:** adresa `MD[30:16]`, data `MD[7:0]`, `MD[31]` = R/W#, `ROMCS#` 13T−5, zotavení T−5, předstih adresy T−5.
- **s. 32, EEPROM:** 128 × 8 bitů, ST93C46A, Microwire; předprogramovaná se prodávala jako **NVCAATR**. Čte se po zapnutí
  (obr. 24). Perioda `EESCLK` 50 T, vysoká i nízká 24 T, `EECS` → hodiny 15 T. Před zápisem čip EEPROM odemkne, po něm
  pošle EWDS.
- **s. 33–34, DAC:** `BLANK#` předstih i přesah 4 ns. Registry: tDP 3T−5, `DACCS#` 3T−5, předstih adresy 1,5T−5,
  data zápisu 0,5T+10 před koncem, čtení platné do 2T−10, výstup do Z do T−5.
- **s. 35:** druhá paměť 32 KB pro čtení i zápis přes `ALTCS#` (v modelu není).

### 3.3 envytools (částečně zdokumentováno, hodně „Todo“)

- **PFB, MMIO 0x600000:** `VRAM_CONFIG` +0x0 (bity 0–1: 0 = 1 MB, 1 = 2 MB, 2 = 4 MB), `POWER_SYNC` +0xC0,
  `CONFIG` +0x200 (bit 0 VBLANK jen pro čtení; 4–6 šířka plátna: 1 = 640; 8–9 BPP: 0 = 4, 1 = 8, 2 = 16, 3 = 32;
  12 DOUBLE_BUFFER; 24–26 `PCLK_VCLK_RATIO`, kódování neznámé), `START` +0x400, `HOR_FRONT_PORCH` +0x500,
  `HOR_SYNC_WIDTH` +0x510, `HOR_BACK_PORCH` +0x520, `HOR_DISP_WIDTH` +0x530, `VER_*` +0x540 až +0x570. Jednotky nepopsané.
- **PDAC, MMIO 0x609000:** +0x0 `PAL_WRITE`, +0x4 `PAL_DATA`, +0x8 `PAL_MASK`, +0xC `PAL_READ`, +0x10 `INDEX_LOW`,
  +0x14 `INDEX_HIGH`, +0x18 `DATA` (po každém přístupu se index zvýší o 1), +0x1C `GAME_PORT`.
- **Vnitřní registry DAC (16bitový index):** 0x0 výrobce 0x44, 0x1 typ (0x32 = STG1732, 0x64 = STG1764), 0x2 revize (0xB2),
  0x4 a 0x5 CONFIG, 0x6 DDCIN, 0x8–0xB stav palety, 0xC–0xE vypínání bloků, **0x10 + 4i PLL M / N / O / P**
  (i = 0 paměť, 1 audio, 2 video), **0x300 + 2i data a 0x301 + 2i režim Saturn portu i** (bity 0–3 DATA, 4 SENSE,
  5 SELECT[1], 6 SELECT[0]; režim 0 = výstup, 1 = vstup).
- Saturn porty jsou „simple GPIO“: čte je **ovladač**, ne čip.

### 3.4 Fotka karty (zvětšené výřezy)

U29 má potisk **NVCAA** + logo ST = předprogramovaná EEPROM. U18 = **LM2941CT** (TO-220 naležato). Kodek je **U6**.
Operační zesilovače: 3× **LF353** (SOIC-8), 1× **LF347** (SOIC-14). CD audio: **J4** (bílý konektor, potisk MITSUMI),
**J12** (lišta, potisk PANASONIC). U32 je neosazená pozice vpravo od BIOSu. DRAM jsou Hyundai HY514260B (JC-70 připájené,
JC-60 v paticích). Že jsou FPM a ne EDO, soudím jen ze značení – ověřit datasheetem Hyundai.

## 4. Co dělá model dnes a kde se liší

| Oblast | Model (`silicon-logic-studio/src/engine/devices/nv1Card.js`) | Skutečnost |
|---|---|---|
| Mapa registrů | vlastní `REG.*` na BAR0 + 0x800000 (CRTC, zvuk, game port), framebuffer na BAR0 + 0 | PFB 0x600000, PDAC 0x609000; poloha framebufferu v BAR0 neověřená |
| FIFO v DAC | kapacita 8 pixelů (jedno 128bitové slovo), zápis hned (`RAMDAC_STG1764.eval`, `MT.DAC_FIFO = 2`) | slova 128 b, zápis zpožděný o 2 `LOADCLK`, FIFO hluboké |
| Plnění FIFO | po jednom slově, kdykoli je místo (`nv1Mem`, větev `scan`) | dávky z paměti |
| Čtení FIFO | 4 pixely na VCLK, VCLK pevně bodový takt / 4 | po 32bitových slovech, dělič VCLK podle režimu |
| Zpoždění DAC | 2 VCLK = 8 bodů, monitor `hpos = -8` | 3 VCLK + 15 bodů + 7 ns; sync jde z NV1 rovnou na konektor |
| Výstup DAC | plný rozsah 0,7 V | typ. 0,661 V do 37,5 Ω |
| Saturn pad | skenuje čip sám (`s.sat`, `REG.GAMEPORT`) | GPIO v DAC, čte ovladač; dva porty, linka SENSE |
| EEPROM | není | ST93C46A, čte se po zapnutí |
| Sběrnicový spínač | pozná směr podle nebuzené strany (`BUS_SWITCH_32`) | průchozí tranzistory, žádný směr |
| Arbitráž sběrnice | pixely → refresh → DAC → ROM → čtení → zápis, ROM jen mimo obraz | zdroje neříkají |

## 5. Postup

Každý krok: nejdřív test, který na dnešním kódu selže, pak změna, pak celá sada (`npm test`), lint, build, commit a push.
Testy měří na konektorech a vývodech (obraz na monitoru, časy hran), ne na vnitřním stavu.

**Krok 0 – dočíst zdroje, než se sáhne do kódu.**
Z `nv1driver.c` a `nv1ref.h` zjistit: jak ovladač programuje `HOR_*` / `VER_*` (jednotky, posun kvůli zpoždění DAC),
hodnoty `PCLK_VCLK_RATIO` pro 16 bpp, registry CONFIG v DAC (šířka portu, BPP, dělič VCLK), programování PLL (M / N / O / P),
kde je v BAR0 framebuffer. Projít zbytek envytools k NV1 (`hw/mmio`, PRM, případně zvuk). Výsledek zapsat sem do kapitoly 3
a teprve podle něj upřesnit kroky 1–4. Co se nenajde, zůstane modelem a musí to být napsané u dílu i v README.

**Krok 1 – skutečná mapa PFB a PDAC.**
NV1 dekóduje PFB a PDAC na skutečných offsetech; přístup do PDAC se přeposílá jako cyklus registru DAC po `MD[15:8]`
(PCI čeká na `TRDY#`, dokud cyklus neskončí). Ovladač hosta (`hostDriver`) programuje režim přes `HOR_*`, `VER_*`,
`CONFIG`, `START` a PLL přes vnitřní registry DAC. Vlastní `REG.HTOTAL` až `REG.PITCH` zrušit.
Hotovo, když: test enumerace čte ID DAC (0x44, 0x64) přes PDAC; obraz 32×16 i 640×8 sedí; PLL se nastavuje zápisem
do DAC, ne konstantou v modelu.

**Krok 2 – Saturn pad čte ovladač.**
Zrušit `s.sat`, automatické skenování v `nv1Mem` a `REG.GAMEPORT`. Ovladač nastaví režim portu (0x301), přepíná SELECT
a čte DATA přes PDAC. Přidat port B (0x302, 0x303) a linku SENSE, pokud krok 0 řekne, kam vedou.
Hotovo, když: test stisku tlačítka projde přes skutečné registry a čip sám na `DACCS#` bez pokynu hosta nesáhne.

**Krok 3 – FIFO podle datasheetu.**
Slova 128 b, zápis zpožděný o 2 `LOADCLK`, čtení po 32bitových slovech pod řízením `BLANK#`, nulování 0-1-0.
NV1 plní dávkami ve stránkovém režimu. Hloubku FIFO zdroje neuvádějí: zvolit hodnotu, pojmenovat ji jako parametr modelu
a napsat to u dílu. Hotovo, když: test ukáže, že poslední slovo snímku bez dvou cyklů navíc na výstup nedojde, a obraz sedí.

**Krok 4 – skutečné zpoždění DAC.**
3 VCLK + 15 bodů (+ 7 ns, pokud půjde vyjádřit; jinak napsat, že chybí). Sync srovnat tak, jak to dělá ovladač nebo čip
(z kroku 0). Monitor pak nemá mít žádnou opravu (`hpos = 0`), pokud časování na konektoru vyjde podle VESA.
Zvážit plný rozsah 0,661 V místo 0,7 V. Testovací režim `TINY` možná bude potřebovat delší přední zatemnění.

**Krok 5 – EEPROM.**
Součástka ST93C46A (U29, SOIC-8) na `EECS` / `EESD` / `EESCLK`, čtení po zapnutí s časováním z tab. 8.
Obsah NVCAATR není zveřejněný: model musí říct, že obsah je vymyšlený, nebo ho nechat prázdný (0xFF).

**Krok 6 – sběrnicový spínač jako skutečný spínač.**
V enginu umožnit zařízení deklarovat podmíněné spojení dvou sítí (jako NMOS, ale řízené stavem zařízení) a přepsat
`BUS_SWITCH_32`. Dnes spínač nefunguje, když je v obvodu s kartou jakýkoli tranzistor (engine pak nebuzeným sítím
drží náboj a nikdy nejsou `Z`). Pozor: spínačové řešení sítí přepočítává všechny sítě, bude to pomalejší – to nevadí.

**Krok 7 – díly, které jsou na fotce a v modelu chybí.**
U18 LM2941CT, 3× LF353, LF347, J4, J12 (a U29 z kroku 5): umístit podle fotky (vzorec pro přepočet je v `AgentMEMORY.md`),
pouzdra a potisk podle skutečnosti. Zapojení není známé – bez zdroje je nepropojovat a u dílu to napsat.

## 6. Co zdroje neříkají (zůstane modelem, pokud krok 0 nepomůže)

Hloubka FIFO. Rozhodování řadiče sběrnice (kdy plní FIFO, kdy pustí zápis, kdy čte ROM). Kódování `PCLK_VCLK_RATIO`.
Jednotky registrů `HOR_*`. Jak se srovná sync se zpožděním DAC. Vnitřek čipu nvSGP a jeho spojení s porty GP.
Obsah EEPROM. Zapojení operačních zesilovačů a stabilizátoru. Pinout zásuvky 10P10C a headerů J5 / J6.
Pořadí jacků na záslepce. Označení čipů NV1 a DAC na desce (v modelu U1, U2 bez zdroje).

## 7. Stav a pasti

- Spuštění, testy a snímky bez okna: `AgentMEMORY.md`, sekce „Stav a jak spustit“. Uživatel nechce, aby se mu aplikace otevírala.
- Simulace 640×480 trvá 40–60 s na snímek. Testy proto používají malé režimy; skutečnou šířku řádku hlídá test „640 pixels per line“.
- Přední zatemnění v testovacím režimu musí být delší než zpoždění DAC, jinak `HSYNC` usekne konec řádku.
- PowerShell: český text jen do `@'…'@`; pole jedné dvojice psát `@(,@(a, b))`; `$ErrorActionPreference = 'Stop'`
  udělá z varování `git push` a `npm run build` chybu (příkaz přitom proběhl – ověřit `git status -sb`).
- Na stroji běží cizí procesy `node` (vite projektu REA_webs, dva zaseknuté `shot.cjs` z 10. 11.). Testy pak místo 20 s
  trvají i minuty. Nezabíjet bez domluvy.
- Starší plán `docs/PLAN_DOKONCENI_2026-11-11.md`: kapitola 3 je hotová, kapitola 3.1 obsahuje omyl o FIFO („128 bitů
  celkem“) – řídit se tímhle dokumentem.
