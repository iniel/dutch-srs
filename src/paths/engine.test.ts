import {
  unitProgress,
  currentUnitIndex,
  unlockedUnits,
  availableLessonIds,
  pathRingPct,
  wordsToUnlockNext,
} from "./engine";
import type { LearningPath } from "./types";
import type { ReviewState } from "../types";

function state(stage: number): ReviewState {
  return { stage, availableAt: 0, lastReviewedAt: 0, incorrectCount: 0, burned: stage >= 9 };
}

/** stages: map of cardId -> stage. */
function statesOf(stages: Record<string, number>): Record<string, ReviewState> {
  const out: Record<string, ReviewState> = {};
  for (const [id, s] of Object.entries(stages)) out[id] = state(s);
  return out;
}

// 3-unit path, 2 cards each.
const path: LearningPath = {
  id: "p",
  name: "P",
  units: [
    { id: "u1", label: "U1", cardIds: ["a", "b"] },
    { id: "u2", label: "U2", cardIds: ["c", "d"] },
    { id: "u3", label: "U3", cardIds: ["e", "f"] },
  ],
};

describe("unitProgress", () => {
  it("counts guru (stage>=5) over unit total", () => {
    const p = unitProgress(["a", "b"], statesOf({ a: 5, b: 1 }));
    expect(p).toMatchObject({ total: 2, gurued: 1, passed: false });
    expect(p.pct).toBe(0.5);
  });

  it("passes at >=90% guru", () => {
    expect(unitProgress(["a", "b"], statesOf({ a: 5, b: 6 })).passed).toBe(true);
  });

  it("treats an empty unit as passed", () => {
    expect(unitProgress([], {}).passed).toBe(true);
  });
});

describe("currentUnitIndex", () => {
  it("is the first not-passed unit", () => {
    const s = statesOf({ a: 5, b: 6 }); // u1 passed, u2 not
    expect(currentUnitIndex(path, s)).toBe(1);
  });

  it("is the last unit when all pass", () => {
    const s = statesOf({ a: 5, b: 5, c: 5, d: 5, e: 5, f: 5 });
    expect(currentUnitIndex(path, s)).toBe(2);
  });

  it("is 0 on a fresh path", () => {
    expect(currentUnitIndex(path, {})).toBe(0);
  });
});

describe("unlockedUnits", () => {
  it("includes units up to and including the current one", () => {
    const s = statesOf({ a: 5, b: 6 }); // u1 passed -> u1,u2 unlocked
    expect(unlockedUnits(path, s, false).map((u) => u.id)).toEqual(["u1", "u2"]);
  });

  it("unlockAll opens every unit", () => {
    expect(unlockedUnits(path, {}, true).map((u) => u.id)).toEqual(["u1", "u2", "u3"]);
  });
});

describe("availableLessonIds", () => {
  it("returns stage-0 cards in unlocked units, in order", () => {
    const s = statesOf({ a: 5, b: 6 }); // u1 passed; a,b started. u2 unlocked, c,d new.
    expect(availableLessonIds(path, s, false)).toEqual(["c", "d"]);
  });

  it("excludes locked units", () => {
    // fresh: only u1 unlocked
    expect(availableLessonIds(path, {}, false)).toEqual(["a", "b"]);
  });

  it("unlockAll exposes new cards across all units", () => {
    const s = statesOf({ a: 5 });
    expect(availableLessonIds(path, s, true)).toEqual(["b", "c", "d", "e", "f"]);
  });
});

describe("pathRingPct", () => {
  it("is guru fraction over all path cards", () => {
    const s = statesOf({ a: 5, b: 5, c: 5 }); // 3 of 6
    expect(pathRingPct(path, s)).toBe(0.5);
  });
});

describe("wordsToUnlockNext", () => {
  it("is words needed to pass the current unit", () => {
    // u1: 2 cards, need ceil(2*0.9)=2 guru, have 0 -> 2
    expect(wordsToUnlockNext(path, {})).toBe(2);
  });

  it("is 0 when the whole path is passed", () => {
    const s = statesOf({ a: 5, b: 5, c: 5, d: 5, e: 5, f: 5 });
    expect(wordsToUnlockNext(path, s)).toBe(0);
  });
});
