import { useEffect, useRef, useState } from "react";
import type { Card, Enrichment } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { acceptedForDirection, checkAnswer } from "../review/answerCheck";
import { speak, speechSupported } from "../util/speak";
import { WordDetail } from "./WordDetail";

interface QuizProps {
  session: Session;
  getCard: (cardId: string) => Card | undefined;
  getEnrichment?: (cardId: string) => Enrichment | undefined;
  /** Fired once per word, when both its directions have cleared. */
  onWordCleared: (cardId: string, passed: boolean) => void;
  onComplete: () => void;
  onQuit: () => void;
}

type Phase = "input" | "wrong";

const dirLabel = (dir: ReviewTask["dir"]) =>
  dir === "nl_en" ? "Dutch → English" : "English → Dutch";

export function Quiz({ session, getCard, getEnrichment, onWordCleared, onComplete, onQuit }: QuizProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [revealed, setRevealed] = useState(false);
  const [flash, setFlash] = useState(false);
  const [, force] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const task = session.current();

  useEffect(() => {
    setPhase("input");
    setValue("");
    setRevealed(false);
    setFlash(false);
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
    // The Enter that revealed this wrong state is still bubbling when React flushes
    // this effect; arm on the next tick so that same press can't self-advance.
    let armed = false;
    const arm = setTimeout(() => (armed = true), 0);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!armed) return;
        e.preventDefault();
        advanceRef.current();
      } else if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      clearTimeout(arm);
      window.removeEventListener("keydown", handler);
    };
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
    if (flash) return;
    if (phase === "wrong") {
      advanceAfterWrong();
      return;
    }
    if (value.trim() === "") return;
    const { correct } = checkAnswer(value, accepted, task!.dir === "nl_en");
    if (correct) {
      // Let the green check flash before the next card replaces the input.
      setFlash(true);
      window.setTimeout(() => {
        const completion = session.submit(true);
        if (completion) onWordCleared(completion.cardId, completion.passed);
        setValue("");
        setFlash(false);
        force((n) => n + 1);
        if (session.isComplete()) onComplete();
      }, 350);
    } else {
      setPhase("wrong");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  const total = session.total();
  const pct = total === 0 ? 0 : Math.round((session.done() / total) * 100);

  return (
    <div className="quiz">
      <div className="quiz-prompt">
        <div className="quiz-progress" role="progressbar" aria-valuenow={pct}>
          <div className="quiz-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="quiz-top">
          <button className="quiz-quit" onClick={onQuit} aria-label="quit">✕</button>
          <div className="quiz-counters">
            <span className="quiz-correct">✓ {session.done()}</span>
            <span className="quiz-left">{session.remaining()} left</span>
          </div>
        </div>
        <div className="quiz-word">
          <div className="prompt-label">
            {dirLabel(task.dir)} · {card.type}
          </div>
          <div className="prompt-text">{prompt}</div>
          {task.dir === "nl_en" && speechSupported() && (
            <button
              type="button"
              className="quiz-speak"
              onClick={() => speak(card.dutch)}
              aria-label="Pronounce Dutch word"
            >
              🔊
            </button>
          )}
        </div>
      </div>

      <div className="quiz-answer">
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
                <WordDetail enrichment={getEnrichment?.(card.id)} compact />
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
          <>
            <div className="answer-field">
              <input
                ref={inputRef}
                className="answer-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Your response"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-label="answer"
              />
              <span className={`answer-check ${flash ? "correct" : ""}`} aria-hidden="true">✓</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
