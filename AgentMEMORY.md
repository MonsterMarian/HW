# AgentMEMORY — HW (Silicon Logic Studio)

Aktualizováno: 2026-11-11 13:05

## Cíl repa
Desktopový simulátor hardwaru (React 19 + Vite + three.js, Electron) v `silicon-logic-studio/`. Hlavní obvod je
skutečná karta Diamond Edge 3D 2120 (NVIDIA NV1 / SGS-Thomson STG2000X, 1995), kterou jde proklikat od desky
až k atomům (8 úrovní) ve 2D (schéma, PCB) i 3D. Uživatel chce: vzhled jako jeho portfolio (`../Portfolio`),
vizualizace co nejpřesněji podle skutečného HW, spoje jako reálné zařízení (ne jen schéma).

## Stav a jak spustit
- `cd silicon-logic-studio && npm install && npm test` (node --test, ~260 testů), `npm run build`.
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
  (RAS/CAS, page mode, CBR refresh každých 776 MCLK = 15,52 µs) + CRTC/scan-out + 32hlasá syntéza → AD1845 + Saturn TH/TR scan;
  4× KM416C256, STG1764X (3 PLL z jediného krystalu → VCLK 25,165 / MCLK 50,1 / ACLK 24,576 MHz, RGB555 → 0–0,7 V), AD1845 (48 kHz
  z ACLK, vlastní krystal nemá), EPROM, konektory, monitor skládá obraz jen z napětí a časování syncu.
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
  2. = AI PC z `PCYoutubeborce.md` (Dell T5810 + 2× Tesla P100) – dnes všechny pohledy (viz sekce níže). Přepnutí projektu ukládá stav enginu + hierarchii + pohled (App `savedProjects`).
- ECONOMIC view (`views/EconomicView.jsx`): díly z kusovníku `engine/economic/catalog.js` (`dims` mm + `dimsSrc`
  ověřeno/odhad); ceny se počítají JEN ze skutečných nabídek v `engine/economic/offers.js` (rešerše 10. 11. 2026,
  přímé URL produktů/inzerátů, `verified` fetched/snippet, kurz ČNB 9. 11.; `alt` = jen alternativa, nepočítá se).
  Test zakazuje vyhledávací URL. Modely v mm `views/economic/models.js` (zdroje rozměrů v hlavičce souboru)
  (čipy NV1 přes `buildRealPart` z boardScene), rozložení `economic/layout.js` (vysoké díly dozadu).
  Electron otevírá odkazy přes `shell.openExternal` (setWindowOpenHandler).
- Rozhodnutí: sestava PC = varianta z videa + kritické doplňky z dokumentu (Add2PSU, EPS redukce, chlazení, pasta,
  P12); alternativy (Ryzen, P40, 3060) nejsou. NV1 kusovník = jednotlivé součástky + monitor/repro/pad (bez host PC).
- Pasti: `window.__eco` (DEV) = stav 3D scény pro screenshoty; v node testech musí mít importy přípony `.js`.

## ANATOMY view (test, 2026-11-10)
- Návrh uživatele: kit https://github.com/wheresryan22/anatomy (MIT) jako test dalšího pohledu – malé díly ve velkém
  výkresu bez přepínání. `src/vendor/anatomy/iso-kit.js` = beze změny `kit/iso-kit.mjs` (commit 1482e84), README tamtéž.
  Výkres `src/views/anatomy/figures.js` (čistý, testy `tests/anatomy.test.js`), UI `views/AnatomyView.jsx`.
  3D režim (výchozí): `anatomy/scene3d.js` + `Anatomy3D.jsx` – modely z economic/models.js, `orient` u dílu =
  kam míří osy modelu (X, Y, Z) v osách sestavy; sestava (x, y, z↑) → three (X = x, Y = z, Z = -y).
- PC sestava: polohy uvnitř T5810 jsou odhad (sloty po 20,32 mm, deska, vestavěný zdroj, chladič); limit 312 mm a
  kolize krytu+9733 s držákem karet jsou zvýrazněné červeně. Kamera kitu: divák na +x +y, z nahoru.
- Fakta z rešerše videa (popis + storyboard): autor používá "ducted fan shroud", 2. zdroj mimo skříň, teploty 61/53 °C;
  přesný ventilátor ani zavřená skříň nejsou ověřené. Konektory ventilátorů T5810 jsou proprietární → ventilátory
  napájí SATA PWM regulátor ModDIY TD404 (60 W), ne deska ani Y-rozbočovač (2× BFB1012VH = 3,0 A podle datasheetu Delta, 3,6 A podle štítků).

