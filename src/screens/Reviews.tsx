import type { Card, Enrichment } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { Quiz, type QuizQuestion } from "../components/Quiz";

interface ReviewsProps {
  session: Session;
  getCard: (id: string) => Card | undefined;
  getEnrichment?: (id: string) => Enrichment | undefined;
  onWordCleared: (cardId: string, passed: boolean) => void;
  previewLevelUp?: (cardId: string, passed: boolean) => number | undefined;
  onComplete: () => void;
  onQuit: () => void;
  onRemoveDirection?: (cardId: string) => void;
  question?: (task: ReviewTask, card: Card) => QuizQuestion;
}

export function Reviews({ session, getCard, getEnrichment, onWordCleared, previewLevelUp, onComplete, onQuit, onRemoveDirection, question }: ReviewsProps) {
  return (
    <div className="screen session-screen">
      <Quiz
        session={session}
        getCard={getCard}
        getEnrichment={getEnrichment}
        onWordCleared={onWordCleared}
        previewLevelUp={previewLevelUp}
        onComplete={onComplete}
        onQuit={onQuit}
        onRemoveDirection={onRemoveDirection}
        question={question}
      />
    </div>
  );
}
