"""Minimal parser for the HPMOR chapter LaTeX dialect.

The chapters use a small, stable set of macros (see layout/hp-markup.tex). We do
not need a full TeX parser: we split a chapter into *blocks* (paragraphs,
headings, structural commands, environment delimiters) and keep the raw TeX of
every block so the chapter can be re-assembled byte-for-byte around translated
paragraphs.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

HEADING_CMDS = (
    "chapter",
    "partchapter",
    "namedpartchapter",
    "section",
    "latersection",
    "OmakeIVsection",
    "OmakeIVspecialsection",
)
BREAK_CMDS = ("later",)
STRUCT_CMDS = (
    "hplettrineextrapara",
    "vspace",
    "vspace*",
    "vskip",
    "noindent",
    "clearpage",
    "settowidth",
    "newpage",
    "pagebreak",
    "nopagebreak",
    "bigskip",
    "medskip",
    "smallskip",
    "centering",
    "par",
    "setlength",
    "hfill",
    "newsavebox",
    "savebox",
    "usebox",
)
NOTE_CMDS = ("authorsnotetext",)
NO_TRANSLATE_ENVS = {"chapterOpeningAuthorNote"}

_STRUCT_LINE_RE = re.compile(
    r"^\\(" + "|".join(re.escape(c) for c in HEADING_CMDS + BREAK_CMDS + STRUCT_CMDS + NOTE_CMDS) + r")(?![A-Za-z])"
)
_ENV_RE = re.compile(r"^\\(begin|end)\{([A-Za-z*]+)\}(.*)$")


@dataclass
class Block:
    id: str
    kind: str  # para | heading | later | env_begin | env_end | cmd | comment | blank
    tex: str
    text: str = ""
    env: str | None = None
    envs: list[str] = field(default_factory=list)
    translate: bool = False
    line: int = 0
    dialogue: bool = False
    gap_before: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


def _brace_depth(s: str) -> int:
    depth = 0
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == "\\" and i + 1 < len(s):
            i += 2
            continue
        if ch == "%":
            break
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    return depth


def _group_lines(lines: list[str]) -> list[tuple[int, list[str]]]:
    """Group consecutive non-blank lines; returns (start_line, lines)."""
    groups: list[tuple[int, list[str]]] = []
    cur: list[str] = []
    start = 0
    for i, raw in enumerate(lines):
        line = raw.rstrip("\n")
        if line.strip() == "":
            if cur:
                groups.append((start, cur))
                cur = []
            continue
        if not cur:
            start = i
        cur.append(line)
    if cur:
        groups.append((start, cur))
    return groups


def _split_structural(start: int, lines: list[str]) -> list[tuple[int, str, list[str]]]:
    """Within a group, separate structural lines from paragraph text.

    Returns a list of (line_no, kind_hint, lines) where kind_hint is one of
    'struct' | 'env' | 'comment' | 'text'. Multi-line macros are kept together by
    brace balancing.
    """
    out: list[tuple[int, str, list[str]]] = []
    i = 0
    text_buf: list[str] = []
    text_start = start

    def flush_text() -> None:
        nonlocal text_buf
        if text_buf:
            out.append((text_start, "text", text_buf))
            text_buf = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("%"):
            flush_text()
            out.append((start + i, "comment", [line]))
            i += 1
            continue
        if _ENV_RE.match(stripped):
            flush_text()
            out.append((start + i, "env", [line]))
            i += 1
            continue
        if _STRUCT_LINE_RE.match(stripped):
            flush_text()
            buf = [line]
            depth = _brace_depth(line)
            j = i + 1
            while depth > 0 and j < len(lines):
                buf.append(lines[j])
                depth += _brace_depth(lines[j])
                j += 1
            out.append((start + i, "struct", buf))
            i = j
            continue
        if not text_buf:
            text_start = start + i
        text_buf.append(line)
        i += 1
    flush_text()
    return out


def parse_chapter(src: str) -> list[Block]:
    lines = src.splitlines()
    blocks: list[Block] = []
    env_stack: list[str] = []
    n = 0

    def new_block(kind: str, tex: str, line: int) -> Block:
        nonlocal n
        n += 1
        b = Block(id=f"b{n:03d}", kind=kind, tex=tex, line=line + 1)
        b.env = env_stack[-1] if env_stack else None
        b.envs = list(env_stack)
        return b

    for gstart, glines in _group_lines(lines):
        first_in_group = True
        for lno, hint, blines in _split_structural(gstart, glines):
            tex = "\n".join(blines)
            before = len(blocks)
            _append_block(blocks, new_block, env_stack, tex, hint, lno)
            for b in blocks[before:]:
                b.gap_before = first_in_group
                first_in_group = False
    return blocks


def _append_block(blocks: list[Block], new_block, env_stack: list[str], tex: str, hint: str, lno: int) -> None:
    if hint == "comment":
        blocks.append(new_block("comment", tex, lno))
        return
    if hint == "env":
        m = _ENV_RE.match(tex.strip())
        assert m
        which, name, rest = m.group(1), m.group(2), m.group(3)
        if which == "begin":
            # keep environment arguments ({rl}, [\versewidth], [1.]) with the \begin line
            arg_m = re.match(r"^((?:\s*(?:\{[^{}]*\}|\[[^\[\]]*\]))*)(.*)$", rest)
            args_part, rest = (arg_m.group(1), arg_m.group(2)) if arg_m else ("", rest)
            head = f"\\begin{{{name}}}{args_part}"
            b = new_block("env_begin", head + (rest if not rest.strip() or rest.strip().startswith("%") else ""), lno)
            env_stack.append(name)
            blocks.append(b)
            if rest.strip() and not rest.strip().startswith("%"):
                # text on the same line as \begin{...}: treat as paragraph
                pb = new_block("para", rest.strip(), lno)
                pb.text = tex_to_text(rest)
                pb.translate = name not in NO_TRANSLATE_ENVS
                blocks.append(pb)
        else:
            if env_stack and env_stack[-1] == name:
                env_stack.pop()
            blocks.append(new_block("env_end", tex, lno))
        return
    if hint == "struct":
        m = re.match(r"^\\([A-Za-z]+\*?)", tex.strip())
        cmd = m.group(1) if m else ""
        if cmd in HEADING_CMDS:
            b = new_block("heading", tex, lno)
            b.text = heading_text(tex)
            b.translate = True
        elif cmd in BREAK_CMDS:
            b = new_block("later", tex, lno)
        else:
            b = new_block("cmd", tex, lno)
        blocks.append(b)
        return
    b = new_block("para", tex, lno)
    b.text = tex_to_text(tex)
    b.translate = not any(e in NO_TRANSLATE_ENVS for e in env_stack) and bool(b.text.strip())
    b.dialogue = b.text.lstrip().startswith(("“", "‘", '"'))
    blocks.append(b)


# --- heading helpers -------------------------------------------------------

def _args(tex: str) -> list[str]:
    """Return top-level {…} arguments of the first macro in tex (ignores [..])."""
    args: list[str] = []
    i = tex.find("{")
    while i != -1 and i < len(tex):
        depth = 0
        j = i
        while j < len(tex):
            if tex[j] == "\\":
                j += 2
                continue
            if tex[j] == "{":
                depth += 1
            elif tex[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        args.append(tex[i + 1 : j])
        # skip whitespace and optional [..]
        k = j + 1
        while k < len(tex) and tex[k] in " \t\n":
            k += 1
        if k < len(tex) and tex[k] == "[":
            close = tex.find("]", k)
            k = close + 1 if close != -1 else k
        i = k if k < len(tex) and tex[k] == "{" else -1
    return args


def heading_text(tex: str) -> str:
    m = re.match(r"^\\([A-Za-z]+)", tex.strip())
    cmd = m.group(1) if m else ""
    args = _args(tex)
    if not args:
        return ""
    if cmd == "namedpartchapter" and len(args) >= 4:
        return f"{tex_to_text(args[0])}, {args[2]}: {tex_to_text(args[3])}"
    if cmd == "partchapter" and len(args) >= 2:
        return f"{tex_to_text(args[0])}, {args[1]}"
    return tex_to_text(args[0])


# --- TeX -> plain text -----------------------------------------------------

_DROP_WITH_ARG = (
    "authorsnotetext",
    "label",
    "index",
    "vspace",
    "vspace*",
    "hspace",
    "settowidth",
    "fontspec",
    "setlength",
    "pagebreak",
    "nopagebreak",
    "penalty",
)
_DROP_NO_ARG = (
    "authorsnotefootnotemark",
    "hplettrineextrapara",
    "noindent",
    "protect",
    "par",
    "clearpage",
    "newpage",
    "centering",
    "itshape",
    "upshape",
    "scshape",
    "bfseries",
    "small",
    "scriptsize",
    "footnotesize",
    "large",
    "Large",
    "hfill",
    "relax",
    "later",
    "MakeUppercase",
)
_REPLACE_NO_ARG = {
    "am": " a.m.",
    "pm": " p.m.",
    "SPHEW": "SPHEW",
    "ldots": "…",
    "dots": "…",
    "textellipsis": "…",
    "Star": "*",
}
_INNER_RE = re.compile(r"\\([A-Za-z]+\*?)\s*(\[[^\[\]]*\])?\{([^{}]*)\}")
_TOKEN_RE = re.compile(r"\\([A-Za-z]+)(\{\})?")


def _strip_inner(m: re.Match) -> str:
    cmd, _opt, arg = m.group(1), m.group(2), m.group(3)
    if cmd in _DROP_WITH_ARG:
        return ""
    if cmd in ("lettrine", "lettrinepara"):
        ante = ""
        if _opt:
            am = re.search(r"ante=([^,\]]*)", _opt)
            ante = am.group(1) if am else ""
        return ante + arg  # first letter; the rest follows as a second brace group
    if cmd == "letterClosing":
        opt = (_opt or "")[1:-1]
        return (opt + " " if opt else "") + arg
    if cmd == "chapter" and _opt:
        return arg
    if cmd in ("parsel", "parsela", "parselb"):
        return arg
    return arg


def tex_to_text(tex: str) -> str:
    s = tex
    s = re.sub(r"(?<!\\)%.*$", "", s, flags=re.MULTILINE)
    s = s.replace("\\\\", "\n")
    s = s.replace("\\@", "").replace("\\-", "").replace("\\,", " ").replace("\\ ", " ")
    s = re.sub(r"\\hyp\{\}", "", s)
    s = re.sub(r"\\hyp(?![A-Za-z])", "", s)
    # peel macros from the inside out
    for _ in range(12):
        new = _INNER_RE.sub(_strip_inner, s)
        if new == s:
            break
        s = new
    def _tok(m: re.Match) -> str:
        cmd = m.group(1)
        if cmd in _REPLACE_NO_ARG:
            return _REPLACE_NO_ARG[cmd]
        if cmd in _DROP_NO_ARG:
            return ""
        return ""

    s = _TOKEN_RE.sub(_tok, s)
    s = s.replace("~", " ")
    for a, b in (("\\$", "$"), ("\\%", "%"), ("\\&", "&"), ("\\#", "#"), ("\\_", "_"), ("\\{", "{"), ("\\}", "}")):
        s = s.replace(a, b)
    s = s.replace("---", "—").replace("--", "–")
    s = s.replace("{", "").replace("}", "")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    return s.strip()


def macro_names(tex: str) -> list[str]:
    return re.findall(r"\\([A-Za-z]+\*?)", tex)
