import { useState } from "react";
import type { Card, Enrichment } from "../types";
import type { Session } from "../review/session";
import { speak, speechSupported } from "../util/speak";
import { Quiz } from "../components/Quiz";
import { WordDetail } from "../components/WordDetail";

interface LessonsProps {
  session: Session;
  lessonCards: Card[];
  getCard: (id: string) => Card | undefined;
  getEnrichment?: (id: string) => Enrichment | undefined;
  onWordCleared: (cardId: string) => void;
  onComplete: () => void;
  onQuit: () => void;
}

export function Lessons({ session, lessonCards, getCard, getEnrichment, onWordCleared, onComplete, onQuit }: LessonsProps) {
  const [phase, setPhase] = useState<"info" | "quiz">("info");
  const [idx, setIdx] = useState(0);

  if (phase === "info") {
    const card = lessonCards[idx];
    const isLast = idx === lessonCards.length - 1;
    return (
      <div className="screen session-screen">
        <header className="topbar">
          <button className="icon-btn" onClick={onQuit} aria-label="quit">✕</button>
          <h1>Lesson {idx + 1}/{lessonCards.length}</h1>
          <span className="topbar-spacer" />
        </header>

        <div className="prompt-card lesson-info">
          <div className="prompt-label">{card.group} · {card.type}</div>
          <div className="prompt-text">
            {card.dutch}
            {speechSupported() && (
              <button
                type="button"
                className="speak-btn"
                onClick={() => speak(card.dutch)}
                aria-label="Pronounce Dutch word"
              >
                🔊
              </button>
            )}
          </div>
          <div className="lesson-meaning">{card.english.join(", ")}</div>
          {card.notes && <div className="feedback-notes">{card.notes}</div>}
        </div>

        <WordDetail enrichment={getEnrichment?.(card.id)} />

        <div className="lesson-nav">
          {idx > 0 && (
            <button className="btn" onClick={() => setIdx((i) => i - 1)}>Back</button>
          )}
          <button
            className="btn primary"
            onClick={() => (isLast ? setPhase("quiz") : setIdx((i) => i + 1))}
          >
            {isLast ? "Start quiz" : "Next"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen session-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onQuit} aria-label="quit">✕</button>
        <h1>Lesson quiz</h1>
        <span className="topbar-spacer" />
      </header>
      <Quiz
        session={session}
        getCard={getCard}
        getEnrichment={getEnrichment}
        onWordCleared={(cardId) => onWordCleared(cardId)}
        onComplete={onComplete}
      />
    </div>
  );
}
