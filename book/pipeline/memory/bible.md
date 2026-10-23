# Book memory — HPMOR NL

Scope: chapters 1–10 of *Harry Potter and the Methods of Rationality*, for the
A2–B1 Dutch edition. English prose, Dutch decisions. Agents read only the
sections marked for chapters ≤ the chapter they are working on; the `## Spoilers`
section is at the end so an agent can stop before it. Names and terms: see
`glossary.json` (this file explains, the glossary decides spelling).

## Global decisions

### Naming policy
- Canon HP names and terms: the official Dutch translation (Buddingh'): Zweinstein,
  Perkamentus, Anderling, Sneep, Dreuzel, Zwerkbal, Griffoendor / Zwadderich /
  Ravenklauw / Huffelpuf, de Wegisweg, Goudgrijp, Malfidus, Hermelien Griffel, Ron
  Wemel, Marcel Lubbermans, Krinkel, Jeweetwel, de Heer van het Duister, Dooddoeners.
- HPMOR-original names stay English: Harry James Potter-Evans-Verres, Michael
  Verres-Evans, Petunia Evans-Verres, Yermy Wibble, Della, Mr Spoo → meneer Spoo.
- Real-world people and English book titles stay English; italic exactly where the
  source sets them italic (*Influence: Science and Practice*, *Gödel, Escher, Bach*),
  roman where the source is roman (ch 1: *the Feynman Lectures on Physics* has no
  `\emph` in the source and gets none in Dutch — the macro count rule wins). Hogwarts
  textbooks get their Dutch titles (*Zweinstein: Een Geschiedenis*).
- Scientific concepts: standard Dutch term where one exists (omstandereffect,
  fundamentele attributiefout, efficiënte-markthypothese, wederkerigheid); otherwise
  a transparent coinage (planningsfout, positieve bias). Gloss once per chapter.
- Titles are lowercase before a name: professor Anderling, meneer Potter, madame
  Mallekin, minister Droebel, schoolhoofd Perkamentus. Exception: *de Professor* (capital
  P) when the narrator uses it as Michael's label. Vocative "Professor" → "professor".
- Houses are *afdelingen*. "Slytherin House" → *Zwadderich* (bare) or *de afdeling
  Zwadderich*; "Ravenclaws" → *Ravenklauwen*; "Gryffindors" → *Griffoendors*;
  "Slytherins" → *Zwadderaars*; "Hufflepuffs" → *Huffelpufs*. "House" meaning family
  (House of Black, House of Malfoy) → *Huis*.
- Shouted Sorting results stay in capitals: ZWADDERICH! RAVENKLAUW! HUFFELPUF! GRIFFOENDOR!

### Narration tense
- HPMOR narrates in the past tense. Dutch narration uses the **imperfectum** (OVT):
  *zei, keek, liep*. Perfectum only in dialogue and for results ("Ik heb het gezien").
- Some blocks open in the **present tense** (ch 1: the bookshelves, "This is the
  living-room", "The Professor and his wife are speaking…"). Follow the source block by
  block: present → *presens*, past → *imperfectum*. Never smooth a tense switch the
  author made; never add one he did not.
- Pluperfect ("had been", "had sent") is restricted: use imperfectum + *al / eerder /
  daarvoor / toen*. Example: "Harry had been sent to the best primary schools" →
  *Harry ging eerder naar de beste basisscholen.*
- Harry's thoughts in `\emph{…}` are in the present tense in English and stay in the
  present tense in Dutch: *\emph{Hopeloos.}*, *\emph{Ik kan toveren.}*
- Hermione's POV (ch 8) and McGonagall's / Draco's POV passages keep past tense with
  free indirect thought; "the boy" → *de jongen* until she realises who he is, then
  "Harry Potter" in full, exactly as the source alternates.

### Typography and macros
- Speech: curly “ ”; quotes inside quotes: ‘ ’. Em dash — for interruptions
  (“Ik vertelde ze dat jij het niet mocht weten—”), ellipsis … for trailing off.
  Keep the source's dash/ellipsis choice per sentence.
- Keep every macro: `\emph{}`, `\shout{}`, `\headline{…\\…}`, `\letterAddress{}`,
  `\letterClosing[…]{}`, `\abbrev{QX31}`, `~` ties (*meneer~Potter*, *mevrouw~Figg*),
  `\lettrine{E}{lke}` / `\lettrinepara[ante=“]{…}{…}`, `\later`, `\latersection{Nasleep}`.
- `\emph` may move to the stressed Dutch word; the number of emphasised ideas stays.
  Harry's sarcastic runs in ch 6 (ten italics in one paragraph) keep the count.
- Glosses: `\gl{woord}{english}` at the first occurrence per chapter of a kept word
  the reader may not know. ≤ 2 per paragraph. Never gloss names or capitalised canon
  terms that the glossary marks as never-glossed (tovenaar, heks, magie, Zweinstein).
  Never gloss words on the `cognates` list in `exceptions.json` (*hypothese*,
  *genetisch*, *experiment*, *universum*, …) — that list overrides older "gloss once"
  notes. Chapter headings are set in letterspaced capitals: no `\gl` in a `\chapter{}`;
  gloss the word family at its first body occurrence instead (ch 1: *onwaarschijnlijk*).
- Opening quotes (`chapterOpeningQuote`) that reappear inside the chapter (ch 3, 4→6,
  6, 7, 8, 9) must be **byte-identical** to the in-text rendering. Translate the
  in-text line first, then copy it to the epigraph.
- Author's notes (`chapterOpeningAuthorNote`): translate only if the block is marked
  `translate: true`; keep them light and keep "J.K. Rowling" as is.
- Chapter titles: see per-chapter notes. `\partchapter{Zelfbewustzijn}{I}`.
- The `\latersection{Aftermath}` heading (ch 6, 7) → `\latersection{Nasleep}`.

### Forms of address (je / u)
General rule: children → teachers and adult strangers **u**; adults → children
**je**; family **je**; children among themselves **je**. Harry's over-formality is
part of his voice, so he says **u** more often than a normal eleven-year-old.

| speaker → addressee | pronoun | address words |
|---|---|---|
| Harry → Michael / Petunia | je | *pap*, *mam*; “Mum! Dad!” → “Mam! Pap!” |
| Michael / Petunia → Harry | je | *Harry*; Michael: *jongen* (“son”); Petunia: *mijn jongen*, *mijn zoon* (“my son”, ch 7) |
| Michael ↔ Petunia | je | Michael: *lieverd* (“Dear”, condescending), *schat* (“Darling”); Petunia: *mijn lief* / *liefste* (“My love”); “Michael dear” → *Michael, lieverd* |
| Harry → McGonagall | u | *professor*, *professor Anderling*; letter: *Geachte onderdirectrice*; in fury (ch 6) he drops the title but **keeps u**: *Hoe durft u!*, *hoort u mij, Anderling?* |
| McGonagall → Harry | je | *meneer Potter* (always, even when angry); *jongeman* when avoiding the name in public (ch 6); *Harry* only in the two soft moments of ch 6 |
| McGonagall ↔ Michael / Petunia | u | *meneer*, *mevrouw*; they call her *professor* |
| Harry → Griphook | u | *meneer*, *meneer Grijphaak* |
| Griphook → Harry | u | *meneer Potter-Evans-Verres* (hostile formality) |
| Reverent strangers (Tom, Doris, the old man ch 5) → Harry | u | *Harry Potter*; the comic point is adults saying *u* to a child |
| Mrs Figg → Harry | je | *Harry*, *lieverd* (“dear”), *Och, arme jongen!* (“Poor dear!”) |
| Harry → his brain / the “strange little prediction” | jij | *Waar kom jij vandaan, vreemde kleine voorspelling?* (ch 1, italic thought) |
| Shop staff (Malkin, assistants, Moke-shop woman, Della, stall-holder) → Harry | je | Della: *je*, conspiratorial |
| Harry → shop staff | u | *mevrouw*, *meneer* |
| Trunk salesman → Harry / McGonagall | u | *meneer*, *mevrouw Anderling* (“Madam McGonagall”) |
| Harry ↔ Draco | je | Draco: *Potter* (ch 5, ch 7 opening), *Harry* once they bond; Harry: *Draco*; **exception**: Harry's mock-flattery in ch 5 uses *u* + *meneer* (“sir”), and Draco's parody fan-gush (“Can I have your autograph?”) uses *u* |
| Harry → Lucius | u | *Lucius Malfidus!*, *meneer Malfidus* |
| Draco → Lucius | u | *Vader* (capital, no article), also in the letter: *Lieve Vader* |
| Lucius → Draco | je | *Draco*; letter: *Mijn geliefde zoon* |
| Harry ↔ Ron | je | Ron: *Harry*, *man* (“mate”); Harry: *Ron* |
| Draco ↔ Ron | je | surnames: *Wemel*, *Malfidus* |
| Molly Weasley → Harry | je | *lieverd* (“dear”), *Harry, lieverd* |
| Michael → Molly Weasley | u | — |
| Fred / George → Harry, → their mother | je | *mam* |
| Harry ↔ Hermione | je | Harry's mock-formal lines: *juffrouw Griffel* + **u** (“Miss Granger, it has been less than 72 hours…”); otherwise *Hermelien* / *Harry Potter* (she uses the full name in her head) |
| Hermione / Harry ↔ Neville | je | *Marcel* |
| Prefects → first-years | je | — |
| Harry → prefects | u | *juffrouw Halewijn* |
| Sorting Hat ↔ Harry | **je both ways** | The Hat borrows Harry's mind; *u* would create a distance the text does not have. It calls him *jongen*, *jij sluwe kleine schoft*; he calls it *Hoed* |
| Dumbledore → McGonagall | je | *Minerva*, *beste Minerva* (“my dear”) |
| McGonagall → Dumbledore | u (provisional) | *Albus*; no spoken line yet in ch 1–10 |

Fixed polite chunks (*Aangenaam kennis te maken*, *Zou u mij willen…*) count as
vocabulary; use them in Harry's and the salesman's mock-formal lines.

## Narrator voice

The narrator is dry, exact, and amused; the humour sits in understatement, in the
distance between Harry's vocabulary and his age, and in the narrator calmly reporting
absurd things. Dutch must keep that calm. No added exclamation marks, no *echt*, *heel*
or *gewoon* as intensifiers, no explanations.

1. **One-sentence paragraphs that undercut.** “Professor McGonagall turned into a
   cat.” (ch 2) → *Professor Anderling veranderde in een kat.* Full stop, own
   paragraph, nothing added. Likewise “And they left without any more trouble.”
   (ch 4) → *En ze vertrokken zonder verdere problemen.* The joke is the flatness.
2. **The narrator negating the dramatic.** “Lightning and thunder completely failed to
   flash and boom” (ch 6). Keep the negation structure, do not paraphrase into a
   positive: *Bliksem en donder bleven volkomen weg. De lucht was wolkeloos.* Same
   family: “This hilarious joke failed to reassure the witch” → *Deze geweldige grap
   stelde de heks niet gerust.* Here the narrator adopts Harry's self-assessment
   ironically — keep *geweldige* (his word), do not soften to *deze grap*.
3. **Parentheses as asides.** “(Harry was something of a sore loser.)” (ch 6) →
   *(Harry was een slechte verliezer.)* Keep the brackets; a bracketed aside is one
   short main clause. Long bracketed sentences (the Dartmouth paragraph, the Latané
   and Darley aside in ch 3) become two or three sentences inside the same block, the
   first one still opening with “(”.
4. **Long sentences must be split, but the order of information stays.** The ch 1
   paragraph on how Harry was raised (“Harry had been sent to the best primary
   schools—…”) is one 70-word sentence with dashes. Dutch: four to six sentences,
   same sequence (schools → tutors → books → competitions → respect), each ≤ 20 words,
   the punchline “except, maybe, the slightest shred of respect” as its own sentence:
   *Behalve misschien een heel klein beetje respect.*
5. **Free indirect thought in `\emph`.** *\emph{Hopeless.}* → *\emph{Hopeloos.}*;
   *\emph{Aw crap.}* → *\emph{Verdorie.}* (identical both times in ch 6). Thought is
   present tense, first person, no quotation marks. Where English puts a long thought
   in italics (ch 1 garden, ch 7 Moon), split it like narration but keep every clause
   inside one `\emph{}`.
6. **Harry's over-formal register.** “I am a conscientious objector to child
   conscription” (ch 2) → *Ik ben gewetensbezwaarde tegen de kinderdienstplicht.* The
   Latinate word **is** the joke; keep it, gloss it, let the parents' laughter do the
   rest. The same holds for his letter in ch 1 (*conditional on such a place actually
   existing* → *op voorwaarde dat die school echt bestaat*), for *seigniorage* and
   *arbitrage* (ch 4), and for the jargon chain about peer-reviewed studies (ch 6):
   translate the jargon word for word, do not simplify it, because McGonagall's
   “What?” is the reader's reaction too.
7. **The scientific-method refrain.** The same five phrases recur and must always be
   rendered the same way: *de wetenschappelijke methode*, *de experimentele methode*,
   *de hypothese testen*, *een experiment doen*, *bewijs*. “That's what the experimental
   method is for” → *Daar is de experimentele methode voor.* Harry says these with the
   seriousness of a creed; no irony from the narrator here.
8. **British idiom becomes plain Dutch idiom, not literal English.** “in a jiffy or
   two” → *in een wip*; “go boil his head” → *zei dat hij zijn kop maar moest gaan
   koken* (literal is funny here); “Cor” → *Jeetje*; “Bless my soul” → *Lieve hemel*;
   “Good Lord” → *Goeie genade*; “Sheesh” → *Pff*; “Gosh” → *Tjonge*.
9. **Numbers and measures stay exact.** Percentages in ch 6, the Galleon arithmetic
   in ch 4 and 6, “six billion” → *zes miljard*, “a thousand million Galleons” →
   *een miljard Galjoenen* (A2 word, same number), “£1,000” → *duizend pond*.
10. **Profanity and cruelty are not softened.** Draco's line about Luna (ch 7), “kicked
    the hat in the balls” (ch 10), the skins nailed to the wall (ch 3) are translated
    plainly. The horror or the comedy depends on the plainness.

## Characters

### Chapter 1 <!-- from chapter 1 -->

**Harry James Potter-Evans-Verres** — *Harry James Potter-Evans-Verres*; *Harry*. Ten (eleven from
ch 2 on, birthday 31 July), adopted by Petunia and Michael; reads science, maths and SF; knows
nothing of magic until the letter. Speaks like a textbook with an eleven-year-old's temper
underneath: long formal sentences, technical terms, then “Mum! Dad!”. Verbal tics: *genetische
ouders*, *hypothese*, *de wetenschappelijke methode*, counting points, “I am not stupid” (*Ik ben
niet dom*). Dutch register: formal vocabulary, short sentences; let the formality carry the joke,
not the syntax. Thoughts in `\emph`, present tense. Address: parents *je / mam / pap*; McGonagall *u
/ professor*; strangers *u*; children *je*. His brain is *zijn brein* (never *hersenen*), an agent
he talks to with *jij*; the part of him that already believes is *de vreemde / bizarre /
eigenaardige zekerheid* (feminine: *haar nek uitsteken*). His letter: *u*, *Geachte onderdirectrice*,
*Hoogachtend*, *Onlangs ontving ik…*, and the envelope form *de heer~H.~Potter* when he quotes an
address.

**Michael Verres-Evans** — *Michael Verres-Evans*; narrator: *de Professor* (capital P as the
narrator's label; lowercase *professor Michael Verres-Evans* before the name). Oxford biochemistry
professor, Harry's adoptive father; sceptic, rolls his eyes, considers shouting uncivilised; shows
love by buying books. Speaks in calm, slightly lecturing sentences; sarcasm with a straight face (“A
well-considered policy…”). *Je* to Harry and Petunia; *lieverd* (“Dear”) and *schat* (“Darling”) to
Petunia when he condescends; *jongen* (“son”) and *Och, kom nou, Harry* to Harry. His sceptic
vocabulary: *de sceptische literatuur*, *een getrainde goochelaar* (stage magician, never
*tovenaar*), *cold reading* (English, glossed), *lepels buigen*. Family motto (ch 7): *Je kunt nooit
genoeg boeken hebben.*

**Petunia Evans-Verres** — *Petunia Evans-Verres*. Lily's sister, made beautiful by Lily's potion
(*een toverdrank*, unglossed: A2 in the lexicon); frightened but stubborn; afraid of the wizarding
world. Short, broken sentences, repeats herself (“She was a witch. I saw it.” → *Ze was een heks.
Ik heb het gezien.*), tears. Dry when she teases Harry (“you bite one maths teacher…”). *Je* to
everyone in the family, *mijn lief* (“My love”) to Michael, *u* to McGonagall. Her word for the
parents' quarrels is *discussie* (“I can't win arguments with you” → *van jou kan ik geen discussie
winnen*); the narrator's word is *ruzie*.

**Lily Potter / Lily Evans** and **James Potter** — unchanged. Dead; known in ch 1 only as Harry's
genetic parents, Lily as the witch sister. Narration says *Lily* and *James*; Harry says *mijn
genetische ouders*.

**Vernon Dursley → Vernon Duffeling, Dudley → Dudley Duffeling** — mentioned once by Petunia; the
joke is the ugly alliteration *Dudley Duffeling*.

**Mrs Figg → mevrouw Figg** — the neighbour and occasional babysitter (*soms zijn oppas*); grey
hair in a hairnet (*haarnetje*); brisk, warm, calls Harry *lieverd*, *je*; tut-tuts in full
sentences with full stops, not in exclamations (*Ze stuurden jou alleen maar de gewone brief.*).
She knows about Hogwarts. Do not explain how. The fence between the gardens is *het hek*.

**Minerva McGonagall → Minerva Anderling** — named in Harry's letter as *onderdirectrice*; appears
in ch 2.

### Chapter 2 <!-- from chapter 2 -->

**Professor Minerva McGonagall → professor Anderling** — Deputy Headmistress (*onderdirectrice*),
Transfiguration professor, Animagus (cat). Looks witchy, sounds formal and Scottish: crisp, complete
sentences, dry irony, lips twitching when amused, genuine warmth underneath. Dutch: correct,
slightly formal, never slangy; she says *meneer Potter* in every mood and *je*. Her one-word
*Magie.* answers Harry's tirades (ch 2, ch 6). “Just Professor will do” → *Zeg maar professor.* She
swears by Merlin: *Wat in Merlijns naam…* Narration labels: *professor Anderling*, *de heks*, *de
oudere heks*, *de onderdirectrice*, *de heksendame* (Harry's childish label, ch 2–5), *Anderling*
when Harry is furious or in her own POV *Minerva*. Her suppressed amusement is a motif: “lips
twitching” → *haar mondhoeken trokken omhoog*, “twitching harder” → *gingen nu nog verder omhoog*.
Michael and Petunia say *u* to her (*Goed, u kunt me nu neerzetten.*); Harry calls her
*onderdirectrice* once before she corrects him to *professor*.

**Madam Pomfrey → madame Plijster** — school healer, mentioned.

### Chapter 3 <!-- from chapter 3 -->

**Tom** — old barman of the Lekke Ketel; awed whisper, *u* to Harry.
**Doris** — old woman, grandson a *Schouwer* killed in '79; weeps, *u*.
**Quirinus Quirrell → Quirinus Krinkel** — pale man with a twitching eye in the corner of the pub;
next year's *Verweer tegen de Zwarte Kunsten* teacher. Harry feels he knows him and should not shake
his hand. Render that feeling as *een vreemd gevoel*, no more. No spoken lines yet.
**Voldemort / de Heer van het Duister / Jeweetwel / Hij-Die-Niet-Genoemd-Mag-Worden** — told, not
seen. McGonagall says the name once; Harry whispers it once and resolves to use *Jeweetwel*. From
here the narration says *de Heer van het Duister*.
**Death Eaters → Dooddoeners**; **Yermy Wibble** (journalist, flayed with his family);
**Godric's Hollow → Goderics Eind** — in McGonagall's story. Her storytelling register is elevated
(“raged… like a wilding wolf”); keep the imagery, split the sentences.

### Chapter 4 <!-- from chapter 4 -->

**Griphook → Grijphaak** — goblin (*kobold*) at the vault; sharp teeth, glittering eyes, offended
dignity turning into frank respect. Formal and hostile: *u*, *meneer Potter-Evans-Verres*. Harry
answers *meneer*, *meneer Grijphaak*.

### Chapter 5 <!-- from chapter 5 -->

**The Moke-shop woman** — unnamed, nervous, young, faded yellow robes; one line of business. *De
winkelierster* / *de jonge vrouw*.
**The old man with the cane** — unnamed well-wisher; quavering voice, one tear, says the canon line
*Je hebt de ogen van je moeder.* *U* to Harry.
**Madam Malkin → madame Mallekin** — bustling old woman, unflappable until she cracks up; two
unnamed **assistants** (*assistentes*) who keep choking on laughter.
**Draco Malfoy → Draco Malfidus** — eleven, pale, pointed face, white-blond hair; raised to rule.
Drawl (*lijzig*), smug, well-trained politeness that turns to sneer; quotes *Vader*. Dutch: fluent,
slightly affected sentences, never childish grammar. *Je* to Harry (and *Potter*), *u* to his
father.
**Lucius Malfoy → Lucius Malfidus** — tall, white-haired, silver-handled cane, executioner's calm.
Two spoken lines in ch 5, both low and cold. *Je* to Draco.
**Rowena (Ravenclaw) → Rowena Ravenklauw** — mentioned by Harry quoting McGonagall.

### Chapter 6 <!-- from chapter 6 -->

**Della** — teenage salesgirl at the open-front shop (healer's kit); eager, then flees when Harry
jokes about a dying classmate; later conspiratorial and kind. *Je* to Harry.
**Trunk salesman** — unnamed; oily, exquisite politeness, *u*, *mevrouw Anderling*.
**Ollivander → Olivander** — not on stage; his wand line is quoted in Harry's memory.
**Sirius Black → Sirius Zwarts** — named by McGonagall as the betrayer, *in Azkaban*.
**Albus Dumbledore → Albus Perkamentus** — *schoolhoofd*; named, then appears in the Aftermath:
twinkling eyes, *beste Minerva*, gravely amused. *Je* to Minerva.
**Severus Snape → Severus Sneep** — named only. **Hermione Granger → Hermelien Griffel** — a
whispered name at the very end. **Grandpa and Grandma** → *opa en oma*.

### Chapter 7 <!-- from chapter 7 -->

**Molly Weasley** — “the plump woman”, unnamed: *de mollige vrouw*; warm, bossy, *lieverd*, *je*. Do
not write *mevrouw Wemel* unless the source names her.
**Ron Weasley → Ron Wemel** — tall, skinny, freckled, long nose; Quidditch fan (Chudley Cannons);
indignant, loyal, not quick. Plain colloquial Dutch, short sentences, *man* for “mate”, *Jeetje* for
“Cor”. *Je*.
**Fred and George Weasley → Fred en George Wemel** — identical twins, finish each other's jokes
(“don't think of an elephant”). Later the two scarfed figures: *de Orde van de Chaos*.
**Ginny** and **Percy** — present but unnamed (*een roodharig meisje*, *vier jongens*).
**Ron's white owl** — unnamed; its hoot is “eehhhhh” — keep.
**The stall-holder** — bald, bearded; sells *De Kibbelaar* and *Komedie-Thee*; smiles mysteriously,
salesman's patter, *je*.
**Luna Lovegood → Loena Leeflang** and **her father** (owner of *De Kibbelaar*) — mentioned by
Draco; *zieneres* (“seer”).
**Minister Fudge → minister Droebel**, **the Lestranges → de Van Detta's**,
**Salazar / Godric / Rowena / Helga → Zalazar / Goderic / Rowena / Helga**,
**Merlin → Merlijn**, **Francis Bacon** — names in speeches.
**Lucius Malfoy** — by letter: formal, affectionate, cold at once: *Mijn geliefde zoon:*

### Chapter 8 <!-- from chapter 8 -->

**Hermione Granger → Hermelien Griffel** — POV character. Eleven, bushy-haired (not yet described),
reads *Zweinstein: Een Geschiedenis* for the third time, loves tests, helps people as her way of
meeting them; indignation is “one of her primary engines”. Speaks fast, precise, slightly prim:
*Natuurlijk weet ik dat.* Her thoughts are tidy lists (“not sad, lonely, gloomy, depressed…” — keep
the list, five adjectives). *Je* to Harry; to herself he is *de jongen*, then *Harry Potter* in
full.
**Neville Longbottom → Marcel Lubbermans** — tiny voice, stammer, lost toad (*pad*);
*k-klassenoudste*. *Je*.
**A Gryffindor prefect** — unnamed, red and gold badge, refuses to help; reported speech.
**Arsenius Jigger** — textbook author.

### Chapter 9 <!-- from chapter 9 -->

**Sorting roll-call** — *Albedil, Hannah! / Bonkel, Susan! / Bot, Terry! / Corner, Michael! /
Goldstein, Anthony! / Kwast, Gregory! / Griffel, Hermelien! / Lubbermans, Marcel / Malfidus, Draco!
/ Perks, Sally-Anne! / Potter, Harry!* Keep the source order (it is narrative order; never say it is
alphabetical).
**Albus Dumbledore → Albus Perkamentus** — on the golden throne, *Wijze Oude Man*, applauds
everyone, smiles benignly. No lines.
**Severus Snape → Severus Sneep** — dour, applauds no one, stares at Harry, crushes a silver goblet
(*wijnbeker*). No lines.
**Quirinus Quirrell → Krinkel** — darting eyes, twitching, “gazing vacuously”.
**Three older witches**, **Sprout → Stronk** (yellow hat, applauds all but Slytherins),
**Flitwick → Filius Banning** (tiny, standing on his chair, Head of Ravenklauw, *Bezweringsmeester*,
*Duelleerkampioen*), **Hagrid** (*Sleutelbewaarder en Terreinknecht*), **Trelawney → Zwamdrift**,
**Vector**, **Sinistra** — named in McGonagall's POV.
**Penelope Clearwater → juffrouw Halewijn** — Ravenclaw prefect, quiet, proud, severe glance; *je*
to first-years; Harry says *u*.
**An unnamed student** — hisses the slur *halfbloed* about Flitwick.
**The Sorting Hat → de Sorteerhoed / de Hoed** — patchy old cloth, 800 years old; its song parodies
the Lumberjack Song; first words at the very end of ch 9.

### Chapter 10 <!-- from chapter 10 -->

**The Sorting Hat → de Hoed** — a telepathic voice inside Harry's head that becomes self-aware
because Harry wondered whether it was. Dry, patient, precise, borrows Harry's own vocabulary
(*nutsfuncties*, *referentieklasse*) and his tone of grudging respect; sad at the end, then
unexpectedly funny (“Just kidding!”). Its lines are `“\emph{…}”` (quotes + italic); Harry's replies
are `\emph{…}` without quotes, in present tense, sometimes in CAPITALS. *Je* both ways. Fixed lines:
*Jij sluwe kleine schoft*, *Al gehoord.* (“Heard it.”), *Ik ben een hoed, geen god.*, *Grapje!
RAVENKLAUW!*

## Running terms, motifs and repeated phrases

| motif / phrase | Dutch | first | notes |
|---|---|---|---|
| the scientific method / experimental method | de wetenschappelijke methode / de experimentele methode | 1 | refrain, never varied |
| hypothesis; test the hypothesis; falsify | hypothese; de hypothese testen; weerleggen / weerlegging | 1 | *hypothese* is a listed cognate, never glossed; gloss *weerlegging* once per chapter |
| “Why do you believe what you believe?” | Waarom geloof ik wat ik geloof? (1) / Waarom geloof je wat je gelooft? (7) | 1 | to his brain (1), to Draco (7); same verb and order |
| Harry's brain | zijn brein | 1 | never *hersenen*; glossed once per chapter; addressed with *jij* |
| the strange / bizarre / peculiar certainty | de vreemde / bizarre / eigenaardige zekerheid | 1 | the adjective follows the source each time; pronoun *die* at sentence start, *haar* inside a clause |
| “Don't believe everything you think” | Geloof niet al je gedachten | 1 | the book maxim, italic |
| “Letter for Hogwarts!” / “Can I get an owl?” | Brief voor Zweinstein! / Mag ik een uil? | 1 | lowercase *brief voor Zweinstein!* only inside Harry's quoted plan (b074) |
| the envelope address | de heer~H.~Potter | 1 | written form; spoken address stays *meneer Potter* |
| “Mr Potter” / “young man” | meneer Potter / jongeman | 1 / 6 | McGonagall |
| “Magic.” | Magie. | 2 | one-word answer, 3× (McG 2, 6; Harry 6) |
| “Huh.” | Huh. | 2 | Harry and Michael echo |
| that look | die blik | 2 | italic |
| “I don't bite anyone who doesn't bite me first.” | Ik bijt niemand die mij niet eerst bijt. | 2 | repeated in 8, identical |
| McGonagall's lips twitching | haar mondhoeken trokken omhoog / gingen nog verder omhoog | 2 | her suppressed amusement; reuse the *mondhoeken* image |
| The March of Reason | De Mars van de Rede | 2 | Harry's phrase, glossed as one chunk once per chapter |
| the Light; warrior / symbol of the Light | het Licht; strijder / symbool van het Licht | 5 / 9 | |
| “the one with the power to vanquish the Dark Lord” | degene met de macht om de Heer van het Duister te verslaan | 5 | prophecy wording, fixed |
| Crack of Doom / Look of Doom / Mount Doom / House of Doom | de Doemspleet / de Blik des Doems / de Doemberg / Afdeling des Doems | 3 / 6 / 6 / 10 | one family |
| well-wishers | bewonderaars | 5 | |
| the Incident with the Science Project / at the Potions Shop | het Incident met het Wetenschapsproject / het Incident in de Toverdrankenwinkel | 7 / 6 | capital I; never described |
| “Be prepared!” / “Why weren't you prepared?” | Wees voorbereid! / Waarom was je niet voorbereid? | 6 | same root both times |
| taking over the world / world domination / world optimisation | de wereld veroveren / wereldheerschappij / wereldoptimalisatie | 4 / 6 | epigraph ch 4 = line in ch 6 |
| the planning fallacy; outside / inside view | de planningsfout; de blik van buiten / van binnen | 6 | |
| sane / sanity / crazy adults | gezond verstand, bij zijn verstand / gekke volwassenen | 6 | “so sane it burns like ice” → *zo goed bij mijn verstand dat het brandt als ijs* |
| Harry's cold anger | zijn bloed werd koud; ijzig; de kou; donkere helderheid | 6 | motif to ch 10; never soften |
| “+1 point”, awarding points; “Aw crap.” | +1 punt; punten geven; Verdorie. | 6 | *Minerva Anderling: +1 punt.*; *Verdorie.* twice, identical |
| the war (ten years ago); Death Eater Eaters | de oorlog; de Dooddoeners-Dooddoeners | 6 | |
| “You can never have enough books” | Je kunt nooit genoeg boeken hebben. | 7 | Verres motto; “the family rule” (3) → *de familieregel* |
| “If you can't criticise, you can't optimise.” | Als je niet kunt bekritiseren, kun je niet optimaliseren. | 7 | |
| “flawless instrument of death” / “one weak point” | een perfect instrument van de dood / zijn enige zwakke plek | 7 | quoted in the letter |
| “Clever kids in Ravenclaw…” | Slimme kinderen in Ravenklauw, slechte kinderen in Zwadderich, wannabe-helden in Griffoendor, en iedereen die het echte werk doet in Huffelpuf. | 9 | quoted by the Hat in 10 |
| “You sly little bastard” | Jij sluwe kleine schoft | 10 | Hat → Harry → Hat |
| pouch command words | zak goud, zak element 79, zak okane | 6 | lowercase, inside quotes |

## Per-chapter notes

### Chapter 1 — A Day of Very Low Probability → *Een dag van zeer lage waarschijnlijkheid*
**Summary.** A house full of books in Oxford. Petunia tells her husband Michael that her sister Lily
was a witch and that a letter from Hogwarts has come for their adopted son Harry; Michael, a
scientist, refuses to believe it. Ten-year-old Harry proposes a test: ask Hogwarts to send a
professor. Alone in his room he notices that part of him already believes, writes a very formal
letter to the Deputy Headmistress, seals it with wax, and goes into the garden to shout for an owl.
The neighbour Mrs Figg looks over the fence, knows exactly what the letter is, takes it, and
promises to have someone over. The chapter ends on Harry's flat “What.”
**Scenes.** (no `\later`) 1 living room, present tense → argument; 2 Harry's room, letter; 3
downstairs, hypothesis announced; 4 back garden, Mrs Figg.
**Tone / jokes.** Petunia's monologue is sincere and sad; Michael's condescension is polite; Harry's
two-paragraph bitterness about “Show Interest” and “a Good Parent” is the first taste of his voice
(capitals kept: *Belangstelling Tonen*, *een Goede Ouder*). The garden scene is pure embarrassment
comedy; the ending must be one bare word with a full stop: *Wat.*
**Traps.** Present-tense opening (first four paragraphs) then past. “Dudley Dursley” → *Dudley
Duffeling* keeps the sneer. “cold reading” → *cold reading* kept, glossed. “A flat metal plate on a
door affords pushing” → *nodigt uit tot duwen* (affordance). “Letter for Hogwarts! Can I get an
owl?” → *Brief voor Zweinstein! Mag ik een uil?* “drug money” → *drugsgeld*. “Poor dear!” → *Och,
arme jongen!* The letter: *Geachte onderdirectrice Minerva Anderling, / Of Wie Dit Verder Aangaat:*
… *Hoogachtend,*; the letter uses *u* and Harry's full formal register. “H.J.P.E.V.” initials
unchanged. The epigraph (silver fragment, black robes falling, blood in litres) is a flash-forward:
translate literally, present tense, no interpretation.
**Decisions (final, after cohesion).** Title *Een dag van zeer lage waarschijnlijkheid*, unglossed
(letterspaced capitals); *onwaarschijnlijk* glossed at its first body occurrence (b049). Epigraph:
*(zwarte \gl{gewaden}{robes}, vallend)* — plural (see Spoilers), bare noun, bare participle. *mam/pap*;
*de Professor* for Michael; *Lieverd / Schat / Mijn lief* for the couple's endearments. “brain” →
*brein* throughout. Envelope *\emph{de heer~H.~Potter}*; Harry's letter quotes the same form (*uw
brief aan de heer~H.~Potter*). *discussie* (Petunia/Harry) vs *ruzie* (narrator). “magician” →
*goochelaar*. *Feynman Lectures on Physics* roman, as in the source. Listed cognates unglossed:
*genetische*, *hypothese*, *Doctor*, *sceptisch*, *fractie*, *experimentele*. “as though” → the tag
*zo leek het* (≤ 2 per scene). Dates: *vóór 31 juli* with the accent (the checker strips it).
Glosses in this chapter (25, in order): gewaden, eminente, perkament, smaragdgroene, goochelaar,
cold reading, smoesjes, wrong, citaat, waarneming, onwaarschijnlijk, toverstok, weerlegging, brein,
vulpotlood, kalligrafie, toelating, vertegenwoordiger, waanzin, gootsteen, gênant, haarnetje,
verstikte, toelatingsbrief, in een wip.

### Chapter 2 — Everything I Believe Is False → *Alles wat ik geloof, is niet waar*
**Summary.** McGonagall has come to the house. Harry sets the terms of the experiment for both
parents; she levitates Michael, then turns into a cat and back, and Harry has a small breakdown
about the laws of physics. She learns about his 26-hour sleep cycle and about why he has not been at
school (he once bit a maths teacher who did not know what a logarithm was); the parents laugh
themselves out of the room. She decides to take him shopping only shortly before term, fearing what
he would do alone with books for two months.
**Scenes.** one continuous scene in the living room.
**Tone / jokes.** The levitation is an anticlimax (“Huh.” / “Huh.”); the cat is the real shock.
Harry's physics rant is deliberately opaque jargon — keep it opaque, do not simplify *quantum
Hamiltonian*, *unitarity*, *FTL*; the joke is McGonagall's “Magie.” The parents' deadpan teasing
about the biting is a double act: short lines, no exclamation marks. McGonagall's “plague of flaming
zebras” is said in perfect calm.
**Traps.** “Just Professor will do” → *Zeg maar professor.* “Wingardium Leviosa” stays. “there is to
be no biting of teachers” (passive) → *Op Zweinstein bijt niemand een leraar. Is dat duidelijk,
meneer Potter?* “conscientious objector to child conscription” → *gewetensbezwaarde tegen de
kinderdienstplicht* (keep, gloss). “nursery schoolers” → *kleuters*. “witchy” → *heksachtig*;
“cackle” → *kakelen* (callback in ch 9). “Fine, I won't bite anyone who doesn't bite me first” →
fixed rendering (see motifs). “10 pm, 12 am…” → *tien uur 's avonds, twaalf uur, twee uur, vier
uur*. The opening quote (“Of course it was my fault…”) does not occur in the text; translate freely
but keep the deadpan.
**Decisions (final, after cohesion).** Title *Alles wat ik geloof, is niet waar* (also Harry's
in-text line, b019, identical). Michael → McGonagall *u*. “levitate” → *in de lucht tillen*; “fair
play” → *Dat is niet eerlijk.*; “magician's trick” → *een truc van een goochelaar*. “to be exact” →
*Preciezer gezegd:*. “condition” → *aandoening* (glossed, reused). The bitten teacher is a
*wiskundelerares* (*Ze kende geen logaritmen!*); generic *je bijt één wiskundeleraar*. “There! You
see…?” → *Ziet u wel?*. “I'll find a solution in time” → *ik vind wel op tijd een oplossing* (fixed;
keep *op tijd*). Pomfrey → *madame Plijster*. “10 pm, 12 am, 2 am, 4 am” → *tien uur ’s
avonds, twaalf uur, twee uur, vier uur*, `\pm`/`\am` dropped. *toverspreuk* unglossed (A2 known).
Glosses in this chapter (19, in order): goochelaar, gewaad, kakelt, waarneming, brein, toverstok,
Gedaanteverwisseling, Faunaat, knipperde, neuronen, Kleuters, De Mars van de Rede, gesmoorde,
pincet, aandoening, gewetensbezwaarde, kinderdienstplicht, logaritmen, plaag.

### Chapter 3 — Comparing Reality To Its Alternatives → *De werkelijkheid vergelijken met de alternatieven*
**Summary.** In the Leaky Cauldron everyone recognises Harry Potter; he plays along until an old
woman weeps over his hand. McGonagall gets him out, taps his forehead with a disguise, notices his
odd reaction to the pale man in the corner (Professor Quirrell), and opens the wall into Diagon
Alley. Harry gapes at the shops and must be stopped from entering a bookshop. She tells him why
people stare: the Dark Lord, the Death Eaters, the murder of his parents at Godric's Hollow, the
Killing Curse that rebounded. Harry cries, decides he can have two sets of parents, and they reach
the doors of Gringotts.
**Scenes.** one scene with three movements: pub → courtyard → Diagon Alley walk and the story →
Gringotts doors.
**Tone / jokes.** Harry's mock-dramatic “Am I—could I be—maybe—” answer; the stamp that silences the
room; D&D references (“+3 knives”, “wish spells”) in Harry's head; then a full tonal turn into
grief. McGonagall's account is formal and vivid; the narrator's bracketed aside about Harry failing
to notice something wrong must stay exactly, in brackets, as a small sour note.
**Traps.** “That is the most Ravenclaw thing I have ever heard” → *Zoiets Ravenklauws heb ik nog
nooit gehoord.* “Crack of Doom” → *Doemspleet*. “bystander effect” → *omstandereffect*; the Latané
and Darley aside becomes two sentences inside brackets. “died very well indeed” → *zijn heel goed
gestorven*; “protecting you” → *om jou te beschermen* (fixed chunk). “He-Who-Must-Not-Be-Named, the
Dark Lord, Voldemort” — all three in that order. “Thank heavens for you” → *De hemel zij dank voor
jou.* “you don't have to say ‘genetic parents’” — Harry gives up the tic for one sentence; keep.
**Decisions.** Strangers say *u* to Harry; Quirrell rendered neutrally.

### Chapter 4 — The Efficient Market Hypothesis → *De efficiënte-markthypothese*
**Summary.** In the Potter vault Harry interrogates the goblin Griphook about coinage and realises
the wizarding economy knows no arbitrage; he does a Fermi estimate (about 40,000 Galleons, two
million pounds), learns his father was heir to an old family and that some of the gold may be bounty
money. He talks McGonagall into extra Galleons for a magical trunk and a mokeskin pouch “for books”,
over-reaches with a speech about his innocent childhood, and ends up sprawled in a heap of coins
while she threatens to lock him in.
**Scenes.** one scene inside the vault.
**Tone / jokes.** Harry's economics is real and must stay precise (17 Sickles to a Galleon, 5 %, ten
thousand pounds a kilo). The comedy is negotiation: “Books.” / “Of course,” sighed; “Family
tradition.” / “Yes, exactly.” — one-word lines, own paragraphs. Griphook's shift from contempt to
admiration is told in his eyes.
**Traps.** “seigniorage” and “arbitrage” kept (Harry's jargon; McGonagall's “What?”). “hedge fundie”
→ *hedgefondsmanager*. “Rule one of economics: you can't eat money” → *Regel één van de economie:
geld kun je niet eten.* “Trunks whose insides hold more than their outsides” → *hutkoffers die
vanbinnen groter zijn dan vanbuiten* (allowed fixed description) or *Een hutkoffer. Vanbinnen groter
dan vanbuiten.* “Don't push it” → *Niet overdrijven, meneer Potter.* “why rain on my parade” →
*waarom mijn feestje bederven*. “You,” growled → *“Jij,” gromde professor Anderling.*
**Decisions.** *buidel van mokehuid* / *de buidel*; Griphook ↔ Harry *u*.

### Chapter 5 — The Fundamental Attribution Error → *De fundamentele attributiefout*
**Summary.** Harry buys the Moke Super Pouch QX31 and uses the “test” to smuggle in Galleons he
pocketed when he fell. An old man recognises him despite the disguise; Harry suggests he might be an
impostor. In an alley he explains the fundamental attribution error to McGonagall: people thank a
trait, not a circumstance. At Madam Malkin's he meets a pale boy and, sick of being fawned over,
fawns over him instead — Draco Malfoy takes it as his due until Harry admits he has no idea who he
is. Draco then parodies the Harry Potter fans; Lucius Malfoy walks in; Harry rescues Draco by
gushing at Lucius; Draco rescues himself by gushing at McGonagall about Gryffindor; both adults
bellow “What?” in unison. McGonagall, who left for a drink, returns to hysterical laughter and six
minutes of damage.
**Scenes.** Moke Shop → alley with the old man → FAE conversation → Madam Malkin's (Draco, then
Lucius, then McGonagall).
**Tone / jokes.** The coin-smuggling is told in precise left-hand/right-hand choreography (italics
on *linker* / *rechter*). The FAE lecture is Harry at his most textbook; keep the
colleague-kicking-his-desk example whole. The Malkin scene is farce timed in one-liners; do not add
stage directions.
**Traps.** “self-stolen? Auto-thieved?” → *zelf-gestolen? Auto-gejat?* “Scourge of Gryffindor” → *de
Plaag van Griffoendor*. “You have your mother's eyes” → *Je hebt de ogen van je moeder.* “Ha. Ha.
Ha.” → three sentences. “the Obfuscation” → *de Vermommingsspreuk* (“Something of a disguise”
earlier → *een soort vermomming*). “awesomecool” → *supercool*. “House Hufflepuff, or possibly House
Elf” — pun on *House* lost; render *Huffelpuf. Of misschien… huis-elf.* “Burst into flames and die”
→ *Vlieg in brand en ga dood.* “Shut up” → *Hou je mond*, the fused *Shut up shut up* →
*Houjemondhoujemondhoujemond.* Harry's flattery uses *u* and *meneer*; Draco's parody uses *u*.
“Confundus Charm on the entire universe” → *een Confundusspreuk over het hele universum*. “by the
very clock” → *op de klok*. The chapter epigraph does not occur in the text.
**Decisions.** *afdeling* for House; *bewonderaars*; prophecy line fixed; Harry's mock-flattery *u*.

### Chapter 6 — The Planning Fallacy → *De planningsfout*
**Summary.** Walking through Diagon Alley Harry experiments on the pouch (it understands “zahav” but
not “90 plus 25 Galleons”), despairs that “magic” explains nothing, and privately claims the
universe for Science. He wants an emergency healer's kit; McGonagall suspects a dangerous plan; his
joke about a dying classmate makes the salesgirl flee, and in a silenced alley McGonagall explains
that the war ended only ten years ago. Harry explains the planning fallacy and why he must always
imagine the worst. A second alley: she asks whether he was abused; he explodes, she says she
believes him but something in him does not match the loving family she saw; he offers isolation as
the explanation. After Ollivander's Harry has a wand that is the brother of the Dark Lord's;
McGonagall's fixed smile tells him the Dark Lord is not dead and that there may be a prophecy. Harry
coldly bargains for the truth, warns her not to Obliviate him, and she names the only two others who
know: Dumbledore and Snape. At the trunk shop the money runs out; Harry produces the smuggled
Galleons as a lesson about adults who do not listen, and she lets it pass. At the Leaky Cauldron
they part; she tells him to look for Hermione Granger. Aftermath: Dumbledore asks Minerva how she
found Harry; she cannot speak.
**Scenes.** s1 pouch experiments, “claim this territory”, “Ooh, shiny!” · `\later` s2 healer's-kit
shop → first alley (war, planning fallacy) · `\later` s3 shop again (Della), owl, second alley
(abuse, Obliviation, isolation) · `\later` s4 evening, Ollivander's done, brother wand, Sirius
Black, the Dark Lord lives, blackmail, Dumbledore and Snape named · `\later` s5 trunk shop, 97
Galleons, +1 point · `\later` s6 courtyard farewell, wand warning, “Hermione Granger.” ·
`\latersection{Nasleep}` Dumbledore and Minerva.
**Tone / jokes.** Alternation of comedy and sudden seriousness; the narrator never signals the
switch. Harry's ominous-resolution paragraph is grandiose on purpose (*Jullie zijn nu van mij… Ik,
Harry James Potter-Evans-Verres, eis dit gebied op in naam van de Wetenschap*) and is immediately
undercut by the weather. McGonagall's “Gryffindors,” spat, is one word carrying despair. The abuse
scene is the first time Harry loses control: short hissed sentences, *Anderling* without title,
still *u*.
**Traps.** Pouch commands in lowercase quotes: *“zak goud”*, *“zak element 79”*, *“zak met 115
Galjoenen”*. “With respect” / “With respect” → *Met alle respect* both times. “phlogiston, élan
vital, emergence, complexity” kept. “Muggle-born” → *Dreuzelgeboren*. “sore loser” → *slechte
verliezer*. “Ooh, shiny!” → *Ooo, glimmend!* “Bag of Holding” kept, glossed. “Great Scott!” literal
(explained). “Look of Doom” → *Blik des Doems*. The Tom Lehrer lines: *Wees voorbereid! Dat is het
marslied van de padvinder! Wees voorbereid! Terwijl je door het leven marcheert! Wees niet nerveus,
niet in paniek, niet bang — wees voorbereid!* “once or seven times” → *één of zeven keer*. The
planning-fallacy percentages (50/75/99 → 13/19/45) exact. “social services” → *de
kinderbescherming*; “head teacher” → *het schoolhoofd*. “Obliviating you” → *je geheugen wissen*.
Ollivander's quoted line (canon) → *Het is heel merkwaardig dat juist jij voorbestemd bent voor deze
toverstok, terwijl zijn broer… zijn broer jou dat litteken bezorgde.* (fixed; a quoted sentence may
keep its subordinate clause). “Frodo Baggins… Mount Doom” → *Frodo Balings… de Doemberg*. “Azkaban.
Wizarding prison.” → *Azkaban. De tovenaarsgevangenis.* The purple-prose parody (“His spirit
lingers, whispering…”) stays purple. The sarcastic italic run (“It was an *act* of utter
*optimism*…”) keeps ten italics. The `\begin{em}` tactics block is a list of failures: *Zeg dat je
het recht hebt om het te weten: mislukt.* “How dare you!” / “How dare you!” → *Hoe durf je!* (McG) /
*Hoe durft u!* (Harry). “that isn't done” → *Dat hoort niet.* “So, my dear, how did you find Harry?”
→ *Zo, beste Minerva, wat vond je van Harry?*
**Decisions.** *EHBO-set* for the generic kit, *Nood-Heelpakket Plus* for the product; *de oorlog*;
Harry keeps *u* in fury; Dumbledore → Minerva *je*.

### Chapter 7 — Reciprocation → *Wederkerigheid*
**Summary.** At King's Cross Harry says goodbye to a tearful Petunia and to Michael, who spent a
thousand pounds on thirty boxes of science books. He cannot find Platform 9¾, lets slip that
McGonagall may have been “distracted”, and flees to a red-haired family who recognise him from the
newspapers — so his father learns about the Dark Lord on the platform. Through the barrier, Harry
disguises himself with a scarf, meets Ron Weasley, demolishes Quidditch, and is found by Draco; Ron
storms off. Harry and Draco trade confidences (Draco's father at his hospital bed; Harry's wish for
a father who takes him seriously), buy Comed-Tea, and spit it out over a Quibbler headline that says
Harry got Draco pregnant. Draco's casual plan to rape the ten-year-old Luna Lovegood when he is old
enough, and his explanation of how Malfoy justice works, freeze Harry's blood; he answers Draco's
blood-purity creed with a photograph of the Earth from the Moon and an offer to teach him science,
on condition that Draco plays his own game. Two scarfed figures invite “Mr Bronze” to join the Order
of Chaos. Aftermath: Draco writes to his father and asks what to make of a boy who called Lucius a
flawless instrument of death; Lucius replies that the boy must be Severus Snape's confidant. Draco
burns the letter.
**Scenes.** one long scene (farewell → Weasleys → barrier → Ron → Draco → Comed-Tea stall → picnic
table → Order of Chaos) · `\latersection{Nasleep}` Draco's letter and the reply.
**Tone / jokes.** Begins tender, turns to farce (the family finding out), to banter, to horror, to a
sermon with a photograph, and ends on a joke. Each turn is unannounced. The Comed-Tea spit-takes
must land: headline in `\headline{…\\…}`, Draco's *Gah!*, the green liquid. Draco's blood-purity
creed is chanted; give it rhythm and archaic colour (*Waar Zalazar en Goderic en Rowena en Helga
ooit Zweinstein optrokken door hun macht…*). Harry's Moon speech is sincere; let it be long in
sentences but short in clauses.
**Traps.** “Magic ran in families, and Michael Verres-Evans couldn't even walk” — run/walk pun
untranslatable; render *Magie zit in de familie, zeggen ze. Michael Verres-Evans kon er niet eens
naar kijken.* (ties to the previous sentence). “go boil his head” → see voice §8. “come with” →
*meekomen*. “abort” → *afbreken*. “Cor” → *Jeetje*; “mate” → *man*. “The Force is not particularly
strong in this one” → *De Force is niet erg sterk in deze.* “Mister Black” → *meneer Zwarts* (Harry
looks at his black robes; Sirius Zwarts). “Noble and Most Ancient House of Black” → *het Edele en
Oeroude Huis Zwarts*. “Buy…a…clock.” → *Koop… een… klok.* “Ninety-Five Theses of the Snitchless
Reformation” → *de Vijfennegentig Stellingen van de Snaailoze Reformatie*. “c-crucify” →
*k-kruisigen*. “international man of mystery” → *internationale man van mysterie*. “evil with a
capital ‘E’” → *Kwaad met een hoofdletter K*. “How droll” → *Wat geestig. Wat ontzettend geestig.*
“four Sickles, four Knuts” exact. “limer than lime” → *limoeniger dan limoen*. Headline: *Jongen Die
Bleef Leven Maakt \\ Draco Malfidus Zwanger*. “You son of a mudblood!” → *Jij zoon van een
Modderbloedje!* Draco's line about Luna → *Zodra ik oud genoeg ben, ga ik haar verkrachten.* —
plain, no euphemism. “Holy crap on a holy stick” → *Heilige stront op een heilige stok.* “my word is
my bond” → *een man een man, een woord een woord*. “done by” (sexual) → *gepakt door*. “weirder
taste than a Lestrange” → *dan een Van Detta*. “so sane it burns like ice” → see motifs.
“Enlightenment” → *de Verlichting*; “Fall from Grace” → *de Zondeval*. “a thousand million Galleons”
→ *een miljard Galjoenen*. “We came in peace, for all mankind” → *Wij kwamen in vrede, voor de hele
mensheid.* “Imperio / Imperius” kept. “Help would be helpful” → *Hulp helpt.* “Learning to admit
you're wrong” → *Leren toegeven dat je fout zit.* (one *dat*-clause allowed in an aphorism).
Letters: *Lieve Vader:* / *Mijn geliefde zoon:*; the quoted phrases identical to Harry's earlier
words.
**Decisions.** *Komedie-Thee* (pun translated); *het Brandstofnetwerk* (official form uncertain);
*Zorgvuldigheid*; Harry ↔ Draco *je* from here on; Draco → *Vader*, *u*.

### Chapter 8 — Positive Bias → *Positieve bias*
**Summary.** Hermione Granger sits alone in the last carriage, not sad, rereading *Hogwarts: A
History*, when a scarfed boy asks the corridor for the six quarks and for her. He is Harry Potter;
she recites what the books say about him. He tests her memory with a Potions textbook, gives her a
can of green drink, asks her to help him take over the universe (“I'm not evil”), and when she
demands a show of intelligence makes a stain vanish by snapping his fingers. Her investigation of
the trick leads through the 2–4–6 game, where she learns what positive bias is, to the right answer:
the drink was enchanted, not the robes. Neville Longbottom appears looking for his toad; Harry sends
him to the prefects, and Neville recognises him as one of the Lords of Chaos who gave him chocolate
at the station. Harry defends the prank as desensitisation and consequentialism. Neville returns in
tears: a Gryffindor prefect refused to help. Harry goes cold, takes Neville's hand and leaves;
Hermione sits stunned and a little disappointed in Gryffindor.
**Scenes.** one scene in the compartment, in Hermione's POV throughout.
**Tone / jokes.** Hermione's inner voice: orderly, slightly indignant, fond of lists and of tests.
Harry sounds, to her, “like a book”. The comedy is her trying to be angry and failing to find the
words. The 2–4–6 exchange is a numbered dialogue; keep the numbers as digits with en dashes
(*4–6–8*). The end turns quiet.
**Traps.** Keep *de jongen* until she makes the connection, then *Harry Potter* in full, exactly
where the source switches. The six quarks stay English (*up, down, strange, charm, truth, beauty*).
“PC or NPC” kept. “Girls weren't supposed to listen to those” (after *proposition*) → *Een voorstel?
Daar hoorden meisjes niet naar te luisteren.* “can of pop” → *blikje prik*. “No thank you, I'm not
evil” → *Nee, dank je, ik ben niet slecht.* “Nope, no banana.” → *Nee. Geen banaan.* “Eek! My
clothes!” → *Iiiek! Mijn kleren!* “widdershins and deasil” → *tegen de zon in en met de zon mee*.
“unicorn bogies” → *eenhoornsnot*. “oil of sharpness”, “potion of spider climbing” → *olie van
scherpte*, *drank van spinnenklimmen*. “Three real numbers in increasing order, lowest to highest.”
→ *Drie reële getallen in stijgende volgorde, van laag naar hoog.* “I never!” → *Welnee!* “there are
three of me on this train” → *er zitten er drie van mij in deze trein*. “Stay!” (to the trunk) →
*Blijf!* Harry's book list stays English. “History: A Hogwarts” → *Geschiedenis: Een Zweinstein*
(intentional). “steamroller… pancake” → *stoomwals… pannenkoek*. The epigraph is the in-text warning
with slightly different wording; align the two Dutch sentences on *mijn vindingrijkheid uitdagen…
een stuk surrealistischer*.
**Decisions.** *Hoofd van de Wikenweegschaar* (proposed); Harry → Hermione mock-formal *juffrouw
Griffel* + *u*.

### Chapter 9 — Self Awareness, Part I → *Zelfbewustzijn, deel I*
**Summary.** The Sorting. Names are called; Harry, still shaken by the ghosts, studies the Head
Table: the ancient smiling headmaster, a dour man who stares at him, the pale twitching man from the
pub, a tiny man on a chair whom the prefect Miss Clearwater identifies as Flitwick, Head of
Ravenclaw and of goblin ancestry — which sets Harry off on genetics until Hermione says “Lithuania”.
Hermione goes to Ravenclaw, Neville to Hufflepuff, Draco to Slytherin. When “Potter, Harry!” is
called the hall falls silent and the Weasley twins start a chant. From McGonagall's view: the staff
react, Snape crushes his goblet, the twins shout about Dark Lords who are Professors. Harry, warm
and awful inside, resolves to live up to the cheering, bows, sits, puts on the Hat and fires
questions at it — and a second voice says this has never happened before.
**Scenes.** s1 the roll-call to “Potter, Harry!” · `\later` s2 McGonagall's POV at the Head Table ·
`\later` s3 Harry walks, puts on the Hat.
**Tone / jokes.** The roll-call is typography: name, *Stilte.* (“Pause.”), shout. Harry's genetics
whisper is a 90-word sentence of nested questions — split into five or six whispered sentences but
keep every hypothesis (goblins from humans? common ancestor? heritable enchantment?). McGonagall's
POV is tense and dry (*Minerva's lips set in a white line*); Harry's walk is grand and self-aware.
**Traps.** Roll-call order as in source. “Pause.” → *Stilte.*; “Long pause.” → *Lange stilte.*
“wizened and bespectacled ancient” → *een oude, gerimpelde man met een bril*. “Wise Old Man… without
actually being Oriental” → keep, *zonder echt Oosters te zijn*. “Hssh!” → *Sst!* “Lithuania” →
*Litouwen.* “talk about your foregone conclusions” → *over uitgemaakte zaken gesproken*. “Clever
kids in Ravenclaw…” fixed. “stage fright” → *plankenkoorts*. “Save us from some more Dark Lords!” /
“Especially if they're Professors!” → *Red ons van nog meer Duistere Heren!* / *Vooral als het
professoren zijn!* “detentions” → *strafwerk*. The Hat's song (Lumberjack parody): *O, ik ben de
Sorteerhoed en ik ben oké, ik slaap het hele jaar en werk één dag mee…* Harry's barrage of questions
to the Hat is one `\emph` block; split into short questions. Last line → *“\emph{O jee. Dit is nog
nooit gebeurd…}”*
**Decisions.** Roll-call keeps source order; Harry → prefect *u*; *Stilte.* for “Pause.”

### Chapter 10 — Self Awareness, Part II → *Zelfbewustzijn, deel II*
**Summary.** Inside Harry's head the Hat explains that it borrows the mind of whoever wears it and
that Harry's wondering has made it self-aware, which it dislikes; it asks for secrecy and will not
be blackmailed — until Harry threatens not to talk, and the two agree to trade. It cannot tell him
whether he was Obliviated, cannot speak of the Dark Lord, finds no ghost in his scar, and wants to
talk about his anger: Ravenclaw or Slytherin will strengthen his coldness, Hufflepuff or Gryffindor
his warmth. Harry refuses Hufflepuff; the Hat calls him Dark Lord material, cites the guillotine
thought and the Neville prank, and asks what he fears if he fails — he does not know, and will not
look. Harry insists on Ravenclaw; the Hat, sad, declines Gryffindor with a joke about McGonagall's
lawn, asks Harry to notice that it is about to die and that he forgot the lost magic, and shouts
“SLYTHERIN!” to a horrified hall — then “Just kidding! RAVENCLAW!”
**Scenes.** one scene, almost entirely telepathic dialogue; one bracketed cut to the hall.
**Tone / jokes.** A philosophical duel in which the Hat wins every exchange with Harry's own tools.
Register: the Hat is dry and exact; Harry escalates to capitals. The sadness is real and so is the
final gag; both must survive. Keep the typographic split: Hat = `“\emph{…}”`, Harry = `\emph{…}`; in
Dutch the *je* on both sides keeps it intimate.
**Traps.** “I seem to have become self-aware” → *Ik ben, zo lijkt het, zelfbewust geworden.* “Oops.”
→ *Oeps.* “I'm a hat, not a god.” → *Ik ben een hoed, geen god.* “utility functions” →
*nutsfuncties*; “reference class” → *referentieklasse*; “rationalisation” → *rationalisatie*.
“kicked the hat in the balls” → *de hoed in zijn ballen geschopt*. “Hail the Dark Lord Harry” →
*Heil Harry, Heer van het Duister*. “Heard it.” → *Al gehoord.* “I DON'T KNOW! BUT I KNOW THAT IT'S
BAD!” → capitals kept. “NO, AND THAT'S FINAL!” → *NEE, EN DAARMEE UIT!* “a strange sad clothy sound”
→ *een vreemd, droevig, stoffig geluid*. “House of Doom” → *Afdeling des Doems*. “impudent
youngster… get off my lawn” → *een brutaal jong ding… van mijn gazon af*. “Not even close.” → *Bij
lange na niet.* “Too s-s-slow—” → *Te l-l-langzaam—*. “dropped the remains… directly onto his groin”
→ *in zijn kruis*. “Just kidding! RAVENCLAW!” → *Grapje! RAVENKLAUW!* The Hat quotes Harry's ch 9
sentence and McGonagall's ch 6 remark about killing a hat — reuse the earlier Dutch wording.
**Decisions.** Hat ↔ Harry *je*; *schoolhoofd* for “Headmistress”; *potentiële Heer van het
Duister*; *je kou / je warmte versterken*.

## Spoilers

Facts from the whole book that a reader of chapters 1–10 does not know. They exist
only so that early wording does not block a later payoff. Never explain them in the
text; never add menace, irony or hints the source does not have.

- **(>= ch 20, fully >= ch 104)** Professor Quirrell is possessed by / is Voldemort. Harry's ch 3
  feeling (*een vreemd gevoel*, should not shake his hand) and the twitching, vacant man of ch 9
  must be rendered flat and neutral. The twins' joke about Dark Lords who are Professors (ch 9) must
  stay ambiguous between Snape and Quirrell.
- **(>= ch 86, 104–110)** Harry's “dark side” — the coldness, the blood going cold, the dark clarity
  — is the imprint of Voldemort's personality. Keep the *kou / koud / ijzig* motif word-for-word
  consistent from ch 6 on. The Hat's ch 10 statement that there is “nothing like a ghost” in the
  scar is literally true in the book's final account (no separate mind); translate its list (mind,
  intelligence, memory, personality, feelings) exactly.
- **(>= ch 14)** Harry's 26-hour sleep cycle is solved with a Time-Turner (*Tijdverdrijver*).
  McGonagall's “I'll find a solution in time” (ch 2) → *Ik vind wel op tijd een oplossing* keeps the
  pun on *tijd*.
- **(>= ch 76, 86)** There is a real prophecy; McGonagall's ironic murmur in ch 5 is its first line.
  The fixed Dutch wording *degene met de macht om de Heer van het Duister te verslaan* must be
  reused verbatim later.
- **(>= ch 27)** Snape loved Lily; his hatred of Harry is about James. His goblet-crushing in ch 9
  is rendered without comment.
- **(>= ch 118)** The “Sirius Black betrayed your parents” story (ch 6) is what McGonagall believes;
  the book later overturns it. Keep her lines as her belief, with no narrator endorsement added.
- **(>= ch 17, 72)** Mrs Figg is a Squib placed next door by Dumbledore to watch Harry. Ch 1 must
  not hint at this; she is just the babysitter who knows about Hogwarts.
- **(>= ch 86)** The narrator's bracketed aside in ch 3 about Harry failing to notice “something
  wrong about that story” pays off much later; translate the bracket exactly, including “it should
  have been a part of Harry's art” → *zijn kunst als rationalist*.
- **(>= ch 89, 110+)** Hermione dies (troll) and is later revived. Harry's ch 6 fantasy of a
  classmate who dies asking “Why weren't you prepared?” is foreshadowing: keep the feminine pronouns
  and the exact question *Waarom was je niet voorbereid?*
- **(>= ch 38, 81)** Lucius's reply in ch 7 (Harry must be Snape's confidant) seeds a long
  misunderstanding between Lucius and Harry; keep the letter's wording formal and exact (*onze
  vriend en waardevolle bondgenoot, Severus Sneep*).
