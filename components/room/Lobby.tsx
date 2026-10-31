"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MotionToggle } from "@/components/ui/motion-provider";
import { PlayerList } from "@/components/ui/player-list";
import { api } from "@/lib/api/client";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/engine-constants";
import { MODE_LABELS, type RoomMode } from "@/lib/game/phases";
import type { PlayerPublic } from "@/lib/game/types";

const TOAST_MS = 2_600;

/** Rotating waiting lines for players who aren't the host. */
const WAITING_LINES = [
  "Waiting for the chaos to begin…",
  "Stretch those vocabulary muscles…",
  "Shuffling the word tiles…",
  "Warming up the bad ideas…",
];

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
  const [showQr, setShowQr] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [toasts, setToasts] = useState<PlayerPublic[]>([]);
  const knownIds = useRef<Set<string> | null>(null);
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Announce new arrivals. The first render seeds the list silently.
  useEffect(() => {
    const ids = new Set(players.map((p) => p.id));
    if (knownIds.current === null) {
      knownIds.current = ids;
      return;
    }
    const arrivals = players.filter((p) => !knownIds.current!.has(p.id) && p.id !== myPlayerId);
    knownIds.current = ids;
    if (arrivals.length === 0) return;
    setToasts((t) => [...t, ...arrivals]);
    // Each batch dismisses itself; timers are only cleared on unmount, so a
    // second arrival never cancels the first toast's dismissal.
    toastTimers.current.push(
      setTimeout(
        () => setToasts((t) => t.filter((x) => !arrivals.some((a) => a.id === x.id))),
        TOAST_MS
      )
    );
  }, [players, myPlayerId]);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/room/${code}`);
    setCanShare(typeof navigator.share === "function");
    // Desktop screens have room for the QR code by default.
    setShowQr(window.matchMedia("(min-width: 768px)").matches);
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
      // Clipboard unavailable — the QR code and room code are still shown.
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: "Join my Magnababble game", text: `Room code ${code}`, url: shareUrl });
    } catch {
      // User cancelled the share sheet.
    }
  }

  const enough = players.length >= MIN_PLAYERS;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10">
      <h1 className="text-4xl font-black text-white mb-1">
        Magna<span className="text-violet-400">babble</span>
      </h1>
      <p className="text-white/50 text-sm mb-8">
        {roundCount} {roundCount === 1 ? "round" : "rounds"} · {MODE_LABELS[mode].title}
      </p>

      <div className="w-full max-w-md grid gap-4 md:grid-cols-[1fr_auto] items-stretch mb-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center flex flex-col justify-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Room code</p>
          <p className="text-5xl font-black tracking-[0.3em] text-violet-300 pl-[0.3em]">{code}</p>
          <p className="text-white/30 text-xs mt-2">
            {players.length} of {MAX_PLAYERS} players
          </p>
        </div>

        <AnimatePresence initial={false}>
          {showQr && shareUrl && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-3 flex items-center justify-center mx-auto"
            >
              <QRCodeSVG
                value={shareUrl}
                size={132}
                level="M"
                includeMargin={false}
                title={`QR code to join room ${code}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? "Link copied!" : "Copy invite link"}
        </Button>
        {canShare && (
          <Button size="sm" variant="secondary" onClick={handleShare}>
            Share…
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowQr((v) => !v)} aria-pressed={showQr}>
          {showQr ? "Hide QR code" : "Show QR code"}
        </Button>
      </div>

      <div className="w-full max-w-sm mb-6">
        <p className="text-white/50 text-sm mb-2">Players ({players.length})</p>
        <PlayerList players={players} highlightId={myPlayerId} />
      </div>

      {isHost ? (
        <div className="text-center">
          {error && (
            <p role="alert" className="text-red-400 text-sm mb-3">
              {error}
            </p>
          )}
          <Button size="lg" onClick={handleStart} disabled={starting || !enough}>
            {starting ? "Starting…" : "Start game"}
          </Button>
          <p className="text-white/40 text-xs mt-2">
            {enough
              ? "Everyone in? Start whenever you're ready."
              : `Invite at least ${MIN_PLAYERS - players.length} more ${
                  MIN_PLAYERS - players.length === 1 ? "player" : "players"
                } to start`}
          </p>
        </div>
      ) : (
        <WaitingLine />
      )}

      <p className="mt-10 text-white/30 text-xs text-center max-w-xs">{MODE_LABELS[mode].blurb}</p>
      <MotionToggle className="mt-4" />

      <div
        className="fixed inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="flex items-center gap-2 rounded-full bg-white text-indigo-950 pl-1.5 pr-4 py-1.5 shadow-xl font-bold"
            >
              <Avatar id={p.id} name={p.name} size="sm" />
              {p.name} joined!
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WaitingLine() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % WAITING_LINES.length), 3_500);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-white/50 text-sm flex items-center gap-2 min-h-[20px]">
      <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse" aria-hidden />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
        >
          {WAITING_LINES[index]}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">The host will start the game.</span>
    </p>
  );
}
