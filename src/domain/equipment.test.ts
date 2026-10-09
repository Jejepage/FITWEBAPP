import { describe, expect, it } from "vitest";
import { beschreibeBedingung, erfuellt, zaehleMachbar } from "./equipment";
import type { EquipmentBedingung } from "./types";

describe("erfuellt", () => {
  it("leere Bedingung ist immer erfüllt", () => {
    expect(erfuellt([], [])).toBe(true);
    expect(erfuellt([], ["stange"])).toBe(true);
  });

  it("alle Geräte müssen vorhanden sein (UND)", () => {
    const dh03: EquipmentBedingung = ["kurzhanteln", "bank"];
    expect(erfuellt(dh03, ["kurzhanteln", "bank"])).toBe(true);
    expect(erfuellt(dh03, ["kurzhanteln", "bank", "stange"])).toBe(true);
    expect(erfuellt(dh03, ["kurzhanteln"])).toBe(false);
    expect(erfuellt(dh03, ["bank"])).toBe(false);
  });

  it("ein Gerät allein", () => {
    const goblet: EquipmentBedingung = ["kettlebell"];
    expect(erfuellt(goblet, ["kettlebell"])).toBe(true);
    expect(erfuellt(goblet, ["kurzhanteln"])).toBe(false);
  });
});

describe("beschreibeBedingung", () => {
  it("formuliert lesbar", () => {
    expect(beschreibeBedingung([])).toBe("Kein Gerät");
    expect(beschreibeBedingung(["kettlebell"])).toBe("Kettlebell");
    expect(beschreibeBedingung(["kurzhanteln", "bank"])).toBe("Kurzhanteln + Bank");
  });
});

describe("zaehleMachbar", () => {
  const u = (muster: "KN" | "HB", equipment: EquipmentBedingung, aktiv = true) => ({
    muster,
    equipment,
    aktiv,
  });
  const liste = [
    u("KN", []),
    u("KN", ["kurzhanteln"]),
    u("KN", [], false),
    u("HB", ["maschinen"]),
  ];

  it("zählt nur aktive, machbare Übungen je Muster", () => {
    const z = zaehleMachbar(liste, []);
    expect(z.KN).toBe(1);
    expect(z.HB).toBe(0);
    expect(z.DH).toBe(0);
    expect(zaehleMachbar(liste, ["kurzhanteln", "maschinen"])).toMatchObject({ KN: 2, HB: 1 });
  });
});
