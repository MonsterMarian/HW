# Můj PC – co je zjištěné a co je odhad

Projekt **MŮJ PC** (3. karta v titulní liště Silicon Logic Studio, pohledy ECONOMIC a ANATOMY).
Kusovník: `silicon-logic-studio/src/engine/economic/catalog.js` (`MY_PC_ITEMS`), nabídky: `offers.js` (klíče `my_*`).
Diagnostika proběhla 10. 11. 2026 přes Windows (WMI/CIM, PnP ID, EDID, nvidia-smi, šířka PCIe linek).

**Až něco opravíš:** změň položku v `MY_PC_ITEMS` (`name`, `part`, `dims`, `dimsSrc`, `model`) a nabídky v `offers.js`.
U skříně/zdroje/chladiče pak odstraň „(ODHAD)“ z názvu a `dimsSrc` přepiš z `odhad:` na `ověřeno:`.

## Zjištěno softwarem (jisté)

| Díl | Zjištěno | Jak |
| --- | --- | --- |
| CPU | Intel Core i7-9700, 8C/8T, sSpec SRG13 (CPUID 906ED) | WMI Win32_Processor |
| Základní deska | ASUS PRIME B360-PLUS, Rev 1.xx, BIOS 3101 | WMI Win32_BaseBoard |
| RAM | 4× Kingston KHX2666C16/8G (HyperX Fury 8 GB DDR4-2666 CL16) = 32 GB | SPD přes WMI |
| Grafika | ASUS Dual RTX 3060 Ti OC 8 GB GDDR6X (DUAL-RTX3060TI-O8GD6X), v PCIEX16_1, linka x16 | PCI 10DE:24C9, subsystém 1043:88AE + VBIOS 94.04.94.00.85 (TechPowerUp) |
| SSD | Samsung 970 EVO Plus 500 GB, ve slotu **M.2_2** (běží x4, M.2_1 umí jen x2) | Get-PhysicalDisk, šířka PCIe linky |
| Síť / zvuk | Realtek RTL8111H, Realtek ALC887 (na desce) | PnP ID |
| Monitor | ASUS VA249 (EDID AUS24C1, vyroben 2020) | EDID |
| Klávesnice | ASUS ROG Strix Flare (původní, Cherry MX) | USB 0B05:1875 |
| USB audio | **mikrofon** (Windows ho vidí jen jako záznamové zařízení), čip C-Media 0D8C:0134 | USB ID, audio endpointy |

## Odhady – k opravě

| Díl | Co je v projektu | Proč odhad | Jak zjistit |
| --- | --- | --- | --- |
| **Skříň** | Endorfy Signum 300 Air (síťka, sklo, 4× 120mm ventilátor) | skříň software nevidí; zvolena běžná skříň v ČR | logo na čele / štítek vzadu |
| **Zdroj** | Endorfy Vero L5 Bronze 600 W (nemodulární) | zdroj software nevidí | štítek na boku zdroje |
| **Chladič CPU** | boxový Intel E97379-003 (hliníkový, dodávaný k i7-9700) | software vidí jen 3 nepojmenovaná „chladicí zařízení“ | podívat se přes okno skříně |
| Skříňové ventilátory | 3 vpředu + 1 vzadu (součást odhadnuté skříně) | počet nejde zjistit | spočítat |
| Grafika: OC / ne-OC | OC (DUAL-RTX3060TI-**O**8GD6X) | ne-OC verze vypadá stejně, VBIOS ukazuje na OC | štítek na kartě |
| Grafika: pořadí výstupů a poloha 2× 8 pin | HDMI + 3× DP, napájení na horní hraně u konce | nenašel jsem foto/výkres | podívat se na kartu |
| Monitor: HE / NA | VA249HE (HDMI + VGA) | EDID je pro VA249HE i VA249NA (DVI) stejné; vypadají stejně | štítek vzadu / jaký kabel vede do PC |
| Monitor: rámeček a podstavec | podstavec Ø ~205 mm, kulatý | výrobce neuvádí | změřit |
| RAM: barva chladiče | černá HyperX Fury (HX426C16FB2/8) | SPD kód je stejný pro černou/bílou/červenou | podívat se na moduly |
| Klávesnice: spínače, opěrka | Cherry MX (barva neznámá), opěrka ~75 mm | USB ID je stejné pro všechny varianty | sundat klávesu / změřit opěrku |
| **Myš** | obecná drátová RGB herní myš 122 × 68 × 36 mm | USB 30FA:1440 je čínský OEM „INSTANT“ prodávaný pod mnoha značkami | štítek na spodku myši |
| **Mikrofon** | USB mikrofon na trojnožce typu TONOR TC-777 | 0D8C:0134 mají TONOR TC-777/TC310, Auna CM900 aj. | nápis na mikrofonu |
| Reproduktory/sluchátka | nejsou v kusovníku | Windows vidí jen analogový výstup Realtek – co je do něj zapojené, nezjistím | doplnit ručně |
| Výška CPU a plocha IHS | 4,4 mm, IHS 33,5 × 33,5 mm | Intel výkres pouzdra nepublikuje | – |

## Schémata (2. fáze) – neověřené vnitřní detaily

Schéma celého PC je v pohledu SCHEMATIC projektu MŮJ PC (`presets/myPcSystem.js`, modely `devices/myPc.js`),
vnitřky dílů v `engine/myPcSubcircuits.js`. V popiscích bloků je u nejistých údajů „neověřeno“ / „odhad“:

| Kde | Neověřeno | Jak ověřit |
| --- | --- | --- |
| Deska | rozdělení 6 fází VRM, řadič a MOSFETy; Super I/O (nejspíš Nuvoton NCT6796D); na které HSIO linky jsou M.2/sloty/LAN | HWiNFO (Super I/O), foto desky bez chladičů |
| Grafika | VRM (~8–10 fází, uP9512R?), paměti 8× Micron MT61K256M32JE-19?, pořadí výstupů | GPU-Z (výrobce pamětí), foto PCB |
| i7-9700 | 1,5 MB L3 na jádro (12 MB / 8), VID ~1,2 V | HWiNFO (VID) |
| Zdroj | výrobce platformy, topologie, IC – pro Endorfy Vero L5 neexistuje teardown (a model je odhad) | štítek zdroje |
| SSD | počet pouzder NAND, typ DRAM, PMIC | – |
| RAM | výrobce čipů (SK hynix / Micron) | Thaiphoon Burner nebo HWiNFO (SPD) |
| Monitor | scaler, LED driver, deska zdroje, panel (AUO M238HVN01.0 je odhad) | – |
| Klávesnice | MCU NXP LPC11U37F je jen z výpisu vyhledávače (TechPowerUp), LED drivery | – |
| Myš, mikrofon | MCU, senzor, čip C-Media | rozebrat |
