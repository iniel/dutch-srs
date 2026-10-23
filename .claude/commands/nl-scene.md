---
description: Translate one HPMOR scene into constrained Dutch (A2–B1) with the review loop. Usage: /nl-scene 1/s02
argument-hint: <chapter>/<scene>  e.g. 1/s02
---

Run the `/nl-scene` procedure from the `nl-translate` skill
(`.claude/skills/nl-translate/SKILL.md`) for scene `$ARGUMENTS`.

Read the skill first, then follow its steps: extract if needed, spawn
`nl-translator`, run `nl-check`, spawn `nl-meaning-reviewer` and
`nl-language-reviewer` in parallel, apply at most two fix rounds, finalize, and
report.
