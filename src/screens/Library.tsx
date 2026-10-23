import type { BookDef } from "../reader/types";

interface LibraryProps {
  books: BookDef[];
  onOpenBook: (bookId: string) => void;
  onBack: () => void;
}

export function Library({ books, onOpenBook, onBack }: LibraryProps) {
  return (
    <div className="screen library">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Lezen</h1>
        <div className="topbar-actions" />
      </header>

      <div className="chapter-list">
        {books.map((b) => (
          <button key={b.id} className="level-summary" onClick={() => onOpenBook(b.id)} aria-label={b.title}>
            <div className="level-meta">
              <strong>{b.title}</strong>
              <span>{b.chapters.length} {b.chapters.length === 1 ? "hoofdstuk" : "hoofdstukken"}</span>
            </div>
            <span className="level-summary-chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
