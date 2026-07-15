"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useParallax } from "@/hooks/useParallax";

import ShowcaseFrame from "./ShowcaseFrame";
import BrowserContent from "./BrowserContent";
import ProjectInfo from "./ProjectInfo";
import Reflection from "./Reflection";
import TransitionOverlay from "./TransitionOverlay";

import { projects } from "@/lib/projects";

import styles from "./Showcase.module.css";

export default function Showcase() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useParallax(wrapperRef, 15);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const frame = frameRef.current;
    const reflection = reflectionRef.current;

    if (!wrapper || !frame || !reflection) return;

    // Floating animation
    const float = gsap.timeline({
      repeat: -1,
      yoyo: true,
    });

    float.to(wrapper, {
      y: -12,
      duration: 3,
      ease: "sine.inOut",
    });

    // Mouse interaction
    const move = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();

      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rotateY = (x - 0.5) * 18;
      const rotateX = (0.5 - y) * 18;

      gsap.to(frame, {
        rotateX,
        rotateY,
        duration: 0.8,
        ease: "power3.out",
        transformPerspective: 1800,
        transformOrigin: "center center",
      });

      gsap.to(reflection, {
        x: (x - 0.5) * 80,
        y: (y - 0.5) * 60,
        duration: 1,
        ease: "power3.out",
      });
    };

    const leave = () => {
      gsap.to(frame, {
        rotateX: 0,
        rotateY: 0,
        duration: 1,
        ease: "power3.out",
      });

      gsap.to(reflection, {
        x: 0,
        y: 0,
        duration: 1,
        ease: "power3.out",
      });
    };

    wrapper.addEventListener("mousemove", move);
    wrapper.addEventListener("mouseleave", leave);

    // Change projects
    const interval = setInterval(() => {
      gsap.to(frame, {
        opacity: 0,
        scale: 0.96,
        rotateX: 8,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => {
            const overlay = overlayRef.current;

if (overlay) {

  gsap.fromTo(
    overlay,
    {
      opacity: 0,
      x: "-120%",
    },
    {
      opacity: 1,
      x: "120%",
      duration: 0.7,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(overlay, {
          opacity: 0,
          x: "-120%",
        });
      },
    }
  );

}
          setIndex((prev) => (prev + 1) % projects.length);

          gsap.fromTo(
            frame,
            {
              opacity: 0,
              scale: 0.94,
              rotateX: -8,
            },
            {
              opacity: 1,
              scale: 1,
              rotateX: 0,
              duration: 0.9,
              ease: "power4.out",
            }
          );
        },
      });
    }, 6000);

    return () => {
      wrapper.removeEventListener("mousemove", move);
      wrapper.removeEventListener("mouseleave", leave);

      clearInterval(interval);

      float.kill();
    };
  }, []);

  const project = projects[index];

  return (
    <div
      ref={wrapperRef}
      className={styles.showcase}
      style={
        {
          "--accent": project.accent,
          "--glow": project.glow,
        } as React.CSSProperties
      }
    >
      <ShowcaseFrame ref={frameRef} url={project.url}>
        <BrowserContent
          image={project.image}
          title={project.title}
        />
      </ShowcaseFrame>

<TransitionOverlay ref={overlayRef} />

      <Reflection ref={reflectionRef} />

      <ProjectInfo
        title={project.title}
        category={project.category}
        tech={project.tech}
      />
    </div>
  );
}