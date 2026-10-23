# Finding format (shared by all reviewers)

A review is a JSON file next to the scene file, e.g. `s02.v1.meaning.json`,
`s02.v1.language.json`. A general score ("this is B1, 8/10") is useless for the
pipeline; every problem must be **fragment → problem → evidence → required fix**.

```json
{
  "scene": "ch001/s02",
  "version": 1,
  "reviewer": "meaning" | "language" | "cohesion",
  "verdict": "accept" | "fix",
  "summary": "one or two sentences",
  "findings": [
    {
      "id": "M1",
      "block": "b012",
      "fragment": "exact NL text the finding is about (short)",
      "problem": "what is wrong, in one sentence",
      "evidence": "EN: '…' vs NL: '…'  (or: flag R-DAT confirmed; or: lexicon status hard)",
      "required_fix": "concrete instruction the translator can apply without guessing",
      "severity": "must_fix" | "should_fix" | "note",
      "category": "see below"
    }
  ]
}
```

Ids: `M` = meaning, `L` = language, `C` = cohesion, numbered per review.

## Severity

| severity | meaning | effect |
|---|---|---|
| `must_fix` | the text is wrong for this edition: a fact, negation, causal link, intention, speaker or point of view changed; a confirmed restricted construction; a hard/unknown word with a simple equivalent; Dutch a native speaker would stumble on | forces another fix round (max 2) |
| `should_fix` | quality loss that does not break the scene: lost irony, slightly over-explained, heavy sentence, stretch budget exceeded, cluster of new words | fixed if a round happens anyway; otherwise listed in the report |
| `note` | suggestion, alternative wording, observation for the bible | never forces a round |

## Categories

Meaning reviewer: `event`, `detail`, `causality`, `negation`, `certainty`,
`intent`, `speaker`, `pov`, `irony`, `voice`, `over-explaining`, `summary`,
`spoiler`, `addition`, `omission`.

Language reviewer: `grammar:<R-id>`, `load:<L-id>`, `vocab:hard`, `vocab:unknown`,
`vocab:stretch`, `vocab:cluster`, `gloss`, `naturalness`, `calque`, `register`,
`macro`, `name`.

Cohesion editor: `term`, `address`, `tense`, `repetition`, `transition`, `title`.

## Extra fields

Meaning reviewer adds:

```json
"comprehension": [
  {"q": "Why does Harry decide to write the letter?", "answer_from_nl": "…", "answerable": true}
]
```

Language reviewer adds, for every programmatic flag in `*.checks.md`:

```json
"flag_decisions": [
  {"id": "R-DAT", "block": "b012", "span": "dat hij moe was", "decision": "confirmed" | "dismissed", "reason": "…"}
]
```
