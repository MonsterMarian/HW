// Registr všech fyzických součástek z projektů Studia – každá má na webu vlastní stránku.
// Díl = to, co jde fyzicky vzít do ruky (pouzdro, modul, deska, kabel), ne funkční blok uvnitř čipu.
//
// Pole: id, name, kind (kategorie), maker, in (na čem/v čem sedí), projects (jen u dílů bez `in`; děti je dědí),
// bom (id položky kusovníku v economic/catalog.js → 3D model a ceny), drill (klíč podobvodu → schéma a křemík),
// root (id projektu, jehož L1 schéma je tenhle díl celý), model / schema = [úroveň, poznámka] přesnosti.
//
// Úrovně přesnosti modelu: 'doc' přesně podle dokumentace, 'partial' dokumentace + odhad, 'estimate' odhad,
// 'none' model není. `model` = tvar a rozměry (3D), `schema` = vnitřní zapojení a chování (schéma / simulace).
// U položek kusovníku se `model` bez ruční hodnoty odvodí z `dimsSrc` (ověřeno / odhad).

import { NV1_BOM, P100_PC_BOM, MY_PC_BOM, MY_PC_P100_BOM } from '../engine/economic/catalog.js';

export const FIDELITY = {
  doc: { label: 'PŘESNĚ PODLE DOKUMENTACE', short: 'DOKUMENTACE', color: '#5fbf7f' },
  partial: { label: 'ČÁSTEČNĚ: DOKUMENTACE + ODHAD', short: 'ČÁSTEČNĚ', color: '#e0a640' },
  estimate: { label: 'ODHAD', short: 'ODHAD', color: '#e0605a' },
  none: { label: 'MODEL NENÍ', short: 'BEZ MODELU', color: '#7a7d85' },
};
const RANK = ['doc', 'partial', 'estimate', 'none'];

export const KINDS = ['Sestava', 'Deska a karta', 'Čip', 'Paměť', 'Úložiště', 'Napájení', 'Chlazení', 'Konektor a kabel', 'Pasivní', 'Periferie', 'Materiál'];

const BOM = new Map(); // první výskyt vyhrává (projekt 4 přepisuje poznámky dílů pro svou sestavu)
for (const it of [...NV1_BOM, ...P100_PC_BOM, ...MY_PC_BOM, ...MY_PC_P100_BOM]) if (!BOM.has(it.id)) BOM.set(it.id, it);
export const bomItem = (id) => BOM.get(id);

