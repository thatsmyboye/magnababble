# Magnababble
A real-time multiplayer word tile party game. Players fill sentence frames with word tiles from their hand, then vote on each other's creations. The crowd decides who wins.

Inspired by the now-defunct word games Psychobabble and Farragomate.

## How to play
1. One player creates a game and shares the room code (e.g. KOALA)
2. Everyone joins with the code and a display name — no account needed
3. Each round:
  - A prompt and sentence frame are revealed (The __ escaped __ and is now __ the __)
  - Players drag word tiles into the blank slots to complete the sentence
  - All submissions are shown anonymously — players vote for their favourite
  - Scores are revealed, then the next round begins
4. After all rounds, the player with the most votes wins

Games support 2–10 players and run 3–10 rounds (host's choice).

## Stack
  - Next.js 15 — App Router, TypeScript, API route handlers
  - Supabase — Postgres database, Realtime WebSocket subscriptions, Row-Level Security
  - dnd kit — drag-and-drop tile placement (touch + mouse)
  - Tailwind CSS — styling

## Local setup
1. Supabase project
Create a free project at supabase.com. In the SQL Editor, run the migration files in order:
  supabase/migrations/001_initial_schema.sql
  supabase/migrations/002_seed_content.sql
  supabase/migrations/003_functions.sql
  supabase/migrations/004_expanded_content.sql

2. Environment variables
  cp .env.local.example .env.local

Fill in .env.local:
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY is used server-side only (API routes) and is never exposed to the browser.

3. Run
  npm install
  npm run dev
Open http://localhost:3000. To simulate multiple players, open the same URL in a second browser window (or a private/incognito window).

## Project structure
app/
  page.tsx                    # Home — create or join a game
  room/[code]/                # Game room (all phases rendered here)
  api/
    rooms/                    # Create, join, start, advance rooms
    rounds/[id]/              # Submit tiles, cast votes

components/
  home/                       # CreateRoom and JoinRoom forms
  room/                       # One component per game phase
  tiles/                      # Tile, TileHand, SentenceFrame (dnd kit)
  ui/                         # Button, Input, Timer, PlayerList

lib/
  supabase/                   # Browser and server Supabase clients
  game/                       # Phase state machine, scoring helpers
  hooks/                      # useRoom (Realtime), usePhaseTimer

supabase/
  migrations/                 # SQL schema, seed data, RPC functions

## Game mechanics
Round phases
Phase	      Duration	What happens
prompt	    5 s	      Prompt and sentence frame revealed to all players
submitting	60 s	    Players fill in blanks with tiles; auto-advances when everyone submits
voting	    30 s	    Anonymous submissions shown; players vote (not their own); auto-advances when everyone votes
results	    10 s	    Authors revealed, vote counts shown, scores updated

Scoring
+1 point per vote received. Players who receive the most votes over all rounds win.

Phase timer
The host's browser fires the phase-advance API call when the timer expires (usePhaseTimer). All other clients wait for Supabase Realtime to push the updated round state. This avoids the need for a separate server-side cron or edge function.

Word tiles
293 tiles in the default set across five categories — each color-coded:

Category	Color	  Examples
Noun	    Blue	  flamingo, wizard, platypus
Verb	    Green	  wrangling, impersonating, bedazzling
Adjective	Amber	  unhinged, sentient, pungent
Adverb	  Rose	  catastrophically, singlehandedly, theatrically
Filler	  Purple	out of spite, in broad daylight, for clout

Each player is dealt more tiles than there are blank slots (slots + 5), so there's always a meaningful choice.

Prompts
65 prompts across 14 themes: Office Life, Food, Animals, Nature, Science, History, Politics, Dating, Sports, Movies, TV, School, Travel, Health, Crime, and Misc. Each round picks an unused prompt at random; if all prompts are exhausted the pool resets.

## Deployment
The app is designed for Vercel + Supabase free tier.
1. Push to GitHub, import the repo in Vercel
2. Add the four environment variables from .env.local in Vercel's project settings
3. Set NEXT_PUBLIC_APP_URL to your Vercel deployment URL (e.g. https://magnababble.vercel.app)
4. Deploy
No other infrastructure needed.

## Adding content
New prompts — insert rows into the prompts table. The sentence_frame uses __ for each blank slot. Players receive (number of slots + 5) tiles per round, so frames with 2–4 blanks work best.

New tile sets — insert a row into tile_sets, then insert tiles referencing its id. Assign a tile set to prompts via the tile_set_id column to give specific prompts a themed word pool.
