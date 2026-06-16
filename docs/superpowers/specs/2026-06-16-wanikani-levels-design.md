# WaniKani-style levels — design

## Goal
Gate lessons by level, WaniKani-style: you can only learn the next level once you
guru ~90% of the current one. Single item type (no kanji/radical/vocab tiers), so
the level-up gate replaces WaniKani's radical→kanji→vocab unlock chain.

## Definitions
- **Level**: value of `Card.level` (`"A1 · U1"` … `"A2 · U8"`, 16 total). Order =
  first-appearance order in `cards.json` (already sorted level→unit→section).
- **Item**: a per-direction review item (`cardId:nl_en`, `cardId:en_nl`). Two per card.
- **Guru+**: `ReviewState.stage >= 5` (guru, master, enlightened, burned).
- **Passed level**: ≥ `LEVEL_PASS_THRESHOLD` (0.9) of the level's items are Guru+.
  Items with no `ReviewState` count as not-Guru (denominator = all items in the level).
- **Current level**: lowest level (in level order) that is not passed.
- **Unlocked levels**: all levels at or before current level. Override setting
  `unlockAllLevels` unlocks everything.

## New module: `src/srs/levels.ts` (pure, no `Date.now()`)
```ts
export const LEVEL_PASS_THRESHOLD = 0.9;

export function levelOrder(cards: Card[]): string[];
// distinct Card.level values in first-appearance order; cards without level excluded.

export interface LevelProgress { level: string; total: number; gurued: number; pct: number; passed: boolean; }
export function levelProgress(cards: Card[], states: Record<ItemKey, ReviewState>, level: string): LevelProgress;
// total = item count (cards-in-level × 2); gurued = items with stage >= 5; passed = pct >= threshold.

export function currentLevel(cards: Card[], states: Record<ItemKey, ReviewState>): string;
// lowest level not passed; if all passed, the last level.

export function unlockedLevels(cards: Card[], states: Record<ItemKey, ReviewState>, unlockAll: boolean): Set<string>;
// unlockAll → every level; else every level at-or-before currentLevel.
```
Cards with no `level` are always unlocked (defensive; data has none, but the gate
must never strand un-leveled cards).

## Wiring
- **`session.ts` `buildLessonQueue`**: add param `unlocked: Set<string>`. Skip a card
  when `card.level` is set and not in `unlocked`. Reviews (`buildReviewQueue`) unchanged.
- **`App.tsx`**: compute `unlockedLevels(cards, states, settings.unlockAllLevels)` and
  pass to `buildLessonQueue`; compute `currentLevel` + `levelProgress(current)` for Dashboard.
- **Settings** (`ProgressData.settings`): add `unlockAllLevels?: boolean` (default false).
  Toggle row in Settings screen. Persist via existing `updateSettings`.
- **Dashboard**: header line `Level <current> · <N> words learned`, plus one progress
  ring = current level's `pct` (% items Guru+). `N words learned` = distinct cards with
  ≥1 item at stage ≥ 1.

## Edge cases
- No progress yet → current level = first level (`A1 · U1`); only it unlocked.
- All levels passed → current = last level; everything unlocked; ring full.
- A level stalls on leeches → `unlockAllLevels` setting is the escape hatch.
- Threshold is per-item, not per-card; one stubborn direction can't block a level if
  the other 90% are gurued.

## Testing (TDD, `src/srs/levels.test.ts` first)
- `levelOrder` dedupes, preserves order, drops undefined.
- `levelProgress`: 0 progress → pct 0; exactly threshold → passed true; just under → false.
- `currentLevel`: advances only when a level crosses threshold; skips no levels.
- `unlockedLevels`: gates to ≤ current; `unlockAll` opens all; un-leveled cards always in.
- `buildLessonQueue` respects `unlocked` (next-level items excluded until current passes).

## Out of scope
- Per-level acceleration of Apprentice intervals (BACKLOG RESEARCH-6 #1).
- Level-up notifications / time-remaining estimates.
- Lesson picker (BACKLOG 9.5).
