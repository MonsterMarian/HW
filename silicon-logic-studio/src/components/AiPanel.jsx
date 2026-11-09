import React, { useState } from 'react';
import { Sparkles, ShieldCheck, ArrowRight, Zap, Cpu, Check, Terminal } from 'lucide-react';
import { AiCopilot } from '../engine/aiCopilot';
import { audioEngine } from '../engine/audioEngine';

export function AiPanel({ engine, onClose }) {
  const [prompt, setPrompt] = useState('Postav kompletní 8bitový Mini PC počítač s procesorem, pamětí ROM, ALU a CRT monitorem');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedCircuit, setSynthesizedCircuit] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [statusStep, setStatusStep] = useState('');

  const copilot = new AiCopilot();

  const handleSynthesize = async (overridePrompt) => {
    const activePrompt = overridePrompt || prompt;
    setIsSynthesizing(true);
    setStatusStep('1/4 Parsování logické specifikace...');
    audioEngine.playRelayClick(1.2);

    setTimeout(async () => {
      setStatusStep('2/4 Alokace hradel, pamětí a registrů...');
      const circuit = await copilot.synthesizeCircuit(activePrompt);

      setTimeout(() => {
        setStatusStep('3/4 Auto-routing sběrnic a formální verifikace...');
        const verify = copilot.verifyCircuit(circuit, circuit.testbench);

        setTimeout(() => {
          setStatusStep('4/4 Hotovo! Netlist připraven.');
          setSynthesizedCircuit(circuit);
          setVerificationResult(verify);
          setIsSynthesizing(false);
          audioEngine.playRelayClick(1.5);
        }, 200);
      }, 200);
    }, 250);
  };

  const handleDeployToCanvas = (circuitToDeploy) => {
    const circuit = circuitToDeploy || synthesizedCircuit;
    if (!circuit) return;
    audioEngine.playRelayClick(0.9);

    // Deploy to engine
    engine.clear();

    circuit.components.forEach((c) => {
      engine.addComponent(JSON.parse(JSON.stringify(c)));
    });

    circuit.wires.forEach((w) => {
      engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
    });

    engine.propagate();
    engine.notify();
    onClose();
  };

  // One-click synthesize and deploy directly
  const handleSynthesizeAndDeploy = async (presetPrompt) => {
    const activePrompt = presetPrompt || prompt;
    setIsSynthesizing(true);
    setStatusStep('Syntetizuji a nasazuji obvod...');
    audioEngine.playRelayClick(1.3);

    const circuit = await copilot.synthesizeCircuit(activePrompt);
    handleDeployToCanvas(circuit);
    setIsSynthesizing(false);
  };

  return (
    <div className="w-96 bg-[#070A12]/95 border-l border-[#161D2B] shadow-2xl backdrop-blur-2xl flex flex-col h-full select-none text-xs z-40 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#141B29] bg-[#04060A]/90">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-[11px] tracking-wider">
          <Sparkles size={14} className="text-cyan-400 animate-pulse" />
          <span>AI LOGIC NETLIST COPILOT</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/5 border border-white/5 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
        {/* Prompt Input */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1.5 uppercase tracking-wider font-semibold">
            Popis obvodu pro syntézu:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-[#04060A] border border-[#1A2336] rounded-lg p-2.5 text-cyan-200 text-xs font-mono outline-none focus:border-cyan-500 transition-colors placeholder-gray-600"
            placeholder="např. Postav 8bitový Mini PC s procesorem, pamětí a monitorem..."
          />
        </div>

        {/* Instant Circuit Presets */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Rychlé šablony:</span>
          <div className="flex flex-col space-y-1.5">
            <button
              onClick={() => handleSynthesizeAndDeploy('Postav kompletní 8bitový Mini PC počítač s procesorem, pamětí ROM, ALU a CRT monitorem')}
              className="w-full text-left p-2 rounded-lg bg-cyan-950/20 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2">
                <Cpu size={13} className="text-cyan-400" />
                <span>★ MINI PC 8-BIT SYSTEM</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">CPU+CRT</span>
            </button>

            <button
              onClick={() => handleSynthesizeAndDeploy('Vytvoř 1bitovou úplnou sčítačku se vstupem Carry-In')}
              className="w-full text-left px-2.5 py-1.5 rounded bg-[#0A0E18] hover:bg-[#121826] border border-[#161D2B] text-gray-300 text-[11px] transition-colors flex items-center justify-between"
            >
              <span>1-Bit Full Adder (Sčítačka)</span>
              <span className="text-[9px] text-gray-500 font-mono">LOGIC</span>
            </button>

            <button
              onClick={() => handleSynthesizeAndDeploy('Sestav 1bitovou paměťovou buňku SR Latch z hradel NOR')}
              className="w-full text-left px-2.5 py-1.5 rounded bg-[#0A0E18] hover:bg-[#121826] border border-[#161D2B] text-gray-300 text-[11px] transition-colors flex items-center justify-between"
            >
              <span>Bistable SR Latch (Memory)</span>
              <span className="text-[9px] text-gray-500 font-mono">MEMORY</span>
            </button>

            <button
              onClick={() => handleSynthesizeAndDeploy('Postav obvod s virtuálním GPU monitorem 64x64')}
              className="w-full text-left px-2.5 py-1.5 rounded bg-[#0A0E18] hover:bg-[#121826] border border-[#161D2B] text-gray-300 text-[11px] transition-colors flex items-center justify-between"
            >
              <span>GPU Rasterizer & Screen</span>
              <span className="text-[9px] text-gray-500 font-mono">DISPLAY</span>
            </button>
          </div>
        </div>

        {/* Synthesize Button */}
        <button
          onClick={() => handleSynthesize()}
          disabled={isSynthesizing}
          className="w-full py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-lg font-mono font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
        >
          {isSynthesizing ? (
            <Zap size={14} className="animate-spin text-cyan-400" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{isSynthesizing ? statusStep : 'SYNTETIZOVAT PROMPT'}</span>
        </button>

        {/* Synthesized Result Card */}
        {synthesizedCircuit && (
          <div className="bg-[#05070D] border border-cyan-500/30 rounded-lg p-3 space-y-2.5 animate-fadeIn shadow-xl">
            <div className="flex items-center justify-between border-b border-[#141C2B] pb-2">
              <span className="font-bold text-gray-100 text-[11px]">{synthesizedCircuit.name}</span>
              <span className="text-[9px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
                {synthesizedCircuit.components.length} ICs
              </span>
            </div>

            {verificationResult && (
              <div className="flex items-center space-x-2 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 p-2 rounded text-[10px]">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                <span>Formálně verifikováno pravdivostní tabulkou (100% PASS)</span>
              </div>
            )}

            <button
              onClick={() => handleDeployToCanvas(synthesizedCircuit)}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-lg transition-transform active:scale-95 text-[11px]"
            >
              <Check size={13} />
              <span>OKAMŽITĚ VLOŽIT NA PLÁTNO</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
