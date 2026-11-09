import React, { useRef, useEffect, useState, useCallback } from 'react';
import { audioEngine } from '../engine/audioEngine';
import { WireState } from '../engine/logicEngine';

const CHIP_PROFILES = {
  AND: { code: 'SN74LS08N', desc: 'QUAD 2-INPUT AND GATE', family: 'FAST-TTL', mfr: 'TI' },
  OR: { code: 'SN74LS32N', desc: 'QUAD 2-INPUT OR GATE', family: 'FAST-TTL', mfr: 'TI' },
  XOR: { code: 'SN74LS86N', desc: 'QUAD 2-INPUT XOR GATE', family: 'FAST-TTL', mfr: 'TI' },
  NOT: { code: 'SN74LS04N', desc: 'HEX INVERTER', family: 'FAST-TTL', mfr: 'TI' },
  NAND: { code: 'SN74LS00N', desc: 'QUAD 2-IN NAND GATE', family: 'FAST-TTL', mfr: 'TI' },
  NOR: { code: 'SN74LS02N', desc: 'QUAD 2-IN NOR GATE', family: 'FAST-TTL', mfr: 'TI' },
  D_FF: { code: 'SN74LS74AN', desc: 'DUAL D-TYPE FLIP-FLOP', family: 'SCHOTTKY', mfr: 'TI' },
  REGISTER_8BIT: { code: 'SN74LS374N', desc: '8-BIT OCTAL D-REG', family: 'SCHOTTKY', mfr: 'TI' },
  RAM: { code: 'HM62256BLP', desc: '32K×8 HIGH-SPEED SRAM', family: 'HITACHI', mfr: 'HITACHI' },
  ROM: { code: 'AT28C64B', desc: '64K PARALLEL EEPROM', family: 'ATMEL', mfr: 'ATMEL' },
  MUX: { code: 'SN74LS157N', desc: 'QUAD 2-TO-1 MUX', family: 'FAST-TTL', mfr: 'TI' },
  TRI_STATE: { code: 'SN74LS244N', desc: 'OCTAL BUS BUFFER', family: 'BUS-DRV', mfr: 'TI' },
  PROBE: { code: 'DM7447A', desc: 'DIGITAL LOGIC PROBE', family: 'INDICATOR', mfr: 'NSC' },
};

