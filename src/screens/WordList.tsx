import { useMemo, type ReactNode } from "react";
import type { ProgressData, ReviewState } from "../types";
import type { CardIndex } from "../data/cards";
import { STAGE_COLORS, stageCategory, stageLabel } from "../srs/stages";
import { MIN_REVIEW_STAGE, BURNED_STAGE } from "../srs/stages";
import { cefrBadge, LEVEL_PASS_THRESHOLD } from "../srs/levels";
import { unitProgress } from "../paths/engine";
import type { LearningPath } from "../paths/types";
import type { GrammarDrill } from "../grammar/types";
import { grammarLessonIds } from "../grammar/queue";
import { perfectumReveal } from "../grammar/drill";

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
  onTogglePin: (cardId: string) => void;
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

export interface WordGroup {
  key: string;
  label: string;
  color: string;
  items: ListItem[];
}

const STAGE_ORDER_WITH_UNSTARTED = [...STAGE_ORDER, NOT_STARTED_STAGE];

function stageGroups(items: ListItem[]): WordGroup[] {
  const byStage = new Map<number, ListItem[]>();
  for (const item of items) {
    byStage.set(item.stage, [...(byStage.get(item.stage) ?? []), item]);
  }
  return STAGE_ORDER_WITH_UNSTARTED.flatMap((stage) => {
    const group = byStage.get(stage);
    if (!group) return [];
    group.sort((a, b) => a.dutch.localeCompare(b.dutch));
    return [{
      key: String(stage),
      label: stage === NOT_STARTED_STAGE ? "Not started" : stageLabel(stage),
      color: STAGE_COLORS[stageCategory(stage)],
      items: group,
    }];
  });
}

function pathGroups(index: CardIndex, progress: ProgressData, cardIds: string[]): WordGroup[] {
  return stageGroups(
    cardIds.flatMap((id) => {
      const card = index.byId.get(id);
      if (!card) return [];
      return [{
        cardId: id,
        dutch: card.dutch,
        english: card.english.join(", "),
        cefr: cefrBadge(card),
        stage: progress.states[id]?.stage ?? 0,
      }];
    }),
  );
}

export function drillGroups(
  index: CardIndex,
  drill: GrammarDrill,
  grammarStates: Record<string, ReviewState>,
  vocabStates: Record<string, ReviewState>,
): WordGroup[] {
  const rows = new Map(
    drill.items.flatMap((item) => {
      const card = index.byId.get(item.cardId);
      if (!card) return [];
      const row: ListItem = {
        cardId: item.cardId,
        dutch: item.infinitive,
        english: `${perfectumReveal(item)} · ${card.english.join(", ")}`,
        stage: grammarStates[item.cardId]?.stage ?? 0,
      };
      return [[item.cardId, row] as const];
    }),
  );
  const started = [...rows.values()].filter((row) => row.stage >= MIN_REVIEW_STAGE);
  const notStarted = grammarLessonIds(drill, grammarStates, vocabStates, Infinity).flatMap((id) => rows.get(id) ?? []);
  return [
    ...stageGroups(started),
    { key: "unstarted", label: "Not started", color: STAGE_COLORS.lesson, items: notStarted },
  ].filter((group) => group.items.length > 0);
}

interface WordRowProps {
  item: ListItem;
  color: string;
  showCefr: boolean;
  pinned: boolean;
  onOpen: (cardId: string) => void;
  onTogglePin?: (cardId: string) => void;
}

function WordRow({ item, color, showCefr, pinned, onOpen, onTogglePin }: WordRowProps) {
  const canQueue = onTogglePin !== undefined && item.stage === NOT_STARTED_STAGE;

  return (
    <div className="word-row-wrap">
      <button
        className={`word-row tinted${canQueue ? " has-add" : ""}`}
        style={{ borderLeftColor: color }}
        onClick={() => onOpen(item.cardId)}
      >
        <span className="word-row-dutch">{item.dutch}</span>
        <span className="word-row-en">{item.english}</span>
        {showCefr && item.cefr && <span className="word-row-tag">{item.cefr}</span>}
      </button>
      {canQueue && (
        <button
          className={`word-row-add${pinned ? " on" : ""}`}
          onClick={() => onTogglePin(item.cardId)}
          aria-pressed={pinned}
          aria-label={
            pinned
              ? `Remove ${item.dutch} from the next lesson`
              : `Add ${item.dutch} to the next lesson`
          }
        >
          {pinned ? "✓" : "+"}
        </button>
      )}
    </div>
  );
}

interface GroupedWordListProps {
  title: string;
  groups: WordGroup[];
  showCefr?: boolean;
  pinnedIds?: ReadonlySet<string>;
  onOpen: (cardId: string) => void;
  onTogglePin?: (cardId: string) => void;
  onBack: () => void;
  children?: ReactNode;
}

export function GroupedWordList({
  title,
  groups,
  showCefr = true,
  pinnedIds,
  onOpen,
  onTogglePin,
  onBack,
  children,
}: GroupedWordListProps) {
  return (
    <div className="screen wordlist">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>{title}</h1>
        <span className="topbar-spacer" />
      </header>

      {children}

      {groups.map((group) => (
        <section key={group.key} className="wordlist-section">
          <h2 style={{ color: group.color }}>
            {group.label} <span className="wordlist-count">{group.items.length}</span>
          </h2>
          <ul className="word-rows">
            {group.items.map((item) => (
              <li key={item.cardId}>
                <WordRow
                  item={item}
                  color={group.color}
                  showCefr={showCefr}
                  pinned={pinnedIds?.has(item.cardId) ?? false}
                  onOpen={onOpen}
                  onTogglePin={onTogglePin}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function WordList({
  index,
  progress,
  title,
  sections,
  selectedId,
  onSelectSection,
  showCefr = true,
  onOpen,
  onTogglePin,
  onBack,
}: WordListProps) {
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? sections[0],
    [sections, selectedId],
  );

  const pinnedIds = useMemo(() => new Set(progress.lessonQueue), [progress.lessonQueue]);

  const groups = useMemo(
    () => pathGroups(index, progress, selected?.cardIds ?? []),
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
    <GroupedWordList
      title={title}
      groups={groups}
      showCefr={showCefr}
      pinnedIds={pinnedIds}
      onOpen={onOpen}
      onTogglePin={onTogglePin}
      onBack={onBack}
    >
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
    </GroupedWordList>
  );
}

/** Map a path's units to WordList sections. */
export function pathSections(path: LearningPath): WordSection[] {
  return path.units.map((u) => ({ id: u.id, label: u.label, cardIds: u.cardIds }));
}
