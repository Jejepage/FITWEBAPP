import { describe, expect, it } from "vitest";
import {
  SPALTEN,
  STANDARD_SPALTEN,
  parseAnsicht,
  parseAnsichtsCookie,
  parseRichtung,
  parseSortSpalte,
  parseSpalten,
  serialisiereAnsichtsCookie,
  serialisiereSpalten,
  sortWert,
  sortiereKatalog,
} from "./katalog-spalten";
import { testKatalog } from "./test-katalog";
import type { Exercise } from "./types";

const katalog = testKatalog();

describe("parseSpalten", () => {
  it("ohne oder mit leerem Wert: Name, Stufe, Equipment", () => {
    expect(parseSpalten(undefined)).toEqual(["name", "stufe", "equipment"]);
    expect(parseSpalten("")).toEqual([...STANDARD_SPALTEN]);
    expect(parseSpalten(null)).toEqual([...STANDARD_SPALTEN]);
  });

  it("Name ist immer dabei, auch wenn er fehlt", () => {
    expect(parseSpalten("stufe")).toEqual(["name", "stufe"]);
    expect(parseSpalten("video,id")).toEqual(["name", "video", "id"]);
  });

  it("feste Reihenfolge unabhängig von der Eingabe, ohne Doppelte", () => {
    expect(parseSpalten("video,stufe,name,stufe,equipment")).toEqual([
      "name",
      "stufe",
      "equipment",
      "video",
    ]);
  });

  it("unbekannte Schlüssel werden ignoriert; nur Unbekanntes ergibt die Vorgabe", () => {
    expect(parseSpalten("stufe,gibtsnicht,<script>")).toEqual([
      "name",
      "stufe",
    ]);
    expect(parseSpalten("foo,bar")).toEqual([...STANDARD_SPALTEN]);
  });

  it("Leerraum und Groß-/Kleinschreibung: nur exakte Schlüssel zählen", () => {
    expect(parseSpalten(" stufe , equipment ")).toEqual([
      "name",
      "stufe",
      "equipment",
    ]);
    expect(parseSpalten("STUFE")).toEqual([...STANDARD_SPALTEN]);
  });

  it("alle Spalten wählbar, Round-Trip", () => {
    expect(parseSpalten(serialisiereSpalten(SPALTEN))).toEqual([...SPALTEN]);
    expect(SPALTEN).toHaveLength(15);
  });
});

describe("Ansicht und Cookie", () => {
  it("parseAnsicht: nur bekannte Werte, sonst auto", () => {
    expect(parseAnsicht("tabelle")).toBe("tabelle");
    expect(parseAnsicht("karten")).toBe("karten");
    expect(parseAnsicht("auto")).toBe("auto");
    expect(parseAnsicht("liste")).toBe("auto");
    expect(parseAnsicht(undefined)).toBe("auto");
  });

  it("Cookie: Round-Trip und robuste Vorgaben", () => {
    const w = {
      ansicht: "tabelle" as const,
      spalten: parseSpalten("stufe,video"),
    };
    expect(parseAnsichtsCookie(serialisiereAnsichtsCookie(w))).toEqual(w);
    expect(parseAnsichtsCookie(undefined)).toEqual({
      ansicht: "auto",
      spalten: [...STANDARD_SPALTEN],
    });
    expect(parseAnsichtsCookie("müll%%%&&=").ansicht).toBe("auto");
    expect(parseAnsichtsCookie("ansicht=tabelle&spalten=xx").spalten).toEqual([
      ...STANDARD_SPALTEN,
    ]);
  });

  it("Richtung und Sortierspalte", () => {
    expect(parseRichtung("ab")).toBe("ab");
    expect(parseRichtung("auf")).toBe("auf");
    expect(parseRichtung("quer")).toBe("auf");
    expect(parseSortSpalte("stufe")).toBe("stufe");
    expect(parseSortSpalte("nix")).toBeUndefined();
    expect(parseSortSpalte(undefined)).toBeUndefined();
  });
});

describe("sortiereKatalog", () => {
  const mischen = (l: Exercise[]) => [...l].reverse();

  it("ohne Spalte: Muster-Reihenfolge, dann Stufe, Name, ID", () => {
    const r = sortiereKatalog(mischen(katalog), undefined, "auf");
    const muster = r.map((e) => e.muster);
    expect([...new Set(muster)]).toEqual([
      "KN",
      "HB",
      "DH",
      "DV",
      "ZH",
      "ZV",
      "TR",
      "RU",
    ]);
    const kn = r.filter((e) => e.muster === "KN");
    expect(kn.map((e) => e.stufe)).toEqual(
      [...kn.map((e) => e.stufe)].sort((a, b) => a - b),
    );
  });

  it("nach Name auf- und absteigend, Gruppen bleiben zusammen", () => {
    const auf = sortiereKatalog(katalog, "name", "auf");
    const ab = sortiereKatalog(katalog, "name", "ab");
    for (const m of ["KN", "DH", "RU"] as const) {
      const a = auf.filter((e) => e.muster === m).map((e) => e.name);
      const b = ab.filter((e) => e.muster === m).map((e) => e.name);
      expect(a).toEqual([...a].sort((x, y) => x.localeCompare(y, "de")));
      expect(b).toEqual([...a].reverse());
    }
    expect([...new Set(ab.map((e) => e.muster))]).toHaveLength(8);
  });

  it("nach Stufe absteigend", () => {
    const kn = sortiereKatalog(katalog, "stufe", "ab").filter(
      (e) => e.muster === "KN",
    );
    expect(kn.map((e) => e.stufe)).toEqual(
      [...kn.map((e) => e.stufe)].sort((a, b) => b - a),
    );
  });

  it("ist stabil und verändert die Eingabe nicht", () => {
    const kopie = [...katalog];
    const r1 = sortiereKatalog(katalog, "einseitig", "auf");
    const r2 = sortiereKatalog(mischen(katalog), "einseitig", "auf");
    expect(katalog).toEqual(kopie);
    expect(r1.map((e) => e.id)).toEqual(r2.map((e) => e.id));
  });

  it("sortWert liefert für jede Spalte einen Wert", () => {
    for (const s of SPALTEN) {
      for (const e of katalog.slice(0, 5)) {
        const w = sortWert(e, s);
        expect(["string", "number"]).toContain(typeof w);
      }
    }
  });

  it("Video-Spalte: Übungen mit Link zuerst bei absteigend", () => {
    const mit = {
      ...katalog.find((e) => e.id === "KN-02")!,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };
    const liste = katalog.map((e) => (e.id === "KN-02" ? mit : e));
    const kn = sortiereKatalog(liste, "video", "ab").filter(
      (e) => e.muster === "KN",
    );
    expect(kn[0]?.id).toBe("KN-02");
  });
});
