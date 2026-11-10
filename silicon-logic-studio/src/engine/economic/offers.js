// Skutečné nabídky z e-shopů, dohledané 10. 11. 2026 (rešerše přes vyhledávač + stažení stránek).
// verified: 'fetched' = stránka stažena a cena přečtena; 'snippet' = cena z výpisu vyhledávače
// (obchod blokoval stažení, cena může být starší). priceCzk = přepočet kurzem ČNB, bez poštovného.
export const CHECKED = '2026-11-10';
export const RATES = { EUR: 24.36, USD: 21.762, GBP: 29.2, CAD: 15.427, date: '2026-11-09', source: 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt' };

const o = (shop, title, url, price, currency, priceCzk, condition, verified, remark) => ({ shop, title, url, price, currency, priceCzk, condition, verified, ...(remark ? { remark } : {}) });

export const OFFERS = {
  // ---------------------------------------------------------------- AI PC
  dell_t5810: {
    note: 'Samotný barebone se skoro neprodává. Kompletní T5810 se zdrojem 685 W je na Bazoši od 4 000 Kč a už obsahuje CPU i RAM, takže pak samostatný Xeon a paměti kupovat nemusíš. Repasy z e-shopů stojí 5 300–7 000 Kč.',
    offers: [
      o('Bazoš.cz', 'Dell Precision T5810 – Xeon E5-1630 v3 / 32GB DDR4 / 256GB SSD / GTX 1650 / zdroj 685W', 'https://pc.bazos.cz/inzerat/226158403/dell-precision-t5810-xeon-e5-1630-32gb-ddr4-gtx-1650.php', 3999, 'CZK', 3999, 'použité', 'fetched'),
      o('Pocitacezababku.cz', 'Dell Precision T5810 Xeon E5-1620 v3 / 16GB / 256GB SSD / FirePro W5100 / Win 11 Pro', 'https://www.pocitacezababku.cz/pocitac-dell-precision-t5810-xeon-e5-1620-v316256-ssddvdrwfirepro-w5100win-11-pro-rp664-16-256-w5100.phtml', 5346, 'CZK', 5346, 'repas', 'fetched'),
      o('Bazoš.cz', 'DELL 5810 – E5-1650 v4, GT 730, 16GB, 256GB SSD, zdroj 685W 80+ Gold, záruka 2 roky', 'https://pc.bazos.cz/inzerat/225231898/dell-5810-e5-1650-v4-gt-730-16gb-256gb-ssd-zaruka-w11.php', 5999, 'CZK', 5999, 'použité', 'fetched'),
      o('eBay.de', 'Dell Precision T5810 Barebone Workstation (bez CPU a RAM)', 'https://www.ebay.de/itm/324367714259', 295, 'USD', 6420, 'použité', 'snippet'),
      o('Bazoš.cz', 'Dell Precision 5810 – Xeon E5-2698 v4 (20 jader), 16GB ECC, RX 580 + Quadro K4200, zdroj 685W', 'https://pc.bazos.cz/inzerat/226164104/dell-precision-5810-20-core.php', 8000, 'CZK', 8000, 'použité', 'fetched'),
    ],
  },
  cpu: {
    note: 'Procesor stojí pár stovek korun. Na Bazoši ani Aukru jsem samostatný E5-1650 v3 nenašel, nabídky jsou z EU a USA (bez poštovného).',
    offers: [
      o('eBay.com', 'Lot of 4 Intel Xeon SR20J E5-1650 v3 (36 USD za 4 ks)', 'https://www.ebay.com/itm/156724801631', 9, 'USD', 196, 'použité', 'snippet'),
      o('pcserverandparts.com', 'Intel Xeon E5-1650 v3 3.50GHz 6C/12T LGA2011 SR20J Used', 'https://pcserverandparts.com/intel-xeon-e5-1650-v3-processor-3-50ghz-6-cores-12-threads-lga2011-2133-mhz-sr20j-used/', 7.99, 'USD', 174, 'použité', 'snippet'),
      o('gekko-computer.de', 'Intel Xeon E5-1650 v3 3.5GHz 15M SR20J (Socket 2011-3)', 'https://gekko-computer.de/en/p/Intel-CPU-Socket-2011-3-6-Core-Xeon-E5-1650-v3-3-5GHz-15M-SR20J', 27.5, 'EUR', 670, 'repas', 'fetched'),
    ],
  },
  ram: {
    note: 'Použitý 8GB DDR4 ECC RDIMM stojí na Bazoši 490–800 Kč za kus; nové kusy ~1 500 Kč.',
    offers: [
      o('Bazoš.cz', 'RAM 8GB DDR4 ECC 2133MHz SK hynix PC4-2133P 1Rx4', 'https://pc.bazos.cz/inzerat/224796399/ram-8gb-ddr4-ecc-2133mhz-sk-hynix-server-workstation.php', 490, 'CZK', 490, 'použité', 'fetched'),
      o('Bazoš.cz', 'RAM 8GB DDR4 ECC Registered 2400 MHz, SK hynix HMA41GR7AFR4N-UH', 'https://pc.bazos.cz/inzerat/225831580/ram-8gb-ddr4-ecc-registered-2400-mhz.php', 599, 'CZK', 599, 'použité', 'fetched'),
      o('Bazoš.cz', 'DDR4 RDIMM ECC 8GB 2133 Kingston KVR21R15S4/8 (sada 4 ks za 3 200 Kč)', 'https://pc.bazos.cz/inzerat/224233685/ddr4-rdimm-ecc-reg-8gb-2133-4x8gb.php', 800, 'CZK', 800, 'použité', 'fetched'),
      o('Bazoš.cz', 'Nové DataRam 8GB DDR4 ECC Registered 2666 MHz (faktura s DPH)', 'https://pc.bazos.cz/inzerat/224507541/nove-severove-pameti-dataram-8gb-ddr4-ecc-registered.php', 1490, 'CZK', 1490, 'nové', 'fetched'),
    ],
  },
  p100: {
    note: 'V Česku jsem P100 PCIe nenašel. Na eBay stojí 125–180 USD (2 700–3 900 Kč bez dopravy a cla), EU repas se zárukou ~321 €.',
    offers: [
      o('eBay.com', 'NVIDIA Tesla P100 16GB HBM2 PCIe 868199-001 900-2H400-0300-031 (Refurbished)', 'https://www.ebay.com/itm/205332994407', 124.99, 'USD', 2720, 'repas', 'snippet'),
      o('eBay.com', 'Tesla P100 16GB PCIe (cena přes agregátor gpudojo, 10. 11. 2026)', 'https://www.ebay.com/itm/267230831044', 180, 'USD', 3917, 'použité', 'snippet'),
      o('serverschmiede.com', 'Nvidia Tesla P100 16GB PCIe x16, PN 900-2H400-0300, Grade A', 'https://www.serverschmiede.com/en/nvidia-tesla-p100-gpu-computing-accelerator-16gb-pcie-x16-grafikkarte-workstation-vdi-server', 321, 'EUR', 7820, 'repas', 'fetched'),
    ],
  },
  shroud: {
    note: 'Všechny nalezené sady jsou jen adaptér (shroud) se šrouby a klíčem, BEZ ventilátoru – ten je samostatná položka.',
    offers: [
      o('eBay.com', 'Tesla P40 P100 V100 K80 M40 Blower Fan Adapter Kit Shroud, Bolts, Wrench', 'https://www.ebay.com/itm/256596789973', 19.95, 'USD', 434, 'nové', 'fetched'),
      o('OrnateTech', 'Tesla GPU Blower Fan Adapter Kit P40 P100 V100 (pro 9733)', 'https://ornatetech.us/products/nvidia-tesla-p40-p100-v100-k80-m40-blower-fan-adapter-kit-shroud-bolts-wrench', 19.95, 'USD', 434, 'nové', 'snippet'),
      o('Reyzer Systems', 'Tesla P40 P100 V100 K80 M40 Blower Fan Cooling Kit – for 97x33mm Fans', 'https://www.reyzersystems.com/cgi-bin/shop.cgi?i=B0DDJM7X4R', 19.95, 'USD', 434, 'nové', 'snippet'),
      o('Amazon.ca', 'Tesla P40 P100 V100 K80 M40 Blower Fan Cooling Kit (vč. dovozních poplatků)', 'https://www.amazon.ca/Tesla-P100-V100-Blower-Cooling/dp/B0DDJM7X4R', 43.42, 'CAD', 670, 'nové', 'snippet'),
    ],
  },
  blower: {
    note: 'Delta BFB1012VH (1,8 A) se prodává hlavně přes eBay z Číny (~9–13 USD + poštovné ~15 USD); u distributorů ~30 USD. Česká nabídka nenalezena.',
    offers: [
      o('eBay.de', 'Delta BFB1012VH 12V 2,70A 9733 4PIN Turbo Gebläse Lüfter', 'https://www.ebay.de/itm/396777645078', 9.17, 'USD', 200, 'použité', 'snippet'),
      o('eBay.de', 'Original Delta 97×97×33mm BFB1012VH 9733 12V 1.80A', 'https://www.ebay.de/itm/187524202637', 12.55, 'USD', 273, 'nové', 'snippet'),
      o('iCHOME', 'Delta BFB1012VH-AF00 (distributor, 1 ks)', 'https://ichome.com/product-detail/delta-product-groups/bfb1012vh-af00', 29.52, 'USD', 642, 'nové', 'snippet'),
    ],
  },
  k620: {
    note: 'Použitá K620 stojí na bazarech zhruba 400–700 Kč; aktivní nabídky jsou jen na Bazoši (CZ a SK), Aukro mělo jen ukončenou aukci za 513 Kč.',
    offers: [
      o('Bazoš.cz', 'NVIDIA Quadro K620 (Praha 6, plně funkční a otestovaná)', 'https://pc.bazos.cz/inzerat/224877518/nvidia-quadro-k620.php', 400, 'CZK', 400, 'použité', 'fetched'),
      o('Bazoš.cz', 'Nvidia Quadro K620 (Brno, plně funkční)', 'https://pc.bazos.cz/inzerat/225795952/nvidia-quadro-k620.php', 600, 'CZK', 600, 'použité', 'fetched'),
      o('Bazoš.sk', 'VGA NVIDIA Quadro K620 2GB (Nové Zámky)', 'https://pc.bazos.sk/inzerat/195825504/vga-nvidia-quadro-k620.php', 29, 'EUR', 706, 'použité', 'fetched'),
    ],
  },
  ssd: {
    note: 'Nový NV3 1 TB (2280) stojí v ČR asi 3 300–3 850 Kč. Pozor na záměnu s verzí 2230 (SNV3SM3/1T0).',
    offers: [
      o('Heureka.cz', 'Kingston NV3 1TB, SNV3S/1000G (nejnižší nabídka)', 'https://pevne-disky.heureka.cz/kingston-nv3-1tb-snv3s-1000g/', 3301, 'CZK', 3301, 'nové', 'snippet'),
      o('Smarty.cz', 'Kingston SSD NV3 1TB NVMe PCIe M.2 2280', 'https://www.smarty.cz/Kingston-SSD-NV3-1TB-NVMe-PCIe-M-2-2280-6000-4000MB-s--4p159154', 3590, 'CZK', 3590, 'nové', 'snippet'),
      o('Datart', 'SSD Kingston NV3 1TB NVMe (SNV3S/1000G)', 'https://www.datart.cz/ssd-kingston-nv3-1tb-nvme-snv3s-1000g.html', 3689, 'CZK', 3689, 'nové', 'fetched'),
      o('Alza.cz', 'Kingston NV3 1TB - SSD disk', 'https://www.alza.cz/kingston-nv3-1tb-d12487074.htm', 3689, 'CZK', 3689, 'nové', 'snippet'),
      o('TS Bohemia', 'Kingston NV3 SSD 1TB NVMe', 'https://www.tsbohemia.cz/kingston-nv3-ssd-1tb-nvme_d527299', 3699, 'CZK', 3699, 'nové', 'snippet'),
      o('Mironet.cz', 'Kingston NV3 SSD 1TB / M.2 2280 / PCIe 4.0 NVMe', 'https://www.mironet.cz/kingston-nv3-ssd-1tb-m2-2280-pcie-40-nvme-r6000mbps-w4000mbps+dp699536/', 3840, 'CZK', 3840, 'nové', 'fetched'),
    ],
  },
  m2_adapter: {
    note: 'Axagon PCEM2-N stojí v ČR 190–240 Kč, v balení je full height i low profile záslepka.',
    offers: [
      o('Heureka.cz', 'Axagon PCEM2-N (nejnižší nabídka)', 'https://radice.heureka.cz/axagon-pcem2-n/', 188, 'CZK', 188, 'nové', 'snippet'),
      o('Mironet.cz', 'AXAGON PCEM2-N, PCIe x4 - M.2 NVMe M-key adaptér', 'https://www.mironet.cz/axagon-pcem2n-pcie-x4-m2-nvme-mkey-slot-adapter+dp420552/', 219, 'CZK', 219, 'nové', 'fetched'),
      o('Datart', 'Řadič Axagon PCEM2-N - M.2 NVMe M-key slot', 'https://www.datart.cz/radic-axagon-pcem2-n-m-2-nvme-m-key-slot-pcem2-n.html', 229, 'CZK', 229, 'nové', 'fetched'),
      o('Smarty.cz', 'AXAGON PCEM2N PCIe x4 M.2 NVMe adaptér', 'https://www.smarty.cz/AXAGON-PCEM2N-PCIe-x4-M-2-NVMe-Mkey-slot-adapter-4p41933', 229, 'CZK', 229, 'nové', 'snippet'),
    ],
  },
  psu2: {
    note: 'Původní Focus GX-650 (ATX 2.4) se už prakticky neprodává (jediná nabídka 139 € na eBay.de). Dostupný nástupce je Seasonic Core GX-650 ATX 3.1 za ~1 900–2 100 Kč.',
    offers: [
      o('Mironet.cz', 'Seasonic Core GX-650 650W 80+ Gold (nástupce)', 'https://www.mironet.cz/seasonic-core-gx650-650w-80-gold-aktivni-pfc-120-mm+dp795360/', 1970, 'CZK', 1970, 'nové', 'fetched'),
      o('Amazon.de / alza.de (Geizhals)', 'Seasonic Core GX ATX 3 (2024) GX-650 650W ATX 3.1', 'https://geizhals.de/seasonic-core-gx-atx-3-2024-gx-650-650w-atx-3-1-srp-cgx651-a5a32sf-a3364404.html', 77.38, 'EUR', 1885, 'nové', 'fetched'),
      o('Alza.cz', 'Seasonic Core GX-650 ATX 3.1 (momentálně nedostupné)', 'https://www.alza.cz/seasonic-core-gx-650-atx-3-2024-d12744103.htm', 2099, 'CZK', 2099, 'nové', 'snippet'),
      o('eBay.de (Geizhals)', 'Seasonic Focus GX 650W ATX 2.4 (původní model)', 'https://geizhals.eu/seasonic-focus-gx-650w-atx-2-4-focus-gx-650-a2119971.html', 139.33, 'EUR', 3394, 'nové', 'fetched'),
    ],
  },
  add2psu: {
    note: 'Desky pro synchronizaci dvou zdrojů stojí 25–250 Kč. Cenu 26 Kč na Mironetu ověř v košíku. Kolink a ModDIY se spouštějí přes Molex, SATA varianta je na AliExpressu.',
    offers: [
      o('Mironet.cz', 'Kolink KL-AC-2PSU adaptér pro synchronizaci zdrojů (24 pin + Molex)', 'https://www.mironet.cz/kolink-dualnivicenasobny-napajeci-adapter-pro-synchronizaci-napajecich-jednotek+dp672749/', 26, 'CZK', 26, 'nové', 'fetched'),
      o('AliExpress', 'Dual PSU Adapter Board with LED, ATX 24Pin to SATA (Add2psu)', 'https://www.aliexpress.com/item/1005003779340741.html', 5.04, 'EUR', 123, 'nové', 'snippet'),
      o('ModDIY', 'ATX 24 Pin Multiple Power Supply Sync Start Adapter Board', 'https://www.moddiy.com/products/5326/ATX-24-Pin-Multiple-Power-Supply-State-Sync-Start-Adapter-Board-Card.html', 6.99, 'USD', 152, 'nové', 'fetched'),
      o('reichelt (elecena)', 'Kolink KL-AC-2PSU dual/multi power adapter', 'https://elecena.pl/product/29467111/kl-ac-2psu-kolink-dual-multi-power-adapter-for-combining-psu', 10.23, 'EUR', 249, 'nové', 'fetched'),
    ],
  },
  eps_cable: {
    note: 'V českých obchodech jsem redukci 2× PCIe 8 pin → EPS 8 pin nenašel, je to nákup ze zahraničí (220–330 Kč + poštovné). Pozor na směr: prodává se i obrácená varianta EPS → PCIe.',
    offers: [
      o('eBay.com', 'NVIDIA Power Cable 030-0571-000 Tesla K80 M60 M40 P100 P40', 'https://www.ebay.com/itm/123727768830', 9.98, 'USD', 217, 'nové', 'snippet'),
      o('Disctech (US)', 'NVIDIA Tesla 030-0571-000 GPU Power splitter cable', 'https://www.disctech.com/NVIDIA-030-0571-000-Internal-GPU-Cable-8pin-to-2-8pin-power-splitter', 13.99, 'USD', 304, 'nové', 'fetched'),
      o('MODDIY', 'NVIDIA Tesla P100/P40 GPU power cable (1× EPS 8 pin male → 2× PCIe 8 pin female)', 'https://www.moddiy.com/products/5996/NVIDIA-Tesla-K80-M40-M60-P40-P10-P100-GPU-8-Pin-PCIE-Power-Cable.html', 14.99, 'USD', 326, 'nové', 'fetched'),
      o('eBay.com', 'for Tesla K80 M60 M40 P100 V100 030-0571-000 Dual 8 To 8 Power Cable', 'https://www.ebay.com/itm/266252475214', 21.85, 'USD', 475, 'nové', 'snippet'),
      o('Serverschmiede.com', 'GPU Power Adapter 2× 8-Pin PCIe female → 1× 8-Pin EPS male, 030-0571-000', 'https://www.serverschmiede.com/en/generic-5-20cm-gpu-power-adapter-kabel-cable-2x-8-pin-pcie-female-to-1x-8-pin-eps-male-nvidia-tesla-k80-m60-p40-p100-v100-030-0571-000', 33, 'EUR', 804, 'repas', 'fetched'),
    ],
  },
  pwm_ctrl: {
    note: 'Jediná nabídka, kterou šlo ověřit na stránce. Podobné SATA regulátory 60 W jsou na Neweggu za 17–19 USD, ten ale stažení blokuje.',
    offers: [
      o('ModDIY', '12V 4 Pin PC Chassis PWM Fan Hub Speed Controller Powered by SATA (TD404)', 'https://www.moddiy.com/products/6699/12V-4-Pin-PC-Chassis-PWM-Fan-Hub-Speed-Controller-Powered-by-SATA.html', 9.99, 'USD', 217, 'nové', 'fetched'),
    ],
  },
  paste: {
    note: 'Běžně skladem v ČR za 144–189 Kč (Datart a Softcom ověřeny přímo).',
    offers: [
      o('Heureka.cz', 'ARCTIC MX-6 4 g ACTCP00080A (nejnižší nabídka)', 'https://teplovodive-pasty-a-pasky.heureka.cz/arctic-mx-6-4-g-actcp00080a/', 90, 'CZK', 90, 'nové', 'snippet'),
      o('TS Bohemia', 'ARCTIC MX-6 (4g)', 'https://www.tsbohemia.cz/arctic-mx-6-4g_d489940', 144, 'CZK', 144, 'nové', 'snippet'),
      o('Alza.cz', 'ARCTIC MX-6 Thermal Compound (4g)', 'https://www.alza.cz/arctic-mx-6-thermal-compound-4g-d7579370.htm', 169, 'CZK', 169, 'nové', 'snippet'),
      o('Softcom.cz', 'ARCTIC MX-6 4g', 'https://www.softcom.cz/eshop/arctic-mx-6-4g-ultimate-performance-thermal-paste_d271970.html', 179, 'CZK', 179, 'nové', 'fetched'),
      o('Datart', 'Teplovodivá pasta Arctic MX-6 4g (ACTCP00080A)', 'https://www.datart.cz/teplovodiva-pasta-arctic-cooling-mx-6-ultimate-performance-4g-actcp00080a', 189, 'CZK', 189, 'nové', 'fetched'),
    ],
  },
  case_fan: {
    note: 'Základní P12 PWM PST (ACFAN00120A) z českých obchodů mizí; nástupce P12 Pro PST má Alza od 159 Kč.',
    offers: [
      o('eBay.de', 'Arctic P12 PWM PST ACFAN00120A 120mm schwarz', 'https://www.ebay.de/itm/Arctic-P12-PWM-PST-ACFAN00120A-120mm-schwarz-Gehaeuseluefter-/202636822539', 4.99, 'EUR', 122, 'nové', 'snippet'),
      o('Smarty.cz', 'Arctic P12 PWM PST (ACFAN00120A)', 'https://www.smarty.cz/Arctic-P12-PWM-PST-4p22862', 139, 'CZK', 139, 'nové', 'snippet'),
      o('Caseking.de', 'Arctic P12 PWM PST Fan, black - 120mm', 'https://www.caseking.de/en/arctic-p12-pwm-pst-luefter-schwarz-120mm/LUAR-075.html', 6.9, 'EUR', 168, 'nové', 'snippet'),
      o('Heureka.cz', 'ARCTIC P12 PWM PST ACFAN00120A (nejnižší nabídka)', 'https://ventilatory-pc.heureka.cz/arctic-p12-pwm-pst-acfan00120a/', 211, 'CZK', 211, 'nové', 'snippet'),
      o('Dateks.lv', 'Arctic P12 PWM PST, Black', 'https://www.dateks.lv/en/cenas/ventilatori/282519-arctic-p12-pwm-pst-black', 17.35, 'EUR', 423, 'nové', 'snippet'),
    ],
  },

  // ---------------------------------------------------------------- karta NV1 (1995) a periferie
  nv1: {
    note: 'Samotný čip NV1 / STG2000X se nikde neprodává (Utsource, Win-source, AliExpress, eBay). Jediná cesta je celá karta Diamond Edge 3D 2120 jako sběratelský kus.',
    offers: [
      { alt: true, ...o('eBay.com', 'CELÁ KARTA: 1995 Nvidia NV1 Diamond Edge 3D 2120 (prodáno – orientační tržní cena)', 'https://www.ebay.com/itm/326790977304', 750, 'USD', 16322, 'použité', 'snippet', 'prodáno přes Best Offer') },
      { alt: true, ...o('eBay.co.uk', 'CELÁ KARTA: Rare Diamond Edge 3D 2120 PCI NVIDIA NV1 2 MB (Tested & Working)', 'https://www.ebay.co.uk/itm/167484296714', 1049, 'USD', 22828, 'použité', 'snippet') },
    ],
  },
  ramdac: {
    note: 'STG1764X nikde v nabídce není (Utsource 0 výsledků, Octopart bez distributora). Zdroj = dárcovská karta.',
    offers: [],
  },
  dram: {
    note: 'Seženeš jen přes Utsource a eBay (obvykle z Číny), 50–160 Kč za kus.',
    offers: [
      o('eBay.com', 'Lot 5 ks KM416C256BJ-6 (13,39 GBP za 5 ks)', 'https://www.ebay.com/itm/286017308166', 2.678, 'GBP', 78, 'nové', 'snippet'),
      o('Utsource', 'KM416C256BJ-6 (Samsung, SOJ-40)', 'https://www.utsource.net/itm/p/650070.html', 3.717, 'USD', 81, 'použité', 'fetched', 'od 5 ks 2,48 USD/ks, min. 2 ks'),
      o('Utsource', 'KM416C256DJ-6 (SEC, SOJ)', 'https://www.utsource.net/itm/p/11735568.html', 7.1568, 'USD', 156, 'nové', 'fetched'),
    ],
  },
  codec: {
    note: 'Jen dva obchody; AliExpress čip nenabízí.',
    offers: [
      o('Utsource', 'AD1845JP (Analog Devices, PLCC)', 'https://www.utsource.net/itm/p/12425877.html', 13.7172, 'USD', 299, 'použité', 'fetched'),
      o('eBay.com', '1pcs AD1845JP-REEL PLCC-68 (24.2×24.2)', 'https://www.ebay.com/itm/135602864547', 42.42, 'USD', 923, 'nové', 'snippet'),
    ],
  },
  eprom: {
    note: 'Nejlevnější nová je AT27C256R (OTP – jen jednou zapisovatelná). Mazatelné UV verze jsou jen použité.',
    offers: [
      o('TME', 'AT27C256R-45PU Microchip, EPROM DIP28', 'https://www.tme.eu/en/details/at27c256r-45pu/eprom-memories-integrated-circuits/microchip-technology/', 2.62, 'USD', 57, 'nové', 'snippet'),
      o('DigiKey', 'AT27C256R-70PU – EPROM OTP 256Kbit 28-PDIP', 'https://www.digikey.com/en/products/detail/microchip-technology/AT27C256R-70PU/1008551', 2.68, 'USD', 58, 'nové', 'fetched'),
      o('Utsource', 'M27C256B-10F1 (CDIP28 s okénkem, UV)', 'https://www.utsource.net/itm/p/443358.html', 4.29408, 'USD', 93, 'použité', 'fetched'),
      o('Utsource', 'W27C256-45 (Winbond, CDIP-28)', 'https://www.utsource.net/itm/p/8663181.html', 7.08, 'USD', 154, 'použité', 'fetched'),
    ],
  },
  xtal_14: {
    note: 'Vysoké pouzdro HC-49/U má jen GME (131-016); ostatní jsou nízké HC-49/S, které se vejdou do stejných děr.',
    offers: [
      o('GME.cz', 'Q 14,318MHz HC49/U krystal (131-016)', 'https://www.gme.cz/v/1493751/q-14318mhz-hc49-u-krystal', 0.66, 'CZK', 1, 'nové', 'snippet', 'podezřele nízká cena, asi doprodej'),
      o('GME.cz', 'QM 14,318MHz HC49U/S krystal (131-086)', 'https://www.gme.cz/v/1493720/qm-14318mhz-hc49u-s-krystal', 6.5, 'CZK', 7, 'nové', 'snippet', 'nízké pouzdro HC-49/S'),
      o('eBay.com', '(20 PCS) HC-49US 14.31818MHz Criterion', 'https://www.ebay.com/itm/224161898855', 0.5975, 'USD', 13, 'nové', 'snippet', 'balení 20 ks'),
      o('TME', '14.31M-HC49-S YIC 14.31818 MHz', 'https://www.tme.eu/en/details/14.31m-hc49-s/tht-quartz-crystals/yic/', 0.6, 'USD', 13, 'nové', 'fetched', 'nyní 0 ks skladem'),
    ],
  },
  xtal_24: {
    note: 'Jen nízké pouzdro HC-49/US; plné HC-49/U 24,576 MHz s ověřenou cenou nenalezeno.',
    offers: [
      o('GME.cz', 'QM 24,576MHz HC49U/S krystal (131-231)', 'https://gme.cz/krystal-hc49s-qm-24-576mhz', 6.5, 'CZK', 7, 'nové', 'snippet'),
      o('DigiKey', 'Citizen HC-49/U-S24576000ABJB 24.576 MHz', 'https://www.digikey.com/en/products/detail/citizen-finedevice-co-ltd/HC-49-U-S24576000ABJB/284235', 0.52, 'USD', 11, 'nové', 'fetched'),
    ],
  },
  de15: {
    note: 'GME ani Hadex úhlovou HD15 zásuvku do DPS nevedou.',
    offers: [
      o('AliExpress', '50 ks D-SUB 15 pin female VGA PCB right angle', 'https://www.aliexpress.com/item/32771059036.html', 0.2848, 'USD', 6, 'nové', 'snippet', 'balení 50 ks'),
      o('AliExpress', '5 ks Tyco D-SUB VGA 15 pin female right angle PCB', 'https://www.aliexpress.com/item/4000383237286.html', 0.5, 'USD', 11, 'nové', 'snippet', 'balení 5 ks'),
      o('DigiKey', 'Adam Tech HD15-SN-24 – D-Sub HD 15 female R/A THT', 'https://www.digikey.com/en/products/detail/adam-tech/HD15-SN-24/9832440', 2.16, 'USD', 47, 'nové', 'fetched'),
      o('DigiKey', 'Amphenol L77HDE15SD1CH4FVGA – D-Sub HD 15 female R/A THT', 'https://www.digikey.com/en/products/detail/amphenol-cs-commercial-products/L77HDE15SD1CH4FVGA/4888525', 2.49, 'USD', 54, 'nové', 'fetched'),
    ],
  },
  rj45: {
    note: 'Dva obchody (DigiKey, GME).',
    offers: [
      o('GME.cz', 'CONNFLY DS1134-06-S80A RJ45 8/8 do DPS (833-112)', 'https://www.gme.cz/v/1502425/connfly-ds1134-06-s80a-konektor-rj45-8-8', 8.7, 'CZK', 9, 'nové', 'snippet', 'úhel 90° nepotvrzen'),
      o('DigiKey', 'GCT MJ3225-88-0 – RJ45 8P8C 90° unshielded THT', 'https://www.digikey.com/en/products/detail/gct/MJ3225-88-0/16893750', 0.54, 'USD', 12, 'nové', 'fetched'),
      o('DigiKey', 'Molex 0438600001 – RJ45 8P8C 90° unshielded THT', 'https://www.digikey.com/en/products/detail/molex/0438600001/WM5432-ND/410212', 2.44, 'USD', 53, 'nové', 'fetched'),
    ],
  },
  jack: {
    note: 'PJ-307 z AliExpressu je nejlevnější, ale má jiný footprint než SJ1-3523N.',
    offers: [
      o('AliExpress', '10 ks PJ-307 3.5mm stereo jack PCB', 'https://www.aliexpress.com/item/32898833354.html', 0.052, 'USD', 1, 'nové', 'snippet', 'balení 10 ks'),
      o('AliExpress', '10 ks 3.5mm stereo jack socket PCB 3F07 PJ-307', 'https://www.aliexpress.com/item/32776514387.html', 0.07, 'USD', 2, 'nové', 'snippet', 'balení 10 ks'),
      o('GME.cz', 'Konektor JACK 3,5 stereo ST-214C do DPS (809-160)', 'https://www.gme.cz/konektor-jack-3-5-stereo-st-214c', 12, 'CZK', 12, 'nové', 'snippet', 'doprodej'),
      o('DigiKey', 'Same Sky SJ1-3523N – 3.5mm stereo jack R/A', 'https://www.digikey.com/en/products/detail/cui-devices/SJ1-3523N/CP1-3523N-ND/738689', 1.2, 'USD', 26, 'nové', 'fetched'),
    ],
  },
  crt: {
    note: '14palcové ani 15palcové CRT teď na Bazoši není; nabídky jsou 17palcové monitory jako náhrada (model ve 3D je 14palcový).',
    offers: [
      o('Bazoš.cz', 'CRT Samsung SyncMaster 794MB 17 palců (náhrada)', 'https://pc.bazos.cz/inzerat/226162117/crt-monitor-samsung-syncmaster-794mb-17.php', 1000, 'CZK', 1000, 'použité', 'fetched'),
      o('Bazoš.cz', 'CRT Maxton 775E 17 palců, retro PC (náhrada)', 'https://pc.bazos.cz/inzerat/223951140/crt-monitor-maxton-775e-17-retro-pc.php', 1100, 'CZK', 1100, 'použité', 'fetched'),
      o('Bazoš.cz', 'CRT Hyundai ImageQuest V780 (náhrada)', 'https://pc.bazos.cz/inzerat/225212938/crt-monitor-hyundai-imagequest-v780.php', 1200, 'CZK', 1200, 'použité', 'fetched'),
      o('Bazoš.cz', 'Samtron 76E 17 palců (náhrada)', 'https://pc.bazos.cz/inzerat/225620396/samtron-17-76e.php', 2500, 'CZK', 2500, 'použité', 'fetched'),
    ],
  },
  speakers: {
    note: 'Použité repro 2.0 na Bazoši za 150–250 Kč.',
    offers: [
      o('Bazoš.cz', 'Reproduktory Genius SP-J06 k počítači', 'https://elektro.bazos.cz/inzerat/226088624/reproduktory-genius-sp-j06-k-pocitaci.php', 150, 'CZK', 150, 'použité', 'fetched'),
      o('Bazoš.cz', 'Reproduktory k počítači Trust Arys 2.0', 'https://elektro.bazos.cz/inzerat/225511277/reproduktory-k-pocitaci.php', 150, 'CZK', 150, 'použité', 'fetched'),
      o('Bazoš.cz', 'Reproduktory 2.0 Creative A60', 'https://elektro.bazos.cz/inzerat/226097805/prodam-reproduktory-20-creative-a60.php', 200, 'CZK', 200, 'použité', 'fetched'),
      o('Bazoš.cz', 'Reproduktory k PC Evolve Jungle (R216)', 'https://elektro.bazos.cz/inzerat/225220380/reproduktory-k-pc-evolve-jungle-r216-top-stav.php', 250, 'CZK', 250, 'použité', 'fetched'),
    ],
  },
  pad: {
    note: 'Na Bazoši teď žádný Saturn pad není; použité originály na eBay kolem 20–40 USD.',
    offers: [
      o('eBay.com', 'Sega Saturn Controller Black MK-80100 OEM', 'https://www.ebay.com/p/1600615821', 38.88, 'USD', 846, 'použité', 'snippet'),
      o('eBay.de', 'Sega Saturn Controller Clear Color Cool PAD s krabicí (JP)', 'https://www.ebay.de/itm/205873469569', 70, 'USD', 1523, 'použité', 'snippet', 'aktivita inzerátu neověřena'),
    ],
  },
};
