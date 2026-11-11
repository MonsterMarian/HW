// ANATOMY (test): celá sestava v jednom izometrickém výkresu (kit Anatomy, src/vendor/anatomy) –
// malé díly jsou vidět ve velkém celku přes očíslované popisky, posuvník je rozloží (exploded view).
// Čistý modul: vrací SVG řetězec, žádné DOM. Souřadnice v mm: x, y na podlaze, z nahoru; divák je na +x +y.
import {
  slabOf, cylinder, extrude, solidSvg, lineSvg, groupSvg, figureSvg, fitProjection, iso, depthOf,
  boxCorners, pathOf, ring as ringOn, lineOnTop,
} from '../../vendor/anatomy/iso-kit.js';
import { NV1_CARD, nv1CardOutline, componentDims, PX_PER_MM } from '../../engine/boardLayout.js';

export const FIG_W = 1000, FIG_H = 680;
const PCIE_FULL_LENGTH = 312; // mm, karta plné délky (PCI Express CEM), T5810 víc nepojme

// ---------------------------------------------------------------- díly
// part = { id: položka kusovníku, key, b: [x, y, z, w, d, h], r, explode: [dx, dy, dz], tone, lines(P, o) }
const part = (id, key, b, explode = [0, 0, 0], extra = {}) => ({ id, key, b, explode, r: 1, ...extra });
// orient = kam míří osy 3D modelu z ECONOMIC (X, Y, Z; Y nahoru) v osách sestavy (x, y, z; z nahoru).
// Karta v towerech: kontakty (+Z modelu) k desce (-x), záslepka (-X) dozadu (-y), chladič (+Y) dolů (-z).
const CARD = ['y', '-z', '-x'];
const FLAT = ['x', 'z', '-y']; // díl ležící na stole tak, jak ho kreslí ECONOMIC
const FLAT_TURNED = ['-y', 'z', '-x']; // totéž otočené o 90° (délka podél y)

