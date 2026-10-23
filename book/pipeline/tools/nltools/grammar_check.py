"""nl-grammar: flag restricted constructions (profile/restricted.md) and heavy sentences.

Every flag is a *suspicion with a confidence*; spaCy's Dutch parser is not perfect
and several restricted constructions have allowed look-alikes. The reviewer
confirms or dismisses each `likely` flag. Confidence bands (thresholds.yaml):
  >= grammar.likely_confidence  -> "likely"   (report + JSON)
  >= grammar.ignore_confidence  -> "review"   (JSON only)
  <  grammar.ignore_confidence  -> "ignored"  (JSON only)
Sentence load: L-FRAME and L-NEST in the report, the other L-* in JSON only.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

from .common import exceptions, thresholds
from .nlp import is_word, nlp
from .scenefile import SceneFile, read_scene_file, strip_gloss
from .texparse import tex_to_text

ALLOWED_SCONJ = {"als", "omdat", "zodra", "zodat", "terwijl", "hoewel", "nadat", "toen", "voordat", "dat", "of", "wanneer", "dan", "want", "maar", "en", "dus", "zoals"}
MODALS = {"kunnen", "mogen", "moeten", "willen", "zullen", "hoeven"}
POSTURE = {"zitten", "staan", "liggen", "lopen", "hangen"}
PERCEPTION = {"zien", "horen", "voelen"}
ZIJN_PERFECT_VERBS = {
    "komen", "gaan", "worden", "blijven", "vallen", "vertrekken", "aankomen", "sterven", "beginnen", "zijn", "gebeuren",
    "verdwijnen", "opstaan", "stoppen", "veranderen", "groeien", "ontstaan", "verhuizen", "slagen", "vluchten", "rennen",
    "lopen", "rijden", "vliegen", "springen", "stappen", "klimmen", "zinken", "binnenkomen", "weggaan", "terugkomen",
    "thuiskomen", "ontsnappen", "trouwen", "geboren", "overlijden", "vergeten", "verliezen", "schrikken", "wakker",
}
WH = {"waarom", "wat", "wie", "hoe", "waar", "wanneer", "welke", "welk", "hoeveel", "waarheen", "waarvandaan"}
QUANT = {"veel", "weinig", "genoeg", "geen", "enkele", "meer", "minder", "één", "een", "paar", "sommige", "nog"}
PREPS = (
    "aan", "achter", "af", "bij", "binnen", "boven", "buiten", "door", "heen", "in", "langs", "mee", "na", "naar", "naartoe",
    "naast", "om", "omheen", "onder", "op", "over", "tegen", "tegenover", "toe", "tussen", "uit", "van", "vandaan", "voor", "zonder",
)
PRON_ADV = {p + s for p in ("er", "daar", "hier", "waar") for s in PREPS} - {
    "waarom", "daarom", "daarna", "hierna", "waarheen", "daarheen", "hierheen", "waarvandaan", "daarvandaan", "hiervandaan",
}
_FORMS: dict[str, list[str]] | None = None
_ENTRIES: dict[str, dict] | None = None


def _is_known_adjective(tok) -> bool:
    global _ENTRIES, _FORMS
    if _ENTRIES is None:
        from .common import PROFILE_DIR, load_json

        path = PROFILE_DIR / "lexicon.json"
        data = load_json(path) if path.exists() else {"entries": {}, "forms": {}}
        _ENTRIES = data["entries"]
        _FORMS = data["forms"]
    low = tok.lower_
    cands = [low, low[:-1] if low.endswith("e") else low, tok.lemma_.lower()] + (_FORMS or {}).get(low, [])
    return any((_ENTRIES.get(c) or {}).get("status") == "known" and "ADJ" in (_ENTRIES.get(c) or {}).get("pos", []) for c in cands)


def _lem(tok) -> str:
    """spaCy lemma, lower-cased; the lexicon's inflection table wins when spaCy's lemma is not a lexicon entry
    (spaCy gives 'hoef' for 'hoeven', 'liep' for 'liep')."""
    global _FORMS, _ENTRIES
    lem = (tok.lemma_ or tok.text).lower()
    if _FORMS is None or _ENTRIES is None:
        from .common import PROFILE_DIR, load_json

        path = PROFILE_DIR / "lexicon.json"
        data = load_json(path) if path.exists() else {"entries": {}, "forms": {}}
        _ENTRIES = data["entries"]
        _FORMS = data["forms"]
    want_verb = tok.pos_ in ("VERB", "AUX")

    def ok(c: str) -> bool:
        e = _ENTRIES.get(c)
        return bool(e) and (not want_verb or "VERB" in e.get("pos", []))

    if lem != tok.lower_ and ok(lem):
        return lem
    if ok(tok.lower_):
        return tok.lower_  # 'hoeven' is itself the infinitive; spaCy said 'hoef' (a noun)
    for c in (_FORMS.get(tok.lower_) or []) + (_FORMS.get(lem) or []):
        if ok(c):
            return c
    cands = _FORMS.get(tok.lower_) or _FORMS.get(lem)
    return cands[-1] if cands else lem
HINTS = {
    "R-RELCL": "split into two sentences or use a prepositional phrase / adjective",
    "R-PASSIVE": "name the agent (ze / iemand / iedereen) or use a state verb (ging open)",
    "R-PLUPERF": "use imperfectum + al / eerder / daarvoor, tell events in order",
    "R-INDIRECT": "direct speech or thought with a colon; split the question out",
    "R-DAT": "colon + main clause (Hij dacht: …) or two sentences",
    "R-OF": "ask the question directly: Was het waar? Hij wist het niet.",
    "R-ZOU": "present tense + misschien / dan / stel, or wilde / kon",
    "R-IRREALIS-PAST": "state the regret or near-miss plainly in imperfectum",
    "R-ER-PREP": "repeat the noun: niet aan die brief, blij met het cadeau",
    "R-ER-QUANT": "repeat the noun after the number: twee boeken",
    "R-TE-INF": "split: Hij ging naar huis. Hij wilde eten. / drop the verb: Hij lachte.",
    "R-POSTURE-TE": "Hij zat en las. / Hij was aan het lezen. / Hij las.",
    "R-LATEN": "give / show with a plain verb, or let the object act: Het boek viel.",
    "R-PERCEPTION": "two sentences: Hij kwam. Ik zag het.",
    "R-VERB-CHAIN": "drop one verb: Hij wilde gaan. / Je moet wachten.",
    "R-PARTICIPLE": "make it a clause: Hij lachte en liep weg.",
    "R-CONJ-OTHER": "replace with an allowed subordinator or split: Hij wachtte. Toen kwam ze.",
    "L-LEN": "split the sentence",
    "L-SUB": "at most one subordinate clause per sentence",
    "L-NEST": "no subordinate clause inside another; split",
    "L-VERBS": "too many finite verbs; split",
    "L-FRAME": "verbal frame too wide; move the object after the clause or split",
}


def _finite(tok) -> bool:
    return tok.pos_ in ("VERB", "AUX") and "Fin" in tok.morph.get("VerbForm")


def _clause_heads(sent) -> list:
    return [t for t in sent if t.dep_ in ("advcl", "ccomp", "acl:relcl", "acl", "csubj", "xcomp") and _has_finite(t)]


def _has_finite(head) -> bool:
    if _finite(head):
        return True
    return any(_finite(c) for c in head.children if c.dep_ in ("aux", "aux:pass", "cop"))


def _whitelist(exc: dict) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for w in exc.get("grammar_whitelist", []):
        out.setdefault(w["id"], {})[w["pattern"]] = w.get("treat_as", "vocabulary")
    return out


def _verb_cluster(head) -> list:
    cluster = [head]
    for c in head.children:
        if c.dep_ in ("aux", "aux:pass", "cop") and c.pos_ in ("AUX", "VERB"):
            cluster.append(c)
        if c.dep_ == "xcomp" and c.pos_ in ("VERB", "AUX") and "Inf" in c.morph.get("VerbForm"):
            cluster.extend(_verb_cluster(c))
    return cluster


def _extended_attribute(part, sent) -> bool:
    """Determiner, then a preposition, then (≤ 4 words later) this participle: 'de door haar geschreven brief'.
    POS DET only: 'zei het met verstikte stem' has the pronoun 'het'."""
    for j in range(max(sent.start, part.i - 5), part.i - 1):
        tok, nxt = sent.doc[j], sent.doc[j + 1]
        if tok.pos_ == "DET" and nxt.pos_ == "ADP" and not any(x.pos_ in ("PUNCT", "VERB", "AUX") for x in sent.doc[j : part.i]):
            return True
    return False


def flags_for_sentence(sent, cfg: dict, wl: dict) -> list[dict]:
    flags: list[dict] = []

    def add(fid: str, span, conf: float, note: str = "") -> None:
        text = span.text if hasattr(span, "text") else str(span)
        flags.append({"id": fid, "span": text.strip(), "confidence": round(conf, 2), "note": note})

    words = [t for t in sent if is_word(t)]
    ends_q = sent.text.strip().endswith("?")
    lowers = [t.lower_ for t in sent]

    for t in sent:
        low = t.lower_
        # relative clauses
        if t.dep_ == "acl:relcl":
            sub = sorted(t.subtree, key=lambda x: x.i)
            span = sent.doc[sub[0].i : sub[-1].i + 1]
            fin = next((x for x in sub if _finite(x)), None)
            rel = next((x for x in sub if x.pos_ == "PRON" and "Rel" in x.morph.get("PronType")), None)
            pron = rel or next((x for x in sub if x.pos_ != "PUNCT"), sub[0])
            # "…, dat is de naam": pronoun directly followed by the finite verb with material after it
            # = main-clause (V2) order -> demonstrative left-dislocation, not a relative clause
            v2 = fin is not None and fin.i == pron.i + 1 and fin.i < sub[-1].i - 1
            add("R-RELCL", span, 0.4 if v2 else 0.85, "V2 order after the pronoun: demonstrative?" if v2 else "")
        # passive
        if t.dep_ in ("aux:pass", "nsubj:pass", "obl:agent"):
            clause_verbs = [t.head] + [c for c in t.head.children if c.pos_ in ("AUX", "VERB")]
            has_pass_aux = any(_lem(v) in ("worden", "zijn") for v in clause_verbs)
            # "klonk verstikt", "leek verbaasd": copular verb + participle-adjective, not a passive
            add("R-PASSIVE", sent[max(0, t.head.i - sent.start - 4) : t.head.i - sent.start + 2], 0.85 if has_pass_aux else 0.3, "" if has_pass_aux else "no worden/zijn: copular?")
        elif t.pos_ == "AUX" and _lem(t) == "zijn" and t.dep_ == "aux" and "Part" in t.head.morph.get("VerbForm") and t.head.pos_ == "VERB":
            # zijn + participle: perfectum of a mutative verb (allowed) or state passive; low confidence
            add("R-PASSIVE", sent[max(0, t.i - sent.start - 2) : t.head.i - sent.start + 1], 0.3, "zijn + participle: state/perfectum are allowed")
        # pluperfect
        if t.pos_ == "AUX" and _lem(t) in ("hebben", "zijn") and "Past" in t.morph.get("Tense") and t.head.pos_ == "VERB" and "Part" in t.head.morph.get("VerbForm"):
            marks = [c.lower_ for c in t.head.children if c.dep_ == "mark"]
            in_sub = t.head.dep_ in ("advcl", "ccomp", "acl:relcl") or bool(marks)
            conf = 0.25 if (in_sub and any(m in ("toen", "nadat", "voordat", "zodra") for m in marks)) else (0.6 if in_sub else 0.85)
            if _lem(t) == "zijn" and _lem(t.head) not in ZIJN_PERFECT_VERBS:
                conf = min(conf, 0.45)  # was + participle is usually a state (was overtuigd), not a pluperfect
            add("R-PLUPERF", sent[t.i - sent.start : t.head.i - sent.start + 1] if t.i < t.head.i else sent[t.head.i - sent.start : t.i - sent.start + 1], conf)
        # dat / of complement clauses
        if t.pos_ == "SCONJ" and t.dep_ == "mark":
            if low == "dat":
                head = t.head
                fin = head if _finite(head) else next((c for c in head.children if c.dep_ in ("cop", "aux", "aux:pass") and _finite(c)), None)
                demonstrative = fin is not None and fin.i < t.i  # finite verb before "dat": "Dan was ook dat duidelijk"
                before = " ".join(x.lower_ for x in sent.doc[max(sent.start, t.i - 3) : t.i + 1])
                chunk = next((pat for pat, treat in wl.get("R-DAT", {}).items() if before.endswith(pat) and treat == "vocabulary"), None)
                conf = 0.1 if chunk else (0.3 if demonstrative else 0.85)
                note = f"whitelisted chunk '{chunk}'" if chunk else ("verb precedes dat: demonstrative?" if demonstrative else "")
                add("R-DAT", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 7)], conf, note)
            elif low == "of":
                # sentence-initial "Of …" is the coordinator (or), not an indirect question
                conf = 0.2 if t.i == sent.start or (t.i > 0 and t.nbor(-1).text in ("—", ",", ";")) else 0.8
                add("R-OF", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 7)], conf)
            elif low not in ALLOWED_SCONJ:
                # "behalve/zoals/als" + noun phrase: a preposition, not a conjunction, when the clause has no finite verb
                clause_finite = _has_finite(t.head) or any(_finite(x) for x in t.head.subtree)
                add("R-CONJ-OTHER", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 6)], 0.85 if clause_finite else 0.2, f"conjunction '{t.text}'" + ("" if clause_finite else " (no verb: preposition?)"))
            elif low == "wanneer":
                add("R-CONJ-OTHER", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 6)], 0.5, "prefer 'als' / 'toen'")
            elif low == "zoals" and any(c.pos_ in ("VERB", "AUX") for c in t.head.children) and t.head.pos_ in ("VERB", "AUX"):
                add("R-CONJ-OTHER", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 6)], 0.5, "'zoals' + clause; 'zoals' + noun phrase is fine")
        if t.pos_ == "CCONJ" and low in ("noch", "zowel"):
            add("R-CONJ-OTHER", sent, 0.7, f"correlative '{t.text}'")
        # indirect questions
        if low in WH and t.head.dep_ == "ccomp" and not ends_q:
            add("R-INDIRECT", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 7)], 0.75)
        # zou
        if _lem(t) == "zullen" and t.lower_ in ("zou", "zouden"):
            subj = [c.lower_ for c in t.head.children if c.dep_ == "nsubj"]
            polite = (ends_q and any(s in ("u", "je", "jij") for s in subj)) or "graag" in lowers
            has_part = any("Part" in c.morph.get("VerbForm") for c in t.head.children) or "Part" in t.head.morph.get("VerbForm")
            if has_part:
                add("R-IRREALIS-PAST", sent, 0.85)
            else:
                add("R-ZOU", sent, 0.3 if polite else 0.8, "polite formula?" if polite else "")
        # er + preposition
        if low in PRON_ADV and t.pos_ in ("ADV", "PRON", "ADP"):
            if not (low in ("daar", "hier", "waar")):
                add("R-ER-PREP", t, 0.85)
        if low == "er" and t.dep_ in ("expl", "advmod", "obl", "obj"):
            adps = [c for c in t.head.children if c.pos_ == "ADP" and c.dep_ == "case" and c.i > t.i and not list(c.children)]
            if adps:
                add("R-ER-PREP", sent[t.i - sent.start : adps[-1].i - sent.start + 1], 0.7, "split pronominal adverb")
            nums = [c for c in t.children if c.pos_ == "NUM" or c.lower_ in QUANT]
            if nums or (t.dep_ == "obj" and any(c.pos_ == "NUM" for c in t.head.children)):
                add("R-ER-QUANT", sent[t.i - sent.start : min(len(sent), t.i - sent.start + 3)], 0.75)
        # te + infinitive
        if low == "te" and t.dep_ == "mark" and t.head.pos_ in ("VERB", "AUX") and "Inf" in t.head.morph.get("VerbForm"):
            inf = t.head
            gov = inf.head
            marks = [c.lower_ for c in inf.children if c.dep_ == "mark" and c.i < t.i]
            span = sent[min(inf.i, t.i, *[c.i for c in inf.children]) - sent.start : inf.i - sent.start + 1]
            if _lem(gov) in POSTURE:
                add("R-POSTURE-TE", span, 0.9)
            else:
                key = f"{_lem(gov)} te"
                key_neg = f"{_lem(gov)} niet te"
                treat = wl.get("R-TE-INF", {}).get(key) or wl.get("R-TE-INF", {}).get(key_neg)
                if treat == "vocabulary":
                    add("R-TE-INF", span, 0.1, f"whitelisted chunk '{key}'")
                elif treat == "review":
                    add("R-TE-INF", span, 0.5, f"frequent chunk '{key}' — reviewer decides")
                else:
                    add("R-TE-INF", span, 0.9, ("om … te" if "om" in marks else (f"{marks[0]} … te" if marks else f"after '{_lem(gov)}'")))
        # laten
        if _lem(t) == "laten" and t.pos_ in ("VERB", "AUX"):
            infs = [c for c in t.children if c.dep_ == "xcomp" and "Inf" in c.morph.get("VerbForm")]
            for inf in infs:
                treat = wl.get("R-LATEN", {}).get(f"laten {_lem(inf)}")
                add("R-LATEN", sent[t.i - sent.start : inf.i - sent.start + 1], 0.1 if treat == "vocabulary" else 0.8, f"laten {_lem(inf)}")
        # perception + infinitive
        if _lem(t) in PERCEPTION and t.pos_ == "VERB":
            objs = [c for c in t.children if c.dep_ in ("obj", "iobj")]
            infs = [c for c in t.children if c.dep_ == "xcomp" and "Inf" in c.morph.get("VerbForm")]
            if objs and infs:
                add("R-PERCEPTION", sent[t.i - sent.start : infs[-1].i - sent.start + 1], 0.8)
        # participle phrases
        if t.pos_ == "VERB" and "Part" in t.morph.get("VerbForm") and t.dep_ in ("advcl", "acl", "amod"):
            has_aux = any(c.dep_ in ("aux", "aux:pass", "cop") for c in t.children)
            if not has_aux:
                conf = 0.6 if t.dep_ != "amod" else 0.35
                if t.dep_ == "amod" and _is_known_adjective(t):
                    conf = 0.2  # plain adjective in the lexicon (verbaasd, gesloten, bekend)
                note = ""
                if t.dep_ == "advcl" and t.i == sent.start and low.endswith(("end", "ende")):
                    conf, note = 0.8, "present participle in first position"
                elif t.dep_ in ("amod", "acl") and _extended_attribute(t, sent):
                    # spaCy attaches the article elsewhere in "de door haar geschreven brief", so match the surface
                    conf, note = 0.8, "article + preposition before the participle: reduced relative"
                add("R-PARTICIPLE", t, conf, note)
        if t.pos_ == "ADJ" and t.dep_ == "advcl" and low.endswith(("end", "ende")):
            add("R-PARTICIPLE", t, 0.5, "present participle as adverbial")

    # verb chains (per clause head)
    heads = [t for t in sent if t.pos_ in ("VERB", "AUX") and t.dep_ in ("ROOT", "advcl", "ccomp", "conj", "acl:relcl", "parataxis", "csubj")]
    for h in heads:
        cl = _verb_cluster(h)
        cl_sorted = sorted(cl, key=lambda x: x.i)
        # a verb cluster sits in one clause: punctuation between its verbs means the parser merged clauses
        if len(cl_sorted) >= 2 and any(x.pos_ == "PUNCT" for x in sent.doc[cl_sorted[0].i : cl_sorted[-1].i]):
            continue
        if len(cl) >= 3:
            add("R-VERB-CHAIN", sent[cl_sorted[0].i - sent.start : cl_sorted[-1].i - sent.start + 1], 0.8, f"{len(cl)} verbs")
        elif sum(1 for x in cl if _lem(x) in MODALS) >= 2:
            add("R-VERB-CHAIN", sent[cl_sorted[0].i - sent.start : cl_sorted[-1].i - sent.start + 1], 0.8, "two modals")

    # hoe … hoe
    hoe = [t for t in sent if t.lower_ == "hoe" and t.dep_ == "advmod" and t.head.pos_ == "ADJ"]
    if len(hoe) >= 2:
        add("R-CONJ-OTHER", sent, 0.75, "hoe … hoe")
    if "niet" in lowers and "alleen" in lowers and "ook" in lowers:
        add("R-CONJ-OTHER", sent, 0.5, "niet alleen … maar ook?")

    # --- load ---------------------------------------------------------------
    scfg = cfg["sentence"]
    load: list[dict] = []
    if len(words) > scfg["max_words_hard"]:
        load.append({"id": "L-LEN", "value": len(words), "limit": scfg["max_words_hard"]})
    # a "finite verb" with a noun-like dependency (obj, nsubj, obl…) is a tagging error ("zorgen", "wensen")
    fin = [
        t
        for t in sent
        if _finite(t)
        and t.dep_ not in ("obj", "nsubj", "obl", "iobj", "nmod", "appos", "amod", "det")
        and not any(c.dep_ in ("det", "amod", "nummod") for c in t.children)
        # a finite verb cannot govern a finite auxiliary ("heb … zorgen"): the parser mistook a noun for the verb
        and not any(c.dep_ in ("aux", "aux:pass") and _finite(c) for c in t.children)
    ]
    if len(fin) > scfg["max_finite_verbs"]:
        load.append({"id": "L-VERBS", "value": len(fin), "limit": scfg["max_finite_verbs"]})
    subs = _clause_heads(sent)
    if len(subs) > scfg["max_subordinate_clauses"]:
        load.append({"id": "L-SUB", "value": len(subs), "limit": scfg["max_subordinate_clauses"]})
    for s in subs:
        depth = sum(1 for a in s.ancestors if a in subs)
        if depth >= scfg["max_nesting_depth"]:
            load.append({"id": "L-NEST", "value": depth + 1, "limit": scfg["max_nesting_depth"], "span": s.text})
            break
    for t in sent:
        if _finite(t) and t.dep_ in ("aux", "aux:pass", "cop") and t.head.pos_ == "VERB" and t.head.i > t.i:
            gap = sum(1 for x in sent[t.i - sent.start + 1 : t.head.i - sent.start] if is_word(x))
            if gap > scfg["max_frame_span_words"]:
                load.append({"id": "L-FRAME", "value": gap, "limit": scfg["max_frame_span_words"], "span": sent[t.i - sent.start : t.head.i - sent.start + 1].text})
        prt = [c for c in t.children if c.dep_ == "compound:prt" and c.i > t.i]
        if _finite(t) and prt:
            gap = sum(1 for x in sent[t.i - sent.start + 1 : prt[-1].i - sent.start] if is_word(x))
            if gap > scfg["max_frame_span_words"]:
                load.append({"id": "L-FRAME", "value": gap, "limit": scfg["max_frame_span_words"], "span": sent[t.i - sent.start : prt[-1].i - sent.start + 1].text})
    return flags, load  # type: ignore[return-value]


def analyze(sf: SceneFile) -> dict:
    cfg = thresholds()
    gcfg = cfg["grammar"]
    wl = _whitelist(exceptions())
    model = nlp()
    texts = {bid: tex_to_text(strip_gloss(tex)).replace("—", " — ") for bid, tex in sf.blocks.items()}
    docs = dict(zip(texts.keys(), model.pipe(texts.values())))
    flags: list[dict] = []
    loads: list[dict] = []
    n_sent = 0
    for bid, doc in docs.items():
        for si, sent in enumerate(doc.sents):
            if not sent.text.strip():
                continue
            n_sent += 1
            fl, ld = flags_for_sentence(sent, cfg, wl)
            for f in fl:
                f.update({"block": bid, "sent": si, "sentence": sent.text.strip()})
                f["level"] = "likely" if f["confidence"] >= gcfg["likely_confidence"] else ("review" if f["confidence"] >= gcfg["ignore_confidence"] else "ignored")
                f["hint"] = HINTS.get(f["id"], "")
                flags.append(f)
            for l in ld:
                l.update({"block": bid, "sent": si, "sentence": sent.text.strip(), "hint": HINTS.get(l["id"], "")})
                loads.append(l)
    # de-duplicate identical (id, block, sent)
    seen = set()
    uniq = []
    for f in flags:
        k = (f["id"], f["block"], f["sent"], f["span"])
        if k not in seen:
            seen.add(k)
            uniq.append(f)
    likely = [f for f in uniq if f["level"] == "likely"]
    review = [f for f in uniq if f["level"] == "review"]
    ignored = [f for f in uniq if f["level"] == "ignored"]
    shown_load = [l for l in loads if l["id"] in SHOWN_LOAD]
    return {
        "scene": f"ch{sf.chapter:03d}/{sf.scene}",
        "version": sf.version,
        "sentences": n_sent,
        "summary": {"likely": len(likely), "review": len(review), "ignored": len(ignored), "load": len(loads), "load_shown": len(shown_load)},
        "verdict": {"ok": not likely and not shown_load},
        "flags": uniq,
        "load": loads,
    }


# review/ignored flags: 0 confirmed in 94 adjudications; of the load ids only L-FRAME ever was
# (experiments/analysis-findings.md §3). They stay in the JSON; the report shows what reviewers act on.
SHOWN_LOAD = {"L-FRAME", "L-NEST"}


def format_report(r: dict) -> str:
    s = r["summary"]
    shown = [f for f in r["flags"] if f["level"] == "likely"]
    shown_load = [l for l in r["load"] if l["id"] in SHOWN_LOAD]
    lines = [f"## Grammar — {r['scene']} v{r['version']}", f"{r['sentences']} sentences; likely {s['likely']}, load {len(shown_load)}", ""]
    if shown:
        lines.append("| id | block | span | note | sentence |")
        lines.append("|---|---|---|---|---|")
        for f in shown:
            lines.append(f"| {f['id']} | {f['block']} | {f['span'][:60]} | {f.get('note', '')} | {f['sentence'][:140]} |")
        lines.append("")
    if shown_load:
        lines.append("Sentence load:")
        for l in shown_load:
            extra = f" [{l['span'][:60]}]" if l.get("span") else ""
            lines.append(f"- {l['id']} {l['value']}>{l['limit']} {l['block']}{extra}: {l['sentence'][:160]}")
        lines.append("")
    hidden = Counter(f"{f['level']} {f['id']}" for f in r["flags"] if f["level"] != "likely")
    hidden.update(l["id"] for l in r["load"] if l["id"] not in SHOWN_LOAD)
    if hidden:
        lines.append("JSON only (not for adjudication): " + ", ".join(f"{k} ×{n}" for k, n in sorted(hidden.items())))
        lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-grammar", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", type=Path)
    ap.add_argument("--plain", action="store_true")
    ap.add_argument("--json", type=Path, default=None)
    a = ap.parse_args(argv)
    if a.plain:
        paras = [p.strip() for p in a.file.read_text(encoding="utf-8").split("\n\n") if p.strip()]
        sf = SceneFile(chapter=0, scene="s00", version=0, blocks={f"p{i + 1:02d}": p for i, p in enumerate(paras)})
    else:
        sf = read_scene_file(a.file)
    r = analyze(sf)
    if a.json:
        a.json.parent.mkdir(parents=True, exist_ok=True)
        a.json.write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    print(format_report(r))


if __name__ == "__main__":
    main()
