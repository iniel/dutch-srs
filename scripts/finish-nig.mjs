import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => JSON.parse(readFileSync(join(root, path), "utf8"));
const cards = read("public/cards.json");
const enrichment = read("public/enrichment.json");
const audio = read("scripts/sources/nig-audio.json");
const path = read("public/paths.json").paths.find(p => p.id === "nederlands-in-gang");
const byId = new Map(cards.map(c => [c.id, c]));
for (const [id, url] of Object.entries(audio)) {
  if (!byId.has(id)) throw new Error(`Unknown audio card ${id}`);
  if (enrichment[id]?.audioUrl) continue;
  const src = join(root, "data/nederlands-in-gang/audio", url.split("/").at(-1));
  const dst = join(root, "public", url);
  if (!existsSync(src) && !existsSync(dst)) throw new Error(`Missing source audio ${id}`);
  mkdirSync(dirname(dst), { recursive: true });
  if (existsSync(src)) copyFileSync(src, dst);
  enrichment[id] = { ...(enrichment[id] ?? { id, match: { source: "none", matchedBy: "none" } }), audioUrl: url };
}
const ids = [...new Set(path.units.flatMap(u => u.cardIds))];
const fields = { dictionary: e => e.senses?.length, russian: e => e.glossRu?.length,
  examples: e => e.examples?.length, grammar: e => e.grammar, ipa: e => e.ipa, audio: e => e.audioUrl };
const coverage = { cards: ids.length, withTranslation: ids.filter(id => byId.get(id)?.english?.length).length,
  fields: Object.fromEntries(Object.entries(fields).map(([name, predicate]) => [name, {
    covered: ids.filter(id => predicate(enrichment[id] ?? {})).length,
    missing: ids.filter(id => !predicate(enrichment[id] ?? {})).map(id => ({ id, dutch: byId.get(id).dutch })),
  }])) };
writeFileSync(join(root, "public/enrichment.json"), JSON.stringify(enrichment));
writeFileSync(join(root, "scripts/sources/nig-coverage.json"), JSON.stringify(coverage, null, 2) + "\n");
console.log(JSON.stringify({ cards: coverage.cards, withTranslation: coverage.withTranslation,
  ...Object.fromEntries(Object.entries(coverage.fields).map(([k, v]) => [k, v.covered])) }, null, 2));
