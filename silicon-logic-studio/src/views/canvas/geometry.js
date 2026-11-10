// Geometrie součástek na 2D plátně: pozice ve schématu / na DPS, rozměry a umístění pinů.
// Piny skutečných součástek (DEVICES) se kladou na tu stranu pouzdra, kam vede jejich spoj,
// a na straně se řadí podle polohy protějšku – spoje se tak nekříží zbytečně.
import { DEVICES } from '../../engine/devices/index.js';
import { pinWidth } from '../../engine/logicEngine.js';
import { componentDims, hardwarePinPos, isBracketPart } from '../../engine/boardLayout.js';

export const isDevice = (comp) => !!DEVICES[comp.type];
export const deviceMeta = (comp) => DEVICES[comp.type]?.meta || null;
export const isOffBoard = (comp) => !!DEVICES[comp.type]?.meta?.offBoard;
// Primitiva s vlastní schematickou značkou (ostatní se ve schématu kreslí jako box s piny)
const SYMBOL_TYPES = new Set(['AND', 'NAND', 'OR', 'NOR', 'XOR', 'NOT', 'D_FF', 'INPUT', 'CLOCK', 'PROBE', 'VIRTUAL_SCREEN', 'SEVEN_SEGMENT', 'NMOS', 'PMOS', 'VDD', 'GND', 'LAYER', 'ATOM']);
/** Box s piny: skutečné součástky karty, funkční bloky čipu a ve schématu i registry, sčítačky, konstanty… */
export const isBoxPart = (comp, mode = 'schematic') => isDevice(comp) || comp.type === 'DIE_BLOCK' || (mode === 'schematic' && !SYMBOL_TYPES.has(comp.type));
/** Popisné štítky bez logiky (vrstvy procesu, atomy). */
export const isLabelPart = (comp) => comp.type === 'LAYER' || comp.type === 'ATOM';

