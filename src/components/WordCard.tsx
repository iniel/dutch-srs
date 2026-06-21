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

  return (
    <div className="screen word-detail">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>{card.group}</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="word-hero">
        <div className="word-dutch">{card.dutch}</div>
        {speechSupported() && (
          <button className="icon-btn speak-btn" onClick={() => speak(card.dutch)} aria-label="pronounce">
            🔊
          </button>
        )}
      </div>

      <div className="word-english">{card.english.join(", ")}</div>

      {card.notes && <div className="word-notes">{card.notes}</div>}

      <WordDetail enrichment={enrichment} />

      <div className="word-srs">
        <div className="word-srs-row">
          <SrsStagePill stage={stage} />
        </div>
      </div>
    </div>
  );
}
