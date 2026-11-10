# Pracovní deník – 10. 11. 2026

Podrobný záznam všeho, co Claude (Claude Code, model Opus 5.5) dnes v tomto repozitáři udělal: zadání, postup,
rozhodnutí, zdroje, chyby a co zůstává otevřené. Repozitář: `MonsterMarian/HW`, aplikace `silicon-logic-studio/`.

---

## 1. Přehled dne v číslech

| Ukazatel | Hodnota |
|---|---|
| Commity dnes | 15 (od `0d977d8` po `b392f3d`) + tento deník |
| Změněné soubory od rána | 63 souborů, +17 391 / −10 467 řádků |
| Automatické testy | 151 / 151 prochází (`npm test`) |
| Lint (oxlint) | 0 varování (ráno ~55) |
| Hierarchické podobvody (dvojklik dovnitř) | 64 listů |
| Skutečné nabídky z e-shopů | 95 nabídek, z toho 52 přímo ověřených načtením stránky |
| Rešeršní subagenti | 12 běhů (ceny, rozměry, pinouty, teardowny, architektury čipů) |

Pravidlo, které platilo celý den: **aplikace se nikdy nespouštěla viditelně** (přání uživatele). Vše se kontrolovalo
ve skrytém okně Electronu (`show: false`) přes `tools/shot.cjs` a vývojový server Vite na portu 5287.

---

## 2. Zadání uživatele v pořadí, jak přišla

1. „pulni toto https://github.com/MonsterMarian/HW“
2. „projekt je mega zabagovaný oprav bugy a logiku … 1) vizuál do stylu mého portfolia 2) všechny vizualizace 2D a 3D
   tak, aby odpovídaly tomu, jak je ten HW opravdu postaven 3) logiku spojů tak, aby to bylo reálné zařízení, ne jen schéma“
3. „udělej další view … simple view … komponenty tak, jak bych je vytáhl z obchodu … 3D … u každé komponenty cena a odkazy
   … pojmenoval bych to economic view … sestav v něm náš nový projekt (PC youtubera) … první projekt grafická karta,
   druhý tento PC“
4. „oprav ty ceny … vyhledej doopravdy u každé komponenty více e-shopů a URL … udělej ten PC model přesně i detaily …
   oprav varování a pokračuj v developmentu“
5. „chekni, jak velké jsou ty grafické karty … jestli se vejdou do té bedny … jak jsou na ně připojené ty větráky …
   neodpověděl jsi na můj návrh repozitáře“
6. „ještě jednou zkontroluj ten 3D model … můj návrh bylo použít https://github.com/wheresryan22/anatomy jako test na další view“
7. „udělej ten nový 3D pohled pro tu anatomii … potom začni dělat schémata jednotlivých částí toho PC … stejně jako originál“
8. „zaměř se na to, co je neověřené a rizikové, a potom pokračuj v dělání všech těch schémat do hloubky“
9. „to, co je na moje rozhodnutí … je to na tobě, nejlépe to udělat, jak to má týpek ve videu. Pokračuj s tím, co není
   hotovo a je neověřené“
10. „udělej dokument … detailně … hoď to na GitHub a všechno pušni“ → tento soubor.

---

## 3. Časová osa commitů

