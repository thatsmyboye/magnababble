"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/ui/player-list";
import { api } from "@/lib/api/client";
import { MIN_PLAYERS } from "@/lib/game/engine-constants";
import { MODE_LABELS, type RoomMode } from "@/lib/game/phases";
import type { PlayerPublic } from "@/lib/game/types";

interface LobbyProps {
  code: string;
  players: PlayerPublic[];
  myPlayerId: string;
  isHost: boolean;
  token: string | null;
  roundCount: number;
  mode: RoomMode;
  onStarted: () => void;
}

export function Lobby({
  code,
  players,
  myPlayerId,
  isHost,
  token,
  roundCount,
  mode,
  onStarted,
}: LobbyProps) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/room/${code}`);
  }, [code]);

  async function handleStart() {
    setStarting(true);
    setError("");
    try {
      await api(`/api/rooms/${code}/start`, { token, body: {} });
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStarting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL is still shown for manual copying.
    }
  }

  async function handleShare() {
    if (typeof navigator.share !== "function") return handleCopy();
    try {
      await navigator.share({ title: "Join my Magnababble game", text: `Room code ${code}`, url: shareUrl });
    } catch {
      // User cancelled the share sheet.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const enough = players.length >= MIN_PLAYERS;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-12">
      <h1 className="text-4xl font-black text-white mb-1">
        Magna<span className="text-violet-400">babble</span>
      </h1>
      <p className="text-white/50 text-sm mb-8">
        {roundCount} {roundCount === 1 ? "round" : "rounds"} · {MODE_LABELS[mode].title}
      </p>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 mb-4 text-center">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Room code</p>
        <p className="text-5xl font-black tracking-[0.3em] text-violet-300 pl-[0.3em]">{code}</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? "Link copied!" : "Copy invite link"}
        </Button>
        {canShare && (
          <Button size="sm" variant="ghost" onClick={handleShare}>
            Share…
          </Button>
        )}
      </div>

      <div className="w-full max-w-sm mb-6">
        <p className="text-white/50 text-sm mb-2">
          Players ({players.length})
        </p>
        <PlayerList players={players} highlightId={myPlayerId} />
      </div>

      {isHost ? (
        <div className="text-center">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <Button size="lg" onClick={handleStart} disabled={starting || !enough}>
            {starting ? "Starting…" : "Start game"}
          </Button>
          {!enough && (
            <p className="text-white/30 text-xs mt-2">Need at least {MIN_PLAYERS} players</p>
          )}
        </div>
      ) : (
        <p className="text-white/40 text-sm">Waiting for the host to start the game…</p>
      )}

      <p className="mt-10 text-white/30 text-xs text-center max-w-xs">
        {MODE_LABELS[mode].blurb}
      </p>
    </div>
  );
}
