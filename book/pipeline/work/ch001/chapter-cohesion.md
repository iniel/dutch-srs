# ch001 — chapter cohesion

Read as one Dutch text (s01 v2 → s02 v2 → s03 v2 → s04 v1), then the programmatic
report `cohesion.md`, the four scene reports and the inbox. Four new versions written
(s01 v3, s02 v3, s03 v3, s04 v2), each a byte-copy of the previous final with only the
blocks below changed; `nl-check` and `nl-finalize` run on all four; `nl-cohesion 1`
re-run afterwards.

## Programmatic flags, adjudicated

| flag | verdict |
|---|---|
| C-TERM s03/b072 'magic' | false positive — “a magic owl” → *een magische uil* (glossary: adjective *magisch*) |
| C-TENSE s01/b010 | source present tense (the bookshelves opening) — by design |
| C-TENSE s01/b019, s02/b038, s02/b042, s03/b072 | present-tense **dialogue** inside a block that starts with narration; narration itself is imperfectum |
| C-TENSE s03/b053, b077, b081 | Harry's `\emph` thoughts — present tense by design (bible) |
| C-TENSE s03/b055 | source is gnomic present (“A flat metal plate on a door affords pushing…”) |
| C-TENSE s03/b064, b065 | the letter — present tense by design |
| C-TENSE s03/b052 | the expectation after the colon (*Ja, er komt een professor…*) is direct thought produced by the colon template; the source has “would show up”. Accepted; see C2 below |

Checks after the edits (v3/v2 vs previous final): s01 99.6 % / 2.2 → same; s02 99.6 % / 3.9
→ same; s03 98.9 % / 9.8 → same; s04 99.3 % / 7.0 → same. Grammar *likely* 0 everywhere;
the only new *review* row is R-PARTICIPLE on *vallend* (b006, 0.60), the same token the
language reviewer dismissed in s01 v1 (L8) — the detector reacts to the plural noun before it.

## Changes applied (block ids)

| scene | block | change | why |
|---|---|---|---|
| s01 v3 | b006 | *(zwart \gl{gewaad}{robes}, vallend)* → *(zwarte \gl{gewaden}{robes}, vallend)* | epigraph number settled: the payoff scene has several people in black robes falling (bible → Spoilers); glossary rule “plural only for several people” |
| s02 v3 | b039 | gloss on *genetische* dropped | listed cognate (exceptions.json); s02 L1 should_fix |
| s03 v3 | b055 | gloss on *hypothese* dropped | listed cognate; the brief asks for all cognate glosses to go; glossary/bible notes updated so ch 2+ do not re-gloss it |
| s03 v3 | b064 | *uw brief aan meneer~H.~Potter* → *uw brief aan de heer~H.~Potter* | the same written address as on the envelope (s01 b013); *meneer* is the spoken form |
| s04 v2 | b090 | *voor 31 juli* → *vóór 31 juli* | s04 L1 should_fix; the checker now strips acute accents |
| s04 v2 | b091 | *Jou alleen maar de gewone brief sturen!* → *Ze stuurden jou alleen maar de gewone brief.* | s04 M1 (voice: brisk, not agitated) + L2 (subjectless infinitival exclamation); emphasis count stays 2 |

Each new version carries a `v3 / v2 (cohesion editor)` line in `@notes`; `@glosses`
lists updated accordingly.

## Checked and left as they were

- *brein* — already consistent across the chapter (b053 glossed, b054, b077 bare); *hersenen*
  occurs only in the Phase 1 experiments (ch 903/904). Recorded in glossary + bible.
- Refrains: *Daar is de experimentele methode voor* (b037), *de hypothese testen* (b071, b075),
  *de wetenschappelijke methode* (b081), *Waarom geloof ik wat ik geloof?* (b053) — all in the
  bible's fixed form; the glossary now lists the first-person form next to the ch 7 second-person one.
- Forms of address: *Lieverd / Schat* (Michael), *Mijn lief* (Petunia), *pap / mam* (Harry, also in
  free indirect thought and in his garden monologue), *jongen* (Michael → Harry), *u* in the letter,
  *lieverd / je* (Mrs Figg) — no slips.
