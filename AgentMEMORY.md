# AgentMEMORY — HW (Silicon Logic Studio)

Aktualizováno: 2026-11-11 19:02

## Cíl repa
Desktopový simulátor hardwaru (React 19 + Vite + three.js, Electron) v `silicon-logic-studio/`. Hlavní obvod je
skutečná karta Diamond Edge 3D 2120 (NVIDIA NV1 / SGS-Thomson STG2000X, 1995), kterou jde proklikat od desky
až k atomům (8 úrovní) ve 2D (schéma, PCB) i 3D. Uživatel chce: vzhled jako jeho portfolio (`../Portfolio`),
vizualizace co nejpřesněji podle skutečného HW, spoje jako reálné zařízení (ne jen schéma).

## Stav a jak spustit
- `cd silicon-logic-studio && npm install && npm test` (node --test, ~290 testů, ~10 s), `npm run build`.
- Pravidla repa (commit + push po každém kroku) jsou v `../CLAUDE.md`.
- Vývoj: `npx vite --port 5287 --strictPort` (port 5199 bývá obsazený portfoliem!).
- Vizuální kontrola bez okna: `SHOT_URL=http://localhost:5287/ npx electron tools/shot.cjs <steps.json> <outdir>`
  (okno `show:false`, `SHOT_SIZE=1280x800`; helpery `__view('SCHEMATIC'|'PCB'|'DIE 3D')`, `__dbl(x,y)`, `__crumb()`,
  `__active()`, `window.__errs`; v DEV i `window.__engine`, `window.__three`, `window.__slsCanvas`).
  Uživatel NECHCE, aby se mu aplikace otevírala – nikdy `npm run desktop` ani viditelný prohlížeč.
<<<<<<< HEAD
- Rychlost simulace karty (měřeno 11. 11., kolísá podle zátěže stroje): 317 kroků na µs simulovaného času (z toho 200 jsou hrany MCLKx2 100 MHz),
  ~2,5 ms reálného času na µs → jeden snímek 640×480 (16,7 ms) trvá ~42 s. Testy proto používají malý video režim `TINY`
  + `monitor.modes`. `TINY` = htotal 64, hdisp 32, hss 44, hse 52: přední zatemnění MUSÍ být delší než zpoždění
  Palette-DAC (8 bodů), jinak HSYNC usekne konec řádku. Stejné konstanty jsou v testu i v `Nv1DiagnosticModal.jsx`.
- ROZHODNUTÍ UŽIVATELE (11. 11.): věrnost před rychlostí – „je jedno, jak dlouho to bude trvat, hlavní je, aby to
  opravdu a správně simulovalo realitu“. Každá hrana hodin (i sestupná, na kterou nikdo nereaguje) má v `step()` vlastní
  krok. Zkoušel jsem je slučovat s další událostí (snímek za 19 s), ale 100MHz takt pak při krokování a v analyzátoru
  vypadal jako trvale v jedničce → vráceno, hlídá to test „every edge of the 100 MHz memory clock is visible“.
  Žádné zkratky v `step()` nezůstaly (příznak `silent` jsem zase odstranil – DAC potřebuje hrany MCLK pro časování čtení registrů).
