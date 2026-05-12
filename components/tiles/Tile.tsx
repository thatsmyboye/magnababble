"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface TileProps {
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
};

export function Tile({ id, word, category, placed, disabled, selected, onClick }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: disabled || placed,
    data: { word, category },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const colorClass = CATEGORY_COLORS[category] ?? "bg-slate-600 border-slate-400";

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-lg border text-white text-sm font-semibold cursor-grab select-none transition-all touch-none",
        colorClass,
        isDragging && "opacity-50 scale-105 z-50",
        placed && "opacity-40 cursor-not-allowed",
        selected && "ring-2 ring-white scale-105",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {word}
    </button>
  );
}
