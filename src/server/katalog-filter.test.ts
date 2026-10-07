import { describe, expect, it } from "vitest";
import { hatFilter, parseKatalogFilter } from "./katalog-filter";

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

  it("hatFilter erkennt aktive Filter", () => {
    expect(hatFilter(parseKatalogFilter({}))).toBe(false);
    expect(hatFilter(parseKatalogFilter({ stufe: "2" }))).toBe(true);
    expect(hatFilter(parseKatalogFilter({ inaktive: "1" }))).toBe(true);
  });
});
