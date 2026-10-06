import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { read, reviewDir, root, norm } from "./common.mjs";

export const REPORT = join(root, "nig-review.txt");
const RANK = { high: 3, medium: 2, low: 1 };
const loadAll = prefix => new Map(readdirSync(reviewDir).filter(f => new RegExp(`^${prefix}-\\d+\\.json$`).test(f))
  .flatMap(f => read(join(reviewDir, f))).map(v => [v.nigCardId, v]));

const unionGloss = (...lists) => {
  const out = [];
  for (const g of lists.flat().filter(Boolean)) if (!out.some(x => norm(x) === norm(g))) out.push(g);
  return out.slice(0, 3);
};
const decision = (v, by) => ({ action: v.action, ...(v.targetId ? { targetId: v.targetId } : {}),
  ...(v.addGloss ? { addGloss: v.addGloss } : {}), subtype: v.subtype, by });

export function reconcile(first, second) {
  if (!second) return { status: "agreed", decision: decision(first, "first") };
  const sameTarget = (first.targetId ?? null) === (second.targetId ?? null);
  if (sameTarget && first.action === second.action) {
    return { status: "agreed", decision: { ...decision(first, "both"),
      ...(first.action === "reuse-add-sense" ? { addGloss: unionGloss(first.addGloss, second.addGloss) } : {}) } };
  }
  let proposed;
  if (sameTarget && first.targetId) {
    const plain = [first, second].find(v => v.action === "reuse");
    proposed = { ...decision(plain, "tiebreak: same target, only one reviewer adds a sense"), addGloss: undefined };
  } else if (RANK[first.confidence] !== RANK[second.confidence]) {
    const winner = RANK[first.confidence] > RANK[second.confidence] ? first : second;
    proposed = decision(winner, `tiebreak: ${winner === first ? "first" : "second"} reviewer more confident`);
  } else {
    proposed = { action: "keep-new", subtype: "book-phrase", by: "tiebreak: equal confidence, keep separate" };
  }
  return { status: "disputed", decision: proposed, options: [first, second] };
}

const MARK = /^\s*(\$(?:N|1|2|J\d+|M\d+))?\s*\[(c\d+)\]/;
export function parseMarks(text) {
  const marks = new Map();
  for (const line of text.split("\n")) {
    const m = MARK.exec(line);
    if (m?.[1]) marks.set(m[2], m[1]);
  }
  return marks;
}

export function applyMark(mark, row, item) {
  if (!mark) return row.decision;
  if (mark === "$N") return { action: "keep-new", subtype: "book-phrase", by: "owner" };
  if (mark === "$1" || mark === "$2") {
    const v = row.options?.[Number(mark[1]) - 1];
    if (!v) throw new Error(`${item.nigCardId}: ${mark} needs a disputed row`);
    return decision(v, "owner");
  }
  const n = Number(mark.slice(2));
  const target = item.candidates[n - 1];
  if (!target) throw new Error(`${item.nigCardId}: ${mark} has no candidate ${n}`);
  return mark.startsWith("$J")
    ? { action: "reuse", targetId: target.id, subtype: "same-word", by: "owner" }
    : { action: "reuse-add-sense", targetId: target.id, addGloss: item.card.english.slice(0, 3), subtype: "missing-sense", by: "owner" };
}

export function finalDecisions() {
  const items = read(join(reviewDir, "items.json"));
  const first = loadAll("verdict"), second = loadAll("second");
  const marks = existsSync(REPORT) ? parseMarks(readFileSync(REPORT, "utf8")) : new Map();
  return items.map(item => {
    const row = item.tier === "A"
      ? { status: "auto", decision: { ...item.proposed, subtype: "same-word", by: "tier A" } }
      : (() => {
        if (!first.has(item.nigCardId)) throw new Error(`No verdict for ${item.nigCardId}`);
        return reconcile(first.get(item.nigCardId), second.get(item.nigCardId));
      })();
    return { item, row, decision: applyMark(marks.get(item.nigCardId), row, item) };
  });
}

function main() {
  if (existsSync(REPORT) && !process.argv.includes("--force")) {
    console.error(`${REPORT} exists (it may hold your marks); pass --force to regenerate`);
    process.exit(1);
  }
  const cards = new Map(read("public/cards.json").map(c => [c.id, c]));
  const show = id => { const c = cards.get(id); return `${id} ${c.dutch} = ${c.english.join(" / ")}`; };
  const head = item => `[${item.nigCardId}] ${item.card.dutch}${item.card.annotation ? ` (${item.card.annotation})` : ""} = ${item.card.english.join(" / ")}  (ch ${[...new Set(item.sources.map(s => s.chapter))].join(",")})`;
  const verdictText = d => d.action === "keep-new" ? "keep new"
    : `${d.action === "reuse" ? "reuse" : "reuse +sense"} ${show(d.targetId)}${d.addGloss ? `  +[${d.addGloss.join(", ")}]` : ""}`;
  const rows = finalDecisions();
  const sections = [
    ["DISPUTED", r => r.row.status === "disputed"],
    ["AGREED · REUSE", r => r.row.status !== "disputed" && r.row.decision.action === "reuse"],
    ["AGREED · REUSE + ADD SENSE", r => r.row.status !== "disputed" && r.row.decision.action === "reuse-add-sense"],
    ["AGREED · KEEP NEW", r => r.row.status !== "disputed" && r.row.decision.action === "keep-new"],
  ];
  const out = [
    "NEDERLANDS IN GANG · merge review",
    "Unmarked lines use the shown decision. To override, put a mark at the very start of a [cNNNNN] line:",
    "  $1 / $2  take reviewer 1 / reviewer 2 (disputed only)    $N  keep as a new card",
    "  $J<n>    reuse candidate n                               $M<n>  reuse candidate n and add the book's English",
    "Then run: node scripts/nig-match/apply.mjs",
  ];
  for (const [title, pick] of sections) {
    const list = rows.filter(pick).sort((a, b) => Math.min(...a.item.sources.map(s => s.chapter)) - Math.min(...b.item.sources.map(s => s.chapter)));
    out.push("", "=".repeat(72), `${title} (${list.length})`, "=".repeat(72));
    for (const { item, row } of list) {
      out.push(`  ${head(item)}`);
      out.push(`      ⇒ ${verdictText(row.decision)}   {${row.decision.subtype}; ${row.decision.by}}`);
      if (row.status === "disputed") row.options.forEach((v, i) =>
        out.push(`      ${i + 1}) ${verdictText(v)}  {${v.subtype}, ${v.confidence}} ${v.note}`));
      if (row.status === "disputed" || row.decision.action === "keep-new") {
        if (item.candidates.length) out.push(`      candidates: ${item.candidates.map((c, i) => `J${i + 1} ${c.id} ${c.dutch} = ${c.english.join("/")}`).join(" | ")}`);
      }
    }
  }
  writeFileSync(REPORT, out.join("\n") + "\n");
  const count = s => rows.filter(r => r.row.status === s).length;
  const actions = {};
  rows.forEach(r => { actions[r.decision.action] = (actions[r.decision.action] ?? 0) + 1; });
  console.log(JSON.stringify({ auto: count("auto"), agreed: count("agreed"), disputed: count("disputed"), actions }, null, 2));
}

if (process.argv[1]?.endsWith("report.mjs")) main();
