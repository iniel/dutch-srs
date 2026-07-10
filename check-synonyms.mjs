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

const verdicts = {};
for (const name of ["easy", "medium", "hard"])
  for (const v of JSON.parse(readFileSync(`verdict-${name}.json`, "utf8")))
    verdicts[`${name}||${norm(v.nl)}||${norm(v.source_en)}`] = v;

const cards = JSON.parse(readFileSync("public/cards.json", "utf8"));
const enrich = JSON.parse(readFileSync("public/enrichment.json", "utf8"));

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
const nlCandidates = (nl) => {
  const parts = nl.split(/[,/]| of /).map((p) => stripArticle(p.trim())).filter(Boolean);
  const set = new Set([stripArticle(nl)]);
  for (const p of parts) set.add(p);
  return [...set].map(norm).filter(Boolean);
};
const nlHits = (entry) => {
  const cs = [];
  for (const cand of nlCandidates(entry.nl))
    if (byNl.has(cand)) for (const c of byNl.get(cand)) if (!cs.includes(c)) cs.push(c);
  return cs;
};

// gather all English glosses an enriched card exposes
function enrichEnGlosses(id) {
  const e = enrich[id];
  if (!e) return null; // no enrichment at all
  const set = new Set();
  if (e.glossSummary) set.add(e.glossSummary);
  for (const s of e.senses || []) for (const g of s.glosses || []) set.add(g);
  return set;
}

// atomic phrases: split a gloss string on / , ; into normalized units
const atomize = (s) =>
  s
    .split(/[/,;]/)
    .flatMap((p) => [norm(p), norm(stripParen(p))])
    .filter(Boolean);

// does ANY of the source list's synonyms appear among the enriched glosses?
function glossFound(srcEn, glossSet) {
  const targets = [...new Set(atomize(srcEn))];
  // build enrichment atomic-phrase set + full normalized glosses for containment
  const enrAtoms = new Set();
  const enrFull = [];
  for (const g of glossSet) {
    for (const a of atomize(g)) enrAtoms.add(a);
    enrFull.push({ raw: g, n: norm(g) });
  }
  for (const t of targets) {
    if (!t) continue;
    if (enrAtoms.has(t)) return { hit: t, kind: "exact" };
    const re = new RegExp(`(^| )${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
    for (const g of enrFull) if (re.test(g.n)) return { hit: g.raw, kind: "contains" };
  }
  return null;
}

const rows = [];
for (const [name, entries] of Object.entries(lists)) {
  for (const e of entries) {
    const v = verdicts[`${name}||${norm(e.nl)}||${norm(e.en)}`];
    if (!v || v.subtype !== "synonym-same-sense") continue;
    const cs = nlHits(e);
    // evaluate against each matched card, keep the best outcome
    let best = { state: "NO_ENRICHMENT" };
    const perCard = [];
    for (const c of cs) {
      const gs = enrichEnGlosses(c.id);
      if (gs === null) {
        perCard.push({ id: c.id, dutch: c.dutch, state: "NO_ENRICHMENT" });
        continue;
      }
      const f = glossFound(e.en, gs);
      const rec = {
        id: c.id,
        dutch: c.dutch,
        our_en: c.english.join("/"),
        level: c.level,
        state: f ? "FOUND" : "ABSENT",
        hit: f ? f.hit : null,
        glosses: [...gs],
      };
      perCard.push(rec);
      if (f && best.state !== "FOUND") best = rec;
      else if (!f && best.state === "NO_ENRICHMENT") best = rec;
    }
    rows.push({ list: name, nl: e.nl, source_en: e.en, state: best.state, perCard });
  }
}

// ---- report ----
const counts = { FOUND: 0, ABSENT: 0, NO_ENRICHMENT: 0 };
for (const r of rows) counts[r.state]++;

const lines = [];
lines.push(`SYNONYM-SAME-SENSE × ENRICHMENT CHECK   (${rows.length} entries)`);
lines.push(`Question: is the LIST's gloss present in our card's enrichment (senses/glossSummary)?`);
lines.push(`FOUND ${counts.FOUND} · ABSENT ${counts.ABSENT} · NO_ENRICHMENT ${counts.NO_ENRICHMENT}\n`);

for (const state of ["ABSENT", "NO_ENRICHMENT", "FOUND"]) {
  const rs = rows.filter((r) => r.state === state);
  lines.push(`\n${"=".repeat(72)}\n${state} (${rs.length})\n${"=".repeat(72)}`);
  for (const r of rs) {
    const c = r.perCard.find((p) => p.state === r.state) || r.perCard[0];
    const tag = `[${r.list}] ${r.nl} ⇒ ${r.source_en}`;
    if (state === "FOUND")
      lines.push(`  ✓ ${tag}  ::  enrichment has "${c.hit}"  (ours: ${c.our_en} [${c.level}])`);
    else if (state === "ABSENT")
      lines.push(`  ✗ ${tag}  ::  NOT in enrichment  (ours: ${c.our_en}) — enr glosses: ${(c.glosses || []).join(" / ")}`);
    else lines.push(`  – ${tag}  ::  card ${c.id} has no enrichment entry`);
  }
}

writeFileSync("synonym-check.txt", lines.join("\n"));
console.log(lines.slice(0, 3).join("\n"));
console.log("\nwrote synonym-check.txt");
