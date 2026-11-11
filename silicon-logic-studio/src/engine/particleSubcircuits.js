// Pod atomy: L9 atom (elektronový obal + jádro) → L10 jádro (protony + neutrony) → L11 proton / neutron (kvarky + gluony).
// Hodnoty: konfigurace elektronů a nejčastější izotopy (IUPAC), poloměr jádra R ≈ 1,2 fm · A^(1/3), vazebná energie na nukleon
// (AME2020), proton/neutron a kvarky (PDG 2024, CODATA 2018). Kvarky a elektrony jsou podle současné fyziky elementární – konec.
const c = (id, type, label, x, y, extra = {}) => ({ id, type, label, x, y, inputs: {}, outputs: {}, ...extra });
const atom = (id, label, x, y, extra) => c(id, 'ATOM', label, x, y, extra);

export const PARTICLE_SUBCIRCUITS = {};
const def = (key, level, sub) => { PARTICLE_SUBCIRCUITS[key] = { key, level, ...sub }; };

// ---------------------------------------------------------------- L9 atomy prvků z tranzistorů
const ATOMS = {
  si: { Z: 14, sym: 'Si', name: 'křemík', A: 28, abund: '92,2 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁶', 8], ['M', '3s² 3p²', 4]], r: 'kovalentní poloměr 111 pm', role: 'V KRYSTALU sp³: 4 VAZBY POD 109,5°', valence: 4 },
  o: { Z: 8, sym: 'O', name: 'kyslík', A: 16, abund: '99,76 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁴', 6]], r: 'kovalentní poloměr 66 pm', role: 'V SiO₂ MŮSTEK Si–O–Si, V HfO₂ 3–4 SOUSEDI Hf', valence: 6 },
  hf: { Z: 72, sym: 'Hf', name: 'hafnium', A: 180, abund: '35,1 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁶', 8], ['M', '3s² 3p⁶ 3d¹⁰', 18], ['N', '4s² 4p⁶ 4d¹⁰ 4f¹⁴', 32], ['O', '5s² 5p⁶ 5d²', 10], ['P', '6s²', 2]], r: 'kovalentní poloměr 175 pm', role: 'V HfO₂ (HIGH-k, ε ≈ 20–25) 7 SOUSEDŮ O', valence: 4 },
  ti: { Z: 22, sym: 'Ti', name: 'titan', A: 48, abund: '73,7 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁶', 8], ['M', '3s² 3p⁶ 3d²', 10], ['N', '4s²', 2]], r: 'kovalentní poloměr 160 pm', role: 'V TiN (KOVOVÉ HRADLO) KUBICKÁ MŘÍŽKA NaCl', valence: 4 },
  n: { Z: 7, sym: 'N', name: 'dusík', A: 14, abund: '99,6 %', shells: [['K', '1s²', 2], ['L', '2s² 2p³', 5]], r: 'kovalentní poloměr 71 pm', role: 'V TiN A V SiNₓ (IZOLANT HRADLA TFT)', valence: 5 },
  cu: { Z: 29, sym: 'Cu', name: 'měď', A: 63, abund: '69,2 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁶', 8], ['M', '3s² 3p⁶ 3d¹⁰', 18], ['N', '4s¹', 1]], r: 'kovalentní poloměr 132 pm', role: 'V KOVU: 4s ELEKTRON VOLNÝ – VEDE PROUD', valence: 1 },
  h: { Z: 1, sym: 'H', name: 'vodík', A: 1, abund: '99,99 %', shells: [['K', '1s¹', 1]], r: 'kovalentní poloměr 31 pm', role: 'V a-Si:H PASIVUJE VOLNÉ VAZBY Si', valence: 1 },
  w: { Z: 74, sym: 'W', name: 'wolfram', A: 184, abund: '30,6 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁶', 8], ['M', '3s² 3p⁶ 3d¹⁰', 18], ['N', '4s² 4p⁶ 4d¹⁰ 4f¹⁴', 32], ['O', '5s² 5p⁶ 5d⁴', 12], ['P', '6s²', 2]], r: 'kovalentní poloměr 162 pm', role: 'KONTAKTY A VÝPLŇ HRADLA: KOV BCC, a = 3,165 Å', valence: 6 },
  ge: { Z: 32, sym: 'Ge', name: 'germanium', A: 74, abund: '36,5 %', shells: [['K', '1s²', 2], ['L', '2s² 2p⁶', 8], ['M', '3s² 3p⁶ 3d¹⁰', 18], ['N', '4s² 4p²', 4]], r: 'kovalentní poloměr 120 pm', role: 'V SiGe S/D: VĚTŠÍ ATOM → TLAK NA KANÁL PMOS', valence: 4 },
  c: { Z: 6, sym: 'C', name: 'uhlík', A: 12, abund: '98,9 %', shells: [['K', '1s²', 2], ['L', '2s² 2p²', 4]], r: 'kovalentní poloměr 76 pm', role: 'V LOW-k SiCOH: SKUPINY –CH₃ SNIŽUJÍ PERMITIVITU', valence: 4 },
};

// vazebná energie na nukleon nejčastějšího izotopu (AME2020)
const NUCLEI = {
  si: { BA: 8.448 }, o: { BA: 7.976 }, hf: { BA: 8.035 }, ti: { BA: 8.723 }, n: { BA: 7.476 }, cu: { BA: 8.752 },
  w: { BA: 8.005 }, ge: { BA: 8.725 }, c: { BA: 7.680 },
};
const fm = (A) => (1.2 * Math.cbrt(A)).toFixed(2).replace('.', ',');

