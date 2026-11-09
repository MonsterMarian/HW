import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Cpu, ShieldCheck, ArrowLeft, Tag } from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { findSubcircuit, currentLevelOf } from '../engine/hierarchicalSubcircuits';
import { disposeTree, signalHex } from './physics/common.js';
import { buildBoardScene } from './physics/boardScene.js';
import { buildChipCloseUp, buildDieScene, buildCellScene, buildCmosScene, buildMosfetScene, buildAtomScene } from './physics/siliconScenes.js';

// Which physical representation fits a hierarchy level
function sceneKindFor(level) {
  if (level <= 1) return 'board';
  if (level === 2) return 'die';
  if (level <= 5) return 'cells';
  if (level === 6) return 'cmos';
  if (level === 7) return 'mosfet';
  return 'atoms';
}

const KIND_INFO = {
  board: { head: 'DESKA PLOŠNÝCH SPOJŮ (PCB)', lines: ['FR-4 1.6 mm, nepájivá maska, měděné cesty', 'Rozmístění 1:1 podle 2D pohledu HARDWARE PCB', 'Přepínače (INPUT) lze přepnout kliknutím'] },
  chip: { head: 'POUZDRO PQFP-208', lines: ['28 × 28 × 3.4 mm, 208 vývodů gull-wing', 'Rozteč vývodů 0.5 mm, pájecí plošky na PCB'] },
  die: { head: 'ODKRYTÝ KŘEMÍKOVÝ ČIP (DIE)', lines: ['Bloky rozmístěné podle schématu podobvodu', '208 bond pads + zlaté drátky 25 µm na lead-frame', 'Horní kovová vrstva = propojení bloků (svítí při log. 1)'] },
  cells: { head: 'LAYOUT STANDARDNÍCH BUNĚK', lines: ['Hnědá: N-well · Žlutá: P+ difuze · Zelená: N+ difuze', 'Červená: polykřemíková hradla · Modrá: metal-2 propoje', 'Paměti = matice bitových buněk s dekodérem'] },
  cmos: { head: 'CMOS TRANZISTORY', lines: ['PMOS v N-well (nahoře), NMOS v P-substrátu (dole)', 'Kanál se rozsvítí, když tranzistor vede', 'Napájecí lišty VDD / GND v metal-1'] },
  mosfet: { head: 'PRŮŘEZ MOSFETEM', lines: ['STI izolace, Source/Drain difuze, LDD, spacery', 'Hradlový oxid SiO₂ 3.5 nm pod polykřemíkem', 'Nosiče náboje proudí jen při sepnutém kanálu'] },
  atoms: { head: 'ATOMOVÁ ÚROVEŇ Si / SiO₂', lines: ['Dole: krystalický Si (diamantová mřížka, 5.43 Å)', 'Nahoře: amorfní SiO₂ (Si–O 1.62 Å, 109.5°)', 'Fyzikální limit – nejmenší stavební jednotka'] },
};

