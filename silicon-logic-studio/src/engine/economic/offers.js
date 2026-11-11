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
    note: 'Nový kus stojí v ČR 6 500–7 500 Kč (Datart a Mironet ověřeny), v EU kolem 279 €; použité na Bazoši od 2 500 Kč. Nižší ceny z výpisů vyhledávače (TS Bohemia 3 499 Kč) jsou nejspíš zastaralé, proto nejsou uvedené.',
    offers: [
      o('Bazoš.cz', 'Samsung 870 EVO 1 TB SSD – 100% stav, otestovaný (Brno-venkov)', 'https://pc.bazos.cz/inzerat/225887242/samsung-870-evo-1-tb-ssd-100-stav-pulka-ceny.php', 2500, 'CZK', 2500, 'použité', 'fetched'),
      o('Bazoš.cz', 'SSD disk Samsung 870 EVO 1TB (Brno)', 'https://pc.bazos.cz/inzerat/225857030/ssd-disk-samsung-870-evo-1tb.php', 3500, 'CZK', 3500, 'použité', 'snippet', 'stav neuveden'),
      o('Bazoš.cz', 'Samsung 870 EVO 1TB SSD – lehce použitý (Jablonec n. N.)', 'https://pc.bazos.cz/inzerat/226103373/hdd-samsung-870-evo-1tb-ssd.php', 3800, 'CZK', 3800, 'použité', 'fetched'),
      o('Smarty.cz', 'Samsung 870 EVO SSD 2,5" 1TB', 'https://www.smarty.cz/Samsung-870-EVO-SSD-2-5-1TB-4p24246', 5899, 'CZK', 5899, 'nové', 'snippet'),
      o('Datart', 'SSD Samsung 870 EVO 1TB (MZ-77E1T0B/EU)', 'https://www.datart.cz/ssd-samsung-870-evo-1tb-mz-77e1t0b-eu.html', 6499, 'CZK', 6499, 'nové', 'fetched'),
      o('Geizhals.de', 'Samsung SSD 870 EVO 1TB MZ-77E1T0B (nejnižší: workstation4u přes eBay)', 'https://geizhals.de/samsung-ssd-870-evo-1tb-mz-77e1t0b-a2458826.html', 279, 'EUR', 6789, 'nové', 'fetched'),
      o('Mironet.cz', 'SAMSUNG 870 EVO 1TB', 'https://www.mironet.cz/samsung-870-evo-1tb-25-tlc-rw-560-530-mbps-iops-98k-88k-mtbf-15mh-5y+dp473723/', 7290, 'CZK', 7290, 'nové', 'fetched'),
      o('Alza.cz', 'Samsung 870 EVO 1TB', 'https://www.alza.cz/samsung-870-evo-1tb-d6308918.htm', 7499, 'CZK', 7499, 'nové', 'snippet'),
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

  // ---------------------------------------------------------------- můj PC (diagnostika 10. 11. 2026)
  my_mobo: {
    note: 'Deska se v ČR už nevyrábí ani neprodává; všechny nalezené nabídky jsou vyprodané nebo ukončené – ceny jsou jen orientační (bazarová hodnota ~1 700–2 300 Kč).',
    offers: [
      o('HelloComp', 'ASUS PRIME B360-Plus (použité zboží)', 'https://www.hellocomp.cz/asus-prime-b360-plus-intel-b360/', 1690, 'CZK', 1690, 'použité', 'fetched', 'vyprodáno, cena bez DPH'),
      o('eBay.de', 'ASUS Prime B360-Plus', 'https://www.ebay.de/itm/335087553259', 99.99, 'USD', 2176, 'použité', 'snippet', 'prodáno 25. 8., referenční cena'),
      o('Aukro.sk', 'Základní deska ASUS PRIME B360-PLUS – Intel B360 – LGA 1151', 'https://aukro.sk/zakladni-deska-asus-prime-b360-plus-intel-b360-lga-1151-7057355575', 94.73, 'EUR', 2308, 'použité', 'snippet', 'aukce skončila 3/2024'),
      o('asusbymacman.es', 'Asus Prime B360-PLUS Intel Socket 1151 ATX', 'https://www.asusbymacman.es/placa-base-asus-prime-b360-plus-socket-1151c-663.html', 104.89, 'EUR', 2555, 'nové', 'snippet', 'vyprodáno'),
    ],
  },
  my_cpu: {
    note: 'Použitý i7-9700 je na Bazoši za 2 800–3 300 Kč; nový boxovaný už jen ze zahraničí a předražený.',
    offers: [
      o('Bazoš.cz', 'i7-9700 (Vyškov)', 'https://www.bazos.cz/inzerat/225433232/i7-9700.php', 2799, 'CZK', 2799, 'použité', 'fetched'),
      o('Bazoš.cz', 'Procesor Intel Core i7-9700 / i7-9700K (Liberec, i7-9700 za 3 200 Kč)', 'https://pc.bazos.cz/inzerat/224469545/procesor-intel-core-i7-9700-i7-9700k-6c12t-soket-1151.php', 3200, 'CZK', 3200, 'použité', 'fetched'),
      o('Bazoš.cz', 'Intel Core i7-9700 (Teplice, bez příslušenství)', 'https://pc.bazos.cz/inzerat/225991287/intel-core-i7-9700.php', 3299, 'CZK', 3299, 'použité', 'fetched'),
      o('Componix Global přes Amazon (Geizhals)', 'Intel Core i7-9700 boxed BX80684I79700', 'https://geizhals.de/2057517', 271.74, 'EUR', 6620, 'nové', 'fetched'),
    ],
  },
  my_cooler: {
    note: 'Boxové chladiče Intel E97379 se na Bazoši prodávají za 60–80 Kč.',
    offers: [
      o('Bazoš.cz', 'Chladič Intel pro patici LGA (hliníkový, bez P/N)', 'https://www.bazos.cz/inzerat/226255059/chladic-intel-pro-patici-lga.php', 60, 'CZK', 60, 'nové', 'snippet', 'cena z výpisu kategorie'),
      o('Bazoš.cz', 'CPU chladiče Intel – E97379-001 / E97379-003 (Plzeň)', 'https://pc.bazos.cz/inzerat/225798178/cpu-chladice-intel-lga-1150-1155-1156.php', 70, 'CZK', 70, 'použité', 'fetched', 'E97379-003 za 70 Kč'),
      o('Bazoš.cz', 'BOX chladič procesoru Intel pro patici LGA 115x/1200 – nový (E97379-003)', 'https://pc.bazos.cz/inzerat/226017459/box-chladic-procesoru-intel-pro-patici-lga-1155-novy.php', 80, 'CZK', 80, 'nové', 'fetched'),
    ],
  },
  my_ram: {
    note: 'Použité HyperX Fury 8 GB DDR4-2666 na Bazoši 875–1 200 Kč za modul; nejlevnější je sada 4× 8 GB (přesně tvých 32 GB) za 3 500 Kč.',
    offers: [
      o('Bazoš.cz', '2× 2×8 GB HyperX Fury DDR4 2666 CL16 (4 moduly HX426C16FB3, cena za kus)', 'https://pc.bazos.cz/inzerat/224136155/28gb-hyperx-fury-ddr4-2666-cl16.php', 875, 'CZK', 875, 'použité', 'fetched', 'sada 4 ks za 3 500 Kč'),
      o('Bazoš.cz', 'HyperX Fury 16GB kit 2666MHz (cena za kus)', 'https://pc.bazos.cz/inzerat/225306379/hyperx-fury-16gb-kit-2666mhz.php', 1000, 'CZK', 1000, 'použité', 'fetched', 'sada 2 ks za 2 000 Kč'),
      o('Bazoš.cz', 'RAM Kingston 8GB DDR4 2666MHz HyperX Fury', 'https://pc.bazos.cz/inzerat/226226658/ram-kingston-8gb-ddr4-2666mhz-hyperx-fury.php', 1200, 'CZK', 1200, 'použité', 'fetched'),
      o('Aztek Computers (US)', 'Kingston HyperX Fury Black 8GB DDR4 2666MHz CL16 (HX426C16FB2/8)', 'https://www.aztekcomputers.com/hx426c16fb2-8-hyperx-fury-black-8gb-ddr4-2666mhz-cl16-memory-kingston/p', 103.07, 'USD', 2243, 'nové', 'fetched', 'na objednávku'),
    ],
  },
  my_gpu: {
    note: 'Přesná GDDR6X verze se v ČR už neprodává a na Bazoši teď není; použité kusy v Německu 300–350 €. Bazoš má jen starší verzi s GDDR6 (stejný výkon ±3 %).',
    offers: [
      o('Bazoš.cz', 'ASUS DUAL GeForce RTX 3060 Ti 8G (verze GDDR6 V2 – náhrada)', 'https://pc.bazos.cz/inzerat/226130486/asus-dual-geforce-rtx-3060-ti-8g.php', 8000, 'CZK', 8000, 'použité', 'fetched', 'jiná paměť než tvoje karta'),
      o('kleinanzeigen.de', 'ASUS RTX 3060 Ti Dual OC 8GB Grafikkarte (GDDR6X)', 'https://www.kleinanzeigen.de/s-anzeige/asus-rtx-3060-ti-dual-oc-8gb-grafikkarte/3558762024-225-3475', 300, 'EUR', 7308, 'použité', 'fetched'),
      o('jawa.gg', 'ASUS Dual GeForce RTX 3060 Ti GDDR6X (mint)', 'https://www.jawa.gg/product/138774/asus-dual-geforce-rtx-3060-ti-gddr6x', 385, 'USD', 8378, 'použité', 'snippet'),
      o('kleinanzeigen.de', 'ASUS Dual GeForce RTX 3060 Ti 8GB GDDR6X (DUAL-RTX3060TI-8GD6X, ne-OC, stejná karta)', 'https://www.kleinanzeigen.de/s-anzeige/asus-dual-geforce-rtx-3060-oc-ti-8gb-ddr6-gddr6x-nvidia/3263667185-225-9032', 349, 'EUR', 8502, 'použité', 'fetched'),
      o('NVIDIA Marketplace ES', 'ASUS Dual GeForce RTX 3060 Ti OC Edition 8GB GDDR6X', 'https://marketplace.nvidia.com/es-es/consumer/graphics-cards/asus-dual-geforce-rtx-3060-ti-oc-edition-8gb-gddr6x/', 510.45, 'EUR', 12435, 'nové', 'snippet'),
    ],
  },
  my_ssd: {
    note: '970 EVO Plus dobíhá – e-shopy ho mají „na dotaz“ nebo „již se neprodává“; použitý na Bazoši 1 590 Kč.',
    offers: [
      o('iSpace', 'Samsung 970 EVO PLUS 500GB (MZ-V7S500BW)', 'https://www.ispace.cz/p/samsung-970-evo-plus-500gb/', 1299, 'CZK', 1299, 'nové', 'fetched', 'produkt se již neprodává'),
      o('Bazoš.cz', 'Samsung 970 EVO Plus 500GB NVMe M.2 SSD (Praha 1)', 'https://pc.bazos.cz/inzerat/224734080/samsung-970-evo-plus-500gb-nvme-m2-ssd.php', 1590, 'CZK', 1590, 'použité', 'fetched'),
      o('AB-com', 'Samsung 970 EVO PLUS 500GB, MZ-V7S500BW', 'https://www.ab-com.cz/samsung-970-evo-plus-500gb-mz-v7s500bw/', 1925, 'CZK', 1925, 'nové', 'fetched', 'dostupnost na dotaz'),
      o('office-partner.de', 'Samsung SSD 970 EVO PLUS 500 GB', 'https://www.office-partner.de/samsung-970-evo-plus-mz-v7s500bw-10898609', 91.68, 'EUR', 2233, 'nové', 'snippet', 'nedostupné'),
    ],
  },
  my_case: {
    note: 'ODHAD modelu skříně. Endorfy Signum 300 Air je běžná skříň s okem a 4 ventilátory, nová za 1 100–1 600 Kč.',
    offers: [
      o('arvutitark.ee', 'ENDORFY Signum 300 Air', 'https://arvutitark.ee/en/pc-components/cases/obudowa-endorfy-signum-300-air-1168856', 45.25, 'EUR', 1102, 'nové', 'fetched'),
      o('Datart', 'Case ENDORFY Signum 300 Air černá', 'https://www.datart.cz/case-endorfy-signum-300-air-ey2a005-cerna.html', 1129, 'CZK', 1129, 'nové', 'fetched'),
      o('goodio.be', 'PC Case Endorfy Signum 300 Air with mesh front and glass', 'https://goodio.be/en/product/208684-pc-case-endorfy-signum-300-air-with-mesh-front-and-glass', 64.5, 'EUR', 1571, 'nové', 'fetched'),
      o('Alza.cz', 'Endorfy Signum 300 Air Black', 'https://www.alza.cz/endorfy-signum-300-air-black-d7617312.htm', 2629, 'CZK', 2629, 'nové', 'snippet', 'cena z výpisu, nejspíš stará'),
    ],
  },
  my_psu: {
    note: 'ODHAD modelu zdroje. Endorfy Vero L5 Bronze 600 W stačí (karta 225 W + CPU 65 W), nový ~1 500 Kč.',
    offers: [
      o('Datart', 'ENDORFY Vero L5 600W Bronze černý', 'https://www.datart.cz/zdroj-endorfy-vero-l5-600w-bronze-ey7a005-cerny', 1479, 'CZK', 1479, 'nové', 'fetched', 'poslední kus'),
      o('Alza.cz', 'Endorfy Vero L5 Bronze 600W', 'https://www.alza.cz/endorfy-vero-l5-bronze-600w-d7745637.htm', 1479, 'CZK', 1479, 'nové', 'snippet'),
      o('arvutitark.ee', 'Endorfy Vero L5 Bronze 600W PSU', 'https://arvutitark.ee/ru/pc-components/power-supplies-psu/psu-endorfy-vero-l5-bronze-600-w-1248487', 67.5, 'EUR', 1644, 'nové', 'fetched'),
      o('dateks.lv', 'Endorfy Vero L5 Bronze, 600W, 80PLUS Bronze', 'https://dateks.lv/en/cenas/psu-barosanas-bloki/969735-endorfy-vero-l5-bronze-600w-80plus-bronze', 67.6, 'EUR', 1647, 'nové', 'snippet'),
    ],
  },
  my_monitor: {
    note: 'VA249HE se už neprodává a na Bazoši teď není; poslední ceny nového kusu 2 500–4 000 Kč (staré výpisy).',
    offers: [
      o('Heureka.cz', 'Asus VA249HE (nejnižší nabídka)', 'https://monitory.heureka.cz/asus-va249he/', 2458, 'CZK', 2458, 'nové', 'snippet', 'nejspíš stará cena'),
      o('ox.ee', 'ASUS VA249HE 60.5 cm Full HD', 'https://www.ox.ee/en/product/1280500', 164, 'EUR', 3995, 'nové', 'snippet', 'nedostupné od 2023'),
    ],
  },
  my_keyboard: {
    note: 'Původní Strix Flare (Cherry MX) se už neprodává; v ČR jen vyprodané nabídky kolem 5 000 Kč, použitá na eBay ~1 200 Kč.',
    offers: [
      o('eBay.de', 'ASUS ROG Strix Flare RGB Cherry MX (turecké rozložení)', 'https://www.ebay.de/itm/204330470974', 49.99, 'EUR', 1218, 'použité', 'snippet', 'jiné rozložení'),
      o('Comfor.cz', 'ASUS ROG STRIX FLARE CZ', 'https://www.comfor.cz/asus-rog-strix-flare-cz', 4916, 'CZK', 4916, 'nové', 'fetched', 'není skladem'),
      o('office-partner.de', 'ASUS ROG Strix Flare mechanische Gaming-Tastatur (QWERTZ)', 'https://www.office-partner.de/asus-rog-strix-flare-mechanische-gaming-tastatur-8666549', 211.76, 'EUR', 5158, 'nové', 'fetched', 'ukončený prodej'),
      o('Heureka.cz', 'Asus ROG Strix Flare 90MP00M0-B0ZA00', 'https://klavesnice.heureka.cz/asus-rog-strix-flare-90mp00m0-b0za00/', 6003, 'CZK', 6003, 'nové', 'snippet', 'stará cena'),
    ],
  },
  my_mouse: {
    note: 'Myš s USB ID 30FA:1440 je bezejmenný čínský OEM („INSTANT“), prodává se pod mnoha značkami. Nabídky jsou podobné drátové RGB herní myši.',
    offers: [
      o('Datart', 'Myš DISPEL GM5B černá', 'https://www.datart.cz/mys-dispel-gm5b-gm5b-cerna', 199, 'CZK', 199, 'nové', 'fetched', 'ekvivalent'),
      o('Datart', 'Myš Genius GX Gaming Scorpion M705', 'https://www.datart.cz/mys-genius-gx-gaming-scorpion-m705-31040008400-cerna.html', 299, 'CZK', 299, 'nové', 'fetched', 'ekvivalent'),
      o('Datart', 'Myš YENKEE YMS 3030BK Shotgun USB', 'https://www.datart.cz/mys-yenkee-yms-3030bk-shotgun-usb-45015501-cerna.html', 399, 'CZK', 399, 'nové', 'fetched', 'ekvivalent'),
    ],
  },
  my_mic: {
    note: 'USB ID 0D8C:0134 (C-Media) mají levné USB kondenzátorové mikrofony (TONOR TC-777, TC310, Auna CM900); Windows ho vidí jen jako mikrofon. Nabídky jsou podobné USB mikrofony.',
    offers: [
      o('Datart', 'Mikrofon Marvo MIC-01 černý', 'https://www.datart.cz/marvo-herni-mikrofon-mic-01-mikrofon-bez-regulace-hlasitosti-cerny-rgb-podsviceny-mic-01.html', 290, 'CZK', 290, 'nové', 'fetched', 'ekvivalent'),
      o('Datart', 'Mikrofon Trust GXT 232 Mantis', 'https://www.datart.cz/mikrofon-trust-gxt-232-mantis-cerny-22656.html', 499, 'CZK', 499, 'nové', 'fetched', 'ekvivalent'),
      o('Datart', 'Mikrofon Connect IT YouMic s POP filtrem, USB', 'https://www.datart.cz/mikrofon-connect-it-youmic-s-pop-filtrem-usb-cmi-8001-bk-cerny.html', 599, 'CZK', 599, 'nové', 'fetched', 'ekvivalent'),
      o('eBay.de', 'Tonor TC-777 USB Kondensatormikrofon', 'https://www.ebay.de/itm/197364853856', 25, 'EUR', 609, 'nové', 'snippet', 'stejné USB ID; cena nejistá'),
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
