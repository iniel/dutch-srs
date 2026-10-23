"""nl-experiment: Phase 1 harness (idea.md §7).

    nl-experiment init      # fragments.json -> book/pipeline/work/ch9FF/{chapter.json, scenes/s0V.src.json}
    nl-experiment report    # collect checks + reviews per fragment/variant -> book/pipeline/experiments/results.md

Each fragment is a pseudo-chapter 9FF; variants are scenes s01 (V1), s02 (V2), s03 (V3)
with identical source blocks, so nl-check / nl-assemble work unchanged.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import extract
from .common import EXPERIMENTS_DIR, chapter_work_dir, dump_json, load_json, scene_dir, word_count
from .scenefile import latest_version


def init() -> None:
    cfg = load_json(EXPERIMENTS_DIR / "fragments.json")
    for f in cfg["fragments"]:
        src_ch = f["chapter"]
        if not (chapter_work_dir(src_ch) / "chapter.json").exists():
            extract.run(src_ch)
        cj = load_json(chapter_work_dir(src_ch) / "chapter.json")
        lo, hi = f["blocks"]
        blocks = [b for b in cj["blocks"] if lo <= b["id"] <= hi]
        before = [b["text"] for b in cj["blocks"] if b["id"] < lo and b["translate"] and b["kind"] == "para"][-3:]
        after = [b["text"] for b in cj["blocks"] if b["id"] > hi and b["translate"] and b["kind"] == "para"][:3]
        words = sum(word_count(b["text"]) for b in blocks if b["translate"])
        pid = f["id"]
        scenes = []
        for sid, desc in cfg["variants"].items():
            scene = {
                "chapter": pid,
                "scene": sid,
                "index": int(sid[1:]) - 1,
                "of": len(cfg["variants"]),
                "chapter_title": cj["title"],
                "experiment": {"fragment": f["name"], "type": f["type"], "variant": desc, "source_chapter": src_ch, "source_blocks": f["blocks"]},
                "source_chapter": src_ch,
                "words": words,
                "blocks": blocks,
                "context_before": before,
                "context_after": after,
            }
            dump_json(scene_dir(pid) / f"{sid}.src.json", scene)
            scenes.append({"scene": sid, "words": words, "first_block": blocks[0]["id"], "last_block": blocks[-1]["id"], "translatable_blocks": sum(1 for b in blocks if b["translate"]), "variant": desc})
        dump_json(
            chapter_work_dir(pid) / "chapter.json",
            {"chapter": pid, "experiment": f, "file": cj["file"], "title": cj["title"], "words": words, "blocks": blocks, "scenes": scenes},
        )
        print(f"{pid} {f['name']}: ch{src_ch} {lo}..{hi} {words} words, {len(cfg['variants'])} variants")


def _load(path: Path) -> dict | None:
    return load_json(path) if path.exists() else None


def report() -> None:
    cfg = load_json(EXPERIMENTS_DIR / "fragments.json")
    rows = []
    for f in cfg["fragments"]:
        pid = f["id"]
        sdir = scene_dir(pid)
        for sid in cfg["variants"]:
            lv = latest_version(sdir, sid)
            final = sdir / f"{sid}.final.nl.md"
            row = {"fragment": f["name"], "type": f["type"], "variant": sid, "versions": lv[0] if lv else 0, "final": final.exists()}
            if lv:
                k = lv[0]
                checks = _load(sdir / f"{sid}.v{k}.checks.json")
                c1 = _load(sdir / f"{sid}.v1.checks.json")
                for tag, c in (("", checks), ("v1_", c1)):
                    if c:
                        row[tag + "known"] = c["vocab"]["known_share"]
                        row[tag + "new1000"] = c["vocab"]["new_per_1000"]
                        row[tag + "gram_likely"] = c["grammar"]["summary"]["likely"]
                        row[tag + "load"] = c["grammar"]["summary"]["load"]
                        row[tag + "glosses"] = sum(len(v["glosses"]) for v in c["vocab"]["per_block"].values())
                for rev in ("meaning", "language"):
                    for v in range(1, k + 1):
                        r = _load(sdir / f"{sid}.v{v}.{rev}.json")
                        if r:
                            sev = {"must_fix": 0, "should_fix": 0, "note": 0}
                            for x in r.get("findings", []):
                                sev[x.get("severity", "note")] = sev.get(x.get("severity", "note"), 0) + 1
                            row[f"{rev}_v{v}"] = f"{sev['must_fix']}/{sev['should_fix']}/{sev['note']}"
                            if rev == "meaning" and r.get("comprehension"):
                                qs = r["comprehension"]
                                row[f"comp_v{v}"] = f"{sum(1 for q in qs if q.get('answerable'))}/{len(qs)}"
            rows.append(row)
    lines = ["# Phase 1 results", "", "Columns: known = share of known tokens (final version), new/1000 = unglossed new lemmas per 1000 tokens, gram = likely grammar flags, load = heavy sentences, gl = glosses; reviews as must/should/note per version; comp = comprehension questions answerable from the Dutch.", ""]
    lines.append("| fragment | var | ver | known | new/1000 | gram | load | gl | meaning v1 | meaning v2 | language v1 | language v2 | comp v1 | comp v2 | v1 known | v1 gram |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        g = lambda k, d="": r.get(k, d)
        known = f"{r['known']:.1%}" if "known" in r else ""
        v1known = f"{r['v1_known']:.1%}" if "v1_known" in r else ""
        lines.append(
            f"| {r['fragment']} | {r['variant']} | {g('versions')} | {known} | {g('new1000')} | {g('gram_likely')} | {g('load')} | {g('glosses')} | "
            f"{g('meaning_v1')} | {g('meaning_v2')} | {g('language_v1')} | {g('language_v2')} | {g('comp_v1')} | {g('comp_v2')} | {v1known} | {g('v1_gram_likely')} |"
        )
    out = EXPERIMENTS_DIR / "results.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    (EXPERIMENTS_DIR / "results.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n".join(lines))


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-experiment", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["init", "report"])
    a = ap.parse_args(argv)
    init() if a.cmd == "init" else report()


if __name__ == "__main__":
    main()
