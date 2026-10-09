import { describe, expect, it } from "vitest";
import {
  filterParameter,
  hatFilter,
  parseKatalogFilter,
} from "./katalog-filter";

describe("parseKatalogFilter", () => {
  it("liest gültige Werte", () => {
    expect(
      parseKatalogFilter({
        muster: "ZV",
        stufe: "3",
        einseitig: "ja",
        profil: "2",
        inaktive: "1",
        offen: "1",
      }),
    ).toEqual({
      muster: "ZV",
      stufe: 3,
      einseitig: true,
      profilId: 2,
      inaktive: true,
      nurZuPruefen: true,
      pruefstatus: "zu_pruefen",
    });
  });

  it("ignoriert ungültige Werte und nimmt bei Arrays den ersten", () => {
    const f = parseKatalogFilter({
      muster: "XX",
      stufe: "9",
      einseitig: "vielleicht",
      profil: "abc",
    });
    expect(f).toEqual({ inaktive: false, nurZuPruefen: false });
    expect(parseKatalogFilter({ muster: ["KN", "HB"] }).muster).toBe("KN");
    expect(parseKatalogFilter({ einseitig: "nein" }).einseitig).toBe(false);
  });

  it("ersatz: ja, nein oder ungültig", () => {
    expect(parseKatalogFilter({ ersatz: "ja" }).ersatz).toBe(true);
    expect(parseKatalogFilter({ ersatz: "nein" }).ersatz).toBe(false);
    expect(parseKatalogFilter({ ersatz: "egal" }).ersatz).toBeUndefined();
    expect(hatFilter(parseKatalogFilter({ ersatz: "ja" }))).toBe(true);
  });

  it("hatFilter erkennt aktive Filter", () => {
    expect(hatFilter(parseKatalogFilter({}))).toBe(false);
    expect(hatFilter(parseKatalogFilter({ stufe: "2" }))).toBe(true);
    expect(hatFilter(parseKatalogFilter({ inaktive: "1" }))).toBe(true);
  });
});

describe("neue Filter der Tabelle", () => {
  it("liest Suche, Gerät, Belastung, Status, Aktiv, Video und Muskel", () => {
    const f = parseKatalogFilter({
      q: "  Kniebeuge ",
      geraet: "kurzhanteln",
      belastungsart: "zeit",
      status: "geprueft",
      aktiv: "inaktiv",
      video: "mit",
      muskel: "Gesäß",
      sort: "stufe",
      dir: "ab",
    });
    expect(f).toMatchObject({
      q: "Kniebeuge",
      geraet: "kurzhanteln",
      belastungsart: "zeit",
      pruefstatus: "geprueft",
      nurInaktive: true,
      inaktive: false,
      nurZuPruefen: false,
      video: true,
      muskel: "Gesäß",
      sort: "stufe",
      dir: "ab",
    });
    expect(hatFilter(f)).toBe(true);
  });

  it("ungültige Werte werden ignoriert", () => {
    const f = parseKatalogFilter({
      geraet: "keins",
      belastungsart: "springen",
      status: "egal",
      aktiv: "vielleicht",
      video: "irgendwie",
      sort: "gibtsnicht",
      dir: "quer",
      q: "   ",
    });
    expect(f.geraet).toBeUndefined();
    expect(f.belastungsart).toBeUndefined();
    expect(f.pruefstatus).toBeUndefined();
    expect(f.nurInaktive).toBeUndefined();
    expect(f.inaktive).toBe(false);
    expect(f.video).toBeUndefined();
    expect(f.sort).toBeUndefined();
    expect(f.dir).toBe("auf");
    expect(f.q).toBeUndefined();
    expect(hatFilter(f)).toBe(false);
  });

  it("aktiv=alle entspricht dem älteren inaktive=1; video=ohne ist false", () => {
    expect(parseKatalogFilter({ aktiv: "alle" }).inaktive).toBe(true);
    expect(parseKatalogFilter({ video: "ohne" }).video).toBe(false);
  });

  it("begrenzt die Länge der Suche", () => {
    expect(parseKatalogFilter({ q: "a".repeat(500) }).q).toHaveLength(100);
  });

  it("filterParameter gibt die Filter ohne Sortierung wieder aus (Round-Trip)", () => {
    const sp = {
      muster: "ZV",
      stufe: "3",
      einseitig: "nein",
      ersatz: "ja",
      profil: "2",
      aktiv: "alle",
      status: "zu_pruefen",
      q: "klimm",
      geraet: "stange",
      belastungsart: "wdh",
      video: "mit",
      muskel: "Rücken",
    };
    const p = filterParameter(
      parseKatalogFilter({ ...sp, sort: "name", dir: "ab" }),
    );
    expect(Object.fromEntries(p)).toEqual(sp);
    expect(p.has("sort")).toBe(false);
    expect(parseKatalogFilter(Object.fromEntries(p))).toEqual(
      parseKatalogFilter(sp),
    );
  });
});
