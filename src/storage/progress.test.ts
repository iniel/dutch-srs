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
    data = setState(data, "card1:nl_en", sampleState);
    saveProgress(data);

    const loaded = loadProgress();
    expect(getState(loaded, "card1:nl_en")).toEqual(sampleState);
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
    data = setState(data, "card1:nl_en", sampleState);
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
