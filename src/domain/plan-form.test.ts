import { describe, expect, it } from "vitest";
import {
  istGueltigesDatum,
  loesePlanWerteAuf,
  planBasis,
  parsePlanRohwerte,
  quelleAusFormData,
  quelleAusSearchParams,
  type PlanStandardwerte,
} from "./plan-form";
import { MUSTER, type Muster } from "./types";

const standard: PlanStandardwerte = {
  equipment: ["kurzhanteln", "bank"],
  gewichte: { kurzhanteln: [8, 10, 12] },
  stufen: Object.fromEntries(MUSTER.map((m) => [m, 2])) as Record<Muster, number>,
  einheitenProWoche: 2,
  zusatzblock: false,
  heute: "2026-10-07",
};
const roh = (sp: Record<string, string>) => parsePlanRohwerte(quelleAusSearchParams(sp));
const auf = (sp: Record<string, string>) => loesePlanWerteAuf(roh(sp), standard);

describe("istGueltigesDatum", () => {
  it.each(["2026-10-07", "2028-02-29", "2026-12-31"])("akzeptiert %s", (d) => {
    expect(istGueltigesDatum(d)).toBe(true);
  });
  it.each([
    "2026-02-30",
    "2027-02-29",
    "2026-13-01",
    "2026-00-10",
    "26-10-07",
    "07.10.2026",
    "",
    "2026-1-1",
  ])("verwirft %s", (d) => {
    expect(istGueltigesDatum(d)).toBe(false);
  });
});

describe("parsePlanRohwerte", () => {
  it("liest alle Felder", () => {
    const r = roh({
      gesendet: "1",
      equipment: "maschinen,bank",
      gewichte_kurzhanteln: "2–20/2",
      stufe_KN: "4",
      stufe_RU: "1",
      einheiten: "3",
      zusatzblock: "1",
      start: "2026-11-01",
      seed: "5",
      vorgaenger: "7",
      "slot_A-1-1": "KN-04",
      aktion: "mischen",
    });
    expect(r).toMatchObject({
      gesendet: true,
      equipment: ["maschinen", "bank"],
      gewichteText: { kurzhanteln: "2–20/2" },
      stufen: { KN: 4, RU: 1 },
      einheitenProWoche: 3,
      zusatzblock: true,
      startDatum: "2026-11-01",
      seed: 5,
      vorgaengerId: 7,
      auswahl: { "A-1-1": "KN-04" },
      aktion: "mischen",
    });
  });

  it("ignoriert Ungültiges", () => {
    const r = roh({
      equipment: "rudergeraet,keins",
      stufe_KN: "9",
      stufe_HB: "x",
      einheiten: "4",
      seed: "-1",
      "slot_A-9-1": "KN-04",
      "slot_A-1-1": "quatsch",
      aktion: "löschen",
      vorgaenger: "1e3",
    });
    expect(r).toMatchObject({
      stufen: {},
      auswahl: {},
      aktion: "aktualisieren",
      seed: 0,
      gesendet: false,
    });
    expect(r.equipment).toEqual([]);
    expect(r.einheitenProWoche).toBeUndefined();
    expect(r.vorgaengerId).toBeUndefined();
  });

  it("liest auch FormData, Häkchen mit gleichem Namen als Liste", () => {
    const fd = new FormData();
    fd.append("equipment", "stange");
    fd.append("equipment", "kurzhanteln");
    fd.append("gewichte_kettlebell", " 12, 16 ");
    fd.append("slot_B-2-3", "ZH-05");
    const r = parsePlanRohwerte(quelleAusFormData(fd));
    expect(r.equipment).toEqual(["kurzhanteln", "stange"]);
    expect(r.gewichteText).toEqual({ kettlebell: "12, 16" });
    expect(r.auswahl).toEqual({ "B-2-3": "ZH-05" });
  });

  it("liest mehrfache URL-Parameter als Liste", () => {
    const r = parsePlanRohwerte(quelleAusSearchParams({ equipment: ["bank", "stange"] }));
    expect(r.equipment).toEqual(["bank", "stange"]);
  });

  it("Equipment: nie gesendet = undefined (Standard), gesendet ohne Haken = leer", () => {
    expect(roh({}).equipment).toBeUndefined();
    expect(roh({ gesendet: "1" }).equipment).toEqual([]);
  });
});

