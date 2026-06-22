import type { Card, Enrichment, ProgressData } from "../types";
import { SrsStagePill } from "./SrsStagePill";
import { WordDetail } from "./WordDetail";
import { speak, speechSupported } from "../util/speak";

interface WordCardProps {
  card: Card;
  enrichment?: Enrichment;
  progress: ProgressData;
  onBack: () => void;
}

export function WordCard({ card, enrichment, progress, onBack }: WordCardProps) {
  const stage = progress.states[card.id]?.stage ?? 0;
  const phon = [enrichment?.ipa, enrichment?.syllables].filter(Boolean).join(" · ");

  return (
    <div className="screen word-detail">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Word</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="lesson-hero">
        <div className="lesson-eyebrow">{card.type} · {card.group}</div>
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

      <WordDetail enrichment={enrichment} hidePhonetics />

      <div className="word-srs-row">
        <span className="word-srs-label">Status</span>
        <SrsStagePill stage={stage} />
      </div>
    </div>
  );
}