## Schémata AI PC (2026-11-10)
- L1 `engine/presets/pcPower.js` (projekt 2 má teď `circuit` = PC_POWER, pohled SCHEMATIC), modely
  `engine/devices/pcBuild.js` (sítě ve voltech, netNames → plátno ukazuje V / % / ot/min), L2 `engine/pcSubcircuits.js`
  (registrované do H v hierarchicalSubcircuits.js). Typ `PC_BLOCK` = popisný blok z veřejného blokového schématu (terminál).
  Testy `tests/pc_power.test.js`. Rešerše pinoutů (scratchpad agenta): redukce 030-0571-000 podle PB-08248 obr. 4.
- OVĚŘENO (manuál Dell obr. System Board Components): sloty shora 1 (x8, half-length), 2, 3, 4, 5, 6 PCI + mechanický.
  P100 ve 2 a 4 zakryjí 3 a 5 → jen slot 1. ROZHODNUTO (uživatel: „udělej to jak to má týpek ve videu“): K620 ve slotu 1,
  disk = Samsung 870 EVO 1 TB SATA v šachtě (M.2 redukce + NV3 z kusovníku i schémat odstraněny).
- Napájení jako ve videu: G1 ze zdroje Dellu 2× PCIe 6 pin (PSU extended card) přes W1, PSU2 jen G2 (+ ventilátory).
- Hloubka: `engine/pcDeepSubcircuits.js` (L3–L5: gp100_die, gp100_sm, xeon_die, haswell_core, rdimm_module, ddr4_chip,
  sata_ssd, k620_board; ddr4_cells = derivát dram_cell_array bez MUXu). Příklady FULL_ADDER / D_FF na L4 vedou
  na existující L5–L8. PSU L3 (psu_primary/secondary/standby) = díly sourozence GX-750 ATX3 (Cybenetics), u GX-650 ATX 3
  ověřeno jen full-bridge LLC, bulk 330 µF, filtr, OVP.
- CEM 3.0: B1 je 45,65 mm od zadní hrany desky (modely karet opraveny). Dell PSU má jen 2× 6pin (přes extended card).
- Zkrat při PCIe kabelu do EPS: X stáhne i druhou kartu (společná zem desky přes sloty) – fyzikálně správně.

## Projekt MŮJ PC (2026-11-10, 1. fáze)
- Uživatelův vlastní PC z diagnostiky Windows: `projects.js` id `mypc` (3. karta), `circuit: null`, pohledy ECONOMIC + ANATOMY.
  Kusovník `MY_PC_ITEMS` + `B360_LAYOUT` (polohy z manuálu E13832 ±2 mm) v catalog.js, nabídky `my_*` v offers.js.
- Odhady (skříň Endorfy Signum 300 Air, zdroj Vero L5 600 W, chladič E97379-003, myš, mikrofon) jsou v `../MujPC_odhady.md`
  – uživatel je chce časem opravit. USB audio 0D8C:0134 je MIKROFON (jen záznamový endpoint), ne sluchátka.
- Nové modely v models.js: atxBoard (osa u = −Z, jinak by deska byla zrcadlově!), atxCase, gpu, udimm, m2ssd, boxCooler,
  keyboard (KB_ROWS 104 kláves), monitor, mouse, usbMic; psu/fan120/cpu dostaly parametry (marking, modular, ihs).
- ANATOMY: `ASSEMBLIES` ve figures.js (p100pc, mypc), `p.box` = deska skříně, `model.camera` = směr kamery 3D (mypc zepředu).
- 2. fáze HOTOVÁ: L1 `presets/myPcSystem.js` (simulované: tlačítko → Super I/O → PS_ON# → zdroj → PWR_OK → VRM → PLTRST# →
  POST jen s RAM → DMI/PCIe → GPU (oba 8 piny) → HDMI → monitor; M.2_2, USB, ventilátory), modely `devices/myPc.js`
  (MYPC_*), L2–L4 `engine/myPcSubcircuits.js` (deska, B360, cfl_die, cfl_core, GPU deska, GA104, ampere_sm, zdroj, SSD,
  Phoenix, Fury modul, DDR4 8Gb x8 → ddr4_cells, ventilátor, monitor, klávesnice s maticí z hradel, myš, mikrofon).
  Helpery c/blk/inp/probe/w/adderExample jsou exportované z pcDeepSubcircuits.js; `nameNets` z pcBuild.js.
  Popisek sítě s napětím musí začínat „+číslo“ (theme.js), proto VCORE = '+1,2V VCORE'. Testy `tests/my_pc.test.js`.
