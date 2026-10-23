"""nl-vocab: check a Dutch scene against the reader lexicon.

Resolves every token to a lemma (spaCy + enrichment forms + separable-verb
reattachment + light de-inflection), looks the lemma up in profile/lexicon.json,
applies exceptions.json / memory/glossary.json, and reports:

  * share of known tokens, new-lemma density, stretch (B1) budget
  * every new lemma with status, gloss state and a suggested action
  * clusters (too many new words in one sentence / paragraph)
  * words from the "avoid" list
  * must: a glossed stretch/hard/unknown word whose gloss matches the English of a known
    lemma (or a dutch-srs synonym) — replace instead of glossing
  * idioms of known words (profile/phrases.json) and known words with a second sense
    the reader does not know (profile/polysemy.json)

Absence from the lexicon is reported as status "unknown" — for the reviewer to
judge — never as "too hard".
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from .common import MEMORY_DIR, PROFILE_DIR, exceptions, glossary, load_json, thresholds
from .nlp import is_word, nlp
from .scenefile import SceneFile, read_scene_file, strip_gloss
from .texparse import tex_to_text

_GL_RE = re.compile(r"\\gl\{([^{}]*)\}\{([^{}]*)\}")
_PREFIXES = {"ver", "be", "ge", "ont", "her", "er", "mis", "on", "wan"}
PARTICLE_DEPS = {"compound:prt"}
SEPARABLE_PARTICLES = {
    "aan", "af", "achter", "bij", "binnen", "buiten", "dicht", "door", "heen", "in", "klaar", "langs", "los", "mee", "na",
    "neer", "om", "op", "open", "over", "rond", "samen", "tegen", "terug", "thuis", "toe", "uit", "vast", "voor", "voorbij",
    "vooruit", "weg", "mis", "goed", "schoon", "stil", "vol", "kwijt", "leeg", "vrij",
}
ACTION_HINT = {
    "keep": "keep (world term); gloss per policy",
    "keep-gloss-needed": "keep, but add \\gl{..}{..} at first occurrence in this chapter",
    "avoid": "replace with the preferred everyday word",
    "ok-stretch": "B1 word inside the stretch budget; fine, consider a gloss if the context does not explain it",
    "ok-transparent": "B1 by the data but a compound of two known words; fine without gloss",
    "phrase-glossed": "multi-word gloss; fine if the phrase is needed, otherwise prefer a plain verb",
    "gloss-or-replace": "replace with a known word if meaning survives; otherwise gloss",
    "replace-or-gloss": "prefer rewording; gloss only if the word matters for the scene",
    "glossed": "already glossed",
    "gloss-on-known": "glossed although the lexicon rates it known — drop the gloss unless the sense is unusual",
    "glossed-known-equivalent": "MUST: glossed, but a known word means the same — replace with it and drop the gloss",
    "review": "not in any list — reviewer decides (cognate? compound of known parts? name?)",
}
ACTION_HINT["idiom"] = "idiom of known words the reader does not know as a phrase — use the plain wording or gloss the phrase"
MUST_ACTIONS = {"glossed-known-equivalent", "avoid"}


def _en_keys(text: str, inflected: bool = False) -> set[str]:
    """'to arrive; (formal) come' -> {'arrive', 'come'}. inflected=True also tries base forms of a gloss ('fences', 'lobbed')."""
    out: set[str] = set()
    for piece in re.split(r"[,;/]", re.sub(r"\([^)]*\)", " ", text.lower())):
        p = re.sub(r"^(to|a|an|the)\s+", "", piece.strip(" .!?'\"")).strip()
        if not p or len(p) < 3:
            continue
        out.add(p)
        if inflected and " " not in p:
            if p.endswith("ies"):
                out.add(p[:-3] + "y")
            if p.endswith("es"):
                out.add(p[:-2])
            if p.endswith("s"):
                out.add(p[:-1])
            if p.endswith("ed"):
                out |= {p[:-2], p[:-1]} | ({p[:-3]} if len(p) > 5 and p[-3] == p[-4] else set())
            if p.endswith("ing") and len(p) > 5:
                out |= {p[:-3], p[:-3] + "e"}
    return out


class Lexicon:
    def __init__(self, path: Path = PROFILE_DIR / "lexicon.json"):
        if not path.exists():
            raise SystemExit(f"{path} missing; run nl-lexicon first")
        data = load_json(path)
        self.entries: dict = data["entries"]
        self.phrases: dict = data["phrases"]
        self.forms: dict = data["forms"]
        self.max_phrase_len = max((len(p.split()) for p in self.phrases), default=1)
        self._known_by_en: dict[str, list[str]] | None = None

    def lookup(self, lemma: str) -> dict | None:
        return self.entries.get(lemma)

    def _build_index(self) -> None:
        self._known_by_en = defaultdict(list)
        for lemma, e in self.entries.items():
            if e.get("status") != "known" or " " in lemma:
                continue
            for g in e.get("en", []):
                for k in _en_keys(g):
                    self._known_by_en[k].append(lemma)

    def known_equivalents(self, lemma: str, surface: set[str], gloss: str, pos: str | None) -> list[dict]:
        """Known lemmas with the same English sense as the gloss, or listed as the word's synonyms (dutch-srs enrichment)."""
        if self._known_by_en is None:
            self._build_index()
        own = {lemma} | surface
        e = self.entries.get(lemma) or {}
        found: dict[str, str] = {}
        for k in _en_keys(gloss, inflected=True):
            for cand in self._known_by_en.get(k, []):
                found.setdefault(cand, f"en '{k}'")
        # enrichment synonyms cover every sense of a word (draak -> heks 'shrew', eminent -> voornaam
        # 'distinguished'); a synonym counts only when its own English shares a sense with this word
        senses = _en_keys(gloss, inflected=True) | {k for g in e.get("en", []) for k in _en_keys(g)}
        for cand in e.get("synonyms", []):
            ce = self.entries.get(cand)
            if ce and ce.get("status") == "known" and senses & {k for g in ce.get("en", []) for k in _en_keys(g)}:
                found.setdefault(cand, "synonym")
        want = {"PROPN": "NOUN", "AUX": "VERB"}.get(pos or "", pos or "")
        out = []
        for cand, why in found.items():
            if any(cand in w or w in cand for w in own):
                continue  # the word itself, or a part of a compound (toelatingsbrief / brief)
            cpos = set(self.entries[cand].get("pos", []))
            if want in ("NOUN", "VERB", "ADJ", "ADV") and cpos and not (cpos & ({want} | ({"ADJ", "ADV"} if want in ("ADJ", "ADV") else set()))):
                continue
            out.append({"lemma": cand, "cefr": self.entries[cand].get("cefr"), "why": why})
        return sorted(out, key=lambda x: (x["why"] == "synonym", x["cefr"] or "Z", x["lemma"]))[:3]


