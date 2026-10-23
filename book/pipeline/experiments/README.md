# Phase 1 — architecture experiment (idea.md §7)

Before automating whole chapters we compare three ways of producing the Dutch
text on seven short fragments that cover the kinds of writing in the book.
Simplicity and meaning preservation are measured **separately** (Cripwell et al.
2024); meaning is additionally probed with comprehension questions (Agrawal &
Carpuat 2024).

## Fragments (`fragments.json`)

| id | name | type | source |
|---|---|---|---|
| 901 | f1-dialogue-tension | dialogue, marital argument, irony | ch1 b015–b023 |
| 902 | f2-description-present | description, present tense, long sentences | ch1 b010–b014 |
| 903 | f3-inner-monologue | inner monologue, reasoning, free indirect thought | ch1 b047–b055 |
| 904 | f4-action-humour | action, embarrassment humour, neighbour dialogue | ch1 b076–b086 |
| 905 | f5-cat-scene | comic dialogue, science vocabulary, exclamations | ch2 b022–b033 |
| 906 | f6-economics-exposition | exposition, complex syntax, numbers, Harry's register | ch4 b029–b034 |
| 907 | f7-draco-voice | character voice, class register, deadpan | ch5 b055–b066 |

`uv run --project book/pipeline nl-experiment init` turns each fragment into a
pseudo-chapter `book/pipeline/work/ch9FF/` with three scenes holding the same source
blocks: `s01` = V1, `s02` = V2, `s03` = V3. All normal tools work on them
(`nl-check 901/s02`).

## Variants

| variant | procedure |
|---|---|
| V1 single prompt | one `generalPurpose` subagent: "translate into Dutch for an A2–B1 reader" with `allowed.md`, `restricted.md`, the gloss rule and the glossary pasted as rules; no checks, no reviewers; writes `s01.v1.nl.md` |
| V2 constrained + loop | `/nl-scene 9FF/s02`: `nl-translator` → `nl-check` → `nl-meaning-reviewer` ∥ `nl-language-reviewer` → ≤ 2 fix rounds |
| V3 literary then adapt + loop | step A: `generalPurpose` subagent writes an unconstrained literary Dutch translation to `s03.v0.literary.md` (same block format); step B: `nl-translator` in *adapt* mode (brief: "start from the literary version, keep its voice, bring grammar and vocabulary into the profile") → `s03.v1.nl.md`; then the same loop as V2 |

For every variant the brief states `source_chapter` (bible sections to read) —
never the pseudo-chapter number.

## Metrics (collected by `nl-experiment report` → `results.md`)

Measured separately, never summed:

| dimension | measure | source |
|---|---|---|
| meaning | must/should/note findings of the meaning reviewer, v1 and final | `*.meaning.json` |
| meaning | comprehension questions answerable from the Dutch, v1 and final | `comprehension[]` |
| grammar | likely flags confirmed by the language reviewer; heavy sentences (`L-*`) | `*.checks.json`, `*.language.json` |
| vocabulary | known-token share, unglossed new lemmas / 1000, glosses | `*.checks.json` |
| cost | versions needed, number of must_fix per round | file names, reviews |
| reading | the reader's own notes: stops per fragment, enjoyment 1–5, "sounds like the book" 1–5 | `reading-notes.md` (manual) |

## Decision

Pick the default procedure for Phase 2 by:

1. meaning first — a variant that loses comprehension answers is out;
2. then the number of confirmed grammar violations and the known-token share after the loop;
3. then cost (rounds) and the reader's enjoyment notes.

Recalibrate `profile/thresholds.yaml` from the measured distributions (e.g. if
good V2 outputs sit at 96–97 % known tokens, 98 % is the wrong starting point for
this book) and record the decision at the end of `results.md`.
