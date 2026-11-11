// LEVEL 1: the circuit as a physical printed circuit board.
// Positions and footprints come from the same layout as the 2D "HARDWARE PCB" view (boardLayout.js),
// so the 3D board is an extrusion of the 2D drawing: 1 px = 1/3.7 mm, parts in their real package sizes.
// For the Diamond Edge 3D the parts are modelled from their datasheet outlines (packages.js, in mm),
// copper traces are routed from the engine's nets (pcbRouter.js) and glow with the net value.
import * as THREE from 'three';
import { componentDims, hardwarePinPos, NV1_CARD, nv1CardOutline, isOnNv1Card, isBracketPart, crystalFrequency, PX_PER_MM } from '../../engine/boardLayout.js';
import { DEVICES } from '../../engine/devices/index.js';
import { std, textTexture, ribbonGeometry, mergeGeos, isActive } from './common.js';
import * as P from './packages.js';
import { createRouter } from './pcbRouter.js';
import { paintScreen } from '../canvas/screen.js';

export const BOARD_SCALE = 0.05; // 2D px → 3D units (648 px card ≈ 32.4 units)
const S = BOARD_SCALE;
const PX = PX_PER_MM; // 2D px per mm
const MM = PX * S; // 3D units per mm
const PCB_T = 1.6 * MM; // FR-4 1.6 mm
const DESK_Y = -26 * MM;
const CU_Y = PCB_T + 0.004; // copper traces (under the solder mask)

const meta = (comp) => DEVICES[comp.type]?.meta;
const refOf = (comp) => (comp.label || '').split(' ')[0] || meta(comp)?.ref || comp.id;

// Bracket connectors: depth of the body on the PCB behind the bracket (mm) and their 3D builders
// plugAt: where a mated plug sits (centre height above the PCB, x of the connector's mating face)
const BRACKET = {
  VGA_DB15: { depth: 10, build: P.de15, plug: P.vgaPlug, cableR: 3.2, plugAt: { yc: 6.3, front: -P.PLATE - 6.0 } },
  GAME_PORT: { depth: 17, build: P.rj45, plug: P.rjPlug, cableR: 2.2, plugAt: { yc: 7.4, front: 0 } },
  AUDIO_JACK: { depth: 10, build: P.jack35, plug: P.jackPlug, cableR: 1.6, plugAt: { yc: 3.0, front: -P.PLATE - 2.2 } },
};

// ---------------------------------------------------------------- chip markings
function wrapWords(text, max) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) { out.push(line); line = word; } else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out;
}

/** Top marking printed from meta.part: part numbers large, maker / description small.
 *  uLen / vLen = mm covered by the texture's horizontal / vertical axis. */
function partMarking(comp, uLen, vLen) {
  const part = meta(comp)?.part || comp.type;
  const main = part.split('(')[0].trim();
  const paren = /\(([^)]*)\)/.exec(part)?.[1];
  const big = Math.max(uLen, vLen);
  const cw = Math.round((512 * uLen) / big), ch = Math.round((512 * vLen) / big);
  const maxChars = Math.max(10, Math.round(uLen * 0.62));
  const items = main.split(/\s*\/\s*/).flatMap((seg) => wrapWords(seg, maxChars)).map((t) => ({ text: t, k: /\d/.test(t) ? 0.13 : 0.085, color: /\d/.test(t) ? '#c9c7c1' : '#9d9b96' }));
  if (paren) wrapWords(paren, maxChars + 6).forEach((t) => items.push({ text: t, k: 0.06, color: '#7d7b77' }));
  const sizes = items.map((it) => Math.min(ch * it.k, (cw * 0.8) / (it.text.length * 0.55)));
  const fit = Math.min(1, (ch * 0.8) / (sizes.reduce((a, v) => a + v, 0) * 1.25));
  // laser-etched style marking: plain sans, light grey on the black epoxy
  const lines = items.map((it, i) => ({ text: it.text, color: it.color, font: `600 ${Math.max(8, Math.round(sizes[i] * fit))}px Arial, Helvetica, sans-serif` }));
  return textTexture(lines, { w: cw, h: ch, bg: '#151618', fg: '#c9c7c1', lineGap: 1.25 });
}

/** Map the marking onto the top face of an icBody (uv from x/z so the text is never stretched). */
function fitMarking(model, bw, bd, rotate) {
  model.traverse((o) => {
    if (!o.isMesh || !Array.isArray(o.material) || !o.material[0].map) return;
    const pos = o.geometry.attributes.position, uv = o.geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      if (rotate) uv.setXY(i, (bd / 2 - z) / bd, (bw / 2 - x) / bw);
      else uv.setXY(i, (x + bw / 2) / bw, (bd / 2 - z) / bd);
    }
    uv.needsUpdate = true;
  });
}

