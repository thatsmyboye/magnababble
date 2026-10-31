"use client";

import { AnimatePresence, motion } from "framer-motion";
import { REACTIONS, useReactions, type Particle } from "@/lib/realtime/reactions";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  "😂": "Laugh",
  "🔥": "Fire",
  "💀": "Dead",
  "👏": "Applause",
  "😮": "Shocked",
  "🙈": "Cringe",
};

/**
 * Emoji reactions during voting and results: a bar of buttons pinned to the
 * bottom, and reactions from everyone in the room floating up the screen.
 */
export function Reactions({ code, active }: { code: string; active: boolean }) {
  const { particles, send } = useReactions(code, active);
  if (!active) return null;

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <FloatingEmoji key={p.id} particle={p} />
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none">
        <div
          role="toolbar"
          aria-label="React"
          className="pointer-events-auto flex gap-1 rounded-full bg-indigo-950/90 border border-white/15 px-2 py-1.5 shadow-2xl shadow-black/50 backdrop-blur"
        >
          {REACTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              aria-label={`React: ${LABELS[emoji]}`}
              data-reaction={emoji}
              onClick={() => send(emoji)}
              whileTap={{ scale: 1.35 }}
              className="w-11 h-11 rounded-full text-2xl leading-none flex items-center justify-center hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}

function FloatingEmoji({ particle }: { particle: Particle }) {
  const drift = (particle.id % 2 === 0 ? 1 : -1) * (10 + (particle.id % 5) * 6);
  return (
    <motion.span
      data-particle={particle.emoji}
      initial={{ y: 0, x: 0, opacity: 0, scale: 0.6 }}
      animate={{ y: -420, x: drift, opacity: [0, 1, 1, 0], scale: particle.mine ? 1.25 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.2, ease: "easeOut" }}
      className={cn("absolute bottom-20 text-4xl select-none", particle.mine && "drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]")}
      style={{ left: `${particle.x}%` }}
    >
      {particle.emoji}
    </motion.span>
  );
}
