# Recipes — how to make common changes

Always: add/adjust tests, then `npm run build && npm test && npm run test:e2e`, then deploy
(`docs/DEPLOY.md`).

## Change SRS intervals or penalty
- Intervals: `src/srs/stages.ts` → `STAGE_INTERVALS_MS`. Update `src/srs/stages.test.ts`.
- Advance/demote rules: `src/srs/schedule.ts` (`answerCorrect`/`answerIncorrect`). Update
  `schedule.test.ts`. Keep functions pure (take `now`).
- If you add/remove a stage, also update `stageCategory`, `stageName`, `STAGE_COLORS`, `BURNED_STAGE`,
  and the Dashboard breakdown categories in `src/screens/Dashboard.tsx`.

## Change answer matching (stricter/looser, more aliases)
- `src/review/answerCheck.ts`. Tune `normalize`, `distanceTolerance`, or `acceptedForDirection`.
- For per-card aliases, prefer adding to `card.english` (NL→EN) in the data; for Dutch variants extend
  `articleVariants`. Add cases to `answerCheck.test.ts`.

## Add a setting
1. Extend `AppSettings` in `src/types.ts` + `DEFAULT_SETTINGS` in `src/storage/progress.ts`.
2. Add a control in `src/screens/Settings.tsx` calling `setSetting({ key: value })`.
3. Consume it in `App.tsx` (e.g. pass into a query/queue) or wherever it applies.
4. `progress.test.ts` already checks settings merge/persist — extend if behavior is non-trivial.

## Add a screen
1. Create `src/screens/Foo.tsx` (presentational: props in, callbacks out).
2. Add `"foo"` to the `Screen` union in `App.tsx`, a conditional render block, and a way to navigate
   to it (button → `setScreen("foo")`).
3. Style with existing classes in `src/styles/app.css` or add new ones; reuse CSS tokens from `base.css`.

## Change the review/lesson interaction
- Shared UI is `src/components/Quiz.tsx`. Mind the gotcha: requeue on wrong happens on *Continue*, and
  Enter-to-continue is a **window** listener (disabled input has no keydown). Re-verify with
  `npm run test:e2e` (it exercises correct, wrong-requeue, and SRS transitions).
- Queue/ordering logic is `src/review/session.ts` (pure) — change + test there, not in the component.

## Add/replace vocabulary
See `docs/VOCABULARY.md`. Short version: edit decks or `scripts/convert-anki.mjs`, run `npm run convert`,
sanity-check the printed counts, rebuild, commit `dist/` + `public/cards.json`, deploy.

## Add audio (deferred feature)
The decks contain mp3s (`[sound:...]` in a `Sound` field) and media files inside the `.apkg`. To
support audio: in `convert-anki.mjs` read the `.apkg` `media` map (JSON mapping numeric files →
names), copy referenced mp3s into `public/audio/`, add an `audio` field to `Card`, then play it in
`Quiz.tsx`/`Lessons.tsx`. Keep it optional/gracefully absent.

## Adjust theme/colors
- Tokens + dark-mode overrides: `src/styles/base.css` (`:root`, `[data-theme="dark"]`,
  `@media (prefers-color-scheme: dark)`).
- SRS stage colors are also in `src/srs/stages.ts` (`STAGE_COLORS`) — keep the two in sync if you change them.