- „Až úplně dolů“: knihovna simulovaných buněk `cell_*` v myPcSubcircuits.js (buck z NMOS, serdes 4:1, sram latch, decoder,
  match, arbiter, mac, parity, lt komparátor/PWM, tft pixel, aps pixel, quad, toggle, pwrbtn) + tabulka `DRILLS` na konci
  souboru = drill každého funkčního PC_BLOCKu (i na NV1 obvody: pci_target, sigma_delta, eprom_array, crtc, ramdac_datapath,
  dram_cell_array). Bez drillu jen pasivní díly (seznam PASSIVE v testu). Pravidlo: L5 obvod smí obsahovat jen základní
  hradla / tranzistory (MUX ani D_FF v L5 = slepá ulička, nemají *_cmos); L4 smí D_FF/MUX/FULL_ADDER.
- PCB + DIE 3D pro MŮJ PC: `engine/myPcLayout.js` (MB obdélník 221 × 305 mm, u → x, v → y; ON_BOARD, HW_POS = x/y v presetu,
  HW_PINS → `hwPins` zařízení = pevné vývody v pohledu PCB, `myPcBoard()` pro router, `boardKindOf`). 2D: `drawMyPcBoard`
  (boardDraw.js, z B360_LAYOUT), pouzdra LGA1151/UDIMM/PCIe x16/M.2 2280, deska `mb` se nekreslí (je podklad, klik = drill).
  `comp.offBoard` (spínač, sondy) = kabel. 3D L1: `views/physics/myPcScene.js` (modely z ECONOMIC; grafika natočená makeBasis,
  kabely jen mimo desku, k sondám ne). `sub.scene` ('board' u L2 zařízení, 'die' u čipů L3) přebíjí druh 3D scény podle úrovně.
- Uživatel: „vymýšlíš“ → tranzistory podle skutečného procesu: `sub.process` nejbližšího předka vybere `${NMOS|PMOS}_${process}`
  (findSubcircuit, processOf): cfl_die/b360_pch 'intel14' (IEDM 2014 + 14++ CPP 84), ga104_die 'samsung8n', cell_buck 'power'
  (trench se shield gate), cell_tft 'tft' (a-Si:H), L2 mého PC 'unknown' (princip, proces nezveřejněn); NV1 bez procesu = 0,5 µm.
  Data `engine/processSubcircuits.js` (L7 + L8 hkmg/sio2_gate/asi_sinx), pod atomy `engine/particleSubcircuits.js`
  (L9 atom_X, L10 nucleus_X, L11 proton/neutron = konec). MAX_LEVEL 11. 3D `views/physics/deepScenes.js` (finfet v jednotkách
  10 nm, trench µm, planar, lattice Å, atom, nucleus fm, nucleon). Test procházení stromu dedupluje podle (klíč, proces).
- 3D čitelnost (`views/physics/viewQuality.js`): GTAO + OutputPass kompozitor ve všech 3D pohledech (DIE 3D, ECONOMIC,
  ANATOMY), v DIE 3D obrysy hran (`addEdges`) a `fitView` (kamera podle rohů obálky, světla/stíny/mlha/mřížka/near/far podle
  velikosti scény; stůl `userData.desk` se nepočítá). Moderní čipy mého PC = `scene: 'flipdie'` → `buildFlipDie` (substrát,
  BGA/LGA, die bez drátků; PACKAGES v siliconScenes.js, rozměry die mimo i7/GA104 odhad). three 0.187 nemá PCFSoftShadowMap.
