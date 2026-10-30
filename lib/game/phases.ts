export type RoomStatus = "lobby" | "playing" | "finished";
export type RoomMode = "frames" | "freestyle" | "mixed";
export type RoundPhase = "prompt" | "submitting" | "voting" | "results";

export const ROOM_MODES: RoomMode[] = ["frames", "freestyle", "mixed"];

export const MODE_LABELS: Record<RoomMode, { title: string; blurb: string }> = {
  frames: {
    title: "Fill the blanks",
    blurb: "Every round has a sentence with blanks to fill from your tiles.",
  },
  freestyle: {
    title: "Freestyle",
    blurb: "Build the whole sentence yourself, fridge-magnet style.",
  },
  mixed: {
    title: "Mixed",
    blurb: "A shuffle of both — blanks one round, freestyle the next.",
  },
};

export const PHASE_DURATIONS_MS: Record<RoundPhase, number> = {
  prompt: 5_000,
  submitting: 60_000,
  voting: 30_000,
  results: 15_000,
};

/** Freestyle sentences take longer to build than filling blanks. */
export const FREESTYLE_SUBMITTING_MS = 90_000;

export const PHASE_ORDER: RoundPhase[] = ["prompt", "submitting", "voting", "results"];

export function nextPhase(current: RoundPhase): RoundPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

export function phaseDurationMs(phase: RoundPhase, freestyle = false): number {
  if (phase === "submitting" && freestyle) return FREESTYLE_SUBMITTING_MS;
  return PHASE_DURATIONS_MS[phase];
}

export function phaseEndsAt(phase: RoundPhase, freestyle = false, now = Date.now()): string {
  return new Date(now + phaseDurationMs(phase, freestyle)).toISOString();
}

export function isRoomMode(value: unknown): value is RoomMode {
  return typeof value === "string" && (ROOM_MODES as string[]).includes(value);
}
