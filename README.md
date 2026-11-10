# SILICON LOGIC STUDIO

Desktopový simulátor hardwaru (React + Vite + three.js, Electron). Hlavní obvod je skutečná grafická karta
**Diamond Edge 3D 2120** s čipem **NVIDIA NV1 / SGS-Thomson STG2000X** (1995). Kartu jde proklikat od desky
až k atomům křemíku, ve 2D (schéma, plošný spoj) i ve 3D.

## Jak to simuluje
- **Dráty jsou měď.** Spojené piny tvoří jednu vodivou síť. Piny můžou být obousměrné. Na síti platí tri-state,
  dva budiče s různou hodnotou dají zkrat (`X`), nebuzená síť plave (`Z`) nebo ji drží pull-up.
- **Tranzistory jsou spínače.** NMOS/PMOS spojují sítě, VDD/GND je budí, izolovaný uzel drží náboj
  (buňka DRAM opravdu drží bit).
- **Víc hodin v simulovaném čase.** PCI 33 MHz z počítače, VCLK 25,17 MHz a MCLK 50,1 MHz z PLL v RAMDACu
  (krystal 14,31818 MHz), 48 kHz z kodeku (krystal 24,576 MHz).

## Karta (úroveň 1)
| Ref | Součástka | Pouzdro |
|---|---|---|
| U1 | NVIDIA NV1 / SGS-Thomson STG2000X | PQFP-208 |
| U2 | SGS-Thomson STG1764X RAMDAC + PLL | PQFP-128 |
| U3–U6 | 4× 256K×16 FPM DRAM 50 ns (2 MB, 64bitová sběrnice) | SOJ-40 |
| U7 | Analog Devices AD1845 kodek | PLCC-68 |
| U8 | video BIOS EPROM 32 KB | DIP-28 |
| Y1, Y2 | krystaly 14,31818 / 24,576 MHz | HC-49/U |
| J1 | PCI 32 bit 5 V (klíč na kontaktech 50/51) | hrana karty |
| J2–J6 | VGA DE-15, game port RJ-45, line in, line out, mic | bracket |

Mimo kartu: hostitelské PC, VGA monitor, reproduktory a Sega Saturn pad.

Co se děje po spuštění (RUN, rychlost MAX):
1. Počítač posílá skutečné PCI transakce: čte config space (`104A:0008`, třída VGA), nastaví BAR, přečte BIOS ROM
   (`55 AA`), naprogramuje CRTC na 640×480 @ 60 Hz a zapíše obraz do framebufferu.
2. NV1 zapisuje do DRAM cykly RAS#/CAS# ve fast page mode a každých 15,6 µs dělá refresh.
3. NV1 čte obraz zpátky do scan-out FIFO a posílá pixely RGB555 do RAMDACu. RAMDAC z nich dělá analogové
   napětí 0–0,7 V a monitor skládá obraz jen z napětí a časování synchronizace.
4. 32hlasá syntéza v NV1 posílá vzorky do AD1845 a na line-out je analogový signál.
5. Saturn pad se čte přes výběr TH/TR.

Simulace je přesná na takty, a proto pomalá: celý snímek 640×480 trvá v reálném čase zhruba minutu.

## Projekty a ECONOMIC view
Po spuštění jsou nahoře v liště dva projekty a otevře se první:
1. **NV1 KARTA**: tahle karta, ve všech pohledech (SCHEMATIC, PCB, DIE 3D, ECONOMIC).
2. **AI PC 2× P100**: sestava z videa Junk GPU Lab (podle `PCYoutubeborce.md`). Má zatím jen kusovník,
   takže jen ECONOMIC view. Obsahuje Dell T5810, Xeon E5-1650 v3, 4× 8 GB DDR4 ECC RDIMM, 2× Tesla P100,
   2× adaptér chlazení + ventilátor 9733, Quadro K620, 1TB NVMe s redukcí, druhý zdroj s Add2PSU, EPS redukce, ventilátory a pastu.

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
Simulovaný obvod jako u karty NV1: sítě nesou napětí (12 V, zem). Vypínač Dellu → vestavěný zdroj → SATA 12 V →
Add2PSU (relé) → PS_ON# druhého zdroje → 4 PCIe kabely → 2× redukce NVIDIA 030-0571-000 → EPS12V obou P100;
ventilátory 9733 napájí SATA regulátor TD404. PCIe kabel zapojený napřímo do EPS zdířky karty dá zkrat (`X`) přes
zem karty a slotu – stejně jako ve skutečnosti. Dvojklikem dovnitř (úroveň 2):
- redukce 030-0571-000 pin po pinu podle výkresu NVIDIA PB-08248,
- Add2PSU (relé spíná PS_ON# na COM, patent US8878390),
- regulátor TD404, obecná topologie ATX zdroje, bloky desky Tesla P100 a platforma Dell T5810 (CPU, C612, sloty).
Co není veřejně doložené, je ve schématu označené „neověřeno“. Pinouty: Intel ATX 3.0 DG, PCI Express CEM, Intel
4-Wire PWM Fan spec, SATA.

## Proklikávání (dvojklik)
L1 deska → L2 bloky uvnitř čipu → L3 RTL (CRTC, kvadratické dopředné diference, fázový akumulátor, PCI dekodér…)
→ L4 registry a sčítačky → L5 hradla → L6 CMOS z tranzistorů → L7 průřez tranzistorem 0,5 µm
(LOCOS, oxid ~10 nm, 3× Al) → L8 mřížka Si a SiO₂.

Úrovně L3–L6 se opravdu simulují. L2 (bloky), L7 (vrstvy) a L8 (atomy) jsou popisné.

## Co je model, ne kopie skutečného čipu
Mapa registrů NV1 je vlastní a 3D engine NV1 se nesimuluje (obraz kreslí CPU). Odhadem jsou dál:
rozdělení paměti na 4 čipy, typ EPROM, PLL v RAMDACu, pouzdro NV1, floorplan čipu a parametry procesu.

## Spuštění
```bash
cd silicon-logic-studio
npm install
npm test          # testy jádra, karty, hierarchie a routeru
npm run build
npm run desktop   # Electron okno
```
