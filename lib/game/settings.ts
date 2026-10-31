/**
 * House rules chosen by the host when creating a room. Stored as JSON on
 * the room; any missing key means the default. Shared by server and client.
 */

export interface RoomSettings {
  /** Seconds to build a sentence in a framed round. Freestyle gets 50% more. */
  submitSeconds?: number;
  /** Seconds to vote. */
  voteSeconds?: number;
  /** Only use prompts from these themes. Empty or missing means all themes. */
  themes?: string[];
  /** Occasional speed and chaos rounds, and a double-points final round. */
  specialRounds?: boolean;
  /** Leave out prompts and tiles flagged as not family-friendly. */
  familyFriendly?: boolean;
}

export const DEFAULT_SUBMIT_SECONDS = 60;
export const DEFAULT_VOTE_SECONDS = 30;
export const SUBMIT_SECONDS_OPTIONS = [30, 45, 60, 90, 120];
export const VOTE_SECONDS_OPTIONS = [15, 20, 30, 45];
export const MAX_THEMES = 25;
/** Freestyle sentences take longer to build than filling blanks. */
export const FREESTYLE_TIME_FACTOR = 1.5;

export function submitSeconds(settings: RoomSettings | null | undefined, freestyle: boolean): number {
  const base = settings?.submitSeconds ?? DEFAULT_SUBMIT_SECONDS;
  return freestyle ? Math.round(base * FREESTYLE_TIME_FACTOR) : base;
}

export function voteSeconds(settings: RoomSettings | null | undefined): number {
  return settings?.voteSeconds ?? DEFAULT_VOTE_SECONDS;
}

/**
 * Turn untrusted input into valid settings. Unknown keys and invalid values
 * are dropped (so they fall back to defaults); defaults are not stored.
 */
export function sanitizeSettings(input: unknown): RoomSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const out: RoomSettings = {};

  const submit = Number(raw.submitSeconds);
  if (SUBMIT_SECONDS_OPTIONS.includes(submit) && submit !== DEFAULT_SUBMIT_SECONDS) {
    out.submitSeconds = submit;
  }

  const vote = Number(raw.voteSeconds);
  if (VOTE_SECONDS_OPTIONS.includes(vote) && vote !== DEFAULT_VOTE_SECONDS) {
    out.voteSeconds = vote;
  }

  if (Array.isArray(raw.themes)) {
    const themes = Array.from(
      new Set(
        raw.themes
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().slice(0, 40))
          .filter(Boolean)
      )
    ).slice(0, MAX_THEMES);
    if (themes.length > 0) out.themes = themes;
  }

  if (raw.specialRounds === true) out.specialRounds = true;
  if (raw.familyFriendly === true) out.familyFriendly = true;

  return out;
}

/** Short human summary of non-default rules, e.g. "45s to write · Food, Animals". */
export function describeSettings(settings: RoomSettings | null | undefined): string[] {
  const parts: string[] = [];
  if (settings?.submitSeconds) parts.push(`${settings.submitSeconds}s to write`);
  if (settings?.voteSeconds) parts.push(`${settings.voteSeconds}s to vote`);
  if (settings?.specialRounds) parts.push("Special rounds");
  if (settings?.familyFriendly) parts.push("Family-friendly");
  if (settings?.themes?.length) {
    const shown = settings.themes.slice(0, 3).join(", ");
    const more = settings.themes.length > 3 ? ` +${settings.themes.length - 3} more` : "";
    parts.push(`Themes: ${shown}${more}`);
  }
  return parts;
}
