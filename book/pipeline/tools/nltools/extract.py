"""nl-extract: split a chapter .tex into translation scenes.

Reads book/upstream/chapters/hpmor-chapter-NNN.tex (the submodule) and writes
book/pipeline/work/chNNN/chapter.json (all blocks, scene index) and
book/pipeline/work/chNNN/scenes/sNN.src.json (one file per scene: translatable blocks
with raw TeX + plain text, plus neighbouring context).
"""

from __future__ import annotations

import argparse
import sys

from .common import chapter_file, chapter_work_dir, dump_json, scene_dir, thresholds, word_count
from .texparse import Block, parse_chapter

SCENE_BOUNDARY_KINDS = {"later"}
SCENE_BOUNDARY_HEADINGS = {"section", "latersection", "OmakeIVsection", "OmakeIVspecialsection"}


def _is_boundary(b: Block) -> bool:
    if b.kind in SCENE_BOUNDARY_KINDS:
        return True
    if b.kind == "heading":
        cmd = b.tex.strip()[1:].split("{")[0].split("[")[0]
        return cmd in SCENE_BOUNDARY_HEADINGS
    return False


def _hard_segments(blocks: list[Block]) -> list[list[Block]]:
    segs: list[list[Block]] = [[]]
    for b in blocks:
        if _is_boundary(b) and any(x.translate for x in segs[-1]):
            segs.append([])
        segs[-1].append(b)
    return [s for s in segs if s]


def _words(blocks: list[Block]) -> int:
    return sum(word_count(b.text) for b in blocks if b.translate)


def _soft_split(seg: list[Block], tmin: int, tmax: int, hard_max: int) -> list[list[Block]]:
    """Split an oversized segment at paragraph boundaries into 500–1000-word scenes."""
    if _words(seg) <= hard_max:
        return [seg]
    # candidate cut points: before a translatable para that is not inside an open environment
    # (env depth 0) and preferably at a dialogue/narrative transition
    scenes: list[list[Block]] = []
    cur: list[Block] = []
    cur_words = 0
    prev_dialogue: bool | None = None
    best_cut: int | None = None  # index in cur where a good cut would be
    best_cut_words = 0
    for b in seg:
        is_cut_candidate = b.translate and b.kind == "para" and not b.envs
        if is_cut_candidate and cur_words >= tmin:
            transition = prev_dialogue is not None and b.dialogue != prev_dialogue
            if transition or best_cut is None:
                best_cut = len(cur)
                best_cut_words = cur_words
        if is_cut_candidate and cur_words + word_count(b.text) > tmax and best_cut is not None:
            scenes.append(cur[:best_cut])
            cur = cur[best_cut:]
            cur_words -= best_cut_words
            best_cut = None
            best_cut_words = 0
        cur.append(b)
        if b.translate:
            cur_words += word_count(b.text)
            if b.kind == "para":
                prev_dialogue = b.dialogue
    if cur:
        scenes.append(cur)
    return [s for s in scenes if s]


def segment(blocks: list[Block], th: dict) -> list[list[Block]]:
    sc = th["scene"]
    out: list[list[Block]] = []
    for seg in _hard_segments(blocks):
        out.extend(_soft_split(seg, sc["target_words_min"], sc["target_words_max"], sc["hard_max_words"]))
    # merge tiny trailing/leading fragments without translatable text into neighbours
    merged: list[list[Block]] = []
    for s in out:
        if merged and not any(b.translate for b in s):
            merged[-1].extend(s)
        else:
            merged.append(s)
    return merged


def _context(blocks: list[Block], k: int) -> list[str]:
    return [b.text for b in blocks if b.translate and b.kind == "para"][-k:] if k > 0 else []


def run(chapter: int, force: bool = False) -> dict:
    th = thresholds()
    path = chapter_file(chapter)
    if not path.exists():
        raise SystemExit(f"no such chapter file: {path}")
    src = path.read_text(encoding="utf-8")
    blocks = parse_chapter(src)
    scenes = segment(blocks, th)
    wdir = chapter_work_dir(chapter)
    sdir = scene_dir(chapter)
    if wdir.exists() and not force and any(sdir.glob("*.nl.md")):
        raise SystemExit(f"{wdir} already has translations; use --force to re-extract (scene ids may shift)")
    title = next((b.text for b in blocks if b.kind == "heading"), "")
    k = th["scene"]["context_paragraphs"]
    scene_index = []
    for i, sblocks in enumerate(scenes):
        sid = f"s{i + 1:02d}"
        before = _context([b for s in scenes[:i] for b in s], k)
        after_pool = [b for s in scenes[i + 1 :] for b in s if b.translate and b.kind == "para"][:k]
        after = [b.text for b in after_pool]
        scene = {
            "chapter": chapter,
            "scene": sid,
            "index": i,
            "of": len(scenes),
            "chapter_title": title,
            "words": _words(sblocks),
            "blocks": [b.to_dict() for b in sblocks],
            "context_before": before,
            "context_after": after,
        }
        dump_json(sdir / f"{sid}.src.json", scene)
        scene_index.append(
            {
                "scene": sid,
                "words": scene["words"],
                "first_block": sblocks[0].id,
                "last_block": sblocks[-1].id,
                "translatable_blocks": sum(1 for b in sblocks if b.translate),
            }
        )
    chapter_json = {
        "chapter": chapter,
        "file": str(path.relative_to(path.parents[1])),
        "title": title,
        "words": _words(blocks),
        "blocks": [b.to_dict() for b in blocks],
        "scenes": scene_index,
    }
    dump_json(wdir / "chapter.json", chapter_json)
    return chapter_json


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-extract", description=__doc__)
    ap.add_argument("chapter", type=int)
    ap.add_argument("--force", action="store_true", help="re-extract even if translations exist")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args(argv)
    cj = run(a.chapter, force=a.force)
    if a.quiet:
        return
    print(f"chapter {cj['chapter']}: {cj['title']!r} — {cj['words']} words, {len(cj['scenes'])} scenes")
    for s in cj["scenes"]:
        print(f"  {s['scene']}  {s['words']:5d} words  {s['translatable_blocks']:3d} blocks  [{s['first_block']}..{s['last_block']}]")
    print(f"-> {chapter_work_dir(cj['chapter'])}", file=sys.stderr)


if __name__ == "__main__":
    main()
