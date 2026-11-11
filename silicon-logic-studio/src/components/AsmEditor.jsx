import React, { useState } from 'react';
import { Play, Cpu, Check, AlertCircle, X } from 'lucide-react';
import { IsaAssembler } from '../engine/isaAssembler';
import { audioEngine } from '../engine/audioEngine';

const SAMPLE_PROGRAM = `; SILICON-8 RISC DEMO PROGRAM
; Kreslí úhlopříčku: pixel (X, Y), pak X i Y o 1 dál
; (LDI umí jen hodnoty 0-3: instrukce má 8 bitů)
START:
  LDI R0, 1        ; R0 = krok 1
  LDI R1, 2        ; R1 = souřadnice X
  LDI R2, 2        ; R2 = souřadnice Y
LOOP:
  PIX R1, R2       ; Vykresli pixel (X, Y)
  ADD R1, R0       ; X = X + 1
  ADD R2, R0       ; Y = Y + 1
  JMP LOOP         ; Opakuj smyčku
`;

export function AsmEditor({ engine, onClose }) {
  const [code, setCode] = useState(SAMPLE_PROGRAM);
  const [status, setStatus] = useState(null);
  const assembler = new IsaAssembler();

  const handleCompile = () => {
    try {
      const { bytecode, parsedInstructions } = assembler.assemble(code);
      audioEngine.playRelayClick(1.4);

      // Flash into all ROM components on canvas
      let romFound = false;
      for (const comp of engine.components.values()) {
        if (comp.type === 'ROM') {
          comp.memory = new Uint8Array(bytecode);
          romFound = true;
        }
      }

      setStatus({
        success: true,
        message: `Úspěšně zkompilováno (${parsedInstructions.length} instrukcí). ${
          romFound ? 'Zapsáno do ROM paměti!' : 'Tip: Vložte ROM blok pro spuštění.'
        }`,
      });
      engine.notify();
    } catch (err) {
      audioEngine.playConflictBuzz();
      setStatus({ success: false, message: err.message });
    }
  };

  return (
    <div className="w-96 bg-(--bg-dark) border-l border-(--line) flex flex-col h-full select-none text-xs">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-(--line)">
        <div className="flex items-baseline gap-2">
          <Cpu size={13} className="text-(--accent-amber) self-center" />
          <span className="panel-title">Assembler</span>
          <span className="serif-accent text-[13px]">vlastní ISA</span>
        </div>
        <button onClick={onClose} title="Zavřít" className="text-gray-500 hover:text-(--accent-amber) p-1">
          <X size={14} />
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-3 flex flex-col font-mono">
        <div className="text-[11px] text-gray-500 mb-1.5 flex justify-between">
          <span>ISA: SILICON-8 (4 registry, 11 instrukcí, 8 bitů)</span>
          <span className="text-cyan-400">ROM 256 B</span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full bg-(--bg-card) border border-(--line) rounded-lg p-3 text-cyan-200 text-xs font-mono leading-relaxed outline-none resize-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Status banner */}
      {status && (
        <div
          className={`mx-3 mb-2 p-2.5 rounded-lg flex items-center space-x-2 font-mono text-[11px] ${
            status.success
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800 text-rose-300'
          }`}
        >
          {status.success ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{status.message}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-(--line) bg-(--bg-card-light) flex justify-end">
        <button
          onClick={handleCompile}
          className="flex items-center gap-2 px-4 py-2 bg-(--accent-amber) hover:bg-cyan-300 text-(--bg-dark) font-bold tracking-[0.1em] font-mono transition-colors"
        >
          <Play size={14} fill="currentColor" />
          <span>COMPILE & FLASH TO ROM</span>
        </button>
      </div>
    </div>
  );
}
