"use client";

import { useEffect, useState } from "react";
import { PhaseHeader } from "@/components/ui/phase-header";
import { Sentence } from "@/components/ui/sentence";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { RoundPublic, SubmissionPublic } from "@/lib/game/types";

interface VotingPhaseProps {
  round: RoundPublic;
  roundCount: number;
  submissions: SubmissionPublic[];
  myVote: string | null;
  playerCount: number;
  token: string | null;
  onVoted: () => void;
}

export function VotingPhase({
  round,
  roundCount,
  submissions,
  myVote,
  playerCount,
  token,
  onVoted,
}: VotingPhaseProps) {
  const [votedId, setVotedId] = useState<string | null>(myVote);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  // Keep in sync if the server knows about a vote we made in another tab.
  useEffect(() => {
    if (myVote) setVotedId(myVote);
  }, [myVote]);

  async function castVote(submissionId: string) {
    setVoting(true);
    setError("");
    try {
      await api(`/api/rounds/${round.id}/vote`, { token, body: { submissionId } });
      setVotedId(submissionId);
      onVoted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  const others = submissions.filter((s) => !s.is_mine);

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <PhaseHeader round={round} roundCount={roundCount} timerLabel="Voting closes in" />

      <h2 className="text-2xl font-bold text-white mb-1">Vote for your favorite</h2>
      <p className="text-white/50 text-sm mb-6">{round.prompt.display_text}</p>

      {others.length === 0 && (
        <p className="text-white/30 text-center py-12">Nothing to vote on this round.</p>
      )}

      <div className="space-y-3 mb-6">
        {submissions.map((sub) => {
          const isVoted = votedId === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => !sub.is_mine && !voting && castVote(sub.id)}
              disabled={sub.is_mine || voting}
              className={cn(
                "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all",
                sub.is_mine
                  ? "bg-white/5 border-white/10 opacity-60 cursor-not-allowed"
                  : isVoted
                  ? "bg-violet-700 border-violet-400 shadow-lg shadow-violet-900/40"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-white font-semibold text-lg leading-relaxed">
                  <Sentence text={sub.rendered_text} />
                  {sub.is_mine && <span className="ml-2 text-xs text-white/30 font-normal">(yours)</span>}
                </span>
                {isVoted && <span className="text-violet-200 text-sm font-bold shrink-0">Voted</span>}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <p className="text-white/40 text-sm text-center">
        {votedId ? "Vote cast — you can change it until time runs out. " : ""}
        {round.vote_count} of {playerCount} votes in
      </p>
    </div>
  );
}
