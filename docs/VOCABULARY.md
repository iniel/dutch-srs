# Vocabulary

Cards live in `public/cards.json` (committed) — this file is the **hand-owned source of truth**, not a
generated artifact. The first 1748 cards (ids `c0`–`c1747`) originally came from two TaalCompleet Anki
decks (`A1 · U1` … `A2 · U8`); three further levels — `A+`, `B1`, `B2` (~8350 cards, ids `c1748`+) — were
imported from the NT2Lex frequency list. All of it now lives in `cards.json` and is edited directly.

**Ids are permanent and never renumbered.** Fixes are plain edits to `cards.json`. New bulk vocabulary is
imported through the append-only staging flow (see "Importing new vocabulary" below) — the importers never
rewrite the live file. This is why enrichment/paths/progress (all keyed by id) stay valid across edits.

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

## Importing new vocabulary (append-only staging flow)
`cards.json` is owned data — the importers **never** write to it. They emit throwaway *staging candidates*
to `scripts/import/*.staging.json` (gitignored); a single merge step appends the genuinely-new ones with
next-free ids. Nothing is renumbered.

```bash
npm run convert                                   # TaalCompleet decks -> scripts/import/anki.staging.json
npm run convert:nt2lex                            # NT2Lex freq list  -> scripts/import/nt2lex.staging.json
npm run clean scripts/import/nt2lex.staging.json  # drop junk glosses + dup candidates (in place)
npm run import:merge                              # dedupe vs live + append new cards to public/cards.json
```
`import:merge` (`scripts/import-merge.mjs`) is the **only** writer of `cards.json`. It skips any candidate
whose article-stripped Dutch + English set already exists, assigns ids `c{max+1…}` to the rest, appends
them, and asserts every existing id is unchanged. Run it deliberately — a normal working tree never needs it.

Source decks: `TaalCompleet_A1_*.apkg`, `TaalCompleet_A2_*.apkg` in the repo root, and
`NT2Lex-CGN+ODWN-v01.tsv`. They are **gitignored** — keep local copies; only `cards.json` is committed.
A teammate without them can't import, but can still edit `cards.json` directly (the normal way to fix cards).

## How the converter works (`scripts/convert-anki.mjs`)
- `.apkg` is a zip; it `unzip`s `collection.anki21` (uncompressed SQLite) to a temp dir.
- Reads `col.models` (field names) + `notes.flds` (fields joined by `\x1f`).
- TaalCompleet fields: `Unit | Section | Dutch | POS | English | Persian | Lemma | Other forms | Sound`.
  Uses **Dutch + English (+ POS/Lemma/Other forms)**. **Ignores Persian/Farsi and audio.**
- `english` is split on `, ; /` and `or` into multiple accepted answers.
- HTML and `[sound:…]` tags are stripped.
- Dedupes by `group|dutch|english`. Sorts by level then numeric section. Assigns **throwaway** candidate
  ids `c0..cN` (reassigned to next-free ids by `import:merge`).
- Uses Node's built-in `node:sqlite` (Node 22+) — no dependency.
- Writes `scripts/import/anki.staging.json`, never `public/cards.json`.

## Frequency vocabulary — levels `A+`, `B1`, `B2` (`scripts/convert-nt2lex.mjs`)
Source: `NT2Lex-CGN+ODWN-v01.tsv` (repo root) — a CEFR-graded Dutch frequency list (one row per word
sense; columns `word`, `tag`, then `F@A1 … U@TOTAL` per band). It carries **no translations** — the quiz
answer comes from Kaikki glosses at convert time, everything else from the normal enrichment pass.

Import via the staging flow (see "Importing new vocabulary" above): `convert:nt2lex` reads the live card DB
**read-only** to skip words already present, then writes only the new A+/B1/B2 candidates to
`scripts/import/nt2lex.staging.json`. It does **not** rewrite or renumber `cards.json`. Run `clean` on that
staging file, then `import:merge` to append the new cards; ids are permanent from then on.

### A2-list overrides — historical (`scripts/apply-a2-overrides.mjs`)
The curated decisions from the A2 exam-list audit (marks in `a2-analysis.txt`) are **already baked into the
committed `cards.json`**, so this script is retired from the routine flow (no `npm run a2:apply`). The file +
`scripts/a2-overrides.json` are kept for provenance. Because ids are now permanent, further sense/gloss fixes
are **direct edits to `cards.json`** — no anchor-matching, no re-apply, no id volatility. `npm run a2:map`
still (re)builds `a2-overrides.json` + `a2-mapping.json` from `a2-analysis.txt`, and `npm run a2:idlists`
still emits the `easy.ids.json` / `medium.ids.json` / `hard.ids.json` tier lists (read-only over `cards.json`).

