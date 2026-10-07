import { describe, expect, it } from "vitest";
import { parseBereich } from "./bereich";

describe("parseBereich", () => {
  it("parst Wiederholungen, Sekunden und Meter", () => {
    expect(parseBereich("8–12")).toEqual({ min: 8, max: 12, einheit: undefined });
    expect(parseBereich("20-40 s")).toEqual({ min: 20, max: 40, einheit: "s" });
    expect(parseBereich("15–30 m")).toEqual({ min: 15, max: 30, einheit: "m" });
    expect(parseBereich("8 – 12 s")).toEqual({ min: 8, max: 12, einheit: "s" }); // Leerzeichen um den Strich sind ok
  });
  it.each(["", "8", "12–8", "0–5", "8–12 Wdh", "acht–zwölf"])("verwirft %s", (v) => {
    expect(parseBereich(v)).toBeNull();
  });
});
