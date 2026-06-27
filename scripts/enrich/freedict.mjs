// Parse a FreeDict (WikDict) bilingual dictionary in TEI format into a
// head -> Russian-translations index. Both eng-rus and nld-rus share the same
// shape: each <entry> has a headword <orth> and one or more
// <cit type="trans" xml:lang="ru"> blocks holding <quote> translations.
// The TEI files are small (a few MB), so we read them whole; the string parser
// is pure and unit-tested in freedict.test.mjs.
import { readFileSync } from "node:fs";
import { stripStress, isProperNoun } from "./extract-en-ru.mjs";

export function parseFreedictTei(xml, keyFn = (s) => s) {
  const map = new Map();
  for (const chunk of (xml ?? "").split(/<entry\b/).slice(1)) {
    const orth = chunk.match(/<orth>([^<]*)<\/orth>/);
    if (!orth) continue;
    const key = keyFn(orth[1].trim());
    if (!key) continue;
    const words = [];
    for (const cit of chunk.matchAll(/<cit type="trans"[^>]*>([\s\S]*?)<\/cit>/g)) {
      for (const q of cit[1].matchAll(/<quote>([^<]*)<\/quote>/g)) {
        const w = stripStress(q[1].trim()).trim();
        if (w && !isProperNoun(w) && !words.includes(w)) words.push(w);
      }
    }
    if (!words.length) continue;
    const merged = map.get(key) ?? [];
    for (const w of words) if (!merged.includes(w)) merged.push(w);
    map.set(key, merged);
  }
  return map;
}

export function loadFreedictIndex(path, keyFn) {
  const map = parseFreedictTei(readFileSync(path, "utf8"), keyFn);
  console.log(`freedict: ${map.size} heads indexed from ${path.split("/").slice(-1)[0]}`);
  return map;
}
