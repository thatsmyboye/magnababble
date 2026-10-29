"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TileHand } from "@/components/tiles/TileHand";
import { TileGhost, tileColorClass } from "@/components/tiles/Tile";
import { Button } from "@/components/ui/button";
import { FREESTYLE_MAX_WORDS, renderFreestyle } from "@/lib/game/scoring";
import { cn } from "@/lib/utils";
import type { TileData } from "@/lib/game/types";

const TRAY_PREFIX = "tray-";
const SENTENCE_ID = "sentence";
const TRAY_ID = "tray";

interface FreestyleComposerProps {
  hand: TileData[];
  onSubmit: (words: string[]) => void;
  submitting: boolean;
  error?: string;
}

/**
 * Fridge-magnet composer: tap a tile to append it to the sentence, tap a
 * word in the sentence to send it back, drag words to reorder.
 */
export function FreestyleComposer({ hand, onSubmit, submitting, error }: FreestyleComposerProps) {
  const [sentence, setSentence] = useState<string[]>([]);
  const [activeDrag, setActiveDrag] = useState<TileData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const tileById = useMemo(() => new Map(hand.map((t) => [t.id, t])), [hand]);
  const inSentence = useMemo(() => new Set(sentence), [sentence]);
  const words = sentence.map((id) => tileById.get(id)?.word ?? "");
  const full = sentence.length >= FREESTYLE_MAX_WORDS;

  function append(tileId: string) {
    if (inSentence.has(tileId) || full) return;
    setSentence((prev) => [...prev, tileId]);
  }

  function remove(tileId: string) {
    setSentence((prev) => prev.filter((id) => id !== tileId));
  }

  function insertBefore(tileId: string, beforeId: string) {
    if (full) return;
    setSentence((prev) => {
      const without = prev.filter((id) => id !== tileId);
      const index = without.indexOf(beforeId);
      if (index === -1) return [...without, tileId];
      return [...without.slice(0, index), tileId, ...without.slice(index)];
    });
  }

  /** Prefer the word being hovered; otherwise fall back to the containers. */
  const collisionDetection: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    const overWords = within.filter((c) => inSentence.has(String(c.id)));
    if (overWords.length > 0) {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => inSentence.has(String(c.id))),
      });
    }
    if (within.length > 0) return within;
    return rectIntersection(args);
  };

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const fromTray = activeId.startsWith(TRAY_PREFIX);
    const tileId = fromTray ? activeId.slice(TRAY_PREFIX.length) : activeId;

    if (fromTray) {
      if (overId === SENTENCE_ID) append(tileId);
      else if (inSentence.has(overId)) insertBefore(tileId, overId);
      return;
    }

    // Reordering or removing a word already in the sentence.
    if (overId === TRAY_ID) {
      remove(tileId);
    } else if (inSentence.has(overId) && overId !== tileId) {
      setSentence((prev) => arrayMove(prev, prev.indexOf(tileId), prev.indexOf(overId)));
    }
  }

  function handleDragStart(id: string) {
    const tileId = id.startsWith(TRAY_PREFIX) ? id.slice(TRAY_PREFIX.length) : id;
    setActiveDrag(tileById.get(tileId) ?? null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(e) => handleDragStart(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <SentenceBoard sentence={sentence} tileById={tileById} onRemove={remove} />

      <p className="mt-2 mb-3 text-white/40 text-xs text-center">
        Tap tiles to add them, tap a word to remove it, drag to reorder.{" "}
        <span className={cn(full && "text-amber-300")}>
          {sentence.length}/{FREESTYLE_MAX_WORDS} tiles
        </span>
      </p>

      <TrayDropZone>
        <TileHand
          tiles={hand}
          placedTileIds={inSentence}
          onTileClick={(tile) => append(tile.id)}
          dragIdPrefix={TRAY_PREFIX}
          grouped
        />
      </TrayDropZone>

      <div className="mt-6">
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <Button
          size="lg"
          className="w-full"
          onClick={() => onSubmit(words)}
          disabled={sentence.length === 0 || submitting}
        >
          {submitting ? "Submitting…" : sentence.length === 0 ? "Add some tiles" : "Submit"}
        </Button>
      </div>

      <DragOverlay>{activeDrag && <TileGhost word={activeDrag.word} />}</DragOverlay>
    </DndContext>
  );
}

interface SentenceBoardProps {
  sentence: string[];
  tileById: Map<string, TileData>;
  onRemove: (tileId: string) => void;
}

function SentenceBoard({ sentence, tileById, onRemove }: SentenceBoardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: SENTENCE_ID });
  const preview = renderFreestyle(sentence.map((id) => tileById.get(id)?.word ?? ""));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-2xl border-2 border-dashed px-4 py-4 min-h-[112px] transition-colors",
        isOver ? "border-violet-400 bg-violet-900/30" : "border-white/20 bg-white/5"
      )}
    >
      {sentence.length === 0 ? (
        <p className="text-white/30 text-center py-4">Your sentence will appear here</p>
      ) : (
        <>
          <SortableContext items={sentence} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2 justify-center">
              {sentence.map((id) => {
                const tile = tileById.get(id);
                if (!tile) return null;
                return <SentenceWord key={id} tile={tile} onRemove={() => onRemove(id)} />;
              })}
            </div>
          </SortableContext>
          <p className="mt-3 text-center text-white/60 text-sm italic">{preview}</p>
        </>
      )}
    </div>
  );
}

function SentenceWord({ tile, onRemove }: { tile: TileData; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tile.id,
  });

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onRemove}
      title="Tap to remove"
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-lg border text-white text-sm font-semibold cursor-grab select-none touch-none",
        tileColorClass(tile.category),
        isDragging && "opacity-40"
      )}
    >
      {tile.word}
    </button>
  );
}

function TrayDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY_ID });
  return (
    <div ref={setNodeRef} className={cn("rounded-2xl transition-shadow", isOver && "ring-2 ring-red-400/60")}>
      {children}
    </div>
  );
}
