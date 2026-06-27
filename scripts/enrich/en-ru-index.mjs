// Stream the English (en.wiktionary) dump once, keeping entries whose headword
// is a wanted english key, and collapse them to a Russian-translation list per
// key. Used to chain a card's English meaning -> Russian. Mirrors ru-index.mjs
// but keys by lowercased English headword, not Dutch head.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { extractEnRuTranslations } from "./extract-en-ru.mjs";

const MAX_GLOSSES_PER_KEY = 4;

export async function buildEnRuGlossIndex(enPath, wantedKeys) {
  const index = new Map();
  let enEntries = 0;
  const rl = createInterface({ input: createReadStream(enPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!e.word) continue;
    const key = e.word.toLowerCase();
    if (!wantedKeys.has(key)) continue;
    const glosses = extractEnRuTranslations(e, { maxGlosses: MAX_GLOSSES_PER_KEY });
    if (!glosses.length) continue;
    enEntries++;
    const merged = index.get(key) ?? [];
    for (const g of glosses) if (!merged.includes(g)) merged.push(g);
    index.set(key, merged.slice(0, MAX_GLOSSES_PER_KEY));
  }
  console.log(`en-gloss: ${enEntries} entries contributed ru, translations for ${index.size}/${wantedKeys.size} keys`);
  return index;
}
