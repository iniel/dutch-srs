import { describe, it, expect } from "vitest";
import { prepareEntries, cardFromEntry, buildChapterPath, strictSignature } from "./nig.mjs";

describe("Nederlands in gang import", () => {
  it("repairs explicit split records and accounts for both source ids", () => {
    const entries = prepareEntries([
      { id: "1", chapter: 2, position: 1, front: "komen op bezoek", back: "" },
      { id: "2", chapter: 2, position: 2, front: "(op bezoek komen)", back: "pay a visit" },
    ], { "1": { mergeWith: "2", front: "komen op bezoek (op bezoek komen)", back: "pay a visit", reason: "Split source row" } });
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceIds).toEqual(["1", "2"]);
    expect(cardFromEntry(entries[0]).dutch).toBe("komen op bezoek");
  });
  it("retains inflected forms and does not split contextual glosses", () => {
    const c = cardFromEntry({ front: "wilde (willen)", back: "wanted", chapter: 10 });
    expect(c.dutch).toBe("wilde");
    expect(c.lemma).toBe("wilde");
    expect(c.notes).toContain("willen");
    expect(cardFromEntry({ front: "hoor", back: "(for friendliness, usually not translated)", chapter: 1 }).english)
      .toEqual(["(for friendliness, usually not translated)"]);
    expect(cardFromEntry({ front: "<b>het café</b>", back: "café / pub", chapter: 3 }).english).toEqual(["café", "pub"]);
    expect(strictSignature(c)).not.toBe(strictSignature({ ...c, dutch: "willen" }));
  });
  it("refuses uncorrected empty translations and invalid chapters", () => {
    expect(() => prepareEntries([{ id: "1", chapter: 1, front: "x", back: "" }], {})).toThrow();
    expect(() => prepareEntries([{ id: "1", chapter: 19, front: "x", back: "y" }], {})).toThrow();
  });
  it("requires 18 nonempty chapters and deduplicates only inside each chapter", () => {
    const entries = Array.from({ length: 18 }, (_, i) => ({ chapter: i + 1 }));
    const ids = entries.map(() => "c1");
    expect(buildChapterPath(entries, ids, new Set(ids)).units).toHaveLength(18);
    expect(() => buildChapterPath(entries.slice(1), ids.slice(1), new Set(ids))).toThrow();
    expect(() => buildChapterPath(entries, ids, new Set())).toThrow();
  });
});
