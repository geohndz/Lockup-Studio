"use client";

import { useEffect, useState } from "react";

/** `null` until mounted — avoids SSR/client mismatch. */
export function useMinWidth(minWidthPx: number): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [minWidthPx]);

  return matches;
}
