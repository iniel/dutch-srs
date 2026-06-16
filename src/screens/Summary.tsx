import type { Card } from "../types";
import type { TaskResult } from "../review/session";

interface SummaryProps {
  results: TaskResult[];
  mode: "review" | "lesson";
  getCard: (id: string) => Card | undefined;
  onDone: () => void;
}

export function Summary({ results, mode, getCard, onDone }: SummaryProps) {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const pct = total === 0 ? 100 : Math.round((correct / total) * 100);
  const missed = results.filter((r) => !r.correct);

  return (
    <div className="screen summary">
      <header className="topbar">
        <h1>{mode === "lesson" ? "Lesson complete" : "Session complete"}</h1>
      </header>

      <div className="summary-score">
        <div className="summary-pct">{pct}%</div>
        <div className="summary-sub">{correct} / {total} correct first try</div>
      </div>

      {missed.length > 0 && (
        <section className="summary-missed">
          <h2>Missed ({missed.length})</h2>
          <ul>
            {missed.map((r) => {
              const card = getCard(r.task.cardId);
              if (!card) return null;
              const arrow = r.task.dir === "nl_en" ? "NL→EN" : "EN→NL";
              return (
                <li key={r.task.key}>
                  <span className="missed-dutch">
                    <span className="missed-dir">{arrow}</span> {card.dutch}
                  </span>
                  <span className="missed-en">{card.english.join(", ")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button className="btn primary block" onClick={onDone}>Done</button>
    </div>
  );
}
