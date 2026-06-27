import { useEffect } from "react";
import type { Card, Enrichment, ProgressData } from "../types";
import { cefrBadge } from "../srs/levels";
import { SrsStagePill } from "./SrsStagePill";
import { WordDetail } from "./WordDetail";
import { speak, speechSupported } from "../util/speak";

interface WordCardProps {
  card: Card;
  enrichment?: Enrichment;
  progress: ProgressData;
  onBack: () => void;
  onLearnNow: (cardId: string) => void;
  onPin: (cardId: string) => void;
  onUnpin: (cardId: string) => void;
  onSearchWord?: (word: string) => void;
}

export function WordCard({ card, enrichment, progress, onBack, onLearnNow, onPin, onUnpin, onSearchWord }: WordCardProps) {
  const stage = progress.states[card.id]?.stage ?? 0;
  const pinned = progress.lessonQueue.includes(card.id);
  const phon = [enrichment?.ipa, enrichment?.syllables].filter(Boolean).join(" · ");
  const cefr = cefrBadge(card);

  useEffect(() => {
    speak(card.dutch);
  }, [card.id]);

  return (
    <div className="screen word-detail">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Word</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="lesson-hero">
        <div className="lesson-eyebrow">
          {card.type} · {card.group}
          {cefr && <span className="cefr-badge">{cefr}</span>}
        </div>
        <div className="lesson-word">
          {card.dutch}
          {speechSupported() && (
            <button className="speak-btn" onClick={() => speak(card.dutch)} aria-label="pronounce">
              🔊
            </button>
          )}
        </div>
        <div className="lesson-meaning">{card.english.join(", ")}</div>
        {phon && <div className="lesson-phon">{phon}</div>}
        {card.notes && <div className="feedback-notes">{card.notes}</div>}
      </div>

      <hr className="hairline" />

      <WordDetail enrichment={enrichment} hidePhonetics onWordClick={onSearchWord} />

      <div className="word-srs-row">
        <span className="word-srs-label">Status</span>
        <div className="word-srs-actions">
          {stage === 0 ? (
            <>
              <button className="srs-action primary" onClick={() => onLearnNow(card.id)}>Learn now</button>
              {pinned ? (
                <button className="srs-action" onClick={() => onUnpin(card.id)}>Remove from lessons</button>
              ) : (
                <button className="srs-action" onClick={() => onPin(card.id)}>Add to next lesson</button>
              )}
            </>
          ) : <SrsStagePill stage={stage} />}
        </div>
      </div>
    </div>
  );
}
