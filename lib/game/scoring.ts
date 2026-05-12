export function pointsFromVotes(voteCount: number): number {
  return voteCount;
}

export function renderSentence(frame: string, tiles: string[]): string {
  let result = frame;
  let tileIndex = 0;
  result = result.replace(/__/g, () => {
    const word = tiles[tileIndex] ?? "___";
    tileIndex++;
    return `[${word}]`;
  });
  return result;
}

export function countSlots(frame: string): number {
  return (frame.match(/__/g) ?? []).length;
}
