# Vocabulary

Cards live in `public/cards.json` (committed) — this file is the **hand-owned source of truth**, not a
generated artifact. The first 1748 cards (ids `c0`–`c1747`) originally came from two TaalCompleet Anki
decks (`A1 · U1` … `A2 · U8`); three further levels — `A+`, `B1`, `B2` (~8350 cards, ids `c1748`+) — were
imported from the NT2Lex frequency list. 83 cards (ids within `c10162`–`c10786`, with gaps; groups
`Nederlands in gang · N`, **no `level`**) came from the *Nederlands in gang* textbook deck (see below). All of it now lives in
`cards.json` and is edited directly.

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

### `public/paths.json` — the data-defined progression paths
`public/paths.json` holds every path except the built-in **TaalCompleet** course (derived from
`Card.level` at runtime). Two shapes are supported, distinguished by the presence of `units`:

- **Difficulty tiers** — `{ id, name, unitSize, difficulties: [{ key, label, cardIds }] }`. Used by
  **Inburgering Online** (`id: "inburgering"`), emitted by `npm run a2:idlists`. The three tiers are made
  **disjoint** (walking easy → medium → hard, each id is kept only in its lowest tier), and the app chunks
  each tier into units of `unitSize` at load time.
- **Explicit units** — `{ id, name, units: [{ id, label, cardIds }] }`. Used by **Nederlands in gang**
  (`id: "nederlands-in-gang"`, units `nederlands-in-gang:chapter:1` … `:18`), emitted by `npm run import:nig`.
  It **also** carries `unitSize` + `difficulties` (one tier per chapter), because installed PWAs keep running
  their precached JS until the update is accepted but fetch `paths.json` fresh. A tier-only build crashes on
  a def without `difficulties`, and with it renders the same chapters, labelled "Hoofdstuk N 1". Keep every
  def readable by the previous shape; `scripts/nig-data.test.mjs` enforces it.

Each generator upserts **only its own path by id** (`scripts/paths-file.mjs`) and keeps the rest, written
atomically. Display order is TaalCompleet → Inburgering Online → Nederlands in gang. Ids are permanent, so
the file stays valid across card edits.

Caveat: re-running `a2:idlists` today is **not** a no-op for Inburgering. Hand edits since the last run
(`je`/`we`/`me` glosses → "… (unstressed)", the hand-added `die` card) no longer match `a2-mapping.json`, so
it would drop 4 easy-tier cards. Treat the committed Inburgering tiers as curated, and fix the mapping
before regenerating. See `docs/ARCHITECTURE.md` › Paths.

## Nederlands in gang — chapter path (`scripts/import-nig.mjs`)
Source: the AnkiWeb shared deck [304232421](https://ankiweb.net/shared/info/304232421) (2019 edition of the
textbook; fields `Front`, `Back`, `Hoofdstuk`, `Audio`). It has 1092 notes across chapters 1–18. The
2026 edition is not covered. Keep the archive at `data/nederlands-in-gang/source.apkg` (gitignored).

Committed provenance in `scripts/sources/`:
- `nig-source.json` — normalized notes (note id, chapter, original new-card position, raw front/back, audio
  file) + archive URL and SHA-256. The importer re-reads this file, so the `.apkg` is only needed to re-extract.
- `nig-corrections.json` — reviewed, per-note fixes: re-joined rows split across two Anki notes
  (`mergeWith`), explicit answer lists where `/` splitting is wrong, and `reuseId` links to an existing card
  (guarded by `expectedDutch`/`expectedEnglish`, so a later edit to that card fails the import loudly).
- `nig-mapping.json` — every source note → final card id (pinned on re-import; a changed archive
  checksum aborts). `nig-report.json` — counts per chapter, corrections, reviewed reuses.
- `nig-new-ids.json`, `nig-audio.json`, `nig-coverage.json`, `nig-baseline.json` — see below.

