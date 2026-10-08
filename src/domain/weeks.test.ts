import { describe, expect, it } from "vitest";
import { RUNDEN_ZUSATZBLOCK } from "./training-types";
import { testKatalog } from "./test-katalog";
import type { Block, Exercise } from "./types";
import {
  einheitNachFortschritt,
  naechsteEinheitMit,
  rundenFuerBlock,
  wochenVorgabe,
  zielBereich,
} from "./weeks";

const katalog = testKatalog();
function uebung(id: string): Exercise {
  const u = katalog.find((x) => x.id === id);
  if (!u) throw new Error(`Übung ${id} fehlt im Katalog`);
  return u;
}

describe("wochenVorgabe", () => {
  it.each([
    [1, 3, 10, 12, 6, 6, "technik"],
    [2, 3, 10, 12, 7, 7, "einarbeiten"],
    [3, 3, 8, 12, 7, 8, "steigern"],
    [4, 3, 8, 12, 7, 8, "steigern"],
    [5, 3, 8, 12, 7, 8, "steigern"],
    [6, 2, 8, 12, 6, 6, "entlasten"],
  ])("Woche %i", (woche, runden, min, max, rpeMin, rpeMax, fokus) => {
    expect(wochenVorgabe(woche)).toEqual({
      woche,
      runden,
      wdhBereich: { min, max },
      rpeMin,
      rpeMax,
      fokus,
    });
  });

  it("begrenzt auf 1 bis 6", () => {
    expect(wochenVorgabe(0).woche).toBe(1);
    expect(wochenVorgabe(-5).woche).toBe(1);
    expect(wochenVorgabe(7).woche).toBe(6);
    expect(wochenVorgabe(Infinity).woche).toBe(6);
    expect(wochenVorgabe(NaN).woche).toBe(1);
    expect(wochenVorgabe(7).fokus).toBe("entlasten");
    expect(wochenVorgabe(0).fokus).toBe("technik");
  });

  it("rundet nicht ganzzahlige Werte", () => {
    expect(wochenVorgabe(2.7).woche).toBe(3);
    expect(wochenVorgabe(2.2).woche).toBe(2);
  });

  it("gibt unabhängige Kopien zurück", () => {
    const a = wochenVorgabe(1);
    a.wdhBereich.min = 99;
    expect(wochenVorgabe(1).wdhBereich.min).toBe(10);
  });
});

describe("rundenFuerBlock", () => {
  it("Zusatzblock hat in allen Wochen 2 Runden", () => {
    for (let w = 1; w <= 6; w++) expect(rundenFuerBlock(w, "Z")).toBe(RUNDEN_ZUSATZBLOCK);
    expect(RUNDEN_ZUSATZBLOCK).toBe(2);
  });

  it("Block 1 und 2 folgen der Woche", () => {
    const blocks: Block[] = ["1", "2"];
    for (const b of blocks) {
      for (const w of [1, 2, 3, 4, 5]) expect(rundenFuerBlock(w, b)).toBe(3);
      expect(rundenFuerBlock(6, b)).toBe(2);
    }
  });
});

describe("zielBereich", () => {
  it("KN-04 (8–12) folgt dem Wochenbereich", () => {
    const u = uebung("KN-04");
    expect(zielBereich(u, 1)).toEqual({ min: 10, max: 12 });
    expect(zielBereich(u, 2)).toEqual({ min: 10, max: 12 });
    expect(zielBereich(u, 3)).toEqual({ min: 8, max: 12 });
    expect(zielBereich(u, 6)).toEqual({ min: 8, max: 12 });
  });

  it("eigener Bereich bleibt in allen Wochen", () => {
    const klimmzug = uebung("ZV-06");
    expect(klimmzug.standardBereich).toBe("3–6");
    for (let w = 1; w <= 6; w++) expect(zielBereich(klimmzug, w)).toEqual({ min: 3, max: 6 });
    const u = { belastungsart: "wdh", standardBereich: "10–15" } as const;
    for (let w = 1; w <= 6; w++) expect(zielBereich(u, w)).toEqual({ min: 10, max: 15 });
  });

  it("Zeit behält Bereich und Einheit", () => {
    const plank = uebung("RU-03");
    for (let w = 1; w <= 6; w++) {
      expect(zielBereich(plank, w)).toEqual({ min: 20, max: 40, einheit: "s" });
    }
  });

  it("Strecke behält Bereich und Einheit", () => {
    const walk = uebung("TR-02");
    expect(zielBereich(walk, 1)).toEqual({ min: 20, max: 40, einheit: "m" });
    expect(zielBereich(walk, 4)).toEqual({ min: 20, max: 40, einheit: "m" });
  });

  it("nur wdh-Übungen mit 8–12 folgen der Woche", () => {
    expect(zielBereich({ belastungsart: "zeit", standardBereich: "8–12" }, 1)).toEqual({
      min: 8,
      max: 12,
    });
  });

  it("unparsbarer Text ergibt 8–12", () => {
    expect(zielBereich({ belastungsart: "wdh", standardBereich: "viele" }, 1)).toEqual({
      min: 8,
      max: 12,
    });
    expect(zielBereich({ belastungsart: "zeit", standardBereich: "" }, 3)).toEqual({
      min: 8,
      max: 12,
    });
  });
});

