# SILICON LOGIC STUDIO

Desktopový simulátor hardwaru (React + Vite + three.js, Electron). Hlavní obvod je skutečná grafická karta
**Diamond Edge 3D 2120** (rozšířená na 2 MB) s čipem **NVIDIA NV1 / SGS-Thomson STG2000X** (1995). Kartu jde proklikat od desky
až k atomům křemíku, ve 2D (schéma, plošný spoj) i ve 3D.

## Jak to simuluje
- **Dráty jsou měď.** Spojené piny tvoří jednu vodivou síť. Piny můžou být obousměrné. Na síti platí tri-state,
  dva budiče s různou hodnotou dají zkrat (`X`), nebuzená síť plave (`Z`) nebo ji drží pull-up.
- **Tranzistory jsou spínače.** NMOS/PMOS spojují sítě, VDD/GND je budí, izolovaný uzel drží náboj
  (buňka DRAM opravdu drží bit).
- **Víc hodin v simulovaném čase.** PCI 33 MHz z počítače; ze tří PLL v Palette-DAC bodový takt 25,2 MHz
  (VCLK = čtvrtina), MCLKx2 100,07 MHz pro paměť a ACLK 24,57 MHz (takt kodeku, z něj 48 kHz).
  Karta má jediný krystal 12,096 MHz, kodek vlastní nemá.

## Karta (úroveň 1)
| Ref | Součástka | Pouzdro |
|---|---|---|
| U1 | NVIDIA NV1 / SGS-Thomson STG2000X | PQFP-208 |
| U2 | SGS-Thomson STG1764X-13 Palette-DAC 135 MHz + 3× PLL | PQFP-128 |
| U19, U20 | 2× 256K×16 FPM DRAM, připájené: banka 0 na sběrnici MD (1 MB, tak se 2120 prodávala) | SOJ-40 |
| U23, U24 | 2× 256K×16 FPM DRAM v paticích: banka 1 na sběrnici SDB (rozšíření na 2 MB) | SOJ-40 |
| U25–U28 | 4× Pericom PI5C3245Q, sběrnicový spínač mezi MD a SDB (řídí ho `EN64`) | QSOP-20 |
| U34 | NVIDIA nvSGP, rozhraní pro ovladače Sega Saturn | PLCC-44 |
| U6 | Analog Devices AD1845 kodek | PLCC-68 |
| U12 | video BIOS EPROM 32 KB | DIP-28 |
| Y1 | jediný krystal 12,096 MHz, reference pro 3 PLL | HC-49/U |
| J5, J6 | headery 2×5 PORT A / PORT B pro ovladače Saturn | lišta 2,54 mm |
| J1 | PCI 2.0, 32 bit, 5 V (klíč na kontaktech 50/51, jazýček 79,14 mm) | hrana karty |
| P1, P2 + 3 jacky | modulární zásuvka 10P10C (PC joystick), VGA DE-15, mic, line in, line out | bracket |

Označení U1 a U2 nemá zdroj (na fotografii není čitelné). Rozmístění součástek je odměřené z fotografie
karty (vgamuseum.info), s přesností asi 1,5 mm.

Mimo kartu: hostitelské PC, VGA monitor, reproduktory a Sega Saturn pad.

Co se děje po spuštění (RUN, rychlost MAX):
1. Počítač posílá skutečné PCI transakce: projde obě funkce čipu (funkce 0 VGA `104A:0008`, funkce 1 NV `104A:0009`,
   funkce 2–7 neodpoví), změří a nastaví 32MB BAR funkce NV, přečte BIOS ROM
   (`55 AA`), naprogramuje CRTC na 640×480 @ 60 Hz a zapíše obraz do framebufferu.
2. NV1 zapisuje do DRAM po 32bitové sběrnici MD cykly RAS#/CAS# ve fast page mode (pozdní zápis, časy podle
   tabulky 3 datasheetu); sudá slova jdou do banky 0, lichá přes sběrnicový spínač do banky 1. Každých 776 taktů
   MCLK (15,52 µs) žádá o refresh. Po stejné sběrnici čte i BIOS ROM (`ROMCS#`) a registry Palette-DAC (`DACCS#`).
