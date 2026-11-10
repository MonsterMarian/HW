# AgentMEMORY — HW (Silicon Logic Studio)

Aktualizováno: 2026-11-10 11:34

## Cíl repa
Desktopový simulátor hardwaru (React 19 + Vite + three.js, Electron) v `silicon-logic-studio/`. Hlavní obvod je
skutečná karta Diamond Edge 3D 2120 (NVIDIA NV1 / SGS-Thomson STG2000X, 1995), kterou jde proklikat od desky
až k atomům (8 úrovní) ve 2D (schéma, PCB) i 3D. Uživatel chce: vzhled jako jeho portfolio (`../Portfolio`),
vizualizace co nejpřesněji podle skutečného HW, spoje jako reálné zařízení (ne jen schéma).

## Stav a jak spustit
- `cd silicon-logic-studio && npm install && npm test` (node --test, ~115 testů), `npm run build`.
- Vývoj: `npx vite --port 5287 --strictPort` (port 5199 bývá obsazený portfoliem!).
- Vizuální kontrola bez okna: `SHOT_URL=http://localhost:5287/ npx electron tools/shot.cjs <steps.json> <outdir>`
  (okno `show:false`, `SHOT_SIZE=1280x800`; helpery `__view('SCHEMATIC'|'PCB'|'DIE 3D')`, `__dbl(x,y)`, `__crumb()`,
  `__active()`, `window.__errs`; v DEV i `window.__engine`, `window.__three`, `window.__slsCanvas`).
  Uživatel NECHCE, aby se mu aplikace otevírala – nikdy `npm run desktop` ani viditelný prohlížeč.
- Rychlost simulace karty ~3 µs na hranu hodin (≈217 hran / µs simulovaného času) → jeden snímek 640×480
  (16,7 ms) trvá v reálném čase ~1 min. Testy proto používají malý video režim `TINY` + `monitor.modes`.

## Hotovo (2026-11-10)
- Nové jádro `src/engine/logicEngine.js`: dráty = vodivé sítě (union-find), obousměrné piny, tri-state,
  zkrat = 'X', plovoucí = 'Z' (NE 2/3 – stará chyba: sběrnicová hodnota 2 se brala jako Z), pull-upy,
  pasivní konektory (`joins`), NMOS/PMOS na úrovni spínačů s držením náboje, víc nezávislých hodin
  v simulovaném čase (ns), `wireValue/wireWidth/wireLabel/pinValue`, `setFrequency(Infinity)` = MAX.
- Modely součástek `src/engine/devices/nv1Card.js` (+ registry `devices/index.js`): host PC posílá skutečné PCI
  transakce (config 104A:0008, BAR0, ROM 55AA s kontrolním součtem), NV1 = PCI target + FIFO + řadič FPM DRAM
  (RAS/CAS, page mode, CBR refresh 15,6 µs) + CRTC/scan-out + 32hlasá syntéza → AD1845 + Saturn TH/TR scan;
  4× KM416C256, STG1764X (PLL z 14,31818 MHz → VCLK 25,165 / MCLK 50,1 MHz, RGB555 → 0–0,7 V), AD1845 (48 kHz
  z 24,576 MHz), EPROM, konektory, monitor skládá obraz jen z napětí a časování syncu.
- Preset `src/engine/presets/nv1Board.js` (x/y = PCB 3,7 px/mm, sx/sy = schéma). Rozměry pouzder a obrys karty
  v `boardLayout.js`. 5V klíč PCI je na kontaktech 50/51 (pin 1 u bracketu).
- Hierarchie `hierarchicalSubcircuits.js` L2–L8 přepsaná: L2 DIE_BLOCK (popisné), L3+ simulované RTL → hradla →
  CMOS z tranzistorů → 1 tranzistor + LAYER průřez → ATOM mřížka. `tests/hierarchy.test.js`.
- 2D: `src/views/canvas/*` (theme, geometry, boardDraw, pcbRoutes), `LogicCanvas.jsx`; 3D: `views/physics/*`
  (boardScene, packages, pcbRouter = A* router 0/45/90° sdílený 2D i 3D; siliconScenes = L2–L8: otevřené pouzdro
  + die floorplan, standardní buňky, CMOS layout z netlistu, průřez LOCOS/10 nm oxid/3× Al, mřížka Si/SiO₂).
  Vzhled podle portfolia (`index.css` tokeny, Tailwind paleta přemapovaná: třídy `cyan-*` kreslí jantar!).
- Externí zařízení (monitor, repro, pad) jsou vlevo za bracketem (kabely nevedou přes kartu).
- Diagnostika (DIAG) spouští vlastní engine v režimu TINY a hlásí 7 skutečných kontrol.

## Další kroky / známé vady
- Rychlost: ~3 µs na hranu; profil ukazuje režii v `_settle`/`step` + modely čipů. Vyzkoušeno bez efektu:
  rychlá cesta pro sestupné hrany, pole místo Set. Další nápad: Web Worker nebo jemnější sensitivity listy.
- Breadcrumb/HUD ve 3D na hlubokých úrovních přetéká; na L2 schématu se překrývá blok PCI TARGET s pady.
- Pin vývody na pouzdrech = konvence (vstupy vlevo, výstupy vpravo), ne skutečný pinout; cesty nejsou layout Diamondu.
- Lint: jen stará varování v LogicCanvas (refs during render, deps).

## Rozhodnutí a poznámky
- Co je model, ne kopie čipu: registrová mapa NV1 (CRTC/audio/gameport) je vlastní, skutečný NV1 měl
  nezdokumentované objektové rozhraní; 3D kvadratický engine NV1 se nesimuluje (obraz kreslí host CPU);
  rozdělení 2 MB na 4× 256K×16, typ EPROM, PLL ve STG1764X, pouzdro NV1 PQFP-208, floorplan die, počet kovových
  vrstev a parametry procesu jsou předpoklady (ověřené jsou jen: STG2000X, 0,5 µm, 1M tranzistorů, 90 mm²,
  64bit paměť, STG1764X, AD1845, 2 MB 50 ns SEC DRAM, VGA + 3 jacky + RJ-45 game port).
- PCI pravidlo v modelu: čtení nesmí předběhnout zapsané (posted) zápisy → řadič nejdřív vyprázdní FIFO.
- Tichá past enginu: při hromadné změně vstupů se zapojením tranzistorů záleží na pořadí (závod) – testy dělají
  kroky postupně.

## Log
- 2026-11-10 11:06 — „oprav bugy, vzhled jako portfolio, vizualizace a spoje jako reálné zařízení“ → nové jádro,
  modely karty, hierarchie, 2D/3D, restyle.
- 2026-11-10 11:34 — dokončení: 3D L2–L8, 5V klíč PCI opraven (kontakty 50/51), bracket na hraně karty,
  zařízení za bracketem, README přepsané; 115/115 testů, build OK.
