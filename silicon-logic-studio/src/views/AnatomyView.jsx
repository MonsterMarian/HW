// ANATOMY (test): izometrický výkres celé sestavy z kitu Anatomy – malé díly jsou vidět ve velkém celku
// přes očíslované popisky, posuvník sestavu rozloží. Data = kusovník projektu (ceny, rozměry).
import React, { useMemo, useState } from 'react';
import { ISO_CSS } from '../vendor/anatomy/iso-kit.js';
import { anatomyFigure } from './anatomy/figures.js';
import { fmtKc } from '../engine/economic/catalog.js';
import { Anatomy3D } from './anatomy/Anatomy3D.jsx';

// Barvy portfolia místo výchozích šedých tónů kitu (jantar = zvýrazněný díl, červená = kolize)
const THEME_CSS = `
.an-root.iso{--anatomy-page:#07080a;--anatomy-card:#07080a;--anatomy-paper:#07080a;--anatomy-face:#121317;--anatomy-top:#17181c;
--anatomy-shade-0:#0b0c0f;--anatomy-shade-1:#0e0f12;--anatomy-shade-2:#111215;--anatomy-shade-3:#141518;--anatomy-lit-top:#2a2113;--anatomy-lit-shade:#1d170e;
--anatomy-hi:#c9c6c0;--anatomy-mid:#7a7d82;--anatomy-lo:#45484e;--anatomy-faint:#2b2d31;--anatomy-lit:#FFA909;--anatomy-red:#DE3B3D;--anatomy-dot:#ADAAA7;--anatomy-weight:.7px}
.an-root .an-ball{fill:#07080a;stroke:var(--anatomy-mid);stroke-width:.8}
.an-root .an-num{fill:var(--anatomy-hi);font:700 10px "Courier New",monospace;text-anchor:middle}
.an-root .an-dot{fill:var(--anatomy-mid)}
.an-root .an-focus .an-ball{fill:#FFA909;stroke:#FFA909}
.an-root .an-focus .an-num{fill:#07080a}
.an-root .an-focus .an-dot{fill:#FFA909}
.an-root .an-warn{fill:var(--anatomy-red);font:700 11px "Courier New",monospace}
.an-root [data-part]{cursor:pointer}
.an3d-ball{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:700 10px "Courier New",monospace;color:#c9c6c0;background:rgba(7,8,10,.85);border:1px solid #7a7d82;transform:translateY(-50%)}
.an3d-ball.an3d-on{background:#FFA909;border-color:#FFA909;color:#07080a}
`;

export function AnatomyView({ project }) {
  const [explode, setExplode] = useState(0);
  const [focus, setFocus] = useState(null);
  const [mode, setMode] = useState('3d'); // '3d' = modely z ECONOMIC, '2d' = izometrický výkres kitu Anatomy
  const fig = useMemo(() => anatomyFigure(project, { explode, focus: mode === '2d' ? focus : null }), [project, explode, focus, mode]);
  const byId = useMemo(() => new Map(project.bom.map((it) => [it.id, it])), [project]);
  const sel = focus && byId.get(focus);

  const onOver = (e) => {
    const id = e.target.closest?.('[data-part]')?.dataset.part;
    setFocus(id && byId.has(id) ? id : null);
  };

  return (
    <div className="relative w-full h-full flex bg-(--bg-dark) overflow-hidden font-mono an-root iso" data-theme="dark">
      <style>{ISO_CSS + THEME_CSS}</style>
      <div className="relative flex-1 min-w-0 flex items-center justify-center p-4">
        {mode === '2d' ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:max-w-full"
            onPointerOver={onOver}
            onPointerLeave={() => setFocus(null)}
            dangerouslySetInnerHTML={{ __html: fig.svg }}
          />
        ) : (
          <Anatomy3D project={project} explode={explode} focus={focus} onFocus={setFocus} />
        )}

        <div className="absolute top-3 right-3 z-20 flex items-stretch bg-(--bg-dark)/90 border border-(--line) text-[11px] uppercase tracking-[0.1em]">
          {[['3d', '3D MODEL'], ['2d', 'VÝKRES']].map(([m, t]) => (
            <button key={m} data-anatomy-mode={m} onClick={() => setMode(m)} className={`px-3 py-1.5 font-bold ${mode === m ? 'bg-(--accent-amber) text-(--bg-dark)' : 'text-gray-400 hover:text-(--text-light)'}`}>{t}</button>
          ))}
        </div>

        {sel && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-(--bg-dark) border border-gray-700 px-5 py-2.5 pointer-events-none max-w-xl">
            <div className="panel-title">{sel.qty > 1 ? `${sel.qty}× ` : ''}{sel.name}</div>
            <div className="text-gray-400 text-[11px] mt-0.5">
              {sel.dims.map((v) => v.toLocaleString('cs-CZ')).join(' × ')} mm · {sel.price ? `od ${fmtKc(sel.price[0])} / ks` : 'nedostupné'}
            </div>
          </div>
        )}
      </div>

      <aside className="w-[21rem] shrink-0 h-full border-l border-(--line) bg-(--bg-dark) overflow-y-auto">
        <div className="px-4 py-3 border-b border-(--line) text-xs space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-(--accent-amber) shrink-0" />
            <span className="panel-title">{project.title}</span>
          </div>
          <div className="serif-accent text-[14px]">Anatomie sestavy (test)</div>
          <div className="text-gray-400 space-y-0.5 text-[11px]">
            <div>{mode === '3d' ? '3D modely dílů v mm, otáčení myší' : 'Izometrický výkres v mm, kit Anatomy (MIT)'}</div>
            <div>Číslo ve výkresu = řádek níže</div>
            {project.id === 'p100pc' && <div className="text-(--conflict)">Červeně: limit 312 mm a kolize krytu s držákem</div>}
          </div>
          <label className="flex items-center gap-2 pt-1 text-[11px] text-gray-300">
            ROZLOŽIT
            <input type="range" min="0" max="1" step="0.02" value={explode} onChange={(e) => setExplode(Number(e.target.value))} className="flex-1 accent-(--accent-amber)" aria-label="Rozložit sestavu" data-explode />
          </label>
        </div>
        <div className="px-4 py-2 border-b border-(--line) meta">DÍLY VE VÝKRESU · {fig.items.length}</div>
        {project.bom.map((it, i) => {
          const inFig = fig.items.some((x) => x.id === it.id);
          const on = focus === it.id;
          return (
            <button
              key={it.id}
              data-anatomy-item={it.id}
              onMouseEnter={() => setFocus(it.id)}
              onMouseLeave={() => setFocus(null)}
              className={`w-full text-left px-4 py-1.5 flex items-baseline gap-3 border-b border-(--line) ${on ? 'bg-(--bg-card-light)' : ''}`}
            >
              <span className={`w-6 h-6 shrink-0 grid place-items-center rounded-full border text-[10px] font-bold ${on ? 'bg-(--accent-amber) border-(--accent-amber) text-(--bg-dark)' : 'border-gray-600 text-gray-300'}`}>{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-sans font-semibold text-[12px] text-gray-200 truncate">{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</span>
                <span className="block text-[10px] text-gray-500">{inFig ? `${it.dims.map((v) => v.toLocaleString('cs-CZ')).join(' × ')} mm` : 'mimo výkres (není na kartě)'}</span>
              </span>
            </button>
          );
        })}
      </aside>
    </div>
  );
}
