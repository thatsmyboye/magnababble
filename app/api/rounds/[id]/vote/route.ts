import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;

  try {
    const authHeader = request.headers.get("Authorization");
    const playerToken = authHeader?.replace("Bearer ", "");

    if (!playerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submissionId }: { submissionId: string } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Validate player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("token", playerToken)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Invalid player token" }, { status: 401 });
    }

    // Validate round phase
    const { data: round } = await supabase
      .from("rounds")
      .select("phase")
      .eq("id", roundId)
      .single();

    if (round?.phase !== "voting") {
      return NextResponse.json({ error: "Voting phase is not active" }, { status: 400 });
    }

    // Prevent voting for own submission
    const { data: ownSubmission } = await supabase
      .from("submissions")
      .select("id")
      .eq("round_id", roundId)
      .eq("player_id", player.id)
      .single();

    if (ownSubmission?.id === submissionId) {
      return NextResponse.json({ error: "Cannot vote for your own submission" }, { status: 400 });
    }

    // Upsert vote (one vote per player per round)
    const { error: voteError } = await supabase
      .from("votes")
      .upsert(
        { round_id: roundId, voter_id: player.id, submission_id: submissionId },
        { onConflict: "round_id,voter_id" }
      );

    if (voteError) throw voteError;

    // Recount votes for the submission
    const { count: voteCount } = await supabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", submissionId);

    await supabase
      .from("submissions")
      .update({ vote_count: voteCount ?? 0 })
      .eq("id", submissionId);

    // Also recount for previously voted submission if player changed vote
    const { data: allSubmissions } = await supabase
      .from("submissions")
      .select("id")
      .eq("round_id", roundId);

    if (allSubmissions) {
      for (const sub of allSubmissions) {
        if (sub.id !== submissionId) {
          const { count } = await supabase
            .from("votes")
            .select("id", { count: "exact", head: true })
            .eq("submission_id", sub.id);
          await supabase
            .from("submissions")
            .update({ vote_count: count ?? 0 })
            .eq("id", sub.id);
        }
      }
    }

    // Auto-advance if all players voted
    const { count: playerCount } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq(
        "room_id",
        (
          await supabase.from("rounds").select("room_id").eq("id", roundId).single()
        ).data?.room_id ?? ""
      );

    const { count: votePlayerCount } = await supabase
      .from("votes")
      .select("voter_id", { count: "exact", head: true })
      .eq("round_id", roundId);

    if ((votePlayerCount ?? 0) >= (playerCount ?? 0)) {
      const { data: roundData } = await supabase
        .from("rounds")
        .select("rooms(code, host_token)")
        .eq("id", roundId)
        .single();

      const roomRaw = roundData?.rooms as unknown as { code: string; host_token: string } | { code: string; host_token: string }[] | null;
      const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
      if (room) {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/rooms/${room.code}/next`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${room.host_token}` },
          }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/rounds/[id]/vote:", err);
    return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
  }
}
