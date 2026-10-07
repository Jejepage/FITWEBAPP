import { describe, expect, it } from "vitest";
import { naechstesGewicht, vorschlagFuerUebung } from "./progression";
import { testKatalog } from "./test-katalog";
import type { SatzWerte, VorschlagEingabe } from "./training-types";
import type { Exercise, Gewichte } from "./types";

const katalog = testKatalog();
function uebung(id: string): Exercise {
  const u = katalog.find((x) => x.id === id);
  if (!u) throw new Error(`Übung ${id} fehlt im Katalog`);
  return u;
}

type UebungPick = VorschlagEingabe["uebung"];
const HANTELN: Gewichte = { kurzhanteln: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] };

function satz(teil: Partial<SatzWerte>): SatzWerte {
  return {
    gewicht: null,
    wdh: null,
    sekunden: null,
    meter: null,
    rpe: null,
    tempo: false,
    ...teil,
  };
}
/** Mehrere Wiederholungssätze mit gleichem Gewicht, RPE und Tempo. */
function wdhSaetze(wdh: number[], gewicht: number | null, rpe: number | null = 7, tempo = false) {
  return wdh.map((w) => satz({ wdh: w, gewicht, rpe, tempo }));
}
function eingabe(
  u: UebungPick,
  woche: number,
  letzteSaetze: readonly SatzWerte[],
  gewichte: Gewichte = HANTELN,
): VorschlagEingabe {
  return { uebung: u, woche, letzteSaetze, gewichte };
}

describe("naechstesGewicht", () => {
  it("Hantel: kleinster Wert über dem aktuellen", () => {
    expect(naechstesGewicht(10, "gewicht-hantel", [2, 4, 10, 12, 20])).toBe(12);
    expect(naechstesGewicht(9, "gewicht-hantel", [2, 4, 10, 12, 20])).toBe(10);
    expect(naechstesGewicht(5, "gewicht-hantel", [20, 4, 8])).toBe(8);
    expect(naechstesGewicht(0, "gewicht-hantel", [4, 2, 8])).toBe(2);
  });

  it("Hantel: Grenze erreicht ergibt null", () => {
    expect(naechstesGewicht(20, "gewicht-hantel", [2, 10, 20])).toBeNull();
    expect(naechstesGewicht(25, "gewicht-hantel", [2, 10, 20])).toBeNull();
  });

  it("Hantel: unbekannte Stufen ergeben +2,5", () => {
    expect(naechstesGewicht(10, "gewicht-hantel", undefined)).toBe(12.5);
    expect(naechstesGewicht(10, "gewicht-hantel", [])).toBe(12.5);
  });

  it("Maschine: +2,5 und Liste wird ignoriert", () => {
    expect(naechstesGewicht(40, "gewicht-maschine", undefined)).toBe(42.5);
    expect(naechstesGewicht(40, "gewicht-maschine", [41, 50])).toBe(42.5);
  });

  it("rundet auf zwei Dezimalstellen", () => {
    expect(naechstesGewicht(0.1, "gewicht-maschine", undefined)).toBe(2.6);
    expect(naechstesGewicht(1.15, "gewicht-maschine", undefined)).toBe(3.65);
    expect(naechstesGewicht(1, "gewicht-hantel", [1.234, 3])).toBe(1.23);
  });
});

