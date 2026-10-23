import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(join(root, path), "utf8"));
const indexFile = "public/books/index.json";

describe.runIf(existsSync(join(root, indexFile)))("shipped reader books", () => {
  const ids = new Set(read("public/cards.json").map(c => c.id));
  const index = read(indexFile);
  const chapters = index.books.flatMap(b => b.chapters.map(ref => ({ book: b, ref, data: read(`public/books/${ref.file}`) })));

  it("lists only chapter files that exist and match their index entry", () => {
    for (const { book, ref, data } of chapters) {
      expect(data.book).toBe(book.id);
      expect(data.chapter).toBe(ref.n);
      expect(data.blocks.length).toBeGreaterThan(0);
    }
  });

  it("references only cards that exist in cards.json", () => {
    for (const { data } of chapters) {
      const tokenCards = data.blocks.flatMap(b => (b.tokens ?? []).flatMap(t => t.cards ?? []));
      expect(tokenCards.filter(id => !ids.has(id))).toEqual([]);
      expect(data.cardIds.filter(id => !ids.has(id))).toEqual([]);
    }
  });

  it("has a book path whose units cover every exported chapter", () => {
    const paths = read("public/paths.json").paths;
    for (const book of index.books) {
      const path = paths.find(p => p.id === book.id);
      expect(path?.units?.length).toBe(book.chapters.length);
      for (const unit of path.units) expect(unit.cardIds.filter(id => !ids.has(id))).toEqual([]);
    }
  });
});
