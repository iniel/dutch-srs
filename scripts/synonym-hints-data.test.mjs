import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(join(root, path), "utf8"));

describe("shipped synonym hints", () => {
  it("are keyed by real card ids and carry both languages", () => {
    const ids = new Set(read("public/cards.json").map(c => c.id));
    for (const [id, hint] of Object.entries(read("src/data/synonymHints.json"))) {
      expect(ids.has(id), id).toBe(true);
      expect(hint.en.trim(), id).not.toBe("");
      expect(hint.ru.trim(), id).not.toBe("");
    }
  });
});
