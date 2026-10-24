import { beforeEach, expect, it } from "vitest";
import { MAX_TOTAL_CHARS, USER_TEXTS_KEY, fitsBudget, loadUserTexts, saveUserTexts, userTextTitle } from "./userTexts";

beforeEach(() => localStorage.clear());

it("round-trips texts and drops corrupt entries", () => {
  expect(loadUserTexts()).toEqual([]);
  const text = { id: "t1", title: "Kat", text: "De kat slaapt.", createdAt: 1 };
  expect(saveUserTexts([text])).toBe(true);
  expect(loadUserTexts()).toEqual([text]);
  localStorage.setItem(USER_TEXTS_KEY, JSON.stringify([text, { id: 2 }]));
  expect(loadUserTexts()).toEqual([text]);
  localStorage.setItem(USER_TEXTS_KEY, "{bad");
  expect(loadUserTexts()).toEqual([]);
});

it("titles an untitled text with its first words", () => {
  expect(userTextTitle("  ", "Er was eens een kleine kat die sliep.")).toBe("Er was eens een kleine…");
  expect(userTextTitle("", "Korte tekst.")).toBe("Korte tekst.");
  expect(userTextTitle(" Mijn titel ", "x")).toBe("Mijn titel");
});

it("caps the total stored text so progress keeps its share of the quota", () => {
  const big = { id: "a", title: "", text: "x".repeat(MAX_TOTAL_CHARS - 10), createdAt: 1 };
  expect(fitsBudget([big], "y".repeat(10))).toBe(true);
  expect(fitsBudget([big], "y".repeat(11))).toBe(false);
});