export function PhysicsView({ engine, hierarchyStack = [], onNavigateUp, onDrillDown }) {
  const containerRef = useRef(null);
  const three = useRef(null); // { renderer, labelRenderer, scene, camera, controls, content, pickables, signals, frameFns }
  const [modelMode, setModelMode] = useState('board'); // root only: 'board' | 'chip'
  const [cameraView, setCameraView] = useState('iso');
  const [showLabels, setShowLabels] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [circuitSig, setCircuitSig] = useState(0);

  const level = currentLevelOf(hierarchyStack);
  const entry = hierarchyStack[hierarchyStack.length - 1] || { id: 'root', title: 'NVIDIA NV1 (1995)', level: 1 };
  const hasNv1 = engine.components.has('nv1_core');
  const kind = level <= 1 && modelMode === 'chip' && hasNv1 ? 'chip' : sceneKindFor(level);

  // Keep fresh values for the long-lived event handlers
  const live = useRef({});
  live.current = { hierarchyStack, onDrillDown, onNavigateUp };

  // Rebuild when the circuit's topology changes (gallery load, editing) - not on every clock tick
  useEffect(() => {
    let sig = '';
    const compute = () => [...engine.components.keys()].join(',') + '|' + engine.wires.length;
    sig = compute();
    return engine.subscribe(() => {
      const s = compute();
      if (s !== sig) { sig = s; setCircuitSig((n) => n + 1); }
    });
  }, [engine]);

  // Esc / Backspace → level up
  useEffect(() => {
    const onKey = (e) => {
      if (hierarchyStack.length > 1 && (e.key === 'Backspace' || e.key === 'Escape')) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        onNavigateUp?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hierarchyStack, onNavigateUp]);

  // ---- Renderer, camera, controls, render loop (created once) ----------------
  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080e);
    scene.fog = new THREE.FogExp2(0x06080e, 0.006);

    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.05, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 2;
    controls.maxDistance = 160;

    // Studio lighting: soft hemisphere + shadowed key + coloured rims
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a1410, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(18, 34, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
    key.shadow.bias = -0.0004;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5fe8ff, 0.7);
    rim.position.set(-25, 18, -22);
    scene.add(rim);
    const warm = new THREE.DirectionalLight(0xffcf8a, 0.45);
    warm.position.set(22, 6, -18);
    scene.add(warm);

    const grid = new THREE.GridHelper(200, 100, 0x0c3a46, 0x0d1522);
    scene.add(grid);

    const content = new THREE.Group();
    scene.add(content);
    const highlight = new THREE.Box3Helper(new THREE.Box3(), 0x00f0ff);
    highlight.visible = false;
    scene.add(highlight);

    const state = { renderer, labelRenderer, scene, camera, controls, content, grid, highlight, pickables: [], signals: [], frameFns: [], labels: [] };
    three.current = state;

    // ---- picking ----
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(state.pickables, true)[0];
      if (!hit) return null;
      let o = hit.object;
      while (o && !o.userData.comp) o = o.parent;
      return o || null;
    };
    let hoveredObj = null;
    const onMove = (e) => {
      const o = pick(e);
      if (o === hoveredObj) return;
      hoveredObj = o;
      if (o) {
        highlight.box.setFromObject(o).expandByScalar(0.08);
        highlight.visible = true;
        const comp = o.userData.comp;
        const canDrill = !!findSubcircuit(comp, live.current.hierarchyStack);
        renderer.domElement.style.cursor = canDrill || comp.type === 'INPUT' ? 'pointer' : 'help';
        setHovered({ comp, canDrill });
      } else {
        highlight.visible = false;
        renderer.domElement.style.cursor = 'grab';
        setHovered(null);
      }
    };
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
      const o = pick(e);
      const comp = o?.userData.comp;
      if (comp?.type === 'INPUT') {
        // Same behaviour as the 2D canvas: click toggles the switch
        comp.outputs.out = comp.outputs.out === 1 ? 0 : 1;
        audioEngine.playRelayClick(comp.outputs.out ? 1.4 : 0.8);
        engine.propagate();
        engine.notify();
      }
    };
    const onDbl = (e) => {
      const o = pick(e);
      if (o) live.current.onDrillDown?.(o.userData.comp);
    };
    const dom = renderer.domElement;
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('dblclick', onDbl);

    // ---- render loop ----
    let raf;
    const loop = (time) => {
      raf = requestAnimationFrame(loop);
      controls.update();
      for (const s of state.signals) {
        const v = engine.components.get(s.id)?.outputs?.[s.pin];
        const bus = typeof v === 'number' && v > 3; // multi-bit bus value
        const hex = bus ? signalHex(1) : signalHex(v);
        const intensity = v === 1 || v === 2 || v === 3 ? 1.1 : bus ? 0.55 : 0;
        if (s.last !== hex + intensity) {
          s.last = hex + intensity;
          s.mat.emissive.setHex(hex);
          s.mat.emissiveIntensity = intensity;
        }
      }
      for (const f of state.frameFns) f(time);
      for (const l of state.labels) l.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('dblclick', onDbl);
      controls.dispose();
      disposeTree(content);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
      three.current = null;
    };
  }, [engine]);

  // ---- Scene content (rebuilt per level / circuit) ---------------------------
  const sceneInfo = useRef(null);
  useEffect(() => {
    const st = three.current;
    if (!st) return;
    // clear previous content
    for (const child of [...st.content.children]) {
      st.content.remove(child);
      disposeTree(child);
    }
    st.pickables = [];
    st.signals = [];
    st.frameFns = [];
    st.labels = [];
    st.highlight.visible = false;
    setHovered(null);

    const ctx = {
      engine,
      entry,
      stack: hierarchyStack,
      group: st.content,
      addComp(comp, obj, { label } = {}) {
        obj.userData.comp = comp;
        obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        st.content.add(obj);
        st.pickables.push(obj);
        if (label) {
          const el = document.createElement('div');
          el.className = 'phys-label';
          const drill = !!findSubcircuit(comp, hierarchyStack);
          el.style.cssText = `font:600 10px "JetBrains Mono",monospace;color:${drill ? '#7ff6ff' : '#b9c6d8'};background:rgba(6,10,18,.72);border:1px solid ${drill ? 'rgba(0,240,255,.45)' : 'rgba(120,140,170,.3)'};padding:1px 6px;border-radius:4px;white-space:nowrap;transform:translateY(-50%)`;
          const lbl = new CSS2DObject(el);
          lbl.position.copy(label);
          st.content.add(lbl);
          const base = (comp.label || comp.id).slice(0, 34);
          const isProbe = comp.type === 'PROBE';
          let lastText = '';
          st.labels.push({
            update() {
              const text = isProbe ? `${base}: ${fmt(comp.inputs.in)}` : comp.type === 'INPUT' ? `${base} [${comp.outputs.out}]` : base;
              if (text !== lastText) { el.textContent = (drill ? '▸ ' : '') + text; lastText = text; }
            },
          });
        }
      },
      addSignal(mat, id, pin) { st.signals.push({ mat, id, pin, last: null }); },
      onFrame(fn) { st.frameFns.push(fn); },
    };

    const builders = { board: buildBoardScene, chip: buildChipCloseUp, die: buildDieScene, cells: buildCellScene, cmos: buildCmosScene, mosfet: buildMosfetScene, atoms: buildAtomScene };
    let info;
    try {
      info = builders[kind](ctx);
    } catch (err) {
      console.error('3D scene build failed', err);
      info = { camera: [0, 20, 24], target: [0, 0, 0], floorY: 0 };
    }
    st.grid.position.y = (info.floorY ?? 0) - 0.01;
    st.grid.visible = kind !== 'board'; // the board scene has its own desk
    sceneInfo.current = info;
    st.camera.position.set(...info.camera);
    st.controls.target.set(...info.target);
    st.controls.update();
    setCameraView('iso');
    // labels visibility
    st.labelRenderer.domElement.style.display = showLabels ? '' : 'none';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, entry.key, entry.id, hierarchyStack.length, circuitSig, engine]);

  useEffect(() => {
    if (three.current) three.current.labelRenderer.domElement.style.display = showLabels ? '' : 'none';
  }, [showLabels]);

  const setPresetCamera = (type) => {
    setCameraView(type);
    const st = three.current;
    const info = sceneInfo.current;
    if (!st || !info) return;
    const [tx, ty, tz] = info.target;
    const dist = new THREE.Vector3(...info.camera).distanceTo(new THREE.Vector3(...info.target));
    if (type === 'top') st.camera.position.set(tx, ty + dist, tz + 0.01);
    else if (type === 'detail') st.camera.position.set(tx + dist * 0.25, ty + dist * 0.3, tz + dist * 0.4);
    else st.camera.position.set(...info.camera);
    st.controls.target.set(tx, ty, tz);
    st.controls.update();
  };

  const drillable = useMemo(
    () => [...engine.components.values()].filter((c) => findSubcircuit(c, hierarchyStack)).map((c) => c.label || c.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, hierarchyStack, circuitSig]
  );
  const info = KIND_INFO[kind];

  return (
    <div className="relative w-full h-full bg-[#06080E] overflow-hidden select-none font-mono">
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Breadcrumb navigation */}
      {hierarchyStack.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto max-w-[60%]">
          <div className="flex items-center space-x-2 bg-[#080D1A]/95 border border-cyan-500/50 rounded-2xl px-4 py-2 shadow-[0_10px_35px_rgba(0,240,255,0.25)] backdrop-blur-xl">
            <button
              onClick={() => onNavigateUp?.()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 hover:text-white transition-all text-xs font-bold active:scale-95 shrink-0"
              title="Vrátit se o úroveň výše (Backspace / Esc)"
            >
              <ArrowLeft size={13} />
              <span>LEVEL UP</span>
            </button>
            <div className="flex items-center space-x-1.5 text-xs overflow-x-auto scrollbar-none py-0.5">
              {hierarchyStack.map((lvl, idx) => {
                const isCurrent = idx === hierarchyStack.length - 1;
                return (
                  <React.Fragment key={lvl.id + '-' + idx}>
                    {idx > 0 && <span className="text-cyan-500/60 font-bold">›</span>}
                    <button
                      onClick={() => onNavigateUp?.(idx)}
                      disabled={isCurrent}
                      className={`px-2 py-1 rounded whitespace-nowrap ${isCurrent ? 'text-cyan-200 font-bold bg-cyan-900/40 border border-cyan-500/40' : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-950/40'}`}
                      title={lvl.title}
                    >
                      <span className="text-[10px] text-cyan-500/80 mr-1">L{lvl.level || idx + 1}</span>
                      {lvl.title.length > 24 ? lvl.title.slice(0, 22) + '…' : lvl.title}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border whitespace-nowrap shrink-0 ${level >= 8 ? 'text-amber-400 bg-amber-950/60 border-amber-500/50' : 'text-cyan-400 bg-cyan-950/60 border-cyan-700/50'}`}>
              ÚROVEŇ {level} / 8
            </span>
          </div>
          {entry.subtitle && (
            <div className="mt-1.5 text-[11px] text-cyan-300/90 bg-[#060A14]/90 border border-cyan-500/30 px-3.5 py-1 rounded-full backdrop-blur-md">
              {entry.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Root: board vs chip close-up */}
      {level <= 1 && hasNv1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-[#080D1A]/95 border border-cyan-500/40 rounded-2xl p-1.5 backdrop-blur-xl text-xs z-20">
          {[['board', ShieldCheck, 'CELÁ KARTA (DIAMOND EDGE 3D)'], ['chip', Cpu, 'ČIP STG2000X (PQFP-208)']].map(([mode, Icon, text]) => (
            <button
              key={mode}
              onClick={() => setModelMode(mode)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all ${modelMode === mode ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-400/60' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={14} className="text-cyan-400" />
              <span>{text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Camera presets + labels toggle */}
      <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-[#080D1A]/90 border border-cyan-500/40 rounded-xl p-1.5 backdrop-blur-xl text-xs z-20">
        {[['iso', 'IZO 3D'], ['top', 'SHORA'], ['detail', 'DETAIL']].map(([k, t]) => (
          <button key={k} onClick={() => setPresetCamera(k)} className={`px-3 py-1.5 rounded-lg font-semibold ${cameraView === k ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
        <button onClick={() => setShowLabels((v) => !v)} title="Popisky komponent" className={`px-2 py-1.5 rounded-lg ${showLabels ? 'text-cyan-300' : 'text-gray-500'}`}>
          <Tag size={14} />
        </button>
      </div>

      {/* Info HUD */}
      <div className="absolute top-4 left-4 bg-[#080D1A]/95 border border-cyan-500/40 p-4 rounded-xl text-xs space-y-2 pointer-events-none backdrop-blur-xl max-w-xs z-20">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span>{entry.title}</span>
        </div>
        <div className="text-white font-semibold text-[11px]">{info.head}</div>
        <div className="text-gray-300 space-y-0.5 text-[11px]">
          {info.lines.map((l) => <div key={l}>{l}</div>)}
        </div>
        {drillable.length > 0 && level < 8 ? (
          <div className="text-cyan-300 text-[10px] leading-snug">▸ Dvojklikem dovnitř: {drillable.slice(0, 6).join(', ')}{drillable.length > 6 ? ' …' : ''}</div>
        ) : (
          <div className="text-amber-400 text-[10px] font-bold">Nejnižší úroveň – dál už nelze</div>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#080D1A]/95 border border-cyan-400/60 px-5 py-3 rounded-2xl backdrop-blur-xl pointer-events-none max-w-xl">
          <div className="text-white font-bold text-xs tracking-wide">{hovered.comp.label || hovered.comp.id}</div>
          <div className="text-cyan-300/80 text-[11px] mt-0.5">
            {hovered.comp.type}
            {Object.keys(hovered.comp.outputs || {}).length > 0 && ' · ' + Object.entries(hovered.comp.outputs).slice(0, 4).map(([k, v]) => `${k}=${fmt(v)}`).join('  ')}
          </div>
          {hovered.canDrill && <div className="text-amber-400 font-semibold text-[10px] mt-1">⚡ DVOJKLIK = VSTOUPIT DOVNITŘ</div>}
          {hovered.comp.type === 'INPUT' && <div className="text-emerald-400 font-semibold text-[10px] mt-1">KLIK = PŘEPNOUT 0/1</div>}
        </div>
      )}
    </div>
  );
}

function fmt(v) {
  if (v === 2) return 'Z';
  if (v === 3) return 'X';
  if (v === undefined) return '-';
  return typeof v === 'number' && v > 1 ? '0x' + v.toString(16).toUpperCase() : String(v);
}
