# Allowed grammar (A2+ reader profile)

Source: `book/pipeline/grammar.md` (Russian original). This is the machine-facing version
used by `nl-translator` and `nl-language-reviewer`. Every construction below is
**allowed and encouraged**. Do not simplify it only because some course lists it
as B1. Diminutives, particles (`wel`, `toch`, `even`, `maar`, `eens`, `hoor`, `nou`)
and compound nouns are **lexical**, not grammatical, questions: keep them when
the word is in the lexicon, treat them under vocabulary rules otherwise.

Each item has an id used in reviewer findings (`A-...`).

## Nouns and modifiers

| id | construction | example |
|---|---|---|
| A-ART | `de`, `het`, `een`, bare noun | `het boek`, `een kat`, `water` |
| A-PLUR | singular / plural | `de boeken`, `de kinderen`, `de auto's` |
| A-ADJ-E | adjective with / without `-e` | `een groot huis`, `het grote huis`, `de grote man` |
| A-COMP | comparative, superlative, irregular forms | `groter`, `het grootst`, `beter`, `meer`, `minder`, `liefst` |
| A-CMP-DAN | comparisons `dan`, `even … als`, `net zo … als` | `Harry is slimmer dan Draco.` / `Zij is net zo boos als hij.` |
| A-NUM | cardinal, ordinal numbers, dates, clock time, measures | `elf jaar`, `de eerste brief`, `om acht uur`, `drie meter`, `een kilo` |

## Pronouns

| id | construction | example |
|---|---|---|
| A-PRON | subject and object pronouns, full and reduced forms | `jij/je`, `mij/me`, `zij/ze`, `hem`, `haar`, `het` |
| A-POSS | possessives before a noun | `mijn boek`, `zijn vader`, `hun huis` |
| A-DEM | `dit/dat/deze/die` before a noun and standalone | `Dat boek is oud.` / `Dat is waar.` / `Die wil ik.` |
| A-DIT-IS | `dit/dat is`, `dit/dat zijn` with plural | `Dat zijn mijn ouders.` |
| A-REFL | reflexive pronouns and verbs | `Hij voelt zich slecht.` / `Ze herinnert zich de brief.` |
| A-ELKAAR | `elkaar` | `Ze kijken elkaar aan.` |
| A-INDEF | `iemand, niemand, iets, niets, iedereen, alles` | `Niemand zei iets.` |

## Verbs

| id | construction | example |
|---|---|---|
| A-PRES | present tense, regular and common irregular | `hij loopt`, `zij heeft`, `wij zijn`, `jij kunt` |
| A-HEBBEN-ZIJN | `hebben`, `zijn` | — |
| A-PERF | perfectum incl. `hebben/zijn` choice, irregular participles | `Hij is gekomen.` / `Ze heeft het boek gelezen.` |
| A-IMPERF | imperfectum incl. irregular and modal verbs | `Hij liep.` / `Ze kon het niet.` / `Ze wilden gaan.` |
| A-TENSE-MIX | normal alternation perfectum / imperfectum by sense | narration in imperfectum, result or dialogue in perfectum |
| A-SEP | separable and inseparable verbs | `Hij staat op.` / `Ze belde haar moeder op.` / `Hij vertelde het.` |
| A-MODAL | `kunnen, mogen, moeten, willen, zullen` + infinitive | `Je mag niet schreeuwen.` / `Ik moet gaan.` |
| A-FUT | future via present, `gaan`, `zullen` | `Morgen komt de brief.` / `Ik ga het proberen.` / `Het zal regenen.` |
| A-ZULLEN | `zullen` for offer, promise, assumption, incl. `wel` | `Zal ik helpen?` / `Dat zal wel.` / `Hij zal wel moe zijn.` |
| A-IMP | imperative | `Kom hier.` / `Luister.` / `Doe dat niet.` |
| A-AANHET | `zijn aan het` + infinitive | `Ze is aan het lezen.` |
| A-POSTURE | posture verbs `staan, liggen, zitten, hangen` as plain verbs | `Het boek ligt op tafel.` / `De jas hangt aan de deur.` |
| A-ZOU-POLITE | fixed polite `zou` formulas only | `Ik zou graag een thee.` / `Zou u me helpen?` / `Zou je dat willen doen?` — **not** hypotheticals (see `R-ZOU`) |

