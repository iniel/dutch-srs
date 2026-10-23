import { useEffect, useMemo, useRef, useState } from "react";
import type { CardIndex } from "../data/cards";
import { searchCards } from "../data/searchCards";

interface SearchProps {
  index: CardIndex;
  onOpen: (cardId: string) => void;
  onBack: () => void;
  initialQuery?: string;
}

export function Search({ index, onOpen, onBack, initialQuery }: SearchProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => searchCards(index.cards, query), [index.cards, query]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") onBack();
    else if (e.key === "Enter" && results.length > 0) onOpen(results[0].id);
  }

  return (
    <div className="screen search">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          placeholder="Search Dutch or English…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </header>

      <ul className="word-rows">
        {results.map((card) => (
          <li key={card.id}>
            <button className="word-row" onClick={() => onOpen(card.id)}>
              <span className="word-row-dutch">{card.dutch}</span>
              <span className="word-row-en">{card.english.join(", ")}</span>
              <span className="word-row-tag">{card.group}</span>
            </button>
          </li>
        ))}
        {query && results.length === 0 && <li className="word-empty">No matches.</li>}
      </ul>
    </div>
  );
}
