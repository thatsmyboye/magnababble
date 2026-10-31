/**
 * Server-side game engine. Every state transition is a compare-and-set on
 * the database so that the host's timer, other players' timers and the
 * auto-advance after the last submission or vote can all race safely:
 * exactly one caller wins, the rest are told the transition was stale.
 *
 * Import only from API routes (uses the service-role client).
 */
import type { ServiceClient } from "@/lib/supabase/service";
import {
  dealFrameHand,
  dealFreestyleHand,
  type DealableTile,
} from "./dealing";
import { nextPhase, phaseDurationMs, phaseEndsAt, type RoomMode, type RoundPhase } from "./phases";
import { countSlots, isFreestyle } from "./scoring";
import type { RoomSettings } from "./settings";
import { countPlayers, recordEvent } from "./events";
import type {
  GameState,
  PlayerPublic,
  PromptPublic,
  Recap,
  RecapEntry,
  RoundPublic,
  SubmissionPublic,
  TileData,
} from "./types";

import { MIN_PLAYERS } from "./engine-constants";

export { MAX_PLAYERS, MIN_PLAYERS, MIN_ROUNDS, MAX_ROUNDS } from "./engine-constants";

export const DEFAULT_TILE_SET_ID = "00000000-0000-0000-0000-000000000001";

export interface RoomRow {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
  round_count: number;
  current_round: number;
  mode: RoomMode;
  settings: RoomSettings;
}

export interface PlayerRow extends PlayerPublic {
  room_id: string;
}

interface PromptRow {
  id: string;
  theme: string;
  display_text: string;
  sentence_frame: string;
  tile_set_id: string | null;
}

export interface RoundRow {
  id: string;
  room_id: string;
  round_number: number;
  phase: RoundPhase;
  phase_ends_at: string | null;
  prompt_id: string;
  prompts: PromptRow | null;
}

export type AdvanceResult =
  | { status: "phase_advanced"; phase: RoundPhase }
  | { status: "next_round"; roundNumber: number }
  | { status: "finished" }
  | { status: "stale" };

export class EngineError extends Error {
  constructor(message: string, public httpStatus = 400) {
    super(message);
  }
}

// ---------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------

export const ROOM_COLUMNS = "id, code, status, round_count, current_round, mode, settings";
const ROUND_COLUMNS =
  "id, room_id, round_number, phase, phase_ends_at, prompt_id, prompts(id, theme, display_text, sentence_frame, tile_set_id)";

