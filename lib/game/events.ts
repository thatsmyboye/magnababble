import type { ServiceClient } from "@/lib/supabase/service";

export type GameEvent = "room_created" | "player_joined" | "game_started" | "game_finished" | "rematch";

/**
 * Append a funnel event (migration 006, `game_events`). Best effort: a
 * failure is logged and swallowed so analytics can never break a game.
 */
export async function recordEvent(
  sb: ServiceClient,
  room: { id: string; code: string },
  event: GameEvent,
  details: { playerCount?: number; extra?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const { error } = await sb.from("game_events").insert({
      room_id: room.id,
      room_code: room.code,
      event,
      player_count: details.playerCount ?? null,
      details: details.extra ?? {},
    });
    if (error) console.warn(`recordEvent(${event}) failed:`, error.message);
  } catch (err) {
    console.warn(`recordEvent(${event}) threw:`, err);
  }
}

export async function countPlayers(sb: ServiceClient, roomId: string): Promise<number> {
  const { count } = await sb
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  return count ?? 0;
}
