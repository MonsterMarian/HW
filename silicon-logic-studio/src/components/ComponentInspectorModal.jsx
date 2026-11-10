import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Table,
  Zap,
  Activity,
  X,
  ShieldCheck,
  Check,
  ChevronRight,
  Info,
  Grid,
  Sliders,
} from 'lucide-react';
import { COMPONENT_DETAILS } from '../engine/componentDetails';
import { WireState } from '../engine/logicEngine';
import { ComponentSchematicCanvas } from './ComponentSchematicCanvas';
import { DEVICES } from '../engine/devices/index.js';
import { pinWidth } from '../engine/logicEngine';

// Popis skutečné součástky karty (engine/devices) z jejího `meta`; tabulka = piny se směrem a šířkou
function deviceDetails(comp, dev) {
  const m = dev.meta;
  const names = [...new Set([...Object.keys(dev.pins.inputs || {}), ...Object.keys(dev.pins.outputs || {})])];
  const dir = (p) => (p in (dev.pins.inputs || {}) && p in (dev.pins.outputs || {}) ? 'obousměrný' : p in (dev.pins.outputs || {}) ? 'výstup' : 'vstup');
  return {
    name: m.part,
    icCode: m.ref,
    package: m.pkg,
    technology: m.offBoard ? 'zařízení mimo kartu' : 'součástka karty',
    transistorCount: '—',
    gateCount: '—',
    propagationDelay: 'podle hodin modelu',
    powerConsumption: '—',
    description: m.desc,
    internalLogic: 'behaviorální model (engine/devices/nv1Card.js)',
    subcomponents: [],
    truthTable: { headers: ['Pin', 'Směr', 'Šířka (bit)'], rows: names.map((p) => ({ inputs: [p, dir(p)], output: pinWidth(comp, p) })) },
    pinout: names.map((p, i) => ({ pin: i + 1, name: p, type: `${dir(p)} · ${pinWidth(comp, p)} b` })),
  };
}

