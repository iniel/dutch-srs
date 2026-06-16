import type { Card } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { Quiz } from "../components/Quiz";

interface ReviewsProps {
  session: Session;
  getCard: (id: string) => Card | undefined;
  onCleared: (task: ReviewTask, everWrong: boolean) => void;
  onComplete: () => void;
  onQuit: () => void;
}

export function Reviews({ session, getCard, onCleared, onComplete, onQuit }: ReviewsProps) {
  return (
    <div className="screen session-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onQuit} aria-label="quit">✕</button>
        <h1>Reviews</h1>
        <span className="topbar-spacer" />
      </header>
      <Quiz session={session} getCard={getCard} onCleared={onCleared} onComplete={onComplete} />
    </div>
  );
}
