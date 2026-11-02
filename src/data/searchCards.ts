import type { Card, Grammar } from "../types";
import { normalize } from "../review/answerCheck";

export const MAX_RESULTS = 50;

export interface SearchMatch {
  card: Card;
  form?: string;
}

export type FormsOf = (card: Card) => string[];

// jij/hij present forms the "+t" rule gets wrong or misses (kan → "kant", ben → only "bent").
const IRREGULAR_PRESENT: Record<string, string[]> = {
  zijn: ["is", "bent"],
  hebben: ["heeft", "hebt"],
  kunnen: ["kunt"],
  zullen: ["zult"],
  mogen: [],
  willen: ["wilt"],
};

const ARTICLE_RE = /^(de|het|een|'t)\s+/;

function headword(card: Card): string {
  return normalize(card.lemma ?? card.dutch.replace(ARTICLE_RE, ""));
}

function presentThirdPerson(lemma: string, presentSg: string | undefined): string[] {
  if (lemma in IRREGULAR_PRESENT) return IRREGULAR_PRESENT[lemma];
  if (!presentSg || presentSg.includes(" ") || presentSg.endsWith("t")) return [];
  return [presentSg + "t"];
}

export function searchForms(card: Card, grammar: Grammar | undefined): string[] {
  const lemma = headword(card);
  const { verb, noun, adjective } = grammar ?? {};
  const raw = [
    verb?.presentSg, verb?.pastSg, verb?.pastPl, verb?.pastParticiple,
    noun?.plural, noun?.diminutive,
    adjective?.comparative, adjective?.superlative,
  ].map((f) => (f ? normalize(f) : ""));
  if (verb) raw.push(...presentThirdPerson(lemma, raw[0]));

  const own = new Set([lemma, normalize(card.dutch)]);
  return [...new Set(raw)].filter((f) => f && !own.has(f));
}

export function buildSearchForms(cards: Card[], grammarOf: (cardId: string) => Grammar | undefined): FormsOf {
  const byId = new Map<string, string[]>();
  for (const card of cards) {
    const forms = searchForms(card, grammarOf(card.id));
    if (forms.length) byId.set(card.id, forms);
  }
  return (card) => byId.get(card.id) ?? [];
}

const EXACT = 0;
const FORM_EXACT = 1;
const PREFIX = 2;
const FORM_PREFIX = 3;
const SUBSTRING = 4;

function rankCard(card: Card, query: string, forms: string[]): { rank: number; form?: string } {
  const fields = [normalize(card.dutch), ...card.english.map(normalize)];
  if (card.lemma) fields.push(normalize(card.lemma));

  let rank = Infinity;
  for (const f of fields) {
    if (f === query) return { rank: EXACT };
    if (f.startsWith(query)) rank = Math.min(rank, PREFIX);
    else if (f.includes(query)) rank = Math.min(rank, SUBSTRING);
  }

  let best: { rank: number; form?: string } = { rank };
  for (const form of forms) {
    if (form === query) return { rank: FORM_EXACT, form };
    if (form.startsWith(query) && FORM_PREFIX < best.rank) best = { rank: FORM_PREFIX, form };
  }
  return best;
}

/** Exact, then prefix, then substring matches over Dutch, English and lemma; inflected forms rank just below each headword tier. */
export function searchCards(cards: Card[], raw: string, max = MAX_RESULTS, formsOf?: FormsOf): SearchMatch[] {
  const query = normalize(raw);
  if (!query) return [];
  const scored: { match: SearchMatch; rank: number }[] = [];
  for (const card of cards) {
    const { rank, form } = rankCard(card, query, formsOf?.(card) ?? []);
    if (rank < Infinity) scored.push({ match: form ? { card, form } : { card }, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.match.card.dutch.localeCompare(b.match.card.dutch));
  return scored.slice(0, max).map((s) => s.match);
}
