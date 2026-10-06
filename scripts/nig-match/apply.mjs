import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, save, root, nlKey, enAtoms } from "./common.mjs";
import { finalDecisions } from "./report.mjs";

const cards = read("public/cards.json");
const byId = new Map(cards.map(c => [c.id, c]));
const corrections = read("scripts/sources/nig-corrections.json");
const mapping = read("scripts/sources/nig-mapping.json").records;
const rows = finalDecisions();
const missing = rows.filter(r => !byId.has(r.item.nigCardId));
if (missing.length) throw new Error(`${missing.length} reviewed book cards no longer exist; the review was already applied`);

const decisionOf = new Map(rows.map(r => [r.item.nigCardId, r.decision]));
const finalTarget = id => {
  const seen = new Set();
  let current = id;
  for (;;) {
    const d = decisionOf.get(current);
    if (!d || d.action === "keep-new") return current;
    if (seen.has(current)) throw new Error(`Reuse cycle through ${current}`);
    seen.add(current);
    current = d.targetId;
  }
};

const added = [];
for (const { item, decision } of rows) {
  if (decision.action !== "reuse-add-sense") continue;
  const target = byId.get(finalTarget(item.nigCardId));
  for (const gloss of decision.addGloss) {
    const known = enAtoms(target.english);
    if ([...enAtoms([gloss])].every(a => known.has(a))) continue;
    target.english = [...target.english, gloss.trim()];
    added.push({ cardId: target.id, gloss: gloss.trim() });
  }
}

const review = [];
let reused = 0;
for (const { item, decision } of rows) {
  if (decision.action === "keep-new") {
    review.push({ nigCardId: item.nigCardId, book: item.card.dutch, action: "keep-new", subtype: decision.subtype, by: decision.by });
    continue;
  }
  const targetId = finalTarget(item.nigCardId);
  const target = byId.get(targetId);
  const form = nlKey(item.card.dutch) !== nlKey(target.dutch);
  for (const record of mapping.filter(r => r.cardId === item.nigCardId && !r.mergedInto)) {
    const { form: _oldForm, ...previous } = corrections[record.sourceId] ?? {};
    corrections[record.sourceId] = { ...previous, reuseId: targetId, expectedDutch: target.dutch,
      expectedEnglish: target.english, ...(form ? { form: true } : {}),
      reuseReason: `Merge review (${decision.subtype}, ${decision.by}): ${item.card.dutch} -> ${target.dutch}` };
    reused++;
  }
  review.push({ nigCardId: item.nigCardId, book: item.card.dutch, action: decision.action, targetId,
    ...(decision.addGloss ? { addGloss: decision.addGloss } : {}), subtype: decision.subtype, by: decision.by });
}

for (const fix of Object.values(corrections)) {
  if (!fix.reuseId) continue;
  const target = byId.get(fix.reuseId);
  fix.expectedDutch = target.dutch;
  fix.expectedEnglish = target.english;
}

writeFileSync(join(root, "public/cards.json"), JSON.stringify(cards));
save("scripts/sources/nig-corrections.json", corrections);
save("scripts/sources/nig-review.json", { addedGlosses: added, decisions: review });
const count = a => review.filter(r => r.action === a).length;
console.log(JSON.stringify({ reuse: count("reuse"), reuseAddSense: count("reuse-add-sense"), keepNew: count("keep-new"),
  sourceRowsRepointed: reused, glossesAdded: added.length, cardsEdited: new Set(added.map(a => a.cardId)).size }, null, 2));
console.log("next: npm run import:nig && node scripts/nig-match/prune.mjs && npm run finish:nig");