/** Zalomí text po slovech na řádky o nejvýš maxChars znacích. */
export function wrapText(text, maxChars) {
  const lines = [];
  let cur = '';
  for (const word of String(text).split(/\s+/)) {
    if (cur && (cur + ' ' + word).length > maxChars) { lines.push(cur); cur = word; } else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Funkční blok čipu: šířka podle popisku (nejvýš BLOCK_MAX_W, pak se zalomí), nebo comp.w/comp.h
const BLOCK_CHAR = 6.1; // 10px Courier tučně
const BLOCK_MAX_W = 124; // podobvody kladou bloky na mřížku 150 px
export function blockTitle(comp) {
  const w = comp.w || Math.max(90, Math.min(BLOCK_MAX_W, Math.ceil(String(comp.label || comp.type).length * BLOCK_CHAR + 14)));
  const lines = wrapText((comp.label || comp.type).toUpperCase(), Math.max(6, Math.floor((w - 12) / BLOCK_CHAR)));
  return { w, lines, header: 12 + lines.length * 12 + 10 };
}

// Štítek vrstvy / atomu: zalomený text v rámečku
export function labelTag(comp) {
  const lines = wrapText(comp.label || comp.type, 22);
  return { w: 140, h: 12 + lines.length * 11, lines };
}

/** Poloha součástky v daném pohledu: schéma má vlastní sx/sy (záloha x/y). */
export function viewPos(comp, mode) {
  return mode === 'schematic' ? { x: comp.sx ?? comp.x, y: comp.sy ?? comp.y } : { x: comp.x, y: comp.y };
}

/** Zapíše polohu součástky v daném pohledu (tažení myší). */
export function setViewPos(comp, mode, x, y) {
  if (mode === 'schematic') { comp.sx = x; comp.sy = y; } else { comp.x = x; comp.y = y; }
}

export const pinNames = (comp) => [...new Set([...Object.keys(comp.inputs || {}), ...Object.keys(comp.outputs || {})])];

/** Referenční označení z popisku ("U4 KM416C256 …" -> "U4"), jinak z meta. */
export function refOf(comp) {
  const m = /^([A-Z]{1,3}\d{1,2})\b/.exec(comp.label || '');
  return m ? m[1] : deviceMeta(comp)?.ref || comp.type;
}

/** Popisek pinu ve schématu: velká písmena + šířka sběrnice, pokud ji název neobsahuje. */
export function pinLabel(comp, pin) {
  const wdt = pinWidth(comp, pin);
  const up = pin.toUpperCase();
  return wdt > 1 && !up.includes('[') ? `${up}[${wdt - 1}:0]` : up;
}

// Schéma: pevná rozteč pinů, nad nimi hlavička s názvem
export const SCH = { header: 34, pitch: 14, font: 8, charW: 4.9 };

// Minimální rozměry boxů ve schématu, kde je potřeba místo na živý stav
const SCH_MIN = { VGA_MONITOR: [300, 250], AUDIO_SPEAKERS: [230, 130], PCI_HOST: [230, 210], SATURN_PAD: [200, 130], CRYSTAL: [130, 62] };

// Které strany pouzdra mají vývody (DPS)
const PKG_SIDES = {
  'SOJ-40': 'LR', 'HC-49/U': 'LR', 'DSUB-15HD': 'LR', RJ45: 'LR', JACK35: 'LR',
  'DIP-28': 'TB', 'EDGE-120': 'TB',
};

// ------------------------------------------------------------------ peers (kam vede každý pin)
const peerCache = new WeakMap();
function peerMap(engine) {
  const c = peerCache.get(engine);
  if (c && c.wires === engine.wires && c.n === engine.wires.length && c.size === engine.components.size) return c.map;
  const map = new Map();
  const add = (k, comp) => { if (comp) (map.get(k) || map.set(k, []).get(k)).push(comp); };
  for (const w of engine.wires) {
    add(`${w.from.id}:${w.from.pin}`, engine.components.get(w.to.id));
    add(`${w.to.id}:${w.to.pin}`, engine.components.get(w.from.id));
  }
  peerCache.set(engine, { wires: engine.wires, n: engine.wires.length, size: engine.components.size, map });
  return map;
}

function centerOf(comp, mode) {
  const p = viewPos(comp, mode);
  const d = componentDims(comp, mode);
  return { x: p.x + d.w / 2, y: p.y + d.h / 2 };
}

// ------------------------------------------------------------------ layout jednoho snímku
/**
 * Geometrie všech součástek pro jeden snímek / jednu událost myši.
 * geom(comp) -> { x, y, w, h, pins: Map(pin -> { x, y, side }) }
 */
export function makeLayout(engine, mode) {
  const memo = new Map();
  const peers = peerMap(engine);

  function deviceGeom(comp) {
    const pos = viewPos(comp, mode);
    const device = isDevice(comp);
    const dims = componentDims(comp, mode);
    const base = device ? dims : { w: comp.w || Math.max(dims.w, blockTitle(comp).w), h: comp.h || dims.h };
    const me = { x: pos.x + base.w / 2, y: pos.y + base.h / 2 };
    const pkg = deviceMeta(comp)?.pkg;
    const allowed = mode === 'schematic' ? 'LR' : PKG_SIDES[pkg] || 'LRTB';
    const bracket = mode === 'hardware' && isBracketPart(comp);

    // strana a třídicí klíč každého pinu
    const bySide = { L: [], R: [], T: [], B: [] };
    for (const pin of pinNames(comp)) {
      const ps = peers.get(`${comp.id}:${pin}`) || [];
      let side;
      let key = 1e9;
      if (ps.length) {
        const cs = ps.map((p) => centerOf(p, mode));
        const dx = cs.reduce((a, c) => a + c.x, 0) / cs.length - me.x;
        const dy = cs.reduce((a, c) => a + c.y, 0) / cs.length - me.y;
        const dirIn = pin in (comp.inputs || {});
        const dirOut = pin in (comp.outputs || {});
        if (bracket) side = ps.some(isOffBoard) ? 'L' : 'R';
        else if (!device && dirIn !== dirOut) side = dirIn ? 'L' : 'R'; // primitivum / blok: vstupy vlevo, výstupy vpravo
        else if (allowed === 'LR') side = dx < 0 ? 'L' : 'R';
        else if (allowed === 'TB') side = dy < 0 ? 'T' : 'B';
        else side = Math.abs(dx) / base.w >= Math.abs(dy) / base.h ? (dx < 0 ? 'L' : 'R') : dy < 0 ? 'T' : 'B';
        key = side === 'L' || side === 'R' ? me.y + dy : me.x + dx;
      } else {
        const out = pin in (comp.outputs || {}) && !(pin in (comp.inputs || {}));
        side = allowed === 'TB' ? (out ? 'B' : 'T') : out ? 'R' : 'L';
      }
      // druhý klíč = index sítě: oba konce svazku spojů mezi dvěma součástkami se seřadí stejně (nekříží se)
      bySide[side].push({ pin, key, net: engine.netIndexOf(comp.id, pin) });
    }
    for (const s of Object.values(bySide)) s.sort((a, b) => a.key - b.key || a.net - b.net);

    let { w, h } = base;
    let header = SCH.header;
    if (!device) header = blockTitle(comp).header;
    if (mode === 'schematic') {
      const min = SCH_MIN[comp.type];
      if (min) { w = Math.max(w, min[0]); h = Math.max(h, min[1]); }
      h = Math.max(h, header + Math.max(bySide.L.length, bySide.R.length) * SCH.pitch + 10);
    }

    const pins = new Map();
    for (const [side, list] of Object.entries(bySide)) {
      const n = list.length;
      list.forEach(({ pin }, i) => {
        let x;
        let y;
        if (mode === 'schematic') {
          y = pos.y + header + SCH.pitch / 2 + i * SCH.pitch;
          x = side === 'L' ? pos.x : pos.x + w;
        } else {
          // po celé délce strany (rohy pouzdra QFP/PLCC vynechat)
          const inset = allowed === 'LRTB' ? 0.12 : 0.06;
          const t = n === 1 ? 0.5 : inset + ((1 - 2 * inset) * i) / (n - 1);
          if (side === 'L' || side === 'R') { x = side === 'L' ? pos.x : pos.x + w; y = pos.y + h * t; } else { y = side === 'T' ? pos.y : pos.y + h; x = pos.x + w * t; }
        }
        pins.set(pin, { x, y, side });
      });
    }
    return { x: pos.x, y: pos.y, w, h, header, pins, sides: bySide };
  }

  function primitiveGeom(comp, schematicPinPos) {
    const pos = viewPos(comp, mode);
    let { w, h } = componentDims(comp, mode);
    const pins = new Map();
    if (isLabelPart(comp)) ({ w, h } = labelTag(comp));
    if (mode === 'schematic') {
      // značka MOSFET: hradlo vlevo, drain/source nahoře a dole (NMOS: D nahoře, PMOS: S nahoře)
      if (comp.type === 'NMOS' || comp.type === 'PMOS') {
        const top = comp.type === 'NMOS' ? 'd' : 's';
        const bottom = comp.type === 'NMOS' ? 's' : 'd';
        pins.set('g', { x: pos.x, y: pos.y + h / 2, side: 'L' });
        pins.set(top, { x: pos.x + w * 0.62, y: pos.y, side: 'T' });
        pins.set(bottom, { x: pos.x + w * 0.62, y: pos.y + h, side: 'B' });
        return { x: pos.x, y: pos.y, w, h, pins, sides: null };
      }
      if (comp.type === 'VDD') { pins.set('out', { x: pos.x + w / 2, y: pos.y + h, side: 'B' }); return { x: pos.x, y: pos.y, w, h, pins, sides: null }; }
      if (comp.type === 'GND') { pins.set('out', { x: pos.x + w / 2, y: pos.y, side: 'T' }); return { x: pos.x, y: pos.y, w, h, pins, sides: null }; }
    }
    const place = (pin, isOut) => {
      const p = mode === 'schematic' ? schematicPinPos({ ...comp, x: pos.x, y: pos.y }, pin, isOut) : hardwarePinPos({ ...comp, x: pos.x, y: pos.y }, pin, isOut);
      pins.set(pin, { x: p.x, y: p.y, side: isOut ? 'R' : 'L' });
    };
    for (const pin of Object.keys(comp.inputs || {})) place(pin, false);
    for (const pin of Object.keys(comp.outputs || {})) if (!pins.has(pin)) place(pin, true);
    return { x: pos.x, y: pos.y, w, h, pins, sides: null };
  }

  return {
    mode,
    /** schematicPinPos: pozice pinů primitiv ve schématu (hradla mají vlastní tvar) */
    geom(comp, schematicPinPos) {
      let g = memo.get(comp);
      if (!g) {
        g = isBoxPart(comp, mode) ? deviceGeom(comp) : primitiveGeom(comp, schematicPinPos);
        memo.set(comp, g);
      }
      return g;
    },
  };
}

// ------------------------------------------------------------------ vedení spojů
const DIR = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] };

