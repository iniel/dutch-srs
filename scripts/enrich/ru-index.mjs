// Stream the ruwiktionary dump once, keeping only Dutch entries (lang_code "nl")
// whose head matches a wanted head, and collapse them to a Russian-gloss list
// per head. Mirrors buildKaikkiIndex but emits glosses, not raw entries.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { normalizeHead } from "./extract.mjs";
import { extractRuGlosses } from "./extract-ru.mjs";

const MAX_GLOSSES_PER_HEAD = 4;

export async function buildRuGlossIndex(ruPath, wantedHeads) {
  const index = new Map();
  let nlEntries = 0;
  const rl = createInterface({ input: createReadStream(ruPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.lang_code !== "nl" || !e.word) continue;
    nlEntries++;
    const head = normalizeHead(e.word);
    if (!wantedHeads.has(head)) continue;
    const glosses = extractRuGlosses(e);
    if (!glosses.length) continue;
    const merged = index.get(head) ?? [];
    for (const g of glosses) if (!merged.includes(g)) merged.push(g);
    index.set(head, merged.slice(0, MAX_GLOSSES_PER_HEAD));
  }
  console.log(`ru-gloss: ${nlEntries} Dutch entries, glosses for ${index.size}/${wantedHeads.size} wanted heads`);
  return index;
}
