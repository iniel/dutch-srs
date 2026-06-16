import { useState } from "react";
import type { Card } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { Quiz } from "../components/Quiz";

interface LessonsProps {
  session: Session;
  lessonCards: Card[];
  getCard: (id: string) => Card | undefined;
  onCleared: (task: ReviewTask) => void;
  onComplete: () => void;
  onQuit: () => void;
}

export function Lessons({ session, lessonCards, getCard, onCleared, onComplete, onQuit }: LessonsProps) {
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
          <div className="prompt-text">{card.dutch}</div>
          <div className="lesson-meaning">{card.english.join(", ")}</div>
          {card.notes && <div className="feedback-notes">{card.notes}</div>}
        </div>

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
        onCleared={(task) => onCleared(task)}
        onComplete={onComplete}
      />
    </div>
  );
}
