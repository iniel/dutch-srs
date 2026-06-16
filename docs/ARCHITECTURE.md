# Architecture

## Layers (dependencies point downward)

```
App.tsx + screens/ + components/      ← React UI (impure: state, now(), DOM)
        │
        ├── data/      loadCards, useCards
        ├── storage/   progress (localStorage)
        └── srs/ + review/             ← pure domain logic (no DOM, no Date.now)
                └── types.ts           ← shared types, no logic
```

Rule: arrows never point up. Pure logic (`srs/`, `review/`) imports only `types.ts`. UI imports
everything. This keeps the domain unit-testable with zero mocking.

## Data model (`src/types.ts`)

- **`Card`**: `{ id, group, dutch, english: string[], type, pos?, lemma?, notes?, exampleNl?, exampleEn? }`.
  `english` is the list of accepted English answers. `group` is the lesson group label, e.g. `"A1 · 1.1"`.
- **`Direction`**: `"nl_en"` (show Dutch, type English) or `"en_nl"` (show English, type Dutch).
- **`ItemKey`**: `` `${cardId}:${dir}` ``. Build with `itemKey(id, dir)`, split with `parseItemKey(key)`.
- **`ReviewState`** (per item): `{ stage, availableAt, lastReviewedAt, incorrectCount, burned }`.
  `stage` 0 = lesson/not-started, 1–8 = review stages, 9 = burned. `availableAt` is Unix ms (Infinity
  when not scheduled / burned).
- **`ProgressData`**: `{ version, states: Record<ItemKey, ReviewState>, settings }`. The whole thing
  is the localStorage payload.
- **`AppSettings`**: `{ lessonBatchSize, theme: "system"|"light"|"dark" }`.

## SRS (`src/srs/`)

`stages.ts`:
- `STAGE_INTERVALS_MS[stage]` — 1:4h, 2:8h, 3:1d, 4:2d, 5:1w, 6:2w, 7:30d, 8:120d.
- `stageCategory(stage)` → `lesson|apprentice|guru|master|enlightened|burned`; `stageName(stage)`;
  `STAGE_COLORS[category]` (WaniKani hex). `MIN_REVIEW_STAGE=1`, `BURNED_STAGE=9`.

`schedule.ts` (all pure, take `now: number`):
- `newLessonState()` → stage 0.
- `startLesson(state, now)` → stage 1, scheduled `now + 4h`. (Used when a lesson item is learned.)
- `answerCorrect(state, now)` → `stage+1`, reschedule by new stage; `>8` ⇒ burned.
- `answerIncorrect(state, now)` → drop `stage>=5 ? 2 : 1`, clamp to stage 1, `incorrectCount+1`,
  reschedule by new stage. Never burns.

## Session (`src/review/session.ts`, pure)

- `buildReviewQueue(states, now)` → `ReviewTask[]` for items with `stage>=1 && !burned && availableAt<=now`,
  sorted by `availableAt` then key (deterministic; no RNG).
- `buildLessonQueue(cards, states, batchSize)` → both directions for the first `batchSize` cards that
  are new (no state or stage 0), in `cards` order.
- `createSession(tasks)` → `Session`: `current()`, `submit(wasCorrect)`, `done()`, `total()`,
  `remaining()`, `results()`, `isComplete()`. On correct → task leaves the queue; on wrong → requeued
  to the back. `results()` reports first-try correctness per item (for the Summary missed list).

## Answer checking (`src/review/answerCheck.ts`, pure)

- `normalize(s)` — trim, lowercase, collapse whitespace, strip punctuation; keeps accented letters.
- `checkAnswer(input, accepted)` → `{ correct, imprecise }`. Exact match OR within Levenshtein
  `distanceTolerance(len)` (0 ≤3 chars, 1 ≤5, 2 ≤7, +1 per 7 beyond). Imprecise still counts correct.
- `acceptedForDirection(card, dir)` — `nl_en` → `card.english`; `en_nl` → `articleVariants(card.dutch)`
  (with/without leading `de`/`het`/`een`/`'t`).

## Review/lesson flow (`Quiz.tsx`)

`Quiz` is shared by `Reviews` and the `Lessons` quiz phase. It:
1. Shows the current task's prompt (Dutch or English) + direction label.
2. On Enter: `checkAnswer`. Correct → `session.submit(true)`, fire `onCleared(task, everWrong)`, advance.
   Wrong → mark `everWrong`, show the correct answer, wait for Enter (window listener) → `submit(false)`.
3. `onComplete()` when `session.isComplete()`.

`App.tsx` wires `onCleared`:
- Reviews: `everWrong ? answerIncorrect : answerCorrect` → persist. (SRS applied once, when the item
  finally clears — matches WaniKani: miss it once and it demotes even if you later get it right.)
- Lessons: `startLesson(...)` → the item enters review at stage 1.

## State & routing

`App.tsx` holds `progress`, `screen`, `session`, `sessionMode`, `lessonCards`, `summary`. Screen is a
string union switched by conditional render — no router. Theme is applied by writing
`data-theme` on `<html>` (see `base.css` for the token overrides).
