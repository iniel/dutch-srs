# HPMOR → Nederlands (A2–B1)

A chat-driven pipeline that turns the English chapters in `book/upstream/chapters/`
into a Dutch edition whose grammar stays inside an A2+ profile and whose vocabulary is
checked against this app's word lists (`public/cards.json`). Why it is built this way: `idea.md`.

```
book/
  upstream/                  git submodule: hpmor-book/hpmor (English LaTeX, layout/, fonts/) — never edited here
  pipeline/                  this uv project
    idea.md, grammar.md      the brief (Russian) and the original grammar list
    profile/                 reader profile: allowed.md, restricted.md, thresholds.yaml,
                             exceptions.json, lexicon.json (generated), personal.json (generated, git-ignored)
    memory/                  book memory: bible.md, glossary.json, known-so-far/chNNN.json, inbox.md
    prompts/                 role prompts: translator, meaning-reviewer, language-reviewer, cohesion-editor, findings-schema
    tools/nltools/           Python CLI: extract, lexicon_build, vocab_check, grammar_check, check_scene, cohesion_check, assemble, reader_export
    work/chNNN/              state per chapter: chapter.json, scenes/sNN.{src.json,vK.nl.md,vK.checks.md,vK.meaning.json,vK.language.json,final.nl.md,report.md}
    experiments/             Phase 1 protocol and results
  tex/                       our TeX layer: chapters-nl/ (assembled, EN kept as % comments), hpmor-nl.tex, layout/hp-nl.tex
  pdf/, tmp/                 build output (git-ignored)
public/books/                reader export (nl-reader), shipped with the app
.claude/agents/nl-*.md       the four roles as subagents
.claude/skills/nl-translate/SKILL.md   orchestration: /nl-scene, /nl-chapter, /nl-experiment
```

The app never imports anything from `book/`; only `nl-reader`'s output in `public/` ships.

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

- `/nl-scene 1/s02` — translate one scene with the full loop (translator → checks → two reviewers → ≤ 2 fix rounds).
- `/nl-chapter 1` — all scenes, cohesion pass, `book/tex/chapters-nl/hpmor-chapter-001.tex`, reader export.
- "run the Phase 1 experiment" — see `experiments/README.md`.

The orchestrating agent follows `.claude/skills/nl-translate/SKILL.md`; the roles
read `prompts/*.md`. Everything is file-based, so a run can be resumed and every
version is kept.

## Running tools by hand (from the repo root)

```bash
uv run --project book/pipeline nl-extract 1                 # scenes for chapter 1
uv run --project book/pipeline nl-check 1/s02               # structure + vocab + grammar on the latest version
uv run --project book/pipeline nl-vocab some.txt --plain    # vocabulary status of any Dutch text
uv run --project book/pipeline nl-grammar some.txt --plain  # restricted-construction flags for any Dutch text
uv run --project book/pipeline nl-finalize 1/s02            # promote the latest version to final + report + memory
uv run --project book/pipeline nl-cohesion 1                # chapter-level checks over the finals
uv run --project book/pipeline nl-assemble 1 [--build]      # LaTeX chapter (+ book/pdf/ via local xelatex or the docker image)
uv run --project book/pipeline nl-reader 1                  # public/books/hpmor/ch001.json (+ books index, hpmor path)
uv run --project book/pipeline nl-experiment init|report    # Phase 1 harness (see experiments/)
```

After `nl-reader`, run `npm test` (the shipped-data checks cover the book files); the
chapter goes live with the next deploy (ship-dutch-srs skill).

## Status

- Phase 1 done: `experiments/report.md` — V2 (constrained translator + checks + two
  reviewers + ≤ 2 fix rounds) is the default procedure; thresholds calibrated.
- Chapter 1 done end to end: `work/ch001/`, `book/tex/chapters-nl/hpmor-chapter-001.tex`,
  reader export, PDF (8 pages; 99.3 % known tokens, 25 glosses).

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
- Names and terms: `memory/glossary.json`; narrative decisions: `memory/bible.md`.
