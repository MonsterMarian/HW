import React from 'react';
import { Cpu, Minus, Square, X, ShieldCheck } from 'lucide-react';

export function Titlebar() {
  const handleMinimize = () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('window-minimize');
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleMaximize = () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('window-maximize');
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleClose = () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('window-close');
      } catch (e) {
        window.close();
      }
    } else {
      window.close();
    }
  };

  return (
    <header
      className="h-9 w-full bg-[#050608] border-b border-[#141822] flex items-center justify-between px-3 select-none z-50 shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: Branding & Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu size={12} className="animate-pulse" />
          </div>
          <span className="text-[11px] font-bold tracking-wider font-mono text-gray-200">
            SILICON<span className="text-cyan-400">STUDIO</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
            DESKTOP LAB v2.4
          </span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>SIMD RUST CORE ACTIVE</span>
        </div>
      </div>

      {/* Middle: Subtle instruction / drag space */}
      <div className="hidden md:flex items-center space-x-2 text-[10px] font-mono text-gray-600">
        <ShieldCheck size={11} className="text-cyan-500/60" />
        <span>CYBER-PHYSICAL HARDWARE ACCELERATOR</span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          title="Minimize"
          className="w-7 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={handleMaximize}
          title="Maximize"
          className="w-7 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Square size={10} />
        </button>
        <button
          onClick={handleClose}
          title="Close"
          className="w-7 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </header>
  );
}
