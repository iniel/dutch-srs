# HPMOR → Nederlands (A2–B1)

A chat-driven pipeline that turns the English chapters in `book/upstream/chapters/`
into a Dutch edition whose grammar stays inside an A2+ profile and whose vocabulary is
checked against this app's word lists (`public/cards.json`). Why it is built this way: `idea.md`.

```
book/
  upstream/                  git submodule: hpmor-book/hpmor (English LaTeX, layout/, fonts/) — never edited here
  pipeline/                  this uv project
    idea.md, grammar.md      the brief (Russian) and the original grammar list
    profile/                 reader profile: allowed.md, restricted.md, thresholds.yaml, exceptions.json,
                             polysemy.json, phrases.json, lexicon.json (generated, git-ignored), personal.json (generated, git-ignored)
    memory/                  book memory: bible.md, glossary.json, known-so-far/chNNN.json, inbox.md
    prompts/                 role prompts: translator, reviewer, meaning-reviewer, verifier, cohesion-editor, findings-schema
    tools/nltools/           Python CLI, see "Running tools by hand"
    tools/tests/             regression probes for nl-check (pytest)
    work/chNNN/              state per chapter: chapter.json, memory.md, cohesion.md, chapter-cohesion.md,
                             scenes/sNN.{src.json, vK.nl.md, vK.checks.{md,json}, vK.review.json, vK.meaning.json,
                             vK.diff.{md,json}, vK.verify.json, final.nl.md, report.md}
    experiments/             Phase 1 protocol, results, the cost / findings audits and optimization.md
  tex/                       our TeX layer: chapters-nl/ (assembled, EN kept as % comments), hpmor-nl.tex, layout/hp-nl.tex
  pdf/, tmp/                 build output (git-ignored)
public/books/                reader export (nl-reader), shipped with the app
.claude/agents/nl-*.md       the five roles as subagents (model tier in the frontmatter)
.claude/skills/nl-translate/SKILL.md   orchestration: /nl-scene, /nl-chapter, /nl-experiment
```

The app never imports anything from `book/`; only `nl-reader`'s output in `public/` ships.

## Pipeline v2

Decided in `experiments/optimization.md` from the Phase 1 audits (`analysis-findings.md`,
`analysis-cost.md`, `delegation/`): one strong-model review per scene instead of two plus
re-reviews, a patch of the must_fix blocks only, and a chapter-scoped memory file instead of
the whole bible and glossary in every call.

```
per scene
  nl-memory N --scene sNN            work/chNNN/memory.md (bible ≤ N, glossary subset; ≈ 5–7k tokens)
  translate          [easy]          nl-translator            → sNN.v1.nl.md
  nl-check                           vocab gate + glossed-with-known-equivalent + senses + idioms;
                                     report shows only `likely` grammar flags, L-FRAME, L-NEST
  review             [smart]         nl-reviewer              → sNN.v1.review.json
                                     must_fix + ≤ 5 should_fix (wrong-sense / referent / collocation)
  (meaning pass)     [smart]         nl-meaning-reviewer      only if src.json dialogue_heavy
  ── no must_fix ──────────────────► nl-finalize v1
  patch              [easy]          nl-translator mode=patch → sNN.v2.nl.md (must_fix blocks only)
  nl-check + nl-diff                 changed ⊆ must_fix blocks, checks clean ──► nl-finalize v2
  verify             [smart, short]  nl-verifier on the diff  → accept ──► nl-finalize v2
                                                                reopen ──► one more patch, then finalize
per chapter
  nl-cohesion N  →  nl-memory N  →  chapter pass [smart] nl-cohesion-editor
                                     memory consolidation + the deferred should_fix  →  nl-assemble, nl-reader
```

Model tiers: **smart** = Opus (`opus`) for the reviewer, the meaning pass, the verifier and
the chapter pass — the roles that judge; **easy** = Sonnet (`sonnet`) for the translator in
both modes — the role that produces text the checker and the reviewer then judge. Without
named agents (Cursor): `generalPurpose` with model `claude-opus-5-5-high` / `claude-sonnet-5-5-high`.
Expected cost (`analysis-cost.md`): ≈ 55–70k input tokens for a scene with a patch round
(was ≈ 150–167k), one strong-model call per scene instead of four or five.

## Setup

```bash
git submodule update --init    # book/upstream (after a plain clone)
mise use -g uv@latest          # or: brew install uv
cd book/pipeline && uv sync    # Python 3.12 venv, spaCy + nl_core_news_lg (~600 MB, git-ignored)
uv run nl-lexicon              # reads this repo's public/cards.json + NT2Lex TSV (override: --srs PATH)
uv run nl-lexicon --progress ~/Downloads/dutch-srs-progress.json   # optional: mark SRS-learned words as known
```

Updating the English source: `cd book/upstream && git pull origin main`, then commit
the new submodule pointer. Re-run `nl-extract N --force` only for chapters not yet translated.

## Running from a chat

Open this repo in Claude Code or Cursor and say:

- `/nl-scene 1/s02` — translate one scene with the v2 loop (translate → check → one review → patch → diff / verify).
- `/nl-chapter 1` — all scenes, chapter pass, `book/tex/chapters-nl/hpmor-chapter-001.tex`, reader export.
- "run the Phase 1 experiment" — see `experiments/README.md`.

The orchestrating agent follows `.claude/skills/nl-translate/SKILL.md`; the roles
read `prompts/*.md`. Everything is file-based, so a run can be resumed and every
version is kept.

