"use client";

import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/lib/projects";

// ── Road surface Y (matches YUKA path y=20.75) ───────────────────────────────
const ROAD_Y = 20.75;

// ── Project stations: ground circle positions near representative buildings ──
// Placed ON the road, beside the building type that represents each project.
// Project order: Party Place, Maser Travels, Loan Mgmt, YCT Micro, Malete Hostels, Zennyola Foods
const STATIONS: { x: number; z: number; icon: string }[] = [
  { x:  75, z: -20, icon: "🎪" }, // 0 Party Place — event venue (central road)
  { x: 120, z: -10, icon: "✈️" }, // 1 Maser Travels — travel building (NE road)
  { x: 188, z: -40, icon: "🏦" }, // 2 Loan Mgmt — bank (east outer road)
  { x:  25, z: -85, icon: "💳" }, // 3 YCT Microfinance — finance (south road)
  { x: -92, z:  30, icon: "🏨" }, // 4 Malete Hostels — hostel (west road)
  { x:  92, z: 108, icon: "🍽️" }, // 5 Zennyola Foods — restaurant (north road)
];

// ── Approximate building block zones — car cannot cut through these ──────────
// These are the interior city-block areas between the YUKA road loop segments.
// [minX, minZ, maxX, maxZ]
const BUILDING_BOXES: [number, number, number, number][] = [
  [84,  -54, 110,  -4],  // Central block (between x=72 and x=115 roads)
  [120, -54, 182, -30],  // East inner block (between z=-22.5 and z=-63.5 roads)
  [-88, -80,  62, 102],  // Large west-centre interior block
  [120, -80, 182, -66],  // South-east small block
];
const BOX_MARGIN = 3; // car clearance buffer in world units

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
  bg:        string;
  ambientInt: number;
  ambientCol: string;
  dirInt:    number;
  dirCol:    string;
  fogCol:    string;
  fogNear:   number;
  fogFar:    number;
};

const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bg:          "#050508",
    ambientInt:  0.4,
    ambientCol:  "#8090c0",
    dirInt:      0.8,
    dirCol:      "#b0b8e0",
    fogCol:      "#050508",
    fogNear:     100,
    fogFar:      420,
  },
  light: {
    bg:          "#87ceeb",
    ambientInt:  2.0,
    ambientCol:  "#ffffff",
    dirInt:      2.5,
    dirCol:      "#fffde7",
    fogCol:      "#87ceeb",
    fogNear:     140,
    fogFar:      620,
  },
} as const;

// ── City + House GLB ─────────────────────────────────────────────────────────
function CityModel() {
  const { scene: cityScene  } = useGLTF("/models/city.glb");
  const { scene: houseScene } = useGLTF("/models/house.glb");

  const city  = useMemo(() => cityScene.clone(true),  [cityScene]);
  const house = useMemo(() => houseScene.clone(true), [houseScene]);

  // Disable shadows on every mesh — huge perf win for a 97 MB model
  useMemo(() => {
    city.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow    = false;
        obj.receiveShadow = false;
      }
    });
  }, [city]);

  return (
    <>
      <primitive object={city}  scale={[5, 5, 5]} />
      <primitive
        object={house}
        scale={[5, 5, 5]}
        position={[50, ROAD_Y - 1.04, 25]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </>
  );
}

