// Schéma / PCB / křemík 3D jedné součástky nebo celého projektu: vlastní engine, dvojklik = o úroveň hlouběji.
// shortcut: logika zanořování je zjednodušená kopie App.jsx (bez ukládání projektů); při větší změně ji vytáhnout do hooku.
import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Play, Pause, StepForward } from 'lucide-react';
import { LogicEngine } from '../engine/logicEngine';
import { findSubcircuit } from '../engine/hierarchicalSubcircuits';
import { LogicCanvas } from '../views/LogicCanvas';
import { MemoryEditor } from '../components/MemoryEditor';

const Anatomy3D = lazy(() => import('./Anatomy3D.jsx').then((m) => ({ default: m.Anatomy3D })));


export function Explorer({ circuit, title, subtitle, level = 1, rootKey = 'root', view, model, build, onOpenPart, partId }) {
  // obvod se načte hned při vytvoření enginu: 3D i schéma (děti) staví scénu dřív, než by doběhl efekt rodiče
  const engine = useMemo(() => {
    const e = new LogicEngine();
    e.loadCircuit(circuit);
    if (circuit.components.some((c) => c.type === 'NV1_CORE')) e.setFrequency(Infinity); // karta běží na reálných MHz
    return e;
  }, [circuit]);
  const [stack, setStack] = useState(() => [{ id: 'root', key: rootKey, title, subtitle, level, state: null }]);
  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => () => engine.stop(), [engine]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);

  const drill = useCallback((comp) => {
    const sub = findSubcircuit(comp, stack);
    if (!sub) return setHint(`${comp.label || comp.id}: nejnižší úroveň – dál už nelze`);
    const parent = { ...stack[stack.length - 1], state: engine.exportState() };
    engine.loadCircuit(sub);
    setStack([...stack.slice(0, -1), parent, { id: comp.id, key: sub.key, title: sub.name, subtitle: sub.subtitle, level: sub.level || stack.length + 1, state: null }]);
    setSel(null);
  }, [engine, stack]);

  const up = useCallback((idx) => {
    const i = idx ?? stack.length - 2;
    if (i < 0 || i >= stack.length - 1) return;
    if (stack[i].state) engine.importState(stack[i].state);
    else engine.loadCircuit(circuit);
    setStack(stack.slice(0, i + 1));
    setSel(null);
  }, [engine, stack, circuit]);

  const toggle = () => {
    if (engine.isRunning) engine.stop(); else engine.start();
    setRunning(engine.isRunning);
  };

  // PCB dává smysl jen na nejvyšší úrovni, uvnitř čipu se ukáže schéma (jako v desktopu)
  const mode = view === 'hardware' && stack.length > 1 ? 'schematic' : view;
  return (
    <div className="absolute inset-0">
      <Suspense fallback={<div className="p-4 meta">NAČÍTÁM 3D…</div>}>
        {mode === 'physics'
          ? <Anatomy3D engine={engine} hierarchyStack={stack} onNavigateUp={up} onDrillDown={drill} model={model} build={build} onOpenPart={onOpenPart} partId={partId} />
          : <LogicCanvas engine={engine} displayMode={mode} selectedComponentId={sel} onSelectComponent={setSel}
              hierarchyStack={stack} onNavigateUp={up} onDrillDown={drill} />}
      </Suspense>
      {mode !== 'physics' && (
        <div className="absolute top-2 right-2 z-30 flex gap-1">
          <button className="web-btn" onClick={toggle} title="Spustit / zastavit simulaci">{running ? <Pause size={13} /> : <Play size={13} />} {running ? 'STOP' : 'RUN'}</button>
          <button className="web-btn" onClick={() => engine.stepClock()} title="Jeden krok hodin"><StepForward size={13} /> STEP</button>
        </div>
      )}
      {sel && mode !== 'physics' && <MemoryEditor key={sel} engine={engine} compId={sel} />}
      {hint && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-(--bg-dark) border border-(--accent-amber) text-xs font-mono">{hint}</div>}
    </div>
  );
}
