// The Russian gloss sources name parts of speech differently (Wiktextract "verb"/"det",
// FreeDict "v"/"possessivePronoun"); a coarse shared class lets a lookup keep the POS of
// the matched Dutch entry instead of taking every homograph under one headword.
const CLASSES = [
  [/^(n|noun)$/, "noun"],
  [/^(v|verb)$/, "verb"],
  [/^adj$|Adjective$/, "adj"],
  [/^adv$/, "adv"],
  [/^(pron|det)$|Pronoun$/, "pron"],
  [/^num$|Numeral$/, "num"],
  [/^(prep|preposition)$/, "prep"],
  [/^(intj|interjection)$/, "intj"],
  [/^(conj|conjunction)$/, "conj"],
  [/^(phrase|phraseologicalUnit)$/, "phrase"],
  [/^article$/, "article"],
  [/^(pn|name)$/, "name"],
];

export function posClass(pos) {
  return CLASSES.find(([re]) => re.test(pos ?? ""))?.[1];
}

export function posKey(head, pos) {
  const cls = posClass(pos);
  return cls && `${head}|${cls}`;
}

export function addByPos(index, head, pos, glosses, max = Infinity) {
  const key = posKey(head, pos);
  if (!key) return;
  const merged = index.byPos.get(key) ?? [];
  for (const g of glosses) if (!merged.includes(g)) merged.push(g);
  index.byPos.set(key, merged.slice(0, max));
}
