"""nl-text: source parsing, id guard, and token/card resolution of a ready-made Dutch text.

    uv run --project book/pipeline pytest book/pipeline/tools/tests -q
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from nltools import text_import
from nltools.common import DEFAULT_SRS_DIR, PROFILE_DIR, exceptions
from nltools.reader_export import _card_pos
from nltools.vocab_check import Lexicon


def test_parse_source_kinds() -> None:
    src = "﻿# De titel\nEerste regel\ntweede regel.\r\n\r\n> Een citaat\n> loopt door.\n\n* * *\n\nLaatste."
    assert text_import.parse_source(src) == [
        ("heading", "De titel"),
        ("para", "Eerste regel tweede regel."),
        ("quote", "Een citaat loopt door."),
        ("break", ""),
        ("para", "Laatste."),
    ]


def test_italics_and_unbalanced_asterisks() -> None:
    marked = text_import.to_marked("Hij was *heel* moe.")
    assert "".join(marked.chars) == "Hij was heel moe."
    assert [c for c, em in zip(marked.chars, marked.em) if em] == list("heel")
    assert "".join(text_import.to_marked("5 * 3 is vijftien").chars) == "5 * 3 is vijftien"


def _srs(tmp_path: Path) -> Path:
    public = tmp_path / "srs" / "public"
    (public / "books").mkdir(parents=True)
    (public / "cards.json").write_text("[]")
    (public / "paths.json").write_text(json.dumps({"version": 1, "paths": [{"id": "inburgering"}]}))
    return tmp_path / "srs"


def test_init_refuses_taken_ids(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(text_import, "TEXTS_DIR", tmp_path / "texts")
    src = tmp_path / "verhaal.md"
    src.write_text("Er was eens een kat.")
    srs = _srs(tmp_path)
    text_import.main(["--srs", str(srs), "init", "kat", "--title", "De kat", str(src)])
    book = json.loads((tmp_path / "texts" / "kat" / "book.json").read_text())
    assert book["chapters"] == [{"n": 1, "title": "De kat", "file": "ch001.md"}]
    for taken in ("kat", "inburgering"):
        with pytest.raises(SystemExit, match="already used"):
            text_import.main(["--srs", str(srs), "init", taken, "--title", "X", str(src)])


@pytest.mark.skipif(not (PROFILE_DIR / "lexicon.json").exists(), reason="profile/lexicon.json missing; run nl-lexicon")
def test_separable_particle_shares_the_verb_cards(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(text_import, "TEXTS_DIR", tmp_path)
    (tmp_path / "t").mkdir()
    (tmp_path / "t" / "ch001.md").write_text("Hij stond om zeven uur op.")
    book = {"id": "t", "title": "T", "chapters": [{"n": 1, "title": "T", "file": "ch001.md"}]}
    ch = text_import.export_text_chapter(book, book["chapters"][0], Lexicon(), _card_pos(DEFAULT_SRS_DIR), exceptions())
    tokens = {t["w"]: t for t in ch["blocks"][0]["tokens"]}
    assert tokens["stond"]["lemma"] == "opstaan"
    assert tokens["op"]["cards"] == tokens["stond"]["cards"] != []
    assert ch["words"] == 6
