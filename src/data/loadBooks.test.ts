import { afterEach, expect, it, vi } from "vitest";
import { loadBooksIndex, loadChapter, validBooksIndex } from "./loadBooks";

afterEach(() => vi.unstubAllGlobals());

const chapterRef = { n: 1, title: "Een dag", words: 10, file: "hpmor/ch001.json" };

it("loads the books index and drops books without chapters", async () => {
  const index = { version: 1, books: [{ id: "hpmor", title: "HPMOR", chapters: [chapterRef] }, { id: "empty", title: "E", chapters: [] }] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => index }));
  expect(await loadBooksIndex()).toEqual({ version: 1, books: [index.books[0]] });
});

it("yields null for a missing or malformed index", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
  expect(await loadBooksIndex()).toBeNull();
  expect(validBooksIndex({ books: [{ id: "x", title: "X", chapters: [{ n: "1", title: "t", file: "f" }] }] })).toBe(false);
});

it("caches a loaded chapter and retries after a failure", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
    .mockResolvedValue({ ok: true, json: async () => ({ book: "hpmor", chapter: 2, blocks: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  await expect(loadChapter("hpmor/ch002.json")).rejects.toThrow("HTTP 404");
  await new Promise((r) => setTimeout(r, 0));
  expect((await loadChapter("hpmor/ch002.json")).chapter).toBe(2);
  await loadChapter("hpmor/ch002.json");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