// ---------------------------------------------------------------- real NV1 card parts (mm)
export function buildRealPart(comp) {
  const t = comp.type;
  const ic = (builder, bw, bd, opts, rotate = false) => {
    const m = builder({ bw, bd, marking: rotate ? partMarking(comp, bd, bw) : partMarking(comp, bw, bd), ...opts });
    fitMarking(m, bw, bd, rotate);
    return m;
  };
  if (t === 'NV1_CORE') return ic(P.pqfp, 28, 28, { h: 3.4, standoff: 0.25, nx: 52, nz: 52, pitch: 0.5, lead: 1.3, leadW: 0.22 });
  if (t === 'RAMDAC_STG1764') return ic(P.pqfp, 28, 28, { h: 3.4, standoff: 0.25, nx: 32, nz: 32, pitch: 0.8, lead: 1.6, leadW: 0.35 });
  if (t === 'DRAM_256K16') return ic(P.jLeaded, 26.03, 10.16, { h: 2.75, standoff: 0.85, nx: 20, pitch: 1.27, out: 0.52 });
  if (t === 'SEGA_ASIC') return ic(P.jLeaded, 16.6, 16.6, { h: 3.6, standoff: 0.85, nx: 11, nz: 11, pitch: 1.27, out: 0.5, c: 0.8, c1: 1.6 });
  if (t === 'BUS_SWITCH_32') {
    // four QSOP-20 in a row between the DRAM banks; offsets (mm) measured on the photo of the card
    const g = new THREE.Group();
    for (const off of comp.single ? [0] : [-21.1, -11.5, 9.9, 20.8]) { // single = one chip for the parts list
      const marking = textTexture([{ text: 'PI5C', font: '600 70px Arial, Helvetica, sans-serif' }, { text: '3245Q', font: '600 70px Arial, Helvetica, sans-serif' }], { w: 512, h: 230, bg: '#151618', fg: '#c9c7c1', lineGap: 1.2 });
      const m = P.pqfp({ bw: 8.65, bd: 3.9, h: 1.5, standoff: 0.15, nx: 10, nz: 0, pitch: 0.635, lead: 1.05, leadW: 0.25, marking });
      fitMarking(m, 8.65, 3.9, false);
      m.position.x = off;
      g.add(m);
    }
    return g;
  }
  if (t === 'SEGA_HEADER') {
    // 2 x 5 pin header, 2.54 mm pitch: black base, gold square pins
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(12.7, 2.5, 5.08), std(0x141416, { roughness: 0.6 }));
    base.position.y = 1.25;
    g.add(base);
    const gold = std(0xd4af37, { metalness: 0.9, roughness: 0.3 });
    for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.64, 8.5, 0.64), gold);
      pin.position.set((k - 2) * 2.54, 4.25, (r - 0.5) * 2.54);
      g.add(pin);
    }
    return g;
  }
  if (t === 'AD1845') return ic(P.jLeaded, 24.2, 24.2, { h: 3.6, standoff: 0.85, nx: 17, nz: 17, pitch: 1.27, out: 0.5, c: 0.8, c1: 1.6 });
  if (t === 'EPROM_27C256') {
    const g = new THREE.Group(); // the DIP stands across the card
    const m = ic(P.dipMm, 36.8, 13.4, { pins: 28, h: 3.8, standoff: 0.6, row: 15.24 });
    m.rotation.y = Math.PI / 2;
    return g.add(m);
  }
  if (t === 'CRYSTAL') return P.hc49u({ lines: [crystalFrequency(comp), { text: 'MHz', font: 'bold 54px "JetBrains Mono", monospace' }] });
  return null;
}

// ---------------------------------------------------------------- generic (non-NV1) circuits
const CHIP_CODES = {
  AND: 'SN74LS08N', OR: 'SN74LS32N', XOR: 'SN74LS86N', NOT: 'SN74LS04N', NAND: 'SN74LS00N', NOR: 'SN74LS02N',
  // 74377 = registr s povolením zápisu (74374 ho nemá), 74126 = třístavový budič s povolením v 1.
  // DEMUX 1:2 a rozbočení sběrnice nemají přesný protějšek v řadě 74 (74139 má výstupy aktivní v 0, 74245 je budič).
  D_FF: 'SN74LS74AN', REGISTER_8BIT: 'SN74LS377N', REGISTER_16BIT: '2× SN74LS377N', REGISTER_32BIT: '4× SN74LS377N',
  RAM: 'HM62256BLP', ROM: 'AT28C64B', MUX: 'SN74LS157N', TRI_STATE_BUFFER: 'SN74LS126AN',
};
const DIP_PINS = { RAM: 28, ROM: 28, REGISTER_8BIT: 20, REGISTER_16BIT: 20, REGISTER_32BIT: 20, MUX: 16, BUS_SPLITTER: 20, BUS_MERGER: 20 };

function buildGenericPart(comp, W, D, ctx) {
  const t = comp.type;
  if (t === 'CLOCK') {
    const g = P.hc49u({ lines: [crystalFrequency(comp), { text: 'MHz', font: 'bold 54px monospace' }] });
    g.scale.setScalar(MM);
    return new THREE.Group().add(g);
  }
  if (t === 'INPUT') {
    const sw = P.slideSwitch({ w: W, d: D });
    ctx.onFrame(() => { sw.lever.position.x = comp.outputs.out === 1 ? sw.travel : -sw.travel; });
    return sw.group;
  }
  if (t === 'PROBE') {
    const led = P.ledIndicator({ w: W, d: D });
    ctx.onFrame(() => { led.lens.material.emissiveIntensity = isActive(comp.inputs.in) ? 1.6 : 0.08; });
    return led.group;
  }
  if (t === 'SEVEN_SEGMENT') {
    const seg = P.sevenSegment({ w: W, d: D });
    const MAP = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];
    ctx.onFrame(() => {
      const v = ['b0', 'b1', 'b2', 'b3'].reduce((a, p, i) => a | (comp.inputs[p] === 1 ? 1 << i : 0), 0);
      seg.segments.forEach((m, i) => { m.material.emissiveIntensity = MAP[v] & (1 << i) ? 2.2 : 0; });
    });
    return seg.group;
  }
  if (t === 'VIRTUAL_SCREEN') {
    const crt = P.crtMonitor({ w: W, d: D });
    const c2 = crt.canvas.getContext('2d');
    let n = 0;
    ctx.onFrame(() => { if (++n % 2 === 0) drawVram(c2, comp, crt.screenTexture); });
    return crt.group;
  }
  const code = CHIP_CODES[t] || t;
  return P.dip({ w: W, d: D, pins: DIP_PINS[t] || 14, marking: textTexture([{ text: code, font: 'bold 64px monospace' }, { text: (comp.label || '').slice(0, 22), font: '34px monospace', color: '#8e8c88' }], { w: 1024, h: 256 }) });
}

