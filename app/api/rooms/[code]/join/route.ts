import { NextResponse } from "next/server";
import { fetchRoomByCode, MAX_PLAYERS } from "@/lib/game/engine";
import { recordEvent } from "@/lib/game/events";
import { getServiceClient } from "@/lib/supabase/service";
import { generateToken } from "@/lib/utils";
import { cleanName, handleRouteError, jsonError, readJson } from "@/lib/api/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const body = await readJson<{ playerName: string }>(request);
    const playerName = cleanName(body.playerName);
    if (!playerName) return jsonError("Player name is required");

    const sb = getServiceClient();
    const room = await fetchRoomByCode(sb, code);
    if (!room) return jsonError("Room not found", 404);
    if (room.status !== "lobby") return jsonError("That game has already started");

    const { count } = await sb
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    if ((count ?? 0) >= MAX_PLAYERS) {
      return jsonError(`Room is full (max ${MAX_PLAYERS} players)`);
    }

    const playerToken = generateToken();
    const { data: player, error } = await sb
      .from("players")
      .insert({ room_id: room.id, name: playerName, token: playerToken, is_host: false })
      .select("id")
      .single();
    if (error) throw error;

    await recordEvent(sb, room, "player_joined", { playerCount: (count ?? 0) + 1 });

    return NextResponse.json({ code: room.code, playerId: player.id, playerToken });
  } catch (err) {
    return handleRouteError("POST /api/rooms/[code]/join", err);
  }
}
