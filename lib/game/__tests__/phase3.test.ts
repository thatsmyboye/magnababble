import { describe, expect, it } from "vitest";
import {
  chooseModifier,
  effectiveFrame,
  effectiveHints,
  scoreMultiplier,
  type RoundModifier,
} from "../modifiers";
import { phaseDurationMs } from "../phases";
import { countSlots } from "../scoring";
import { dealFrameHand, dealFreestyleHand, type DealableTile } from "../dealing";
import { describeSettings, sanitizeSettings } from "../settings";

const fixed = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

function pool(prefix: string, perCategory: number, cats = ["noun", "verb", "adjective", "adverb", "filler", "glue"]) {
  const tiles: DealableTile[] = [];
  for (const cat of cats) for (let i = 0; i < perCategory; i++) tiles.push({ id: `${prefix}-${cat}-${i}`, word: `${prefix}${cat}${i}`, category: cat });
  return tiles;
}

describe("special rounds", () => {
  const base = { enabled: true, roundCount: 5, freestyle: false, previous: null as RoundModifier | null };

  it("never applies when the house rule is off", () => {
    expect(chooseModifier({ ...base, enabled: false, roundNumber: 5 })).toBeNull();
  });

  it("keeps round one normal and makes the final round double", () => {
    expect(chooseModifier({ ...base, roundNumber: 1, rng: fixed(0) })).toBeNull();
    expect(chooseModifier({ ...base, roundNumber: 5 })).toBe("double");
    expect(chooseModifier({ ...base, roundNumber: 2, roundCount: 2, rng: fixed(0) })).toBeNull(); // too short for a double final
  });

  it("never runs specials back to back, nor right before the final", () => {
    expect(chooseModifier({ ...base, roundNumber: 3, previous: "speed", rng: fixed(0) })).toBeNull();
    expect(chooseModifier({ ...base, roundNumber: 4, rng: fixed(0) })).toBeNull();
  });

  it("picks speed or chaos for middle rounds, and only speed in freestyle", () => {
    expect(chooseModifier({ ...base, roundNumber: 2, rng: fixed(0.1, 0.0) })).toBe("speed");
    expect(chooseModifier({ ...base, roundNumber: 2, rng: fixed(0.1, 0.9) })).toBe("chaos");
    expect(chooseModifier({ ...base, roundNumber: 2, freestyle: true, rng: fixed(0.1, 0.9) })).toBe("speed");
    expect(chooseModifier({ ...base, roundNumber: 2, rng: fixed(0.99) })).toBeNull();
  });

  it("adds a chaos blank before closing punctuation, with a phrase hint", () => {
    expect(effectiveFrame("I was just __ the __ with my __", "chaos")).toBe("I was just __ the __ with my __ __");
    expect(effectiveFrame("And he is __ the __ right into the __ __ !", "chaos")).toBe(
      "And he is __ the __ right into the __ __ __ !"
    );
    expect(effectiveFrame("A __ b", "speed")).toBe("A __ b");
    expect(effectiveFrame("", "chaos")).toBe("");
    expect(countSlots(effectiveFrame("A __ b __", "chaos"))).toBe(3);
    expect(effectiveHints(["noun", "verb"], "A __ b __", "chaos")).toEqual(["noun", "verb", "filler"]);
    expect(effectiveHints(["noun"], "A __", null)).toEqual(["noun"]);
    expect(effectiveHints(null, "A __", "chaos")).toBeNull();
  });

  it("halves writing time in speed rounds, with a floor", () => {
    expect(phaseDurationMs("submitting", false, {}, "speed")).toBe(30_000);
    expect(phaseDurationMs("submitting", true, {}, "speed")).toBe(45_000);
    expect(phaseDurationMs("submitting", false, { submitSeconds: 30 }, "speed")).toBe(20_000);
    expect(phaseDurationMs("voting", false, {}, "speed")).toBe(30_000);
  });

  it("doubles only double rounds", () => {
    expect(scoreMultiplier("double")).toBe(2);
    expect(scoreMultiplier("speed")).toBe(1);
    expect(scoreMultiplier(null)).toBe(1);
  });
});

describe("hint-aware and themed dealing", () => {
  it("covers every hinted blank", () => {
    const main = pool("m", 30);
    for (let seed = 0; seed < 25; seed++) {
      const hints = ["filler", "filler", "adverb", "verb"];
      const hand = dealFrameHand(main, 4, Math.random, { hints });
      const counts = (cat: string) => hand.filter((t) => t.category === cat).length;
      expect(counts("filler")).toBeGreaterThanOrEqual(2);
      expect(counts("adverb")).toBeGreaterThanOrEqual(1);
      expect(counts("verb")).toBeGreaterThanOrEqual(1);
      expect(hand).toHaveLength(10);
      expect(new Set(hand.map((t) => t.id)).size).toBe(10);
      expect(hand.some((t) => t.category === "glue")).toBe(false);
    }
  });

  it("draws about half a themed hand from the pack", () => {
    const main = pool("m", 30);
    const theme = pool("t", 6, ["noun", "verb", "adjective", "adverb", "filler"]);
    const hand = dealFrameHand(main, 4, Math.random, { hints: ["noun", "verb", "adjective", "noun"], themePool: theme });
    const fromTheme = hand.filter((t) => t.id.startsWith("t-")).length;
    expect(hand).toHaveLength(10);
    expect(fromTheme).toBeGreaterThanOrEqual(5);
    expect(fromTheme).toBeLessThan(10);
  });

  it("keeps glue words in themed freestyle hands", () => {
    const hand = dealFreestyleHand(pool("m", 30), Math.random, 12, 10, pool("t", 6, ["noun", "verb", "adjective"]));
    expect(hand.filter((t) => t.category === "glue")).toHaveLength(10);
    expect(hand.filter((t) => t.id.startsWith("t-")).length).toBeGreaterThanOrEqual(6);
  });
});

describe("phase 3 house rules", () => {
  it("stores only true flags and describes them", () => {
    expect(sanitizeSettings({ specialRounds: true, familyFriendly: true })).toEqual({ specialRounds: true, familyFriendly: true });
    expect(sanitizeSettings({ specialRounds: "yes", familyFriendly: false })).toEqual({});
    expect(describeSettings({ specialRounds: true, familyFriendly: true })).toEqual(["Special rounds", "Family-friendly"]);
  });
});
