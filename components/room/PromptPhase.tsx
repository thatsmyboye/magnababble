"use client";

import { motion } from "framer-motion";
import { Timer } from "@/components/ui/timer";
import { MODIFIER_STYLE } from "@/components/ui/modifier-badge";
import { MODIFIER_INFO } from "@/lib/game/modifiers";
import { cn } from "@/lib/utils";
import type { RoundPublic } from "@/lib/game/types";

interface PromptPhaseProps {
  round: RoundPublic;
  roundCount: number;
}

export function PromptPhase({ round, roundCount }: PromptPhaseProps) {
  const { prompt, freestyle } = round;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="mb-6 flex items-center gap-3 text-white/40 text-sm">
        <span>
          Round {round.round_number} of {roundCount}
        </span>
        <span>·</span>
        <span className="text-violet-400 font-medium">{prompt.theme}</span>
      </div>

      <div className="max-w-lg">
        {round.modifier && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 14 }}
            role="status"
            className={cn(
              "mx-auto mb-6 inline-flex flex-col items-center rounded-2xl border-2 px-6 py-3",
              MODIFIER_STYLE[round.modifier].banner,
              MODIFIER_STYLE[round.modifier].glow
            )}
          >
            <span className="text-2xl font-black">
              <span aria-hidden>{MODIFIER_INFO[round.modifier].icon} </span>
              {MODIFIER_INFO[round.modifier].title}
            </span>
            <span className="text-sm opacity-80">{MODIFIER_INFO[round.modifier].blurb}</span>
          </motion.div>
        )}
        <p className="text-3xl font-bold text-white leading-snug mb-6">{prompt.display_text}</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-8">
          {freestyle ? (
            <>
              <p className="text-violet-300 text-xs uppercase tracking-widest mb-2">Freestyle round</p>
              <p className="text-white/70">
                Build the whole sentence from your tiles, fridge-magnet style.
              </p>
            </>
          ) : (
            <>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Fill in the blanks</p>
              <p className="text-xl text-white font-mono">
                {prompt.sentence_frame.replace(/__/g, "______")}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-white/50">
          <span>Get ready! Starting in</span>
          <Timer endsAt={round.phase_ends_at} className="text-white text-lg" />
        </div>
      </div>
    </div>
  );
}
