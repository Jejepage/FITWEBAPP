import { describe, expect, it } from "vitest";
import { beschreibeBedingung, erfuellt, istErsatzStandard, zaehleMachbar } from "./equipment";
import type { EquipmentBedingung } from "./types";

describe("erfuellt", () => {
  it("leere Bedingung ist immer erfüllt", () => {
    expect(erfuellt([], [])).toBe(true);
    expect(erfuellt([], ["stange"])).toBe(true);
  });

  it("ODER innerhalb einer Gruppe", () => {
    const goblet: EquipmentBedingung = [["kurzhanteln", "kettlebell"]];
    expect(erfuellt(goblet, ["kettlebell"])).toBe(true);
    expect(erfuellt(goblet, ["kurzhanteln"])).toBe(true);
    expect(erfuellt(goblet, ["stange", "bank"])).toBe(false);
  });

  it("UND zwischen Gruppen", () => {
    const dh03: EquipmentBedingung = [["kurzhanteln"], ["bank"]];
    expect(erfuellt(dh03, ["kurzhanteln", "bank"])).toBe(true);
    expect(erfuellt(dh03, ["kurzhanteln"])).toBe(false);
    expect(erfuellt(dh03, ["bank"])).toBe(false);
  });

  it("kombiniert UND und ODER (Hip Thrust: Bank + Kurzhanteln oder Langhantel)", () => {
    const hb07: EquipmentBedingung = [["bank"], ["kurzhanteln", "langhantel"]];
    expect(erfuellt(hb07, ["bank", "langhantel"])).toBe(true);
    expect(erfuellt(hb07, ["bank", "kettlebell"])).toBe(false);
  });
});

describe("beschreibeBedingung", () => {
  it("formuliert lesbar", () => {
    expect(beschreibeBedingung([])).toBe("Kein Gerät");
    expect(beschreibeBedingung([["kurzhanteln", "kettlebell"]])).toBe(
      "Kurzhanteln oder Kettlebell",
    );
    expect(beschreibeBedingung([["kurzhanteln"], ["bank"]])).toBe("Kurzhanteln + Bank");
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
    u("KN", [["kurzhanteln"]]),
    u("KN", [], false),
    u("HB", [["maschinen"]]),
  ];

  it("zählt nur aktive, machbare Übungen je Muster", () => {
    const z = zaehleMachbar(liste, []);
    expect(z.KN).toBe(1);
    expect(z.HB).toBe(0);
    expect(z.DH).toBe(0);
    expect(zaehleMachbar(liste, ["kurzhanteln", "maschinen"])).toMatchObject({ KN: 2, HB: 1 });
  });
});

describe("istErsatzStandard", () => {
  it("reines Körpergewicht ist Ersatz, beladbares Körpergewicht nicht", () => {
    expect(istErsatzStandard({ equipment: [], optionaleLast: [] })).toBe(true);
    expect(istErsatzStandard({ equipment: [], optionaleLast: ["kurzhanteln"] })).toBe(false);
  });

  it("nur Band ist Ersatz; Band als Alternative zu einem Gerät nicht", () => {
    expect(istErsatzStandard({ equipment: [["band"]], optionaleLast: [] })).toBe(true);
    expect(istErsatzStandard({ equipment: [["maschinen", "band"]], optionaleLast: [] })).toBe(
      false,
    );
  });

  it("Geräte machen eine Übung zur Planübung", () => {
    expect(istErsatzStandard({ equipment: [["kurzhanteln"], ["bank"]], optionaleLast: [] })).toBe(
      false,
    );
    expect(istErsatzStandard({ equipment: [["stange"]], optionaleLast: [] })).toBe(false);
  });
});
