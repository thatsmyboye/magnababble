"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { storeCredentials } from "@/lib/hooks/useRoom";
import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@/lib/utils";

export function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const roomCode = normalizeRoomCode(code);
    if (!roomCode || !name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { playerId, playerToken } = await api<{ playerId: string; playerToken: string }>(
        `/api/rooms/${roomCode}/join`,
        { body: { playerName: name.trim() } }
      );
      storeCredentials(roomCode, playerId, playerToken);
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1">Room code</label>
        <Input
          placeholder="e.g. BXKT"
          value={code}
          onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
          maxLength={ROOM_CODE_LENGTH + 2}
          autoCapitalize="characters"
          autoComplete="off"
          required
          className="uppercase tracking-widest font-bold text-lg"
        />
      </div>
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
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={loading}>
        {loading ? "Joining…" : "Join game"}
      </Button>
    </form>
  );
}
