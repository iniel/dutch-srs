import { useMemo } from "react";
import type { ProgressData } from "../types";
import type { CardIndex } from "../data/cards";
import { STAGE_COLORS, stageCategory, stageLabel } from "../srs/stages";
import { MIN_REVIEW_STAGE, BURNED_STAGE } from "../srs/stages";

interface WordListProps {
  index: CardIndex;
  progress: ProgressData;
  level?: string;
  onOpen: (cardId: string) => void;
  onBack: () => void;
}

const NOT_STARTED_STAGE = 0;

const STAGE_ORDER: number[] = Array.from(
  { length: BURNED_STAGE - MIN_REVIEW_STAGE + 1 },
  (_, i) => MIN_REVIEW_STAGE + i,
);

interface ListItem {
  cardId: string;
  dutch: string;
  english: string;
  stage: number;
}

function buildSections(index: CardIndex, progress: ProgressData, level?: string) {
  const byStage = new Map<number, ListItem[]>();
  for (const card of index.cards) {
    if (level !== undefined && card.level !== level) continue;
    const stage = progress.states[card.id]?.stage ?? 0;
    const includeUnstarted = level !== undefined;
    if (stage < 1 && !includeUnstarted) continue;
    const items = byStage.get(stage) ?? [];
    items.push({
      cardId: card.id,
      dutch: card.dutch,
      english: card.english.join(", "),
      stage,
    });
    byStage.set(stage, items);
  }
  for (const items of byStage.values()) {
    items.sort((a, b) => a.dutch.localeCompare(b.dutch));
  }
  return byStage;
}

export function WordList({ index, progress, level, onOpen, onBack }: WordListProps) {
  const sections = useMemo(() => buildSections(index, progress, level), [index, progress, level]);

  const total = useMemo(
    () => [...sections.values()].reduce((n, items) => n + items.length, 0),
    [sections],
  );

  const stageOrder = level !== undefined ? [...STAGE_ORDER, NOT_STARTED_STAGE] : STAGE_ORDER;

  return (
    <div className="screen wordlist">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>{level !== undefined ? `Level ${level}` : "Words"}</h1>
        <span className="topbar-spacer" />
      </header>

      {total === 0 && (
        <div className="word-empty">
          {level !== undefined ? "No words in this level." : "No items in progress yet."}
        </div>
      )}

      {stageOrder.map((stage) => {
        const items = sections.get(stage);
        if (!items || items.length === 0) return null;
        const color = STAGE_COLORS[stageCategory(stage)];
        return (
          <section key={stage} className="wordlist-section">
            <h2 style={{ color }}>
              {stage === NOT_STARTED_STAGE ? "Not started" : stageLabel(stage)}{" "}
              <span className="wordlist-count">{items.length}</span>
            </h2>
            <ul className="word-rows">
              {items.map((item) => (
                <li key={item.cardId}>
                  <button
                    className="word-row tinted"
                    style={{ borderLeftColor: color }}
                    onClick={() => onOpen(item.cardId)}
                  >
                    <span className="word-row-dutch">{item.dutch}</span>
                    <span className="word-row-en">{item.english}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
