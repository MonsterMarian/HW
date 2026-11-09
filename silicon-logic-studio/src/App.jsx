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
  const [hierarchyStack, setHierarchyStack] = useState([
    {
      id: 'root',
      title: "NVIDIA NV1 (1995)",
      subtitle: "Nvidia's First Product: Diamond Edge 3D PCI Multimedia Card",
      state: null,
      viewMode: 'hardware',
    }
  ]);

  // Initialize with Nvidia NV1 (1995) PCI architecture demo circuit
  useEffect(() => {
    const demo = PRESET_CIRCUITS.nvidia_nv1 || PRESET_CIRCUITS.mini_pc;
    demo.components.forEach((c) => {
      engine.addComponent(JSON.parse(JSON.stringify(c)));
    });
    demo.wires.forEach((w) => {
      engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
    });
    engine.propagate();
    engine.notify();
  }, [engine]);

  // Drill down into internal subcircuit schematic on double click
  const handleDrillDown = useCallback((component) => {
    const subcircuit = findSubcircuit(component, hierarchyStack);
    if (!subcircuit) {
      console.log(`Žádné hlubší podsystémové schéma pro: ${component.label || component.id}`);
      return;
    }

    // Save current engine state to current hierarchy entry
    const currentState = engine.exportState();
    setHierarchyStack((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].state = currentState;
      updated[updated.length - 1].viewMode = viewMode;

      // Populate engine with the subcircuit's components & wires
      engine.clear();
      subcircuit.components.forEach((c) => {
        engine.addComponent(JSON.parse(JSON.stringify(c)));
      });
      subcircuit.wires.forEach((w) => {
        engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
      });
      engine.propagate();
      engine.notify();

      // Play audio confirmation
      audioEngine.playRelayClick(1.6);

      // Subcircuits look great in schematic view when in hardware mode
      // If in 3D physics view, stay in 3D physics view!
      if (viewMode === 'hardware' && updated.length >= 1) {
        setViewMode('schematic');
      }

      return [
        ...updated,
        {
          id: component.id,
          title: subcircuit.name,
          subtitle: subcircuit.subtitle,
          level: subcircuit.level || (updated.length + 1),
          state: null,
          viewMode: viewMode,
        }
      ];
    });

    setSelectedComponentId(null);
  }, [engine, viewMode, hierarchyStack]);

  // Navigate up through hierarchy stack
  const handleNavigateUp = useCallback((targetIndex) => {
    setHierarchyStack((prev) => {
      const targetIdx = targetIndex !== undefined ? targetIndex : prev.length - 2;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const targetLevel = prev[targetIdx];

      // Restore state
      if (targetLevel.state) {
        engine.importState(targetLevel.state);
      } else if (targetIdx === 0) {
        // Restore root NV1
        engine.clear();
        const demo = PRESET_CIRCUITS.nvidia_nv1 || PRESET_CIRCUITS.mini_pc;
        demo.components.forEach((c) => {
          engine.addComponent(JSON.parse(JSON.stringify(c)));
        });
        demo.wires.forEach((w) => {
          engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
        });
        engine.propagate();
        engine.notify();
      }

      if (targetLevel.viewMode) {
        setViewMode(targetLevel.viewMode);
      }

      audioEngine.playRelayClick(1.3);
      return prev.slice(0, targetIdx + 1);
    });

    setSelectedComponentId(null);
  }, [engine]);

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
        </div>

        {/* Right Drawer: AI Copilot */}
        {showAi && (
          <AiPanel engine={engine} onClose={() => setShowAi(false)} />
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
