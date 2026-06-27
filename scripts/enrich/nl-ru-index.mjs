// Stream the nlwiktionary dump once, keeping Dutch entries (lang_code "nl")
// whose head matches a wanted head, and collapse them to a Russian-translation
// list per head. Mirrors ru-index.mjs but reads the translations[] table.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { normalizeHead } from "./extract.mjs";
import { extractNlRuTranslations } from "./extract-nl-ru.mjs";

const MAX_GLOSSES_PER_HEAD = 4;

export async function buildNlRuGlossIndex(nlPath, wantedHeads) {
  const index = new Map();
  let nlEntries = 0;
  const rl = createInterface({ input: createReadStream(nlPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.lang_code !== "nl" || !e.word) continue;
    nlEntries++;
    const glosses = extractNlRuTranslations(e);
    if (!glosses.length) continue;
    const head = normalizeHead(e.word);
    if (!wantedHeads.has(head)) continue;
    const merged = index.get(head) ?? [];
    for (const g of glosses) if (!merged.includes(g)) merged.push(g);
    index.set(head, merged.slice(0, MAX_GLOSSES_PER_HEAD));
  }
  console.log(`nl-gloss: ${nlEntries} Dutch entries, ru translations for ${index.size}/${wantedHeads.size} wanted heads`);
  return index;
}
