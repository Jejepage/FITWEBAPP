import { describe, expect, it } from "vitest";
import { stufenCheck } from "./stufen-check";
import {
  RPE_ERHOEHEN_MAX,
  RPE_SENKEN_AB,
  STUFEN_CHECK_MIN_EINHEITEN,
  STUFEN_CHECK_WOCHEN,
  type StufenCheckEingabe,
  type StufenCheckEinheit,
  type StufenCheckErgebnis,
} from "./stufen-check-types";
import type { SatzWerte } from "./training-types";
import { MUSTER, type Muster } from "./types";

type UebungPick = StufenCheckEinheit["uebung"];

const WDH_STANDARD: UebungPick = { standardBereich: "8–12", belastungsart: "wdh" };
const WDH_3_6: UebungPick = { standardBereich: "3–6", belastungsart: "wdh" };
const ZEIT: UebungPick = { standardBereich: "20–40 s", belastungsart: "zeit" };
const STRECKE: UebungPick = { standardBereich: "20–40 m", belastungsart: "strecke" };

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
/** Wiederholungssätze mit gleichem RPE. */
function wdhSaetze(wdh: number[], rpe: number | null = 7): SatzWerte[] {
  return wdh.map((w) => satz({ wdh: w, rpe }));
}
function einheit(
  muster: Muster,
  woche: number,
  saetze: readonly SatzWerte[],
  uebung: UebungPick = WDH_STANDARD,
): StufenCheckEinheit {
  return { muster, woche, uebung, saetze };
}
function stufen(teil: Partial<Record<Muster, number>> = {}): Record<Muster, number> {
  return { KN: 3, HB: 3, DH: 3, DV: 3, ZH: 3, ZV: 3, TR: 3, RU: 3, ...teil };
}
function eingabe(
  einheiten: readonly StufenCheckEinheit[],
  teil: Partial<Record<Muster, number>> = {},
): StufenCheckEingabe {
  return { stufen: stufen(teil), einheiten };
}
/** Ergebnis eines einzelnen Musters. */
function fuer(muster: Muster, e: StufenCheckEingabe): StufenCheckErgebnis {
  const r = stufenCheck(e).find((x) => x.muster === muster);
  if (!r) throw new Error(`Ergebnis für ${muster} fehlt`);
  return r;
}

// Ziel in Woche 5/6 für Standard-Wiederholungsübungen: 8–12.
const OBEN = [12, 12, 12];
const OBEN_RPE_OK = wdhSaetze(OBEN, 7);

describe("Konstanten des Vertrags", () => {
  it("passen zu den Annahmen der Tests", () => {
    expect(STUFEN_CHECK_WOCHEN).toEqual([5, 6]);
    expect(STUFEN_CHECK_MIN_EINHEITEN).toBe(2);
    expect(RPE_ERHOEHEN_MAX).toBe(7);
    expect(RPE_SENKEN_AB).toBe(9);
  });
});

