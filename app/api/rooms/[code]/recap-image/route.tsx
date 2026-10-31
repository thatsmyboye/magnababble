import { ImageResponse } from "next/og";
import { buildRecap, fetchPlayers, fetchRoomByCode } from "@/lib/game/engine";
import { getServiceClient } from "@/lib/supabase/service";
import { handleRouteError, jsonError } from "@/lib/api/helpers";
import type { RecapEntry } from "@/lib/game/types";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

/** Split "The [flamingo] escaped" into plain text and tile-word segments. */
function segments(text: string): { word: string; tile: boolean }[] {
  return text
    .split(/(\[[^\]]*\])/g)
    .filter(Boolean)
    .map((part) => {
      const m = /^\[([^\]]*)\]$/.exec(part);
      return m ? { word: m[1] || "___", tile: true } : { word: part, tile: false };
    });
}

function SentenceLine({ entry, size }: { entry: RecapEntry; size: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: size, fontWeight: 700, color: "white", lineHeight: 1.35 }}>
      {segments(entry.text).flatMap((seg, i) =>
        seg.tile
          ? [
              <span
                key={i}
                style={{
                  background: "rgba(250, 204, 21, 0.22)",
                  color: "#fef9c3",
                  borderRadius: 10,
                  padding: "0 10px",
                  margin: "0 6px",
                }}
              >
                {seg.word}
              </span>,
            ]
          : seg.word
              .split(/\s+/)
              .filter(Boolean)
              .map((w, j) => (
                <span key={`${i}-${j}`} style={{ marginRight: 10 }}>
                  {w}
                </span>
              ))
      )}
    </div>
  );
}

/**
 * Shareable PNG recap of a finished game: the best sentence of the night,
 * the round winners, and the top of the leaderboard. Anyone with the room
 * code can view it, like the room itself; authorship is public by then.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const sb = getServiceClient();
    const room = await fetchRoomByCode(sb, code);
    if (!room) return jsonError("Room not found", 404);
    if (room.status !== "finished") return jsonError("The game isn't over yet", 404);

    const [recap, players] = await Promise.all([buildRecap(sb, room), fetchPlayers(sb, room.id)]);
    const standings = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
    const others = recap.rounds
      .flatMap((r) => r.winners.slice(0, 1))
      .filter((w) => !recap.best || w.text !== recap.best.text || w.round_number !== recap.best.round_number)
      .slice(0, 2);

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)",
            padding: "48px 64px",
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>
              <span>Magna</span>
              <span style={{ color: "#a78bfa" }}>babble</span>
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.6)" }}>
              Room {room.code} · {room.round_count} {room.round_count === 1 ? "round" : "rounds"}
            </div>
          </div>

          {recap.best ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 32,
                padding: "28px 36px",
                borderRadius: 28,
                border: "3px solid rgba(250, 204, 21, 0.6)",
                background: "rgba(250, 204, 21, 0.08)",
              }}
            >
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#fde047", fontWeight: 800 }}>
                BEST OF THE NIGHT
              </div>
              <div style={{ display: "flex", marginTop: 12 }}>
                <SentenceLine entry={recap.best} size={recap.best.text.length > 80 ? 36 : 44} />
              </div>
              <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: "#fde047" }}>
                {recap.best.player_name} · {recap.best.votes} {recap.best.votes === 1 ? "vote" : "votes"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", marginTop: 40, fontSize: 40, fontWeight: 800 }}>
              Nobody voted this game. Tough crowd!
            </div>
          )}

          <div style={{ display: "flex", flex: 1, marginTop: 28, gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
              {others.map((w) => (
                <div key={`${w.round_number}-${w.player_id}`} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.5)" }}>
                    Round {w.round_number} · {w.player_name}
                  </div>
                  <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
                    {w.text.replace(/[[\]]/g, "").slice(0, 90)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: 300, gap: 10 }}>
              {standings.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 28,
                    fontWeight: i === 0 ? 900 : 600,
                    color: i === 0 ? "#fde047" : "white",
                  }}
                >
                  <span>
                    {i + 1}. {p.name.slice(0, 14)}
                  </span>
                  <span>{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=600" },
      }
    );
  } catch (err) {
    return handleRouteError("GET /api/rooms/[code]/recap-image", err);
  }
}
