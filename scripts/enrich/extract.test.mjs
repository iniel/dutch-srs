import { describe, it, expect } from "vitest";
import {
  stripArticle, normalizeHead, mapPos, pickEntry, entryMatchesCard,
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

const MAN = {
  word: "man", pos: "noun",
  forms: [
    { form: "mannen", tags: ["plural"] },
    { form: "mannetje", tags: ["diminutive", "neuter"] },
    { form: "manneke", tags: ["diminutive", "neuter"] },
  ],
  senses: [
    { glosses: ["man (adult male human)"], tags: ["masculine"] },
    { glosses: ["husband"], tags: ["masculine"] },
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

const BORD = {
  word: "bord", pos: "noun",
  senses: [
    { glosses: ["plate, dish (tableware)"], tags: ["neuter"] },
    { glosses: ["board, blackboard, sign"], tags: ["neuter"] },
  ],
};

const EEN = {
  word: "een", pos: "num",
  senses: [
    { glosses: ["alternative form of één"] },
    { glosses: ["one (the cardinal number)"] },
  ],
};

const MAIL = {
  word: "mail", pos: "noun",
  senses: [{ glosses: ["alternative form of e-mail"] }],
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
    expect(pickEntry(cands, { pos: "n." })).toMatchObject({ matchedBy: "lemma+pos", entry: { pos: "noun" } });
  });
  it("falls back to first when no POS match", () => {
    const cands = [{ pos: "verb" }];
    expect(pickEntry(cands, { pos: "n." })).toMatchObject({ matchedBy: "lemma" });
  });
  it("reports none for empty", () => {
    expect(pickEntry([], { pos: "n." })).toMatchObject({ matchedBy: "none" });
  });
  it("prefers a meaning match over a (mis)mapped POS — meer: lake vs more", () => {
    const cands = [
      { pos: "noun", senses: [{ glosses: ["lake", "sea"] }] },
      { pos: "det", senses: [{ glosses: ["comparative degree of veel: more"] }] },
    ];
    expect(pickEntry(cands, { pos: "adj.", english: ["more"] })).toMatchObject({
      matchedBy: "meaning", entry: { pos: "det" },
    });
  });
  it("disambiguates same-POS homographs by meaning — klinker: brick vs vowel", () => {
    const cands = [
      { pos: "noun", senses: [{ glosses: ["clinker brick"] }] },
      { pos: "noun", senses: [{ glosses: ["vowel", "vowel letter"] }] },
    ];
    const r = pickEntry(cands, { pos: "n.", english: ["vowel"] });
    expect(r.matchedBy).toBe("lemma+pos");
    expect(r.entry.senses[0].glosses).toContain("vowel");
  });
  it("keeps POS pick when no candidate matches meaning", () => {
    const cands = [
      { pos: "noun", senses: [{ glosses: ["lake"] }] },
      { pos: "verb", senses: [{ glosses: ["to wander"] }] },
    ];
    expect(pickEntry(cands, { pos: "n.", english: ["pond"] })).toMatchObject({
      matchedBy: "lemma+pos", entry: { pos: "noun" },
    });
  });
});

describe("entryMatchesCard", () => {
  it("always accepts word cards, even a sub-word entry", () => {
    expect(entryMatchesCard({ word: "meer" }, { type: "word", dutch: "het meer" })).toBe(true);
  });
  it("accepts single-word phrase cards", () => {
    expect(entryMatchesCard({ word: "hallo" }, { type: "phrase", dutch: "hallo" })).toBe(true);
  });
  it("rejects a sub-word entry on a multi-word phrase", () => {
    expect(entryMatchesCard({ word: "meer" }, { type: "phrase", dutch: "niet/geen ... meer" })).toBe(false);
  });
  it("accepts a whole-phrase headword on a multi-word phrase", () => {
    expect(entryMatchesCard({ word: "tot ziens" }, { type: "phrase", dutch: "tot ziens" })).toBe(true);
  });
  it("rejects a missing entry", () => {
    expect(entryMatchesCard(undefined, { type: "phrase", dutch: "tot ziens" })).toBe(false);
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
  it("ignores diminutive-form neuter when deriving gender (no bogus de/het)", () => {
    const m = extractKaikki(MAN);
    expect(m.grammar.noun.article).toBe("de");
    expect(m.grammar.noun.gender).toEqual(["masculine"]);
    expect(m.grammar.noun.diminutive).toBe("mannetje");
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

describe("extractKaikki — sense ordering + glossSummary", () => {
  it("reorders senses so the card's meaning comes first", () => {
    const e = extractKaikki(BORD, { english: ["blackboard"] });
    expect(e.senses[0].glosses.join(" ")).toContain("board");
    expect(e.glossSummary).toBe(e.senses[0].glosses[0]);
  });
  it("keeps Kaikki order when no card meaning is given", () => {
    const e = extractKaikki(BORD);
    expect(e.senses[0].glosses[0]).toContain("plate");
  });
  it("skips a cross-reference gloss for the summary when a real one exists", () => {
    const e = extractKaikki(EEN);
    expect(e.glossSummary).toBe("one (the cardinal number)");
  });
  it("falls back to the cross-reference gloss when it is the only sense", () => {
    const e = extractKaikki(MAIL);
    expect(e.glossSummary).toBe("alternative form of e-mail");
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
