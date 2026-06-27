import { describe, it, expect } from "vitest";
import { extractRuGlosses } from "./extract-ru.mjs";

// Real-shaped entries from the ruwiktionary edition (lang_code "nl").
const ARROGANT = {
  word: "arrogant", pos: "adj", lang_code: "nl",
  senses: [{ glosses: ["высокомерный, надменный, заносчивый; самонадеянный"] }],
};
const GO = {
  word: "go", pos: "noun", lang_code: "nl",
  senses: [{ glosses: ["го (настольная игра)"] }],
};
const MAN = {
  word: "man", pos: "noun", lang_code: "nl",
  senses: [{ glosses: ["человек"] }, { glosses: ["мужчина"] }, { glosses: ["муж"] }],
};
const PLANT = {
  word: "plant", pos: "noun", lang_code: "nl",
  senses: [
    { glosses: ["растение"] },
    { glosses: ["форма настоящего времени ... глагола planten"], form_of: [{ word: "planten" }] },
    { glosses: ["форма единственного числа повелительного наклонения глагола planten"] },
  ],
};

describe("extractRuGlosses", () => {
  it("returns the single gloss intact, parentheticals kept", () => {
    expect(extractRuGlosses(GO)).toEqual(["го (настольная игра)"]);
    expect(extractRuGlosses(ARROGANT)).toEqual(["высокомерный, надменный, заносчивый; самонадеянный"]);
  });

  it("collects multiple sense glosses in order", () => {
    expect(extractRuGlosses(MAN)).toEqual(["человек", "мужчина", "муж"]);
  });

  it("drops inflection (форма … от) glosses but keeps the real meaning", () => {
    expect(extractRuGlosses(PLANT)).toEqual(["растение"]);
  });

  it("dedupes and caps", () => {
    const dup = { senses: [{ glosses: ["а"] }, { glosses: ["а"] }, { glosses: ["б"] }] };
    expect(extractRuGlosses(dup)).toEqual(["а", "б"]);
    const many = { senses: [1, 2, 3, 4, 5, 6].map((n) => ({ glosses: [`g${n}`] })) };
    expect(extractRuGlosses(many)).toHaveLength(4);
  });

  it("returns [] for no usable glosses", () => {
    expect(extractRuGlosses({})).toEqual([]);
    expect(extractRuGlosses({ senses: [{ glosses: ["форма прошедшего времени глагола bidden"] }] })).toEqual([]);
    expect(extractRuGlosses({ senses: [{ glosses: ["   "] }] })).toEqual([]);
  });
});