/** Pravoúhlá cesta mezi dvěma piny (s vývodem kolmo od pouzdra). `lane` posouvá souběžné spoje. */
export function routeOrtho(a, b, lane = 0, stub = 10) {
  const da = DIR[a.side || 'R'];
  const db = DIR[b.side || 'L'];
  const a1 = { x: a.x + da[0] * stub, y: a.y + da[1] * stub };
  const b1 = { x: b.x + db[0] * stub, y: b.y + db[1] * stub };
  const hA = da[0] !== 0;
  const hB = db[0] !== 0;
  let mid;
  if (hA && hB) {
    let mx = (a1.x + b1.x) / 2 + lane;
    if (da[0] === db[0]) mx = da[0] > 0 ? Math.max(a1.x, b1.x) + Math.abs(lane) : Math.min(a1.x, b1.x) - Math.abs(lane);
    mid = [{ x: mx, y: a1.y }, { x: mx, y: b1.y }];
  } else if (!hA && !hB) {
    let my = (a1.y + b1.y) / 2 + lane;
    if (da[1] === db[1]) my = da[1] > 0 ? Math.max(a1.y, b1.y) + Math.abs(lane) : Math.min(a1.y, b1.y) - Math.abs(lane);
    mid = [{ x: a1.x, y: my }, { x: b1.x, y: my }];
  } else if (hA) {
    mid = [{ x: b1.x, y: a1.y }];
  } else {
    mid = [{ x: a1.x, y: b1.y }];
  }
  return dedupe([a, a1, ...mid, b1, b]);
}

