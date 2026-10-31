import type { RoomMode, RoomStatus, RoundPhase } from "./phases";
import type { RoomSettings } from "./settings";
import type { RoundModifier } from "./modifiers";

/** Shapes shared between the API routes and the client. */

export interface RoomPublic {
  id: string;
  code: string;
  status: RoomStatus;
  round_count: number;
  current_round: number;
  mode: RoomMode;
  settings: RoomSettings;
}

export interface PlayerPublic {
  id: string;
  name: string;
  score: number;
  is_host: boolean;
}

export interface PromptPublic {
  id: string;
  theme: string;
  display_text: string;
  sentence_frame: string;
  /** Expected tile category per blank, or null for no hint. */
  slot_hints: (string | null)[] | null;
}

export interface RoundPublic {
  id: string;
  round_number: number;
  phase: RoundPhase;
  phase_ends_at: string | null;
  /** Full length of the current phase, honoring the room's house rules. */
  phase_duration_ms: number;
  prompt: PromptPublic;
  /** Special round, when the room plays with special rounds. */
  modifier: RoundModifier | null;
  /** True when the prompt has no blanks and players compose freely. */
  freestyle: boolean;
  submission_count: number;
  vote_count: number;
}

export interface TileData {
  id: string;
  word: string;
  category: string;
}

export interface SubmissionPublic {
  id: string;
  rendered_text: string;
  vote_count: number;
  /** Only populated during the results phase. */
  player_id: string | null;
  is_mine: boolean;
}

export interface GameState {
  room: RoomPublic;
  players: PlayerPublic[];
  /** The requesting player, or null for a visitor without a token. */
  me: PlayerPublic | null;
  round: RoundPublic | null;
  hand: TileData[];
  /** Visible during voting and results. Empty otherwise. */
  submissions: SubmissionPublic[];
  mySubmission: { id: string; placement: string[]; rendered_text: string } | null;
  /** Submission id this player voted for in the current round. */
  myVote: string | null;
  /** End-of-game highlights; only present once the room is finished. */
  recap: Recap | null;
}

export interface RecapEntry {
  round_number: number;
  theme: string;
  prompt: string;
  text: string;
  votes: number;
  player_id: string;
  player_name: string;
}

export interface RecapRound {
  round_number: number;
  theme: string;
  prompt: string;
  /** Highest-voted entries; several when tied, empty when nobody got a vote. */
  winners: RecapEntry[];
}

export interface Recap {
  rounds: RecapRound[];
  /** The single most-voted sentence of the game (earliest round wins ties). */
  best: RecapEntry | null;
}
