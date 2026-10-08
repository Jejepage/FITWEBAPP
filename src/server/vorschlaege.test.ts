import { beforeEach, describe, expect, it } from "vitest";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { ladeTrainingsDaten } from "./training-daten";
import { legeBlockAn } from "./test-helfer";
import { ladeNaechstesMal } from "./vorschlaege";
import { startWorkout } from "./workouts";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

describe("ladeNaechstesMal", () => {
  it("liefert je Übung der Einheit einen Vorschlag für die nächste Einheit derselben Art", () => {
    const { workoutIds } = legeBlockAn(db, { einheiten: 2 });
    const r = ladeNaechstesMal(db, workoutIds[0]!);
    expect(r.art).toBe("ok");
    if (r.art !== "ok") return;
    expect(r.eintraege).toHaveLength(6);
    // Nach A und B ist wieder A fällig: Woche 2
    expect(r.eintraege.every((e) => e.woche === 2)).toBe(true);
  });

  it("entspricht dem Vorschlag, den der Trainingsbildschirm der nächsten Einheit zeigt", () => {
    const { workoutIds } = legeBlockAn(db, { einheiten: 2 });
    const r = ladeNaechstesMal(db, workoutIds[0]!);
    if (r.art !== "ok") throw new Error("keine Vorschläge");
    const neu = startWorkout(db, { heute: "2026-10-20" });
    if (!neu.ok) throw new Error(neu.code);
    const daten = ladeTrainingsDaten(db, neu.id)!;
    for (const e of r.eintraege) {
      expect(daten.uebungen[e.exerciseId]?.vorschlag).toEqual(e.vorschlag);
    }
  });

  it("keine Vorschläge bei Ad-hoc-Einheiten", () => {
    const { workoutIds } = legeBlockAn(db, { einheiten: 2, adHoc: (n) => n === 0 });
    expect(ladeNaechstesMal(db, workoutIds[0]!)).toEqual({ art: "keine", grund: "ad_hoc" });
  });

  it("keine Vorschläge nach der Entlastungswoche", () => {
    const { workoutIds } = legeBlockAn(db, { einheiten: 12 });
    expect(ladeNaechstesMal(db, workoutIds[11]!)).toEqual({ art: "keine", grund: "entlastung" });
  });

  it("keine Vorschläge, wenn die nächste Einheit nicht mehr zum Block gehört", () => {
    const { workoutIds } = legeBlockAn(db, { einheiten: 12 });
    expect(ladeNaechstesMal(db, workoutIds[8]!)).toEqual({ art: "keine", grund: "block_ende" });
  });

  it("unbekannt oder nicht abgeschlossen: keine", () => {
    expect(ladeNaechstesMal(db, 999)).toEqual({ art: "keine", grund: "nicht_abgeschlossen" });
  });
});
