# Vocabulary

Cards live in `public/cards.json` (committed). 1748 cards, 170 groups (`A1 · 1.1` … `A2 · 8.12`),
generated from two TaalCompleet Anki decks.

## `cards.json` schema
Array of `Card` (see `src/types.ts`):
```json
{
  "id": "c0",                      // stable, unique; assigned sequentially by the converter
  "group": "A1 · 1.1",             // lesson group label (level · section)
  "dutch": "het jaar",            // prompt for EN→NL accepts with/without article
  "english": ["year"],            // accepted answers for NL→EN (array = multiple aliases)
  "type": "word",                 // "word" | "phrase" | "sentence"
  "pos": "n.",                     // optional, shown in notes
  "lemma": "jaar",                // optional
  "notes": "n."                    // optional, shown on lesson info + wrong-answer feedback
}
```
`group` ordering matters: lessons are introduced in array order (which the converter sorts by level then
numeric section). Don't shuffle the array.

## Regenerate from the decks
```bash
npm run convert     # node scripts/convert-anki.mjs
```
Prints: total cards, group count, dropped count, first/last group, a 3-card sample. Sanity-check those.

Source decks: `TaalCompleet_A1_*.apkg`, `TaalCompleet_A2_*.apkg` in the repo root. They are **gitignored**
(36 MB) — keep local copies; only the generated `cards.json` is committed. If a teammate lacks the
`.apkg` files, they can't regenerate, but they can still edit `cards.json` directly.

## How the converter works (`scripts/convert-anki.mjs`)
- `.apkg` is a zip; it `unzip`s `collection.anki21` (uncompressed SQLite) to a temp dir.
- Reads `col.models` (field names) + `notes.flds` (fields joined by `\x1f`).
- TaalCompleet fields: `Unit | Section | Dutch | POS | English | Persian | Lemma | Other forms | Sound`.
  Uses **Dutch + English (+ POS/Lemma/Other forms)**. **Ignores Persian/Farsi and audio.**
- `english` is split on `, ; /` and `or` into multiple accepted answers.
- HTML and `[sound:…]` tags are stripped.
- Dedupes by `group|dutch|english`. Sorts by level then numeric section. Reassigns ids `c0..cN`.
- Uses Node's built-in `node:sqlite` (Node 22+) — no dependency.

## Editing cards directly
Hand-editing `public/cards.json` is fine for small fixes. Keep the schema, keep ids unique and stable
(changing an id orphans that item's saved progress). Then `npm run build`, commit `cards.json` + `dist/`,
deploy.

## Adding a different deck / language
Adjust the field mapping in `convert-anki.mjs` (`fieldIndex` + the `get(...)` calls) to match the new
deck's model field names, and the `DECKS` array. The rest of the app is language-agnostic except UI
labels ("Dutch → English") in `src/components/Quiz.tsx` and placeholders.