for (const [k, a] of Object.entries(ATOMS)) {
  const N = a.A - a.Z;
  def(`atom_${k}`, 9, {
    name: `Atom ${a.sym} (${a.name}, Z = ${a.Z}) — elektronový obal a jádro`,
    subtitle: `Konfigurace: ${a.shells.map((s) => s[1]).join(' ')} – ${a.Z} elektronů ve slupkách ${a.shells.map((s) => `${s[0]} ${s[2]}`).join(', ')}. Nejčastější izotop ${a.A}${a.sym} (${a.abund}). ${a.r}; jádro je zhruba 20 000–40 000× menší než celý atom (kovalentní poloměr proti 1,2 fm · A^⅓). Elektrony jsou podle současné fyziky elementární – dál se nedá. Dvojklik na jádro.`,
    scene: 'atom',
    atom: { Z: a.Z, sym: a.sym, A: a.A, shells: a.shells.map((s) => s[2]), valence: a.valence },
    components: [
      atom('nucleus', a.Z === 1 ? `JÁDRO ¹H = 1 PROTON` : `JÁDRO ${a.A}${a.sym}: ${a.Z} p + ${N} n`, 60, 220, { drill: a.Z === 1 ? 'proton' : `nucleus_${k}` }),
      ...a.shells.map(([s, conf, n], i) => atom(`shell_${s}`, `SLUPKA ${s} (n = ${i + 1}): ${conf} – ${n} e⁻`, 360 + Math.floor(i / 4) * 300, 60 + (i % 4) * 112)),
      atom('role', a.role, 660, a.shells.length > 4 ? 340 : 60),
      atom('size', a.r.toUpperCase(), 660, a.shells.length > 4 ? 452 : 172),
    ],
    wires: [],
  });
  if (a.Z === 1) continue;
  const nu = NUCLEI[k];
  def(`nucleus_${k}`, 10, {
    name: `Jádro ${a.A}${a.sym} — ${a.Z} protonů a ${N} neutronů`,
    subtitle: `Poloměr R ≈ 1,2 fm · A^(1/3) = ${fm(a.A)} fm (1 fm = 10⁻¹⁵ m). Vazebná energie ≈ ${String(nu.BA).replace('.', ',')} MeV na nukleon (AME2020). Nukleony drží silná jaderná síla s dosahem ~1–2 fm, která přemáhá odpuzování protonů. Dvojklik na proton nebo neutron.`,
    scene: 'nucleus',
    nucleus: { Z: a.Z, N, sym: a.sym, A: a.A },
    components: [
      atom('protons', `PROTONY: ${a.Z} (NÁBOJ +${a.Z} e)`, 60, 120, { drill: 'proton' }),
      atom('neutrons', `NEUTRONY: ${N} (BEZ NÁBOJE)`, 60, 300, { drill: 'neutron' }),
      atom('radius', `POLOMĚR ≈ ${fm(a.A)} fm`, 400, 60),
      atom('binding', `VAZEBNÁ ENERGIE ≈ ${String(nu.BA).replace('.', ',')} MeV / NUKLEON`, 400, 200),
      atom('strong', 'SILNÁ JADERNÁ SÍLA – DOSAH ~1–2 fm', 400, 340),
    ],
    wires: [],
  });
}

// ---------------------------------------------------------------- L11 nukleony
const nucleon = (key, name, q, mass, extra) => def(key, 11, {
  name,
  subtitle: `${q.join(' + ')}: náboje ${q.map((x) => (x === 'u' ? '+2/3' : '−1/3')).join(', ')} e. Hmotnost ${mass} MeV/c², ale klidová hmotnost kvarků (u ≈ 2,2 MeV, d ≈ 4,7 MeV, PDG) dá jen ~1 % – zbytek je energie gluonového pole a pohybu kvarků (QCD). Kvarky se nedají oddělit (uvěznění barvy). ${extra} Kvarky i gluony jsou podle současné fyziky elementární – tady cesta končí.`,
  scene: 'nucleon',
  quarks: q,
  components: [
    ...q.map((f, i) => atom(`q${i}`, `KVARK ${f.toUpperCase()} (${['ČERVENÝ', 'ZELENÝ', 'MODRÝ'][i]}) · ${f === 'u' ? '+2/3 e, ≈ 2,2 MeV' : '−1/3 e, ≈ 4,7 MeV'}`, 60, 60 + i * 150)),
    atom('gluons', 'GLUONY – NESOU BAREVNOU SÍLU', 460, 60),
    atom('mass', `HMOTNOST ${mass} MeV/c²`, 460, 210),
    atom('end', 'ELEMENTÁRNÍ ČÁSTICE – KONEC', 460, 360),
  ],
  wires: [],
});
nucleon('proton', 'Proton — kvarky u u d', ['u', 'u', 'd'], '938,272', 'Poloměr náboje 0,841 fm (CODATA 2018). Stabilní.');
nucleon('neutron', 'Neutron — kvarky u d d', ['u', 'd', 'd'], '939,565', 'Volný se rozpadne za ~15 min (β⁻), v jádře ²⁸Si je stabilní.');
