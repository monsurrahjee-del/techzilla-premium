import { gsap } from "@/lib/gsap";

interface Elements {
  logo: HTMLElement;
  progress: HTMLElement;
  noise: HTMLElement;
}

export function createParallax({
  logo,
  progress,
  noise,
}: Elements) {
  const move = (e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    gsap.to(logo, {
      x: x * 25,
      y: y * 25,
      rotateY: x * 12,
      rotateX: -y * 12,
      duration: 0.8,
      ease: "power3.out",
      transformPerspective: 1000,
      transformOrigin: "center",
    });

    gsap.to(progress, {
      x: x * 18,
      y: y * 18,
      duration: 1,
      ease: "power3.out",
    });

    gsap.to(noise, {
      x: x * 40,
      y: y * 40,
      duration: 1.5,
      ease: "power3.out",
    });
  };

  window.addEventListener("mousemove", move);

  return () => {
    window.removeEventListener("mousemove", move);
  };
}