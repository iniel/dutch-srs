# Pipeline cost review — what earned its keep, what to cut, what to delegate

Date: 2026-10-23. Inputs: `analysis-findings.md` (68 reviewer runs over 25 scenes),
`analysis-cost.md` (tokens per role and per scene), `delegation/compare-reviews.md`
and `delegation/compare-s04.md` (blind trials of cheaper models in each role).

## 1. What the stages actually found

| stage | runs | what it produced | verdict |
|---|---|---|---|
| nl-check (programmatic) | every version | vocabulary gate: V2 scenes 1 must_fix in 7 vs 9 for the unchecked single prompt; grammar flags confirmed **4 / 116** (3.4 %), `review`-level flags **0 / 94** | keep the vocabulary side; grammar side is a weak suspect list, stop sending `review`/`ignored` flags to anyone |
| language reviewer | 25 | **20 of 22 must_fix**, incl. every reader-visible one; 13 vocabulary, 4 naturalness, 3 grammar | the one review that matters |
| meaning reviewer | 25 | 2 must_fix (one also found by language); comprehension questions **178 / 178 answerable** — zero discrimination | fold into the language review for ordinary scenes |
| re-review (v2) | 18 | **0 new must_fix**; 4 should_fix all caused by an `exceptions.json` change, not by the fix | drop; `nl-check` on v2 + a diff of changed blocks is enough |
| fix round | 9 | always converged in 1 round (`max_fix_rounds = 2` never used); changed 7 % of words, only **15 %** of that driven by must_fix, 66 % by should_fix | make it a patch of must_fix blocks only |
| should_fix findings | 134 | ~40 % judged worth it (wrong-sense / dangling referent); translator rejected 0 / 55 when a round happened, 0 / 79 applied when no round happened | cap at ~5 per scene, only the wrong-sense / referent / collocation kinds; the rest become notes |
| cohesion editor | 1 chapter | 6 edits (1 necessary, 3 nice, 2 cosmetic), `nl-cohesion` flags 0 / 13 confirmed; real output = memory consolidation (glossary +8/5, bible, known-so-far) | keep, but as a memory step with light editing, once per chapter |

What the checker cannot see and the reviewer catches: sense-level problems (`aankomen` "arrive" vs
"gain weight", `gepast`, `laag` "low" vs "layer"), idioms made of known tokens (`maar al te`), valency
calques (`zich verbinden met`), register (`u`/`je`). Six of the 22 must_fix were *visible* to the
checker but passed because the word carried a gloss (`schutting`, `pockets`, `gebonden`, `kaatste`):
one rule — "glossed word with a known equivalent → replace" — covers them.

## 2. Where the tokens go

| | no fix round | one fix round |
|---|---|---|
| input tokens per scene | 60–64k (3 calls) | 150–167k (5 calls) |
| of which the fixed bundle (bible 13.5k + glossary 7.7k + profile 5k), re-read by every role | 69 % | 69 % |
| chapter 1 total | ≈ 550k for 2 585 words | |

The bible is 37 % of all input and 60 % of it is chapters 2–10 + Spoilers that every prompt forbids
using. The roles need ≈ 7k tokens of memory (chapter-1 sections + the 35 glossary terms that
appear in the scene); they read 21k.

## 3. Delegation trials (blind, against the strong-model reference)

| role | model | result | verdict |
|---|---|---|---|
| translator | Sonnet | passes nl-check (98.6 % known, 0 flags); 3 one-phrase must_fix (`Hij gaf zijn envelop.`, `verstijfde`, one unidiomatic question); after the normal review loop indistinguishable from the reference draft | **delegate**, keep the strong-model language review behind it |
| translator | GPT 5.6 | passes nl-check; 2 must_fix + 6 smoothings that flatten Mrs Figg's voice; ships "a shade flatter" | usable, second choice |
| language reviewer | Sonnet | 0 / 3 reference must_fix at must_fix severity; returned `accept` on a scene that needed a round | **do not delegate** |
| language reviewer | Gemini | 2 / 3 reference must_fix with the right fixes, but 40 % precision (over-flags `als`-clauses, `Stel:`) and misses most naturalness should_fix | delegate only with a strong-model veto on its list |
| meaning reviewer | Sonnet | caught the fire-simile issue; filed the one real meaning must_fix of the corpus (`je`→`u` to McGonagall) as an optional note | severity grading unreliable; never let it gate alone |

