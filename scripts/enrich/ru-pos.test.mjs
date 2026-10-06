import { describe, it, expect } from "vitest";
import { posClass, posKey } from "./ru-pos.mjs";

describe("posClass — one vocabulary across Kaikki, Wiktionary editions and FreeDict", () => {
  for (const [raw, cls] of [
    ["n", "noun"], ["noun", "noun"], ["v", "verb"], ["verb", "verb"],
    ["adj", "adj"], ["ordinalAdjective", "adj"], ["adv", "adv"],
    ["det", "pron"], ["pron", "pron"], ["possessivePronoun", "pron"], ["personalPronoun", "pron"],
    ["num", "num"], ["cardinalNumeral", "num"], ["prep", "prep"], ["preposition", "prep"],
    ["intj", "intj"], ["interjection", "intj"], ["conj", "conj"], ["conjunction", "conj"],
    ["phrase", "phrase"], ["phraseologicalUnit", "phrase"], ["article", "article"],
    ["pn", "name"], ["name", "name"],
  ]) it(`${raw} -> ${cls}`, () => expect(posClass(raw)).toBe(cls));
  it("leaves unknown parts of speech unclassified so they never match", () => {
    expect(posClass("unknown")).toBeUndefined();
    expect(posClass(undefined)).toBeUndefined();
    expect(posKey("zijn", "unknown")).toBeUndefined();
    expect(posKey("zijn", "v")).toBe(posKey("zijn", "verb"));
    expect(posKey("zijn", "det")).not.toBe(posKey("zijn", "verb"));
  });
});
