# CLAUDE.md — Dutch SRS

Personal local-first SRS web app for Dutch vocabulary. WaniKani/Tsurukame-style review flow.
Single user, no backend, no accounts. Hosted on GitHub Pages, installed as a PWA on iPhone.

**Read this first, then the relevant `docs/` file before changing code.**

## What it is
- Vite + React 18 + TypeScript. No router lib, no state lib (plain React state in `App.tsx`).
- Cards loaded from static `public/cards.json` — **hand-owned data** (stable ids), not regenerated. Fixes
  are direct edits; new bulk vocab is appended via the staging importers (see Commands / `docs/VOCABULARY.md`).
- Progress stored in `localStorage`. Export/import/reset in Settings.
- Each card is drilled **both directions** (NL→EN and EN→NL) as **two independent SRS items**.

## Commands
```bash
npm install
npm run dev          # http://localhost:5173 (dev server)
npm run build        # tsc -b + vite build -> dist/
npm test             # vitest: 85 unit tests (pure logic + storage)
npm run test:e2e     # full-flow browser test (system Chrome, ~1min)
# public/cards.json is HAND-OWNED data (stable ids, never renumbered). Fix cards by editing it directly.
# The importers below never write it — they stage candidates; import:merge appends new ones. Rarely needed.
npm run convert      # stage TaalCompleet .apkg decks -> scripts/import/anki.staging.json
npm run convert:nt2lex # stage A+/B1/B2 freq vocab   -> scripts/import/nt2lex.staging.json (reads cards.json read-only)
npm run clean scripts/import/nt2lex.staging.json # drop junk glosses + dup candidates (in place; needs explicit file)
npm run import:merge # dedupe vs live + append new cards to public/cards.json (ONLY writer; assigns next-free ids)
npm run a2:map       # (re)build a2-mapping.json + scripts/a2-overrides.json from a2-analysis.txt marks
npm run a2:idlists   # write easy/medium/hard .ids.json + public/paths.json (read-only over cards.json)
npm run enrich       # (re)build public/enrichment.json, keyed by id (read-only over cards.json)
```
Iterate against the running dev server + `npm test` (pure, fast, parallel-safe). Run the full
`npm run build && npm test && npm run test:e2e` only when **shipping** or when directly asked — it
must all pass before deploy.

## Parallel agents & when to build
- **Do NOT `npm run build` or `npm run test:e2e` unless shipping or directly asked.** Build is a
  deploy step (see `ship-dutch-srs`), not an after-every-edit reflex.
- `dist/`, `public/cards.json`, and `tsconfig.tsbuildinfo` are **shared single-copy state**.
  Concurrent builds clobber each other (one agent's `vite build` overwrites files while another's
  e2e reads a half-written `dist/`; shared `tsbuildinfo` corrupts incremental `tsc -b`). For genuinely
  parallel tasks, work in a **git worktree** (own `dist/`, own ports, own tsbuildinfo).
- E2E port is randomized (override with `E2E_PORT`); `npm run dev` defaults to 5173. Two dev servers
  on one port collide — reuse the one already running instead of spawning another.

## Browser automation
Use the **`playwright-cli` skill** (`.claude/skills/playwright-cli/`) for all browser work — it opens a
fresh, isolated context (`playwright-cli open --browser=chrome`, resize `390 844` for iPhone). Don't
attach to the user's already-open browser/tab.

## Where things live
| Area | Path | Notes |
|---|---|---|
| Shared types | `src/types.ts` | `Card`, `Direction`, `ReviewState`, `ProgressData`, `itemKey()` |
| SRS stages + intervals | `src/srs/stages.ts` | stage→interval, colors, category. **Pure.** |
| SRS scheduling | `src/srs/schedule.ts` | advance/demote/startLesson. **Pure, takes `now`.** |
| Answer checking | `src/review/answerCheck.ts` | normalize, levenshtein, accepted answers. **Pure.** |
| Accepted answers | `src/review/answerCheck.ts` | `acceptedAnswers()` = a single card's own answers (article variants + paren/placeholder stripping). **No cross-card synonym pooling** — collisions handled by hints, not acceptance. **Pure.** |
| Session queue | `src/review/session.ts` | build queues, `createSession()`. **Pure.** |
| Storage | `src/storage/progress.ts` | localStorage load/save/export/import/reset |
| Card loading | `src/data/loadCards.ts`, `src/data/cards.ts` | fetch + index + `useCards()` hook |
| Orchestration | `src/App.tsx` | owns all state, screen routing, wires logic→UI |
| Screens | `src/screens/` | Dashboard, Lessons, Reviews, Summary, Settings |
| Shared quiz engine | `src/components/Quiz.tsx` | used by both Reviews and Lessons quiz |
| Styles | `src/styles/base.css` (tokens + dark mode), `app.css` (components) |
| Vocab importers (staging) | `scripts/convert-anki.mjs`, `scripts/convert-nt2lex.mjs`, `scripts/clean-cards.mjs` | write `scripts/import/*.staging.json`, never `cards.json` |
| Card DB merge (sole writer) | `scripts/import-merge.mjs` | append-only, dedupes + assigns next-free ids |
| E2E | `tests/e2e.mjs` | standalone Playwright script |
| Deploy | `.github/workflows/deploy.yml` | uploads prebuilt `dist/` |

