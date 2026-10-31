# Magnababble

A real-time multiplayer word-tile party game, rebooting the spirit of the old web games *Psychobabble* and *Farragomate*. Players get a prompt and a hand of word tiles, build the funniest sentence they can, then vote on each other's creations. The crowd decides who wins.

## How to play

1. One player creates a game and shares the room link or four-letter code (e.g. `BXKT`).
2. Everyone joins with a display name. No account needed. Opening the room link shows a join form right there.
3. Each round:
   - A prompt is revealed. Depending on the round it is either a **sentence frame with blanks** (`The __ escaped __ and is now __ the __`) or a **freestyle** prompt (`Describe your worst date ever.`).
   - Framed rounds: drag tiles into the blanks, or tap a tile and then a blank.
   - Freestyle rounds: tap tiles to build the whole sentence, fridge-magnet style, and drag to reorder. Your hand includes "glue" words (the, my, is, with…) so sentences can actually be formed.
   - Submissions are shown anonymously and everyone votes for a favorite (not their own). If only one person submitted, voting is skipped.
   - Authors and votes are revealed, scores update, and the next round begins.
4. After the last round the player with the most points wins. The host can start a rematch with the same players.

Games support 2 to 10 players and 1 to 15 rounds. When creating a game the host picks the style: **Fill the blanks**, **Freestyle**, or **Mixed** (alternates between the two).

## Stack

- **Next.js 15** (App Router, TypeScript, route handlers)
- **Supabase** (Postgres, Realtime change notifications, row-level security)
- **dnd kit** (drag-and-drop and sortable tiles, touch and mouse)
- **Framer Motion** (tile and reveal animations, honors reduced-motion settings)
- **Tailwind CSS**
- **Vitest** for unit and integration tests

## Presentation details

- Tiles fly from the hand into the blank you tap, press with a spring, and leave an outline behind in the hand.
- Every composer and vote card is keyboard operable, with descriptive labels and live-region announcements for screen readers.
- A timer bar under each phase header drains and turns amber, then red.
- Voting shows each player the entries in a different order, so no sentence benefits from going first.
- Results reveal in a synchronized sequence on every screen: cards, then vote counts from fewest to most, then authors, then the winner. A late refresh lands on the finished state.
- The final scoreboard is a podium with confetti; the lobby has initials avatars, a QR code for the invite link, and copy or native share buttons.
- Everything works by tapping. In framed rounds a tapped tile fills the glowing blank. In freestyle, tapping a word in the sentence selects it so it can be moved left or right or removed, and new tiles go after it. Dragging is an optional shortcut: a press-and-hold on touch screens, so an ordinary swipe over the tiles still scrolls the page.
- A banner says "Reconnecting…" when the network drops and "Back in the game" when it returns; the last good screen stays visible meanwhile.
- Pasting a full invite link into the code box works, names are remembered between games, and the create form estimates how long the game can run.
- An "All votes in!" beat plays before each results reveal, and the lobby announces each player who joins.
- Players can switch animations off in the app, on top of the device's reduced-motion setting.

## Local setup

### 1. Supabase project

