# ch001 s04 — blind comparison of three first drafts

Scene: back garden, Mrs Figg at the fence, b087–b096 (142 EN words).
Versions: **A** `work/ch001/scenes/s04.v1.nl.md` · **B** `experiments/delegation/s04.v1.nl.sonnet.md` · **C** `experiments/delegation/s04.v1.nl.gpt.md`.
Judged against `s04.src.json`, the two reviewer prompts, `restricted.md` and the ch‑1 bible sections only. No review files consulted.

All three keep every macro (`\emph{hebt}`, `\emph{Wat}`, `mevrouw~Figg`), the three glosses, the bare final *Wat.*, *je/lieverd/Och, arme jongen!* for Mrs Figg, and contain no restricted construction (A‑AANHET, colon template, presentational *er* are all allowed). The differences are in naturalness and in small meaning/voice drift.

## Per-block table

| block | A | B | C |
|---|---|---|---|
| b087 “Nothing … strangled voice … Just—testing a really silly theory—” | **ok** — *met verstikte stem* (idiomatic, no article); *Gewoon—een heel domme theorie aan het testen—* keeps the subjectless fragment | **ok/minor** — *met een verstikte stem* (article is unidiomatic); *Alleen—een heel stomme theorie testen—* fine, *stomme* good for a ten-year-old | **minor** — *hypothese* for “theory” (author wrote *theory*; *theorie* is A2); *Ik—test alleen maar …* turns the fragment into a full clause |
| b088 “Did you get your acceptance letter…” | **ok** | **ok** (identical) | **ok** (identical) |
| b089 “Harry froze in place.” | **ok** — *Harry bleef doodstil staan.* A2, natural | **problem** — *verstijfde* unknown (not in lexicon) + *op zijn plek* calques “in place” | **minor** — *Harry verstijfde.* best rhythm, but *verstijven* is unknown with a plain equivalent |
| b090 “Yes,” … “They say they want my owl by the 31st of July, but—” | **minor** — *Ze willen mijn uil voor 31 juli, zeggen ze* natural; *voor* lacks the bible's accent (*vóór*), ambiguous for/before | **ok/minor** — *Ze zeggen: ze willen mijn uil vóór 31 juli* — colon template is a bit bookish in speech; accent kept | **minor** — *Ze willen mijn uil vóór 31 juli* drops “They say” (attribution lost); *even later* ok |
| b091 “But you don't *have* an owl. Poor dear! I can't imagine *what* someone must have been thinking, sending you just the standard letter.” | **minor** — *Wat dachten ze toch?* is perfect clucking; but *Jou alleen maar de gewone brief sturen!* adds an exclamation the source lacks (bible: full sentence, full stop) | **problem** — *Wat dacht iemand wel?* is not Dutch anyone says; *Ze stuurden je alleen de gewone brief.* matches the bible exactly | **problem** — “I can't imagine” dropped; *Wat dacht die persoon wel?* stilted, definite where EN is indefinite, then plural *Ze stuurden* — referent mismatch |
| b092 “A wrinkled arm stretched out over the fence, and opened an expectant hand. Hardly even thinking…, Harry gave over his envelope.” | **ok/minor** — *een hand ging open en wachtte* keeps the gesture; *Een arm vol rimpels* a slightly literary detour (*gerimpelde* is A2 known); *gaf … af* good for “gave over” | **problem** — *Hij gaf zijn envelop.* incomplete (*geven* needs recipient or *af*); *opende een hand* calque; *Die hand wachtte.* ok | **ok/minor** — *stak een open hand uit*, *De hand wachtte.*, *gaf haar zijn envelop* all natural; *bijna helemaal niet meer na* wordy |
| b093 “Just leave it to me, dear … in a jiffy or two I'll have someone over.” | **ok** — *in een wip heb ik hier iemand* keeps her agency, idiomatic | **ok** — *heb ik iemand hier* (same, marginally less fluent order) | **minor** — *dan komt er in een wip iemand langs* reads well but makes it impersonal (“someone will come by”); gloss splits the idiom: `in \gl{een wip}{in a jiffy}` |
| b094 “And her face disappeared from over the fence.” | **ok** — *En haar gezicht verdween achter het hek.* | **minor** — *verdween van boven het hek* calques “from over”; Dutch says *achter het hek* | **minor** — *Toen verdween …* replaces “And” and collides with *Toen zei …* in b096 |
| b095 “There was a long silence in the garden.” | **ok/minor** — *Er was een lange stilte* correct but flat; idiom is *Er viel* | **ok** — *Er viel een lange stilte in de tuin.* best of the three | **ok** — *Het bleef lang stil in de tuin.* natural, A1 words |
| b096 “Then a boy's voice said, calmly and quietly, ‘What.’” | **ok** — *Toen zei een jongensstem, kalm en zacht: “Wat.”* | **ok** (identical to A) | **ok/minor** — commas dropped (*rustig en zacht*), loses the measured pause; *rustig* ≈ *zacht*, *kalm* is closer; second *Toen* in a row |

