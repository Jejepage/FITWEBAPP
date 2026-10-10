import { describe, expect, it } from "vitest";
import {
  besterSatzText,
  bestSatz,
  schaetze1RM,
  uebungsVerlauf,
  volumen,
  type VerlaufEinheit,
} from "./verlauf";
import type { SatzWerte } from "./training-types";

const satz = (o: Partial<SatzWerte> = {}): SatzWerte => ({
  gewicht: null,
  wdh: null,
  sekunden: null,
  meter: null,
  rpe: null,
  tempo: false,
  ...o,
});

const einheit = (
  id: number,
  saetze: SatzWerte[],
  o: Partial<VerlaufEinheit> = {},
): VerlaufEinheit => ({
  workoutId: id,
  datum: `2026-10-${String(id).padStart(2, "0")}`,
  woche: 1,
  einheit: "A",
  saetze,
  ...o,
});

describe("schaetze1RM", () => {
  it("Epley: 10 kg × 10 ≈ 13,3 kg", () => {
    expect(schaetze1RM(10, 10)).toBeCloseTo(13.33, 2);
    expect(schaetze1RM(10, 0)).toBe(10);
  });
});

describe("bestSatz", () => {
  it("mit Gewicht: höchste geschätzte 1RM, nicht höchstes Gewicht oder meiste Wdh", () => {
    const a = satz({ gewicht: 20, wdh: 5 }); // 23,3
    const b = satz({ gewicht: 12, wdh: 12 }); // 16,8
    const c = satz({ gewicht: 16, wdh: 10 }); // 21,3
    expect(bestSatz([b, a, c], "wdh")?.satz).toBe(a);
    expect(bestSatz([b, a, c], "wdh")?.wert).toBeCloseTo(23.3, 1);
  });

  it("Gleichstand der 1RM: höheres Gewicht gewinnt", () => {
    const leicht = satz({ gewicht: 10, wdh: 30 }); // 20
    const schwer = satz({ gewicht: 20, wdh: 0 }); // 20
    expect(bestSatz([leicht, schwer], "wdh")?.satz).toBe(schwer);
  });

  it("ohne Gewicht: meiste Wiederholungen", () => {
    const r = bestSatz([satz({ wdh: 8 }), satz({ wdh: 12 }), satz({ wdh: 10 })], "wdh");
    expect(r?.wert).toBe(12);
  });

  it("gemischt: Sätze ohne Gewicht zählen neben gewichteten nicht", () => {
    const r = bestSatz([satz({ wdh: 20 }), satz({ gewicht: 10, wdh: 10 })], "wdh");
    expect(r?.satz.gewicht).toBe(10);
  });

  it("Zeit und Strecke: größter Messwert", () => {
    expect(bestSatz([satz({ sekunden: 30 }), satz({ sekunden: 45 })], "zeit")?.wert).toBe(45);
    expect(bestSatz([satz({ meter: 20, gewicht: 16 }), satz({ meter: 30 })], "strecke")?.wert).toBe(
      30,
    );
  });

  it("ohne verwertbaren Messwert oder leer: null", () => {
    expect(bestSatz([], "wdh")).toBeNull();
    expect(bestSatz([satz({ sekunden: 30 })], "wdh")).toBeNull();
  });
});

describe("volumen", () => {
  it("mit Gewicht: Σ Gewicht × Wdh", () => {
    expect(
      volumen([satz({ gewicht: 10, wdh: 10 }), satz({ gewicht: 12.5, wdh: 8 })], "wdh", true),
    ).toBe(200);
  });

  it("ohne Gewicht: Σ Wiederholungen", () => {
    expect(volumen([satz({ wdh: 10 }), satz({ wdh: 8 })], "wdh", false)).toBe(18);
  });

  it("Zeit und Strecke: Σ Sekunden bzw. Meter", () => {
    expect(volumen([satz({ sekunden: 30 }), satz({ sekunden: 35 })], "zeit", false)).toBe(65);
    expect(volumen([satz({ meter: 20, gewicht: 16 })], "strecke", true)).toBe(20);
  });

  it("Sätze ohne Messwert zählen nicht", () => {
    expect(volumen([satz({ gewicht: 10 }), satz({ gewicht: 10, wdh: 5 })], "wdh", true)).toBe(50);
  });
});

describe("uebungsVerlauf", () => {
  it("mitGewicht gilt für die ganze Übung: früher ohne Gewicht, später mit", () => {
    const v = uebungsVerlauf(
      [einheit(1, [satz({ wdh: 10 })]), einheit(2, [satz({ gewicht: 10, wdh: 10 })])],
      "wdh",
    );
    expect(v.mitGewicht).toBe(true);
    expect(v.volumenEinheit).toBe("kg");
    expect(v.zeilen.map((z) => z.volumen)).toEqual([null, 100]);
    expect(v.zeilen[0]?.besterWert).toBeNull();
  });

  it("Körpergewicht: Einheit Wdh.; Zeit: s; Strecke: m", () => {
    expect(uebungsVerlauf([einheit(1, [satz({ wdh: 5 })])], "wdh").besterEinheit).toBe("Wdh.");
    expect(uebungsVerlauf([einheit(1, [satz({ sekunden: 5 })])], "zeit").volumenEinheit).toBe("s");
    expect(uebungsVerlauf([einheit(1, [satz({ meter: 5 })])], "strecke").volumenEinheit).toBe("m");
  });

  it("übernimmt Reihenfolge und Metadaten", () => {
    const v = uebungsVerlauf(
      [einheit(1, [satz({ wdh: 8 })]), einheit(2, [satz({ wdh: 9 })], { woche: 2 })],
      "wdh",
    );
    expect(v.zeilen.map((z) => [z.workoutId, z.woche])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it("keine Einheiten: leer", () => {
    expect(uebungsVerlauf([], "wdh").zeilen).toEqual([]);
  });
});

describe("besterSatzText", () => {
  it("formatiert den besten Satz oder einen Strich", () => {
    expect(besterSatzText({ bester: satz({ gewicht: 12, wdh: 10, rpe: 7 }) })).toBe(
      "12 kg × 10 · Leicht",
    );
    expect(besterSatzText({ bester: null })).toBe("–");
  });
});
