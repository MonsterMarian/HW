import React, { useState, useEffect, useMemo } from 'react';
import { LogicEngine } from './engine/logicEngine';
import { PRESET_CIRCUITS } from './engine/aiCopilot';
import { Titlebar } from './components/Titlebar';
import { Toolbar } from './components/Toolbar';
import { LogicCanvas } from './views/LogicCanvas';
import { PhysicsView } from './views/PhysicsView';
import { WaveformViewer } from './components/WaveformViewer';
import { AsmEditor } from './components/AsmEditor';
import { AiPanel } from './components/AiPanel';
import { GalleryDrawer } from './components/GalleryDrawer';

export default function App() {
  const engine = useMemo(() => new LogicEngine(), []);
  // 3 distinct schematic views: 'schematic' (IEEE Gate Symbols) | 'hardware' (PCB DIP Chips) | 'physics' (3D Silicon Die)
  const [viewMode, setViewMode] = useState('schematic');
  const [showGallery, setShowGallery] = useState(false);
  const [showAsm, setShowAsm] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  // Initialize with Full Adder demo circuit
  useEffect(() => {
    const demo = PRESET_CIRCUITS.full_adder;
    demo.components.forEach((c) => {
      engine.addComponent(JSON.parse(JSON.stringify(c)));
    });
    demo.wires.forEach((w) => {
      engine.addWire(w.from.id, w.from.pin, w.to.id, w.to.pin);
    });
    engine.propagate();
    engine.notify();
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
            <PhysicsView engine={engine} />
          ) : (
            <LogicCanvas
              engine={engine}
              displayMode={viewMode} // 'schematic' or 'hardware'
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
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
    </div>
  );
}
