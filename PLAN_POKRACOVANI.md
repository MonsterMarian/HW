# Plán pokračování (navázání na session z 10. 11. 2026)

Záznam z poslední uzavřené session Claude Code (`1e371bb2-fbdc-4648-a85d-b9f8d6265eab`, 10. 11. 2026 cca 19:56–22:41 CET), která se zastavila při vyčerpání 5hodinového limitu v 22:41 uprostřed práce na napojení reálných fotek čipů (die shotů).

Aktuální stav repozitáře při uložení na GitHub (`silicon-logic-studio/`):
- **Testy (`npm test`):** 239 / 239 prochází (14 sad)
- **Lint (`npm run lint` / oxlint):** 0 chyb, 0 varování (71 souborů)
- **Build (`npm run build`):** prochází (varování na velikost chunků > 500 kB: `index-*.js` ~1,49 MB, `realModels-*.js` ~1,63 MB kvůli inline GLB)

---

## 1. Co je rozdělané (priorita č. 1)

### 1.1 Napojení stažených die shotů a rozmístění bloků podle fotek
Práce se přerušila přesně ve chvíli, kdy agent připravil 4 zmenšené JPEG textury v `silicon-logic-studio/src/assets/dieshots/`, otevřel `coffeelake8c_cc0.jpg` a `gp100_cc0_rot90.jpg` pro vizuální kontrolu a nestihl je napojit do `siliconScenes.js`.

**Už připravené soubory v repu (`silicon-logic-studio/src/assets/dieshots/`):**
- `coffeelake8c_cc0.jpg` (2400×1122, CC0, autor Fritzchens Fritz – přesný die pro i7-9700 / `cfl_die`)
- `b360_cannonpoint_ccbysa.jpg` (2048×1673, **CC BY-SA 2.0**, autor `cole8888` – přesný die pro PCH B360 / `b360_pch`)
- `gp100_cc0_rot90.jpg` (1966×2400, CC0, autor Fritzchens Fritz – přesný die pro Tesla P100 / `gp100_die`, otočený o 90° pro orientaci k HBM2 stackům)
- `hbm2_dram_cc0.jpg` (671×1024, CC0, autor Fritzchens Fritz – pro HBM2 DRAM vrstvy na GP100)

**Zbývá dodělat:**
1. **Zpracovat zbylé CC0 snímky pro GP100/CoWoS** (byly staženy jen do dočasného scratchpadu mimo repo, případně stáhnout z Wikimedia Commons – viz zdroje níže):
   - `gp100_interposer_topmetal_CC0.jpg` → textura křemíkového CoWoS interposeru pod GP100 a HBM2.
   - `hbm2_logic_die_topmetal_CC0.jpg` → textura spodního logického (buffer) die pod HBM2 stackem.
   - Volitelně rozhodnout o nejbližších CC0 náhradách tam, kde volný originální die shot neexistuje: **GA102** (za GA104, jiný čip: 7 GPC / 384bit vs. 6 GPC / 256bit) a **GM204** (za GM107). Pokud se použijí, v UI je nutné jasně uvést, že jde o příbuzný čip, nikoli originál. (Pro Haswell-EP, Samsung Phoenix/MKX, DDR4 E-die a V-NAND volně licencované snímky nejsou – chráněný press shot Intelu `i7-5960X` byl smazán a nesmí se do aplikace dávat.)
2. **Napojit textury v `silicon-logic-studio/src/views/physics/siliconScenes.js`:**
   - V `buildFlipDie(...)` nahradit procedurální texturu `dieBaseTexture(...)` načtením skutečného die shotu pro daný `entry.key` (a upravit poměry stran die v `PACKAGES`, např. `b360_pch` je nyní `6.5 × 6.5`, zatímco fotka má poměr ~`2048:1673` ≈ `1,22:1`; u `gp100_die` ověřit orientaci vůči `gp100_cc0_rot90.jpg`).
   - V `buildFlipPackage(...)` pro `pk.cowos` otexturovat interposer a HBM2 stacky (`layerMat`).
   - **Licence:** U `b360_cannonpoint_ccbysa.jpg` uvést v UI / dokumentaci autora `cole8888` a licenci **CC BY-SA 2.0**.
