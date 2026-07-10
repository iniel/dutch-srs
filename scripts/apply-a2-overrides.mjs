// Apply the A2-list overrides to public/cards.json. Runs in the pipeline AFTER
// clean-cards.mjs and BEFORE enrich-cards.mjs so the new cards get enriched.
//
// Idempotent:
//   - addSenses: appends the list gloss(es) to the matched card, skipping any
//     gloss already present (normalized) -> re-running is a no-op.
//   - newCards:  appends a new A+ card only if one with the same Dutch + A+ level
//     + same first gloss doesn't already exist -> re-running is a no-op.
//
// NOTE: convert-nt2lex.mjs rebuilds the whole A+/B1/B2 block and reassigns its
// ids on every run, so this step MUST run after it (and after clean). Card ids
// for the appended block are therefore only stable within a full pipeline pass;
// regenerate the id lists (build-a2-idlists.mjs) whenever you re-run convert*.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARDS = join(root, "public/cards.json");
const OVERRIDES = join(root, "scripts/a2-overrides.json");

const PUNCT = /[.'’/\-,!?;:"()]/g;
const norm = (s) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(PUNCT, "").replace(/\s+/g, " ").trim();
const GROUP_SIZE = 25;

function main() {
  const cards = JSON.parse(readFileSync(CARDS, "utf8"));
  const { addSenses = [], newCards = [] } = JSON.parse(readFileSync(OVERRIDES, "utf8"));

  // --- 1. add senses to existing cards ---------------------------------------
  let sensesAdded = 0, sensesSkipped = 0, sensesUnmatched = 0;
  for (const { selector, glosses } of addSenses) {
    const card = cards.find(
      (c) => c.dutch === selector.dutch && c.level === selector.level && c.english.includes(selector.engAnchor),
    );
    if (!card) {
      console.warn(`  [add-sense] no match: ${selector.dutch} [${selector.level}] anchor "${selector.engAnchor}"`);
      sensesUnmatched++;
      continue;
    }
    const have = new Set(card.english.map(norm));
    for (const g of glosses) {
      if (have.has(norm(g))) { sensesSkipped++; continue; }
      card.english.push(g);
      have.add(norm(g));
      sensesAdded++;
    }
  }

  // --- 2. append new A+ cards ------------------------------------------------
  const existsNew = (nc) =>
    cards.some((c) => c.level === "A+" && c.dutch === nc.dutch && c.english[0] === nc.english[0]);
  const pending = newCards.filter((nc) => !existsNew(nc));

  let maxIdx = cards.reduce((m, c) => Math.max(m, Number(String(c.id).slice(1)) || 0), -1);
  // continue A+ group numbering after the highest existing "A+ · N"
  let maxGroup = 0;
  for (const c of cards) {
    const g = /^A\+ · (\d+)$/.exec(c.group || "");
    if (g) maxGroup = Math.max(maxGroup, Number(g[1]));
  }

  const appended = [];
  pending.forEach((nc, i) => {
    const card = {
      id: `c${++maxIdx}`,
      level: "A+",
      group: `A+ · ${maxGroup + 1 + Math.floor(i / GROUP_SIZE)}`,
      cefr: nc.cefr || "A2",
      dutch: nc.dutch,
      english: nc.english,
      type: nc.type || "word",
    };
    if (nc.pos) card.pos = nc.pos;
    if (nc.lemma) card.lemma = nc.lemma;
    cards.push(card);
    appended.push(card);
  });

  writeFileSync(CARDS, JSON.stringify(cards));

  console.log("=== apply-a2-overrides ===");
  console.log(`add-sense: +${sensesAdded} glosses (skipped ${sensesSkipped} existing, ${sensesUnmatched} unmatched)`);
  console.log(`new cards: +${appended.length} (skipped ${newCards.length - pending.length} already present)`);
  console.log(`cards.json total: ${cards.length}`);
}

main();
