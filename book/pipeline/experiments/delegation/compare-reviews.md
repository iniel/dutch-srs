# Delegation trial — reviewer roles, cheaper models vs reference

Reference = reviews in `dutch/work/…/sNN.v1.*.json` (strongest model). Trial = same role, same inputs,
played by Sonnet or Gemini (`dutch/experiments/delegation/*.json`). Ground truth for "was the reference
right" = the v2 re-reviews (`sNN.v2.*.json`), which record every reference finding as fixed / declined.

Alignment is by (block, fragment/problem). Severity labels: **MF** must_fix, **SF** should_fix, **N** note.

## Caveat: memory leakage

The trials ran against the *current* `bible.md`, `glossary.json` and `exceptions.json`. Several entries they
cite were written **after** the reference v1 reviews, as a result of those reviews or of the cohesion pass:
`genetisch` / `hypothese` / `doctor` under cognates, `op voorwaarde dat` on the grammar whitelist, "the fence
is *het hek*", the envelope form *de heer~H.~Potter*, "never *excuus*, always *smoes*". Trial hits that rest on
those entries (hek, de heer, smoes, the two gloss drops) are legitimate uses of memory, but they are not
evidence that the cheaper model out-read the reference. They are marked (leak) below.

---

## Pair 1 — ch001/s02, language

Reference: verdict **fix**. MF: L1 b042 wish in plain indicative (*hij luistert … hij vertrouwt haar*);
L2 b039 *studeer het maar* (studeren takes no object). SF: L3 *Ze* → *Zijn ouders*; L4 *vertrok* (sense
unknown to reader); L5 *wedstrijd voor*; L6 *vertellen: dit zie ik*; L7 *excuus* → *smoes*. 8 notes.
Flags: R-CONJ-OTHER b039, R-TE-INF b047, R-PARTICIPLE b048, R-PARTICIPLE b046 (ignore level) — all
dismissed. **v2 confirms all 7 MF/SF as real and fixed.**

### Sonnet (verdict **accept**)

| Ref | Sev | Trial | Result |
|---|---|---|---|
| L1 b042 wish indicative | MF | — | **miss** |
| L2 b039 studeer het maar | MF | L3 (SF, "calque", fix *zoek het maar uit*) | found as SF |
| L3 Ze → Zijn ouders | SF | — | miss |
| L4 vertrok | SF | L1 (SF, same fix) | hit |
| L5 wedstrijd voor | SF | — | miss |
| L6 vertellen → zeggen | SF | — | miss |
| L7 excuus → smoes | SF | — | miss |
| L12 doctor, L14 genetische gloss, L15 beslist/filosoof | N | L6, L5, L7 | hit (notes) |

Trial-only: L2 *eerder* → *Eerst stuurden ze* (SF) — defensible as a note, not a stumble; final text kept
*eerder*. L4 *We weten het resultaat snel genoeg* "calque" (SF) — **over-flag**: Dutch present-for-future is
idiomatic, final kept it. L8 *hoogste rechter*, L9 b044 *moest* — notes, no change asked (fine).
Trial MF issued: none. Flags: 3/3 table flags dismissed, reasons agree; ignore-level b046 not adjudicated.

Fix round on Sonnet's findings: verdict *accept*, no MF, and the reference meaning review for this scene has
only SF → **no fix round at all**. v2 would be v1: Petunia's wish still reads as a statement of fact and
*studeer het maar* stays. **Worse.**

### Gemini (verdict **fix**)

| Ref | Sev | Trial | Result |
|---|---|---|---|
| L1 b042 wish indicative | MF | L1 (MF, identical fix with *moet*) | **hit** |
| L2 b039 studeer het maar | MF | — | **miss** |
| L3, L4, L5, L6 | SF | — | miss ×4 |
| L7 excuus → smoes | SF | L3 (MF, cites glossary — leak) | hit, inflated to MF |
| L14 genetische gloss | N (v2: SF) | L4 (SF) | hit, matches v2 state (leak) |
| L12 doctor, L15 beslist/filosoof | N | L7, L8 | hit (notes) |

