import React, { useRef, useEffect, useState } from 'react';
import { WireState } from '../engine/logicEngine';

// Barvy a písma plátna (vzhled podle portfolia: obsidián, jantar = logická 1 / výběr)
const THEME = {
  bg: '#010102',
  panel: 'rgba(3, 5, 7, 0.94)',
  grid: 'rgba(113, 117, 121, 0.22)',
  gridMajor: 'rgba(113, 117, 121, 0.3)',
  high: '#FFA909',          // logická 1, aktivní signál, výběr
  highRgb: '255, 169, 9',
  highDim: '#B87A08',
  low: '#495766',           // logická 0 – tlumená šedomodrá
  highZ: '#606368',         // vysoká impedance – kreslí se přerušovaně
  conflict: '#DE3B3D',      // zkrat / konflikt budičů
  stroke: '#8A8E93',        // obrys schematických značek
  label: '#ADAAA7',
  muted: '#717579',
  text: '#EDEBE7',
  mono: '"Courier New", monospace',
  sans: '"Outfit", sans-serif',
};


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
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, width, height);

      // Technical Grid Lines
      const grid = 20;
      ctx.strokeStyle = 'rgba(113, 117, 121, 0.08)';
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
      ctx.strokeStyle = THEME.gridMajor;
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
      ctx.fillStyle = `rgba(${THEME.highRgb}, 0.06)`;
      ctx.font = `900 24px ${THEME.mono}`;
      ctx.fillText(`${details.icCode} // INTERNAL SCHEMATIC`, 20, 36);

      // Render schematic according to component type & viewType ('gate' vs 'transistor')
      const type = component.type;
      const inp = component.inputs || {};
      const out = component.outputs || {};

      if (type === 'AND') {
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
    if (val === 1) return THEME.high;
    if (val === WireState.HIGH_Z) return '#F59E0B';
    return '#1E2C42';
  }

  function drawPulseDot(ctx, x1, y1, x2, y2, time, speed = 0.002, color = '#FFFFFF') {
    const t = ((time * speed) % 1);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    ctx.fillStyle = color;
    ctx.shadowColor = THEME.high;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  }

  function drawPinNode(ctx, x, y, label, val, isOut = false) {
    const isHigh = val === 1;
    ctx.save();
    ctx.strokeStyle = isHigh ? THEME.high : '#334155';
    ctx.fillStyle = isHigh ? THEME.high : '#080C14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHigh ? THEME.high : THEME.label;
    ctx.font = `700 9px ${THEME.mono}`;
    ctx.fillText(label, isOut ? x + 8 : x - ctx.measureText(label).width - 8, y + 3);
    ctx.restore();
  }

  // --- 2. AND GATE SCHEMATIC ---
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

    ctx.fillStyle = `rgba(${THEME.highRgb}, 0.08)`;
    ctx.strokeStyle = THEME.high;
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
    ctx.fillStyle = THEME.bg;
    ctx.beginPath();
    ctx.arc(nandX + nandW + bubbleR, cy, bubbleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.label;
    ctx.font = `700 9px ${THEME.mono}`;
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
    ctx.font = `700 8px ${THEME.mono}`;
    ctx.fillText(`NOT(A·B) = ${nandVal}`, midX1 + 10, cy - 10);

    // STAGE 2: INVERTER (NOT)
    const notX = midX2;
    const notW = 55;
    const notH = 60;

    ctx.fillStyle = `rgba(${THEME.highRgb}, 0.08)`;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(notX, cy - notH / 2);
    ctx.lineTo(notX + notW, cy);
    ctx.lineTo(notX, cy + notH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.bg;
    ctx.beginPath();
    ctx.arc(notX + notW + bubbleR, cy, bubbleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.label;
    ctx.font = `700 8px ${THEME.mono}`;
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
    ctx.font = `700 10px ${THEME.mono}`;
    ctx.fillText('VDD (+5.0V SUPPLY RAIL)', 130, 62);

    // GND (0V) Rail at Bottom
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(120, h - 70);
    ctx.lineTo(w - 120, h - 70);
    ctx.stroke();
    ctx.fillStyle = '#3B82F6';
    ctx.font = `700 10px ${THEME.mono}`;
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
    ctx.fillStyle = conducts ? `rgba(${THEME.highRgb}, 0.2)` : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = conducts ? THEME.high : '#475569';
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
      ctx.fillStyle = THEME.bg;
      ctx.beginPath();
      ctx.arc(x - 18, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = conducts ? THEME.high : THEME.label;
    ctx.font = `700 8px ${THEME.mono}`;
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

    ctx.fillStyle = `rgba(${THEME.highRgb}, 0.08)`;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(norX, cy - norH / 2);
    ctx.quadraticCurveTo(norX + norW * 0.5, cy - norH / 2, norX + norW, cy);
    ctx.quadraticCurveTo(norX + norW * 0.5, cy + norH / 2, norX, cy + norH / 2);
    ctx.quadraticCurveTo(norX + 18, cy, norX, cy - norH / 2);
    ctx.fill();
    ctx.stroke();

    // Bubble
    ctx.fillStyle = THEME.bg;
    ctx.beginPath();
    ctx.arc(norX + norW + 5, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.label;
    ctx.font = `700 8px ${THEME.mono}`;
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

    ctx.fillStyle = `rgba(${THEME.highRgb}, 0.08)`;
    ctx.strokeStyle = THEME.high;
    ctx.beginPath();
    ctx.moveTo(notX, cy - 25);
    ctx.lineTo(notX + 50, cy);
    ctx.lineTo(notX, cy + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.bg;
    ctx.beginPath();
    ctx.arc(notX + 55, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.label;
    ctx.font = `700 8px ${THEME.mono}`;
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
    ctx.fillStyle = THEME.panel;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 180, cy - 100, 360, 200, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.high;
    ctx.font = `700 11px ${THEME.mono}`;
    ctx.fillText('4-NAND GATE EQUIVALENT XOR MATRIX', cx - 160, cy - 78);

    // NAND 1
    ctx.fillStyle = `rgba(${THEME.highRgb}, 0.1)`;
    roundRect(ctx, cx - 150, cy - 35, 70, 70, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = THEME.text;
    ctx.font = `700 9px ${THEME.mono}`;
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
    ctx.fillStyle = `rgba(${THEME.highRgb}, 0.1)`;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 40);
    ctx.lineTo(cx + 40, cy);
    ctx.lineTo(cx - 40, cy + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Circle
    ctx.fillStyle = THEME.bg;
    ctx.beginPath();
    ctx.arc(cx + 48, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.label;
    ctx.font = `700 9px ${THEME.mono}`;
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
    ctx.font = `700 10px ${THEME.mono}`;
    ctx.fillText('VDD (+5V)', 160, 62);

    // GND Rail
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(150, h - 70);
    ctx.lineTo(w - 150, h - 70);
    ctx.stroke();
    ctx.fillStyle = '#3B82F6';
    ctx.font = `700 10px ${THEME.mono}`;
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
    ctx.fillStyle = THEME.panel;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 180, cy - 80, 160, 160, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.high;
    ctx.font = `700 11px ${THEME.mono}`;
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
    ctx.strokeStyle = THEME.high;
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
    // hodnotu skládá ze vstupů b0..b3 (výstup `val` už součástka nemá)
    const val = ['b0', 'b1', 'b2', 'b3'].reduce((a, b, i) => a | ((inp[b] === 1 ? 1 : 0) << i), 0);
    const hexChar = Number(val).toString(16).toUpperCase();

    // Inputs b0..b3
    ['b0', 'b1', 'b2', 'b3'].forEach((b, i) => {
      const bitVal = inp[b] || 0;
      drawPinNode(ctx, 80, cy - 45 + i * 30, `IN ${b.toUpperCase()} = ${bitVal}`, bitVal, false);
    });

    // Central BCD Decoder Matrix Box
    ctx.fillStyle = THEME.panel;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 1.8;
    roundRect(ctx, cx - 110, cy - 80, 140, 160, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.high;
    ctx.font = `700 10px ${THEME.mono}`;
    ctx.fillText('BCD-TO-7SEG', cx - 90, cy - 50);
    ctx.fillText('DECODER ROM', cx - 90, cy - 36);

    ctx.fillStyle = THEME.label;
    ctx.font = `500 8px ${THEME.mono}`;
    ctx.fillText('Constant Current', cx - 90, cy - 10);
    ctx.fillText('LED Drivers (15mA)', cx - 90, cy + 4);
    ctx.fillText(`CURRENT: HEX '${hexChar}'`, cx - 90, cy + 26);

    // 7 Segments Output Wires (a..g) to Display Box
    const dispBox = { x: cx + 110, y: cy - 70, w: 90, h: 140 };
    ctx.fillStyle = THEME.bg;
    roundRect(ctx, dispBox.x, dispBox.y, dispBox.w, dispBox.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#E11D48';
    ctx.font = `900 64px ${THEME.mono}`;
    ctx.shadowColor = '#FF0055';
    ctx.shadowBlur = 16;
    ctx.fillText(hexChar, dispBox.x + 24, dispBox.y + 95);
    ctx.shadowColor = 'transparent';

    ctx.restore();
  }

  // --- 16. QUARTZ CLOCK SCHEMATIC ---
  function drawQuartzClockSchematic(ctx, w, h, time, inp, out) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const clkVal = out.out !== undefined ? out.out : (Math.sin(time * 0.01) > 0 ? 1 : 0);

    // Pierce Oscillator Circuit
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 1.8;

    // Quartz Symbol
    ctx.strokeRect(cx - 50, cy - 25, 20, 50);
    ctx.fillStyle = '#C59B27';
    ctx.fillRect(cx - 38, cy - 20, 4, 40);

    ctx.fillStyle = THEME.high;
    ctx.font = `700 10px ${THEME.mono}`;
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
    ctx.fillStyle = THEME.panel;
    ctx.strokeStyle = THEME.highDim;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.highDim;
    ctx.font = `700 12px ${THEME.mono}`;
    ctx.fillText('SN74LS374N // OCTAL D-TYPE FLIP-FLOP ARRAY', cx - 160, cy - 65);

    // 8 Bit cells
    for (let i = 0; i < 8; i++) {
      const bx = cx - 160 + i * 40;
      ctx.strokeRect(bx, cy - 30, 32, 60);
      ctx.fillStyle = THEME.label;
      ctx.font = `700 8px ${THEME.mono}`;
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
    ctx.fillStyle = THEME.panel;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 70);
    ctx.lineTo(cx + 40, cy - 40);
    ctx.lineTo(cx + 40, cy + 40);
    ctx.lineTo(cx - 60, cy + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.high;
    ctx.font = `700 10px ${THEME.mono}`;
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
    ctx.fillStyle = THEME.panel;
    ctx.strokeStyle = THEME.high;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.high;
    ctx.font = `700 12px ${THEME.mono}`;
    ctx.fillText(`${det.icCode} // ${det.name}`, cx - 160, cy - 65);

    ctx.fillStyle = THEME.text;
    ctx.font = `600 10px ${THEME.mono}`;
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
        className="w-full h-[420px] rounded-lg border border-cyan-500/30 bg-(--bg-card) shadow-2xl block"
      />
    </div>
  );
}
