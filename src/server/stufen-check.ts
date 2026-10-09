// Stufen-Check am Blockende (Spec 2.5, F5): holt die Einheiten aus Woche 5 und 6 des Plans und
// lässt die reine Logik in domain/stufen-check.ts die Empfehlung je Muster berechnen.
import { and, eq, inArray } from "drizzle-orm";
import { planSlot, setLog, workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { stufenCheck } from "@/domain/stufen-check";
import {
  STUFEN_CHECK_WOCHEN,
  type StufenCheckEinheit,
  type StufenCheckErgebnis,
} from "@/domain/stufen-check-types";
import { WOCHEN_PRO_BLOCK, type SatzWerte } from "@/domain/training-types";
import { alleUebungen } from "./exercises";
import type { Plan } from "./plans";
import { zaehleAbgeschlosseneEinheiten, zuSatzWerte } from "./workouts";

/** Alle Einheiten des Blocks sind absolviert (Abgebrochene zählen nicht). */
export function istBlockFertig(db: Db, plan: Pick<Plan, "id" | "einheitenProWoche">): boolean {
  return zaehleAbgeschlosseneEinheiten(db, plan.id) >= WOCHEN_PRO_BLOCK * plan.einheitenProWoche;
}

/** Empfehlung je Muster (acht Einträge) auf Basis der Woche 5 und 6 des Plans. */
export function ladeStufenCheck(db: Db, plan: Pick<Plan, "id" | "stufen">): StufenCheckErgebnis[] {
  const katalog = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const zeilen = db
    .select({ satz: setLog, w: workout })
    .from(setLog)
    .innerJoin(workout, eq(setLog.workoutId, workout.id))
    .innerJoin(planSlot, eq(setLog.planSlotId, planSlot.id))
    .where(
      and(
        eq(workout.planId, plan.id),
        eq(workout.status, "abgeschlossen"),
        inArray(workout.woche, [...STUFEN_CHECK_WOCHEN]),
        eq(setLog.erledigt, true),
        // Nur die geplante Übung des Slots: Ersatzübungen können eine andere Stufe haben und
        // würden den Vergleich mit der Planstufe verfälschen.
        eq(setLog.exerciseId, planSlot.exerciseId),
      ),
    )
    .orderBy(workout.id, setLog.runde)
    .all();

  // Eine Einheit je Workout und Übung.
  const einheiten = new Map<
    string,
    { meta: Omit<StufenCheckEinheit, "saetze">; saetze: SatzWerte[] }
  >();
  for (const { satz, w } of zeilen) {
    const u = katalog.get(satz.exerciseId);
    if (!u) continue;
    const key = `${w.id}:${u.id}`;
    const e = einheiten.get(key) ?? {
      meta: {
        muster: u.muster,
        woche: w.woche,
        uebung: { standardBereich: u.standardBereich, belastungsart: u.belastungsart },
      },
      saetze: [],
    };
    e.saetze.push(zuSatzWerte(satz));
    einheiten.set(key, e);
  }
  // Je Einheit zählt ein Muster einmal: bei einem Übungswechsel mitten im Slot gilt die Übung
  // mit den meisten Sätzen, sonst würde dieselbe Sitzung doppelt gewertet.
  const jeMuster = new Map<
    string,
    { meta: Omit<StufenCheckEinheit, "saetze">; saetze: SatzWerte[] }
  >();
  for (const [key, e] of einheiten) {
    const k = `${key.split(":")[0]}:${e.meta.muster}`;
    const bisher = jeMuster.get(k);
    if (!bisher || e.saetze.length > bisher.saetze.length) jeMuster.set(k, e);
  }
  return stufenCheck({
    stufen: plan.stufen,
    einheiten: [...jeMuster.values()].map((e) => ({ ...e.meta, saetze: e.saetze })),
  });
}