Caveat: the trial reviewers ran against memory files updated after the reference reviews
(`hek`, `de heer`, `smoes`, cognates), so a few of their catches are leakage. The direction of the
result does not depend on it: the cheap models are fine at *producing* text that the checker
accepts and poor at *judging* it.

The checker gives identical verdicts to the strong-model draft and the Sonnet draft; only the
reviewer distinguishes them. That is the argument for moving the strong model from the
translator seat to the reviewer seat, not the other way round.

## 4. Proposed pipeline (v2)

```
translate   (Sonnet)         chapter-scoped memory (bible ≤ N + glossary subset), profile
nl-check                     + new rule: glossed word with known equivalent → must_fix
                             + polysemy watch-list, phrase list; only `likely` flags + L-FRAME shown
review      (strong model)   ONE reviewer: language + meaning in one pass, no comprehension
                             questions; must_fix + ≤ 5 should_fix (wrong sense / referent /
                             collocation only); everything else → notes
patch       (Sonnet)         must_fix blocks only; should_fix carried as notes to the chapter pass
nl-check    on the patch     + diff: changed blocks ⊆ finding blocks → finalize; else one strong-model
                             look at the changed blocks (≈ 7k tokens), never a full re-review
chapter     (strong model)   memory consolidation + the batched should_fix; nl-cohesion as a list,
                             not a gate
```

Separate meaning pass only for scenes the extractor marks as dialogue-heavy with irony or
multi-speaker address (ch905 / ch907 type) — the one place the meaning reviewer earned its call.

### Expected effect (per the cost report)

| change | saving per two-round scene | quality risk |
|---|---|---|
| chapter-scoped memory file | −60k (−36 %) | none |
| nl-check + changed-block verify instead of re-review | −35k (−21 %) | none observed (0 / 18 re-reviews found anything) |
| patch-mode fix, should_fix deferred | −27k (−16 %) | low; the deferred items are the 60 % judged not reader-visible |
| one reviewer instead of two | −28k | low on ordinary scenes; keep two for dialogue/irony scenes |
| Sonnet as translator | price per token, not tokens | low with the strong-model reviewer behind it |
| stacked | ≈ 167k → ≈ 55–70k per scene; chapter 1 ≈ 550k → ≈ 200–250k, with the strong model used in ~1 call per scene instead of 4–5 | |

Reviewer runs on this corpus would drop from 68 to ~31 with the only measured loss being four
gloss-hygiene should_fix that the new checker rule covers.

## 5. Phases

1. **Cheap, no quality risk, do first**: chapter-scoped `memory.md` generator (`nl-memory N`),
   checker rules (glossed-with-known-equivalent, polysemy list, phrase list, hide `review`/`ignored`
   flags), drop the re-review in the skill, cap should_fix in the reviewer prompts.
2. **Structural**: merge the two reviewer prompts into one with a "dialogue/irony" switch;
   patch-mode fix prompt; chapter pass takes the deferred should_fix.
3. **Model routing**: translator and patcher on Sonnet, reviewer and chapter pass on the strong
   model; measure on chapter 2 with the same metrics (`analysis-findings.md` script) before making
   it the default.

## 6. What not to cut

- The language reviewer on the strong model: it found 20 of 22 problems and every one a reader
  would notice.
- The vocabulary gate: it is why V2 drafts start with 1 must_fix instead of 9.
- One fix round: every scene that needed one converged in one.
- The chapter memory step: it is the only thing that keeps chapter 2 consistent with chapter 1.

## 7. Implemented (2026-10-23)

Phases 1–2 and the routing of phase 3 are in place; the phase 3 *measurement* is not done.

