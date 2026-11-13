// 3D modely výrobních strojů z modulů (v metrech, podlaha y = 0). Zjednodušené podle veřejných fotek a rozměrů:
// tvar a poměry odpovídají typu stroje, vnitřek je schematický. Každý modul je samostatné tělo → rozložení a výběr.
import * as THREE from 'three';

const M = {
  white: 0xdcdfe2, grey: 0x9aa0a6, dark: 0x2b2e33, black: 0x15171a, blue: 0x2f6fb5, teal: 0x2a9d8f, glass: 0x9fd3e6,
  steel: 0xb8bcc2, copper: 0xb87333, amber: 0xffb52e, quartz: 0xe8f1f2, green: 0x2f7d4a, red: 0xc0392b, liquid: 0x5fb8d6,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.58, metalness: 0.06, ...o });
const mesh = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
// kvádr s dnem v y0
const box = (w, h, d, c, x = 0, y0 = 0, z = 0, o) => mesh(new THREE.BoxGeometry(w, h, d), mat(c, o), x, y0 + h / 2, z);
const cyl = (r, h, c, x = 0, y0 = 0, z = 0, o, seg = 32) => mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(c, o), x, y0 + h / 2, z);
const hcyl = (r, len, c, x, y, z, axis = 'x', o) => { const m = mesh(new THREE.CylinderGeometry(r, r, len, 28), mat(c, o), x, y, z); m.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2; return m; };
const grp = (...objs) => { const g = new THREE.Group(); objs.flat().forEach((o) => g.add(o)); return g; };
const mod = (name, system, ...objs) => ({ name, system, obj: grp(...objs) });

// opakující se části
const lightTower = (x, y0, z) => [cyl(0.02, 0.25, M.steel, x, y0, z), cyl(0.035, 0.06, M.green, x, y0 + 0.25, z, { emissive: 0x1a5, emissiveIntensity: 0.4 }), cyl(0.035, 0.06, M.amber, x, y0 + 0.31, z), cyl(0.035, 0.06, M.red, x, y0 + 0.37, z)];
const foup = (x, y0, z) => [box(0.35, 0.33, 0.33, 0x3d4650, x, y0, z), box(0.3, 0.04, 0.3, M.grey, x, y0 + 0.33, z)];
// EFEM s nakládacími porty (FOUP) na přední straně (−z)
function efem(n, x, z, w = 0.55 * n + 0.3) {
  const parts = [box(w, 1.9, 0.9, M.white, x, 0, z), box(w * 0.92, 0.8, 0.02, M.glass, x, 0.95, z - 0.46, { transparent: true, opacity: 0.45 })];
  for (let i = 0; i < n; i++) { const px = x - w / 2 + 0.45 + i * 0.55; parts.push(box(0.45, 0.9, 0.35, M.grey, px, 0, z - 0.6), ...foup(px, 0.9, z - 0.6)); }
  return mod(`EFEM + ${n}× nakládací port (FOUP)`, 'Manipulace s wafery', parts, lightTower(x + w / 2 - 0.1, 1.9, z - 0.3));
}
const cabinet = (name, system, w, h, d, x, z, c = M.white) => mod(name, system, box(w, h, d, c, x, 0, z), box(w * 0.8, 0.06, 0.02, M.dark, x, h * 0.75, z - d / 2 - 0.01));

