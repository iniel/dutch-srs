import { buildTaalCompleetPath, buildInburgeringPath, buildPaths } from "./build";
import type { PathDef } from "./types";
import type { Card } from "../types";

function card(id: string, level?: string): Card {
  return { id, group: "g", level, dutch: id, english: [id], type: "word" };
}

describe("buildTaalCompleetPath", () => {
  it("makes one unit per level, in first-appearance order", () => {
    const cards = [card("a", "L1"), card("b", "L1"), card("c", "L2")];
    const path = buildTaalCompleetPath(cards);
    expect(path.id).toBe("taalcompleet");
    expect(path.units.map((u) => u.label)).toEqual(["L1", "L2"]);
    expect(path.units[0].cardIds).toEqual(["a", "b"]);
    expect(path.units[1].cardIds).toEqual(["c"]);
  });

  it("preserves card array order within a level", () => {
    const cards = [card("z", "L1"), card("a", "L1")];
    expect(buildTaalCompleetPath(cards).units[0].cardIds).toEqual(["z", "a"]);
  });

  it("omits cards without a level", () => {
    const cards = [card("a"), card("b", "L1")];
    const path = buildTaalCompleetPath(cards);
    expect(path.units).toHaveLength(1);
    expect(path.units[0].cardIds).toEqual(["b"]);
  });
});

describe("buildInburgeringPath", () => {
  const def: PathDef = {
    id: "inburgering",
    name: "Inburgering Online",
    unitSize: 2,
    difficulties: [
      { key: "easy", label: "Easy", cardIds: ["a", "b", "c"] },
      { key: "medium", label: "Medium", cardIds: ["d"] },
    ],
  };

  it("chunks each difficulty into units of unitSize, never spanning difficulties", () => {
    const cards = ["a", "b", "c", "d"].map((id) => card(id, "L1"));
    const path = buildInburgeringPath(cards, def);
    expect(path.id).toBe("inburgering");
    expect(path.name).toBe("Inburgering Online");
    expect(path.units.map((u) => u.label)).toEqual(["Easy 1", "Easy 2", "Medium 1"]);
    expect(path.units.map((u) => u.cardIds)).toEqual([["a", "b"], ["c"], ["d"]]);
  });

  it("drops ids not present in the card database", () => {
    const cards = [card("a", "L1"), card("d", "L1")];
    const path = buildInburgeringPath(cards, def);
    expect(path.units.map((u) => u.cardIds)).toEqual([["a"], ["d"]]);
  });

  it("skips difficulties left empty after filtering", () => {
    const cards = [card("d", "L1")];
    const path = buildInburgeringPath(cards, def);
    expect(path.units.map((u) => u.label)).toEqual(["Medium 1"]);
  });
});

describe("buildPaths", () => {
  it("returns TaalCompleet first, then defined paths", () => {
    const cards = [card("a", "L1")];
    const defs: PathDef[] = [
      { id: "inburgering", name: "Inburgering Online", unitSize: 100, difficulties: [{ key: "easy", label: "Easy", cardIds: ["a"] }] },
    ];
    const paths = buildPaths(cards, defs);
    expect(paths.map((p) => p.id)).toEqual(["taalcompleet", "inburgering"]);
  });
});
