"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateRoom() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim(), roundCount: rounds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create room");
      }

      const { code, hostToken, playerId, playerToken } = await res.json();

      localStorage.setItem(`magnababble_token_${code}`, playerToken);
      localStorage.setItem(`magnababble_player_${code}`, playerId);
      localStorage.setItem(`magnababble_host_${code}`, hostToken);

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
        <select
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value))}
          className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {[3, 5, 7, 10].map((n) => (
            <option key={n} value={n} className="bg-indigo-900">
              {n} rounds
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create Game"}
      </Button>
    </form>
  );
}
