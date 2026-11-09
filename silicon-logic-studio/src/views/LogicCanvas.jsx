import React, { useRef, useEffect, useState, useCallback } from 'react';
import { audioEngine } from '../engine/audioEngine';
import { WireState } from '../engine/logicEngine';
import { componentDims, hardwarePinPos, NV1_CARD, nv1CardOutline, crystalFrequency } from '../engine/boardLayout';

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
  NV1_CORE: { code: 'STG2000X', desc: 'NVIDIA NV1 3D MULTIMEDIA', family: '0.5um-CMOS', mfr: 'SGS/NVIDIA' },
  VRAM_BANK: { code: 'TC51V16160FT', desc: '16Mb EDO DRAM 60ns', family: 'DRAM', mfr: 'TOSHIBA' },
  RAMDAC: { code: 'ATT20C409', desc: '135MHz TrueColor DAC', family: 'BiCMOS', mfr: 'AT&T/NV' },
  AUDIO_DSP: { code: 'STG-AUDIO', desc: '32-VOICE WAVETABLE DSP', family: 'AUDIO-DSP', mfr: 'SGS-THOMSON' },
  PCI_BUS: { code: 'PCI-32', desc: '32-BIT 33MHz HOST BUS', family: 'PCI 2.1', mfr: 'PCI-SIG' },
  VGA_BRACKET: { code: 'BRACKET-IO', desc: 'VGA DB15+AUDIO+SATURN', family: 'METAL-IO', mfr: 'DIAMOND' },
  SATURN_PAD: { code: 'SATURN-DB9', desc: 'SEGA GAMEPAD INTERFACE', family: 'GAMEPAD', mfr: 'SEGA' },
};

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
  const animTimeRef = useRef(0);

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

  // Reset view centering when hierarchyStack depth changes
  const prevStackLenRef = useRef(hierarchyStack ? hierarchyStack.length : 1);
  useEffect(() => {
    const currentLen = hierarchyStack ? hierarchyStack.length : 1;
    if (currentLen !== prevStackLenRef.current) {
      prevStackLenRef.current = currentLen;
      setViewState({ x: 90, y: 80, zoom: 0.95 });
    }
  }, [hierarchyStack]);

  // Dimensions helper (shared with the 3D view)
  const getDims = useCallback((comp) => componentDims(comp, displayMode), [displayMode]);

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
      if (comp.type === 'SEVEN_SEGMENT') {
        const segPins = ['b0', 'b1', 'b2', 'b3'];
        const idx = segPins.indexOf(pinName);
        if (idx !== -1) return { x: comp.x, y: comp.y + 24 + idx * 18 };
        return { x: comp.x, y: comp.y + h / 2 };
      }

      const pins = isOutput ? Object.keys(comp.outputs || {}) : Object.keys(comp.inputs || {});
      const idx = Math.max(0, pins.indexOf(pinName));
      const step = h / (pins.length + 1);
      return {
        x: isOutput ? comp.x + w : comp.x,
        y: comp.y + step * (idx + 1),
      };
    }
    return hardwarePinPos(comp, pinName, isOutput);
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

      // If Nvidia NV1 circuit is present, draw the physical PCI card board profile
      if (engine.components.has('nv1_core')) {
        drawPhysicalNV1PCICard(ctx);
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
    if (comp.type === 'SEVEN_SEGMENT') {
      drawSevenSegmentDisplay(ctx, comp, w, h, isSelected, true);
      ctx.restore();
      return;
    }
    if (comp.type === 'NV1_CORE') {
      drawPhotorealisticNV1QFP(ctx, comp, w, h, isSelected, time);
      ctx.restore();
      return;
    }
    if (comp.type === 'PCI_BUS') {
      drawPhotorealisticPCIFingers(ctx, comp, w, h, isSelected);
      ctx.restore();
      return;
    }
    if (comp.type === 'VGA_BRACKET') {
      drawPhotorealisticPCIBracket(ctx, comp, w, h, isSelected);
      ctx.restore();
      return;
    }
    if (comp.type === 'VRAM_BANK') {
      drawPhotorealisticSOJMemory(ctx, comp, w, h, isSelected);
      ctx.restore();
      return;
    }
    if (comp.type === 'RAMDAC') {
      drawPhotorealisticRAMDAC(ctx, comp, w, h, isSelected);
      ctx.restore();
      return;
    }
    if (comp.type === 'AUDIO_DSP') {
      drawPhotorealisticAudioDSP(ctx, comp, w, h, isSelected);
      ctx.restore();
      return;
    }
    if (comp.type === 'SATURN_PAD') {
      drawPhotorealisticSaturnPad(ctx, comp, w, h, isSelected);
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
    ctx.fillText(`FOX ${crystalFrequency(comp)} MHz`, comp.x + 14, comp.y + 28);
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

    if (comp.label?.includes('NV1') || comp.label?.includes('3D') || engine.components.has('nv1_core')) {
      // Live 1995 NV1 3D Quadratic Curved Mesh Demo
      const cx = scrX + 64;
      const cy = scrY + 54;
      const t = (time || 0) * 0.0018;

      ctx.save();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;

      const numLines = 5;
      for (let i = -numLines; i <= numLines; i++) {
        const u = i / numLines;
        ctx.beginPath();
        for (let j = -numLines; j <= numLines; j++) {
          const v = j / numLines;
          // Quadratic curved surface (saddle hyperboloid)
          const x3d = u * 36;
          const y3d = v * 36;
          const z3d = (u * u - v * v) * 20;

          const cosY = Math.cos(t);
          const sinY = Math.sin(t);
          const rx = x3d * cosY + z3d * sinY;
          const rz = -x3d * sinY + z3d * cosY;
          const ry = y3d * Math.cos(0.5) - rz * Math.sin(0.5);

          const projX = cx + rx;
          const projY = cy + ry;

          if (j === -numLines) ctx.moveTo(projX, projY);
          else ctx.lineTo(projX, projY);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Retro 1995 3D Demo Overlay
      ctx.fillStyle = '#00F0FF';
      ctx.font = '800 8px "JetBrains Mono", monospace';
      ctx.fillText('NVIDIA NV1 (1995)', scrX + 6, scrY + 112);
      ctx.fillStyle = '#10B981';
      ctx.font = '600 7px "JetBrains Mono", monospace';
      ctx.fillText('QTM 3D ENGINE: 60 FPS', scrX + 6, scrY + 122);
    } else if (comp.vram) {
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

  function drawSevenSegmentDisplay(ctx, comp, w, h, isSelected, isHardware) {
    const val = comp.outputs?.val !== undefined ? comp.outputs.val : (Number(comp.inputs?.in) || 0) & 0x0F;
    const hexChar = Number(val).toString(16).toUpperCase();

    ctx.save();
    // Chassis Body
    ctx.fillStyle = isHardware ? '#0E121A' : '#070A12';
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#00F0FF' : isHardware ? '#2B3548' : '#334155';
    ctx.lineWidth = isSelected ? 2 : 1.2;
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.stroke();

    // Module Title
    ctx.fillStyle = '#64748B';
    ctx.font = '700 8px "JetBrains Mono", monospace';
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
    const mask = SEG_MAP[val & 0x0F] || 0;
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

    // Decimal Point DP
    ctx.save();
    ctx.fillStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(boxX + boxW - 8, boxY + boxH - 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Value read-out label at bottom
    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText(`HEX: ${hexChar} (DEC: ${val})`, comp.x + 8, comp.y + h - 4);

    if (isHardware) {
      drawPhotorealisticPadsAndLeads(ctx, comp, w, h);
    } else {
      drawSchematicLeads(ctx, comp, w, h, isSelected ? '#00F0FF' : '#5E7A9E');
    }

    ctx.restore();
  }

  // ==========================================
  // PHYSICAL NVIDIA NV1 (1995) PCI CARD RENDERERS
  // ==========================================
  function drawPhysicalNV1PCICard(ctx) {
    ctx.save();
    
    // Physical PCI Board Boundary (shared with the 3D model)
    const { x: cardX, y: cardY, w: cardW, h: cardH } = NV1_CARD;

    // Emerald Green FR-4 Soldermask Substrate
    const pcbGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    pcbGrad.addColorStop(0, '#093B1E');
    pcbGrad.addColorStop(0.3, '#0C4724');
    pcbGrad.addColorStop(0.7, '#08371B');
    pcbGrad.addColorStop(1, '#052613');
    ctx.fillStyle = pcbGrad;

    // Realistic PCI Outline (Chamfered Corner & Edge-Connector Tab)
    ctx.beginPath();
    nv1CardOutline().forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();

    // Solder mask edge bevel
    ctx.strokeStyle = '#15572E';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Copper Ground Hatch Lines
    ctx.strokeStyle = 'rgba(24, 75, 41, 0.4)';
    ctx.lineWidth = 1;
    for (let lx = cardX + 25; lx < cardX + cardW - 20; lx += 45) {
      ctx.beginPath();
      ctx.moveTo(lx, cardY + 20);
      ctx.lineTo(lx, cardY + cardH - 20);
      ctx.stroke();
    }

    // 4 Corner Gold Mounting Ground Holes
    const holes = [
      { x: cardX + 30, y: cardY + 30 },
      { x: cardX + cardW - 45, y: cardY + 45 },
      { x: cardX + 40, y: cardY + cardH - 30 },
      { x: cardX + cardW - 40, y: cardY + cardH - 30 },
    ];
    for (const h of holes) {
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E5C158';
      for (let a = 0; a < 8; a++) {
        const rad = (a * Math.PI) / 4;
        ctx.fillRect(h.x + Math.cos(rad) * 9 - 1, h.y + Math.sin(rad) * 9 - 1, 2, 2);
      }
      ctx.fillStyle = '#040806';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Authentic Silkscreen White Printing (top band is kept free of parts)
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '900 13px "Outfit", sans-serif';
    ctx.fillText('DIAMOND MULTIMEDIA // EDGE 3D 2000 SERIES', cardX + 50, cardY + 24);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('NVIDIA NV1 / SGS-THOMSON STG-2000X 3D ACCELERATOR (1995)', cardX + 50, cardY + 38);
    ctx.fillText('PCI BUS 2.1 // 64-BIT VRAM // SEGA SATURN I/O // 32-VOICE AUDIO', cardX + 50, cardY + 50);

    // Bottom-left silkscreen (between the gamepad header and the PCI edge)
    ctx.fillStyle = '#64748B';
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillText('FCC ID: FTUPCI-EDGE3D', cardX + 30, cardY + 470);
    ctx.fillText('ASSY 2000-01-A REV 1.0', cardX + 30, cardY + 480);
    ctx.fillText('(C) 1995 NVIDIA CORP.', cardX + 430, cardY + 24);

    // Jumper Headers
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(cardX + 30, cardY + 432, 50, 20);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.fillText('JP1: PAL/NTSC', cardX + 30, cardY + 428);

    ctx.restore();
  }

  function drawPhotorealisticNV1QFP(ctx, comp, w, h, isSelected, time) {
    const temp = engine.thermalMap.get(comp.id) || 54.2;
    const pinsPerSide = 20;
    const leadLen = 14;
    const padLen = 10;

    ctx.save();

    // Top & Bottom pins
    for (let i = 0; i < pinsPerSide; i++) {
      const px = comp.x + 20 + (i * (w - 40)) / (pinsPerSide - 1);
      ctx.fillStyle = '#C59B27';
      ctx.fillRect(px - 1.5, comp.y - padLen, 3, padLen);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(px - 1, comp.y - leadLen, 2, leadLen);

      ctx.fillStyle = '#C59B27';
      ctx.fillRect(px - 1.5, comp.y + h, 3, padLen);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(px - 1, comp.y + h, 2, leadLen);
    }

    // Left & Right pins
    for (let i = 0; i < pinsPerSide; i++) {
      const py = comp.y + 20 + (i * (h - 40)) / (pinsPerSide - 1);
      ctx.fillStyle = '#C59B27';
      ctx.fillRect(comp.x - padLen, py - 1.5, padLen, 3);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(comp.x - leadLen, py - 1, leadLen, 2);

      ctx.fillStyle = '#C59B27';
      ctx.fillRect(comp.x + w, py - 1.5, padLen, 3);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(comp.x + w, py - 1, leadLen, 2);
    }

    // Drop shadow under QFP body
    ctx.shadowColor = isSelected ? 'rgba(0, 240, 255, 0.6)' : 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = isSelected ? 22 : 16;
    ctx.shadowOffsetY = 8;

    const bodyGrad = ctx.createRadialGradient(
      comp.x + w / 2, comp.y + h / 2, 10,
      comp.x + w / 2, comp.y + h / 2, w / 2
    );
    bodyGrad.addColorStop(0, '#1E232E');
    bodyGrad.addColorStop(0.5, '#12151C');
    bodyGrad.addColorStop(1, '#080A0E');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2A3344';
    ctx.lineWidth = isSelected ? 2.5 : 1.2;
    roundRect(ctx, comp.x, comp.y, w, h, 6);
    ctx.stroke();

    // Center Recessed Heat Spreader
    const cavityMargin = 22;
    const cavW = w - cavityMargin * 2;
    const cavH = h - cavityMargin * 2;
    const cavGrad = ctx.createLinearGradient(comp.x + cavityMargin, comp.y + cavityMargin, comp.x + w - cavityMargin, comp.y + h - cavityMargin);
    cavGrad.addColorStop(0, '#141820');
    cavGrad.addColorStop(1, '#0C0E14');
    ctx.fillStyle = cavGrad;
    ctx.strokeStyle = '#222B3A';
    ctx.lineWidth = 1;
    roundRect(ctx, comp.x + cavityMargin, comp.y + cavityMargin, cavW, cavH, 4);
    ctx.fill();
    ctx.stroke();

    // Pin 1 Orientation Dot
    ctx.fillStyle = '#06080B';
    ctx.beginPath();
    ctx.arc(comp.x + 14, comp.y + 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // SGS-THOMSON logo mark
    const logoX = comp.x + w / 2 - 40;
    const logoY = comp.y + 44;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(logoX, logoY, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(logoX - 2, logoY, 3, -Math.PI / 2, Math.PI / 2);
    ctx.arc(logoX + 2, logoY, 3, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '800 11px "Outfit", sans-serif';
    ctx.fillText('SGS-THOMSON', logoX + 12, logoY + 4);

    ctx.fillStyle = '#00F0FF';
    ctx.font = '900 13px "JetBrains Mono", monospace';
    ctx.fillText('STG2000X', comp.x + w / 2 - 36, comp.y + 70);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.fillText('NVIDIA NV1 3D', comp.x + w / 2 - 42, comp.y + 88);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillText('MULTIMEDIA PROCESSOR', comp.x + w / 2 - 48, comp.y + 102);
    ctx.fillText('TAIWAN 9534  QFP-208', comp.x + w / 2 - 44, comp.y + 116);
    ctx.fillText('0.5um 3M CMOS // 60MHz', comp.x + w / 2 - 46, comp.y + 128);

    // Dynamic Status & Thermal Readout
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    roundRect(ctx, comp.x + 24, comp.y + h - 34, w - 48, 18, 3);
    ctx.fill();

    const heatColor = temp > 70 ? '#EF4444' : temp > 50 ? '#F59E0B' : '#10B981';
    ctx.fillStyle = heatColor;
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText(`CORE: ${temp.toFixed(1)}°C  |  QTM 3D: ACTIVE`, comp.x + 30, comp.y + h - 22);

    ctx.restore();
  }

  function drawPhotorealisticPCIBracket(ctx, comp, w, h, isSelected) {
    ctx.save();

    // Brushed Stainless Steel Finish
    const steelGrad = ctx.createLinearGradient(comp.x, comp.y, comp.x + w, comp.y);
    steelGrad.addColorStop(0, '#CBD5E1');
    steelGrad.addColorStop(0.2, '#94A3B8');
    steelGrad.addColorStop(0.5, '#E2E8F0');
    steelGrad.addColorStop(0.8, '#64748B');
    steelGrad.addColorStop(1, '#475569');
    ctx.fillStyle = steelGrad;

    roundRect(ctx, comp.x, comp.y, w, h, 3);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#334155';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(ctx, comp.x, comp.y, w, h, 3);
    ctx.stroke();

    // Screws
    const drawScrew = (sx, sy) => {
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - 3.5, sy);
      ctx.lineTo(sx + 3.5, sy);
      ctx.moveTo(sx, sy - 3.5);
      ctx.lineTo(sx, sy + 3.5);
      ctx.stroke();
    };
    drawScrew(comp.x + w / 2, comp.y + 14);
    drawScrew(comp.x + w / 2, comp.y + h - 14);

    // 15-Pin D-Sub VGA Port
    const vgaX = comp.x + 10;
    const vgaY = comp.y + 35;
    const vgaW = w - 20;
    const vgaH = 75;

    ctx.fillStyle = '#475569';
    roundRect(ctx, vgaX - 2, vgaY - 2, vgaW + 4, vgaH + 4, 4);
    ctx.fill();

    // Blue Plastic Insert
    ctx.fillStyle = '#1D4ED8';
    roundRect(ctx, vgaX + 4, vgaY + 14, vgaW - 8, vgaH - 28, 6);
    ctx.fill();

    // 15 Gold Pins
    ctx.fillStyle = '#D4AF37';
    for (let row = 0; row < 3; row++) {
      const offsetX = row === 1 ? 4 : 0;
      for (let col = 0; col < 5; col++) {
        const px = vgaX + 11 + col * 8 + offsetX;
        const py = vgaY + 22 + row * 9;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('VGA OUT', vgaX + 8, vgaY + vgaH + 10);

    // Dual 3.5mm Audio Jacks
    const audioY = comp.y + 155;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(comp.x + w / 2, audioY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(comp.x + w / 2, audioY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(comp.x + w / 2, audioY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.fillText('LINE OUT', comp.x + 18, audioY + 18);

    const audio2Y = audioY + 36;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(comp.x + w / 2, audio2Y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0EA5E9';
    ctx.beginPath();
    ctx.arc(comp.x + w / 2, audio2Y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(comp.x + w / 2, audio2Y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.fillText('LINE IN', comp.x + 20, audio2Y + 18);

    // Sega Saturn 9-Pin Controller Port
    const satY = comp.y + 245;
    ctx.fillStyle = '#1E293B';
    roundRect(ctx, comp.x + 8, satY, w - 16, 56, 4);
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(comp.x + 18 + i * 8, satY + 18, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(comp.x + 22 + i * 8, satY + 32, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.fillText('SEGA SATURN', comp.x + 12, satY + 48);

    ctx.restore();
  }

  function drawPhotorealisticPCIFingers(ctx, comp, w, h, isSelected) {
    ctx.save();

    ctx.fillStyle = '#0B4222';
    roundRect(ctx, comp.x, comp.y, w, h, 2);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#15572E';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    const numPins = 46;
    const pinW = 3.4;
    const gap = (w - 24) / numPins;
    const notchIndex = 14;

    for (let i = 0; i < numPins; i++) {
      if (i >= notchIndex && i <= notchIndex + 2) continue;
      const px = comp.x + 12 + i * gap;

      const goldGrad = ctx.createLinearGradient(px, comp.y + 10, px, comp.y + h);
      goldGrad.addColorStop(0, '#F59E0B');
      goldGrad.addColorStop(0.3, '#FDE047');
      goldGrad.addColorStop(0.7, '#D97706');
      goldGrad.addColorStop(1, '#B45309');
      ctx.fillStyle = goldGrad;

      ctx.fillRect(px, comp.y + 12, pinW, h - 16);

      ctx.fillStyle = '#C59B27';
      ctx.beginPath();
      ctx.arc(px + pinW / 2, comp.y + 6, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#040806';
      ctx.beginPath();
      ctx.arc(px + pinW / 2, comp.y + 6, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Key Notch Cutout
    ctx.fillStyle = '#070F0A';
    ctx.fillRect(comp.x + 12 + notchIndex * gap - 2, comp.y + 8, gap * 3 + 4, h);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('PCI LOCAL BUS 2.1 // 32-BIT 33.3 MHz // 133 MB/s', comp.x + 14, comp.y + h - 6);

    ctx.restore();
  }

  function drawPhotorealisticSOJMemory(ctx, comp, w, h, isSelected) {
    ctx.save();

    const numLeads = 14;
    const leadGap = (w - 20) / (numLeads - 1);
    for (let i = 0; i < numLeads; i++) {
      const lx = comp.x + 10 + i * leadGap;
      ctx.fillStyle = '#C59B27';
      ctx.fillRect(lx - 2, comp.y - 6, 4, 6);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(lx - 1.2, comp.y - 4, 2.4, 6);

      ctx.fillStyle = '#C59B27';
      ctx.fillRect(lx - 2, comp.y + h, 4, 6);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(lx - 1.2, comp.y + h - 2, 2.4, 6);
    }

    ctx.shadowColor = isSelected ? 'rgba(0, 240, 255, 0.55)' : 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = isSelected ? 16 : 10;
    ctx.shadowOffsetY = 4;

    const chipGrad = ctx.createLinearGradient(comp.x, comp.y, comp.x, comp.y + h);
    chipGrad.addColorStop(0, '#1E232B');
    chipGrad.addColorStop(0.3, '#12141A');
    chipGrad.addColorStop(0.8, '#0A0C10');
    chipGrad.addColorStop(1, '#050709');
    ctx.fillStyle = chipGrad;
    roundRect(ctx, comp.x, comp.y, w, h, 3);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2A3342';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(ctx, comp.x, comp.y, w, h, 3);
    ctx.stroke();

    // Notch
    ctx.fillStyle = '#06080A';
    ctx.beginPath();
    ctx.arc(comp.x, comp.y + h / 2, 4.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 9px "Outfit", sans-serif';
    ctx.fillText('TOSHIBA', comp.x + 14, comp.y + 18);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('TC51V16160FT-60', comp.x + 14, comp.y + 32);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 7px "JetBrains Mono", monospace';
    ctx.fillText('16Mb EDO DRAM 60ns // JAPAN', comp.x + 14, comp.y + 45);

    ctx.fillStyle = '#10B981';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.fillText('64-BIT VRAM BANK', comp.x + 14, comp.y + 57);

    ctx.restore();
  }

  function drawPhotorealisticRAMDAC(ctx, comp, w, h, isSelected) {
    ctx.save();
    drawPhotorealisticPadsAndLeads(ctx, comp, w, h);

    ctx.shadowColor = isSelected ? 'rgba(0, 240, 255, 0.55)' : 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = isSelected ? 16 : 10;
    ctx.shadowOffsetY = 4;

    const chipGrad = ctx.createLinearGradient(comp.x, comp.y, comp.x + w, comp.y + h);
    chipGrad.addColorStop(0, '#1E232B');
    chipGrad.addColorStop(1, '#080A0E');
    ctx.fillStyle = chipGrad;
    roundRect(ctx, comp.x, comp.y, w, h, 4);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2A3342';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(ctx, comp.x, comp.y, w, h, 4);
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('ATT20C409', comp.x + 12, comp.y + 24);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 8px "Outfit", sans-serif';
    ctx.fillText('NV1 TrueColor RAMDAC', comp.x + 12, comp.y + 40);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 7px "JetBrains Mono", monospace';
    ctx.fillText('135MHz TRIPLE 8-BIT', comp.x + 12, comp.y + 56);
    ctx.fillText('RGB ANALOG 75-OHM', comp.x + 12, comp.y + 70);

    // RGB Analog Color Bar Indicator
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(comp.x + 12, comp.y + 82, 24, 6);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(comp.x + 36, comp.y + 82, 24, 6);
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(comp.x + 60, comp.y + 82, 24, 6);

    ctx.restore();
  }

  function drawPhotorealisticAudioDSP(ctx, comp, w, h, isSelected) {
    ctx.save();
    drawPhotorealisticPadsAndLeads(ctx, comp, w, h);

    ctx.shadowColor = isSelected ? 'rgba(0, 240, 255, 0.55)' : 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = isSelected ? 16 : 10;
    ctx.shadowOffsetY = 4;

    const chipGrad = ctx.createLinearGradient(comp.x, comp.y, comp.x + w, comp.y + h);
    chipGrad.addColorStop(0, '#1E232B');
    chipGrad.addColorStop(1, '#080A0E');
    ctx.fillStyle = chipGrad;
    roundRect(ctx, comp.x, comp.y, w, h, 4);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2A3342';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(ctx, comp.x, comp.y, w, h, 4);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('STG-AUDIO DSP', comp.x + 12, comp.y + 24);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 8px "Outfit", sans-serif';
    ctx.fillText('32-Voice Wavetable Synth', comp.x + 12, comp.y + 40);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 7px "JetBrains Mono", monospace';
    ctx.fillText('16-BIT 44.1kHz STEREO', comp.x + 12, comp.y + 56);
    ctx.fillText('MPU-401 & SB16 COMPAT', comp.x + 12, comp.y + 70);

    // Audio VU meter bars
    ctx.fillStyle = '#10B981';
    for (let b = 0; b < 7; b++) {
      const bh = Math.sin((animTimeRef.current * 0.005 + b) * 1.5) * 6 + 8;
      ctx.fillRect(comp.x + 14 + b * 11, comp.y + 96 - bh, 7, bh);
    }

    ctx.restore();
  }

  function drawPhotorealisticSaturnPad(ctx, comp, w, h, isSelected) {
    ctx.save();
    drawPhotorealisticPadsAndLeads(ctx, comp, w, h);

    ctx.fillStyle = '#0F131A';
    roundRect(ctx, comp.x, comp.y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#00F0FF' : '#2B3548';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(ctx, comp.x, comp.y, w, h, 12);
    ctx.stroke();

    // D-Pad Cross
    ctx.fillStyle = '#1E2638';
    ctx.fillRect(comp.x + 14, comp.y + 26, 28, 10);
    ctx.fillRect(comp.x + 23, comp.y + 17, 10, 28);

    // 6 Action Buttons
    const btnColors = ['#E2E8F0', '#94A3B8', '#3B82F6', '#EF4444', '#F59E0B', '#10B981'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = btnColors[i];
      ctx.beginPath();
      ctx.arc(comp.x + 72 + i * 16, comp.y + 24, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = btnColors[i + 3];
      ctx.beginPath();
      ctx.arc(comp.x + 68 + i * 16, comp.y + 42, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 8px "Outfit", sans-serif';
    ctx.fillText('SEGA SATURN PAD', comp.x + 16, comp.y + 70);

    ctx.restore();
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
    } else if (comp.type === 'SEVEN_SEGMENT') {
      drawSevenSegmentDisplay(ctx, comp, w, h, isSelected, false);
    } else if (comp.type === 'NV1_CORE') {
      ctx.strokeRect(comp.x, comp.y, w, h);
      ctx.fillRect(comp.x, comp.y, w, h);

      // Header Bar
      ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(comp.x, comp.y, w, 26);
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(comp.x, comp.y, w, 26);

      ctx.fillStyle = isSelected ? '#00F0FF' : '#F8FAFC';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillText('STG2000X / NVIDIA NV1', comp.x + 8, comp.y + 16);

      // Sub-units
      ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
      roundRect(ctx, comp.x + 8, comp.y + 34, w - 16, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#00F0FF';
      ctx.font = '600 8px "JetBrains Mono", monospace';
      ctx.fillText('QUADRATIC 3D ENGINE (QTM)', comp.x + 14, comp.y + 50);

      roundRect(ctx, comp.x + 8, comp.y + 66, w - 16, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#10B981';
      ctx.fillText('64-BIT VRAM ARBITER (60M)', comp.x + 14, comp.y + 82);

      roundRect(ctx, comp.x + 8, comp.y + 98, w - 16, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.fillText('2D GUI / BITBLT ACCELERATOR', comp.x + 14, comp.y + 114);

      roundRect(ctx, comp.x + 8, comp.y + 130, w - 16, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('PCI 2.1 32-BIT DMA FIFO', comp.x + 14, comp.y + 146);

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

  // Double-Click to drill down into internal subcircuit schematic
  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left - viewState.x) / viewState.zoom;
    const cy = (e.clientY - rect.top - viewState.y) / viewState.zoom;

    for (const comp of Array.from(engine.components.values()).reverse()) {
      const { w, h } = getDims(comp);
      if (cx >= comp.x && cx <= comp.x + w && cy >= comp.y && cy <= comp.y + h) {
        if (onDrillDown) {
          onDrillDown(comp);
        }
        return;
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#060911]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Hierarchical Drill-Down Breadcrumb Navigation Bar */}
      {hierarchyStack && hierarchyStack.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto">
          <div className="flex items-center space-x-2 bg-[#080D1A]/95 border border-cyan-500/50 rounded-xl px-4 py-2 shadow-[0_10px_35px_rgba(0,240,255,0.18)] backdrop-blur-xl">
            {/* Level Up Button */}
            <button
              onClick={() => onNavigateUp()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-400/60 rounded-lg text-cyan-300 hover:text-cyan-100 text-xs font-mono font-bold tracking-wider transition-all duration-150 active:scale-95 shadow-md shadow-cyan-950/50"
              title="Přejít o úroveň výš (Zkratka: Backspace / Esc)"
            >
              <span className="text-sm">⇦</span>
              <span>LEVEL UP (ZPĚT)</span>
            </button>

            <div className="h-5 w-px bg-cyan-900/60 mx-1" />

            {/* Breadcrumb Path Trail */}
            <div className="flex items-center space-x-1.5 text-xs font-mono overflow-x-auto max-w-[650px] scrollbar-none py-0.5">
              {hierarchyStack.map((lvl, idx) => {
                const isCurrent = idx === hierarchyStack.length - 1;
                return (
                  <React.Fragment key={lvl.id + '-' + idx}>
                    {idx > 0 && <span className="text-cyan-500/60 font-bold select-none">›</span>}
                    <button
                      onClick={() => onNavigateUp(idx)}
                      disabled={isCurrent}
                      className={`px-2.5 py-1 rounded-md transition-all duration-150 flex items-center space-x-1.5 ${
                        isCurrent
                          ? 'text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-400/50 shadow-inner'
                          : 'text-gray-400 hover:text-cyan-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-[10px] text-cyan-500/80 font-semibold">L{lvl.level || idx + 1}:</span>
                      <span className="whitespace-nowrap">
                        {lvl.title.length > 25 ? lvl.title.slice(0, 23) + '…' : lvl.title}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="h-5 w-px bg-cyan-900/60 mx-1" />

            {/* Depth Badge */}
            <span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-700/50 whitespace-nowrap">
              ÚROVEŇ {hierarchyStack[hierarchyStack.length - 1].level || hierarchyStack.length} / 8
            </span>
          </div>

          {/* Subtitle / Micro-Architecture Formula Banner */}
          {hierarchyStack[hierarchyStack.length - 1].subtitle && (
            <div className="mt-1.5 text-[11px] font-mono text-cyan-300/90 bg-[#060A14]/90 border border-cyan-500/30 px-3.5 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{hierarchyStack[hierarchyStack.length - 1].subtitle}</span>
              <span className="text-gray-500 ml-1 text-[10px]">(Dvojklikem lze jít ještě hlouběji)</span>
            </div>
          )}
        </div>
      )}

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
