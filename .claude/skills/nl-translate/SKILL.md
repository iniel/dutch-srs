---
name: nl-translate
description: Orchestrate the HPMOR → Dutch (A2–B1) adaptation pipeline from a chat. Use when asked to translate / adapt / "do" a scene or a chapter of HPMOR into Dutch, to run the translation loop (translator → nl-check → one reviewer → patch → nl-diff / verifier → finalize), to run the chapter pass, to assemble book/tex/chapters-nl/*.tex or export a chapter to the reader, or when the user says /nl-scene, /nl-chapter, /nl-experiment. Encodes pipeline v2 - the roles and their model tiers, the one-round patch loop, file naming and the memory updates.
---

# HPMOR → Nederlands A2–B1: orchestration (pipeline v2)

You are the **orchestrator**. You do not translate or review yourself; you spawn one
subagent per role, run the deterministic tools between them, and decide the next step from
the files they write. Why the pipeline looks like this: `book/pipeline/experiments/optimization.md`
(decision) and the evidence it cites. Reader profile: `book/pipeline/profile/`. Book memory:
`book/pipeline/memory/`. Role prompts: `book/pipeline/prompts/`.

## Setup (once per machine)

```bash
git submodule update --init               # book/upstream: the English HPMOR LaTeX (hpmor-book/hpmor)
cd book/pipeline && uv sync               # Python 3.12 venv + spaCy nl_core_news_lg
uv run nl-lexicon                         # profile/lexicon.json from this repo's public/cards.json (with synonyms)
uv run nl-lexicon --progress ~/Downloads/dutch-srs-progress.json   # optional: your SRS progress → known words
```

All tool commands below run from the repository root as `uv run --project book/pipeline <tool> …`.

| tool | does |
|---|---|
| `nl-extract N [--force]` | chapter N → `work/chNNN/chapter.json` + `scenes/sNN.src.json` (with `dialogue_share`, `dialogue_heavy`) |
| `nl-extract N --flags-only` | add the dialogue fields to existing `src.json` files; nothing else changes |
| `nl-memory N [--scene sNN]` | `work/chNNN/memory.md`: bible sections ≤ N (no spoilers) + the glossary terms of the scene / chapter + words glossed so far (≈ 5–7k tokens) |
| `nl-check N/sNN [--version K]` | structure + vocabulary + grammar → `sNN.vK.checks.{md,json}`; the `.md` shows only what a reviewer acts on |
| `nl-diff N/sNN --from K [--to K+1]` | changed blocks vs must_fix blocks + checks delta → `sNN.v{K+1}.diff.{md,json}`; exit 0 = finalize, 1 = verifier |
| `nl-finalize N/sNN [--version K] [--unresolved R3,M2]` | promote a version to `sNN.final.nl.md`, write `sNN.report.md` (incl. the should_fix deferred to the chapter pass), update known-so-far + inbox |
| `nl-cohesion N` | chapter-level suspects (terms, address, tense, glosses) → `work/chNNN/cohesion.md` — a list, not a gate |
| `nl-assemble N [--build]` | finals → `book/tex/chapters-nl/hpmor-chapter-NNN.tex` (EN kept in `% EN:` comments), optional PDF → `book/pdf/` |
| `nl-reader N` | finals → the app's reader (`public/books/hpmor/chNNN.json` + `public/books/index.json` + the `hpmor` path in `public/paths.json`) |
| `nl-vocab FILE`, `nl-grammar FILE` | the two halves of nl-check, also `--plain` for raw text |

## Roles and model tiers

Two tiers: **smart** = Opus (Claude Code model `opus`), **easy** = Sonnet (`sonnet`). The
agent files in `.claude/agents/` set `model:` accordingly; do not override it.

| role | agent | prompt | tier | why |
|---|---|---|---|---|
| translator (translate, patch) | `nl-translator` | `translator.md` | easy | Sonnet drafts pass nl-check like the strong model's; their slips are one-phrase must_fix the reviewer catches |
| reviewer | `nl-reviewer` | `reviewer.md` | smart | found 20 of 22 must_fix; Sonnet in this seat found 0 of 3 at must_fix severity |
| meaning pass (dialogue-heavy only) | `nl-meaning-reviewer` | `meaning-reviewer.md` | smart | Sonnet filed the corpus's one meaning must_fix as an optional note |
| verifier (only when nl-diff exits 1) | `nl-verifier` | `verifier.md` | smart, short call | judging a diff, ≈ 7k tokens of input |
| chapter pass | `nl-cohesion-editor` | `cohesion-editor.md` | smart | its memory decisions carry into every later chapter |

Use the agents by name when the Task tool offers them. Where it does not (a Cursor chat, an
environment without named agents), spawn a `generalPurpose` subagent with the model
parameter **`claude-sonnet-5-5-high`** for easy roles and **`claude-opus-5-5-high`** for smart
roles, and start its prompt with:

> You are the `<role>` role of the HPMOR Dutch pipeline. Read `book/pipeline/prompts/<file>.md`
> (and `book/pipeline/prompts/findings-schema.md` for reviewers) first and follow it exactly.
> Repository root: `<abs path>`.

If neither model is available, put the strongest available model in every smart seat and
never a cheaper one; the translator may run on anything that passes nl-check.

Every brief contains: repository root, chapter, scene id, version K, mode (`translate` |
`patch` | `review` | `verify`), and the exact file paths to read and write. Subagents work
from disk; never paste scene text into a brief.

## /nl-scene N/sNN — one scene

```
0. no sNN.src.json            → nl-extract N
   src.json without dialogue_heavy → nl-extract N --flags-only
1. nl-memory N --scene sNN    → work/chNNN/memory.md   (every role reads it; it holds no later chapter)
2. K = 1 (resume: next free version)
   nl-translator [easy: producing text, the checker and reviewer follow] mode=translate → sNN.vK.nl.md
3. nl-check N/sNN --version K
   any S-* structure issue → nl-translator [easy] mode=patch with only those issues, K += 1,
   re-check (not a round)
4. nl-reviewer [smart: the gate that finds the reader-visible problems] → sNN.vK.review.json
   if src.json dialogue_heavy: nl-meaning-reviewer [smart: address / irony] in parallel → sNN.vK.meaning.json
   if review.json has "meaning_pass": true and none ran: run it now
   move review.json tool_feedback lines to memory/inbox.md under "## checker feedback"
5. no must_fix in review.json / meaning.json → step 8 with version K
6. patch round (loop.max_fix_rounds = 1):
   nl-translator [easy: a must_fix is a one-phrase edit] mode=patch
       reads sNN.vK.nl.md, sNN.vK.review.json (+ meaning.json), sNN.vK.checks.md → sNN.v{K+1}.nl.md
   nl-check N/sNN --version K+1
   nl-diff N/sNN --from K --to K+1      exit 0 → step 8 with version K+1
7. exit 1 → nl-verifier [smart, short: judges only the diff] on sNN.v{K+1}.diff.md → sNN.v{K+1}.verify.json
   accept → step 8 with K+1
   reopen → second and last round: nl-translator mode=patch on sNN.v{K+1}.verify.json → K+2,
            nl-check, nl-diff --from K+1 --to K+2; exit 1 → nl-verifier once more;
            whatever it says, step 8 with K+2 and --unresolved <ids still reopened>
8. nl-finalize N/sNN --version K [--unresolved …]
9. reply: verdict, rounds, verifier used or not, known-token share, glosses, unresolved
   must_fix (id + one line), number of should_fix deferred, path of the final
```

Decision rules:

- Only `must_fix` (from the review, the meaning pass, or a verifier reopen) causes a patch.
  `should_fix` and `note` are never applied in the scene loop: `nl-finalize` lists the
  should_fix under *deferred to the chapter pass*; the chapter pass applies them. (In Phase 1,
  66 % of a fix round's edits were should_fix and none was ever rejected; one was reverted.)
- No full re-review after a patch: `nl-check` + `nl-diff` decide; the verifier sees only the
  changed blocks. (18 re-reviews found 0 new must_fix.)
- If the reviewer and the meaning pass contradict each other, pass both findings to the
  translator unchanged; its `CONFLICT:` note is the record.
- nl-check verdicts are inputs for the reviewer, not stop conditions.
- Do not edit scene files yourself. If a file is malformed beyond what a patch brief can
  express, re-run the translator in `translate` mode with a new K.

`sNN.report.md` (written by nl-finalize):

```
# ch001 s02 — report
final: v2 (1 fix round(s))
- v1: | checks known 98.4% · … | review fix must 2 should 3 note 6 · flags confirmed 1/2
- v2: | checks known 98.6% · … | diff v1→v2 ok · changed b039 b042
must_fix: 2/2 fixed; R1 fixed (diff ok); R2 fixed (diff ok)
unresolved: none
deferred to the chapter pass (should_fix):
- R3 (should_fix, naturalness) b052: … → …
glosses: perkament (parchment), gewaad (robe)
notes for the bible: …
```

## /nl-chapter N — whole chapter

```
1. nl-extract N            (skip if chapter.json exists; --flags-only if the dialogue fields are missing)
2. for each scene in chapter.json.scenes, in order: /nl-scene N/sNN
   (sequential: known-so-far and decisions from earlier scenes feed the next scene's memory.md)
3. nl-cohesion N           → work/chNNN/cohesion.md (suspects for the chapter pass)
4. nl-memory N             → work/chNNN/memory.md for the whole chapter
5. nl-cohesion-editor [smart: memory decisions outlive the chapter] (chapter N)
       → bible.md / glossary.json / inbox updated, deferred should_fix applied where cheap,
         new versions only for scenes with a real edit, work/chNNN/chapter-cohesion.md
6. nl-assemble N           → book/tex/chapters-nl/hpmor-chapter-NNN.tex
   nl-assemble N --build   → book/pdf/ PDF of the chapter (needs TeX, see book/pipeline/README.md)
   nl-reader N             → the chapter in the app's reader (then `npm test`; ship with the ship-dutch-srs skill)
7. reply: scenes done, total known-token share, glosses, unresolved must_fix per scene,
   should_fix applied / skipped by the chapter pass, memory entries added, paths
```

A chapter can be resumed: scenes with `sNN.final.nl.md` are skipped; a scene with
`sNN.vK.nl.md` but no final continues at the first step whose output file is missing
(checks → review → patch → diff → verify → finalize).

## /nl-experiment — Phase 1 protocol

See `book/pipeline/experiments/README.md`. The Phase 1 scenes (`work/ch901…907`) were produced with
the previous procedure (two reviewers, `.language.json` / `.meaning.json`, re-reviews);
`nl-finalize` and `nl-diff` still read those files. A new experiment run uses /nl-scene as
above, with the variant noted in the brief.

## Guardrails

- Roles read `work/chNNN/memory.md`, never `bible.md` / `glossary.json` directly (the chapter
  pass edits those sources). `nl-memory` leaves out later chapters and `## Spoilers`; do not
  paste anything from them into a brief yourself.
- `book/pipeline/work/` is the audit trail. Never delete or overwrite a version; every round writes
  a new K.
- The English source in `book/upstream/chapters/` (a git submodule) is read-only.
- Keep the `uv run --project book/pipeline` prefix; the venv lives in `book/pipeline/.venv`.
- Phase 3 (`optimization.md` §5): measure chapter 2 with the `analysis-findings.md` metrics
  before treating the Sonnet translator as settled.
