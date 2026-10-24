export const USER_TEXTS_KEY = "dutch-srs-user-texts-v1";
export const MAX_TEXT_CHARS = 20000;
/** All texts together stay far below the ~5 MB origin quota so SRS progress always has room to save. */
export const MAX_TOTAL_CHARS = 500000;

/** A pasted reading text. Kept apart from ProgressData so export/import stays SRS-only. */
export interface UserText {
  id: string;
  title: string;
  text: string;
  createdAt: number;
}

function validText(t: unknown): t is UserText {
  const u = t as Partial<UserText> | null;
  return !!u && typeof u.id === "string" && typeof u.title === "string" && typeof u.text === "string"
    && typeof u.createdAt === "number";
}

export function loadUserTexts(): UserText[] {
  try {
    const raw = localStorage.getItem(USER_TEXTS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(validText) : [];
  } catch {
    return [];
  }
}

/** False when the browser refuses the write (storage full). */
export function saveUserTexts(list: UserText[]): boolean {
  try {
    localStorage.setItem(USER_TEXTS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function userTextTitle(title: string, text: string): string {
  const t = title.trim();
  if (t) return t;
  const words = text.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length < text.trim().length ? `${words}…` : words;
}

export function fitsBudget(list: UserText[], text: string): boolean {
  return list.reduce((sum, t) => sum + t.text.length + t.title.length, 0) + text.length <= MAX_TOTAL_CHARS;
}