| Čas | Commit | Co obsahuje |
|---|---|---|
| 11:34 | `0d977d8` | Nové jádro simulace (sítě), skutečný model karty Diamond Edge 3D (NV1), hierarchie L2–L8, 2D/3D, vzhled podle portfolia |
| 14:01 | `68cb74f` | ECONOMIC view, projekty po startu (NV1 karta + AI PC), kusovníky |
| 14:11 | `f9d9a53` | Všechna varování oxlint vyřešena |
| 14:13 | `2e95ff7` | Překryv bloků na L2, kompaktní drobečková navigace ve 3D (**omylem s jedním padajícím testem**) |
| 14:14 | `1a18421` | Oprava rozložení L2 – test znovu zelený |
| 14:29 | `a527f73` | Skutečné nabídky z e-shopů s přímými odkazy, modely PC podle datasheetů |
| 15:05 | `cdf2c04` | Napájení ventilátorů 9733 přes SATA regulátor, poznámky o délce karet, viditelné lopatky |
| 15:12 | `a14a37c` | ANATOMY – testovací izometrický výkres (kit Anatomy, MIT) |
| 15:12 | `bb88948` | Oprava času v AgentMEMORY |
| 15:27 | `ee4314a` | ANATOMY 3D – skutečné modely dílů v sestavě, rozložení, čísla dílů |
| 15:40 | `147dd66` | Simulované schéma napájení AI PC + 6 podobvodů L2 podle pinoutů |
| 16:05 | `45ce2ff` | Schémata do hloubky (GP100, Xeon, DDR4, zdroj …) + opravy podle ověření |
| 16:26 | `36170e3` | Sestava jako ve videu: G1 na zdroji Dellu, SATA SSD místo NVMe |
| 16:26 | `b392f3d` | Oprava času v AgentMEMORY |

---

## 4. Část 1 – Oprava a přestavba aplikace (dopoledne, `0d977d8`)

### 4.1 Výchozí stav
Repozitář obsahoval React/Vite/Electron aplikaci „Silicon Logic Studio“ s demonstrací karty NVIDIA NV1. Simulace
pracovala s hodnotami 0/1/2/3, kde se sběrnicová hodnota 2 omylem brala jako stav vysoké impedance. Spoje byly jen
kreslené, ne elektrické. 3D a 2D pohledy si navzájem neodpovídaly a vzhled neodpovídal portfoliu uživatele.

### 4.2 Nové jádro simulace (`src/engine/logicEngine.js`)
- **Dráty = vodivé sítě.** Spojené piny tvoří jednu síť (union-find), piny můžou být obousměrné.
- **Stavy sítě:** číslo (0/1, sběrnice, napětí), `'Z'` = plave, `'X'` = zkrat (dva budiče s různou hodnotou).
- **Pull-upy** (`pulls`), **pasivní konektory** (`joins`) a **tunely** podle jména.
- **Tranzistory jako spínače** (NMOS/PMOS) s držením náboje – buňka DRAM opravdu drží bit.
- **Víc hodinových domén v simulovaném čase** (ns): PCI 33,33 MHz, PLL VCLK 25,165 / MCLK 50,1 MHz z krystalu
  14,31818 MHz, kodek 48 kHz z 24,576 MHz.
- **Rychlost:** zrychleno ze ~17 µs na ~3–4 µs na událost (cache výstupních sítí, smyčky místo alokací).
- Import starých uložených obvodů (verze 1/2 s hodnotami 2/3) se převádí na `Z`/`X`.

### 4.3 Skutečný model karty Diamond Edge 3D 2120 (`src/engine/devices/nv1Card.js`, `presets/nv1Board.js`)
- Hostitelské PC posílá **skutečné PCI transakce**: čtení konfiguračního prostoru (`104A:0008`), nastavení BAR0,
  čtení BIOS ROM (podpis `55 AA`, kontrolní součet), programování CRTC na 640 × 480 @ 60 Hz, zápis obrazu.
- NV1 = PCI target + FIFO + řadič FPM DRAM (RAS/CAS, page mode, CBR refresh každých 15,6 µs) + CRTC/scan-out +
  32hlasá syntéza → kodek AD1845 + čtení ovladače Sega Saturn (TH/TR).
- 4× KM416C256 DRAM, RAMDAC STG1764X (PLL, RGB555 → 0–0,7 V), EPROM, krystaly, konektory.
- **Monitor skládá obraz jen z napětí a časování synchronizace** – nic „nepodvádí“ přímým čtením paměti.
- Rozměry pouzder a karty jsou skutečné (3,7 px/mm), 5V klíč PCI na kontaktech 50/51.

### 4.4 Hierarchie L2–L8 (`hierarchicalSubcircuits.js`)
Dvojklikem: deska → bloky čipu (L2) → RTL (L3) → registry a sčítačky (L4) → hradla (L5) → CMOS z tranzistorů (L6) →
průřez tranzistorem 0,5 µm (L7) → atomy Si/SiO₂ (L8). Úrovně L3–L6 se opravdu simulují.

