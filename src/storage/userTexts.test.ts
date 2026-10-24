import { beforeEach, expect, it } from "vitest";
import { USER_TEXTS_KEY, loadUserTexts, saveUserTexts, userTextTitle } from "./userTexts";

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