## Core conventions
- **Pure logic stays pure.** `src/srs/` and `src/review/` never call `Date.now()` or touch the
  DOM/localStorage — time is passed in as `now: number`. Tests depend on this. Use `src/util/now.ts`
  (`now()`) only in UI/`App.tsx`; it reads `window.__NOW__` if set (test/E2E clock injection).
- **`App.tsx` owns state.** Screens are presentational; they get data + callbacks as props.
  Don't add a state library or context unless a screen genuinely needs deep state.
- **Two directions = two items.** A card `c12` has items `c12:nl_en` and `c12:en_nl`, each with its
  own `ReviewState`. Key helpers: `itemKey(cardId, dir)` / `parseItemKey(key)` in `types.ts`.
- **Persist immutably + save together.** Update progress via `setState(...)`/`updateSettings(...)`
  (return new `ProgressData`), then `saveProgress(next)`. `App.tsx` does both in its setProgress callbacks.
- **Comments:** default none. Only document a non-obvious *why* (see the two `Quiz.tsx` comments).
- **TDD for pure logic.** Add tests in the co-located `*.test.ts` first, then implement.

## Non-obvious gotchas (read before touching these)
- **Wrong-answer requeue timing** (`Quiz.tsx`): on a wrong answer, do NOT call `session.submit(false)`
  immediately — that advances `current()` and the feedback panel would show the *next* card's answer.
  The requeue happens on "Continue" (`advanceAfterWrong`). The input is `readOnly` (not `disabled`) in
  the wrong phase so iOS keeps focus + the keyboard up; Enter-to-continue therefore rides the input's
  own `onKeyDown`/`submit()` (no window listener). The next-arrow button uses `onMouseDown`
  preventDefault so tapping it doesn't blur the input and collapse the keyboard.
- **Deploy serves prebuilt `dist/`**, committed to the repo. CI does NOT run `npm ci`/build (it hung
  on the runner). You must `npm run build` and commit `dist/` for changes to go live. See `docs/DEPLOY.md`.
- **No Jekyll.** `public/.nojekyll` exists and Pages `build_type` is `workflow`. Don't re-enable a
  branch source or add a Jekyll workflow — it will fight the deploy.
- **`base: "./"`** (relative) in `vite.config.ts` so the app works on the Pages subpath
  `/dutch-srs/`. Don't hardcode absolute `/` asset paths. `cards.json` is fetched via
  `${import.meta.env.BASE_URL}cards.json`.
- **E2E `npm ci` would also hang** — `tests/e2e.mjs` imports the Playwright bundled with the global
  `@playwright/cli` and launches `channel: "chrome"` (system Chrome), no project dep.

## Task guides (in `docs/`)
- `docs/ARCHITECTURE.md` — module map, data flow, SRS + session mechanics in detail
- `docs/RECIPES.md` — how to add a screen / setting / change SRS intervals / change answer checking
- `docs/TESTING.md` — unit tests, the E2E harness, driving the browser, common failures
- `docs/DEPLOY.md` — the GitHub Pages prebuilt-dist flow + the history of what went wrong
- `docs/VOCABULARY.md` — `cards.json` schema, the converter, adding/editing cards
- `docs/BACKLOG.md` — open features & bugs (start here for new work) + WaniKani logic comparison

Live: https://iniel.github.io/dutch-srs/ · Repo: https://github.com/iniel/dutch-srs
