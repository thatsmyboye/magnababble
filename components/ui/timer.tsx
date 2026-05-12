"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerProps {
  endsAt: string | null;
  className?: string;
}

export function Timer({ endsAt, className }: TimerProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endsAt) return;

    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) return null;

  return (
    <span
      className={cn(
        "tabular-nums font-bold",
        remaining <= 10 && "text-red-400 animate-pulse",
        className
      )}
    >
      {remaining}s
    </span>
  );
}
