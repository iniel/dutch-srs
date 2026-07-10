import { useMemo } from "react";
import type { ProgressData } from "../types";
import type { CardIndex } from "../data/cards";
import { STAGE_COLORS, stageCategory, stageLabel } from "../srs/stages";
import { MIN_REVIEW_STAGE, BURNED_STAGE } from "../srs/stages";
import { cefrBadge, LEVEL_PASS_THRESHOLD } from "../srs/levels";
import { unitProgress } from "../paths/engine";
import type { LearningPath } from "../paths/types";

export interface WordSection {
  id: string;
  label: string;
  cardIds: string[];
}

interface WordListProps {
  index: CardIndex;
  progress: ProgressData;
  title: string;
  sections: WordSection[];
  selectedId: string;
  onSelectSection: (id: string) => void;
  /** Show the purple CEFR badge on rows. Off for paths where it is noise (e.g. Inburgering Online). */
  showCefr?: boolean;
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
  cefr?: string;
  stage: number;
}

function buildStageGroups(index: CardIndex, progress: ProgressData, cardIds: string[]) {
  const byStage = new Map<number, ListItem[]>();
  for (const id of cardIds) {
    const card = index.byId.get(id);
    if (!card) continue;
    const stage = progress.states[id]?.stage ?? 0;
    const items = byStage.get(stage) ?? [];
    items.push({
      cardId: id,
      dutch: card.dutch,
      english: card.english.join(", "),
      cefr: cefrBadge(card),
      stage,
    });
    byStage.set(stage, items);
  }
  for (const items of byStage.values()) {
    items.sort((a, b) => a.dutch.localeCompare(b.dutch));
  }
  return byStage;
}

const STAGE_ORDER_WITH_UNSTARTED = [...STAGE_ORDER, NOT_STARTED_STAGE];

export function WordList({
  index,
  progress,
  title,
  sections,
  selectedId,
  onSelectSection,
  showCefr = true,
  onOpen,
  onBack,
}: WordListProps) {
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? sections[0],
    [sections, selectedId],
  );

  const groups = useMemo(
    () => buildStageGroups(index, progress, selected?.cardIds ?? []),
    [index, progress, selected],
  );

  const total = selected?.cardIds.length ?? 0;

  const prog = useMemo(
    () => unitProgress(selected?.cardIds ?? [], progress.states),
    [selected, progress],
  );
  // Per-section level-up hint: guru cost to pass this section's own gate.
  const toLevelUp = Math.max(0, Math.ceil(prog.total * LEVEL_PASS_THRESHOLD) - prog.gurued);

  return (
    <div className="screen wordlist">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>{title}</h1>
        <span className="topbar-spacer" />
      </header>

      <select
        className="wordlist-select"
        value={selected?.id ?? ""}
        onChange={(e) => onSelectSection(e.target.value)}
        aria-label="Select section"
      >
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>

      <div className="wordlist-progress">
        {Math.round(prog.pct * 100)}% Guru
        {toLevelUp > 0 && ` · ${toLevelUp} word${toLevelUp === 1 ? "" : "s"} to level up`}
      </div>

      {total === 0 && <div className="word-empty">No words in this section.</div>}

      {STAGE_ORDER_WITH_UNSTARTED.map((stage) => {
        const items = groups.get(stage);
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
                    {showCefr && item.cefr && <span className="word-row-tag">{item.cefr}</span>}
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

/** Map a path's units to WordList sections. */
export function pathSections(path: LearningPath): WordSection[] {
  return path.units.map((u) => ({ id: u.id, label: u.label, cardIds: u.cardIds }));
}
