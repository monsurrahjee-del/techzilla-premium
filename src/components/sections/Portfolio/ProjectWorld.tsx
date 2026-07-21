"use client";

import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/lib/projects";

// ── Road surface Y — matches YUKA path y=20.75 from 3d-city-tour ────────────
const ROAD_Y = 20.75;

// ── 6 project stations distributed around the city road loop ─────────────────
// nx, nz = outward normal the billboard FACE points toward (toward the road/viewer)
// Positions come from the YUKA waypoint network (city at scale 5):
//   Loop: [72,-40] → [72,7.85] → [115,7.85] → [115,-22.5] → [192,-22.5]
//         → [192,-88] → bridge → [-93.5,-88] → [-100,-88] → [-100,112]
//         → [192.5,112] → [192.5,-63.5] → [72,-63.5] → [72,-40]
const STATIONS: { x: number; z: number; nx: number; nz: number }[] = [
  { x:  86, z: -50,  nx: -1, nz:  0 }, // 0 — east of N-S road at x=72  → faces west
  { x: 115, z:  18,  nx:  0, nz: -1 }, // 1 — north of E-W road at z=7.85 → faces south
  { x: 200, z: -55,  nx:  1, nz:  0 }, // 2 — east outer road at x=192    → faces east
  { x:  50, z: -90,  nx:  0, nz:  1 }, // 3 — south E-W road at z=-88     → faces north
  { x:-108, z:  20,  nx: -1, nz:  0 }, // 4 — west road at x=-100         → faces west
  { x:  80, z: 120,  nx:  0, nz: -1 }, // 5 — north E-W road at z=112     → faces south
];

// ── Car colour types ─────────────────────────────────────────────────────────
export type CarColors = {
  body:  string;
  rim:   string;
  glass: string;
  glassOpacity: number;
};

// ── Theme ────────────────────────────────────────────────────────────────────
export type Theme = "dark" | "light";

export type ThemeColors = {
  bg:           string;
  ambientInt:   number;
  ambientCol:   string;
  dirInt:       number;
  dirCol:       string;
  fogCol:       string;
  fogNear:      number;
  fogFar:       number;
};

const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bg:          "#050508",
    ambientInt:  0.35,
    ambientCol:  "#8090c0",
    dirInt:      0.7,
    dirCol:      "#b0b8e0",
    fogCol:      "#050508",
    fogNear:     80,
    fogFar:      380,
  },
  light: {
    bg:          "#87ceeb",
    ambientInt:  2.0,
    ambientCol:  "#ffffff",
    dirInt:      2.5,
    dirCol:      "#fffde7",
    fogCol:      "#87ceeb",
    fogNear:     120,
    fogFar:      600,
  },
} as const;