export function ComponentInspectorModal({ component, engine, onClose }) {
  const [activeTab, setActiveTab] = useState('schematic'); // 'schematic' | 'blueprint' | 'table' | 'pinout'
  const [schematicViewType, setSchematicViewType] = useState('gate'); // 'gate' | 'transistor'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!component) return null;

  const details = COMPONENT_DETAILS[component.type] || (DEVICES[component.type] ? deviceDetails(component, DEVICES[component.type]) : {
    name: component.label || component.type,
    icCode: component.type,
    package: 'INTEGRATED BLOCK',
    transistorCount: 8,
    gateCount: 1,
    technology: 'CMOS LSI',
    propagationDelay: '10 ns',
    powerConsumption: '5 mW',
    description: `Digitální logická komponenta typu ${component.type}.`,
    internalLogic: 'Y = f(INPUTS)',
    subcomponents: [{ name: 'Core Logic Cell', type: component.type, desc: 'Základní logický blok' }],
    truthTable: { headers: ['Inputs', 'Outputs'], rows: [] },
    pinout: [],
  });

  const temp = engine?.thermalMap?.get(component.id) || 28.5;
  const inPins = Object.entries(component.inputs || {});
  const outPins = Object.entries(component.outputs || {});

  const hasTransistorView = ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR'].includes(component.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono text-xs animate-fadeIn">
      <div className="w-full max-w-4xl bg-(--bg-dark) border border-gray-700 shadow-[14px_14px_0_rgba(255,169,9,0.12)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-(--line) flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cpu size={22} className="text-(--accent-amber) shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="panel-title text-lg">{details.icCode}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-semibold">
                  {details.package}
                </span>
                <span className="text-[10px] text-gray-400">({details.technology})</span>
              </div>
              <span className="serif-accent text-[14px]">{details.name}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-[10px] px-2.5 py-1 rounded bg-(--bg-card-light) border border-(--line)">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300">{temp.toFixed(1)}°C DIE TEMP</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-5 pt-2.5 bg-(--bg-card) border-b border-(--line)">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('schematic')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-lg font-bold transition-all border-b-2 text-[11px] ${
                activeTab === 'schematic'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/15 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Grid size={13} />
              <span>★ SCHÉMA ZAPOJENÍ (SCHEMATIC)</span>
            </button>

            <button
              onClick={() => setActiveTab('blueprint')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-lg font-semibold transition-all border-b-2 text-[11px] ${
                activeTab === 'blueprint'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers size={13} />
              <span>VNITŘNÍ STRUKTURA & TRANZISTORY</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-lg font-semibold transition-all border-b-2 text-[11px] ${
                activeTab === 'table'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Table size={13} />
              <span>PRAVDIVOSTNÍ TABULKA & ČASOVÁNÍ</span>
            </button>

            <button
              onClick={() => setActiveTab('pinout')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-lg font-semibold transition-all border-b-2 text-[11px] ${
                activeTab === 'pinout'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Zap size={13} />
              <span>POUZDRO & PINOUT IC</span>
            </button>
          </div>

          {/* Sub-mode switch for schematic tab (Gate vs Transistor) */}
          {activeTab === 'schematic' && hasTransistorView && (
            <div className="flex items-center bg-(--bg-card-light) border border-(--line) p-0.5 rounded-lg mb-1">
              <button
                onClick={() => setSchematicViewType('gate')}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  schematicViewType === 'gate'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                HRADLOVÉ SCHÉMA (GATE)
              </button>
              <button
                onClick={() => setSchematicViewType('transistor')}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  schematicViewType === 'transistor'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                TRANZISTOROVÉ CMOS (MOSFET)
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto max-h-[75vh] custom-scrollbar space-y-4">
          {/* TAB 0: SCHEMATIC DIAGRAM (PRIMARY USER REQUEST) */}
          {activeTab === 'schematic' && (
            <div className="space-y-3">
              {/* Interactive Visual Blueprint Canvas */}
              <ComponentSchematicCanvas
                component={component}
                details={details}
                engine={engine}
                viewType={schematicViewType}
              />

              {/* Pin Voltage Bar below schematic */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-(--bg-card) border border-(--line) flex items-center justify-between">
                  <span className="text-gray-500 text-[10px] uppercase font-bold">VSTUPNÍ SIGNÁLY:</span>
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    {inPins.map(([p, v]) => (
                      <span
                        key={p}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          v === 1
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {p.toUpperCase()}: {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-(--bg-card) border border-(--line) flex items-center justify-between">
                  <span className="text-gray-500 text-[10px] uppercase font-bold">VÝSTUPNÍ SIGNÁLY:</span>
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    {outPins.map(([p, v]) => (
                      <span
                        key={p}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          v === 1
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {p.toUpperCase()}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* TAB 1: BLUEPRINT */}
          {activeTab === 'blueprint' && (
            <div className="space-y-4">
              {/* Description */}
              <div className="p-3.5 rounded-lg bg-(--bg-card-light) border border-(--line) text-gray-300 text-[11px] leading-relaxed font-sans">
                {details.description}
              </div>

              {/* Internal Formula & Specs Banner */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-(--bg-card) border border-(--line)">
                  <span className="text-[10px] text-gray-500 uppercase block mb-1">Logická funkce:</span>
                  <span className="font-bold text-cyan-400 text-xs">{details.internalLogic}</span>
                </div>
                <div className="p-3 rounded-lg bg-(--bg-card) border border-(--line)">
                  <span className="text-[10px] text-gray-500 uppercase block mb-1">Počet tranzistorů:</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {details.transistorCount} MOSFETs ({details.gateCount} hradel)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-(--bg-card) border border-(--line)">
                  <span className="text-[10px] text-gray-500 uppercase block mb-1">Propagační zpoždění:</span>
                  <span className="font-bold text-amber-400 text-xs">{details.propagationDelay}</span>
                </div>
              </div>

              {/* Live Terminal Pin States */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Aktuální živé stavy na pinech čipu:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* Inputs */}
                  <div className="p-3 rounded-lg bg-(--bg-card-light) border border-(--line) space-y-1.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">VSTUPNÍ PINY (INPUTS):</span>
                    {inPins.length === 0 ? (
                      <span className="text-gray-600 text-[10px]">Žádné přímé vstupy</span>
                    ) : (
                      inPins.map(([pin, val]) => (
                        <div key={pin} className="flex items-center justify-between py-0.5 border-b border-(--line)">
                          <span className="text-gray-300 font-semibold">{pin.toUpperCase()}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              val === 1
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : val === WireState.HIGH_Z
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {val === WireState.HIGH_Z ? 'HIGH-Z' : val === 1 ? '1 (HIGH)' : '0 (LOW)'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Outputs */}
                  <div className="p-3 rounded-lg bg-(--bg-card-light) border border-(--line) space-y-1.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">VÝSTUPNÍ PINY (OUTPUTS):</span>
                    {outPins.length === 0 ? (
                      <span className="text-gray-600 text-[10px]">Žádné výstupy</span>
                    ) : (
                      outPins.map(([pin, val]) => (
                        <div key={pin} className="flex items-center justify-between py-0.5 border-b border-(--line)">
                          <span className="text-gray-300 font-semibold">{pin.toUpperCase()}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              val === 1
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                                : val === WireState.HIGH_Z
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {val === WireState.HIGH_Z ? 'HIGH-Z' : val === 1 ? '1 (HIGH)' : '0 (LOW)'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-Components Breakdown */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Vnitřní stavební bloky a zapojení:
                </span>
                <div className="space-y-1.5">
                  {details.subcomponents.map((sub, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-(--bg-card) border border-(--line) flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-bold text-gray-200 text-[11px]">{sub.name}</span>
                          <p className="text-[10px] text-gray-500 font-sans">{sub.desc}</p>
                        </div>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 font-mono">
                        {sub.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRUTH TABLE */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-(--line)">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-(--bg-card) border-b border-(--line) text-gray-400 text-[10px]">
                      {details.truthTable.headers.map((h, i) => (
                        <th key={i} className="p-2.5 font-bold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--line)">
                    {details.truthTable.rows.map((row, idx) => {
                      // Check if this row matches current inputs
                      const isMatch =
                        component.inputs &&
                        ((row.inputs[0] === component.inputs.a && row.inputs[1] === component.inputs.b) ||
                         (row.inputs[0] === component.inputs.in));

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors font-mono ${
                            isMatch
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border-l-4 border-cyan-400'
                              : 'bg-(--bg-card-light) text-gray-300 hover:bg-(--bg-card-light)'
                          }`}
                        >
                          {row.inputs.map((inp, i) => (
                            <td key={i} className="p-2.5">
                              {inp}
                            </td>
                          ))}
                          <td className="p-2.5 text-cyan-400">
                            {row.output} {row.sub ? `(${row.sub})` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Power & Timing Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-3 rounded-lg bg-(--bg-card) border border-(--line)">
                  <span className="text-gray-500 block text-[10px] mb-1">Dynamická spotřeba (P_dyn):</span>
                  <span className="text-gray-200 font-bold">{details.powerConsumption}</span>
                </div>
                <div className="p-3 rounded-lg bg-(--bg-card) border border-(--line)">
                  <span className="text-gray-500 block text-[10px] mb-1">Logická rodina:</span>
                  <span className="text-gray-200 font-bold">{details.technology}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PINOUT */}
          {activeTab === 'pinout' && (
            <div className="space-y-4">
              <div className="text-[10px] text-gray-400">
                Oficiální zapojení vývodů integrovaného obvodu ({details.package}):
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {details.pinout.map((p) => (
                  <div
                    key={p.pin}
                    className="p-2 rounded bg-(--bg-card) border border-(--line) flex items-center justify-between text-[10px]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded bg-(--bg-card-light) text-cyan-400 font-bold flex items-center justify-center border border-(--line)">
                        {p.pin}
                      </span>
                      <span className="font-bold text-gray-200">{p.name}</span>
                    </div>
                    <span className="text-gray-500 font-mono text-[9px]">{p.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-(--bg-card) border-t border-(--line) flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[10px] text-gray-500">
            <Info size={12} className="text-cyan-400" />
            <span>Dvojklikem na libovolnou jinou součástku otevřete její vnitřní inspekci.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-(--bg-card-light) hover:bg-white/10 text-gray-200 rounded font-semibold text-[11px] border border-(--line) transition-colors"
          >
            ZAVŘÍT
          </button>
        </div>
      </div>
    </div>
  );
}
