# Vocabulary

Cards live in `public/cards.json` (committed). The first 1748 cards (ids `c0`–`c1747`) come from two
TaalCompleet Anki decks (`A1 · U1` … `A2 · U8`). Three further levels — `A+`, `B1`, `B2` (~8350 cards,
ids `c1748`+) — are appended from the NT2Lex frequency list; see "Frequency vocabulary" below.

## `cards.json` schema
Array of `Card` (see `src/types.ts`):
```json
{
  "id": "c0",                      // stable, unique; assigned sequentially by the converter
  "group": "A1 · 1.1",             // lesson group label (level · section)
  "dutch": "het jaar",            // prompt for EN→NL accepts with/without article
  "english": ["year"],            // accepted answers for NL→EN (array = multiple aliases)
  "type": "word",                 // "word" | "phrase" | "sentence"
  "cefr": "A2",                    // optional "A1"|"A2"|"B1"|"B2"; per-word badge (NT2Lex cards only)
  "pos": "n.",                     // optional, shown in notes
  "lemma": "jaar",                // optional
  "notes": "n."                    // optional, shown on lesson info + wrong-answer feedback
}
```
The CEFR badge (`cefrBadge()` in `src/srs/levels.ts`) shows only when a card's CEFR differs from the
level it sits in — so it appears on the mixed `A+` level (`"A1 CEFR"`/`"A2 CEFR"`) but is hidden on the
A1/A2/B1/B2 levels whose name already conveys it.
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

## Frequency vocabulary — levels `A+`, `B1`, `B2` (`scripts/convert-nt2lex.mjs`)
Source: `NT2Lex-CGN+ODWN-v01.tsv` (repo root) — a CEFR-graded Dutch frequency list (one row per word
sense; columns `word`, `tag`, then `F@A1 … U@TOTAL` per band). It carries **no translations** — the quiz
answer comes from Kaikki glosses at convert time, everything else from the normal enrichment pass.

```bash
npm run convert          # rebuild the Anki block first (owns c0..c1747)
npm run convert:nt2lex   # append A+/B1/B2; consumes + rewrites cards.json
npm run clean            # drop dup cards + junk/truncated glosses (drop-only, never renumbers)
npm run enrich           # generate enrichment.json for all cards (new ones included)
```
Run order matters: `convert:nt2lex` reads the Anki block, so it must run **after** `convert`. Re-running
`convert` alone drops the appended levels. `convert:nt2lex` is idempotent (strips any prior `A+`/`B1`/`B2`
cards before rebuilding) and never touches the Anki ids/progress. `clean` runs **after** both and **before**
`enrich` so enrichment keys match the final card set.

What it does:
- Keeps content words only (NT2Lex tags `N( WW( ADJ( BW(`), one per lemma, at its lowest band.
- Drops words already in the app, and words with no usable Kaikki gloss (~4000 dropped).
- Bands → levels: `A1`/`A2` → `A+`, `B1` → `B1`, `B2` → `B2`. `cefr` keeps the original band.
- `english`: short pieces of the first Kaikki sense's glosses (parentheticals stripped, split on `;,/or`,
  leading `a/an/the` removed, ≤4 words each). Nouns get their `de`/`het` article prepended to `dutch`.
- Frequency-sorted (`U@TOTAL`) within each level, chunked into groups of 25 (`A+ · 1`, `A+ · 2`, …).
- Shares the Kaikki streaming index with `enrich-cards.mjs` (`scripts/enrich/kaikki-index.mjs`).

## Cleaning pass (`scripts/clean-cards.mjs`)
Regen-safe, **idempotent, drop-only** (never renumbers, so `enrichment.json` and saved progress stay valid).
Runs after `convert:nt2lex`, before `enrich`. It:
- drops glosses that are pure function words (`of`, `from`, `to be`, …) unless that would empty the card;
- strips register tags (`(formal)`, `(informal)`, …) and `etc.`/`e.g.`/`i.e.` remnants from glosses;
- salvages truncated/unbalanced-parenthesis fragments (`article (een` → `article`, `moss …)` → `moss …`);
- drops exact-duplicate cards (same article-stripped Dutch + same English), keeping the lowest id.

Place-name fragment junk (`schapenbout` → `Zeeland`, `Netherlands`) is prevented at the source in
`convert-nt2lex.mjs` (`answersFromGlosses` drops stopword/proper-noun comma-pieces), so curated cards whose
answer is legitimately a proper noun (`CD`, `Muslim`) are never touched. Audit with
`node scripts/enrich/analyze-collisions.mjs` (writes `scripts/enrich/collisions-report.json`).

## Collisions handled at runtime (`src/review/synonyms.ts`)
Two words can legitimately share a surface form (NL→EN: `zijn` = "to be" / "his") or a meaning
(EN→NL: "nice" = `leuk` / `aardig` / `fijn`). Rather than merge cards, `buildAnswerPools()` indexes every
card and `pooledAccepted()` widens the accepted set so any sibling answer counts as correct in both
directions; the bare answer for a parenthetical/placeholder gloss (`cousin (male)` → also `cousin`,
`to call somebody` → also `to call`) is accepted here too, **without** mutating the EN→NL prompt. The Quiz
prompt also shows the part of speech and an optional, direction-safe example sentence as a disambiguation
hint. Tradeoff: English homonyms over-accept (e.g. "state" = `staat` and `verklaren`); the POS/example hint
mitigates and this is intentional.

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
