import { NextResponse } from "next/server";
import {
  advanceIfAllVoted,
  fetchPlayerByToken,
  fetchRoundById,
  recountVotes,
  ROOM_COLUMNS,
  type RoomRow,
} from "@/lib/game/engine";
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

    const body = await readJson<{ submissionId: string }>(request);
    const submissionId = body.submissionId;
    if (typeof submissionId !== "string" || !submissionId) {
      return jsonError("submissionId required");
    }

    const sb = getServiceClient();

    const round = await fetchRoundById(sb, roundId);
    if (!round) return jsonError("Round not found", 404);

    const player = await fetchPlayerByToken(sb, round.room_id, token);
    if (!player) return jsonError("Invalid player token", 401);

    if (round.phase !== "voting") return jsonError("Voting is not open");

    const { data: target } = await sb
      .from("submissions")
      .select("id, player_id")
      .eq("id", submissionId)
      .eq("round_id", round.id)
      .maybeSingle();
    if (!target) return jsonError("Submission not found", 404);
    if (target.player_id === player.id) return jsonError("You can't vote for your own sentence");

    // One vote per player per round; re-voting replaces the previous choice.
    const { error: voteError } = await sb
      .from("votes")
      .upsert(
        { round_id: round.id, voter_id: player.id, submission_id: submissionId },
        { onConflict: "round_id,voter_id" }
      );
    if (voteError) throw voteError;

    await recountVotes(sb, round.id);

    const { data: roomRow } = await sb
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("id", round.room_id)
      .single();
    if (roomRow) await advanceIfAllVoted(sb, roomRow as RoomRow, round.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError("POST /api/rounds/[id]/vote", err);
  }
}
