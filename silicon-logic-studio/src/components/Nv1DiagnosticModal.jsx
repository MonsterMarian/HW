import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Play, X, ShieldCheck, Loader2 } from 'lucide-react';
import { LogicEngine } from '../engine/logicEngine';
import { NV1_BOARD } from '../engine/presets/nv1Board';
import { testPixel, PCI_IDS } from '../engine/devices/nv1Card';
import { audioEngine } from '../engine/audioEngine';
import { HIERARCHICAL_SUBCIRCUITS } from '../engine/hierarchicalSubcircuits';
import { fmtTime } from '../views/canvas/theme';

// Diagnostika spustí skutečnou kartu v samostatném enginu (stejně jako tests/nv1_card.test.js):
// hostitel posílá PCI transakce, výsledky se čtou jen z konektorů a pamětí, ne z ručně nastavených hodnot.
// Malý video režim (32×16), aby celý snímek trval ~46 µs simulovaného času.
const TINY = { htotal: 48, hdisp: 32, hss: 36, hse: 40, vtotal: 24, vdisp: 16, vss: 18, vse: 20 };
const VCLK = (14.31818e6 * 116) / 66;
const TINY_MONITOR_MODE = { name: 'TEST 32×16', hHz: VCLK / 48, vHz: VCLK / 48 / 24, w: 32, h: 16, pclk: VCLK, hBack: 48 - 36, vBack: 24 - 18 };

const hex = (v, n = 4) => (v >>> 0).toString(16).toUpperCase().padStart(n, '0');

function makeBoard() {
  const e = new LogicEngine();
  e.loadCircuit(JSON.parse(JSON.stringify(NV1_BOARD)));
  e.components.get('host').driverMode = TINY;
  e.components.get('monitor').modes = [TINY_MONITOR_MODE];
  e.components.get('saturn_pad').buttons.a = true; // stisk A od začátku, ovladač ho má přečíst
  return e;
}

const part = (e, id) => e.components.get(id);

