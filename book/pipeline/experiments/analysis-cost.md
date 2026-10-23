# Cost analysis — what one scene costs, and what the money buys

Date: 2026-10-23. Scope: the V2 loop as specified in `.claude/skills/nl-translate/SKILL.md`
and `book/pipeline/prompts/*.md`, measured on chapter 1 (`book/pipeline/work/ch001`) and the Phase 1
experiment scenes (`book/pipeline/work/ch901…907`). Token estimates: words × 1.4 for prose
(Dutch/English, prompts), words × 1.1 for JSON / markdown tables / LaTeX-heavy files.
Input tokens are counted **once per call as the unique context the role is told to
read** ("minimum input"); see §6 for why the billed number is higher. Measurement
script lived in `/tmp` (not committed); every number below can be re-derived with
`wc -w` and `diff` on the files named.

Caveat: `bible.md` and `glossary.json` are measured in their current state (after the
ch001 cohesion pass and the Phase 1 run). The bible was pre-seeded for chapters 1–10,
so its size at translation time was within a few percent of today's.

## 1. Context size per role

### 1.1 The files

| file | words | est. tokens | kind | read by |
|---|---:|---:|---|---|
| `prompts/translator.md` | 1,173 | 1,642 | prose | translator (both modes), cohesion editor (must follow it) |
| `prompts/meaning-reviewer.md` | 535 | 749 | prose | meaning reviewer, re-review |
| `prompts/language-reviewer.md` | 572 | 801 | prose | language reviewer, re-review |
| `prompts/cohesion-editor.md` | 411 | 575 | prose | cohesion editor |
| `prompts/findings-schema.md` | 343 | 377 | data | all reviewers, cohesion editor |
| `profile/allowed.md` | 1,206 | 1,327 | data | translator, language reviewer, cohesion |
| `profile/restricted.md` | 2,554 | 2,809 | data | translator, language reviewer, cohesion |
| `profile/exceptions.json` | 791 | 870 | data | translator, language reviewer, cohesion |
| `profile/thresholds.yaml` | 316 | 348 | data | language reviewer |
| `memory/bible.md` — whole file | 9,614 | **13,460** | prose | translator, meaning reviewer, cohesion |
| `memory/bible.md` — ch 1 sections only (global + narrator + Characters/ch1 + motifs + Per-chapter/ch1, no Spoilers) | 3,802 | **5,323** | prose | what the prompt actually asks for |
| `memory/glossary.json` — all 224 terms | 6,979 | **7,677** | data | translator, meaning reviewer, cohesion |
| `memory/glossary.json` — 35 terms with `first_chapter ≤ 1` | 1,634 | 1,797 | data | — |
| `memory/glossary.json` — 32 terms whose EN string occurs in ch001/s03 | 1,209 | 1,330 | data | — |
| `memory/known-so-far/ch001.json` | 35 | 38 | data | translator, cohesion |
| `work/ch001/chapter.json` (96 blocks, `tex` **and** `text`) | 7,163 | 7,879 | data | cohesion editor |
| `work/ch001/cohesion.md` | 945 | 1,040 | data | cohesion editor |
| `ch001/s03.src.json` (38 blocks; `tex` and `text` each 988 words = the English twice) | 2,894 | 3,183 | data | translator, meaning reviewer, (language reviewer optional) |
| `ch001/s03.v1.nl.md` (1,006 words of Dutch + 1,100 words of `@notes`) | 2,103 | 2,944 | prose | both reviewers, fix translator |
| `ch001/s03.v2.nl.md` | 2,553 | 3,574 | prose | re-review, finalize |
| `ch001/s03.v1.checks.md` | 534 | 587 | data | language reviewer, fix translator |
| `ch001/s03.v1.checks.json` (same content as the .md, 3.4× larger) | 1,820 | 2,002 | data | language reviewer |
| `ch001/s03.v1.meaning.json` | 1,440 | 1,584 | data | fix translator, re-review |
| `ch001/s03.v1.language.json` (findings 13.5 kB, flag_decisions 1.7 kB, tool_feedback 3.8 kB) | 2,840 | 3,124 | data | fix translator, re-review |
| `ch001/s03.v2.checks.md` / `.json` | 513 / 1,811 | 564 / 1,992 | data | re-review |
| `ch001/s03.report.md` | 1,631 | 1,794 | data | cohesion editor |

