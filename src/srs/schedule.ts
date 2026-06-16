import type { ReviewState } from "../types";
import { STAGE_INTERVALS_MS, BURNED_STAGE, MIN_REVIEW_STAGE } from "./stages";

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
