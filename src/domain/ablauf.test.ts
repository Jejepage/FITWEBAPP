import { describe, expect, it } from "vitest";
import { bauSchritte, naechsterOffenerIndex, schrittKey, type AblaufSlot } from "./ablauf";
import type { Block, Muster } from "./types";

// Einheit A (Spec 2.4): Block 1 KN, DH, ZH · Block 2 HB, DV, ZV · Zusatz TR, RU
const SLOT_DEFS: [Block, number, Muster, string][] = [
  ["1", 1, "KN", "KN-03"],
  ["1", 2, "DH", "DH-04"],
  ["1", 3, "ZH", "ZH-03"],
  ["2", 1, "HB", "HB-03"],
  ["2", 2, "DV", "DV-03"],
  ["2", 3, "ZV", "ZV-04"],
  ["Z", 1, "TR", "TR-03"],
  ["Z", 2, "RU", "RU-04"],
];
const slots: AblaufSlot[] = SLOT_DEFS.map(([block, position, muster, exerciseId], i) => ({
  slotId: 100 + i,
  block,
  position,
  muster,
  exerciseId,
}));
const bau = (
  o: { woche?: number; zusatzblock?: boolean; ersetzungen?: Record<string, string> } = {},
) => bauSchritte({ slots, ersetzungen: {}, zusatzblock: false, woche: 1, ...o });

describe("bauSchritte: Schrittzahl", () => {
  it.each([
    [1, false, 18],
    [1, true, 22],
    [3, false, 18],
    [5, true, 22],
    [6, false, 12],
    [6, true, 16],
  ])("Woche %i, Zusatzblock %s → %i Schritte", (woche, zusatzblock, anzahl) => {
    expect(bau({ woche, zusatzblock })).toHaveLength(anzahl);
  });

  it("alle Schritt-Schlüssel sind eindeutig", () => {
    const keys = bau({ zusatzblock: true }).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("bauSchritte: Reihenfolge (Spec 2.3)", () => {
  it("Runde für Runde: Übung 1 → 2 → 3, dann von vorn", () => {
    const s = bau().filter((x) => x.block === "1");
    expect(s.map((x) => `${x.runde}/${x.muster}`)).toEqual([
      "1/KN",
      "1/DH",
      "1/ZH",
      "2/KN",
      "2/DH",
      "2/ZH",
      "3/KN",
      "3/DH",
      "3/ZH",
    ]);
  });

  it("Blockreihenfolge 1, 2, Z; ohne Zusatzblock kein Z", () => {
    const mit = bau({ zusatzblock: true }).map((s) => s.block);
    expect(mit.filter((b, i) => i === 0 || b !== mit[i - 1])).toEqual(["1", "2", "Z"]);
    expect(bau().some((s) => s.block === "Z")).toBe(false);
  });

  it("Zusatzblock hat zwei Runden mit zwei Übungen", () => {
    const z = bau({ zusatzblock: true, woche: 3 }).filter((s) => s.block === "Z");
    expect(z.map((s) => `${s.runde}/${s.muster}`)).toEqual(["1/TR", "1/RU", "2/TR", "2/RU"]);
    expect(z.every((s) => s.runden === 2 && s.anzahlImBlock === 2)).toBe(true);
  });

  it("Woche 6 hat zwei Runden in Block 1 und 2", () => {
    const s = bau({ woche: 6 });
    expect(s.filter((x) => x.block === "1").every((x) => x.runden === 2)).toBe(true);
    expect(Math.max(...s.map((x) => x.runde))).toBe(2);
  });

  it("sortiert Slots nach Position, auch wenn sie ungeordnet kommen", () => {
    const durcheinander = [...slots].reverse();
    const s = bauSchritte({ slots: durcheinander, ersetzungen: {}, zusatzblock: true, woche: 1 });
    expect(s.map((x) => x.key)).toEqual(bau({ zusatzblock: true }).map((x) => x.key));
  });
});

describe("bauSchritte: Pausen", () => {
  it("wechsel innerhalb der Runde, runde nach der Runde, block am Blockende, ende am Schluss", () => {
    const s = bau();
    expect(s.slice(0, 3).map((x) => x.pauseNach)).toEqual(["wechsel", "wechsel", "runde"]);
    // Letzte Runde von Block 1: Blockende, kein Timer
    expect(s.slice(6, 9).map((x) => x.pauseNach)).toEqual(["wechsel", "wechsel", "block"]);
    expect(s.at(-1)?.pauseNach).toBe("ende");
    expect(s.filter((x) => x.pauseNach === "ende")).toHaveLength(1);
  });

  it("ohne Zusatzblock endet die Einheit mit Block 2, mit Zusatzblock mit Z", () => {
    expect(bau().at(-1)).toMatchObject({ block: "2", muster: "ZV", pauseNach: "ende" });
    expect(bau({ zusatzblock: true }).at(-1)).toMatchObject({
      block: "Z",
      muster: "RU",
      pauseNach: "ende",
    });
    expect(bau({ zusatzblock: true }).filter((s) => s.pauseNach === "block")).toHaveLength(2);
  });

  it("Anzahl der Pausenarten stimmt (Woche 1, ohne Zusatzblock)", () => {
    const zaehle = (art: string) => bau().filter((s) => s.pauseNach === art).length;
    expect(zaehle("wechsel")).toBe(12); // 2 je Runde × 6 Runden
    expect(zaehle("runde")).toBe(4); // 2 je Block
    expect(zaehle("block")).toBe(1);
    expect(zaehle("ende")).toBe(1);
  });
});

describe("bauSchritte: Ersetzung", () => {
  it("wirkt auf alle Runden des Slots und lässt den Plan unverändert", () => {
    const s = bau({ ersetzungen: { "100": "KN-04" } });
    const kn = s.filter((x) => x.slotId === 100);
    expect(kn).toHaveLength(3);
    expect(kn.every((x) => x.exerciseId === "KN-04" && x.geplanteUebungId === "KN-03")).toBe(true);
    expect(
      s.filter((x) => x.slotId !== 100).every((x) => x.exerciseId === x.geplanteUebungId),
    ).toBe(true);
  });
});

describe("naechsterOffenerIndex", () => {
  const schritte = bau();
  it("beginnt bei 0 und rückt mit den gespeicherten Sätzen vor", () => {
    expect(naechsterOffenerIndex(schritte, new Set())).toBe(0);
    expect(naechsterOffenerIndex(schritte, new Set([schrittKey(100, 1)]))).toBe(1);
    const erste5 = new Set(schritte.slice(0, 5).map((s) => s.key));
    expect(naechsterOffenerIndex(schritte, erste5)).toBe(5);
  });

  it("findet auch eine Lücke (z. B. fehlgeschlagenes Speichern)", () => {
    const ohneZweiten = new Set(schritte.filter((_, i) => i !== 1).map((s) => s.key));
    expect(naechsterOffenerIndex(schritte, ohneZweiten)).toBe(1);
  });

  it("gibt -1 zurück, wenn alles erledigt ist", () => {
    expect(naechsterOffenerIndex(schritte, new Set(schritte.map((s) => s.key)))).toBe(-1);
  });

  it("ignoriert fremde Schlüssel", () => {
    expect(naechsterOffenerIndex(schritte, new Set(["999:1"]))).toBe(0);
  });
});