/** AI PC: Dell T5810 v řezu (levý bok a víko sundané), karty v PCIe slotech, druhý zdroj za skříní. */
export function pcParts() {
  const W = 172.6, D = 471, H = 414;
  const P = [];
  // ---- skříň (stěny vzadu a vlevo od diváka, zbytek jen obrys)
  P.push(part('dell_t5810', 'floor', [0, 0, 0, W, D, 3], [0, 0, 0], { tone: 'mid' }));
  P.push(part('dell_t5810', 'rear', [0, 0, 3, W, 4, H - 3], [0, 0, 0], { tone: 'mid' }));
  P.push(part('dell_t5810', 'tray', [0, 4, 3, 4, D - 4, H - 3], [0, 0, 0], { tone: 'mid' }));
  P.push(part('dell_t5810', 'board', [4, 12, 40, 1.6, 318, 360], [0, 0, 0], { tone: 'lo' })); // základní deska (odhad polohy)
  P.push(part('dell_t5810', 'psu685', [6, 4, 3, 110, 250, 40], [0, 0, 0], { tone: 'lo' })); // vestavěný zdroj dole vzadu
  P.push(part('dell_t5810', 'cooler', [6, 205, 262, 92, 92, 88], [90, 0, 0], { tone: 'lo' })); // chladič CPU
  P.push(part('dell_t5810', 'retention', [40, PCIE_FULL_LENGTH, 40, 130, 12, 170], [0, 0, 0], { tone: 'mid' })); // držák karet
  P.push(part('dell_t5810', 'bays', [10, 400, 3, 160, 52, 150], [0, 0, 0], { tone: 'lo' })); // šachty disků vpředu dole
  // ---- CPU, RAM
  P.push(part('cpu', 'cpu', [6, 228, 282, 4.8, 45, 52.5], [180, 0, 40], { orient: ['z', 'x', 'y'] }));
  [0, 1].forEach((i) => P.push(part('ram', `ram${i}`, [6, 182, 362 + i * 14, 31.25, 133.35, 4.2], [160 + i * 30, 0, 60 + i * 20], { orient: CARD })));
  [0, 1].forEach((i) => P.push(part('ram', `ram${i + 2}`, [6, 182, 232 + i * 14, 31.25, 133.35, 4.2], [160 + i * 30, 0, -20 - i * 20], { orient: CARD })));
  // ---- karty: pořadí slotů shora 1–6 ověřeno z manuálu Dell (obr. System Board Components), rozteč 20,32 mm (PCIe CEM);
  // dvouslotové P100 ve slotech 2 a 4 visí chladičem dolů a zakryjí sloty 3 a 5
  const slotZ = (s) => 186 - (s - 1) * 20.32;
  [2, 4].forEach((s, i) => {
    const z0 = slotZ(s) - 37;
    P.push(part('p100', `p100_${i}`, [12, 4, z0, 111.15, 267, 37], [260, 0, 80 - i * 60], { orient: CARD,
      lines: (pr, o) => lineSvg(lineOnTop([o[0] + 8, o[1] + 20], [o[0] + 8, o[1] + 247], o[2] + 37, pr), { tone: 'faint' })
        + lineSvg(lineOnTop([o[0] + 103, o[1] + 20], [o[0] + 103, o[1] + 247], o[2] + 37, pr), { tone: 'faint' }),
    }));
    P.push(part('shroud', `shroud_${i}`, [12, 271, z0, 111.15, 91, 37], [260, 90, 80 - i * 60], { tone: 'mid', orient: CARD }));
    P.push(part('blower', `blower_${i}`, [20, 318, z0 + 2, 94, 97, 33], [260, 190, 80 - i * 60], { orient: CARD,
      lines: (pr, o) => lineSvg(ringOn(o[0] + 50, o[1] + 50, 30, o[2] + 33, pr, 40), { tone: 'mid' }),
    }));
  });
  // slot 1 (x8, half-length) je jediný volný – má ho K620; SSD je 2,5" SATA v šachtě disků vpředu (slot nepotřebuje)
  P.push(part('k620', 'k620', [12, 4, slotZ(1) - 18, 68.9, 160, 18], [200, 0, 60], { orient: CARD }));
  P.push(part('ssd', 'ssd', [40, 395, 153, 100, 69.85, 6.8], [160, 60, 40], { orient: FLAT }));
  // ---- za skříní: druhý zdroj, Add2PSU, regulátor; volné díly na stole
  P.push(part('psu2', 'psu2', [10, -190, 0, 150, 140, 86], [0, -60, 0], { tone: 'mid', orient: FLAT }));
  P.push(part('add2psu', 'add2psu', [30, -170, 86, 70, 30, 17], [0, -60, 40], { orient: FLAT }));
  P.push(part('pwm_ctrl', 'pwm', [110, -170, 86, 32, 63, 20.3], [0, -60, 60], { orient: FLAT_TURNED }));
  P.push(part('eps_cable', 'eps0', [200, -150, 0, 50, 140, 15.1], [80, -40, 0], { orient: FLAT_TURNED }));
  P.push(part('eps_cable', 'eps1', [260, -150, 0, 50, 140, 15.1], [120, -40, 0], { orient: FLAT_TURNED }));
  P.push(part('case_fan', 'fan0', [200, 20, 0, 120, 120, 25], [80, 0, 0], { round: true, orient: FLAT }));
  P.push(part('case_fan', 'fan1', [200, 160, 0, 120, 120, 25], [80, 0, 0], { round: true, orient: FLAT }));
  P.push(part('paste', 'paste', [345, 400, 0, 15, 92, 15], [80, 0, 0], { round: 'x', orient: FLAT_TURNED }));
  for (const p of P) if (p.id === 'dell_t5810') p.box = true; // skříň ve 3D jen jako desky
  return {
    parts: P,
    shell: { W, D, H },
    // kolize: karta s krytem a ventilátorem (y 4 … 415) proti limitu plné délky
    clash: { y0: PCIE_FULL_LENGTH, y1: 415, note: `P100 + kryt + 9733 ≈ 411 mm > ${PCIE_FULL_LENGTH} mm (plná délka PCIe)` },
  };
}

