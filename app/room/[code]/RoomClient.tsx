"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRoom } from "@/lib/hooks/useRoom";
import { usePhaseTimer } from "@/lib/hooks/usePhaseTimer";
import { api } from "@/lib/api/client";
import { Lobby } from "@/components/room/Lobby";
import { PromptPhase } from "@/components/room/PromptPhase";
import { SubmissionPhase } from "@/components/room/SubmissionPhase";
import { VotingPhase } from "@/components/room/VotingPhase";
import { ResultsPhase } from "@/components/room/ResultsPhase";
import { FinalScoreboard } from "@/components/room/FinalScoreboard";
import { JoinInPlace } from "@/components/room/JoinInPlace";
import { Centered } from "@/components/ui/centered";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { Reactions } from "@/components/room/Reactions";

interface RoomClientProps {
  code: string;
}

export function RoomClient({ code }: RoomClientProps) {
  const roomState = useRoom(code);
  const { state } = roomState;
  // Reactions belong to the social moments: voting and the results reveal.
  const reacting =
    Boolean(state?.me) &&
    state?.room.status === "playing" &&
    (state?.round?.phase === "voting" || state?.round?.phase === "results");
  return (
    <>
      <ConnectionBanner connection={roomState.connection} />
      <div className={reacting ? "pb-24" : undefined}>
        <RoomView code={code} roomState={roomState} />
      </div>
      <Reactions code={code} active={reacting} />
    </>
  );
}

function RoomView({ code, roomState }: { code: string; roomState: ReturnType<typeof useRoom> }) {
  const { state, token, loading, error, refresh, adoptToken } = roomState;

  const me = state?.me ?? null;
  const isHost = Boolean(me?.is_host);
  const round = state?.round ?? null;

  const advance = useCallback(async () => {
    if (!token || !round) return;
    try {
      await api(`/api/rooms/${code}/next`, {
        token,
        body: { expectedPhase: round.phase, expectedRound: round.round_number },
      });
    } catch (err) {
      // A stale or forbidden nudge is expected when someone else got there first.
      console.debug("advance skipped", err);
    } finally {
      void refresh();
    }
  }, [code, token, round, refresh]);

  usePhaseTimer(
    state?.room.status === "playing" ? round?.phase_ends_at : null,
    isHost,
    advance
  );

  if (loading) {
    return <Centered muted>Loading room…</Centered>;
  }

  if (error || !state) {
    return (
      <Centered>
        <p className="text-red-400 text-xl font-bold mb-2">Room not found</p>
        <p className="text-white/40">Check the room code and try again.</p>
        <Link href="/" className="mt-4 text-violet-400 underline">
          Go home
        </Link>
      </Centered>
    );
  }

  // A visitor who opened a shared link: let them join right here.
  if (!me) {
    return <JoinInPlace state={state} onJoined={adoptToken} />;
  }

  const { room, players } = state;

  if (room.status === "finished") {
    return (
      <FinalScoreboard
        code={code}
        players={players}
        myPlayerId={me.id}
        isHost={isHost}
        token={token}
        recap={state.recap}
        onReset={refresh}
      />
    );
  }

  if (room.status === "lobby") {
    return (
      <Lobby
        code={code}
        players={players}
        myPlayerId={me.id}
        isHost={isHost}
        token={token}
        roundCount={room.round_count}
        mode={room.mode}
        settings={room.settings}
        onStarted={refresh}
      />
    );
  }

  if (!round) {
    return <Centered muted>Dealing tiles…</Centered>;
  }

  switch (round.phase) {
    case "prompt":
      return <PromptPhase round={round} roundCount={room.round_count} />;

    case "submitting":
      return (
        <SubmissionPhase
          key={round.id}
          round={round}
          roundCount={room.round_count}
          hand={state.hand}
          mySubmission={state.mySubmission}
          playerCount={players.length}
          token={token}
          onSubmitted={refresh}
        />
      );

    case "voting":
      return (
        <VotingPhase
          key={round.id}
          round={round}
          roundCount={room.round_count}
          submissions={state.submissions}
          myVote={state.myVote}
          myPlayerId={me.id}
          playerCount={players.length}
          token={token}
          onVoted={refresh}
        />
      );

    case "results":
      return (
        <ResultsPhase
          round={round}
          roundCount={room.round_count}
          submissions={state.submissions}
          players={players}
          myPlayerId={me.id}
          playerCount={players.length}
        />
      );

    default:
      return null;
  }
}
