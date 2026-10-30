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
  const [announcement, setAnnouncement] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
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
    setAnnouncement(`Placed ${tileById(tileId)?.word ?? "tile"} in blank ${slotIndex + 1}`);
  }

  function clearSlot(slotIndex: number) {
    const word = placements[slotIndex] ? tileById(placements[slotIndex]!)?.word : null;
    setPlacements((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    if (word) setAnnouncement(`Removed ${word} from blank ${slotIndex + 1}`);
  }

  function clearAll() {
    setPlacements(Array(slotCount).fill(null));
    setSelectedTile(null);
    setSelectedSlot(null);
    setAnnouncement("Cleared all blanks");
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
      return;
    }
    if (selectedTile?.id === tile.id) {
      setSelectedTile(null);
      return;
    }
    // With exactly one empty blank, fill it straight away.
    const empties = placements.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
    if (empties.length === 1) {
      placeTile(tile.id, empties[0]);
    } else {
      setSelectedTile(tile);
      setAnnouncement(`${tile.word} selected. Choose a blank.`);
    }
  }

  function handleSlotClick(slotIndex: number) {
    if (placements[slotIndex]) {
      clearSlot(slotIndex);
      return;
    }
    if (selectedTile) {
      placeTile(selectedTile.id, slotIndex);
    } else {
      setSelectedSlot(selectedSlot === slotIndex ? null : slotIndex);
    }
  }

  const slotTiles = placements.map((id) => (id ? tileById(id) ?? null : null));
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
      <div className="mb-3">
        <SentenceFrame
          frame={frame}
          placements={slotTiles}
          onSlotClick={handleSlotClick}
          selectedSlotIndex={selectedSlot}
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 min-h-[32px]">
        <p className="text-white/40 text-xs">
          {selectedTile
            ? `Now tap a blank for “${selectedTile.word}”`
            : selectedSlot !== null
            ? `Now tap a tile for blank ${selectedSlot + 1}`
            : "Tap a tile then a blank, or drag. Tap a filled blank to clear it."}
        </p>
        {filled > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="shrink-0">
            Clear
          </Button>
        )}
      </div>

      <TileHand
        tiles={hand}
        placedTileIds={placedTileIds}
        selectedTileId={selectedTile?.id}
        onTileClick={handleTileClick}
        animateToSentence
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="mt-6">
        {error && (
          <p role="alert" className="text-red-400 text-sm mb-2">
            {error}
          </p>
        )}
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={!allFilled || submitting}>
          {submitting ? "Submitting…" : allFilled ? "Submit" : `Submit (${filled}/${slotCount} filled)`}
        </Button>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && <TileGhost word={activeDrag.word} category={activeDrag.category} />}
      </DragOverlay>
    </DndContext>
  );
}
