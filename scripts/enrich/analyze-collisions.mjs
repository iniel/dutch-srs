// One-off READ-ONLY audit of public/cards.json.
// Finds: (1) same Dutch / different English, (2) same English / different Dutch,
// (3) exact duplicates, (4) translations carrying extra words beyond the gloss.
// Mirrors src/review/answerCheck.ts normalize() so counts reflect answer checking.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));

const PUNCT = /[.'’/\-,!?;:"()]/g;
const normalize = (s) =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(PUNCT, "")
    .replace(/\s+/g, " ")
    .trim();

const ARTICLES = ["de ", "het ", "een ", "’t ", "'t "];
const stripArticle = (s) => {
  const t = s.trim();
  const low = t.toLowerCase();
  for (const a of ARTICLES) if (low.startsWith(a)) return t.slice(a.length).trim();
  return t;
};

// --- group keys -------------------------------------------------------------
// Dutch prompt the user sees in NL→EN, article-stripped + normalized so "de bank"
// and "bank" collide (en_nl accepts both article variants anyway).
const nlKey = (c) => normalize(stripArticle(c.dutch));
// Each individual English gloss, normalized the same way answer checking does.
const enKeys = (c) => [...new Set((c.english ?? []).map(normalize).filter(Boolean))];

// === 1 & 3: group by Dutch =================================================
const byNl = new Map();
for (const c of cards) {
  const k = nlKey(c);
  if (!k) continue;
  (byNl.get(k) ?? byNl.set(k, []).get(k)).push(c);
}

const dutchCollisions = []; // same Dutch, DIFFERENT english sets
const exactDuplicates = []; // same Dutch, SAME english set
for (const [k, group] of byNl) {
  if (group.length < 2) continue;
  const enSig = (c) => enKeys(c).slice().sort().join("|");
  const sigs = new Set(group.map(enSig));
  if (sigs.size === 1) {
    exactDuplicates.push({
      dutch: group.map((c) => c.dutch),
      english: group[0].english,
      ids: group.map((c) => c.id),
      levels: group.map((c) => c.level ?? c.cefr ?? "?"),
    });
  } else {
    dutchCollisions.push({
      key: k,
      ids: group.map((c) => c.id),
      variants: group.map((c) => ({ id: c.id, dutch: c.dutch, english: c.english, level: c.level ?? c.cefr ?? "?" })),
    });
  }
}

// === 2: group by English gloss =============================================
const byEn = new Map();
for (const c of cards) {
  for (const k of enKeys(c)) (byEn.get(k) ?? byEn.set(k, []).get(k)).push(c);
}
// A gloss made only of function/stop words is meaningless as an EN→NL prompt
// and is the signature of junk auto-extracted vocab ("of", "from", "to a").
const STOP = new Set([
  "of","from","to","a","an","the","and","or","in","on","at","for","with","by",
  "as","it","is","be","that","this","s","one","ones","oneself","not","no",
]);
const isJunkGloss = (k) => k.split(" ").every((w) => STOP.has(w));

const englishCollisions = []; // one gloss -> several DIFFERENT Dutch words
const junkGlossCollisions = [];
for (const [k, group] of byEn) {
  const distinctNl = new Set(group.map(nlKey));
  if (distinctNl.size < 2) continue;
  const entry = {
    gloss: k,
    count: distinctNl.size,
    words: [...new Map(group.map((c) => [nlKey(c), c])).values()].map((c) => ({
      id: c.id,
      dutch: c.dutch,
      english: c.english,
      level: c.level ?? c.cefr ?? "?",
    })),
  };
  (isJunkGloss(k) ? junkGlossCollisions : englishCollisions).push(entry);
}
englishCollisions.sort((a, b) => b.count - a.count);
junkGlossCollisions.sort((a, b) => b.count - a.count);

// === 4: translations with extra words beyond the gloss =====================
// Sub-classify the noise so we know what the app does with each.
const extra = {
  parenthetical: [],   // "married (to someone)", "(informal) ..."
  bracket: [],         // "[figurative] ..."
  slash_alt: [],       // "couch / sofa"  (alternatives crammed in one string)
  multi_clause: [],    // "to run; to flow"  (; or , joining senses)
  placeholder: [],     // someone / something / sth / s.o. / s.th.
  register_tag: [],    // (formal) (informal) (figurative) (literally) etc.
  abbrev_etc: [],      // "etc." / "e.g." / "i.e."
  infinitive_to: [],   // leading "to " — extra grammatical word vs bare gloss
};
const PLACEHOLDER = /\b(someone|something|somebody|sth|s\.?o\.?|s\.?th\.?|oneself|one's)\b/i;
const REGISTER = /\((formal|informal|colloq\.?|colloquial|figurative|fig\.?|literally|lit\.?|slang|archaic|dated|vulgar)\)/i;

for (const c of cards) {
  for (const raw of c.english ?? []) {
    const s = raw.trim();
    const hit = (bucket) => extra[bucket].push({ id: c.id, dutch: c.dutch, english: raw });
    if (REGISTER.test(s)) hit("register_tag");
    else if (/\(/.test(s)) hit("parenthetical");
    if (/\[/.test(s)) hit("bracket");
    if (/\//.test(s)) hit("slash_alt");
    if (/[;,]/.test(s)) hit("multi_clause");
    if (PLACEHOLDER.test(s)) hit("placeholder");
    if (/\b(etc|e\.g|i\.e)\b/i.test(s)) hit("abbrev_etc");
    if (/^to\s+\w/i.test(s)) hit("infinitive_to");
  }
}

// --- report -----------------------------------------------------------------
const total = cards.length;
const cardsIn = (arr) => new Set(arr.flatMap((g) => (g.words ?? g.variants ?? []).map((w) => w.id))).size;
const summary = {
  totalCards: total,
  dutchCollisions: dutchCollisions.length,
  dutchCollisionCards: cardsIn(dutchCollisions),
  englishCollisions: englishCollisions.length,
  englishCollisionCards: cardsIn(englishCollisions),
  junkGlossCollisions: junkGlossCollisions.length,
  exactDuplicates: exactDuplicates.length,
  extraWords: Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v.length])),
};

const report = {
  summary,
  dutchCollisions: dutchCollisions.slice(0, 60),
  englishCollisions: englishCollisions.slice(0, 80),
  junkGlossCollisions: junkGlossCollisions.slice(0, 60),
  exactDuplicates: exactDuplicates.slice(0, 60),
  extraWords: Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v.slice(0, 25)])),
};
writeFileSync(join(root, "scripts/enrich/collisions-report.json"), JSON.stringify(report, null, 2));

