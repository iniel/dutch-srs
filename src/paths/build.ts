import type { Card } from "../types";
import { levelOrder } from "../srs/levels";
import type { LearningPath, PathDef, PathUnit } from "./types";

export const TAALCOMPLEET_ID = "taalcompleet";

/** Split an ordered id list into contiguous chunks of at most `size`. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** The built-in linear course: one unit per `Card.level`, in deck order. */
export function buildTaalCompleetPath(cards: Card[]): LearningPath {
  const order = levelOrder(cards);
  const byLevel = new Map<string, string[]>(order.map((l) => [l, []]));
  for (const card of cards) {
    if (!card.level) continue;
    byLevel.get(card.level)!.push(card.id);
  }
  const units: PathUnit[] = order.map((level) => ({
    id: `${TAALCOMPLEET_ID}:${level}`,
    label: level,
    cardIds: byLevel.get(level)!,
  }));
  return { id: TAALCOMPLEET_ID, name: "TaalCompleet", units };
}

/** A data-defined path: each difficulty tier chunked into units of `unitSize`. */
export function buildInburgeringPath(cards: Card[], def: PathDef): LearningPath {
  const known = new Set(cards.map((c) => c.id));
  const units: PathUnit[] = [];
  for (const tier of def.difficulties) {
    const valid = tier.cardIds.filter((id) => known.has(id));
    chunk(valid, def.unitSize).forEach((ids, i) => {
      units.push({
        id: `${def.id}:${tier.key}:${i + 1}`,
        label: `${tier.label} ${i + 1}`,
        cardIds: ids,
      });
    });
  }
  return { id: def.id, name: def.name, units };
}

/** Assemble every path: the derived TaalCompleet course first, then data-defined paths. */
export function buildPaths(cards: Card[], defs: PathDef[]): LearningPath[] {
  return [buildTaalCompleetPath(cards), ...defs.map((def) => buildInburgeringPath(cards, def))];
}
