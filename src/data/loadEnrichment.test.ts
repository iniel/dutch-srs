import { describe, it, expect, vi, afterEach } from "vitest";
import { loadEnrichment } from "./loadEnrichment";

const stubFetch = (impl: () => Promise<Response> | Response) => {
  vi.stubGlobal("fetch", vi.fn(impl));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadEnrichment", () => {
  it("maps a keyed object into a Map", async () => {
    stubFetch(() =>
      new Response(JSON.stringify({ c0: { id: "c0", match: { source: "kaikki" } } }), { status: 200 }),
    );
    const map = await loadEnrichment();
    expect(map.get("c0")).toMatchObject({ id: "c0" });
  });

  it("returns empty map on 404", async () => {
    stubFetch(() => new Response("not found", { status: 404 }));
    expect((await loadEnrichment()).size).toBe(0);
  });

  it("returns empty map on network error", async () => {
    stubFetch(() => Promise.reject(new Error("offline")));
    expect((await loadEnrichment()).size).toBe(0);
  });

  it("rejects a non-object payload", async () => {
    stubFetch(() => new Response(JSON.stringify([1, 2, 3]), { status: 200 }));
    expect((await loadEnrichment()).size).toBe(0);
  });
});
