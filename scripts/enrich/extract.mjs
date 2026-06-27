// Pure extractors turning Kaikki/Wiktextract entries into the Enrichment shape
// (see src/types.ts). No I/O, no streaming — unit-tested with fixtures.

const ARTICLES = ["de ", "het ", "een ", "’t ", "'t "];

export function stripArticle(dutch) {
  const trimmed = (dutch ?? "").trim();
  const lower = trimmed.toLowerCase();
  for (const a of ARTICLES) {
    if (lower.startsWith(a)) return trimmed.slice(a.length).trim();
  }
  return trimmed;
}

export function normalizeHead(s) {
  return stripArticle(s).toLowerCase().replace(/\s+/g, " ").trim();
}

const POS_MAP = [
  [/phrase|expr|idiom/, "phrase"],
  [/\bn\b|noun/, "noun"],
  [/\bv\b|verb/, "verb"],
  [/adj/, "adj"],
  [/adv/, "adv"],
  [/prep/, "prep"],
  [/pron/, "pron"],
  [/num/, "num"],
  [/conj/, "conj"],
  [/interj|excl/, "intj"],
  [/art|det/, "det"],
];

export function mapPos(deckPos) {
  const p = (deckPos ?? "").toLowerCase();
  for (const [re, kaikki] of POS_MAP) if (re.test(p)) return kaikki;
  return undefined;
}

const EN_STOP = new Set(["to", "a", "an", "the", "of", "or", "and", "be", "is", "in", "on", "at", "s", "someone", "something"]);
const enContentTokens = (s) => (s ?? "").toLowerCase().split(/[^a-zà-ÿ]+/i).filter((w) => w && !EN_STOP.has(w));

// A gloss like "alternative form of …" / "obsolete spelling of …" / "misspelling
// of …" is a cross-reference, not a meaning — useless as a one-line summary.
const CROSS_REF_GLOSS = /^(alternative|obsolete|dated|archaic|rare|nonstandard|superseded|eye[ -]dialect|misspelling)\b.*\bof\b/i;

// Do any of these glosses share a content word with the card's English answers?
// Exact token, or a >=4-char substring either way (absorbs plural/inflection).
const glossesMatchWords = (glosses, cardWords) => {
  for (const gloss of glosses ?? []) {
    for (const g of enContentTokens(gloss)) {
      for (const w of cardWords) {
        if (g === w) return true;
        if (g.length >= 4 && w.length >= 4 && (g.includes(w) || w.includes(g))) return true;
      }
    }
  }
  return false;
};

// True when any gloss of the entry overlaps the card's English. Used to
// disambiguate spelling-homograph entries that the POS heuristic gets wrong.
export function glossMatchesEnglish(entry, english) {
  if (!english?.length || !entry) return false;
  const cardWords = new Set(english.flatMap(enContentTokens));
  if (!cardWords.size) return false;
  return (entry.senses ?? []).some((s) => glossesMatchWords(s.glosses, cardWords));
}

// Choose the best Kaikki entry for a card. Meaning match (gloss overlaps the
// card's English) outranks the POS heuristic, because the deck POS is sometimes
// mis-mapped (e.g. "meer" tagged adj. but Kaikki has it as det "more"), which
// otherwise grabs the wrong spelling-homograph (the noun "meer" = lake).
export function pickEntry(candidates, card = {}) {
  if (!candidates || candidates.length === 0) return { entry: undefined, matchedBy: "none" };
  const wantPos = mapPos(card.pos);
  let best = candidates[0];
  let bestScore = -1;
  let bestOverlap = false;
  let bestPos = false;
  for (const e of candidates) {
    const overlap = glossMatchesEnglish(e, card.english);
    const posMatch = wantPos ? e.pos === wantPos : false;
    const score = (overlap ? 2 : 0) + (posMatch ? 1 : 0);
    if (score > bestScore) { best = e; bestScore = score; bestOverlap = overlap; bestPos = posMatch; }
  }
  let matchedBy;
  if (bestOverlap && !bestPos) matchedBy = "meaning";
  else if (bestPos) matchedBy = "lemma+pos";
  else matchedBy = "lemma";
  return { entry: best, matchedBy };
}

// Multi-word phrase/sentence cards must match a Kaikki headword that IS the whole
// phrase. A single sub-word entry (meer=lake for "niet/geen ... meer") brings the
// wrong sense + that word's grammar/IPA, so reject it. Word cards are unaffected.
export function entryMatchesCard(entry, card) {
  if (!entry) return false;
  if (card.type === "word") return true;
  const stripped = normalizeHead(stripArticle(card.dutch));
  if (!stripped.includes(" ")) return true;        // single-word "phrase" e.g. hallo
  return normalizeHead(entry.word) === stripped;   // whole-phrase headword only
}

