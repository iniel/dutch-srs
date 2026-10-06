import { stripArticle } from "./enrich/extract.mjs";

export const text = s => String(s ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "")
  .replace(/\[sound:[^\]]*\]/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/\s+/g, " ").trim();
const norm = s => text(s).normalize("NFC").toLowerCase();
export const strictSignature = c => JSON.stringify([norm(c.dutch), [...new Set(c.english.map(norm))].sort()]);

export function prepareEntries(raw, fixes) {
  const byId = new Map(raw.map(r => [r.id, r]));
  if (byId.size !== raw.length) throw new Error("Duplicate source ids");
  const consumed = new Set();
  for (const [id, fix] of Object.entries(fixes)) {
    if (!byId.has(id)) throw new Error(`Unknown correction ${id}`);
    if (fix.mergeWith) {
      const other = byId.get(fix.mergeWith);
      if (!other || other.chapter !== byId.get(id).chapter || consumed.has(fix.mergeWith)) throw new Error(`Invalid merge ${id}`);
      consumed.add(fix.mergeWith);
    }
  }
  return raw.filter(r => !consumed.has(r.id)).map(r => {
    const f = fixes[r.id] ?? {};
    const front = text(f.front ?? r.front), back = text(f.back ?? r.back);
    if (!front || !back || !Number.isInteger(r.chapter) || r.chapter < 1 || r.chapter > 18) throw new Error(`Invalid source record ${r.id}`);
    return { ...r, front, back, sourceIds: [r.id, ...(f.mergeWith ? [f.mergeWith] : [])],
      ...(f.english ? { english: f.english } : {}),
      ...(f.reason ? { correction: f.reason } : {}),
      // A recording of half a broken source row is not a recording of the repaired phrase,
      // and a recording of "broers" does not belong on the "de broer" card it was mapped to.
      audio: f.mergeWith || f.front || f.form ? undefined : r.audio };
  }).sort((a, b) => a.chapter - b.chapter || a.position - b.position || a.id.localeCompare(b.id));
}

export const chosenCardId = (sourceId, correction, pinned) => correction?.reuseId ?? pinned.get(sourceId);

export function pruneBookCards({ cards, enrichment, bookIds, audio, referenced, expectRemoved }) {
  const removed = bookIds.filter(id => !referenced.has(id));
  if (expectRemoved !== undefined && removed.length !== expectRemoved) {
    throw new Error(`Expected to prune ${expectRemoved} book cards, found ${removed.length}`);
  }
  const gone = new Set(removed);
  return {
    removed,
    cards: cards.filter(c => !gone.has(c.id)),
    enrichment: Object.fromEntries(Object.entries(enrichment).filter(([id]) => !gone.has(id))),
    bookIds: bookIds.filter(id => !gone.has(id)),
    audio: Object.fromEntries(Object.entries(audio).filter(([id]) => !gone.has(id))),
  };
}

export function cardFromEntry(entry) {
  const front = text(entry.front);
  const note = front.match(/\s+\((.*)\)$/)?.[1];
  const dutch = note ? front.slice(0, front.indexOf(" (")).trim() : front;
  const head = stripArticle(dutch);
  const english = entry.english ?? text(entry.back).split(/\s+\/\s+/).filter(Boolean);
  if (!english.length || english.some(s => !s.trim())) throw new Error(`Empty answers ${entry.id}`);
  return { group: `Nederlands in gang · ${entry.chapter}`, dutch, english,
    type: head.includes(" ") ? (/[.!?]$/.test(dutch) ? "sentence" : "phrase") : "word",
    lemma: head.toLowerCase(), ...(note ? { notes: `Book annotation: ${note}` } : {}) };
}

export function buildChapterPath(entries, ids, known) {
  if (entries.length !== ids.length) throw new Error("Incomplete source mapping");
  const units = Array.from({ length: 18 }, (_, i) => ({
    id: `nederlands-in-gang:chapter:${i + 1}`, label: `Hoofdstuk ${i + 1}`, cardIds: [],
  }));
  entries.forEach((entry, i) => {
    if (!known.has(ids[i])) throw new Error(`Unknown card ${ids[i]}`);
    const unit = units[entry.chapter - 1];
    if (!unit) throw new Error(`Invalid chapter ${entry.chapter}`);
    if (!unit.cardIds.includes(ids[i])) unit.cardIds.push(ids[i]);
  });
  if (units.some(u => !u.cardIds.length)) throw new Error("Expected 18 nonempty chapters");
  // Installed PWAs run their precached JS until the update is accepted, but fetch paths.json
  // fresh; a build that only knows tiers crashes on a def without `difficulties`. One tier per
  // chapter, sized to fit, renders the same units there.
  const unitSize = Math.max(...units.map(u => u.cardIds.length));
  const difficulties = units.map((u, i) => ({ key: `chapter-${i + 1}`, label: u.label, cardIds: u.cardIds }));
  return { id: "nederlands-in-gang", name: "Nederlands in gang", units, unitSize, difficulties };
}
