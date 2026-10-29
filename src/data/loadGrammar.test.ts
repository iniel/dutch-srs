import { vi } from "vitest";
import { loadGrammarDrill } from "./loadGrammar";

afterEach(() => vi.unstubAllGlobals());

const good = { cardId: "c1", infinitive: "werken", aux: "hebben", participle: "gewerkt" };

it("loads the drill and drops malformed items", async () => {
  const items = [good, { ...good, cardId: "c2", aux: "worden" }, { cardId: "c3" }];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "perfectum", name: "Perfectum", items }) }));
  expect(await loadGrammarDrill()).toEqual({ id: "perfectum", name: "Perfectum", items: [good] });
});

it("yields null when the file is missing, unreachable or malformed", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  expect(await loadGrammarDrill()).toBeNull();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(await loadGrammarDrill()).toBeNull();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "perfectum", items: 3 }) }));
  expect(await loadGrammarDrill()).toBeNull();
});