// Každá fáze běží, dokud neplatí `until` (nebo do `maxNs` simulovaného času), pak `check` vyhodnotí výsledek
const STAGES = [
  {
    category: 'PCI',
    name: 'Enumerace PCI: konfigurační prostor a video BIOS',
    maxNs: 200_000,
    until: (e) => part(e, 'host').status.romSignature !== undefined,
    check(e) {
      const st = part(e, 'host').status;
      const id = st.configId >>> 0;
      const want = ((PCI_IDS.device << 16) | PCI_IDS.vendor) >>> 0;
      const cls = part(e, 'host').log.some((l) => l.includes('class 0x030000'));
      const rom = part(e, 'bios_rom').rom;
      const sum = rom.reduce((a, b) => (a + b) & 0xFF, 0);
      return {
        passed: id === want && cls && st.romSignature === 0xAA55 && sum === 0 && st.aborts === 0,
        detail: `ID ${hex(id & 0xFFFF)}:${hex(id >>> 16)} (čekáno ${hex(PCI_IDS.vendor)}:${hex(PCI_IDS.device)}) · třída ${cls ? '030000' : '?'} · podpis ROM ${hex(st.romSignature ?? 0)} · součet ROM ${sum} · master abort ${st.aborts}`,
      };
    },
  },
  {
    category: 'DRAM',
    name: 'Frame buffer: zápis přes PCI do 4× DRAM a zpětné čtení',
    maxNs: 2_000_000,
    until: (e) => part(e, 'host').status.readBack !== undefined,
    check(e) {
      const drams = [0, 1, 2, 3].map((k) => part(e, `dram${k}`));
      let bad = 0;
      for (let y = 0; y < TINY.vdisp; y++) {
        for (let x = 0; x < TINY.hdisp; x++) {
          const byte = y * TINY.hdisp * 2 + x * 2;
          if (drams[(byte >> 1) & 3].mem[byte >> 3] !== testPixel(x, y, TINY.hdisp, TINY.vdisp)) bad++;
        }
      }
      const y = Math.floor(TINY.vdisp / 2);
      const want = (testPixel(2, y, TINY.hdisp, TINY.vdisp) | (testPixel(3, y, TINY.hdisp, TINY.vdisp) << 16)) >>> 0;
      const got = part(e, 'host').status.readBack >>> 0;
      return {
        passed: bad === 0 && got === want,
        detail: `${TINY.hdisp * TINY.vdisp - bad}/${TINY.hdisp * TINY.vdisp} pixelů na správném místě ve 4 čipech · zpětné čtení 0x${hex(got, 8)} (čekáno 0x${hex(want, 8)})`,
      };
    },
  },
  {
    category: 'DRAM',
    name: 'Refresh DRAM (CAS před RAS, nejvýš 15,6 µs na řádek)',
    maxNs: 100_000,
    fixed: true,
    begin: (e, ctx) => { ctx.r0 = part(e, 'dram0')._d.refreshes; ctx.t0 = e.simTime; },
    until: () => false,
    check(e, ctx) {
      const drams = [0, 1, 2, 3].map((k) => part(e, `dram${k}`));
      const perUs = (drams[0]._d.refreshes - ctx.r0) / ((e.simTime - ctx.t0) / 1000);
      const same = drams.every((d) => d._d.refreshes === drams[0]._d.refreshes);
      return {
        passed: perUs >= 1 / 15.6 - 0.01 && same,
        detail: `${(perUs * 15.6).toFixed(2)} refreshe za 15,6 µs · ${same ? 'všechny 4 čipy současně' : 'čipy nejsou obnovovány současně'} · celkem ${drams[0]._d.refreshes}`,
      };
    },
  },
  {
    category: 'VIDEO',
    name: 'Monitor skládá obraz jen z analogového RGB a synchronizace',
    maxNs: 1_000_000,
    begin: (e, ctx) => { ctx.f0 = part(e, 'monitor').frames; },
    until: (e, ctx) => part(e, 'monitor').frames >= ctx.f0 + 3,
    check(e) {
      const mon = part(e, 'monitor');
      let bad = 0;
      for (let y = 0; y < TINY.vdisp; y++) {
        for (let x = 0; x < TINY.hdisp; x++) {
          const px = testPixel(x, y, TINY.hdisp, TINY.vdisp);
          const o = (y * 640 + x) * 4;
          const exp = [(px >> 10) & 31, (px >> 5) & 31, px & 31].map((c5) => Math.round((Math.round((c5 / 31) * 700) / 1000 / 0.7) * 255));
          for (let k = 0; k < 3; k++) if (Math.abs(mon.image[o + k] - exp[k]) > 1) bad++;
        }
      }
      const under = part(e, 'nv1_core')._s?.vid?.underflows ?? 0;
      return {
        passed: /TEST/.test(mon.status) && bad === 0 && under === 0,
        detail: `${mon.status} · ${mon.frames} snímků · ${bad} chybných složek RGB · podtečení FIFO ${under}`,
      };
    },
  },
  {
    category: 'AUDIO',
    name: 'Zvuk: syntéza v NV1 → kodek AD1845 → linkový výstup 48 kHz',
    maxNs: 5_000_000,
    until: (e) => part(e, 'codec')._c?.samples > 120,
    check(e) {
      const spk = part(e, 'speakers');
      const lvls = new Set((spk.scope || []).map((s) => s[0])).size;
      return {
        passed: spk.maxAbs > 0.15 && lvls > 20,
        detail: `${part(e, 'codec')._c?.samples ?? 0} vzorků · špička ${(spk.maxAbs || 0).toFixed(2)} V · ${lvls} různých úrovní napětí`,
      };
    },
  },
  {
    category: 'PAD',
    name: 'Sega Saturn: stisk A přečtený ovladačem přes TH/TR a registr PCI',
    maxNs: 3_000_000,
    until: (e) => part(e, 'host').status.phase === 'running' && part(e, 'host').status.pad !== 0xFFFF,
    check(e) {
      const pad = part(e, 'host').status.pad;
      return {
        passed: (pad & (1 << 6)) === 0 && (pad | (1 << 6)) === 0xFFFF,
        detail: `registr padu 0x${hex(pad)} · bit 6 (A) = ${(pad >> 6) & 1} · ostatní tlačítka ${(pad | (1 << 6)) === 0xFFFF ? 'uvolněná' : 'chybně stisknutá'}`,
      };
    },
  },
  {
    category: 'CMOS',
    name: 'Úroveň tranzistorů: CMOS NAND (2× PMOS, 2× NMOS) – pravdivostní tabulka',
    maxNs: 0,
    standalone: true,
    run() {
      const sub = HIERARCHICAL_SUBCIRCUITS.NAND;
      if (!sub) return { passed: false, detail: 'Podobvod CMOS NAND v hierarchii chybí.' };
      const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => {
        const e = new LogicEngine();
        e.loadCircuit(sub);
        e.components.get('in_cmos_a').outputs.out = a;
        e.components.get('in_cmos_b').outputs.out = b;
        e.propagate();
        return { a, b, y: e.pinValue('out_node', 'in') };
      });
      return {
        passed: rows.every((r) => r.y === (r.a & r.b ? 0 : 1)),
        detail: rows.map((r) => `${r.a}${r.b}→${r.y}`).join(' · ') + ' (čekáno 1 1 1 0, výstup čten ze sítě out_node)',
      };
    },
  },
];