/** Kabel, který musí obejít kartu: vede vodorovně ve výšce `aroundY`. */
export function routeAround(a, b, aroundY, stub = 22) {
  const da = DIR[a.side || 'L'];
  const db = DIR[b.side || 'L'];
  const a1 = { x: a.x + da[0] * stub, y: a.y + da[1] * stub };
  const b1 = { x: b.x + db[0] * stub, y: b.y + db[1] * stub };
  return dedupe([a, a1, { x: a1.x, y: aroundY }, { x: b1.x, y: aroundY }, b1, b]);
}

function dedupe(pts) {
  const out = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.abs(q.x - p.x) > 0.01 || Math.abs(q.y - p.y) > 0.01) out.push(p);
  }
  return out;
}

/** Nakreslí lomenou čáru se sraženými (45°) nebo zaoblenými rohy. */
export function tracePolyline(ctx, pts, corner = 0, round = false) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    if (!corner) { ctx.lineTo(p.x, p.y); continue; }
    const a = pts[i - 1];
    const b = pts[i + 1];
    const la = Math.hypot(p.x - a.x, p.y - a.y);
    const lb = Math.hypot(b.x - p.x, b.y - p.y);
    const c = Math.min(corner, la / 2, lb / 2);
    if (round) { ctx.arcTo(p.x, p.y, b.x, b.y, c); continue; }
    ctx.lineTo(p.x - ((p.x - a.x) / la) * c, p.y - ((p.y - a.y) / la) * c);
    ctx.lineTo(p.x + ((b.x - p.x) / lb) * c, p.y + ((b.y - p.y) / lb) * c);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}
