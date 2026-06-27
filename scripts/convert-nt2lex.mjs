// Append frequency-graded vocabulary (levels A+, B1, B2) to public/cards.json.
// Source word lists from NT2Lex-CGN+ODWN-v01.tsv (CEFR-graded Dutch frequency
// list); source the quiz answer (english) from Kaikki glosses. Runs AFTER
// convert-anki.mjs and consumes its output. Idempotent: re-running drops the
// previously appended A+/B1/B2 block and rebuilds it, leaving the Anki block
// (c0..cN) and its ids untouched.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeHead, pickEntry, extractKaikki } from "./enrich/extract.mjs";
import { buildKaikkiIndex } from "./enrich/kaikki-index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TSV = join(root, "NT2Lex-CGN+ODWN-v01.tsv");
const KAIKKI = join(root, "data/kaikki/kaikki-Dutch.jsonl");
const CARDS = join(root, "public/cards.json");

const NEW_LEVELS = new Set(["A+", "B1", "B2"]);
const BAND_ORDER = ["A1", "A2", "B1", "B2"];
const F_COL = { A1: 5, A2: 10, B1: 15, B2: 20 }; // 0-based F@<band>
const U_TOTAL_COL = 32;
const GROUP_SIZE = 25;
const MAX_GLOSSES = 3;
const MAX_GLOSS_WORDS = 4;

const bandToLevel = (band) => (band === "A1" || band === "A2" ? "A+" : band);

const TAG_POS = [
  [/^N\(/, "n."],
  [/^WW\(/, "v."],
  [/^ADJ\(/, "adj."],
  [/^BW\(/, "adv."],
];
const tagPos = (tag) => TAG_POS.find(([re]) => re.test(tag))?.[1];

function lowestBand(cols) {
  for (const band of BAND_ORDER) if (cols[F_COL[band]] !== "-") return band;
  return undefined;
}

function readCandidates() {
  const lines = readFileSync(TSV, "utf8").split("\n");
  const byHead = new Map();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = lines[i].split("\t");
    const pos = tagPos(cols[1]);
    if (!pos) continue;
    const band = lowestBand(cols);
    if (!band) continue;
    const head = normalizeHead(cols[0]);
    if (!head) continue;
    const freq = Number(cols[U_TOTAL_COL]);
    const u = Number.isFinite(freq) ? freq : 0;
    const prev = byHead.get(head);
    if (!prev || BAND_ORDER.indexOf(band) < BAND_ORDER.indexOf(prev.band) ||
        (band === prev.band && u > prev.u)) {
      byHead.set(head, { head, word: cols[0].trim(), pos, band, u });
    }
  }
  return byHead;
}

// Pieces that are pure function words ("of", "from") are useless as quiz answers;
// bare proper-noun fragments are usually a comma-split place definition
// ("hamlet in X, Zeeland, Netherlands" -> drop "Zeeland"/"Netherlands").
const ANSWER_STOP = new Set([
  "of", "from", "to", "a", "an", "the", "and", "or", "in", "on", "at", "for",
  "with", "by", "as", "it", "is", "be", "that", "this", "one", "not", "no",
]);
const isStopPiece = (p) => {
  const toks = p.toLowerCase().split(/\s+/).filter(Boolean);
  return toks.length > 0 && toks.every((t) => ANSWER_STOP.has(t));
};
const isProperPiece = (p) => {
  const toks = p.split(/\s+/).filter(Boolean);
  return toks.length > 0 && toks.every((t) => /^[A-ZÀ-Þ]/.test(t));
};

// A Kaikki gloss can pack several meanings plus a parenthetical definition
// ("come on; modal particle ...", "society (long-standing group ...)"). Strip
// the parenthetical, split into answer phrases, keep only the short ones — long
// remainders are definitions, not usable quiz answers. Then drop function-word
// fragments, and proper-noun fragments when a real meaning still remains.
function answersFromGlosses(glosses) {
  let out = [];
  for (const g of glosses ?? []) {
    const cleaned = (g ?? "").replace(/\([^)]*\)/g, " ");
    for (const piece of cleaned.split(/[;,/]|\bor\b/i)) {
      const p = piece.trim().replace(/^(a|an|the)\s+/i, "");
      if (p && p.split(/\s+/).length <= MAX_GLOSS_WORDS) out.push(p);
    }
  }
  out = [...new Set(out)].filter((p) => !isStopPiece(p));
  if (out.some((p) => !isProperPiece(p))) out = out.filter((p) => !isProperPiece(p));
  return out.slice(0, MAX_GLOSSES);
}

function buildCard(cand, entry) {
  const ek = extractKaikki(entry);
  const senseGlosses = ek.senses?.[0]?.glosses ?? [];
  const english = answersFromGlosses(senseGlosses);
  if (english.length === 0) return null;

  const article = entry.pos === "noun" ? ek.grammar?.noun?.article : undefined;
  const dutch = article && !article.includes("/") ? `${article} ${cand.word}` : cand.word;

  return {
    level: bandToLevel(cand.band),
    group: null, // assigned after frequency sort + chunking
    cefr: cand.band,
    dutch,
    english,
    type: "word",
    pos: cand.pos,
    lemma: cand.word,
    u: cand.u, // sort key, stripped before write
  };
}

async function main() {
  const all = JSON.parse(readFileSync(CARDS, "utf8"));
  const ankiCards = all.filter((c) => !NEW_LEVELS.has(c.level));
  const appHeads = new Set();
  for (const c of ankiCards) {
    appHeads.add(normalizeHead(c.lemma || c.dutch));
    appHeads.add(normalizeHead(c.dutch));
  }

  const candidates = [...readCandidates().values()].filter((c) => !appHeads.has(c.head));
  console.log(`nt2lex content lemmas not in app: ${candidates.length}`);

  const wantedHeads = new Set(candidates.map((c) => c.head));
  const kaikkiIndex = await buildKaikkiIndex(KAIKKI, wantedHeads);

  const built = [];
  let droppedNoGloss = 0;
  for (const cand of candidates) {
    const { entry } = pickEntry(kaikkiIndex.get(cand.head), cand.pos);
    if (!entry) { droppedNoGloss++; continue; }
    const card = buildCard(cand, entry);
    if (!card) { droppedNoGloss++; continue; }
    built.push(card);
  }

  const newCards = [];
  for (const level of ["A+", "B1", "B2"]) {
    const inLevel = built.filter((c) => c.level === level).sort((a, b) => b.u - a.u);
    inLevel.forEach((c, i) => {
      c.group = `${level} · ${Math.floor(i / GROUP_SIZE) + 1}`;
      delete c.u;
      newCards.push(c);
    });
  }

  const maxIdx = ankiCards.reduce((m, c) => Math.max(m, Number(c.id.slice(1)) || 0), -1);
  newCards.forEach((c, i) => (c.id = `c${maxIdx + 1 + i}`));

  const ordered = newCards.map((c) => ({
    id: c.id, level: c.level, group: c.group, cefr: c.cefr,
    dutch: c.dutch, english: c.english, type: c.type, pos: c.pos, lemma: c.lemma,
  }));

  writeFileSync(CARDS, JSON.stringify([...ankiCards, ...ordered], null, 0));

  const perLevel = {};
  for (const c of ordered) perLevel[c.level] = (perLevel[c.level] ?? 0) + 1;
  console.log("added per level:", perLevel);
  console.log(`dropped (no usable gloss): ${droppedNoGloss}`);
  console.log(`cards.json: ${ankiCards.length} anki + ${ordered.length} new = ${ankiCards.length + ordered.length}`);
}

main();
