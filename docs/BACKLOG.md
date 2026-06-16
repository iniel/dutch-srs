# Backlog — features & bugs

For future agents. Each item: what, where, approach, acceptance. Read `CLAUDE.md` + the relevant
`docs/` guide before starting. After any change: `npm run build && npm test && npm run test:e2e`,
then ship (`ship-dutch-srs` skill / `docs/DEPLOY.md`).

Priority order is roughly top-down. Items are independent unless noted.

---

## BUG 1 — Unreadable gray notes text on cards
**Problem:** The secondary line on cards (e.g. `n. · forms: de mannen`) is dark gray (`--text-muted`)
rendered on the purple prompt-card → barely visible (see Image #1).
**Where:** `.feedback-notes` in `src/styles/app.css`; used by `src/screens/Lessons.tsx` (lesson info,
on the purple `.prompt-card`) and `src/components/Quiz.tsx` (wrong-answer panel, on `--surface` where
gray is fine).
**Approach:** Scope a readable color when notes sit on the purple card — e.g.
`.prompt-card .feedback-notes { color: rgba(255,255,255,0.85); }` (and the same for `.lesson-meaning`
if needed). Leave the wrong-answer panel (surface bg) using `--text-muted`. Don't globally change
`--text-muted`.
**Acceptance:** Notes legible on the purple card in light + dark; wrong-answer notes unchanged.

---

## BUG 3 — Wrong-answer feedback only shows on the first miss
**Problem:** When an answer is wrong, the error/feedback appears only the first time in a session;
later wrong answers don't show it (user-reported). Expected: feedback every time an answer is wrong.
**Where:** `src/components/Quiz.tsx` — `submit()` wrong branch, `phase` state, the window `keydown`
listener effect, `advanceAfterWrong()`.
**Approach:** Reproduce first: drive a session, miss the same item twice (it requeues), confirm the
panel doesn't reappear. Likely a `phase`/listener or `force()` re-render edge. Note `current()` doesn't
change identity, and `useEffect([phase])` re-binds the window listener — verify it isn't stale.
Consider keying the input/feedback by `task.key` and resetting `phase` to `"input"` on task change.
**Acceptance:** Every wrong answer shows feedback, including repeated misses of the same item. Add an
E2E assertion in `tests/e2e.mjs` that misses an item twice and checks `.feedback`/collapsed control
appears both times.
**Note:** Implement together with FEATURE 4 (same component, same panel).

---

## FEATURE 4 — Collapsed wrong-answer feedback (expand to reveal)
**What:** On a wrong answer, don't reveal the correct answer by default. Show "Incorrect" + a
**Continue** button + a **Show answer** toggle. Expanding reveals the correct answer + notes. User can
continue without ever seeing it.
**Where:** `src/components/Quiz.tsx` (the `phase === "wrong"` block), styles in `app.css`.
**Approach:** Add `revealed: boolean` state (reset per task). Default collapsed: title "Incorrect",
Continue button, "Show answer" link. Continue still works via the window Enter listener (keep BUG-3 fix
in mind). Keyboard: Enter = continue; maybe a key (e.g. Space) to expand.
**Acceptance:** Wrong answer hides the solution until expanded; Continue advances without revealing;
works keyboard-only and on mobile tap. E2E covers collapsed → continue and collapsed → expand.

---

## FEATURE 2 — Pronunciation (voice-over) button on lesson cards
**What:** A speaker button on the lesson info card that speaks the Dutch word, to learn pronunciation.
**Where:** `src/screens/Lessons.tsx` (lesson info card); optionally `Quiz.tsx` after answering.
**Approach (recommended):** Web Speech API — `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`
with `utter.lang = "nl-NL"`. Add `src/util/speak.ts` (`speak(text, lang="nl-NL")`), guard for
unsupported browsers (hide the button). No assets, works offline, fine on iOS Safari (best with a
user gesture — the button click qualifies).
**Alternative:** Use the decks' mp3s (the `Sound` field + media in the `.apkg`) — heavier; needs the
audio pipeline described in `docs/RECIPES.md` (“Add audio”). Prefer Web Speech first.
**Acceptance:** Tapping the speaker pronounces the Dutch word in a Dutch voice; button hidden if
unsupported; no layout shift.

---

## FEATURE 5 — "Items in progress" word list
**What:** A browsable list of learned items, grouped by SRS stage (Apprentice/Guru/…), Dutch word on
the left, translation on the right, rows tinted by stage color (see Image #2 / WaniKani).
**Where:** new `src/screens/WordList.tsx`; route + state in `src/App.tsx`; entry point from
`src/screens/Dashboard.tsx` (e.g. tapping a stage count in the Progress row opens the list filtered to
that category, or a general "Items" button).
**Approach:** Build from `progress.states` + `index.byId`. For each item key, `parseItemKey` → card +
direction; group by `stageCategory(state.stage)`; sort within group by stage then word. Show
`SrsStagePill`/row bg using `STAGE_COLORS`. Reuse the missed-list styling in `app.css` as a base. Each
row: Dutch (left) + `english.join(", ")` (right); optionally a direction tag (NL→EN/EN→NL) since each
card has two items.
**Acceptance:** List shows all non-lesson items grouped by stage with correct colors and counts;
reachable from the dashboard; readable in light + dark; performant with ~3500 items (both directions of
1748 cards) — virtualize or cap if needed.

---

## FEATURE 7 — Levels from deck Unit info; learn in level order
**What:** Introduce explicit "levels" derived from the deck **Unit**, and order lessons by level (the
screenshot shows `A1 · 1.1 · WORD` — group by Unit, progress through units in order).
**Where:** `scripts/convert-anki.mjs` (Unit is available but currently unused — only Section feeds
`group`), `src/types.ts` (`Card.level`/`unit`), `src/review/session.ts` (`buildLessonQueue` already
takes array order — ensure the converter emits cards sorted by level→unit→section), optionally
`src/screens/Dashboard.tsx` (show current level).
**Approach:** In the converter, capture `unit` and define `level` e.g. `"A1 · U1"` (deck level + unit).
Emit `Card.level` and sort cards by deck level → unit → section so lesson order follows units. Keep
`group` (the finer `A1 · 1.1`) for display. Optionally compute a "current level" = lowest level with
unstarted items and surface it on the dashboard. Regenerate `cards.json` (`npm run convert`).
**Acceptance:** Lessons are introduced unit-by-unit in order; `Card.level` present; converter counts
unchanged (1748); dashboard optionally shows the active level. Note: changing `id` assignment would
orphan existing saved progress — keep ids stable (`c0..cN`) so current users keep their state.

---

## RESEARCH 6 — WaniKani lesson/review frequency vs ours

Sources: [SRS Stages](https://knowledge.wanikani.com/wanikani/srs-stages/),
[App Settings](https://knowledge.wanikani.com/wanikani/app-settings/).

**Intervals — we match WaniKani's normal schedule exactly:**

| Stage | WaniKani (normal) | Ours (`STAGE_INTERVALS_MS`) |
|---|---|---|
| Apprentice 1→2 | 4h | 4h ✓ |
| Apprentice 2→3 | 8h | 8h ✓ |
| Apprentice 3→4 | 1d | 1d ✓ |
| Apprentice 4→Guru1 | 2d | 2d ✓ |
| Guru1→Guru2 | 1w | 1w ✓ |
| Guru2→Master | 2w | 2w ✓ |
| Master→Enlightened | 1m | 30d ✓ |
| Enlightened→Burned | 4m | 120d ✓ |

**Differences / gaps:**
1. **Acceleration (levels 1–2):** WaniKani halves Apprentice intervals for the first two levels
   (2h→4h→8h→1d). We don't (no level concept yet — ties to FEATURE 7). *Optional; minor.*
2. **Demotion formula:** WaniKani: `new = current − (incorrect_adjustment × penalty_factor)`,
   `incorrect_adjustment = round(incorrect_count / 2)`, `penalty_factor = 1` (Apprentice) or `2`
   (Guru+). Ours (`answerIncorrect`): fixed drop of `1` (Apprentice) / `2` (Guru+) per clear,
   not scaled by how many times missed. Close, slightly gentler on repeated misses. *Consider aligning.*
3. **Daily lesson cap:** WaniKani caps new lessons/day (0–100, to control future review load). We only
   have batch size (we default 5; WaniKani batch 3–10 default 5 ✓). *Consider a daily-new-items cap in
   Settings.*
4. **Review queue ordering:** WaniKani offers Shuffled (default), Apprentice-first, Lower-SRS-first,
   Lower-level-first. Ours is deterministic by `availableAt` then key (not shuffled). *Consider a
   shuffle and/or Apprentice-first option.*
5. **Lesson→review cascade philosophy:** "lesson volume drives review volume." Our lack of a daily cap
   means a user can flood themselves. Pairs with #3.

**Recommendation (cheap → impactful):** add a daily new-lesson cap (Settings) + an Apprentice-first or
shuffled review order. Acceleration + exact demotion formula are nice-to-have and depend on FEATURE 7
(levels). All interval changes live in `src/srs/`; ordering in `src/review/session.ts` — keep pure,
update tests.

---

## Notes for whoever picks these up
- Group BUG 3 + FEATURE 4 (same panel). Do FEATURE 7 before RESEARCH-6 acceleration (needs levels).
- New screens: presentational, props from `App.tsx` (see existing screens). No router/state lib.
- Anything touching `src/srs/` or `src/review/` is pure + unit-tested first.
- Re-verify interaction changes with `npm run test:e2e` (it exercises correct/wrong/SRS paths).
