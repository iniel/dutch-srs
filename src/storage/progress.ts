import type { AppSettings, ItemKey, ProgressData, ReviewState } from "../types";

export const STORAGE_KEY = "dutch-srs-progress-v1";
export const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  lessonBatchSize: 5,
  dailyLessonCap: 15,
  theme: "system",
};

function freshProgress(settings: AppSettings = DEFAULT_SETTINGS): ProgressData {
  return { version: CURRENT_VERSION, states: {}, settings: { ...settings } };
}

function mergeSettings(partial: Partial<AppSettings> | undefined): AppSettings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
}

function isReviewState(value: unknown): value is ReviewState {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.stage === "number" &&
    typeof s.availableAt === "number" &&
    typeof s.lastReviewedAt === "number" &&
    typeof s.incorrectCount === "number" &&
    typeof s.burned === "boolean"
  );
}

function coerceProgress(value: unknown): ProgressData {
  if (typeof value !== "object" || value === null) return freshProgress();
  const obj = value as Record<string, unknown>;
  if (typeof obj.version !== "number") return freshProgress();
  if (typeof obj.states !== "object" || obj.states === null) return freshProgress();

  const states: Record<ItemKey, ReviewState> = {};
  for (const [key, raw] of Object.entries(obj.states as Record<string, unknown>)) {
    if (isReviewState(raw)) states[key] = raw;
  }

  return {
    version: CURRENT_VERSION,
    states,
    settings: mergeSettings(obj.settings as Partial<AppSettings> | undefined),
  };
}

export function loadProgress(): ProgressData {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return freshProgress();
  }
  if (raw === null) return freshProgress();
  try {
    return coerceProgress(JSON.parse(raw));
  } catch {
    return freshProgress();
  }
}

export function saveProgress(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getState(data: ProgressData, key: ItemKey): ReviewState | undefined {
  return data.states[key];
}

export function setState(data: ProgressData, key: ItemKey, state: ReviewState): ProgressData {
  return { ...data, states: { ...data.states, [key]: state } };
}

export function updateSettings(data: ProgressData, partial: Partial<AppSettings>): ProgressData {
  return { ...data, settings: { ...data.settings, ...partial } };
}

export function exportProgress(data: ProgressData): string {
  return JSON.stringify(data, null, 2);
}

export function importProgress(json: string): ProgressData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON: could not parse progress data.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid progress data: expected an object.");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== "number") {
    throw new Error("Invalid progress data: missing version.");
  }
  if (typeof obj.states !== "object" || obj.states === null) {
    throw new Error("Invalid progress data: missing states.");
  }
  return coerceProgress(parsed);
}

export function resetProgress(): ProgressData {
  const kept = loadProgress().settings;
  const data = freshProgress(kept);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return data;
}

export function resetAll(): ProgressData {
  const data = freshProgress();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return data;
}