- Term pairs: *discussie* (Petunia/Harry) vs *ruzie / ruziemaken* (narrator, Harry's “fight”) —
  consistent; *hek* for the fence (b086, b092, b094); *envelop*; *smoesjes / smoes*; *lepels buigen*
  (b019, b020, b052); *een of andere manier* (b070, b074); *haalde diep adem* (b033, b078).
- Transitions: no `\later` in this chapter; s01→s02, s02→s03, s03→s04 continue mid-scene and lose no
  time marker.
- Title *Een dag van zeer lage waarschijnlijkheid* = bible; left unglossed in the heading, the word
  family glossed at b049 (*onwaarschijnlijk*). Bible decision line updated to match.
- *Feynman Lectures on Physics* (b041) stays roman: the source has no `\emph`; the bible's “English
  titles italic” rule is now worded as “italic where the source is italic”.
- *bewijs* (b048) unglossed: exceptions.json already says `gloss: never` — the translator's open
  question was stale. *toverdrank* (b026) unglossed: lexicon known A2 beats the keep entry
  (exceptions.json precedence note).
- *toelatingsbrief* (b088) keeps its gloss although *toelating* was glossed in b064: a different
  lemma, the checker would otherwise count a new unglossed unknown, and the gloss is harmless (see C1).

## Findings not fixed

```json
{
  "scene": "ch001/*",
  "version": 3,
  "reviewer": "cohesion",
  "verdict": "accept",
  "summary": "Chapter is consistent after the six block edits; the remaining items are notes for the next chapters and for the profile/lexicon owner.",
  "findings": [
    {
      "id": "C1",
      "block": "b088",
      "fragment": "\\gl{toelatingsbrief}{acceptance letter}",
      "problem": "Second gloss on the root already glossed in b064 (toelating → acceptance).",
      "evidence": "known-so-far has 'toelating'; the vocab checker does not derive 'toelatingsbrief' from it, so dropping the gloss adds one unglossed unknown to s04",
      "required_fix": "None now. Lexicon owner: if 'toelating' enters the lexicon, drop this gloss next time the scene is touched.",
      "severity": "note",
      "category": "repetition"
    },
    {
      "id": "C2",
      "block": "b052",
      "fragment": "Ja, er komt een professor van Zweinstein, hij zwaait met een toverstok, en uit de toverstok komt magie.",
      "problem": "Present tense inside past narration where the source has 'would show up'; produced by the colon-for-dat template (direct thought).",
      "evidence": "EN: 'expecting that, yes, a Hogwarts professor would show up' vs NL present after the colon; both reviewers accepted v2",
      "required_fix": "Optional alternative if a later reviewer objects: imperfectum after the colon (er kwam … hij zwaaide … kwam magie). Left as is: direct-thought present is the standard rendering of this template in the chapter (b015, b018, b037, b042).",
      "severity": "note",
      "category": "tense"
    },
    {
      "id": "C3",
      "block": "b006",
      "fragment": "(zwarte \\gl{gewaden}{robes}, vallend)",
      "problem": "The epigraph will reappear in the text of the climax; its Dutch must then be byte-identical.",
      "evidence": "bible → Spoilers (>= ch 114–115) now records the fixed wording of all three lines",
      "required_fix": "When that chapter is translated, copy the three lines from bible.md; do not retranslate.",
      "severity": "note",
      "category": "repetition"
    },
    {
      "id": "C4",
      "block": "b019",
      "fragment": "Ik leerde Harry lepels buigen.",
      "problem": "leren + object + bare infinitive is not listed in allowed.md or restricted.md.",
      "evidence": "s01 language review L12 asked the profile owner to rule; no flag from the checker",
      "required_fix": "Profile owner: add a row to allowed.md (A-LEREN-INF) or a template to restricted.md. Text unchanged.",
      "severity": "note",
      "category": "term"
    }
  ]
}
```

For the lexicon / profile owner (from the translator notes, not text changes): add the
phrase *Hoe dan ook* (b026); consider *haarnetje*, *kalligrafie*, *grafiet*, *zakmes* as
transparent; *brein* is still missing from the lexicon (covered by the keep list).

## Memory updates

**glossary.json** — new: *Mr H. Potter (envelope)* → `de heer~H.~Potter`; *brain (Harry's)* →
`brein`; *cold reading*; *magician (stage)* → `goochelaar`; *Show Interest / a Good Parent* →
`Belangstelling Tonen / een Goede Ouder`; *acceptance letter* → `toelatingsbrief / toelating`;
*argument / to argue* → `discussie / ruzie`; *excuse (pretext)* → `smoes`. Updated: *robes*
(first_chapter 2 → 1, epigraph plural), *hypothesis* (cognate, not glossed), *probability* (heading
unglossed, *onwaarschijnlijk* at b049), *Why do you believe…* (first-person form), *Mr Potter*
(spoken vs written).

**bible.md** — global: English titles italic only where the source is italic; cognates list and
chapter headings never glossed; address table + row *Harry → his brain: jij*. Chapter 1 characters:
Harry (brein, the certainty, letter formulae), Michael (labels, endearments, sceptic vocabulary),
Petunia (toverdrank, *discussie*), Mrs Figg (brisk full stops, *het hek*). Motif table: hypothese
row corrected; new rows *brein*, *de vreemde zekerheid*, *Geloof niet al je gedachten*, *Brief voor
Zweinstein!*, envelope address. Per-chapter ch 1 “Decisions” rewritten to the final state with the
list of 25 glosses. Spoilers: the epigraph entry now carries the fixed Dutch wording and the reason
for the plural.

**known-so-far/ch001.json** — regenerated by `nl-finalize`: 25 words (*gewaden* replaces *gewaad*;
*genetische* and *hypothese* removed).

**inbox.md** — all ten `## ch001 …` sections (incl. the four appended by this round's finalize)
consumed and cleared.
