# Memory inbox

Translator `@notes` and `CONFLICT:` lines are appended here per scene by the
orchestrator (`/nl-scene`). The cohesion editor moves what matters into
`bible.md` / `glossary.json` and clears the section.

<!-- ch001: consumed by the cohesion editor (see work/ch001/chapter-cohesion.md) -->

## checker feedback
- ch002 s01 v1: Lemmatizer errors: 'tilt' → tilen (tillen), 'aanpast' → aanpasen (aanpassen), 'wilt leren' → wiltlen; they inflate the unknown count.
- ch002 s01 v1: Comparatives of listed cognates (dramatischere ← dramatisch) should resolve to the cognate.
- ch002 s01 v1: Grammar checker misses inverted conditionals without als ('Gebeurt het niet, dan …', R-CONJ-OTHER) and the split 'ergens … voor' (R-ER-PREP).
- ch002 s01 v1: R-ER-PREP fires on presentational er + a separate PP ('er zitten geen draden aan je'); require the preposition to have no object.
- ch002 s01 v1: R-VERB-CHAIN should count whitelisted chunks (laten zien) as one verb.
- ch002 s01 v1: Glossed-known-equivalent matched on English gloss only: smooren→stikken, waarneming→opmerking, aandoening→toestand are all different senses; consider sense-checking the en field.
- ch002 s01 v1: Whitelist the fixed chapter title 'Alles wat ik geloof, is niet waar' and its in-text echo for R-RELCL.
- ch002 s02 v1 (orchestrator): S-MACRO fires on \pm/m dropped per the bible's fixed rendering (“10 pm, 12 am…” → tien uur 's avonds…); exempt \pm/m from S-MACRO.
- ch002 s02 v1: Lemmatizer: 'opsta' (opstaan) and 'kniken' (knikken) reported as unknown; both known.
- ch002 s02 v1: Interjections like 'hmmmmm' should be skipped by the vocab count.
- ch002 s02 v1: Split separable verbs with particle after the object (viel … hem bij → bijvallen) are not looked up as the compound.
- ch002 s02 v1: L-FRAME misses frames that contain a whole subordinate clause (b055 ga … voordat de school begint meenemen).
- ch002 s02 v1: R-CONJ-OTHER does not catch inverted conditionals 'Laat ik je …, dan …' (b057).
- ch002 s02 v1: polysemy.json: add leren (learn vs teach) and inhalen (fetch vs catch up / overtake); possessive + verbal noun ('Haar bijten') as a referent warning.
- ch002 cohesion: re-checking a scene after nl-finalize reports the chapter's own glosses as 'gloss-on-known' (known-so-far/chNNN.json is read as already-known for chapter NNN itself); exclude the current chapter's file when checking it.

<!-- ch002: consumed by the chapter pass (see work/ch002/chapter-cohesion.md) -->
