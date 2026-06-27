// One-off audit: cross-check public/cards.json against public/enrichment.json and
// categorize likely-wrong enrichment. Read-only, prints a categorized report.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle, normalizeHead } from "./extract.mjs";
import { normalizeEng } from "./extract-en-ru.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
const enrich = JSON.parse(readFileSync(join(root, "public/enrichment.json"), "utf8"));

const ARTICLE_RE = /^(de|het)\s+/i;
const cardArticle = (c) => {
  const m = c.dutch.trim().match(ARTICLE_RE);
  return m ? m[1].toLowerCase() : null;
};
const isMultiWord = (c) => normalizeHead(stripArticle(c.dutch)).includes(" ");
const tokens = (s) => (s ?? "").toLowerCase().split(/[^a-zà-ÿ]+/i).filter(Boolean);
const STOP = new Set(["to","a","an","the","of","or","and","be","is","in","on","at","s","someone","something","s.o","s.th"]);

const cats = {
  gender_dehet_merge: [],   // card de|het, enrich "de/het" — bogus neuter from diminutive
  gender_flat_opposite: [], // card de, enrich het-only (or vice versa) — homonym sense
  noun_no_grammar: [],
  pos_mismatch: [],
  wrongsense_no_match: [],   // NO kaikki sense overlaps card meaning — full wrong-word match
  wrongsense_first_gloss: [],// some sense matches but glossSummary is a different sense
  example_missing_head: [],
  phrase_got_senses: [],
  no_enrichment_word: [],
};

// crude EN spelling/synonym normalizer to kill false positives (grey/gray, -re/-er…)
const enNorm = (w) =>
  w.replace(/our$/, "or").replace(/re$/, "er").replace(/^grey$/, "gray")
   .replace(/ou/, "o").replace(/ise$/, "ize").replace(/mm/, "m").replace(/ll/, "l");

for (const c of cards) {
  const e = enrich[c.id];
  const head = normalizeHead(stripArticle(c.dutch));
  const heads = new Set([head, normalizeHead(c.lemma ?? "")].filter(Boolean));

  if (!e) {
    if (c.type === "word") cats.no_enrichment_word.push(`${c.id} ${c.dutch}`);
    continue;
  }

  const isNoun = /\bn\b|noun/i.test(c.pos ?? "");
  const art = cardArticle(c);

  // 1. Article / gender mismatch (card article is ground truth)
  if (isNoun && art && e.grammar?.noun) {
    const ea = e.grammar.noun.article;
    const dim = e.grammar.noun.diminutive ? " +dim" : "";
    if (ea === "de/het") {
      cats.gender_dehet_merge.push(`${c.id} ${c.dutch} → "de/het" gender:[${(e.grammar.noun.gender||[]).join(",")}]${dim}`);
    } else if (ea && ea !== art) {
      cats.gender_flat_opposite.push(`${c.id} ${c.dutch} → enrich:"${ea}" (${e.glossSummary ?? "?"})`);
    }
  }
  // 2. Noun matched to kaikki but no grammar extracted at all
  if (isNoun && art && e.match?.source?.includes("kaikki") && !e.grammar) {
    cats.noun_no_grammar.push(`${c.id} ${c.dutch} (${e.glossSummary ?? "?"})`);
  }

  // 3. POS mismatch: pos was mappable but matched only by bare lemma
  if (e.match?.matchedBy === "lemma" && e.senses?.length) {
    cats.pos_mismatch.push(`${c.id} ${c.dutch} [${c.pos}] → "${e.glossSummary}"`);
  }

  // 4. Wrong-sense detection. Compare card.english to EACH sense separately.
  if (e.senses?.length && c.english?.length) {
    const cardWords = new Set(c.english.flatMap((x) => tokens(normalizeEng(x))).map(enNorm).filter((w) => !STOP.has(w)));
    const fuzzy = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0,4)) || b.startsWith(a.slice(0,4)) || a.includes(b) || b.includes(a)));
    const senseMatches = (s) => {
      const gw = [...new Set((s.glosses ?? []).flatMap(tokens).map(enNorm).filter((w) => !STOP.has(w)))];
      for (const w of cardWords) for (const g of gw) if (fuzzy(w, g)) return true;
      return false;
    };
    if (cardWords.size) {
      const anyMatch = e.senses.some(senseMatches);
      const firstMatch = senseMatches(e.senses[0]);
      if (!anyMatch) {
        cats.wrongsense_no_match.push(`${c.id} ${c.dutch} en:[${c.english.join("|")}] → "${e.senses[0].glosses[0]}"`);
      } else if (!firstMatch) {
        cats.wrongsense_first_gloss.push(`${c.id} ${c.dutch} en:[${c.english.join("|")}] → glossSummary:"${e.senses[0].glosses[0]}"`);
      }
    }
  }

  // 5. Tatoeba examples that don't contain any card head (single-word cards)
  if (!isMultiWord(c) && e.examples?.length) {
    for (const ex of e.examples) {
      if (ex.source !== "tatoeba") continue;
      const toks = new Set(tokens(ex.nl));
      const hit = [...heads].some((h) => !h.includes(" ") && toks.has(h));
      // also accept inflected: head as substring of a token
      const sub = [...heads].some((h) => h.length > 3 && (ex.nl.toLowerCase().includes(h)));
      if (!hit && !sub) {
        cats.example_missing_head.push(`${c.id} ${c.dutch} → "${ex.nl}"`);
        break;
      }
    }
  }

  // 6. Multi-word phrase that nonetheless got kaikki senses (should be whole-phrase only)
  if (c.type !== "word" && isMultiWord(c) && e.senses?.length) {
    cats.phrase_got_senses.push(`${c.id} "${c.dutch}" → "${e.senses[0].glosses[0]}"`);
  }
}

const report = {};
for (const [k, v] of Object.entries(cats)) report[k] = { count: v.length, samples: v.slice(0, 30) };

console.log("=== Enrichment audit ===");
console.log(`cards: ${cards.length}, enriched: ${Object.keys(enrich).length}\n`);
for (const [k, v] of Object.entries(cats)) console.log(`${k.padEnd(24)} ${v.length}`);
writeFileSync(join(root, "scripts/enrich/audit-report.json"), JSON.stringify(report, null, 2));
console.log("\nfull samples → scripts/enrich/audit-report.json");
