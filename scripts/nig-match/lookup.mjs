import { read, nlKey, enAtoms } from "./common.mjs";

const [mode, ...words] = process.argv.slice(2);
const query = words.join(" ");
if (!["nl", "en"].includes(mode) || !query) {
  console.error('usage: node scripts/nig-match/lookup.mjs nl|en <text>   (nl: Dutch substring, en: English answer)');
  process.exit(1);
}
const cards = read("public/cards.json");
const newIds = new Set(read("scripts/sources/nig-new-ids.json"));
const q = mode === "nl" ? nlKey(query) : [...enAtoms([query])][0];
const hits = cards.filter(c => mode === "nl"
  ? nlKey(c.dutch).includes(q) || nlKey(c.lemma).includes(q)
  : [...enAtoms(c.english)].some(a => a === q || a.split(" ").includes(q)));
for (const c of hits.slice(0, 40)) {
  console.log(`${c.id}${newIds.has(c.id) ? " [book]" : ""}  ${c.dutch} = ${c.english.join(" / ")}  (${c.level ?? c.group}${c.pos ? ", " + c.pos : ""})`);
}
if (hits.length > 40) console.log(`... ${hits.length - 40} more`);
