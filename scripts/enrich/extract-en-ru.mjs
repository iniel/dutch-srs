// Pure helpers for chaining a card's English meaning to Russian via the English
// Wiktionary edition (kaikki English dictionary). English word pages carry dense
// translation tables; since each card's `english` is its curated meaning, the
// EN->RU translation is a valid Russian gloss for that card. Display-only.
// No I/O — unit-tested in extract-en-ru.test.mjs.

const MAX_GLOSSES = 4;
const ARTICLES = ["to ", "a ", "an ", "the "];

// Wiktionary marks stress with a combining acute (U+0301); strip it (and the
// rare combining grave) so glosses match the unaccented ru/nl sources. Leaves
// precomposed letters like "ё" untouched.
export function stripStress(s) {
  return (s ?? "").replace(/[\u0300\u0301]/g, "");
}

export function normalizeEng(s) {
  let v = (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  for (const a of ARTICLES) if (v.startsWith(a)) { v = v.slice(a.length).trim(); break; }
  return v;
}

// Lookup keys for a card: the full normalized english answers only. We do NOT
// fall back to the first word of a phrase — that maps function-word-led phrases
// to the wrong sense ("to be called" -> "be", "at home" -> "at"), which yields
// misleading Russian. A phrase only contributes if en.wiktionary has that exact
// entry (e.g. "at home" -> "дома").
export function englishKeys(card) {
  const keys = [];
  for (const e of card.english ?? []) {
    const k = normalizeEng(e);
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

// Proper nouns (capitalized) leak in via senses like brown -> "Браун",
// nice -> "Ницца"; skip them. Shared with the FreeDict parser.
export const isProperNoun = (w) => /^\p{Lu}/u.test(w);

export function extractEnRuTranslations(entry, { maxGlosses = MAX_GLOSSES } = {}) {
  const out = [];
  const seen = new Set();
  for (const t of entry?.translations ?? []) {
    if ((t.code ?? t.lang_code) !== "ru") continue;
    const word = stripStress((t.word ?? "").trim()).trim();
    if (!word || isProperNoun(word) || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length >= maxGlosses) break;
  }
  return out;
}
