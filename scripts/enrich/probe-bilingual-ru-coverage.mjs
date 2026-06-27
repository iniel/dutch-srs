// Read-only probe: how many NEW cards would FreeDict (WikDict) bilingual
// dictionaries add on top of the current ru+nl+en glossRu coverage?
//   - nld-rus: direct Dutch -> Russian (keyed by Dutch head)
//   - eng-rus: English -> Russian, the "meaning bridge" keyed by card.english
// Parses the TEI src files. No app data touched.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle, normalizeHead } from "./extract.mjs";
import { stripStress, englishKeys } from "./extract-en-ru.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FD = join(root, "data/freedict");

function cardHeads(card) {
  const heads = new Set();
  if (card.lemma) heads.add(normalizeHead(card.lemma));
  heads.add(normalizeHead(stripArticle(card.dutch)));
  return [...heads].filter(Boolean);
}
const levelOf = (card) => (card.group ?? "").split("·")[0].trim() || "?";

// Parse a FreeDict TEI: headword (first <orth>) -> list of ru <quote>s found in
// <cit type="trans"> blocks. keyFn normalizes the headword for indexing.
function parseTei(path, keyFn) {
  const xml = readFileSync(path, "utf8");
  const map = new Map();
  for (const chunk of xml.split(/<entry\b/).slice(1)) {
    const orth = chunk.match(/<orth>([^<]*)<\/orth>/);
    if (!orth) continue;
    const key = keyFn(orth[1].trim());
    if (!key) continue;
    const words = [];
    for (const cit of chunk.matchAll(/<cit type="trans"[^>]*>([\s\S]*?)<\/cit>/g)) {
      for (const q of cit[1].matchAll(/<quote>([^<]*)<\/quote>/g)) {
        const w = stripStress(q[1].trim()).trim();
        if (w && !words.includes(w)) words.push(w);
      }
    }
    if (!words.length) continue;
    const merged = map.get(key) ?? [];
    for (const w of words) if (!merged.includes(w)) merged.push(w);
    map.set(key, merged);
  }
  return map;
}

function main() {
  const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
  const enrichment = JSON.parse(readFileSync(join(root, "public/enrichment.json"), "utf8"));
  const baseline = new Set(Object.values(enrichment).filter((e) => e.glossRu?.length).map((e) => e.id));

  const nld = parseTei(join(FD, "nld-rus/nld-rus.tei"), (s) => normalizeHead(s));
  const eng = parseTei(join(FD, "eng-rus/eng-rus.tei"), (s) => s.toLowerCase().trim());
  console.log(`freedict: nld-rus ${nld.size} heads, eng-rus ${eng.size} heads; baseline glossRu cards: ${baseline.size}/${cards.length}`);

  const byLevel = {};
  let nldNew = 0, engNew = 0, combinedNew = 0, union = 0;
  const sample = [];
  for (const c of cards) {
    const level = levelOf(c);
    byLevel[level] ??= { total: 0, base: 0, nld: 0, eng: 0, gained: 0 };
    byLevel[level].total++;
    const hasBase = baseline.has(c.id);
    if (hasBase) byLevel[level].base++;
    const heads = cardHeads(c);
    const nldHit = heads.some((h) => nld.has(h));
    const engHit = englishKeys(c).some((k) => eng.has(k));
    if (nldHit) byLevel[level].nld++;
    if (engHit) byLevel[level].eng++;
    if (!hasBase && nldHit) nldNew++;
    if (!hasBase && engHit) engNew++;
    if (!hasBase && (nldHit || engHit)) { combinedNew++; byLevel[level].gained++; if (sample.length < 25) sample.push(`${c.id}:${c.dutch}`); }
    if (hasBase || nldHit || engHit) union++;
  }

  const pct = (n) => `${((100 * n) / cards.length).toFixed(1)}%`;
  console.log("\n=== incremental coverage (over ru+nl+en baseline) ===");
  console.log(`NEW via nld-rus (direct):   ${nldNew}`);
  console.log(`NEW via eng-rus (bridge):   ${engNew}`);
  console.log(`NEW combined:               ${combinedNew} (+${((100 * combinedNew) / cards.length).toFixed(1)}pp)`);
  console.log(`union coverage:             ${union}/${cards.length} (${pct(union)})`);
  console.log("\nby level (base | nld | eng | gained / total):");
  for (const [lvl, s] of Object.entries(byLevel).sort()) {
    console.log(`  ${lvl.padEnd(4)} base ${s.base}  nld ${s.nld}  eng ${s.eng}  gained ${s.gained} / ${s.total}`);
  }
  console.log("\nsample new hits:", sample.join(", "));
  for (const w of ["heten", "groeten"]) {
    console.log(`\n${w}: nld-rus=${JSON.stringify(nld.get(w))}  eng-rus[meaning]=`,
      JSON.stringify(englishKeys(cards.find((c) => c.dutch === w) ?? {}).map((k) => eng.get(k)).find((x) => x)));
  }
}

main();
