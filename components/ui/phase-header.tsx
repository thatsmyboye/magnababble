import { Timer } from "@/components/ui/timer";
import type { RoundPublic } from "@/lib/game/types";

interface PhaseHeaderProps {
  round: RoundPublic;
  roundCount: number;
  label?: string;
  timerLabel?: string;
}

export function PhaseHeader({ round, roundCount, label, timerLabel }: PhaseHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3 text-white/50 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">
          Round {round.round_number} of {roundCount}
        </span>
        <span className="text-white/20">·</span>
        <span className="text-violet-300 truncate">{round.prompt.theme}</span>
        {label && (
          <>
            <span className="text-white/20">·</span>
            <span className="truncate">{label}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {timerLabel && <span>{timerLabel}</span>}
        <Timer endsAt={round.phase_ends_at} className="text-white" />
      </div>
    </div>
  );
}
