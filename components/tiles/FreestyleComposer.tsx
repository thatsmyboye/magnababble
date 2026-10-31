"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { TileHand } from "@/components/tiles/TileHand";
import { TileGhost, TILE_BASE_CLASS, tileColorClass } from "@/components/tiles/Tile";
import { useTileSensors } from "@/components/tiles/sensors";
import { Button } from "@/components/ui/button";
import { FREESTYLE_MAX_WORDS, renderFreestyle } from "@/lib/game/scoring";
import { insertAfter, moveBy } from "@/lib/game/reorder";
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
 * Fridge-magnet composer. Everything works by tapping: tap a tile to add it,
 * tap a word in the sentence to select it, then move it left or right or
 * remove it. A new tile lands right after the selected word. Dragging is an
 * optional shortcut for the same actions.
 */
export function FreestyleComposer({ hand, onSubmit, submitting, error }: FreestyleComposerProps) {
  const [sentence, setSentence] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<TileData | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const sensors = useTileSensors();

  const tileById = useMemo(() => new Map(hand.map((t) => [t.id, t])), [hand]);
  const inSentence = useMemo(() => new Set(sentence), [sentence]);
  const words = sentence.map((id) => tileById.get(id)?.word ?? "");
  const full = sentence.length >= FREESTYLE_MAX_WORDS;

  const wordOf = (id: string) => tileById.get(id)?.word ?? "tile";

  /** Add a tile from the hand: after the selected word, or at the end. */
  function add(tileId: string) {
    if (inSentence.has(tileId) || full) return;
    const anchor = selectedWord && inSentence.has(selectedWord) ? selectedWord : null;
    setSentence((prev) => insertAfter(prev, tileId, anchor));
    if (anchor) setSelectedWord(tileId); // keep building from the new word
    setAnnouncement(anchor ? `Added ${wordOf(tileId)} after ${wordOf(anchor)}` : `Added ${wordOf(tileId)}`);
  }

  function append(tileId: string) {
    if (inSentence.has(tileId) || full) return;
    setSentence((prev) => [...prev, tileId]);
    setAnnouncement(`Added ${wordOf(tileId)}`);
  }

  function remove(tileId: string) {
    setSentence((prev) => prev.filter((id) => id !== tileId));
    if (selectedWord === tileId) setSelectedWord(null);
    setAnnouncement(`Removed ${wordOf(tileId)}`);
  }

  function move(tileId: string, delta: -1 | 1) {
    const from = sentence.indexOf(tileId);
    const next = moveBy(sentence, from, delta);
    if (next === sentence) return;
    setSentence(next);
    setAnnouncement(`Moved ${wordOf(tileId)} to position ${from + delta + 1} of ${sentence.length}`);
  }

  function toggleSelect(tileId: string) {
    setSelectedWord((cur) => (cur === tileId ? null : tileId));
    if (selectedWord !== tileId) setAnnouncement(`${wordOf(tileId)} selected. Move it or remove it.`);
  }

  function clearAll() {
    setSentence([]);
    setSelectedWord(null);
    setAnnouncement("Cleared the sentence");
  }

  const selectedIndex = selectedWord ? sentence.indexOf(selectedWord) : -1;

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
      <SentenceBoard
        sentence={sentence}
        tileById={tileById}
        selectedWord={selectedWord}
        onSelect={toggleSelect}
      />

      <AnimatePresence initial={false}>
        {selectedWord && selectedIndex !== -1 && (
          <motion.div
            key="word-tools"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="toolbar"
            aria-label={`Edit ${wordOf(selectedWord)}`}
            className="mt-2 flex items-center justify-center gap-2"
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() => move(selectedWord, -1)}
              disabled={selectedIndex === 0}
              aria-label="Move left"
            >
              ◀ Move
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => move(selectedWord, 1)}
              disabled={selectedIndex === sentence.length - 1}
              aria-label="Move right"
            >
              Move ▶
            </Button>
            <Button size="sm" variant="danger" onClick={() => remove(selectedWord)}>
              Remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedWord(null)}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 mt-2 mb-4 min-h-[32px]">
        <p className="text-white/40 text-xs">
          {selectedWord
            ? `New tiles go after “${wordOf(selectedWord)}”.`
            : "Tap tiles to add them. Tap a word in your sentence to move or remove it."}{" "}
          <span className={cn("tabular-nums", full && "text-amber-300 font-semibold")}>
            {sentence.length}/{FREESTYLE_MAX_WORDS}
          </span>
        </p>
        {sentence.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="shrink-0">
            Clear
          </Button>
        )}
      </div>

      <TrayDropZone>
        <TileHand
          tiles={hand}
          placedTileIds={inSentence}
          onTileClick={(tile) => add(tile.id)}
          dragIdPrefix={TRAY_PREFIX}
          grouped
        />
      </TrayDropZone>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="mt-6">
        {error && (
          <p role="alert" className="text-red-400 text-sm mb-2">
            {error}
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          onClick={() => onSubmit(words)}
          disabled={sentence.length === 0 || submitting}
        >
          {submitting ? "Submitting…" : sentence.length === 0 ? "Add some tiles" : "Submit"}
        </Button>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && <TileGhost word={activeDrag.word} category={activeDrag.category} />}
      </DragOverlay>
    </DndContext>
  );
}

interface SentenceBoardProps {
  sentence: string[];
  tileById: Map<string, TileData>;
  selectedWord: string | null;
  onSelect: (tileId: string) => void;
}

function SentenceBoard({ sentence, tileById, selectedWord, onSelect }: SentenceBoardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: SENTENCE_ID });
  const preview = renderFreestyle(sentence.map((id) => tileById.get(id)?.word ?? ""));

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label="Your sentence"
      className={cn(
        "rounded-2xl border-2 border-dashed px-4 py-4 min-h-[128px] transition-colors",
        isOver ? "border-violet-400 bg-violet-900/30" : "border-white/20 bg-white/5"
      )}
    >
      {sentence.length === 0 ? (
        <p className="text-white/30 text-center py-6 text-lg">Your sentence will appear here</p>
      ) : (
        <>
          <SortableContext items={sentence} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <AnimatePresence initial={false}>
                {sentence.map((id, i) => {
                  const tile = tileById.get(id);
                  if (!tile) return null;
                  return (
                    <SentenceWord
                      key={id}
                      tile={tile}
                      position={i + 1}
                      total={sentence.length}
                      selected={selectedWord === id}
                      onSelect={() => onSelect(id)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </SortableContext>
          <p className="mt-4 text-center text-white text-xl font-semibold leading-snug" aria-live="polite">
            {preview}
          </p>
        </>
      )}
    </div>
  );
}

interface SentenceWordProps {
  tile: TileData;
  position: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}

function SentenceWord({ tile, position, total, selected, onSelect }: SentenceWordProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tile.id,
  });

  return (
    // Outer element belongs to dnd kit (sortable transform); inner to Framer (pop in/out).
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("inline-flex", isDragging && "opacity-40")}
    >
      <motion.button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${tile.word}, word ${position} of ${total}${selected ? ", selected" : ". Press to move or remove"}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          TILE_BASE_CLASS,
          "cursor-grab",
          tileColorClass(tile.category),
          selected && "ring-2 ring-white ring-offset-2 ring-offset-indigo-950 -translate-y-1"
        )}
      >
        {tile.word}
      </motion.button>
    </div>
  );
}

function TrayDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-2xl transition-shadow", isOver && "ring-2 ring-red-400/60")}
    >
      {children}
    </div>
  );
}
