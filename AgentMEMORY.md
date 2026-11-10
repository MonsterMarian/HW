# AgentMEMORY — HW (Silicon Logic Studio)

Aktualizováno: 2026-11-10 14:29

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

## Projekty + ECONOMIC view (2026-11-10)
- `src/engine/projects.js`: po startu 2 projekty (karty v titulní liště, `data-project`), otevře se 1. = NV1.
  2. = AI PC z `PCYoutubeborce.md` (Dell T5810 + 2× Tesla P100) – jen kusovník (`circuit: null`, `views: ['economic']`),
  ostatní pohledy jsou v liště zakázané. Přepnutí projektu ukládá stav enginu + hierarchii + pohled (App `savedProjects`).
- ECONOMIC view (`views/EconomicView.jsx`): díly z kusovníku `engine/economic/catalog.js` (`dims` mm + `dimsSrc`
  ověřeno/odhad); ceny se počítají JEN ze skutečných nabídek v `engine/economic/offers.js` (rešerše 10. 11. 2026,
  přímé URL produktů/inzerátů, `verified` fetched/snippet, kurz ČNB 9. 11.; `alt` = jen alternativa, nepočítá se).
  Test zakazuje vyhledávací URL. Modely v mm `views/economic/models.js` (zdroje rozměrů v hlavičce souboru)
  (čipy NV1 přes `buildRealPart` z boardScene), rozložení `economic/layout.js` (vysoké díly dozadu).
  Electron otevírá odkazy přes `shell.openExternal` (setWindowOpenHandler).
- Rozhodnutí: sestava PC = varianta z videa + kritické doplňky z dokumentu (Add2PSU, EPS redukce, chlazení, pasta,
  P12); alternativy (Ryzen, P40, 3060) nejsou. NV1 kusovník = jednotlivé součástky + monitor/repro/pad (bez host PC).
- Pasti: `window.__eco` (DEV) = stav 3D scény pro screenshoty; v node testech musí mít importy přípony `.js`.

## Další kroky / známé vady
- PC projekt nemá schéma/PCB/3D simulaci, jen ECONOMIC. Nabídky stárnou (inzeráty z Bazoše zmizí) – při další
  práci přerešeršovat. eBay/Alza/Heureka blokují stahování (403): jejich ceny jsou jen z výpisu vyhledávače.
  NV1 a STG1764X se dnes neprodávají (jen celé karty ~16–23 tis. Kč). Odhady rozměrů: čelo Dellu ±5 mm, IHS Xeonu,
  poloha kontaktů PCIe od záslepky, MX-6, Axagon PCEM2-N, periferie NV1.
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
- 2026-11-10 14:01 — „ECONOMIC view (díly z obchodu, ceny, odkazy) + projekt AI PC z PCYoutubeborce.md, projekty po startu“
  → projects.js, catalog, EconomicView + modely, karty projektů, 120/120 testů.
- 2026-11-10 14:29 — „skutečné ceny z více e-shopů s URL, přesné modely PC, oprav varování, pokračuj“ → rešerše 5 agentů
  (offers.js, 16+13 položek), modely podle manuálu Dell / NVIDIA PB / Samsung datasheetu, oxlint 0 varování,
  L2 floorplan bez překryvu, kompaktní 3D breadcrumb; 121/121 testů.
