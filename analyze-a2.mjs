import { readFileSync } from "node:fs";

const PUNCT = /[.'’/\-,!?;:"()]/g;
const norm = (s) =>
  s.trim().toLowerCase().replace(/\s+/g, " ").replace(PUNCT, "").replace(/\s+/g, " ").trim();

// --- parse the crawled XML lists ---------------------------------------------
function parseList(file) {
  const raw = readFileSync(file, "utf8");
  const re = /lang-nl">([\s\S]*?)<\/span><span[^>]*lang-en">([\s\S]*?)<\/span>/g;
  const out = [];
  let m;
  while ((m = re.exec(raw))) out.push({ nl: m[1].trim(), en: m[2].trim() });
  return out;
}
const lists = {
  easy: parseList("easy.xml"),
  medium: parseList("medium.xml"),
  hard: parseList("hard.xml"),
};

// --- verdicts from the Dutch-specialist pass ---------------------------------
const verdicts = {};
for (const name of ["easy", "medium", "hard"]) {
  for (const v of JSON.parse(readFileSync(`verdict-${name}.json`, "utf8"))) {
    verdicts[`${name}||${norm(v.nl)}||${norm(v.source_en)}`] = v;
  }
}

// --- index our deck ----------------------------------------------------------
const cards = JSON.parse(readFileSync("public/cards.json", "utf8"));
const enrich = JSON.parse(readFileSync("public/enrichment.json", "utf8"));

// English glosses a card exposes in enrichment (senses + summary)
function enrichEnGlosses(id) {
  const e = enrich[id];
  if (!e) return null;
  const set = new Set();
  if (e.glossSummary) set.add(e.glossSummary);
  for (const s of e.senses || []) for (const g of s.glosses || []) set.add(g);
  return set;
}
const atomize = (s) =>
  s.split(/[/,;]/).flatMap((p) => [norm(p), norm(stripParen(p))]).filter(Boolean);

// is the list's gloss carried by ANY of the entry's cards' enrichment?
function enrichStatus(srcEn, cs) {
  let sawEnrichment = false;
  const targets = [...new Set(atomize(srcEn))];
  for (const c of cs) {
    const gs = enrichEnGlosses(c.id);
    if (gs === null) continue;
    sawEnrichment = true;
    const atoms = new Set();
    const full = [];
    for (const g of gs) {
      for (const a of atomize(g)) atoms.add(a);
      full.push(norm(g));
    }
    for (const t of targets) {
      if (!t) continue;
      if (atoms.has(t)) return { state: "FOUND", hit: t };
      const re = new RegExp(`(^| )${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
      if (full.some((g) => re.test(g))) return { state: "FOUND", hit: t };
    }
  }
  return { state: sawEnrichment ? "ABSENT" : "NONE" };
}
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

function enForms(card) {
  const out = new Set();
  for (const g of card.english) {
    out.add(norm(g));
    out.add(norm(stripParen(g)));
  }
  return out;
}
function nlCandidates(nl) {
  const parts = nl.split(/[,/]| of /).map((p) => stripArticle(p.trim())).filter(Boolean);
  const set = new Set([stripArticle(nl)]);
  for (const p of parts) set.add(p);
  return [...set].map(norm).filter(Boolean);
}

// --- level ordering ----------------------------------------------------------
function levelRank(level) {
  if (!level) return 999;
  let m;
  if ((m = /^A1 · U(\d)/.exec(level))) return 100 + +m[1];
  if ((m = /^A2 · U(\d)/.exec(level))) return 200 + +m[1];
  if (level === "A+") return 300;
  if (level === "B1") return 400;
  if (level === "B2") return 500;
  return 998;
}
const minRank = (cs) => (cs.length ? Math.min(...cs.map((c) => levelRank(c.level))) : 997);

// CEFR band (unit stripped) of a level string
function cefrBand(level) {
  if (!level) return "—";
  if (level.startsWith("A1")) return "A1";
  if (level.startsWith("A2")) return "A2";
  if (level === "A+") return "A+";
  if (level === "B1") return "B1";
  if (level === "B2") return "B2";
  return "?";
}
const CEFR_ORDER = { A1: 1, A2: 2, "A+": 3, B1: 4, B2: 5, "?": 8, "—": 9 };
// CEFR band of the entry = band of its lowest-level card
const entryCefr = (cs) => {
  if (!cs.length) return "—";
  const lowest = cs.reduce((a, b) => (levelRank(a.level) <= levelRank(b.level) ? a : b));
  return cefrBand(lowest.level);
};
const cefrRank = (cs) => CEFR_ORDER[entryCefr(cs)] ?? 8;

// --- classify each source word ----------------------------------------------
function classify(entry) {
  const enN = norm(entry.en);
  const enNstrip = norm(stripParen(entry.en));
  const cands = nlCandidates(entry.nl);

  const nlHitCards = [];
  for (const cand of cands) {
    if (byNl.has(cand)) for (const c of byNl.get(cand)) if (!nlHitCards.includes(c)) nlHitCards.push(c);
  }

  const enMatches = (card) => {
    const ef = enForms(card);
    if (ef.has(enN) || ef.has(enNstrip)) return true;
    for (const g of card.english) {
      const gp = norm(stripParen(g));
      if (gp && (gp === enN || gp === enNstrip)) return true;
    }
    return false;
  };

  if (nlHitCards.length) {
    const exact = nlHitCards.filter(enMatches);
    if (exact.length) return { status: "EXACT", cards: exact };
    return { status: "NL_DIFF_EN", cards: nlHitCards };
  }

  const variants = [];
  for (const cand of cands) {
    if (cand.length < 4) continue;
    for (const [k, arr] of byNl) {
      if (k === cand) continue;
      if ((k.startsWith(cand) || cand.startsWith(k)) && Math.abs(k.length - cand.length) <= 3) {
        for (const c of arr) if (!variants.includes(c)) variants.push(c);
      }
    }
  }
  if (variants.length) return { status: "OTHER_FORM", cards: variants.slice(0, 4) };
  return { status: "MISSING", cards: [] };
}

// --- report ------------------------------------------------------------------
const fmtCard = (c) => `${c.dutch} = ${c.english.join("/")} [${c.level}]`;
const levels = (cs) => cs.map((c) => c.level).join(", ");
const cefr = (r) => `[${entryCefr(r.cards)}]`.padEnd(4);
// sort by CEFR band first, then by unit-granular level, then alphabetically
const byLevel = (a, b) =>
  cefrRank(a.cards) - cefrRank(b.cards) ||
  minRank(a.cards) - minRank(b.cards) ||
  a.nl.localeCompare(b.nl);

const out = [];
const summary = {};

for (const [name, entries] of Object.entries(lists)) {
  const rows = entries.map((e) => {
    const r = { ...e, ...classify(e) };
    if (r.status === "NL_DIFF_EN") {
      const v = verdicts[`${name}||${norm(e.nl)}||${norm(e.en)}`];
      r.verdict = v ? v.verdict : "UNREVIEWED";
      r.subtype = v ? v.subtype : "";
      r.note = v ? v.note : "";
    }
    return r;
  });

  const exact = rows.filter((r) => r.status === "EXACT").sort(byLevel);
  const diff = rows.filter((r) => r.status === "NL_DIFF_EN");
  for (const r of diff) r.enr = enrichStatus(r.en, r.cards); // {state: FOUND|ABSENT|NONE, hit?}
  const enriched = (r) => r.enr.state === "FOUND";
  const tech = diff.filter((r) => r.verdict === "TECHNICAL").sort(byLevel);
  const mean = diff.filter((r) => r.verdict === "MEANINGFUL").sort(byLevel);
  const otherDiff = diff.filter((r) => r.verdict !== "TECHNICAL" && r.verdict !== "MEANINGFUL").sort(byLevel);
  const techEnr = tech.filter(enriched), techNot = tech.filter((r) => !enriched(r));
  const meanEnr = mean.filter(enriched), meanNot = mean.filter((r) => !enriched(r));
  const other = rows.filter((r) => r.status === "OTHER_FORM").sort(byLevel);
  const missing = rows.filter((r) => r.status === "MISSING").sort((a, b) => a.nl.localeCompare(b.nl));

  summary[name] = {
    total: entries.length,
    EXACT: exact.length,
    "tech·enr": techEnr.length,
    "tech·NOT": techNot.length,
    "mean·enr": meanEnr.length,
    "mean·NOT": meanNot.length,
    OTHER_FORM: other.length,
    MISSING: missing.length,
  };

  const enrTag = (r) =>
    r.enr.state === "FOUND" ? `  {enr:✓ "${r.enr.hit}"}` : r.enr.state === "ABSENT" ? "  {enr:✗ absent}" : "  {enr:– none}";
  const diffLine = (mark) => (r) =>
    `  ${mark} ${cefr(r)} ${r.nl}  ⇒  ${r.en}  ::  ours: ${r.cards.map(fmtCard).join(" | ")}  [${r.subtype}]${
      r.verdict === "MEANINGFUL" ? ` — ${r.note}` : ""
    }${enrTag(r)}`;

  out.push(`\n${"=".repeat(72)}\n${name.toUpperCase()}  (${entries.length} words)   — sorted by CEFR level (A1→A2→A+→B1→B2)\n${"=".repeat(72)}`);

  out.push(`\n--- EXACT (${exact.length})  [CEFR · nl ⇒ en :: level] ---`);
  for (const r of exact) out.push(`  ✓ ${cefr(r)} ${r.nl}  ⇒  ${r.en}  ::  ${levels(r.cards)}`);

  out.push(`\n--- NL_DIFF_EN · TECHNICAL · ENRICHED (${techEnr.length})  [cosmetic; list gloss IS in enrichment] ---`);
  for (const r of techEnr) out.push(diffLine("=")(r));

  out.push(`\n--- NL_DIFF_EN · TECHNICAL · NOT ENRICHED (${techNot.length})  [cosmetic; list gloss NOT in enrichment] ---`);
  for (const r of techNot) out.push(diffLine("=")(r));

  out.push(`\n--- NL_DIFF_EN · MEANINGFUL · ENRICHED (${meanEnr.length})  [real sense gap; but enrichment carries list gloss] ---`);
  for (const r of meanEnr) out.push(diffLine("!")(r));

  out.push(`\n--- NL_DIFF_EN · MEANINGFUL · NOT ENRICHED (${meanNot.length})  [real sense gap; list gloss nowhere] ---`);
  for (const r of meanNot) out.push(diffLine("!")(r));

  if (otherDiff.length) {
    out.push(`\n--- NL_DIFF_EN · UNREVIEWED (${otherDiff.length}) ---`);
    for (const r of otherDiff) out.push(diffLine("?")(r));
  }

  out.push(`\n--- OTHER_FORM (${other.length})  [related form only] ---`);
  for (const r of other) out.push(`  ≈ ${cefr(r)} ${r.nl}  ⇒  ${r.en}  ::  related: ${r.cards.map(fmtCard).join(" | ")}`);

  out.push(`\n--- MISSING (${missing.length})  [no card · alphabetical] ---`);
  for (const r of missing) out.push(`  ✗ [—]  ${r.nl}  ⇒  ${r.en}`);
}

out.push(`\n${"#".repeat(72)}\nSUMMARY\n${"#".repeat(72)}`);
console.log(out.join("\n"));
console.table(summary);
