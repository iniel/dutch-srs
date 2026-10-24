import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFormIndex, deinflect, textToChapter } from "../src/reader/userText.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(join(root, "public", file), "utf8"));
const cards = read("cards.json");
const enrichment = read("enrichment.json");
const index = buildFormIndex(cards, (id) => enrichment[id]?.grammar);
const byId = new Map(cards.map((c) => [c.id, c]));

function tokens(text) {
  const chapter = textToChapter("user:t", "T", text, index);
  return Object.fromEntries(chapter.blocks.flatMap((b) => b.tokens).map((t) => [t.w, t]));
}
const firstDutch = (ids) => byId.get(ids?.[0] ?? "")?.dutch.replace(/^(de|het) /, "");

describe("user text resolution against the shipped cards", () => {
  it("finds inflected forms through enrichment and de-inflection", () => {
    const t = tokens("Hij liep langs de huizen en woonde daar.");
    expect(t.liep.lemma).toBe("lopen");
    expect(firstDutch(t.huizen.cards)).toBe("huis");
    expect(t.woonde.lemma).toBe("wonen");
  });

  it("joins a clause-final particle with its verb", () => {
    const t = tokens("Elke ochtend staat ze om zeven uur op.");
    expect(t.staat.lemma).toBe("opstaan");
    expect(t.op.cards).toEqual(t.staat.cards);
    expect(firstDutch(t.staat.cards)).toBe("opstaan");
  });

  it("leaves a particle that starts a phrase alone", () => {
    expect(tokens("Hij staat op de stoep.").staat.lemma).not.toBe("opstaan");
  });

  it("splits compounds and marks mid-sentence capitals without a card as names", () => {
    const t = tokens("Twee broodjes en een keukenstoel voor Pieterbas.");
    expect(t.keukenstoel.status).toBe("compound");
    expect(t.keukenstoel.cards.map((id) => firstDutch([id]))).toEqual(expect.arrayContaining(["keuken", "stoel"]));
    expect(t.Pieterbas.status).toBe("name");
  });

  it("keeps paragraphs, line breaks and punctuation spacing", () => {
    const chapter = textToChapter("user:t", "T", "Hallo,\nwereld!\n\nTweede.", index);
    expect(chapter.blocks.map((b) => b.tokens.map((t) => t.w + (t.sp ?? " ")).join(""))).toEqual(["Hallo,\nwereld!", "Tweede."]);
    expect(chapter.words).toBe(3);
  });
});

it("de-inflects open syllables, f/v and z/s", () => {
  expect(deinflect("lopen")).toContain("loop");
  expect(deinflect("brieven")).toContain("brief");
  expect(deinflect("leeft")).toContain("leven");
});
