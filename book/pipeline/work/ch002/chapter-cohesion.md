# ch002 — chapter cohesion

Read as one text (s01 v2 → s02 v2), then `cohesion.md`, both reports, the reviews' notes and the
inbox. New versions: s01 v3, s02 v3, s02 v4 (byte copies of the previous final except the blocks
below). `nl-check` + `nl-finalize` run on each; `nl-cohesion 2` re-run.

## Programmatic flags, adjudicated

| flag | verdict |
|---|---|
| C-TERM s02/b056 'magic' | “already know magic” → *kunnen al toveren* (glossary: verb *toveren*) |
| C-TERM s01/b019 'probability' | “infinitesimal probability” → *oneindig kleine kans* (glossary: everyday *kans*) |
| C-ADDRESS-MIX s01/b028 | Harry → McGonagall *u*; *Als je hem niet accepteert* is generic *je* |
| C-TENSE s01/b006 | epigraph, present in the source |
| C-TENSE s02/b043, b050, b053 | present-tense dialogue; narration is imperfectum |

Checks after the edits: s01 known 97.7 % → 98.0 %, new/1000 21.6 → 19.6, grammar likely 5 → 5;
s02 known 97.9 % → 98.0 %, new/1000 15.5 → 15.6, likely 3 → 3. No new must-level row. The
`gloss-on-known` rows on the re-check are a checker artifact (own-chapter known-so-far read as
known; sent to checker feedback). s02 structure FAIL = S-MACRO on `\pm`/`\am`, by design.

## Changes applied

| scene | block | change | finding |
|---|---|---|---|
| s01 v3 | b008 | *Dat is geen eerlijk spel.* → *Dat is niet eerlijk.* | R14 (calque) |
| s01 v3 | b024 | *krabbelde achteruit, zonder nadenken. Hij ging zo snel achteruit. Daarom struikelde hij* → *ging zonder nadenken snel achteruit. Te snel: hij struikelde* | R11 (wrong sense) |
| s01 v3 | b027 | *Of precies gezegd:* → *Preciezer gezegd:* | R12 (collocation) |
| s01 v3 | b039 | *Wat is dit?* → *Wat is dat?* | R13 |
| s01 v3 | b031 | gloss added: *\gl{knipperde}{blinked}* (unknown, no plain equivalent) | R19 note, rides along |
| s01 v3 | b034 | gloss on *toverspreuk* dropped (lexicon A2 known) | R20 note, rides along |
| s02 v3 | b042 | *Nu dan,* → *Goed,* | R15 |
| s02 v3 | b044 | *wiskundeleraar* → *wiskundelerares* (b049 stays generic) | R13 (referent) |
| s02 v3 | b050 | *Daar! Ziet u het?* → *Ziet u wel?* | R14 / M2 |
| s02 v4 | b042 | *ik vind vroeg of laat wel een oplossing* → *ik vind wel op tijd een oplossing* | bible Spoilers (>= ch 14): the *tijd* pun is a fixed setup; memory.md hides Spoilers, so the translator could not see it |

## Deferred items skipped

- s02 M1 (b046), M3 (b057): already fixed by the v2 patch (R3/R4, R11).
- s02 M2, the *elke dag* part: kept; it renders the habitual “what I have to deal with” and adds no fact.
- s01 R18 (gloss *ketel*, b011): paragraph already has two glosses.
- s01 R22 (b025), s02 R16/M8 (b040 “try to”: needs a *te*-infinitive, restricted), M5, M6, M7, R17, R19: optional notes; meaning holds.
- s01 R15–R17, R21, R23; s02 R18: notes confirming the current text; nothing to do.

## Checked, left as is

- Address: Michael/Petunia → McGonagall *u*; Harry → McGonagall *u*, *onderdirectrice* → *Zeg maar professor*; McGonagall → Harry *je* + *meneer~Potter*; family *je*, *Mam! Pap!*.
- Motifs: *Magie.*, *Huh.* ×2, *die blik*, *Ik bijt niemand die mij niet eerst bijt.*, *Op Zweinstein bijt niemand een leraar.*, *mondhoeken … omhoog* (b025, b029).
- Glosses: 19, none duplicated or late; known-so-far/ch002.json matches the finals (toverspreuk out, knipperde in).
- Title = bible = Harry's in-text line (b019). One continuous scene; no transition lost.

## Memory updates

- glossary.json: added *De Mars van de Rede*, *gewetensbezwaarde tegen de kinderdienstplicht*, *aandoening*, *wiskundelerares*, *heksachtig / kakelen*; changed *spreuk* (toverspreuk never glossed).
- bible.md: Characters ch 2 (McGonagall's *mondhoeken* motif, *u* from the parents, *onderdirectrice* → *professor*); running terms + 2 rows (*mondhoeken*, *De Mars van de Rede*); ch 2 **Decisions** rewritten as final state with the gloss list.
- inbox.md: ch002 sections replaced by the consumed marker; checker lines moved to `## checker feedback`, plus one new line (gloss-on-known artifact).

## Findings not fixed

None.
