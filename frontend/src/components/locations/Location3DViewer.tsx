'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Info,
  Car,
  X,
  Layers,
  CheckCircle2,
  Box,
  Eye,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export interface OccupiedSlot3D {
  exemplarId: string;
  gridRow: number;
  gridColumn: number;
  notes: string | null;
  variation: {
    id: string;
    name: string;
    color: string | null;
    releaseYear: number | null;
    photoUrl: string | null;
  };
  casting: {
    id: string;
    name: string;
  };
  brand: {
    id: string;
    name: string;
  };
  condition: {
    code: string;
    name: string;
  };
}

export interface Location3DViewerProps {
  location: {
    id: string;
    name: string;
    locationType: string | null;
    hasGrid: boolean;
    gridRows: number | null;
    gridColumns: number | null;
  };
  occupiedSlots: OccupiedSlot3D[];
  onClose?: () => void;
}

type MaterialTheme = 'ACRYLIC' | 'WOOD' | 'DARK_STEEL' | 'CLEAN_WHITE';
type LightingTheme = 'STUDIO' | 'NIGHT_LED' | 'DAYLIGHT';

// Helper to convert common car color names to Three.js color hex
function mapColorNameToHex(colorName: string | null | undefined): number {
  if (!colorName) return 0xdc2626; // Default sporty red
  const norm = colorName.toLowerCase().trim();

  if (norm.includes('vermelh') || norm.includes('red') || norm.includes('rubi')) return 0xdc2626;
  if (norm.includes('azul') || norm.includes('blue') || norm.includes('celeste')) return 0x2563eb;
  if (norm.includes('preto') || norm.includes('black') || norm.includes('negro')) return 0x18181b;
  if (norm.includes('branco') || norm.includes('white') || norm.includes('perola')) return 0xf4f4f5;
  if (norm.includes('prata') || norm.includes('silver') || norm.includes('cinza') || norm.includes('grey')) return 0x94a3b8;
  if (norm.includes('amarelo') || norm.includes('yellow') || norm.includes('ouro') || norm.includes('gold')) return 0xeab308;
  if (norm.includes('verde') || norm.includes('green') || norm.includes('lima')) return 0x16a34a;
  if (norm.includes('laranja') || norm.includes('orange')) return 0xf97316;
  if (norm.includes('roxo') || norm.includes('purple') || norm.includes('violet')) return 0x9333ea;
  if (norm.includes('rosa') || norm.includes('pink')) return 0xec4899;
  if (norm.includes('marrom') || norm.includes('brown') || norm.includes('bronze')) return 0x78350f;

  return 0x3b82f6; // Fallback vivid blue
}

