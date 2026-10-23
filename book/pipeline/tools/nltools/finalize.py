"""nl-finalize: close a scene after the review loop (skill step 8).

    nl-finalize 1/s02 [--version K] [--unresolved M3,L2]

  * copies sNN.vK.nl.md -> sNN.final.nl.md
  * writes sNN.report.md from the files of every version: checks, review (pipeline v2),
    meaning (v2 extra pass, or Phase 1), language (Phase 1), diff and verify (v2 patch round);
    for v2 scenes: must_fix status and the should_fix deferred to the chapter pass
  * updates memory/known-so-far/chNNN.json with all \\gl words of the chapter's finals
  * appends the translator's @notes and CONFLICT lines to memory/inbox.md (once per scene
    version; never after the chapter pass marked the chapter consumed)
Pseudo-chapters >= 900 (experiments) skip the memory updates.
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

from .common import MEMORY_DIR, dump_json, load_json, parse_scene_ref, scene_dir
from .scenefile import latest_version, read_scene_file

_GL_RE = re.compile(r"\\gl\{([^{}]*)\}\{([^{}]*)\}")


def _sev_counts(review: dict | None) -> dict:
    out = {"must_fix": 0, "should_fix": 0, "note": 0}
    for f in (review or {}).get("findings", []):
        out[f.get("severity", "note")] = out.get(f.get("severity", "note"), 0) + 1
    return out


def _load(p: Path) -> dict | None:
    return load_json(p) if p.exists() else None


REVIEWS = ("review", "meaning", "language")  # review = pipeline v2; meaning = v2 extra pass or legacy; language = legacy


def _item(f: dict, status: str = "") -> str:
    return f"- {f.get('id')} ({f.get('severity')}, {f.get('category', '')}) {f.get('block', '')}: {f.get('problem', '')}" + (f" [{status}]" if status else "")


def _open_items_v2(sdir: Path, scene: str, reviewed: int, final: int, unresolved: list[str]) -> list[str]:
    """must_fix of the reviewed version with their patch status; should_fix deferred to the chapter pass."""
    findings = [f for name in ("review", "meaning") for f in (_load(sdir / f"{scene}.v{reviewed}.{name}.json") or {}).get("findings", [])]
    status: dict[str, str] = {}
    for v in range(reviewed + 1, final + 1):
        diff = _load(sdir / f"{scene}.v{v}.diff.json")
        if diff and diff.get("ok"):
            status.update({i: "fixed (diff ok)" for i in diff.get("must_fix", [])})
        for it in (_load(sdir / f"{scene}.v{v}.verify.json") or {}).get("items", []):
            status[it.get("id")] = "fixed (verified)" if it.get("status") == "fixed" else f"{it.get('status')}: {it.get('note', '')}"
    must = [f for f in findings if f.get("severity") == "must_fix"]
    open_must = [f for f in must if f.get("id") in unresolved or not status.get(f.get("id"), "").startswith("fixed")]
    fixed = [f for f in must if f not in open_must]
    out = [f"must_fix: {len(fixed)}/{len(must)} fixed" + ("".join(f"; {f.get('id')} {status[f.get('id')]}" for f in fixed)) if must else "must_fix: none"]
    if open_must:
        out.append("unresolved after the final version:")
        out += [_item(f, status.get(f.get("id"), "not patched" if final == reviewed else "patched, not verified")) for f in open_must]
    else:
        out.append("unresolved: none")
    deferred = [f for f in findings if f.get("severity") == "should_fix"]
    notes = sum(1 for f in findings if f.get("severity") == "note")
    out.append("")
    out.append("deferred to the chapter pass (should_fix):" if deferred else "deferred to the chapter pass: none")
    out += [_item(f) + (f" → {f.get('required_fix', '')}" if f.get("required_fix") else "") for f in deferred]
    if notes:
        out.append(f"notes: {notes} in {scene}.v{reviewed}.review.json (the chapter pass reads them only for blocks it touches)")
    return out


def finalize(chapter: int, scene: str, version: int | None, unresolved: list[str]) -> Path:
    sdir = scene_dir(chapter)
    if version is None:
        lv = latest_version(sdir, scene)
        if not lv:
            raise SystemExit(f"no versions for {chapter}/{scene}")
        version = lv[0]
    src = sdir / f"{scene}.v{version}.nl.md"
    if not src.exists():
        raise SystemExit(f"{src} not found")
    final = sdir / f"{scene}.final.nl.md"
    shutil.copy(src, final)
    sf = read_scene_file(final)

    reviewed = [v for v in range(1, version + 1) if (sdir / f"{scene}.v{v}.review.json").exists()]
    rounds = version - reviewed[-1] if reviewed else version - 1
    lines = [f"# ch{chapter:03d} {scene} — report", f"final: v{version} ({'no fix round' if rounds == 0 else f'{rounds} fix round(s)'})", ""]
    for v in range(1, version + 1):
        if not (sdir / f"{scene}.v{v}.nl.md").exists():
            continue
        parts = [f"v{v}:"]
        checks = _load(sdir / f"{scene}.v{v}.checks.json")
        if checks:
            vc, gc = checks["vocab"], checks["grammar"]["summary"]
            parts.append(f"checks known {vc['known_share']:.1%} · new/1000 {vc['new_per_1000']} · grammar likely {gc['likely']} review {gc['review']} · load {gc['load']} · structure {'ok' if checks['structure']['ok'] else 'ISSUES'}")
        for name in REVIEWS:
            rev = _load(sdir / f"{scene}.v{v}.{name}.json")
            if rev:
                c = _sev_counts(rev)
                part = f"{name} {rev.get('verdict')} must {c['must_fix']} should {c['should_fix']} note {c['note']}"
                comp = rev.get("comprehension", [])
                if comp:
                    part += f" · comprehension {sum(1 for q in comp if q.get('answerable'))}/{len(comp)}"
                if "flag_decisions" in rev:
                    fd = rev["flag_decisions"]
                    part += f" · flags confirmed {sum(1 for d in fd if d.get('decision') == 'confirmed')}/{len(fd)}"
                parts.append(part)
        diff = _load(sdir / f"{scene}.v{v}.diff.json")
        if diff:
            parts.append(f"diff v{diff['from']}→v{v} {'ok' if diff['ok'] else 'VERIFY'} · changed {' '.join(diff['changed']) or 'none'}")
        verify = _load(sdir / f"{scene}.v{v}.verify.json")
        if verify:
            items = verify.get("items", [])
            parts.append(f"verify {verify.get('verdict')} · fixed {sum(1 for i in items if i.get('status') == 'fixed')}/{len(items)}")
        lines.append("- " + " | ".join(parts))
    lines.append("")
    if reviewed:
        lines += _open_items_v2(sdir, scene, reviewed[-1], version, unresolved)
    else:
        open_items = []
        for rev_name in ("meaning", "language"):
            rev = _load(sdir / f"{scene}.v{version}.{rev_name}.json")
            for f in (rev or {}).get("findings", []):
                if f.get("severity") in ("must_fix", "should_fix") and (not unresolved or f.get("id") in unresolved or f.get("severity") == "must_fix"):
                    open_items.append(_item(f))
        lines.append("unresolved after the final version:" if open_items else "unresolved: none")
        lines += open_items
    lines.append("")
    glosses = [(w, g) for tex in sf.blocks.values() for w, g in _GL_RE.findall(tex)]
    lines.append("glosses: " + (", ".join(f"{w} ({g})" for w, g in glosses) if glosses else "none"))
    if sf.notes:
        lines.append("")
        lines.append("notes for the bible:")
        lines += [f"- {n}" for n in sf.notes]
    (sdir / f"{scene}.report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    if chapter < 900:
        known_path = MEMORY_DIR / "known-so-far" / f"ch{chapter:03d}.json"
        glossed: set[str] = set()
        for fp in sorted(sdir.glob("s*.final.nl.md")):
            for tex in read_scene_file(fp).blocks.values():  # block bodies only, not @notes
                for w, _g in _GL_RE.findall(tex):
                    glossed.add(w.lower())
        dump_json(known_path, {"chapter": chapter, "glossed": sorted(glossed)})
        inbox = MEMORY_DIR / "inbox.md"
        header = f"## ch{chapter:03d} {scene} (v{version})"
        seen = inbox.read_text(encoding="utf-8") if inbox.exists() else ""
        # re-finalizing must not re-append notes the chapter pass already consumed
        if sf.notes and header not in seen and f"<!-- ch{chapter:03d}: consumed" not in seen:
            with inbox.open("a", encoding="utf-8") as fh:
                fh.write(f"\n{header}\n")
                fh.writelines(f"- {n}\n" for n in sf.notes)
    return final


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-finalize", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ref", help="chapter/scene like 1/s02")
    ap.add_argument("--version", type=int, default=None, help="version to promote (default: latest)")
    ap.add_argument("--unresolved", default="", help="comma-separated finding ids left open on purpose")
    a = ap.parse_args(argv)
    ch, sc = parse_scene_ref(a.ref)
    final = finalize(ch, sc, a.version, [x for x in a.unresolved.split(",") if x])
    print(f"final -> {final}")
    print((scene_dir(ch) / f"{sc}.report.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