Tally — A: 0 problem / 4 minor · B: 3 problem / 3 minor · C: 1 problem / 6 minor.

## Findings per version (findings-schema semantics)

### A — `s04.v1.nl.md`

| id | block | severity | category | fragment → problem → fix |
|---|---|---|---|---|
| A1 | b091 | should_fix | voice | *Jou alleen maar de gewone brief sturen!* — the source has one exclamation (“Poor dear!”); A adds a second. Bible: Mrs Figg “tut-tuts in full sentences with full stops” (*Ze stuurden jou alleen maar de gewone brief.*). Fix: use that full sentence. |
| A2 | b090 | note | detail | *voor 31 juli* — without the accent *voor* reads for/before; bible decision is *vóór 31 juli*. |
| A3 | b092 | note | naturalness | *Een arm vol rimpels* — understandable but a detour; *Een gerimpelde arm* is A2 in the lexicon and plainer. |
| A4 | b095 | note | naturalness | *Er was een lange stilte* — correct; *Er viel een lange stilte* is the idiom (B has it). |
| A5 | b091 | note | detail | “someone” → *ze* (Hogwarts). Acceptable generalisation; A's own note explains it. |

0 must_fix · 1 should_fix · 4 note.

### B — `s04.v1.nl.sonnet.md`

| id | block | severity | category | fragment → problem → fix |
|---|---|---|---|---|
| B1 | b092 | must_fix | naturalness | *Hij gaf zijn envelop.* — *geven* without recipient or particle is incomplete; a Dutch reader stops. Fix: *Hij gaf haar zijn envelop.* or *Hij gaf zijn envelop af.* |
| B2 | b091 | must_fix | naturalness | *Wat dacht iemand wel?* — the indignant *wat dacht X wel* needs a definite subject; with *iemand* it is unidiomatic. Fix: *Wat dachten ze toch?* / *Wat dachten ze wel niet?* |
| B3 | b089 | must_fix | vocab:unknown + calque | *Harry verstijfde op zijn plek.* — *verstijven* is not in the lexicon and has a plain equivalent; *op zijn plek* copies “in place” and is redundant in Dutch. Fix: *Harry bleef doodstil staan.* |
| B4 | b094 | should_fix | calque | *verdween van boven het hek* — “from over the fence” word for word; Dutch: *verdween achter het hek*. |
| B5 | b092 | should_fix | calque | *Een rimpelige arm … opende een hand* — an arm “opening a hand” is EN syntax; *en een hand ging open* / *deed een hand open*. |
| B6 | b090 | note | naturalness | *Ze zeggen: ze willen mijn uil vóór 31 juli* — the colon template is legal but stiff in a boy's mouth; the parenthetical *…, zeggen ze,* (A) is how people talk. |
| B7 | b087 | note | naturalness | *met een verstikte stem* — the collocation is *met verstikte stem* (no article). |

3 must_fix · 2 should_fix · 2 note. All must_fixes are single-phrase substitutions; nothing structural.

### C — `s04.v1.nl.gpt.md`

