import { NextResponse } from "next/server";
import { EngineError, fetchPlayerByToken, fetchRoomByCode, type PlayerRow, type RoomRow } from "@/lib/game/engine";
import { getServiceClient, type ServiceClient } from "@/lib/supabase/service";

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Map engine errors to HTTP responses; anything else is a 500. */
export function handleRouteError(scope: string, err: unknown) {
  if (err instanceof EngineError) {
    return jsonError(err.message, err.httpStatus);
  }
  console.error(`${scope}:`, err);
  return jsonError("Server error", 500);
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    const body = await request.json();
    return (body ?? {}) as Partial<T>;
  } catch {
    return {};
  }
}

/** Resolve the room by code and the calling player (if any) by bearer token. */
export async function loadRoomAndPlayer(
  request: Request,
  code: string
): Promise<{ sb: ServiceClient; room: RoomRow; player: PlayerRow | null }> {
  const sb = getServiceClient();
  const room = await fetchRoomByCode(sb, code);
  if (!room) throw new EngineError("Room not found", 404);
  const player = await fetchPlayerByToken(sb, room.id, bearerToken(request));
  return { sb, room, player };
}

/** Like loadRoomAndPlayer but a valid player token is mandatory. */
export async function requirePlayer(
  request: Request,
  code: string
): Promise<{ sb: ServiceClient; room: RoomRow; player: PlayerRow }> {
  const { sb, room, player } = await loadRoomAndPlayer(request, code);
  if (!player) throw new EngineError("Invalid player token", 401);
  return { sb, room, player };
}

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 20);
  return name.length > 0 ? name : null;
}
