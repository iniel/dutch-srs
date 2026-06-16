import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../types";
import { indexCards, loadCards } from "./loadCards";

const card = (id: string, group: string): Card => ({
  id,
  group,
  dutch: id,
  english: [id],
  type: "word",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadCards", () => {
  it("fetches and parses the cards array", async () => {
    const cards = [card("a", "g1"), card("b", "g1")];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(cards), { status: 200 })),
    );
    await expect(loadCards()).resolves.toEqual(cards);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404, statusText: "Not Found" })),
    );
    await expect(loadCards()).rejects.toThrow(/Failed to load cards/);
  });

  it("throws when payload is not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ nope: true }), { status: 200 })),
    );
    await expect(loadCards()).rejects.toThrow(/expected an array/);
  });
});

describe("indexCards", () => {
  it("indexes by id, preserves group order, and buckets by group", () => {
    const cards = [card("a", "g2"), card("b", "g1"), card("c", "g2")];
    const { byId, groups, byGroup } = indexCards(cards);

    expect(byId.get("b")).toEqual(card("b", "g1"));
    expect(groups).toEqual(["g2", "g1"]);
    expect(byGroup.get("g2")).toEqual([card("a", "g2"), card("c", "g2")]);
    expect(byGroup.get("g1")).toEqual([card("b", "g1")]);
  });

  it("handles an empty card list", () => {
    const { byId, groups, byGroup } = indexCards([]);
    expect(byId.size).toBe(0);
    expect(groups).toEqual([]);
    expect(byGroup.size).toBe(0);
  });
});
