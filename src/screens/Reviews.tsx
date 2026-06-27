import type { Card, Enrichment } from "../types";
import type { Session } from "../review/session";
import type { AnswerPools } from "../review/synonyms";
import { Quiz } from "../components/Quiz";

interface ReviewsProps {
  session: Session;
  getCard: (id: string) => Card | undefined;
  getEnrichment?: (id: string) => Enrichment | undefined;
  pools: AnswerPools;
  onWordCleared: (cardId: string, passed: boolean) => void;
  onComplete: () => void;
  onQuit: () => void;
}

export function Reviews({ session, getCard, getEnrichment, pools, onWordCleared, onComplete, onQuit }: ReviewsProps) {
  return (
    <div className="screen session-screen">
      <Quiz
        session={session}
        getCard={getCard}
        getEnrichment={getEnrichment}
        pools={pools}
        onWordCleared={onWordCleared}
        onComplete={onComplete}
        onQuit={onQuit}
      />
    </div>
  );
}
