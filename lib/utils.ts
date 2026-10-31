import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Letters that are easy to read aloud and type: no I/O/Q look-alikes. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 4;

/**
 * Random room code such as "BXKT". The caller retries on a unique-key
 * collision; with 23^4 combinations that is rare.
 */
export function generateRoomCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Pull a room code out of whatever the player typed or pasted: a bare code
 * ("bxkt"), or a full invite link ("https://…/room/BXKT?x=1").
 */
export function extractRoomCode(input: string): string {
  const link = /\/room\/([A-Za-z0-9]+)/.exec(input);
  const raw = link ? link[1] : input;
  return normalizeRoomCode(raw).slice(0, ROOM_CODE_LENGTH);
}

export function generateToken(): string {
  return crypto.randomUUID();
}
