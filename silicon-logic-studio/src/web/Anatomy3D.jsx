// Anatomie ve 3D ve stylu robotí aplikace: jantarová záře, matné díly, mřížka, let kamerou (WASD, Q/E, šipky, F),
// posuvník Složený → Rozložený, systémy vlevo, hledání dílu. Obsah scény staví stejné buildery jako desktopové DIE 3D,
// takže dvojklik na díl jde o úroveň hlouběji (sestava → deska → čip → buňky → tranzistor → atomy → kvarky).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ArrowLeft } from 'lucide-react';
import { findSubcircuit, currentLevelOf, HIERARCHICAL_SUBCIRCUITS as H } from '../engine/hierarchicalSubcircuits';
import { disposeTree, signalStyle } from '../views/physics/common.js';
import { contentBounds } from '../views/physics/viewQuality.js';
import { buildBoardScene } from '../views/physics/boardScene.js';
import { buildMyPcScene } from '../views/physics/myPcScene.js';
import { buildAiPcScene } from '../views/physics/aiPcScene.js';
import { buildFinfetScene, buildVnandScene, buildTrenchScene, buildPlanarScene, buildLatticeScene, buildAtomModelScene, buildNucleusScene, buildNucleonScene } from '../views/physics/deepScenes.js';
import { buildChipCloseUp, buildDieScene, buildCellScene, buildCmosScene, buildMosfetScene, buildAtomScene } from '../views/physics/siliconScenes.js';
import { buildModel } from '../views/economic/models.js';
import { PARTS, partForComp } from './parts.js';

const LEVEL_KIND = (l) => (l <= 1 ? 'board' : l === 2 ? 'die' : l <= 5 ? 'cells' : l === 6 ? 'cmos' : l === 7 ? 'mosfet' : 'atoms');
const SYS_COLORS = ['#c98a4b', '#e0a640', '#8fb05a', '#4fa3c7', '#9a7fd1', '#d0675a', '#b9b2a6', '#5fbf9f', '#c7b04f', '#7d8fd6'];
const VIEW_DIR = new THREE.Vector3(0.62, 0.34, 0.86).normalize(); // výchozí pohled robotí aplikace


const systemOf = (comp) => partForComp(comp)?.kind ?? ({ PC_BLOCK: 'Bloky', PROBE: 'Sondy (měření)', INPUT: 'Ovládání' }[comp.type] ?? comp.type.replace(/_/g, ' '));

