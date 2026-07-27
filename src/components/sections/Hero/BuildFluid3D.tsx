/* eslint-disable react/no-unknown-property */
"use client";

import { useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, createPortal } from "@react-three/fiber";
import { Text3D, Center, Environment, useFBO } from "@react-three/drei";

// THREE.ACESFilmicToneMapping = 4  (avoids importing three which has no bundled types)
const ACESFilmicToneMapping = 4;

// Track mouse globally so canvas can stay pointer-events:none
// (avoids blocking nav / headline interaction)
const _mouse = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "mousemove",
    (e) => {
      _mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      _mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true }
  );
}

// Module-level ref so BuildMesh can react to the hero-section-active event
// without creating per-render closures. Starts true (hero is the first section).
let _heroActive = true;
if (typeof window !== "undefined") {
  window.addEventListener(
    "hero-section-active",
    (e) => { _heroActive = (e as CustomEvent<{ heroActive: boolean }>).detail.heroActive; },
    { passive: true }
  );
}

// Render-active flag — set to false via "build-fluid-3d-active" event when the
// hero theme switches away from light. This stops the expensive FBO loop
// immediately (before AnimatePresence finishes its 0.9 s exit animation) so
// the compositor thread isn't starved by GPU work the user can't even see.
// Starts true: the canvas only mounts when theme === "light".
let _shouldRender = true;
if (typeof window !== "undefined") {
  window.addEventListener(
    "build-fluid-3d-active",
    (e) => { _shouldRender = (e as CustomEvent<{ active: boolean }>).detail.active; },
    { passive: true }
  );
}