Two observations before the per-role sums:

- The **fixed, scene-independent bundle** (profile 5,006 + bible 13,460 + glossary 7,677)
  is **26,143 tokens**. The whole English of scene s03 is 3,183. Every call that reads the
  bundle spends 8× more on background than on the text it is working on.
- The `@notes` section of a version file is already larger than the Dutch text it
  annotates (s03 v1: 1,100 vs 1,006 words). Every downstream reader pays for it.

### 1.2 Minimum input per role (typical scene = ch001/s03, 1,006 words of Dutch)

| role | reads | tokens | of which fixed bundle |
|---|---|---:|---:|
| translator, **translate** | prompt + src + allowed/restricted/exceptions + bible + glossary + known-so-far | **31,006** | 26,143 (84%) |
| translator, **fix** | translate set + previous version + meaning.json + language.json + checks.md | **39,245** | 26,143 (67%) |
| **meaning reviewer** | prompt + schema + src + nl + bible + glossary | **28,390** | 21,137 (74%) |
| **language reviewer** | prompt + schema + nl + checks.md + checks.json + allowed/restricted/exceptions + thresholds (+ src "to check a fragment": +3,183) | **12,065** (15,248 with src) | 5,354 (44%) |
| **re-review**, one call doing both roles | both prompts + schema + src + v2 + bible + glossary + v2 checks (md+json) + profile + thresholds + both previous reviews | **42,439** | 26,491 (62%) |
| re-review as two calls | meaning 30,604 + language 15,794 | 46,398 | |
| **cohesion editor** (ch001, 4 scenes) | prompt + schema + translator.md + chapter.json + 4 finals (9,528) + 4 reports (4,925) + bible + glossary + known-so-far + profile + cohesion.md + inbox + 4 × nl-check output | **≈ 54,600** | 26,143 (48%) |

With the bible cut to the chapter's sections (5,323) and the glossary to the chapter's
terms (1,797), the same rows become: translate 16,989 · fix 25,228 · meaning 14,373 ·
language 12,065 (unchanged) · re-review 28,422 · cohesion ≈ 40,600.

### 1.3 What is shared / redundant

| input | read how often per 2-round scene | tokens spent | waste |
|---|---:|---:|---|
| `bible.md`, whole | 4× (translate, meaning, fix, re-review) + cohesion | 53,840 | 60% of it is chapters 2–10 + Spoilers, which the prompt forbids using; the Read tool returns the whole file anyway |
| `glossary.json`, whole | 4× + cohesion | 30,708 | 84% of the terms (189 of 224) have `first_chapter` > 1 or null |
| `allowed/restricted/exceptions` | 5× (translate, language, fix, re-review, cohesion) | 25,030 | identical every scene of the book; never a prefix-cache hit because each role reads it as a tool result at a different position |
| `src.json` `text` field | 3–4× | ≈ 1,100 per read | exact duplicate of `tex` minus macros |
| `checks.json` next to `checks.md` | 2× (language, re-review) | 2,000 per read | same information as the .md |
| `@notes` in `vK.nl.md` | 3× (both reviewers, fix) | ≈ 1,500 per read | the reviewers need the decisions, not the 1,100-word essay; the fix translator wrote it |
| `tool_feedback` in `language.json` | 1× (fix) + re-review | ≈ 1,000 | addressed to the checker owner, not to the translator |

## 2. Calls per scene