### 4.5 2D a 3D pohledy
- 2D: schéma (IEEE značky) a PCB (pouzdra ve skutečné velikosti, měděné cesty podle sítí, router A*).
- 3D: deska jako vytažení PCB pohledu, pouzdra podle výkresů, otevřené pouzdro s die, standardní buňky, CMOS layout,
  průřez MOSFETem, krystalová mřížka.
- Vzhled převzatý z `../Portfolio`: obsidiánové pozadí, jantar `#FFA909`, písma Outfit / Lora / Courier New.

### 4.6 Testy
`tests/engine.test.js`, `tests/nv1_card.test.js` (enumerace PCI, DRAM, refresh, obraz pixel po pixelu, audio, pad,
poruchy), `tests/hierarchy.test.js`, `tests/pcb_router.test.js`.

---

## 5. Část 2 – ECONOMIC view a projekty po startu (`68cb74f`)

### 5.1 Projekty (`src/engine/projects.js`)
Po každém spuštění se založí dva projekty a otevře se první:
1. **NV1 KARTA** – Diamond Edge 3D 2120, všechny pohledy.
2. **AI PC 2× P100** – sestava z videa Junk GPU Lab podle `PCYoutubeborce.md`.

Přepínač projektů je v titulní liště. Při přepnutí se uloží stav obvodu, hierarchie i pohled a po návratu se obnoví.

### 5.2 ECONOMIC view (`src/views/EconomicView.jsx`)
- 3D stůl s díly „jak z obchodu“ ve skutečné velikosti v mm, pravítko 30 cm, mřížka 10 cm.
- Vysoké díly se řadí dozadu, aby byly vidět i drobné čipy.
- Popisky s cenou, kusovník vpravo, klik na díl = detail, rozměr, cena, odkazy.
- Kamera se nastaví tak, aby se vešly všechny rohy dílů (iterativní projekce rohů).
- Odkazy se v Electronu otevírají v systémovém prohlížeči (`setWindowOpenHandler` → `shell.openExternal`).

### 5.3 3D modely dílů (`src/views/economic/models.js`)
Dell T5810, Tesla P100, adaptér chlazení, ventilátor 9733, Quadro K620, Xeon, RDIMM, SSD, zdroj, Add2PSU, redukce EPS,
regulátor PWM, pasta, ventilátory P12; u karty NV1 se čipy staví stejnou funkcí jako v PCB pohledu.

---

## 6. Část 3 – Skutečné ceny a přesné modely (`a527f73`)

### 6.1 Rešerše cen
Uživatel chtěl skutečné ceny z více e-shopů. Spustil jsem 4 rešeršní agenty paralelně (skupiny dílů PC A/B/C a díly
karty NV1). Pravidla pro agenty: nikdy si nevymýšlet URL ani cenu, uvádět jen nabídky, které viděli, a značit
`fetched` (stránka načtena) / `snippet` (cena jen z výpisu vyhledávače).

Výsledek je v `src/engine/economic/offers.js`: přímé odkazy na produkty a inzeráty, cena v původní měně a v Kč
(kurz ČNB), stav (nové / repas / použité). Test zakazuje vyhledávací URL.

Zajímavá zjištění:
- Samotný Dell T5810 se skoro neprodává; kompletní kus na Bazoši od 3 999 Kč už obsahuje CPU i RAM.
- Sady chlazení pro P100 se prodávají **bez ventilátoru** → přidána samostatná položka Delta BFB1012VH.
- Seasonic Focus GX-650 se už neprodává → v kusovníku je nástupce Core GX-650 ATX 3.
- Redukci PCIe → EPS ani P100 v českých obchodech nenajdeš, jen v zahraničí.
- Čipy NV1 a STG1764X se dnes neprodávají vůbec; celá karta Diamond Edge 3D je sběratelský kus (16–23 tis. Kč)
  a do součtu se nepočítá (`alt: true`).

