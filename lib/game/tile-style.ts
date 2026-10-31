/**
 * Tile colors and base classes. A plain module (no "use client") so server
 * components such as the landing page can use it too.
 */
const CATEGORY_COLORS: Record<string, string> = {
  noun: "bg-blue-600 border-blue-400",
  verb: "bg-emerald-600 border-emerald-400",
  adjective: "bg-amber-600 border-amber-400",
  adverb: "bg-rose-600 border-rose-400",
  filler: "bg-purple-600 border-purple-400",
  glue: "bg-slate-600 border-slate-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  filler: "phrase",
  glue: "glue word",
};

export function tileColorClass(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-slate-600 border-slate-400";
}

export function tileCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export const TILE_BASE_CLASS =
  "inline-flex items-center min-h-[44px] px-3.5 py-2 rounded-xl border-2 text-white text-base font-semibold select-none touch-manipulation shadow-sm shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950";