function drawVram(c, comp, tex) {
  const W = c.canvas.width, H = c.canvas.height;
  c.fillStyle = '#050605';
  c.fillRect(0, 0, W, H);
  paintScreen(c, comp, 0, 0, W, H);
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------- PCI edge geometry (2D px)
const PCI_JOINS = () => DEVICES.PCI_EDGE?.joins || [];

/** Contact centres along the edge, listed from pin 1 (far end from the key) towards the key side. */
function pciFingerXs() {
  const { tab } = NV1_CARD;
  const p = 1.27 * PX, m = 0.5 * PX;
  const keyL = tab.x + tab.key.at, keyR = keyL + tab.key.w;
  const right = [], left = [];
  for (let x = keyR + p * 0.75; x < tab.x + tab.w - m; x += p) right.push(x);
  for (let x = keyL - p * 0.75; x > tab.x + m; x -= p) left.push(x);
  const r = right.slice(0, Math.max(0, 60 - left.length));
  return [...r.reverse(), ...left]; // pin 1 at the right end, keyed segment last
}

function pciPinNumber(name) {
  const m = /^[AB](\d+)/.exec(name || '');
  if (m) return Number(m[1]);
  if (/^AD/.test(name)) return 38; // AD[31:0] spans pins 20–58
  if (/BE/.test(name)) return 33;
  return 30;
}

// ---------------------------------------------------------------- scene
export function buildBoardScene(ctx) {
  const { engine, group } = ctx;
  const comps = [...engine.components.values()];
  const hasCard = comps.some((c) => c.type === 'NV1_CORE') && comps.some((c) => c.type === 'PCI_EDGE');
  const offBoard = (c) => (hasCard ? !!meta(c)?.offBoard || !isOnNv1Card(c) : false);

  // Board bounds in 2D px
  let bounds;
  if (hasCard) {
    bounds = { x: NV1_CARD.x, y: NV1_CARD.y, w: NV1_CARD.w, h: NV1_CARD.h + NV1_CARD.tab.h };
  } else {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of comps) {
      const { w, h } = componentDims(c, 'hardware');
      x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + w); y1 = Math.max(y1, c.y + h);
    }
    if (!comps.length) { x0 = 0; y0 = 0; x1 = 400; y1 = 300; }
    bounds = { x: x0 - 40, y: y0 - 40, w: x1 - x0 + 80, h: y1 - y0 + 80 };
  }
  const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2;
  const X = (px) => (px - cx) * S;
  const Z = (py) => (py - cy) * S;

  // Footprint of every on-board part in 2D px (bracket connectors sit on the card edge, see below)
  const card = NV1_CARD;
  const rectOf = (c) => {
    const { w, h } = componentDims(c, 'hardware');
    if (hasCard && isBracketPart(c)) return { x: card.x, y: c.y, w: BRACKET[c.type].depth * PX, h };
    return { x: c.x, y: c.y, w, h };
  };

  // --- PCB substrate --------------------------------------------------------
  let outline;
  if (hasCard) {
    outline = nv1CardOutline();
    // 5 V key notch cut into the edge-connector tab
    const { tab } = card;
    const bottom = card.y + card.h + tab.h, depth = tab.h * 0.95;
    const kL = tab.x + tab.key.at, kR = kL + tab.key.w;
    const i = outline.findIndex(([x, y]) => x === tab.x + tab.w && y === bottom);
    outline.splice(i + 1, 0, [kR, bottom], [kR, bottom - depth], [kL, bottom - depth], [kL, bottom]);
  } else {
    outline = [[bounds.x, bounds.y], [bounds.x + bounds.w, bounds.y], [bounds.x + bounds.w, bounds.y + bounds.h], [bounds.x, bounds.y + bounds.h]];
  }
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(X(x), -Z(y))));
  const pcbGeo = new THREE.ExtrudeGeometry(shape, { depth: PCB_T, bevelEnabled: false });
  pcbGeo.rotateX(-Math.PI / 2);
  const pcb = new THREE.Mesh(pcbGeo, [std(0x0f4a26, { roughness: 0.32, metalness: 0.05 }), std(0xb8a77a, { roughness: 0.85 })]);
  pcb.receiveShadow = true;
  pcb.castShadow = true;
  group.add(pcb);

  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.w * S, bounds.h * S),
    new THREE.MeshStandardMaterial({ map: silkscreen(comps, bounds, hasCard, rectOf, offBoard), transparent: true, roughness: 0.7, depthWrite: false })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.set(X(bounds.x + bounds.w / 2), PCB_T + 0.006, Z(bounds.y + bounds.h / 2));
  group.add(silk);

  // --- Components on the board ------------------------------------------------
  const labelAt = (model, dy = 2.5 * MM) => {
    const box = new THREE.Box3().setFromObject(model);
    return new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + dy, (box.min.z + box.max.z) / 2);
  };
  const bracketParts = [];
  const offParts = [];
  for (const comp of comps) {
    if (offBoard(comp)) { offParts.push(comp); continue; }
    if (hasCard && isBracketPart(comp)) { bracketParts.push(comp); continue; }
    if (hasCard && comp.type === 'PCI_EDGE') { ctx.addComp(comp, buildPciEdge(X, Z), { label: new THREE.Vector3(X(card.tab.x + card.tab.w + 8 * PX), PCB_T + 3 * MM, Z(card.y + card.h - 4 * PX)) }); continue; }
    const { w, h } = componentDims(comp, 'hardware');
    let model = hasCard ? buildRealPart(comp) : null;
    if (model) model.scale.setScalar(MM);
    else model = buildGenericPart(comp, w * S, h * S, ctx);
    model.position.set(X(comp.x + w / 2), PCB_T, Z(comp.y + h / 2));
    ctx.addComp(comp, model, { label: labelAt(model) });
  }
  if (bracketParts.length) buildBracket(ctx, bracketParts, X, Z);

  // --- Copper traces routed along the nets --------------------------------------
  routeTraces(ctx, comps, { hasCard, bounds, outline, rectOf, offBoard, X, Z });

  // --- Equipment outside the card, cables -------------------------------------------
  if (hasCard) buildPeripherals(ctx, offParts, X, Z);

  // Desk
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x0c0c0e, { roughness: 0.92 }));
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = hasCard ? DESK_Y : -2.2;
  desk.receiveShadow = true;
  desk.userData.desk = true; // stůl se nepočítá do záběru kamery

  // Frame the camera on everything but the desk
  const box = new THREE.Box3().setFromObject(group);
  group.add(desk);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z * 1.4);
  return {
    camera: [c.x + span * 0.1, c.y + span * 0.54, c.z + span * 0.66],
    target: [c.x, hasCard ? 0 : c.y, c.z + span * 0.04],
    floorY: desk.position.y,
  };
}

