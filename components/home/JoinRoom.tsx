"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { readRememberedName, rememberName, storeCredentials } from "@/lib/hooks/useRoom";
import { extractRoomCode, ROOM_CODE_LENGTH } from "@/lib/utils";

export function JoinRoom() {
  const router = useRouter();
  const codeRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only fill an empty field, so a name typed before the page finished
    // loading is never overwritten.
    setName((current) => current || readRememberedName());
    // Desktop: start with the cursor in the code box. Phones skip this so the
    // keyboard doesn't pop up over the page on arrival.
    if (window.matchMedia("(pointer: fine)").matches) codeRef.current?.focus();
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const roomCode = extractRoomCode(code);
    if (!roomCode || !name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { playerId, playerToken } = await api<{ playerId: string; playerToken: string }>(
        `/api/rooms/${roomCode}/join`,
        { body: { playerName: name.trim() } }
      );
      rememberName(name);
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
        <label htmlFor="join-code" className="block text-sm text-white/60 mb-1">
          Room code or invite link
        </label>
        <Input
          id="join-code"
          ref={codeRef}
          placeholder="e.g. BXKT"
          value={code}
          // Accepts a pasted invite link and keeps just the code.
          onChange={(e) => setCode(extractRoomCode(e.target.value))}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          required
          className="uppercase tracking-[0.4em] font-black text-2xl text-center"
        />
        <p className="text-white/30 text-xs mt-1">
          {ROOM_CODE_LENGTH} letters, from the host&apos;s screen
        </p>
      </div>
      <div>
        <label htmlFor="join-name" className="block text-sm text-white/60 mb-1">
          Your name
        </label>
        <Input
          id="join-name"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="nickname"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        variant="secondary"
        className="w-full"
        disabled={loading || code.length < ROOM_CODE_LENGTH}
      >
        {loading ? "Joining…" : "Join game"}
      </Button>
    </form>
  );
}
