# Pokračování práce – stav k 2026-11-09

Celkové zadání: `../PLAN_PROJEKTU.md`. Krátkodobý cíl (od uživatele): **opravit bugy, 3D modely udělat pořádně
a proklikávání (drill-down) tak, aby šlo projít do všech částí** – a pak dál ladit aplikaci podle plánu.

## Hotovo v této session

### Drill-down (proklikávání)
- `src/engine/hierarchicalSubcircuits.js`: `findSubcircuit` přepsán na datově řízené vyhledávání
  (pořadí: `comp.drill` → id → nápovědy v id `pmos/nmos/sio2` → typ). Úroveň musí přísně růst, předci se nevracejí → žádné cykly.
- Opravené úrovně: REGISTER_8BIT 4, MUX 4, D_FF 5, NOT/NOR/NAND/TRI_STATE_BUFFER 6 (tranzistorová úroveň).
  Dřív byly MUX/registry uvnitř bloků úrovně 3 slepé uličky a NAND↔AND tvořily cyklus.
- NAND = alias na `nand_center` (CMOS). NOR přepsán na CMOS tranzistory. `nand_center` teď počítá správně NAND (dřív NOT A).
- Typ `TRI_STATE` (engine ho neznal) → `TRI_STATE_BUFFER`. RAM/ROM dekodéry z registrů → AND hradla. NMOS má hradlový oxid → jde do atomů.
- Test `DRILL CRAWL` (tests/nv1_card.test.js) projde celý strom ze všech presetů: žádné slepé uličky nad úrovní 6, každý podobvod dosažitelný. Plus test pravdivostních tabulek CMOS NAND/NOR. **22/22 testů prochází.**

### App / engine
- `App.jsx`: drill/navigace bez vedlejších efektů uvnitř `setState` updateru (StrictMode je volal 2×). Do stacku se ukládá `key` + `level`.
- Toast „nejnižší úroveň – dál už nelze“ při dvojkliku na list.
- Načtení obvodu z Galerie / importu / AI Copilota resetuje hierarchii (dřív zůstal starý breadcrumb a „Level up“ obnovil NV1).
- `LogicEngine.loadCircuit()` (nahradil 5 kopií stejného kódu), `exportState()` už neztrácí vlastnosti komponent (tunnelName, manual*, drill…).
- LogicCanvas: Backspace se selekcí maže komponentu místo zároveň „level up“; breadcrumb ukazuje skutečnou úroveň.

### Rozvržení 2D desky
- Nový `src/engine/boardLayout.js` – sdílené rozměry, piny, obrys NV1 karty (2D i 3D používají totéž).
- Přeskládané pozice komponent NV1 presetu (`aiCopilot.js`) – nic se nepřekrývá s nápisy, ROM už nepřečuhuje přes desku.
- Krystal Y2 ukazuje 24.576 MHz (dřív oba 14.318).

### 3D (Physics view) – kompletně přepsáno
- Dřív byl 3D natvrdo podle *hloubky stacku* (dvojklik na RAMDAC ukázal die NV1). Teď se scéna generuje
  z komponent aktuálního podobvodu v enginu; každý 3D objekt = skutečná komponenta → dvojklik dělá totéž co v 2D.
- `src/views/physics/`:
  - `common.js` – materiály, textury s nápisy, trasy, instancing.
  - `packages.js` – PQFP-208 (gull-wing), PLCC-44, SOJ, DIP, krystal HC-49/S, box header, D-sub, jack, CRT monitor (živá textura), gamepad, přepínač, LED, 7-seg.
  - `boardScene.js` – úroveň 1: PCB 1:1 podle 2D, obrys karty, silkscreen, měděné cesty svítí podle signálu, PCI zlaté kontakty s klíčem, bracket s konektory, monitor a kabely mimo desku.
  - `siliconScenes.js` – úroveň 2 die (pouzdro, lead-frame, 208 bond drátků, bloky s texturou „die photo“), 3–5 standardní buňky (N-well, difuze, poly, metal), 6 CMOS tranzistory (kanál svítí když vede), 7 průřez MOSFETem (STI, S/D, LDD, spacery, oxid, nosiče náboje), 8 Si krystal + amorfní SiO₂.
  - `PhysicsView.jsx` – jeden WebGL renderer (nevytváří se znovu při každém zanoření), CSS2D popisky, hover box, klik přepíná INPUT, dvojklik = drill.
- **Ověřeno screenshotem jen úroveň 1 (deska) – vypadá dobře.** Úrovně 2–8 se postaví bez chyb v konzoli
  (`window.__errs` prázdné), ale screenshoty se zpožďovaly o jeden krok, takže je vizuálně ještě nemám zkontrolované.

## S čím pokračovat zítra (v tomto pořadí)

1. **Vizuálně zkontrolovat 3D úrovně 2–8** a doladit (měřítka, kamery, čitelnost popisků, překryvy).
   Nástroj: `tools/shot.cjs` (viz níže). Opravit v něm zpoždění snímku (např. `win.show()` nebo čekat 2× rAF před `capturePage`).
2. 3D „ČIP STG2000X“ close-up a deska: zkontrolovat orientaci textu na bracketu (může být zrcadlově) a cedulku NV1 – nápisy se překrývají s popiskem.
3. Ověřit dvojklik přímo ve 3D (raycast) na všech úrovních, ne jen přes 2D.
4. Toolbar se zalamuje při šířce ~1500 px (tlačítka „LOGIC GATES“, „NV1 (1995) VINTAGE CHIPS“ na 2–3 řádky) – zúžit/ikony.
5. Lint varování (`npx oxlint`): TDZ přístupy v LogicCanvas/ComponentSchematicCanvas (funkce použité před deklarací v `useCallback`), nepoužité importy.
6. `ComponentInspectorModal` / `ComponentSchematicCanvas` – zkontrolovat, že sedí s novými podobvody (NOR je teď CMOS, NAND alias).
7. Pak pokračovat podle `PLAN_PROJEKTU.md` (níže).

## Celkový plán (z PLAN_PROJEKTU.md) – co zbývá
- [ ] Milník 1: jádro v Rustu (`core/` je jen kostra) + rychlé plátno (teď Canvas2D, plán WebGPU/SDF dráty).
- [ ] Milník 2: sběrnice s kontrolou šířky, splitter/merger UI, tri-state na sběrnici.
- [ ] Milník 3: „Zabalit výběr do čipu“ (`packageSubcircuit` v engine je nedodělaný – nepočítá vstupy/výstupy), export/import komponent.
- [ ] Milník 4: Physics view – termokamera (thermalMap existuje, nezobrazuje se ve 3D), RC zpoždění drátů.
- [ ] Milník 5: VRAM displej, ISA editor + assembler (existuje základ), AI copilot (teď offline šablony).

## Jak spustit / testovat
```
cd silicon-logic-studio
npm install
npm test          # node --test
npx vite --port 5199
npx electron tools/shot.cjs tools/steps-example.json <výstupní-složka>   # screenshoty + konzole do log.txt
```
`tools/shot.cjs` po načtení vloží helpery: `__view('SILICON DIE 3D')`, `__dbl(x, y)` (dvojklik do 2D plátna v souřadnicích obvodu),
`__crumb()` (aktuální breadcrumb), `window.__errs` (chyby).
Chrome rozšíření nebylo připojené, proto vlastní Electron skript.
