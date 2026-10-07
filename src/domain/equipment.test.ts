import { describe, expect, it } from "vitest";
import { beschreibeBedingung, erfuellt } from "./equipment";
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
