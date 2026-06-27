import { useEffect, useRef, useState } from "react";
import type { Card, Enrichment } from "../types";
import type { ReviewTask, Session } from "../review/session";
import { checkAnswer } from "../review/answerCheck";
import { pooledAccepted, type AnswerPools } from "../review/synonyms";
import { getHint } from "../data/hints";
import { speak, speechSupported } from "../util/speak";

interface QuizProps {
  session: Session;
  getCard: (cardId: string) => Card | undefined;
  getEnrichment?: (cardId: string) => Enrichment | undefined;
  pools: AnswerPools;
  /** Fired once per word, when both its directions have cleared. */
  onWordCleared: (cardId: string, passed: boolean) => void;
  onComplete: () => void;
  onQuit: () => void;
}

type Phase = "input" | "wrong";

const dirLabel = (dir: ReviewTask["dir"]) =>
  dir === "nl_en" ? "Dutch → English" : "English → Dutch";

export function Quiz({ session, getCard, getEnrichment, pools, onWordCleared, onComplete, onQuit }: QuizProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [flash, setFlash] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [, force] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const task = session.current();

  useEffect(() => {
    setPhase("input");
    setValue("");
    setFlash(false);
    setShowHint(false);
  }, [task?.key]);

  useEffect(() => {
    if (!task || task.dir !== "nl_en") return;
    const c = getCard(task.cardId);
    if (c) speak(c.dutch);
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
  // Pooled across colliding cards for checking; the reveal shows only this card's
  // own answer so a synonym-heavy meaning doesn't dump dozens of words.
  const accepted = pooledAccepted(card, task.dir, pools);
  const reveal = task.dir === "nl_en" ? card.english : [card.dutch];

  // Disambiguation hint for colliding words. A hand-curated hint (src/data/hints.ts)
  // wins and is shown inline; otherwise fall back to a direction-safe example
  // sentence behind a button (NL→EN may show the Dutch example, EN→NL only the
  // English one so the Dutch answer isn't given away).
  const manualHint = getHint(card.id, task.dir);
  const enr = getEnrichment?.(card.id);
  const example =
    task.dir === "nl_en"
      ? card.exampleNl ?? enr?.examples?.find((e) => e.nl)?.nl
      : card.exampleEn ?? enr?.examples?.find((e) => e.en)?.en;

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
    // EN→NL prompts never speak on open; play the Dutch answer once submitted (right or wrong).
    if (task!.dir === "en_nl") speak(card!.dutch);
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

  const progressHeader = (
    <>
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
    </>
  );

  const wrong = phase === "wrong";

  return (
    <div className="quiz">
      <div className="quiz-prompt">
        {progressHeader}
        <div className="quiz-word">
          <div className="prompt-label">
            {dirLabel(task.dir)} · {card.type}
            {card.pos ? ` · ${card.pos}` : ""}
          </div>
          <div className="prompt-row">
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
          {!wrong && manualHint && <div className="quiz-hint manual">{manualHint}</div>}
          {!wrong && !manualHint && example && (
            showHint ? (
              <div className="quiz-hint" lang={task.dir === "nl_en" ? "nl" : "en"}>{example}</div>
            ) : (
              <button
                type="button"
                className="quiz-hint-btn"
                // Keep focus on the input so the mobile keyboard doesn't collapse.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowHint(true);
                  inputRef.current?.focus();
                }}
              >
                Show example
              </button>
            )
          )}
          {wrong && (
            <div className="quiz-reveal">
              {reveal.join(", ")}
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
          )}
        </div>
      </div>

      <div className={`quiz-answer ${wrong ? "wrong" : ""}`}>
        <div className="answer-field">
          <input
            ref={inputRef}
            className={`answer-input ${wrong ? "wrong" : ""}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={wrong}
            placeholder="Your response"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-label="answer"
          />
          {wrong ? (
            <button
              type="button"
              className="answer-next"
              onClick={advanceAfterWrong}
              aria-label="next"
            >
              →
            </button>
          ) : (
            <span className={`answer-check ${flash ? "correct" : ""}`} aria-hidden="true">✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
