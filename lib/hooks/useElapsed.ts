"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds elapsed since `startIso`, ticking until `untilMs` has passed.
 * Driven by the shared phase clock so every client sees the same reveal.
 */
export function useElapsed(startIso: string | null | undefined, untilMs: number, tickMs = 100): number {
  const [elapsed, setElapsed] = useState(() =>
    startIso ? Math.max(0, Date.now() - new Date(startIso).getTime()) : 0
  );

  useEffect(() => {
    if (!startIso) return;
    const start = new Date(startIso).getTime();
    const tick = () => setElapsed(Math.max(0, Date.now() - start));
    tick();
    const interval = setInterval(() => {
      tick();
      if (Date.now() - start > untilMs) clearInterval(interval);
    }, tickMs);
    return () => clearInterval(interval);
  }, [startIso, untilMs, tickMs]);

  return elapsed;
}
