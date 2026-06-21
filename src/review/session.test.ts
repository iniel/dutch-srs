import {
  buildReviewQueue,
  buildLessonQueue,
  buildLeechQueue,
  lessonsRemainingToday,
  createSession,
  LEECH_INCORRECT_THRESHOLD,
  type ReviewTask,
} from "./session";
import type { Card, ReviewState } from "../types";

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

// Both directions of each word, in queue insertion order (en_nl before nl_en).
function tasksFor(...ids: string[]): ReviewTask[] {
  return ids.flatMap((id) => [
    { key: `${id}:en_nl`, cardId: id, dir: "en_nl" as const },
    { key: `${id}:nl_en`, cardId: id, dir: "nl_en" as const },
  ]);
}

const NOW = 1000;

describe("buildReviewQueue", () => {
  it("includes both directions of due, non-burned, stage>=1 words", () => {
    const states: Record<string, ReviewState> = {
      a: state({ stage: 1, availableAt: 500 }),
      b: state({ stage: 0, availableAt: 500 }),
      c: state({ stage: 3, availableAt: 2000 }),
      d: state({ stage: 9, availableAt: 500, burned: true }),
    };
    const queue = buildReviewQueue(states, NOW);
    expect(queue.map((t) => t.key)).toEqual(["a:en_nl", "a:nl_en"]);
  });

  it("sorts by availableAt then key, keeping a word's directions together", () => {
    const states: Record<string, ReviewState> = {
      b: state({ availableAt: 100 }),
      a: state({ availableAt: 100 }),
      c: state({ availableAt: 50 }),
    };
    const queue = buildReviewQueue(states, NOW);
    expect(queue.map((t) => t.cardId)).toEqual(["c", "c", "a", "a", "b", "b"]);
  });

  it("builds per-direction tasks from a cardId", () => {
    const states: Record<string, ReviewState> = {
      "card-1": state({ availableAt: 0 }),
    };
    const tasks = buildReviewQueue(states, NOW);
    expect(tasks.map((t) => t.dir).sort()).toEqual(["en_nl", "nl_en"]);
    expect(tasks.every((t) => t.cardId === "card-1")).toBe(true);
  });
});

