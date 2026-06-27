import { describe, it, expect } from "vitest";
import { extractNlRuTranslations } from "./extract-nl-ru.mjs";

// Real-shaped entries from the nlwiktionary edition (lang_code "nl"): Dutch
// words whose translation tables include Russian.
const JA = {
  word: "ja", lang_code: "nl",
  translations: [
    { lang_code: "ru", lang: "Russisch", word: "да", roman: "da" },
    { lang_code: "en", word: "yes" },
  ],
};
const WELKOM = {
  word: "welkom", lang_code: "nl",
  translations: [
    { lang_code: "ru", word: "приём", sense: "gewenst zijn" },
    { lang_code: "fr", word: "bienvenue" },
  ],
};
const MULTI = {
  word: "x", lang_code: "nl",
  translations: [
    { lang_code: "ru", word: "один" },
    { lang_code: "ru", word: "один" },
    { lang_code: "ru", word: "первый" },
    { code: "ru", word: "номер" },
    { lang_code: "ru", word: "5" },
    { lang_code: "ru", word: "6" },
  ],
};

describe("extractNlRuTranslations", () => {
  it("returns Russian translation words only", () => {
    expect(extractNlRuTranslations(JA)).toEqual(["да"]);
    expect(extractNlRuTranslations(WELKOM)).toEqual(["приём"]);
  });

  it("accepts both lang_code and code, dedupes, caps", () => {
    expect(extractNlRuTranslations(MULTI)).toEqual(["один", "первый", "номер", "5"]);
  });

  it("returns [] when there are no ru translations", () => {
    expect(extractNlRuTranslations({ translations: [{ lang_code: "en", word: "yes" }] })).toEqual([]);
    expect(extractNlRuTranslations({})).toEqual([]);
    expect(extractNlRuTranslations({ translations: [{ lang_code: "ru", word: "  " }] })).toEqual([]);
  });
});
