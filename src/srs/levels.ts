import type { Card, ReviewState } from "../types";

export const LEVEL_PASS_THRESHOLD = 0.9;

const GURU_MIN_STAGE = 5;

export type Cefr = "A1" | "A2" | "B1" | "B2";

function levelCefr(level?: string): Cefr | undefined {
  const m = /^(A1|A2|B1|B2)/.exec(level ?? "");
  return m ? (m[1] as Cefr) : undefined;
}

/** Badge text for a card's CEFR, or undefined when the level name already conveys it. */
export function cefrBadge(card: Card): string | undefined {
  const inLevel = levelCefr(card.level);
  const cefr = card.cefr ?? inLevel;
  if (!cefr || cefr === inLevel) return undefined;
  return `${cefr} CEFR`;
}

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
  states: Record<string, ReviewState>,
  level: string,
): LevelProgress {
  let total = 0;
  let gurued = 0;
  for (const card of cards) {
    if (card.level !== level) continue;
    total++;
    const state = states[card.id];
    if (state && state.stage >= GURU_MIN_STAGE) gurued++;
  }
  const pct = total === 0 ? 0 : gurued / total;
  return { level, total, gurued, pct, passed: pct >= LEVEL_PASS_THRESHOLD };
}

export function wordsToLevelUp(progress: LevelProgress): number {
  return Math.max(0, Math.ceil(progress.total * LEVEL_PASS_THRESHOLD) - progress.gurued);
}

export function currentLevel(
  cards: Card[],
  states: Record<string, ReviewState>,
): string {
  const order = levelOrder(cards);
  for (const level of order) {
    if (!levelProgress(cards, states, level).passed) return level;
  }
  return order[order.length - 1];
}

export function levelsWithProgress(
  cards: Card[],
  states: Record<string, ReviewState>,
): string[] {
  const started = new Set<string>();
  for (const card of cards) {
    if (!card.level) continue;
    const state = states[card.id];
    if (state && state.stage >= 1) started.add(card.level);
  }
  return levelOrder(cards).filter((level) => started.has(level));
}

export function unlockedLevels(
  cards: Card[],
  states: Record<string, ReviewState>,
  unlockAll: boolean,
): Set<string> {
  const order = levelOrder(cards);
  if (unlockAll) return new Set(order);
  const current = currentLevel(cards, states);
  const currentIdx = order.indexOf(current);
  return new Set(order.slice(0, currentIdx + 1));
}
