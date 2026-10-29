export type GrammarAux = "hebben" | "zijn" | "hebben/zijn";

export interface GrammarItem {
  cardId: string;
  infinitive: string;
  aux: GrammarAux;
  participle: string;
}

export interface GrammarDrill {
  id: string;
  name: string;
  items: GrammarItem[];
}