/**
 * Můj PC: skříň (odhad Endorfy Signum 300 Air) v řezu, deska ASUS PRIME B360-PLUS na stěně, díly na pozicích z manuálu.
 * Bod desky (v od horní hrany, u od zadní hrany, výška nad PCB) → sestava: x = 11,6 + výška, y = 15 + u, z = 422 − v.
 */
export function myPcParts() {
  const W = 216, D = 413, H = 447;
  const top = 422, by = 15, bx = 10; // horní hrana desky, zadní hrana desky, PCB na distančních sloupcích 6 mm
  const z = (v) => top - v, y = (u) => by + u;
  const BOARD = ['-z', 'x', '-y']; // osy modelu desky (v, nahoru, −u) → sestava
  const P = [];
  P.push(part('my_case', 'floor', [0, 0, 0, W, D, 3], [0, 0, 0], { tone: 'mid', box: true }));
  P.push(part('my_case', 'rear', [0, 0, 3, W, 3, H - 3], [0, 0, 0], { tone: 'mid', box: true }));
  P.push(part('my_case', 'tray', [0, 3, 3, 4, D - 3, H - 3], [0, 0, 0], { tone: 'mid', box: true }));
  P.push(part('my_mobo', 'board', [bx, by, top - 305, 36, 221, 305], [0, 0, 0], { orient: BOARD }));
  P.push(part('my_cpu', 'cpu', [bx + 4.5, y(108) - 18.75, z(86) - 18.75, 4.4, 37.5, 37.5], [140, 0, 40], { orient: BOARD }));
  P.push(part('my_cooler', 'cooler', [bx + 8.9, y(108) - 47.5, z(86) - 47.5, 48.7, 95, 95], [220, 0, 60], { orient: BOARD }));
  [164.2, 174, 183, 192.8].forEach((u, i) => P.push(part('my_ram', `ram${i}`, [bx + 4.6, y(u) - 3.54, z(82.7) - 66.7, 34.04, 7.08, 133.35], [150 + i * 20, 0, 30 + i * 10], { orient: ['z', 'y', '-x'] })));
  // grafika v PCIEX16_1 (v 182,8), chladičem dolů; SSD v M.2_2 (v 225, u 46–124) pod ní
  P.push(part('my_gpu', 'gpu', [bx + 4.6, 4, z(182.8) - 39, 120, 230, 42], [260, 40, -30], { orient: ['y', '-z', '-x'] }));
  P.push(part('my_ssd', 'ssd', [bx + 3.6, y(44), z(225) - 11, 2.38, 80.15, 22.15], [320, 0, -80], { orient: ['y', 'x', '-z'] }));
  // zdroj dole vzadu ventilátorem dolů (kryt zdroje není kreslený)
  P.push(part('my_psu', 'psu', [33, 6, 3, 150, 140, 87], [0, -40, -20], { orient: ['x', '-z', 'y'] }));
  return { parts: P, shell: { W, D, H }, camera: [0.75, 0.5, -0.8] }; // 3D: pohled zepředu přes okno (three −Z = dopředu)
}

export const ASSEMBLIES = { p100pc: pcParts, mypc: myPcParts }; // projekty se sestavou ve skříni

