import { useMemo } from "react";
import type { ProgressData } from "../types";
import { STAGE_COLORS, stageCategory, type StageCategory } from "../srs/stages";
import { now } from "../util/now";

interface DashboardProps {
  progress: ProgressData;
  reviewsDue: number;
  lessonsAvailable: number;
  onStartReviews: () => void;
  onStartLessons: () => void;
  onSettings: () => void;
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
  onStartReviews,
  onStartLessons,
  onSettings,
}: DashboardProps) {
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
        <h1>Dutch SRS</h1>
        <button className="icon-btn" onClick={onSettings} aria-label="settings">⚙</button>
      </header>

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
        <h2>Progress</h2>
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