**Orchestration.** `.claude/skills/nl-translate/SKILL.md` runs §4: translate [Sonnet] → `nl-check` →
one `nl-reviewer` [Opus] (+ `nl-meaning-reviewer` [Opus] only for `dialogue_heavy` scenes or on the
reviewer's `meaning_pass` request) → if must_fix: patch [Sonnet] → `nl-check` + `nl-diff` → finalize,
or `nl-verifier` [Opus, diff only] when nl-diff exits 1 → finalize. One patch round
(`loop.max_fix_rounds: 1`); a second only on a verifier reopen. No re-review. should_fix go to the
chapter pass via the report. Agents: `nl-translator` (`sonnet`), `nl-reviewer`, `nl-meaning-reviewer`,
`nl-verifier`, `nl-cohesion-editor` (`opus`); `nl-language-reviewer` removed. Cursor fallback:
`generalPurpose` with `claude-sonnet-5-5-high` / `claude-opus-5-5-high`.

**Prompts.** New `reviewer.md` (merged; must_fix + ≤ 5 should_fix of kind wrong-sense / referent /
collocation; adjudicates only `likely` flags; no comprehension questions) and `verifier.md`;
`translator.md` reads `memory.md`, has a patch mode (must_fix blocks only, `deferred` / `REJECTED`
notes) and short `@notes`; `cohesion-editor.md` is the chapter pass (memory first, deferred should_fix
where cheap, new versions only for real edits); `meaning-reviewer.md` trimmed to speaker / addressee /
irony / omissions; `findings-schema.md` updated; `language-reviewer.md` is a redirect.

**Tools.**
- `nl-memory N [--scene sNN]` → `work/chNNN/memory.md`: ch001 ≈ 5.2k tokens per scene, ≈ 6.0k for the
  chapter (the roles read ≈ 21k before).
- `nl-diff N/sNN --from K` → changed vs must_fix blocks + checks delta; writes `sNN.v{K+1}.diff.{md,json}`
  (the verifier's whole input). Exit 0 also requires every must_fix block to have changed and no new
  structure issue / `likely` flag / must-level vocabulary row.
- `nl-check`: new must row `glossed-known-equivalent` (gloss = English of a known lemma, or a dutch-srs
  synonym that shares a sense; `nl-lexicon` now carries `synonyms`); `profile/polysemy.json` (23 words,
  *Senses to check*) and `profile/phrases.json` (33 idioms, status `idiom`). Report shows only `likely`
  flags and L-FRAME / L-NEST, the rest counted on one line. Two additive R-PARTICIPLE rules (present
  participle in first position; *de door haar geschreven brief*) — 0 new `likely` flags on the 38
  Phase 1 / ch001 versions.
- `nl-extract`: `dialogue_share`, `speakers`, `dialogue_heavy` per scene; `--flags-only` adds them to
  existing `src.json` without re-segmenting. `nl-finalize` reads `review.json`, `diff.json`,
  `verify.json`, lists deferred should_fix, and no longer re-appends consumed notes to the inbox.
- `book/pipeline/tools/tests/test_checks.py`: 45 probes + 1 documented xfail.

**On the Phase 1 corpus**, the new checker rows fire on: *schutting* (must_fix #5, and the three ch904
variants), *maar al te* (#6), *wisten het even niet meer* (a should_fix judged worth it), *verbond
zichzelf met* (a declined note), *hoe dan ook*, *de maat is vol*, *zo nu en dan*, *thuis zijn in*. One
false positive: *onderdaan* → *onderwerp* ("subject"). Not caught mechanically: *pockets*, *gebonden*,
*kaatste* (the known equivalent is a phrase, not a lemma) — still the reviewer's job.

**Left for phase 3 (measure on chapter 2 with the `analysis-findings.md` metrics):**
- Sonnet as translator and patcher in production (trialled on one scene only).
- `dialogue_heavy` calibration: share ≥ 0.5 + ≥ 2 named speakers flags 15 of 31 scenes in ch 1–9 and
  ch901 / ch907, but **not ch905** (0.33), the one scene where the meaning pass found the must_fix; the
  merged reviewer's addressee check and `meaning_pass` are the cover. Count meaning-pass must_fix per
  flagged scene before keeping the threshold.
- How often `nl-diff` sends a patch to the verifier, and whether the verifier ever reopens.
- Whether the chapter pass applies the deferred should_fix the audit judged worth it.
- Not done: the prefix-caching layout (analysis-cost §5.3), dropping `text` from `src.json`, a
  `gloss-on-cognate` row, the `nl-cohesion` C-TENSE retune, `review.json` columns in
  `nl-experiment report`, and the R-ER-PREP miss when the preposition parses as a particle
  (*er komt magie uit*; xfail in the tests).
