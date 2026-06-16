import { useMemo } from "react";
import type { Direction, ProgressData } from "../types";
import { parseItemKey } from "../types";
import type { CardIndex } from "../data/cards";
import { STAGE_COLORS, stageCategory, type StageCategory } from "../srs/stages";

interface WordListProps {
  index: CardIndex;
  progress: ProgressData;
  onOpen: (cardId: string) => void;
  onBack: () => void;
}

const CATEGORY_ORDER: { key: StageCategory; label: string }[] = [
  { key: "apprentice", label: "Apprentice" },
  { key: "guru", label: "Guru" },
  { key: "master", label: "Master" },
  { key: "enlightened", label: "Enlightened" },
  { key: "burned", label: "Burned" },
];

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
  const byCategory = new Map<StageCategory, ListItem[]>();
  for (const [key, state] of Object.entries(progress.states)) {
    if (state.stage < 1) continue;
    const { cardId, dir } = parseItemKey(key);
    const card = index.byId.get(cardId);
    if (!card) continue;
    const cat = stageCategory(state.stage);
    const items = byCategory.get(cat) ?? [];
    items.push({
      key,
      cardId,
      dir,
      dutch: card.dutch,
      english: card.english.join(", "),
      stage: state.stage,
    });
    byCategory.set(cat, items);
  }
  for (const items of byCategory.values()) {
    items.sort((a, b) => b.stage - a.stage || a.dutch.localeCompare(b.dutch));
  }
  return byCategory;
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

      {CATEGORY_ORDER.map(({ key, label }) => {
        const items = sections.get(key);
        if (!items || items.length === 0) return null;
        return (
          <section key={key} className="wordlist-section">
            <h2 style={{ color: STAGE_COLORS[key] }}>
              {label} <span className="wordlist-count">{items.length}</span>
            </h2>
            <ul className="word-rows">
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    className="word-row tinted"
                    style={{ borderLeftColor: STAGE_COLORS[key] }}
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
