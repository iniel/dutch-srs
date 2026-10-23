"""nl-reader: export a finished chapter as tap-to-translate JSON for the dutch-srs reader.

Every word token carries its lemma, lexicon status and the dutch-srs card ids it maps to
(resolved with the same spaCy + Resolver logic as nl-vocab), so the app needs no NLP.

    nl-reader 1                 # -> public/books/hpmor/ch001.json of this repo
    nl-reader 1 --srs PATH      # another dutch-srs checkout (e.g. a worktree)

Also upserts the chapter into public/books/index.json and a `hpmor` chapter path
(one unit per chapter, every card id met in that chapter) into public/paths.json,
so "Add to next lesson" from the reader surfaces in the HPMOR lessons.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from .assemble import collect_translations
from .common import DEFAULT_SRS_DIR, chapter_work_dir, exceptions, glossary, load_json
from .lexicon_build import CARD_POS, strip_article
from .nlp import is_word, nlp
from .texparse import tex_to_text
from .vocab_check import Lexicon, Resolver, capitalised_after_lowercase, source_names

BOOK_ID = "hpmor"
BOOK_TITLE = "Harry Potter en de Methoden van Rationaliteit"
NBSP = "\u00a0"

_ONE_ARG_PASS = {"chapter", "letterAddress", "textnormal", "textrm", "mbox", "hbox"}
_EMPH = {"emph", "textit"}


class _Text:
    """Plain text built char by char, with italics / gloss / nbsp flags per char."""

    def __init__(self) -> None:
        self.chars: list[str] = []
        self.em: list[bool] = []
        self.gloss: list[int] = []
        self.glosses: list[str] = []

    def add(self, s: str, em: bool, gloss: int) -> None:
        for ch in s:
            self.chars.append(ch)
            self.em.append(em)
            self.gloss.append(gloss)

    def collapsed(self) -> "_Text":
        out = _Text()
        out.glosses = self.glosses
        for ch, em, gl in zip(self.chars, self.em, self.gloss):
            if ch in " \t\r":
                ch = " "
            if ch in " \n" and (not out.chars or out.chars[-1] in " \n" + NBSP):
                if ch == "\n" and out.chars and out.chars[-1] == " ":
                    out.chars[-1] = "\n"
                continue
            out.chars.append(ch)
            out.em.append(em)
            out.gloss.append(gl)
        while out.chars and out.chars[-1] in " \n":
            for a in (out.chars, out.em, out.gloss):
                a.pop()
        return out


def _group(tex: str, i: int, open_: str, close: str) -> tuple[str, int] | None:
    """Balanced group starting at tex[i] == open_ -> (inner, index after close)."""
    if i >= len(tex) or tex[i] != open_:
        return None
    depth = 0
    j = i
    while j < len(tex):
        ch = tex[j]
        if ch == "\\":
            j += 2
            continue
        if ch == open_:
            depth += 1
        elif ch == close:
            depth -= 1
            if depth == 0:
                return tex[i + 1 : j], j + 1
        j += 1
    return None


def _args(tex: str, i: int, n: int) -> tuple[str | None, list[str], int]:
    """Parse `[opt]{a}{b}…` after a command name -> (opt, args, next index)."""
    opt = None
    g = _group(tex, i, "[", "]")
    if g:
        opt, i = g
    args: list[str] = []
    for _ in range(n):
        g = _group(tex, i, "{", "}")
        if not g:
            break
        args.append(g[0])
        i = g[1]
    return opt, args, i


def _plain(s: str) -> str:
    s = s.replace("---", "—").replace("--", "–")
    return s.replace("{", "").replace("}", "")


def tex_to_marked(tex: str) -> _Text:
    out = _Text()

    def walk(s: str, em: bool, gloss: int) -> None:
        i = 0
        buf: list[str] = []

        def flush() -> None:
            if buf:
                out.add(_plain("".join(buf)).replace("\n", " ").replace("~", NBSP), em, gloss)
                buf.clear()

        while i < len(s):
            ch = s[i]
            if ch == "%":
                j = s.find("\n", i)
                i = len(s) if j < 0 else j + 1
                continue
            if ch != "\\":
                buf.append(ch)
                i += 1
                continue
            m = re.match(r"\\([A-Za-z]+\*?)", s[i:])
            if not m:
                pair = s[i : i + 2]
                if pair == "\\\\":
                    flush()
                    out.add("\n", em, gloss)
                else:
                    buf.append({"\\@": "", "\\-": "", "\\,": " ", "\\ ": " "}.get(pair, tex_to_text(pair)))
                i += 2
                continue
            flush()
            start = i
            name, i = m.group(1), i + len(m.group(0))
            if name in _EMPH:
                _o, a, i = _args(s, i, 1)
                walk(a[0] if a else "", not em, gloss)
            elif name == "gl":
                _o, a, i = _args(s, i, 2)
                if a:
                    out.glosses.append(tex_to_text(a[1]) if len(a) > 1 else "")
                    walk(a[0], em, len(out.glosses))
            elif name in ("lettrine", "lettrinepara"):
                opt, a, i = _args(s, i, 2)
                ante = ""
                if opt:
                    am = re.search(r"ante=([^,\]]*)", opt)
                    ante = am.group(1) if am else ""
                walk(ante + "".join(a), em, gloss)
            elif name == "letterClosing":
                opt, a, i = _args(s, i, 1)
                if opt:
                    walk(opt, em, gloss)
                    out.add("\n", em, gloss)
                walk(a[0] if a else "", em, gloss)
            elif name in _ONE_ARG_PASS:
                _o, a, i = _args(s, i, 1)
                walk(a[0] if a else "", em, gloss)
            else:
                # unknown/layout macro: let tex_to_text decide (drops vspace, footnote marks, …)
                _o, _a, j = _args(s, i, 1)
                out.add(tex_to_text(s[start:j]), em, gloss)
                i = j
        flush()

    walk(tex, False, 0)
    return out.collapsed()


def _model():
    model = nlp()
    from spacy.util import compile_infix_regex

    infixes = list(model.Defaults.infixes) + [r"[—–]"]
    model.tokenizer.infix_finditer = compile_infix_regex(infixes).finditer
    return model


def _block_kind(b: dict) -> str:
    if b["kind"] == "heading":
        return "heading"
    if b["kind"] == "later":
        return "break"
    return {"chapterOpeningQuote": "quote", "writtenNote": "note"}.get(b.get("env") or "", "para")


def _glossary_en(gloss_terms: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for t in gloss_terms.get("terms", []):
        if not t.get("en") or t["en"].lower() == t.get("nl", "").lower():
            continue
        for w in [t.get("nl", "")] + t.get("nl_forms", []):
            if w and " " not in w:
                out.setdefault(w.lower(), t["en"])
    return out


def _cards(lex: Lexicon, lemma: str, status: str, entry: dict | None) -> list[str]:
    if status == "compound":
        ids: list[str] = []
        for part in lemma.split("+"):
            for cid in (lex.lookup(part) or {}).get("cards", []):
                if cid not in ids:
                    ids.append(cid)
        return ids
    return list((entry or {}).get("cards", []))


def _lexicon_hit(res: Resolver, tok) -> tuple[str, dict] | None:
    """First resolver candidate that has lexicon cards (for tokens resolved as term/number)."""
    for c in res.candidates(tok):
        e = res.lex.lookup(c)
        if e and e.get("cards") and (c not in res._heuristic or res._pos_match(e, tok)):
            return c, e
    return None


def _verb_stem_hit(lex: Lexicon, low: str) -> tuple[str, dict] | None:
    """Finite/participle forms the forms table misses: glimt -> glim -> glimmen, glimde, geglimd."""
    stems = [low[: -len(suf)] for suf in ("t", "de", "te", "den", "ten") if low.endswith(suf) and len(low) - len(suf) >= 3]
    if low.startswith("ge") and low[-1] in "dt" and len(low) > 5:
        stems.append(low[2:-1])
    for s in stems:
        for cand in ([s + s[-1] + "en"] if s[-1] not in "aeiou" else []) + [s + "en"]:
            e = lex.lookup(cand)
            if e and e.get("cards") and "VERB" in e.get("pos", []):
                return cand, e
    return None


def _card_pos(srs: Path) -> dict[str, dict]:
    """card id -> {"pos": [...]} (lexicon POS tags) and whether the card is multi-word."""
    out: dict[str, dict] = {}
    for c in load_json(srs / "public" / "cards.json"):
        out[c["id"]] = {"pos": CARD_POS.get(c.get("pos") or "", []), "multi": " " in strip_article(c["dutch"]).strip()}
    return out


def _rank_cards(ids: list[str], tok, card_pos: dict[str, dict]) -> list[str]:
    """POS-matching single-word cards first (zijn/DET -> 'his' before 'to be')."""
    def key(cid: str) -> tuple[int, int]:
        info = card_pos.get(cid, {"pos": [], "multi": False})
        return (0 if Resolver._pos_match(info, tok) else 1, 1 if info["multi"] else 0)

    return sorted(ids, key=key)


def export_chapter(chapter: int, srs: Path = DEFAULT_SRS_DIR) -> dict:
    cj = load_json(chapter_work_dir(chapter) / "chapter.json")
    nl, _used = collect_translations(chapter, draft=False)
    lex = Lexicon()
    exc = exceptions()
    terms = glossary()
    res = Resolver(lex, exc, terms, set(), source_names(cj))
    keep_en = {e["lemma"].lower(): e.get("en", "") for e in exc.get("keep", [])}
    term_en = _glossary_en(terms)
    card_pos = _card_pos(srs)
    model = _model()

    pending: list[tuple[dict, _Text]] = []
    blocks: list[dict] = []
    missing: list[str] = []
    for b in cj["blocks"]:
        kind = _block_kind(b)
        if kind == "break":
            blocks.append({"id": b["id"], "kind": "break"})
            continue
        if not b["translate"]:
            continue
        tex = nl.get(b["id"], "").strip()
        if not tex:
            missing.append(b["id"])
            continue
        marked = tex_to_marked(tex)
        if not marked.chars:
            continue
        out = {"id": b["id"], "kind": kind, "en": b["text"], "tokens": []}
        blocks.append(out)
        pending.append((out, marked))

    texts = ["".join(m.chars).replace(NBSP, " ") for _o, m in pending]
    for t in texts:
        res.names |= capitalised_after_lowercase(t)

    words = 0
    card_order: list[str] = []
    for (out, marked), doc in zip(pending, model.pipe(texts)):
        resolved: dict[int, tuple[str, str, list[str]]] = {}
        for tok in doc:
            if is_word(tok):
                lemma, status, entry = res.resolve(tok)
                cards = _cards(lex, lemma, status, entry)
                if not cards and status in ("term", "number") and not any(ch.isdigit() for ch in tok.text):
                    hit = _lexicon_hit(res, tok)
                    if hit:
                        lemma, cards = hit[0], list(hit[1]["cards"])
                if not cards and status == "unknown":
                    hit = _verb_stem_hit(lex, tok.lower_)
                    if hit:
                        lemma, status, cards = hit[0], hit[1]["status"], list(hit[1]["cards"])
                resolved[tok.i] = (lemma, status, _rank_cards(cards, tok, card_pos))
        for tok in doc:
            # separable particle (“stond … op”) shares the verb's lemma and cards
            if tok.dep_ == "compound:prt" and tok.i in resolved and tok.head.i in resolved:
                head = resolved[tok.head.i]
                if head[0].startswith(tok.lower_) and head[2]:
                    resolved[tok.i] = head
        for tok in doc:
            end = tok.idx + len(tok.text)
            sp = tok.whitespace_
            if sp and end < len(marked.chars) and marked.chars[end] == NBSP:
                sp = NBSP
            elif sp and end < len(marked.chars) and marked.chars[end] == "\n":
                sp = "\n"
            t: dict = {"w": tok.text}
            if sp != " ":
                t["sp"] = sp
            if marked.em[tok.idx]:
                t["em"] = True
            if tok.i in resolved:
                words += 1
                lemma, status, cards = resolved[tok.i]
                if status == "compound":
                    lemma = tok.lower_
                if lemma and lemma != tok.text.lower():
                    t["lemma"] = lemma
                t["status"] = status
                if cards:
                    t["cards"] = cards
                    for cid in cards:
                        if cid not in card_order:
                            card_order.append(cid)
                gl = marked.gloss[tok.idx]
                gloss = marked.glosses[gl - 1] if gl else ""
                if not gloss and status == "keep":
                    gloss = keep_en.get(lemma, "")
                if not gloss:
                    gloss = term_en.get(tok.lower_, "")
                if gloss and gloss.lower() != tok.lower_:
                    t["gloss"] = gloss
            out["tokens"].append(t)

    heading = next((b for b in blocks if b["kind"] == "heading"), None)
    title = "".join(t["w"] + t.get("sp", " ") for t in heading["tokens"]).strip() if heading else f"Hoofdstuk {chapter}"
    return {
        "book": BOOK_ID,
        "chapter": chapter,
        "title": title,
        "titleEn": cj.get("title", ""),
        "words": words,
        "missing": missing,
        "cardIds": card_order,
        "blocks": blocks,
    }


def _write_compact(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)


def upsert_index(index_path: Path, ch: dict, file: str) -> None:
    data = load_json(index_path) if index_path.exists() else {"version": 1, "books": []}
    book = next((b for b in data["books"] if b["id"] == BOOK_ID), None)
    if book is None:
        book = {"id": BOOK_ID, "title": BOOK_TITLE, "chapters": []}
        data["books"].append(book)
    entry = {"n": ch["chapter"], "title": ch["title"], "titleEn": ch["titleEn"], "words": ch["words"], "file": file}
    book["chapters"] = sorted([c for c in book["chapters"] if c["n"] != ch["chapter"]] + [entry], key=lambda c: c["n"])
    _write_compact(index_path, data)


def upsert_path(paths_path: Path, ch: dict) -> None:
    """Same ordering rules as dutch-srs scripts/paths-file.mjs (upsertPath).

    Like the Nederlands in gang path it also carries `unitSize` + one difficulty tier per
    chapter: installed PWAs on an older cached build crash on a path without `difficulties`.
    """
    data = load_json(paths_path) if paths_path.exists() else {"version": 1, "paths": []}
    old = next((p for p in data["paths"] if p["id"] == BOOK_ID), None)
    units = [u for u in (old or {}).get("units", []) if u["id"] != f"{BOOK_ID}:ch{ch['chapter']:03d}"]
    units.append({"id": f"{BOOK_ID}:ch{ch['chapter']:03d}", "label": f"Hoofdstuk {ch['chapter']}", "cardIds": ch["cardIds"]})
    units.sort(key=lambda u: u["id"])
    path = {
        "id": BOOK_ID,
        "name": "HPMOR",
        "units": units,
        "unitSize": max(1, *(len(u["cardIds"]) for u in units)),
        "difficulties": [{"key": u["id"].split(":")[-1], "label": u["label"], "cardIds": u["cardIds"]} for u in units],
    }
    paths = [p for p in data["paths"] if p["id"] != BOOK_ID] + [path]
    priority = {"inburgering": 0, "nederlands-in-gang": 1}
    paths.sort(key=lambda p: priority.get(p["id"], 2))
    _write_compact(paths_path, {**data, "paths": paths})


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-reader", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("chapter", type=int)
    ap.add_argument("--srs", type=Path, default=DEFAULT_SRS_DIR, help="dutch-srs checkout (default: this repo)")
    a = ap.parse_args(argv)
    if a.chapter >= 900:
        raise SystemExit("pseudo-chapters (>= 900) are experiments, not book chapters")
    if not (chapter_work_dir(a.chapter) / "chapter.json").exists():
        raise SystemExit(f"chapter {a.chapter} not extracted; run nl-extract {a.chapter}")
    public = a.srs / "public"
    if not (public / "cards.json").exists():
        raise SystemExit(f"{public / 'cards.json'} not found; pass --srs")
    ch = export_chapter(a.chapter, a.srs)
    if not any(b.get("tokens") for b in ch["blocks"]):
        raise SystemExit(f"chapter {a.chapter} has no final scene files yet")
    file = f"{BOOK_ID}/ch{a.chapter:03d}.json"
    _write_compact(public / "books" / file, ch)
    upsert_index(public / "books" / "index.json", ch, file)
    upsert_path(public / "paths.json", ch)
    unmapped = sum(
        1 for b in ch["blocks"] for t in b.get("tokens", [])
        if t.get("status") not in (None, "name", "number") and not t.get("cards")
    )
    print(f"chapter {a.chapter}: {len(ch['blocks'])} blocks, {ch['words']} words, {len(ch['cardIds'])} cards, {unmapped} words without a card")
    if ch["missing"]:
        print(f"  not translated yet (skipped): {', '.join(ch['missing'])}")
    print(f"  -> {public / 'books' / file}")


if __name__ == "__main__":
    main()
