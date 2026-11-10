// Shared geometry of the circuit layout, used by the 2D canvas (schematic / PCB) and the 3D view,
// so the 3D board matches the 2D hardware drawing exactly.
//
// Board scale: PX_PER_MM = 3.7 world px per millimetre. Package sizes below are the real body (+ leads)
// dimensions of the parts on the Diamond Edge 3D, so the PCB view is drawn to scale.

export const PX_PER_MM = 3.7;
const mm = (v) => Math.round(v * PX_PER_MM);

const SCHEMATIC_DIMS = {
  VIRTUAL_SCREEN: [180, 190], INPUT: [90, 56], CLOCK: [96, 56], PROBE: [84, 50], NOT: [70, 44],
  AND: [84, 56], NAND: [84, 56], OR: [88, 56], NOR: [88, 56], XOR: [94, 56], XNOR: [94, 56], D_FF: [86, 74], MUX: [78, 70],
  SEVEN_SEGMENT: [88, 108], RAM: [140, 96], ROM: [140, 96], REGISTER_8BIT: [140, 96],
  ADDER_8BIT: [120, 90], COMPARATOR_8BIT: [120, 80], VDD: [60, 40], GND: [60, 40], NMOS: [70, 70], PMOS: [70, 70],
  // board parts: tall enough for one pin row every 18 px
  NV1_CORE: [220, 520], PCI_HOST: [200, 230], PCI_EDGE: [200, 210], RAMDAC_STG1764: [190, 140],
  DRAM_256K16: [150, 130], EPROM_27C256: [150, 90], AD1845: [170, 200], CRYSTAL: [110, 50],
  VGA_DB15: [180, 130], GAME_PORT: [160, 70], AUDIO_JACK: [150, 70], SATURN_PAD: [150, 70],
  VGA_MONITOR: [280, 250], AUDIO_SPEAKERS: [180, 110],
  // AI PC (schéma napájení)
  DELL_T5810: [240, 120], ATX_PSU: [240, 200], ADD2PSU: [200, 100], EPS_ADAPTER: [240, 110], TESLA_P100: [240, 110],
  PWM_HUB: [220, 140], BLOWER_9733: [210, 90],
  CONN_PCIE8: [200, 160], CONN_EPS8: [200, 160], CONN_SATA: [210, 120], CONN_ATX24: [220, 110], CONN_FAN4: [200, 104],
  RELAY: [210, 104], DIODE: [150, 70],
  // MŮJ PC (schéma L1)
  MYPC_PSU: [240, 250], MYPC_BOARD: [260, 440], MYPC_CPU: [240, 150], MYPC_DIMM: [220, 60], MYPC_GPU: [250, 170],
  MYPC_SSD: [220, 70], MYPC_FAN: [220, 80], MYPC_MONITOR: [220, 60], MYPC_USB_DEV: [220, 60],
};

// Real package outlines (incl. leads) on the PCB, in world px
const HARDWARE_DIMS = {
  NV1_CORE: [mm(30.6), mm(30.6)], // PQFP-208: 28 x 28 mm body, 30.6 mm over the gull-wing leads
  RAMDAC_STG1764: [mm(17.2), mm(23.2)], // PQFP-128: 14 x 20 mm body
  DRAM_256K16: [mm(11.2), mm(26.0)], // SOJ-40 400 mil: 10.16 x 26.03 mm
  EPROM_27C256: [mm(37.0), mm(15.2)], // DIP-28 600 mil, lying horizontally
  AD1845: [mm(25.2), mm(25.2)], // PLCC-68: 24.2 mm body + J-leads
  CRYSTAL: [mm(11.0), mm(4.7)], // HC-49/U
  PCI_EDGE: [mm(85.0), mm(7.9)], // 32-bit 5 V card edge, 120 contacts on 1.27 mm pitch (both sides)
  VGA_DB15: [mm(17.0), mm(33.0)], // DE-15 shell on the bracket
  GAME_PORT: [mm(17.0), mm(16.0)], // RJ-45 jack
  AUDIO_JACK: [mm(12.0), mm(9.0)], // 3.5 mm jack
  // off-board equipment (not to scale)
  PCI_HOST: [300, 110], VGA_MONITOR: [300, 270], AUDIO_SPEAKERS: [220, 120], SATURN_PAD: [170, 110],
  VIRTUAL_SCREEN: [190, 200], SEVEN_SEGMENT: [92, 112], INPUT: [110, 94], CLOCK: [130, 84], PROBE: [110, 78],
  RAM: [174, 126], ROM: [174, 126], REGISTER_8BIT: [174, 126],
  // MŮJ PC: deska a díly na ní 1 : 1 (myPcLayout.js), zařízení mimo desku ne v měřítku
  MYPC_BOARD: [mm(221), mm(305)], MYPC_CPU: [mm(37.5), mm(37.5)], MYPC_DIMM: [mm(7), mm(133.35)], MYPC_GPU: [mm(230), mm(42)],
  MYPC_SSD: [mm(80.15), mm(22.15)],
  MYPC_PSU: [240, 150], MYPC_FAN: [220, 90], MYPC_MONITOR: [300, 170], MYPC_USB_DEV: [230, 80],
};

