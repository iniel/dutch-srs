import { beforeEach, expect, it } from "vitest";
import { READER_KEY, loadReaderPosition, saveReaderPosition } from "./reader";

beforeEach(() => localStorage.clear());

it("round-trips the reading position", () => {
  expect(loadReaderPosition()).toBeNull();
  saveReaderPosition({ book: "hpmor", chapter: 1, blockId: "b015" });
  expect(loadReaderPosition()).toEqual({ book: "hpmor", chapter: 1, blockId: "b015" });
});

it("ignores corrupt or incomplete data", () => {
  localStorage.setItem(READER_KEY, "{not json");
  expect(loadReaderPosition()).toBeNull();
  localStorage.setItem(READER_KEY, JSON.stringify({ book: "hpmor", chapter: "1" }));
  expect(loadReaderPosition()).toBeNull();
  localStorage.setItem(READER_KEY, JSON.stringify({ book: "hpmor", chapter: 3 }));
  expect(loadReaderPosition()).toEqual({ book: "hpmor", chapter: 3, blockId: null });
});
