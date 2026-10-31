/**
 * Special rounds (house rule "specialRounds"). Pure rules shared by the
 * server engine and the client UI.
 *
 *   double — votes this round score twice (always the final round)
 *   speed  — half the usual writing time
 *   chaos  — one extra blank at the end of the sentence (framed rounds only)
 */

export type RoundModifier = "double" | "speed" | "chaos";

export const MODIFIERS: RoundModifier[] = ["double", "speed", "chaos"];

export const MODIFIER_INFO: Record<RoundModifier, { icon: string; title: string; blurb: string }> = {
  double: { icon: "⭐", title: "Double points", blurb: "Every vote this round counts twice." },
  speed: { icon: "⚡", title: "Speed round", blurb: "Half the usual time to write. Go go go!" },
  chaos: { icon: "🌀", title: "Chaos round", blurb: "One extra blank. Make it count." },
};

/** Chance that an eligible middle round becomes speed or chaos. */
export const MIDDLE_SPECIAL_CHANCE = 0.35;
/** The final round is worth double once a game has at least this many rounds. */
export const DOUBLE_FINAL_MIN_ROUNDS = 3;
/** Speed rounds halve writing time but never go below this. */
export const SPEED_FACTOR = 0.5;
export const MIN_SPEED_SECONDS = 20;
/** The chaos blank expects a phrase, which tends to land best at the end. */
export const CHAOS_HINT = "filler";

export function isRoundModifier(value: unknown): value is RoundModifier {
  return typeof value === "string" && (MODIFIERS as string[]).includes(value);
}

export interface ModifierContext {
  enabled: boolean;
  roundNumber: number;
  roundCount: number;
  freestyle: boolean;
  previous: RoundModifier | null;
  rng?: () => number;
}

/**
 * Pick a round's modifier. The opening round is always normal, the final
 * round is double points, and two specials never run back to back, so the
 * game keeps a steady rhythm with the occasional surprise.
 */
export function chooseModifier(ctx: ModifierContext): RoundModifier | null {
  if (!ctx.enabled) return null;
  const rng = ctx.rng ?? Math.random;
  const isFinal = ctx.roundNumber === ctx.roundCount;
  if (isFinal && ctx.roundCount >= DOUBLE_FINAL_MIN_ROUNDS) return "double";
  if (ctx.roundNumber <= 1 || isFinal) return null;
  if (ctx.previous !== null) return null;
  // Leave room for the final double: no special right before it.
  if (ctx.roundCount >= DOUBLE_FINAL_MIN_ROUNDS && ctx.roundNumber === ctx.roundCount - 1) return null;
  if (rng() >= MIDDLE_SPECIAL_CHANCE) return null;
  const options: RoundModifier[] = ctx.freestyle ? ["speed"] : ["speed", "chaos"];
  return options[Math.floor(rng() * options.length)];
}

/** The frame players actually see: chaos adds a blank before any closing punctuation. */
export function effectiveFrame(frame: string, modifier: RoundModifier | null | undefined): string {
  if (modifier !== "chaos" || !frame.includes("__")) return frame;
  const match = /(\s*[!?.)]+\s*)$/.exec(frame);
  if (!match) return `${frame} __`;
  return `${frame.slice(0, match.index)} __${match[1]}`;
}

/** Hints matching effectiveFrame: the chaos blank expects a phrase. */
export function effectiveHints(
  hints: (string | null)[] | null | undefined,
  frame: string,
  modifier: RoundModifier | null | undefined
): (string | null)[] | null {
  if (!hints) return null;
  if (modifier !== "chaos" || !frame.includes("__")) return hints;
  return [...hints, CHAOS_HINT];
}

export function scoreMultiplier(modifier: RoundModifier | null | undefined): number {
  return modifier === "double" ? 2 : 1;
}
