import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { prepareEntries, cardFromEntry, buildChapterPath, strictSignature } from "./nig.mjs";
import { mergeCandidates } from "./import-merge.mjs";
import { writePath } from "./paths-file.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "scripts/sources/nig-source.json");
const mappingPath = join(root, "scripts/sources/nig-mapping.json");
const read = file => JSON.parse(readFileSync(file, "utf8"));
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const hash = data => createHash("sha256").update(data).digest("hex");

function extractArchive(archive) {
  const sha256 = hash(readFileSync(archive));
  const tmp = mkdtempSync(join(tmpdir(), "nig-"));
  try {
    const files = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).split("\n");
    const collection = files.includes("collection.anki21") ? "collection.anki21" : "collection.anki2";
    writeFileSync(join(tmp, "collection.sqlite"), execFileSync("unzip", ["-p", archive, collection], { maxBuffer: 32 * 1024 * 1024 }));
    const db = new DatabaseSync(join(tmp, "collection.sqlite"), { readOnly: true });
    let raw;
    try {
      const models = JSON.parse(db.prepare("select models from col").get().models);
      const rows = db.prepare(`select n.id,n.mid,n.flds,
        min(case when c.type=0 then c.due end) position
        from notes n left join cards c on c.nid=n.id group by n.id order by n.id`).all();
      raw = rows.map(row => {
        const names = models[String(row.mid)].flds.map(f => f.name);
        for (const name of ["Front", "Back", "Hoofdstuk", "Audio"]) if (!names.includes(name)) throw new Error(`Missing Anki field ${name}`);
        const fields = row.flds.split("\x1f"), get = name => fields[names.indexOf(name)];
        return { id: String(row.id), chapter: Number(get("Hoofdstuk")), position: row.position ?? row.id,
          front: get("Front"), back: get("Back"), audio: get("Audio").match(/\[sound:([^\]]+)\]/)?.[1] };
      });
    } finally { db.close(); }
    const media = JSON.parse(execFileSync("unzip", ["-p", archive, "media"], { encoding: "utf8" }));
    const byName = new Map(Object.entries(media).map(([key, name]) => [name, key]));
    const audioDir = join(root, "data/nederlands-in-gang/audio");
    mkdirSync(audioDir, { recursive: true });
    for (const row of raw) {
      if (!row.audio) continue;
      const key = byName.get(row.audio);
      if (!/^\d+$/.test(key ?? "")) throw new Error(`Missing audio ${row.id}`);
      const bytes = execFileSync("unzip", ["-p", archive, key]);
      const name = `${hash(bytes)}.mp3`;
      writeFileSync(join(audioDir, name), bytes);
      row.audio = `audio/nederlands-in-gang/${name}`;
    }
    return { url: "https://ankiweb.net/shared/info/304232421", updated: "2019-10-08", sha256,
      order: "Hoofdstuk, original Anki new-card due, source note id", records: raw };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

const args = process.argv.slice(2);
const archiveArg = args.find(arg => !arg.startsWith("--"));
const source = archiveArg ? extractArchive(resolve(archiveArg)) : read(sourcePath);
if (source.records.length !== 1092) throw new Error(`Unexpected source size: ${source.records.length}`);
const corrections = read(join(root, "scripts/sources/nig-corrections.json"));
const entries = prepareEntries(source.records, corrections);
const live = read(join(root, "public/cards.json"));
const byId = new Map(live.map(c => [c.id, c]));
const previous = existsSync(mappingPath) ? read(mappingPath) : { records: [] };
if (previous.sourceSha256 && previous.sourceSha256 !== source.sha256) throw new Error("Source archive changed; review the saved mapping before importing a new edition");
const pinned = new Map(previous.records.map(r => [r.sourceId, r.cardId]));
const candidates = entries.map(e => {
  const correction = corrections[e.id];
  const id = pinned.get(e.id) ?? correction?.reuseId;
  if (id && !byId.has(id)) throw new Error(`Saved mapping points to missing ${id}`);
  if (correction?.reuseId && strictSignature(byId.get(correction.reuseId)) !== strictSignature({ dutch: correction.expectedDutch, english: correction.expectedEnglish })) {
    throw new Error(`Reviewed card changed: ${correction.reuseId}`);
  }
  return id ? byId.get(id) : cardFromEntry(e);
});
const merged = mergeCandidates(live, candidates, { signature: strictSignature });
const ids = merged.candidateIds.map((id, i) => pinned.get(entries[i].id) ?? id);
const path = buildChapterPath(entries, ids, new Set(merged.cards.map(c => c.id)));
const mapping = { sourceSha256: source.sha256, records: entries.flatMap((e, i) => e.sourceIds.map(sourceId => ({
  sourceId, cardId: ids[i], chapter: e.chapter, ...(sourceId !== e.id ? { mergedInto: e.id } : {}),
}))) };
const report = { source: source.url, sourceSha256: source.sha256, sourceRecords: source.records.length,
  repairedRecords: entries.length, uniqueCards: new Set(ids).size,
  chapters: path.units.map((u, i) => ({ chapter: i + 1, cards: u.cardIds.length })),
  corrections: entries.filter(e => e.correction).map(e => ({ sourceIds: e.sourceIds, reason: e.correction })),
  reviewedReuse: entries.filter(e => corrections[e.id]?.reuseId).map(e => ({ sourceId: e.id, cardId: corrections[e.id].reuseId })),
};
console.log(JSON.stringify({ sourceRecords: report.sourceRecords, repairedRecords: entries.length, uniqueCards: report.uniqueCards,
  chapters: report.chapters, addedThisRun: merged.added, reusedThisRun: merged.skipped }, null, 2));
if (args.includes("--dry-run")) process.exit(0);
const newIds = merged.cards.slice(live.length).map(c => c.id);
if (archiveArg) save(sourcePath, source);
writeFileSync(join(root, "public/cards.json"), JSON.stringify(merged.cards));
save(mappingPath, mapping);
save(join(root, "scripts/sources/nig-report.json"), report);
const newIdsPath = join(root, "scripts/sources/nig-new-ids.json");
save(newIdsPath, [...new Set([...(existsSync(newIdsPath) ? read(newIdsPath) : []), ...newIds])]);
writePath(join(root, "public/paths.json"), path);
// Audio is installed after enrichment so dictionary recordings retain priority.
save(join(root, "scripts/sources/nig-audio.json"), Object.fromEntries(entries.flatMap((e, i) => e.audio ? [[ids[i], e.audio]] : [])));
