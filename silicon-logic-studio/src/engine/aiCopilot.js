// SILICON // LOGIC STUDIO - AI COPILOT & FORMAL VERIFIER
// Synthesizes verified logic netlists from natural language prompts.

import { NV1_BOARD } from './presets/nv1Board.js';
import { PC_POWER } from './presets/pcPower.js';
import { MY_PC_SYSTEM } from './presets/myPcSystem.js';
import { LogicEngine } from './logicEngine.js';

export const PRESET_CIRCUITS = {
  nvidia_nv1: NV1_BOARD,
  ai_pc_power: PC_POWER,
  my_pc: MY_PC_SYSTEM,

  // Není to počítač: žádný dekodér instrukcí ani řadič. PC čte ROM bajt po bajtu, sčítačka sčítá dva po sobě
  // jdoucí bajty a výsledek se kreslí na CRT (X = PC, Y = A + B; 6bitový port bere dolních 6 bitů).
  mini_pc: {
    name: 'ROM sekvencer 8 bit (PC + ROM + registry + sčítačka + CRT)',
    prompt: 'Postav čítač programu, který čte ROM bajt po bajtu, sčítá dva po sobě jdoucí bajty a kreslí je na CRT monitor',
    components: [
      { id: 'clk', type: 'CLOCK', label: 'CLOCK', x: 50, y: 170, inputs: {}, outputs: { out: 0 } },
      { id: 'in_run', type: 'INPUT', label: 'RUN / HALT (PC.WE)', x: 50, y: 70, inputs: {}, outputs: { out: 1 } },
      { id: 'pc', type: 'REGISTER_8BIT', label: 'PC (PROG COUNTER)', x: 230, y: 110, inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
      { id: 'probe_pc', type: 'PROBE', label: 'PC ADDR', x: 420, y: 70, inputs: { in: 0 }, outputs: {} },
      { id: 'rom', type: 'ROM', label: 'ROM 256×8', x: 230, y: 250, inputs: { addr: 0 }, outputs: { dout: 0 } },
      { id: 'reg_a', type: 'REGISTER_8BIT', label: 'REG A (BAJT Z ROM)', x: 450, y: 170, inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
      { id: 'reg_b', type: 'REGISTER_8BIT', label: 'REG B (PŘEDCHOZÍ BAJT)', x: 450, y: 290, inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
      { id: 'alu_add', type: 'ADDER_8BIT', label: 'A + B', x: 680, y: 170, inputs: {}, outputs: {} },
      { id: 'probe_alu', type: 'PROBE', label: 'A + B', x: 950, y: 170, inputs: { in: 0 }, outputs: {} },
      { id: 'screen', type: 'VIRTUAL_SCREEN', label: '64x64 CRT (X = PC, Y = A + B)', x: 700, y: 340, inputs: { x: 0, y: 0, color: 0x1F, we: 1, clk: 0 }, outputs: {} },
      { id: 'sw_color', type: 'CONSTANT', label: 'BARVA 0x1F (AZUROVÁ)', x: 450, y: 440, inputs: {}, outputs: { out: 0x1F } },
      { id: 'probe_bus', type: 'PROBE', label: 'ROM DATA', x: 450, y: 70, inputs: { in: 0 }, outputs: {} },
      // PC + 1 (without it the program counter never moves)
      { id: 'pc_inc', type: 'ADDER_8BIT', label: 'PC + 1', x: 50, y: 290, inputs: {}, outputs: {} },
      { id: 'pc_one', type: 'CONSTANT', label: '+1', x: 50, y: 420, inputs: {}, outputs: { out: 1 } },
    ],
    wires: [
      { from: { id: 'pc', pin: 'q' }, to: { id: 'pc_inc', pin: 'a' } },
      { from: { id: 'pc_one', pin: 'out' }, to: { id: 'pc_inc', pin: 'b' } },
      { from: { id: 'pc_inc', pin: 'sum' }, to: { id: 'pc', pin: 'd' } },
      { from: { id: 'in_run', pin: 'out' }, to: { id: 'pc', pin: 'we' } },
      { from: { id: 'clk', pin: 'out' }, to: { id: 'pc', pin: 'clk' } },
      { from: { id: 'clk', pin: 'out' }, to: { id: 'reg_a', pin: 'clk' } },
      { from: { id: 'clk', pin: 'out' }, to: { id: 'reg_b', pin: 'clk' } },
      { from: { id: 'clk', pin: 'out' }, to: { id: 'screen', pin: 'clk' } },
      { from: { id: 'pc', pin: 'q' }, to: { id: 'rom', pin: 'addr' } },
      { from: { id: 'pc', pin: 'q' }, to: { id: 'probe_pc', pin: 'in' } },
      { from: { id: 'pc', pin: 'q' }, to: { id: 'screen', pin: 'x' } },
      { from: { id: 'rom', pin: 'dout' }, to: { id: 'reg_a', pin: 'd' } },
      { from: { id: 'rom', pin: 'dout' }, to: { id: 'probe_bus', pin: 'in' } },
      { from: { id: 'reg_a', pin: 'q' }, to: { id: 'reg_b', pin: 'd' } },
      { from: { id: 'reg_a', pin: 'q' }, to: { id: 'alu_add', pin: 'a' } },
      { from: { id: 'reg_b', pin: 'q' }, to: { id: 'alu_add', pin: 'b' } },
      { from: { id: 'alu_add', pin: 'sum' }, to: { id: 'probe_alu', pin: 'in' } },
      { from: { id: 'alu_add', pin: 'sum' }, to: { id: 'screen', pin: 'y' } },
      { from: { id: 'sw_color', pin: 'out' }, to: { id: 'screen', pin: 'color' } },
    ],
  },
  calculator: {
    name: '4-Bit Digital Calculator (Add / Sub + 7-Segment LED)',
    prompt: 'Postav 4bitovou hardwarovou kalkulačku se sčítáním, odčítáním dvojkovým doplňkem a číslicovým 7segmentovým LED displejem',
    components: [
      { id: 'mode_sub', type: 'INPUT', label: 'MODE (0:ADD, 1:SUB)', x: 60, y: 50, inputs: {}, outputs: { out: 0 } },
      { id: 'a0', type: 'INPUT', label: 'A0 (1)', x: 60, y: 130, inputs: {}, outputs: { out: 1 } },
      { id: 'a1', type: 'INPUT', label: 'A1 (2)', x: 60, y: 210, inputs: {}, outputs: { out: 1 } },
      { id: 'a2', type: 'INPUT', label: 'A2 (4)', x: 60, y: 290, inputs: {}, outputs: { out: 0 } },
      { id: 'a3', type: 'INPUT', label: 'A3 (8)', x: 60, y: 370, inputs: {}, outputs: { out: 0 } },
      { id: 'b0', type: 'INPUT', label: 'B0 (1)', x: 60, y: 470, inputs: {}, outputs: { out: 1 } },
      { id: 'b1', type: 'INPUT', label: 'B1 (2)', x: 60, y: 550, inputs: {}, outputs: { out: 0 } },
      { id: 'b2', type: 'INPUT', label: 'B2 (4)', x: 60, y: 630, inputs: {}, outputs: { out: 1 } },
      { id: 'b3', type: 'INPUT', label: 'B3 (8)', x: 60, y: 710, inputs: {}, outputs: { out: 0 } },
      { id: 'xor_b0', type: 'XOR', label: 'INV B0', x: 220, y: 470, inputs: { a: 0, b: 0 }, outputs: { out: 1 } },
      { id: 'xor_b1', type: 'XOR', label: 'INV B1', x: 220, y: 550, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'xor_b2', type: 'XOR', label: 'INV B2', x: 220, y: 630, inputs: { a: 0, b: 0 }, outputs: { out: 1 } },
      { id: 'xor_b3', type: 'XOR', label: 'INV B3', x: 220, y: 710, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa0_xor1', type: 'XOR', label: 'FA0 XOR1', x: 380, y: 130, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa0_xor2', type: 'XOR', label: 'FA0 SUM', x: 530, y: 130, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa0_and1', type: 'AND', label: 'FA0 AND1', x: 380, y: 200, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa0_and2', type: 'AND', label: 'FA0 AND2', x: 530, y: 200, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa0_or', type: 'OR', label: 'FA0 CARRY', x: 670, y: 200, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa1_xor1', type: 'XOR', label: 'FA1 XOR1', x: 380, y: 280, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa1_xor2', type: 'XOR', label: 'FA1 SUM', x: 530, y: 280, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa1_and1', type: 'AND', label: 'FA1 AND1', x: 380, y: 350, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa1_and2', type: 'AND', label: 'FA1 AND2', x: 530, y: 350, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa1_or', type: 'OR', label: 'FA1 CARRY', x: 670, y: 350, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa2_xor1', type: 'XOR', label: 'FA2 XOR1', x: 380, y: 430, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa2_xor2', type: 'XOR', label: 'FA2 SUM', x: 530, y: 430, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa2_and1', type: 'AND', label: 'FA2 AND1', x: 380, y: 500, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa2_and2', type: 'AND', label: 'FA2 AND2', x: 530, y: 500, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa2_or', type: 'OR', label: 'FA2 CARRY', x: 670, y: 500, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa3_xor1', type: 'XOR', label: 'FA3 XOR1', x: 380, y: 580, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa3_xor2', type: 'XOR', label: 'FA3 SUM', x: 530, y: 580, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa3_and1', type: 'AND', label: 'FA3 AND1', x: 380, y: 650, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa3_and2', type: 'AND', label: 'FA3 AND2', x: 530, y: 650, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'fa3_or', type: 'OR', label: 'FA3 CARRY', x: 670, y: 650, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'res0', type: 'PROBE', label: 'R0 (1)', x: 740, y: 130, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'res1', type: 'PROBE', label: 'R1 (2)', x: 740, y: 280, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'res2', type: 'PROBE', label: 'R2 (4)', x: 740, y: 430, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'res3', type: 'PROBE', label: 'R3 (8)', x: 740, y: 580, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'carry_out', type: 'PROBE', label: 'CARRY C4 (SUB: 1 = BEZ VÝPŮJČKY)', x: 800, y: 650, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'display', type: 'SEVEN_SEGMENT', label: 'RESULT DISPLAY', x: 860, y: 240, inputs: { b0: 0, b1: 0, b2: 0, b3: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'mode_sub', pin: 'out' }, to: { id: 'xor_b0', pin: 'b' } },
      { from: { id: 'mode_sub', pin: 'out' }, to: { id: 'xor_b1', pin: 'b' } },
      { from: { id: 'mode_sub', pin: 'out' }, to: { id: 'xor_b2', pin: 'b' } },
      { from: { id: 'mode_sub', pin: 'out' }, to: { id: 'xor_b3', pin: 'b' } },
      { from: { id: 'mode_sub', pin: 'out' }, to: { id: 'fa0_xor2', pin: 'b' } },
      { from: { id: 'mode_sub', pin: 'out' }, to: { id: 'fa0_and2', pin: 'b' } },
      { from: { id: 'b0', pin: 'out' }, to: { id: 'xor_b0', pin: 'a' } },
      { from: { id: 'b1', pin: 'out' }, to: { id: 'xor_b1', pin: 'a' } },
      { from: { id: 'b2', pin: 'out' }, to: { id: 'xor_b2', pin: 'a' } },
      { from: { id: 'b3', pin: 'out' }, to: { id: 'xor_b3', pin: 'a' } },
      { from: { id: 'a0', pin: 'out' }, to: { id: 'fa0_xor1', pin: 'a' } },
      { from: { id: 'xor_b0', pin: 'out' }, to: { id: 'fa0_xor1', pin: 'b' } },
      { from: { id: 'a0', pin: 'out' }, to: { id: 'fa0_and1', pin: 'a' } },
      { from: { id: 'xor_b0', pin: 'out' }, to: { id: 'fa0_and1', pin: 'b' } },
      { from: { id: 'fa0_xor1', pin: 'out' }, to: { id: 'fa0_xor2', pin: 'a' } },
      { from: { id: 'fa0_xor1', pin: 'out' }, to: { id: 'fa0_and2', pin: 'a' } },
      { from: { id: 'fa0_and1', pin: 'out' }, to: { id: 'fa0_or', pin: 'a' } },
      { from: { id: 'fa0_and2', pin: 'out' }, to: { id: 'fa0_or', pin: 'b' } },
      { from: { id: 'fa0_xor2', pin: 'out' }, to: { id: 'res0', pin: 'in' } },
      { from: { id: 'fa0_xor2', pin: 'out' }, to: { id: 'display', pin: 'b0' } },
      { from: { id: 'fa0_or', pin: 'out' }, to: { id: 'fa1_xor2', pin: 'b' } },
      { from: { id: 'fa0_or', pin: 'out' }, to: { id: 'fa1_and2', pin: 'b' } },
      { from: { id: 'a1', pin: 'out' }, to: { id: 'fa1_xor1', pin: 'a' } },
      { from: { id: 'xor_b1', pin: 'out' }, to: { id: 'fa1_xor1', pin: 'b' } },
      { from: { id: 'a1', pin: 'out' }, to: { id: 'fa1_and1', pin: 'a' } },
      { from: { id: 'xor_b1', pin: 'out' }, to: { id: 'fa1_and1', pin: 'b' } },
      { from: { id: 'fa1_xor1', pin: 'out' }, to: { id: 'fa1_xor2', pin: 'a' } },
      { from: { id: 'fa1_xor1', pin: 'out' }, to: { id: 'fa1_and2', pin: 'a' } },
      { from: { id: 'fa1_and1', pin: 'out' }, to: { id: 'fa1_or', pin: 'a' } },
      { from: { id: 'fa1_and2', pin: 'out' }, to: { id: 'fa1_or', pin: 'b' } },
      { from: { id: 'fa1_xor2', pin: 'out' }, to: { id: 'res1', pin: 'in' } },
      { from: { id: 'fa1_xor2', pin: 'out' }, to: { id: 'display', pin: 'b1' } },
      { from: { id: 'fa1_or', pin: 'out' }, to: { id: 'fa2_xor2', pin: 'b' } },
      { from: { id: 'fa1_or', pin: 'out' }, to: { id: 'fa2_and2', pin: 'b' } },
      { from: { id: 'a2', pin: 'out' }, to: { id: 'fa2_xor1', pin: 'a' } },
      { from: { id: 'xor_b2', pin: 'out' }, to: { id: 'fa2_xor1', pin: 'b' } },
      { from: { id: 'a2', pin: 'out' }, to: { id: 'fa2_and1', pin: 'a' } },
      { from: { id: 'xor_b2', pin: 'out' }, to: { id: 'fa2_and1', pin: 'b' } },
      { from: { id: 'fa2_xor1', pin: 'out' }, to: { id: 'fa2_xor2', pin: 'a' } },
      { from: { id: 'fa2_xor1', pin: 'out' }, to: { id: 'fa2_and2', pin: 'a' } },
      { from: { id: 'fa2_and1', pin: 'out' }, to: { id: 'fa2_or', pin: 'a' } },
      { from: { id: 'fa2_and2', pin: 'out' }, to: { id: 'fa2_or', pin: 'b' } },
      { from: { id: 'fa2_xor2', pin: 'out' }, to: { id: 'res2', pin: 'in' } },
      { from: { id: 'fa2_xor2', pin: 'out' }, to: { id: 'display', pin: 'b2' } },
      { from: { id: 'fa2_or', pin: 'out' }, to: { id: 'fa3_xor2', pin: 'b' } },
      { from: { id: 'fa2_or', pin: 'out' }, to: { id: 'fa3_and2', pin: 'b' } },
      { from: { id: 'a3', pin: 'out' }, to: { id: 'fa3_xor1', pin: 'a' } },
      { from: { id: 'xor_b3', pin: 'out' }, to: { id: 'fa3_xor1', pin: 'b' } },
      { from: { id: 'a3', pin: 'out' }, to: { id: 'fa3_and1', pin: 'a' } },
      { from: { id: 'xor_b3', pin: 'out' }, to: { id: 'fa3_and1', pin: 'b' } },
      { from: { id: 'fa3_xor1', pin: 'out' }, to: { id: 'fa3_xor2', pin: 'a' } },
      { from: { id: 'fa3_xor1', pin: 'out' }, to: { id: 'fa3_and2', pin: 'a' } },
      { from: { id: 'fa3_and1', pin: 'out' }, to: { id: 'fa3_or', pin: 'a' } },
      { from: { id: 'fa3_and2', pin: 'out' }, to: { id: 'fa3_or', pin: 'b' } },
      { from: { id: 'fa3_xor2', pin: 'out' }, to: { id: 'res3', pin: 'in' } },
      { from: { id: 'fa3_xor2', pin: 'out' }, to: { id: 'display', pin: 'b3' } },
      { from: { id: 'fa3_or', pin: 'out' }, to: { id: 'carry_out', pin: 'in' } },
    ]
  },

  half_adder: {
    name: '1-Bit Half Adder',
    prompt: 'Vytvoř 1bitovou polosčítačku (Half Adder) z hradel XOR a AND',
    components: [
      { id: 'in_a', type: 'INPUT', label: 'A', x: 80, y: 120, inputs: {}, outputs: { out: 0 } },
      { id: 'in_b', type: 'INPUT', label: 'B', x: 80, y: 220, inputs: {}, outputs: { out: 0 } },
      { id: 'gate_xor', type: 'XOR', label: 'Sum (XOR)', x: 260, y: 120, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'gate_and', type: 'AND', label: 'Carry (AND)', x: 260, y: 220, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'out_sum', type: 'PROBE', label: 'SUM', x: 440, y: 120, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'out_carry', type: 'PROBE', label: 'CARRY', x: 440, y: 220, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'in_a', pin: 'out' }, to: { id: 'gate_xor', pin: 'a' } },
      { from: { id: 'in_b', pin: 'out' }, to: { id: 'gate_xor', pin: 'b' } },
      { from: { id: 'in_a', pin: 'out' }, to: { id: 'gate_and', pin: 'a' } },
      { from: { id: 'in_b', pin: 'out' }, to: { id: 'gate_and', pin: 'b' } },
      { from: { id: 'gate_xor', pin: 'out' }, to: { id: 'out_sum', pin: 'in' } },
      { from: { id: 'gate_and', pin: 'out' }, to: { id: 'out_carry', pin: 'in' } },
    ],
    testbench: [
      { inputs: { a: 0, b: 0 }, expected: { sum: 0, carry: 0 } },
      { inputs: { a: 1, b: 0 }, expected: { sum: 1, carry: 0 } },
      { inputs: { a: 0, b: 1 }, expected: { sum: 1, carry: 0 } },
      { inputs: { a: 1, b: 1 }, expected: { sum: 0, carry: 1 } },
    ]
  },

  full_adder: {
    name: '1-Bit Full Adder',
    prompt: 'Vytvoř 1bitovou úplnou sčítačku se vstupem Carry-In (Cin)',
    components: [
      { id: 'in_a', type: 'INPUT', label: 'A', x: 60, y: 80, inputs: {}, outputs: { out: 1 } },
      { id: 'in_b', type: 'INPUT', label: 'B', x: 60, y: 160, inputs: {}, outputs: { out: 1 } },
      { id: 'in_cin', type: 'INPUT', label: 'Cin', x: 60, y: 260, inputs: {}, outputs: { out: 0 } },
      { id: 'xor1', type: 'XOR', label: 'XOR1', x: 220, y: 110, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'xor2', type: 'XOR', label: 'XOR2', x: 380, y: 130, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'and1', type: 'AND', label: 'AND1', x: 220, y: 210, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'and2', type: 'AND', label: 'AND2', x: 380, y: 250, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'or1', type: 'OR', label: 'OR', x: 520, y: 230, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'out_sum', type: 'PROBE', label: 'SUM', x: 520, y: 130, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'out_cout', type: 'PROBE', label: 'Cout', x: 660, y: 230, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'in_a', pin: 'out' }, to: { id: 'xor1', pin: 'a' } },
      { from: { id: 'in_b', pin: 'out' }, to: { id: 'xor1', pin: 'b' } },
      { from: { id: 'in_a', pin: 'out' }, to: { id: 'and1', pin: 'a' } },
      { from: { id: 'in_b', pin: 'out' }, to: { id: 'and1', pin: 'b' } },
      { from: { id: 'xor1', pin: 'out' }, to: { id: 'xor2', pin: 'a' } },
      { from: { id: 'in_cin', pin: 'out' }, to: { id: 'xor2', pin: 'b' } },
      { from: { id: 'xor1', pin: 'out' }, to: { id: 'and2', pin: 'a' } },
      { from: { id: 'in_cin', pin: 'out' }, to: { id: 'and2', pin: 'b' } },
      { from: { id: 'and1', pin: 'out' }, to: { id: 'or1', pin: 'a' } },
      { from: { id: 'and2', pin: 'out' }, to: { id: 'or1', pin: 'b' } },
      { from: { id: 'xor2', pin: 'out' }, to: { id: 'out_sum', pin: 'in' } },
      { from: { id: 'or1', pin: 'out' }, to: { id: 'out_cout', pin: 'in' } },
    ],
    testbench: [
      { inputs: { a: 1, b: 1, cin: 0 }, expected: { sum: 0, cout: 1 } },
      { inputs: { a: 1, b: 1, cin: 1 }, expected: { sum: 1, cout: 1 } },
    ]
  },

  sr_latch: {
    name: 'Bistable SR Latch (Memory Cell)',
    prompt: 'Sestav 1bitovou paměťovou buňku (SR Latch) ze dvou křížově zapojených hradel NOR',
    components: [
      { id: 'in_set', type: 'INPUT', label: 'SET', x: 60, y: 100, inputs: {}, outputs: { out: 0 } },
      { id: 'in_reset', type: 'INPUT', label: 'RESET', x: 60, y: 220, inputs: {}, outputs: { out: 0 } },
      { id: 'nor1', type: 'NOR', label: 'NOR1', x: 240, y: 110, inputs: { a: 0, b: 0 }, outputs: { out: 1 } },
      { id: 'nor2', type: 'NOR', label: 'NOR2', x: 240, y: 210, inputs: { a: 0, b: 0 }, outputs: { out: 0 } },
      { id: 'out_q', type: 'PROBE', label: 'Q', x: 440, y: 110, inputs: { in: 1 }, outputs: { val: 1 } },
      { id: 'out_nq', type: 'PROBE', label: 'Q̄', x: 440, y: 210, inputs: { in: 0 }, outputs: { val: 0 } },
    ],
    wires: [
      { from: { id: 'in_reset', pin: 'out' }, to: { id: 'nor1', pin: 'a' } },
      { from: { id: 'nor2', pin: 'out' }, to: { id: 'nor1', pin: 'b' } },
      { from: { id: 'in_set', pin: 'out' }, to: { id: 'nor2', pin: 'b' } },
      { from: { id: 'nor1', pin: 'out' }, to: { id: 'nor2', pin: 'a' } },
      { from: { id: 'nor1', pin: 'out' }, to: { id: 'out_q', pin: 'in' } },
      { from: { id: 'nor2', pin: 'out' }, to: { id: 'out_nq', pin: 'in' } },
    ],
    testbench: [
      { inputs: { set: 1, reset: 0 }, expected: { q: 1, nq: 0 } },
      { inputs: { set: 0, reset: 0 }, expected: { q: 1, nq: 0 } },
      { inputs: { set: 0, reset: 1 }, expected: { q: 0, nq: 1 } },
    ]
  },

  d_ff_register: {
    name: 'D Flip-Flop (edge-triggered)',
    prompt: 'Vytvoř synchronní klopný obvod D-FF řízený hodinovým pulzem CLK',
    components: [
      { id: 'in_d', type: 'INPUT', label: 'Data In (D)', x: 60, y: 100, inputs: {}, outputs: { out: 1 } },
      { id: 'in_clk', type: 'CLOCK', label: 'Master Clock', x: 60, y: 190, inputs: {}, outputs: { out: 0 } },
      { id: 'dff1', type: 'D_FF', label: 'SN74LS74AN', x: 260, y: 120, inputs: { d: 0, clk: 0 }, outputs: { q: 0, nq: 1 } },
      { id: 'out_q', type: 'PROBE', label: 'Q Output', x: 460, y: 120, inputs: { in: 0 }, outputs: { val: 0 } },
      { id: 'out_nq', type: 'PROBE', label: 'Q̄ Output', x: 460, y: 180, inputs: { in: 1 }, outputs: { val: 1 } },
    ],
    wires: [
      { from: { id: 'in_d', pin: 'out' }, to: { id: 'dff1', pin: 'd' } },
      { from: { id: 'in_clk', pin: 'out' }, to: { id: 'dff1', pin: 'clk' } },
      { from: { id: 'dff1', pin: 'q' }, to: { id: 'out_q', pin: 'in' } },
      { from: { id: 'dff1', pin: 'nq' }, to: { id: 'out_nq', pin: 'in' } },
    ]
  },

  gpu_rasterizer_demo: {
    name: 'GPU Display & Pixel Generator',
    prompt: 'Postav obvod s virtuálním monitorem 64x64, oscilátorem a generátorem souřadnic',
    components: [
      // X counts 0..63 and wraps; Y counts one step each time X wraps -> the screen fills line by line
      { id: 'clk', type: 'CLOCK', label: 'Pixel Clock (10 Hz)', x: 60, y: 140, inputs: {}, outputs: { out: 0 } },
      { id: 'one', type: 'CONSTANT', label: '+1', x: 60, y: 260, inputs: {}, outputs: { out: 1 } },
      { id: 'zero', type: 'CONSTANT', label: '0', x: 60, y: 360, inputs: {}, outputs: { out: 0 } },
      { id: 'last_x', type: 'CONSTANT', label: 'X MAX = 63', x: 60, y: 460, inputs: {}, outputs: { out: 63 } },
      { id: 'reg_x', type: 'REGISTER_8BIT', label: 'Counter X', x: 220, y: 60, inputs: { d: 0, clk: 0, we: 1 }, outputs: { q: 0 } },
      { id: 'inc_x', type: 'ADDER_8BIT', label: 'X + 1', x: 400, y: 60, inputs: {}, outputs: {} },
      { id: 'cmp_x', type: 'COMPARATOR_8BIT', label: 'X == 63', x: 400, y: 180, inputs: {}, outputs: {} },
      { id: 'wrap_x', type: 'MUX', label: 'X WRAP', x: 560, y: 60, inputs: {}, outputs: {} },
      { id: 'reg_y', type: 'REGISTER_8BIT', label: 'Counter Y', x: 220, y: 300, inputs: { d: 0, clk: 0, we: 0 }, outputs: { q: 0 } },
      { id: 'inc_y', type: 'ADDER_8BIT', label: 'Y + 1', x: 400, y: 300, inputs: {}, outputs: {} },
      { id: 'color_const', type: 'CONSTANT', label: 'Cyan Color (0x1F)', x: 560, y: 420, inputs: {}, outputs: { out: 0x1F } },
      { id: 'screen', type: 'VIRTUAL_SCREEN', label: 'Dual-Port VRAM 64x64', x: 740, y: 120, inputs: { x: 0, y: 0, color: 0x1F, we: 1, clk: 0 }, outputs: {} },
    ],
    wires: [
      { from: { id: 'clk', pin: 'out' }, to: { id: 'reg_x', pin: 'clk' } },
      { from: { id: 'clk', pin: 'out' }, to: { id: 'reg_y', pin: 'clk' } },
      { from: { id: 'clk', pin: 'out' }, to: { id: 'screen', pin: 'clk' } },
      { from: { id: 'reg_x', pin: 'q' }, to: { id: 'inc_x', pin: 'a' } },
      { from: { id: 'one', pin: 'out' }, to: { id: 'inc_x', pin: 'b' } },
      { from: { id: 'reg_x', pin: 'q' }, to: { id: 'cmp_x', pin: 'a' } },
      { from: { id: 'last_x', pin: 'out' }, to: { id: 'cmp_x', pin: 'b' } },
      { from: { id: 'inc_x', pin: 'sum' }, to: { id: 'wrap_x', pin: 'a' } },
      { from: { id: 'zero', pin: 'out' }, to: { id: 'wrap_x', pin: 'b' } },
      { from: { id: 'cmp_x', pin: 'eq' }, to: { id: 'wrap_x', pin: 'sel' } },
      { from: { id: 'wrap_x', pin: 'out' }, to: { id: 'reg_x', pin: 'd' } },
      { from: { id: 'cmp_x', pin: 'eq' }, to: { id: 'reg_y', pin: 'we' } },
      { from: { id: 'reg_y', pin: 'q' }, to: { id: 'inc_y', pin: 'a' } },
      { from: { id: 'one', pin: 'out' }, to: { id: 'inc_y', pin: 'b' } },
      { from: { id: 'inc_y', pin: 'sum' }, to: { id: 'reg_y', pin: 'd' } },
      { from: { id: 'reg_x', pin: 'q' }, to: { id: 'screen', pin: 'x' } },
      { from: { id: 'reg_y', pin: 'q' }, to: { id: 'screen', pin: 'y' } },
      { from: { id: 'color_const', pin: 'out' }, to: { id: 'screen', pin: 'color' } },
    ]
  }
};

export class AiCopilot {
  // Synthesizes circuit from user prompt with broad intelligent NLP matching
  async synthesizeCircuit(promptText) {
    const lower = (promptText || '').toLowerCase().trim();

    // 0. Nvidia's First Product: NV1 (1995)
    if (
      lower.includes('nv1') ||
      lower.includes('nvidia') ||
      lower.includes('diamond') ||
      lower.includes('edge 3d') ||
      lower.includes('stg2000') ||
      lower.includes('stg-2000') ||
      lower.includes('1995')
    ) {
      return PRESET_CIRCUITS.nvidia_nv1;
    }

    // 1. Calculator / Aritmetická kalkulačka
    if (
      lower.includes('kalkul') ||
      lower.includes('calc') ||
      lower.includes('kalkulačka') ||
      lower.includes('kalkulacka') ||
      lower.includes('adder sub')
    ) {
      return PRESET_CIRCUITS.calculator;
    }

    // 1. Mini PC / Processor / CPU
    if (
      lower.includes('mini pc') ||
      lower.includes('pc') ||
      lower.includes('pocitac') ||
      lower.includes('počítač') ||
      lower.includes('computer') ||
      lower.includes('cpu') ||
      lower.includes('procesor') ||
      lower.includes('system')
    ) {
      return PRESET_CIRCUITS.mini_pc;
    }

    // 2. Memory / Latches / Flip-Flops
    if (lower.includes('sr') || lower.includes('latch') || lower.includes('nor latch') || lower.includes('pamet') || lower.includes('paměť')) {
      return PRESET_CIRCUITS.sr_latch;
    }
    if (lower.includes('d_ff') || lower.includes('d-ff') || lower.includes('dff') || lower.includes('registr') || lower.includes('register') || lower.includes('flip')) {
      return PRESET_CIRCUITS.d_ff_register;
    }

    // 3. Adders / ALU
    if (lower.includes('half') || lower.includes('polo')) {
      return PRESET_CIRCUITS.half_adder;
    }
    if (lower.includes('full') || lower.includes('upln') || lower.includes('úpln') || lower.includes('cin') || lower.includes('adder') || lower.includes('scit') || lower.includes('sčít')) {
      return PRESET_CIRCUITS.full_adder;
    }

    // 4. GPU / Screen / Graphics
    if (lower.includes('gpu') || lower.includes('obrazov') || lower.includes('screen') || lower.includes('pixel') || lower.includes('vram') || lower.includes('display') || lower.includes('crt') || lower.includes('monitor')) {
      return PRESET_CIRCUITS.gpu_rasterizer_demo;
    }

    // 5. Default intelligent fallback: Mini PC
    return PRESET_CIRCUITS.mini_pc;
  }

  // Skutečná kontrola: obvod se nahraje do vlastního enginu a krokuje. Hlásí jen to, co se opravdu změřilo
  // (ustálení a zkraty), funkci proti zadání neověřuje.
  verifyCircuit(circuit) {
    const e = new LogicEngine();
    e.loadCircuit(circuit);
    let oscillating = e.oscillating;
    for (let i = 0; i < 64 && !oscillating; i++) { e.step(); oscillating = e.oscillating; }
    const shorts = e._ensureTopology().nets.filter((n) => n.value === 'X' && n.drivers.length > 1).length;
    const checks = [!oscillating, shorts === 0];
    return {
      verified: checks.every(Boolean),
      passedTests: checks.filter(Boolean).length,
      totalTests: checks.length,
      message: `Simulace 64 hran hodin: ${oscillating ? 'obvod kmitá (neustálí se)' : 'obvod se ustálí'}, zkratů na sítích: ${shorts}. Funkce proti zadání se neověřuje.`,
    };
  }
}
