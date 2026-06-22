// Stream the Kaikki (Wiktextract Dutch) dump once, keeping only entries whose
// head matches a wanted head. Shared by enrich-cards.mjs and convert-nt2lex.mjs.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { normalizeHead } from "./extract.mjs";

export async function buildKaikkiIndex(kaikkiPath, wantedHeads) {
  const index = new Map();
  let kept = 0;
  const rl = createInterface({ input: createReadStream(kaikkiPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!e.word) continue;
    const head = normalizeHead(e.word);
    if (!wantedHeads.has(head)) continue;
    if (!index.has(head)) index.set(head, []);
    index.get(head).push(e);
    kept++;
  }
  console.log(`kaikki: indexed ${kept} entries for ${index.size}/${wantedHeads.size} wanted heads`);
  return index;
}
