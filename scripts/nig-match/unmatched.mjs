import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { read, root } from "./common.mjs";

const OUT = join(root, "docs/nederlands-in-gang/unmatched");
const cards = new Map(read("public/cards.json").map(c => [c.id, c]));
const bookIds = new Set(read("scripts/sources/nig-new-ids.json"));
const units = read("public/paths.json").paths.find(p => p.id === "nederlands-in-gang").units;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
units.forEach((unit, i) => {
  const lines = unit.cardIds.filter(id => bookIds.has(id)).map(id => {
    const card = cards.get(id);
    return `${card.dutch} — ${card.english.join(", ")}`;
  });
  writeFileSync(join(OUT, `hoofdstuk-${String(i + 1).padStart(2, "0")}.txt`), lines.join("\n") + "\n");
});
console.log(`${units.length} files in ${OUT.replace(root + "/", "")}`);
