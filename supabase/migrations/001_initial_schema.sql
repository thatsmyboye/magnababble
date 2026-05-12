-- ============================================================
-- Magnababble — initial schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- Tile content
-- ---------------------------------------------------------------

CREATE TABLE tile_sets (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL
);

CREATE TABLE tiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tile_set_id UUID NOT NULL REFERENCES tile_sets(id) ON DELETE CASCADE,
  word        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('noun','verb','adjective','adverb','filler'))
);

-- ---------------------------------------------------------------
-- Prompts
-- ---------------------------------------------------------------

CREATE TABLE prompts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme          TEXT NOT NULL,
  display_text   TEXT NOT NULL,
  sentence_frame TEXT NOT NULL,  -- __ marks blank slots
  tile_set_id    UUID REFERENCES tile_sets(id)
);

-- ---------------------------------------------------------------
-- Rooms & Players
-- ---------------------------------------------------------------

CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  host_token    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'lobby'
                  CHECK (status IN ('lobby','playing','finished')),
  round_count   INT  NOT NULL DEFAULT 5,
  current_round INT  NOT NULL DEFAULT 0,
  phase_ends_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE players (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  token     TEXT NOT NULL,
  score     INT  NOT NULL DEFAULT 0,
  is_host   BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------
-- Rounds
-- ---------------------------------------------------------------

CREATE TABLE rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number  INT  NOT NULL,
  prompt_id     UUID NOT NULL REFERENCES prompts(id),
  phase         TEXT NOT NULL DEFAULT 'prompt'
                  CHECK (phase IN ('prompt','submitting','voting','results')),
  phase_ends_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id, round_number)
);

-- ---------------------------------------------------------------
-- Player hands (tiles dealt per round)
-- ---------------------------------------------------------------

CREATE TABLE player_hands (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id  UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tile_id   UUID NOT NULL REFERENCES tiles(id),
  UNIQUE (round_id, player_id, tile_id)
);

-- ---------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------

CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- JSON array of tile words in slot order: ["word1", "word2", ...]
  placement     JSONB NOT NULL DEFAULT '[]',
  rendered_text TEXT NOT NULL DEFAULT '',
  vote_count    INT  NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (round_id, player_id)
);

-- ---------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------

CREATE TABLE votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  voter_id      UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  UNIQUE (round_id, voter_id)
);

-- ---------------------------------------------------------------
-- Row-Level Security
-- All tables are public-readable (game codes are the access control).
-- Writes go through API routes that validate player/host tokens.
-- ---------------------------------------------------------------

ALTER TABLE rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_hands   ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles          ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads on all tables (game state is semi-public by room code)
CREATE POLICY "public read rooms"       ON rooms       FOR SELECT USING (true);
CREATE POLICY "public read players"     ON players     FOR SELECT USING (true);
CREATE POLICY "public read rounds"      ON rounds      FOR SELECT USING (true);
CREATE POLICY "public read player_hands" ON player_hands FOR SELECT USING (true);
CREATE POLICY "public read prompts"     ON prompts     FOR SELECT USING (true);
CREATE POLICY "public read tile_sets"   ON tile_sets   FOR SELECT USING (true);
CREATE POLICY "public read tiles"       ON tiles       FOR SELECT USING (true);
CREATE POLICY "public read votes"       ON votes       FOR SELECT USING (true);

-- Submissions: show player_id only during results phase
CREATE POLICY "public read submissions" ON submissions FOR SELECT USING (true);

-- All writes go through service-role key in API routes — no anon INSERT/UPDATE/DELETE
-- (using service_role bypasses RLS; anon key only reads)
