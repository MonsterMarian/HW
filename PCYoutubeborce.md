# Specifikace PC sestavy z videa (Junk GPU Lab – Dual Tesla P100 AI Rig)

Tento dokument obsahuje kompletní seznam komponent počítače použitého ve videu [**Qwen 3.8 27B at 67 tok/s on Two \$78 Nvidia Tesla P100s**](https://www.youtube.com/watch?v=JvLUoJYUjDM) z kanálu Junk GPU Lab, podrobné vysvětlení procesorů a integrovaných grafik, kritické chybějící drobnosti a přehled lepších alternativ pro stavbu.

---

## Část 1: Sestava z videa a podrobný rozpis komponent

### 1.1 Komponenty přímo zmíněné nebo viditelné ve videu

* **Základní stanice (Barebone):** **Dell Precision Tower 5810 (T5810)**
  * Starší, ale velmi populární a levná pracovní stanice střední třídy. Obsahuje proprietární základní desku Dell (čipset Intel C612, patice LGA 2011-v3) a robustní skříň.
  * *Poznámka z videa:* Její BIOS má limit na adresování paměti PCIe zařízení (16GB adresní prostor), což způsobovalo černou obrazovku před úpravou VBIOSu karet.
* **Výpočetní grafické karty (2×):** **NVIDIA Tesla P100 16GB PCIe (HBM2)**
  * Celkem **32 GB HBM2 VRAM** (propustnost až 732 GB/s na každou kartu).
  * Produktové označení: `699-2H400-0201` (architektura Pascal GP100, pasivní serverové karty bez video výstupů).
  * V sestavě jsou softwarově přiškrcené z původních 250 W na **150 W TDP na kartu** (celkem 300 W v zátěži při ztrátě méně než 1 % výkonu).
* **Operační paměť (RAM) ve videu:**
  * Autor ve videu přesnou kapacitu své systémové RAM (DDR4) nezmiňuje, protože hlavním cílem bylo vejít se s celým modelem (27B v Q6) do **32 GB HBM2 VRAM** na grafických kartách, aby se zabránilo pomalému odkládání dat do systémové RAM.

### 1.2 Procesor (CPU), vykreslování obrazu (iGPU) a zbytek základu PC

Protože autor ve videu přesný model procesoru nezmiňuje a karty **Tesla P100 nemají vůbec žádné konektory pro monitor (HDMI/DisplayPort)**, je zásadní rozlišit, na jakém procesoru a základní desce počítač stavíš:

* **Jak je to s integrovanou grafikou v procesoru (iGPU):**
  * **Běžné stolní procesory (Intel Core / AMD Ryzen):** Drtivá většina běžných procesorů Intel (např. Core i5/i7/i9 bez písmene „F“ na konci) a novějších procesorů AMD (Ryzen řady 7000/9000 nebo modely s písmenem „G“ jako Ryzen 5 5600G) **má vlastní integrovanou grafiku**. Pokud stavíš na běžné základní desce s těmito procesory, zapojíš monitor přímo do HDMI/DisplayPortu na základní desce a **žádnou další grafickou kartu na obraz nepotřebuješ**.
  * **Serverové procesory v Dellu T5810 z videa (Intel Xeon E5 v3/v4):** Stanice Dell T5810 používá serverovou patici LGA 2011-v3 a procesory **Intel Xeon E5-1620 v3, E5-1650 v3 nebo E5-2680 v4** (6 až 14 jader, na bazaru stojí pár stovek korun a mají skvělých 40 PCIe 3.0 linek). Tyto konkrétní serverové Xeony ale **integrovanou grafiku vůbec nemají** a základní deska v Dellu T5810 nemá vzadu žádný konektor na monitor.
  * **Řešení pro Dell T5810 (nebo procesory Intel „F“ / starší Ryzeny bez iGPU):** Pokud použiješ přesně ten Dell z videa (nebo procesor bez grafiky), musíš do třetího slotu na desce zasunout jakoukoliv malou, levnou grafickou kartu jen pro zobrazení BIOSu a plochy systému (např. **NVIDIA Quadro K620, NVS 310 nebo GT 710** za ~200–300 Kč). Jakmile systém nastavíš, můžeš k němu přistupovat přes síť (SSH / webové rozhraní) a monitor odpojit.
* **Operační paměť (RAM – doporučená konfigurace):** **32 GB nebo 64 GB DDR4**
  * *Pro Dell T5810:* Vyžaduje serverové **DDR4 ECC Registered (RDIMM)** paměti (2133/2400 MHz, 4× 8 GB nebo 4× 16 GB v Quad-Channel zapojení). Běžné desktopové RAM v této stanici nefungují.
  * *Pro běžné stolní PC:* Standardní desktopové **DDR4 nebo DDR5 (non-ECC)** paměti (2× 16 GB nebo 2× 32 GB).
* **Úložiště (SSD):** **1 TB NVMe M.2 SSD (nebo 2.5" SATA SSD)**
  * Jazykové modely o velikosti 27B zabírají přes 20 GB na jeden soubor. Rychlé SSD zkrátí načítání modelu do VRAM na několik sekund. (V Dellu T5810 se M.2 NVMe disk zapojuje přes levnou PCIe x4 redukci do slotu za ~150 Kč).

---

## Část 2: Co ve videu chybělo a lepší alternativy pro stavbu

Pokud počítač skládáš od nuly, narazíš na několik kritických věcí, které autor ve videu přešel, případně můžeš zvolit modernější a mnohem méně problematické komponenty.

### 2.1 Kritické drobnosti, které ve videu chybí (a bez kterých narazíš)

1. **Regulace otáček ventilátorů (Riziko přehřátí!):**
   * Karty Tesla P100 nemají vlastní konektor na ventilátor, takže větráky chladičů zapojuješ do základní desky. Jenže základní deska řídí otáčky podle teploty procesoru (CPU), ne podle grafických karet! Při běhu AI modelu může být procesor ledový (35 °C) a běžet potichu, zatímco karty P100 se v tichosti upečou.
   * *Řešení:* Buď v BIOSu nastavíš pro daný konektor pevných 70–100 % otáček, koupíš **manuální PWM regulátor otáček s otočným kolečkem** (~100 Kč), nebo v Linuxu nastavíš službu (`fancontrol` / `coolercontrol`), která čte teplotu z `nvidia-smi`.
2. **Synchronizace druhého zdroje (Add2PSU):**
   * Pokud použiješ druhý zdroj mimo skříň (jako ve videu), sám od sebe se nezapne, protože jeho 24-pin kabel není v základní desce. Potřebuješ modul **Add2PSU** (~120 Kč), který propojí oba zdroje a sepne druhý zdroj současně se zapnutím PC.
3. **Výměna teplovodivé pasty (Přepastování):**
   * Karty Tesla P100 jsou z roku 2016. Původní pasta na čipu HBM2 je po 10 letech vyschlá na prach. Přikup tubu kvalitní pasty (např. **Arctic MX-6** za ~150 Kč) a před nasazením ventilátoru kartu přepastuj – srazíš tím teploty o 10 až 15 °C.
4. **Odvod 300 W tepla ven ze skříně:**
   * Většina kupovaných adaptérů s ventilátorem 9733 fouká část horkého vzduchu zpět dovnitř skříně. Skříň proto musí mít silný zadní a přední **120mm skříňový ventilátor** (např. *Arctic P12*), jinak se horký vzduch uvnitř akumuluje.

### 2.2 Alternativa A: Lepší základ PC (Místo starého Dellu T5810 se dvěma zdroji)

Řešit starou stanici Dell s proprietárním BIOSem (který vyžaduje flashování VBIOSu karet kvůli 16GB limitu) a druhým zdrojem pohozeným vedle skříně má smysl jen tehdy, když už ten Dell doma máš. Pokud kupuješ PC od nuly, zvol jednu z těchto čistších variant:

* **Možnost 1: Běžné stolní PC s procesorem s integrovanou grafikou a jedním silným zdrojem (Doporučeno)**
  * **CPU + Deska:** Bazarový **AMD Ryzen 5 5600G / 5700G** (má integrovanou grafiku) + deska **B550 / X570**, případně **Intel Core i5-12400** (s grafikou UHD 730) + deska **B660 / Z690** se dvěma dlouhými PCIe x16 sloty.
  * *Výhoda:* Moderní desky mají v BIOSu funkci **Above 4G Decoding / Resizable BAR**, takže nemají problém s adresováním paměti karet. Navíc nepotřebuješ třetí grafiku na obraz a jak ukázalo video, i když druhý PCIe slot poběží pomaleji (x4 nebo x8), výkon v `llama.cpp` klesne o méně než 2 %.
  * **Skříň a zdroj:** Běžná prostorná ATX skříň a **jeden kvalitní 850W–1000W ATX zdroj** (např. *Corsair RM850x* nebo *Seasonic Focus*). Vše je čistě v jedné bedně bez bastlení druhého zdroje.
* **Možnost 2: Vyšší model pracovní stanice (Pokud chceš levný hotový základ)**
  * Místo Dellu T5810 hledej **Dell Precision T7810 / T5820** nebo **HP Z440 / Z640 / Z840**, ale výhradně v konfiguraci s továrním **825W, 1125W nebo 1300W zdrojem**. Odpadne ti nutnost kupovat a propojovat druhý externí zdroj.

### 2.3 Alternativa B: Jiné grafické karty (Čím případně nahradit Tesla P100)

| Varianta karet | Celková VRAM | Orientační cena | Hlavní výhoda | Hlavní nevýhoda |
| :--- | :--- | :--- | :--- | :--- |
| **2× Tesla P100 16GB** *(z videa)* | 32 GB HBM2 | ~6 500 – 7 500 Kč | Extrémní rychlost pamětí (732 GB/s), nejlevnějších 32 GB | Bez Tensor jader, konec podpory ovladačů (max. v580), nutný větrák |
| **2× NVIDIA CMP 100-210 16GB** | 32 GB HBM2 | ~9 500 – 11 000 Kč | Novější architektura Volta (jako V100), má Tensor jádra, často prodávané už s chladičem | Omezená rychlost PCIe sběrnice, vyšší cena |
| **2× NVIDIA Tesla P40 24GB** | 48 GB GDDR5 | ~12 500 – 14 500 Kč | Obřích 48 GB VRAM (spustí i 70B modely) | Poloviční rychlost pamětí (346 GB/s = pomalejší generování textu) |
| **2× RTX 3060 12GB** | 24 GB GDDR6 | ~9 000 – 10 000 Kč | Mají vlastní tiché chladiče, HDMI výstupy, plnou podporu nových ovladačů a nulové bastlení | Jen 24 GB VRAM celkem (27B model jen v nižší kvantizaci Q4), pomalejší paměť (360 GB/s) |

---

## Část 3: Chlazení a kabely ke koupi (Hotová řešení bez 3D tisku)

Pokud zůstaneš u karet **Tesla P100**, tady je přesný nákupní seznam hotových dílů, které stačí jen přišroubovat a zapojit:

### 3.1 Hotové sady chlazení (kupované, s ventilátorem)

* **Varianta 1 (Kompletní set z AliExpressu nebo eBay):**
  * Hledej: **2× „Tesla P100 / P40 / K80 Cooling Fan Shroud + 9733 Blower Fan“**
  * **Co to je:** Kompletní balení obsahující vyrobený plastový adaptér, šroubky a silný radiální ventilátor **9733 (97×33 mm, 12V, 4-pin PWM)**.
  * **Cena:** Cca **430–600 Kč (18–25 USD) za kus** (pro dvě karty ~900–1 200 Kč).
* **Varianta 2 (Adaptér z eBay + ventilátor zvlášť):**
  * **2× „OrnateTech Blower Fan Adapter Kit for Nvidia Tesla P100/P40“** (~18 USD/ks na eBay) + **2× ventilátor 9733 12V 4-pin PWM** (~250 Kč/ks).
* **Pozor na délku:** Našroubovaný ventilátor s adaptérem prodlouží každou kartu o **8 až 9 cm** dozadu (celková délka karty pak bude ~35 cm).

### 3.2 Napájecí kabely a redukce ke zdroji

> **KRITICKÉ UPOZORNĚNÍ:** Karta Tesla P100 má vzadu **8-pin EPS konektor (stejný jako pro napájení procesoru)**, nikoliv běžný 8-pin PCIe pro grafické karty! Nikdy do ní nezapojuj kabel s nápisem PCIe / VGA bez redukce – mají opačně zapojené +12V a zem a okamžitě vyzkratuješ zdroj nebo kartu.

* **2× Napájecí redukce: „Dual 8-pin PCIe (Female) to 8-pin EPS/CPU (Male) Power Cable“**
  * Originální číslo dílu NVIDIA: `030-0571-000`.
  * Vezme dva běžné 8-pin (nebo 6+2 pin) PCIe kabely ze zdroje a bezpečně je převede na jeden serverový 8-pin EPS konektor pro kartu Tesla P100.
  * *Cena:* Cca **150–250 Kč za kus**.
* **1× Rozbočovač pro ventilátory + regulátor:**
  * **„PWM Fan Splitter Cable (1x 4-pin Female to 2x 4-pin Male)“** (~80 Kč, např. *Arctic PST Cable* nebo *Noctua NA-SYC1*) pro spojení obou ventilátorů do jednoho konektoru + případně **manuální PWM regulátor otáček** (~100 Kč).
* **1× „Add2PSU adaptér“ (pouze pokud použiješ dva zdroje):**
  * Malá destička za **~120 Kč** pro automatické spínání druhého zdroje.

---

## Část 4: Softwarová výbava (zmíněná ve videu)

* **Operační systém:** Ubuntu 24.04 LTS (s parametrem jádra `iommu=pt` v `/etc/default/grub`).
* **Ovladače GPU:** NVIDIA Driver verze **580** (poslední větev s plnou podporou architektury Pascal GP100).
* **Úprava firmwaru karet:** Nástroj `nvflash` pro přepnutí karet do grafického režimu (nutné u starých desek bez plné podpory *Above 4G Decoding* jako Dell T5810).
* **Nastavení příkonu:** Příkaz `sudo nvidia-smi -pl 150` (omezí spotřebu každé karty z 250 W na 150 W při zachování 99 % výkonu).
* **AI Backend a model:** Komunitní fork `llama.cpp` (Kmic) se zapnutým spekulativním dekódováním (MTP – 4 odhady) a model **Qwen 3.8 27B (Q6_K)**.