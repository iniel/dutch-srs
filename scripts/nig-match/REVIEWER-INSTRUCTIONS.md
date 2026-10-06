# Reviewer instructions: Nederlands in gang (NIG) merge

You are a Dutch-language specialist. A Dutch vocabulary SRS app (repo `/Users/svetlana/Development/dutch-srs`)
imported the "Nederlands in gang" textbook deck. 625 book entries did not match an existing card exactly and
were added as **new book cards**. Many of them duplicate existing cards. You decide, per book card, whether
the textbook chapter should drill an **existing card** instead.

Each item in your batch file has:
- `nigCardId`: the new book card being judged, plus `card` (its Dutch, English answers, optional book
  `annotation` = the lemma the book printed in parentheses, dictionary glosses, grammar).
- `sources`: the raw textbook rows (chapter, front, back). The front is what the book printed.
- `candidates`: possible existing cards with `reasons` (`headword`, `annotation`, `paradigm` = the candidate
  lists this word among its inflected forms, `book-duplicate` = another new book card, `near-form`,
  `english` = shares an English answer). Candidates are only hints and may all be wrong.

## Actions
- `reuse`: the book entry teaches the **same word in the same sense** as `targetId`, and the target's
  English answers already convey the book's meaning. Cosmetic differences count as the same: a missing
  `to ` on verbs, articles, spelling variants, a synonym in the same sense that the target already accepts,
  or the book translating an inflected form (`brothers`) where the target has the lemma (`brother`).
- `reuse-add-sense`: same word and same (or core) sense, but the target's answers lack the book's
  meaning, so a learner answering with the book's gloss would be marked wrong. Give `addGloss`: 1–3 short
  English answers to append, written in the target's style (verbs as `to start`, nouns without articles).
  Never add an inflected English gloss (`brothers`, `lives`). Never add a sense to a card for a different
  homograph.
- `keep-new`: anything else. Examples: a different sense or homograph, an irregular or meaning-shifting
  form, a book phrase with no equivalent card, or a proper noun the deck lacks.

## Forms policy (decided by the owner, apply strictly)
- **Regular forms map to the existing lemma card (`reuse`, subtype `regular-form`):**
  - regular plurals (`-en`, `-s`, `-'s`, with regular spelling changes: `dagen`→`dag`, `huizen`→`huis`,
    `broers`→`broer`, `paprika's`→`paprika`);
  - regular present-tense conjugations of verbs with a regular present tense (`woon`/`woont`→`wonen`,
    `kom`/`komt`→`komen`, `werk`→`werken`), including split separable verbs (`geeft les`→`lesgeven`) and
    inversion forms (`woon je`);
  - inflected adjectives with `-e` (`andere`→`ander`, `welke`→`welk`, `grote`→`groot`);
  - a book phrase that is a conjugated instance of an existing infinitive expression (`ik heb honger` ↔
    `honger hebben`), if the verb form inside is regular.
- **These stay separate (`keep-new`, subtype `irregular-form`):**
  - forms of verbs with an irregular present tense (`zijn`: `ben`/`bent`/`is`; `hebben`: `heeft`;
    modals `kan`/`kun`/`kunt`, `wil`/`wilt`, `mag`, `zal`/`zult`);
  - every past tense and past participle (`wilde`, `woonde`, `gekomen`);
  - comparatives and superlatives (`jonger`, `langer`, `beste`);
  - irregular plurals (`kinderen`, `steden`, `schepen`);
  - diminutives, unless the deck already has that exact diminutive.
- A form never maps to a card for a different word that happens to share the spelling. `kom` (komen)
  must never map to `de kom` = bowl. `dagen` (dag) must never map to `dagen` = to dawn. `heet` = is called
  must never map to `heet` = hot.

## Other rules
- The app checks answers against **one card only** (no pooling of synonyms across cards). Homographs and
  different senses stay separate cards, so do not merge two senses just because the spelling matches.
- Do not reuse a card that is a longer phrase or sentence merely containing the word (`weet` must not map
  to `Ik weet het niet.`). Phrases reuse only the same phrase (punctuation and capitals ignored, e.g.
  `het gaat wel` ↔ `Het gaat wel.`).
- `book-duplicate` targets are other new book cards. Reuse one only if both are the same word in the same
  sense, and only if its id number is **lower** than `nigCardId`. Otherwise judge `nigCardId` on its own.
  Example: `ben = are` can reuse `ben = am` with `addGloss: ["are"]`.
- Before answering `keep-new` for an item with no good candidate, search the deck yourself:
  `node scripts/nig-match/lookup.mjs nl <dutch>` and `node scripts/nig-match/lookup.mjs en <english>`.
  Any existing card id you find may be a `targetId`, even if it was not listed.
- Do not edit any file except your own output file.

## Worked examples
- `beginnen = begin / start` vs `c91 beginnen = to begin` → `reuse-add-sense`, target `c91`,
  `addGloss: ["to start"]`, subtype `synonym-same-sense`.
- `broers (broer) = brothers` vs `c31 de broer = brother` → `reuse`, target `c31`, subtype `regular-form`.
- `ben (zijn) = am` vs `c65 zijn = to be` → `keep-new`, subtype `irregular-form`.
- `heet = is called` vs `c1063 heet = hot` → `keep-new`, subtype `different-sense`.
- `allemaal = everyone` vs `c403 allemaal = all / all of them` → `reuse-add-sense`, target `c403`,
  `addGloss: ["everyone"]`, subtype `missing-sense`.

## Output
Write a JSON array to the output path you were given, with exactly one object per batch item, in batch order:

```json
{ "nigCardId": "c10166", "action": "reuse", "targetId": "c524", "subtype": "regular-form",
  "confidence": "high", "note": "andere is the inflected form of ander (other)" }
```
- `action`: `reuse` | `reuse-add-sense` | `keep-new`
- `targetId`: required for `reuse` and `reuse-add-sense`, omitted for `keep-new`
- `addGloss`: required (non-empty array of strings) for `reuse-add-sense` only
- `subtype`: one of `same-word`, `synonym-same-sense`, `missing-sense`, `typo`, `adj/adv`, `pos-variant`,
  `regular-form`, `irregular-form`, `different-sense`, `book-phrase`, `not-in-deck`
- `confidence`: `high` | `medium` | `low`. Use `low` when a native speaker could reasonably disagree.
- `note`: one short sentence explaining the decision.

Validate your file before finishing: `node -e 'JSON.parse(require("fs").readFileSync("<your output>","utf8"))'`.
