# WaniKani-style Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate lessons by level — the next level's items stay locked until ≥90% of the current level's items reach Guru, with an escape-hatch setting to unlock everything.

**Architecture:** New pure module `src/srs/levels.ts` derives level order, per-level progress, current level, and the unlocked set from `Card[]` + `ReviewState` map. `buildLessonQueue` gains an `unlocked` filter. `App.tsx` computes the unlocked set and current-level info, feeds the lesson gate and the Dashboard. A new `unlockAllLevels` setting bypasses the gate.

**Tech Stack:** Vite + React 18 + TypeScript, Vitest. No new deps.

## Global Constraints
- Pure logic in `src/srs/` never calls `Date.now()` or touches the DOM/localStorage — all inputs passed in. (Levels logic needs neither time nor storage.)
- `LEVEL_PASS_THRESHOLD = 0.9`.
- Guru+ = `ReviewState.stage >= 5`.
- Two directions = two items; each item counted independently.
- Cards with no `level` are always unlocked (never stranded by the gate).
- After all code changes: `npm run build && npm test && npm run test:e2e` must pass.
- TDD: write the co-located `*.test.ts` first.

---

### Task 1: Pure levels module

**Files:**
- Create: `src/srs/levels.ts`
- Test: `src/srs/levels.test.ts`

**Interfaces:**
- Consumes: `Card`, `ItemKey`, `ReviewState` from `../types`; `itemKey`, `DIRECTIONS` from `../types`.
- Produces:
  - `LEVEL_PASS_THRESHOLD: number` (0.9)
  - `levelOrder(cards: Card[]): string[]`
  - `interface LevelProgress { level: string; total: number; gurued: number; pct: number; passed: boolean }`
  - `levelProgress(cards: Card[], states: Record<ItemKey, ReviewState>, level: string): LevelProgress`
  - `currentLevel(cards: Card[], states: Record<ItemKey, ReviewState>): string`
  - `unlockedLevels(cards: Card[], states: Record<ItemKey, ReviewState>, unlockAll: boolean): Set<string>`

- [ ] **Step 1: Write the failing tests**

```ts
// src/srs/levels.test.ts
import { describe, it, expect } from "vitest";
import type { Card, ItemKey, ReviewState } from "./../types";
import { itemKey } from "./../types";
import {
  LEVEL_PASS_THRESHOLD,
  levelOrder,
  levelProgress,
  currentLevel,
  unlockedLevels,
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
    // 10 items, 9 gurued = 0.9
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
    // L1 has 2 items; 1 guru = 0.5 < 0.9 => still on L1
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/srs/levels.test.ts`
Expected: FAIL — "Cannot find module './levels'" / exports undefined.

- [ ] **Step 3: Write the implementation**

```ts
// src/srs/levels.ts
import type { Card, ItemKey, ReviewState } from "../types";
import { itemKey, DIRECTIONS } from "../types";

export const LEVEL_PASS_THRESHOLD = 0.9;

const GURU_MIN_STAGE = 5;

export function levelOrder(cards: Card[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const card of cards) {
    if (!card.level || seen.has(card.level)) continue;
    seen.add(card.level);
    order.push(card.level);
  }
  return order;
}

export interface LevelProgress {
  level: string;
  total: number;
  gurued: number;
  pct: number;
  passed: boolean;
}

export function levelProgress(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  level: string,
): LevelProgress {
  let total = 0;
  let gurued = 0;
  for (const card of cards) {
    if (card.level !== level) continue;
    for (const dir of DIRECTIONS) {
      total++;
      const state = states[itemKey(card.id, dir)];
      if (state && state.stage >= GURU_MIN_STAGE) gurued++;
    }
  }
  const pct = total === 0 ? 0 : gurued / total;
  return { level, total, gurued, pct, passed: pct >= LEVEL_PASS_THRESHOLD };
}

export function currentLevel(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
): string {
  const order = levelOrder(cards);
  for (const level of order) {
    if (!levelProgress(cards, states, level).passed) return level;
  }
  return order[order.length - 1];
}

export function unlockedLevels(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  unlockAll: boolean,
): Set<string> {
  const order = levelOrder(cards);
  if (unlockAll) return new Set(order);
  const current = currentLevel(cards, states);
  const currentIdx = order.indexOf(current);
  return new Set(order.slice(0, currentIdx + 1));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/srs/levels.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/srs/levels.ts src/srs/levels.test.ts
git commit -m "feat(srs): pure level-progress + gating logic"
```

---

### Task 2: Gate the lesson queue

