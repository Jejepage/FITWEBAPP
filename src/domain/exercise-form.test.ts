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
  it("liest Zeilenfelder, Checkboxen und Equipment", () => {
    const w = parseExerciseForm(
      formular({
        ...basis,
        einseitig: "on",
        ersatz: "on",
        equipment: ["kurzhanteln", "bank"],
        leichterId: "DH-01",
        schwererId: "",
      }),
    );
    expect(w.ausfuehrung).toEqual(["Schritt eins", "Schritt zwei", "Schritt drei"]);
    expect(w.einseitig).toBe(true);
    expect(w.ersatz).toBe(true);
    expect(w.equipment).toEqual(["kurzhanteln", "bank"]);
    expect(w.leichterId).toBe("DH-01");
    expect(w.schwererId).toBeNull();
    expect(w.stufe).toBe(3);
  });

  it("ignoriert unbekannte oder doppelte Equipment-Arten", () => {
    const w = parseExerciseForm(
      formular({ ...basis, equipment: ["hantelbank", "keins", "bank", "bank"] }),
    );
    expect(w.equipment).toEqual(["bank"]);
    expect(parseExerciseForm(formular(basis)).equipment).toEqual([]);
  });

  it("fehlende Checkboxen bedeuten false", () => {
    const w = parseExerciseForm(formular({ name: "x" }));
    expect(w.einseitig).toBe(false);
    expect(w.aktiv).toBe(false);
    expect(w.ersatz).toBe(false);
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

  it("eine leere oder nichtnumerische Stufe wird abgelehnt (NaN, nicht 0)", () => {
    expect(parseExerciseForm(formular({ ...basis, stufe: "" })).stufe).toBeNaN();
    expect(parseExerciseForm(formular({ ...basis, stufe: "abc" })).stufe).toBeNaN();
    const r = validiereExercise(parseExerciseForm(formular({ ...basis, stufe: "" })), fest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.stufe).toBeDefined();
  });

  it("verwirft eine Stufe außerhalb 1–5", () => {
    const r = validiereExercise(parseExerciseForm(formular({ ...basis, stufe: "7" })), fest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.stufe).toBeDefined();
  });
});

describe("YouTube-Link im Formular", () => {
  const ok = (v: string) =>
    validiereExercise(parseExerciseForm(formular({ ...basis, videoUrl: v })), fest);

  it("ohne Eingabe kein Link", () => {
    const r = ok("");
    expect(r.ok && r.exercise.videoUrl).toBe(null);
  });

  it("jede gültige Schreibweise wird in die Standardform gebracht", () => {
    for (const eingabe of [
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "youtube.com/watch?v=dQw4w9WgXcQ&list=x",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      const r = ok(eingabe);
      expect(r.ok && r.exercise.videoUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }
  });

  it("Startzeit bleibt erhalten", () => {
    const r = ok("https://youtu.be/dQw4w9WgXcQ?t=1m5s");
    expect(r.ok && r.exercise.videoUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=65s");
  });

  it.each([
    "https://example.com/video",
    "javascript:alert(1)",
    "kein link",
    "https://youtube.com@evil.example/x",
  ])("weist %j mit Fehler am Feld ab", (eingabe) => {
    const r = ok(eingabe);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.videoUrl).toContain("YouTube-Link");
  });

  it("meldet den Link-Fehler zusammen mit anderen Feldfehlern", () => {
    const r = validiereExercise(
      parseExerciseForm(formular({ ...basis, name: "", videoUrl: "unsinn" })),
      fest,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fehler).sort()).toEqual(["name", "videoUrl"]);
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
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      aktiv: true,
      ersatz: true,
      pruefstatus: "geprueft",
    };
    const w = exerciseZuFormWerte(e);
    expect(w.ersatz).toBe(true);
    expect(w.schwererId).toBe("DH-98");
    expect(w.videoUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(validiereExercise(w, { id: e.id, muster: e.muster, bild: e.bild }).ok).toBe(true);
  });
});
