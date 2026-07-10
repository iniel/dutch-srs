import { readFileSync, writeFileSync } from "node:fs";

const PUNCT = /[.'’/\-,!?;:"()]/g;
const norm = (s) =>
  s.trim().toLowerCase().replace(/\s+/g, " ").replace(PUNCT, "").replace(/\s+/g, " ").trim();

function parseList(file) {
  const raw = readFileSync(file, "utf8");
  const re = /lang-nl">([\s\S]*?)<\/span><span[^>]*lang-en">([\s\S]*?)<\/span>/g;
  const out = [];
  let m;
  while ((m = re.exec(raw))) out.push({ nl: m[1].trim(), en: m[2].trim() });
  return out;
}
const lists = { easy: parseList("easy.xml"), medium: parseList("medium.xml"), hard: parseList("hard.xml") };

const cards = JSON.parse(readFileSync("public/cards.json", "utf8"));
const stripArticle = (s) => s.replace(/^\s*(de|het|een|'t|het\/de|de\/het)\s+/i, "").trim();
const stripParen = (s) => s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

const byNl = new Map();
const add = (key, card) => {
  const k = norm(key);
  if (!k) return;
  if (!byNl.has(k)) byNl.set(k, []);
  const arr = byNl.get(k);
  if (!arr.includes(card)) arr.push(card);
};
for (const c of cards) {
  add(c.dutch, c);
  add(stripArticle(c.dutch), c);
  add(stripParen(c.dutch), c);
  add(stripParen(stripArticle(c.dutch)), c);
  if (c.lemma) add(c.lemma, c);
}
const enForms = (card) => {
  const out = new Set();
  for (const g of card.english) { out.add(norm(g)); out.add(norm(stripParen(g))); }
  return out;
};
const nlCandidates = (nl) => {
  const parts = nl.split(/[,/]| of /).map((p) => stripArticle(p.trim())).filter(Boolean);
  const set = new Set([stripArticle(nl)]);
  for (const p of parts) set.add(p);
  return [...set].map(norm).filter(Boolean);
};

function classify(entry) {
  const enN = norm(entry.en), enNstrip = norm(stripParen(entry.en));
  const cands = nlCandidates(entry.nl);
  const nlHitCards = [];
  for (const cand of cands) if (byNl.has(cand)) for (const c of byNl.get(cand)) if (!nlHitCards.includes(c)) nlHitCards.push(c);
  const enMatches = (card) => {
    const ef = enForms(card);
    if (ef.has(enN) || ef.has(enNstrip)) return true;
    for (const g of card.english) { const gp = norm(stripParen(g)); if (gp && (gp === enN || gp === enNstrip)) return true; }
    return false;
  };
  if (nlHitCards.length) {
    const exact = nlHitCards.filter(enMatches);
    if (exact.length) return { status: "EXACT" };
    return { status: "NL_DIFF_EN", cards: nlHitCards };
  }
  return { status: "OTHER_OR_MISSING" };
}

const slim = (c) => ({ dutch: c.dutch, english: c.english, level: c.level });
for (const [name, entries] of Object.entries(lists)) {
  const rows = [];
  for (const e of entries) {
    const r = classify(e);
    if (r.status === "NL_DIFF_EN")
      rows.push({ nl: e.nl, source_en: e.en, our_cards: r.cards.map(slim) });
  }
  writeFileSync(`review-${name}.json`, JSON.stringify(rows, null, 2));
  console.log(name, rows.length);
}
