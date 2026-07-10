import { useEffect, useState } from "react";
import type { PathDef, PathsFile } from "../paths/types";

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
  return data.paths;
}

export function usePaths(): PathDef[] {
  const [paths, setPaths] = useState<PathDef[]>([]);
  useEffect(() => {
    loadPaths().then(setPaths).catch(() => setPaths([]));
  }, []);
  return paths;
}
