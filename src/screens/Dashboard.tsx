import { useMemo, useState } from "react";
import type { ProgressData } from "../types";
import { STAGE_COLORS, stageCategory, type StageCategory } from "../srs/stages";
import { now } from "../util/now";
import { HelpModal } from "../components/HelpModal";

export interface PathSummary {
  id: string;
  name: string;
  ringPct: number;
  currentUnitLabel: string;
  wordsToUnlock: number;
  lessonsAvailable: number;
}

interface DashboardProps {
  progress: ProgressData;
  reviewsDue: number;
  paths: PathSummary[];
  onStartReviews: () => void;
  onStartLessons: (pathId: string) => void;
  onOpenPath: (pathId: string) => void;
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
  paths,
  onStartReviews,
  onStartLessons,
  onOpenPath,
  onSettings,
  onSearch,
  onWords,
}: DashboardProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { byCategory, nextAt } = useMemo(() => {
    const byCategory: Record<StageCategory, number> = {
      lesson: 0, apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0,
    };
    let nextAt = Infinity;
    for (const s of Object.values(progress.states)) {
      if (s.stage < 1) continue;
      byCategory[stageCategory(s.stage)]++;
      if (!s.burned && s.availableAt > now() && s.availableAt < nextAt) nextAt = s.availableAt;
    }
    return { byCategory, nextAt };
  }, [progress]);

  return (
    <div className="screen dashboard">
      <header className="topbar">
        <button className="icon-btn" onClick={onSearch} aria-label="search">🔍</button>
        <h1>Dutch</h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="help">?</button>
          <button className="icon-btn" onClick={onSettings} aria-label="settings">⚙</button>
        </div>
      </header>

      <button
        className="action-card reviews"
        onClick={onStartReviews}
        disabled={reviewsDue === 0}
      >
        <div className="action-count">{reviewsDue}</div>
        <div className="action-name">Reviews</div>
      </button>

      <div className="dash-row">
        <span>Next review</span>
        <strong>{nextAt === Infinity ? "—" : `in ${fmtNext(nextAt)}`}</strong>
      </div>

      <button className="srs-breakdown" onClick={onWords} aria-label="Words in progress">
        <div className="words-link">
          <h2>Progress</h2>
        </div>
        <div className="srs-row">
          {CATEGORIES.map((c) => (
            <div className="srs-cell" key={c.key}>
              <div className="srs-count" style={{ color: STAGE_COLORS[c.key] }}>{byCategory[c.key]}</div>
              <div className="srs-cat">{c.label}</div>
            </div>
          ))}
        </div>
      </button>

      {paths.map((p) => (
        <div className="path-section" key={p.id}>
          <button
            className="level-summary"
            onClick={() => onOpenPath(p.id)}
            aria-label={`${p.name} words`}
          >
            <div
              className="level-ring"
              style={{ ["--pct" as string]: `${Math.round(p.ringPct * 100)}` }}
              role="img"
              aria-label={`${Math.round(p.ringPct * 100)}% of ${p.name} at Guru`}
            >
              <span>{Math.round(p.ringPct * 100)}%</span>
            </div>
            <div className="level-meta">
              <strong>{p.name}</strong>
              <span>
                {p.currentUnitLabel}
                {p.wordsToUnlock > 0
                  ? ` · ${p.wordsToUnlock} to unlock next`
                  : " · all unlocked"}
              </span>
            </div>
            <span className="level-summary-chevron">›</span>
          </button>
          <button
            className="action-card lessons path-lessons"
            onClick={() => onStartLessons(p.id)}
            disabled={p.lessonsAvailable === 0}
          >
            <div className="action-count">{p.lessonsAvailable}</div>
            <div className="action-name">Lessons</div>
          </button>
        </div>
      ))}

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
