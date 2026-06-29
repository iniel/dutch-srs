// Regen-safe cleaning pass over public/cards.json. Runs AFTER convert-anki.mjs
// and convert-nt2lex.mjs, BEFORE enrich-cards.mjs. Idempotent and DROP-ONLY:
// it removes junk glosses and exact-duplicate cards but NEVER renumbers ids, so
// public/enrichment.json (keyed by id) and saved localStorage progress stay valid.
//
// What it fixes (see scripts/enrich/analyze-collisions.mjs for the audit):
//   - junk function-word glosses ("of", "from", "to be", ...)         [cat 3]
//   - register tags / "etc."/"e.g." remnants in glosses               [cat 5b, 5c]
//   - truncated / unbalanced-parenthesis gloss fragments              [cat 5e]
//   - exact-duplicate cards (same Dutch + same English)               [cat 4]
//
// Place-name fragment junk ("Zeeland", "Netherlands" from comma-split definitions)
// is fixed at the source in scripts/convert-nt2lex.mjs, not here, so curated cards
// whose answer is legitimately a proper noun ("CD", "Muslim") are never touched.
//
// NOT handled here (by design): parenthetical/placeholder bare-answer acceptance
// ("cousin (male)" should also accept "cousin") is done at runtime in
// src/review/synonyms.ts so the EN->NL prompt keeps its disambiguator.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle } from "./enrich/extract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARDS = join(root, "public/cards.json");

const PUNCT = /[.'’/\-,!?;:"()]/g;
const normalize = (s) =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(PUNCT, "")
    .replace(/\s+/g, " ")
    .trim();

// A gloss made only of these is meaningless as a prompt/answer.
const STOP = new Set([
  "of", "from", "to", "a", "an", "the", "and", "or", "in", "on", "at", "for",
  "with", "by", "as", "it", "is", "be", "that", "this", "s", "one", "ones",
  "oneself", "not", "no",
]);

// Grammar/spelling-rule sentences in the TaalCompleet deck that describe Dutch
// *about* Dutch (meta-linguistic rules) rather than vocabulary to drill. Matched
// on normalized Dutch so the drop survives a fresh `npm run convert`.
const DROP_DUTCH = new Set(
  [
    "Aan het eind van een woord staan nooit twee dezelfde medeklinkers.",
    "Heeft het hele werkwoord een lange klank? De ik-vorm krijgt twee klinkers.",
  ].map(normalize)
);
const isFunctionWordGloss = (g) => {
  const n = normalize(g);
  return n.length > 0 && n.split(" ").every((w) => STOP.has(w));
};

const REGISTER =
  /\s*\((?:very\s+)?(?:formal|informal|colloq\.?|colloquial|figurative|fig\.?|literally|lit\.?|slang|archaic|dated|vulgar|old-fashioned)\)\s*/gi;
const ABBREV = /\b(?:etc|e\.g|i\.e)\.?/gi;

const countChar = (s, ch) => (s.match(ch) ? s.match(ch).length : 0);

// Salvage a gloss with mismatched parentheses (a split definition):
//   "article (een"               -> "article"  (cut the dangling open paren + tail)
//   "moss growing on surfaces)"  -> "moss growing on surfaces"  (strip stray close)
function fixUnbalancedParens(g) {
  const open = countChar(g, /\(/g);
  const close = countChar(g, /\)/g);
  if (open === close) return g;
  const out =
    open > close
      ? g.slice(0, g.indexOf("(")) // dangling open paren: keep the head, drop the tail
      : g.replace(/\)/g, " "); // stray close paren: drop the bracket, keep the words
  return out.replace(/\s+/g, " ").trim() || null;
}

const stats = {
  functionWordDropped: 0,
  registerStripped: 0,
  abbrevStripped: 0,
  unbalancedFixed: 0,
  unbalancedDropped: 0,
  emptiedRestored: 0,
  duplicateCardsDropped: 0,
  ruleSentencesDropped: 0,
};

function cleanEnglish(list) {
  // Pass 1: per-gloss text fixes (register tags, abbreviations, broken parens).
  let glosses = [];
  for (const raw of list ?? []) {
    let g = String(raw);

    const beforeReg = g;
    g = g.replace(REGISTER, " ").replace(/\s+/g, " ").trim();
    if (g !== beforeReg) stats.registerStripped++;

    const beforeAbbr = g;
    g = g.replace(ABBREV, " ").replace(/\s+/g, " ").replace(/^[\s,;]+|[\s,;]+$/g, "").trim();
    if (g !== beforeAbbr) stats.abbrevStripped++;

    if (countChar(g, /\(/g) !== countChar(g, /\)/g)) {
      const fixed = fixUnbalancedParens(g);
      if (fixed === null) {
        stats.unbalancedDropped++;
        continue;
      }
      stats.unbalancedFixed++;
      g = fixed;
    }

    if (g) glosses.push(g);
  }

  // Pass 2: drop function-word-only glosses (keep if it would empty the card).
  const nonStop = glosses.filter((g) => !isFunctionWordGloss(g));
  if (nonStop.length > 0) {
    stats.functionWordDropped += glosses.length - nonStop.length;
    glosses = nonStop;
  }

  // De-dupe (case-insensitive) while preserving order.
  const seen = new Set();
  const deduped = [];
  for (const g of glosses) {
    const key = normalize(g);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(g);
  }
  return deduped;
}

function main() {
  let cards = JSON.parse(readFileSync(CARDS, "utf8"));

  // Drop meta-linguistic grammar-rule sentences (not vocabulary).
  cards = cards.filter((c) => {
    if (DROP_DUTCH.has(normalize(c.dutch))) {
      stats.ruleSentencesDropped++;
      return false;
    }
    return true;
  });

  for (const c of cards) {
    const cleaned = cleanEnglish(c.english);
    if (cleaned.length === 0) {
      // Never ship an unanswerable card: keep the original and flag it.
      stats.emptiedRestored++;
      console.warn(`  [keep] ${c.id} "${c.dutch}" would empty -> kept original ${JSON.stringify(c.english)}`);
      continue;
    }
    c.english = cleaned;
  }

  // Drop exact-duplicate cards: same article-stripped Dutch + same English set.
  // Keep the lowest-numbered id (curated A1/A2 before the freq re-adds).
  const idNum = (c) => Number(String(c.id).slice(1)) || 0;
  const sig = (c) =>
    normalize(stripArticle(c.dutch)) + "\u0000" + [...c.english].map(normalize).sort().join("\u0001");
  const firstSig = new Map();
  const kept = [];
  for (const c of [...cards].sort((a, b) => idNum(a) - idNum(b))) {
    const s = sig(c);
    if (firstSig.has(s)) {
      stats.duplicateCardsDropped++;
      continue;
    }
    firstSig.set(s, c.id);
    kept.push(c);
  }
  // Restore original card order (by id) for a stable, minimal diff.
  kept.sort((a, b) => idNum(a) - idNum(b));

  writeFileSync(CARDS, JSON.stringify(kept));

  console.log("=== clean-cards ===");
  console.log(`cards: ${cards.length} -> ${kept.length}`);
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(22)} ${v}`);
}

main();
