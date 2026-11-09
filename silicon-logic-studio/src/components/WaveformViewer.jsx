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
      ctx.fillStyle = '#07080A';
      ctx.fillRect(0, 0, width, height);

      const entries = Array.from(engine.waveformHistory.entries()).slice(0, 6);
      if (entries.length === 0) {
        ctx.fillStyle = '#4A5568';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText('Žádné aktivní signály k monitorování (připojte komponenty)', 20, height / 2);
        return;
      }

      const rowHeight = (height - 24) / Math.max(1, entries.length);
      const graphWidth = width - 180;

      // Draw timeline grid
      ctx.strokeStyle = '#12161F';
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
        ctx.fillStyle = '#A0AEC0';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText(key, 12, yMid + 4);

        // Waveform plot
        ctx.strokeStyle = '#00F0FF';
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
        ctx.strokeStyle = '#141820';
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
    <div className="h-44 bg-[#0A0D12] border-t border-[#1F242D] flex flex-col select-none">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0E1116] border-b border-[#1F242D] text-xs">
        <div className="flex items-center space-x-2 text-cyan-400 font-mono font-semibold">
          <Activity size={14} />
          <span>LOGIC ANALYZER // WAVEFORM MONITOR</span>
        </div>
        <div className="flex items-center space-x-4 text-gray-500 font-mono text-[11px]">
          <span>CLK: {engine.clockFrequency} Hz</span>
          <span>TICKS: {engine.tickCount}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded"
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
