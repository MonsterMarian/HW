// Modely dílů AI PC (Dell T5810 + 2× Tesla P100) pro schéma napájení. Sítě nesou napětí ve voltech:
// +12 V = 12, zem = 0. Zkrat = síť buzená zároveň +12 V a zemí → engine ji vyhodnotí jako 'X'.
// Piny konektorů nesou čísla podle norem (ATX12V / EPS12V, PCI Express CEM, SATA, Intel 4-wire PWM fan);
// zdroje pinoutů jsou v PIN_SOURCES níže a v README.
const Z = 'Z';
const num = (v) => typeof v === 'number';
const is12 = (v) => v === 12;
const isGnd = (v) => v === 0;

export const PIN_SOURCES = {
  atx: 'Intel ATX12V Power Supply Design Guide (24pin hlavní konektor, PS_ON# pin 16, COM 15/17)',
  pcie8: 'PCI Express CEM – 2×4 pin pomocné napájení: 1–3 +12 V, 4 Sense1, 5 GND, 6 Sense0, 7–8 GND',
  eps8: 'EPS12V 8 pin: 1–4 GND, 5–8 +12 V',
  sata: 'SATA napájení 15 pin: 1–3 +3,3 V, 4–6 GND, 7–9 +5 V, 10 a 12 GND, 11 spin-up, 13–15 +12 V',
  fan4: 'Intel 4-Wire PWM Fan Specification: 1 GND, 2 +12 V, 3 tacho (2 pulzy/ot.), 4 PWM 25 kHz',
};

// --- skupiny pinů konektorů (číslo pinu → signál), používají je modely i testy
export const PCIE8 = { 1: '+12V', 2: '+12V', 3: '+12V', 4: 'SENSE1', 5: 'GND', 6: 'SENSE0', 7: 'GND', 8: 'GND' };
export const EPS8 = { 1: 'GND', 2: 'GND', 3: 'GND', 4: 'GND', 5: '+12V', 6: '+12V', 7: '+12V', 8: '+12V' };
// PCIe 8pin kabel zdroje ve schématu L1 po skupinách: 1–3 +12 V, 4–8 zem (5/7/8 GND + uzemněné Sense1/Sense0)
const cablePins = (c) => ({ [`${c}1-3 +12V`]: Z, [`${c}4-8 GND`]: 0 });

