import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  X,
  Play,
  Cpu,
  Layers,
  Sparkles,
  FileCode,
  Image,
  CheckCircle,
} from 'lucide-react';
import { PRESET_CIRCUITS } from '../engine/aiCopilot';
import { audioEngine } from '../engine/audioEngine';

export function GalleryDrawer({ engine, isOpen, onClose, onCircuitReplaced = () => {} }) {
  const [savedCircuits, setSavedCircuits] = useState([]);
  const [circuitName, setCircuitName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load user saved circuits from localStorage
  useEffect(() => {
    try {
      const data = localStorage.getItem('silicon_saved_circuits');
      if (data) {
        setSavedCircuits(JSON.parse(data));
      }
    } catch (e) {
      console.warn('Failed to load saved circuits from localStorage:', e);
    }
  }, [isOpen]);

  const showNotify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Save current circuit
  const handleSaveCircuit = () => {
    if (!circuitName.trim()) return;
    const state = engine.exportState(circuitName.trim());
    const updated = [state, ...savedCircuits.filter((c) => c.name !== circuitName.trim())];
    setSavedCircuits(updated);
    try {
      localStorage.setItem('silicon_saved_circuits', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    audioEngine.playRelayClick(1.3);
    setCircuitName('');
    setIsSaving(false);
    showNotify(`Obvod "${state.name}" byl úspěšně uložen!`);
  };

  // Load a preset
  const handleLoadPreset = (key) => {
    const preset = PRESET_CIRCUITS[key];
    if (!preset) return;
    engine.loadCircuit(preset);
    onCircuitReplaced(preset.name);
    audioEngine.playRelayClick(1.2);
    showNotify(`Načten obvod: ${preset.name}`);
  };

  // Load a user saved circuit
  const handleLoadSaved = (state) => {
    if (!engine.importState(state)) return showNotify('Chyba: Neplatný formát uloženého obvodu.');
    onCircuitReplaced(state.name);
    audioEngine.playRelayClick(1.2);
    showNotify(`Načten uživatelský obvod: ${state.name}`);
  };

  // Delete saved circuit
  const handleDeleteSaved = (name) => {
    const updated = savedCircuits.filter((c) => c.name !== name);
    setSavedCircuits(updated);
    try {
      localStorage.setItem('silicon_saved_circuits', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    audioEngine.playRelayClick(0.8);
    showNotify(`Obvod "${name}" byl smazán.`);
  };

  // Export JSON file to disk
  const handleExportJSON = () => {
    const state = engine.exportState('silicon_circuit');
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.name || 'circuit').toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audioEngine.playRelayClick(1.1);
    showNotify('JSON soubor byl exportován na disk.');
  };

  // Import JSON file from disk
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const state = JSON.parse(event.target.result);
        const success = engine.importState(state);
        if (success) {
          onCircuitReplaced(state.name || file.name);
          audioEngine.playRelayClick(1.3);
          showNotify(`Úspěšně importován obvod ze souboru "${file.name}"!`);
        } else {
          showNotify('Chyba: Neplatný formát souboru obvodu.');
        }
      } catch (err) {
        showNotify('Chyba při čtení JSON souboru.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export Canvas snapshot as PNG
  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `silicon_schematic_${Date.now()}.png`;
    a.click();
    audioEngine.playRelayClick(1.1);
    showNotify('Snímek schématu exportován jako PNG.');
  };

  // Clear workspace
  const handleClearCanvas = () => {
    if (window.confirm('Opravdu chcete vyčistit celé plátno a začít nový návrh?')) {
      engine.clear();
      onCircuitReplaced('Nový návrh');
      audioEngine.playRelayClick(0.7);
      showNotify('Plátno bylo vyčištěno.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-0 h-full w-84 bg-(--bg-dark) border-r border-(--line) z-40 flex flex-col font-mono text-xs select-none">
      {/* Drawer Header */}
      <div className="h-11 px-4 border-b border-(--line) flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-2">
          <FolderOpen size={13} className="text-(--accent-amber) self-center" />
          <span className="panel-title">Galerie</span>
          <span className="serif-accent text-[13px]">obvody a úložiště</span>
        </div>
        <button
          onClick={onClose}
          title="Zavřít"
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-(--accent-amber) transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] flex items-center space-x-1.5 animate-fadeIn">
          <CheckCircle size={12} className="text-cyan-400 shrink-0" />
          <span className="truncate">{notification}</span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="p-3 border-b border-(--line) grid grid-cols-2 gap-1.5 shrink-0 bg-(--bg-card)">
        <button
          onClick={() => setIsSaving(!isSaving)}
          className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded bg-(--bg-card-light) hover:bg-cyan-500/20 hover:text-cyan-400 border border-(--line) text-gray-200 transition-colors text-[10px] font-semibold"
        >
          <Save size={12} className="text-cyan-400" />
          <span>SAVE CIRCUIT</span>
        </button>

        <button
          onClick={handleExportJSON}
          className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded bg-(--bg-card-light) hover:bg-cyan-500/20 hover:text-cyan-400 border border-(--line) text-gray-200 transition-colors text-[10px] font-semibold"
        >
          <Download size={12} className="text-cyan-400" />
          <span>EXPORT JSON</span>
        </button>

        <label className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded bg-(--bg-card-light) hover:bg-cyan-500/20 hover:text-cyan-400 border border-(--line) text-gray-200 transition-colors text-[10px] font-semibold cursor-pointer">
          <Upload size={12} className="text-cyan-400" />
          <span>IMPORT JSON</span>
          <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
        </label>

        <button
          onClick={handleExportPNG}
          className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded bg-(--bg-card-light) hover:bg-cyan-500/20 hover:text-cyan-400 border border-(--line) text-gray-200 transition-colors text-[10px] font-semibold"
        >
          <Image size={12} className="text-cyan-400" />
          <span>EXPORT PNG</span>
        </button>
      </div>

      {/* Inline Save Dialog */}
      {isSaving && (
        <div className="p-3 bg-(--bg-card-light) border-b border-(--line) shrink-0 space-y-2">
          <label className="text-[10px] text-gray-400 uppercase font-semibold">NÁZEV OBVODU:</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={circuitName}
              onChange={(e) => setCircuitName(e.target.value)}
              placeholder="např. 8-Bit ALU nebo Dual Counter"
              className="flex-1 bg-(--bg-card) border border-(--line) px-2.5 py-1.5 rounded text-white text-[11px] outline-none focus:border-cyan-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCircuit()}
            />
            <button
              onClick={handleSaveCircuit}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded text-[10px]"
            >
              ULOŽIT
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Section: Architectural Presets */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 flex items-center justify-between">
            <span>BUILT-IN ARCHITECTURE GALLERY</span>
            <span className="text-[9px] text-cyan-500/80">VERIFIED</span>
          </div>

          <div className="space-y-1.5">
            {Object.entries(PRESET_CIRCUITS).map(([key, circuit]) => (
              <div
                key={key}
                className="p-2.5 rounded-lg bg-(--bg-card-light) hover:bg-(--bg-card-light) border border-(--line) hover:border-cyan-500/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-gray-200 group-hover:text-cyan-300">
                    {circuit.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    {circuit.components.length} ICs
                  </span>
                </div>

                <p className="text-[10px] text-gray-400 line-clamp-2 mb-2 leading-relaxed font-sans">
                  {circuit.prompt}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-(--line)">
                  <span className="text-[9px] text-gray-500 font-mono">
                    {circuit.wires.length} WIRES
                  </span>
                  <button
                    onClick={() => handleLoadPreset(key)}
                    className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/30 font-semibold text-[10px] transition-colors"
                  >
                    <Play size={10} />
                    <span>LOAD</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: User Saved Designs */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 flex items-center justify-between">
            <span>MY SAVED CIRCUITS</span>
            <span className="text-[9px] text-gray-400 font-mono">{savedCircuits.length}</span>
          </div>

          {savedCircuits.length === 0 ? (
            <div className="p-4 rounded border border-dashed border-(--line) text-center text-gray-500 text-[10px]">
              Zatím nemáte žádné uložené obvody. Klikněte nahoře na "SAVE CIRCUIT" pro uložení aktuálního návrhu.
            </div>
          ) : (
            <div className="space-y-1.5">
              {savedCircuits.map((c) => (
                <div
                  key={c.name}
                  className="p-2.5 rounded-lg bg-(--bg-card-light) hover:bg-(--bg-card-light) border border-(--line) hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-gray-200 group-hover:text-cyan-300">
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleDeleteSaved(c.name)}
                      className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                      title="Smazat obvod"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div className="text-[9px] text-gray-500 mb-2 font-mono">
                    Uloženo: {new Date(c.createdAt || Date.now()).toLocaleDateString()}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-(--line)">
                    <span className="text-[9px] text-gray-500 font-mono">
                      {c.components?.length || 0} ICs / {c.wires?.length || 0} WIRES
                    </span>
                    <button
                      onClick={() => handleLoadSaved(c)}
                      className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/30 font-semibold text-[10px] transition-colors"
                    >
                      <Play size={10} />
                      <span>LOAD</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-(--line) shrink-0 bg-(--bg-card)/90">
        <button
          onClick={handleClearCanvas}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors text-[10px] font-semibold"
        >
          <Trash2 size={12} />
          <span>CLEAR ENTIRE CANVAS</span>
        </button>
      </div>
    </div>
  );
}
