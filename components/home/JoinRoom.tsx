"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError("");

    const upperCode = code.trim().toUpperCase();

    try {
      const res = await fetch(`/api/rooms/${upperCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to join room");
      }

      const { playerId, playerToken } = await res.json();

      localStorage.setItem(`magnababble_token_${upperCode}`, playerToken);
      localStorage.setItem(`magnababble_player_${upperCode}`, playerId);

      router.push(`/room/${upperCode}`);
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
          placeholder="e.g. KOALA"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
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
        {loading ? "Joining..." : "Join Game"}
      </Button>
    </form>
  );
}
