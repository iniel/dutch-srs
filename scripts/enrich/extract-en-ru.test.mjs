import { describe, it, expect } from "vitest";
import { stripStress, normalizeEng, englishKeys, extractEnRuTranslations } from "./extract-en-ru.mjs";

describe("stripStress", () => {
  it("removes combining acute stress, keeps ё", () => {
    expect(stripStress("мужчи\u0301на")).toBe("мужчина");
    expect(stripStress("ле\u0301то")).toBe("лето");
    expect(stripStress("ёж")).toBe("ёж");
  });
});

describe("normalizeEng", () => {
  it("lowercases and strips a leading article / to", () => {
    expect(normalizeEng("to talk")).toBe("talk");
    expect(normalizeEng("A Year")).toBe("year");
    expect(normalizeEng("the man")).toBe("man");
    expect(normalizeEng("to live in")).toBe("live in");
  });
});

describe("englishKeys", () => {
  it("uses full normalized english answers only (no first-word fallback)", () => {
    expect(englishKeys({ english: ["to live in"] })).toEqual(["live in"]);
    expect(englishKeys({ english: ["man"] })).toEqual(["man"]);
    expect(englishKeys({ english: ["to talk", "to speak"] })).toEqual(["talk", "speak"]);
  });
});

describe("extractEnRuTranslations", () => {
  const MAN = {
    word: "man",
    translations: [
      { code: "ru", word: "мужчи\u0301на" },
      { code: "ru", word: "муж" },
      { lang_code: "ru", word: "мужи\u0301к" },
      { code: "de", word: "Mann" },
      { code: "ru", word: "челове\u0301к" },
      { code: "ru", word: "ба́тя" },
    ],
  };
  it("takes ru translations, strips stress, dedupes, caps", () => {
    expect(extractEnRuTranslations(MAN)).toEqual(["мужчина", "муж", "мужик", "человек"]);
  });
  it("skips capitalized proper nouns", () => {
    const BROWN = { translations: [{ code: "ru", word: "коричневый" }, { code: "ru", word: "Браун" }] };
    expect(extractEnRuTranslations(BROWN)).toEqual(["коричневый"]);
  });
  it("returns [] when no ru translations", () => {
    expect(extractEnRuTranslations({ translations: [{ code: "fr", word: "x" }] })).toEqual([]);
    expect(extractEnRuTranslations({})).toEqual([]);
  });
});
