# Restricted grammar and how to rewrite it

Source: `book/pipeline/grammar.md`, section 4. Constructions below are **outside the
reader profile**. The translator avoids them; `grammar_check.py` flags suspected
occurrences with an id (`R-...`) and a confidence; `nl-reviewer`
confirms or dismisses each `likely` flag and asks for a rewrite using one of the
templates. Templates are starting points — pick the one that keeps the meaning,
the tone and the information order of the original.

General rewrite moves, in order of preference:

1. **Split** into two main clauses (`.` or `;` or `:`), keeping the original order.
2. **Coordinate** with `en / maar / want / dus` instead of subordinating.
3. **Front** the element the original stresses, then use inversion.
4. **Use an allowed subordinator** (`omdat, toen, als, terwijl, zodat, hoewel, nadat, voordat, zodra`) if a single subordinate clause expresses the link.
5. **Direct speech or thought with a colon** instead of reported clauses.
6. Only if nothing else works: keep the construction and record it as an unresolved conflict in the report.

---

## R-RELCL — relative clauses

`die/dat`, `waar`, `wat`, `waarmee`, `waarin`, `waarop`, `met wie`, `van wie`, …

Recognize: a clause that modifies a noun and starts with a relative word; verb at the end.
Trap: standalone demonstrative `die/dat` is **allowed** (`Die wil ik.`, `Dat is waar.`).

| original pattern | rewrite |
|---|---|
| `de man die bij de deur stond` | `Bij de deur stond een man. Hij …` / `De man bij de deur …` |
| `het boek dat ze gisteren las` | `Ze las gisteren een boek. Dat boek …` / `het boek van gisteren` |
| `het huis waarin hij woonde` | `Hij woonde in een huis. Het huis …` / `zijn huis` |
| `alles wat hij zei` | `Hij zei veel dingen. Alles was …` / `al zijn woorden` |
| `de vrouw met wie hij sprak` | `Hij sprak met een vrouw. Zij …` |

Prefer a prepositional phrase or an adjective when it carries the same restriction
(`de brief op tafel`, `de oude man`). Reduced relatives are also out (`R-PARTICIPLE`).

## R-PASSIVE — passive with `worden` / `zijn`

Recognize: `worden` + participle, or `zijn` + participle with a clear agent/event reading
(`is gebouwd`, `werd gezegd`, `wordt gedaan`).
Trap: `zijn` + adjective-like participle expressing a **state** is often fine
(`De deur is open.`, `Hij was verbaasd.`, `Het is kapot.`). `zijn + adjective` is never passive.

| original pattern | rewrite |
|---|---|
| `De deur werd geopend.` | `Iemand opende de deur.` / `De deur ging open.` |
| `Er werd gelachen.` | `Mensen lachten.` / `Iedereen lachte.` |
| `Hij werd naar huis gestuurd.` | `Ze stuurden hem naar huis.` |
| `Het huis is in 1900 gebouwd.` | `Het huis is uit 1900.` / `Ze bouwden het huis in 1900.` |
| `Dat wordt niet gedaan.` | `Dat doet niemand.` / `Dat mag niet.` |

Use `ze`, `men`-free generic subjects (`mensen`, `iedereen`, `iemand`), or the natural agent from context.

## R-PLUPERF — plusquamperfectum in main clauses

Recognize: `had/hadden/was/waren` + participle as the main verb of a main clause.
Allowed exception: inside a `toen/nadat/voordat` clause as the two-verb cluster (`A-SUB-2V`).

| original pattern | rewrite |
|---|---|
| `Hij had de brief al gelezen.` | `Hij las de brief al eerder.` / `De brief kende hij al.` |
| `Ze was te laat gekomen, dus …` | `Ze kwam te laat. Dus …` |
| `Hij had nooit gedacht dat …` | `Dat dacht hij nooit.` / `Nooit dacht hij: …` |

Signal anteriority with `al`, `eerder`, `daarvoor`, `net`, `toen … al`, or by telling
events in order.

## R-INDIRECT — extended indirect speech and indirect questions

Recognize: `zeggen/vragen/denken/weten/vertellen` + `dat`/`of`/wh-word clause,
especially chains of them, or tense-shifted reported speech.
Trap: `of` meaning *or* is allowed.

