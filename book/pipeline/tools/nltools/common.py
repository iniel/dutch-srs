from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

DUTCH_DIR = Path(__file__).resolve().parents[2]  # book/pipeline
BOOK_DIR = DUTCH_DIR.parent
REPO_DIR = BOOK_DIR.parent  # the dutch-srs app
UPSTREAM_DIR = BOOK_DIR / "upstream"  # git submodule: hpmor-book/hpmor (English LaTeX, layout, fonts)
TEX_DIR = BOOK_DIR / "tex"
CHAPTERS_DIR = UPSTREAM_DIR / "chapters"
CHAPTERS_NL_DIR = TEX_DIR / "chapters-nl"
PDF_DIR = BOOK_DIR / "pdf"
BUILD_DIR = BOOK_DIR / "tmp" / "nl"
PROFILE_DIR = DUTCH_DIR / "profile"
MEMORY_DIR = DUTCH_DIR / "memory"
WORK_DIR = DUTCH_DIR / "work"
PROMPTS_DIR = DUTCH_DIR / "prompts"
EXPERIMENTS_DIR = DUTCH_DIR / "experiments"
DEFAULT_SRS_DIR = REPO_DIR


def chapter_file(n: int) -> Path:
    return CHAPTERS_DIR / f"hpmor-chapter-{n:03d}.tex"


def chapter_work_dir(n: int) -> Path:
    return WORK_DIR / f"ch{n:03d}"


def scene_dir(n: int) -> Path:
    return chapter_work_dir(n) / "scenes"


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def dump_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def load_yaml(path: Path) -> Any:
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def thresholds() -> dict:
    return load_yaml(PROFILE_DIR / "thresholds.yaml")


def exceptions() -> dict:
    return load_json(PROFILE_DIR / "exceptions.json")


def glossary() -> dict:
    path = MEMORY_DIR / "glossary.json"
    return load_json(path) if path.exists() else {"version": 1, "terms": []}


_WORD_RE = re.compile(r"[\w'’\-]+", re.UNICODE)


def word_count(text: str) -> int:
    return len([w for w in _WORD_RE.findall(text) if any(ch.isalnum() for ch in w)])


def parse_scene_ref(ref: str) -> tuple[int, str]:
    """'1/s02' or '1:s02' or 'ch001/s02' -> (1, 's02')."""
    m = re.match(r"^(?:ch)?0*(\d+)[/:](s\d+)$", ref.strip())
    if not m:
        raise SystemExit(f"bad scene ref {ref!r}; expected like 1/s02")
    return int(m.group(1)), m.group(2)
