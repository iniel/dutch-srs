# Dutch SRS

Personal local-first SRS for Dutch vocabulary, WaniKani/Tsurukame-style review flow.
Each card is drilled both directions (NL→EN and EN→NL) as independent SRS items.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

Build / preview / tests:

```bash
npm run build
npm run preview
npm test           # 85 unit tests (vitest)
npm run test:e2e   # full-flow browser test (uses system Chrome)
```

## Vocabulary

`public/cards.json` is generated from the two TaalCompleet `.apkg` decks in the repo root:

```bash
npm run convert    # regenerates public/cards.json
```

`scripts/convert-anki.mjs` reads the Anki SQLite, maps Dutch + English fields
(Persian/Farsi and audio ignored), groups by Section (`A1 · 1.1` …), and dedupes.

## SRS

Stages: Apprentice 1–4 (4h, 8h, 1d, 2d), Guru 1–2 (1w, 2w), Master (1m), Enlightened (4m), Burned.
Correct → next stage; wrong → drop 1 stage (2 from Guru+), clamped at Apprentice 1.
Progress lives in `localStorage`; export/import/reset under Settings.

## Layout

- `src/srs/` — stages + scheduling (pure)
- `src/review/` — answer checking + session queue (pure)
- `src/storage/` — localStorage progress
- `src/screens/`, `src/components/` — UI
