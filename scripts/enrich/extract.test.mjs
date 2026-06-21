import { describe, it, expect } from "vitest";
import {
  stripArticle, normalizeHead, mapPos, pickEntry,
  extractKaikki, dedupeExamples,
} from "./extract.mjs";

const KIND = {
  word: "kind", pos: "noun",
  sounds: [
    { ipa: "/kɪnt/" },
    { audio: "Nl-kind.ogg", ogg_url: "https://up/Nl-kind.ogg", mp3_url: "https://up/Nl-kind.ogg.mp3" },
    { rhymes: "-ɪnt" },
  ],
  hyphenations: [{ parts: ["kind"] }],
  forms: [
    { form: "kinderen", tags: ["plural"] },
    { form: "kindje", tags: ["diminutive", "neuter"] },
  ],
  etymology_text: "From Middle Dutch kint.",
  senses: [
    {
      glosses: ["child, kid, non-adult human"],
      tags: ["neuter"],
      synonyms: [{ word: "koter" }, { word: "wicht" }],
      examples: [{ text: "Hij heeft als kind leren schaatsen.", english: "He learned to skate as a child." }],
    },
    { glosses: ["plural of kind"], form_of: [{ word: "kind" }] },
  ],
};

const LOPEN = {
  word: "lopen", pos: "verb",
  forms: [
    { form: "weak", source: "conjugation", tags: ["table-tags"] },
    { form: "lopen", tags: ["infinitive"], source: "conjugation" },
    { form: "loop", tags: ["first-person", "present", "singular"], source: "conjugation" },
    { form: "liep", tags: ["first-person", "past", "singular"], source: "conjugation" },
    { form: "liepen", tags: ["past", "plural"], source: "conjugation" },
    { form: "lopend", tags: ["participle", "present"], source: "conjugation" },
    { form: "gelopen", tags: ["participle", "past"], source: "conjugation" },
  ],
  senses: [{ glosses: ["to walk"] }],
};

const GROOT = {
  word: "groot", pos: "adj",
  forms: [
    { form: "groter", tags: ["comparative"] },
    { form: "grootst", tags: ["superlative"] },
    { form: "grote", tags: ["feminine", "indefinite", "masculine", "positive", "singular"] },
  ],
  senses: [{ glosses: ["big, large"] }],
};

describe("stripArticle / normalizeHead", () => {
  it("strips leading articles", () => {
    expect(stripArticle("het jaar")).toBe("jaar");
    expect(stripArticle("de man")).toBe("man");
    expect(stripArticle("'t kind")).toBe("kind");
    expect(stripArticle("getrouwd")).toBe("getrouwd");
  });
  it("normalizes case + spacing", () => {
    expect(normalizeHead("  De  Man ")).toBe("man");
  });
});

describe("mapPos", () => {
  it("maps deck POS to Kaikki POS", () => {
    expect(mapPos("n.")).toBe("noun");
    expect(mapPos("v.")).toBe("verb");
    expect(mapPos("adj.")).toBe("adj");
    expect(mapPos("phrase")).toBe("phrase");
    expect(mapPos("")).toBeUndefined();
  });
});

describe("pickEntry", () => {
  it("prefers POS-matching homograph", () => {
    const cands = [{ pos: "verb" }, { pos: "noun" }];
    expect(pickEntry(cands, "n.")).toMatchObject({ matchedBy: "lemma+pos", entry: { pos: "noun" } });
  });
  it("falls back to first when no POS match", () => {
    const cands = [{ pos: "verb" }];
    expect(pickEntry(cands, "n.")).toMatchObject({ matchedBy: "lemma" });
  });
  it("reports none for empty", () => {
    expect(pickEntry([], "n.")).toMatchObject({ matchedBy: "none" });
  });
});

describe("extractKaikki — noun", () => {
  const e = extractKaikki(KIND);
  it("pulls phonetics", () => {
    expect(e.ipa).toBe("/kɪnt/");
    expect(e.audioUrl).toBe("https://up/Nl-kind.ogg.mp3");
    expect(e.syllables).toBe("kind");
  });
  it("derives article + forms", () => {
    expect(e.grammar.noun).toMatchObject({ article: "het", plural: "kinderen", diminutive: "kindje" });
  });
  it("keeps real senses, drops form-of, sets summary", () => {
    expect(e.senses).toHaveLength(1);
    expect(e.glossSummary).toBe("child, kid, non-adult human");
  });
  it("collects sense-level synonyms", () => {
    expect(e.synonyms).toEqual(["koter", "wicht"]);
  });
  it("keeps etymology + example", () => {
    expect(e.etymology).toContain("Middle Dutch");
    expect(e.senses[0].examples[0]).toMatchObject({ nl: expect.stringContaining("schaatsen"), source: "kaikki" });
  });
});

describe("extractKaikki — verb principal parts", () => {
  const e = extractKaikki(LOPEN);
  it("extracts principal parts, ignores noise", () => {
    expect(e.grammar.verb).toMatchObject({
      presentSg: "loop", pastSg: "liep", pastPl: "liepen", pastParticiple: "gelopen",
    });
  });
});

describe("extractKaikki — adjective degrees", () => {
  const e = extractKaikki(GROOT);
  it("extracts comparative + superlative only", () => {
    expect(e.grammar.adjective).toEqual({ comparative: "groter", superlative: "grootst" });
  });
});

describe("dedupeExamples", () => {
  it("dedupes by normalized nl, prefers kaikki + ru, caps", () => {
    const out = dedupeExamples([
      { nl: "Hallo wereld.", source: "tatoeba" },
      { nl: "hallo wereld", source: "kaikki" },
      { nl: "Tot ziens.", source: "tatoeba", ru: "Пока." },
      { nl: "Goedemorgen.", source: "tatoeba" },
    ], 2);
    expect(out).toHaveLength(2);
    expect(out[0].source).toBe("kaikki");
    expect(out.map((e) => e.nl)).not.toContain("Hallo wereld.");
  });
});
