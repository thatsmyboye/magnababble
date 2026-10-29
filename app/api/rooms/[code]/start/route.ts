import { NextResponse } from "next/server";
import { startGame } from "@/lib/game/engine";
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
    return NextResponse.json({ ok: true, started });
  } catch (err) {
    return handleRouteError("POST /api/rooms/[code]/start", err);
  }
}