// ── City + House GLB ─────────────────────────────────────────────────────────
function CityModel() {
  const { scene: cityScene } = useGLTF("/models/city.glb");
  const { scene: houseScene } = useGLTF("/models/house.glb");

  const city  = useMemo(() => cityScene.clone(true),  [cityScene]);
  const house = useMemo(() => houseScene.clone(true), [houseScene]);

  return (
    <>
      {/* City at scale 5 — roads at y≈20.75 as per YUKA path */}
      <primitive
        object={city}
        scale={[5, 5, 5]}
        castShadow
        receiveShadow
      />
      {/* Extra house placed at YUKA reference position (50, hei-1.04, 25) */}
      <primitive
        object={house}
        scale={[5, 5, 5]}
        position={[50, ROAD_Y - 1.04, 25]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        receiveShadow
      />
    </>
  );
}

// ── Billboard 3-D → 2-D position type ────────────────────────────────────────
export type BillboardPos = {
  x: number; y: number; w: number; h: number; visible: boolean;
  corners: [[number,number],[number,number],[number,number],[number,number]] | null;
};

// Pre-allocated vectors — avoid per-frame GC
const _vTL = new THREE.Vector3();
const _vTR = new THREE.Vector3();
const _vBR = new THREE.Vector3();
const _vBL = new THREE.Vector3();

// ── Project station ───────────────────────────────────────────────────────────
function ProjectStation({
  index,
  accent,
  isNear,
  theme,
}: {
  index:  number;
  accent: string;
  isNear: boolean;
  theme:  Theme;
}) {
  const { x, z, nx, nz } = STATIONS[index];

  // Perpendicular axis (horizontal span of billboard)
  const perpX = -nz;
  const perpZ =  nx;

  // Y-rotation so local +Z faces along (nx, nz) — billboard faces road
  const yaw = Math.atan2(nx, nz);

  const glowRef  = useRef<THREE.PointLight>(null!);
  const frameRef = useRef<THREE.Mesh>(null!);
  const tmr      = useRef(0);

  useFrame((_, delta) => {
    tmr.current += delta;
    if (glowRef.current)
      glowRef.current.intensity = (isNear ? 60 : 18) + Math.sin(tmr.current * 1.8) * 6;
    if (frameRef.current)
      (frameRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        (isNear ? 4.0 : 1.2) + Math.sin(tmr.current * 2.5) * 0.6;
  });

  const ry = ROAD_Y;
  const panelY = ry + 5.6;

  // Slight offset in facing direction (so glass is "in front" of the board)
  const glassOffX = nx * 0.06;
  const glassOffZ = nz * 0.06;

  // Station pad glow color changes when near
  const padEmissive = isNear ? 1.0 : 0.15;

  // Pole base: slightly behind the face (inward from road)
  const poleX = x - nx * 0.5;
  const poleZ = z - nz * 0.5;

  // Point light in front, toward road
  const lightX = x + nx * 2;
  const lightZ = z + nz * 2;

  // Connector strip: from road-edge inward ~3 units, perpendicular to facing
  // drawn as a thin glowing line in the accent colour
  const connLen = 4;
  const connX = x - nx * (connLen / 2);
  const connZ = z - nz * (connLen / 2);

  return (
    <group>
      {/* Glowing pad on road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, ry + 0.01, z]}>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={padEmissive}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Accent stripe approaching the station */}
      <group position={[connX, ry + 0.02, connZ]} rotation={[0, yaw, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, connLen]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isNear ? 2.0 : 0.8} />
        </mesh>
      </group>

      {/* Pole */}
      <mesh position={[poleX, ry + 3, poleZ]}>
        <cylinderGeometry args={[0.1, 0.14, 6, 8]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[poleX, ry + 0.12, poleZ]}>
        <cylinderGeometry args={[0.18, 0.22, 0.25, 8]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Billboard back panel */}
      <mesh
        position={[x - nx * 0.09, panelY, z - nz * 0.09]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[6.0, 3.6, 0.18]} />
        <meshStandardMaterial color="#06060e" roughness={0.9} metalness={0.2} />
      </mesh>

      {/* Glowing frame border */}
      <mesh
        ref={frameRef}
        position={[x + glassOffX * 0.5, panelY, z + glassOffZ * 0.5]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[6.1, 3.7, 0.06]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Glass display screen */}
      <mesh
        position={[x + glassOffX, panelY, z + glassOffZ]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[5.6, 3.2, 0.04]} />
        <meshStandardMaterial
          color="#000010"
          emissive="#1a1aff"
          emissiveIntensity={theme === "dark" ? 0.06 : 0.02}
          transparent
          opacity={0.88}
          metalness={0.9}
          roughness={0.05}
        />
      </mesh>

      {/* Station glow light */}
      <pointLight
        ref={glowRef}
        position={[lightX, panelY, lightZ]}
        color={accent}
        intensity={18}
        distance={22}
        decay={2}
      />

      {/* Ground glow beneath station */}
      <pointLight
        position={[x, ry + 1, z]}
        color={accent}
        intensity={isNear ? 30 : 8}
        distance={12}
        decay={2}
      />
    </group>
  );
}

// ── Ferrari car ───────────────────────────────────────────────────────────────
function Car({
  carRef,
  colors,
  theme,
}: {
  carRef:  React.RefObject<THREE.Group>;
  colors:  CarColors;
  theme:   Theme;
}) {
  const frontAxleRef = useRef<THREE.Group>(null!);

  const wheelFLRoot = useRef<THREE.Object3D | null>(null);
  const wheelFRRoot = useRef<THREE.Object3D | null>(null);
  const flInner     = useRef(new THREE.Group());
  const frInner     = useRef(new THREE.Group());
  const wheelRL     = useRef<THREE.Object3D | null>(null);
  const wheelRR     = useRef<THREE.Object3D | null>(null);

  const { scene: gltfScene } = useGLTF("/models/ferrari.glb");
  const carScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

  useEffect(() => {
    const flRoot = carScene.getObjectByName("wheel_fl");
    const frRoot = carScene.getObjectByName("wheel_fr");

    wheelFLRoot.current = flRoot ?? null;
    wheelFRRoot.current = frRoot ?? null;
    wheelRL.current     = carScene.getObjectByName("wheel_rl") ?? null;
    wheelRR.current     = carScene.getObjectByName("wheel_rr") ?? null;

    if (flRoot) {
      const inner = flInner.current;
      while (inner.children.length > 0) inner.remove(inner.children[0]);
      while (flRoot.children.length > 0) inner.add(flRoot.children[0]);
      flRoot.add(inner);
    }
    if (frRoot) {
      const inner = frInner.current;
      while (inner.children.length > 0) inner.remove(inner.children[0]);
      while (frRoot.children.length > 0) inner.add(frRoot.children[0]);
      frRoot.add(inner);
    }

    (carRef as any).__frontAxle = frontAxleRef;
    (carRef as any).__speedRef  = { current: 0 };
  }, [carScene, carRef]);

  useEffect(() => {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.body), metalness: 0.9, roughness: 0.2,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.rim), metalness: 1.0, roughness: 0.15,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.glass), transparent: true,
      opacity: colors.glassOpacity, metalness: 0.9, roughness: 0.05,
    });

    const bodyPart = carScene.getObjectByName("body") as THREE.Mesh | undefined;
    if (bodyPart?.isMesh) bodyPart.material = bodyMat;

    (["rim_fl", "rim_fr", "rim_rr", "rim_rl", "trim"] as const).forEach((name) => {
      const part = carScene.getObjectByName(name) as THREE.Mesh | undefined;
      if (part?.isMesh) part.material = rimMat;
    });

    const glassPart = carScene.getObjectByName("glass") as THREE.Mesh | undefined;
    if (glassPart?.isMesh) glassPart.material = glassMat;
  }, [carScene, colors.body, colors.rim, colors.glass, colors.glassOpacity]);

  const shadowTex = useMemo(
    () => new THREE.TextureLoader().load("/models/ferrari_ao.png"), []
  );

  useFrame((_, delta) => {
    const dt  = Math.min(delta, 0.05);
    const spd = (carRef as any).__speedRef?.current ?? 0;

    const MOV_SCALE  = 0.07;
    const WHEEL_DIAM = 1.32;
    const angDelta   = (spd * dt * MOV_SCALE) * (2 / WHEEL_DIAM);

    flInner.current.rotation.x -= angDelta;
    frInner.current.rotation.x -= angDelta;
    if (wheelRL.current) wheelRL.current.rotation.x -= angDelta;
    if (wheelRR.current) wheelRR.current.rotation.x -= angDelta;

    const steer = frontAxleRef.current?.rotation.y ?? 0;
    if (wheelFLRoot.current) wheelFLRoot.current.rotation.z = steer;
    if (wheelFRRoot.current) wheelFRRoot.current.rotation.z = steer;
  });

  return (
    <group ref={carRef}>
      <group ref={frontAxleRef} />
      <primitive object={carScene} scale={[2.4, 2.4, 2.4]} position={[0, 0.01, 0]} />

      {/* AO contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={2}>
        <planeGeometry args={[6.29, 12.48]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.75} depthWrite={false} color="black" />
      </mesh>

      {/* Headlight beams — dark only */}
      {theme === "dark" && (
        <>
          <pointLight position={[ 0.52, 0.38, -2.0]} color="#fffadc" intensity={120} distance={40} decay={2} />
          <pointLight position={[-0.52, 0.38, -2.0]} color="#fffadc" intensity={120} distance={40} decay={2} />
          <pointLight position={[0,     0.60, -5.0]} color="#ffffff"  intensity={80}  distance={30} decay={2} />
        </>
      )}
    </group>
  );
}

