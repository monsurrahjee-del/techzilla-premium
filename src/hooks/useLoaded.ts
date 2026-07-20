"use client";

import { useEffect, useState } from "react";

/**
 * Fires once when the Loader dispatches the global "techzillaReady" event.
 * Safe to call in multiple components — they all respond to the same event.
 * Also handles the HMR / late-mount case via the module-level flag.
 */

let _fired = false;

if (typeof window !== "undefined") {
  window.addEventListener("techzillaReady", () => { _fired = true; }, { once: true });
}

export function useLoaded(): boolean {
  const [loaded, setLoaded] = useState(_fired);

  useEffect(() => {
    if (_fired) { setLoaded(true); return; }
    const fn = () => { _fired = true; setLoaded(true); };
    window.addEventListener("techzillaReady", fn, { once: true });
    return () => window.removeEventListener("techzillaReady", fn);
  }, []);

  return loaded;
}
