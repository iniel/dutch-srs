import { candidateForms, blankExample, dutchCloze, BLANK } from "./cloze";
import type { Card, Enrichment } from "../types";

function card(partial: Partial<Card> = {}): Card {
  return { id: "c1", group: "g", dutch: "kat", english: ["cat"], type: "word", ...partial };
}

describe("blankExample", () => {
  it("blanks a verbatim whole-word match", () => {
    expect(blankExample("Ze zijn 4 jaar getrouwd.", ["jaar"])).toBe(
      `Ze zijn 4 ${BLANK} getrouwd.`,
    );
  });

  it("blanks every occurrence of every matched form", () => {
    expect(blankExample("De kat zag een andere kat.", ["kat"])).toBe(
      `De ${BLANK} zag een andere ${BLANK}.`,
    );
  });

  it("matches a known inflected form, not just the head", () => {
    expect(blankExample("De man liep rustig door het park.", ["lopen", "liep"])).toBe(
      `De man ${BLANK} rustig door het park.`,
    );
  });

  it("is case- and accent-insensitive but preserves the rest of the sentence", () => {
    expect(blankExample("Eén tel met jou.", ["één"])).toBe(`${BLANK} tel met jou.`);
    expect(blankExample("Jaar in, jaar uit.", ["jaar"])).toBe(
      `${BLANK} in, ${BLANK} uit.`,
    );
  });

  it("only matches whole words, never substrings", () => {
    expect(blankExample("De opa zit op de bank.", ["op"])).toBe(
      `De opa zit ${BLANK} de bank.`,
    );
  });

  it("returns null when no form is present (junk / mismatched examples)", () => {
    expect(blankExample("1992, A. F. Th. van der Heijden, page 23", ["nee"])).toBeNull();
    expect(blankExample("Duitsland grenst aan Nederland.", ["lopen"])).toBeNull();
  });

  it("returns null for empty form lists", () => {
    expect(blankExample("De kat zit daar.", [])).toBeNull();
  });

  it("returns null when blanking leaves no context (one-word example)", () => {
    expect(blankExample("Hallo.", ["hallo"])).toBeNull();
    expect(blankExample("Kat!", ["kat"])).toBeNull();
  });
});

describe("candidateForms", () => {
  it("includes the article-stripped head and lemma", () => {
    const forms = candidateForms(card({ dutch: "de hond", lemma: "hond" }));
    expect(forms).toContain("hond");
  });

  it("pulls known inflected forms from enrichment grammar", () => {
    const enr: Enrichment = {
      id: "c1",
      match: { source: "kaikki" },
      grammar: {
        verb: { presentSg: "loop", pastSg: "liep", pastParticiple: "gelopen" },
      },
    };
    const forms = candidateForms(card({ dutch: "lopen", lemma: "lopen" }), enr);
    expect(forms).toEqual(expect.arrayContaining(["lopen", "loop", "liep", "gelopen"]));
  });

  it("pulls noun plural/diminutive and adjective comparison forms", () => {
    const noun: Enrichment = {
      id: "c1",
      match: { source: "kaikki" },
      grammar: { noun: { plural: "dagen", diminutive: "dagje" } },
    };
    expect(candidateForms(card({ dutch: "de dag" }), noun)).toEqual(
      expect.arrayContaining(["dag", "dagen", "dagje"]),
    );
    const adj: Enrichment = {
      id: "c1",
      match: { source: "kaikki" },
      grammar: { adjective: { comparative: "hoger", superlative: "hoogst" } },
    };
    expect(candidateForms(card({ dutch: "hoog" }), adj)).toEqual(
      expect.arrayContaining(["hoog", "hoger", "hoogst"]),
    );
  });

  it("drops multi-word heads and empties, and dedupes", () => {
    const forms = candidateForms(card({ dutch: "tot ziens", lemma: "tot ziens" }));
    expect(forms).toEqual([]);
    const deduped = candidateForms(card({ dutch: "kat", lemma: "kat" }));
    expect(deduped).toEqual(["kat"]);
  });
});

describe("dutchCloze", () => {
  const enr = (nls: string[], grammar?: Enrichment["grammar"]): Enrichment => ({
    id: "c1",
    match: { source: "kaikki" },
    grammar,
    examples: nls.map((nl) => ({ nl, source: "kaikki" as const })),
  });

  it("returns the first blankable Dutch example", () => {
    const result = dutchCloze(
      card({ dutch: "de kat", lemma: "kat" }),
      enr(["Duitsland grenst aan Nederland.", "De kat slaapt."]),
    );
    expect(result).toBe(`De ${BLANK} slaapt.`);
  });

  it("uses enrichment grammar forms to blank an inflected example", () => {
    const result = dutchCloze(
      card({ dutch: "lopen", lemma: "lopen" }),
      enr(["De man liep rustig door het park."], { verb: { pastSg: "liep" } }),
    );
    expect(result).toBe(`De man ${BLANK} rustig door het park.`);
  });

  it("falls back to card.exampleNl when no enrichment example works", () => {
    const result = dutchCloze(
      card({ dutch: "kat", lemma: "kat", exampleNl: "Een kat op de mat." }),
      enr(["Iets heel anders."]),
    );
    expect(result).toBe(`Een ${BLANK} op de mat.`);
  });

  it("returns null when the word can't be located in any example", () => {
    expect(
      dutchCloze(card({ dutch: "kat", lemma: "kat" }), enr(["Iets heel anders."])),
    ).toBeNull();
  });

  it("returns null when there are no forms to blank (multi-word head)", () => {
    expect(
      dutchCloze(card({ dutch: "tot ziens" }), enr(["Tot ziens, allemaal!"])),
    ).toBeNull();
  });
});
