export const MIN_REVIEW_STAGE = 1;
export const BURNED_STAGE = 9;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const STAGE_INTERVALS_MS: Record<number, number> = {
  1: 4 * HOUR,
  2: 8 * HOUR,
  3: 1 * DAY,
  4: 2 * DAY,
  5: 7 * DAY,
  6: 14 * DAY,
  7: 30 * DAY,
  8: 120 * DAY,
};

export type StageCategory =
  | "lesson"
  | "apprentice"
  | "guru"
  | "master"
  | "enlightened"
  | "burned";

export function stageCategory(stage: number): StageCategory {
  if (stage <= 0) return "lesson";
  if (stage <= 4) return "apprentice";
  if (stage <= 6) return "guru";
  if (stage === 7) return "master";
  if (stage === 8) return "enlightened";
  return "burned";
}

export function stageName(stage: number): string {
  switch (stageCategory(stage)) {
    case "lesson":
      return "Lesson";
    case "apprentice":
      return "Apprentice";
    case "guru":
      return "Guru";
    case "master":
      return "Master";
    case "enlightened":
      return "Enlightened";
    case "burned":
      return "Burned";
  }
}

const STAGE_SUBLEVEL: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "I",
  6: "II",
};

export function stageLabel(stage: number): string {
  const name = stageName(stage);
  const sub = STAGE_SUBLEVEL[stage];
  return sub ? `${name} ${sub}` : name;
}

export const STAGE_COLORS: Record<StageCategory, string> = {
  apprentice: "#de0094",
  guru: "#872b9e",
  master: "#294ddb",
  enlightened: "#0094de",
  burned: "#424242",
  lesson: "#888",
};
