"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { PlayerPublic } from "@/lib/game/types";

interface FinalScoreboardProps {
  code: string;
  players: PlayerPublic[];
  myPlayerId: string;
  isHost: boolean;
  token: string | null;
  onReset: () => void;
}

const PODIUM = [
  { place: 2, height: "h-20", label: "2nd", tone: "bg-slate-300/20 border-slate-300/40" },
  { place: 1, height: "h-28", label: "1st", tone: "bg-yellow-400/20 border-yellow-400/60" },
  { place: 3, height: "h-14", label: "3rd", tone: "bg-amber-700/30 border-amber-600/50" },
];

export function FinalScoreboard({ code, players, myPlayerId, isHost, token, onReset }: FinalScoreboardProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const fired = useRef(false);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  const winners = top > 0 ? sorted.filter((p) => p.score === top) : [];
  const iWon = winners.some((w) => w.id === myPlayerId);

  let headline = "Nobody scored!";
  if (top > 0) {
    headline =
      winners.length > 1
        ? `Tie between ${winners.map((w) => (w.id === myPlayerId ? "you" : w.name)).join(" and ")}!`
        : winners[0].id === myPlayerId
        ? "You won!"
        : `${winners[0].name} wins!`;
  }

  // One confetti burst when the final scores appear.
  useEffect(() => {
    if (fired.current || top === 0 || reduceMotion) return;
    fired.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      const colors = iWon ? ["#facc15", "#a78bfa", "#ffffff"] : ["#a78bfa", "#818cf8", "#ffffff"];
      confetti({ particleCount: iWon ? 160 : 90, spread: 75, origin: { y: 0.3 }, colors });
      if (iWon) setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 350);
      if (iWon) setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 350);
    });
  }, [top, iWon, reduceMotion]);

  async function handleRematch() {
    setResetting(true);
    setError("");
    try {
      await api(`/api/rooms/${code}/rematch`, { token, body: {} });
      onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a rematch");
      setResetting(false);
    }
  }

  // Dense rank: tied players share a place.
  const placeOf = (p: PlayerPublic) => sorted.findIndex((q) => q.score === p.score) + 1;
  const podiumPlayers = PODIUM.map((slot) => ({
    ...slot,
    players: sorted.filter((p) => placeOf(p) === slot.place).slice(0, 3),
  }));
  const rest = sorted.filter((p) => placeOf(p) > 3);

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 max-w-lg mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black text-white mb-1"
      >
        Game <span className="text-violet-400">over!</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/70 text-lg mb-10 text-center"
      >
        {headline}
      </motion.p>

      {top > 0 && (
        <div className="w-full grid grid-cols-3 gap-2 items-end mb-8" role="list" aria-label="Podium">
          {podiumPlayers.map((slot, i) => (
            <motion.div
              key={slot.place}
              role="listitem"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + [0.25, 0, 0.5][i], type: "spring", stiffness: 260, damping: 22 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex flex-col items-center gap-1 min-h-[72px] justify-end">
                {slot.players.map((p) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <Avatar id={p.id} name={p.name} size={slot.place === 1 ? "lg" : "md"} />
                    <span
                      className={cn(
                        "text-sm font-bold text-center leading-tight mt-1 max-w-[7rem] truncate",
                        p.id === myPlayerId ? "text-violet-200" : "text-white"
                      )}
                    >
                      {p.name}
                    </span>
                  </div>
                ))}
                {slot.players.length === 0 && <span className="text-white/20 text-xs">—</span>}
              </div>
              <div
                className={cn(
                  "w-full rounded-t-xl border border-b-0 flex flex-col items-center justify-start pt-2",
                  slot.height,
                  slot.tone
                )}
              >
                <span className="text-white/80 text-xs font-bold uppercase tracking-widest">{slot.label}</span>
                <span className="text-white font-black text-2xl tabular-nums">
                  {slot.players[0]?.score ?? ""}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(rest.length > 0 || top === 0) && (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="w-full space-y-2 mb-8"
        >
          {(top === 0 ? sorted : rest).map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center justify-between rounded-xl px-4 py-2.5 border",
                p.id === myPlayerId ? "bg-violet-700/50 border-violet-500" : "bg-white/5 border-white/10"
              )}
            >
              <span className="flex items-center gap-3">
                <span className="text-white/40 text-sm w-5 text-right tabular-nums">{placeOf(p)}.</span>
                <Avatar id={p.id} name={p.name} size="sm" />
                <span className="text-white font-semibold">
                  {p.name}
                  {p.id === myPlayerId && <span className="ml-2 text-xs text-violet-200">(you)</span>}
                </span>
              </span>
              <span className="text-violet-300 font-black tabular-nums">{p.score}</span>
            </li>
          ))}
        </motion.ul>
      )}

      {error && (
        <p role="alert" className="text-red-400 text-sm mb-3">
          {error}
        </p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="flex flex-col items-center gap-3"
      >
        {isHost ? (
          <Button size="lg" onClick={handleRematch} disabled={resetting}>
            {resetting ? "Resetting…" : "Rematch with the same players"}
          </Button>
        ) : (
          <p className="text-white/40 text-sm">Waiting to see if the host starts a rematch…</p>
        )}
        <Button variant="ghost" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </motion.div>
    </div>
  );
}
