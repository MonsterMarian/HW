# SILICON LOGIC STUDIO

Desktopový simulátor hardwaru (React + Vite + three.js, Electron). Hlavní obvod je skutečná grafická karta
**Diamond Edge 3D 2120** (rozšířená na 2 MB) s čipem **NVIDIA NV1 / SGS-Thomson STG2000X** (1995). Kartu jde proklikat od desky
až k atomům křemíku, ve 2D (schéma, plošný spoj) i ve 3D.

## Jak to simuluje
- **Dráty jsou měď.** Spojené piny tvoří jednu vodivou síť. Piny můžou být obousměrné. Na síti platí tri-state,
  dva budiče s různou hodnotou dají zkrat (`X`), nebuzená síť plave (`Z`) nebo ji drží pull-up.
- **Tranzistory jsou spínače.** NMOS/PMOS spojují sítě, VDD/GND je budí, izolovaný uzel drží náboj
  (buňka DRAM opravdu drží bit).
- **Víc hodin v simulovaném čase.** PCI 33 MHz z počítače; VCLK 25,17 MHz, MCLK 50,1 MHz a ACLK 24,576 MHz
  (takt kodeku, z něj 48 kHz) ze tří PLL v RAMDACu. Karta má jediný krystal, kodek vlastní nemá.

## Karta (úroveň 1)
| Ref | Součástka | Pouzdro |
|---|---|---|
| U1 | NVIDIA NV1 / SGS-Thomson STG2000X | PQFP-208 |
| U2 | SGS-Thomson STG1764X-13 Palette-DAC 135 MHz + 3× PLL | PQFP-128 |
| U3–U6 | 4× 256K×16 FPM DRAM 50 ns (2 MB; 2120 se prodávala s 1 MB, další 2 čipy jdou do patic) | SOJ-40 |
| U7 | Analog Devices AD1845 kodek | PLCC-68 |
| U8 | video BIOS EPROM 32 KB | DIP-28 |
| Y1 | jediný krystal, reference pro 3 PLL (v modelu 14,31818 MHz) | HC-49/U |
| J1 | PCI 2.0, 32 bit, 5 V (klíč na kontaktech 50/51) | hrana karty |
| J2–J6 | VGA DE-15, modulární zásuvka game/MIDI portu, line in, line out, mic | bracket |

Mimo kartu: hostitelské PC, VGA monitor, reproduktory a Sega Saturn pad.

Co se děje po spuštění (RUN, rychlost MAX):
1. Počítač posílá skutečné PCI transakce: projde obě funkce čipu (funkce 0 VGA `104A:0008`, funkce 1 NV `104A:0009`,
   funkce 2–7 neodpoví), změří a nastaví 32MB BAR funkce NV, přečte BIOS ROM
   (`55 AA`), naprogramuje CRTC na 640×480 @ 60 Hz a zapíše obraz do framebufferu.
2. NV1 zapisuje do DRAM cykly RAS#/CAS# ve fast page mode a každých 776 taktů MCLK (15,52 µs) dělá refresh.
3. NV1 čte obraz zpátky do scan-out FIFO a posílá pixely RGB555 do RAMDACu. RAMDAC z nich dělá analogové
   napětí 0–0,7 V a monitor skládá obraz jen z napětí a časování synchronizace.
4. 32hlasá syntéza v NV1 posílá vzorky do AD1845 a na line-out je analogový signál.
5. Saturn pad se čte přes výběr TH/TR.

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
jen z výpisu vyhledávače. Ceny jsou dohledané 10. 11. 2026 v `src/engine/economic/offers.js` a časem zastarají.
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
Mapa registrů NV1 je vlastní a 3D engine NV1 se nesimuluje (obraz kreslí CPU). Odhadem zůstává frekvence krystalu
(na fotografii karty čteme 12,096 MHz), dělicí poměry PLL, pouzdro RAMDACu (na fotografii je čtvercové, asi 28 × 28 mm),
floorplan čipu a počet tranzistorů (datasheet ho neuvádí).

Ověřeno datasheetem SGS-Thomson STG2000 (září 1996): 0,5 µm, 3 vrstvy kovu, 3,3 V, PQFP-208, PCI 2.0, 4× 256K×16
s dvojitým CAS, FPM, refresh CAS-before-RAS každých 776 taktů MCLK, ROM 32K×8, takt kodeku z RAMDACu.

Kde se model od datasheetu **vědomě liší** (zatím nepředěláno, v aplikaci je to u dílů napsané):
- **Paměť:** model má jednu 64bitovou sběrnici. Čip má 32bitovou `MD[31:0]`, dvě adresní sběrnice `MA02`/`MA13`
  a dvě prokládané banky po 1 MB; 64 bitů má až pixelový port Palette-DAC.
- **Pixely:** model je posílá po `P[14:0]`. Čip je do Palette-DAC nahrává přímo z `MD` (signály `LOADCLK`, `BLANK#`).
- **BIOS ROM:** model má vlastní piny. Čip čte ROM přes `MD[7:0]` (adresa na `MD[30:16]`, výběr `ROMCS#`).

- **Kodek:** model používá DRQ/DACK#. Karta je nepoužívá, má jen strobe `AUR#`/`AUW#` a 2 bity adresy.
- **Game port:** model má jednu cestu k Saturn padu. Na kartě jsou dva headery 2×5 (J5/J6) na zvláštní Sega bracket
  přes čip SEGA rozhraní za Palette-DAC; modulární zásuvka na bracketu je PC joystick/MIDI port.
- **Časování DRAM:** model čte za 2 takty od RAS#, čip za 3 (tRAC = 3T − 2 ns).
- Na kartě jsou navíc sériová EEPROM 93C46, stabilizátor 3,3 V, operační zesilovače a vstupy CD audio.

## Bloky z PLAN_PROJEKTU.md
V paletě **GPU**: násobička 8×8, barrel shifter, FPU half-precision (IEEE 754 binary16), MMIO dekodér
(0xF000–0xFFFF), řadič DMA (kopíruje blok RAM → VRAM, po dokončení IRQ) a řadič přerušení. Virtuální monitor má
rozlišení 64×64, 160×120 nebo 320×240, režimy 1 bit / 8bit paleta / RGB565 a výstupy H-Sync a V-Sync.
Klik na sondu přepíná DEC / HEX / BIN / ASCII, `Tab` přepíná SCHEMATIC ↔ DIE 3D, v liště je půlkrok a krok o celý takt.
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
