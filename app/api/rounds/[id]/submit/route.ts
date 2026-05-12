import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderSentence } from "@/lib/game/scoring";

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

    // Ordered list of tile words placed in slots
    const { placement }: { placement: string[] } = await request.json();

    if (!Array.isArray(placement)) {
      return NextResponse.json({ error: "Invalid placement data" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Validate player token
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("token", playerToken)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Invalid player token" }, { status: 401 });
    }

    // Validate round is in submitting phase
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("id, phase, prompts(sentence_frame)")
      .eq("id", roundId)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.phase !== "submitting") {
      return NextResponse.json({ error: "Submission phase is not active" }, { status: 400 });
    }

    const promptData = round.prompts as unknown as { sentence_frame: string } | { sentence_frame: string }[] | null;
    const frame = (Array.isArray(promptData) ? promptData[0] : promptData)?.sentence_frame ?? "";
    const renderedText = renderSentence(frame, placement);

    const { error: upsertError } = await supabase
      .from("submissions")
      .upsert(
        {
          round_id: roundId,
          player_id: player.id,
          placement,
          rendered_text: renderedText,
        },
        { onConflict: "round_id,player_id" }
      );

    if (upsertError) throw upsertError;

    // Auto-advance if all players have submitted
    const { count: playerCount } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq(
        "room_id",
        (
          await supabase
            .from("rounds")
            .select("room_id")
            .eq("id", roundId)
            .single()
        ).data?.room_id ?? ""
      );

    const { count: submissionCount } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("round_id", roundId);

    if ((submissionCount ?? 0) >= (playerCount ?? 0)) {
      // Everyone has submitted — advance to voting
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

    return NextResponse.json({ ok: true, renderedText });
  } catch (err) {
    console.error("POST /api/rounds/[id]/submit:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