3. **Nahradit generický `floorplan(...)` v `placeBlocks(...)` reálnými polohami bloků:**
   Odečtené normalizované souřadnice `(x0, y0 – x1, y1)` z náhledů (přesnost ±0.01–0.02):
   - **`cfl_die` (i7-9700 / Coffee Lake 8C):**
     - System Agent (`0.00, 0.02 – 0.125, 0.98`, uvnitř display/media `0.05, 0.63 – 0.125, 0.90`)
     - Horní I/O pás (`0.01, 0.02 – 0.50, 0.07`)
     - 8 jader ve 4 sloupcích × 2 řadách: sloupce X `0.143–0.255`, `0.29–0.404`, `0.437–0.552`, `0.583–0.70`; řady Y `0.07–0.47` a `0.58–0.96`
     - L3 SRAM pásy mezi sloupci: X `0.128–0.143`, `0.255–0.29`, `0.404–0.437`, `0.552–0.583`, `0.70–0.716` (`y 0.07–0.96`)
     - Ring + ring stopy: vodorovně `0.13, 0.47 – 0.75, 0.58`
     - iGPU UHD 630: `0.715, 0.07 – 1.0, 0.98`
   - **`b360_pch` (B360 Cannon Point, názvy bloků jsou odhad):**
     - HSIO analogové buňky (PCIe/SATA/USB PHY) `0.00, 0.00 – 0.57, 0.19`, další I/O `0.57, 0.00 – 0.77, 0.12`, levý sloupec `0.00, 0.30 – 0.05, 0.70`, spodní pás `0.22, 0.92 – 0.60, 1.00`, CSME SRAM `0.80, 0.25 – 0.93, 0.66`, hustá logika vpravo dole `0.73, 0.70 – 1.0, 1.0`.
   - **`gp100_die` (Tesla P100, souřadnice před 90° otočením v pouzdře):**
     - 4× HBM2 PHY (`0.13–0.36` a `0.66–0.89` při horní/dolní hraně `0.00–0.07` a `0.93–1.00`)
     - Centrální páteř L2 4 MB / crossbar / FB partitions (`0.465, 0.00 – 0.635, 1.00`, hub uprostřed `0.47, 0.45 – 0.63, 0.56`)
     - 6 GPC: levá strana X `0.11–0.46`, pravá X `0.64–0.98`, řady Y `0.07–0.34`, `0.37–0.63`, `0.64–0.92`
     - NVLink PHY `0.00, 0.02 – 0.08, 0.48`, PCIe/IO `0.00, 0.48 – 0.04, 0.75`, další IO `0.00, 0.75 – 0.11, 1.00`.
   - **`xeon_die` (Haswell-EP LCC, bez obrázku – použít pouze fakta rozložení):**
     - 2×4 jádra: levý sloupec X `0.02–0.28`, pravý `0.63–0.90`, řady Y `0.23–0.375`, `0.375–0.52`, `0.52–0.665`, `0.665–0.82`
     - L3 (8 slic) + ring uprostřed `0.29, 0.23 – 0.62, 0.82` (ring na X ≈ `0.455`)
     - PCIe/QPI/DMI PHY nahoře `0.04, 0.00 – 0.98, 0.06`, Uncore `0.02, 0.06 – 0.98, 0.21`
     - 4ch DDR4 PHY dole vlevo/vpravo (`0.02–0.33` a `0.65–0.97`, Y `0.86–1.0`) a IMC uprostřed dole `0.35, 0.86 – 0.64, 1.0`.
