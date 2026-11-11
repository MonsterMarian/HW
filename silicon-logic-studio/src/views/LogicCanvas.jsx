import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { audioEngine } from '../engine/audioEngine';
import { screenInfo, formatProbe, PROBE_FORMATS } from '../engine/logicEngine';
import { paintScreen } from './canvas/screen';
import { componentDims, NV1_CARD } from '../engine/boardLayout';
import { THEME, signalStyle, fmtTime } from './canvas/theme';
import { makeLayout, viewPos, setViewPos, isDevice, isBoxPart, isOffBoard, labelTag, routeOrtho, routeAround, tracePolyline } from './canvas/geometry';
import { drawCard, drawMyPcBoard, drawPcbPart, drawSchematicDevice, liveRect, padButtons } from './canvas/boardDraw';
import { boardKindOf, myPcBoard } from '../engine/myPcLayout';
import { pcbRoutes } from './canvas/pcbRoutes';

const CHIP_PROFILES = {
  // 74LS = Low-power Schottky TTL (ne „FAST“, to je řada 74F). Jen součástky, které funkcí opravdu odpovídají.
  AND: { code: 'SN74LS08N', desc: 'QUAD 2-INPUT AND GATE', family: 'LS-TTL', mfr: 'TI' },
  OR: { code: 'SN74LS32N', desc: 'QUAD 2-INPUT OR GATE', family: 'LS-TTL', mfr: 'TI' },
  XOR: { code: 'SN74LS86N', desc: 'QUAD 2-INPUT XOR GATE', family: 'LS-TTL', mfr: 'TI' },
  NOT: { code: 'SN74LS04N', desc: 'HEX INVERTER', family: 'LS-TTL', mfr: 'TI' },
  NAND: { code: 'SN74LS00N', desc: 'QUAD 2-IN NAND GATE', family: 'LS-TTL', mfr: 'TI' },
  NOR: { code: 'SN74LS02N', desc: 'QUAD 2-IN NOR GATE', family: 'LS-TTL', mfr: 'TI' },
  D_FF: { code: 'SN74LS74AN', desc: 'DUAL D-TYPE FLIP-FLOP', family: 'LS-TTL', mfr: 'TI' },
  // 74377 má povolení zápisu (clock enable) jako simulovaný registr; 74374 ho nemá
  REGISTER_8BIT: { code: 'SN74LS377N', desc: 'OCTAL D FLIP-FLOP, CLOCK ENABLE', family: 'LS-TTL', mfr: 'TI' },
  RAM: { code: 'HM62256BLP', desc: '32K×8 SRAM (MODEL: 256×8)', family: 'CMOS SRAM', mfr: 'HITACHI' },
  ROM: { code: 'AT28C64B', desc: '64K EEPROM (MODEL: 256×8)', family: 'CMOS EEPROM', mfr: 'ATMEL' },
  MUX: { code: 'SN74LS157N', desc: 'QUAD 2-TO-1 MUX', family: 'LS-TTL', mfr: 'TI' },
  // 74126 má povolení aktivní v 1 jako simulovaný budič (74125 a 74244 ho mají aktivní v 0)
  TRI_STATE_BUFFER: { code: 'SN74LS126AN', desc: 'QUAD 3-STATE BUFFER', family: 'LS-TTL', mfr: 'TI' },
};

// Piny primitiv ve schématu (hradla mají vlastní tvar značky); comp má x/y už v souřadnicích schématu
function primitiveSchematicPin(comp, pinName, isOutput) {
  const { w, h } = componentDims(comp, 'schematic');
  if (comp.type === 'AND' || comp.type === 'NAND' || comp.type === 'OR' || comp.type === 'NOR' || comp.type === 'XOR') {
    if (!isOutput) return { x: comp.x, y: pinName === 'a' ? comp.y + 16 : comp.y + 40 };
    return { x: comp.x + w, y: comp.y + 28 };
  }
  if (comp.type === 'NOT') return isOutput ? { x: comp.x + w, y: comp.y + 22 } : { x: comp.x, y: comp.y + 22 };
  if (comp.type === 'D_FF') {
    if (!isOutput) return { x: comp.x, y: pinName === 'd' ? comp.y + 20 : comp.y + 54 };
    return { x: comp.x + w, y: pinName === 'q' ? comp.y + 20 : comp.y + 54 };
  }
  if (comp.type === 'INPUT' || comp.type === 'CLOCK') return { x: comp.x + w, y: comp.y + h / 2 };
  if (comp.type === 'PROBE') return { x: comp.x, y: comp.y + h / 2 };
  if (comp.type === 'SEVEN_SEGMENT') {
    const idx = ['b0', 'b1', 'b2', 'b3'].indexOf(pinName);
    return idx !== -1 ? { x: comp.x, y: comp.y + 24 + idx * 18 } : { x: comp.x, y: comp.y + h / 2 };
  }
  const pins = isOutput ? Object.keys(comp.outputs || {}) : Object.keys(comp.inputs || {});
  const idx = Math.max(0, pins.indexOf(pinName));
  const step = h / (pins.length + 1);
  return { x: isOutput ? comp.x + w : comp.x, y: comp.y + step * (idx + 1) };
}

// Hodnota zobrazovačů (sonda, 7segment): engine ji ukládá do comp.value
const shownValue = (comp) => comp.value ?? comp.inputs?.in;

