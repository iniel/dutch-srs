import type { Card, Direction, ItemKey, ReviewState } from "../types";
import { itemKey, DIRECTIONS } from "../types";

export interface ReviewTask {
  key: ItemKey;
  cardId: string;
  dir: Direction;
}

export type ReviewOrder = "due" | "shuffled" | "apprentice_first";

export const LEECH_INCORRECT_THRESHOLD = 3;

const APPRENTICE_MAX_STAGE = 4;

function wordTasks(cardId: string): ReviewTask[] {
  return DIRECTIONS.map((dir) => ({ key: itemKey(cardId, dir), cardId, dir }));
}

function isApprentice(stage: number): boolean {
  return stage >= 1 && stage <= APPRENTICE_MAX_STAGE;
}

// Interleave tasks so both directions of each word appear close together throughout
// the queue. Uses rank-offset: en_nl gets rank r, nl_en gets rank r+gap, where
// gap = min(floor(N/3), 8). This bounds the maximum distance between a word's two
// directions to gap+N tasks, ensuring partial-session progress even when interrupted.
function shuffleInterleaved(tasks: ReviewTask[], seed: number): ReviewTask[] {
  const rand = seededRandom(seed);

  const byCard = new Map<string, ReviewTask[]>();
  for (const task of tasks) {
    const g = byCard.get(task.cardId) ?? [];
    g.push(task);
    byCard.set(task.cardId, g);
  }

  const cards = [...byCard.keys()];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  const N = cards.length;
  const gap = Math.max(1, Math.min(Math.floor(N / 3), 8));

  type Positioned = { pos: number; tieDir: number; task: ReviewTask };
  const positioned: Positioned[] = [];

  for (let r = 0; r < N; r++) {
    const group = byCard.get(cards[r])!;
    const en = group.find((t) => t.dir === "en_nl");
    const nl = group.find((t) => t.dir === "nl_en");
    if (en && nl) {
      positioned.push({ pos: r, tieDir: 0, task: en });
      positioned.push({ pos: r + gap, tieDir: 1, task: nl });
    } else {
      positioned.push({ pos: r, tieDir: 0, task: group[0] });
    }
  }

  positioned.sort((a, b) => a.pos - b.pos || a.tieDir - b.tieDir);
  return positioned.map((p) => p.task);
}

// Mulberry32 PRNG so "shuffled" order is stable across runs for a given seed.
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildReviewQueue(
  states: Record<ItemKey, ReviewState>,
  now: number,
  order: ReviewOrder = "due",
): ReviewTask[] {
  const due: { task: ReviewTask; availableAt: number; stage: number }[] = [];

  for (const [cardId, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned || state.availableAt > now) continue;
    for (const task of wordTasks(cardId)) {
      due.push({ task, availableAt: state.availableAt, stage: state.stage });
    }
  }

  const byDue = (a: typeof due[number], b: typeof due[number]) =>
    a.availableAt - b.availableAt || (a.task.key < b.task.key ? -1 : 1);

  if (order === "shuffled") {
    return shuffleInterleaved(due.map((d) => d.task), now);
  }

  if (order === "apprentice_first") {
    due.sort((a, b) => {
      const aApp = isApprentice(a.stage);
      const bApp = isApprentice(b.stage);
      if (aApp !== bApp) return aApp ? -1 : 1;
      return byDue(a, b);
    });
    return due.map((d) => d.task);
  }

  due.sort(byDue);
  return due.map((d) => d.task);
}

export function buildLeechQueue(
  states: Record<ItemKey, ReviewState>,
  opts: { apprenticeOnly?: boolean } = {},
): ReviewTask[] {
  const leeches: { task: ReviewTask; incorrectCount: number }[] = [];

  for (const [cardId, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned) continue;
    if (state.incorrectCount < LEECH_INCORRECT_THRESHOLD) continue;
    if (opts.apprenticeOnly && !isApprentice(state.stage)) continue;
    for (const task of wordTasks(cardId)) {
      leeches.push({ task, incorrectCount: state.incorrectCount });
    }
  }

  leeches.sort(
    (a, b) =>
      b.incorrectCount - a.incorrectCount || (a.task.key < b.task.key ? -1 : 1),
  );
  return leeches.map((l) => l.task);
}

export function lessonsRemainingToday(
  cap: number | undefined,
  startedTodayCount: number,
): number {
  if (cap === undefined || cap <= 0) return Infinity;
  return Math.max(0, cap - startedTodayCount);
}