**Files:**
- Modify: `src/review/session.ts:110-133` (`buildLessonQueue`)
- Test: `src/review/session.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `Set<string>` (unlocked levels) from Task 1's `unlockedLevels`.
- Produces: `buildLessonQueue(cards, states, batchSize, unlocked?: Set<string>): ReviewTask[]` — when `unlocked` is provided, a card whose `level` is set and absent from the set is skipped. Omitting `unlocked` keeps current behavior (no gate).

- [ ] **Step 1: Write the failing test**

Append to `src/review/session.test.ts`:

```ts
describe("buildLessonQueue gating", () => {
  function card(id: string, level?: string): Card {
    return { id, group: "g", level, dutch: id, english: [id], type: "word" };
  }

  it("excludes cards whose level is not unlocked", () => {
    const cards = [card("a", "A1 · U1"), card("b", "A1 · U2")];
    const tasks = buildLessonQueue(cards, {}, 10, new Set(["A1 · U1"]));
    expect(tasks.map((t) => t.cardId)).toEqual(["a", "a"]);
  });

  it("includes a card with no level even when gated", () => {
    const cards = [card("a")];
    const tasks = buildLessonQueue(cards, {}, 10, new Set(["A1 · U1"]));
    expect(tasks.map((t) => t.cardId)).toEqual(["a", "a"]);
  });

  it("ignores the gate when unlocked is omitted", () => {
    const cards = [card("a", "A1 · U2")];
    const tasks = buildLessonQueue(cards, {}, 10);
    expect(tasks.length).toBe(2);
  });
});
```

If `Card` is not already imported in this test file, add it to the existing top import: `import type { Card, ... } from "../types";`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/review/session.test.ts`
Expected: FAIL — gated card `b` still appears / arity mismatch.

- [ ] **Step 3: Implement the gate**

In `src/review/session.ts`, change the signature and add the skip. Replace lines 110-124:

```ts
export function buildLessonQueue(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  batchSize: number,
  unlocked?: Set<string>,
): ReviewTask[] {
  const tasks: ReviewTask[] = [];
  let picked = 0;

  for (const card of cards) {
    if (picked >= batchSize) break;
    if (unlocked && card.level && !unlocked.has(card.level)) continue;
    const isNew = DIRECTIONS.some((dir) => {
      const state = states[itemKey(card.id, dir)];
      return !state || state.stage === 0;
    });
    if (!isNew) continue;
```

