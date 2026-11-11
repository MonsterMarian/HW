// Assembler vlastní ISA: kódování odpovídá formátu instrukcí a chybný vstup hlásí chybu (neořezává potichu).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsaAssembler, DEFAULT_ISA } from '../src/engine/isaAssembler.js';

const asm = (src) => [...new IsaAssembler().assemble(src).bytecode.slice(0, src.split('\n').filter((l) => l.split(';')[0].replace(/^\s*\w+:\s*/, '').trim()).length)];

describe('assembler', () => {
  it('každý formát instrukce má právě 8 bitů', () => {
    for (const ins of DEFAULT_ISA.instructions) {
      const bits = ins.format.split(' ').reduce((n, f) => n + (f.startsWith('{') ? Number(f.match(/:(\d+)/)[1]) : f.length), 0);
      assert.equal(bits, 8, ins.mnemonic);
    }
  });

  it('kóduje instrukce a návěští (i na stejném řádku jako instrukce)', () => {
    assert.deepEqual(asm('LDI R1, 3\nloop: ADD R1, R2\nPIX R1, R2\nJMP loop'), [0x17, 0x36, 0x96, 0x71]);
  });

  it('hodnota mimo rozsah, neznámý registr nebo návěští je chyba', () => {
    assert.throws(() => asm('LDI R1, 5'), /rozsah/);
    assert.throws(() => asm('LDI R7, 1'), /registr/);
    assert.throws(() => asm('ADD R1, 5'), /registr/);
    assert.throws(() => asm('JMP nikam'), /návěští/);
    assert.throws(() => asm('JMP 20'), /rozsah/);
  });
});

import { LogicEngine } from '../src/engine/logicEngine.js';
import { PRESET_CIRCUITS } from '../src/engine/aiCopilot.js';
import { findSubcircuit } from '../src/engine/hierarchicalSubcircuits.js';

describe('galerie a drill-down', () => {
  it('ukázka DMA → VRAM + IRQ: po startu zkopíruje řádek 64 pixelů z ROM a ohlásí přerušení', () => {
    const e = new LogicEngine();
    e.loadCircuit(PRESET_CIRCUITS.dma_irq_demo);
    const c = (id) => e.components.get(id);
    assert.equal(c('p_mul').inputs.in, 144);
    assert.equal(c('p_rot').inputs.in, 0x03);
    assert.equal(c('p_fpu').inputs.in, 0x4380); // 1,5 + 2,25 = 3,75 v binary16
    c('start').outputs.out = 1; e.propagate();
    for (let i = 0; i < 2 * 70; i++) e.step();
    const vram = c('screen').vram;
    assert.deepEqual([...vram.slice(10 * 64, 10 * 64 + 4)], [0, 4, 8, 12]);
    assert.equal(vram[10 * 64 + 63], 252);
    assert.equal(vram[11 * 64], 0);
    assert.equal(c('irq').outputs.int, 1);
  });

  it('DEMUX má hradlový drill-down, který se chová jako primitiv', () => {
    const sub = findSubcircuit({ id: 'x', type: 'DEMUX' }, [{ id: 'root', level: 4 }]);
    assert.ok(sub, 'DEMUX drill');
    const e = new LogicEngine();
    e.loadCircuit(sub);
    const set = (id, v) => { e.components.get(id).outputs.out = v; e.propagate(); };
    for (const [d, s, o0, o1] of [[1, 0, 1, 0], [1, 1, 0, 1], [0, 0, 0, 0], [0, 1, 0, 0]]) {
      set('dmx_in', d); set('dmx_sel', s);
      assert.deepEqual([e.components.get('dmx_o0').inputs.in, e.components.get('dmx_o1').inputs.in], [o0, o1], `in=${d} sel=${s}`);
    }
  });
});

describe('vnitřní schémata bloků z plánu počítají správně', () => {
  const load = (type) => { const e = new LogicEngine(); e.loadCircuit(findSubcircuit({ id: 'x', type }, [{ id: 'root', level: 1 }])); return e; };
  const pin = (e, id) => e.components.get(id).inputs.in;
  const set = (e, id, v) => { e.components.get(id).outputs.out = v; e.propagate(); };

  it('násobička 2 × 2: všech 16 kombinací', () => {
    const e = load('MULTIPLIER_8BIT');
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      set(e, 'a0', a & 1); set(e, 'a1', a >> 1); set(e, 'b0', b & 1); set(e, 'b1', b >> 1);
      assert.equal([0, 1, 2, 3].reduce((p, i) => p | (pin(e, `p${i}`) << i), 0), a * b, `${a} × ${b}`);
    }
  });

  it('barrel shifter 4 bity: rotace doleva o 0–3', () => {
    const e = load('BARREL_SHIFTER_8BIT');
    for (let s = 0; s < 4; s++) {
      set(e, 's0', s & 1); set(e, 's1', s >> 1);
      assert.equal([0, 1, 2, 3].reduce((p, i) => p | (pin(e, `y${i}`) << i), 0), 1 << s, `o ${s}`);
    }
  });

  it('řadič přerušení: pulz se zachytí, nižší linka má přednost, maska linku skryje', () => {
    const e = load('IRQ_CONTROLLER');
    assert.equal(pin(e, 'int'), 0);
    set(e, 'irq2', 1); set(e, 'irq2', 0);
    assert.deepEqual([pin(e, 'int'), pin(e, 'vec1'), pin(e, 'vec0')], [1, 1, 0]);
    set(e, 'irq1', 1);
    assert.deepEqual([pin(e, 'vec1'), pin(e, 'vec0')], [0, 1]);
    set(e, 'm1', 0);
    assert.deepEqual([pin(e, 'vec1'), pin(e, 'vec0')], [1, 0]);
  });

  it('řadič DMA: projde LEN adres a ohlásí konec', () => {
    const e = load('DMA_CONTROLLER');
    e.run(40);
    assert.deepEqual([pin(e, 'raddr'), pin(e, 'waddr'), pin(e, 'irq'), pin(e, 'we')], [0x14, 0x84, 1, 0]);
  });

  it('MMIO dekodér: jen 0xFxxx jde do GPU', () => {
    const e = load('MMIO_DECODER');
    assert.deepEqual([pin(e, 'sel'), pin(e, 'io_we'), pin(e, 'mem_we')], [1, 1, 0]);
    set(e, 'a13', 0);
    assert.deepEqual([pin(e, 'sel'), pin(e, 'io_we'), pin(e, 'mem_we')], [0, 0, 1]);
  });
});
