import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "../types";
import type { CardIndex } from "../data/cards";
import { normalize } from "../review/answerCheck";

interface SearchProps {
  index: CardIndex;
  onOpen: (cardId: string) => void;
  onBack: () => void;
  initialQuery?: string;
}

const MAX_RESULTS = 50;

function rankCard(card: Card, query: string): number {
  const dutch = normalize(card.dutch);
  const fields = [dutch, ...card.english.map(normalize)];
  if (card.lemma) fields.push(normalize(card.lemma));

  let best = Infinity;
  for (const f of fields) {
    if (f === query) best = Math.min(best, 0);
    else if (f.startsWith(query)) best = Math.min(best, 1);
    else if (f.includes(query)) best = Math.min(best, 2);
  }
  return best;
}

function search(cards: Card[], raw: string): Card[] {
  const query = normalize(raw);
  if (!query) return [];
  const scored: { card: Card; rank: number }[] = [];
  for (const card of cards) {
    const rank = rankCard(card, query);
    if (rank < Infinity) scored.push({ card, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.card.dutch.localeCompare(b.card.dutch));
  return scored.slice(0, MAX_RESULTS).map((s) => s.card);
}

export function Search({ index, onOpen, onBack, initialQuery }: SearchProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => search(index.cards, query), [index.cards, query]);

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
