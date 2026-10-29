import type { Card, ReviewState } from "../types";
import type { GrammarDrill } from "../grammar/types";
import { indexCards } from "../data/loadCards";
import { drillGroups } from "./WordList";

const st = (stage: number): ReviewState => ({
  stage,
  availableAt: 0,
  lastReviewedAt: 0,
  incorrectCount: 0,
  burned: stage === 9,
});

const ids = ["c1", "c2", "c3", "c4", "c5", "c6"];
const cards = ids.map((id): Card => ({ id, group: "g", dutch: `nl-${id}`, english: [`en-${id}`], type: "word" }));
const index = { cards, ...indexCards(cards) };
const drill: GrammarDrill = {
  id: "perfectum",
  name: "Perfectum",
  items: ids.map((cardId) => ({ cardId, infinitive: `inf-${cardId}`, aux: "hebben", participle: `ge-${cardId}` })),
};

describe("drillGroups", () => {
  it("groups by grammar stage, then not started (known in vocab) in lesson order", () => {
    const grammar = { c1: st(5), c2: st(1) };
    const vocab = { c3: st(1), c5: st(4), c2: st(3) };
    const groups = drillGroups(index, drill, grammar, vocab);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.cardId)])).toEqual([
      ["Apprentice I", ["c2"]],
      ["Guru I", ["c1"]],
      ["Not started", ["c5", "c3"]],
    ]);
    expect(groups[0].items[0]).toMatchObject({ dutch: "inf-c2", english: "heeft ge-c2 · en-c2" });
  });
});
