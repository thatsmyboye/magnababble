export function pointsFromVotes(voteCount: number): number {
  return voteCount;
}

/** Number of `__` blanks in a sentence frame. 0 means a freestyle prompt. */
export function countSlots(frame: string): number {
  return (frame.match(/__/g) ?? []).length;
}

/** A prompt with no blanks is played as open "magnet poetry" composition. */
export function isFreestyle(frame: string): boolean {
  return countSlots(frame) === 0;
}

/** Fill the blanks of a frame with the given words, in order. */
export function renderSentence(frame: string, tiles: string[]): string {
  let tileIndex = 0;
  return frame.replace(/__/g, () => {
    const word = tiles[tileIndex] ?? "___";
    tileIndex++;
    return `[${word}]`;
  });
}

/**
 * Join freestyle tiles into a sentence: capitalise the first letter and
 * add a full stop unless the player already ended on punctuation.
 */
export function renderFreestyle(words: string[]): string {
  const cleaned = words.map((w) => w.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  let text = cleaned.join(" ");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?…]$/.test(text)) text += ".";
  return text;
}

/** Render a submission for either prompt style. */
export function renderSubmission(frame: string, words: string[]): string {
  return isFreestyle(frame) ? renderFreestyle(words) : renderSentence(frame, words);
}

/** Maximum tiles a player may place in a freestyle sentence. */
export const FREESTYLE_MAX_WORDS = 14;
