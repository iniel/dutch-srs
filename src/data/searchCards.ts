import type { Card } from "../types";
import { normalize } from "../review/answerCheck";

export const MAX_RESULTS = 50;

function rankCard(card: Card, query: string): number {
  const dutch = normalize(card.dutch);
  const fields = [dutch, ...card.english.map(normalize)];
  if (card.lemma) fields.push(normalize(card.lemma));

  let best = Infinity;
  for (const f of fields) {
    if (f === query) best = Math.min(best, 0);
    else if (f.startsWith(query)) best = Math.min(best, 1);
    else if (f.includes(query)) best = Math.min(best, 2);
  }
  return best;
}

/** Exact, then prefix, then substring matches over Dutch, English and lemma. */
export function searchCards(cards: Card[], raw: string, max = MAX_RESULTS): Card[] {
  const query = normalize(raw);
  if (!query) return [];
  const scored: { card: Card; rank: number }[] = [];
  for (const card of cards) {
    const rank = rankCard(card, query);
    if (rank < Infinity) scored.push({ card, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.card.dutch.localeCompare(b.card.dutch));
  return scored.slice(0, max).map((s) => s.card);
}
