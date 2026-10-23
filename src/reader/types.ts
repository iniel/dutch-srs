/** One token of a book text, as exported by the hpmor `nl-reader` tool. */
export interface ReaderToken {
  w: string;
  /** Whitespace after the token; absent means one space. */
  sp?: string;
  em?: boolean;
  /** Dictionary form; absent means `w` lowercased. */
  lemma?: string;
  /** Lexicon status; present on word tokens only (punctuation has none). */
  status?: string;
  /** Matching card ids, most likely first. */
  cards?: string[];
  gloss?: string;
}

export type ReaderBlockKind = "heading" | "para" | "quote" | "note" | "break";

export interface ReaderBlock {
  id: string;
  kind: ReaderBlockKind;
  en?: string;
  tokens?: ReaderToken[];
}

export interface BookChapter {
  book: string;
  chapter: number;
  title: string;
  titleEn?: string;
  words: number;
  cardIds: string[];
  blocks: ReaderBlock[];
}

export interface BookChapterRef {
  n: number;
  title: string;
  titleEn?: string;
  words: number;
  file: string;
}

export interface BookDef {
  id: string;
  title: string;
  chapters: BookChapterRef[];
}

export interface BooksIndex {
  version: number;
  books: BookDef[];
}
