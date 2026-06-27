import type { Card, Direction } from "../types";
import { acceptedForDirection, articleVariants, normalize } from "./answerCheck";

/**
 * Cross-card answer pools so collisions are accepted in both directions:
 * - `byDutchKey`: article-stripped, normalized Dutch -> every English gloss any
 *   card with that surface form uses (NL->EN: same Dutch word, different senses).
 * - `byGlossKey`: normalized English gloss -> every Dutch answer (incl. article
 *   variants) any card with that gloss uses (EN->NL: synonyms for one meaning).
 *
 * Pure and display-agnostic: `Card.english` (and therefore the EN->NL prompt) is
 * never mutated; pooling only widens what `checkAnswer` will accept.
 */
export interface AnswerPools {
  byDutchKey: Map<string, string[]>;
  byGlossKey: Map<string, string[]>;
}

const ARTICLE_RE = /^(de|het|een|’t|'t)\s+/i;
const dutchKey = (dutch: string): string => normalize(dutch.replace(ARTICLE_RE, ""));
const glossKey = (gloss: string): string => normalize(gloss);

function pushUnique(map: Map<string, string[]>, key: string, values: string[]): void {
  if (!key) return;
  const list = map.get(key) ?? [];
  for (const v of values) if (!list.includes(v)) list.push(v);
  map.set(key, list);
}

export function buildAnswerPools(cards: Card[]): AnswerPools {
  const byDutchKey = new Map<string, string[]>();
  const byGlossKey = new Map<string, string[]>();

  for (const card of cards) {
    const dk = dutchKey(card.dutch);
    pushUnique(byDutchKey, dk, card.english);

    const dutchAnswers = articleVariants(card.dutch);
    for (const gloss of card.english) {
      pushUnique(byGlossKey, glossKey(gloss), dutchAnswers);
    }
  }

  return { byDutchKey, byGlossKey };
}

const PLACEHOLDER_RE = /\b(someone|something|somebody|oneself|one's|sb|sth)\b/gi;

// Extra forms accepted for an English answer that carries explanatory words the
// learner shouldn't have to type: "cousin (male)" -> "cousin", "to call
// somebody" -> "to call". The originals are kept too.
function englishVariants(glosses: string[]): string[] {
  const out = new Set<string>();
  for (const gloss of glosses) {
    out.add(gloss);
    const noParen = gloss.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (noParen) out.add(noParen);
    const noPlaceholder = gloss.replace(PLACEHOLDER_RE, " ").replace(/\s+/g, " ").trim();
    if (noPlaceholder) out.add(noPlaceholder);
  }
  return [...out];
}

export function pooledAccepted(card: Card, dir: Direction, pools: AnswerPools): string[] {
  const base = acceptedForDirection(card, dir);

  if (dir === "nl_en") {
    const siblings = pools.byDutchKey.get(dutchKey(card.dutch)) ?? [];
    return [...new Set(englishVariants([...base, ...siblings]))];
  }

  const siblings = card.english.flatMap((g) => pools.byGlossKey.get(glossKey(g)) ?? []);
  return [...new Set([...base, ...siblings])];
}
