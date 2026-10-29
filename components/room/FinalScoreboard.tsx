"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { PlayerPublic } from "@/lib/game/types";

interface FinalScoreboardProps {
  code: string;
  players: PlayerPublic[];
  myPlayerId: string;
  isHost: boolean;
  token: string | null;
  onReset: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function FinalScoreboard({ code, players, myPlayerId, isHost, token, onReset }: FinalScoreboardProps) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  const winners = sorted.filter((p) => p.score === top);

  let headline = "Nobody scored!";
  if (top > 0) {
    if (winners.length > 1) {
      headline = `Tie between ${winners.map((w) => (w.id === myPlayerId ? "you" : w.name)).join(" and ")}!`;
    } else {
      headline = winners[0].id === myPlayerId ? "You won!" : `${winners[0].name} wins!`;
    }
  }

  async function handleRematch() {
    setResetting(true);
    setError("");
    try {
      await api(`/api/rooms/${code}/rematch`, { token, body: {} });
      onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a rematch");
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-12 max-w-lg mx-auto">
      <h1 className="text-5xl font-black text-white mb-1">
        Game <span className="text-violet-400">over!</span>
      </h1>
      <p className="text-white/60 text-lg mb-8">{headline}</p>

      <div className="w-full space-y-3 mb-10">
        {sorted.map((player, i) => {
          const isOwn = player.id === myPlayerId;
          const medal = top > 0 ? MEDALS[i] ?? null : null;
          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center justify-between rounded-2xl px-5 py-4 border",
                isOwn ? "bg-violet-700 border-violet-500" : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl w-8 text-center">{medal ?? `${i + 1}`}</span>
                <div>
                  <p className="text-white font-bold">{player.name}</p>
                  {isOwn && <p className="text-violet-300 text-xs">You</p>}
                </div>
              </div>
              <span className="text-violet-300 font-black text-xl">{player.score}</span>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="flex flex-col items-center gap-3">
        {isHost ? (
          <Button size="lg" onClick={handleRematch} disabled={resetting}>
            {resetting ? "Resetting…" : "Rematch with the same players"}
          </Button>
        ) : (
          <p className="text-white/40 text-sm">Waiting to see if the host starts a rematch…</p>
        )}
        <Button variant="ghost" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