// ---------------------------------------------------------------- silkscreen
function silkscreen(comps, bounds, hasCard, rectOf, offBoard) {
  const scale = 3; // texture px per 2D px
  const cvs = document.createElement('canvas');
  cvs.width = Math.ceil(bounds.w * scale);
  cvs.height = Math.ceil(bounds.h * scale);
  const c = cvs.getContext('2d');
  c.scale(scale, scale);
  c.translate(-bounds.x, -bounds.y);
  c.strokeStyle = 'rgba(236,234,226,0.85)';
  c.fillStyle = 'rgba(236,234,226,0.92)';
  c.lineWidth = 0.9;
  c.textBaseline = 'alphabetic';
  for (const comp of comps) {
    if (offBoard(comp) || comp.type === 'PCI_EDGE') continue;
    const r = rectOf(comp);
    const ref = hasCard ? refOf(comp) : (comp.label || comp.id).toUpperCase().slice(0, 20);
    c.font = '700 9px "JetBrains Mono", monospace';
    if (hasCard && isBracketPart(comp)) {
      c.fillText(ref, r.x + r.w + 3, r.y + r.h / 2 + 3);
      continue;
    }
    c.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
    c.beginPath(); // pin-1 mark
    c.arc(r.x - 4.5, r.y - 4.5, 1.6, 0, Math.PI * 2);
    c.fill();
    c.fillText(ref, r.x + 1, r.y - 4);
  }
  if (hasCard) {
    const { x, y, w, h, tab } = NV1_CARD;
    c.font = '800 11px "Inter", "Segoe UI", sans-serif';
    c.save(); // on the card the name runs down the right edge
    c.translate(x + w - 17, y + 118);
    c.rotate(Math.PI / 2);
    c.fillText('EDGE 3D 2120  © 1995', 0, 0);
    c.restore();
    c.font = '700 9px "JetBrains Mono", monospace';
    c.fillText('J1', tab.x + tab.w + 6, y + h - 6);
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------------------------------------------------------------- PCI edge connector J1
function buildPciEdge(X, Z) {
  const g = new THREE.Group();
  const { tab, y, h } = NV1_CARD;
  const fingerW = 0.8 * MM, fingerL = (tab.h / PX - 0.8) * MM;
  const zc = Z(y + h) + 0.15 * MM + fingerL / 2;
  const geo = new THREE.BoxGeometry(fingerW, 0.01, fingerL);
  const xs = pciFingerXs();
  const mesh = new THREE.InstancedMesh(geo, std(0xe3b54c, { metalness: 1, roughness: 0.22 }), xs.length * 2);
  const m = new THREE.Matrix4();
  xs.forEach((px, i) => {
    mesh.setMatrixAt(2 * i, m.makeTranslation(X(px), PCB_T + 0.005, zc));
    mesh.setMatrixAt(2 * i + 1, m.makeTranslation(X(px), -0.005, zc));
  });
  mesh.instanceMatrix.needsUpdate = true;
  g.add(mesh);
  // invisible pick volume over the edge
  const pick = new THREE.Mesh(new THREE.BoxGeometry(tab.w * S, PCB_T * 2, tab.h * S), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  pick.position.set(X(tab.x + tab.w / 2), PCB_T / 2, Z(y + h + tab.h / 2));
  g.add(pick);
  return g;
}

// ---------------------------------------------------------------- bracket
function buildBracket(ctx, parts, X, Z) {
  const card = NV1_CARD;
  const zMm = (c) => (c.y + componentDims(c, 'hardware').h / 2 - card.y) / PX; // along the bracket from the card's top edge
  // Steel sheet with the connector cut-outs (shape x = mm along the bracket, y = mm above the PCB bottom)
  const zTop = -4.5, zBot = (card.h + card.tab.h) / PX + 9, yLo = -2.5, yHi = 15.9;
  const plate = new THREE.Shape([[zTop, yLo], [zBot - 13, yLo], [zBot - 10, 2], [zBot, 2], [zBot, 10.5], [zBot - 10, 10.5], [zBot - 13, yHi], [zTop, yHi]].map(([a, b]) => new THREE.Vector2(a, b)));
  const models = parts.map((comp) => ({ comp, model: BRACKET[comp.type].build() }));
  for (const { comp, model } of models) {
    const hole = model.userData.hole, z = zMm(comp), yc = 1.6 + hole.yc;
    const path = new THREE.Path();
    if (hole.kind === 'circle') path.absarc(z, yc, hole.r, 0, Math.PI * 2, true);
    else if (hole.kind === 'rect') path.setFromPoints([[z - hole.w / 2, yc - hole.h / 2], [z - hole.w / 2, yc + hole.h / 2], [z + hole.w / 2, yc + hole.h / 2], [z + hole.w / 2, yc - hole.h / 2]].map(([a, b]) => new THREE.Vector2(a, b)));
    else {
      path.setFromPoints([[z - hole.bot / 2, yc - hole.h / 2], [z - hole.top / 2, yc + hole.h / 2], [z + hole.top / 2, yc + hole.h / 2], [z + hole.bot / 2, yc - hole.h / 2]].map(([a, b]) => new THREE.Vector2(a, b)));
      for (const s of hole.screws) { const sp = new THREE.Path(); sp.absarc(z + s, yc, 1.6, 0, Math.PI * 2, true); plate.holes.push(sp); }
    }
    plate.holes.push(path);
  }
  const steel = std(0xc2c6ca, { metalness: 0.85, roughness: 0.36 });
  const plateGeo = new THREE.ExtrudeGeometry(plate, { depth: P.PLATE, bevelEnabled: false, curveSegments: 24 });
  plateGeo.rotateY(-Math.PI / 2);
  const sheet = new THREE.Group();
  sheet.add(new THREE.Mesh(plateGeo, steel));
  const fold = new THREE.Mesh(new THREE.BoxGeometry(11.4, yHi - yLo, P.PLATE), steel); // screw tab
  fold.position.set(11.4 / 2 - P.PLATE, (yHi + yLo) / 2, zTop + P.PLATE / 2);
  sheet.add(fold);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 0.1), std(0x050505));
  slot.position.set(6.5, (yHi + yLo) / 2, zTop - 0.02);
  sheet.add(slot);
  sheet.scale.setScalar(MM);
  sheet.position.set(X(card.x), 0, Z(card.y));
  sheet.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  ctx.group.add(sheet);
  for (const { comp, model } of models) {
    model.scale.setScalar(MM);
    model.position.set(X(card.x), PCB_T, Z(card.y) + zMm(comp) * MM);
    ctx.addComp(comp, model, { label: new THREE.Vector3(X(card.x) - 9 * MM, PCB_T + 17 * MM, model.position.z) });
  }
}

// ---------------------------------------------------------------- traces
/** Connection point of a pin on the PCB (2D px) and the direction the trace leaves the package. */
function pinAnchor(comp, pin, isOut, rectOf, hasCard) {
  const r = rectOf(comp);
  const dev = DEVICES[comp.type];
  if (hasCard && isBracketPart(comp)) {
    const names = (dev?.joins || []).map((j) => j[0]);
    const i = Math.max(0, names.indexOf(pin)), n = Math.max(1, names.length);
    return { x: r.x + r.w, y: r.y + (r.h * (i + 0.5)) / n, dir: [1, 0] };
  }
  if (hasCard && comp.type === 'PCI_EDGE') {
    const xs = pciFingerXs();
    const x = xs[Math.min(xs.length - 1, pciPinNumber(pin) - 1)];
    return { x, y: NV1_CARD.y + NV1_CARD.h, dir: [0, -1] };
  }
  if (comp.type === 'DRAM_256K16' || comp.type === 'BUS_SWITCH_32' || comp.type === 'SEGA_HEADER') {
    // packages lying along X: leads only on the long sides
    const pins = Object.keys((isOut ? comp.outputs : comp.inputs) || {});
    const i = Math.max(0, pins.indexOf(pin)), n = Math.max(1, pins.length);
    return { x: r.x + (r.w * (i + 0.5)) / n, y: isOut ? r.y + r.h : r.y, dir: [0, isOut ? 1 : -1] };
  }
  if (comp.type === 'CRYSTAL' || comp.type === 'CLOCK') {
    // the two leads (4.88 mm apart) sit under the can; the copper leaves from under its ends
    return { x: isOut ? r.x + r.w : r.x, y: r.y + r.h / 2, dir: [isOut ? 1 : -1, 0] };
  }
  const p = hardwarePinPos(comp, pin, isOut);
  return { x: p.x, y: p.y, dir: [isOut ? 1 : -1, 0] };
}

function insidePolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Polyline shifted sideways by `off` with mitred corners (for the parallel lines of a bus). */
function offsetPolyline(pts, off) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let d1x = p.x - a.x, d1z = p.z - a.z, d2x = b.x - p.x, d2z = b.z - p.z;
    if (i === 0) { d1x = d2x; d1z = d2z; }
    if (i === n - 1) { d2x = d1x; d2z = d1z; }
    const l1 = Math.hypot(d1x, d1z) || 1, l2 = Math.hypot(d2x, d2z) || 1;
    const n1x = -d1z / l1, n1z = d1x / l1, n2x = -d2z / l2, n2z = d2x / l2;
    let mx = n1x + n2x, mz = n1z + n2z;
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml; mz /= ml;
    const k = off / Math.max(0.35, mx * n1x + mz * n1z);
    return { x: p.x + mx * k, z: p.z + mz * k };
  });
}

