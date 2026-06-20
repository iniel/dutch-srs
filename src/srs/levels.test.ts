import { describe, it, expect } from "vitest";
import type { Card, ItemKey, ReviewState } from "./../types";
import { itemKey } from "./../types";
import {
  LEVEL_PASS_THRESHOLD,
  levelOrder,
  levelProgress,
  currentLevel,
  unlockedLevels,
  wordsToLevelUp,
} from "./levels";

function card(id: string, level?: string): Card {
  return { id, group: "g", level, dutch: id, english: [id], type: "word" };
}

function guru(): ReviewState {
  return { stage: 5, availableAt: 0, lastReviewedAt: 0, incorrectCount: 0, burned: false };
}
function appr(): ReviewState {
  return { stage: 2, availableAt: 0, lastReviewedAt: 0, incorrectCount: 0, burned: false };
}

function states(pairs: [string, ReviewState][]): Record<ItemKey, ReviewState> {
  return Object.fromEntries(pairs);
}

const L1 = "A1 · U1";
const L2 = "A1 · U2";

describe("levelOrder", () => {
  it("dedupes and preserves first-appearance order, drops undefined", () => {
    const cards = [card("a", L2), card("b", L1), card("c", L2), card("d")];
    expect(levelOrder(cards)).toEqual([L2, L1]);
  });
});

describe("levelProgress", () => {
  it("counts both directions; zero progress => pct 0, not passed", () => {
    const cards = [card("a", L1), card("b", L1)];
    const p = levelProgress(cards, {}, L1);
    expect(p).toEqual({ level: L1, total: 4, gurued: 0, pct: 0, passed: false });
  });

  it("passes at exactly the threshold", () => {
    const cards = Array.from({ length: 5 }, (_, i) => card(`c${i}`, L1));
    const entries: [string, ReviewState][] = [];
    let g = 0;
    for (const c of cards) {
      for (const d of ["nl_en", "en_nl"] as const) {
        entries.push([itemKey(c.id, d), g < 9 ? guru() : appr()]);
        g++;
      }
    }
    const p = levelProgress(cards, states(entries), L1);
    expect(p.total).toBe(10);
    expect(p.gurued).toBe(9);
    expect(p.pct).toBeCloseTo(0.9);
    expect(p.passed).toBe(true);
  });

  it("fails just under the threshold", () => {
    const cards = Array.from({ length: 5 }, (_, i) => card(`c${i}`, L1));
    const entries: [string, ReviewState][] = [];
    let g = 0;
    for (const c of cards) {
      for (const d of ["nl_en", "en_nl"] as const) {
        entries.push([itemKey(c.id, d), g < 8 ? guru() : appr()]);
        g++;
      }
    }
    const p = levelProgress(cards, states(entries), L1);
    expect(p.gurued).toBe(8);
    expect(p.passed).toBe(false);
  });
});

describe("currentLevel", () => {
  it("is the first level with no progress", () => {
    const cards = [card("a", L1), card("b", L2)];
    expect(currentLevel(cards, {})).toBe(L1);
  });

  it("advances only once a level crosses the threshold", () => {
    const cards = [card("a", L1), card("b", L2)];
    expect(currentLevel(cards, states([[itemKey("a", "nl_en"), guru()]]))).toBe(L1);
    // both L1 items guru => 1.0 => advance to L2
    expect(
      currentLevel(
        cards,
        states([[itemKey("a", "nl_en"), guru()], [itemKey("a", "en_nl"), guru()]]),
      ),
    ).toBe(L2);
  });

  it("returns the last level when every level is passed", () => {
    const cards = [card("a", L1), card("b", L2)];
    const all = states([
      [itemKey("a", "nl_en"), guru()], [itemKey("a", "en_nl"), guru()],
      [itemKey("b", "nl_en"), guru()], [itemKey("b", "en_nl"), guru()],
    ]);
    expect(currentLevel(cards, all)).toBe(L2);
  });
});

describe("unlockedLevels", () => {
  const cards = [card("a", L1), card("b", L2)];

  it("gates to levels at or before current", () => {
    const u = unlockedLevels(cards, {}, false);
    expect(u.has(L1)).toBe(true);
    expect(u.has(L2)).toBe(false);
  });

  it("opens every level when unlockAll is true", () => {
    const u = unlockedLevels(cards, {}, true);
    expect(u.has(L1)).toBe(true);
    expect(u.has(L2)).toBe(true);
  });
});

it("LEVEL_PASS_THRESHOLD is 0.9", () => {
  expect(LEVEL_PASS_THRESHOLD).toBe(0.9);
});

describe("wordsToLevelUp", () => {
  const nineWords = Array.from({ length: 9 }, (_, i) => card(`w${i}`, L1));

  it("equals the full word count when nothing is gurued (9 words => 9)", () => {
    expect(wordsToLevelUp(levelProgress(nineWords, {}, L1))).toBe(9);
  });

  it("drops as words reach Guru (8 words gurued => 1 left)", () => {
    const pairs: [string, ReviewState][] = [];
    for (let i = 0; i < 8; i++) {
      pairs.push([itemKey(`w${i}`, "nl_en"), guru()], [itemKey(`w${i}`, "en_nl"), guru()]);
    }
    expect(wordsToLevelUp(levelProgress(nineWords, states(pairs), L1))).toBe(1);
  });

  it("is 0 once the 90% threshold is met", () => {
    const pairs: [string, ReviewState][] = [];
    for (let i = 0; i < 9; i++) {
      pairs.push([itemKey(`w${i}`, "nl_en"), guru()], [itemKey(`w${i}`, "en_nl"), guru()]);
    }
    expect(wordsToLevelUp(levelProgress(nineWords, states(pairs), L1))).toBe(0);
  });

  it("is 0 for an empty level", () => {
    expect(wordsToLevelUp(levelProgress([], {}, L1))).toBe(0);
  });
});
