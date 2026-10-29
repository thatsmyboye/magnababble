-- ============================================================
-- Magnababble — migration 005
--   1. Realtime: publish the tables the client subscribes to
--   2. Room modes: frames / freestyle / mixed
--   3. Freestyle content: "glue" tiles + open-ended prompts
--   4. Security: hide tokens, authorship and hands from the anon key
--   5. Housekeeping: stale room cleanup helper
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Realtime publication
-- Supabase only broadcasts changes for tables that are part of the
-- supabase_realtime publication. Without this, non-host clients
-- never see phase changes. Idempotent.
-- ---------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rooms', 'players', 'rounds', 'submissions'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 2. Room mode
--   frames    — every round uses a sentence frame with blanks
--   freestyle — every round is open "magnet poetry" composition
--   mixed     — rounds alternate between the two at random
-- ---------------------------------------------------------------
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'mixed';

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_mode_check;
ALTER TABLE rooms
  ADD CONSTRAINT rooms_mode_check CHECK (mode IN ('frames', 'freestyle', 'mixed'));

-- ---------------------------------------------------------------
-- 3a. "glue" tile category — connective words for freestyle rounds
-- ---------------------------------------------------------------
ALTER TABLE tiles DROP CONSTRAINT IF EXISTS tiles_category_check;
ALTER TABLE tiles
  ADD CONSTRAINT tiles_category_check
  CHECK (category IN ('noun', 'verb', 'adjective', 'adverb', 'filler', 'glue'));

INSERT INTO tiles (tile_set_id, word, category) VALUES
  -- articles & determiners
  ('00000000-0000-0000-0000-000000000001', 'the',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'the',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'a',         'glue'),
  ('00000000-0000-0000-0000-000000000001', 'a',         'glue'),
  ('00000000-0000-0000-0000-000000000001', 'an',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'my',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'my',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'your',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'his',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'her',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'their',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'our',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'this',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'that',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'every',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'some',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'no',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'another',   'glue'),
  -- pronouns
  ('00000000-0000-0000-0000-000000000001', 'I',         'glue'),
  ('00000000-0000-0000-0000-000000000001', 'I',         'glue'),
  ('00000000-0000-0000-0000-000000000001', 'you',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'we',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'they',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'he',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'she',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'it',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'me',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'him',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'them',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'everyone',  'glue'),
  ('00000000-0000-0000-0000-000000000001', 'nobody',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'something', 'glue'),
  -- verbs of being / auxiliaries
  ('00000000-0000-0000-0000-000000000001', 'is',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'is',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'was',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'was',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'are',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'were',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'am',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'be',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'been',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'has',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'have',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'had',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'will',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'would',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'could',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'should',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'must',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'keeps',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'started',   'glue'),
  ('00000000-0000-0000-0000-000000000001', 'stopped',   'glue'),
  ('00000000-0000-0000-0000-000000000001', 'loves',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'hates',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'needs',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'wants',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'caught',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'became',    'glue'),
  -- conjunctions & negation
  ('00000000-0000-0000-0000-000000000001', 'and',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'and',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'but',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'or',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'not',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'never',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'always',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'because',   'glue'),
  ('00000000-0000-0000-0000-000000000001', 'while',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'until',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'if',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'so',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'then',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'who',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'why',       'glue'),
  -- prepositions
  ('00000000-0000-0000-0000-000000000001', 'with',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'with',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'without',   'glue'),
  ('00000000-0000-0000-0000-000000000001', 'of',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'in',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'on',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'at',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'to',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'to',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'from',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'for',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'by',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'into',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'under',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'over',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'inside',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'behind',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'near',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'like',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'about',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'as',        'glue'),
  ('00000000-0000-0000-0000-000000000001', 'than',      'glue'),
  -- intensifiers & misc
  ('00000000-0000-0000-0000-000000000001', 'very',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'too',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'only',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'just',      'glue'),
  ('00000000-0000-0000-0000-000000000001', 'still',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'again',     'glue'),
  ('00000000-0000-0000-0000-000000000001', 'mostly',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'basically', 'glue'),
  ('00000000-0000-0000-0000-000000000001', 'honestly',  'glue'),
  ('00000000-0000-0000-0000-000000000001', 'probably',  'glue'),
  ('00000000-0000-0000-0000-000000000001', 'yes',       'glue'),
  ('00000000-0000-0000-0000-000000000001', 'please',    'glue'),
  ('00000000-0000-0000-0000-000000000001', 'sorry',     'glue');