- AI PC až dolů: `engine/aiPcDepth.js` (DRILLS bloků, gm107_die L4, scene/process marks: gp100 tsmc16, xeon intel22, gm107
  tsmc28, ddr4_cells dram), L1 3D `views/physics/aiPcScene.js` (sestava z ANATOMY 3D namapovaná na součástky PC_POWER).
  Nové L7: intel22, tsmc16, tsmc28 (planar), NMOS_dram (BCAT, planar recess), NMOS_vnand (scene 'vnand'); L8 ono_lattice,
  cu_lattice; cell_nand (V-NAND řetězec), cell_eeprom (SPD/EDID/BIOS). Měď: CONN_*/RELAY + COPPER_BLOCKS → cu_lattice → atom_cu.
  Pouzdra flipdie: xeon (LGA2011-3), gp100 (CoWoS + 4× HBM2), gm107, ddr4_chip. Testy tests/ai_pc.test.js.
- PAST: v PowerShellu `'a' + $x + 'b', 'c'` – čárka váže víc než + → rozbité JSON kroků pro shot.cjs (Electron pak visí).
- PAST: PowerShell `Get-Content -Raw` čte UTF-8 bez BOM jako cp1250 → rozbije diakritiku. Používat [IO.File]::ReadAllText.

## PLAN_PROJEKTU.md – co je a není hotové (2026-11-11)
- Plán je vize (Tauri/Rust/WebGPU), ne seznam úkolů. ROZHODNUTO: stack zůstává React + Electron + JS engine; z plánu se
  doplňuje jen funkce. `core/` (Rust SoA) je mrtvý prototyp, aplikace ho nepoužívá.
- Doplněno 11. 11.: primitiva `MULTIPLIER_8BIT`, `BARREL_SHIFTER_8BIT`, `FPU_HALF` (binary16 přes Float16Array),
  `MMIO_DECODER` (0xF000–0xFFFF), `IRQ_CONTROLLER`, `DMA_CONTROLLER`; `VIRTUAL_SCREEN` má `cols/rows/colorMode`
  (MONO / INDEXED8 / RGB565) a výstupy hsync/vsync (skener = 1 pixel na takt); kreslí ho `views/canvas/screen.js`
  (2D i 3D). Sonda: klik přepíná DEC/HEX/BIN/ASCII (`comp.format`). Tab = SCHEMATIC ↔ DIE 3D. Lišta: ½ STEP a CYCLE.
  Testy `tests/plan_blocks.test.js`.
- Z plánu NENÍ: RC zpoždění hran, 2D difuze tepla + bitové chyby z přehřátí, WebGPU/SDF dráty, JIT/bit-slicing,
  Monaco, editace RAM za běhu, měření zpoždění ve waveformu, skutečný AI copilot (aiCopilot.js = klíčová slova → presety).
- Past: Bash nástroj tu startuje 30–120 s → používat PowerShell. Skripty, které přepisují soubory, musí zachovat CRLF
  (Toolbar.jsx, boardLayout.js, LogicCanvas.jsx jsou CRLF).

## Review přesnosti (2026-11-11) – co je opraveno a co ZBÝVÁ
- Zdroj č. 1 pro kartu: datasheet SGS-Thomson STG2000, září 1996, 81 stran:
  https://geforcewww.vgamuseum.info/images/doc/st/stg2000_sep96.pdf (text jde vytáhnout přes pypdf). Fotka karty:
  https://www.vgamuseum.info/images/palcal/diamond/588_diamond_edge_3d_2120_top_hq.jpg
- OPRAVENO: kodek taktuje ACLK z RAMDACu (Y2 24,576 MHz na kartě není → odstraněn i z kusovníku a nabídek), refresh
  776 MCLK, PCI 2.0, 2120 = 1 MB + 2 patice (model = rozšířená na 2 MB), popisy u dílů říkají, kde se model liší.
