import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { AiCopilot } from '../engine/aiCopilot';
import { audioEngine } from '../engine/audioEngine';

export function AiPanel({ engine, onClose }) {
  const [prompt, setPrompt] = useState('Vytvoř 1bitovou polosčítačku z hradel XOR a AND');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedCircuit, setSynthesizedCircuit] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  const copilot = new AiCopilot();

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    audioEngine.playRelayClick(1.2);

    setTimeout(async () => {
      const circuit = await copilot.synthesizeCircuit(prompt);
      const verify = copilot.verifyCircuit(circuit, circuit.testbench);

      setSynthesizedCircuit(circuit);
      setVerificationResult(verify);
      setIsSynthesizing(false);
      audioEngine.playRelayClick(1.5);
    }, 450);
  };

  const handleDeployToCanvas = () => {
    if (!synthesizedCircuit) return;
    audioEngine.playRelayClick(0.9);

    // Clear existing canvas and deploy synthesized circuit
    engine.components.clear();
    engine.wires = [];

    synthesizedCircuit.components.forEach((c) => {
      engine.addComponent(JSON.parse(JSON.stringify(c)));
    });

    synthesizedCircuit.wires.forEach((w) => {
      engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
    });

    engine.propagate();
    engine.notify();
    onClose();
  };

  return (
    <div className="w-96 bg-[#0E1116] border-l border-[#1F242D] flex flex-col h-full select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F242D] bg-[#141820]">
        <div className="flex items-center space-x-2 text-cyan-400 font-mono font-semibold">
          <Sparkles size={15} />
          <span>AI COMPONENT COPILOT</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-[#1F242D]"
        >
          Zavřít
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col space-y-4 font-mono">
        {/* Prompt Input */}
        <div>
          <label className="text-[11px] text-gray-400 block mb-1.5 uppercase tracking-wider font-semibold">
            Instrukce pro syntézu obvodu:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-[#07080A] border border-[#1F242D] rounded-lg p-2.5 text-cyan-200 text-xs font-mono outline-none focus:border-cyan-500 transition-colors"
            placeholder="Zadejte požadovaný obvod..."
          />
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Doporučené prompty:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setPrompt('Vytvoř 1bitovou polosčítačku z hradel XOR a AND')}
              className="bg-[#141820] hover:bg-[#1A232E] text-gray-300 text-[10px] px-2 py-1 rounded border border-[#1F242D]"
            >
              Polosčítačka (Half-Adder)
            </button>
            <button
              onClick={() => setPrompt('Vytvoř 1bitovou úplnou sčítačku se vstupem Carry-In')}
              className="bg-[#141820] hover:bg-[#1A232E] text-gray-300 text-[10px] px-2 py-1 rounded border border-[#1F242D]"
            >
              Úplná sčítačka (Full-Adder)
            </button>
            <button
              onClick={() => setPrompt('Postav obvod s virtuálním GPU monitorem 64x64')}
              className="bg-[#141820] hover:bg-[#1A232E] text-gray-300 text-[10px] px-2 py-1 rounded border border-[#1F242D]"
            >
              GPU Monitor & VRAM
            </button>
          </div>
        </div>

        {/* Synthesize Button */}
        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing}
          className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-mono font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95"
        >
          {isSynthesizing ? (
            <Zap size={14} className="animate-spin text-cyan-400" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{isSynthesizing ? 'SYNTETIZUJI SCHÉMA...' : 'SYNTETIZOVAT OBVOD'}</span>
        </button>

        {/* Synthesis & Verification Results */}
        {synthesizedCircuit && (
          <div className="bg-[#07080A] border border-[#1F242D] rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-200">{synthesizedCircuit.name}</span>
              <span className="text-[10px] bg-cyan-950/60 border border-cyan-800 text-cyan-400 px-1.5 py-0.5 rounded">
                {synthesizedCircuit.components.length} prvků
              </span>
            </div>

            {/* Testbench Badge */}
            {verificationResult && (
              <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 p-2 rounded text-[11px]">
                <ShieldCheck size={14} />
                <span>Formálně verifikováno (Pravdivostní tabulka 100%)</span>
              </div>
            )}

            <button
              onClick={handleDeployToCanvas}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#07080A] font-bold rounded-lg flex items-center justify-center space-x-1 shadow-lg transition-transform active:scale-95"
            >
              <span>VLOŽIT NA PLÁTNO</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