| original pattern | rewrite |
|---|---|
| `Hij zei dat hij moe was.` | `Hij zei: “Ik ben moe.”` / `“Ik ben moe,” zei hij.` |
| `Ze vroeg of hij kwam.` | `Ze vroeg: “Kom je?”` / `Ze vroeg het hem: kwam hij?` |
| `Hij wist niet waarom ze lachte.` | `Waarom lachte ze? Hij wist het niet.` / `Hij begreep haar lach niet.` |
| `Ze vertelde hem wat er gebeurd was.` | `Ze vertelde hem alles. Dit was er gebeurd: …` / `Ze vertelde hem het verhaal.` |

Keep who-said-what unambiguous. Narrator irony often sits in the reporting verb — keep that verb.

## R-DAT — complement clauses with `dat`

Recognize: `dat` introducing an object/subject clause after verbs, adjectives or nouns
(`denken dat`, `weten dat`, `bang zijn dat`, `het feit dat`, `zo … dat`).
Trap: demonstrative `dat` (`Dat is goed.`) is allowed. `zodat` is allowed (`A-SUB`).

| original pattern | rewrite |
|---|---|
| `Harry dacht dat het een grap was.` | `Harry dacht: dit is een grap.` / `Een grap, dacht Harry.` |
| `Ik weet dat je liegt.` | `Je liegt. Dat weet ik.` / `Ik weet het: je liegt.` |
| `Ze was bang dat hij boos werd.` | `Ze was bang. Misschien werd hij boos.` / `Ze was bang voor zijn boosheid.` |
| `Het probleem is dat we geen tijd hebben.` | `Het probleem: we hebben geen tijd.` / `We hebben geen tijd. Dat is het probleem.` |
| `Hij was zo moe dat hij in slaap viel.` | `Hij was heel moe. Hij viel in slaap.` / `Hij was zo moe. Dus viel hij in slaap.` |

The colon (`:`) is the main tool here — Dutch uses it naturally for thought and explanation.

## R-OF — complement clauses with `of` (whether)

Recognize: `of` after `vragen, weten, kijken, twijfelen, zien`, with verb-final order.
Trap: coordinating `of` (*or*) is allowed.

| original pattern | rewrite |
|---|---|
| `Hij vroeg zich af of het waar was.` | `Was het waar? Hij wist het niet.` / `Hij twijfelde: was het waar?` |
| `Kijk even of de deur dicht is.` | `Kijk even naar de deur. Is hij dicht?` / `Is de deur dicht? Kijk even.` |

## R-ZOU — conditional and hypothetical `zou/zouden`

Recognize: `zou(den)` + infinitive outside the fixed polite formulas in `A-ZOU-POLITE`;
`als … zou …`; `zou … hebben/zijn` + participle.

| original pattern | rewrite |
|---|---|
| `Als ik rijk was, zou ik reizen.` | `Ik ben niet rijk. Anders ging ik reizen.` / `Stel: ik ben rijk. Dan reis ik.` |
| `Dat zou een probleem zijn.` | `Dat is misschien een probleem.` / `Dat wordt een probleem.` |
| `Hij zou het nooit toegeven.` | `Hij geeft het nooit toe.` / `Nooit geeft hij dat toe.` |
| `Ze zouden morgen komen.` (reported future) | `Ze komen morgen.` (shift to present/`gaan`) |

Hypotheticals can often be rendered with present tense + `misschien / dan / stel`, or with
`willen` / `kunnen` in imperfectum (`wilde`, `kon`) when the meaning is wish or ability.

## R-IRREALIS-PAST — counterfactuals about the past

Recognize: `als … had(den) …, dan had/was …`, `zou hebben/zijn` + participle.

| original pattern | rewrite |
|---|---|
| `Als hij sneller was geweest, had hij gewonnen.` | `Hij was niet snel genoeg. Daarom verloor hij.` / `Sneller — en hij had gewonnen.` (only if `had gewonnen` is accepted as A-SUB-2V-like cluster; prefer the first) |
| `Ze zou het hebben gezien.` | `Ze zag het bijna.` / `Misschien zag ze het.` |

Pick the reading (regret, blame, near-miss) and state it plainly.

## R-ER-PREP — pronominal adverbs with `er` (and `daar`, `hier`, `waar`)

Recognize: `eraan, ermee, erop, erover, ervan, erin, daarmee, hiermee, waarmee`, split forms
(`Ik denk er niet aan.`).
Trap: `er` presentational and locative are allowed (`A-ER-NEW`, `A-ER-PLACE`). `daar` as a place is allowed.

