// Stroje pro výrobu čipů a desek: co dělají, příklad modelu, výrobci a jejich závody.
// size = [délka, šířka, výška] v metrech, přibližně (podle výrobce, kde je uveden; jinak odhad z fotek).
// plants: souřadnice přibližné (na úrovni města / areálu). Kde výrobce neuvádí závod, je uvedeno sídlo.
export default [
  // ---------- Wafery ----------
  { id: 'm_cz_puller', name: 'Tažička krystalu (Czochralski)', cat: 'Wafery', example: 'PVA TePla EKZ 3500',
    what: 'Z taveniny čistého polykřemíku v křemenném kelímku pomalu vytahuje zárodek a roste z něj monokrystalický ingot o průměru až 300 mm. Bez monokrystalu nejsou wafery.',
    specs: [['Průměr krystalu', 'až 300 mm'], ['Délka krystalu', 'až 2,5 m'], ['Vsázka', 'až 200 kg'], ['Kelímek', 'až 610 mm']],
    price: null,
    size: [4, 3, 9],
    makers: [
      { name: 'PVA TePla', country: 'DE', share: null, plants: [{ name: 'Wettenberg', country: 'DE', lat: 50.63, lon: 8.65 }] },
      { name: 'Linton Crystal Technologies', country: 'US', share: null, plants: [
        { name: 'Rochester, NY', country: 'US', lat: 43.16, lon: -77.61 },
        { name: 'Dalian (Dalian Linton NC Machine)', country: 'CN', lat: 38.91, lon: 121.60 }] },
    ],
    sources: [
      'https://pdf.directindustry.com/pdf/pva-tepla-group/ekz-3500/54259-341859.html',
      'https://www.pvatepla.com/products-technologies/crystal-growth/czochralski-process/',
      'https://csp.fraunhofer.de/en/areas-of-research/crystallization/300-mm-Silicon-Mono-Czochralski-Crystals.html',
      'https://pv-magazine-usa.com/press-releases/linton-crystal-technologies-introduces-300mm-furnace',
    ],
    fact: 'doc' },

  { id: 'm_wire_saw', name: 'Drátová pila ingotu', cat: 'Wafery', example: 'Komatsu NTC MWM3050NQ',
    what: 'Stovky závitů tenkého drátu s abrazivem rozřežou celý ingot najednou na wafery. Na každém řezu se ztratí zhruba 0,1 mm křemíku (prořez).',
    specs: [['Max. obrobek', 'Φ300 × 450 mm'], ['Rychlost drátu', 'až 1 000 m/min'], ['Zásoba drátu', '500 km (Φ0,14 mm)'], ['Hmotnost', '14 700 kg'], ['Prořez (diamantový drát, 300 mm)', 'cca 130 µm']],
    price: null,
    size: [3.55, 2.0, 3.5],
    makers: [
      { name: 'Komatsu NTC', country: 'JP', share: null, plants: [{ name: 'Nanto, Toyama', country: 'JP', lat: 36.56, lon: 136.88 }] },
      { name: 'Takatori', country: 'JP', share: null, plants: [{ name: 'Kashihara, Nara', country: 'JP', lat: 34.51, lon: 135.79 }] },
    ],
    sources: [
      'https://www.komatsu.com/en-us/products/equipment/machine-tools/wafer-manufacturing-equipment/mwm3050nq',
      'https://semiconductorx.com/wafer-production-slicing.html',
      'https://takatori-g.co.jp/english/products/products_mws/detail/mws-612dd.html',
    ],
    fact: 'doc' },

  { id: 'm_wafer_polish', name: 'Leštička waferů (oboustranná)', cat: 'Wafery', example: 'Lapmaster Wolters AC 2000-P3',
    what: 'Mezi dvěma rotujícími deskami s lešticí podložkou a suspenzí oboustranně vyleští dávku waferů do zrcadlové rovinnosti, jakou vyžaduje litografie.',
    specs: [['Wafery', '200 / 300 / 450 mm'], ['Dávka', '15 ks 300 mm, 5 ks 450 mm'], ['Rozměry', '2,9 × 3,83 × 3,82 m (bez rozvaděče)'], ['Hmotnost', '22 000 kg']],
    price: null,
    size: [3.83, 2.9, 3.82],
    makers: [
      { name: 'Lapmaster Wolters (Peter Wolters)', country: 'DE', share: null, plants: [{ name: 'Rendsburg', country: 'DE', lat: 54.30, lon: 9.67 }] },
      { name: 'Fujikoshi Machinery', country: 'JP', share: null, plants: [{ name: 'Nagano', country: 'JP', lat: 36.65, lon: 138.19 }] },
    ],
    sources: [
      'https://pdf.directindustry.com/pdf/lapmaster-wolters-gmbh/ac2000-p3/24664-579018.html',
      'https://precision-surface.com/assets/catalog/files/2018_AC2000-P3_EN.pdf',
      'https://semiconductorx.com/wafer-production-slicing.html',
    ],
    fact: 'doc' },

  // ---------- Front-end ----------
  { id: 'm_furnace', name: 'Difúzní / oxidační pec (vertikální)', cat: 'Front-end', example: 'Kokusai Electric AdvancedAce',
    what: 'Vertikální křemenná trubka ohřeje najednou stovku waferů a v kyslíku na nich vyroste oxid, případně se do nich zadifundují příměsi nebo se nanese vrstva (LPCVD, dávkové ALD).',
    specs: [['Dávka', '50–150 waferů 300 mm'], ['Kokusai, dávkové ALD', '≈ 70 % trhu (2023, odhad)'], ['Kokusai, dávková depozice', '≈ 46 % trhu (odhad)']],
    price: null,
    size: [4, 2, 3.5],
    makers: [
      { name: 'Kokusai Electric', country: 'JP', share: '≈ 46 % dávkové depozice (SemiAnalysis)', plants: [
        { name: 'Toyama (Yatsuo)', country: 'JP', lat: 36.57, lon: 137.13 },
        { name: 'Tonami, Toyama', country: 'JP', lat: 36.65, lon: 136.96 }] },
      { name: 'Tokyo Electron (TELINDY)', country: 'JP', share: null, plants: [{ name: 'Nirasaki, Yamanashi', country: 'JP', lat: 35.71, lon: 138.45 }] },
      { name: 'ASM International (A400/A412)', country: 'NL', share: null, plants: [{ name: 'Singapur', country: 'SG', lat: 1.33, lon: 103.70 }] },
    ],
    sources: [
      'https://newsletter.semianalysis.com/p/going-vertical-gate-all-around-3d',
      'https://www.semiwiki.com/forum/threads/a-chip-making-powerhouse-is-reborn-in-japan.21057',
      'https://semiconductorx.com/wfe-thermal-processing.html',
      'https://aei.dempa.net/archives/31704',
      'https://www.hitachihyoron.com/rev/pdf/2006/r2006_02_108.pdf',
    ],
    fact: 'estimate' },

  { id: 'm_wet_bench', name: 'Mokré čištění (jednowaferové)', cat: 'Front-end', example: 'SCREEN SU-3400',
    what: 'Mezi skoro každým krokem se wafer oplachuje chemikáliemi a ultračistou vodou, aby na něm nezůstaly částice a zbytky. Moderní linky čistí každý wafer zvlášť v desítkách komor.',
    specs: [['Komory', '24 (6 pater × 4 věže)'], ['Výkon', 'až 1 200 waferů/h (údaj výrobce)'], ['Plocha', 'o 30 % menší než SU-3300'], ['Uvedeno', 'prosinec 2022']],
    price: null,
    size: [6, 4, 3.5],
    makers: [
      { name: 'SCREEN Semiconductor Solutions', country: 'JP', share: '≈ 34 % jednowaferového čištění (2025, Gartner)', plants: [
        { name: 'Hikone, Shiga', country: 'JP', lat: 35.27, lon: 136.26 },
        { name: 'Taga, Shiga', country: 'JP', lat: 35.22, lon: 136.29 }] },
      { name: 'Tokyo Electron', country: 'JP', share: null, plants: [{ name: 'Koshi, Kumamoto (TEL Kyushu)', country: 'JP', lat: 32.88, lon: 130.79 }] },
      { name: 'Lam Research', country: 'US', share: null, plants: [{ name: 'Villach', country: 'AT', lat: 46.61, lon: 13.85 }] },
    ],
    sources: [
      'https://www.semi.org/sites/semi.org/files/2023-12/4_Mark%20Goeke.pdf',
      'https://www.theworldfolio.com/news/screen-launches-su3400-single-wafer-cleaning-system/4565/',
      'https://semiconductorx.com/wfe-cleaning.php',
      'https://evertiq.com/news/55178',
    ],
    fact: 'doc' },

  { id: 'm_track', name: 'Nanášení a vyvolání rezistu (track)', cat: 'Front-end', example: 'Tokyo Electron CLEAN TRACK LITHIUS Pro Z',
    what: 'Nanese na wafer rotací tenkou vrstvu fotorezistu, vypeče ji a po osvitu ve skeneru ji vyvolá. Bývá napojený přímo na litografický skener.',
    specs: [['Wafery', '300 mm'], ['Použití', 'imerzní ArF i EUV, vícenásobné vzory'], ['TEL, coater/developer', '≈ 90 % trhu (TEL)'], ['TEL, EUV ve výrobě', '100 % (TEL)']],
    price: null,
    size: [6, 3, 2.8],
    makers: [
      { name: 'Tokyo Electron', country: 'JP', share: '≈ 90 % (TEL, 2024)', plants: [{ name: 'Koshi, Kumamoto (TEL Kyushu)', country: 'JP', lat: 32.88, lon: 130.79 }] },
      { name: 'SCREEN Semiconductor Solutions', country: 'JP', share: null, plants: [{ name: 'Hikone, Shiga', country: 'JP', lat: 35.27, lon: 136.26 }] },
    ],
    sources: [
      'https://www.environmental-expert.com/companies/tokyo-electron-limited-tel-28310/products/family-coaterdevelopers-lithius-series-266212',
      'https://www.trendforce.com/news/2024/06/28/news-japanese-equipment-giant-tel-emerges-as-major-winner-as-euv-orders-surge/',
      'https://digitimes.com/news/a20200929PR200.html?chid=9',
      'https://evertiq.com/design/2025-10-15-tokyo-electron-completes-new-development-facility-in-kyushu',
    ],
    fact: 'estimate' },

  { id: 'm_iline_stepper', name: 'i-line stepper 365 nm', cat: 'Front-end', example: 'Nikon NSR-2205iL1 (dnešní nástupce NSR-2205i11D/i14E)',
    what: 'Rtuťovou výbojkou (čára i, 365 nm) promítá masku zmenšenou 5× po polích na wafer. Takovými steppery se v roce 1995 vyráběl proces 0,5 µm (Pentium, 486); dnes slouží pro hrubé vrstvy.',
    specs: [['Vlnová délka', '365 nm (i-line)'], ['Rozlišení', '≤ 350 nm (s opcí)'], ['NA', '0,45'], ['Zmenšení', '1:5'], ['Pole', '22 × 22 mm'], ['Overlay', '≤ 70 nm']],
    price: null,
    size: [3, 2.5, 2.6],
    makers: [
      { name: 'Canon', country: 'JP', share: '≈ 62 % kusů i-line (2023)', plants: [{ name: 'Utsunomiya, Tochigi', country: 'JP', lat: 36.55, lon: 139.89 }] },
      { name: 'ASML', country: 'NL', share: '≈ 26 % kusů i-line (2023)', plants: [{ name: 'Veldhoven', country: 'NL', lat: 51.41, lon: 5.46 }] },
      { name: 'Nikon', country: 'JP', share: '≈ 11 % kusů i-line (2023)', plants: [{ name: 'Kumagaya, Saitama', country: 'JP', lat: 36.15, lon: 139.39 }] },
    ],
    sources: [
      'https://www.nikon.com/business/semi/sp_nsr-2205il1/',
      'https://moov.co/marketplace/steppers-scanners/nikon/nikon-nsr2205i14e/6cc2e0d4a29a45a2864cf58d8d161e57',
      'https://eu.36kr.com/en/p/3438089402862983',
    ],
    fact: 'doc' },

  { id: 'm_duv_immersion', name: 'ArF imerzní skener 193 nm', cat: 'Front-end', example: 'ASML TWINSCAN NXT:2000i',
    what: 'Excimerový laser ArF (193 nm) svítí přes masku a objektiv, mezi nímž a waferem je vrstvička vody, což zvětší numerickou aperturu nad 1. Pracovní kůň pro většinu vrstev čipů 7–28 nm.',
    specs: [['Vlnová délka', '193 nm (ArF)'], ['NA', '1,35'], ['Rozlišení', '38 nm (dipól), 40 nm (C-quad)'], ['Overlay', '2,5 nm (on-product)'], ['Výkon', '≥ 275 waferů/h; rekord 4 600 waferů/den'], ['Pole', '26 × 33 mm, zmenšení 4×']],
    price: null,
    size: [7, 3.5, 3],
    makers: [
      { name: 'ASML', country: 'NL', share: '≈ 97 % kusů ArFi (2024)', plants: [
        { name: 'Veldhoven', country: 'NL', lat: 51.41, lon: 5.46 },
        { name: 'Wilton, CT (reticle stage, optika)', country: 'US', lat: 41.20, lon: -73.44 },
        { name: 'San Diego (Cymer, světelné zdroje DUV)', country: 'US', lat: 32.90, lon: -117.12 },
        { name: 'Berlín (Berliner Glas, optika)', country: 'DE', lat: 52.43, lon: 13.47 }] },
      { name: 'Nikon', country: 'JP', share: '≈ 3 % kusů ArFi (2024)', plants: [{ name: 'Kumagaya, Saitama', country: 'JP', lat: 36.15, lon: 139.39 }] },
    ],
    sources: [
      'https://www.asml.com/en/products/duv-lithography-systems/twinscan-nxt2000i',
      'https://bits-chips.nl/artikel/asml-reduces-duv-overlay-error-to-1-nanometer/',
      'https://eu.36kr.com/en/p/3438089402862983',
      'https://www.asml.com/en/news/stories/2020/inside-high-tech-manufacturing',
    ],
    fact: 'doc' },

  { id: 'm_euv', name: 'EUV skener', cat: 'Front-end', example: 'ASML TWINSCAN NXE:3600D',
    what: 'Laser odpařuje kapičky cínu na plazma, které svítí extrémním UV (13,5 nm); soustava zrcadel ve vakuu promítne masku na wafer. Jediná cesta k nejjemnějším vrstvám čipů 7 nm a menších.',
    specs: [['Vlnová délka', '13,5 nm'], ['NA', '0,33'], ['Rozlišení', '13 nm'], ['Výkon', '≥ 160 waferů/h při 30 mJ/cm²'], ['Overlay (matched)', '1,1 nm'], ['Hmotnost', 'cca 150 t, doprava ve 40 kontejnerech']],
    price: 'cca 150 mil. USD (2021); High-NA 300–400 mil. USD',
    size: [10, 4, 3.5],
    makers: [
      { name: 'ASML', country: 'NL', share: '100 % (2024, jediný dodavatel)', plants: [
        { name: 'Veldhoven (EUV čisté prostory)', country: 'NL', lat: 51.41, lon: 5.46 },
        { name: 'San Diego (generátory kapek, zdroje)', country: 'US', lat: 32.90, lon: -117.12 },
        { name: 'Wilton, CT (reticle stage)', country: 'US', lat: 41.20, lon: -73.44 },
        { name: 'Linkou (reticle handler)', country: 'TW', lat: 25.07, lon: 121.37 }] },
    ],
    sources: [
      'https://asml.com/products/euv-lithography-systems/twinscan-nxe-3600d',
      'https://www.environmental-expert.com/products/model-twinscan-nxe-3600d-euv-lithography-916534',
      'https://asiatimes.com/2021/09/the-150mn-machine-that-is-changing-the-world/',
      'https://www.phonearena.com/news/asml-ships-next-gen-euv-for-post-2nm-production_id153734',
      'https://eu.36kr.com/en/p/3438089402862983',
      'https://www.asml.com/en/news/stories/2020/inside-high-tech-manufacturing',
    ],
    fact: 'doc' },

  { id: 'm_implanter', name: 'Iontový implantér', cat: 'Front-end', example: 'Axcelis Purion H',
    what: 'Urychlí ionty příměsí (bor, fosfor, arzen) a vstřelí je do křemíku v přesné dávce a hloubce. Tak vznikají oblasti tranzistorů typu n a p.',
    specs: [['Typ', 'jednowaferový, skenovaný bodový svazek (high current)'], ['Proud svazku', '> 20 mA As⁺ a P⁺ (300 mm)'], ['Koncová stanice', 'Purion 500 waferů/h'], ['Trh implantérů', 'cca 3 mld. USD (2022)']],
    price: null,
    size: [8, 4, 2.5],
    makers: [
      { name: 'Applied Materials (VIISta)', country: 'US', share: '> 50 % (odhad)', plants: [{ name: 'Gloucester, MA', country: 'US', lat: 42.62, lon: -70.67 }] },
      { name: 'Axcelis Technologies', country: 'US', share: '≈ 55 % high-energy (odhad)', plants: [{ name: 'Beverly, MA', country: 'US', lat: 42.56, lon: -70.88 }] },
    ],
    sources: [
      'https://www.axcelis.com/wp-content/uploads/2019/03/IntroducingThePurionH_Vanderberg_FINAL.pdf',
      'https://www.axcelis.com/products/purion-h-high-current-ion-implantation/',
      'https://semiconductorx.com/wfe-doping.php',
    ],
    fact: 'doc' },

  { id: 'm_cvd', name: 'CVD / PECVD', cat: 'Front-end', example: 'Applied Materials Producer',
    what: 'Plyny reagují (u PECVD za pomoci plazmatu) a na waferu z nich vyroste tenká vrstva oxidu, nitridu nebo low-k dielektrika mezi vodiči.',
    specs: [['Architektura', 'Twin Chamber, až 6 waferů naráz'], ['Wafery', '150 / 200 / 300 mm'], ['Vrstvy', 'oxidy, nitridy (TEOS, silan), low-k, SiGe, a-Si'], ['Nízkoteplotní proces', '180–350 °C'], ['Uvedeno', '1998']],
    price: null,
    size: [5, 4, 2.8],
    makers: [
      { name: 'Applied Materials', country: 'US', share: null, plants: [
        { name: 'Austin, TX', country: 'US', lat: 30.40, lon: -97.70 },
        { name: 'Singapur', country: 'SG', lat: 1.37, lon: 103.94 }] },
      { name: 'Lam Research (VECTOR)', country: 'US', share: null, plants: [
        { name: 'Tualatin, OR', country: 'US', lat: 45.38, lon: -122.76 },
        { name: 'Batu Kawan, Penang', country: 'MY', lat: 5.24, lon: 100.44 }] },
    ],
    sources: [
      'https://www.appliedmaterials.com/us/en/semiconductor/products/processes/cvd/producer-cvd.html',
      'https://semiconductorx.com/wfe-deposition.php',
    ],
    fact: 'doc' },

  { id: 'm_ald', name: 'ALD (depozice po atomových vrstvách)', cat: 'Front-end', example: 'ASM Pulsar XP',
    what: 'Střídavě pouští dva prekurzory, z nichž každý se naváže jen jednou atomovou vrstvou. Tak vzniká dokonale rovnoměrná vrstva, např. high-k oxid hafnia pod hradlem tranzistoru.',
    specs: [['Použití', 'high-k hradlový dielektrik (HfO₂, HfSiO), krycí vrstvy kovového hradla'], ['Historie', '2007 první sériová výroba high-k s hafniem'], ['ASM, jednowaferové ALD', 'cíl ≥ 55 % trhu (ASM)']],
    price: null,
    size: [5, 3.5, 2.8],
    makers: [
      { name: 'ASM International', country: 'NL', share: '≥ 55 % jednowaferového ALD (ASM)', plants: [
        { name: 'Singapur', country: 'SG', lat: 1.33, lon: 103.70 },
        { name: 'Hwaseong (ASM Korea)', country: 'KR', lat: 37.20, lon: 127.07 }] },
      { name: 'Kokusai Electric', country: 'JP', share: '≈ 70 % dávkového ALD (2023, odhad)', plants: [{ name: 'Toyama (Yatsuo)', country: 'JP', lat: 36.57, lon: 137.13 }] },
    ],
    sources: [
      'https://asm.com/ald/pulsar-xp-ald',
      'https://asm.com/downloads/232221-annual-interim-reports/cto-interview',
      'https://www.asm.com/about/history',
      'https://newsletter.semianalysis.com/p/going-vertical-gate-all-around-3d',
      'https://semiconductorx.com/wfe-deposition.php',
    ],
    fact: 'estimate' },

  { id: 'm_pvd', name: 'PVD naprašování', cat: 'Front-end', example: 'Applied Materials Endura',
    what: 'Ionty argonu vyrážejí atomy z kovového terče, které dopadnou na wafer. Nanáší bariéry (Ta/TaN), zárodečnou měď a kontaktní kovy, vše ve vakuu bez přerušení.',
    specs: [['Komory', 'až 9 procesních + 2 předčisticí'], ['Instalace', '> 4 500 systémů u > 100 zákazníků'], ['Použití', 'metalizace, MRAM, výkonové a RF čipy']],
    price: null,
    size: [5, 4, 2.8],
    makers: [
      { name: 'Applied Materials', country: 'US', share: null, plants: [
        { name: 'Austin, TX', country: 'US', lat: 30.40, lon: -97.70 },
        { name: 'Singapur', country: 'SG', lat: 1.37, lon: 103.94 }] },
    ],
    sources: [
      'https://www.appliedmaterials.com/us/en/product-library/endura-pvd.html',
      'https://www.chiphistory.org/147-applied-materials-endura-5500-pvd',
      'https://semiconductorx.com/wfe-deposition.php',
    ],
    fact: 'doc' },

  { id: 'm_etch', name: 'Plazmové leptání', cat: 'Front-end', example: 'Lam Research Kiyo / Flex na platformě Sense.i',
    what: 'Plazma reaktivních plynů odleptá materiál tam, kde ho nechrání rezist, a to svisle s nanometrovou přesností. Tak se do vrstev přenese vzor z litografie.',
    specs: [['Kiyo (vodiče)', 'od 2004, > 30 000 komor ve výrobě'], ['Flex (dielektrika)', 'CCP reaktor, malý objem'], ['Sense.i', '+50 % výkonu na plochu'], ['Lam, plazmové leptání', '≈ 45 % trhu (2026, odhad)']],
    price: null,
    size: [5, 3.5, 2.8],
    makers: [
      { name: 'Lam Research', country: 'US', share: '≈ 45 % (2026, odhad analytiků)', plants: [
        { name: 'Fremont, CA', country: 'US', lat: 37.49, lon: -121.94 },
        { name: 'Tualatin, OR', country: 'US', lat: 45.38, lon: -122.76 },
        { name: 'Batu Kawan, Penang', country: 'MY', lat: 5.24, lon: 100.44 }] },
      { name: 'Tokyo Electron', country: 'JP', share: null, plants: [{ name: 'Taiwa, Miyagi (TEL Miyagi)', country: 'JP', lat: 38.44, lon: 140.88 }] },
      { name: 'Hitachi High-Tech', country: 'JP', share: null, plants: [{ name: 'Kasado, Kudamatsu', country: 'JP', lat: 34.01, lon: 131.87 }] },
    ],
    sources: [
      'https://www.globenewswire.com/news-release/2020/03/03/1994503/0/en/Lam-Research-Breaks-New-Ground-in-Etch-Technology-and-Productivity-for-Chipmaking-Processes.html',
      'https://eastoregonian.com/?p=673584',
      'https://semiconductorx.com/wfe-etching.php',
      'https://siliconsemiconductor.net/article/99816/Tokyo_Electron_Miyagi_Ships_5000th_Etch_Process_Chamber_',
      'https://www.hitachi.com/en/press/articles/2023/04/0418a/',
    ],
    fact: 'doc' },

  { id: 'm_cmp', name: 'CMP (chemicko-mechanické leštění)', cat: 'Front-end', example: 'Ebara F-REX300XA',
    what: 'Wafer přitlačený na rotující podložku se suspenzí se zbrousí do roviny. Odstraní přebytečnou měď a wolfram a srovná každé patro, aby šlo nanést další.',
    specs: [['Uspořádání', '1 stůl / 1 hlava, dva moduly'], ['Spotřeba', 'o cca 10 % nižší než F-REX300X'], ['Uvedeno', 'prosinec 2021']],
    price: null,
    size: [6, 2.5, 2.3],
    makers: [
      { name: 'Applied Materials (Reflexion LK Prime)', country: 'US', share: null, plants: [
        { name: 'Austin, TX', country: 'US', lat: 30.40, lon: -97.70 },
        { name: 'Singapur', country: 'SG', lat: 1.37, lon: 103.94 }] },
      { name: 'Ebara', country: 'JP', share: null, plants: [
        { name: 'Fujisawa, Kanagawa', country: 'JP', lat: 35.34, lon: 139.47 },
        { name: 'Kumamoto', country: 'JP', lat: 32.80, lon: 130.71 }] },
    ],
    sources: [
      'https://ebara.com/global-en/products/FREX300XA/',
      'https://monoist.itmedia.co.jp/mn/articles/2112/24/news048.html',
      'https://semiconductorx.com/wfe-cmp.php',
    ],
    fact: 'estimate' },

  { id: 'm_ecd', name: 'Galvanické pokovení mědí (ECD)', cat: 'Front-end', example: 'Lam Research SABRE / SABRE 3D',
    what: 'V lázni síranu měďnatého elektrickým proudem vyplní měď drážky a prokovy (damascén). Tak vznikají měděné vodiče mezi tranzistory.',
    specs: [['Kontakty', 'utěsněné suché, clamshell držák'], ['Řízení lázně', 'SmartDose'], ['SABRE 3D', 'o 25 % rychlejší plnění (TSV, Cu pilíře)']],
    price: null,
    size: [5, 3, 2.8],
    makers: [
      { name: 'Lam Research', country: 'US', share: null, plants: [{ name: 'Tualatin, OR', country: 'US', lat: 45.38, lon: -122.76 }] },
      { name: 'Applied Materials', country: 'US', share: null, plants: [{ name: 'Austin, TX', country: 'US', lat: 30.40, lon: -97.70 }] },
      { name: 'Ebara', country: 'JP', share: null, plants: [{ name: 'Fujisawa, Kanagawa', country: 'JP', lat: 35.34, lon: 139.47 }] },
    ],
    sources: [
      'https://www.3dincites.com/2015/07/lam-research-sabre-3d/',
      'https://moov.co/marketplace/electro-plating/lam-novellus/lam-novellus-sabre-3d/422d1c92748a45deab1099411f36f8b0',
      'https://semiconductorx.com/wfe-deposition.php',
    ],
    fact: 'estimate' },

  { id: 'm_inspection', name: 'Optická inspekce defektů', cat: 'Front-end', example: 'KLA 39xx (širokopásmové plazma)',
    what: 'Osvítí wafer silným širokopásmovým UV a kamery porovnávají sousední čipy; rozdíly značí defekty. Výroba podle toho zjistí, který krok se pokazil.',
    specs: [['Světlo', 'SR-DUV 190–260 nm'], ['Uzly', '≤ 7 nm logika a paměti'], ['Uvedeno', '2016'], ['KLA, metrologie a inspekce', '≈ 75 % trhu (2025)']],
    price: null,
    size: [4, 3, 2.5],
    makers: [
      { name: 'KLA', country: 'US', share: '≈ 75 % metrologie a inspekce (2025)', plants: [
        { name: 'Milpitas, CA', country: 'US', lat: 37.43, lon: -121.91 },
        { name: 'Singapur (Serangoon North)', country: 'SG', lat: 1.37, lon: 103.87 },
        { name: 'Migdal HaEmek', country: 'IL', lat: 32.68, lon: 35.24 }] },
      { name: 'Applied Materials (Enlight)', country: 'US', share: null, plants: [{ name: 'Rehovot', country: 'IL', lat: 31.89, lon: 34.81 }] },
    ],
    sources: [
      'https://bbp.kla.com',
      'https://kla.com/products/chip-manufacturing/defect-inspection-review',
      'https://d1io3yog0oux5.cloudfront.net/_b79e807f7e72b5b0246852da2a40f67f/klatencor/news/2019-07-08_KLA_Announces_New_Defect_Inspection_and_Review_43.pdf',
      'https://semiconductorx.com/wfe-metrology.php',
      'https://www.kla.com/?p=18163',
    ],
    fact: 'estimate' },

  { id: 'm_cdsem', name: 'CD-SEM metrologie', cat: 'Front-end', example: 'Hitachi High-Tech GT2000 / CG7300',
    what: 'Elektronový mikroskop s velmi nízkým napětím měří šířku čar a otvorů na waferu v nanometrech, aby se ověřilo, že litografie a leptání trefily rozměr.',
    specs: [['Urychlovací napětí', 'až 100 V (GT2000)'], ['Výkon', 'cca +25 % waferů za hodinu proti předchůdci'], ['Uvedeno', 'prosinec 2023'], ['Pozice', 'Hitachi uvádí první místo na trhu CD-SEM']],
    price: null,
    size: [3, 2.5, 2.2],
    makers: [
      { name: 'Hitachi High-Tech', country: 'JP', share: null, plants: [{ name: 'Naka, Ibaraki', country: 'JP', lat: 36.45, lon: 140.49 }] },
      { name: 'Applied Materials (VeritySEM)', country: 'US', share: null, plants: [{ name: 'Rehovot', country: 'IL', lat: 31.89, lon: 34.81 }] },
    ],
    sources: [
      'https://www.hitachi.com/en/press/articles/2023/12/1212/',
      'https://www.hitachi-hightech.com/global/en/company/tackling-social-issues/202506.html',
      'https://www.hitachi-hightech.com/us/en/products/semiconductor-manufacturing/cd-sem/metrology-solution/semi-cg7300.html',
      'https://semiconductorx.com/wfe-metrology.php',
    ],
    fact: 'estimate' },

  // ---------- Test a pouzdření ----------
  { id: 'm_prober', name: 'Wafer prober', cat: 'Test a pouzdření', example: 'Tokyo Electron Precio XL',
    what: 'Přesně posouvá wafer pod jehlovou kartu, která se dotkne plošek každého čipu, aby ho tester proměřil ještě před rozřezáním. Vadné čipy se označí.',
    specs: [['Wafery', '200 / 300 mm'], ['Přesnost XY', '±1,8 µm (konfigurace z inzerátu)'], ['Přesnost Z', '±5 µm'], ['Teplota stolku', '−55 až 150 °C (tri-temp)']],
    price: null,
    size: [2, 1.6, 1.8],
    makers: [
      { name: 'Tokyo Electron', country: 'JP', share: null, plants: [{ name: 'Nirasaki, Yamanashi', country: 'JP', lat: 35.71, lon: 138.45 }] },
      { name: 'Accretech (Tokyo Seimitsu)', country: 'JP', share: null, plants: [{ name: 'Hachioji, Tokio', country: 'JP', lat: 35.66, lon: 139.32 }] },
    ],
    sources: [
      'https://moov.co/marketplace/probers/tel-tokyo-electron/tel-tokyo-electron-precio-xl',
      'https://moov.co/marketplace/probers/accretech-tsk/accretech-tsk-uf3000ex/d4cb2ba8b34b4ac18d2d673885e95554',
      'https://www.accretech.com/en/company/business.html',
      'https://semiconductorx.com/mfg-back-end-testing.html',
    ],
    fact: 'estimate' },

  { id: 'm_ate', name: 'Automatický tester (ATE)', cat: 'Test a pouzdření', example: 'Advantest V93000 EXA Scale',
    what: 'Pouští do každého pinu čipu testovací vektory a měří odezvy, proudy a časování. Rozhodne, jestli čip funguje a do jaké rychlostní třídy patří.',
    specs: [['Digitální karta', 'Pin Scale 5000B, 5 Gb/s'], ['Sériové HSIO', 'až 32 Gb/s, PAM4'], ['Architektura', 'procesor na každý pin (od 1999)'], ['Trh testerů', 'cca 9 mld. USD (2025)']],
    price: null,
    size: [3, 2, 2],
    makers: [
      { name: 'Advantest', country: 'JP', share: '≈ 65 % testerů (2025)', plants: [{ name: 'Gunma Factory (Meiwa, Ora)', country: 'JP', lat: 36.21, lon: 139.53 }] },
      { name: 'Teradyne', country: 'US', share: null, plants: [{ name: 'North Reading, MA (sídlo; výroba hlavně v Asii)', country: 'US', lat: 42.58, lon: -71.08 }] },
    ],
    sources: [
      'https://www.advantest.com/en/news/2026/20260422.html',
      'https://www.advantest.com/en/news/2023/20231114.html',
      'https://www.advantest.com/tw/news/2024/20240808.html',
      'https://semiconductorx.com/ate-ate.php',
      'https://www.counterpointresearch.com/insight/semiconductor-test-equipment-makers-revenue-grows-18-yoy-in-2024-on-strong-ai-compute-hbm-dram-demand',
      'https://www.advantest.com/en/news/2021/20210408.html',
    ],
    fact: 'doc' },

  { id: 'm_dicer', name: 'Dělení waferu (dicing)', cat: 'Test a pouzdření', example: 'DISCO DFD6362',
    what: 'Tenký diamantový kotouč na vřetenu s desítkami tisíc otáček rozřeže wafer na jednotlivé čipy (alternativně laser nebo plazma).',
    specs: [['Max. obrobek', 'Φ300 mm'], ['Vřetena', '2 proti sobě, 1,2 / 1,8 kW'], ['Otáčky', '6 000–60 000 min⁻¹'], ['Krok Y', '0,1 µm'], ['Rozměry', '1,20 × 1,55 × 1,80 m'], ['Hmotnost', 'cca 2 050 kg']],
    price: null,
    size: [1.55, 1.2, 1.8],
    makers: [
      { name: 'DISCO', country: 'JP', share: '≈ 70 % laserového dělení (JW Insights)', plants: [
        { name: 'Kure, Hiroshima', country: 'JP', lat: 34.25, lon: 132.56 },
        { name: 'Kuwabata, Hiroshima', country: 'JP', lat: 34.27, lon: 132.60 },
        { name: 'Chino, Nagano', country: 'JP', lat: 35.99, lon: 138.16 }] },
      { name: 'Accretech (Tokyo Seimitsu)', country: 'JP', share: null, plants: [{ name: 'Hachioji, Tokio', country: 'JP', lat: 35.66, lon: 139.32 }] },
    ],
    sources: [
      'https://disco.co.jp/eg/products/dicer/dfd6362.html',
      'https://disco.co.jp/eg/csr/activity/emergency/index.html',
      'https://semiconductorx.com/mfg-back-end-dicing.html',
    ],
    fact: 'doc' },

  { id: 'm_die_bonder', name: 'Osazení čipu (die bonder)', cat: 'Test a pouzdření', example: 'Besi Datacon 2200 evo plus',
    what: 'Sebere rozřezaný čip z fólie a přilepí nebo připájí ho na nosný rámeček či substrát pouzdra s přesností na mikrometry.',
    specs: [['Přesnost XY', '±7 µm @ 3σ'], ['Přesnost natočení', '±0,10° @ 3σ'], ['Výkon die attach', 'až 7 000 ks/h na modul'], ['Flip-chip', 'až 3 200 ks/h (bez máčení)']],
    price: null,
    size: [1.8, 1.5, 1.9],
    makers: [
      { name: 'Besi', country: 'NL', share: null, plants: [
        { name: 'Duiven', country: 'NL', lat: 51.95, lon: 6.02 },
        { name: 'Radfeld (Datacon)', country: 'AT', lat: 47.44, lon: 11.91 }] },
      { name: 'ASMPT', country: 'SG', share: null, plants: [
        { name: 'Shenzhen', country: 'CN', lat: 22.54, lon: 114.06 },
        { name: 'Huizhou', country: 'CN', lat: 23.11, lon: 114.42 }] },
    ],
    sources: [
      'https://besi.com/products-technology/product-details/product/datacon-2200-evo-plus',
      'https://semiconductorx.com/mfg-back-end-die-attach.html',
    ],
    fact: 'doc' },

  { id: 'm_wire_bonder', name: 'Drátkování (wire bonder)', cat: 'Test a pouzdření', example: 'Kulicke & Soffa RAPID',
    what: 'Ultrazvukem a teplem přivaří tenký zlatý nebo měděný drátek mezi ploškou čipu a vývodem pouzdra, desítky drátků za sekundu.',
    specs: [['Pracovní pole', '56 × 80 mm'], ['Přesnost', '±3,0 µm @ 3σ'], ['Drát', '15–75 µm (Au, Cu)']],
    price: null,
    size: [1.2, 1.0, 1.7],
    makers: [
      { name: 'Kulicke & Soffa', country: 'US', share: null, plants: [
        { name: 'Singapur', country: 'SG', lat: 1.33, lon: 103.89 },
        { name: 'Fort Washington, PA', country: 'US', lat: 40.14, lon: -75.21 }] },
      { name: 'ASMPT', country: 'SG', share: null, plants: [{ name: 'Shenzhen', country: 'CN', lat: 22.54, lon: 114.06 }] },
    ],
    sources: [
      'https://www.directindustry.com/prod/kulicke-soffa/product-38102-2035382.html',
      'https://semiconductorx.com/mfg-back-end-wire-bonding.html',
    ],
    fact: 'estimate' },

  { id: 'm_flipchip_bonder', name: 'Flip-chip / termokompresní bonder (TCB)', cat: 'Test a pouzdření', example: 'Besi 9800 TC next',
    what: 'Otočí čip kuličkami nebo pilíři dolů a za tepla a tlaku ho připojí k substrátu nebo k dalšímu čipu. Tak se skládají HBM paměti a moderní procesory.',
    specs: [['Přesnost Z', '±1 µm @ 3σ'], ['Síla', '−15 až 500 N (1 kN na přání)'], ['Výkon', 'až 2 500 ks/h při 1 s'], ['Náklon', '< 1 µm']],
    price: null,
    size: [2.5, 1.8, 2],
    makers: [
      { name: 'Besi', country: 'NL', share: null, plants: [{ name: 'Duiven', country: 'NL', lat: 51.95, lon: 6.02 }] },
      { name: 'ASMPT', country: 'SG', share: '≈ 50 % TC bonderů pro HBM4 SK hynix (2026)', plants: [{ name: 'Shenzhen', country: 'CN', lat: 22.54, lon: 114.06 }] },
      { name: 'Hanmi Semiconductor', country: 'KR', share: null, plants: [{ name: 'Incheon', country: 'KR', lat: 37.46, lon: 126.65 }] },
    ],
    sources: [
      'https://besi.com/products-technology/product-details/product/9800-tc-next',
      'https://www.besi.com/products-technology/product-details/product/datacon-8800-tc-advanced',
      'https://semiconductorx.com/mfg-back-end-flip-chip-bonding.html',
    ],
    fact: 'doc' },

  { id: 'm_molding', name: 'Zalévání (molding)', cat: 'Test a pouzdření', example: 'TOWA YPM1180',
    what: 'Ve vyhřáté formě obalí čip i drátky epoxidovou hmotou (transferem nebo kompresí). Vznikne černé pouzdro, které čip chrání.',
    specs: [['Metoda', 'transferové lisování'], ['Lisovací síla', '180 t'], ['Rámečky', 'až 100 × 300 mm'], ['Vytvrzení', '150–175 °C, 1 až několik hodin']],
    price: null,
    size: [3, 1.5, 2],
    makers: [
      { name: 'TOWA', country: 'JP', share: '≈ 2/3 trhu (TechInsights, 2024)', plants: [{ name: 'Kyoto (Kyoto East)', country: 'JP', lat: 34.92, lon: 135.76 }] },
      { name: 'ASMPT', country: 'SG', share: null, plants: [{ name: 'Shenzhen', country: 'CN', lat: 22.54, lon: 114.06 }] },
    ],
    sources: [
      'https://dempa-digital.com/?p=366868',
      'https://caeonline.com/buy/packaging/towa-ypm-1180/9402431',
      'https://www.japantimes.co.jp/business/2024/04/09/companies/japan-chip-gear-firm-boom',
      'https://semiconductorx.com/mfg-back-end-encapsulation.html',
      'https://aei.dempa.net/archives/7702',
    ],
    fact: 'doc' },

  { id: 'm_reflow', name: 'Přetavovací pec (reflow)', cat: 'Test a pouzdření', example: 'Heller 1913 MK7',
    what: 'Deska nebo substrát projede tunelem s řízeným teplotním profilem; pájecí pasta se roztaví a po ochlazení drží součástky. Používá se při pouzdření i osazování desek.',
    specs: [['Zóny', '13 horních + 13 dolních, 3 chladicí'], ['Vyhřívaná délka', '355 cm'], ['Celková délka', '590 cm'], ['Max. teplota', '350 °C (opce 400 °C)'], ['Pás', 'až 1,88 m/min']],
    price: null,
    size: [5.9, 1.5, 1.6],
    makers: [
      { name: 'Heller Industries', country: 'US', share: null, plants: [{ name: 'Florham Park, NJ', country: 'US', lat: 40.79, lon: -74.39 }] },
      { name: 'Rehm Thermal Systems', country: 'DE', share: null, plants: [{ name: 'Blaubeuren', country: 'DE', lat: 48.41, lon: 9.78 }] },
    ],
    sources: [
      'https://hellerindustries.com/wp-content/uploads/2026/02/reflow-oven-mk7.pdf',
      'https://hellerindustries.com/reflow-oven/',
      'https://www.dtek.com.tw/en/product/semicon/reflow--nitrogen--vacuum--formic-acid---pressure-oven/heller--mk7-series',
      'https://www.rehm-group.com/en/news/blog/details/stable-reflow-soldering-process-thanks-to-individually-adjustable-heat-flow.html',
    ],
    fact: 'doc' },

  // ---------- Desky ----------
  { id: 'm_pcb_drill', name: 'Vrtačka DPS', cat: 'Desky', example: 'Schmoll Speedmaster',
    what: 'Několik vřeten současně vrtá do stohu desek tisíce otvorů pro prokovy a vývody, s vřeteny na stovky tisíc otáček.',
    specs: [['Otáčky vřeten', '60 000–300 000 min⁻¹'], ['Měnič', 'až 8 vřeten, do 480 000 min⁻¹'], ['Instalace', '> 500 automatizovaných strojů v Evropě']],
    price: null,
    size: [3, 2.5, 2],
    makers: [
      { name: 'Schmoll Maschinen', country: 'DE', share: null, plants: [{ name: 'Rödermark', country: 'DE', lat: 49.98, lon: 8.82 }] },
      { name: 'Via Mechanics', country: 'JP', share: null, plants: [{ name: 'Atsugi, Kanagawa', country: 'JP', lat: 35.44, lon: 139.36 }] },
    ],
    sources: [
      'https://www.leuze-verlag.de/en/printed-circuit-board-technology/custom-solution-inverter-for-pcb-drilling-machine',
      'https://iconnect007.com/article/138040/schmoll-pushing-drilling-forward/138037/smt',
      'https://caeonline.com/buy/machine-tools/schmoll-speedmaster-hdi-6-300/9267374',
      'https://iconnect007.com/article/90678/a-new-source-for-laser-drills/90681/pcb',
    ],
    fact: 'estimate' },

  { id: 'm_pcb_press', name: 'Laminační lis', cat: 'Desky', example: 'Bürkle LAMV 125',
    what: 'Ve vakuu a za tepla stiskne vrstvy mědi a prepregu do jedné vícevrstvé desky (základní deska PC má 4–8 vrstev).',
    specs: [['Teplota', 'až 385 °C (termoolej)'], ['Desky lisu', 'až 1 400 × 2 350 mm'], ['Síla řady LAMV', '20–2 000 t, hydraulicky'], ['Vakuum', 'ano']],
    price: null,
    size: [4, 3, 4],
    makers: [
      { name: 'Bürkle', country: 'DE', share: null, plants: [{ name: 'Freudenstadt', country: 'DE', lat: 48.46, lon: 8.41 }] },
    ],
    sources: [
      'https://pcbdirectory.com/news/american-standard-circuits-installs-burkle-s-lamv-125-thermal-oil-heated-lamination-press',
      'https://iconnect007.com/article/135189/american-standard-circuits-installs-lamv-125-lamination-press-from-burkle/135192/pcb',
      'https://iconnect007.com/article/114773/printed-circuits-installs-burkle-hightemp-lamination-press/114776/flex',
    ],
    fact: 'doc' },

  { id: 'm_pcb_ldi', name: 'Laserové přímé osvitování (LDI)', cat: 'Desky', example: 'KLA Orbotech Nuvogo 780',
    what: 'Laser 405 nm kreslí motiv spojů přímo do fotorezistu na desce, bez filmové masky, a sám dorovnává deformaci desky.',
    specs: [['Min. motiv', '24 µm'], ['Adresní rozlišení', '2,0 µm'], ['Soutisk', '±12 µm'], ['Výkon', 'až 300 osvitů/h'], ['Laser', '405 nm']],
    price: null,
    size: [4, 2, 2],
    makers: [
      { name: 'KLA (Orbotech)', country: 'IL', share: null, plants: [{ name: 'Yavne', country: 'IL', lat: 31.88, lon: 34.74 }] },
      { name: 'Via Mechanics', country: 'JP', share: null, plants: [{ name: 'Atsugi, Kanagawa', country: 'JP', lat: 35.44, lon: 139.36 }] },
    ],
    sources: [
      'https://www.kla.com/wp-content/uploads/KLAC_BROCHURE-Nuvogo-780.pdf',
      'https://www.kla.com/wp-content/uploads/KLAC_BROCHURE-Nuvogo-750.pdf',
      'https://iconnect007.com/article/236/a-conversation-with-gaby-waisman-orbotech-ltd/239/pcb',
    ],
    fact: 'doc' },

  { id: 'm_pcb_plating', name: 'Pokovovací linka DPS', cat: 'Desky', example: 'MKS Atotech Uniplate (horizontální)',
    what: 'Desky projíždějí vodorovně lázněmi: nejdřív chemicky zvodivění stěny otvorů, pak galvanicky nanese měď do otvorů a na povrch.',
    specs: [['Elektrolytické zóny', '3 / 4,5 / 6 m'], ['Výkon', 'cca 60 m²/h (610 × 460 mm, 1,6 m/min)'], ['Uniplate LB', '> 405 linek bezproudé mědi'], ['Prodáno', '1 000. horizontální Cu linka']],
    price: null,
    size: [30, 2.5, 2.2],
    makers: [
      { name: 'MKS Atotech', country: 'DE', share: null, plants: [
        { name: 'Feucht (u Norimberka)', country: 'DE', lat: 49.37, lon: 11.21 },
        { name: 'Kanton (Guangzhou)', country: 'CN', lat: 23.13, lon: 113.26 }] },
    ],
    sources: [
      'https://www.atotech.com/electronics-equipment/',
      'https://epp.industrie.de/allgemein/fit-for-upcoming-requirements/',
      'https://iconnect007.com/article/132271/atotech-sells-1000th-horizontal-electrolytic-copper-plater/132274/pcb',
      'https://atotech.com/products/general-metal-finishing/equipment-technology',
    ],
    fact: 'doc' },

  { id: 'm_paste_printer', name: 'Tisk pájecí pasty', cat: 'Desky', example: 'ASMPT DEK TQ',
    what: 'Stěrka protlačí pájecí pastu přes tenkou kovovou šablonu na plošky desky, kam pak automat posadí součástky.',
    specs: [['Cyklus', '5 s'], ['Přesnost zarovnání', '±12,5 µm @ 6σ (Cmk 2)'], ['Přesnost tisku', '±17 µm @ 2 Cpk'], ['Deska', 'až 400 × 400 mm'], ['Půdorys', '1,3 m²']],
    price: null,
    size: [1.3, 1.0, 1.5],
    makers: [
      { name: 'ASMPT (DEK)', country: 'SG', share: null, plants: [{ name: 'Mnichov (ASMPT SMT)', country: 'DE', lat: 48.10, lon: 11.64 }] },
    ],
    sources: [
      'https://oritech.straightsell.com.au/documents/productpdf/DEKTQ_1.pdf',
      'https://directindustry.com/prod/asm-assembly-systems/product-178231-2398250.html',
      'https://asm-smt.com/en/news-center/press/dek-tq-l-proven-performance-and-precision-for-large-circuit-boards/',
    ],
    fact: 'doc' },

  { id: 'm_pick_place', name: 'Osazovací automat (pick & place)', cat: 'Desky', example: 'ASMPT SIPLACE TX2i',
    what: 'Hlavy s desítkami trysek berou součástky z pásků a pokládají je na pastu s přesností na setiny milimetru, desítky tisíc kusů za hodinu.',
    specs: [['Výkon', 'až 96 000 součástek/h (TX2i)'], ['Přesnost', '22–34 µm @ 3σ podle hlavy'], ['Půdorys', 'cca 1,0 × 2,2–2,5 m'], ['Fuji NXT III', 'až 35 000 součástek/h na modul, ±25 µm']],
    price: null,
    size: [1.0, 2.3, 1.5],
    makers: [
      { name: 'ASMPT (SIPLACE)', country: 'SG', share: '≈ 19 % (2019)', plants: [{ name: 'Mnichov', country: 'DE', lat: 48.10, lon: 11.64 }] },
      { name: 'Fuji Corporation', country: 'JP', share: '≈ 17 % (2019)', plants: [{ name: 'Chiryu, Aichi', country: 'JP', lat: 35.00, lon: 137.05 }] },
      { name: 'Panasonic', country: 'JP', share: '≈ 14 % (2019)', plants: [{ name: 'Kadoma, Osaka (sídlo)', country: 'JP', lat: 34.74, lon: 135.59 }] },
    ],
    sources: [
      'https://oritech.straightsell.com.au/documents/productpdf/ASMPT-TX.pdf',
      'https://smt.asmpt.com/en/news-center/ifm-magazine-2023/when-throughput-makes-the-difference',
      'https://www.circuitsassembly.com/ca/editorial/menu-new-indust-prod/22721-fuji-releases-nxt-iii-placement-machine.html',
      'https://pdf.marketpublishers.com/qyresearch/global-smt-component-placement-systems-market-insights-forecast-to-2029.pdf',
    ],
    fact: 'doc' },

  { id: 'm_aoi', name: 'Optická / RTG kontrola (AOI, SPI)', cat: 'Desky', example: 'Koh Young Zenith (3D AOI)',
    what: 'Kamery s projekcí vzorů změří ve 3D každou součástku a pájený spoj (SPI kontroluje už natištěnou pastu, RTG skryté spoje pod BGA).',
    specs: [['Princip', 'True 3D (projekce vzorů)'], ['Uvedeno', '2010, první 3D AOI'], ['Koh Young SPI', '≈ 50 % trhu (Koh Young)']],
    price: null,
    size: [1.2, 1.3, 1.6],
    makers: [
      { name: 'Koh Young Technology', country: 'KR', share: '≈ 50 % SPI (údaj firmy)', plants: [{ name: 'Soul (sídlo)', country: 'KR', lat: 37.48, lon: 126.88 }] },
      { name: 'KLA (Orbotech, AOI pro holé desky)', country: 'IL', share: null, plants: [{ name: 'Yavne', country: 'IL', lat: 31.88, lon: 34.74 }] },
    ],
    sources: [
      'https://kohyoung.com/en/zenith/',
      'https://kohyoung.com/en/automated-optical-inspection-technology/',
      'https://iconnect007.com/article/104539/koh-young-technology-celebrates-15-years-of-success-in-providing-total-3d-inspection-solutions/104542/smt',
    ],
    fact: 'estimate' },
];