describe("einheitNachFortschritt", () => {
  it("2x pro Woche: A, B, A, B ...", () => {
    const erwartet = ["A", "B", "A", "B", "A", "B", "A", "B", "A", "B", "A", "B", "A", "B", "A"];
    erwartet.forEach((einheit, n) => {
      const r = einheitNachFortschritt(n, 2);
      expect(r.einheit).toBe(einheit);
      expect(r.woche).toBe(Math.floor(n / 2) + 1);
      expect(r.positionInWoche).toBe((n % 2) + 1);
      expect(r.blockFertig).toBe(n >= 12);
    });
  });

  it("3x pro Woche: A,B,A | B,A,B | A,B,A ...", () => {
    const erwartet = [
      ...["A", "B", "A"],
      ...["B", "A", "B"],
      ...["A", "B", "A"],
      ...["B", "A", "B"],
      ...["A", "B", "A"],
      ...["B", "A", "B"],
      ...["A", "B", "A"],
    ];
    erwartet.forEach((einheit, n) => {
      const r = einheitNachFortschritt(n, 3);
      expect(r.einheit).toBe(einheit);
      expect(r.woche).toBe(Math.floor(n / 3) + 1);
      expect(r.positionInWoche).toBe((n % 3) + 1);
      expect(r.blockFertig).toBe(n >= 18);
    });
  });

  it("blockFertig genau bei 12 (2x) bzw. 18 (3x)", () => {
    expect(einheitNachFortschritt(11, 2).blockFertig).toBe(false);
    expect(einheitNachFortschritt(12, 2).blockFertig).toBe(true);
    expect(einheitNachFortschritt(17, 3).blockFertig).toBe(false);
    expect(einheitNachFortschritt(18, 3).blockFertig).toBe(true);
  });

  it("letzte Einheit des Blocks und der Rhythmus danach", () => {
    expect(einheitNachFortschritt(11, 2)).toEqual({
      einheit: "B",
      woche: 6,
      positionInWoche: 2,
      blockFertig: false,
    });
    expect(einheitNachFortschritt(17, 3)).toEqual({
      einheit: "B",
      woche: 6,
      positionInWoche: 3,
      blockFertig: false,
    });
    expect(einheitNachFortschritt(18, 3)).toEqual({
      einheit: "A",
      woche: 7,
      positionInWoche: 1,
      blockFertig: true,
    });
    expect(einheitNachFortschritt(12, 2)).toEqual({
      einheit: "A",
      woche: 7,
      positionInWoche: 1,
      blockFertig: true,
    });
  });

  it("negative, gebrochene und ungültige Eingaben", () => {
    const start2 = einheitNachFortschritt(0, 2);
    expect(einheitNachFortschritt(-3, 2)).toEqual(start2);
    expect(einheitNachFortschritt(NaN, 2)).toEqual(start2);
    expect(einheitNachFortschritt(-Infinity, 3)).toEqual(einheitNachFortschritt(0, 3));
    expect(einheitNachFortschritt(2.9, 3)).toEqual(einheitNachFortschritt(2, 3));
    expect(start2).toEqual({ einheit: "A", woche: 1, positionInWoche: 1, blockFertig: false });
  });
});

describe("naechsteEinheitMit", () => {
  it("2×/Woche: nach A kommt A in der übernächsten Einheit", () => {
    expect(naechsteEinheitMit("A", 1, 2)).toMatchObject({ einheit: "A", woche: 2 });
    expect(naechsteEinheitMit("B", 1, 2)).toMatchObject({ einheit: "B", woche: 1 });
  });

  it("liefert die fällige Einheit selbst, wenn sie passt", () => {
    expect(naechsteEinheitMit("A", 0, 2)).toMatchObject({ einheit: "A", woche: 1 });
  });

  it("3×/Woche: Woche 1 A-B-A, Woche 2 B-A-B", () => {
    // Nach A (n=1): nächste A ist die dritte Einheit der Woche 1
    expect(naechsteEinheitMit("A", 1, 3)).toMatchObject({ einheit: "A", woche: 1 });
    // Nach dem zweiten A der Woche 1 (n=3) beginnt Woche 2 mit B; das nächste A ist an Position 2
    expect(naechsteEinheitMit("A", 3, 3)).toMatchObject({ einheit: "A", woche: 2 });
  });

  it("am Blockende liegt die Woche über 6", () => {
    expect(naechsteEinheitMit("A", 11, 2).woche).toBeGreaterThan(6);
  });
});
