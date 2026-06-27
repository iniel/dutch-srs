import { useEffect, useState } from "react";
import type { Enrichment } from "../types";

/** Loads the optional enrichment sidecar. A missing file (404) yields an empty map. */
export async function loadEnrichment(): Promise<Map<string, Enrichment>> {
  const url = `${import.meta.env.BASE_URL}enrichment.json`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return new Map();
  }
  if (!res.ok) return new Map();
  const data = (await res.json()) as Record<string, Enrichment>;
  if (!data || typeof data !== "object" || Array.isArray(data)) return new Map();
  return new Map(Object.entries(data));
}

export function useEnrichment(): Map<string, Enrichment> {
  const [map, setMap] = useState<Map<string, Enrichment>>(() => new Map());
  useEffect(() => {
    loadEnrichment().then(setMap).catch(() => setMap(new Map()));
  }, []);
  return map;
}
