import React, { useRef, useEffect } from 'react';
import { Activity, X } from 'lucide-react';

export function WaveformViewer({ engine, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear dark
      ctx.fillStyle = '#010102';
      ctx.fillRect(0, 0, width, height);

      const entries = Array.from(engine.waveformHistory.entries()).slice(0, 6);
      if (entries.length === 0) {
        ctx.fillStyle = '#717579';
        ctx.font = '600 12px "Courier New", monospace';
        ctx.fillText('Žádné aktivní signály k monitorování (připojte komponenty)', 20, height / 2);
        return;
      }

      const rowHeight = (height - 24) / Math.max(1, entries.length);
      const graphWidth = width - 180;

      // Draw timeline grid
      ctx.strokeStyle = '#121519';
      ctx.lineWidth = 1;
      for (let x = 160; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      entries.forEach(([key, history], rowIdx) => {
        const yTop = 24 + rowIdx * rowHeight;
        const yBase = yTop + rowHeight * 0.8;
        const yHigh = yTop + rowHeight * 0.2;
        const yMid = yTop + rowHeight * 0.5;

        // Channel Label
        ctx.fillStyle = '#ADAAA7';
        ctx.font = '700 11px "Courier New", monospace';
        ctx.fillText(key, 12, yMid + 4);

        // Waveform plot
        ctx.strokeStyle = '#FFA909';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const step = graphWidth / engine.maxWaveformPoints;
        const startX = width - history.length * step;

        for (let i = 0; i < history.length; i++) {
          const val = history[i];
          const px = startX + i * step;
          const py = val === 1 ? yHigh : val === 0 ? yBase : yMid;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            const prevVal = history[i - 1];
            const prevPy = prevVal === 1 ? yHigh : prevVal === 0 ? yBase : yMid;
            // Digital transition edge
            ctx.lineTo(px, prevPy);
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        // Channel divider
        ctx.strokeStyle = '#1A1D21';
        ctx.beginPath();
        ctx.moveTo(0, yTop + rowHeight);
        ctx.lineTo(width, yTop + rowHeight);
        ctx.stroke();
      });
    };

    render();
    const unsub = engine.subscribe(render);
    return () => unsub();
  }, [engine]);

  return (
    <div className="h-44 bg-(--bg-dark) border-t border-(--line) flex flex-col select-none">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-(--line)">
        <div className="flex items-baseline gap-2">
          <Activity size={13} className="text-(--accent-amber) self-center" />
          <span className="panel-title">Logic analyzer</span>
          <span className="serif-accent text-[13px]">průběhy signálů</span>
        </div>
        <div className="meta flex items-center gap-4">
          <span>CLK {engine.clockFrequency} Hz</span>
          <span>TICKS {engine.tickCount}</span>
          <button
            onClick={onClose}
            title="Zavřít"
            className="text-gray-500 hover:text-(--accent-amber) p-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 w-full relative">
        <canvas
          ref={canvasRef}
          width={window.innerWidth || 1000}
          height={140}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
