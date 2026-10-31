import type { GrammarAux, GrammarItem } from "./types";

const AUX_FORMS: Record<Exclude<GrammarAux, "hebben/zijn">, { singular: string; plural: string }> = {
  hebben: { singular: "heeft", plural: "hebben" },
  zijn: { singular: "is", plural: "zijn" },
};

function auxesOf(aux: GrammarAux): (keyof typeof AUX_FORMS)[] {
  return aux === "hebben/zijn" ? ["zijn", "hebben"] : [aux];
}

function participlePhrase(item: GrammarItem): string {
  return /^zich\s/.test(item.infinitive) ? `zich ${item.participle}` : item.participle;
}

// "hebben" may be omitted like "de"; "zijn" must be typed like "het" — picking zijn is the point.
export function perfectumAccepted(item: GrammarItem): string[] {
  const phrase = participlePhrase(item);
  const auxes = auxesOf(item.aux);
  const withAux = auxes.flatMap((aux) => [
    `${AUX_FORMS[aux].singular} ${phrase}`,
    `${AUX_FORMS[aux].plural} ${phrase}`,
  ]);
  return auxes.includes("hebben") ? [...withAux, phrase] : withAux;
}

export function perfectumReveal(item: GrammarItem): string {
  const auxes = auxesOf(item.aux).map((aux) => AUX_FORMS[aux].singular).join("/");
  return `${auxes} ${participlePhrase(item)}`;
}