export function LogicCanvas({
  engine,
  onSelectComponent,
  selectedComponentId,
  displayMode = 'schematic', // 'schematic' | 'hardware'
  hierarchyStack,
  onNavigateUp,
  onDrillDown,
}) {
  const canvasRef = useRef(null);
  const [viewState, setViewState] = useState({ x: 80, y: 70, zoom: 1.0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [wiringFrom, setWiringFrom] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [draggingCompId, setDraggingCompId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const animFrameRef = useRef(null);
  const layoutRef = useRef(null);

  // Keyboard shortcut listener: Backspace or Esc to navigate up
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (hierarchyStack && hierarchyStack.length > 1) {
        if (e.key === 'Backspace' || e.key === 'Escape') {
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
          // With a selection, Backspace deletes and Escape deselects (handled below) instead of leaving the level
          if (selectedComponentId || wiringFrom) return;
          e.preventDefault();
          if (onNavigateUp) onNavigateUp();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hierarchyStack, onNavigateUp, selectedComponentId, wiringFrom]);

  // Geometrie aktuálního snímku (pozice, rozměry, piny) – sdílí ji kreslení i myš
  const freshLayout = useCallback(() => {
    layoutRef.current = makeLayout(engine, displayMode);
    return layoutRef.current;
  }, [engine, displayMode]);
  const geomOf = useCallback(
    (comp) => (layoutRef.current?.mode === displayMode ? layoutRef.current : freshLayout()).geom(comp, primitiveSchematicPin),
    [displayMode, freshLayout],
  );

  // Celý obvod do okna (po načtení, změně pohledu nebo úrovně)
  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine.components.size) return;
    const layout = freshLayout();
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const c of engine.components.values()) {
      const g = layout.geom(c, primitiveSchematicPin);
      x0 = Math.min(x0, g.x); y0 = Math.min(y0, g.y - 14); x1 = Math.max(x1, g.x + g.w); y1 = Math.max(y1, g.y + g.h);
    }
    const W = canvas.clientWidth || canvas.width;
    const H = canvas.clientHeight || canvas.height;
    const pad = 36;
    const top = (hierarchyStack?.length || 1) > 1 ? 112 : 44; // místo pro HUD a drobečkovou navigaci s podtitulkem
    const bottom = displayMode === 'schematic' ? 96 : pad; // rohové razítko schématu
    const zoom = Math.max(0.25, Math.min(1.6, Math.min((W - 2 * pad) / (x1 - x0), (H - bottom - top) / (y1 - y0))));
    setViewState({ zoom, x: (W - (x1 - x0) * zoom) / 2 - x0 * zoom, y: top + (H - top - bottom - (y1 - y0) * zoom) / 2 - y0 * zoom });
  }, [engine, freshLayout, displayMode, hierarchyStack]);

  const levelEntry = hierarchyStack?.[hierarchyStack.length - 1];
  const circuitKey = `${hierarchyStack?.length || 1}:${levelEntry?.key ?? ''}:${levelEntry?.title ?? ''}`;
  useEffect(() => {
    const t = setTimeout(fitView, 30);
    return () => clearTimeout(t);
  }, [displayMode, circuitKey, fitView]);

  const getDims = useCallback((comp) => {
    const g = geomOf(comp);
    return { w: g.w, h: g.h };
  }, [geomOf]);

  const getPinPos = useCallback((comp, pinName, isOutput) => {
    const p = geomOf(comp).pins.get(pinName);
    if (p) return p;
    const pos = viewPos(comp, displayMode);
    return { x: pos.x, y: pos.y, side: isOutput ? 'R' : 'L' };
  }, [geomOf, displayMode]);

  // Keyboard Shortcuts (Delete, Backspace, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent backspace navigating back in browser
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          if (selectedComponentId) {
            e.preventDefault();
            engine.removeComponent(selectedComponentId);
            onSelectComponent(null);
            audioEngine.playRelayClick(0.7);
          }
        }
      } else if (e.key === 'Escape') {
        setWiringFrom(null);
        onSelectComponent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, selectedComponentId, onSelectComponent]);

  // Main Render Routine
  // Kreslicí funkce plátna: závisí na enginu, rozvržení a úrovni hierarchie, proto jeden useMemo
  const painters = useMemo(() => {
    // ==========================================
    // ULTRA-REALISTIC HARDWARE PCB RENDERER
    // ==========================================
    function drawRealisticHardwarePCB(ctx, comp, isSelected) {
      const { w, h } = getDims(comp);
      ctx.save();

      // Solder Mask Component Silkscreen Outline (White Legend on PCB)
      ctx.strokeStyle = 'rgba(235, 240, 245, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(comp.x - 6, comp.y - 6, w + 12, h + 12);
      ctx.setLineDash([]);

      // Silkscreen Component Reference Name (e.g. U1, U2, SW1)
      ctx.fillStyle = THEME.text;
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillText(comp.label || comp.type, comp.x - 4, comp.y - 10);

      if (comp.type === 'INPUT') {
        drawRealisticToggleSwitch(ctx, comp, w, h, isSelected);
        ctx.restore();
        return;
      }
      if (comp.type === 'CLOCK') {
        drawRealisticCrystalOscillator(ctx, comp, w, h, isSelected);
        ctx.restore();
        return;
      }
      if (comp.type === 'VIRTUAL_SCREEN') {
        drawRealisticCRT(ctx, comp, w, h, isSelected);
        ctx.restore();
        return;
      }
      if (comp.type === 'PROBE') {
        drawRealisticProbe(ctx, comp, w, h, isSelected);
        ctx.restore();
        return;
      }
      if (comp.type === 'SEVEN_SEGMENT') {
        drawSevenSegmentDisplay(ctx, comp, w, h, isSelected, true);
        ctx.restore();
        return;
      }
      // DIP Integrated Circuit Package (e.g. 74LS08, 74LS86, etc.)
      drawPhotorealisticDIPChip(ctx, comp, w, h, isSelected);
      ctx.restore();
    }

    function drawPhotorealisticDIPChip(ctx, comp, w, h, isSelected) {
      // bloky bez reálného protějšku nenesou vymyšleného výrobce ani datový kód
      const meta = CHIP_PROFILES[comp.type] || { code: comp.type, desc: 'MODEL BLOCK', family: '', mfr: '' };
      const temp = engine.thermalMap.get(comp.id) || 28.5;

      // 1. Draw Soldered Metallic Pins & Pads on PCB FIRST (behind chip body)
      drawPhotorealisticPadsAndLeads(ctx, comp, w, h);

      // 2. Heavy Drop Shadow under the IC Body
      ctx.shadowColor = isSelected ? `rgba(${THEME.highRgb}, 0.55)` : 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = isSelected ? 18 : 12;
      ctx.shadowOffsetY = 6;

      // 3. Molded Black Epoxy Resin Body #121418
      const chipGrad = ctx.createLinearGradient(comp.x, comp.y, comp.x + w, comp.y + h);
      chipGrad.addColorStop(0, '#1C2029');
      chipGrad.addColorStop(0.2, '#12141A');
      chipGrad.addColorStop(0.8, '#0C0E13');
      chipGrad.addColorStop(1, '#07080B');
      ctx.fillStyle = chipGrad;

      roundRect(ctx, comp.x, comp.y, w, h, 4);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // 4. Subtle 3D Chamfer / Bevel around edges
      ctx.strokeStyle = isSelected ? THEME.high : '#2B3342';
      ctx.lineWidth = isSelected ? 2 : 1;
      roundRect(ctx, comp.x, comp.y, w, h, 4);
      ctx.stroke();

      // 5. Longitudinal Center Recessed Channel (typical on DIP ICs)
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(comp.x + 10, comp.y + h / 2 - 1, w - 20, 2);

      // 6. Semicircular Orientation Notch at Pin 1 side (Left)
      ctx.fillStyle = '#07090C';
      ctx.strokeStyle = '#1D2533';
      ctx.beginPath();
      ctx.arc(comp.x, comp.y + h / 2, 7, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.stroke();

      // 7. Pin 1 Indentation Dot
      ctx.fillStyle = '#080A0D';
      ctx.beginPath();
      ctx.arc(comp.x + 12, comp.y + 14, 3, 0, Math.PI * 2);
      ctx.fill();

      // 8. Laser Etched Silkscreen Print (Manufacturer Logo & Part Number)
      // Stylized Texas Instruments / Logo Mark
      ctx.fillStyle = THEME.text;
      ctx.font = `700 12px ${THEME.mono}`;
      ctx.fillText(meta.code, comp.x + 22, comp.y + 24);

      ctx.fillStyle = '#718096';
      ctx.font = `600 8px ${THEME.sans}`;
      ctx.fillText(meta.mfr ? `${meta.mfr} // ${meta.desc}` : meta.desc, comp.x + 22, comp.y + 38);

      ctx.fillStyle = '#4A5568';
      ctx.font = `500 7px ${THEME.mono}`;
      if (meta.family) ctx.fillText(`MALAYSIA 2442B // ${meta.family}`, comp.x + 22, comp.y + h - 14);

      // 9. Real-time Silicon Thermal Sensor Gauge
      const heatColor = temp > 75 ? '#FF003C' : temp > 45 ? '#FF8400' : '#10B981';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      roundRect(ctx, comp.x + w - 48, comp.y + 8, 42, 14, 3);
      ctx.fill();
      ctx.fillStyle = heatColor;
      ctx.font = `700 8px ${THEME.mono}`;
      ctx.fillText(`${temp.toFixed(1)}°C`, comp.x + w - 44, comp.y + 18);
    }

    // Pájecí plošky přesně tam, kde končí spoje (stejná geometrie jako vedení cest)
    function drawPhotorealisticPadsAndLeads(ctx, comp) {
      for (const [pin, p] of geomOf(comp).pins) {
        const isOut = p.side === 'R';
        drawSinglePCBPad(ctx, p.x, p.y, pin, isOut, engine.pinValue(comp.id, pin));
      }
    }

    function drawSinglePCBPad(ctx, x, y, name, isOutput, value) {
      const isHigh = value === 1;

      ctx.save();

      // 1. Oval ENIG Gold Solder Pad on PCB
      ctx.fillStyle = isHigh ? `rgba(${THEME.highRgb}, 0.45)` : '#C59B27';
      ctx.beginPath();
      ctx.ellipse(x, y, 6.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Shiny Solder Joint Meniscus (Tin-Lead alloy droplet)
      const solderGrad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 4);
      solderGrad.addColorStop(0, '#FFFFFF');
      solderGrad.addColorStop(0.4, isHigh ? THEME.high : THEME.text);
      solderGrad.addColorStop(0.8, isHigh ? THEME.highDim : THEME.label);
      solderGrad.addColorStop(1, '#475569');
      ctx.fillStyle = solderGrad;
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Bent Metallic Alloy Lead (Stamping from chip body to pad)
      ctx.fillStyle = isHigh ? THEME.high : THEME.text;
      if (isHigh) {
        ctx.shadowColor = THEME.high;
        ctx.shadowBlur = 10;
      }
      const leadW = 7;
      const leadX = isOutput ? x - leadW : x;
      ctx.fillRect(leadX, y - 2, leadW, 4);

      ctx.restore();

      // 4. White Silkscreen Pin Label on Board
      ctx.fillStyle = isHigh ? THEME.high : THEME.label;
      ctx.font = `600 8px ${THEME.mono}`;
      const textW = ctx.measureText(name.toUpperCase()).width;
      ctx.fillText(name.toUpperCase(), isOutput ? x - textW - 12 : x + 12, y + 3);
    }

    function drawRealisticToggleSwitch(ctx, comp, w, h, isSelected) {
      const isOn = comp.outputs.out === 1;

      // Metal Base Plate
      ctx.fillStyle = '#0E121A';
      roundRect(ctx, comp.x, comp.y, w, h, 6);
      ctx.fill();

      ctx.strokeStyle = isSelected ? THEME.high : '#2A3446';
      ctx.lineWidth = 1.5;
      roundRect(ctx, comp.x, comp.y, w, h, 6);
      ctx.stroke();

      ctx.fillStyle = THEME.label;
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillText('HEAVY TOGGLE', comp.x + 10, comp.y + 16);

      // Chrome Bezel Nut with knurling
      const cx = comp.x + 38;
      const cy = comp.y + 54;
      ctx.fillStyle = '#1E2533';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4A5568';
      ctx.stroke();

      // Chrome Bat Lever
      const handleY = isOn ? cy - 10 : cy + 10;
      ctx.save();
      ctx.shadowColor = isOn ? `rgba(${THEME.highRgb}, 0.8)` : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = isOn ? 14 : 4;
      const leverGrad = ctx.createLinearGradient(cx - 10, handleY - 10, cx + 10, handleY + 10);
      leverGrad.addColorStop(0, '#FFFFFF');
      leverGrad.addColorStop(0.5, isOn ? THEME.highDim : THEME.muted);
      leverGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = leverGrad;
      ctx.beginPath();
      ctx.arc(cx, handleY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pilot LED Lens
      const ledX = comp.x + 84;
      const ledY = comp.y + 54;
      ctx.save();
      if (isOn) {
        ctx.shadowColor = THEME.high;
        ctx.shadowBlur = 18;
        ctx.fillStyle = THEME.high;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ledX - 2.5, ledY - 2.5, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#151D2A';
        ctx.beginPath();
        ctx.arc(ledX, ledY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = THEME.low;
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = isOn ? THEME.high : '#475569';
      ctx.font = `700 8px ${THEME.mono}`;
      ctx.fillText(isOn ? 'ON' : 'OFF', ledX - 6, ledY + 20);

      drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
    }

    function drawRealisticCrystalOscillator(ctx, comp, w, h, isSelected) {
      const isHigh = comp.outputs.out === 1;

      // Brushed Aluminum Can
      const grad = ctx.createLinearGradient(comp.x, comp.y, comp.x + w, comp.y);
      grad.addColorStop(0, '#4B5563');
      grad.addColorStop(0.2, '#9CA3AF');
      grad.addColorStop(0.6, '#D1D5DB');
      grad.addColorStop(1, '#374151');
      ctx.fillStyle = grad;
      roundRect(ctx, comp.x, comp.y, w, h, 12);
      ctx.fill();

      ctx.strokeStyle = isSelected ? THEME.high : '#E5E7EB';
      ctx.lineWidth = 1.5;
      roundRect(ctx, comp.x, comp.y, w, h, 12);
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = `700 11px ${THEME.mono}`;
      ctx.fillText(`FOX ${crystalFrequency(comp)} MHz`, comp.x + 14, comp.y + 28);
      ctx.font = `600 8px ${THEME.mono}`;
      ctx.fillText('HC-49/U QUARTZ CRYSTAL', comp.x + 14, comp.y + 44);

      // Blinking Pulse LED
      const ledX = comp.x + w - 24;
      const ledY = comp.y + 32;
      if (isHigh) {
        ctx.shadowColor = THEME.high;
        ctx.shadowBlur = 14;
        ctx.fillStyle = THEME.high;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
    }

    function drawRealisticCRT(ctx, comp, w, h, isSelected) {
      ctx.fillStyle = '#0E121A';
      roundRect(ctx, comp.x, comp.y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = isSelected ? THEME.high : THEME.low;
      roundRect(ctx, comp.x, comp.y, w, h, 8);
      ctx.stroke();

      ctx.fillStyle = THEME.label;
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillText(`CRT ${screenInfo(comp).cols}x${screenInfo(comp).rows} ${screenInfo(comp).mode} // DUAL-PORT`, comp.x + 12, comp.y + 16);

      const scrX = comp.x + 12;
      const scrY = comp.y + 26;
      ctx.fillStyle = '#020406';
      roundRect(ctx, scrX, scrY, 128, 128, 4);
      ctx.fill();

      paintScreen(ctx, comp, scrX, scrY, 128, 128); // jen skutečný obsah VRAM

      // CRT Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let sy = scrY; sy < scrY + 128; sy += 3) {
        ctx.fillRect(scrX, sy, 128, 1.2);
      }
      drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
    }

    function drawRealisticProbe(ctx, comp, w, h, isSelected) {
      ctx.fillStyle = '#0B0F17';
      roundRect(ctx, comp.x, comp.y, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = isSelected ? THEME.high : '#243042';
      roundRect(ctx, comp.x, comp.y, w, h, 6);
      ctx.stroke();

      const val = shownValue(comp);
      const strVal = formatProbe(val, comp.format);

      ctx.fillStyle = '#030508';
      roundRect(ctx, comp.x + 30, comp.y + 24, 48, 38, 4);
      ctx.fill();

      ctx.fillStyle = val === 1 ? THEME.high : '#475569';
      ctx.font = `700 ${strVal.length > 2 ? Math.max(8, Math.floor(66 / strVal.length)) : 24}px ${THEME.mono}`;
      ctx.textAlign = 'center';
      ctx.fillText(strVal, comp.x + 54, comp.y + 51);
      ctx.textAlign = 'left';

      drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
    }

    function drawSevenSegmentDisplay(ctx, comp, w, h, isSelected, isHardware) {
      const raw = comp.value;
      const val = typeof raw === 'number' ? raw & 0x0F : 0;
      const hexChar = typeof raw === 'number' ? val.toString(16).toUpperCase() : String(raw ?? '-');

      ctx.save();
      // Chassis Body
      ctx.fillStyle = isHardware ? '#0E121A' : THEME.bg;
      roundRect(ctx, comp.x, comp.y, w, h, 6);
      ctx.fill();

      ctx.strokeStyle = isSelected ? THEME.high : isHardware ? '#2B3548' : '#334155';
      ctx.lineWidth = isSelected ? 2 : 1.2;
      roundRect(ctx, comp.x, comp.y, w, h, 6);
      ctx.stroke();

      // Module Title
      ctx.fillStyle = THEME.muted;
      ctx.font = `700 8px ${THEME.mono}`;
      ctx.fillText('7-SEG DISPLAY', comp.x + 8, comp.y + 14);

      // Bezel Display Window
      const boxX = comp.x + 18;
      const boxY = comp.y + 20;
      const boxW = 54;
      const boxH = 70;

      ctx.fillStyle = '#040203';
      roundRect(ctx, boxX, boxY, boxW, boxH, 4);
      ctx.fill();

      // Segment Bitmask (0-F)
      const SEG_MAP = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];
      const mask = typeof raw === 'number' ? SEG_MAP[val] : 0x40; // neznámý vstup (X/Z) = jen pomlčka, ne platná nula
      const activeColor = '#FF0055'; // Glowing Ruby Red LED
      const dimColor = 'rgba(60, 10, 25, 0.35)';

      const sx = boxX + 14;
      const sy = boxY + 10;
      const segW = 20;
      const segH = 20;
      const t = 3.2;

      function drawH(x, y, on) {
        ctx.save();
        ctx.fillStyle = on ? activeColor : dimColor;
        if (on) {
          ctx.shadowColor = activeColor;
          ctx.shadowBlur = 8;
        }
        ctx.fillRect(x, y, segW, t);
        ctx.restore();
      }

      function drawV(x, y, on) {
        ctx.save();
        ctx.fillStyle = on ? activeColor : dimColor;
        if (on) {
          ctx.shadowColor = activeColor;
          ctx.shadowBlur = 8;
        }
        ctx.fillRect(x, y, t, segH);
        ctx.restore();
      }

      // Segments: a, b, c, d, e, f, g
      drawH(sx, sy, (mask & 0x01) !== 0); // a
      drawV(sx + segW, sy + t, (mask & 0x02) !== 0); // b
      drawV(sx + segW, sy + segH + t * 2, (mask & 0x04) !== 0); // c
      drawH(sx, sy + segH * 2 + t * 2, (mask & 0x08) !== 0); // d
      drawV(sx - t, sy + segH + t * 2, (mask & 0x10) !== 0); // e
      drawV(sx - t, sy + t, (mask & 0x20) !== 0); // f
      drawH(sx, sy + segH + t, (mask & 0x40) !== 0); // g

      // Decimal Point DP: součástka nemá vstup DP, tečka nikdy nesvítí
      ctx.save();
      ctx.fillStyle = dimColor;
      ctx.beginPath();
      ctx.arc(boxX + boxW - 8, boxY + boxH - 8, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Value read-out label at bottom
      ctx.fillStyle = THEME.high;
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillText(typeof raw === 'number' ? `HEX: ${hexChar} (DEC: ${val})` : `HEX: ${hexChar}`, comp.x + 8, comp.y + h - 4);

      if (isHardware) {
        drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
      } else {
        drawSchematicLeads(ctx, comp, w, h, isSelected ? THEME.high : THEME.stroke);
      }

      ctx.restore();
    }

    function drawSchematicComponent(ctx, comp, isSelected) {
      const { w, h } = getDims(comp);
      ctx.save();

      const strokeColor = isSelected ? THEME.high : THEME.stroke;
      const fillColor = isSelected ? `rgba(${THEME.highRgb}, 0.08)` : THEME.panel;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (comp.type === 'AND') {
        const lead = 14;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sw * 0.45, y);
        ctx.arc(x + sw * 0.45, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = isSelected ? THEME.high : THEME.label;
        ctx.font = `700 11px ${THEME.mono}`;
        ctx.fillText('&', x + 12, y + h / 2 + 4);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.label || 'AND', comp.x, comp.y - 4);
      } else if (comp.type === 'NAND') {
        const lead = 14;
        const bubbleR = 4;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2 - bubbleR * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sw * 0.45, y);
        ctx.arc(x + sw * 0.45, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + sw + bubbleR, y + h / 2, bubbleR, 0, Math.PI * 2);
        ctx.fillStyle = THEME.bg;
        ctx.fill();
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = isSelected ? THEME.high : THEME.label;
        ctx.font = `700 11px ${THEME.mono}`;
        ctx.fillText('&', x + 10, y + h / 2 + 4);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.label || 'NAND', comp.x, comp.y - 4);
      } else if (comp.type === 'OR') {
        const lead = 14;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sw * 0.55, y, x + sw, y + h / 2);
        ctx.quadraticCurveTo(x + sw * 0.55, y + h, x, y + h);
        ctx.quadraticCurveTo(x + 12, y + h / 2, x, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = isSelected ? THEME.high : THEME.label;
        ctx.font = `700 11px ${THEME.mono}`;
        ctx.fillText('≥1', x + 18, y + h / 2 + 4);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.label || 'OR', comp.x, comp.y - 4);
      } else if (comp.type === 'NOR') {
        const lead = 14;
        const bubbleR = 4;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2 - bubbleR * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sw * 0.55, y, x + sw, y + h / 2);
        ctx.quadraticCurveTo(x + sw * 0.55, y + h, x, y + h);
        ctx.quadraticCurveTo(x + 12, y + h / 2, x, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + sw + bubbleR, y + h / 2, bubbleR, 0, Math.PI * 2);
        ctx.fillStyle = THEME.bg;
        ctx.fill();
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = isSelected ? THEME.high : THEME.label;
        ctx.font = `700 11px ${THEME.mono}`;
        ctx.fillText('≥1', x + 16, y + h / 2 + 4);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.label || 'NOR', comp.x, comp.y - 4);
      } else if (comp.type === 'XOR') {
        const lead = 14;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2;

        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.quadraticCurveTo(x + 7, y + h / 2, x - 5, y + h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sw * 0.55, y, x + sw, y + h / 2);
        ctx.quadraticCurveTo(x + sw * 0.55, y + h, x, y + h);
        ctx.quadraticCurveTo(x + 12, y + h / 2, x, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = isSelected ? THEME.high : THEME.label;
        ctx.font = `700 11px ${THEME.mono}`;
        ctx.fillText('=1', x + 18, y + h / 2 + 4);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.label || 'XOR', comp.x, comp.y - 4);
      } else if (comp.type === 'NOT') {
        const lead = 12;
        const bubbleR = 4;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2 - bubbleR * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sw, y + h / 2);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + sw + bubbleR, y + h / 2, bubbleR, 0, Math.PI * 2);
        ctx.fillStyle = THEME.bg;
        ctx.fill();
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = isSelected ? THEME.high : THEME.label;
        ctx.font = `700 11px ${THEME.mono}`;
        ctx.fillText('1', x + 8, y + h / 2 + 4);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.label || 'INV', comp.x, comp.y - 4);
      } else if (comp.type === 'D_FF') {
        const lead = 12;
        const x = comp.x + lead;
        const y = comp.y;
        const sw = w - lead * 2;

        ctx.fillRect(x, y, sw, h);
        ctx.strokeRect(x, y, sw, h);

        const clkY = y + 54;
        ctx.beginPath();
        ctx.moveTo(x, clkY - 6);
        ctx.lineTo(x + 8, clkY);
        ctx.lineTo(x, clkY + 6);
        ctx.stroke();

        drawSchematicLeads(ctx, comp, w, h, strokeColor);

        ctx.fillStyle = THEME.text;
        ctx.font = `700 9px ${THEME.mono}`;
        ctx.fillText('D', x + 6, y + 23);
        ctx.fillText('Q', x + sw - 14, y + 23);
        ctx.fillText('Q̄', x + sw - 14, y + 57);

        ctx.fillStyle = isSelected ? THEME.high : THEME.muted;
        ctx.font = `700 9px ${THEME.mono}`;
        ctx.fillText('D-FF', x + sw / 2 - 12, y + 38);
      } else if (comp.type === 'INPUT') {
        // spínač může nést i hodnotu sběrnice (adresa, data): tu ukáže šestnáctkově, ne jako „0“
        const isBus = typeof comp.outputs.out === 'number' && comp.outputs.out > 1;
        const isOn = comp.outputs.out === 1 || isBus;
        const boxW = w - 16;
        ctx.save();
        ctx.fillStyle = isOn ? `rgba(${THEME.highRgb}, 0.15)` : '#0A0E17';
        ctx.strokeStyle = isOn ? THEME.high : THEME.low;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(comp.x, comp.y, boxW, h);
        ctx.fillRect(comp.x, comp.y, boxW, h);

        ctx.fillStyle = isOn ? THEME.high : THEME.muted;
        ctx.font = `700 8px ${THEME.mono}`;
        ctx.fillText(isBus ? 'SRC: BUS' : isOn ? 'SRC: HIGH' : 'SRC: LOW', comp.x + 8, comp.y + 16);

        ctx.fillStyle = isOn ? THEME.high : THEME.text;
        ctx.font = `700 ${isBus ? 13 : 20}px ${THEME.mono}`;
        ctx.fillText(isBus ? formatProbe(comp.outputs.out, 'HEX') : isOn ? '1' : '0', comp.x + (isBus ? 8 : 18), comp.y + 42);

        ctx.strokeStyle = isOn ? THEME.high : THEME.low;
        ctx.beginPath();
        ctx.moveTo(comp.x + boxW, comp.y + h / 2);
        ctx.lineTo(comp.x + w, comp.y + h / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(comp.x + w, comp.y + h / 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isOn ? THEME.high : THEME.low;
        ctx.fill();
        ctx.restore();
      } else if (comp.type === 'CLOCK') {
        const isHigh = comp.outputs.out === 1;
        const boxW = w - 16;
        ctx.strokeRect(comp.x, comp.y, boxW, h);
        ctx.fillRect(comp.x, comp.y, boxW, h);

        ctx.strokeStyle = isHigh ? THEME.high : THEME.muted;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const wy = comp.y + 36;
        ctx.moveTo(comp.x + 12, wy);
        ctx.lineTo(comp.x + 22, wy);
        ctx.lineTo(comp.x + 22, wy - 14);
        ctx.lineTo(comp.x + 36, wy - 14);
        ctx.lineTo(comp.x + 36, wy);
        ctx.lineTo(comp.x + 48, wy);
        ctx.stroke();

        ctx.fillStyle = THEME.muted;
        ctx.font = `700 8px ${THEME.mono}`;
        ctx.fillText('CLK GEN', comp.x + 8, comp.y + 14);

        ctx.strokeStyle = isHigh ? THEME.high : THEME.low;
        ctx.beginPath();
        ctx.moveTo(comp.x + boxW, comp.y + h / 2);
        ctx.lineTo(comp.x + w, comp.y + h / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(comp.x + w, comp.y + h / 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isHigh ? THEME.high : THEME.low;
        ctx.fill();
      } else if (comp.type === 'PROBE') {
        const val = shownValue(comp);
        const str = formatProbe(val, comp.format);
        const isHigh = val === 1;

        const cx = comp.x + w / 2;
        const cy = comp.y + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = THEME.bg;
        ctx.fill();
        ctx.strokeStyle = isHigh ? THEME.high : THEME.stroke;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(comp.x, cy);
        ctx.lineTo(cx - 18, cy);
        ctx.stroke();

        ctx.fillStyle = isHigh ? THEME.high : THEME.text;
        ctx.font = `700 ${str.length > 2 ? Math.max(7, Math.floor(46 / str.length)) : 16}px ${THEME.mono}`;
        ctx.textAlign = 'center';
        ctx.fillText(str, cx, cy + 5);
        ctx.textAlign = 'left';

        ctx.fillStyle = THEME.muted;
        ctx.font = `700 7px ${THEME.mono}`;
        ctx.fillText(comp.format && comp.format !== 'DEC' ? comp.format : 'PROBE', comp.x + 4, comp.y + 8);
      } else if (comp.type === 'VIRTUAL_SCREEN') {
        ctx.strokeRect(comp.x, comp.y, w, h);
        ctx.fillRect(comp.x, comp.y, w, h);

        ctx.fillStyle = THEME.label;
        ctx.font = `700 9px ${THEME.mono}`;
        const scr = screenInfo(comp);
        ctx.fillText(`GPU DISPLAY // ${scr.cols}x${scr.rows} ${scr.mode}`, comp.x + 10, comp.y + 16);

        const scrX = comp.x + 12;
        const scrY = comp.y + 24;
        ctx.fillStyle = '#000000';
        ctx.fillRect(scrX, scrY, 128, 128);
        paintScreen(ctx, comp, scrX, scrY, 128, 128);

        drawSchematicLeads(ctx, comp, w, h, strokeColor);
      } else if (comp.type === 'SEVEN_SEGMENT') {
        drawSevenSegmentDisplay(ctx, comp, w, h, isSelected, false);
      } else if (comp.type === 'NMOS' || comp.type === 'PMOS') {
        // Značka MOSFET: hradlo vlevo, kanál svisle, D/S nahoře a dole; vedoucí kanál = jantar
        const pmos = comp.type === 'PMOS';
        const on = !!comp.conducting;
        const pins = geomOf(comp).pins;
        const g = pins.get('g');
        const top = pins.get(pmos ? 's' : 'd');
        const bot = pins.get(pmos ? 'd' : 's');
        const chX = top.x - 10; // svislý kanál
        const gX = chX - 6; // deska hradla
        const y0 = comp.y + h * 0.26;
        const y1 = comp.y + h * 0.74;
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(pmos ? gX - 7 : gX, g.y);
        ctx.moveTo(gX, y0);
        ctx.lineTo(gX, y1);
        ctx.stroke();
        if (pmos) {
          ctx.beginPath();
          ctx.arc(gX - 3.5, g.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = THEME.bg;
          ctx.fill();
          ctx.stroke();
        }
        ctx.strokeStyle = on ? THEME.high : strokeColor;
        ctx.lineWidth = on ? 2.4 : 1.6;
        ctx.beginPath();
        ctx.moveTo(chX, y0 - 3);
        ctx.lineTo(chX, y1 + 3);
        ctx.moveTo(chX, y0);
        ctx.lineTo(top.x, y0);
        ctx.lineTo(top.x, top.y);
        ctx.moveTo(chX, y1);
        ctx.lineTo(bot.x, y1);
        ctx.lineTo(bot.x, bot.y);
        ctx.stroke();
        // šipka na vývodu source ukazuje směr proudu: NMOS ven z tranzistoru, PMOS dovnitř (jako emitor NPN/PNP)
        const sy = pmos ? y0 : y1;
        const dir = pmos ? -1 : 1;
        const tipX = chX + (pmos ? 1 : 9);
        ctx.fillStyle = on ? THEME.high : strokeColor;
        ctx.beginPath();
        ctx.moveTo(tipX, sy);
        ctx.lineTo(tipX - dir * 6, sy - 3.5);
        ctx.lineTo(tipX - dir * 6, sy + 3.5);
        ctx.fill();
        ctx.font = `700 7px ${THEME.mono}`;
        ctx.fillStyle = THEME.muted;
        ctx.fillText(pmos ? 'S' : 'D', top.x + 4, comp.y + 9);
        ctx.fillText(pmos ? 'D' : 'S', bot.x + 4, comp.y + h - 3);
        ctx.fillText('G', comp.x + 2, g.y - 4);
        ctx.fillStyle = on ? THEME.high : THEME.label;
        ctx.font = `700 8px ${THEME.mono}`;
        const name = String(comp.label || comp.type);
        ctx.fillText(name.length > 16 ? name.slice(0, 15) + '…' : name, comp.x, comp.y + h + 11);
      } else if (comp.type === 'VDD' || comp.type === 'GND') {
        // Značky napájení: VDD = vodorovná čárka nad vývodem, GND = tři zkracující se čárky
        const p = geomOf(comp).pins.get('out');
        const cx = p.x;
        ctx.strokeStyle = comp.type === 'VDD' ? THEME.high : strokeColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        if (comp.type === 'VDD') {
          const by = comp.y + 12;
          ctx.moveTo(cx, p.y);
          ctx.lineTo(cx, by);
          ctx.moveTo(cx - 14, by);
          ctx.lineTo(cx + 14, by);
        } else {
          const by = comp.y + h - 16;
          ctx.moveTo(cx, p.y);
          ctx.lineTo(cx, by);
          [14, 9, 4].forEach((half, i) => { ctx.moveTo(cx - half, by + i * 5); ctx.lineTo(cx + half, by + i * 5); });
        }
        ctx.stroke();
        ctx.fillStyle = comp.type === 'VDD' ? THEME.high : THEME.label;
        ctx.font = `700 9px ${THEME.mono}`;
        ctx.textAlign = 'center';
        ctx.fillText(comp.type === 'VDD' ? 'VDD +5 V' : 'GND', cx, comp.type === 'VDD' ? comp.y + 6 : comp.y + h + 6);
        ctx.textAlign = 'left';
      } else if (comp.type === 'LAYER' || comp.type === 'ATOM') {
        // Popisný štítek (vrstva výrobního procesu / atom) – bez logiky
        const tag = labelTag(comp);
        ctx.fillStyle = THEME.panel;
        ctx.fillRect(comp.x, comp.y, tag.w, tag.h);
        ctx.strokeStyle = isSelected ? THEME.high : 'rgba(138, 142, 147, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(comp.x + 0.5, comp.y + 0.5, tag.w - 1, tag.h - 1);
        ctx.setLineDash([]);
        ctx.fillStyle = THEME.high;
        ctx.fillRect(comp.x, comp.y, 3, tag.h);
        ctx.fillStyle = THEME.text;
        ctx.font = `700 8px ${THEME.mono}`;
        tag.lines.forEach((l, i) => ctx.fillText(l, comp.x + 8, comp.y + 13 + i * 11));
        ctx.fillStyle = THEME.muted;
        ctx.font = `700 6.5px ${THEME.mono}`;
        ctx.fillText(comp.type === 'LAYER' ? 'VRSTVA' : 'ATOM', comp.x + tag.w - 34, comp.y - 3);
        if (comp.drill) {
          ctx.fillStyle = THEME.high;
          ctx.fillText('DVOJKLIK ↓', comp.x + 4, comp.y - 3);
        }
        drawSchematicLeads(ctx, comp, tag.w, tag.h, strokeColor);
      } else {
        ctx.strokeRect(comp.x, comp.y, w, h);
        ctx.fillRect(comp.x, comp.y, w, h);

        ctx.fillStyle = isSelected ? THEME.high : THEME.text;
        ctx.font = `700 10px ${THEME.mono}`;
        ctx.fillText((comp.label || comp.type).toUpperCase(), comp.x + 10, comp.y + 18);

        ctx.fillStyle = THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(comp.type, comp.x + 10, comp.y + 30);

        drawSchematicLeads(ctx, comp, w, h, strokeColor);
      }

      ctx.restore();
    }

    function drawSchematicLeads(ctx, comp, w, h, strokeColor) {
      const inPins = Object.keys(comp.inputs || {});
      inPins.forEach((pin) => {
        const pos = getPinPos(comp, pin, false);
        const isHigh = comp.inputs[pin] === 1;

        ctx.save();
        ctx.strokeStyle = isHigh ? THEME.high : strokeColor;
        ctx.lineWidth = 1.5;

        ctx.fillStyle = isHigh ? THEME.high : THEME.bg;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHigh ? THEME.high : THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        ctx.fillText(pin.toUpperCase(), pos.x + 6, pos.y + 3);
        ctx.restore();
      });

      const outPins = Object.keys(comp.outputs || {});
      outPins.forEach((pin) => {
        const pos = getPinPos(comp, pin, true);
        const isHigh = comp.outputs[pin] === 1;

        ctx.save();
        ctx.strokeStyle = isHigh ? THEME.high : strokeColor;
        ctx.lineWidth = 1.5;

        ctx.fillStyle = isHigh ? THEME.high : THEME.bg;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHigh ? THEME.high : THEME.muted;
        ctx.font = `600 8px ${THEME.mono}`;
        const tw = ctx.measureText(pin.toUpperCase()).width;
        ctx.fillText(pin.toUpperCase(), pos.x - tw - 6, pos.y + 3);
        ctx.restore();
      });
    }

    function drawSchematicTitleBlock(ctx, canvasW, canvasH, eng) {
      const boxW = 280;
      const boxH = 68;
      const pad = 16;
      const x = canvasW - boxW - pad;
      const y = canvasH - boxH - pad;

      ctx.save();
      ctx.fillStyle = THEME.panel;
      ctx.strokeStyle = THEME.low;
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);

      ctx.beginPath();
      ctx.moveTo(x, y + 22);
      ctx.lineTo(x + boxW, y + 22);
      ctx.moveTo(x + 190, y + 22);
      ctx.lineTo(x + 190, y + boxH);
      ctx.stroke();

      const level = hierarchyStack?.[hierarchyStack.length - 1];
      const title = (level?.title || 'Vlastní obvod').toUpperCase();

      ctx.fillStyle = THEME.high;
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillText('SILICON LOGIC STUDIO · IEEE SCHÉMA', x + 10, y + 15);

      ctx.fillStyle = THEME.text;
      ctx.font = `700 9px ${THEME.mono}`;
      ctx.fillText(title.length > 29 ? title.slice(0, 28) + '…' : title, x + 10, y + 38);
      ctx.fillStyle = THEME.label;
      ctx.fillText(`CLK ${Number.isFinite(eng.clockFrequency) ? `${eng.clockFrequency} Hz` : 'MAX'} · ${fmtTime(eng.simTime)}`, x + 10, y + 55);

      ctx.fillStyle = THEME.muted;
      ctx.fillText(`ÚROVEŇ ${level?.level || hierarchyStack?.length || 1}`, x + 200, y + 38);
      ctx.fillText('LIST 1/1', x + 200, y + 55);

      ctx.restore();
    }

    function roundRect(ctx, x, y, width, height, radius = 5) {
      if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
      }
      ctx.beginPath();
      ctx.moveTo(x + radius.tl, y);
      ctx.lineTo(x + width - radius.tr, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
      ctx.lineTo(x + width, y + height - radius.br);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
      ctx.lineTo(x + radius.bl, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
      ctx.lineTo(x, y + radius.tl);
      ctx.quadraticCurveTo(x, y, x + radius.tl, y);
      ctx.closePath();
    }
    return { drawRealisticHardwarePCB, drawSchematicComponent, drawSchematicTitleBlock };
  }, [engine, hierarchyStack, getDims, getPinPos, geomOf]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const layout = freshLayout();
    const schematic = displayMode === 'schematic';
    const z = viewState.zoom;
    const comps = [...engine.components.values()];
    const board = schematic ? null : boardKindOf(comps); // 'nv1' karta | 'mypc' deska B360-PLUS
    const hasCard = board === 'nv1';

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = schematic ? THEME.bg : '#020302';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(viewState.x, viewState.y);
    ctx.scale(z, z);

    // Mřížka: tečky + křížky po pěti (schéma), na DPS jen řídké tečky pracovní podložky
    const step = schematic ? 24 : 40;
    const startX = Math.floor((-viewState.x / z) / step) * step - step;
    const endX = (width - viewState.x) / z + step * 2;
    const startY = Math.floor((-viewState.y / z) / step) * step - step;
    const endY = (height - viewState.y) / z + step * 2;
    ctx.fillStyle = schematic ? THEME.grid : 'rgba(113, 117, 121, 0.14)';
    for (let x = startX; x < endX; x += step) {
      for (let y = startY; y < endY; y += step) ctx.fillRect(x - 0.6 / z, y - 0.6 / z, 1.2 / z, 1.2 / z);
    }
    if (schematic) {
      ctx.strokeStyle = THEME.gridMajor;
      ctx.lineWidth = 1 / z;
      const major = step * 5;
      ctx.beginPath();
      for (let x = Math.floor(startX / major) * major; x < endX; x += major) {
        for (let y = Math.floor(startY / major) * major; y < endY; y += major) {
          ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
          ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
        }
      }
      ctx.stroke();
    }

    if (hasCard) drawCard(ctx);
    else if (board === 'mypc') drawMyPcBoard(ctx);

    // Spoje: ve schématu pravoúhle, na kartě měděné cesty (sběrnice tlustší), mimo kartu kabely
    const card = NV1_CARD;
    const cardBottom = card.y + card.h + card.tab.h;
    const cables = [];
    const drawWire = (wd) => {
      const { pts, st, bus, cable } = wd;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (cable) {
        ctx.strokeStyle = '#1E1F23';
        ctx.lineWidth = bus ? 6 : 4.5;
        tracePolyline(ctx, pts, 16, true);
        ctx.stroke();
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.2;
        if (st.dash) ctx.setLineDash(st.dash);
        tracePolyline(ctx, pts, 16, true);
        ctx.stroke();
      } else {
        ctx.strokeStyle = st.color;
        ctx.lineWidth = schematic ? (bus ? 2.6 : 1.3) : bus ? 3 : 1.3;
        if (st.dash) ctx.setLineDash(st.dash);
        tracePolyline(ctx, pts, schematic ? 0 : 5);
        ctx.stroke();
        if (schematic) {
          ctx.fillStyle = st.color;
          for (const p of [pts[0], pts[pts.length - 1]]) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.restore();
    };

    // Popisky sítí: jednou na síť, hned u pinu zdroje (sběrnice = název / šířka, analog = napětí, krystal = kmitočet)
    const netLabels = new Map();
    const labelFor = (st, bus, width, label) => {
      if (st.state === 'analog') return (schematic ? z >= 0.6 : z >= 1.4) ? st.text : null;
      if (st.state === 'clock') return schematic && z >= 0.6 ? st.text : null;
      if (bus) return (schematic ? z >= 0.6 : z >= 2.4) ? label || `${width} b` : null;
      return null;
    };
    const drawNetLabel = ({ p, text, st }) => {
      ctx.save();
      ctx.font = `700 ${schematic ? 8 : 6}px ${THEME.mono}`;
      const tw = ctx.measureText(text).width;
      const tx = p.side === 'L' ? p.x - tw - 8 : p.x + 8;
      const ty = p.side === 'T' ? p.y - 8 : p.side === 'B' ? p.y + 12 : p.y - 3;
      ctx.fillStyle = schematic ? THEME.bg : 'rgba(1,1,2,0.75)';
      ctx.fillRect(tx - 2, ty - 7, tw + 4, 9);
      ctx.fillStyle = st.state === 'low' || st.state === 'z' ? THEME.label : st.state === 'x' ? THEME.conflict : THEME.high;
      ctx.fillText(text, tx, ty);
      ctx.restore();
    };

    const routes = board ? pcbRoutes(engine, (c) => layout.geom(c, primitiveSchematicPin), getPinPos, board === 'mypc' ? myPcBoard() : undefined) : null;

    for (const wire of engine.wires) {
      const a = engine.components.get(wire.from.id);
      const b = engine.components.get(wire.to.id);
      if (!a || !b) continue;
      const pa = getPinPos(a, wire.from.pin, true);
      const pb = getPinPos(b, wire.to.pin, false);
      const value = engine.wireValue(wire);
      const width = engine.wireWidth(wire);
      const label = engine.wireLabel(wire);
      const net = Math.max(0, engine.netIndexOf(wire.from.id, wire.from.pin));
      const lane = (((net * 7) % 11) - 5) * (schematic ? 4 : 2.5);
      const cable = !schematic && (isOffBoard(a) || isOffBoard(b));
      let pts;
      if (cable && hasCard && Math.min(pa.x, pb.x) < card.x && Math.max(pa.x, pb.x) > card.x + card.w) {
        // kabel z bracketu k zařízení na druhé straně: obejde kartu shora nebo zdola
        const dev = isOffBoard(a) ? pa : pb;
        const above = dev.y < card.y + card.h / 2;
        pts = routeAround(pa, pb, above ? card.y - 26 : cardBottom + 22);
      } else {
        pts = (!cable && routes?.get(wire.id)) || routeOrtho(pa, pb, cable ? 0 : lane, schematic ? 10 : cable ? 20 : 6);
      }
      const st = signalStyle(value, width, label, schematic ? THEME.lowRgb : THEME.copperRgb);
      const wd = { pts, st, bus: width > 1, width, cable, label };
      const text = labelFor(st, width > 1, width, label);
      if (text && !netLabels.has(net)) netLabels.set(net, { p: pa, text, st });
      if (cable) cables.push(wd); else drawWire(wd);
    }

    // Wiring Preview
    if (wiringFrom) {
      const fromComp = engine.components.get(wiringFrom.id);
      if (fromComp) {
        const fromPos = getPinPos(fromComp, wiringFrom.pin, wiringFrom.isOutput);
        const curPos = { x: (mousePos.x - viewState.x) / z, y: (mousePos.y - viewState.y) / z, side: 'L' };
        ctx.save();
        ctx.strokeStyle = THEME.high;
        ctx.lineWidth = 1.6 / z;
        ctx.setLineDash([4, 4]);
        tracePolyline(ctx, routeOrtho(fromPos, curPos, 0, 8));
        ctx.stroke();
        ctx.restore();
      }
    }

    netLabels.forEach(drawNetLabel);

    // Součástky (zařízení mimo kartu až nad kabely)
    const drawComp = (comp) => {
      const isSelected = comp.id === selectedComponentId;
      if (isBoxPart(comp, displayMode)) {
        const g = layout.geom(comp, primitiveSchematicPin);
        if (schematic) drawSchematicDevice(ctx, comp, g, engine, { selected: isSelected });
        else drawPcbPart(ctx, comp, g, engine, { selected: isSelected });
      } else if (schematic) {
        const p = viewPos(comp, 'schematic');
        painters.drawSchematicComponent(ctx, p.x === comp.x && p.y === comp.y ? comp : { ...comp, x: p.x, y: p.y }, isSelected);
      } else {
        painters.drawRealisticHardwarePCB(ctx, comp, isSelected);
      }
    };
    for (const comp of comps) if (schematic || (!isOffBoard(comp) && !(board === 'mypc' && comp.type === 'MYPC_BOARD'))) drawComp(comp); // deska B360 = podklad
    cables.forEach(drawWire);
    if (!schematic) for (const comp of comps) if (isOffBoard(comp)) drawComp(comp);

    ctx.restore();

    // Rohové razítko schématu
    if (schematic) painters.drawSchematicTitleBlock(ctx, width, height, engine);
    ctx.restore();
  }, [engine, viewState, wiringFrom, mousePos, selectedComponentId, displayMode, freshLayout, getPinPos, painters]);

  // Animation Loop
  useEffect(() => {
    let active = true;
    const loop = () => {
      renderCanvas();
      if (active) animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderCanvas]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        renderCanvas();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);


  // ==========================================
  // MOUSE & INTERACTION HANDLERS (With Drag & Drop)
  // ==========================================
  const toWorld = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { cx: (e.clientX - rect.left - viewState.x) / viewState.zoom, cy: (e.clientY - rect.top - viewState.y) / viewState.zoom };
  };

  // Součástky v pořadí shora dolů (na DPS jsou zařízení mimo kartu kreslena navrch)
  const topDown = (layout) => {
    const list = [...engine.components.values()];
    const order = displayMode === 'hardware' ? [...list.filter((c) => !isOffBoard(c)), ...list.filter(isOffBoard)] : list;
    return order.reverse().map((comp) => ({ comp, g: layout.geom(comp, primitiveSchematicPin) }));
  };

  const handleMouseDown = (e) => {
    // Middle click or Alt + drag = Pan Canvas
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
      return;
    }

    const { cx, cy } = toWorld(e);
    const items = topDown(freshLayout());
    const inside = (g) => cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;

    // Tlačítka ovladače Saturn: klik přepne stisk
    for (const { comp, g } of items) {
      if (comp.type !== 'SATURN_PAD' || !inside(g)) continue;
      const btn = padButtons(liveRect(comp, g, displayMode)).find((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
      if (btn) {
        comp.buttons = { ...(comp.buttons || {}), [btn.name]: !comp.buttons?.[btn.name] };
        audioEngine.playRelayClick(comp.buttons[btn.name] ? 1.3 : 0.9);
        engine.propagate();
        engine.notify();
        return;
      }
    }

    // Piny: začít / dokončit drát
    const hitR = Math.max(5, 8 / Math.max(0.6, viewState.zoom));
    for (const { comp, g } of items) {
      for (const [pin, p] of g.pins) {
        if (Math.hypot(cx - p.x, cy - p.y) >= hitR) continue;
        if (wiringFrom) {
          if (wiringFrom.id === comp.id && wiringFrom.pin === pin) continue;
          engine.addWire(wiringFrom.id, wiringFrom.pin, comp.id, pin);
          setWiringFrom(null);
          audioEngine.playRelayClick(0.9);
          return;
        }
        setWiringFrom({ id: comp.id, pin, isOutput: pin in (comp.outputs || {}) });
        audioEngine.playRelayClick(1.2);
        return;
      }
    }

    // Tělo součástky: výběr a začátek tažení
    for (const { comp, g } of items) {
      if (!inside(g)) continue;
      onSelectComponent(comp.id);
      if (comp.type === 'INPUT' && !(comp.outputs.out > 1)) { // hodnotu sběrnice klik nepřepíše na 1
        comp.outputs.out = comp.outputs.out === 1 ? 0 : 1;
        audioEngine.playRelayClick(comp.outputs.out === 1 ? 1.4 : 0.8);
        engine.propagate();
        engine.notify();
      } else if (comp.type === 'CLOCK') {
        engine.stepClock();
        audioEngine.playRelayClick(1.1);
      } else if (comp.type === 'PROBE') {
        // klik na sondu přepíná zobrazení hodnoty: DEC → HEX → BIN → ASCII
        comp.format = PROBE_FORMATS[(PROBE_FORMATS.indexOf(comp.format || 'DEC') + 1) % PROBE_FORMATS.length];
        engine.notify();
      } else if (typeof comp.knob === 'number') {
        // otočný knoflík (regulátor ventilátorů): klik = o 10 % víc, po 100 % zpět na 0 %
        comp.knob = comp.knob >= 100 ? 0 : Math.min(100, comp.knob + 10);
        audioEngine.playRelayClick(1.0);
        engine.propagate();
        engine.notify();
      }
      setDraggingCompId(comp.id);
      setDragOffset({ x: cx - g.x, y: cy - g.y });
      return;
    }

    if (wiringFrom) {
      setWiringFrom(null);
    } else {
      // Empty area click -> Deselect and Pan
      onSelectComponent(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    }
  };

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const { cx, cy } = toWorld(e);

    // Tažení mění polohu jen v aktuálním pohledu (schéma: sx/sy, DPS: x/y)
    if (draggingCompId) {
      const comp = engine.components.get(draggingCompId);
      if (comp) {
        const snap = displayMode === 'hardware' && isDevice(comp) ? 1 : 8;
        setViewPos(comp, displayMode, Math.round((cx - dragOffset.x) / snap) * snap, Math.round((cy - dragOffset.y) / snap) * snap);
        engine.notify();
      }
      return;
    }

    if (isPanning) {
      setViewState((prev) => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
  };

  // Zoom ke kurzoru (nativní posluchač s passive: false, jinak nejde zastavit posun stránky)
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setViewState((prev) => {
      const zoom = Math.max(0.2, Math.min(4, prev.zoom * zoomFactor));
      const k = zoom / prev.zoom;
      return { zoom, x: mx - (mx - prev.x) * k, y: my - (my - prev.y) * k };
    });
  };

  const wheelRef = useRef(null);
  useEffect(() => { wheelRef.current = handleWheel; }); // vždy nejnovější handler pro nativní posluchač
  useEffect(() => {
    const canvas = canvasRef.current;
    const onWheel = (e) => wheelRef.current(e);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Jen pro vývoj: skryté snímání (tools/shot.cjs) potřebuje najít součástku na plátně podle id
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__slsCanvas = {
      screenOf: (id) => {
        const c = engine.components.get(id);
        if (!c) return null;
        const g = freshLayout().geom(c, primitiveSchematicPin);
        const r = canvasRef.current.getBoundingClientRect();
        return { x: r.left + viewState.x + (g.x + g.w / 2) * viewState.zoom, y: r.top + viewState.y + (g.y + g.h / 2) * viewState.zoom };
      },
      ids: () => [...engine.components.values()].map((c) => `${c.id}:${c.type}`),
      // střed tlačítka ovladače Saturn na obrazovce (test klikání)
      padButton: (id, name) => {
        const c = engine.components.get(id);
        const g = freshLayout().geom(c, primitiveSchematicPin);
        const b = padButtons(liveRect(c, g, displayMode)).find((q) => q.name === name);
        const r = canvasRef.current.getBoundingClientRect();
        return b && { x: r.left + viewState.x + (b.x + b.w / 2) * viewState.zoom, y: r.top + viewState.y + (b.y + b.h / 2) * viewState.zoom };
      },
      buttons: (id) => ({ ...engine.components.get(id)?.buttons }),
      count: () => engine.components.size,
    };
  });

  // Double-Click to drill down into internal subcircuit schematic
  const handleDoubleClick = (e) => {
    const { cx, cy } = toWorld(e);
    const hit = topDown(freshLayout()).find(({ g }) => cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h);
    if (hit && onDrillDown) onDrillDown(hit.comp);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-(--bg-dark)">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Hierarchical Drill-Down Breadcrumb Navigation Bar */}
      {hierarchyStack && hierarchyStack.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto">
          <div className="flex items-stretch bg-(--bg-dark) border border-gray-700 font-mono text-[11px] uppercase tracking-[0.1em]">
            {/* Level Up Button */}
            <button
              onClick={() => onNavigateUp()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-(--accent-amber) text-(--bg-dark) font-bold hover:bg-cyan-300 transition-colors"
              title="Přejít o úroveň výš (Backspace / Esc)"
            >
              <span>←</span>
              <span>ZPĚT</span>
            </button>

            {/* Breadcrumb Path Trail */}
            <div className="flex items-center gap-1 px-2 overflow-x-auto max-w-[650px] scrollbar-none">
              {hierarchyStack.map((lvl, idx) => {
                const isCurrent = idx === hierarchyStack.length - 1;
                return (
                  <React.Fragment key={lvl.id + '-' + idx}>
                    {idx > 0 && <span className="text-gray-600 select-none">/</span>}
                    <button
                      onClick={() => onNavigateUp(idx)}
                      disabled={isCurrent}
                      className={`px-1.5 py-1 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                        isCurrent ? 'text-(--text-light) font-bold cursor-default!' : 'text-gray-500 hover:text-(--accent-amber)'
                      }`}
                    >
                      <span className={isCurrent ? 'text-(--accent-amber)' : 'text-gray-600'}>L{lvl.level || idx + 1}:</span>
                      <span>{lvl.title.length > 25 ? lvl.title.slice(0, 23) + '…' : lvl.title}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Depth Badge */}
            <span className="flex items-center px-3 border-l border-(--line) text-gray-500 whitespace-nowrap">
              ÚROVEŇ&nbsp;<b className="text-(--accent-amber)">{hierarchyStack[hierarchyStack.length - 1].level || hierarchyStack.length}</b>&nbsp;/ 11
            </span>
          </div>

          {/* Subtitle / Micro-Architecture Formula Banner */}
          {hierarchyStack[hierarchyStack.length - 1].subtitle && (
            <div className="mt-1.5 px-3 py-1 bg-(--bg-dark)/90 border border-(--line) flex items-baseline gap-2">
              <span className="serif-accent text-[13px]">{hierarchyStack[hierarchyStack.length - 1].subtitle}</span>
              <span className="meta text-[9px]">dvojklik = hlouběji</span>
            </div>
          )}
        </div>
      )}

      {/* HUD Telemetry Overlay */}
      <div className="meta absolute top-3 left-3 flex items-stretch border border-(--line) bg-(--bg-dark)/85 divide-x divide-(--line)">
        <span className="px-2.5 py-1 text-(--accent-amber)">
          {displayMode === 'hardware' ? 'PCB' : displayMode}
        </span>
        <span className="px-2.5 py-1">ZOOM {Math.round(viewState.zoom * 100)}%</span>
        <button onClick={fitView} className="meta px-2.5 py-1 hover:text-(--accent-amber)" title="Zobrazit celý obvod">
          CELÝ OBVOD
        </button>
      </div>
    </div>
  );
}
