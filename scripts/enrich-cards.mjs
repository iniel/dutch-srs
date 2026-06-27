// Enrich public/cards.json with Kaikki (Wiktextract Dutch) + Tatoeba data.
// Reads cards.json (read-only — convert-anki.mjs owns it), the gitignored dumps
// under data/, and writes public/enrichment.json keyed by card id.
//
// Dumps (see docs/VOCABULARY.md):
//   data/kaikki/kaikki-Dutch.jsonl
//   data/tatoeba/{nld,eng,rus}_sentences.tsv, data/tatoeba/links.csv
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripArticle, normalizeHead, pickEntry, extractKaikki, dedupeExamples } from "./enrich/extract.mjs";
import { buildKaikkiIndex } from "./enrich/kaikki-index.mjs";
import { buildRuGlossIndex } from "./enrich/ru-index.mjs";
import { buildNlRuGlossIndex } from "./enrich/nl-ru-index.mjs";
import { buildEnRuGlossIndex } from "./enrich/en-ru-index.mjs";
import { englishKeys } from "./enrich/extract-en-ru.mjs";
import { loadFreedictIndex } from "./enrich/freedict.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const KAIKKI = join(root, "data/kaikki/kaikki-Dutch.jsonl");
const KAIKKI_RU = join(root, "data/kaikki/kaikki-ru.jsonl");
const KAIKKI_NL = join(root, "data/kaikki/kaikki-nl.jsonl");
const KAIKKI_EN = join(root, "data/kaikki/kaikki-en.jsonl");
const FD_NLD_RU = join(root, "data/freedict/nld-rus/nld-rus.tei");
const FD_ENG_RU = join(root, "data/freedict/eng-rus/eng-rus.tei");
const TAT = join(root, "data/tatoeba");

const MAX_RU_GLOSSES = 4;

const MAX_TATOEBA_IDS_PER_HEAD = 40;
const MAX_EXAMPLES = 3;

const lines = (path) => createInterface({ input: createReadStream(path), crlfDelay: Infinity });

function cardHeads(card) {
  const heads = new Set();
  if (card.lemma) heads.add(normalizeHead(card.lemma));
  heads.add(normalizeHead(stripArticle(card.dutch)));
  return [...heads].filter(Boolean);
}

const tokenize = (s) => s.toLowerCase().split(/[^a-zà-ÿ]+/i).filter(Boolean);

async function buildTatoebaIndex(wantedHeads) {
  const singles = new Set([...wantedHeads].filter((h) => !h.includes(" ")));
  const multis = [...wantedHeads].filter((h) => h.includes(" "));

  const headToNlIds = new Map();
  const nlText = new Map();
  const addId = (head, id) => {
    if (!headToNlIds.has(head)) headToNlIds.set(head, []);
    const ids = headToNlIds.get(head);
    if (ids.length < MAX_TATOEBA_IDS_PER_HEAD) ids.push(id);
  };

  for await (const line of lines(join(TAT, "nld_sentences.tsv"))) {
    const tab1 = line.indexOf("\t");
    if (tab1 < 0) continue;
    const id = line.slice(0, tab1);
    const text = line.slice(line.indexOf("\t", tab1 + 1) + 1);
    if (!text) continue;
    let matched = false;
    for (const tok of new Set(tokenize(text))) {
      if (singles.has(tok)) { addId(tok, id); matched = true; }
    }
    if (multis.length) {
      const low = text.toLowerCase();
      for (const m of multis) if (low.includes(m)) { addId(m, id); matched = true; }
    }
    if (matched) nlText.set(id, text);
  }

  const keptNlIds = new Set(nlText.keys());
  const nlToPartners = new Map();
  const neededTrans = new Set();
  for await (const line of lines(join(TAT, "links.csv"))) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const a = line.slice(0, tab);
    if (!keptNlIds.has(a)) continue;
    const b = line.slice(tab + 1);
    if (!nlToPartners.has(a)) nlToPartners.set(a, []);
    nlToPartners.get(a).push(b);
    neededTrans.add(b);
  }

  const loadText = async (file) => {
    const map = new Map();
    for await (const line of lines(join(TAT, file))) {
      const tab1 = line.indexOf("\t");
      if (tab1 < 0) continue;
      const id = line.slice(0, tab1);
      if (!neededTrans.has(id)) continue;
      map.set(id, line.slice(line.indexOf("\t", tab1 + 1) + 1));
    }
    return map;
  };
  const enText = await loadText("eng_sentences.tsv");
  const ruText = await loadText("rus_sentences.tsv");

  const examplesFor = (heads) => {
    const out = [];
    const seenIds = new Set();
    for (const head of heads) {
      for (const id of headToNlIds.get(head) ?? []) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        const partners = nlToPartners.get(id) ?? [];
        let en, ru;
        for (const p of partners) { if (!en && enText.has(p)) en = enText.get(p); if (!ru && ruText.has(p)) ru = ruText.get(p); }
        out.push({ nl: nlText.get(id), en, ru, source: "tatoeba", tatoebaId: Number(id) });
      }
    }
    return out;
  };

  console.log(`tatoeba: ${keptNlIds.size} NL sentences matched, ${neededTrans.size} translations needed`);
  return { examplesFor };
}

