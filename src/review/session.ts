import type { Direction, ItemKey, ReviewState } from "../types";
import { itemKey, DIRECTIONS, directionEnabled } from "../types";

/** Per-card list of directions the learner has switched off. */
export type DisabledDirections = Record<string, Direction[]>;

export interface ReviewTask {
  key: ItemKey;
  cardId: string;
  dir: Direction;
}

export type ReviewOrder = "due" | "shuffled" | "apprentice_first";

export const LEECH_INCORRECT_THRESHOLD = 3;

const APPRENTICE_MAX_STAGE = 4;

function wordTasks(cardId: string, disabled?: DisabledDirections): ReviewTask[] {
  return DIRECTIONS.filter((dir) => directionEnabled(disabled, cardId, dir)).map((dir) => ({
    key: itemKey(cardId, dir),
    cardId,
    dir,
  }));
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
  disabled?: DisabledDirections,
): ReviewTask[] {
  const due: { task: ReviewTask; availableAt: number; stage: number }[] = [];

  for (const [cardId, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned || state.availableAt > now) continue;
    for (const task of wordTasks(cardId, disabled)) {
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
  opts: { apprenticeOnly?: boolean; disabled?: DisabledDirections } = {},
): ReviewTask[] {
  const leeches: { task: ReviewTask; incorrectCount: number }[] = [];

  for (const [cardId, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned) continue;
    if (state.incorrectCount < LEECH_INCORRECT_THRESHOLD) continue;
    if (opts.apprenticeOnly && !isApprentice(state.stage)) continue;
    for (const task of wordTasks(cardId, opts.disabled)) {
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

export function singleWordLessonTasks(cardId: string, disabled?: DisabledDirections): ReviewTask[] {
  return LESSON_DIR_ORDER.filter((dir) => directionEnabled(disabled, cardId, dir)).map((dir) => ({
    key: itemKey(cardId, dir),
    cardId,
    dir,
  }));
}

/**
 * Build a lesson batch from an already path-filtered, unlock-filtered, ordered pool
 * of candidate card ids. Pinned words lead the batch and bypass the pool (so a pin
 * from a still-locked unit is still taught); all pins are kept even past `batchSize`.
 * Callers own path membership + unlock gating (see `src/paths/engine.ts`).
 */
export function buildLessonQueue(
  orderedCandidateIds: string[],
  states: Record<ItemKey, ReviewState>,
  batchSize: number,
  seed?: number,
  pinned: string[] = [],
  disabled?: DisabledDirections,
): ReviewTask[] {
  const isNew = (id: string) => {
    const state = states[id];
    return !state || state.stage === 0;
  };

  const picked: string[] = [];
  const pickedSet = new Set<string>();

  for (const id of pinned) {
    if (pickedSet.has(id) || !isNew(id)) continue;
    picked.push(id);
    pickedSet.add(id);
  }

  for (const id of orderedCandidateIds) {
    if (picked.length >= batchSize) break;
    if (pickedSet.has(id) || !isNew(id)) continue;
    picked.push(id);
    pickedSet.add(id);
  }

  const tasks = picked.flatMap((id) => singleWordLessonTasks(id, disabled));
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
  markCorrect(): WordCompletion | undefined;
  /**
   * Drop a direction from the running session (learner switched it off). Removes
   * its queued task(s) and stops counting it; returns a `WordCompletion` if this
   * was the word's last outstanding direction.
   */
  removeDirection(cardId: string, dir: Direction): WordCompletion | undefined;
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

  function clearCurrent(): WordCompletion | undefined {
    const task = queue.shift()!;
    const remaining = wordDirs.get(task.cardId)!;
    remaining.delete(task.dir);
    if (remaining.size > 0) return undefined;

    clearedWords.add(task.cardId);
    return { cardId: task.cardId, passed: missedDirsFor(task.cardId).length === 0 };
  }

  return {
    current() {
      return queue[0];
    },
    submit(wasCorrect: boolean) {
      const task = queue[0];
      if (!task) return undefined;

      if (!firstTry.has(task.key)) firstTry.set(task.key, wasCorrect);

      if (!wasCorrect) {
        queue.shift();
        queue.push(task);
        return undefined;
      }

      return clearCurrent();
    },
    markCorrect() {
      const task = queue[0];
      if (!task) return undefined;
      firstTry.set(task.key, true);
      return clearCurrent();
    },
    removeDirection(cardId: string, dir: Direction) {
      const remaining = wordDirs.get(cardId);
      if (!remaining) return undefined;
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].cardId === cardId && queue[i].dir === dir) queue.splice(i, 1);
      }
      remaining.delete(dir);
      // Drop it from the scoring maps so it is not counted as missed.
      wordTaskKeys.get(cardId)?.delete(dir);
      if (remaining.size > 0 || clearedWords.has(cardId)) return undefined;
      clearedWords.add(cardId);
      return { cardId, passed: missedDirsFor(cardId).length === 0 };
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
