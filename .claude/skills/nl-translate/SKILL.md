---
name: nl-translate
description: Orchestrate the HPMOR → Dutch (A2–B1) adaptation pipeline from a chat. Use when asked to translate / adapt / "do" a scene or a chapter of HPMOR into Dutch, to run the translation loop (translator → programmatic checks → meaning + language reviewers → fixes), to assemble book/tex/chapters-nl/*.tex or export a chapter to the reader, or when the user says /nl-scene, /nl-chapter, /nl-experiment. Encodes the roles, the two-round fix loop, file naming and the memory updates.
---

# HPMOR → Nederlands A2–B1: orchestration

You are the **orchestrator**. You do not translate or review yourself; you spawn
one subagent per role, run the deterministic tools between them, enforce the
round limit, and write the scene report. Design rationale: `book/pipeline/idea.md`.
Reader profile: `book/pipeline/profile/`. Book memory: `book/pipeline/memory/`. Role prompts:
`book/pipeline/prompts/`.

## Setup (once per machine)

```bash
git submodule update --init               # book/upstream: the English HPMOR LaTeX (hpmor-book/hpmor)
cd book/pipeline && uv sync               # Python 3.12 venv + spaCy nl_core_news_lg
uv run nl-lexicon                         # profile/lexicon.json from this repo's public/cards.json
uv run nl-lexicon --progress ~/Downloads/dutch-srs-progress.json   # optional: your SRS progress → known words
```

All tool commands below are run from the repository root as
`uv run --project book/pipeline <tool> …` (or `cd book/pipeline && uv run <tool> …`).

| tool | does |
|---|---|
| `nl-extract N [--force]` | chapter N → `book/pipeline/work/chNNN/chapter.json` + `scenes/sNN.src.json` |
| `nl-check N/sNN [--version K]` | structure + vocabulary + grammar report → `sNN.vK.checks.{md,json}` |
| `nl-vocab FILE`, `nl-grammar FILE` | the two halves of nl-check, also `--plain` for raw text |
| `nl-finalize N/sNN [--version K]` | promote a version to `sNN.final.nl.md`, write `sNN.report.md`, update known-so-far + inbox |
| `nl-cohesion N` | chapter-level programmatic checks (terms, address, tense, glosses) |
| `nl-assemble N [--build]` | finals → `book/tex/chapters-nl/hpmor-chapter-NNN.tex` (EN kept in `% EN:` comments), optional PDF → `book/pdf/` |
| `nl-reader N` | finals → `public/books/hpmor/chNNN.json` (tokens with lemma + card ids), upserts `public/books/index.json` and the `hpmor` path in `public/paths.json` |
| `nl-lexicon [--progress X]` | rebuild the lexicon |

## Spawning roles

Project subagents exist in `.claude/agents/`: `nl-translator`, `nl-meaning-reviewer`,
`nl-language-reviewer`, `nl-cohesion-editor`. Use them by name when the Task tool
offers them. If the environment does not list them (e.g. a Cursor chat), spawn a
`generalPurpose` subagent and start its prompt with:

> You are the `<role>` role of the HPMOR Dutch pipeline. Read
> `book/pipeline/prompts/<role-file>.md` (and `book/pipeline/prompts/findings-schema.md`) first and
> follow it exactly. Repository root: `<abs path>`.

Every brief must contain: repository root, chapter number, scene id, version K,
mode (`translate` | `fix` | `review` | `re-review`), and the exact file paths the
role must read and write. Subagents work from disk; never paste the scene text
into the brief. Run the two reviewers **in parallel**.

## /nl-scene N/sNN  — one scene, up to two fix rounds

```
1. if book/pipeline/work/chNNN/scenes/sNN.src.json is missing:  uv run --project book/pipeline nl-extract N
2. K = 1 (or next free version if sNN.v*.nl.md exist and the user asked to continue)
3. spawn nl-translator   mode=translate  → writes sNN.vK.nl.md
4. uv run --project book/pipeline nl-check N/sNN --version K     → sNN.vK.checks.md
   if the Structure section has S-MISSING / S-EXTRA / S-BRACES / S-MACRO issues:
       spawn nl-translator mode=fix with only those issues (does not count as a round), K += 1, re-check
5. spawn in parallel:
       nl-meaning-reviewer  mode=review  → sNN.vK.meaning.json
       nl-language-reviewer mode=review  → sNN.vK.language.json   (give it the checks path)
6. collect must_fix findings from both files
   if none → go to 8
   if round < 2 (thresholds.yaml loop.max_fix_rounds):
       spawn nl-translator mode=fix (previous = vK, reviews = both json files) → sNN.v{K+1}.nl.md
       K += 1; round += 1; run nl-check; spawn both reviewers in mode=re-review
       (they re-check changed blocks and confirm or re-open findings); go to 6
   else → unresolved must_fix are recorded, go to 8
7. (never loop beyond two fix rounds; an endless disagreement means the profile or
   the brief needs work, not another round)
8. finalize:  uv run --project book/pipeline nl-finalize N/sNN [--version K] [--unresolved M3,L2]
   - copies sNN.vK.nl.md → sNN.final.nl.md
   - writes sNN.report.md (per-version checks + review counts, unresolved findings, glosses, notes)
   - updates book/pipeline/memory/known-so-far/chNNN.json with all \gl words of the chapter's finals
   - appends the translator's @notes / CONFLICT lines to book/pipeline/memory/inbox.md
     under "## chNNN sNN" (the cohesion editor consumes them)
9. reply to the user: verdict, rounds used, known-token share, number of glosses,
   unresolved findings (ids + one line), path of the final file
```

`sNN.report.md` template:

```
# ch001 s02 — report
versions: v1 → v2 (1 fix round)
checks (final): known 98.4% · new/1000 = 7 · grammar likely 0 · load 0 · structure ok
meaning: 1 must_fix (fixed), 2 should_fix (1 fixed, 1 open: M3)
language: 3 must_fix (fixed), flags confirmed 4 / dismissed 6
unresolved:
- M3 (should_fix, irony): "…" — kept literal because the pun does not exist in Dutch
glosses: perkament (parchment), gewaad (robe)
notes for the bible: …
```

Decision rules for the orchestrator:

- A `must_fix` from either reviewer counts. `should_fix` and `note` never trigger
  a round by themselves, but are passed to the translator when a round happens.
- If the two reviewers contradict each other, pass both findings to the
  translator unchanged; the translator's `CONFLICT:` note is the resolution record.
- Programmatic verdicts (`vocab FAIL`, `grammar FAIL`) are inputs for the language
  reviewer, not stop conditions by themselves — the reviewer may dismiss flags.
- Do not edit scene files yourself. If a file is malformed beyond what a fix brief
  can express, re-run the translator from scratch (`mode=translate`, new K).

## /nl-chapter N  — whole chapter

```
1. uv run --project book/pipeline nl-extract N          (skip if chapter.json exists and finals are in progress)
2. for each scene in chapter.json.scenes, in order:  run /nl-scene N/sNN
   (sequential: known-so-far and bible notes from earlier scenes feed later ones)
3. uv run --project book/pipeline nl-cohesion N          → book/pipeline/work/chNNN/cohesion.md
4. spawn nl-cohesion-editor (chapter N)          → may bump scene versions, updates memory
5. uv run --project book/pipeline nl-assemble N          → book/tex/chapters-nl/hpmor-chapter-NNN.tex
   uv run --project book/pipeline nl-assemble N --build  → PDF of the single chapter (needs TeX, see book/pipeline/README.md)
   uv run --project book/pipeline nl-reader N            → chapter in the app's reader (then `npm test`; ship with the ship-dutch-srs skill)
6. python3 scripts/check_chapters.py             (optional; the EN checker, run with lang NL settings if configured)
7. reply: scenes done, total known-token share, glosses, unresolved findings per scene,
   memory entries added, path of the .tex / .pdf
```

A chapter can be resumed: scenes with `sNN.final.nl.md` are skipped; a scene with
`sNN.vK.nl.md` but no final continues from step 4 of /nl-scene with that K.

## /nl-experiment  — Phase 1 protocol

See `book/pipeline/experiments/README.md` for the fragment list, the three variants
(single prompt / constrained + loop / literary then adapt + loop), and the
metrics sheet. The orchestration for variants 2 and 3 is /nl-scene with the
variant noted in the brief; variant 1 is a single `generalPurpose` call.

## Guardrails

- Never read bible sections marked for chapters later than the one being
  translated into a role's brief; spoilers leak through the orchestrator too.
- `book/pipeline/work/` files are the state. Do not delete versions; they are the audit trail.
- The English source in `chapters/` is read-only.
- Keep the `uv run --project book/pipeline` prefix; the venv lives in `book/pipeline/.venv`.
