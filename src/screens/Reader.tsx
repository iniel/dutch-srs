import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Enrichment, ProgressData } from "../types";
import type { CardIndex } from "../data/cards";
import type { BookChapter, BookChapterRef, BookDef, ReaderBlock } from "../reader/types";
import { isWordToken, tokenSpace } from "../reader/tokens";
import { WordSheet } from "../components/WordSheet";

interface ReaderProps {
  book: BookDef;
  chapterRef: BookChapterRef;
  chapter: BookChapter | null;
  error: string | null;
  index: CardIndex;
  progress: ProgressData;
  getEnrichment: (cardId: string) => Enrichment | undefined;
  initialBlockId: string | null;
  onPosition: (blockId: string) => void;
  onChapter: (n: number) => void;
  onBack: () => void;
  onLearnNow: (cardId: string) => void;
  onPin: (cardId: string) => void;
  onUnpin: (cardId: string) => void;
  onOpenFull: (cardId: string) => void;
}

interface Selection {
  block: number;
  token: number;
}

const TOPBAR_OFFSET = 64;

function renderTokens(block: ReaderBlock, active: number | null) {
  return (block.tokens ?? []).map((t, i) => {
    const sp = tokenSpace(t);
    const cls = [isWordToken(t) ? "rd-w" : "", t.em ? "rd-em" : "", i === active ? "active" : ""].filter(Boolean).join(" ");
    return (
      <Fragment key={i}>
        {cls ? (
          <span className={cls} data-t={isWordToken(t) ? i : undefined}>{t.w}</span>
        ) : (
          t.w
        )}
        {sp === "\n" ? <br /> : sp}
      </Fragment>
    );
  });
}

function blockClass(kind: ReaderBlock["kind"]): string {
  return kind === "quote" ? "rd-p rd-quote" : kind === "note" ? "rd-p rd-note" : "rd-p";
}

export function Reader({
  book,
  chapterRef,
  chapter,
  error,
  index,
  progress,
  getEnrichment,
  initialBlockId,
  onPosition,
  onChapter,
  onBack,
  onLearnNow,
  onPin,
  onUnpin,
  onOpenFull,
}: ReaderProps) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [shownEn, setShownEn] = useState<Set<string>>(() => new Set());
  const articleRef = useRef<HTMLElement>(null);
  const lastReported = useRef<string | null>(null);
  const restoredFor = useRef<string | null>(null);

  const chapterIdx = book.chapters.findIndex((c) => c.n === chapterRef.n);
  const prev = book.chapters[chapterIdx - 1];
  const next = book.chapters[chapterIdx + 1];

  useEffect(() => {
    setSel(null);
    setShownEn(new Set());
  }, [chapterRef.n]);

  useEffect(() => {
    if (!chapter || restoredFor.current === chapterRef.file) return;
    restoredFor.current = chapterRef.file;
    if (window.scrollY > 0) return;
    const el = initialBlockId ? document.getElementById(`rd-${initialBlockId}`) : null;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - TOPBAR_OFFSET);
  }, [chapter, chapterRef.file, initialBlockId]);

  useEffect(() => {
    if (!chapter) return;
    let frame = 0;
    const report = () => {
      frame = 0;
      const blocks = articleRef.current?.querySelectorAll<HTMLElement>("[data-b]") ?? [];
      for (const el of blocks) {
        if (el.getBoundingClientRect().bottom > TOPBAR_OFFSET) {
          const id = el.dataset.id!;
          if (id !== lastReported.current) {
            lastReported.current = id;
            onPosition(id);
          }
          return;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(report);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [chapter, onPosition]);

  useEffect(() => {
    if (!sel) return;
    const el = articleRef.current?.querySelector(`[data-b="${sel.block}"] [data-t="${sel.token}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight * 0.4 || rect.top < TOPBAR_OFFSET) {
      window.scrollBy({ top: rect.top - window.innerHeight * 0.22, behavior: "smooth" });
    }
  }, [sel]);

  const toggleEn = useCallback((blockId: string) => {
    setShownEn((prevSet) => {
      const nextSet = new Set(prevSet);
      if (nextSet.has(blockId)) nextSet.delete(blockId);
      else nextSet.add(blockId);
      return nextSet;
    });
  }, []);

  function onArticleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const blockEl = target.closest<HTMLElement>("[data-b]");
    const tokenEl = target.closest<HTMLElement>("[data-t]");
    if (blockEl && tokenEl) {
      setSel({ block: Number(blockEl.dataset.b), token: Number(tokenEl.dataset.t) });
    } else if (sel) {
      setSel(null);
    } else if (blockEl?.dataset.id) {
      toggleEn(blockEl.dataset.id);
    }
  }

  const article = useMemo(() => {
    if (!chapter) return null;
    return chapter.blocks.map((b, bi) => {
      if (b.kind === "break") return <hr key={b.id} className="rd-break" />;
      const active = sel?.block === bi ? sel.token : null;
      const body = renderTokens(b, active);
      return (
        <div key={b.id} id={`rd-${b.id}`} className="rd-block" data-b={bi} data-id={b.id}>
          {b.kind === "heading" ? <h2 className="rd-heading">{body}</h2> : <p className={blockClass(b.kind)}>{body}</p>}
          {shownEn.has(b.id) && b.en && <p className="rd-en">{b.en}</p>}
        </div>
      );
    });
  }, [chapter, sel, shownEn]);

  const selBlock = sel && chapter ? chapter.blocks[sel.block] : undefined;
  const selToken = selBlock?.tokens?.[sel!.token];
  const closeSheet = useCallback(() => setSel(null), []);

  return (
    <div className={`screen reader ${selToken ? "sheet-open" : ""}`}>
      <header className="topbar reader-topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Hoofdstuk {chapterRef.n}</h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => prev && onChapter(prev.n)} disabled={!prev} aria-label="previous chapter">‹‹</button>
          <button className="icon-btn" onClick={() => next && onChapter(next.n)} disabled={!next} aria-label="next chapter">››</button>
        </div>
      </header>

      {error && <p className="word-empty">Could not load this chapter: {error}</p>}
      {!chapter && !error && <p className="word-empty">Loading…</p>}

      <article ref={articleRef} className="rd-article" lang="nl" onClick={onArticleClick}>
        {article}
      </article>

      {chapter && (
        <footer className="rd-foot">
          <span>{chapter.words} words · tap a word to look it up, tap elsewhere for the English</span>
          {next && (
            <button className="btn primary block" onClick={() => onChapter(next.n)}>
              Hoofdstuk {next.n} ›
            </button>
          )}
        </footer>
      )}

      {selToken && selBlock && (
        <WordSheet
          key={`${chapterRef.n}:${sel!.block}:${sel!.token}`}
          token={selToken}
          index={index}
          progress={progress}
          getEnrichment={getEnrichment}
          onLearnNow={onLearnNow}
          onPin={onPin}
          onUnpin={onUnpin}
          onOpenFull={onOpenFull}
          paragraphShown={shownEn.has(selBlock.id)}
          onToggleParagraph={() => toggleEn(selBlock.id)}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
