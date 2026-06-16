import type { Card, Direction, ItemKey, ReviewState } from "../types";
import { itemKey, DIRECTIONS } from "../types";

export interface ReviewTask {
  key: ItemKey;
  cardId: string;
  dir: Direction;
}

export function buildReviewQueue(
  states: Record<ItemKey, ReviewState>,
  now: number,
): ReviewTask[] {
  const due: { task: ReviewTask; availableAt: number }[] = [];

  for (const [key, state] of Object.entries(states)) {
    if (state.stage < 1 || state.burned || state.availableAt > now) continue;
    const idx = key.lastIndexOf(":");
    due.push({
      task: {
        key,
        cardId: key.slice(0, idx),
        dir: key.slice(idx + 1) as Direction,
      },
      availableAt: state.availableAt,
    });
  }

  due.sort(
    (a, b) =>
      a.availableAt - b.availableAt || (a.task.key < b.task.key ? -1 : 1),
  );
  return due.map((d) => d.task);
}

export function buildLessonQueue(
  cards: Card[],
  states: Record<ItemKey, ReviewState>,
  batchSize: number,
): ReviewTask[] {
  const tasks: ReviewTask[] = [];
  let picked = 0;

  for (const card of cards) {
    if (picked >= batchSize) break;
    const isNew = DIRECTIONS.some((dir) => {
      const state = states[itemKey(card.id, dir)];
      return !state || state.stage === 0;
    });
    if (!isNew) continue;

    for (const dir of DIRECTIONS) {
      tasks.push({ key: itemKey(card.id, dir), cardId: card.id, dir });
    }
    picked++;
  }

  return tasks;
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
