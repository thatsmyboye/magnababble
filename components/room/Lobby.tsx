"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/ui/player-list";
import type { Player } from "@/lib/hooks/useRoom";

interface LobbyProps {
  code: string;
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  roundCount: number;
}

export function Lobby({ code, players, myPlayerId, isHost, roundCount }: LobbyProps) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setStarting(true);
    setError("");

    const hostToken = localStorage.getItem(`magnababble_host_${code}`);

    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hostToken}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-12">
      <h1 className="text-4xl font-black text-white mb-1">
        Magna<span className="text-violet-400">babble</span>
      </h1>
      <p className="text-white/50 text-sm mb-8">{roundCount} rounds</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 mb-8 text-center">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Room Code</p>
        <p className="text-4xl font-black tracking-widest text-violet-300">{code}</p>
        <p className="text-white/40 text-xs mt-1">Share this with friends</p>
      </div>

      <div className="w-full max-w-sm mb-6">
        <p className="text-white/50 text-sm mb-2">Players ({players.length})</p>
        <PlayerList players={players} highlightId={myPlayerId} />
      </div>

      {isHost && (
        <div className="text-center">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <Button
            size="lg"
            onClick={handleStart}
            disabled={starting || players.length < 2}
          >
            {starting ? "Starting..." : "Start Game"}
          </Button>
          {players.length < 2 && (
            <p className="text-white/30 text-xs mt-2">Need at least 2 players</p>
          )}
        </div>
      )}

      {!isHost && (
        <p className="text-white/40 text-sm">Waiting for host to start the game...</p>
      )}
    </div>
  );
}
