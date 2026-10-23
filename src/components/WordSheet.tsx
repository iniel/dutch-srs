import { useEffect, useMemo, useState } from "react";
import type { Enrichment, ProgressData } from "../types";
import type { CardIndex } from "../data/cards";
import type { ReaderToken } from "../reader/types";
import { searchCards } from "../data/searchCards";
import { smartSearchQuery, tokenCardIds, tokenLemma } from "../reader/tokens";
import { cefrBadge } from "../srs/levels";
import { canPronounce, pronounce } from "../util/speak";
import { LessonStatusActions } from "./LessonStatusActions";
import { WordDetail } from "./WordDetail";
import { PathChips } from "./PathChips";
import type { PathMembership } from "../paths/engine";

const SHEET_RESULTS = 8;

/** Height of the iOS keyboard over the layout viewport, so the docked sheet can sit above it. */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);
  return inset;
}

interface WordSheetProps {
  token: ReaderToken;
  index: CardIndex;
  progress: ProgressData;
  getEnrichment: (cardId: string) => Enrichment | undefined;
  getPaths: (cardId: string) => PathMembership[];
  onLearnNow: (cardId: string) => void;
  onPin: (cardId: string) => void;
  onUnpin: (cardId: string) => void;
  onOpenFull: (cardId: string) => void;
  paragraphShown: boolean;
  onToggleParagraph: () => void;
  onClose: () => void;
}

export function WordSheet({
  token,
  index,
  progress,
  getEnrichment,
  getPaths,
  onLearnNow,
  onPin,
  onUnpin,
  onOpenFull,
  paragraphShown,
  onToggleParagraph,
  onClose,
}: WordSheetProps) {
  const candidates = useMemo(() => tokenCardIds(token, index), [token, index]);
  const isName = token.status === "name" || token.status === "number";
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0] ?? null);
  const [searching, setSearching] = useState(candidates.length === 0 && !isName);
  const [focusSearch, setFocusSearch] = useState(false);
  const [query, setQuery] = useState(() =>
    smartSearchQuery(token, (q) => searchCards(index.cards, q, 1).length > 0),
  );
  const results = useMemo(
    () => (searching ? searchCards(index.cards, query, SHEET_RESULTS) : []),
    [searching, index.cards, query],
  );
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const card = selectedId ? index.byId.get(selectedId) : undefined;
  const others = candidates.filter((id) => id !== selectedId);
  const enrichment = card ? getEnrichment(card.id) : undefined;
  const cefr = card ? cefrBadge(card) : undefined;
  const lemma = tokenLemma(token);
  const showLemma = !lemma.includes("+") && lemma.toLowerCase() !== token.w.toLowerCase();

  function pick(id: string) {
    setSelectedId(id);
    setSearching(false);
  }

  return (
    <div
      className="bottom-sheet word-sheet"
      role="dialog"
      aria-label={`Word: ${token.w}`}
      style={keyboardInset ? { bottom: keyboardInset, maxHeight: `calc(100vh - ${keyboardInset + 48}px)` } : undefined}
    >
      <div className="ws-head">
        <div className="ws-surface">
          {token.w}
          {showLemma && <span className="ws-lemma">→ {lemma}</span>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="close">✕</button>
      </div>
      {token.gloss && <div className="ws-gloss">{token.gloss}</div>}
      {isName && candidates.length === 0 && !searching && <div className="ws-gloss">Name — not a vocabulary word.</div>}
      {!searching && others.length > 0 && (
        <div className="relation-chips ws-others">
          <span className="relation-label">Also</span>
          {others.map((id) => {
            const c = index.byId.get(id)!;
            return (
              <button key={id} type="button" className="relation-chip" onClick={() => pick(id)}>
                {c.dutch} · {c.english[0]}
              </button>
            );
          })}
        </div>
      )}

      <div className="ws-body">
        {searching ? (
          <div className="ws-search">
            <input
              className="search-input"
              type="search"
              autoFocus={focusSearch}
              placeholder="Search Dutch or English…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && results[0] && pick(results[0].id)}
            />
            <ul className="word-rows">
              {results.map((c) => (
                <li key={c.id}>
                  <button className="word-row" onClick={() => pick(c.id)}>
                    <span className="word-row-dutch">{c.dutch}</span>
                    <span className="word-row-en">{c.english.join(", ")}</span>
                  </button>
                </li>
              ))}
              {query.trim() && results.length === 0 && <li className="word-empty">No matches.</li>}
            </ul>
          </div>
        ) : card ? (
          <div className="ws-card">
            <div className="ws-card-head">
              <span className="ws-dutch">{card.dutch}</span>
              {canPronounce(enrichment?.audioUrl) && (
                <button className="speak-btn" onClick={() => pronounce(card.dutch, enrichment?.audioUrl)} aria-label="pronounce">
                  🔊
                </button>
              )}
              {cefr && <span className="cefr-badge">{cefr}</span>}
            </div>
            <div className="ws-en">{card.english.join(", ")}</div>
            <PathChips paths={getPaths(card.id)} />
            <div className="word-srs-actions ws-actions">
              <LessonStatusActions
                cardId={card.id}
                stage={progress.states[card.id]?.stage ?? 0}
                pinned={progress.lessonQueue.includes(card.id)}
                onLearnNow={onLearnNow}
                onPin={onPin}
                onUnpin={onUnpin}
              />
              <button className="srs-action" onClick={() => onOpenFull(card.id)}>Open card</button>
            </div>
            <WordDetail enrichment={enrichment} compact hidePhonetics />
          </div>
        ) : null}
      </div>

      <div className="ws-foot">
        {searching ? (
          card && <button className="sheet-cancel" onClick={() => setSearching(false)}>Back to card</button>
        ) : (
          <button
            className="sheet-cancel"
            onClick={() => {
              setFocusSearch(true);
              setSearching(true);
            }}
          >
            {card ? "Not this word? Search" : "Search the deck"}
          </button>
        )}
        <button className="sheet-cancel" onClick={onToggleParagraph}>
          {paragraphShown ? "Hide translation" : "Translate paragraph"}
        </button>
      </div>
    </div>
  );
}