### 6.2 Přesné modely
Pátý agent dohledal rozměry a detaily z manuálu Dell, product briefu NVIDIA PB-08248 a datasheetu Samsung.
Podle toho jsem přestavěl modely: čelo Dellu (vypínač, jacky, USB, šachty na výšku, šestiúhelníková mřížka, madla),
P100 (lišty se šrouby, nápis TESLA u záslepky, logo NVIDIA na horní hraně, EPS konektor na konci karty), RDIMM
(deska 1,4 mm, 9 + 9 čipů, RCD uprostřed, klíč na 64,6 mm, výřezy pro západky) a další.

---

## 7. Část 4 – Varování a drobné opravy (`f9d9a53`, `2e95ff7`, `1a18421`)
- **oxlint ~55 varování → 0**: pořadí hooků, vedlejší efekty při renderu přesunuté do `useEffect`, kreslicí funkce
  plátna v `useMemo`, nepoužité importy, zachycené výjimky.
- **L2 schéma NV1:** blok PCI TARGET překrýval pady – rozložení upraveno.
- **3D drobečková navigace** na hlubokých úrovních přetékala – teď ukazuje první úroveň, „…“ a poslední dvě.

---

## 8. Část 5 – Vejdou se karty do skříně? Ventilátory (`cdf2c04`)

### 8.1 Rozměry
- Tesla P100 PCIe: **267 × 111,15 mm, dvouslotová, 1177 g** (NVIDIA PB-08248, PNY brief).
- Dell T5810 bere karty plné délky **max. 312 mm** (PCIe CEM).
- **Samotná P100 se vejde. S adaptérem a ventilátorem 9733 (≈ 350–406 mm) do zavřené skříně ne** – za limitem je
  držák karet a šachty disků (fotky vnitřku z manuálu Dell).

### 8.2 Video
Z popisu videa (stažený HTML popis) a ze storyboardu (veřejné náhledy časové osy YouTube) vyplývá: autor použil
„ducted fan shroud“, druhý zdroj jen pro druhou kartu, teploty 61/53 °C v zátěži. Přesný ventilátor ani zda byla
skříň zavřená, z veřejných zdrojů ověřit nešlo (titulky nejdou stáhnout, záběry jsou stylizované rendery).

### 8.3 Ventilátory – oprava doporučení z dokumentu
- Konektory ventilátorů na desce T5810 jsou **proprietární Dell** (jiné zapojení pinů).
- Dva ventilátory BFB1012VH berou 2 × 1,8 A = **3,6 A**; běžný konektor na desce snese ~1 A.
- Rozbočovač Noctua NA-SYC1 do desky (rada z `PCYoutubeborce.md`) jsem proto z kusovníku vyřadil a nahradil
  **SATA napájeným regulátorem ModDIY TD404** (60 W, 4 porty, knoflík, 63 × 32 × 20,3 mm).

---

## 9. Část 6 – ANATOMY (`a14a37c`, `ee4314a`)

### 9.1 Kit Anatomy
Návrh uživatele: <https://github.com/wheresryan22/anatomy>. Je to MIT „skill“ pro izometrické technické výkresy
z mnoha malých dílů. Před převzetím jsem prošel kód: čisté funkce (projekce, tělesa, SVG řetězce), bez sítě a bez DOM.
`kit/iso-kit.mjs` je beze změny převzatý do `src/vendor/anatomy/iso-kit.js` i s licencí a odkazem na commit `1482e84`.

### 9.2 Pohled ANATOMY (`src/views/AnatomyView.jsx`)
- **VÝKRES (2D):** celá sestava jako jeden izometrický výkres v mm. Každá položka kusovníku má očíslovaný popisek
  propojený s legendou, takže malé díly (Add2PSU, regulátor) jsou vidět ve velkém celku bez přepínání.
  Posuvník ROZLOŽIT sestavu rozloží (exploded view), najetí myší díl zvýrazní jantarem.
