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
const review = read("scripts/sources/nig-review.json");

describe("shipped Nederlands in gang data", () => {
  it("preserves every pre-existing card, except reviewed gloss additions, and all Inburgering units", () => {
    const prefix = structuredClone(cards.slice(0, baseline.cardsCount));
    const position = new Map(prefix.map((c, i) => [c.id, i]));
    for (const { cardId, gloss } of review.addedGlosses) {
      if (!position.has(cardId)) continue;
      const english = prefix[position.get(cardId)].english;
      expect(english).toContain(gloss);
      english.splice(english.lastIndexOf(gloss), 1);
    }
    expect(createHash("sha256").update(JSON.stringify(prefix)).digest("hex")).toBe(baseline.cardsSha256);
    const io = paths.paths.find(p => p.id === "inburgering");
    expect(createHash("sha256").update(JSON.stringify(io)).digest("hex")).toBe(baseline.inburgeringSha256);
  });
  it("accounts for every source note and reconstructs all 18 chapters", () => {
    expect(source.records).toHaveLength(1092);
    expect(new Set(mapping.records.map(r => r.sourceId))).toEqual(new Set(source.records.map(r => r.id)));
    const corrections = read("scripts/sources/nig-corrections.json");
    expect(mapping.records.filter(r => r.dropped).every(r => corrections[r.mergedInto ?? r.sourceId]?.drop)).toBe(true);
    expect(mapping.records.filter(r => !r.dropped).every(r => byId.has(r.cardId))).toBe(true);
    const entries = prepareEntries(source.records, corrections);
    const ids = new Map(mapping.records.map(r => [r.sourceId, r.cardId]));
    const path = buildChapterPath(entries, entries.map(e => ids.get(e.id)), new Set(byId.keys()));
    expect(path).toEqual(paths.paths.find(p => p.id === "nederlands-in-gang"));
    const candidates = entries.map(e => byId.get(ids.get(e.id)) ?? cardFromEntry(e));
    expect(mergeCandidates(cards, candidates, { signature: strictSignature }).added).toBe(0);
    const newIds = read("scripts/sources/nig-new-ids.json");
    expect(newIds.every(id => !byId.get(id).level)).toBe(true);
    expect(path.units.flatMap(u => u.cardIds).every(id => byId.get(id).english.every(s => s.trim()))).toBe(true);
  });
  it("maps regular forms to their lemma card, keeps irregular forms, and never crosses homographs", () => {
    const mapped = sourceId => byId.get(mapping.records.find(r => r.sourceId === sourceId).cardId);
    expect(mapped("1570504901685")).toMatchObject({ id: "c171", dutch: "de dag" });
    expect(mapped("1570504901706")).toMatchObject({ id: "c296", dutch: "komen" });
    expect(mapped("1570504901706").id).not.toBe("c1082");
    expect(mapped("1570504901673")).toMatchObject({ id: "c65", dutch: "zijn" });
    expect(mapped("1570504901692").id).toBe(mapped("1570504901673").id);
    expect(mapped("1570505279295")).toMatchObject({ dutch: "schijnt", notes: "Book annotation: schijnen" });
    expect(mapped("1570505221343").english).toContain("to make an appointment");
    expect(mapped("1570505313569")).toMatchObject({ id: "c1141", dutch: "het contact" });
  });
  it("redirects saved progress of every merged-away card to a card that still exists", () => {
    const redirects = read("src/data/cardRedirects.json");
    const merged = review.decisions.filter(d => d.action !== "keep-new" && d.action !== "drop");
    expect(Object.keys(redirects).sort()).toEqual(merged.map(d => d.nigCardId).sort());
    for (const [from, to] of Object.entries(redirects)) {
      expect(byId.has(from)).toBe(false);
      expect(byId.has(to)).toBe(true);
    }
  });
  it("leaves no orphaned book card and applies every reviewed merge", () => {
    const pathIds = new Set(paths.paths.find(p => p.id === "nederlands-in-gang").units.flatMap(u => u.cardIds));
    expect(read("scripts/sources/nig-new-ids.json").every(id => pathIds.has(id))).toBe(true);
    for (const d of review.decisions) {
      if (d.action === "keep-new") expect(pathIds.has(d.nigCardId)).toBe(true);
      else if (d.action === "drop") expect(byId.has(d.nigCardId)).toBe(false);
      else {
        expect(byId.has(d.nigCardId)).toBe(false);
        expect(pathIds.has(d.targetId)).toBe(true);
      }
    }
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
