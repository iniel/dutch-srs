from __future__ import annotations

import functools
import re

MODEL = "nl_core_news_lg"


@functools.lru_cache(maxsize=1)
def nlp():
    import spacy

    return spacy.load(MODEL)


def split_sentences_text(text: str) -> list[str]:
    doc = nlp()(text)
    return [s.text.strip() for s in doc.sents if s.text.strip()]


_WORDISH = re.compile(r"^[\w'’\-]+$", re.UNICODE)


def is_word(token) -> bool:
    return token.pos_ not in ("PUNCT", "SPACE", "SYM") and any(ch.isalnum() for ch in token.text)
