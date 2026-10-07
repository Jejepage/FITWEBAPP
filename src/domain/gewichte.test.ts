import { describe, expect, it } from "vitest";
import { formatGewichte, parseGewichte } from "./gewichte";

const werte = (t: string) => {
  const r = parseGewichte(t);
  if (!r.ok) throw new Error(r.grund);
  return r.werte;
};

describe("parseGewichte", () => {
  it("liest Listen mit Komma+Leerzeichen, Semikolon, Leerzeichen und Zeilenumbruch", () => {
    expect(werte("12, 16")).toEqual([12, 16]);
    expect(werte("16;12")).toEqual([12, 16]);
    expect(werte("12 16")).toEqual([12, 16]);
    expect(werte("12\n16")).toEqual([12, 16]);
  });

  it("Komma ohne Leerzeichen ist ein Dezimalkomma, Punkt geht auch", () => {
    expect(werte("2,5")).toEqual([2.5]);
    expect(werte("2.5, 5")).toEqual([2.5, 5]);
    expect(werte("1,25 2,5")).toEqual([1.25, 2.5]);
  });

  it("liest Bereiche von–bis/Schritt (Gedankenstrich oder Bindestrich)", () => {
    expect(werte("2–20/2")).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    expect(werte("2-8/2")).toEqual([2, 4, 6, 8]);
    expect(werte("2,5–10/2,5")).toEqual([2.5, 5, 7.5, 10]);
    expect(werte("5–5/1")).toEqual([5]);
  });

  it("verbindet Bereiche und Einzelwerte, sortiert und entfernt Doppelte", () => {
    expect(werte("16, 2–6/2, 4, 12")).toEqual([2, 4, 6, 12, 16]);
  });

  it("leerer Text ergibt eine leere Liste", () => {
    expect(werte("")).toEqual([]);
    expect(werte("  ")).toEqual([]);
  });

  it.each([
    ["abc", /abc/],
    ["12 kg", /kg/],
    ["0", /zwischen/],
    ["501", /zwischen/],
    ["-5", /gültige/],
    ["2–20/0", /Schrittweite/],
    ["20–2/2", /Anfang/],
    ["1–1000/1", /zu viele/],
    ["2–20", /gültige/],
  ])("verwirft %s", (text, grund) => {
    const r = parseGewichte(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toMatch(grund);
  });

  it("begrenzt die Zahl verschiedener Gewichte", () => {
    const viele = Array.from({ length: 101 }, (_, i) => i + 1).join(" ");
    expect(parseGewichte(viele).ok).toBe(false);
  });
});

describe("formatGewichte", () => {
  it("kürzt gleichmäßige Folgen ab 4 Werten", () => {
    expect(formatGewichte([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])).toBe("2–20/2");
    expect(formatGewichte([2.5, 5, 7.5, 10])).toBe("2,5–10/2,5");
  });

  it("lässt kurze Folgen und Einzelwerte aus", () => {
    expect(formatGewichte([12, 16])).toBe("12, 16");
    expect(formatGewichte([2, 4, 6])).toBe("2, 4, 6");
    expect(formatGewichte([])).toBe("");
  });

  it("gemischt: Folge plus Ausreißer", () => {
    expect(formatGewichte([2, 4, 6, 8, 12, 16])).toBe("2–8/2, 12, 16");
  });

  it("Round-Trip: parse(format(x)) ergibt x", () => {
    const beispiele = [
      [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
      [12, 16],
      [1.25, 2.5, 3.75, 5, 20],
      [2, 4, 6, 8, 12, 16, 24],
      [],
    ];
    for (const b of beispiele) expect(werte(formatGewichte(b))).toEqual(b);
  });
});
