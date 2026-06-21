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

## Enrichment sidecar (`public/enrichment.json`)
Dictionary-grade extras per card (senses, grammar/forms, IPA+audio, examples EN/RU, relations,
register/topic tags, usage notes, etymology), keyed by `Card.id`. Built by `scripts/enrich-cards.mjs`
from Kaikki (Wiktextract Dutch) + Tatoeba. **Additive + display-only** — never feeds answer checking;
`cards.json` and the SRS/quiz layer are untouched. Loaded lazily and 404-tolerant
(`src/data/loadEnrichment.ts`), rendered by `src/components/WordDetail.tsx`.

### Regenerate
1. Download the gitignored dumps into `data/`:
   - Kaikki Dutch JSONL → `data/kaikki/kaikki-Dutch.jsonl`
     (`https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl`)
   - Tatoeba (`https://downloads.tatoeba.org/exports/`):
     `per_language/{nld,eng,rus}/{nld,eng,rus}_sentences.tsv.bz2` → `data/tatoeba/*.tsv`,
     and `links.tar.bz2` → `data/tatoeba/links.csv`
2. `npm run enrich` → writes `public/enrichment.json` + prints a coverage report.
3. `npm run build`, commit `public/enrichment.json` + `dist/`, deploy.

### Notes / limitations
- Matched by `lemma` (fallback article-stripped `dutch`) + POS. ~99% of cards enriched; the ~15 misses
  are pedagogical compounds not in Wiktionary ("de korte klank", "ik-vorm").
- **English Wiktionary carries no translations on Dutch entries**, so Russian comes only from
  Tatoeba example sentences (≈1150 cards have ≥1 RU example). There are no RU dictionary glosses.
- Auxiliary (hebben/zijn) is rarely present in the Kaikki Dutch conjugation data, so it is usually omitted.
- Caps to keep the file small: ≤4 senses, ≤3 examples/card, ≤12 items per relation list.
- Pure extractors live in `scripts/enrich/extract.mjs` (unit-tested in `extract.test.mjs`).
