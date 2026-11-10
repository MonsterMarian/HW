import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
} from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { DEVICES } from '../engine/devices/index.js';
import { fmtTime } from '../views/canvas/theme';

// Poměr simulovaného a reálného času: "×2.0" rychleji, "1/2 400" pomaleji
function fmtRatio(r, running) {
  if (!running) return 'STOJÍ';
  if (!r) return '—';
  if (r >= 1) return `×${r.toFixed(1)} REÁL`;
  return `1/${Math.round(1 / r).toLocaleString('cs-CZ')} REÁL`;
}

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
  showDiagnostic,
  setShowDiagnostic,
  isMuted,
  setIsMuted,
}) {
  const [isRunning, setIsRunning] = useState(engine.isRunning);
  const [freq, setFreq] = useState(engine.clockFrequency);
  const [activeCategory, setActiveCategory] = useState(null);
  const [clock, setClock] = useState({ sim: engine.simTime, ratio: 0 });

  // Synchronize running state with logic engine events
  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setIsRunning(engine.isRunning);
      setFreq(engine.clockFrequency);
    });
    return () => unsub();
  }, [engine]);

  // Simulovaný čas a jeho poměr k reálnému (měřeno po 0,5 s)
  useEffect(() => {
    let last = { sim: engine.simTime, t: performance.now() };
    const id = setInterval(() => {
      const now = performance.now();
      const ratio = engine.isRunning && now > last.t ? (engine.simTime - last.sim) / ((now - last.t) * 1e6) : 0;
      last = { sim: engine.simTime, t: now };
      setClock({ sim: engine.simTime, ratio: Math.max(0, ratio) });
    }, 500);
    return () => clearInterval(id);
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

  // Piny i výchozí stav doplní engine (ensurePins / init zařízení)
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
    if (type === 'CRYSTAL') comp.freqHz = 14.31818e6;
    engine.addComponent(comp);
    setActiveCategory(null);
  };

  // Součástky karty Diamond Edge 3D (modely v engine/devices): název z meta
  const NV1_ITEMS = Object.entries(DEVICES).map(([type, d]) => ({
    type,
    label: `${d.meta.ref} ${d.meta.part.split(' (')[0]}`,
    desc: `${d.meta.pkg} · ${d.meta.desc}`,
  }));

  const COMPONENT_GROUPS = [
    {
      name: 'LOGIC GATES', short: 'GATES',
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
      name: 'SEQUENTIAL & MEMORY', short: 'MEMORY',
      items: [
        { type: 'D_FF', label: 'D Flip-Flop', desc: 'Clocked D Latch' },
        { type: 'REGISTER_8BIT', label: '8-Bit Register', desc: 'Octal D Register' },
        { type: 'RAM', label: 'SRAM 256×8', desc: 'Static Random Access' },
        { type: 'ROM', label: 'ROM 256×8', desc: 'Read Only Memory' },
      ],
    },
    {
      name: 'I/O & BUS ROUTING', short: 'I/O',
      items: [
        { type: 'INPUT', label: 'Logic Switch', desc: 'Digital State Source' },
        { type: 'CLOCK', label: 'Oscillator', desc: 'Square Wave Pulse' },
        { type: 'MUX', label: '2:1 Multiplexer', desc: 'Data Path Selector' },
        { type: 'PROBE', label: 'Logic Probe', desc: 'Signal Level Meter' },
        { type: 'SEVEN_SEGMENT', label: '7-Segment Display', desc: 'Hex/Dec LED Digit Display' },
        { type: 'VIRTUAL_SCREEN', label: 'CRT Display', desc: '64x64 Dual-Port VRAM' },
      ],
    },
    { name: 'DIAMOND EDGE 3D (NV1, 1995)', short: 'NV1', items: NV1_ITEMS },
  ];

  const VIEWS = [
    { id: 'schematic', label: 'SCHEMATIC', Icon: Grid, title: 'Schéma – IEEE/ANSI značky hradel' },
    { id: 'hardware', label: 'PCB', Icon: Cpu, title: 'Hardware PCB – deska s pouzdry DIP/QFP' },
    { id: 'physics', label: 'DIE 3D', Icon: Layers, title: 'Silicon Die 3D – vrstvy křemíku a teplotní mapa' },
  ];

  // Jednotný vzhled tlačítek lišty: ostré hrany, tenká linka, jantar jen pro aktivní stav
  const btn = (active) =>
    `h-7 flex items-center gap-1.5 px-2 border text-[11px] font-bold tracking-[0.08em] whitespace-nowrap transition-colors ${
      active
        ? 'bg-(--accent-amber) border-(--accent-amber) text-(--bg-dark)'
        : 'bg-transparent border-(--line) text-gray-400 hover:text-(--text-light) hover:border-gray-600'
    }`;
  const sep = <div className="h-5 w-px bg-(--line) shrink-0" />;

  return (
    <div className="h-11 bg-(--bg-dark) border-b border-(--line) px-3 flex items-center gap-2.5 select-none font-mono uppercase z-30 shrink-0">
      <button
        onClick={() => setShowGallery(!showGallery)}
        className={btn(showGallery)}
        title="Galerie obvodů, předvolby a úložiště JSON"
      >
        <FolderOpen size={13} />
        <span>GALLERY</span>
      </button>

      {sep}

      {/* Režim zobrazení */}
      <div className="flex items-center" role="group" aria-label="Režim zobrazení">
        {VIEWS.map(({ id, label, Icon, title }, i) => (
          <button
            key={id}
            data-view={id}
            aria-pressed={viewMode === id}
            onClick={() => setViewMode(id)}
            className={`${btn(viewMode === id)} ${i > 0 ? '-ml-px' : ''}`}
            title={title}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {sep}

      {/* Přidání součástek */}
      <div className="flex items-center gap-1">
        {COMPONENT_GROUPS.map((group) => {
          const isOpen = activeCategory === group.name;
          return (
            <div key={group.name} className="relative">
              <button
                onClick={() => setActiveCategory(isOpen ? null : group.name)}
                className={btn(isOpen)}
                title={`Přidat: ${group.name}`}
              >
                <Plus size={12} />
                <span>{group.short}</span>
                <ChevronDown size={11} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute top-8 left-0 w-80 bg-(--bg-dark) border border-gray-700 py-1 z-50 normal-case tracking-normal">
                  <div className="meta px-3 py-1.5 border-b border-(--line)">{group.name}</div>
                  {group.items.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => addComponent(item.type, item.label)}
                      title={item.desc}
                      className="w-full text-left px-3 py-1.5 hover:bg-(--bg-card-light) text-gray-300 hover:text-(--accent-amber) transition-colors flex items-center justify-between gap-3 group"
                    >
                      <span className="font-sans font-semibold text-[13px] truncate">{item.label}</span>
                      <span className="text-[10px] text-gray-600 group-hover:text-(--accent-amber) shrink-0">{item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hodiny simulace */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={handleToggleRun}
          className={`${btn(isRunning)} min-w-[4.6rem] justify-center`}
          title="Spustit / zastavit hodiny (mezerník)"
        >
          {isRunning ? <Pause size={13} /> : <Play size={13} />}
          <span className="max-[1400px]:hidden">{isRunning ? 'HALT' : 'RUN'}</span>
        </button>
        <button
          onClick={handleStep}
          disabled={isRunning}
          className={`${btn(false)} disabled:opacity-30`}
          title="Krokovat o jednu hranu hodin"
        >
          <SkipForward size={12} />
          <span className="max-[1400px]:hidden">STEP</span>
        </button>
        <select
          value={String(freq)}
          onChange={(e) => engine.setFrequency(Number(e.target.value))}
          className="h-7 bg-(--bg-dark) border border-(--line) text-(--accent-amber) px-1.5 outline-none text-[11px] font-bold focus:border-(--accent-amber)"
          title="Rychlost simulace: hrany hodin za sekundu, MAX = co nejrychleji (karta NV1 má reálné takty 33/50/25 MHz)"
        >
          <option value="1">1 Hz</option>
          <option value="5">5 Hz</option>
          <option value="10">10 Hz</option>
          <option value="50">50 Hz</option>
          <option value="200">200 Hz</option>
          <option value="1000">1 kHz</option>
          <option value="Infinity">MAX</option>
        </select>
        <div
          className="h-7 flex flex-col justify-center px-2 border border-(--line) text-[10px] leading-[1.15] tracking-[0.06em] whitespace-nowrap min-w-[6.6rem]"
          title="Simulovaný čas a poměr k reálnému času (1/N = simulace je N× pomalejší než skutečný hardware)"
        >
          <span className="text-(--text-light)">{fmtTime(clock.sim)}</span>
          <span className="text-gray-500">{fmtRatio(clock.ratio, isRunning)}</span>
        </div>
      </div>

      {sep}

      {/* Nástroje */}
      <div className="flex items-center gap-1">
        <button onClick={() => setShowAi(!showAi)} className={btn(showAi)} title="AI Copilot – návrh a ověření obvodu">
          <Sparkles size={13} />
          <span className="max-[1400px]:hidden">AI</span>
        </button>
        <button onClick={() => setShowAsm(!showAsm)} className={btn(showAsm)} title="Assembler vlastní instrukční sady">
          <Terminal size={13} />
          <span className="max-[1400px]:hidden">ASM</span>
        </button>
        <button onClick={() => setShowWaveform(!showWaveform)} className={btn(showWaveform)} title="Logický analyzátor – průběhy signálů">
          <Activity size={13} />
          <span className="max-[1400px]:hidden">WAVE</span>
        </button>
        <button onClick={() => setShowDiagnostic(true)} className={btn(showDiagnostic)} title="Diagnostika a rychlostní test hardwaru">
          <ShieldCheck size={13} />
          <span className="max-[1400px]:hidden">DIAG</span>
        </button>
        <button
          onClick={handleToggleMute}
          className={`${btn(false)} px-2`}
          title={isMuted ? 'Zapnout zvuk' : 'Ztlumit zvuk'}
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>
    </div>
  );
}