Create a free project at [supabase.com](https://supabase.com). In the SQL Editor, run the migration files **in order**:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_content.sql
supabase/migrations/003_functions.sql
supabase/migrations/004_expanded_content.sql
supabase/migrations/005_freestyle_realtime_security.sql
```

Migration 005 matters even for existing projects: it adds the game tables to the Realtime publication (without it, non-host players never see phase changes), adds room modes and freestyle content, and hides tokens, authorship and hands from the public anon key.

### 2. Environment variables

```
cp .env.local.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key; the browser only uses it to subscribe to Realtime change events |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only (API routes), never sent to the browser |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (used for invite links in some contexts) |

### 3. Run

```
npm install
npm run dev
```

Open http://localhost:3000. To simulate multiple players, open the room link in a second browser profile or a private window.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also typechecks and lints) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit tests, plus the integration test when a database is configured (below) |

## Project structure

```
app/
  page.tsx                  # Home: create or join a game
  room/[code]/              # Game room (all phases render here)
  api/
    rooms/                  # create, state, join, start, next, rematch
    rounds/[id]/            # submit, vote

components/
  home/                     # CreateRoom, JoinRoom, QuickJoin, HeroDemo, HowItWorks
  room/                     # Lobby, JoinInPlace, one component per phase, FinalScoreboard
  tiles/                    # Tile, TileHand, SentenceFrame, FrameComposer, FreestyleComposer
  ui/                       # Button, Input, Timer, PlayerList, Avatar, PhaseHeader, Sentence, CountUp

lib/
  game/engine.ts            # Server-side state machine (compare-and-set transitions)
  game/dealing.ts           # Pure tile-dealing helpers
  game/scoring.ts           # Rendering and slot helpers
  game/phases.ts            # Phases, durations, room modes
  game/types.ts             # Shapes shared by API and client
  hooks/                    # useRoom (state + Realtime), usePhaseTimer, useElapsed
  supabase/                 # Browser client (Realtime) and service-role client (API)

supabase/migrations/        # Schema, seed content, functions
test/integration/           # Opt-in end-to-end test against a real Postgres
```

## How it works

### Server is the source of truth

Every client reads one endpoint, `GET /api/rooms/[code]`, with its player token. The response contains everything that client is allowed to see: room, players, current round, its own hand, submissions (only during voting and results, with authors only in results), its own submission and vote. Realtime change notifications on `rooms`, `players`, `rounds` and `submissions` simply trigger a refetch, with a slow polling fallback and a refresh when the tab regains focus.

### Phase transitions are compare-and-set

Phases advance in three ways: the host's browser timer, any other player's timer as a backup once the deadline has passed (so a game never stalls if the host closes the tab), and automatically when the last player submits or votes. All of these go through the same engine, and every transition is a conditional update (`WHERE phase = 'voting'`, or the unique constraint on round numbers). Exactly one caller wins; the rest are told the call was stale. Scores are applied by whoever wins the transition into results, so they are counted exactly once, including for the final round.

| Phase | Duration | What happens |
| --- | --- | --- |
| prompt | 5 s | Prompt revealed |
| submitting | 60 s (90 s freestyle) | Players build sentences; closes early when everyone has submitted |
| voting | 30 s | Anonymous submissions; closes early when everyone has voted; skipped with fewer than 2 submissions |
| results | 15 s | Authors and votes revealed, scores updated |

### Scoring

One point per vote received. Ties are shown as ties.

### Security model

Room codes are the access control for *seeing* a game, but every write and every read of private data goes through API routes authenticated by a per-player token (stored in the browser's localStorage). The anon key can only read the columns needed for Realtime notifications; `rooms.host_token`, `players.token`, submission authorship and text, votes and hands are not readable with it. Submissions are validated server-side: the words must come from the player's dealt hand and match the frame's slot count.

### Word tiles

Around 400 tiles in the default set:

| Category | Color | Examples |
| --- | --- | --- |
| Noun | Blue | flamingo, wizard, platypus |
| Verb | Green | wrangling, impersonating, bedazzling |
| Adjective | Amber | unhinged, sentient, pungent |
| Adverb | Rose | catastrophically, singlehandedly, theatrically |
| Filler | Purple | out of spite, in broad daylight, for clout |
| Glue | Slate | the, my, is, with, because (freestyle rounds only) |

Framed rounds deal the number of blanks plus six tiles, balanced across categories. Freestyle rounds deal 12 content tiles plus 10 glue words.

### Prompts

About 70 framed prompts and 35 freestyle prompts across themes such as Office Life, Food, Animals, Dating, Science, History, Crime and Travel. Each round picks an unused prompt of the right kind at random; if the pool runs dry it resets.

## Adding content

- **Framed prompt**: insert a row into `prompts` with `__` for each blank. Two to four blanks work best.
- **Freestyle prompt**: insert a row into `prompts` with an empty `sentence_frame`.
- **Tiles**: insert into `tiles` with a category of `noun`, `verb`, `adjective`, `adverb`, `filler` or `glue`. New tile sets go in `tile_sets`; assign one to a prompt via `tile_set_id` for a themed word pool.

## Running the integration test

`test/integration/game-flow.test.ts` drives the real API route handlers through a complete game (joining, starting, submitting, voting, scoring, concurrent advances, finishing, rematch) against a Postgres database with the migrations applied. It is skipped unless `MAGNA_TEST_DATABASE_URL` is set.

Prepare a local database that mimics the Supabase roles, then run the migrations and the test:

```sql
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
CREATE PUBLICATION supabase_realtime;
```

```
psql "$MAGNA_TEST_DATABASE_URL" -f supabase/migrations/001_initial_schema.sql   # …then 002 to 005
MAGNA_TEST_DATABASE_URL=postgres://postgres@localhost:5432/magna npm test
```

The same database can back the UI without a Supabase project: start the dev server with `MAGNA_FAKE_DB=1` and `MAGNA_TEST_DATABASE_URL` set (plus any placeholder values for the `NEXT_PUBLIC_SUPABASE_*` variables). Realtime is unavailable in that setup, so clients rely on the polling fallback.

## Housekeeping

Rooms are never deleted automatically. Migration 005 adds `cleanup_stale_rooms(interval)`, which deletes rooms older than the given age (default one day) along with everything in them. Run it by hand from the SQL Editor or schedule it with pg_cron:

```sql
SELECT cron.schedule('magnababble-cleanup', '0 4 * * *', $$SELECT cleanup_stale_rooms()$$);
```

## Deployment

Designed for the Vercel and Supabase free tiers.

1. Push to GitHub and import the repo in Vercel.
2. Add the four environment variables from `.env.local` in Vercel's project settings.
3. Set `NEXT_PUBLIC_APP_URL` to the deployment URL.
4. Deploy. No other infrastructure is needed.