Trial-only MF: L2 b046 *de trap nam* "means choosing stairs over a lift" — **over-flag**, false claim about
Dutch; *de trap nemen* is ordinary and the final kept it. Trial-only SF: L5 replace the b039 question–answer
rhythm with three *als*-clauses — **over-flag**; the Q&A pattern is the translator's deliberate device and the
proposed version is heavier. L6 *afwijzend* filed as `grammar:R-PARTICIPLE` — **over-flag / mis-category**;
lexicon adjective (A2), translator's note already covers it, reference found no stumble.
Flags: 3/3 dismissed, reasons agree.

Fix round on Gemini's findings: b042 wish fixed (good), *smoes* (good), *genetische* gloss dropped (good,
= ref v2 L1). But *studeer het maar* stays, as do *vertrok*, *wedstrijd voor*, *vertellen*, *Ze*; and the
translator would be told to rewrite b039 into *als*-clauses, change b046 and gloss *afwijzend*. **Worse** than
the reference v2 (one MF missed, four SF missed, two harmful edits), but a real round would have happened.

---

## Pair 2 — ch001/s03, language

Reference: verdict **fix**. MF: L1 b086 *schutting* → *hek*. SF: L2 *genetische* gloss; L3 b052 *Ze* → *Die*;
L4 b085 simile detached; L5 *af en toe de oppas*; L6 b073 heavy sentence; L7 *Toen* chain; L8 b065 question +
self-answer; L9 *de brief* ×3. 11 notes. Flags: R-DAT b065 (bible chunk), R-ZOU, R-PASSIVE, R-LATEN ×2,
R-PARTICIPLE — all dismissed. **v2 confirms MF + all 8 SF as fixed.**

### Sonnet (verdict **fix**)

| Ref | Sev | Trial | Result |
|---|---|---|---|
| L1 schutting → hek | MF | — | **miss** |
| L2 genetische gloss | SF | L6 (SF) | hit |
| L3 Ze → Die | SF | — | miss |
| L4 b085 simile | SF | — | miss |
| L5 af en toe de oppas | SF | — | miss |
| L6 b073 heavy | SF | L4 (SF, same split; also changes *wilde … uitsteken* → *stak … uit*) | hit |
| L7 Toen chain | SF | — | miss |
| L8 b065 self-answer | SF | L13 (N, concludes "keep current form") | found, downgraded, opposite advice |
| L9 de brief ×3 | SF | — | miss |
| L13 verbond zichzelf met | N (declined in v2) | **L1 (MF)** | found, inflated N → MF |
| L15 grafiet/zakmes, L17 weerlegging, L18 hypothese, L20 huidig | N | L8/L9, L11, L7, L10 | hit (notes) |

Trial-only MF: L1 b075 *verbond zichzelf met* — reference had it as an optional note; translator declined,
v2 accepted; Sonnet's replacements (*hoorde hij zelf bij zulke mensen*, *deed hij mee met zoiets*) shift the
meaning. **Over-flag.** Trial-only SF: L2 drop *grafiet* as a "cluster" (checker reported no cluster; reference
calls it a cognate) — over-flag, loses a detail. L3 split b049 (checker load 0; reference explicitly
"acceptable") — unnecessary. L5 *Dat helpt ons zeer* → *Dat is een grote hulp* — plausible note, over-flag as
SF; final kept it. Flags: 3/3 dismissed, agree (R-DAT reason cites the later whitelist — leak).

Fix round on Sonnet's findings: b073 split and *genetische* gloss land; b075 gets a meaning-shifting rewrite,
*grafiet* disappears, b049 is split for nothing. *schutting* (MF), *Ze*, the simile, *af en toe de oppas*, the
*Toen* chain and *de brief* ×3 all survive. **Worse.**

### Gemini (verdict **fix**)

| Ref | Sev | Trial | Result |
|---|---|---|---|
| L1 schutting → hek | MF | L2 (MF, cites bible *het hek* — leak) | **hit** |
| L2 genetische gloss | SF | L4 (SF) | hit |
| L3 Ze → Die | SF | L6 (SF, cites bible — leak) | hit |
| L4, L5, L6, L7, L8, L9 | SF | — | miss ×6 |
| L13 verbond | N | part of L1 (MF) | inflated |
| L15 grafiet/zakmes/initials | N | L8 | hit |
| L18 hypothese gloss | N (policy conflict) | L3 (SF) | matches v3 outcome (cohesion dropped it) |

