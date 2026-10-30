"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { tileColorClass } from "@/components/tiles/Tile";
import { cn } from "@/lib/utils";

interface DemoTile {
  word: string;
  category: string;
}

interface Demo {
  frame: string;
  tiles: DemoTile[];
}

const DEMOS: Demo[] = [
  {
    frame: "The __ escaped __ and is now __ the __",
    tiles: [
      { word: "flamingo", category: "noun" },
      { word: "at gunpoint", category: "filler" },
      { word: "haunting", category: "verb" },
      { word: "dentist", category: "noun" },
    ],
  },
  {
    frame: "I was just __ the __ with my __",
    tiles: [
      { word: "microwaving", category: "verb" },
      { word: "intern", category: "noun" },
      { word: "grandma", category: "noun" },
    ],
  },
  {
    frame: "Grandma's recipe calls for __ __ __ and love",
    tiles: [
      { word: "moist", category: "adjective" },
      { word: "cursed", category: "adjective" },
      { word: "lasagna", category: "noun" },
    ],
  },
];

const TILE_DELAY_MS = 700;
const HOLD_MS = 2_600;

/** Assembles an absurd sentence tile by tile, then moves on to the next one. */
export function HeroDemo() {
  const [demoIndex, setDemoIndex] = useState(0);
  const [placed, setPlaced] = useState(0);
  const demo = DEMOS[demoIndex];

  useEffect(() => {
    if (placed < demo.tiles.length) {
      const t = setTimeout(() => setPlaced((p) => p + 1), TILE_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPlaced(0);
      setDemoIndex((i) => (i + 1) % DEMOS.length);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [placed, demo.tiles.length]);

  const parts = demo.frame.split("__");

  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-xl rounded-2xl bg-white/5 border border-white/10 px-5 py-5 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={demoIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xl font-semibold text-white leading-relaxed"
        >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
