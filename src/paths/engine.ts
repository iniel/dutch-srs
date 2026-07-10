import type { ReviewState } from "../types";
import { GURU_MIN_STAGE, LEVEL_PASS_THRESHOLD } from "../srs/levels";
import type { LearningPath, PathUnit } from "./types";

type States = Record<string, ReviewState>;

export interface UnitProgress {
  total: number;
  gurued: number;
  pct: number;
  passed: boolean;
}

function isGuru(state: ReviewState | undefined): boolean {
  return !!state && state.stage >= GURU_MIN_STAGE;
}

function isNew(state: ReviewState | undefined): boolean {
  return !state || state.stage === 0;
}

export function unitProgress(cardIds: string[], states: States): UnitProgress {
  let gurued = 0;
  for (const id of cardIds) if (isGuru(states[id])) gurued++;
  const total = cardIds.length;
  const pct = total === 0 ? 0 : gurued / total;
  return { total, gurued, pct, passed: total === 0 || pct >= LEVEL_PASS_THRESHOLD };
}

/** First unit not yet passed; the last unit when every unit passes. */
export function currentUnitIndex(path: LearningPath, states: States): number {
  for (let i = 0; i < path.units.length; i++) {
    if (!unitProgress(path.units[i].cardIds, states).passed) return i;
  }
  return Math.max(0, path.units.length - 1);
}

/** Units unlocked for study: everything up to and including the current unit. */
export function unlockedUnits(path: LearningPath, states: States, unlockAll: boolean): PathUnit[] {
  if (unlockAll) return path.units;
  return path.units.slice(0, currentUnitIndex(path, states) + 1);
}

/** Ordered, deduped stage-0 card ids inside the path's unlocked units. */
export function availableLessonIds(path: LearningPath, states: States, unlockAll: boolean): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const unit of unlockedUnits(path, states, unlockAll)) {
    for (const id of unit.cardIds) {
      if (seen.has(id) || !isNew(states[id])) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** All distinct card ids in a path, in unit order. */
export function pathCardIds(path: LearningPath): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const unit of path.units) {
    for (const id of unit.cardIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Guru fraction across all of a path's cards (for the dashboard ring). */
export function pathRingPct(path: LearningPath, states: States): number {
  const ids = pathCardIds(path);
  if (ids.length === 0) return 0;
  let gurued = 0;
  for (const id of ids) if (isGuru(states[id])) gurued++;
  return gurued / ids.length;
}

/** Words still needed to pass (and thus unlock past) the current unit. */
export function wordsToUnlockNext(path: LearningPath, states: States): number {
  const unit = path.units[currentUnitIndex(path, states)];
  if (!unit) return 0;
  const p = unitProgress(unit.cardIds, states);
  return Math.max(0, Math.ceil(p.total * LEVEL_PASS_THRESHOLD) - p.gurued);
}
