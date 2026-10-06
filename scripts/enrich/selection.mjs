export function selectCards(cards, ids) {
  const byId = new Map(cards.map(c => [c.id, c]));
  if (!Array.isArray(ids) || ids.some(id => !byId.has(id))) throw new Error("Invalid enrichment card ids");
  return [...new Set(ids)].map(id => byId.get(id));
}

export function mergeEnrichment(existing, results) {
  return { ...existing, ...results };
}
