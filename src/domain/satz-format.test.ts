import { describe, expect, it } from "vitest";
import { formatBereich, formatSatz, formatZahl, rpeText, zielText } from "./satz-format";
import type { SatzWerte } from "./training-types";

const satz = (o: Partial<SatzWerte>): SatzWerte => ({
  gewicht: null,
  wdh: null,
  sekunden: null,
  meter: null,
  rpe: null,
  tempo: false,
  ...o,
});

describe("formatZahl", () => {
  it.each([
    [12, "12"],
    [12.5, "12,5"],
    [2.25, "2,25"],
    [10.0, "10"],
    [0.1 + 0.2, "0,3"],
  ])("%s → %s", (n, text) => expect(formatZahl(n)).toBe(text));
});

describe("zielText / formatBereich / rpeText", () => {
  it("Wiederholungen, Zeit, Strecke und einseitig", () => {
    expect(zielText({ min: 8, max: 12 }, "wdh", false)).toBe("8–12 Wdh");
    expect(zielText({ min: 8, max: 12 }, "wdh", true)).toBe("8–12 Wdh pro Seite");
    expect(zielText({ min: 20, max: 40, einheit: "s" }, "zeit", false)).toBe("20–40 s");
    expect(zielText({ min: 20, max: 40, einheit: "m" }, "strecke", true)).toBe("20–40 m pro Seite");
    expect(formatBereich({ min: 3, max: 6 })).toBe("3–6");
  });
  it("RPE", () => {
    expect(rpeText(7, 8)).toBe("RPE 7–8");
    expect(rpeText(6, 6)).toBe("RPE 6");
  });
});

describe("formatSatz", () => {
  it("mit Gewicht, ohne Gewicht, Zeit, Strecke, Tempo, RPE", () => {
    expect(formatSatz(satz({ gewicht: 12, wdh: 10, rpe: 7 }))).toBe("12 kg × 10 · RPE 7");
    expect(formatSatz(satz({ gewicht: 12.5, wdh: 8, rpe: 7.5 }))).toBe("12,5 kg × 8 · RPE 7,5");
    expect(formatSatz(satz({ wdh: 12 }))).toBe("12 Wdh");
    expect(formatSatz(satz({ wdh: 10, tempo: true, rpe: 8 }))).toBe("10 Wdh · Tempo · RPE 8");
    expect(formatSatz(satz({ sekunden: 30, rpe: 6 }))).toBe("30 s · RPE 6");
    expect(formatSatz(satz({ meter: 25, gewicht: 16 }))).toBe("25 m · 16 kg");
  });
});
