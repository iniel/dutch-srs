"""nl-text: add a ready-made Dutch text (no translation, no review) to the dutch-srs reader.

    nl-text init <id> --title "…" FILE...   # book/texts/<id>/: chNNN.md copies + book.json
    nl-text add <id> FILE...                # append chapters to an existing text
    nl-text export <id> [--chapter N]       # -> public/books/<id>/chNNN.json + books index + <id> path
    nl-text remove <id>                     # undo init + export (only for book/texts/ books)

One file = one chapter. Source format (.md / .txt): blank line = paragraph, `# …` = heading,
`> …` = quote, `---` or `* * *` = scene break, `*…*` = italics. Tokens and card ids are
resolved exactly like nl-reader (spaCy + profile/lexicon.json), so no LLM is involved.
"""

from __future__ import annotations

import argparse
import re
import shutil
from collections import Counter
from pathlib import Path

from .common import BOOK_DIR, DEFAULT_SRS_DIR, PROFILE_DIR, dump_json, exceptions, load_json
from .reader_export import _card_pos, _Text, _write_compact, tokenize_blocks, upsert_index, upsert_path
from .vocab_check import Lexicon, Resolver

TEXTS_DIR = BOOK_DIR / "texts"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SOURCE_SUFFIXES = {".md", ".txt"}
BREAK_RE = re.compile(r"(\*\s*){3,}|-{3,}|_{3,}")
HEADING_RE = re.compile(r"#{1,6}\s+(.*)")
UNMAPPED_WARN = 0.15


def parse_source(text: str) -> list[tuple[str, str]]:
    """Markdown-ish source -> [(kind, inline text)] with kind heading | para | quote | break."""
    text = text.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")
    blocks: list[tuple[str, str]] = []
    for chunk in re.split(r"\n[ \t]*\n", text):
        lines = [ln.strip() for ln in chunk.split("\n") if ln.strip()]
        if not lines:
            continue
        if len(lines) == 1 and BREAK_RE.fullmatch(lines[0]):
            blocks.append(("break", ""))
            continue
        m = HEADING_RE.fullmatch(lines[0])
        if m:
            blocks.append(("heading", m.group(1).rstrip("# ").strip()))
            lines = lines[1:]
            if not lines:
                continue
        if all(ln.startswith(">") for ln in lines):
            blocks.append(("quote", " ".join(ln.lstrip(">").strip() for ln in lines)))
        else:
            blocks.append(("para", " ".join(lines)))
    return blocks


def to_marked(inline: str) -> _Text:
    """Inline text with `*…*` / `**…**` italics -> _Text; unbalanced asterisks stay literal."""
    parts = re.split(r"(?<!\\)(\*+)", inline)
    balanced = len(parts[1::2]) % 2 == 0
    out = _Text()
    em = False
    for i, part in enumerate(parts):
        if i % 2 and balanced:
            em = not em
            continue
        out.add(part.replace("\\*", "*"), em, 0)
    return out.collapsed()


def plain(inline: str) -> str:
    return "".join(to_marked(inline).chars)


def book_dir(book_id: str) -> Path:
    return TEXTS_DIR / book_id


def _taken_ids(srs: Path) -> set[str]:
    public = srs / "public"
    ids = {p.name for p in TEXTS_DIR.iterdir() if p.is_dir()} if TEXTS_DIR.exists() else set()
    if (public / "books" / "index.json").exists():
        ids |= {b["id"] for b in load_json(public / "books" / "index.json")["books"]}
    if (public / "paths.json").exists():
        ids |= {p["id"] for p in load_json(public / "paths.json")["paths"]}
    return ids


def _read_source(path: Path) -> str:
    if not path.is_file():
        raise SystemExit(f"{path}: not a file")
    if path.suffix.lower() not in SOURCE_SUFFIXES:
        raise SystemExit(f"{path}: only {', '.join(sorted(SOURCE_SUFFIXES))} are supported; convert it first")
    text = path.read_text(encoding="utf-8")
    if not parse_source(text):
        raise SystemExit(f"{path}: no text")
    return text.lstrip("﻿").replace("\r\n", "\n")


