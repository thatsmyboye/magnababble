-- ============================================================
-- Magnababble — seed content: tile sets, tiles, and prompts
-- ============================================================

-- ---------------------------------------------------------------
-- Default tile set
-- ---------------------------------------------------------------
INSERT INTO tile_sets (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'default');

-- Nouns
INSERT INTO tiles (tile_set_id, word, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'flamingo',    'noun'),
  ('00000000-0000-0000-0000-000000000001', 'spreadsheet', 'noun'),
  ('00000000-0000-0000-0000-000000000001', 'uncle',       'noun'),
  ('00000000-0000-0000-0000-000000000001', 'waffle',      'noun'),
  ('00000000-0000-0000-0000-000000000001', 'intern',      'noun'),
  ('00000000-0000-0000-0000-000000000001', 'kazoo',       'noun'),
  ('00000000-0000-0000-0000-000000000001', 'dentist',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'raccoon',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'submarine',   'noun'),
  ('00000000-0000-0000-0000-000000000001', 'trombone',    'noun'),
  ('00000000-0000-0000-0000-000000000001', 'lasagna',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'portfolio',   'noun'),
  ('00000000-0000-0000-0000-000000000001', 'kumquat',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'escalator',   'noun'),
  ('00000000-0000-0000-0000-000000000001', 'grandma',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'jacuzzi',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'diploma',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'bagpipe',     'noun'),
  ('00000000-0000-0000-0000-000000000001', 'cactus',      'noun'),
  ('00000000-0000-0000-0000-000000000001', 'pancake',     'noun');

-- Verbs
INSERT INTO tiles (tile_set_id, word, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'organizing',  'verb'),
  ('00000000-0000-0000-0000-000000000001', 'haunting',    'verb'),
  ('00000000-0000-0000-0000-000000000001', 'licking',     'verb'),
  ('00000000-0000-0000-0000-000000000001', 'explaining',  'verb'),
  ('00000000-0000-0000-0000-000000000001', 'microwaving', 'verb'),
  ('00000000-0000-0000-0000-000000000001', 'befriending', 'verb'),
  ('00000000-0000-0000-0000-000000000001', 'presenting',  'verb'),
  ('00000000-0000-0000-0000-000000000001', 'knitting',    'verb'),
  ('00000000-0000-0000-0000-000000000001', 'photographing','verb'),
  ('00000000-0000-0000-0000-000000000001', 'serenading',  'verb'),
  ('00000000-0000-0000-0000-000000000001', 'ignoring',    'verb'),
  ('00000000-0000-0000-0000-000000000001', 'alphabetizing','verb'),
  ('00000000-0000-0000-0000-000000000001', 'smuggling',   'verb'),
  ('00000000-0000-0000-0000-000000000001', 'yodeling',    'verb'),
  ('00000000-0000-0000-0000-000000000001', 'inspecting',  'verb');

-- Adjectives
INSERT INTO tiles (tile_set_id, word, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'moist',       'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'forbidden',   'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'suspicious',  'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'lukewarm',    'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'cursed',      'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'legendary',   'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'sticky',      'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'vintage',     'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'tiny',        'adjective'),
  ('00000000-0000-0000-0000-000000000001', 'enormous',    'adjective');

-- Adverbs
INSERT INTO tiles (tile_set_id, word, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'aggressively',  'adverb'),
  ('00000000-0000-0000-0000-000000000001', 'reluctantly',   'adverb'),
  ('00000000-0000-0000-0000-000000000001', 'accidentally',  'adverb'),
  ('00000000-0000-0000-0000-000000000001', 'professionally','adverb'),
  ('00000000-0000-0000-0000-000000000001', 'mysteriously',  'adverb'),
  ('00000000-0000-0000-0000-000000000001', 'enthusiastically','adverb'),
  ('00000000-0000-0000-0000-000000000001', 'suspiciously',  'adverb'),
  ('00000000-0000-0000-0000-000000000001', 'legally',       'adverb');

-- Filler phrases
INSERT INTO tiles (tile_set_id, word, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'and then',     'filler'),
  ('00000000-0000-0000-0000-000000000001', 'but also',     'filler'),
  ('00000000-0000-0000-0000-000000000001', 'somehow',      'filler'),
  ('00000000-0000-0000-0000-000000000001', 'for science',  'filler'),
  ('00000000-0000-0000-0000-000000000001', 'on purpose',   'filler'),
  ('00000000-0000-0000-0000-000000000001', 'in hindsight', 'filler');

-- ---------------------------------------------------------------
-- Prompts
-- ---------------------------------------------------------------
INSERT INTO prompts (theme, display_text, sentence_frame, tile_set_id) VALUES
  ('Office Life',
   'Your boss walks in during your lunch break...',
   'I was just __ the __ with my __',
   '00000000-0000-0000-0000-000000000001'),

  ('Office Life',
   'Please describe your biggest professional achievement.',
   'I __ a __ __ for the entire department',
   '00000000-0000-0000-0000-000000000001'),

  ('Nature',
   'Scientists have made a shocking discovery...',
   'A wild __ was caught __ a __ __ in the park',
   '00000000-0000-0000-0000-000000000001'),

  ('Nature',
   'The zookeeper''s daily report reads...',
   'The __ escaped __ and is now __ the __',
   '00000000-0000-0000-0000-000000000001'),

  ('Food',
   'Complete the five-star restaurant review.',
   'The __ arrived __ atop a bed of __ __',
   '00000000-0000-0000-0000-000000000001'),

  ('Food',
   'Describe the secret ingredient.',
   'Grandma''s recipe calls for __ __ __ and love',
   '00000000-0000-0000-0000-000000000001'),

  ('Dating',
   'Bad advice for a first date...',
   'You should __ bring your __ and offer to __',
   '00000000-0000-0000-0000-000000000001'),

  ('Dating',
   'The dating app profile reads...',
   'I enjoy __ __ in my free time and I own a __',
   '00000000-0000-0000-0000-000000000001'),

  ('History',
   'How would you describe the fall of Rome?',
   'It all went wrong when they __ their __ __',
   '00000000-0000-0000-0000-000000000001'),

  ('Therapy',
   'Things you''d say to your therapist...',
   'The __ keeps __ my __ and I can''t sleep',
   '00000000-0000-0000-0000-000000000001'),

  ('Movies',
   'Complete the Oscar-winning film pitch.',
   'A __ __ must __ a __ to save the world',
   '00000000-0000-0000-0000-000000000001'),

  ('Hobbies',
   'Explain your unusual hobby.',
   'Every weekend I __ __ __ behind the __',
   '00000000-0000-0000-0000-000000000001'),

  ('Travel',
   'Describe the worst vacation ever.',
   'We __ arrived __ to find the __ __ everywhere',
   '00000000-0000-0000-0000-000000000001'),

  ('Animals',
   'Write a nature documentary narration.',
   'The __ __ __ its __ with great determination',
   '00000000-0000-0000-0000-000000000001'),

  ('Self-Help',
   'Complete the motivational poster.',
   'Every day I __ my __ __ and become stronger',
   '00000000-0000-0000-0000-000000000001');
