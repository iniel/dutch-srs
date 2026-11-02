import { describe, expect, it } from "vitest";
import type { Card, Grammar } from "../types";
import { buildSearchForms, searchCards, searchForms } from "./searchCards";

const card = (id: string, dutch: string, english: string[], lemma?: string): Card => ({
  id, group: "g", dutch, english, type: "word", lemma,
});

const ids = (matches: { card: Card }[]) => matches.map((m) => m.card.id);

const cards = [
  card("c1", "het boek", ["book"], "boek"),
  card("c2", "de boekenkast", ["bookcase"], "boekenkast"),
  card("c3", "het notitieboek", ["notebook"], "notitieboek"),
  card("c4", "lezen", ["to read"], "lezen"),
];

describe("searchCards", () => {
  it("ranks exact before prefix before substring, matching the lemma too", () => {
    expect(ids(searchCards(cards, "boek"))).toEqual(["c1", "c2", "c3"]);
  });

  it("matches English and ignores case and punctuation", () => {
    expect(ids(searchCards(cards, "To Read!"))).toEqual(["c4"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchCards(cards, "  ")).toEqual([]);
    expect(ids(searchCards(cards, "boek", 1))).toEqual(["c1"]);
  });
});

describe("searchCards with inflected forms", () => {
  const grammar: Record<string, Grammar> = {
    v1: { verb: { presentSg: "loop", pastSg: "liep", pastPl: "liepen", pastParticiple: "gelopen" } },
    v2: { verb: { presentSg: "sta op", pastSg: "stond op", pastPl: "stonden op", pastParticiple: "opgestaan" } },
    v3: { verb: { presentSg: "ben", pastSg: "was", pastPl: "waren", pastParticiple: "geweest" } },
    v4: { verb: { presentSg: "kan", pastSg: "kon", pastPl: "konden", pastParticiple: "gekund" } },
    n1: { noun: { plural: "boeken", diminutive: "boekje" } },
  };
  const vocab = [
    card("v1", "lopen", ["to walk"], "lopen"),
    card("v2", "opstaan", ["to get up"], "opstaan"),
    card("v3", "zijn", ["to be"], "zijn"),
    card("v4", "kunnen", ["can"], "kunnen"),
    card("n1", "het boek", ["book"], "boek"),
    card("w1", "was", ["laundry"], "was"),
    card("k1", "de kant", ["side"], "kant"),
  ];
  const formsOf = buildSearchForms(vocab, (id) => grammar[id]);
  const search = (q: string) => searchCards(vocab, q, undefined, formsOf);

  it("finds a verb by its past and participle forms and reports the matched form", () => {
    expect(search("liep")[0]).toEqual({ card: vocab[0], form: "liep" });
    expect(search("gelopen")[0]).toEqual({ card: vocab[0], form: "gelopen" });
  });

  it("derives the jij/hij present form, with irregular overrides", () => {
    expect(ids(search("loopt"))).toEqual(["v1"]);
    expect(ids(search("is"))).toContain("v3");
    expect(ids(search("kant"))).toEqual(["k1"]);
  });

  it("matches separable forms whole and by prefix", () => {
    expect(ids(search("stond op"))).toEqual(["v2"]);
    expect(ids(search("stond"))).toEqual(["v2"]);
  });

  it("finds a noun by its plural", () => {
    expect(search("boeken")[0]).toEqual({ card: vocab[4], form: "boeken" });
  });

  it("ranks a headword match above a form match and leaves form unset for it", () => {
    expect(search("was").slice(0, 2)).toEqual([{ card: vocab[5] }, { card: vocab[2], form: "was" }]);
  });

  it("does not substring-match forms", () => {
    expect(ids(search("iep"))).toEqual([]);
  });
});

describe("searchForms", () => {
  it("uses the irregular jij form for modals instead of deriving one", () => {
    expect(searchForms(card("v4", "kunnen", ["can"]), { verb: { presentSg: "kan", pastSg: "kon" } })).toEqual(["kan", "kon", "kunt"]);
  });

  it("adds is/bent for zijn and heeft/hebt for hebben", () => {
    expect(searchForms(card("z", "zijn", ["to be"]), { verb: { presentSg: "ben" } })).toEqual(["ben", "is", "bent"]);
    expect(searchForms(card("h", "hebben", ["to have"]), { verb: { presentSg: "heb" } })).toEqual(["heb", "heeft", "hebt"]);
  });
});
