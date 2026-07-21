"use client";

import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/lib/projects";

// ── Road surface Y (matches YUKA path y=20.75) ───────────────────────────────
const ROAD_Y = 20.75;

// ── Project stations ──────────────────────────────────────────────────────────
export const STATIONS: { x: number; z: number; icon: string }[] = [
  { x:  75, z: -20, icon: "🎪" }, // 0 Party Place
  { x: 120, z: -10, icon: "✈️" }, // 1 Maser Travels
  { x: 188, z: -40, icon: "🏦" }, // 2 Loan Mgmt
  { x:  25, z: -85, icon: "💳" }, // 3 YCT Microfinance
  { x: -92, z:  30, icon: "🏨" }, // 4 Malete Hostels
  { x:  92, z: 108, icon: "🍽️" }, // 5 Zennyola Foods
];

// ── Road-graph waypoints (junctions along city roads) ────────────────────────
// These form a simplified grid following the city road layout
type RoadNode = { x: number; z: number };

const ROAD_NODES: RoadNode[] = [
  { x:  72, z: -40 },  //  0  spawn / main junction
  { x:  75, z: -40 },  //  1  station-0 approach
  { x:  75, z: -20 },  //  2  station 0  (Party Place)
  { x: 120, z: -40 },  //  3  station-1 approach / highway junction right
  { x: 120, z: -10 },  //  4  station 1  (Maser Travels)
  { x: 188, z: -40 },  //  5  station 2  (Loan Mgmt) — on highway
  { x:  25, z: -40 },  //  6  station-3 approach / highway junction left
  { x:  25, z: -85 },  //  7  station 3  (YCT Microfinance)
  { x:   0, z: -40 },  //  8  highway junction far-left
  { x: -60, z: -40 },  //  9  highway junction far-left-2
  { x: -92, z: -40 },  // 10  station-4 approach
  { x: -92, z:  30 },  // 11  station 4  (Malete Hostels)
  { x:  72, z:   0 },  // 12  junction south of spawn
  { x:  72, z:  80 },  // 13  junction south
  { x:  92, z:  80 },  // 14  station-5 approach
  { x:  92, z: 108 },  // 15  station 5  (Zennyola Foods)
];

// Bidirectional road edges
const ROAD_EDGES: [number, number][] = [
  // Main east-west highway at z = -40
  [0, 1], [1, 3], [3, 5],   // spawn → st0-app → st1-app → station2
  [0, 6], [6, 8], [8, 9], [9, 10], // spawn ← → far-left
  // Station branches
  [1, 2],   // st0 approach → station 0
  [3, 4],   // station 1 approach → station 1
  [6, 7],   // station 3 approach → station 3
  [10, 11], // station 4 approach → station 4
  // South road from spawn
  [0, 12], [12, 13], [13, 14], [14, 15],
];

// BFS to find waypoint path between nearest nodes
function findRoadPath(
  sx: number, sz: number,
  tx: number, tz: number,
): RoadNode[] {
  // Nearest start / end node
  let startN = 0, endN = 0;
  let minS = Infinity, minE = Infinity;
  for (let i = 0; i < ROAD_NODES.length; i++) {
    const n = ROAD_NODES[i];
    const ds = (sx - n.x) ** 2 + (sz - n.z) ** 2;
    const de = (tx - n.x) ** 2 + (tz - n.z) ** 2;
    if (ds < minS) { minS = ds; startN = i; }
    if (de < minE) { minE = de; endN = i; }
  }

  if (startN === endN) return [ROAD_NODES[endN], { x: tx, z: tz }];

  // Build adjacency list
  const adj: number[][] = ROAD_NODES.map(() => []);
  for (const [a, b] of ROAD_EDGES) { adj[a].push(b); adj[b].push(a); }

  // BFS
  const prev = new Array<number>(ROAD_NODES.length).fill(-1);
  const vis  = new Array<boolean>(ROAD_NODES.length).fill(false);
  const q = [startN];
  vis[startN] = true;
  bfs: while (q.length) {
    const cur = q.shift()!;
    if (cur === endN) break bfs;
    for (const nb of adj[cur]) {
      if (!vis[nb]) { vis[nb] = true; prev[nb] = cur; q.push(nb); }
    }
  }

  // Reconstruct
  const idxPath: number[] = [];
  let c = endN;
  while (c !== -1) { idxPath.unshift(c); c = prev[c]; }

  const waypoints: RoadNode[] = idxPath.map(i => ({ ...ROAD_NODES[i] }));
  // Append exact target if it differs from the last road node
  const last = ROAD_NODES[endN];
  if (Math.abs(tx - last.x) > 3 || Math.abs(tz - last.z) > 3) {
    waypoints.push({ x: tx, z: tz });
  }
  return waypoints;
}

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
  bg:         string;
  ambientInt: number;
  ambientCol: string;
  dirInt:     number;
  dirCol:     string;
  fogCol:     string;
  fogNear:    number;
  fogFar:     number;
};

