import type { Card, ProgressData } from "../types";
import { itemKey } from "../types";
import { SrsStagePill } from "./SrsStagePill";
import { speak, speechSupported } from "../util/speak";

interface WordCardProps {
  card: Card;
  progress: ProgressData;
  onBack: () => void;
}

export function WordCard({ card, progress, onBack }: WordCardProps) {
  const nlEn = progress.states[itemKey(card.id, "nl_en")]?.stage ?? 0;
  const enNl = progress.states[itemKey(card.id, "en_nl")]?.stage ?? 0;

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

      <div className="word-srs">
        <div className="word-srs-row">
          <span className="word-srs-dir">NL → EN</span>
          <SrsStagePill stage={nlEn} />
        </div>
        <div className="word-srs-row">
          <span className="word-srs-dir">EN → NL</span>
          <SrsStagePill stage={enNl} />
        </div>
      </div>
    </div>
  );
}
