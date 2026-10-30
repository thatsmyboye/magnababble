"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useRemainingMs(endsAt: string | null | undefined, tickMs = 250): number {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const interval = setInterval(tick, tickMs);
    return () => clearInterval(interval);
  }, [endsAt, tickMs]);

  return remaining;
}

interface TimerProps {
  endsAt: string | null;
  className?: string;
}

export function Timer({ endsAt, className }: TimerProps) {
  const remainingMs = useRemainingMs(endsAt, 500);
  if (!endsAt) return null;
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <span
      role="timer"
      aria-live="off"
      className={cn(
        "tabular-nums font-bold",
        seconds <= 10 && "text-amber-300",
        seconds <= 5 && "text-red-400 animate-pulse",
        className
      )}
    >
      {seconds}s
    </span>
  );
}

interface TimerBarProps {
  endsAt: string | null;
  durationMs: number;
  className?: string;
}

/** Thin progress bar that drains as the phase runs out. */
export function TimerBar({ endsAt, durationMs, className }: TimerBarProps) {
  const remainingMs = useRemainingMs(endsAt, 200);
  if (!endsAt || durationMs <= 0) return null;

  const fraction = Math.min(1, Math.max(0, remainingMs / durationMs));
  const seconds = remainingMs / 1000;

  return (
    <div
      aria-hidden
      className={cn("h-1 w-full rounded-full bg-white/10 overflow-hidden", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-200 ease-linear",
          seconds <= 5 ? "bg-red-400" : seconds <= 10 ? "bg-amber-300" : "bg-violet-400"
        )}
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
}
