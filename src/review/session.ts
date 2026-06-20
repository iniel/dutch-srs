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

function taskFromKey(key: ItemKey): ReviewTask {
  const idx = key.lastIndexOf(":");
  return { key, cardId: key.slice(0, idx), dir: key.slice(idx + 1) as Direction };
}

function isApprentice(stage: number): boolean {
  return stage >= 1 && stage <= APPRENTICE_MAX_STAGE;
}

// Fully interleave all items, but keep EN→NL (production) before NL→EN
// (recognition) for the same word — clamp the pair's random weights so en_nl
// never sorts after its nl_en. The two need not be adjacent.
function shuffleKeepingDirOrder(tasks: ReviewTask[], seed: number): ReviewTask[] {
  const rand = seededRandom(seed);
  const weight = new Map<ItemKey, number>();
  for (const task of tasks) weight.set(task.key, rand());

  const byCard = new Map<string, ReviewTask[]>();
  for (const task of tasks) {
    const group = byCard.get(task.cardId) ?? [];
    group.push(task);
    byCard.set(task.cardId, group);
  }
  for (const group of byCard.values()) {
    const en = group.find((t) => t.dir === "en_nl");
    const nl = group.find((t) => t.dir === "nl_en");
    if (en && nl) {
      const lo = Math.min(weight.get(en.key)!, weight.get(nl.key)!);
      const hi = Math.max(weight.get(en.key)!, weight.get(nl.key)!);
      weight.set(en.key, lo);
      weight.set(nl.key, hi);
    }
  }

  return [...tasks].sort((a, b) => weight.get(a.key)! - weight.get(b.key)!);
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

  for (const [key, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned || state.availableAt > now) continue;
    due.push({ task: taskFromKey(key), availableAt: state.availableAt, stage: state.stage });
  }

  const byDue = (a: typeof due[number], b: typeof due[number]) =>
    a.availableAt - b.availableAt || (a.task.key < b.task.key ? -1 : 1);

  if (order === "shuffled") {
    return shuffleKeepingDirOrder(due.map((d) => d.task), now);
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

  for (const [key, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned) continue;
    if (state.incorrectCount < LEECH_INCORRECT_THRESHOLD) continue;
    if (opts.apprenticeOnly && !isApprentice(state.stage)) continue;
    leeches.push({ task: taskFromKey(key), incorrectCount: state.incorrectCount });
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

export function buildLessonQueue(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  batchSize: number,
  unlocked?: Set<string>,
  seed?: number,
): ReviewTask[] {
  const tasks: ReviewTask[] = [];
  let picked = 0;

  for (const card of cards) {
    if (picked >= batchSize) break;
    if (unlocked && card.level && !unlocked.has(card.level)) continue;
    const isNew = DIRECTIONS.some((dir) => {
      const state = states[itemKey(card.id, dir)];
      return !state || state.stage === 0;
    });
    if (!isNew) continue;

    for (const dir of LESSON_DIR_ORDER) {
      tasks.push({ key: itemKey(card.id, dir), cardId: card.id, dir });
    }
    picked++;
  }

  return seed === undefined ? tasks : shuffleKeepingDirOrder(tasks, seed);
}

export interface TaskResult {
  task: ReviewTask;
  correct: boolean;
}

export interface Session {
  current(): ReviewTask | undefined;
  submit(wasCorrect: boolean): void;
  next(): ReviewTask | undefined;
  done(): number;
  total(): number;
  remaining(): number;
  results(): TaskResult[];
  isComplete(): boolean;
}

export function createSession(tasks: ReviewTask[]): Session {
  const queue = [...tasks];
  const total = tasks.length;
  const firstTryCorrect = new Map<ItemKey, boolean>();
  const completed = new Set<ItemKey>();

  return {
    current() {
      return queue[0];
    },
    submit(wasCorrect: boolean) {
      const task = queue[0];
      if (!task) return;

      if (!firstTryCorrect.has(task.key)) {
        firstTryCorrect.set(task.key, wasCorrect);
      }

      queue.shift();
      if (wasCorrect) {
        completed.add(task.key);
      } else {
        queue.push(task);
      }
    },
    next() {
      return queue[0];
    },
    done() {
      return completed.size;
    },
    total() {
      return total;
    },
    remaining() {
      return queue.length;
    },
    results() {
      return [...firstTryCorrect.entries()].map(([key, correct]) => ({
        task: tasks.find((t) => t.key === key)!,
        correct,
      }));
    },
    isComplete() {
      return queue.length === 0;
    },
  };
}