describe("Ausgabeform", () => {
  it("leere Eingabe ergibt acht Mal halten mit zu_wenig_daten", () => {
    const r = stufenCheck(eingabe([]));
    expect(r).toHaveLength(8);
    for (const x of r) {
      expect(x.empfehlung).toBe("halten");
      expect(x.grund).toBe("zu_wenig_daten");
      expect(x.einheiten).toBe(0);
      expect(x.neu).toBe(x.aktuell);
      expect(x.aktuell).toBe(3);
    }
  });

  it("Reihenfolge entspricht MUSTER, auch bei umgekehrter Eingabe", () => {
    const einheiten = [...MUSTER].reverse().map((m) => einheit(m, 5, OBEN_RPE_OK));
    expect(stufenCheck(eingabe(einheiten)).map((x) => x.muster)).toEqual([...MUSTER]);
  });

  it("liefert Muster ohne Einheiten ebenfalls", () => {
    const r = stufenCheck(eingabe([einheit("DH", 5, OBEN_RPE_OK)]));
    expect(r.map((x) => x.muster)).toEqual([...MUSTER]);
    expect(fuer("KN", eingabe([einheit("DH", 5, OBEN_RPE_OK)]))).toEqual({
      muster: "KN",
      aktuell: 3,
      empfehlung: "halten",
      neu: 3,
      grund: "zu_wenig_daten",
      einheiten: 0,
    });
  });

  it("übernimmt die Stufe je Muster als aktuell", () => {
    const r = stufenCheck(eingabe([], { KN: 1, HB: 2, DH: 4, RU: 5 }));
    expect(r.map((x) => x.aktuell)).toEqual([1, 2, 4, 3, 3, 3, 3, 5]);
  });

  it("begrenzt die Stufe auf 1 bis 5 und behandelt Nicht-Zahlen als 2", () => {
    const roh = {
      KN: 0,
      HB: 9,
      DH: -3,
      DV: Number.NaN,
      ZH: undefined,
      ZV: "4",
      TR: 3.6,
      RU: null,
    } as unknown as Record<Muster, number>;
    const r = stufenCheck({ stufen: roh, einheiten: [] });
    expect(r.map((x) => x.aktuell)).toEqual([1, 5, 1, 2, 2, 2, 4, 2]);
    expect(r.map((x) => x.neu)).toEqual([1, 5, 1, 2, 2, 2, 4, 2]);
  });

  it("verändert die Eingabe nicht", () => {
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK), einheit("KN", 6, OBEN_RPE_OK)]);
    const kopie = JSON.parse(JSON.stringify(e)) as StufenCheckEingabe;
    stufenCheck(e);
    expect(e).toEqual(kopie);
  });
});

