"use client";

import { Tile } from "./Tile";
import type { TileData } from "@/lib/game/types";

interface TileHandProps {
  tiles: TileData[];
  placedTileIds: Set<string>;
  selectedTileId?: string | null;
  onTileClick?: (tile: TileData) => void;
  /** Prefix for draggable ids, when the same tile is also rendered elsewhere. */
  dragIdPrefix?: string;
  /** Show glue words in their own row. */
  grouped?: boolean;
  /** Give tiles shared layout ids so they animate into the sentence. */
  animateToSentence?: boolean;
}

export function tileLayoutId(tileId: string): string {
  return `tile-${tileId}`;
}

export function TileHand({
  tiles,
  placedTileIds,
  selectedTileId,
  onTileClick,
  dragIdPrefix = "",
  grouped = false,
  animateToSentence = false,
}: TileHandProps) {
  const glue = grouped ? tiles.filter((t) => t.category === "glue") : [];
  const content = grouped ? tiles.filter((t) => t.category !== "glue") : tiles;
  const remaining = tiles.length - placedTileIds.size;

  const renderTiles = (list: TileData[]) => (
    <div className="flex flex-wrap gap-2.5">
      {list.map((tile) => (
        <Tile
          key={tile.id}
          id={`${dragIdPrefix}${tile.id}`}
          word={tile.word}
          category={tile.category}
          layoutId={animateToSentence ? tileLayoutId(tile.id) : undefined}
          placed={placedTileIds.has(tile.id)}
          selected={selectedTileId === tile.id}
          onClick={() => !placedTileIds.has(tile.id) && onTileClick?.(tile)}
        />
      ))}
    </div>
  );

  return (
    <section
      aria-label="Your tiles"
      className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-4"
    >
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">
            {grouped ? "Word tiles" : "Your tiles"}
          </p>
          <p className="text-white/30 text-xs tabular-nums">{remaining} left</p>
        </div>
        {renderTiles(content)}
      </div>
      {glue.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Glue words</p>
          {renderTiles(glue)}
        </div>
      )}
    </section>
  );
}