describe("buildLessonQueue", () => {
  it("emits both directions for new words up to batchSize words", () => {
    const cards = [card("a"), card("b"), card("c")];
    const queue = buildLessonQueue(cards, {}, 2);
    expect(queue).toHaveLength(4);
    expect(queue.map((t) => t.key)).toEqual([
      "a:en_nl",
      "a:nl_en",
      "b:en_nl",
      "b:nl_en",
    ]);
  });

  it("interleaves words with a seed, keeping en_nl before nl_en per word", () => {
    const cards = [card("a"), card("b"), card("c"), card("d")];
    const order = buildLessonQueue(cards, {}, 5, undefined, 42).map((t) => t.key);
    expect([...order].sort()).toEqual(
      [
        "a:en_nl",
        "a:nl_en",
        "b:en_nl",
        "b:nl_en",
        "c:en_nl",
        "c:nl_en",
        "d:en_nl",
        "d:nl_en",
      ].sort(),
    );
    for (const id of ["a", "b", "c", "d"]) {
      expect(order.indexOf(`${id}:en_nl`)).toBeLessThan(order.indexOf(`${id}:nl_en`));
    }
  });

  it("does not glue a word's two directions together", () => {
    const cards = [card("a"), card("b"), card("c"), card("d")];
    const order = buildLessonQueue(cards, {}, 5, undefined, 42).map((t) => t.key);
    const interleaved = order.some(
      (key, i) => i > 0 && key.split(":")[0] !== order[i - 1].split(":")[0],
    );
    const someNonAdjacent = ["a", "b", "c", "d"].some(
      (id) => order.indexOf(`${id}:nl_en`) - order.indexOf(`${id}:en_nl`) > 1,
    );
    expect(interleaved).toBe(true);
    expect(someNonAdjacent).toBe(true);
  });

  it("skips words already started (stage>0)", () => {
    const cards = [card("a"), card("b")];
    const states: Record<string, ReviewState> = { a: state({ stage: 2 }) };
    const queue = buildLessonQueue(cards, states, 5);
    expect(queue.map((t) => t.cardId)).toEqual(["b", "b"]);
  });

  it("includes a word still at stage 0", () => {
    const cards = [card("a")];
    const states: Record<string, ReviewState> = { a: state({ stage: 0 }) };
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
  it("returns a completion only when a word's last direction clears", () => {
    const s = createSession(tasksFor("a", "b"));
    expect(s.total()).toBe(2);
    expect(s.current()?.key).toBe("a:en_nl");

    expect(s.submit(true)).toBeUndefined(); // a:en_nl cleared, a still has nl_en
    expect(s.done()).toBe(0);
    expect(s.submit(true)).toEqual({ cardId: "a", passed: true }); // a:nl_en clears word a
    expect(s.done()).toBe(1);

    expect(s.submit(true)).toBeUndefined(); // b:en_nl
    expect(s.submit(true)).toEqual({ cardId: "b", passed: true }); // b complete
    expect(s.done()).toBe(2);
    expect(s.isComplete()).toBe(true);
  });

  it("fails the word if any direction was wrong on first try", () => {
    const s = createSession(tasksFor("a", "b"));
    s.submit(true); // a:en_nl correct
    expect(s.submit(false)).toBeUndefined(); // a:nl_en wrong, requeued to back
    expect(s.remaining()).toBe(3); // b:en_nl, b:nl_en, requeued a:nl_en
    s.submit(true); // b:en_nl
    s.submit(true); // b:nl_en -> b complete
    expect(s.submit(true)).toEqual({ cardId: "a", passed: false }); // requeued a:nl_en now correct
    const results = s.results();
    const a = results.find((r) => r.cardId === "a")!;
    const b = results.find((r) => r.cardId === "b")!;
    expect(a.passed).toBe(false);
    expect(a.missedDirs).toEqual(["nl_en"]);
    expect(b.passed).toBe(true);
  });

  it("requeues a wrong task to the back; remaining counts tasks", () => {
    const s = createSession(tasksFor("a"));
    expect(s.remaining()).toBe(2);
    expect(s.submit(false)).toBeUndefined(); // a:en_nl wrong -> back of queue
    expect(s.current()?.key).toBe("a:nl_en");
    expect(s.remaining()).toBe(2);
    s.submit(true); // a:nl_en
    expect(s.submit(true)).toEqual({ cardId: "a", passed: false }); // requeued a:en_nl
    expect(s.isComplete()).toBe(true);
  });

  it("total is word-based, done counts cleared words", () => {
    const s = createSession(tasksFor("a", "b"));
    expect(s.total()).toBe(2);
    expect(s.done()).toBe(0);
    s.submit(true);
    s.submit(true); // a done
    s.submit(true);
    s.submit(true); // b done
    expect(s.done()).toBe(2);
    expect(s.isComplete()).toBe(true);
  });

  it("submit is a no-op (returns undefined) on an empty queue", () => {
    const s = createSession([]);
    expect(s.submit(true)).toBeUndefined();
    expect(s.isComplete()).toBe(true);
  });
});

describe("buildReviewQueue order", () => {
  const states: Record<string, ReviewState> = {
    g: state({ stage: 6, availableAt: 100 }),
    a: state({ stage: 1, availableAt: 300 }),
    b: state({ stage: 5, availableAt: 200 }),
    c: state({ stage: 2, availableAt: 400 }),
  };

  it("defaults to due order (availableAt then key)", () => {
    expect(buildReviewQueue(states, NOW).map((t) => t.cardId)).toEqual([
      "g", "g", "b", "b", "a", "a", "c", "c",
    ]);
  });

  it("apprentice_first puts stages 1-4 ahead, then by due", () => {
    expect(buildReviewQueue(states, NOW, "apprentice_first").map((t) => t.cardId)).toEqual([
      "a", "a", "c", "c", "g", "g", "b", "b",
    ]);
  });

  it("shuffled is deterministic for a given now", () => {
    const first = buildReviewQueue(states, NOW, "shuffled").map((t) => t.key);
    const again = buildReviewQueue(states, NOW, "shuffled").map((t) => t.key);
    expect(first).toEqual(again);
    expect(first).toHaveLength(8);
    expect(new Set(first.map((k) => k.split(":")[0])).size).toBe(4);
  });

  it("shuffled order varies with the seed (now)", () => {
    const at1 = buildReviewQueue(states, 1, "shuffled").map((t) => t.key);
    const at2 = buildReviewQueue(states, 999999, "shuffled").map((t) => t.key);
    expect(at1).not.toEqual(at2);
  });

  it("shuffled keeps en_nl before nl_en for the same word", () => {
    const both: Record<string, ReviewState> = {
      a: state({ availableAt: 0 }),
      b: state({ availableAt: 0 }),
    };
    const order = buildReviewQueue(both, NOW, "shuffled").map((t) => t.key);
    expect(order.indexOf("a:en_nl")).toBeLessThan(order.indexOf("a:nl_en"));
    expect(order.indexOf("b:en_nl")).toBeLessThan(order.indexOf("b:nl_en"));
  });
});

describe("buildLeechQueue", () => {
  it("includes both directions of stage>=1, non-burned words at/above the threshold", () => {
    const states: Record<string, ReviewState> = {
      a: state({ stage: 2, incorrectCount: LEECH_INCORRECT_THRESHOLD }),
      b: state({ stage: 2, incorrectCount: LEECH_INCORRECT_THRESHOLD - 1 }),
      c: state({ stage: 0, incorrectCount: 10 }),
      d: state({ stage: 9, incorrectCount: 10, burned: true }),
    };
    expect(buildLeechQueue(states).map((t) => t.key)).toEqual(["a:en_nl", "a:nl_en"]);
  });

  it("orders by incorrectCount desc then key", () => {
    const states: Record<string, ReviewState> = {
      b: state({ stage: 2, incorrectCount: 5 }),
      a: state({ stage: 2, incorrectCount: 5 }),
      c: state({ stage: 2, incorrectCount: 9 }),
    };
    expect(buildLeechQueue(states).map((t) => t.key)).toEqual([
      "c:en_nl", "c:nl_en", "a:en_nl", "a:nl_en", "b:en_nl", "b:nl_en",
    ]);
  });

  it("apprenticeOnly keeps only stages 1-4", () => {
    const states: Record<string, ReviewState> = {
      app: state({ stage: 4, incorrectCount: 4 }),
      guru: state({ stage: 5, incorrectCount: 4 }),
    };
    expect(buildLeechQueue(states, { apprenticeOnly: true }).map((t) => t.key)).toEqual([
      "app:en_nl", "app:nl_en",
    ]);
    expect(buildLeechQueue(states).map((t) => t.key)).toEqual([
      "app:en_nl", "app:nl_en", "guru:en_nl", "guru:nl_en",
    ]);
  });
});

describe("buildLessonQueue gating", () => {
  function card(id: string, level?: string): Card {
    return { id, group: "g", level, dutch: id, english: [id], type: "word" };
  }

  it("excludes words whose level is not unlocked", () => {
    const cards = [card("a", "A1 · U1"), card("b", "A1 · U2")];
    const tasks = buildLessonQueue(cards, {}, 10, new Set(["A1 · U1"]));
    expect(tasks.map((t) => t.cardId)).toEqual(["a", "a"]);
  });

  it("includes a word with no level even when gated", () => {
    const cards = [card("a")];
    const tasks = buildLessonQueue(cards, {}, 10, new Set(["A1 · U1"]));
    expect(tasks.map((t) => t.cardId)).toEqual(["a", "a"]);
  });

  it("ignores the gate when unlocked is omitted", () => {
    const cards = [card("a", "A1 · U2")];
    const tasks = buildLessonQueue(cards, {}, 10);
    expect(tasks.length).toBe(2);
  });
});

describe("lessonsRemainingToday", () => {
  it("returns the cap minus what was already started", () => {
    expect(lessonsRemainingToday(15, 0)).toBe(15);
    expect(lessonsRemainingToday(15, 10)).toBe(5);
  });

  it("never goes negative", () => {
    expect(lessonsRemainingToday(15, 20)).toBe(0);
  });

  it("treats no cap (undefined or <=0) as unlimited", () => {
    expect(lessonsRemainingToday(undefined, 100)).toBe(Infinity);
    expect(lessonsRemainingToday(0, 5)).toBe(Infinity);
  });
});
