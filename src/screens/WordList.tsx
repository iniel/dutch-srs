import { useMemo } from "react";
import type { Direction, ProgressData } from "../types";
import { parseItemKey } from "../types";
import type { CardIndex } from "../data/cards";
import { STAGE_COLORS, stageCategory, stageLabel } from "../srs/stages";
import { MIN_REVIEW_STAGE, BURNED_STAGE } from "../srs/stages";

interface WordListProps {
  index: CardIndex;
  progress: ProgressData;
  onOpen: (cardId: string) => void;
  onBack: () => void;
}

const STAGE_ORDER: number[] = Array.from(
  { length: BURNED_STAGE - MIN_REVIEW_STAGE + 1 },
  (_, i) => MIN_REVIEW_STAGE + i,
);

const DIR_LABEL: Record<Direction, string> = { nl_en: "NL → EN", en_nl: "EN → NL" };

interface ListItem {
  key: string;
  cardId: string;
  dir: Direction;
  dutch: string;
  english: string;
  stage: number;
}

function buildSections(index: CardIndex, progress: ProgressData) {
  const byStage = new Map<number, ListItem[]>();
  for (const [key, state] of Object.entries(progress.states)) {
    if (state.stage < 1) continue;
    const { cardId, dir } = parseItemKey(key);
    const card = index.byId.get(cardId);
    if (!card) continue;
    const items = byStage.get(state.stage) ?? [];
    items.push({
      key,
      cardId,
      dir,
      dutch: card.dutch,
      english: card.english.join(", "),
      stage: state.stage,
    });
    byStage.set(state.stage, items);
  }
  for (const items of byStage.values()) {
    items.sort((a, b) => a.dutch.localeCompare(b.dutch));
  }
  return byStage;
}

export function WordList({ index, progress, onOpen, onBack }: WordListProps) {
  const sections = useMemo(() => buildSections(index, progress), [index, progress]);

  const total = useMemo(
    () => [...sections.values()].reduce((n, items) => n + items.length, 0),
    [sections],
  );

  return (
    <div className="screen wordlist">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Words</h1>
        <span className="topbar-spacer" />
      </header>

      {total === 0 && <div className="word-empty">No items in progress yet.</div>}

      {STAGE_ORDER.map((stage) => {
        const items = sections.get(stage);
        if (!items || items.length === 0) return null;
        const color = STAGE_COLORS[stageCategory(stage)];
        return (
          <section key={stage} className="wordlist-section">
            <h2 style={{ color }}>
              {stageLabel(stage)} <span className="wordlist-count">{items.length}</span>
            </h2>
            <ul className="word-rows">
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    className="word-row tinted"
                    style={{ borderLeftColor: color }}
                    onClick={() => onOpen(item.cardId)}
                  >
                    <span className="word-row-dutch">{item.dutch}</span>
                    <span className="word-row-en">{item.english}</span>
                    <span className="word-row-tag">{DIR_LABEL[item.dir]}</span>
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