## Running tools by hand (from the repo root)

```bash
uv run --project book/pipeline nl-extract 1                 # scenes for chapter 1 (+ dialogue_share / dialogue_heavy)
uv run --project book/pipeline nl-extract 1 --flags-only    # add the dialogue fields to existing src.json, nothing else
uv run --project book/pipeline nl-memory 1 [--scene s02]    # work/ch001/memory.md: the memory every role reads
uv run --project book/pipeline nl-check 1/s02               # structure + vocab + grammar on the latest version
uv run --project book/pipeline nl-diff 1/s02 --from 1       # patch gate: exit 0 finalize, 1 verifier; writes s02.v2.diff.md
uv run --project book/pipeline nl-vocab some.txt --plain    # vocabulary status of any Dutch text
uv run --project book/pipeline nl-grammar some.txt --plain  # restricted-construction flags for any Dutch text
uv run --project book/pipeline nl-finalize 1/s02            # promote the latest version to final + report + memory
uv run --project book/pipeline nl-cohesion 1                # chapter-level suspects over the finals
uv run --project book/pipeline nl-assemble 1 [--build]      # LaTeX chapter (+ book/pdf/ via local xelatex or the docker image)
uv run --project book/pipeline nl-reader 1                  # public/books/hpmor/ch001.json (+ books index, hpmor path)
uv run --project book/pipeline nl-experiment init|report    # Phase 1 harness (see experiments/)
uv run --project book/pipeline pytest book/pipeline/tools/tests -q  # regression probes for the checker
```

Ready-made Dutch texts skip the whole loop: `nl-text` (skill `.claude/skills/add-book/`) copies
`.md`/`.txt` sources into `book/texts/<id>/` and runs the same token/card export as `nl-reader`.

```bash
uv run --project book/pipeline nl-text init <id> --title "…" FILE...   # one file = one chapter
uv run --project book/pipeline nl-text add <id> FILE...
uv run --project book/pipeline nl-text export <id> [--chapter N]       # public/books/<id>/ + index + path
uv run --project book/pipeline nl-text remove <id>
```

After `nl-reader`, run `npm test` (the shipped-data checks cover the book files); the
chapter goes live with the next deploy (ship-dutch-srs skill).

What nl-check reports beyond the lemma gate:

- **glossed-known-equivalent** (must): a glossed stretch / hard / unknown word whose gloss is
  the English of a known lemma (*schutting* "fence" → *hek*), or one of its dutch-srs synonyms
  that shares a sense. On Phase 1 it fires on *schutting* (a real must_fix) and on
  *onderdaan* → *onderwerp* (English "subject" is ambiguous; the reviewer dismisses such rows).
- **idiom** rows from `profile/phrases.json` (*maar al te*, *voet bij stuk houden*, *het even
  niet meer weten*): known tokens, unknown phrase.
- **Senses to check** from `profile/polysemy.json` (*aankomen*, *gepast*, *laag*, *geest*,
  *een hele* …): the reviewer checks the sense in each listed block.
- Grammar: the report shows `likely` flags and `L-FRAME` / `L-NEST`; `review` / `ignored`
  flags and the other load ids are counted on one line and kept in the JSON.

## Status

- Phase 1 done: `experiments/report.md` — V2 (constrained translator + checks + review loop)
  won; thresholds calibrated.
- Chapter 1 done end to end with the Phase 1 procedure (two reviewers, re-reviews):
  `work/ch001/`, `book/tex/chapters-nl/hpmor-chapter-001.tex`, reader export, PDF
  (8 pages; 99.3 % known tokens, 25 glosses).
- Pipeline v2 implemented (`experiments/optimization.md`, "Implemented"); chapter 2 is its
  first measured run.

## Building the Dutch PDF

`book/tex/hpmor-nl.tex` mirrors upstream `hpmor.tex` with `polyglossia` set to Dutch
(`book/tex/layout/hp-nl.tex` adds the language and the `\gl` macro) and includes whatever
exists in `book/tex/chapters-nl/`. TeX runs from the repo root with `book/tex` and
`book/upstream` on `TEXINPUTS`, so upstream layout and fonts are used unmodified. TeX is
not installed on this machine; the pipeline uses a small docker image instead (~1.5 GB):

```bash
docker build -t hpmor-tex - < book/pipeline/Dockerfile.tex
uv run --project book/pipeline nl-assemble 1 --build   # local xelatex if present, else the image
# or by hand: sh book/pipeline/tools/build-chapter.sh 1  # -> book/pdf/hpmor-chapter-001-nl.pdf
```

## Tuning

- Grammar: edit `profile/allowed.md` / `profile/restricted.md` (templates feed the
  translator) and the patterns in `tools/nltools/grammar_check.py`.
- Vocabulary thresholds and budgets: `profile/thresholds.yaml`.
- Words to keep / avoid, grammar chunks to treat as vocabulary: `profile/exceptions.json`.
- Known words with a trap sense: `profile/polysemy.json`; idioms of known words: `profile/phrases.json`.
- Review caps, patch rounds, the dialogue-heavy threshold: `profile/thresholds.yaml` (`review`, `loop`, `scene`).
- Names and terms: `memory/glossary.json`; narrative decisions: `memory/bible.md` (roles see them
  through `nl-memory`; edit the sources, never `work/chNNN/memory.md`).
- After editing `pyproject.toml` or the lexicon sources: `cd book/pipeline && uv sync`, `uv run nl-lexicon`.
