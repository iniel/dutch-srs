# Finding format (shared by the reviewer, the meaning pass and the chapter pass)

A review is a JSON file next to the scene file: `sNN.vK.review.json` (the one reviewer),
`sNN.vK.meaning.json` (the extra pass for dialogue-heavy scenes). Every problem is
**fragment → problem → evidence → required fix**; a general score is useless to the pipeline.

```json
{
  "scene": "ch001/s02",
  "version": 1,
  "reviewer": "review" | "meaning" | "cohesion",
  "verdict": "accept" | "fix",
  "summary": "one or two sentences",
  "findings": [
    {
      "id": "R1",
      "block": "b012",
      "fragment": "exact NL text the finding is about (short)",
      "problem": "what is wrong, in one sentence",
      "evidence": "EN: '…' vs NL: '…'  (or: flag R-DAT confirmed; or: vocab row schutting glossed-known-equivalent → hek)",
      "required_fix": "concrete instruction the translator can apply without guessing",
      "severity": "must_fix" | "should_fix" | "note",
      "kind": "wrong-sense" | "referent" | "collocation",
      "category": "see below"
    }
  ]
}
```

Ids: `R` = reviewer, `M` = meaning pass, `C` = chapter pass, numbered per file. `block` is one
block id; a finding that spans two blocks names both (`"b094 b096"`). `verdict` is `fix`
exactly when there is a must_fix. `kind` is required on should_fix and omitted otherwise.

## Severity

| severity | meaning | effect |
|---|---|---|
| `must_fix` | wrong for this edition: a fact, negation, causal link, intention, speaker, addressee or point of view changed; information missing; a spoiler; a confirmed restricted construction; an unknown / hard word, idiom or glossed word with a plain known equivalent; Dutch a native speaker stumbles on; a structure issue | forces the patch round (`loop.max_fix_rounds`, 1) |
| `should_fix` | a reader-visible stumble that does not break the scene, of one `kind`: `wrong-sense`, `referent`, `collocation`; at most `review.max_should_fix` (5) per reviewer, 3 for the meaning pass | never applied in the scene loop; listed in the report as *deferred*, applied by the chapter pass |
| `note` | everything else: voice shade, over-explaining, register nuance, gloss hygiene, heavy but legal sentence, alternative wording, lexicon gaps | never forces anything; the chapter pass reads them for blocks it touches |

## Categories

Reviewer: `grammar:<R-id>`, `load:<L-id>`, `vocab:hard`, `vocab:unknown`, `vocab:stretch`,
`vocab:cluster`, `vocab:gloss-equivalent`, `vocab:sense`, `vocab:idiom`, `gloss`,
`naturalness`, `calque`, `register`, `macro`, `name`, and the meaning categories `event`,
`detail`, `causality`, `negation`, `certainty`, `intent`, `speaker`, `addressee`, `pov`,
`irony`, `voice`, `over-explaining`, `spoiler`, `addition`, `omission`, `refrain`.

Meaning pass: the meaning categories above.

Chapter pass: `term`, `address`, `tense`, `repetition`, `transition`, `title`.

## Extra fields

The reviewer adds a decision for every `likely` grammar flag and every `L-FRAME` / `L-NEST`
line of `sNN.vK.checks.md` (the report shows no other flags; do not adjudicate the JSON):

```json
"flag_decisions": [
  {"id": "R-DAT", "block": "b012", "span": "dat hij moe was", "decision": "confirmed" | "dismissed", "reason": "…"}
]
```

Optional, reviewer only: `"meaning_pass": true` asks the orchestrator for the extra meaning
pass; `"tool_feedback": ["…"]` one-line suggestions for the checker's owner (the
orchestrator moves them to `memory/inbox.md`).

Phase 1 files (`sNN.vK.language.json` with `L` ids, `comprehension` arrays in
`sNN.vK.meaning.json`) stay readable by `nl-finalize` and `nl-diff`; new reviews do not
write them.
