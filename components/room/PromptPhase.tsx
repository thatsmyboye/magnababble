"use client";

import { Timer } from "@/components/ui/timer";
import type { Round } from "@/lib/hooks/useRoom";

interface PromptPhaseProps {
  round: Round;
  roundCount: number;
}

export function PromptPhase({ round, roundCount }: PromptPhaseProps) {
  const prompt = round.prompts;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="mb-6 flex items-center gap-3 text-white/40 text-sm">
        <span>Round {round.round_number} of {roundCount}</span>
        <span>·</span>
        <span className="text-violet-400 font-medium">{prompt?.theme}</span>
      </div>

      <div className="max-w-lg">
        <p className="text-3xl font-bold text-white leading-snug mb-6">
          {prompt?.display_text}
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-8">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Fill in the blanks</p>
          <p className="text-xl text-white font-mono">
            {prompt?.sentence_frame.replace(/__/g, "______")}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-white/50">
          <span>Get ready! Starting in</span>
          <Timer endsAt={round.phase_ends_at} className="text-white text-lg" />
        </div>
      </div>
    </div>
  );
}
