"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Centered } from "@/components/ui/centered";
import { api } from "@/lib/api/client";
import { storeCredentials } from "@/lib/hooks/useRoom";
import type { GameState } from "@/lib/game/types";

interface JoinInPlaceProps {
  state: GameState;
  onJoined: (token: string) => void;
}

/** Shown to someone who opened a room link without having joined yet. */
export function JoinInPlace({ state, onJoined }: JoinInPlaceProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { room, players } = state;

  if (room.status !== "lobby") {
    return (
      <Centered>
        <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Room {room.code}</p>
        <p className="text-white text-2xl font-bold mb-2">
          {room.status === "finished" ? "This game has ended" : "This game is in progress"}
        </p>
        <p className="text-white/40 mb-6">
          Ask the host to start a rematch, or create your own room.
        </p>
        <Link href="/" className="text-violet-400 underline">
          Go home
        </Link>
      </Centered>
    );
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { playerId, playerToken } = await api<{ playerId: string; playerToken: string }>(
        `/api/rooms/${room.code}/join`,
        { body: { playerName: name.trim() } }
      );
      storeCredentials(room.code, playerId, playerToken);
      onJoined(playerToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
      setLoading(false);
    }
  }

  return (
    <Centered>
      <h1 className="text-4xl font-black text-white mb-1">
        Magna<span className="text-violet-400">babble</span>
      </h1>
      <p className="text-white/50 mb-8">
        You&apos;ve been invited to room <span className="text-violet-300 font-bold tracking-widest">{room.code}</span>
        {players.length > 0 && (
          <>
            {" "}
            with {players.map((p) => p.name).join(", ")}
          </>
        )}
      </p>

      <form onSubmit={handleJoin} className="w-full max-w-xs space-y-4 text-left">
        <div>
          <label className="block text-sm text-white/60 mb-1">Your name</label>
          <Input
            autoFocus
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Joining…" : "Join game"}
        </Button>
      </form>
    </Centered>
  );
}