3. Pro obraz NV1 rozpojí spínač (`EN64`), obě banky najednou vystaví 64 bitů (4 pixely RGB555) a hrana `LOADCLK`
   je uloží rovnou do Palette-DAC. Jeho zásobník má jen 128 bitů, proto má načítání pixelů přednost před vším
   ostatním. DAC z pixelů dělá analogové napětí 0–0,7 V a monitor skládá obraz jen z napětí a časování synchronizace.
4. 32hlasá syntéza v NV1 naprogramuje AD1845 přes indexové registry, čte jeho stav a posílá vzorky strobe `AUW#`
   (režim PIO, bez DRQ/DACK jako na skutečné kartě); na line-out je analogový signál.
5. Saturn pad se čte přes port GP Palette-DAC (indexový registr 0x300), čip nvSGP a header J5: výběr TH/TR ven,
   čtyři datové linky dovnitř.

Simulace je přesná na takty, a proto pomalá: celý snímek 640×480 trvá v reálném čase zhruba minutu.

## Projekty a ECONOMIC view
Po spuštění jsou nahoře v liště dva projekty a otevře se první:
1. **NV1 KARTA**: tahle karta, ve všech pohledech (SCHEMATIC, PCB, DIE 3D, ECONOMIC).
2. **AI PC 2× P100**: sestava z videa Junk GPU Lab (podle `PCYoutubeborce.md`), v pohledech SCHEMATIC (napájení),
   ECONOMIC a ANATOMY. Obsahuje Dell T5810, Xeon E5-1650 v3, 4× 8 GB DDR4 ECC RDIMM, 2× Tesla P100,
   2× adaptér chlazení + ventilátor 9733, Quadro K620, Samsung 870 EVO 1 TB SATA, druhý zdroj s Add2PSU, EPS redukce,
   regulátor ventilátorů TD404 a pastu.

**ECONOMIC** ukazuje díly ve 3D tak, jak přijdou z obchodu, ve skutečných rozměrech v mm (u každého dílu je uvedeno,
zda je rozměr ověřený ze zdroje, nebo odhad). Na stole je pravítko 30 cm a mřížka 10 cm. Dovnitř dílů se nevstupuje.
Klik na díl nebo řádek kusovníku ukáže skutečné nabídky z e-shopů: přímé odkazy na produkt nebo inzerát, cenu
v původní měně i v Kč (kurz ČNB), stav (nové / repas / použité) a zda byla cena přečtená přímo ze stránky, nebo
jen z výpisu vyhledávače. Ceny jsou dohledané 10. 11. 2026 (spínač, lišty a krystal karty 11. 11.) v `src/engine/economic/offers.js` a časem zastarají.
Kusovníky jsou v `src/engine/economic/catalog.js`, modely v `src/views/economic/models.js`.