Reconstructed from the files on disk. Rules: `nl-check`, `nl-finalize`, `nl-cohesion`
are free; the two first-round reviews are two calls; the two re-reviews were one call in
practice; cohesion is one call per chapter, charged ¼ to each ch001 scene. Experiment
scenes had no cohesion pass. Token totals use each scene's own file sizes and the
per-role formulae of §1.2.

| scene | src tokens | versions on disk | agent calls | translate | 2 reviews | fix | re-review | cohesion share | **total input tokens** |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| ch001 s01 | 3,116 | v1 → v2 (fix) → v3 (cohesion) | 5 + ¼ | 30,939 | 38,149 | 37,154 | 39,466 | 13,650 | **159,358** |
| ch001 s02 | 1,646 | v1 → v2 → v3 | 5 + ¼ | 29,469 | 34,941 | 35,181 | 36,756 | 13,650 | **149,997** |
| ch001 s03 | 3,183 | v1 → v2 → v3 | 5 + ¼ | 31,006 | 40,455 | 39,245 | 42,439 | 13,650 | **166,795** |
| ch001 s04 | 632 | v1 → v2 (cohesion) | 3 + ¼ | 28,455 | 31,599 | — | — | 13,650 | **73,704** |
| ch901 s02 | 1,118 | v1 | 3 | 28,903 | 32,801 | — | — | — | 61,704 |
| ch902 s02 | 646 | v1 | 3 | 28,431 | 31,522 | — | — | — | 59,953 |
| ch903 s02 | 1,072 | v1 | 3 | 28,857 | 33,213 | — | — | — | 62,070 |
| ch904 s02 | 986 | v1 | 3 | 28,771 | 32,300 | — | — | — | 61,071 |
| ch905 s02 | 1,487 | v1 → v2 (fix) | 5 | 29,272 | 35,438 | 34,487 | 36,421 | — | **135,618** |
| ch906 s02 | 893 | v1 | 3 | 28,678 | 33,410 | — | — | — | 62,088 |
| ch907 s02 | 1,352 | v1 | 3 | 29,137 | 34,766 | — | — | — | 63,903 |

Reading the table:

- A **no-round scene costs ≈ 60–64 k input tokens regardless of length** (ch902 s02 has
  646 source tokens, ch907 s02 has 1,352; the totals differ by 4 k). The scene text is
  noise on top of the fixed bundle.
- A **fix round roughly doubles the scene** (+70–75 k: the fix call re-reads everything
  the translate call read plus three review files, and the re-review re-reads everything
  both reviewers read plus the previous reviews).
- Chapter 1 mean: **137 k tokens / scene**, 4.5 calls / scene; the 4 scenes together
  ≈ 550 k input tokens for 2,585 English words → **≈ 210 input tokens per translated
  English word**. The experiment's V2 scenes: 72 k / scene mean (1 round in 7).
- Where the chapter-1 tokens go, by role: translator (translate + fix) 231 k = 42%;
  meaning reviewer (first round + its share of the re-review) ≈ 183 k = 33%; language
  reviewer ≈ 80 k = 15%; cohesion 55 k = 10%. By input: bible 37% (15 reads), glossary
  21%, profile 14%, the scene's own English 7% (incl. `chapter.json`), Dutch versions 7%,
  reviews + checks ≈ 9%, role prompts ≈ 5%.

## 3. What the fix rounds changed (v1 → v2)

