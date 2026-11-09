// LEVEL 1: the circuit as a physical printed circuit board.
// Positions and footprints come from the same layout as the 2D "HARDWARE PCB" view (boardLayout.js),
// so the 3D board is a 1:1 extrusion of the 2D drawing.
import * as THREE from 'three';
import { componentDims, hardwarePinPos, NV1_CARD, nv1CardOutline, isOnNv1Card, crystalFrequency } from '../../engine/boardLayout';
import { MAT, std, textTexture, ribbonGeometry, cubicPoints, instanced, mat4, isActive } from './common.js';
import * as P from './packages.js';

export const BOARD_SCALE = 0.05; // 2D px → 3D units (650 px card ≈ 32.5 units)
const PCB_T = 0.4; // 1.6 mm FR-4
const DESK_Y = -2.2;

const CHIP_CODES = {
  AND: 'SN74LS08N', OR: 'SN74LS32N', XOR: 'SN74LS86N', NOT: 'SN74LS04N', NAND: 'SN74LS00N', NOR: 'SN74LS02N',
  D_FF: 'SN74LS74AN', REGISTER_8BIT: 'SN74LS374N', REGISTER_16BIT: 'SN74LS374N', REGISTER_32BIT: 'SN74LS374N',
  RAM: 'HM62256BLP', ROM: 'AT28C64B', MUX: 'SN74LS157N', DEMUX: 'SN74LS139N', TRI_STATE_BUFFER: 'SN74LS244N',
  BUS_SPLITTER: 'SN74LS245N', BUS_MERGER: 'SN74LS245N',
};
const DIP_PINS = { RAM: 28, ROM: 28, REGISTER_8BIT: 20, REGISTER_16BIT: 20, REGISTER_32BIT: 20, MUX: 16, DEMUX: 16, TRI_STATE_BUFFER: 20, BUS_SPLITTER: 20, BUS_MERGER: 20 };

function chipMarking(lines, opts) {
  return textTexture(lines, { bg: '#17191e', fg: '#cfd6df', font: 'bold 46px "JetBrains Mono", monospace', dot: true, ...opts });
}

/** Physical model for one component (centred at origin, bottom at y = 0). */
function buildPackage(comp, w, d, ctx) {
  const t = comp.type;
  if (t === 'NV1_CORE') {
    return P.qfp({
      w, d, pinsPerSide: 52, bodyH: 0.85, leadLen: 0.6,
      marking: chipMarking([{ text: 'SGS-THOMSON', font: 'bold 40px monospace', color: '#aebdd0' }, { text: 'STG2000X', font: 'bold 78px monospace', color: '#ffffff' }, { text: 'NVIDIA NV1', font: 'bold 54px monospace', color: '#36e6ff' }, { text: 'A22BF9548 MALTA', font: '32px monospace', color: '#8899ad' }, { text: 'QFP-208  0.5µm CMOS', font: '28px monospace', color: '#6d7e93' }]),
    });
  }
  if (t === 'AUDIO_DSP') {
    return P.qfp({ w, d, pinsPerSide: 25, bodyH: 0.7, leadLen: 0.5, marking: chipMarking([{ text: 'ST', font: 'bold 70px monospace' }, 'STG-AUDIO', { text: '32-VOICE SYNTH', font: '34px monospace' }, { text: 'QFP-100', font: '30px monospace', color: '#7b8798' }]) });
  }
  if (t === 'RAMDAC') {
    return P.plcc({ w, pinsPerSide: 11, marking: chipMarking([{ text: 'AT&T', font: 'bold 52px monospace' }, 'ATT20C409', { text: '135 MHz RAMDAC', font: '34px monospace' }, { text: 'PLCC-44', font: '30px monospace', color: '#7b8798' }]) });
  }
  if (t === 'VRAM_BANK') {
    return P.soj({ w, d, pinsPerSide: 25, marking: chipMarking([{ text: 'TOSHIBA', font: 'bold 56px monospace' }, { text: 'TC51V16160FT-60', font: 'bold 50px monospace' }, { text: '16Mb EDO DRAM  JAPAN', font: '34px monospace', color: '#8b96a6' }], { w: 1024, h: 256 }) });
  }
  if (t === 'CLOCK') return P.crystal({ w, d, freq: crystalFrequency(comp) });
  if (t === 'SATURN_PAD') return P.boxHeader({ w, d, cols: 5, rows: 2, label: 'J3 SATURN PAD' });
  if (t === 'INPUT') {
    const sw = P.slideSwitch({ w, d });
    ctx.onFrame(() => { sw.lever.position.x = comp.outputs.out === 1 ? sw.travel : -sw.travel; });
    return sw.group;
  }
  if (t === 'PROBE') {
    const led = P.ledIndicator({ w, d });
    ctx.onFrame(() => {
      const on = isActive(comp.inputs.in);
      led.lens.material.emissiveIntensity = on ? 1.6 : 0.08;
    });
    return led.group;
  }
  if (t === 'SEVEN_SEGMENT') {
    const seg = P.sevenSegment({ w, d });
    const MAP = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];
    ctx.onFrame(() => {
      const mask = MAP[(Number(comp.outputs.val) || 0) & 15];
      seg.segments.forEach((m, i) => { m.material.emissiveIntensity = mask & (1 << i) ? 2.2 : 0; });
    });
    return seg.group;
  }
  if (t === 'VIRTUAL_SCREEN') {
    const crt = P.crtMonitor({ w, d });
    const c2 = crt.canvas.getContext('2d');
    ctx.onFrame((time) => drawCrt(c2, comp, time, ctx.engine, crt.screenTexture));
    return crt.group;
  }
  const code = CHIP_CODES[t] || t;
  const pins = DIP_PINS[t] || 14;
  return P.dip({ w, d, pins, marking: chipMarking([{ text: code, font: 'bold 64px monospace' }, { text: (comp.label || '').slice(0, 22), font: '34px monospace', color: '#8e9aab' }], { w: 1024, h: 256, dot: false }) });
}

