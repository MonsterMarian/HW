import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogicEngine } from './engine/logicEngine';
import { PRESET_CIRCUITS } from './engine/aiCopilot';
import { audioEngine } from './engine/audioEngine';
import { findSubcircuit } from './engine/hierarchicalSubcircuits';
import { Titlebar } from './components/Titlebar';
import { Toolbar } from './components/Toolbar';
import { LogicCanvas } from './views/LogicCanvas';
import { PhysicsView } from './views/PhysicsView';
import { WaveformViewer } from './components/WaveformViewer';
import { AsmEditor } from './components/AsmEditor';
import { AiPanel } from './components/AiPanel';
import { GalleryDrawer } from './components/GalleryDrawer';
import { Nv1DiagnosticModal } from './components/Nv1DiagnosticModal';

const ROOT_TITLE = 'NVIDIA NV1 (1995)';
const ROOT_SUBTITLE = "Nvidia's First Product: Diamond Edge 3D PCI Multimedia Card";
const makeRootEntry = (title, subtitle) => ({ id: 'root', key: 'root', title, subtitle, level: 1, state: null, viewMode: 'hardware' });

export default function App() {
  const engine = useMemo(() => new LogicEngine(), []);
  // 3 distinct schematic views: 'schematic' (IEEE Gate Symbols) | 'hardware' (PCB DIP Chips) | 'physics' (3D Silicon Die)
  const [viewMode, setViewMode] = useState('hardware');
  const [showGallery, setShowGallery] = useState(false);
  const [showAsm, setShowAsm] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  // Hierarchical Drill-Down Circuit Stack
  const [hierarchyStack, setHierarchyStack] = useState(() => [makeRootEntry(ROOT_TITLE, ROOT_SUBTITLE)]);
  const [drillHint, setDrillHint] = useState(null);

  // Initialize with Nvidia NV1 (1995) PCI architecture demo circuit
  useEffect(() => {
    engine.loadCircuit(PRESET_CIRCUITS.nvidia_nv1);
  }, [engine]);

  useEffect(() => {
    if (!drillHint) return;
    const t = setTimeout(() => setDrillHint(null), 2200);
    return () => clearTimeout(t);
  }, [drillHint]);

  // Drill down into internal subcircuit schematic on double click
  const handleDrillDown = useCallback((component) => {
    const subcircuit = findSubcircuit(component, hierarchyStack);
    if (!subcircuit) {
      setDrillHint(`${component.label || component.id}: nejnižší úroveň – dál už nelze`);
      return;
    }

    // Snapshot the current level so "level up" restores it exactly
    const parent = { ...hierarchyStack[hierarchyStack.length - 1], state: engine.exportState(), viewMode };
    engine.loadCircuit(subcircuit);
    audioEngine.playRelayClick(1.6);

    // The board PCB view only makes sense at the root; inside a chip use the schematic (3D stays 3D)
    const nextView = viewMode === 'hardware' ? 'schematic' : viewMode;
    setViewMode(nextView);
    setHierarchyStack([
      ...hierarchyStack.slice(0, -1),
      parent,
      {
        id: component.id,
        key: subcircuit.key,
        title: subcircuit.name,
        subtitle: subcircuit.subtitle,
        level: subcircuit.level || hierarchyStack.length + 1,
        state: null,
        viewMode: nextView,
      },
    ]);
    setSelectedComponentId(null);
  }, [engine, viewMode, hierarchyStack]);

  // Navigate up through hierarchy stack (default: one level up)
  const handleNavigateUp = useCallback((targetIndex) => {
    const targetIdx = targetIndex !== undefined ? targetIndex : hierarchyStack.length - 2;
    if (targetIdx < 0 || targetIdx >= hierarchyStack.length - 1) return;

    const target = hierarchyStack[targetIdx];
    if (target.state) engine.importState(target.state);
    else engine.loadCircuit(PRESET_CIRCUITS.nvidia_nv1);

    if (target.viewMode) setViewMode(target.viewMode);
    audioEngine.playRelayClick(1.3);
    setHierarchyStack(hierarchyStack.slice(0, targetIdx + 1));
    setSelectedComponentId(null);
  }, [engine, hierarchyStack]);

  // A new top-level circuit was loaded (gallery, import, AI copilot): restart the hierarchy at it
  const handleCircuitReplaced = useCallback((name) => {
    setHierarchyStack([makeRootEntry(name || 'Vlastní obvod', '')]);
    setSelectedComponentId(null);
  }, []);

  return (
    <div className="w-screen h-screen bg-[#060911] text-gray-200 flex flex-col overflow-hidden font-sans border border-[#161D2B]">
      {/* Sleek Custom Desktop Titlebar */}
      <Titlebar />

      {/* Top Engineering Controls Toolbar */}
      <Toolbar
        engine={engine}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showGallery={showGallery}
        setShowGallery={setShowGallery}
        showAsm={showAsm}
        setShowAsm={setShowAsm}
        showWaveform={showWaveform}
        setShowWaveform={setShowWaveform}
        showAi={showAi}
        setShowAi={setShowAi}
        showDiagnostic={showDiagnostic}
        setShowDiagnostic={setShowDiagnostic}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Circuit Gallery & Storage Drawer */}
        <GalleryDrawer
          engine={engine}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onCircuitReplaced={handleCircuitReplaced}
        />

        {/* Central Viewport: Schematic vs Hardware PCB vs Physics 3D Die */}
        <div className="flex-1 h-full relative">
          {viewMode === 'physics' ? (
            <PhysicsView
              engine={engine}
              hierarchyStack={hierarchyStack}
              onNavigateUp={handleNavigateUp}
              onDrillDown={handleDrillDown}
            />
          ) : (
            <LogicCanvas
              engine={engine}
              displayMode={viewMode} // 'schematic' or 'hardware'
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              hierarchyStack={hierarchyStack}
              onNavigateUp={handleNavigateUp}
              onDrillDown={handleDrillDown}
            />
          )}
          {drillHint && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-[#1A1206]/95 border border-amber-500/50 text-amber-300 text-xs font-mono shadow-xl pointer-events-none">
              {drillHint}
            </div>
          )}
        </div>

        {/* Right Drawer: AI Copilot */}
        {showAi && (
          <AiPanel engine={engine} onClose={() => setShowAi(false)} onCircuitReplaced={handleCircuitReplaced} />
        )}

        {/* Right Drawer: Custom ISA & Monaco Assembler */}
        {showAsm && (
          <AsmEditor engine={engine} onClose={() => setShowAsm(false)} />
        )}
      </div>

      {/* Bottom Drawer: Waveform Logic Analyzer */}
      {showWaveform && (
        <WaveformViewer
          engine={engine}
          onClose={() => setShowWaveform(false)}
        />
      )}

      {/* Hardware Diagnostic & Speed Benchmark Modal */}
      {showDiagnostic && (
        <Nv1DiagnosticModal
          isOpen={showDiagnostic}
          onClose={() => setShowDiagnostic(false)}
        />
      )}
    </div>
  );
}