**ANATOMY (test)** má dva režimy: **3D MODEL** (přesné modely dílů z ECONOMIC natočené do skutečné polohy
ve skříni, otáčení myší) a **VÝKRES**, který kreslí celou sestavu jako jeden izometrický výkres (kit
[Anatomy](https://github.com/wheresryan22/anatomy), MIT, převzatý do `src/vendor/anatomy`). Malé díly jsou vidět ve velkém
celku přes očíslované popisky propojené s kusovníkem vpravo, posuvník ROZLOŽIT sestavu rozloží. U AI PC ukazuje
skříň Dell v řezu a červeně limit 312 mm (plná délka PCIe), za který P100 s krytem a ventilátorem 9733 přesahuje;
u karty NV1 jsou čipy na skutečných pozicích z PCB pohledu.

## Schéma napájení AI PC (SCHEMATIC u projektu 2)
Simulovaný obvod jako u karty NV1: sítě nesou napětí (12 V, zem). Zapojení jako ve videu: kartu G1 napájí zdroj
Dellu přes 2× PCIe 6 pin a redukci NVIDIA 030-0571-000, druhý zdroj jen kartu G2 (2× PCIe 8 pin). Vypínač Dellu →
SATA 12 V → Add2PSU (relé) → PS_ON# druhého zdroje; ventilátory 9733 napájí SATA regulátor TD404 z druhého zdroje. PCIe kabel zapojený napřímo do EPS zdířky karty dá zkrat (`X`) přes
zem karty a slotu – stejně jako ve skutečnosti. Dvojklikem dovnitř (úroveň 2):
- redukce 030-0571-000 pin po pinu podle výkresu NVIDIA PB-08248,
- Add2PSU (relé spíná PS_ON# na COM, patent US8878390),
- regulátor TD404, obecná topologie ATX zdroje, bloky desky Tesla P100 a platforma Dell T5810 (CPU, C612, sloty).
Co není veřejně doložené, je ve schématu označené „neověřeno“. Pinouty: Intel ATX 3.0 DG, PCI Express CEM, Intel
4-Wire PWM Fan spec, SATA.

Do hloubky (dvojklik dál):
- Dell → Xeon E5-1650 v3 (6 jader, ring, IMC, PCIe porty) → jádro Haswell (front-end, ROB 192, porty P0–P7) →
  příklad 1 bitu sčítačky ALU → hradla → CMOS → tranzistor → atomy.
- Dell → RDIMM 8 GB (18× DDR4, RCD, SPD) → čip DDR4 4 Gb x4 (bank groups, dekodéry, sense amp) → simulované buňky 1T1C.
- Dell → slot 1 → Quadro K620 (GM107, DDR3, výstupy); Dell → SATA SSD Samsung 870 EVO (řadič MKX, LPDDR4, V-NAND).
- P100 → GP100 (6 GPC, L2 4 MB, 8× řadič 512 bit) → SM (procesní bloky, registry, FP32/FP64) → příklad sčítačky
  a registru → hradla → … atomy.
- Zdroj → primár (APFC, full-bridge LLC), sekundár (SR, DC-DC, supervizor), +5VSB se skutečnými součástkami.
Sloty T5810 (manuál Dell): shora 1 (x8, half-length), 2 a 4 x16 Gen3, 3, 5, 6 PCI. P100 ve 2 a 4 zakryjí 3 a 5,
takže zbývá jen slot 1 – má ho K620. Proto je disk 2,5" SATA SSD v šachtě Dellu místo NVMe s redukcí (ve videu NVMe není).

## Proklikávání (dvojklik)
L1 deska → L2 bloky uvnitř čipu → L3 RTL (CRTC, kvadratické dopředné diference, fázový akumulátor, PCI dekodér…)
→ L4 registry a sčítačky → L5 hradla → L6 CMOS z tranzistorů → L7 průřez tranzistorem 0,5 µm
(LOCOS, oxid ~10 nm, 3× Al) → L8 mřížka Si a SiO₂.

Úrovně L3–L6 se opravdu simulují. L2 (bloky), L7 (vrstvy) a L8 (atomy) jsou popisné.

## Co je model, ne kopie skutečného čipu
Mapa registrů NV1 je vlastní a 3D engine NV1 se nesimuluje (obraz kreslí CPU). Odhadem zůstává floorplan čipu
a počet tranzistorů (datasheet ho neuvádí).

Ověřeno datasheetem SGS-Thomson STG2000 (září 1996): 0,5 µm, 3 vrstvy kovu, 3,3 V, PQFP-208, PCI 2.0, 4× 256K×16
s dvojitým CAS, FPM, refresh CAS-before-RAS každých 776 taktů MCLK, ROM 32K×8, takt kodeku z Palette-DAC,
32bitová sběrnice `MD[31:0]` se dvěma prokládanými bankami (`MA02`/`MA13`, `CAS02#`/`CAS13#`, `WE03#`/`WE12#`,
`OE0#`/`OE1#`), pixely do DAC přímo z paměti, ROM a registry DAC na téže sběrnici. Datasheetem STG1732/64 a ovladačem
XFree86: krystal 12,096 MHz, vzorec PLL, pouzdro 28 × 28 mm, zásobník pixelů 128 bitů a jeho nulování sekvencí
0-1-0 na `BLANK#`.

Kde se model od skutečné karty **vědomě liší** (v aplikaci je to u dílů napsané):
- **Mapa registrů:** model má vlastní registry CRTC, zvuku a game portu. Skutečný čip má registry zobrazení v bloku
  PFB (MMIO 0x600000: přední zatemnění, šířka syncu, zadní zatemnění, šířka obrazu, START, CONFIG) a registry DAC
  zrcadlené v bloku PDAC (0x609000) – envytools je zná jen zčásti (jednotky a řada bitů nejsou popsané).
- **FIFO v Palette-DAC:** skutečné má slova po 128 bitech, zápis zpožděný o 2 LOADCLK a hloubku datasheet neuvádí
  („deep pixel input FIFO“, plní se dávkami z paměti). Model drží jediné takové slovo (dvě načtení po 64 bitech),
  zapisuje hned a načítá po jednom slově, kdykoli je místo. Pořadí obsluhy sběrnice (pixely → refresh → registry DAC →
  ROM → čtení → zápis) a pravidlo, že se ROM čte jen mimo obraz, jsou návrh modelu; datasheet rozhodování nepopisuje.
- **Zpoždění Palette-DAC:** model má 2 VCLK (8 bodů), skutečný DAC 3 VCLK + 15 bodů + 7 ns (16 bpp). VCLK je v modelu
  pevně čtvrtina bodového taktu; skutečný dělič (1–16) se volí podle režimu. Paleta se nesimuluje (jen RGB555).
- **Registry DAC:** že číslo přímého registru (4/5/6) odpovídá kódu na `MD[11:8]`, je domněnka z offsetů MMIO.
- **Saturn pad:** na skutečné kartě jsou porty obyčejné GPIO v DAC (registry 0x300–0x303) a čte je ovladač;
  v modelu je skenuje sám čip NV1 a výsledek dává do vlastního registru. Port B a linka SENSE se nesimulují;
  že SELECT[0] = TH a SELECT[1] = TR, je domněnka.
- **Paměti:** model počítá s obyčejnými FPM DRAM (jako na fotografii karty); s EDO paměťmi umí čip plnit DAC
  dvakrát rychleji (hyper page mode, 400 MB/s), to model nemá.
- **Sběrnicový spínač:** čtyři čipy PI5C3245Q jsou v simulaci jedna součástka bez zpoždění a odporu.
- **nvSGP:** vnitřek čipu není zveřejněný, model ho bere jako průchozí budič. Pad je v modelu připojený rovnou
  na header J5; na kartě vede plochý kabel na zvláštní záslepku „EDGE 3D SEGA“. Modulární zásuvka P1 (PC joystick)
  není zapojená, její pinout se nenašel.
- **Záslepka:** pořadí jacků (mic, line in, line out) má jediný zdroj; jacky jsou v modelu o 2–3 mm výš, protože
  roh desky u záslepky sahá níž než obrys modelu.
- **Konfigurace po resetu** (zachycení `MD[7:0]` na hraně `RST#`) se nesimuluje.
- Na kartě jsou navíc sériová EEPROM (U29, ST93C46A předprogramovaná jako NVCAATR), stabilizátor LM2941CT (U18),
  operační zesilovače 3× LF353 a LF347 a vstupy CD audio J4 a J12. Jejich zapojení neznám, proto v modelu nejsou.

## Bloky z PLAN_PROJEKTU.md
V paletě **GPU**: násobička 8×8, barrel shifter, FPU half-precision (IEEE 754 binary16), MMIO dekodér
(0xF000–0xFFFF), řadič DMA (kopíruje blok RAM → VRAM, po dokončení IRQ) a řadič přerušení. Virtuální monitor má
rozlišení 64×64, 160×120 nebo 320×240, režimy 1 bit / 8bit paleta / RGB565 a výstupy H-Sync a V-Sync.
Klik na sondu přepíná DEC / HEX / BIN / ASCII, `Tab` přepíná SCHEMATIC ↔ DIE 3D, v liště je půlkrok a krok o celý takt.
Vybraná RAM nebo ROM ukáže vpravo nahoře živý šestnáctkový výpis 256 bajtů; klik na bajt ho přepíše i za běhu.
Logický analyzátor (WAVE) má dva měřicí kurzory: klik do průběhu položí A, další klik B, nahoře je simulovaný čas obou
a jejich rozdíl; šipky HRANA posunou kurzor na nejbližší hranu kanálu, do kterého se kliklo.
Stack zůstává React + Electron + JS engine; z plánu chybí RC zpoždění, difuze tepla, JIT a skutečný AI copilot.

## Spuštění
```bash
cd silicon-logic-studio
npm install
npm test          # testy jádra, karty, hierarchie a routeru
npm run build
npm run desktop   # Electron okno
```

## Deník práce
Podrobný záznam práce z 10. 11. 2026 (zadání, postup, zdroje, chyby, otevřené body): [`docs/PRACOVNI_DENIK_2026-11-10.md`](docs/PRACOVNI_DENIK_2026-11-10.md).