let crtFrame = 0;
function drawCrt(c, comp, time, engine, tex) {
  if (++crtFrame % 2) return; // 30 fps is plenty for the texture
  const W = c.canvas.width, H = c.canvas.height;
  c.fillStyle = '#020507';
  c.fillRect(0, 0, W, H);
  if (comp.vram && comp.vram.some((p) => p)) {
    const px = W / 64, py = H / 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const p = comp.vram[y * 64 + x];
      if (!p) continue;
      c.fillStyle = `rgb(${((p >> 5) & 7) * 36},${((p >> 2) & 7) * 36},${(p & 3) * 85})`;
      c.fillRect(x * px, y * py, px, py);
    }
  } else {
    // NV1 quadratic-surface demo, same maths as the 2D CRT
    const t = time * 0.0009;
    c.strokeStyle = '#00f0ff';
    c.lineWidth = 1.4;
    c.shadowColor = '#00f0ff';
    c.shadowBlur = 6;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = -6; i <= 6; i++) {
        c.beginPath();
        for (let j = -6; j <= 6; j++) {
          const u = (pass ? j : i) / 6, v = (pass ? i : j) / 6;
          const x3 = u * 60, y3 = v * 60, z3 = (u * u - v * v) * 34;
          const rx = x3 * Math.cos(t) + z3 * Math.sin(t);
          const rz = -x3 * Math.sin(t) + z3 * Math.cos(t);
          const ry = y3 * Math.cos(0.6) - rz * Math.sin(0.6);
          const X = W / 2 + rx, Y = H / 2 - 8 + ry * 0.8;
          if (j === -6) c.moveTo(X, Y);
          else c.lineTo(X, Y);
        }
        c.stroke();
      }
    }
    c.shadowBlur = 0;
    c.fillStyle = '#00f0ff';
    c.font = 'bold 12px monospace';
    c.fillText('NVIDIA NV1  QTM 3D', 8, H - 22);
    c.fillStyle = '#10b981';
    c.fillText(engine.isRunning ? `CLK ${engine.clockFrequency} Hz  RUN` : 'CLK STOPPED', 8, H - 8);
  }
  c.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  tex.needsUpdate = true;
}