| original pattern | rewrite |
|---|---|
| `Ik denk er niet aan.` | `Ik denk niet aan die brief.` (repeat the noun; `daar … aan` is still R) |
| `Hij was er blij mee.` | `Hij was blij met het cadeau.` |
| `Ze praatten erover.` | `Ze praatten over het plan.` |

Repeat the noun or use a short noun phrase. In dialogue, `Daar!` / `Dat!` as a standalone pointer is fine.

## R-ER-QUANT — quantitative `er`

Recognize: `er` + numeral/quantifier without a noun (`Ik heb er twee.`, `Er zijn er veel.`).

| original pattern | rewrite |
|---|---|
| `Ik heb er twee.` | `Ik heb twee boeken.` / `Twee.` (as an elliptical answer) |
| `Er waren er veel.` | `Er waren veel mensen.` |

## R-TE-INF — infinitive constructions with `te`

Recognize: `te` + infinitive, including `om … te`, `zonder te`, `in plaats van te`, `door te`,
and verbs taking `te` (`proberen te`, `beginnen te`, `hoeven te`, `vergeten te`, `besluiten te`).
Trap: modal + bare infinitive is allowed (`A-MODAL`); `gaan/komen/blijven` + bare infinitive is allowed.

| original pattern | rewrite |
|---|---|
| `Hij ging naar huis om te eten.` | `Hij ging naar huis. Hij wilde eten.` / `Hij ging naar huis voor het eten.` |
| `Ze probeerde te slapen.` | `Ze wilde slapen, maar het lukte niet.` / `Ze deed haar ogen dicht en wachtte op de slaap.` |
| `Hij begon te lachen.` | `Hij lachte.` / `Opeens lachte hij.` / `Hij moest lachen.` |
| `Je hoeft niet te komen.` | `Je moet niet komen.` (careful: meaning shift) → prefer `Kom maar niet. Het hoeft niet.` / `Het is niet nodig.` |
| `Zonder iets te zeggen liep hij weg.` | `Hij zei niets en liep weg.` / `Hij zei niets. Hij liep weg.` |
| `In plaats van te antwoorden, lachte ze.` | `Ze antwoordde niet. Ze lachte.` / `Ze gaf geen antwoord, maar lachte.` |
| `Door hard te werken slaagde hij.` | `Hij werkte hard. Daarom slaagde hij.` |
| `Het is moeilijk om dat te geloven.` | `Dat is moeilijk. Wie gelooft dat?` / `Dat gelooft bijna niemand.` |
| `Ze besloot te blijven.` | `Ze bleef. Dat was haar besluit.` / `Ze nam een besluit: ze bleef.` |

Very frequent chunks (`probeer te`, `hoeft niet te`) may later be whitelisted in
`exceptions.json` under `grammar_whitelist`; until then they are findings.

## R-POSTURE-TE — `zitten / staan / liggen / lopen te` + infinitive

Recognize: posture or motion verb + `te` + infinitive expressing ongoing action.
Trap: plain posture verbs are allowed (`A-POSTURE`); `zijn aan het` is allowed (`A-AANHET`).

| original pattern | rewrite |
|---|---|
| `Hij zat te lezen.` | `Hij zat en las.` / `Hij was aan het lezen.` / `Hij las.` |
| `Ze stond te wachten.` | `Ze stond bij de deur en wachtte.` / `Ze wachtte.` |
| `Hij liep te zingen.` | `Hij liep en zong.` / `Hij zong onder het lopen.` |

## R-LATEN — causative `laten`

Recognize: `laten` + infinitive (`laten zien`, `laten vallen`, `laten maken`, `laat me gaan`).
Note: `laten zien` and `laten vallen` are extremely frequent lexicalised chunks; decide once in
`exceptions.json` → `grammar_whitelist` whether they count as vocabulary.

| original pattern | rewrite |
|---|---|
| `Hij liet haar de brief zien.` | `Hij gaf haar de brief.` / `Hij toonde haar de brief.` (if `tonen` is known) / `“Kijk,” zei hij, en hij hield de brief omhoog.` |
| `Ze liet het boek vallen.` | `Het boek viel uit haar handen.` |
| `Laat me gaan.` | `Ik wil gaan.` / `Houd me niet tegen.` |
| `Hij liet een huis bouwen.` | `Hij betaalde voor een nieuw huis. Anderen bouwden het.` |

## R-PERCEPTION — perception verb + object + infinitive (AcI)

