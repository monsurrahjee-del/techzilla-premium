import { gsap } from "@/lib/gsap";
import { loaderTimeline } from "./timeline";
import { splitText } from "./split";

interface LoaderElements {
  logo: HTMLElement;
  progress: HTMLElement;
  overlay: HTMLElement;
  wipe: HTMLElement;
}

export function buildLoaderAnimation({
  logo,
  progress,
  overlay,
  wipe,
}: LoaderElements) {
  loaderTimeline.clear();

  const split = splitText(logo);

  loaderTimeline

    // Logo letters
    .from(split.chars, {
      opacity: 0,
      y: 120,
      rotateX: -90,
      stagger: 0.04,
      duration: 1.1,
      ease: "power4.out",
    })

    // Progress
    .from(
      progress,
      {
        opacity: 0,
        y: 30,
      },
      "-=.6"
    )

    // Floating logo
    .to(
      split.chars,
      {
        y: -8,
        stagger: 0.05,
        repeat: -1,
        yoyo: true,
        duration: 1.8,
        ease: "sine.inOut",
      },
      "<"
    );

  return loaderTimeline;
}