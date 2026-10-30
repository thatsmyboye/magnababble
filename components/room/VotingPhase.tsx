"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PhaseHeader } from "@/components/ui/phase-header";
import { Sentence } from "@/components/ui/sentence";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { shuffle } from "@/lib/game/dealing";
import { cn } from "@/lib/utils";
import type { RoundPublic, SubmissionPublic } from "@/lib/game/types";

interface VotingPhaseProps {
  round: RoundPublic;
  roundCount: number;
  submissions: SubmissionPublic[];
  myVote: string | null;
  myPlayerId: string;
  playerCount: number;
  token: string | null;
  onVoted: () => void;
}

/** Small seeded generator so each voter gets a stable, personal order. */
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function VotingPhase({
  round,
  roundCount,
  submissions,
  myVote,
  myPlayerId,
  playerCount,
  token,
  onVoted,
}: VotingPhaseProps) {
  const [votedId, setVotedId] = useState<string | null>(myVote);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Keep in sync if the server knows about a vote we made in another tab.
  useEffect(() => {
    if (myVote) setVotedId(myVote);
  }, [myVote]);

  // Every voter sees a different order, so no entry benefits from going first.
  const ordered = useMemo(
    () => shuffle(submissions, seededRng(`${round.id}:${myPlayerId}`)),
    [submissions, round.id, myPlayerId]
  );

  async function castVote(submissionId: string) {
    setPendingId(submissionId);
    setFailedId(null);
    setError("");
    try {
      await api(`/api/rounds/${round.id}/vote`, { token, body: { submissionId } });
      setVotedId(submissionId);
      onVoted();
    } catch (err) {
      setFailedId(submissionId);
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setPendingId(null);
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

      <ul className="space-y-3 mb-6" aria-label="Submissions">
        {ordered.map((sub, i) => {
          const isVoted = votedId === sub.id;
          const isPending = pendingId === sub.id;
          const isFailed = failedId === sub.id;
          return (
            <motion.li
              key={sub.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <motion.button
                type="button"
                onClick={() => !sub.is_mine && !pendingId && castVote(sub.id)}
                disabled={sub.is_mine || Boolean(pendingId)}
                aria-pressed={isVoted}
                whileTap={sub.is_mine ? undefined : { scale: 0.98 }}
                animate={isVoted ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "w-full text-left rounded-2xl px-5 py-5 border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950",
                  sub.is_mine
                    ? "bg-white/5 border-white/10 opacity-60 cursor-not-allowed"
                    : isVoted
                    ? "bg-violet-700 border-violet-300 shadow-lg shadow-violet-900/50"
                    : isFailed
                    ? "bg-red-950/40 border-red-400/60"
                    : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 cursor-pointer"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-white font-semibold text-xl leading-relaxed">
                    <Sentence text={sub.rendered_text} tileClassName={isVoted ? "bg-white/20 text-white" : undefined} />
                  </span>
                  <span className="shrink-0 text-sm font-bold">
                    {sub.is_mine ? (
                      <span className="text-white/30 font-normal">yours</span>
                    ) : isPending ? (
                      <span className="text-white/50">…</span>
                    ) : isVoted ? (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-white"
                      >
                        ✓ Voted
                      </motion.span>
                    ) : isFailed ? (
                      <span className="text-red-300">Retry</span>
                    ) : null}
                  </span>
                </div>
              </motion.button>
            </motion.li>
          );
        })}
      </ul>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-950/40 border border-red-400/40 px-4 py-2 mb-3 text-sm text-red-200">
          <span>{error}</span>
          {failedId && (
            <Button size="sm" variant="danger" onClick={() => castVote(failedId)}>
              Try again
            </Button>
          )}
        </div>
      )}

      <p className="text-white/40 text-sm text-center" aria-live="polite">
        {votedId ? "Vote cast. You can change it until time runs out. " : ""}
        {round.vote_count} of {playerCount} votes in
      </p>
    </div>
  );
}
