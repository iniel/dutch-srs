import { describe, it, expect } from "vitest";
import { upsertPath } from "./paths-file.mjs";

describe("path generators coexist", () => {
  it("preserves other paths and keeps Inburgering first regardless of generation order", () => {
    const io = { id: "inburgering", difficulties: [], unitSize: 100 };
    const nig = { id: "nederlands-in-gang", units: [] };
    const first = upsertPath(upsertPath({ version: 1, paths: [] }, nig), io);
    expect(first.paths).toEqual([io, nig]);
    expect(upsertPath(upsertPath(first, nig), io)).toEqual(first);
  });
});
