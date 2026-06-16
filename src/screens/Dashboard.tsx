import { useMemo } from "react";
import type { ProgressData } from "../types";
import { parseItemKey } from "../types";
import { STAGE_COLORS, stageCategory, type StageCategory } from "../srs/stages";
import { now } from "../util/now";

interface DashboardProps {
  progress: ProgressData;
  reviewsDue: number;
  lessonsAvailable: number;
  levelName: string;
  levelPct: number;
  onStartReviews: () => void;
  onStartLessons: () => void;
  onSettings: () => void;
  onSearch: () => void;
  onWords: () => void;
}

const CATEGORIES: { key: StageCategory; label: string }[] = [
  { key: "apprentice", label: "Apprentice" },
  { key: "guru", label: "Guru" },
  { key: "master", label: "Master" },
  { key: "enlightened", label: "Enlightened" },
  { key: "burned", label: "Burned" },
];

function fmtNext(ms: number): string {
  const delta = ms - now();
  if (delta <= 0) return "now";
  const h = Math.round(delta / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.round(delta / 60_000))} min`;
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function Dashboard({
  progress,
  reviewsDue,
  lessonsAvailable,
  levelName,
  levelPct,
  onStartReviews,
  onStartLessons,
  onSettings,
  onSearch,
  onWords,
}: DashboardProps) {
  const { byCategory, nextAt, wordsLearned } = useMemo(() => {
    const byCategory: Record<StageCategory, number> = {
      lesson: 0, apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0,
    };
    let nextAt = Infinity;
    for (const s of Object.values(progress.states)) {
      if (s.stage < 1) continue;
      byCategory[stageCategory(s.stage)]++;
      if (!s.burned && s.availableAt > now() && s.availableAt < nextAt) nextAt = s.availableAt;
    }
    const learnedCards = new Set<string>();
    for (const [key, s] of Object.entries(progress.states)) {
      if (s.stage >= 1) learnedCards.add(parseItemKey(key).cardId);
    }
    return { byCategory, nextAt, wordsLearned: learnedCards.size };
  }, [progress]);

  return (
    <div className="screen dashboard">
      <header className="topbar">
        <button className="icon-btn" onClick={onSearch} aria-label="search">🔍</button>
        <h1>Dutch SRS</h1>
        <button className="icon-btn" onClick={onSettings} aria-label="settings">⚙</button>
      </header>

      <section className="level-summary">
        <div
          className="level-ring"
          style={{ ["--pct" as string]: `${Math.round(levelPct * 100)}` }}
          role="img"
          aria-label={`${Math.round(levelPct * 100)}% of level ${levelName} at Guru`}
        >
          <span>{Math.round(levelPct * 100)}%</span>
        </div>
        <div className="level-meta">
          <strong>Level {levelName}</strong>
          <span>{wordsLearned} words learned</span>
        </div>
      </section>

      <div className="action-cards">
        <button className="action-card lessons" onClick={onStartLessons} disabled={lessonsAvailable === 0}>
          <div className="action-count">{lessonsAvailable}</div>
          <div className="action-name">Lessons</div>
        </button>
        <button className="action-card reviews" onClick={onStartReviews} disabled={reviewsDue === 0}>
          <div className="action-count">{reviewsDue}</div>
          <div className="action-name">Reviews</div>
        </button>
      </div>

      <div className="next-review">
        Next review: <strong>{nextAt === Infinity ? "—" : fmtNext(nextAt)}</strong>
      </div>

      <section className="srs-breakdown">
        <button className="words-link" onClick={onWords}>
          <h2>Words</h2>
          <span className="words-link-chevron">›</span>
        </button>
        <div className="srs-row">
          {CATEGORIES.map((c) => (
            <div className="srs-cell" key={c.key}>
              <div className="srs-count" style={{ color: STAGE_COLORS[c.key] }}>{byCategory[c.key]}</div>
              <div className="srs-cat">{c.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
