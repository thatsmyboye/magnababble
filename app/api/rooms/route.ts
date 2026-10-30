import { NextResponse } from "next/server";
import { MAX_ROUNDS, MIN_ROUNDS } from "@/lib/game/engine";
import { isRoomMode, type RoomMode } from "@/lib/game/phases";
import { getServiceClient } from "@/lib/supabase/service";
import { generateRoomCode, generateToken } from "@/lib/utils";
import { cleanName, handleRouteError, jsonError, readJson } from "@/lib/api/helpers";

const CODE_ATTEMPTS = 6;

interface CreateBody {
  hostName: string;
  roundCount: number;
  mode: RoomMode;
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateBody>(request);

    const hostName = cleanName(body.hostName);
    if (!hostName) return jsonError("Host name is required");

    const roundCount = Number(body.roundCount ?? 5);
    if (!Number.isInteger(roundCount) || roundCount < MIN_ROUNDS || roundCount > MAX_ROUNDS) {
      return jsonError(`Rounds must be between ${MIN_ROUNDS} and ${MAX_ROUNDS}`);
    }

    const mode: RoomMode = isRoomMode(body.mode) ? body.mode : "mixed";

    const sb = getServiceClient();
    const hostToken = generateToken();
    const playerToken = generateToken();

    // Retry on the rare code collision (UNIQUE constraint on rooms.code).
    let room: { id: string; code: string } | null = null;
    for (let attempt = 0; attempt < CODE_ATTEMPTS && !room; attempt++) {
      const code = generateRoomCode();
      const { data, error } = await sb
        .from("rooms")
        .insert({ code, host_token: hostToken, round_count: roundCount, mode })
        .select("id, code")
        .single();
      if (!error && data) {
        room = data;
      } else if ((error as { code?: string } | null)?.code !== "23505") {
        throw error;
      }
    }
    if (!room) return jsonError("Could not allocate a room code, try again", 503);

    const { data: player, error: playerError } = await sb
      .from("players")
      .insert({ room_id: room.id, name: hostName, token: playerToken, is_host: true })
      .select("id")
      .single();
    if (playerError) throw playerError;

    return NextResponse.json({ code: room.code, playerId: player.id, playerToken });
  } catch (err) {
    return handleRouteError("POST /api/rooms", err);
  }
}
