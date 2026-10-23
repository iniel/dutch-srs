"""nl-diff: compare a patched version with the reviewed one (pipeline v2, after the patch).

    nl-diff 1/s02 --from 1 --to 2

Prints, and writes to sNN.v{TO}.diff.{md,json}:
  * changed / lost / added block ids
  * the must_fix findings of sNN.v{FROM}.review.json (+ .meaning.json, legacy .language.json;
    in a second round the reopened items of sNN.v{FROM}.verify.json) and the blocks they name
  * the checks delta: structure issues, `likely` grammar flags and must-level vocabulary rows
    present in v{TO} but not in v{FROM} (needs `nl-check` on both versions)
  * per changed block: the English, the must_fix findings on it, a sentence-level unified diff
That last part is the verifier's whole input.

Exit code 0 = finalize without a verifier: changed ⊆ must_fix blocks, every must_fix block
changed, no block lost or added, checks delta empty. Exit code 1 = spawn the verifier.
"""

from __future__ import annotations

import argparse
import difflib
import re
import sys
from pathlib import Path

from .common import dump_json, load_json, parse_scene_ref, scene_dir
from .scenefile import read_scene_file
from .vocab_check import MUST_ACTIONS

_BLOCK_ID = re.compile(r"\bb\d{3}\b")
_SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+(?=[“‘(\\A-Z])")
REVIEW_FILES = ("review", "meaning", "language")


def _load(p: Path) -> dict | None:
    return load_json(p) if p.exists() else None


def must_fix(sdir: Path, scene: str, version: int) -> list[dict]:
    out = []
    has_review = (sdir / f"{scene}.v{version}.review.json").exists()
    for name in REVIEW_FILES:
        if has_review and name == "language":
            continue
        rev = _load(sdir / f"{scene}.v{version}.{name}.json")
        for f in (rev or {}).get("findings", []):
            if f.get("severity") == "must_fix":
                out.append({**f, "_file": name, "_blocks": sorted(set(_BLOCK_ID.findall(str(f.get("block", ""))) + list(f.get("blocks", []))))})
    # second patch round: the verifier's reopened items are the must_fix list
    for it in (_load(sdir / f"{scene}.v{version}.verify.json") or {}).get("items", []):
        if it.get("status") in ("reopened", "regression"):
            out.append({"id": it.get("id"), "block": it.get("block", ""), "problem": it.get("status"), "required_fix": it.get("note", ""), "category": "verify", "_file": "verify", "_blocks": _BLOCK_ID.findall(str(it.get("block", "")))})
    return out


def checks_delta(sdir: Path, scene: str, a: int, b: int, changed: set[str]) -> tuple[list[str], str | None]:
    ca, cb = _load(sdir / f"{scene}.v{a}.checks.json"), _load(sdir / f"{scene}.v{b}.checks.json")
    if ca is None or cb is None:
        return [], f"checks missing for v{a if ca is None else b}: run nl-check first"
    delta = []
    sa = {(i["id"], i["block"]) for i in ca["structure"]["issues"] if i.get("severity") != "review"}
    for i in cb["structure"]["issues"]:
        if i.get("severity") != "review" and (i["id"], i["block"]) not in sa:
            delta.append(f"structure {i['id']} {i['block']}: {i['msg']}")
    la = {(f["id"], f["block"], f["span"]) for f in ca["grammar"]["flags"] if f["level"] == "likely"}
    for f in cb["grammar"]["flags"]:
        if f["level"] == "likely" and f["block"] in changed and (f["id"], f["block"], f["span"]) not in la:
            delta.append(f"grammar {f['id']} {f['block']}: {f['span']}")
    va = {i["lemma"] for i in ca["vocab"]["lemmas"] if i.get("action") in MUST_ACTIONS}
    for i in cb["vocab"]["lemmas"]:
        if i.get("action") in MUST_ACTIONS and i["lemma"] not in va:
            delta.append(f"vocab {i['action']} {i['lemma']} {' '.join(i['blocks'])}")
    return delta, None


def _sentences(tex: str) -> list[str]:
    return [s for s in _SENT_SPLIT.split(tex.strip()) if s]


def run(chapter: int, scene: str, a: int, b: int) -> tuple[dict, str]:
    sdir = scene_dir(chapter)
    va, vb = read_scene_file(sdir / f"{scene}.v{a}.nl.md"), read_scene_file(sdir / f"{scene}.v{b}.nl.md")
    src = _load(sdir / f"{scene}.src.json") or {"blocks": []}
    en = {blk["id"]: blk["text"] for blk in src["blocks"]}
    lost = [x for x in va.blocks if x not in vb.blocks]
    added = [x for x in vb.blocks if x not in va.blocks]
    changed = [x for x in vb.blocks if x in va.blocks and va.blocks[x].strip() != vb.blocks[x].strip()]
    findings = must_fix(sdir, scene, a)
    finding_blocks = sorted({x for f in findings for x in f["_blocks"]})
    extra = [x for x in changed if x not in finding_blocks]
    untouched = [x for x in finding_blocks if x not in changed]
    delta, missing = checks_delta(sdir, scene, a, b, set(changed))
    ok = not (lost or added or extra or untouched or delta or missing)
    result = {
        "scene": f"ch{chapter:03d}/{scene}",
        "from": a,
        "to": b,
        "ok": ok,
        "changed": changed,
        "must_fix_blocks": finding_blocks,
        "must_fix": [f.get("id") for f in findings],
        "extra": extra,
        "untouched": untouched,
        "lost": lost,
        "added": added,
        "checks_delta": delta,
        "checks_missing": missing,
    }
    lines = [
        f"# Diff — ch{chapter:03d} {scene} v{a} → v{b}",
        f"verdict: {'OK — finalize' if ok else 'VERIFY — spawn the verifier on the blocks below'}",
        f"changed: {' '.join(changed) or 'none'} · must_fix blocks: {' '.join(finding_blocks) or 'none'} ({', '.join(result['must_fix']) or 'no must_fix'})",
    ]
    for label, xs in (("changed outside the must_fix blocks", extra), ("must_fix blocks not changed", untouched), ("blocks lost", lost), ("blocks added", added)):
        if xs:
            lines.append(f"{label}: {' '.join(xs)}")
    if missing:
        lines.append(missing)
    if delta:
        lines.append("new in the checks of v%d:" % b)
        lines += [f"- {d}" for d in delta]
    lines.append("")
    for bid in sorted(set(changed) | set(untouched), key=lambda x: (x not in changed, x)):
        lines.append(f"## {bid}")
        if bid in en:
            lines.append(f"EN: {en[bid]}")
        for f in findings:
            if bid in f["_blocks"]:
                lines.append(f"{f.get('id')} ({f.get('category', '')}): {f.get('problem', '')} → {f.get('required_fix', '')}")
        if bid in changed:
            diff = difflib.unified_diff(_sentences(va.blocks[bid]), _sentences(vb.blocks[bid]), f"v{a}", f"v{b}", n=0, lineterm="")
            lines += ["```diff", *[d for d in diff if not d.startswith(("---", "+++"))], "```"]
        else:
            lines.append("(unchanged)")
        lines.append("")
    return result, "\n".join(lines)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-diff", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ref", help="chapter/scene like 1/s02")
    ap.add_argument("--from", dest="a", type=int, required=True, help="reviewed version K")
    ap.add_argument("--to", dest="b", type=int, default=None, help="patched version (default K+1)")
    a = ap.parse_args(argv)
    ch, sc = parse_scene_ref(a.ref)
    b = a.b if a.b is not None else a.a + 1
    result, md = run(ch, sc, a.a, b)
    base = scene_dir(ch) / f"{sc}.v{b}.diff"
    Path(str(base) + ".md").write_text(md + "\n", encoding="utf-8")
    dump_json(Path(str(base) + ".json"), result)
    print(md)
    print(f"-> {base}.md", file=sys.stderr)
    sys.exit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()
