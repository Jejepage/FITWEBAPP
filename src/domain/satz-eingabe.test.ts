import { describe, expect, it } from "vitest";
import { satzEingabeSchema } from "./satz-eingabe";

const basis = {
  id: "3f2b8c1e-7d41-4a52-9c0e-1b2a3c4d5e6f",
  workoutId: 1,
  planSlotId: 4,
  exerciseId: "KN-04",
  runde: 2,
  gewicht: 12,
  wdh: 10,
  sekunden: null,
  meter: null,
  rpe: 7,
  tempo: false,
};

describe("satzEingabeSchema", () => {
  it("akzeptiert einen gültigen Satz", () => {
    expect(satzEingabeSchema.safeParse(basis).success).toBe(true);
  });

  it("akzeptiert Zeit- und Streckensätze sowie Körpergewicht ohne Gewicht und ohne RPE", () => {
    expect(
      satzEingabeSchema.safeParse({ ...basis, gewicht: null, wdh: null, sekunden: 30 }).success,
    ).toBe(true);
    expect(
      satzEingabeSchema.safeParse({ ...basis, wdh: null, meter: 25.5, gewicht: 16 }).success,
    ).toBe(true);
    expect(satzEingabeSchema.safeParse({ ...basis, rpe: null }).success).toBe(true);
    expect(satzEingabeSchema.safeParse({ ...basis, rpe: 7.5 }).success).toBe(true);
  });

  it("verlangt Wiederholungen, Sekunden oder Meter", () => {
    expect(satzEingabeSchema.safeParse({ ...basis, wdh: null }).success).toBe(false);
  });

  it.each([
    ["Gewicht negativ", { gewicht: -1 }],
    ["Gewicht zu groß", { gewicht: 1001 }],
    ["Wdh nicht ganzzahlig", { wdh: 10.5 }],
    ["Wdh zu groß", { wdh: 501 }],
    ["RPE 0", { rpe: 0 }],
    ["RPE 11", { rpe: 11 }],
    ["RPE 7.3", { rpe: 7.3 }],
    ["Runde 0", { runde: 0 }],
    ["Runde 7", { runde: 7 }],
    ["ID zu kurz", { id: "abc" }],
    ["ID mit Sonderzeichen", { id: "../../etc/passwd" }],
    ["Übung ungültig", { exerciseId: "XX-01" }],
    ["NaN", { gewicht: Number.NaN }],
    ["tempo kein Boolean", { tempo: "ja" }],
  ])("verwirft: %s", (_name, abweichung) => {
    expect(satzEingabeSchema.safeParse({ ...basis, ...abweichung }).success).toBe(false);
  });

  it("rundet Gewicht und Meter auf zwei Dezimalstellen", () => {
    const r = satzEingabeSchema.parse({ ...basis, gewicht: 12.3456, meter: 20.999, wdh: null });
    expect(r.gewicht).toBe(12.35);
    expect(r.meter).toBe(21);
  });
});
