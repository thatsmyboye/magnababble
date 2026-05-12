"use client";

import { useState, useCallback } from "react";
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
import { Timer } from "@/components/ui/timer";
import { Button } from "@/components/ui/button";
import { countSlots } from "@/lib/game/scoring";
import type { Round } from "@/lib/hooks/useRoom";

interface TileData {
  id: string;
  word: string;
  category: string;
}

interface SubmissionPhaseProps {
  code: string;
  round: Round;
  roundCount: number;
  myHand: TileData[];
  myPlayerId: string;
}

export function SubmissionPhase({
  code,
  round,
  roundCount,
  myHand,
  myPlayerId,
}: SubmissionPhaseProps) {
  const frame = round.prompts?.sentence_frame ?? "";
  const slotCount = countSlots(frame);

  // placements[slotIndex] = tile id or null
  const [placements, setPlacements] = useState<(string | null)[]>(
    Array(slotCount).fill(null)
  );
  // selectedTile for click-based placement
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [activeDrag, setActiveDrag] = useState<TileData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const placedTileIds = new Set(placements.filter(Boolean) as string[]);

  const tileById = useCallback(
    (id: string) => myHand.find((t) => t.id === id),
    [myHand]
  );

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const tileId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith("slot-")) {
      const slotIndex = parseInt(overId.replace("slot-", ""), 10);
      setPlacements((prev) => {
        const next = [...prev];
        // If slot already occupied, swap or return old tile
        const existing = next[slotIndex];
        if (existing === tileId) return prev;
        // Remove tile from any other slot it was in
        const oldSlot = next.findIndex((id) => id === tileId);
        if (oldSlot !== -1) next[oldSlot] = existing;
        next[slotIndex] = tileId;
        return next;
      });
    }
  }

  function handleTileClick(tile: TileData) {
    if (selectedSlot !== null) {
      // Place selected tile into previously selected slot
      setPlacements((prev) => {
        const next = [...prev];
        const oldSlot = next.findIndex((id) => id === tile.id);
        if (oldSlot !== -1) next[oldSlot] = next[selectedSlot];
        next[selectedSlot] = tile.id;
        return next;
      });
      setSelectedSlot(null);
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  }

  function handleSlotClick(slotIndex: number) {
    if (placements[slotIndex]) {
      // Remove from slot
      setPlacements((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      return;
    }

    if (selectedTile) {
      // Place selected tile into this slot
      setPlacements((prev) => {
        const next = [...prev];
        const oldSlot = next.findIndex((id) => id === selectedTile.id);
        if (oldSlot !== -1) next[oldSlot] = null;
        next[slotIndex] = selectedTile.id;
        return next;
      });
      setSelectedTile(null);
      setSelectedSlot(null);
    } else {
      setSelectedSlot(slotIndex);
    }
  }

  const slotWords = placements.map((id) => (id ? tileById(id)?.word ?? null : null));
  const allFilled = placements.every(Boolean);

  async function handleSubmit() {
    if (!allFilled) return;
    setSubmitting(true);
    setError("");

    const playerToken = localStorage.getItem(`magnababble_token_${code}`);
    const words = placements.map((id) => tileById(id!)!.word);

    try {
      const res = await fetch(`/api/rounds/${round.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({ placement: words }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-white mb-2">Submitted!</h2>
        <p className="text-white/50">Waiting for other players...</p>
        <div className="mt-4 text-white/30 text-sm">
          <Timer endsAt={round.phase_ends_at} /> remaining
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        const tile = tileById(e.active.id as string);
        if (tile) setActiveDrag(tile);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col min-h-screen px-4 py-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2 text-white/40 text-sm">
          <span>Round {round.round_number} of {roundCount}</span>
          <div className="flex items-center gap-1">
            <span>Time:</span>
            <Timer endsAt={round.phase_ends_at} />
          </div>
        </div>

        <h2 className="text-lg text-white font-medium mb-4">
          {round.prompts?.display_text}
        </h2>

        <div className="mb-6">
          <SentenceFrame
            frame={frame}
            placements={slotWords}
            onSlotClick={handleSlotClick}
            selectedSlotIndex={selectedSlot}
          />
        </div>

        <div className="mb-4 text-white/40 text-xs text-center">
          Drag tiles into blanks — or tap a tile then tap a blank
        </div>

        <TileHand
          tiles={myHand}
          placedTileIds={placedTileIds}
          selectedTileId={selectedTile?.id}
          onTileClick={handleTileClick}
        />

        <div className="mt-6">
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
          >
            {submitting ? "Submitting..." : `Submit${!allFilled ? ` (${placements.filter(Boolean).length}/${slotCount} filled)` : ""}`}
          </Button>
        </div>
      </div>

      <DragOverlay>
        {activeDrag && (
          <div className="px-3 py-1.5 rounded-lg bg-violet-600 border border-violet-400 text-white text-sm font-semibold shadow-xl">
            {activeDrag.word}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
