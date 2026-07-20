import { gsap } from "@/lib/gsap";

interface Elements {
  logo: HTMLElement;
  progress: HTMLElement;
  noise: HTMLElement;
}

/**
 * Creates per-element quickTo setters so each mousemove event fires a single
 * tween update rather than spawning a new 0.8–1.5 s gsap.to() tween.
 * Without quickTo, hundreds of overlapping tweens stack up, causing
 * increasing lag that survives section changes.
 */
export function createParallax({ logo, progress, noise }: Elements) {
  // One-time static properties that quickTo can't carry
  gsap.set(logo, { transformPerspective: 1000, transformOrigin: "center" });

  // quickTo setters — one per animated property, reused on every mousemove
  const logoX  = gsap.quickTo(logo,     "x",       { duration: 0.1, ease: "power3.out" });
  const logoY  = gsap.quickTo(logo,     "y",       { duration: 0.1, ease: "power3.out" });
  const logoRY = gsap.quickTo(logo,     "rotateY", { duration: 0.1, ease: "power3.out" });
  const logoRX = gsap.quickTo(logo,     "rotateX", { duration: 0.1, ease: "power3.out" });

  const progX  = gsap.quickTo(progress, "x",       { duration: 0.1, ease: "power3.out" });
  const progY  = gsap.quickTo(progress, "y",       { duration: 0.1, ease: "power3.out" });

  const noiseX = gsap.quickTo(noise,    "x",       { duration: 0.1, ease: "power3.out" });
  const noiseY = gsap.quickTo(noise,    "y",       { duration: 0.1, ease: "power3.out" });

  // Skip GSAP work when Hero is no longer the primary section.
  let heroActive = true;
  const onHeroActive = (e: Event) => {
    heroActive = (e as CustomEvent<{ heroActive: boolean }>).detail.heroActive;
  };
  window.addEventListener("hero-section-active", onHeroActive);

  const move = (e: MouseEvent) => {
    if (!heroActive) return;
    const x = (e.clientX / window.innerWidth  - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    logoX(x * 25);  logoY(y * 25);
    logoRY(x * 12); logoRX(-y * 12);

    progX(x * 18);  progY(y * 18);

    noiseX(x * 40); noiseY(y * 40);
  };

  window.addEventListener("mousemove", move);
  return () => {
    window.removeEventListener("mousemove",           move);
    window.removeEventListener("hero-section-active", onHeroActive);
  };
}
