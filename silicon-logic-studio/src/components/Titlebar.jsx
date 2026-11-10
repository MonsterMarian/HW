import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export function Titlebar({ circuitTitle }) {
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
      className="h-9 w-full bg-(--bg-dark) border-b border-(--line) flex items-center justify-between pl-3 select-none z-50 shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: název aplikace */}
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="w-2 h-2 bg-(--accent-amber) self-center shrink-0" />
        <span className="text-[13px] font-extrabold uppercase tracking-tight text-(--text-light)">Silicon Logic</span>
        <span className="serif-accent text-[15px]">studio</span>
      </div>

      {/* Middle: aktuální obvod */}
      <div className="meta hidden md:block truncate px-4 min-w-0">
        {circuitTitle && <><span className="text-gray-600">Obvod&nbsp;/&nbsp;</span><span className="text-gray-300">{circuitTitle}</span></>}
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          title="Minimalizovat"
          className="w-10 flex items-center justify-center text-gray-500 hover:text-(--text-light) hover:bg-(--bg-card-light) transition-colors"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          title="Maximalizovat"
          className="w-10 flex items-center justify-center text-gray-500 hover:text-(--text-light) hover:bg-(--bg-card-light) transition-colors"
        >
          <Square size={10} />
        </button>
        <button
          onClick={handleClose}
          title="Zavřít"
          className="w-10 flex items-center justify-center text-gray-500 hover:text-(--bg-dark) hover:bg-(--conflict) transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </header>
  );
}
