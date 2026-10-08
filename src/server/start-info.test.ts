import { beforeEach, describe, expect, it } from "vitest";
import { plan } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { legePlanAn } from "./test-helfer";
import { ladeStartInfo } from "./start-info";
import { beendeWorkout, brecheWorkoutAb, speichereSatz, startWorkout } from "./workouts";
import { getPlanSlotsMitId } from "./plans";

let db: Db;
let planId: number;
beforeEach(() => {
  db = neueSeedDb();
});

function absolviere(i: number) {
  const r = startWorkout(db, { heute: "2026-10-08" });
  if (!r.ok) throw new Error(r.code);
  const slot = getPlanSlotsMitId(db, planId).find(
    (s) => s.block === "1" && s.position === 1 && s.einheit === (i % 2 === 0 ? "A" : "B"),
  )!;
  speichereSatz(db, {
    id: `start-info-${String(i).padStart(6, "0")}`,
    workoutId: r.id,
    planSlotId: slot.id,
    exerciseId: slot.exerciseId,
    runde: 1,
    gewicht: null,
    wdh: 10,
    sekunden: null,
    meter: null,
    rpe: 7,
    tempo: false,
  });
  beendeWorkout(db, r.id, null);
}

describe("ladeStartInfo", () => {
  it("ohne Plan", () => {
    expect(ladeStartInfo(db)).toEqual({ art: "kein_plan" });
  });

  it("nächste fällige Einheit: A, Woche 1 mit Wochenvorgabe", () => {
    ({ planId } = legePlanAn(db));
    expect(ladeStartInfo(db)).toEqual({
      art: "faellig",
      einheit: "A",
      woche: 1,
      wochenPlan: 6,
      zusatzblockStandard: false,
      vorgabeText: "3 × 10–12 Wdh · Leicht",
      fokus: "technik",
    });
  });

  it("nach zwei Einheiten Woche 2 mit neuer Vorgabe; Zusatzblock-Standard aus dem Plan", () => {
    ({ planId } = legePlanAn(db, { zusatzblock: true }));
    absolviere(0);
    absolviere(1);
    expect(ladeStartInfo(db)).toMatchObject({
      art: "faellig",
      einheit: "A",
      woche: 2,
      zusatzblockStandard: true,
      vorgabeText: "3 × 10–12 Wdh · Leicht",
      fokus: "einarbeiten",
    });
  });

  it("laufende Einheit hat Vorrang", () => {
    ({ planId } = legePlanAn(db));
    const r = startWorkout(db, { heute: "2026-10-08" });
    if (!r.ok) throw new Error();
    expect(ladeStartInfo(db)).toEqual({ art: "laufend", workoutId: r.id, einheit: "A", woche: 1 });
    brecheWorkoutAb(db, r.id);
    expect(ladeStartInfo(db)).toMatchObject({ art: "faellig", einheit: "A", woche: 1 });
  });

  it("nach 12 Einheiten ist der Block fertig", () => {
    ({ planId } = legePlanAn(db));
    for (let i = 0; i < 12; i++) absolviere(i);
    expect(ladeStartInfo(db)).toEqual({ art: "block_fertig" });
  });

  it("abgeschlossener Plan ohne neuen: kein Plan", () => {
    ({ planId } = legePlanAn(db));
    db.update(plan).set({ status: "abgeschlossen" }).run();
    expect(ladeStartInfo(db)).toEqual({ art: "kein_plan" });
  });
});