-- ---------------------------------------------------------------
-- 3b. Freestyle prompts — sentence_frame is empty (no blanks),
--     players build the whole sentence from their tiles.
-- ---------------------------------------------------------------
INSERT INTO prompts (theme, display_text, sentence_frame, tile_set_id) VALUES
  ('Dating',      'Describe your worst date ever.',                                   '', '00000000-0000-0000-0000-000000000001'),
  ('Dating',      'Write the opening line of your dating profile.',                   '', '00000000-0000-0000-0000-000000000001'),
  ('Dating',      'Explain, in one sentence, why you got dumped.',                    '', '00000000-0000-0000-0000-000000000001'),
  ('Office Life', 'Explain to your boss why you were late this morning.',             '', '00000000-0000-0000-0000-000000000001'),
  ('Office Life', 'Write the subject line of the email that got you fired.',          '', '00000000-0000-0000-0000-000000000001'),
  ('Office Life', 'Describe your coworker''s desk.',                                   '', '00000000-0000-0000-0000-000000000001'),
  ('Office Life', 'What did the intern do this time?',                                '', '00000000-0000-0000-0000-000000000001'),
  ('Food',        'Write a one-sentence review of the worst restaurant in town.',     '', '00000000-0000-0000-0000-000000000001'),
  ('Food',        'Describe the mystery dish at the potluck.',                        '', '00000000-0000-0000-0000-000000000001'),
  ('Food',        'What does the chef whisper to every plate before it leaves?',      '', '00000000-0000-0000-0000-000000000001'),
  ('Animals',     'What is your cat thinking right now?',                             '', '00000000-0000-0000-0000-000000000001'),
  ('Animals',     'Narrate the nature documentary about your neighbor.',              '', '00000000-0000-0000-0000-000000000001'),
  ('Animals',     'What really happened at the zoo last night?',                      '', '00000000-0000-0000-0000-000000000001'),
  ('Science',     'Summarize the scientific breakthrough of the century.',            '', '00000000-0000-0000-0000-000000000001'),
  ('Science',     'What did the astronauts find on the far side of the moon?',        '', '00000000-0000-0000-0000-000000000001'),
  ('History',     'Write the real reason the dinosaurs went extinct.',                '', '00000000-0000-0000-0000-000000000001'),
  ('History',     'Describe the lost final chapter of a famous history book.',        '', '00000000-0000-0000-0000-000000000001'),
  ('Movies',      'Pitch a blockbuster movie in one sentence.',                       '', '00000000-0000-0000-0000-000000000001'),
  ('Movies',      'Write the tagline for a terrible sequel.',                         '', '00000000-0000-0000-0000-000000000001'),
  ('TV',          'Describe the plot of the reality show nobody asked for.',          '', '00000000-0000-0000-0000-000000000001'),
  ('Crime',       'Give your alibi for last Tuesday night.',                          '', '00000000-0000-0000-0000-000000000001'),
  ('Crime',       'What did the detective find in the suspect''s briefcase?',         '', '00000000-0000-0000-0000-000000000001'),
  ('Travel',      'Write a postcard from the worst vacation of your life.',           '', '00000000-0000-0000-0000-000000000001'),
  ('Travel',      'Describe what customs found in your luggage.',                     '', '00000000-0000-0000-0000-000000000001'),
  ('Health',      'What did the doctor say after looking at the X-ray?',              '', '00000000-0000-0000-0000-000000000001'),
  ('Self-Help',   'Write your new personal motto.',                                   '', '00000000-0000-0000-0000-000000000001'),
  ('Self-Help',   'Give the worst possible advice to a graduating class.',            '', '00000000-0000-0000-0000-000000000001'),
  ('Politics',    'Write the campaign slogan that lost the election.',                '', '00000000-0000-0000-0000-000000000001'),
  ('Sports',      'Describe the play that got the coach fired.',                      '', '00000000-0000-0000-0000-000000000001'),
  ('School',      'Explain to the teacher why your homework is missing.',             '', '00000000-0000-0000-0000-000000000001'),
  ('Misc',        'Write a fortune cookie that nobody wants to get.',                 '', '00000000-0000-0000-0000-000000000001'),
  ('Misc',        'Describe your grandmother''s secret talent.',                      '', '00000000-0000-0000-0000-000000000001'),
  ('Misc',        'What was the last thing you said before everything went wrong?',  '', '00000000-0000-0000-0000-000000000001'),
  ('Misc',        'Write the warning label for yourself.',                            '', '00000000-0000-0000-0000-000000000001'),
  ('Misc',        'Describe your dream house.',                                       '', '00000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------
-- 4. Lock down secrets from the public (anon) key.
--
-- All game reads now go through token-authenticated API routes
-- (service role). The anon key is only used for Realtime change
-- notifications, which need SELECT on the columns in the payload.
-- Table-level SELECT is replaced with column-level grants so the
-- anon/authenticated roles can never read:
--   rooms.host_token, players.token, submissions.player_id /
--   placement / rendered_text, votes.*, player_hands.*
-- Realtime respects column privileges and omits hidden columns.
-- ---------------------------------------------------------------
REVOKE SELECT ON rooms FROM anon, authenticated;
GRANT SELECT (id, code, status, round_count, current_round, phase_ends_at, created_at, mode)
  ON rooms TO anon, authenticated;

REVOKE SELECT ON players FROM anon, authenticated;
GRANT SELECT (id, room_id, name, score, is_host, joined_at)
  ON players TO anon, authenticated;

REVOKE SELECT ON submissions FROM anon, authenticated;
GRANT SELECT (id, round_id, vote_count, submitted_at)
  ON submissions TO anon, authenticated;

REVOKE SELECT ON votes FROM anon, authenticated;
DROP POLICY IF EXISTS "public read votes" ON votes;

REVOKE SELECT ON player_hands FROM anon, authenticated;
DROP POLICY IF EXISTS "public read player_hands" ON player_hands;

-- ---------------------------------------------------------------
-- 5. Housekeeping: delete rooms older than a day (cascades to
--    players, rounds, hands, submissions, votes). Run manually, or
--    schedule with pg_cron:
--      SELECT cron.schedule('magnababble-cleanup', '0 4 * * *',
--        $$SELECT cleanup_stale_rooms()$$);
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_stale_rooms(p_max_age INTERVAL DEFAULT INTERVAL '1 day')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM rooms WHERE created_at < now() - p_max_age;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Functions are executable by PUBLIC by default; keep these server-only.
REVOKE EXECUTE ON FUNCTION cleanup_stale_rooms(INTERVAL) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_score(UUID, INT) FROM PUBLIC, anon, authenticated;
