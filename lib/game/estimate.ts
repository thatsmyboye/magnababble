import { phaseDurationMs, type RoomMode } from "./phases";

/** Longest a single round can take, in milliseconds, if every timer runs out. */
export function maxRoundMs(freestyle: boolean): number {
  return (
    phaseDurationMs("prompt", freestyle) +
    phaseDurationMs("submitting", freestyle) +
    phaseDurationMs("voting", freestyle) +
    phaseDurationMs("results", freestyle)
  );
}

/**
 * Upper bound on game length in whole minutes. Rounds usually finish
 * sooner because submitting and voting close early once everyone is done.
 */
export function estimateGameMinutes(rounds: number, mode: RoomMode): number {
  const framed = maxRoundMs(false);
  const free = maxRoundMs(true);
  let total: number;
  if (mode === "frames") total = rounds * framed;
  else if (mode === "freestyle") total = rounds * free;
  else total = Math.ceil(rounds / 2) * framed + Math.floor(rounds / 2) * free; // mixed alternates, framed first
  return Math.max(1, Math.round(total / 60_000));
}
