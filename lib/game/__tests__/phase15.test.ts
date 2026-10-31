import { describe, expect, it } from "vitest";
import { extractRoomCode } from "../../utils";
import { estimateGameMinutes, maxRoundMs } from "../estimate";
import { insertAfter, moveBy } from "../reorder";

describe("extractRoomCode", () => {
  it("accepts bare codes in any case", () => {
    expect(extractRoomCode("bxkt")).toBe("BXKT");
    expect(extractRoomCode(" B-X k t ")).toBe("BXKT");
  });

  it("pulls the code out of a pasted invite link", () => {
    expect(extractRoomCode("https://magnababble.com/room/RSZE")).toBe("RSZE");
    expect(extractRoomCode("magnababble.vercel.app/room/abcd?ref=qr#x")).toBe("ABCD");
  });

  it("never returns more than four characters", () => {
    expect(extractRoomCode("ABCDEFG")).toBe("ABCD");
    expect(extractRoomCode("")).toBe("");
  });
});

describe("estimateGameMinutes", () => {
  it("uses the full phase timers as an upper bound", () => {
    expect(maxRoundMs(true)).toBeGreaterThan(maxRoundMs(false));
    expect(estimateGameMinutes(5, "frames")).toBe(Math.round((5 * maxRoundMs(false)) / 60_000));
    expect(estimateGameMinutes(5, "freestyle")).toBe(Math.round((5 * maxRoundMs(true)) / 60_000));
  });

  it("alternates framed and freestyle in mixed mode", () => {
    const expected = Math.round((3 * maxRoundMs(false) + 2 * maxRoundMs(true)) / 60_000);
    expect(estimateGameMinutes(5, "mixed")).toBe(expected);
    expect(estimateGameMinutes(1, "mixed")).toBeGreaterThanOrEqual(1);
  });
});

describe("reordering", () => {
  it("moves an item one step and ignores moves off the ends", () => {
    expect(moveBy(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveBy(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveBy(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveBy(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });

  it("inserts after an anchor or appends", () => {
    expect(insertAfter(["a", "b", "c"], "x", "a")).toEqual(["a", "x", "b", "c"]);
    expect(insertAfter(["a", "b"], "x", null)).toEqual(["a", "b", "x"]);
    expect(insertAfter(["a", "b"], "x", "zz")).toEqual(["a", "b", "x"]);
    expect(insertAfter(["x", "a", "b"], "x", "b")).toEqual(["a", "b", "x"]);
  });
});
