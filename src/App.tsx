import { useEffect, useMemo, useRef, useState } from "react";
import type { ProgressData } from "./types";
import { loadProgress, saveProgress, setLessonQueue, setState } from "./storage/progress";
import { newLessonState, startLesson, answerCorrect, answerIncorrect } from "./srs/schedule";
import { buildLessonQueue, buildReviewQueue, createSession, singleWordLessonTasks } from "./review/session";
import type { Session, WordResult } from "./review/session";
import type { Card } from "./types";
import { useCards } from "./data/cards";
import { useEnrichment } from "./data/loadEnrichment";
import { now } from "./util/now";
import { useVisualViewportVars } from "./util/visualViewport";
import { unlockedLevels, currentLevel, levelProgress, wordsToLevelUp } from "./srs/levels";
import { Dashboard } from "./screens/Dashboard";
import { Reviews } from "./screens/Reviews";
import { Lessons } from "./screens/Lessons";
import { Summary } from "./screens/Summary";
import { Settings } from "./screens/Settings";
import { Search } from "./screens/Search";
import { WordList } from "./screens/WordList";
import { WordCard } from "./components/WordCard";
import { registerPwa } from "./pwa/registerPwa";

export type Screen =
  | "dashboard"
  | "reviews"
  | "lessons"
  | "summary"
  | "settings"
  | "search"
  | "wordlist"
  | "levelwords"
  | "worddetail";

