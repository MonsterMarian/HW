import React, { useState } from 'react';
import { Play, Cpu, Check, AlertCircle } from 'lucide-react';
import { IsaAssembler } from '../engine/isaAssembler';
import { audioEngine } from '../engine/audioEngine';

const SAMPLE_PROGRAM = `; SILICON-8 RISC DEMO PROGRAM
; Vykreslí pixel na virtuální GPU obrazovku a inkrementuje
START:
  LDI R0, 1        ; R0 = barva azurová
  LDI R1, 10       ; R1 = souřadnice X
  LDI R2, 10       ; R2 = souřadnice Y
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
    <div className="w-96 bg-[#0E1116] border-l border-[#1F242D] flex flex-col h-full select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F242D] bg-[#141820]">
        <div className="flex items-center space-x-2 text-cyan-400 font-mono font-semibold">
          <Cpu size={15} />
          <span>CUSTOM ISA & ASSEMBLER</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-[#1F242D]"
        >
          Zavřít
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-3 flex flex-col font-mono">
        <div className="text-[11px] text-gray-500 mb-1.5 flex justify-between">
          <span>ISA: SILICON-8 (4x Reg, 16 Opcodes)</span>
          <span className="text-cyan-400">PC: 0x00</span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full bg-[#07080A] border border-[#1F242D] rounded-lg p-3 text-cyan-200 text-xs font-mono leading-relaxed outline-none resize-none focus:border-cyan-500 transition-colors"
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
      <div className="p-3 border-t border-[#1F242D] bg-[#0E1116] flex justify-end">
        <button
          onClick={handleCompile}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#07080A] font-semibold rounded-lg shadow-lg font-mono transition-all transform active:scale-95"
        >
          <Play size={14} fill="currentColor" />
          <span>COMPILE & FLASH TO ROM</span>
        </button>
      </div>
    </div>
  );
}
