# Phase 1 report — which procedure to use

Date: 2026-10-22. Seven fragments (f1–f7, 171–394 words each, ~1 960 words total),
three procedures each, 21 translations, 42 first-round reviews, 6 fix rounds,
12 second-round re-reviews. Raw per-scene numbers: `results.md` (regenerate with
`uv run --project book/pipeline nl-experiment report`); the texts and every review live in
`book/pipeline/work/ch901…ch907/scenes/`.

## Headline numbers (means over the 7 fragments)

| | V1 single prompt | V2 constrained + loop | V3 literary → adapt + loop | literary baseline (V3 step A) |
|---|---|---|---|---|
| known tokens, first version | 98.1 % | 98.3 % | 98.5 % | 92.4 % |
| known tokens, final | 98.1 % | 98.6 % | 98.7 % | — |
| unglossed new lemmas / 1000, final | 14.3 | 11.4 | 9.0 | 71.4 |
| likely restricted-grammar flags, final (sum) | 3 | 0 | 1 | 137 |
| heavy sentences (`L-*`), final (sum) | 3 | 2 | 3 | 67 |
| glosses per fragment | 8.0 | 6.7 | 6.9 | — |
| `must_fix` at first review: meaning + language | 1 + 8 | 1 + 0 | 0 + 7 | — |
| `should_fix` at first review | 47 | 30 | 30 | — |
| fragments needing a fix round | 5/7 would have (no loop by design) | 1/7 | 5/7 | — |
| comprehension questions answerable | 35/35 | 35/35 | 35/35 | — |

## What the numbers say

1. **Meaning survives in all three procedures.** Every comprehension question was
   answerable from every Dutch version, and the meaning reviewer raised one
   `must_fix` in total per procedure (V1: the fixed refrain *Waarom geloof ik wat ik
   geloof?* was broken; V2: a generic `je` where `u` anchors the next line; V3: none).
   The profile does not cost the book its content. The reviewers' `should_fix`
   items are register and voice (Draco's indirection, a clipped maxim, an idiom
   flattened), and they are spread evenly over the procedures.

2. **The constrained translator (V2) is the only procedure that comes out
   language-clean on the first pass.** Zero language `must_fix` across seven
   fragments; V1 and V3 each needed a round in five of seven fragments. V3's
   failures are all the same kind: a word or idiom from the literary draft that
   the adapter kept because every token looked known (*maar al te bang*, *kaatste
   terug*, *gepast*, *pockets*, *gebonden*, the free relative in the maxim). V1's are
   the same plus one restricted conjunction (`nu` as subordinator) — exactly what a
   single prompt with no checks lets through.

3. **V3 buys ~2 points of vocabulary density at the price of a second translator
   call and a fix round in most fragments.** Its finals are marginally better on
   unglossed-new-lemma density (9.0 vs 11.4 per 1000) and the reviewers' notes
   credit it with a few livelier choices (*hield voet bij stuk*, *de maat is vol*),
   but the meaning reviewer saw no difference in what reaches the reader. Not worth
   doubling the translation cost for every scene.

4. **The programmatic layer did its job as a suspect list, not a verdict.** Over the
   experiment the language reviewers dismissed about 90 % of grammar flags on the
   constrained texts (attributive participles, demonstrative `dat`, copula +
   participle, dash-joined clauses) while the same detector found 137 real
   violations in the unconstrained baselines. Each dismissal pattern that recurred
   was folded back into `grammar_check.py` / `vocab_check.py` during the run (see
   "Checker changes" below); the remaining known false positives are all scored
   `review`, not `likely`.

5. **Comprehension questions were not discriminative at this fragment size.**
   35/35 everywhere. Keep them (they are cheap and they will catch real losses in
   long expository scenes), but the finding-level review is where the signal is.

## Decision

- **Default procedure for Phase 2: V2** — `nl-translator` → `nl-check` →
  `nl-meaning-reviewer` ∥ `nl-language-reviewer` → ≤ 2 fix rounds, exactly as in
  `.claude/skills/nl-translate/SKILL.md`. Expect roughly one fix round per 5–7
  scenes, almost always for a pronoun, a register slip or a gloss, not grammar.
- **V3 stays available as an escape hatch** for a scene the reader finds flat after
  V2 (voice-heavy set pieces). Brief it as `mode: adapt` from a literary draft; budget
  one fix round.
