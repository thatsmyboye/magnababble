import { NextResponse } from "next/server";
import { buildGameState } from "@/lib/game/engine";
import { handleRouteError, loadRoomAndPlayer } from "@/lib/api/helpers";

/**
 * Full room state for one client. Pass the player's token as a Bearer
 * header to receive their hand, their own submission and their vote;
 * without it the response is the visitor view (lobby/scoreboard only).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const { sb, room, player } = await loadRoomAndPlayer(request, code);
    const state = await buildGameState(sb, room, player);
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError("GET /api/rooms/[code]", err);
  }
}
