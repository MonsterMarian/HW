# Plán: přestavba komponent podle zjištění (stav 11. 11. 2026)

Cíl: přestavět komponenty projektů (kusovník, 3D model, schéma a podobvody, ANATOMY) tak, aby odpovídaly tomu,
co je na mém PC skutečně zjištěné, a opravit všechno, co dnes stojí na odhadu.

Stav repa: 246/246 testů, lint 0 chyb, build prochází. Hotová práce je v `AgentMEMORY.md` (Log) a v historii gitu.

---

## 1. Opravit podle toho, co už je ověřené – HOTOVO 11. 11. 2026

Super I/O NCT6796D má vlastní podobvod L3 `nct6796d` (LPC, ACPI zapnutí, HW monitor se změřenými napětími,
SmartFan, tacho, PS/2, UART, GPIO; 3D pouzdro LQFP-128 – typ pouzdra neověřen), VRM desky nese změřené Vcore 1,20 V
a VCCIO 1,048 V, monitor VA249HE a GDDR6X na RTX 3060 Ti mají v popiscích, čím jsou ověřené. Test v `tests/my_pc.test.js`.

## 2. Přestavět komponenty, které jsou dnes odhad

Čeká na údaje od uživatele (štítek / pohled do skříně / GPU-Z nebo Thaiphoon Burner). Až údaj přijde, přestaví se
položka v `catalog.js` (`MY_PC_ITEMS`), nabídky v `offers.js`, 3D model v `models.js`, podobvod v `myPcSubcircuits.js`
a sestava v ANATOMY; z názvu zmizí „(ODHAD)“ a `dimsSrc` se přepíše na `ověřeno:`.

| Komponenta | Dnes v projektu (odhad) | Potřebný údaj | Co se přestaví |
| --- | --- | --- | --- |
| **Zdroj** | Endorfy Vero L5 Bronze 600 W | štítek na boku zdroje | model zdroje, podobvod `mypc_psu` (topologie, výstupy, počet PCIe/SATA kabelů), výpočet zátěže v MŮJ PC + 2× P100 |
| **Skříň** | Endorfy Signum 300 Air | logo / štítek | 3D skříň, ANATOMY sestava, max. délka karty (dnes 325 mm) a výška chladiče |
| **Chladič CPU** | boxový Intel E97379-003 | pohled přes okno | model chladiče, ventilátor CPU_FAN (otáčky min/max) |
| **Skříňové ventilátory** | 3 vpředu + 1 vzadu | spočítat, typ | `fan_case` v L1 schématu a 3D |
| **Čipy RAM** | výrobce neznámý | Thaiphoon Burner / HWiNFO (SPD) | podobvod `fury_module` a DRAM buňky |
| **Paměti GDDR6X** | Micron MT61K256M32JE-19? | GPU-Z | podobvod `mypc_gpu_board` |
| **VRM grafiky** | uP9512R? | foto PCB / teardown | podobvod `mypc_gpu_board` |
| **Myš, mikrofon** | obecné modely (OEM 30FA:1440, C-Media 0D8C:0134) | štítek na spodku / nápis | kusovník, 3D modely, podobvody |
| **Reproduktory / sluchátka** | nejsou v kusovníku | co je zapojené do zvukovky | nová položka + výstup ALC887 ve schématu |
| **RAM: barva chladiče** | černá (FB) | pohled na moduly | 3D model `udimm` |
| **Grafika: výstupy a 8 pin** | pořadí HDMI + 3× DP a poloha napájení odhad | pohled na kartu | 3D model `gpu` a piny v PCB |

## 3. MŮJ PC + 2× P100 (projekt 4) – dořešit podle zjištění

- **Délka karet – rozhodnuto 11. 11. 2026:** do čela skříně se vyřízne otvor ~121 × 109 mm ve výšce slotů (136–245 mm
  nad dnem), v té výšce se sundá přední ventilátor, karty s krytem a 9733 přečnívají ~46 mm (ANATOMY: `cutout`
  v `myPcP100Parts`, jantarový rámeček ve výkresu i 3D; poznámka u skříně v `MY_PC_P100_ITEMS`). Po ověření skříně
  (bod 2) přepočítat rozměry výřezu.
