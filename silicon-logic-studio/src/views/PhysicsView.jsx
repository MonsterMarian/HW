import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Camera, Eye, Cpu, Layers, Maximize2, ShieldCheck, Thermometer, Zap, RotateCw, ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import { audioEngine } from '../engine/audioEngine';

export function PhysicsView({
  engine,
  hierarchyStack = [],
  onNavigateUp,
  onDrillDown,
}) {
  const containerRef = useRef(null);
  const [modelMode, setModelMode] = useState('board'); // 'chip' | 'die' | 'board' (Used at root level)
  const [cameraView, setCameraView] = useState('iso');
  const [hoveredComp, setHoveredComp] = useState(null);

  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const interactiveMeshesRef = useRef([]);
  const hoveredMeshRef = useRef(null);

  const currentLevelIdx = hierarchyStack.length > 0 ? hierarchyStack.length : 1;
  const currentLevelEntry = hierarchyStack[hierarchyStack.length - 1] || {
    id: 'root',
    title: "NVIDIA NV1 (1995)",
    subtitle: "Diamond Edge 3D PCI Multimedia Card",
  };

  // Keyboard shortcut listener: Backspace or Esc to navigate up
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (hierarchyStack && hierarchyStack.length > 1) {
        if (e.key === 'Backspace' || e.key === 'Escape') {
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
          e.preventDefault();
          if (onNavigateUp) onNavigateUp();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hierarchyStack, onNavigateUp]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06080e);
    scene.fog = new THREE.FogExp2(0x06080e, 0.004);

    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Interactive OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 3;
    controls.maxDistance = 180;
    controlsRef.current = controls;

    // 3. Cinematic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xdbe6f5, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(20, 40, 20);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 120;
    const shadowD = 30;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.9);
    cyanRim.position.set(-25, 20, -20);
    scene.add(cyanRim);

    const goldFill = new THREE.DirectionalLight(0xffc866, 0.7);
    goldFill.position.set(20, -5, -15);
    scene.add(goldFill);

    // Anti-static workbench mat floor
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b12,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.8;
    floor.receiveShadow = true;
    scene.add(floor);

    const floorGrid = new THREE.GridHelper(160, 80, 0x00f0ff, 0x111b2b);
    floorGrid.position.y = -3.78;
    scene.add(floorGrid);

    // Dynamic animation elements array (e.g., drifting particles or electron clouds)
    const animElements = [];

    // 4. TEXTURE GENERATORS
    const createStg2000xTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 1024;
      cvs.height = 1024;
      const ctx = cvs.getContext('2d');

      ctx.fillStyle = '#14161B';
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let i = 0; i < 8000; i++) {
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }

      ctx.fillStyle = '#0f1115';
      ctx.beginPath();
      ctx.arc(512, 140, 48, 0, Math.PI * 2);
      ctx.arc(512, 884, 48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a0c10';
      ctx.beginPath();
      ctx.arc(110, 110, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222834';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#DFE7F2';
      ctx.font = 'bold 54px "Courier New", monospace';
      ctx.textAlign = 'center';

      ctx.save();
      ctx.translate(512, 270);
      ctx.strokeStyle = '#D6E0EE';
      ctx.lineWidth = 14;
      ctx.strokeRect(-80, -45, 160, 90);
      ctx.fillText('ST', 0, 18);
      ctx.restore();

      ctx.fillStyle = '#BAC9DC';
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillText('SGS-THOMSON', 512, 375);
      ctx.font = '22px "Courier New", monospace';
      ctx.fillStyle = '#8396AE';
      ctx.fillText('MICROELECTRONICS', 512, 410);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 74px "Courier New", monospace';
      ctx.fillText('STG2000X', 512, 510);

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 52px "Courier New", monospace';
      ctx.fillText('NVIDIA NV1', 512, 580);

      ctx.fillStyle = '#BAC9DC';
      ctx.font = 'bold 34px "Courier New", monospace';
      ctx.fillText('A22BF9548 MALTA', 512, 650);

      ctx.fillStyle = '#6E819B';
      ctx.font = '24px "Courier New", monospace';
      ctx.fillText('0.5µm 3D MULTIMEDIA ENGINE', 512, 715);
      ctx.fillText('208-PIN PLASTIC QUAD FLAT PACK', 512, 750);

      ctx.strokeStyle = '#252D3D';
      ctx.lineWidth = 6;
      ctx.strokeRect(36, 36, 952, 952);

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const createDieTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 1024;
      cvs.height = 1024;
      const ctx = cvs.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.3, '#1e1b4b');
      grad.addColorStop(0.7, '#172554');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1024; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
      }

      ctx.fillStyle = '#FFD700';
      const padSize = 10;
      for (let i = 40; i < 984; i += 18) {
        ctx.fillRect(i, 20, padSize, padSize);
        ctx.fillRect(i, 994, padSize, padSize);
        ctx.fillRect(20, i, padSize, padSize);
        ctx.fillRect(994, i, padSize, padSize);
      }

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // 5. MODEL GENERATOR DISPATCHER
    const activeModelGroup = new THREE.Group();
    scene.add(activeModelGroup);
    interactiveMeshesRef.current = [];

    const registerInteractive = (mesh, compData, name, desc, canDrill = true) => {
      mesh.userData = {
        component: compData,
        name: name,
        desc: desc,
        canDrill: canDrill,
        originalEmissive: mesh.material?.emissive ? mesh.material.emissive.getHex() : 0x000000,
        originalEmissiveIntensity: mesh.material?.emissiveIntensity || 0,
      };
      interactiveMeshesRef.current.push(mesh);
    };

    // Rebuild Scene based on current hierarchy level:
    const rebuild3DScene = () => {
      while (activeModelGroup.children.length > 0) {
        activeModelGroup.remove(activeModelGroup.children[0]);
      }
      interactiveMeshesRef.current = [];

      // =====================================================================
      // LEVEL 1: COMPLETE DIAMOND EDGE 3D PCI CARD OR CHIP CLOSE-UP
      // =====================================================================
      if (currentLevelIdx === 1) {
        if (modelMode === 'board') {
          const boardGroup = new THREE.Group();

          // PCB Board (Dark Green Glossy FR-4)
          const pcbW = 46.0;
          const pcbD = 26.0;
          const pcbH = 0.55;

          const pcbGeo = new THREE.BoxGeometry(pcbW, pcbH, pcbD);
          const pcbMat = new THREE.MeshStandardMaterial({
            color: 0x092215,
            roughness: 0.45,
            metalness: 0.15,
          });
          const pcb = new THREE.Mesh(pcbGeo, pcbMat);
          pcb.position.set(0, -pcbH / 2, 0);
          pcb.receiveShadow = true;
          pcb.castShadow = true;
          boardGroup.add(pcb);

          // Gold PCI Edge Connector Fingers
          const numGold = 32;
          const spc = 0.45;
          const startX = -((numGold * spc) / 2);
          const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 });

          for (let g = 0; g < numGold; g++) {
            if (g >= 11 && g <= 13) continue;
            const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, pcbH + 0.05, 2.2), goldMat);
            f.position.set(startX + g * spc, -pcbH / 2, pcbD / 2 - 0.3);
            boardGroup.add(f);
          }

          // Bracket on Left Edge
          const steelMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.9, roughness: 0.25 });
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 22.0, 3.2), steelMat);
          bracket.position.set(-pcbW / 2 - 1.0, 7.5, 0);
          bracket.castShadow = true;
          boardGroup.add(bracket);
          registerInteractive(
            bracket,
            { id: 'vga_bracket', type: 'VGA_BRACKET', label: 'VGA & AUDIO BRACKET' },
            'VGA DB-15 & SEGA SATURN I/O BRACKET',
            'Kovový kryt s VGA výstupem, duálním 3.5mm jackem a Sega ovladači',
            true
          );

          // Blue VGA DB-15 Connector
          const vgaBlue = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 2.2, 3.6),
            new THREE.MeshStandardMaterial({ color: 0x0055dd, roughness: 0.3 })
          );
          vgaBlue.position.set(-pcbW / 2 - 1.6, 3.5, -3.5);
          boardGroup.add(vgaBlue);

          // 2. MAIN STG2000X / NV1 CHIP IN THE EXACT CENTER OF THE PCB
          const centerNv1 = new THREE.Group();
          const cBody = new THREE.Mesh(
            new THREE.BoxGeometry(10.0, 1.4, 10.0),
            [
              new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
              new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
              new THREE.MeshStandardMaterial({ map: createStg2000xTexture(), roughness: 0.35, metalness: 0.25 }),
              new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.85 }),
              new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
              new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
            ]
          );
          cBody.position.y = 0.7;
          cBody.castShadow = true;
          centerNv1.add(cBody);

          registerInteractive(
            cBody,
            { id: 'nv1_core', type: 'NV1_CORE', label: 'STG2000X / NVIDIA NV1 GPU' },
            'SGS-THOMSON STG2000X // NVIDIA NV1 (1995)',
            '0.5µm 3D procesor (Dvojklikem vstoupíte do vnitřní architektury křemíkového die)',
            true
          );

          // Solder pins for NV1
          const pinM = new THREE.MeshStandardMaterial({ color: 0xdde4ec, metalness: 0.95, roughness: 0.1 });
          for (let p = 0; p < 24; p++) {
            const off = (p - 12 + 0.5) * (9.0 / 24);
            const pN = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.0), pinM);
            pN.position.set(off, 0.18, -5.4);
            centerNv1.add(pN);
            const pS = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.0), pinM);
            pS.position.set(off, 0.18, 5.4);
            centerNv1.add(pS);
            const pE = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.16), pinM);
            pE.position.set(5.4, 0.18, off);
            centerNv1.add(pE);
            const pW = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.16), pinM);
            pW.position.set(-5.4, 0.18, off);
            centerNv1.add(pW);
          }
          centerNv1.position.set(-2.0, 0, -1.0);
          boardGroup.add(centerNv1);

          // 3. EDO DRAM SOJ-40 Chips (Surrounding the NV1)
          const dramMat = new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.6 });
          const createSoj = (x, z, id, label) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 3.2), dramMat);
            m.position.set(x, 0.5, z);
            m.castShadow = true;
            boardGroup.add(m);
            registerInteractive(
              m,
              { id: id, type: 'VRAM_BANK', label: label },
              'TOSHIBA TC51V16160FT 16Mb EDO DRAM',
              '60ns VRAM paměťový čip (Dvojklik pro matrici kondenzátorů a dekodér řádků)',
              true
            );
          };
          createSoj(9.5, -6.5, 'vram_bank0', 'TOSHIBA EDO DRAM BANK 0');
          createSoj(9.5, 0.0, 'vram_bank1', 'TOSHIBA EDO DRAM BANK 1');
          createSoj(9.5, 6.5, 'vram_bank2', 'TOSHIBA EDO DRAM BANK 2');

          // 4. ATT20C409 RAMDAC
          const dac = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.0, 5.2), dramMat);
          dac.position.set(-13.0, 0.5, -4.5);
          dac.castShadow = true;
          boardGroup.add(dac);
          registerInteractive(
            dac,
            { id: 'ramdac', type: 'RAMDAC', label: 'ATT20C409 RAMDAC' },
            'ATT20C409 TrueColor VIDEO DAC',
            '135MHz RAMDAC (Dvojklik pro 256x18 CLUT paletu a 3x 8-bit DA převodníky)',
            true
          );

          // 5. STG Audio DSP
          const audioDsp = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.9, 4.8), dramMat);
          audioDsp.position.set(-5.0, 0.45, 8.5);
          audioDsp.castShadow = true;
          boardGroup.add(audioDsp);
          registerInteractive(
            audioDsp,
            { id: 'audio_dsp', type: 'AUDIO_DSP', label: 'AUDIO DSP SYNTH' },
            'STG-2000 32-VOICE AUDIO DSP',
            '32-hlasý vlnový syntezátor (Dvojklik pro NCO oscilátory a ROM vzorky)',
            true
          );

          // Crystals (Y1 & Y2)
          const canMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.1 });
          const y1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16), canMat);
          y1.rotateZ(Math.PI / 2);
          y1.position.set(-13.0, 0.7, 3.5);
          boardGroup.add(y1);

          activeModelGroup.add(boardGroup);

          camera.position.set(24, 26, 32);
          controls.target.set(0, 0, 0);
        } else {
          // PQFP-208 Chip Close-Up Mode
          const chipGroup = new THREE.Group();
          const bodySize = 16.0;
          const bodyHeight = 2.4;
          const stgTex = createStg2000xTexture();

          const bodyGeo = new THREE.BoxGeometry(bodySize, bodyHeight, bodySize);
          const bodyMats = [
            new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
            new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
            new THREE.MeshStandardMaterial({ map: stgTex, roughness: 0.35, metalness: 0.25 }),
            new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.85 }),
            new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
            new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.65 }),
          ];
          const chipBody = new THREE.Mesh(bodyGeo, bodyMats);
          chipBody.position.y = bodyHeight / 2 + 0.4;
          chipBody.castShadow = true;
          chipGroup.add(chipBody);

          registerInteractive(
            chipBody,
            { id: 'nv1_core', type: 'NV1_CORE', label: 'STG2000X / NVIDIA NV1 GPU' },
            'SGS-THOMSON STG2000X // NVIDIA NV1 (1995)',
            '0.5µm 3D procesor (Dvojklikem vstoupíte do křemíkového die)',
            true
          );

          // 208 Gull-Wing Pins
          const pinMat = new THREE.MeshStandardMaterial({ color: 0xdae2ec, metalness: 0.95, roughness: 0.12 });
          const pinsPerSide = 52;
          const pinPitch = (bodySize * 0.92) / pinsPerSide;
          const pinWidth = pinPitch * 0.55;

          for (let p = 0; p < pinsPerSide; p++) {
            const offset = (p - pinsPerSide / 2 + 0.5) * pinPitch;
            const createGullWing = (rx, rz, isRotated) => {
              const pGrp = new THREE.Group();
              const shoulder = new THREE.Mesh(new THREE.BoxGeometry(isRotated ? 0.9 : pinWidth, 0.16, isRotated ? pinWidth : 0.9), pinMat);
              shoulder.position.set(0, bodyHeight / 2 + 0.2, 0);
              pGrp.add(shoulder);
              const drop = new THREE.Mesh(new THREE.BoxGeometry(isRotated ? 0.5 : pinWidth, 0.65, isRotated ? pinWidth : 0.5), pinMat);
              drop.position.set(isRotated ? (rx > 0 ? 0.4 : -0.4) : 0, 0.5, isRotated ? 0 : (rz > 0 ? 0.4 : -0.4));
              pGrp.add(drop);
              const foot = new THREE.Mesh(new THREE.BoxGeometry(isRotated ? 0.9 : pinWidth, 0.12, isRotated ? pinWidth : 0.9), pinMat);
              foot.position.set(isRotated ? (rx > 0 ? 0.8 : -0.8) : 0, 0.08, isRotated ? 0 : (rz > 0 ? 0.8 : -0.8));
              pGrp.add(foot);
              pGrp.position.set(rx, 0, rz);
              return pGrp;
            };

            chipGroup.add(createGullWing(offset, -bodySize / 2 - 0.45, false));
            chipGroup.add(createGullWing(offset, bodySize / 2 + 0.45, false));
            chipGroup.add(createGullWing(bodySize / 2 + 0.45, offset, true));
            chipGroup.add(createGullWing(-bodySize / 2 - 0.45, offset, true));
          }

          // Test PCB Footprint
          const pcbFootprint = new THREE.Mesh(
            new THREE.BoxGeometry(25.0, 0.4, 25.0),
            new THREE.MeshStandardMaterial({ color: 0x0b2518, roughness: 0.5, metalness: 0.1 })
          );
          pcbFootprint.position.y = -0.2;
          chipGroup.add(pcbFootprint);

          activeModelGroup.add(chipGroup);
          camera.position.set(0, 20, 26);
          controls.target.set(0, 1, 0);
        }
      }

      // =====================================================================
      // LEVEL 2: STG2000X DECAPPED SILICON DIE MICRO-ARCHITECTURE
      // =====================================================================
      else if (currentLevelIdx === 2) {
        const dieGroup = new THREE.Group();

        // Cavity & Paddle
        const cavity = new THREE.Mesh(
          new THREE.BoxGeometry(22.0, 1.4, 22.0),
          new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.7 })
        );
        cavity.position.y = 0.7;
        dieGroup.add(cavity);

        const paddle = new THREE.Mesh(
          new THREE.BoxGeometry(14.0, 0.25, 14.0),
          new THREE.MeshStandardMaterial({ color: 0xe6a838, metalness: 0.85, roughness: 0.25 })
        );
        paddle.position.y = 1.45;
        dieGroup.add(paddle);

        // Monolithic Silicon Die
        const dieMesh = new THREE.Mesh(
          new THREE.BoxGeometry(11.6, 0.4, 11.6),
          new THREE.MeshStandardMaterial({
            map: createDieTexture(),
            metalness: 0.75,
            roughness: 0.18,
            emissive: new THREE.Color(0x00f0ff),
            emissiveIntensity: 0.12,
          })
        );
        dieMesh.position.y = 1.7;
        dieGroup.add(dieMesh);

        // 3D Physical Functional Micro-Architecture Blocks:
        const createSiliconTile = (x, z, w, d, h, color, comp, name, desc) => {
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({
              color: color,
              roughness: 0.3,
              metalness: 0.4,
              emissive: new THREE.Color(color),
              emissiveIntensity: 0.2,
            })
          );
          tile.position.set(x, 1.9 + h / 2, z);
          dieGroup.add(tile);
          registerInteractive(tile, comp, name, desc, true);
        };

        // 1. QTM 3D Engine (Center large)
        createSiliconTile(0, 0, 4.8, 4.8, 0.3, 0x0088cc,
          { id: 'qtm_3d', type: 'NV1_CORE', label: '3D QUADRATIC ENGINE' },
          '3D QUADRATIC TEXTURE ENGINE (QTM)',
          'Forward-differencing quadratic ALU (Dvojklik pro 3D pipeline)'
        );

        // 2. 2D GUI & BitBLT
        createSiliconTile(-3.4, -3.4, 3.8, 2.2, 0.25, 0x6622aa,
          { id: 'bitblt_2d', type: 'REGISTER_8BIT', label: '2D GUI & BitBLT' },
          '2D GUI & BitBLT ACCELERATOR',
          '64-bitový hardwarový rastrový akcelerátor'
        );

        // 3. Audio DSP
        createSiliconTile(3.4, -3.4, 3.8, 2.2, 0.25, 0x00aa66,
          { id: 'audio_core', type: 'AUDIO_DSP', label: 'AUDIO DSP' },
          '32-VOICE AUDIO DSP CORE',
          'Hardwarový vlnový syntezátor a interpolátor'
        );

        // 4. Memory Controller
        createSiliconTile(-3.4, 3.4, 3.8, 2.2, 0.25, 0xbb8800,
          { id: 'vram_ctrl', type: 'VRAM_BANK', label: 'VRAM ARBITER' },
          '64-BIT EDO MEMORY ARBITER',
          '60MHz DMA řadič a arbiter paměti'
        );

        // 5. RAMDAC Core
        createSiliconTile(3.4, 3.4, 3.8, 2.2, 0.25, 0xcc2244,
          { id: 'ramdac_core', type: 'RAMDAC', label: 'RAMDAC CORE' },
          '135MHz TrueColor RAMDAC CORE',
          'Integrovaná 256x18 CLUT paleta a trojice DAC'
        );

        // 6. PCI Host Bus
        createSiliconTile(-4.4, 0, 1.8, 3.8, 0.25, 0x2255cc,
          { id: 'pci_dma', type: 'PCI_BUS', label: 'PCI 2.1 HOST' },
          'PCI 2.1 32-BIT HOST DMA INTERFACE',
          '33MHz sběrnicový kontrolér s 64-bajtovým FIFO'
        );

        // 7. Sega Saturn SMPC
        createSiliconTile(4.4, 0, 1.8, 3.8, 0.25, 0x8833aa,
          { id: 'saturn_io', type: 'SATURN_PAD', label: 'SATURN SMPC' },
          'SEGA SATURN CONTROLLER MATRIX',
          'Rozhraní pro ovladače Sega Saturn SMPC'
        );

        // 208 Real Gold Bonding Wires
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.98, roughness: 0.1 });
        const wiresPerSide = 26;
        for (let i = 0; i < wiresPerSide; i++) {
          const dieOff = (i - wiresPerSide / 2 + 0.5) * (11.6 / (wiresPerSide + 1));
          const leadOff = (i - wiresPerSide / 2 + 0.5) * (20.0 / (wiresPerSide + 1));

          const addWireCurve = (p1, p2) => {
            const mid = new THREE.Vector3((p1.x + p2.x) / 2, p1.y + 1.4, (p1.z + p2.z) / 2);
            const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
            const tube = new THREE.TubeGeometry(curve, 10, 0.04, 6, false);
            dieGroup.add(new THREE.Mesh(tube, wireMat));
          };

          addWireCurve(new THREE.Vector3(dieOff, 1.9, -5.8), new THREE.Vector3(leadOff, 1.4, -10.2));
          addWireCurve(new THREE.Vector3(dieOff, 1.9, 5.8), new THREE.Vector3(leadOff, 1.4, 10.2));
          addWireCurve(new THREE.Vector3(5.8, 1.9, dieOff), new THREE.Vector3(10.2, 1.4, leadOff));
          addWireCurve(new THREE.Vector3(-5.8, 1.9, dieOff), new THREE.Vector3(-10.2, 1.4, leadOff));
        }

        activeModelGroup.add(dieGroup);
        camera.position.set(0, 22, 24);
        controls.target.set(0, 1.4, 0);
      }

      // =====================================================================
      // LEVEL 3: 3D QUADRATIC ENGINE (QTM) FORWARD-DIFFERENCING PIPELINE
      // =====================================================================
      else if (currentLevelIdx === 3) {
        const qtmGroup = new THREE.Group();

        // Dark silicon arithmetic substrate
        const subSlab = new THREE.Mesh(
          new THREE.BoxGeometry(24.0, 1.2, 20.0),
          new THREE.MeshStandardMaterial({ color: 0x0c111c, roughness: 0.5, metalness: 0.3 })
        );
        subSlab.position.y = 0.6;
        qtmGroup.add(subSlab);

        // Glowing pipeline bus tracks
        const busMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.5 });
        const busTrack = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.08, 1.2), busMat);
        busTrack.position.set(0, 1.25, 0);
        qtmGroup.add(busTrack);

        const createPipelineStage = (x, z, w, d, h, col, comp, name, desc) => {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.25, emissive: col, emissiveIntensity: 0.25 })
          );
          m.position.set(x, 1.2 + h / 2, z);
          qtmGroup.add(m);
          registerInteractive(m, comp, name, desc, true);
        };

        createPipelineStage(-8.0, -4.0, 3.6, 3.2, 1.2, 0xe6a838,
          { id: 'fwd_diff_u', type: 'REGISTER_8BIT', label: 'Δ²U ACCUMULATOR' },
          'Δ²U FORWARD-DIFF ACCUMULATOR',
          'Registr pro výpočet druhých diferencí parametru U'
        );

        createPipelineStage(-8.0, 4.0, 3.6, 3.2, 1.2, 0xe6a838,
          { id: 'fwd_diff_v', type: 'REGISTER_8BIT', label: 'Δ²V ACCUMULATOR' },
          'Δ²V FORWARD-DIFF ACCUMULATOR',
          'Registr pro výpočet druhých diferencí parametru V'
        );

        // 4-BIT PIPELINE ADDER (Interactive gateway to Level 4)
        createPipelineStage(-1.5, -3.5, 4.6, 4.0, 1.5, 0x0099ff,
          { id: 'adder_pipe', type: 'AND', label: '4-BIT PIPELINE ADDER' },
          '4-BIT HIGH-SPEED PIPELINE ADDER',
          'Sčítačka s předstihem přenosu (Dvojklik pro logická hradla)'
        );

        createPipelineStage(-1.5, 3.5, 4.6, 4.0, 1.4, 0x9933cc,
          { id: 'z_buf_cmp', type: 'XOR', label: 'Z-BUFFER COMPARATOR' },
          'Z-BUFFER DEPTH COMPARATOR',
          'Jednotka pro hloubkové porovnání fragmentů'
        );

        createPipelineStage(6.0, 0, 4.8, 5.0, 1.6, 0x00cc88,
          { id: 'tex_sampler', type: 'MUX', label: 'BILINEAR TEX FILTER' },
          'BILINEAR TEXTURE SAMPLER',
          'Vzorkovací jednotka s bilineární interpolací'
        );

        activeModelGroup.add(qtmGroup);
        camera.position.set(0, 20, 22);
        controls.target.set(0, 1, 0);
      }

      // =====================================================================
      // LEVEL 4: 1-BIT FULL ADDER GATE-LEVEL SCHEMATIC
      // =====================================================================
      else if (currentLevelIdx === 4) {
        const adderGroup = new THREE.Group();

        // High-density IC substrate PCB
        const pcbBase = new THREE.Mesh(
          new THREE.BoxGeometry(24.0, 1.0, 20.0),
          new THREE.MeshStandardMaterial({ color: 0x071e12, roughness: 0.45, metalness: 0.2 })
        );
        pcbBase.position.y = 0.5;
        adderGroup.add(pcbBase);

        // DIP Logic Packages
        const createDip = (x, z, label, comp, name, desc) => {
          const dip = new THREE.Group();
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(4.6, 1.1, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.65 })
          );
          body.position.y = 0.6;
          dip.add(body);

          // Silver lead pins
          const silverMat = new THREE.MeshStandardMaterial({ color: 0xdce3eb, metalness: 0.95, roughness: 0.1 });
          for (let p = 0; p < 7; p++) {
            const off = (p - 3) * 0.6;
            const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.4), silverMat);
            p1.position.set(off, 0.3, -1.3);
            dip.add(p1);
            const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.4), silverMat);
            p2.position.set(off, 0.3, 1.3);
            dip.add(p2);
          }

          dip.position.set(x, 1.0, z);
          adderGroup.add(dip);
          registerInteractive(body, comp, name, desc, true);
        };

        createDip(-6.0, -4.5, 'fa_xor1',
          { id: 'fa_xor1', type: 'XOR', label: 'XOR GATE 1 (A ⊕ B)' },
          'XOR GATE 1 (A ⊕ B) // 74LS86',
          'Vstupní XOR hradlo (Dvojklik pro vnitřní 4-NAND ekvivalent)'
        );

        createDip(3.0, -4.5, 'fa_xor2',
          { id: 'fa_xor2', type: 'XOR', label: 'XOR GATE 2 (SUM)' },
          'XOR GATE 2 (SUM = P ⊕ Cin)',
          'Výstupní součtové hradlo sumy'
        );

        createDip(-6.0, 4.5, 'fa_and1',
          { id: 'fa_and1', type: 'AND', label: 'AND GATE 1 (A · B)' },
          'AND GATE 1 (A · B) // 74LS08',
          'První generátor přenosu (Dvojklik pro vnitřní strukturu)'
        );

        createDip(3.0, 4.5, 'fa_and2',
          { id: 'fa_and2', type: 'AND', label: 'AND GATE 2 (Cin · P)' },
          'AND GATE 2 (Cin · P)',
          'Druhý generátor přenosu s přenosem Cin'
        );

        createDip(9.0, 0, 'fa_or',
          { id: 'fa_or', type: 'OR', label: 'OR GATE (CARRY OUT)' },
          'OR GATE (COUT = G + P·Cin) // 74LS32',
          'Finální hradlo přenosu do vyššího řádu'
        );

        activeModelGroup.add(adderGroup);
        camera.position.set(0, 20, 22);
        controls.target.set(0, 1, 0);
      }

      // =====================================================================
      // LEVEL 5: XOR GATE INTERNAL 4-NAND EQUIVALENT MATRIX
      // =====================================================================
      else if (currentLevelIdx === 5) {
        const xorGroup = new THREE.Group();

        // Silicon standard cell library tile
        const cellTile = new THREE.Mesh(
          new THREE.BoxGeometry(22.0, 1.0, 18.0),
          new THREE.MeshStandardMaterial({ color: 0x131722, roughness: 0.6, metalness: 0.3 })
        );
        cellTile.position.y = 0.5;
        xorGroup.add(cellTile);

        // 4 NAND Cells
        const createNandCell = (x, z, label, comp, name, desc) => {
          const cell = new THREE.Mesh(
            new THREE.BoxGeometry(4.4, 1.2, 4.4),
            new THREE.MeshStandardMaterial({
              color: 0x0088cc,
              metalness: 0.5,
              roughness: 0.3,
              emissive: 0x0066aa,
              emissiveIntensity: 0.25,
            })
          );
          cell.position.set(x, 1.1, z);
          xorGroup.add(cell);
          registerInteractive(cell, comp, name, desc, true);
        };

        createNandCell(-6.0, 0, 'nand_center',
          { id: 'nand_center', type: 'NAND', label: 'NAND 1 (COMMON)' },
          'NAND CELL 1 (COMMON STAGE)',
          'Společné NAND hradlo (Dvojklik pro křemíkové CMOS tranzistory)'
        );

        createNandCell(0, -4.5, 'nand_top',
          { id: 'nand_top', type: 'NAND', label: 'NAND 2 (UPPER)' },
          'NAND CELL 2 (UPPER STAGE)',
          'Horní větev XOR matice'
        );

        createNandCell(0, 4.5, 'nand_bot',
          { id: 'nand_bot', type: 'NAND', label: 'NAND 3 (LOWER)' },
          'NAND CELL 3 (LOWER STAGE)',
          'Spodní větev XOR matice'
        );

        createNandCell(6.0, 0, 'nand_out',
          { id: 'nand_out', type: 'NAND', label: 'NAND 4 (OUTPUT)' },
          'NAND CELL 4 (FINAL OUTPUT)',
          'Výstupní NAND buňka poskytující výsledek Y'
        );

        activeModelGroup.add(xorGroup);
        camera.position.set(0, 18, 20);
        controls.target.set(0, 1, 0);
      }

      // =====================================================================
      // LEVEL 6: CMOS TRANZISTOROVÉ SCHÉMA (SILICON MOSFET LEVEL)
      // =====================================================================
      else if (currentLevelIdx === 6) {
        const cmosGroup = new THREE.Group();

        // Silicon Substrate
        const sub = new THREE.Mesh(
          new THREE.BoxGeometry(22.0, 1.2, 18.0),
          new THREE.MeshStandardMaterial({ color: 0x1a1528, roughness: 0.6 })
        );
        sub.position.y = 0.6;
        cmosGroup.add(sub);

        // N-Well region (Teal) for PMOS
        const nWell = new THREE.Mesh(
          new THREE.BoxGeometry(18.0, 0.15, 6.5),
          new THREE.MeshStandardMaterial({ color: 0x006666, roughness: 0.4, emissive: 0x004444, emissiveIntensity: 0.2 })
        );
        nWell.position.set(0, 1.25, -4.0);
        cmosGroup.add(nWell);

        // P-Substrate region (Purple) for NMOS
        const pSub = new THREE.Mesh(
          new THREE.BoxGeometry(18.0, 0.15, 6.5),
          new THREE.MeshStandardMaterial({ color: 0x441166, roughness: 0.4, emissive: 0x220044, emissiveIntensity: 0.2 })
        );
        pSub.position.set(0, 1.25, 4.0);
        cmosGroup.add(pSub);

        // 3D Physical Transistor Meshes
        const createTransistorMesh = (x, z, color, comp, name, desc) => {
          const tGrp = new THREE.Group();
          const channel = new THREE.Mesh(
            new THREE.BoxGeometry(3.6, 0.8, 2.6),
            new THREE.MeshStandardMaterial({ color: color, roughness: 0.35, metalness: 0.5, emissive: color, emissiveIntensity: 0.3 })
          );
          channel.position.y = 0.4;
          tGrp.add(channel);

          // Polysilicon Gate Stripe
          const gateStripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.4, 3.2),
            new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.8, roughness: 0.2 })
          );
          gateStripe.position.set(0, 0.9, 0);
          tGrp.add(gateStripe);

          tGrp.position.set(x, 1.3, z);
          cmosGroup.add(tGrp);
          registerInteractive(channel, comp, name, desc, true);
        };

        // PMOS Transistors
        createTransistorMesh(-4.5, -4.0, 0x00aa88,
          { id: 'pmos_1', type: 'NOT', label: 'PMOS 1 (PULL-UP)' },
          'CMOS P-CHANNEL MOSFET 1',
          'Paralelní pull-up PMOS tranzistor spínající VDD (+5V) (Dvojklik pro polovodičový průřez a hradlový oxid)'
        );

        createTransistorMesh(4.5, -4.0, 0x00aa88,
          { id: 'pmos_2', type: 'NOT', label: 'PMOS 2 (PULL-UP)' },
          'CMOS P-CHANNEL MOSFET 2',
          'Druhý paralelní pull-up PMOS tranzistor'
        );

        // NMOS Transistors
        createTransistorMesh(-4.5, 4.0, 0x8844cc,
          { id: 'nmos_1', type: 'AND', label: 'NMOS 1 (PULL-DOWN)' },
          'CMOS N-CHANNEL MOSFET 1',
          'Sériový pull-down NMOS tranzistor spínající GND (Dvojklik pro polovodičový průřez)'
        );

        createTransistorMesh(4.5, 4.0, 0x8844cc,
          { id: 'nmos_2', type: 'AND', label: 'NMOS 2 (PULL-DOWN)' },
          'CMOS N-CHANNEL MOSFET 2',
          'Druhý sériový pull-down NMOS tranzistor'
        );

        activeModelGroup.add(cmosGroup);
        camera.position.set(0, 18, 20);
        controls.target.set(0, 1.2, 0);
      }

      // =====================================================================
      // LEVEL 7: PHYSICAL MOSFET DIE SEMICONDUCTOR CROSS-SECTION
      // =====================================================================
      else if (currentLevelIdx === 7) {
        const mosfetGroup = new THREE.Group();

        // Silicon Bulk Substrate
        const bulk = new THREE.Mesh(
          new THREE.BoxGeometry(18.0, 4.0, 10.0),
          new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.6, metalness: 0.2 })
        );
        bulk.position.y = 2.0;
        mosfetGroup.add(bulk);

        // Doped Source Pocket (P+ or N+)
        const srcPocket = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 1.4, 7.0),
          new THREE.MeshStandardMaterial({ color: 0x0077aa, roughness: 0.35, emissive: 0x004466, emissiveIntensity: 0.3 })
        );
        srcPocket.position.set(-5.0, 3.3, 0);
        mosfetGroup.add(srcPocket);

        // Doped Drain Pocket (P+ or N+)
        const drnPocket = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 1.4, 7.0),
          new THREE.MeshStandardMaterial({ color: 0x0077aa, roughness: 0.35, emissive: 0x004466, emissiveIntensity: 0.3 })
        );
        drnPocket.position.set(5.0, 3.3, 0);
        mosfetGroup.add(drnPocket);

        // Gate Oxide Dielectric Layer (3.5nm SiO2) - THE GATEWAY TO LEVEL 8!
        const oxideMat = new THREE.MeshStandardMaterial({
          color: 0x00ffcc,
          emissive: 0x00ffcc,
          emissiveIntensity: 0.7,
          roughness: 0.1,
          metalness: 0.8,
        });
        const gateOxide = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.25, 7.0), oxideMat);
        gateOxide.position.set(0, 4.12, 0);
        mosfetGroup.add(gateOxide);

        registerInteractive(
          gateOxide,
          { id: 'sio2_dielectric', type: 'NOT', label: 'GATE OXIDE (3.5nm SiO2)' },
          'GATE DIELECTRIC OXIDE (3.5 nm SiO2)',
          'Křemíkový dielektrický oxid (Dvojklik pro přechod na atomární krystalovou mřížku)',
          true
        );

        // Polysilicon Gate Electrode
        const polyGate = new THREE.Mesh(
          new THREE.BoxGeometry(5.0, 1.2, 7.0),
          new THREE.MeshStandardMaterial({ color: 0xdd8800, metalness: 0.85, roughness: 0.2 })
        );
        polyGate.position.set(0, 4.85, 0);
        mosfetGroup.add(polyGate);

        // Mobile charge carrier drift particles (holes / electrons)
        for (let i = 0; i < 24; i++) {
          const carrier = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.0 })
          );
          carrier.position.set(-4.0 + Math.random() * 8.0, 3.6 + Math.random() * 0.4, -3.0 + Math.random() * 6.0);
          mosfetGroup.add(carrier);
          animElements.push({
            mesh: carrier,
            speed: 0.05 + Math.random() * 0.04,
            minX: -4.5,
            maxX: 4.5,
          });
        }

        activeModelGroup.add(mosfetGroup);
        camera.position.set(0, 14, 22);
        controls.target.set(0, 3.5, 0);
      }

      // =====================================================================
      // LEVEL 8: ATOMIC SILICON LATTICE & DIELECTRIC QUANTUM INTERFACE
      // =====================================================================
      else if (currentLevelIdx >= 8) {
        const atomicGroup = new THREE.Group();

        // Materials for Si (Azure) and O (Ruby Carmine)
        const siMat = new THREE.MeshStandardMaterial({
          color: 0x00c8ff,
          metalness: 0.8,
          roughness: 0.15,
          emissive: 0x0077aa,
          emissiveIntensity: 0.4,
        });

        const oMat = new THREE.MeshStandardMaterial({
          color: 0xff2255,
          metalness: 0.6,
          roughness: 0.2,
          emissive: 0xaa1133,
          emissiveIntensity: 0.5,
        });

        const bondMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.3,
        });

        // 3D Atomic Grid (Tetrahedral Lattice)
        const siAtoms = [];
        const oAtoms = [];

        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 2; y++) {
            for (let z = -2; z <= 2; z++) {
              const px = x * 3.6;
              const py = y * 3.6;
              const pz = z * 3.6;

              // Silicon Atom
              const si = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 24), siMat);
              si.position.set(px, py, pz);
              atomicGroup.add(si);
              siAtoms.push(si);

              registerInteractive(
                si,
                { id: 'si_atom', type: 'ATOM', label: 'SILICON ATOM (14 Si)' },
                'ATOM KŘEMÍKU (14 Si: [Ne] 3s² 3p²)',
                'Základní prvek polovodičů (Fyzikální limit: nejmenší stavební jednotka)',
                false
              );

              // Oxygen bridge atoms between Si nodes
              if (x < 2) {
                const ox = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 18), oMat);
                ox.position.set(px + 1.8, py, pz);
                atomicGroup.add(ox);
                oAtoms.push(ox);

                // Bond cylinder
                const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), bondMat);
                bond.rotation.z = Math.PI / 2;
                bond.position.set(px + 1.8, py, pz);
                atomicGroup.add(bond);
              }
              if (y < 2) {
                const oy = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 18), oMat);
                oy.position.set(px, py + 1.8, pz);
                atomicGroup.add(oy);
                oAtoms.push(oy);

                const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), bondMat);
                bond.position.set(px, py + 1.8, pz);
                atomicGroup.add(bond);
              }
              if (z < 2) {
                const oz = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 18), oMat);
                oz.position.set(px, py, pz + 1.8);
                atomicGroup.add(oz);
                oAtoms.push(oz);

                const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), bondMat);
                bond.rotation.x = Math.PI / 2;
                bond.position.set(px, py, pz + 1.8);
                atomicGroup.add(bond);
              }
            }
          }
        }

        // Electron probability cloud quantum particles
        for (let i = 0; i < 60; i++) {
          const p = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.0 })
          );
          p.position.set(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 16
          );
          atomicGroup.add(p);
          animElements.push({
            mesh: p,
            rx: (Math.random() - 0.5) * 0.02,
            ry: (Math.random() - 0.5) * 0.02,
            rz: (Math.random() - 0.5) * 0.02,
          });
        }

        activeModelGroup.add(atomicGroup);
        camera.position.set(0, 16, 24);
        controls.target.set(0, 0, 0);
      }

      controls.update();
    };

    rebuild3DScene();

    // 6. RAYCASTER & INTERACTION LISTENER
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        container.style.cursor = hit.userData.canDrill ? 'pointer' : 'help';

        if (hoveredMeshRef.current !== hit) {
          if (hoveredMeshRef.current && hoveredMeshRef.current.material?.emissive) {
            hoveredMeshRef.current.material.emissive.setHex(hoveredMeshRef.current.userData.originalEmissive);
            hoveredMeshRef.current.material.emissiveIntensity = hoveredMeshRef.current.userData.originalEmissiveIntensity;
          }
          hoveredMeshRef.current = hit;
          if (hit.material?.emissive) {
            hit.material.emissive.setHex(0x00f0ff);
            hit.material.emissiveIntensity = 0.8;
          }
          setHoveredComp({
            comp: hit.userData.component,
            name: hit.userData.name,
            desc: hit.userData.desc,
            canDrill: hit.userData.canDrill,
          });
        }
      } else {
        container.style.cursor = 'default';
        if (hoveredMeshRef.current) {
          if (hoveredMeshRef.current.material?.emissive) {
            hoveredMeshRef.current.material.emissive.setHex(hoveredMeshRef.current.userData.originalEmissive);
            hoveredMeshRef.current.material.emissiveIntensity = hoveredMeshRef.current.userData.originalEmissiveIntensity;
          }
          hoveredMeshRef.current = null;
          setHoveredComp(null);
        }
      }
    };

    const handleDoubleClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData.component && hit.userData.canDrill && onDrillDown) {
          audioEngine.playRelayClick(1.6);
          onDrillDown(hit.userData.component);
        }
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('dblclick', handleDoubleClick);

    // 7. 60 FPS Render & Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Animate drifting charge carriers or clouds
      for (const el of animElements) {
        if (el.speed !== undefined) {
          el.mesh.position.x += el.speed;
          if (el.mesh.position.x > el.maxX) el.mesh.position.x = el.minX;
        } else if (el.rx !== undefined) {
          el.mesh.rotation.x += el.rx;
          el.mesh.rotation.y += el.ry;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [modelMode, currentLevelIdx]);

  // Camera preset handler
  const setPresetCamera = (type) => {
    setCameraView(type);
    if (!controlsRef.current || !cameraRef.current) return;
    const ctrl = controlsRef.current;
    const cam = cameraRef.current;

    switch (type) {
      case 'top':
        cam.position.set(0, 36, 0.1);
        ctrl.target.set(0, 0, 0);
        break;
      case 'pins':
        cam.position.set(-2, 10, 8);
        ctrl.target.set(-2, 1, -1);
        break;
      case 'iso':
      default:
        cam.position.set(22, 24, 28);
        ctrl.target.set(0, 0, 0);
        break;
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full h-full bg-[#06080E] overflow-hidden select-none font-mono">
      {/* Three.js 3D Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Breadcrumb Navigation Bar (Identical to 2D Schematic Canvas) */}
      {hierarchyStack && hierarchyStack.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
          <div className="flex items-center space-x-2 bg-[#080D1A]/95 border border-cyan-500/50 rounded-2xl px-4 py-2 shadow-[0_10px_35px_rgba(0,240,255,0.25)] backdrop-blur-xl">
            {/* Level Up Button */}
            <button
              onClick={() => onNavigateUp && onNavigateUp()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 hover:text-white transition-all text-xs font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)] active:scale-95"
              title="Vrátit se o úroveň výše (Klávesa Backspace nebo Esc)"
            >
              <ArrowLeft size={13} />
              <span>LEVEL UP</span>
            </button>

            {/* Breadcrumb Path Trail */}
            <div className="flex items-center space-x-1.5 text-xs font-mono overflow-x-auto max-w-[650px] scrollbar-none py-0.5">
              {hierarchyStack.map((lvl, idx) => {
                const isCurrent = idx === hierarchyStack.length - 1;
                return (
                  <React.Fragment key={lvl.id + '-' + idx}>
                    {idx > 0 && <span className="text-cyan-500/60 font-bold select-none">&gt;</span>}
                    <button
                      onClick={() => onNavigateUp && onNavigateUp(idx)}
                      disabled={isCurrent}
                      className={`px-2 py-1 rounded transition-all whitespace-nowrap text-left ${
                        isCurrent
                          ? 'text-cyan-200 font-bold bg-cyan-900/40 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                          : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-950/40 cursor-pointer'
                      }`}
                      title={lvl.title}
                    >
                      {lvl.title.length > 24 ? lvl.title.slice(0, 22) + '…' : lvl.title}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Depth Badge */}
            <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md border whitespace-nowrap ${
              currentLevelIdx >= 8
                ? 'text-amber-400 bg-amber-950/60 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'text-cyan-400 bg-cyan-950/60 border-cyan-700/50'
            }`}>
              ÚROVEŇ {currentLevelIdx} / 8 {currentLevelIdx >= 8 ? '[ATOMOVÝ LIMIT]' : ''}
            </span>
          </div>

          {/* Subtitle / Micro-Architecture Formula Banner */}
          {currentLevelEntry.subtitle && (
            <div className="mt-1.5 text-[11px] font-mono text-cyan-300/90 bg-[#060A14]/90 border border-cyan-500/30 px-3.5 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{currentLevelEntry.subtitle}</span>
              {currentLevelIdx < 8 ? (
                <span className="text-gray-500 ml-1 text-[10px]">(Dvojklikem na 3D komponentu vstoupíte hlouběji)</span>
              ) : (
                <span className="text-amber-400/90 ml-1 text-[10px] font-bold">[Fyzikální limit: elementární atomy křemíku]</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Center: Model Switcher for Level 1 (Board vs Chip) */}
      {currentLevelIdx === 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-[#080D1A]/95 border border-cyan-500/40 rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,240,255,0.2)] backdrop-blur-xl text-xs z-20">
          <button
            onClick={() => { setModelMode('board'); setPresetCamera('iso'); }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
              modelMode === 'board'
                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Celá PCI karta Diamond Multimedia EDGE 3D NV1"
          >
            <ShieldCheck size={14} className="text-cyan-400" />
            <span>CELÁ KARTA (DIAMOND EDGE 3D)</span>
          </button>

          <button
            onClick={() => { setModelMode('chip'); setPresetCamera('iso'); }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
              modelMode === 'chip'
                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Detailní model procesoru SGS-Thomson STG2000X / NVIDIA NV1 (PQFP-208)"
          >
            <Cpu size={14} className="text-cyan-400" />
            <span>ČIP STG2000X / NV1 (PQFP-208)</span>
          </button>
        </div>
      )}

      {/* Top Right: Camera Angles */}
      <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-[#080D1A]/90 border border-cyan-500/40 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl text-xs z-20">
        <button
          onClick={() => setPresetCamera('iso')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'iso'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          IZO 3D
        </button>
        <button
          onClick={() => setPresetCamera('top')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'top'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          SHORA (90°)
        </button>
        <button
          onClick={() => setPresetCamera('pins')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'pins'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          DETAIL
        </button>
      </div>

      {/* Top Left: Physical Spec HUD */}
      <div className="absolute top-4 left-4 bg-[#080D1A]/95 border border-cyan-500/40 p-4 rounded-xl text-xs space-y-2 pointer-events-none shadow-[0_10px_35px_rgba(0,240,255,0.15)] backdrop-blur-xl max-w-sm z-20">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{currentLevelEntry.title}</span>
        </div>

        {currentLevelIdx === 1 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">DIAMOND MULTIMEDIA EDGE 3D PCI</div>
            <div>HLAVNÍ ČIP: SGS-Thomson STG2000X / NV1 (PQFP-208)</div>
            <div>ROZMĚRY ČIPU: 28.0 mm × 28.0 mm × 3.4 mm (208 pinů)</div>
            <div>PAMĚŤ: Toshiba 16Mb EDO DRAM (64-bitová sběrnice)</div>
            <div className="text-cyan-300 text-[10px]">💡 Dvojklikem na procesor nebo paměti vstoupíte do vnitřní struktury</div>
          </div>
        )}

        {currentLevelIdx === 2 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">KŘEMÍKOVÝ DIE: 135 mm² monolitický křemík</div>
            <div>VÝROBNÍ PROCES: 500 nm (0.5µm) 3-vrstvý CMOS</div>
            <div>TRANZISTORY: ~1 000 000 křemíkových MOSFETů</div>
            <div>BOND DRÁTKY: 208 zlatých drátků (25µm) z die k pouzdru</div>
            <div className="text-emerald-400 text-[10px]">💡 Dvojklikem na 3D QUADRATIC ENGINE otevřete pipeline</div>
          </div>
        )}

        {currentLevelIdx === 3 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">3D QTM ARITHMETIC PIPELINE</div>
            <div>VÝPOČET KŘIVEK: Forward Differencing Δ²U / Δ²V</div>
            <div>JEDNOTKY: Akumulátory, 4-bit sčítačka, Z-Buffer, Bilineární filtr</div>
            <div className="text-cyan-300 text-[10px]">💡 Dvojklikem na PIPELINE ADDER vstoupíte do logických hradel</div>
          </div>
        )}

        {currentLevelIdx === 4 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">1-BIT FULL ADDER (HRADLOVÁ ÚROVEŇ)</div>
            <div>POUZDRA: Keramické DIP čipy s měděnými cestami</div>
            <div>HRADLA: XOR (A ⊕ B ⊕ Cin), AND (přenosy), OR (Cout)</div>
            <div className="text-cyan-300 text-[10px]">💡 Dvojklikem na XOR GATE 1 zobrazíte 4-NAND ekvivalent</div>
          </div>
        )}

        {currentLevelIdx === 5 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">4-NAND STANDARD CELL MATRIX</div>
            <div>TOPOLOGIE: 4 křížově vázané buňky NAND</div>
            <div>LOGIKA: Y = NAND( NAND(A, NAND(A,B)), NAND(B, NAND(A,B)) )</div>
            <div className="text-cyan-300 text-[10px]">💡 Dvojklikem na NAND CELL 1 přejdete na tranzistory CMOS</div>
          </div>
        )}

        {currentLevelIdx === 6 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">KŘEMÍKOVÁ ÚROVEŇ CMOS TRANZISTORŮ</div>
            <div>N-WELL: 2× PMOS (paralelní pull-up na VDD +5V)</div>
            <div>P-SUBSTRATE: 2× NMOS (sériový pull-down na GND 0V)</div>
            <div>HRADLO: Polykrystalický křemík s dielektrikem</div>
            <div className="text-cyan-300 text-[10px]">💡 Dvojklikem na PMOS 1 zobrazíte polovodičový průřez a oxid</div>
          </div>
        )}

        {currentLevelIdx === 7 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">MOSFET POLOVODIČOVÝ PRŮŘEZ</div>
            <div>DIFFUSE: P+ Source a Drain kapsy s ohmickým kontaktem</div>
            <div>KANÁL: Inverzní kanál s proudícími nosiči náboje</div>
            <div>OXID HRADLA: 3.5 nm vrstva SiO2 (smaragdově zářící)</div>
            <div className="text-cyan-300 text-[10px]">💡 Dvojklikem na GATE OXIDE vstoupíte do atomární mřížky</div>
          </div>
        )}

        {currentLevelIdx >= 8 && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-amber-400 font-semibold">ATOMOVÁ KRYSTALICKÁ MŘÍŽKA SiO2</div>
            <div>KŘEMÍK (Si): Azurové sféry [Ne] 3s² 3p² (14 elektronů)</div>
            <div>KYSLÍK (O): Rubínové sféry [He] 2s² 2p⁴ (8 elektronů)</div>
            <div>VAZBY: Kovalentní sp³ hybridizace (1.62 Å, 109.5°)</div>
            <div className="text-amber-400 font-bold text-[10px]">[ATOMOVÝ LIMIT DOSAŽEN - NEJMENŠÍ FYZIKÁLNÍ JEDNOTKA]</div>
          </div>
        )}
      </div>

      {/* Floating Hover HUD Tooltip */}
      {hoveredComp && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#080D1A]/95 border border-cyan-400/60 px-5 py-3 rounded-2xl shadow-[0_10px_35px_rgba(0,240,255,0.3)] backdrop-blur-xl pointer-events-none flex items-center space-x-4 max-w-xl animate-fade-in">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-ping flex-shrink-0" />
          <div>
            <div className="text-white font-bold text-xs tracking-wide">{hoveredComp.name}</div>
            <div className="text-cyan-300/80 text-[11px] mt-0.5">{hoveredComp.desc}</div>
            {hoveredComp.canDrill && (
              <div className="text-amber-400 font-semibold text-[10px] mt-1 flex items-center space-x-1">
                <span>⚡ DVOJKLIK PRO PROZKOUMÁNÍ VNITŘNÍ STRUKTURY (3D)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}