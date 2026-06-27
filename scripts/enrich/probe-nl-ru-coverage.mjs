// Read-only probe: how many NEW cards would Dutch Wiktionary (nl.wiktionary)
// Russian translations add on top of the current ru.wiktionary glossRu coverage?
// Streams the nl dump, keeps Dutch entries (lang_code "nl") with Russian
// translations, and compares matched heads against the existing enrichment.json.
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle, normalizeHead } from "./extract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NL = join(root, "data/kaikki/kaikki-nl.jsonl");

function cardHeads(card) {
  const heads = new Set();
  if (card.lemma) heads.add(normalizeHead(card.lemma));
  heads.add(normalizeHead(stripArticle(card.dutch)));
  return [...heads].filter(Boolean);
}

const levelOf = (card) => (card.group ?? "").split("·")[0].trim() || "?";
const ruWords = (entry) =>
  (entry.translations ?? []).filter((t) => (t.lang_code ?? t.code) === "ru" && t.word).map((t) => t.word.trim());

async function main() {
  const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
  const enrichment = JSON.parse(readFileSync(join(root, "public/enrichment.json"), "utf8"));
  const wantedHeads = new Set();
  for (const c of cards) for (const h of cardHeads(c)) wantedHeads.add(h);
  const baseline = new Set(Object.values(enrichment).filter((e) => e.glossRu?.length).map((e) => e.id));
  console.log(`cards: ${cards.length}, wanted heads: ${wantedHeads.size}, baseline glossRu cards: ${baseline.size}`);

  const headToRu = new Map();
  let nlEntries = 0;
  let nlWithRu = 0;
  const rl = createInterface({ input: createReadStream(NL), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.lang_code !== "nl" || !e.word) continue;
    nlEntries++;
    const ru = ruWords(e);
    if (!ru.length) continue;
    nlWithRu++;
    const head = normalizeHead(e.word);
    if (!wantedHeads.has(head)) continue;
    const set = headToRu.get(head) ?? new Set();
    for (const w of ru) set.add(w);
    headToRu.set(head, set);
  }
  console.log(`nl dump: ${nlEntries} Dutch entries, ${nlWithRu} with ru translations, ${headToRu.size}/${wantedHeads.size} wanted heads matched`);

  const byLevel = {};
  const newHits = [];
  let nlMatched = 0;
  let newCards = 0;
  let unionCards = 0;
  for (const c of cards) {
    const level = levelOf(c);
    byLevel[level] ??= { total: 0, base: 0, nl: 0, gained: 0 };
    byLevel[level].total++;
    const hasBase = baseline.has(c.id);
    if (hasBase) byLevel[level].base++;
    const heads = cardHeads(c);
    const nlHit = heads.some((h) => headToRu.has(h));
    if (nlHit) { nlMatched++; byLevel[level].nl++; }
    if (nlHit && !hasBase) { newCards++; byLevel[level].gained++; newHits.push(`${c.id}:${c.dutch}`); }
    if (hasBase || nlHit) unionCards++;
  }

  const pct = (n) => `${((100 * n) / cards.length).toFixed(1)}%`;
  console.log("\n=== incremental coverage ===");
  console.log(`baseline (ru.wiktionary):          ${baseline.size}/${cards.length} (${pct(baseline.size)})`);
  console.log(`nl.wiktionary matched cards:       ${nlMatched}/${cards.length} (${pct(nlMatched)})`);
  console.log(`NEW cards gained (no prior glossRu): ${newCards} (+${((100 * newCards) / cards.length).toFixed(1)}pp)`);
  console.log(`union coverage:                    ${unionCards}/${cards.length} (${pct(unionCards)})`);
  console.log("\nby level (base | nl | gained / total):");
  for (const [level, s] of Object.entries(byLevel).sort()) {
    console.log(`  ${level.padEnd(4)} base ${s.base}  nl ${s.nl}  gained ${s.gained} / ${s.total}`);
  }
  console.log("\nsample new hits:", newHits.slice(0, 25).join(", "));
}

main();
