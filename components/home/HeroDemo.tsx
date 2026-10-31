"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { avatarColor } from "@/components/ui/avatar";
import { tileColorClass } from "@/components/tiles/Tile";
import { cn } from "@/lib/utils";

interface DemoTile {
  word: string;
  category: string;
}

interface Demo {
  prompt: string;
  frame: string;
  tiles: DemoTile[];
  votes: { id: string; initials: string }[];
}

const DEMOS: Demo[] = [
  {
    prompt: "The zookeeper's daily report reads…",
    frame: "The __ escaped __ and is now __ the __",
    tiles: [
      { word: "flamingo", category: "noun" },
      { word: "at gunpoint", category: "filler" },
      { word: "haunting", category: "verb" },
      { word: "dentist", category: "noun" },
    ],
    votes: [
      { id: "demo-a", initials: "JO" },
      { id: "demo-b", initials: "SK" },
      { id: "demo-c", initials: "MR" },
    ],
  },
  {
    prompt: "Your boss walks in during your lunch break…",
    frame: "I was just __ the __ with my __",
    tiles: [
      { word: "microwaving", category: "verb" },
      { word: "intern", category: "noun" },
      { word: "grandma", category: "noun" },
    ],
    votes: [
      { id: "demo-d", initials: "AL" },
      { id: "demo-e", initials: "PT" },
      { id: "demo-f", initials: "RV" },
      { id: "demo-g", initials: "KC" },
    ],
  },
  {
    prompt: "Describe the secret ingredient.",
    frame: "Grandma's recipe calls for __ __ __ and love",
    tiles: [
      { word: "moist", category: "adjective" },
      { word: "cursed", category: "adjective" },
      { word: "lasagna", category: "noun" },
    ],
    votes: [
      { id: "demo-h", initials: "DB" },
      { id: "demo-i", initials: "NE" },
    ],
  },
];

const TILE_DELAY_MS = 650;
const VOTE_PAUSE_MS = 500;
const VOTE_STAGGER_MS = 280;
const HOLD_MS = 2_400;

/**
 * A miniature round on loop: the prompt appears, tiles fly into the blanks,
 * then the votes land on the finished sentence.
 */
export function HeroDemo() {
  const [demoIndex, setDemoIndex] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [votes, setVotes] = useState(0);
  const demo = DEMOS[demoIndex];
  const filled = placed >= demo.tiles.length;

  useEffect(() => {
    if (!filled) {
      const t = setTimeout(() => setPlaced((p) => p + 1), TILE_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (votes < demo.votes.length) {
      const t = setTimeout(() => setVotes((v) => v + 1), votes === 0 ? VOTE_PAUSE_MS : VOTE_STAGGER_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPlaced(0);
      setVotes(0);
      setDemoIndex((i) => (i + 1) % DEMOS.length);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [filled, votes, demo.votes.length]);

  const parts = demo.frame.split("__");
  const won = votes === demo.votes.length;

  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-xl rounded-2xl bg-white/5 border border-white/10 px-5 pt-4 pb-5 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={demoIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-center text-violet-200/80 text-sm mb-3">{demo.prompt}</p>

          <motion.div
            animate={won ? { scale: 1.02 } : { scale: 1 }}
            className={cn(
              "rounded-xl px-3 py-3 border transition-colors",
              won ? "border-yellow-400/50 bg-yellow-500/10" : "border-transparent"
            )}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xl font-semibold text-white leading-relaxed">
              {parts.map((part, i) => (
                <span key={i} className="contents">
                  {part
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w, j) => (
                      <span key={`${i}-${j}`}>{w}</span>
                    ))}
                  {i < parts.length - 1 && (
                    <span className="inline-flex items-center justify-center min-w-[88px] min-h-[40px] rounded-xl border-2 border-dashed border-white/25 align-middle">
                      <AnimatePresence>
                        {placed > i && (
                          <motion.span
                            key={demo.tiles[i].word}
                            initial={{ opacity: 0, y: 28, scale: 0.6, rotate: -8 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 420, damping: 24 }}
                            className={cn(
                              "inline-flex items-center px-3 py-1.5 rounded-xl border-2 text-base font-semibold shadow-md shadow-black/30 -m-0.5",
                              tileColorClass(demo.tiles[i].category)
                            )}
                          >
                            {demo.tiles[i].word}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="mt-3 h-8 flex items-center justify-center gap-2">
            <AnimatePresence>
              {demo.votes.slice(0, votes).map((v) => (
                <motion.span
                  key={v.id}
                  initial={{ opacity: 0, y: 12, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black text-white",
                    avatarColor(v.id)
                  )}
                >
                  {v.initials}
                </motion.span>
              ))}
            </AnimatePresence>
            <AnimatePresence>
              {votes > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn("text-sm font-bold ml-1", won ? "text-yellow-300" : "text-violet-200")}
                >
                  {won ? `${votes} votes · crowd favorite!` : `${votes} ${votes === 1 ? "vote" : "votes"}`}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