export function Nv1DiagnosticModal({ isOpen, onClose }) {
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null); // { index, frac }
  const [metrics, setMetrics] = useState(null);
  const runRef = useRef(null);

  const runAllTests = useCallback(() => {
    if (runRef.current) runRef.current.cancelled = true;
    const run = { cancelled: false };
    runRef.current = run;
    audioEngine.playRelayClick(1.4);
    setResults([]);
    setMetrics(null);

    let e;
    try {
      e = makeBoard();
    } catch (err) {
      setResults([{ ...STAGES[0], passed: false, detail: `Kartu se nepodařilo sestavit: ${err.message}` }]);
      return;
    }
    const ctx = {};
    const out = [];
    const t0 = performance.now();
    let steps = 0;
    let index = 0;
    let end = 0;
    let started = false;

    const tick = () => {
      if (run.cancelled) return;
      const st = STAGES[index];
      try {
        if (st.standalone) {
          // samostatný test (vlastní malý obvod), proběhne naráz
          out.push({ ...st, ...st.run() });
          setResults([...out]);
          index++;
        } else {
          if (!started) {
            st.begin?.(e, ctx);
            end = e.simTime + st.maxNs;
            started = true;
          }
          // ~30 ms výpočtu, pak předat řízení UI
          let done = false;
          const slice = performance.now() + 30;
          while (!done && e.simTime < end && performance.now() < slice) {
            for (let k = 0; k < 200; k++) {
              e.step();
              steps++;
              if (st.until(e, ctx)) { done = true; break; }
              if (e.simTime >= end) break;
            }
          }
          if (done || e.simTime >= end) {
            const r = done || st.fixed ? st.check(e, ctx) : { passed: false, detail: `Nedoběhlo do ${fmtTime(st.maxNs)} simulovaného času.` };
            out.push({ ...st, ...r, simTime: e.simTime });
            setResults([...out]);
            index++;
            started = false;
          } else {
            setCurrent({ index, frac: 1 - (end - e.simTime) / st.maxNs });
          }
        }
      } catch (err) {
        out.push({ ...st, passed: false, detail: `Chyba při běhu: ${err.message}` });
        setResults([...out]);
        index++;
        started = false;
      }
      if (index >= STAGES.length) {
        const real = performance.now() - t0;
        setCurrent(null);
        setMetrics({ sim: e.simTime, real, steps, perSec: (steps / real) * 1000, ratio: e.simTime / (real * 1e6) });
        audioEngine.playRelayClick(out.every((r) => r.passed) ? 1.6 : 0.6);
        return;
      }
      setCurrent((c) => (c && c.index === index ? c : { index, frac: 0 }));
      setTimeout(tick, 0);
    };
    setCurrent({ index: 0, frac: 0 });
    setTimeout(tick, 30);
  }, []);

  // Spuštění až v dalším tasku: první snímek modalu se vykreslí hned a stav se nemění uvnitř efektu
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(runAllTests, 0);
    return () => { clearTimeout(t); if (runRef.current) runRef.current.cancelled = true; };
  }, [isOpen, runAllTests]);

  if (!isOpen) return null;

  const isRunning = current !== null;
  const passed = results.filter((r) => r.passed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl bg-(--bg-dark) border border-gray-700 shadow-[14px_14px_0_rgba(255,169,9,0.12)] overflow-hidden flex flex-col max-h-[90vh] font-mono text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-(--line) flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-(--accent-amber) shrink-0" />
            <div>
              <h2 className="text-xl leading-tight text-(--text-light)">
                Diagnostika <span className="serif-accent">Diamond Edge 3D</span>
              </h2>
              <p className="meta mt-1">Skutečný běh karty · PCI · DRAM · video · zvuk · pad · CMOS</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-2 bg-(--accent-amber) hover:bg-cyan-300 text-(--bg-dark) font-bold tracking-[0.1em] whitespace-nowrap transition-colors disabled:opacity-50"
            >
              <Play size={12} />
              <span>{isRunning ? 'TESTUJI…' : 'SPUSTIT ZNOVU'}</span>
            </button>
            <button onClick={onClose} title="Zavřít" className="p-1.5 text-gray-500 hover:text-(--accent-amber) transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Souhrn */}
        <div className="grid grid-cols-4 border-b border-(--line) divide-x divide-(--line)">
          {[
            ['Simulovaný čas', metrics ? fmtTime(metrics.sim) : '…', 'karty od resetu'],
            ['Výpočet', metrics ? `${(metrics.real / 1000).toFixed(1)} s` : '…', metrics ? `poměr 1/${Math.round(1 / metrics.ratio).toLocaleString('cs-CZ')} reálného času` : 'běží po částech, UI nezamrzá'],
            ['Hrany hodin', metrics ? Math.round(metrics.perSec).toLocaleString('cs-CZ') : '…', metrics ? `za sekundu · celkem ${metrics.steps.toLocaleString('cs-CZ')}` : 'za sekundu'],
            ['Výsledek', `${passed} / ${STAGES.length}`, isRunning ? `testuji ${(current?.index ?? 0) + 1}. z ${STAGES.length}` : passed === STAGES.length ? 'vše prošlo' : 'něco selhalo'],
          ].map(([k, v, s], i) => (
            <div key={k} className="px-5 py-4">
              <div className="meta">{k}</div>
              <div className={`text-2xl font-sans font-extrabold mt-1 ${i === 3 && !isRunning ? (passed === STAGES.length ? 'text-(--accent-amber)' : 'text-(--conflict)') : 'text-(--text-light)'}`}>{v}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{s}</div>
            </div>
          ))}
        </div>

        {/* Jednotlivé testy */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {STAGES.map((st, i) => {
            const r = results[i];
            const active = current?.index === i && !r;
            return (
              <div key={st.name} className={`border p-3 flex items-start justify-between gap-4 ${active ? 'border-gray-600' : 'border-(--line)'}`}>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="meta text-(--accent-amber) border border-(--line) px-1.5">{st.category}</span>
                    <span className="font-sans font-bold text-[13px] text-(--text-light)">{st.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {r ? r.detail : active ? (st.standalone ? 'běží…' : `běží… simulovaný čas ${fmtTime((current.frac || 0) * st.maxNs)} z max. ${fmtTime(st.maxNs)}`) : 'čeká'}
                  </p>
                  {active && (
                    <div className="h-0.5 bg-(--line) mt-1">
                      <div className="h-full bg-(--accent-amber)" style={{ width: `${Math.min(100, (current.frac || 0) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className="shrink-0 pt-0.5">
                  {r ? (
                    r.passed ? (
                      <span className="flex items-center gap-1 text-(--accent-amber) border border-(--accent-amber) px-2 py-0.5 font-bold text-[10px]">
                        <CheckCircle2 size={12} /> PASS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-(--conflict) border border-(--conflict) px-2 py-0.5 font-bold text-[10px]">
                        <AlertTriangle size={12} /> FAIL
                      </span>
                    )
                  ) : active ? (
                    <Loader2 size={14} className="animate-spin text-gray-500" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-(--line) flex items-center justify-between text-gray-500 text-[11px]">
          <span className="meta">Vlastní instance LogicEngine + preset NV1 · video režim 32×16 pro rychlý běh</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-(--line) text-gray-300 hover:text-(--bg-dark) hover:bg-(--accent-amber) hover:border-(--accent-amber) tracking-[0.1em] transition-colors font-bold"
          >
            ZAVŘÍT
          </button>
        </div>
      </div>
    </div>
  );
}
