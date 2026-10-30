"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TileProps {
  /** Draggable id (may be prefixed when the same tile also appears elsewhere). */
  id: string;
  word: string;
  category: string;
  /** Shared layout id so the tile visibly flies between the hand and a slot. */
  layoutId?: string;
  placed?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  noun: "bg-blue-600 border-blue-400",
  verb: "bg-emerald-600 border-emerald-400",
  adjective: "bg-amber-600 border-amber-400",
  adverb: "bg-rose-600 border-rose-400",
  filler: "bg-purple-600 border-purple-400",
  glue: "bg-slate-600 border-slate-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  filler: "phrase",
  glue: "glue word",
};

export function tileColorClass(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-600 border-slate-400";
}

export function tileCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export const TILE_BASE_CLASS =
  "inline-flex items-center min-h-[44px] px-3.5 py-2 rounded-xl border-2 text-white text-base font-semibold select-none touch-none shadow-sm shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950";

export function Tile({
  id,
  word,
  category,
  layoutId,
  placed,
  disabled,
  selected,
  onClick,
}: TileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled: disabled || placed,
    data: { word, category },
  });

  // A placed tile leaves an outline behind in the hand; the real chip now
  // lives in the sentence (same layoutId, so it animates across).
  if (placed) {
    return (
      <span
        aria-hidden
        className={cn(
          TILE_BASE_CLASS,
          "border-dashed border-white/20 bg-transparent text-white/25 shadow-none scale-95"
        )}
      >
        {word}
      </span>
    );
  }

  return (
    <motion.button
      ref={setNodeRef}
      layoutId={layoutId}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${word}, ${tileCategoryLabel(category)}${selected ? ", selected" : ""}`}
      data-tile={word}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      whileHover={disabled ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        TILE_BASE_CLASS,
        "cursor-grab",
        tileColorClass(category),
        isDragging && "opacity-40",
        selected && "ring-2 ring-white ring-offset-2 ring-offset-indigo-950",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {word}
    </motion.button>
  );
}

/** The floating copy shown under the pointer while dragging. */
export function TileGhost({ word, category }: { word: string; category?: string }) {
  return (
    <div
      className={cn(
        TILE_BASE_CLASS,
        "shadow-2xl shadow-black/50 scale-110 rotate-2 cursor-grabbing",
        category ? tileColorClass(category) : "bg-violet-600 border-violet-400"
      )}
    >
      {word}
    </div>
  );
}
