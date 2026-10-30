/**
 * End-to-end test of the API routes and engine against a real Postgres with
 * the migrations applied. Opt in by setting MAGNA_TEST_DATABASE_URL, e.g.
 *
 *   MAGNA_TEST_DATABASE_URL=postgres://postgres@localhost:5432/magna npm test
 *
 * See README "Running the integration test" for how to prepare the database.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { FakeSupabase } from "./fake-supabase";
import type { GameState } from "@/lib/game/types";

const DATABASE_URL = process.env.MAGNA_TEST_DATABASE_URL;

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
const fake = pool ? new FakeSupabase(pool) : null;

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: () => fake,
}));

// Route handlers (imported after the mock is registered).
import * as roomsRoute from "@/app/api/rooms/route";
import * as roomRoute from "@/app/api/rooms/[code]/route";
import * as joinRoute from "@/app/api/rooms/[code]/join/route";
import * as startRoute from "@/app/api/rooms/[code]/start/route";
import * as nextRoute from "@/app/api/rooms/[code]/next/route";
import * as rematchRoute from "@/app/api/rooms/[code]/rematch/route";
import * as submitRoute from "@/app/api/rounds/[id]/submit/route";
import * as voteRoute from "@/app/api/rounds/[id]/vote/route";

/** Any route handler: `never` params make every concrete handler assignable. */
type Handler = (req: Request, ctx: { params: Promise<never> }) => Promise<Response>;

