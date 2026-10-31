"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameState } from "@/lib/game/types";

export type { GameState, PlayerPublic as Player, RoundPublic as Round, SubmissionPublic as Submission, TileData } from "@/lib/game/types";

export const storageKeys = {
  token: (code: string) => `magnababble_token_${code}`,
  playerId: (code: string) => `magnababble_player_${code}`,
  name: "magnababble_name",
};

/** The display name used last time, so returning players don't retype it. */
export function readRememberedName(): string {
  try {
    return localStorage.getItem(storageKeys.name) ?? "";
  } catch {
    return "";
  }
}

export function rememberName(name: string) {
  try {
    localStorage.setItem(storageKeys.name, name.trim().slice(0, 20));
  } catch {
    // Storage unavailable — nothing to remember.
  }
}

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

/** Consecutive failed refreshes before the UI says it is reconnecting. */
const FAILURES_BEFORE_RECONNECTING = 2;

export type ConnectionState = "online" | "reconnecting";

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
  const [failures, setFailures] = useState(0);
  const [offline, setOffline] = useState(false);

  const tokenRef = useRef<string | null>(null);
  // Whether the room has loaded at least once. A ref, not state, so the
  // memoized refresh never reads a stale value after a network blip.
  const loadedRef = useRef(false);
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
        loadedRef.current = true;
        setState(data);
        setError(null);
        setFailures(0);
      } catch (err) {
        console.warn("refresh failed", err);
        setFailures((n) => n + 1);
        // Only a room that never loaded is an error; later failures are a
        // connection blip and the last good state stays on screen.
        if (!loadedRef.current) setError("Could not load the room");
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

  // Browser online/offline events: show the banner at once, refetch on return.
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      void refresh();
    };
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [refresh]);

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

  const connection: ConnectionState =
    offline || failures >= FAILURES_BEFORE_RECONNECTING ? "reconnecting" : "online";

  return { state, token, loading, error, refresh, adoptToken, connection };
}
