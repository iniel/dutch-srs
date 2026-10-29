import type { ReviewState } from "../types";
import {
  GRAMMAR_STORAGE_KEY,
  coerceGrammar,
  drillStates,
  importGrammar,
  loadGrammar,
  resetGrammar,
  saveGrammar,
  setDrillState,
} from "./grammar";
import { STORAGE_KEY, exportProgress, loadProgress } from "./progress";

const st = (stage: number, lastReviewedAt = 0): ReviewState => ({
  stage,
  availableAt: 0,
  lastReviewedAt,
  incorrectCount: 0,
  burned: false,
});

beforeEach(() => localStorage.clear());

describe("coerceGrammar", () => {
  it("returns empty data for garbage", () => {
    for (const bad of [null, 42, "x", [], { drills: 5 }]) {
      expect(coerceGrammar(bad)).toEqual({ version: 1, drills: {} });
    }
  });

  it("drops invalid states and malformed drills", () => {
    const data = coerceGrammar({
      version: 1,
      drills: {
        perfectum: { states: { c1: st(2), c2: { stage: "x" }, c3: null } },
        broken: { states: 7 },
        alsoBroken: null,
      },
    });
    expect(data).toEqual({ version: 1, drills: { perfectum: { states: { c1: st(2) } } } });
  });
});

describe("drillStates / setDrillState", () => {
  it("reads an unknown drill as empty", () => {
    expect(drillStates({ version: 1, drills: {} }, "perfectum")).toEqual({});
  });

  it("sets a state without mutating the input", () => {
    const before = { version: 1 as const, drills: { perfectum: { states: { c1: st(1) } } } };
    const after = setDrillState(before, "perfectum", "c2", st(3));
    expect(drillStates(after, "perfectum")).toEqual({ c1: st(1), c2: st(3) });
    expect(drillStates(before, "perfectum")).toEqual({ c1: st(1) });
    expect(drillStates(setDrillState(before, "other", "c9", st(1)), "other")).toEqual({ c9: st(1) });
  });
});

describe("load / save / reset", () => {
  it("round-trips through its own key and leaves vocab progress alone", () => {
    localStorage.setItem(STORAGE_KEY, "vocab");
    const data = setDrillState({ version: 1, drills: {} }, "perfectum", "c1", st(2));
    saveGrammar(data);
    expect(loadGrammar()).toEqual(data);
    expect(JSON.parse(localStorage.getItem(GRAMMAR_STORAGE_KEY)!)).toEqual(data);
    expect(resetGrammar()).toEqual({ version: 1, drills: {} });
    expect(localStorage.getItem(GRAMMAR_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("vocab");
  });

  it("loads empty data from missing or corrupt storage", () => {
    expect(loadGrammar()).toEqual({ version: 1, drills: {} });
    localStorage.setItem(GRAMMAR_STORAGE_KEY, "{not json");
    expect(loadGrammar()).toEqual({ version: 1, drills: {} });
  });

  it("moves states of merged cards onto their target and keeps the more advanced one", () => {
    saveGrammar({
      version: 1,
      drills: { perfectum: { states: { c10162: st(4), c403: st(2), c10163: st(1) } } },
    });
    const loaded = loadGrammar();
    expect(drillStates(loaded, "perfectum")).toEqual({ c403: st(4), c27: st(1) });
    expect(JSON.parse(localStorage.getItem(GRAMMAR_STORAGE_KEY)!)).toEqual(loaded);
  });
});

describe("importGrammar", () => {
  it("round-trips grammar through a progress export", () => {
    const grammar = setDrillState({ version: 1, drills: {} }, "perfectum", "c1", st(3));
    expect(importGrammar(exportProgress(loadProgress(), grammar))).toEqual(grammar);
  });

  it("returns null for a file exported before grammar existed", () => {
    expect(importGrammar(exportProgress(loadProgress()))).toBeNull();
    expect(importGrammar("{garbage")).toBeNull();
  });

  it("redirects merged cards in an imported file", () => {
    const json = JSON.stringify({ version: 2, states: {}, grammar: { version: 1, drills: { perfectum: { states: { c10162: st(4) } } } } });
    expect(drillStates(importGrammar(json)!, "perfectum")).toEqual({ c403: st(4) });
  });
});
