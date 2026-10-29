"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SentenceFrame } from "@/components/tiles/SentenceFrame";
import { TileHand } from "@/components/tiles/TileHand";
import { TileGhost } from "@/components/tiles/Tile";
import { Button } from "@/components/ui/button";
import { countSlots } from "@/lib/game/scoring";
import type { TileData } from "@/lib/game/types";

interface FrameComposerProps {
  frame: string;
  hand: TileData[];
  onSubmit: (words: string[]) => void;
  submitting: boolean;
  error?: string;
}

/** Fill-in-the-blanks composer: drag tiles into slots, or tap tile then slot. */
export function FrameComposer({ frame, hand, onSubmit, submitting, error }: FrameComposerProps) {
  const slotCount = countSlots(frame);

  // placements[slotIndex] = tile id or null
  const [placements, setPlacements] = useState<(string | null)[]>(() =>
    Array(slotCount).fill(null)
  );
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [activeDrag, setActiveDrag] = useState<TileData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const placedTileIds = new Set(placements.filter(Boolean) as string[]);

  const tileById = useCallback((id: string) => hand.find((t) => t.id === id), [hand]);

  function placeTile(tileId: string, slotIndex: number) {
    setPlacements((prev) => {
      const next = [...prev];
      const existing = next[slotIndex];
      if (existing === tileId) return prev;
      // If the tile was already in another slot, swap the displaced tile into it.
      const oldSlot = next.findIndex((id) => id === tileId);
      if (oldSlot !== -1) next[oldSlot] = existing;
      next[slotIndex] = tileId;
      return next;
    });
    setSelectedTile(null);
    setSelectedSlot(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (overId.startsWith("slot-")) {
      placeTile(String(active.id), parseInt(overId.replace("slot-", ""), 10));
    }
  }

  function handleTileClick(tile: TileData) {
    if (selectedSlot !== null) {
      placeTile(tile.id, selectedSlot);
    } else if (selectedTile?.id === tile.id) {
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
      // Convenience: with exactly one empty slot, fill it straight away.
      const empties = placements.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
      if (empties.length === 1) placeTile(tile.id, empties[0]);
    }
  }

  function handleSlotClick(slotIndex: number) {
    if (placements[slotIndex]) {
      setPlacements((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      return;
    }
    if (selectedTile) {
      placeTile(selectedTile.id, slotIndex);
    } else {
      setSelectedSlot(selectedSlot === slotIndex ? null : slotIndex);
    }
  }

  const slotWords = placements.map((id) => (id ? tileById(id)?.word ?? null : null));
  const filled = placements.filter(Boolean).length;
  const allFilled = filled === slotCount;

  function handleSubmit() {
    if (!allFilled) return;
    onSubmit(placements.map((id) => tileById(id!)!.word));
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveDrag(tileById(String(e.active.id)) ?? null)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="mb-6">
        <SentenceFrame
          frame={frame}
          placements={slotWords}
          onSlotClick={handleSlotClick}
          selectedSlotIndex={selectedSlot}
        />
      </div>

      <p className="mb-3 text-white/40 text-xs text-center">
        Drag tiles into the blanks, or tap a tile and then a blank. Tap a filled blank to clear it.
      </p>

      <TileHand
        tiles={hand}
        placedTileIds={placedTileIds}
        selectedTileId={selectedTile?.id}
        onTileClick={handleTileClick}
      />

      <div className="mt-6">
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={!allFilled || submitting}>
          {submitting ? "Submitting…" : allFilled ? "Submit" : `Submit (${filled}/${slotCount} filled)`}
        </Button>
      </div>

      <DragOverlay>{activeDrag && <TileGhost word={activeDrag.word} />}</DragOverlay>
    </DndContext>
  );
}