## Clause structure

| id | construction | example |
|---|---|---|
| A-SVO | main-clause word order | `Harry leest een boek.` |
| A-INV | inversion after a fronted element | `Gisteren kwam de brief.` / `Daarom ging hij weg.` |
| A-Q | yes/no questions and wh-questions | `Kom je?` / `Waarom lach je?` / `Wat is dat?` |
| A-FRAME | verbal frame; separable prefix / participle / infinitive at the end | `Hij belde zijn moeder meteen op.` / `Ze heeft de brief gisteren gelezen.` |
| A-NEG | negation with `niet` / `geen` and negative words | `Dat is niet waar.` / `Ik heb geen tijd.` / `Hij zei nooit iets.` |
| A-NEG-COMB | `nog niet`, `niet meer`, `nog geen`, `geen … meer` | `Hij slaapt niet meer.` / `Ik heb nog geen antwoord.` |
| A-PREP | prepositions and fixed prepositional combinations | `bang voor`, `blij met`, `wachten op`, `denken aan` |
| A-ADV | adverbs of time, place, frequency, degree | `nu`, `hier`, `altijd`, `soms`, `heel`, `erg`, `te`, `bijna` |
| A-LINK | `dan, daarna, daarom, dus` with inversion | `Dus ging hij naar binnen.` / `Daarna zei niemand iets.` |

## Joining clauses

| id | construction | example |
|---|---|---|
| A-COORD | `en, maar, of, want, dus` | `Hij lachte, maar zijn ogen waren koud.` / `Ze bleef, want ze was bang.` |
| A-SUB | subordinate clauses with `als, omdat, zodra, zodat, terwijl, hoewel, nadat, toen, voordat` | `Toen hij binnenkwam, werd het stil.` / `Ze zweeg, omdat ze bang was.` |
| A-SUB-VEND | finite verb at the end of the subordinate clause | `… omdat hij het boek niet las.` |
| A-SUB-FIRST | subordinate clause first, main clause with inversion | `Als je wilt, kun je gaan.` |
| A-SUB-2V | two verbs at the end of a subordinate clause: modal + inf, aux + participle | `… omdat hij niet kon slapen.` / `… toen ze de brief had gelezen.` |

Note on `A-SUB-2V`: `had gelezen` inside a `toen/nadat` clause is a verb cluster of
two verbs. It is **allowed by this row**, even though plusquamperfectum is restricted
in main clauses (`R-PLUPERF`). Prefer imperfectum when the sequence of events is
clear without it.

## `er`

| id | construction | example |
|---|---|---|
| A-ER-NEW | presentational `er` introducing a new entity | `Er ligt een brief op tafel.` / `Er was eens een jongen.` |
| A-ER-PLACE | locative `er` for a place already named | `Ik woon er al jaren.` |
| A-DAAR | corresponding use of `daar` | `Daar woont hij.` |

## Sentence load (how much of the allowed grammar may stack)

Allowed constructions may combine, but each sentence stays light. The reviewer
checks these as `L-...` findings; the exact numbers live in `thresholds.yaml`.

| id | rule |
|---|---|
| L-LEN | prefer ≤ 20 words; > 28 words is a finding |
| L-SUB | at most one subordinate clause per sentence |
| L-NEST | no subordinate clause inside another subordinate clause |
| L-VERBS | at most three finite verbs per sentence (main + coordination + one subordinate) |
| L-FRAME | the verbal frame should not hold more than ~8 words between its two parts |
| L-COORD | avoid chains of three or more clauses joined by `en … en … maar` |

When a sentence is formally legal but heavy, split it. Short sentences are a
feature of this edition, not a defect; keep rhythm by varying length, not by
nesting.
