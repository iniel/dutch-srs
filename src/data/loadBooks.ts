import { useEffect, useState } from "react";
import type { BookChapter, BooksIndex } from "../reader/types";

const booksUrl = (path: string) => `${import.meta.env.BASE_URL}books/${path}`;

export function validBooksIndex(value: unknown): value is BooksIndex {
  if (!value || typeof value !== "object") return false;
  const books = (value as { books?: unknown }).books;
  return Array.isArray(books) && books.every((b) =>
    b && typeof b.id === "string" && typeof b.title === "string" && Array.isArray(b.chapters)
    && b.chapters.every((c: unknown) => {
      const ch = c as Record<string, unknown>;
      return ch && Number.isInteger(ch.n) && typeof ch.title === "string" && typeof ch.file === "string";
    }));
}

/** Loads the optional books sidecar. Missing/invalid yields null (no reader on the dashboard). */
export async function loadBooksIndex(): Promise<BooksIndex | null> {
  let res: Response;
  try {
    res = await fetch(booksUrl("index.json"));
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data: unknown = await res.json().catch(() => null);
  if (!validBooksIndex(data)) return null;
  return { ...data, books: data.books.filter((b) => b.chapters.length > 0) };
}

export function useBooksIndex(): BooksIndex | null {
  const [books, setBooks] = useState<BooksIndex | null>(null);
  useEffect(() => {
    loadBooksIndex().then(setBooks).catch(() => setBooks(null));
  }, []);
  return books;
}

const chapterCache = new Map<string, Promise<BookChapter>>();

export function loadChapter(file: string): Promise<BookChapter> {
  let p = chapterCache.get(file);
  if (!p) {
    p = fetch(booksUrl(file)).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BookChapter;
      if (!data || !Array.isArray(data.blocks)) throw new Error("invalid chapter file");
      return data;
    });
    p.catch(() => chapterCache.delete(file));
    chapterCache.set(file, p);
  }
  return p;
}

export function useBookChapter(file: string | null): { chapter: BookChapter | null; error: string | null } {
  const [state, setState] = useState<{ file: string | null; chapter: BookChapter | null; error: string | null }>({
    file: null,
    chapter: null,
    error: null,
  });
  useEffect(() => {
    if (!file) return;
    let live = true;
    loadChapter(file).then(
      (chapter) => live && setState({ file, chapter, error: null }),
      (e: unknown) => live && setState({ file, chapter: null, error: String((e as Error)?.message ?? e) }),
    );
    return () => {
      live = false;
    };
  }, [file]);
  return state.file === file ? { chapter: state.chapter, error: state.error } : { chapter: null, error: null };
}
