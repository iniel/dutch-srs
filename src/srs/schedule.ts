import type { ReviewState } from "../types";
import { STAGE_INTERVALS_MS, BURNED_STAGE, MIN_REVIEW_STAGE } from "./stages";

/** The only stages a never-started word can be promoted to manually. */
export type CustomProgressTarget = "guru" | "master";

const CUSTOM_PROGRESS_STAGE: Record<CustomProgressTarget, number> = {
  guru: 5, // Guru I
  master: 7,
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

/**
 * Record a never-started word as though it had just completed the chosen SRS
 * stage. Keeping this here (rather than assigning a stage in the UI) makes the
 * restriction and its normal review scheduling part of the SRS contract.
 */
export function setCustomProgress(
  state: ReviewState,
  target: CustomProgressTarget,
  now: number,
): ReviewState {
  // `target` normally comes from a typed UI callback, but this is a public
  // boundary: never turn unexpected runtime input into an invalid SRS state.
  if (state.stage !== 0 || (target !== "guru" && target !== "master")) return state;

  const stage = CUSTOM_PROGRESS_STAGE[target];
  return {
    ...state,
    stage,
    availableAt: now + STAGE_INTERVALS_MS[stage],
    lastReviewedAt: now,
    incorrectCount: 0,
    burned: false,
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