/** Silkscreen overlay (title, refdes outlines, mounting holes) drawn into one texture covering the card. */
function silkscreen(comps, bounds) {
  const scale = 2; // texture px per 2D px
  const cvs = document.createElement('canvas');
  cvs.width = Math.ceil(bounds.w * scale);
  cvs.height = Math.ceil(bounds.h * scale);
  const c = cvs.getContext('2d');
  c.scale(scale, scale);
  c.translate(-bounds.x, -bounds.y);
  c.strokeStyle = 'rgba(235,240,245,0.75)';
  c.fillStyle = 'rgba(235,240,245,0.9)';
  c.lineWidth = 1.2;
  for (const comp of comps) {
    if (!comp.onCard || comp.type === 'VGA_BRACKET' || comp.type === 'PCI_BUS') continue;
    const { w, h } = componentDims(comp, 'hardware');
    c.strokeRect(comp.x + 3, comp.y + 3, w - 6, h - 6);
    c.font = '700 8px monospace';
    c.fillText((comp.label || comp.id).toUpperCase().slice(0, 34), comp.x + 4, comp.y - 3);
  }
  if (bounds.card) {
    const { x, y } = NV1_CARD;
    c.font = '900 13px sans-serif';
    c.fillText('DIAMOND MULTIMEDIA // EDGE 3D 2000 SERIES', x + 50, y + 24);
    c.font = '700 9px monospace';
    c.fillText('NVIDIA NV1 / SGS-THOMSON STG-2000X 3D ACCELERATOR (1995)', x + 50, y + 38);
    c.fillText('PCI BUS 2.1 // 64-BIT VRAM // SEGA SATURN I/O // 32-VOICE AUDIO', x + 50, y + 50);
    c.fillText('(C) 1995 NVIDIA CORP.', x + 430, y + 24);
    c.font = '600 8px monospace';
    c.fillText('FCC ID: FTUPCI-EDGE3D', x + 30, y + 470);
    c.fillText('ASSY 2000-01-A REV 1.0', x + 30, y + 480);
    c.strokeRect(x + 30, y + 432, 50, 20);
    c.fillText('JP1: PAL/NTSC', x + 30, y + 428);
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildBoardScene(ctx) {
  const { engine, group } = ctx;
  const S = BOARD_SCALE;
  const comps = [...engine.components.values()];
  const hasCard = engine.components.has('nv1_core') && engine.components.has('pci_bus');
  for (const c of comps) c.onCard = hasCard ? isOnNv1Card(c) : true;

  // Board bounds in 2D px
  let bounds;
  if (hasCard) {
    bounds = { x: NV1_CARD.x, y: NV1_CARD.y, w: NV1_CARD.w, h: NV1_CARD.h + NV1_CARD.tab.h, card: true };
  } else {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of comps) {
      const { w, h } = componentDims(c, 'hardware');
      x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + w); y1 = Math.max(y1, c.y + h);
    }
    if (!comps.length) { x0 = 0; y0 = 0; x1 = 400; y1 = 300; }
    bounds = { x: x0 - 40, y: y0 - 50, w: x1 - x0 + 80, h: y1 - y0 + 90, card: false };
  }
  const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2;
  const X = (px) => (px - cx) * S;
  const Z = (py) => (py - cy) * S;

  // --- PCB substrate -------------------------------------------------------
  const outline = hasCard ? nv1CardOutline() : [[bounds.x, bounds.y], [bounds.x + bounds.w, bounds.y], [bounds.x + bounds.w, bounds.y + bounds.h], [bounds.x, bounds.y + bounds.h]];
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(X(x), -Z(y))));
  const pcbGeo = new THREE.ExtrudeGeometry(shape, { depth: PCB_T, bevelEnabled: false });
  pcbGeo.rotateX(-Math.PI / 2);
  const pcb = new THREE.Mesh(pcbGeo, [MAT.pcb(), std(0xc9b98a, { roughness: 0.8 })]); // faces, sides (FR-4 edge)
  pcb.receiveShadow = true;
  pcb.castShadow = true;
  group.add(pcb);

  // Silkscreen + copper hatch on top
  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.w * S, bounds.h * S),
    new THREE.MeshStandardMaterial({ map: silkscreen(comps, bounds), transparent: true, roughness: 0.6, depthWrite: false })
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.set(X(bounds.x + bounds.w / 2), PCB_T + 0.004, Z(bounds.y + bounds.h / 2));
  group.add(silk);

  if (hasCard) {
    // Plated mounting holes
    const { x, y, w, h } = NV1_CARD;
    for (const [hx, hy] of [[x + 30, y + 30], [x + w - 45, y + 45], [x + 40, y + h - 30], [x + w - 40, y + h - 30]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.42, 32), MAT.gold());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(X(hx), PCB_T + 0.006, Z(hy));
      group.add(ring);
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, PCB_T + 0.02, 24), std(0x050505));
      hole.position.set(X(hx), PCB_T / 2, Z(hy));
      group.add(hole);
    }
  }

  // --- Components ---------------------------------------------------------
  for (const comp of comps) {
    const { w, h } = componentDims(comp, 'hardware');
    const W = w * S, D = h * S;
    const centre = new THREE.Vector3(X(comp.x + w / 2), PCB_T, Z(comp.y + h / 2));

    if (comp.type === 'PCI_BUS' && hasCard) {
      ctx.addComp(comp, buildPciEdge(comp, X, Z, S), { label: centre.clone().add(new THREE.Vector3(0, 1.4, -1.2)) });
      continue;
    }
    if (comp.type === 'VGA_BRACKET') {
      ctx.addComp(comp, buildBracket(comp, X, Z, S, hasCard ? X(NV1_CARD.x) : X(comp.x + w)), { label: new THREE.Vector3(X(comp.x + w / 2) - 1.2, 4.6, Z(comp.y + h / 2)) });
      continue;
    }

    const model = buildPackage(comp, W, D, ctx);
    if (comp.onCard) {
      model.position.copy(centre);
    } else {
      // Peripherals (monitor, line-out meter) stand on the desk next to the card
      model.position.set(centre.x, DESK_Y, centre.z);
      if (comp.type !== 'VIRTUAL_SCREEN') {
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.2, D * 0.9), std(0x20252e));
        plinth.position.y = -0.1;
        model.add(plinth);
      }
    }
    const top = new THREE.Box3().setFromObject(model).max.y;
    ctx.addComp(comp, model, { label: new THREE.Vector3(model.position.x, top + 0.6, model.position.z) });
  }

  // --- Copper traces / cables ------------------------------------------------
  for (const wire of engine.wires) {
    const a = engine.components.get(wire.from.id);
    const b = engine.components.get(wire.to.id);
    if (!a || !b) continue;
    const pa = hardwarePinPos(a, wire.from.pin, true);
    const pb = hardwarePinPos(b, wire.to.pin, false);
    const p0 = { x: X(pa.x), z: Z(pa.y) }, p3 = { x: X(pb.x), z: Z(pb.y) };
    const mat = std(0x1d5a35, { roughness: 0.4, metalness: 0.3, emissive: 0x00f0ff, emissiveIntensity: 0 });
    let mesh;
    if (a.onCard && b.onCard) {
      // Same cubic curve as the 2D copper trace
      const dx = Math.max(Math.abs(p3.x - p0.x) * 0.5, 35 * S);
      const pts = cubicPoints(p0, { x: p0.x + dx, z: p0.z }, { x: p3.x - dx, z: p3.z }, p3, 32);
      mesh = new THREE.Mesh(ribbonGeometry(pts, 0.11, PCB_T + 0.012), mat);
      // pads at both ends
      for (const p of [p0, p3]) {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), MAT.gold());
        pad.position.set(p.x, PCB_T + 0.02, p.z);
        group.add(pad);
      }
    } else {
      // Off-board peripheral → shielded cable arcing over the desk
      const yA = a.onCard ? PCB_T + 0.3 : DESK_Y + 1.0;
      const yB = b.onCard ? PCB_T + 0.3 : DESK_Y + 1.0;
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(p0.x, yA, p0.z), new THREE.Vector3(p0.x + 3, yA + 2.5, p0.z),
        new THREE.Vector3(p3.x - 3, yB + 2.5, p3.z), new THREE.Vector3(p3.x, yB, p3.z)
      );
      mat.color.setHex(0x1a1d22);
      mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.09, 8, false), mat);
    }
    group.add(mesh);
    ctx.addSignal(mat, wire.from.id, wire.from.pin);
  }

  // Desk accessory: gamepad plugged into the bracket DB-9 (only for the NV1 card)
  if (hasCard && engine.components.has('saturn_pad')) {
    const pad = P.gamepad();
    pad.position.set(X(NV1_CARD.x) - 9, DESK_Y, Z(NV1_CARD.y + 430));
    pad.rotation.y = 0.5;
    group.add(pad);
    const bz = Z(NV1_CARD.y + 110 + 360 * 0.78);
    const cable = new THREE.CubicBezierCurve3(
      new THREE.Vector3(X(NV1_CARD.x) - 0.6, 0.1, bz), new THREE.Vector3(X(NV1_CARD.x) - 4, -0.5, bz),
      new THREE.Vector3(pad.position.x + 2, DESK_Y + 0.4, pad.position.z - 2), new THREE.Vector3(pad.position.x + 1.2, DESK_Y + 0.35, pad.position.z - 0.9)
    );
    group.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 40, 0.08, 8, false), std(0x1b1d22)));
  }

  // Desk
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), std(0x0a0d14, { roughness: 0.92 }));
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = DESK_Y;
  desk.receiveShadow = true;
  group.add(desk);

  const span = Math.max(bounds.w, 600) * S;
  return {
    camera: [span * 0.35, span * 0.75, span * 0.95],
    target: [0, 0, 1],
    floorY: DESK_Y,
  };
}

