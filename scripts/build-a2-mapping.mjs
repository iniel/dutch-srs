// Parse the marked a2-analysis.txt + resolve every source word to a card action.
// Marks (line prefix): none=map, $M=map+add-sense, $J<n>=pick nth candidate,
// $N=create new A+ card. Emits:
//   a2-mapping.json          authoritative per-list mapping (deliverable #1)
//   scripts/a2-overrides.json addSenses + newCards for the pipeline apply step
// Read-only w.r.t. cards.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANALYSIS = join(root, "a2-analysis.txt");
const CARDS = join(root, "public/cards.json");

const PUNCT = /[.'’/\-,!?;:"()]/g;
const norm = (s) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(PUNCT, "").replace(/\s+/g, " ").trim();
const stripArticle = (s) => s.replace(/^\s*(de|het|een|'t|het\/de|de\/het)\s+/i, "").trim();
const stripParen = (s) => s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

function levelRank(level) {
  let m;
  if ((m = /^A1 · U(\d)/.exec(level))) return 100 + +m[1];
  if ((m = /^A2 · U(\d)/.exec(level))) return 200 + +m[1];
  if (level === "A+") return 300;
  if (level === "B1") return 400;
  if (level === "B2") return 500;
  return 998;
}

// split a source EN gloss into atomic glosses ("matter, business" -> 2)
const splitGloss = (en) =>
  [...new Set(en.split(/[/;,]/).map((s) => s.trim()).filter(Boolean))];

// --- index the deck ----------------------------------------------------------
const cards = JSON.parse(readFileSync(CARDS, "utf8"));
const byNl = new Map();
const add = (k, c) => {
  const kk = norm(k);
  if (!kk) return;
  if (!byNl.has(kk)) byNl.set(kk, []);
  const a = byNl.get(kk);
  if (!a.includes(c)) a.push(c);
};
for (const c of cards) {
  add(c.dutch, c);
  add(stripArticle(c.dutch), c);
  add(stripParen(c.dutch), c);
  add(stripParen(stripArticle(c.dutch)), c);
  if (c.lemma) add(c.lemma, c);
}
// descriptor signature: "dutch\u0001english.join('/')\u0001level" -> card
const sigIndex = new Map();
for (const c of cards) {
  const sig = `${c.dutch}\u0001${c.english.join("/")}\u0001${c.level}`;
  if (!sigIndex.has(sig)) sigIndex.set(sig, c);
}
const enForms = (c) => {
  const s = new Set();
  for (const g of c.english) { s.add(norm(g)); s.add(norm(stripParen(g))); }
  return s;
};
const nlCandidates = (nl) => {
  const parts = nl.split(/[,/]| of /).map((p) => stripArticle(p.trim())).filter(Boolean);
  const set = new Set([stripArticle(nl)]);
  for (const p of parts) set.add(p);
  return [...set].map(norm).filter(Boolean);
};
function matchExact(nl, en) {
  const a = norm(en), b = norm(stripParen(en));
  const hit = [];
  for (const cand of nlCandidates(nl))
    if (byNl.has(cand)) for (const c of byNl.get(cand)) if (!hit.includes(c)) hit.push(c);
  const m = (c) => {
    const f = enForms(c);
    if (f.has(a) || f.has(b)) return true;
    for (const g of c.english) { const gp = norm(stripParen(g)); if (gp && (gp === a || gp === b)) return true; }
    return false;
  };
  return hit.filter(m);
}
// parse "ours:/related:" descriptor list -> [cards] in displayed order
function parseDescriptors(tail) {
  const body = tail.replace(/^(ours|related):\s*/, "");
  const out = [];
  for (const seg of body.split(" | ")) {
    const m = /^(.+?) = (.+?) \[([^\]]+)\]/.exec(seg.trim());
    if (!m) continue;
    const sig = `${m[1].trim()}\u0001${m[2].trim()}\u0001${m[3].trim()}`;
    out.push({ sig, card: sigIndex.get(sig) || null, raw: seg.trim() });
  }
  return out;
}
const selectorOf = (c) => ({ dutch: c.dutch, level: c.level, engAnchor: c.english[0], idNow: c.id });
const lowest = (cardsArr) => [...cardsArr].sort((a, b) => levelRank(a.level) - levelRank(b.level) || (a.id < b.id ? -1 : 1))[0];

// --- parse the marked analysis into a lookup keyed by list||nl||en -----------
const lines = readFileSync(ANALYSIS, "utf8").split("\n");
const lineRe = /^(\$M|\$J(\d+)|\$N)?\s*([✓=!≈✗])\s*(\[[^\]]*\])\s+(.*)$/u;
const lookup = new Map(); // list||normnl||normen -> resolved entry
const unresolved = [];
let curList = null;

for (const line of lines) {
  const h = /^(EASY|MEDIUM|HARD)\s+\(/.exec(line);
  if (h) { curList = h[1].toLowerCase(); continue; }
  const m = lineRe.exec(line);
  if (!m || !curList) continue;
  const mark = m[1] || "";
  const jn = m[2] ? Number(m[2]) : null;
  const sym = m[3];
  const rest = m[5];
  const [nlPart, rightPart] = rest.split("  ⇒  ");
  if (rightPart === undefined) continue;
  const [enPart, tail = ""] = rightPart.split("  ::  ");
  const nl = nlPart.trim();
  const en = enPart.trim();

  const entry = { list: curList, nl, en, mark: mark || "(none)" };

  if (mark === "$N") {
    entry.action = "new";
    const english = splitGloss(en);
    entry.newCard = {
      dutch: nl,
      english,
      type: nl.includes(" ") ? "phrase" : "word",
      lemma: nl.includes(" ") ? undefined : nl,
      cefr: "A2",
    };
    entry.newKey = { dutch: nl, engAnchor: english[0] };
  } else {
    // resolve candidate cards
    let candidates = [];
    if (sym === "✓") candidates = matchExact(nl, en);
    else if (sym === "=" || sym === "!" || sym === "≈") {
      candidates = parseDescriptors(tail).map((d) => d.card).filter(Boolean);
    }
    if (sym === "✗") { // MISSING but not $N -> shouldn't happen; skip
      unresolved.push(`${curList} ${nl} => ${en} (missing, no mark)`);
      continue;
    }
    if (candidates.length === 0) { unresolved.push(`${curList} ${nl} => ${en} (no card matched)`); continue; }

    let target;
    if (jn) {
      const descs = parseDescriptors(tail);
      target = descs[jn - 1]?.card;
      if (!target) { unresolved.push(`${curList} ${nl} $J${jn}: candidate #${jn} not found`); continue; }
      entry.action = "pick";
    } else if (mark === "$M") {
      target = lowest(candidates);
      entry.action = "add-sense";
      entry.addGloss = splitGloss(en);
    } else {
      target = lowest(candidates);
      entry.action = "map";
    }
    entry.selector = selectorOf(target);
  }

  lookup.set(`${curList}\u0001${norm(nl)}\u0001${norm(en)}`, entry);
}

// --- re-walk the xml lists in SOURCE order to build the mapping --------------
function parseXml(f) {
  const raw = readFileSync(join(root, f), "utf8");
  const re = /lang-nl">([\s\S]*?)<\/span><span[^>]*lang-en">([\s\S]*?)<\/span>/g;
  const o = [];
  let m;
  while ((m = re.exec(raw))) o.push({ nl: m[1].trim(), en: m[2].trim() });
  return o;
}
const XML = { easy: "easy.xml", medium: "medium.xml", hard: "hard.xml" };
const mapping = {};
const missingLookup = [];
for (const [list, file] of Object.entries(XML)) {
  const seen = new Set();
  mapping[list] = [];
  for (const { nl, en } of parseXml(file)) {
    const key = `${list}\u0001${norm(nl)}\u0001${norm(en)}`;
    if (seen.has(key)) continue; // dedupe source duplicates
    seen.add(key);
    const e = lookup.get(key);
    if (!e) { missingLookup.push(`${list} ${nl} => ${en}`); continue; }
    mapping[list].push(e);
  }
}

// --- derive overrides --------------------------------------------------------
const addSensesMap = new Map();
const newCardsMap = new Map();
for (const list of Object.keys(mapping)) {
  for (const e of mapping[list]) {
    if (e.action === "add-sense") {
      const k = `${e.selector.dutch}\u0001${e.selector.level}\u0001${e.selector.engAnchor}`;
      if (!addSensesMap.has(k)) addSensesMap.set(k, { selector: e.selector, glosses: [] });
      const rec = addSensesMap.get(k);
      for (const g of e.addGloss) if (!rec.glosses.some((x) => norm(x) === norm(g))) rec.glosses.push(g);
    } else if (e.action === "new") {
      const k = `${norm(e.newCard.dutch)}\u0001${e.newCard.english.map(norm).sort().join(",")}`;
      if (!newCardsMap.has(k)) newCardsMap.set(k, e.newCard);
    }
  }
}
const overrides = {
  note: "Generated by scripts/build-a2-mapping.mjs. Applied by scripts/apply-a2-overrides.mjs AFTER clean, BEFORE enrich.",
  addSenses: [...addSensesMap.values()],
  newCards: [...newCardsMap.values()],
};

writeFileSync(join(root, "a2-mapping.json"), JSON.stringify(mapping, null, 2));
writeFileSync(join(root, "scripts/a2-overrides.json"), JSON.stringify(overrides, null, 2));

// --- report ------------------------------------------------------------------
const counts = {};
for (const list of Object.keys(mapping)) {
  counts[list] = { total: mapping[list].length, map: 0, "add-sense": 0, pick: 0, new: 0 };
  for (const e of mapping[list]) counts[list][e.action]++;
}
console.log("=== a2 mapping ===");
console.table(counts);
console.log(`addSenses: ${overrides.addSenses.length}, newCards: ${overrides.newCards.length}`);
if (unresolved.length) { console.log(`\nUNRESOLVED (${unresolved.length}):`); unresolved.forEach((x) => console.log("  " + x)); }
if (missingLookup.length) { console.log(`\nXML entries with no analysis line (${missingLookup.length}):`); missingLookup.slice(0, 40).forEach((x) => console.log("  " + x)); }
