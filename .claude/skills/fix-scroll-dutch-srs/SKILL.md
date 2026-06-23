---
name: fix-scroll-dutch-srs
description: Use when fixing scroll, overflow, clipped-content, cut-off, or unreachable-button bugs on any screen of the Dutch SRS app, especially on iPhone / iOS / mobile where content is cut off or a screen won't scroll. Covers the scroll-lock layout model and the iPhone-simulator verification loop that earlier fixes skipped.
---

# Fix scroll bugs in Dutch SRS

## Why this exists
Scroll has been "fixed" five times (`501c771`, `b935ea6`, `044d355`, `78b0145`, `e89bfc6`) because agents change CSS by eyeballing, test only the screen they touched, test only with short content that hides the bug, and never open a phone-sized viewport. Don't repeat that. **A scroll fix is not done until you've verified every screen in the iPhone simulator with tall content.**

## The layout model (learn this before editing)
Two screen families, governed by `useVisualViewportVars(...)` in `src/App.tsx`:

- **Document-scroll screens** (default): dashboard, search, wordlist, levelwords, worddetail, summary, settings. Plain `.screen` flex-column; the **window** scrolls. `body` is normal flow.
- **Scroll-locked screens**: `reviews` and `lessons` only. `useVisualViewportVars` adds `body.scroll-locked` (`base.css`: `position:fixed; inset:0; overflow:hidden`) and sets `--vvh`/`--vvt` from `window.visualViewport` (keeps a bottom input above the iOS keyboard).

**The trap that keeps biting:** on a scroll-locked screen the window CANNOT scroll. Any content taller than `--vvh` is **clipped and unreachable** unless that screen provides its OWN inner scroll region. There is no fallback.

**The required shell for a locked screen** (copy `.session-screen` / `.lesson-screen` in `app.css`):
```
fixed shell:  position:fixed; top:var(--vvt,0); height:var(--vvh,100dvh); overflow:hidden; display:flex; flex-direction:column
inner scroll: flex:1 1 auto; min-height:0; overflow-y:auto   ← min-height:0 is mandatory or flex won't let it shrink
bottom nav:   flex:0 0 auto                                  ← stays pinned, never sticky inside a non-scrolling parent
```
A reused scroll container keeps its `scrollTop` when content swaps (e.g. lesson card → next card). Reset it: `ref.current?.scrollTo(0,0)` in the effect keyed on the index.

## Diagnose before you touch CSS
Read the actual numbers; never guess. `scroll-diag.js` (in this skill dir) dumps scroll health of the current screen:
```bash
playwright-cli eval "$(cat .claude/skills/fix-scroll-dutch-srs/scroll-diag.js)"
```
A `clipped` entry (content > box, `overflowY:hidden`) = the bug. On a locked screen `bodyLocked:true` + `bodyOverflows:true` + empty `scrollers` = content is clipped with no escape.

## The verification loop (non-negotiable)
iPhone 12 Pro = **390×844**.
```bash
playwright-cli open http://localhost:5173 && playwright-cli resize 390 844
```
1. **Use TALL content.** Short cards fit and hide the bug. In Lessons, step `Next` until `scroll-diag` shows `scrollHeight > clientHeight`; pick a word with rich detail (meanings + examples + relations + etymology).
2. **Confirm it scrolls:** set the scroller's `scrollTop` to a large number, read it back — it must reach `scrollHeight - clientHeight`, and the bottom nav must stay within the 844 viewport.
3. **Check card transitions:** scroll down, advance, assert `scrollTop === 0`.
4. **Regress EVERY screen** (the list above), not just the one you changed — measure each with `scroll-diag`. A locked-screen fix that leaks `position:fixed`/`overflow:hidden` rules onto document screens silently breaks them.

Refs in `playwright-cli` snapshots go stale every snapshot — re-`snapshot` to get fresh `eXX` refs before each `click`, or click via `eval` on a CSS selector.

## Then ship
`npm run build && npm test && npm run test:e2e` must all pass. Deploy commits prebuilt `dist/` — use the `ship-dutch-srs` skill.

## Red flags — you are about to repeat history
- Editing `overflow`/`height`/`position` without first running `scroll-diag` on a phone viewport.
- "It scrolls now" after testing one screen, or only with the first (short) card.
- Adding `overflow:auto` to `body` or `#root` to "fix" a locked screen — fix the screen's inner region, don't unlock the body.
- Putting the scroll on the wrong element so the bottom nav scrolls away instead of staying pinned.
