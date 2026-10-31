import { NextResponse } from "next/server";
import { startGame } from "@/lib/game/engine";
import { countPlayers, recordEvent } from "@/lib/game/events";
import { handleRouteError, jsonError, requirePlayer } from "@/lib/api/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const { sb, room, player } = await requirePlayer(request, code);
    if (!player.is_host) return jsonError("Only the host can start the game", 403);

    const { started } = await startGame(sb, room);
    if (started) {
      await recordEvent(sb, room, "game_started", { playerCount: await countPlayers(sb, room.id) });
    }
    return NextResponse.json({ ok: true, started });
  } catch (err) {
    return handleRouteError("POST /api/rooms/[code]/start", err);
  }
}
