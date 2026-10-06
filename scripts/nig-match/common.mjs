import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const reviewDir = join(root, "scripts/import/nig-review");
export const read = path => JSON.parse(readFileSync(path.startsWith("/") ? path : join(root, path), "utf8"));
export const save = (path, value) => writeFileSync(path.startsWith("/") ? path : join(root, path), JSON.stringify(value, null, 2) + "\n");

const ARTICLE = /^\s*(de|het|een|'t|het\/de|de\/het)\s+/i;
const PUNCT = /[.'’/\-,!?;:"()…]/g;
export const norm = s => String(s ?? "").normalize("NFC").toLowerCase().replace(PUNCT, " ").replace(/\s+/g, " ").trim();
export const stripParen = s => String(s ?? "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
export const nlKey = s => norm(stripParen(String(s ?? "").replace(ARTICLE, "")));

const EN_ALIASES = new Map([["ms", "mrs"], ["mr", "mr"], ["mum", "mom"], ["mummy", "mom"], ["colour", "color"]]);
export function enAtoms(glosses) {
  const atoms = new Set();
  for (const gloss of glosses) {
    for (const piece of String(gloss).split(/[\/,;]|\bor\b/)) {
      for (const variant of [piece, stripParen(piece)]) {
        const atom = norm(variant).replace(/^(to|a|an|the)\s+/, "");
        if (atom) atoms.add(EN_ALIASES.get(atom) ?? atom);
      }
    }
  }
  return atoms;
}

export const bookAnnotation = card => card.notes?.match(/Book annotation: (.*)$/)?.[1];
export const idNum = id => Number(String(id).slice(1));
