"""nl-lexicon: build profile/lexicon.json from the dutch-srs datasets.

Sources (most lenient status wins):
  * personal progress export (stage >= personal_min_stage or burned)  -> known
  * public/cards.json  (cefr / level prefix)                           -> known | stretch | hard
  * public/paths.json  (inburgering, nederlands-in-gang)               -> known
  * NT2Lex TSV (lowest CEFR band; includes function words)             -> known | stretch | hard
  * public/enrichment.json                                             -> inflected forms, synonyms

Absence from the lexicon means "unknown status", never "above B1".
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from .common import DEFAULT_SRS_DIR, PROFILE_DIR, dump_json, load_json, thresholds

CARD_POS = {
    "n.": ["NOUN"],
    "v.": ["VERB"],
    "adj.": ["ADJ"],
    "adv.": ["ADV"],
    "pron.": ["PRON"],
    "prep.": ["ADP"],
    "num.": ["NUM"],
    "conj.": ["CONJ"],
    "phrase": ["PHRASE"],
    "adj./adv.": ["ADJ", "ADV"],
    "n./adj.": ["NOUN", "ADJ"],
    "conj./prep.": ["CONJ", "ADP"],
}
CGN_POS = {
    "N": "NOUN",
    "WW": "VERB",
    "ADJ": "ADJ",
    "BW": "ADV",
    "VZ": "ADP",
    "VNW": "PRON",
    "TW": "NUM",
    "VG": "CONJ",
    "LID": "DET",
    "TSW": "INTJ",
    "SPEC": "X",
}
NT2LEX_F_COL = {"A1": 5, "A2": 10, "B1": 15, "B2": 20, "C1": 25}
STATUS_RANK = {"known": 0, "stretch": 1, "hard": 2}
PRONOUNS = {"ik", "jij", "je", "u", "hij", "zij", "ze", "het", "wij", "we", "jullie"}
ARTICLES = {"de", "het", "een"}
PARTICLES = {
    "aan", "af", "achter", "bij", "binnen", "buiten", "dicht", "door", "heen", "in", "klaar", "langs", "los", "mee",
    "na", "neer", "om", "op", "open", "over", "rond", "samen", "tegen", "terug", "thuis", "toe", "uit", "vast",
    "voor", "voorbij", "vooruit", "weg", "mis", "goed", "schoon", "stil", "vol", "kwijt", "leeg", "vrij", "plaats",
}


def strip_article(s: str) -> str:
    parts = s.strip().split()
    if len(parts) > 1 and parts[0].lower() in ARTICLES:
        return " ".join(parts[1:])
    return s.strip()


def card_cefr(card: dict) -> str | None:
    if card.get("cefr"):
        return card["cefr"]
    m = re.match(r"^(A1|A2|B1|B2)", card.get("level") or "")
    return m.group(1) if m else None


def level_status(cefr: str | None, cfg: dict) -> str | None:
    if cefr in cfg["known_levels"]:
        return "known"
    if cefr in cfg["stretch_levels"]:
        return "stretch"
    if cefr in cfg["hard_levels"]:
        return "hard"
    return None


def better(a: str | None, b: str | None) -> str | None:
    if a is None:
        return b
    if b is None:
        return a
    return a if STATUS_RANK[a] <= STATUS_RANK[b] else b


def separable_alias(lemma: str) -> str | None:
    parts = lemma.split()
    if len(parts) == 2 and parts[1] in PARTICLES and parts[0].endswith("en"):
        return parts[1] + parts[0]
    return None


def parse_notes_forms(notes: str | None) -> list[str]:
    if not notes or "forms:" not in notes:
        return []
    raw = notes.split("forms:", 1)[1]
    out = []
    for item in raw.split(","):
        words = item.strip().split()
        while words and (words[0].lower() in PRONOUNS or words[0].lower() in ARTICLES):
            words = words[1:]
        if len(words) == 1:
            out.append(words[0].lower())
        elif len(words) == 2 and words[1] in PARTICLES:
            out.append(words[0].lower())  # stem of a separable verb (spaCy re-attaches the particle)
    return out


def load_personal(path: Path | None, cfg: dict) -> set[str]:
    personal_path = PROFILE_DIR / "personal.json"
    if path is not None:
        data = load_json(path)
        states = data.get("states", {})
        min_stage = cfg["personal_min_stage"]
        ids = sorted(
            cid for cid, st in states.items() if st.get("burned") or (st.get("stage") or 0) >= min_stage
        )
        dump_json(
            personal_path,
            {
                "source": str(path),
                "built": dt.datetime.now().isoformat(timespec="seconds"),
                "min_stage": min_stage,
                "known_card_ids": ids,
            },
        )
        print(f"personal.json: {len(ids)} known cards (stage >= {min_stage} or burned)", file=sys.stderr)
        return set(ids)
    if personal_path.exists():
        ids = set(load_json(personal_path).get("known_card_ids", []))
        print(f"personal.json: using {len(ids)} known cards", file=sys.stderr)
        return ids
    print("personal.json: none (run with --progress <dutch-srs export>.json to add your progress)", file=sys.stderr)
    return set()


def build(srs: Path, progress: Path | None) -> dict:
    cfg = thresholds()["lexicon"]
    cards = load_json(srs / "public" / "cards.json")
    enrichment = load_json(srs / "public" / "enrichment.json")
    paths = load_json(srs / "public" / "paths.json")
    personal = load_personal(progress, cfg)

    path_members: dict[str, set[str]] = {}
    for p in paths.get("paths", []):
        ids: set[str] = set()
        for d in p.get("difficulties", []) or []:
            ids.update(d.get("cardIds", []))
        for u in p.get("units", []) or []:
            ids.update(u.get("cardIds", []))
        path_members[p["id"]] = ids
    known_path_ids: set[str] = set()
    for pid in cfg["known_paths"]:
        known_path_ids |= path_members.get(pid, set())

    entries: dict[str, dict] = {}
    phrases: dict[str, dict] = {}
    forms: dict[str, set[str]] = defaultdict(set)
    stats: Counter = Counter()

    def ensure(table: dict, key: str) -> dict:
        if key not in table:
            table[key] = {"status": None, "cefr": None, "pos": [], "en": [], "cards": [], "sources": [], "forms": [], "synonyms": []}
        return table[key]

    def add_source(e: dict, status: str | None, src: str, cefr: str | None = None) -> None:
        if status:
            e["status"] = better(e["status"], status)
        if src not in e["sources"]:
            e["sources"].append(src)
        if cefr and (e["cefr"] is None or cefr < e["cefr"]):
            e["cefr"] = cefr

    # --- cards -------------------------------------------------------------
    for c in cards:
        lemma = (c.get("lemma") or strip_article(c["dutch"])).strip().lower()
        if not lemma:
            continue
        cefr = card_cefr(c)
        status = level_status(cefr, cfg)
        src = f"cards:{cefr or 'none'}"
        multiword = " " in lemma
        table = phrases if (multiword or c.get("type") in ("phrase", "sentence")) else entries
        e = ensure(table, lemma)
        add_source(e, status, src, cefr)
        for p in CARD_POS.get(c.get("pos") or "", []):
            if p not in e["pos"]:
                e["pos"].append(p)
        for g in c.get("english", []):
            if g not in e["en"] and len(e["en"]) < 4:
                e["en"].append(g)
        e["cards"].append(c["id"])
        if c["id"] in personal:
            add_source(e, "known", "personal")
        if c["id"] in known_path_ids:
            for pid in cfg["known_paths"]:
                if c["id"] in path_members.get(pid, set()):
                    add_source(e, "known", f"path:{pid}")
        alias = separable_alias(lemma) if multiword else None
        if alias:
            ae = ensure(entries, alias)
            add_source(ae, e["status"], src, cefr)
            ae["pos"] = ["VERB"]
            ae["en"] = list(e["en"])
            ae["cards"].append(c["id"])
            if c["id"] in personal:
                add_source(ae, "known", "personal")
        # forms
        target = alias or lemma
        for f in parse_notes_forms(c.get("notes")):
            if f != target:
                forms[f].add(target)
        for s in (enrichment.get(c["id"]) or {}).get("synonyms") or []:
            s = s.strip().lower()
            if s and " " not in s and s != lemma and s not in e["synonyms"] and len(e["synonyms"]) < 8:
                e["synonyms"].append(s)
        g = (enrichment.get(c["id"]) or {}).get("grammar") or {}
        for sub in ("noun", "verb", "adjective"):
            for k, v in (g.get(sub) or {}).items():
                if isinstance(v, str) and v and " " not in v and k not in ("article", "gender"):
                    v = v.lower()
                    if v != target:
                        forms[v].add(target)
                        if v not in e["forms"] and len(e["forms"]) < 8:
                            e["forms"].append(v)
        stats["cards"] += 1

    # --- NT2Lex --------------------------------------------------------------
    nt2 = srs / "NT2Lex-CGN+ODWN-v01.tsv"
    band_by_key: dict[tuple[str, str], str] = {}
    if nt2.exists():
        with nt2.open(encoding="utf-8") as fh:
            reader = csv.reader(fh, delimiter="\t")
            next(reader)
            for row in reader:
                if len(row) < 30:
                    continue
                word = row[0].strip().lower()
                tags = row[1].split()
                if not word or not tags:
                    continue
                lowest = next((b for b, col in NT2LEX_F_COL.items() if row[col] != "-"), None)
                if lowest is None:
                    continue
                pos = CGN_POS.get(tags[0].split("(")[0], "X") if len(tags) == 1 else "PHRASE"
                key = (word, pos)
                if key not in band_by_key or lowest < band_by_key[key]:
                    band_by_key[key] = lowest
        for (word, pos), band in band_by_key.items():
            if band in cfg["nt2lex_known_bands"]:
                status = "known"
            elif band in cfg["nt2lex_stretch_bands"]:
                status = "stretch"
            else:
                status = "hard"
            table = phrases if (" " in word or pos == "PHRASE") else entries
            e = ensure(table, word)
            add_source(e, status, f"nt2lex:{band}", band)
            if pos not in e["pos"] and pos != "PHRASE":
                e["pos"].append(pos)
            stats["nt2lex"] += 1
    else:
        print(f"warning: {nt2} not found; function words will be missing", file=sys.stderr)

    for e in list(entries.values()) + list(phrases.values()):
        if e["status"] is None:
            e["status"] = "hard"

    by_status = Counter(e["status"] for e in entries.values())
    out = {
        "version": 1,
        "built": dt.datetime.now().isoformat(timespec="seconds"),
        "srs_dir": str(srs),
        "config": cfg,
        "stats": {
            "entries": len(entries),
            "phrases": len(phrases),
            "forms": len(forms),
            "by_status": dict(by_status),
            "personal_known_cards": len(personal),
            "cards": stats["cards"],
            "nt2lex_rows": stats["nt2lex"],
        },
        "entries": dict(sorted(entries.items())),
        "phrases": dict(sorted(phrases.items())),
        "forms": {k: sorted(v) for k, v in sorted(forms.items())},
    }
    return out


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-lexicon", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--srs", type=Path, default=DEFAULT_SRS_DIR, help="path to the dutch-srs checkout")
    ap.add_argument("--progress", type=Path, default=None, help="dutch-srs progress export JSON (writes profile/personal.json)")
    ap.add_argument("--out", type=Path, default=PROFILE_DIR / "lexicon.json")
    a = ap.parse_args(argv)
    if not (a.srs / "public" / "cards.json").exists():
        raise SystemExit(f"cards.json not found under {a.srs}; pass --srs")
    lex = build(a.srs, a.progress)
    dump_json(a.out, lex)
    s = lex["stats"]
    print(f"lexicon: {s['entries']} lemmas ({s['by_status']}), {s['phrases']} phrases, {s['forms']} forms -> {a.out}")


if __name__ == "__main__":
    main()
