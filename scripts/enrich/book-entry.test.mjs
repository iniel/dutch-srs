import { describe, it, expect } from "vitest";
import { bookLemma, selectBookEntry } from "./book-entry.mjs";

describe("book form disambiguation", () => {
  for (const [surface, lemma, pos, wrong, meaning] of [
    ["kom", "komen", "verb", "bowl", "come"],
    ["heet", "heten", "verb", "hot", "is called"],
    ["dagen", "dag", "noun", "to dawn", "days"],
  ]) it(`selects ${surface} as a form of ${lemma}, not ${wrong}`, () => {
    const form = { word: surface, pos, senses: [{ form_of: [{ word: lemma }], tags: ["form-of"], glosses: [`inflection of ${lemma}`] }] };
    const card = { dutch: surface, english: [meaning], type: "word", notes: `Book annotation: ${lemma}` };
    const index = new Map([[surface, [{ word: surface, pos: "noun", senses: [{ glosses: [wrong] }] }, form]]]);
    expect(selectBookEntry(card, index).entry).toEqual(form);
    expect(bookLemma(card)).toBe(lemma);
  });
  it("rejects an unrelated homograph instead of taking the first entry", () => {
    const index = new Map([["zoek", [{ word: "zoek", pos: "adj", senses: [{ glosses: ["lost"] }] }]]]);
    expect(selectBookEntry({ dutch: "zoek", english: ["am looking"], notes: "Book annotation: zoeken", type: "word" }, index).entry).toBeUndefined();
  });
  it("confirms an inflected lemma through its paradigm when the English is inflected too", () => {
    const form = { word: "dagen", pos: "noun", senses: [{ form_of: [{ word: "dag" }] }] };
    const day = { word: "dag", pos: "noun", forms: [{ form: "dagen" }], senses: [{ glosses: ["day (period of 24 hours)"] }] };
    const rope = { word: "dag", pos: "noun", forms: [{ form: "daggen" }], senses: [{ glosses: ["a piece of rope"] }] };
    const index = new Map([["dagen", [form]], ["dag", [rope, day, { word: "dag", pos: "intj", senses: [{ glosses: ["hello"] }] }]]]);
    expect(selectBookEntry({ dutch: "dagen", english: ["days"], type: "word", notes: "Book annotation: de dag" }, index).base).toBe(day);
    const be = { word: "zijn", pos: "verb", forms: [{ form: "ben" }, { form: "is" }], senses: [{ glosses: ["to be, to exist"] }] };
    const his = { word: "zijn", pos: "det", forms: [{ form: "zijne" }], senses: [{ glosses: ["his"] }] };
    const ben = { word: "ben", pos: "verb", senses: [{ form_of: [{ word: "zijn" }] }] };
    const zijn = new Map([["ben", [ben]], ["zijn", [his, be]]]);
    expect(selectBookEntry({ dutch: "ben", english: ["am"], type: "word", notes: "Book annotation: zijn" }, zijn).base).toBe(be);
  });
  it("does not take a lemma whose paradigm omits the surface form", () => {
    const form = { word: "dagen", pos: "noun", senses: [{ form_of: [{ word: "dag" }] }] };
    const rope = { word: "dag", pos: "noun", forms: [{ form: "daggen" }], senses: [{ glosses: ["a piece of rope"] }] };
    const index = new Map([["dagen", [form]], ["dag", [rope]]]);
    expect(selectBookEntry({ dutch: "dagen", english: ["days"], type: "word", notes: "Book annotation: de dag" }, index).base).toBeUndefined();
  });
  it("selects a noun plural through its lemma even without a book annotation", () => {
    const form = { word: "ouders", pos: "noun", senses: [{ form_of: [{ word: "ouder" }] }] };
    const index = new Map([["ouders", [{ word: "ouders", pos: "adj", senses: [{ glosses: ["elderly"] }] }, form]],
      ["ouder", [{ word: "ouder", pos: "noun", senses: [{ glosses: ["parent"] }] }]]]);
    expect(selectBookEntry({ dutch: "de ouders", english: ["parents"], type: "word" }, index).entry).toEqual(form);
  });
});