def load_polysemy() -> dict[str, dict]:
    """lemma or surface form -> watch-list entry (profile/polysemy.json)."""
    p = PROFILE_DIR / "polysemy.json"
    out: dict[str, dict] = {}
    for w in (load_json(p).get("words", []) if p.exists() else []):
        out[w["lemma"]] = w
        for f in w.get("forms", []):
            out[f] = w
    return out


def load_phrases() -> list[dict]:
    p = PROFILE_DIR / "phrases.json"
    return load_json(p).get("phrases", []) if p.exists() else []


def _phrase_hit(ph: dict, sent, resolved: dict[int, str]) -> list | None:
    """Tokens of the sentence that realise the phrase, or None. `resolved`: token index -> the
    checker's lemma (spaCy alone leaves 'verbond' unlemmatised)."""
    toks = [t for t in sent if is_word(t)]
    keys = [{t.lower_, (t.lemma_ or t.text).lower(), resolved.get(t.i, "")} for t in toks]
    used: list = []
    core = ph.get("core", "").split()
    gap = ph.get("gap", 0)
    if core:
        start = None
        for i in range(len(toks)):
            if core[0] not in keys[i]:
                continue
            pos, idx = i, [i]
            for w in core[1:]:
                nxt = next((j for j in range(pos + 1, min(len(toks), pos + 2 + gap)) if w in keys[j]), None)
                if nxt is None:
                    break
                idx.append(nxt)
                pos = nxt
            if len(idx) == len(core):
                start = idx
                break
        if start is None:
            return None
        used = [toks[i] for i in start]
    for alt in ph.get("with", []):
        opts = set(alt.split("|"))
        hit = next((t for t, k in zip(toks, keys) if k & opts and t not in used), None)
        if hit is None:
            return None
        used.append(hit)
    return used or None


def _derivations(word: str) -> list[str]:
    """Transparent derivations of a known base: onbeschaafd -> beschaafd, geelachtig -> geel, voorste -> voor."""
    out: list[str] = []
    if word.startswith("on") and len(word) > 6:
        out.append(word[2:])
    for suf in ("achtig", "achtige"):
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            out.append(word[: -len(suf)])
    for suf in ("ste", "st"):
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            out.append(word[: -len(suf)])
    return out


