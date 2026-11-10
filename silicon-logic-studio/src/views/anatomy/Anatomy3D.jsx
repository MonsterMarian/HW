// ANATOMY 3D: stejná sestava jako 2D výkres (figures.js), ale z přesných 3D modelů dílů z ECONOMIC
// natočených do skutečné polohy ve skříni. Otáčení myší, rozložení posuvníkem, čísla dílů.
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeTree, declutterLabels } from '../physics/common.js';
import { buildAnatomyScene } from './scene3d.js';

export function Anatomy3D({ project, explode, focus, onFocus }) {
  const ref = useRef(null);
  const three = useRef(null);
  const live = useRef({});
  useEffect(() => { live.current.onFocus = onFocus; }, [onFocus]);

  useEffect(() => {
    const el = ref.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080a);
    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 2, 20000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();
    const labels = new CSS2DRenderer();
    labels.setSize(el.clientWidth, el.clientHeight);
    Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    el.appendChild(labels.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xf2efe8, 0x16140f, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key, key.target);

    const { root, parts, clash } = buildAnatomyScene(project);
    scene.add(root);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const R = size.length();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 3, R * 3), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = box.min.y - 0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    Object.assign(key.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: R * 4 });
    key.position.copy(centre).add(new THREE.Vector3(R * 0.5, R * 1.2, R * 0.8));
    key.target.position.copy(centre);
    camera.position.copy(centre).add(new THREE.Vector3(R * 0.75, R * 0.55, R * 0.75));
    controls.target.copy(centre);

    // čísla dílů: jedno na položku kusovníku, u nejvyššího kusu
    const index = new Map(project.bom.map((it, i) => [it.id, i + 1]));
    const tagged = new Set();
    const labelList = [];
    for (const p of [...parts].sort((a, b) => new THREE.Box3().setFromObject(b.group).max.y - new THREE.Box3().setFromObject(a.group).max.y)) {
      const n = index.get(p.id);
      if (!n || tagged.has(p.id) || p.group.children.length === 0) continue;
      tagged.add(p.id);
      const bb = new THREE.Box3().setFromObject(p.group);
      const div = document.createElement('div');
      div.className = 'an3d-ball';
      div.dataset.part = p.id;
      div.textContent = String(n);
      const lbl = new CSS2DObject(div);
      lbl.position.copy(bb.getCenter(new THREE.Vector3())).setY(bb.max.y + 6).sub(p.group.position);
      p.group.add(lbl);
      labelList.push({ obj: lbl, el: div });
    }
    parts.forEach((p) => { p.base = p.group.position.clone(); });

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onMove = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      let o = ray.intersectObjects(parts.map((p) => p.group), true).find((h) => h.object.isMesh)?.object;
      while (o && !o.userData.partId) o = o.parent;
      live.current.onFocus?.(o && index.has(o.userData.partId) ? o.userData.partId : null);
    };
    renderer.domElement.addEventListener('pointermove', onMove);

    const st = { renderer, labels, scene, camera, controls, parts, clash, labelList, highlighted: null };
    three.current = st;
    if (import.meta.env.DEV) window.__an3d = st;
    let raf, frame = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
      if (frame++ % 8 === 0) declutterLabels(labelList, camera, el);
    };
    loop();
    const ro = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      labels.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      controls.dispose();
      disposeTree(scene);
      scene.environment?.dispose();
      renderer.dispose();
      el.innerHTML = '';
      three.current = null;
    };
  }, [project]);

  // rozložení: posun skupin podél jejich vektorů, kolize jen ve složeném stavu
  useEffect(() => {
    const st = three.current;
    if (!st) return;
    for (const p of st.parts) p.group.position.copy(p.base).addScaledVector(p.explode, explode);
    if (st.clash) st.clash.visible = explode < 0.05;
  }, [explode, project]);

  // zvýraznění dílu jantarem (emissive), čísla dílů v CSS
  useEffect(() => {
    const st = three.current;
    if (!st) return;
    for (const p of st.parts) {
      const on = p.id === focus;
      p.group.traverse((o) => {
        if (!o.isMesh || !o.material.emissive) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.userData.baseEmissive === undefined) m.userData.baseEmissive = { c: m.emissive.getHex(), i: m.emissiveIntensity };
          m.emissive.setHex(on ? 0xffa909 : m.userData.baseEmissive.c);
          m.emissiveIntensity = on ? 0.35 : m.userData.baseEmissive.i;
        }
      });
    }
    for (const l of st.labelList) l.el.classList.toggle('an3d-on', l.el.dataset.part === focus);
  }, [focus, project]);

  return <div ref={ref} className="absolute inset-0 cursor-grab active:cursor-grabbing" data-anatomy3d />;
}
