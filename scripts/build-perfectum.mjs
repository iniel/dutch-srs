import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const OUT = join(root, "public/grammar/perfectum.json");

const TAIL_WORDS = new Set(["tegen", "op", "voor", "in", "met", "over", "aan", "van", "uit", "niet", "naar", "bij", "om"]);
const VERB_FORM = /^(zich )?[a-zà-ÿ][a-zà-ÿ-]*[a-zà-ÿ]n$/;
const PARTICIPLE = /^[a-zà-ÿ-]*?(ge|be|ver|ont|her|er|mis|vol|over|onder|door|om|voor|achter|weer)[a-zà-ÿ-]+(d|t|en|n)$/;

export function cleanInfinitive(dutch) {
  let s = dutch.trim().toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  let stripped = s !== dutch.trim().toLowerCase();
  const words = s.split(" ");
  while (words.length > 1 && TAIL_WORDS.has(words[words.length - 1])) {
    words.pop();
    stripped = true;
  }
  s = words.join(" ");
  const reflexive = s.startsWith("zich ");
  if (s.split(" ").length > (reflexive ? 2 : 1)) return { infinitive: null, reason: "phrasal" };
  if (!VERB_FORM.test(s)) return { infinitive: null, reason: "not an infinitive" };
  return { infinitive: s, stripped };
}

function sourceOrder(cards, paths) {
  const order = [];
  const seen = new Set();
  const push = (id) => {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  };
  const byId = (id) => paths.find((p) => p.id === id);
  for (const tier of byId("inburgering")?.difficulties ?? []) tier.cardIds.forEach(push);
  for (const unit of byId("nederlands-in-gang")?.units ?? []) unit.cardIds.forEach(push);
  const levels = [];
  for (const c of cards) if (c.level && !levels.includes(c.level)) levels.push(c.level);
  for (const level of levels) for (const c of cards) if (c.level === level) push(c.id);
  for (const c of cards) push(c.id);
  return order;
}

export function buildItems({ cards, enrichment, paths, aux, overrides }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const dropped = [];
  const suspicious = [];
  const candidates = [];
  for (const id of sourceOrder(cards, paths)) {
    const card = byId.get(id);
    if (!card || !(card.pos ?? "").startsWith("v.")) continue;
    const { infinitive, stripped, reason } = cleanInfinitive(card.dutch);
    if (!infinitive) {
      dropped.push({ id, dutch: card.dutch, kind: reason, reason });
      continue;
    }
    if (overrides.exclude?.[infinitive]) {
      dropped.push({ id, dutch: card.dutch, kind: "excluded", reason: `excluded: ${overrides.exclude[infinitive]}` });
      continue;
    }
    const participle = overrides.participle?.[infinitive] ?? enrichment[id]?.grammar?.verb?.pastParticiple?.trim();
    if (!participle) {
      dropped.push({ id, dutch: card.dutch, kind: "no participle", reason: "no pastParticiple" });
      continue;
    }
    if (!PARTICIPLE.test(participle)) suspicious.push({ id, infinitive, participle });
    candidates.push({ cardId: id, infinitive, participle, stripped });
  }

  const plain = new Set(candidates.filter((c) => !c.stripped).map((c) => c.infinitive));
  const items = [];
  const taken = new Set();
  for (const c of candidates) {
    const card = byId.get(c.cardId);
    if (c.stripped && plain.has(c.infinitive)) {
      dropped.push({ id: c.cardId, dutch: card.dutch, kind: "phrasal duplicate", reason: `phrasal duplicate of ${c.infinitive}` });
      continue;
    }
    if (taken.has(c.infinitive)) {
      dropped.push({ id: c.cardId, dutch: card.dutch, kind: "duplicate", reason: `duplicate infinitive ${c.infinitive}` });
      continue;
    }
    taken.add(c.infinitive);
    const base = c.infinitive.replace(/^zich /, "");
    items.push({ cardId: c.cardId, infinitive: c.infinitive, aux: aux[c.infinitive] ?? aux[base] ?? "hebben", participle: c.participle });
  }
  const unusedAux = Object.keys(aux).filter((k) => !taken.has(k) && !taken.has(`zich ${k}`));
  return { items, dropped, suspicious, unusedAux };
}

export function mergeItems(existing, fresh, { refresh = false } = {}) {
  const freshById = new Map(fresh.map((r) => [r.cardId, r]));
  const kept = existing.map((row) => {
    const next = freshById.get(row.cardId);
    return refresh && next ? { ...row, aux: next.aux, participle: next.participle } : row;
  });
  const ids = new Set(kept.map((r) => r.cardId));
  const infinitives = new Set(kept.map((r) => r.infinitive));
  const appended = fresh.filter((r) => !ids.has(r.cardId) && !infinitives.has(r.infinitive));
  return { items: [...kept, ...appended], appended: appended.length };
}

function main() {
  const refresh = process.argv.includes("--refresh");
  const { items: fresh, dropped, suspicious, unusedAux } = buildItems({
    cards: read("public/cards.json"),
    enrichment: read("public/enrichment.json"),
    paths: read("public/paths.json").paths,
    aux: read("scripts/sources/perfectum-aux.json"),
    overrides: read("scripts/sources/perfectum-overrides.json"),
  });
  const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).items : [];
  const { items, appended } = mergeItems(existing, fresh, { refresh });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(`${OUT}.tmp`, JSON.stringify({ id: "perfectum", name: "Perfectum", items }, null, 1) + "\n");
  renameSync(`${OUT}.tmp`, OUT);

  const count = (aux) => items.filter((r) => r.aux === aux).length;
  console.log(`items: ${items.length} (kept ${existing.length}, appended ${appended}${refresh ? ", refreshed" : ""})`);
  console.log(`aux: hebben ${count("hebben")}, zijn ${count("zijn")}, hebben/zijn ${count("hebben/zijn")}`);
  const reasons = {};
  for (const d of dropped) (reasons[d.kind] ??= []).push(d);
  console.log(`dropped: ${dropped.length}`);
  for (const [reason, list] of Object.entries(reasons)) {
    console.log(`  ${reason} (${list.length}): ${list.slice(0, 8).map((d) => `${d.id} "${d.dutch}"`).join(", ")}`);
  }
  console.log(`suspicious participles: ${suspicious.length}`);
  for (const s of suspicious) console.log(`  ${s.id} ${s.infinitive} -> ${s.participle}`);
  if (unusedAux.length) console.log(`aux entries matching no item: ${unusedAux.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
