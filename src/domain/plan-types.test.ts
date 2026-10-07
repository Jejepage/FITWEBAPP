import { describe, expect, it } from "vitest";
import { SLOT_KEYS, SLOT_VORLAGE, slotKey, slotVorlageVonKey } from "./plan-types";
import { MUSTER } from "./types";

describe("SLOT_VORLAGE (Spec 2.4)", () => {
  it("hat 16 Slots mit eindeutigen Schlüsseln", () => {
    expect(SLOT_VORLAGE).toHaveLength(16);
    expect(new Set(SLOT_KEYS).size).toBe(16);
  });

  it("entspricht der Tabelle für Einheit A und B", () => {
    const muster = (einheit: string, block: string) =>
      SLOT_VORLAGE.filter((s) => s.einheit === einheit && s.block === block).map((s) => s.muster);
    expect(muster("A", "1")).toEqual(["KN", "DH", "ZH"]);
    expect(muster("A", "2")).toEqual(["HB", "DV", "ZV"]);
    expect(muster("A", "Z")).toEqual(["TR", "RU"]);
    expect(muster("B", "1")).toEqual(["HB", "DH", "ZV"]);
    expect(muster("B", "2")).toEqual(["KN", "DV", "ZH"]);
    expect(muster("B", "Z")).toEqual(["TR", "RU"]);
  });

  it("jedes Muster kommt genau einmal in A und einmal in B vor", () => {
    for (const m of MUSTER) {
      const slots = SLOT_VORLAGE.filter((s) => s.muster === m);
      expect(slots.map((s) => s.einheit).sort(), m).toEqual(["A", "B"]);
    }
  });

  it("Positionen zählen je Block ab 1", () => {
    expect(
      SLOT_VORLAGE.filter((s) => s.einheit === "A" && s.block === "2").map((s) => s.position),
    ).toEqual([1, 2, 3]);
    expect(SLOT_VORLAGE.filter((s) => s.block === "Z").map((s) => s.position)).toEqual([
      1, 2, 1, 2,
    ]);
  });

  it("slotKey und slotVorlageVonKey sind umkehrbar", () => {
    for (const s of SLOT_VORLAGE) expect(slotVorlageVonKey(slotKey(s))).toEqual(s);
    expect(slotVorlageVonKey("A-3-1")).toBeNull();
    expect(slotVorlageVonKey("quatsch")).toBeNull();
  });
});
