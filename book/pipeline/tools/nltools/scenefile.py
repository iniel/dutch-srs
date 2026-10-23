"""Read/write the translator's scene file (sNN.vN.nl.md).

Format:

    # ch001 s01 v1

    ## b001
    \\chapter{Een dag met een heel kleine kans}

    ## b010
    “Je maakt een grapje,” zei Michael tegen Petunia. …

    ## @glosses
    - perkament: parchment

    ## @notes
    - Petunia uses "je" with Michael.

Block bodies are LaTeX (same macros as the source). Glosses in the body are written
as \\gl{woord}{english}; the @glosses list is informational.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .texparse import tex_to_text

_HEAD_RE = re.compile(r"^#\s*ch0*(\d+)\s+(s\d+)\s+v(\d+)\s*$")
_BLOCK_RE = re.compile(r"^##\s+(@?[A-Za-z0-9_-]+)\s*$")
_GL_RE = re.compile(r"\\gl\{([^{}]*)\}\{([^{}]*)\}")


@dataclass
class SceneFile:
    chapter: int
    scene: str
    version: int
    blocks: dict[str, str] = field(default_factory=dict)  # block id -> LaTeX
    glosses: list[tuple[str, str]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    path: Path | None = None

    def plain(self, block_id: str) -> str:
        return tex_to_text(strip_gloss(self.blocks[block_id]))

    def inline_glosses(self) -> dict[str, list[tuple[str, str]]]:
        return {bid: _GL_RE.findall(tex) for bid, tex in self.blocks.items()}


def strip_gloss(tex: str) -> str:
    return _GL_RE.sub(lambda m: m.group(1), tex)


def parse_scene_file(text: str, path: Path | None = None) -> SceneFile:
    lines = text.splitlines()
    chapter = scene = version = None
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines):
        m = _HEAD_RE.match(lines[i].strip())
        if m:
            chapter, scene, version = int(m.group(1)), m.group(2), int(m.group(3))
            i += 1
    if chapter is None:
        raise ValueError(f"{path or '<text>'}: first line must be like '# ch001 s01 v1'")
    sf = SceneFile(chapter=chapter, scene=scene, version=version, path=path)
    cur: str | None = None
    buf: list[str] = []

    def flush() -> None:
        if cur is None:
            return
        body = "\n".join(buf).strip("\n")
        if cur == "@glosses":
            for ln in body.splitlines():
                ln = ln.strip().lstrip("-*•").strip()
                if ":" in ln:
                    w, g = ln.split(":", 1)
                    sf.glosses.append((w.strip(), g.strip()))
        elif cur == "@notes":
            sf.notes.extend(ln.strip().lstrip("-*•").strip() for ln in body.splitlines() if ln.strip())
        elif cur.startswith("@"):
            pass
        else:
            sf.blocks[cur] = body.strip()

    for ln in lines[i:]:
        m = _BLOCK_RE.match(ln.strip())
        if m:
            flush()
            cur = m.group(1)
            buf = []
        else:
            buf.append(ln)
    flush()
    return sf


def read_scene_file(path: Path) -> SceneFile:
    return parse_scene_file(path.read_text(encoding="utf-8"), path)


def render_scene_file(sf: SceneFile) -> str:
    out = [f"# ch{sf.chapter:03d} {sf.scene} v{sf.version}", ""]
    for bid, tex in sf.blocks.items():
        out += [f"## {bid}", tex.strip(), ""]
    if sf.glosses:
        out += ["## @glosses"] + [f"- {w}: {g}" for w, g in sf.glosses] + [""]
    if sf.notes:
        out += ["## @notes"] + [f"- {n}" for n in sf.notes] + [""]
    return "\n".join(out).rstrip("\n") + "\n"


def latest_version(scene_dir: Path, scene: str) -> tuple[int, Path] | None:
    best: tuple[int, Path] | None = None
    for p in scene_dir.glob(f"{scene}.v*.nl.md"):
        m = re.search(r"\.v(\d+)\.nl\.md$", p.name)
        if m:
            v = int(m.group(1))
            if best is None or v > best[0]:
                best = (v, p)
    return best
