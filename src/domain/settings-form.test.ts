import { describe, expect, it } from "vitest";
import { MUSTER } from "./types";
import { parseSettingsForm, validiereSettings } from "./settings-form";

function formular(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  for (const m of MUSTER) fd.append(`stufe_${m}`, "2");
  fd.append("einheitenProWoche", "2");
  fd.append("aufwaermenText", "Kurz aufwärmen.");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

describe("Einstellungen", () => {
  it("akzeptiert gültige Werte", () => {
    const r = validiereSettings(
      parseSettingsForm(formular({ stufe_KN: "4", einheitenProWoche: "3", zusatzblock: "on" })),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.werte.stufen.KN).toBe(4);
      expect(r.werte.stufen.HB).toBe(2);
      expect(r.werte.einheitenProWoche).toBe(3);
      expect(r.werte.zusatzblock).toBe(true);
    }
  });

  it("meldet ungültige Stufen pro Muster", () => {
    const r = validiereSettings(
      parseSettingsForm(formular({ stufe_DH: "6", stufe_RU: "", stufe_TR: "0" })),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fehler).sort()).toEqual(["stufe_DH", "stufe_RU", "stufe_TR"]);
  });

  it("erlaubt nur 2 oder 3 Einheiten pro Woche", () => {
    for (const v of ["1", "4", "", "zwei"]) {
      const r = validiereSettings(parseSettingsForm(formular({ einheitenProWoche: v })));
      expect(r.ok, v).toBe(false);
    }
  });

  it("Aufwärmtext: nicht leer, höchstens 1000 Zeichen, Zeilenumbrüche werden vereinheitlicht", () => {
    expect(validiereSettings(parseSettingsForm(formular({ aufwaermenText: "   " }))).ok).toBe(
      false,
    );
    expect(
      validiereSettings(parseSettingsForm(formular({ aufwaermenText: "x".repeat(1001) }))).ok,
    ).toBe(false);
    const w = parseSettingsForm(formular({ aufwaermenText: "a\r\nb" }));
    expect(w.aufwaermenText).toBe("a\nb");
  });
});
