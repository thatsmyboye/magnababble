"use client";

import { useState } from "react";
import { Timer } from "@/components/ui/timer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Round, Submission } from "@/lib/hooks/useRoom";

interface VotingPhaseProps {
  code: string;
  round: Round;
  roundCount: number;
  submissions: Submission[];
  myPlayerId: string;
  mySubmissionId?: string;
}

export function VotingPhase({
  code,
  round,
  roundCount,
  submissions,
  myPlayerId,
  mySubmissionId,
}: VotingPhaseProps) {
  const [votedId, setVotedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  async function castVote(submissionId: string) {
    if (submissionId === mySubmissionId) return;
    setVoting(true);
    setError("");

    const playerToken = localStorage.getItem(`magnababble_token_${code}`);

    try {
      const res = await fetch(`/api/rounds/${round.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Vote failed");
      }

      setVotedId(submissionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 text-white/40 text-sm">
        <span>Round {round.round_number} of {roundCount}</span>
        <div className="flex items-center gap-1">
          <span>Vote closes in:</span>
          <Timer endsAt={round.phase_ends_at} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-1">Vote for your favorite</h2>
      <p className="text-white/50 text-sm mb-6">
        {round.prompts?.display_text}
      </p>

      {submissions.length === 0 && (
        <p className="text-white/30 text-center py-12">No submissions yet...</p>
      )}

      <div className="space-y-3 mb-6">
        {submissions.map((sub, i) => {
          const isOwn = sub.player_id === myPlayerId || (!sub.player_id && mySubmissionId === sub.id);
          const isVoted = votedId === sub.id;

          return (
            <button
              key={sub.id}
              onClick={() => !isOwn && !voting && castVote(sub.id)}
              disabled={isOwn || voting}
              className={cn(
                "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all",
                isOwn
                  ? "bg-white/5 border-white/10 opacity-60 cursor-not-allowed"
                  : isVoted
                  ? "bg-violet-700 border-violet-400 shadow-lg shadow-violet-900/40"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-white/30 text-xs mr-2">{i + 1}.</span>
                  <span className="text-white font-semibold">{sub.rendered_text}</span>
                  {isOwn && (
                    <span className="ml-2 text-xs text-white/30">(yours)</span>
                  )}
                </div>
                {isVoted && (
                  <span className="text-violet-300 text-sm font-bold shrink-0">Voted</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {votedId && (
        <p className="text-white/40 text-sm text-center">
          Vote cast. You can change it until time runs out.
        </p>
      )}
    </div>
  );
}