4. **Vizuální kontrola:** spustit `SHOT_URL=http://localhost:5287/ npx electron tools/shot.cjs ...` pro L3 scény (`cfl_die`, `b360_pch`, `gp100_die`, `xeon_die`) a ověřit čitelnost popisků bloků a klikatelnost přes die texturu.

---

### 1.2 Reálné 3D CAD modely (zapojeno jen `arctic_p12_pro.glb`)
Subagent (`ae3d5e46dd9a715ac`) prověřil dostupnost oficiálních i komunitních CAD modelů:
- **Hotovo:** Oficiální STEP model `Arctic P12 Pro` byl převeden do `silicon-logic-studio/src/assets/models/arctic_p12_pro.glb` (31 585 trojúhelníků, 1,2 MB), vytvořen `src/views/economic/realModels.js` (`swapIn`) a zapojen na `case_fan` v `P100_PC_ITEMS` (`catalog.js`).

**Zbývá dodělat z volně dostupných zdrojů (bez přihlášení):**
1. **FreeCAD library (`CC-BY 3.0`, nutno uvést autora):**
   - Převést a napojit `2-5inch-Disk-Drive-7mm-SATA.step` / `.stl` pro Samsung 870 EVO v `P100_PC_ITEMS` (kód `ssd`).
   - Zvážit `blower-50x50mm.stl` (jako škálovatelnou náhradu za 9733 blower – nutno ověřit rozměrovou přesnost oproti stávajícímu parametrickému modelu).
2. **KiCad 3D library (tag `9.0.0` má přímo `.wrl` čitelné přes `VRMLLoader` v `three`, `master` má `.step`, licence `CC-BY-SA 4.0 + design exception`):**
   - `SATA_Amphenol_10029364-001LF_Horizontal.wrl` (přesný díl SATA konektoru),
   - `FanPinHeader_1x04_P2.54mm_Vertical`, SMD kondenzátory (`C_0402`, `C_0805`, `CP_Elec_8x10`) a pouzdra `BGA-1295` (37,5 × 37,5 mm) / `BGA-1156` pro detailnější desky v `boardScene.js` a `models.js`.
3. **Opravit/ověřit chování asynchronního `swapIn` v `models.js`:**
   - `swapIn(g, item)` v `models.js` nahrazuje mesh asynchronně přes dynamický `import('./realModels.js')`. Je potřeba ověřit, že v `Anatomy3D.jsx`, `EconomicView.jsx` a `aiPcScene.js` po doběhnutí `swapIn` sedí `Box3`, popisky, kabely i `fitView` (aby kamera nebo kabely nepočítaly s dočasnou skupinou před výměnou).
   - Zapojit reálné modely ventilátorů/konektorů i do `MY_PC_ITEMS` tam, kde odpovídají.

**Vyžaduje ruční stažení uživatelem v prohlížeči (skripty narazily na login nebo 403/timeout):**
- **TE Connectivity & Molex (přesné oficiální STEP modely konektorů a socketů):**
  - ATX 24-pin (Molex `39-30-1240` / `44206-0007`), EPS 8-pin (`39-30-1080`)
  - LGA2011-3 (TE `2201838-1`), LGA1151 (TE `2287402-1`)
  - DDR4 DIMM (TE `2308107-x` / `2199155-x`), PCIe x16 (Amphenol `10018783-10003TLF` / TE `1-1734774-x`), M.2 M-key (TE `2199230-4`)
- **Sketchfab / GrabCAD (vyžaduje přihlášení pro stažení GLB/STEP; modely mají 100k–800k ploch a budou potřebovat decimaci):**
  - *Kingston HyperX Fury Black* (Sketchfab `3d9499b5337f475d8bbb1eccdb20e73d`) – přesný produkt pro `MŮJ PC`
  - *Gigabyte RTX 3060 Ti Eagle* (`1586908000f24cf1b65454f8d3999504`), *Samsung SM883 SATA SSD* (`09cd60eca56e45f38ec670fc8f848b6f`), *ASUS Z170-P LGA1151* (`b998596cfc4945a0bc7b016005c39321`), *i7-4820K LGA2011* (`1326b1e7dd8045558fe84d7350e324dd`), *Intel stock cooler* (GrabCAD).

