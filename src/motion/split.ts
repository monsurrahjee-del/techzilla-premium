import SplitType from "split-type";
import { gsap } from "@/lib/gsap";

export function splitText(element: HTMLElement) {
  // Reset if it was previously split
  element.removeAttribute("data-splitted");

  const split = new SplitType(element, {
    types: "chars",
    tagName: "span",
  });

  gsap.set(split.chars, {
    display: "inline-block",
    transformOrigin: "50% 100%",
    willChange: "transform, opacity",
  });

  return split;
}