describe("Wiederholungsübungen mit Hanteln (KN-04 Goblet Squat)", () => {
  const goblet = uebung("KN-04");

  it("ohne Historie: Start mit unterem Ende des Wochenbereichs", () => {
    expect(vorschlagFuerUebung(eingabe(goblet, 3, []))).toEqual({
      gewicht: null,
      wdh: 8,
      sekunden: null,
      meter: null,
      tempo: false,
      grund: "start",
      schritt: 2,
    });
    expect(vorschlagFuerUebung(eingabe(goblet, 1, [])).wdh).toBe(10);
  });

  it("Sätze ohne Wiederholungen zählen nicht", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, [satz({ gewicht: 10, rpe: 7 })]));
    expect(v.grund).toBe("start");
    expect(v.gewicht).toBeNull();
  });

  it("alle Sätze 12 Wdh bei RPE 8: nächste Hantelstufe, zurück auf das untere Ende", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], 10, 8)));
    expect(v).toEqual({
      gewicht: 12,
      wdh: 8,
      sekunden: null,
      meter: null,
      tempo: false,
      grund: "mehr_gewicht",
      schritt: 2,
    });
  });

  it("Woche 1 und 2: Wochenbereich 10–12", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 2, wdhSaetze([12, 12, 12], 10, 7)));
    expect(v.grund).toBe("mehr_gewicht");
    expect(v.wdh).toBe(10);
    const w = vorschlagFuerUebung(eingabe(goblet, 1, wdhSaetze([11, 12, 12], 10, 6)));
    expect(w).toMatchObject({ grund: "mehr_wdh", gewicht: 10, wdh: 12 });
  });

  it("Grenze der Hantelliste bei 20 kg: Tempo", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], 20, 8)));
    expect(v).toMatchObject({ grund: "tempo", gewicht: 20, wdh: 12, tempo: true });
  });

  it("Tempo bereits genutzt: nächste Stufe", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 4, wdhSaetze([12, 12, 12], 20, 8, true)));
    expect(v).toMatchObject({
      grund: "naechste_stufe",
      gewicht: 20,
      wdh: 12,
      tempo: true,
      sekunden: null,
      meter: null,
    });
  });

  it("Tempo bereits genutzt, aber keine schwerere Übung: wiederholen", () => {
    const ohneStufe = { ...goblet, schwererId: null };
    const v = vorschlagFuerUebung(eingabe(ohneStufe, 4, wdhSaetze([12, 12, 12], 20, 8, true)));
    expect(v).toMatchObject({ grund: "wiederholen", gewicht: 20, wdh: 12 });
  });

  it("schon ein Satz mit Tempo genügt als genutzt", () => {
    const saetze = [...wdhSaetze([12, 12], 20, 8), ...wdhSaetze([12], 20, 8, true)];
    const v = vorschlagFuerUebung(eingabe(goblet, 4, saetze));
    expect(v.grund).toBe("naechste_stufe");
    expect(v.tempo).toBe(false);
  });

  it("steigerungsart ohne Tempo und ohne Stufe: wiederholen", () => {
    const u = { ...goblet, steigerungsart: ["gewicht", "wdh"] as Exercise["steigerungsart"] };
    const v = vorschlagFuerUebung(eingabe(u, 3, wdhSaetze([12, 12, 12], 20, 8)));
    expect(v).toMatchObject({ grund: "wiederholen", gewicht: 20, wdh: 12, tempo: false });
  });

  it("steigerungsart ohne Tempo: direkt nächste Stufe", () => {
    const u = {
      ...goblet,
      steigerungsart: ["gewicht", "wdh", "stufe"] as Exercise["steigerungsart"],
    };
    const v = vorschlagFuerUebung(eingabe(u, 3, wdhSaetze([12, 12, 12], 20, 8)));
    expect(v).toMatchObject({ grund: "naechste_stufe", gewicht: 20, wdh: 12, tempo: false });
  });

  it("RPE 9 verhindert die Erhöhung", () => {
    const saetze = [...wdhSaetze([12, 12], 10, 8), ...wdhSaetze([12], 10, 9)];
    const v = vorschlagFuerUebung(eingabe(goblet, 3, saetze));
    expect(v).toMatchObject({ grund: "wiederholen", gewicht: 10, wdh: 12 });
  });

  it("RPE 9 bei nicht erreichtem Ziel: gleiche Wiederholungen", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([10, 10, 9], 10, 9)));
    expect(v).toMatchObject({ grund: "wiederholen", gewicht: 10, wdh: 9 });
  });

  it("RPE 9 unter dem Wochenminimum: nicht über das zuletzt Geschaffte hinaus, Grund wiederholen", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([6, 7, 7], 10, 9)));
    expect(v).toMatchObject({ grund: "wiederholen", wdh: 6 });
  });

  it("gemischte Wiederholungen 12, 11, 10: Ziel 11", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 11, 10], 10, 7)));
    expect(v).toMatchObject({ grund: "mehr_wdh", gewicht: 10, wdh: 11, tempo: false });
  });

  it("niedrigste Wiederholung unter dem Minimum: Ziel auf das Minimum", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([5, 6, 6], 10, 7)));
    expect(v).toMatchObject({ grund: "mehr_wdh", wdh: 8 });
  });

  it("11 Wdh in allen Sätzen: Ziel 12", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([11, 11, 11], 10, 7)));
    expect(v).toMatchObject({ grund: "mehr_wdh", wdh: 12 });
  });

  it("alle Sätze 12, aber ein RPE 10: nicht oben erreicht", () => {
    const saetze = [...wdhSaetze([12, 12], 10, 7), ...wdhSaetze([12], 10, 10)];
    expect(vorschlagFuerUebung(eingabe(goblet, 3, saetze)).grund).toBe("wiederholen");
  });

  it("ein Satz unter dem Maximum verhindert die Erhöhung", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 11], 10, 7)));
    expect(v).toMatchObject({ grund: "mehr_wdh", gewicht: 10, wdh: 12 });
  });

  it("rpe null zählt als erfüllt", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], 10, null)));
    expect(v).toMatchObject({ grund: "mehr_gewicht", gewicht: 12 });
  });

  it("Hantelgewicht nicht in der Liste (9 kg): nächster höherer Listenwert", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], 9, 7)));
    expect(v).toMatchObject({ grund: "mehr_gewicht", gewicht: 10 });
  });

  it("Gewicht über der Liste: Grenze erreicht, Tempo", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], 22, 7)));
    expect(v).toMatchObject({ grund: "tempo", gewicht: 22 });
  });

  it("Liste leer oder undefined: +2,5 und Schritt 2,5", () => {
    for (const g of [{}, { kurzhanteln: [] }, { kettlebell: [] }] satisfies Gewichte[]) {
      const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], 10, 7), g));
      expect(v).toMatchObject({ grund: "mehr_gewicht", gewicht: 12.5, wdh: 8, schritt: 2.5 });
    }
  });

  it("ohne Gewicht im Satz (ref null): erstes Gewicht der Liste", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], null, 7)));
    expect(v).toMatchObject({ grund: "mehr_gewicht", gewicht: 2, wdh: 8 });
    const leer = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([12, 12, 12], null, 7), {}));
    expect(leer).toMatchObject({ grund: "mehr_gewicht", gewicht: 2.5 });
  });

  it("nicht oben, ohne Gewicht im Satz: Gewicht bleibt null", () => {
    const v = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([9, 9, 9], null, 7)));
    expect(v).toMatchObject({ grund: "mehr_wdh", gewicht: null, wdh: 10 });
  });

  it("Bezugsgewicht ist das höchste verwendete Gewicht; leichtere Sätze zählen nicht mit", () => {
    // Zwei Sätze 12×10 kg, danach ein schwerer Satz 8×12 kg: Arbeitsgewicht ist 12 kg.
    const saetze = [...wdhSaetze([12, 12], 10, 7), ...wdhSaetze([8], 12, 7)];
    expect(vorschlagFuerUebung(eingabe(goblet, 3, saetze))).toMatchObject({
      grund: "mehr_wdh",
      gewicht: 12,
      wdh: 9,
    });
    // Reihenfolge der Sätze ändert nichts: auch hier ist 12 kg das Arbeitsgewicht.
    const umgekehrt = [...wdhSaetze([8], 12, 7), ...wdhSaetze([12, 12, 12], 10, 7)];
    expect(vorschlagFuerUebung(eingabe(goblet, 3, umgekehrt))).toMatchObject({
      grund: "mehr_wdh",
      gewicht: 12,
      wdh: 9,
    });
  });

  it("kein Rückschritt durch einen leichteren letzten Satz (10/10/6 kg)", () => {
    const saetze = [...wdhSaetze([12, 12], 10, 7), ...wdhSaetze([12], 6, 5)];
    // Arbeitsgewicht 10 kg, beide Sätze oben bei RPE 7 → nächste Stufe der Liste (12 kg), nicht 8 kg
    expect(vorschlagFuerUebung(eingabe(goblet, 3, saetze))).toMatchObject({
      grund: "mehr_gewicht",
      gewicht: 12,
      wdh: 8,
    });
  });

  it("Tempo bleibt true, wenn alle betrachteten Sätze Tempo hatten", () => {
    const alle = vorschlagFuerUebung(eingabe(goblet, 3, wdhSaetze([10, 10, 10], 10, 7, true)));
    expect(alle).toMatchObject({ grund: "mehr_wdh", wdh: 11, tempo: true });
    const gemischt = [...wdhSaetze([10, 10], 10, 7, true), ...wdhSaetze([10], 10, 7, false)];
    expect(vorschlagFuerUebung(eingabe(goblet, 3, gemischt)).tempo).toBe(false);
  });

  it("Tempo-Sätze mit leichterem Gewicht beeinflussen das Tempo nicht", () => {
    const saetze = [...wdhSaetze([12], 14, 8, true), ...wdhSaetze([12, 12], 16, 8, false)];
    expect(vorschlagFuerUebung(eingabe(goblet, 3, saetze))).toMatchObject({
      grund: "mehr_gewicht",
      gewicht: 18,
    });
  });
});

describe("Woche 6 (Entlasten und Test)", () => {
  const goblet = uebung("KN-04");
  it("steigert nicht: gleiches Gewicht und gleiches Ziel wie zuletzt, auch wenn oben erreicht", () => {
    const saetze = wdhSaetze([12, 12, 12], 12, 7);
    expect(vorschlagFuerUebung(eingabe(goblet, 6, saetze))).toMatchObject({
      grund: "wiederholen",
      gewicht: 12,
      wdh: 12,
    });
    expect(vorschlagFuerUebung(eingabe(goblet, 5, saetze)).grund).toBe("mehr_gewicht");
  });

  it("hält auch bei nicht erreichten Zielen (niedrigste Wiederholung, keine +1)", () => {
    const saetze = wdhSaetze([10, 9, 10], 12, 7);
    expect(vorschlagFuerUebung(eingabe(goblet, 6, saetze))).toMatchObject({
      grund: "wiederholen",
      gewicht: 12,
      wdh: 9,
    });
  });

  it("ohne Historie bleibt es beim Start", () => {
    expect(vorschlagFuerUebung(eingabe(goblet, 6, [])).grund).toBe("start");
  });
});
