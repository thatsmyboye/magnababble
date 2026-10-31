/**
 * Prompt sampler: fills every framed prompt with realistic hands so awkward
 * frames can be spotted before players see them.
 *
 *   DATABASE_URL=postgres://… npm run content:sample -- [--theme Food] [--samples 3] [--out report.md]
 *
 * DATABASE_URL can be the Supabase connection string (Project Settings →
 * Database) or a local database with the migrations applied. Read-only.
 *
 * Each sample deals a hand exactly as the game does (hints guaranteed,
 * themed packs mixed in) and then plays it like a quick player would:
 * the hinted category when the hand has one, otherwise any tile.
 */
import { writeFileSync } from "node:fs";
import { Pool } from "pg";
import { dealFrameHand, shuffle, type DealableTile } from "../lib/game/dealing";
import { countSlots, renderSentence } from "../lib/game/scoring";

const DEFAULT_SET = "00000000-0000-0000-0000-000000000001";
const VALID_HINTS = new Set(["noun", "verb", "adjective", "adverb", "filler"]);
const MIN_TILES_PER_HINT = 6;

interface PromptRow {
  theme: string;
  display_text: string;
  sentence_frame: string;
  slot_hints: string[] | null;
  tile_set_id: string | null;
  family_friendly: boolean;
}

interface TileRow extends DealableTile {
  tile_set_id: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Play a hand: hinted category first, otherwise any unused tile. */
function play(hand: DealableTile[], hints: (string | null)[]): string[] {
  const left = shuffle(hand);
  return hints.map((hint) => {
    const idx = Math.max(0, left.findIndex((t) => t.category === hint));
    const [tile] = left.splice(idx, 1);
    return tile?.word ?? "___";
  });
}

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.MAGNA_TEST_DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL (or MAGNA_TEST_DATABASE_URL) to a database with the migrations applied.");
    process.exit(1);
  }
  const theme = arg("theme");
  const samples = Number(arg("samples") ?? 3);
  const out = arg("out");

  const pool = new Pool({ connectionString: url });
  try {
    const [{ rows: prompts }, { rows: tiles }] = await Promise.all([
      pool.query<PromptRow>(
        `SELECT theme, display_text, sentence_frame, slot_hints, tile_set_id, family_friendly
         FROM prompts WHERE sentence_frame <> '' ${theme ? "AND theme = $1" : ""}
         ORDER BY theme, display_text`,
        theme ? [theme] : []
      ),
      pool.query<TileRow>("SELECT id, word, category, tile_set_id FROM tiles"),
    ]);

    const bySet = new Map<string, TileRow[]>();
    for (const t of tiles) bySet.set(t.tile_set_id, [...(bySet.get(t.tile_set_id) ?? []), t]);
    const mainPool = bySet.get(DEFAULT_SET) ?? [];

    const lines: string[] = [`# Prompt samples${theme ? ` — ${theme}` : ""}`, ""];
    const problems: string[] = [];

    for (const p of prompts) {
      const slots = countSlots(p.sentence_frame);
      const hints = p.slot_hints ?? Array(slots).fill(null);
      const themePool = p.tile_set_id && p.tile_set_id !== DEFAULT_SET ? bySet.get(p.tile_set_id) ?? [] : [];
      const where = `${p.theme}: "${p.display_text}"`;

      if (!p.slot_hints) problems.push(`${where} has no slot hints`);
      else if (p.slot_hints.length !== slots) problems.push(`${where} has ${slots} blanks but ${p.slot_hints.length} hints`);
      for (const h of p.slot_hints ?? []) {
        if (!VALID_HINTS.has(h)) problems.push(`${where} has an unknown hint "${h}"`);
        const available = [...mainPool, ...themePool].filter((t) => t.category === h).length;
        if (available < MIN_TILES_PER_HINT) problems.push(`${where}: only ${available} "${h}" tiles to deal from`);
      }
      if (slots > 5) problems.push(`${where} has ${slots} blanks (more than 5 tends to drag)`);

      lines.push(`## ${p.theme} — ${p.display_text}${p.family_friendly ? "" : " _(not family-friendly)_"}`);
      lines.push("", `\`${p.sentence_frame}\``, `Hints: ${hints.map((h) => h ?? "any").join(", ")}`, "");
      for (let i = 0; i < samples; i++) {
        const hand = dealFrameHand(mainPool, slots, Math.random, { hints, themePool });
        lines.push(`- ${renderSentence(p.sentence_frame, play(hand, hints))}`);
      }
      lines.push("");
    }

    lines.splice(2, 0, `${prompts.length} framed prompts, ${samples} samples each.`, "");
    if (problems.length > 0) {
      lines.splice(4, 0, "## Problems", "", ...problems.map((x) => `- ${x}`), "");
    } else {
      lines.splice(4, 0, "No structural problems found.", "");
    }

    const report = lines.join("\n");
    if (out) {
      writeFileSync(out, report);
      console.log(`Wrote ${out}: ${prompts.length} prompts, ${problems.length} problems.`);
    } else {
      console.log(report);
    }
    process.exitCode = problems.length > 0 ? 2 : 0;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
