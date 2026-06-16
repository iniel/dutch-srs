import {
  buildReviewQueue,
  buildLessonQueue,
  createSession,
  type ReviewTask,
} from "./session";
import type { Card, ItemKey, ReviewState } from "../types";
import { itemKey } from "../types";

function state(partial: Partial<ReviewState>): ReviewState {
  return {
    stage: 1,
    availableAt: 0,
    lastReviewedAt: 0,
    incorrectCount: 0,
    burned: false,
    ...partial,
  };
}

function card(id: string, group = "g1"): Card {
  return { id, group, dutch: id, english: [id], type: "word" };
}

const NOW = 1000;

describe("buildReviewQueue", () => {
  it("includes only due, non-burned, stage>=1 items", () => {
    const states: Record<ItemKey, ReviewState> = {
      "a:nl_en": state({ stage: 1, availableAt: 500 }),
      "b:nl_en": state({ stage: 0, availableAt: 500 }),
      "c:nl_en": state({ stage: 3, availableAt: 2000 }),
      "d:nl_en": state({ stage: 9, availableAt: 500, burned: true }),
    };
    const queue = buildReviewQueue(states, NOW);
    expect(queue.map((t) => t.key)).toEqual(["a:nl_en"]);
  });

  it("sorts by availableAt then key", () => {
    const states: Record<ItemKey, ReviewState> = {
      "b:nl_en": state({ availableAt: 100 }),
      "a:nl_en": state({ availableAt: 100 }),
      "c:nl_en": state({ availableAt: 50 }),
    };
    const queue = buildReviewQueue(states, NOW);
    expect(queue.map((t) => t.key)).toEqual(["c:nl_en", "a:nl_en", "b:nl_en"]);
  });

  it("parses cardId and dir", () => {
    const states: Record<ItemKey, ReviewState> = {
      "card-1:en_nl": state({ availableAt: 0 }),
    };
    const [task] = buildReviewQueue(states, NOW);
    expect(task.cardId).toBe("card-1");
    expect(task.dir).toBe("en_nl");
  });
});

describe("buildLessonQueue", () => {
  it("emits both directions for new cards up to batchSize cards", () => {
    const cards = [card("a"), card("b"), card("c")];
    const queue = buildLessonQueue(cards, {}, 2);
    expect(queue).toHaveLength(4);
    expect(queue.map((t) => t.key)).toEqual([
      "a:nl_en",
      "a:en_nl",
      "b:nl_en",
      "b:en_nl",
    ]);
  });

  it("skips cards already started (both directions stage>0)", () => {
    const cards = [card("a"), card("b")];
    const states: Record<ItemKey, ReviewState> = {
      [itemKey("a", "nl_en")]: state({ stage: 2 }),
      [itemKey("a", "en_nl")]: state({ stage: 2 }),
    };
    const queue = buildLessonQueue(cards, states, 5);
    expect(queue.map((t) => t.cardId)).toEqual(["b", "b"]);
  });

  it("includes a card if either direction is still new", () => {
    const cards = [card("a")];
    const states: Record<ItemKey, ReviewState> = {
      [itemKey("a", "nl_en")]: state({ stage: 2 }),
    };
    const queue = buildLessonQueue(cards, states, 5);
    expect(queue).toHaveLength(2);
  });

  it("preserves group order from the cards array", () => {
    const cards = [card("z"), card("a")];
    const queue = buildLessonQueue(cards, {}, 5);
    expect(queue.map((t) => t.cardId)).toEqual(["z", "z", "a", "a"]);
  });
});

describe("createSession", () => {
  const tasks: ReviewTask[] = [
    { key: "a:nl_en", cardId: "a", dir: "nl_en" },
    { key: "b:nl_en", cardId: "b", dir: "nl_en" },
  ];

  it("removes current task on correct answer", () => {
    const s = createSession(tasks);
    expect(s.current()?.key).toBe("a:nl_en");
    s.submit(true);
    expect(s.current()?.key).toBe("b:nl_en");
    expect(s.done()).toBe(1);
    expect(s.remaining()).toBe(1);
  });

  it("requeues current task to the back on incorrect answer", () => {
    const s = createSession(tasks);
    s.submit(false);
    expect(s.current()?.key).toBe("b:nl_en");
    expect(s.remaining()).toBe(2);
    s.submit(true);
    expect(s.current()?.key).toBe("a:nl_en");
    s.submit(true);
    expect(s.isComplete()).toBe(true);
  });

  it("records first-try correctness", () => {
    const s = createSession(tasks);
    s.submit(false); // a wrong on first try
    s.submit(true); // b correct first try
    s.submit(true); // a now correct, but first try was wrong
    const results = s.results();
    const byKey = Object.fromEntries(results.map((r) => [r.task.key, r.correct]));
    expect(byKey["a:nl_en"]).toBe(false);
    expect(byKey["b:nl_en"]).toBe(true);
  });

  it("tracks total and done counts", () => {
    const s = createSession(tasks);
    expect(s.total()).toBe(2);
    expect(s.done()).toBe(0);
    s.submit(true);
    s.submit(true);
    expect(s.done()).toBe(2);
    expect(s.isComplete()).toBe(true);
  });

  it("submit is a no-op on empty queue", () => {
    const s = createSession([]);
    expect(() => s.submit(true)).not.toThrow();
    expect(s.isComplete()).toBe(true);
  });
});
