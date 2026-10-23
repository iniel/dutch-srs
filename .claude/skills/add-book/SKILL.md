---
name: add-book
description: Add a ready-made Dutch text or book (pasted text or .txt/.md files) to the app's reader with tap-to-look-up word cards. Use when asked to "add a book/text/story/article", "добавь книгу/текст", or to add chapters to such a text. No translation and no LLM review — a deterministic spaCy export (nl-text). Not for HPMOR (that is nl-translate).
---

# Add a ready-made Dutch text

`nl-text` copies the source into `book/texts/<id>/` and exports it like HPMOR's `nl-reader`:
`public/books/<id>/chNNN.json`, an entry in `public/books/index.json`, a `<id>` path in
`public/paths.json`. One file = one chapter; a one-chapter book opens straight in the reader.

Never: translate, rewrite, or "fix" the text; edit `public/cards.json`; touch `book/pipeline/work/`
or HPMOR files; build or deploy. Do not read large source files into context — pass paths to the CLI.

## Steps (stop on any failure)

1. **Get source files.** Supported: `.txt`, `.md`.
   - Pasted text → write it verbatim to `$TMPDIR/<id>.md`.
   - Other formats (`.epub`, `.pdf`, `.docx`, a URL) → tell the user and ask before converting.
   - Format: blank line = paragraph, `# …` = chapter heading, `> …` = quote, `---` = scene break,
     `*…*` = italics. Several chapters in one pasted text → split into one file per chapter.
2. **Check it is Dutch:** `head -c 600 <file>`. Not Dutch → stop and say so.
3. **Pick `id` and title.** `id` = lowercase slug of the title (`de-kleine-prins`). Use the title
   from the user or the first `# heading`; ask only if neither exists.
4. **Publication check.** The repo and GitHub Pages are public: the full text becomes public.
   If the text is clearly someone else's copyrighted work, ask once before going on.
5. **Lexicon.** `nl-text export` stops if `book/pipeline/profile/lexicon.json` is missing or stale;
   then run `uv run --project book/pipeline nl-lexicon` and retry.
6. **Import + export** (from the repo root):
   ```bash
   uv run --project book/pipeline nl-text init <id> --title "<title>" [--source "<author / URL>"] FILE...
   uv run --project book/pipeline nl-text export <id>
   ```
   More chapters later: `nl-text add <id> FILE...`, then `nl-text export <id>`.
   Wrong import: `nl-text remove <id>` undoes both steps.
   If uv fails on its cache dir (sandbox): prefix `UV_CACHE_DIR=$TMPDIR/uv-cache`.
7. **Verify:** `npm test` (shipped-data checks cover every book file and its path).
8. **Report** in a few lines: book id, chapters, words, cards, share of words without a card, and
   the top lemmas without a card from the export output. If the CLI printed the >15 % warning, say
   the text is above the card set. Offer to add missing words as cards only as a separate task.
9. **Do not build or deploy.** Offer the `ship-dutch-srs` skill.
