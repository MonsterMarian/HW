import React, { useRef, useEffect, useState } from 'react';
import { WireState } from '../engine/logicEngine';

export function ComponentSchematicCanvas({ component, details, engine, viewType = 'gate' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const render = (time) => {
      if (!active) return;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Blueprint Grid Background
      ctx.fillStyle = '#05080E';
      ctx.fillRect(0, 0, width, height);

      // Technical Grid Lines
      const grid = 20;
      ctx.strokeStyle = '#0B1220';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major Crosshairs
      ctx.strokeStyle = '#101B2E';
      ctx.beginPath();
      for (let x = 0; x < width; x += grid * 5) {
        for (let y = 0; y < height; y += grid * 5) {
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + 3, y);
          ctx.moveTo(x, y - 3);
          ctx.lineTo(x, y + 3);
        }
      }
      ctx.stroke();

      // Header watermark
      ctx.fillStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.font = '900 24px "JetBrains Mono", monospace';
      ctx.fillText(`${details.icCode} // INTERNAL SCHEMATIC`, 20, 36);

      // Render schematic according to component type & viewType ('gate' vs 'transistor')
      const type = component.type;
      const inp = component.inputs || {};
      const out = component.outputs || {};

      if (type === 'NV1_CORE') {
        drawNV1ArchitectureSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'AND') {
        if (viewType === 'transistor') drawCMOSAndTransistors(ctx, width, height, time, inp, out);
        else drawAndGateSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'OR') {
        if (viewType === 'transistor') drawCMOSOrTransistors(ctx, width, height, time, inp, out);
        else drawOrGateSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'XOR') {
        if (viewType === 'transistor') drawCMOSXorTransistors(ctx, width, height, time, inp, out);
        else drawXorGateSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'NOT') {
        if (viewType === 'transistor') drawCMOSInverterTransistors(ctx, width, height, time, inp, out);
        else drawNotInverterSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'NAND') {
        if (viewType === 'transistor') drawCMOSNandTransistors(ctx, width, height, time, inp, out);
        else drawNandGateSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'NOR') {
        if (viewType === 'transistor') drawCMOSNorTransistors(ctx, width, height, time, inp, out);
        else drawNorGateSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'D_FF') {
        drawDFlipFlopSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'SEVEN_SEGMENT') {
        drawSevenSegmentSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'VRAM_BANK') {
        drawVRAMBankSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'RAMDAC') {
        drawRAMDACSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'AUDIO_DSP') {
        drawAudioDSPSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'PCI_BUS') {
        drawPCIBusSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'VGA_BRACKET') {
        drawVGABracketSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'SATURN_PAD') {
        drawSaturnPadSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'CLOCK') {
        drawQuartzClockSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'REGISTER_8BIT') {
        drawOctalRegisterSchematic(ctx, width, height, time, inp, out);
      } else if (type === 'MUX') {
        drawMultiplexerSchematic(ctx, width, height, time, inp, out);
      } else {
        drawGenericBlockSchematic(ctx, width, height, time, component, details);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [component, details, engine, viewType]);

  // =========================================================================
  // SCHEMATIC DRAWING HELPER FUNCTIONS
  // =========================================================================

  function wireColor(val) {
    if (val === 1) return '#00F0FF';
    if (val === WireState.HIGH_Z) return '#F59E0B';
    return '#1E2C42';
  }

  function drawPulseDot(ctx, x1, y1, x2, y2, time, speed = 0.002, color = '#FFFFFF') {
    const t = ((time * speed) % 1);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    ctx.fillStyle = color;
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  }

  function drawPinNode(ctx, x, y, label, val, isOut = false) {
    const isHigh = val === 1;
    ctx.save();
    ctx.strokeStyle = isHigh ? '#00F0FF' : '#334155';
    ctx.fillStyle = isHigh ? '#00F0FF' : '#080C14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHigh ? '#00F0FF' : '#94A3B8';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText(label, isOut ? x + 8 : x - ctx.measureText(label).width - 8, y + 3);
    ctx.restore();
  }

  // --- 1. NVIDIA NV1 ARCHITECTURE SCHEMATIC ---
  function drawNV1ArchitectureSchematic(ctx, w, h, time, inp, out) {
    ctx.save();

    // Overall Chip Boundary
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(40, 50, w - 80, h - 90);
    ctx.setLineDash([]);

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('SGS-THOMSON STG-2000X / NVIDIA NV1 ARCHITECTURE SCHEMATIC (1995)', 50, 42);

    // Block 1: PCI 2.1 Host DMA & Bus Interface (Left)
    const pciBox = { x: 70, y: 80, w: 140, h: 220 };
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(pciBox.x, pciBox.y, pciBox.w, pciBox.h);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pciBox.x, pciBox.y, pciBox.w, pciBox.h);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('PCI 2.1 HOST DMA', pciBox.x + 12, pciBox.y + 24);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('32-Bit 33.3 MHz Bus', pciBox.x + 12, pciBox.y + 38);
    ctx.fillText('Target / Master Burst', pciBox.x + 12, pciBox.y + 50);
    ctx.fillText('Vendor ID: 0x12D2', pciBox.x + 12, pciBox.y + 64);
    ctx.fillText('Device ID: 0x0001', pciBox.x + 12, pciBox.y + 76);
    ctx.fillText('FIFO Depth: 32 Dwords', pciBox.x + 12, pciBox.y + 90);

    // PCI Input Lines
    drawPinNode(ctx, 40, 100, 'PCI_CLK (33M)', inp.pci_clk || 1, false);
    drawPinNode(ctx, 40, 140, 'FRAME#', 0, false);
    drawPinNode(ctx, 40, 180, 'AD[31:0]', 1, false);
    drawPinNode(ctx, 40, 220, 'IRDY#', 0, false);

    // Internal High-Speed 32-bit Command Bus
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pciBox.x + pciBox.w, 130);
    ctx.lineTo(250, 130);
    ctx.stroke();
    drawPulseDot(ctx, pciBox.x + pciBox.w, 130, 250, 130, time, 0.003, '#FFFFFF');

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('HOST CMD BUS [31:0]', 215, 122);

    // Block 2: 3D Quadratic Texture Engine (QTM) - Central Highlight!
    const qtmBox = { x: 250, y: 80, w: 220, h: 100 };
    ctx.fillStyle = 'rgba(6, 40, 48, 0.9)';
    ctx.fillRect(qtmBox.x, qtmBox.y, qtmBox.w, qtmBox.h);
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(qtmBox.x, qtmBox.y, qtmBox.w, qtmBox.h);

    ctx.fillStyle = '#00F0FF';
    ctx.font = '800 11px "Outfit", sans-serif';
    ctx.fillText('QUADRATIC 3D ENGINE (QTM)', qtmBox.x + 12, qtmBox.y + 22);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.fillText('X(u,v) = A u² + B uv + C v² + D u + E v + F', qtmBox.x + 12, qtmBox.y + 38);
    ctx.fillText('Forward-Differencing Arithmetic Pipeline', qtmBox.x + 12, qtmBox.y + 52);
    ctx.fillText('Curved Patch Tessellator & Bilinear Tex', qtmBox.x + 12, qtmBox.y + 66);
    ctx.fillText('Z-Buffer Comparator & Fog Unit', qtmBox.x + 12, qtmBox.y + 80);

    // Block 3: 2D GUI & BitBLT Engine (Center-Lower)
    const bltBox = { x: 250, y: 195, w: 220, h: 70 };
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(bltBox.x, bltBox.y, bltBox.w, bltBox.h);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bltBox.x, bltBox.y, bltBox.w, bltBox.h);

    ctx.fillStyle = '#F59E0B';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('2D GUI & BitBLT ACCELERATOR', bltBox.x + 12, bltBox.y + 22);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('Windows 95 ROP Acceleration (256 ROPs)', bltBox.x + 12, bltBox.y + 36);
    ctx.fillText('Pattern & Color Expansion / Line Draw', bltBox.x + 12, bltBox.y + 48);
    ctx.fillText('64x64 Hardware Color Cursor Unit', bltBox.x + 12, bltBox.y + 60);

    // Block 4: 64-Bit Unified Memory Controller & Arbiter
    const memBox = { x: 510, y: 80, w: 190, h: 100 };
    ctx.fillStyle = 'rgba(6, 40, 20, 0.9)';
    ctx.fillRect(memBox.x, memBox.y, memBox.w, memBox.h);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(memBox.x, memBox.y, memBox.w, memBox.h);

    ctx.fillStyle = '#10B981';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('64-BIT MEMORY ARBITER', memBox.x + 12, memBox.y + 22);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('Clock: 60 MHz (480 MB/s Peak)', memBox.x + 12, memBox.y + 36);
    ctx.fillText('Dual-Bank EDO DRAM / VRAM', memBox.x + 12, memBox.y + 48);
    ctx.fillText('RAS# / CAS# Interleaved Access', memBox.x + 12, memBox.y + 60);
    ctx.fillText('Supports 2MB to 4MB Framebuffer', memBox.x + 12, memBox.y + 72);

    // Connect QTM & 2D to Memory Arbiter
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(qtmBox.x + qtmBox.w, 130);
    ctx.lineTo(memBox.x, 130);
    ctx.moveTo(bltBox.x + bltBox.w, 230);
    ctx.lineTo(490, 230);
    ctx.lineTo(490, 160);
    ctx.lineTo(memBox.x, 160);
    ctx.stroke();

    // VRAM Outputs to Right
    drawPinNode(ctx, w - 40, 100, 'VRAM_ADDR[13:0]', 1, true);
    drawPinNode(ctx, w - 40, 130, 'VRAM_D[63:0]', 1, true);
    drawPinNode(ctx, w - 40, 160, 'WE# / CAS#', 0, true);

    // Block 5: 135MHz TrueColor RAMDAC Video Core
    const dacBox = { x: 510, y: 195, w: 190, h: 70 };
    ctx.fillStyle = 'rgba(20, 10, 30, 0.9)';
    ctx.fillRect(dacBox.x, dacBox.y, dacBox.w, dacBox.h);
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dacBox.x, dacBox.y, dacBox.w, dacBox.h);

    ctx.fillStyle = '#C084FC';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('135MHz TrueColor RAMDAC', dacBox.x + 12, dacBox.y + 22);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('256x18 Color LUT (CLUT)', dacBox.x + 12, dacBox.y + 36);
    ctx.fillText('Triple 8-Bit RGB DACs (75 Ohm)', dacBox.x + 12, dacBox.y + 48);
    ctx.fillText('HSYNC / VSYNC Timing Gen', dacBox.x + 12, dacBox.y + 60);

    drawPinNode(ctx, w - 40, 210, 'ANALOG_RGB (VGA)', 1, true);
    drawPinNode(ctx, w - 40, 240, 'HSYNC / VSYNC', 1, true);

    // Block 6: 32-Voice Wavetable Audio Processor & Synthesizer (Bottom-Left)
    const sndBox = { x: 70, y: 315, w: 260, h: 60 };
    ctx.fillStyle = 'rgba(20, 30, 15, 0.9)';
    ctx.fillRect(sndBox.x, sndBox.y, sndBox.w, sndBox.h);
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sndBox.x, sndBox.y, sndBox.w, sndBox.h);

    ctx.fillStyle = '#FACC15';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('32-VOICE WAVETABLE AUDIO DSP', sndBox.x + 12, sndBox.y + 20);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('Polyphonic Sample Interpolation (44.1kHz 16-Bit)', sndBox.x + 12, sndBox.y + 34);
    ctx.fillText('Sound Blaster 16 & MPU-401 MIDI Emulation', sndBox.x + 12, sndBox.y + 46);

    drawPinNode(ctx, 40, 345, 'Y2 (24.576M)', 1, false);

    // Block 7: Sega Saturn 9-Pin Controller Interface (Bottom-Right)
    const satBox = { x: 360, y: 315, w: 340, h: 60 };
    ctx.fillStyle = 'rgba(30, 20, 20, 0.9)';
    ctx.fillRect(satBox.x, satBox.y, satBox.w, satBox.h);
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(satBox.x, satBox.y, satBox.w, satBox.h);

    ctx.fillStyle = '#FB7185';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('SEGA SATURN DUAL GAMEPAD MATRIX', satBox.x + 12, satBox.y + 20);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('Direct DB-9 Hardware Interface (No Adapter Needed)', satBox.x + 12, satBox.y + 34);
    ctx.fillText('D-Pad + 6 Action Buttons (A,B,C,X,Y,Z) + Triggers', satBox.x + 12, satBox.y + 46);

    drawPinNode(ctx, w - 40, 335, 'AUDIO_L/R (16-Bit)', 1, true);
    drawPinNode(ctx, w - 40, 360, 'SATURN_DATA[3:0]', 1, true);

    ctx.restore();
  }

  // --- 2. AND GATE (GATE LEVEL) ---
  function drawAndGateSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const aVal = inp.a || 0;
    const bVal = inp.b || 0;
    const yVal = out.out !== undefined ? out.out : (aVal && bVal ? 1 : 0);

    // Input A Wire
    ctx.strokeStyle = wireColor(aVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(60, cy - 30);
    ctx.lineTo(cx - 60, cy - 30);
    ctx.stroke();
    drawPinNode(ctx, 60, cy - 30, `INPUT A = ${aVal}`, aVal, false);

    // Input B Wire
    ctx.strokeStyle = wireColor(bVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(60, cy + 30);
    ctx.lineTo(cx - 60, cy + 30);
    ctx.stroke();
    drawPinNode(ctx, 60, cy + 30, `INPUT B = ${bVal}`, bVal, false);

    // NAND Stage 1
    const nandX = cx - 60;
    const nandY = cy - 45;
    const nandW = 70;
    const nandH = 90;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nandX, nandY);
    ctx.lineTo(nandX + nandW / 2, nandY);
    ctx.arc(nandX + nandW / 2, cy, nandH / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(nandX, nandY + nandH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // NAND Inversion Bubble
    const bubbleR = 5;
    ctx.fillStyle = '#05080E';
    ctx.beginPath();
    ctx.arc(nandX + nandW + bubbleR, cy, bubbleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('STAGE 1: NAND', nandX + 4, cy - 6);

    // Intermediate Node
    const nandVal = aVal && bVal ? 0 : 1;
    const midX1 = nandX + nandW + bubbleR * 2;
    const midX2 = cx + 50;
    ctx.strokeStyle = wireColor(nandVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(midX1, cy);
    ctx.lineTo(midX2, cy);
    ctx.stroke();
    if (nandVal === 1) drawPulseDot(ctx, midX1, cy, midX2, cy, time);

    ctx.fillStyle = wireColor(nandVal);
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText(`NOT(A·B) = ${nandVal}`, midX1 + 10, cy - 10);

    // STAGE 2: INVERTER (NOT)
    const notX = midX2;
    const notW = 55;
    const notH = 60;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(notX, cy - notH / 2);
    ctx.lineTo(notX + notW, cy);
    ctx.lineTo(notX, cy + notH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#05080E';
    ctx.beginPath();
    ctx.arc(notX + notW + bubbleR, cy, bubbleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('STAGE 2: NOT', notX + 4, cy + 18);

    // Final Output Wire
    const outX1 = notX + notW + bubbleR * 2;
    const outX2 = w - 60;
    ctx.strokeStyle = wireColor(yVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(outX1, cy);
    ctx.lineTo(outX2, cy);
    ctx.stroke();
    if (yVal === 1) drawPulseDot(ctx, outX1, cy, outX2, cy, time);

    drawPinNode(ctx, outX2, cy, `OUTPUT Y = A·B = ${yVal}`, yVal, true);

    ctx.restore();
  }

  // --- 3. CMOS AND TRANSISTOR SCHEMATIC ---
  function drawCMOSAndTransistors(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const aVal = inp.a || 0;
    const bVal = inp.b || 0;
    const yVal = out.out !== undefined ? out.out : (aVal && bVal ? 1 : 0);

    // VDD (+5V) Rail at Top
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(120, 70);
    ctx.lineTo(w - 120, 70);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('VDD (+5.0V SUPPLY RAIL)', 130, 62);

    // GND (0V) Rail at Bottom
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(120, h - 70);
    ctx.lineTo(w - 120, h - 70);
    ctx.stroke();
    ctx.fillStyle = '#3B82F6';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('GND (0.0V REFERENCE GROUND)', 130, h - 55);

    // Draw PMOS Transistor 1 & 2 in Parallel
    drawTransistorMOS(ctx, cx - 120, 120, 'P1 (PMOS)', true, aVal);
    drawTransistorMOS(ctx, cx - 40, 120, 'P2 (PMOS)', true, bVal);

    // Draw NMOS Transistor 1 & 2 in Series
    drawTransistorMOS(ctx, cx - 80, 220, 'N1 (NMOS)', false, aVal);
    drawTransistorMOS(ctx, cx - 80, 290, 'N2 (NMOS)', false, bVal);

    // Draw Inverter Stage: PMOS P3 & NMOS N3
    drawTransistorMOS(ctx, cx + 110, 140, 'P3 (INV PMOS)', true, aVal && bVal ? 0 : 1);
    drawTransistorMOS(ctx, cx + 110, 250, 'N3 (INV NMOS)', false, aVal && bVal ? 0 : 1);

    // Wires from VDD to PMOS drains
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 120, 70);
    ctx.lineTo(cx - 120, 105);
    ctx.moveTo(cx - 40, 70);
    ctx.lineTo(cx - 40, 105);
    ctx.moveTo(cx + 110, 70);
    ctx.lineTo(cx + 110, 125);
    ctx.stroke();

    // Output Wire
    ctx.strokeStyle = wireColor(yVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 110, 205);
    ctx.lineTo(w - 60, 205);
    ctx.stroke();

    drawPinNode(ctx, w - 60, 205, `OUTPUT Y = ${yVal}`, yVal, true);

    ctx.restore();
  }

  function drawTransistorMOS(ctx, x, y, label, isPMOS, gateVal) {
    ctx.save();
    const conducts = isPMOS ? gateVal === 0 : gateVal === 1;

    // Body Channel
    ctx.fillStyle = conducts ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = conducts ? '#00F0FF' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 14, y, 28, 24);
    ctx.fillRect(x - 14, y, 28, 24);

    // Gate Plate
    ctx.strokeStyle = wireColor(gateVal);
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 4);
    ctx.lineTo(x - 22, y + 28);
    ctx.stroke();

    // Gate Input Line
    ctx.beginPath();
    ctx.moveTo(x - 36, y + 12);
    ctx.lineTo(x - 22, y + 12);
    ctx.stroke();

    // Inversion Bubble for PMOS Gate
    if (isPMOS) {
      ctx.fillStyle = '#05080E';
      ctx.beginPath();
      ctx.arc(x - 18, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = conducts ? '#00F0FF' : '#94A3B8';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText(label, x - 20, y - 6);
    ctx.fillText(conducts ? 'ON (CONDUCTING)' : 'OFF (CUTOFF)', x - 20, y + 36);

    ctx.restore();
  }

  // --- 4. OR GATE SCHEMATIC ---
  function drawOrGateSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const aVal = inp.a || 0;
    const bVal = inp.b || 0;
    const yVal = out.out !== undefined ? out.out : (aVal || bVal ? 1 : 0);

    drawPinNode(ctx, 60, cy - 30, `INPUT A = ${aVal}`, aVal, false);
    drawPinNode(ctx, 60, cy + 30, `INPUT B = ${bVal}`, bVal, false);

    // Input wires
    ctx.strokeStyle = wireColor(aVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(60, cy - 30);
    ctx.lineTo(cx - 50, cy - 30);
    ctx.stroke();

    ctx.strokeStyle = wireColor(bVal);
    ctx.beginPath();
    ctx.moveTo(60, cy + 30);
    ctx.lineTo(cx - 50, cy + 30);
    ctx.stroke();

    // NOR Stage
    const norX = cx - 50;
    const norW = 80;
    const norH = 90;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(norX, cy - norH / 2);
    ctx.quadraticCurveTo(norX + norW * 0.5, cy - norH / 2, norX + norW, cy);
    ctx.quadraticCurveTo(norX + norW * 0.5, cy + norH / 2, norX, cy + norH / 2);
    ctx.quadraticCurveTo(norX + 18, cy, norX, cy - norH / 2);
    ctx.fill();
    ctx.stroke();

    // Bubble
    ctx.fillStyle = '#05080E';
    ctx.beginPath();
    ctx.arc(norX + norW + 5, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('STAGE 1: NOR', norX + 16, cy + 4);

    // NOT Inverter Stage
    const notX = cx + 60;
    const norVal = aVal || bVal ? 0 : 1;
    ctx.strokeStyle = wireColor(norVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(norX + norW + 10, cy);
    ctx.lineTo(notX, cy);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.strokeStyle = '#00F0FF';
    ctx.beginPath();
    ctx.moveTo(notX, cy - 25);
    ctx.lineTo(notX + 50, cy);
    ctx.lineTo(notX, cy + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#05080E';
    ctx.beginPath();
    ctx.arc(notX + 55, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('STAGE 2: NOT', notX + 4, cy + 18);

    // Final Output
    ctx.strokeStyle = wireColor(yVal);
    ctx.beginPath();
    ctx.moveTo(notX + 60, cy);
    ctx.lineTo(w - 60, cy);
    ctx.stroke();

    drawPinNode(ctx, w - 60, cy, `OUTPUT Y = A+B = ${yVal}`, yVal, true);
    ctx.restore();
  }

  // --- 5. CMOS OR TRANSISTORS ---
  function drawCMOSOrTransistors(ctx, w, h, time, inp, out) {
    drawCMOSAndTransistors(ctx, w, h, time, inp, out);
  }

  // --- 6. XOR GATE SCHEMATIC ---
  function drawXorGateSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const aVal = inp.a || 0;
    const bVal = inp.b || 0;
    const yVal = out.out !== undefined ? out.out : (aVal ^ bVal);

    drawPinNode(ctx, 50, cy - 60, `A = ${aVal}`, aVal, false);
    drawPinNode(ctx, 50, cy + 60, `B = ${bVal}`, bVal, false);

    // Central 4-NAND Matrix Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 180, cy - 100, 360, 200, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('4-NAND GATE EQUIVALENT XOR MATRIX', cx - 160, cy - 78);

    // NAND 1
    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    roundRect(ctx, cx - 150, cy - 35, 70, 70, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('NAND 1', cx - 140, cy + 4);

    // NAND 2 (Top)
    roundRect(ctx, cx - 30, cy - 70, 70, 50, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillText('NAND 2', cx - 20, cy - 40);

    // NAND 3 (Bottom)
    roundRect(ctx, cx - 30, cy + 20, 70, 50, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillText('NAND 3', cx - 20, cy + 50);

    // NAND 4 (Output)
    roundRect(ctx, cx + 80, cy - 30, 70, 60, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillText('NAND 4', cx + 90, cy + 6);

    // Output Wire
    ctx.strokeStyle = wireColor(yVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 150, cy);
    ctx.lineTo(w - 50, cy);
    ctx.stroke();
    drawPinNode(ctx, w - 50, cy, `OUTPUT Y = A ⊕ B = ${yVal}`, yVal, true);

    ctx.restore();
  }

  function drawCMOSXorTransistors(ctx, w, h, time, inp, out) {
    drawXorGateSchematic(ctx, w, h, time, inp, out);
  }

  // --- 7. NOT INVERTER SCHEMATIC ---
  function drawNotInverterSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const aVal = inp.in !== undefined ? inp.in : 0;
    const yVal = out.out !== undefined ? out.out : (aVal === 1 ? 0 : 1);

    drawPinNode(ctx, 80, cy, `INPUT A = ${aVal}`, aVal, false);

    ctx.strokeStyle = wireColor(aVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(80, cy);
    ctx.lineTo(cx - 40, cy);
    ctx.stroke();

    // Triangle
    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 40);
    ctx.lineTo(cx + 40, cy);
    ctx.lineTo(cx - 40, cy + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Circle
    ctx.fillStyle = '#05080E';
    ctx.beginPath();
    ctx.arc(cx + 48, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('INVERTER (HEX NOT)', cx - 35, cy + 55);

    // Output Wire
    ctx.strokeStyle = wireColor(yVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 56, cy);
    ctx.lineTo(w - 80, cy);
    ctx.stroke();

    drawPinNode(ctx, w - 80, cy, `OUTPUT Y = NOT(A) = ${yVal}`, yVal, true);

    ctx.restore();
  }

  function drawCMOSInverterTransistors(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const aVal = inp.in !== undefined ? inp.in : 0;
    const yVal = out.out !== undefined ? out.out : (aVal === 1 ? 0 : 1);

    // VDD Rail
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(150, 70);
    ctx.lineTo(w - 150, 70);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('VDD (+5V)', 160, 62);

    // GND Rail
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(150, h - 70);
    ctx.lineTo(w - 150, h - 70);
    ctx.stroke();
    ctx.fillStyle = '#3B82F6';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('GND (0V)', 160, h - 55);

    // PMOS Pull-Up
    drawTransistorMOS(ctx, cx, 120, 'P1 PMOS (PULL-UP)', true, aVal);

    // NMOS Pull-Down
    drawTransistorMOS(ctx, cx, 230, 'N1 NMOS (PULL-DOWN)', false, aVal);

    // Input line to both gates
    ctx.strokeStyle = wireColor(aVal);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, cy);
    ctx.lineTo(cx - 36, cy);
    ctx.lineTo(cx - 36, 132);
    ctx.moveTo(cx - 36, cy);
    ctx.lineTo(cx - 36, 242);
    ctx.stroke();

    drawPinNode(ctx, 100, cy, `INPUT = ${aVal}`, aVal, false);

    // Output Node connecting Drains
    ctx.strokeStyle = wireColor(yVal);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, 144);
    ctx.lineTo(cx, 230);
    ctx.moveTo(cx, cy);
    ctx.lineTo(w - 80, cy);
    ctx.stroke();

    drawPinNode(ctx, w - 80, cy, `OUTPUT = ${yVal}`, yVal, true);

    ctx.restore();
  }

  function drawCMOSNandTransistors(ctx, w, h, time, inp, out) {
    drawCMOSAndTransistors(ctx, w, h, time, inp, out);
  }
  function drawNandGateSchematic(ctx, w, h, time, inp, out) {
    drawAndGateSchematic(ctx, w, h, time, inp, out);
  }
  function drawCMOSNorTransistors(ctx, w, h, time, inp, out) {
    drawCMOSAndTransistors(ctx, w, h, time, inp, out);
  }
  function drawNorGateSchematic(ctx, w, h, time, inp, out) {
    drawOrGateSchematic(ctx, w, h, time, inp, out);
  }

  // --- 8. D FLIP-FLOP SCHEMATIC ---
  function drawDFlipFlopSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const dVal = inp.d || 0;
    const clkVal = inp.clk || 0;
    const qVal = out.q || 0;

    // Master Latch Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 180, cy - 80, 160, 160, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('MASTER LATCH', cx - 150, cy - 55);

    // Slave Latch Box
    roundRect(ctx, cx + 20, cy - 80, 160, 160, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillText('SLAVE LATCH', cx + 55, cy - 55);

    // Inputs
    drawPinNode(ctx, 60, cy - 30, `DATA (D) = ${dVal}`, dVal, false);
    drawPinNode(ctx, 60, cy + 30, `CLOCK (CLK) = ${clkVal}`, clkVal, false);

    // Dynamic Clock Edge Wedge
    ctx.strokeStyle = '#00F0FF';
    ctx.beginPath();
    ctx.moveTo(cx - 180, cy + 20);
    ctx.lineTo(cx - 165, cy + 30);
    ctx.lineTo(cx - 180, cy + 40);
    ctx.stroke();

    // Outputs
    drawPinNode(ctx, w - 60, cy - 30, `Q = ${qVal}`, qVal, true);
    drawPinNode(ctx, w - 60, cy + 30, `Q̄ = ${qVal === 1 ? 0 : 1}`, qVal === 1 ? 0 : 1, true);

    ctx.restore();
  }

  // --- 9. 7-SEGMENT LED DISPLAY SCHEMATIC ---
  function drawSevenSegmentSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const val = out.val !== undefined ? out.val : 0;
    const hexChar = Number(val).toString(16).toUpperCase();

    // Inputs b0..b3
    ['b0', 'b1', 'b2', 'b3'].forEach((b, i) => {
      const bitVal = inp[b] || 0;
      drawPinNode(ctx, 80, cy - 45 + i * 30, `IN ${b.toUpperCase()} = ${bitVal}`, bitVal, false);
    });

    // Central BCD Decoder Matrix Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.8;
    roundRect(ctx, cx - 110, cy - 80, 140, 160, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('BCD-TO-7SEG', cx - 90, cy - 50);
    ctx.fillText('DECODER ROM', cx - 90, cy - 36);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillText('Constant Current', cx - 90, cy - 10);
    ctx.fillText('LED Drivers (15mA)', cx - 90, cy + 4);
    ctx.fillText(`CURRENT: HEX '${hexChar}'`, cx - 90, cy + 26);

    // 7 Segments Output Wires (a..g) to Display Box
    const dispBox = { x: cx + 110, y: cy - 70, w: 90, h: 140 };
    ctx.fillStyle = '#06080F';
    roundRect(ctx, dispBox.x, dispBox.y, dispBox.w, dispBox.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#E11D48';
    ctx.font = '900 64px "JetBrains Mono", monospace';
    ctx.shadowColor = '#FF0055';
    ctx.shadowBlur = 16;
    ctx.fillText(hexChar, dispBox.x + 24, dispBox.y + 95);
    ctx.shadowColor = 'transparent';

    ctx.restore();
  }

  // --- 10. VRAM BANK SCHEMATIC ---
  function drawVRAMBankSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 180, cy - 100, 360, 200, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10B981';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('TOSHIBA TC51V16160FT 16Mb EDO DRAM (INTERNAL)', cx - 160, cy - 75);

    // Row Decoder
    roundRect(ctx, cx - 160, cy - 50, 80, 130, 4);
    ctx.stroke();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText('ROW DECODER', cx - 150, cy - 30);
    ctx.fillText('(1024 Wordlines)', cx - 150, cy - 16);

    // 16Mb DRAM Cell Matrix
    roundRect(ctx, cx - 60, cy - 50, 120, 130, 4);
    ctx.stroke();
    ctx.fillText('1M x 16 SILICON', cx - 50, cy - 30);
    ctx.fillText('DRAM CAP ARRAY', cx - 50, cy - 16);

    // Column Decoder & Sense Amplifiers
    roundRect(ctx, cx + 80, cy - 50, 80, 130, 4);
    ctx.stroke();
    ctx.fillText('SENSE AMPS &', cx + 90, cy - 30);
    ctx.fillText('EDO OUTPUT', cx + 90, cy - 16);

    drawPinNode(ctx, 60, cy - 30, 'RAS# / CAS#', 1, false);
    drawPinNode(ctx, 60, cy + 30, 'ADDR[11:0]', 1, false);
    drawPinNode(ctx, w - 60, cy, 'DQ[15:0] (DATA)', 1, true);

    ctx.restore();
  }

  // --- 11. RAMDAC SCHEMATIC ---
  function drawRAMDACSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    roundRect(ctx, cx - 180, cy - 100, 360, 200, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C084FC';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('ATT20C409 / NV1 135MHz TrueColor RAMDAC', cx - 160, cy - 75);

    // Sub-blocks: CLUT SRAM + Triple DAC
    roundRect(ctx, cx - 150, cy - 40, 120, 110, 4);
    ctx.stroke();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('256x18 CLUT', cx - 140, cy - 20);
    ctx.fillText('SRAM PALETTE', cx - 140, cy - 6);

    roundRect(ctx, cx + 20, cy - 40, 130, 110, 4);
    ctx.stroke();
    ctx.fillText('TRIPLE 8-BIT DACs', cx + 30, cy - 20);
    ctx.fillText('R, G, B (75-OHM)', cx + 30, cy - 6);

    drawPinNode(ctx, 60, cy, 'PIXEL_CLK (135M)', 1, false);
    drawPinNode(ctx, w - 60, cy - 30, 'RED (0-0.7V)', 1, true);
    drawPinNode(ctx, w - 60, cy, 'GREEN (0-0.7V)', 1, true);
    drawPinNode(ctx, w - 60, cy + 30, 'BLUE (0-0.7V)', 1, true);

    ctx.restore();
  }

  // --- 12. AUDIO DSP SCHEMATIC ---
  function drawAudioDSPSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    roundRect(ctx, cx - 180, cy - 90, 360, 180, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('STG-2000 32-VOICE WAVETABLE SYNTHESIZER', cx - 160, cy - 65);

    roundRect(ctx, cx - 150, cy - 30, 120, 90, 4);
    ctx.stroke();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText('32 POLYPHONIC', cx - 140, cy - 10);
    ctx.fillText('NCO OSCILLATORS', cx - 140, cy + 4);

    roundRect(ctx, cx + 20, cy - 30, 130, 90, 4);
    ctx.stroke();
    ctx.fillText('STEREO 16-BIT', cx + 30, cy - 10);
    ctx.fillText('SIGMA-DELTA DAC', cx + 30, cy + 4);

    drawPinNode(ctx, 60, cy, 'CLK (24.576M)', 1, false);
    drawPinNode(ctx, w - 60, cy - 20, 'AUDIO_L (LINE)', 1, true);
    drawPinNode(ctx, w - 60, cy + 20, 'AUDIO_R (LINE)', 1, true);

    ctx.restore();
  }

  // --- 13. PCI BUS SCHEMATIC ---
  function drawPCIBusSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#0B4222';
    roundRect(ctx, cx - 200, cy - 60, 400, 120, 6);
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('PCI LOCAL BUS 2.1 TRANSCEIVER SCHEMATIC', cx - 180, cy - 30);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillText('32-Bit Multiplexed Address & Data Bus // 33.3 MHz Synchronous', cx - 180, cy - 10);
    ctx.fillText('Peak Bandwidth: 133 MB/s // Gold Finger Edge Interface', cx - 180, cy + 6);

    ctx.restore();
  }

  // --- 14. VGA BRACKET SCHEMATIC ---
  function drawVGABracketSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    roundRect(ctx, cx - 180, cy - 100, 360, 200, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('DIAMOND EDGE 3D PCI I/O BRACKET INTERFACE', cx - 160, cy - 75);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('1. 15-PIN D-SUB VGA OUT (ANALOG RGB 75 OHM)', cx - 150, cy - 35);
    ctx.fillStyle = '#22C55E';
    ctx.fillText('2. 3.5mm STEREO LINE-OUT (ACTIVE CD AUDIO)', cx - 150, cy - 5);
    ctx.fillStyle = '#F43F5E';
    ctx.fillText('3. SEGA SATURN 9-PIN DB9 GAMEPAD CONNECTOR', cx - 150, cy + 25);

    ctx.restore();
  }

  // --- 15. SEGA SATURN GAMEPAD SCHEMATIC ---
  function drawSaturnPadSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    roundRect(ctx, cx - 180, cy - 90, 360, 180, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FB7185';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('SEGA SATURN 9-PIN CONTROLLER MATRIX', cx - 160, cy - 65);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillText('Direct TTL Multiplexer: Select[1:0] -> Data[3:0]', cx - 150, cy - 35);
    ctx.fillText('D-Pad (Up, Down, Left, Right)', cx - 150, cy - 15);
    ctx.fillText('6 Face Action Buttons (A, B, C, X, Y, Z) + Start', cx - 150, cy + 5);
    ctx.fillText('Supported Games: Virtua Fighter Remix, Panzer Dragoon', cx - 150, cy + 25);

    ctx.restore();
  }

  // --- 16. QUARTZ CLOCK SCHEMATIC ---
  function drawQuartzClockSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const clkVal = out.out !== undefined ? out.out : (Math.sin(time * 0.01) > 0 ? 1 : 0);

    // Pierce Oscillator Circuit
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.8;

    // Quartz Symbol
    ctx.strokeRect(cx - 50, cy - 25, 20, 50);
    ctx.fillStyle = '#C59B27';
    ctx.fillRect(cx - 38, cy - 20, 4, 40);

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('QUARTZ CRYSTAL (PIERCE OSCILLATOR TANK)', cx - 150, cy - 60);
    ctx.fillText('Y1 14.31818 MHz // HC-49/US CAN', cx - 150, cy - 44);

    // Inverter Buffer
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - 25);
    ctx.lineTo(cx + 80, cy);
    ctx.lineTo(cx + 30, cy + 25);
    ctx.closePath();
    ctx.stroke();

    // Output
    drawPinNode(ctx, w - 80, cy, `CLK OUT = ${clkVal}`, clkVal, true);
    ctx.restore();
  }

  // --- 17. 8-BIT REGISTER ---
  function drawOctalRegisterSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    roundRect(ctx, cx - 180, cy - 90, 360, 180, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('SN74LS374N // OCTAL D-TYPE FLIP-FLOP ARRAY', cx - 160, cy - 65);

    // 8 Bit cells
    for (let i = 0; i < 8; i++) {
      const bx = cx - 160 + i * 40;
      ctx.strokeRect(bx, cy - 30, 32, 60);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText(`D${i}`, bx + 8, cy);
    }

    drawPinNode(ctx, 60, cy - 30, 'DATA_IN [7:0]', 1, false);
    drawPinNode(ctx, 60, cy + 30, 'CLK EDGE', 1, false);
    drawPinNode(ctx, w - 60, cy, 'DATA_OUT [7:0]', 1, true);

    ctx.restore();
  }

  // --- 18. MULTIPLEXER ---
  function drawMultiplexerSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    // Trapezoid MUX Symbol
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 70);
    ctx.lineTo(cx + 40, cy - 40);
    ctx.lineTo(cx + 40, cy + 40);
    ctx.lineTo(cx - 60, cy + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('2:1 DATA MUX', cx - 40, cy);

    drawPinNode(ctx, 80, cy - 40, `INPUT A = ${inp.a || 0}`, inp.a || 0, false);
    drawPinNode(ctx, 80, cy + 40, `INPUT B = ${inp.b || 0}`, inp.b || 0, false);
    drawPinNode(ctx, cx - 10, cy + 85, `SEL = ${inp.sel || 0}`, inp.sel || 0, false);
    drawPinNode(ctx, w - 80, cy, `OUTPUT = ${out.out || 0}`, out.out || 0, true);

    ctx.restore();
  }

  // --- 19. GENERIC BLOCK SCHEMATIC ---
  function drawGenericBlockSchematic(ctx, w, h, time, comp, det) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    roundRect(ctx, cx - 180, cy - 90, 360, 180, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText(`${det.icCode} // ${det.name}`, cx - 160, cy - 65);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(`LOGICKÁ FUNKCE: ${det.internalLogic}`, cx - 150, cy - 35);
    ctx.fillText(`POUZDRO: ${det.package} (${det.technology})`, cx - 150, cy - 15);
    ctx.fillText(`PROPAGAČNÍ ZPOŽDĚNÍ: ${det.propagationDelay}`, cx - 150, cy + 5);
    ctx.fillText(`TRANZISTORY: ${det.transistorCount} MOSFETs`, cx - 150, cy + 25);

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return (
    <div className="w-full flex flex-col items-center select-none">
      <canvas
        ref={canvasRef}
        width={760}
        height={420}
        className="w-full h-[420px] rounded-lg border border-cyan-500/30 bg-[#05080E] shadow-2xl block"
      />
    </div>
  );
}
