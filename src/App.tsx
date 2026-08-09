import { useEffect, useMemo, useRef, useState } from "react";
import type { ProgressData } from "./types";
import {
  loadProgress,
  saveProgress,
  setLessonQueue,
  setState,
  setDirectionDisabled,
  toggleLessonQueue,
} from "./storage/progress";
import { newLessonState, startLesson, answerCorrect, answerIncorrect } from "./srs/schedule";
import { buildLessonQueue, buildReviewQueue, createSession, singleWordLessonTasks } from "./review/session";
import type { Session, WordResult } from "./review/session";
import type { Card } from "./types";
import { useCards } from "./data/cards";
import { useEnrichment } from "./data/loadEnrichment";
import { usePaths } from "./data/loadPaths";
import { now } from "./util/now";
import { useVisualViewportVars } from "./util/visualViewport";
import { useScrollMemory } from "./util/useScrollMemory";
import { buildPaths } from "./paths/build";
import {
  availableLessonIds,
  currentUnitIndex,
  pathCardIds,
  pathRingPct,
  wordsToUnlockNext,
} from "./paths/engine";
import { Dashboard, type PathSummary } from "./screens/Dashboard";
import { Reviews } from "./screens/Reviews";
import { Lessons } from "./screens/Lessons";
import { Summary } from "./screens/Summary";
import { Settings } from "./screens/Settings";
import { Search } from "./screens/Search";
import { WordList, pathSections } from "./screens/WordList";
import { GeneralProgress } from "./screens/GeneralProgress";
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
  | "progress"
  | "worddetail";

