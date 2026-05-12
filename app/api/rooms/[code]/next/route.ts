import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nextPhase, phaseEndsAt } from "@/lib/game/phases";
import { countSlots } from "@/lib/game/scoring";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const authHeader = request.headers.get("Authorization");
    const hostToken = authHeader?.replace("Bearer ", "");

    if (!hostToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, status, host_token, round_count, current_round")
      .eq("code", code.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_token !== hostToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get current round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("id, phase, round_number, prompt_id")
      .eq("room_id", room.id)
      .eq("round_number", room.current_round)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const currentPhase = round.phase as Parameters<typeof nextPhase>[0];
    const next = nextPhase(currentPhase);

    if (next === null) {
      // results phase is done — move to next round or finish
      const nextRoundNumber = round.round_number + 1;

      if (nextRoundNumber > room.round_count) {
        // Game over
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", room.id);
        return NextResponse.json({ status: "finished" });
      }

      // Apply vote-based scores from completed round
      const { data: submissions } = await supabase
        .from("submissions")
        .select("player_id, vote_count")
        .eq("round_id", round.id);

      if (submissions) {
        for (const sub of submissions) {
          if (sub.vote_count > 0) {
            await supabase.rpc("increment_score", {
              p_player_id: sub.player_id,
              p_amount: sub.vote_count,
            });
          }
        }
      }

      // Pick a random unused prompt for next round
      const { data: usedPrompts } = await supabase
        .from("rounds")
        .select("prompt_id")
        .eq("room_id", room.id);

      const usedIds = (usedPrompts ?? []).map((r) => r.prompt_id);

      const { data: allPrompts } = await supabase
        .from("prompts")
        .select("id, sentence_frame, tile_set_id");

      const available = (allPrompts ?? []).filter((p) => !usedIds.includes(p.id));
      const pool = available.length > 0 ? available : allPrompts ?? [];

      if (!pool || pool.length === 0) {
        return NextResponse.json({ error: "No prompts available" }, { status: 500 });
      }

      const prompt = pool[Math.floor(Math.random() * pool.length)];
      const slotCount = countSlots(prompt.sentence_frame);
      const handSize = slotCount + 5;

      const { data: newRound, error: newRoundError } = await supabase
        .from("rounds")
        .insert({
          room_id: room.id,
          round_number: nextRoundNumber,
          prompt_id: prompt.id,
          phase: "prompt",
          phase_ends_at: phaseEndsAt("prompt"),
        })
        .select()
        .single();

      if (newRoundError) throw newRoundError;

      // Deal tiles for new round
      const { data: players } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", room.id);

      const { data: allTiles } = await supabase
        .from("tiles")
        .select("id")
        .eq("tile_set_id", prompt.tile_set_id ?? "00000000-0000-0000-0000-000000000001");

      if (players && allTiles && allTiles.length > 0) {
        const handInserts = players.flatMap((player) => {
          const shuffled = [...allTiles].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, handSize).map((tile) => ({
            round_id: newRound.id,
            player_id: player.id,
            tile_id: tile.id,
          }));
        });
        await supabase.from("player_hands").insert(handInserts);
      }

      await supabase
        .from("rooms")
        .update({ current_round: nextRoundNumber })
        .eq("id", room.id);

      return NextResponse.json({ status: "next_round", roundNumber: nextRoundNumber });
    }

    // Advance current round to next phase
    await supabase
      .from("rounds")
      .update({ phase: next, phase_ends_at: phaseEndsAt(next) })
      .eq("id", round.id);

    return NextResponse.json({ status: "phase_advanced", phase: next });
  } catch (err) {
    console.error("POST /api/rooms/[code]/next:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