/** PostgREST returns embedded one-to-one rows as objects, but older typings say array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchRoomByCode(sb: ServiceClient, code: string): Promise<RoomRow | null> {
  const { data } = await sb
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as RoomRow | null) ?? null;
}

export async function fetchPlayerByToken(
  sb: ServiceClient,
  roomId: string,
  token: string | null | undefined
): Promise<PlayerRow | null> {
  if (!token) return null;
  const { data } = await sb
    .from("players")
    .select("id, room_id, name, score, is_host")
    .eq("room_id", roomId)
    .eq("token", token)
    .maybeSingle();
  return (data as PlayerRow | null) ?? null;
}

export async function fetchPlayers(sb: ServiceClient, roomId: string): Promise<PlayerRow[]> {
  const { data } = await sb
    .from("players")
    .select("id, room_id, name, score, is_host")
    .eq("room_id", roomId)
    .order("joined_at");
  return (data as PlayerRow[] | null) ?? [];
}

export async function fetchCurrentRound(sb: ServiceClient, room: RoomRow): Promise<RoundRow | null> {
  if (room.status === "lobby" || room.current_round < 1) return null;
  const { data } = await sb
    .from("rounds")
    .select(ROUND_COLUMNS)
    .eq("room_id", room.id)
    .eq("round_number", room.current_round)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as RoundRow & { prompts: PromptRow | PromptRow[] | null };
  return { ...row, prompts: one(row.prompts) };
}

export async function fetchRoundById(sb: ServiceClient, roundId: string): Promise<RoundRow | null> {
  const { data } = await sb.from("rounds").select(ROUND_COLUMNS).eq("id", roundId).maybeSingle();
  if (!data) return null;
  const row = data as unknown as RoundRow & { prompts: PromptRow | PromptRow[] | null };
  return { ...row, prompts: one(row.prompts) };
}

// ---------------------------------------------------------------
// Prompts & dealing
// ---------------------------------------------------------------

function promptMatchesMode(prompt: PromptRow, mode: RoomMode, roundNumber: number): boolean {
  const freestyle = isFreestyle(prompt.sentence_frame);
  if (mode === "frames") return !freestyle;
  if (mode === "freestyle") return freestyle;
  // mixed: alternate, starting with a framed round
  return roundNumber % 2 === 1 ? !freestyle : freestyle;
}

export async function pickPrompt(
  sb: ServiceClient,
  room: RoomRow,
  roundNumber: number,
  rng: () => number = Math.random
): Promise<PromptRow> {
  const [{ data: allPrompts }, { data: usedRows }] = await Promise.all([
    sb.from("prompts").select("id, theme, display_text, sentence_frame, tile_set_id"),
    sb.from("rounds").select("prompt_id").eq("room_id", room.id),
  ]);

  const prompts = (allPrompts as PromptRow[] | null) ?? [];
  if (prompts.length === 0) throw new EngineError("No prompts available", 500);

  const used = new Set((usedRows ?? []).map((r) => r.prompt_id as string));

  // House rules: restrict to the chosen themes, unless that leaves nothing.
  const themes = new Set(room.settings?.themes ?? []);
  const themed = themes.size > 0 ? prompts.filter((p) => themes.has(p.theme)) : prompts;
  const fits = (p: PromptRow) => promptMatchesMode(p, room.mode, roundNumber);

  // Prefer, in order: right theme + right style + unused, then relax one
  // constraint at a time. Style beats theme, and theme beats freshness.
  const candidates = [
    themed.filter((p) => fits(p) && !used.has(p.id)),
    themed.filter(fits),
    prompts.filter((p) => fits(p) && !used.has(p.id)),
    prompts.filter(fits),
    prompts.filter((p) => !used.has(p.id)),
    prompts,
  ].find((list) => list.length > 0)!;

  return candidates[Math.floor(rng() * candidates.length)];
}

async function dealHands(
  sb: ServiceClient,
  roundId: string,
  playerIds: string[],
  prompt: PromptRow
): Promise<void> {
  const { data: tiles } = await sb
    .from("tiles")
    .select("id, word, category")
    .eq("tile_set_id", prompt.tile_set_id ?? DEFAULT_TILE_SET_ID);

  const pool = (tiles as DealableTile[] | null) ?? [];
  if (pool.length === 0) throw new EngineError("Tile set is empty", 500);

  const freestyle = isFreestyle(prompt.sentence_frame);
  const slotCount = countSlots(prompt.sentence_frame);

  const inserts = playerIds.flatMap((playerId) => {
    const hand = freestyle ? dealFreestyleHand(pool) : dealFrameHand(pool, slotCount);
    return hand.map((tile) => ({ round_id: roundId, player_id: playerId, tile_id: tile.id }));
  });

  if (inserts.length > 0) {
    const { error } = await sb.from("player_hands").insert(inserts);
    if (error) throw error;
  }
}

/**
 * Create round `roundNumber` for the room and deal hands. The UNIQUE
 * (room_id, round_number) constraint is the compare-and-set: a second
 * concurrent caller gets a conflict and is told the call was stale.
 */