const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bg: "#050508", ambientInt: 0.4, ambientCol: "#8090c0",
    dirInt: 0.8, dirCol: "#b0b8e0", fogCol: "#050508", fogNear: 100, fogFar: 420,
  },
  light: {
    bg: "#87ceeb", ambientInt: 2.0, ambientCol: "#ffffff",
    dirInt: 2.5, dirCol: "#fffde7", fogCol: "#87ceeb", fogNear: 140, fogFar: 620,
  },
} as const;

// ── City + House GLB ─────────────────────────────────────────────────────────
function CityModel() {
  const { scene: cityScene  } = useGLTF("/models/city.glb");
  const { scene: houseScene } = useGLTF("/models/house.glb");
  const city  = useMemo(() => cityScene.clone(true),  [cityScene]);
  const house = useMemo(() => houseScene.clone(true), [houseScene]);
  useMemo(() => {
    city.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) { obj.castShadow = false; obj.receiveShadow = false; }
    });
  }, [city]);
  return (
    <>
      <primitive object={city}  scale={[5, 5, 5]} />
      <primitive object={house} scale={[5, 5, 5]}
        position={[50, ROAD_Y - 1.04, 25]} rotation={[0, Math.PI / 2, 0]} />
    </>
  );
}

// ── Ground circle ─────────────────────────────────────────────────────────────
function GroundCircle({
  index,
  accent,
  isNear,
  isClose,
}: {
  index:   number;
  accent:  string;
  isNear:  boolean;   // within 15 units — project card + ring brightness
  isClose: boolean;   // within 30 units — hide floating label
}) {
  const { x, z, icon } = STATIONS[index];
  const project = projects[index];
  const ringRef = useRef<THREE.Mesh>(null!);
  const tmr     = useRef(Math.random() * Math.PI * 2);

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
        <meshBasicMaterial color={accent} transparent
          opacity={isNear ? 0.50 : 0.18} depthWrite={false} />
      </mesh>

      {/* Pulsing outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, ROAD_Y + 0.02, z]}>
        <ringGeometry args={[4.7, 5.8, 40]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* Floating name label — hidden when car is close (blocks screen) */}
      <Html position={[x, ROAD_Y + 8, z]} center distanceFactor={55}
        style={{ pointerEvents: "none" }} zIndexRange={[0, 10]}>
        <div style={{
          background: `${accent}55`,
          border: `1.5px solid ${accent}`,
          borderRadius: "8px",
          padding: "5px 12px",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 700,
          whiteSpace: "nowrap",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          letterSpacing: "0.02em",
          opacity:    isClose ? 0 : 1,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}>
          {icon} {project.title}
        </div>
      </Html>

      {/* Glow light — only when near */}
      {isNear && (
        <pointLight position={[x, ROAD_Y + 4, z]} color={accent}
          intensity={40} distance={28} decay={2} />
      )}
    </group>
  );
}

