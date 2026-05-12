import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateToken } from "@/lib/utils";

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
    const { playerName } = await request.json();

    if (!playerName?.trim()) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, status")
      .eq("code", code.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "lobby") {
      return NextResponse.json({ error: "Game already started" }, { status: 400 });
    }

    // Check player count limit
    const { count } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: "Room is full (max 10 players)" }, { status: 400 });
    }

    const playerToken = generateToken();

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: playerName.trim(),
        token: playerToken,
        is_host: false,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    return NextResponse.json({ playerId: player.id, playerToken });
  } catch (err) {
    console.error("POST /api/rooms/[code]/join:", err);
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
