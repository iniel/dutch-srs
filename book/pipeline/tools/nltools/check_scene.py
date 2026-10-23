"""nl-check: run all programmatic checks on a translated scene.

    nl-check 1/s02            # latest version of scene s02 in chapter 1
    nl-check 1/s02 --version 2
    nl-check path/to/s02.v1.nl.md

Writes sNN.vN.checks.json + sNN.vN.checks.md next to the scene file and prints the
markdown report (structure, vocabulary, grammar). Exit code 0 even when findings
exist — the orchestrating agent decides what to do.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

from . import grammar_check, vocab_check
from .common import load_json, parse_scene_ref, scene_dir
from .scenefile import SceneFile, latest_version, read_scene_file
from .texparse import macro_names

_GL_RE = re.compile(r"\\gl\{([^{}]*)\}\{([^{}]*)\}")
IGNORED_MACROS = {"emph", "gl", "hyp", "protect", "authorsnotefootnotemark", "authorsnotetext", "mbox", "penalty", "@"}


def _brace_balance(tex: str) -> int:
    depth = 0
    i = 0
    while i < len(tex):
        ch = tex[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    return depth


def structure_check(sf: SceneFile, src: dict | None) -> dict:
    issues: list[dict] = []
    if src:
        expected = [b["id"] for b in src["blocks"] if b["translate"]]
        got = list(sf.blocks.keys())
        for bid in expected:
            if bid not in sf.blocks:
                issues.append({"id": "S-MISSING", "block": bid, "msg": "translatable block missing from translation"})
            elif not sf.blocks[bid].strip():
                issues.append({"id": "S-EMPTY", "block": bid, "msg": "empty translation"})
        for bid in got:
            if bid not in expected:
                issues.append({"id": "S-EXTRA", "block": bid, "msg": "block id not in source scene"})
        if [b for b in got if b in expected] != [b for b in expected if b in got]:
            issues.append({"id": "S-ORDER", "block": "*", "msg": "blocks are out of source order"})
        src_by_id = {b["id"]: b for b in src["blocks"]}
        for bid, tex in sf.blocks.items():
            sb = src_by_id.get(bid)
            if not sb:
                continue
            smac = Counter(m for m in macro_names(sb["tex"]) if m not in IGNORED_MACROS)
            tmac = Counter(m for m in macro_names(tex) if m not in IGNORED_MACROS)
            for m in smac:
                if m not in tmac:
                    issues.append({"id": "S-MACRO", "block": bid, "msg": f"source uses \\{m}, translation does not"})
            for m in tmac:
                if m not in smac and m not in ("gl",):
                    issues.append({"id": "S-MACRO-NEW", "block": bid, "msg": f"translation introduces \\{m}"})
            if sb["kind"] == "heading" and not tex.lstrip().startswith("\\"):
                issues.append({"id": "S-HEADING", "block": bid, "msg": "heading block must keep its macro (\\chapter{...} etc.)"})
            # paragraph count inside a block (blank lines) should not change
            if sb["tex"].count("\n\n") != tex.count("\n\n"):
                issues.append({"id": "S-PARA", "block": bid, "msg": "blank-line structure differs from source"})
    for bid, tex in sf.blocks.items():
        if _brace_balance(tex) != 0:
            issues.append({"id": "S-BRACES", "block": bid, "msg": "unbalanced braces"})
        if tex.count("“") != tex.count("”"):
            issues.append({"id": "S-QUOTES", "block": bid, "msg": f"unbalanced quotes “ {tex.count('“')} / ” {tex.count('”')}"})
        for m in re.finditer(r"\\gl\{[^{}]*\}(?!\{)", tex):
            issues.append({"id": "S-GL", "block": bid, "msg": f"malformed \\gl near {m.group(0)}"})
        if re.search(r"\b(the|and|which|that|with|they|there|would|could|said)\b", _GL_RE.sub("", tex)):
            issues.append({"id": "S-ENGLISH", "block": bid, "msg": "looks like untranslated English fragment", "severity": "review"})
    return {"issues": issues, "ok": not [i for i in issues if i.get("severity") != "review"]}


def format_structure(s: dict) -> str:
    lines = ["## Structure", "ok" if s["ok"] and not s["issues"] else f"{len(s['issues'])} issue(s)"]
    for i in s["issues"]:
        lines.append(f"- {i['id']} {i['block']}: {i['msg']}")
    lines.append("")
    return "\n".join(lines)


def resolve_target(ref: str, version: int | None) -> tuple[Path, dict | None]:
    p = Path(ref)
    if p.exists() and p.suffix == ".md":
        sf = read_scene_file(p)
        src_path = scene_dir(sf.chapter) / f"{sf.scene}.src.json"
        return p, (load_json(src_path) if src_path.exists() else None)
    ch, sc = parse_scene_ref(ref)
    sdir = scene_dir(ch)
    if version is None:
        lv = latest_version(sdir, sc)
        if not lv:
            raise SystemExit(f"no translation found for {ref} in {sdir}")
        path = lv[1]
    else:
        path = sdir / f"{sc}.v{version}.nl.md"
        if not path.exists():
            raise SystemExit(f"{path} not found")
    src_path = sdir / f"{sc}.src.json"
    return path, (load_json(src_path) if src_path.exists() else None)


def run(path: Path, src: dict | None) -> dict:
    sf = read_scene_file(path)
    structure = structure_check(sf, src)
    known = vocab_check.load_chapter_known(sf.chapter)
    vocab = vocab_check.analyze(sf, known, src)
    grammar = grammar_check.analyze(sf)
    report = {
        "scene": f"ch{sf.chapter:03d}/{sf.scene}",
        "version": sf.version,
        "file": str(path),
        "structure": structure,
        "vocab": vocab,
        "grammar": grammar,
        "verdict": {
            "structure_ok": structure["ok"],
            "vocab_ok": vocab["verdict"]["ok"],
            "grammar_ok": grammar["verdict"]["ok"],
        },
    }
    report["verdict"]["ok"] = all(report["verdict"].values())
    md = "\n".join(
        [
            f"# Checks — {report['scene']} v{sf.version}",
            f"verdict: structure {'OK' if structure['ok'] else 'FAIL'} · vocab {'OK' if vocab['verdict']['ok'] else 'FAIL'} · grammar {'OK' if grammar['verdict']['ok'] else 'FAIL'}",
            "",
            format_structure(structure),
            vocab_check.format_report(vocab),
            grammar_check.format_report(grammar),
        ]
    )
    base = path.with_suffix("").with_suffix("")  # strip .nl.md
    (Path(str(base) + ".checks.json")).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (Path(str(base) + ".checks.md")).write_text(md, encoding="utf-8")
    return report, md  # type: ignore[return-value]


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-check", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ref", help="chapter/scene like 1/s02, or a path to sNN.vN.nl.md")
    ap.add_argument("--version", type=int, default=None)
    ap.add_argument("--quiet", action="store_true", help="print only the verdict line")
    a = ap.parse_args(argv)
    path, src = resolve_target(a.ref, a.version)
    report, md = run(path, src)
    if a.quiet:
        print(md.splitlines()[1])
    else:
        print(md)
    print(f"-> {Path(str(path.with_suffix('').with_suffix('')) + '.checks.md')}", file=sys.stderr)


if __name__ == "__main__":
    main()
