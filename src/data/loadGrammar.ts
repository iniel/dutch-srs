import { useEffect, useState } from "react";
import type { GrammarAux, GrammarDrill, GrammarItem } from "../grammar/types";

const AUXES: GrammarAux[] = ["hebben", "zijn", "hebben/zijn"];

function validGrammarItem(value: unknown): value is GrammarItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.cardId === "string" && typeof item.infinitive === "string"
    && typeof item.participle === "string" && AUXES.includes(item.aux as GrammarAux);
}

export async function loadGrammarDrill(): Promise<GrammarDrill | null> {
  const url = `${import.meta.env.BASE_URL}grammar/perfectum.json`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<GrammarDrill> | null;
  if (!data || typeof data.id !== "string" || typeof data.name !== "string" || !Array.isArray(data.items)) return null;
  return { id: data.id, name: data.name, items: data.items.filter(validGrammarItem) };
}

export function useGrammarDrill(): GrammarDrill | null {
  const [drill, setDrill] = useState<GrammarDrill | null>(null);
  useEffect(() => {
    loadGrammarDrill().then(setDrill).catch(() => setDrill(null));
  }, []);
  return drill;
}
