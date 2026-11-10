import type { ReviewState } from "../types";
import { STAGE_INTERVALS_MS, BURNED_STAGE, MIN_REVIEW_STAGE } from "./stages";

export type CustomProgressTarget = "guru" | "master" | "enlightened" | "burned";

export const CUSTOM_PROGRESS_STAGE: Record<CustomProgressTarget, number> = {
  guru: 5, // Guru I
  master: 7,
  enlightened: 8,
  burned: BURNED_STAGE,
};

export function newLessonState(): ReviewState {
  return {
    stage: 0,
    availableAt: Infinity,
    lastReviewedAt: 0,
    incorrectCount: 0,
    burned: false,
  };
}

export function startLesson(state: ReviewState, now: number): ReviewState {
  return {
    ...state,
    stage: MIN_REVIEW_STAGE,
    availableAt: now + STAGE_INTERVALS_MS[MIN_REVIEW_STAGE],
    lastReviewedAt: now,
  };
}

export function setCustomProgress(
  state: ReviewState,
  target: CustomProgressTarget,
  now: number,
): ReviewState {
  if (!Object.hasOwn(CUSTOM_PROGRESS_STAGE, target)) return state;
  const stage = CUSTOM_PROGRESS_STAGE[target];
  // Re-picking the current stage must not restart its review timer.
  if (state.stage === stage) return state;

  const burned = stage === BURNED_STAGE;
  return {
    ...state,
    stage,
    availableAt: burned ? Infinity : now + STAGE_INTERVALS_MS[stage],
    lastReviewedAt: now,
    burned,
  };
}

export function answerCorrect(state: ReviewState, now: number): ReviewState {
  const baseStage = Math.max(state.stage, MIN_REVIEW_STAGE);
  const newStage = baseStage + 1;

  if (newStage > 8) {
    return {
      ...state,
      stage: BURNED_STAGE,
      burned: true,
      availableAt: Infinity,
      lastReviewedAt: now,
    };
  }

  return {
    ...state,
    stage: newStage,
    availableAt: now + STAGE_INTERVALS_MS[newStage],
    lastReviewedAt: now,
  };
}

export function answerIncorrect(state: ReviewState, now: number): ReviewState {
  const baseStage = Math.max(state.stage, MIN_REVIEW_STAGE);
  const adjustment = baseStage >= 5 ? 2 : 1;
  const newStage = Math.max(MIN_REVIEW_STAGE, baseStage - adjustment);

  return {
    ...state,
    stage: newStage,
    availableAt: now + STAGE_INTERVALS_MS[newStage],
    lastReviewedAt: now,
    incorrectCount: state.incorrectCount + 1,
    burned: false,
  };
}

export function answerWord(state: ReviewState, passed: boolean, now: number): ReviewState {
  return passed ? answerCorrect(state, now) : answerIncorrect(state, now);
}
