import { useEffect, useRef, useState } from "react";
import type { Card } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { acceptedForDirection, checkAnswer } from "../review/answerCheck";
import { speak, speechSupported } from "../util/speak";
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
  const [revealed, setRevealed] = useState(false);
  const [, force] = useState(0);
  const wrongSet = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const task = session.current();

  useEffect(() => {
    setPhase("input");
    setValue("");
    setRevealed(false);
  }, [task?.key]);

  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase]);

  // Ref keeps the window keydown listener calling the current closure without re-binding.
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    session.submit(false);
    setPhase("input");
    setValue("");
    setRevealed(false);
    force((n) => n + 1);
    if (session.isComplete()) onComplete();
  };

  // A disabled input fires no keydown, so Enter-to-continue lives on the window.
  useEffect(() => {
    if (phase !== "wrong") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advanceRef.current();
      } else if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  if (!task) return null;
  const card = getCard(task.cardId);
  if (!card) return null;

  const prompt = task.dir === "nl_en" ? card.dutch : card.english.join(" / ");
  const accepted = acceptedForDirection(card, task.dir);

  function advanceAfterWrong() {
    advanceRef.current();
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
          <div className="feedback-title">Incorrect</div>
          {revealed ? (
            <>
              <div className="feedback-answer">
                {accepted.join(", ")}
                {task.dir === "en_nl" && speechSupported() && (
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
              {card.notes && <div className="feedback-notes">{card.notes}</div>}
            </>
          ) : (
            <button
              type="button"
              className="reveal-link"
              onClick={() => setRevealed(true)}
            >
              Show answer
            </button>
          )}
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
