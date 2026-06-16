import type { Card, ItemKey, ReviewState } from "../types";
import { itemKey, DIRECTIONS } from "../types";

export const LEVEL_PASS_THRESHOLD = 0.9;

const GURU_MIN_STAGE = 5;

export function levelOrder(cards: Card[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const card of cards) {
    if (!card.level || seen.has(card.level)) continue;
    seen.add(card.level);
    order.push(card.level);
  }
  return order;
}

export interface LevelProgress {
  level: string;
  total: number;
  gurued: number;
  pct: number;
  passed: boolean;
}

export function levelProgress(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  level: string,
): LevelProgress {
  let total = 0;
  let gurued = 0;
  for (const card of cards) {
    if (card.level !== level) continue;
    for (const dir of DIRECTIONS) {
      total++;
      const state = states[itemKey(card.id, dir)];
      if (state && state.stage >= GURU_MIN_STAGE) gurued++;
    }
  }
  const pct = total === 0 ? 0 : gurued / total;
  return { level, total, gurued, pct, passed: pct >= LEVEL_PASS_THRESHOLD };
}

export function currentLevel(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
): string {
  const order = levelOrder(cards);
  for (const level of order) {
    if (!levelProgress(cards, states, level).passed) return level;
  }
  return order[order.length - 1];
}

export function unlockedLevels(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  unlockAll: boolean,
): Set<string> {
  const order = levelOrder(cards);
  if (unlockAll) return new Set(order);
  const current = currentLevel(cards, states);
  const currentIdx = order.indexOf(current);
  return new Set(order.slice(0, currentIdx + 1));
}
