"""Regression probes for nl-check: restricted grammar fires as `likely`, look-alikes do not,
and the vocabulary layer classifies known / unknown / compound / diminutive / idiom cases.

    uv run --project book/pipeline pytest book/pipeline/tools/tests -q
"""

from __future__ import annotations

import pytest

from nltools import grammar_check, vocab_check
from nltools.common import PROFILE_DIR
from nltools.memory import bible_for
from nltools.nlp import nlp
from nltools.scenefile import SceneFile

pytestmark = pytest.mark.skipif(not (PROFILE_DIR / "lexicon.json").exists(), reason="profile/lexicon.json missing; run nl-lexicon")

# one example per construction in profile/restricted.md
RESTRICTED = [
    ("R-RELCL", "De man die bij de deur stond, keek naar Harry."),
    ("R-PASSIVE", "De deur werd door de professor geopend."),
    ("R-PLUPERF", "Hij had de brief al gelezen."),
    ("R-INDIRECT", "Hij wist niet waarom ze lachte."),
    ("R-DAT", "Harry dacht dat het een grap was."),
    ("R-OF", "Hij vroeg zich af of het waar was."),
    ("R-ZOU", "Dat zou een probleem zijn."),
    ("R-IRREALIS-PAST", "Ze zou het hebben gezien."),
    ("R-ER-PREP", "Hij was er blij mee."),
    ("R-ER-PREP", "Ik denk er niet aan."),
    ("R-ER-QUANT", "Ik heb er twee."),
    ("R-TE-INF", "Hij ging naar huis om te eten."),
    ("R-POSTURE-TE", "Hij zat te lezen."),
    ("R-LATEN", "Hij liet een huis bouwen."),
    ("R-PERCEPTION", "Ik zag hem komen."),
    ("R-VERB-CHAIN", "Hij had willen gaan."),
    ("R-PARTICIPLE", "Lachend liep hij weg."),
    ("R-PARTICIPLE", "De door haar geschreven brief lag op tafel."),
    ("R-CONJ-OTHER", "Hij wachtte totdat ze kwam."),
    ("R-CONJ-OTHER", "Ze keek alsof ze het niet begreep."),
]

# the look-alike table at the end of profile/restricted.md
LOOKALIKES = [
    "Dat is raar.",
    "Koffie of thee?",
    "De winkel is gesloten.",
    "Hij is gevallen.",
    "Er staat een man buiten.",
    "Hij kan goed zwemmen.",
    "Ze ging slapen.",
    "Hij bleef staan.",
    "Zou u even wachten?",
    "Hij keek op toen ze de brief had gelezen.",
    "Hij was verbaasd.",
    "Met verstikte stem zei hij niets.",
]


@pytest.fixture(scope="session", autouse=True)
def model():
    return nlp()


@pytest.fixture(scope="session")
def grammar():
    """All probe sentences in one SceneFile, so spaCy runs once."""
    sentences = [s for _id, s in RESTRICTED] + LOOKALIKES + ["Hij zwaait met een toverstok en er komt magie uit."]
    blocks = {f"b{i:03d}": s for i, s in enumerate(sentences)}
    r = grammar_check.analyze(SceneFile(chapter=0, scene="s00", version=0, blocks=blocks))
    by_sentence: dict[str, list[dict]] = {s: [] for s in sentences}
    for f in r["flags"]:
        by_sentence[blocks[f["block"]]].append(f)
    return by_sentence


@pytest.mark.parametrize("rid,sentence", RESTRICTED)
def test_restricted_fires_likely(grammar, rid, sentence):
    likely = {f["id"] for f in grammar[sentence] if f["level"] == "likely"}
    assert rid in likely, f"{rid} not likely in {sentence!r}: {grammar[sentence]}"


@pytest.mark.parametrize("sentence", LOOKALIKES)
def test_lookalike_not_likely(grammar, sentence):
    likely = [f for f in grammar[sentence] if f["level"] == "likely"]
    assert not likely, f"look-alike flagged: {likely}"


@pytest.mark.xfail(strict=True, reason="spaCy parses 'uit' as the particle of uitkomen; the R-ER-PREP miss of ch903/s01 (analysis-findings §1.2 #12)")
def test_split_er_prep_with_particle(grammar):
    s = "Hij zwaait met een toverstok en er komt magie uit."
    assert "R-ER-PREP" in {f["id"] for f in grammar[s] if f["level"] == "likely"}