- **V1 is retired** as a production path; it remains the control in this report.

## Threshold calibration (applied to `profile/thresholds.yaml`)

| key | before | after | why |
|---|---|---|---|
| `vocab.known_token_share_min` | 0.98 | 0.975 | V2 finals span 97.8–99.6 % (median 98.6 %); the misses are deliberate opaque jargon in Harry's physics rant and a handful of lexicon gaps, which the reviewer dismisses every time |
| `vocab.new_lemmas_per_1000_max` | 10 | 15 | V2 finals span 3.9–21.6; the two above 15 are exposition (economics, cat-scene physics) where the reviewers judged the density acceptable after dismissing tool rows; 15 keeps a flag on genuinely dense prose |
| `vocab.stretch_budget_min` | — | 3 | added during the run: `8 per 1000` floored to 1 on a 160-token scene, so any two B1 words failed |
| `vocab.gloss_per_paragraph_max` | 2 | 2 | translators hit the cap often but never asked for more; keep |
| `loop.max_fix_rounds` | 2 | 2 | no scene needed a second round; keep as the safety stop |

The 98 % figure from the reading research (Nation 2006) is a comprehension
threshold for unassisted reading; this edition glosses, so a slightly lower share
of *unglossed* known tokens is the right operating point. Revisit after reading
chapter 1 end to end (`reading-notes.md`).

## Checker changes made during the experiment (from reviewer `tool_feedback`)

Vocabulary: token clean-up (clitic `’s`, trailing punctuation, em dashes split);
proper-name detection from the English source and from mid-sentence capitals;
lexicon-POS-aware candidate choice (`stil` ≠ `stillen`); heuristic stems only count
with matching POS (`welden` no longer passes as `wel`); diminutives incl. plurals
(`haarnetje`, `hoopjes`); transparent derivations (`onbeschaafd`, `geelachtig`,
`voorste`); compound decomposition with head de-inflection and a prefix guard
(`tissuedozen`, `drugsgeld`, not `ver+ruk`); stretch compounds of known parts marked
transparent (`boekenkast`); a cognate list in `exceptions.json` (also matched on
inflected forms); parser-missed separable verbs accepted when the joined verb exists
(`hield vol` → `volhouden`); multi-word glosses counted once and shown as phrase rows;
"gloss on a known word" rows; glossary terms and derivations exempt from that row;
per-scene stretch-budget floor.

Grammar: lexicon-backed lemmas for irregular forms; `zou/zouden` by surface form;
posture verbs by lemma; V2-order relatives scored as demonstrative; `dat` with the
finite verb before it scored as demonstrative; `was` + state participle scored low
unless the verb takes `zijn` in the perfect; `aux:pass` without `worden/zijn`
(`klonk verstikt`) scored low; attributive participles that are lexicon adjectives
scored below the ignore line; `dan`, `want`, `maar`, `zoals` out of the restricted
conjunction list; sentence-initial `Of` scored as the coordinator; finite-verb count
ignores nouns the parser mistook for verbs (`zorgen`, `heb … zorgen`).

Known remaining false positives (all at `review` level, reviewer dismisses):
attributive participles not in the lexicon, `dat` after a fronted clause, clauses
joined by an em dash or `;` read as one sentence (`L-LEN` / `L-VERBS`), sense-level
gaps the lexicon cannot see (`laag` "low" vs "layer", `behoorlijk` as a degree adverb).

## Open items for the profile owner

- `exceptions.json`: decide whether the fixed maxim *Geloof niet alles wat je denkt*
  (book title quoted by Harry) is whitelisted as a quote despite the free relative.
- `glossary.json`: envelope form `de heer~H.~Potter` vs `meneer~H.~Potter`; `supercool`
  vs `megacool`; `in stijgende volgorde` / `ergheid` as Harry's "ascending order of
  awfulness".
- Lexicon gaps surfaced: `brein` (added to `keep`), `sceptisch` (cognates), `spits`
  (adjective sense), `witblond`, `flirten`.
- Reading notes (`reading-notes.md`) are still empty: read the 7 × 3 finals
  (`book/pipeline/work/ch90F/scenes/s0V.final.nl.md`) and fill in stops / enjoyment before
  trusting the thresholds above for the whole book.
