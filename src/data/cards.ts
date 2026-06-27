import { useEffect, useState } from "react";
import type { Card } from "../types";
import { loadCards, indexCards } from "./loadCards";

import type { AnswerPools } from "../review/synonyms";

export interface CardIndex {
  cards: Card[];
  byId: Map<string, Card>;
  groups: string[];
  byGroup: Map<string, Card[]>;
  pools: AnswerPools;
}

export function useCards(): { index: CardIndex | null; error: string | null } {
  const [index, setIndex] = useState<CardIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards()
      .then((cards) => setIndex({ cards, ...indexCards(cards) }))
      .catch((e) => setError(String(e)));
  }, []);

  return { index, error };
}
