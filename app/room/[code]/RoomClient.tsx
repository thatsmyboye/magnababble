"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/lib/hooks/useRoom";
import { usePhaseTimer } from "@/lib/hooks/usePhaseTimer";
import { Lobby } from "@/components/room/Lobby";
import { PromptPhase } from "@/components/room/PromptPhase";
import { SubmissionPhase } from "@/components/room/SubmissionPhase";
import { VotingPhase } from "@/components/room/VotingPhase";
import { ResultsPhase } from "@/components/room/ResultsPhase";
import { FinalScoreboard } from "@/components/room/FinalScoreboard";

interface RoomClientProps {
  code: string;
}

export function RoomClient({ code }: RoomClientProps) {
  const { room, players, currentRound, submissions, myHand, loading, error } =
    useRoom(code);

  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem(`magnababble_player_${code}`) ?? "";
    const hostToken = localStorage.getItem(`magnababble_host_${code}`);
    setMyPlayerId(id);
    setIsHost(Boolean(hostToken));
  }, [code]);

  // Host advances phase when timer expires
  usePhaseTimer(
    currentRound?.phase_ends_at ?? null,
    isHost,
    async () => {
      const hostToken = localStorage.getItem(`magnababble_host_${code}`);
      if (!hostToken) return;
      await fetch(`/api/rooms/${code}/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hostToken}` },
      });
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-red-400 text-xl font-bold mb-2">Room not found</p>
        <p className="text-white/40">Check the room code and try again.</p>
        <a href="/" className="mt-4 text-violet-400 underline">Go home</a>
      </div>
    );
  }

  if (!myPlayerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/40">Loading player...</div>
      </div>
    );
  }

  // Game finished
  if (room.status === "finished") {
    return <FinalScoreboard players={players} myPlayerId={myPlayerId} />;
  }

  // Lobby
  if (room.status === "lobby") {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    return (
      <Lobby
        code={code}
        players={players}
        myPlayerId={myPlayerId}
        isHost={isHost}
        roundCount={room.round_count}
      />
    );
  }

  // Playing — route to correct phase component
  if (!currentRound) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/40">Loading round...</div>
      </div>
    );
  }

  const mySubmission = submissions.find(
    (s) => s.player_id === myPlayerId
  );

  switch (currentRound.phase) {
    case "prompt":
      return (
        <PromptPhase round={currentRound} roundCount={room.round_count} />
      );

    case "submitting":
      return (
        <SubmissionPhase
          code={code}
          round={currentRound}
          roundCount={room.round_count}
          myHand={myHand}
          myPlayerId={myPlayerId}
        />
      );

    case "voting":
      return (
        <VotingPhase
          code={code}
          round={currentRound}
          roundCount={room.round_count}
          submissions={submissions}
          myPlayerId={myPlayerId}
          mySubmissionId={mySubmission?.id}
        />
      );

    case "results":
      return (
        <ResultsPhase
          round={currentRound}
          roundCount={room.round_count}
          submissions={submissions}
          players={players}
          myPlayerId={myPlayerId}
        />
      );

    default:
      return null;
  }
}