export function LogicCanvas({
  engine,
  onSelectComponent,
  selectedComponentId,
  displayMode = 'schematic', // 'schematic' | 'hardware'
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
  const animTimeRef = useRef(0);

  // Dimensions helper
  const getDims = useCallback((comp) => {
    if (displayMode === 'schematic') {
      if (comp.type === 'VIRTUAL_SCREEN') return { w: 180, h: 190 };
      if (comp.type === 'INPUT') return { w: 90, h: 56 };
      if (comp.type === 'CLOCK') return { w: 96, h: 56 };
      if (comp.type === 'PROBE') return { w: 84, h: 50 };
      if (comp.type === 'NOT') return { w: 70, h: 44 };
      if (comp.type === 'AND' || comp.type === 'NAND') return { w: 84, h: 56 };
      if (comp.type === 'OR' || comp.type === 'NOR') return { w: 88, h: 56 };
      if (comp.type === 'XOR') return { w: 94, h: 56 };
      if (comp.type === 'D_FF') return { w: 86, h: 74 };
      if (comp.type === 'MUX') return { w: 78, h: 70 };
      if (['RAM', 'ROM', 'REGISTER_8BIT'].includes(comp.type)) return { w: 140, h: 96 };
      return { w: 90, h: 60 };
    } else {
      // Hardware PCB IC dimensions
      if (comp.type === 'VIRTUAL_SCREEN') return { w: 190, h: 200 };
      if (comp.type === 'INPUT') return { w: 110, h: 94 };
      if (comp.type === 'CLOCK') return { w: 130, h: 84 };
      if (comp.type === 'PROBE') return { w: 110, h: 78 };
      if (['RAM', 'ROM', 'REGISTER_8BIT'].includes(comp.type)) return { w: 174, h: 126 };
      return { w: 154, h: 90 };
    }
  }, [displayMode]);

  // Precise Pin Coordinates
  const getPinPos = useCallback((comp, pinName, isOutput) => {
    const { w, h } = getDims(comp);

    if (displayMode === 'schematic') {
      if (comp.type === 'AND' || comp.type === 'NAND' || comp.type === 'OR' || comp.type === 'NOR' || comp.type === 'XOR') {
        if (!isOutput) {
          const y = pinName === 'a' ? comp.y + 16 : comp.y + 40;
          return { x: comp.x, y };
        }
        return { x: comp.x + w, y: comp.y + 28 };
      }
      if (comp.type === 'NOT') {
        if (!isOutput) return { x: comp.x, y: comp.y + 22 };
        return { x: comp.x + w, y: comp.y + 22 };
      }
      if (comp.type === 'D_FF') {
        if (!isOutput) {
          const y = pinName === 'd' ? comp.y + 20 : comp.y + 54;
          return { x: comp.x, y };
        }
        const y = pinName === 'q' ? comp.y + 20 : comp.y + 54;
        return { x: comp.x + w, y };
      }
      if (comp.type === 'INPUT' || comp.type === 'CLOCK') {
        return { x: comp.x + w, y: comp.y + h / 2 };
      }
      if (comp.type === 'PROBE') {
        return { x: comp.x, y: comp.y + h / 2 };
      }

      const pins = isOutput ? Object.keys(comp.outputs || {}) : Object.keys(comp.inputs || {});
      const idx = Math.max(0, pins.indexOf(pinName));
      const step = h / (pins.length + 1);
      return {
        x: isOutput ? comp.x + w : comp.x,
        y: comp.y + step * (idx + 1),
      };
    } else {
      // Hardware mode coordinates
      const pins = isOutput ? Object.keys(comp.outputs || {}) : Object.keys(comp.inputs || {});
      const idx = Math.max(0, pins.indexOf(pinName));
      const pinY = comp.y + 32 + idx * 17;
      const pinX = isOutput ? comp.x + w : comp.x;
      return { x: pinX, y: pinY };
    }
  }, [displayMode, getDims]);

  // Wire path helper
  const getWirePath = useCallback((from, to) => {
    if (displayMode === 'schematic') {
      const midX = from.x + (to.x - from.x) * 0.5;
      return {
        isOrthogonal: true,
        points: [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to],
      };
    } else {
      // Hardware PCB copper trace with rounded 45° elbows
      const dx = Math.abs(to.x - from.x) * 0.5;
      const cp1x = from.x + Math.max(dx, 35);
      const cp1y = from.y;
      const cp2x = to.x - Math.max(dx, 35);
      const cp2y = to.y;
      return {
        isOrthogonal: false,
        from,
        cp1: { x: cp1x, y: cp1y },
        cp2: { x: cp2x, y: cp2y },
        to,
      };
    }
  }, [displayMode]);

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
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const animTime = animTimeRef.current;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (displayMode === 'schematic') {
      // 1. Technical EDA Blueprint Background #060911
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(viewState.x, viewState.y);
      ctx.scale(viewState.zoom, viewState.zoom);

      // Dot Grid
      const dotSpacing = 24;
      const startX = Math.floor((-viewState.x / viewState.zoom) / dotSpacing) * dotSpacing - dotSpacing;
      const endX = (width - viewState.x) / viewState.zoom + dotSpacing * 2;
      const startY = Math.floor((-viewState.y / viewState.zoom) / dotSpacing) * dotSpacing - dotSpacing;
      const endY = (height - viewState.y) / viewState.zoom + dotSpacing * 2;

      ctx.fillStyle = 'rgba(74, 95, 133, 0.28)';
      for (let x = startX; x < endX; x += dotSpacing) {
        for (let y = startY; y < endY; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.1 / viewState.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Crosshairs
      ctx.strokeStyle = 'rgba(74, 95, 133, 0.18)';
      ctx.lineWidth = 1 / viewState.zoom;
      const majorStep = dotSpacing * 5;
      const majorStartX = Math.floor(startX / majorStep) * majorStep;
      const majorStartY = Math.floor(startY / majorStep) * majorStep;
      for (let x = majorStartX; x < endX; x += majorStep) {
        for (let y = majorStartY; y < endY; y += majorStep) {
          ctx.beginPath();
          ctx.moveTo(x - 4, y);
          ctx.lineTo(x + 4, y);
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x, y + 4);
          ctx.stroke();
        }
      }
    } else {
      // 1. Real Military-Grade FR-4 PCB Soldermask Background #070F0A
      ctx.fillStyle = '#070F0A';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(viewState.x, viewState.y);
      ctx.scale(viewState.zoom, viewState.zoom);

      // Embedded Under-Mask Copper Traces Texture
      const gridSize = 40;
      const startX = Math.floor((-viewState.x / viewState.zoom) / gridSize) * gridSize - gridSize;
      const endX = (width - viewState.x) / viewState.zoom + gridSize * 2;
      const startY = Math.floor((-viewState.y / viewState.zoom) / gridSize) * gridSize - gridSize;
      const endY = (height - viewState.y) / viewState.zoom + gridSize * 2;

      // Dark etched copper lines under matte green solder mask
      ctx.strokeStyle = 'rgba(18, 38, 24, 0.6)';
      ctx.lineWidth = 2.5 / viewState.zoom;
      ctx.beginPath();
      for (let x = startX; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // Gold ENIG Plated Micro-Vias with annular rings
      for (let x = startX; x < endX; x += gridSize * 3) {
        for (let y = startY; y < endY; y += gridSize * 3) {
          // Annular gold ring
          ctx.fillStyle = '#C59B27';
          ctx.beginPath();
          ctx.arc(x, y, 2.8, 0, Math.PI * 2);
          ctx.fill();
          // Drill hole
          ctx.fillStyle = '#040806';
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Render Wires / Traces
    for (let wIdx = 0; wIdx < engine.wires.length; wIdx++) {
      const wire = engine.wires[wIdx];
      const fromComp = engine.components.get(wire.from.id);
      const toComp = engine.components.get(wire.to.id);
      if (!fromComp || !toComp) continue;

      const fromPos = getPinPos(fromComp, wire.from.pin, true);
      const toPos = getPinPos(toComp, wire.to.pin, false);
      const val = fromComp.outputs[wire.from.pin];
      const path = getWirePath(fromPos, toPos);

      ctx.save();

      let mainColor = '#2A364F';
      let glowColor = 'transparent';

      if (val === 1) {
        mainColor = '#00F0FF';
        glowColor = 'rgba(0, 240, 255, 0.5)';
      } else if (val === WireState.HIGH_Z) {
        mainColor = '#F59E0B';
        glowColor = 'rgba(245, 158, 11, 0.3)';
      } else if (val === WireState.CONFLICT) {
        mainColor = '#EF4444';
        glowColor = 'rgba(239, 68, 68, 0.6)';
      }

      if (path.isOrthogonal) {
        // Schematic Wire
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.8 / viewState.zoom;
        if (val === WireState.HIGH_Z) ctx.setLineDash([4, 4]);

        if (glowColor !== 'transparent') {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8 / viewState.zoom;
        }

        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();

        // Junction Dots
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(fromPos.x, fromPos.y, 2.5 / viewState.zoom, 0, Math.PI * 2);
        ctx.arc(toPos.x, toPos.y, 2.5 / viewState.zoom, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Real PCB Copper Trace with Soldermask Glow
        if (val === 1) {
          // Copper Track Base
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.lineWidth = 5.5 / viewState.zoom;
          ctx.beginPath();
          ctx.moveTo(path.from.x, path.from.y);
          ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
          ctx.stroke();

          // Core Conductor Trace
          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = 8 / viewState.zoom;
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 2.4 / viewState.zoom;
          ctx.beginPath();
          ctx.moveTo(path.from.x, path.from.y);
          ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
          ctx.stroke();

          // Flowing Quantum Electrons
          const numParticles = 2;
          for (let p = 0; p < numParticles; p++) {
            const t = ((animTime * 0.0012 + (wIdx * 0.3) + (p / numParticles)) % 1);
            const u = 1 - t;
            const px = u*u*u*path.from.x + 3*u*u*t*path.cp1.x + 3*u*t*t*path.cp2.x + t*t*t*path.to.x;
            const py = u*u*u*path.from.y + 3*u*u*t*path.cp1.y + 3*u*t*t*path.cp2.y + t*t*t*path.to.y;

            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, 2.8 / viewState.zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Dark Inactive Copper Track on PCB
          ctx.strokeStyle = '#15241B';
          ctx.lineWidth = 3 / viewState.zoom;
          ctx.beginPath();
          ctx.moveTo(path.from.x, path.from.y);
          ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
          ctx.stroke();

          ctx.strokeStyle = '#233B2C';
          ctx.lineWidth = 1.4 / viewState.zoom;
          if (val === WireState.HIGH_Z) {
            ctx.strokeStyle = '#B45309';
            ctx.setLineDash([5, 4]);
          }
          ctx.beginPath();
          ctx.moveTo(path.from.x, path.from.y);
          ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Wiring Preview
    if (wiringFrom) {
      const fromComp = engine.components.get(wiringFrom.id);
      if (fromComp) {
        const fromPos = getPinPos(fromComp, wiringFrom.pin, wiringFrom.isOutput);
        const curPos = {
          x: (mousePos.x - viewState.x) / viewState.zoom,
          y: (mousePos.y - viewState.y) / viewState.zoom,
        };
        const path = getWirePath(fromPos, curPos);

        ctx.save();
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2 / viewState.zoom;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        if (path.isOrthogonal) {
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
        } else {
          ctx.moveTo(path.from.x, path.from.y);
          ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.to.x, path.to.y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Render Components
    for (const comp of engine.components.values()) {
      const isSelected = comp.id === selectedComponentId;
      if (displayMode === 'schematic') {
        drawSchematicComponent(ctx, comp, isSelected);
      } else {
        drawRealisticHardwarePCB(ctx, comp, isSelected, animTime);
      }
    }

    ctx.restore();

    // 4. Schematic Blueprint Legend in bottom-right corner
    if (displayMode === 'schematic') {
      drawSchematicTitleBlock(ctx, width, height, engine);
    }
  }, [engine, viewState, wiringFrom, mousePos, selectedComponentId, displayMode, getDims, getPinPos, getWirePath]);

  // Animation Loop
  useEffect(() => {
    let active = true;
    const loop = (time) => {
      animTimeRef.current = time;
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
  // ULTRA-REALISTIC HARDWARE PCB RENDERER
  // ==========================================
  function drawRealisticHardwarePCB(ctx, comp, isSelected, time) {
    const { w, h } = getDims(comp);
    ctx.save();

    // Solder Mask Component Silkscreen Outline (White Legend on PCB)
    ctx.strokeStyle = 'rgba(235, 240, 245, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(comp.x - 6, comp.y - 6, w + 12, h + 12);
    ctx.setLineDash([]);

    // Silkscreen Component Reference Name (e.g. U1, U2, SW1)
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '700 9px "JetBrains Mono", monospace';
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
      drawRealisticCRT(ctx, comp, w, h, isSelected, time);
      ctx.restore();
      return;
    }
    if (comp.type === 'PROBE') {
      drawRealisticProbe(ctx, comp, w, h, isSelected);
      ctx.restore();
      return;
    }

    // DIP Integrated Circuit Package (e.g. 74LS08, 74LS86, etc.)
    drawPhotorealisticDIPChip(ctx, comp, w, h, isSelected);
    ctx.restore();
  }

  function drawPhotorealisticDIPChip(ctx, comp, w, h, isSelected) {
    const meta = CHIP_PROFILES[comp.type] || { code: comp.type, desc: 'LOGIC IC', family: 'TTL', mfr: 'TI' };
    const temp = engine.thermalMap.get(comp.id) || 28.5;

    // 1. Draw Soldered Metallic Pins & Pads on PCB FIRST (behind chip body)
    drawPhotorealisticPadsAndLeads(ctx, comp, w, h);

    // 2. Heavy Drop Shadow under the IC Body
    ctx.shadowColor = isSelected ? 'rgba(0, 240, 255, 0.55)' : 'rgba(0, 0, 0, 0.9)';
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
    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2B3342';
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
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText(meta.code, comp.x + 22, comp.y + 24);

    ctx.fillStyle = '#718096';
    ctx.font = '600 8px "Outfit", sans-serif';
    ctx.fillText(`${meta.mfr} // ${meta.desc}`, comp.x + 22, comp.y + 38);

    ctx.fillStyle = '#4A5568';
    ctx.font = '500 7px "JetBrains Mono", monospace';
    ctx.fillText(`MALAYSIA 2442B // ${meta.family}`, comp.x + 22, comp.y + h - 14);

    // 9. Real-time Silicon Thermal Sensor Gauge
    const heatColor = temp > 75 ? '#FF003C' : temp > 45 ? '#FF8400' : '#10B981';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, comp.x + w - 48, comp.y + 8, 42, 14, 3);
    ctx.fill();
    ctx.fillStyle = heatColor;
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText(`${temp.toFixed(1)}°C`, comp.x + w - 44, comp.y + 18);
  }

  function drawPhotorealisticPadsAndLeads(ctx, comp, w, h) {
    const inPins = Object.keys(comp.inputs || {});
    inPins.forEach((pin, idx) => {
      const pinY = comp.y + 32 + idx * 17;
      const pinX = comp.x;
      drawSinglePCBPad(ctx, pinX, pinY, pin, false, comp.inputs[pin]);
    });

    const outPins = Object.keys(comp.outputs || {});
    outPins.forEach((pin, idx) => {
      const pinY = comp.y + 32 + idx * 17;
      const pinX = comp.x + w;
      drawSinglePCBPad(ctx, pinX, pinY, pin, true, comp.outputs[pin]);
    });
  }

  function drawSinglePCBPad(ctx, x, y, name, isOutput, value) {
    const isHigh = value === 1;

    ctx.save();

    // 1. Oval ENIG Gold Solder Pad on PCB
    ctx.fillStyle = isHigh ? 'rgba(0, 240, 255, 0.45)' : '#C59B27';
    ctx.beginPath();
    ctx.ellipse(x, y, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Shiny Solder Joint Meniscus (Tin-Lead alloy droplet)
    const solderGrad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 4);
    solderGrad.addColorStop(0, '#FFFFFF');
    solderGrad.addColorStop(0.4, isHigh ? '#00F0FF' : '#E2E8F0');
    solderGrad.addColorStop(0.8, isHigh ? '#00B4D8' : '#94A3B8');
    solderGrad.addColorStop(1, '#475569');
    ctx.fillStyle = solderGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Bent Metallic Alloy Lead (Stamping from chip body to pad)
    ctx.fillStyle = isHigh ? '#00F0FF' : '#CBD5E1';
    if (isHigh) {
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
    }
    const leadW = 7;
    const leadX = isOutput ? x - leadW : x;
    ctx.fillRect(leadX, y - 2, leadW, 4);

    ctx.restore();

    // 4. White Silkscreen Pin Label on Board
    ctx.fillStyle = isHigh ? '#00F0FF' : '#94A3B8';
    ctx.font = '600 8px "JetBrains Mono", monospace';
    const textW = ctx.measureText(name.toUpperCase()).width;
    ctx.fillText(name.toUpperCase(), isOutput ? x - textW - 12 : x + 12, y + 3);
  }

  function drawRealisticToggleSwitch(ctx, comp, w, h, isSelected) {
    const isOn = comp.outputs.out === 1;

    // Metal Base Plate
    ctx.fillStyle = '#0E121A';
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2A3446';
    ctx.lineWidth = 1.5;
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 9px "JetBrains Mono", monospace';
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
    ctx.shadowColor = isOn ? 'rgba(0, 240, 255, 0.8)' : 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = isOn ? 14 : 4;
    const leverGrad = ctx.createLinearGradient(cx - 10, handleY - 10, cx + 10, handleY + 10);
    leverGrad.addColorStop(0, '#FFFFFF');
    leverGrad.addColorStop(0.5, isOn ? '#38BDF8' : '#64748B');
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
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#00F0FF';
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
      ctx.strokeStyle = '#2A364F';
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = isOn ? '#00F0FF' : '#475569';
    ctx.font = '700 8px "JetBrains Mono", monospace';
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

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#E5E7EB';
    ctx.lineWidth = 1.5;
    roundRect(ctx, comp.x, comp.y, w, h, 12);
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('FOX 14.31818 MHz', comp.x + 14, comp.y + 28);
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillText('HC-49/U QUARTZ CRYSTAL', comp.x + 14, comp.y + 44);

    // Blinking Pulse LED
    const ledX = comp.x + w - 24;
    const ledY = comp.y + 32;
    if (isHigh) {
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#00F0FF';
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

  function drawRealisticCRT(ctx, comp, w, h, isSelected, time) {
    ctx.fillStyle = '#0E121A';
    roundRect(ctx, comp.x, comp.y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2A364F';
    roundRect(ctx, comp.x, comp.y, w, h, 8);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('VIRTUAL CRT-64 // DUAL-PORT', comp.x + 12, comp.y + 16);

    const scrX = comp.x + 12;
    const scrY = comp.y + 26;
    ctx.fillStyle = '#020406';
    roundRect(ctx, scrX, scrY, 128, 128, 4);
    ctx.fill();

    if (comp.vram) {
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const pixel = comp.vram[y * 64 + x];
          if (pixel) {
            const r = ((pixel >> 5) & 7) * 36;
            const g = ((pixel >> 2) & 7) * 36;
            const b = (pixel & 3) * 85;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(scrX + x * 2, scrY + y * 2, 2, 2);
          }
        }
      }
    }

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
    ctx.strokeStyle = isSelected ? '#00F0FF' : '#243042';
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.stroke();

    const val = comp.inputs.in;
    const strVal = val === WireState.HIGH_Z ? 'Z' : val !== undefined ? `${val}` : '-';

    ctx.fillStyle = '#030508';
    roundRect(ctx, comp.x + 30, comp.y + 24, 48, 38, 4);
    ctx.fill();

    ctx.fillStyle = val === 1 ? '#00F0FF' : '#475569';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(strVal, comp.x + 46, comp.y + 51);

    drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
  }

  // ==========================================
  // SCHEMATIC SYMBOL RENDERERS (IEEE/ANSI)
  // ==========================================
  function drawSchematicComponent(ctx, comp, isSelected) {
    const { w, h } = getDims(comp);
    ctx.save();

    const strokeColor = isSelected ? '#00F0FF' : '#5E7A9E';
    const fillColor = isSelected ? 'rgba(0, 240, 255, 0.08)' : 'rgba(10, 16, 26, 0.9)';
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

      ctx.fillStyle = isSelected ? '#00F0FF' : '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('&', x + 12, y + h / 2 + 4);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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
      ctx.fillStyle = '#060911';
      ctx.fill();
      ctx.stroke();

      drawSchematicLeads(ctx, comp, w, h, strokeColor);

      ctx.fillStyle = isSelected ? '#00F0FF' : '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('&', x + 10, y + h / 2 + 4);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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

      ctx.fillStyle = isSelected ? '#00F0FF' : '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('≥1', x + 18, y + h / 2 + 4);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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
      ctx.fillStyle = '#060911';
      ctx.fill();
      ctx.stroke();

      drawSchematicLeads(ctx, comp, w, h, strokeColor);

      ctx.fillStyle = isSelected ? '#00F0FF' : '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('≥1', x + 16, y + h / 2 + 4);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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

      ctx.fillStyle = isSelected ? '#00F0FF' : '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('=1', x + 18, y + h / 2 + 4);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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
      ctx.fillStyle = '#060911';
      ctx.fill();
      ctx.stroke();

      drawSchematicLeads(ctx, comp, w, h, strokeColor);

      ctx.fillStyle = isSelected ? '#00F0FF' : '#94A3B8';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('1', x + 8, y + h / 2 + 4);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('D', x + 6, y + 23);
      ctx.fillText('Q', x + sw - 14, y + 23);
      ctx.fillText('Q̄', x + sw - 14, y + 57);

      ctx.fillStyle = isSelected ? '#00F0FF' : '#64748B';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('D-FF', x + sw / 2 - 12, y + 38);
    } else if (comp.type === 'INPUT') {
      const isOn = comp.outputs.out === 1;
      const boxW = w - 16;
      ctx.save();
      ctx.fillStyle = isOn ? 'rgba(0, 240, 255, 0.15)' : '#0A0E17';
      ctx.strokeStyle = isOn ? '#00F0FF' : '#3B4B64';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(comp.x, comp.y, boxW, h);
      ctx.fillRect(comp.x, comp.y, boxW, h);

      ctx.fillStyle = isOn ? '#00F0FF' : '#64748B';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText(isOn ? 'SRC: HIGH' : 'SRC: LOW', comp.x + 8, comp.y + 16);

      ctx.fillStyle = isOn ? '#00F0FF' : '#E2E8F0';
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.fillText(isOn ? '1' : '0', comp.x + 18, comp.y + 42);

      ctx.strokeStyle = isOn ? '#00F0FF' : '#3B4B64';
      ctx.beginPath();
      ctx.moveTo(comp.x + boxW, comp.y + h / 2);
      ctx.lineTo(comp.x + w, comp.y + h / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(comp.x + w, comp.y + h / 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isOn ? '#00F0FF' : '#3B4B64';
      ctx.fill();
      ctx.restore();
    } else if (comp.type === 'CLOCK') {
      const isHigh = comp.outputs.out === 1;
      const boxW = w - 16;
      ctx.strokeRect(comp.x, comp.y, boxW, h);
      ctx.fillRect(comp.x, comp.y, boxW, h);

      ctx.strokeStyle = isHigh ? '#00F0FF' : '#64748B';
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

      ctx.fillStyle = '#64748B';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText('CLK GEN', comp.x + 8, comp.y + 14);

      ctx.strokeStyle = isHigh ? '#00F0FF' : '#3B4B64';
      ctx.beginPath();
      ctx.moveTo(comp.x + boxW, comp.y + h / 2);
      ctx.lineTo(comp.x + w, comp.y + h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(comp.x + w, comp.y + h / 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isHigh ? '#00F0FF' : '#3B4B64';
      ctx.fill();
    } else if (comp.type === 'PROBE') {
      const val = comp.inputs.in;
      const str = val === WireState.HIGH_Z ? 'Z' : val !== undefined ? `${val}` : '-';
      const isHigh = val === 1;

      const cx = comp.x + w / 2;
      const cy = comp.y + h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#060911';
      ctx.fill();
      ctx.strokeStyle = isHigh ? '#00F0FF' : '#5E7A9E';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(comp.x, cy);
      ctx.lineTo(cx - 18, cy);
      ctx.stroke();

      ctx.fillStyle = isHigh ? '#00F0FF' : '#CBD5E1';
      ctx.font = '700 16px "JetBrains Mono", monospace';
      ctx.fillText(str, cx - 5, cy + 5);

      ctx.fillStyle = '#64748B';
      ctx.font = '700 7px "JetBrains Mono", monospace';
      ctx.fillText('PROBE', comp.x + 4, comp.y + 8);
    } else if (comp.type === 'VIRTUAL_SCREEN') {
      ctx.strokeRect(comp.x, comp.y, w, h);
      ctx.fillRect(comp.x, comp.y, w, h);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('GPU DISPLAY // 64x64', comp.x + 10, comp.y + 16);

      const scrX = comp.x + 12;
      const scrY = comp.y + 24;
      ctx.fillStyle = '#000000';
      ctx.fillRect(scrX, scrY, 128, 128);

      if (comp.vram) {
        for (let y = 0; y < 64; y++) {
          for (let x = 0; x < 64; x++) {
            const pixel = comp.vram[y * 64 + x];
            if (pixel) {
              const r = ((pixel >> 5) & 7) * 36;
              const g = ((pixel >> 2) & 7) * 36;
              const b = (pixel & 3) * 85;
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillRect(scrX + x * 2, scrY + y * 2, 2, 2);
            }
          }
        }
      }

      drawSchematicLeads(ctx, comp, w, h, strokeColor);
    } else {
      ctx.strokeRect(comp.x, comp.y, w, h);
      ctx.fillRect(comp.x, comp.y, w, h);

      ctx.fillStyle = isSelected ? '#00F0FF' : '#CBD5E1';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillText((comp.label || comp.type).toUpperCase(), comp.x + 10, comp.y + 18);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
      ctx.fillText('EDA MODULE', comp.x + 10, comp.y + 30);

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
      ctx.strokeStyle = isHigh ? '#00F0FF' : strokeColor;
      ctx.lineWidth = 1.5;

      ctx.fillStyle = isHigh ? '#00F0FF' : '#060911';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHigh ? '#00F0FF' : '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
      ctx.fillText(pin.toUpperCase(), pos.x + 6, pos.y + 3);
      ctx.restore();
    });

    const outPins = Object.keys(comp.outputs || {});
    outPins.forEach((pin) => {
      const pos = getPinPos(comp, pin, true);
      const isHigh = comp.outputs[pin] === 1;

      ctx.save();
      ctx.strokeStyle = isHigh ? '#00F0FF' : strokeColor;
      ctx.lineWidth = 1.5;

      ctx.fillStyle = isHigh ? '#00F0FF' : '#060911';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHigh ? '#00F0FF' : '#64748B';
      ctx.font = '600 8px "JetBrains Mono", monospace';
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
    ctx.fillStyle = 'rgba(6, 9, 17, 0.94)';
    ctx.strokeStyle = '#2A364F';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.beginPath();
    ctx.moveTo(x, y + 22);
    ctx.lineTo(x + boxW, y + 22);
    ctx.moveTo(x + 170, y + 22);
    ctx.lineTo(x + 170, y + boxH);
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('SILICON STUDIO // IEEE SCHEMATIC', x + 10, y + 15);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillText('TITLE: RISC HARVARD ALU & GPU', x + 10, y + 36);
    ctx.fillText(`CLK: ${eng.clockFrequency} Hz | TICKS: ${eng.tickCount}`, x + 10, y + 52);

    ctx.fillStyle = '#64748B';
    ctx.fillText('REV: B2.4', x + 180, y + 36);
    ctx.fillText('SHEET: 1/1', x + 180, y + 52);

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

  // ==========================================
  // MOUSE & INTERACTION HANDLERS (With Drag & Drop)
  // ==========================================
  const handleMouseDown = (e) => {
    // Middle click or Alt + drag = Pan Canvas
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left - viewState.x) / viewState.zoom;
    const cy = (e.clientY - rect.top - viewState.y) / viewState.zoom;

    // Check clicking pins or components
    for (const comp of Array.from(engine.components.values()).reverse()) {
      const { w, h } = getDims(comp);

      // Output pins (start wiring)
      const outPins = Object.keys(comp.outputs || {});
      for (let idx = 0; idx < outPins.length; idx++) {
        const pin = outPins[idx];
        const pos = getPinPos(comp, pin, true);
        if (Math.hypot(cx - pos.x, cy - pos.y) < 11) {
          setWiringFrom({ id: comp.id, pin, isOutput: true });
          audioEngine.playRelayClick(1.2);
          return;
        }
      }

      // Input pins (complete wiring)
      if (wiringFrom) {
        const inPins = Object.keys(comp.inputs || {});
        for (let idx = 0; idx < inPins.length; idx++) {
          const pin = inPins[idx];
          const pos = getPinPos(comp, pin, false);
          if (Math.hypot(cx - pos.x, cy - pos.y) < 11) {
            engine.addWire(wiringFrom.id, wiringFrom.pin, comp.id, pin);
            setWiringFrom(null);
            audioEngine.playRelayClick(0.9);
            return;
          }
        }
      }

      // Component body click -> Select & Begin Dragging
      if (cx >= comp.x && cx <= comp.x + w && cy >= comp.y && cy <= comp.y + h) {
        onSelectComponent(comp.id);

        if (comp.type === 'INPUT') {
          // Toggle input if clicked on the switch toggle zone
          comp.outputs.out = comp.outputs.out === 1 ? 0 : 1;
          audioEngine.playRelayClick(comp.outputs.out === 1 ? 1.4 : 0.8);
          engine.propagate();
          engine.notify();
        } else if (comp.type === 'CLOCK') {
          engine.stepClock();
          audioEngine.playRelayClick(1.1);
        }

        // Start Dragging Component
        setDraggingCompId(comp.id);
        setDragOffset({ x: cx - comp.x, y: cy - comp.y });
        return;
      }
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

    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left - viewState.x) / viewState.zoom;
    const cy = (e.clientY - rect.top - viewState.y) / viewState.zoom;

    // If Dragging a Component
    if (draggingCompId) {
      const comp = engine.components.get(draggingCompId);
      if (comp) {
        // Snap to 8px grid
        comp.x = Math.round((cx - dragOffset.x) / 8) * 8;
        comp.y = Math.round((cy - dragOffset.y) / 8) * 8;
        engine.notify();
      }
      return;
    }

    // If Panning Canvas
    if (isPanning) {
      setViewState((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setViewState((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(2.5, prev.zoom * zoomFactor)),
    }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#060911]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />
      {/* HUD Telemetry Overlay */}
      <div className="absolute top-4 left-4 flex items-center space-x-2.5 pointer-events-none text-xs font-mono">
        <span className="bg-[#0A0E1A]/85 border border-[#1E2638] px-3 py-1.5 rounded text-cyan-400 font-semibold shadow-2xl backdrop-blur-md flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>VIEW: {displayMode.toUpperCase()}</span>
        </span>
        <span className="bg-[#0A0E1A]/85 border border-[#1E2638] px-2.5 py-1.5 rounded text-gray-400 shadow-2xl backdrop-blur-md">
          ZOOM {Math.round(viewState.zoom * 100)}%
        </span>
        <span className="bg-[#0A0E1A]/85 border border-[#1E2638] px-2.5 py-1.5 rounded text-gray-400 shadow-2xl backdrop-blur-md">
          CLK: {engine.clockFrequency} Hz
        </span>
      </div>
    </div>
  );
}
