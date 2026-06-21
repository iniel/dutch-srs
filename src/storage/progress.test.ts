import { beforeEach, describe, expect, it } from "vitest";
import type { ProgressData, ReviewState } from "../types";
import {
  CURRENT_VERSION,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  exportProgress,
  getState,
  importProgress,
  loadProgress,
  resetAll,
  resetProgress,
  saveProgress,
  setState,
  updateSettings,
} from "./progress";

const sampleState: ReviewState = {
  stage: 2,
  availableAt: 123,
  lastReviewedAt: 100,
  incorrectCount: 1,
  burned: false,
};

beforeEach(() => {
  localStorage.clear();
});

describe("loadProgress", () => {
  it("returns fresh defaults when nothing is stored", () => {
    const data = loadProgress();
    expect(data.version).toBe(CURRENT_VERSION);
    expect(data.states).toEqual({});
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back to defaults on corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const data = loadProgress();
    expect(data.states).toEqual({});
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back when shape is wrong", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadProgress().states).toEqual({});
  });

  it("merges missing settings with defaults", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, states: {}, settings: { theme: "dark" } }),
    );
    const data = loadProgress();
    expect(data.settings.theme).toBe("dark");
    expect(data.settings.lessonBatchSize).toBe(DEFAULT_SETTINGS.lessonBatchSize);
  });

  it("drops malformed state entries", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        states: { good: sampleState, bad: { stage: "x" } },
        settings: DEFAULT_SETTINGS,
      }),
    );
    const data = loadProgress();
    expect(data.states.good).toEqual(sampleState);
    expect(data.states.bad).toBeUndefined();
  });
});

describe("save/load round-trip", () => {
  it("persists states across save and load", () => {
    let data = loadProgress();
    data = setState(data, "card1", sampleState);
    saveProgress(data);

    const loaded = loadProgress();
    expect(getState(loaded, "card1")).toEqual(sampleState);
  });
});

describe("v1 -> v2 migration", () => {
  function v1(states: Record<string, ReviewState>): string {
    return JSON.stringify({ version: 1, states, settings: DEFAULT_SETTINGS });
  }
  function rs(partial: Partial<ReviewState>): ReviewState {
    return { stage: 1, availableAt: 0, lastReviewedAt: 0, incorrectCount: 0, burned: false, ...partial };
  }

  it("merges a word's two directions by taking the lower stage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      v1({
        "w:nl_en": rs({ stage: 5, availableAt: 1000, lastReviewedAt: 900, incorrectCount: 1 }),
        "w:en_nl": rs({ stage: 2, availableAt: 200, lastReviewedAt: 800, incorrectCount: 2 }),
      }),
    );
    const data = loadProgress();
    expect(data.version).toBe(CURRENT_VERSION);
    expect(Object.keys(data.states)).toEqual(["w"]);
    expect(data.states.w.stage).toBe(2); // lower stage
    expect(data.states.w.availableAt).toBe(200); // from the min-stage direction
    expect(data.states.w.lastReviewedAt).toBe(900); // most recent
    expect(data.states.w.incorrectCount).toBe(3); // summed
    expect(data.states.w.burned).toBe(false);
  });

  it("burns the word only when both directions are burned", () => {
    localStorage.setItem(
      STORAGE_KEY,
      v1({
        "w:nl_en": rs({ stage: 9, availableAt: 9e15, burned: true }),
        "w:en_nl": rs({ stage: 9, availableAt: 9e15, burned: true }),
      }),
    );
    const data = loadProgress();
    expect(data.states.w.stage).toBe(9);
    expect(data.states.w.burned).toBe(true);
  });

  it("keeps a single-direction word's values intact", () => {
    localStorage.setItem(STORAGE_KEY, v1({ "w:nl_en": rs({ stage: 4, availableAt: 50 }) }));
    const data = loadProgress();
    expect(data.states.w).toEqual(rs({ stage: 4, availableAt: 50 }));
  });

  it("migrates a v1 export through importProgress", () => {
    const imported = importProgress(
      v1({
        "w:nl_en": rs({ stage: 6 }),
        "w:en_nl": rs({ stage: 3 }),
      }),
    );
    expect(imported.version).toBe(CURRENT_VERSION);
    expect(imported.states.w.stage).toBe(3);
  });
});

describe("setState", () => {
  it("returns a new object and does not mutate the original", () => {
    const data = loadProgress();
    const next = setState(data, "k", sampleState);
    expect(next).not.toBe(data);
    expect(data.states.k).toBeUndefined();
    expect(next.states.k).toEqual(sampleState);
  });
});

describe("updateSettings", () => {
  it("merges partial settings", () => {
    const data = loadProgress();
    const next = updateSettings(data, { lessonBatchSize: 10 });
    expect(next.settings.lessonBatchSize).toBe(10);
    expect(next.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });
});

describe("export/import", () => {
  it("round-trips through export and import", () => {
    let data = loadProgress();
    data = setState(data, "card1", sampleState);
    data = updateSettings(data, { theme: "light" });

    const json = exportProgress(data);
    const imported = importProgress(json);
    expect(imported).toEqual(data);
  });

  it("rejects invalid JSON", () => {
    expect(() => importProgress("{garbage")).toThrow(/Invalid JSON/);
  });

  it("rejects wrong shape (missing states)", () => {
    expect(() => importProgress(JSON.stringify({ version: 1 }))).toThrow(/states/);
  });

  it("rejects missing version", () => {
    expect(() => importProgress(JSON.stringify({ states: {} }))).toThrow(/version/);
  });
});

describe("reset", () => {
  it("clears states but keeps settings", () => {
    let data = loadProgress();
    data = updateSettings(data, { theme: "dark", lessonBatchSize: 7 });
    data = setState(data, "k", sampleState);
    saveProgress(data);

    const reset = resetProgress();
    expect(reset.states).toEqual({});
    expect(reset.settings).toEqual({ theme: "dark", lessonBatchSize: 7, dailyLessonCap: 15 });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("resetAll wipes everything to defaults", () => {
    let data = loadProgress();
    data = updateSettings(data, { theme: "dark" });
    data = setState(data, "k", sampleState);
    saveProgress(data);

    const reset = resetAll();
    expect(reset.states).toEqual({});
    expect(reset.settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("type guard rejects non-object stored value", () => {
  it("handles a stored array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    const data: ProgressData = loadProgress();
    expect(data.states).toEqual({});
  });
});
