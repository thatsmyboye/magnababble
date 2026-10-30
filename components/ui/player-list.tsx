"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  score: number;
  is_host: boolean;
}

interface PlayerListProps {
  players: Player[];
  highlightId?: string;
  showScores?: boolean;
  className?: string;
}

export function PlayerList({ players, highlightId, showScores = false, className }: PlayerListProps) {
  return (
    <ul className={cn("space-y-2", className)}>
      <AnimatePresence initial={false}>
        {players.map((p) => (
          <motion.li
            key={p.id}
            layout
            initial={{ opacity: 0, x: -24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2",
              p.id === highlightId ? "bg-violet-600 text-white" : "bg-white/10 text-white/80"
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Avatar id={p.id} name={p.name} size="sm" />
              <span className="font-medium truncate">
                {p.name}
                {p.id === highlightId && <span className="ml-2 text-xs text-violet-200">(you)</span>}
                {p.is_host && <span className="ml-2 text-xs text-yellow-300">host</span>}
              </span>
            </span>
            {showScores && (
              <span className="font-bold text-violet-200 tabular-nums shrink-0">
                {p.score} {p.score === 1 ? "pt" : "pts"}
              </span>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