// ── typy strojů ─────────────────────────────────────────────────────────────────────────────────────────
const B = {
  // skener / stepper: zdroj světla, iluminátor, retikl, projekční optika, stolek waferu, rozhraní na track
  scanner({ euv = false, iline = false, size = [euv ? 10 : 5.5, euv ? 4 : 3, 3] } = {}) {
    const [L, W, H] = size, mods = [];
    if (euv) mods.push(mod('Zdroj EUV: CO₂ laser (Trumpf) a cínová plazma', 'Zdroj světla', box(4, 2.2, 2.5, M.white, -L / 2 - 2.6, 0, 0), box(1.4, 1.4, 1.4, M.steel, -L / 2 - 0.4, 1.0, 0), mesh(new THREE.SphereGeometry(0.45, 24, 16), mat(M.amber, { emissive: 0xff8a00, emissiveIntensity: 0.6 }), -L / 2 - 0.4, 1.7, 0)));
    else if (iline) mods.push(mod('Rtuťová výbojka (čára i 365 nm)', 'Zdroj světla', box(0.8, 0.9, 0.8, M.grey, -L / 2 + 0.4, H, 0), cyl(0.12, 0.3, M.amber, -L / 2 + 0.4, H + 0.9, 0, { emissive: 0xffaa33, emissiveIntensity: 0.5 })));
    else mods.push(mod('Excimerový laser ArF 193 nm (Cymer / Gigaphoton)', 'Zdroj světla', box(2.6, 1.9, 1.0, M.white, -L / 2 - 1.8, 0, W / 2 - 0.5), box(2.6, 0.08, 0.6, M.blue, -L / 2 - 1.8, 1.9, W / 2 - 0.5)));
    mods.push(mod('Iluminátor (tvarování svazku)', 'Optika', box(L * 0.3, H * 0.35, W * 0.5, M.white, -L * 0.2, H * 0.62, 0)));
    mods.push(mod('Stolek retiklu (maska)', 'Optika', box(L * 0.22, H * 0.12, W * 0.45, M.steel, L * 0.05, H * 0.86, 0)));
    mods.push(mod(euv ? 'Projekční optika – zrcadla (Zeiss SMT)' : 'Projekční objektiv (Zeiss / Nikon / Canon)', 'Optika', cyl(Math.min(W, L) * 0.14, H * 0.45, euv ? M.steel : M.dark, L * 0.05, H * 0.38, 0)));
    mods.push(mod('Stolky waferu (měření + expozice)', 'Manipulace s wafery', box(L * 0.35, H * 0.3, W * 0.8, M.grey, L * 0.05, 0, 0), cyl(0.15, 0.02, M.dark, 0, H * 0.3, 0), cyl(0.15, 0.02, M.dark, L * 0.12, H * 0.3, 0)));
    mods.push(mod('Hlavní rám a vakuová / klimatizovaná komora', 'Konstrukce', box(L, H, W, M.white, 0, 0, 0, { transparent: true, opacity: 0.28 })));
    mods.push(mod('Rozhraní na track (výměna waferů)', 'Manipulace s wafery', box(1.2, 1.6, W * 0.6, M.white, L / 2 + 0.6, 0, 0)));
    mods.push(cabinet('Elektronika a řízení', 'Elektronika a řízení', 1.4, 2.0, 0.9, L / 2 + 0.6, W / 2 + 0.8));
    return mods;
  },
  // clusterový stroj: přenosová komora uprostřed, procesní komory kolem, EFEM vpředu (CVD / ALD / PVD / leptání / ECD)
  cluster({ chambers = 4, chamber = 'Procesní komora', gas = true, plasma = false, round = true } = {}) {
    const mods = [mod('Přenosová komora s vakuovým robotem', 'Manipulace s wafery', cyl(0.85, 0.9, M.grey, 0, 0.6, 0, {}, 6), cyl(0.12, 0.4, M.dark, 0, 1.5, 0)), mod('Vstupní komory (loadlock)', 'Manipulace s wafery', box(0.6, 0.8, 0.5, M.steel, -0.35, 0.6, -1.0), box(0.6, 0.8, 0.5, M.steel, 0.35, 0.6, -1.0))];
    for (let i = 0; i < chambers; i++) {
      const a = (Math.PI * (i + 0.5)) / chambers; // půlkruh za přenosovou komorou (EFEM je vpředu, −z)
      const x = Math.cos(a) * 1.65, z = Math.sin(a) * 1.65;
      const body = round ? cyl(0.55, 1.0, M.white, x, 0.5, z) : box(1.0, 1.0, 1.0, M.white, x, 0.5, z);
      const top = plasma ? cyl(0.4, 0.35, M.copper, x, 1.5, z) : box(0.5, 0.35, 0.5, M.steel, x, 1.5, z);
      mods.push(mod(`${chamber} ${i + 1}`, 'Procesní komory', body, top, box(0.7, 0.5, 0.7, M.grey, x, 0, z)));
    }
    mods.push(efem(3, 0, -1.9));
    if (gas) mods.push(cabinet('Plynový panel (MFC, ventily)', 'Chemie a plyny', 1.0, 1.9, 0.7, -2.4, 1.2));
    mods.push(cabinet(plasma ? 'RF generátory plazmy' : 'Napájení a řízení', 'Elektronika a řízení', 1.0, 1.6, 0.7, 2.4, 1.2, M.dark));
    return mods;
  },
  furnace() {
    return [
      mod('Křemenná trubice a topné zóny', 'Procesní komory', box(1.2, 3.4, 1.2, M.white, 0, 0, 0.6), box(0.4, 2.2, 0.02, M.glass, 0, 0.8, -0.01, { transparent: true, opacity: 0.4 }), cyl(0.18, 1.8, M.quartz, 0, 1.0, 0.6, { transparent: true, opacity: 0.7 })),
      mod('Lodička waferů a výtah', 'Manipulace s wafery', box(0.25, 1.1, 0.25, M.quartz, 0, 0.2, 0.6, { transparent: true, opacity: 0.8 })),
      efem(2, 0, -0.75, 1.4), cabinet('Plynový a teplotní řídicí box', 'Chemie a plyny', 0.8, 2.6, 1.2, 1.1, 0.6),
    ];
  },
  wetbench({ tanks = 6 } = {}) {
    const L = tanks * 0.7 + 1.2, mods = [];
    for (let i = 0; i < tanks; i++) mods.push(mod(`Lázeň ${i + 1} (${['SC1', 'oplach', 'SC2', 'oplach', 'HF', 'sušení'][i % 6]})`, 'Chemie a plyny', box(0.55, 0.9, 0.7, M.white, -L / 2 + 0.9 + i * 0.7, 0, 0), box(0.45, 0.05, 0.6, M.liquid, -L / 2 + 0.9 + i * 0.7, 0.9, 0, { transparent: true, opacity: 0.75 })));
    mods.push(mod('Robot na kolejnici', 'Manipulace s wafery', box(L, 0.08, 0.1, M.steel, 0, 1.6, -0.45), box(0.3, 0.6, 0.3, M.grey, -L / 4, 1.1, -0.45)));
    mods.push(mod('Odsávací digestoř', 'Konstrukce', box(L, 0.9, 0.9, M.white, 0, 1.9, 0, { transparent: true, opacity: 0.35 })));
    mods.push(efem(2, -L / 2 - 0.8, 0, 1.3));
    return mods;
  },
  track() {
    const mods = [mod('Nanášecí kelímky (spin coater)', 'Procesní komory', box(2.2, 1.0, 1.2, M.white, -1.2, 0, 0), cyl(0.28, 0.25, M.dark, -1.7, 1.0, 0), cyl(0.28, 0.25, M.dark, -0.7, 1.0, 0)),
      mod('Vyvolávací kelímky', 'Procesní komory', box(2.0, 1.0, 1.2, M.white, 1.0, 0, 0), cyl(0.28, 0.25, M.dark, 0.6, 1.0, 0), cyl(0.28, 0.25, M.dark, 1.4, 1.0, 0)),
      mod('Věže vytvrzovacích plotýnek', 'Procesní komory', box(4.4, 1.0, 1.2, M.white, -0.1, 1.0, 0), box(4.2, 0.6, 0.02, M.glass, -0.1, 1.2, -0.61, { transparent: true, opacity: 0.4 })),
      mod('Chemie rezistu a vývojky', 'Chemie a plyny', box(1.0, 1.8, 1.0, M.white, -2.9, 0, 0.8)), efem(4, -0.1, -1.1, 2.6)];
    return mods;
  },
  implanter() {
    return [
      mod('Iontový zdroj', 'Zdroj iontů', box(1.0, 1.4, 1.0, M.white, -2.6, 0.4, 0), cyl(0.15, 0.4, M.amber, -2.6, 1.8, 0, { emissive: 0xff7700, emissiveIntensity: 0.5 })),
      mod('Analyzační magnet', 'Svazek', mesh(new THREE.TorusGeometry(0.9, 0.18, 16, 32, Math.PI / 2), mat(M.copper), -1.5, 1.2, 0.9)),
      mod('Urychlovač a svazková trubice', 'Svazek', hcyl(0.18, 2.2, M.steel, 0.2, 1.2, 0)),
      mod('Koncová stanice (wafer)', 'Procesní komory', box(1.3, 1.8, 1.4, M.white, 1.9, 0, 0)), efem(2, 1.9, -1.3, 1.3),
      cabinet('Vysokonapěťové napájení', 'Elektronika a řízení', 1.4, 2.0, 0.9, -1.0, -1.4, M.dark), cabinet('Plynové kabinety (BF3, PH3, AsH3)', 'Chemie a plyny', 0.9, 2.0, 0.9, -2.6, 1.5),
    ];
  },
  cmp() {
    const mods = [];
    for (let i = 0; i < 3; i++) mods.push(mod(`Leštící stůl ${i + 1} s hlavou`, 'Procesní komory', cyl(0.42, 0.06, M.dark, -1.2 + i * 1.0, 0.95, 0.3), cyl(0.16, 0.12, M.steel, -1.2 + i * 1.0 + 0.15, 1.05, 0.25), box(0.08, 0.06, 0.5, M.grey, -1.2 + i * 1.0 + 0.15, 1.25, 0.05)));
    mods.push(mod('Rám leštičky', 'Konstrukce', box(3.4, 0.95, 1.6, M.white, -0.2, 0, 0.3), box(3.4, 1.0, 1.6, M.white, -0.2, 1.2, 0.3, { transparent: true, opacity: 0.25 })));
    mods.push(mod('Čistička a sušička', 'Procesní komory', box(1.4, 1.9, 1.6, M.white, 2.3, 0, 0.3)));
    mods.push(cabinet('Dávkování suspenze (slurry)', 'Chemie a plyny', 0.8, 1.6, 0.8, -2.4, 0.9));
    mods.push(efem(3, 0.5, -1.2));
    return mods;
  },
  ecd() { return B.cluster({ chambers: 4, chamber: 'Galvanická cela', gas: false, round: false }).concat(cabinet('Lázně a čerpadla chemie', 'Chemie a plyny', 1.5, 1.8, 0.9, -2.4, -0.2)); },
  metrology({ column = true, label = 'Měřicí komora' } = {}) {
    return [mod(label, 'Měření', box(1.8, 1.6, 1.6, M.white, 0, 0, 0.4), ...(column ? [cyl(0.25, 0.9, M.steel, 0, 1.6, 0.4), cyl(0.12, 0.3, M.dark, 0, 2.5, 0.4)] : [box(0.8, 0.4, 0.8, M.steel, 0, 1.6, 0.4)])),
      mod('Izolace vibrací', 'Konstrukce', box(2.0, 0.12, 1.8, M.dark, 0, 0, 0.4)), efem(2, 0, -0.9, 1.4), cabinet('Počítač obrazu a řízení', 'Elektronika a řízení', 0.7, 1.8, 0.8, 1.5, 0.4, M.dark)];
  },
  ate() {
    return [mod('Testovací hlava na manipulátoru', 'Měření', box(1.2, 0.5, 1.0, M.dark, 0, 1.0, 0), box(0.2, 1.0, 0.2, M.steel, 0.7, 0, 0)), mod('Mainframe testeru (měřicí karty)', 'Elektronika a řízení', box(1.6, 1.9, 1.0, M.white, 0, 0, 1.2)), mod('Handler / prober', 'Manipulace s wafery', box(1.4, 1.1, 1.4, M.white, 0, 0, -1.2))];
  },
  prober() {
    return [mod('Chuck a sondovací karta', 'Měření', box(1.6, 1.2, 1.4, M.white, 0, 0, 0), cyl(0.35, 0.08, M.dark, 0, 1.2, 0)), mod('Testovací hlava (sklopná)', 'Měření', cyl(0.5, 0.35, M.dark, 0, 1.3, 0.1)), efem(1, 0, -1.0, 0.9)];
  },
  puller() {
    return [
      mod('Kelímek s taveninou a topení (1420 °C)', 'Procesní komory', cyl(0.75, 1.2, M.steel, 0, 0, 0), cyl(0.4, 0.06, M.amber, 0, 1.2, 0, { emissive: 0xff6a00, emissiveIntensity: 0.8 })),
      mod('Tažná komora s krystalem (ingot)', 'Procesní komory', cyl(0.3, 2.6, M.steel, 0, 1.2, 0, { transparent: true, opacity: 0.35 }), cyl(0.15, 1.6, M.grey, 0, 1.6, 0, { metalness: 0.6, roughness: 0.3 })),
      mod('Tažný mechanismus a lanko', 'Manipulace', box(0.5, 0.6, 0.5, M.white, 0, 3.8, 0), cyl(0.01, 1.0, M.dark, 0, 2.8, 0)),
      cabinet('Řízení teploty, argon a vakuum', 'Elektronika a řízení', 1.0, 2.0, 0.9, 1.4, 0),
    ];
  },
  wiresaw() {
    return [mod('Vodicí válce s drátem (stovky smyček)', 'Procesní komory', hcyl(0.18, 1.2, M.steel, -0.35, 1.0, 0, 'z'), hcyl(0.18, 1.2, M.steel, 0.35, 1.0, 0, 'z'), hcyl(0.18, 1.2, M.steel, 0, 0.55, 0, 'z')),
      mod('Ingot na nosníku', 'Manipulace', hcyl(0.15, 1.0, M.grey, 0, 1.45, 0, 'z', { metalness: 0.6 })), mod('Rám pily a kryt', 'Konstrukce', box(2.0, 2.0, 1.6, M.white, 0, 0, 0, { transparent: true, opacity: 0.3 })),
      cabinet('Suspenze / chlazení a řízení', 'Chemie a plyny', 0.9, 1.8, 0.9, 1.6, 0)];
  },
  dicer() {
    return [mod('Vřeteno s diamantovým kotoučem', 'Procesní komory', box(1.0, 1.0, 1.0, M.white, 0, 0, 0), box(0.6, 0.4, 0.02, M.glass, 0, 0.6, -0.51, { transparent: true, opacity: 0.5 }), hcyl(0.08, 0.2, M.steel, 0, 0.75, 0)),
      mod('Kazeta s rámečky a čistička', 'Manipulace s wafery', box(0.6, 1.2, 1.0, M.white, 0.85, 0, 0)), mod('Ovládací panel', 'Elektronika a řízení', box(0.4, 0.3, 0.05, M.dark, -0.3, 1.3, -0.5))];
  },
  bonder({ head = 'Bondovací hlava' } = {}) {
    return [mod(head, 'Procesní komory', box(0.5, 0.35, 0.4, M.steel, 0, 1.25, 0), box(0.06, 0.25, 0.06, M.dark, 0, 1.0, -0.05)),
      mod('Pracovní stůl a ohřev', 'Procesní komory', box(0.8, 0.1, 0.6, M.dark, 0, 0.95, 0)), mod('Podstavec a kryt', 'Konstrukce', box(1.2, 0.95, 1.0, M.white, 0, 0, 0), box(1.2, 0.8, 1.0, M.white, 0, 0.95, 0, { transparent: true, opacity: 0.25 })),
      mod('Zásobníky (magazíny) vstup / výstup', 'Manipulace', box(0.3, 0.6, 0.3, M.grey, -0.8, 0.6, 0), box(0.3, 0.6, 0.3, M.grey, 0.8, 0.6, 0)), mod('Kamera a monitor', 'Elektronika a řízení', box(0.45, 0.3, 0.05, M.black, 0, 1.75, -0.4))];
  },
  mold() {
    return [mod('Horní a dolní forma (plotny)', 'Procesní komory', box(1.0, 0.25, 0.8, M.steel, 0, 0.9, 0), box(1.0, 0.25, 0.8, M.steel, 0, 1.3, 0)), mod('Hydraulika a sloupy lisu', 'Konstrukce', cyl(0.06, 1.6, M.grey, -0.45, 0.4, -0.35), cyl(0.06, 1.6, M.grey, 0.45, 0.4, -0.35), cyl(0.06, 1.6, M.grey, -0.45, 0.4, 0.35), cyl(0.06, 1.6, M.grey, 0.45, 0.4, 0.35), box(1.2, 0.4, 1.0, M.white, 0, 0, 0), box(1.2, 0.3, 1.0, M.white, 0, 2.0, 0)), mod('Plnění pelet zalévací hmoty', 'Chemie a plyny', box(0.5, 1.2, 0.5, M.white, 1.0, 0, 0))];
  },
  oven({ zones = 8 } = {}) {
    const L = zones * 0.5 + 1.0, mods = [mod('Dopravník', 'Manipulace', box(L + 1.0, 0.05, 0.5, M.steel, 0, 0.9, 0))];
    for (let i = 0; i < zones; i++) mods.push(mod(`Zóna ${i + 1}${i >= zones - 2 ? ' (chlazení)' : ''}`, 'Procesní komory', box(0.48, 0.35, 0.9, i >= zones - 2 ? M.blue : M.white, -L / 2 + 0.75 + i * 0.5, 0.95, 0), box(0.4, 0.04, 0.6, i >= zones - 2 ? M.liquid : M.amber, -L / 2 + 0.75 + i * 0.5, 0.93, 0, { emissive: i >= zones - 2 ? 0 : 0xff6a00, emissiveIntensity: 0.4 })));
    mods.push(mod('Rám pece', 'Konstrukce', box(L, 0.9, 1.0, M.white, 0, 0, 0)));
    return mods;
  },
  printer() {
    return [mod('Šablona a stěrka', 'Procesní komory', box(0.7, 0.03, 0.7, M.steel, 0, 1.0, 0), box(0.6, 0.12, 0.05, M.dark, 0, 1.05, -0.1)), mod('Kryt a rám', 'Konstrukce', box(1.2, 1.5, 1.2, M.white, 0, 0, 0, { transparent: true, opacity: 0.3 })), mod('Dopravník DPS', 'Manipulace', box(1.8, 0.05, 0.4, M.steel, 0, 0.9, 0)), mod('Kamera a řízení', 'Elektronika a řízení', box(0.45, 0.3, 0.05, M.black, 0.3, 1.55, -0.6))];
  },
  pnp() {
    const mods = [mod('Portál s osazovacími hlavami', 'Procesní komory', box(1.6, 0.12, 0.15, M.dark, 0, 1.3, 0), box(0.25, 0.3, 0.25, M.steel, -0.2, 1.05, 0), box(0.25, 0.3, 0.25, M.steel, 0.3, 1.05, 0)),
      mod('Rám a kryt', 'Konstrukce', box(1.8, 1.0, 1.6, M.white, 0, 0, 0), box(1.8, 0.7, 1.6, M.white, 0, 1.0, 0, { transparent: true, opacity: 0.25 })), mod('Dopravník DPS', 'Manipulace', box(2.4, 0.05, 0.35, M.steel, 0, 1.0, 0))];
    for (const z of [-0.95, 0.95]) mods.push(mod(`Podavače součástek (${z < 0 ? 'vpředu' : 'vzadu'})`, 'Zásobování součástkami', ...Array.from({ length: 10 }, (_, i) => box(0.12, 0.35, 0.5, i % 2 ? M.grey : M.dark, -0.7 + i * 0.155, 0.75, z))));
    return mods;
  },
  aoi() { return [mod('Kamery a osvětlení (3D AOI / RTG)', 'Měření', box(0.6, 0.4, 0.6, M.dark, 0, 1.1, 0)), mod('Kryt a rám', 'Konstrukce', box(1.2, 1.6, 1.2, M.white, 0, 0, 0, { transparent: true, opacity: 0.3 })), mod('Dopravník DPS', 'Manipulace', box(1.8, 0.05, 0.4, M.steel, 0, 0.9, 0))]; },
  pcbDrill() {
    return [mod('Portál se 4–6 vřeteny', 'Procesní komory', box(2.4, 0.2, 0.25, M.dark, 0, 1.5, 0), ...[-0.8, -0.27, 0.27, 0.8].map((x) => cyl(0.06, 0.4, M.steel, x, 1.1, 0))),
      mod('Granitový stůl s panely DPS', 'Manipulace', box(2.6, 0.3, 1.6, M.grey, 0, 0.8, 0), box(2.2, 0.03, 1.2, M.green, 0, 1.1, 0)), mod('Rám stroje', 'Konstrukce', box(3.0, 0.8, 1.9, M.white, 0, 0, 0)), cabinet('Měnič nástrojů a řízení', 'Elektronika a řízení', 0.8, 1.8, 0.8, 2.0, 0)];
  },
  press() {
    const plates = Array.from({ length: 6 }, (_, i) => box(1.4, 0.06, 1.2, M.steel, 0, 0.5 + i * 0.22, 0));
    return [mod('Vyhřívané lisovací plotny (patra)', 'Procesní komory', plates), mod('Sloupy a hydraulika', 'Konstrukce', cyl(0.08, 2.4, M.grey, -0.8, 0, -0.7), cyl(0.08, 2.4, M.grey, 0.8, 0, -0.7), cyl(0.08, 2.4, M.grey, -0.8, 0, 0.7), cyl(0.08, 2.4, M.grey, 0.8, 0, 0.7), box(1.9, 0.4, 1.7, M.white, 0, 0, 0), box(1.9, 0.3, 1.7, M.white, 0, 2.1, 0)), mod('Vakuová komora', 'Konstrukce', box(1.9, 1.7, 1.7, M.white, 0, 0.4, 0, { transparent: true, opacity: 0.2 }))];
  },
  plating({ tanks = 8 } = {}) {
    const L = tanks * 0.8 + 0.6, mods = [];
    for (let i = 0; i < tanks; i++) mods.push(mod(`Vana ${i + 1}`, 'Chemie a plyny', box(0.7, 1.0, 1.2, M.white, -L / 2 + 0.6 + i * 0.8, 0, 0), box(0.6, 0.04, 1.1, i % 3 === 2 ? M.copper : M.liquid, -L / 2 + 0.6 + i * 0.8, 1.0, 0, { transparent: true, opacity: 0.8 })));
    mods.push(mod('Jeřábový manipulátor', 'Manipulace', box(L, 0.1, 0.1, M.steel, 0, 2.2, -0.55), box(L, 0.1, 0.1, M.steel, 0, 2.2, 0.55), box(0.3, 0.8, 1.2, M.grey, -L / 4, 1.4, 0)));
    mods.push(cabinet('Usměrňovače a řízení', 'Elektronika a řízení', 1.0, 1.8, 0.8, L / 2 + 0.8, 0, M.dark));
    return mods;
  },
  ldi() { return [mod('Laserové osvitové hlavy', 'Optika', box(1.6, 0.4, 0.5, M.dark, 0, 1.3, 0)), mod('Vakuový stůl s panelem', 'Manipulace', box(1.8, 0.2, 1.4, M.grey, 0, 0.9, 0)), mod('Kryt a rám (žluté světlo)', 'Konstrukce', box(2.4, 1.8, 1.9, M.white, 0, 0, 0, { transparent: true, opacity: 0.25 }))]; },
};