export default function Location3DViewer({
  location,
  occupiedSlots,
  onClose,
}: Location3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [materialTheme, setMaterialTheme] = useState<MaterialTheme>('ACRYLIC');
  const [lightingTheme, setLightingTheme] = useState<LightingTheme>('STUDIO');
  const [selectedSlot, setSelectedSlot] = useState<{
    row: number;
    col: number;
    slotData?: OccupiedSlot3D;
  } | null>(null);
  const [hoveredSlotInfo, setHoveredSlotInfo] = useState<string | null>(null);

  // Dimensions
  const rows = Math.max(1, location.gridRows || 5);
  const cols = Math.max(1, location.gridColumns || 10);
  const locationType = (location.locationType || 'DISPLAY').toUpperCase();

  // Create fast lookup map for occupied slots
  const occupiedMap = useMemo(() => {
    const map = new Map<string, OccupiedSlot3D>();
    for (const slot of occupiedSlots) {
      map.set(`${slot.gridRow}:${slot.gridColumn}`, slot);
    }
    return map;
  }, [occupiedSlots]);

  // Three.js internal references
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isTransitioningCamera = useRef(false);
  const cameraTargetPos = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b); // Tailwind zinc-950

    // Atmosphere fog
    scene.fog = new THREE.FogExp2(0x09090b, 0.015);

    // 2. Camera Setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Calculate initial camera distance based on grid size
    const nicheW = 4.0;
    const nicheH = 2.2;
    const nicheD = 2.4;
    const totalW = cols * nicheW;
    const totalH = rows * nicheH;
    const maxDim = Math.max(totalW, totalH);

    // Initial camera position according to location type
    if (locationType === 'DRAWER') {
      camera.position.set(0, maxDim * 1.2, maxDim * 1.0);
    } else if (locationType === 'SHELF') {
      camera.position.set(0, totalH * 0.5, maxDim * 1.3);
    } else {
      camera.position.set(0, totalH * 0.1, maxDim * 1.4);
    }

    targetLookAt.current.set(0, 0, 0);
    camera.lookAt(targetLookAt.current);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = maxDim * 3.5;
    controls.minDistance = 3.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go deep under floor
    controls.target.copy(targetLookAt.current);

    // 5. Lights Group
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    lightsGroup.add(ambientLight);

    // Key Directional Light
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    dirLight.position.set(totalW * 0.8, totalH * 1.5, maxDim * 1.2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = maxDim * 4;
    dirLight.shadow.bias = -0.0005;
    const shadowSize = maxDim * 0.8;
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    lightsGroup.add(dirLight);

    // Fill Light (Soft cool light from other side)
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fillLight.position.set(-totalW * 0.8, totalH * 0.8, maxDim * 0.8);
    lightsGroup.add(fillLight);

    // Shelf Top LED strip light
    const shelfSpot = new THREE.SpotLight(0x60a5fa, 2.0, maxDim * 2, Math.PI / 3, 0.4);
    shelfSpot.position.set(0, totalH * 0.9 + 5, 4);
    shelfSpot.target.position.set(0, 0, 0);
    lightsGroup.add(shelfSpot);
    lightsGroup.add(shelfSpot.target);

    // Dynamic Focus Light for selected item
    const focusSpot = new THREE.SpotLight(0xffffff, 0, 15, Math.PI / 6, 0.3);
    focusSpot.position.set(0, 5, 5);
    scene.add(focusSpot);
    scene.add(focusSpot.target);

    // 6. Floor & Studio Room Environment
    const floorGeo = new THREE.PlaneGeometry(maxDim * 6, maxDim * 6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d12,
      roughness: 0.6,
      metalness: 0.3,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -totalH / 2 - 1.2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle grid helper on floor
    const gridHelper = new THREE.GridHelper(maxDim * 4, 40, 0x27272a, 0x18181b);
    gridHelper.position.y = floorMesh.position.y + 0.01;
    scene.add(gridHelper);

    // 7. Theme-based Materials
    const getFurnitureMaterials = () => {
      if (materialTheme === 'ACRYLIC') {
        return {
          frameMat: new THREE.MeshPhysicalMaterial({
            color: 0x09090b,
            metalness: 0.2,
            roughness: 0.1,
            transmission: 0.6,
            thickness: 0.8,
            transparent: true,
            opacity: 0.85,
          }),
          dividerMat: new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.85,
            thickness: 0.4,
            transparent: true,
            opacity: 0.5,
          }),
          backMat: new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.3,
            metalness: 0.5,
          }),
          pedestalMat: new THREE.MeshStandardMaterial({
            color: 0x27272a,
            roughness: 0.4,
            metalness: 0.4,
          }),
        };
      }
      if (materialTheme === 'WOOD') {
        return {
          frameMat: new THREE.MeshStandardMaterial({
            color: 0x3e2723, // Deep rich walnut
            roughness: 0.65,
            metalness: 0.1,
          }),
          dividerMat: new THREE.MeshStandardMaterial({
            color: 0x5d4037,
            roughness: 0.7,
            metalness: 0.05,
          }),
          backMat: new THREE.MeshStandardMaterial({
            color: 0x271914,
            roughness: 0.8,
            metalness: 0.05,
          }),
          pedestalMat: new THREE.MeshStandardMaterial({
            color: 0x4e342e,
            roughness: 0.5,
            metalness: 0.1,
          }),
        };
      }
      if (materialTheme === 'DARK_STEEL') {
        return {
          frameMat: new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3,
            metalness: 0.85,
          }),
          dividerMat: new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.4,
            metalness: 0.8,
          }),
          backMat: new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.4,
            metalness: 0.6,
          }),
          pedestalMat: new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3,
            metalness: 0.7,
          }),
        };
      }
      // CLEAN_WHITE
      return {
        frameMat: new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.3,
          metalness: 0.1,
        }),
        dividerMat: new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.4,
          metalness: 0.1,
        }),
        backMat: new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.2,
          metalness: 0.1,
        }),
        pedestalMat: new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          roughness: 0.3,
          metalness: 0.2,
        }),
      };
    };

    const mats = getFurnitureMaterials();

    // 8. Build the 3D Furniture Group
    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);

    // Interactive clickable meshes registry
    const clickableObjects: Array<{
      mesh: THREE.Object3D;
      row: number;
      col: number;
      slotData?: OccupiedSlot3D;
      pedestal: THREE.Mesh;
      originalY: number;
    }> = [];

    // Outer Cabinet / Frame
    const wallThick = 0.15;
    const halfW = totalW / 2;
    const halfH = totalH / 2;

    // Outer Back Panel
    const backGeo = new THREE.BoxGeometry(totalW + wallThick * 2, totalH + wallThick * 2, wallThick);
    const backMesh = new THREE.Mesh(backGeo, mats.backMat);
    backMesh.position.set(0, 0, -nicheD / 2 - wallThick / 2);
    backMesh.receiveShadow = true;
    furnitureGroup.add(backMesh);

    // Outer Frame Top & Bottom
    const topBottomGeo = new THREE.BoxGeometry(totalW + wallThick * 2, wallThick, nicheD);
    const topMesh = new THREE.Mesh(topBottomGeo, mats.frameMat);
    topMesh.position.set(0, halfH + wallThick / 2, 0);
    topMesh.castShadow = true;
    furnitureGroup.add(topMesh);

    const bottomMesh = new THREE.Mesh(topBottomGeo, mats.frameMat);
    bottomMesh.position.set(0, -halfH - wallThick / 2, 0);
    bottomMesh.castShadow = true;
    bottomMesh.receiveShadow = true;
    furnitureGroup.add(bottomMesh);

    // Outer Frame Sides
    const sideGeo = new THREE.BoxGeometry(wallThick, totalH, nicheD);
    const leftMesh = new THREE.Mesh(sideGeo, mats.frameMat);
    leftMesh.position.set(-halfW - wallThick / 2, 0, 0);
    leftMesh.castShadow = true;
    furnitureGroup.add(leftMesh);

    const rightMesh = new THREE.Mesh(sideGeo, mats.frameMat);
    rightMesh.position.set(halfW + wallThick / 2, 0, 0);
    rightMesh.castShadow = true;
    furnitureGroup.add(rightMesh);

    // Internal Shelves (Horizontal dividers)
    const shelfGeo = new THREE.BoxGeometry(totalW, 0.08, nicheD);
    for (let r = 1; r < rows; r++) {
      const shelfMesh = new THREE.Mesh(shelfGeo, mats.dividerMat);
      const y = halfH - r * nicheH;
      shelfMesh.position.set(0, y, 0);
      shelfMesh.receiveShadow = true;
      furnitureGroup.add(shelfMesh);
    }

    // Internal Vertical Dividers (Only if DISPLAY or DRAWER)
    if (locationType !== 'SHELF') {
      const dividerGeo = new THREE.BoxGeometry(0.08, totalH, nicheD);
      for (let c = 1; c < cols; c++) {
        const divMesh = new THREE.Mesh(dividerGeo, mats.dividerMat);
        const x = -halfW + c * nicheW;
        divMesh.position.set(x, 0, 0);
        divMesh.receiveShadow = true;
        furnitureGroup.add(divMesh);
      }
    }

    // Shared Reusable Geometries for Car Body
    const chassisGeo = new THREE.BoxGeometry(1.4, 0.45, 2.7);
    const cabinGeo = new THREE.BoxGeometry(1.15, 0.35, 1.4);
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.5,
      transmission: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
      roughness: 0.1,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xdc2626,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });

    // 9. Populate Niches / Slots
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const slotKey = `${r}:${c}`;
        const slotData = occupiedMap.get(slotKey);

        // Center position of this niche
        const posX = -halfW + (c - 0.5) * nicheW;
        const posY = halfH - (r - 0.5) * nicheH;
        const posZ = 0;

        const slotGroup = new THREE.Group();
        slotGroup.position.set(posX, posY, posZ);
        furnitureGroup.add(slotGroup);

        // Pedestal / Base stand
        const pedW = nicheW * 0.82;
        const pedD = nicheD * 0.75;
        const pedH = 0.12;
        const pedestalGeo = new THREE.BoxGeometry(pedW, pedH, pedD);
        const pedestalMesh = new THREE.Mesh(pedestalGeo, mats.pedestalMat.clone());
        pedestalMesh.position.set(0, -nicheH / 2 + pedH / 2 + 0.05, 0);
        pedestalMesh.receiveShadow = true;
        slotGroup.add(pedestalMesh);

        if (slotData) {
          // --- OCCUPIED SLOT: Create Styled Diecast Car ---
          const carGroup = new THREE.Group();
          carGroup.position.set(0, pedestalMesh.position.y + pedH / 2 + 0.24, 0);

          // Angle the car slightly towards viewer for realistic showroom look (25 degrees)
          carGroup.rotation.y = 0.45;

          const carColor = mapColorNameToHex(slotData.variation.color);
          const carBodyMat = new THREE.MeshPhysicalMaterial({
            color: carColor,
            roughness: 0.18,
            metalness: 0.55,
            clearcoat: 0.9,
            clearcoatRoughness: 0.1,
          });

          // 1. Lower Chassis
          const chassisMesh = new THREE.Mesh(chassisGeo, carBodyMat);
          chassisMesh.castShadow = true;
          chassisMesh.receiveShadow = true;
          carGroup.add(chassisMesh);

          // 2. Cabin / Greenhouse
          const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
          cabinMesh.position.set(0, 0.35, -0.15);
          cabinMesh.castShadow = true;
          carGroup.add(cabinMesh);

          // 3. Cabin Roof Top
          const roofGeo = new THREE.BoxGeometry(1.05, 0.06, 1.15);
          const roofMesh = new THREE.Mesh(roofGeo, carBodyMat);
          roofMesh.position.set(0, 0.54, -0.18);
          carGroup.add(roofMesh);

          // 4. Headlights
          const lightGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
          const leftLight = new THREE.Mesh(lightGeo, headlightMat);
          leftLight.position.set(-0.45, 0.05, 1.36);
          carGroup.add(leftLight);

          const rightLight = new THREE.Mesh(lightGeo, headlightMat);
          rightLight.position.set(0.45, 0.05, 1.36);
          carGroup.add(rightLight);

          // 5. Taillights
          const tailGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);
          const leftTail = new THREE.Mesh(tailGeo, taillightMat);
          leftTail.position.set(-0.45, 0.08, -1.36);
          carGroup.add(leftTail);

          const rightTail = new THREE.Mesh(tailGeo, taillightMat);
          rightTail.position.set(0.45, 0.08, -1.36);
          carGroup.add(rightTail);

          // 6. 4 Wheels (with rims)
          const wheelOffsets = [
            { x: -0.72, z: 0.8 },
            { x: 0.72, z: 0.8 },
            { x: -0.72, z: -0.8 },
            { x: 0.72, z: -0.8 },
          ];

          for (const wo of wheelOffsets) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(wo.x, -0.08, wo.z);
            wheel.castShadow = true;
            carGroup.add(wheel);

            const rimGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.17, 12);
            rimGeo.rotateZ(Math.PI / 2);
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.position.copy(wheel.position);
            carGroup.add(rim);
          }

          slotGroup.add(carGroup);

          // Register interactive hitbox
          clickableObjects.push({
            mesh: chassisMesh,
            row: r,
            col: c,
            slotData,
            pedestal: pedestalMesh,
            originalY: pedestalMesh.position.y,
          });
        } else {
          // --- EMPTY SLOT: Sleek translucent placeholder ---
          const emptySlotBorderGeo = new THREE.EdgesGeometry(pedestalGeo);
          const emptySlotBorder = new THREE.LineSegments(
            emptySlotBorderGeo,
            new THREE.LineBasicMaterial({ color: 0x3f3f46, transparent: true, opacity: 0.4 })
          );
          emptySlotBorder.position.copy(pedestalMesh.position);
          slotGroup.add(emptySlotBorder);

          // Make the empty pedestal clickable too
          clickableObjects.push({
            mesh: pedestalMesh,
            row: r,
            col: c,
            slotData: undefined,
            pedestal: pedestalMesh,
            originalY: pedestalMesh.position.y,
          });
        }
      }
    }

    // 10. Raycasting & Hover / Click Interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = clickableObjects.map((co) => co.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest, false);

      if (intersects.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        const hit = intersects[0]!.object;
        const targetObj = clickableObjects.find((co) => co.mesh === hit);
        if (targetObj) {
          if (targetObj.slotData) {
            setHoveredSlotInfo(
              `${targetObj.slotData.variation.name} (${targetObj.slotData.brand.name}) • L${targetObj.row} C${targetObj.col}`
            );
          } else {
            setHoveredSlotInfo(`Nicho Vazio • Linha ${targetObj.row}, Coluna ${targetObj.col}`);
          }
        }
      } else {
        renderer.domElement.style.cursor = 'default';
        setHoveredSlotInfo(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = clickableObjects.map((co) => co.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest, false);

      if (intersects.length > 0) {
        const hit = intersects[0]!.object;
        const targetObj = clickableObjects.find((co) => co.mesh === hit);

        if (targetObj) {
          setSelectedSlot({
            row: targetObj.row,
            col: targetObj.col,
            slotData: targetObj.slotData,
          });

          // World position of hit
          const worldPos = new THREE.Vector3();
          targetObj.mesh.getWorldPosition(worldPos);

          // Focus camera towards this slot
          isTransitioningCamera.current = true;
          targetLookAt.current.copy(worldPos);
          cameraTargetPos.current = new THREE.Vector3(
            worldPos.x + 1.2,
            worldPos.y + 0.8,
            worldPos.z + 5.5
          );

          // Move spotlight to item
          focusSpot.position.set(worldPos.x, worldPos.y + 3, worldPos.z + 2.5);
          focusSpot.target.position.copy(worldPos);
          focusSpot.intensity = 3.5;
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    // 11. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 12. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Handle Smooth Camera Lerp on click
      if (isTransitioningCamera.current && cameraTargetPos.current) {
        camera.position.lerp(cameraTargetPos.current, 0.08);
        controls.target.lerp(targetLookAt.current, 0.08);

        if (camera.position.distanceTo(cameraTargetPos.current) < 0.05) {
          isTransitioningCamera.current = false;
        }
      }

      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1.2;
      controls.update();

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount or theme change
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);

      // Dispose Geometries and Materials
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [rows, cols, occupiedMap, materialTheme, lightingTheme, autoRotate, locationType]);

  // Handler to Reset Camera View
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const nicheW = 4.0;
    const nicheH = 2.2;
    const totalW = cols * nicheW;
    const totalH = rows * nicheH;
    const maxDim = Math.max(totalW, totalH);

    isTransitioningCamera.current = true;
    targetLookAt.current.set(0, 0, 0);

    if (locationType === 'DRAWER') {
      cameraTargetPos.current = new THREE.Vector3(0, maxDim * 1.2, maxDim * 1.0);
    } else {
      cameraTargetPos.current = new THREE.Vector3(0, totalH * 0.1, maxDim * 1.4);
    }

    setSelectedSlot(null);
  };

  const totalSlotsCount = rows * cols;
  const occupiedCount = occupiedSlots.length;
  const occupancyPercent = totalSlotsCount > 0 ? Math.round((occupiedCount / totalSlotsCount) * 100) : 0;

  return (
    <div
      className={`relative flex flex-col bg-zinc-950 text-foreground overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-[650px] rounded-2xl border border-border shadow-2xl'
      }`}
    >
      {/* --- Top Control HUD Bar --- */}
      <div className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-b from-zinc-950/95 via-zinc-950/70 to-transparent backdrop-blur-md pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-glow">
            <Box className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white tracking-wide">{location.name}</h2>
              <span className="text-[10px] uppercase font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {locationType} 3D
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span>
                {rows}L × {cols}C ({totalSlotsCount} nichos)
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                {occupiedCount} ocupados ({occupancyPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Material Theme selector */}
          <div className="flex items-center rounded-xl bg-zinc-900/90 border border-zinc-800 p-1 text-[11px] font-semibold">
            <button
              onClick={() => setMaterialTheme('ACRYLIC')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                materialTheme === 'ACRYLIC' ? 'bg-primary text-primary-foreground shadow' : 'text-zinc-400 hover:text-white'
              }`}
              title="Acrílico Cristal Translúcido"
            >
              Acrílico
            </button>
            <button
              onClick={() => setMaterialTheme('WOOD')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                materialTheme === 'WOOD' ? 'bg-amber-700 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
              title="Madeira Nobre Escura"
            >
              Madeira
            </button>
            <button
              onClick={() => setMaterialTheme('DARK_STEEL')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                materialTheme === 'DARK_STEEL' ? 'bg-slate-700 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
              title="Aço Industrial Fosco"
            >
              Aço
            </button>
          </div>

          {/* Auto-Rotate Turntable Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoRotate
                ? 'bg-primary/20 border-primary text-primary shadow-glow'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title="Girar 360° Automaticamente"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Giro 360°</span>
          </button>

          {/* Reset Camera button */}
          <button
            onClick={handleResetCamera}
            className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Centralizar Visão da Câmera"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Centralizar</span>
          </button>

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Modo Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close button (if provided) */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-red-500/50 text-zinc-400 hover:text-red-400 transition-colors"
              title="Fechar Visualizador 3D"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* --- Main Three.js Canvas Container --- */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* --- Hover Tooltip HUD --- */}
      {hoveredSlotInfo && !selectedSlot && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-white text-xs font-semibold backdrop-blur-md shadow-2xl flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Car className="h-3.5 w-3.5 text-primary" />
          <span>{hoveredSlotInfo}</span>
          <span className="text-[10px] text-zinc-400 pl-1">• Clique para inspecionar</span>
        </div>
      )}

      {/* --- Bottom Instructions Overlay --- */}
      <div className="absolute bottom-3 left-4 z-10 hidden sm:flex items-center gap-3 text-[11px] text-zinc-400 pointer-events-none">
        <span className="flex items-center gap-1">
          <span className="font-bold text-zinc-200">Arrastar:</span> Rotacionar 360°
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="font-bold text-zinc-200">Scroll:</span> Zoom
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="font-bold text-zinc-200">Clique:</span> Focar no Carrinho
        </span>
      </div>

      {/* --- Floating Inspector Card (When an item/slot is clicked) --- */}
      {selectedSlot && (
        <div className="absolute right-4 bottom-4 top-20 sm:top-auto sm:bottom-6 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-zinc-900/95 border border-zinc-700/90 shadow-2xl backdrop-blur-xl p-4 flex flex-col justify-between animate-in slide-in-from-right-4 duration-200">
          <div>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  Nicho L{selectedSlot.row} • C{selectedSlot.col}
                </span>
                {selectedSlot.slotData ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Ocupado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                    Disponível
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedSlot.slotData ? (
              <div className="space-y-3 pt-3">
                {/* Car Photo Preview */}
                <div className="relative h-36 w-full rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center overflow-hidden">
                  {selectedSlot.slotData.variation.photoUrl ? (
                    <img
                      src={selectedSlot.slotData.variation.photoUrl}
                      alt={selectedSlot.slotData.variation.name}
                      className="h-full w-full object-contain p-2 hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <Car className="h-10 w-10 mb-1 opacity-50" />
                      <span className="text-[11px]">Sem foto cadastrada</span>
                    </div>
                  )}
                </div>

                {/* Info Details */}
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-2">
                    {selectedSlot.slotData.variation.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                    {selectedSlot.slotData.brand.name} • {selectedSlot.slotData.casting.name}
                  </p>
                </div>

                {/* Specs Chips */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Cor da Peça</span>
                    <span className="font-semibold text-white">
                      {selectedSlot.slotData.variation.color || 'Não informada'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">Ano Lançamento</span>
                    <span className="font-semibold text-white">
                      {selectedSlot.slotData.variation.releaseYear || 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-800 col-span-2">
                    <span className="text-zinc-400 block text-[10px]">Estado de Conservação</span>
                    <span className="font-semibold text-emerald-400">
                      {selectedSlot.slotData.condition.name}
                    </span>
                  </div>
                </div>

                {selectedSlot.slotData.notes && (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-800/40 p-2 rounded-lg border border-zinc-800/80">
                    "{selectedSlot.slotData.notes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Box className="h-10 w-10 text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-white">Nicho Vago</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Este espaço no expositor está livre. Você pode vincular qualquer miniatura da sua garagem a esta posição (Linha {selectedSlot.row}, Coluna {selectedSlot.col}).
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-3 border-t border-zinc-800 mt-2 flex gap-2">
            <button
              onClick={handleResetCamera}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            >
              Visão Geral
            </button>
            {selectedSlot.slotData && (
              <Link
                href="/garage"
                className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1.5 shadow-glow transition-all"
              >
                <span>Ver Garagem</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
