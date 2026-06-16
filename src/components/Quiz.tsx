import { useEffect, useRef, useState } from "react";
import type { Card } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { acceptedForDirection, checkAnswer } from "../review/answerCheck";
import { ProgressBar } from "./ProgressBar";

interface QuizProps {
  session: Session;
  getCard: (cardId: string) => Card | undefined;
  /** Fired when a task leaves the queue (answered correctly). */
  onCleared: (task: ReviewTask, everWrong: boolean) => void;
  onComplete: () => void;
}

type Phase = "input" | "wrong";

const dirLabel = (dir: ReviewTask["dir"]) =>
  dir === "nl_en" ? "Dutch → English" : "English → Dutch";

export function Quiz({ session, getCard, onCleared, onComplete }: QuizProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [, force] = useState(0);
  const wrongSet = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const task = session.current();

  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase, task?.key]);

  // A disabled input fires no keydown, so Enter-to-continue lives on the window.
  useEffect(() => {
    if (phase !== "wrong") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advanceAfterWrong();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!task) return null;
  const card = getCard(task.cardId);
  if (!card) return null;

  const prompt = task.dir === "nl_en" ? card.dutch : card.english.join(" / ");
  const accepted = acceptedForDirection(card, task.dir);

  function advanceAfterWrong() {
    session.submit(false);
    setPhase("input");
    setValue("");
    force((n) => n + 1);
    if (session.isComplete()) onComplete();
  }

  function submit() {
    if (phase === "wrong") {
      advanceAfterWrong();
      return;
    }
    if (value.trim() === "") return;
    const { correct } = checkAnswer(value, accepted);
    if (correct) {
      const everWrong = wrongSet.current.has(task!.key);
      session.submit(true);
      onCleared(task!, everWrong);
      setValue("");
      force((n) => n + 1);
      if (session.isComplete()) onComplete();
    } else {
      wrongSet.current.add(task!.key);
      setPhase("wrong");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="quiz">
      <ProgressBar done={session.done()} total={session.total()} />
      <div className="quiz-counters">
        <span>{session.done()} done</span>
        <span>{session.remaining()} left</span>
      </div>

      <div className="prompt-card">
        <div className="prompt-label">
          {dirLabel(task.dir)} · {card.type}
        </div>
        <div className="prompt-text">{prompt}</div>
      </div>

      <input
        ref={inputRef}
        className={`answer-input ${phase === "wrong" ? "wrong" : ""}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={phase === "wrong"}
        placeholder={task.dir === "nl_en" ? "English meaning" : "Dutch word"}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-label="answer"
      />

      {phase === "wrong" ? (
        <div className="feedback wrong-feedback">
          <div className="feedback-title">Correct answer</div>
          <div className="feedback-answer">{accepted.join(", ")}</div>
          {card.notes && <div className="feedback-notes">{card.notes}</div>}
          <button className="btn primary" onClick={advanceAfterWrong}>
            Continue (Enter)
          </button>
        </div>
      ) : (
        <button className="btn primary" onClick={submit}>
          Submit (Enter)
        </button>
      )}
    </div>
  );
}