// stroj z rešerše → typ modelu a parametry
export const MACHINE_MODELS = {
  m_cz_puller: ['puller'], m_wire_saw: ['wiresaw'], m_wafer_polish: ['cmp'], m_furnace: ['furnace'], m_wet_bench: ['wetbench'], m_track: ['track'],
  m_iline_stepper: ['scanner', { iline: true, size: [3, 2.2, 2.4] }], m_duv_immersion: ['scanner'], m_euv: ['scanner', { euv: true }], m_implanter: ['implanter'],
  m_cvd: ['cluster', { chamber: 'CVD komora' }], m_ald: ['cluster', { chamber: 'ALD komora', chambers: 4 }], m_pvd: ['cluster', { chamber: 'PVD komora (terč)', chambers: 5, round: true }],
  m_etch: ['cluster', { chamber: 'Plazmová leptací komora', plasma: true }], m_cmp: ['cmp'], m_ecd: ['ecd'], m_inspection: ['metrology', { column: false, label: 'Optická inspekce (laser, kamera)' }],
  m_cdsem: ['metrology', { label: 'Elektronový mikroskop (CD-SEM)' }], m_prober: ['prober'], m_ate: ['ate'], m_dicer: ['dicer'], m_die_bonder: ['bonder', { head: 'Hlava osazení čipu (pick & place)' }],
  m_wire_bonder: ['bonder', { head: 'Kapilára a ultrazvuková hlava' }], m_flipchip_bonder: ['bonder', { head: 'Termokompresní hlava (TCB)' }], m_molding: ['mold'], m_reflow: ['oven'],
  m_pcb_drill: ['pcbDrill'], m_pcb_press: ['press'], m_pcb_ldi: ['ldi'], m_pcb_plating: ['plating'], m_paste_printer: ['printer'], m_pick_place: ['pnp'], m_aoi: ['aoi'],
};

/** Moduly stroje [{ name, system, obj }] (metry, podlaha y = 0). */
export function buildMachine(id) {
  const [type, opts] = MACHINE_MODELS[id] ?? ['metrology'];
  return B[type](opts);
}
