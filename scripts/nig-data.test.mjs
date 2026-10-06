import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareEntries, cardFromEntry, buildChapterPath, strictSignature } from "./nig.mjs";
import { mergeCandidates } from "./import-merge.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(join(root, path), "utf8"));
const cards = read("public/cards.json");
const byId = new Map(cards.map(c => [c.id, c]));
const paths = read("public/paths.json");
const source = read("scripts/sources/nig-source.json");
const mapping = read("scripts/sources/nig-mapping.json");
const baseline = read("scripts/sources/nig-baseline.json");

describe("shipped Nederlands in gang data", () => {
  it("preserves every pre-existing card and all Inburgering units", () => {
    const prefix = cards.slice(0, baseline.cardsCount);
    expect(createHash("sha256").update(JSON.stringify(prefix)).digest("hex")).toBe(baseline.cardsSha256);
    const io = paths.paths.find(p => p.id === "inburgering");
    expect(createHash("sha256").update(JSON.stringify(io)).digest("hex")).toBe(baseline.inburgeringSha256);
  });
  it("accounts for every source note and reconstructs all 18 chapters", () => {
    expect(source.records).toHaveLength(1092);
    expect(new Set(mapping.records.map(r => r.sourceId))).toEqual(new Set(source.records.map(r => r.id)));
    expect(mapping.records.every(r => byId.has(r.cardId))).toBe(true);
    const entries = prepareEntries(source.records, read("scripts/sources/nig-corrections.json"));
    const ids = new Map(mapping.records.map(r => [r.sourceId, r.cardId]));
    const path = buildChapterPath(entries, entries.map(e => ids.get(e.id)), new Set(byId.keys()));
    expect(path).toEqual(paths.paths.find(p => p.id === "nederlands-in-gang"));
    const candidates = entries.map(e => byId.get(ids.get(e.id)) ?? cardFromEntry(e));
    expect(mergeCandidates(cards, candidates, { signature: strictSignature }).added).toBe(0);
    const newIds = read("scripts/sources/nig-new-ids.json");
    expect(newIds.every(id => !byId.get(id).level)).toBe(true);
    expect(path.units.flatMap(u => u.cardIds).every(id => byId.get(id).english.every(s => s.trim()))).toBe(true);
  });
  it("preserves grammatical forms, meanings and complete repaired phrases", () => {
    const mapped = sourceId => byId.get(mapping.records.find(r => r.sourceId === sourceId).cardId);
    expect(mapped("1570504901685")).toMatchObject({ dutch: "dagen", english: ["days"] });
    expect(mapped("1570504901706")).toMatchObject({ dutch: "kom", english: ["come"] });
    expect(mapped("1570505221343").english).toContain("make an appointment");
    expect(mapped("1570505313569").english).toContain("get in touch");
  });
  it("keeps paths.json readable by clients still running the cached tier-only build", () => {
    const known = new Set(cards.map(c => c.id));
    for (const def of paths.paths) {
      expect(Number.isInteger(def.unitSize) && def.unitSize > 0).toBe(true);
      const legacyUnits = def.difficulties.flatMap(t => {
        const valid = t.cardIds.filter(id => known.has(id));
        return Array.from({ length: Math.ceil(valid.length / def.unitSize) }, (_, i) => valid.slice(i * def.unitSize, (i + 1) * def.unitSize));
      });
      if (def.units) expect(legacyUnits).toEqual(def.units.map(u => u.cardIds));
    }
  });
  it("ships every referenced local recording", () => {
    const enrichment = read("public/enrichment.json");
    for (const e of Object.values(enrichment)) {
      if (e.audioUrl?.startsWith("audio/")) expect(existsSync(join(root, "public", e.audioUrl))).toBe(true);
    }
  });
});