export function App() {
  const { index, error } = useCards();
  const enrichment = useEnrichment();
  const getEnrichment = (id: string) => enrichment.get(id);
  const [progress, setProgress] = useState<ProgressData>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [sessionMode, setSessionMode] = useState<"review" | "lesson">("review");
  const [lessonCards, setLessonCards] = useState<Card[]>([]);
  const [summary, setSummary] = useState<{ results: WordResult[]; mode: "review" | "lesson" } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [detailFrom, setDetailFrom] = useState<Screen>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [updateReady, setUpdateReady] = useState(false);
  const applyUpdate = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useVisualViewportVars(screen === "reviews" || screen === "lessons");

  useEffect(() => {
    applyUpdate.current = registerPwa(() => setUpdateReady(true));
  }, []);

  function openWordCard(cardId: string, from: Screen) {
    setSelectedCardId(cardId);
    setDetailFrom(from);
    setScreen("worddetail");
  }

  function openSearch(q = "") {
    setSearchQuery(q);
    setScreen("search");
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
    const tasks = buildReviewQueue(progress.states, now(), "shuffled").filter((t) =>
      index.byId.has(t.cardId),
    );
    if (tasks.length === 0) return;
    setSession(createSession(tasks));
    setSessionMode("review");
    setScreen("reviews");
  }

  function startLessons() {
    if (!index) return;
    const unlocked = unlockedLevels(index.cards, progress.states, !!progress.settings.unlockAllLevels);
    const tasks = buildLessonQueue(
      index.cards,
      progress.states,
      progress.settings.lessonBatchSize,
      unlocked,
      now(),
      progress.lessonQueue,
    );
    if (tasks.length === 0) return;
    enterLessonSession(tasks);
  }

  function enterLessonSession(tasks: ReturnType<typeof singleWordLessonTasks>) {
    if (!index) return;
    const ids = [...new Set(tasks.map((t) => t.cardId))];
    setLessonCards(ids.map((id) => index.byId.get(id)!).filter(Boolean));
    setSession(createSession(tasks));
    setSessionMode("lesson");
    setScreen("lessons");
  }

  function learnNow(cardId: string) {
    if (!index || !index.byId.has(cardId)) return;
    if ((progress.states[cardId]?.stage ?? 0) > 0) return;
    enterLessonSession(singleWordLessonTasks(cardId));
  }

  function pinLesson(cardId: string) {
    if ((progress.states[cardId]?.stage ?? 0) > 0) return;
    if (progress.lessonQueue.includes(cardId)) return;
    persist(setLessonQueue(progress, [...progress.lessonQueue, cardId]));
  }

  function unpinLesson(cardId: string) {
    persist(setLessonQueue(progress, progress.lessonQueue.filter((id) => id !== cardId)));
  }

  function applyWordReview(cardId: string, passed: boolean) {
    setProgress((prev) => {
      const cur = prev.states[cardId] ?? newLessonState();
      const updated = passed ? answerCorrect(cur, now()) : answerIncorrect(cur, now());
      const next = setState(prev, cardId, updated);
      saveProgress(next);
      return next;
    });
  }

  function applyWordLesson(cardId: string) {
    setProgress((prev) => {
      const existing = prev.states[cardId];
      if (existing && existing.stage > 0) return prev;
      let next = setState(prev, cardId, startLesson(newLessonState(), now()));
      if (next.lessonQueue.includes(cardId)) {
        next = setLessonQueue(next, next.lessonQueue.filter((id) => id !== cardId));
      }
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
    const t = now();
    const reviewsDue = Object.values(progress.states).filter(
      (s) => s.stage >= 1 && !s.burned && s.availableAt <= t,
    ).length;
    const unlocked = unlockedLevels(index.cards, progress.states, !!progress.settings.unlockAllLevels);
    const isNew = (id: string) => {
      const s = progress.states[id];
      return !s || s.stage === 0;
    };
    const available = new Set(
      index.cards.filter((c) => (!c.level || unlocked.has(c.level)) && isNew(c.id)).map((c) => c.id),
    );
    for (const id of progress.lessonQueue) {
      if (index.byId.has(id) && isNew(id)) available.add(id);
    }
    const lessonCards = available.size;
    const levelName = currentLevel(index.cards, progress.states);
    const levelProg = levelProgress(index.cards, progress.states, levelName);
    return {
      reviewsDue,
      lessonCards,
      levelName,
      levelPct: levelProg.pct,
      wordsToLevelUp: wordsToLevelUp(levelProg),
    };
  }, [index, progress]);

  if (error) return <div className="screen">Failed to load cards: {error}</div>;
  if (!index || !counts) return <div className="screen">Loading…</div>;

  return (
    <div className="app">
      {updateReady && (
        <button className="update-banner" onClick={() => applyUpdate.current?.(true)}>
          New version — tap to update
        </button>
      )}
      {screen === "dashboard" && (
        <Dashboard
          progress={progress}
          reviewsDue={counts.reviewsDue}
          lessonsAvailable={counts.lessonCards}
          levelName={counts.levelName}
          levelPct={counts.levelPct}
          wordsToLevelUp={counts.wordsToLevelUp}
          onStartReviews={startReviews}
          onStartLessons={startLessons}
          onSettings={() => setScreen("settings")}
          onSearch={() => openSearch()}
          onWords={() => setScreen("wordlist")}
          onLevelWords={() => setScreen("levelwords")}
        />
      )}
      {screen === "search" && (
        <Search
          index={index}
          initialQuery={searchQuery}
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
      {screen === "levelwords" && (
        <WordList
          index={index}
          progress={progress}
          level={counts.levelName}
          onOpen={(id) => openWordCard(id, "levelwords")}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "worddetail" && selectedCardId && index.byId.get(selectedCardId) && (
        <WordCard
          card={index.byId.get(selectedCardId)!}
          enrichment={getEnrichment(selectedCardId)}
          progress={progress}
          onBack={() => setScreen(detailFrom)}
          onLearnNow={learnNow}
          onPin={pinLesson}
          onUnpin={unpinLesson}
          onSearchWord={(w) => openSearch(w)}
        />
      )}
      {screen === "reviews" && session && (
        <Reviews
          session={session}
          getCard={(id) => index.byId.get(id)}
          getEnrichment={getEnrichment}
          pools={index.pools}
          onWordCleared={applyWordReview}
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
          getEnrichment={getEnrichment}
          pools={index.pools}
          onWordCleared={applyWordLesson}
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