function routeTraces(ctx, comps, { hasCard, bounds, outline, rectOf, offBoard, X, Z }) {
  const { engine, group } = ctx;
  // 0.5 px keep-out around packages: the DRAMs stand 2.4 mm apart and their leads face each other
  const cell = 3.7, margin = 0.5; // 1 mm routing grid
  const cardBottom = hasCard ? NV1_CARD.y + NV1_CARD.h - 1 : Infinity;
  const inside = (x, y) => y < cardBottom && insidePolygon(outline, x, y);
  const router = createRouter({ x0: bounds.x, y0: bounds.y, w: bounds.w, h: bounds.h, cell, inside, erode: 2 }); // ~1.6 mm from the board edge
  for (const c of comps) if (!offBoard(c) && !(hasCard && c.type === 'PCI_EDGE')) router.block(rectOf(c), margin);

  const jobs = [];
  for (const wire of engine.wires) {
    const a = engine.components.get(wire.from.id), b = engine.components.get(wire.to.id);
    if (!a || !b || offBoard(a) || offBoard(b)) continue;
    const pa = pinAnchor(a, wire.from.pin, true, rectOf, hasCard);
    const pb = pinAnchor(b, wire.to.pin, false, rectOf, hasCard);
    const width = engine.wireWidth(wire);
    const label = engine.wireLabel(wire) || '';
    jobs.push({ wire, pa, pb, width, analog: /analog/i.test(label), net: engine.netIndexOf(wire.from.id, wire.from.pin), len: Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) });
  }
  jobs.sort((p, q) => p.len - q.len);
  const stub = margin + cell * 1.2;
  for (const job of jobs) {
    const { pa, pb, width, analog } = job;
    const lines = width > 1 ? Math.min(6, Math.ceil(Math.log2(width)) + 1) : 1;
    const gap = 0.55 * PX; // 0.55 mm pitch between the lines of a bus
    const a = { x: pa.x + pa.dir[0] * stub, y: pa.y + pa.dir[1] * stub, dir: pa.dir };
    const b = { x: pb.x + pb.dir[0] * stub, y: pb.y + pb.dir[1] * stub, dir: pb.dir.map((v) => -v) };
    const path = router.route(a, b, job.net) || [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b];
    const pts2d = [{ x: pa.x, y: pa.y }, ...path, { x: pb.x, y: pb.y }];
    router.commit(pts2d, job.net, ((lines - 1) * gap) / 2 + cell);
    const pts = pts2d.map((p) => ({ x: X(p.x), z: Z(p.y) }));
    const lineW = (analog ? 0.45 : width > 1 ? 0.24 : 0.3) * MM;
    const geos = [];
    for (let k = 0; k < lines; k++) geos.push(ribbonGeometry(offsetPolyline(pts, (k - (lines - 1) / 2) * gap * S), lineW, CU_Y));
    const mat = std(0x1e6a37, { roughness: 0.35, metalness: 0.25, emissive: 0x4a5566, emissiveIntensity: 0.3 });
    group.add(new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], mat));
    ctx.addTrace(mat, job.wire, { width, analogMax: analog ? (/LINE|MIC/i.test(engine.wireLabel(job.wire) || '') ? 1.0 : 0.7) : null });
  }
}

