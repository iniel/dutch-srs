import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(join(root, path), "utf8"));

describe("shipped perfectum drill", () => {
  const drill = read("public/grammar/perfectum.json");
  const cardIds = new Set(read("public/cards.json").map(c => c.id));

  it("is the perfectum drill with items", () => {
    expect(drill.id).toBe("perfectum");
    expect(drill.items.length).toBeGreaterThan(0);
  });

  it("has unique cardIds and infinitives", () => {
    const ids = drill.items.map(r => r.cardId);
    const infinitives = drill.items.map(r => r.infinitive);
    expect(ids.length - new Set(ids).size).toBe(0);
    expect(infinitives.length - new Set(infinitives).size).toBe(0);
  });

  it("references only cards that exist in cards.json", () => {
    expect(drill.items.filter(r => !cardIds.has(r.cardId)).map(r => r.cardId)).toEqual([]);
  });

  it("has a valid aux and a non-empty participle on every row", () => {
    const bad = drill.items.filter(r =>
      !["hebben", "zijn", "hebben/zijn"].includes(r.aux) || !r.participle?.trim() || !r.infinitive?.trim());
    expect(bad).toEqual([]);
  });
});
