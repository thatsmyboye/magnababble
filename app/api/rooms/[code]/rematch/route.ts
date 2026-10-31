import { NextResponse } from "next/server";
import { resetRoom } from "@/lib/game/engine";
import { countPlayers, recordEvent } from "@/lib/game/events";
import { handleRouteError, jsonError, requirePlayer } from "@/lib/api/helpers";

/** Host only: send a finished room back to the lobby with scores reset. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const { sb, room, player } = await requirePlayer(request, code);
    if (!player.is_host) return jsonError("Only the host can start a rematch", 403);
    if (room.status !== "finished") return jsonError("The game is still in progress");

    await resetRoom(sb, room);
    await recordEvent(sb, room, "rematch", { playerCount: await countPlayers(sb, room.id) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError("POST /api/rooms/[code]/rematch", err);
  }
}
