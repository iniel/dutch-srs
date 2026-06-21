import type { Card, Enrichment } from "../types";
import type { Session } from "../review/session";
import { Quiz } from "../components/Quiz";

interface ReviewsProps {
  session: Session;
  getCard: (id: string) => Card | undefined;
  getEnrichment?: (id: string) => Enrichment | undefined;
  onWordCleared: (cardId: string, passed: boolean) => void;
  onComplete: () => void;
  onQuit: () => void;
}

export function Reviews({ session, getCard, getEnrichment, onWordCleared, onComplete, onQuit }: ReviewsProps) {
  return (
    <div className="screen session-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onQuit} aria-label="quit">✕</button>
        <h1>Reviews</h1>
        <span className="topbar-spacer" />
      </header>
      <Quiz session={session} getCard={getCard} getEnrichment={getEnrichment} onWordCleared={onWordCleared} onComplete={onComplete} />
    </div>
  );
}
