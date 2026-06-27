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
  // u — polite/formal you
  "c47:nl_en": "formal",
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
  "c246:nl_en": "adjective · gone",
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
  "c791:nl_en": "adverb · time",
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
  "c1615:nl_en": "noun",

  // ---- EN→NL collisions: same English prompt, several Dutch words. The hint
  // names the register/number/nuance of the wanted Dutch word. Pure synonyms
  // with no clean distinguisher (very, nice, beautiful, ...) are intentionally
  // left to the example button.
  // you are — jij bent / u bent / jullie zijn
  "c67:en_nl": "informal",
  "c69:en_nl": "formal",
  "c74:en_nl": "plural",
  // you have — jij hebt / u hebt
  "c99:en_nl": "informal",
  "c101:en_nl": "formal",
  // hello — hallo / dag
  "c1:en_nl": "neutral",
  "c18:en_nl": "also means 'bye'",
  // bye — dag / doei / tot ziens
  "c19:en_nl": "informal",
  "c28:en_nl": "'see you'",
  // please — alsjeblieft / alstublieft / graag
  "c248:en_nl": "informal",
  "c439:en_nl": "formal",
  "c226:en_nl": "= gladly",
  // dear — beste / lief / geachte
  "c1093:en_nl": "in a letter",
  "c1099:en_nl": "affectionate",
  "c1171:en_nl": "formal letter",
  // no — geen / nee
  "c77:en_nl": "not a / any",
  "c87:en_nl": "as an answer",
  // yes — ja / jawel
  "c890:en_nl": "emphatic",
  // to know — weten / kennen
  "c245:en_nl": "a fact",
  "c536:en_nl": "a person / place",
  // to understand — begrijpen / snappen / verstaan
  "c194:en_nl": "to grasp",
  "c746:en_nl": "informal",
  "c882:en_nl": "to make out speech",
  // to hear — horen
  "c81:en_nl": "with your ears",
  // to get — krijgen / pakken / halen
  "c254:en_nl": "to receive",
  "c352:en_nl": "to grab",
  "c527:en_nl": "to fetch",
  // student — cursist / leerling / student
  "c109:en_nl": "course attendee",
  "c1203:en_nl": "school pupil",
  "c1394:en_nl": "at university",
  // teacher — docent / leraar
  "c110:en_nl": "higher education",
  "c1346:en_nl": "at school",
  // place — plaats / plek
  "c271:en_nl": "a location",
  "c744:en_nl": "a spot (informal)",
  // quiet — rustig / stil
  "c273:en_nl": "calm",
  "c994:en_nl": "silent",
  // toilet — wc / toilet
  "c287:en_nl": "informal",
  "c1562:en_nl": "formal",
  // classroom — klas / lokaal
  "c208:en_nl": "the group",
  "c1160:en_nl": "the room",
  // to walk — lopen / wandelen
  "c112:en_nl": "to go on foot",
  "c818:en_nl": "to stroll",
  // difficult — moeilijk / lastig
  "c197:en_nl": "hard",
  "c1427:en_nl": "tricky / annoying",
};

export function getHint(cardId: string, dir: Direction): string | undefined {
  return HINTS[itemKey(cardId, dir)];
}