const REGISTER_TAGS = new Set([
  "informal", "formal", "colloquial", "vulgar", "slang", "derogatory",
  "archaic", "dated", "obsolete", "literary", "poetic", "humorous",
  "dialectal", "regional", "Flanders", "Netherlands", "childish",
]);
const STRUCTURAL_TAGS = new Set([
  "table-tags", "inflection-template", "class",
]);

const hasTags = (form, ...need) => need.every((t) => form.tags?.includes(t));
const isStructuralForm = (form) =>
  (form.tags ?? []).some((t) => STRUCTURAL_TAGS.has(t)) || !form.form;

function firstForm(forms, ...need) {
  const f = forms.find((x) => !isStructuralForm(x) && hasTags(x, ...need));
  return f?.form;
}

function relationWords(entry, key) {
  const out = [];
  for (const r of entry[key] ?? []) if (r?.word) out.push(r.word);
  for (const s of entry.senses ?? []) for (const r of s[key] ?? []) if (r?.word) out.push(r.word);
  return [...new Set(out)];
}

function senseExamples(sense) {
  const out = [];
  for (const ex of sense.examples ?? []) {
    if (!ex.text) continue;
    out.push({ nl: ex.text, en: ex.english ?? ex.translation ?? undefined, source: "kaikki" });
  }
  return out;
}

const isFormOfSense = (sense) =>
  Array.isArray(sense.form_of) ||
  (sense.glosses ?? []).some((g) => /\b(plural|diminutive|singular|inflection|past tense|participle) of\b/i.test(g));

const GENDER_TO_ARTICLE = { neuter: "het", masculine: "de", feminine: "de", "common-gender": "de" };

function nounGrammar(entry) {
  const genderTags = new Set();
  for (const s of entry.senses ?? []) for (const t of s.tags ?? []) if (GENDER_TO_ARTICLE[t]) genderTags.add(t);
  // Skip diminutive forms: a diminutive is grammatically neuter (het neefje)
  // regardless of the base noun's gender, so its neuter tag must not leak in and
  // turn a plain "de" noun into a bogus "de/het".
  for (const f of entry.forms ?? []) {
    if (f.tags?.includes("diminutive")) continue;
    for (const t of f.tags ?? []) if (GENDER_TO_ARTICLE[t]) genderTags.add(t);
  }
  const articles = new Set([...genderTags].map((g) => GENDER_TO_ARTICLE[g]));
  const g = {};
  if (articles.size === 1) g.article = [...articles][0];
  else if (articles.size > 1) g.article = "de/het";
  if (genderTags.size) g.gender = [...genderTags];
  const plural = firstForm(entry.forms ?? [], "plural");
  const diminutive = firstForm(entry.forms ?? [], "diminutive");
  if (plural) g.plural = plural;
  if (diminutive) g.diminutive = diminutive;
  return Object.keys(g).length ? g : undefined;
}

function verbGrammar(entry) {
  const forms = entry.forms ?? [];
  const g = {};
  const present = firstForm(forms, "first-person", "present", "singular");
  const pastSg = firstForm(forms, "first-person", "past", "singular");
  const pastPl = forms.find((f) => !isStructuralForm(f) && hasTags(f, "past", "plural") && !f.tags.includes("participle"))?.form;
  const pastParticiple = firstForm(forms, "participle", "past");
  if (present) g.presentSg = present;
  if (pastSg) g.pastSg = pastSg;
  if (pastPl) g.pastPl = pastPl;
  if (pastParticiple) g.pastParticiple = pastParticiple;
  const aux = new Set();
  for (const f of forms) {
    if (f.tags?.includes("auxiliary") && ["hebben", "zijn"].includes(f.form)) aux.add(f.form);
  }
  if (aux.size === 1) g.auxiliary = [...aux][0];
  else if (aux.size > 1) g.auxiliary = "hebben/zijn";
  if (forms.some((f) => f.tags?.includes("separable"))) g.separable = true;
  return Object.keys(g).length ? g : undefined;
}

function adjectiveGrammar(entry) {
  const onlyTag = (tag) =>
    (entry.forms ?? []).find((f) => f.form && f.tags?.length === 1 && f.tags[0] === tag)?.form;
  const g = {};
  const comparative = onlyTag("comparative");
  const superlative = onlyTag("superlative");
  if (comparative) g.comparative = comparative;
  if (superlative) g.superlative = superlative;
  return Object.keys(g).length ? g : undefined;
}

function grammar(entry) {
  if (entry.pos === "noun") { const n = nounGrammar(entry); return n && { noun: n }; }
  if (entry.pos === "verb") { const v = verbGrammar(entry); return v && { verb: v }; }
  if (entry.pos === "adj") { const a = adjectiveGrammar(entry); return a && { adjective: a }; }
  return undefined;
}

