import {
  normalize,
  levenshtein,
  distanceTolerance,
  checkAnswer,
  articleVariants,
  acceptedForDirection,
  acceptedAnswers,
} from "./answerCheck";

describe("normalize", () => {
  it("trims, lowercases, collapses whitespace", () => {
    expect(normalize("  Hello   World  ")).toBe("hello world");
  });

  it("strips punctuation and re-collapses", () => {
    expect(normalize("to eat, (quickly)!")).toBe("to eat quickly");
    expect(normalize("don't")).toBe("dont");
  });

  it("preserves accented letters", () => {
    expect(normalize("Eén café")).toBe("eén café");
    expect(normalize("naïef")).toBe("naïef");
  });
});

describe("levenshtein", () => {
  it("is zero for equal strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("counts single edits", () => {
    expect(levenshtein("kitten", "sitten")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("distanceTolerance", () => {
  it.each([
    [0, 0],
    [3, 0],
    [4, 1],
    [5, 1],
    [6, 2],
    [7, 2],
    [8, 2],
    [14, 3],
    [21, 4],
  ])("len %i -> %i", (len, tol) => {
    expect(distanceTolerance(len)).toBe(tol);
  });
});

describe("checkAnswer", () => {
  it("matches exactly against any accepted answer", () => {
    expect(checkAnswer("to eat", ["to drink", "to eat"])).toEqual({
      correct: true,
      imprecise: false,
    });
  });

  it("ignores case, whitespace, punctuation", () => {
    expect(checkAnswer("  To Eat! ", ["to eat"]).correct).toBe(true);
  });

  it("accepts a typo within tolerance as imprecise", () => {
    expect(checkAnswer("hapiness", ["happiness"])).toEqual({
      correct: true,
      imprecise: true,
    });
  });

  it("rejects a typo over tolerance", () => {
    expect(checkAnswer("xyz", ["cat"])).toEqual({
      correct: false,
      imprecise: false,
    });
  });

  it("does not fuzzy-match very short words", () => {
    expect(checkAnswer("cot", ["cat"]).correct).toBe(false);
  });

  it("rejects empty input", () => {
    expect(checkAnswer("   ", ["cat"]).correct).toBe(false);
  });

  it("rejects a typo when fuzzy disabled, still accepts exact", () => {
    expect(checkAnswer("hapiness", ["happiness"], false).correct).toBe(false);
    expect(checkAnswer("happiness", ["happiness"], false)).toEqual({
      correct: true,
      imprecise: false,
    });
  });
});

describe("articleVariants", () => {
  it("returns word with and without leading article", () => {
    expect(articleVariants("de hond")).toEqual(["de hond", "hond"]);
    expect(articleVariants("het huis")).toEqual(["het huis", "huis"]);
    expect(articleVariants("een appel")).toEqual(["een appel", "appel"]);
  });

  it("returns single variant when no article", () => {
    expect(articleVariants("lopen")).toEqual(["lopen"]);
  });
});

describe("acceptedForDirection", () => {
  const card = { dutch: "de hond", english: ["dog", "the dog"] };

  it("returns english for nl_en", () => {
    expect(acceptedForDirection(card, "nl_en")).toEqual(["dog", "the dog"]);
  });

  it("returns article variants for en_nl", () => {
    expect(acceptedForDirection(card, "en_nl")).toEqual(["de hond", "hond"]);
  });

  it("checkAnswer accepts article-stripped dutch in en_nl", () => {
    const accepted = acceptedForDirection(card, "en_nl");
    expect(checkAnswer("hond", accepted).correct).toBe(true);
    expect(checkAnswer("de hond", accepted).correct).toBe(true);
  });
});

describe("acceptedAnswers", () => {
  it("NL->EN: includes the card's own glosses, no cross-card synonyms", () => {
    const accepted = acceptedAnswers({ dutch: "leuk", english: ["nice"] }, "nl_en");
    expect(accepted).toEqual(["nice"]);
  });

  it("EN->NL: only the card's own Dutch (with article variants)", () => {
    const accepted = acceptedAnswers({ dutch: "de hond", english: ["dog"] }, "en_nl");
    expect(accepted).toEqual(["de hond", "hond"]);
  });

  it("NL->EN: also accepts the bare answer for a parenthetical gloss", () => {
    const accepted = acceptedAnswers({ dutch: "de neef", english: ["cousin (male)"] }, "nl_en");
    expect(accepted).toContain("cousin (male)");
    expect(accepted).toContain("cousin");
  });

  it("NL->EN: strips trailing placeholder words (someone/something)", () => {
    const accepted = acceptedAnswers({ dutch: "roepen", english: ["to call somebody"] }, "nl_en");
    expect(accepted).toContain("to call");
  });
});
