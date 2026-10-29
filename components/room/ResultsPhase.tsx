"use client";

import { PlayerList } from "@/components/ui/player-list";
import { PhaseHeader } from "@/components/ui/phase-header";
import { Sentence } from "@/components/ui/sentence";
import { cn } from "@/lib/utils";
import type { PlayerPublic, RoundPublic, SubmissionPublic } from "@/lib/game/types";

interface ResultsPhaseProps {
  round: RoundPublic;
  roundCount: number;
  submissions: SubmissionPublic[];
  players: PlayerPublic[];
  myPlayerId: string;
}

export function ResultsPhase({ round, roundCount, submissions, players, myPlayerId }: ResultsPhaseProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const sorted = [...submissions].sort((a, b) => b.vote_count - a.vote_count);
  const topVotes = sorted[0]?.vote_count ?? 0;
  const winners = topVotes > 0 ? sorted.filter((s) => s.vote_count === topVotes) : [];
  const isLastRound = round.round_number >= roundCount;

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <PhaseHeader
        round={round}
        roundCount={roundCount}
        label="Results"
        timerLabel={isLastRound ? "Final scores in" : "Next round in"}
      />

      <h2 className="text-2xl font-bold text-white mb-1">
        {winners.length > 1 ? "It's a tie!" : winners.length === 1 ? "Round winner" : "Results"}
      </h2>
      <p className="text-white/50 text-sm mb-6">{round.prompt.display_text}</p>

      {winners.length > 0 && (
        <div className="space-y-3 mb-6">
          {winners.map((w) => (
            <div
              key={w.id}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4 text-center"
            >
              <p className="text-white text-xl font-bold mb-1 leading-relaxed">
                <Sentence text={w.rendered_text} tileClassName="bg-yellow-400/20 text-yellow-100" />
              </p>
              <p className="text-yellow-300 text-sm">
                {w.player_id ? playerMap[w.player_id]?.name ?? "Unknown" : "Anonymous"} ·{" "}
                {w.vote_count} {w.vote_count === 1 ? "vote" : "votes"}
              </p>
            </div>
          ))}
        </div>
      )}

      {submissions.length === 0 && (
        <p className="text-white/30 text-center py-8">Nobody submitted this round.</p>
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
                  <span className="text-white font-semibold leading-relaxed">
                    <Sentence text={sub.rendered_text} />
                  </span>
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
