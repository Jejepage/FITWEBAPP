import { describe, expect, it } from "vitest";
import {
  bereinigeEquipment,
  equipmentZuFormWerte,
  gewichteZuText,
  liesEquipment,
  loeseEquipmentAuf,
  parseEquipmentForm,
  validiereEquipment,
} from "./equipment-form";
import { quelleAusFormData, quelleAusSearchParams } from "./quelle";

function formular(felder: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(felder))
    for (const w of Array.isArray(v) ? v : [v]) fd.append(k, w);
  return fd;
}

describe("parseEquipmentForm / validiereEquipment", () => {
  it("liest Equipment und Gewichte; unbekannte Arten fallen weg, die Reihenfolge ist fest", () => {
    const w = parseEquipmentForm(
      quelleAusFormData(
        formular({
          equipment: ["bank", "kurzhanteln", "hantelbank", "keins"],
          gewichte_kurzhanteln: " 2–20/2 ",
          gewichte_kettlebell: "12, 16",
        }),
      ),
    );
    expect(w.equipment).toEqual(["kurzhanteln", "bank"]);
    const r = validiereEquipment(w);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.daten.equipment).toEqual(["kurzhanteln", "bank"]);
      // Kettlebell ist nicht angekreuzt: ihr Text zählt nicht
      expect(r.daten.gewichte).toEqual({ kurzhanteln: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] });
    }
  });

  it("Gewichte nur für angekreuzte Arten (ungültiger Text einer anderen Art stört nicht)", () => {
    const r = validiereEquipment(
      parseEquipmentForm(
        quelleAusFormData(
          formular({
            equipment: ["kurzhanteln"],
            gewichte_kurzhanteln: "10",
            gewichte_kettlebell: "Quatsch",
          }),
        ),
      ),
    );
    expect(r.ok && r.daten.gewichte).toEqual({ kurzhanteln: [10] });
  });

  it("meldet Fehler pro Feld", () => {
    const r = validiereEquipment(
      parseEquipmentForm(
        quelleAusFormData(
          formular({
            equipment: ["kurzhanteln", "kettlebell"],
            gewichte_kurzhanteln: "12,16",
            gewichte_kettlebell: "zwölf",
          }),
        ),
      ),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fehler).sort()).toEqual(["gewichte_kettlebell", "gewichte_kurzhanteln"]);
    }
  });

  it("kein Equipment ist erlaubt (nur Ersatzübungen), leere Gewichte ebenfalls", () => {
    const r = validiereEquipment(parseEquipmentForm(quelleAusFormData(formular({}))));
    expect(r).toEqual({ ok: true, daten: { equipment: [], gewichte: {} } });
  });

  it("Round-Trip über equipmentZuFormWerte", () => {
    const daten = {
      equipment: ["kurzhanteln" as const, "kettlebell" as const],
      gewichte: { kurzhanteln: [2, 4, 6, 8], kettlebell: [12, 16] },
    };
    const r = validiereEquipment(equipmentZuFormWerte(daten));
    expect(r.ok && r.daten).toEqual(daten);
  });
});

describe("liesEquipment", () => {
  it("wiederholtes Feld oder Komma-Liste; fehlendes Feld ist undefined", () => {
    expect(liesEquipment(quelleAusSearchParams({ equipment: ["bank", "stange"] }))).toEqual([
      "bank",
      "stange",
    ]);
    expect(liesEquipment(quelleAusSearchParams({ equipment: "stange, bank" }))).toEqual([
      "bank",
      "stange",
    ]);
    expect(liesEquipment(quelleAusSearchParams({}))).toBeUndefined();
  });

  it("funktioniert auch mit einer einfachen Funktion ohne Mehrfachwerte", () => {
    expect(liesEquipment((n) => (n === "equipment" ? "bank,stange" : undefined))).toEqual([
      "bank",
      "stange",
    ]);
  });
});

describe("Hilfsfunktionen", () => {
  it("bereinigeEquipment: Doppelte und Unbekanntes fallen weg", () => {
    expect(bereinigeEquipment(["stange", "stange", "x", "bank"])).toEqual(["bank", "stange"]);
  });

  it("loeseEquipmentAuf prüft nur angekreuzte Arten", () => {
    const r = loeseEquipmentAuf(["kettlebell"], { kurzhanteln: "abc", kettlebell: "12, 16" });
    expect(r).toEqual({ gewichte: { kettlebell: [12, 16] }, fehler: {} });
  });

  it("gewichteZuText formatiert kompakt", () => {
    expect(gewichteZuText({ kurzhanteln: [2, 4, 6, 8, 10], kettlebell: [12, 16] })).toEqual({
      kurzhanteln: "2–10/2",
      kettlebell: "12, 16",
    });
    expect(gewichteZuText({})).toEqual({ kurzhanteln: "", kettlebell: "" });
  });
});
