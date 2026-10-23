import type { BookDef } from "../reader/types";

interface BookChaptersProps {
  book: BookDef;
  currentChapter: number | null;
  onOpenChapter: (n: number) => void;
  onBack: () => void;
}

export function BookChapters({ book, currentChapter, onOpenChapter, onBack }: BookChaptersProps) {
  return (
    <div className="screen book-chapters">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>{book.title}</h1>
        <div className="topbar-actions" />
      </header>

      <div className="chapter-list">
        {book.chapters.map((c) => (
          <button
            key={c.n}
            className="level-summary chapter-row"
            onClick={() => onOpenChapter(c.n)}
            aria-label={`Hoofdstuk ${c.n}`}
          >
            <div className="level-meta">
              <strong>Hoofdstuk {c.n} · {c.title}</strong>
              <span>{c.titleEn ? `${c.titleEn} · ` : ""}{c.words} woorden</span>
              {c.n === currentChapter && <span className="chapter-current">Verder lezen</span>}
            </div>
            <span className="level-summary-chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
