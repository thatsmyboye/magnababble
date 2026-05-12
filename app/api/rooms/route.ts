import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateRoomCode, generateToken } from "@/lib/utils";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { hostName, roundCount = 5 } = await request.json();

    if (!hostName?.trim()) {
      return NextResponse.json({ error: "Host name is required" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const code = generateRoomCode();
    const hostToken = generateToken();
    const playerToken = generateToken();

    // Create room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ code, host_token: hostToken, round_count: roundCount })
      .select()
      .single();

    if (roomError) throw roomError;

    // Create host player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: hostName.trim(),
        token: playerToken,
        is_host: true,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    return NextResponse.json({
      code,
      hostToken,
      playerId: player.id,
      playerToken,
    });
  } catch (err) {
    console.error("POST /api/rooms:", err);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
