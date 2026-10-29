import { checkAnswer } from "../review/answerCheck";
import type { GrammarItem } from "./types";
import { perfectumAccepted, perfectumReveal } from "./drill";

const item = (infinitive: string, aux: GrammarItem["aux"], participle: string): GrammarItem => ({
  cardId: "c1",
  infinitive,
  aux,
  participle,
});

describe("perfectumAccepted", () => {
  it("accepts both persons of hebben", () => {
    expect(perfectumAccepted(item("werken", "hebben", "gewerkt"))).toEqual(["heeft gewerkt", "hebben gewerkt"]);
  });

  it("accepts both persons of zijn", () => {
    expect(perfectumAccepted(item("gaan", "zijn", "gegaan"))).toEqual(["is gegaan", "zijn gegaan"]);
  });

  it("accepts all four forms when both auxiliaries are possible", () => {
    expect(perfectumAccepted(item("lopen", "hebben/zijn", "gelopen")).sort()).toEqual(
      ["hebben gelopen", "heeft gelopen", "is gelopen", "zijn gelopen"],
    );
  });

  it("places zich between the auxiliary and the participle", () => {
    expect(perfectumAccepted(item("zich afmelden", "hebben", "afgemeld"))).toEqual([
      "heeft zich afgemeld",
      "hebben zich afgemeld",
    ]);
  });

  it("rejects a misspelled participle under exact checking", () => {
    const accepted = perfectumAccepted(item("wonen", "hebben", "gewoond"));
    expect(checkAnswer("heeft gewoont", accepted, false).correct).toBe(false);
    expect(checkAnswer("heeft gewoond", accepted, false).correct).toBe(true);
  });
});

describe("perfectumReveal", () => {
  it("shows the third-person form", () => {
    expect(perfectumReveal(item("werken", "hebben", "gewerkt"))).toBe("heeft gewerkt");
    expect(perfectumReveal(item("gaan", "zijn", "gegaan"))).toBe("is gegaan");
  });

  it("shows both auxiliaries when either is possible", () => {
    expect(perfectumReveal(item("lopen", "hebben/zijn", "gelopen"))).toBe("is/heeft gelopen");
  });

  it("keeps zich in the revealed form", () => {
    expect(perfectumReveal(item("zich afmelden", "hebben", "afgemeld"))).toBe("heeft zich afgemeld");
  });
});
