"use client";

import { useState } from "react";
import { Timer } from "@/components/ui/timer";
import { PhaseHeader } from "@/components/ui/phase-header";
import { Sentence } from "@/components/ui/sentence";
import { FrameComposer } from "@/components/tiles/FrameComposer";
import { FreestyleComposer } from "@/components/tiles/FreestyleComposer";
import { api } from "@/lib/api/client";
import type { GameState, RoundPublic, TileData } from "@/lib/game/types";

interface SubmissionPhaseProps {
  round: RoundPublic;
  roundCount: number;
  hand: TileData[];
  mySubmission: GameState["mySubmission"];
  playerCount: number;
  token: string | null;
  onSubmitted: () => void;
}

export function SubmissionPhase({
  round,
  roundCount,
  hand,
  mySubmission,
  playerCount,
  token,
  onSubmitted,
}: SubmissionPhaseProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Optimistic: show the waiting screen as soon as the server accepts.
  const [localText, setLocalText] = useState<string | null>(null);

  async function submit(words: string[]) {
    setSubmitting(true);
    setError("");
    try {
      const { renderedText } = await api<{ renderedText: string }>(
        `/api/rounds/${round.id}/submit`,
        { token, body: { placement: words } }
      );
      setLocalText(renderedText);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const submittedText = mySubmission?.rendered_text ?? localText;

  if (submittedText) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-white mb-3">Submitted!</h2>
        <p className="text-white/80 text-lg max-w-md mb-6 leading-relaxed">
          <Sentence text={submittedText} />
        </p>
        <p className="text-white/50">
          {round.submission_count} of {playerCount} players have submitted
        </p>
        <div className="mt-4 text-white/30 text-sm">
          <Timer endsAt={round.phase_ends_at} /> remaining
        </div>
      </div>
    );
  }

  if (hand.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center text-white/40">
        Dealing your tiles…
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <PhaseHeader round={round} roundCount={roundCount} timerLabel="Time:" />

      <h2 className="text-lg text-white font-medium mb-4">{round.prompt.display_text}</h2>

      {round.freestyle ? (
        <FreestyleComposer hand={hand} onSubmit={submit} submitting={submitting} error={error} />
      ) : (
        <FrameComposer
          frame={round.prompt.sentence_frame}
          hand={hand}
          onSubmit={submit}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}
