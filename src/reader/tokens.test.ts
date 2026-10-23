import { describe, expect, it } from "vitest";
import { isWordToken, smartSearchQuery, tokenCardIds, tokenLemma, tokenSearchQuery, tokenSpace } from "./tokens";

describe("reader tokens", () => {
  it("applies the exporter's defaults for omitted fields", () => {
    expect(tokenSpace({ w: "dag" })).toBe(" ");
    expect(tokenSpace({ w: "dag", sp: "" })).toBe("");
    expect(tokenLemma({ w: "Dag" })).toBe("dag");
    expect(tokenLemma({ w: "maakt", lemma: "maken" })).toBe("maken");
  });

  it("treats only tokens with a status as words", () => {
    expect(isWordToken({ w: "," })).toBe(false);
    expect(isWordToken({ w: "dag", status: "known" })).toBe(true);
  });

  it("keeps only card ids present in the deck, in order", () => {
    const index = { byId: new Map([["c2", {}], ["c1", {}]]) } as never;
    expect(tokenCardIds({ w: "zijn", cards: ["c1", "c9", "c2"] }, index)).toEqual(["c1", "c2"]);
  });

  it("falls back from a wrong lemma to the surface form and then shorter prefixes", () => {
    const deck = ["glimmen", "glimlach", "lopen"];
    const has = (q: string) => deck.some((w) => w.includes(q));
    expect(smartSearchQuery({ w: "glimt", lemma: "glimen" }, has)).toBe("glim");
    expect(smartSearchQuery({ w: "liep", lemma: "lopen" }, has)).toBe("lopen");
    expect(smartSearchQuery({ w: "Lopen" }, has)).toBe("lopen");
    expect(smartSearchQuery({ w: "xyzzyq" }, has)).toBe("xyzzyq");
  });

  it("searches compounds by surface form, others by lemma", () => {
    expect(tokenSearchQuery({ w: "Drugsgeld", lemma: "drugs+geld" })).toBe("drugsgeld");
    expect(tokenSearchQuery({ w: "glimt", lemma: "glimmen" })).toBe("glimmen");
  });
});
