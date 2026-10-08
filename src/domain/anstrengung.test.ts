import { describe, expect, it } from "vitest";
import {
  STUFEN,
  anstrengungBereichText,
  anstrengungText,
  normiereAnstrengung,
  stufeVonWert,
  wertVonStufe,
} from "./anstrengung";
import { RPE_ERHOEHEN_MAX, RPE_SENKEN_AB } from "./stufen-check-types";

describe("Anstrengungsstufen", () => {
  it("vier Stufen mit eindeutigen Namen und aufsteigenden Werten", () => {
    expect(STUFEN.map((s) => s.text)).toEqual(["Leicht", "Gut", "Schwer", "Am Limit"]);
    expect(STUFEN.map((s) => s.wert)).toEqual([6, 8, 9, 10]);
  });

  it("jede Stufe nennt die Reserve in Wiederholungen", () => {
    for (const s of STUFEN) {
      expect(s.reserveKurz).toMatch(/noch|keine/);
      expect(s.reserveSatz).toMatch(/Wiederholung/);
    }
  });

  it("gespeicherte Werte liegen wieder in ihrer Stufe", () => {
    for (const s of STUFEN) expect(stufeVonWert(wertVonStufe(s.key)).key).toBe(s.key);
  });

  it("alte RPE-Werte 1–10 (auch halbe Schritte) werden eingeteilt", () => {
    const erwartet: [number, string][] = [
      [1, "Leicht"],
      [5, "Leicht"],
      [6, "Leicht"],
      [7, "Leicht"],
      [7.5, "Gut"],
      [8, "Gut"],
      [8.5, "Schwer"],
      [9, "Schwer"],
      [9.5, "Am Limit"],
      [10, "Am Limit"],
    ];
    for (const [rpe, text] of erwartet) expect(anstrengungText(rpe), `RPE ${rpe}`).toBe(text);
  });

  it("normiert Werte auf den gespeicherten Wert der Stufe", () => {
    expect(normiereAnstrengung(7)).toBe(6);
    expect(normiereAnstrengung(7.5)).toBe(8);
    expect(normiereAnstrengung(9.5)).toBe(10);
  });

  it("Bereichstexte der Wochenvorgaben", () => {
    expect(anstrengungBereichText(6, 6)).toBe("Leicht");
    expect(anstrengungBereichText(7, 7)).toBe("Leicht");
    expect(anstrengungBereichText(7, 8)).toBe("Leicht bis Gut");
  });

  it("die Stufen passen zu den Schwellen der Regeln: nur Leicht darf den Stufen-Check erhöhen", () => {
    const [leicht, gut, schwer, limit] = STUFEN;
    expect(leicht!.wert).toBeLessThanOrEqual(RPE_ERHOEHEN_MAX);
    expect(gut!.wert).toBeGreaterThan(RPE_ERHOEHEN_MAX);
    // Senken ab "Schwer"
    expect(schwer!.wert).toBeGreaterThanOrEqual(RPE_SENKEN_AB);
    expect(limit!.wert).toBeGreaterThanOrEqual(RPE_SENKEN_AB);
    expect(gut!.wert).toBeLessThan(RPE_SENKEN_AB);
  });
});