Rules: no note is dropped silently — each is mapped, merged into its pair, dropped by a reviewed `drop: true`
correction (recorded in `nig-mapping.json` as `dropped: true`, no `cardId`), or the import throws. Only an
exact match on normalized Dutch text + English answer set (whitespace, case, HTML) reuses an existing card
automatically. Every other reuse is a reviewed `reuseId` in `nig-corrections.json`, and a reviewed `reuseId`
overrides the pinned mapping. **Forms:** regular forms map to their lemma card (`broers (broer)` → `de broer`,
`kom (komen)` → `komen`, `andere` → `ander`), with `form: true` so the book recording is not attached to the
lemma. Irregular or meaning-shifting forms stay separate cards: irregular present tenses (`ben`, `heeft`,
modals), past tenses, comparatives, irregular plurals and diminutives (`wilde (willen)` → `dutch: "wilde"`,
`notes: "Book annotation: willen"`). A form never maps to a homograph (`kom` is never `de kom` = bowl).
Within a chapter a repeat is collapsed. Across chapters it stays as the **same id** in both
units, so it is learned and counted once. Chapters are numeric; inside a chapter, order is the Anki new-card
position, then note id (this is not verified against the book's page order).

```bash
npm run import:nig                                 # from scripts/sources/nig-source.json
node scripts/import-nig.mjs data/nederlands-in-gang/source.apkg   # re-extract the archive (+ audio)
node scripts/import-nig.mjs --dry-run              # print counts only; a re-run adds 0 cards
npm run enrich:nig                                 # enrich nig-new-ids.json, then finish:nig
```
`import:nig` appends new cards through `mergeCandidates` (next-free ids, strict signature), upserts the
path, and records new ids and per-card audio. `finish:nig` installs the Anki recording
(`public/audio/nederlands-in-gang/<sha256>.mp3`, relative URL) **only where the card has no dictionary
audio**, then writes the coverage report `nig-coverage.json` (per field: covered count + missing list).
`scripts/nig-data.test.mjs` pins the shipped data: the pre-import cards (hash in `nig-baseline.json`, checked
after stripping the reviewed gloss additions listed in `nig-review.json`) and the Inburgering path, all 1092
notes accounted for, 18 chapters rebuilt identically, no orphaned book card, every reviewed merge applied,
and every local recording present.

### Merge review (`scripts/nig-match/`)
The first import added 625 book cards. 336 of them turned out to be the same word as an existing card in a
different surface form (`beginnen = begin / start` vs `to begin`, `broers` vs `de broer`). A one-off review
re-matched them. That leaves 289 book cards, and the 18 chapters now hold 1039 unique cards. The scripts are
kept so a later edition can be reviewed the same way. Working files go to the gitignored
`scripts/import/nig-review/`.

```bash
node scripts/nig-match/candidates.mjs       # items.json + batch-NN.json: candidates per book card, tiers A/B/C
node scripts/nig-match/lookup.mjs nl|en <q> # search the deck (used by reviewers)
node scripts/nig-match/validate.mjs [--plan-second]  # check verdict-NN.json; plan the second blind pass
node scripts/nig-match/report.mjs           # nig-review.txt: agreed vs disputed, $-marks override
node scripts/nig-match/apply.mjs            # reuseId corrections + gloss additions (+ nig-review.json)
npm run import:nig && node scripts/nig-match/prune.mjs && npm run finish:nig
node scripts/nig-match/unmatched.mjs        # docs/nederlands-in-gang/unmatched/hoofdstuk-NN.txt: unmatched "Dutch — English" pairs
```
**Second round (hand review of the 289 leftovers).** One subagent per chapter searched the existing cards
again, then each line in `docs/nederlands-in-gang/unmatched/hoofdstuk-NN.txt` got a hand-set final status:
`KEEP`/`ADD` (stays a book card), `EXTRA` (merge into the first card named, appending the book's answers),
or `DROP` (merge into the first card named, or with no card named, drop the note from the chapter).
`node scripts/nig-match/apply-unmatched.mjs` turns the files into `reuseId`/`drop` corrections, gloss
additions and `nig-review.json` decisions (`by: "unmatched review"`), then the same
`import:nig && prune.mjs && finish:nig` run applies them. EXTRA lines whose named card is a different word
(`hoor` → `horen`, `straks` → `tot straks`, `ja hoor` → `ja`, `de bos` → `het bos`) stayed separate cards.
Result: 181 merged, 20 merged with 24 added answers, 5 dropped, 83 book cards remain; the chapters hold 930
unique cards. The annotated files are the record of these decisions, so **do not re-run `unmatched.mjs`**:
it overwrites them.
- **Candidates** are found by headword, book annotation, the paradigm of existing cards (`notes: "forms: …"`
  and enrichment grammar), near-forms, other book cards, and shared English answers. **Tier A** (one
  headword match that already accepts every book answer, and no competing form) is accepted without review.
- **Reviewers** are parallel subagents, one batch of ~30 each, following
  `scripts/nig-match/REVIEWER-INSTRUCTIONS.md`. Their verdicts are `reuse`, `reuse-add-sense` (append 1–3
  English answers to the target) or `keep-new`. A second blind reviewer re-judged every low- or
  medium-confidence verdict and every `keep-new` that had candidates. If the two pick the same target and only
  one adds a sense, the card is reused without the new sense. Other disagreements go to the more confident
  reviewer, and ties stay separate cards.
- `prune.mjs` is the one deliberate exception to append-only. It deletes only book ids that nothing
  references any more (cards, enrichment, id and audio lists, unused mp3s), and asserts that no other card
  changed. It also records each deleted id's target in `src/data/cardRedirects.json`. The app moves saved
  progress (SRS state, lesson queue, disabled directions) onto the target whenever progress is loaded or a
  backup is imported (`redirectCardIds` in `src/storage/progress.ts`), keeping the more advanced state when
  both cards were studied. Never remove an entry from that file: old backups may still hold the old ids.

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
1. Download the gitignored dumps into `data/` (sizes are of the copies last used, fetched 2026-10-05;
   Kaikki files are rolling snapshots, FreeDict is versioned):
   - Kaikki Dutch (English Wiktionary) → `data/kaikki/kaikki-Dutch.jsonl` (256 MB)
     `https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl`
   - Russian Wiktionary raw data → gunzip to `data/kaikki/kaikki-ru.jsonl` (308 MB gz)
     `https://kaikki.org/ruwiktionary/raw-wiktextract-data.jsonl.gz`
   - Dutch Wiktionary raw data → gunzip to `data/kaikki/kaikki-nl.jsonl` (133 MB gz)
     `https://kaikki.org/nlwiktionary/raw-wiktextract-data.jsonl.gz`
   - Kaikki English (English Wiktionary, for EN→RU translation tables) → `data/kaikki/kaikki-en.jsonl` (3.3 GB)
     `https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl`
   - FreeDict/WikDict 2025.11.23 → untar to `data/freedict/{nld-rus,eng-rus}/*.tei`
     `https://download.freedict.org/dictionaries/nld-rus/2025.11.23/freedict-nld-rus-2025.11.23.src.tar.xz`,
     `https://download.freedict.org/dictionaries/eng-rus/2025.11.23/freedict-eng-rus-2025.11.23.src.tar.xz`
   - Tatoeba (`https://downloads.tatoeba.org/exports/`):
     `per_language/{nld,eng,rus}/{nld,eng,rus}_sentences.tsv.bz2` → `data/tatoeba/*.tsv`,
     and `links.tar.bz2` → `data/tatoeba/links.csv`
2. `npm run enrich` → rewrites `public/enrichment.json` for every card + prints a coverage report.
   `npm run enrich -- --ids path/to/ids.json` enriches only the listed ids and **merges** the result into
   the existing file; every other entry is kept byte-for-byte. A card with no dictionary match just has no
   entry (it is never removed from `cards.json`).
3. `npm run build`, commit `public/enrichment.json` + `dist/`, deploy.

### Notes / limitations
- Matched by `lemma` (fallback article-stripped `dutch`) + POS. ~99% of cards enriched; the ~15 misses
  are pedagogical compounds not in Wiktionary ("de korte klank", "ik-vorm").
- Russian glosses (`glossRu`) come from Russian Wiktionary, FreeDict NL–RU, Dutch Wiktionary translation
  tables, and (for non-book cards) EN→RU bridges through the card's English. Russian examples come from Tatoeba.
- **Nederlands in gang cards** (`group` starts with `Nederlands in gang ·`) take a stricter route
  (`scripts/enrich/book-entry.mjs`). An inflected form (`kom`, `dagen`, `ben`) is resolved to its lemma
  through Kaikki `form_of`, confirmed by gloss overlap or by the lemma's own paradigm listing the form, and
  grammar comes from the lemma. Senses are filtered to the card's meaning, so `kom` is never "bowl". Russian
  glosses skip the POS-blind EN→RU bridges and are looked up by **headword + part of speech**
  (`scripts/enrich/ru-pos.mjs`), so `ben` gets "быть", not the possessive "его". Tatoeba examples are still
  matched by surface word, so function words can show another sense (`wat` "a little" → "Wat is dat?").
- 684 Russian glosses on pre-book cards still contain raw wiki links (`[[школьный|школьная]] [[доска]]`).
  The extractors now strip them, so the next full `npm run enrich` cleans them up.
- Auxiliary (hebben/zijn) is rarely present in the Kaikki Dutch conjugation data, so it is usually omitted.
- Caps to keep the file small: ≤4 senses, ≤3 examples/card, ≤12 items per relation list.
- Pure extractors live in `scripts/enrich/extract.mjs` (unit-tested in `extract.test.mjs`).