console.log("=== cards.json collision / translation audit ===");
console.log(`total cards: ${total}\n`);
console.log("COLLISIONS");
console.log(`  same Dutch, different English (NL→EN ambiguous): ${dutchCollisions.length} groups, ${summary.dutchCollisionCards} cards`);
console.log(`  same English gloss, different Dutch (EN→NL ambiguous, real polysemy): ${englishCollisions.length} groups, ${summary.englishCollisionCards} cards`);
console.log(`  JUNK function-word glosses colliding (e.g. "of","from"): ${junkGlossCollisions.length} groups`);
console.log(`  exact duplicates (same Dutch + same English): ${exactDuplicates.length}`);
console.log("\nEXTRA WORDS IN TRANSLATION (one entry can hit several buckets)");
for (const [k, v] of Object.entries(extra)) console.log(`  ${k.padEnd(16)} ${v.length}`);
console.log("\nfull samples → scripts/enrich/collisions-report.json");

// a few inline samples for the big buckets
const sample = (arr, n, f) => arr.slice(0, n).map(f).forEach((l) => console.log("    " + l));
console.log("\nsample — same Dutch / diff English:");
sample(dutchCollisions, 8, (g) => `${g.key}: ` + g.variants.map((v) => `${v.dutch}=[${v.english.join(", ")}]`).join("  ||  "));
console.log("\nsample — same English / diff Dutch (top by fan-out):");
sample(englishCollisions, 8, (g) => `"${g.gloss}" -> ${g.words.map((w) => w.dutch).join(", ")}`);
