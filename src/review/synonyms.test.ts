import { buildAnswerPools, pooledAccepted } from "./synonyms";
import type { Card } from "../types";

const card = (id: string, dutch: string, english: string[]): Card => ({
  id,
  group: "g",
  dutch,
  english,
  type: "word",
});

describe("buildAnswerPools", () => {
  it("unions English across cards that share the same (article-stripped) Dutch", () => {
    const cards = [card("c1", "de bank", ["bank"]), card("c2", "bank", ["couch"])];
    const pools = buildAnswerPools(cards);
    expect(pools.byDutchKey.get("bank")?.sort()).toEqual(["bank", "couch"]);
  });

  it("unions Dutch (with article variants) across cards that share an English gloss", () => {
    const cards = [card("c1", "leuk", ["nice"]), card("c2", "de hond", ["nice"])];
    const pools = buildAnswerPools(cards);
    const got = pools.byGlossKey.get("nice")!;
    expect(got).toContain("leuk");
    expect(got).toContain("de hond");
    expect(got).toContain("hond"); // article-stripped variant
  });

  it("does not merge unrelated keys", () => {
    const cards = [card("c1", "kat", ["cat"]), card("c2", "hond", ["dog"])];
    const pools = buildAnswerPools(cards);
    expect(pools.byDutchKey.get("kat")).toEqual(["cat"]);
    expect(pools.byGlossKey.get("cat")).toEqual(["kat"]);
  });
});

describe("pooledAccepted", () => {
  it("NL->EN: accepts sibling glosses for the same Dutch word", () => {
    const cards = [card("c1", "dag", ["hello"]), card("c2", "de dag", ["day"])];
    const pools = buildAnswerPools(cards);
    const accepted = pooledAccepted(cards[0], "nl_en", pools);
    expect(accepted).toContain("hello");
    expect(accepted).toContain("day");
  });

  it("EN->NL: accepts any synonym Dutch word for the prompted meaning", () => {
    const cards = [card("c1", "leuk", ["nice"]), card("c2", "aardig", ["nice"])];
    const pools = buildAnswerPools(cards);
    const accepted = pooledAccepted(cards[0], "en_nl", pools);
    expect(accepted).toContain("leuk");
    expect(accepted).toContain("aardig");
  });

  it("NL->EN: also accepts the bare answer for a parenthetical gloss", () => {
    const cards = [card("c1", "de neef", ["cousin (male)"])];
    const pools = buildAnswerPools(cards);
    const accepted = pooledAccepted(cards[0], "nl_en", pools);
    expect(accepted).toContain("cousin (male)");
    expect(accepted).toContain("cousin");
  });

  it("NL->EN: strips trailing placeholder words (someone/something)", () => {
    const cards = [card("c1", "roepen", ["to call somebody"])];
    const pools = buildAnswerPools(cards);
    const accepted = pooledAccepted(cards[0], "nl_en", pools);
    expect(accepted).toContain("to call");
  });

  it("always includes the card's own base answers", () => {
    const cards = [card("c1", "de hond", ["dog"])];
    const pools = buildAnswerPools(cards);
    expect(pooledAccepted(cards[0], "nl_en", pools)).toContain("dog");
    const enNl = pooledAccepted(cards[0], "en_nl", pools);
    expect(enNl).toContain("de hond");
    expect(enNl).toContain("hond");
  });
});
