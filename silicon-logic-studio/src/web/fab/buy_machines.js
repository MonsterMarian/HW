// Kde pořídit výrobní stroje (nové, hobby, použité) a služby místo strojů. Rešerše 2026-11-14.
// fact: 'doc' = stránka otevřena a údaj na ní ověřen; 'estimate' = z výsledku vyhledávání nebo obecné znalosti.
// Polohy výrobců jsou v machines.js, tady jen polohy prodejců/služeb, které tam nejsou (souřadnice na úrovni města).

const CAE = 'https://caeonline.com/buy/';
const MOOV = 'https://moov.co/marketplace/';
const HACKERFAB = 'https://docs.hackerfab.org/';
const HACKERFAB_PLACE = { name: 'Pittsburgh (Carnegie Mellon)', country: 'US', lat: 40.44, lon: -79.94 };
const AZD = { name: 'Brno – Královo Pole', country: 'CZ', lat: 49.23, lon: 16.59 };
const GATEMA = { name: 'Boskovice', country: 'CZ', lat: 49.49, lon: 16.66 };
const LPKF = { name: 'Garbsen', country: 'DE', lat: 52.42, lon: 9.60 };

export const MACHINE_BUY = {
  // ---------- Wafery ----------
  m_cz_puller: [
    { tier: 'nový', label: 'PVA TePla – Czochralského tažičky (EKZ)', url: 'https://www.pvatepla.com/products-technologies/crystal-growth/czochralski-process/', price: 'na dotaz', note: 'Průmyslové tažičky pro výrobce waferů; malý tým místo toho kupuje hotové wafery.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – růst krystalů, řezání', url: CAE + 'crystal-growing-sawing-slicing', note: 'Kategorie odvozená z adres inzerátů CAE (Komatsu NTC MWM aj.).', fact: 'estimate' },
  ],
  m_wire_saw: [
    { tier: 'nový', label: 'Komatsu NTC MWM3050nQ', url: 'https://www.komatsu.com/en-us/products/equipment/machine-tools/wafer-manufacturing-equipment/mwm3050nq', price: 'na dotaz', note: 'Drátová pila pro ingoty 300 mm × 450 mm.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – Komatsu NTC MWM (použité)', url: CAE + 'crystal-growing-sawing-slicing', note: 'Inzeráty MWM 4550nQ, 444B, 4420M; popisy inzerátů jsou místy strojově generované a nepřesné.', fact: 'estimate' },
  ],
  m_wafer_polish: [
    { tier: 'nový', label: 'Lapmaster Wolters AC 2000-P3 (katalog)', url: 'https://precision-surface.com/assets/catalog/files/2018_AC2000-P3_EN.pdf', price: 'na dotaz', note: 'Oboustranné leštění waferů 200/300/450 mm.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – broušení, lapování, leštění', url: CAE + 'wafer-grinding-lapping-polishing', price: 'ceny neuvedeny', note: '1 680 inzerátů; mezi výrobci Peter Wolters (46), Lapmaster (52), Ebara (111).', fact: 'doc' },
  ],

  // ---------- Front-end ----------
  m_furnace: [
    { tier: 'hobby', label: 'Hacker Fab – trubková pec V1 (open hardware)', url: HACKERFAB, price: 'stavba ≈ 200 USD', note: 'Rozpracovaný projekt, SOP k dispozici. Sam Zeloof začínal s použitou 1" pecí Lindberg z eBay.', place: HACKERFAB_PLACE, fact: 'doc' },
    { tier: 'hobby', label: 'MTI OTF-1200X-S (laboratorní trubková pec 1200 °C)', url: 'https://mtixtl.com/en-internon/products/OTF-1200X-S', price: '3 905,40 USD', note: 'Dělená trubková pec, 8" topná zóna; jen tato varianta má zveřejněnou cenu, ostatní na dotaz.', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – pece / difúze', url: MOOV + 'furnaces-diffusion', price: 'na dotaz', note: 'Nejvíc inzerátů TEL ALPHA-303i (173) a TELFORMULA (171).', fact: 'doc' },
    { tier: 'použitý', label: 'CAE – difúzní pece a příslušenství', url: CAE + 'diffusion-furnaces-accessories', price: 'ceny neuvedeny', note: '668 inzerátů, např. ASM A 412, Amtech/Tempress.', fact: 'doc' },
  ],
  m_wet_bench: [
    { tier: 'použitý', label: 'CAE – mokré stanice', url: CAE + 'wet-stations', price: 'ceny neuvedeny', note: '367 inzerátů (SCREEN/DNS, TEL, Akrion, ACM…).', fact: 'doc' },
  ],
  m_track: [
    { tier: 'hobby', label: 'Hacker Fab – vakuový spin coater V1', url: HACKERFAB, price: 'stavba ≈ 200 USD', note: 'Nanášení rezistu odstřeďováním; vyvolání se v hobby fabu dělá ručně v kádince.', place: HACKERFAB_PLACE, fact: 'doc' },
    { tier: 'použitý', label: 'Moov – coatery a vývojky', url: MOOV + 'coaters-developers', price: 'na dotaz', note: 'TEL ACT 8 (174), MARK 7 (127), LITHIUS (122).', fact: 'doc' },
  ],
  m_iline_stepper: [
    { tier: 'nový', label: 'Canon FPA-3030i5a', url: 'https://global.canon/en/product/indtech/semicon/fpa3030i5a.html', price: 'na dotaz (formulář)', note: 'i-line 365 nm, rozlišení ≤ 0,35 µm, wafery 50–200 mm – stroj pro malé substráty (MEMS, výkonové).', fact: 'doc' },
    { tier: 'použitý', label: 'ASML – renovované PAS 5500', url: 'https://www.asml.com/en/products/refurbished-systems', price: 'na dotaz', note: 'Renovuje sám výrobce se zárukou: i-line 100D, 275D, 450F aj.; prodává se do celého světa.', fact: 'doc' },
    { tier: 'použitý', label: 'CAE – wafer steppery', url: CAE + 'wafer-steppers', price: 'ceny neuvedeny', note: '621 inzerátů (ASML PAS 5500, Nikon, Canon, ASM).', fact: 'doc' },
    { tier: 'hobby', label: 'Hacker Fab – bezmaskový stepper V2', url: HACKERFAB, price: 'stavba ≈ 3 015 USD', note: 'Open-source; podle článku na arXivu (2510.15082) za ≈ 3 000 USD rozlišení pod 2 µm.', place: HACKERFAB_PLACE, fact: 'doc' },
  ],
  m_duv_immersion: [
    { tier: 'nový', label: 'ASML TWINSCAN NXT:2000i', url: 'https://www.asml.com/en/products/duv-lithography-systems/twinscan-nxt2000i', price: 'na dotaz', note: 'Jen pro výrobce čipů; NXT:2000i a lepší podléhají od 2023 nizozemské vývozní licenci.', fact: 'estimate' },
    { tier: 'použitý', label: 'ASML – renovované rané TWINSCAN XT/NXT', url: 'https://www.asml.com/en/products/refurbished-systems', price: 'na dotaz', note: 'ASML uvádí rané DUV systémy XT a NXT bez konkrétních modelů.', fact: 'doc' },
  ],
  m_euv: [
    { tier: 'nový', label: 'ASML TWINSCAN NXE:3800E', url: 'https://asml.com/en/products/euv-lithography-systems/twinscan-nxe-3800e', price: 'nezveřejněno (typický EUV skener ≈ 180 mil. USD, 3800E víc – odhad AnandTech)', note: 'Prodává se jen velkým fabům, nikdy nebyl licencován do Číny; trh s použitými EUV prakticky neexistuje.', fact: 'estimate' },
  ],
  m_implanter: [
    { tier: 'nový', label: 'Axcelis Purion H6', url: 'https://www.axcelis.com/products/purion-h-high-current-ion-implantation/', price: 'na dotaz (Contact Us)', note: 'Vysokoproudý implantér, aktuální generace řady Purion H.', fact: 'doc' },
    { tier: 'použitý', label: 'CAE – iontové implantéry', url: CAE + 'ion-implanters-monitors', price: 'ceny neuvedeny', note: '370 inzerátů, nejvíc Varian (179); AMAT 9500xR, VIISta.', fact: 'doc' },
  ],
  m_cvd: [
    { tier: 'nový', label: 'Applied Materials Producer', url: 'https://www.appliedmaterials.com/products/producer-cvd', price: 'na dotaz', note: 'Platforma pro wafery 150–300 mm.', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – CVD', url: MOOV + 'cvd', price: 'na dotaz', note: 'AMAT P5000 CVD (221 inzerátů), TEL TRIAS (108), Lam INOVA (36).', fact: 'doc' },
  ],
  m_ald: [
    { tier: 'nový', label: 'ASM Pulsar XP', url: 'https://asm.com/ald/pulsar-xp-ald', price: 'na dotaz', note: 'Až 4 moduly na 300mm platformě XP.', fact: 'estimate' },
    { tier: 'použitý', label: 'SemiMarket (SurplusGLOBAL)', url: 'https://www.semimarket.com/', price: 'na dotaz', note: 'Tržiště starší fabové techniky a dílů; ALD na Moov mezi doporučenými položkami chybí.', place: { name: 'Yongin', country: 'KR', lat: 37.24, lon: 127.18 }, fact: 'doc' },
  ],
  m_pvd: [
    { tier: 'nový', label: 'Applied Materials Endura', url: 'https://www.appliedmaterials.com/products/endura-pvd', price: 'na dotaz', note: 'Až 9 procesních komor.', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – PVD / naprašování', url: MOOV + 'pvd-sputtering', price: 'na dotaz', note: 'AMAT Endura II (180), Endura 5500 (96); i laboratorní výrobci (Denton, Kurt J. Lesker, AJA).', fact: 'doc' },
    { tier: 'hobby', label: 'Hacker Fab – RF naprašovací komora', url: HACKERFAB, price: '≈ 18 400 USD (komora+magnetron 1 000, zdroj 1 000, plyny 5 000, vakuum 11 400)', note: 'Nejdražší položkou je vakuový systém.', place: HACKERFAB_PLACE, fact: 'doc' },
  ],
  m_etch: [
    { tier: 'hobby', label: 'Plazmová leptačka PE-25 (seznam Hacker Fab)', url: HACKERFAB, price: '≈ 17 400 USD (koupě)', note: 'Plazmová leptačka, kterou Hacker Fab kupuje hotovou (odkaz na prodejce je na stránce rozbitý).', place: HACKERFAB_PLACE, fact: 'doc' },
    { tier: 'použitý', label: 'Moov – suché / plazmové leptání', url: MOOV + 'dry-plasma-etch', price: 'na dotaz', note: 'AMAT P5000 Etch (166), TEL TE 8500 (68), Centura DPS 2 (66).', fact: 'doc' },
    { tier: 'použitý', label: 'CAE – leptačky a ashery', url: CAE + 'etchers-ashers', price: 'ceny neuvedeny', note: '2 104 inzerátů.', fact: 'doc' },
  ],
  m_cmp: [
    { tier: 'nový', label: 'Ebara F-REX300XA', url: 'https://ebara.com/global-en/products/FREX300XA/', price: 'na dotaz', note: 'Na trhu od prosince 2021.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – broušení, lapování, leštění', url: CAE + 'wafer-grinding-lapping-polishing', price: 'ceny neuvedeny', note: 'Ebara 111 a AMAT 96 inzerátů v kategorii.', fact: 'doc' },
  ],
  m_ecd: [
    { tier: 'použitý', label: 'Moov – Lam/Novellus SABRE 3D (inzerát)', url: 'https://moov.co/marketplace/electro-plating/lam-novellus/lam-novellus-sabre-3d/e84a2e23c3b74c588a00a96d26eba8b4', price: 'na dotaz', note: 'Jednotlivý inzerát, může být prodán.', fact: 'estimate' },
    { tier: 'hobby', label: 'Hacker Fab – bezproudové pokovení', url: HACKERFAB, price: 'stavba ≈ 500 USD', note: 'Archivní projekt; bezproudové (chemické), ne galvanické pokovení.', place: HACKERFAB_PLACE, fact: 'doc' },
  ],
  m_inspection: [
    { tier: 'nový', label: 'KLA – inspekce defektů (39xx)', url: 'https://kla.com/products/chip-manufacturing/defect-inspection-review', price: 'na dotaz', note: 'Širokopásmová plazmová inspekce pro uzly 7 nm a menší.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – testování a metrologie waferů', url: CAE + 'wafer-testing-and-metrology', price: 'ceny neuvedeny', note: '1 164 inzerátů; KLA/Tencor 888 položek (většinou starší metrologie).', fact: 'doc' },
  ],
  m_cdsem: [
    { tier: 'nový', label: 'Hitachi High-Tech CG7300', url: 'https://www.hitachi-hightech.com/us/en/products/semiconductor-manufacturing/cd-sem/metrology-solution/semi-cg7300.html', price: 'na dotaz', note: 'CD-SEM pro éru EUV.', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – SEM / FIB', url: MOOV + 'sem-fib', price: 'na dotaz', note: 'Hlavně laboratorní Hitachi S-5000, S-4700 – ne přímo CD-SEM, ale pro malý fab postačí.', fact: 'doc' },
  ],
  m_prober: [
    { tier: 'použitý', label: 'Moov – wafer probery', url: MOOV + 'probers', price: 'na dotaz', note: 'TEL P-12XL (207), P-8 (141), Accretech UF3000 (125).', fact: 'doc' },
    { tier: 'hobby', label: 'Probe station (seznam Hacker Fab)', url: HACKERFAB, price: '≈ 15 800 USD (koupě)', note: 'Ruční hrotová stanice pro měření jednotlivých čipů.', place: HACKERFAB_PLACE, fact: 'doc' },
  ],
  m_ate: [
    { tier: 'nový', label: 'Advantest V93000 EXA Scale', url: 'https://www.advantest.com/products/soc/v93000/exa.html', price: 'na dotaz', note: 'Na trhu od 2020.', fact: 'estimate' },
    { tier: 'hobby', label: 'DIY SMU (seznam Hacker Fab)', url: HACKERFAB, price: '≈ 800 USD', note: 'Zdroj-měřidlo pro charakterizaci tranzistorů místo ATE.', place: HACKERFAB_PLACE, fact: 'doc' },
    { tier: 'použitý', label: 'CAE – final test', url: CAE + 'final-test', note: 'Kategorie viděná v menu CAE, neotevřena.', fact: 'estimate' },
  ],
  m_dicer: [
    { tier: 'nový', label: 'DISCO DFD6362', url: 'https://disco.co.jp/eg/products/dicer/dfd6362.html', price: 'na dotaz', note: 'Nástupcem je DFD6760.', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – řezání a dělení', url: MOOV + 'scribing-cutting-dicing', price: 'na dotaz', note: 'DISCO DAD3350 (73), Accretech A-WD-200T (62), DISCO DFD6340 (51).', fact: 'doc' },
  ],
  m_die_bonder: [
    { tier: 'nový', label: 'Besi Datacon 2200 evo plus', url: 'https://besi.com/products-technology/product-details/product/datacon-2200-evo-plus', price: 'na dotaz', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – die attachery', url: CAE + 'die-attachers', note: 'Kategorie viděná v menu CAE, neotevřena.', fact: 'estimate' },
  ],
  m_wire_bonder: [
    { tier: 'nový', label: 'Kulicke & Soffa RAPID (DirectIndustry)', url: 'https://directindustry.com/prod/kulicke-soffa/product-38102-2035367.html', price: 'na dotaz', fact: 'estimate' },
    { tier: 'hobby', label: 'TPT HB10 (poloautomatický bonder, laboratoře)', url: 'https://directindustry.com/prod/tpt-wire-bonder/product-188424-1839863.html', price: 'na dotaz', note: 'Kuličkový i klínový bonding, ruční X-Y; běžný v univerzitních laboratořích.', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – wire / wedge / ball bondery', url: MOOV + 'wire-wedge-ball-bonder', price: 'na dotaz', note: '28 výrobců vč. K&S a Westbond; Besi/ESEC 3100 Plus (140), Shinkawa UTC 3000 (110).', fact: 'doc' },
    { tier: 'použitý', label: 'K&S 4524D ruční kuličkový bonder (inzerát Dynaprice)', url: 'https://marketplace.dynaprice.com/items/165163/kulicke+&+soffa+4524d+manual+ball+bonder', note: 'Ruční bonder vhodný pro malou dílnu; inzerát může být prodán.', fact: 'estimate' },
  ],
  m_flipchip_bonder: [
    { tier: 'nový', label: 'Besi 9800 TC next', url: 'https://www.besi.com/products-technology/product-details/product/9800-tc-next/', price: 'na dotaz', note: 'Síla až 500 N (volitelně 1 kN).', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – bondery', url: CAE + 'bonders', price: 'ceny neuvedeny', note: '1 162 inzerátů (K&S, ASM, Shinkawa…); flip-chip bondery výslovně neoznačeny.', fact: 'doc' },
  ],
  m_molding: [
    { tier: 'použitý', label: 'CAE – pouzdření (packaging)', url: CAE + 'packaging', note: 'Kategorie viděná v menu CAE, neotevřena. TOWA YPM1180 je podle Dempa transferový lis; kompresní řada je CPM.', fact: 'estimate' },
  ],

  // ---------- Desky ----------
  m_reflow: [
    { tier: 'nový', label: 'Heller – přetavovací pece (MK7)', url: 'https://hellerindustries.com/reflow-oven/', price: 'na dotaz', note: '1913 MK7: 13 zón, pás až 1,88 m/min.', fact: 'estimate' },
    { tier: 'hobby', label: 'Whizoo Controleo3 (řídicí jednotka pro přestavbu trouby)', url: 'https://www.whizoo.com/products/controleo3-reflow-oven-controller', price: '149 USD (stavebnice trouby 395 USD, hotová pec 1 295 USD)', note: 'Z obyčejné horkovzdušné trouby udělá reflow pec.', fact: 'estimate' },
    { tier: 'hobby', label: 'Puhui T-962A (stolní IR pec)', url: 'https://reach.dog/shop/puhui-electric-technology/products/upgrade-puhui-smt-reflow-oven-t-962a-v2-0-infrared-ic-heater-for-pcb-soldering', price: '≈ 180–350 USD podle prodejce', note: 'Levná IR pec; komunita ji často upravuje (lepší řízení, izolace).', fact: 'estimate' },
    { tier: 'hobby', label: 'NeoDen IN6 (stolní konvekční pec, 6 zón)', url: 'https://www.smtneoden.com/neoden-in6-desktop-smt-reflow-oven-product/', price: '≈ 2 100–3 000 USD podle prodejce', place: { name: 'Anji, Huzhou', country: 'CN', lat: 30.64, lon: 119.68 }, fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – reflow pece', url: CAE + 'reflow-ovens', price: 'ceny neuvedeny', note: '558 inzerátů (BTU, ASM, Heller…).', fact: 'doc' },
    { tier: 'služba', label: 'AŽD Praha, závod Brno – osazení a pájení', url: 'https://azd.cz/en/services/pcb-assembly-and-mounting-of-electronic-sets', price: 'na dotaz', note: 'Kusová až středně sériová výroba, SMD i THT, AOI i RTG kontrola.', place: AZD, fact: 'doc' },
  ],
  m_pcb_drill: [
    { tier: 'nový', label: 'Schmoll Speedmaster (článek o instalaci HDI 6)', url: 'https://iconnect007.com/article/137737/american-standard-circuits-installs-new-schmoll-speedmaster-hdi-6-from-burkle-north-america/137740/pcb', price: 'na dotaz', note: 'Vřetena 60 000–300 000 ot/min, lineární motory; v USA prodává Bürkle North America.', fact: 'estimate' },
    { tier: 'hobby', label: 'LPKF ProtoMat S64 (laboratorní frézka/vrtačka DPS)', url: 'https://www.lpkf.com/en/industries-technologies/research-in-house-pcb-prototyping/products/lpkf-protomat-s64', price: 'na dotaz', note: '60 000 ot/min, automatická výměna nástrojů, struktury od 100 µm, plocha 229 × 305 mm.', place: LPKF, fact: 'estimate' },
    { tier: 'hobby', label: 'Bungard CCD/2 (vstupní CNC pro DPS)', url: 'https://www.matedex.be/en/products/art-2782/boor-freesmachine-ccd-2.html', price: 'nová MTC verze ≈ 7 000 GBP + DPH (údaj prodávajícího na fóru)', note: 'Pracovní plocha 325 × 250 mm.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – výroba a osazování DPS', url: CAE + 'pc-board-assembly-and-manufacturing', price: 'ceny neuvedeny', note: '5 961 inzerátů; vrtačky Excellon (57 položek), Hitachi (33).', fact: 'doc' },
    { tier: 'použitý', label: 'Exapro – vrtačky a frézky DPS', url: 'https://www.exapro.com/c657-pcb-drilling-and-routing-machines/?page=1', fact: 'estimate' },
    { tier: 'služba', label: 'Gatema – výroba DPS (Boskovice)', url: 'https://www.gatema.cz/vyroba-prototypu-dps/', price: 'na dotaz / online konfigurátor', note: 'Vrtání je součástí výroby desky; pool servis pro malé desky do ≈ 3 dm².', place: GATEMA, fact: 'doc' },
  ],
  m_pcb_press: [
    { tier: 'nový', label: 'Bürkle LAMV (článek o instalaci LAMV 125)', url: 'https://pcdandf.com/pcdesign/index.php/current/17063-american-standard-circuits-installs-lamv-125-lamination-press-from-burkle', price: 'na dotaz', note: 'Řada 20–2 000 t, olejový ohřev do 385 °C, volitelně vakuum.', fact: 'estimate' },
    { tier: 'hobby', label: 'LPKF MultiPress S4 (stolní laminační lis)', url: 'https://lpkfusa.com/products-technologies/pcb-prototyping-equipment/products/lpkf-multipress-s4', price: 'na dotaz', note: 'Vakuová komora, 320 °C, 229 × 305 mm, vícevrstvé desky (LPKF uvádí 8 i 12 vrstev).', place: LPKF, fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – výroba a osazování DPS', url: CAE + 'pc-board-assembly-and-manufacturing', price: 'ceny neuvedeny', note: 'Lisy Bürkle v kategorii nenalezeny – použité lisy jsou vzácné.', fact: 'doc' },
    { tier: 'služba', label: 'Gatema – vícevrstvé desky', url: 'https://www.gatema.cz/produkty/vicevrstve-desky-plosnych-spoju/', price: 'na dotaz', note: 'Vícevrstvé, HDI i flex-rigid desky z ČR.', place: GATEMA, fact: 'doc' },
    { tier: 'služba', label: 'JLCPCB – 1 až 32 vrstev', url: 'https://jlcpcb.com/', price: 'od 2 USD / 5 ks (2 vrstvy)', note: 'Řízená impedance ±10 %.', fact: 'doc' },
  ],
  m_pcb_ldi: [
    { tier: 'nový', label: 'KLA Orbotech Nuvogo (direct imaging)', url: 'https://kla.com/products/pcb-ic-substrate-manufacturing/direct-imaging-patterning', price: 'na dotaz', note: 'Nuvogo 780: až 300 desek/h, nejmenší prvek 24 µm (brožura 2023).', fact: 'estimate' },
    { tier: 'hobby', label: 'LPKF ProtoLaser (laserové strukturování)', url: 'https://www.lpkf.com/en/industries-technologies/research-in-house-pcb-prototyping/products/lpkf-protolaser', price: 'na dotaz', note: 'Laser měď přímo odpaří – bez rezistu a leptání; modely H4/S4/U4/R4.', place: LPKF, fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – výroba a osazování DPS', url: CAE + 'pc-board-assembly-and-manufacturing', price: 'ceny neuvedeny', note: 'Orbotech 150 položek (typ stroje neuveden).', fact: 'doc' },
    { tier: 'služba', label: 'Pragoboard (Praha)', url: 'https://www.pragoboard.cz/', price: 'nabídka do 1 pracovního dne', note: 'Rigid, HDI, flex, rigid-flex, VF desky; CAM kontrola dat zdarma s nabídkou.', place: { name: 'Praha', country: 'CZ', lat: 50.08, lon: 14.43 }, fact: 'doc' },
  ],
  m_pcb_plating: [
    { tier: 'nový', label: 'MKS Atotech – horizontální linky Uniplate', url: 'https://atotech.com/electronics-equipment', price: 'na dotaz', note: 'Přes 1 000 horizontálních galvanických linek na měď prodáno (2022).', fact: 'estimate' },
    { tier: 'hobby', label: 'LPKF Contac S4 (prokovení otvorů v laboratoři)', url: 'https://www.lpkf.com/en/industries-technologies/research-in-house-pcb-prototyping/products/lpkf-contac-s4', price: 'na dotaz', note: '6 lázní, až 8 vrstev, poměr stran 1:10, volitelně cínová lázeň.', place: LPKF, fact: 'estimate' },
    { tier: 'hobby', label: 'Bungard Compacta 30', url: 'https://www.matedex.be/en/products/prod-3879/bungard-compacta-30.html', price: 'na dotaz', note: 'Desky do 210 × 300 mm, 5 lázní + galvanická měď, ≈ 80 kg; chemie zvlášť.', fact: 'estimate' },
    { tier: 'služba', label: 'Gatema – výroba DPS vč. prokovení', url: 'https://www.gatema.cz/', price: 'na dotaz / online konfigurátor', place: GATEMA, fact: 'doc' },
  ],
  m_paste_printer: [
    { tier: 'nový', label: 'ASMPT DEK TQ', url: 'https://smt.asmpt.com/en/products/printing-solutions/dek-tq', price: 'na dotaz (vzdálené demo)', note: 'Cyklus 5 s, přesnost ±17 µm, plocha stroje 1,3 m².', fact: 'estimate' },
    { tier: 'hobby', label: 'Ruční šablonový tiskař typu 3040 (VXB)', url: 'https://vxb.com/fr/products/high-precision-manual-solder-paste-printer-for-smt', price: '≈ 445 USD (obdobné stroje 220–450 USD)', note: 'Na malé série stačí; šablonu lze objednat se zakázkou DPS.', fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – sítotiskové stroje', url: CAE + 'screen-printers', price: 'ceny neuvedeny', note: '1 196 inzerátů, z toho výrobce DEK 836, MPM 312.', fact: 'doc' },
    { tier: 'služba', label: 'Pragoboard – laserem řezané šablony', url: 'https://www.pragoboard.cz/', price: 'na dotaz', note: 'Nerezové šablony pro SMD (údaj z vyhledávání, na titulní stránce jen ikona).', place: { name: 'Praha', country: 'CZ', lat: 50.08, lon: 14.43 }, fact: 'estimate' },
  ],
  m_pick_place: [
    { tier: 'nový', label: 'ASMPT SIPLACE TX', url: 'https://smt.asmpt.com/en/products/placement-solutions/siplace-tx', price: 'na dotaz', note: 'TX2i až 96 000 součástek/h na 1 × 2,23 m.', fact: 'estimate' },
    { tier: 'nový', label: 'Mechatronika M10V (Varšava)', url: 'https://epp-europe-news.com/technology/products/mechatronika-presents-equipment-for-accurate-prototyping', price: 'na dotaz', note: 'Evropský automat pro prototypy: 0201 až 40 × 40 mm, max. 1 500 ks/h; použité kusy bývají na Kitmondo/Exapro.', place: { name: 'Varšava', country: 'PL', lat: 52.23, lon: 21.01 }, fact: 'estimate' },
    { tier: 'hobby', label: 'Opulo LumenPnP v4 (open-source)', url: 'https://opulo.io/products/lumenpnp', price: '1 995 USD sestavený (EU obchod 1 812,95 €), stavebnice 1 595 USD', note: 'Dodání ≈ 3 týdny.', fact: 'estimate' },
    { tier: 'hobby', label: 'NeoDen YY1', url: 'https://www.smtneoden.com/neoden-yy1-pick-and-place-machine-product/', price: 'na dotaz (výrobce dříve uváděl 2 899 USD)', note: '2 hlavy, 52 podavačů 8 mm, 0201 až 18 × 18 mm; větší NeoDen4/9/N10P.', place: { name: 'Anji, Huzhou', country: 'CN', lat: 30.64, lon: 119.68 }, fact: 'estimate' },
    { tier: 'použitý', label: 'CAE – výroba a osazování DPS', url: CAE + 'pc-board-assembly-and-manufacturing', price: 'ceny neuvedeny', note: 'Panasonic 1 283, Fuji 1 196, Juki 869 položek.', fact: 'doc' },
    { tier: 'služba', label: 'JLCPCB – osazení (PCBA)', url: 'https://jlcpcb.com/', price: 'od 8 USD', note: 'SPI, AOI a RTG kontrola BGA.', fact: 'doc' },
    { tier: 'služba', label: 'AŽD Praha, závod Brno – osazování', url: 'https://azd.cz/en/services/pcb-assembly-and-mounting-of-electronic-sets', price: 'na dotaz', note: 'MYDATA MY15: desky do 560 × 500 mm, součástky 01005 až 56 × 56 mm.', place: AZD, fact: 'doc' },
  ],
  m_aoi: [
    { tier: 'nový', label: 'Koh Young Zenith', url: 'https://kohyoung.com/en/zenith/', price: 'na dotaz', fact: 'estimate' },
    { tier: 'použitý', label: 'Moov – AOI', url: MOOV + 'aoi', price: 'na dotaz', note: 'Koh Young Zenith (11 inzerátů), Omron VT-WIN II (10).', fact: 'doc' },
    { tier: 'použitý', label: 'CAE – RTG kontrola', url: CAE + 'x-ray', price: 'ceny neuvedeny', note: '773 inzerátů; Nordson/Dage 98, Yxlon 28, Viscom 5.', fact: 'doc' },
    { tier: 'služba', label: 'AŽD Praha, závod Brno – AOI a RTG', url: 'https://azd.cz/en/services/pcb-assembly-and-mounting-of-electronic-sets', price: 'na dotaz', note: 'GÖPEL OptiCon X-line, RTG plocha až 420 × 370 mm.', place: AZD, fact: 'doc' },
    { tier: 'služba', label: 'JLCPCB – RTG kontrola BGA/QFN', url: 'https://jlcpcb.com/help/article/smt-inspection-and-testing-capabilities', price: 'neuvedeno', note: '3D SPI, 2D/3D AOI, RTG na skryté spoje.', fact: 'doc' },
  ],
};

export const SERVICES = [
  { id: 'jlcpcb', name: 'JLCPCB', what: 'Výroba DPS 1–32 vrstev s řízenou impedancí, osazení (PCBA) s SPI/AOI/RTG, šablony.', url: 'https://jlcpcb.com/', price: 'DPS od 2 USD / 5 ks, osazení od 8 USD', place: { name: 'Shenzhen', country: 'CN', lat: 22.54, lon: 114.06 }, src: 'https://jlcpcb.com/', fact: 'doc' },
  { id: 'pcbway', name: 'PCBWay', what: 'Výroba DPS vč. flex, rigid-flex a HDI, osazení.', url: 'https://www.pcbway.com/', price: 'DPS od 5 USD / 10 ks, osazení 1–20 ks za 29 USD, HDI od 349,68 USD', place: { name: 'Hangzhou', country: 'CN', lat: 30.27, lon: 120.16 }, src: 'https://www.pcbway.com/', fact: 'doc' },
  { id: 'eurocircuits', name: 'Eurocircuits (PCB Proto)', what: 'Prototypy 1–5 ks, 2 nebo 4 vrstvy, holé za 2–3 prac. dny, osazené za 6; výroba ve vlastních závodech v Evropě.', url: 'https://www.eurocircuits.com/pcb-assembly-proto/', price: 'online kalkulačka, bez přípravných poplatků', place: { name: 'Mechelen', country: 'BE', lat: 51.03, lon: 4.48 }, src: 'https://www.eurocircuits.com/pcb-assembly-proto/', fact: 'doc' },
  { id: 'aisler', name: 'AISLER', what: 'Prototypové DPS (výroba 1 prac. den), osazení prototypů do 6 prac. dnů, výroba a doprava z Evropy.', url: 'https://aisler.net/', price: 'DPS od 14,20 €, doprava zdarma', src: 'https://aisler.net/', fact: 'doc' },
  { id: 'gatema', name: 'Gatema PCB', what: 'Prototypy a malé série DPS: vícevrstvé, HDI, flex-rigid, hliníkové; pool servis pro malé desky.', url: 'https://www.gatema.cz/', price: 'online konfigurátor (pool / standard)', place: GATEMA, src: 'https://www.gatema.cz/', fact: 'doc' },
  { id: 'pragoboard', name: 'PragoBoard', what: 'DPS rigid, HDI, flex, rigid-flex, s měděnou vložkou a vysokofrekvenční; nabídka s CAM kontrolou do 1 prac. dne.', url: 'https://www.pragoboard.cz/', price: 'na dotaz', place: { name: 'Praha', country: 'CZ', lat: 50.08, lon: 14.43 }, src: 'https://www.pragoboard.cz/', fact: 'doc' },
  { id: 'azd_brno', name: 'AŽD Praha – výrobní závod Brno', what: 'Osazování SMD/THT od kusů po střední série, vlnové pájení, AOI a RTG kontrola (GÖPEL).', url: 'https://azd.cz/en/services/pcb-assembly-and-mounting-of-electronic-sets', price: 'na dotaz', place: AZD, src: 'https://azd.cz/en/services/pcb-assembly-and-mounting-of-electronic-sets', fact: 'doc' },
];

export const GPU_BUILD = [
  { title: 'Návrh: KiCad stačí', text: 'KiCad je zdarma (GPL v3) a zvládne desky až s 32 měděnými vrstvami, diferenciální páry i ladění délek a zpoždění. Na grafickou kartu je to dost; těžší je návrh skladby vrstev a simulace signálové integrity, kterou KiCad sám nedělá.', src: 'https://docs.kicad.org/9.0/en/pcbnew/pcbnew_editing.html', fact: 'estimate' },
  { title: 'Problém č. 1: grafický čip nekoupíte', text: 'NVIDIA a AMD prodávají grafické čipy jen smluvním výrobcům karet (board partnerům), dřív v balíčku s pamětí. Podle zpráv z konce 2025 NVIDIA paměti přestala přibalovat. Malý tým bez smlouvy čip legálně nový nekoupí.', src: 'https://www.tweaktown.com/news/109145/nvidia-stops-bundling-vram-chips-with-gpu-dies-tells-aibs-to-source-their-own-gddr-chips/index.html', fact: 'estimate' },
  { title: 'Cesta A: vlastní GPU v FPGA', text: 'FuryGPU (Dylan Barrie, 4 roky práce): vlastní deska s modulem Kria (Xilinx Zynq UltraScale+), PCIe 2.0 x4, pevná grafická pipeline bez shaderů, Quake v 720p a 60 fps. Výkon zhruba karty z poloviny 90. let. Nejtěžší podle autora byly ovladače pro Windows.', src: 'https://www.theregister.com/2024/03/30/furygpu_xilinx_fpga_graphics/', fact: 'doc' },
  { title: 'Cesta B: čip z jiné karty', text: 'V Číně se čip AD102 a paměti GDDR6X sundávají z RTX 4090 a pájejí na novou desku se 48 GB (paměti z obou stran) s uniklým BIOSem. Ukazuje to, že deska jde postavit, ale jen s vytěženým čipem, bez podpory NVIDIE a se šedou legalitou.', src: 'https://www.pcgamer.com/hardware/graphics-cards/upgrading-an-rtx-4090-to-48-gb-of-vram-is-slightly-easier-than-i-thought-thanks-to-a-custom-pcb-some-second-hand-gddr6x-and-a-leaked-nvidia-bios', fact: 'estimate' },
  { title: 'Paměť GDDR', text: 'GDDR6 od Micronu se prodává přes distributory (DigiKey, Mouser) v pouzdru BGA se 180 kuličkami (12 × 14 mm). Řada typů je ale už ukončená nebo v posledním objednání, dostupnost se musí hlídat.', src: 'https://www.digikey.co.uk/en/products/detail/micron-technology-inc/MT61K256M32JE-12-A/8509875', fact: 'estimate' },
  { title: 'Deska: 8–12 vrstev s řízenou impedancí', text: 'Grafická karta potřebuje vícevrstvou desku s řízenou impedancí pro PCIe a paměťovou sběrnici. JLCPCB vyrábí 1–32 vrstev s impedancí ±10 %, v ČR vícevrstvé a HDI desky dělá Gatema v Boskovicích.', src: 'https://jlcpcb.com/', fact: 'doc' },
  { title: 'Osazení BGA: reflow a rentgen', text: 'GPU i paměti jsou BGA – spoje jsou pod pouzdrem a kontrolují se jen rentgenem. JLCPCB po osazení BGA, QFN a LGA kontroluje RTG; v ČR má osazování s AOI a RTG (GÖPEL) AŽD v Brně, i po kusech.', src: 'https://jlcpcb.com/help/article/smt-inspection-and-testing-capabilities', fact: 'doc' },
  { title: 'VBIOS a ovladače', text: 'Od generace Maxwell má každé GPU NVIDIE bezpečnostní procesor (Falcon), který nespustí nepodepsaný firmware – vlastní VBIOS pro čip NVIDIE tedy nenapíšete. U FPGA cesty je firmware i ovladač vaše práce, a to je podle FuryGPU ta nejtěžší část.', src: 'https://techpowerup.com/312631/nvidia-bios-signature-lock-broken-vbios-modding-and-crossflash-enabled-by-groundbreaking-new-tools', fact: 'estimate' },
];
