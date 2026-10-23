"""nl-cohesion: chapter-level programmatic checks over the final scene files.

  * glossary terms: EN term present in a source block but no NL rendering in the translation
  * glosses: a word glossed twice in the chapter, or used before its gloss
  * forms of address: u / je counts per scene and blocks mixing both
  * tense: narrative blocks whose finite verbs are mostly present tense in a past-tense chapter
  * chapter word list: every stretch/hard/unknown lemma across the chapter with counts

Writes book/pipeline/work/chNNN/cohesion.{md,json}; the nl-cohesion-editor reads it.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from . import vocab_check
from .common import chapter_work_dir, glossary, load_json, scene_dir
from .nlp import nlp
from .scenefile import SceneFile, latest_version, read_scene_file, strip_gloss
from .texparse import tex_to_text

_GL_RE = re.compile(r"\\gl\{([^{}]*)\}\{([^{}]*)\}")
U_FORMS = {"u", "uw"}
JE_FORMS = {"je", "jij", "jou", "jouw", "jullie"}


def _finals(chapter: int, draft: bool) -> dict[str, SceneFile]:
    cj = load_json(chapter_work_dir(chapter) / "chapter.json")
    sdir = scene_dir(chapter)
    out: dict[str, SceneFile] = {}
    for s in cj["scenes"]:
        sid = s["scene"]
        p = sdir / f"{sid}.final.nl.md"
        if not p.exists() and draft:
            lv = latest_version(sdir, sid)
            p = lv[1] if lv else p
        if p.exists():
            out[sid] = read_scene_file(p)
    return out


def analyze(chapter: int, draft: bool = False) -> dict:
    cj = load_json(chapter_work_dir(chapter) / "chapter.json")
    src = {b["id"]: b for b in cj["blocks"]}
    finals = _finals(chapter, draft)
    block_scene = {bid: sid for sid, sf in finals.items() for bid in sf.blocks}
    nl_tex = {bid: tex for sf in finals.values() for bid, tex in sf.blocks.items()}
    nl_text = {bid: tex_to_text(strip_gloss(tex)) for bid, tex in nl_tex.items()}
    findings: list[dict] = []

    # --- glossary terms ------------------------------------------------------
    terms = glossary().get("terms", [])
    for t in terms:
        en, nl = t.get("en", ""), t.get("nl", "")
        if not en or not nl or len(en) < 3:
            continue
        forms = [nl] + t.get("nl_forms", [])
        en_re = re.compile(r"\b" + re.escape(en) + r"\b", re.IGNORECASE)
        for bid, tex in nl_tex.items():
            if not en_re.search(src[bid]["text"]):
                continue
            if not any(f.lower() in nl_text[bid].lower() for f in forms):
                findings.append({"id": "C-TERM", "block": bid, "scene": block_scene[bid], "msg": f"source has '{en}', translation lacks '{nl}' (check rendering)"})

    # --- glosses ---------------------------------------------------------------
    first_gloss: dict[str, str] = {}
    order = [b["id"] for b in cj["blocks"] if b["id"] in nl_tex]
    glossed_words: list[tuple[str, str, str]] = []
    for bid in order:
        for w, g in _GL_RE.findall(nl_tex[bid]):
            glossed_words.append((bid, w, g))
            if w.lower() in first_gloss:
                findings.append({"id": "C-GLOSS-DUP", "block": bid, "scene": block_scene[bid], "msg": f"'{w}' already glossed in {first_gloss[w.lower()]}"})
            else:
                first_gloss[w.lower()] = bid
    for w, fb in first_gloss.items():
        for bid in order:
            if bid == fb:
                break
            if re.search(r"\b" + re.escape(w) + r"\b", nl_text[bid], re.IGNORECASE):
                findings.append({"id": "C-GLOSS-LATE", "block": fb, "scene": block_scene[fb], "msg": f"'{w}' appears unglossed earlier in {bid}; move the gloss"})
                break

    # --- address + tense ---------------------------------------------------------
    model = nlp()
    docs = dict(zip(nl_text.keys(), model.pipe(nl_text.values())))
    address: dict[str, Counter] = defaultdict(Counter)
    tense_rows: list[dict] = []
    chapter_past = chapter_pres = 0
    for bid, doc in docs.items():
        sid = block_scene[bid]
        toks = [t.lower_ for t in doc]
        u = sum(1 for x in toks if x in U_FORMS)
        je = sum(1 for x in toks if x in JE_FORMS)
        if src[bid].get("dialogue"):
            address[sid]["u"] += u
            address[sid]["je"] += je
            if u and je:
                findings.append({"id": "C-ADDRESS-MIX", "block": bid, "scene": sid, "msg": f"dialogue block uses both u ({u}) and je/jij ({je}); check who addresses whom"})
        if not src[bid].get("dialogue") and src[bid]["kind"] == "para":
            past = sum(1 for t in doc if t.pos_ in ("VERB", "AUX") and "Fin" in t.morph.get("VerbForm") and "Past" in t.morph.get("Tense"))
            pres = sum(1 for t in doc if t.pos_ in ("VERB", "AUX") and "Fin" in t.morph.get("VerbForm") and "Pres" in t.morph.get("Tense"))
            chapter_past += past
            chapter_pres += pres
            tense_rows.append({"block": bid, "scene": sid, "past": past, "pres": pres})
    majority_past = chapter_past >= chapter_pres
    for row in tense_rows:
        total = row["past"] + row["pres"]
        if total >= 3:
            share = (row["pres"] if majority_past else row["past"]) / total
            if share > 0.6:
                findings.append(
                    {
                        "id": "C-TENSE",
                        "block": row["block"],
                        "scene": row["scene"],
                        "msg": f"narrative block mostly {'present' if majority_past else 'past'} tense ({row['pres']} pres / {row['past']} past) while the chapter is mostly {'past' if majority_past else 'present'}; confirm against the source",
                    }
                )

    # --- chapter word list ----------------------------------------------------------
    merged = SceneFile(chapter=chapter, scene="all", version=0, blocks=nl_tex)
    vocab = vocab_check.analyze(merged, set(), {"blocks": [src[b] for b in nl_tex]})
    word_list = [
        {"lemma": i["lemma"], "status": i["status"], "cefr": i.get("cefr"), "count": i["count"], "glossed": i["glossed"], "en": i.get("en", [])}
        for i in vocab["lemmas"]
    ]

    return {
        "chapter": chapter,
        "scenes_with_text": sorted(finals.keys()),
        "scenes_missing": [s["scene"] for s in cj["scenes"] if s["scene"] not in finals],
        "title_translated": bool(nl_tex.get("b001")),
        "findings": findings,
        "address": {sid: dict(c) for sid, c in address.items()},
        "tense": {"past": chapter_past, "present": chapter_pres},
        "glosses": [{"block": b, "word": w, "gloss": g} for b, w, g in glossed_words],
        "vocab": {"tokens": vocab["tokens"], "known_share": vocab["known_share"], "new_per_1000": vocab["new_per_1000"]},
        "word_list": word_list,
    }


def format_report(r: dict) -> str:
    lines = [f"# Cohesion — ch{r['chapter']:03d}", ""]
    lines.append(f"scenes with text: {', '.join(r['scenes_with_text']) or 'none'}" + (f"; missing: {', '.join(r['scenes_missing'])}" if r["scenes_missing"] else ""))
    lines.append(f"chapter title translated: {'yes' if r['title_translated'] else 'NO'}")
    v = r["vocab"]
    lines.append(f"vocabulary over the chapter: {v['tokens']} tokens, known {v['known_share']:.1%}, new/1000 = {v['new_per_1000']}")
    lines.append(f"tense (narrative finite verbs): past {r['tense']['past']} / present {r['tense']['present']}")
    lines.append("address in dialogue per scene: " + ", ".join(f"{s} u={c.get('u', 0)} je={c.get('je', 0)}" for s, c in r["address"].items()))
    lines.append("")
    if r["findings"]:
        lines.append("## Findings")
        for f in r["findings"]:
            lines.append(f"- {f['id']} {f['scene']}/{f['block']}: {f['msg']}")
        lines.append("")
    if r["glosses"]:
        lines.append("## Glosses in order")
        lines += [f"- {g['block']}: {g['word']} ({g['gloss']})" for g in r["glosses"]]
        lines.append("")
    if r["word_list"]:
        lines.append("## Chapter word list (outside the known lexicon)")
        lines.append("| lemma | status | cefr | n | glossed | en |")
        lines.append("|---|---|---|---|---|---|")
        for w in r["word_list"]:
            lines.append(f"| {w['lemma']} | {w['status']} | {w.get('cefr') or '-'} | {w['count']} | {'yes' if w['glossed'] else ''} | {', '.join(x for x in w['en'] if x)} |")
        lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-cohesion", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("chapter", type=int)
    ap.add_argument("--draft", action="store_true", help="include latest versions where no final exists")
    a = ap.parse_args(argv)
    r = analyze(a.chapter, a.draft)
    md = format_report(r)
    wdir = chapter_work_dir(a.chapter)
    (wdir / "cohesion.json").write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    (wdir / "cohesion.md").write_text(md, encoding="utf-8")
    print(md)


if __name__ == "__main__":
    main()