// ── Billboard 3-D → 2-D Projector ────────────────────────────────────────────
function BillboardProjector({
  onProject,
  nearIdx,
}: {
  onProject: (positions: BillboardPos[]) => void;
  nearIdx:   number | null;
}) {
  const { camera, size } = useThree();

  useFrame(() => {
    const hw  = 2.8;
    const top = ROAD_Y + 7.2;
    const bot = ROAD_Y + 4.0;

    const out: BillboardPos[] = STATIONS.map(({ x, z, nx, nz }, i) => {
      if (nearIdx !== i) return { x: 0, y: 0, w: 0, h: 0, visible: false, corners: null };

      // Perpendicular axis (horizontal span of billboard)
      const perpX = -nz;
      const perpZ =  nx;

      // Glass face is offset slightly toward the viewer (in normal direction)
      const gx = x + nx * 0.06;
      const gz = z + nz * 0.06;

      _vTL.set(gx - hw * perpX, top, gz - hw * perpZ); _vTL.project(camera);
      _vTR.set(gx + hw * perpX, top, gz + hw * perpZ); _vTR.project(camera);
      _vBR.set(gx + hw * perpX, bot, gz + hw * perpZ); _vBR.project(camera);
      _vBL.set(gx - hw * perpX, bot, gz - hw * perpZ); _vBL.project(camera);

      if (_vTL.z >= 1 || _vTR.z >= 1 || _vBR.z >= 1 || _vBL.z >= 1)
        return { x: 0, y: 0, w: 0, h: 0, visible: false, corners: null };

      // NDC → pixel
      const ndcToPixel = (v: THREE.Vector3): [number, number] => [
        ( v.x * 0.5 + 0.5) * size.width,
        (-v.y * 0.5 + 0.5) * size.height,
      ];

      const corners: [[number,number],[number,number],[number,number],[number,number]] = [
        ndcToPixel(_vTL),
        ndcToPixel(_vTR),
        ndcToPixel(_vBR),
        ndcToPixel(_vBL),
      ];

      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const w  = Math.max(...xs) - Math.min(...xs);

      const visible =
        w > 20 &&
        cx > -size.width * 0.2 && cx < size.width * 1.2 &&
        cy > -size.height * 0.2 && cy < size.height * 1.2;

      return { x: cx, y: cy, w, h: Math.max(...ys) - Math.min(...ys), visible, corners };
    });

    onProject(out);
  });

  return null;
}

