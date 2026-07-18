import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeCandidates, sig } from "./import-merge.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const liveCards = () => JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));

describe("public/cards.json id invariants (owned data)", () => {
  const cards = liveCards();

  it("has unique, c-prefixed ids", () => {
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^c\d+$/.test(id))).toBe(true);
  });
});

describe("mergeCandidates — append-only", () => {
  const live = [
    { id: "c0", level: "A1", dutch: "het jaar", english: ["year"], type: "word" },
    { id: "c1", level: "A1", dutch: "de man", english: ["man"], type: "word" },
  ];

  it("appends new cards with next-free ids and leaves the existing prefix untouched", () => {
    const { cards, added, skipped } = mergeCandidates(live, [
      { id: "c999", level: "A+", dutch: "de vrouw", english: ["woman"], type: "word" },
    ]);
    expect(added).toBe(1);
    expect(skipped).toBe(0);
    expect(cards.slice(0, 2)).toEqual(live);
    expect(cards[2].id).toBe("c2");
    expect(cards[2].dutch).toBe("de vrouw");
    expect(cards[2]).not.toHaveProperty("id", "c999");
  });

  it("skips a candidate that duplicates a live card (article-stripped Dutch + English)", () => {
    const { cards, added, skipped } = mergeCandidates(live, [
      { id: "cX", level: "A2", dutch: "man", english: ["man"], type: "word" },
    ]);
    expect(added).toBe(0);
    expect(skipped).toBe(1);
    expect(cards).toHaveLength(2);
  });

  it("dedupes candidates against each other within one merge", () => {
    const { added, skipped } = mergeCandidates(live, [
      { level: "A+", dutch: "de hond", english: ["dog"], type: "word" },
      { level: "A+", dutch: "een hond", english: ["dog"], type: "word" },
    ]);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
  });

  it("never mutates the input live array", () => {
    const before = live.length;
    mergeCandidates(live, [{ level: "A+", dutch: "de kat", english: ["cat"], type: "word" }]);
    expect(live).toHaveLength(before);
  });

  it("sig ignores article + case for matching", () => {
    expect(sig({ dutch: "de Man", english: ["man"] })).toBe(sig({ dutch: "man", english: ["Man"] }));
  });
});