| id | block | severity | category | fragment → problem → fix |
|---|---|---|---|---|
| C1 | b091 | must_fix | naturalness + detail | *\emph{Wat} dacht die persoon wel? Ze stuurden jou …* — *die persoon* is stilted and definite (EN: indefinite “someone”), and the singular is followed by plural *Ze*; the reader stumbles on the switch. Fix: *Wat dachten ze toch? Ze stuurden jou alleen maar de gewone brief.* |
| C2 | b089 | must_fix | vocab:unknown | *Harry verstijfde.* — best rhythm of the three, but *verstijven* is unknown with a plain A2 equivalent → by the language rules a must_fix. Fix: *Harry bleef doodstil staan.* (or get *verstijven* added to the lexicon). |
| C3 | b091 | should_fix | omission / voice | “I can't imagine” has no counterpart — Mrs Figg's clucking loses a beat; the two emphases survive but her incredulity is now only the question. Fix: add *Ik kan het me niet voorstellen.* before the question. |
| C4 | b090 | should_fix | certainty / omission | *Ze willen mijn uil vóór 31 juli* — “They say” dropped; Harry reports what the letter says, he does not assert it. Fix: *…, zeggen ze, maar—*. |
| C5 | b093 | should_fix | intent / voice | *dan komt er in een wip iemand langs* — “I'll have someone over” is Mrs Figg arranging it; C makes it impersonal. Fix: *en in een wip heb ik hier iemand.* |
| C6 | b093 | should_fix | gloss | `in \gl{een wip}{in a jiffy}` — gloss splits the idiom; glossed text *een wip* ≠ gloss *in a jiffy*, and *wip* alone has an unwanted colloquial sense. Fix: `\gl{in een wip}{in a jiffy}`. |
| C7 | b094 + b096 | should_fix | voice / transition | *Toen verdween haar gezicht …* / *Toen zei een jongensstem …* — the source's “And … Then …” becomes *Toen … Toen …*; the dry “And” is the narrator's beat before the silence. Fix: *En haar gezicht verdween achter het hek.* |
| C8 | b087 | should_fix | detail / voice | *een heel domme hypothese* — the author wrote “theory”; importing Harry's refrain word where he did not use it is an addition, and *theorie* is A2. *Ik—test alleen maar …* also turns the strangled fragment into a full clause. Fix: *Gewoon—een heel domme theorie aan het testen—* or similar fragment. |
| C9 | b096 | note | voice | *rustig en zacht* without commas — the source's commas are the pause before *Wat.*; *kalm* is closer to “calmly” than *rustig*. |
| C10 | b092 | note | load | *bijna helemaal niet meer na* — wordy; *nauwelijks nog na*. |

2 must_fix · 6 should_fix · 2 note. The must_fixes are local; the should_fixes are a pattern: C smooths the English into fluent Dutch and in doing so drops hedges, agency and the narrator's connectives.

## Comprehension check (from the Dutch alone)

| question | A | B | C |
|---|---|---|---|
| Does Harry have an owl? | no | no | no |
| What does the letter demand, and by when? | his owl, before 31 July (said to be what *they* say) | same, with attribution | his owl before 31 July — attribution gone |
| Who ends up with the envelope, and did Harry decide to give it? | Mrs Figg; barely thinking | Mrs Figg; barely thinking (sentence broken) | Mrs Figg; barely thinking |
| What does Mrs Figg promise? | she will have someone there very soon | same | someone will come by very soon (not: she arranges it) |
| What is the final line and its tone? | *Wat.*, calm and quiet | same | *Wat.*, calm and quiet (pause lost) |

Nothing is unanswerable in any version; C answers two questions less exactly.

## Verdict

- **Publishable after the normal loop?** **B: yes.** Its three must_fixes (*gaf zijn envelop*, *dacht iemand wel*, *verstijfde op zijn plek*) are one-phrase substitutions a language reviewer will certainly catch; after one fix round B would be indistinguishable in quality from A. **C: yes, with a caveat.** Its must_fixes are also local, but its real cost is the six should_fixes — dropped “They say” and “I can't imagine”, Mrs Figg losing her agency, *Toen … Toen*, *hypothese* for *theory*. A meaning reviewer should catch C3–C5; C7–C8 are the kind of drift that gets filed as notes and survives into the final text.
- **Would a reader of this edition tell them apart from A?** Four of ten blocks are identical or near-identical across all three. A learner would not tell a reviewed B from A. A reviewed C would still read slightly differently — a shade smoother and flatter: a less fussy Mrs Figg, a narrator who says *Toen* twice and skips the comma-pause before *Wat.* An attentive bilingual reader would notice; the target reader would not.
- **Best?** **A**, as a first draft: 0 must_fix, the most natural Dutch in the hard spots (*bleef doodstil staan*, *Wat dachten ze toch?*, *in een wip heb ik hier iemand*), and no meaning drift; its only voice slip is the extra exclamation in b091. B contributes the best single sentence (*Er viel een lange stilte in de tuin.*) and the bible-exact *Ze stuurden je alleen de gewone brief.* C contributes the best b089 rhythm (*Harry verstijfde.*) and a good b095, but is the version a careful editor would trust least to keep what the author hedged.