/** Karta NV1: deska podle PCB pohledu (3,7 px/mm), součástky na skutečných pozicích. */
export function nv1Parts(circuit) {
  const mm = (px) => px / PX_PER_MM;
  const HEIGHT = { NV1_CORE: 3.65, RAMDAC_STG1764: 2.95, DRAM_256K16: 3.6, AD1845: 4.45, EPROM_27C256: 4.4, CRYSTAL: 13.46, VGA_DB15: 12.5, GAME_PORT: 13.5, AUDIO_JACK: 6 };
  const ID = { NV1_CORE: 'nv1', RAMDAC_STG1764: 'ramdac', DRAM_256K16: 'dram', AD1845: 'codec', EPROM_27C256: 'eprom', VGA_DB15: 'de15', GAME_PORT: 'rj45', AUDIO_JACK: 'jack' };
  const P = [];
  for (const c of circuit.components) {
    const id = c.type === 'CRYSTAL' ? 'xtal_14' : ID[c.type];
    if (!id) continue;
    const { w, h } = componentDims(c, 'hardware');
    const lift = 18 + (Object.keys(ID).indexOf(c.type) % 3) * 6;
    P.push(part(id, c.id, [mm(c.x), mm(c.y), 1.6, mm(w), mm(h), HEIGHT[c.type]], [0, 0, lift], { tone: 'hi', r: 0.6, orient: FLAT, freqHz: c.freqHz }));
  }
  return { parts: P, card: nv1CardOutline().map(([x, y]) => [mm(x), mm(y)]), tab: NV1_CARD.tab };
}

// ---------------------------------------------------------------- vykreslení
function solidOf(p, P, o) {
  const [x, y, z] = o;
  const [, , , w, d, h] = p.b;
  if (p.round === true) return cylinder(x + w / 2, y + d / 2, Math.min(w, d) / 2, z, h, P, 40);
  return slabOf({ x, y, w, d, r: p.r }, z, h, P, 3);
}

/** Popisky: kolečka s číslem položky ve dvou sloupcích (vlevo / vpravo), vodicí čára k dílu. */
function balloons(anchors, W) {
  const sides = { left: [], right: [] };
  for (const a of anchors) sides[a.at[0] < W / 2 ? 'left' : 'right'].push(a);
  const out = [];
  for (const [side, list] of Object.entries(sides)) {
    list.sort((a, b) => a.at[1] - b.at[1]);
    let last = -Infinity;
    for (const a of list) {
      const y = Math.max(a.at[1], last + 24);
      last = y;
      out.push({ ...a, pos: [side === 'left' ? 26 : W - 26, Math.min(FIG_H - 14, y)] });
    }
  }
  return out;
}

/**
 * Výkres projektu. explode 0…1 rozloží sestavu, focus = id položky kusovníku (zvýraznění).
 * Vrací { svg, items: [{ id, n }] } – n = číslo popisku.
 */
