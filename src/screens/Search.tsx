import { useEffect, useMemo, useRef, useState } from "react";
import type { CardIndex } from "../data/cards";
import { buildSearchForms, searchCards } from "../data/searchCards";
import type { Grammar } from "../types";

interface SearchProps {
  index: CardIndex;
  onOpen: (cardId: string) => void;
  onBack: () => void;
  getGrammar: (cardId: string) => Grammar | undefined;
  initialQuery?: string;
}

export function Search({ index, onOpen, onBack, getGrammar, initialQuery }: SearchProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formsOf = useMemo(() => buildSearchForms(index.cards, getGrammar), [index.cards, getGrammar]);
  const results = useMemo(() => searchCards(index.cards, query, undefined, formsOf), [index.cards, query, formsOf]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") onBack();
    else if (e.key === "Enter" && results.length > 0) onOpen(results[0].card.id);
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
        {results.map(({ card, form }) => (
          <li key={card.id}>
            <button className="word-row" onClick={() => onOpen(card.id)}>
              <span className="word-row-dutch">
                {card.dutch}
                {form && <span className="word-row-form">{form}</span>}
              </span>
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