def _chapter_title(text: str, path: Path, fallback: str | None) -> str:
    heading = next((t for kind, t in parse_source(text) if kind == "heading"), None)
    if heading:
        return plain(heading)
    return fallback or re.sub(r"[-_]+", " ", path.stem).strip().capitalize()


def _add_chapters(book: dict, files: list[Path], single_title: str | None) -> None:
    d = book_dir(book["id"])
    texts = [(f, _read_source(f)) for f in files]
    start = max((c["n"] for c in book["chapters"]), default=0)
    for i, (f, text) in enumerate(texts, start + 1):
        name = f"ch{i:03d}.md"
        (d / name).write_text(text, encoding="utf-8")
        book["chapters"].append({"n": i, "title": _chapter_title(text, f, single_title), "file": name})
    dump_json(d / "book.json", book)


def cmd_init(a: argparse.Namespace) -> None:
    if not ID_RE.fullmatch(a.id):
        raise SystemExit(f"bad id {a.id!r}: use lowercase letters, digits and dashes")
    if a.id in _taken_ids(a.srs):
        raise SystemExit(f"id {a.id!r} is already used by a book or a path; pick another")
    book: dict = {"id": a.id, "title": a.title}
    if a.title_en:
        book["titleEn"] = a.title_en
    if a.source:
        book["source"] = a.source
    book["chapters"] = []
    book_dir(a.id).mkdir(parents=True)
    try:
        _add_chapters(book, a.files, a.title if len(a.files) == 1 else None)
    except BaseException:
        shutil.rmtree(book_dir(a.id))
        raise
    print(f"{a.id}: {len(book['chapters'])} chapter(s) in {book_dir(a.id)}")


def _load_book(book_id: str) -> dict:
    path = book_dir(book_id) / "book.json"
    if not path.exists():
        raise SystemExit(f"{path} not found; run nl-text init first")
    return load_json(path)


def cmd_add(a: argparse.Namespace) -> None:
    book = _load_book(a.id)
    before = len(book["chapters"])
    _add_chapters(book, a.files, None)
    print(f"{a.id}: +{len(book['chapters']) - before} chapter(s), {len(book['chapters'])} total")


def _check_lexicon(srs: Path) -> None:
    path = PROFILE_DIR / "lexicon.json"
    if not path.exists():
        raise SystemExit(f"{path} missing; run: uv run --project book/pipeline nl-lexicon")
    built_from = load_json(path).get("stats", {}).get("cards")
    cards = len(load_json(srs / "public" / "cards.json"))
    if built_from != cards:
        raise SystemExit(f"lexicon.json was built from {built_from} cards, cards.json has {cards}; run nl-lexicon first")


def export_text_chapter(book: dict, chapter: dict, lex: Lexicon, card_pos: dict[str, dict], exc: dict) -> dict:
    source = (book_dir(book["id"]) / chapter["file"]).read_text(encoding="utf-8")
    pending: list[tuple[dict, _Text]] = []
    blocks: list[dict] = []
    for i, (kind, inline) in enumerate(parse_source(source), 1):
        block_id = f"b{i:03d}"
        if kind == "break":
            blocks.append({"id": block_id, "kind": "break"})
            continue
        marked = to_marked(inline)
        if not marked.chars:
            continue
        out = {"id": block_id, "kind": kind, "tokens": []}
        blocks.append(out)
        pending.append((out, marked))
    res = Resolver(lex, exc, {"terms": []}, set())
    keep_en = {e["lemma"].lower(): e.get("en", "") for e in exc.get("keep", [])}
    words, card_ids = tokenize_blocks(pending, res, card_pos, keep_en, {})
    ch = {"book": book["id"], "chapter": chapter["n"], "title": chapter["title"]}
    if chapter.get("titleEn"):
        ch["titleEn"] = chapter["titleEn"]
    return {**ch, "words": words, "missing": [], "cardIds": card_ids, "blocks": blocks}


