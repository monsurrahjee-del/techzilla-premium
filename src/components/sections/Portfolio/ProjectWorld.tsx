"use client";

import { useRef, useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/lib/projects";

// ── Layout constants ────────────────────────────────────────────────────────
const ROAD_HALF  = 5;
const ROAD_LEN   = 240;
const P_Z        = [-32, -68, -104, -140, -176, -212];
const P_SIDE     = [ 1,  -1,    1,   -1,    1,   -1];
const STATION_X  = 17;

// ── Car color types ──────────────────────────────────────────────────────────
export type CarColors = {
  body:  string;
  rim:   string;
  glass: string;
  glassOpacity: number;
};

// ── Themes ──────────────────────────────────────────────────────────────────
export type Theme = "dark" | "light";

export type ThemeColors = {
  bg:           string;
  ground:       string;
  road:         string;
  sidewalk:     string;
  ambientInt:   number;
  ambientCol:   string;
  dirInt:       number;
  dirCol:       string;
  treeBase:     string;
  treeDark:     string;
  treeLight:    string;
  buildBody:    string;
  buildGlowInt: number;
  roofCol:      string;
  fogCol:       string;
  fogNear:      number;
  fogFar:       number;
  edgeStripe:   string;
  dashCol:      string;
  gateCol:      string;
};

const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bg:            "#050508",
    ground:        "#08080f",
    road:          "#171720",
    sidewalk:      "#111118",
    ambientInt:    0.12,
    ambientCol:    "#1a1a3a",
    dirInt:        0.25,
    dirCol:        "#8080b0",
    treeBase:      "#3a2410",
    treeDark:      "#142a14",
    treeLight:     "#1a351a",
    buildBody:     "#0e0e18",
    buildGlowInt:  0.12,
    roofCol:       "#1a1a28",
    fogCol:        "#050508",
    fogNear:       30,
    fogFar:        110,
    edgeStripe:    "#ffffff",
    dashCol:       "#ffffff",
    gateCol:       "#ffffff",
  },
  light: {
    bg:            "#c8e6f5",
    ground:        "#4a8a3c",
    road:          "#86878f",
    sidewalk:      "#9a9aaa",
    ambientInt:    2.5,
    ambientCol:    "#ffffff",
    dirInt:        1.5,
    dirCol:        "#fffde7",
    treeBase:      "#6b3a1f",
    treeDark:      "#2d7028",
    treeLight:     "#3d8c38",
    buildBody:     "#dce0f0",
    buildGlowInt:  0.55,
    roofCol:       "#c0c3d8",
    fogCol:        "#c8e6f5",
    fogNear:       50,
    fogFar:        200,
    edgeStripe:    "#cccccc",
    dashCol:       "#cccccc",
    gateCol:       "#ffffff",
  },
} as const;

// ── Pre-seeded random data ──────────────────────────────────────────────────
const mkRng = (seed: number) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
};

const TREE_DATA = (() => {
  const out: { x: number; z: number; scale: number }[] = [];
  const r = mkRng(42);
  for (let z = -8; z > -230; z -= 7) {
    const nearStation = P_Z.some((pz) => Math.abs(pz - z) < 18);
    const offset = r() * 3 + 0.5;
    const scale  = r() * 0.5 + 0.75;
    const scale2 = r() * 0.5 + 0.75;
    if (!nearStation) {
      out.push({ x: ROAD_HALF + 7 + offset,    z, scale });
      out.push({ x: -(ROAD_HALF + 7 + offset), z, scale: scale2 });
    }
  }
  return out;
})();

const BUILDING_DATA = (() => {
  const out: { x: number; z: number; w: number; h: number; d: number }[] = [];
  const r = mkRng(99);
  for (let z = -20; z > -230; z -= 22) {
    const nearStation = P_Z.some((pz) => Math.abs(pz - z) < 20);
    const w = r() * 3 + 3, h = r() * 10 + 5, d = r() * 3 + 3;
    const w2 = r() * 3 + 3, h2 = r() * 10 + 5, d2 = r() * 3 + 3;
    if (!nearStation) {
      out.push({ x:  ROAD_HALF + 16, z, w, h, d });
      out.push({ x: -(ROAD_HALF + 16), z, w: w2, h: h2, d: d2 });
    }
  }
  return out;
})();

