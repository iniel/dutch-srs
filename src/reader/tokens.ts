import type { ReaderToken } from "./types";
import type { CardIndex } from "../data/cards";

export function tokenSpace(t: ReaderToken): string {
  return t.sp ?? " ";
}

export function tokenLemma(t: ReaderToken): string {
  return t.lemma ?? t.w.toLowerCase();
}

export function isWordToken(t: ReaderToken): boolean {
  return t.status !== undefined;
}

/** The token's card ids that exist in the loaded deck, in exported order. */
export function tokenCardIds(t: ReaderToken, index: Pick<CardIndex, "byId">): string[] {
  return (t.cards ?? []).filter((id) => index.byId.has(id));
}

/** The query the sheet's search starts with: the lemma, unless it is a compound split. */
export function tokenSearchQuery(t: ReaderToken): string {
  const lemma = tokenLemma(t);
  return lemma.includes("+") ? t.w.toLowerCase() : lemma;
}

const MIN_PREFIX = 4;

/**
 * First query that finds something: lemma, surface form, then ever shorter prefixes of
 * both (a wrong lemma like "glimen" for "glimt" still reaches "glim" -> glimmen).
 * Falls back to the plain lemma query when nothing matches.
 */
export function smartSearchQuery(t: ReaderToken, hasResults: (q: string) => boolean): string {
  const base = tokenSearchQuery(t);
  const surface = t.w.toLowerCase();
  const tried = new Set<string>();
  for (const q of [base, surface]) {
    if (!tried.has(q) && hasResults(q)) return q;
    tried.add(q);
  }
  const shortest = Math.min(base.length, surface.length);
  for (let len = shortest - 1; len >= MIN_PREFIX; len--) {
    for (const q of [surface.slice(0, len), base.slice(0, len)]) {
      if (!tried.has(q) && hasResults(q)) return q;
      tried.add(q);
    }
  }
  return base;
}
