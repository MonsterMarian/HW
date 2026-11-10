import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Cpu, ShieldCheck, ArrowLeft, Tag } from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';
import { findSubcircuit, currentLevelOf } from '../engine/hierarchicalSubcircuits';
import { disposeTree, signalStyle } from './physics/common.js';
import { DEVICES } from '../engine/devices/index.js';
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
  board: { head: 'DESKA PLOŠNÝCH SPOJŮ (PCB)', lines: ['FR-4 1,6 mm, zelená maska, cesty podle sítí', 'Pouzdra v reálných rozměrech, pozice 1:1 s 2D PCB', 'Jantar = log. 1 / napětí · šedá = Z · červená = X'] },
  chip: { head: 'POUZDRO PQFP-208', lines: ['28 × 28 × 3.4 mm, 208 vývodů gull-wing', 'Rozteč vývodů 0.5 mm, pájecí plošky na PCB'] },
  die: { head: 'ODKRYTÉ POUZDRO A DIE', lines: ['Měřítko v mm: pouzdro, die, pad ring, Au drátky 25 µm', 'Bloky = floorplan podobvodu (model), textura podle typu', 'Horní kov = sběrnice mezi bloky · jantar = log. 1'] },
  cells: { head: 'LAYOUT STANDARDNÍCH BUNĚK', lines: ['Řady buněk: VDD/GND v M1, n-well (PMOS) u VDD', 'Poly-Si hradla svisle, difuze, W kontakty', 'Propoje M2 vodorovně, M3 svisle · výšky zvětšené'] },
  cmos: { head: 'CMOS BUŇKA Z TRANZISTORŮ', lines: ['PMOS v n-wellu u VDD, NMOS v p-substrátu u GND', 'Společné poly hradlo, výstupní uzel M1/M2 · měřítko µm', 'Kanál svítí jantarem, když tranzistor vede'] },
  mosfet: { head: 'PRŮŘEZ MOSFETEM 0,5 µm', lines: ['LOCOS s ptačím zobákem, S/D + LDD, oxidové spacery', 'Oxid hradla 10 nm, poly N+, W kontakty, 3× Al', 'Měřítko 1:1 v µm · nosiče jen při sepnutém kanálu'] },
  atoms: { head: 'ATOMY: ROZHRANÍ Si / SiO₂', lines: ['Si: diamantová mřížka a = 5,431 Å, Si–Si 2,35 Å', 'SiO₂ amorfní: tetraedry SiO₄, Si–O 1,61 Å, ∠ ≈ 144°', 'Měřítko v Å · fyzikální limit'] },
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
    scene.background = new THREE.Color(0x070708);
    scene.fog = new THREE.FogExp2(0x070708, 0.005);

    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.05, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    // neutral studio reflections, otherwise metal (leads, gold fingers, steel bracket) renders black
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();

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

    // Studio lighting: soft hemisphere + shadowed key + neutral rims
    scene.add(new THREE.HemisphereLight(0xf2efe8, 0x16140f, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(18, 34, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
    key.shadow.bias = -0.0004;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd6dce6, 0.45);
    rim.position.set(-25, 18, -22);
    scene.add(rim);
    const warm = new THREE.DirectionalLight(0xffd9a0, 0.35);
    warm.position.set(22, 6, -18);
    scene.add(warm);

    const grid = new THREE.GridHelper(200, 100, 0x2a2a2e, 0x141416);
    scene.add(grid);

    const content = new THREE.Group();
    scene.add(content);
    const highlight = new THREE.Box3Helper(new THREE.Box3(), 0xffa909);
    highlight.visible = false;
    scene.add(highlight);

    const state = { renderer, labelRenderer, scene, camera, controls, content, grid, highlight, pickables: [], signals: [], frameFns: [], labels: [] };
    three.current = state;
    if (import.meta.env.DEV) Object.assign(window, { __engine: engine, __three: state }); // dev only: hidden screenshot tool drives sim + camera

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
      // copper / metal follows the value of its net (only the material changes, the scene is not rebuilt)
      for (const s of state.signals) {
        const v = s.wire ? engine.wireValue(s.wire) : engine.pinValue(s.id, s.pin) ?? engine.components.get(s.id)?.outputs?.[s.pin];
        if (v === s.last) continue;
        s.last = v;
        const { hex, intensity } = signalStyle(v, s.width, s.analogMax);
        s.mat.emissive.setHex(hex);
        s.mat.emissiveIntensity = intensity;
      }
      for (const f of state.frameFns) f(time);
      for (const l of state.labels) l.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      if (state.labels.length && frame++ % 8 === 0) declutterLabels(state.labels, camera, container);
    };
    let frame = 0;
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
      scene.environment?.dispose();
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
        obj.traverse((o) => { if (o.isMesh && o.material.opacity !== 0) { o.castShadow = true; o.receiveShadow = true; } });
        st.content.add(obj);
        st.pickables.push(obj);
        if (label) {
          const el = document.createElement('div');
          el.className = 'phys-label';
          const drill = !!findSubcircuit(comp, hierarchyStack);
          el.style.cssText = `font:700 10px/1.4 "Courier New",monospace;letter-spacing:.06em;color:${drill ? '#FFA909' : '#ADAAA7'};background:rgba(1,1,2,.8);border:1px solid ${drill ? 'rgba(255,169,9,.5)' : 'rgba(113,117,121,.35)'};padding:1px 6px;white-space:nowrap;transform:translateY(-50%)`;
          const lbl = new CSS2DObject(el);
          lbl.position.copy(label);
          st.content.add(lbl);
          lbl.userData.priority = drill ? 2 : 1;
          const base = (comp.label || comp.id).slice(0, 34);
          const isProbe = comp.type === 'PROBE';
          let lastText = '';
          st.labels.push({
            obj: lbl,
            el,
            update() {
              const text = isProbe ? `${base}: ${fmt(comp.inputs.in)}` : comp.type === 'INPUT' ? `${base} [${comp.outputs.out}]` : base;
              if (text !== lastText) { el.textContent = (drill ? '▸ ' : '') + text; lastText = text; }
            },
          });
        }
      },
      addSignal(mat, id, pin) { st.signals.push({ mat, id, pin, last: null }); },
      addTrace(mat, wire, { width = 1, analogMax = null } = {}) { st.signals.push({ mat, wire, width, analogMax, last: null }); },
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
    <div className="relative w-full h-full bg-(--bg-dark) overflow-hidden select-none font-mono">
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Breadcrumb navigation */}
      {hierarchyStack.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto max-w-[60%]">
          <div className="flex items-stretch bg-(--bg-dark) border border-gray-700 text-[11px] uppercase tracking-[0.1em]">
            <button
              onClick={() => onNavigateUp?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-(--accent-amber) text-(--bg-dark) hover:brightness-110 transition-colors font-bold shrink-0"
              title="Vrátit se o úroveň výše (Backspace / Esc)"
            >
              <ArrowLeft size={13} />
              <span>ZPĚT</span>
            </button>
            <div className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-none">
              {hierarchyStack.map((lvl, idx) => {
                const isCurrent = idx === hierarchyStack.length - 1;
                return (
                  <React.Fragment key={lvl.id + '-' + idx}>
                    {idx > 0 && <span className="text-gray-600">/</span>}
                    <button
                      onClick={() => onNavigateUp?.(idx)}
                      disabled={isCurrent}
                      className={`px-1.5 py-1 whitespace-nowrap transition-colors ${isCurrent ? 'text-(--text-light) font-bold cursor-default!' : 'text-gray-500 hover:text-(--accent-amber)'}`}
                      title={lvl.title}
                    >
                      <span className={`mr-1 ${isCurrent ? 'text-(--accent-amber)' : 'text-gray-600'}`}>L{lvl.level || idx + 1}</span>
                      {lvl.title.length > 24 ? lvl.title.slice(0, 22) + '…' : lvl.title}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <span className={`flex items-center px-3 border-l border-(--line) whitespace-nowrap shrink-0 ${level >= 8 ? 'text-(--accent-amber)' : 'text-gray-500'}`}>
              ÚROVEŇ&nbsp;<b className="text-(--accent-amber)">{level}</b>&nbsp;/ 8
            </span>
          </div>
          {entry.subtitle && (
            <div className="mt-1.5 px-3 py-1 bg-(--bg-dark)/90 border border-(--line)">
              <span className="serif-accent text-[13px]">{entry.subtitle}</span>
            </div>
          )}
        </div>
      )}

      {/* Root: board vs chip close-up */}
      {level <= 1 && hasNv1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-stretch bg-(--bg-dark)/90 border border-(--line) text-[11px] uppercase tracking-[0.1em] z-20">
          {[['board', ShieldCheck, 'CELÁ KARTA (DIAMOND EDGE 3D)'], ['chip', Cpu, 'ČIP STG2000X (PQFP-208)']].map(([mode, Icon, text]) => (
            <button
              key={mode}
              onClick={() => setModelMode(mode)}
              className={`flex items-center gap-2 px-3.5 py-2 font-bold transition-colors ${modelMode === mode ? 'bg-(--accent-amber) text-(--bg-dark)' : 'text-gray-400 hover:text-(--text-light)'}`}
            >
              <Icon size={14} />
              <span>{text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Camera presets + labels toggle */}
      <div className="absolute top-3 right-3 flex items-stretch bg-(--bg-dark)/90 border border-(--line) text-[11px] uppercase tracking-[0.1em] z-20">
        {[['iso', 'IZO 3D'], ['top', 'SHORA'], ['detail', 'DETAIL']].map(([k, t]) => (
          <button key={k} onClick={() => setPresetCamera(k)} className={`px-3 py-1.5 font-bold transition-colors ${cameraView === k ? 'bg-(--accent-amber) text-(--bg-dark)' : 'text-gray-400 hover:text-(--text-light)'}`}>
            {t}
          </button>
        ))}
        <button onClick={() => setShowLabels((v) => !v)} title="Popisky komponent" className={`px-2.5 py-1.5 border-l border-(--line) ${showLabels ? 'text-(--accent-amber)' : 'text-gray-500'}`}>
          <Tag size={14} />
        </button>
      </div>

      {/* Info HUD */}
      <div className="absolute top-3 left-3 bg-(--bg-dark)/90 border border-(--line) p-4 text-xs space-y-2 pointer-events-none max-w-xs z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-(--accent-amber) shrink-0" />
          <span className="panel-title">{entry.title}</span>
        </div>
        <div className="serif-accent text-[14px]">{info.head}</div>
        <div className="text-gray-400 space-y-0.5 text-[11px]">
          {info.lines.map((l) => <div key={l}>{l}</div>)}
        </div>
        {drillable.length > 0 && level < 8 ? (
          <div className="meta leading-snug">▸ Dvojklikem dovnitř: <span className="text-gray-300">{drillable.slice(0, 6).join(', ')}{drillable.length > 6 ? ' …' : ''}</span></div>
        ) : (
          <div className="meta text-(--accent-amber)">Nejnižší úroveň – dál už nelze</div>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-(--bg-dark) border border-gray-700 px-5 py-3 pointer-events-none max-w-xl">
          <div className="panel-title">{hovered.comp.label || hovered.comp.id}</div>
          {DEVICES[hovered.comp.type]?.meta && (
            <div className="text-(--text-light) text-[11px] mt-0.5">{DEVICES[hovered.comp.type].meta.part} · {DEVICES[hovered.comp.type].meta.pkg}</div>
          )}
          <div className="text-gray-400 text-[11px] mt-0.5">
            {hovered.comp.type}
            {Object.keys(hovered.comp.outputs || {}).length > 0 && ' · ' + Object.entries(hovered.comp.outputs).slice(0, 4).map(([k, v]) => `${k}=${fmt(v)}`).join('  ')}
          </div>
          {hovered.canDrill && <div className="meta text-(--accent-amber) mt-1">Dvojklik = vstoupit dovnitř</div>}
          {hovered.comp.type === 'INPUT' && <div className="meta text-(--text-light) mt-1">Klik = přepnout 0/1</div>}
        </div>
      )}
    </div>
  );
}

function fmt(v) {
  if (v === undefined) return '-';
  if (typeof v === 'number' && !Number.isInteger(v)) return `${v.toFixed(2)} V`; // analogová síť
  return typeof v === 'number' && v > 1 ? '0x' + v.toString(16).toUpperCase() : String(v);
}

// Hide CSS2D labels that would overlap a more important / nearer one (screen-space greedy placement)
const _lp = new THREE.Vector3();
function declutterLabels(labels, camera, container) {
  const W = container.clientWidth, H = container.clientHeight;
  const items = labels.map((l) => {
    l.obj.getWorldPosition(_lp);
    const d = _lp.distanceTo(camera.position);
    _lp.project(camera);
    return { l, d, x: ((_lp.x + 1) / 2) * W, y: ((1 - _lp.y) / 2) * H, front: _lp.z < 1 };
  }).sort((a, b) => (b.l.obj.userData.priority || 0) - (a.l.obj.userData.priority || 0) || a.d - b.d);
  const placed = [];
  for (const it of items) {
    const w = it.l.el.offsetWidth, h = it.l.el.offsetHeight;
    const r = { x0: it.x - w / 2 - 3, x1: it.x + w / 2 + 3, y0: it.y - h - 2, y1: it.y + 2 }; // label is lifted by translateY(-50%)
    const free = it.front && !placed.some((p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0);
    it.l.el.style.visibility = free ? 'visible' : 'hidden';
    if (free) placed.push(r);
  }
}