- Opravy z nezávislé kontroly (11. 11.): monitor počítá bod jako 1/`hTotal` změřené periody řádku (ne z `pclk` – karta
  vysílá 25,2 MHz, tabulka VESA má 25,175 → ve 640×480 byla pravá část obrazu o bod vedle; režimy monitoru mají `hTotal`);
  cíl PCI pozná klid sběrnice (FRAME# i IRDY# nahoře) a transakci zahodí; ROM se při obraze čte jen když do konce
  zatemnění zbývá aspoň půl řádku; požadavek na pixely je objekt té karty (dřív sdílený mezi dvěma kartami);
  DAC při čtení registru zapne výstupy podle času (2 hrany MCLK po DACCS#), ne podle „plovoucí“ sběrnice.
- ZNÁMÉ OMEZENÍ: `BUS_SWITCH_32` pozná směr podle toho, že strana není buzená (Z). Když je v obvodu s kartou jakýkoli
  tranzistor NMOS/PMOS, engine přejde na spínačové řešení sítí, kde nebuzená síť drží náboj a nikdy není Z → spínač
  (čtení banky 1) nefunguje. Správné řešení = skutečný průchozí spínač v enginu (zařízení deklaruje spojení sítí), neuděláno.

## Hotovo (2026-11-10)
- Nové jádro `src/engine/logicEngine.js`: dráty = vodivé sítě (union-find), obousměrné piny, tri-state,
  zkrat = 'X', plovoucí = 'Z' (NE 2/3 – stará chyba: sběrnicová hodnota 2 se brala jako Z), pull-upy,
  pasivní konektory (`joins`), NMOS/PMOS na úrovni spínačů s držením náboje, víc nezávislých hodin
  v simulovaném čase (ns), `wireValue/wireWidth/wireLabel/pinValue`, `setFrequency(Infinity)` = MAX.
- Modely součástek `src/engine/devices/nv1Card.js` (+ registry `devices/index.js`): host PC posílá skutečné PCI
  transakce (dvě funkce 104A:0008 / 0009, BAR0, ROM 55AA s kontrolním součtem), NV1 = PCI target + FIFO + řadič sběrnice MD
  + CRTC + 32hlasá syntéza → AD1845; 4× DRAM 256K×16, STG1764X, EPROM, spínač, nvSGP, konektory, monitor skládá obraz jen
  z napětí a časování syncu. Zapojení a časování od 11. 11. podle datasheetu – viz sekce „Karta NV1 podle datasheetu“.
- Preset `src/engine/presets/nv1Board.js` (x/y = PCB 3,7 px/mm, sx/sy = schéma). Rozměry pouzder a obrys karty
  v `boardLayout.js`. 5V klíč PCI je na kontaktech 50/51 (pin 1 u bracketu), jazýček 79,14 mm.
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
- PAST: na stroji běží cizí procesy node (vite projektu REA_webs žere CPU, dva zaseknuté `shot.cjs` z 10. 11.) – testy pak
  trvají minuty místo 10 s. Nezabíjet bez domluvy s uživatelem, jen s tím počítat u timeoutů.
- PAST (znovu se stala 11. 11.): české uvozovky v řetězci v uvozovkách "…" rozbijí celý PowerShell skript. Český text
  jen do @'…'@ nebo nástrojem Edit.

## PLAN_PROJEKTU.md – co je a není hotové (2026-11-11)
- Plán je vize (Tauri/Rust/WebGPU), ne seznam úkolů. ROZHODNUTO: stack zůstává React + Electron + JS engine; z plánu se
  doplňuje jen funkce. `core/` (Rust SoA) je mrtvý prototyp, aplikace ho nepoužívá.
- Doplněno 11. 11.: primitiva `MULTIPLIER_8BIT`, `BARREL_SHIFTER_8BIT`, `FPU_HALF` (binary16 přes Float16Array),
  `MMIO_DECODER` (0xF000–0xFFFF), `IRQ_CONTROLLER`, `DMA_CONTROLLER`; `VIRTUAL_SCREEN` má `cols/rows/colorMode`
  (MONO / INDEXED8 / RGB565) a výstupy hsync/vsync (skener = 1 pixel na takt); kreslí ho `views/canvas/screen.js`
  (2D i 3D). Sonda: klik přepíná DEC/HEX/BIN/ASCII (`comp.format`). Tab = SCHEMATIC ↔ DIE 3D. Lišta: ½ STEP a CYCLE.
  Testy `tests/plan_blocks.test.js`.
- Doplněno 11. 11. odpoledne: editace paměti za běhu (`components/MemoryEditor.jsx`, ukáže se u vybrané RAM/ROM ve SCHEMATIC/PCB)
  a měření v logickém analyzátoru (`WaveformViewer.jsx`: kurzory A/B, `engine.waveformTimes`/`waveformCount`, `findEdge`).
  Analyzátor vzorkuje jednou za krok STEP nebo jednou za snímek při běhu, takže Δ mezi kurzory je přesná jen při krokování.
- Z plánu NENÍ a nebude (rozhodnuto): RC zpoždění hran, 2D difuze tepla + bitové chyby z přehřátí, WebGPU/SDF dráty,
  JIT/bit-slicing, Monaco, skutečný AI copilot (aiCopilot.js = klíčová slova → presety).
- Past: Bash nástroj tu startuje 30–120 s → používat PowerShell. Skripty, které přepisují soubory, musí zachovat CRLF
  (Toolbar.jsx, boardLayout.js, LogicCanvas.jsx jsou CRLF).

## Karta NV1 podle datasheetu (přestavba hotová 2026-11-11)
- Zdroje: datasheet STG2000 (září 1996) https://geforcewww.vgamuseum.info/images/doc/st/stg2000_sep96.pdf (text přes pypdf),
  datasheet STG1732/64, XFree86 3.3.6 `nv1driver.c`, envytools pdac, PCI 2.1; fotka karty
  https://www.vgamuseum.info/images/palcal/diamond/588_diamond_edge_3d_2120_top_hq.jpg. Odkazy a ověřená fakta jsou
  v `docs/PLAN_DOKONCENI_2026-11-11.md` (kap. 4); kap. 3 toho plánu je HOTOVÁ (její 3.1 má omyl o FIFO, platí nový plán), skript `docs/rozpracovano` je smazaný.
- Model (`nv1Card.js`): NV1 běží na `mclkx2` (100,07 MHz, 1 tik = 10 ns), 32bit MD jako dva 16bit řezy `md_lo`/`md_hi`,
  banka 0 (dram0/1 = U19/U20) na MD, banka 1 (dram2/3 = U23/U24) na SDB za `BUS_SWITCH_32` (4× PI5C3245Q jako jedna součástka,
  `en64` = 1 jen při načítání pixelů). Pozdní zápis DRAM (WE# padá při CAS# dole). Pořadí obsluhy: pixely → refresh →
  registry DAC → ROM → čtení → zápis; ROM jen při vypnutém CRTC nebo ve vertikálním zatemnění.
- Palette-DAC: krystal 12,096 MHz, `pll` = { dot 12/100/4, mclkx2 11/91/1, aclk 8/65/4 }, f = fref × N / (M × P), `pllHz()`;
  VCLK = dot / 4 si dělá sám; zásobník 2 slova (8 pixelů), nuluje ho 0-1-0 na BLANK# (NV1 ho posílá na začátku vertikálního
  zatemnění, `vid.sync` = DAC už je prázdný, smí se načítat); slovo odebírá 2 VCLK po BLANK# → monitor `hpos = -8`.
  Registry: přímé 4/5 = index, 6 = data s autoinkrementem; 0x300 Saturn port A (bit 6 SELECT[0] = TH, bit 5 SELECT[1] = TR, 3:0 data), 0x301 režim (NV1 píše 0x1F).
- Game port: `ramdac.gp_sel` → `SEGA_ASIC` (nvSGP, průchozí, terminál hierarchie) → `SEGA_HEADER` J5 → pad; J6 a zásuvka P1 nezapojené.
- Rozmístění na desce je odměřené z fotky: model_x = 88 + foto_x × 0,4273, model_y = 32,4 + foto_y × 0,4273 (foto 1600 px,
  horní okraj fotky je oříznutý o ~3 mm). DRAM leží vodorovně, BIOS (U12) stojí svisle, RAMDAC 31,2 × 31,2 mm.
- Co fotka ukazuje a model NEMÁ: DRAM jsou Hyundai HY514260B (JC-70 připájené, JC-60 v paticích) – model má obecné
  256K×16; stabilizátor LM2941CT (U18, TO-220 naležato vpravo dole), U35/U36 (dvě širší pouzdra mezi zásuvkou a RAMDACem),
  EEPROM 93C46, 2× OZ, CD audio J4/J12; levý dolní roh desky sahá níž (jacky jsou proto v modelu o 2–3 mm výš).
  Nesimuluje se zachycení MD[7:0] při RST#. Označení U1/U2 a pořadí jacků nemají spolehlivý zdroj (kodek je U6 – čitelné na zvětšené fotce).
- Kusovník: nové položky `busswitch`, `nvsgp`, `hdr2x5`, `xtal_12` (`xtal_14` zrušen).

## DALŠÍ KROK – ZAČNI TADY: `docs/PLAN_VERNOST_NV1_2026-11-11.md`
Uživatel 11. 11. potvrdil („jo, zapiš to do plánu a na další session“), že příští session má kartu NV1 předělat věrně
podle zdrojů. Plán obsahuje: odkazy na zdroje a jak z nich dostat text, ověřená fakta po stránkách (oba datasheety,
envytools, fotka), tabulku „model vs. skutečnost“, 8 kroků s kritériem hotovo a seznam toho, co zdroje neříkají.
- Jádro věci: FIFO v STG1764 má slova po 128 bitech se zpožděným zápisem a plní se dávkami (ne „128 bitů celkem“, jak
  stálo ve starém plánu a jak je to dnes v modelu); zpoždění DAC je 3 VCLK + 15 bodů + 7 ns; skutečné registry jsou PFB
  (0x600000) a PDAC (0x609000), model má vlastní; Saturn pad čte ve skutečnosti ovladač přes GPIO v DAC.
- Krok 0 plánu (NEUDĚLÁNO): přečíst ovladač XFree86 3.3.6 `nv1driver.c` – jednotky registrů, dělič VCLK, srovnání syncu,
  poloha framebufferu v BAR0. Bez toho kroky 1–4 nezačínat.
- Texty zdrojů jsem měl jen ve scratchpadu session (do repa nepatří) – stáhnout znovu, návod je v plánu.
- PAST: `[IO.File]::ReadAllText` bere relativní cestu od adresáře procesu, ne od `Set-Location` → dávat absolutní cesty.
## Review ostatních projektů (2026-11-11)
- Rozhodnutí: bitové chyby z přehřátí, RC zpoždění, WebGPU/JIT/Monaco a skutečný AI copilot se NEDĚLAJÍ (důvody v plánu).
- AI PC: Seasonic Core GX-650 ATX 3 má JEDEN PCIe kabel (2× 6+2) + 12V-2x6; BFB1012VH 1,5 A (datasheet); PB-08248
  tab. 8 chce 6pin kabely na 120 W; Add2PSU originál = Molex (Dell má SATA → redukce). Neověřeno dál: tloušťka P100,
  štítek RDIMM (RC1 odvozeno z raw card C), DMI2 x4, počet vrstev NAND.
- Knihovna: inspektor součástek (ComponentInspectorModal, ComponentSchematicCanvas, componentDetails.js) byl mrtvý kód
  s chybami → smazán commitem f975c4c (vrátí ho `git revert f975c4c`). Konvence enginu: nikdy nezapojený vstup čte
  výchozí hodnotu z PRIMITIVE_PINS, odpojený drát se na ni vrací, plovoucí síť (odpojený třístavový budič) = Z → hradla X.
  Smazaná ROM čte 0xFF, VIRTUAL_SCREEN bere jen tolik bitů souřadnice, kolik potřebuje (64 → 6). `verifyCircuit`
  v aiCopilot.js opravdu simuluje (ustálení + zkraty), funkci neověřuje. Assembler hlásí chyby rozsahu (LDI jen 0–3).
- Nedořešeno z review knihovny: primitivní FULL_ADDER je s X pesimističtější než hradlový model (SR latch → X a DEMUX do hloubky jsou hotové).
## Další kroky / známé vady
- Nabídky stárnou (inzeráty z Bazoše zmizí) – zhruba po měsíci přerešeršovat. eBay/Alza/Heureka blokují stahování
  (403): jejich ceny jsou jen z výpisu vyhledávače. NV1 a STG1764X se dnes neprodávají (jen celé karty ~16–23 tis. Kč).
  Odhady rozměrů: čelo Dellu ±5 mm, IHS Xeonu, poloha kontaktů PCIe od záslepky, MX-6, periferie NV1, tloušťka P100 (37 mm).
- Rychlost: viz „Stav a jak spustit“ (věrnost před rychlostí – každá hrana má vlastní krok). Web Worker by simulaci
  nezrychlil (jen odlehčil UI) → neděláno.
- Pin vývody na pouzdrech = konvence (vstupy vlevo, výstupy vpravo), ne skutečný pinout; cesty nejsou layout Diamondu.
- MŮJ PC: odhady k ověření štítkem (skříň, zdroj, chladič, ventilátory, výrobce čipů RAM/GDDR6X) – `../MujPC_odhady.md`.
- Lint: 0 chyb, 0 varování. Build: hlavní balík 519 kB, three.js v líně načítaném chunku (752 kB).

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
- 2026-11-11 12:32 — „vyřeš konflikt a dej to do mainu“ → rebase na 8f1587a (MŮJ PC, L1–L11), konflikty aiCopilot.js / models.js / AgentMEMORY vyřešeny, 257/257 testů.
- 2026-11-11 13:03 — „dořeš zbytky“, pak „zastav a sepiš plán“ → review MŮJ PC + L7–L11, PCI dvě funkce, kodek PIO, schémata bloků z plánu, ukázka DMA/IRQ; přestavba paměťové sběrnice karty zastavena ve fázi návrhu → docs/PLAN_DOKONCENI_2026-11-11.md; 274/274 testů.
- 2026-11-11 17:19 — „pokračuj s modelováním a dalšími věcmi z plánu“ → přestavba karty NV1 podle datasheetu hotová (sběrnice MD, dvě banky, spínač EN64, pixely do DAC, ROM a registry DAC na MD, game port přes DAC + nvSGP, krystal 12,096 MHz), rozmístění z fotky, 2D/3D/hierarchie/kusovník, engine bez prázdných kroků; 278/278 testů.
- 2026-11-11 17:33 — pokračování téhož zadání → nabídky nových dílů karty (rešerše), kodek = U6, popisy zapnutí MŮJ PC (PCH → SLP_S3# → PS_ON#), z původního plánu editor paměti RAM/ROM a měření v logickém analyzátoru; 280/280 testů.
- 2026-11-11 17:59 — „u step je jedno, jak dlouho to trvá, hlavní je správně simulovat realitu“ → vráceno slučování sestupných hran hodin v `step()`, test na viditelnost každé hrany MCLKx2; 281/281 testů.
- 2026-11-11 18:06 — po pokynu „věrnost před rychlostí“ přečteny celé datasheety STG2000 a STG1732/64 + envytools → opraveny bity Saturn portu a popisy; rozdíly modelu proti skutečnému čipu sepsány v sekci „DALŠÍ KROK“ (FIFO, zpoždění DAC, skutečné registry PFB/PDAC).
- 2026-11-11 18:26 — nezávislá kontrola obou commitů → opraveno 5 nálezů (monitor 640×480, čtení ROM při obraze, klid PCI, sdílený objekt dvou karet, kurzory analyzátoru), 3 nové testy; 284/284 testů, diagnostika v aplikaci 7/7.
- 2026-11-11 19:02 — „zapiš to do plánu na další session a pushni“ → `docs/PLAN_VERNOST_NV1_2026-11-11.md` (fakta ze zdrojů, model vs. skutečnost, 8 kroků), odkaz v paměti, README a starém plánu.
- 2026-11-11 (paralelní session) — „pokračuj podle plánu“ → die shoty (CFL, B360, GP100, HBM2 DRAM + logic, CoWoS interposer) a bloky podle
  fotek v `siliconScenes.js`; CAD jako assety (`?url`) + 2,5" disk z FreeCAD; 3D pohledy líně (`React.lazy`);
  nový 4. projekt `mypc_p100` (můj PC + 2× P100 z AI PC: PCIEX16_1 x16 + PCIEX16_2 x4, iGPU, Add2PSU) se všemi
  pohledy; ověřeno: monitor VA249HE (HDMI), Super I/O NCT6796D, Vcore 1,2 V (LibreHardwareMonitor + PawnIO, obojí
  pak odinstalováno); drobečky ve SCHEMATIC zkracované jako ve 3D; výřez v čele skříně pro P100; rebase na 091d0b4.
  Podrobně v `PLAN_POKRACOVANI.md`.
- 2026-11-11 (paralelní session) — „commitni a pushni po každém kroku (pravidlo v CLAUDE.md), pak schémata do největšího
  detailu až k atomům“ → `engine/unitSubcircuits.js`: 68 konkrétních jednotek místo obecných buněk (UHD 630 + EU, ring/LLC,
  IMC, PCU, System Agent, display, PCIe 3.0/2.0, celý PCH B360 i C612, CSME, RTL8111H, ALC887, USB, Cortex-M0, GPU L2,
  GDDR6X, NVENC, HBM2, NVLink, GPC, SM podjednotky, Tensor/RT Core, x86 front-end/OoO/L1D, Haswell-EP, RCD, MKX, NVMe,
  FTL, NAND, V-NAND, VRM, DRAM banka, SPI flash, BLDC, Super I/O části, PSU řadiče, SPD). Mezistupně úrovní: **L3,5**
  (GPC) a **L4,5** (podjednotky uvnitř L4: Tensor Core, plánovač warpů, x86 front-end …) – dvojklik musí jít vždy
  hlouběji; test hierarchie povoluje násobky 0,5, UI píše „4,5“. Atomy: nové L8 mřížky (krystal kanálu, SiGe, W, BEOL
  W/Cu/SiCOH, kondenzátor DRAM ZrO₂/Al₂O₃, blokovací vrstva V-NAND) a L9/L10 atomy W, Ge, C, Al, Zr. MŮJ PC 87 → 153
  podobvodů, AI PC 70 → 118. Projekt NV1 jsem nechal (paralelně ho dělá jiná session podle datasheetu).
- 2026-11-13 — „Silicon Studio jako web pro všechny moje komponenty, každá vlastní stránka, všechny funkce jako u robotů
  (robots/), u každé napsat, jestli je model podle dokumentace nebo odhad“ → ROZHODNUTÍ UŽIVATELE: web = kopie Studia jen
  s naším hardwarem, desktop zůstává na simulace a interní věci; stránku má každá fyzická součástka; data trhu/dodávek
  z rešerše se zdroji. Web je druhý vstup Vite (`web.html` → `src/web/`, hash router, build `dist/web.html`), sdílí
  engine a pohledy (EconomicView s jednou položkou = 3D + ceny, AnatomyView, LogicCanvas/PhysicsView v `Explorer.jsx`
  s vlastním enginem). Registr `src/web/parts.js` (75 dílů; `model`/`schema` = [doc|partial|estimate|none, poznámka],
  u položek kusovníku se 3D odvodí z `dimsSrc`). Rešerše 5 agentů → `src/web/research/*.js` (75 dílů, každá položka
  URL + `fact` doc/estimate; konkrétní fabriky většinou nedoložené = estimate, „Ostatní“ v podílech trhu = dopočet).
  Mapa: world-atlas + topojson-client (nové závislosti). Test `tests/web_parts.test.js`. Vizuální kontrola shot.cjs OK.
- 2026-11-13 — „modely ve stylu robotů, pohyb v 3D, dvojklik dovnitř; chybí funkce robotí stránky“ → `src/web/Anatomy3D.jsx`
  = robotí 3D (hodnoty převzaté z robots/src/app/Anatomy-*.jsx: Hemisphere 0xfff0dc/0x2a1f16 1,15 + 3 směrová světla,
  GridHelper 0x6b5435/0x3a2c1f, matné materiály drsnost 0,58 kov 0,06, kamera FOV 32, OrbitControls damping 0,15
  zoomToCursor, WASD/Q/E/Shift let + repivot, šipky, +/−, F, přelet 450 ms, záře `radial-gradient` za průhledným
  canvasem). Obsah staví stejné buildery jako desktopové DIE 3D → dvojklik = findSubcircuit + drill (když dál nejde,
  otočí se kolem bodu). Kořen „celý díl“ = `modelRoot` v parts.js (jedna součástka s modelem z kusovníku, drill = podobvod).
  Rozvržení jako roboti: `src/web/sections.js` (oblasti 01–04, Souvisí, ovládání), lišta Kde jsem, Mapa aplikace (?).
  PAST: Explorer musí načíst obvod do enginu hned v useMemo – efekty dětí (3D scéna) běží dřív než efekt rodiče.
  Z robotí aplikace zatím NENÍ: 3D glóbus s bublinami a periodická tabulka, režim Tok/Cena ve stromu dodávek, skóre
  dílů podle úlohy + animace principu, kalkulačka (laboratoř aktuátoru), karty s tečkami 1–5, podíl na trhu v čase,
  filtry firem/časové osy, průvodce rozborkou (teardown), výukové trasy.
- 2026-11-13 — „web je neuspořádaný, chci všechny součástky, ne jen projekty“ → uživatel vybral: bloky v čipech, knihovnu
  Studia, pasivní součástky, alternativy a cokoli dalšího; katalog jako strom podle sestav. `src/web/catalogTree.js`:
  stránky bloků `#/d/b.<klíč>` (226, generované z hierarchicalSubcircuits; přesnost PRAVIDLEM v `blockFidelity`:
  L≤4 floorplan odhad / schéma částečně, L5–6 učebnice, L7–8 podle procesu, L9+ tabulky), knihovna `#/d/lib.<TYP>`
  (PRIMITIVE_PINS + ukázkové obvody z PRESET_CIRCUITS), větev Materiály a prvky (L8 mřížky, L9 atomy). Strom se počítá
  líně (celý má ~300 tis. uzlů, protože se bloky opakují). Rešerše agentů: `src/web/extra/passives_a.js` + `passives_b.js`
  (110 skupin pasivních / drobných dílů pod deskami, většinou odhad typu) a `extra/alternatives.js` (30 alternativ
  z PCYoutubeborce.md a MujPC_odhady.md, `alt` + `altOf`), rešerše k nim v `research/`. Registr teď 215 dílů.
- 2026-11-13 — „dodavatelé materiálů, kde koupit, jaké stroje na výrobu čipu, kde se vyrábějí, 3D modely strojů“ →
  oblast 05 Výroba. Data z rešerše 3 agentů v `src/web/fab/`: `machines.js` (33 strojů: wafery, front-end, test
  a pouzdření, DPS; výrobci, závody, specifikace, cena jen u EUV), `materials.js` (24 materiálů s dodavateli, závody
  a „kde koupit“ + `ROUTES` = 7 cest k vlastnímu čipu: Tiny Tapeout, Europractice, IHP, wafer.space, ChipFoundry,
  Efabless ukončen 2025, domácí výroba), `processes.js` (15 postupů: wafer, st05, intel22, intel14, tsmc16, tsmc28,
  samsung8n, dram, vnand, power, pkg_*, pcb, smt; kroky → id strojů a materiálů, továrny). 3D modely strojů
  `fab/machineModels.js` = parametrické modely z modulů (ODHAD tvaru; velikosti z rešerše použité jen u skenerů).
  Vazba díl → postupy `processesOf` v `fab/index.js` (ručně pro čipy, desky = pcb + smt, bloky podle `process`).
  Anatomy3D má prop `build` (moduly jako těla). Stránky stroje / materiálu `#/d/m_*`, `#/d/mat_*`, záložka Výroba.
- 2026-11-14 — „mapa se součástkami správně, kde koupit nejmenší díly, kde pořídit stroj, co bychom potřebovali na
  grafickou kartu“ → stránka `#/fab/build/<karta>` (BuildCard ve FabViews.jsx) pro edge3d, tesla_p100, k620, rtx3060ti:
  kusovník s obchody + vyhledávání u distributorů, stroje na DPS a osazení s nabídkami (nový / hobby / použitý /
  služba), služby DPS + osazení, GPU_BUILD (co je potřeba), mapa všeho. Data: `fab/buy_parts.js` (13 distributorů
  s `search` šablonou `{q}`, `space` pro Bazoš; PART_BUY 50 dílů), `fab/buy_machines.js` (MACHINE_BUY pro všech 33
  strojů, SERVICES 7, GPU_BUILD 8). Mapa: přiblížení kolečkem, posun tažením, vrstvy skryvatelné, `legend="fab"`
  (opravena legenda – stroje se dřív ukazovaly jako „Výrobce dílu“). Šablony hledání Mouser/Farnell/RS/Arrow/LCSC
  neověřené (searchOk: false), ceny strojů většinou z výpisů vyhledávače.
