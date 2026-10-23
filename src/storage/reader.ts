export const READER_KEY = "dutch-srs-reader-v1";

/** Where the reader was left. Kept apart from ProgressData so export/import stays SRS-only. */
export interface ReaderPosition {
  book: string;
  chapter: number;
  blockId: string | null;
}

export function loadReaderPosition(): ReaderPosition | null {
  try {
    const raw = localStorage.getItem(READER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ReaderPosition>;
    if (typeof p.book !== "string" || !Number.isInteger(p.chapter)) return null;
    return { book: p.book, chapter: p.chapter as number, blockId: typeof p.blockId === "string" ? p.blockId : null };
  } catch {
    return null;
  }
}

export function saveReaderPosition(pos: ReaderPosition): void {
  try {
    localStorage.setItem(READER_KEY, JSON.stringify(pos));
  } catch {
    // storage full or unavailable: losing the reading position is acceptable
  }
}
