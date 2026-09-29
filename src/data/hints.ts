import { itemKey, type Direction } from "../types";

// Hand-curated, regen-proof disambiguation hints for colliding cards.
//
// No build script (convert / convert:nt2lex / clean / enrich) touches this file,
// so these survive every regeneration. Keyed by itemKey (`${cardId}:${dir}`).
// When a hint exists it is shown inline on the prompt IN PLACE OF the generic
// "Show example" button.
//
// These exist for NL→EN collisions, where the Dutch prompt is identical across
// cards (e.g. "zij" = she / they) and an example sentence can't tell them apart.
// A hint names the SENSE or GRAMMAR of the wanted answer to steer recall without
// simply printing the translation. Add more as new collisions surface; see
// `node scripts/enrich/analyze-collisions.mjs` for the current list.
const HINTS: Record<string, string> = {
  // dag — greeting vs noun
  "c18:nl_en": "greeting",
  "c171:nl_en": "noun · time",
  // u — polite/formal you (subject vs object)
  "c47:nl_en": "formal",
  "c1262:nl_en": "object",
  // zij — she vs they
  "c49:nl_en": "singular",
  "c52:nl_en": "plural",
  // jullie — subject vs possessive
  "c51:nl_en": "subject pronoun",
  "c783:nl_en": "possessive",
  // zijn — verb vs possessive
  "c65:nl_en": "verb",
  "c779:nl_en": "possessive",
  // nee — answer vs polite refusal
  "c87:nl_en": "one word",
  "c229:nl_en": "polite refusal",
  // binnen — place vs time
  "c107:nl_en": "place",
  "c1657:nl_en": "time / limit",
  // bord — blackboard vs plate vs traffic sign
  "c159:nl_en": "in a classroom",
  "c404:nl_en": "for food",
  "c702:nl_en": "on the road",
  // alsjeblieft — giving vs asking
  "c223:nl_en": "when giving",
  "c248:nl_en": "when asking",
  // weg — adjective sense
  "c246:nl_en": "adjective · gone / absent",
  // boven — in a house vs position
  "c282:nl_en": "in a house",
  "c727:nl_en": "position",
  // kopje — cup vs headline
  "c297:nl_en": "for drinking",
  "c1023:nl_en": "in a text",
  // bank — furniture vs money
  "c303:nl_en": "furniture",
  "c1672:nl_en": "money",
  // vinden — locate vs opinion
  "c357:nl_en": "to locate",
  "c423:nl_en": "to think / opinion",
  // eten — verb vs noun
  "c384:nl_en": "verb",
  "c406:nl_en": "noun",
  // op — adjective vs preposition
  "c411:nl_en": "adjective · used up",
  "c694:nl_en": "preposition",
  "c731:nl_en": "preposition · top",
  // aan — device state vs preposition
  "c427:nl_en": "device state",
  "c726:nl_en": "preposition",
  // uit — device state vs preposition
  "c438:nl_en": "device state",
  "c735:nl_en": "preposition",
  // ons — weight vs possessive vs object pronoun
  "c447:nl_en": "weight",
  "c781:nl_en": "possessive",
  "c1265:nl_en": "object pronoun",
  // pak — package vs clothing
  "c474:nl_en": "a package",
  "c624:nl_en": "clothing",
  // haar — body vs possessive
  "c497:nl_en": "body · noun",
  "c780:nl_en": "possessive",
  // halen — fetch vs be in time
  "c527:nl_en": "to collect",
  "c766:nl_en": "to make it in time",
  // net — adjective vs adverb
  "c623:nl_en": "adjective",
  "c791:nl_en": "time · just now / nearly",
  // over — time vs topic
  "c695:nl_en": "time · remaining",
  "c732:nl_en": "topic",
  // voor — time vs place
  "c700:nl_en": "time",
  "c736:nl_en": "place · position",
  // kaart — map vs card
  "c717:nl_en": "geography",
  "c973:nl_en": "paper / playing",
  // leven — verb vs noun
  "c804:nl_en": "verb",
  "c1643:nl_en": "noun",
  // weer — weather vs again
  "c819:nl_en": "noun",
  "c850:nl_en": "adverb",
  // huiswerk — verb phrase vs noun
  "c929:nl_en": "verb phrase",
  "c1449:nl_en": "noun",
  // door — cause vs passage
  "c1051:nl_en": "cause",
  "c1564:nl_en": "passage",
  // opnemen — phone vs record
  "c1192:nl_en": "a phone call",
  "c1747:nl_en": "audio / video",
  // zeer — adverb vs adjective
  "c1385:nl_en": "adverb",
  "c1713:nl_en": "adjective · pain",
  // kennis — person vs abstract
  "c1478:nl_en": "a person",
  "c1510:nl_en": "abstract",
  // stuk — adjective vs noun
  "c1527:nl_en": "adjective",
  "c1615:nl_en": "piece / individual item",

  // ---- Inburgering Online · Medium 1: near-translation contrasts.
  // These cards do not have duplicate Dutch prompts. The hint distinguishes
  // closely translated words so the learner recalls the intended nuance.
  // even / net / pas — all can be translated "just"
  "c640:nl_en": "briefly · for a moment",
  "c640:en_nl": "briefly · for a moment",
  "c791:en_nl": "time · just now / nearly",
  "c906:nl_en": "only · not until",
  "c906:en_nl": "only · not until",
  // om / bij — both may be "at"
  "c693:nl_en": "time / around",
  "c693:en_nl": "time / around",
  "c749:nl_en": "near / with",
  "c749:en_nl": "near / with",
  // tijd / keer — both may be "time"
  "c599:nl_en": "time · duration",
  "c599:en_nl": "time · duration",
  "c559:nl_en": "time · occasion / count",
  "c559:en_nl": "time · occasion / count",
  // weg / heen — both may be "away"
  "c246:en_nl": "gone / absent",
  "c10127:nl_en": "direction · away / towards",
  "c10127:en_nl": "direction · away / towards",
  // deel / stuk — both may be "part"
  "c1235:nl_en": "part of a whole",
  "c1235:en_nl": "part of a whole",
  "c1615:en_nl": "piece / individual item",
  // mensen / volk — both may be "people"
  "c196:nl_en": "individual people / humans",
  "c196:en_nl": "individual people / humans",
  "c2121:nl_en": "a nation / community",
  "c2121:en_nl": "a nation / community",
  // sterk / kracht / macht — strength, force, authority
  "c1467:nl_en": "adjective · strong",
  "c1467:en_nl": "adjective · strong",
  "c2361:nl_en": "physical force / strength",
  "c2361:en_nl": "physical force / strength",
  "c2426:nl_en": "authority / control",
  "c2426:en_nl": "authority / control",
  // bang / angst — the feeling vs the noun
  "c1155:nl_en": "adjective · afraid",
  "c1155:en_nl": "adjective · afraid",
  "c1861:nl_en": "noun · fear",
  "c1861:en_nl": "noun · fear",
  // juist / waar — correct vs factually true
  "c1319:nl_en": "correct / right",
  "c1319:en_nl": "correct / right",
  "c10128:nl_en": "factually true",
  "c10128:en_nl": "factually true",
  // zachter / stil — quietness, but not the same form or meaning
  "c998:nl_en": "comparative · softer / quieter",
  "c998:en_nl": "comparative · softer / quieter",
  "c994:nl_en": "quiet / silent / still",
  "c994:en_nl": "quiet / silent / still",
  // oog / blik — organ vs a look
  "c503:nl_en": "physical organ",
  "c503:en_nl": "physical organ",
  "c10129:nl_en": "a glance / manner of looking",
  "c10129:en_nl": "a glance / manner of looking",
  // zin / doel — sentence or meaning vs an objective
  "c64:nl_en": "grammar · sentence",
  "c64:en_nl": "grammar · sentence",
  "c2266:nl_en": "aim / objective",
  "c2266:en_nl": "aim / objective",

  // ---- EN→NL collisions. Only listed where ≥2 cards share the EXACT English
  // prompt, so the hint actually disambiguates which Dutch word is wanted (a
  // hint on a unique prompt is noise). The hint names the register/number/nuance
  // without printing the answer. Pure synonyms with no clean distinguisher
  // (very, nice, beautiful, ...) are left to the example button.
  // "we" — wij (stressed) / we (unstressed)
  "c50:en_nl": "stressed",
  "c10110:en_nl": "unstressed",
  // "me" — mij (stressed) / me (unstressed)
  "c1260:en_nl": "stressed",
  "c10112:en_nl": "unstressed",
  // "you" — je (unstressed) / jou (object) / u (formal object)
  "c10107:en_nl": "unstressed",
  "c1261:en_nl": "object",
  "c1262:en_nl": "formal · object",
  // "myself" — zelf / mezelf
  "c678:en_nl": "on its own",
  "c10118:en_nl": "with 'me-'",
  // "you are" — jij bent / u bent / jullie zijn
  "c67:en_nl": "informal",
  "c69:en_nl": "formal",
  "c74:en_nl": "plural",
  // "you have" — jij hebt / u hebt / jullie hebben
  "c99:en_nl": "informal",
  "c101:en_nl": "formal",
  "c105:en_nl": "plural",
  // "hello" — hallo / dag
  "c18:en_nl": "good day",
  // "bye" — doei / tot ziens
  "c19:en_nl": "informal",
  "c28:en_nl": "'see you'",
  // "please" / "Please" — alsjeblieft / alstublieft
  "c248:en_nl": "informal",
  "c439:en_nl": "formal",
  // "dear" — beste / lief
  "c1093:en_nl": "in a letter",
  "c1099:en_nl": "affectionate",
  // "no" — geen / nee
  "c77:en_nl": "not a / any",
  "c87:en_nl": "as an answer",
  // "yes" — ja / jawel
  "c82:en_nl": "plain",
  "c890:en_nl": "emphatic",
  // "to know" — weten / kennen
  "c245:en_nl": "a fact",
  "c536:en_nl": "a person / place",
  // "to understand" — begrijpen / snappen
  "c194:en_nl": "to grasp",
  "c746:en_nl": "informal",
  // "teacher" — docent / leraar
  "c110:en_nl": "higher education",
  "c1346:en_nl": "at school",
  // "place" — plaats / plek
  "c271:en_nl": "a location",
  "c744:en_nl": "a spot (informal)",
  // "toilet" — wc / toilet
  "c287:en_nl": "informal",
  "c1562:en_nl": "formal",
  // "classroom" — klas / lokaal
  "c208:en_nl": "the group",
  "c1160:en_nl": "the room",
  // "to walk" — lopen / wandelen
  "c112:en_nl": "to go on foot",
  "c818:en_nl": "to stroll",
  // "difficult" — moeilijk / lastig
  "c197:en_nl": "hard",
  "c1427:en_nl": "tricky / annoying",
  // "this" — deze (de-word) / dit (het-word)
  "c10109:en_nl": "de",
  "c10111:en_nl": "het",
  // "that" — die (de-word) / dat (het-word)
  "c10161:en_nl": "de",
  "c10105:en_nl": "het",
  // "there" — daar (specific / pointing) / er (neutral / dummy)
  "c552:en_nl": "specific",
  "c10106:en_nl": "neutral",
};

export function getHint(cardId: string, dir: Direction): string | undefined {
  return HINTS[itemKey(cardId, dir)];
}
