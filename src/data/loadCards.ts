import type { Card } from "../types";

export async function loadCards(): Promise<Card[]> {
  const url = `${import.meta.env.BASE_URL}cards.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load cards: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Card[];
  if (!Array.isArray(data)) {
    throw new Error("Invalid cards.json: expected an array.");
  }
  return data;
}

export interface CardIndex {
  byId: Map<string, Card>;
  groups: string[];
  byGroup: Map<string, Card[]>;
}

export function indexCards(cards: Card[]): CardIndex {
  const byId = new Map<string, Card>();
  const groups: string[] = [];
  const byGroup = new Map<string, Card[]>();

  for (const card of cards) {
    byId.set(card.id, card);
    let bucket = byGroup.get(card.group);
    if (!bucket) {
      bucket = [];
      byGroup.set(card.group, bucket);
      groups.push(card.group);
    }
    bucket.push(card);
  }

  return { byId, groups, byGroup };
}