def test_report_hides_review_and_ignored():
    sf = SceneFile(chapter=0, scene="s00", version=0, blocks={"b001": "De winkel is gesloten.", "b002": "Harry dacht dat het een grap was."})
    md = grammar_check.format_report(grammar_check.analyze(sf))
    assert "R-DAT" in md.split("JSON only")[0]
    assert "R-PASSIVE" not in md.split("JSON only")[0]


def _vocab(*blocks: str) -> dict:
    sf = SceneFile(chapter=0, scene="s00", version=0, blocks={f"b{i + 1:03d}": b for i, b in enumerate(blocks)})
    return vocab_check.analyze(sf, set(), None)


def _row(r: dict, lemma: str) -> dict | None:
    return next((i for i in r["lemmas"] if i["lemma"] == lemma), None)


def test_known_words_make_no_rows():
    r = _vocab("Het huis is groot en de jongen is blij.")
    assert not [i for i in r["lemmas"] if i["status"] in ("stretch", "hard", "unknown")]
    assert r["known_share"] == 1.0


def test_unknown_word_goes_to_review():
    row = _row(_vocab("Hij keek over de schutting."), "schutting")
    assert row and row["status"] == "unknown" and row["action"] == "review"


def test_glossed_word_with_known_equivalent_is_must():
    r = _vocab("Hij keek over de \\gl{schutting}{fence}.")
    row = _row(r, "schutting")
    assert row["action"] == "glossed-known-equivalent"
    assert "hek" in [e["lemma"] for e in row["replace_with"]]
    assert not r["verdict"]["gloss_equivalent_ok"]


def test_compound_of_known_parts_is_known():
    r = _vocab("Toen zei een jongensstem: “Wat.”")
    assert not _row(r, "jongensstem") or _row(r, "jongensstem")["status"] == "compound"
    assert r["new_lemmas_unglossed"] == 0


def test_diminutive_of_known_noun_is_known():
    r = _vocab("Het kindje sliep in een klein bootje.")
    assert r["new_lemmas_unglossed"] == 0


def test_cognate_is_known():
    assert _vocab("Dat is een goede hypothese.")["new_lemmas_unglossed"] == 0


def test_idiom_of_known_words():
    row = _row(_vocab("Hij was maar al te bang."), "maar al te")
    assert row and row["status"] == "idiom" and row["action"] == "replace-or-gloss"


def test_separated_idiom():
    row = _row(_vocab("Harry hield voet bij stuk."), "voet bij stuk houden")
    assert row and row["status"] == "idiom"


def test_glossed_idiom():
    row = _row(_vocab("Hij nam haar \\gl{in de maling}{pulled her leg}."), "in de maling nemen")
    assert row and row["action"] == "glossed"


def test_polysemy_watch():
    r = _vocab("Je lag in bed en kwam wat aan.", "Nieuwsgierig zijn was juist en gepast.")
    assert {"aankomen", "gepast"} <= {s["lemma"] for s in r["senses"]}


def test_avoid_list():
    r = _vocab("Men zegt van alles.")
    assert r["avoid"] and not r["verdict"]["avoid_ok"]


def test_memory_keeps_chapter_sections_only():
    bible = "\n".join([
        "# Bible", "## Global decisions", "keep me", "## Narrator voice", "dry",
        "## Characters", "### Chapter 1 <!-- from chapter 1 -->", "Harry", "### Chapter 2 <!-- from chapter 2 -->", "McGonagall arrives",
        "## Running terms, motifs and repeated phrases", "| motif | Dutch | first | notes |", "|---|---|---|---|",
        "| a | b | 1 | x |", "| c | d | 1 / 6 | y |", "| e | f | 7 | z |",
        "## Per-chapter notes", "### Chapter 1 — One", "one", "### Chapter 2 — Two", "two",
        "## Spoilers", "secret",
    ])
    text, skipped = bible_for(1, bible)
    assert "keep me" in text and "dry" in text and "Harry" in text and "one" in text
    assert "| c | d | 1 / 6 | y |" in text
    for leak in ("McGonagall arrives", "| e | f | 7 |", "two", "secret"):
        assert leak not in text
    assert skipped == ["Spoilers"]