---

### 1.3 Ověření odhadů a neověřených údajů v obou PC projektech
1. **Odhady v `MŮJ PC` (podle `MujPC_odhady.md`):**
   - Fyzicky podle štítků a pohledu do skříně ověřit a opravit v `catalog.js` (`MY_PC_ITEMS`), `offers.js` (`my_*`) a `myPcSubcircuits.js`:
     - Skříň (odhad Endorfy Signum 300 Air), zdroj (odhad Endorfy Vero L5 Bronze 600 W), chladič CPU (odhad boxový Intel E97379-003), počet ventilátorů, model myši a USB mikrofonu, doplnit připojené reproduktory/sluchátka.
   - Softwarem (HWiNFO, GPU-Z, Thaiphoon Burner) ověřit vnitřní čipy označené v `myPcSubcircuits.js` jako neověřené: Super I/O (`NCT6796D`?), VID CPU, výrobce čipů RAM (SK hynix / Micron), VRM a GDDR6X na RTX 3060 Ti (`uP9512R`?).
2. **Neověřené detaily v `AI PC` a `processSubcircuits.js`:**
   - Z rešerše `ad954adfa79daf558` zůstalo bez veřejného zdroje (paywall TechInsights / Yole / bez datasheetu): konkrétní kovy hradla u Intel 22 nm, pitch M7–M9 a rozměry die Haswell-EP v mm (354 mm²), přesné rozměry substrátu Tesla P100 (55 × 55 mm odhad), fin height/Lg/SRAM u TSMC 16FF+, VRM fáze a DrMOS na P100 PCIe, tloušťky vrstev ONO v V-NAND a rozměry buňky 4Gb DDR4 E-die (`M393A1G40EB1`), slabě ověřený řadič Samsung MKX (14 nm, 3× Cortex-R4). Zpřesňovat jen pokud se najdou primární zdroje nebo fotky vlastní desky.

---

### 1.4 Technický dluh, optimalizace a dokumentace
- **Vite bundle warning:** `realModels-*.js` (1,63 MB) má `arctic_p12_pro.glb?inline` vložený jako base64 v JS chunku. Přepnout na načítání binárního `.glb` přes standardní asset URL (nebo `public/` / Vite asset import bez `?inline`) a otestovat v Electron buildu (`file://` / `asar`), aby klesla velikost JS bundlu.
- **Dokumentace:** Doplnit tabulku `Log` a aktuální počet testů (`239/239`) v `AgentMEMORY.md` (zůstal u `195/195`) a navázat v `docs/PRACOVNI_DENIK_2026-11-10.md` / `README.md`.
- **Starší otevřené položky z `AgentMEMORY.md`:**
  - Rychlost simulace NV1 (~3 µs na hranu hodin → Web Worker nebo jemnější sensitivity listy).
  - Na L2 schématu NV1 se částečně překrývá blok `PCI TARGET` s pady.
  - Průběžná aktualizace stárnoucích bazarových nabídek v `offers.js`.

---

## 2. Shrnutí hotové práce z uzavřené session (už v kódu)

