import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Cpu,
  Layers,
  Activity,
  Sparkles,
  Volume2,
  VolumeX,
  Plus,
  Terminal,
  Grid,
  ChevronDown,
  FolderOpen,
} from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';

export function Toolbar({
  engine,
  viewMode, // 'schematic' | 'hardware' | 'physics'
  setViewMode,
  showGallery,
  setShowGallery,
  showAsm,
  setShowAsm,
  showWaveform,
  setShowWaveform,
  showAi,
  setShowAi,
  isMuted,
  setIsMuted,
}) {
  const [isRunning, setIsRunning] = useState(engine.isRunning);
  const [activeCategory, setActiveCategory] = useState(null);

  // Synchronize running state with logic engine events
  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setIsRunning(engine.isRunning);
    });
    return () => unsub();
  }, [engine]);

  // Spacebar shortcut to Start/Stop simulation clock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleToggleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleRun = () => {
    if (engine.isRunning) {
      engine.stop();
      setIsRunning(false);
      audioEngine.playRelayClick(0.8);
      audioEngine.updateClockHum(engine.clockFrequency, false);
    } else {
      engine.start();
      setIsRunning(true);
      audioEngine.playRelayClick(1.4);
      audioEngine.updateClockHum(engine.clockFrequency, true);
    }
  };

  const handleStep = () => {
    if (engine.isRunning) {
      engine.stop();
      setIsRunning(false);
    }
    engine.stepClock();
    audioEngine.playRelayClick(1.1);
  };

  const handleToggleMute = () => {
    audioEngine.isMuted = !isMuted;
    setIsMuted(!isMuted);
  };

  const addComponent = (type, label) => {
    audioEngine.playRelayClick(1.0);
    const id = `${type.toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;
    const comp = {
      id,
      type,
      label: label || type,
      x: 140 + Math.random() * 120,
      y: 120 + Math.random() * 90,
      inputs: {},
      outputs: {},
    };

    if (type === 'INPUT') {
      comp.outputs.out = 0;
    } else if (type === 'CLOCK') {
      comp.outputs.out = 0;
    } else if (type === 'NOT') {
      comp.inputs.in = 0;
      comp.outputs.out = 1;
    } else if (['AND', 'OR', 'XOR', 'NAND', 'NOR'].includes(type)) {
      comp.inputs.a = 0;
      comp.inputs.b = 0;
      comp.outputs.out = 0;
    } else if (type === 'D_FF') {
      comp.inputs.d = 0;
      comp.inputs.clk = 0;
      comp.outputs.q = 0;
      comp.outputs.nq = 1;
    } else if (type === 'REGISTER_8BIT') {
      comp.inputs.d = 0;
      comp.inputs.clk = 0;
      comp.inputs.we = 1;
      comp.outputs.q = 0;
    } else if (type === 'RAM') {
      comp.inputs.addr = 0;
      comp.inputs.din = 0;
      comp.inputs.we = 0;
      comp.inputs.clk = 0;
      comp.outputs.dout = 0;
    } else if (type === 'ROM') {
      comp.inputs.addr = 0;
      comp.outputs.dout = 0;
    } else if (type === 'VIRTUAL_SCREEN') {
      comp.inputs.x = 0;
      comp.inputs.y = 0;
      comp.inputs.color = 0x1F;
      comp.inputs.we = 1;
      comp.inputs.clk = 0;
      comp.outputs = {};
      comp.vram = new Uint8Array(64 * 64);
    } else if (type === 'MUX') {
      comp.inputs.a = 0;
      comp.inputs.b = 0;
      comp.inputs.sel = 0;
      comp.outputs.out = 0;
    } else if (type === 'PROBE') {
      comp.inputs.in = 0;
      comp.outputs.val = 0;
    }

    engine.addComponent(comp);
    setActiveCategory(null);
  };

  const COMPONENT_GROUPS = [
    {
      name: 'LOGIC GATES',
      items: [
        { type: 'AND', label: 'AND Gate', desc: 'Dual Input AND' },
        { type: 'OR', label: 'OR Gate', desc: 'Dual Input OR' },
        { type: 'XOR', label: 'XOR Gate', desc: 'Dual Input XOR' },
        { type: 'NOT', label: 'Inverter', desc: 'Single Input NOT' },
        { type: 'NAND', label: 'NAND Gate', desc: 'Negated AND' },
        { type: 'NOR', label: 'NOR Gate', desc: 'Negated OR' },
      ],
    },
    {
      name: 'SEQUENTIAL & MEMORY',
      items: [
        { type: 'D_FF', label: 'D Flip-Flop', desc: 'Clocked D Latch' },
        { type: 'REGISTER_8BIT', label: '8-Bit Register', desc: 'Octal D Register' },
        { type: 'RAM', label: 'SRAM 32KB', desc: 'Static Random Access' },
        { type: 'ROM', label: 'EEPROM 64KB', desc: 'Read Only Memory' },
      ],
    },
    {
      name: 'I/O & BUS ROUTING',
      items: [
        { type: 'INPUT', label: 'Logic Switch', desc: 'Digital State Source' },
        { type: 'CLOCK', label: 'Oscillator', desc: 'Square Wave Pulse' },
        { type: 'MUX', label: '2:1 Multiplexer', desc: 'Data Path Selector' },
        { type: 'PROBE', label: 'Logic Probe', desc: 'Signal Level Meter' },
        { type: 'VIRTUAL_SCREEN', label: 'CRT Display', desc: '64x64 Dual-Port VRAM' },
      ],
    },
  ];

  return (
    <div className="h-12 bg-[#080B12] border-b border-[#161D2B] px-3.5 flex items-center justify-between select-none font-mono text-xs z-30 shrink-0">
      {/* 1. Tri-State View Switcher */}
      <div className="flex items-center space-x-3">
        {/* Leftmost Gallery Drawer Toggle Button */}
        <button
          onClick={() => setShowGallery(!showGallery)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
            showGallery
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'bg-[#0A0E17] text-gray-300 border-[#1A2333] hover:bg-[#121824] hover:text-white'
          }`}
          title="Circuit Gallery, Presets & Cloud / JSON Storage"
        >
          <FolderOpen size={12} className={showGallery ? 'text-cyan-400' : 'text-gray-400'} />
          <span>GALLERY</span>
        </button>

        <div className="h-4 w-px bg-[#161D2B]" />

        <div className="flex items-center bg-[#04060A] border border-[#161D2B] p-0.5 rounded-md">
          <button
            onClick={() => setViewMode('schematic')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-all ${
              viewMode === 'schematic'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Clean IEEE/ANSI Technical Logic Gate Schematic"
          >
            <Grid size={12} />
            <span>SCHEMATIC</span>
          </button>

          <button
            onClick={() => setViewMode('hardware')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-all ${
              viewMode === 'hardware'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Realistic PCB with DIP ICs, Metallic Pins & Moving Electrons"
          >
            <Cpu size={12} />
            <span>HARDWARE PCB</span>
          </button>

          <button
            onClick={() => setViewMode('physics')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-all ${
              viewMode === 'physics'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="3D Silicon Die Physical Polysilicon Layers & Thermal Map"
          >
            <Layers size={12} />
            <span>SILICON DIE 3D</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#161D2B]" />

        {/* 2. Modular Component Adder Dropdowns */}
        <div className="flex items-center space-x-1 relative">
          {COMPONENT_GROUPS.map((group) => {
            const isOpen = activeCategory === group.name;
            return (
              <div key={group.name} className="relative">
                <button
                  onClick={() => setActiveCategory(isOpen ? null : group.name)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] transition-colors border ${
                    isOpen
                      ? 'bg-[#121824] text-cyan-400 border-cyan-500/40'
                      : 'bg-[#0A0E17] text-gray-300 border-[#1A2333] hover:bg-[#121824] hover:text-white'
                  }`}
                >
                  <Plus size={11} className="text-cyan-400" />
                  <span>{group.name}</span>
                  <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div className="absolute top-8 left-0 w-52 bg-[#090D16] border border-[#1E283D] rounded-lg shadow-2xl py-1 z-50 backdrop-blur-xl">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-gray-500 tracking-wider border-b border-[#141C2B]">
                      {group.name}
                    </div>
                    {group.items.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => addComponent(item.type, item.label)}
                        className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/10 hover:text-cyan-400 text-gray-300 transition-colors flex items-center justify-between group"
                      >
                        <span className="font-semibold text-[11px]">{item.label}</span>
                        <span className="text-[9px] text-gray-500 group-hover:text-cyan-500/70 font-mono">
                          {item.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Clock & Simulation Pulse Controls */}
      <div className="flex items-center space-x-2 bg-[#04060A] border border-[#161D2B] px-2.5 py-1 rounded-md">
        <button
          onClick={handleToggleRun}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded font-bold text-[11px] transition-all cursor-pointer ${
            isRunning
              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
          }`}
          title="Spustit / Zastavit hodiny (Mezerník)"
        >
          {isRunning ? <Pause size={12} className="text-rose-400" /> : <Play size={12} className="text-emerald-400" />}
          <span>{isRunning ? 'HALT (STOP)' : 'RUN (START)'}</span>
        </button>

        <button
          onClick={handleStep}
          disabled={isRunning}
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#0C101A] hover:bg-[#141B2B] text-gray-300 rounded border border-[#1A2333] disabled:opacity-30 text-[11px] cursor-pointer"
          title="Krokovat o 1 takt"
        >
          <SkipForward size={11} />
          <span>STEP</span>
        </button>

        <div className="h-3 w-px bg-[#161D2B]" />

        <div className="flex items-center space-x-1.5 text-gray-400 text-[10px]">
          <span>RATE:</span>
          <select
            value={engine.clockFrequency}
            onChange={(e) => engine.setFrequency(Number(e.target.value))}
            className="bg-[#0C101A] border border-[#1A2333] text-cyan-400 px-1.5 py-0.5 rounded outline-none text-[11px]"
          >
            <option value={1}>1 Hz</option>
            <option value={5}>5 Hz</option>
            <option value={10}>10 Hz</option>
            <option value={50}>50 Hz</option>
            <option value={200}>200 Hz</option>
            <option value={1000}>1 kHz</option>
          </select>
        </div>
      </div>

      {/* 4. Right Tools: AI Copilot, Custom ISA Monaco, Oscilloscope, Audio */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => setShowAi(!showAi)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-[11px] transition-all ${
            showAi
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
              : 'bg-[#0A0E17] text-gray-400 border-[#1A2333] hover:text-white hover:bg-[#121824]'
          }`}
          title="AI Logic Copilot & Verifier"
        >
          <Sparkles size={12} className={showAi ? 'text-cyan-400' : 'text-gray-400'} />
          <span>AI COPILOT</span>
        </button>

        <button
          onClick={() => setShowAsm(!showAsm)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-[11px] transition-all ${
            showAsm
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
              : 'bg-[#0A0E17] text-gray-400 border-[#1A2333] hover:text-white hover:bg-[#121824]'
          }`}
          title="Custom ISA Compiler & Assembler"
        >
          <Terminal size={12} />
          <span>ASSEMBLER</span>
        </button>

        <button
          onClick={() => setShowWaveform(!showWaveform)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-[11px] transition-all ${
            showWaveform
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
              : 'bg-[#0A0E17] text-gray-400 border-[#1A2333] hover:text-white hover:bg-[#121824]'
          }`}
          title="Digital Oscilloscope & Logic Waveform Analyzer"
        >
          <Activity size={12} />
          <span>WAVEFORM</span>
        </button>

        <button
          onClick={handleToggleMute}
          className="p-1.5 bg-[#0A0E17] text-gray-400 hover:text-white border border-[#1A2333] rounded transition-colors"
          title={isMuted ? 'Zapnout haptický zvuk' : 'Ztlumit zvuk'}
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>
    </div>
  );
}
