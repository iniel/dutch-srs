import { useEffect, useState } from "react";
import type { Card, Enrichment, ProgressData } from "../types";
import type { CustomProgressTarget } from "../srs/schedule";
import { directionEnabled } from "../types";
import { cefrBadge } from "../srs/levels";
import { SrsStagePill } from "./SrsStagePill";
import { WordDetail } from "./WordDetail";
import { speak, pronounce, canPronounce } from "../util/speak";

interface WordCardProps {
  card: Card;
  enrichment?: Enrichment;
  progress: ProgressData;
  onBack: () => void;
  onLearnNow: (cardId: string) => void;
  onPin: (cardId: string) => void;
  onUnpin: (cardId: string) => void;
  onSetCustomProgress: (cardId: string, target: CustomProgressTarget) => void;
  onSearchWord?: (word: string) => void;
  /** Toggle the NL→EN direction for this word. `enabled` is the desired new state. */
  onToggleDirection?: (cardId: string, enabled: boolean) => void;
}

export function WordCard({ card, enrichment, progress, onBack, onLearnNow, onPin, onUnpin, onSetCustomProgress, onSearchWord, onToggleDirection }: WordCardProps) {
  const stage = progress.states[card.id]?.stage ?? 0;
  const pinned = progress.lessonQueue.includes(card.id);
  const [showCustomProgressSheet, setShowCustomProgressSheet] = useState(false);
  const nlEnEnabled = directionEnabled(progress.disabledDirections, card.id, "nl_en");
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
          {canPronounce(enrichment?.audioUrl) && (
            <button className="speak-btn" onClick={() => pronounce(card.dutch, enrichment?.audioUrl)} aria-label="pronounce">
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
              <button className="srs-action" onClick={() => setShowCustomProgressSheet(true)}>Custom progress</button>
              {pinned ? (
                <button className="srs-action" onClick={() => onUnpin(card.id)}>Remove from lessons</button>
              ) : (
                <button className="srs-action" onClick={() => onPin(card.id)}>Add to next lesson</button>
              )}
            </>
          ) : <SrsStagePill stage={stage} />}
        </div>
      </div>

      {onToggleDirection && (
        <div className="word-srs-row">
          <span className="word-srs-label">Dutch → English</span>
          <div className="word-srs-actions">
            {nlEnEnabled ? (
              <button className="srs-action" onClick={() => onToggleDirection(card.id, false)}>
                Remove question
              </button>
            ) : (
              <button className="srs-action primary" onClick={() => onToggleDirection(card.id, true)}>
                Enable question
              </button>
            )}
          </div>
        </div>
      )}

      {showCustomProgressSheet && stage === 0 && (
        <div className="sheet-backdrop" onClick={() => setShowCustomProgressSheet(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="sheet-title">Set custom progress?</h2>
            <p className="sheet-note">
              Don&apos;t cheat — only use this if you&apos;re certain you already know this word.
              It will be scheduled as if you had completed the selected stage.
            </p>
            <button
              type="button"
              className="sheet-action"
              onClick={() => {
                onSetCustomProgress(card.id, "guru");
                setShowCustomProgressSheet(false);
              }}
            >
              Guru I
            </button>
            <button
              type="button"
              className="sheet-action"
              onClick={() => {
                onSetCustomProgress(card.id, "master");
                setShowCustomProgressSheet(false);
              }}
            >
              Master
            </button>
            <button type="button" className="sheet-cancel" onClick={() => setShowCustomProgressSheet(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
