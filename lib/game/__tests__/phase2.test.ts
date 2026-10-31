import { describe, expect, it } from "vitest";
import {
  describeSettings,
  sanitizeSettings,
  submitSeconds,
  voteSeconds,
} from "../settings";
import { phaseDurationMs } from "../phases";
import { estimateGameMinutes } from "../estimate";
import { addParticle, isReaction, MAX_PARTICLES, type Particle } from "../../realtime/reactions";

describe("house rules", () => {
  it("keeps only valid, non-default values", () => {
    expect(sanitizeSettings(null)).toEqual({});
    expect(sanitizeSettings([1, 2])).toEqual({});
    expect(sanitizeSettings({ submitSeconds: 60, voteSeconds: 30 })).toEqual({});
    expect(sanitizeSettings({ submitSeconds: 45, voteSeconds: "20" })).toEqual({ submitSeconds: 45, voteSeconds: 20 });
    expect(sanitizeSettings({ submitSeconds: 999, voteSeconds: -1, evil: true })).toEqual({});
    expect(sanitizeSettings({ themes: ["Food", "Food", " ", 3, "Animals"] })).toEqual({ themes: ["Food", "Animals"] });
    expect(sanitizeSettings({ themes: [] })).toEqual({});
  });

  it("drives phase durations, with extra freestyle writing time", () => {
    expect(submitSeconds({}, false)).toBe(60);
    expect(submitSeconds({}, true)).toBe(90);
    expect(submitSeconds({ submitSeconds: 45 }, true)).toBe(68);
    expect(voteSeconds({ voteSeconds: 15 })).toBe(15);
    expect(phaseDurationMs("submitting", false, { submitSeconds: 30 })).toBe(30_000);
    expect(phaseDurationMs("voting", false, { voteSeconds: 45 })).toBe(45_000);
    expect(phaseDurationMs("results", true, { submitSeconds: 30 })).toBe(15_000);
  });

  it("shortens the estimate with faster timers", () => {
    expect(estimateGameMinutes(5, "frames", { submitSeconds: 30, voteSeconds: 15 })).toBeLessThan(
      estimateGameMinutes(5, "frames")
    );
  });

  it("describes only what differs from the defaults", () => {
    expect(describeSettings({})).toEqual([]);
    expect(describeSettings({ submitSeconds: 45, themes: ["A", "B", "C", "D"] })).toEqual([
      "45s to write",
      "Themes: A, B, C +1 more",
    ]);
  });
});

describe("reactions", () => {
  it("accepts only the allowed emoji", () => {
    expect(isReaction("😂")).toBe(true);
    expect(isReaction("🍕")).toBe(false);
    expect(isReaction({ emoji: "😂" })).toBe(false);
  });

  it("caps how many particles are on screen, dropping the oldest", () => {
    let list: Particle[] = [];
    for (let i = 1; i <= MAX_PARTICLES + 5; i++) list = addParticle(list, { id: i, emoji: "🔥", x: 50, mine: false });
    expect(list).toHaveLength(MAX_PARTICLES);
    expect(list[0].id).toBe(6);
  });
});
