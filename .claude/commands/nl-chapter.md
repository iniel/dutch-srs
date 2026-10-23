---
description: Translate a whole HPMOR chapter into constrained Dutch (A2–B1), scene by scene, then cohesion pass and LaTeX assembly. Usage: /nl-chapter 1
argument-hint: <chapter number>
---

Run the `/nl-chapter` procedure from the `nl-translate` skill
(`.claude/skills/nl-translate/SKILL.md`) for chapter `$ARGUMENTS`.

Read the skill first. Scenes are processed sequentially with `/nl-scene`; scenes
that already have `sNN.final.nl.md` are skipped (resume). After all scenes: run
`nl-cohesion`, spawn `nl-cohesion-editor`, run `nl-assemble` and `nl-reader`, and report.
