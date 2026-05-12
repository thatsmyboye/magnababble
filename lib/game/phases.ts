export type RoomStatus = "lobby" | "playing" | "finished";
export type RoundPhase = "prompt" | "submitting" | "voting" | "results";

export const PHASE_DURATIONS_MS: Record<RoundPhase, number> = {
  prompt: 5_000,
  submitting: 60_000,
  voting: 30_000,
  results: 10_000,
};

export function nextPhase(current: RoundPhase): RoundPhase | null {
  const order: RoundPhase[] = ["prompt", "submitting", "voting", "results"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export function phaseEndsAt(phase: RoundPhase): string {
  return new Date(Date.now() + PHASE_DURATIONS_MS[phase]).toISOString();
}
