"use client";

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import './TargetCursor.css';

// ─── No containing-block helpers needed anymore ────────────────────────────────
// The wrapper is positioned with transform:translate3d(x,y,0) directly in
// mousemove — viewport coords are used throughout. GSAP never writes to the
// wrapper, so there is no RAF-cycle delay on cursor position.
// ──────────────────────────────────────────────────────────────────────────────

interface TargetCursorProps {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
  cursorColor?: string;
  cursorColorOnTarget?: string;
}

const TargetCursor = ({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true,
  cursorColor = '#ffffff',
  cursorColorOnTarget
}: TargetCursorProps) => {
  // wrapper — only ever moved by moveCursor (transform: translate3d).
  // GSAP never touches this element.
  const cursorRef = useRef<HTMLDivElement>(null);

  // spinner — GSAP owns this for rotation only.
  const spinnerRef = useRef<HTMLDivElement>(null);

  const cornersRef = useRef<NodeListOf<Element> | null>(null);
  const spinTl = useRef<gsap.core.Timeline | null>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  // Viewport coords of the cursor — used by tickerFn, scrollHandler, enterHandler.
  // Updated in moveCursor only. Pure viewport coords; no containing-block math.
  const cursorPosRef = useRef({ x: 0, y: 0 });

  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef<{ x: number; y: number }[] | null>(null);
  const tickerFnRef = useRef<(() => void) | null>(null);
  const activeStrengthRef = useRef({ current: 0 });

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || navigator.vendor;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  }, []);

  const constants = useMemo(
    () => ({
      borderWidth: 3,
      cornerSize: 12
    }),
    []
  );

  // Move the cursor wrapper using a GPU-composited transform only.
  // GSAP never writes to cursorRef — spin is handled by spinnerRef (a child).
  // This means no RAF conflict: position is always exactly where the mouse is.
  const moveCursor = useCallback((x: number, y: number) => {
    if (!cursorRef.current) return;
    cursorPosRef.current = { x, y };
    cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  useEffect(() => {
    if (isMobile || !cursorRef.current || !spinnerRef.current) return;

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) {
      document.body.style.cursor = 'none';
    }

    const cursor  = cursorRef.current;
    const spinner = spinnerRef.current;
    cornersRef.current = spinner.querySelectorAll('.target-cursor-corner');

    let activeTarget: Element | null = null;
    let currentLeaveHandler: (() => void) | null = null;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;

    const cleanupTarget = (target: Element) => {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler);
      }
      currentLeaveHandler = null;
    };

    // ── Initial position ───────────────────────────────────────────────────
    const initX = window.innerWidth / 2;
    const initY = window.innerHeight / 2;
    cursorPosRef.current = { x: initX, y: initY };
    cursor.style.transform = `translate3d(${initX}px, ${initY}px, 0)`;

    // ── Spin animation — ONLY on the spinner child, never on cursor wrapper ─
    const createSpinTimeline = () => {
      if (spinTl.current) {
        spinTl.current.kill();
      }
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(spinner, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    };

    createSpinTimeline();

    // ── Ticker: animate corners toward target element while hovering ───────
    const tickerFn = () => {
      if (!targetCornerPositionsRef.current || !spinnerRef.current || !cornersRef.current) {
        return;
      }

      const strength = activeStrengthRef.current.current;
      if (strength === 0) return;

      const cursorX = cursorPosRef.current.x;
      const cursorY = cursorPosRef.current.y;

      const corners = Array.from(cornersRef.current) as HTMLElement[];
      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x') as number;
        const currentY = gsap.getProperty(corner, 'y') as number;

        // targetCornerPositionsRef stores raw viewport coords.
        // cursorPosRef also stores raw viewport coords.
        // Delta = how far the corner should be offset from the cursor wrapper origin.
        const targetX = targetCornerPositionsRef.current![i].x - cursorX;
        const targetY = targetCornerPositionsRef.current![i].y - cursorY;

        const finalX = currentX + (targetX - currentX) * strength;
        const finalY = currentY + (targetY - currentY) * strength;

        const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto'
        });
      });
    };

    tickerFnRef.current = tickerFn;

    // ── Event handlers ─────────────────────────────────────────────────────
    const moveHandler = (e: MouseEvent) => moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return;
      // cursorPosRef is already in viewport coords — use directly.
      const elementUnderMouse = document.elementFromPoint(
        cursorPosRef.current.x,
        cursorPosRef.current.y
      );
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget ||
          elementUnderMouse.closest(targetSelector) === activeTarget);
      if (!isStillOverTarget && currentLeaveHandler) {
        currentLeaveHandler();
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    const mouseDownHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      // Scale the spinner only — GSAP owns it for transforms.
      // Never scale cursorRef (the wrapper): its transform is set by JS via
      // style.transform = translate3d(x,y,0), and a GSAP scale on the same
      // element would overwrite that, causing the cursor to jump to (0,0).
      gsap.to(spinner, { scale: 0.9, duration: 0.2 });
    };

    const mouseUpHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(spinner, { scale: 1, duration: 0.2 });
    };

    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    // ── Enter / hover target ───────────────────────────────────────────────
    const enterHandler = (e: MouseEvent) => {
      const directTarget = e.target as Element;
      const allTargets: Element[] = [];
      let current: Element | null = directTarget;
      while (current && current !== document.body) {
        if (current.matches(targetSelector)) {
          allTargets.push(current);
        }
        current = current.parentElement;
      }
      const target = allTargets[0] || null;
      if (!target || !cursorRef.current || !cornersRef.current) return;
      if (activeTarget === target) return;
      if (activeTarget) {
        cleanupTarget(activeTarget);
      }
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      const corners = Array.from(cornersRef.current) as HTMLElement[];
      corners.forEach(corner => gsap.killTweensOf(corner, 'x,y'));

      gsap.killTweensOf(spinner, 'rotation');
      spinTl.current?.pause();
      gsap.set(spinner, { rotation: 0 });

      if (cursorColorOnTarget) {
        gsap.to(corners, {
          borderColor: cursorColorOnTarget,
          duration: 0.15,
          ease: 'power2.out'
        });
        if (dotRef.current) {
          gsap.to(dotRef.current, {
            backgroundColor: cursorColorOnTarget,
            duration: 0.15,
            ease: 'power2.out'
          });
        }
      }

      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;

      // All positions in raw viewport coords.
      const cursorX = cursorPosRef.current.x;
      const cursorY = cursorPosRef.current.y;

      targetCornerPositionsRef.current = [
        { x: rect.left  - borderWidth,               y: rect.top    - borderWidth },
        { x: rect.right + borderWidth - cornerSize,   y: rect.top    - borderWidth },
        { x: rect.right + borderWidth - cornerSize,   y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left  - borderWidth,               y: rect.bottom + borderWidth - cornerSize }
      ];

      isActiveRef.current = true;
      gsap.ticker.add(tickerFnRef.current!);

      gsap.to(activeStrengthRef.current, {
        current: 1,
        duration: hoverDuration,
        ease: 'power2.out'
      });

      corners.forEach((corner, i) => {
        gsap.to(corner, {
          x: targetCornerPositionsRef.current![i].x - cursorX,
          y: targetCornerPositionsRef.current![i].y - cursorY,
          duration: 0.2,
          ease: 'power2.out'
        });
      });

      // ── Leave target ─────────────────────────────────────────────────────
      const leaveHandler = () => {
        gsap.ticker.remove(tickerFnRef.current!);

        isActiveRef.current = false;
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrengthRef.current, { current: 0, overwrite: true });
        activeTarget = null;

        if (cursorColorOnTarget && cornersRef.current) {
          gsap.to(Array.from(cornersRef.current) as HTMLElement[], {
            borderColor: cursorColor,
            duration: 0.15,
            ease: 'power2.out'
          });
          if (dotRef.current) {
            gsap.to(dotRef.current, {
              backgroundColor: cursorColor,
              duration: 0.15,
              ease: 'power2.out'
            });
          }
        }

        if (cornersRef.current) {
          const cs = Array.from(cornersRef.current) as HTMLElement[];
          gsap.killTweensOf(cs, 'x,y');
          const { cornerSize } = constants;
          const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x:  cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x:  cornerSize * 0.5, y:  cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y:  cornerSize * 0.5 }
          ];
          const tl = gsap.timeline();
          cs.forEach((corner, index) => {
            tl.to(corner, {
              x: positions[index].x,
              y: positions[index].y,
              duration: 0.3,
              ease: 'power3.out'
            }, 0);
          });
        }

        resumeTimeout = setTimeout(() => {
          if (!activeTarget && spinnerRef.current && spinTl.current) {
            const currentRotation = gsap.getProperty(spinner, 'rotation') as number;
            const normalizedRotation = currentRotation % 360;
            spinTl.current.kill();
            spinTl.current = gsap
              .timeline({ repeat: -1 })
              .to(spinner, { rotation: '+=360', duration: spinDuration, ease: 'none' });
            gsap.to(spinner, {
              rotation: normalizedRotation + 360,
              duration: spinDuration * (1 - normalizedRotation / 360),
              ease: 'none',
              onComplete: () => {
                spinTl.current?.restart();
              }
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    };

    window.addEventListener('mouseover', enterHandler as EventListener, { passive: true });

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      if (tickerFnRef.current) {
        gsap.ticker.remove(tickerFnRef.current);
      }

      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler as EventListener);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);

      if (activeTarget) {
        cleanupTarget(activeTarget);
      }

      spinTl.current?.kill();
      document.body.style.cursor = originalCursor;

      isActiveRef.current = false;
      targetCornerPositionsRef.current = null;
      activeStrengthRef.current.current = 0;
    };
  }, [
    targetSelector,
    spinDuration,
    moveCursor,
    constants,
    hideDefaultCursor,
    isMobile,
    hoverDuration,
    parallaxOn,
    cursorColor,
    cursorColorOnTarget
  ]);

  useEffect(() => {
    if (isMobile || !spinnerRef.current || !spinTl.current) return;
    if (spinTl.current.isActive()) {
      spinTl.current.kill();
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(spinnerRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    }
  }, [spinDuration, isMobile]);

  if (isMobile) {
    return null;
  }

  return (
    // cursorRef: positioning only — transform:translate3d set in mousemove.
    // GSAP never touches this element.
    <div ref={cursorRef} className="target-cursor-wrapper">
      {/* spinnerRef: GSAP owns rotation only, never position */}
      <div ref={spinnerRef} className="target-cursor-spinner">
        <div ref={dotRef} className="target-cursor-dot" style={{ backgroundColor: cursorColor }} />
        <div className="target-cursor-corner corner-tl" style={{ borderColor: cursorColor }} />
        <div className="target-cursor-corner corner-tr" style={{ borderColor: cursorColor }} />
        <div className="target-cursor-corner corner-br" style={{ borderColor: cursorColor }} />
        <div className="target-cursor-corner corner-bl" style={{ borderColor: cursorColor }} />
      </div>
    </div>
  );
};

export default TargetCursor;