- **3D MODEL:** přesné modely z ECONOMIC posazené do skutečné polohy ve skříni (`scene3d.js`, `Anatomy3D.jsx`).
  Každý díl má `orient` – kam míří osy modelu v osách sestavy (karty chladičem dolů, záslepkou k zadní stěně,
  kontakty k desce). Červeně je vidět limit 312 mm a přesah krytu s ventilátorem.
- Karta NV1 v ANATOMY: čipy na skutečných pozicích z PCB pohledu.

---

## 10. Část 7 – Schéma napájení AI PC (`147dd66`)

### 10.1 Pinouty (rešerše)
Intel ATX 3.0 Design Guide (24 pin, PS_ON# pin 16 s pull-upem, PWR_OK), PCI Express 8 pin (1–3 +12 V, 4 Sense1,
5/7/8 GND, 6 Sense0), EPS12V 8 pin (1–4 GND, 5–8 +12 V), SATA 15 pin, Molex, Intel 4-Wire PWM Fan spec (25 kHz).
**Zapojení redukce NVIDIA 030-0571-000 pin po pinu z výkresu v PB-08248 obr. 4** (Sense piny jsou v ní jen zemnicí).

### 10.2 Simulovaný obvod (`presets/pcPower.js`, `devices/pcBuild.js`)
- Sítě nesou **napětí ve voltech** (12 = +12 V, 0 = zem); plátno ukazuje „12 V“, „%“ PWM a „ot/min“.
- Vypínač Dellu → SATA 12 V → Add2PSU (relé) → PS_ON# druhého zdroje → redukce → EPS12V karet; ventilátory přes TD404.
- **PCIe kabel zapojený napřímo do EPS zdířky P100 dá zkrat** (`X`) přes zemní rovinu karty a zem slotu – stejně
  jako ve skutečnosti. Protože obě karty sdílejí zem desky, zkrat se projeví na celé zemi systému.
- Knoflík regulátoru se ovládá klikem (+10 %).

### 10.3 Podobvody L2
Redukce pin po pinu, Add2PSU (relé), TD404, zdroj (bloky), deska P100 (bloky), platforma Dell T5810 (CPU, C612, sloty).

---

## 11. Část 8 – Ověřování rizik a schémata do hloubky (`45ce2ff`)

### 11.1 Co tři rešerše ověřily
- **Pořadí slotů T5810** z obrázku desky v manuálu: shora 1 (x8, jen poloviční délka), 2, 3, 4, 5, 6 (PCI), pak
  mechanický otvor. P100 ve slotech 2 a 4 zakryjí 3 a 5 → **volný je jen slot 1**.
- **PCIe CEM 3.0:** první kontakt B1 je 45,65 mm od zadní hrany desky (měl jsem odhad 42 mm → modely opraveny).
- **Dell a grafika:** 300 W = obě karty dohromady, 225 W = jedna karta; zdroj Dellu má 2× 6 pin přes „PSU extended card“.
- **Add2PSU:** jediné relé Golden GB-1C12L, spouštění z Molexu (dříve přidaná dioda odstraněna).
- **TD404:** deska FAN-K02, obvod SOIC-8 + 2 diody + potenciometr + regulátor → odpovídá 555 (označeno jako odhad).
- **Zdroj Core GX-650 ATX 3:** ověřeno full-bridge LLC, bulk 330 µF/400 V, výstupní filtr, OVP 13,4 V; konkrétní díly
  podle sourozence GX-750 ATX3 (Cybenetics).

### 11.2 Hloubka (`src/engine/pcDeepSubcircuits.js`)
| Cesta | Úrovně |
|---|---|
| Dell → Xeon E5-1650 v3 → jádro Haswell (ROB 192, scheduler 60, porty P0–P7) → příklad 1 bitu sčítačky | L2 → L3 → L4 → L5 hradla → L6 CMOS → L7 tranzistor → L8 atomy |
| Dell → RDIMM (18× DDR4, RCD, SPD) → čip DDR4 4 Gb x4 (bank groups, dekodéry) → simulované buňky 1T1C | L3 → L4 → L5 → L7 → L8 |
| P100 → GP100 (6 GPC, L2 4 MB, 8× řadič 512 bit) → SM (2 bloky, registry, FP32/FP64) → příklad sčítačky a registru | L2 → L3 → L4 → L5 … L8 |
| Zdroj → primár (můstek, APFC, full-bridge LLC), sekundár (SR, DC-DC, supervizor), +5VSB | L2 → L3 |

