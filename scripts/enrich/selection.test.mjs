import { describe, it, expect } from "vitest";
import { selectCards, mergeEnrichment } from "./selection.mjs";

describe("targeted enrichment", () => {
  it("rejects unknown ids and preserves unselected and unmatched records", () => {
    const cards = [{ id: "c1" }, { id: "c2" }];
    expect(selectCards(cards, ["c2", "c2"])).toEqual([cards[1]]);
    expect(() => selectCards(cards, ["missing"])).toThrow();
    const old = { c1: { glossRu: ["один"] }, c2: { audioUrl: "old" } };
    expect(mergeEnrichment(old, {})).toEqual(old);
    expect(mergeEnrichment(old, { c3: { ipa: "new" } }).c1).toBe(old.c1);
  });
});