describe("loesePlanWerteAuf", () => {
  it("nimmt ohne Angaben die Standardwerte", () => {
    const { werte, fehler } = auf({});
    expect(werte).toMatchObject({
      equipment: ["kurzhanteln", "bank"],
      gewichte: { kurzhanteln: [8, 10, 12] },
      gewichteText: { kurzhanteln: "8, 10, 12", kettlebell: "" },
      einheitenProWoche: 2,
      zusatzblock: false,
      startDatum: "2026-10-07",
      seed: 0,
      vorgaengerId: null,
      auswahl: {},
    });
    expect(werte.stufen.KN).toBe(2);
    expect(fehler).toEqual({});
  });

  it("Zusatzblock: abgeschicktes Formular ohne Haken heißt aus, ungesendet nimmt den Standard", () => {
    const an = { ...standard, zusatzblock: true };
    expect(loesePlanWerteAuf(roh({}), an).werte.zusatzblock).toBe(true);
    expect(loesePlanWerteAuf(roh({ gesendet: "1" }), an).werte.zusatzblock).toBe(false);
    expect(
      loesePlanWerteAuf(roh({ gesendet: "1", zusatzblock: "1" }), standard).werte.zusatzblock,
    ).toBe(true);
  });

  describe("Equipment und Hantelgewichte", () => {
    it("übernimmt Angaben aus dem Formular", () => {
      const { werte, fehler } = auf({
        gesendet: "1",
        equipment: "kettlebell",
        gewichte_kettlebell: "12, 16",
        gewichte_kurzhanteln: "5",
      });
      expect(werte.equipment).toEqual(["kettlebell"]);
      // Gewichte zählen nur für angekreuzte Arten
      expect(werte.gewichte).toEqual({ kettlebell: [12, 16] });
      expect(fehler).toEqual({});
    });

    it("abgeschicktes Formular ohne Haken: kein Equipment, keine Gewichte", () => {
      const { werte } = auf({ gesendet: "1" });
      expect(werte.equipment).toEqual([]);
      expect(werte.gewichte).toEqual({});
    });

    it("ungültige Gewichte: Fehler am Feld, der Text bleibt zum Korrigieren erhalten", () => {
      const { werte, fehler } = auf({
        gesendet: "1",
        equipment: "kurzhanteln",
        gewichte_kurzhanteln: "12,16",
      });
      expect(fehler.gewichte_kurzhanteln).toBeDefined();
      expect(werte.gewichteText.kurzhanteln).toBe("12,16");
      expect(werte.gewichte).toEqual({});
    });

    it("ungültige Gewichte einer nicht angekreuzten Art stören nicht", () => {
      const { fehler } = auf({
        gesendet: "1",
        equipment: "bank",
        gewichte_kurzhanteln: "abc",
      });
      expect(fehler).toEqual({});
    });
  });

  it("ungültiges Startdatum: Fehler und Ersatz durch das heutige Datum", () => {
    const { werte, fehler } = auf({ start: "2026-02-30" });
    expect(werte.startDatum).toBe("2026-10-07");
    expect(fehler.startDatum).toBeDefined();
    expect(auf({ start: "" }).fehler).toEqual({});
  });

  it("Aktion 'neu' verwirft die manuelle Wahl, 'mischen' zusätzlich Seed + 1", () => {
    const sp = { seed: "3", "slot_A-1-1": "KN-04" };
    expect(auf({ ...sp, aktion: "aktualisieren" }).werte).toMatchObject({
      seed: 3,
      auswahl: { "A-1-1": "KN-04" },
    });
    expect(auf({ ...sp, aktion: "neu" }).werte).toMatchObject({ seed: 3, auswahl: {} });
    expect(auf({ ...sp, aktion: "mischen" }).werte).toMatchObject({ seed: 4, auswahl: {} });
  });

  describe("manuelle Wahl und Basis", () => {
    const sp = { "slot_A-1-1": "KN-04", gesendet: "1", equipment: "bank", seed: "2" };
    const basisVon = (extra: Record<string, string> = {}) =>
      planBasis(auf({ ...sp, ...extra, aktion: "aktualisieren" }).werte);

    it("bleibt erhalten, wenn sich die Basis nicht ändert (oder keine angegeben ist)", () => {
      expect(auf(sp).werte.auswahl).toEqual({ "A-1-1": "KN-04" });
      expect(auf({ ...sp, basis: basisVon() }).werte.auswahl).toEqual({ "A-1-1": "KN-04" });
    });

    it("bleibt erhalten, wenn sich nur Einheiten, Zusatzblock oder Startdatum ändern", () => {
      const basis = basisVon();
      const neu = auf({ ...sp, basis, einheiten: "3", zusatzblock: "1", start: "2026-12-01" });
      expect(neu.werte.auswahl).toEqual({ "A-1-1": "KN-04" });
    });

    it.each([
      ["Equipment", { equipment: "bank,stange" }],
      ["Stufe", { stufe_KN: "4" }],
      ["Seed", { seed: "3" }],
      ["Vorgänger", { vorgaenger: "5" }],
    ])("wird verworfen, wenn sich %s ändert", (_name, aenderung) => {
      const basis = basisVon();
      expect(auf({ ...sp, ...aenderung, basis }).werte.auswahl).toEqual({});
    });

    it("meldet veraltete Vorschau, wenn bestimmende Eingaben geändert wurden", () => {
      const basis = basisVon();
      expect(auf({ ...sp, basis }).vorschauVeraltet).toBe(false);
      expect(auf({ ...sp, basis, equipment: "bank,stange" }).vorschauVeraltet).toBe(true);
      expect(auf({ ...sp, equipment: "bank,stange" }).vorschauVeraltet).toBe(false); // ohne Basis nichts zu vergleichen
    });

    it("planBasis unterscheidet alle bestimmenden Eingaben", () => {
      const w = auf({}).werte;
      const basen = new Set([
        planBasis(w),
        planBasis({ ...w, equipment: ["stange"] }),
        planBasis({ ...w, seed: 1 }),
        planBasis({ ...w, vorgaengerId: 3 }),
        planBasis({ ...w, stufen: { ...w.stufen, KN: 5 } }),
        planBasis({ ...w, stufen: { ...w.stufen, RU: 5 } }),
      ]);
      expect(basen.size).toBe(6);
    });
  });

  it("Mischen ergibt nie Seed 0 und bleibt im Bereich", () => {
    expect(auf({ seed: "999999", aktion: "mischen" }).werte.seed).toBe(1);
    expect(auf({ seed: "0", aktion: "mischen" }).werte.seed).toBe(1);
  });
});
