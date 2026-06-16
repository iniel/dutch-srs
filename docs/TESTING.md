# Testing

Two layers. Both must pass before deploy.

## Unit tests — `npm test` (vitest)
- 85 tests, co-located `*.test.ts` next to source in `src/srs/`, `src/review/`, `src/storage/`, `src/data/`.
- Cover: SRS advance/demote/clamp + scheduling math, answer normalization + typo tolerance + article
  variants, session queue building + requeue, storage round-trip/corrupt-fallback/import-validation,
  card indexing.
- jsdom env + `globals: true` are set in `vite.config.ts` (`describe/it/expect` are global).
- Pure logic is trivially testable because it takes `now` and returns new state — no mocking of time.
- Watch mode: `npm run test:watch`.

## E2E — `npm run test:e2e` (`tests/e2e.mjs`)
Standalone Node + Playwright script (NOT vitest). It:
1. `vite preview` serves the built `dist/` on port 5199 (so **build first**).
2. Launches **system Chrome** via the Playwright bundled in the global `@playwright/cli`
   (`channel: "chrome"`) — no project Playwright dep, no `npm ci`.
3. Pins a deterministic clock via `addInitScript` setting `window.__NOW__` (read by `src/util/now.ts`),
   advancing it through `localStorage.__now_offset__`.
4. Asserts the full journey: dashboard counts → lesson (100%) → 10 items at stage 1 → clock +5h →
   10 reviews due → review session (100%) → all stage 2 scheduled **exactly +8h** → reload persists →
   Settings reset clears state. 14 checks.

The in-page auto-answerer reads `cards.json` and matches the prompt: NL→EN by `card.dutch`, EN→NL by
`card.english.join(" / ")`. Direction is detected by `label.includes("Dutch →")` (both labels contain
"Dutch", so the arrow matters).

### Re-running after a code change
`npm run build` first (E2E serves `dist/`, not the dev server). Then `npm run test:e2e`.

## Interactive browser checks — `playwright-cli`
The `playwright-cli` skill (`.claude/skills/playwright-cli/`) drives a real browser by snapshot refs.
Useful for eyeballing UI or reproducing a bug. Quick loop:
```bash
playwright-cli open --browser=chrome
playwright-cli resize 390 844            # iPhone-ish viewport
playwright-cli goto http://localhost:5173/
playwright-cli snapshot                  # element refs (e1, e2, ...)
playwright-cli fill e30 "married"
playwright-cli press Enter
playwright-cli screenshot --filename=/tmp/x.png
playwright-cli close
```
Gotcha: React controlled inputs need a beat between `fill` and `Enter` (state flush) — add a short
sleep, or the keypress reads a stale empty value. `run-code` has a short wall-clock cap; prefer
separate CLI calls or the `tests/e2e.mjs` harness for long flows.

## What "done" means
`npm run build` clean (incl. `tsc -b`), `npm test` green, `npm run test:e2e` green.
