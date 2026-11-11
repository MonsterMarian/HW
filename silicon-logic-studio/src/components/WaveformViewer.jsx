import React, { useRef, useEffect } from 'react';
import { Activity, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { findEdge } from '../engine/logicEngine';
import { fmtTime } from '../views/canvas/theme';

const LABEL_W = 180; // px of the canvas kept for channel names
const TOP = 24;

const rowsOf = (engine) => Array.from(engine.waveformHistory.entries()).slice(0, 6);
const geometryOf = (engine, canvas) => ({
  rowHeight: (canvas.height - TOP) / Math.max(1, rowsOf(engine).length),
  step: (canvas.width - LABEL_W) / engine.maxWaveformPoints,
});
// vzorek číslo n leží tolik vzorků od nejnovějšího (0 = poslední zaznamenaný)
const backOf = (engine, n) => engine.waveformCount - 1 - n;

export function WaveformViewer({ engine, onClose }) {
  const canvasRef = useRef(null);
  // měřicí kurzory A/B = čísla vzorků (ne pozice v okně, to se posouvá); row = kanál, ve kterém se hledají hrany
  const cursors = useRef({ a: null, b: null, row: 0, last: 'b' });
  const redraw = useRef(() => {});


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

      const entries = rowsOf(engine);
      if (entries.length === 0) {
        ctx.fillStyle = '#717579';
        ctx.font = '600 12px "Courier New", monospace';
        ctx.fillText('Žádné aktivní signály k monitorování (připojte komponenty)', 20, height / 2);
        return;
      }

      const { rowHeight, step } = geometryOf(engine, canvas);
      const c = cursors.current;
      // po načtení jiného obvodu se vzorky číslují znovu od nuly: staré kurzory zahodit
      if (c.a !== null && c.a >= engine.waveformCount) c.a = null;
      if (c.b !== null && c.b >= engine.waveformCount) c.b = null;

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
        const yTop = TOP + rowIdx * rowHeight;
        const yBase = yTop + rowHeight * 0.8;
        const yHigh = yTop + rowHeight * 0.2;
        const yMid = yTop + rowHeight * 0.5;

        // Channel Label (kanál vybraný pro hledání hran je jantarový)
        ctx.fillStyle = rowIdx === c.row && (c.a !== null || c.b !== null) ? '#FFA909' : '#ADAAA7';
        ctx.font = '700 11px "Courier New", monospace';
        ctx.fillText(key, 12, yMid + 4);

        // Waveform plot
        ctx.strokeStyle = '#FFA909';
        ctx.lineWidth = 2;
        ctx.beginPath();

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

      // Měřicí kurzory: čas vzorku je simulovaný čas, kdy byl zaznamenán
      const times = engine.waveformTimes;
      const timeOf = (n) => {
        const back = n === null ? -1 : backOf(engine, n);
        return back >= 0 && back < times.length ? times[times.length - 1 - back] : null;
      };
      const tA = timeOf(c.a);
      const tB = timeOf(c.b);
      ctx.font = '700 11px "Courier New", monospace';
      [['A', c.a, tA, '#E8E6DF'], ['B', c.b, tB, '#7FC4E8']].forEach(([name, n, t, color]) => {
        if (t === null) return;
        const x = width - (backOf(engine, n) + 1) * step;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, TOP - 6);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(name, x + 4, TOP - 8);
      });
      ctx.fillStyle = '#ADAAA7';
      const parts = [];
      if (tA !== null) parts.push(`A ${fmtTime(tA)}`);
      if (tB !== null) parts.push(`B ${fmtTime(tB)}`);
      if (tA !== null && tB !== null) parts.push(`Δ ${fmtTime(Math.abs(tB - tA))} · ${Math.abs(c.b - c.a)} vzorků`);
      ctx.fillText(parts.length ? parts.join('   ') : 'KLIK DO PRŮBĚHU = KURZOR A, DALŠÍ KLIK = KURZOR B', 12, 14);
    };

    redraw.current = render;
    render();
    const unsub = engine.subscribe(render);
    return () => unsub();
  }, [engine]);

  const onClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;
    const { rowHeight, step } = geometryOf(engine, canvas);
    const back = Math.round((canvas.width - x) / step) - 1;
    if (x < LABEL_W - 20 || back < 0 || back >= engine.waveformTimes.length) return;
    const c = cursors.current;
    c.last = c.last === 'a' ? 'b' : 'a';
    c[c.last] = engine.waveformCount - 1 - back;
    c.row = Math.max(0, Math.min(rowsOf(engine).length - 1, Math.floor((y - TOP) / rowHeight)));
    redraw.current();
  };

  // posune naposledy položený kurzor na nejbližší hranu vybraného kanálu
  const toEdge = (dir) => {
    const c = cursors.current;
    const hist = rowsOf(engine)[c.row]?.[1];
    if (!hist || c[c.last] === null) return;
    const i = hist.length - 1 - backOf(engine, c[c.last]);
    const j = i < 0 ? -1 : findEdge(hist, i, dir);
    if (j < 0) return;
    c[c.last] = engine.waveformCount - 1 - (hist.length - 1 - j);
    redraw.current();
  };

  return (
    <div className="h-44 bg-(--bg-dark) border-t border-(--line) flex flex-col select-none">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-(--line)">
        <div className="flex items-baseline gap-2">
          <Activity size={13} className="text-(--accent-amber) self-center" />
          <span className="panel-title">Logic analyzer</span>
          <span className="serif-accent text-[13px]">průběhy signálů</span>
        </div>
        <div className="meta flex items-center gap-4">
          <span className="flex items-center gap-1">
            <button onClick={() => toEdge(-1)} title="Kurzor na předchozí hranu" data-wave="prev" className="text-gray-500 hover:text-(--accent-amber) p-1">
              <ChevronLeft size={14} />
            </button>
            HRANA
            <button onClick={() => toEdge(1)} title="Kurzor na další hranu" data-wave="next" className="text-gray-500 hover:text-(--accent-amber) p-1">
              <ChevronRight size={14} />
            </button>
          </span>
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
          onClick={onClick}
          data-wave="canvas"
          className="w-full h-full block cursor-crosshair"
        />
      </div>
    </div>
  );
}
