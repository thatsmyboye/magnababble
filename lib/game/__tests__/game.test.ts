import { describe, expect, it } from "vitest";
import {
  countSlots,
  isFreestyle,
  renderFreestyle,
  renderSentence,
  renderSubmission,
} from "../scoring";
import {
  dealContent,
  dealFrameHand,
  dealFreestyleHand,
  frameHandSize,
  placementUsesHand,
  shuffle,
  type DealableTile,
} from "../dealing";
import { nextPhase, phaseDurationMs, phaseEndsAt, isRoomMode } from "../phases";
import { generateRoomCode, normalizeRoomCode } from "../../utils";

function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function pool(): DealableTile[] {
  const tiles: DealableTile[] = [];
  const cats = ["noun", "verb", "adjective", "adverb", "filler", "glue"];
  for (const cat of cats) {
    for (let i = 0; i < 20; i++) tiles.push({ id: `${cat}-${i}`, word: `${cat}${i}`, category: cat });
  }
  return tiles;
}

describe("sentence rendering", () => {
  it("counts blanks", () => {
    expect(countSlots("The __ ate my __")).toBe(2);
    expect(countSlots("")).toBe(0);
    expect(isFreestyle("")).toBe(true);
    expect(isFreestyle("A __")).toBe(false);
  });

  it("fills blanks in order and marks missing ones", () => {
    expect(renderSentence("The __ ate my __", ["dog", "homework"])).toBe("The [dog] ate my [homework]");
    expect(renderSentence("The __ ate my __", ["dog"])).toBe("The [dog] ate my [___]");
  });

  it("renders freestyle sentences with capital and full stop", () => {
    expect(renderFreestyle(["my", "uncle", "is", "a", "flamingo"])).toBe("My uncle is a flamingo.");
    expect(renderFreestyle(["why", "though?"])).toBe("Why though?");
    expect(renderFreestyle([])).toBe("");
    expect(renderFreestyle(["  ", "x"])).toBe("X.");
  });

  it("picks the renderer from the frame", () => {
    expect(renderSubmission("", ["a", "b"])).toBe("A b.");
    expect(renderSubmission("__ b", ["a"])).toBe("[a] b");
  });
});

describe("dealing", () => {
  it("deals slots + extra tiles with a category spread and no glue", () => {
    const hand = dealFrameHand(pool(), 3, seeded(7));
    expect(hand).toHaveLength(frameHandSize(3));
    expect(new Set(hand.map((t) => t.id)).size).toBe(hand.length);
    expect(hand.some((t) => t.category === "glue")).toBe(false);
    const cats = new Set(hand.map((t) => t.category));
    expect(cats.size).toBe(5);
  });

  it("stops when the pool runs dry", () => {
    const tiny: DealableTile[] = [
      { id: "1", word: "a", category: "noun" },
      { id: "2", word: "b", category: "verb" },
    ];
    expect(dealContent(tiny, 10, seeded())).toHaveLength(2);
  });

  it("deals freestyle hands with glue first then content", () => {
    const hand = dealFreestyleHand(pool(), seeded(3));
    expect(hand).toHaveLength(22);
    const glue = hand.filter((t) => t.category === "glue");
    expect(glue).toHaveLength(10);
    expect(hand.slice(0, 10).every((t) => t.category === "glue")).toBe(true);
    expect(new Set(hand.map((t) => t.id)).size).toBe(22);
  });

  it("shuffle keeps all items", () => {
    const items = [1, 2, 3, 4, 5];
    expect([...shuffle(items, seeded(9))].sort()).toEqual(items);
  });

  it("validates placements against the hand, honouring duplicates", () => {
    const hand = [{ word: "the" }, { word: "the" }, { word: "cat" }];
    expect(placementUsesHand(["the", "cat", "the"], hand)).toBe(true);
    expect(placementUsesHand(["the", "the", "the"], hand)).toBe(false);
    expect(placementUsesHand(["dog"], hand)).toBe(false);
    expect(placementUsesHand([], hand)).toBe(true);
  });
});

describe("phases", () => {
  it("walks the phase order", () => {
    expect(nextPhase("prompt")).toBe("submitting");
    expect(nextPhase("submitting")).toBe("voting");
    expect(nextPhase("voting")).toBe("results");
    expect(nextPhase("results")).toBeNull();
  });

  it("gives freestyle rounds more composing time", () => {
    expect(phaseDurationMs("submitting", true)).toBeGreaterThan(phaseDurationMs("submitting", false));
    expect(phaseDurationMs("voting", true)).toBe(phaseDurationMs("voting", false));
  });

  it("computes an ISO deadline", () => {
    expect(phaseEndsAt("prompt", false, null, 0)).toBe(new Date(phaseDurationMs("prompt")).toISOString());
  });

  it("validates modes", () => {
    expect(isRoomMode("mixed")).toBe(true);
    expect(isRoomMode("chaos")).toBe(false);
  });
});

describe("room codes", () => {
  it("are four unambiguous letters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateRoomCode(seeded(i + 1))).toMatch(/^[ABCDEFGHJKLMNPRSTUVWXYZ]{4}$/);
    }
  });

  it("normalises user input", () => {
    expect(normalizeRoomCode(" bx-kt ")).toBe("BXKT");
  });
});
