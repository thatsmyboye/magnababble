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
}

export function TileHand({
  tiles,
  placedTileIds,
  selectedTileId,
  onTileClick,
  dragIdPrefix = "",
  grouped = false,
}: TileHandProps) {
  const glue = grouped ? tiles.filter((t) => t.category === "glue") : [];
  const content = grouped ? tiles.filter((t) => t.category !== "glue") : tiles;

  const renderTiles = (list: TileData[]) => (
    <div className="flex flex-wrap gap-2">
      {list.map((tile) => (
        <Tile
          key={tile.id}
          id={`${dragIdPrefix}${tile.id}`}
          word={tile.word}
          category={tile.category}
          placed={placedTileIds.has(tile.id)}
          selected={selectedTileId === tile.id}
          onClick={() => !placedTileIds.has(tile.id) && onTileClick?.(tile)}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-4">
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
          {grouped ? "Word tiles" : "Your tiles"}
        </p>
        {renderTiles(content)}
      </div>
      {glue.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Glue words</p>
          {renderTiles(glue)}
        </div>
      )}
    </div>
  );
}
