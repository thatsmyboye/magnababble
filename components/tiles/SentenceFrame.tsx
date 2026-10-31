"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { tileColorClass } from "@/components/tiles/Tile";
import { hintClass, hintLabel } from "@/lib/game/tile-style";
import { tileLayoutId } from "@/components/tiles/TileHand";
import { cn } from "@/lib/utils";
import type { TileData } from "@/lib/game/types";

interface SlotProps {
  slotIndex: number;
  slotCount: number;
  tile: TileData | null;
  onClick?: () => void;
  highlighted?: boolean;
  /** The blank the next tapped tile will land in. */
  isNext?: boolean;
  /** Soft hint: the kind of word this blank expects. Any tile still fits. */
  hint?: string | null;
}

function Slot({ slotIndex, slotCount, tile, onClick, highlighted, isNext, hint }: SlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { slotIndex },
  });

  const hintText = hintLabel(hint);
  const position = `Blank ${slotIndex + 1} of ${slotCount}${hintText ? `, ${/^[aeiou]/.test(hintText) ? "an" : "a"} ${hintText} fits` : ""}`;
  const label = tile
    ? `${position}: ${tile.word}. Press to remove.`
    : highlighted || isNext
    ? `${position}, empty, next. Press a tile to fill it.`
    : `${position}, empty. Press to choose this blank next.`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      data-slot-empty={tile ? undefined : ""}
      title={tile ? "Click to remove" : "Drop a tile here"}
      className={cn(
        "relative inline-flex items-center justify-center min-w-[96px] min-h-[44px] rounded-xl border-2 border-dashed mx-1 align-middle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950",
        tile
          ? "border-transparent p-0"
          : cn("border-white/30 text-white/30 hover:border-white/50 hover:bg-white/5", hintClass(hint)),
        isNext && !tile && !highlighted && "border-violet-300 bg-violet-500/15 shadow-[0_0_16px_rgba(167,139,250,0.45)] animate-pulse",
        isOver && !tile && "border-violet-400 bg-violet-900/40 scale-105",
        highlighted && !tile && "border-yellow-400 bg-yellow-900/20 animate-pulse"
      )}
    >
      {tile ? (
        <motion.span
          layoutId={tileLayoutId(tile.id)}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className={cn(
            "inline-flex items-center min-h-[44px] px-3.5 py-2 rounded-xl border-2 text-white text-base font-semibold shadow-md shadow-black/30 group",
            tileColorClass(tile.category)
          )}
        >
          {tile.word}
          <span aria-hidden className="ml-2 text-white/60 text-xs">
            ✕
          </span>
        </motion.span>
      ) : (
        <span aria-hidden className={cn("px-3", hintText ? "text-xs font-semibold" : "text-sm tracking-widest")}>
          {hintText ?? "______"}
        </span>
      )}
    </button>
  );
}

interface SentenceFrameProps {
  frame: string;
  placements: (TileData | null)[];
  onSlotClick?: (slotIndex: number) => void;
  selectedSlotIndex?: number | null;
  nextSlotIndex?: number | null;
  hints?: (string | null)[] | null;
}

export function SentenceFrame({
  frame,
  placements,
  onSlotClick,
  selectedSlotIndex,
  nextSlotIndex,
  hints,
}: SentenceFrameProps) {
  const parts = frame.split("__");
  const slotCount = parts.length - 1;
  let slotIndex = 0;

  const elements: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (part) {
      // Keep each word unbreakable so the sentence wraps at natural points.
      part
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word, j) => {
          // Punctuation right after a blank ("__, condition") sits against it.
          const hugsBlank = i > 0 && j === 0 && /^[,.;:!?)]/.test(part);
          elements.push(
            <span
              key={`text-${i}-${j}`}
              className={cn("text-white text-2xl font-semibold", hugsBlank && "-ml-2.5")}
            >
              {word}
            </span>
          );
        });
    }

    if (i < parts.length - 1) {
      const idx = slotIndex;
      elements.push(
        <Slot
          key={`slot-${idx}`}
          slotIndex={idx}
          slotCount={slotCount}
          tile={placements[idx] ?? null}
          onClick={() => onSlotClick?.(idx)}
          highlighted={selectedSlotIndex === idx}
          isNext={nextSlotIndex === idx}
          hint={hints?.[idx] ?? null}
        />
      );
      slotIndex++;
    }
  });

  return (
    <div
      role="group"
      aria-label="Sentence to complete"
      className="bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-center"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 leading-relaxed">
        {elements}
      </div>
    </div>
  );
}