function enrichOne(card, kaikkiIndex, tatoeba, ruIndex, nlRuIndex, enRuIndex, fdNldIndex, fdEngIndex) {
  const heads = cardHeads(card);
  const candidates = heads.flatMap((h) => kaikkiIndex.get(h) ?? []);
  const { entry, matchedBy } = pickEntry(candidates, card.pos);

  const out = { id: card.id, match: { source: "none", matchedBy: "none" } };
  const kaikkiExamples = [];
  if (entry) {
    Object.assign(out, extractKaikki(entry));
    out.match = { source: "kaikki", matchedBy, matchedWord: entry.word };
    for (const s of out.senses ?? []) for (const ex of s.examples ?? []) kaikkiExamples.push(ex);
  }

  // Russian glosses by source priority (most precise first): direct Dutch-word
  // sources win — ru.wiktionary gloss, then the curated nld-rus bilingual dict,
  // then nl.wiktionary translations; the English-meaning bridges fill the rest —
  // the curated eng-rus dict, then en.wiktionary's EN->RU table. Dedupe + cap.
  const keys = englishKeys(card);
  const ruGlosses = [];
  const addGlosses = (list) => { for (const g of list ?? []) if (!ruGlosses.includes(g)) ruGlosses.push(g); };
  const byHead = (index) => heads.map((h) => index.get(h)).find((g) => g?.length);
  const byKey = (index) => keys.map((k) => index.get(k)).find((g) => g?.length);
  addGlosses(byHead(ruIndex));
  addGlosses(byHead(fdNldIndex));
  addGlosses(byHead(nlRuIndex));
  addGlosses(byKey(fdEngIndex));
  addGlosses(byKey(enRuIndex));
  if (ruGlosses.length) out.glossRu = ruGlosses.slice(0, MAX_RU_GLOSSES);

  const tatExamples = tatoeba.examplesFor(heads);
  const merged = dedupeExamples([...kaikkiExamples, ...tatExamples], MAX_EXAMPLES);
  if (merged.length) {
    out.examples = merged;
    if (entry && tatExamples.length) out.match.source = "kaikki+tatoeba";
    else if (!entry) out.match = { source: "tatoeba", matchedBy: "dutch-stripped" };
  }

  const hasContent = entry || out.examples || out.glossRu;
  return hasContent ? out : null;
}

const headsHit = (index, heads) => heads.some((h) => index.get(h)?.length);
const keysHit = (index, keys) => keys.some((k) => index.get(k)?.length);

async function main() {
  const cards = JSON.parse(readFileSync(join(root, "public/cards.json"), "utf8"));
  const wantedHeads = new Set();
  for (const c of cards) for (const h of cardHeads(c)) wantedHeads.add(h);
  console.log(`cards: ${cards.length}, wanted heads: ${wantedHeads.size}`);

  const kaikkiIndex = await buildKaikkiIndex(KAIKKI, wantedHeads);
  const ruIndex = await buildRuGlossIndex(KAIKKI_RU, wantedHeads);
  const nlRuIndex = await buildNlRuGlossIndex(KAIKKI_NL, wantedHeads);
  const wantedEngKeys = new Set();
  for (const c of cards) for (const k of englishKeys(c)) wantedEngKeys.add(k);
  const enRuIndex = await buildEnRuGlossIndex(KAIKKI_EN, wantedEngKeys);
  const fdNldIndex = loadFreedictIndex(FD_NLD_RU, (s) => normalizeHead(s));
  const fdEngIndex = loadFreedictIndex(FD_ENG_RU, (s) => s.toLowerCase().trim());
  const tatoeba = await buildTatoebaIndex(wantedHeads);

  const result = {};
  const stats = { kaikki: 0, "kaikki+tatoeba": 0, tatoeba: 0, none: 0 };
  const byMatch = {};
  const unmatchedWords = [];
  let withRuGloss = 0;
  let gainedViaFreedict = 0;
  for (const card of cards) {
    const e = enrichOne(card, kaikkiIndex, tatoeba, ruIndex, nlRuIndex, enRuIndex, fdNldIndex, fdEngIndex);
    if (e) {
      result[card.id] = e;
      stats[e.match.source]++;
      byMatch[e.match.matchedBy] = (byMatch[e.match.matchedBy] ?? 0) + 1;
      if (e.glossRu?.length) withRuGloss++;
      const heads = cardHeads(card);
      const keys = englishKeys(card);
      const wiktRu = headsHit(ruIndex, heads) || headsHit(nlRuIndex, heads) || keysHit(enRuIndex, keys);
      const fdRu = headsHit(fdNldIndex, heads) || keysHit(fdEngIndex, keys);
      if (fdRu && !wiktRu) gainedViaFreedict++;
    } else {
      stats.none++;
      if (card.type === "word") unmatchedWords.push(`${card.id}:${card.dutch}`);
    }
  }

  writeFileSync(join(root, "public/enrichment.json"), JSON.stringify(result));
  console.log("\n=== coverage ===");
  console.log("by source:", stats);
  console.log("by matchedBy:", byMatch);
  console.log(`enriched ${Object.keys(result).length}/${cards.length} cards`);
  console.log(`cards with Russian gloss: ${withRuGloss} (gained via FreeDict bilingual: ${gainedViaFreedict})`);
  console.log(`unmatched single-word cards: ${unmatchedWords.length}`);
  console.log("sample unmatched:", unmatchedWords.slice(0, 25).join(", "));
}

main();
