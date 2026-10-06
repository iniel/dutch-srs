import { validPathDef, loadPaths } from "./loadPaths";
import { vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it("loads legacy and chapter paths while ignoring malformed definitions", async () => {
  const io = { id: "inburgering", name: "Inburgering Online", unitSize: 100, difficulties: [] };
  const nig = { id: "nederlands-in-gang", name: "Nederlands in gang", units: [{ id: "ch1", label: "Hoofdstuk 1", cardIds: ["c1"] }] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, paths: [io, nig, { id: "broken" }] }) }));
  expect(await loadPaths()).toEqual([io, nig]);
  expect(validPathDef({ ...io, unitSize: 0 })).toBe(false);
  expect(validPathDef({ ...nig, units: [{ id: "ch1", label: "bad", cardIds: [123] }] })).toBe(false);
});
