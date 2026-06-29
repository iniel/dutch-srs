import type { Direction } from "../types";

const PUNCTUATION = /[.'’/\-,!?;:"()]/g;

export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(PUNCTUATION, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export function distanceTolerance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 7) return 2;
  return 2 + Math.floor((len - 7) / 7);
}

export interface AnswerResult {
  correct: boolean;
  imprecise: boolean;
}

export function checkAnswer(
  input: string,
  accepted: string[],
  allowFuzzy = true,
): AnswerResult {
  const normInput = normalize(input);
  if (normInput.length === 0) return { correct: false, imprecise: false };

  const normAccepted = accepted.map(normalize);

  if (normAccepted.includes(normInput)) {
    return { correct: true, imprecise: false };
  }

  if (!allowFuzzy) return { correct: false, imprecise: false };

  for (const candidate of normAccepted) {
    const tolerance = distanceTolerance(candidate.length);
    if (tolerance > 0 && levenshtein(normInput, candidate) <= tolerance) {
      return { correct: true, imprecise: true };
    }
  }

  return { correct: false, imprecise: false };
}

const ARTICLES = ["de ", "het ", "een ", "’t ", "'t "];

export function articleVariants(dutch: string): string[] {
  const trimmed = dutch.trim();
  const variants = new Set<string>([trimmed]);
  const lower = trimmed.toLowerCase();
  for (const article of ARTICLES) {
    if (lower.startsWith(article)) {
      variants.add(trimmed.slice(article.length).trim());
    }
  }
  return [...variants];
}

export function acceptedForDirection(
  card: { dutch: string; english: string[] },
  dir: Direction,
): string[] {
  if (dir === "nl_en") return card.english;
  return [...new Set(articleVariants(card.dutch))];
}

const PLACEHOLDER_RE = /\b(someone|something|somebody|oneself|one's|sb|sth)\b/gi;

// Extra forms accepted for an English answer that carries explanatory words the
// learner shouldn't have to type: "cousin (male)" -> "cousin", "to call
// somebody" -> "to call". The originals are kept too. Single-card only — no
// cross-card synonym pooling, so each item must be answered on its own terms.
function englishVariants(glosses: string[]): string[] {
  const out = new Set<string>();
  for (const gloss of glosses) {
    out.add(gloss);
    const noParen = gloss.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (noParen) out.add(noParen);
    const noPlaceholder = gloss.replace(PLACEHOLDER_RE, " ").replace(/\s+/g, " ").trim();
    if (noPlaceholder) out.add(noPlaceholder);
  }
  return [...out];
}

export function acceptedAnswers(
  card: { dutch: string; english: string[] },
  dir: Direction,
): string[] {
  const base = acceptedForDirection(card, dir);
  if (dir === "nl_en") return [...new Set(englishVariants(base))];
  return base;
}
