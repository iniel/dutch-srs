import { getHint } from "./hints";

const MEDIUM_1_CONTRAST_IDS = [
  "c640", "c791", "c906", // even, net, pas
  "c693", "c749", // om, bij
  "c599", "c559", // tijd, keer
  "c246", "c10127", // weg, heen
  "c1235", "c1615", // deel, stuk
  "c196", "c2121", // mensen, volk
  "c1467", "c2361", "c2426", // sterk, kracht, macht
  "c1155", "c1861", // bang, angst
  "c1319", "c10128", // juist, waar
  "c998", "c994", // zachter, stil
  "c503", "c10129", // oog, blik
  "c64", "c2266", // zin, doel
];

describe("Medium 1 contrast hints", () => {
  it("covers every selected word in both quiz directions", () => {
    for (const id of MEDIUM_1_CONTRAST_IDS) {
      expect(getHint(id, "nl_en")).toBeTruthy();
      expect(getHint(id, "en_nl")).toBeTruthy();
    }
  });
});
