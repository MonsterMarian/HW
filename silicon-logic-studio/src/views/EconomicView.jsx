// ECONOMIC VIEW: díly projektu tak, jak přijdou z obchodu, ve skutečné velikosti (mm) na stole,
// s cenou a odkazy na nákup. Dovnitř se tu nevstupuje – klik jen vybere díl.
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ExternalLink, Tag, ShoppingCart } from 'lucide-react';
import { disposeTree, declutterLabels } from './physics/common.js';
import { buildModel, ruler } from './economic/models.js';
import { packRows } from './economic/layout.js';
import { createComposer } from './physics/viewQuality.js';
import { bomTotal, fmtKc, fmtRange } from '../engine/economic/catalog.js';
import { CHECKED, RATES } from '../engine/economic/offers.js';

const fmtMm = (v) => (Math.round(v * 100) / 100).toLocaleString('cs-CZ');

export function EconomicView({ project }) {
  const containerRef = useRef(null);
  const three = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [showLabels, setShowLabels] = useState(true);

  // ---- renderer (jednou) ----
  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070708);
    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 2, 30000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 20;
    controls.maxDistance = 8000;

    scene.add(new THREE.HemisphereLight(0xf2efe8, 0x16140f, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.bias = -0.0003;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xd6dce6, 0.4);
    rim.position.set(-1, 0.6, -1);
    scene.add(rim);

    const content = new THREE.Group();
    scene.add(content);
    const hoverBox = new THREE.Box3Helper(new THREE.Box3(), 0x8a8a86);
    const selBox = new THREE.Box3Helper(new THREE.Box3(), 0xffa909);
    hoverBox.visible = selBox.visible = false;
    scene.add(hoverBox, selBox);

    const q = createComposer(renderer, scene, camera, container.clientWidth, container.clientHeight);
    const st = { renderer, labelRenderer, scene, camera, controls, content, key, q, hoverBox, selBox, pickables: [], labels: [], byId: new Map(), fly: null };
    three.current = st;
    if (import.meta.env.DEV) window.__eco = st; // dev: skrytý screenshot nástroj

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      let o = raycaster.intersectObjects(st.pickables, true)[0]?.object;
      while (o && !o.userData.item) o = o.parent;
      return o || null;
    };
    let hoverObj = null;
    const onMove = (e) => {
      const o = pick(e);
      if (o === hoverObj) return;
      hoverObj = o;
      hoverBox.visible = !!o;
      if (o) hoverBox.box.setFromObject(o).expandByScalar(2);
      renderer.domElement.style.cursor = o ? 'pointer' : 'grab';
      setHovered(o?.userData.item || null);
    };
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
      setSelected(pick(e)?.userData.item.id ?? null);
    };
    const dom = renderer.domElement;
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);

    let raf, frame = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (st.fly) { // plynulý přelet kamery k vybranému dílu
        const k = Math.min(1, (performance.now() - st.fly.t0) / 600), e = 1 - (1 - k) ** 3;
        camera.position.lerpVectors(st.fly.fromPos, st.fly.toPos, e);
        controls.target.lerpVectors(st.fly.fromTarget, st.fly.toTarget, e);
        if (k >= 1) { st.fly = null; st.relabel = true; }
      }
      controls.update();
      q.render();
      labelRenderer.render(scene, camera);
      if (st.labels.length && (st.relabel || frame++ % 8 === 0)) { st.relabel = false; declutterLabels(st.labels, camera, container); }
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      q.setSize(w, h);
      labelRenderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      controls.dispose();
      q.composer.dispose();
      disposeTree(scene);
      scene.environment?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
      three.current = null;
    };
  }, []);

  // ---- obsah stolu podle kusovníku ----
  useEffect(() => {
    const st = three.current;
    for (const c of [...st.content.children]) { st.content.remove(c); disposeTree(c); }
    st.pickables = [];
    st.labels = [];
    st.byId.clear(); // výběr se nuluje přes key={project.id} v App

    // jedna skupina na položku: qty kusů vedle sebe
    const groups = project.bom.map((item) => {
      const g = new THREE.Group();
      let x = 0;
      for (let i = 0; i < item.qty; i++) {
        const m = buildModel(item);
        const b = new THREE.Box3().setFromObject(m);
        const w = b.max.x - b.min.x;
        m.position.x = x - b.min.x;
        x += w + Math.max(3, Math.min(25, w * 0.08));
        g.add(m);
      }
      g.userData.item = item;
      return g;
    });
    // vysoké díly dozadu, ať kamera zepředu vidí i drobné čipy
    const height = (g) => new THREE.Box3().setFromObject(g).max.y;
    const all = [...groups].sort((a, b) => height(b) - height(a));
    all.push(ruler());
    const boxes = all.map((g) => new THREE.Box3().setFromObject(g));
    const sizes = boxes.map((b) => ({ w: b.max.x - b.min.x, d: b.max.z - b.min.z }));
    const gap = Math.max(25, Math.min(80, Math.max(...sizes.map((s) => s.w)) * 0.12));
    const { positions, width, depth } = packRows(sizes, { gap });
    all.forEach((g, i) => {
      g.position.set(positions[i].x - boxes[i].min.x - width / 2, 0, positions[i].z - boxes[i].min.z - depth / 2);
      st.content.add(g);
    });

    const desk = new THREE.Mesh(new THREE.PlaneGeometry(width + 600, depth + 600), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.92 }));
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.05;
    desk.receiveShadow = true;
    st.content.add(desk);
    const grid = new THREE.GridHelper(Math.ceil((Math.max(width, depth) + 600) / 100) * 100, Math.ceil((Math.max(width, depth) + 600) / 100), 0x26262a, 0x18181b);
    grid.position.y = 0.01;
    st.content.add(grid);

    for (const g of groups) {
      const item = g.userData.item;
      st.pickables.push(g);
      st.byId.set(item.id, g);
      const b = new THREE.Box3().setFromObject(g);
      const el = document.createElement('div');
      el.style.cssText = 'font:700 10px/1.4 "Courier New",monospace;letter-spacing:.05em;color:#ADAAA7;background:rgba(1,1,2,.82);border:1px solid rgba(113,117,121,.35);padding:1px 6px;white-space:nowrap;transform:translateY(-50%)';
      el.innerHTML = `${item.qty > 1 ? item.qty + '× ' : ''}${item.name.slice(0, 30)} <span style="color:${item.price ? '#FFA909' : '#DE3B3D'}">${item.price ? 'od ' + fmtKc(item.price[0]) : 'nedostupné'}</span>`;
      const lbl = new CSS2DObject(el);
      lbl.position.set((b.min.x + b.max.x) / 2, b.max.y + 8, (b.min.z + b.max.z) / 2);
      lbl.userData.priority = b.max.x - b.min.x; // větší díl má přednost
      st.content.add(lbl);
      st.labels.push({ obj: lbl, el });
    }

    // světlo a stíny podle velikosti stolu, kamera na celý stůl
    const R = Math.max(width, depth) / 2 + 300;
    st.key.position.set(R * 0.6, R * 1.6, R * 0.9);
    st.q.setRadius(R * 0.5);
    Object.assign(st.key.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 10, far: R * 5 });
    st.key.shadow.camera.updateProjectionMatrix();
    // kamera shora zepředu (~38°): oddaluj, dokud se všechny rohy dílů nevejdou do záběru
    const bounds = new THREE.Box3();
    all.forEach((g) => bounds.expandByObject(g));
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : 0, i & 4 ? bounds.max.z : bounds.min.z));
    const target = new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3(0, 0.62, 0.78).normalize();
    let dist = Math.max(width, depth);
    for (let i = 0; i < 40; i++) {
      st.camera.position.copy(target).addScaledVector(dir, dist);
      st.camera.lookAt(target);
      st.camera.updateMatrixWorld();
      if (corners.every((c) => { const p = c.clone().project(st.camera); return Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.9; })) break;
      dist *= 1.08;
    }
    st.home = { pos: st.camera.position.clone(), target };
    st.camera.position.copy(st.home.pos);
    st.controls.target.copy(st.home.target);
    st.fly = null;
    st.relabel = true;
    st.controls.update();
  }, [project]);

  // ---- výběr: rámeček + přelet kamery ----
  useEffect(() => {
    const st = three.current;
    const g = selected && st.byId.get(selected);
    st.selBox.visible = !!g;
    if (!g) return;
    st.selBox.box.setFromObject(g).expandByScalar(3);
    const c = st.selBox.box.getCenter(new THREE.Vector3());
    const size = st.selBox.box.getSize(new THREE.Vector3()).length();
    const dir = st.camera.position.clone().sub(st.controls.target).normalize();
    st.fly = { t0: performance.now(), fromPos: st.camera.position.clone(), fromTarget: st.controls.target.clone(), toTarget: c, toPos: c.clone().addScaledVector(dir, Math.max(60, size * 1.7)) };
  }, [selected]);

  useEffect(() => {
    if (three.current) three.current.labelRenderer.domElement.style.display = showLabels ? '' : 'none';
  }, [showLabels]);

  const home = () => {
    const st = three.current;
    setSelected(null);
    st.fly = { t0: performance.now(), fromPos: st.camera.position.clone(), fromTarget: st.controls.target.clone(), toPos: st.home.pos.clone(), toTarget: st.home.target.clone() };
  };

  const total = bomTotal(project.bom);
  const pieces = project.bom.reduce((a, it) => a + it.qty, 0);
  const sel = project.bom.find((it) => it.id === selected);

  return (
    <div className="relative w-full h-full flex bg-(--bg-dark) overflow-hidden select-none font-mono">
      <div className="relative flex-1 min-w-0">
        <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        <div className="absolute top-3 left-3 bg-(--bg-dark)/90 border border-(--line) p-4 text-xs space-y-2 pointer-events-none max-w-xs z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-(--accent-amber) shrink-0" />
            <span className="panel-title">{project.title}</span>
          </div>
          <div className="serif-accent text-[14px]">Díly tak, jak přijdou z obchodu</div>
          <div className="text-gray-400 space-y-0.5 text-[11px]">
            <div>Skutečné rozměry v mm, měřítko 1 : 1</div>
            <div>Pravítko na stole = 30 cm · mřížka 10 cm</div>
            <div>Klik = cena, rozměry a odkazy na nákup</div>
          </div>
        </div>

        <div className="absolute top-3 right-3 flex items-stretch bg-(--bg-dark)/90 border border-(--line) text-[11px] uppercase tracking-[0.1em] z-20">
          <button onClick={home} className="px-3 py-1.5 font-bold text-gray-400 hover:text-(--text-light)">CELÝ STŮL</button>
          <button onClick={() => setShowLabels((v) => !v)} title="Popisky s cenou" className={`px-2.5 py-1.5 border-l border-(--line) ${showLabels ? 'text-(--accent-amber)' : 'text-gray-500'}`}>
            <Tag size={14} />
          </button>
        </div>

        {hovered && hovered.id !== selected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-(--bg-dark) border border-gray-700 px-5 py-2.5 pointer-events-none max-w-xl">
            <div className="panel-title">{hovered.qty > 1 ? `${hovered.qty}× ` : ''}{hovered.name}</div>
            <div className="text-gray-400 text-[11px] mt-0.5">{fmtRange(hovered.price)} / ks · {hovered.offers.length} nabídek · klik = detail a odkazy</div>
          </div>
        )}
      </div>

      {/* Kusovník: ceny, rozměry, odkazy */}
      <aside className="w-[25rem] shrink-0 h-full border-l border-(--line) bg-(--bg-dark) flex flex-col select-text">
        <div className="px-4 py-3 border-b border-(--line)">
          <div className="flex items-center gap-2 meta"><ShoppingCart size={13} /> KUSOVNÍK · {project.bom.length} položek · {pieces} ks</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-(--text-light) text-[18px] font-bold font-sans">{fmtKc(total.min)}</span>
            <span className="text-gray-500 text-[11px]">nejlevněji · medián {fmtKc(total.median)}</span>
          </div>
          <div className="text-gray-500 text-[11px]">
            součet skutečných nabídek {CHECKED.split('-').reverse().join('. ')} bez poštovného · kurz ČNB 1 € = {RATES.EUR.toLocaleString('cs-CZ')} Kč, 1 $ = {RATES.USD.toLocaleString('cs-CZ')} Kč
          </div>
          {total.missing.length > 0 && <div className="text-(--conflict) text-[11px]">Bez nabídky: {total.missing.join(', ')}</div>}
          {project.source && (
            <a href={project.source.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-(--accent-amber) hover:underline">
              <ExternalLink size={11} /> {project.source.label}
            </a>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {project.bom.map((it) => {
            const isSel = it.id === selected;
            return (
              <div key={it.id} className={`border-b border-(--line) ${isSel ? 'bg-(--bg-card-light)' : ''}`}>
                <button onClick={() => setSelected(isSel ? null : it.id)} data-bom={it.id} className="w-full text-left px-4 py-2 flex items-baseline gap-3 hover:bg-(--bg-card-light)">
                  <span className={`text-[11px] w-7 shrink-0 ${isSel ? 'text-(--accent-amber)' : 'text-gray-500'}`}>{it.qty}×</span>
                  <span className="flex-1 min-w-0 font-sans font-semibold text-[13px] text-gray-200 truncate">{it.name}</span>
                  <span className={`text-[11px] shrink-0 ${it.price ? 'text-(--accent-amber)' : 'text-(--conflict)'}`}>{it.price ? `od ${fmtKc(it.price[0] * it.qty)}` : 'nedostupné'}</span>
                </button>
                {isSel && (
                  <div className="px-4 pb-3 pl-14 space-y-1.5 text-[11px]">
                    <div className="text-gray-300 font-sans text-[12px]">{it.part}</div>
                    <div className="text-gray-400">Rozměr: {it.dims.map(fmtMm).join(' × ')} mm <span className="text-gray-600">· {it.dimsSrc}</span></div>
                    <div className="text-gray-400">Cena / ks: {fmtRange(it.price)}{it.median !== null && <span className="text-gray-500"> · medián {fmtKc(it.median)}</span>}</div>
                    {it.offerNote && <div className="text-gray-400 font-sans text-[12px] leading-snug">{it.offerNote}</div>}
                    {it.note && <div className="text-gray-400 font-sans text-[12px] leading-snug">{it.note}</div>}
                    <div className="pt-1 space-y-1">
                      {it.offers.map((o) => (
                        <a key={o.url + o.title} href={o.url} target="_blank" rel="noreferrer" title={o.url} className="flex items-start gap-2 px-2 py-1.5 border border-(--line) hover:border-(--accent-amber) group">
                          <ExternalLink size={11} className="mt-0.5 shrink-0 text-gray-500 group-hover:text-(--accent-amber)" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-gray-200 font-bold">{o.shop}{o.alt && <span className="text-(--conflict) font-normal"> · jen alternativa</span>}</span>
                            <span className="block text-gray-400 font-sans text-[11px] leading-snug">{o.title}</span>
                            <span className="block text-gray-600">
                              {o.condition} · {o.verified === 'fetched' ? 'cena ověřena na stránce' : 'cena z výpisu vyhledávače'}{o.remark ? ` · ${o.remark}` : ''}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-(--accent-amber) font-bold">{fmtKc(o.priceCzk)}</span>
                            {o.currency !== 'CZK' && <span className="block text-gray-600">{o.price.toLocaleString('cs-CZ')} {o.currency}</span>}
                          </span>
                        </a>
                      ))}
                      {it.offers.length === 0 && <div className="text-(--conflict)">Žádná nabídka – díl se dnes neprodává.</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {sel === undefined && <div className="px-4 py-2 border-t border-(--line) meta">Vyber díl ve 3D nebo v seznamu</div>}
      </aside>
    </div>
  );
}
