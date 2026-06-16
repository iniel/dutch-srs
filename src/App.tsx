import { useEffect, useMemo, useState } from "react";
import type { ProgressData } from "./types";
import { itemKey, DIRECTIONS } from "./types";
import { loadProgress, saveProgress, setState } from "./storage/progress";
import { newLessonState, startLesson, answerCorrect, answerIncorrect } from "./srs/schedule";
import { buildLessonQueue, buildReviewQueue, createSession } from "./review/session";
import type { ReviewTask, Session, TaskResult } from "./review/session";
import type { Card } from "./types";
import { useCards } from "./data/cards";
import { now } from "./util/now";
import { unlockedLevels, currentLevel, levelProgress } from "./srs/levels";
import { Dashboard } from "./screens/Dashboard";
import { Reviews } from "./screens/Reviews";
import { Lessons } from "./screens/Lessons";
import { Summary } from "./screens/Summary";
import { Settings } from "./screens/Settings";
import { Search } from "./screens/Search";
import { WordList } from "./screens/WordList";
import { WordCard } from "./components/WordCard";

export type Screen =
  | "dashboard"
  | "reviews"
  | "lessons"
  | "summary"
  | "settings"
  | "search"
  | "wordlist"
  | "worddetail";

export function App() {
  const { index, error } = useCards();
  const [progress, setProgress] = useState<ProgressData>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [sessionMode, setSessionMode] = useState<"review" | "lesson">("review");
  const [lessonCards, setLessonCards] = useState<Card[]>([]);
  const [summary, setSummary] = useState<{ results: TaskResult[]; mode: "review" | "lesson" } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [detailFrom, setDetailFrom] = useState<Screen>("dashboard");

  function openWordCard(cardId: string, from: Screen) {
    setSelectedCardId(cardId);
    setDetailFrom(from);
    setScreen("worddetail");
  }

  useEffect(() => {
    const t = progress.settings.theme;
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
  }, [progress.settings.theme]);

  function persist(next: ProgressData) {
    setProgress(next);
    saveProgress(next);
  }

  function startReviews() {
    if (!index) return;
    const tasks = buildReviewQueue(progress.states, now());
    if (tasks.length === 0) return;
    setSession(createSession(tasks));
    setSessionMode("review");
    setScreen("reviews");
  }

  function startLessons() {
    if (!index) return;
    const unlocked = unlockedLevels(index.cards, progress.states, !!progress.settings.unlockAllLevels);
    const tasks = buildLessonQueue(index.cards, progress.states, progress.settings.lessonBatchSize, unlocked);
    if (tasks.length === 0) return;
    const ids = [...new Set(tasks.map((t) => t.cardId))];
    setLessonCards(ids.map((id) => index.byId.get(id)!).filter(Boolean));
    setSession(createSession(tasks));
    setSessionMode("lesson");
    setScreen("lessons");
  }

  function applyReview(task: ReviewTask, everWrong: boolean) {
    setProgress((prev) => {
      const cur = prev.states[task.key] ?? newLessonState();
      const updated = everWrong ? answerIncorrect(cur, now()) : answerCorrect(cur, now());
      const next = setState(prev, task.key, updated);
      saveProgress(next);
      return next;
    });
  }

  function applyLesson(task: ReviewTask) {
    setProgress((prev) => {
      const next = setState(prev, task.key, startLesson(newLessonState(), now()));
      saveProgress(next);
      return next;
    });
  }

  function finishSession() {
    if (session) setSummary({ results: session.results(), mode: sessionMode });
    setSession(null);
    setScreen("summary");
  }

  const counts = useMemo(() => {
    if (!index) return null;
    const reviewsDue = buildReviewQueue(progress.states, now()).length;
    const unlocked = unlockedLevels(index.cards, progress.states, !!progress.settings.unlockAllLevels);
    const lessonCards = index.cards.filter((c) => {
      if (c.level && !unlocked.has(c.level)) return false;
      return DIRECTIONS.some((d) => {
        const s = progress.states[itemKey(c.id, d)];
        return !s || s.stage === 0;
      });
    }).length;
    const levelName = currentLevel(index.cards, progress.states);
    const levelPct = levelProgress(index.cards, progress.states, levelName).pct;
    return { reviewsDue, lessonCards, levelName, levelPct };
  }, [index, progress]);

  if (error) return <div className="screen">Failed to load cards: {error}</div>;
  if (!index || !counts) return <div className="screen">Loading…</div>;

  return (
    <div className="app">
      {screen === "dashboard" && (
        <Dashboard
          progress={progress}
          reviewsDue={counts.reviewsDue}
          lessonsAvailable={counts.lessonCards}
          levelName={counts.levelName}
          levelPct={counts.levelPct}
          onStartReviews={startReviews}
          onStartLessons={startLessons}
          onSettings={() => setScreen("settings")}
          onSearch={() => setScreen("search")}
          onWords={() => setScreen("wordlist")}
        />
      )}
      {screen === "search" && (
        <Search
          index={index}
          onOpen={(id) => openWordCard(id, "search")}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "wordlist" && (
        <WordList
          index={index}
          progress={progress}
          onOpen={(id) => openWordCard(id, "wordlist")}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "worddetail" && selectedCardId && index.byId.get(selectedCardId) && (
        <WordCard
          card={index.byId.get(selectedCardId)!}
          progress={progress}
          onBack={() => setScreen(detailFrom)}
        />
      )}
      {screen === "reviews" && session && (
        <Reviews
          session={session}
          getCard={(id) => index.byId.get(id)}
          onCleared={applyReview}
          onComplete={finishSession}
          onQuit={() => {
            setSession(null);
            setScreen("dashboard");
          }}
        />
      )}
      {screen === "lessons" && session && (
        <Lessons
          session={session}
          lessonCards={lessonCards}
          getCard={(id) => index.byId.get(id)}
          onCleared={applyLesson}
          onComplete={finishSession}
          onQuit={() => {
            setSession(null);
            setScreen("dashboard");
          }}
        />
      )}
      {screen === "summary" && summary && (
        <Summary
          results={summary.results}
          mode={summary.mode}
          getCard={(id) => index.byId.get(id)}
          onDone={() => setScreen("dashboard")}
        />
      )}
      {screen === "settings" && (
        <Settings
          progress={progress}
          onChange={persist}
          onBack={() => setScreen("dashboard")}
        />
      )}
    </div>
  );
}
