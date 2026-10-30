"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  value: number;
  durationMs?: number;
  className?: string;
}

/** Animates from 0 to `value` once, then follows later changes directly. */
export function CountUp({ value, durationMs = 600, className }: CountUpProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setShown(0);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{shown}</span>;
}
