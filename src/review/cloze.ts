import type { Card, Enrichment } from "../types";

// The placeholder shown in place of a blanked word on EN→NL example hints.
export const BLANK = "____";

const ARTICLES = ["de ", "het ", "een ", "’t ", "'t "];

function stripArticle(dutch: string): string {
  const trimmed = (dutch ?? "").trim();
  const lower = trimmed.toLowerCase();
  for (const a of ARTICLES) {
    if (lower.startsWith(a)) return trimmed.slice(a.length).trim();
  }
  return trimmed;
}

// Lowercase + strip diacritics so "Eén" matches "een", "liep" matches "liep",
// etc. NFD splits accented letters into base + combining mark; drop the marks.
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Surface forms of a card's word that may appear in a Dutch example, all
 * article-stripped and single-word. Multi-word heads (phrases) are dropped —
 * the token-based blanker only handles single words, so those fall back to the
 * English example. Pure.
 */
export function candidateForms(card: Card, enrichment?: Enrichment): string[] {
  const raw: (string | undefined)[] = [stripArticle(card.dutch), card.lemma];

  const g = enrichment?.grammar;
  if (g?.verb) {
    raw.push(g.verb.presentSg, g.verb.pastSg, g.verb.pastPl, g.verb.pastParticiple);
  }
  if (g?.noun) {
    raw.push(g.noun.plural, g.noun.diminutive);
  }
  if (g?.adjective) {
    raw.push(g.adjective.comparative, g.adjective.superlative);
  }

  const seen = new Set<string>();
  const forms: string[] = [];
  for (const form of raw) {
    if (!form) continue;
    const trimmed = stripArticle(form);
    if (!trimmed || /\s/.test(trimmed)) continue;
    const key = fold(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    forms.push(trimmed);
  }
  return forms;
}

/**
 * Replace every whole-word occurrence of any `forms` entry in `nl` with `BLANK`,
 * matching case- and accent-insensitively. Returns null when nothing matched, so
 * junk/citation examples and sentences that don't contain the word are rejected
 * (and never leak the Dutch answer on EN→NL). Pure.
 */
export function blankExample(nl: string, forms: string[]): string | null {
  if (!nl || forms.length === 0) return null;
  const wanted = new Set(forms.map(fold));

  let matched = false;
  const out = nl.replace(/\p{L}+/gu, (token) => {
    if (wanted.has(fold(token))) {
      matched = true;
      return BLANK;
    }
    return token;
  });

  if (!matched) return null;
  // A one-word example that IS the answer blanks down to just "____" — no
  // context left, useless as a hint. Reject so the caller falls back to English.
  if (!/\p{L}/u.test(out.split(BLANK).join(""))) return null;
  return out;
}

/**
 * Build a Dutch example with the card's word blanked, for the EN→NL hint. Tries
 * each enrichment example (in its existing ranked order), then `card.exampleNl`,
 * returning the first that can be confidently blanked. Null when none work — the
 * caller then falls back to the English example. Pure.
 */
export function dutchCloze(card: Card, enrichment?: Enrichment): string | null {
  const forms = candidateForms(card, enrichment);
  if (forms.length === 0) return null;

  const candidates: string[] = [];
  for (const ex of enrichment?.examples ?? []) {
    if (ex.nl) candidates.push(ex.nl);
  }
  if (card.exampleNl) candidates.push(card.exampleNl);

  for (const nl of candidates) {
    const blanked = blankExample(nl, forms);
    if (blanked) return blanked;
  }
  return null;
}