export function App() {
  const { index, error } = useCards();
  const enrichment = useEnrichment();
  const pathDefs = usePaths();
  const getEnrichment = (id: string) => enrichment.get(id);
  const [progress, setProgress] = useState<ProgressData>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [sessionMode, setSessionMode] = useState<"review" | "lesson">("review");
  const [lessonCards, setLessonCards] = useState<Card[]>([]);
  const [summary, setSummary] = useState<{ results: WordResult[]; mode: "review" | "lesson" } | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [detailFrom, setDetailFrom] = useState<Screen>("dashboard");
  const [listPathId, setListPathId] = useState<string | null>(null);
  const [listSectionId, setListSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updateReady, setUpdateReady] = useState(false);
  const applyUpdate = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useVisualViewportVars(screen === "reviews" || screen === "lessons");
  useScrollMemory(screen === "wordlist" ? `wordlist:${listPathId}:${listSectionId}` : screen);

  const unlockAll = !!progress.settings.unlockAllLevels;
  const paths = useMemo(
    () => (index ? buildPaths(index.cards, pathDefs) : []),
    [index, pathDefs],
  );

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
    const tasks = buildReviewQueue(progress.states, now(), "shuffled", progress.disabledDirections).filter((t) =>
      index.byId.has(t.cardId),
    );
    if (tasks.length === 0) return;
    setSession(createSession(tasks));
    setSessionMode("review");
    setScreen("reviews");
  }

  function startLessons(pathId: string) {
    if (!index) return;
    const path = paths.find((p) => p.id === pathId);
    if (!path) return;
    const candidateIds = availableLessonIds(path, progress.states, unlockAll);
    const memberSet = new Set(pathCardIds(path));
    // Pins are global; only surface those that belong to this path (they bypass the gate).
    const pinnedInPath = progress.lessonQueue.filter((id) => memberSet.has(id));
    const tasks = buildLessonQueue(
      candidateIds,
      progress.states,
      progress.settings.lessonBatchSize,
      now(),
      pinnedInPath,
      progress.disabledDirections,
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
    enterLessonSession(singleWordLessonTasks(cardId, progress.disabledDirections));
  }

  function pinLesson(cardId: string) {
    if ((progress.states[cardId]?.stage ?? 0) > 0) return;
    if (progress.lessonQueue.includes(cardId)) return;
    persist(setLessonQueue(progress, [...progress.lessonQueue, cardId]));
  }

  function unpinLesson(cardId: string) {
    persist(setLessonQueue(progress, progress.lessonQueue.filter((id) => id !== cardId)));
  }

  function toggleLessonPin(cardId: string) {
    if ((progress.states[cardId]?.stage ?? 0) > 0) return;
    persist(toggleLessonQueue(progress, cardId));
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

  const reviewsDue = useMemo(() => {
    const t = now();
    return Object.values(progress.states).filter(
      (s) => s.stage >= 1 && !s.burned && s.availableAt <= t,
    ).length;
  }, [progress]);

  const pathSummaries = useMemo<PathSummary[]>(() => {
    const isNew = (id: string) => {
      const s = progress.states[id];
      return !s || s.stage === 0;
    };
    return paths.map((path) => {
      const available = new Set(availableLessonIds(path, progress.states, unlockAll));
      const memberSet = new Set(pathCardIds(path));
      // Pinned words that belong to this path still count as available lessons.
      for (const id of progress.lessonQueue) {
        if (memberSet.has(id) && isNew(id)) available.add(id);
      }
      const curUnit = path.units[currentUnitIndex(path, progress.states)];
      return {
        id: path.id,
        name: path.name,
        ringPct: pathRingPct(path, progress.states),
        currentUnitLabel: curUnit ? curUnit.label : "—",
        wordsToUnlock: wordsToUnlockNext(path, progress.states),
        lessonsAvailable: available.size,
      };
    });
  }, [paths, progress, unlockAll]);

  function openPathWords(pathId: string) {
    const path = paths.find((p) => p.id === pathId);
    if (!path) return;
    setListPathId(pathId);
    const cur = path.units[currentUnitIndex(path, progress.states)];
    setListSectionId(cur ? cur.id : path.units[0]?.id ?? null);
    setScreen("wordlist");
  }

  const listPath = paths.find((p) => p.id === listPathId) ?? paths[0];

  if (error) return <div className="screen">Failed to load cards: {error}</div>;
  if (!index) return <div className="screen">Loading…</div>;

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
          reviewsDue={reviewsDue}
          paths={pathSummaries}
          onStartReviews={startReviews}
          onStartLessons={startLessons}
          onOpenPath={openPathWords}
          onSettings={() => setScreen("settings")}
          onSearch={() => openSearch()}
          onWords={() => setScreen("progress")}
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
      {screen === "wordlist" && listPath && (
        <WordList
          index={index}
          progress={progress}
          title={listPath.name}
          sections={pathSections(listPath)}
          selectedId={listSectionId ?? listPath.units[0]?.id ?? ""}
          onSelectSection={setListSectionId}
          showCefr={listPath.id !== "inburgering"}
          onOpen={(id) => openWordCard(id, "wordlist")}
          onTogglePin={toggleLessonPin}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "progress" && (
        <GeneralProgress
          index={index}
          progress={progress}
          onOpen={(id) => openWordCard(id, "progress")}
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
          onToggleDirection={(id, enabled) =>
            persist(setDirectionDisabled(progress, id, "nl_en", !enabled))
          }
        />
      )}
      {screen === "reviews" && session && (
        <Reviews
          session={session}
          getCard={(id) => index.byId.get(id)}
          getEnrichment={getEnrichment}
          onWordCleared={applyWordReview}
          onComplete={finishSession}
          onRemoveDirection={(id) => persist(setDirectionDisabled(progress, id, "nl_en", true))}
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
          onWordCleared={applyWordLesson}
          onComplete={finishSession}
          onRemoveDirection={(id) => persist(setDirectionDisabled(progress, id, "nl_en", true))}
          disabledDirections={progress.disabledDirections}
          onToggleDirection={(id, enabled) =>
            persist(setDirectionDisabled(progress, id, "nl_en", !enabled))
          }
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