// ── Sub-components ──────────────────────────────────────────────────────────

function Ground({ t }: { t: ThemeColors }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -110]}>
      <planeGeometry args={[220, ROAD_LEN + 20]} />
      <meshStandardMaterial color={t.ground} roughness={1} metalness={0} />
    </mesh>
  );
}

function Road({ t }: { t: ThemeColors }) {
  const dashes = useMemo(() => {
    const d: number[] = [];
    for (let z = -2; z > -230; z -= 9) d.push(z);
    return d;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -110]}>
        <planeGeometry args={[ROAD_HALF * 2, ROAD_LEN]} />
        <meshStandardMaterial color={t.road} roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-(ROAD_HALF + 0.35), 0.003, -110]}>
        <planeGeometry args={[0.25, ROAD_LEN]} />
        <meshStandardMaterial color={t.edgeStripe} emissive={t.edgeStripe} emissiveIntensity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_HALF + 0.35, 0.003, -110]}>
        <planeGeometry args={[0.25, ROAD_LEN]} />
        <meshStandardMaterial color={t.edgeStripe} emissive={t.edgeStripe} emissiveIntensity={0.15} />
      </mesh>
      {dashes.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, z]}>
          <planeGeometry args={[0.12, 4.5]} />
          <meshStandardMaterial color={t.dashCol} emissive={t.dashCol} emissiveIntensity={0.12} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_HALF + 2, 0.001, -110]}>
        <planeGeometry args={[4, ROAD_LEN]} />
        <meshStandardMaterial color={t.sidewalk} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-(ROAD_HALF + 2), 0.001, -110]}>
        <planeGeometry args={[4, ROAD_LEN]} />
        <meshStandardMaterial color={t.sidewalk} roughness={1} />
      </mesh>
    </group>
  );
}

function StreetLight({ z, side }: { z: number; side: number }) {
  const x   = side * (ROAD_HALF + 2.2);
  const arm = side * -1;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 5.6, 8]} />
        <meshStandardMaterial color="#5a5a6a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.25, 8]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[arm * 1.0, 5.5, 0]} rotation={[0, 0, arm * -0.22]}>
        <boxGeometry args={[2.1, 0.07, 0.07]} />
        <meshStandardMaterial color="#5a5a6a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[arm * 2.0, 5.38, 0]}>
        <boxGeometry args={[0.55, 0.22, 0.42]} />
        <meshStandardMaterial color="#222230" roughness={0.9} />
      </mesh>
      <mesh position={[arm * 2.0, 5.22, 0]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color="#ffeaa0" emissive="#ffd97a" emissiveIntensity={6} />
      </mesh>
      <pointLight position={[arm * 2.0, 5.1, 0]} color="#ffd97a" intensity={18} distance={20} decay={2} />
    </group>
  );
}

function Tree({ x, z, scale, t }: { x: number; z: number; scale: number; t: ThemeColors }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 2.0, 6]} />
        <meshStandardMaterial color={t.treeBase} roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.0, 0]}>
        <coneGeometry args={[0.9, 2.8, 7]} />
        <meshStandardMaterial color={t.treeDark} roughness={0.95} />
      </mesh>
      <mesh position={[0, 4.5, 0]}>
        <coneGeometry args={[0.6, 2.0, 7]} />
        <meshStandardMaterial color={t.treeLight} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Building({ x, z, w, h, d, t }: { x: number; z: number; w: number; h: number; d: number; t: ThemeColors }) {
  const glowCol = useMemo(() => {
    const cols = ["#ffe89a", "#a8d4ff", "#c0e0ff", "#fff8dc"];
    return cols[Math.floor((Math.abs(x) + Math.abs(z)) % cols.length)];
  }, [x, z]);

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={t.buildBody} roughness={0.9} metalness={0.25} />
      </mesh>
      <mesh position={[0, h * 0.5, d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.55, h * 0.55, 0.05]} />
        <meshStandardMaterial color="#000" emissive={glowCol} emissiveIntensity={t.buildGlowInt} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, h + 0.06, 0]}>
        <boxGeometry args={[w + 0.1, 0.12, d + 0.1]} />
        <meshStandardMaterial color={t.roofCol} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function StartGate({ t }: { t: ThemeColors }) {
  // Gate is placed well behind the car spawn point (spawn: z=5) so it never
  // appears around the car in the opening view.
  return (
    <group position={[0, 0, -8]}>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[ROAD_HALF * 2 + 2, 0.18, 0.45]} />
        <meshStandardMaterial color={t.gateCol} emissive={t.gateCol} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[-(ROAD_HALF + 1.2), 1.6, 0]}>
        <boxGeometry args={[0.18, 3.2, 0.45]} />
        <meshStandardMaterial color={t.gateCol} emissive={t.gateCol} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[ROAD_HALF + 1.2, 1.6, 0]}>
        <boxGeometry args={[0.18, 3.2, 0.45]} />
        <meshStandardMaterial color={t.gateCol} emissive={t.gateCol} emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, 3.2, 0]} color="#ffffff" intensity={8} distance={14} decay={2} />
    </group>
  );
}

