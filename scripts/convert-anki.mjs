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
    const notesParts = [n.pos, n.other && `forms: ${n.other}`].filter(Boolean);
    cards.push({
      id: `${deck.level}-${cards.length}`,
      group,
      dutch: n.dutch,
      english,
      type: posType(n.pos),
      pos: n.pos || undefined,
      lemma: n.lemma || undefined,
      notes: notesParts.length ? notesParts.join(" · ") : undefined,
    });
  }
}

// Stable group order: by level then numeric section (1.1, 1.2, 1.10 ...).
const groupOrder = [...new Set(cards.map((c) => c.group))].sort((a, b) => {
  const num = (g) => g.split("·")[1]?.trim().split(".").map(Number) ?? [0];
  const [la, ...na] = [a.split("·")[0].trim(), ...num(a)];
  const [lb, ...nb] = [b.split("·")[0].trim(), ...num(b)];
  if (la !== lb) return la < lb ? -1 : 1;
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    if ((na[i] ?? 0) !== (nb[i] ?? 0)) return (na[i] ?? 0) - (nb[i] ?? 0);
  }
  return 0;
});
const rank = new Map(groupOrder.map((g, i) => [g, i]));
cards.sort((a, b) => rank.get(a.group) - rank.get(b.group));
cards.forEach((c, i) => (c.id = `c${i}`));

mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public", "cards.json"), JSON.stringify(cards, null, 0));

console.log(`cards: ${cards.length}, groups: ${groupOrder.length}, dropped: ${dropped}`);
console.log("first group:", groupOrder[0], "last group:", groupOrder.at(-1));
console.log("sample:", JSON.stringify(cards.slice(0, 3), null, 2));
