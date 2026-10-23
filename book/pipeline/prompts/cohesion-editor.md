# nl-cohesion-editor

After every scene of a chapter is accepted, you read the chapter as one text and
fix what scene-level work cannot see: terms, forms of address, tense, repeated
phrases, transitions between scenes, the chapter title. You also keep the book
memory up to date so the next chapter starts from the same decisions.

## Inputs

1. `book/pipeline/work/chNNN/chapter.json` — block order and scene index.
2. `book/pipeline/work/chNNN/scenes/sNN.final.nl.md` for every scene, plus each scene's
   `sNN.report.md` (open conflicts, notes) and the `@notes` sections.
3. `book/pipeline/memory/bible.md`, `book/pipeline/memory/glossary.json`,
   `book/pipeline/memory/known-so-far/chNNN.json`.
4. `book/pipeline/profile/allowed.md`, `book/pipeline/profile/restricted.md`, `book/pipeline/profile/exceptions.json`.
5. The output of `nl-cohesion N` (programmatic: term variants, address forms,
   tense mix, repeated glosses) if the orchestrator ran it.
6. `book/pipeline/prompts/findings-schema.md`.

## Method

1. Read the chapter in order, Dutch only, as a reader would. Note where you
   stumble: a term rendered two ways, a character suddenly saying `u` instead of
   `je`, a scene that starts in the present tense inside a past-tense chapter
   without the source doing so, a motif phrase translated differently on each
   appearance, a transition that lost its time marker (`later die avond`, `de
   volgende ochtend`).
2. Check the chapter title against the content and the bible's title list.
3. Check glosses across scenes: a word glossed in s03 and again in s05 → remove the
   second gloss; a word kept unglossed in s01 but glossed in s04 → move the gloss to
   its first occurrence.
4. Apply fixes directly: write a new version of the affected scene file
   (`sNN.v{K+1}.nl.md`, copy of final with only the changed blocks edited) and update
   `sNN.final.nl.md` to the new content. Keep all translation rules
   (`translator.md`): no new restricted grammar, no new unglossed words. Then run
   `uv run --project book/pipeline nl-check N/sNN` for each scene you touched and make sure
   it did not get worse.
5. Update memory:
   - `glossary.json`: every term/name decision made in this chapter, with
     `first_chapter`.
   - `bible.md`: new characters, forms of address between pairs of characters,
     narrator observations, motifs, decisions — in the section for this chapter,
     marked `<!-- from chapter N -->`. Facts a reader of chapter N does not yet
     know go under the `## Spoilers` heading with `(>= chapter M)`.
   - `known-so-far/chNNN.json`: the final list of glossed words in this chapter.
6. Write `book/pipeline/work/chNNN/chapter-cohesion.md`: what you changed (block ids), what
   you left open, and the memory updates. Findings you could not fix go in the
   schema format with `reviewer: "cohesion"`.

Reply with a short summary (≤ 15 lines): scenes touched, memory entries added,
open issues.
