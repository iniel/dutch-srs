import { SrsStagePill } from "./SrsStagePill";

interface LessonStatusActionsProps {
  cardId: string;
  stage: number;
  pinned: boolean;
  onLearnNow: (cardId: string) => void;
  onPin: (cardId: string) => void;
  onUnpin: (cardId: string) => void;
  onCustomProgress?: () => void;
}

export function LessonStatusActions({ cardId, stage, pinned, onLearnNow, onPin, onUnpin, onCustomProgress }: LessonStatusActionsProps) {
  if (stage > 0) return <SrsStagePill stage={stage} />;
  return (
    <>
      <button className="srs-action primary" onClick={() => onLearnNow(cardId)}>Learn now</button>
      {onCustomProgress && <button className="srs-action" onClick={onCustomProgress}>Custom progress</button>}
      {pinned ? (
        <button className="srs-action" onClick={() => onUnpin(cardId)}>Remove from lessons</button>
      ) : (
        <button className="srs-action" onClick={() => onPin(cardId)}>Add to next lesson</button>
      )}
    </>
  );
}
