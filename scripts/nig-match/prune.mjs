import { readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { read, save, root } from "./common.mjs";
import { pruneBookCards } from "../nig.mjs";

const cards = read("public/cards.json");
const enrichment = read("public/enrichment.json");
const bookIds = read("scripts/sources/nig-new-ids.json");
const audio = read("scripts/sources/nig-audio.json");
const paths = read("public/paths.json").paths;
const referenced = new Set([
  ...read("scripts/sources/nig-mapping.json").records.map(r => r.cardId),
  ...paths.flatMap(p => [...(p.units ?? []), ...(p.difficulties ?? [])].flatMap(u => u.cardIds)),
]);
const book = new Set(bookIds);
const hashOthers = list => createHash("sha256").update(JSON.stringify(list.filter(c => !book.has(c.id)))).digest("hex");
const before = hashOthers(cards);

const out = pruneBookCards({ cards, enrichment, bookIds, audio, referenced });
if (hashOthers(out.cards) !== before) throw new Error("Pruning changed a card outside the book range");

const redirectsPath = "src/data/cardRedirects.json";
const remaining = new Set(out.cards.map(c => c.id));
const redirects = existsSync(join(root, redirectsPath)) ? read(redirectsPath) : {};
for (const d of read("scripts/sources/nig-review.json").decisions) {
  if (d.action === "keep-new" || d.action === "drop" || remaining.has(d.nigCardId)) continue;
  if (!remaining.has(d.targetId)) throw new Error(`Redirect target ${d.targetId} is missing`);
  redirects[d.nigCardId] = d.targetId;
}
save(redirectsPath, redirects);

if (!out.removed.length) { console.log(`nothing to prune; ${Object.keys(redirects).length} progress redirects`); process.exit(0); }

writeFileSync(join(root, "public/cards.json"), JSON.stringify(out.cards));
writeFileSync(join(root, "public/enrichment.json"), JSON.stringify(out.enrichment));
save("scripts/sources/nig-new-ids.json", out.bookIds);
save("scripts/sources/nig-audio.json", out.audio);

const audioDir = join(root, "public/audio/nederlands-in-gang");
const stillUsed = new Set([...Object.values(out.audio), ...Object.values(out.enrichment).map(e => e.audioUrl)]
  .filter(Boolean).map(url => url.split("/").at(-1)));
const deleted = readdirSync(audioDir).filter(f => !stillUsed.has(f));
for (const f of deleted) rmSync(join(audioDir, f));
console.log(JSON.stringify({ prunedCards: out.removed.length, remainingBookCards: out.bookIds.length, deletedRecordings: deleted.length }, null, 2));
