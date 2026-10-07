import { describe, expect, it } from "vitest";
import {
  istGueltigesDatum,
  loesePlanWerteAuf,
  parsePlanRohwerte,
  quelleAusFormData,
  quelleAusSearchParams,
  type PlanStandardwerte,
} from "./plan-form";
import { MUSTER, type Muster } from "./types";

const standard: PlanStandardwerte = {
  profilId: 1,
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
      profil: "3",
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
      profilId: 3,
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
      profil: "abc",
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
    expect(r.profilId).toBeUndefined();
    expect(r.einheitenProWoche).toBeUndefined();
    expect(r.vorgaengerId).toBeUndefined();
  });

  it("liest auch FormData", () => {
    const fd = new FormData();
    fd.append("profil", "2");
    fd.append("slot_B-2-3", "ZH-05");
    const r = parsePlanRohwerte(quelleAusFormData(fd));
    expect(r.profilId).toBe(2);
    expect(r.auswahl).toEqual({ "B-2-3": "ZH-05" });
  });
});

describe("loesePlanWerteAuf", () => {
  it("nimmt ohne Angaben die Standardwerte", () => {
    const { werte, fehler } = auf({});
    expect(werte).toMatchObject({
      profilId: 1,
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

  it("Seed läuft nicht über die Grenze hinaus", () => {
    expect(auf({ seed: "999999", aktion: "mischen" }).werte.seed).toBe(0);
  });
});