- ZBÝVÁ PŘEDĚLAT v `nv1Card.js` + `nv1Board.js` + L2 v `hierarchicalSubcircuits.js` (velké, každé mění zapojení i testy):
  1. Paměť: 32bit `MD[31:0]`, `MA02[8:0]`/`MA13[8:0]`, `CAS02[3:0]#`/`CAS13[3:0]#`, `WE03#`/`WE12#`, `OE0–3#`, 1× `RAS#`,
     dvě prokládané banky (datasheet s. 6, 19–22); 64 bit má jen pixelový port DAC přes „silicon switch“ (`EN64`).
  2. Pixely: z `MD` rovnou do Palette-DAC (`LOADCLK`, `BLANK#`, `DACCS#`); registry DAC po `MD[15:8]`. Zrušit `P[14:0]`.
  3. BIOS ROM na `MD[7:0]`, adresa `MD[30:16]`, `ROMCS#` 13·T_MCLK − 5 ns (s. 7, 30–31). Zrušit piny `rom_*`.
  4. PCI: header 0x80; funkce 0 VGA `104A:0008` třída 0x030000 bez BAR; funkce 1 `104A:0009` třída 0x048000, BAR0 32 MB
     prefetch (maska 0xFE000000), bus master; ROM BAR maska 0xFFC00001; INTERRUPT_LINE po resetu 0xFF (příloha A).
     Pozor: envytools uvádí 0008/0009 obráceně – řídit se datasheetem.
  5. Kodek: `AUD[7:0]`, `AUA[1:0]`, `AUW#`, `AUR#`, bez DRQ/DACK (s. 37, obr. 30).
  6. Game port: přes Palette-DAC + čip „SEGA interface ASIC“ (nVSGP), headery J5/J6 2×5, zvláštní bracket; modulární
     zásuvka na bracketu = PC joystick/MIDI (RJ-45 vs RJ-50 se zdroje liší).
  7. Časování DRAM podle tab. 3: tRCD 2T−5, tRAC 3T−2, tPC 2T−2, tRP 2,5T−2, tRC 6T−5 (model čte za 2 takty).
  8. Do čipu jde `MCLKx2` (100 MHz), ne 50 MHz.
- NEOVĚŘENO, stojí jen na fotce jednoho kusu: krystal 12,096 MHz, STG1764X 28 × 28 mm (rozteč 0,8), pořadí konektorů
  na bracketu (zásuvka nahoře, pak DE-15, pak 3 jacky), délka jazýčku PCI 78,74 mm (model 85), potisk U19/U20/U23/U24.
  Chybí na desce: SEGA ASIC, EEPROM 93C46, stabilizátor 3,3 V, 2× OZ, CD audio J4/J12.
- AI PC: Seasonic Core GX-650 ATX 3 má JEDEN PCIe kabel (2× 6+2) + 12V-2x6; BFB1012VH 1,5 A (datasheet); PB-08248
  tab. 8 chce 6pin kabely na 120 W; Add2PSU originál = Molex (Dell má SATA → redukce). Neověřeno dál: tloušťka P100,
  štítek RDIMM (RC1 odvozeno z raw card C), DMI2 x4, počet vrstev NAND.
- Knihovna: inspektor součástek (ComponentInspectorModal, ComponentSchematicCanvas, componentDetails.js) byl mrtvý kód
  s chybami → smazán commitem f975c4c (vrátí ho `git revert f975c4c`). Konvence enginu: nikdy nezapojený vstup čte
  výchozí hodnotu z PRIMITIVE_PINS, odpojený drát se na ni vrací, plovoucí síť (odpojený třístavový budič) = Z → hradla X.
  Smazaná ROM čte 0xFF, VIRTUAL_SCREEN bere jen tolik bitů souřadnice, kolik potřebuje (64 → 6). `verifyCircuit`
  v aiCopilot.js opravdu simuluje (ustálení + zkraty), funkci neověřuje. Assembler hlásí chyby rozsahu (LDI jen 0–3).
- Nedořešeno z review knihovny: SR latch po zakázaném stavu skončí 1/1 místo X; DEMUX nemá drill-down;
  primitivní FULL_ADDER je s X pesimističtější než hradlový model.
## Další kroky / známé vady
- Nabídky stárnou (inzeráty z Bazoše zmizí) – při další
  práci přerešeršovat. eBay/Alza/Heureka blokují stahování (403): jejich ceny jsou jen z výpisu vyhledávače.
  NV1 a STG1764X se dnes neprodávají (jen celé karty ~16–23 tis. Kč). Odhady rozměrů: čelo Dellu ±5 mm, IHS Xeonu,
  poloha kontaktů PCIe od záslepky, MX-6, periferie NV1, tloušťka P100 (37 mm).
- Rychlost: ~3 µs na hranu; profil ukazuje režii v `_settle`/`step` + modely čipů. Vyzkoušeno bez efektu:
  rychlá cesta pro sestupné hrany, pole místo Set. Další nápad: Web Worker nebo jemnější sensitivity listy.
- Breadcrumb/HUD ve 3D na hlubokých úrovních přetéká; na L2 schématu se překrývá blok PCI TARGET s pady.
- Pin vývody na pouzdrech = konvence (vstupy vlevo, výstupy vpravo), ne skutečný pinout; cesty nejsou layout Diamondu.
- Lint: jen stará varování v LogicCanvas (refs during render, deps).

