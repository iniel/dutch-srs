#!/bin/sh
# Build a single Dutch chapter PDF with xelatex (works locally with TeX Live, or inside hpmor-tex docker).
#   book/pipeline/tools/build-chapter.sh 1     -> book/pdf/hpmor-chapter-001-nl.pdf
# Runs from the repo root: our files come from book/tex, layout + fonts from the book/upstream submodule.
set -e
n="$1"
[ -n "$n" ] || { echo "usage: $0 <chapter>" >&2; exit 2; }
name=$(printf 'hpmor-chapter-%03d' "$n")
root=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$root"
[ -f "book/tex/chapters-nl/$name.tex" ] || { echo "book/tex/chapters-nl/$name.tex missing; run nl-assemble $n" >&2; exit 1; }
[ -f "book/upstream/layout/hp-book.sty" ] || { echo "book/upstream is empty; run: git submodule update --init" >&2; exit 1; }
out="book/tmp/nl"
mkdir -p "$out" book/pdf
# gitinfo2 (layout/hp-format.tex) reads .git/gitHeadInfo.gin; in a worktree .git is a file and it only warns
if [ -d .git ] && [ ! -f .git/gitHeadInfo.gin ]; then
  git config --global --add safe.directory "$root" 2>/dev/null || true
  sh book/upstream/post-checkout || true
fi
export TEXINPUTS=".:$root/book/tex:$root/book/upstream:"
export TEXFONTS="$root/book/upstream/fonts//:"
doc="\\RequirePackage[pdf]{layout/hp-book}\\input{layout/hp-nl}\\begin{document}\\setcounter{chapter}{$((n - 1))}\\input{chapters-nl/$name}\\end{document}"
tmo=""
command -v timeout >/dev/null 2>&1 && tmo="timeout 300"
for pass in 1 2; do
  $tmo xelatex -jobname="$name" -output-directory="$out" -interaction=nonstopmode -halt-on-error "$doc" > "$out/$name.build.log" 2>&1 || {
    tail -40 "$out/$name.build.log" >&2
    echo "xelatex failed (pass $pass); full log: $out/$name.log" >&2
    exit 1
  }
done
cp "$out/$name.pdf" "book/pdf/$name-nl.pdf"
echo "book/pdf/$name-nl.pdf"
