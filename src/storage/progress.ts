import type { AppSettings, Direction, ItemKey, ProgressData, ReviewState } from "../types";
import { DIRECTIONS } from "../types";
import cardRedirects from "../data/cardRedirects.json";

export const STORAGE_KEY = "dutch-srs-progress-v1";
export const CURRENT_VERSION = 2;

export const DEFAULT_SETTINGS: AppSettings = {
  lessonBatchSize: 5,
  dailyLessonCap: 15,
  theme: "system",
};

function freshProgress(settings: AppSettings = DEFAULT_SETTINGS): ProgressData {
  return { version: CURRENT_VERSION, states: {}, lessonQueue: [], disabledDirections: {}, settings: { ...settings } };
}

// Keep only valid directions and never let a card disable BOTH directions
// (that would leave the word with nothing to review).
function coerceDisabledDirections(value: unknown): Record<string, Direction[]> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, Direction[]> = {};
  for (const [cardId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue;
    const dirs = raw.filter((d): d is Direction => DIRECTIONS.includes(d as Direction));
    const unique = [...new Set(dirs)];
    if (unique.length >= DIRECTIONS.length) continue;
    if (unique.length > 0) out[cardId] = unique;
  }
  return out;
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

// Lower stage wins so a word counts as advanced only when its weaker direction is.
function mergeWordStates(group: ReviewState[]): ReviewState {
  const stage = Math.min(...group.map((s) => s.stage));
  const atStage = group.filter((s) => s.stage === stage);
  return {
    stage,
    availableAt: Math.min(...atStage.map((s) => s.availableAt)),
    lastReviewedAt: Math.max(...group.map((s) => s.lastReviewedAt)),
    incorrectCount: group.reduce((n, s) => n + s.incorrectCount, 0),
    burned: group.every((s) => s.burned),
  };
}

function migrateV1ToV2(legacy: Record<string, ReviewState>): Record<string, ReviewState> {
  const byCard = new Map<string, ReviewState[]>();
  for (const [key, st] of Object.entries(legacy)) {
    const cardId = key.includes(":") ? key.slice(0, key.lastIndexOf(":")) : key;
    const group = byCard.get(cardId) ?? [];
    group.push(st);
    byCard.set(cardId, group);
  }
  const out: Record<string, ReviewState> = {};
  for (const [cardId, group] of byCard) out[cardId] = mergeWordStates(group);
  return out;
}

function moreAdvanced(a: ReviewState, b: ReviewState): ReviewState {
  const order = Number(b.burned) - Number(a.burned) || b.stage - a.stage || b.lastReviewedAt - a.lastReviewedAt;
  return order > 0 ? b : a;
}

// Cards merged into another card are deleted from the deck; their saved progress follows them
// so a word studied on either card keeps the furthest progress reached.
export function redirectCardIds(data: ProgressData, redirects: Record<string, string>): ProgressData {
  const moved = (id: string) => Object.prototype.hasOwnProperty.call(redirects, id);
  const disabled = data.disabledDirections ?? {};
  if (!Object.keys(data.states).some(moved) && !data.lessonQueue.some(moved) && !Object.keys(disabled).some(moved)) {
    return data;
  }
  const states: Record<string, ReviewState> = {};
  for (const [id, st] of Object.entries(data.states)) if (!moved(id)) states[id] = st;
  for (const [id, st] of Object.entries(data.states)) {
    if (!moved(id)) continue;
    const target = redirects[id];
    states[target] = states[target] ? moreAdvanced(states[target], st) : st;
  }
  const disabledDirections: Record<string, Direction[]> = {};
  for (const [id, dirs] of Object.entries(disabled)) if (!moved(id)) disabledDirections[id] = dirs;
  for (const [id, dirs] of Object.entries(disabled)) {
    if (moved(id) && !disabledDirections[redirects[id]]) disabledDirections[redirects[id]] = dirs;
  }
  const lessonQueue = [...new Set(data.lessonQueue.map((id) => (moved(id) ? redirects[id] : id)))];
  return { ...data, states, lessonQueue, disabledDirections };
}

function coerceProgress(value: unknown): ProgressData {
  if (typeof value !== "object" || value === null) return freshProgress();
  const obj = value as Record<string, unknown>;
  if (typeof obj.version !== "number") return freshProgress();
  if (typeof obj.states !== "object" || obj.states === null) return freshProgress();

  const rawStates: Record<string, ReviewState> = {};
  for (const [key, raw] of Object.entries(obj.states as Record<string, unknown>)) {
    if (isReviewState(raw)) rawStates[key] = raw;
  }
  const states = obj.version < CURRENT_VERSION ? migrateV1ToV2(rawStates) : rawStates;
  const lessonQueue = Array.isArray(obj.lessonQueue)
    ? obj.lessonQueue.filter((x): x is string => typeof x === "string")
    : [];

  return {
    version: CURRENT_VERSION,
    states,
    lessonQueue,
    disabledDirections: coerceDisabledDirections(obj.disabledDirections),
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
  let coerced: ProgressData;
  try {
    coerced = coerceProgress(JSON.parse(raw));
  } catch {
    return freshProgress();
  }
  const data = redirectCardIds(coerced, cardRedirects);
  if (data !== coerced) {
    try {
      saveProgress(data);
    } catch {
      /* the redirect is re-applied on the next load */
    }
  }
  return data;
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

export function setLessonQueue(data: ProgressData, lessonQueue: string[]): ProgressData {
  return { ...data, lessonQueue };
}

export function toggleLessonQueue(data: ProgressData, cardId: string): ProgressData {
  const queued = data.lessonQueue.includes(cardId);
  return setLessonQueue(
    data,
    queued ? data.lessonQueue.filter((id) => id !== cardId) : [...data.lessonQueue, cardId],
  );
}

// Toggle a single direction for one card. Immutable. Refuses to disable the
// last remaining direction so a word is never left with nothing to review.
export function setDirectionDisabled(
  data: ProgressData,
  cardId: string,
  dir: Direction,
  disabled: boolean,
): ProgressData {
  const current = data.disabledDirections?.[cardId] ?? [];
  const has = current.includes(dir);
  let next: Direction[];
  if (disabled) {
    if (has) return data;
    if (current.length + 1 >= DIRECTIONS.length) return data;
    next = [...current, dir];
  } else {
    if (!has) return data;
    next = current.filter((d) => d !== dir);
  }
  const map = { ...(data.disabledDirections ?? {}) };
  if (next.length === 0) delete map[cardId];
  else map[cardId] = next;
  return { ...data, disabledDirections: map };
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
  return redirectCardIds(coerceProgress(parsed), cardRedirects);
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