const MAX_SENSES = 4;
const MAX_SENSE_EXAMPLES = 2;
const MAX_RELATIONS = 12;

export function extractKaikki(entry, { maxSenses = MAX_SENSES, english } = {}) {
  const out = {};

  const ipa = (entry.sounds ?? []).find((s) => s.ipa)?.ipa;
  if (ipa) out.ipa = ipa;
  const audio = (entry.sounds ?? []).find((s) => s.mp3_url || s.ogg_url);
  if (audio) out.audioUrl = audio.mp3_url ?? audio.ogg_url;
  const hyph = (entry.hyphenations ?? [])[0]?.parts;
  if (hyph?.length) out.syllables = hyph.join("·");

  const senses = [];
  for (const s of entry.senses ?? []) {
    if (isFormOfSense(s)) continue;
    if (!(s.glosses ?? []).length) continue;
    const sense = { glosses: s.glosses };
    const tags = (s.tags ?? []).filter((t) => !GENDER_TO_ARTICLE[t] && t !== "plural" && t !== "singular");
    if (tags.length) sense.tags = tags;
    if (s.topics?.length) sense.topics = s.topics;
    const ru = (s.translations ?? []).filter((t) => (t.lang_code ?? t.code) === "ru" && t.word).map((t) => t.word);
    if (ru.length) sense.glossRu = ru;
    const ex = senseExamples(s).slice(0, MAX_SENSE_EXAMPLES);
    if (ex.length) sense.examples = ex;
    senses.push(sense);
    if (senses.length >= maxSenses) break;
  }
  if (senses.length) {
    const cardWords = english?.length ? new Set(english.flatMap(enContentTokens)) : null;
    if (cardWords?.size) {
      // Stable-sort the card's own meaning to the front so the compact view and
      // summary surface the relevant sense for spelling-homographs.
      senses.sort((a, b) => (glossesMatchWords(b.glosses, cardWords) ? 1 : 0) - (glossesMatchWords(a.glosses, cardWords) ? 1 : 0));
    }
    out.senses = senses;
    const summarySense = senses.find((s) => s.glosses?.[0] && !CROSS_REF_GLOSS.test(s.glosses[0])) ?? senses[0];
    out.glossSummary = summarySense.glosses[0];
  }

  const g = grammar(entry);
  if (g) out.grammar = g;

  const synonyms = relationWords(entry, "synonyms").slice(0, MAX_RELATIONS);
  const antonyms = relationWords(entry, "antonyms").slice(0, MAX_RELATIONS);
  const hypernyms = relationWords(entry, "hypernyms").slice(0, MAX_RELATIONS);
  const hyponyms = relationWords(entry, "hyponyms").slice(0, MAX_RELATIONS);
  const related = [...new Set([...relationWords(entry, "related"), ...relationWords(entry, "coordinate_terms")])].slice(0, MAX_RELATIONS);
  if (synonyms.length) out.synonyms = synonyms;
  if (antonyms.length) out.antonyms = antonyms;
  if (hypernyms.length) out.hypernyms = hypernyms;
  if (hyponyms.length) out.hyponyms = hyponyms;
  if (related.length) out.related = related;

  const topics = new Set();
  for (const s of entry.senses ?? []) for (const t of s.topics ?? []) topics.add(t);
  if (topics.size) out.topics = [...topics].slice(0, MAX_RELATIONS);

  const register = new Set();
  for (const s of entry.senses ?? []) for (const t of s.tags ?? []) if (REGISTER_TAGS.has(t)) register.add(t);
  for (const t of entry.tags ?? []) if (REGISTER_TAGS.has(t)) register.add(t);
  if (register.size) out.register = [...register];

  const notes = [];
  for (const s of entry.senses ?? []) for (const n of s.notes ?? []) if (n) notes.push(n);
  for (const n of entry.notes ?? []) if (n) notes.push(n);
  const uniqNotes = [...new Set(notes)].slice(0, 4);
  if (uniqNotes.length) out.usageNotes = uniqNotes;

  if (entry.etymology_text) out.etymology = entry.etymology_text.slice(0, 400);

  return out;
}

function normExample(nl) {
  return nl.toLowerCase().replace(/\s+/g, " ").replace(/[.!?'"’]/g, "").trim();
}

export function dedupeExamples(examples, cap = 3) {
  const seen = new Set();
  const out = [];
  const ranked = [...examples].sort((a, b) => {
    const score = (e) => (e.source === "kaikki" ? 2 : 0) + (e.ru ? 1 : 0);
    return score(b) - score(a);
  });
  for (const ex of ranked) {
    if (!ex?.nl) continue;
    const key = normExample(ex.nl);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ex);
    if (out.length >= cap) break;
  }
  return out;
}
