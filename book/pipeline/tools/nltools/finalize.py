"""nl-finalize: close a scene after the review loop (skill step 8).

    nl-finalize 1/s02 [--version K] [--unresolved M3,L2]

  * copies sNN.vK.nl.md -> sNN.final.nl.md
  * writes sNN.report.md from the checks / meaning / language files of every version
  * updates memory/known-so-far/chNNN.json with all \\gl words of the chapter's finals
  * appends the translator's @notes and CONFLICT lines to memory/inbox.md
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

    lines = [f"# ch{chapter:03d} {scene} — report", f"final: v{version} ({'no fix round' if version == 1 else f'{version - 1} fix round(s)'})", ""]
    for v in range(1, version + 1):
        checks = _load(sdir / f"{scene}.v{v}.checks.json")
        meaning = _load(sdir / f"{scene}.v{v}.meaning.json")
        language = _load(sdir / f"{scene}.v{v}.language.json")
        parts = [f"v{v}:"]
        if checks:
            vc, gc = checks["vocab"], checks["grammar"]["summary"]
            parts.append(f"checks known {vc['known_share']:.1%} · new/1000 {vc['new_per_1000']} · grammar likely {gc['likely']} review {gc['review']} · load {gc['load']} · structure {'ok' if checks['structure']['ok'] else 'ISSUES'}")
        if meaning:
            m = _sev_counts(meaning)
            comp = meaning.get("comprehension", [])
            ans = sum(1 for q in comp if q.get("answerable"))
            parts.append(f"meaning {meaning.get('verdict')} must {m['must_fix']} should {m['should_fix']} note {m['note']}" + (f" · comprehension {ans}/{len(comp)}" if comp else ""))
        if language:
            l = _sev_counts(language)
            fd = language.get("flag_decisions", [])
            conf = sum(1 for d in fd if d.get("decision") == "confirmed")
            parts.append(f"language {language.get('verdict')} must {l['must_fix']} should {l['should_fix']} note {l['note']} · flags confirmed {conf}/{len(fd)}")
        lines.append("- " + " | ".join(parts))
    lines.append("")
    open_items = []
    for rev_name in ("meaning", "language"):
        rev = _load(sdir / f"{scene}.v{version}.{rev_name}.json")
        for f in (rev or {}).get("findings", []):
            if f.get("severity") in ("must_fix", "should_fix") and (not unresolved or f.get("id") in unresolved or f.get("severity") == "must_fix"):
                open_items.append(f"- {f.get('id')} ({f.get('severity')}, {f.get('category', '')}) {f.get('block', '')}: {f.get('problem', '')}")
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
        if sf.notes:
            inbox = MEMORY_DIR / "inbox.md"
            with inbox.open("a", encoding="utf-8") as fh:
                fh.write(f"\n## ch{chapter:03d} {scene} (v{version})\n")
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
