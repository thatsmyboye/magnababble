import { NextResponse } from "next/server";
import { advanceRoom, fetchCurrentRound } from "@/lib/game/engine";
import { PHASE_ORDER, type RoundPhase } from "@/lib/game/phases";
import { handleRouteError, jsonError, readJson, requirePlayer } from "@/lib/api/helpers";

/** Non-host players may only nudge the game forward once the clock has run out. */
const NON_HOST_GRACE_MS = 1_000;

interface NextBody {
  expectedPhase: RoundPhase;
  expectedRound: number;
}

/**
 * Advance the room. The host may advance at any time; any other player
 * may advance once the current phase deadline has passed (so a game never
 * stalls if the host's tab is closed). Concurrent calls are safe: the
 * engine compare-and-sets every transition.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const { sb, room, player } = await requirePlayer(request, code);
    const body = await readJson<NextBody>(request);

    if (room.status === "lobby") return jsonError("Game has not started");
    // A finished room answers "stale" (via the engine) so late timers are harmless.

    if (!player.is_host && room.status === "playing") {
      const round = await fetchCurrentRound(sb, room);
      const endsAt = round?.phase_ends_at ? new Date(round.phase_ends_at).getTime() : 0;
      if (Date.now() < endsAt - NON_HOST_GRACE_MS) {
        return jsonError("Only the host can skip ahead before time is up", 403);
      }
    }

    const expectedPhase = (PHASE_ORDER as string[]).includes(body.expectedPhase ?? "")
      ? (body.expectedPhase as RoundPhase)
      : undefined;
    const expectedRound =
      typeof body.expectedRound === "number" ? body.expectedRound : undefined;

    const result = await advanceRoom(sb, room, { expectedPhase, expectedRound });
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError("POST /api/rooms/[code]/next", err);
  }
}