export function componentDims(comp, mode = 'hardware') {
  if (mode === 'schematic' && comp.w && comp.h && !SCHEMATIC_DIMS[comp.type]) return { w: comp.w, h: comp.h }; // blok s pevnou velikostí
  const table = mode === 'schematic' ? SCHEMATIC_DIMS : HARDWARE_DIMS;
  const d = table[comp.type] || (mode === 'schematic' ? [90, 60] : [154, 90]);
  return { w: d[0], h: d[1] };
}

// Pin position in hardware (PCB) mode: pins are spread evenly along the left (inputs) / right (outputs)
// edge of the package, so every pin fits inside the real outline. Schematic pins are computed in LogicCanvas.
export function hardwarePinPos(comp, pinName, isOutput) {
  const { w, h } = componentDims(comp, 'hardware');
  if (comp.type === 'SEVEN_SEGMENT') {
    const idx = ['b0', 'b1', 'b2', 'b3'].indexOf(pinName);
    if (idx !== -1) return { x: comp.x, y: comp.y + 26 + idx * 18 };
    return { x: comp.x, y: comp.y + h / 2 };
  }
  const pins = Object.keys((isOutput ? comp.outputs : comp.inputs) || {});
  const idx = Math.max(0, pins.indexOf(pinName));
  const n = Math.max(1, pins.length);
  return { x: isOutput ? comp.x + w : comp.x, y: comp.y + (h * (idx + 0.5)) / n };
}

// Diamond Edge 3D PCI card outline (2D world px). PCI cards are 106.68 mm tall including the edge fingers.
// The 32-bit 5 V edge (85 mm) sits under the J1 part; its key notch is ~11 contacts from the free end.
export const NV1_CARD = {
  x: 120, y: 20, w: mm(175), h: mm(106.68) - mm(7.9), chamfer: mm(9),
  // pin 1 is at the bracket end; the 5 V key notch replaces contacts 50/51 (1.27 mm pitch)
  tab: { x: 275, w: mm(85), h: mm(7.9), key: { at: mm(1.5 + 49 * 1.27), w: mm(2.5) } },
};

// Outline polygon of the card, clockwise, in 2D world px.
export function nv1CardOutline() {
  const { x, y, w, h, chamfer, tab } = NV1_CARD;
  return [
    [x, y], [x + w - chamfer, y], [x + w, y + chamfer], [x + w, y + h],
    [tab.x + tab.w, y + h], [tab.x + tab.w, y + h + tab.h], [tab.x, y + h + tab.h], [tab.x, y + h],
    [x, y + h],
  ];
}

const BRACKET_TYPES = new Set(['VGA_DB15', 'GAME_PORT', 'AUDIO_JACK']);

export function isOnNv1Card(comp) {
  if (BRACKET_TYPES.has(comp.type) || comp.type === 'PCI_EDGE') return true;
  const { w, h } = componentDims(comp, 'hardware');
  const { x, y, w: cw, h: ch } = NV1_CARD;
  return comp.x >= x - 1 && comp.y >= y - 1 && comp.x + w <= x + cw + 1 && comp.y + h <= y + ch + 1;
}

export const isBracketPart = (comp) => BRACKET_TYPES.has(comp.type);

// Clock frequency printed on a crystal can
export function crystalFrequency(comp) {
  if (comp.freqHz) return (comp.freqHz / 1e6).toFixed(comp.freqHz % 1e3 ? 5 : 3).replace(/0+$/, '');
  const m = /([\d.]+)\s*MHz/i.exec(comp.label || '');
  return m ? m[1] : '14.31818';
}