const LESSON_DIR_ORDER: Direction[] = ["en_nl", "nl_en"];

export function singleWordLessonTasks(cardId: string): ReviewTask[] {
  return LESSON_DIR_ORDER.map((dir) => ({ key: itemKey(cardId, dir), cardId, dir }));
}

export function buildLessonQueue(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  batchSize: number,
  unlocked?: Set<string>,
  seed?: number,
  pinned: string[] = [],
): ReviewTask[] {
  const isNew = (id: string) => {
    const state = states[id];
    return !state || state.stage === 0;
  };
  const byId = new Map(cards.map((c) => [c.id, c]));

  const picked: string[] = [];
  const pickedSet = new Set<string>();

  // Pinned words go first and bypass the level lock; all are kept even past batchSize.
  for (const id of pinned) {
    if (pickedSet.has(id) || !byId.has(id) || !isNew(id)) continue;
    picked.push(id);
    pickedSet.add(id);
  }

  for (const card of cards) {
    if (picked.length >= batchSize) break;
    if (pickedSet.has(card.id)) continue;
    if (unlocked && card.level && !unlocked.has(card.level)) continue;
    if (!isNew(card.id)) continue;
    picked.push(card.id);
    pickedSet.add(card.id);
  }

  const tasks = picked.flatMap(singleWordLessonTasks);
  return seed === undefined ? tasks : shuffleInterleaved(tasks, seed);
}

/** Fired once per word, when its final outstanding direction is cleared. */
export interface WordCompletion {
  cardId: string;
  passed: boolean;
}

export interface WordResult {
  cardId: string;
  passed: boolean;
  missedDirs: Direction[];
}

export interface Session {
  current(): ReviewTask | undefined;
  submit(wasCorrect: boolean): WordCompletion | undefined;
  next(): ReviewTask | undefined;
  /** The task that would be shown after the current one clears (queue[1]). */
  peekNext(): ReviewTask | undefined;
  done(): number;
  total(): number;
  remaining(): number;
  results(): WordResult[];
  isComplete(): boolean;
}

// Tasks stay per-direction (the quiz needs `dir`) but collapse to one word event:
// `passed` only if both directions were correct on the first try.
export function createSession(tasks: ReviewTask[]): Session {
  const queue = [...tasks];
  const firstTry = new Map<ItemKey, boolean>();
  const wordDirs = new Map<string, Set<Direction>>();
  const wordTaskKeys = new Map<string, Map<Direction, ItemKey>>();
  const wordOrder: string[] = [];

  for (const task of tasks) {
    if (!wordDirs.has(task.cardId)) {
      wordDirs.set(task.cardId, new Set());
      wordTaskKeys.set(task.cardId, new Map());
      wordOrder.push(task.cardId);
    }
    wordDirs.get(task.cardId)!.add(task.dir);
    wordTaskKeys.get(task.cardId)!.set(task.dir, task.key);
  }
  const clearedWords = new Set<string>();

  function missedDirsFor(cardId: string): Direction[] {
    const missed: Direction[] = [];
    for (const [dir, key] of wordTaskKeys.get(cardId)!) {
      if (firstTry.get(key) === false) missed.push(dir);
    }
    return missed;
  }

  return {
    current() {
      return queue[0];
    },
    submit(wasCorrect: boolean) {
      const task = queue[0];
      if (!task) return undefined;

      if (!firstTry.has(task.key)) firstTry.set(task.key, wasCorrect);

      queue.shift();
      if (!wasCorrect) {
        queue.push(task);
        return undefined;
      }

      const remaining = wordDirs.get(task.cardId)!;
      remaining.delete(task.dir);
      if (remaining.size > 0) return undefined;

      clearedWords.add(task.cardId);
      return { cardId: task.cardId, passed: missedDirsFor(task.cardId).length === 0 };
    },
    next() {
      return queue[0];
    },
    peekNext() {
      return queue[1];
    },
    done() {
      return clearedWords.size;
    },
    total() {
      return wordOrder.length;
    },
    remaining() {
      return queue.length;
    },
    results() {
      return wordOrder.map((cardId) => {
        const missedDirs = missedDirsFor(cardId);
        return { cardId, passed: missedDirs.length === 0, missedDirs };
      });
    },
    isComplete() {
      return queue.length === 0;
    },
  };
}
