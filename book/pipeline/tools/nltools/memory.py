"""nl-memory: chapter-scoped book memory for the role prompts.

    nl-memory N               # book/pipeline/work/chNNN/memory.md for chapter N (chapter pass)
    nl-memory N --scene sNN   # same, glossary narrowed to the terms of that scene

Writes the parts of memory/bible.md a role may use while working on chapter N, plus
the glossary terms that occur in the text, plus the words already glossed in the chapter:
  * always: ## Global decisions, ## Narrator voice
  * ## Characters → only `### Chapter K` subsections with K <= N
  * ## Running terms… → only table rows whose `first` chapter is <= N
  * ## Per-chapter notes → only `### Chapter K — …` with K <= N
  * never: ## Spoilers, and no other section
  * glossary: terms whose `en` occurs in the English or whose `nl` / `nl_forms` occur in the
    Dutch of the scene (or of the chapter without --scene); without --scene also every term with
    first_chapter <= N, capped by --max-terms
Roles read this file instead of bible.md + glossary.json (experiments/analysis-cost.md §5.2 #1).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from .common import MEMORY_DIR, chapter_work_dir, glossary, load_json, scene_dir, word_count
from .scenefile import latest_version, read_scene_file
from .texparse import tex_to_text

ALWAYS = ("Global decisions", "Narrator voice")
BY_SUBSECTION = ("Characters", "Per-chapter notes")
RUNNING = "Running terms"
_CH_RE = re.compile(r"^###\s+Chapter\s+(\d+)\b")


def _sections(text: str, level: str) -> list[tuple[str, str]]:
    """Split markdown into (heading line, body) at headings of exactly `level` ('##' or '###')."""
    out: list[tuple[str, str]] = []
    head, buf = "", []
    for ln in text.splitlines():
        if ln.startswith(level + " ") and not ln.startswith(level + "#"):
            out.append((head, "\n".join(buf)))
            head, buf = ln, []
        else:
            buf.append(ln)
    out.append((head, "\n".join(buf)))
    return out


def _first_chapter(cell: str) -> int | None:
    nums = [int(x) for x in re.findall(r"\d+", cell)]
    return min(nums) if nums else None


def bible_for(chapter: int, text: str) -> tuple[str, list[str]]:
    parts: list[str] = []
    skipped: list[str] = []
    for head, body in _sections(text, "##"):
        if not head:
            continue
        name = head[3:].strip()
        if name.startswith(ALWAYS):
            parts.append(f"{head}\n{body.strip()}\n")
        elif name.startswith(BY_SUBSECTION):
            subs = _sections(body, "###")
            kept = [f"{h}\n{b.strip()}\n" for h, b in subs if h and (m := _CH_RE.match(h)) and int(m.group(1)) <= chapter]
            intro = subs[0][1].strip()
            parts.append(f"{head}\n" + (intro + "\n\n" if intro else "") + "\n".join(kept))
        elif name.startswith(RUNNING):
            rows = []
            for ln in body.splitlines():
                if not ln.startswith("|"):
                    rows.append(ln)
                    continue
                cells = [c.strip() for c in ln.strip("|").split("|")]
                first = _first_chapter(cells[2]) if len(cells) > 2 else None
                if first is None or first <= chapter:  # header and separator rows have no number
                    rows.append(ln)
            parts.append(f"{head}\n" + "\n".join(rows).strip() + "\n")
        else:
            skipped.append(name)
    return "\n".join(parts), skipped


def _scene_texts(chapter: int, scene: str | None) -> tuple[str, str]:
    """(English, Dutch) plain text of the scene, or of the whole chapter when scene is None."""
    sdir = scene_dir(chapter)
    if scene:
        src = load_json(sdir / f"{scene}.src.json")
        en = "\n".join(b["text"] for b in src["blocks"] if b.get("translate"))
        lv = latest_version(sdir, scene)
        nl = "\n".join(tex_to_text(t) for t in read_scene_file(lv[1]).blocks.values()) if lv else ""
        return en, nl
    cj_path = chapter_work_dir(chapter) / "chapter.json"
    en = "\n".join(b["text"] for b in load_json(cj_path)["blocks"] if b.get("translate")) if cj_path.exists() else ""
    nl = []
    for p in sorted(sdir.glob("s*.final.nl.md")):
        nl += [tex_to_text(t) for t in read_scene_file(p).blocks.values()]
    return en, "\n".join(nl)


def _occurs(needle: str, hay: str) -> bool:
    if len(needle) < 3:
        return False
    flags = 0 if needle[:1].isupper() else re.IGNORECASE  # names match case-sensitively ('Light' vs 'light')
    return re.search(r"(?<!\w)" + re.escape(needle) + r"(?!\w)", hay, flags) is not None


def glossary_for(chapter: int, en: str, nl: str, scene: str | None, max_terms: int) -> list[dict]:
    hits, rest = [], []
    for t in glossary().get("terms", []):
        nl_forms = [t.get("nl", "")] + t.get("nl_forms", [])
        if _occurs(t.get("en", ""), en) or any(_occurs(f, nl) for f in nl_forms if f):
            hits.append(t)
        elif scene is None and t.get("first_chapter") is not None and t["first_chapter"] <= chapter:
            rest.append(t)
    rest.sort(key=lambda t: -t["first_chapter"])
    return (hits + rest)[: max(max_terms, len(hits))]


def _term_line(t: dict) -> str:
    forms = [f for f in t.get("nl_forms", []) if f != t.get("nl")]
    line = f"- {t['en']} → **{t['nl']}** ({t.get('kind', '')}, ch {t.get('first_chapter') or '–'})"
    if forms:
        line += f"; forms: {', '.join(forms)}"
    if t.get("note"):
        line += f" — {t['note']}"
    return line


def build(chapter: int, scene: str | None = None, max_terms: int = 60) -> tuple[Path, int]:
    bible, skipped = bible_for(chapter, (MEMORY_DIR / "bible.md").read_text(encoding="utf-8"))
    en, nl = _scene_texts(chapter, scene)
    terms = glossary_for(chapter, en, nl, scene, max_terms)
    known_p = MEMORY_DIR / "known-so-far" / f"ch{chapter:03d}.json"
    glossed = load_json(known_p).get("glossed", []) if known_p.exists() else []
    policy = glossary().get("policy", "")
    scope = f"chapter {chapter}, scene {scene}" if scene else f"chapter {chapter}"
    out = [
        f"# Book memory — {scope}",
        "",
        f"Generated by `nl-memory {chapter}{' --scene ' + scene if scene else ''}` from `book/pipeline/memory/bible.md` (sections for chapters ≤ {chapter}, "
        "no spoilers) and `book/pipeline/memory/glossary.json`. Read this instead of those two files; edit only the sources.",
        "",
        bible.strip(),
        "",
        f"## Glossary ({len(terms)} terms {'in this scene' if scene else 'for this chapter'})",
        "",
        policy,
        "",
        *[_term_line(t) for t in terms],
        "",
        "## Already glossed in this chapter (do not gloss again)",
        "",
        ", ".join(glossed) if glossed else "none yet",
        "",
    ]
    text = "\n".join(out)
    path = chapter_work_dir(chapter) / "memory.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    if skipped:
        print(f"note: bible sections not included: {', '.join(skipped)}", file=sys.stderr)
    return path, round(word_count(text) * 1.4)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-memory", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("chapter", type=int)
    ap.add_argument("--scene", default=None, help="sNN: narrow the glossary to the terms of this scene")
    ap.add_argument("--max-terms", type=int, default=60, help="cap for terms that do not occur in the text (chapter mode)")
    a = ap.parse_args(argv)
    path, tokens = build(a.chapter, a.scene, a.max_terms)
    print(f"memory -> {path} (≈ {tokens} tokens)")
    if tokens > 9000:
        print("warning: above the ≈ 7k-token target; trim the chapter's bible sections", file=sys.stderr)


if __name__ == "__main__":
    main()
