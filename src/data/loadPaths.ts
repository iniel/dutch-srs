import { useEffect, useState } from "react";
import type { PathDef, PathsFile } from "../paths/types";

export function validPathDef(value: unknown): value is PathDef {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return false;
  const validIds = (ids: unknown) => Array.isArray(ids) && ids.every(id => typeof id === "string");
  if ("units" in p) return Array.isArray(p.units) && p.units.every(u => u && typeof u.id === "string"
    && typeof u.label === "string" && validIds(u.cardIds));
  return Number.isInteger(p.unitSize) && Number(p.unitSize) > 0 && Array.isArray(p.difficulties)
    && p.difficulties.every(d => d && typeof d.key === "string" && typeof d.label === "string" && validIds(d.cardIds));
}

/** Loads the optional path definitions sidecar. A missing/invalid file yields []. */
export async function loadPaths(): Promise<PathDef[]> {
  const url = `${import.meta.env.BASE_URL}paths.json`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const data = (await res.json()) as PathsFile;
  if (!data || typeof data !== "object" || !Array.isArray(data.paths)) return [];
  return data.paths.filter(validPathDef);
}

export function usePaths(): PathDef[] {
  const [paths, setPaths] = useState<PathDef[]>([]);
  useEffect(() => {
    loadPaths().then(setPaths).catch(() => setPaths([]));
  }, []);
  return paths;
}
