import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { read, save, reviewDir, nlKey, enAtoms, bookAnnotation } from "./common.mjs";

const BATCH_SIZE = 30;
const MAX_CANDIDATES = 6;
const REASON_RANK = ["headword", "annotation", "paradigm", "book-duplicate", "near-form", "english"];

const cards = read("public/cards.json");
const enrichment = read("public/enrichment.json");
const newIds = new Set(read("scripts/sources/nig-new-ids.json"));
const mapping = read("scripts/sources/nig-mapping.json").records;
const sourceById = new Map(read("scripts/sources/nig-source.json").records.map(r => [r.id, r]));

const index = () => new Map();
const put = (map, key, card) => {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  if (!map.get(key).includes(card)) map.get(key).push(card);
};
const byHead = index(), byForm = index(), byEnglish = index();
const formsOf = card => {
  const listed = card.notes?.match(/forms: (.*)$/)?.[1]?.split(/,\s*/) ?? [];
  const grammar = enrichment[card.id]?.grammar ?? {};
  const paradigm = Object.values(grammar).flatMap(part => Object.values(part ?? {}))
    .flatMap(v => (Array.isArray(v) ? v : [v])).filter(v => typeof v === "string");
  return [...listed, ...paradigm];
};
for (const card of cards) {
  put(byHead, nlKey(card.dutch), card);
  if (!newIds.has(card.id)) {
    if (card.lemma) put(byHead, nlKey(card.lemma), card);
    for (const form of formsOf(card)) put(byForm, nlKey(form), card);
  }
  for (const atom of enAtoms(card.english)) put(byEnglish, atom, card);
}
const headKeys = [...byHead.keys()];

const glossSummary = id => {
  const e = enrichment[id];
  const glosses = (e?.senses ?? []).flatMap(s => s.glosses ?? []).slice(0, 4);
  return glosses.length ? glosses.join(" / ") : e?.glossSummary;
};
const describe = (card, reasons) => ({
  id: card.id, dutch: card.dutch, english: card.english, ...(card.pos ? { pos: card.pos } : {}),
  where: card.level ?? card.group, ...(card.notes ? { notes: card.notes } : {}),
  ...(glossSummary(card.id) ? { dictionary: glossSummary(card.id) } : {}),
  ...(enrichment[card.id]?.grammar ? { grammar: enrichment[card.id].grammar } : {}),
  reasons,
});

const sourcesByCard = new Map();
for (const r of mapping) {
  if (!sourcesByCard.has(r.cardId)) sourcesByCard.set(r.cardId, []);
  const s = sourceById.get(r.sourceId);
  sourcesByCard.get(r.cardId).push({ sourceId: r.sourceId, chapter: r.chapter, front: s.front, back: s.back,
    ...(r.mergedInto ? { mergedInto: r.mergedInto } : {}) });
}

const covers = (candidate, book) => [...book].every(a => candidate.has(a));
const items = [];
for (const card of cards.filter(c => newIds.has(c.id))) {
  const head = nlKey(card.dutch);
  const annotation = bookAnnotation(card);
  const found = new Map();
  const hit = (other, reason) => {
    if (other.id === card.id) return;
    if (newIds.has(other.id) && reason !== "book-duplicate" && reason !== "headword") return;
    const r = newIds.has(other.id) ? "book-duplicate" : reason;
    if (!found.has(other.id)) found.set(other.id, { card: other, reasons: new Set() });
    found.get(other.id).reasons.add(r);
  };
  for (const other of byHead.get(head) ?? []) hit(other, "headword");
  if (annotation) for (const key of new Set([nlKey(annotation), ...annotation.split(/[,/]/).map(nlKey)]))
    for (const other of byHead.get(key) ?? []) hit(other, "annotation");
  for (const other of byForm.get(head) ?? []) hit(other, "paradigm");
  if (head.length >= 4) for (const key of headKeys) {
    if (key === head || Math.abs(key.length - head.length) > 3 || !(key.startsWith(head) || head.startsWith(key)) || key.length < 3) continue;
    for (const other of byHead.get(key)) if (!newIds.has(other.id)) hit(other, "near-form");
  }
  const book = enAtoms(card.english);
  const englishHits = new Map();
  for (const atom of book) for (const other of byEnglish.get(atom) ?? []) {
    if (newIds.has(other.id)) continue;
    englishHits.set(other, (englishHits.get(other) ?? 0) + 1);
  }
  [...englishHits].sort((a, b) => b[1] - a[1] || a[0].id.localeCompare(b[0].id)).slice(0, 3)
    .forEach(([other]) => hit(other, "english"));

  const rank = c => Math.min(...[...c.reasons].map(r => REASON_RANK.indexOf(r)));
  const candidates = [...found.values()].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_CANDIDATES);
  const coveringHeads = candidates.filter(c => !newIds.has(c.card.id) && nlKey(c.card.dutch) === head
    && covers(enAtoms(c.card.english), book));
  const couldBeAForm = annotation || candidates.some(c => c.card.id !== coveringHeads[0]?.card.id
    && (c.reasons.has("paradigm") || c.reasons.has("annotation")));
  const tier = coveringHeads.length === 1 && !couldBeAForm ? "A" : candidates.length ? "B" : "C";
  items.push({
    nigCardId: card.id, tier,
    ...(tier === "A" ? { proposed: { action: "reuse", targetId: coveringHeads[0].card.id } } : {}),
    card: { dutch: card.dutch, english: card.english, type: card.type, ...(annotation ? { annotation } : {}),
      ...(glossSummary(card.id) ? { dictionary: glossSummary(card.id) } : {}),
      ...(enrichment[card.id]?.grammar ? { grammar: enrichment[card.id].grammar } : {}) },
    sources: sourcesByCard.get(card.id) ?? [],
    candidates: candidates.map(c => describe(c.card, [...c.reasons])),
  });
}

mkdirSync(reviewDir, { recursive: true });
for (const f of readdirSync(reviewDir)) if (/^(batch|verdict|second)-/.test(f)) rmSync(join(reviewDir, f));
save(join(reviewDir, "items.json"), items);
const toReview = items.filter(i => i.tier !== "A").sort((a, b) => a.tier.localeCompare(b.tier)
  || Math.min(...a.sources.map(s => s.chapter)) - Math.min(...b.sources.map(s => s.chapter)));
const batches = [];
for (let i = 0; i < toReview.length; i += BATCH_SIZE) batches.push(toReview.slice(i, i + BATCH_SIZE));
batches.forEach((batch, i) => save(join(reviewDir, `batch-${String(i + 1).padStart(2, "0")}.json`), batch));

const count = t => items.filter(i => i.tier === t).length;
console.log(JSON.stringify({ items: items.length, tierA: count("A"), tierB: count("B"), tierC: count("C"),
  batches: batches.length, out: reviewDir.replace(/.*dutch-srs\//, "") }, null, 2));