Trial-only MF: L1 b075 bundles three claims — *Stel:* + imperfectum "unidiomatic" (wrong: it is the
translator's house conditional, also in b049), *zelfs … alleen maar* "reverses the scale" (wrong: test is
the far end, watching the lesser, as in EN), *verbond* calque (reference note). Proposed fix adds *die onzin*.
**Over-flag.** Trial-only SF: L5 *meneer* → *de heer~H.~Potter* — **real**, applied in v3 by the cohesion
editor (leak: glossary entry post-dates v1). L7 gloss/replace *eigenaardige* — over-flag; B1 inside budget,
reference L20 says fine, final kept it. Flags: 3/3 dismissed, agree.

Fix round on Gemini's findings: *hek*, *genetische*, *Die*, *de heer*, *hypothese* gloss all land (the last two
only reached the text in v3 in the real run). b075 gets a damaging rewrite. Six SF missed, including the
heavy b073, *af en toe de oppas*, the *Toen* chain (the b085 simile would still be caught by the meaning
reviewer). **Slightly worse** than the reference v2; clearly the best trial of the four language runs.

---

## Pair 3 — ch001/s03, meaning (Sonnet only)

Reference: verdict **accept**, no MF. SF: M1 b085 simile detached; M2 b077 *maar dat maakt niet uit*
(over-explaining). N: M3 *niet eens*, M4 *Zo kon haar familie zien*, M5 *als hij het zo bekeek*, M6 *keek over*.
**v2: M1, M2 fixed; M3, M6 applied; M4, M5 declined with accepted reasons.**

Sonnet (verdict **fix**):

| Ref | Sev | Trial | Result |
|---|---|---|---|
| M1 b085 simile | SF | M6 (MF; fix *als iemand die zich brandt* is a relative clause, R-RELCL) | hit, inflated, fix off-profile |
| M2 b077 over-explaining | SF | — | **miss** |
| M4 Zo kon haar familie zien | N | M2 (N) | hit |
| M6 keek over / grizzled | N | M7 (N, adds *hek* per bible — leak) | hit |
| M3 niet eens, M5 als hij het zo bekeek | N | — | miss |

Trial-only: M4 b070 *Zo liet hij zijn slimheid zien* "flattened to a neutral statement" (SF) — **over-flag**:
*liet … zien* already states the display; proposed fix adds a *hoe*-clause and a three-verb cluster.
M1 *meneer* → *de heer* (N) — real (v3), leak. M3 *onder de brief* added placement (N) — fair, minor.
M5 *Dan zien we wel* (N) — harmless. Comprehension: 5 questions, all answerable (reference: 7).

Fix round on Sonnet's findings: b085 fixed (as in the real v2), b070 made heavier for no gain, b077 left
over-explained. **Slightly worse**; no catastrophic miss, but the one MF it issued was a SF with an
off-profile fix.

---

## Pair 4 — ch905/s02, meaning (Sonnet only)

Reference: verdict **fix**. MF: M1 b030 *Dan moet je een god zijn* — generic *je* breaks the address so
McGonagall's reply has no anchor (speaker). N: M2 *kattenbrein*, M3 *één universum*, M4 added *mensen*,
M5 *moest eigenlijk*. **v2: M1 fixed; M2, M3 applied; M4 declined; M5 carried as bible note.** The reference
language review for this scene was *accept* (SF only), so **the round happened because of M1**.

Sonnet (verdict **accept**):

| Ref | Sev | Trial | Result |
|---|---|---|---|
| M1 je → u | **MF** | M5 (**N**, "Optional") — problem statement correct, severity wrong | found, downgraded two levels |
| M2 kattenbrein | N | M4 (N) | hit |
| M3 één universum | N | — | miss |
| M4 mensen | N | — | miss |
| M5 moest eigenlijk | N (accept, house pattern) | M2 (SF, wants *had moeten* — R-VERB-CHAIN) | inflated, fix off-profile |

Trial-only SF: M1 *scherpe* / *hard* intensifiers — over-flag (a twinge is a short sharp pain; "landed hard" is
in the EN). M3 *trokken* vs *trilden* breaks the "twitching harder now" callback — **real, reference missed
it** (minor, N/SF). M7 b032 *Ze* switches referent — real; the reference *language* review had it (L3 SF) and
v2 fixed it. M8 *tot zover dat alles* — real; reference language note L13, fixed in v2. M6 *langzaam* added
(N) — fair. Comprehension: 5/5 answerable; its own Q4 answer silently resolves *je* to McGonagall.

