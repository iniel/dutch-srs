import { useMemo, useState } from "react";
import type { ProgressData } from "../types";
import type { CardIndex } from "../data/cards";
import { STAGE_COLORS, stageCategory, stageLabel, type StageCategory } from "../srs/stages";
import { cefrBadge } from "../srs/levels";

interface GeneralProgressProps {
  index: CardIndex;
  progress: ProgressData;
  onOpen: (cardId: string) => void;
  onBack: () => void;
}

interface Item {
  cardId: string;
  dutch: string;
  english: string;
  cefr?: string;
}

/** The five mastery tabs and the review stages that roll up into each. */
const TABS: { key: StageCategory; label: string; stages: number[] }[] = [
  { key: "apprentice", label: "Apprentice", stages: [1, 2, 3, 4] },
  { key: "guru", label: "Guru", stages: [5, 6] },
  { key: "master", label: "Master", stages: [7] },
  { key: "enlightened", label: "Enlightened", stages: [8] },
  { key: "burned", label: "Burned", stages: [9] },
];

export function GeneralProgress({ index, progress, onOpen, onBack }: GeneralProgressProps) {
  // Path-agnostic: every started word, grouped by its review stage. Stage-0
  // (locked / not started) words are never shown here.
  const byStage = useMemo(() => {
    const m = new Map<number, Item[]>();
    for (const [id, st] of Object.entries(progress.states)) {
      if (st.stage < 1) continue;
      const card = index.byId.get(id);
      if (!card) continue;
      const items = m.get(st.stage) ?? [];
      items.push({
        cardId: id,
        dutch: card.dutch,
        english: card.english.join(", "),
        cefr: cefrBadge(card),
      });
      m.set(st.stage, items);
    }
    for (const items of m.values()) items.sort((a, b) => a.dutch.localeCompare(b.dutch));
    return m;
  }, [index, progress]);

  const counts = useMemo(() => {
    const c: Record<StageCategory, number> = {
      lesson: 0, apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0,
    };
    for (const [stage, items] of byStage) c[stageCategory(stage)] += items.length;
    return c;
  }, [byStage]);

  const [tab, setTab] = useState<StageCategory>("apprentice");
  const active = TABS.find((t) => t.key === tab)!;
  const total = active.stages.reduce((n, s) => n + (byStage.get(s)?.length ?? 0), 0);

  return (
    <div className="screen wordlist">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="back">‹</button>
        <h1>Progress</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="progress-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={`progress-tab${t.key === tab ? " active" : ""}`}
            style={{ ["--tab-color" as string]: STAGE_COLORS[t.key] }}
            onClick={() => setTab(t.key)}
          >
            <span className="progress-tab-count">{counts[t.key]}</span>
            <span className="progress-tab-name">{t.label}</span>
          </button>
        ))}
      </div>

      {total === 0 && <div className="word-empty">No words at this level yet.</div>}

      {active.stages.map((stage) => {
        const items = byStage.get(stage);
        if (!items || items.length === 0) return null;
        const color = STAGE_COLORS[stageCategory(stage)];
        return (
          <section key={stage} className="wordlist-section">
            <h2 style={{ color }}>
              {stageLabel(stage)} <span className="wordlist-count">{items.length}</span>
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
                    {item.cefr && <span className="word-row-tag">{item.cefr}</span>}
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
