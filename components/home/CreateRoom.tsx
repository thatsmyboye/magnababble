"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { ROUND_OPTIONS } from "@/lib/game/engine-constants";
import { MODE_LABELS, ROOM_MODES, type RoomMode } from "@/lib/game/phases";
import { storeCredentials } from "@/lib/hooks/useRoom";
import { cn } from "@/lib/utils";

export function CreateRoom() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(5);
  const [mode, setMode] = useState<RoomMode>("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { code, playerId, playerToken } = await api<{
        code: string;
        playerId: string;
        playerToken: string;
      }>("/api/rooms", { body: { hostName: name.trim(), roundCount: rounds, mode } });

      storeCredentials(code, playerId, playerToken);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1">Your name</label>
        <Input
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">Rounds</label>
        <div className="grid grid-cols-4 gap-2">
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRounds(n)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                rounds === n
                  ? "bg-violet-600 border-violet-400 text-white"
                  : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">Style</label>
        <div className="space-y-2">
          {ROOM_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "w-full text-left rounded-xl border px-4 py-2.5 transition-colors",
                mode === m
                  ? "bg-violet-600/40 border-violet-400"
                  : "bg-white/5 border-white/15 hover:bg-white/10"
              )}
            >
              <span className="block text-white font-semibold text-sm">{MODE_LABELS[m].title}</span>
              <span className="block text-white/50 text-xs">{MODE_LABELS[m].blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create game"}
      </Button>
    </form>
  );
}