(Leave the rest of the function unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/review/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/review/session.ts src/review/session.test.ts
git commit -m "feat(review): gate lesson queue by unlocked levels"
```

---

### Task 3: `unlockAllLevels` setting

**Files:**
- Modify: `src/types.ts` (`AppSettings`)
- Modify: `src/screens/Settings.tsx` (add toggle row)

**Interfaces:**
- Consumes: existing `setSetting(partial: Partial<AppSettings>)` and `updateSettings`.
- Produces: `AppSettings.unlockAllLevels?: boolean` (undefined/false = gated).

- [ ] **Step 1: Add the field to the type**

In `src/types.ts`, extend `AppSettings`:

```ts
export interface AppSettings {
  lessonBatchSize: number;
  dailyLessonCap?: number;
  theme: "system" | "light" | "dark";
  unlockAllLevels?: boolean;
}
```

- [ ] **Step 2: Add the toggle row in Settings**

In `src/screens/Settings.tsx`, after the theme `<label className="setting-row">…</label>` block (ends ~line 76), add:

```tsx
      <label className="setting-row">
        <span>Unlock all levels</span>
        <input
          type="checkbox"
          checked={!!progress.settings.unlockAllLevels}
          onChange={(e) => setSetting({ unlockAllLevels: e.target.checked })}
        />
      </label>
```

- [ ] **Step 3: Verify build + types**

Run: `npm run build`
Expected: PASS (no TS errors).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/screens/Settings.tsx
git commit -m "feat(settings): add unlock-all-levels toggle"
```

---

### Task 4: Wire the gate + level info into App

**Files:**
- Modify: `src/App.tsx` (import levels module; `startLessons` line 68-77; `counts` memo line 103-113; `<Dashboard>` props line 120-131)

**Interfaces:**
- Consumes: `unlockedLevels`, `currentLevel`, `levelProgress`, `LevelProgress` from `./srs/levels`; gated `buildLessonQueue` from Task 2.
- Produces: passes `levelName: string` and `levelPct: number` to `<Dashboard>` (consumed in Task 5). `levelName = currentLevel(...)`, `levelPct = levelProgress(..., levelName).pct`.

- [ ] **Step 1: Add the import**

In `src/App.tsx`, near the other `./srs` imports add:

```ts
import { unlockedLevels, currentLevel, levelProgress } from "./srs/levels";
```

- [ ] **Step 2: Gate `startLessons`**

Replace line 70:

```ts
    const unlocked = unlockedLevels(index.cards, progress.states, !!progress.settings.unlockAllLevels);
    const tasks = buildLessonQueue(index.cards, progress.states, progress.settings.lessonBatchSize, unlocked);
```

- [ ] **Step 3: Gate the lessons-available count + compute level info**

Replace the `counts` memo body (lines 104-112) with:

```ts
    const reviewsDue = buildReviewQueue(progress.states, now()).length;
    const unlocked = unlockedLevels(index.cards, progress.states, !!progress.settings.unlockAllLevels);
    const lessonCards = index.cards.filter((c) => {
      if (c.level && !unlocked.has(c.level)) return false;
      return DIRECTIONS.some((d) => {
        const s = progress.states[itemKey(c.id, d)];
        return !s || s.stage === 0;
      });
    }).length;
    const levelName = currentLevel(index.cards, progress.states);
    const levelPct = levelProgress(index.cards, progress.states, levelName).pct;
    return { reviewsDue, lessonCards, levelName, levelPct };
```

- [ ] **Step 4: Pass level info to Dashboard**

In the `<Dashboard>` JSX (after `lessonsAvailable={counts.lessonCards}`) add:

```tsx
          levelName={counts.levelName}
          levelPct={counts.levelPct}
```

- [ ] **Step 5: Verify build (Dashboard props added in Task 5; build may flag missing props until then)**

Run: `npm run build`
Expected: TS error "Property 'levelName' is missing in type … Dashboard" — proceed to Task 5, which adds the props. (If executing tasks strictly one-at-a-time with a green build between each, merge Task 5 Step 1 into this task before building.)

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire level gate into lessons + dashboard"
```

---

### Task 5: Dashboard level header + progress ring

**Files:**
- Modify: `src/screens/Dashboard.tsx` (`DashboardProps`, component body, header markup)
- Modify: `src/styles/app.css` (ring styles)

**Interfaces:**
- Consumes: `levelName: string`, `levelPct: number` props from Task 4; `parseItemKey` from `../types`.
- Produces: visible `Level <name> · <N> words learned` header and a circular progress ring filled to `levelPct`.

- [ ] **Step 1: Add the props**

In `src/screens/Dashboard.tsx`, extend `DashboardProps`:

```ts
  lessonsAvailable: number;
  levelName: string;
  levelPct: number;
```

And add to the destructured params:

```ts
  lessonsAvailable,
  levelName,
  levelPct,
```

- [ ] **Step 2: Compute words-learned and import parseItemKey**

Change the types import to include `parseItemKey`:

```ts
import type { ProgressData } from "../types";
import { parseItemKey } from "../types";
```

In the `useMemo`, after the `byCategory`/`nextAt` loop, compute distinct started cards. Replace the `return { byCategory, nextAt };` line with:

```ts
    const learnedCards = new Set<string>();
    for (const [key, s] of Object.entries(progress.states)) {
      if (s.stage >= 1) learnedCards.add(parseItemKey(key).cardId);
    }
    return { byCategory, nextAt, wordsLearned: learnedCards.size };
```

Then destructure it where the memo result is used:

```ts
  const { byCategory, nextAt, wordsLearned } = useMemo(() => {
```

- [ ] **Step 3: Render the header + ring**

Inside the `<header className="topbar">` region (after the existing search button, before the settings button — match the existing header structure), add a level block. Place this immediately after the opening `<header className="topbar">…</header>` block, as the first child of the dashboard body:

```tsx
      <section className="level-summary">
        <div
          className="level-ring"
          style={{ ["--pct" as string]: `${Math.round(levelPct * 100)}` }}
          role="img"
          aria-label={`${Math.round(levelPct * 100)}% of level ${levelName} at Guru`}
        >
          <span>{Math.round(levelPct * 100)}%</span>
        </div>
        <div className="level-meta">
          <strong>Level {levelName}</strong>
          <span>{wordsLearned} words learned</span>
        </div>
      </section>
```

- [ ] **Step 4: Add ring styles**

Append to `src/styles/app.css`:

```css
.level-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}
.level-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(
    var(--guru, #872b9e) calc(var(--pct) * 1%),
    var(--ring-track, #e0e0e0) 0
  );
  font-size: 12px;
  font-weight: 600;
}
.level-ring span {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg, #fff);
  display: grid;
  place-items: center;
}
.level-meta {
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 5: Verify build + full test suite**

Run: `npm run build && npm test`
Expected: build PASS, all unit tests PASS.

- [ ] **Step 6: E2E**

Run: `npm run test:e2e`
Expected: PASS (lesson/review flow still works; new level header renders).

- [ ] **Step 7: Commit**

```bash
git add src/screens/Dashboard.tsx src/styles/app.css
git commit -m "feat(dashboard): level header + progress ring"
```

---

### Task 6: Rebuild dist for deploy

**Files:**
- Modify: `dist/` (prebuilt bundle, committed per `docs/DEPLOY.md`)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `dist/` updated.

- [ ] **Step 2: Commit**

```bash
git add dist
git commit -m "build: rebuild dist with level gating"
```

(Do not push/deploy unless the user asks — see CLAUDE.md.)

---

## Notes for the implementer
- `src/srs/` purity is enforced by convention and tests — keep `levels.ts` free of `now()`/DOM/storage.
- The `--pct` CSS custom property is set inline as a unitless number; the `conic-gradient` multiplies by `1%`. `--bg`, `--guru`, `--ring-track` fall back to literals if the token isn't defined in `base.css`.
- Existing `setState`/`saveProgress` immutability pattern is untouched — levels are derived, never stored.
