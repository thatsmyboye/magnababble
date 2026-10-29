/**
 * Pure tile-dealing helpers. No database access — the engine passes in the
 * tile pool and a random source so this can be unit tested.
 */

export type TileCategory = "noun" | "verb" | "adjective" | "adverb" | "filler" | "glue";

export interface DealableTile {
  id: string;
  word: string;
  category: string;
}

export const CONTENT_CATEGORIES: TileCategory[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "filler",
];

/** Extra tiles beyond the number of blanks in a framed round. */
export const FRAME_EXTRA_TILES = 6;

/** Freestyle hand: content words plus connective "glue" words. */
export const FREESTYLE_CONTENT_TILES = 12;
export const FREESTYLE_GLUE_TILES = 10;

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function frameHandSize(slotCount: number): number {
  return slotCount + FRAME_EXTRA_TILES;
}

/**
 * Deal a hand for a framed round: round-robin across the content
 * categories so a player always has a spread of nouns, verbs, etc.
 */
export function dealFrameHand(
  pool: DealableTile[],
  slotCount: number,
  rng: Rng = Math.random
): DealableTile[] {
  return dealContent(pool, frameHandSize(slotCount), rng);
}

/**
 * Pick `size` content tiles, cycling through the categories in a random
 * order so the hand is balanced. Stops early only if the pool runs dry.
 */
export function dealContent(
  pool: DealableTile[],
  size: number,
  rng: Rng = Math.random
): DealableTile[] {
  const buckets = new Map<string, DealableTile[]>();
  for (const cat of CONTENT_CATEGORIES) buckets.set(cat, []);
  for (const tile of pool) {
    if (buckets.has(tile.category)) buckets.get(tile.category)!.push(tile);
  }

  const order = shuffle(CONTENT_CATEGORIES, rng);
  for (const cat of order) buckets.set(cat, shuffle(buckets.get(cat)!, rng));

  const hand: DealableTile[] = [];
  const seen = new Set<string>();
  let progress = true;
  while (hand.length < size && progress) {
    progress = false;
    for (const cat of order) {
      if (hand.length >= size) break;
      const next = buckets.get(cat)!.pop();
      if (next && !seen.has(next.id)) {
        hand.push(next);
        seen.add(next.id);
        progress = true;
      }
    }
  }
  return shuffle(hand, rng);
}

/**
 * Deal a hand for a freestyle round: a spread of content words plus a
 * generous helping of glue words so sentences can actually be formed.
 */
export function dealFreestyleHand(
  pool: DealableTile[],
  rng: Rng = Math.random,
  contentCount = FREESTYLE_CONTENT_TILES,
  glueCount = FREESTYLE_GLUE_TILES
): DealableTile[] {
  const content = dealContent(pool, contentCount, rng);
  const glue = shuffle(pool.filter((t) => t.category === "glue"), rng).slice(0, glueCount);
  // Keep glue words at the front so they are easy to find, content after.
  return [...sortByWord(glue), ...content];
}

function sortByWord(tiles: DealableTile[]): DealableTile[] {
  return [...tiles].sort((a, b) => a.word.localeCompare(b.word));
}

/**
 * Validate a placement against a hand. Each tile in the hand may be used
 * once; the words must match exactly.
 */
export function placementUsesHand(
  placement: string[],
  hand: { word: string }[]
): boolean {
  const remaining = new Map<string, number>();
  for (const t of hand) remaining.set(t.word, (remaining.get(t.word) ?? 0) + 1);
  for (const word of placement) {
    const left = remaining.get(word) ?? 0;
    if (left <= 0) return false;
    remaining.set(word, left - 1);
  }
  return true;
}
