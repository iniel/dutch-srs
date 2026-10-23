---
description: Translate one HPMOR scene into constrained Dutch (A2–B1) with the v2 loop (translate → check → one review → patch → diff/verify). Usage: /nl-scene 1/s02
argument-hint: <chapter>/<scene>  e.g. 1/s02
---

Run the `/nl-scene` procedure from the `nl-translate` skill
(`.claude/skills/nl-translate/SKILL.md`) for scene `$ARGUMENTS`.

Read the skill first, then follow its steps: extract if needed, `nl-memory N --scene sNN`,
spawn `nl-translator` (easy tier), run `nl-check`, spawn `nl-reviewer` (smart tier; plus
`nl-meaning-reviewer` when the scene is `dialogue_heavy`), and only if there is a must_fix:
one `nl-translator` patch, `nl-check`, `nl-diff`, and `nl-verifier` (smart, short) when
nl-diff exits 1. Then `nl-finalize` and report. should_fix items are deferred to the
chapter pass, never applied here.
