import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function PhysicsView({ engine }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080a);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 35, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const goldLight = new THREE.DirectionalLight(0xe6c280, 0.8);
    goldLight.position.set(-20, 30, -10);
    scene.add(goldLight);

    // Silicon Substrate Wafer (Base layer)
    const substrateGeo = new THREE.BoxGeometry(40, 1.2, 30);
    const substrateMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.8,
      metalness: 0.2,
    });
    const substrate = new THREE.Mesh(substrateGeo, substrateMat);
    substrate.position.y = -0.6;
    scene.add(substrate);

    // Silicon Die Grid / Wells
    const gridHelper = new THREE.GridHelper(38, 20, 0x00f0ff, 0x1f242d);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Dynamic Component Dies & Interconnects
    const componentMeshes = new Map();
    const group = new THREE.Group();
    scene.add(group);

    // Build chip layers on silicon wafer
    const updatePhysicsLayout = () => {
      // Clear previous components in group
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }
      componentMeshes.clear();

      const comps = Array.from(engine.components.values());
      comps.forEach((comp, idx) => {
        // Map 2D coordinates to 3D die space
        const dieX = (comp.x - 300) * 0.05;
        const dieZ = (comp.y - 200) * 0.05;

        // Diffusion well (N-Well/P-Well)
        const wellGeo = new THREE.BoxGeometry(4, 0.4, 3);
        const wellMat = new THREE.MeshStandardMaterial({
          color: 0x223344,
          roughness: 0.6,
        });
        const wellMesh = new THREE.Mesh(wellGeo, wellMat);
        wellMesh.position.set(dieX, 0.2, dieZ);
        group.add(wellMesh);

        // Polysilicon Gate & Metal Layer 1 (M1)
        const gateGeo = new THREE.BoxGeometry(3.2, 0.6, 2.2);
        const temp = engine.thermalMap.get(comp.id) || 25.0;
        const heatRatio = Math.min(1.0, (temp - 25.0) / 60.0);

        // Thermal color: Deep blue -> violet -> neon red -> white hot
        const heatColor = new THREE.Color().lerpColors(
          new THREE.Color(0x00f0ff),
          new THREE.Color(0xff003c),
          heatRatio
        );

        const gateMat = new THREE.MeshStandardMaterial({
          color: heatColor,
          emissive: heatColor,
          emissiveIntensity: 0.2 + heatRatio * 1.5,
          roughness: 0.3,
          metalness: 0.7,
        });
        const gateMesh = new THREE.Mesh(gateGeo, gateMat);
        gateMesh.position.set(dieX, 0.7, dieZ);
        group.add(gateMesh);
        componentMeshes.set(comp.id, gateMesh);

        // Vertical Via Contact Pins
        const viaGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8);
        const viaMat = new THREE.MeshStandardMaterial({ color: 0xe6c280, metalness: 0.9, roughness: 0.1 });
        const via1 = new THREE.Mesh(viaGeo, viaMat);
        via1.position.set(dieX - 1.2, 1.3, dieZ);
        const via2 = new THREE.Mesh(viaGeo, viaMat);
        via2.position.set(dieX + 1.2, 1.3, dieZ);
        group.add(via1);
        group.add(via2);
      });

      // Render 3D Metal Interconnect Wires (Metal 2 Layer)
      engine.wires.forEach((wire) => {
        const fromComp = engine.components.get(wire.from.id);
        const toComp = engine.components.get(wire.to.id);
        if (!fromComp || !toComp) return;

        const p1 = new THREE.Vector3((fromComp.x - 300) * 0.05 + 1.2, 1.7, (fromComp.y - 200) * 0.05);
        const p2 = new THREE.Vector3((toComp.x - 300) * 0.05 - 1.2, 1.7, (toComp.y - 200) * 0.05);

        const path = new THREE.LineCurve3(p1, p2);
        const tubeGeo = new THREE.TubeGeometry(path, 12, 0.08, 6, false);
        const isHigh = fromComp.outputs[wire.from.pin] === 1;
        const tubeMat = new THREE.MeshBasicMaterial({
          color: isHigh ? 0x00f0ff : 0x223344,
        });
        const wireMesh = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(wireMesh);
      });
    };

    updatePhysicsLayout();
    const unsub = engine.subscribe(() => {
      updatePhysicsLayout();
    });

    // Orbit Animation Loop
    let angle = 0;
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.x = Math.sin(angle) * 45;
      camera.position.z = Math.cos(angle) * 45;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      unsub();
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [engine]);

  return (
    <div className="relative w-full h-full bg-[#07080A] overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab" />

      {/* Physics Inspector Overlay */}
      <div className="absolute top-4 left-4 bg-[#0E1116]/90 border border-[#1F242D] p-3 rounded-lg text-xs font-mono space-y-2 pointer-events-none shadow-2xl backdrop-blur-md">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>PHYSICS ENGINE // SILICON DIE</span>
        </div>
        <div className="text-gray-400 space-y-1">
          <div>LAYER 0: Substrate (Silicon P/N Wafers)</div>
          <div>LAYER 1: Polysilicon Gates (CMOS Channels)</div>
          <div>LAYER 2: Metal 1 & 2 (Interconnect Traces)</div>
          <div className="text-emerald-400">THERMAL SHADER: Heat Dissipation Active</div>
        </div>
      </div>
    </div>
  );
}