export function anatomyFigure(project, { explode = 0, focus = null } = {}) {
  const isPc = project.id in ASSEMBLIES;
  const model = isPc ? ASSEMBLIES[project.id]() : nv1Parts(project.circuit);
  const bomIndex = new Map(project.bom.map((it, i) => [it.id, i + 1]));
  const off = (p) => p.b.slice(0, 3).map((v, k) => v + p.explode[k] * explode);

  // kamera nad všemi polohami (složeno i rozloženo), ať výkres při posunu neskáče
  const pts = [];
  for (const p of model.parts) for (const e of [0, 1]) {
    const o = p.b.slice(0, 3).map((v, k) => v + p.explode[k] * e);
    pts.push(...boxCorners({ x: o[0], y: o[1], w: p.b[3], d: p.b[4] }, o[2], o[2] + p.b[5]));
  }
  if (isPc) pts.push(...boxCorners({ x: 0, y: 0, w: model.shell.W, d: model.shell.D }, 0, model.shell.H));
  else pts.push(...model.card.map(([x, y]) => [x, y, 0]));
  const P = fitProjection(pts, FIG_W, FIG_H, { pad: 70 });

  const body = [];
  // deska karty NV1 (nekonvexní obrys s PCI jazýčkem)
  if (!isPc) body.push(groupSvg(solidSvg(extrude(model.card, 0, 1.6, P, { convex: false }), { tone: 'mid' }), { 'data-part': 'pcb' }));

  // malířův algoritmus: od nejvzdálenějších dílů
  const drawn = model.parts.map((p) => {
    const o = off(p);
    const c = [o[0] + p.b[3] / 2, o[1] + p.b[4] / 2, o[2] + p.b[5] / 2];
    return { p, o, depth: depthOf(c, P), top: iso([c[0], c[1], o[2] + p.b[5]], P) };
  }).sort((a, b) => a.depth - b.depth);

  for (const { p, o } of drawn) {
    const lit = focus === p.id;
    const tone = lit ? 'lit' : p.tone || 'hi';
    const inner = p.lines ? p.lines(P, o) : '';
    body.push(groupSvg(solidSvg(solidOf(p, P, o), { tone, lit, inner }), { 'data-part': p.id, class: lit ? 'an-focus' : undefined }));
  }

  if (isPc) {
    // sundaný bok a víko skříně: jen čárkovaný obrys
    const { W, D, H } = model.shell;
    const c = (x, y, z) => iso([x, y, z], P);
    const edges = [[[W, 0, 0], [W, D, 0]], [[W, D, 0], [0, D, 0]], [[W, 0, H], [W, D, H]], [[W, D, H], [0, D, H]], [[0, D, H], [0, 0, H]], [[0, 0, H], [W, 0, H]], [[W, 0, 0], [W, 0, H]], [[W, D, 0], [W, D, H]], [[0, D, 0], [0, D, H]]];
    body.push(edges.map(([a, b]) => lineSvg(pathOf([c(...a), c(...b)]), { tone: 'mid', dashed: true })).join(''));
  }
  if (model.clash) {
    // limit plné délky PCIe a kolize karet s krytem a ventilátorem
    const c = (x, y, z) => iso([x, y, z], P);
    const y = model.clash.y0;
    body.push(lineSvg(pathOf([c(12, y, 40), c(12, y, 200), c(170, y, 200), c(170, y, 40)], true), { tone: 'red', dashed: true }));
    if (explode < 0.05) {
      for (const p of model.parts.filter((q) => q.id === 'blower' || q.id === 'shroud')) {
        const [x0, y0, z0, w, d, h] = p.b;
        if (y0 + d > y) body.push(lineSvg(pathOf([c(x0, Math.max(y0, y), z0 + h), c(x0 + w, Math.max(y0, y), z0 + h), c(x0 + w, y0 + d, z0 + h), c(x0, y0 + d, z0 + h)], true), { tone: 'red' }));
      }
      const t = c(170, y, 205);
      body.push(`<text class="an-warn" x="${t[0].toFixed(1)}" y="${(t[1] - 6).toFixed(1)}">${model.clash.note}</text>`);
    }
  }

  // popisky: jedno kolečko na položku kusovníku (u nejvyššího kusu)
  const anchors = new Map();
  for (const d of drawn) {
    const n = bomIndex.get(d.p.id);
    if (!n) continue;
    const prev = anchors.get(d.p.id);
    if (!prev || d.top[1] < prev.at[1]) anchors.set(d.p.id, { id: d.p.id, n, at: d.top });
  }
  for (const b of balloons([...anchors.values()], FIG_W)) {
    const lit = focus === b.id;
    body.push(`<g class="an-callout${lit ? ' an-focus' : ''}" data-part="${b.id}">`
      + lineSvg(pathOf([b.at, b.pos]), { tone: lit ? 'lit' : 'faint' })
      + `<circle class="an-dot" cx="${b.at[0].toFixed(1)}" cy="${b.at[1].toFixed(1)}" r="1.6"/>`
      + `<circle class="an-ball" cx="${b.pos[0]}" cy="${b.pos[1].toFixed(1)}" r="10"/>`
      + `<text class="an-num" x="${b.pos[0]}" y="${(b.pos[1] + 3.5).toFixed(1)}">${b.n}</text></g>`);
  }

  const svg = figureSvg({ width: FIG_W, height: FIG_H, label: `${project.title} – izometrický výkres sestavy s očíslovanými díly`, body });
  return { svg, items: [...anchors.values()].map(({ id, n }) => ({ id, n })).sort((a, b) => a.n - b.n), offFigure: project.bom.filter((it) => !anchors.has(it.id)).map((it) => it.id) };
}
