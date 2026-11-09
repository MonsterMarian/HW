import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WireState } from '../engine/logicEngine';
import { Camera, Eye, RotateCw, ZoomIn, ZoomOut, Maximize2, Cpu, Thermometer, ShieldCheck } from 'lucide-react';

export function PhysicsView({ engine }) {
  const containerRef = useRef(null);
  const [selectedCompInfo, setSelectedCompInfo] = useState(null);
  const [cameraView, setCameraView] = useState('iso'); // 'iso' | 'top' | 'bracket' | 'chip'
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080e);
    scene.fog = new THREE.FogExp2(0x06080e, 0.007);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(22, 28, 38);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Interactive OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below floor
    controls.minDistance = 6;
    controls.maxDistance = 140;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 3. Cinematic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xddeeff, 0.55);
    scene.add(ambientLight);

    // Key overhead white light with soft shadows
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(25, 45, 25);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 120;
    const shadowD = 35;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cyan rim light for cyberpunk edge glints
    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.85);
    cyanRim.position.set(-35, 20, -30);
    scene.add(cyanRim);

    // Warm gold secondary light (accentuates gold PCI fingers and solder pads)
    const goldFill = new THREE.DirectionalLight(0xffc866, 0.65);
    goldFill.position.set(30, -5, -20);
    scene.add(goldFill);

    // Under-board soft bounce light
    const bounceLight = new THREE.DirectionalLight(0x1a3328, 0.3);
    bounceLight.position.set(0, -20, 0);
    scene.add(bounceLight);

    // 4. Workbench Anti-Static Mat (Floor Grid)
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080c14,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const floorGrid = new THREE.GridHelper(140, 70, 0x00f0ff, 0x111c2e);
    floorGrid.position.y = -3.18;
    scene.add(floorGrid);

    // 5. Texture Generators for Silk-Screen & Chips
    const createChipTexture = (topText, subText, extra = '') => {
      const cvs = document.createElement('canvas');
      cvs.width = 512;
      cvs.height = 512;
      const ctx = cvs.getContext('2d');

      ctx.fillStyle = '#111317';
      ctx.fillRect(0, 0, 512, 512);

      // Matte epoxy grain
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 4000; i++) {
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }

      // Pin 1 Index Dot
      ctx.fillStyle = '#1e2430';
      ctx.beginPath();
      ctx.arc(44, 44, 18, 0, Math.PI * 2);
      ctx.fill();

      // Top Brand / IC Name
      ctx.fillStyle = '#D6DEEB';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(topText, 256, 210);

      // Subtitle / Part Number
      ctx.fillStyle = '#8FA3C4';
      ctx.font = '24px monospace';
      ctx.fillText(subText, 256, 265);

      if (extra) {
        ctx.fillStyle = '#5A729A';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(extra, 256, 315);
      }

      // Border Chamfer Guideline
      ctx.strokeStyle = '#222B3D';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, 480, 480);

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // PCB Silk-Screen Texture
    const createPcbTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 1024;
      cvs.height = 1024;
      const ctx = cvs.getContext('2d');

      // FR-4 Dark Green Glossy Soldermask base
      ctx.fillStyle = '#092316';
      ctx.fillRect(0, 0, 1024, 1024);

      // Woven fiberglass texture effect
      ctx.fillStyle = '#06190F';
      for (let y = 0; y < 1024; y += 8) {
        ctx.fillRect(0, y, 1024, 2);
      }
      for (let x = 0; x < 1024; x += 8) {
        ctx.fillRect(x, 0, 2, 1024);
      }

      // Silk Screen White Markings
      ctx.fillStyle = 'rgba(235, 245, 235, 0.85)';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('NVIDIA NV1 // DIAMOND EDGE 3D PCI', 120, 90);
      ctx.font = '16px monospace';
      ctx.fillText('FCC ID: EDGE3D-STG2000X  |  MADE IN USA  |  REV 1.04', 120, 125);
      ctx.fillText('(C)1995 SGS-THOMSON MICROELECTRONICS & NVIDIA CORP.', 120, 155);

      // Solder Mask Component Outlines & Designators
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(340, 240, 260, 260); // NV1 socket
      ctx.fillText('U1 [NV1 3D GPU]', 345, 230);

      ctx.strokeRect(620, 140, 180, 100); // VRAM 0
      ctx.fillText('U2 [EDO DRAM BANK 0]', 625, 130);

      ctx.strokeRect(620, 280, 180, 100); // VRAM 1
      ctx.fillText('U3 [EDO DRAM BANK 1]', 625, 270);

      ctx.strokeRect(620, 420, 160, 140); // RAMDAC
      ctx.fillText('U4 [ATT20C409 RAMDAC]', 625, 410);

      ctx.strokeRect(340, 90, 160, 120); // DSP
      ctx.fillText('U5 [AUDIO DSP]', 345, 80);

      // Gold Ground Plane Stipple
      ctx.fillStyle = 'rgba(180, 140, 40, 0.2)';
      for (let i = 0; i < 200; i++) {
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 4, 4);
      }

      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // CRT 3D Canvas Screen Texture
    const crtCanvas = document.createElement('canvas');
    crtCanvas.width = 256;
    crtCanvas.height = 256;
    const crtCtx = crtCanvas.getContext('2d');
    const crtTexture = new THREE.CanvasTexture(crtCanvas);
    crtTexture.colorSpace = THREE.SRGBColorSpace;

    // 6. Assembly Groups & Component Mesh Registry
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    // Coordinate conversion from 2D Schematic (x: 40-900, y: 70-530) to 3D Space (centered at 0,0,0)
    const SCALE = 0.058;
    const ORIGIN_X = 490;
    const ORIGIN_Y = 290;

    const to3D = (x, y, w = 0, h = 0) => {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return {
        x: (cx - ORIGIN_X) * SCALE,
        z: (cy - ORIGIN_Y) * SCALE,
        w: Math.max(2.4, w * SCALE),
        d: Math.max(1.8, h * SCALE),
      };
    };

    // 7. Base FR-4 PCB Board Physical Geometry
    const pcbWidth = 56.0;
    const pcbDepth = 33.0;
    const pcbThickness = 0.65;

    const pcbGeo = new THREE.BoxGeometry(pcbWidth, pcbThickness, pcbDepth);
    const pcbTexture = createPcbTexture();
    const pcbMat = new THREE.MeshStandardMaterial({
      map: pcbTexture,
      color: 0x0c2a1c,
      roughness: 0.45,
      metalness: 0.15,
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.set(-1.0, -pcbThickness / 2, 0.5);
    pcbMesh.receiveShadow = true;
    pcbMesh.castShadow = true;
    boardGroup.add(pcbMesh);

    // Gold-Plated 32-Bit PCI Edge Connector Fingers (Bottom Edge)
    const pciGoldGroup = new THREE.Group();
    const numFingers = 32;
    const fingerSpacing = 0.48;
    const pciStartX = -((numFingers * fingerSpacing) / 2) + 2.0;

    for (let i = 0; i < numFingers; i++) {
      // Key notch around pin 12
      if (i >= 11 && i <= 13) continue;

      const fingerGeo = new THREE.BoxGeometry(0.32, pcbThickness + 0.06, 2.6);
      const fingerMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.15,
      });
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.set(pciStartX + i * fingerSpacing, -pcbThickness / 2, (pcbDepth / 2) - 0.4);
      pciGoldGroup.add(finger);
    }
    boardGroup.add(pciGoldGroup);

    // Stamped Stainless Steel Card Bracket (Left Edge)
    const bracketGroup = new THREE.Group();
    const bracketHeight = 28.0;
    const bracketGeo = new THREE.BoxGeometry(0.4, bracketHeight, 3.2);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xd8dde4,
      metalness: 0.9,
      roughness: 0.25,
    });
    const bracketMesh = new THREE.Mesh(bracketGeo, steelMat);
    bracketMesh.position.set(-(pcbWidth / 2) - 1.2, (bracketHeight / 2) - 8.0, 0);
    bracketMesh.castShadow = true;
    bracketGroup.add(bracketMesh);

    // Blue 15-Pin Female VGA D-Sub Connector on Bracket
    const vgaHousingGeo = new THREE.BoxGeometry(1.4, 2.4, 4.0);
    const vgaBlueMat = new THREE.MeshStandardMaterial({ color: 0x0055dd, roughness: 0.3 });
    const vgaMesh = new THREE.Mesh(vgaHousingGeo, vgaBlueMat);
    vgaMesh.position.set(-(pcbWidth / 2) - 1.8, 3.5, -4.5);
    bracketGroup.add(vgaMesh);

    // VGA Steel D-Shell & Hex Standoff Screws
    const dShellGeo = new THREE.BoxGeometry(0.4, 1.8, 3.2);
    const dShell = new THREE.Mesh(dShellGeo, steelMat);
    dShell.position.set(-(pcbWidth / 2) - 2.6, 3.5, -4.5);
    bracketGroup.add(dShell);

    // 3.5mm Audio Jacks (Line Out - Green, Line In - Blue)
    const jackGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.2, 16);
    jackGeo.rotateZ(Math.PI / 2);
    const greenJackMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
    const jack1 = new THREE.Mesh(jackGeo, greenJackMat);
    jack1.position.set(-(pcbWidth / 2) - 2.0, -1.5, -4.5);
    bracketGroup.add(jack1);

    const jack2 = new THREE.Mesh(jackGeo, steelMat);
    jack2.position.set(-(pcbWidth / 2) - 2.0, -4.5, -4.5);
    bracketGroup.add(jack2);

    // Sega Saturn DB-9 Controller Receptacle
    const db9Geo = new THREE.BoxGeometry(1.2, 2.0, 3.4);
    const db9Mat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.5 });
    const db9Mesh = new THREE.Mesh(db9Geo, db9Mat);
    db9Mesh.position.set(-(pcbWidth / 2) - 1.8, 8.5, -4.5);
    bracketGroup.add(db9Mesh);

    boardGroup.add(bracketGroup);

    // 8. Physical 3D Package Constructors for Each Component
    const componentMeshes = new Map();

    const buildPhysicalComponent = (comp) => {
      const compGroup = new THREE.Group();
      const dims = to3D(comp.x, comp.y, comp.w || 100, comp.h || 100);
      compGroup.position.set(dims.x, 0, dims.z);

      const temp = engine.thermalMap.get(comp.id) || 25.0;
      const heatRatio = Math.min(1.0, Math.max(0, (temp - 25.0) / 50.0));
      const heatColor = new THREE.Color().lerpColors(
        new THREE.Color(0x00f0ff),
        new THREE.Color(0xff0044),
        heatRatio
      );

      switch (comp.type) {
        // ===================================================================
        // 1. SGS-Thomson STG-2000X / NVIDIA NV1 GPU (QFP-208 Package)
        // ===================================================================
        case 'NV1_CORE': {
          const chipW = dims.w * 0.95;
          const chipD = dims.d * 0.95;
          const chipH = 1.35;

          // Main Black Epoxy Body with Chamfered Corners
          const bodyGeo = new THREE.BoxGeometry(chipW, chipH, chipD);
          const topTex = createChipTexture('SGS-THOMSON', 'STG-2000X / NV1', '0.5µm 3D ENGINE');
          const bodyMats = [
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.5 }),
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.5 }),
            new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.35, emissive: heatColor, emissiveIntensity: heatRatio * 0.5 }),
            new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.5 }),
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.5 }),
          ];
          const chipBody = new THREE.Mesh(bodyGeo, bodyMats);
          chipBody.position.y = chipH / 2;
          chipBody.castShadow = true;
          compGroup.add(chipBody);

          // Central Copper / Aluminum Heat Spreader Slug
          const slugGeo = new THREE.BoxGeometry(chipW * 0.55, 0.12, chipD * 0.55);
          const slugMat = new THREE.MeshStandardMaterial({
            color: 0xcca666,
            metalness: 0.9,
            roughness: 0.18,
          });
          const slug = new THREE.Mesh(slugGeo, slugMat);
          slug.position.y = chipH + 0.04;
          compGroup.add(slug);

          // Fine Gull-Wing Metallic Leadframe Pins (52 pins on each of the 4 sides)
          const pinMat = new THREE.MeshStandardMaterial({ color: 0xdde4ec, metalness: 0.95, roughness: 0.1 });
          const pinsPerSide = 18; // Stylized density
          const pinWidth = 0.12;

          for (let p = 0; p < pinsPerSide; p++) {
            const offset = (p - pinsPerSide / 2 + 0.5) * (chipW / (pinsPerSide + 2));

            // North and South pins
            const pinGeoNS = new THREE.BoxGeometry(pinWidth, 0.14, 0.7);
            const pinN = new THREE.Mesh(pinGeoNS, pinMat);
            pinN.position.set(offset, 0.15, -chipD / 2 - 0.25);
            compGroup.add(pinN);

            const pinS = new THREE.Mesh(pinGeoNS, pinMat);
            pinS.position.set(offset, 0.15, chipD / 2 + 0.25);
            compGroup.add(pinS);

            // East and West pins
            const pinGeoEW = new THREE.BoxGeometry(0.7, 0.14, pinWidth);
            const pinE = new THREE.Mesh(pinGeoEW, pinMat);
            pinE.position.set(chipW / 2 + 0.25, 0.15, offset);
            compGroup.add(pinE);

            const pinW = new THREE.Mesh(pinGeoEW, pinMat);
            pinW.position.set(-chipW / 2 - 0.25, 0.15, offset);
            compGroup.add(pinW);
          }
          break;
        }

        // ===================================================================
        // 2. Toshiba EDO DRAM (SOJ-40 Package)
        // ===================================================================
        case 'VRAM_BANK': {
          const sojW = dims.w * 0.9;
          const sojD = dims.d * 0.85;
          const sojH = 1.1;

          const topTex = createChipTexture('TOSHIBA', 'TC51V16160FT', '16Mb EDO 60ns');
          const bodyGeo = new THREE.BoxGeometry(sojW, sojH, sojD);
          const bodyMats = [
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
          ];
          const chipBody = new THREE.Mesh(bodyGeo, bodyMats);
          chipBody.position.y = sojH / 2;
          chipBody.castShadow = true;
          compGroup.add(chipBody);

          // J-Lead Pins curving under long edges
          const jPinMat = new THREE.MeshStandardMaterial({ color: 0xc8d2dc, metalness: 0.95, roughness: 0.15 });
          const numPins = 14;
          for (let p = 0; p < numPins; p++) {
            const offset = (p - numPins / 2 + 0.5) * (sojW / (numPins + 1));
            const jPinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
            jPinGeo.rotateX(Math.PI / 4);

            const pinFront = new THREE.Mesh(jPinGeo, jPinMat);
            pinFront.position.set(offset, 0.2, sojD / 2 + 0.1);
            compGroup.add(pinFront);

            const pinBack = new THREE.Mesh(jPinGeo, jPinMat);
            pinBack.position.set(offset, 0.2, -sojD / 2 - 0.1);
            compGroup.add(pinBack);
          }
          break;
        }

        // ===================================================================
        // 3. ATT20C409 TrueColor 135MHz RAMDAC
        // ===================================================================
        case 'RAMDAC': {
          const dacW = dims.w * 0.88;
          const dacD = dims.d * 0.88;
          const dacH = 1.15;

          const topTex = createChipTexture('AT&T / NV1', 'ATT20C409-135', '135MHz TrueColor DAC');
          const bodyGeo = new THREE.BoxGeometry(dacW, dacH, dacD);
          const bodyMats = [
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.3 }),
            new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
          ];
          const chipBody = new THREE.Mesh(bodyGeo, bodyMats);
          chipBody.position.y = dacH / 2;
          chipBody.castShadow = true;
          compGroup.add(chipBody);

          // 4-side leads
          const pinMat = new THREE.MeshStandardMaterial({ color: 0xdde4ec, metalness: 0.95, roughness: 0.1 });
          for (let p = 0; p < 10; p++) {
            const off = (p - 5 + 0.5) * (dacW / 12);
            const pN = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.6), pinMat);
            pN.position.set(off, 0.15, -dacD / 2 - 0.2);
            compGroup.add(pN);

            const pS = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.6), pinMat);
            pS.position.set(off, 0.15, dacD / 2 + 0.2);
            compGroup.add(pS);
          }
          break;
        }

        // ===================================================================
        // 4. STG-2000 32-Voice Wavetable Audio DSP
        // ===================================================================
        case 'AUDIO_DSP': {
          const dspW = dims.w * 0.88;
          const dspD = dims.d * 0.88;
          const dspH = 1.15;

          const topTex = createChipTexture('SGS-THOMSON', 'STG-AUDIO DSP', '32-VOICE SYNTH');
          const bodyGeo = new THREE.BoxGeometry(dspW, dspH, dspD);
          const bodyMats = [
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.3 }),
            new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.6 }),
          ];
          const chipBody = new THREE.Mesh(bodyGeo, bodyMats);
          chipBody.position.y = dspH / 2;
          chipBody.castShadow = true;
          compGroup.add(chipBody);
          break;
        }

        // ===================================================================
        // 5. Metal Can Crystal Oscillators (Y1 14.318MHz, Y2 24.576MHz)
        // ===================================================================
        case 'CLOCK': {
          const canW = 2.4;
          const canH = 1.5;
          const canD = 1.2;

          // Shiny Metallic Nickel Can Capsule
          const canGeo = new THREE.CylinderGeometry(canD / 2, canD / 2, canW, 20);
          canGeo.rotateZ(Math.PI / 2);
          const canMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            metalness: 0.96,
            roughness: 0.08,
          });
          const canMesh = new THREE.Mesh(canGeo, canMat);
          canMesh.position.y = canH / 2 + 0.2;
          canMesh.castShadow = true;
          compGroup.add(canMesh);

          // Insulating Mylar Base Gasket
          const baseGeo = new THREE.BoxGeometry(canW * 0.9, 0.25, canD * 0.9);
          const baseMat = new THREE.MeshStandardMaterial({ color: 0x221a10, roughness: 0.8 });
          const baseMesh = new THREE.Mesh(baseGeo, baseMat);
          baseMesh.position.y = 0.12;
          compGroup.add(baseMesh);
          break;
        }

        // ===================================================================
        // 6. BIOS Flash ROM (DIP-32 with Paper Label Sticker)
        // ===================================================================
        case 'ROM':
        case 'RAM': {
          const dipW = dims.w * 0.9;
          const dipD = dims.d * 0.75;
          const dipH = 1.4;

          const topTex = createChipTexture('NVIDIA NV1', 'BIOS v1.08', '(C)1995 PROM');
          const dipGeo = new THREE.BoxGeometry(dipW, dipH, dipD);
          const dipMats = [
            new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.25 }),
            new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.6 }),
          ];
          const dipBody = new THREE.Mesh(dipGeo, dipMats);
          dipBody.position.y = dipH / 2 + 0.3; // Sits in socket
          dipBody.castShadow = true;
          compGroup.add(dipBody);

          // Socket base
          const sockGeo = new THREE.BoxGeometry(dipW + 0.4, 0.4, dipD + 0.4);
          const sockMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.7 });
          const sockMesh = new THREE.Mesh(sockGeo, sockMat);
          sockMesh.position.y = 0.2;
          compGroup.add(sockMesh);
          break;
        }

        // ===================================================================
        // 7. Virtual CRT Computer Display (Live 3D Renderer Canvas)
        // ===================================================================
        case 'VIRTUAL_SCREEN': {
          const monW = 11.0;
          const monH = 9.5;
          const monD = 8.5;

          // Charcoal CRT Housing
          const monGeo = new THREE.BoxGeometry(monW, monH, monD);
          const monMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.7 });
          const monMesh = new THREE.Mesh(monGeo, monMat);
          monMesh.position.set(0, monH / 2, 0);
          monMesh.castShadow = true;
          compGroup.add(monMesh);

          // Curved Cathode Glass Screen Face
          const screenFaceGeo = new THREE.PlaneGeometry(monW * 0.82, monH * 0.75);
          const screenFaceMat = new THREE.MeshBasicMaterial({
            map: crtTexture,
          });
          const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
          screenFace.position.set(0, monH / 2 + 0.2, -monD / 2 - 0.05);
          screenFace.rotation.y = Math.PI; // Face forward
          compGroup.add(screenFace);
          break;
        }

        // ===================================================================
        // 8. Logic Probe LED (Glowing Dome)
        // ===================================================================
        case 'PROBE': {
          const ledGeo = new THREE.SphereGeometry(0.75, 16, 16);
          const isHigh = comp.inputs.in === 1 || comp.outputs.val === 1;
          const ledMat = new THREE.MeshStandardMaterial({
            color: isHigh ? 0x00f0ff : 0x1e293b,
            emissive: isHigh ? 0x00f0ff : 0x000000,
            emissiveIntensity: isHigh ? 1.8 : 0,
            roughness: 0.15,
          });
          const led = new THREE.Mesh(ledGeo, ledMat);
          led.position.y = 1.2;
          compGroup.add(led);

          // LED Base Ring
          const baseRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.85, 0.85, 0.35, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
          );
          baseRing.position.y = 0.3;
          compGroup.add(baseRing);
          break;
        }

        // ===================================================================
        // 9. Standard Dual-In-Line TTL Logic Gates (DIP-14 Packages)
        // ===================================================================
        default: {
          const dipW = dims.w * 0.85;
          const dipD = dims.d * 0.7;
          const dipH = 1.0;

          const topTex = createChipTexture(comp.label || comp.type, comp.type, 'TI FAST-TTL');
          const bodyGeo = new THREE.BoxGeometry(dipW, dipH, dipD);
          const bodyMats = [
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, emissive: heatColor, emissiveIntensity: heatRatio * 0.4 }),
            new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.8 }),
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.6 }),
          ];
          const chipBody = new THREE.Mesh(bodyGeo, bodyMats);
          chipBody.position.y = dipH / 2 + 0.15;
          chipBody.castShadow = true;
          compGroup.add(chipBody);

          // Silver dual-row pins bent down into holes
          const pinMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e2, metalness: 0.95, roughness: 0.15 });
          const pinCount = 7;
          for (let p = 0; p < pinCount; p++) {
            const off = (p - pinCount / 2 + 0.5) * (dipW / (pinCount + 1));
            const pinG = new THREE.BoxGeometry(0.12, 0.45, 0.25);
            const pinF = new THREE.Mesh(pinG, pinMat);
            pinF.position.set(off, 0.1, dipD / 2 + 0.12);
            compGroup.add(pinF);

            const pinB = new THREE.Mesh(pinG, pinMat);
            pinB.position.set(off, 0.1, -dipD / 2 - 0.12);
            compGroup.add(pinB);
          }
          break;
        }
      }

      // Add SMD Decoupling Bypass Capacitors adjacent to chip
      const capGeo = new THREE.BoxGeometry(0.45, 0.35, 0.75);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x8a6338, roughness: 0.5 }); // 0805 brown ceramic
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.set(dims.w / 2 + 0.5, 0.18, 0);
      compGroup.add(capMesh);

      boardGroup.add(compGroup);
      componentMeshes.set(comp.id, compGroup);
    };

    // 9. Rebuild and Update Board Components
    const updatePhysicsLayout = () => {
      // Clear previous components (except permanent PCB board & bracket)
      for (const [id, grp] of componentMeshes.entries()) {
        boardGroup.remove(grp);
      }
      componentMeshes.clear();

      for (const comp of engine.components.values()) {
        // Skip PCI bus and bracket since they are rendered as part of the structural board
        if (comp.type === 'PCI_BUS' || comp.type === 'VGA_BRACKET') continue;
        buildPhysicalComponent(comp);
      }
    };

    updatePhysicsLayout();
    const unsub = engine.subscribe(() => {
      updatePhysicsLayout();
    });

    // 10. High-Performance 60 FPS Render Loop with CRT 3D Demo Canvas
    let animTime = 0;
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      animTime += 0.03;

      // Update CRT Screen with Live 3D Rotating Quadratic Mesh
      crtCtx.fillStyle = '#060B14';
      crtCtx.fillRect(0, 0, 256, 256);

      // Draw glowing grid & wireframe
      crtCtx.strokeStyle = '#00F0FF';
      crtCtx.lineWidth = 1.5;
      crtCtx.shadowColor = '#00F0FF';
      crtCtx.shadowBlur = 8;

      const cx = 128;
      const cy = 128;
      const radius = 65;

      // 3D Quad mesh rotation
      crtCtx.beginPath();
      for (let u = -3; u <= 3; u++) {
        for (let v = -3; v <= 3; v++) {
          const x0 = (u / 3) * radius;
          const y0 = (v / 3) * radius;
          const z0 = Math.sin(Math.hypot(u, v) - animTime * 2) * 18;

          // Rotate around Y axis
          const rotX = x0 * Math.cos(animTime) - z0 * Math.sin(animTime);
          const rotZ = x0 * Math.sin(animTime) + z0 * Math.cos(animTime);
          const px = cx + rotX;
          const py = cy + y0 * 0.75 + rotZ * 0.35;

          if (u === -3 && v === -3) crtCtx.moveTo(px, py);
          else crtCtx.lineTo(px, py);
        }
      }
      crtCtx.stroke();
      crtCtx.shadowBlur = 0;

      // CRT Scanlines
      crtCtx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      for (let y = 0; y < 256; y += 4) {
        crtCtx.fillRect(0, y, 256, 1.5);
      }

      // Title telemetry on CRT
      crtCtx.fillStyle = '#00F0FF';
      crtCtx.font = 'bold 12px monospace';
      crtCtx.fillText('NV1 3D RASTER // 60 FPS', 16, 26);
      crtCtx.fillStyle = '#8FA3C4';
      crtCtx.font = '10px monospace';
      crtCtx.fillText('QUADRATIC TEXTURE MESH', 16, 42);

      crtTexture.needsUpdate = true;

      // Smooth camera damping
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 11. Window Resize Listener
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
      pcbTexture.dispose();
      crtTexture.dispose();
    };
  }, [engine]);

  // Camera Presets
  const setPresetView = (type) => {
    setCameraView(type);
    if (!controlsRef.current || !cameraRef.current) return;
    const ctrl = controlsRef.current;
    const cam = cameraRef.current;

    switch (type) {
      case 'top':
        cam.position.set(0, 48, 0.1);
        ctrl.target.set(0, 0, 0);
        break;
      case 'bracket':
        cam.position.set(-36, 10, 0);
        ctrl.target.set(-15, 2, 0);
        break;
      case 'chip':
        cam.position.set(-6, 14, 8);
        ctrl.target.set(-6, 1, 0);
        break;
      case 'iso':
      default:
        cam.position.set(22, 28, 38);
        ctrl.target.set(0, 0, 0);
        break;
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full h-full bg-[#06080E] overflow-hidden select-none font-mono">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Camera View Switcher Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-[#080D1A]/90 border border-cyan-500/40 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl text-xs z-20">
        <button
          onClick={() => setPresetView('iso')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'iso'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Izometrický 3D pohled na celou kartu"
        >
          <Camera size={12} />
          <span>IZO 3D</span>
        </button>

        <button
          onClick={() => setPresetView('top')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'top'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Kolmý pohled shora na plošný spoj (PCB)"
        >
          <Eye size={12} />
          <span>SHORA (PCB)</span>
        </button>

        <button
          onClick={() => setPresetView('bracket')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'bracket'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Pohled na ocelový PCI bracket s VGA DB15 konektory"
        >
          <ShieldCheck size={12} />
          <span>VGA BRACKET</span>
        </button>

        <button
          onClick={() => setPresetView('chip')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            cameraView === 'chip'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Detailní makro přiblížení na STG2000X QFP-208 procesor"
        >
          <Cpu size={12} />
          <span>DETAIL ČIPU</span>
        </button>
      </div>

      {/* Floating HUD Telemetry Overlay */}
      <div className="absolute top-4 left-4 bg-[#080D1A]/90 border border-cyan-500/35 p-3.5 rounded-xl text-xs space-y-2 pointer-events-none shadow-[0_10px_35px_rgba(0,240,255,0.15)] backdrop-blur-xl">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>NVIDIA NV1 (1995) // FYZICKÝ 3D PCB MODEL</span>
        </div>
        <div className="text-gray-400 space-y-1 text-[11px]">
          <div>DESKA: Tmavě zelený laminát FR-4 (1.6 mm) s potiskem</div>
          <div>SBĚRNICE: Pozlacené 32-bitové PCI 2.1 konektory (33 MHz)</div>
          <div>POUZDRA: QFP-208 (NV1), SOJ-40 (EDO VRAM), PLCC (DAC), HC-49 (Y1/Y2)</div>
          <div className="text-emerald-400 flex items-center space-x-1.5">
            <Thermometer size={12} />
            <span>TERMOVÍZE: Aktivní měření teploty a vyzařování jader</span>
          </div>
          <div className="text-cyan-300/80 text-[10px]">
            Tip: Tažením myši rotujete, pravým tlačítkem posouváte, kolečkem zoomujete.
          </div>
        </div>
      </div>
    </div>
  );
}