async function call<T = unknown>(
  handler: Handler,
  params: Record<string, string>,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Promise<{ status: number; json: T }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const req = new Request("http://test.local/", {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const res = await handler(req, { params: Promise.resolve(params) as Promise<never> });
  const text = await res.text();
  return { status: res.status, json: (text ? JSON.parse(text) : null) as T };
}

interface Session {
  code: string;
  token: string;
  playerId: string;
}

async function createRoom(hostName: string, roundCount: number, mode: string): Promise<Session> {
  const { status, json } = await call<{ code: string; playerId: string; playerToken: string }>(
    roomsRoute.POST,
    {},
    { body: { hostName, roundCount, mode } }
  );
  expect(status).toBe(200);
  return { code: json.code, token: json.playerToken, playerId: json.playerId };
}

async function join(code: string, playerName: string): Promise<Session> {
  const { status, json } = await call<{ playerId: string; playerToken: string }>(
    joinRoute.POST,
    { code },
    { body: { playerName } }
  );
  expect(status).toBe(200);
  return { code, token: json.playerToken, playerId: json.playerId };
}

async function state(s: Session): Promise<GameState> {
  const { status, json } = await call<GameState>(roomRoute.GET, { code: s.code }, { token: s.token });
  expect(status).toBe(200);
  return json;
}

async function next(s: Session, expected?: { phase?: string; round?: number }) {
  return call<{ status: string; phase?: string; roundNumber?: number }>(
    nextRoute.POST,
    { code: s.code },
    { token: s.token, body: { expectedPhase: expected?.phase, expectedRound: expected?.round } }
  );
}

async function submit(s: Session, roundId: string, placement: string[]) {
  return call<{ ok?: boolean; error?: string }>(
    submitRoute.POST,
    { id: roundId },
    { token: s.token, body: { placement } }
  );
}

async function vote(s: Session, roundId: string, submissionId: string) {
  return call<{ ok?: boolean; error?: string }>(
    voteRoute.POST,
    { id: roundId },
    { token: s.token, body: { submissionId } }
  );
}

/** Force the current phase deadline into the past so non-hosts may advance. */
async function expirePhase(roundId: string) {
  await pool!.query("UPDATE rounds SET phase_ends_at = now() - interval '5 seconds' WHERE id = $1", [roundId]);
}

describe.skipIf(!DATABASE_URL)("game flow (integration)", () => {
  beforeAll(async () => {
    await pool!.query("SELECT 1");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("plays a full mixed game end to end", async () => {
    const ann = await createRoom("Ann", 2, "mixed");
    const bob = await join(ann.code, "Bob");
    const cat = await join(ann.code, "Cat");

    expect(ann.code).toMatch(/^[A-Z]{4}$/);

    // Lobby
    let s = await state(ann);
    expect(s.room.status).toBe("lobby");
    expect(s.room.mode).toBe("mixed");
    expect(s.me?.is_host).toBe(true);
    expect(s.players.map((p) => p.name)).toEqual(["Ann", "Bob", "Cat"]);
    expect((await state(bob)).me?.is_host).toBe(false);

    // Visitor without a token sees the lobby but no "me"
    const visitor = await call<GameState>(roomRoute.GET, { code: ann.code });
    expect(visitor.status).toBe(200);
    expect(visitor.json.me).toBeNull();
    expect(visitor.json.hand).toEqual([]);

    // Only the host can start
    expect((await call(startRoute.POST, { code: ann.code }, { token: bob.token, body: {} })).status).toBe(403);
    expect((await call(startRoute.POST, { code: ann.code }, { token: ann.token, body: {} })).status).toBe(200);
    // Second start is rejected
    expect((await call(startRoute.POST, { code: ann.code }, { token: ann.token, body: {} })).status).toBe(400);

    // Joining a started game is rejected
    expect((await call(joinRoute.POST, { code: ann.code }, { body: { playerName: "Dan" } })).status).toBe(400);

    // Round 1 of a mixed game is framed
    s = await state(ann);
    expect(s.room.status).toBe("playing");
    expect(s.round?.round_number).toBe(1);
    expect(s.round?.phase).toBe("prompt");
    expect(s.round?.freestyle).toBe(false);
    const slots = (s.round!.prompt.sentence_frame.match(/__/g) ?? []).length;
    expect(slots).toBeGreaterThan(0);
    expect(s.hand).toHaveLength(slots + 6);
    expect(s.hand.some((t) => t.category === "glue")).toBe(false);
    expect(s.submissions).toEqual([]);
    const round1 = s.round!.id;

    // Non-host can't skip ahead before the deadline; host can.
    expect((await next(bob, { phase: "prompt" })).status).toBe(403);
    let r = await next(ann, { phase: "prompt", round: 1 });
    expect(r.json).toEqual({ status: "phase_advanced", phase: "submitting" });
    // A stale nudge (same expected phase) is a no-op.
    r = await next(ann, { phase: "prompt", round: 1 });
    expect(r.json.status).toBe("stale");

    // Submissions must come from the hand and fill every blank.
    s = await state(ann);
    expect(s.round?.phase).toBe("submitting");
    const annWords = s.hand.slice(0, slots).map((t) => t.word);
    expect((await submit(ann, round1, ["definitely-not-a-tile", ...annWords.slice(1)])).status).toBe(400);
    expect((await submit(ann, round1, annWords.slice(0, slots - 1))).status).toBe(400);
    expect((await submit(ann, round1, annWords)).status).toBe(200);

    s = await state(ann);
    expect(s.mySubmission?.placement).toEqual(annWords);
    expect(s.round?.submission_count).toBe(1);
    expect(s.submissions).toEqual([]); // hidden until voting

    const bobHand = (await state(bob)).hand;
    expect((await submit(bob, round1, bobHand.slice(0, slots).map((t) => t.word))).status).toBe(200);
    const catHand = (await state(cat)).hand;
    expect((await submit(cat, round1, catHand.slice(0, slots).map((t) => t.word))).status).toBe(200);

    // Everyone submitted → voting opened automatically.
    s = await state(ann);
    expect(s.round?.phase).toBe("voting");
    expect(s.submissions).toHaveLength(3);
    expect(s.submissions.every((x) => x.player_id === null && x.vote_count === 0)).toBe(true);
    expect(s.submissions.filter((x) => x.is_mine)).toHaveLength(1);
    const mineId = s.submissions.find((x) => x.is_mine)!.id;
    expect(mineId).toBe(s.mySubmission?.id);
    const bobSubId = (await state(bob)).submissions.find((x) => x.is_mine)!.id;

    // Late submission is rejected once voting is open.
    expect((await submit(ann, round1, annWords)).status).toBe(400);

    // Can't vote for yourself.
    expect((await vote(ann, round1, mineId)).status).toBe(400);
    expect((await vote(ann, round1, bobSubId)).status).toBe(200);
    // Changing a vote is allowed and counted once.
    expect((await vote(ann, round1, bobSubId)).status).toBe(200);
    expect((await state(ann)).myVote).toBe(bobSubId);
    expect((await vote(bob, round1, mineId)).status).toBe(200);
    expect((await state(ann)).round?.phase).toBe("voting");
    expect((await vote(cat, round1, mineId)).status).toBe(200);

    // Everyone voted → results, with authors and scores revealed.
    s = await state(ann);
    expect(s.round?.phase).toBe("results");
    const byPlayer = Object.fromEntries(s.submissions.map((x) => [x.player_id, x.vote_count]));
    expect(byPlayer[ann.playerId]).toBe(2);
    expect(byPlayer[bob.playerId]).toBe(1);
    expect(byPlayer[cat.playerId]).toBe(0);
    const scores = Object.fromEntries(s.players.map((p) => [p.name, p.score]));
    expect(scores).toEqual({ Ann: 2, Bob: 1, Cat: 0 });

    // Voting after results is rejected.
    expect((await vote(cat, round1, bobSubId)).status).toBe(400);

    // Concurrent advances from results: exactly one creates round 2.
    const [a, b] = await Promise.all([next(ann, { phase: "results" }), next(ann, { phase: "results" })]);
    const outcomes = [a.json.status, b.json.status].sort();
    expect(outcomes).toEqual(["next_round", "stale"]);

    // Round 2 of a mixed game is freestyle with glue tiles.
    s = await state(ann);
    expect(s.round?.round_number).toBe(2);
    expect(s.round?.freestyle).toBe(true);
    expect(s.round?.phase).toBe("prompt");
    expect(s.hand).toHaveLength(22);
    expect(s.hand.filter((t) => t.category === "glue")).toHaveLength(10);
    expect(s.submissions).toEqual([]);
    expect(s.mySubmission).toBeNull();
    expect(s.myVote).toBeNull();
    // Scores carry over between rounds.
    expect(s.players.find((p) => p.name === "Ann")?.score).toBe(2);
    const round2 = s.round!.id;

    // Once the clock runs out, a non-host may nudge the game along.
    await expirePhase(round2);
    r = await next(cat, { phase: "prompt", round: 2 });
    expect(r.json).toEqual({ status: "phase_advanced", phase: "submitting" });

    // Freestyle submissions: 1..14 tiles from the hand, rendered as a sentence.
    s = await state(ann);
    const annFree = s.hand.slice(0, 3).map((t) => t.word);
    expect((await submit(ann, round2, [])).status).toBe(400);
    expect((await submit(ann, round2, s.hand.slice(0, 15).map((t) => t.word))).status).toBe(400);
    const ok = await submit(ann, round2, annFree);
    expect(ok.status).toBe(200);
    s = await state(ann);
    expect(s.mySubmission?.rendered_text).toMatch(/^[A-Z].*\.$/);
    const bobHand2 = (await state(bob)).hand;
    expect((await submit(bob, round2, bobHand2.slice(0, 2).map((t) => t.word))).status).toBe(200);

    // Cat never submits; host closes submissions → voting with two entries.
    r = await next(ann, { phase: "submitting" });
    expect(r.json).toEqual({ status: "phase_advanced", phase: "voting" });
    s = await state(cat);
    expect(s.submissions).toHaveLength(2);
    expect(s.submissions.every((x) => !x.is_mine)).toBe(true);
    const annSub2 = (await state(ann)).submissions.find((x) => x.is_mine)!.id;
    const bobSub2 = (await state(bob)).submissions.find((x) => x.is_mine)!.id;

    expect((await vote(cat, round2, annSub2)).status).toBe(200);
    expect((await vote(bob, round2, annSub2)).status).toBe(200);
    expect((await vote(ann, round2, bobSub2)).status).toBe(200);

    // Final round scores are applied (this used to be lost on game over).
    s = await state(ann);
    expect(s.round?.phase).toBe("results");
    expect(Object.fromEntries(s.players.map((p) => [p.name, p.score]))).toEqual({ Ann: 4, Bob: 2, Cat: 0 });

    r = await next(ann, { phase: "results", round: 2 });
    expect(r.json).toEqual({ status: "finished" });
    s = await state(bob);
    expect(s.room.status).toBe("finished");
    expect((await next(ann)).json.status).toBe("stale");

    // Rematch: host only; back to lobby with scores reset and players kept.
    expect((await call(rematchRoute.POST, { code: ann.code }, { token: bob.token, body: {} })).status).toBe(403);
    expect((await call(rematchRoute.POST, { code: ann.code }, { token: ann.token, body: {} })).status).toBe(200);
    s = await state(cat);
    expect(s.room.status).toBe("lobby");
    expect(s.room.current_round).toBe(0);
    expect(s.round).toBeNull();
    expect(s.players).toHaveLength(3);
    expect(s.players.every((p) => p.score === 0)).toBe(true);

    // And it can be started again.
    expect((await call(startRoute.POST, { code: ann.code }, { token: ann.token, body: {} })).status).toBe(200);
    expect((await state(ann)).round?.round_number).toBe(1);
  });

  it("respects the frames and freestyle modes and skips voting with one submission", async () => {
    const host = await createRoom("Host", 3, "frames");
    const guest = await join(host.code, "Guest");
    await call(startRoute.POST, { code: host.code }, { token: host.token, body: {} });

    for (let round = 1; round <= 3; round++) {
      const s = await state(host);
      expect(s.round?.round_number).toBe(round);
      expect(s.round?.freestyle).toBe(false);
      await next(host, { phase: "prompt" });
      await next(host, { phase: "submitting" }); // nobody submitted → straight to results
      expect((await state(host)).round?.phase).toBe("results");
      await next(host, { phase: "results" });
    }
    expect((await state(guest)).room.status).toBe("finished");

    const h2 = await createRoom("Host", 1, "freestyle");
    const g2 = await join(h2.code, "Guest");
    await call(startRoute.POST, { code: h2.code }, { token: h2.token, body: {} });
    let s = await state(h2);
    expect(s.round?.freestyle).toBe(true);
    await next(h2, { phase: "prompt" });
    s = await state(g2);
    const r = await submit(g2, s.round!.id, s.hand.slice(0, 4).map((t) => t.word));
    expect(r.status).toBe(200);
    // Only one submission: closing submissions skips voting.
    await next(h2, { phase: "submitting" });
    s = await state(h2);
    expect(s.round?.phase).toBe("results");
    expect(s.submissions).toHaveLength(1);
    expect(s.submissions[0].player_id).toBe(g2.playerId);
  });

  it("validates room creation input", async () => {
    expect((await call(roomsRoute.POST, {}, { body: { hostName: "  " } })).status).toBe(400);
    expect((await call(roomsRoute.POST, {}, { body: { hostName: "Ann", roundCount: 99 } })).status).toBe(400);
    const { json } = await call<{ code: string }>(roomsRoute.POST, {}, { body: { hostName: "Ann", mode: "bogus" } });
    const s = await call<GameState>(roomRoute.GET, { code: json.code.toLowerCase() });
    expect(s.json.room.mode).toBe("mixed");
    expect(s.json.room.round_count).toBe(5);
    expect((await call(roomRoute.GET, { code: "ZZZZ" })).status).toBe(404);
  });
});