// ── Ferrari car ───────────────────────────────────────────────────────────────
function Car({ carRef, colors, theme }: {
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

  useEffect(() => {
    const bodyMat  = new THREE.MeshStandardMaterial({ color: new THREE.Color(colors.body),  metalness: 0.9, roughness: 0.2 });
    const rimMat   = new THREE.MeshStandardMaterial({ color: new THREE.Color(colors.rim),   metalness: 1.0, roughness: 0.15 });
    const glassMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colors.glass), transparent: true, opacity: colors.glassOpacity, metalness: 0.9, roughness: 0.05 });

    const bodyPart  = carScene.getObjectByName("body")  as THREE.Mesh | undefined;
    const glassPart = carScene.getObjectByName("glass") as THREE.Mesh | undefined;
    if (bodyPart?.isMesh)  bodyPart.material  = bodyMat;
    if (glassPart?.isMesh) glassPart.material = glassMat;

    (["rim_fl","rim_fr","rim_rr","rim_rl","trim"] as const).forEach(name => {
      const part = carScene.getObjectByName(name) as THREE.Mesh | undefined;
      if (part?.isMesh) part.material = rimMat;
    });
  }, [carScene, colors.body, colors.rim, colors.glass, colors.glassOpacity]);

  const shadowTex = useMemo(() => new THREE.TextureLoader().load("/models/ferrari_ao.png"), []);

  useFrame((_, delta) => {
    const dt  = Math.min(delta, 0.05);
    const spd = (carRef as any).__speedRef?.current ?? 0;
    const WHEEL_DIAM = 0.66;
    const angDelta   = (spd * dt * 0.12) * (2 / WHEEL_DIAM);
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
      <primitive object={carScene} scale={[1.2, 1.2, 1.2]} position={[0, 0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={2}>
        <planeGeometry args={[3.15, 6.24]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.75} depthWrite={false} color="black" />
      </mesh>
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

// ── Pre-allocated vectors ─────────────────────────────────────────────────────
const _camTarget  = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function normaliseAngle(a: number): number {
  while (a >  Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// ── Scene constants ───────────────────────────────────────────────────────────
const CITY_MIN_X = -120, CITY_MAX_X = 210, CITY_MIN_Z = -110, CITY_MAX_Z = 130;
const MAX_SPEED   = 280, MAX_SPD_REV = -70;
const ACCEL       = 140, ACCEL_REV  = 50;
const DECEL       = 90,  BRAKE_POW  = 8;
const STEER_SPD   = 1.8, MAX_STEER  = 0.55;
const TURN_RAD    = 20,  MOV_SCALE  = 0.12;
const ARRIVE_DIST = 8;   // stop within 8 units of waypoint
const NEAR_DIST   = 15;  // project card trigger
const CLOSE_DIST  = 30;  // label hide threshold

const expEaseOut = (k: number) => (k === 1 ? 1 : -Math.pow(2, -10 * k) + 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── Main scene ────────────────────────────────────────────────────────────────
interface SceneProps {
  onNearProject:    (idx: number | null) => void;
  onAtBoundary:     (at: boolean) => void;
  onAutoArrived:    () => void;
  theme:            Theme;
  carColors:        CarColors;
  autopilotTarget:  number | null;
  isManual:         boolean;
}

function Scene({
  onNearProject, onAtBoundary, onAutoArrived,
  theme, carColors, autopilotTarget, isManual,
}: SceneProps) {
  const t = THEMES[theme];

  const carRef       = useRef<THREE.Group>(null!);
  const posRef       = useRef({ x: 72, z: -40 });
  const carOrientRef = useRef(0);
  const speedRef     = useRef(0);
  const wheelOrRef   = useRef(0);
  const keysRef      = useRef({ up: false, down: false, left: false, right: false });
  const camPosRef    = useRef(new THREE.Vector3(72, ROAD_Y + 8, -40 + 16));
  const camLookRef   = useRef(new THREE.Vector3(72, ROAD_Y + 0.4, -40));
  const curProjRef   = useRef<number | null>(null);
  const curCloseRef  = useRef<number | null>(null);
  const atBoundRef   = useRef(false);
  const arrivedRef   = useRef(false);

  // Autopilot waypoint state
  const waypointPath = useRef<RoadNode[]>([]);
  const waypointIdx  = useRef(0);

  const [nearIdx,  setNearIdx]  = useState<number | null>(null);
  const [closeIdx, setCloseIdx] = useState<number | null>(null);

  // Compute road path whenever autopilot target changes
  useEffect(() => {
    arrivedRef.current = false;
    if (autopilotTarget === null) {
      waypointPath.current = [];
      waypointIdx.current  = 0;
      return;
    }
    const target = STATIONS[autopilotTarget];
    const path = findRoadPath(
      posRef.current.x, posRef.current.z,
      target.x, target.z,
    );
    waypointPath.current = path;
    waypointIdx.current  = 0;
  }, [autopilotTarget]);

  // Keyboard + d-pad — manual mode only
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!isManual) return;
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
      if (!isManual) return;
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
  }, [isManual]);

  // Clear keys when switching to manual
  useEffect(() => {
    if (isManual) keysRef.current = { up: false, down: false, left: false, right: false };
  }, [isManual]);

  useFrame((state, delta) => {
    const dt   = Math.min(delta, 0.05);
    const keys = keysRef.current;

    // ── Autopilot: waypoint navigation ───────────────────────────────────────
    let autoAngleDiff  = 0;
    let autoShouldDrive = false;

    if (!isManual && autopilotTarget !== null) {
      const path = waypointPath.current;
      let wpIdx  = waypointIdx.current;

      if (wpIdx < path.length) {
        const wp   = path[wpIdx];
        const dx   = wp.x - posRef.current.x;
        const dz   = wp.z - posRef.current.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const isLast = wpIdx === path.length - 1;

        // Advance waypoint when close enough
        if (dist < (isLast ? ARRIVE_DIST : 12)) {
          waypointIdx.current++;
          wpIdx++;
          if (wpIdx >= path.length && !arrivedRef.current) {
            arrivedRef.current = true;
            speedRef.current   = 0;
            keysRef.current    = { up: false, down: false, left: false, right: false };
            onAutoArrived();
          }
        }

        if (wpIdx < path.length) {
          const wp2  = path[wpIdx];
          const dx2  = wp2.x - posRef.current.x;
          const dz2  = wp2.z - posRef.current.z;
          const dist2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
          const targetAngle = Math.atan2(-dx2, -dz2);
          autoAngleDiff    = normaliseAngle(targetAngle - carOrientRef.current);
          autoShouldDrive  = dist2 > ARRIVE_DIST;
        }
      }

      // Override keys (speed driven by autoShouldDrive, steer handled below)
      keys.up    = autoShouldDrive;
      keys.down  = false;
      keys.left  = false;
      keys.right = false;
    } else if (!isManual && autopilotTarget === null) {
      keys.up = false; keys.down = false; keys.left = false; keys.right = false;
    }

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
    if (!isManual && autopilotTarget !== null) {
      // Proportional steering: smoothly interpolate toward target angle
      const targetWheel = clamp(autoAngleDiff * (MAX_STEER / 0.6), -MAX_STEER, MAX_STEER);
      wheelOrRef.current = THREE.MathUtils.lerp(
        wheelOrRef.current, targetWheel, Math.min(dt * 6, 1),
      );
    } else {
      // Key-based steering (manual)
      if (keys.left)  wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, MAX_STEER);
      if (keys.right) wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, -MAX_STEER, MAX_STEER);
      if (!keys.left && !keys.right) {
        if (wheelOrRef.current > 0) {
          wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, 0, MAX_STEER);
        } else {
          wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, 0);
        }
      }
    }

    // ── Movement ──────────────────────────────────────────────────────────────
    const forwardDelta = -speedRef.current * dt * MOV_SCALE;
    carOrientRef.current -= (forwardDelta * TURN_RAD * 0.02) * wheelOrRef.current;

    const newX = posRef.current.x + Math.sin(carOrientRef.current) * forwardDelta;
    const newZ = posRef.current.z + Math.cos(carOrientRef.current) * forwardDelta;
    posRef.current.x = clamp(newX, CITY_MIN_X, CITY_MAX_X);
    posRef.current.z = clamp(newZ, CITY_MIN_Z, CITY_MAX_Z);

    // ── Sync car mesh ─────────────────────────────────────────────────────────
    if (carRef.current) {
      carRef.current.position.set(posRef.current.x, ROAD_Y, posRef.current.z);
      carRef.current.rotation.y = carOrientRef.current;
      const sr = (carRef as any).__speedRef;
      if (sr) sr.current = speedRef.current;
    }
    const fa = (carRef as any).__frontAxle;
    if (fa?.current) fa.current.rotation.y = wheelOrRef.current;

    // ── Chase camera ──────────────────────────────────────────────────────────
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

    // ── Project proximity (card trigger: 15, label hide: 30) ─────────────────
    let nearest: number | null = null;
    let nearestClose: number | null = null;
    let minDist = Infinity;
    let minClose = Infinity;
    for (let i = 0; i < STATIONS.length; i++) {
      const dx   = posRef.current.x - STATIONS[i].x;
      const dz   = posRef.current.z - STATIONS[i].z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < NEAR_DIST  && dist < minDist)  { minDist  = dist; nearest      = i; }
      if (dist < CLOSE_DIST && dist < minClose) { minClose = dist; nearestClose = i; }
    }
    if (nearest !== curProjRef.current) {
      curProjRef.current = nearest;
      setNearIdx(nearest);
      onNearProject(nearest);
    }
    if (nearestClose !== curCloseRef.current) {
      curCloseRef.current = nearestClose;
      setCloseIdx(nearestClose);
    }

    // ── Colour-panel boundary ─────────────────────────────────────────────────
    const dx0 = posRef.current.x - 72;
    const dz0 = posRef.current.z - (-40);
    const atBound = (dx0 * dx0 + dz0 * dz0) < 100;
    if (atBound !== atBoundRef.current) {
      atBoundRef.current = atBound;
      onAtBoundary(atBound);
    }
  });

  return (
    <>
      <ambientLight intensity={t.ambientInt} color={t.ambientCol} />
      <directionalLight position={[-30, 60, 20]} intensity={t.dirInt}
        color={t.dirCol} castShadow={false} />
      {theme === "dark" && (
        <pointLight position={[72, ROAD_Y + 30, -40]} color="#6080ff"
          intensity={4} distance={200} decay={1} />
      )}

      <Suspense fallback={null}><CityModel /></Suspense>

      {projects.map((p, i) => (
        <GroundCircle
          key={i}
          index={i}
          accent={p.accent}
          isNear={nearIdx  === i}
          isClose={closeIdx === i}
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
  onNearProject:   (idx: number | null) => void;
  onAtBoundary:    (at: boolean) => void;
  onAutoArrived:   () => void;
  theme:           Theme;
  carColors:       CarColors;
  autopilotTarget: number | null;
  isManual:        boolean;
}

export default function ProjectWorld({
  onNearProject, onAtBoundary, onAutoArrived,
  theme, carColors, autopilotTarget, isManual,
}: ProjectWorldProps) {
  const bg = THEMES[theme].bg;
  return (
    <Canvas
      camera={{ position: [72, ROAD_Y + 8, -40 + 16], fov: 62, near: 0.5, far: 800 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      dpr={[0.5, 0.9]}
      performance={{ min: 0.3 }}
    >
      <color attach="background" args={[bg]} />
      <Scene
        onNearProject={onNearProject}
        onAtBoundary={onAtBoundary}
        onAutoArrived={onAutoArrived}
        theme={theme}
        carColors={carColors}
        autopilotTarget={autopilotTarget}
        isManual={isManual}
      />
    </Canvas>
  );
}

useGLTF.preload("/models/ferrari.glb");
useGLTF.preload("/models/city.glb");
useGLTF.preload("/models/house.glb");