export const PC_DEVICES = {
  // Dell T5810 jako celek: vypínač → vestavěný zdroj 685 W → SATA napájení (pro Add2PSU a regulátor)
  DELL_T5810: {
    meta: { ref: 'PC1', part: 'Dell Precision T5810 (deska C612 + zdroj 685 W)', pkg: 'TOWER', desc: 'Vypínač zapne vestavěný zdroj: SATA napájí Add2PSU, 2× PCIe 6 pin (přes PSU extended card, Dell KB 000140822) napájí kartu G1 jako ve videu. Grafika max. 225 W na kartu.' },
    pins: {
      inputs: { 'POWER': 0 },
      outputs: { 'SATA13 +12V': Z, 'SATA4 GND': Z, '6PIN-1 1-3 +12V': Z, '6PIN-1 4-6 GND': 0, '6PIN-2 1-3 +12V': Z, '6PIN-2 4-6 GND': 0, 'SLOT2 PCIe x16': Z, 'SLOT4 PCIe x16': Z, 'SLOT GND': 0 },
    },
    eval(comp) {
      const on = comp.inputs.POWER === 1;
      comp.outputs['SATA13 +12V'] = on ? 12 : Z;
      comp.outputs['SATA4 GND'] = on ? 0 : Z;
      // PCIe 6 pin (CEM 2×3): 1–3 +12 V, 4 a 6 GND, 5 Sense (na kabelu zdroje uzemněný)
      comp.outputs['6PIN-1 1-3 +12V'] = on ? 12 : Z;
      comp.outputs['6PIN-2 1-3 +12V'] = on ? 12 : Z;
      comp.outputs['SLOT2 PCIe x16'] = on ? 1 : Z; // linky PCIe Gen3 x16 z CPU (logická 1 = slot napájený, PERST# uvolněn)
      comp.outputs['SLOT4 PCIe x16'] = on ? 1 : Z;
    },
  },

  // Druhý zdroj: PS_ON# má uvnitř pull-up na +5VSB, zdroj běží, když ho něco stáhne na COM
  ATX_PSU: {
    meta: { ref: 'PS2', part: 'Seasonic Core GX-650 ATX 3 (650 W)', pkg: 'ATX', desc: 'Jako ve videu napájí jen kartu G2. Zapne se, když je PS_ON# (pin 16) spojený s COM. Má 4× PCIe 6+2, použité 2: piny 1–3 +12 V, 4–8 zem.' },
    pins: {
      inputs: { '16 PS_ON#': Z },
      outputs: {
        '15 COM': 0,
        ...cablePins('A'), ...cablePins('B'),
        'SATA13 +12V': Z, 'SATA4 GND': Z, '8 PWR_OK': 0,
      },
    },
    pulls: { '16 PS_ON#': 1 },
    eval(comp) {
      const on = comp.inputs['16 PS_ON#'] === 0;
      for (const c of 'AB') { comp.outputs[`${c}1-3 +12V`] = on ? 12 : Z; comp.outputs[`${c}4-8 GND`] = 0; }
      comp.outputs['SATA13 +12V'] = on ? 12 : Z;
      comp.outputs['SATA4 GND'] = on ? 0 : Z;
      comp.outputs['8 PWR_OK'] = on ? 1 : 0;
    },
  },

  // Add2PSU: 12 V ze zdroje Dellu → cívka relé → kontakt spojí PS_ON# druhého zdroje s COM
  ADD2PSU: {
    meta: { ref: 'A1', part: 'Add2PSU (relé)', pkg: 'PCB', desc: 'Cívka relé na 12 V z prvního zdroje (Molex/SATA); kontakt spojí PS_ON# (pin 16) druhého zdroje s COM. Patent US8878390.' },
    pins: { inputs: { 'SATA +12V': Z, 'SATA GND': Z, '15 COM': Z }, outputs: { '16 PS_ON#': Z } },
    eval(comp) {
      const coil = is12(comp.inputs['SATA +12V']) && isGnd(comp.inputs['SATA GND']);
      comp.outputs['16 PS_ON#'] = coil && isGnd(comp.inputs['15 COM']) ? 0 : Z;
      comp.coil = coil;
    },
  },

  // NVIDIA 030-0571-000: dva PCIe 8pin (ze zdroje) → jeden EPS 8pin (do karty). Jen měď.
  EPS_ADAPTER: {
    meta: { ref: 'W1', part: 'NVIDIA 030-0571-000 (2× PCIe 8 pin → EPS 8 pin)', pkg: 'CABLE', desc: '+12 V z pinů 1–3 obou PCIe konektorů jde na piny 5–8 EPS, zem z 5/7/8 na piny 1–4.' },
    passive: true,
    pins: {
      inputs: { 'P1 1-3 +12V': Z, 'P1 4-8 GND': Z, 'P2 1-3 +12V': Z, 'P2 4-8 GND': Z },
      outputs: { 'EPS5-8 +12V': Z, 'EPS1-4 GND': Z },
    },
    joins: [['P1 1-3 +12V', 'EPS5-8 +12V'], ['P2 1-3 +12V', 'EPS5-8 +12V'], ['P1 4-8 GND', 'EPS1-4 GND'], ['P2 4-8 GND', 'EPS1-4 GND']],
    eval() {},
  },

  // Tesla P100: napájecí vstup EPS12V (8 pin). Uvnitř karty jsou všechny +12V piny jedna rovina a všechny GND
  // druhá – proto PCIe kabel zapojený napřímo (+12 V na pinech 1–3) propojí +12 V se zemí: zkrat.
  TESLA_P100: {
    meta: { ref: 'G1', part: 'NVIDIA Tesla P100 PCIe 16 GB', pkg: 'PCIe x16', desc: 'EPS12V 8 pin (5–8 +12 V, 1–4 GND): 240 W / 20 A, slot 12 V 66 W, 3,3 V 10 W; celkem 250 W (NVIDIA PB-08248), v sestavě 150 W.' },
    pins: {
      inputs: { 'EPS5-8 +12V': Z, 'EPS1-4 GND': Z, 'SLOT GND': Z, 'PCIe x16': Z },
      outputs: { 'STAV': Z },
    },
    // zemní rovina karty: GND piny EPS a zem slotu PCIe jsou jedna měď (proto PCIe kabel napřímo = zkrat přes slot)
    joins: [['EPS1-4 GND', 'SLOT GND']],
    eval(comp) {
      const v12 = comp.inputs['EPS5-8 +12V'];
      const g = comp.inputs['EPS1-4 GND'];
      // STAV: 1 = napájená a ve slotu, 0 = bez napájení, X = zkrat na napájení
      comp.outputs.STAV = v12 === 'X' || g === 'X' ? 'X' : is12(v12) && isGnd(g) && comp.inputs['PCIe x16'] === 1 ? 1 : 0;
    },
  },

  // SATA napájený regulátor s knoflíkem (ModDIY TD404): +12 V jde rovnou na ventilátory, PWM podle knoflíku
  PWM_HUB: {
    meta: { ref: 'U1', part: 'ModDIY TD404 (SATA, 4× PWM, 60 W)', pkg: 'PCB', desc: 'Napájení SATA 12 V; na pin 2 všech portů jde +12 V, na pin 4 PWM podle knoflíku.' },
    pins: {
      inputs: { 'SATA13 +12V': Z, 'SATA4 GND': Z },
      outputs: { 'F1-2 +12V': Z, 'F1-1 GND': Z, 'F1-4 PWM': Z, 'F2-2 +12V': Z, 'F2-1 GND': Z, 'F2-4 PWM': Z },
    },
    eval(comp) {
      const on = is12(comp.inputs['SATA13 +12V']) && isGnd(comp.inputs['SATA4 GND']);
      const duty = Math.max(0, Math.min(100, num(comp.knob) ? comp.knob : 70)); // poloha knoflíku v %
      for (const f of ['F1', 'F2']) {
        comp.outputs[`${f}-2 +12V`] = on ? 12 : Z;
        comp.outputs[`${f}-1 GND`] = on ? 0 : Z;
        comp.outputs[`${f}-4 PWM`] = on ? duty : Z; // střída v % (25 kHz)
      }
    },
  },

  // Radiální ventilátor 9733 (Delta BFB1012VH 12 V 1,8 A): otáčky podle PWM, tacho 2 pulzy na otáčku
  BLOWER_9733: {
    meta: { ref: 'M1', part: 'Delta BFB1012VH (9733, 12 V, 1,8 A)', pkg: 'FAN', desc: 'Pin 1 GND, 2 +12 V, 3 tacho, 4 PWM. Bez +12 V stojí – karta P100 se pak přehřeje.' },
    pins: { inputs: { '1 GND': Z, '2 +12V': Z, '4 PWM': Z }, outputs: { '3 OT/MIN': 0 } },
    eval(comp) {
      const on = is12(comp.inputs['2 +12V']) && isGnd(comp.inputs['1 GND']);
      const duty = num(comp.inputs['4 PWM']) ? comp.inputs['4 PWM'] : 100; // nezapojený PWM = plné otáčky
      comp.outputs['3 OT/MIN'] = on ? Math.round((comp.maxRpm || 4500) * Math.max(0.2, duty / 100)) : 0;
    },
  },

  // ---------------------------------------------------------------- konektory a díly pro schémata L2
  // Konektory jsou jen měď (pasivní); číslování pinů podle norem (viz PIN_SOURCES).
  CONN_PCIE8: {
    meta: { ref: 'J', part: 'PCIe 8 pin (2×4 Mini-Fit Jr)', pkg: 'CONN', desc: 'Strana zdroje: 1–3 +12 V, 4 Sense1, 5/7/8 GND, 6 Sense0 (na kabelu zdroje jsou Sense uzemněné). Zámek u řady 5–8.' },
    passive: true,
    pins: { inputs: {}, outputs: Object.fromEntries(Object.entries(PCIE8).map(([n, s]) => [`${n} ${s}`, Z])) },
    eval() {},
  },
  CONN_EPS8: {
    meta: { ref: 'J', part: 'EPS12V 8 pin (2×4 Mini-Fit Jr)', pkg: 'CONN', desc: '1–4 GND, 5–8 +12 V; +12 V je v řadě se zámkem – opačně než u PCIe.' },
    passive: true,
    pins: { inputs: {}, outputs: Object.fromEntries(Object.entries(EPS8).map(([n, s]) => [`${n} ${s}`, Z])) },
    eval() {},
  },
  CONN_SATA: {
    meta: { ref: 'J', part: 'SATA napájení 15 pin', pkg: 'CONN', desc: '1–3 +3,3 V, 4–6/10/12 GND, 7–9 +5 V, 11 spin-up, 13–15 +12 V.' },
    passive: true,
    pins: { inputs: {}, outputs: { '13-15 +12V': Z, '4-6,10,12 GND': Z, '7-9 +5V': Z, '1-3 +3,3V': Z } },
    eval() {},
  },
  CONN_ATX24: {
    meta: { ref: 'J', part: 'ATX 24 pin (Mini-Fit Jr 2×12)', pkg: 'CONN', desc: '16 PS_ON# (zelená, aktivní v nule, pull-up ve zdroji), 15/17 COM, 8 PWR_OK, 9 +5VSB.' },
    passive: true,
    pins: { inputs: {}, outputs: { '16 PS_ON#': Z, '15 COM': Z, '8 PWR_OK': Z, '9 +5VSB': Z } },
    pulls: { '16 PS_ON#': 1 }, // pull-up na TTL high je uvnitř zdroje 2 (Intel ATX DG tab. 4-11)
    eval() {},
  },
  CONN_FAN4: {
    meta: { ref: 'J', part: 'Ventilátor 4 pin (KF2510 / Molex 47053)', pkg: 'CONN', desc: '1 GND, 2 +12 V, 3 tacho (2 pulzy/ot.), 4 PWM 25 kHz – bez signálu běží ventilátor naplno.' },
    passive: true,
    pins: { inputs: {}, outputs: { '1 GND': Z, '2 +12V': Z, '3 SENSE': Z, '4 PWM': Z } },
    eval() {},
  },
  // Relé (Add2PSU: Golden GB-1C12L podle recenze, cívka 12 V): sepnutý kontakt přivede COM na NO
  RELAY: {
    meta: { ref: 'K1', part: 'Relé 12 V (GB-1C12L, 1× přepínací kontakt)', pkg: 'RELAY', desc: 'Cívka sepne, když je na ní 12 V; kontakt pak spojí COM s NO. Datasheet relé neověřen.' },
    pins: { inputs: { 'A1 cívka +': Z, 'A2 cívka −': Z, 'COM': Z }, outputs: { 'NO': Z } },
    eval(comp) {
      const a = comp.inputs['A1 cívka +'];
      const energized = (is12(a) || a === 1) && (isGnd(comp.inputs['A2 cívka −']) || comp.inputs['A2 cívka −'] === Z);
      comp.energized = energized;
      comp.outputs.NO = energized && comp.inputs.COM !== Z ? comp.inputs.COM : Z;
    },
  },
  DIODE: {
    meta: { ref: 'D', part: 'Dioda', pkg: 'DO-41', desc: 'Nulová (flyback) dioda přes cívku relé – u Add2PSU neověřená, běžná praxe.' },
    passive: true,
    pins: { inputs: {}, outputs: { 'A': Z, 'K': Z } },
    eval() {},
  },
};

// Názvy sítí podle pinů (plátno pak ukazuje volty, střídu PWM a otáčky místo logických 0/1)
const netNameOf = (pin) => /\+12V/.test(pin) ? '+12V' : /\+5VSB/.test(pin) ? '+5VSB' : /\+5V/.test(pin) ? '+5V' : /\+3,3V/.test(pin) ? '+3,3V'
  : /GND|COM/.test(pin) ? 'GND' : /PWM/.test(pin) ? 'PWM %' : /OT\/MIN/.test(pin) ? 'OT/MIN' : null;
for (const dev of Object.values(PC_DEVICES)) {
  const names = {};
  for (const pin of [...Object.keys(dev.pins.inputs || {}), ...Object.keys(dev.pins.outputs || {})]) {
    const n = netNameOf(pin);
    if (n) names[pin] = n;
  }
  dev.netNames = { ...names, ...dev.netNames };
}