Fix round on Sonnet's findings: verdict *accept*, no MF → **no round**. v2 = v1 with the speaker error intact
and every language SF (frame, *het*/*die*, *Ze*, glosses, *wazig*) unapplied. **Worse.** Had a round happened
anyway, its SF list would have added two good edits (*trillen* alignment, *De wetten*) and one restricted
construction the translator would have had to refuse.

---

## Flag decisions (language role)

All three trial runs agree with the reference on every flag in the `*.checks.md` table (s02: 3/3, s03: 3/3,
both models), with equivalent reasons. Neither trial adjudicated the ignore-level flags the reference added
(s02: *geruststellende*; s03: R-LATEN ×2, *verbaasde*). No disagreement on any confirmed/dismissed call.

## must_fix recall / precision

Recall = reference MF found **as MF** (in brackets: found at any severity). Precision = trial MF that was a
reference MF (in brackets: that was a real problem at any reference severity, confirmed in v2/v3).

| Model | Role | Ref MF | Recall | Trial MF | Precision | Over-flags at MF |
|---|---|---|---|---|---|---|
| Sonnet | language (s02, s03) | 3 | **0/3** (1/3) | 1 | 0/1 (0/1) | *verbond* (declined note) |
| Sonnet | meaning (s03, 905) | 1 | **0/1** (1/1) | 1 | 0/1 (1/1) | — (b085 was SF) |
| **Sonnet total** | | 4 | **0/4** (2/4) | 2 | **0/2** (1/2) | |
| Gemini | language (s02, s03) | 3 | **2/3** (2/3) | 5 | **2/5** (3/5) | *de trap nam*, b075 *Stel* |

should_fix overlap (any severity): Sonnet lang s02 2/5, s03 3/8; Gemini lang s02 1/5, s03 2/8; Sonnet
meaning s03 1/2, 905 n/a (ref 0 SF; 3 of Sonnet's 5 SF were real, two of them from the language side).

## Verdicts

**Sonnet, language reviewer — do not delegate.** It found none of the three reference must_fix at must_fix
severity and two of them not at all (Petunia's indicative wish, *schutting*); on s02 it returned *accept*,
which would have cancelled the fix round. Its one must_fix was a note the translator had already declined
with reason. What it does well — flag adjudication, gloss hygiene, lexicon notes — is the part the tooling
already half-does; the part the pipeline needs from this role (the native-speaker stumble: *studeer het maar*,
*af en toe de oppas*, *Ze* for *de zekerheid*, the *Toen* chain) is exactly what it does not hear. A spot
check could not rescue it because the misses are absent from its output, not misgraded.

**Gemini, language reviewer — delegate with a strong-model spot check.** Two of three must_fix found with
the same fix as the reference, a real *fix* verdict both times, flag decisions all correct, and two items
that only reached the text in v3 (*de heer*, *hypothese* gloss) — though both lean on memory written after the
reference ran. Against that: 40 % must_fix precision, with over-flags (*de trap nemen*, the *Stel:* conditional,
*als*-clauses for the Q&A rhythm) that would have pushed the translator into harmful edits, a missed must_fix
(*studeer het maar*) and three quarters of the should_fix naturalness items missed. The spot check must do two
things: veto the must_fix list before the fix round (cheap, the findings are there), and read the Dutch once
for stumbles (cheap, no JSON) — not re-review the flags, which it gets right.

**Sonnet, meaning reviewer — delegate with a strong-model spot check, and never let its verdict gate the
round alone.** Every real problem the reference raised was in its output, including the ch905 speaker error
and the s03 simile; the failure is severity calibration in both directions — the one must_fix in the set was
filed as an "Optional" note (so verdict *accept*, no round), while a should_fix became must_fix with an
off-profile fix and an accepted house pattern (*moest eigenlijk*) became should_fix with a restricted
construction. It also surfaced three real detail items the reference meaning review did not list (the
*trillen* callback, the *Ze* referent, *tot zover*). Because the misses are present-but-misgraded, a strong
model re-grading the finding list against the EN/NL (one short pass, no new questions) recovers the gate
decision; without that pass the ch905 round would not have happened.
