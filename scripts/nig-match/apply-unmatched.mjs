import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, save, root, nlKey, enAtoms } from "./common.mjs";

const DIR = "docs/nederlands-in-gang/unmatched";
const LINE = /^(.*) — (DROP|EXTRA|KEEP|ADD)(?: \((.*)\))?$/;
const GLOSS_OVERRIDES = { draaien: ["to show (a film)"] };

const cards = read("public/cards.json");
const byId = new Map(cards.map(c => [c.id, c]));
const bookIds = new Set(read("scripts/sources/nig-new-ids.json"));
const units = read("public/paths.json").paths.find(p => p.id === "nederlands-in-gang").units;
const corrections = read("scripts/sources/nig-corrections.json");
const mapping = read("scripts/sources/nig-mapping.json").records;
const review = read("scripts/sources/nig-review.json");

const article = s => String(s).match(/^(de|het)\s/i)?.[1].toLowerCase();
const sameWord = (a, b) => nlKey(a.dutch) === nlKey(b.dutch) && (!article(a.dutch) || !article(b.dutch) || article(a.dutch) === article(b.dutch));
const isVerbCard = c => c.english.every(g => /^to\s/.test(g));

const verdicts = new Map();
units.forEach((unit, i) => {
  const file = join(root, DIR, `hoofdstuk-${String(i + 1).padStart(2, "0")}.txt`);
  const lines = readFileSync(file, "utf8").trimEnd().split("\n");
  const byLine = new Map(unit.cardIds.filter(id => bookIds.has(id)).map(id => [`${byId.get(id).dutch} — ${byId.get(id).english.join(", ")}`, id]));
  if (lines.length !== byLine.size) throw new Error(`${file}: ${lines.length} lines for ${byLine.size} book cards`);
  for (const line of lines) {
    const m = line.match(LINE);
    if (!m) throw new Error(`${file}: unparsed line ${line}`);
    const [, pair, status, note = ""] = m;
    const id = byLine.get(pair);
    if (!id) throw new Error(`${file}: no book card for ${pair}`);
    const verdict = { status, targetId: note.match(/\bc\d+\b/)?.[0] };
    const earlier = verdicts.get(id);
    if (earlier && (earlier.status !== verdict.status || earlier.targetId !== verdict.targetId)) throw new Error(`Conflicting verdicts for ${id}`);
    verdicts.set(id, verdict);
  }
});
if (verdicts.size !== bookIds.size) throw new Error(`${verdicts.size} verdicts for ${bookIds.size} book cards`);

const added = [];
const decisions = new Map();
for (const [id, { status, targetId }] of verdicts) {
  const book = byId.get(id);
  const target = targetId && byId.get(targetId);
  if (targetId && (!target || bookIds.has(targetId))) throw new Error(`${book.dutch}: invalid target ${targetId}`);
  let action;
  if (status === "KEEP" || status === "ADD") action = "keep-new";
  else if (status === "EXTRA") action = target && sameWord(book, target) ? "reuse-add-sense" : "keep-new";
  else action = target ? "reuse" : "drop";
  const subtype = status === "EXTRA" && action === "keep-new" ? "extra-spelled-differently" : status.toLowerCase();
  const decision = { nigCardId: id, book: book.dutch, action, ...(action.startsWith("reuse") ? { targetId } : {}), subtype, by: "unmatched review" };

  if (action === "reuse-add-sense") {
    const glosses = GLOSS_OVERRIDES[book.dutch] ?? book.english.map(g => isVerbCard(target) && !/^to\s/.test(g) ? `to ${g}` : g);
    decision.addGloss = [];
    for (const gloss of glosses) {
      if ([...enAtoms([gloss])].every(a => enAtoms(target.english).has(a))) continue;
      target.english = [...target.english, gloss];
      added.push({ cardId: target.id, gloss });
      decision.addGloss.push(gloss);
    }
  }
  if (action === "reuse" || action === "reuse-add-sense" || action === "drop") {
    const form = action !== "drop" && nlKey(book.dutch) !== nlKey(target.dutch);
    for (const record of mapping.filter(r => r.cardId === id && !r.mergedInto)) {
      const { form: _oldForm, ...previous } = corrections[record.sourceId] ?? {};
      corrections[record.sourceId] = action === "drop"
        ? { ...previous, drop: true, dropReason: `Unmatched review: ${book.dutch} dropped` }
        : { ...previous, reuseId: targetId, expectedDutch: target.dutch, expectedEnglish: target.english, ...(form ? { form: true } : {}),
            reuseReason: `Unmatched review (${status}): ${book.dutch} -> ${target.dutch}` };
    }
  }
  decisions.set(id, decision);
}

for (const fix of Object.values(corrections)) {
  if (!fix.reuseId) continue;
  fix.expectedDutch = byId.get(fix.reuseId).dutch;
  fix.expectedEnglish = byId.get(fix.reuseId).english;
}

writeFileSync(join(root, "public/cards.json"), JSON.stringify(cards));
save("scripts/sources/nig-corrections.json", corrections);
const finalTarget = id => {
  const next = decisions.get(id);
  if (next?.action === "drop") throw new Error(`An earlier merge targets dropped card ${id}`);
  return next?.targetId ?? id;
};
save("scripts/sources/nig-review.json", {
  addedGlosses: [...review.addedGlosses, ...added],
  decisions: review.decisions.map(d => decisions.get(d.nigCardId) ?? (d.targetId ? { ...d, targetId: finalTarget(d.targetId) } : d)),
});
const count = a => [...decisions.values()].filter(d => d.action === a).length;
console.log(JSON.stringify({ reuse: count("reuse"), reuseAddSense: count("reuse-add-sense"), drop: count("drop"), keepNew: count("keep-new"),
  keptSeparate: [...decisions.values()].filter(d => d.subtype === "extra-spelled-differently").map(d => d.book),
  glossesAdded: added.length }, null, 2));
console.log("next: npm run import:nig && node scripts/nig-match/prune.mjs && npm run finish:nig");
