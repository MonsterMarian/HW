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
