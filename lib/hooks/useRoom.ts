"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Player {
  id: string;
  name: string;
  score: number;
  is_host: boolean;
}

export interface Prompt {
  id: string;
  theme: string;
  display_text: string;
  sentence_frame: string;
}

export interface Round {
  id: string;
  round_number: number;
  phase: "prompt" | "submitting" | "voting" | "results";
  phase_ends_at: string | null;
  prompts: Prompt | null;
}

export interface Submission {
  id: string;
  player_id: string | null; // null until results phase
  placement: string[];
  rendered_text: string;
  vote_count: number;
}

export interface Room {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
  round_count: number;
  current_round: number;
  phase_ends_at: string | null;
}

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myHand, setMyHand] = useState<{ id: string; word: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchSubmissions = useCallback(async (roundId: string, phase: string) => {
    const query = supabase
      .from("submissions")
      .select("id, player_id, placement, rendered_text, vote_count")
      .eq("round_id", roundId);

    const { data } = await query;
    if (data) {
      // Hide player identity until results phase
      setSubmissions(
        data.map((s) => ({
          ...s,
          player_id: phase === "results" ? s.player_id : null,
        }))
      );
    }
  }, [supabase]);

  const fetchHand = useCallback(async (roundId: string, playerId: string) => {
    const { data } = await supabase
      .from("player_hands")
      .select("tiles(id, word, category)")
      .eq("round_id", roundId)
      .eq("player_id", playerId);

    if (data) {
      type TileRow = { id: string; word: string; category: string };
      setMyHand(
        data
          .map((h) => {
            const t = h.tiles as unknown;
            if (!t) return null;
            if (Array.isArray(t)) return t[0] as TileRow ?? null;
            return t as TileRow;
          })
          .filter(Boolean) as TileRow[]
      );
    }
  }, [supabase]);

  useEffect(() => {
    let roomId: string;
    let roundChannel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      try {
        const playerId = localStorage.getItem(`magnababble_player_${code}`);

        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) {
          setError("Room not found");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setRoom(data.room);
        setPlayers(data.players ?? []);
        roomId = data.room.id;

        if (data.currentRound) {
          setCurrentRound(data.currentRound);
          await fetchSubmissions(data.currentRound.id, data.currentRound.phase);
          if (playerId) await fetchHand(data.currentRound.id, playerId);
        }

        setLoading(false);

        // Subscribe to room-level changes
        const roomChannel = supabase
          .channel(`room:${code}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
            (payload) => {
              setRoom(payload.new as Room);
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
            async () => {
              const { data: pData } = await supabase
                .from("players")
                .select("id, name, score, is_host")
                .eq("room_id", roomId)
                .order("joined_at");
              if (pData) setPlayers(pData);
            }
          )
          .subscribe();

        return roomChannel;
      } catch {
        setError("Failed to load room");
        setLoading(false);
      }
    }

    init();

    return () => {
      supabase.removeAllChannels();
    };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to round changes whenever currentRound changes
  useEffect(() => {
    if (!currentRound) return;

    const playerId = localStorage.getItem(`magnababble_player_${code}`);

    const channel = supabase
      .channel(`round:${currentRound.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `id=eq.${currentRound.id}` },
        async (payload) => {
          const updated = payload.new as Round;
          setCurrentRound(updated);
          await fetchSubmissions(currentRound.id, updated.phase);
          if (playerId && updated.phase === "submitting") {
            await fetchHand(currentRound.id, playerId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `round_id=eq.${currentRound.id}` },
        async () => {
          await fetchSubmissions(currentRound.id, currentRound.phase);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRound?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When room advances to a new round, fetch the new round data
  useEffect(() => {
    if (!room || room.status !== "playing") return;
    if (currentRound?.round_number === room.current_round) return;

    const playerId = localStorage.getItem(`magnababble_player_${code}`);

    async function fetchNewRound() {
      const { data } = await supabase
        .from("rounds")
        .select("id, round_number, phase, phase_ends_at, prompts(id, theme, display_text, sentence_frame)")
        .eq("room_id", room!.id)
        .eq("round_number", room!.current_round)
        .single();

      if (data) {
        setCurrentRound(data as unknown as Round);
        setSubmissions([]);
        if (playerId) await fetchHand(data.id, playerId);
      }
    }

    fetchNewRound();
  }, [room?.current_round]); // eslint-disable-line react-hooks/exhaustive-deps

  return { room, players, currentRound, submissions, myHand, loading, error };
}
