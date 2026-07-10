// Resolve a2-mapping.json against the FINAL public/cards.json and write the three
// id lists (easy/medium/hard) as ordered, deduped arrays of card ids in the
// original crawled-list order. Run LAST, after apply-a2-overrides + enrich.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
const mapping = JSON.parse(readFileSync(join(root, "a2-mapping.json"), "utf8"));

const byId = new Map(cards.map((c) => [c.id, c]));

function resolveExisting(sel) {
  const hit = cards.find(
    (c) => c.dutch === sel.dutch && c.level === sel.level && c.english.includes(sel.engAnchor),
  );
  if (hit) return hit.id;
  if (sel.idNow && byId.has(sel.idNow)) return sel.idNow; // fallback
  return null;
}
function resolveNew(key) {
  const hit = cards.find(
    (c) => c.level === "A+" && c.dutch === key.dutch && c.english[0] === key.engAnchor,
  );
  return hit ? hit.id : null;
}

const out = {};
const problems = [];
for (const [list, entries] of Object.entries(mapping)) {
  const ids = [];
  const seen = new Set();
  for (const e of entries) {
    const id = e.action === "new" ? resolveNew(e.newKey) : resolveExisting(e.selector);
    if (!id) { problems.push(`${list}: ${e.nl} => ${e.en} (${e.action}) UNRESOLVED`); continue; }
    if (seen.has(id)) continue; // dedupe cards that back multiple source words
    seen.add(id);
    ids.push(id);
  }
  out[list] = ids;
  writeFileSync(join(root, `${list}.ids.json`), JSON.stringify(ids));
}

console.log("=== a2 id lists ===");
for (const [list, ids] of Object.entries(out))
  console.log(`  ${list}.ids.json: ${ids.length} ids (from ${mapping[list].length} mapped entries)`);
if (problems.length) { console.log(`\nUNRESOLVED (${problems.length}):`); problems.forEach((p) => console.log("  " + p)); }

// --- public/paths.json: the "Inburgering Online" progression path ---
// The runtime app treats these as an ordered set of difficulty tiers. A card is
// kept only in its LOWEST tier (easy < medium < hard) so the three arrays are
// disjoint — no card is drilled twice within one path. The app chunks each tier
// into units of `unitSize` at load time.
const IO_TIERS = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];
const acrossTiers = new Set();
const difficulties = [];
for (const { key, label } of IO_TIERS) {
  const kept = [];
  for (const id of out[key] ?? []) {
    if (acrossTiers.has(id)) continue; // keep-lowest across tiers
    acrossTiers.add(id);
    kept.push(id);
  }
  difficulties.push({ key, label, cardIds: kept });
}
const paths = {
  version: 1,
  paths: [
    {
      id: "inburgering",
      name: "Inburgering Online",
      unitSize: 100,
      difficulties,
    },
  ],
};
writeFileSync(join(root, "public/paths.json"), JSON.stringify(paths));

console.log("\n=== public/paths.json (Inburgering Online) ===");
for (const d of difficulties)
  console.log(`  ${d.key}: ${d.cardIds.length} ids (after keep-lowest dedup)`);
console.log(`  total unique: ${acrossTiers.size}`);
