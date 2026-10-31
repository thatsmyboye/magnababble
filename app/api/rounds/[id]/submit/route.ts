import { NextResponse } from "next/server";
import {
  advanceIfAllSubmitted,
  fetchPlayerByToken,
  fetchRoundById,
  ROOM_COLUMNS,
  type RoomRow,
} from "@/lib/game/engine";
import { placementUsesHand } from "@/lib/game/dealing";
import { effectiveFrame } from "@/lib/game/modifiers";
import { countSlots, FREESTYLE_MAX_WORDS, isFreestyle, renderSubmission } from "@/lib/game/scoring";
import { getServiceClient } from "@/lib/supabase/service";
import { bearerToken, handleRouteError, jsonError, readJson } from "@/lib/api/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;

  try {
    const token = bearerToken(request);
    if (!token) return jsonError("Unauthorized", 401);

    const body = await readJson<{ placement: unknown }>(request);
    const placement = body.placement;
    if (!Array.isArray(placement) || !placement.every((w) => typeof w === "string")) {
      return jsonError("Invalid placement data");
    }

    const sb = getServiceClient();

    const round = await fetchRoundById(sb, roundId);
    if (!round || !round.prompts) return jsonError("Round not found", 404);

    const player = await fetchPlayerByToken(sb, round.room_id, token);
    if (!player) return jsonError("Invalid player token", 401);

    if (round.phase !== "submitting") return jsonError("Submissions are closed for this round");

    // Validate against the frame players saw (chaos rounds add a blank).
    const frame = effectiveFrame(round.prompts.sentence_frame, round.modifier);
    const freestyle = isFreestyle(frame);
    const words = (placement as string[]).map((w) => w.trim());

    if (freestyle) {
      if (words.length === 0) return jsonError("Place at least one tile");
      if (words.length > FREESTYLE_MAX_WORDS) {
        return jsonError(`Use at most ${FREESTYLE_MAX_WORDS} tiles`);
      }
    } else if (words.length !== countSlots(frame) || words.some((w) => !w)) {
      return jsonError("Fill every blank before submitting");
    }

    // Only tiles from the player's dealt hand are allowed.
    const { data: handRows } = await sb
      .from("player_hands")
      .select("tiles(word)")
      .eq("round_id", round.id)
      .eq("player_id", player.id);
    const hand = ((handRows as { tiles: { word: string } | { word: string }[] | null }[] | null) ?? [])
      .map((h) => (Array.isArray(h.tiles) ? h.tiles[0] : h.tiles))
      .filter((t): t is { word: string } => Boolean(t));

    if (!placementUsesHand(words, hand)) {
      return jsonError("You can only use tiles from your hand");
    }

    const renderedText = renderSubmission(frame, words);

    const { error: upsertError } = await sb
      .from("submissions")
      .upsert(
        { round_id: round.id, player_id: player.id, placement: words, rendered_text: renderedText },
        { onConflict: "round_id,player_id" }
      );
    if (upsertError) throw upsertError;

    const { data: roomRow } = await sb
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("id", round.room_id)
      .single();
    if (roomRow) await advanceIfAllSubmitted(sb, roomRow as RoomRow, round.id);

    return NextResponse.json({ ok: true, renderedText });
  } catch (err) {
    return handleRouteError("POST /api/rounds/[id]/submit", err);
  }
}
