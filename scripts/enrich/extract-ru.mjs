// Pure extractor for the ruwiktionary (Russian Wiktionary) edition. Dutch words
// appear as entries with lang_code "nl" and Russian-language senses[].glosses.
// We only want the glosses (the NL->RU meaning) for display in glossRu; the rest
// of the enrichment (grammar, IPA, examples) still comes from the Dutch edition.
// No I/O — unit-tested with fixtures in extract-ru.test.mjs.

const MAX_GLOSSES = 4;

// Inflection senses read like "форма ... глагола planten" — a reference to
// another lemma, not a meaning. Real glosses never start with "форма".
const isInflectionGloss = (g) => /^форма\s/i.test(g);

export function extractRuGlosses(entry, { maxGlosses = MAX_GLOSSES } = {}) {
  const out = [];
  const seen = new Set();
  for (const sense of entry?.senses ?? []) {
    for (const raw of sense.glosses ?? []) {
      const gloss = (raw ?? "").trim();
      if (!gloss || isInflectionGloss(gloss)) continue;
      if (seen.has(gloss)) continue;
      seen.add(gloss);
      out.push(gloss);
      if (out.length >= maxGlosses) return out;
    }
  }
  return out;
}