describe("gewertete Einheiten", () => {
  it("genau zwei gewertete Einheiten reichen für eine Empfehlung", () => {
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK), einheit("KN", 6, OBEN_RPE_OK)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "erhoehen", einheiten: 2 });
  });

  it("eine gewertete Einheit ist zu wenig, selbst bei perfekten Werten", () => {
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK)]);
    expect(fuer("KN", e)).toEqual({
      muster: "KN",
      aktuell: 3,
      empfehlung: "halten",
      neu: 3,
      grund: "zu_wenig_daten",
      einheiten: 1,
    });
  });

  it("eine gewertete Einheit ist zu wenig, selbst bei klar verfehlter Untergrenze", () => {
    const e = eingabe([einheit("KN", 5, wdhSaetze([4, 4, 4], 10))]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "halten", grund: "zu_wenig_daten" });
  });

  it("Einheiten aus Woche 1 bis 4 werden ignoriert", () => {
    const e = eingabe([
      einheit("KN", 1, OBEN_RPE_OK),
      einheit("KN", 2, OBEN_RPE_OK),
      einheit("KN", 3, OBEN_RPE_OK),
      einheit("KN", 4, OBEN_RPE_OK),
      einheit("KN", 5, OBEN_RPE_OK),
    ]);
    expect(fuer("KN", e)).toMatchObject({
      empfehlung: "halten",
      grund: "zu_wenig_daten",
      einheiten: 1,
    });
  });

  it("Einheiten aus Woche 1 bis 4 verhindern weder Senken noch Erhöhen in Woche 5/6", () => {
    const schlecht = wdhSaetze([4, 4, 4], 10);
    const e = eingabe([
      einheit("KN", 3, schlecht),
      einheit("KN", 4, schlecht),
      einheit("KN", 5, OBEN_RPE_OK),
      einheit("KN", 6, OBEN_RPE_OK),
    ]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "erhoehen", einheiten: 2 });
  });

  it("Woche 5 und Woche 6 zählen beide", () => {
    const e = eingabe([einheit("HB", 5, OBEN_RPE_OK), einheit("HB", 6, OBEN_RPE_OK)]);
    expect(fuer("HB", e).einheiten).toBe(2);
  });

  it("Woche 7 und Woche 0 zählen nicht", () => {
    const e = eingabe([einheit("HB", 0, OBEN_RPE_OK), einheit("HB", 7, OBEN_RPE_OK)]);
    expect(fuer("HB", e).einheiten).toBe(0);
  });

  it("Einheit ohne jeden Messwert zählt nicht als gewertet", () => {
    const leer = [satz({ rpe: 7 }), satz({ gewicht: 20, rpe: 7 })];
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK), einheit("KN", 6, leer)]);
    expect(fuer("KN", e)).toMatchObject({
      empfehlung: "halten",
      grund: "zu_wenig_daten",
      einheiten: 1,
    });
  });

  it("Einheit ohne Sätze zählt nicht als gewertet", () => {
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK), einheit("KN", 6, [])]);
    expect(fuer("KN", e)).toMatchObject({ grund: "zu_wenig_daten", einheiten: 1 });
  });

  it("Messwert der falschen Belastungsart zählt nicht", () => {
    // Zeitübung, aber nur Wiederholungen geloggt
    const falsch = [satz({ wdh: 40, rpe: 7 })];
    const e = eingabe([einheit("RU", 5, falsch, ZEIT), einheit("RU", 6, falsch, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ grund: "zu_wenig_daten", einheiten: 0 });
  });

  it("einzelne Sätze ohne Messwert werden übersprungen, auch ihr RPE", () => {
    const saetze = [
      satz({ wdh: 12, rpe: 7 }),
      satz({ wdh: null, rpe: 10 }), // fehlender Messwert: weder zu hart noch Untergrenze
      satz({ wdh: 12, rpe: 7 }),
    ];
    const e = eingabe([einheit("KN", 5, saetze), einheit("KN", 6, saetze)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "erhoehen", grund: "ziel_erreicht" });
  });

  it("Messwert 0 ist ein Messwert und verfehlt die Untergrenze", () => {
    const saetze = wdhSaetze([0, 12, 12], 7);
    const e = eingabe([einheit("KN", 5, saetze), einheit("KN", 6, saetze)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });
});

describe("Erhöhen", () => {
  const erhoehenGrund = { empfehlung: "erhoehen", grund: "ziel_erreicht" } as const;

  it("alle Sätze an der Obergrenze bei RPE 7 in zwei Einheiten: Stufe + 1", () => {
    const e = eingabe([einheit("DH", 5, OBEN_RPE_OK), einheit("DH", 6, OBEN_RPE_OK)], { DH: 3 });
    expect(fuer("DH", e)).toEqual({
      muster: "DH",
      aktuell: 3,
      empfehlung: "erhoehen",
      neu: 4,
      grund: "ziel_erreicht",
      einheiten: 2,
    });
  });

  it("Werte über der Obergrenze erfüllen das Ziel", () => {
    const saetze = wdhSaetze([14, 13, 15], 6);
    const e = eingabe([einheit("DH", 5, saetze), einheit("DH", 6, saetze)]);
    expect(fuer("DH", e)).toMatchObject(erhoehenGrund);
  });

  it("RPE 7 erfüllt das Ziel", () => {
    const e = eingabe([einheit("DH", 5, wdhSaetze(OBEN, 7)), einheit("DH", 6, wdhSaetze(OBEN, 7))]);
    expect(fuer("DH", e)).toMatchObject(erhoehenGrund);
  });

  it("RPE 8 erfüllt das Ziel nicht: halten, stabil", () => {
    const e = eingabe([einheit("DH", 5, wdhSaetze(OBEN, 8)), einheit("DH", 6, wdhSaetze(OBEN, 8))]);
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil", neu: 3 });
  });

  it("RPE 9 ist zu hart: senken statt erhöhen", () => {
    const e = eingabe([einheit("DH", 5, wdhSaetze(OBEN, 9)), einheit("DH", 6, wdhSaetze(OBEN, 9))]);
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "senken", grund: "zu_hart", neu: 2 });
  });

  it("ein einziger Satz mit RPE 8 verhindert das Erhöhen", () => {
    const gut = wdhSaetze(OBEN, 7);
    const eineMit8 = [...wdhSaetze([12, 12], 7), satz({ wdh: 12, rpe: 8 })];
    const e = eingabe([einheit("DH", 5, gut), einheit("DH", 6, eineMit8)]);
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("Obergrenze minus 1 in einem Satz verhindert das Erhöhen", () => {
    const knapp = [...wdhSaetze([12, 12], 7), satz({ wdh: 11, rpe: 7 })];
    const e = eingabe([einheit("DH", 5, OBEN_RPE_OK), einheit("DH", 6, knapp)]);
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil", neu: 3 });
  });

  it("Obergrenze minus 1 in allen Einheiten: kein Erhöhen, aber auch kein Senken", () => {
    const knapp = wdhSaetze([11, 11, 11], 7);
    const e = eingabe([einheit("DH", 5, knapp), einheit("DH", 6, knapp)]);
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("fehlendes RPE zählt für das Erhöhen als erfüllt", () => {
    const ohneRpe = wdhSaetze(OBEN, null);
    const e = eingabe([einheit("DH", 5, ohneRpe), einheit("DH", 6, ohneRpe)]);
    expect(fuer("DH", e)).toMatchObject(erhoehenGrund);
  });

  it("gemischt: ein Satz ohne RPE, andere mit RPE 7", () => {
    const gemischt = [satz({ wdh: 12, rpe: null }), satz({ wdh: 12, rpe: 7 })];
    const e = eingabe([einheit("DH", 5, gemischt), einheit("DH", 6, gemischt)]);
    expect(fuer("DH", e)).toMatchObject(erhoehenGrund);
  });

  it("alle gewerteten Einheiten müssen das Ziel erreichen, nicht nur zwei", () => {
    const e = eingabe([
      einheit("DH", 5, OBEN_RPE_OK),
      einheit("DH", 5, OBEN_RPE_OK),
      einheit("DH", 6, wdhSaetze([12, 12, 11], 7)),
    ]);
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil", einheiten: 3 });
  });

  it("drei Einheiten mit erreichtem Ziel erhöhen und zählen alle", () => {
    const e = eingabe([
      einheit("DH", 5, OBEN_RPE_OK),
      einheit("DH", 5, OBEN_RPE_OK),
      einheit("DH", 6, OBEN_RPE_OK),
    ]);
    expect(fuer("DH", e)).toMatchObject({ ...erhoehenGrund, einheiten: 3 });
  });

  it("Stufe 4 wird zu 5", () => {
    const e = eingabe([einheit("DH", 5, OBEN_RPE_OK), einheit("DH", 6, OBEN_RPE_OK)], { DH: 4 });
    expect(fuer("DH", e)).toMatchObject({ aktuell: 4, empfehlung: "erhoehen", neu: 5 });
  });

  it("Stufe 5: halten mit Grund grenze", () => {
    const e = eingabe([einheit("DH", 5, OBEN_RPE_OK), einheit("DH", 6, OBEN_RPE_OK)], { DH: 5 });
    expect(fuer("DH", e)).toEqual({
      muster: "DH",
      aktuell: 5,
      empfehlung: "halten",
      neu: 5,
      grund: "grenze",
      einheiten: 2,
    });
  });

  it("Stufe 1 wird bei Erhöhen zu 2", () => {
    const e = eingabe([einheit("DH", 5, OBEN_RPE_OK), einheit("DH", 6, OBEN_RPE_OK)], { DH: 1 });
    expect(fuer("DH", e)).toMatchObject({ empfehlung: "erhoehen", neu: 2 });
  });

  it("Woche 6 mit eigenem Bereich 8–12 wird wie Woche 5 bewertet", () => {
    const e = eingabe([einheit("DH", 6, OBEN_RPE_OK), einheit("DH", 6, OBEN_RPE_OK)]);
    expect(fuer("DH", e)).toMatchObject(erhoehenGrund);
  });

  it("nur eine nicht gewertete Einheit ändert nichts an der Mehrheit gewerteter", () => {
    const leer = [satz({ rpe: 7 })];
    const e = eingabe([
      einheit("DH", 5, OBEN_RPE_OK),
      einheit("DH", 5, leer),
      einheit("DH", 6, OBEN_RPE_OK),
    ]);
    expect(fuer("DH", e)).toMatchObject({ ...erhoehenGrund, einheiten: 2 });
  });
});

describe("Senken", () => {
  it("Untergrenze minus 1 in nur einer Einheit: kein Senken", () => {
    const knapp = wdhSaetze([7, 9, 9], 7);
    const e = eingabe([einheit("ZH", 5, knapp), einheit("ZH", 6, wdhSaetze([9, 9, 9], 7))]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil", neu: 3 });
  });

  it("Untergrenze minus 1 in zwei Einheiten: Senken wegen untergrenze_verfehlt", () => {
    const knapp = wdhSaetze([7, 9, 9], 7);
    const e = eingabe([einheit("ZH", 5, knapp), einheit("ZH", 6, knapp)]);
    expect(fuer("ZH", e)).toEqual({
      muster: "ZH",
      aktuell: 3,
      empfehlung: "senken",
      neu: 2,
      grund: "untergrenze_verfehlt",
      einheiten: 2,
    });
  });

  it("genau an der Untergrenze (8) ist nicht verfehlt", () => {
    const grenze = wdhSaetze([8, 8, 8], 7);
    const e = eingabe([einheit("ZH", 5, grenze), einheit("ZH", 6, grenze)]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("ein Satz unter der Untergrenze genügt, um die Einheit als verfehlt zu zählen", () => {
    const einer = wdhSaetze([12, 12, 7], 7);
    const e = eingabe([einheit("ZH", 5, einer), einheit("ZH", 6, einer)]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });

  it("RPE 9 in einer Einheit: kein Senken", () => {
    const e = eingabe([
      einheit("ZH", 5, wdhSaetze([10, 10, 10], 9)),
      einheit("ZH", 6, OBEN_RPE_OK),
    ]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("RPE 9 in zwei Einheiten: Senken wegen zu_hart", () => {
    const hart = wdhSaetze([10, 10, 10], 9);
    const e = eingabe([einheit("ZH", 5, hart), einheit("ZH", 6, hart)]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", neu: 2, grund: "zu_hart" });
  });

  it("RPE 8 ist noch nicht zu hart", () => {
    const e = eingabe([
      einheit("ZH", 5, wdhSaetze([10, 10, 10], 8)),
      einheit("ZH", 6, wdhSaetze([10, 10, 10], 8)),
    ]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("RPE 10 zählt als zu hart", () => {
    const hart = wdhSaetze([10, 10, 10], 10);
    const e = eingabe([einheit("ZH", 5, hart), einheit("ZH", 6, hart)]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", grund: "zu_hart" });
  });

  it("gemischt: eine Einheit zu hart, eine Untergrenze verfehlt, ergibt Senken", () => {
    const e = eingabe([
      einheit("ZH", 5, wdhSaetze([10, 10, 10], 9)),
      einheit("ZH", 6, wdhSaetze([7, 10, 10], 7)),
    ]);
    // Gleichstand 1:1 → zu_hart
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", grund: "zu_hart" });
  });

  it("eine Einheit mit beiden Problemen zählt nur einmal", () => {
    const beides = wdhSaetze([6, 6, 6], 9);
    // Zweite Einheit unauffällig: nur 1 problematische Einheit → kein Senken
    const e = eingabe([einheit("ZH", 5, beides), einheit("ZH", 6, wdhSaetze([10, 10, 10], 7))]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("Gleichstand zwischen zu_hart und untergrenze_verfehlt ergibt zu_hart", () => {
    const beides = wdhSaetze([6, 6, 6], 9); // verfehlt und hart
    const e = eingabe([einheit("ZH", 5, beides), einheit("ZH", 6, beides)]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", grund: "zu_hart" });
  });

  it("mehr Einheiten mit zu_hart als mit Untergrenze: zu_hart", () => {
    const e = eingabe([
      einheit("ZH", 5, wdhSaetze([10, 10, 10], 9)),
      einheit("ZH", 5, wdhSaetze([10, 10, 10], 9)),
      einheit("ZH", 6, wdhSaetze([7, 10, 10], 7)),
    ]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", grund: "zu_hart" });
  });

  it("mehr Einheiten mit Untergrenze verfehlt als zu_hart: untergrenze_verfehlt", () => {
    const e = eingabe([
      einheit("ZH", 5, wdhSaetze([7, 10, 10], 7)),
      einheit("ZH", 5, wdhSaetze([7, 10, 10], 7)),
      einheit("ZH", 6, wdhSaetze([10, 10, 10], 9)),
    ]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });

  it("Senken mit gemischten Problemen auch bei einer guten dritten Einheit", () => {
    const e = eingabe([
      einheit("ZH", 5, wdhSaetze([7, 10, 10], 7)),
      einheit("ZH", 5, wdhSaetze([10, 10, 10], 9)),
      einheit("ZH", 6, OBEN_RPE_OK),
    ]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", einheiten: 3 });
  });

  it("Senken geht vor Erhöhen: zwei schlechte Einheiten neben einer perfekten", () => {
    const e = eingabe([
      einheit("ZH", 5, OBEN_RPE_OK),
      einheit("ZH", 5, wdhSaetze([7, 7, 7], 9)),
      einheit("ZH", 6, wdhSaetze([7, 7, 7], 9)),
    ]);
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", neu: 2 });
  });

  it("Stufe 2 wird zu 1", () => {
    const hart = wdhSaetze([10, 10, 10], 9);
    const e = eingabe([einheit("ZH", 5, hart), einheit("ZH", 6, hart)], { ZH: 2 });
    expect(fuer("ZH", e)).toMatchObject({ aktuell: 2, empfehlung: "senken", neu: 1 });
  });

  it("Stufe 1: halten mit Grund grenze statt Senken", () => {
    const hart = wdhSaetze([10, 10, 10], 9);
    const e = eingabe([einheit("ZH", 5, hart), einheit("ZH", 6, hart)], { ZH: 1 });
    expect(fuer("ZH", e)).toEqual({
      muster: "ZH",
      aktuell: 1,
      empfehlung: "halten",
      neu: 1,
      grund: "grenze",
      einheiten: 2,
    });
  });

  it("Stufe 1 mit verfehlter Untergrenze: ebenfalls grenze", () => {
    const knapp = wdhSaetze([7, 9, 9], 7);
    const e = eingabe([einheit("ZH", 5, knapp), einheit("ZH", 6, knapp)], { ZH: 1 });
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "halten", grund: "grenze", neu: 1 });
  });

  it("Stufe 5 darf gesenkt werden", () => {
    const hart = wdhSaetze([10, 10, 10], 9);
    const e = eingabe([einheit("ZH", 5, hart), einheit("ZH", 6, hart)], { ZH: 5 });
    expect(fuer("ZH", e)).toMatchObject({ empfehlung: "senken", neu: 4, grund: "zu_hart" });
  });

  it("Stufe 1 darf bei erreichtem Ziel erhöht werden", () => {
    const ok = eingabe([einheit("ZH", 5, OBEN_RPE_OK), einheit("ZH", 6, OBEN_RPE_OK)], { ZH: 1 });
    expect(fuer("ZH", ok)).toMatchObject({ empfehlung: "erhoehen", neu: 2 });
  });
});

describe("Zeit- und Streckenübungen", () => {
  it("Zeitübung 20–40 s: alle Sätze bei 40 s und RPE 7 erhöhen", () => {
    const saetze = [satz({ sekunden: 40, rpe: 7 }), satz({ sekunden: 45, rpe: 7 })];
    const e = eingabe([einheit("RU", 5, saetze, ZEIT), einheit("RU", 6, saetze, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "erhoehen", grund: "ziel_erreicht" });
  });

  it("Zeitübung: 39 s verhindert das Erhöhen", () => {
    const knapp = [satz({ sekunden: 40, rpe: 7 }), satz({ sekunden: 39, rpe: 7 })];
    const e = eingabe([einheit("RU", 5, knapp, ZEIT), einheit("RU", 6, knapp, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("Zeitübung: 19 s verfehlt die Untergrenze in zwei Einheiten, Senken", () => {
    const kurz = [satz({ sekunden: 19, rpe: 7 }), satz({ sekunden: 30, rpe: 7 })];
    const e = eingabe([einheit("RU", 5, kurz, ZEIT), einheit("RU", 6, kurz, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });

  it("Zeitübung: 20 s liegt genau auf der Untergrenze", () => {
    const grenze = [satz({ sekunden: 20, rpe: 7 })];
    const e = eingabe([einheit("RU", 5, grenze, ZEIT), einheit("RU", 6, grenze, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("Zeitübung: Wiederholungen im Satz werden nicht als Messwert gelesen", () => {
    // wdh 100 würde als Wiederholungswert die Obergrenze weit übertreffen; sekunden 10 verfehlt
    const saetze = [satz({ sekunden: 10, wdh: 100, rpe: 7 })];
    const e = eingabe([einheit("RU", 5, saetze, ZEIT), einheit("RU", 6, saetze, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });

  it("Zeitübung: RPE 9 ist zu hart", () => {
    const hart = [satz({ sekunden: 30, rpe: 9 })];
    const e = eingabe([einheit("RU", 5, hart, ZEIT), einheit("RU", 6, hart, ZEIT)]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "senken", grund: "zu_hart" });
  });

  it("Streckenübung 20–40 m: Messwert meter, 40 m bei RPE 7 erhöht", () => {
    const saetze = [satz({ meter: 40, rpe: 7 }), satz({ meter: 40, rpe: 6 })];
    const e = eingabe([einheit("TR", 5, saetze, STRECKE), einheit("TR", 6, saetze, STRECKE)]);
    expect(fuer("TR", e)).toMatchObject({ empfehlung: "erhoehen", neu: 4 });
  });

  it("Streckenübung: 39 m verhindert das Erhöhen", () => {
    const knapp = [satz({ meter: 39, rpe: 7 })];
    const e = eingabe([einheit("TR", 5, knapp, STRECKE), einheit("TR", 6, knapp, STRECKE)]);
    expect(fuer("TR", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("Streckenübung: 19 m in zwei Einheiten senkt", () => {
    const kurz = [satz({ meter: 19, rpe: 7 })];
    const e = eingabe([einheit("TR", 5, kurz, STRECKE), einheit("TR", 6, kurz, STRECKE)]);
    expect(fuer("TR", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });

  it("Streckenübung: Sekunden statt Meter geloggt zählt nicht", () => {
    const falsch = [satz({ sekunden: 40, rpe: 7 })];
    const e = eingabe([einheit("TR", 5, falsch, STRECKE), einheit("TR", 6, falsch, STRECKE)]);
    expect(fuer("TR", e)).toMatchObject({ grund: "zu_wenig_daten", einheiten: 0 });
  });

  it("Zeit- und Wiederholungsübungen desselben Musters werden gemeinsam gezählt", () => {
    const e = eingabe([
      einheit("RU", 5, [satz({ sekunden: 40, rpe: 7 })], ZEIT),
      einheit("RU", 6, OBEN_RPE_OK),
    ]);
    expect(fuer("RU", e)).toMatchObject({ empfehlung: "erhoehen", einheiten: 2 });
  });
});

describe("Übung mit eigenem Standardbereich 3–6", () => {
  it("6 Wiederholungen sind die Obergrenze: Erhöhen", () => {
    const saetze = wdhSaetze([6, 6, 6], 7);
    const e = eingabe([einheit("KN", 5, saetze, WDH_3_6), einheit("KN", 6, saetze, WDH_3_6)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "erhoehen", grund: "ziel_erreicht" });
  });

  it("5 Wiederholungen verhindern das Erhöhen, verfehlen die Untergrenze aber nicht", () => {
    const saetze = wdhSaetze([6, 6, 5], 7);
    const e = eingabe([einheit("KN", 5, saetze, WDH_3_6), einheit("KN", 6, saetze, WDH_3_6)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
  });

  it("2 Wiederholungen verfehlen die Untergrenze 3 in zwei Einheiten: Senken", () => {
    const saetze = wdhSaetze([4, 2, 3], 7);
    const e = eingabe([einheit("KN", 5, saetze, WDH_3_6), einheit("KN", 6, saetze, WDH_3_6)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "senken", grund: "untergrenze_verfehlt" });
  });

  it("der Bereich 8–12 würde hier fälschlich Senken auslösen, 3–6 nicht", () => {
    const saetze = wdhSaetze([5, 5, 5], 7);
    const e = eingabe([einheit("KN", 5, saetze, WDH_3_6), einheit("KN", 6, saetze, WDH_3_6)]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "halten", grund: "stabil" });
    const standard = eingabe([einheit("KN", 5, saetze), einheit("KN", 6, saetze)]);
    expect(fuer("KN", standard)).toMatchObject({ empfehlung: "senken" });
  });

  it("Übungen mit verschiedenem Bereich in einem Muster nutzen je den eigenen Bereich", () => {
    const e = eingabe([
      einheit("KN", 5, wdhSaetze([6, 6, 6], 7), WDH_3_6),
      einheit("KN", 6, wdhSaetze([12, 12, 12], 7), WDH_STANDARD),
    ]);
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "erhoehen", einheiten: 2 });
  });
});

describe("Muster unabhängig voneinander", () => {
  it("jedes Muster wird nur aus seinen eigenen Einheiten bewertet", () => {
    const gut = (m: Muster, w: number) => einheit(m, w, OBEN_RPE_OK);
    const hart = (m: Muster, w: number) => einheit(m, w, wdhSaetze([10, 10, 10], 9));
    const e = eingabe(
      [
        gut("KN", 5),
        gut("KN", 6),
        hart("HB", 5),
        hart("HB", 6),
        gut("DH", 5), // nur eine Einheit
        einheit("DV", 5, wdhSaetze([10, 10, 10], 7)),
        einheit("DV", 6, wdhSaetze([10, 10, 10], 7)),
      ],
      { KN: 2, HB: 4, DH: 3, DV: 3, ZH: 3, ZV: 3, TR: 3, RU: 3 },
    );
    const r = stufenCheck(e);
    expect(r.map((x) => [x.muster, x.empfehlung, x.neu, x.grund, x.einheiten])).toEqual([
      ["KN", "erhoehen", 3, "ziel_erreicht", 2],
      ["HB", "senken", 3, "zu_hart", 2],
      ["DH", "halten", 3, "zu_wenig_daten", 1],
      ["DV", "halten", 3, "stabil", 2],
      ["ZH", "halten", 3, "zu_wenig_daten", 0],
      ["ZV", "halten", 3, "zu_wenig_daten", 0],
      ["TR", "halten", 3, "zu_wenig_daten", 0],
      ["RU", "halten", 3, "zu_wenig_daten", 0],
    ]);
  });

  it("Einheiten verschiedener Muster addieren sich nicht", () => {
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK), einheit("HB", 6, OBEN_RPE_OK)]);
    expect(fuer("KN", e)).toMatchObject({ grund: "zu_wenig_daten", einheiten: 1 });
    expect(fuer("HB", e)).toMatchObject({ grund: "zu_wenig_daten", einheiten: 1 });
  });

  it("Grenzen gelten je Muster mit der eigenen Stufe", () => {
    const gut = (m: Muster) => [einheit(m, 5, OBEN_RPE_OK), einheit(m, 6, OBEN_RPE_OK)];
    const e = eingabe([...gut("KN"), ...gut("HB")], { KN: 5, HB: 4 });
    expect(fuer("KN", e)).toMatchObject({ empfehlung: "halten", grund: "grenze", neu: 5 });
    expect(fuer("HB", e)).toMatchObject({ empfehlung: "erhoehen", neu: 5 });
  });

  it("Reihenfolge der Einheiten in der Eingabe spielt keine Rolle", () => {
    const a = [
      einheit("KN", 5, OBEN_RPE_OK),
      einheit("HB", 5, wdhSaetze([10, 10, 10], 9)),
      einheit("KN", 6, OBEN_RPE_OK),
      einheit("HB", 6, wdhSaetze([10, 10, 10], 9)),
    ];
    expect(stufenCheck(eingabe(a))).toEqual(stufenCheck(eingabe([...a].reverse())));
  });

  it("ist deterministisch", () => {
    const e = eingabe([einheit("KN", 5, OBEN_RPE_OK), einheit("KN", 6, OBEN_RPE_OK)]);
    expect(stufenCheck(e)).toEqual(stufenCheck(e));
  });
});