Method: block-level byte comparison, then sentence-level `difflib` inside changed blocks,
then word-level diff for the "% of scene" column (scene = Dutch block text only, `@notes`
excluded). Each changed sentence was then attributed, using the translator's own fix log
in `## @notes` of the v2 file and the v1 review JSONs, to the **highest-severity finding
that names it** (must_fix > should_fix > note > nothing = translator's own). The last
column is the share of words in changed sentences that a must_fix finding drove.

| scene | blocks changed | sentences changed | words changed | % of scene | must_fix | should_fix | note | own | **must_fix share of changed text** |
|---|---|---|---|---:|---|---|---|---|---:|
| ch001 s01 | 8/31 | 11/110 | 26/913 | 2.8% | 2 (36 w) | 9 (67 w) | 0 | 0 | 35% |
| ch001 s02 | 6/11 | 12/59 | 32/511 | 6.3% | 3 (30 w) | 8 (75 w) | 1 (21 w) | 0 | 24% |
| ch001 s03 | 10/34 | 13/93 | 60/1,006 | 6.0% | 1 (13 w) | 12 (158 w) | 0 | 0 | 8% |
| ch905 s02 (V2) | 10/12 | 17/45 | 45/424 | 10.6% | 1 (6 w) | 13 (158 w) | 3 (44 w) | 0 | 3% |
| ch901 s03 (V3) | 4/9 | 4/39 | 21/263 | 8.0% | 1 (8 w) | 3 (32 w) | 0 | 0 | 20% |
| ch902 s03 (V3) | 1/4 | 4/12 | 17/163 | 10.4% | 2 (31 w) | 1 (17 w) | 1 (19 w) | 0 | 46% |
| ch903 s03 (V3) | 6/9 | 10/26 | 28/300 | 9.3% | 1 (11 w) | 7 (99 w) | 1 (6 w) | 1 (15 w) | 8% |
| ch905 s03 (V3) | 5/12 | 11/47 | 33/417 | 7.9% | 1 (6 w) | 5 (58 w) | 5 (69 w) | 0 | 5% |
| ch907 s03 (V3) | 6/12 | 13/36 | 53/347 | 15.3% | 2 (31 w) | 7 (81 w) | 4 (36 w) | 0 | 21% |
| **all 9** | 56/174 | 95/467 | 315/4,344 | **7.3%** | **14 (172 w)** | 65 (745 w) | 15 (195 w) | 1 (15 w) | **15%** |

What this says:

- A fix round touches **7% of the words** and **20% of the sentences** of a scene; the
  other 80–93% is copied byte-for-byte — after a 39 k-token call whose brief is "copy
  every other block".
- **Only 14 of 95 changed sentences (15% of the changed words) exist because of a
  must_fix**, i.e. because of the thing that triggered the round. Every round in the
  sample *was* triggered by a must_fix (there is no round without one), but once the
  translator is in, it applies the should_fix list (65 sentences) and a good share of
  the notes (15). The must_fix items themselves are small: a single word (*schutting* →
  *hek*, *verdragen* → *uithouden*, *gepast* → *goed en juist*, *je* → *u*), one
  restricted clause (*alles wat je denkt* → *al je gedachten*), one calqued sentence.
  **The median must_fix is a one-word edit; the median round is a 10-block rewrite.**
- The should_fix mass is reviewer taste at the sentence level: splitting a 22-word
  sentence, dropping a gloss on a known word, *melodie* → *liedje*, moving an `\emph`.
  Nothing in it is a meaning or profile violation by the schema's own definition.
- The reviewers' re-review then re-reads the whole scene (42 k tokens) to confirm
  10 blocks, and in the sample **no re-review re-opened a must_fix**; the v2 reviews
  of all 9 scenes are `accept`. (They did add new notes and should_fix items, which
  nobody acted on because the round limit had been reached or no must_fix remained.)

## 4. Cohesion pass (ch001)

Diff of the version the cohesion editor produced against the previous final:

| scene | versions | blocks changed | words changed | % of scene | what |
|---|---|---|---:|---:|---|
| s01 | v2 → v3 | 1/31 (b006) | 2/913 | 0.2% | epigraph plural *zwart gewaad* → *zwarte gewaden* (bible spoiler section decides the number) |
| s02 | v2 → v3 | 1/11 (b039) | 1/511 | 0.2% | `\gl` dropped on *genetische* (cognate list; s02 L1 should_fix of v2) |
| s03 | v2 → v3 | 2/34 (b055, b064) | 3/1,007 | 0.3% | `\gl` dropped on *hypothese*; *meneer~H.~Potter* → *de heer~H.~Potter* in the letter (written vs spoken form) |
| s04 | v1 → v2 | 2/10 (b090, b091) | 6/143 | 4.2% | *voor* → *vóór 31 juli*; subjectless exclamation rewritten as a sentence (s04 M1 + L2 should_fix) |
| **chapter** | | 6/86 | **12/2,574** | **0.5%** | 2 gloss removals, 1 plural, 1 accent, 1 term form, 1 sentence |

Twelve words for a ≈ 55 k-token call — but four of the six edits are **leftover
should_fix items from the scene reviews** that the scene loop had not applied (s02 L1,
s04 L1, L2, M1), which is direct evidence that should_fix can wait for this pass. The
other half of the editor's output is not text at all: 8 new glossary entries, 5 updated
ones, the bible's chapter-1 sections rewritten to the final state, the known-so-far list
regenerated, the inbox cleared. That memory work is the real product of the call, and it
only needs the finals, the reports and the memory files — not `chapter.json` (7.9 k
tokens of English blocks it never edits) and not the profile files.

## 5. Conclusions and the cheapest cuts

### 5.1 Where the tokens go

1. **The fixed bundle, re-read by every role.** 26 k tokens per read × 4–5 reads per
   scene = 105 k of a 153 k two-round scene (69%). The bible alone is 37% of chapter 1's
   input; 60% of the bible is text the prompt forbids using.
2. **The fix round re-reads the world to change 7% of the words**: 39 k for the fix call,
   42 k for the re-review = 81 k per round, of which about 12 k concerns the blocks that
   actually change.
3. **Duplicated scene material**: the English twice in `src.json`, `checks.json` next to
   `checks.md`, `@notes` longer than the text, `tool_feedback` sent to the translator.

### 5.2 Three changes that together cut > 50% without touching the translator's text

Savings are per two-round scene (ch001/s03, 166.8 k incl. cohesion share), and in
brackets per no-round scene (ch001/s04-like, 73.7 k).

| # | change | mechanism | saving / scene |
|---|---|---|---|
| **1** | **Chapter-scoped memory**: `nl-extract` (or a new `nl-brief`) writes `work/chNNN/memory.md` = bible sections for chapters ≤ N + glossary terms with `first_chapter ≤ N` **or** whose EN string occurs in the chapter; roles read that file instead of `bible.md` + `glossary.json` | bible 13,460 → 5,323; glossary 7,677 → 1,797; × 4 reads (translate, meaning, fix, re-review) = −56 k, plus −3.5 k on the cohesion share | **−60 k (−36%)** [−31 k, −42%]. Zero quality cost: this is what the prompts already say the roles may use; it also closes the spoiler guardrail mechanically. |
| **2** | **Verify-changed-blocks instead of re-review**: after a fix, run `nl-check` (free) and spawn **one** verifier whose input is: the findings it must confirm (must + should only), the changed blocks in EN / v1 / v2, and the `nl-check` delta. No bible, glossary or profile; a new `S-*` or `likely` flag from `nl-check` is the only thing that can send it back | 42,439 → ≈ 7,000 (prompt 1.2 k + 10 block pairs ≈ 2.5 k + findings 2 k + checks delta 0.6 k + schema 0.4 k) | **−35 k (−21%)** [0]. Evidence: 9/9 re-reviews in the sample confirmed everything; the fix translator's log already states applied / rejected per finding, so the verifier's job is to check that, not to re-review. |
| **3** | **Patch-mode fix + should_fix deferred to cohesion**: the fix translator receives only the must_fix findings, the blocks they name (EN + v1), the chapter memory and the profile; it writes a `sNN.vK.patch.md` with those blocks; `nl-patch` splices them into a full v(K+1) and re-runs `nl-check`. should_fix / note items are carried in the report to the cohesion editor, who already applies them (§4) | fix 39,245 → ≈ 12,000 (prompt 1.6 k + profile 5 k + chapter memory 7 k (after #1) + 2–3 blocks ≈ 1 k + findings 1 k); must_fix touched 14 sentences in 9 rounds, a median of one block per round | **−27 k (−16%)** on top of #1 [0]. Quality: the must_fix is applied by the same translator with the same rules; the 65 should_fix sentences move to the pass that already does this kind of edit with the whole chapter in view. Round frequency does not change (every round in the sample was must_fix-triggered). |

The savings in the table are each measured against the current pipeline. Stacked (so #2
and #3 act on the already-reduced re-review of 28.4 k and fix of 25.2 k) on ch001/s03:
166.8 k → after #1 ≈ 107 k → after #2 ≈ 86 k → after #3 ≈ 72 k (**−57%**). Chapter 1
(4 scenes, 3 rounds): 550 k → ≈ 250 k. Calls per two-round scene stay 5 + ¼; four of
them become a third of their size.

### 5.3 Smaller cuts, in order of effort

| change | saving / scene | note |
|---|---|---|
| Put profile + chapter memory in the **subagent's system prompt as a fixed prefix** (orchestrator pastes them, roles do not `Read` them) | the 12 k (after #1) fixed prefix becomes cache-eligible: at a 10% cached-read price, ≈ −45 k billed-equivalent per two-round scene | Only works if the prefix is byte-identical and first in every call; tool-result reads at varying positions never hit the cache. Also removes 3–4 Read turns per call (§6). |
| **One combined reviewer for scenes < ~700 source words** (s04, ch902, ch904, ch906 in the sample) | unique tokens: only −1 to −2 k (the two reviewers overlap just on `vK.nl.md`); the real saving is one fewer agent (system prompt, 6–8 fewer tool turns, one fewer reply) ≈ −8 to −10 k billed | Keep two reviewers for long or voice-heavy scenes: the split is what kept the meaning reviewer from proposing simplifications (idea.md). |
| Drop `text` from `src.json` (keep `tex`, the reviewers compare macros anyway) | −1.1 k per read, 3–4 reads = −4 k | one line in `extract.py` |
| Give the language reviewer only `checks.md` (the `.json` is for tools) | −2 k × 2 reads = −4 k | |
| Cap `@notes` to decisions (≤ 1 line per block that needed one; move the essay to `sNN.report.md` via `nl-finalize`) | −1.5 k × 3 reads = −4.5 k | also makes the fix translator's log easier to verify |
| Strip `tool_feedback` from what the fix translator and verifier receive | −1 k × 2 | route it to `inbox.md` instead |
| Cohesion editor: replace `chapter.json` with a block/scene index without `tex`/`text` | −7.5 k per chapter | it edits finals, never the English |

### 5.4 What not to cut

- The **first translate call's full profile** (allowed/restricted/exceptions, 5 k): it is
  the only thing that made V2 come out language-clean on the first pass (report.md §2).
- The **two first-round reviewers**: 65 should_fix sentences are what the reader will
  feel; they are cheap to produce (28 k + 12 k) and only expensive because the fix
  round reacts to all of them at once. Deferring them (change #3) keeps the findings and
  moves the edits.
- **Comprehension questions**: ≈ 300 tokens of output; keep.

## 6. Note on "input tokens" vs the bill

Every number above is unique context per call. A subagent that reads 8 files makes
≈ 10 model turns, and each turn resends the context accumulated so far; billed input is
the sum of those prefixes — roughly 3–4× the unique context without caching, ≈ 1.2–1.5×
with prefix caching of a stable system prompt. This multiplies all totals equally and
does not change the ranking in §5, but it is the reason the "fixed prefix" row in §5.3
is worth more than its unique-token saving suggests: the fewer the Read turns, the
closer the bill is to the unique-context number.