const RAW = [
  // ── Projekt NV1: Diamond Edge 3D 2120 ───────────────────────────────────────────────────────────────
  { id: 'edge3d', name: 'Diamond Edge 3D 2120', kind: 'Deska a karta', maker: 'Diamond Multimedia', projects: ['nv1'], root: 'nv1',
    model: ['partial', 'Obrys karty a rozmístění součástek odměřené z fotky (±2 mm); spoje nejsou layout Diamondu.'],
    schema: ['partial', 'Zapojení a časování podle datasheetu STG2000 a STG1732/64; registrová mapa NV1 je vlastní.'] },
  { id: 'nv1', name: 'NVIDIA NV1 / SGS-Thomson STG2000X', kind: 'Čip', maker: 'NVIDIA · SGS-Thomson', in: 'edge3d', bom: 'nv1', drill: 'NV1_CORE',
    schema: ['partial', 'Rozhraní PCI, sběrnice MD a CRTC podle datasheetu STG2000; 3D kvadratický engine se nesimuluje, floorplan die je předpoklad.'] },
  { id: 'stg1764', name: 'SGS-Thomson STG1764X', kind: 'Čip', maker: 'SGS-Thomson', in: 'edge3d', bom: 'ramdac', drill: 'RAMDAC_STG1764',
    schema: ['partial', 'PLL a registry podle datasheetu STG1732/64; FIFO a zpoždění DAC jsou v modelu zjednodušené.'] },
  { id: 'dram_256k16', name: 'DRAM 256K × 16 (FPM, SOJ-40)', kind: 'Paměť', maker: 'Hyundai (HY514260B na fotce)', in: 'edge3d', bom: 'dram', drill: 'DRAM_256K16',
    schema: ['partial', 'Obecná FPM DRAM 256K×16 s pozdním zápisem; na kartě jsou Hyundai HY514260B, model je obecný.'] },
  { id: 'ad1845', name: 'Analog Devices AD1845JP', kind: 'Čip', maker: 'Analog Devices', in: 'edge3d', bom: 'codec', drill: 'AD1845',
    schema: ['partial', 'Vývody a role kodeku podle datasheetu; vnitřek je zjednodušený ΣΔ modulátor 1. řádu.'] },
  { id: 'eprom_27c256', name: 'EPROM 27C256 (video BIOS)', kind: 'Paměť', maker: 'různí výrobci', in: 'edge3d', bom: 'eprom', drill: 'EPROM_27C256',
    schema: ['partial', 'Organizace 32K × 8 a čtení podle standardu 27C256; obsah ROM je vlastní (55AA + kontrolní součet).'] },
  { id: 'xtal_12096', name: 'Krystal 12,096 MHz (HC-49/U)', kind: 'Pasivní', maker: 'neznámý (potisk Z12.096M)', in: 'edge3d', bom: 'xtal_12',
    schema: ['doc', 'Kmitočet přečtený z potisku na fotce karty; reference pro 3 PLL v STG1764X.'] },
  { id: 'pi5c3245', name: 'Pericom PI5C3245Q', kind: 'Čip', maker: 'Pericom', in: 'edge3d', bom: 'busswitch',
    schema: ['partial', 'Čtyři kusy U25–U28 simulované jako jeden 32bit spínač; směr pozná podle nebuzené strany.'] },
  { id: 'nvsgp', name: 'NVIDIA nvSGP', kind: 'Čip', maker: 'NVIDIA', in: 'edge3d', bom: 'nvsgp',
    schema: ['estimate', 'Vnitřek není zdokumentovaný; v modelu průchozí rozhraní mezi DAC a lištou J5.'] },
  { id: 'hdr2x5', name: 'Kolíková lišta 2 × 5 (J5, J6)', kind: 'Konektor a kabel', maker: 'obecná', in: 'edge3d', bom: 'hdr2x5',
    schema: ['doc', 'Pasivní propojení; J5 = PORT A Saturn padu.'] },
  { id: 'de15', name: 'Konektor DE-15 (VGA)', kind: 'Konektor a kabel', maker: 'obecný', in: 'edge3d', bom: 'de15',
    schema: ['doc', 'Zapojení podle standardu VGA (RGB, HSYNC, VSYNC).'] },
  { id: 'gameport_10p', name: 'Zásuvka game portu 10P10C', kind: 'Konektor a kabel', maker: 'obecná', in: 'edge3d', bom: 'rj45',
    schema: ['partial', 'Pasivní konektor; kontakty podle karty, zapojení P1 v modelu nevyužité.'] },
  { id: 'jack35', name: 'Jack 3,5 mm stereo (3×)', kind: 'Konektor a kabel', maker: 'obecný', in: 'edge3d', bom: 'jack',
    schema: ['doc', 'Pasivní konektor (line in, line out, mikrofon).'] },
  { id: 'pci_edge', name: 'Hrana PCI 32 bit 5 V (J1)', kind: 'Konektor a kabel', maker: '–', in: 'edge3d',
    model: ['doc', 'Kontakty a 5V klíč (kontakty 50/51) podle specifikace PCI 2.1.'],
    schema: ['doc', 'Skutečné transakce PCI (FRAME#, IRDY#, TRDY#, DEVSEL#) podle PCI 2.1.'] },
  { id: 'lm2941', name: 'Stabilizátor LM2941CT (U18)', kind: 'Napájení', maker: 'National Semiconductor', in: 'edge3d',
    model: ['none', 'Je vidět na fotce karty (TO-220 naležato vpravo dole), v 3D modelu karty chybí.'],
    schema: ['none', 'Napájení karty se nesimuluje.'] },
  { id: 'eeprom_93c46', name: 'EEPROM 93C46', kind: 'Paměť', maker: 'neznámý', in: 'edge3d',
    model: ['none', 'Je na fotce karty, v modelu chybí.'], schema: ['none', 'Nesimuluje se.'] },
  { id: 'crt_monitor', name: 'VGA CRT monitor 14"', kind: 'Periferie', maker: 'obecný', projects: ['nv1'], bom: 'crt',
    schema: ['partial', 'Skládá obraz jen z napětí RGB a časování syncu (režimy VESA); obrazovka sama je obecná.'] },
  { id: 'speakers', name: 'Aktivní reproduktory 2.0', kind: 'Periferie', maker: 'obecné', projects: ['nv1'], bom: 'speakers',
    schema: ['estimate', 'Obecný zvukový výstup z line out.'] },
  { id: 'saturn_pad', name: 'Sega Saturn ovladač', kind: 'Periferie', maker: 'Sega', projects: ['nv1'], bom: 'pad',
    schema: ['partial', 'Čtení přes TH/TR podle portu A Saturnu; tvar padu je obecný model.'] },

  // ── Projekt AI PC: Dell T5810 + 2× Tesla P100 ───────────────────────────────────────────────────────
  { id: 'ai_pc', name: 'AI PC – Dell T5810 + 2× Tesla P100', kind: 'Sestava', maker: 'sestava z videa', projects: ['p100pc'], root: 'p100pc',
    model: ['partial', 'Díly z kusovníku; polohy uvnitř T5810 jsou odhad (sloty po 20,32 mm ověřené z manuálu).'],
    schema: ['partial', 'Napájení podle veřejných pinoutů (PB-08248, manuál Dell); simulované napětí a proudy.'] },
  { id: 't5810', name: 'Dell Precision Tower 5810', kind: 'Deska a karta', maker: 'Dell', in: 'ai_pc', bom: 'dell_t5810', drill: 't5810_platform',
    schema: ['partial', 'Sloty a linky podle manuálu Dell; most PCI ve slotu 6 neověřen.'] },
  { id: 'xeon_e5_1650v3', name: 'Intel Xeon E5-1650 v3', kind: 'Čip', maker: 'Intel', in: 't5810', bom: 'cpu', drill: 'xeon_die',
    schema: ['partial', 'Bloky die (kruh, LLC, IMC, PCU+FIVR) podle veřejných popisů Haswell-EP; tranzistory podle procesu Intel 22 nm.'] },
  { id: 'c612', name: 'Intel C612 (PCH)', kind: 'Čip', maker: 'Intel', in: 't5810', drill: 'c612_pch',
    model: ['none', 'Na desce Dellu není samostatný 3D model.'],
    schema: ['partial', 'Rozhraní podle datasheetu C610/X99 (DMI 2.0, PCIe 2.0); vnitřní bloky princip.'] },
  { id: 'dell_psu685', name: 'Zdroj Dell 685 W (vestavěný)', kind: 'Napájení', maker: 'Dell', in: 't5810',
    model: ['estimate', 'Je součástí modelu skříně T5810, vlastní tvar odhadnut.'],
    schema: ['partial', 'Jen výstupy podle manuálu (2× PCIe 6 pin přes PSU extended card).'] },
  { id: 'rdimm_m393', name: 'Samsung M393A1G40EB1 (DDR4 ECC RDIMM 8 GB)', kind: 'Paměť', maker: 'Samsung', in: 't5810', bom: 'ram', drill: 'rdimm_module',
    schema: ['partial', 'Organizace 1Rx4 podle datasheetu; raw card a štítek modulu neověřeny.'] },
  { id: 'ddr4_k4a4g045', name: 'Samsung K4A4G045WE (DDR4 4 Gb ×4)', kind: 'Paměť', maker: 'Samsung', in: 'rdimm_m393', drill: 'ddr4_chip',
    model: ['partial', 'Pouzdro FBGA podle JEDEC, rozměry die odhad.'],
    schema: ['partial', 'Banky, buňky 1T1C a sense amp podle obecného DDR4; vnitřní layout Samsungu neveřejný.'] },
  { id: 'ddr4_rcd', name: 'Registr RCD (DDR4 RDIMM)', kind: 'Čip', maker: 'neznámý (IDT / Montage / Inphi)', in: 'rdimm_m393', drill: 'ddr4_rcd',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Funkce podle JEDEC DDR4RCD; výrobce na modulu neověřen.'] },
  { id: 'tesla_p100', name: 'NVIDIA Tesla P100 16 GB PCIe', kind: 'Deska a karta', maker: 'NVIDIA', in: 'ai_pc', projects: ['p100pc', 'mypc_p100'], bom: 'p100', drill: 'p100_board',
    schema: ['partial', 'Napájení a hrana podle PB-08248; rozdělení VRM neveřejné.'] },
  { id: 'gp100', name: 'NVIDIA GP100', kind: 'Čip', maker: 'NVIDIA · TSMC', in: 'tesla_p100', drill: 'gp100_die',
    model: ['partial', 'CoWoS + 4× HBM2 podle die shotu a whitepaperu; rozměry substrátu odhad.'],
    schema: ['partial', 'GPC/SM podle whitepaperu Pascal; tranzistory podle procesu TSMC 16 nm FinFET.'] },
  { id: 'hbm2_stack', name: 'HBM2 stack 4 GB (4-Hi)', kind: 'Paměť', maker: 'Samsung', in: 'tesla_p100', drill: 'hbm2_stack',
    model: ['partial', 'Vrstvy DRAM + logic die podle die shotu; přesná výška odhad.'],
    schema: ['partial', 'Kanály a šíře 1024 bit podle JEDEC HBM2; vnitřek princip.'] },
  { id: 'shroud', name: 'Adaptér chlazení (shroud) pro P100', kind: 'Chlazení', maker: 'neznačkový', projects: ['p100pc', 'mypc_p100'], bom: 'shroud',
    schema: ['none', 'Pasivní plast, schéma nemá.'] },
  { id: 'bfb1012vh', name: 'Delta BFB1012VH (radiální ventilátor 9733)', kind: 'Chlazení', maker: 'Delta Electronics', projects: ['p100pc', 'mypc_p100'], bom: 'blower',
    schema: ['partial', 'Proud 1,5 A a 4 pin PWM podle datasheetu Delta; otáčky v simulaci podle střídy.'] },
  { id: 'k620', name: 'NVIDIA Quadro K620 2 GB', kind: 'Deska a karta', maker: 'NVIDIA', in: 'ai_pc', bom: 'k620', drill: 'k620_board',
    schema: ['partial', 'Bloky karty podle datasheetu 75509; počet čipů DDR3 a VRM neověřeny.'] },
  { id: 'gm107', name: 'NVIDIA GM107', kind: 'Čip', maker: 'NVIDIA · TSMC', in: 'k620', drill: 'gm107_die',
    model: ['partial', 'Pouzdro flip-chip, rozměry die odhad.'],
    schema: ['partial', '3 aktivní SMM dopočtené z 384 CUDA jader; tranzistory podle TSMC 28 nm.'] },
  { id: 'evo870', name: 'Samsung 870 EVO 1 TB (2,5" SATA)', kind: 'Úložiště', maker: 'Samsung', in: 'ai_pc', bom: 'ssd', drill: 'sata_ssd',
    schema: ['partial', 'Řadič, LPDDR4 a NAND podle datasheetu; regulátory a počet vrstev NAND neověřeny.'] },
  { id: 'mkx', name: 'Samsung MKX (S4LR059)', kind: 'Čip', maker: 'Samsung', in: 'evo870', drill: 'samsung_mkx',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Funkce (FTL, ECC, TurboWrite) z datasheetu; vnitřek princip.'] },
  { id: 'nand_k90vgy8', name: 'Samsung V-NAND TLC (K90VGY8)', kind: 'Paměť', maker: 'Samsung', in: 'evo870', drill: 'cell_nand',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Řetězec V-NAND princip; počet vrstev neověřen (128/133).'] },
  { id: 'gx650', name: 'Seasonic Core GX-650 ATX 3', kind: 'Napájení', maker: 'Seasonic', projects: ['p100pc', 'mypc_p100'], bom: 'psu2', drill: 'atx_psu_inside',
    schema: ['partial', 'Ověřeno jen full-bridge LLC, bulk 330 µF, filtr, OVP; ostatní díly podle sourozence GX-750 (Cybenetics).'] },
  { id: 'add2psu', name: 'Add2PSU modul', kind: 'Napájení', maker: 'neznačkový', projects: ['p100pc', 'mypc_p100'], bom: 'add2psu', drill: 'add2psu_inside',
    schema: ['partial', 'Relé sepnuté z napájení prvního zdroje (bez diody); deska z fotek prodejců.'] },
  { id: 'nv_030_0571', name: 'NVIDIA 030-0571-000 (2× PCIe 8 pin → EPS 8 pin)', kind: 'Konektor a kabel', maker: 'NVIDIA', projects: ['p100pc', 'mypc_p100'], bom: 'eps_cable', drill: 'eps_adapter_wiring',
    schema: ['doc', 'Zapojení podle NVIDIA PB-08248 obr. 4.'] },
  { id: 'td404', name: 'ModDIY TD404 (PWM regulátor)', kind: 'Chlazení', maker: 'ModDIY', projects: ['p100pc', 'mypc_p100'], bom: 'pwm_ctrl', drill: 'pwm_hub_inside',
    schema: ['estimate', 'U1 jako astabilní 555 je odhad z fotky desky FAN-K02; regulátor U2 neověřen.'] },
  { id: 'mx6', name: 'Arctic MX-6 4 g', kind: 'Materiál', maker: 'Arctic', projects: ['p100pc', 'mypc_p100'], bom: 'paste',
    schema: ['none', 'Materiál, schéma nemá.'] },
  { id: 'arctic_p12', name: 'Arctic P12 PWM PST 120 mm', kind: 'Chlazení', maker: 'Arctic', projects: ['p100pc'], bom: 'case_fan', drill: 'pwm_fan_inside',
    schema: ['partial', 'Obecný 1fázový BLDC s PWM; řadič ventilátoru neověřen.'] },

  // ── Projekt MŮJ PC (a MŮJ PC + 2× P100) ─────────────────────────────────────────────────────────────
  { id: 'my_pc', name: 'Můj PC – i7-9700 + RTX 3060 Ti', kind: 'Sestava', maker: 'vlastní sestava', projects: ['mypc'], root: 'mypc',
    model: ['partial', 'Díly z kusovníku; skříň, zdroj a chladič jsou odhad (viz MujPC_odhady.md).'],
    schema: ['partial', 'Zapínací sekvence a sběrnice podle manuálu desky a datasheetů; zdroj odhad.'] },
  { id: 'my_pc_p100', name: 'Můj PC + 2× Tesla P100 (návrh)', kind: 'Sestava', maker: 'návrh', projects: ['mypc_p100'], root: 'mypc_p100',
    model: ['partial', 'Díly z obou projektů; výřez v čele skříně podle odhadnuté skříně.'],
    schema: ['partial', 'Linky PCIEX16_1 x16 a PCIEX16_2 x4 podle manuálu desky; zdroj 1 odhad.'] },
  { id: 'b360_plus', name: 'ASUS PRIME B360-PLUS', kind: 'Deska a karta', maker: 'ASUS', projects: ['mypc', 'mypc_p100'], bom: 'my_mobo', drill: 'mypc_board',
    schema: ['partial', 'Bloky a linky podle manuálu E13832; Super I/O ověřený, fáze VRM neověřené.'] },
  { id: 'b360_pch', name: 'Intel B360 (PCH)', kind: 'Čip', maker: 'Intel', in: 'b360_plus', drill: 'b360_pch',
    model: ['partial', 'Pouzdro FCBGA a die shot podle fotky; rozměry die odhad.'],
    schema: ['partial', 'Rozhraní podle datasheetu Intel 300 Series; tranzistory podle procesu Intel 14 nm.'] },
  { id: 'nct6796d', name: 'Nuvoton NCT6796D (Super I/O)', kind: 'Čip', maker: 'Nuvoton', in: 'b360_plus', drill: 'nct6796d',
    model: ['partial', 'LQFP-128 – typ pouzdra neověřen.'],
    schema: ['partial', 'Ověřeno čtením čipu (LibreHardwareMonitor); funkce podle datasheetu, vnitřek princip.'] },
  { id: 'rtl8111h', name: 'Realtek RTL8111H', kind: 'Čip', maker: 'Realtek', in: 'b360_plus', drill: 'rtl8111h',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Rozhraní PCIe x1 + 1 Gb/s podle manuálu desky; vnitřek princip.'] },
  { id: 'alc887', name: 'Realtek ALC887-VD2', kind: 'Čip', maker: 'Realtek', in: 'b360_plus', drill: 'alc887',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'HD Audio kodek podle manuálu desky; vnitřek princip.'] },
  { id: 'asm1083', name: 'ASMedia ASM1083 (most PCIe → PCI)', kind: 'Čip', maker: 'ASMedia', in: 'b360_plus', drill: 'pci_target',
    model: ['none', 'Samostatný 3D model není.'], schema: ['estimate', 'Zastoupen obecným PCI targetem.'] },
  { id: 'bios_spi', name: 'SPI flash 128 Mb (BIOS 3101)', kind: 'Paměť', maker: 'neznámý', in: 'b360_plus', drill: 'spi_flash',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Velikost a verze BIOSu ověřené; výrobce čipu ne.'] },
  { id: 'b360_vrm', name: 'VRM desky (DIGI+, 6 fází)', kind: 'Napájení', maker: 'ASUS', in: 'b360_plus', drill: 'vrm_multiphase',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Vcore 1,20 V a VCCIO 1,048 V změřené; řadič a fáze neověřené.'] },
  { id: 'i7_9700', name: 'Intel Core i7-9700', kind: 'Čip', maker: 'Intel', in: 'b360_plus', bom: 'my_cpu', drill: 'cfl_die',
    schema: ['partial', 'Bloky die podle die shotu Coffee Lake 8+2; tranzistory podle IEDM 2014 (Intel 14 nm).'] },
  { id: 'intel_box_cooler', name: 'Intel E97379-003 (boxový chladič)', kind: 'Chlazení', maker: 'Intel', projects: ['mypc', 'mypc_p100'], bom: 'my_cooler', drill: 'pwm_fan_inside',
    schema: ['estimate', 'Obecný PWM ventilátor; typ chladiče je odhad (neověřen pohledem).'] },
  { id: 'fury_8g', name: 'Kingston HyperX Fury 8 GB DDR4-2666', kind: 'Paměť', maker: 'Kingston', projects: ['mypc', 'mypc_p100'], bom: 'my_ram', drill: 'fury_module',
    schema: ['partial', 'Organizace 1Rx8 a SPD podle datasheetu; výrobce čipů neověřen.'] },
  { id: 'ddr4_8g_x8', name: 'Čip DDR4 8 Gb ×8 (na Fury)', kind: 'Paměť', maker: 'neznámý', in: 'fury_8g', drill: 'ddr4_8g_x8',
    model: ['estimate', 'Pouzdro FBGA-78 podle JEDEC, rozměry die odhad.'],
    schema: ['partial', 'Obecný DDR4 8 Gb ×8; výrobce čipu neověřen (Thaiphoon Burner).'] },
  { id: 'spd_ee1004', name: 'SPD EEPROM EE1004 (na Fury)', kind: 'Paměť', maker: 'neznámý', in: 'fury_8g', drill: 'spd_ee1004',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Organizace podle JEDEC EE1004; obsah SPD (2666 CL16) z datasheetu modulu.'] },
  { id: 'rtx3060ti', name: 'ASUS Dual GeForce RTX 3060 Ti OC 8 GB GDDR6X', kind: 'Deska a karta', maker: 'ASUS', projects: ['mypc'], bom: 'my_gpu', drill: 'mypc_gpu_board',
    schema: ['partial', 'Bloky karty podle techspec ASUS; VRM (uP9512R?) a pořadí výstupů neověřené.'] },
  { id: 'ga104', name: 'NVIDIA GA104-202', kind: 'Čip', maker: 'NVIDIA · Samsung Foundry', in: 'rtx3060ti', drill: 'ga104_die',
    model: ['partial', 'Rozměry die podle veřejných údajů; pouzdro odhad.'],
    schema: ['partial', 'GPC/SM podle whitepaperu Ampere; tranzistory podle procesu Samsung 8N.'] },
  { id: 'gddr6x', name: 'Micron GDDR6X 8 Gb ×32', kind: 'Paměť', maker: 'Micron', in: 'rtx3060ti', drill: 'gddr6x_chip',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'GDDR6X ověřeno; přesné označení čipu (MT61K256M32JE-19?) ne.'] },
  { id: 'up9512r', name: 'uPI uP9512R (řadič VRM grafiky)', kind: 'Napájení', maker: 'uPI Semiconductor', in: 'rtx3060ti', drill: 'vrm_multiphase',
    model: ['none', 'Samostatný 3D model není.'], schema: ['estimate', 'Řadič odhadnut podle podobných karet; neověřeno fotkou PCB.'] },
  { id: 'evo970plus', name: 'Samsung 970 EVO Plus 500 GB', kind: 'Úložiště', maker: 'Samsung', projects: ['mypc', 'mypc_p100'], bom: 'my_ssd', drill: 'evo_plus_ssd',
    schema: ['partial', 'Řadič Phoenix, LPDDR4 a V-NAND podle datasheetu; PMIC a pouzdra NAND neověřené.'] },
  { id: 'phoenix', name: 'Samsung Phoenix (S4LR020)', kind: 'Čip', maker: 'Samsung', in: 'evo970plus', drill: 'phoenix_ctl',
    model: ['partial', 'Pouzdro flip-chip, rozměry die odhad.'], schema: ['partial', 'Funkce řadiče NVMe podle datasheetu; vnitřek princip.'] },
  { id: 'vnand_v5', name: 'Samsung V-NAND V5 TLC 256 Gb', kind: 'Paměť', maker: 'Samsung', in: 'evo970plus', drill: 'vnand_die',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', '92 vrstev podle Samsungu; počet a pouzdra čipů neověřené.'] },
  { id: 'signum300', name: 'Endorfy Signum 300 Air (skříň)', kind: 'Sestava', maker: 'Endorfy', projects: ['mypc', 'mypc_p100'], bom: 'my_case',
    schema: ['none', 'Skříň schéma nemá.'] },
  { id: 'stratus120', name: 'Endorfy Stratus 120 PWM (skříňové ventilátory)', kind: 'Chlazení', maker: 'Endorfy', in: 'signum300', drill: 'pwm_fan_inside',
    model: ['estimate', 'Počet a typ ventilátorů odhad (podle odhadnuté skříně).'], schema: ['estimate', 'Obecný PWM ventilátor.'] },
  { id: 'vero_l5', name: 'Endorfy Vero L5 Bronze 600 W', kind: 'Napájení', maker: 'Endorfy', projects: ['mypc', 'mypc_p100'], bom: 'my_psu', drill: 'mypc_psu',
    schema: ['estimate', 'Typ zdroje je odhad (štítek neověřen); bloky podle typického 80+ Bronze zdroje.'] },
  { id: 'va249he', name: 'ASUS VA249HE 23,8"', kind: 'Periferie', maker: 'ASUS', projects: ['mypc', 'mypc_p100'], bom: 'my_monitor', drill: 'va249_inside',
    schema: ['partial', 'Model ověřený z EDID (AUS24C1); scaler a panel neověřené.'] },
  { id: 'va249_scaler', name: 'Scaler monitoru VA249HE', kind: 'Čip', maker: 'neznámý', in: 'va249he', drill: 'lcd_scaler',
    model: ['none', 'Samostatný 3D model není.'], schema: ['estimate', 'Typ scaleru nezjištěn; funkce princip.'] },
  { id: 'va249_panel', name: 'Panel VA 1920 × 1080 (AUO M238HVN01.0?)', kind: 'Periferie', maker: 'AUO (odhad)', in: 'va249he', drill: 'tcon_panel',
    model: ['partial', 'Rozměry hlavy monitoru ověřené; panel samotný odhad.'], schema: ['estimate', 'Typ panelu odhadnut.'] },
  { id: 'strix_flare', name: 'ASUS ROG Strix Flare', kind: 'Periferie', maker: 'ASUS', projects: ['mypc', 'mypc_p100'], bom: 'my_keyboard', drill: 'mypc_keyboard',
    schema: ['partial', 'MCU NXP LPC11U37F a matice Cherry MX podle teardownu; barva spínačů neznámá.'] },
  { id: 'lpc11u37', name: 'NXP LPC11U37F (MCU klávesnice)', kind: 'Čip', maker: 'NXP', in: 'strix_flare', drill: 'cortex_m0',
    model: ['none', 'Samostatný 3D model není.'], schema: ['partial', 'Jádro Cortex-M0 podle ARM; firmware ASUS neveřejný.'] },
  { id: 'usb_mouse', name: 'USB herní myš (OEM 30FA:1440)', kind: 'Periferie', maker: 'OEM „INSTANT“', projects: ['mypc', 'mypc_p100'], bom: 'my_mouse', drill: 'mypc_mouse',
    schema: ['estimate', 'MCU a optický senzor neověřené; obecná USB HID myš.'] },
  { id: 'usb_mic', name: 'USB mikrofon (C-Media 0D8C:0134)', kind: 'Periferie', maker: 'neznámý (typ TONOR TC-777)', projects: ['mypc', 'mypc_p100'], bom: 'my_mic', drill: 'mypc_mic',
    schema: ['partial', 'USB ID kodeku C-Media ověřené z Windows; kapsle a předzesilovač obecné.'] },
];

const derive = (src) => (!src ? null : /^odhad/i.test(src) ? 'estimate' : /odhad|neověř/i.test(src) ? 'partial' : 'doc');

export const PARTS = RAW.map((p) => {
  const item = p.bom ? BOM.get(p.bom) : null;
  const model = p.model ?? (item ? [derive(item.dimsSrc), item.dimsSrc] : ['none', 'Model není.']);
  const schema = p.schema ?? ['none', 'Schéma není.'];
  return { ...p, item, model, schema };
});

export const partById = (id) => PARTS.find((p) => p.id === id);
// Díl, kterému odpovídá součástka ve 3D scéně / schématu (podle podobvodu nebo typu); 'self' = kořen „celý díl“.
export const partForComp = (comp) => (comp.id === 'self' ? null : PARTS.find((p) => p.drill && (p.drill === comp.drill || p.drill === comp.type)) ?? null);
// Kořen „celý díl“ nad podobvodem: jedna součástka s 3D modelem z kusovníku, dvojklik vede do `drill`.
export const modelRoot = (name, drill) => ({ components: [{ id: 'self', type: 'PC_BLOCK', label: name, drill, x: 0, y: 0, sx: 0, sy: 0, inputs: {}, outputs: {} }], wires: [] });
export const childrenOf = (id) => PARTS.filter((p) => p.in === id);
export const pathOf = (p) => (p.in ? [...pathOf(partById(p.in)), p] : [p]);
export const projectsOf = (p) => p.projects ?? projectsOf(partById(p.in));
// Celková přesnost = horší z modelu a schématu ('none' se nepočítá, pokud aspoň jedno existuje).
export const overallOf = (p) => {
  const lv = [p.model[0], p.schema[0]].filter((l) => l !== 'none');
  return lv.length ? lv.reduce((a, b) => (RANK.indexOf(b) > RANK.indexOf(a) ? b : a)) : 'none';
};
