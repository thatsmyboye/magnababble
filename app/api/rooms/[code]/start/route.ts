import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { phaseEndsAt } from "@/lib/game/phases";
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
      .select("id, status, host_token, round_count")
      .eq("code", code.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_token !== hostToken) {
      return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
    }

    if (room.status !== "lobby") {
      return NextResponse.json({ error: "Game already started" }, { status: 400 });
    }

    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", room.id);

    if (!players || players.length < 2) {
      return NextResponse.json({ error: "Need at least 2 players to start" }, { status: 400 });
    }

    // Pick a random prompt for round 1
    const { data: prompts } = await supabase
      .from("prompts")
      .select("id, sentence_frame, tile_set_id");

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ error: "No prompts available" }, { status: 500 });
    }

    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    const slotCount = countSlots(prompt.sentence_frame);
    const handSize = slotCount + 5; // always more tiles than slots

    // Create round 1
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        room_id: room.id,
        round_number: 1,
        prompt_id: prompt.id,
        phase: "prompt",
        phase_ends_at: phaseEndsAt("prompt"),
      })
      .select()
      .single();

    if (roundError) throw roundError;

    // Deal tiles to each player
    const { data: allTiles } = await supabase
      .from("tiles")
      .select("id")
      .eq("tile_set_id", prompt.tile_set_id ?? "00000000-0000-0000-0000-000000000001");

    if (allTiles && allTiles.length > 0) {
      const handInserts = players.flatMap((player) => {
        const shuffled = [...allTiles].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, handSize).map((tile) => ({
          round_id: round.id,
          player_id: player.id,
          tile_id: tile.id,
        }));
      });

      await supabase.from("player_hands").insert(handInserts);
    }

    // Update room status
    await supabase
      .from("rooms")
      .update({ status: "playing", current_round: 1 })
      .eq("id", room.id);

    return NextResponse.json({ roundId: round.id });
  } catch (err) {
    console.error("POST /api/rooms/[code]/start:", err);
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}
