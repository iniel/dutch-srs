import type { Card, Grammar } from "../types";
import type { BookChapter, ReaderBlock, ReaderToken } from "./types";

const PARTICLES = new Set([
  "aan", "af", "achter", "bij", "binnen", "buiten", "dicht", "door", "heen", "in", "klaar", "langs", "los", "mee",
  "na", "neer", "om", "op", "open", "over", "rond", "samen", "tegen", "terug", "thuis", "toe", "uit", "vast",
  "voor", "voorbij", "vooruit", "weg", "mis", "goed", "schoon", "stil", "vol", "kwijt", "leeg", "vrij",
]);
const PARTICLES_LONGEST_FIRST = [...PARTICLES].sort((a, b) => b.length - a.length);
const NOTE_SKIP = new Set(["ik", "jij", "je", "u", "hij", "zij", "ze", "het", "wij", "we", "jullie", "de", "een"]);
const ARTICLE_RE = /^(de|het|een|'t)\s+/i;
const TOKEN_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;
const SENTENCE_END = new Set([".", "!", "?", "…"]);
const CLAUSE_END = new Set([".", "!", "?", "…", ",", ";", ":", "\"", "”", "’", ")"]);
const MIN_PART = 3;
const IRREGULAR: Record<string, string> = {
  ben: "zijn", bent: "zijn", is: "zijn", was: "zijn", waren: "zijn", geweest: "zijn",
  heb: "hebben", hebt: "hebben", heeft: "hebben", had: "hebben", hadden: "hebben",
  kan: "kunnen", kun: "kunnen", kunt: "kunnen", kon: "kunnen", konden: "kunnen",
  wil: "willen", wilt: "willen", wou: "willen", zal: "zullen", zult: "zullen", zou: "zullen", zouden: "zullen",
  mag: "mogen", mocht: "mogen", mochten: "mogen", moet: "moeten", moest: "moeten", moesten: "moeten",
};

export interface FormIndex {
  lemmaCards: Map<string, string[]>;
  formLemmas: Map<string, string[]>;
  /** base verb lemma -> particle -> separable verb lemma (staan -> op -> opstaan) */
  separable: Map<string, Map<string, string>>;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (!list) map.set(key, [value]);
  else if (!list.includes(value)) list.push(value);
}

function cardLemma(card: Card): string {
  return (card.lemma ?? card.dutch.replace(ARTICLE_RE, "")).trim().toLowerCase();
}

function noteForms(notes: string | undefined): string[] {
  if (!notes?.includes("forms:")) return [];
  return notes.split("forms:")[1].split(",").flatMap((item) => {
    const words = item.trim().split(/\s+/).filter(Boolean);
    while (words.length && NOTE_SKIP.has(words[0].toLowerCase())) words.shift();
    if (words.length === 1) return [words[0].toLowerCase()];
    if (words.length === 2 && PARTICLES.has(words[1])) return [words[0].toLowerCase()];
    return [];
  });
}

function grammarForms(grammar: Grammar | undefined): string[] {
  const out: string[] = [];
  for (const sub of [grammar?.noun, grammar?.verb, grammar?.adjective]) {
    for (const [key, value] of Object.entries(sub ?? {})) {
      if (typeof value === "string" && value && !value.includes(" ") && key !== "article") out.push(value.toLowerCase());
    }
  }
  return out;
}

export function buildFormIndex(cards: Card[], grammarOf: (cardId: string) => Grammar | undefined): FormIndex {
  const index: FormIndex = { lemmaCards: new Map(), formLemmas: new Map(), separable: new Map() };
  const addSeparable = (particle: string, base: string, full: string) => {
    if (!index.separable.has(base)) index.separable.set(base, new Map());
    index.separable.get(base)!.set(particle, full);
  };
  for (const card of cards) {
    if (card.type === "sentence") continue;
    let lemma = cardLemma(card);
    const parts = lemma.split(" ");
    if (parts.length === 2 && PARTICLES.has(parts[1]) && parts[0].endsWith("en")) {
      addSeparable(parts[1], parts[0], parts[1] + parts[0]);
      lemma = parts[1] + parts[0];
    } else if (parts.length > 1) {
      continue;
    }
    push(index.lemmaCards, lemma, card.id);
    if (card.pos === "v.") {
      const particle = PARTICLES_LONGEST_FIRST.find((p) => lemma.startsWith(p) && lemma.length - p.length >= MIN_PART + 1);
      if (particle) addSeparable(particle, lemma.slice(particle.length), lemma);
    }
    for (const form of [...noteForms(card.notes), ...grammarForms(grammarOf(card.id))]) {
      if (form !== lemma) push(index.formLemmas, form, lemma);
    }
  }
  return index;
}

/** Cheap Dutch de-inflection candidates; false ones are harmless because each is looked up. */
export function deinflect(word: string): string[] {
  const out: string[] = [];
  if (word.length > 4 && word.startsWith("ge") && /[dt]$/.test(word)) {
    const stem = word.slice(2, -1);
    out.push(stem + "en", stem + word.at(-1) + "en", stem + stem.at(-1) + "en");
  }
  for (const suffix of ["ste", "den", "ten", "de", "te", "en", "er", "st", "es", "e", "s", "t", "n"]) {
    if (!word.endsWith(suffix) || word.length - suffix.length < MIN_PART) continue;
    const stem = word.slice(0, -suffix.length);
    out.push(stem, stem + "en", stem + "e");
    const last = stem.at(-1)!;
    const beforeLast = stem.at(-2)!;
    if (/[aeiou]/.test(last)) out.push(stem + "n");
    if (last === beforeLast) out.push(stem.slice(0, -1), stem.slice(0, -1) + "en");
    if (last === "z" || last === "v") out.push(stem.slice(0, -1) + (last === "z" ? "s" : "f"));
    if (stem.length >= 3 && /[aeou]/.test(beforeLast) && !/[aeiou]/.test(stem.at(-3)!)) {
      const long = stem.slice(0, -1) + beforeLast + last;
      out.push(long, long + "en");
    }
    if (/(aa|ee|oo|uu)[^aeiou]$/.test(stem)) {
      const short = stem.slice(0, -2) + last;
      out.push(short + "en", (last === "f" ? stem.slice(0, -2) + "v" : last === "s" ? stem.slice(0, -2) + "z" : short) + "en");
    }
  }
  return [...new Set(out)].filter((c) => c && c !== word);
}

function lemmasOf(word: string, index: FormIndex): string[] {
  const out: string[] = [];
  const add = (lemma: string) => {
    if (index.lemmaCards.has(lemma) && !out.includes(lemma)) out.push(lemma);
  };
  add(word);
  if (IRREGULAR[word]) add(IRREGULAR[word]);
  index.formLemmas.get(word)?.forEach(add);
  if (out.length) return out;
  for (const candidate of deinflect(word)) {
    add(candidate);
    index.formLemmas.get(candidate)?.forEach(add);
  }
  return out;
}

function compoundParts(word: string, index: FormIndex): [string, string] | null {
  for (let split = MIN_PART; split <= word.length - MIN_PART; split++) {
    const tail = lemmasOf(word.slice(split), index)[0];
    if (!tail) continue;
    const headRaw = word.slice(0, split);
    const head = [headRaw, headRaw.replace(/(s|e|en)$/, "")].find((h) => h.length >= MIN_PART && index.lemmaCards.has(h));
    if (head) return [head, tail];
  }
  return null;
}

function cardsOf(lemmas: string[], index: FormIndex): string[] {
  return [...new Set(lemmas.flatMap((l) => index.lemmaCards.get(l) ?? []))];
}

interface Word {
  token: ReaderToken;
  lower: string;
  lemmas: string[];
}

function resolveToken(token: ReaderToken, sentenceStart: boolean, index: FormIndex): Word | null {
  const w = token.w;
  if (!/[\p{L}\p{N}]/u.test(w)) return null;
  if (/^\p{N}+$/u.test(w)) {
    token.status = "number";
    return null;
  }
  const lower = w.toLowerCase();
  const lemmas = lemmasOf(lower, index);
  if (lemmas.length) {
    token.status = "card";
    token.cards = cardsOf(lemmas, index);
    if (lemmas[0] !== lower) token.lemma = lemmas[0];
    return { token, lower, lemmas };
  }
  const compound = compoundParts(lower, index);
  if (compound) {
    token.status = "compound";
    token.cards = cardsOf(compound, index);
    return { token, lower, lemmas: [] };
  }
  token.status = !sentenceStart && /^\p{Lu}\p{Ll}/u.test(w) ? "name" : "unknown";
  return { token, lower, lemmas: [] };
}

/** stond … op: a clause-final particle joins the verb before it in the same sentence. */
function joinSeparable(words: (Word | null)[], tokens: ReaderToken[], index: FormIndex): void {
  words.forEach((particle, i) => {
    if (!particle || !PARTICLES.has(particle.lower)) return;
    const next = tokens[i + 1];
    if (next && !CLAUSE_END.has(next.w)) return;
    for (let j = i - 1; j >= 0 && !SENTENCE_END.has(tokens[j].w); j--) {
      const verb = words[j];
      const full = verb?.lemmas.map((l) => index.separable.get(l)?.get(particle.lower)).find(Boolean);
      if (!verb || !full) continue;
      const cards = [...new Set([...(index.lemmaCards.get(full) ?? []), ...(verb.token.cards ?? [])])];
      for (const t of [verb.token, particle.token]) {
        t.lemma = full;
        t.status = "card";
        t.cards = cards;
      }
      return;
    }
  });
}

function tokenizeBlock(text: string, index: FormIndex): ReaderToken[] {
  const tokens: ReaderToken[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const end = m.index! + m[0].length;
    const gap = text.slice(end).match(/^\s*/)![0];
    const token: ReaderToken = { w: m[0] };
    const sp = gap.includes("\n") ? "\n" : gap ? " " : "";
    if (sp !== " ") token.sp = sp;
    tokens.push(token);
  }
  let sentenceStart = true;
  const words = tokens.map((t) => {
    const word = resolveToken(t, sentenceStart, index);
    if (word || t.status) sentenceStart = false;
    if (SENTENCE_END.has(t.w)) sentenceStart = true;
    return word;
  });
  joinSeparable(words, tokens, index);
  return tokens;
}

export function textToChapter(bookId: string, title: string, text: string, index: FormIndex): BookChapter {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean);
  const blocks: ReaderBlock[] = paragraphs.map((p, i) => ({
    id: `b${String(i + 1).padStart(3, "0")}`,
    kind: "para",
    tokens: tokenizeBlock(p.replace(/[ \t]*\n[ \t]*/g, "\n"), index),
  }));
  const wordTokens = blocks.flatMap((b) => b.tokens!).filter((t) => t.status !== undefined);
  const cardIds = [...new Set(wordTokens.flatMap((t) => t.cards ?? []))];
  return { book: bookId, chapter: 1, title, words: wordTokens.length, cardIds, blocks };
}

export function countWords(text: string): number {
  return (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
}
