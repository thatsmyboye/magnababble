"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/hooks/useRoom";

interface FinalScoreboardProps {
  players: Player[];
  myPlayerId: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function FinalScoreboard({ players, myPlayerId }: FinalScoreboardProps) {
  const router = useRouter();
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-12 max-w-lg mx-auto">
      <h1 className="text-5xl font-black text-white mb-1">
        Game <span className="text-violet-400">Over!</span>
      </h1>

      {winner && (
        <p className="text-white/60 text-lg mb-8">
          {winner.id === myPlayerId ? "You won!" : `${winner.name} wins!`}
        </p>
      )}

      <div className="w-full space-y-3 mb-10">
        {sorted.map((player, i) => {
          const isOwn = player.id === myPlayerId;
          const medal = MEDALS[i] ?? null;

          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center justify-between rounded-2xl px-5 py-4 border",
                isOwn
                  ? "bg-violet-700 border-violet-500"
                  : "bg-white/5 border-white/10"
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

      <Button size="lg" onClick={() => router.push("/")}>
        Play Again
      </Button>
    </div>
  );
}
