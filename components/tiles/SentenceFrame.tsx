"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface SlotProps {
  slotIndex: number;
  word: string | null;
  onClick?: () => void;
  highlighted?: boolean;
}

function Slot({ slotIndex, word, onClick, highlighted }: SlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { slotIndex },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center min-w-[80px] px-3 py-1 rounded-lg border-2 border-dashed text-sm font-semibold transition-all mx-1",
        word
          ? "bg-violet-600 border-violet-400 text-white cursor-pointer hover:bg-red-600 hover:border-red-400"
          : "border-white/30 text-white/30",
        isOver && !word && "border-violet-400 bg-violet-900/40 scale-105",
        highlighted && !word && "border-yellow-400 bg-yellow-900/20"
      )}
      title={word ? "Click to remove" : "Drop a tile here"}
    >
      {word ?? "______"}
    </button>
  );
}

interface SentenceFrameProps {
  frame: string;
  placements: (string | null)[];
  onSlotClick?: (slotIndex: number) => void;
  selectedSlotIndex?: number | null;
}

export function SentenceFrame({
  frame,
  placements,
  onSlotClick,
  selectedSlotIndex,
}: SentenceFrameProps) {
  const parts = frame.split("__");
  let slotIndex = 0;

  const elements: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (part) {
      elements.push(
        <span key={`text-${i}`} className="text-white text-xl font-medium">
          {part}
        </span>
      );
    }

    if (i < parts.length - 1) {
      const idx = slotIndex;
      elements.push(
        <Slot
          key={`slot-${idx}`}
          slotIndex={idx}
          word={placements[idx] ?? null}
          onClick={() => onSlotClick?.(idx)}
          highlighted={selectedSlotIndex === idx}
        />
      );
      slotIndex++;
    }
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center leading-loose">
      <div className="flex flex-wrap items-center justify-center gap-y-3">
        {elements}
      </div>
    </div>
  );
}