„Příklad“ = skutečný simulovaný prvek (FULL_ADDER, D_FF), kterým vede cesta dál až k atomům; v popisku je napsáno,
že nejde o skutečné zapojení z čipu.

---

## 12. Část 9 – Sestava jako ve videu (`36170e3`)

Uživatel rozhodnutí přenechal: „nejlépe to udělat, jak to má týpek ve videu“.
1. **Napájení:** autor přidal druhý zdroj „just for card 2“. První P100 tedy jede ze zdroje Dellu přes jeho 2× 6 pin
   a redukci (NVIDIA PB-08248 tab. 8 povoluje 2× 6 pin; při limitu 150 W stačí 2 × 75 W). Schéma i test to odráží.
2. **Disk:** ve videu NVMe není a pro M.2 redukci v Dellu nezbývá slot → **Samsung 870 EVO 1 TB (2,5" SATA)** v šachtě.
   Rozměry 100 × 69,85 × 6,8 mm z datasheetu, skutečné nabídky (nový 6 499–7 499 Kč, Bazoš od 2 500 Kč), 3D model,
   schéma vnitřku (řadič MKX, 1 GB LPDDR4, 1 pouzdro V-NAND). M.2 redukce a NV3 z projektu odstraněny.
3. **K620 ve slotu 1** + schéma karty (GM107, 384 jader, 2 GB DDR3, PCIe 2.0, 45 W, DVI + DP).
4. **Xeon:** plocha krycího plechu 40,5 × 36,74 mm a výška ≈ 5,08 mm podle Intel TMSDG 330786.

---

## 13. Mapa souborů (co je kde)

| Oblast | Soubory |
|---|---|
| Jádro simulace | `src/engine/logicEngine.js` |
| Karta NV1 | `src/engine/devices/nv1Card.js`, `src/engine/presets/nv1Board.js`, `src/engine/boardLayout.js` |
| AI PC – zařízení a schéma | `src/engine/devices/pcBuild.js`, `src/engine/presets/pcPower.js` |
| Hierarchie | `src/engine/hierarchicalSubcircuits.js`, `src/engine/pcSubcircuits.js` (L2–L3 PC), `src/engine/pcDeepSubcircuits.js` (L3–L5 PC) |
| Projekty | `src/engine/projects.js` |
| Kusovníky a ceny | `src/engine/economic/catalog.js`, `src/engine/economic/offers.js` |
| ECONOMIC | `src/views/EconomicView.jsx`, `src/views/economic/models.js`, `layout.js` |
| ANATOMY | `src/views/AnatomyView.jsx`, `src/views/anatomy/figures.js`, `scene3d.js`, `Anatomy3D.jsx`, `src/vendor/anatomy/` |
| 2D plátno | `src/views/LogicCanvas.jsx`, `src/views/canvas/*` |
| 3D křemík a deska | `src/views/PhysicsView.jsx`, `src/views/physics/*` |
| Testy | `tests/*.test.js` (151 testů) |
| Paměť pro další session | `AgentMEMORY.md` |

---

## 14. Jak to spustit a ověřit

```bash
cd silicon-logic-studio
npm install
npm test        # 151 testů: jádro, karta NV1, hierarchie, router, ECONOMIC, ANATOMY, napájení PC
npx oxlint      # 0 varování
npm run build
npm run desktop # Electron okno
```
Skrytá kontrola bez okna: `npx vite --port 5287 --strictPort` a pak
`SHOT_URL=http://localhost:5287/ npx electron tools/shot.cjs <kroky.json> <složka>`.

---

## 15. Chyby, které jsem dnes udělal (a jak jsem je opravil)

| Chyba | Dopad | Oprava |
|---|---|---|
| Commit `2e95ff7` odešel s jedním padajícím testem (řetězec příkazů nezastavil commit) | Na GitHubu byla 1 minuta verze s padajícím testem | `1a18421` hned poté |
| Dvakrát jsem do AgentMEMORY zapsal čas dřív, než jsem ho zjistil příkazem `date` | Špatný čas v paměti | `bb88948`, `b392f3d` |
| První ceny v ECONOMIC byly odhady a odkazy vedly na vyhledávání | Neodpovídalo zadání | Skutečné nabídky z rešerše (`a527f73`) |
| Převzal jsem z dokumentu rozbočovač ventilátorů do desky | Nefunkční a přetěžující zapojení | TD404 ze SATA (`cdf2c04`) |
| Schéma napájelo obě karty z druhého zdroje | Jinak než ve videu | G1 ze zdroje Dellu (`36170e3`) |
| Kontakty PCIe 42 mm od záslepky (odhad) | Nepřesný model | 45,65 mm podle CEM (`45ce2ff`) |
| Pozice slotů v ANATOMY odhadnuté, K620 a M.2 v neexistujících slotech | Konflikt slotů nebyl vidět | Ověřené pořadí slotů, K620 ve slotu 1, SATA SSD |
| Do Add2PSU jsem přidal nulovou diodu jako „běžnou praxi“ | Neověřený detail | Odstraněna podle recenze (jen relé) |
| Logo NVIDIA na P100 vzhůru nohama, bílá obrazovka CRT, skryté lopatky ventilátorů | Vizuální chyby | Opraveno po skrytých snímcích |
| Shell (heredoc) několikrát zakopl o uvozovky v českých textech | Úprava se neprovedla | Skripty zapsané do souboru a spuštěné odtamtud |

---

## 16. Co zůstává neověřené nebo otevřené

- Konkrétní součástky zdroje **Core GX-650** (teardown existuje jen pro sourozence GX-750 ATX3 / GX-500).
- Napájení (VRM) na kartě P100 a které SM jsou na P100 vypnuté – NVIDIA nezveřejňuje.
- U Xeonu: že jde o 8jádrový LCC die s jedním kruhem, PCU/FIVR, přesný obrys krycího plechu (rozměr plochy ověřen).
- Typ RCD a SPD obvodů na RDIMM, počet vrstev NAND v 870 EVO, 3 aktivní SMM u K620 (dopočet 384 / 128).
- Add2PSU: že kontakt spíná pin 16 na COM, je odvozené z ATX specifikace.
- TD404: typ řídicího obvodu (odhad 555), kmitočet PWM.
- Zda má konkrétní Dell z bazaru kabely 6 pin a SATA k šachtám.
- Z videa: zda autor použil jeden kanál s ventilátorem přes obě karty, nebo kryt na každou kartu; přesný ventilátor.
- Rozměry stříkačky MX-6, čelo Dellu ±5 mm.
- Nabídky z bazarů časem zmizí, ceny platí k 10. 11. 2026.
- PC projekt nemá PCB pohled ani 3D křemík (jen SCHEMATIC, ECONOMIC, ANATOMY).
- Simulace karty NV1 je přesná na takty, a proto pomalá (snímek 640 × 480 ≈ minuta reálného času).

---

## 17. Zdroje použité během dne

**Hardware a normy**
- NVIDIA Tesla P100 PCIe product brief PB-08248: <https://images.nvidia.com/content/tesla/pdf/NV-tesla-p100-pcie-PB-08248-001-v01.pdf>
- NVIDIA Pascal whitepaper: <https://images.nvidia.com/content/pdf/tesla/whitepaper/pascal-architecture-whitepaper.pdf>
- NVIDIA Quadro K620 datasheet: <https://nvidia.cn/content/dam/en-zz/Solutions/design-visualization/documents/75509_DS_NV_Quadro_K620_US_NV_HR.pdf>
- Dell Precision T5810 Owner's Manual: <https://cdn.shopify.com/s/files/1/0248/8539/5502/files/precision-t5810-workstation_owners-manual_en-us.pdf>
- Dell T5810 Technical Specifications: <https://cdn.shopify.com/s/files/1/1167/3148/files/Dell_Precision_T5810_Technical_Specifications.pdf>
- Dell KB 000140822 (6 pin): <https://dell.com/support/kbdoc/en-us/000140822/dell-precision-5810-power-supply-six-pin-information>
- Intel ATX 3.0 Design Guide (kopie): <https://www.manualslib.com/manual/2754978/Intel-Atx-3-0.html?page=49>
- Pinouty konektorů zdrojů: <https://www.playtool.com/pages/psuconnectors/connectors.html>
- PCI Express CEM 3.0 (veřejná kopie): <https://cdck-file-uploads-global.s3.dualstack.us-west-2.amazonaws.com/nvidia/original/3X/2/0/20a75bdbb6bc42db8b2cb0b7c77f3e492a274508.pdf>
- Intel 4-Wire PWM Fan spec: <https://www.mikrocontroller.net/attachment/670442/4-Wire_PWM_Controlled_Fans.pdf>
- Intel ARK E5-1650 v3: <https://www.intel.com/content/www/us/en/products/sku/82765/intel-xeon-processor-e51650-v3-15m-cache-3-50-ghz/specifications.html>
- Intel ARK C612: <https://www.intel.com/content/www/us/en/products/sku/81759/intel-c612-chipset/specifications.html>
- Intel Optimization Reference Manual: <https://cdrdv2-public.intel.com/930022/356477-051-optimization-reference-manual-vol2.pdf>
- Intel TMSDG 330786: <https://www.intel.com/content/www/us/en/content-details/330786/thermal-mechanical-specification-and-design-guide-intel-xeon-processor-e5-1600-and-e5-2600-v3-product-families.html>
- Samsung RDIMM M393A1G40EB1 datasheet: <https://hkjdwchip.com/image//files/samsungelectronics-m393a1g43eb1crc-datasheets-0771.pdf>
- Micron 4Gb DDR4: <https://datasheet.chipsmall.com/MT40A256M16GE-083E-B/327563.pdf>
- Samsung 870 EVO datasheet: <https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_SSD_870_EVO_Data_Sheet_Rev1.1_230509_10129500053000.pdf>
- KitGuru 870 EVO teardown: <https://www.kitguru.net/components/ssd-drives/simon-crisp/samsung-ssd-870-evo-1tb-review/2>
- Patent Add2PSU US8878390: <https://patents.google.com/patent/US8878390>
- LegitReviews Add2PSU: <https://www.legitreviews.com/add2psu-daisy-chain-power-supply-adapter-review_1698>
- Cybenetics Core GX-750 ATX3: <https://www.cybenetics.com/evaluations/psus/2753/>
- noticias3d Core GX-650 ATX 3: <https://www.noticias3d.com/articulo/3844/p2/seasonic-core-gx-atx-3-2024-650w-review-apuesta-economica-ultimos-estandares.html>
- ModDIY TD404: <https://www.moddiy.com/products/6699/12V-4-Pin-PC-Chassis-PWM-Fan-Hub-Speed-Controller-Powered-by-SATA.html>
- M.2 pinout (congatec AN43): <https://wiki.congatec.com/wiki/M.2_Pinout_Descriptions_and_Reference_Designs_(AN43)>
- AXAGON PCEM2-N: <https://axagon.eu/en/produkty/pcem2-n>
- AnandTech GM107: <https://at-web1.www.anandtech.com/show/7764/the-nvidia-geforce-gtx-750-ti-and-gtx-750-review-maxwell/4>

**Video a projekty**
- Video Junk GPU Lab: <https://www.youtube.com/watch?v=JvLUoJYUjDM>
- Repozitář autora videa: <https://github.com/junkgpulab/llama.cpp-p100>
- Kit Anatomy (MIT): <https://github.com/wheresryan22/anatomy>

**Ceny:** všechny nabídky s přímými odkazy jsou v `silicon-logic-studio/src/engine/economic/offers.js`
(kurz ČNB: <https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt>).