Recognize: `zien / horen / voelen` + noun/pronoun + infinitive (`Ik zag hem komen.`).

| original pattern | rewrite |
|---|---|
| `Ik zag hem komen.` | `Hij kwam. Ik zag het.` / `Ik zag hem. Hij kwam dichterbij.` |
| `Ze hoorde de deur dichtgaan.` | `De deur ging dicht. Ze hoorde het.` / `Ze hoorde de deur. Hij ging dicht.` |
| `Hij voelde zijn hart kloppen.` | `Zijn hart klopte hard. Hij voelde het.` |

## R-VERB-CHAIN — double infinitive and long verb clusters

Recognize: three or more verbs in one cluster (`had willen gaan`, `zal moeten kunnen`, `heeft laten zien`),
or two modals (`moet kunnen`).

| original pattern | rewrite |
|---|---|
| `Hij had willen gaan.` | `Hij wilde gaan.` / `Hij wilde gaan, maar het ging niet.` |
| `Je zult moeten wachten.` | `Je moet wachten.` |
| `Ze heeft het hem laten zien.` | `Ze toonde het hem.` / `Ze gaf het hem.` |

Two-verb clusters are fine (`A-MODAL`, `A-SUB-2V`).

## R-PARTICIPLE — participle phrases and other clause-replacing reductions

Recognize: a present or past participle phrase used as a modifier or an absolute
(`lachend liep hij weg`, `de door hem geschreven brief`, `eenmaal binnen, …`, `in de hoek zittend`).

| original pattern | rewrite |
|---|---|
| `Lachend liep hij weg.` | `Hij lachte en liep weg.` |
| `De door haar geschreven brief lag op tafel.` | `Haar brief lag op tafel.` / `Ze schreef een brief. Die lag nu op tafel.` |
| `Eenmaal binnen, keek hij rond.` | `Hij ging naar binnen. Toen keek hij rond.` / `Binnen keek hij rond.` |

Simple adjectival participles that behave as plain adjectives and are in the lexicon
(`gesloten`, `bekend`, `verbaasd`) are fine.

## R-CONJ-OTHER — subordinators and syntax outside the profile

Recognize: `sinds`, `totdat`, `tenzij`, `mits`, `ofschoon`, `aangezien`, `voor zover`, `naarmate`,
`alsof`, `doordat`, `opdat`, correlatives `hoe … hoe …`, `zowel … als`, `noch … noch`, `niet alleen … maar ook`,
`zo … mogelijk`, inverted conditionals without `als` (`Kom je, dan …`).

| original pattern | rewrite |
|---|---|
| `Hij wachtte totdat ze kwam.` | `Hij wachtte. Toen kwam ze.` / `Hij wachtte op haar.` |
| `Tenzij je nu gaat, kom je te laat.` | `Ga nu. Anders kom je te laat.` |
| `Ze keek alsof ze het niet begreep.` | `Ze keek hem aan. Begreep ze het niet?` / `Haar gezicht zei: ik begrijp het niet.` |
| `Hoe langer hij wachtte, hoe bozer hij werd.` | `Hij wachtte lang. Hij werd steeds bozer.` |
| `Niet alleen Harry, maar ook Draco lachte.` | `Harry lachte. Draco lachte ook.` / `Harry en Draco lachten allebei.` |
| `Doordat het regende, bleef hij thuis.` | `Het regende. Daarom bleef hij thuis.` / `Hij bleef thuis, omdat het regende.` |

`sinds` and `totdat` are the most tempting; `al … lang` / `tot` + noun usually cover them.

---

## Look-alike table (do not flag these)

| looks like | actually | status |
|---|---|---|
| `Dat is raar.` | demonstrative `dat` | allowed |
| `Koffie of thee?` | coordinating `of` | allowed |
| `De winkel is gesloten.` | `zijn` + adjectival participle (state) | allowed |
| `Hij is gevallen.` | perfectum with `zijn` | allowed |
| `Er staat een man buiten.` | presentational `er` | allowed |
| `Hij kan goed zwemmen.` | modal + bare infinitive | allowed |
| `Ze ging slapen.` / `Hij bleef staan.` | `gaan/blijven/komen` + bare infinitive | allowed |
| `Zou u even wachten?` | polite formula | allowed |
| `… toen ze de brief had gelezen.` | two-verb cluster in subordinate clause | allowed (`A-SUB-2V`) |
| `Hij was verbaasd.` | adjective | allowed |
