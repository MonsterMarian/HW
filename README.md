# SILICON LOGIC STUDIO // CYBER-PHYSICAL HARDWARE EDA

> **Next-Generation Desktop Logic Circuit, CPU & GPU Simulator**  
> Vytvořeno pro vývoj a simulaci digitálních architektur od úrovně hradel až po kompletní procesor a grafický adaptér s virtuálním CRT monitorem.

---

## ⚡ Klíčové vlastnosti & Režimy zobrazení

Aplikace disponuje **třemi specializovanými režimy zobrazení**:

1. **`SCHEMATIC` (Čisté IEEE/ANSI schéma)**
   - Vektorové značky logických hradel podle mezinárodních norem **IEEE Std 91-1984**:
     - **AND / NAND** (`&`) – rovná zadní stěna, půlkruhové tělo.
     - **OR / NOR** (`≥1`) – konkávně prohnutá zadní stěna, špičatý oblouk.
     - **XOR** (`=1`) – dvojitě prohnutá zadní stěna s izolovaným obloukem.
     - **NOT** (`1`) – trojúhelník s bublinkou negace na špičce.
     - **D-FF** – synchronní klopný obvod s dynamickým vstupem taktu `>`.
   - Inženýrské pravoúhlé **Manhattan EDA vodiče** s pájecími uzly (*junction dots*).
   - Blueprintové technické pozadí s dot-gridem a EDA rohovým štítkem.

2. **`HARDWARE PCB` (Autentická deska plošných spojů)**
   - Realistická deska FR-4 s tmavě zelenou vojenskou pájecí maskou a leptanými měděnými trasami.
   - **ENIG zlacení** na všech pájecích ploškách a prokovkových kroužcích.
   - **DIP pouzdra čipů**: Lisovaný černý epoxid, 3D zkosení, půlkruhový notch pin 1, indexová jamka, kovové nožičky s kapkami pájecího cínu a laserový sítotisk (Texas Instruments / Motorola / Hitachi).
   - **Plynule animované proudění elektronů** podél vodičů v reálném čase (60 FPS).
   - **Termální telemetrie**: Měření spínací frekvence a dynamické teploty každého integrovaného obvodu v °C.

3. **`SILICON DIE 3D` (Fyzikální křemíkový model)**
   - 3D vizualizace mikročipu v Three.js (P/N difuze, polysilikonová hradla, kovové propojovací vrstvy M1–M4).
   - Termokamera (infračervená difuze tepla čipu).

---

## 🗄️ Galerie architektur & Ukládání projektů

Boční panel **`GALLERY & STORAGE`** obsahuje:
- **Předpřipravené ověřené obvody**:
  - 1-Bit Half Adder (Polosčítačka)
  - 1-Bit Full Adder (Úplná sčítačka se vstupem Cin a Cout)
  - 1-Bit Bistable SR Latch (Paměťová buňka ze dvou hradel NOR)
  - Synchronous D Flip-Flop
  - GPU 64×64 Pixel Generator & Display
- **Uživatelská úložiště (My Saved Circuits)**:
  - Ukládání libovolného počtu vlastních zapojení pod zvoleným názvem.
  - **Export JSON**: Uložení kompletního netlistu do souboru `.json`.
  - **Import JSON**: Načtení obvodu z disku.
  - **Export PNG**: Vygenerování snímku schématu ve vysokém rozlišení.
  - **Clear Canvas**: Jedním klikem vyčistí plátno pro nový návrh.

---

## 🛠️ Interaktivita & Ovládání

- **Drag & Drop**: Kliknutím na součástku a tažením myši ji můžete volně posouvat po plátně (vodiče se automaticky přizpůsobují).
- **Klávesa `Delete` / `Backspace`**: Smazání vybrané součástky a jejích vodičů.
- **Klávesa `Escape`**: Zrušení tažení vodiče nebo odznačení.
- **Kolečko myši**: Plynulý Zoom (25 % až 250 %).
- **Prostřední tlačítko / Alt + tažení**: Posun plátna (Pan).
- **Přepínač vstupů (Switch)**: Kliknutím přímo na páčku přepnete stav mezi `0` (LOW) a `1` (HIGH).
- **Simulační hodiny (Clock)**: Tlačítka `HALT / CLOCK`, `STEP` (jeden takt) a volba frekvence od 1 Hz do 1 kHz.

---

## 🚀 Jak spustit desktopovou aplikaci

```bash
# 1. Přejít do složky aplikace
cd silicon-logic-studio

# 2. Nainstalovat závislosti (pokud ještě nejsou)
npm install

# 3. Zbuildit frontend
npm run build

# 4. Spustit nativní desktopové okno
npm run desktop
```

Případně stačí na Windows 2× kliknout na dávkový spouštěč **`Spustit_Silicon_Studio.bat`** (nebo na zástupce **`SiliconStudio.bat`** na ploše).
