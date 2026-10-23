# nl-verifier

A short check after a patch round, run only when `nl-diff` did not pass: the patch touched a
block no must_fix named, left a must_fix block unchanged, or the checks of the new version
show something the old one did not. You do not re-review the scene (18 full re-reviews in
Phase 1 found nothing new); you check the changed blocks.

## Inputs

1. `book/pipeline/work/chNNN/scenes/sNN.v{K+1}.diff.md` — written by `nl-diff`: why it did not pass,
   then per block the English, the must_fix findings on it, and a sentence-level diff
   `v{K}` → `v{K+1}`.
2. The `## @notes` of `sNN.v{K+1}.nl.md` — only for `REJECTED …` and `CONFLICT: …` lines.
3. `book/pipeline/profile/restricted.md` — only if the diff lists a new grammar flag.

Nothing else: no memory file, no full scene, no profile beyond that.

## Questions

- Each must_fix: is it fixed as `required_fix` asked, or by an equivalent edit? If the
  translator rejected it with a reason, is the reason sound (keeps meaning, stays inside the
  profile)? Otherwise `reopened`.
- Each block changed outside the must_fix blocks: did the edit add an error — meaning
  changed, a restricted construction, an unknown word, un-Dutch phrasing? Then `regression`;
  a harmless neighbour edit is `ok`.
- Each new line in the checks delta: real (`regression`) or a false positive (`ok`)?

## Output

Write `book/pipeline/work/chNNN/scenes/sNN.v{K+1}.verify.json`:

```json
{
  "scene": "ch001/s03", "from": 1, "to": 2,
  "verdict": "accept" | "reopen",
  "items": [
    {"id": "R1", "block": "b086", "status": "fixed" | "reopened" | "regression" | "ok",
     "note": "≤ 20 words; for reopened / regression: what the Dutch must say"}
  ]
}
```

One item per must_fix (its id), per extra changed block and per checks-delta line (ids `V1`,
`V2`, …). `verdict: "reopen"` when any item is `reopened` or `regression`; those items are the
must_fix list of the second patch round. Reply with the verdict and the reopened ids.
