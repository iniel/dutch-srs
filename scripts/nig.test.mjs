import { describe, it, expect } from "vitest";
import { prepareEntries, droppedNotes, cardFromEntry, buildChapterPath, strictSignature, chosenCardId, pruneBookCards } from "./nig.mjs";

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
  it("leaves out explicitly dropped notes but still accounts for them", () => {
    const raw = [
      { id: "1", chapter: 4, position: 1, front: "Venetië", back: "Venice" },
      { id: "2", chapter: 4, position: 2, front: "zeg dat", back: "" },
      { id: "3", chapter: 4, position: 3, front: "wel!", back: "you can say that again" },
      { id: "4", chapter: 4, position: 4, front: "de markt", back: "market" },
    ];
    const fixes = { "1": { drop: true }, "2": { mergeWith: "3", front: "zeg dat wel!", back: "you can say that again", drop: true } };
    expect(prepareEntries(raw, fixes).map(e => e.id)).toEqual(["4"]);
    expect(droppedNotes(raw, fixes)).toEqual([
      { sourceId: "1", chapter: 4 }, { sourceId: "2", chapter: 4 }, { sourceId: "3", chapter: 4, mergedInto: "2" },
    ]);
    expect(() => prepareEntries(raw, { "1": { drop: true, reuseId: "c1" } })).toThrow();
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
  it("lets a reviewed reuse override the saved mapping", () => {
    const pinned = new Map([["1", "c900"]]);
    expect(chosenCardId("1", { reuseId: "c31" }, pinned)).toBe("c31");
    expect(chosenCardId("1", undefined, pinned)).toBe("c900");
    expect(chosenCardId("2", undefined, pinned)).toBeUndefined();
  });
  it("drops the book recording when a form is mapped onto its lemma card", () => {
    const [entry] = prepareEntries([{ id: "1", chapter: 2, position: 1, front: "broers (broer)", back: "brothers", audio: "audio/x.mp3" }],
      { "1": { reuseId: "c31", form: true } });
    expect(entry.audio).toBeUndefined();
    const [kept] = prepareEntries([{ id: "1", chapter: 2, position: 1, front: "de markt", back: "market", audio: "audio/x.mp3" }],
      { "1": { reuseId: "c366" } });
    expect(kept.audio).toBe("audio/x.mp3");
  });
  it("prunes only book cards that nothing references any more", () => {
    const cards = [{ id: "c1" }, { id: "c10" }, { id: "c11" }];
    const out = pruneBookCards({ cards, enrichment: { c1: {}, c10: {}, c11: {} }, bookIds: ["c10", "c11"],
      audio: { c10: "audio/a.mp3", c11: "audio/b.mp3" }, referenced: new Set(["c1", "c11"]) });
    expect(out.removed).toEqual(["c10"]);
    expect(out.cards.map(c => c.id)).toEqual(["c1", "c11"]);
    expect(Object.keys(out.enrichment)).toEqual(["c1", "c11"]);
    expect(out.bookIds).toEqual(["c11"]);
    expect(out.audio).toEqual({ c11: "audio/b.mp3" });
    expect(() => pruneBookCards({ cards, enrichment: {}, bookIds: ["c10"], audio: {}, referenced: new Set(["c1"]),
      expectRemoved: 2 })).toThrow();
  });
});
