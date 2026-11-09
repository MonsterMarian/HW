import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Camera, Eye, Cpu, Layers, Maximize2, ShieldCheck, Thermometer, Zap, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

export function PhysicsView({ engine }) {
  const containerRef = useRef(null);
  const [modelMode, setModelMode] = useState('chip'); // 'chip' (PQFP-208) | 'die' (Decapped Silicon) | 'board' (Diamond Edge 3D PCI)
  const [cameraView, setCameraView] = useState('iso');
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06080e);
    scene.fog = new THREE.FogExp2(0x06080e, 0.005);

    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    // Initial camera position for chip closeup
    camera.position.set(0, 22, 28);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Interactive OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 4;
    controls.maxDistance = 150;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 3. Cinematic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xdbe6f5, 0.6);
    scene.add(ambientLight);

    // Key overhead warm-white light with high-res shadows
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(18, 35, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 100;
    const shadowD = 25;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    // Subtle cyan edge-grazing rim light for leadframe pin specular highlights
    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.85);
    cyanRim.position.set(-25, 15, -20);
    scene.add(cyanRim);

    // Warm gold bounce light for gold pads and bonding wires
    const goldFill = new THREE.DirectionalLight(0xffc866, 0.6);
    goldFill.position.set(20, -5, -15);
    scene.add(goldFill);

    // Floor anti-static mat grid
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b12,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.5;
    floor.receiveShadow = true;
    scene.add(floor);

    const floorGrid = new THREE.GridHelper(140, 70, 0x00f0ff, 0x111b2b);
    floorGrid.position.y = -3.48;
    scene.add(floorGrid);

    // 4. TEXTURE GENERATORS
    // Authentic SGS-THOMSON STG2000X / NVIDIA NV1 Laser-Etched Package Texture
    const createStg2000xTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 1024;
      cvs.height = 1024;
      const ctx = cvs.getContext('2d');

      // Dark charcoal-black thermoset plastic epoxy mold base
      ctx.fillStyle = '#14161B';
      ctx.fillRect(0, 0, 1024, 1024);

      // Fine epoxy surface stipple / grain
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let i = 0; i < 8000; i++) {
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }

      // Mold Ejector Pin Recess Circles (Subtle circular depressions)
      ctx.fillStyle = '#0f1115';
      ctx.beginPath();
      ctx.arc(512, 140, 48, 0, Math.PI * 2);
      ctx.arc(512, 884, 48, 0, Math.PI * 2);
      ctx.fill();

      // Pin 1 Circular Index Dimple (Top-Left)
      ctx.fillStyle = '#0a0c10';
      ctx.beginPath();
      ctx.arc(110, 110, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222834';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 1. SGS-THOMSON Stylized 'ST' Logo
      ctx.fillStyle = '#DFE7F2';
      ctx.font = 'bold 54px "Courier New", monospace';
      ctx.textAlign = 'center';

      // Draw stylized ST logo
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

      // 2. Main Chip Part Number: STG2000X
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 74px "Courier New", monospace';
      ctx.fillText('STG2000X', 512, 510);

      // 3. Architecture Name: NVIDIA NV1
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 52px "Courier New", monospace';
      ctx.fillText('NVIDIA NV1', 512, 580);

      // 4. Date Code & Foundry Origin: A22BF9548 MALTA (48th week of 1995)
      ctx.fillStyle = '#BAC9DC';
      ctx.font = 'bold 34px "Courier New", monospace';
      ctx.fillText('A22BF9548 MALTA', 512, 650);

      // 5. Silicon Tech Details
      ctx.fillStyle = '#6E819B';
      ctx.font = '24px "Courier New", monospace';
      ctx.fillText('0.5µm 3D MULTIMEDIA ENGINE', 512, 715);
      ctx.fillText('208-PIN PLASTIC QUAD FLAT PACK', 512, 750);

      // Chamfer Border Guide
      ctx.strokeStyle = '#252D3D';
      ctx.lineWidth = 6;
      ctx.strokeRect(36, 36, 952, 952);

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // Decapped Silicon Die Floorplan Texture (135 mm² 0.5µm Die)
    const createDieTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 1024;
      cvs.height = 1024;
      const ctx = cvs.getContext('2d');

      // Silicon Wafer Base with Iridescent Thin-Film Interference
      const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.3, '#1e1b4b');
      grad.addColorStop(0.7, '#172554');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 1024);

      // Fine Circuit Metal 1/2 Interconnect Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1024; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
      }

      // Functional Micro-Architecture Silicon Blocks:
      const drawBlock = (x, y, w, h, title, sub, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(title, x + w / 2, y + h / 2 - 8);

        ctx.fillStyle = '#00F0FF';
        ctx.font = '16px monospace';
        ctx.fillText(sub, x + w / 2, y + h / 2 + 18);
      };

      // 1. 3D Quadratic Texture Engine (QTM) - Central Large Block
      drawBlock(310, 310, 404, 404, '3D QUADRATIC ENGINE', 'QTM FORWARD-DIFF ALU', 'rgba(0, 180, 220, 0.25)');

      // 2. 2D GUI & BitBLT Engine
      drawBlock(100, 100, 380, 180, '2D GUI & BitBLT', '64-BIT ACCELERATOR', 'rgba(120, 50, 200, 0.25)');

      // 3. 32-Voice Wavetable Audio DSP
      drawBlock(540, 100, 380, 180, '32-VOICE AUDIO DSP', 'WAVETABLE SYNTH', 'rgba(16, 185, 129, 0.25)');

      // 4. 64-Bit Memory Controller (EDO DRAM Arbiter)
      drawBlock(100, 740, 380, 180, '64-BIT MEMORY ARBITER', 'EDO DRAM DMA FIFO', 'rgba(234, 179, 8, 0.25)');

      // 5. 135MHz TrueColor RAMDAC Core
      drawBlock(540, 740, 380, 180, '135MHz RAMDAC CORE', '256x18 CLUT PALETTE', 'rgba(244, 63, 94, 0.25)');

      // 6. PCI 2.1 Host Bus Interface
      drawBlock(100, 310, 180, 404, 'PCI 2.1 BUS', '33MHz DMA', 'rgba(59, 130, 246, 0.25)');

      // 7. Sega Saturn Controller Matrix
      drawBlock(744, 310, 180, 404, 'SEGA SATURN', 'SMPC I/O', 'rgba(168, 85, 247, 0.25)');

      // Perimeter Gold Wire Bonding Pads (208 pads along all 4 outer edges)
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

    // CRT Screen Texture
    const crtCanvas = document.createElement('canvas');
    crtCanvas.width = 256;
    crtCanvas.height = 256;
    const crtCtx = crtCanvas.getContext('2d');
    const crtTexture = new THREE.CanvasTexture(crtCanvas);
    crtTexture.colorSpace = THREE.SRGBColorSpace;

    // 5. MODEL GENERATOR DISPATCHER
    const activeModelGroup = new THREE.Group();
    scene.add(activeModelGroup);

    const rebuild3DScene = (mode) => {
      // Clear previous meshes
      while (activeModelGroup.children.length > 0) {
        activeModelGroup.remove(activeModelGroup.children[0]);
      }

      // =====================================================================
      // MODE A: THE REAL SGS-THOMSON STG2000X / NVIDIA NV1 CHIP (PQFP-208)
      // Exactly matching the real 1995 package dimensions, markings, and 208 pins
      // =====================================================================
      if (mode === 'chip') {
        const chipGroup = new THREE.Group();

        // Package Body: 28mm × 28mm, 3.4mm height -> scaled to 16.0 × 16.0 × 2.4 units
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
        chipBody.receiveShadow = true;
        chipGroup.add(chipBody);

        // 208 Real Gull-Wing Metallic Pins (52 pins on North, South, East, West sides)
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0xdae2ec,
          metalness: 0.95,
          roughness: 0.12,
        });

        const pinsPerSide = 52;
        const pinPitch = (bodySize * 0.92) / pinsPerSide;
        const pinWidth = pinPitch * 0.55;
        const pinExt = 2.4; // Extends out from body

        for (let p = 0; p < pinsPerSide; p++) {
          const offset = (p - pinsPerSide / 2 + 0.5) * pinPitch;

          // Gull-wing pin shape: Horizontal shoulder -> 45° drop -> flat solder foot
          const createGullWing = (rx, rz, isRotated) => {
            const pGrp = new THREE.Group();

            // 1. Horizontal lead shoulder
            const shoulder = new THREE.Mesh(
              new THREE.BoxGeometry(isRotated ? 0.9 : pinWidth, 0.16, isRotated ? pinWidth : 0.9),
              pinMat
            );
            shoulder.position.set(0, bodyHeight / 2 + 0.2, 0);
            pGrp.add(shoulder);

            // 2. Downward bend
            const drop = new THREE.Mesh(
              new THREE.BoxGeometry(isRotated ? 0.5 : pinWidth, 0.65, isRotated ? pinWidth : 0.5),
              pinMat
            );
            drop.position.set(isRotated ? (rx > 0 ? 0.4 : -0.4) : 0, 0.5, isRotated ? 0 : (rz > 0 ? 0.4 : -0.4));
            pGrp.add(drop);

            // 3. Flat solder foot
            const foot = new THREE.Mesh(
              new THREE.BoxGeometry(isRotated ? 0.9 : pinWidth, 0.12, isRotated ? pinWidth : 0.9),
              pinMat
            );
            foot.position.set(isRotated ? (rx > 0 ? 0.8 : -0.8) : 0, 0.08, isRotated ? 0 : (rz > 0 ? 0.8 : -0.8));
            pGrp.add(foot);

            pGrp.position.set(rx, 0, rz);
            return pGrp;
          };

          // North Edge (52 pins)
          chipGroup.add(createGullWing(offset, -bodySize / 2 - 0.45, false));

          // South Edge (52 pins)
          chipGroup.add(createGullWing(offset, bodySize / 2 + 0.45, false));

          // East Edge (52 pins)
          chipGroup.add(createGullWing(bodySize / 2 + 0.45, offset, true));

          // West Edge (52 pins)
          chipGroup.add(createGullWing(-bodySize / 2 - 0.45, offset, true));
        }

        // Test PCB Substrate Footprint (Green soldermask ring with 208 gold solder pads)
        const pcbFootprintGeo = new THREE.BoxGeometry(25.0, 0.4, 25.0);
        const pcbFootprintMat = new THREE.MeshStandardMaterial({
          color: 0x0b2518,
          roughness: 0.5,
          metalness: 0.1,
        });
        const pcbFootprint = new THREE.Mesh(pcbFootprintGeo, pcbFootprintMat);
        pcbFootprint.position.y = -0.2;
        pcbFootprint.receiveShadow = true;
        chipGroup.add(pcbFootprint);

        // Gold solder pads under each pin foot
        const goldPadMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
        for (let p = 0; p < pinsPerSide; p++) {
          const off = (p - pinsPerSide / 2 + 0.5) * pinPitch;
          const padN = new THREE.Mesh(new THREE.BoxGeometry(pinWidth * 1.2, 0.08, 1.2), goldPadMat);
          padN.position.set(off, 0.04, -bodySize / 2 - 1.2);
          chipGroup.add(padN);

          const padS = new THREE.Mesh(new THREE.BoxGeometry(pinWidth * 1.2, 0.08, 1.2), goldPadMat);
          padS.position.set(off, 0.04, bodySize / 2 + 1.2);
          chipGroup.add(padS);

          const padE = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, pinWidth * 1.2), goldPadMat);
          padE.position.set(bodySize / 2 + 1.2, 0.04, off);
          chipGroup.add(padE);

          const padW = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, pinWidth * 1.2), goldPadMat);
          padW.position.set(-bodySize / 2 - 1.2, 0.04, off);
          chipGroup.add(padW);
        }

        activeModelGroup.add(chipGroup);
      }

      // =====================================================================
      // MODE B: DECAPPED SILICON DIE (0.5µm 135 mm² DIE WITH 208 GOLD BOND WIRES)
      // =====================================================================
      else if (mode === 'die') {
        const dieGroup = new THREE.Group();

        // Exposed Cavity & Substrate Base
        const cavityGeo = new THREE.BoxGeometry(18.0, 1.2, 18.0);
        const cavityMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.7 });
        const cavity = new THREE.Mesh(cavityGeo, cavityMat);
        cavity.position.y = 0.6;
        dieGroup.add(cavity);

        // Central Copper/Gold Die Attach Paddle
        const paddleGeo = new THREE.BoxGeometry(11.0, 0.2, 11.0);
        const paddleMat = new THREE.MeshStandardMaterial({ color: 0xe6a838, metalness: 0.85, roughness: 0.25 });
        const paddle = new THREE.Mesh(paddleGeo, paddleMat);
        paddle.position.y = 1.25;
        dieGroup.add(paddle);

        // The 135 mm² Monolithic Silicon Die
        const dieSize = 9.2;
        const dieGeo = new THREE.BoxGeometry(dieSize, 0.35, dieSize);
        const dieTex = createDieTexture();
        const dieMat = new THREE.MeshStandardMaterial({
          map: dieTex,
          metalness: 0.75,
          roughness: 0.18,
          emissive: new THREE.Color(0x00f0ff),
          emissiveIntensity: 0.15,
        });
        const dieMesh = new THREE.Mesh(dieGeo, dieMat);
        dieMesh.position.y = 1.45;
        dieMesh.castShadow = true;
        dieGroup.add(dieMesh);

        // 208 Ultra-Fine Gold Bonding Wires (25µm diameter)
        const wireMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 0.98,
          roughness: 0.1,
        });

        const wiresPerSide = 26; // Stylized wire count for performance
        for (let i = 0; i < wiresPerSide; i++) {
          const dieOff = (i - wiresPerSide / 2 + 0.5) * (dieSize / (wiresPerSide + 1));
          const leadOff = (i - wiresPerSide / 2 + 0.5) * (16.0 / (wiresPerSide + 1));

          const addWireCurve = (p1, p2) => {
            const mid = new THREE.Vector3(
              (p1.x + p2.x) / 2,
              p1.y + 1.2, // Arch height
              (p1.z + p2.z) / 2
            );
            const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
            const tube = new THREE.TubeGeometry(curve, 10, 0.04, 6, false);
            const wireMesh = new THREE.Mesh(tube, wireMat);
            dieGroup.add(wireMesh);
          };

          // North bond wires
          addWireCurve(
            new THREE.Vector3(dieOff, 1.6, -dieSize / 2),
            new THREE.Vector3(leadOff, 1.2, -8.2)
          );

          // South bond wires
          addWireCurve(
            new THREE.Vector3(dieOff, 1.6, dieSize / 2),
            new THREE.Vector3(leadOff, 1.2, 8.2)
          );

          // East bond wires
          addWireCurve(
            new THREE.Vector3(dieSize / 2, 1.6, dieOff),
            new THREE.Vector3(8.2, 1.2, leadOff)
          );

          // West bond wires
          addWireCurve(
            new THREE.Vector3(-dieSize / 2, 1.6, dieOff),
            new THREE.Vector3(-8.2, 1.2, leadOff)
          );
        }

        activeModelGroup.add(dieGroup);
      }

      // =====================================================================
      // MODE C: THE COMPLETE DIAMOND EDGE 3D PCI CARD WITH STG2000X IN CENTER
      // =====================================================================
      else if (mode === 'board') {
        const boardGroup = new THREE.Group();

        // 1. PCB Board (Dark Green Glossy FR-4)
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
          if (g >= 11 && g <= 13) continue; // Key slot
          const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, pcbH + 0.05, 2.2), goldMat);
          f.position.set(startX + g * spc, -pcbH / 2, pcbD / 2 - 0.3);
          boardGroup.add(f);
        }

        // Stamped Steel Bracket on Left Edge
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.9, roughness: 0.25 });
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 22.0, 3.2), steelMat);
        bracket.position.set(-pcbW / 2 - 1.0, 7.5, 0);
        bracket.castShadow = true;
        boardGroup.add(bracket);

        // Blue VGA DB-15 Connector
        const vgaBlue = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 2.2, 3.6),
          new THREE.MeshStandardMaterial({ color: 0x0055dd, roughness: 0.3 })
        );
        vgaBlue.position.set(-pcbW / 2 - 1.6, 3.5, -3.5);
        boardGroup.add(vgaBlue);

        // 2. THE MAIN STG2000X / NV1 CHIP IN THE EXACT CENTER OF THE PCB
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
        const createSoj = (x, z) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 3.2), dramMat);
          m.position.set(x, 0.5, z);
          m.castShadow = true;
          boardGroup.add(m);
        };
        createSoj(9.5, -6.5);
        createSoj(9.5, 0.0);
        createSoj(9.5, 6.5);

        // 4. ATT20C409 RAMDAC
        const dac = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.0, 5.2), dramMat);
        dac.position.set(-13.0, 0.5, -4.5);
        dac.castShadow = true;
        boardGroup.add(dac);

        // 5. Metal Can Crystals (Y1 & Y2)
        const canMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.1 });
        const y1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16), canMat);
        y1.rotateZ(Math.PI / 2);
        y1.position.set(-13.0, 0.7, 3.5);
        boardGroup.add(y1);

        activeModelGroup.add(boardGroup);
      }
    };

    rebuild3DScene(modelMode);

    // 6. 60 FPS Render & Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
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
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [modelMode]);

  // Camera preset handler
  const setPresetCamera = (type) => {
    setCameraView(type);
    if (!controlsRef.current || !cameraRef.current) return;
    const ctrl = controlsRef.current;
    const cam = cameraRef.current;

    if (modelMode === 'board') {
      switch (type) {
        case 'top':
          cam.position.set(0, 42, 0.1);
          ctrl.target.set(0, 0, 0);
          break;
        case 'pins':
          cam.position.set(-2, 10, 8);
          ctrl.target.set(-2, 1, -1);
          break;
        case 'iso':
        default:
          cam.position.set(24, 26, 32);
          ctrl.target.set(0, 0, 0);
          break;
      }
    } else {
      switch (type) {
        case 'top':
          cam.position.set(0, 26, 0.1);
          ctrl.target.set(0, 0, 0);
          break;
        case 'pins':
          cam.position.set(0, 6, 14);
          ctrl.target.set(0, 1.5, 8);
          break;
        case 'iso':
        default:
          cam.position.set(0, 20, 26);
          ctrl.target.set(0, 1, 0);
          break;
      }
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full h-full bg-[#06080E] overflow-hidden select-none font-mono">
      {/* Three.js 3D Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Center: Model Switcher (Chip vs Die vs Board) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-[#080D1A]/95 border border-cyan-500/40 rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,240,255,0.2)] backdrop-blur-xl text-xs z-20">
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

        <button
          onClick={() => { setModelMode('die'); setPresetCamera('iso'); }}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
            modelMode === 'die'
              ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Odvíčkovaný křemíkový die (135 mm², 208 zlatých bond drátků a mikroarchitektura)"
        >
          <Layers size={14} className="text-cyan-400" />
          <span>KŘEMÍKOVÝ DIE (0.5µm)</span>
        </button>

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
      </div>

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
          DETAIL PINŮ
        </button>
      </div>

      {/* Top Left: Physical Spec HUD */}
      <div className="absolute top-4 left-4 bg-[#080D1A]/95 border border-cyan-500/40 p-4 rounded-xl text-xs space-y-2 pointer-events-none shadow-[0_10px_35px_rgba(0,240,255,0.15)] backdrop-blur-xl max-w-sm">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>SGS-THOMSON STG2000X // NVIDIA NV1 (1995)</span>
        </div>

        {modelMode === 'chip' && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">POUZDRO: PQFP-208 (Plastic Quad Flat Package)</div>
            <div>ROZMĚRY: 28.0 mm × 28.0 mm × 3.4 mm (přesně na milimetr)</div>
            <div>VÝVODY: 208 pinů (52 pinů na každé straně, rozteč 0.5 mm)</div>
            <div>POPIS: Laserem gravírováno [ST] STG2000X NVIDIA NV1 A22BF9548 MALTA</div>
            <div className="text-cyan-300 text-[10px]">Gull-wing stříbrné nožky se stříškou a pájecí ploškou na PCB</div>
          </div>
        )}

        {modelMode === 'die' && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">KŘEMÍKOVÝ DIE: 135 mm² monolitický křemík</div>
            <div>VÝROBNÍ PROCES: 500 nm (0.5µm) 3-vrstvý CMOS (SGS-Thomson)</div>
            <div>TRANZISTORY: ~1 000 000 křemíkových MOSFETů</div>
            <div>BOND DRÁTKY: 208 zlatých drátků (25µm) vedoucích z die k pinům</div>
            <div className="text-emerald-400 text-[10px]">Viditelná mikroarchitektura: QTM 3D, BitBLT, Audio DSP, RAMDAC</div>
          </div>
        )}

        {modelMode === 'board' && (
          <div className="text-gray-300 space-y-1 text-[11px]">
            <div className="text-white font-semibold">KARTA: Diamond Multimedia EDGE 3D PCI</div>
            <div>HLAVNÍ ČIP: SGS-Thomson STG2000X / NV1 uprostřed desky</div>
            <div>PAMĚŤ: Toshiba EDO DRAM SOJ-40 (64-bitová sběrnice)</div>
            <div>KONEKTORY: VGA DB-15, Sega Saturn DB-9, 2× 3.5mm Audio Jack</div>
            <div className="text-cyan-300 text-[10px]">Pozlacený 32-bit PCI slot se zářezem pro 5V/3.3V</div>
          </div>
        )}
      </div>
    </div>
  );
}
