import { describe, expect, it } from "vitest";
import { Ratenbremse, erstelleToken, pruefePasswort, pruefeToken } from "./auth";

const JETZT = Date.UTC(2026, 9, 8, 10, 0, 0);
const TAG = 86_400_000;

describe("Sitzungs-Token", () => {
  it("gültig innerhalb der Laufzeit", () => {
    const t = erstelleToken("geheim", JETZT);
    expect(pruefeToken("geheim", t, JETZT)).toBe(true);
    expect(pruefeToken("geheim", t, JETZT + 29 * TAG)).toBe(true);
  });

  it("nach 30 Tagen abgelaufen", () => {
    const t = erstelleToken("geheim", JETZT);
    expect(pruefeToken("geheim", t, JETZT + 30 * TAG + 1000)).toBe(false);
  });

  it("anderes Passwort (z. B. nach einem Wechsel) macht das Token ungültig", () => {
    expect(pruefeToken("neu", erstelleToken("alt", JETZT), JETZT)).toBe(false);
  });

  it("manipulierte Ablaufzeit oder Signatur wird erkannt", () => {
    const [ablauf, sig] = erstelleToken("geheim", JETZT).split(".") as [string, string];
    expect(pruefeToken("geheim", `${Number(ablauf) + 1000}.${sig}`, JETZT)).toBe(false);
    expect(
      pruefeToken("geheim", `${ablauf}.${sig.replace(/.$/, sig.endsWith("0") ? "1" : "0")}`, JETZT),
    ).toBe(false);
  });

  it.each([
    "",
    "abc",
    "123",
    "123.",
    ".abc",
    "123.zz",
    "1.2.3",
    `${"1".repeat(13)}.${"a".repeat(64)}`,
  ])("kaputtes Format %j wird abgelehnt", (t) =>
    expect(pruefeToken("geheim", t, JETZT)).toBe(false),
  );

  it("leeres Passwort: nie gültig", () => {
    expect(pruefeToken("", erstelleToken("", JETZT), JETZT)).toBe(false);
  });
});

describe("pruefePasswort", () => {
  it("richtig und falsch, unabhängig von der Länge", () => {
    expect(pruefePasswort("geheim", "geheim")).toBe(true);
    expect(pruefePasswort("Geheim", "geheim")).toBe(false);
    expect(pruefePasswort("", "geheim")).toBe(false);
    expect(pruefePasswort("geheim ", "geheim")).toBe(false);
    expect(pruefePasswort("x".repeat(10_000), "geheim")).toBe(false);
  });

  it("ohne gesetztes Passwort nie erfolgreich", () => {
    expect(pruefePasswort("", "")).toBe(false);
  });
});

describe("Ratenbremse", () => {
  it("sperrt nach fünf Fehlversuchen für 60 Sekunden", () => {
    const b = new Ratenbremse();
    for (let i = 0; i < 4; i++) b.fehlversuch(JETZT + i);
    expect(b.sperreSekunden(JETZT + 10)).toBe(0);
    b.fehlversuch(JETZT + 5);
    expect(b.sperreSekunden(JETZT + 10)).toBe(60);
    expect(b.sperreSekunden(JETZT + 30_000)).toBeGreaterThanOrEqual(30);
    expect(b.sperreSekunden(JETZT + 61_000)).toBe(0);
  });

  it("Fehlversuche außerhalb des Zeitfensters zählen nicht", () => {
    const b = new Ratenbremse();
    for (let i = 0; i < 4; i++) b.fehlversuch(JETZT + i);
    b.fehlversuch(JETZT + 6 * 60_000); // die ersten vier sind verjährt
    expect(b.sperreSekunden(JETZT + 6 * 60_000 + 1)).toBe(0);
  });

  it("ein Erfolg setzt den Zähler zurück", () => {
    const b = new Ratenbremse();
    for (let i = 0; i < 4; i++) b.fehlversuch(JETZT + i);
    b.erfolg();
    b.fehlversuch(JETZT + 100);
    expect(b.sperreSekunden(JETZT + 101)).toBe(0);
  });

  it("nach Ablauf der Sperre zählt wieder von vorn", () => {
    const b = new Ratenbremse();
    for (let i = 0; i < 5; i++) b.fehlversuch(JETZT + i);
    expect(b.sperreSekunden(JETZT + 10)).toBeGreaterThan(0);
    const spaeter = JETZT + 2 * 60_000;
    b.fehlversuch(spaeter);
    expect(b.sperreSekunden(spaeter + 1)).toBe(0);
  });
});
