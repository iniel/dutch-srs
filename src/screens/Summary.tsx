import type { Card } from "../types";
import type { WordResult } from "../review/session";

interface SummaryProps {
  results: WordResult[];
  mode: "review" | "lesson";
  getCard: (id: string) => Card | undefined;
  onDone: () => void;
}

const DIR_ARROW: Record<string, string> = { nl_en: "NL→EN", en_nl: "EN→NL" };

export function Summary({ results, mode, getCard, onDone }: SummaryProps) {
  const total = results.length;
  const correct = results.filter((r) => r.passed).length;
  const pct = total === 0 ? 100 : Math.round((correct / total) * 100);
  const missed = results.filter((r) => !r.passed);

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
              const card = getCard(r.cardId);
              if (!card) return null;
              const arrows = r.missedDirs.map((d) => DIR_ARROW[d]).join(" ");
              return (
                <li key={r.cardId}>
                  <span className="missed-dutch">
                    <span className="missed-dir">{arrows}</span> {card.dutch}
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