## Rozhodnutí a poznámky
- Co je model, ne kopie čipu: registrová mapa NV1 (CRTC/audio/gameport) je vlastní, skutečný NV1 měl
  nezdokumentované objektové rozhraní; 3D kvadratický engine NV1 se nesimuluje (obraz kreslí host CPU);
  frekvence krystalu, poměry PLL, pouzdro RAMDACu a floorplan die jsou předpoklady. Ověřeno datasheetem STG2000
  (viz sekce Review přesnosti): 0,5 µm, 3 vrstvy kovu, 3,3 V, PQFP-208, PCI 2.0, 4× 256K×16, FPM, ROM 32K×8.
  1M tranzistorů / 90 mm² / 75 MHz mají jen sekundární zdroje (Wikipedie, vgamuseum; J. Peddie píše ~250 tis.).
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
- 2026-11-10 15:12 — „velikost P100 a vejde se do Dellu? ventilátory? zkontroluj 3D model; návrh repa anatomy jako test view“
  → P100 se vejde (267/312 mm), s krytem 9733 ne; TD404 místo rozbočovače; opravené lopatky ventilátorů; ANATOMY test
  view s kitem Anatomy; 126/126 testů.
- 2026-11-10 15:27 — „3D pohled pro anatomii, pak schémata dílů PC“ → ANATOMY 3D (modely v sestavě, rozložení,
  čísla), logo P100 čitelné po instalaci; schémata rozpracována (rešerše pinoutů běží).
- 2026-11-10 15:40 — pokračování: schéma napájení PC L1 + 6 podobvodů L2 podle veřejných pinoutů, 138/138 testů.
- 2026-11-10 16:05 — „řeš neověřené/rizikové, pak schémata do hloubky“ → 3 rešerše (sloty, teardowny, architektury),
  opravy (CEM kontakty, sloty v ANATOMY, Add2PSU bez diody, TD404 = 555 odhad, PSU díly), L3–L5 GP100/Xeon/DDR4/M.2/SSD,
  knoflík regulátoru klikem; 150/150 testů.
- 2026-11-10 16:26 — „rozhodni jak ve videu, pokračuj v neověřeném“ → napájení G1 z Dellu (2× 6 pin), SATA SSD 870 EVO
  místo NVMe (nabídky, model, L3), K620 L3, IHS Xeonu podle Intel TMSDG; 151/151 testů.
- 2026-11-10 19:56 — „detailní dokument o dnešní práci + vše na GitHub“ → docs/PRACOVNI_DENIK_2026-11-10.md, odkaz v README.
- 2026-11-10 — „diagnóza tohoto PC, nový projekt můj PC: ekonomika + přesné 3D modely, schémata až potom“ → projekt mypc,
  4 rešerše (GPU/CPU, deska/RAM/SSD, periferie, skříň/zdroj), 12 položek s nabídkami, ANATOMY sestava, MujPC_odhady.md; 153/153 testů.
- 2026-11-10 — „celé schéma každé komponenty“ → 3 rešerše (deska/B360/CPU, GPU/GA104/monitor, zdroj/SSD/RAM/periferie),
  L1 simulované schéma PC + 20 podobvodů L2–L4 navázaných na hradla/tranzistory/atomy; 179/179 testů.
- 2026-11-10 — „pokračuj, ještě to není až úplně dolů“ → 15 simulovaných buněk, každý funkční blok mého PC vede až na atomy
  (test prochází celý strom); 195/195 testů.
- 2026-11-11 10:08 — „pokračuj podle plánu, pak review všech projektů a součástek“ → bloky z plánu §4.3–4.4 (násobička, rotátor, FPU, MMIO, IRQ, DMA, režimy monitoru + sync), formáty sondy, Tab, CYCLE; pryč falešná animace „NV1 60 FPS“.
- 2026-11-11 12:25 — review (3 nezávislé kontroly se zdroji) → opravy knihovny, AI PC a karty NV1 podle datasheetu STG2000; mrtvý inspektor smazán; velké přestavby karty sepsané v sekci Review přesnosti.
- 2026-11-11 13:05 — „vyřeš konflikt a dej to do mainu“ → rebase na 8f1587a (MŮJ PC, L1–L11), konflikty aiCopilot.js / models.js / AgentMEMORY vyřešeny, 257/257 testů.