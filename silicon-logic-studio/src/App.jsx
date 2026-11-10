import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LogicEngine } from './engine/logicEngine';
import { PROJECTS, projectById } from './engine/projects';
import { audioEngine } from './engine/audioEngine';
import { findSubcircuit } from './engine/hierarchicalSubcircuits';
import { Titlebar } from './components/Titlebar';
import { Toolbar } from './components/Toolbar';
import { LogicCanvas } from './views/LogicCanvas';
import { PhysicsView } from './views/PhysicsView';
import { EconomicView } from './views/EconomicView';
import { AnatomyView } from './views/AnatomyView';
import { WaveformViewer } from './components/WaveformViewer';
import { AsmEditor } from './components/AsmEditor';
import { AiPanel } from './components/AiPanel';
import { GalleryDrawer } from './components/GalleryDrawer';
import { Nv1DiagnosticModal } from './components/Nv1DiagnosticModal';

// Karta NV1 běží na reálných taktech 33/50/25 MHz: při pomalé rychlosti by se nic viditelného nestalo
const defaultSpeedFor = (engine) => {
  if ([...engine.components.values()].some((c) => c.type === 'NV1_CORE')) engine.setFrequency(Infinity);
};
const makeRootEntry = (title, subtitle) => ({ id: 'root', key: 'root', title, subtitle, level: 1, state: null, viewMode: 'hardware' });

export default function App() {
  const engine = useMemo(() => new LogicEngine(), []);
  // Po spuštění jsou založené všechny projekty (engine/projects.js), otevře se první
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const project = projectById(projectId);
  const savedProjects = useRef({}); // id -> { state, stack, viewMode } projektu, který není otevřený
  // 'schematic' (IEEE značky) | 'hardware' (PCB) | 'physics' (3D křemík) | 'economic' (díly z obchodu)
  const [viewMode, setViewMode] = useState(PROJECTS[0].defaultView);
  const [showGallery, setShowGallery] = useState(false);
  const [showAsm, setShowAsm] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  // Hierarchical Drill-Down Circuit Stack
  const [hierarchyStack, setHierarchyStack] = useState(() => [makeRootEntry(PROJECTS[0].title, PROJECTS[0].subtitle)]);
  const [drillHint, setDrillHint] = useState(null);

  // První projekt (karta NV1) se načte do enginu při spuštění
  useEffect(() => {
    engine.loadCircuit(PROJECTS[0].circuit);
    defaultSpeedFor(engine);
  }, [engine]);

  // Přepnutí projektu: rozpracovaný stav (obvod, úroveň zanoření, pohled) se uloží a při návratu obnoví
  const handleSelectProject = useCallback((id) => {
    if (id === projectId) return;
    engine.stop();
    savedProjects.current[projectId] = { state: project.circuit ? engine.exportState() : null, stack: hierarchyStack, viewMode };
    const next = projectById(id);
    const saved = savedProjects.current[id];
    if (next.circuit) {
      if (saved?.state) engine.importState(saved.state);
      else engine.loadCircuit(next.circuit);
      defaultSpeedFor(engine);
    } else engine.clear();
    setHierarchyStack(saved?.stack || [makeRootEntry(next.title, next.subtitle)]);
    setViewMode(saved?.viewMode || next.defaultView);
    setSelectedComponentId(null);
    setProjectId(id);
  }, [engine, projectId, project, hierarchyStack, viewMode]);

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
    else if (project.circuit) {
      engine.loadCircuit(project.circuit);
      defaultSpeedFor(engine);
    }

    if (target.viewMode) setViewMode(target.viewMode);
    audioEngine.playRelayClick(1.3);
    setHierarchyStack(hierarchyStack.slice(0, targetIdx + 1));
    setSelectedComponentId(null);
  }, [engine, hierarchyStack, project]);

  // A new top-level circuit was loaded (gallery, import, AI copilot): restart the hierarchy at it
  const handleCircuitReplaced = useCallback((name) => {
    setHierarchyStack([makeRootEntry(name || 'Vlastní obvod', '')]);
    setSelectedComponentId(null);
    defaultSpeedFor(engine);
  }, [engine]);

  return (
    <div className="w-screen h-screen bg-(--bg-dark) text-(--text-light) flex flex-col overflow-hidden font-sans border border-(--line)">
      {/* Sleek Custom Desktop Titlebar */}
      <Titlebar
        circuitTitle={hierarchyStack[hierarchyStack.length - 1].title}
        projects={PROJECTS}
        projectId={projectId}
        onSelectProject={handleSelectProject}
      />

      {/* Top Engineering Controls Toolbar */}
      <Toolbar
        engine={engine}
        viewMode={viewMode}
        setViewMode={setViewMode}
        allowedViews={project.views}
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
          {viewMode === 'anatomy' ? (
            <AnatomyView key={project.id} project={project} />
          ) : viewMode === 'economic' ? (
            <EconomicView key={project.id} project={project} />
          ) : viewMode === 'physics' ? (
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-(--bg-dark) border border-(--accent-amber) text-(--text-light) text-xs font-mono pointer-events-none">
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
