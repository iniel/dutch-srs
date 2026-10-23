---
description: Translate a whole HPMOR chapter into constrained Dutch (A2–B1), scene by scene, then the chapter pass (memory + deferred should_fix) and LaTeX assembly. Usage: /nl-chapter 1
argument-hint: <chapter number>
---

Run the `/nl-chapter` procedure from the `nl-translate` skill
(`.claude/skills/nl-translate/SKILL.md`) for chapter `$ARGUMENTS`.

Read the skill first. Scenes are processed sequentially with `/nl-scene`; scenes that
already have `sNN.final.nl.md` are skipped (resume). After all scenes: run `nl-cohesion`
(a list of suspects, not a gate) and `nl-memory N`, spawn `nl-cohesion-editor` (smart tier)
for the memory consolidation and the deferred should_fix, then run `nl-assemble` and
`nl-reader`, and report.
