// Shared geometry of the circuit layout, used by the 2D canvas (schematic / PCB) and the 3D view,
// so the 3D board matches the 2D hardware drawing exactly.

const SCHEMATIC_DIMS = {
  VIRTUAL_SCREEN: [180, 190], INPUT: [90, 56], CLOCK: [96, 56], PROBE: [84, 50], NOT: [70, 44],
  AND: [84, 56], NAND: [84, 56], OR: [88, 56], NOR: [88, 56], XOR: [94, 56], D_FF: [86, 74], MUX: [78, 70],
  SEVEN_SEGMENT: [88, 108], NV1_CORE: [190, 170], PCI_BUS: [170, 80], VGA_BRACKET: [160, 100],
  VRAM_BANK: [150, 80], RAMDAC: [150, 80], AUDIO_DSP: [150, 80], SATURN_PAD: [140, 76],
  RAM: [140, 96], ROM: [140, 96], REGISTER_8BIT: [140, 96],
};

const HARDWARE_DIMS = {
  VIRTUAL_SCREEN: [190, 200], SEVEN_SEGMENT: [92, 112], NV1_CORE: [180, 180], PCI_BUS: [260, 60],
  VGA_BRACKET: [84, 360], VRAM_BANK: [140, 66], RAMDAC: [110, 110], AUDIO_DSP: [110, 110],
  SATURN_PAD: [130, 86], INPUT: [110, 94], CLOCK: [130, 84], PROBE: [110, 78],
  RAM: [174, 126], ROM: [174, 126], REGISTER_8BIT: [174, 126],
};

export function componentDims(comp, mode = 'hardware') {
  const table = mode === 'schematic' ? SCHEMATIC_DIMS : HARDWARE_DIMS;
  const d = table[comp.type] || (mode === 'schematic' ? [90, 60] : [154, 90]);
  return { w: d[0], h: d[1] };
}

// Pin position in hardware (PCB) mode; schematic pins are computed in LogicCanvas.
export function hardwarePinPos(comp, pinName, isOutput) {
  const { w, h } = componentDims(comp, 'hardware');
  if (comp.type === 'SEVEN_SEGMENT') {
    const idx = ['b0', 'b1', 'b2', 'b3'].indexOf(pinName);
    if (idx !== -1) return { x: comp.x, y: comp.y + 26 + idx * 18 };
    return { x: comp.x, y: comp.y + h / 2 };
  }
  const pins = Object.keys((isOutput ? comp.outputs : comp.inputs) || {});
  const idx = Math.max(0, pins.indexOf(pinName));
  return { x: isOutput ? comp.x + w : comp.x, y: comp.y + 32 + idx * 17 };
}

// Diamond Edge 3D PCI card outline (2D world px). Tab = PCI edge connector under the PCI_BUS part.
export const NV1_CARD = {
  x: 120, y: 20, w: 650, h: 528, chamfer: 35,
  tab: { x: 250, w: 260, h: 34 },
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

export function isOnNv1Card(comp) {
  if (comp.type === 'VGA_BRACKET' || comp.type === 'PCI_BUS') return true;
  const { w, h } = componentDims(comp, 'hardware');
  const { x, y, w: cw, h: ch } = NV1_CARD;
  return comp.x >= x - 1 && comp.y >= y - 1 && comp.x + w <= x + cw + 1 && comp.y + h <= y + ch + 1;
}

// Clock frequency printed on a crystal can, taken from its label ("Y2 24.576 MHz ...")
export function crystalFrequency(comp) {
  const m = /([\d.]+)\s*MHz/i.exec(comp.label || '');
  return m ? m[1] : '14.31818';
}