async function createRound(
  sb: ServiceClient,
  room: RoomRow,
  roundNumber: number
): Promise<{ created: boolean; roundId?: string }> {
  const prompt = await pickPrompt(sb, room, roundNumber);
  const freestyle = isFreestyle(prompt.sentence_frame);

  const { data: round, error } = await sb
    .from("rounds")
    .insert({
      room_id: room.id,
      round_number: roundNumber,
      prompt_id: prompt.id,
      phase: "prompt",
      phase_ends_at: phaseEndsAt("prompt", freestyle, room.settings),
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation: someone else created this round first.
    if ((error as { code?: string }).code === "23505") return { created: false };
    throw error;
  }

  const players = await fetchPlayers(sb, room.id);
  await dealHands(sb, round.id, players.map((p) => p.id), prompt);

  const { error: roomError } = await sb
    .from("rooms")
    .update({ status: "playing", current_round: roundNumber })
    .eq("id", room.id);
  if (roomError) throw roomError;

  return { created: true, roundId: round.id };
}

// ---------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------

export async function startGame(sb: ServiceClient, room: RoomRow): Promise<{ started: boolean }> {
  if (room.status !== "lobby") throw new EngineError("Game already started");
  const players = await fetchPlayers(sb, room.id);
  if (players.length < MIN_PLAYERS) {
    throw new EngineError(`Need at least ${MIN_PLAYERS} players to start`);
  }
  const { created } = await createRound(sb, room, 1);
  return { started: created };
}

/** Add each submission's votes to its author's score. */
async function applyRoundScores(sb: ServiceClient, roundId: string): Promise<void> {
  const { data: submissions } = await sb
    .from("submissions")
    .select("player_id, vote_count")
    .eq("round_id", roundId)
    .gt("vote_count", 0);

  for (const sub of submissions ?? []) {
    const { error } = await sb.rpc("increment_score", {
      p_player_id: sub.player_id,
      p_amount: sub.vote_count,
    });
    if (error) throw error;
  }
}

/** Compare-and-set the round phase. Returns false if another caller got there first. */
async function casPhase(
  sb: ServiceClient,
  roundId: string,
  from: RoundPhase,
  to: RoundPhase,
  freestyle: boolean,
  settings: RoomSettings
): Promise<boolean> {
  const { data, error } = await sb
    .from("rounds")
    .update({ phase: to, phase_ends_at: phaseEndsAt(to, freestyle, settings) })
    .eq("id", roundId)
    .eq("phase", from)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export interface AdvanceOptions {
  /** Only advance if the round is currently in this phase. */
  expectedPhase?: RoundPhase;
  /** Only advance if this is the current round number. */
  expectedRound?: number;
}

/**
 * Move the room forward one step: to the next phase of the current round,
 * to the next round, or to the finished state. Safe to call concurrently.
 */
export async function advanceRoom(
  sb: ServiceClient,
  room: RoomRow,
  opts: AdvanceOptions = {}
): Promise<AdvanceResult> {
  if (room.status === "finished") return { status: "stale" };
  if (room.status === "lobby") throw new EngineError("Game has not started");

  const round = await fetchCurrentRound(sb, room);
  if (!round) throw new EngineError("Round not found", 404);

  if (opts.expectedRound !== undefined && opts.expectedRound !== round.round_number) {
    return { status: "stale" };
  }
  if (opts.expectedPhase !== undefined && opts.expectedPhase !== round.phase) {
    return { status: "stale" };
  }

  const freestyle = isFreestyle(round.prompts?.sentence_frame ?? "");
  let target = nextPhase(round.phase);

  // Nothing to vote on with fewer than two submissions: skip straight to results.
  if (round.phase === "submitting") {
    const { count } = await sb
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("round_id", round.id);
    if ((count ?? 0) < 2) target = "results";
  }

  if (target !== null) {
    const won = await casPhase(sb, round.id, round.phase, target, freestyle, room.settings ?? {});
    if (!won) return { status: "stale" };
    if (target === "results") {
      // Scores are applied exactly once, by whoever won the CAS into results.
      await applyRoundScores(sb, round.id);
    }
    return { status: "phase_advanced", phase: target };
  }

  // Results are over: next round or game over.
  const nextRoundNumber = round.round_number + 1;
  if (nextRoundNumber > room.round_count) {
    const { data, error } = await sb
      .from("rooms")
      .update({ status: "finished" })
      .eq("id", room.id)
      .eq("status", "playing")
      .select("id");
    if (error) throw error;
    if ((data?.length ?? 0) === 0) return { status: "stale" };
    await recordEvent(sb, room, "game_finished", {
      playerCount: await countPlayers(sb, room.id),
      extra: { rounds: room.round_count },
    });
    return { status: "finished" };
  }

  const { created } = await createRound(sb, room, nextRoundNumber);
  return created ? { status: "next_round", roundNumber: nextRoundNumber } : { status: "stale" };
}

/** Everyone has submitted → open voting without waiting for the clock. */
export async function advanceIfAllSubmitted(sb: ServiceClient, room: RoomRow, roundId: string) {
  const [{ count: players }, { count: submissions }] = await Promise.all([
    sb.from("players").select("id", { count: "exact", head: true }).eq("room_id", room.id),
    sb.from("submissions").select("id", { count: "exact", head: true }).eq("round_id", roundId),
  ]);
  if ((submissions ?? 0) >= (players ?? 0)) {
    return advanceRoom(sb, room, { expectedPhase: "submitting" });
  }
  return null;
}

/** Everyone has voted → show results without waiting for the clock. */
export async function advanceIfAllVoted(sb: ServiceClient, room: RoomRow, roundId: string) {
  const [{ count: players }, { count: votes }] = await Promise.all([
    sb.from("players").select("id", { count: "exact", head: true }).eq("room_id", room.id),
    sb.from("votes").select("id", { count: "exact", head: true }).eq("round_id", roundId),
  ]);
  if ((votes ?? 0) >= (players ?? 0)) {
    return advanceRoom(sb, room, { expectedPhase: "voting" });
  }
  return null;
}

/** Recount every submission's votes for a round in one pass. */
export async function recountVotes(sb: ServiceClient, roundId: string): Promise<void> {
  const [{ data: submissions }, { data: votes }] = await Promise.all([
    sb.from("submissions").select("id, vote_count").eq("round_id", roundId),
    sb.from("votes").select("submission_id").eq("round_id", roundId),
  ]);

  const tally = new Map<string, number>();
  for (const v of votes ?? []) {
    tally.set(v.submission_id, (tally.get(v.submission_id) ?? 0) + 1);
  }

  await Promise.all(
    (submissions ?? [])
      .filter((s) => (tally.get(s.id) ?? 0) !== s.vote_count)
      .map((s) =>
        sb.from("submissions").update({ vote_count: tally.get(s.id) ?? 0 }).eq("id", s.id)
      )
  );
}

/** Reset a finished (or in-progress) room back to the lobby, keeping players. */
export async function resetRoom(sb: ServiceClient, room: RoomRow): Promise<void> {
  const { error: roundsError } = await sb.from("rounds").delete().eq("room_id", room.id);
  if (roundsError) throw roundsError;
  const { error: playersError } = await sb
    .from("players")
    .update({ score: 0 })
    .eq("room_id", room.id);
  if (playersError) throw playersError;
  const { error: roomError } = await sb
    .from("rooms")
    .update({ status: "lobby", current_round: 0, phase_ends_at: null })
    .eq("id", room.id);
  if (roomError) throw roomError;
}

// ---------------------------------------------------------------
// End-of-game recap
// ---------------------------------------------------------------

/**
 * Winners of every round plus the best sentence of the game. Built from the
 * rounds and submissions still attached to the room, so it disappears on a
 * rematch (which deletes the rounds) and with stale-room cleanup.
 */
export async function buildRecap(sb: ServiceClient, room: RoomRow): Promise<Recap> {
  const [{ data: roundRows }, players] = await Promise.all([
    sb
      .from("rounds")
      .select("id, round_number, prompts(theme, display_text)")
      .eq("room_id", room.id)
      .order("round_number"),
    fetchPlayers(sb, room.id),
  ]);

  type RoundRowLite = {
    id: string;
    round_number: number;
    prompts: { theme: string; display_text: string } | { theme: string; display_text: string }[] | null;
  };
  const rounds = (roundRows as RoundRowLite[] | null) ?? [];
  if (rounds.length === 0) return { rounds: [], best: null };

  const { data: subRows } = await sb
    .from("submissions")
    .select("id, round_id, player_id, rendered_text, vote_count")
    .in(
      "round_id",
      rounds.map((r) => r.id)
    );
  type SubLite = { id: string; round_id: string; player_id: string; rendered_text: string; vote_count: number };
  const subs = (subRows as SubLite[] | null) ?? [];
  const nameOf = new Map(players.map((p) => [p.id, p.name]));

  let best: RecapEntry | null = null;
  const recapRounds = rounds.map((r) => {
    const prompt = one(r.prompts);
    const entries: RecapEntry[] = subs
      .filter((sub) => sub.round_id === r.id)
      .map((sub) => ({
        round_number: r.round_number,
        theme: prompt?.theme ?? "",
        prompt: prompt?.display_text ?? "",
        text: sub.rendered_text,
        votes: sub.vote_count,
        player_id: sub.player_id,
        player_name: nameOf.get(sub.player_id) ?? "Someone",
      }))
      .sort((a, b) => b.votes - a.votes || a.text.localeCompare(b.text));

    const top = entries[0]?.votes ?? 0;
    const winners = top > 0 ? entries.filter((e) => e.votes === top) : [];
    // Rounds are in order, so a strictly-greater check keeps the earliest on ties.
    if (winners[0] && (!best || winners[0].votes > best.votes)) best = winners[0];

    return {
      round_number: r.round_number,
      theme: prompt?.theme ?? "",
      prompt: prompt?.display_text ?? "",
      winners,
    };
  });

  return { rounds: recapRounds, best };
}

// ---------------------------------------------------------------
// Read model for the client
// ---------------------------------------------------------------

function toPublicPlayer(p: PlayerRow): PlayerPublic {
  return { id: p.id, name: p.name, score: p.score, is_host: p.is_host };
}

/**
 * Everything one client needs to render the room. `player` is the caller
 * (from their token) or null for a visitor; authorship is only revealed in
 * the results phase.
 */
export async function buildGameState(
  sb: ServiceClient,
  room: RoomRow,
  player: PlayerRow | null
): Promise<GameState> {
  const [players, round, recap] = await Promise.all([
    fetchPlayers(sb, room.id),
    fetchCurrentRound(sb, room),
    room.status === "finished" ? buildRecap(sb, room) : Promise.resolve(null),
  ]);

  let roundPublic: RoundPublic | null = null;
  let hand: TileData[] = [];
  let submissions: SubmissionPublic[] = [];
  let mySubmission: GameState["mySubmission"] = null;
  let myVote: string | null = null;

  if (round && round.prompts) {
    const prompt: PromptPublic = {
      id: round.prompts.id,
      theme: round.prompts.theme,
      display_text: round.prompts.display_text,
      sentence_frame: round.prompts.sentence_frame,
    };

    const [{ data: subRows }, { count: voteCount }, handRows, voteRow] = await Promise.all([
      sb
        .from("submissions")
        .select("id, player_id, placement, rendered_text, vote_count")
        .eq("round_id", round.id)
        .order("id"),
      sb.from("votes").select("id", { count: "exact", head: true }).eq("round_id", round.id),
      player
        ? sb
            .from("player_hands")
            .select("tiles(id, word, category)")
            .eq("round_id", round.id)
            .eq("player_id", player.id)
        : Promise.resolve({ data: null }),
      player
        ? sb
            .from("votes")
            .select("submission_id")
            .eq("round_id", round.id)
            .eq("voter_id", player.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    type SubRow = {
      id: string;
      player_id: string;
      placement: string[];
      rendered_text: string;
      vote_count: number;
    };
    const subs = (subRows as SubRow[] | null) ?? [];
    const revealAuthors = round.phase === "results";
    const showSubmissions = round.phase === "voting" || round.phase === "results";

    submissions = showSubmissions
      ? subs.map((s) => ({
          id: s.id,
          rendered_text: s.rendered_text,
          vote_count: revealAuthors ? s.vote_count : 0,
          player_id: revealAuthors ? s.player_id : null,
          is_mine: player ? s.player_id === player.id : false,
        }))
      : [];

    const mine = player ? subs.find((s) => s.player_id === player.id) : undefined;
    if (mine) {
      mySubmission = { id: mine.id, placement: mine.placement, rendered_text: mine.rendered_text };
    }

    myVote = (voteRow?.data as { submission_id: string } | null)?.submission_id ?? null;

    hand = ((handRows?.data as { tiles: TileData | TileData[] | null }[] | null) ?? [])
      .map((h) => one(h.tiles))
      .filter((t): t is TileData => Boolean(t));

    roundPublic = {
      id: round.id,
      round_number: round.round_number,
      phase: round.phase,
      phase_ends_at: round.phase_ends_at,
      phase_duration_ms: phaseDurationMs(round.phase, isFreestyle(prompt.sentence_frame), room.settings),
      prompt,
      freestyle: isFreestyle(prompt.sentence_frame),
      submission_count: subs.length,
      vote_count: voteCount ?? 0,
    };
  }

  return {
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      round_count: room.round_count,
      current_round: room.current_round,
      mode: room.mode,
      settings: room.settings ?? {},
    },
    players: players.map(toPublicPlayer),
    me: player ? toPublicPlayer(player) : null,
    round: roundPublic,
    hand,
    submissions,
    mySubmission,
    myVote,
    recap,
  };
}
