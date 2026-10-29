import type { ReviewState } from "../types";
import cardRedirects from "../data/cardRedirects.json";
import { isReviewState, redirectStates } from "./progress";

export const GRAMMAR_STORAGE_KEY = "dutch-srs-grammar-v1";

export interface DrillProgress {
  states: Record<string, ReviewState>;
}

export interface GrammarData {
  version: 1;
  drills: Record<string, DrillProgress>;
}

function freshGrammar(): GrammarData {
  return { version: 1, drills: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function coerceGrammar(value: unknown): GrammarData {
  if (!isRecord(value) || !isRecord(value.drills)) return freshGrammar();
  const drills: Record<string, DrillProgress> = {};
  for (const [drillId, raw] of Object.entries(value.drills)) {
    if (!isRecord(raw) || !isRecord(raw.states)) continue;
    const states: Record<string, ReviewState> = {};
    for (const [cardId, st] of Object.entries(raw.states)) if (isReviewState(st)) states[cardId] = st;
    drills[drillId] = { states };
  }
  return { version: 1, drills };
}

function redirectGrammar(data: GrammarData, redirects: Record<string, string>): GrammarData {
  const moved = (id: string) => Object.prototype.hasOwnProperty.call(redirects, id);
  if (!Object.values(data.drills).some((d) => Object.keys(d.states).some(moved))) return data;
  const drills: Record<string, DrillProgress> = {};
  for (const [drillId, drill] of Object.entries(data.drills)) {
    drills[drillId] = { states: redirectStates(drill.states, redirects) };
  }
  return { ...data, drills };
}

export function loadGrammar(): GrammarData {
  let raw: string | null;
  try {
    raw = localStorage.getItem(GRAMMAR_STORAGE_KEY);
  } catch {
    return freshGrammar();
  }
  if (raw === null) return freshGrammar();
  let coerced: GrammarData;
  try {
    coerced = coerceGrammar(JSON.parse(raw));
  } catch {
    return freshGrammar();
  }
  const data = redirectGrammar(coerced, cardRedirects);
  if (data !== coerced) {
    try {
      saveGrammar(data);
    } catch {
      /* the redirect is re-applied on the next load */
    }
  }
  return data;
}

export function importGrammar(json: string): GrammarData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !("grammar" in parsed)) return null;
  return redirectGrammar(coerceGrammar(parsed.grammar), cardRedirects);
}

export function saveGrammar(data: GrammarData): void {
  localStorage.setItem(GRAMMAR_STORAGE_KEY, JSON.stringify(data));
}

export function drillStates(data: GrammarData, drillId: string): Record<string, ReviewState> {
  return data.drills[drillId]?.states ?? {};
}

export function setDrillState(data: GrammarData, drillId: string, cardId: string, state: ReviewState): GrammarData {
  return {
    ...data,
    drills: { ...data.drills, [drillId]: { states: { ...drillStates(data, drillId), [cardId]: state } } },
  };
}

export function resetGrammar(): GrammarData {
  try {
    localStorage.removeItem(GRAMMAR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return freshGrammar();
}
