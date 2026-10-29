import type { ReviewState } from "../types";
import type { GrammarDrill } from "./types";
import { drillSummary, grammarLessonIds, grammarLessonTasks, grammarReviewTasks } from "./queue";

const NOW = 1_000_000;

const st = (stage: number, availableAt = 0, burned = false): ReviewState => ({
  stage,
  availableAt,
  lastReviewedAt: 0,
  incorrectCount: 0,
  burned,
});

const drill: GrammarDrill = {
  id: "perfectum",
  name: "Perfectum",
  items: ["c1", "c2", "c3", "c4", "c5"].map((cardId) => ({
    cardId,
    infinitive: `inf-${cardId}`,
    aux: "hebben",
    participle: `part-${cardId}`,
  })),
};

describe("grammarLessonIds", () => {
  it("offers only words started in vocab and not yet started in grammar", () => {
    const vocab = { c1: st(2), c2: st(0), c4: st(3), c5: st(1) };
    const grammar = { c4: st(1), c5: st(0) };
    expect(grammarLessonIds(drill, grammar, vocab, 10)).toEqual(["c1", "c5"]);
  });

  it("orders by vocab stage descending, ties in drill order, then applies the limit", () => {
    const vocab = { c1: st(2), c2: st(5), c3: st(2), c4: st(9, 0, true), c5: st(1) };
    expect(grammarLessonIds(drill, {}, vocab, 3)).toEqual(["c4", "c2", "c1"]);
    expect(grammarLessonIds(drill, {}, vocab, 10)).toEqual(["c4", "c2", "c1", "c3", "c5"]);
  });
});

describe("grammarReviewTasks", () => {
  it("returns due, started, unburned items in due order", () => {
    const grammar = {
      c1: st(2, NOW - 10),
      c2: st(3, NOW - 100),
      c3: st(0, 0),
      c4: st(9, 0, true),
      c5: st(4, NOW + 1),
    };
    expect(grammarReviewTasks(drill, grammar, NOW)).toEqual([
      { key: "c2:nl_en", cardId: "c2", dir: "nl_en" },
      { key: "c1:nl_en", cardId: "c1", dir: "nl_en" },
    ]);
  });
});

describe("grammarLessonTasks", () => {
  it("makes one nl_en task per card", () => {
    expect(grammarLessonTasks(["c3", "c1"])).toEqual([
      { key: "c3:nl_en", cardId: "c3", dir: "nl_en" },
      { key: "c1:nl_en", cardId: "c1", dir: "nl_en" },
    ]);
  });
});

describe("drillSummary", () => {
  it("counts known words, guru items, the ring, lessons and due reviews", () => {
    const vocab = { c1: st(1), c2: st(4), c3: st(6), c4: st(0) };
    const grammar = { c1: st(5, NOW + 1), c2: st(2, NOW), c4: st(7, NOW) };
    expect(drillSummary(drill, grammar, vocab, NOW)).toEqual({
      known: 3,
      guru: 1,
      ringPct: 1 / 3,
      lessonsAvailable: 1,
      reviewsDue: 2,
    });
  });

  it("reports an empty ring when no words are known", () => {
    expect(drillSummary(drill, {}, {}, NOW).ringPct).toBe(0);
  });
});
