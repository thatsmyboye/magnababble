"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";
import { PlayerList } from "@/components/ui/player-list";
import { PhaseHeader } from "@/components/ui/phase-header";
import { Sentence } from "@/components/ui/sentence";
import { useElapsed } from "@/lib/hooks/useElapsed";
import { cn } from "@/lib/utils";
import type { PlayerPublic, RoundPublic, SubmissionPublic } from "@/lib/game/types";

interface ResultsPhaseProps {
  round: RoundPublic;
  roundCount: number;
  submissions: SubmissionPublic[];
  players: PlayerPublic[];
  myPlayerId: string;
  playerCount: number;
}

/**
 * Reveal timeline (ms from the start of the results phase). When there was a
 * vote, a short "All votes in!" beat plays first so the switch from voting
 * to results is a moment rather than a jump cut.
 */
const BEAT_MS = 1_300;
const CARDS_AFTER = 200;
const VOTES_AFTER = 1_200;
const VOTE_STAGGER = 450;
const AUTHORS_AFTER = 700;
const WINNER_AFTER = 600;

export function ResultsPhase({
  round,
  roundCount,
  submissions,
  players,
  myPlayerId,
  playerCount,
}: ResultsPhaseProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  // The phase clock is shared, so every player sees the same reveal timing,
  // and a late refresh lands on the finished state instead of restarting.
  const duration = round.phase_duration_ms;
  const startIso = round.phase_ends_at
    ? new Date(new Date(round.phase_ends_at).getTime() - duration).toISOString()
    : null;

  const n = submissions.length;
  // Voting is skipped with fewer than two entries, so there is no beat to play.
  const hadVote = n >= 2;
  const beat = hadVote ? BEAT_MS : 0;
  const CARDS_AT = beat + CARDS_AFTER;
  const VOTES_AT = beat + VOTES_AFTER;
  const authorsAt = VOTES_AT + VOTE_STAGGER * Math.max(0, n - 1) + AUTHORS_AFTER;
  const winnerAt = authorsAt + WINNER_AFTER;
  const elapsed = useElapsed(startIso, winnerAt + 500);
  const showBeat = Boolean(startIso) && hadVote && elapsed < beat;
  const everyoneVoted = round.vote_count >= playerCount;

  const showCards = elapsed >= CARDS_AT || !startIso;
  const showAuthors = elapsed >= authorsAt || !startIso;
  const showWinner = elapsed >= winnerAt || !startIso;

  // Votes are revealed from fewest to most, one card at a time.
  const byVotesAsc = [...submissions].sort((a, b) => a.vote_count - b.vote_count || a.id.localeCompare(b.id));
  const revealIndex = Object.fromEntries(byVotesAsc.map((s, i) => [s.id, i]));
  const votesShownFor = (id: string) => !startIso || elapsed >= VOTES_AT + VOTE_STAGGER * revealIndex[id];

  const topVotes = byVotesAsc[n - 1]?.vote_count ?? 0;
  const winners = topVotes > 0 ? submissions.filter((s) => s.vote_count === topVotes) : [];
  const isWinner = (id: string) => showWinner && winners.some((w) => w.id === id);

  // Before the winner reveal, keep the anonymous order; then rank by votes.
  const ordered = showWinner
    ? [...submissions].sort((a, b) => b.vote_count - a.vote_count || a.id.localeCompare(b.id))
    : submissions;

  const isLastRound = round.round_number >= roundCount;
  const maxVotes = Math.max(1, topVotes);

  const headline = !showWinner
    ? "The votes are in…"
    : winners.length > 1
    ? "It's a tie!"
    : winners.length === 1
    ? "Round winner"
    : "No votes this round";

  if (showBeat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
          className="rounded-3xl bg-violet-600 border-2 border-violet-300 px-10 py-8 shadow-2xl shadow-violet-900/60"
          role="status"
        >
          <p className="text-4xl font-black text-white">{everyoneVoted ? "All votes in!" : "Time's up!"}</p>
          <p className="mt-2 text-violet-100">Let&apos;s see what the crowd thinks…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <PhaseHeader
        round={round}
        roundCount={roundCount}
        label="Results"
        timerLabel={isLastRound ? "Final scores in" : "Next round in"}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={headline}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-2xl font-bold text-white mb-1"
          aria-live="polite"
        >
          {headline}
        </motion.h2>
      </AnimatePresence>
      <p className="text-white/50 text-sm mb-6">{round.prompt.display_text}</p>

      {n === 0 && <p className="text-white/30 text-center py-8">Nobody submitted this round.</p>}

      <ul className="space-y-3 mb-8">
        <AnimatePresence initial={false}>
          {showCards &&
            ordered.map((sub, i) => {
              const author = sub.player_id ? playerMap[sub.player_id] : null;
              const isOwn = sub.player_id === myPlayerId;
              const votesShown = votesShownFor(sub.id);
              const winner = isWinner(sub.id);

              return (
                <motion.li
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: winner ? 1.02 : 1,
                    transition: { delay: startIso ? i * 0.08 : 0, type: "spring", stiffness: 300, damping: 28 },
                  }}
                  className={cn(
                    "relative rounded-2xl px-5 py-4 border overflow-hidden",
                    winner
                      ? "bg-yellow-500/10 border-yellow-400/50 shadow-lg shadow-yellow-500/10"
                      : isOwn
                      ? "bg-violet-900/30 border-violet-500/30"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  {winner && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-px right-4 rounded-b-lg bg-yellow-400 text-yellow-950 text-[10px] font-black uppercase tracking-widest px-2 py-0.5"
                    >
                      {winners.length > 1 ? "Tied" : "Winner"}
                    </motion.span>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <p className={cn("text-white font-semibold leading-relaxed", winner ? "text-xl" : "text-lg")}>
                      <Sentence
                        text={sub.rendered_text}
                        tileClassName={winner ? "bg-yellow-400/20 text-yellow-100" : undefined}
                      />
                    </p>
                    <div className="shrink-0 text-right min-w-[52px]">
                      <AnimatePresence mode="wait" initial={false}>
                        {votesShown ? (
                          <motion.p
                            key="votes"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={cn("font-black text-2xl tabular-nums", winner ? "text-yellow-300" : "text-violet-300")}
                          >
                            <CountUp value={sub.vote_count} />
                          </motion.p>
                        ) : (
                          <motion.p key="hidden" exit={{ opacity: 0 }} className="font-black text-2xl text-white/20">
                            ?
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <p className="text-white/40 text-xs">{sub.vote_count === 1 ? "vote" : "votes"}</p>
                    </div>
                  </div>

                  {/* Vote share bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: votesShown ? `${(sub.vote_count / maxVotes) * 100}%` : 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={cn("h-full rounded-full", winner ? "bg-yellow-400" : "bg-violet-400")}
                    />
                  </div>

                  <div className="mt-2 min-h-[24px] flex items-center gap-2 text-xs">
                    <AnimatePresence initial={false}>
                      {showAuthors && (
                        <motion.span
                          key="author"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 text-white/60"
                        >
                          {author && <Avatar id={author.id} name={author.name} size="sm" />}
                          <span>
                            {author?.name ?? "Unknown"}
                            {isOwn && " (you)"}
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.li>
              );
            })}
        </AnimatePresence>
      </ul>

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