// ---------------------------------------------------------------- outside the card
function buildPeripherals(ctx, offParts, X, Z) {
  const { engine, group } = ctx;
  const card = NV1_CARD;
  const deskTop = DESK_Y;
  const byId = (id) => engine.components.get(id);
  const footprint = (c) => componentDims(c, 'hardware');
  const centre = (c) => { const { w, h } = footprint(c); return new THREE.Vector3(X(c.x + w / 2), deskTop, Z(c.y + h / 2)); };
  const ends = {}; // off-board comp id -> world point where its cable ends

  for (const comp of offParts) {
    const { w, h } = footprint(comp);
    const wMm = w / PX, dMm = h / PX;
    if (comp.type === 'VGA_MONITOR') {
      const m = P.crt({ w: wMm, d: dMm });
      m.group.scale.setScalar(MM);
      m.group.position.copy(centre(comp));
      monitorScreen(ctx, comp, m);
      ctx.addComp(comp, m.group, { label: topOf(m.group) });
      ends[comp.id] = m.cableIn.clone().multiplyScalar(MM).add(m.group.position);
    } else if (comp.type === 'AUDIO_SPEAKERS') {
      const s = P.speakers({ w: wMm, d: dMm });
      s.group.scale.setScalar(MM);
      s.group.position.copy(centre(comp));
      ctx.addComp(comp, s.group, { label: topOf(s.group) });
      ends[comp.id] = s.cableIn.clone().multiplyScalar(MM).add(s.group.position);
    } else if (comp.type === 'SATURN_PAD') {
      const pad = P.gamepad();
      const g = new THREE.Group().add(pad);
      g.scale.setScalar((w * S) / 7.8);
      g.position.copy(centre(comp));
      ctx.addComp(comp, g, { label: topOf(g) });
      ends[comp.id] = g.position.clone().add(new THREE.Vector3(0, 0.35 * g.scale.x, -1.5 * g.scale.x));
    } else if (comp.type === 'PCI_HOST') {
      ctx.addComp(comp, hostSlot(ctx, comp, X, Z), { label: new THREE.Vector3(X(comp.x + w / 2), PCB_T + 14 * MM, Z(card.y + card.h + card.tab.h) + 16 * MM) });
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w * S, 6 * MM, h * S), std(0x2a2b2e));
      box.position.copy(centre(comp)).add(new THREE.Vector3(0, 3 * MM, 0));
      ctx.addComp(comp, box, { label: topOf(box) });
    }
  }

  // Cables: one per (bracket connector, device) pair
  const pairs = new Map();
  for (const wire of engine.wires) {
    const a = byId(wire.from.id), b = byId(wire.to.id);
    if (!a || !b) continue;
    const [jack, dev] = isBracketPart(a) && ends[b.id] ? [a, b] : isBracketPart(b) && ends[a.id] ? [b, a] : [];
    if (jack && !pairs.has(jack.id)) pairs.set(jack.id, { jack, dev });
  }
  // Ribbon cable from a pad header to its device (on the real card it ends on the separate "EDGE 3D SEGA" bracket)
  for (const wire of engine.wires) {
    const a = byId(wire.from.id), b = byId(wire.to.id);
    const [hdr, dev] = a?.type === 'SEGA_HEADER' && ends[b?.id] ? [a, b] : b?.type === 'SEGA_HEADER' && ends[a?.id] ? [b, a] : [];
    if (!hdr || pairs.has(hdr.id)) continue;
    pairs.set(hdr.id, null);
    const { w, h } = footprint(hdr);
    const start = new THREE.Vector3(X(hdr.x + w / 2), PCB_T + 9 * MM, Z(hdr.y + h / 2));
    const end = ends[dev.id];
    const edgeZ = Z(card.y) - 8 * MM;
    const pts = [start, new THREE.Vector3(start.x, start.y + 6 * MM, start.z - 6 * MM), new THREE.Vector3(start.x, PCB_T + 6 * MM, edgeZ), new THREE.Vector3((start.x + end.x) / 2, deskTop + 1.5 * MM, (edgeZ + end.z) / 2), end];
    const ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 120, 1.3 * MM, 8, false), std(0x9a9c9f, { roughness: 0.7 }));
    ribbon.castShadow = true;
    group.add(ribbon);
  }
  for (const k of [...pairs.keys()]) if (!pairs.get(k)) pairs.delete(k);
  const topZ = Z(card.y) - 22 * MM; // cables run along the desk behind the card
  const gapX = X(card.x + card.w) + 14 * MM;
  for (const { jack, dev } of pairs.values()) {
    const spec = BRACKET[jack.type];
    const { h } = footprint(jack);
    const at = spec.plugAt;
    const plug = spec.plug();
    plug.scale.setScalar(MM);
    plug.position.set(X(card.x) + at.front * MM, PCB_T + at.yc * MM, Z(jack.y + h / 2));
    plug.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(plug);
    const start = plug.userData.exit.clone().multiplyScalar(MM).add(plug.position);
    const end = ends[dev.id];
    const out = start.x - 28 * MM;
    const pts = [start, new THREE.Vector3(start.x - 10 * MM, start.y - 1 * MM, start.z), new THREE.Vector3(out, deskTop + 6 * MM, start.z), new THREE.Vector3(out - 4 * MM, deskTop + spec.cableR * MM, start.z + 8 * MM * Math.sign(end.z - start.z || 1))];
    if (end.x > X(card.x + card.w / 2)) {
      // to equipment on the far side: around the top edge of the card, then into its back
      pts.push(new THREE.Vector3(out - 4 * MM, deskTop + spec.cableR * MM, topZ), new THREE.Vector3(dev.type === 'AUDIO_SPEAKERS' ? gapX : end.x, deskTop + spec.cableR * MM, topZ));
      if (dev.type === 'AUDIO_SPEAKERS') pts.push(new THREE.Vector3(gapX, deskTop + spec.cableR * MM, end.z - 20 * MM));
      pts.push(new THREE.Vector3(end.x, deskTop + spec.cableR * MM, end.z - 18 * MM), new THREE.Vector3(end.x, end.y, end.z - 6 * MM), end);
    } else {
      pts.push(new THREE.Vector3(end.x, deskTop + spec.cableR * MM, end.z - 10 * MM), end);
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, spec.cableR * MM * 0.6, 10, false), std(0x1d1e21, { roughness: 0.55 }));
    cable.castShadow = true;
    group.add(cable);
  }
}

