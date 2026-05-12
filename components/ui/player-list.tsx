import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  score: number;
  is_host: boolean;
}

interface PlayerListProps {
  players: Player[];
  highlightId?: string;
  showScores?: boolean;
  className?: string;
}

export function PlayerList({
  players,
  highlightId,
  showScores = false,
  className,
}: PlayerListProps) {
  return (
    <ul className={cn("space-y-2", className)}>
      {players.map((p) => (
        <li
          key={p.id}
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-2",
            p.id === highlightId
              ? "bg-violet-600 text-white"
              : "bg-white/10 text-white/80"
          )}
        >
          <span className="font-medium">
            {p.name}
            {p.is_host && (
              <span className="ml-2 text-xs text-yellow-400">(host)</span>
            )}
          </span>
          {showScores && (
            <span className="font-bold text-violet-300">{p.score} pts</span>
          )}
        </li>
      ))}
    </ul>
  );
}
