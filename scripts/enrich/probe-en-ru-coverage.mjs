// Read-only probe: how many NEW cards would en.wiktionary EN->RU translations
// add (keyed by each card's curated `english` meaning) on top of the current
// ru+nl glossRu coverage? Streams the English dump, indexes ru translations by
// English headword, then compares matched cards against enrichment.json.
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { englishKeys, extractEnRuTranslations } from "./extract-en-ru.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EN = join(root, "data/kaikki/kaikki-en.jsonl");

const levelOf = (card) => (card.group ?? "").split("·")[0].trim() || "?";

async function main() {
  const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
  const enrichment = JSON.parse(readFileSync(join(root, "public/enrichment.json"), "utf8"));
  const baseline = new Set(Object.values(enrichment).filter((e) => e.glossRu?.length).map((e) => e.id));

  const wantedKeys = new Set();
  for (const c of cards) for (const k of englishKeys(c)) wantedKeys.add(k);
  console.log(`cards: ${cards.length}, wanted english keys: ${wantedKeys.size}, baseline glossRu cards: ${baseline.size}`);

  const keyToRu = new Map();
  let enEntries = 0;
  const rl = createInterface({ input: createReadStream(EN), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!e.word) continue;
    const key = e.word.toLowerCase();
    if (!wantedKeys.has(key)) continue;
    const ru = extractEnRuTranslations(e, { maxGlosses: 99 });
    if (!ru.length) continue;
    enEntries++;
    const set = keyToRu.get(key) ?? new Set();
    for (const w of ru) set.add(w);
    keyToRu.set(key, set);
  }
  console.log(`en dump: ${enEntries} entries contributed ru, ${keyToRu.size}/${wantedKeys.size} keys matched`);

  const byLevel = {};
  const newHits = [];
  let enMatched = 0;
  let newCards = 0;
  let unionCards = 0;
  for (const c of cards) {
    const level = levelOf(c);
    byLevel[level] ??= { total: 0, base: 0, en: 0, gained: 0 };
    byLevel[level].total++;
    const hasBase = baseline.has(c.id);
    if (hasBase) byLevel[level].base++;
    const enHit = englishKeys(c).some((k) => keyToRu.has(k));
    if (enHit) { enMatched++; byLevel[level].en++; }
    if (enHit && !hasBase) { newCards++; byLevel[level].gained++; newHits.push(`${c.id}:${c.dutch}`); }
    if (hasBase || enHit) unionCards++;
  }

  const pct = (n) => `${((100 * n) / cards.length).toFixed(1)}%`;
  console.log("\n=== incremental coverage ===");
  console.log(`baseline (ru+nl):                  ${baseline.size}/${cards.length} (${pct(baseline.size)})`);
  console.log(`en.wiktionary matched cards:       ${enMatched}/${cards.length} (${pct(enMatched)})`);
  console.log(`NEW cards gained:                  ${newCards} (+${((100 * newCards) / cards.length).toFixed(1)}pp)`);
  console.log(`union coverage:                    ${unionCards}/${cards.length} (${pct(unionCards)})`);
  console.log("\nby level (base | en | gained / total):");
  for (const [level, s] of Object.entries(byLevel).sort()) {
    console.log(`  ${level.padEnd(4)} base ${s.base}  en ${s.en}  gained ${s.gained} / ${s.total}`);
  }
  console.log("\nsample new hits:", newHits.slice(0, 25).join(", "));
}

main();