/** PCI edge connector: gold fingers on both sides of the card tab, with the 5 V key notch. */
function buildPciEdge(comp, X, Z, S) {
  const g = new THREE.Group();
  const { tab, y, h } = NV1_CARD;
  const x0 = X(tab.x), x1 = X(tab.x + tab.w);
  const z0 = Z(y + h), z1 = Z(y + h + tab.h);
  const count = 60;
  const pitch = (x1 - x0 - 0.6) / count;
  const finger = new THREE.BoxGeometry(pitch * 0.62, 0.02, (z1 - z0) * 0.86);
  const mats = [];
  for (let i = 0; i < count; i++) {
    if (i >= 11 && i <= 13) continue; // key notch region
    const fx = x0 + 0.3 + (i + 0.5) * pitch;
    const fz = (z0 + z1) / 2 + (z1 - z0) * 0.05;
    mats.push(mat4(fx, PCB_T + 0.01, fz), mat4(fx, -0.01, fz));
  }
  g.add(instanced(finger, MAT.gold(), mats));
  // Key notch: dark slot cut into the tab
  const notch = new THREE.Mesh(new THREE.BoxGeometry(pitch * 3, PCB_T + 0.04, (z1 - z0) * 0.55), std(0x06080c));
  notch.position.set(x0 + 0.3 + 12.5 * pitch, PCB_T / 2, z1 - (z1 - z0) * 0.27);
  g.add(notch);
  // Bus-interface glue logic: series termination resistor packs above the fingers
  const rn = new THREE.BoxGeometry(1.2, 0.25, 0.5);
  const rmats = [];
  for (let i = 0; i < 6; i++) rmats.push(mat4(x0 + 1.5 + i * ((x1 - x0 - 3) / 5), PCB_T + 0.125, z0 - 0.6));
  g.add(instanced(rn, std(0x111111), rmats));
  // invisible pick volume over the whole component footprint
  const { w: cw, h: ch } = componentDims(comp, 'hardware');
  const pick = new THREE.Mesh(new THREE.BoxGeometry(cw * S, 0.5, ch * S), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  pick.position.set(X(comp.x + cw / 2), PCB_T + 0.2, Z(comp.y + ch / 2));
  g.add(pick);
  return g;
}

/** Steel PCI bracket standing at the card edge with VGA, 2× audio jack and DB-9 connectors. */
function buildBracket(comp, X, Z, S, edgeX) {
  const g = new THREE.Group();
  const { h } = componentDims(comp, 'hardware');
  const zA = Z(comp.y), zB = Z(comp.y + h);
  const len = zB - zA, zc = (zA + zB) / 2;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, len), MAT.steel());
  plate.position.set(edgeX - 0.55, 1.2, zc);
  plate.castShadow = true;
  g.add(plate);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.6), MAT.steel());
  fold.position.set(edgeX - 1.4, 3.26, zA + 0.8);
  g.add(fold);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.0), MAT.steel());
  tongue.position.set(edgeX - 0.55, -1.4, zB - 1.2);
  g.add(tongue);
  // connectors sit on the PCB edge and poke through the bracket
  const place = (obj, frac, y = PCB_T + 0.65) => { obj.position.set(edgeX - 0.5, y, zA + len * frac); g.add(obj); };
  place(P.dsub({ shells: 15, color: 0x1f5bd8 }), 0.22);
  place(P.audioJack(0x2fa84f), 0.44);
  place(P.audioJack(0x2a7de1), 0.54);
  place(P.dsub({ shells: 9, color: 0x15171b }), 0.78);
  // silkscreen labels on the outside of the bracket
  const labelTex = textTexture(['VGA', ' ', 'OUT  IN', ' ', 'SATURN'], { w: 128, h: 512, bg: null, fg: '#2a2f36', font: 'bold 26px monospace' });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.9, 1.0), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }));
  label.rotation.y = -Math.PI / 2;
  label.rotation.z = Math.PI / 2;
  label.position.set(edgeX - 0.6, 2.6, zc);
  g.add(label);
  return g;
}