function EndMarker() {
  return (
    <group position={[0, 0, -222]}>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[ROAD_HALF * 2 + 2, 0.18, 0.45]} />
        <meshStandardMaterial color="#ff3366" emissive="#ff3366" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-(ROAD_HALF + 1.2), 1.6, 0]}>
        <boxGeometry args={[0.18, 3.2, 0.45]} />
        <meshStandardMaterial color="#ff3366" emissive="#ff3366" emissiveIntensity={3} />
      </mesh>
      <mesh position={[ROAD_HALF + 1.2, 1.6, 0]}>
        <boxGeometry args={[0.18, 3.2, 0.45]} />
        <meshStandardMaterial color="#ff3366" emissive="#ff3366" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0, 3.2, 0]} color="#ff3366" intensity={18} distance={18} decay={2} />
    </group>
  );
}

function ProjectStation({
  index,
  accent,
  isNear,
  t,
}: {
  index:  number;
  accent: string;
  isNear: boolean;
  t:      ThemeColors;
}) {
  const z    = P_Z[index];
  const side = P_SIDE[index];
  const x    = side * STATION_X;

  const glowRef  = useRef<THREE.PointLight>(null!);
  const ringRef  = useRef<THREE.Mesh>(null!);
  const frameRef = useRef<THREE.Mesh>(null!);
  const tmr      = useRef(0);

  useFrame((_, delta) => {
    tmr.current += delta;
    if (glowRef.current)
      glowRef.current.intensity = (isNear ? 40 : 12) + Math.sin(tmr.current * 1.8) * 5;
    if (ringRef.current)
      ringRef.current.rotation.y += delta * (isNear ? 1.4 : 0.45);
    if (frameRef.current)
      (frameRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        (isNear ? 4.0 : 1.2) + Math.sin(tmr.current * 2.5) * 0.6;
  });

  const edgeX      = side > 0 ? ROAD_HALF + 0.5 : -(ROAD_HALF + 0.5);
  const connW      = Math.abs(x) - ROAD_HALF - 1.0;
  const connCenterX = edgeX + side * (connW / 2);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[connCenterX, 0.001, z]}>
        <planeGeometry args={[connW, 5.5]} />
        <meshStandardMaterial color={t.road} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[connCenterX, 0.004, z]}>
        <planeGeometry args={[connW, 0.32]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isNear ? 1.8 : 0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[connCenterX, 0.004, z + 2.5]}>
        <planeGeometry args={[connW, 0.12]} />
        <meshStandardMaterial color={t.edgeStripe} emissive={t.edgeStripe} emissiveIntensity={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[connCenterX, 0.004, z - 2.5]}>
        <planeGeometry args={[connW, 0.12]} />
        <meshStandardMaterial color={t.edgeStripe} emissive={t.edgeStripe} emissiveIntensity={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, z]}>
        <circleGeometry args={[6.5, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.1} transparent opacity={0.38} />
      </mesh>
      <mesh ref={ringRef} position={[x, 4.2, z]}>
        <torusGeometry args={[4.5, 0.08, 8, 52]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} />
      </mesh>
      <mesh position={[x, 2.5, z - 0.5]}>
        <cylinderGeometry args={[0.1, 0.14, 5, 8]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[x, 5.6, z - 0.5]}>
        <boxGeometry args={[6.0, 3.6, 0.18]} />
        <meshStandardMaterial color="#06060e" roughness={0.9} metalness={0.2} />
      </mesh>
      <mesh position={[x, 5.6, z - 0.36]}>
        <boxGeometry args={[5.6, 3.2, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isNear ? 0.08 : 0.22} transparent opacity={0.18} />
      </mesh>
      <mesh ref={frameRef} position={[x, 5.6, z - 0.28]}>
        <boxGeometry args={[6.2, 3.8, 0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[x, 5.6, z - 0.26]}>
        <circleGeometry args={[0.7, 28]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={4} />
      </mesh>
      <pointLight ref={glowRef} position={[x, 2.5, z]} color={accent} intensity={12} distance={26} decay={2} />
    </group>
  );
}

// ── Ferrari 458 GLB Car ───────────────────────────────────────────────────────
// Wheel animation matches CarControls.js (shliamin/JS-3D-Car) exactly:
//
//   setupWheels():
//     - frontLeftWheelRoot  = wheel_fl  (the GLB node — steers on Z axis)
//     - frontLeftWheel      = new Group (children moved here — rolls on X axis)
//     frontLeftWheelRoot.add(frontLeftWheel)
//
//   update():
//     frontLeftWheel.rotation.x   -= wheelDelta        (rolling, via inner group)
//     frontLeftWheelRoot.rotation.z = wheelOrientation  (steering, via outer node)
//     backLeftWheel.rotation.x    -= wheelDelta         (rolling only, no steering)
//
// The rim meshes (rim_fl etc.) are children of their wheel nodes and therefore
// rotate automatically — they must NOT be animated separately.
// ─────────────────────────────────────────────────────────────────────────────

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

  // Outer wheel ROOT nodes — receive steering rotation on Z axis (CarControls.js wheelTurnAxis='z')
  const wheelFLRoot = useRef<THREE.Object3D | null>(null);
  const wheelFRRoot = useRef<THREE.Object3D | null>(null);

  // Inner Groups (children of wheel root moved here) — receive rolling rotation on X axis
  // Persistent refs so the groups aren't recreated on re-render
  const flInner = useRef(new THREE.Group());
  const frInner = useRef(new THREE.Group());

  // Rear wheels — rolling only, no steering
  const wheelRL = useRef<THREE.Object3D | null>(null);
  const wheelRR = useRef<THREE.Object3D | null>(null);

  const { scene: gltfScene } = useGLTF("/models/ferrari.glb");
  const carScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

  // ── Mirror CarControls.js setupWheels() ───────────────────────────────────
  useEffect(() => {
    const flRoot = carScene.getObjectByName("wheel_fl");
    const frRoot = carScene.getObjectByName("wheel_fr");

    wheelFLRoot.current = flRoot ?? null;
    wheelFRRoot.current = frRoot ?? null;
    wheelRL.current     = carScene.getObjectByName("wheel_rl") ?? null;
    wheelRR.current     = carScene.getObjectByName("wheel_rr") ?? null;

    // Separate rolling from steering — exactly CarControls.js setupWheels():
    //   while (frontLeftWheelRoot.children.length > 0)
    //     frontLeftWheel.add(frontLeftWheelRoot.children[0]);
    //   frontLeftWheelRoot.add(frontLeftWheel);
    if (flRoot) {
      const inner = flInner.current;
      while (inner.children.length > 0) inner.remove(inner.children[0]); // clear stale children if remounted
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

  // ── Apply car colours ──────────────────────────────────────────────────────
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

    // ── Wheel rolling — CarControls.js formula ────────────────────────────
    // Car moves: Δpos = spd * dt * MOV_SCALE  (world units per frame)
    // Wheel rotates: Δθ = Δpos / wheel_radius = Δpos * 2 / wheel_diameter
    // At scale 1.8 the ferrari wheel diameter ≈ 0.55 * 1.8 = 0.99 world units
    // Subtract angDelta so forward motion → front of wheel descends (correct roll)
    const MOV_SCALE  = 0.07;   // must match Scene's MOV_SCALE
    const WHEEL_DIAM = 0.99;   // world units: model ~0.55 * scale 1.8
    const angDelta   = (spd * dt * MOV_SCALE) * (2 / WHEEL_DIAM);

    // Inner groups (front) and direct nodes (rear) — rolling on X axis
    flInner.current.rotation.x -= angDelta;
    frInner.current.rotation.x -= angDelta;
    if (wheelRL.current) wheelRL.current.rotation.x -= angDelta;
    if (wheelRR.current) wheelRR.current.rotation.x -= angDelta;

    // ── Steering — wheelTurnAxis = 'z' (CarControls.js default for ferrari.glb) ─
    // frontAxleRef carries the steer angle in its .rotation.y (set by Scene's useFrame)
    const steer = frontAxleRef.current?.rotation.y ?? 0;
    if (wheelFLRoot.current) wheelFLRoot.current.rotation.z = steer;
    if (wheelFRRoot.current) wheelFRRoot.current.rotation.z = steer;
  });

  return (
    <group ref={carRef}>
      {/* Steer-angle data carrier — zero geometry, invisible */}
      <group ref={frontAxleRef} />

      {/* Ferrari 458 Italia GLB */}
      <primitive object={carScene} scale={[1.8, 1.8, 1.8]} position={[0, 0.01, 0]} />

      {/* AO contact shadow — sized to match car footprint at scale 1.8.
          color="black" prevents white fringing on transparent texture edges. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={2}>
        <planeGeometry args={[4.72, 9.36]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.75} depthWrite={false} color="black" />
      </mesh>

      {/* Headlight beams — only in dark theme */}
      {theme === "dark" && (
        <>
          <pointLight position={[0.52,  0.38, -2.0]} color="#fffadc" intensity={80} distance={32} decay={2} />
          <pointLight position={[-0.52, 0.38, -2.0]} color="#fffadc" intensity={80} distance={32} decay={2} />
          <pointLight position={[0,     0.60, -5.0]} color="#ffffff"  intensity={50} distance={25} decay={2} />
        </>
      )}
    </group>
  );
}

// ── Billboard 3-D → 2-D Projector ──────────────────────────────────────────
export type BillboardPos = { x: number; y: number; w: number; h: number; visible: boolean };

function BillboardProjector({
  onProject,
}: {
  onProject: (positions: BillboardPos[]) => void;
}) {
  const { camera, size } = useThree();
  const prev = useRef<string>("");

  useFrame(() => {
    const out: BillboardPos[] = P_Z.map((pz, i) => {
      const bx = P_SIDE[i] * STATION_X;
      const by = 5.6;
      const bz = pz - 0.45;

      const center = new THREE.Vector3(bx, by, bz).project(camera);
      if (center.z >= 1) return { x: 0, y: 0, w: 0, h: 0, visible: false };

      const screenX = ((center.x + 1) / 2) * size.width;
      const screenY = ((-center.y + 1) / 2) * size.height;

      const lv = new THREE.Vector3(bx - 2.8, by, bz).project(camera);
      const rv = new THREE.Vector3(bx + 2.8, by, bz).project(camera);
      const w  = Math.abs(((rv.x - lv.x) / 2) * size.width);
      const h  = w * 0.57;

      const visible = center.z > -1 && Math.abs(center.x) < 1.8 && Math.abs(center.y) < 1.8 && w > 20;
      return { x: screenX, y: screenY, w, h, visible };
    });

    const key = out.map(p => `${p.visible ? 1 : 0},${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.w)}`).join("|");
    if (key !== prev.current) {
      prev.current = key;
      onProject(out);
    }
  });

  return null;
}

// ── Main scene ───────────────────────────────────────────────────────────────
// Physics ported from JS-3D-Car's CarControls.js
// ─────────────────────────────────────────────────────────────────────────────
interface SceneProps {
  onNearProject:     (idx: number | null) => void;
  onBillboardPos:    (pos: BillboardPos[]) => void;
  onAtBoundary:      (at: boolean) => void;
  theme:             Theme;
  carColors:         CarColors;
}

// Helper from CarControls.js — eases deceleration
const expEaseOut = (k: number) => (k === 1 ? 1 : -Math.pow(2, -10 * k) + 1);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function Scene({ onNearProject, onBillboardPos, onAtBoundary, theme, carColors }: SceneProps) {
  const t = THEMES[theme];

  const carRef        = useRef<THREE.Group>(null!);
  const posRef        = useRef({ x: 0, z: 5 });
  const carOrientRef  = useRef(0);           // yaw — mirrors CarControls.carOrientation
  const speedRef      = useRef(0);           // in CarControls speed units (km/h scale)
  const wheelOrRef    = useRef(0);           // steering angle (rad)
  const keysRef       = useRef({ up: false, down: false, left: false, right: false });
  const camPosRef     = useRef(new THREE.Vector3(0, 14, 20));
  const camLookRef    = useRef(new THREE.Vector3(0, 0.5, 0));
  const curProjectRef    = useRef<number | null>(null);
  const atBoundaryRef    = useRef(false);
  const [nearIdx, setNearIdx] = useState<number | null>(null);

  // ── CarControls.js constants — matched to JS-3D-Car feel ─────────────────
  const MAX_SPEED   = 200;          // matches JS-3D-Car maxSpeed
  const MAX_SPD_REV = -50;          // matches JS-3D-Car maxSpeedReverse
  const ACCEL       = 80;           // fast launch feel — JS-3D-Car uses 60, boosted for this world
  const ACCEL_REV   = 40;           // ≈ acceleration * 0.5
  const DECEL       = 70;           // snappy coast-down
  const BRAKE_POW   = 10;           // multiplied with DECEL on brake
  const STEER_SPD   = 1.5;          // rad/s (CarControls: steeringWheelSpeed)
  const MAX_STEER   = 0.6;          // rad  (CarControls: maxSteeringRotation)
  const TURN_RAD    = 22;           // (CarControls: turningRadius; scaled for our world)
  const MOV_SCALE   = 0.07;         // world-unit multiplier — higher = faster visual movement

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
      const ce = e as CustomEvent;
      keysRef.current[ce.detail.key as keyof typeof keysRef.current] = ce.detail.pressed;
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

    // ── Speed — CarControls.js update() logic ───────────────────────────────
    if (keys.up) {
      speedRef.current = clamp(speedRef.current + dt * ACCEL, MAX_SPD_REV, MAX_SPEED);
    }
    if (keys.down) {
      speedRef.current = clamp(speedRef.current - dt * ACCEL_REV, MAX_SPD_REV, MAX_SPEED);
    }
    if (!keys.up && !keys.down) {
      // Normal coast-down: no brakePower multiplier (CarControls.js: brakingDeceleration=1 by default,
      // only becomes brakePower when brake key is held). Using BRAKE_POW here made stops violent.
      if (speedRef.current > 0) {
        const k = expEaseOut(speedRef.current / MAX_SPEED);
        speedRef.current = clamp(speedRef.current - k * dt * DECEL, 0, MAX_SPEED);
      } else {
        const k = expEaseOut(speedRef.current / MAX_SPD_REV);
        speedRef.current = clamp(speedRef.current + k * dt * ACCEL_REV, MAX_SPD_REV, 0);
      }
    }

    // ── Steering — accumulates & decays (CarControls.js) ───────────────────
    if (keys.left) {
      wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, MAX_STEER);
    }
    if (keys.right) {
      wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, -MAX_STEER, MAX_STEER);
    }
    if (!keys.left && !keys.right) {
      if (wheelOrRef.current > 0) {
        wheelOrRef.current = clamp(wheelOrRef.current - dt * STEER_SPD, 0, MAX_STEER);
      } else {
        wheelOrRef.current = clamp(wheelOrRef.current + dt * STEER_SPD, -MAX_STEER, 0);
      }
    }

    // ── Movement — CarControls.js convention ───────────────────────────────
    // forwardDelta is negative when moving forward (car drives in -Z at orientation 0)
    const forwardDelta = -speedRef.current * dt * MOV_SCALE;

    // Orientation change: matches CarControls line
    //   carOrientation -= (forwardDelta * turningRadius * 0.02) * wheelOrientation
    carOrientRef.current -= (forwardDelta * TURN_RAD * 0.02) * wheelOrRef.current;

    posRef.current.x += Math.sin(carOrientRef.current) * forwardDelta;
    posRef.current.z += Math.cos(carOrientRef.current) * forwardDelta;

    // Bounds
    posRef.current.x = clamp(posRef.current.x, -55, 55);
    posRef.current.z = clamp(posRef.current.z, -225, 8);

    // ── Sync car mesh ───────────────────────────────────────────────────────
    if (carRef.current) {
      carRef.current.position.set(posRef.current.x, 0, posRef.current.z);
      carRef.current.rotation.y = carOrientRef.current;  // no PI offset — front is at -Z
      const sr = (carRef as any).__speedRef;
      if (sr) sr.current = speedRef.current;
    }

    // ── Visual front-wheel steer (matches frontAxle convention) ────────────
    const fa = (carRef as any).__frontAxle;
    if (fa?.current) {
      fa.current.rotation.y = wheelOrRef.current;  // positive = left, same sign as carOrientation increase
    }

    // ── Camera — follows from +Z (behind car whose front is at -Z) ─────────
    const camDist   = 16;
    const camHeight = 12;
    const camTarget = new THREE.Vector3(
      posRef.current.x + Math.sin(carOrientRef.current) * camDist,
      camHeight,
      posRef.current.z + Math.cos(carOrientRef.current) * camDist
    );
    // Increased lerp factors for noticeably smoother camera tracking
    camPosRef.current.lerp(camTarget, 0.10);
    state.camera.position.copy(camPosRef.current);

    const lookTarget = new THREE.Vector3(posRef.current.x, 0.6, posRef.current.z);
    camLookRef.current.lerp(lookTarget, 0.14);
    state.camera.lookAt(camLookRef.current);

    // ── Project proximity ───────────────────────────────────────────────────
    let nearest: number | null = null;
    for (let i = 0; i < P_Z.length; i++) {
      if (Math.abs(posRef.current.z - P_Z[i]) < 14) { nearest = i; break; }
    }
    if (nearest !== curProjectRef.current) {
      curProjectRef.current = nearest;
      setNearIdx(nearest);
      onNearProject(nearest);
    }

    // ── Boundary detection — show colour panel at start or end ─────────────
    const atBoundary = posRef.current.z >= 6 || posRef.current.z <= -222;
    if (atBoundary !== atBoundaryRef.current) {
      atBoundaryRef.current = atBoundary;
      onAtBoundary(atBoundary);
    }
  });

  const lights = useMemo(() => {
    const arr: { z: number; side: number }[] = [];
    for (let z = 4; z > -230; z -= 22) {
      arr.push({ z, side: 1 });
      arr.push({ z: z - 11, side: -1 });
    }
    return arr;
  }, []);

  return (
    <>
      <ambientLight intensity={t.ambientInt} color={t.ambientCol} />
      <directionalLight position={[25, 40, 15]} intensity={t.dirInt} color={t.dirCol} castShadow={false} />

      <Ground t={t} />
      <Road   t={t} />
      <StartGate t={t} />
      <EndMarker />

      {lights.map((l, i) => (
        <StreetLight key={i} z={l.z} side={l.side} />
      ))}
      {TREE_DATA.map((tr, i) => (
        <Tree key={i} x={tr.x} z={tr.z} scale={tr.scale} t={t} />
      ))}
      {BUILDING_DATA.map((b, i) => (
        <Building key={i} x={b.x} z={b.z} w={b.w} h={b.h} d={b.d} t={t} />
      ))}
      {projects.map((p, i) => (
        <ProjectStation key={i} index={i} accent={p.accent} isNear={nearIdx === i} t={t} />
      ))}

      <Suspense fallback={null}>
        <Car carRef={carRef} colors={carColors} theme={theme} />
      </Suspense>

      <BillboardProjector onProject={onBillboardPos} />

      <fog attach="fog" args={[t.fogCol, t.fogNear, t.fogFar]} />
    </>
  );
}

// ── Exported component ───────────────────────────────────────────────────────
interface ProjectWorldProps {
  onNearProject:  (idx: number | null) => void;
  onBillboardPos: (pos: BillboardPos[]) => void;
  onAtBoundary:   (at: boolean) => void;
  theme:          Theme;
  carColors:      CarColors;
}

export default function ProjectWorld({ onNearProject, onBillboardPos, onAtBoundary, theme, carColors }: ProjectWorldProps) {
  const bg = THEMES[theme].bg;
  return (
    <Canvas
      camera={{ position: [0, 14, 20], fov: 62, near: 0.1, far: 220 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      dpr={[0.75, 1]}
      performance={{ min: 0.5 }}
      flat
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
