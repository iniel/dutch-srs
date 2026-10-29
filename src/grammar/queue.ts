import type { ReviewState } from "../types";
import { itemKey } from "../types";
import type { ReviewTask } from "../review/session";
import { GURU_MIN_STAGE } from "../srs/levels";
import type { GrammarDrill } from "./types";

type States = Record<string, ReviewState>;

export interface DrillSummary {
  known: number;
  guru: number;
  ringPct: number;
  lessonsAvailable: number;
  reviewsDue: number;
}

function grammarTask(cardId: string): ReviewTask {
  return { key: itemKey(cardId, "nl_en"), cardId, dir: "nl_en" };
}

function knownInVocab(vocabStates: States, cardId: string): boolean {
  return (vocabStates[cardId]?.stage ?? 0) >= 1;
}

function isDue(state: ReviewState | undefined, now: number): state is ReviewState {
  return !!state && state.stage >= 1 && !state.burned && state.availableAt <= now;
}

export function grammarLessonIds(
  drill: GrammarDrill,
  grammarStates: States,
  vocabStates: States,
  limit: number,
): string[] {
  return drill.items
    .filter((item) => knownInVocab(vocabStates, item.cardId) && (grammarStates[item.cardId]?.stage ?? 0) === 0)
    .map((item, order) => ({ cardId: item.cardId, order, vocabStage: vocabStates[item.cardId].stage }))
    .sort((a, b) => b.vocabStage - a.vocabStage || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.cardId);
}

export function grammarReviewTasks(drill: GrammarDrill, grammarStates: States, now: number): ReviewTask[] {
  return drill.items
    .flatMap((item) => {
      const state = grammarStates[item.cardId];
      return isDue(state, now) ? [{ cardId: item.cardId, availableAt: state.availableAt }] : [];
    })
    .sort((a, b) => a.availableAt - b.availableAt)
    .map((entry) => grammarTask(entry.cardId));
}

export function grammarLessonTasks(cardIds: string[]): ReviewTask[] {
  return cardIds.map(grammarTask);
}

export function drillSummary(
  drill: GrammarDrill,
  grammarStates: States,
  vocabStates: States,
  now: number,
): DrillSummary {
  const knownItems = drill.items.filter((item) => knownInVocab(vocabStates, item.cardId));
  const guru = knownItems.filter((item) => (grammarStates[item.cardId]?.stage ?? 0) >= GURU_MIN_STAGE).length;
  return {
    known: knownItems.length,
    guru,
    ringPct: knownItems.length === 0 ? 0 : guru / knownItems.length,
    lessonsAvailable: grammarLessonIds(drill, grammarStates, vocabStates, Infinity).length,
    reviewsDue: grammarReviewTasks(drill, grammarStates, now).length,
  };
}
