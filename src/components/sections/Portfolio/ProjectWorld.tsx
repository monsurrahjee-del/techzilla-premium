"use client";

import { useRef, useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/lib/projects";

// ── Road surface Y ────────────────────────────────────────────────────────────
const ROAD_Y = 20.75;

// ── Recorded drive path — used as the autopilot route ────────────────────────
// 226 waypoints captured from a manual drive that visits every station in order:
// Party Place → Maser Travels → Loan Mgmt → YCT Microfinance → Malete Hostels → Zennyola Foods
const RECORDED_PATH: { x: number; z: number }[] = [
  {x:72,z:80},{x:72,z:75.59},{x:72,z:71.18},{x:72,z:66.35},{x:72,z:61.73},
  {x:72,z:56.44},{x:72,z:52.03},{x:72,z:47.24},{x:72,z:42.2},{x:72,z:37.16},
  {x:72,z:32.15},{x:72,z:27.11},{x:72,z:22.15},{x:72,z:17.23},{x:72,z:12.27},
  {x:72,z:7.56},{x:72,z:3.08},{x:72,z:-1.36},{x:72,z:-5.97},{x:72,z:-10.33},
  {x:72,z:-14.46},{x:72,z:-19.58},{x:72,z:-24.27},{x:72,z:-28.54},{x:72,z:-32.7},
  {x:72,z:-28.34},{x:72,z:-24.14},{x:72,z:-19.83},{x:74.61,z:-23.03},{x:78.77,z:-23.09},
  {x:83,z:-22.45},{x:87.15,z:-21.92},{x:91.49,z:-21.79},{x:95.54,z:-21.68},{x:99.67,z:-21.62},
  {x:103.8,z:-21.62},{x:107.94,z:-21.61},{x:111.95,z:-21.69},{x:115.31,z:-23.93},{x:115.62,z:-28},
  {x:114.97,z:-31.98},{x:115.43,z:-36.18},{x:115.6,z:-40.44},{x:115.2,z:-44.53},{x:115.06,z:-48.82},
  {x:115.32,z:-52.93},{x:115.74,z:-57.18},{x:116.14,z:-61.36},{x:118.06,z:-64.91},{x:121.89,z:-66.27},
  {x:125.9,z:-65.84},{x:130.27,z:-65.17},{x:134.65,z:-64.63},{x:138.64,z:-64.42},{x:142.78,z:-64.23},
  {x:147.17,z:-64.11},{x:151.36,z:-64.22},{x:155.82,z:-64.36},{x:159.97,z:-64.49},{x:164.49,z:-64.64},
  {x:168.7,z:-64.77},{x:172.89,z:-64.91},{x:176.97,z:-65.04},{x:181.11,z:-65.17},{x:185.44,z:-65.31},
  {x:189.55,z:-65.39},{x:193.14,z:-63.51},{x:195.77,z:-60.3},{x:196.03,z:-56.13},{x:193.98,z:-52.5},
  {x:192.5,z:-48.55},{x:191.51,z:-44.57},{x:191.86,z:-40.43},{x:192.25,z:-36.41},{x:192.5,z:-32.32},
  {x:191.38,z:-28.29},{x:189.57,z:-24.64},{x:185.65,z:-23.12},{x:181.82,z:-24.48},{x:177.71,z:-24.94},
  {x:173.41,z:-24.07},{x:169.25,z:-23.59},{x:164.63,z:-23.1},{x:160.16,z:-23.22},{x:155.71,z:-23.39},
  {x:151.7,z:-23.1},{x:147.28,z:-22.64},{x:142.83,z:-22.29},{x:138.62,z:-21.95},{x:134.41,z:-21.73},
  {x:130.14,z:-21.59},{x:125.83,z:-21.78},{x:121.61,z:-21.98},{x:116.99,z:-22.19},{x:112.68,z:-22.39},
  {x:108.29,z:-22.37},{x:104.28,z:-22.14},{x:100.26,z:-21.91},{x:96.05,z:-21.78},{x:91.74,z:-21.65},
  {x:86.99,z:-21.51},{x:82.44,z:-21.37},{x:77.21,z:-21.21},{x:72.85,z:-21.08},{x:68.12,z:-20.94},
  {x:63.41,z:-20.8},{x:58.96,z:-20.91},{x:54.74,z:-21.01},{x:49.49,z:-21.14},{x:44.67,z:-21.25},
  {x:40.29,z:-21.36},{x:36.12,z:-21.46},{x:31.42,z:-21.58},{x:27.11,z:-21.68},{x:22.66,z:-21.79},
  {x:18.67,z:-22.77},{x:15.28,z:-25.41},{x:14.28,z:-29.38},{x:14.93,z:-33.37},{x:17.16,z:-36.86},
  {x:16.07,z:-32.83},{x:15.77,z:-28.78},{x:17.01,z:-24.75},{x:20.63,z:-22.65},{x:16.49,z:-23.21},
  {x:12.32,z:-23},{x:8.17,z:-22.57},{x:3.54,z:-22.33},{x:-0.83,z:-22.72},{x:-4.8,z:-23.27},
  {x:-8.95,z:-23.51},{x:-13.17,z:-23.56},{x:-17.54,z:-23.62},{x:-22.02,z:-23.39},{x:-26.31,z:-23.13},
  {x:-30.63,z:-22.86},{x:-35.04,z:-22.58},{x:-39.37,z:-22.31},{x:-43.41,z:-22.39},{x:-47.6,z:-22.67},
  {x:-51.81,z:-22.94},{x:-56.1,z:-23.22},{x:-60.43,z:-23.5},{x:-64.66,z:-23.56},{x:-68.73,z:-23.47},
  {x:-72.94,z:-23.36},{x:-77.14,z:-23.26},{x:-81.15,z:-23.34},{x:-84.57,z:-25.7},{x:-86.63,z:-29.34},
  {x:-86.1,z:-25.28},{x:-87.25,z:-21.36},{x:-90.91,z:-19.31},{x:-94.95,z:-18.08},{x:-98.81,z:-19.21},
  {x:-99.71,z:-15.02},{x:-100.5,z:-11.04},{x:-100.34,z:-6.49},{x:-100.17,z:-2.1},{x:-100.02,z:1.95},
  {x:-100.38,z:6.29},{x:-100.95,z:10.37},{x:-100.62,z:14.53},{x:-100.27,z:18.66},{x:-100.38,z:22.81},
  {x:-100.63,z:27.04},{x:-100.88,z:31.25},{x:-101.01,z:35.3},{x:-100.63,z:39.37},{x:-98.83,z:43.14},
  {x:-96.29,z:46.24},{x:-92.4,z:47.39},{x:-88.45,z:48.03},{x:-84.22,z:48.04},{x:-79.69,z:47.91},
  {x:-75.19,z:47.78},{x:-70.84,z:47.66},{x:-65.81,z:47.52},{x:-61.6,z:47.4},{x:-57.02,z:47.27},
  {x:-52.07,z:47.13},{x:-47.03,z:47.29},{x:-41.99,z:47.35},{x:-36.96,z:47.21},{x:-31.92,z:47.06},
  {x:-26.88,z:46.92},{x:-21.84,z:46.78},{x:-16.8,z:46.64},{x:-11.77,z:46.49},{x:-6.73,z:46.35},
  {x:-1.69,z:46.21},{x:3.35,z:46.07},{x:8.39,z:45.92},{x:13.42,z:45.78},{x:18.46,z:45.64},
  {x:23.5,z:45.5},{x:28.38,z:45.36},{x:33.01,z:45.23},{x:37.4,z:45.1},{x:41.55,z:44.99},
  {x:46.71,z:44.84},{x:51.05,z:44.72},{x:55.42,z:44.59},{x:59.74,z:44.61},{x:64.09,z:45.22},
  {x:67.05,z:47.93},{x:67.8,z:51.98},{x:66.79,z:56.04},{x:65.99,z:60.08},{x:65.54,z:64.13},
  {x:66.9,z:68.06},{x:70.02,z:70.6},{x:74,z:72.36},{x:78.03,z:71.7},{x:82.12,z:70.95},
  {x:86.26,z:71.16},{x:81.93,z:70.74},{x:77.87,z:70.61},{x:73.93,z:71.67},{x:71.6,z:75.05},
  {x:72.46,z:70.99},{x:72.79,z:66.75},{x:72.77,z:62.74},{x:72.58,z:58.36},{x:72.38,z:53.94},
  {x:72.29,z:49.89},
];

// ── Project stations ──────────────────────────────────────────────────────────
// Positions are aligned with where the recorded drive path actually passes.
// Station 3 (YCT) sits on the z≈-22 road that the recording uses.
export const STATIONS: { x: number; z: number; icon: string }[] = [
  { x:  72, z: -33, icon: "🎪" }, // 0 Party Place      — southbound turnaround
  { x: 116, z: -40, icon: "✈️" }, // 1 Maser Travels    — east highway south dip
  { x: 192, z: -40, icon: "🏦" }, // 2 Loan Mgmt        — east highway end
  { x:  27, z: -22, icon: "💳" }, // 3 YCT Microfinance — z≈-22 road westbound
  { x: -87, z: -29, icon: "🏨" }, // 4 Malete Hostels   — west side dip
  { x:  86, z:  71, icon: "🍽️" }, // 5 Zennyola Foods   — south road return
  { x:  72, z:  58, icon: "⛪" }, // 6 RCCG Church       — between Zennyola and path end
];

// ── Car colour types ──────────────────────────────────────────────────────────
export type CarColors = {
  body:  string;
  rim:   string;
  glass: string;
  glassOpacity: number;
};

// ── Theme ─────────────────────────────────────────────────────────────────────
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

// ── City + House GLB ──────────────────────────────────────────────────────────
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
  isNear:  boolean;
  isClose: boolean;
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
        <circleGeometry args={[3.0, 40]} />
        <meshBasicMaterial color={accent} transparent
          opacity={isNear ? 0.50 : 0.18} depthWrite={false} />
      </mesh>

      {/* Pulsing outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, ROAD_Y + 0.02, z]}>
        <ringGeometry args={[3.2, 4.2, 40]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* Floating name label */}
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

      {/* Glow light when near */}
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

// ── Building-collision detector ───────────────────────────────────────────────
const _bcRay    = new THREE.Raycaster();
const _bcDown   = new THREE.Vector3(0, -1, 0);
const _bcOrigin = new THREE.Vector3();
const BLDG_Y_MARGIN = 1.5;

function isBuilding(
  x: number,
  z: number,
  scene: THREE.Scene,
  excludeObj?: THREE.Object3D | null,
): boolean {
  _bcOrigin.set(x, ROAD_Y + 40, z);
  _bcRay.set(_bcOrigin, _bcDown);
  const targets = excludeObj
    ? scene.children.filter(c => c !== excludeObj)
    : scene.children;
  const hits = _bcRay.intersectObjects(targets, true);
  if (hits.length === 0) return false;
  return hits[0].point.y > ROAD_Y + BLDG_Y_MARGIN;
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
// Stop when the car centre is within this many units of the station centre.
// Must be < circle radius (3.0) so the car visibly stops inside the ring.
const ARRIVE_DIST   = 2.5;
const NEAR_DIST     = 15;
const CLOSE_DIST    = 30;
// Advance to the next waypoint once the car is this close to it.
// Smaller = car hugs path more tightly = station positions are reliably hit.
const WP_REACH_DIST = 1.5;
// How far ahead along the path the steering target is projected (pure pursuit).
// Larger = smoother curves; smaller = tighter path tracking.
const LOOKAHEAD_DIST = 10;

const expEaseOut = (k: number) => (k === 1 ? 1 : -Math.pow(2, -10 * k) + 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Pure-pursuit lookahead: walk `lookaheadDist` world-units ahead along the
// remaining recorded path and return that point. The car steers toward this
// point instead of the raw next waypoint, which rounds off sharp corners and
// makes reversals feel like controlled turns rather than sudden flips.
function getLookaheadPoint(
  pos: { x: number; z: number },
  wpIdx: number,
  lookaheadDist: number,
): { x: number; z: number } {
  let remaining = lookaheadDist;
  let px = pos.x;
  let pz = pos.z;

  for (let i = wpIdx; i < RECORDED_PATH.length; i++) {
    const wp = RECORDED_PATH[i];
    const dx = wp.x - px;
    const dz = wp.z - pz;
    const d  = Math.sqrt(dx * dx + dz * dz);
    if (d >= remaining) {
      return { x: px + (dx / d) * remaining, z: pz + (dz / d) * remaining };
    }
    remaining -= d;
    px = wp.x;
    pz = wp.z;
  }
  // Past end of path — return last waypoint
  return { ...RECORDED_PATH[RECORDED_PATH.length - 1] };
}

// ── Main scene ────────────────────────────────────────────────────────────────
interface SceneProps {
  onNearProject:    (idx: number | null) => void;
  onAtBoundary:     (at: boolean) => void;
  onAutoArrived:    () => void;
  theme:            Theme;
  carColors:        CarColors;
  autopilotTarget:  number | null;  // station index to stop at; null = idle/manual
  autopilotTourId:  number;         // increments each time "Start Tour" is pressed
  autopilotRewindId: number;        // increments each time "Prev" is pressed
  isManual:         boolean;
  rccgUnlocked:     boolean;          // false until Zennyola (station n-2) is visited
}

function Scene({
  onNearProject, onAtBoundary, onAutoArrived,
  theme, carColors, autopilotTarget, autopilotTourId, autopilotRewindId, isManual, rccgUnlocked,
}: SceneProps) {
  const t = THEMES[theme];

  const carRef       = useRef<THREE.Group>(null!);
  const posRef       = useRef({ x: RECORDED_PATH[0].x, z: RECORDED_PATH[0].z });
  const carOrientRef = useRef(0);
  const speedRef     = useRef(0);
  const wheelOrRef   = useRef(0);
  const keysRef      = useRef({ up: false, down: false, left: false, right: false });
  const camPosRef    = useRef(new THREE.Vector3(
    RECORDED_PATH[0].x, ROAD_Y + 8, RECORDED_PATH[0].z + 16,
  ));
  const camLookRef   = useRef(new THREE.Vector3(
    RECORDED_PATH[0].x, ROAD_Y + 0.4, RECORDED_PATH[0].z,
  ));
  const curProjRef   = useRef<number | null>(null);
  const curCloseRef  = useRef<number | null>(null);
  const atBoundRef   = useRef(false);
  const arrivedRef   = useRef(false);
  const isReversingRef = useRef(false);   // true while driving backwards (Prev pressed)

  // Waypoint index along RECORDED_PATH — persists across station-to-station drives
  const waypointIdx = useRef(0);

  const [nearIdx,  setNearIdx]  = useState<number | null>(null);
  const [closeIdx, setCloseIdx] = useState<number | null>(null);

  // Fresh tour start: teleport car to path start and reset waypoint index
  useEffect(() => {
    if (autopilotTarget === null) return;
    posRef.current      = { x: RECORDED_PATH[0].x, z: RECORDED_PATH[0].z };
    waypointIdx.current = 0;
    arrivedRef.current  = false;
    speedRef.current    = 0;
    carOrientRef.current = 0;
    camPosRef.current.set(RECORDED_PATH[0].x, ROAD_Y + 8, RECORDED_PATH[0].z + 16);
    camLookRef.current.set(RECORDED_PATH[0].x, ROAD_Y + 0.4, RECORDED_PATH[0].z);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotTourId]);

  // When station target changes (user pressed Next/Prev), just reset arrived flag
  // so the car continues from its current waypoint index
  useEffect(() => {
    if (autopilotTarget === null) return;
    isReversingRef.current = false;   // going forward — clear reverse flag
    arrivedRef.current = false;
  }, [autopilotTarget]);

  // When "Prev" is pressed, find the waypoint nearest the car's CURRENT position
  // and enable reverse mode so the car drives backwards along the recorded path.
  useEffect(() => {
    if (autopilotRewindId === 0 || autopilotTarget === null) return;
    // Find the waypoint in RECORDED_PATH closest to where the car is right now
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < RECORDED_PATH.length; i++) {
      const dx = RECORDED_PATH[i].x - posRef.current.x;
      const dz = RECORDED_PATH[i].z - posRef.current.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    waypointIdx.current = bestIdx;
    isReversingRef.current = true;    // drive backwards from here
    arrivedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotRewindId]);

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

    // ── Autopilot: follow RECORDED_PATH, stop at target station ──────────────
    let autopilotMoved = false;
    if (!isManual && autopilotTarget !== null) {
      const AUTO_SPEED = 22;

      if (!arrivedRef.current) {
        // Check if we've reached the target station (works for both directions)
        const targetSt = STATIONS[autopilotTarget];
        const sdx = posRef.current.x - targetSt.x;
        const sdz = posRef.current.z - targetSt.z;
        const stationDist = Math.sqrt(sdx * sdx + sdz * sdz);

        if (stationDist < ARRIVE_DIST) {
          // Stop at this station
          isReversingRef.current = false;
          arrivedRef.current = true;
          speedRef.current   = 0;
          wheelOrRef.current = 0;
          onAutoArrived();
        } else if (isReversingRef.current) {
          // ── Reverse: walk BACKWARDS along RECORDED_PATH ─────────────────
          let budget = AUTO_SPEED * dt;
          let steerDx = 0, steerDz = 0;

          while (budget > 0.0001) {
            // Wrap around to end of path if we reach the beginning
            if (waypointIdx.current <= 0) {
              waypointIdx.current = RECORDED_PATH.length - 1;
            }
            const prevIdx = waypointIdx.current - 1;
            const wp  = RECORDED_PATH[Math.max(0, prevIdx)];
            const dx  = wp.x - posRef.current.x;
            const dz  = wp.z - posRef.current.z;
            const seg = Math.sqrt(dx * dx + dz * dz);

            if (seg < 0.0001) {
              waypointIdx.current--;
              continue;
            }

            steerDx = dx; steerDz = dz;

            if (seg <= budget) {
              posRef.current.x = wp.x;
              posRef.current.z = wp.z;
              budget -= seg;
              waypointIdx.current--;
            } else {
              posRef.current.x += (dx / seg) * budget;
              posRef.current.z += (dz / seg) * budget;
              budget = 0;
            }
          }

          if (Math.abs(steerDx) + Math.abs(steerDz) > 0.01) {
            const len         = Math.sqrt(steerDx * steerDx + steerDz * steerDz);
            const targetAngle = Math.atan2(-steerDx / len, -steerDz / len);
            const angleDiff   = normaliseAngle(targetAngle - carOrientRef.current);
            carOrientRef.current += angleDiff * Math.min(dt * 5, 1);
          }

          speedRef.current   = AUTO_SPEED / MOV_SCALE;
          wheelOrRef.current = THREE.MathUtils.lerp(wheelOrRef.current, 0, Math.min(dt * 4, 1));
        } else {
          // ── Forward: follow RECORDED_PATH in order ───────────────────────
          let budget = AUTO_SPEED * dt;        // world-units left to travel this frame
          let steerDx = 0, steerDz = 0;       // direction of the last segment moved

          while (budget > 0.0001) {
            if (waypointIdx.current >= RECORDED_PATH.length) {
              waypointIdx.current = 0;         // loop path
            }
            const wp  = RECORDED_PATH[waypointIdx.current];
            const dx  = wp.x - posRef.current.x;
            const dz  = wp.z - posRef.current.z;
            const seg = Math.sqrt(dx * dx + dz * dz);

            if (seg < 0.0001) {
              // Already at this waypoint — skip it
              waypointIdx.current++;
              continue;
            }

            steerDx = dx; steerDz = dz;       // remember steering direction

            if (seg <= budget) {
              // Consume entire segment — snap to waypoint and move on
              posRef.current.x = wp.x;
              posRef.current.z = wp.z;
              budget -= seg;
              waypointIdx.current++;
            } else {
              // Partial segment — move remaining budget and stop
              posRef.current.x += (dx / seg) * budget;
              posRef.current.z += (dz / seg) * budget;
              budget = 0;
            }
          }

          // Steer toward the current next waypoint (original behaviour)
          if (Math.abs(steerDx) + Math.abs(steerDz) > 0.01) {
            const len         = Math.sqrt(steerDx * steerDx + steerDz * steerDz);
            const targetAngle = Math.atan2(-steerDx / len, -steerDz / len);
            const angleDiff   = normaliseAngle(targetAngle - carOrientRef.current);
            carOrientRef.current += angleDiff * Math.min(dt * 5, 1);
          }

          speedRef.current   = AUTO_SPEED / MOV_SCALE;
          wheelOrRef.current = THREE.MathUtils.lerp(wheelOrRef.current, 0, Math.min(dt * 4, 1));
        }
      } else {
        // Already arrived — coast to a stop
        speedRef.current   = Math.max(0, speedRef.current - dt * DECEL);
        wheelOrRef.current = THREE.MathUtils.lerp(wheelOrRef.current, 0, Math.min(dt * 4, 1));
      }

      autopilotMoved = true;
    } else if (!isManual && autopilotTarget === null) {
      keys.up = false; keys.down = false; keys.left = false; keys.right = false;
    }

    if (!autopilotMoved) {
      // ── Speed (manual) ──────────────────────────────────────────────────────
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

      // ── Steering (manual) ───────────────────────────────────────────────────
      if (keys.left)  wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, MAX_STEER);
      if (keys.right) wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, -MAX_STEER, MAX_STEER);
      if (!keys.left && !keys.right) {
        if (wheelOrRef.current > 0) {
          wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, 0, MAX_STEER);
        } else {
          wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, 0);
        }
      }

      // ── Movement (manual) ───────────────────────────────────────────────────
      const forwardDelta = -speedRef.current * dt * MOV_SCALE;
      carOrientRef.current -= (forwardDelta * TURN_RAD * 0.02) * wheelOrRef.current;
      const newX = posRef.current.x + Math.sin(carOrientRef.current) * forwardDelta;
      const newZ = posRef.current.z + Math.cos(carOrientRef.current) * forwardDelta;
      const cx = clamp(newX, CITY_MIN_X, CITY_MAX_X);
      const cz = clamp(newZ, CITY_MIN_Z, CITY_MAX_Z);
      // Only run the (expensive) building raycaster when the car is actually
      // moving. At rest forwardDelta ≈ 0 so cx ≈ posRef.current.x and
      // cz ≈ posRef.current.z — the collision check would always pass anyway.
      // Skipping it when stationary eliminates two full scene-graph traversals
      // per frame, which was the primary cause of main-thread stalls that made
      // the cursor feel sluggish everywhere on the page.
      if (Math.abs(forwardDelta) > 0.001) {
        if (!isBuilding(cx, posRef.current.z, state.scene, carRef.current)) posRef.current.x = cx;
        if (!isBuilding(posRef.current.x, cz, state.scene, carRef.current)) posRef.current.z = cz;
      } else {
        posRef.current.x = cx;
        posRef.current.z = cz;
      }
    }

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

    // ── Project proximity ─────────────────────────────────────────────────────
    let nearest: number | null = null;
    let nearestClose: number | null = null;
    let minDist = Infinity;
    let minClose = Infinity;
    for (let i = 0; i < STATIONS.length; i++) {
      // Skip the RCCG station (last) until it has been unlocked by visiting Zennyola
      if (i === STATIONS.length - 1 && !rccgUnlocked) continue;
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
    const dx0 = posRef.current.x - RECORDED_PATH[0].x;
    const dz0 = posRef.current.z - RECORDED_PATH[0].z;
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

      {projects.map((p, i) => {
        // Hide the RCCG ground circle until unlocked
        if (i === projects.length - 1 && !rccgUnlocked) return null;
        return (
          <GroundCircle
            key={i}
            index={i}
            accent={p.accent}
            isNear={nearIdx  === i}
            isClose={closeIdx === i}
          />
        );
      })}

      <Suspense fallback={null}>
        <Car carRef={carRef} colors={carColors} theme={theme} />
      </Suspense>

      <fog attach="fog" args={[t.fogCol, t.fogNear, t.fogFar]} />
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────────
interface ProjectWorldProps {
  onNearProject:     (idx: number | null) => void;
  onAtBoundary:      (at: boolean) => void;
  onAutoArrived:     () => void;
  theme:             Theme;
  carColors:         CarColors;
  autopilotTarget:   number | null;
  autopilotTourId:   number;
  autopilotRewindId: number;
  isManual:          boolean;
  rccgUnlocked:      boolean;
}

export default function ProjectWorld({
  onNearProject, onAtBoundary, onAutoArrived,
  theme, carColors, autopilotTarget, autopilotTourId, autopilotRewindId, isManual, rccgUnlocked,
}: ProjectWorldProps) {
  const bg = THEMES[theme].bg;
  return (
    <Canvas
      camera={{
        position: [RECORDED_PATH[0].x, ROAD_Y + 8, RECORDED_PATH[0].z + 16],
        fov: 62, near: 0.5, far: 800,
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
        onAutoArrived={onAutoArrived}
        theme={theme}
        carColors={carColors}
        autopilotTarget={autopilotTarget}
        autopilotTourId={autopilotTourId}
        autopilotRewindId={autopilotRewindId}
        isManual={isManual}
        rccgUnlocked={rccgUnlocked}
      />
    </Canvas>
  );
}

useGLTF.preload("/models/ferrari.glb");
useGLTF.preload("/models/city.glb");
useGLTF.preload("/models/house.glb");
