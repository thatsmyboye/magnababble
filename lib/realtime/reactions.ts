"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** The only emoji anyone can send; anything else received is ignored. */
export const REACTIONS = ["😂", "🔥", "💀", "👏", "😮", "🙈"] as const;
export type Reaction = (typeof REACTIONS)[number];

export function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
}

export interface Particle {
  id: number;
  emoji: Reaction;
  /** Horizontal start position, 0–100 (% of viewport width). */
  x: number;
  mine: boolean;
}

/** Most particles on screen at once; the oldest drop off first. */
export const MAX_PARTICLES = 40;
/** Minimum gap between this player's own reactions. */
export const SEND_INTERVAL_MS = 300;
export const PARTICLE_LIFETIME_MS = 2_400;

export function addParticle(list: Particle[], particle: Particle, cap = MAX_PARTICLES): Particle[] {
  const next = [...list, particle];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

interface Transport {
  send: (emoji: Reaction) => void;
  close: () => void;
}

/**
 * Supabase Realtime broadcast: messages go straight between browsers and
 * are never stored. `self: false` because the sender shows its own
 * reaction locally without waiting for the round trip.
 */
function supabaseTransport(code: string, onReceive: (emoji: unknown) => void): Transport {
  const supabase = createClient();
  const channel = supabase.channel(`reactions:${code}`, { config: { broadcast: { self: false } } });
  channel.on("broadcast", { event: "reaction" }, ({ payload }) => onReceive(payload?.emoji)).subscribe();
  return {
    send: (emoji) => void channel.send({ type: "broadcast", event: "reaction", payload: { emoji } }),
    close: () => void supabase.removeChannel(channel),
  };
}

/** Local development without Supabase (MAGNA_FAKE_DB): browser-native broadcast. */
function localTransport(code: string, onReceive: (emoji: unknown) => void): Transport {
  const channel = new BroadcastChannel(`magnababble-reactions-${code}`);
  channel.onmessage = (event) => onReceive((event.data as { emoji?: unknown } | null)?.emoji);
  return {
    send: (emoji) => channel.postMessage({ emoji }),
    close: () => channel.close(),
  };
}

const useLocalTransport = process.env.NEXT_PUBLIC_MAGNA_FAKE_REALTIME === "1";

/** Live emoji reactions for a room: send your own, see everyone's float up. */
export function useReactions(code: string, enabled: boolean) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const transport = useRef<Transport | null>(null);
  const nextId = useRef(1);
  const lastSent = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const show = useCallback((emoji: Reaction, mine: boolean) => {
    const particle: Particle = { id: nextId.current++, emoji, x: 8 + Math.random() * 84, mine };
    setParticles((list) => addParticle(list, particle));
    const t = setTimeout(() => {
      timers.current.delete(t);
      setParticles((list) => list.filter((p) => p.id !== particle.id));
    }, PARTICLE_LIFETIME_MS);
    timers.current.add(t);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onReceive = (emoji: unknown) => {
      if (isReaction(emoji)) show(emoji, false);
    };
    transport.current = useLocalTransport ? localTransport(code, onReceive) : supabaseTransport(code, onReceive);
    return () => {
      transport.current?.close();
      transport.current = null;
    };
  }, [code, enabled, show]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  /** Returns false when throttled. */
  const send = useCallback(
    (emoji: Reaction): boolean => {
      const now = Date.now();
      if (now - lastSent.current < SEND_INTERVAL_MS) return false;
      lastSent.current = now;
      show(emoji, true);
      transport.current?.send(emoji);
      return true;
    },
    [show]
  );

  return { particles, send };
}
