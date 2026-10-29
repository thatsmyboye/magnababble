"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameState } from "@/lib/game/types";

export type { GameState, PlayerPublic as Player, RoundPublic as Round, SubmissionPublic as Submission, TileData } from "@/lib/game/types";

export const storageKeys = {
  token: (code: string) => `magnababble_token_${code}`,
  playerId: (code: string) => `magnababble_player_${code}`,
};

export function readStoredToken(code: string): string | null {
  try {
    return localStorage.getItem(storageKeys.token(code));
  } catch {
    return null;
  }
}

export function storeCredentials(code: string, playerId: string, token: string) {
  try {
    localStorage.setItem(storageKeys.token(code), token);
    localStorage.setItem(storageKeys.playerId(code), playerId);
  } catch {
    // Private mode or storage disabled — the session just won't survive a reload.
  }
}

/** Safety-net polling intervals in case Realtime is unavailable. */
const POLL_MS: Record<string, number> = { lobby: 8_000, playing: 4_000, finished: 15_000 };

/**
 * Room state for one client. The server is the single source of truth:
 * every Realtime change notification (and a slow fallback poll) triggers
 * a refetch of the full state, so there are no stale partial updates.
 */
export function useRoom(code: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const queued = useRef(false);

  // Load the stored token once on mount.
  useEffect(() => {
    const stored = readStoredToken(code);
    tokenRef.current = stored;
    setToken(stored);
  }, [code]);

  const refresh = useCallback(async () => {
    // Coalesce bursts of change events into at most one extra fetch.
    if (inFlight.current) {
      queued.current = true;
      return inFlight.current;
    }

    const run = async () => {
      try {
        const headers: HeadersInit = {};
        if (tokenRef.current) headers.Authorization = `Bearer ${tokenRef.current}`;
        const res = await fetch(`/api/rooms/${code}`, { headers, cache: "no-store" });
        if (res.status === 404) {
          setError("Room not found");
          return;
        }
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as GameState;
        setState(data);
        setError(null);
      } catch (err) {
        console.error("refresh failed", err);
        if (!state) setError("Could not load the room");
      } finally {
        setLoading(false);
      }
    };

    inFlight.current = run().finally(() => {
      inFlight.current = null;
      if (queued.current) {
        queued.current = false;
        void refresh();
      }
    });
    return inFlight.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /** Called after joining in place so the next refresh carries the token. */
  const adoptToken = useCallback(
    (next: string) => {
      tokenRef.current = next;
      setToken(next);
      void refresh();
    },
    [refresh]
  );

  // Initial load whenever the code or token changes.
  useEffect(() => {
    void refresh();
  }, [code, token, refresh]);

  // Room-level Realtime subscriptions.
  const roomId = state?.room.id;
  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code, roomId, refresh]);

  // Submissions change per round (new submissions arriving, vote counts).
  const roundId = state?.round?.id;
  useEffect(() => {
    if (!roundId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`round:${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `round_id=eq.${roundId}` },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roundId, refresh]);

  // Fallback polling, and a refresh when the tab becomes visible again.
  const status = state?.room.status;
  useEffect(() => {
    if (!status) return;
    const interval = setInterval(() => void refresh(), POLL_MS[status] ?? 8_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, refresh]);

  return { state, token, loading, error, refresh, adoptToken };
}
