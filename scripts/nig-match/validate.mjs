import { readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { read, save, reviewDir, idNum } from "./common.mjs";

export const ACTIONS = ["reuse", "reuse-add-sense", "keep-new"];
export const SUBTYPES = ["same-word", "synonym-same-sense", "missing-sense", "typo", "adj/adv", "pos-variant",
  "regular-form", "irregular-form", "different-sense", "book-phrase", "not-in-deck"];
const CONFIDENCE = ["high", "medium", "low"];

export function verdictErrors(verdict, item, known, bookIds) {
  const errors = [];
  const v = verdict ?? {};
  if (v.nigCardId !== item.nigCardId) return [`expected ${item.nigCardId}, got ${v.nigCardId}`];
  if (!ACTIONS.includes(v.action)) errors.push(`bad action ${v.action}`);
  if (!SUBTYPES.includes(v.subtype)) errors.push(`bad subtype ${v.subtype}`);
  if (!CONFIDENCE.includes(v.confidence)) errors.push(`bad confidence ${v.confidence}`);
  if (typeof v.note !== "string" || !v.note.trim()) errors.push("missing note");
  if (v.action === "keep-new") {
    if (v.targetId) errors.push("keep-new must not have targetId");
    if (v.addGloss) errors.push("keep-new must not have addGloss");
  } else if (ACTIONS.includes(v.action)) {
    if (!known.has(v.targetId)) errors.push(`unknown targetId ${v.targetId}`);
    else if (v.targetId === item.nigCardId) errors.push("targets itself");
    else if (bookIds.has(v.targetId) && idNum(v.targetId) > idNum(item.nigCardId)) errors.push("book-duplicate target must have a lower id");
  }
  const glossOk = Array.isArray(v.addGloss) && v.addGloss.length && v.addGloss.every(g => typeof g === "string" && g.trim());
  if (v.action === "reuse-add-sense" && !glossOk) errors.push("reuse-add-sense needs addGloss");
  if (v.action === "reuse" && v.addGloss) errors.push("reuse must not have addGloss");
  if (v.subtype === "irregular-form" && v.action !== "keep-new") errors.push("irregular-form must be keep-new");
  if (v.subtype === "regular-form" && v.action === "keep-new") errors.push("regular-form must reuse its lemma");
  return errors.map(e => `${item.nigCardId}: ${e}`);
}

const batchFor = file => basename(file).replace(/^verdict-/, "batch-").replace(/^second-(\d)/, "second-batch-$1");

export function validateFile(file, known, bookIds) {
  const batchPath = join(reviewDir, batchFor(file));
  if (!existsSync(batchPath)) return [`${file}: no batch file ${basename(batchPath)}`];
  const batch = read(batchPath);
  let verdicts;
  try { verdicts = read(join(reviewDir, basename(file))); } catch (e) { return [`${file}: ${e.message}`]; }
  if (!Array.isArray(verdicts)) return [`${file}: not an array`];
  if (verdicts.length !== batch.length) return [`${file}: ${verdicts.length} verdicts for ${batch.length} items`];
  return batch.flatMap((item, i) => verdictErrors(verdicts[i], item, known, bookIds).map(e => `${basename(file)}: ${e}`));
}

function main() {
  const args = process.argv.slice(2);
  const known = new Set(read("public/cards.json").map(c => c.id));
  const bookIds = new Set(read("scripts/sources/nig-new-ids.json"));
  const all = readdirSync(reviewDir);
  const files = args.filter(a => !a.startsWith("--"));
  const targets = files.length ? files : all.filter(f => /^(verdict|second)-\d+\.json$/.test(f));
  const errors = targets.flatMap(f => validateFile(f, known, bookIds));
  const missing = all.filter(f => /^batch-\d+\.json$/.test(f)).filter(f => !all.includes(f.replace("batch-", "verdict-")));
  if (!files.length && missing.length) errors.push(`no verdict yet for ${missing.join(", ")}`);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`ok: ${targets.length} file(s) valid`);
  if (!args.includes("--plan-second")) return;

  const items = new Map(read(join(reviewDir, "items.json")).map(i => [i.nigCardId, i]));
  const first = all.filter(f => /^verdict-\d+\.json$/.test(f)).flatMap(f => read(join(reviewDir, f)));
  const needsSecond = first.filter(v => v.confidence !== "high" || (v.action === "keep-new" && items.get(v.nigCardId).tier === "B"));
  for (const f of all) if (/^second-/.test(f)) throw new Error(`second pass already planned (${f}); delete second-* to replan`);
  const chunk = 30;
  for (let i = 0; i < needsSecond.length; i += chunk) {
    save(join(reviewDir, `second-batch-${String(i / chunk + 1).padStart(2, "0")}.json`),
      needsSecond.slice(i, i + chunk).map(v => items.get(v.nigCardId)));
  }
  console.log(`second pass: ${needsSecond.length} items in ${Math.ceil(needsSecond.length / chunk)} batch(es)`);
}

if (process.argv[1]?.endsWith("validate.mjs")) main();