Během session `1e371bb2-fbdc-4648-a85d-b9f8d6265eab` bylo kompletně vytvořeno a otestováno:
1. **Nový 3. projekt `MŮJ PC` (`mypc`):** diagnostika reálného PC přes Windows (`i7-9700`, `ASUS PRIME B360-PLUS`, `4× 8 GB DDR4-2666`, `ASUS Dual RTX 3060 Ti OC`, `Samsung 970 EVO Plus 500 GB` v `M.2_2`, periferie včetně odlišení USB mikrofonu `0D8C:0134`), kusovník `MY_PC_ITEMS` + `B360_LAYOUT` (`catalog.js`), nabídky (`offers.js`), 3D modely (`models.js`), sestava v `ANATOMY` (`figures.js`, `scene3d.js`, `Anatomy3D.jsx`) a seznam odhadů v `MujPC_odhady.md`.
2. **Simulovaná schémata `MŮJ PC` L1–L6:** L1 spuštění PC a poruchy (`presets/myPcSystem.js`, `devices/myPc.js`), L2–L4 podobvody (`myPcSubcircuits.js`), 15 simulovaných buněk `cell_*` + mapa `DRILLS` vedoucí každý funkční blok až na hradla/tranzistory (`tests/my_pc.test.js`).
3. **2D PCB a DIE 3D pro `MŮJ PC`:** layout desky `engine/myPcLayout.js` (221 × 305 mm dle manuálu E13832), kreslení v 2D (`boardDraw.js`, `geometry.js`, `pcbRoutes.js`), 3D scéna L1 (`views/physics/myPcScene.js`) a moderní flip-chip pouzdra (`buildFlipDie` / `buildFlipPackage` v `siliconScenes.js`).
4. **Výrobní procesy (L7) a atomy/částice až ke kvarkům (L8–L11):** `engine/processSubcircuits.js` (`intel14`, `samsung8n`, `intel22`, `tsmc16`, `tsmc28`, `dram` BCAT, `vnand` charge-trap, `power` trench, `tft`, `unknown`), výběr procesu podle nejbližšího předka (`hierarchicalSubcircuits.js`), `engine/particleSubcircuits.js` (atomy, jádro, proton/neutron, kvarky) a 3D scény v `views/physics/deepScenes.js`.
5. **Kvalita 3D zobrazení (`views/physics/viewQuality.js`):** post-processing GTAO + `OutputPass` ve všech 3D pohledech (`DIE 3D`, `ECONOMIC`, `ANATOMY`), obrysy hran (`addEdges`) a adaptivní `fitView` podle měřítka scény (mm až fm).
6. **Hloubka pro `AI PC 2× P100`:** 3D L1 sestava `views/physics/aiPcScene.js`, podobvody a drill-down `engine/aiPcDepth.js` (včetně `gm107_die`, CoWoS interposer + 4× HBM2 v `siliconScenes.js`, `tests/ai_pc.test.js`), napojení prvního reálného CAD modelu `arctic_p12_pro.glb` (`views/economic/realModels.js`).

---

## 3. Odkazy na ověřené zdroje z rešerše

**Die shoty (Wikimedia Commons):**
- i9-9900K / Coffee Lake 8C (CC0, Fritzchens Fritz): `File:Intel@14nm++@CoffeeLake@Coffee Lake-R@i9-9900K@SRG19 DSCx03 poly@5x.jpg`
- B360 Cannon Point (CC BY-SA 2.0, cole8888): `File:Intel B360 Cannon Point Chipset Die Shot.png`
- GP100 + HBM2 + CoWoS (CC0, Fritzchens Fritz): `File:Nvidia@16nm@Pascal@GP100@Tesla P100@T Taiwan 1912A1 PN9G70.S6W GP100-897-A1 DSCx07 poly(photoshopped)@5x.jpg` (a sourozenci `DSCx08` HBM DRAM, `DSCx09` HBM Logic, `DSCx10` Interposer)

**3D CAD (volně bez loginu):**
- Arctic P12 Pro STEP: `https://support.arctic.de/products/p12-pro-pst/techdocs/P12%20PRO%203D%20Model%20Reference%20.zip`
- FreeCAD Parts Library (CC-BY 3.0): `https://github.com/FreeCAD/FreeCAD-library` (`2-5inch-Disk-Drive-7mm-SATA.step/.stl`, `sata-data.stl`, `blower-50x50mm.stl`)
- KiCad 3D Library (CC-BY-SA 4.0 + design exception, `.wrl` na tagu `9.0.0`): `https://gitlab.com/kicad/libraries/kicad-packages3D/-/tree/9.0.0`
