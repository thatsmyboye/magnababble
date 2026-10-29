import type { RoomMode, RoomStatus, RoundPhase } from "./phases";

/** Shapes shared between the API routes and the client. */

export interface RoomPublic {
  id: string;
  code: string;
  status: RoomStatus;
  round_count: number;
  current_round: number;
  mode: RoomMode;
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
}

export interface RoundPublic {
  id: string;
  round_number: number;
  phase: RoundPhase;
  phase_ends_at: string | null;
  prompt: PromptPublic;
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
}
