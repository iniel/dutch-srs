// Read-only coverage probe: how many cards can Kaikki ruwiktionary give a
// Russian gloss for? Streams the ru dump, keeps Dutch entries (lang_code "nl"),
// intersects their normalized heads with the card heads, and prints a report.
// Touches no app data — investigation only. See docs/VOCABULARY.md.
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle, normalizeHead } from "./extract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RU = join(root, "data/kaikki/kaikki-ru.jsonl");

function cardHeads(card) {
  const heads = new Set();
  if (card.lemma) heads.add(normalizeHead(card.lemma));
  heads.add(normalizeHead(stripArticle(card.dutch)));
  return [...heads].filter(Boolean);
}

const levelOf = (card) => (card.group ?? "").split("·")[0].trim() || "?";
const hasGloss = (entry) => (entry.senses ?? []).some((s) => (s.glosses ?? []).some(Boolean));

async function main() {
  const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
  const wantedHeads = new Set();
  for (const c of cards) for (const h of cardHeads(c)) wantedHeads.add(h);
  console.log(`cards: ${cards.length}, wanted heads: ${wantedHeads.size}`);

  // head -> true if the matched ru entry carried at least one gloss
  const headToGloss = new Map();
  let nlEntries = 0;
  const rl = createInterface({ input: createReadStream(RU), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.lang_code !== "nl" || !e.word) continue;
    nlEntries++;
    const head = normalizeHead(e.word);
    if (!wantedHeads.has(head)) continue;
    if (hasGloss(e) || !headToGloss.get(head)) headToGloss.set(head, hasGloss(e));
  }
  console.log(`ru dump: ${nlEntries} Dutch (lang_code=nl) entries, ${headToGloss.size}/${wantedHeads.size} wanted heads matched`);

  const byLevel = {};
  const hits = [];
  const misses = [];
  for (const c of cards) {
    const level = levelOf(c);
    byLevel[level] ??= { total: 0, matched: 0, withGloss: 0 };
    byLevel[level].total++;
    const heads = cardHeads(c);
    const matchedHead = heads.find((h) => headToGloss.has(h));
    if (matchedHead != null) {
      byLevel[level].matched++;
      if (headToGloss.get(matchedHead)) byLevel[level].withGloss++;
      hits.push(`${c.id}:${c.dutch}`);
    } else {
      misses.push(`${c.id}:${c.dutch}`);
    }
  }

  const matched = hits.length;
  const withGloss = Object.values(byLevel).reduce((a, b) => a + b.withGloss, 0);
  const pct = (n) => `${((100 * n) / cards.length).toFixed(1)}%`;
  console.log("\n=== coverage ===");
  console.log(`matched (head present in ru):      ${matched}/${cards.length} (${pct(matched)})`);
  console.log(`with non-empty Russian gloss:      ${withGloss}/${cards.length} (${pct(withGloss)})`);
  console.log("\nby level (matched/total, withGloss):");
  for (const [level, s] of Object.entries(byLevel).sort()) {
    const lp = (n) => `${((100 * n) / s.total).toFixed(0)}%`;
    console.log(`  ${level.padEnd(4)} ${s.matched}/${s.total} (${lp(s.matched)})  gloss ${s.withGloss} (${lp(s.withGloss)})`);
  }
  console.log("\nsample hits:  ", hits.slice(0, 25).join(", "));
  console.log("\nsample misses:", misses.slice(0, 25).join(", "));
}

main();