### `public/paths.json` — the "Inburgering Online" progression path
`npm run a2:idlists` also emits `public/paths.json`, the runtime definition of the **Inburgering Online**
path (the app's second progression track; the built-in **TaalCompleet** path is derived from `Card.level`
at runtime and is *not* in this file). Shape:
`{ version, paths: [{ id: "inburgering", name, unitSize: 100, difficulties: [{ key, label, cardIds }] }] }`.
The three tiers are made **disjoint** here: walking easy → medium → hard, each card id is kept only in its
lowest tier (so no card is drilled twice within the path). The app chunks each tier into units of `unitSize`
at load time. It references A+ ids, which are now **permanent**, so `paths.json` stays valid across edits —
only regenerate it (and `dist/`) after an `import:merge` actually appends new cards. See
`docs/ARCHITECTURE.md` › Paths.

What it does:
- Keeps content words only (NT2Lex tags `N( WW( ADJ( BW(`), one per lemma, at its lowest band.
- Drops words already in the app, and words with no usable Kaikki gloss (~4000 dropped).
- Bands → levels: `A1`/`A2` → `A+`, `B1` → `B1`, `B2` → `B2`. `cefr` keeps the original band.
- `english`: short pieces of the first Kaikki sense's glosses (parentheticals stripped, split on `;,/or`,
  leading `a/an/the` removed, ≤4 words each). Nouns get their `de`/`het` article prepended to `dutch`.
- Frequency-sorted (`U@TOTAL`) within each level, chunked into groups of 25 (`A+ · 1`, `A+ · 2`, …).
- Shares the Kaikki streaming index with `enrich-cards.mjs` (`scripts/enrich/kaikki-index.mjs`).

## Cleaning pass (`scripts/clean-cards.mjs`)
**Idempotent, drop-only** pre-merge cleaner. It takes an explicit staging file
(`node scripts/clean-cards.mjs <staging.json>`) and refuses to run without one, so it can never touch
`public/cards.json`. Run it on `scripts/import/nt2lex.staging.json` after `convert:nt2lex`, before
`import:merge`. It:
- drops glosses that are pure function words (`of`, `from`, `to be`, …) unless that would empty the card;
- strips register tags (`(formal)`, `(informal)`, …) and `etc.`/`e.g.`/`i.e.` remnants from glosses;
- salvages truncated/unbalanced-parenthesis fragments (`article (een` → `article`, `moss …)` → `moss …`);
- drops exact-duplicate cards (same article-stripped Dutch + same English), keeping the lowest id.

Place-name fragment junk (`schapenbout` → `Zeeland`, `Netherlands`) is prevented at the source in
`convert-nt2lex.mjs` (`answersFromGlosses` drops stopword/proper-noun comma-pieces), so curated cards whose
answer is legitimately a proper noun (`CD`, `Muslim`) are never touched. Audit with
`node scripts/enrich/analyze-collisions.mjs` (writes `scripts/enrich/collisions-report.json`).

## Collisions handled at runtime (`src/review/answerCheck.ts`)
Two words can legitimately share a surface form (NL→EN: `zijn` = "to be" / "his") or a meaning
(EN→NL: "nice" = `leuk` / `aardig` / `fijn`). **Cross-card answers are NOT pooled** — each item is
checked against only its own card's answers (`acceptedAnswers()`), so the learner must answer the exact
word being drilled. Collisions are disambiguated for the learner by hand-curated hints
(`src/data/hints.ts`) plus the part of speech and an optional, direction-safe example sentence on the
Quiz prompt. `acceptedAnswers()` still accepts the bare answer for a parenthetical/placeholder gloss
(`cousin (male)` → also `cousin`, `to call somebody` → also `to call`) — that's a single-card
convenience, **not** synonym pooling, and never mutates the EN→NL prompt.

## Editing cards directly
Hand-editing `public/cards.json` is the **normal, preferred** way to fix cards — it is owned data. Change
glosses, articles, notes, POS, add senses, whatever. Keep the schema, and **never change an existing `id`**
(that orphans the item's saved progress and its enrichment/paths entries). To add a card by hand, give it
`c{highest+1}`. Then `npm run enrich` / `npm run a2:idlists` if you touched anything they key on, `npm run
build`, commit `cards.json` + `dist/`, deploy.

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
