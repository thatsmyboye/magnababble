"use client";

import { Tile } from "./Tile";

interface TileData {
  id: string;
  word: string;
  category: string;
}

interface TileHandProps {
  tiles: TileData[];
  placedTileIds: Set<string>;
  selectedTileId?: string | null;
  onTileClick?: (tile: TileData) => void;
}

export function TileHand({ tiles, placedTileIds, selectedTileId, onTileClick }: TileHandProps) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
      <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Your tiles</p>
      <div className="flex flex-wrap gap-2">
        {tiles.map((tile) => (
          <Tile
            key={tile.id}
            id={tile.id}
            word={tile.word}
            category={tile.category}
            placed={placedTileIds.has(tile.id)}
            selected={selectedTileId === tile.id}
            onClick={() => !placedTileIds.has(tile.id) && onTileClick?.(tile)}
          />
        ))}
      </div>
    </div>
  );
}