// ── Main scene ────────────────────────────────────────────────────────────────
interface SceneProps {
  onNearProject:  (idx: number | null) => void;
  onBillboardPos: (pos: BillboardPos[]) => void;
  onAtBoundary:   (at: boolean) => void;
  theme:          Theme;
  carColors:      CarColors;
}

const expEaseOut = (k: number) => (k === 1 ? 1 : -Math.pow(2, -10 * k) + 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// City road loop extents (at scale 5, based on YUKA waypoints + margin)
const CITY_MIN_X = -120;
const CITY_MAX_X =  210;
const CITY_MIN_Z = -110;
const CITY_MAX_Z =  130;

function Scene({ onNearProject, onBillboardPos, onAtBoundary, theme, carColors }: SceneProps) {
  const t = THEMES[theme];

  // Start position = YUKA start waypoint [72, hei, -40]
  const carRef       = useRef<THREE.Group>(null!);
  const posRef       = useRef({ x: 72, z: -40 });
  const carOrientRef = useRef(0);
  const speedRef     = useRef(0);
  const wheelOrRef   = useRef(0);
  const keysRef      = useRef({ up: false, down: false, left: false, right: false });
  const camPosRef    = useRef(new THREE.Vector3(72, ROAD_Y + 14, -40 + 20));
  const camLookRef   = useRef(new THREE.Vector3(72, ROAD_Y + 0.5, -40));
  const curProjRef   = useRef<number | null>(null);
  const atBoundRef   = useRef(false);
  const [nearIdx, setNearIdx] = useState<number | null>(null);

  // CarControls.js constants
  const MAX_SPEED   = 200;
  const MAX_SPD_REV = -50;
  const ACCEL       = 80;
  const ACCEL_REV   = 40;
  const DECEL       = 70;
  const BRAKE_POW   = 10;
  const STEER_SPD   = 1.5;
  const MAX_STEER   = 0.6;
  const TURN_RAD    = 22;
  const MOV_SCALE   = 0.07;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["ArrowUp",    "w","W"].includes(e.key)) { keysRef.current.up    = true; e.preventDefault(); }
      if (["ArrowDown",  "s","S"].includes(e.key)) { keysRef.current.down  = true; e.preventDefault(); }
      if (["ArrowLeft",  "a","A"].includes(e.key)) { keysRef.current.left  = true; e.preventDefault(); }
      if (["ArrowRight", "d","D"].includes(e.key)) { keysRef.current.right = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowUp",    "w","W"].includes(e.key)) keysRef.current.up    = false;
      if (["ArrowDown",  "s","S"].includes(e.key)) keysRef.current.down  = false;
      if (["ArrowLeft",  "a","A"].includes(e.key)) keysRef.current.left  = false;
      if (["ArrowRight", "d","D"].includes(e.key)) keysRef.current.right = false;
    };
    // Mobile d-pad fires a custom event from Portfolio.tsx
    const carKey = (e: Event) => {
      const { key, pressed } = (e as CustomEvent<{ key: string; pressed: boolean }>).detail;
      if (key === "up")    keysRef.current.up    = pressed;
      if (key === "down")  keysRef.current.down  = pressed;
      if (key === "left")  keysRef.current.left  = pressed;
      if (key === "right") keysRef.current.right = pressed;
    };
    window.addEventListener("keydown",  down);
    window.addEventListener("keyup",    up);
    window.addEventListener("car-key",  carKey);
    return () => {
      window.removeEventListener("keydown",  down);
      window.removeEventListener("keyup",    up);
      window.removeEventListener("car-key",  carKey);
    };
  }, []);

  useFrame((state, delta) => {
    const dt   = Math.min(delta, 0.05);
    const keys = keysRef.current;

    // ── Speed ──────────────────────────────────────────────────────────────
    if (keys.up) {
      speedRef.current = clamp(speedRef.current + dt * ACCEL, MAX_SPD_REV, MAX_SPEED);
    }
    if (keys.down) {
      if (speedRef.current > 0) {
        speedRef.current = clamp(speedRef.current - dt * DECEL * BRAKE_POW, 0, MAX_SPEED);
      } else {
        speedRef.current = clamp(speedRef.current - dt * ACCEL_REV, MAX_SPD_REV, MAX_SPEED);
      }
    }
    if (!keys.up && !keys.down) {
      if (speedRef.current > 0) {
        const k = expEaseOut(speedRef.current / MAX_SPEED);
        speedRef.current = clamp(speedRef.current - k * dt * DECEL, 0, MAX_SPEED);
      } else {
        const k = expEaseOut(speedRef.current / MAX_SPD_REV);
        speedRef.current = clamp(speedRef.current + k * dt * ACCEL_REV, MAX_SPD_REV, 0);
      }
    }

    // ── Steering ────────────────────────────────────────────────────────────
    if (keys.left)  wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, MAX_STEER);
    if (keys.right) wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, -MAX_STEER, MAX_STEER);
    if (!keys.left && !keys.right) {
      if (wheelOrRef.current > 0) {
        wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, 0, MAX_STEER);
      } else {
        wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, 0);
      }
    }

    // ── Movement ─────────────────────────────────────────────────────────────
    const forwardDelta = -speedRef.current * dt * MOV_SCALE;
    carOrientRef.current -= (forwardDelta * TURN_RAD * 0.02) * wheelOrRef.current;

    posRef.current.x += Math.sin(carOrientRef.current) * forwardDelta;
    posRef.current.z += Math.cos(carOrientRef.current) * forwardDelta;

    // Soft city boundary clamp
    posRef.current.x = clamp(posRef.current.x, CITY_MIN_X, CITY_MAX_X);
    posRef.current.z = clamp(posRef.current.z, CITY_MIN_Z, CITY_MAX_Z);

    // ── Sync car mesh ────────────────────────────────────────────────────────
    if (carRef.current) {
      carRef.current.position.set(posRef.current.x, ROAD_Y, posRef.current.z);
      carRef.current.rotation.y = carOrientRef.current;
      const sr = (carRef as any).__speedRef;
      if (sr) sr.current = speedRef.current;
    }

    // ── Wheel steer visual ───────────────────────────────────────────────────
    const fa = (carRef as any).__frontAxle;
    if (fa?.current) fa.current.rotation.y = wheelOrRef.current;

    // ── Chase camera — follows from behind car ───────────────────────────────
    const camDist   = 18;
    const camHeight = ROAD_Y + 13;
    const camTarget = new THREE.Vector3(
      posRef.current.x + Math.sin(carOrientRef.current) * camDist,
      camHeight,
      posRef.current.z + Math.cos(carOrientRef.current) * camDist,
    );
    const alphaPos  = 1 - Math.exp(-9  * dt);
    const alphaLook = 1 - Math.exp(-11 * dt);
    camPosRef.current.lerp(camTarget, alphaPos);
    state.camera.position.copy(camPosRef.current);

    const lookTarget = new THREE.Vector3(posRef.current.x, ROAD_Y + 0.6, posRef.current.z);
    camLookRef.current.lerp(lookTarget, alphaLook);
    state.camera.lookAt(camLookRef.current);

    // ── Project proximity — 2-D distance in XZ ──────────────────────────────
    let nearest: number | null = null;
    let minDist = Infinity;
    for (let i = 0; i < STATIONS.length; i++) {
      const dx   = posRef.current.x - STATIONS[i].x;
      const dz   = posRef.current.z - STATIONS[i].z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 20 && dist < minDist) { minDist = dist; nearest = i; }
    }
    if (nearest !== curProjRef.current) {
      curProjRef.current = nearest;
      setNearIdx(nearest);
      onNearProject(nearest);
    }

    // ── Boundary (near start position = colour panel) ───────────────────────
    const dx0 = posRef.current.x - 72;
    const dz0 = posRef.current.z - (-40);
    const atBound = Math.sqrt(dx0*dx0 + dz0*dz0) < 10;
    if (atBound !== atBoundRef.current) {
      atBoundRef.current = atBound;
      onAtBoundary(atBound);
    }
  });

  return (
    <>
      <ambientLight intensity={t.ambientInt} color={t.ambientCol} />
      <directionalLight
        position={[-30, 60, 20]}
        intensity={t.dirInt}
        color={t.dirCol}
        castShadow={false}
      />
      {/* Extra fill light for dark theme so the Ferrari looks great */}
      {theme === "dark" && (
        <pointLight position={[72, ROAD_Y + 30, -40]} color="#6080ff" intensity={4} distance={200} decay={1} />
      )}

      <Suspense fallback={null}>
        <CityModel />
      </Suspense>

      {projects.map((p, i) => (
        <ProjectStation
          key={i}
          index={i}
          accent={p.accent}
          isNear={nearIdx === i}
          theme={theme}
        />
      ))}

      <Suspense fallback={null}>
        <Car carRef={carRef} colors={carColors} theme={theme} />
      </Suspense>

      <BillboardProjector onProject={onBillboardPos} nearIdx={nearIdx} />

      <fog attach="fog" args={[t.fogCol, t.fogNear, t.fogFar]} />
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
interface ProjectWorldProps {
  onNearProject:  (idx: number | null) => void;
  onBillboardPos: (pos: BillboardPos[]) => void;
  onAtBoundary:   (at: boolean) => void;
  theme:          Theme;
  carColors:      CarColors;
}

export default function ProjectWorld({
  onNearProject,
  onBillboardPos,
  onAtBoundary,
  theme,
  carColors,
}: ProjectWorldProps) {
  const bg = THEMES[theme].bg;
  return (
    <Canvas
      camera={{
        position: [72, ROAD_Y + 14, -40 + 22],
        fov: 62,
        near: 0.5,
        far: 800,
      }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      dpr={[0.5, 0.9]}
      performance={{ min: 0.3 }}
    >
      <color attach="background" args={[bg]} />
      <Scene
        onNearProject={onNearProject}
        onBillboardPos={onBillboardPos}
        onAtBoundary={onAtBoundary}
        theme={theme}
        carColors={carColors}
      />
    </Canvas>
  );
}

// ── Preload heavy assets ──────────────────────────────────────────────────────
useGLTF.preload("/models/ferrari.glb");
useGLTF.preload("/models/city.glb");
useGLTF.preload("/models/house.glb");
