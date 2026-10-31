-- ============================================================
-- Magnababble — migration 006
--   1. House rules: per-room settings (timers, theme filter)
--   2. Funnel events: a small log that outlives stale-room cleanup
-- Safe to re-run.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Room settings
-- Shape (all keys optional; missing keys mean the default):
--   { "submitSeconds": 60, "voteSeconds": 30, "themes": ["Food", "Animals"] }
-- Validated by the API before insert. Not granted to the anon role:
-- clients read it through the token-authenticated state endpoint.
-- ---------------------------------------------------------------
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------
-- 2. Funnel events
-- No foreign key to rooms on purpose: cleanup_stale_rooms() deletes
-- rooms, and these rows must survive it so completion rates can be
-- measured over time. Written only by API routes (service role).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_events (
  id           BIGSERIAL PRIMARY KEY,
  room_id      UUID NOT NULL,
  room_code    TEXT NOT NULL,
  event        TEXT NOT NULL CHECK (event IN (
                 'room_created', 'player_joined', 'game_started',
                 'game_finished', 'rematch')),
  player_count INT,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_events_room_idx ON game_events (room_id);
CREATE INDEX IF NOT EXISTS game_events_created_idx ON game_events (created_at);

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
-- No policies: the anon and authenticated roles can never read or write.
REVOKE ALL ON game_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE game_events_id_seq FROM anon, authenticated;

-- One row per room: how far it got. Query it from the SQL Editor:
--   SELECT * FROM room_funnel ORDER BY created_at DESC;
--   SELECT
--     count(*)                                        AS rooms,
--     count(*) FILTER (WHERE reached_two_players)     AS got_second_player,
--     count(*) FILTER (WHERE started)                 AS started,
--     count(*) FILTER (WHERE finished)                AS finished,
--     count(*) FILTER (WHERE rematches > 0)           AS rematched
--   FROM room_funnel;
CREATE OR REPLACE VIEW room_funnel AS
SELECT
  room_id,
  min(room_code)                                                        AS room_code,
  min(created_at)                                                       AS created_at,
  bool_or(event = 'player_joined' AND coalesce(player_count, 0) >= 2)   AS reached_two_players,
  bool_or(event = 'game_started')                                       AS started,
  bool_or(event = 'game_finished')                                      AS finished,
  count(*) FILTER (WHERE event = 'rematch')                             AS rematches,
  max(player_count)                                                     AS max_players
FROM game_events
GROUP BY room_id;

-- Views run with their owner's rights, so keep this one server-only too.
REVOKE ALL ON room_funnel FROM anon, authenticated;