- **(>= ch 22, 30+)** Harry and Draco's “game” becomes the Bayesian Conspiracy; the Order of Chaos
  becomes Harry's army, the Chaos Legion (*het Chaos Legioen*). Keep *het spel* and *de Orde van de
  Chaos* stable.
- **(>= ch 51–63)** Bellatrix Black (HPMOR keeps her maiden name) is broken out of Azkaban by Harry.
  The ch 7 “Lestrange” is the Lestrange family (*Van Detta*), not her. The glossary flags the
  *Zwarts / van Detta* conflict for when she appears.
- **(>= ch 8 author's note, later chapters)** Luna's headline is treated by the author as a true
  prophecy misread by her father; nothing to do in ch 7 except translate the headline exactly.
- **(>= ch 114–115)** The ch 1 epigraph (silver fragment, black robes falling, blood in litres,
  someone screaming a word) is the climax of the book: the glinting line is Harry's transfigured
  thread, and the black robes that fall are the Death Eaters — several people, not one. Hence the
  plural in ch 1: *(zwarte gewaden, vallend)*. Fixed Dutch wording of the three lines, to be reused
  byte-identically when the text reaches that scene: *Onder het maanlicht glimt een heel klein stukje
  zilver, een fractie van een lijn…* / *(zwarte gewaden, vallend)* / *…liters bloed stromen naar
  buiten, en iemand schreeuwt een woord.* Translate it literally in the present tense and do not
  make it sound like a dream or a metaphor.