// ─── Background scene rendered to FBO ──────────────────────────────────────
// What's in this scene gets refracted through the glass text — the coloured
// lights give the letters their deep blue + iridescent glow when viewed
// from different angles, exactly like the haoqi.design "hello" effect.
function BgScene({ scene }: { scene: any }) {
  return createPortal(
    <>
      <color attach="background" args={["#050508"]} />
      {/* Rich blue atmosphere the glass refracts */}
      <pointLight position={[0, 0, 4]} intensity={60} color="#3355ff" />
      <pointLight position={[-6, 4, 2]} intensity={40} color="#9966ff" />
      <pointLight position={[6, -3, 1]} intensity={40} color="#0088ff" />
      <pointLight position={[0, -6, 3]} intensity={30} color="#4411bb" />
      {/* Large emissive plane the letters distort */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#050510" emissive="#1122aa" emissiveIntensity={0.6} />
      </mesh>
    </>,
    scene
  ) as React.ReactNode;
}

// ─── The 3-D "build" mesh ───────────────────────────────────────────────────
function BuildMesh() {
  const groupRef = useRef<any>(null!);
  const buffer = useFBO();
  const bgScene = useRef<any>(null);
  // Tracks the last time a full render was performed — used to throttle to
  // ~30 fps so the expensive FBO double-pass doesn't saturate the GPU while
  // SplashCursor's fluid sim is also running.
  const lastRenderTime = useRef(0);

  // When the hero section becomes active again, kick-start the render loop.
  // With frameloop="demand" the loop stops as soon as useFrame stops calling
  // invalidate(); listening here restarts it.
  const { invalidate } = useThree();
  useEffect(() => {
    const handler = (e: Event) => {
      const { heroActive } = (e as CustomEvent<{ heroActive: boolean }>).detail;
      if (heroActive && _shouldRender) invalidate();
    };
    // Re-kick the loop when the theme switches back to light while the canvas
    // is already mounted (e.g. user toggles light → dark → light rapidly).
    const onBuildActive = (e: Event) => {
      if ((e as CustomEvent<{ active: boolean }>).detail.active) invalidate();
    };
    window.addEventListener("hero-section-active",  handler,       { passive: true });
    window.addEventListener("build-fluid-3d-active", onBuildActive, { passive: true });
    return () => {
      window.removeEventListener("hero-section-active",  handler);
      window.removeEventListener("build-fluid-3d-active", onBuildActive);
    };
  }, [invalidate]);

  // Lazily create the scene once on the client
  if (typeof window !== "undefined" && bgScene.current === null) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Scene } = require("three") as { Scene: new () => any };
    bgScene.current = new Scene();
  }

  useFrame(({ gl, camera, clock, invalidate }) => {
    if (!groupRef.current || !bgScene.current) return;

    // Stop all rendering when:
    //   _heroActive=false → hero scrolled out of view
    //   _shouldRender=false → theme switched away from light; the AnimatePresence
    //     exit animation keeps this Canvas mounted for ~0.9 s after the theme
    //     changes, so we must stop here rather than waiting for unmount.
    if (!_heroActive || !_shouldRender) return;

    // Throttle to ~30 fps — halves the GPU load vs 60 fps while keeping the
    // glass animation visually smooth.  The FBO double-pass (background scene →
    // glass refraction) is expensive; 30 fps is imperceptible on this effect.
    const elapsed = clock.getElapsedTime();
    const FRAME_BUDGET = 1 / 30;
    if (elapsed - lastRenderTime.current < FRAME_BUDGET) {
      invalidate(); // keep the loop scheduled, skip heavy work this tick
      return;
    }
    lastRenderTime.current = elapsed;

    // Weighted mouse follow — stiffness makes it feel physical, not linear
    groupRef.current.rotation.y +=
      (_mouse.x * 0.55 - groupRef.current.rotation.y) * 0.055;
    groupRef.current.rotation.x +=
      (-_mouse.y * 0.32 - groupRef.current.rotation.x) * 0.055;

    // Slow idle float
    groupRef.current.position.y =
      Math.sin(clock.getElapsedTime() * 0.6) * 0.12;

    // Render the bg scene into the FBO buffer — this is what the glass refracts
    gl.setRenderTarget(buffer);
    gl.render(bgScene.current, camera);
    gl.setRenderTarget(null);

    // Keep the loop alive while the hero is active.
    invalidate();
  });

  if (!bgScene.current) return null;

  return (
    <>
      <BgScene scene={bgScene.current} />
      <group ref={groupRef}>
        <Center>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={3.8}
            height={0.72}
            bevelEnabled
            bevelThickness={0.10}
            bevelSize={0.055}
            bevelSegments={14}
            curveSegments={22}
          >
            build
            {/*
             * MeshPhysicalMaterial gives the real liquid-glass look:
             * - transmission: light passes through (glass opacity)
             * - ior: index of refraction — bends background through the glass
             * - iridescence: thin-film interference → rainbow edge fringing
             * - clearcoat: glossy top coat for mirror-sharp reflections
             * - attenuationColor: deep blue cast thickens in the extrusion depth
             */}
            <meshPhysicalMaterial
              color="#0d23d9"
              roughness={0.0}
              metalness={0.0}
              clearcoat={1.0}
              clearcoatRoughness={0.0}
              transmission={0.88}
              thickness={1.4}
              ior={1.52}
              iridescence={1.0}
              iridescenceIOR={2.1}
              iridescenceThicknessRange={[120, 800] as [number, number]}
              attenuationColor="#0f2dff"
              attenuationDistance={0.9}
              reflectivity={1.0}
              envMapIntensity={3.5}
            />
          </Text3D>
        </Center>
      </group>
    </>
  );
}

// ─── Canvas wrapper ─────────────────────────────────────────────────────────
export default function BuildFluid3D() {
  return (
    <Canvas
      // frameloop="demand" means R3F only renders when invalidate() is called.
      // BuildMesh calls invalidate() inside useFrame while the hero is active,
      // creating a self-sustaining loop. When the hero leaves the viewport the
      // loop drains to zero, freeing the GPU and main-thread budget for other
      // sections (Our Work 3-D city, About WebGL, etc.).
      frameloop="demand"
      camera={{ position: [0, 0, 10], fov: 44 }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
      }}
      dpr={1}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        {/* City HDR gives sharp, realistic specular + environment reflections */}
        <Environment preset="city" />

        {/* Key light — bright bluish from upper-right, creates the main specular */}
        <directionalLight position={[6, 10, 7]} intensity={6} color="#8899ff" />
        {/* Rim light — white from left fills the shadow side */}
        <directionalLight position={[-7, 3, 5]} intensity={3.5} color="#ffffff" />
        {/* Cool under-fill */}
        <directionalLight position={[0, -6, 6]} intensity={2} color="#5566ff" />
        {/* Point lights add hot-spots that move as text rotates */}
        <pointLight position={[4,  4, 6]} intensity={20} color="#aabbff" distance={14} />
        <pointLight position={[-5, 2, 7]} intensity={12} color="#ddeeff" distance={12} />
        <pointLight position={[1, -3, 8]} intensity={8}  color="#6677dd" distance={10} />

        <BuildMesh />
      </Suspense>
    </Canvas>
  );
}
