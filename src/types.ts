export type CardType = "word" | "phrase" | "sentence";

export interface Card {
  id: string;
  group: string;
  level?: string;
  dutch: string;
  english: string[];
  type: CardType;
  cefr?: "A1" | "A2" | "B1" | "B2";
  pos?: string;
  lemma?: string;
  exampleNl?: string;
  exampleEn?: string;
  notes?: string;
}

export type ExampleSource = "kaikki" | "tatoeba";

export interface Example {
  nl: string;
  en?: string;
  ru?: string;
  source: ExampleSource;
  tatoebaId?: number;
}

export interface Sense {
  glosses: string[];
  glossRu?: string[];
  tags?: string[];
  topics?: string[];
  examples?: Example[];
}

export interface NounGrammar {
  article?: "de" | "het" | "de/het";
  gender?: string[];
  plural?: string;
  diminutive?: string;
}

export interface VerbGrammar {
  presentSg?: string;
  pastSg?: string;
  pastPl?: string;
  pastParticiple?: string;
  auxiliary?: "hebben" | "zijn" | "hebben/zijn";
  separable?: boolean;
}

export interface AdjectiveGrammar {
  comparative?: string;
  superlative?: string;
}

export interface Grammar {
  noun?: NounGrammar;
  verb?: VerbGrammar;
  adjective?: AdjectiveGrammar;
}

export interface MatchInfo {
  source: "kaikki" | "kaikki+tatoeba" | "tatoeba" | "none";
  matchedBy?: "lemma+pos" | "lemma" | "dutch-stripped" | "none";
  matchedWord?: string;
}

/** Dictionary-grade extras for a `Card`, keyed by `Card.id`. Display-only; never feeds answer checking. */
export interface Enrichment {
  id: string;
  match: MatchInfo;
  ipa?: string;
  syllables?: string;
  audioUrl?: string;
  glossSummary?: string;
  /** Russian glosses for the whole word, from the ruwiktionary edition (display-only). */
  glossRu?: string[];
  senses?: Sense[];
  grammar?: Grammar;
  synonyms?: string[];
  antonyms?: string[];
  hypernyms?: string[];
  hyponyms?: string[];
  related?: string[];
  topics?: string[];
  register?: string[];
  usageNotes?: string[];
  etymology?: string;
  examples?: Example[];
}

export type Direction = "nl_en" | "en_nl";

export const DIRECTIONS: Direction[] = ["nl_en", "en_nl"];

/** Session-local id `${cardId}:${direction}` — NOT a storage key (states are keyed by cardId). */
export type ItemKey = string;

export function itemKey(cardId: string, dir: Direction): ItemKey {
  return `${cardId}:${dir}`;
}

export function parseItemKey(key: ItemKey): { cardId: string; dir: Direction } {
  const idx = key.lastIndexOf(":");
  return { cardId: key.slice(0, idx), dir: key.slice(idx + 1) as Direction };
}

export interface ReviewState {
  /** 0 = lesson (not started), 1-8 = review stages, 9 = burned. */
  stage: number;
  /** Unix ms when this item next becomes available for review. */
  availableAt: number;
  lastReviewedAt: number;
  incorrectCount: number;
  burned: boolean;
}

export interface ProgressData {
  version: number;
  /** One SRS state per word, keyed by `cardId`. Both directions share it. */
  states: Record<string, ReviewState>;
  /** cardIds pinned to jump the level lock and lead the next lesson batch. */
  lessonQueue: string[];
  settings: AppSettings;
}

export interface AppSettings {
  lessonBatchSize: number;
  dailyLessonCap?: number;
  theme: "system" | "light" | "dark";
  unlockAllLevels?: boolean;
}