const topOf = (obj) => {
  const box = new THREE.Box3().setFromObject(obj);
  return new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + 4 * MM, (box.min.z + box.max.z) / 2);
};

/** Host side of the PCI bus: a section of the (vertical) motherboard with a white 32-bit 5 V slot.
 *  The card is drawn pulled 5 mm out of the slot so the gold fingers stay visible. */
function hostSlot(ctx, comp, X, Z) {
  const g = new THREE.Group();
  const { tab, y, h } = NV1_CARD;
  const z0 = Z(y + h + tab.h) + 5 * MM, slotD = 8.8 * MM, mbT = 1.6 * MM;
  const x0 = X(tab.x) - 1.5 * MM, x1 = X(tab.x + tab.w) + 1.5 * MM;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 6.6 * MM, slotD), std(0xe9e6dc, { roughness: 0.55 }));
  slot.position.set((x0 + x1) / 2, PCB_T / 2, z0 + slotD / 2);
  g.add(slot);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 2 * MM, 1.9 * MM, 0.4 * MM), std(0x0a0a0a));
  slit.position.set((x0 + x1) / 2, PCB_T / 2, z0 - 0.15 * MM);
  g.add(slit);
  const key = new THREE.Mesh(new THREE.BoxGeometry(tab.key.w * S * 0.9, 1.95 * MM, 0.5 * MM), std(0xe9e6dc));
  key.position.set(X(tab.x + tab.key.at + tab.key.w / 2), PCB_T / 2, z0 - 0.2 * MM);
  g.add(key);
  const { w: hw } = componentDims(comp, 'hardware');
  const bx0 = Math.min(X(comp.x), x0 - 6 * MM), bx1 = Math.max(X(comp.x + hw), x1 + 6 * MM);
  const yTop = PCB_T / 2 + 4.3 * MM; // no higher than the slot, so it does not hide the card edge
  const mb = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, yTop - DESK_Y, mbT), std(0x163f25, { roughness: 0.4 }));
  mb.position.set((bx0 + bx1) / 2, (yTop + DESK_Y) / 2, z0 + slotD + mbT / 2);
  g.add(mb);
  // solder side of the motherboard (facing the viewer): slot pins + the PCI traces running down to the chipset
  const zBack = z0 + slotD + mbT + 0.004;
  const xs = pciFingerXs();
  const pinGeo = new THREE.CircleGeometry(0.45 * MM, 10);
  const pins = new THREE.InstancedMesh(pinGeo, std(0xb9bec4, { metalness: 0.85, roughness: 0.35 }), xs.length * 2);
  const m = new THREE.Matrix4();
  xs.forEach((px, i) => {
    pins.setMatrixAt(2 * i, m.makeTranslation(X(px), PCB_T / 2 + 1.4 * MM, zBack));
    pins.setMatrixAt(2 * i + 1, m.makeTranslation(X(px) + 0.635 * MM, PCB_T / 2 - 1.4 * MM, zBack));
  });
  pins.instanceMatrix.needsUpdate = true;
  g.add(pins);
  const joins = PCI_JOINS();
  for (const wire of ctx.engine.wires) {
    const hostPin = wire.from.id === comp.id ? wire.from.pin : wire.to.id === comp.id ? wire.to.pin : null;
    if (!hostPin) continue;
    const j = joins.find((p) => p[0] === hostPin);
    const px = xs[Math.min(xs.length - 1, pciPinNumber(j?.[1]) - 1)];
    const width = ctx.engine.wireWidth(wire);
    const len = PCB_T / 2 - 2.5 * MM - DESK_Y;
    const mat = std(0x1e6a37, { roughness: 0.35, metalness: 0.25, emissive: 0x4a5566, emissiveIntensity: 0.3 });
    const tr = new THREE.Mesh(new THREE.PlaneGeometry((width > 1 ? 2.2 : 0.4) * MM, len), mat);
    tr.position.set(X(px), DESK_Y + len / 2, zBack + 0.002);
    g.add(tr);
    ctx.addTrace(mat, wire, { width });
  }
  return g;
}