// ── Ground circle — replaces the billboard, marks the project location ────────
function GroundCircle({
  index,
  accent,
  isNear,
}: {
  index:  number;
  accent: string;
  isNear: boolean;
}) {
  const { x, z, icon } = STATIONS[index];
  const project  = projects[index];
  const ringRef  = useRef<THREE.Mesh>(null!);
  const tmr      = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    tmr.current += delta * 1.6;
    if (!ringRef.current) return;
    const s = 1 + Math.sin(tmr.current) * 0.12;
    ringRef.current.scale.setScalar(s);
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = (isNear ? 0.85 : 0.40) + Math.sin(tmr.current) * 0.12;
  });

  return (
    <group>
      {/* Filled circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, ROAD_Y + 0.01, z]}>
        <circleGeometry args={[4.5, 40]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={isNear ? 0.50 : 0.18}
          depthWrite={false}
        />
      </mesh>

      {/* Pulsing outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, ROAD_Y + 0.02, z]}>
        <ringGeometry args={[4.7, 5.8, 40]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Floating name label (always faces camera via Html) */}
      <Html
        position={[x, ROAD_Y + 8, z]}
        center
        distanceFactor={55}
        style={{ pointerEvents: "none" }}
        zIndexRange={[0, 10]}
      >
        <div
          style={{
            background: isNear
              ? `${accent}dd`
              : `${accent}55`,
            border:     `1.5px solid ${accent}`,
            borderRadius: "8px",
            padding:    "5px 12px",
            color:      "#fff",
            fontSize:   "12px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            letterSpacing: "0.02em",
            transition: "background 0.3s, transform 0.3s",
            transform:  isNear ? "scale(1.12)" : "scale(1)",
          }}
        >
          {icon} {project.title}
        </div>
      </Html>

      {/* Glow light — only active when car is near (saves GPU) */}
      {isNear && (
        <pointLight
          position={[x, ROAD_Y + 4, z]}
          color={accent}
          intensity={40}
          distance={28}
          decay={2}
        />
      )}
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
  const wheelFLRoot  = useRef<THREE.Object3D | null>(null);
  const wheelFRRoot  = useRef<THREE.Object3D | null>(null);
  const flInner      = useRef(new THREE.Group());
  const frInner      = useRef(new THREE.Group());
  const wheelRL      = useRef<THREE.Object3D | null>(null);
  const wheelRR      = useRef<THREE.Object3D | null>(null);

  const { scene: gltfScene } = useGLTF("/models/ferrari.glb");
  const carScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

  // Wire up wheel references
  useEffect(() => {
    const flRoot = carScene.getObjectByName("wheel_fl");
    const frRoot = carScene.getObjectByName("wheel_fr");
    wheelFLRoot.current = flRoot ?? null;
    wheelFRRoot.current = frRoot ?? null;
    wheelRL.current     = carScene.getObjectByName("wheel_rl") ?? null;
    wheelRR.current     = carScene.getObjectByName("wheel_rr") ?? null;

    if (flRoot) {
      const inner = flInner.current;
      while (inner.children.length) inner.remove(inner.children[0]);
      while (flRoot.children.length) inner.add(flRoot.children[0]);
      flRoot.add(inner);
    }
    if (frRoot) {
      const inner = frInner.current;
      while (inner.children.length) inner.remove(inner.children[0]);
      while (frRoot.children.length) inner.add(frRoot.children[0]);
      frRoot.add(inner);
    }

    (carRef as any).__frontAxle = frontAxleRef;
    (carRef as any).__speedRef  = { current: 0 };
  }, [carScene, carRef]);

  // Apply car colours
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

    const bodyPart  = carScene.getObjectByName("body")  as THREE.Mesh | undefined;
    const glassPart = carScene.getObjectByName("glass") as THREE.Mesh | undefined;
    if (bodyPart?.isMesh)  bodyPart.material  = bodyMat;
    if (glassPart?.isMesh) glassPart.material = glassMat;

    (["rim_fl","rim_fr","rim_rr","rim_rl","trim"] as const).forEach((name) => {
      const part = carScene.getObjectByName(name) as THREE.Mesh | undefined;
      if (part?.isMesh) part.material = rimMat;
    });
  }, [carScene, colors.body, colors.rim, colors.glass, colors.glassOpacity]);

  const shadowTex = useMemo(
    () => new THREE.TextureLoader().load("/models/ferrari_ao.png"), []
  );

  // Wheel spin + steer animation
  useFrame((_, delta) => {
    const dt  = Math.min(delta, 0.05);
    const spd = (carRef as any).__speedRef?.current ?? 0;
    const WHEEL_DIAM = 0.66; // matched to scale 1.2
    const angDelta   = (spd * dt * 0.12) * (2 / WHEEL_DIAM);

    flInner.current.rotation.x -= angDelta;
    frInner.current.rotation.x -= angDelta;
    if (wheelRL.current) wheelRL.current.rotation.x -= angDelta;
    if (wheelRR.current) wheelRR.current.rotation.x -= angDelta;

    const steer = frontAxleRef.current?.rotation.y ?? 0;
    if (wheelFLRoot.current) wheelFLRoot.current.rotation.z = steer;
    if (wheelFRRoot.current) wheelFRRoot.current.rotation.z = steer;
  });

  // Car scale 1.2 — noticeably smaller in the big city, still easily visible
  // AO shadow plane scales with car (original 6.29×12.48 at scale 2.4 → 3.15×6.24 at scale 1.2)
  return (
    <group ref={carRef}>
      <group ref={frontAxleRef} />
      <primitive object={carScene} scale={[1.2, 1.2, 1.2]} position={[0, 0.01, 0]} />

      {/* AO contact shadow (scaled to match 1.2) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={2}>
        <planeGeometry args={[3.15, 6.24]} />
        <meshBasicMaterial
          map={shadowTex}
          transparent
          opacity={0.75}
          depthWrite={false}
          color="black"
        />
      </mesh>

      {/* Headlight beams — dark theme only */}
      {theme === "dark" && (
        <>
          <pointLight position={[ 0.26, 0.20, -1.0]} color="#fffadc" intensity={60} distance={25} decay={2} />
          <pointLight position={[-0.26, 0.20, -1.0]} color="#fffadc" intensity={60} distance={25} decay={2} />
          <pointLight position={[ 0,    0.30, -2.8]} color="#ffffff"  intensity={40} distance={18} decay={2} />
        </>
      )}
    </group>
  );
}

