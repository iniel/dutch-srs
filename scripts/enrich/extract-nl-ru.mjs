// Pure extractor for the nlwiktionary (Dutch Wiktionary) edition. Dutch words
// appear as entries with lang_code "nl"; their "Vertalingen" tables include
// Russian translations under translations[] with lang_code "ru". We only read
// those Russian words (the Dutch glosses of this edition are irrelevant here).
// No I/O — unit-tested in extract-nl-ru.test.mjs.

const MAX_GLOSSES = 4;

export function extractNlRuTranslations(entry, { maxGlosses = MAX_GLOSSES } = {}) {
  const out = [];
  const seen = new Set();
  for (const t of entry?.translations ?? []) {
    if ((t.lang_code ?? t.code) !== "ru") continue;
    const word = (t.word ?? "").trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length >= maxGlosses) break;
  }
  return out;
}