def _unmapped(ch: dict) -> Counter:
    return Counter(
        t.get("lemma", t["w"].lower())
        for b in ch["blocks"]
        for t in b.get("tokens", [])
        if t.get("status") not in (None, "name", "number") and not t.get("cards")
    )


def cmd_export(a: argparse.Namespace) -> None:
    book = _load_book(a.id)
    chapters = [c for c in book["chapters"] if a.chapter is None or c["n"] == a.chapter]
    if not chapters:
        raise SystemExit(f"{a.id} has no chapter {a.chapter}")
    _check_lexicon(a.srs)
    public = a.srs / "public"
    lex, card_pos, exc = Lexicon(), _card_pos(a.srs), exceptions()
    total_words = 0
    total_unmapped: Counter = Counter()
    for c in chapters:
        ch = export_text_chapter(book, c, lex, card_pos, exc)
        file = f"{a.id}/ch{c['n']:03d}.json"
        _write_compact(public / "books" / file, ch)
        upsert_index(public / "books" / "index.json", ch, file, a.id, book["title"])
        upsert_path(public / "paths.json", ch, a.id, book["title"], c["title"])
        unmapped = _unmapped(ch)
        total_words += ch["words"]
        total_unmapped += unmapped
        print(f"chapter {c['n']}: {len(ch['blocks'])} blocks, {ch['words']} words, {len(ch['cardIds'])} cards, "
              f"{sum(unmapped.values())} words without a card  -> {public / 'books' / file}")
    share = sum(total_unmapped.values()) / max(1, total_words)
    print(f"{a.id}: {total_words} words, {share:.1%} without a card")
    if total_unmapped:
        print("  most frequent without a card: " + ", ".join(f"{w} ({n})" for w, n in total_unmapped.most_common(20)))
    if share > UNMAPPED_WARN:
        print(f"  WARNING: more than {UNMAPPED_WARN:.0%} of the words have no card; the text is above the card set")


def cmd_remove(a: argparse.Namespace) -> None:
    if not (book_dir(a.id) / "book.json").exists():
        raise SystemExit(f"{a.id} is not a book/texts/ book; refusing to remove it")
    public = a.srs / "public"
    index_path, paths_path = public / "books" / "index.json", public / "paths.json"
    if index_path.exists():
        index = load_json(index_path)
        _write_compact(index_path, {**index, "books": [b for b in index["books"] if b["id"] != a.id]})
    if paths_path.exists():
        paths = load_json(paths_path)
        _write_compact(paths_path, {**paths, "paths": [p for p in paths["paths"] if p["id"] != a.id]})
    shutil.rmtree(public / "books" / a.id, ignore_errors=True)
    shutil.rmtree(book_dir(a.id))
    print(f"{a.id}: removed")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-text", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--srs", type=Path, default=DEFAULT_SRS_DIR, help="dutch-srs checkout (default: this repo)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("init", help="create book/texts/<id>/ from source files")
    p.add_argument("id")
    p.add_argument("--title", required=True)
    p.add_argument("--title-en")
    p.add_argument("--source", help="where the text comes from (author, URL)")
    p.add_argument("files", nargs="+", type=Path)
    p.set_defaults(fn=cmd_init)
    p = sub.add_parser("add", help="append chapters to book/texts/<id>/")
    p.add_argument("id")
    p.add_argument("files", nargs="+", type=Path)
    p.set_defaults(fn=cmd_add)
    p = sub.add_parser("export", help="write the reader JSON, index entry and path")
    p.add_argument("id")
    p.add_argument("--chapter", type=int)
    p.set_defaults(fn=cmd_export)
    p = sub.add_parser("remove", help="delete a book/texts/ book from the repo and the app data")
    p.add_argument("id")
    p.set_defaults(fn=cmd_remove)
    a = ap.parse_args(argv)
    if not (a.srs / "public" / "cards.json").exists():
        raise SystemExit(f"{a.srs / 'public' / 'cards.json'} not found; pass --srs")
    a.fn(a)


if __name__ == "__main__":
    main()