// ── Pre-allocated vectors — avoid per-frame heap allocations ─────────────────
const _camTarget  = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

// ── Main scene ────────────────────────────────────────────────────────────────
interface SceneProps {
  onNearProject: (idx: number | null) => void;
  onAtBoundary:  (at: boolean) => void;
  theme:         Theme;
  carColors:     CarColors;
}

const expEaseOut = (k: number) => (k === 1 ? 1 : -Math.pow(2, -10 * k) + 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const CITY_MIN_X = -120;
const CITY_MAX_X =  210;
const CITY_MIN_Z = -110;
const CITY_MAX_Z =  130;

// ── Car physics constants ─────────────────────────────────────────────────────
const MAX_SPEED   = 280;   // units/s at full throttle (snappier across the big city)
const MAX_SPD_REV = -70;
const ACCEL       = 140;   // fast acceleration for responsive feel
const ACCEL_REV   = 50;
const DECEL       = 90;
const BRAKE_POW   = 8;
const STEER_SPD   = 1.8;
const MAX_STEER   = 0.55;
const TURN_RAD    = 20;
const MOV_SCALE   = 0.12;  // world-units-per-speed-unit — tuned for city scale

function Scene({ onNearProject, onAtBoundary, theme, carColors }: SceneProps) {
  const t = THEMES[theme];

  const carRef       = useRef<THREE.Group>(null!);
  const posRef       = useRef({ x: 72, z: -40 });  // YUKA start waypoint
  const carOrientRef = useRef(0);
  const speedRef     = useRef(0);
  const wheelOrRef   = useRef(0);
  const keysRef      = useRef({ up: false, down: false, left: false, right: false });
  const camPosRef    = useRef(new THREE.Vector3(72, ROAD_Y + 8, -40 + 16));
  const camLookRef   = useRef(new THREE.Vector3(72, ROAD_Y + 0.4, -40));
  const curProjRef   = useRef<number | null>(null);
  const atBoundRef   = useRef(false);
  const [nearIdx, setNearIdx] = useState<number | null>(null);

  // Keyboard + mobile d-pad event listeners
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

    // ── Speed ─────────────────────────────────────────────────────────────────
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

    // ── Steering ──────────────────────────────────────────────────────────────
    if (keys.left)  wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, MAX_STEER);
    if (keys.right) wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, -MAX_STEER, MAX_STEER);
    if (!keys.left && !keys.right) {
      if (wheelOrRef.current > 0) {
        wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, 0, MAX_STEER);
      } else {
        wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, 0);
      }
    }

    // ── Movement ──────────────────────────────────────────────────────────────
    const forwardDelta = -speedRef.current * dt * MOV_SCALE;
    carOrientRef.current -= (forwardDelta * TURN_RAD * 0.02) * wheelOrRef.current;

    const newX = posRef.current.x + Math.sin(carOrientRef.current) * forwardDelta;
    const newZ = posRef.current.z + Math.cos(carOrientRef.current) * forwardDelta;

    // ── Building collision ────────────────────────────────────────────────────
    let resolvedX = clamp(newX, CITY_MIN_X, CITY_MAX_X);
    let resolvedZ = clamp(newZ, CITY_MIN_Z, CITY_MAX_Z);
    let bounced   = false;

    for (const [minX, minZ, maxX, maxZ] of BUILDING_BOXES) {
      const bx1 = minX - BOX_MARGIN;
      const bz1 = minZ - BOX_MARGIN;
      const bx2 = maxX + BOX_MARGIN;
      const bz2 = maxZ + BOX_MARGIN;

      if (resolvedX > bx1 && resolvedX < bx2 && resolvedZ > bz1 && resolvedZ < bz2) {
        // Push to nearest edge
        const dL = resolvedX - bx1;
        const dR = bx2 - resolvedX;
        const dT = resolvedZ - bz1;
        const dB = bz2 - resolvedZ;
        const m  = Math.min(dL, dR, dT, dB);
        if      (m === dL) resolvedX = bx1;
        else if (m === dR) resolvedX = bx2;
        else if (m === dT) resolvedZ = bz1;
        else               resolvedZ = bz2;
        bounced = true;
        break;
      }
    }

    posRef.current.x = resolvedX;
    posRef.current.z = resolvedZ;
    if (bounced) speedRef.current *= -0.15; // light bounce-back

    // ── Sync car mesh ─────────────────────────────────────────────────────────
    if (carRef.current) {
      carRef.current.position.set(posRef.current.x, ROAD_Y, posRef.current.z);
      carRef.current.rotation.y = carOrientRef.current;
      const sr = (carRef as any).__speedRef;
      if (sr) sr.current = speedRef.current;
    }

    // ── Wheel steer visual ────────────────────────────────────────────────────
    const fa = (carRef as any).__frontAxle;
    if (fa?.current) fa.current.rotation.y = wheelOrRef.current;

    // ── Chase camera ──────────────────────────────────────────────────────────
    // Pre-allocated _camTarget / _lookTarget — no per-frame heap allocations
    const camDist   = 14;
    const camHeight = ROAD_Y + 8;
    _camTarget.set(
      posRef.current.x + Math.sin(carOrientRef.current) * camDist,
      camHeight,
      posRef.current.z + Math.cos(carOrientRef.current) * camDist,
    );
    const alphaPos  = 1 - Math.exp(-10 * dt);
    const alphaLook = 1 - Math.exp(-12 * dt);
    camPosRef.current.lerp(_camTarget, alphaPos);
    state.camera.position.copy(camPosRef.current);

    _lookTarget.set(posRef.current.x, ROAD_Y + 0.4, posRef.current.z);
    camLookRef.current.lerp(_lookTarget, alphaLook);
    state.camera.lookAt(camLookRef.current);

    // ── Project proximity — 2D XZ distance ───────────────────────────────────
    let nearest: number | null = null;
    let minDist = Infinity;
    for (let i = 0; i < STATIONS.length; i++) {
      const dx   = posRef.current.x - STATIONS[i].x;
      const dz   = posRef.current.z - STATIONS[i].z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 15 && dist < minDist) { minDist = dist; nearest = i; }
    }
    if (nearest !== curProjRef.current) {
      curProjRef.current = nearest;
      setNearIdx(nearest);
      onNearProject(nearest);
    }

    // ── Colour-panel boundary (near spawn) ───────────────────────────────────
    const dx0 = posRef.current.x - 72;
    const dz0 = posRef.current.z - (-40);
    const atBound = (dx0 * dx0 + dz0 * dz0) < 100; // radius 10
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
      {theme === "dark" && (
        <pointLight position={[72, ROAD_Y + 30, -40]} color="#6080ff" intensity={4} distance={200} decay={1} />
      )}

      <Suspense fallback={null}>
        <CityModel />
      </Suspense>

      {projects.map((p, i) => (
        <GroundCircle
          key={i}
          index={i}
          accent={p.accent}
          isNear={nearIdx === i}
        />
      ))}

      <Suspense fallback={null}>
        <Car carRef={carRef} colors={carColors} theme={theme} />
      </Suspense>

      <fog attach="fog" args={[t.fogCol, t.fogNear, t.fogFar]} />
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
interface ProjectWorldProps {
  onNearProject: (idx: number | null) => void;
  onAtBoundary:  (at: boolean) => void;
  theme:         Theme;
  carColors:     CarColors;
}

export default function ProjectWorld({
  onNearProject,
  onAtBoundary,
  theme,
  carColors,
}: ProjectWorldProps) {
  const bg = THEMES[theme].bg;
  return (
    <Canvas
      camera={{
        position: [72, ROAD_Y + 8, -40 + 16],
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
