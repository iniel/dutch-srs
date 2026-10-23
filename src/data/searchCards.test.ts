import { describe, expect, it } from "vitest";
import type { Card } from "../types";
import { searchCards } from "./searchCards";

const card = (id: string, dutch: string, english: string[], lemma?: string): Card => ({
  id, group: "g", dutch, english, type: "word", lemma,
});

const cards = [
  card("c1", "het boek", ["book"], "boek"),
  card("c2", "de boekenkast", ["bookcase"], "boekenkast"),
  card("c3", "het notitieboek", ["notebook"], "notitieboek"),
  card("c4", "lezen", ["to read"], "lezen"),
];

describe("searchCards", () => {
  it("ranks exact before prefix before substring, matching the lemma too", () => {
    expect(searchCards(cards, "boek").map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("matches English and ignores case and punctuation", () => {
    expect(searchCards(cards, "To Read!").map((c) => c.id)).toEqual(["c4"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchCards(cards, "  ")).toEqual([]);
    expect(searchCards(cards, "boek", 1).map((c) => c.id)).toEqual(["c1"]);
  });
});
