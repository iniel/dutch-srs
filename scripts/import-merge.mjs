import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle } from "./enrich/extract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PUNCT = /[.'’/\-,!?;:"()]/g;
const normalize = (s) =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(PUNCT, "")
    .replace(/\s+/g, " ")
    .trim();

// Must stay in sync with scripts/clean-cards.mjs `sig` or dedupe disagrees with its dup detection.
export const sig = (c) =>
  normalize(stripArticle(c.dutch)) + "\u0000" + [...c.english].map(normalize).sort().join("\u0001");

const idNum = (id) => Number(String(id).slice(1)) || 0;

export function mergeCandidates(live, candidates) {
  const originalIds = live.map((c) => c.id);
  let maxId = live.reduce((m, c) => Math.max(m, idNum(c.id)), -1);
  const seen = new Set(live.map(sig));
  const out = [...live];
  let added = 0;
  let skipped = 0;

  for (const cand of candidates) {
    const s = sig(cand);
    if (seen.has(s)) {
      skipped++;
      continue;
    }
    seen.add(s);
    const { id: _throwaway, ...rest } = cand;
    out.push({ id: `c${++maxId}`, ...rest });
    added++;
  }

  for (let i = 0; i < originalIds.length; i++) {
    if (out[i].id !== originalIds[i]) {
      throw new Error(`append-only violation at index ${i}: ${out[i].id} != ${originalIds[i]}`);
    }
  }
  const ids = new Set();
  for (const c of out) {
    if (ids.has(c.id)) throw new Error(`duplicate id ${c.id}`);
    ids.add(c.id);
  }

  return { cards: out, added, skipped };
}

function main() {
  const LIVE = join(root, "public/cards.json");
  const args = process.argv.slice(2);
  const files = (args.length
    ? args
    : ["scripts/import/anki.staging.json", "scripts/import/nt2lex.staging.json"]
  )
    .map((f) => resolve(root, f))
    .filter((f) => existsSync(f));

  if (files.length === 0) {
    console.error("no staging files found — run `npm run convert` / `npm run convert:nt2lex` first.");
    process.exit(1);
  }

  const live = JSON.parse(readFileSync(LIVE, "utf8"));
  const candidates = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")));

  const before = live.length;
  const { cards, added, skipped } = mergeCandidates(live, candidates);
  writeFileSync(LIVE, JSON.stringify(cards));

  console.log("=== import-merge ===");
  console.log(`staging files: ${files.map((f) => f.replace(root + "/", "")).join(", ")}`);
  console.log(`candidates: ${candidates.length} (added ${added}, skipped ${skipped} duplicates)`);
  console.log(`cards.json: ${before} -> ${cards.length}`);
  if (added > 0) {
    console.log("next: npm run enrich && npm run a2:idlists (regenerate the id-keyed sidecars)");
  }
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