def _deinflect(word: str) -> list[str]:
    """Cheap Dutch de-inflection candidates (checked against the lexicon, so false ones are harmless)."""
    w = word
    c: list[str] = []
    if len(w) > 4 and w.startswith("ge") and w[-1] in "dt":  # participle ge-...-d/t
        stem = w[2:-1]
        c += [stem + "en", stem + w[-1] + "en", stem + stem[-1] + "en" if stem else ""]
    for suf in ("ste", "den", "ten", "de", "te", "en", "er", "st", "es", "e", "s", "t", "n"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            stem = w[: -len(suf)]
            c += [stem, stem + "en", stem + "e"]
            if len(stem) >= 2 and stem[-1] == stem[-2]:  # kussen -> kus
                c.append(stem[:-1])
                c.append(stem[:-1] + "en")
            if len(stem) >= 3 and stem[-1] in "fs":  # huizen -> huis, brieven -> brief
                c.append(stem[:-1] + ("s" if stem[-1] == "z" else "f"))
            if len(stem) >= 2 and stem[-1] in "zv":
                c.append(stem[:-1] + ("s" if stem[-1] == "z" else "f"))
            # open syllable: lopen -> loop
            if len(stem) >= 3 and stem[-2] in "aeou" and stem[-3] not in "aeiou":
                c.append(stem[:-1] + stem[-2] + stem[-1])
                c.append(stem[:-1] + stem[-2] + stem[-1] + "en")
    seen = set()
    out = []
    for x in c:
        if x and x not in seen and x != word:
            seen.add(x)
            out.append(x)
    return out


def _strip_acute(word: str) -> str:
    """wél -> wel, één -> een (stress accents); keeps ê/ë/ç which are lexical."""
    import unicodedata

    decomposed = unicodedata.normalize("NFD", word)
    return unicodedata.normalize("NFC", decomposed.replace("\u0301", ""))


def _undiminutive(word: str) -> list[str]:
    """haarnetje -> haarnet, boompje -> boom, kindje -> kind, koninkje -> koning, bloemetje -> bloem."""
    out: list[str] = []
    if word.endswith("jes") and len(word) > 5:  # plural diminutive: hoopjes -> hoopje -> hoop
        word = word[:-1]
    for suf, repl in (("etje", ""), ("pje", ""), ("kje", "g"), ("tje", ""), ("je", "")):
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            stem = word[: -len(suf)] + repl
            out.append(stem)
            if len(stem) >= 2 and stem[-1] == stem[-2]:  # kippetje -> kip
                out.append(stem[:-1])
            if suf == "tje" and len(stem) >= 2 and stem[-1] in "aeiou":  # autootje -> auto
                out.append(stem[:-1])
    return out


class Resolver:
    def __init__(self, lex: Lexicon, exc: dict, gloss_terms: dict, known_extra: set[str], names: set[str] | None = None):
        self.lex = lex
        self.names = set(names or ())
        self.keep = {e["lemma"].lower(): e for e in exc.get("keep", [])}
        self.avoid = {e["lemma"].lower(): e for e in exc.get("avoid", [])}
        self.gloss_nl = set()
        for t in gloss_terms.get("terms", []):
            for w in [t.get("nl", "")] + t.get("nl_forms", []):
                if w:
                    self.gloss_nl.add(w.lower())
                    for piece in w.split():
                        if piece[:1].isupper():
                            self.gloss_nl.add(piece.lower())
        self.known_extra = {w.lower() for w in known_extra}
        self.cognates = {w.lower() for w in exc.get("cognates", [])}
        self.transparent: set[str] = set()

    def candidates(self, tok) -> list[str]:
        low = tok.text.lower().strip("’'-.,;:!?…“”‘")
        lem = (tok.lemma_ or low).lower()
        cands: list[str] = []
        particle = None
        for ch in tok.children:
            if ch.dep_ in PARTICLE_DEPS:
                particle = ch.text.lower()
        if particle is None and tok.pos_ in ("VERB", "AUX"):
            # parser sometimes leaves the particle as advmod/obl ("hield vol", "doet na"): accept the join
            # only when the joined verb exists in the lexicon
            for ch in tok.children:
                if ch.dep_ in ("advmod", "obl", "xcomp", "compound") and ch.lower_ in SEPARABLE_PARTICLES and not list(ch.children) and ch.i > tok.i:
                    for base in [lem] + self.lex.forms.get(low, []):
                        if self.lex.lookup(ch.lower_ + base):
                            particle = ch.lower_
                            break
                if particle:
                    break
        if particle:
            for base in [lem] + self.lex.forms.get(low, []):
                cands.append(particle + base)
        cands.append(lem)
        cands.append(low)
        cands += self.lex.forms.get(low, [])
        if "-" in low:
            cands.append(low.replace("-", ""))
        plain = _strip_acute(low)
        if plain != low:
            cands.append(plain)
            cands += self.lex.forms.get(plain, [])
        self._heuristic = set()
        self._derived = set()
        for base in _undiminutive(plain) + _derivations(plain):
            for f in [base] + self.lex.forms.get(base, []) + _deinflect(base):
                cands.append(f)
                self._derived.add(f)
        for d in _deinflect(low):
            cands.append(d)
            self._heuristic.add(d)
        out: list[str] = []
        for c in cands:
            if c and c not in out:
                out.append(c)
        return out

    @staticmethod
    def _pos_match(entry: dict | None, tok) -> bool:
        if not entry or not entry.get("pos"):
            return False
        pos = {"AUX": "VERB", "PROPN": "NOUN", "CCONJ": "CONJ", "SCONJ": "CONJ"}.get(tok.pos_, tok.pos_)
        compatible = {
            "DET": {"DET", "PRON", "ADJ", "NUM"},
            "PRON": {"PRON", "DET", "ADJ"},
            "ADJ": {"ADJ", "ADV", "ADP"},
            "ADV": {"ADV", "ADJ", "ADP", "PRON"},
            "ADP": {"ADP", "ADV"},
            "NUM": {"NUM", "ADJ"},
        }.get(pos, {pos})
        return bool(compatible & set(entry["pos"]))

    def resolve(self, tok) -> tuple[str, str, dict | None]:
        """-> (lemma, status, entry). status in known|stretch|hard|unknown|keep|avoid|name|number."""
        low = tok.text.lower().strip("’'-.,;:!?…“”‘")
        plain = _strip_acute(low)
        if tok.like_num or tok.pos_ == "NUM":
            return low, "number", None
        clean = tok.text.strip("’'-.,;:!?…“”‘")
        if clean in self.names or (tok.pos_ == "PROPN" and clean[:1].isupper()) or (
            clean[:1].isupper() and tok.i != tok.sent.start and tok.ent_type_ in ("PERSON", "GPE", "LOC", "ORG")
        ):
            return clean, "name", None
        if low in self.gloss_nl or tok.text in self.gloss_nl or plain in self.cognates:
            return low, "term", None
        if len(low) <= 1:
            return low, "number", None  # possessive ’s and similar clitics
        hits: list[tuple[str, str, dict | None]] = []
        for c in self.candidates(tok):
            if c in self.avoid and c not in self._heuristic:
                return c, "avoid", self.lex.lookup(c)
            if c in self.cognates:
                return c, "term", None
            e = self.lex.lookup(c)
            # a stem produced by the de-inflection heuristic only counts when its POS matches the token
            # (otherwise "welden" -> "wel" would pass as known)
            if c in self._heuristic and c not in self._derived and not self._pos_match(e, tok):
                continue
            if c in self.known_extra or (e and e["status"] == "known"):
                hits.append((c, "known", e))
            elif c in self.keep:
                hits.append((c, "keep", e))
            elif e:
                hits.append((c, e["status"], e))
        best = None
        if hits:
            # prefer a candidate whose lexicon POS matches the token; the candidate list is
            # already ordered lemma -> surface -> inflection table -> heuristics
            best = next((h for h in hits if self._pos_match(h[2], tok)), hits[0])
            if best[1] == "known":
                if best[0] in self._derived and best[0] != low:
                    return low, "derived", best[2]
                return best
        # compound of two known parts (drugsgeld = drugs + geld) — tried when the lexicon has no
        # entry or only a `hard` one (NT2Lex lists some transparent compounds at B2/C1); a B1
        # rating from the data (boekenkast) is kept
        if best is None or best[1] == "hard":
            for form in dict.fromkeys([low, plain] + _undiminutive(plain)):
                comp = self._compound(form)
                if comp:
                    return comp
        if best:
            if best[1] == "stretch" and self._compound(low):
                self.transparent.add(best[0])
            return best
        return (tok.lemma_ or low).lower(), "unknown", None

    def _compound(self, low: str):
        if len(low) < 7:
            return None
        for i in range(3, len(low) - 2):
            a, b = low[:i], low[i:]
            heads = {a}
            if a.endswith("s"):
                heads.add(a[:-1])
            if a.endswith("en"):
                heads.add(a[:-2])
                heads.add(a[:-1])
            if a.endswith("e"):
                heads.add(a[:-1])
            for aa in heads:
                if len(aa) < 3 or aa in _PREFIXES:
                    continue
                ea = self.lex.lookup(aa)
                if aa not in self.cognates and (not ea or ea["status"] != "known"):
                    continue
                if len(aa) <= 3 and ea and "NOUN" not in ea.get("pos", []):
                    continue  # "ver" + "ruk" is not a compound
                for bb in [b] + self.lex.forms.get(b, []) + _deinflect(b):
                    eb = self.lex.lookup(bb)
                    if eb and eb["status"] == "known" and "NOUN" in (eb.get("pos") or ["NOUN"]):
                        return f"{aa}+{bb}", "compound", eb
        return None


def source_names(src: dict | None) -> set[str]:
    """Capitalised words from the English source that are not sentence-initial: names the Dutch text will reuse."""
    names: set[str] = set()
    if not src:
        return names
    for b in src.get("blocks", []):
        if not b.get("translate"):
            continue
        names |= capitalised_after_lowercase(b["text"])
    return names


def capitalised_after_lowercase(text: str) -> set[str]:
    """Words that appear capitalised right after a lower-case word (so not sentence-initial)."""
    out: set[str] = set()
    words = text.replace("—", " — ").split()
    for prev, w in zip(words, words[1:]):
        if prev.rstrip("”’\"')").endswith((".", "!", "?", "…", ":", "—")):
            continue  # sentence boundary: the next word is capitalised anyway
        p2 = prev.strip("“”‘’\"'(),.;:!?—-…")
        w2 = w.strip("“”‘’\"'(),.;:!?—-…")
        if p2[:1].islower() and w2[:1].isupper() and w2[1:2].islower():
            out.add(w2)
    return out


def analyze(sf: SceneFile, chapter_known: set[str] | None = None, src: dict | None = None) -> dict:
    th = thresholds()
    vcfg = th["vocab"]
    lex = Lexicon()
    exc = exceptions()
    res = Resolver(lex, exc, glossary(), chapter_known or set(), source_names(src))
    model = nlp()

    glossed_words: dict[str, set[str]] = defaultdict(set)
    single_glossed: dict[str, set[str]] = defaultdict(set)  # whole-word glosses only (for the gloss-on-known row)
    gloss_macros: dict[str, list[tuple[str, str]]] = defaultdict(list)
    gloss_text: dict[str, str] = {}
    for bid, tex in sf.blocks.items():
        for w, g in _GL_RE.findall(tex):
            gloss_macros[bid].append((w, g))
            gloss_text.setdefault(w.lower(), g)
            if " " not in w.strip():
                single_glossed[bid].add(w.lower())
            for piece in [w.lower()] + w.lower().split():
                glossed_words[bid].add(piece)
                glossed_words["*"].add(piece)
    poly = load_polysemy()
    idioms = [p for p in load_phrases() if (lex.phrases.get(p["phrase"]) or {}).get("status") != "known"]
    senses: dict[str, dict] = {}
    surfaces: dict[str, set[str]] = defaultdict(set)

    texts = {bid: tex_to_text(strip_gloss(tex)).replace("—", " — ") for bid, tex in sf.blocks.items()}
    docs = dict(zip(texts.keys(), model.pipe(texts.values())))
    for t in texts.values():
        res.names |= capitalised_after_lowercase(t)

    tokens_total = 0
    tokens_known = 0
    lemma_info: dict[str, dict] = {}
    clusters: list[dict] = []
    per_block: dict[str, dict] = {}
    avoid_hits: list[dict] = []
    seen_phrase_tokens: set[tuple[str, int]] = set()

    for bid, doc in docs.items():
        block_new: list[str] = []
        block_tokens = 0
        # phrase matching (longest first)
        words = [t for t in doc]
        for i, t in enumerate(words):
            if not is_word(t):
                continue
            for n in range(min(lex.max_phrase_len, 4), 1, -1):
                span = words[i : i + n]
                if len(span) < n or not all(is_word(x) for x in span):
                    continue
                key = " ".join(x.text.lower() for x in span)
                key2 = " ".join((x.lemma_ or x.text).lower() for x in span)
                ph = lex.phrases.get(key) or lex.phrases.get(key2)
                if ph and ph["status"] == "known":
                    for x in span:
                        seen_phrase_tokens.add((bid, x.i))
                    break
        for sent in doc.sents:
            sent_new: list[str] = []
            resolved: dict[int, str] = {}
            for tok in sent:
                if not is_word(tok):
                    continue
                tokens_total += 1
                block_tokens += 1
                if (bid, tok.i) in seen_phrase_tokens:
                    tokens_known += 1
                    continue
                lemma, status, entry = res.resolve(tok)
                resolved[tok.i] = lemma
                surfaces[lemma].add(tok.text.lower())
                pw = poly.get(lemma) or poly.get(tok.lower_)
                if pw and status not in ("name", "number"):
                    s = senses.setdefault(pw["lemma"], {"lemma": pw["lemma"], "known": pw.get("known", ""), "watch": pw.get("watch", ""), "count": 0, "blocks": [], "examples": []})
                    s["count"] += 1
                    if bid not in s["blocks"]:
                        s["blocks"].append(bid)
                    if len(s["examples"]) < 2:
                        s["examples"].append(sent.text.strip()[:160])
                glossed = tok.text.lower() in glossed_words[bid] or lemma in glossed_words[bid]
                glossed_in_scene = tok.text.lower() in glossed_words["*"] or lemma in glossed_words["*"]
                if status in ("known", "name", "number", "compound", "term", "derived"):
                    tokens_known += 1
                    if status in ("known", "compound") and (tok.text.lower() in single_glossed[bid] or lemma in single_glossed[bid]):
                        info = lemma_info.setdefault(
                            lemma,
                            {"lemma": lemma, "status": status, "cefr": (entry or {}).get("cefr"), "en": (entry or {}).get("en", [])[:3], "count": 0, "blocks": [], "glossed": True, "examples": []},
                        )
                        info["count"] += 1
                        if bid not in info["blocks"]:
                            info["blocks"].append(bid)
                    continue
                if status == "keep":
                    policy = res.keep[lemma].get("gloss", "first")
                    if policy == "never" or glossed_in_scene:
                        tokens_known += 1
                    info = lemma_info.setdefault(
                        lemma,
                        {"lemma": lemma, "status": "keep", "cefr": (entry or {}).get("cefr"), "en": [res.keep[lemma].get("en", "")], "count": 0, "blocks": [], "glossed": glossed_in_scene, "policy": policy},
                    )
                    info["count"] += 1
                    if bid not in info["blocks"]:
                        info["blocks"].append(bid)
                    if policy != "never" and not glossed_in_scene:
                        sent_new.append(lemma)
                        block_new.append(lemma)
                    continue
                if status == "avoid":
                    avoid_hits.append({"block": bid, "word": tok.text, "lemma": lemma, "prefer": res.avoid[lemma].get("prefer")})
                if glossed:
                    tokens_known += 1
                info = lemma_info.setdefault(
                    lemma,
                    {
                        "lemma": lemma,
                        "status": status,
                        "cefr": (entry or {}).get("cefr"),
                        "en": (entry or {}).get("en", [])[:3],
                        "pos": tok.pos_,
                        "count": 0,
                        "blocks": [],
                        "glossed": glossed_in_scene,
                        "examples": [],
                    },
                )
                info["count"] += 1
                if bid not in info["blocks"]:
                    info["blocks"].append(bid)
                if len(info["examples"]) < 2:
                    info["examples"].append(tok.sent.text.strip()[:160])
                if not glossed_in_scene:
                    sent_new.append(lemma)
                    block_new.append(lemma)
            for ph in idioms:
                if not _phrase_hit(ph, sent, resolved):
                    continue
                core_words = ph.get("core", "").split()
                glossed_ph = bool(core_words) and any(all(c in gw.lower().split() for c in core_words) for gw, _g in gloss_macros[bid])
                info = lemma_info.setdefault(
                    ph["phrase"],
                    {"lemma": ph["phrase"], "status": "idiom", "cefr": None, "en": [ph.get("en", "")], "plain": ph.get("plain", ""), "count": 0, "blocks": [], "glossed": False, "examples": [], "idiom": True},
                )
                info["count"] += 1
                info["glossed"] = info["glossed"] or glossed_ph
                if bid not in info["blocks"]:
                    info["blocks"].append(bid)
                if len(info["examples"]) < 2:
                    info["examples"].append(sent.text.strip()[:160])
            distinct = sorted(set(sent_new))
            if len(distinct) > vcfg["new_per_sentence_max"]:
                clusters.append({"block": bid, "scope": "sentence", "new": distinct, "text": sent.text.strip()[:200]})
        distinct_b = sorted(set(block_new))
        if len(distinct_b) > vcfg["new_per_paragraph_max"]:
            clusters.append({"block": bid, "scope": "paragraph", "new": distinct_b})
        per_block[bid] = {"tokens": block_tokens, "new": distinct_b, "glosses": [w for w, _g in gloss_macros[bid]]}
        gl = len(gloss_macros[bid])
        if gl > vcfg["gloss_per_paragraph_max"]:
            clusters.append({"block": bid, "scope": "glosses", "new": [w for w, _g in gloss_macros[bid]], "note": f"{gl} glosses in one paragraph"})
        for w, g in gloss_macros[bid]:
            if " " in w.strip():
                ph = lex.phrases.get(w.lower())
                info = lemma_info.setdefault(
                    w.lower(),
                    {"lemma": w.lower(), "status": (ph or {}).get("status", "phrase"), "cefr": (ph or {}).get("cefr"), "en": [g], "count": 0, "blocks": [], "glossed": True, "examples": [], "phrase": True},
                )
                info["count"] += 1
                if bid not in info["blocks"]:
                    info["blocks"].append(bid)

    # actions
    stretch_unglossed = [l for l, i in lemma_info.items() if i["status"] == "stretch" and not i["glossed"] and l not in res.transparent]
    per_1000 = tokens_total / 1000 if tokens_total else 1
    stretch_budget = max(vcfg.get("stretch_budget_min", 1), round(vcfg["stretch_budget_per_1000"] * per_1000))
    stretch_sorted = sorted(stretch_unglossed, key=lambda l: -lemma_info[l]["count"])
    within_budget = set(stretch_sorted[:stretch_budget])
    for lemma, info in lemma_info.items():
        st = info["status"]
        if info.get("idiom"):
            info["action"] = "glossed" if info["glossed"] else "replace-or-gloss"
            info["hint"] = ACTION_HINT["idiom"] + (f"; plain: {info['plain']}" if info.get("plain") else "")
            continue
        if info.get("phrase"):
            info["action"] = "phrase-glossed"
        elif st == "keep":
            info["action"] = "keep" if (info["policy"] == "never" or info["glossed"]) else "keep-gloss-needed"
        elif st == "avoid":
            info["action"] = "avoid"
        elif st in ("known", "compound"):
            info["action"] = "gloss-on-known"
        elif info["glossed"]:
            info["action"] = "glossed"
            surf = surfaces.get(lemma, set())
            gloss = next((gloss_text[w] for w in [lemma, *sorted(surf)] if w in gloss_text), "")
            eq = lex.known_equivalents(lemma, surf, gloss, info.get("pos")) if gloss else []
            if eq:
                info["action"] = "glossed-known-equivalent"
                info["gloss"] = gloss
                info["replace_with"] = eq
        elif st == "stretch":
            info["action"] = "ok-transparent" if lemma in res.transparent else ("ok-stretch" if lemma in within_budget else "gloss-or-replace")
        elif st == "hard":
            info["action"] = "replace-or-gloss"
        else:
            info["action"] = "review"
        info["hint"] = ACTION_HINT[info["action"]]

    new_unglossed = [i for i in lemma_info.values() if not i["glossed"] and i["status"] in ("stretch", "hard", "unknown") and i["lemma"] not in res.transparent]
    known_share = tokens_known / tokens_total if tokens_total else 1.0
    density = len(new_unglossed) / per_1000 if tokens_total else 0
    verdict = {
        "known_share_ok": known_share >= vcfg["known_token_share_min"],
        "density_ok": density <= vcfg["new_lemmas_per_1000_max"],
        "clusters_ok": not clusters,
        "avoid_ok": not avoid_hits,
        "gloss_equivalent_ok": not any(i["action"] == "glossed-known-equivalent" for i in lemma_info.values()),
    }
    verdict["ok"] = all(verdict.values())
    return {
        "scene": f"ch{sf.chapter:03d}/{sf.scene}",
        "version": sf.version,
        "tokens": tokens_total,
        "known_tokens": tokens_known,
        "known_share": round(known_share, 4),
        "new_lemmas_unglossed": len(new_unglossed),
        "new_per_1000": round(density, 1),
        "stretch_budget": int(stretch_budget),
        "verdict": verdict,
        "lemmas": sorted(lemma_info.values(), key=lambda i: (0 if i["action"] in MUST_ACTIONS else 1, {"unknown": 0, "hard": 1, "avoid": 1, "idiom": 1, "stretch": 2, "keep": 3, "known": 5, "compound": 5}.get(i["status"], 4), -i["count"])),
        "clusters": clusters,
        "avoid": avoid_hits,
        "senses": sorted(senses.values(), key=lambda s: (s["count"], s["lemma"])),
        "per_block": per_block,
        "thresholds": vcfg,
    }


def format_report(r: dict) -> str:
    v = r["verdict"]
    lines = [
        f"## Vocabulary — {r['scene']} v{r['version']}",
        f"tokens {r['tokens']}, known {r['known_share']:.1%} (min {r['thresholds']['known_token_share_min']:.0%}) {'OK' if v['known_share_ok'] else 'LOW'}; "
        f"new unglossed lemmas {r['new_lemmas_unglossed']} = {r['new_per_1000']}/1000 (max {r['thresholds']['new_lemmas_per_1000_max']}) {'OK' if v['density_ok'] else 'HIGH'}; "
        f"stretch budget {r['stretch_budget']}",
        "",
    ]
    must = [i for i in r["lemmas"] if i["action"] == "glossed-known-equivalent"]
    if must:
        lines.append("Must fix (glossed word with a known equivalent — replace, drop the gloss):")
        for i in must:
            eq = ", ".join(f"{e['lemma']} ({e.get('cefr') or '-'}, {e['why']})" for e in i["replace_with"])
            lines.append(f"- {i['lemma']} {' '.join(i['blocks'])}: gloss '{i['gloss']}' → known: {eq}")
        lines.append("")
    if r["lemmas"]:
        lines.append("| lemma | status | cefr | n | blocks | action | en |")
        lines.append("|---|---|---|---|---|---|---|")
        for i in r["lemmas"]:
            en = ", ".join(x for x in i.get("en", []) if x)
            act = i["action"] + (f" → {i['replace_with'][0]['lemma']}" if i.get("replace_with") else "") + (f" (plain: {i['plain']})" if i.get("idiom") and i.get("plain") and not i["glossed"] else "")
            lines.append(f"| {i['lemma']} | {i['status']} | {i.get('cefr') or '-'} | {i['count']} | {' '.join(i['blocks'])} | {act} | {en} |")
        lines.append("")
    if r.get("senses"):
        lines.append("Senses to check (profile/polysemy.json — known word, is the reader's sense the right one?):")
        for s in r["senses"]:
            ex = f" — {s['examples'][0]}" if s["count"] <= 2 and s["examples"] else ""
            blocks = " ".join(s["blocks"][:6]) + (" …" if len(s["blocks"]) > 6 else "")
            lines.append(f"- {s['lemma']} ×{s['count']} {blocks}: known '{s['known']}'; watch: {s['watch']}{ex}")
        lines.append("")
    if r["clusters"]:
        lines.append("Clusters:")
        for c in r["clusters"]:
            extra = f" — {c['text']}" if c.get("text") else (f" — {c['note']}" if c.get("note") else "")
            lines.append(f"- {c['block']} ({c['scope']}): {', '.join(c['new'])}{extra}")
        lines.append("")
    if r["avoid"]:
        lines.append("Avoid-list words: " + ", ".join(f"{a['word']} ({a['block']}; prefer {a['prefer']})" for a in r["avoid"]))
        lines.append("")
    return "\n".join(lines)


def load_chapter_known(chapter: int) -> set[str]:
    """Words glossed earlier in this chapter (memory/known-so-far/chNNN.json) count as known."""
    p = MEMORY_DIR / "known-so-far" / f"ch{chapter:03d}.json"
    if not p.exists():
        return set()
    return set(load_json(p).get("glossed", []))


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="nl-vocab", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", type=Path, help="scene file sNN.vN.nl.md (or any text with --plain)")
    ap.add_argument("--plain", action="store_true", help="treat the file as plain Dutch text (one paragraph per blank line)")
    ap.add_argument("--json", type=Path, default=None, help="write full JSON report here")
    ap.add_argument("--no-chapter-memory", action="store_true")
    a = ap.parse_args(argv)
    if a.plain:
        paras = [p.strip() for p in a.file.read_text(encoding="utf-8").split("\n\n") if p.strip()]
        sf = SceneFile(chapter=0, scene="s00", version=0, blocks={f"p{i + 1:02d}": p for i, p in enumerate(paras)})
    else:
        sf = read_scene_file(a.file)
    known = set() if (a.no_chapter_memory or a.plain) else load_chapter_known(sf.chapter)
    r = analyze(sf, known)
    if a.json:
        a.json.parent.mkdir(parents=True, exist_ok=True)
        a.json.write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    print(format_report(r))


if __name__ == "__main__":
    main()