export function Anatomy3D({ engine, hierarchyStack, onNavigateUp, onDrillDown, model, onOpenPart, partId }) {
  const host = useRef(null);
  const st = useRef(null);
  const [explode, setExplode] = useState(0);
  const [keepFramed, setKeepFramed] = useState(true);
  const [sysColors, setSysColors] = useState(false);
  const [labels, setLabels] = useState(false);
  const [hidden, setHidden] = useState(() => new Set());
  const [hover, setHover] = useState(null);
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState('');
  const [systems, setSystems] = useState([]);
  const [hint, setHint] = useState(null);

  const level = currentLevelOf(hierarchyStack);
  const entry = hierarchyStack[hierarchyStack.length - 1];
  const kind = entry.key === '__model' ? 'model' : H[entry.key]?.scene || LEVEL_KIND(level);
  const live = useRef({});
  live.current = { hierarchyStack, onDrillDown, onNavigateUp };

  // ── renderer, kamera, světla jako u robotů (vytvoří se jednou) ─────────────────────────────────────
  useEffect(() => {
    const el = host.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: 'block', touchAction: 'none', outline: 'none' });
    const labelR = new CSS2DRenderer();
    Object.assign(labelR.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
    el.appendChild(labelR.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.005, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.15, zoomToCursor: true, rotateSpeed: 0.8, zoomSpeed: 1.4 });
    scene.add(new THREE.HemisphereLight(0xfff0dc, 0x2a1f16, 1.15));
    for (const [c, i, p] of [[0xffffff, 1.5, [1.2, 2, 1.4]], [0xffd8a8, 0.5, [-1.5, 0.8, -1.2]], [0xffe7c8, 0.3, [0.2, -1, 0.8]]]) {
      const d = new THREE.DirectionalLight(c, i); d.position.set(...p); scene.add(d);
    }
    const grid = new THREE.GridHelper(2, 40, 0x6b5435, 0x3a2c1f);
    scene.add(grid);
    const content = new THREE.Group();
    scene.add(content);
    const box = new THREE.Box3Helper(new THREE.Box3(), 0xffb52e);
    box.visible = false;
    scene.add(box);

    const s = { renderer, labelR, scene, camera, controls, grid, content, box, bodies: [], signals: [], frameFns: [], radius: 1, center: new THREE.Vector3(), held: new Set(), flight: 0, flew: false };
    st.current = s;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hit = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(s.bodies.filter((b) => b.obj.visible).map((b) => b.obj), true)[0];
      if (!h) return null;
      let o = h.object;
      while (o && !o.userData.comp) o = o.parent;
      return o ? { body: s.bodies.find((b) => b.obj === o), point: h.point } : null;
    };
    s.hit = hit;
    let hovered = null;
    const onMove = (e) => {
      const h = hit(e)?.body ?? null;
      if (h === hovered) return;
      hovered = h;
      box.visible = !!h;
      if (h) box.box.setFromObject(h.obj);
      renderer.domElement.style.cursor = h ? 'pointer' : 'grab';
      setHover(h ? { comp: h.comp, canDrill: !!findSubcircuit(h.comp, live.current.hierarchyStack) } : null);
    };
    let down = null;
    const onDown = (e) => { down = [e.clientX, e.clientY]; renderer.domElement.focus({ preventScroll: true }); };
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      setPicked(hit(e)?.body.comp ?? null);
    };
    // dvojklik: dovnitř dílu; když dál nejde, otočí kameru kolem bodu (jako u robotů)
    const onDbl = (e) => {
      const h = hit(e);
      if (h && findSubcircuit(h.body.comp, live.current.hierarchyStack)) return live.current.onDrillDown(h.body.comp);
      if (h) { setHint(`${h.body.comp.label || h.body.comp.id}: nejnižší úroveň – dál už nelze`); s.orbitAt(h.point); } else s.frameAll();
    };
    const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'];
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (KEYS.includes(e.code)) { s.flight++; s.held.add(e.code); e.preventDefault(); return; }
      const k = e.key.toLowerCase();
      const d = { arrowleft: [1, 0], arrowright: [-1, 0], arrowup: [0, 1], arrowdown: [0, -1] }[k];
      s.flight++;
      if (s.flew && k !== 'f') s.repivot();
      if (d && e.shiftKey) controls._pan(d[0] * 40, d[1] * 40);
      else if (d) { controls._rotateLeft(d[0] * 0.12); controls._rotateUp(d[1] * 0.12); }
      else if (k === '+' || k === '=') { controls._performCursorZoom = false; controls._dollyIn(0.85); }
      else if (k === '-') { controls._performCursorZoom = false; controls._dollyOut(0.85); }
      else if (k === 'f') s.frameAll();
      else if ((k === 'backspace' || k === 'escape') && live.current.hierarchyStack.length > 1) live.current.onNavigateUp();
      else return;
      e.preventDefault();
    };
    const onKeyUp = (e) => s.held.delete(e.code);
    const dom = renderer.domElement;
    dom.tabIndex = 0;
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('dblclick', onDbl);
    dom.addEventListener('keydown', onKey);
    dom.addEventListener('keyup', onKeyUp);
    dom.addEventListener('blur', () => s.held.clear());
    controls.addEventListener('start', () => { s.flight++; if (s.flew) s.repivot(); });

    // přelet kamery (450 ms, jako u robotů)
    s.flyTo = (target, pos, anim = true) => {
      const id = ++s.flight;
      if (!anim) { controls.target.copy(target); camera.position.copy(pos); return; }
      const t0 = controls.target.clone(), p0 = camera.position.clone(), start = performance.now();
      const step = () => {
        if (id !== s.flight) return;
        const k = Math.min(1, (performance.now() - start) / 450), e = k * k * (3 - 2 * k);
        controls.target.lerpVectors(t0, target, e);
        camera.position.lerpVectors(p0, pos, e);
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    };
    s.fit = (b) => {
      const sph = b.getBoundingSphere(new THREE.Sphere());
      const dist = sph.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.aspect < 1 ? 1.5 : 1.05);
      return { c: sph.center, dist };
    };
    s.frameAll = (anim = true, dir = null) => {
      const b = contentBounds(content);
      if (b.isEmpty()) return;
      const { c, dist } = s.fit(b);
      const d = dir ?? (anim ? camera.position.clone().sub(controls.target).normalize() : VIEW_DIR);
      s.flyTo(c, c.clone().add(d.clone().multiplyScalar(dist)), anim);
    };
    s.orbitAt = (p) => s.flyTo(p, p.clone().add(camera.position.clone().sub(controls.target).multiplyScalar(0.6)), true);
    // po letu WASD posune bod otáčení na díl před kamerou, aby myš neházela kamerou po velkém oblouku
    s.repivot = () => {
      s.flew = false;
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      const h = ray.intersectObjects(s.bodies.map((b) => b.obj), true)[0];
      const fwd = controls.target.clone().sub(camera.position).normalize();
      const depth = s.center.clone().sub(camera.position).dot(fwd);
      const d = Math.max(s.radius * 0.05, Math.min(h ? h.distance : depth, s.radius * 3));
      controls.target.copy(camera.position).addScaledVector(fwd, d);
    };

    let raf, last = performance.now();
    const loop = (time) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (time - last) / 1000); last = time;
      const h = s.held;
      if (h.size) {
        const ax = (a, b) => (h.has(a) ? 1 : 0) - (h.has(b) ? 1 : 0);
        const f = ax('KeyW', 'KeyS'), r = ax('KeyD', 'KeyA'), u = ax('KeyE', 'KeyQ');
        if (f || r || u) {
          const fwd = controls.target.clone().sub(camera.position).normalize();
          const right = fwd.clone().cross(camera.up).normalize();
          const sp = s.radius * (h.has('ShiftLeft') || h.has('ShiftRight') ? 3 : 1) * dt;
          const m = fwd.multiplyScalar(f).add(right.multiplyScalar(r)).add(camera.up.clone().multiplyScalar(u)).multiplyScalar(sp);
          camera.position.add(m); controls.target.add(m); s.flew = true;
        }
      }
      controls.update();
      for (const sg of s.signals) {
        const v = sg.wire ? engine.wireValue(sg.wire) : engine.pinValue(sg.id, sg.pin) ?? engine.components.get(sg.id)?.outputs?.[sg.pin];
        if (v === sg.last) continue;
        sg.last = v;
        const { hex, intensity } = signalStyle(v, sg.width, sg.analogMax);
        sg.mat.emissive.setHex(hex); sg.mat.emissiveIntensity = intensity;
      }
      for (const fn of s.frameFns) fn(time);
      renderer.render(scene, camera);
      labelR.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 1, hh = el.clientHeight || 1;
      renderer.setSize(w, hh, false); labelR.setSize(w, hh);
      Object.assign(renderer.domElement.style, { width: '100%', height: '100%' });
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      disposeTree(content); renderer.dispose();
      el.removeChild(renderer.domElement); el.removeChild(labelR.domElement);
      st.current = null;
    };
  }, [engine]);

  // ── obsah scény pro aktuální úroveň ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    for (const ch of [...s.content.children]) { s.content.remove(ch); disposeTree(ch); }
    Object.assign(s, { bodies: [], signals: [], frameFns: [] });
    s.box.visible = false;
    setHover(null); setPicked(null); setExplode(0); setHidden(new Set());

    const ctx = {
      engine, entry, stack: hierarchyStack, group: s.content,
      addComp(comp, obj, { label } = {}) {
        obj.userData.comp = comp;
        s.content.add(obj);
        s.bodies.push({ comp, obj });
        if (label) {
          const el = document.createElement('div');
          el.className = 'hw3d-label';
          el.textContent = (findSubcircuit(comp, hierarchyStack) ? '▸ ' : '') + (comp.label || comp.id).slice(0, 34);
          const l = new CSS2DObject(el);
          obj.updateMatrixWorld(true);
          l.position.copy(obj.worldToLocal(label.clone()));
          l.userData.label = true;
          obj.add(l);
        }
      },
      addSignal(mat, id, pin) { s.signals.push({ mat, id, pin, last: null }); },
      addTrace(mat, wire, { width = 1, analogMax = null } = {}) { s.signals.push({ mat, wire, width, analogMax, last: null }); },
      onFrame(fn) { s.frameFns.push(fn); },
    };
    const types = new Set([...engine.components.values()].map((c) => c.type));
    const root = types.has('MYPC_BOARD') ? buildMyPcScene : types.has('DELL_T5810') ? buildAiPcScene : buildBoardScene;
    const B = {
      model: (c) => { c.addComp([...engine.components.values()][0], buildModel(model)); return {}; },
      board: level <= 1 ? root : buildBoardScene, chip: buildChipCloseUp, die: buildDieScene, cells: buildCellScene, cmos: buildCmosScene, mosfet: buildMosfetScene,
      atoms: buildAtomScene, flipdie: buildDieScene, finfet: buildFinfetScene, trench: buildTrenchScene, vnand: buildVnandScene, planar: buildPlanarScene,
      lattice: buildLatticeScene, atom: buildAtomModelScene, nucleus: buildNucleusScene, nucleon: buildNucleonScene,
    };
    let info = {};
    try { info = B[kind](ctx) ?? {}; } catch (err) { console.error('3D scéna se nepostavila', err); }

    // stůl a podložky builderů do robotího stylu nepatří (podlahu dělá mřížka)
    s.content.traverse((o) => { if (o.userData.desk) o.visible = false; });
    // robotí styl: matné materiály (drsnost 0,58, kov 0,06); popisky a signálové materiály zůstanou, aby svítily podle sítí
    const keep = new Set(s.signals.map((g) => g.mat));
    const cache = new Map();
    const restyle = (m) => {
      if (!m || keep.has(m) || m.isMeshBasicMaterial || m.isLineBasicMaterial || m.isPointsMaterial || m.isShaderMaterial) return m;
      if (!cache.has(m)) {
        const n = new THREE.MeshStandardMaterial({ color: m.color?.clone() ?? new THREE.Color(0xffffff), map: m.map ?? null, roughness: 0.58, metalness: 0.06,
          transparent: m.transparent, opacity: m.opacity, side: m.side, vertexColors: m.vertexColors, emissive: m.emissive?.clone() ?? new THREE.Color(0), emissiveIntensity: m.emissiveIntensity ?? 1 });
        cache.set(m, n);
      }
      return cache.get(m);
    };
    for (const b of s.bodies) {
      b.mats = [];
      b.obj.traverse((o) => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map(restyle) : restyle(o.material);
        for (const m of [o.material].flat()) if (!keep.has(m) && m.isMeshStandardMaterial) b.mats.push(m);
      });
    }
    // každé tělo dostane vlastní kopie materiálů, aby šlo obarvit podle systému
    for (const b of s.bodies) {
      const own = new Map();
      b.obj.traverse((o) => {
        if (!o.isMesh) return;
        const swap = (m) => (b.mats.includes(m) ? (own.get(m) ?? own.set(m, m.clone()).get(m)) : m);
        o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
      });
      b.mats = [...own.values()].map((m) => ({ m, color: m.color.clone(), map: m.map }));
      b.system = systemOf(b.comp);
    }

    const bb = contentBounds(s.content);
    if (!bb.isEmpty()) {
      const sph = bb.getBoundingSphere(new THREE.Sphere());
      s.radius = sph.radius; s.center.copy(sph.center);
      for (const b of s.bodies) {
        const c = contentBounds(b.obj);
        b.base = b.obj.position.clone();
        b.dir = c.isEmpty() ? new THREE.Vector3() : c.getCenter(new THREE.Vector3()).sub(sph.center);
        if (b.dir.lengthSq() < 1e-9) b.dir.set(0, 1, 0).multiplyScalar(sph.radius * 0.2);
      }
      const R = sph.radius;
      s.grid.scale.setScalar(R * 2.2);
      s.grid.position.set(sph.center.x, bb.min.y - R * 0.002, sph.center.z);
      Object.assign(s.camera, { near: R * 0.004, far: R * 60 });
      s.camera.updateProjectionMatrix();
      Object.assign(s.controls, { minDistance: R * 0.03, maxDistance: R * 30 });
      const dir = info.camera && info.target ? new THREE.Vector3(...info.camera).sub(new THREE.Vector3(...info.target)).normalize().lerp(VIEW_DIR, 0.35).normalize() : VIEW_DIR;
      s.homeDir = dir;
      s.frameAll(false, dir);
    }
    const sys = new Map();
    s.bodies.forEach((b) => sys.set(b.system, (sys.get(b.system) ?? 0) + 1));
    setSystems([...sys.entries()].map(([name, n], i) => ({ name, n, color: SYS_COLORS[i % SYS_COLORS.length] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, entry.key, entry.id, hierarchyStack.length, engine, model]);

  // posuvník Složený → Rozložený
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    for (const b of s.bodies) {
      if (!b.base) continue;
      b.obj.position.copy(b.base).addScaledVector(b.dir, explode * 0.9).addScaledVector(b.dir.clone().normalize(), s.radius * 0.12 * explode);
    }
    if (keepFramed) s.frameAll(false, s.camera.position.clone().sub(s.controls.target).normalize());
  }, [explode, keepFramed]);

  // barvy podle systému, schované systémy, popisky
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    const col = new Map(systems.map((x) => [x.name, x.color]));
    for (const b of s.bodies) {
      b.obj.visible = !hidden.has(b.system);
      for (const { m, color, map } of b.mats ?? []) {
        if (sysColors) { m.color.set(col.get(b.system) ?? '#b9b2a6'); m.map = null; } else { m.color.copy(color); m.map = map; }
        m.needsUpdate = true;
      }
    }
    s.labelR.domElement.style.display = labels ? '' : 'none';
  }, [sysColors, hidden, systems, labels]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !st.current) return [];
    return st.current.bodies.filter((b) => (b.comp.label || b.comp.id).toLowerCase().includes(q)).slice(0, 8);
  }, [query, systems]); // eslint-disable-line react-hooks/exhaustive-deps
  const flyToBody = (b) => {
    const s = st.current;
    const bx = contentBounds(b.obj);
    if (bx.isEmpty()) return;
    const { c, dist } = s.fit(bx);
    s.flyTo(c, c.clone().add(s.camera.position.clone().sub(s.controls.target).normalize().multiplyScalar(dist * 1.6)));
    setPicked(b.comp); setQuery('');
  };

  const pickedPart = picked && partForComp(picked);
  return (
    <div className="hw3d">
      <aside className="hw3d-side">
        {PARTS.some((x) => x.id === partId) && (
          <select className="hw3d-select" value={partId} onChange={(e) => onOpenPart?.(e.target.value)}>
            {PARTS.filter((x) => x.item || x.drill || x.root).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
        <div className="hw3d-title">{entry.title}</div>
        <div className="hw3d-sub">{systems.reduce((a, x) => a + x.n, 0)} dílů · táhni = otáčení · dvojklik = dovnitř</div>
        <div className="hw3d-h">Systémy <button onClick={() => setHidden(hidden.size ? new Set() : new Set(systems.map((x) => x.name)))}>{hidden.size ? 'Ukázat vše' : 'Skrýt vše'}</button></div>
        {systems.map((x) => (
          <label key={x.name} className="hw3d-sys">
            <input type="checkbox" checked={!hidden.has(x.name)} onChange={() => { const n = new Set(hidden); if (!n.delete(x.name)) n.add(x.name); setHidden(n); }} />
            <span className="hw3d-dot" style={{ background: x.color }} />{x.name} <span className="hw3d-n">{x.n}</span>
          </label>
        ))}
        <label className="hw3d-sys"><input type="checkbox" checked={sysColors} onChange={(e) => setSysColors(e.target.checked)} /> Barvy podle systému</label>
        <label className="hw3d-sys"><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Popisky</label>
        {picked && (
          <div className="hw3d-pick">
            <div className="hw3d-h">Vybraný díl</div>
            <div className="font-semibold">{picked.label || picked.id}</div>
            {pickedPart && <button className="hw3d-link" onClick={() => onOpenPart?.(pickedPart.id)}>Stránka dílu: {pickedPart.name} →</button>}
            {findSubcircuit(picked, hierarchyStack) && <button className="hw3d-link" onClick={() => onDrillDown(picked)}>Dovnitř (dvojklik) →</button>}
          </div>
        )}
      </aside>
      <div className="hw3d-stage">
        <div ref={host} className="absolute inset-0" />
        <div className="hw3d-search">
          <input placeholder="Hledat díl" value={query} onChange={(e) => setQuery(e.target.value)} />
          {found.length > 0 && <div className="hw3d-found">{found.map((b, i) => <button key={i} onClick={() => flyToBody(b)}>{b.comp.label || b.comp.id}</button>)}</div>}
        </div>
        {hierarchyStack.length > 1 && (
          <div className="hw3d-crumb">
            <button className="hw3d-back" onClick={() => onNavigateUp()} title="O úroveň výš (Esc / Backspace)"><ArrowLeft size={12} /> ZPĚT</button>
            {hierarchyStack.map((l, i) => (i > 0 && i < hierarchyStack.length - 3 ? null : (
              <button key={i} disabled={i === hierarchyStack.length - 1} onClick={() => onNavigateUp(i)}>
                <b>L{String(l.level ?? i + 1).replace('.', ',')}</b> {l.title.length > 26 ? l.title.slice(0, 24) + '…' : l.title}
              </button>
            )))}
          </div>
        )}
        {hover && (
          <div className="hw3d-tip">
            <b>{hover.comp.label || hover.comp.id}</b>
            <span>{hover.canDrill ? 'Dvojklik = dovnitř' : 'Nejnižší úroveň'} · klik = detail</span>
          </div>
        )}
        {hint && <div className="hw3d-tip" style={{ bottom: 70 }}>{hint}</div>}
        <div className="hw3d-bar">
          <span>Složený</span>
          <input type="range" min="0" max="1" step="0.01" value={explode} onChange={(e) => setExplode(+e.target.value)} />
          <span>Rozložený</span>
          <label><input type="checkbox" checked={keepFramed} onChange={(e) => setKeepFramed(e.target.checked)} /> Držet v záběru</label>
          <button className="hw3d-btn" onClick={() => st.current?.frameAll(true, st.current.homeDir)}>Výchozí pohled</button>
        </div>
      </div>
    </div>
  );
}
