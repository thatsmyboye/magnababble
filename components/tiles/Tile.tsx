"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface TileProps {
  /** Draggable id (may be prefixed when the same tile also appears elsewhere). */
  id: string;
  word: string;
  category: string;
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

export function tileColorClass(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-600 border-slate-400";
}

export function Tile({ id, word, category, placed, disabled, selected, onClick }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: disabled || placed,
    data: { word, category },
  });

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-lg border text-white text-sm font-semibold cursor-grab select-none transition-all touch-none",
        tileColorClass(category),
        isDragging && "opacity-50 scale-105 z-50",
        placed && "opacity-30 cursor-default",
        selected && "ring-2 ring-white scale-105",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {word}
    </button>
  );
}

/** The floating copy shown under the pointer while dragging. */
export function TileGhost({ word }: { word: string }) {
  return (
    <div className="px-3 py-1.5 rounded-lg bg-violet-600 border border-violet-400 text-white text-sm font-semibold shadow-xl">
      {word}
    </div>
  );
}
