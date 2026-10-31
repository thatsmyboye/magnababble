/** Move the item at `from` one step left (-1) or right (+1). Out-of-range moves are no-ops. */
export function moveBy<T>(items: T[], from: number, delta: -1 | 1): T[] {
  const to = from + delta;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Insert `item` right after `anchor`, or append when the anchor is missing. Removes any earlier copy. */
export function insertAfter<T>(items: T[], item: T, anchor: T | null): T[] {
  const without = items.filter((x) => x !== item);
  if (anchor === null) return [...without, item];
  const i = without.indexOf(anchor);
  if (i === -1) return [...without, item];
  return [...without.slice(0, i + 1), item, ...without.slice(i + 1)];
}
