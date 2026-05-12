import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const supabase = getServiceClient();

    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { data: players } = await supabase
      .from("players")
      .select("id, name, score, is_host, joined_at")
      .eq("room_id", room.id)
      .order("joined_at");

    // Get current round if playing
    let currentRound = null;
    if (room.status === "playing" && room.current_round > 0) {
      const { data: round } = await supabase
        .from("rounds")
        .select("*, prompts(*)")
        .eq("room_id", room.id)
        .eq("round_number", room.current_round)
        .single();
      currentRound = round;
    }

    return NextResponse.json({ room, players: players ?? [], currentRound });
  } catch (err) {
    console.error("GET /api/rooms/[code]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