/** Live picture of the VGA monitor (engine-drawn 640×480 RGBA) + its on-screen status and power LED. */
function monitorScreen(ctx, comp, m) {
  const { engine } = ctx;
  const osdCanvas = document.createElement('canvas');
  osdCanvas.width = 512; osdCanvas.height = 384;
  const osdTex = new THREE.CanvasTexture(osdCanvas);
  osdTex.colorSpace = THREE.SRGBColorSpace;
  m.osd.material.map = osdTex;
  m.osd.material.needsUpdate = true;
  let tex = null, img = null, lastFrames = -1, lastStatus = null, hideAt = Infinity, tick = 0;
  const osd = (text, locked) => {
    const c = osdCanvas.getContext('2d');
    c.clearRect(0, 0, 512, 384);
    if (text) {
      c.font = 'bold 26px "JetBrains Mono", monospace';
      const tw = Math.min(480, c.measureText(text).width + 30);
      const yy = locked ? 340 : 192;
      c.fillStyle = 'rgba(10,10,12,0.75)';
      c.fillRect(256 - tw / 2, yy - 24, tw, 44);
      c.fillStyle = locked ? '#e8e6df' : '#ffa909';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 256, yy, 460);
    }
    osdTex.needsUpdate = true;
  };
  ctx.onFrame((time) => {
    tick++;
    const locked = !!comp.status && !/NO SIGNAL|OUT OF RANGE/.test(comp.status);
    if (comp.image && comp.image !== img) {
      img = comp.image;
      if (tex) tex.dispose();
      tex = new THREE.DataTexture(new Uint8Array(img.buffer, img.byteOffset, img.length), 640, 480, THREE.RGBAFormat);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      m.screen.material.map = tex;
      m.screen.material.needsUpdate = true;
    }
    if (tex && tick % 2 === 0 && (engine.isRunning || comp.frames !== lastFrames)) {
      tex.needsUpdate = true;
      lastFrames = comp.frames;
    }
    m.screen.material.color.setHex(locked && tex ? 0xffffff : 0x050605);
    if (tex) {
      // like H-/V-size on a real CRT: the active area of the detected mode fills the tube; image row 0 = top line
      const md = comp._m?.mode, fw = (md?.w || 640) / 640, fh = (md?.h || 480) / 480;
      if (tex.repeat.x !== fw || tex.offset.y !== fh) { tex.repeat.set(fw, -fh); tex.offset.set(0, fh); }
    }
    const key = locked ? comp.status.split(' (')[0] : comp.status; // measured kHz/Hz digits jitter, the mode does not
    if (key !== lastStatus) {
      lastStatus = key;
      osd(comp.status || 'NO SIGNAL', locked); // a real monitor shows the mode briefly, "NO SIGNAL" stays
      hideAt = locked ? time + 2500 : Infinity;
      m.led.material.emissive.setHex(locked ? 0x3fbf5f : 0xffa909);
      m.led.material.emissiveIntensity = 1.4;
    }
    if (time > hideAt) { osd(null); hideAt = Infinity; }
  });
}
