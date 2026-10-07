import { describe, expect, it } from "vitest";
import {
  exerciseZuFormWerte,
  leereFormWerte,
  parseExerciseForm,
  validiereExercise,
} from "./exercise-form";
import type { Exercise } from "./types";

function formular(felder: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(felder)) {
    for (const w of Array.isArray(v) ? v : [v]) fd.append(k, w);
  }
  return fd;
}

const basis = {
  name: "Testübung",
  stufe: "3",
  belastungsart: "wdh",
  standardBereich: "8–12",
  steigerungsart: ["wdh", "tempo"],
  hauptmuskeln: "Brust\nTrizeps",
  ausfuehrung: "Schritt eins\r\nSchritt zwei\n\nSchritt drei",
  fehler: "Fehler eins\nFehler zwei",
  hinweise: "Ein Hinweis.",
  pruefstatus: "zu_pruefen",
  aktiv: "on",
};
const fest = { id: "DH-99", muster: "DH" as const, bild: null };

describe("parseExerciseForm", () => {
  it("liest Zeilenfelder, Checkboxen und Gruppen", () => {
    const w = parseExerciseForm(
      formular({
        ...basis,
        einseitig: "on",
        gruppe0: ["kurzhanteln", "kettlebell"],
        gruppe1: "bank",
        gruppe2: [],
        optionaleLast: ["kurzhanteln"],
        leichterId: "DH-01",
        schwererId: "",
      }),
    );
    expect(w.ausfuehrung).toEqual(["Schritt eins", "Schritt zwei", "Schritt drei"]);
    expect(w.einseitig).toBe(true);
    expect(w.equipment).toEqual([["kurzhanteln", "kettlebell"], ["bank"]]);
    expect(w.optionaleLast).toEqual(["kurzhanteln"]);
    expect(w.leichterId).toBe("DH-01");
    expect(w.schwererId).toBeNull();
    expect(w.stufe).toBe(3);
  });

  it("ignoriert unbekannte oder doppelte Equipment-Arten und leere Gruppen", () => {
    const w = parseExerciseForm(
      formular({ ...basis, gruppe0: ["hantelbank", "keins", "bank", "bank"], gruppe1: [] }),
    );
    expect(w.equipment).toEqual([["bank"]]);
  });

  it("fehlende Checkboxen bedeuten false", () => {
    const w = parseExerciseForm(formular({ name: "x" }));
    expect(w.einseitig).toBe(false);
    expect(w.aktiv).toBe(false);
  });
});

describe("validiereExercise", () => {
  it("akzeptiert gültige Werte", () => {
    const r = validiereExercise(parseExerciseForm(formular(basis)), fest);
    expect(r.ok).toBe(true);
  });

  it("meldet deutsche Fehler pro Feld", () => {
    const w = parseExerciseForm(
      formular({ ...basis, name: "", standardBereich: "12–8", ausfuehrung: "nur ein Schritt" }),
    );
    const r = validiereExercise(w, fest);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fehler).sort()).toEqual(["ausfuehrung", "name", "standardBereich"]);
      expect(r.fehler.name).toMatch(/Namen/);
    }
  });

  it("verwirft eine Stufe außerhalb 1–5", () => {
    const r = validiereExercise(parseExerciseForm(formular({ ...basis, stufe: "7" })), fest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.stufe).toBeDefined();
  });
});

describe("Vorlagen", () => {
  it("leere Vorlage ist absichtlich noch ungültig (Texte fehlen)", () => {
    expect(validiereExercise(leereFormWerte(), fest).ok).toBe(false);
  });

  it("exerciseZuFormWerte übernimmt alle bearbeitbaren Felder", () => {
    const e: Exercise = {
      id: "DH-99",
      name: "X",
      muster: "DH",
      stufe: 2,
      einseitig: false,
      equipment: [],
      optionaleLast: [],
      leichterId: null,
      schwererId: "DH-98",
      hauptmuskeln: ["Brust"],
      belastungsart: "wdh",
      standardBereich: "8–12",
      steigerungsart: ["wdh"],
      ausfuehrung: ["a", "b", "c"],
      fehler: ["a", "b"],
      hinweise: "h",
      bild: null,
      aktiv: true,
      pruefstatus: "geprueft",
    };
    const w = exerciseZuFormWerte(e);
    expect(w.schwererId).toBe("DH-98");
    expect(validiereExercise(w, { id: e.id, muster: e.muster, bild: e.bild }).ok).toBe(true);
  });
});
