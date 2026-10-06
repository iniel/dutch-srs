import { describe, it, expect } from "vitest";
import { parseFreedictTei } from "./freedict.mjs";
import { posKey } from "./ru-pos.mjs";

const TEI = `
<body>
  <entry>
    <form><orth>greet</orth><pron>/ɡɹiːt/</pron></form>
    <gramGrp><pos>v</pos></gramGrp>
    <sense>
      <cit type="trans" xml:lang="ru">
        <quote>встре́тить</quote>
        <quote>здоро́ваться</quote>
        <quote>приве́тствовать</quote>
      </cit>
    </sense>
  </entry>
  <entry>
    <form><orth>heten</orth></form>
    <sense><cit type="trans" xml:lang="ru"><quote>именова́ться</quote></cit></sense>
    <sense><cit type="trans" xml:lang="ru"><quote>называ́ться</quote><quote>именова́ться</quote></cit></sense>
  </entry>
  <entry>
    <form><orth>fit</orth></form>
    <gramGrp><pos>adj</pos></gramGrp>
    <sense><cit type="trans" xml:lang="ru"><quote>в [[хороший|хоро́шей]] [[форма|фо́рме]]</quote></cit></sense>
  </entry>
  <entry>
    <form><orth>nogloss</orth></form>
    <gramGrp><pos>n</pos></gramGrp>
  </entry>
</body>`;

describe("parseFreedictTei", () => {
  it("indexes headword -> ru translations, stress stripped", () => {
    const map = parseFreedictTei(TEI, (s) => s.toLowerCase());
    expect(map.get("greet")).toEqual(["встретить", "здороваться", "приветствовать"]);
  });

  it("merges multiple senses and dedupes", () => {
    const map = parseFreedictTei(TEI);
    expect(map.get("heten")).toEqual(["именоваться", "называться"]);
  });

  it("renders wiki links as their displayed text", () => {
    expect(parseFreedictTei(TEI).get("fit")).toEqual(["в хорошей форме"]);
  });

  it("also indexes translations by headword and part of speech", () => {
    const map = parseFreedictTei(TEI);
    expect(map.byPos.get(posKey("greet", "verb"))).toEqual(["встретить", "здороваться", "приветствовать"]);
    expect(map.byPos.get(posKey("greet", "noun"))).toBeUndefined();
    expect([...map.byPos.keys()].some(k => k.startsWith("heten"))).toBe(false);
  });

  it("skips entries with no translation and applies keyFn", () => {
    const map = parseFreedictTei(TEI, (s) => s.toUpperCase());
    expect(map.has("NOGLOSS")).toBe(false);
    expect(map.get("GREET")?.[0]).toBe("встретить");
  });
});
