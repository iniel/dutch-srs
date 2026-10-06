import { normalizeHead, pickEntry, glossMatchesEnglish, entryMatchesCard } from "./extract.mjs";

export function bookLemma(card) {
  const value = card.notes?.match(/^Book annotation: (.+)$/)?.[1];
  return value && !/[()]/.test(value) ? normalizeHead(value) : undefined;
}

export function selectBookEntry(card, index) {
  const head = normalizeHead(card.dutch);
  const annotation = bookLemma(card);
  let candidates = (index.get(head) ?? []).filter(e => entryMatchesCard(e, card));
  if (/^(de|het) /i.test(card.dutch)) candidates = candidates.filter(e => e.pos === "noun");
  if (card.english.length === 1 && card.english[0] === "the") candidates = candidates.filter(e => e.pos === "article");
  const forms = candidates.flatMap(entry => (entry.senses ?? []).flatMap(s => (s.form_of ?? []).map(f => ({ entry, lemma: normalizeHead(f.word) }))));
  const form = forms.find(f => annotation && f.lemma === annotation) ?? forms.find(f =>
    (index.get(f.lemma) ?? []).some(e => e.pos === f.entry.pos && glossMatchesEnglish(e, card.english)));
  if (form) {
    const samePos = (index.get(form.lemma) ?? []).filter(e => e.pos === form.entry.pos);
    const byMeaning = samePos.filter(e => glossMatchesEnglish(e, card.english));
    // Inflected English ("days", "am") rarely overlaps the lemma gloss ("day", "to be");
    // the lemma's own paradigm listing the surface form is the safer confirmation.
    const bases = byMeaning.length ? byMeaning : samePos.filter(e => e.forms?.some(f => normalizeHead(f.form ?? "") === head));
    return { entry: form.entry, base: pickEntry(bases, card).entry, lemma: form.lemma, matchedBy: "book-form" };
  }
  const matching = candidates.filter(e => glossMatchesEnglish(e, card.english)
    || (e.pos === "article" && card.english[0] === "the"));
  const entry = pickEntry(matching, card).entry;
  return { entry, lemma: head, matchedBy: "meaning" };
}

export function matchingSenses(entry, english) {
  if (!entry) return entry;
  return { ...entry, senses: entry.senses.filter(s => s.form_of?.length || glossMatchesEnglish({ senses: [s] }, english)
    || entry.pos === "article") };
}
