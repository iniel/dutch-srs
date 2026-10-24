import type { BookDef } from "../reader/types";

export interface LibraryText {
  bookId: string;
  title: string;
  words: number;
}

interface LibraryProps {
  books: BookDef[];
  texts: LibraryText[];
  onOpenBook: (bookId: string) => void;
  onAddText: () => void;
  onDeleteText: (bookId: string) => void;
  onBack: () => void;
}

export function Library({ books, texts, onOpenBook, onAddText, onDeleteText, onBack }: LibraryProps) {
  return (
    <div className="screen library">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Lezen</h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={onAddText} aria-label="add text">＋</button>
        </div>
      </header>

      <div className="chapter-list">
        {books.map((b) => (
          <button key={b.id} className="level-summary" onClick={() => onOpenBook(b.id)} aria-label={b.title}>
            <div className="level-meta">
              <strong>{b.title}</strong>
              <span>{b.chapters.length === 1 ? `${b.chapters[0].words} woorden` : `${b.chapters.length} hoofdstukken`}</span>
            </div>
            <span className="level-summary-chevron">›</span>
          </button>
        ))}
        {texts.map((t) => (
          <div key={t.bookId} className="level-summary user-text-row">
            <button className="user-text-open" onClick={() => onOpenBook(t.bookId)} aria-label={t.title}>
              <div className="level-meta">
                <strong>{t.title}</strong>
                <span>Eigen tekst · {t.words} woorden</span>
              </div>
            </button>
            <button
              className="icon-btn"
              onClick={() => window.confirm(`“${t.title}” verwijderen?`) && onDeleteText(t.bookId)}
              aria-label={`delete ${t.title}`}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
