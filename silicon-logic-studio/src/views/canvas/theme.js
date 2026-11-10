// Barvy, písma a formátování hodnot pro 2D plátno (vzhled podle portfolia: obsidián, jantar = logická 1 / výběr).
import { WireState } from '../../engine/logicEngine.js';

export const THEME = {
  bg: '#010102',
  panel: 'rgba(3, 5, 7, 0.94)',
  grid: 'rgba(113, 117, 121, 0.22)',
  gridMajor: 'rgba(113, 117, 121, 0.3)',
  high: '#FFA909', // logická 1, aktivní signál, výběr
  highRgb: '255, 169, 9',
  highDim: '#B87A08',
  low: '#495766', // logická 0 – tlumená šedomodrá
  lowRgb: '73, 87, 102',
  highZ: '#606368', // vysoká impedance – kreslí se přerušovaně
  conflict: '#DE3B3D', // zkrat / konflikt budičů
  stroke: '#8A8E93', // obrys schematických značek
  label: '#ADAAA7',
  muted: '#717579',
  text: '#EDEBE7',
  // deska plošných spojů
  mask: '#0E3A22',
  maskEdge: '#1B5A37',
  silk: '#E8E6DF',
  copper: '#8C6A3A',
  copperRgb: '140, 106, 58',
  gold: '#D3A73F',
  epoxy: '#141519',
  mono: '"Courier New", monospace',
  sans: '"Outfit", sans-serif',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Analogová síť: nese napětí (float), ne logickou úroveň. */
export function isAnalog(value, label) {
  if (!isNum(value)) return false;
  if (label && /analog/i.test(label)) return true;
  return !Number.isInteger(value) && Math.abs(value) < 50;
}

/** Plný rozsah napětí analogové sítě (RGB 0–0,7 V, linkový výstup ±1 V). */
export const analogRange = (label) => (label && /RED|GREEN|BLUE|RGB/i.test(label) ? 0.7 : 1);

const mix = (a, b, t) => {
  const pa = a.split(',').map(Number);
  const pb = b.split(',').map(Number);
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(', ');
};

/**
 * Jak nakreslit síť s danou hodnotou: barva, přerušování, text hodnoty.
 * `lowRgb` dovolí PCB kreslit logickou 0 barvou mědi.
 */
export function signalStyle(value, width = 1, label = null, lowRgb = THEME.lowRgb) {
  if (value === WireState.CONFLICT) return { color: THEME.conflict, dash: null, text: 'X', state: 'x' };
  if (value === WireState.HIGH_Z || value === undefined) return { color: THEME.highZ, dash: [5, 4], text: 'Z', state: 'z' };
  // napájecí sítě PC (pojmenované zařízeními): volty, střída PWM, otáčky ventilátoru
  if (isNum(value) && label && /^(\+\d|GND$)/.test(label)) {
    const t = Math.min(1, Math.abs(value) / 12);
    return { color: value === 0 ? `rgb(${lowRgb})` : `rgb(${mix(lowRgb, THEME.highRgb, 0.35 + 0.65 * t)})`, dash: null, text: `${String(value).replace('.', ',')} V`, state: value ? 'analog' : 'low' };
  }
  if (isNum(value) && label === 'PWM %') return { color: THEME.high, dash: null, text: `${value} %`, state: 'high' };
  if (isNum(value) && label === 'OT/MIN') return { color: value ? THEME.high : `rgb(${lowRgb})`, dash: null, text: `${value} ot/min`, state: value ? 'high' : 'low' };
  if (isAnalog(value, label)) {
    const t = Math.min(1, Math.abs(value) / analogRange(label));
    return { color: `rgb(${mix(lowRgb, THEME.highRgb, t)})`, dash: null, text: fmtVolt(value), state: 'analog' };
  }
  if (!isNum(value)) return { color: THEME.highZ, dash: [5, 4], text: String(value), state: 'z' };
  // výstup krystalu nese jeho kmitočet (referenční hodiny pro PLL / kodek)
  if (width === 1 && value > 1000) return { color: THEME.high, dash: null, text: fmtHz(value), state: 'clock' };
  const on = width > 1 ? value !== 0 : value === 1;
  const text = width > 1 ? '0x' + (value >>> 0).toString(16).toUpperCase() : String(value);
  return { color: on ? THEME.high : `rgb(${lowRgb})`, dash: null, text, state: on ? 'high' : 'low' };
}

export function fmtVolt(v) {
  return `${v.toFixed(Math.abs(v) < 1 ? 2 : 1)} V`;
}

export function fmtHz(hz) {
  if (!isNum(hz) || hz <= 0) return '—';
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(hz % 1e6 ? 3 : 0)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
  return `${hz.toFixed(0)} Hz`;
}

/** Simulovaný čas v ns -> čitelný text. */
export function fmtTime(ns) {
  if (!isNum(ns)) return '—';
  if (ns < 1e3) return `${ns.toFixed(0)} ns`;
  if (ns < 1e6) return `${(ns / 1e3).toFixed(2)} µs`;
  if (ns < 1e9) return `${(ns / 1e6).toFixed(3)} ms`;
  return `${(ns / 1e9).toFixed(3)} s`;
}

/** Text zkrácený tak, aby se vešel do šířky `maxW` (aktuálním písmem kontextu). */
export function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.length > 1 ? s + '…' : '';
}
