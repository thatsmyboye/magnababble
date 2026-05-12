"use client";

import { PlayerList } from "@/components/ui/player-list";
import { Timer } from "@/components/ui/timer";
import { cn } from "@/lib/utils";
import type { Player, Round, Submission } from "@/lib/hooks/useRoom";

interface ResultsPhaseProps {
  round: Round;
  roundCount: number;
  submissions: Submission[];
  players: Player[];
  myPlayerId: string;
}

export function ResultsPhase({
  round,
  roundCount,
  submissions,
  players,
  myPlayerId,
}: ResultsPhaseProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const sorted = [...submissions].sort((a, b) => b.vote_count - a.vote_count);
  const winner = sorted[0];

  return (
    <div className="flex flex-col min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 text-white/40 text-sm">
        <span>Round {round.round_number} of {roundCount} — Results</span>
        <div className="flex items-center gap-1">
          <span>Next round in:</span>
          <Timer endsAt={round.phase_ends_at} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-1">Results</h2>
      <p className="text-white/50 text-sm mb-6">{round.prompts?.display_text}</p>

      {winner && winner.vote_count > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4 mb-6 text-center">
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Winner</p>
          <p className="text-white text-xl font-bold mb-1">{winner.rendered_text}</p>
          <p className="text-yellow-300 text-sm">
            {winner.player_id ? playerMap[winner.player_id]?.name : "Anonymous"} · {winner.vote_count} vote{winner.vote_count !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {sorted.map((sub, i) => {
          const author = sub.player_id ? playerMap[sub.player_id] : null;
          const isOwn = sub.player_id === myPlayerId;

          return (
            <div
              key={sub.id}
              className={cn(
                "rounded-2xl px-5 py-4 border",
                isOwn ? "bg-violet-900/30 border-violet-500/30" : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-white/30 text-xs mr-2">{i + 1}.</span>
                  <span className="text-white font-semibold">{sub.rendered_text}</span>
                </div>
                <span className="text-violet-300 font-bold shrink-0">
                  {sub.vote_count} {sub.vote_count === 1 ? "vote" : "votes"}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-1 ml-4">
                {author?.name ?? "Unknown"}
                {isOwn && " (you)"}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-white/50 text-sm mb-3">Scoreboard</h3>
        <PlayerList
          players={[...players].sort((a, b) => b.score - a.score)}
          highlightId={myPlayerId}
          showScores
        />
      </div>
    </div>
  );
}
