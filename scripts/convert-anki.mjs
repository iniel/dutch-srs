// Convert TaalCompleet .apkg decks into public/cards.json.
// .apkg = zip containing collection.anki21 (SQLite). We read the notes table,
// map the TaalCompleet fields (Dutch / English / POS / ...) to Card records,
// dedupe, and group by Section.
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DECKS = [
  { file: "TaalCompleet_A1_Dutch-English-PersianFarsi.apkg", level: "A1" },
  { file: "TaalCompleet_A2_Dutch-English-PersianFarsi.apkg", level: "A2" },
];

const stripHtml = (s) =>
  (s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\[sound:[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

// English meanings can hold several synonyms; split into accepted answers.
const splitMeanings = (s) =>
  stripHtml(s)
    .split(/[;,/]|\bor\b/i)
    .map((x) => x.trim())
    .filter(Boolean);

const posType = (pos) => {
  const p = (pos ?? "").toLowerCase();
  if (p.includes("phrase") || p.includes("expr")) return "phrase";
  if (p.includes("sentence")) return "sentence";
  return "word";
};

function fieldIndex(model) {
  const idx = {};
  model.flds.forEach((f, i) => (idx[f.name.toLowerCase()] = i));
  return idx;
}

function readDeck(apkgPath) {
  const tmp = mkdtempSync(join(tmpdir(), "anki-"));
  try {
    execFileSync("unzip", ["-o", "-q", apkgPath, "collection.anki21", "-d", tmp]);
    const db = new DatabaseSync(join(tmp, "collection.anki21"));
    const col = db.prepare("select models from col").get();
    const models = JSON.parse(col.models);
    const rows = db.prepare("select mid, flds from notes").all();
    db.close();
    return rows.map((r) => {
      const model = models[String(r.mid)];
      const idx = fieldIndex(model);
      const f = r.flds.split("\x1f");
      const get = (name) => f[idx[name]] ?? "";
      return {
        unit: stripHtml(get("unit")),
        section: stripHtml(get("section")),
        dutch: stripHtml(get("dutch")),
        pos: stripHtml(get("pos")),
        english: get("english"),
        lemma: stripHtml(get("lemma")),
        other: stripHtml(get("other forms")),
      };
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const cards = [];
const seen = new Set();
let dropped = 0;

for (const deck of DECKS) {
  const notes = readDeck(join(root, deck.file));
  for (const n of notes) {
    const english = splitMeanings(n.english);
    if (!n.dutch || english.length === 0) {
      dropped++;
      continue;
    }
    const group = `${deck.level} · ${n.section || n.unit || "?"}`;
    const dedupeKey = `${group}|${n.dutch.toLowerCase()}|${english.join(",").toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      dropped++;
      continue;
    }
    seen.add(dedupeKey);
    const level = `${deck.level} · U${n.unit || "?"}`;
    const notesParts = [n.pos, n.other && `forms: ${n.other}`].filter(Boolean);
    cards.push({
      id: `${deck.level}-${cards.length}`,
      level,
      group,
      _deckLevel: deck.level,
      _unit: n.unit,
      _section: n.section,
      dutch: n.dutch,
      english,
      type: posType(n.pos),
      pos: n.pos || undefined,
      lemma: n.lemma || undefined,
      notes: notesParts.length ? notesParts.join(" · ") : undefined,
    });
  }
}

// Lesson order: deck level → numeric unit → numeric section (1.1, 1.2, 1.10 ...).
const numParts = (s) =>
  String(s ?? "")
    .trim()
    .split(".")
    .map((p) => Number(p))
    .map((n) => (Number.isFinite(n) ? n : Infinity));
const compareNum = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
};
cards.sort((a, b) => {
  if (a._deckLevel !== b._deckLevel) return a._deckLevel < b._deckLevel ? -1 : 1;
  const unit = compareNum(numParts(a._unit), numParts(b._unit));
  if (unit !== 0) return unit;
  return compareNum(numParts(a._section), numParts(b._section));
});
cards.forEach((c, i) => {
  c.id = `c${i}`;
  delete c._deckLevel;
  delete c._unit;
  delete c._section;
});

const levels = [...new Set(cards.map((c) => c.level))];
mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public", "cards.json"), JSON.stringify(cards, null, 0));

console.log(`cards: ${cards.length}, levels: ${levels.length}, dropped: ${dropped}`);
console.log("first level:", levels[0], "last level:", levels.at(-1));
console.log("sample:", JSON.stringify(cards.slice(0, 3), null, 2));