- **Zdroj 1:** po ověření štítku přepočítat zátěž (dnes ~375 W z 600 W) a počet PCIe 6+2 kabelů pro redukci W1.
- **BIOS:** ověřit, zda BIOS 3101 zvládne 2× 16 GB okno (BAR1) P100 s Above 4G Decoding; výsledek zapsat do kusovníku.

## 4. Skutečné CAD modely dílů mého PC (volitelné)

Jen díly, které v projektech opravdu jsou. Vyžaduje ruční stažení uživatelem (login):
- Sketchfab: Kingston HyperX Fury (`3d9499b5337f475d8bbb1eccdb20e73d`) → nahradit `udimm`.
- TE / Molex STEP: ATX 24 pin (Molex 39-30-1240), EPS 8 pin (39-30-1080), LGA1151 (TE 2287402-1), DDR4 DIMM slot
  (TE 2308107-x), PCIe x16 (Amphenol 10018783-10003TLF), M.2 M-key (TE 2199230-4) → detail desky `atxBoard`.

Napojení: `views/economic/realModels.js` (`SOURCES`, `fit` pro obecné modely), soubory do `src/assets/models/`.

## 4b. Detail schémat – HOTOVO 11. 11. 2026

Bloky čipů vedou přes konkrétní jednotky (`engine/unitSubcircuits.js`, 68 jednotek, mezistupně L3,5 a L4,5) a vrstvy
tranzistorů na atomové mřížky všech použitých materiálů (Si, SiGe, HfO₂, TiN, W, Cu, SiCOH, ZrO₂, Al₂O₃, SiN …) až ke
kvarkům. Zbývá jen to, co nejde bez údajů: zdroj mého PC (podle štítku), MCU myši a mikrofonu (podle nápisu).

## 4c. Web „Silicon Studio · hardware“ (`web.html`, `src/web/`) – základ HOTOVÝ 13. 11. 2026

75 součástek s vlastní stránkou, štítky přesnosti, rešerše u všech. 13. 11. přidaná Anatomie ve 3D ve stylu robotů
(let kamerou, rozložení, dvojklik dovnitř až k atomům) a robotí rozvržení stránky. Dál – funkce robotí aplikace, které chybí:
- Mapa světa jako 3D glóbus s bublinami (shlukování, klik rozdělí) a periodická tabulka prvků, ze kterých díly jsou
  (vyžaduje v rešerši strukturované prvky u uzlů těžby).
- Strom dodávek: režim Tok (animované pulzy) / Cena, přizpůsobení, filtr země.
- Porovnání dílů se skóre 1–5 podle úlohy a animacemi principu; laboratoř = kalkulačka (např. zatížení zdroje, chlazení).
- Karty sestav s tečkami 1–5, podíl na trhu v čase (graf), filtry firem a časové osy, průvodce rozborkou (teardown).
- Rozšířit registr o pasivní součástky, které dnes v modelech nejsou (kondenzátory, rezistory, cívky VRM, tlumivky) –
  u každé desky podle fotky / manuálu, se štítkem MODEL NENÍ, dokud nedostane model.
- Doplnit rešerši tam, kde chybí (repro bez firem, myš bez časové osy, konkrétní fabriky čipů); po přestavbě dílů z bodu 2
  přepsat rešerši pro skutečné modely (zdroj, skříň, chladič).
- Při změně přesnosti modelu (bod 2, plán NV1) přepsat `model` / `schema` u dílu v `parts.js`.

## 5. Údržba

- Nabídky v `offers.js` (dohledány 10. 11. 2026) přerešeršovat zhruba po měsíci; po přestavbě komponent z bodu 2
  dohledat nabídky pro skutečné modely.
